import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.resolve(root, relativePath), 'utf8');

describe('Phase 17 Supabase/Netlify security boundaries', () => {
  const migration = read('supabase/migrations/20261117000000_phase17_security_boundaries.sql');
  const publicApi = read('netlify/functions/public-api.ts');

  it('removes anonymous access to personal tenant and CMS rows and requires AAL2 for platform-admin authority', () => {
    expect(migration).toContain("DROP POLICY IF EXISTS \"Public can view active salons\"");
    expect(migration).toContain("DROP POLICY IF EXISTS \"Public can view staff for booking\"");
    expect(migration).toContain("DROP POLICY IF EXISTS \"Public can view published website config\"");
    expect(migration).toContain("coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'");
    expect(migration).toContain('is_salon_manager_or_owner(salon_id)');
  });

  it('keeps bank receipts private, owner-upload-only, tenant scoped, and short-lived for AAL2 review', () => {
    expect(migration).toContain("VALUES ('payment-receipts', 'payment-receipts', FALSE, 5242880");
    expect(migration).toContain('public.is_salon_owner(((storage.foldername(name))[1])::UUID)');
    expect(migration).toContain('AAL2 admins read private payment receipts');
    expect(migration).toContain('AAL2 platform admins manage payment requests');
    expect(read('netlify/functions/receipt-url.ts')).toContain('requireSuperAdmin(event, db)');
    expect(read('netlify/functions/receipt-url.ts')).toContain('createSignedUrl(objectPath, 300');
    expect(read('src/services/privateReceiptService.ts')).toContain("from('payment-receipts').upload");
    expect(read('src/services/privateReceiptService.ts')).not.toContain('getPublicUrl');
  });

  it('does not expose anonymous direct booking, customer, CMS, or public review DML', () => {
    expect(migration).toContain('REVOKE INSERT ON public.customers FROM anon');
    expect(migration).toContain('REVOKE INSERT ON public.appointments FROM anon');
    expect(migration).toContain('REVOKE INSERT ON public.website_reviews FROM anon, authenticated');
    expect(migration).toContain('enforce_online_booking_boundaries');
    expect(migration).toContain('consume_public_review_rate_limit');
    expect(publicApi).toContain("resource === 'booking'");
    expect(publicApi).toContain("resource === 'review'");
    expect(publicApi).toContain("resource === 'publish'");
    expect(publicApi).toContain('requireSalonManager(event, db');
  });

  it('does not allow arbitrary email content, arbitrary Cloudinary folders or wildcard CORS', () => {
    const email = read('netlify/functions/send-email.ts');
    const cloudinary = read('netlify/functions/cloudinary-sign.ts');
    expect(email).toContain("body.template !== 'booking-confirmation'");
    expect(email).toContain('transactional_email_dispatches');
    expect(email).not.toContain('body.to');
    expect(cloudinary).toContain('requireSalonManager');
    expect(cloudinary).toContain('const folder = `moonbox-salon/${manager.salonId}/${payload.purpose}`');
    expect(cloudinary).not.toMatch(/Access-Control-Allow-Origin.*\*/);
  });
});

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

  describe('Phase 1 role corrections migration contract', () => {
    const migration = read('supabase/migrations/20261117180000_phase1_security_corrections.sql');

    it('keeps the migration in one transaction and denies customer/appointment access to unlinked Staff', () => {
      const transactionMarkers = migration.match(/^\s*(BEGIN|COMMIT)\s*;\s*$/gim) ?? [];
      expect(transactionMarkers.map((marker) => marker.trim().toUpperCase())).toEqual(['BEGIN;', 'COMMIT;']);
      expect(migration.trimEnd()).toMatch(/COMMIT;\s*$/i);
      expect(migration).toContain('Staff are denied until the schema has an explicit auth-user link.');
      expect(migration).toContain("v_role NOT IN ('owner', 'manager', 'receptionist')");
      expect(migration).toContain("REVOKE SELECT, INSERT, UPDATE, DELETE ON public.customers FROM anon, authenticated");
      expect(migration).toContain("REVOKE SELECT, INSERT, UPDATE, DELETE ON public.appointments FROM anon, authenticated");
    });

    it('uses role-scoped RPCs and keeps payment, invoice, and appointment control fields server-owned', () => {
      expect(migration).toContain("coalesce(auth.role(), '') NOT IN ('authenticated', 'anon')");
      expect(migration).toContain('public.get_salon_customers');
      expect(migration).toContain('public.get_salon_appointments');
      expect(migration).toContain('public.save_salon_customer');
      expect(migration).toContain('public.save_salon_appointment');
      expect(migration).toContain('public.update_salon_appointment_status');
      expect(migration).toMatch(/payment_status,\s+booking_source, notes/);
      expect(migration).toContain("'unpaid', coalesce(nullif(p_appointment ->> 'booking_source', ''), 'in_salon')");
      expect(migration).toContain("booking_source = v_row.booking_source");
      expect(migration).not.toContain("payment_status = p_appointment");
    });

    it('derives support sender identity from the authenticated database context', () => {
      expect(migration).toContain("v_sender_role := 'support'");
      expect(migration).toContain("v_sender_role := 'tenant'");
      expect(migration).toContain("auth.jwt() ->> 'email'");
      expect(migration).not.toContain("v_sender_name := p_sender_name");
      expect(migration).not.toContain("v_sender_role := p_sender_role");
    });
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

  it('keeps every Phase 17 database and Storage operation inside one transaction', () => {
    const transactionMarkers = migration.match(/^\s*(BEGIN|COMMIT)\s*;\s*$/gim) ?? [];
    expect(transactionMarkers.map((marker) => marker.trim().toUpperCase())).toEqual(['BEGIN;', 'COMMIT;']);
    expect(migration.trimEnd()).toMatch(/COMMIT;\s*$/i);
  });
});

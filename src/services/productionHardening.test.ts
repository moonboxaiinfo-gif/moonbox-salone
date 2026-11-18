import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(root, relativePath), 'utf8');

describe('Production hardening source contracts', () => {
  const lifecycle = read('supabase/migrations/20261118000000_atomic_superadmin_lifecycle.sql');
  const phase17 = read('supabase/migrations/20261117000000_phase17_security_boundaries.sql');
  const phase1 = read('supabase/migrations/20261117180000_phase1_security_corrections.sql');
  const completion = read('supabase/migrations/20261117190000_database_architecture_completion.sql');

  it('keeps all Super Admin lifecycle operations in one migration transaction', () => {
    expect(lifecycle.match(/^\s*BEGIN;\s*$/gm)).toHaveLength(1);
    expect(lifecycle.trimEnd()).toMatch(/COMMIT;\s*$/i);
    for (const action of [
      'grant_trial',
      'revoke_trial',
      'extend_trial',
      'assign_package',
      'update_salon_status',
    ]) {
      expect(lifecycle).toContain(`p_action = '${action}'`);
    }
    expect(lifecycle).toContain("IF p_duration_days IS NULL OR p_duration_days NOT IN (7, 14, 30)");
    expect(lifecycle).toContain("IF p_additional_days IS NULL");
    expect(lifecycle).toContain("IF p_status NOT IN ('active', 'suspended')");
    expect(lifecycle).toContain('INSERT INTO public.audit_logs');
    expect(lifecycle).toContain('Unsupported Super Admin lifecycle action.');
  });

  it('requires AAL2 and blocks direct anonymous/public lifecycle RPC execution', () => {
    expect(lifecycle).toContain("coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2'");
    expect(lifecycle).toContain('FROM PUBLIC, anon');
    expect(lifecycle).toContain('TO authenticated');
  });

  it('preserves cross-salon tenant boundaries for direct and RPC data access', () => {
    expect(phase1).toContain('REVOKE SELECT, INSERT, UPDATE, DELETE ON public.customers FROM anon, authenticated');
    expect(phase1).toContain('REVOKE SELECT, INSERT, UPDATE, DELETE ON public.appointments FROM anon, authenticated');
    expect(phase1).toContain('public.get_salon_customers');
    expect(phase1).toContain('public.save_salon_customer');
    expect(completion).toContain('public.create_salon_support_ticket');
    expect(completion).toContain('REVOKE INSERT ON public.support_tickets');
  });

  it('keeps payment receipts private and owner/AAL2 scoped', () => {
    expect(phase17).toContain("VALUES ('payment-receipts', 'payment-receipts', FALSE");
    expect(phase17).toContain('Salon owners upload private payment receipts');
    expect(phase17).toContain('public.is_salon_owner(((storage.foldername(name))[1])::UUID)');
    expect(phase17).toContain('AAL2 platform admins manage payment requests');
    expect(phase17).not.toContain("VALUES ('payment-receipts', 'payment-receipts', TRUE");

    const receiptUrl = read('netlify/functions/receipt-url.ts');
    expect(receiptUrl).toContain('requireSuperAdmin(event, db)');
    expect(receiptUrl).toContain('createSignedUrl(objectPath, 300');
  });

  it('does not expose platform-admin or public CMS write authority to anonymous users', () => {
    expect(phase17).toContain('coalesce(auth.jwt() ->> \'aal\', \'aal1\') = \'aal2\'');
    expect(phase17).toContain('Platform admins can read only their own authorization row');
    expect(phase17).toContain('REVOKE INSERT ON public.website_reviews');
    expect(phase17).toContain('Published website snapshots can only be written by the authorized server');
  });

  it('requires server-side receipt and lifecycle authorization rather than browser role flags', () => {
    const security = read('netlify/functions/_security.ts');
    const admin = read('netlify/functions/supabase-admin.ts');
    expect(security).toContain("if (aal !== 'aal2')");
    expect(admin).toContain('requireSuperAdmin(event, adminClient)');
    expect(admin).toContain(".rpc('execute_superadmin_lifecycle'");
    expect(admin).not.toContain("from('salon_subscriptions').upsert");
    expect(admin).not.toContain("from('salons').update");
  });

  it('returns 401 for invalid tokens and 403 for authorization/MFA failures', () => {
    const admin = read('netlify/functions/supabase-admin.ts');
    expect(admin).toContain('/authorization|required|Super Admin|MFA/i.test(message) ? 403');
    expect(admin).toContain(': /invalid or expired|authorization is required|token/i.test(message) ? 401');
  });

  it('uses route-level lazy loading for large super-admin, reports, and website modules', () => {
    const app = read('src/App.tsx');
    expect(app).toContain("import React, { lazy, Suspense, useState }");
    expect(app).toContain("const SuperAdminDashboard = lazy");
    expect(app).toContain("const ReportsDashboard = lazy");
    expect(app).toContain("const WebsiteWorkspace = lazy");
    expect(app).toContain('<Suspense fallback={<RouteLoadingFallback />}>');
  });

  it('prevents duplicate payment and public booking submissions and restores retry state', () => {
    const bankTransfer = read('src/components/subscription/BankTransferModal.tsx');
    expect(bankTransfer).toContain('useRef');
    expect(bankTransfer).toContain('submittingRef.current');
    expect(bankTransfer).toContain('if (submittingRef.current) return');
    expect(bankTransfer).toContain('disabled={isUploading || isSubmitting}');
    expect(bankTransfer).toContain('setIsSubmitting(true)');
    expect(bankTransfer).toContain('setIsSubmitting(false)');

    const publicBooking = read('src/components/public/PublicBookingPage.tsx');
    expect(publicBooking).toContain('useRef');
    expect(publicBooking).toContain('submittingRef.current');
    expect(publicBooking).toContain('if (submittingRef.current) return');
    expect(publicBooking).not.toContain('return;\\n        }\\n      } else if (!isLocalDemoMode)');
    expect(publicBooking).toContain('finally {');
    expect(publicBooking).toContain('setIsSubmitting(false)');
  });

  it('guards secondary public booking, review, and support ticket submissions', () => {
    const publicFlow = read('src/components/public/PublicBookingFlow.tsx');
    expect(publicFlow).toContain('const submittingRef = useRef(false)');
    expect(publicFlow).toContain('if (submittingRef.current) return');

    const review = read('src/components/website/WebsiteShared.tsx');
    expect(review).toContain('const submittingRef = React.useRef(false)');
    expect(review).toContain('if (submittingRef.current) return');

    const support = read('src/components/support/SupportTicketsList.tsx');
    expect(support).toContain('createSubmittingRef');
    expect(support).toContain('replySubmittingRef');
    expect(support).toContain('statusSubmittingRef');
  });

  it('guards core customer, appointment, expense, service, staff, and inventory writes', () => {
    for (const file of [
      'src/components/customers/CustomerModal.tsx',
      'src/components/appointments/AppointmentModal.tsx',
      'src/components/expenses/ExpenseModal.tsx',
      'src/components/services/ServiceModal.tsx',
      'src/components/staff/StaffModal.tsx',
      'src/components/inventory/ProductModal.tsx',
      'src/components/pos/POSRegister.tsx',
    ]) {
      const source = read(file);
      expect(source).toMatch(/useRef|submittingRef|savingCustomerRef|checkoutSubmitted/);
    }
  });
});

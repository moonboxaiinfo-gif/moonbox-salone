import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const asyncSource = read('src/services/asyncDataService.ts');
const repositorySource = read('src/services/supabaseRepository.ts');
const storageSource = read('src/services/storageService.ts');
const migrationSource = read('supabase/migrations/20261114000000_phase12_domain_integrity.sql');

const component = (name: string) => read(`src/components/${name}`);

describe('Phase 12 asynchronous domain migration guardrails', () => {
  it('exposes shared, cancellable customer/catalog/staff/appointment/history/invoice hooks', () => {
    for (const hook of ['useTenantResource', 'useTenantCustomers', 'useTenantCatalog', 'useTenantStaff', 'useTenantAppointments', 'useTenantCustomerHistory', 'useTenantInvoices']) {
      expect(asyncSource).toContain(`function ${hook}`);
    }
    expect(repositorySource).toContain('query = query.abortSignal(signal)');
    expect(asyncSource).toContain('if (!active || controller.signal.aborted || requestSessionVersion !== sessionVersion) return;');
    expect(asyncSource).toContain('tenantCache.set(cacheKey, { sessionVersion: requestSessionVersion, data });');
    expect(asyncSource).toContain('notifyInvalidation(tenantId)');
    expect(asyncSource).toContain('supabase.auth.onAuthStateChange');
    expect(asyncSource).toContain('useState(currentResourceKey)');
    expect(asyncSource).toContain('if (sessionChanged) {');
    expect(asyncSource).toContain('data: options.initialData ?? null, loading: Boolean(tenantId && enabled)');
  });

  it('keeps primary customer, service, staff, appointment and POS consumers on async resources', () => {
    const checks: Array<[string, string[]]> = [
      ['src/components/customers/CustomerList.tsx', ['useTenantCustomers']],
      ['src/components/customers/CustomerProfileDrawer.tsx', ['useTenantCustomerHistory']],
      ['src/components/services/ServiceList.tsx', ['useTenantCatalog']],
      ['src/components/services/ServiceModal.tsx', ['useTenantCatalog', 'useTenantStaff']],
      ['src/components/staff/StaffList.tsx', ['useTenantStaff']],
      ['src/components/appointments/AppointmentCalendar.tsx', ['useTenantAppointments']],
      ['src/components/appointments/AppointmentModal.tsx', ['useTenantAppointments', 'useTenantCustomers', 'useTenantCatalog', 'useTenantStaff']],
      ['src/components/pos/POSRegister.tsx', ['useTenantCustomers', 'useTenantCatalog', 'useTenantStaff']],
      ['src/components/invoices/InvoiceList.tsx', ['useTenantInvoices']],
    ];
    for (const [path, hooks] of checks) {
      const source = read(path);
      for (const hook of hooks) expect(source).toContain(hook);
      expect(source).not.toMatch(/StorageService\.(getCustomers|getServices|getCategories|getStaff|getAppointments|getInvoices)\(/);
    }
  });

  it('confines retained public-flow local lookups and writes to explicit demo mode', () => {
    expect(storageSource).toContain('export const isLocalDemoMode');
    expect(component('public/PublicBookingPage.tsx')).toContain('isLocalDemoMode && tenant ? StorageService.getServices');
    expect(component('public/PublicBookingPage.tsx')).toContain('isLocalDemoMode ? StorageService.checkDoubleBooking');
    expect(component('public/PublicBookingPage.tsx')).toContain('PublicWebsiteApi.get(slug, controller.signal)');
    expect(component('public/PublicBookingPage.tsx')).toContain('setRemoteRetry(value => value + 1)');
    expect(component('public/PublicBookingFlow.tsx')).toContain('if (isLocalDemoMode) {\n      const customers = StorageService.getCustomers');
    expect(component('public/PublicBookingFlow.tsx')).toContain('} else if (isLocalDemoMode) {\n      const result = StorageService.saveAppointment');
    expect(component('website/WebsiteRenderer.tsx')).toContain('isLocalDemoMode ? StorageService.getServices');
  });

  it('preserves database-confirmed domain writes, returned IDs and retry-safe form state', () => {
    expect(component('customers/CustomerModal.tsx')).toContain('await StorageService.saveCustomerConfirmed');
    expect(component('services/ServiceModal.tsx')).toContain('await StorageService.saveServiceConfirmed');
    expect(component('staff/StaffModal.tsx')).toContain('await StorageService.saveStaffConfirmed');
    expect(component('appointments/AppointmentModal.tsx')).toContain('await StorageService.saveAppointmentConfirmed');
    expect(component('services/ServiceList.tsx')).toContain('await StorageService.deleteServiceConfirmed');
    expect(component('pos/POSRegister.tsx')).toContain('const savedCustomer = await StorageService.saveCustomerConfirmed(customer)');
    expect(component('pos/POSRegister.tsx')).toContain('checkoutSubmitted.current = true');
  });

  it('persists tenant-bound service qualifications and appointment service IDs additively', () => {
    expect(repositorySource).toContain('assigned_staff_ids: service.assignedStaffIds');
    expect(repositorySource).toContain('service_ids: appointment.serviceIds');
    expect(migrationSource).toContain('ADD COLUMN IF NOT EXISTS assigned_staff_ids UUID[]');
    expect(migrationSource).toContain('ADD COLUMN IF NOT EXISTS service_ids UUID[]');
    expect(migrationSource).toContain('SERVICE_STAFF_TENANT_MISMATCH');
    expect(migrationSource).toContain('APPOINTMENT_SERVICE_TENANT_MISMATCH');
    expect(migrationSource).toContain('APPOINTMENT_STAFF_NOT_QUALIFIED');
    expect(migrationSource).toContain('APPOINTMENT_OUTSIDE_STAFF_HOURS');
    expect(migrationSource).toContain('APPOINTMENT_DURING_STAFF_BREAK');
  });

  it('keeps public booking on the RPC and returns the persisted pending appointment record', () => {
    expect(repositorySource).toContain("this.client.rpc('submit_public_booking'");
    expect(migrationSource).toContain('SECURITY DEFINER');
    expect(migrationSource).toContain('pg_advisory_xact_lock');
    expect(migrationSource).toContain('idempotency_key');
    expect(migrationSource).toContain("'pending', 'unpaid', 'online_portal'");
    expect(migrationSource).toContain('total_price_lkr');
    expect(component('public/PublicBookingPage.tsx')).toContain("status: String(saved.status || 'pending')");
    expect(component('public/PublicBookingFlow.tsx')).toContain("status: String(saved.status || 'pending')");
  });

  it('adds server-enforced appointment transition rules without changing prior migration files', () => {
    expect(migrationSource).toContain('CREATE OR REPLACE FUNCTION public.enforce_appointment_status_transition()');
    expect(migrationSource).toContain('INVALID_APPOINTMENT_STATUS_TRANSITION');
    expect(migrationSource).toContain('CREATE TRIGGER trg_enforce_appointment_status_transition');
  });

  it('distinguishes loaded-empty domain views and preserves retryable read failures', () => {
    expect(component('customers/CustomerList.tsx')).toContain('No customers found');
    expect(component('customers/CustomerProfileDrawer.tsx')).toContain('No past appointments recorded.');
    expect(component('customers/CustomerProfileDrawer.tsx')).toContain('No past invoices found.');
    expect(component('services/ServiceList.tsx')).toContain('No services found');
    expect(component('staff/StaffList.tsx')).toContain('No staff members configured');
    expect(component('appointments/AppointmentCalendar.tsx')).toContain('No appointments found');
    expect(component('appointments/AppointmentModal.tsx')).toContain('Add at least one customer, active stylist and active service');
    expect(component('public/PublicBookingFlow.tsx')).toContain('No active bookable services are available right now');
    for (const file of ['customers/CustomerList.tsx', 'services/ServiceList.tsx', 'staff/StaffList.tsx', 'appointments/AppointmentCalendar.tsx']) {
      const source = component(file);
      expect(source).toContain('role="alert"');
      expect(source).toContain('retry');
    }
  });
});

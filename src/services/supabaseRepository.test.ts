import { describe, expect, it } from 'vitest';
import { mapPosInvoiceRpcResult, mapService, mapStaff, mapSupabaseAppointment, mapSupabaseCustomer, tenantAccessAllowed } from './supabaseRepository';

describe('SupabaseRepository domain mapping and tenant boundaries', () => {
  it('maps customer rows to the existing domain shape', () => {
    const customer = mapSupabaseCustomer({
      id: 'customer-1', salon_id: 'salon-a', name: 'Asha', phone: '+94770000000',
      total_spent_lkr: '12500.00', visits_count: 3, status: 'active', created_at: '2026-11-13T00:00:00Z',
    });
    expect(customer).toMatchObject({ id: 'customer-1', tenantId: 'salon-a', name: 'Asha', totalSpentLKR: 12500, visitsCount: 3 });
  });

  it('maps appointment operational fields without losing tenant ownership', () => {
    const appointment = mapSupabaseAppointment({
      id: 'appointment-1', salon_id: 'salon-a', customer_id: 'customer-1', customer_name: 'Asha', customer_phone: '0770000000',
      staff_id: 'staff-1', staff_name: 'Nimali', service_ids: ['service-1'], service_names: ['Cut'], date: '2026-11-15', start_time: '10:00', end_time: '11:00',
      duration_minutes: 60, total_price_lkr: '5500', status: 'confirmed', payment_status: 'unpaid', booking_source: 'in_salon',
      check_in_at: null, check_out_at: null, created_at: '2026-11-13T00:00:00Z', updated_at: '2026-11-13T00:00:00Z',
    });
    expect(appointment.tenantId).toBe('salon-a');
    expect(appointment.totalPriceLKR).toBe(5500);
    expect(appointment.serviceNames).toEqual(['Cut']);
    expect(appointment.serviceIds).toEqual(['service-1']);
  });

  it('maps persisted service categories and qualified staff assignments', () => {
    const service = mapService({ id: 'service-1', salon_id: 'salon-a', category_id: 'category-1', assigned_staff_ids: ['staff-1'], name: 'Cut', price_lkr: '5500', duration_minutes: 45, is_active: true, is_online_booking_enabled: true });
    expect(service).toMatchObject({ id: 'service-1', tenantId: 'salon-a', categoryId: 'category-1', assignedStaffIds: ['staff-1'], priceLKR: 5500 });
  });

  it('maps staff activation, commission rates, hours and color', () => {
    const staff = mapStaff({ id: 'staff-1', salon_id: 'salon-a', name: 'Nimali', status: 'inactive', default_service_commission: '18', default_product_commission: '7', working_hours: { monday: { start: '09:00', end: '18:00', isWorking: true } }, color: '#123456' });
    expect(staff).toMatchObject({ id: 'staff-1', tenantId: 'salon-a', status: 'inactive', defaultServiceCommission: 18, defaultProductCommission: 7, workingHours: { monday: { isWorking: true } }, color: '#123456' });
  });

  it('allows access only to salons in the authenticated membership set', () => {
    const memberships = ['salon-a', 'salon-b'];
    expect(tenantAccessAllowed('salon-a', memberships)).toBe(true);
    expect(tenantAccessAllowed('salon-c', memberships)).toBe(false);
    expect(tenantAccessAllowed('superadmin', memberships)).toBe(false);
  });

  it('maps the POS RPC success envelope to a confirmed invoice', () => {
    const fallback = { id: 'temporary', invoiceNumber: 'INV-1', tenantId: 'salon-a', customerId: '', customerName: 'Walk-in', items: [], subtotalLKR: 10, discountLKR: 0, taxLKR: 0, tipLKR: 0, totalLKR: 10, paidAmountLKR: 10, balanceLKR: 0, paymentMethod: 'cash' as const, status: 'paid' as const, createdBy: 'user', createdAt: 'now' };
    const saved = mapPosInvoiceRpcResult({ success: true, duplicate: false, invoice_id: 'invoice-uuid' }, fallback);
    expect(saved).toMatchObject({ id: 'invoice-uuid', tenantId: 'salon-a', invoiceNumber: 'INV-1', totalLKR: 10 });
  });

  it('uses the persisted invoice in an idempotent duplicate response', () => {
    const fallback = { id: 'temporary', invoiceNumber: 'INV-1', tenantId: 'salon-a', customerId: '', customerName: 'Walk-in', items: [], subtotalLKR: 10, discountLKR: 0, taxLKR: 0, tipLKR: 0, totalLKR: 10, paidAmountLKR: 10, balanceLKR: 0, paymentMethod: 'cash' as const, status: 'paid' as const, createdBy: 'user', createdAt: 'now' };
    const saved = mapPosInvoiceRpcResult({ duplicate: true, invoice: { id: 'persisted-id', salon_id: 'salon-a', invoice_number: 'INV-1', total_lkr: '20', created_at: 'then' } }, fallback);
    expect(saved).toMatchObject({ id: 'persisted-id', invoiceNumber: 'INV-1', totalLKR: 20, createdAt: 'then' });
  });

  it('rejects unsuccessful or malformed POS RPC responses', () => {
    const fallback = { id: 'temporary', invoiceNumber: 'INV-1', tenantId: 'salon-a', customerId: '', customerName: 'Walk-in', items: [], subtotalLKR: 0, discountLKR: 0, taxLKR: 0, tipLKR: 0, totalLKR: 0, paidAmountLKR: 0, balanceLKR: 0, paymentMethod: 'cash' as const, status: 'paid' as const, createdBy: 'user', createdAt: 'now' };
    expect(() => mapPosInvoiceRpcResult({ success: false, error: 'rejected' }, fallback)).toThrow('rejected');
    expect(() => mapPosInvoiceRpcResult({}, fallback)).toThrow('saved invoice ID');
  });
});

import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseRepository } from './supabaseRepository';

const salonId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';

function fakeClient(options: { response?: Record<string, unknown> | null; error?: string; noRows?: boolean } = {}) {
  const builder: Record<string, unknown> = {};
  const signals: AbortSignal[] = [];
  let table = '';
  let returnsArrayRpc = false;
  const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const response = options.response ?? null;
  const result = () => ({
    data: options.noRows ? [] : (response ? (table.startsWith('rpc:') && !returnsArrayRpc ? response : [response]) : []),
    error: options.error ? { message: options.error } : null
  });
  for (const method of ['select', 'eq', 'order', 'in', 'not', 'abortSignal', 'upsert', 'insert', 'update', 'delete']) {
    builder[method] = (...args: unknown[]) => {
      if (method === 'insert' || method === 'update' || method === 'upsert' || method === 'delete') builder.operation = method;
      if (method === 'eq' && args[0] === 'status') builder.membershipFilter = true;
      if (method === 'abortSignal' && args[0]) signals.push(args[0] as AbortSignal);
      return builder;
    };
  }
  builder.single = async () => ({ data: options.noRows ? null : response, error: options.error ? { message: options.error } : null });
  builder.maybeSingle = async () => ({ data: response, error: options.error ? { message: options.error } : null });
  builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve(table === 'salon_members' ? { data: [{ salon_id: salonId }], error: null } : result()).then(resolve, reject);
  return {
    auth: { getUser: async () => ({ data: { user: { id: userId } }, error: null }) },
    from: (name: string) => { table = name; return builder; },
    rpc: (name: string, args: Record<string, unknown>) => { table = `rpc:${name}`; returnsArrayRpc = name === 'get_salon_customers' || name === 'get_salon_appointments' || name === 'get_salon_staff_accounts'; rpcCalls.push({ name, args }); return builder; },
    _table: () => table,
    _signals: () => signals,
    _rpcCalls: () => rpcCalls,
  } as unknown as SupabaseClient;
}

describe('SupabaseRepository CRUD failure semantics', () => {
  it('persists an expense and maps the returned database row', async () => {
    const row = { id: '33333333-3333-4333-8333-333333333333', salon_id: salonId, category_name: 'Rent', description: 'Monthly rent', amount_lkr: '25000', payment_method: 'cash', date: '2026-11-13', created_at: '2026-11-13T00:00:00Z' };
    const repository = new SupabaseRepository(fakeClient({ response: row }));
    const saved = await repository.saveExpense({ id: '', tenantId: salonId, categoryId: '', categoryName: 'Rent', description: 'Monthly rent', amountLKR: 25000, paymentMethod: 'cash', date: '2026-11-13', createdAt: '' });
    expect(saved).toMatchObject({ id: row.id, tenantId: salonId, amountLKR: 25000, categoryName: 'Rent' });
  });

  it('refuses writes outside the authenticated membership set', async () => {
    const repository = new SupabaseRepository(fakeClient());
    await expect(repository.deleteExpense('44444444-4444-4444-8444-444444444444', 'expense-id')).rejects.toThrow('not an active member');
  });

  it('propagates database write errors instead of reporting success', async () => {
    const repository = new SupabaseRepository(fakeClient({ error: 'permission denied' }));
    await expect(repository.saveExpense({ id: '', tenantId: salonId, categoryId: '', categoryName: 'Rent', description: 'Monthly rent', amountLKR: 25000, paymentMethod: 'cash', date: '2026-11-13', createdAt: '' })).rejects.toThrow('permission denied');
  });

  it('reports an unsuccessful delete when RLS or a missing row yields no deleted records', async () => {
    const repository = new SupabaseRepository(fakeClient({ noRows: true }));
    await expect(repository.deleteExpense(salonId, '55555555-5555-4555-8555-555555555555')).rejects.toThrow('not found or could not be deleted');
  });

  it('passes a cancellable signal into authenticated customer reads', async () => {
    const client = fakeClient({ response: { id: '33333333-3333-4333-8333-333333333333', salon_id: salonId, name: 'Asha', phone: '0770000000' } });
    const controller = new AbortController();
    const repository = new SupabaseRepository(client);
    const customers = await repository.customers(salonId, controller.signal);
    expect(customers[0]).toMatchObject({ id: '33333333-3333-4333-8333-333333333333', tenantId: salonId, name: 'Asha' });
    expect((client as unknown as { _signals: () => AbortSignal[] })._signals()).toContain(controller.signal);
    expect((client as unknown as { _rpcCalls: () => Array<{ name: string; args: Record<string, unknown> }> })._rpcCalls()).toMatchObject([
      { name: 'get_salon_customers', args: { p_salon_id: salonId } }
    ]);
  });

  it('returns the database customer UUID after a confirmed write', async () => {
    const client = fakeClient({ response: { id: '33333333-3333-4333-8333-333333333333', salon_id: salonId, name: 'Asha', phone: '0770000000', status: 'active' } });
    const repository = new SupabaseRepository(client);
    const saved = await repository.upsertCustomer({ id: 'temporary-customer-id', tenantId: salonId, name: 'Asha', phone: '0770000000', status: 'active', totalSpentLKR: 0, visitsCount: 0, createdAt: '2026-11-14T00:00:00Z' });
    expect(saved).toMatchObject({ id: '33333333-3333-4333-8333-333333333333', tenantId: salonId, name: 'Asha' });
    expect((client as unknown as { _rpcCalls: () => Array<{ name: string }> })._rpcCalls()[0].name).toBe('save_salon_customer');
  });

  it('confirms service qualifications and nullable category using the persisted service row', async () => {
    const serviceId = '33333333-3333-4333-8333-333333333333';
    const staffId = '44444444-4444-4444-8444-444444444444';
    const repository = new SupabaseRepository(fakeClient({ response: { id: serviceId, salon_id: salonId, category_id: null, assigned_staff_ids: [staffId], name: 'Cut', price_lkr: 5500, duration_minutes: 45 } }));
    const saved = await repository.upsertService({ id: 'temporary-service-id', tenantId: salonId, categoryId: '', assignedStaffIds: [staffId], name: 'Cut', priceLKR: 5500, durationMinutes: 45, commissionRate: 15, isOnlineBookingEnabled: true, isActive: true });
    expect(saved).toMatchObject({ id: serviceId, tenantId: salonId, categoryId: '', assignedStaffIds: [staffId], priceLKR: 5500 });
  });

  it('confirms staff commission and working-hour fields from the database response', async () => {
    const staffId = '33333333-3333-4333-8333-333333333333';
    const repository = new SupabaseRepository(fakeClient({ response: { id: staffId, salon_id: salonId, name: 'Nimali', status: 'active', default_service_commission: 18, default_product_commission: 7, working_hours: { monday: { start: '09:00', end: '18:00', isWorking: true } } } }));
    const saved = await repository.upsertStaff({ id: '', tenantId: salonId, name: 'Nimali', position: 'Stylist', phone: '0770000000', email: 'nimali@example.test', status: 'active', assignedServiceIds: [], defaultServiceCommission: 18, defaultProductCommission: 7, workingHours: { monday: { start: '09:00', end: '18:00', isWorking: true } }, color: '#123456', createdAt: '2026-11-14T00:00:00Z' });
    expect(saved).toMatchObject({ id: staffId, tenantId: salonId, status: 'active', defaultServiceCommission: 18, defaultProductCommission: 7 });
  });

  it('links only an explicit staff Auth user ID and retrieves eligible logins through the RPC', async () => {
    const accountId = '33333333-3333-4333-8333-333333333333';
    const client = fakeClient({ response: { user_id: accountId, full_name: 'Nimali', email: 'nimali@example.test' } });
    const repository = new SupabaseRepository(client);
    const accounts = await repository.staffLoginAccounts(salonId, '44444444-4444-4444-8444-444444444444');
    expect(accounts).toEqual([{ userId: accountId, fullName: 'Nimali', email: 'nimali@example.test' }]);
    expect((client as unknown as { _rpcCalls: () => Array<{ name: string; args: Record<string, unknown> }> })._rpcCalls()).toMatchObject([
      { name: 'get_salon_staff_accounts', args: { p_salon_id: salonId, p_staff_id: '44444444-4444-4444-8444-444444444444' } }
    ]);
  });

  it('settles commissions through the entitlement-checked RPC', async () => {
    const commissionId = '33333333-3333-4333-8333-333333333333';
    const client = fakeClient({ response: { id: commissionId, salon_id: salonId, status: 'paid', paid_at: '2026-11-17T00:00:00Z' } });
    const commission = await new SupabaseRepository(client).markCommissionPaid(salonId, commissionId);
    expect(commission).toMatchObject({ id: commissionId, tenantId: salonId, status: 'paid' });
    expect((client as unknown as { _rpcCalls: () => Array<{ name: string; args: Record<string, unknown> }> })._rpcCalls()).toMatchObject([
      { name: 'mark_commission_paid', args: { p_salon_id: salonId, p_commission_id: commissionId } }
    ]);
  });

  it('confirms appointment service IDs and the persisted appointment ID', async () => {
    const appointmentId = '33333333-3333-4333-8333-333333333333';
    const repository = new SupabaseRepository(fakeClient({ response: { id: appointmentId, salon_id: salonId, customer_id: 'customer-1', customer_name: 'Asha', staff_id: 'staff-1', staff_name: 'Nimali', service_ids: ['service-1'], service_names: ['Cut'], date: '2026-11-15', start_time: '10:00', end_time: '10:45', duration_minutes: 45, total_price_lkr: 5500, status: 'pending', payment_status: 'unpaid', booking_source: 'in_salon' } }));
    const saved = await repository.upsertAppointment({ id: 'temporary-appointment-id', tenantId: salonId, customerId: 'customer-1', customerName: 'Asha', customerPhone: '0770000000', staffId: 'staff-1', staffName: 'Nimali', serviceIds: ['service-1'], serviceNames: ['Cut'], date: '2026-11-15', startTime: '10:00', endTime: '10:45', durationMinutes: 45, totalPriceLKR: 5500, status: 'pending', paymentStatus: 'unpaid', bookingSource: 'in_salon', createdAt: '', updatedAt: '' });
    expect(saved).toMatchObject({ id: appointmentId, tenantId: salonId, serviceIds: ['service-1'], totalPriceLKR: 5500 });
  });

  it('updates appointment status through the tenant-scoped RPC', async () => {
    const appointmentId = '33333333-3333-4333-8333-333333333333';
    const client = fakeClient({ response: { id: appointmentId, salon_id: salonId, status: 'confirmed' } });
    const saved = await new SupabaseRepository(client).updateAppointmentStatus(salonId, appointmentId, 'confirmed');
    expect(saved).toMatchObject({ id: appointmentId, tenantId: salonId, status: 'confirmed' });
    expect((client as unknown as { _rpcCalls: () => Array<{ name: string; args: Record<string, unknown> }> })._rpcCalls()).toMatchObject([
      { name: 'update_salon_appointment_status', args: { p_salon_id: salonId, p_appointment_id: appointmentId, p_status: 'confirmed' } }
    ]);
  });

  it('does not send client-asserted sender identity for support messages', async () => {
    const client = fakeClient({ response: { id: '66666666-6666-4666-8666-666666666666' } });
    const repository = new SupabaseRepository(client);
    await repository.appendSupportTicketMessage({ ticketId: '77777777-7777-4777-8777-777777777777', content: 'Please help' });
    const call = (client as unknown as { _rpcCalls: () => Array<{ name: string; args: Record<string, unknown> }> })._rpcCalls()[0];
    expect(call.name).toBe('append_support_ticket_message');
    expect(call.args).toMatchObject({ p_content: 'Please help', p_sender_name: null, p_sender_role: null });
  });

  it('creates support tickets through the attribution-safe RPC without sending message identity', async () => {
    const client = fakeClient({ response: {
      id: '66666666-6666-4666-8666-666666666666',
      salon_id: salonId,
      subject: 'Help',
      messages: [{ content: 'Please help', senderRole: 'tenant' }],
    } });
    const repository = new SupabaseRepository(client);
    const saved = await repository.saveSupportTicket({
      id: 'temporary-ticket-id',
      tenantId: salonId,
      salonName: 'client value ignored',
      userEmail: 'client@example.test',
      subject: 'Help',
      category: 'technical',
      priority: 'normal',
      status: 'open',
      module: 'settings',
      messages: [{ id: 'temporary-message-id', senderEmail: 'forged@example.test', senderRole: 'support', senderName: 'Support', content: 'Please help', createdAt: '' }],
      createdAt: '',
      updatedAt: '',
    });
    expect(saved).toMatchObject({ id: '66666666-6666-4666-8666-666666666666', tenantId: salonId });
    const call = (client as unknown as { _rpcCalls: () => Array<{ name: string; args: Record<string, unknown> }> })._rpcCalls()[0];
    expect(call.name).toBe('create_salon_support_ticket');
    expect(call.args).toEqual({
      p_salon_id: salonId,
      p_subject: 'Help',
      p_category: 'technical',
      p_priority: 'normal',
      p_content: 'Please help',
    });
  });
});

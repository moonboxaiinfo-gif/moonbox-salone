import { SupabaseClient } from '@supabase/supabase-js';
import {
  Appointment,
  Announcement,
  AuditLog,
  Customer,
  Expense,
  Invoice,
  ManualPaymentRequest,
  NotificationItem,
  Product,
  ProductCategory,
  SalonTenant,
  Service,
  ServiceCategory,
  Staff,
  StaffCommissionRecord,
  StockMovement,
  SubscriptionPlan,
  SupportTicket,
  User,
} from '../types';
import { isSupabaseConfigured, supabase } from './supabaseClient';
import { WebsiteReview } from '../types/website';

type Row = Record<string, unknown>;
export interface RepositoryResult<T> { data: T | null; error: string | null; }

const asRecord = (value: unknown): Row => (value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {});
const asArray = <T>(value: unknown): T[] => Array.isArray(value) ? value as T[] : [];
const stringValue = (value: unknown, fallback = ''): string => typeof value === 'string' ? value : fallback;
const numberValue = (value: unknown, fallback = 0): number => typeof value === 'number' ? value : Number(value ?? fallback) || fallback;
const boolValue = (value: unknown, fallback = false): boolean => typeof value === 'boolean' ? value : fallback;
const isUuidValue = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

function camelizeRow(row: Row): Row {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()), value]));
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (value && typeof value === 'object') return value as T;
  if (typeof value === 'string') {
    try { return JSON.parse(value) as T; } catch { return fallback; }
  }
  return fallback;
}

function mapPlan(row: Row): SubscriptionPlan {
  const r = camelizeRow(row);
  return {
    id: stringValue(r.id), name: stringValue(r.name), slug: stringValue(r.slug), description: stringValue(r.description),
    monthlyPriceLKR: numberValue(r.monthlyPriceLkr), yearlyPriceLKR: numberValue(r.yearlyPriceLkr), maxStaff: numberValue(r.maxStaff), maxCustomers: numberValue(r.maxCustomers),
    hasInventory: boolValue(r.hasInventory), hasOnlineBooking: boolValue(r.hasOnlineBooking), hasPortfolio: boolValue(r.hasPortfolio), hasCustomDomain: boolValue(r.hasCustomDomain),
    hasReports: boolValue(r.hasReports), hasCommissions: boolValue(r.hasCommissions), isPopular: boolValue(r.isPopular), isActive: boolValue(r.isActive, true),
  };
}

function mapTenant(row: Row, subscription?: Row | null): SalonTenant {
  const r = camelizeRow(row);
  const settings = parseJson<SalonTenant['settings']>(r.settings, { taxRate: 0, currencySymbol: 'Rs.', appointmentBufferMinutes: 15, minAdvanceBookingHours: 2, maxBookingWindowDays: 60, allowCustomerStaffSelection: true, requireBookingDeposit: false });
  const portfolio = parseJson<SalonTenant['portfolio']>(r.portfolio, { heroTitle: '', heroSubtitle: '', aboutText: '', theme: 'modern', primaryColor: '#9E4784', accentColor: '#D4AF37', gallery: [], seoTitle: '', seoDescription: '' });
  const sub = subscription ? camelizeRow(subscription) : {};
  return {
    id: stringValue(r.id), name: stringValue(r.name), slug: stringValue(r.slug), tagline: stringValue(r.tagline), logoUrl: stringValue(r.logoUrl) || undefined,
    country: stringValue(r.country, 'Sri Lanka'), currency: stringValue(r.currency, 'LKR'), phone: stringValue(r.phone), whatsapp: stringValue(r.whatsapp), email: stringValue(r.email),
    website: stringValue(r.website) || undefined, address: stringValue(r.address), city: stringValue(r.city), openingHours: parseJson(r.openingHours, {}), settings, portfolio,
    subscription: {
      planId: stringValue(sub.planId), status: (stringValue(sub.status, 'pending') as SalonTenant['subscription']['status']), billingCycle: (stringValue(sub.billingCycle, 'monthly') as SalonTenant['subscription']['billingCycle']),
      startDate: stringValue(sub.startDate), endDate: stringValue(sub.endDate), trialEndsAt: stringValue(sub.trialEndsAt), autoRenew: boolValue(sub.autoRenew),
    },
    onboardingCompleted: boolValue(r.onboardingCompleted), onboardingStep: numberValue(r.onboardingStep, 1), status: stringValue(r.status, 'pending_approval') as SalonTenant['status'],
    createdAt: stringValue(r.createdAt), updatedAt: stringValue(r.updatedAt),
  };
}

export function mapSupabaseCustomer(row: Row): Customer {
  const r = camelizeRow(row);
  return { id: stringValue(r.id), tenantId: stringValue(r.salonId), name: stringValue(r.name), phone: stringValue(r.phone), whatsapp: stringValue(r.whatsapp) || undefined, email: stringValue(r.email) || undefined, gender: (stringValue(r.gender) || undefined) as Customer['gender'], birthday: stringValue(r.birthday) || undefined, address: stringValue(r.address) || undefined, notes: stringValue(r.notes) || undefined, status: stringValue(r.status, 'active') as Customer['status'], totalSpentLKR: numberValue(r.totalSpentLkr), visitsCount: numberValue(r.visitsCount), lastVisitAt: stringValue(r.lastVisitAt) || undefined, createdAt: stringValue(r.createdAt) };
}

function mapCategory(row: Row): ServiceCategory { const r = camelizeRow(row); return { id: stringValue(r.id), tenantId: stringValue(r.salonId), name: stringValue(r.name), description: stringValue(r.description) || undefined }; }
export function mapService(row: Row): Service { const r = camelizeRow(row); return { id: stringValue(r.id), tenantId: stringValue(r.salonId), categoryId: stringValue(r.categoryId), name: stringValue(r.name), description: stringValue(r.description) || undefined, priceLKR: numberValue(r.priceLkr), durationMinutes: numberValue(r.durationMinutes, 45), assignedStaffIds: asArray<string>(r.assignedStaffIds), commissionRate: numberValue(r.commissionRate, 15), isOnlineBookingEnabled: boolValue(r.isOnlineBookingEnabled, true), isActive: boolValue(r.isActive, true) }; }
export function mapStaff(row: Row): Staff { const r = camelizeRow(row); return { id: stringValue(r.id), tenantId: stringValue(r.salonId), name: stringValue(r.name), position: stringValue(r.position, 'Stylist'), title: stringValue(r.title) || undefined, phone: stringValue(r.phone), email: stringValue(r.email), status: stringValue(r.status, 'active') as Staff['status'], assignedServiceIds: asArray<string>(r.assignedServiceIds), defaultServiceCommission: numberValue(r.defaultServiceCommission, 20), defaultProductCommission: numberValue(r.defaultProductCommission, 10), workingHours: parseJson(r.workingHours, {}), color: stringValue(r.color, '#9E4784'), createdAt: stringValue(r.createdAt) }; }
export function mapSupabaseAppointment(row: Row): Appointment { const r = camelizeRow(row); return { id: stringValue(r.id), tenantId: stringValue(r.salonId), customerId: stringValue(r.customerId), customerName: stringValue(r.customerName), customerPhone: stringValue(r.customerPhone), customerEmail: stringValue(r.customerEmail) || undefined, staffId: stringValue(r.staffId), staffName: stringValue(r.staffName), serviceIds: asArray<string>(r.serviceIds), serviceNames: asArray<string>(r.serviceNames), date: stringValue(r.date), startTime: stringValue(r.startTime), endTime: stringValue(r.endTime), durationMinutes: numberValue(r.durationMinutes, 45), totalPriceLKR: numberValue(r.totalPriceLkr), status: stringValue(r.status, 'pending') as Appointment['status'], paymentStatus: stringValue(r.paymentStatus, 'unpaid') as Appointment['paymentStatus'], bookingSource: stringValue(r.bookingSource, 'in_salon') as Appointment['bookingSource'], notes: stringValue(r.notes) || undefined, internalNotes: stringValue(r.internalNotes) || undefined, checkInAt: stringValue(r.checkInAt) || undefined, checkOutAt: stringValue(r.checkOutAt) || undefined, invoiceId: stringValue(r.invoiceId) || undefined, createdAt: stringValue(r.createdAt), updatedAt: stringValue(r.updatedAt) }; }

export const tenantAccessAllowed = (tenantId: string, authorizedTenantIds: string[]): boolean => authorizedTenantIds.includes(tenantId);
/** `create_pos_invoice` returns an envelope rather than an invoice row. */
export function mapPosInvoiceRpcResult(value: unknown, fallback: Invoice): Invoice {
  const result = asRecord(value);
  if (result.success === false) throw new Error(stringValue(result.error, 'The POS transaction was not completed.'));
  const row = camelizeRow(asRecord(result.invoice));
  const id = stringValue(row.id) || stringValue(result.invoice_id);
  if (!id) throw new Error('The POS transaction response did not include a saved invoice ID.');
  return {
    ...fallback,
    invoiceNumber: stringValue(row.invoiceNumber, fallback.invoiceNumber),
    id,
    tenantId: stringValue(row.salonId, fallback.tenantId),
    customerId: stringValue(row.customerId, fallback.customerId),
    customerName: stringValue(row.customerName, fallback.customerName),
    customerPhone: stringValue(row.customerPhone, fallback.customerPhone || '') || undefined,
    items: Array.isArray(row.items) ? row.items as Invoice['items'] : fallback.items,
    subtotalLKR: numberValue(row.subtotalLkr, fallback.subtotalLKR),
    discountLKR: numberValue(row.discountLkr, fallback.discountLKR),
    taxLKR: numberValue(row.taxLkr, fallback.taxLKR),
    tipLKR: numberValue(row.tipLkr, fallback.tipLKR),
    totalLKR: numberValue(row.totalLkr, fallback.totalLKR),
    paidAmountLKR: numberValue(row.paidAmountLkr, fallback.paidAmountLKR),
    balanceLKR: numberValue(row.balanceLkr, fallback.balanceLKR),
    paymentMethod: stringValue(row.paymentMethod, fallback.paymentMethod) as Invoice['paymentMethod'],
    status: stringValue(row.status, fallback.status) as Invoice['status'],
    createdAt: stringValue(row.createdAt, fallback.createdAt),
  };
}

function mapProductCategory(row: Row): ProductCategory { const r = camelizeRow(row); return { id: stringValue(r.id), tenantId: stringValue(r.salonId), name: stringValue(r.name) }; }
function mapProduct(row: Row): Product { const r = camelizeRow(row); return { id: stringValue(r.id), tenantId: stringValue(r.salonId), categoryId: stringValue(r.categoryId), name: stringValue(r.name), sku: stringValue(r.sku), sellingPriceLKR: numberValue(r.sellingPriceLkr), costPriceLKR: numberValue(r.costPriceLkr), stockQuantity: numberValue(r.stockQuantity), lowStockThreshold: numberValue(r.lowStockThreshold, 5), supplier: stringValue(r.supplier) || undefined, expiryDate: stringValue(r.expiryDate) || undefined, status: stringValue(r.status, 'active') as Product['status'], createdAt: stringValue(r.createdAt) }; }
function mapStockMovement(row: Row): StockMovement { const r = camelizeRow(row); return { id: stringValue(r.id), tenantId: stringValue(r.salonId), productId: stringValue(r.productId), productName: stringValue(r.productName), type: stringValue(r.type) as StockMovement['type'], quantityChange: numberValue(r.quantityChange), balanceAfter: numberValue(r.balanceAfter), reason: stringValue(r.reason), referenceId: stringValue(r.referenceId) || undefined, createdAt: stringValue(r.createdAt) }; }
export function mapSupabaseNotification(row: Row): NotificationItem {
  const r = camelizeRow(row);
  return {
    id: stringValue(r.id),
    tenantId: stringValue(r.salonId, 'superadmin'),
    title: stringValue(r.title),
    message: stringValue(r.message),
    type: stringValue(r.type, 'announcement') as NotificationItem['type'],
    read: Boolean(r.readAt),
    createdAt: stringValue(r.createdAt),
  };
}

const tableFor: Record<string, string> = {
  customers: 'customers', categories: 'service_categories', services: 'services', staff: 'staff', appointments: 'appointments', productCategories: 'product_categories', products: 'products', stockMovements: 'stock_movements', invoices: 'invoices', commissions: 'commissions', expenses: 'expenses', expenseCategories: 'expense_categories', manualPayments: 'manual_payment_requests', supportTickets: 'support_tickets', announcements: 'announcements', auditLogs: 'audit_logs', notifications: 'notifications',
};

export class SupabaseRepository {
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient | null = supabase) {
    if (!client || (!isSupabaseConfigured && client === supabase)) throw new Error('Supabase is not configured. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    this.client = client;
  }

  private async authorizedTenantIds(): Promise<string[]> {
    const { data: authData, error: authError } = await this.client.auth.getUser();
    if (authError || !authData.user) throw new Error('An authenticated Supabase session is required.');
    const { data, error } = await this.client.from('salon_members').select('salon_id').eq('user_id', authData.user.id).eq('status', 'active');
    if (error) throw new Error(error.message);
    // Never retain authorization decisions across sign-out, account switching, or
    // membership revocation. RLS remains the authoritative server-side boundary.
    return (data || []).map((row) => stringValue((row as Row).salon_id));
  }

  async assertTenantAccess(tenantId: string): Promise<void> {
    const ids = await this.authorizedTenantIds();
    if (!tenantAccessAllowed(tenantId, ids)) throw new Error('The authenticated user is not an active member of this salon.');
  }

  private async listRows(table: string, tenantId: string, signal?: AbortSignal): Promise<Row[]> {
    await this.assertTenantAccess(tenantId);
    let query = this.client.from(table).select('*').eq('salon_id', tenantId).order('created_at', { ascending: false });
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []) as Row[];
  }

  private async upsertRow(table: string, tenantId: string, row: Row): Promise<Row> {
    await this.assertTenantAccess(tenantId);
    const payload = { ...row, salon_id: tenantId };
    if ('id' in payload && !isUuidValue(payload.id)) delete payload.id;
    const { data, error } = await this.client.from(table).upsert(payload).select().single();
    if (error) throw new Error(error.message);
    return data as Row;
  }

  private async writeRow(table: string, tenantId: string, id: string | undefined, row: Row): Promise<Row> {
    await this.assertTenantAccess(tenantId);
    const payload = { ...row, salon_id: tenantId };
    if (!id || !isUuidValue(id)) {
      const { data, error } = await this.client.from(table).insert(payload).select().single();
      if (error) throw new Error(error.message);
      return data as Row;
    }
    const { data, error } = await this.client.from(table).update(payload).eq('id', id).eq('salon_id', tenantId).select().single();
    if (error) throw new Error(error.message);
    if (!data) throw new Error(`The ${table} record was not found or could not be updated.`);
    return data as Row;
  }

  private async deleteRow(table: string, tenantId: string, id: string): Promise<void> {
    await this.assertTenantAccess(tenantId);
    const { data, error } = await this.client.from(table).delete().eq('id', id).eq('salon_id', tenantId).select('id');
    if (error) throw new Error(error.message);
    if (!data?.length) throw new Error(`The ${table} record was not found or could not be deleted.`);
  }

  async currentUser(): Promise<User | null> {
    const { data: authData, error: authError } = await this.client.auth.getUser();
    if (authError || !authData.user) return null;
    const authUser = authData.user;
    const { data: profile, error: profileError } = await this.client.from('profiles').select('*').eq('id', authUser.id).maybeSingle();
    if (profileError) throw new Error(profileError.message);
    const { data: admin } = await this.client.from('platform_admins').select('role').eq('user_id', authUser.id).maybeSingle();
    if (admin?.role === 'superadmin') return { id: authUser.id, email: authUser.email || '', name: stringValue(asRecord(profile).full_name, authUser.user_metadata?.full_name || 'Platform Administrator'), role: 'superadmin', tenantId: 'superadmin', createdAt: stringValue(asRecord(profile).created_at, authUser.created_at) };
    const { data: member, error: memberError } = await this.client.from('salon_members').select('salon_id, role, created_at').eq('user_id', authUser.id).eq('status', 'active').order('created_at', { ascending: true }).limit(1).maybeSingle();
    if (memberError) throw new Error(memberError.message);
    if (!member) return null;
    const p = asRecord(profile);
    return { id: authUser.id, email: authUser.email || stringValue(p.email), name: stringValue(p.full_name, authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Salon User'), role: stringValue(asRecord(member).role, 'staff') as User['role'], tenantId: stringValue(asRecord(member).salon_id), phone: stringValue(p.phone) || undefined, avatar: stringValue(p.avatar_url) || undefined, createdAt: stringValue(p.created_at, authUser.created_at) };
  }

  async tenantsForCurrentUser(): Promise<SalonTenant[]> {
    const ids = await this.authorizedTenantIds();
    if (!ids.length) return [];
    const { data: salons, error } = await this.client.from('salons').select('*').in('id', ids);
    if (error) throw new Error(error.message);
    const { data: subscriptions, error: subError } = await this.client.from('salon_subscriptions').select('*').in('salon_id', ids);
    if (subError) throw new Error(subError.message);
    return (salons || []).map((salon) => mapTenant(salon as Row, (subscriptions || []).find((sub) => stringValue((sub as Row).salon_id) === stringValue((salon as Row).id)) as Row | undefined));
  }
  async tenantById(tenantId: string): Promise<SalonTenant | null> {
    await this.assertTenantAccess(tenantId);
    const { data: salon, error } = await this.client.from('salons').select('*').eq('id', tenantId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!salon) return null;
    const { data: subscription, error: subscriptionError } = await this.client.from('salon_subscriptions').select('*').eq('salon_id', tenantId).maybeSingle();
    if (subscriptionError) throw new Error(subscriptionError.message);
    return mapTenant(salon as Row, subscription as Row | null);
  }
  async updateTenant(tenant: SalonTenant): Promise<SalonTenant> {
    await this.assertTenantAccess(tenant.id);
    const { data: authData, error: authError } = await this.client.auth.getUser();
    if (authError || !authData.user) throw new Error('An authenticated Supabase session is required.');
    const { data: membership, error: membershipError } = await this.client.from('salon_members').select('role').eq('salon_id', tenant.id).eq('user_id', authData.user.id).eq('status', 'active').maybeSingle();
    if (membershipError) throw new Error(membershipError.message);
    if (!['owner', 'manager'].includes(stringValue(asRecord(membership).role))) throw new Error('Owner or manager permission is required to update salon settings.');
    const { data, error } = await this.client.from('salons').update({ name: tenant.name, tagline: tenant.tagline, logo_url: tenant.logoUrl || null, phone: tenant.phone, whatsapp: tenant.whatsapp, email: tenant.email, website: tenant.website || null, address: tenant.address, city: tenant.city, opening_hours: tenant.openingHours, settings: tenant.settings, portfolio: tenant.portfolio, onboarding_completed: tenant.onboardingCompleted, onboarding_step: tenant.onboardingStep, updated_at: new Date().toISOString() }).eq('id', tenant.id).select().single();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Salon settings update returned no record.');
    return mapTenant(data as Row, tenant.subscription as unknown as Row);
  }

  async plans(): Promise<SubscriptionPlan[]> { const { data, error } = await this.client.from('subscription_plans').select('*').eq('is_active', true).order('monthly_price_lkr'); if (error) throw new Error(error.message); return (data || []).map((row) => mapPlan(row as Row)); }
  async customers(tenantId: string, signal?: AbortSignal): Promise<Customer[]> { return (await this.listRows(tableFor.customers, tenantId, signal)).map(mapSupabaseCustomer); }
  async serviceCategories(tenantId: string, signal?: AbortSignal): Promise<ServiceCategory[]> { return (await this.listRows(tableFor.categories, tenantId, signal)).map(mapCategory); }
  async services(tenantId: string, signal?: AbortSignal): Promise<Service[]> { return (await this.listRows(tableFor.services, tenantId, signal)).map(mapService); }
  async staff(tenantId: string, signal?: AbortSignal): Promise<Staff[]> { return (await this.listRows(tableFor.staff, tenantId, signal)).map(mapStaff); }
  async appointments(tenantId: string, signal?: AbortSignal): Promise<Appointment[]> { return (await this.listRows(tableFor.appointments, tenantId, signal)).map(mapSupabaseAppointment); }
  async productCategories(tenantId: string, signal?: AbortSignal): Promise<ProductCategory[]> { return (await this.listRows(tableFor.productCategories, tenantId, signal)).map(mapProductCategory); }
  async products(tenantId: string, signal?: AbortSignal): Promise<Product[]> { return (await this.listRows(tableFor.products, tenantId, signal)).map(mapProduct); }
  async stockMovements(tenantId: string, signal?: AbortSignal): Promise<StockMovement[]> { return (await this.listRows(tableFor.stockMovements, tenantId, signal)).map(mapStockMovement); }
  async tenantDataSnapshot(tenantId: string): Promise<{
    appointments: Appointment[];
    invoices: Invoice[];
    expenses: Expense[];
    customers: Customer[];
    products: Product[];
    staff: Staff[];
    services: Service[];
    commissions: StaffCommissionRecord[];
  }> {
    // Each domain method rechecks the current authenticated membership. This
    // intentionally avoids trusting a cached client-side tenant or role.
    const [appointments, invoices, expenses, customers, products, staff, services, commissions] = await Promise.all([
      this.appointments(tenantId), this.invoices(tenantId), this.expenses(tenantId), this.customers(tenantId),
      this.products(tenantId), this.staff(tenantId), this.services(tenantId), this.commissions(tenantId),
    ]);
    return { appointments, invoices, expenses, customers, products, staff, services, commissions };
  }
  async invoices(tenantId: string, signal?: AbortSignal): Promise<Invoice[]> { await this.assertTenantAccess(tenantId); const rows = await this.listRows(tableFor.invoices, tenantId, signal); return rows.map((row) => ({ ...camelizeRow(row), tenantId } as unknown as Invoice)); }
  async expenses(tenantId: string, signal?: AbortSignal): Promise<Expense[]> { await this.assertTenantAccess(tenantId); return (await this.listRows(tableFor.expenses, tenantId, signal)).map((row) => ({ ...camelizeRow(row), tenantId } as unknown as Expense)); }
  async expenseCategories(tenantId: string, signal?: AbortSignal): Promise<import('../types').ExpenseCategory[]> { return (await this.listRows(tableFor.expenseCategories, tenantId, signal)).map((row) => ({ ...camelizeRow(row), tenantId } as unknown as import('../types').ExpenseCategory)); }
  async commissions(tenantId: string, signal?: AbortSignal): Promise<StaffCommissionRecord[]> { await this.assertTenantAccess(tenantId); return (await this.listRows(tableFor.commissions, tenantId, signal)).map((row) => ({ ...camelizeRow(row), tenantId } as unknown as StaffCommissionRecord)); }
  async manualPayments(tenantId: string): Promise<ManualPaymentRequest[]> { await this.assertTenantAccess(tenantId); return (await this.listRows(tableFor.manualPayments, tenantId)).map((row) => ({ ...camelizeRow(row), tenantId } as unknown as ManualPaymentRequest)); }
  async allManualPayments(): Promise<ManualPaymentRequest[]> { const user = await this.currentUser(); if (!user || user.role !== 'superadmin') throw new Error('Super Admin access is required.'); const { data, error } = await this.client.from(tableFor.manualPayments).select('*').order('created_at', { ascending: false }); if (error) throw new Error(error.message); return (data || []).map((row) => ({ ...camelizeRow(row as Row), tenantId: stringValue((row as Row).salonId || (row as Row).salon_id) } as unknown as ManualPaymentRequest)); }
  async supportTickets(tenantId: string): Promise<SupportTicket[]> { await this.assertTenantAccess(tenantId); return (await this.listRows(tableFor.supportTickets, tenantId)).map((row) => ({ ...camelizeRow(row), tenantId } as unknown as SupportTicket)); }
  async notificationsForCurrentUser(tenantId?: string): Promise<NotificationItem[]> {
    const { data: authData, error: authError } = await this.client.auth.getUser();
    if (authError || !authData.user) throw new Error('An authenticated Supabase session is required.');
    if (tenantId && tenantId !== 'superadmin') await this.assertTenantAccess(tenantId);
    let query = this.client.from('notifications').select('*').eq('recipient_user_id', authData.user.id).order('created_at', { ascending: false });
    if (tenantId && tenantId !== 'superadmin') query = query.eq('salon_id', tenantId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []).map((row) => mapSupabaseNotification(row as Row));
  }
  async markNotificationRead(notificationId: string): Promise<void> {
    const { data: authData, error: authError } = await this.client.auth.getUser();
    if (authError || !authData.user) throw new Error('An authenticated Supabase session is required.');
    const { data, error } = await this.client.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', notificationId).eq('recipient_user_id', authData.user.id).select('id');
    if (error) throw new Error(error.message);
    if (!data?.length) throw new Error('Notification was not found or could not be marked read.');
  }

  async saveExpense(expense: Expense): Promise<Expense> { const row = camelizeRow(await this.writeRow(tableFor.expenses, expense.tenantId, expense.id, { category_id: expense.categoryId || null, category_name: expense.categoryName, description: expense.description, amount_lkr: expense.amountLKR, payment_method: expense.paymentMethod, date: expense.date, notes: expense.notes, receipt_url: expense.receiptUrl, receipt_file_name: expense.receiptFileName, created_at: expense.createdAt })); return { id: stringValue(row.id), tenantId: expense.tenantId, categoryId: stringValue(row.categoryId), categoryName: stringValue(row.categoryName), description: stringValue(row.description), amountLKR: numberValue(row.amountLkr), paymentMethod: stringValue(row.paymentMethod, 'cash') as Expense['paymentMethod'], date: stringValue(row.date), notes: stringValue(row.notes) || undefined, receiptUrl: stringValue(row.receiptUrl) || undefined, receiptFileName: stringValue(row.receiptFileName) || undefined, createdAt: stringValue(row.createdAt) } as Expense; }
  async deleteExpense(tenantId: string, id: string): Promise<void> { return this.deleteRow(tableFor.expenses, tenantId, id); }
  async saveExpenseCategory(category: import('../types').ExpenseCategory): Promise<import('../types').ExpenseCategory> { const row = await this.writeRow(tableFor.expenseCategories, category.tenantId, category.id, { name: category.name }); return { ...camelizeRow(row), tenantId: category.tenantId } as unknown as import('../types').ExpenseCategory; }

  async saveCommission(record: StaffCommissionRecord): Promise<StaffCommissionRecord> { const row = await this.writeRow(tableFor.commissions, record.tenantId, record.id, { staff_id: record.staffId, staff_name: record.staffName, invoice_id: record.invoiceId || null, invoice_number: record.invoiceNumber, item_type: record.itemType, item_name: record.itemName, item_amount_lkr: record.itemAmountLKR, commission_percentage: record.commissionPercentage, commission_amount_lkr: record.commissionAmountLKR, status: record.status, paid_at: record.paidAt, created_at: record.createdAt }); return { ...camelizeRow(row), tenantId: record.tenantId } as unknown as StaffCommissionRecord; }
  async deleteCommission(tenantId: string, id: string): Promise<void> { return this.deleteRow(tableFor.commissions, tenantId, id); }
  async markCommissionPaid(tenantId: string, id: string): Promise<StaffCommissionRecord> { await this.assertTenantAccess(tenantId); const { data, error } = await this.client.from(tableFor.commissions).update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', id).eq('salon_id', tenantId).select().single(); if (error) throw new Error(error.message); if (!data) throw new Error('Commission was not found or could not be settled.'); return { ...camelizeRow(data as Row), tenantId } as unknown as StaffCommissionRecord; }

  async saveSupportTicket(ticket: SupportTicket): Promise<SupportTicket> { await this.assertTenantAccess(ticket.tenantId); const row = { salon_id: ticket.tenantId, salon_name: ticket.salonName, user_email: ticket.userEmail, subject: ticket.subject, category: ticket.category, priority: ticket.priority, status: ticket.status, assigned_to: ticket.assignedTo, messages: ticket.messages, updated_at: ticket.updatedAt }; const { data, error } = ticket.id && isUuidValue(ticket.id) ? await this.client.from(tableFor.supportTickets).update(row).eq('id', ticket.id).eq('salon_id', ticket.tenantId).select().single() : await this.client.from(tableFor.supportTickets).insert(row).select().single(); if (error) throw new Error(error.message); if (!data) throw new Error('Support ticket write returned no record.'); return { ...camelizeRow(data as Row), tenantId: ticket.tenantId } as unknown as SupportTicket; }
  async deleteSupportTicket(tenantId: string, id: string): Promise<void> { return this.deleteRow(tableFor.supportTickets, tenantId, id); }
  async updateSupportTicketStatus(ticketId: string, status: SupportTicket['status']): Promise<void> { const { data, error } = await this.client.from(tableFor.supportTickets).update({ status, updated_at: new Date().toISOString() }).eq('id', ticketId).select('id').single(); if (error) throw new Error(error.message); if (!data) throw new Error('Support ticket was not found or could not be updated.'); }

  async saveManualPayment(payment: ManualPaymentRequest): Promise<ManualPaymentRequest> { await this.assertTenantAccess(payment.tenantId); const row = { salon_id: payment.tenantId, salon_name: payment.salonName, owner_email: payment.ownerEmail, plan_id: payment.planId, plan_name: payment.planName, billing_cycle: payment.billingCycle, amount_lkr: payment.amountLKR, bank_reference: payment.bankReference, payment_date: payment.paymentDate, receipt_url: payment.receiptUrl, receipt_file_name: payment.receiptFileName, notes: payment.notes, status: payment.status, rejection_reason: payment.rejectionReason, reviewed_by: payment.reviewedBy, reviewed_at: payment.reviewedAt }; const { data, error } = payment.id && isUuidValue(payment.id) ? await this.client.from(tableFor.manualPayments).update(row).eq('id', payment.id).eq('salon_id', payment.tenantId).select().single() : await this.client.from(tableFor.manualPayments).insert(row).select().single(); if (error) throw new Error(error.message); if (!data) throw new Error('Payment request write returned no record.'); return { ...camelizeRow(data as Row), tenantId: payment.tenantId } as unknown as ManualPaymentRequest; }

  async updateAppointmentStatus(tenantId: string, id: string, status: Appointment['status']): Promise<Appointment> { await this.assertTenantAccess(tenantId); const { data, error } = await this.client.from(tableFor.appointments).update({ status }).eq('id', id).eq('salon_id', tenantId).select().single(); if (error) throw new Error(error.message); if (!data) throw new Error('Appointment was not found or could not be updated.'); return mapSupabaseAppointment(data as Row); }
  async saveCategory(category: ServiceCategory): Promise<ServiceCategory> { const row = await this.writeRow(tableFor.categories, category.tenantId, category.id, { name: category.name, description: category.description }); return mapCategory(row); }
  async saveProductCategory(category: ProductCategory): Promise<ProductCategory> { const row = await this.writeRow(tableFor.productCategories, category.tenantId, category.id, { name: category.name }); return mapProductCategory(row); }
  async saveStockMovement(movement: StockMovement): Promise<StockMovement> { const row = await this.writeRow(tableFor.stockMovements, movement.tenantId, movement.id, { product_id: movement.productId, product_name: movement.productName, type: movement.type, quantity_change: movement.quantityChange, balance_after: movement.balanceAfter, reason: movement.reason, reference_id: movement.referenceId }); return mapStockMovement(row); }

  async announcements(): Promise<Announcement[]> { const { data, error } = await this.client.from(tableFor.announcements).select('*').order('published_at', { ascending: false }); if (error) throw new Error(error.message); return (data || []).map((row) => camelizeRow(row as Row) as unknown as Announcement); }
  async saveAnnouncement(item: Announcement): Promise<Announcement> { const payload = { title: item.title, content: item.content, type: item.type, target_audience: item.targetAudience, is_active: item.isActive, published_at: item.publishedAt }; const { data, error } = item.id && isUuidValue(item.id) ? await this.client.from(tableFor.announcements).update(payload).eq('id', item.id).select().single() : await this.client.from(tableFor.announcements).insert(payload).select().single(); if (error) throw new Error(error.message); if (!data) throw new Error('Announcement write returned no record.'); return camelizeRow(data as Row) as unknown as Announcement; }
  async deleteAnnouncement(id: string): Promise<void> { const { data, error } = await this.client.from(tableFor.announcements).delete().eq('id', id).select('id'); if (error) throw new Error(error.message); if (!data?.length) throw new Error('Announcement was not found or could not be deleted.'); }

  async saveWebsiteConfig(tenantId: string, record: { status: string; draft: unknown; published: unknown | null; publishedAt?: string; lastSavedAt?: string }): Promise<void> { await this.assertTenantAccess(tenantId); const { error } = await this.client.from('website_configs').upsert({ salon_id: tenantId, status: record.status, draft_config: record.draft, published_config: record.published, published_at: record.publishedAt || null, last_saved_at: record.lastSavedAt || new Date().toISOString() }, { onConflict: 'salon_id' }); if (error) throw new Error(error.message); }
  async websiteConfig(tenantId: string, publishedOnly = false): Promise<Row | null> { if (!publishedOnly) await this.assertTenantAccess(tenantId); const query = this.client.from('website_configs').select('*').eq('salon_id', tenantId); if (publishedOnly) query.eq('status', 'published').not('published_config', 'is', null); const { data, error } = await query.maybeSingle(); if (error) throw new Error(error.message); return data ? data as Row : null; }
  async websiteReviews(tenantId: string, approvedOnly = false): Promise<WebsiteReview[]> { if (!approvedOnly) await this.assertTenantAccess(tenantId); let query = this.client.from('website_reviews').select('*').eq('salon_id', tenantId); if (approvedOnly) query.eq('status', 'approved'); const { data, error } = await query.order('created_at', { ascending: false }); if (error) throw new Error(error.message); return (data || []).map((row) => ({ ...camelizeRow(row as Row), tenantId, text: stringValue((row as Row).review_text) } as unknown as WebsiteReview)); }
  async submitWebsiteReview(input: Omit<WebsiteReview, 'id' | 'status' | 'isFeatured' | 'moderatedAt' | 'moderatedBy'>): Promise<WebsiteReview> { const { data, error } = await this.client.from('website_reviews').insert({ salon_id: input.tenantId, customer_name: input.customerName, customer_phone: input.customerPhone, rating: input.rating, review_text: input.text, service_ref: input.serviceRef, status: 'pending', is_featured: false, verified_booking: false }).select().single(); if (error) throw new Error(error.message); return { ...camelizeRow(data as Row), tenantId: input.tenantId, text: stringValue((data as Row).review_text) } as unknown as WebsiteReview; }
  async moderateWebsiteReview(tenantId: string, reviewId: string, values: { status: WebsiteReview['status']; isFeatured: boolean; moderatedBy?: string }): Promise<void> { await this.assertTenantAccess(tenantId); const { error, data } = await this.client.from('website_reviews').update({ status: values.status, is_featured: values.isFeatured, moderated_at: new Date().toISOString() }).eq('id', reviewId).eq('salon_id', tenantId).select('id').single(); if (error) throw new Error(error.message); if (!data) throw new Error('Review was not found or could not be updated.'); }
  async deleteWebsiteReview(tenantId: string, id: string): Promise<void> { return this.deleteRow('website_reviews', tenantId, id); }

  async landingPage(status: 'draft' | 'published'): Promise<Row | null> { const { data, error } = await this.client.from('landing_page_documents').select('*').eq('status', status).maybeSingle(); if (error) throw new Error(error.message); return data ? data as Row : null; }
  async saveLandingPage(status: 'draft' | 'published', version: number, content: unknown): Promise<Row> { const { data: userData, error: userError } = await this.client.auth.getUser(); if (userError || !userData.user) throw new Error('An authenticated Super Admin session is required.'); const existing = await this.landingPage(status); const values = { status, version, content, updated_by: userData.user.id, published_at: status === 'published' ? new Date().toISOString() : null }; const query = existing ? this.client.from('landing_page_documents').update(values).eq('id', stringValue(existing.id)) : this.client.from('landing_page_documents').insert({ ...values, created_by: userData.user.id }); const { data, error } = await query.select().single(); if (error) throw new Error(error.message); if (!data) throw new Error('Landing page write returned no record.'); return data as Row; }

  async upsertCustomer(customer: Customer): Promise<Customer> { return mapSupabaseCustomer(await this.upsertRow(tableFor.customers, customer.tenantId, { id: customer.id, name: customer.name, phone: customer.phone, whatsapp: customer.whatsapp, email: customer.email, gender: customer.gender, birthday: customer.birthday, address: customer.address, notes: customer.notes, status: customer.status, total_spent_lkr: customer.totalSpentLKR, visits_count: customer.visitsCount, last_visit_at: customer.lastVisitAt, created_at: customer.createdAt })); }
  async upsertService(service: Service): Promise<Service> { return mapService(await this.upsertRow(tableFor.services, service.tenantId, { id: service.id, category_id: service.categoryId || null, assigned_staff_ids: service.assignedStaffIds, name: service.name, description: service.description, price_lkr: service.priceLKR, duration_minutes: service.durationMinutes, commission_rate: service.commissionRate, is_online_booking_enabled: service.isOnlineBookingEnabled, is_active: service.isActive })); }
  async upsertStaff(staff: Staff): Promise<Staff> { return mapStaff(await this.upsertRow(tableFor.staff, staff.tenantId, { id: staff.id, name: staff.name, position: staff.position, phone: staff.phone, email: staff.email, status: staff.status, default_service_commission: staff.defaultServiceCommission, default_product_commission: staff.defaultProductCommission, working_hours: staff.workingHours, color: staff.color })); }
  async upsertAppointment(appointment: Appointment): Promise<Appointment> { return mapSupabaseAppointment(await this.upsertRow(tableFor.appointments, appointment.tenantId, { id: appointment.id, customer_id: appointment.customerId || null, customer_name: appointment.customerName, customer_phone: appointment.customerPhone, customer_email: appointment.customerEmail, staff_id: appointment.staffId || null, staff_name: appointment.staffName, service_ids: appointment.serviceIds, service_names: appointment.serviceNames, date: appointment.date, start_time: appointment.startTime, end_time: appointment.endTime, duration_minutes: appointment.durationMinutes, total_price_lkr: appointment.totalPriceLKR, status: appointment.status, payment_status: appointment.paymentStatus, booking_source: appointment.bookingSource, notes: appointment.notes, internal_notes: appointment.internalNotes, check_in_at: appointment.checkInAt, check_out_at: appointment.checkOutAt, invoice_id: appointment.invoiceId })); }
  async createAuditLog(params: Pick<AuditLog, 'tenantId' | 'action' | 'entity' | 'entityId' | 'details'>): Promise<AuditLog> {
    if (!params.tenantId) throw new Error('A tenant ID is required for an audit event.');
    await this.assertTenantAccess(params.tenantId);
    const { data: authData, error: authError } = await this.client.auth.getUser();
    if (authError || !authData.user?.email) throw new Error('An authenticated user is required to create an audit event.');
    const { data: membership, error: membershipError } = await this.client.from('salon_members').select('role').eq('salon_id', params.tenantId).eq('user_id', authData.user.id).eq('status', 'active').maybeSingle();
    if (membershipError) throw new Error(membershipError.message);
    const actorRole = stringValue(asRecord(membership).role);
    if (!actorRole) throw new Error('An active tenant membership is required to create an audit event.');
    const { data, error } = await this.client.from(tableFor.auditLogs).insert({
      salon_id: params.tenantId,
      actor_email: authData.user.email,
      actor_role: actorRole,
      action: params.action,
      entity: params.entity,
      entity_id: params.entityId,
      details: params.details,
    }).select().single();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Audit event was not returned by the database.');
    const row = camelizeRow(data as Row);
    return { id: stringValue(row.id), tenantId: stringValue(row.salonId) || params.tenantId, actorEmail: stringValue(row.actorEmail), actorRole: stringValue(row.actorRole), action: stringValue(row.action), entity: stringValue(row.entity), entityId: stringValue(row.entityId) || undefined, details: stringValue(row.details), ipAddress: stringValue(row.ipAddress) || undefined, createdAt: stringValue(row.createdAt) };
  }
  async upsertProduct(product: Product): Promise<Product> { return mapProduct(await this.upsertRow(tableFor.products, product.tenantId, { id: product.id, category_id: product.categoryId || null, name: product.name, sku: product.sku, selling_price_lkr: product.sellingPriceLKR, cost_price_lkr: product.costPriceLKR, low_stock_threshold: product.lowStockThreshold, supplier: product.supplier, expiry_date: product.expiryDate, status: product.status })); }
  async deleteById(table: keyof typeof tableFor, tenantId: string, id: string): Promise<void> { return this.deleteRow(tableFor[table], tenantId, id); }

  async createInvoiceAtomically(invoice: Invoice): Promise<Invoice> {
    await this.assertTenantAccess(invoice.tenantId);
    const { data, error } = await this.client.rpc('create_pos_invoice', { p_salon_id: invoice.tenantId, p_invoice: invoice });
    if (error) throw new Error(error.message);
    return mapPosInvoiceRpcResult(data, invoice);
  }

  async registerSalon(params: { salonName: string; ownerName: string; email: string; phone: string; city: string; slug: string }): Promise<{ salonId: string }> {
    const { data, error } = await this.client.rpc('create_salon_for_current_user', {
      p_salon_name: params.salonName,
      p_owner_name: params.ownerName,
      p_email: params.email,
      p_phone: params.phone,
      p_city: params.city,
      p_slug: params.slug,
    });
    if (error) throw new Error(error.message);
    const row = asRecord(data);
    const salonId = stringValue(row.salon_id || row.salonId);
    if (!salonId) throw new Error('Supabase registration did not return a salon ID.');
    return { salonId };
  }

  async submitPublicBooking(params: { salonSlug: string; customerName: string; customerPhone: string; customerEmail?: string; staffId?: string; serviceIds: string[]; date: string; startTime: string; endTime: string; durationMinutes: number; idempotencyKey: string; notes?: string }): Promise<Row> {
    const { data, error } = await this.client.rpc('submit_public_booking', { p_salon_slug: params.salonSlug, p_customer_name: params.customerName, p_customer_phone: params.customerPhone, p_customer_email: params.customerEmail || null, p_staff_id: params.staffId || null, p_service_ids: params.serviceIds, p_date: params.date, p_start_time: params.startTime, p_end_time: params.endTime, p_duration_minutes: params.durationMinutes, p_idempotency_key: params.idempotencyKey, p_notes: params.notes || null });
    if (error) throw new Error(error.message);
    return asRecord(data);
  }

  async recordStockMovementAtomic(params: { tenantId: string; productId: string; type: StockMovement['type']; quantityChange: number; reason: string; referenceId?: string }): Promise<Row> {
    await this.assertTenantAccess(params.tenantId);
    const { data, error } = await this.client.rpc('record_stock_movement_atomic', {
      p_salon_id: params.tenantId,
      p_product_id: params.productId,
      p_type: params.type,
      p_quantity_change: params.quantityChange,
      p_reason: params.reason,
      p_reference_id: params.referenceId || null,
    });
    if (error) throw new Error(error.message);
    return asRecord(data);
  }

  async reviewManualPayment(paymentId: string, action: 'approved' | 'rejected', rejectionReason?: string): Promise<Row> {
    const { data, error } = await this.client.rpc('review_manual_payment', {
      p_payment_id: paymentId,
      p_action: action,
      p_rejection_reason: rejectionReason || null,
    });
    if (error) throw new Error(error.message);
    return asRecord(data);
  }

  async appendSupportTicketMessage(params: { ticketId: string; content: string; senderName: string; senderRole: 'tenant' | 'support' }): Promise<Row> {
    const { data, error } = await this.client.rpc('append_support_ticket_message', {
      p_ticket_id: params.ticketId,
      p_content: params.content,
      p_sender_name: params.senderName,
      p_sender_role: params.senderRole,
    });
    if (error) throw new Error(error.message);
    return asRecord(data);
  }

  async markNotificationsRead(tenantId?: string): Promise<number> {
    const { data, error } = await this.client.rpc('mark_notifications_read', { p_salon_id: tenantId || null });
    if (error) throw new Error(error.message);
    return typeof data === 'number' ? data : numberValue(data);
  }
}

export function createSupabaseRepository(): SupabaseRepository | null {
  return isSupabaseConfigured && supabase ? new SupabaseRepository(supabase) : null;
}

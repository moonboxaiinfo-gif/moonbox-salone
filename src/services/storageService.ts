/**
 * Moonbox Salon Storage Service
 * Provides persistent multi-tenant data storage with strict tenant isolation,
 * business rule validation, audit logging, stock movement automation,
 * and double-booking prevention.
 */

import {
  SalonTenant,
  User,
  Customer,
  Service,
  ServiceCategory,
  Staff,
  Product,
  ProductCategory,
  Appointment,
  Invoice,
  Expense,
  ExpenseCategory,
  StockMovement,
  StaffCommissionRecord,
  AppointmentStatus,
  ManualPaymentRequest,
  SupportTicket,
  Announcement,
  NotificationItem,
  AuditLog,
  SubscriptionPlan
} from '../types';

import {
  INITIAL_TENANTS,
  INITIAL_USERS,
  INITIAL_SERVICE_CATEGORIES,
  INITIAL_SERVICES,
  INITIAL_STAFF,
  INITIAL_CUSTOMERS,
  INITIAL_PRODUCT_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_APPOINTMENTS,
  INITIAL_INVOICES,
  INITIAL_EXPENSE_CATEGORIES,
  INITIAL_EXPENSES,
  INITIAL_COMMISSIONS,
  INITIAL_MANUAL_PAYMENTS,
  INITIAL_SUPPORT_TICKETS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUDIT_LOGS
} from '../data/mockInitialData';

import { DEFAULT_PLANS } from '../constants/plans';
import { createSupabaseRepository } from './supabaseRepository';

const STORAGE_PREFIX = 'moonbox_salon_saas_v1_';
const memoryStorage: Record<string, string> = {};
const runtimeEnv = ((typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {}) as Record<string, string | boolean | undefined>;
/**
 * Local persistence is retained only for automated tests and an explicitly
 * enabled local demo. Production builds must use a Supabase-backed repository
 * and fail closed rather than displaying fabricated business records.
 */
export const isLocalDemoMode = runtimeEnv.MODE === 'test' || (runtimeEnv.DEV === true && runtimeEnv.VITE_ALLOW_LOCAL_ADMIN_DEMO === 'true');
const productionRepository = !isLocalDemoMode ? createSupabaseRepository() : null;

export interface TenantDataSnapshot {
  appointments: Appointment[];
  invoices: Invoice[];
  expenses: Expense[];
  customers: Customer[];
  products: Product[];
  staff: Staff[];
  services: Service[];
  commissions: StaffCommissionRecord[];
}

function safeFallback<T>(value: T): T {
  if (isLocalDemoMode) return value;
  if (Array.isArray(value)) return [] as T;
  if (value && typeof value === 'object') return {} as T;
  return value;
}

function getStorage<T>(key: string, defaultValue: T): T {
  try {
    if (!isLocalDemoMode || typeof localStorage === 'undefined') {
      const raw = memoryStorage[STORAGE_PREFIX + key];
      if (!raw || raw === 'null' || raw === 'undefined') return safeFallback(defaultValue);
      const parsed = JSON.parse(raw);
      return (parsed === null || parsed === undefined) ? safeFallback(defaultValue) : parsed;
    }
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw || raw === 'null' || raw === 'undefined') return safeFallback(defaultValue);
    const parsed = JSON.parse(raw);
    return (parsed === null || parsed === undefined) ? safeFallback(defaultValue) : parsed;
  } catch (err) {
    console.error(`Error reading ${key} from storage:`, err);
    return safeFallback(defaultValue);
  }
}

function setStorage<T>(key: string, value: T): void {
  try {
    if (!isLocalDemoMode || typeof localStorage === 'undefined') {
      memoryStorage[STORAGE_PREFIX + key] = JSON.stringify(value);
      return;
    }
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error writing ${key} to storage:`, err);
  }
}

export class StorageService {
  private static requireProductionRepository() {
    if (!productionRepository) {
      throw new Error('A configured Supabase repository is required for production business operations.');
    }
    return productionRepository;
  }

  static async loadTenantData(tenantId: string): Promise<TenantDataSnapshot> {
    if (isLocalDemoMode) {
      return {
        appointments: this.getAppointments(tenantId), invoices: this.getInvoices(tenantId), expenses: this.getExpenses(tenantId),
        customers: this.getCustomers(tenantId), products: this.getProducts(tenantId), staff: this.getStaff(tenantId),
        services: this.getServices(tenantId), commissions: this.getCommissions(tenantId)
      };
    }
    const repository = this.requireProductionRepository();
    const [appointments, invoices, expenses, customers, products, staff, services, commissions] = await Promise.all([
      repository.appointments(tenantId), repository.invoices(tenantId), repository.expenses(tenantId), repository.customers(tenantId),
      repository.products(tenantId), repository.staff(tenantId), repository.services(tenantId), repository.commissions(tenantId)
    ]);
    const snapshot = { appointments, invoices, expenses, customers, products, staff, services, commissions };
    setStorage('appointments', appointments); setStorage('invoices', invoices); setStorage('expenses', expenses); setStorage('customers', customers);
    setStorage('products', products); setStorage('staff', staff); setStorage('services', services); setStorage('commissions', commissions);
    return snapshot;
  }

  static clearProductionCache(): void {
    if (isLocalDemoMode) return;
    const businessKeys = ['plans', 'tenants', 'customers', 'service_categories', 'services', 'staff', 'appointments', 'product_categories', 'products', 'stock_movements', 'invoices', 'expense_categories', 'expenses', 'commissions', 'manual_payments', 'support_tickets', 'announcements', 'notifications', 'audit_logs'];
    for (const key of businessKeys) delete memoryStorage[STORAGE_PREFIX + key];
  }

  /**
   * Confirmed production writes. These methods deliberately update the local
   * reconciliation cache only after Supabase has returned the saved record.
   * Demo mode delegates to the existing synchronous fixtures for test/UI
   * compatibility until the remaining call sites are migrated.
   */
  static async saveCustomerConfirmed(customer: Customer): Promise<Customer> {
    if (isLocalDemoMode) { this.saveCustomer(customer); return customer; }
    const saved = await this.requireProductionRepository().upsertCustomer(customer);
    const all = getStorage<Customer[]>('customers', []);
    const index = all.findIndex((item) => item.id === saved.id && item.tenantId === saved.tenantId);
    if (index >= 0) all[index] = saved; else all.unshift(saved);
    setStorage('customers', all);
    return saved;
  }

  static async saveServiceConfirmed(service: Service): Promise<Service> {
    if (isLocalDemoMode) { this.saveService(service); return service; }
    const saved = await this.requireProductionRepository().upsertService(service);
    const all = getStorage<Service[]>('services', []);
    const index = all.findIndex((item) => item.id === saved.id && item.tenantId === saved.tenantId);
    if (index >= 0) all[index] = saved; else all.unshift(saved);
    setStorage('services', all);
    return saved;
  }

  static async deleteServiceConfirmed(tenantId: string, serviceId: string): Promise<void> {
    if (isLocalDemoMode) { this.deleteService(tenantId, serviceId); return; }
    await this.requireProductionRepository().deleteById('services', tenantId, serviceId);
    setStorage('services', getStorage<Service[]>('services', []).filter((item) => !(item.id === serviceId && item.tenantId === tenantId)));
  }

  static async saveStaffConfirmed(staff: Staff): Promise<Staff> {
    if (isLocalDemoMode) { this.saveStaff(staff); return staff; }
    const saved = await this.requireProductionRepository().upsertStaff(staff);
    const all = getStorage<Staff[]>('staff', []);
    const index = all.findIndex((item) => item.id === saved.id && item.tenantId === saved.tenantId);
    if (index >= 0) all[index] = saved; else all.unshift(saved);
    setStorage('staff', all);
    return saved;
  }

  static async saveAppointmentConfirmed(appointment: Appointment): Promise<{ success: boolean; appointment?: Appointment; error?: string }> {
    if (isLocalDemoMode) {
      const result = this.saveAppointment(appointment);
      return result.success ? { success: true, appointment } : result;
    }
    const saved = await this.requireProductionRepository().upsertAppointment(appointment);
    const all = getStorage<Appointment[]>('appointments', []);
    const index = all.findIndex((item) => item.id === saved.id && item.tenantId === saved.tenantId);
    if (index >= 0) all[index] = saved; else all.unshift(saved);
    setStorage('appointments', all);
    return { success: true, appointment: saved };
  }

  static async deleteAppointmentConfirmed(tenantId: string, appointmentId: string): Promise<void> {
    if (isLocalDemoMode) { this.deleteAppointment(tenantId, appointmentId); return; }
    await this.requireProductionRepository().deleteById('appointments', tenantId, appointmentId);
    setStorage('appointments', getStorage<Appointment[]>('appointments', []).filter((item) => !(item.id === appointmentId && item.tenantId === tenantId)));
  }

  static async updateAppointmentStatusConfirmed(tenantId: string, appointmentId: string, nextStatus: AppointmentStatus): Promise<{ success: boolean; appointment?: Appointment; error?: string }> {
    if (isLocalDemoMode) return this.updateAppointmentStatus(tenantId, appointmentId, nextStatus);
    try {
      const saved = await this.requireProductionRepository().updateAppointmentStatus(tenantId, appointmentId, nextStatus);
      const all = getStorage<Appointment[]>('appointments', []);
      const index = all.findIndex((item) => item.id === saved.id && item.tenantId === saved.tenantId);
      if (index >= 0) all[index] = saved; else all.unshift(saved);
      setStorage('appointments', all);
      return { success: true, appointment: saved };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Appointment status update failed.' };
    }
  }

  static async saveProductConfirmed(product: Product): Promise<Product> {
    if (isLocalDemoMode) { this.saveProduct(product); return product; }
    const saved = await this.requireProductionRepository().upsertProduct(product);
    const all = getStorage<Product[]>('products', []);
    const index = all.findIndex((item) => item.id === saved.id && item.tenantId === saved.tenantId);
    if (index >= 0) all[index] = saved; else all.unshift(saved);
    setStorage('products', all);
    return saved;
  }

  static async recordStockMovementConfirmed(params: { tenantId: string; productId: string; productName: string; type: StockMovement['type']; quantityChange: number; reason: string; referenceId?: string }): Promise<void> {
    if (isLocalDemoMode) {
      const result = this.recordStockMovement(params.tenantId, params.productId, params.productName, params.type, params.quantityChange, params.reason, params.referenceId);
      if (!result.success) throw new Error(result.error || 'Stock movement failed.');
      return;
    }
    // The RPC is the authoritative transaction. Resource consumers reconcile
    // through invalidation; a post-commit cache refresh must not turn a saved
    // stock movement into a misleading failure response.
    await this.requireProductionRepository().recordStockMovementAtomic(params);
  }

  static async createInvoiceConfirmed(invoice: Invoice): Promise<{ success: boolean; invoice?: Invoice; error?: string }> {
    if (isLocalDemoMode) {
      const result = this.createInvoice(invoice);
      return result.success ? { success: true, invoice } : result;
    }
    const saved = await this.requireProductionRepository().createInvoiceAtomically(invoice);
    return { success: true, invoice: saved };
  }

  static async saveExpenseConfirmed(expense: Expense): Promise<Expense> {
    if (isLocalDemoMode) { this.saveExpense(expense); return expense; }
    return this.requireProductionRepository().saveExpense(expense);
  }

  static async deleteExpenseConfirmed(tenantId: string, expenseId: string): Promise<void> {
    if (isLocalDemoMode) { this.deleteExpense(tenantId, expenseId); return; }
    await this.requireProductionRepository().deleteExpense(tenantId, expenseId);
  }

  static async markCommissionPaidConfirmed(tenantId: string, commissionId: string): Promise<StaffCommissionRecord> {
    if (isLocalDemoMode) { this.markCommissionPaid(commissionId, tenantId); return this.getCommissions(tenantId).find((commission) => commission.id === commissionId)!; }
    return this.requireProductionRepository().markCommissionPaid(tenantId, commissionId);
  }

  static async submitManualPaymentConfirmed(payment: ManualPaymentRequest): Promise<ManualPaymentRequest> {
    if (isLocalDemoMode) { this.submitManualPayment(payment); return payment; }
    const saved = await this.requireProductionRepository().saveManualPayment(payment);
    setStorage('manual_payments', await this.requireProductionRepository().manualPayments(payment.tenantId));
    return saved;
  }

  static async reviewPaymentConfirmed(paymentId: string, action: 'approved' | 'rejected', rejectionReason?: string): Promise<void> {
    if (isLocalDemoMode) { this.reviewPayment(paymentId, action, 'current-user', rejectionReason); return; }
    await this.requireProductionRepository().reviewManualPayment(paymentId, action, rejectionReason);
    const payments = await this.requireProductionRepository().allManualPayments();
    setStorage('manual_payments', payments);
  }

  static async createSupportTicketConfirmed(ticket: SupportTicket): Promise<SupportTicket> {
    if (isLocalDemoMode) { this.createSupportTicket(ticket); return ticket; }
    const saved = await this.requireProductionRepository().saveSupportTicket(ticket);
    setStorage('support_tickets', await this.requireProductionRepository().supportTickets(ticket.tenantId));
    return saved;
  }

  static async replySupportTicketConfirmed(ticketId: string, senderName: string, senderRole: 'tenant' | 'support', content: string, tenantId: string): Promise<void> {
    if (isLocalDemoMode) { this.replySupportTicket(ticketId, senderName, senderRole, senderName, content); return; }
    await this.requireProductionRepository().appendSupportTicketMessage({ ticketId, content, senderName, senderRole });
    setStorage('support_tickets', await this.requireProductionRepository().supportTickets(tenantId));
  }

  static async updateTicketStatusConfirmed(ticketId: string, status: SupportTicket['status'], tenantId: string): Promise<void> {
    if (isLocalDemoMode) { this.updateTicketStatus(ticketId, status); return; }
    await this.requireProductionRepository().updateSupportTicketStatus(ticketId, status);
    setStorage('support_tickets', await this.requireProductionRepository().supportTickets(tenantId));
  }

  static async markAllNotificationsReadConfirmed(tenantId: string): Promise<void> {
    if (isLocalDemoMode) { this.markAllNotificationsRead(tenantId); return; }
    await this.requireProductionRepository().markNotificationsRead(tenantId);
  }

  // Initializer
  static async init() {
    if (!isLocalDemoMode) {
      const repository = createSupabaseRepository();
      if (!repository) return;
      try {
        setStorage('plans', await repository.plans());
        const tenants = await repository.tenantsForCurrentUser();
        setStorage('tenants', tenants);
        const user = await repository.currentUser();
        if (!user || user.tenantId === 'superadmin') return;
        const tenantId = user.tenantId;
        const [customers, categories, services, staff, appointments, productCategories, products, stockMovements, invoices, expenses, commissions, payments, tickets] = await Promise.all([
          repository.customers(tenantId), repository.serviceCategories(tenantId), repository.services(tenantId), repository.staff(tenantId), repository.appointments(tenantId), repository.productCategories(tenantId), repository.products(tenantId), repository.stockMovements(tenantId), repository.invoices(tenantId), repository.expenses(tenantId), repository.commissions(tenantId), repository.manualPayments(tenantId), repository.supportTickets(tenantId),
        ]);
        setStorage('customers', customers); setStorage('service_categories', categories); setStorage('services', services); setStorage('staff', staff); setStorage('appointments', appointments); setStorage('product_categories', productCategories); setStorage('products', products); setStorage('stock_movements', stockMovements); setStorage('invoices', invoices); setStorage('expenses', expenses); setStorage('commissions', commissions); setStorage('manual_payments', payments); setStorage('support_tickets', tickets);
      } catch (error) {
        console.error('[StorageService] Supabase bootstrap failed; no demo fallback was used.', error);
      }
      return;
    }
    const hasTenants = typeof localStorage !== 'undefined'
      ? Boolean(localStorage.getItem(STORAGE_PREFIX + 'tenants'))
      : Boolean(memoryStorage[STORAGE_PREFIX + 'tenants']);

    if (!hasTenants) {
      setStorage('tenants', INITIAL_TENANTS);
      setStorage('users', INITIAL_USERS);
      setStorage('plans', DEFAULT_PLANS);
      setStorage('service_categories', INITIAL_SERVICE_CATEGORIES);
      setStorage('services', INITIAL_SERVICES);
      setStorage('staff', INITIAL_STAFF);
      setStorage('customers', INITIAL_CUSTOMERS);
      setStorage('product_categories', INITIAL_PRODUCT_CATEGORIES);
      setStorage('products', INITIAL_PRODUCTS);
      setStorage('appointments', INITIAL_APPOINTMENTS);
      setStorage('invoices', INITIAL_INVOICES);
      setStorage('expense_categories', INITIAL_EXPENSE_CATEGORIES);
      setStorage('expenses', INITIAL_EXPENSES);
      setStorage('commissions', INITIAL_COMMISSIONS);
      setStorage('manual_payments', INITIAL_MANUAL_PAYMENTS);
      setStorage('support_tickets', INITIAL_SUPPORT_TICKETS);
      setStorage('announcements', INITIAL_ANNOUNCEMENTS);
      setStorage('notifications', INITIAL_NOTIFICATIONS);
      setStorage('audit_logs', INITIAL_AUDIT_LOGS);
      setStorage('stock_movements', []);
    }
  }

  // ==========================================
  // PLATFORM CONTENT (Landing Page CMS)
  // ==========================================
  static getPlatformContent<T>(key: string, fallback: T): T {
    return getStorage<T>(`platform_content_${key}`, fallback);
  }

  static setPlatformContent<T>(key: string, value: T): void {
    setStorage(`platform_content_${key}`, value);
  }

  static getPlatformRevisions<T>(key: string): T[] {
    return getStorage<T[]>(`platform_revisions_${key}`, []);
  }

  static setPlatformRevisions<T>(key: string, value: T[]): void {
    setStorage(`platform_revisions_${key}`, value);
  }

  // ==========================================
  // AUDIT LOGGING
  // ==========================================
  static logAudit(params: {
    tenantId?: string;
    actorEmail: string;
    actorRole: string;
    action: string;
    entity: string;
    entityId?: string;
    details: string;
  }) {
    const logs = getStorage<AuditLog[]>('audit_logs', INITIAL_AUDIT_LOGS);
    const newLog: AuditLog = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      tenantId: params.tenantId,
      actorEmail: params.actorEmail,
      actorRole: params.actorRole,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      details: params.details,
      ipAddress: undefined, // Only genuine client network metadata retained when provided
      createdAt: new Date().toISOString()
    };
    logs.unshift(newLog);
    setStorage('audit_logs', logs.slice(0, 500)); // maintain recent 500
  }

  static async logAuditConfirmed(params: {
    tenantId: string;
    actorEmail?: string;
    actorRole?: string;
    action: string;
    entity: string;
    entityId?: string;
    details: string;
  }): Promise<void> {
    if (isLocalDemoMode) {
      this.logAudit({ ...params, actorEmail: params.actorEmail || 'Demo User', actorRole: params.actorRole || 'staff' });
      return;
    }
    const saved = await this.requireProductionRepository().createAuditLog(params);
    const logs = getStorage<AuditLog[]>('audit_logs', []);
    logs.unshift(saved);
    setStorage('audit_logs', logs.slice(0, 500));
  }

  static getAuditLogs(tenantId?: string): AuditLog[] {
    const logs = getStorage<AuditLog[]>('audit_logs', INITIAL_AUDIT_LOGS);
    if (!tenantId || tenantId === 'superadmin') {
      return logs;
    }
    return logs.filter(l => l.tenantId === tenantId);
  }

  // ==========================================
  // TENANTS & ONBOARDING
  // ==========================================
  static getTenants(): SalonTenant[] {
    const list = getStorage<SalonTenant[]>('tenants', INITIAL_TENANTS);
    return Array.isArray(list) && list.length > 0 ? list : (isLocalDemoMode ? INITIAL_TENANTS : []);
  }

  static getTenantById(tenantId: string): SalonTenant | undefined {
    return this.getTenants().find(t => t.id === tenantId);
  }

  static getTenantBySlug(slug: string): SalonTenant | undefined {
    return this.getTenants().find(t => t.slug.toLowerCase() === slug.toLowerCase());
  }

  static updateTenant(tenant: SalonTenant): void {
    const tenants = this.getTenants();
    const index = tenants.findIndex(t => t.id === tenant.id);
    if (index >= 0) {
      tenants[index] = { ...tenant, updatedAt: new Date().toISOString() };
      setStorage('tenants', tenants);
    }
  }

  static async updateTenantConfirmed(tenant: SalonTenant): Promise<SalonTenant> {
    if (isLocalDemoMode) {
      this.updateTenant(tenant);
      return { ...tenant, updatedAt: new Date().toISOString() };
    }
    const saved = await this.requireProductionRepository().updateTenant(tenant);
    const tenants = this.getTenants();
    const index = tenants.findIndex(candidate => candidate.id === saved.id);
    if (index >= 0) tenants[index] = saved;
    else tenants.push(saved);
    setStorage('tenants', tenants);
    return saved;
  }

  static createTenant(newTenant: SalonTenant): void {
    const tenants = this.getTenants();
    tenants.push(newTenant);
    setStorage('tenants', tenants);
  }

  static isSlugAvailable(slug: string, excludeTenantId?: string): boolean {
    const clean = slug.trim().toLowerCase();
    const tenants = this.getTenants();
    return !tenants.some(t => t.slug.toLowerCase() === clean && t.id !== excludeTenantId);
  }

  /**
   * Super Admin Exclusive: Grant a Free Trial explicitly (7, 14, or 30 days)
   * New salons start in 'pending_approval' with no active trial.
   */
  static grantTrial(
    tenantId: string, 
    durationDays: number, 
    planId: string, 
    actorEmail: string
  ): { success: boolean; error?: string } {
    const tenant = this.getTenantById(tenantId);
    if (!tenant) return { success: false, error: 'Tenant workspace not found.' };

    const now = new Date();
    const trialEnd = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const endDate = new Date(now.getTime() + (durationDays + 30) * 24 * 60 * 60 * 1000);

    const updated: SalonTenant = {
      ...tenant,
      status: 'active',
      subscription: {
        ...tenant.subscription,
        planId: planId || 'plan_growth',
        status: 'trial',
        billingCycle: 'monthly',
        startDate: now.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        trialEndsAt: trialEnd.toISOString().split('T')[0],
        autoRenew: false
      }
    };

    this.updateTenant(updated);

    this.logAudit({
      tenantId,
      actorEmail,
      actorRole: 'superadmin',
      action: 'GRANT_TRIAL',
      entity: 'subscription',
      entityId: tenantId,
      details: `Granted ${durationDays}-day Free Trial on ${planId} to "${tenant.name}" until ${trialEnd.toISOString().split('T')[0]}`
    });

    return { success: true };
  }

  /**
   * Super Admin Exclusive: Extend an active trial
   */
  static extendTrial(
    tenantId: string, 
    additionalDays: number, 
    actorEmail: string
  ): { success: boolean; error?: string } {
    const tenant = this.getTenantById(tenantId);
    if (!tenant) return { success: false, error: 'Tenant workspace not found.' };

    const currentEnd = tenant.subscription.trialEndsAt 
      ? new Date(tenant.subscription.trialEndsAt)
      : new Date();
    const baseTime = currentEnd.getTime() > Date.now() ? currentEnd.getTime() : Date.now();
    const newEnd = new Date(baseTime + additionalDays * 24 * 60 * 60 * 1000);

    const updated: SalonTenant = {
      ...tenant,
      status: 'active',
      subscription: {
        ...tenant.subscription,
        status: 'trial',
        trialEndsAt: newEnd.toISOString().split('T')[0]
      }
    };

    this.updateTenant(updated);

    this.logAudit({
      tenantId,
      actorEmail,
      actorRole: 'superadmin',
      action: 'EXTEND_TRIAL',
      entity: 'subscription',
      entityId: tenantId,
      details: `Extended trial for "${tenant.name}" by ${additionalDays} days until ${newEnd.toISOString().split('T')[0]}`
    });

    return { success: true };
  }

  /**
   * Super Admin Exclusive: Revoke an active trial
   * Preserves all salon records, customers, invoices, and appointments intact.
   */
  static revokeTrial(
    tenantId: string, 
    actorEmail: string
  ): { success: boolean; error?: string } {
    const tenant = this.getTenantById(tenantId);
    if (!tenant) return { success: false, error: 'Tenant workspace not found.' };

    const updated: SalonTenant = {
      ...tenant,
      subscription: {
        ...tenant.subscription,
        status: 'expired',
        trialEndsAt: new Date().toISOString().split('T')[0]
      }
    };

    this.updateTenant(updated);

    this.logAudit({
      tenantId,
      actorEmail,
      actorRole: 'superadmin',
      action: 'REVOKE_TRIAL',
      entity: 'subscription',
      entityId: tenantId,
      details: `Revoked trial access for salon "${tenant.name}". All operational data preserved.`
    });

    return { success: true };
  }

  /**
   * Super Admin Exclusive: Assign an available package and activate
   */
  static assignPackage(
    tenantId: string,
    planId: string,
    billingCycle: 'monthly' | 'yearly',
    actorEmail: string
  ): { success: boolean; error?: string } {
    const tenant = this.getTenantById(tenantId);
    if (!tenant) return { success: false, error: 'Tenant workspace not found.' };

    const now = new Date();
    const cycleMonths = billingCycle === 'yearly' ? 12 : 1;
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + cycleMonths);

    const updated: SalonTenant = {
      ...tenant,
      status: 'active',
      subscription: {
        ...tenant.subscription,
        planId,
        status: 'active',
        billingCycle,
        startDate: now.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        autoRenew: true
      }
    };

    this.updateTenant(updated);

    this.logAudit({
      tenantId,
      actorEmail,
      actorRole: 'superadmin',
      action: 'ASSIGN_PACKAGE',
      entity: 'subscription',
      entityId: tenantId,
      details: `Activated ${billingCycle} subscription on package ${planId} for "${tenant.name}"`
    });

    return { success: true };
  }

  // ==========================================
  // USERS & AUTH
  // ==========================================
  static getUsers(): User[] {
    return getStorage<User[]>('users', INITIAL_USERS);
  }

  static getUserByEmail(email: string): User | undefined {
    return this.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  static createUser(user: User): void {
    const users = this.getUsers();
    users.push(user);
    setStorage('users', users);
  }

  // ==========================================
  // PLANS
  // ==========================================
  static getPlans(): SubscriptionPlan[] {
    const plans = getStorage<SubscriptionPlan[]>('plans', DEFAULT_PLANS);
    return Array.isArray(plans) && plans.length > 0 ? plans : (isLocalDemoMode ? DEFAULT_PLANS : []);
  }

  static updatePlan(plan: SubscriptionPlan): void {
    const plans = this.getPlans();
    const index = plans.findIndex(p => p.id === plan.id);
    if (index >= 0) {
      plans[index] = plan;
      setStorage('plans', plans);
    }
  }

  // ==========================================
  // CUSTOMERS (Tenant-Isolated)
  // ==========================================
  static getCustomers(tenantId: string): Customer[] {
    const all = getStorage<Customer[]>('customers', INITIAL_CUSTOMERS);
    return all.filter(c => c.tenantId === tenantId && c.status === 'active');
  }

  static getAllCustomersIncludingArchived(tenantId: string): Customer[] {
    const all = getStorage<Customer[]>('customers', INITIAL_CUSTOMERS);
    return all.filter(c => c.tenantId === tenantId);
  }

  static saveCustomer(customer: Customer): void {
    const all = getStorage<Customer[]>('customers', INITIAL_CUSTOMERS);
    const idx = all.findIndex(c => c.id === customer.id && c.tenantId === customer.tenantId);
    if (idx >= 0) {
      all[idx] = customer;
    } else {
      all.unshift(customer);
    }
    setStorage('customers', all);
  }

  // ==========================================
  // SERVICES & CATEGORIES (Tenant-Isolated)
  // ==========================================
  static getCategories(tenantId: string): ServiceCategory[] {
    const all = getStorage<ServiceCategory[]>('service_categories', INITIAL_SERVICE_CATEGORIES);
    return all.filter(c => c.tenantId === tenantId);
  }

  static saveCategory(category: ServiceCategory): void {
    const all = getStorage<ServiceCategory[]>('service_categories', INITIAL_SERVICE_CATEGORIES);
    const idx = all.findIndex(c => c.id === category.id && c.tenantId === category.tenantId);
    if (idx >= 0) all[idx] = category;
    else all.push(category);
    setStorage('service_categories', all);
  }

  static getServices(tenantId: string): Service[] {
    const all = getStorage<Service[]>('services', INITIAL_SERVICES);
    return all.filter(s => s.tenantId === tenantId);
  }

  static saveService(service: Service): void {
    const all = getStorage<Service[]>('services', INITIAL_SERVICES);
    const idx = all.findIndex(s => s.id === service.id && s.tenantId === service.tenantId);
    if (idx >= 0) all[idx] = service;
    else all.unshift(service);
    setStorage('services', all);
  }

  static deleteService(tenantId: string, serviceId: string): void {
    const all = getStorage<Service[]>('services', INITIAL_SERVICES);
    const filtered = all.filter(s => !(s.id === serviceId && s.tenantId === tenantId));
    setStorage('services', filtered);
  }

  // ==========================================
  // STAFF (Tenant-Isolated)
  // ==========================================
  static getStaff(tenantId: string): Staff[] {
    const all = getStorage<Staff[]>('staff', INITIAL_STAFF);
    return all.filter(s => s.tenantId === tenantId);
  }

  static saveStaff(staff: Staff): void {
    const all = getStorage<Staff[]>('staff', INITIAL_STAFF);
    const idx = all.findIndex(s => s.id === staff.id && s.tenantId === staff.tenantId);
    if (idx >= 0) all[idx] = staff;
    else all.unshift(staff);
    setStorage('staff', all);
  }

  // ==========================================
  // APPOINTMENTS (Tenant-Isolated & Double-Booking Protection)
  // ==========================================
  static getAppointments(tenantId: string): Appointment[] {
    const all = getStorage<Appointment[]>('appointments', INITIAL_APPOINTMENTS);
    return all.filter(a => a.tenantId === tenantId);
  }

  /**
   * Helper to convert "HH:mm" to minutes since midnight
   */
  private static timeToMinutes(timeStr: string): number {
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  /**
   * Validates double-booking prevention for a specific staff member
   */
  static checkDoubleBooking(
    tenantId: string,
    staffId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeAppointmentId?: string
  ): { isConflict: boolean; conflictingAppointment?: Appointment } {
    const appointments = this.getAppointments(tenantId).filter(
      a => a.date === date && 
           a.staffId === staffId && 
           a.status !== 'cancelled' && 
           a.status !== 'no_show' &&
           a.id !== excludeAppointmentId
    );

    const newStart = this.timeToMinutes(startTime);
    const newEnd = this.timeToMinutes(endTime);

    for (const apt of appointments) {
      const aptStart = this.timeToMinutes(apt.startTime);
      const aptEnd = this.timeToMinutes(apt.endTime);

      // Overlap condition: start < otherEnd AND end > otherStart
      if (newStart < aptEnd && newEnd > aptStart) {
        return { isConflict: true, conflictingAppointment: apt };
      }
    }

    return { isConflict: false };
  }

  static saveAppointment(appointment: Appointment): { success: boolean; error?: string } {
    // Check double-booking
    const conflict = this.checkDoubleBooking(
      appointment.tenantId,
      appointment.staffId,
      appointment.date,
      appointment.startTime,
      appointment.endTime,
      appointment.id
    );

    if (conflict.isConflict) {
      return {
        success: false,
        error: `Staff member ${appointment.staffName} already has a booking (${conflict.conflictingAppointment?.startTime} - ${conflict.conflictingAppointment?.endTime}) at this time.`
      };
    }

    const all = getStorage<Appointment[]>('appointments', INITIAL_APPOINTMENTS);
    const idx = all.findIndex(a => a.id === appointment.id && a.tenantId === appointment.tenantId);
    if (idx >= 0) {
      all[idx] = { ...appointment, updatedAt: new Date().toISOString() };
    } else {
      all.unshift(appointment);
    }
    setStorage('appointments', all);

    // Update customer visits & last visit
    const customers = getStorage<Customer[]>('customers', INITIAL_CUSTOMERS);
    const custIdx = customers.findIndex(c => c.id === appointment.customerId && c.tenantId === appointment.tenantId);
    if (custIdx >= 0) {
      customers[custIdx].lastVisitAt = new Date().toISOString();
      setStorage('customers', customers);
    }

    return { success: true };
  }

  static deleteAppointment(tenantId: string, appointmentId: string): void {
    const all = getStorage<Appointment[]>('appointments', INITIAL_APPOINTMENTS);
    const filtered = all.filter(a => !(a.id === appointmentId && a.tenantId === tenantId));
    setStorage('appointments', filtered);
  }

  private static readonly appointmentTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
    pending: ['confirmed', 'cancelled', 'no_show'],
    confirmed: ['checked_in', 'cancelled', 'no_show'],
    checked_in: ['in_progress', 'cancelled'],
    in_progress: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
    no_show: []
  };

  static updateAppointmentStatus(
    tenantId: string,
    appointmentId: string,
    nextStatus: AppointmentStatus,
    options: { actorEmail?: string; actorRole?: string; reason?: string } = {}
  ): { success: boolean; appointment?: Appointment; error?: string } {
    const appointment = this.getAppointments(tenantId).find(a => a.id === appointmentId);
    if (!appointment) return { success: false, error: 'Appointment not found.' };
    if (appointment.status === nextStatus) return { success: true, appointment };
    if (!this.appointmentTransitions[appointment.status].includes(nextStatus)) {
      return { success: false, error: `Cannot change ${appointment.status.replace('_', ' ')} to ${nextStatus.replace('_', ' ')}.` };
    }
    const now = new Date().toISOString();
    const updated: Appointment = {
      ...appointment,
      status: nextStatus,
      checkInAt: nextStatus === 'checked_in' ? now : appointment.checkInAt,
      checkOutAt: nextStatus === 'completed' ? now : appointment.checkOutAt,
      updatedAt: now
    };
    const result = this.saveAppointment(updated);
    if (!result.success) return { success: false, error: result.error };
    this.logAudit({
      tenantId,
      actorEmail: options.actorEmail || 'Staff',
      actorRole: options.actorRole || 'receptionist',
      action: 'UPDATE_APPOINTMENT_STATUS',
      entity: 'appointment',
      entityId: appointmentId,
      details: `${appointment.status} → ${nextStatus}${options.reason ? `: ${options.reason}` : ''}`
    });
    return { success: true, appointment: updated };
  }

  static checkInAppointment(tenantId: string, appointmentId: string) {
    return this.updateAppointmentStatus(tenantId, appointmentId, 'checked_in');
  }

  static checkOutAppointment(tenantId: string, appointmentId: string) {
    return this.updateAppointmentStatus(tenantId, appointmentId, 'completed');
  }

  // ==========================================
  // INVENTORY & STOCK MOVEMENTS (Tenant-Isolated)
  // ==========================================
  static getProductCategories(tenantId: string): ProductCategory[] {
    const all = getStorage<ProductCategory[]>('product_categories', INITIAL_PRODUCT_CATEGORIES);
    return all.filter(c => c.tenantId === tenantId);
  }

  static getProducts(tenantId: string): Product[] {
    const all = getStorage<Product[]>('products', INITIAL_PRODUCTS);
    return all.filter(p => p.tenantId === tenantId && p.status === 'active');
  }

  static saveProduct(product: Product): void {
    const all = getStorage<Product[]>('products', INITIAL_PRODUCTS);
    const idx = all.findIndex(p => p.id === product.id && p.tenantId === product.tenantId);
    if (idx >= 0) all[idx] = product;
    else all.unshift(product);
    setStorage('products', all);
  }

  static getStockMovements(tenantId: string): StockMovement[] {
    const all = getStorage<StockMovement[]>('stock_movements', []);
    return all.filter(m => m.tenantId === tenantId);
  }

  static recordStockMovement(
    tenantId: string,
    productId: string,
    productName: string,
    type: StockMovement['type'],
    quantityChange: number,
    reason: string,
    referenceId?: string
  ): { success: boolean; error?: string } {
    const products = getStorage<Product[]>('products', INITIAL_PRODUCTS);
    const idx = products.findIndex(p => p.id === productId && p.tenantId === tenantId);
    if (idx < 0) return { success: false, error: 'Product not found' };

    const product = products[idx];
    const newQty = product.stockQuantity + quantityChange;

    if (newQty < 0) {
      return { success: false, error: `Insufficient stock! Only ${product.stockQuantity} units available.` };
    }

    product.stockQuantity = newQty;
    products[idx] = product;
    setStorage('products', products);

    // Save movement log
    const movements = getStorage<StockMovement[]>('stock_movements', []);
    const movement: StockMovement = {
      id: `mov_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      tenantId,
      productId,
      productName,
      type,
      quantityChange,
      balanceAfter: newQty,
      reason,
      referenceId,
      createdAt: new Date().toISOString()
    };
    movements.unshift(movement);
    setStorage('stock_movements', movements);

    // Check low stock notification trigger
    if (newQty <= product.lowStockThreshold) {
      this.createNotification({
        tenantId,
        title: `⚠️ Low Stock Alert: ${product.name}`,
        message: `Stock for ${product.name} dropped to ${newQty} (Threshold: ${product.lowStockThreshold}). Reorder soon!`,
        type: 'inventory'
      });
    }

    return { success: true };
  }

  // ==========================================
  // INVOICES & POS SALE COMPLETION (Tenant-Isolated)
  // ==========================================
  static getInvoices(tenantId: string): Invoice[] {
    const all = getStorage<Invoice[]>('invoices', INITIAL_INVOICES);
    return all.filter(inv => inv.tenantId === tenantId);
  }

  static createInvoice(invoice: Invoice): { success: boolean; error?: string } {
    const existingInvoices = this.getInvoices(invoice.tenantId);
    if (existingInvoices.some(existing => existing.id === invoice.id || existing.invoiceNumber === invoice.invoiceNumber)) {
      return { success: false, error: 'This sale has already been recorded.' };
    }

    // Validate all product lines before writing any movements, avoiding partial stock changes on a failed sale.
    const requestedQuantities = new Map<string, number>();
    for (const item of invoice.items) {
      if (item.type === 'product') requestedQuantities.set(item.itemId, (requestedQuantities.get(item.itemId) || 0) + item.quantity);
    }
    const products = this.getProducts(invoice.tenantId);
    for (const [productId, quantity] of requestedQuantities) {
      const product = products.find(candidate => candidate.id === productId);
      if (!product) return { success: false, error: 'A product in this sale is no longer available.' };
      if (product.stockQuantity < quantity) return { success: false, error: `Insufficient stock for ${product.name}. Only ${product.stockQuantity} units available.` };
    }

    // Process product inventory reduction & movements after preflight validation.
    for (const item of invoice.items) {
      if (item.type === 'product') {
        const moveRes = this.recordStockMovement(
          invoice.tenantId,
          item.itemId,
          item.name,
          'sale',
          -item.quantity,
          `POS Sale: Invoice ${invoice.invoiceNumber}`,
          invoice.id
        );
        if (!moveRes.success) {
          return { success: false, error: moveRes.error };
        }
      }
    }

    // 2. Save invoice
    const all = getStorage<Invoice[]>('invoices', INITIAL_INVOICES);
    all.unshift(invoice);
    setStorage('invoices', all);

    // 3. Update customer total spent
    if (invoice.customerId) {
      const customers = getStorage<Customer[]>('customers', INITIAL_CUSTOMERS);
      const cIdx = customers.findIndex(c => c.id === invoice.customerId && c.tenantId === invoice.tenantId);
      if (cIdx >= 0) {
        customers[cIdx].totalSpentLKR += invoice.paidAmountLKR;
        customers[cIdx].visitsCount += 1;
        customers[cIdx].lastVisitAt = new Date().toISOString();
        setStorage('customers', customers);
      }
    }

    // 4. Update appointment status if attached
    if (invoice.appointmentId) {
      const appointments = getStorage<Appointment[]>('appointments', INITIAL_APPOINTMENTS);
      const aIdx = appointments.findIndex(a => a.id === invoice.appointmentId && a.tenantId === invoice.tenantId);
      if (aIdx >= 0) {
        appointments[aIdx].status = 'completed';
        appointments[aIdx].paymentStatus = 'paid';
        appointments[aIdx].invoiceId = invoice.id;
        setStorage('appointments', appointments);
      }
    }

    // 5. Automatically record staff commissions!
    const staffList = this.getStaff(invoice.tenantId);
    const commissions = getStorage<StaffCommissionRecord[]>('commissions', INITIAL_COMMISSIONS);

    for (const item of invoice.items) {
      if (item.staffId) {
        const staffMember = staffList.find(s => s.id === item.staffId);
        const rate = item.type === 'service' 
          ? (staffMember?.defaultServiceCommission || 15) 
          : (staffMember?.defaultProductCommission || 10);
        
        const commAmt = Math.round((item.totalLKR * rate) / 100);

        const commRecord: StaffCommissionRecord = {
          id: `com_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          tenantId: invoice.tenantId,
          staffId: item.staffId,
          staffName: item.staffName || staffMember?.name || 'Staff',
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          itemType: item.type,
          itemName: item.name,
          itemAmountLKR: item.totalLKR,
          commissionPercentage: rate,
          commissionAmountLKR: commAmt,
          status: 'unpaid',
          createdAt: new Date().toISOString()
        };
        commissions.unshift(commRecord);
      }
    }
    setStorage('commissions', commissions);

    // Audit log
    this.logAudit({
      tenantId: invoice.tenantId,
      actorEmail: invoice.createdBy || 'Staff',
      actorRole: 'receptionist',
      action: 'SETTLE_INVOICE',
      entity: 'invoice',
      entityId: invoice.id,
      details: `Generated Invoice ${invoice.invoiceNumber} for Rs. ${invoice.totalLKR.toLocaleString('en-US')} (${invoice.paymentMethod})`
    });

    return { success: true };
  }

  // ==========================================
  // EXPENSES (Tenant-Isolated)
  // ==========================================
  static getExpenseCategories(tenantId: string): ExpenseCategory[] {
    const all = getStorage<ExpenseCategory[]>('expense_categories', INITIAL_EXPENSE_CATEGORIES);
    return all.filter(c => c.tenantId === tenantId);
  }

  static getExpenses(tenantId: string): Expense[] {
    const all = getStorage<Expense[]>('expenses', INITIAL_EXPENSES);
    return all.filter(e => e.tenantId === tenantId);
  }

  static saveExpense(expense: Expense): void {
    const all = getStorage<Expense[]>('expenses', INITIAL_EXPENSES);
    const idx = all.findIndex(e => e.id === expense.id && e.tenantId === expense.tenantId);
    if (idx >= 0) all[idx] = expense;
    else all.unshift(expense);
    setStorage('expenses', all);

    this.logAudit({
      tenantId: expense.tenantId,
      actorEmail: 'Owner',
      actorRole: 'owner',
      action: 'RECORD_EXPENSE',
      entity: 'expense',
      entityId: expense.id,
      details: `Recorded expense of Rs. ${expense.amountLKR.toLocaleString('en-US')} for ${expense.description}`
    });
  }

  static deleteExpense(tenantId: string, expenseId: string): void {
    const all = getStorage<Expense[]>('expenses', INITIAL_EXPENSES);
    const filtered = all.filter(e => !(e.id === expenseId && e.tenantId === tenantId));
    setStorage('expenses', filtered);
  }

  // ==========================================
  // COMMISSIONS (Tenant-Isolated)
  // ==========================================
  static getCommissions(tenantId: string): StaffCommissionRecord[] {
    const all = getStorage<StaffCommissionRecord[]>('commissions', INITIAL_COMMISSIONS);
    return all.filter(c => c.tenantId === tenantId);
  }

  static markCommissionPaid(commissionId: string, tenantId: string): void {
    const all = getStorage<StaffCommissionRecord[]>('commissions', INITIAL_COMMISSIONS);
    const idx = all.findIndex(c => c.id === commissionId && c.tenantId === tenantId);
    if (idx >= 0) {
      all[idx].status = 'paid';
      all[idx].paidAt = new Date().toISOString();
      setStorage('commissions', all);
    }
  }

  // ==========================================
  // MANUAL BANK PAYMENTS (Super Admin Review)
  // ==========================================
  static getManualPayments(tenantId?: string): ManualPaymentRequest[] {
    const all = getStorage<ManualPaymentRequest[]>('manual_payments', INITIAL_MANUAL_PAYMENTS);
    if (!tenantId || tenantId === 'superadmin') return all;
    return all.filter(p => p.tenantId === tenantId);
  }

  static submitManualPayment(req: ManualPaymentRequest): void {
    const all = getStorage<ManualPaymentRequest[]>('manual_payments', INITIAL_MANUAL_PAYMENTS);
    all.unshift(req);
    setStorage('manual_payments', all);

    // Notify Super Admin
    this.createNotification({
      tenantId: 'superadmin',
      title: 'New Bank Slip Awaiting Approval',
      message: `${req.salonName} submitted slip ${req.bankReference} for Rs. ${req.amountLKR.toLocaleString('en-US')}.`,
      type: 'payment'
    });
  }

  static reviewPayment(
    paymentId: string, 
    action: 'approved' | 'rejected', 
    reviewerEmail: string, 
    rejectionReason?: string
  ): void {
    const all = getStorage<ManualPaymentRequest[]>('manual_payments', INITIAL_MANUAL_PAYMENTS);
    const idx = all.findIndex(p => p.id === paymentId);
    if (idx < 0) return;

    const payment = all[idx];
    if (payment.status !== 'pending') return;
    if (action === 'rejected' && !rejectionReason?.trim()) return;
    payment.status = action;
    payment.reviewedBy = reviewerEmail;
    payment.reviewedAt = new Date().toISOString();
    if (rejectionReason) payment.rejectionReason = rejectionReason;
    all[idx] = payment;
    setStorage('manual_payments', all);

    // If approved, activate or extend tenant subscription!
    if (action === 'approved') {
      const tenants = this.getTenants();
      const tIdx = tenants.findIndex(t => t.id === payment.tenantId);
      if (tIdx >= 0) {
        const tenant = tenants[tIdx];
        const now = new Date();
        const durationMonths = payment.billingCycle === 'yearly' ? 12 : 1;
        const endDate = new Date(now.setMonth(now.getMonth() + durationMonths));

        tenant.subscription = {
          planId: payment.planId,
          status: 'active',
          billingCycle: payment.billingCycle,
          startDate: new Date().toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          trialEndsAt: '',
          autoRenew: true
        };
        tenants[tIdx] = tenant;
        setStorage('tenants', tenants);

        // Notify tenant
        this.createNotification({
          tenantId: tenant.id,
          title: '🎉 Subscription Activated!',
          message: `Your payment of Rs. ${payment.amountLKR.toLocaleString('en-US')} for ${payment.planName} was approved. Enjoy full access!`,
          type: 'subscription'
        });
      }
    } else {
      // Rejection notification
      this.createNotification({
        tenantId: payment.tenantId,
        title: 'Payment Slip Rejected',
        message: `Your payment review for ${payment.planName} was declined: ${rejectionReason || 'Invalid slip'}. Please re-submit.`,
        type: 'subscription'
      });
    }

    this.logAudit({
      actorEmail: reviewerEmail,
      actorRole: 'superadmin',
      action: action === 'approved' ? 'APPROVE_PAYMENT' : 'REJECT_PAYMENT',
      entity: 'payment_receipt',
      entityId: paymentId,
      details: `${action.toUpperCase()} payment for ${payment.salonName} (Rs. ${payment.amountLKR.toLocaleString('en-US')})`
    });
  }

  // ==========================================
  // SUPPORT TICKETS
  // ==========================================
  static getSupportTickets(tenantId?: string): SupportTicket[] {
    const all = getStorage<SupportTicket[]>('support_tickets', INITIAL_SUPPORT_TICKETS);
    if (!tenantId || tenantId === 'superadmin') return all;
    return all.filter(t => t.tenantId === tenantId);
  }

  static createSupportTicket(ticket: SupportTicket): void {
    const all = getStorage<SupportTicket[]>('support_tickets', INITIAL_SUPPORT_TICKETS);
    all.unshift(ticket);
    setStorage('support_tickets', all);

    this.createNotification({
      tenantId: 'superadmin',
      title: 'New Support Ticket Created',
      message: `[${ticket.priority.toUpperCase()}] ${ticket.salonName}: ${ticket.subject}`,
      type: 'support'
    });
  }

  static replySupportTicket(
    ticketId: string, 
    senderEmail: string, 
    senderRole: 'tenant' | 'support', 
    senderName: string, 
    content: string
  ): void {
    const all = getStorage<SupportTicket[]>('support_tickets', INITIAL_SUPPORT_TICKETS);
    const idx = all.findIndex(t => t.id === ticketId);
    if (idx >= 0) {
      all[idx].messages.push({
        id: `msg_${Date.now()}`,
        senderEmail,
        senderRole,
        senderName,
        content,
        createdAt: new Date().toISOString()
      });
      all[idx].updatedAt = new Date().toISOString();
      if (senderRole === 'support') {
        all[idx].status = 'waiting_for_customer';
      } else {
        all[idx].status = 'in_progress';
      }
      setStorage('support_tickets', all);
    }
  }

  static updateTicketStatus(
    ticketId: string, 
    status: SupportTicket['status'],
    actorEmail?: string
  ): void {
    const all = getStorage<SupportTicket[]>('support_tickets', INITIAL_SUPPORT_TICKETS);
    const idx = all.findIndex(t => t.id === ticketId);
    if (idx >= 0) {
      all[idx].status = status;
      all[idx].updatedAt = new Date().toISOString();
      setStorage('support_tickets', all);

      if (actorEmail) {
        this.logAudit({
          actorEmail,
          actorRole: 'superadmin',
          action: 'UPDATE_TICKET_STATUS',
          entity: 'support_ticket',
          entityId: ticketId,
          details: `Updated support ticket status to ${status.toUpperCase()}`
        });
      }
    }
  }

  // ==========================================
  // ANNOUNCEMENTS
  // ==========================================
  static getAnnouncements(): Announcement[] {
    return getStorage<Announcement[]>('announcements', INITIAL_ANNOUNCEMENTS).filter(a => a.isActive);
  }

  static createAnnouncement(announcement: Announcement): void {
    const all = getStorage<Announcement[]>('announcements', INITIAL_ANNOUNCEMENTS);
    all.unshift(announcement);
    setStorage('announcements', all);
  }

  // ==========================================
  // NOTIFICATIONS
  // ==========================================
  static getNotifications(tenantId: string): NotificationItem[] {
    const all = getStorage<NotificationItem[]>('notifications', INITIAL_NOTIFICATIONS);
    return all.filter(n => n.tenantId === tenantId || (tenantId === 'superadmin' && n.tenantId === 'superadmin'));
  }

  static createNotification(params: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>): void {
    const all = getStorage<NotificationItem[]>('notifications', INITIAL_NOTIFICATIONS);
    const notif: NotificationItem = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      ...params,
      read: false,
      createdAt: new Date().toISOString()
    };
    all.unshift(notif);
    setStorage('notifications', all.slice(0, 100));
  }

  static markAllNotificationsRead(tenantId: string): void {
    const all = getStorage<NotificationItem[]>('notifications', INITIAL_NOTIFICATIONS);
    for (const n of all) {
      if (n.tenantId === tenantId || (tenantId === 'superadmin' && n.tenantId === 'superadmin')) {
        n.read = true;
      }
    }
    setStorage('notifications', all);
  }
}

// Auto-initialize when file is imported
StorageService.init();

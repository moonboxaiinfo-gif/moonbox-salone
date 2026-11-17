import { useCallback, useEffect, useRef, useState } from 'react';
import { Appointment, Customer, Expense, ExpenseCategory, Invoice, Product, ProductCategory, Service, ServiceCategory, Staff, StaffCommissionRecord, StockMovement } from '../types';
import { StorageService, TenantDataSnapshot, isLocalDemoMode } from './storageService';
import { createSupabaseRepository } from './supabaseRepository';
import { supabase } from './supabaseClient';

export interface AsyncDataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

type Loader<T> = (tenantId: string, signal: AbortSignal) => Promise<T>;

interface CacheEntry<T> {
  sessionVersion: number;
  data: T;
}

export interface TenantCatalog {
  services: Service[];
  categories: ServiceCategory[];
}

export interface TenantCustomerHistory {
  appointments: Appointment[];
  invoices: Invoice[];
}

const tenantCache = new Map<string, CacheEntry<unknown>>();
const invalidationListeners = new Set<(tenantId?: string, sessionChanged?: boolean) => void>();
let sessionVersion = 0;

function notifyInvalidation(tenantId?: string, sessionChanged = false): void {
  invalidationListeners.forEach(listener => listener(tenantId, sessionChanged));
}

// Supabase auth events invalidate both cached values and active consumers. A
// hook captures the version at request start, so an old-session response can
// never be written into the new session's cache or component state.
if (supabase) {
  supabase.auth.onAuthStateChange(() => {
    sessionVersion += 1;
    tenantCache.clear();
    notifyInvalidation(undefined, true);
  });
}

export function clearAsyncDataCache(): void {
  sessionVersion += 1;
  tenantCache.clear();
  notifyInvalidation(undefined, true);
}

export function invalidateTenantData(tenantId?: string): void {
  if (!tenantId) {
    tenantCache.clear();
  } else {
    for (const key of tenantCache.keys()) {
      if (key.startsWith(`${tenantId}:`)) tenantCache.delete(key);
    }
  }
  notifyInvalidation(tenantId);
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/**
 * Generic async tenant resource hook. It provides repository request
 * cancellation, stale response suppression, observable invalidation, retry,
 * and a tenant/resource cache bound to the active auth-session generation.
 */
export function useTenantResource<T>(
  tenantId: string | undefined,
  resource: string,
  loader: Loader<T>,
  options: { enabled?: boolean; initialData?: T | null } = {},
): AsyncDataState<T> {
  const enabled = options.enabled ?? true;
  const currentResourceKey = tenantId ? `${tenantId}:${resource}` : '';
  const [attempt, setAttempt] = useState(0);
  const [invalidationVersion, setInvalidationVersion] = useState(0);
  const [stateResourceKey, setStateResourceKey] = useState(currentResourceKey);
  const [state, setState] = useState<AsyncDataState<T>>({
    data: options.initialData ?? null,
    loading: Boolean(tenantId && enabled),
    error: null,
    retry: () => setAttempt(value => value + 1),
  });
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const retry = useCallback(() => setAttempt(value => value + 1), []);

  useEffect(() => {
    const listener = (invalidatedTenantId?: string, sessionChanged = false) => {
      if (!invalidatedTenantId || invalidatedTenantId === tenantId) {
        if (sessionChanged) {
          setState({ data: options.initialData ?? null, loading: Boolean(tenantId && enabled), error: null, retry });
        }
        setInvalidationVersion(value => value + 1);
      }
    };
    invalidationListeners.add(listener);
    return () => { invalidationListeners.delete(listener); };
  }, [tenantId, enabled, options.initialData, retry]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const requestSessionVersion = sessionVersion;
    const cacheKey = tenantId ? `${tenantId}:${resource}` : '';
    setStateResourceKey(cacheKey);

    if (!tenantId || !enabled) {
      setState({ data: options.initialData ?? null, loading: false, error: null, retry });
      return () => {
        active = false;
        controller.abort();
      };
    }

    const cached = tenantCache.get(cacheKey);
    if (cached?.sessionVersion === requestSessionVersion) {
      setState({ data: cached.data as T, loading: false, error: null, retry });
      return () => {
        active = false;
        controller.abort();
      };
    }

    setState({ data: null, loading: true, error: null, retry });
    loaderRef.current(tenantId, controller.signal)
      .then(data => {
        if (!active || controller.signal.aborted || requestSessionVersion !== sessionVersion) return;
        tenantCache.set(cacheKey, { sessionVersion: requestSessionVersion, data });
        setState({ data, loading: false, error: null, retry });
      })
      .catch(error => {
        if (!active || controller.signal.aborted || requestSessionVersion !== sessionVersion) return;
        setState({ data: null, loading: false, error: errorMessage(error, `Could not load ${resource}.`), retry });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [tenantId, resource, enabled, attempt, retry, options.initialData, invalidationVersion]);

  if (stateResourceKey !== currentResourceKey) {
    return {
      data: options.initialData ?? null,
      loading: Boolean(tenantId && enabled),
      error: null,
      retry,
    };
  }
  return state;
}

async function loadTenantSnapshot(tenantId: string): Promise<TenantDataSnapshot> {
  if (isLocalDemoMode) return StorageService.loadTenantData(tenantId);
  const repository = createSupabaseRepository();
  if (!repository) throw new Error('Supabase is not configured. Configure the browser-safe Supabase environment variables.');
  return repository.tenantDataSnapshot(tenantId);
}

async function loadCustomers(tenantId: string, signal: AbortSignal): Promise<Customer[]> {
  if (isLocalDemoMode) return StorageService.getCustomers(tenantId);
  const repository = createSupabaseRepository();
  if (!repository) throw new Error('Supabase is not configured. Customer data cannot be loaded.');
  return repository.customers(tenantId, signal);
}

async function loadCatalog(tenantId: string, signal: AbortSignal): Promise<TenantCatalog> {
  if (isLocalDemoMode) return { services: StorageService.getServices(tenantId), categories: StorageService.getCategories(tenantId) };
  const repository = createSupabaseRepository();
  if (!repository) throw new Error('Supabase is not configured. Service data cannot be loaded.');
  const [services, categories] = await Promise.all([
    repository.services(tenantId, signal),
    repository.serviceCategories(tenantId, signal),
  ]);
  return { services, categories };
}

async function loadStaff(tenantId: string, signal: AbortSignal): Promise<Staff[]> {
  if (isLocalDemoMode) return StorageService.getStaff(tenantId);
  const repository = createSupabaseRepository();
  if (!repository) throw new Error('Supabase is not configured. Staff data cannot be loaded.');
  return repository.staff(tenantId, signal);
}

async function loadAppointments(tenantId: string, signal: AbortSignal): Promise<Appointment[]> {
  if (isLocalDemoMode) return StorageService.getAppointments(tenantId);
  const repository = createSupabaseRepository();
  if (!repository) throw new Error('Supabase is not configured. Appointment data cannot be loaded.');
  return repository.appointments(tenantId, signal);
}

async function loadInvoices(tenantId: string, signal: AbortSignal): Promise<Invoice[]> {
  if (isLocalDemoMode) return StorageService.getInvoices(tenantId);
  const repository = createSupabaseRepository();
  if (!repository) throw new Error('Supabase is not configured. Invoice data cannot be loaded.');
  return repository.invoices(tenantId, signal);
}

async function loadCustomerHistory(tenantId: string, signal: AbortSignal): Promise<TenantCustomerHistory> {
  if (isLocalDemoMode) return { appointments: StorageService.getAppointments(tenantId), invoices: StorageService.getInvoices(tenantId) };
  const repository = createSupabaseRepository();
  if (!repository) throw new Error('Supabase is not configured. Customer history cannot be loaded.');
  const [appointments, invoices] = await Promise.all([
    repository.appointments(tenantId, signal),
    repository.invoices(tenantId, signal),
  ]);
  return { appointments, invoices };
}

async function loadProducts(tenantId: string, signal: AbortSignal): Promise<Product[]> {
  if (isLocalDemoMode) return StorageService.getProducts(tenantId);
  const repository = createSupabaseRepository();
  if (!repository) throw new Error('Supabase is not configured. Inventory cannot be loaded.');
  return repository.products(tenantId, signal);
}

async function loadStockMovements(tenantId: string, signal: AbortSignal): Promise<StockMovement[]> {
  if (isLocalDemoMode) return StorageService.getStockMovements(tenantId);
  const repository = createSupabaseRepository();
  if (!repository) throw new Error('Supabase is not configured. Stock history cannot be loaded.');
  return repository.stockMovements(tenantId, signal);
}

async function loadProductCategories(tenantId: string, signal: AbortSignal): Promise<ProductCategory[]> {
  if (isLocalDemoMode) return StorageService.getProductCategories(tenantId);
  const repository = createSupabaseRepository();
  if (!repository) throw new Error('Supabase is not configured. Product categories cannot be loaded.');
  return repository.productCategories(tenantId, signal);
}

async function loadExpenses(tenantId: string, signal: AbortSignal): Promise<Expense[]> {
  if (isLocalDemoMode) return StorageService.getExpenses(tenantId);
  const repository = createSupabaseRepository();
  if (!repository) throw new Error('Supabase is not configured. Expenses cannot be loaded.');
  return repository.expenses(tenantId, signal);
}

async function loadExpenseCategories(tenantId: string, signal: AbortSignal): Promise<ExpenseCategory[]> {
  if (isLocalDemoMode) return StorageService.getExpenseCategories(tenantId);
  const repository = createSupabaseRepository();
  if (!repository) throw new Error('Supabase is not configured. Expense categories cannot be loaded.');
  return repository.expenseCategories(tenantId, signal);
}

async function loadCommissions(tenantId: string, signal: AbortSignal): Promise<StaffCommissionRecord[]> {
  if (isLocalDemoMode) return StorageService.getCommissions(tenantId);
  const repository = createSupabaseRepository();
  if (!repository) throw new Error('Supabase is not configured. Commissions cannot be loaded.');
  return repository.commissions(tenantId, signal);
}

/** Shared snapshot used by dashboard/report consumers. */
export function useTenantData(tenantId: string | undefined): AsyncDataState<TenantDataSnapshot> {
  return useTenantResource(tenantId, 'tenant-snapshot', loadTenantSnapshot);
}

export function useTenantCustomers(tenantId: string | undefined, enabled = true): AsyncDataState<Customer[]> {
  return useTenantResource(tenantId, 'customers', loadCustomers, { enabled });
}

export function useTenantCatalog(tenantId: string | undefined, enabled = true): AsyncDataState<TenantCatalog> {
  return useTenantResource(tenantId, 'service-catalog', loadCatalog, { enabled });
}

export function useTenantStaff(tenantId: string | undefined, enabled = true): AsyncDataState<Staff[]> {
  return useTenantResource(tenantId, 'staff', loadStaff, { enabled });
}

export function useTenantAppointments(tenantId: string | undefined, enabled = true): AsyncDataState<Appointment[]> {
  return useTenantResource(tenantId, 'appointments', loadAppointments, { enabled });
}

export function useTenantInvoices(tenantId: string | undefined, enabled = true): AsyncDataState<Invoice[]> {
  return useTenantResource(tenantId, 'invoices', loadInvoices, { enabled });
}

export function useTenantCustomerHistory(tenantId: string | undefined, enabled = true): AsyncDataState<TenantCustomerHistory> {
  return useTenantResource(tenantId, 'customer-history', loadCustomerHistory, { enabled });
}

export function useTenantProducts(tenantId: string | undefined, enabled = true): AsyncDataState<Product[]> {
  return useTenantResource(tenantId, 'products', loadProducts, { enabled });
}

export function useTenantStockMovements(tenantId: string | undefined, enabled = true): AsyncDataState<StockMovement[]> {
  return useTenantResource(tenantId, 'stock-movements', loadStockMovements, { enabled });
}

export function useTenantProductCategories(tenantId: string | undefined, enabled = true): AsyncDataState<ProductCategory[]> {
  return useTenantResource(tenantId, 'product-categories', loadProductCategories, { enabled });
}

export function useTenantExpenses(tenantId: string | undefined, enabled = true): AsyncDataState<Expense[]> {
  return useTenantResource(tenantId, 'expenses', loadExpenses, { enabled });
}

export function useTenantExpenseCategories(tenantId: string | undefined, enabled = true): AsyncDataState<ExpenseCategory[]> {
  return useTenantResource(tenantId, 'expense-categories', loadExpenseCategories, { enabled });
}

export function useTenantCommissions(tenantId: string | undefined, enabled = true): AsyncDataState<StaffCommissionRecord[]> {
  return useTenantResource(tenantId, 'commissions', loadCommissions, { enabled });
}

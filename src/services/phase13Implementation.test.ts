import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');
const migration = read('supabase/migrations/20261116000000_phase13_pos_authoritative.sql');

describe('Phase 13 POS and tenant data source contracts', () => {
  it('requires server-side sell permission and serializes invoice-number retries', () => {
    expect(migration).toContain("public.has_salon_permission(p_salon_id, 'sell')");
    expect(migration).toContain("hashtextextended(p_salon_id::TEXT || ':pos:' || v_invoice_number, 0)");
    expect(migration).toContain('PERFORM pg_advisory_xact_lock(v_idempotency_lock)');
    expect(migration).toContain("jsonb_build_object('success', true, 'duplicate', true, 'invoice', to_jsonb(v_existing))");
  });

  it('derives POS prices and amounts from tenant-owned rows, not client totals', () => {
    expect(migration).toContain('v_price := v_service.price_lkr');
    expect(migration).toContain('v_price := v_product.selling_price_lkr');
    expect(migration).toContain('v_line_subtotal := round(v_price * v_quantity, 2)');
    expect(migration).toContain('v_discount := v_discount + v_line_discount');
    expect(migration).toContain("public.has_salon_permission(p_salon_id, 'manage_finance')");
    expect(migration).toContain("v_total := greatest(v_subtotal - v_discount, 0) + v_tax + v_tip");
    expect(migration).not.toMatch(/p_invoice\s*->>\s*'(?:unitPriceLKR|subtotalLKR|discountLKR|taxLKR|totalLKR|paidAmountLKR|balanceLKR)'/);
    expect(migration).toContain('v_product.stock_quantity < v_stock.required_quantity');
    expect(migration).toContain('v_total > 9999999999.99');
    expect(migration).toContain('ALTER COLUMN commission_amount_lkr TYPE NUMERIC(12,2)');
    expect(migration).toContain('REVOKE INSERT, UPDATE, DELETE ON TABLE public.invoices FROM authenticated');
  });

  it('uses the Supabase-compatible pgcrypto UUID generator instead of uuid-ossp', () => {
    const initialSchema = read('supabase/migrations/20261013000000_initial_schema.sql');
    const affectedFiles = [
      'supabase/migrations/20261013000000_initial_schema.sql',
      'supabase/migrations/20261028000000_website_portfolio_builder.sql',
      'supabase/migrations/20261109000001_landing_page_cms.sql',
      'supabase/migrations/20261111000000_appointment_operations_hardening.sql',
      'supabase/migrations/20261113000001_pos_atomic_rpc.sql',
    ];

    expect(initialSchema).toContain('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
    expect(initialSchema).toContain('gen_random_uuid()');
    for (const file of affectedFiles) {
      expect(read(file)).not.toContain('uuid_generate_v4()');
      expect(read(file)).not.toContain('uuid-ossp');
      expect(read(file)).toContain('gen_random_uuid()');
    }
  });

  it('checks tenant ownership for linked customer, service, product, and staff rows', () => {
    expect(migration).toContain('WHERE id = v_customer_id AND salon_id = p_salon_id');
    expect(migration).toContain('WHERE id = v_item_id AND salon_id = p_salon_id AND is_active = TRUE');
    expect(migration).toContain('WHERE id = v_item_id AND salon_id = p_salon_id AND status = \'active\'');
    expect(migration).toContain('WHERE id = v_staff_id AND salon_id = p_salon_id AND status = \'active\'');
    expect(migration).toContain('v_staff_id = ANY(v_service.assigned_staff_ids)');
  });

  it('keeps payment-review MFA and writes the UUID actor to reviewed_by', () => {
    expect(migration).toContain("coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2'");
    expect(migration).toContain('reviewed_by = auth.uid()');
    expect(migration).not.toMatch(/reviewed_by\s*=\s*auth\.jwt\(\)\s*->>\s*'email'/);
  });

  it('limits membership administration to owners and removes the manager-capable legacy policy', () => {
    expect(migration).toContain('DROP POLICY IF EXISTS "Salon owners can manage members"');
    expect(migration).toContain('DROP POLICY IF EXISTS "Only salon owners manage memberships"');
    expect(migration).toContain('public.is_salon_owner(salon_id)');
    expect(migration).toContain("role IN ('owner', 'manager', 'receptionist', 'staff')");
  });

  it('uses async resources rather than synchronous storage getters in the migrated screens', () => {
    const inventory = read('src/components/inventory/InventoryList.tsx');
    const pos = read('src/components/pos/POSRegister.tsx');
    const expenses = read('src/components/expenses/ExpenseList.tsx');
    const commissions = read('src/components/commissions/CommissionList.tsx');
    const settings = read('src/components/settings/SalonSettings.tsx');
    const bookingSettings = read('src/components/settings/OnlineBookingManager.tsx');
    const storage = read('src/services/storageService.ts');
    const data = read('src/services/asyncDataService.ts');

    expect(inventory).toContain('useTenantProducts');
    expect(inventory).toContain('useTenantStockMovements');
    expect(pos).toContain('useTenantProducts');
    expect(pos).toContain('disabled={!canApplyDiscount}');
    expect(expenses).toContain('useTenantExpenses');
    expect(expenses).toContain('useTenantExpenseCategories');
    expect(commissions).toContain('useTenantCommissions');
    expect(settings).toContain('StorageService.updateTenantConfirmed(updated)');
    expect(bookingSettings).toContain('StorageService.updateTenantConfirmed({');
    expect(storage).toContain('static async updateTenantConfirmed');
    expect(storage).toContain('this.requireProductionRepository().updateTenant(tenant)');
    expect(data).toContain('controller.abort()');
    expect(data).toContain('requestSessionVersion !== sessionVersion');
    expect(data).toContain('export function invalidateTenantData');
    expect(inventory).not.toContain('StorageService.getProducts(');
    expect(pos).not.toContain('StorageService.getProducts(');
    expect(expenses).not.toContain('StorageService.getExpenses(');
    expect(commissions).not.toContain('StorageService.getCommissions(');
  });
});

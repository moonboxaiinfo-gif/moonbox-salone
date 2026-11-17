# Phase 14 Implementation Report

**Status:** Partial asynchronous migration. The Phase 12 shared architecture was extended; not every business module is migrated.

## Implemented

`src/services/asyncDataService.ts` now exports resources for products, stock movements, product categories, expenses, expense categories, and commissions. Production loaders use `SupabaseRepository`, require Supabase configuration, pass AbortSignals to PostgREST queries, and reuse the existing `useTenantResource` session-version, cancellation, stale-response suppression, retry, and invalidation behavior. Demo fixtures remain behind `isLocalDemoMode`.

The repository list methods now accept optional abort signals for these resources. `InventoryList`, POS product selection, `ExpenseList`/`ExpenseModal`, and `CommissionList` use the async resources rather than synchronous business getters. The resource consumers distinguish loading and failure from an empty result and expose retry controls. Successful mutations invalidate the tenant resources for post-write reconciliation.

The product editor no longer writes stock quantity through ordinary product upsert. New product stock is initialized to zero, then adjusted through the atomic stock-movement RPC using the server-returned product ID. Existing stock is edited only through a movement. This also avoids double-counting opening stock and avoids sending a placeholder ID to the database.

Salon profile/settings and online-booking settings now use a confirmed asynchronous StorageService wrapper backed by `SupabaseRepository.updateTenant()` outside explicit local demo mode. The forms await the result, prevent duplicate saves, preserve entered values on errors, and show an error instead of the previous unconditional “saved” message.

## Not complete

Support ticket list, subscriptions/payment requests, announcements, platform settings, tenant settings, some Super Admin screens, Website Builder, Landing CMS, audit operations, and other legacy consumers still require migration. This pass does not remove all synchronous StorageService APIs or all memory-only production cache behavior. The POS RPC is hardened in an additive migration but was not run against PostgreSQL. Expense receipt uploads remain browser object URLs and are not durable/private storage. No mounted browser lifecycle tests were added.

**Verification:** lint and unit results are in `PHASE16_TEST_RESULTS.md`; these are local checks only.

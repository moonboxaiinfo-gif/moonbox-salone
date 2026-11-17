# Moonbox Salon — Phase 6 Complete Supabase Architecture Report

**Assessment date:** 2026-11-13  
**Repository:** `moonbox-salon-preview`  
**Execution restrictions honored:** no live Supabase SQL, no Netlify deployment, no service-role credentials exposed, and no previously applied migration modified.

## Executive status

Phase 6 is **not marked complete**. This pass extends the asynchronous Supabase architecture across the remaining high-risk financial, support, notification, inventory, appointment, customer, and POS write flows. All local checks pass, and the fire-and-forget production queue remains removed. However, many existing components still synchronously read the StorageService reconciliation cache, and a small number of legacy business writes remain in public booking, announcement management, and related flows. Those exact blockers are documented below.

## 1. Modified files

### Phase 6 implementation

- `src/services/supabaseRepository.ts`
  - Added expense-category reads and writes.
  - Added commission settlement.
  - Added Super Admin manual-payment listing.
  - Added support-ticket status update.
  - Retained and exposed existing trusted payment, support-message, notification-read, expense, and manual-payment methods.
- `src/services/storageService.ts`
  - Added confirmed async APIs for expenses, expense deletion, commission settlement, manual-payment submission/review, support-ticket creation/replies/status, and notification read state.
  - Reconciles local cache only after successful remote operations.
- `src/components/support/SupportTicketsList.tsx`
  - Ticket creation, replies, and status changes now await confirmed operations.
- `src/components/subscription/BankTransferModal.tsx`
  - Manual payment submission now awaits database confirmation before success state.
- `src/components/superadmin/PaymentApprovals.tsx`
  - Approval/rejection now uses the AAL2-gated trusted RPC path.
- `src/components/commissions/CommissionList.tsx`
  - Commission settlement now awaits confirmed database mutation.
- `src/components/expenses/ExpenseModal.tsx`
  - Expense creation/update now awaits confirmed database write.
- `src/components/expenses/ExpenseList.tsx`
  - Expense deletion now awaits confirmed database deletion.
- `src/context/NotificationContext.tsx`
  - Notification read-state mutation now awaits the trusted repository RPC.

### Carried forward Phase 5 implementation

- `src/services/storageService.ts`
- `src/components/customers/CustomerModal.tsx`
- `src/components/services/ServiceModal.tsx`
- `src/components/staff/StaffModal.tsx`
- `src/components/inventory/ProductModal.tsx`
- `src/components/inventory/StockMovementModal.tsx`
- `src/components/appointments/AppointmentModal.tsx`
- `src/components/appointments/AppointmentCalendar.tsx`
- `src/components/pos/POSRegister.tsx`
- `src/services/phase5StorageMigration.test.ts`
- `PHASE5_STORAGE_SERVICE_MIGRATION_REPORT.md`

No new SQL migration was required in this pass; the additive Phase 4 transaction migration remains unchanged.

## 2. Migrated components and workflows

The following workflows now await Supabase/repository confirmation and preserve form state on failure:

- Customer create/update in the main customer modal and POS customer creation.
- Service create/update and service deletion API availability.
- Staff create/update.
- Appointment create/update and calendar status transitions.
- Product create/update and initial stock movement.
- Atomic stock adjustments with post-write product/movement reconciliation.
- POS invoice creation with post-write refresh of invoices, customers, appointments, commissions, products, and movements.
- Expense create/update/delete.
- Commission settlement.
- Manual payment submission.
- Manual payment approval/rejection through the server-side AAL2-gated RPC.
- Support ticket creation, replies, and status transitions.
- Notification read-state updates.

The UI retains existing layouts and workflows. Existing error state or alert behavior is used to prevent false success and preserve entered data where the component already has an error surface.

## 3. Completed repository methods

`SupabaseRepository` now provides or exposes the following relevant methods:

- `upsertCustomer`, `upsertService`, `deleteById`, `upsertStaff`
- `upsertAppointment`, `updateAppointmentStatus`
- `upsertProduct`, `recordStockMovementAtomic`
- `createInvoiceAtomically`
- `expenses`, `saveExpense`, `deleteExpense`
- `expenseCategories`, `saveExpenseCategory`
- `commissions`, `markCommissionPaid`
- `manualPayments`, `allManualPayments`, `saveManualPayment`, `reviewManualPayment`
- `supportTickets`, `saveSupportTicket`, `appendSupportTicketMessage`, `updateSupportTicketStatus`
- `markNotificationsRead`
- Existing website, landing-page, review, registration, public-booking, and trial-management repository/RPC methods

Server-side authorization remains authoritative. Repository tenant checks use authenticated Supabase membership; payment review uses the trusted RPC with Super Admin AAL2 verification.

## 4. Remaining synchronous business reads

The React application still contains synchronous StorageService reads in many components. Notable groups include:

- Dashboard, reports, invoices, customers, staff, services, inventory, POS, appointments, expenses, commissions, and customer profile views.
- Support ticket list rendering and post-write readback.
- Super Admin tenants, payments, tickets, audit logs, plans, announcements, and salon management.
- Subscription and public landing pages.
- Public salon/portfolio/booking pages where remote website data is not already available.
- Website workspace, theme, services, and renderer fallbacks.
- Auth/Tenant contexts and entitlement calculations.

These currently read the in-memory reconciliation cache synchronously. The cache is populated from Supabase in production, but this does not yet satisfy the stricter requirement that every component use an async, session-aware data access layer with explicit loading/error/retry state.

## 5. Remaining synchronous business writes

The following legacy writes remain and are production blockers:

- `src/components/public/PublicBookingPage.tsx`
  - Legacy customer save and appointment save branches remain alongside the secure public booking path.
  - Local notification creation remains.
- `src/components/public/PublicBookingFlow.tsx`
  - Explicit demo-mode customer/appointment writes remain by design, but notification creation is still local-cache based.
- `src/components/superadmin/AnnouncementsManager.tsx`
  - `createAnnouncement` still uses the legacy synchronous StorageService path.
- `src/context/AuthContext.tsx`
  - Demo/auth fallback tenant/user/audit operations remain synchronous and must be isolated more strictly from production session flows.
- `src/services/landingPageService.ts` and `src/services/websiteService.ts`
  - Platform content/revision and website fallback writes still use synchronous cache APIs in some paths.
- `src/context/TenantContext.tsx` and website settings components
  - Tenant settings updates remain on legacy synchronous paths.

The unsafe `queueProductionWrite()` and `void task().catch(...)` architecture is absent. The remaining issue is synchronous local-cache mutation, not an unobserved remote queue.

## 6. LocalStorage dependency inventory

### Business-content or business-cache dependencies still requiring removal

- `src/services/storageService.ts`: internal memory/localStorage adapter for demo fixtures and production reconciliation cache.
- `src/services/websiteService.ts`: website configuration/draft fallback and public-submission history.
- `src/services/landingPageService.ts`: platform draft/published/revision cache path.
- `src/context/AuthContext.tsx`: browser session user ID convenience storage. It must never be used as authorization; Supabase session/profile/membership must remain authoritative.

### Legitimate device preferences

- `src/context/ThemeContext.tsx`: theme preference.
- `src/components/invoices/InvoiceViewModal.tsx`: receipt display width preference.
- `src/components/common/ErrorBoundary.tsx`: theme preservation during UI recovery.

These preference uses are not business records and may remain local.

## 7. Security improvements

- Removed fire-and-forget production persistence.
- Confirmed write APIs require a configured production Supabase repository.
- Cache reconciliation happens only after remote success for migrated operations.
- Tenant-scoped repository methods validate active membership before access.
- Inventory movement uses the atomic, row-locking Phase 4 RPC and prevents negative stock.
- POS uses an atomic invoice RPC and refreshes all related records after confirmation.
- Payment approval/rejection uses the server-side MFA AAL2-gated RPC; client role strings are not authorization.
- Support message and status mutations are routed through repository operations.
- Notification read state is recipient-scoped through the trusted RPC.
- No service-role credential is shipped to browser code.

## 8. Test results

Final local verification:

```text
npm run lint
  passed

npm test -- --run
  8 test files passed
  38 tests passed

npm run build
  passed
  Vite emitted the existing large-chunk warning (>500 kB)
```

There were no failed tests in the final run. Existing tests include repository CRUD behavior, domain mapping, admin/trial logic, environment/security checks, landing-page behavior, Phase 4 migration contract checks, and Phase 5 unsafe-queue guardrails.

## 9. Test coverage limitations

The current test suite does not yet provide live staging verification for:

- Cross-tenant reads and writes under real RLS sessions.
- Revoked membership and account switching.
- Session expiry during an in-flight write.
- Concurrent stock movement transactions.
- Duplicate payment review at the database level.
- Network timeouts and retry behavior.
- Multi-session website publishing consistency.
- Actual Supabase notification recipient isolation.

Static contract tests must not be treated as a substitute for those staging tests.

## 10. Remaining SQL migrations

No new Phase 6 SQL migration was added. The existing additive migration remains:

- `supabase/migrations/20261113000002_phase4_business_transactions.sql`

It provides recipient-specific notifications, permission checks, atomic inventory movement, AAL2-gated payment review, support message append, notification read state, and support status compatibility.

Before staging application, review migration ordering and validate any existing policy/constraint naming conflicts in the target staging project.

## 11. Staging requirements

Use a disposable Supabase staging project and test with real authenticated users representing owner, manager, receptionist, staff, Super Admin AAL1, and Super Admin AAL2. Verify salon A cannot access salon B; revoked members lose access immediately; account switching clears all tenant-scoped cache; payment review is impossible without AAL2; duplicate submissions are idempotent; concurrent inventory operations cannot produce negative balances; support and notifications are recipient-scoped; and published website/landing data is consistent across authenticated and anonymous sessions.

Also test offline/timeout behavior, retry behavior for idempotent reads, no retry for non-idempotent writes without idempotency keys, and UI loading/error/empty states for every migrated component.

## 12. Exact production blockers

1. Replace synchronous StorageService reads with a shared async, session-aware data layer and migrate all affected components to loading/error/retry states.
2. Migrate public booking legacy branches so production always uses the secure public-booking RPC; retain direct local writes only under explicit demo mode.
3. Migrate announcements, tenant settings, landing-page documents/revisions, website configuration, and audit writes to awaited repository/RPC methods.
4. Remove production business-content localStorage fallback from `websiteService` and platform content services.
5. Add idempotency keys and duplicate-submission protection for customer creation, payments, support requests, stock movements, and remaining financial writes.
6. Add live staging tests for RLS, revoked membership, account switching, session expiry, concurrent transactions, duplicate payments, and cache reconciliation.
7. Complete UI-level pending/disabled/retry states for all remaining migrated and unmigrated business forms.

## Conclusion

Phase 6 materially advances the asynchronous Supabase architecture and completes confirmed write paths for the main operational and financial workflows. It is not production-complete under the supplied criteria because synchronous business reads and several legacy business writes still exist. No claim of full migration or live database security verification is made until the blockers above are resolved in staging.

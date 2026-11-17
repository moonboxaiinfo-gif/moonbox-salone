# Moonbox Salon — Phase 5 StorageService Migration Report

**Assessment date:** 2026-11-13  
**Repository:** `moonbox-salon-preview`  
**Scope:** Continue from Phases 1–4; no live SQL execution and no deployment performed.

## Completion status

**Phase 5 is not fully complete.** This pass removes the unsafe production write queue and migrates the highest-risk operational write paths to confirmed asynchronous APIs. The repository passes local type checking, automated tests, and production build. However, synchronous legacy business reads/writes remain in several modules, so the completion criteria requiring every business operation to use awaited Supabase confirmation are not yet met.

The exact remaining blockers are listed below.

## 1. Dependency inventory

### StorageService business-data read domains

`StorageService` currently exposes synchronous reads for:

- platform content and revision cache
- tenants and tenant-by-slug lookup
- users and email lookup
- subscription plans
- customers
- service categories and services
- staff
- appointments and double-booking checks
- product categories, products, and stock movements
- invoices
- expenses and expense categories
- commissions
- manual payment requests
- support tickets
- announcements
- notifications
- audit logs

In production, `StorageService.init()` now bootstraps a reconciliation cache from Supabase for the primary salon membership and operational collections. The current React consumers still synchronously read that cache, so they are not yet direct awaited repository reads.

### StorageService business-data write domains

Legacy synchronous mutations still exist for:

- platform content/revisions
- audit logs
- tenant updates/creation
- user creation
- plan updates
- customer save
- service/category save and service deletion
- staff save
- appointment save/deletion/status changes
- product save
- stock movement
- invoice creation and derived customer/appointment/commission updates
- expenses and expense deletion
- commission paid state
- manual payment submission/review
- support ticket creation/reply/status
- announcements
- notifications/read state

The new confirmed asynchronous APIs cover the highest-risk core operations listed in Section 2. The remaining synchronous methods are deliberately not described as production-safe completion.

### Unsafe patterns audit

- `queueProductionWrite()` was removed.
- `void task().catch(...)` production persistence was removed.
- No fire-and-forget queue references remain in `src/services`.
- Legacy synchronous methods still write the in-memory reconciliation cache directly. These are remaining migration blockers, not confirmed production APIs.
- LocalStorage is still used by the legacy `StorageService` adapter and by `websiteService` for business-content fallback/rate-limit history. Device preference localStorage remains legitimate.

## 2. Migrated confirmed methods

Added to `src/services/storageService.ts`:

- `saveCustomerConfirmed(customer)`
- `saveServiceConfirmed(service)`
- `deleteServiceConfirmed(tenantId, serviceId)`
- `saveStaffConfirmed(staff)`
- `saveAppointmentConfirmed(appointment)`
- `deleteAppointmentConfirmed(tenantId, appointmentId)`
- `updateAppointmentStatusConfirmed(tenantId, appointmentId, nextStatus)`
- `saveProductConfirmed(product)`
- `recordStockMovementConfirmed(params)`
- `createInvoiceConfirmed(invoice)`

Behavior of confirmed methods:

1. In production they require a configured Supabase repository.
2. They await the repository/RPC operation.
3. They propagate the failure to the UI rather than reporting success.
4. They update the local reconciliation cache only after the remote operation succeeds.
5. Inventory operations refresh products and movement history after the atomic RPC.
6. POS invoice confirmation refreshes invoices, customers, appointments, commissions, products, and stock movements after the transaction.
7. Demo mode remains explicitly controlled by `VITE_ALLOW_LOCAL_ADMIN_DEMO=true` or test mode.

## 3. Updated UI components

The following components now use awaited confirmed APIs:

- `src/components/customers/CustomerModal.tsx`
- `src/components/services/ServiceModal.tsx`
- `src/components/staff/StaffModal.tsx`
- `src/components/inventory/ProductModal.tsx`
- `src/components/inventory/StockMovementModal.tsx`
- `src/components/appointments/AppointmentModal.tsx`
- `src/components/appointments/AppointmentCalendar.tsx`
- `src/components/pos/POSRegister.tsx`

Failure behavior in these paths preserves entered form state and displays an error/feedback instead of closing as though the write succeeded. POS retains its duplicate-submission guard until the transaction has completed.

## 4. Remaining synchronous call sites

The following production-facing call sites still use legacy synchronous business methods:

### Support and notifications

- `src/components/support/SupportTicketsList.tsx`
  - `createSupportTicket`
  - `replySupportTicket`
  - `updateTicketStatus`
- `src/context/NotificationContext.tsx`
  - `markAllNotificationsRead`

### Payments and announcements

- `src/components/subscription/BankTransferModal.tsx`
  - `submitManualPayment`
- `src/components/superadmin/PaymentApprovals.tsx`
  - `reviewPayment`
- `src/components/superadmin/AnnouncementsManager.tsx`
  - `createAnnouncement`

These should be converted to the Phase 4 trusted payment/support/notification RPCs and awaited repository methods before production completion.

### Public booking

- `src/components/public/PublicBookingFlow.tsx`
  - local demo branch uses `saveCustomer` and `saveAppointment`; Supabase branch already uses the secure public booking API.
  - notification creation still uses the local notification cache.
- `src/components/public/PublicBookingPage.tsx`
  - direct customer save, appointment save, and notification creation remain in the legacy path.

The Supabase public booking RPC should become the only production booking write path, with local writes retained exclusively for explicit demo mode.

### Non-UI service/context paths

- `src/context/AuthContext.tsx` still has synchronous tenant/user/audit fallback behavior around registration and demo authentication.
- `src/context/TenantContext.tsx` still uses synchronous tenant updates.
- `src/services/landingPageService.ts` still uses synchronous platform-content/revision cache methods.
- `src/services/websiteService.ts` still uses synchronous StorageService audit/cache methods and localStorage-backed website fallback.

## 5. Remaining localStorage dependencies

### Business or business-adjacent dependencies still requiring migration

- `src/services/storageService.ts`: business collections are stored in an internal memory/localStorage adapter for demo compatibility and reconciliation cache behavior.
- `src/services/websiteService.ts`: website drafts/configuration fallback and public submission history use localStorage/memory fallback.
- `src/services/landingPageService.ts`: platform landing content/revisions use StorageService cache methods rather than fully awaited document/revision repository APIs.
- `src/context/AuthContext.tsx`: browser user ID convenience key is retained, but it must never be treated as authorization.

### Legitimate device/UI preferences

- `src/context/ThemeContext.tsx`: theme preference.
- `src/components/common/ErrorBoundary.tsx`: theme preservation during UI recovery.
- `src/components/invoices/InvoiceViewModal.tsx`: receipt width preference.

These preference keys are not business records and may remain local.

## 6. Security improvements carried forward

- Production confirmed writes fail when Supabase is not configured instead of silently using demo data.
- Database confirmation precedes reconciliation-cache mutation in migrated APIs.
- Inventory uses the atomic Phase 4 RPC with row locking and negative-stock protection.
- POS uses the atomic invoice RPC and refreshes related records after confirmation.
- Appointment status updates use the repository operation and preserve server errors.
- Phase 4 RLS, tenant membership checks, trusted RPC permission matrix, and Super Admin AAL2 payment review remain in place.
- No service-role credential is introduced into browser code.

## 7. Tests added and results

Added:

- `src/services/phase5StorageMigration.test.ts`
  - asserts the unsafe queue architecture is absent
  - asserts confirmed core APIs exist
  - asserts POS and appointment creation use confirmed methods

Final local results:

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

The current tests are unit/static contract tests. Live Supabase RLS, transaction concurrency, timeout, and cross-tenant integration tests still require a disposable staging project.

## 8. Remaining production blockers

1. Convert all remaining support, payment, announcement, notification, public-booking, tenant, authentication, and CMS mutations to awaited repository/RPC methods.
2. Add repository CRUD/RPC methods for expense mutations, commission payment state, manual payment submission, support ticket creation/status, announcements, notifications, tenant updates, plans, and audit logs.
3. Replace synchronous StorageService reads in React components with an async query/reconciliation layer that exposes loading, empty, error, and retry states.
4. Remove business-content localStorage fallback from `websiteService` and fully connect website/landing drafts, revisions, published documents, reviews, and media metadata to Supabase.
5. Add idempotency keys to all user-submitted business writes, not only public booking/POS transaction paths.
6. Add request timeout and retry handling around repository operations without converting failures into success.
7. Add staging integration tests for unauthorized membership, cross-tenant access, concurrent stock movement, payment duplicate review, duplicate POS submission, booking conflicts, and cache reconciliation.
8. Verify all affected UI forms disable duplicate submission while awaiting confirmation.
9. Run staging RLS and MFA AAL2 verification with real authenticated sessions.

## 9. Files modified in Phase 5

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

## Conclusion

The Phase 5 work has materially reduced production risk: the fire-and-forget write queue is gone and core operational writes now have confirmed asynchronous paths. The phase must remain **open** until the remaining synchronous business consumers and local business fallbacks are migrated and verified against a real staging Supabase project.

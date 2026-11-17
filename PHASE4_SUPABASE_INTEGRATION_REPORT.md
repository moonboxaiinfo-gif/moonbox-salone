# Moonbox Salon — Phase 4 Supabase Integration Report

**Assessment date:** 2026-11-13  
**Repository:** `moonbox-salon-preview`  
**Execution policy:** No SQL was executed against a live Supabase project. No Netlify deployment was performed.

## Executive summary

This pass adds an additive Phase 4 database transaction/security layer and exposes the new trusted operations through `SupabaseRepository`. It does **not** claim that the entire legacy `StorageService` migration is complete. The existing UI still has synchronous `StorageService` call sites, optimistic in-memory business writes, and a production fire-and-forget write helper. Those are recorded as explicit production blockers below.

The repository remains buildable and testable locally. After the changes:

- `npm run lint`: **passed**
- `npm test -- --run`: **passed — 35 tests in 7 files**
- `npm run build`: **passed**
- Build warning: Vite reports a large JavaScript chunk (>500 kB); this is a performance warning, not a build failure.

## 1. Modified files

1. `supabase/migrations/20261113000002_phase4_business_transactions.sql`
   - New additive migration for recipient-specific notifications, server-side permission checks, atomic stock movement, MFA-gated payment review, support-ticket message mutation, and notification read state.
   - Aligns the support-ticket status constraint with the existing application status `waiting_for_customer`.
2. `src/services/supabaseRepository.ts`
   - Added repository methods for the new trusted RPCs:
     - `recordStockMovementAtomic`
     - `reviewManualPayment`
     - `appendSupportTicketMessage`
     - `markNotificationsRead`
3. `src/services/phase4Security.test.ts`
   - Added contract tests that verify the migration contains the required server-side checks, AAL2 gate, notification storage, atomic inventory guard, and public privilege revocations.
4. `PHASE4_SUPABASE_INTEGRATION_REPORT.md`
   - This report.

## 2. Completed in this pass

### Server-side transaction and security layer

- Added `has_salon_permission(salon_id, permission)` as a SECURITY DEFINER helper with the explicit role matrix:
  - `owner`, `manager`, `receptionist`, and `staff` may read/book/sell/support according to operation.
  - `owner` and `manager` may manage services, staff, inventory, finance, and support.
  - `owner` alone may manage members.
  - Super Admin is handled through the existing server-side `is_super_admin()` function.
- Revoked public execution on privileged RPCs and granted execution only to `authenticated`.
- Added an atomic inventory transaction that locks the product row, rejects invalid movements, prevents negative stock, updates the product balance, and writes a movement history record in one server-side operation.
- Added a trusted manual-payment review transaction. It requires both server-side Super Admin verification and `auth.jwt()->>'aal' = 'aal2'`; it validates the action/rejection reason, updates the payment, activates the subscription only on approval, and writes an audit log.
- Added a server-side support-ticket message append operation that locks the ticket, validates tenant/support access, appends a structured message, and changes the ticket state transactionally.
- Added recipient-specific notification storage with RLS, unread/read state, and a server-side read-state RPC.
- Added the missing `waiting_for_customer` status to the database constraint to match the existing TypeScript domain type and UI behavior.

### Repository layer

The new server-side operations are now callable from the application through `SupabaseRepository`. Each method propagates RPC failures instead of silently converting them into success.

## 3. Existing modules reviewed and current status

| Module | Current status | Notes |
|---|---|---|
| Website configuration / published website | Partially integrated | Existing repository methods and RLS exist. Legacy `websiteService.ts` still has localStorage-based draft/rate-limit behavior. |
| Landing page drafts / revisions | Partially integrated | Existing landing-page repository/migration exists. `landingPageService.ts` still uses `StorageService` platform-content methods for some paths. |
| Website reviews / moderation | Partially integrated | Existing Supabase repository methods and website RLS exist. UI call sites still require end-to-end async migration. |
| CMS media metadata | Schema present | `landing_page_media` exists with RLS. A complete secure upload orchestration and UI confirmation path was not claimed in this pass. |
| Expenses / categories | Not fully migrated | Legacy `StorageService` writes remain synchronous/local-cache based; repository read/write support is incomplete for all UI paths. |
| Commissions | Not fully migrated | Existing schema/read support exists, but status/payment mutations remain legacy local-cache operations. |
| Manual payments / approval | Server-side transaction added | New RPC is present and AAL2-gated, but the current UI still calls the synchronous `StorageService.reviewPayment` path. |
| Subscription records / invoice history | Partially integrated | Existing tables and POS invoice RPC exist. Subscription mutation paths still need UI/repository conversion. |
| Support tickets / messages / status | Server-side message transaction added | Existing UI still uses synchronous `StorageService` methods. Notification fan-out needs final UI wiring. |
| Announcements | Partially integrated | Existing table/RLS/repository support exists; some UI paths remain local-cache based. |
| Notifications | Database foundation added | Recipient-specific table, RLS, and read-state RPC added. Existing `StorageService` notification rendering still reads its local cache. |
| Super Admin trials / package assignment / MFA | Existing RPC foundation | Existing migrations already provide server-side trial/package RPCs and AAL2 enforcement. Current `StorageService` methods are still local synchronous fallbacks in the client. |
| Inventory | Atomic server-side movement added | Existing UI still performs local stock arithmetic before the new RPC is called; final UI conversion is required. |
| Tenant/role isolation | RLS and permission helper strengthened | Live cross-tenant verification was not performed and must occur in staging. |

## 4. Remaining localStorage/business dependencies

The following are the remaining production business-data dependencies identified by static audit:

- `src/services/storageService.ts` persists or reads business collections including tenants, users, plans, customers, categories, services, staff, appointments, products, stock movements, invoices, expenses, commissions, manual payments, support tickets, announcements, notifications, and audit logs.
- `src/services/storageService.ts` still uses `queueProductionWrite()` and `void task().catch(...)` for customer, service, staff, appointment, product, and invoice production writes. This violates the requirement to await database confirmation before reporting success.
- `src/services/storageService.ts` still updates the local cache before the database confirms the write for multiple business operations.
- `src/services/websiteService.ts` stores website configuration/drafts and public-submit history in localStorage/memory fallback. Device-level rate-limit history may remain local, but business website drafts/configuration must move fully to Supabase before production completion.
- `src/context/AuthContext.tsx` stores a browser session user ID. This is an identity/session convenience and must not be trusted as authorization; the existing Supabase path should remain authoritative.
- `src/context/ThemeContext.tsx`, `ErrorBoundary.tsx`, and `InvoiceViewModal.tsx` use localStorage for device preferences/UI state. These are acceptable non-business uses.

## 5. Security changes

- Privileged transaction functions use `SECURITY DEFINER`, fixed `search_path = public`, explicit `REVOKE ALL FROM PUBLIC`, and `GRANT EXECUTE TO authenticated`.
- Payment approval requires server-side Super Admin membership and MFA AAL2; client role values are not used as authorization.
- Inventory movement locks the product row and performs the negative-stock check inside the transaction.
- Support message mutation verifies the ticket's salon access before changing ticket content or status.
- Notifications are scoped by `recipient_user_id` or Super Admin access through RLS.
- The permission matrix is centralized in `has_salon_permission` for trusted RPC use.

## 6. New additive SQL migration

`supabase/migrations/20261113000002_phase4_business_transactions.sql` adds:

- `public.notifications` table, indexes, RLS, and read-state support.
- `public.has_salon_permission(uuid, text)`.
- `public.record_stock_movement_atomic(uuid, uuid, text, integer, text, text)`.
- `public.review_manual_payment(uuid, text, text)`.
- `public.append_support_ticket_message(uuid, text, text, text)`.
- `public.mark_notifications_read(uuid)`.
- Updated support-ticket status constraint to include `waiting_for_customer`.

This file was not applied to a live database in accordance with the supplied limitation.

## 7. Automated test results

The final local verification was:

```text
npm run lint
  passed

npm test -- --run
  7 test files passed
  35 tests passed

npm run build
  passed
  Vite chunk-size warning (>500 kB)
```

The new `phase4Security.test.ts` adds four migration contract tests. These are static contract tests, not live database/RLS tests.

## 8. Database dependencies

The migration assumes the existing schema and extensions already present in the supplied project:

- `public.salons`
- `public.salon_members`
- `public.products`
- `public.stock_movements`
- `public.manual_payment_requests`
- `public.salon_subscriptions`
- `public.support_tickets`
- `public.audit_logs`
- `public.platform_admins`
- `auth.users`
- Existing `public.is_super_admin()` and membership helper functions
- UUID generation support used by the existing schema (`gen_random_uuid()` / UUID extension support)

A staging database must be migrated in order and inspected for any pre-existing constraint/policy naming conflicts before execution.

## 9. Staging verification requirements

Before production consideration, run the migration only in a disposable/staging Supabase project and verify:

1. A salon A member cannot select, update, delete, or infer salon B business rows.
2. Owner, manager, receptionist, and staff permissions match the approved matrix for every table and RPC.
3. A non-admin and an AAL1 Super Admin cannot review a payment.
4. A valid AAL2 Super Admin can approve/reject exactly once and cannot approve a non-pending request.
5. Concurrent inventory movements cannot produce negative stock or duplicate movement history.
6. Support-ticket message append preserves existing messages and enforces tenant access.
7. Notification reads are recipient-specific and do not mark another user's notifications read.
8. Published website/landing content is consistent across two authenticated sessions and one anonymous session.
9. Secure media upload metadata is scoped correctly and public media exposure is limited to enabled published content.
10. RLS behavior is verified with real authenticated sessions, not only SQL text inspection.

## 10. Exact remaining production blockers

1. Convert all business `StorageService` mutators to async repository/RPC calls and update every React call site to await results.
2. Remove `queueProductionWrite()` and all fire-and-forget production writes.
3. Stop using local business caches as the source of truth in production; retain localStorage only for preferences and explicit demo mode.
4. Wire the new atomic inventory RPC into `StockMovementModal`, `ProductModal`, POS, and all stock adjustment workflows.
5. Wire the AAL2-gated payment review RPC into the Super Admin payment approval UI.
6. Wire the support message/status RPCs and recipient notification reads into the support/notification UI.
7. Complete async Supabase CRUD for expenses, commission settlement, announcements, tenant settings, subscription records, and audit-log writes.
8. Complete website/landing CMS draft/publish/revision/media UI conversion and remove business-content localStorage fallback in production.
9. Add integration tests against a disposable Supabase staging project, including cross-tenant negative tests and concurrent transaction tests.
10. Run a production-like security review of storage buckets, Netlify function authorization, MFA enrollment/recovery, rate limits, and secret configuration.

## Conclusion

The submitted code is locally healthy and now contains a stronger additive server-side Phase 4 foundation. It is **not production-complete** under the supplied acceptance criteria because the legacy synchronous `StorageService` API and its optimistic/fire-and-forget production writes are still present. The remaining blockers above must be resolved and verified in staging before any production migration or deployment.

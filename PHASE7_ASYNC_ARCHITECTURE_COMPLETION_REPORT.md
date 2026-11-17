# Moonbox Salon — Phase 7 Async Architecture Completion Report

**Assessment date:** 2026-11-13  
**Repository:** `moonbox-salon-preview`  
**Status:** **Not complete under the supplied acceptance criteria.**

Phase 7 removes the remaining production local-write path from public booking, adds production cache invalidation on session transitions, and adds guard tests. The repository passes lint, tests, and build. However, the broader React application still has synchronous StorageService reads, and website/CMS/announcement operations still have legacy local-cache paths. Those gaps are listed explicitly rather than being represented as complete.

## 1. Modified files

### Phase 7 files

- `src/components/public/PublicBookingFlow.tsx`
- `src/components/public/PublicBookingPage.tsx`
- `src/services/storageService.ts`
- `src/context/AuthContext.tsx`
- `src/services/phase7AsyncArchitecture.test.ts`
- `PHASE7_ASYNC_ARCHITECTURE_COMPLETION_REPORT.md`

### Earlier-phase files included in the resulting archive

- `src/services/supabaseRepository.ts`
- `src/services/storageService.ts`
- `src/components/support/SupportTicketsList.tsx`
- `src/components/subscription/BankTransferModal.tsx`
- `src/components/superadmin/PaymentApprovals.tsx`
- `src/components/commissions/CommissionList.tsx`
- `src/components/expenses/ExpenseModal.tsx`
- `src/components/expenses/ExpenseList.tsx`
- `src/context/NotificationContext.tsx`
- Phase 4/5 reports and tests

No previously applied SQL migration was modified. No new SQL migration was needed for the Phase 7 changes.

## 2. Migrated components and completed work

### Public booking

`PublicBookingFlow.tsx` and `PublicBookingPage.tsx` now use the secure `PublicWebsiteApi.submitBooking` RPC path in configured production environments. Production no longer directly saves customers, appointments, or notifications through StorageService. If Supabase is not configured and explicit demo mode is not enabled, the UI displays an unavailable/error state instead of reporting local success.

Direct local customer, appointment, and notification operations remain only under `isLocalDemoMode`. The booking idempotency key remains part of the secure RPC request. Existing booking confirmation UI and email-confirmation behavior remain preserved.

### Session and tenant cache invalidation

`StorageService.clearProductionCache()` was added. It clears production in-memory business collections without deleting explicit local-demo fixtures. `AuthContext.logout()` and the demo account switcher invoke this invalidation before changing the active user. This prevents the previous salon’s reconciliation cache from remaining available after logout or account switching.

This is an improvement, not a substitute for a complete async query lifecycle. Components still need to subscribe to session-aware async data loading and clear their own request state when the active membership changes.

### Guard tests

`src/services/phase7AsyncArchitecture.test.ts` verifies:

- Public local booking writes are guarded by explicit demo mode.
- Production public booking retains the secure RPC path.
- Production cache invalidation exists and is wired to session transitions.
- The removed fire-and-forget write queue has not returned.

## 3. All completed modules carried forward

The current repository includes confirmed asynchronous writes for customers, services, staff, appointments, appointment status changes, products, stock movements, invoices, expenses, commission settlement, manual payment submission, payment approval/rejection, support tickets, support replies/statuses, and notification read state.

Payment approval continues to use the server-side trusted RPC with AAL2 enforcement. Inventory and POS continue to use the atomic Phase 4 transaction RPCs. No service-role credential is present in browser code.

## 4. Remaining synchronous reads

A source audit still finds approximately **77 synchronous business-data read references** across React components, contexts, and services. Main areas include:

- Dashboard and reports.
- Customers, services, staff, inventory, appointments, invoices, expenses, commissions, POS, and customer profile views.
- Super Admin tenants, payments, tickets, plans, announcements, salon management, and audit logs.
- Subscription and public landing pages.
- Public salon, portfolio, booking, website workspace, theme, and renderer fallbacks.
- Auth, tenant, entitlement, and website services.

These components read the StorageService reconciliation cache synchronously. Although production cache initialization is Supabase-backed, this does not satisfy the Phase 7 requirement for a shared async data layer with authenticated queries, tenant-scoped lifecycle, loading state, empty state, error state, retry, and session-aware invalidation.

## 5. Remaining synchronous writes

The following production business paths still require migration:

- `src/components/superadmin/AnnouncementsManager.tsx` still calls legacy `createAnnouncement`.
- `src/services/websiteService.ts` still persists website records through localStorage/memory helpers.
- `src/services/landingPageService.ts` still uses synchronous platform content/revision cache methods in some paths.
- Tenant settings and several Super Admin tenant/platform mutations still use legacy synchronous StorageService methods.
- Auth fallback/demo paths still contain synchronous user/tenant/audit operations. These must remain isolated from production, with Supabase session and membership as the only production authority.

The public booking local writes visible in source are explicitly demo-only branches. They are not production paths, but they remain in the code to preserve the requested development/demo functionality.

## 6. localStorage and in-memory dependency inventory

### Business-data or business-content dependencies still requiring removal

- `src/services/storageService.ts`: demo persistence and production reconciliation cache implementation.
- `src/services/websiteService.ts`: website draft/published record fallback, memory fallback, and public review submission history.
- `src/services/landingPageService.ts`: platform content and revision cache fallback.
- `src/context/AuthContext.tsx`: browser session user ID convenience key. This is not used as the authorization boundary, but should eventually be replaced by Supabase session-derived identity throughout production paths.

### Legitimate device preferences

- `ThemeContext.tsx`: theme preference.
- `InvoiceViewModal.tsx`: receipt width preference.
- `ErrorBoundary.tsx`: theme preservation during UI recovery.
- Booking language session preference.

These preferences are not business records and may remain client-side.

## 7. Session and tenant security

Implemented or retained:

- Production booking requires the secure public booking RPC.
- Public production booking no longer silently falls back to local success.
- Tenant-scoped repository methods enforce authenticated membership checks.
- RLS remains the final database authorization boundary.
- Payment approval/rejection uses server-side AAL2-gated authorization.
- Production cache invalidation runs on logout and account switching.
- Demo-only local data is gated through explicit demo configuration.
- No browser-stored role or user ID is treated as sufficient authorization.

Still requiring staging verification:

- Revoked membership immediately invalidates existing component data.
- Session expiry during a read or write clears all stale data and returns to authentication.
- Account switching cancels or ignores in-flight requests from the previous salon.
- Cross-tenant reads fail under real Supabase RLS sessions.

## 8. Test results

Final verification:

```text
npm run lint
  passed

npm test -- --run
  9 test files passed
  41 tests passed

npm run build
  passed
  Existing Vite warning: a generated chunk exceeds 500 kB
```

No tests failed in the final run.

The tests remain primarily repository/unit/static-contract tests. They do not replace live staging verification of RLS, session expiry, concurrent transactions, or publishing consistency.

## 9. Database migration requirements

No additional Phase 7 migration was added. Existing additive migrations remain unchanged, including:

- `20261113000002_phase4_business_transactions.sql`
- `20261112000000_public_boundary_hardening.sql`
- `20261109000001_landing_page_cms.sql`
- `20261028000000_website_portfolio_builder.sql`

Before production use, a disposable staging project should verify that the existing policies, trusted RPCs, notification recipient constraints, website/CMS tables, and landing revision tables match the repository contracts. Any schema changes must be additive and must not be applied to the live project from this task.

## 10. Staging verification requirements

Test with real authenticated sessions for salon owner, manager, receptionist, staff, Super Admin AAL1, and Super Admin AAL2. Verify cross-tenant denial, revoked-membership denial, session expiry, account switching, cache clearing, duplicate public booking idempotency, concurrent inventory updates, duplicate payment review, support recipient isolation, website publishing consistency, landing revision persistence, and unauthorized Super Admin operations.

Also test network timeout and retry behavior. Reads may be retried safely with bounded backoff; non-idempotent writes must not be blindly retried without an idempotency key.

## 11. Exact remaining production blockers

1. Replace all synchronous StorageService business reads with a shared async data-access layer and migrate the affected components to loading, empty, error, retry, and cancellation states.
2. Remove production localStorage/memory business-content fallback from WebsiteService and LandingPageService.
3. Migrate announcements, tenant settings, platform settings, audit logging, and remaining Super Admin mutations to awaited trusted repository/RPC methods.
4. Ensure public website retrieval is Supabase-backed in every production fallback branch, including tenant resolution and public service/staff/category data.
5. Add request cancellation and active-session checks so responses from a previous salon cannot populate the current salon after account switching.
6. Add staging integration tests for RLS, membership revocation, session expiration, duplicate booking, CMS publishing, revision persistence, and unauthorized privileged operations.
7. Add bounded timeout/retry behavior and idempotency keys to remaining non-idempotent business writes.

## Conclusion

Phase 7 improves the security boundary of public booking and prevents stale production cache exposure during logout/account switching. It does not meet the full acceptance criteria because the application still contains many synchronous business-data reads and legacy CMS/Super Admin write paths. The phase is therefore intentionally reported as incomplete until those blockers are migrated and verified against a real staging Supabase project.

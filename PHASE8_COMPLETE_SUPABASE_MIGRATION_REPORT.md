# Moonbox Salon — Phase 8 Complete Supabase Migration Report

**Assessment date:** 2026-11-13  
**Repository:** `moonbox-salon-preview`  
**Status:** **Not complete under the supplied acceptance criteria.**

Phase 8 introduces a shared asynchronous tenant snapshot/query layer and migrates Dashboard and Reports to it. It also preserves the Phase 7 public-booking production boundary and session-cache invalidation. The full application still has synchronous StorageService consumers and website/CMS legacy persistence, so this report does not claim full completion.

## Modified files

### Phase 8

- `src/services/asyncDataService.ts`
- `src/services/storageService.ts`
- `src/components/dashboard/DashboardOverview.tsx`
- `src/components/reports/ReportsDashboard.tsx`
- `src/services/phase7AsyncArchitecture.test.ts`
- `PHASE8_COMPLETE_SUPABASE_MIGRATION_REPORT.md`

### Carried-forward Phase 7 changes

- `src/components/public/PublicBookingFlow.tsx`
- `src/components/public/PublicBookingPage.tsx`
- `src/context/AuthContext.tsx`
- Phase 7 report and project tests

## Migrated modules

### Shared async tenant data layer

`src/services/asyncDataService.ts` provides `useTenantData(tenantId)`. It exposes `data`, `loading`, `error`, and `retry`, performs an authenticated tenant-scoped snapshot load, and ignores responses after the component/session lifecycle is no longer active. A tenant change causes a fresh request and does not reuse the previous tenant’s response.

`StorageService.loadTenantData(tenantId)` reads appointments, invoices, expenses, customers, products, staff, services, and commissions in parallel through the configured Supabase repository. The reconciliation cache is updated only after all remote reads succeed. Explicit local demo mode uses the existing fixtures solely for development/test compatibility.

### Dashboard and reports

`DashboardOverview.tsx` and `ReportsDashboard.tsx` now use the shared async layer and render explicit loading, error/retry, and no-workspace states. Their business aggregates are calculated from the authoritative snapshot rather than synchronous StorageService reads.

### Previously migrated write modules

The repository already contains confirmed async operations for customers, services, staff, appointments, appointment status, products, stock movements, invoices/POS, expenses, commissions, manual payments, payment approval/rejection, support tickets, support replies/statuses, and notification read state. Public booking production writes are restricted to the secure public booking RPC.

## Remaining synchronous references

A final source audit found **76 synchronous business-data read references** across components, contexts, and services. Remaining groups include:

- Customers, services, staff, appointments, inventory, POS, invoices, expenses, commissions, and support list/detail components.
- Super Admin tenants, plans, payments, tickets, announcements, salon management, and audit logs.
- Subscription, entitlement, and tenant contexts.
- Public salon, portfolio, booking, landing, and website renderer fallbacks.
- Website workspace, theme, service tabs, and public-site helpers.
- Auth and account-resolution fallback paths.

These consumers still read the StorageService reconciliation cache synchronously and do not uniformly expose async loading, error, retry, cancellation, and empty states.

## Remaining synchronous writes

The following unconfirmed business writes remain:

- `src/components/superadmin/AnnouncementsManager.tsx` still calls legacy `createAnnouncement`.
- `src/services/websiteService.ts` still persists website configuration/draft/published records through localStorage/memory helpers.
- `src/services/landingPageService.ts` still uses synchronous platform content/revision cache operations in some paths.
- Tenant settings, platform settings, audit logging, and several Super Admin mutations still use legacy synchronous StorageService methods.
- Explicit demo-mode public booking continues to use local customer/appointment/notification fixtures by design. Production public booking does not use those branches.

The remaining `StorageService.save*Confirmed` and `*Confirmed` references are awaited APIs and are not considered legacy writes. The source audit must distinguish those confirmed wrappers from the remaining synchronous methods before production sign-off.

## Remaining localStorage and in-memory dependencies

### Business or business-content dependencies requiring removal from production

- `src/services/websiteService.ts`: `memoryRecords`, localStorage website records, and public review submission history.
- `src/services/storageService.ts`: in-memory reconciliation cache and explicit demo persistence adapter.
- `src/services/landingPageService.ts`: platform content/revision cache fallback.
- `src/context/AuthContext.tsx`: browser session user ID convenience storage. Supabase session identity remains the required production authority, but this convenience key should be removed from production account resolution.

### Legitimate device/UI preferences

- Theme preference in `ThemeContext`.
- Receipt width in `InvoiceViewModal`.
- Theme preservation in `ErrorBoundary`.
- Booking language in session storage.

These are not business records and may remain client-side.

## Security changes

- Tenant snapshot reads use the configured Supabase repository and parallel tenant-scoped queries.
- Async hook responses are ignored after unmount or tenant/request lifecycle change.
- Production cache invalidation remains wired to logout and account switching.
- Public production booking requires the secure RPC and fails closed when Supabase is unavailable; direct local booking is explicit demo-only.
- Confirmed write APIs reconcile cache only after remote success.
- Inventory/POS remain on atomic transaction RPCs.
- Payment review remains server-authorized and AAL2-gated.
- RLS remains the final authorization boundary.
- No service-role key or client-side role value is used as the database authorization mechanism.

## Test results

Final local verification:

```text
npm run lint
  passed

npm test -- --run
  9 test files passed
  42 tests passed

npm run build
  passed
  Existing Vite warning: generated chunk exceeds 500 kB
```

The test suite verifies repository CRUD/domain mapping, environment/security contracts, admin/trial logic, landing-page behavior, Phase 4 transaction/security contracts, Phase 5 queue-removal guardrails, Phase 7 production booking guards, cache invalidation wiring, and the new async layer’s cancellation/loading/retry contract. It does not replace live RLS or multi-session integration tests.

## Migration requirements

No previously applied migration was modified and no new Phase 8 SQL migration was required for the snapshot layer. Existing migrations still require staging validation, especially:

- `20261113000002_phase4_business_transactions.sql`
- `20261112000000_public_boundary_hardening.sql`
- `20261109000001_landing_page_cms.sql`
- `20261028000000_website_portfolio_builder.sql`

Website Builder and Landing CMS must be moved from localStorage/memory helpers to the already-defined Supabase website/CMS tables and trusted operations before acceptance. Any schema changes must be additive and must not be applied to the live project by this task.

## Staging requirements

Use a disposable Supabase project with real authenticated users for salon owner, manager, receptionist, staff, Super Admin AAL1, and Super Admin AAL2. Verify cross-tenant denial, revoked membership, session expiration, account switching during in-flight requests, stale response suppression, duplicate booking idempotency, concurrent inventory updates, duplicate payment review, support recipient isolation, website publishing permissions, CMS draft privacy, and revision persistence.

Test network timeout behavior separately from database rejection. Reads may use bounded retries; non-idempotent writes must not be blindly retried without idempotency keys. Verify the UI preserves entered data and provides retry after failed writes.

## Exact production blockers

1. Migrate the remaining 76 synchronous read consumers to `useTenantData` or an equivalent shared async query layer with loading, empty, error, retry, cancellation, and session-aware cache invalidation.
2. Complete Supabase-backed Website Builder reads/writes and remove production `websiteService` localStorage/memory business persistence.
3. Complete Landing CMS document, draft, publish, revision, media, and public retrieval paths without exposing unpublished content.
4. Convert announcements, tenant settings, platform settings, audit writes, and remaining Super Admin operations to awaited trusted repository/RPC methods.
5. Remove the production browser user-ID convenience dependency from authentication/account resolution and rely on the Supabase session plus active membership.
6. Add staging integration tests for revoked membership, session expiry, account switching, cross-tenant isolation, stale response prevention, website publishing, CMS draft privacy, and unauthorized Super Admin access.
7. Add bounded timeout/cancellation handling to all async data consumers and idempotency keys to remaining non-idempotent writes.

## Conclusion

Phase 8 delivers a real shared async read architecture for the Dashboard and Reports and preserves the secure public-booking boundary. It does not meet the full acceptance criteria because most business-data consumers remain synchronous and Website Builder, Landing CMS, announcements, and several Super Admin paths still depend on legacy local/cache architecture. Completion is intentionally withheld pending the blockers above and staging verification.

# Moonbox Salon — Phase 12 Pre-Implementation Checklist

**Source archive:** `Moonbox-Salon-Phase11-Tenant-Notification-Async.zip`  
**Inspection date:** 2026-11-14; final status updated 2026-11-15  
**Working copy:** `/home/ubuntu/moonbox-phase12/moonbox-salon`  
**Safety:** Demo/test project only. No live Supabase connection, SQL execution, credential creation, or deployment was performed.

## Pre-edit inspection completed

- [x] Extracted the supplied archive and inventoried its files; reviewed the Phase 12 prompt.
- [x] Read previous phase reports, checklists, blockers, validation output, database requirements, appointment audit, preservation matrix, setup guide and TODOs.
- [x] Inspected `package.json`, `.env.example`, migrations, tests, and the source tree.
- [x] Inspected `asyncDataService.ts`, `supabaseRepository.ts`, `storageService.ts`, `TenantContext.tsx`, `AuthContext.tsx`, `NotificationContext.tsx`, and the target-domain UI/repository/schema call paths.
- [x] Audited customer, service/category, staff and appointment flows, including POS and public booking consumers.
- [x] Recorded the pre-edit checklist before source edits.
- [x] Confirmed no `.env` credentials were present and retained the explicit demo/test boundary.
- [x] Captured baseline checks before implementation: TypeScript passed; 53 tests passed; production build passed with a large-chunk warning.

## Evidence recorded before source changes

1. The existing shared resource hook provided loading/error/retry and effect cleanup, but did not propagate cancellation to Supabase queries, mounted consumers were not notified on invalidation, and a stale in-flight response could be associated with the new session generation.
2. Primary customer, service, staff, appointment, POS and public consumers still used synchronous cache reads for business data.
3. Some confirmed async write methods already existed, but service deletion still used the synchronous method and POS customer creation ignored the persisted server UUID.
4. Service-to-staff qualification and appointment service IDs were present in domain/UI types but not in the checked-in SQL schema. Empty category values also needed normalization to SQL `NULL`.
5. Public booking already used a SECURITY DEFINER RPC and earlier migrations supplied idempotency and overlap protections, but client confirmation could disagree with the server’s persisted status and availability decisions.
6. The prior project reports explicitly stated that migrations and live RLS, role, tenant-isolation and concurrency behavior were not verified.

## Implementation checklist

### P0 — Safety and baseline
- [x] Preserve existing UI, navigation and workflows; do not connect a live database, execute SQL, create credentials or deploy.
- [x] Run baseline TypeScript, tests and build before editing; install packages only from the existing lockfile.
- [x] Preserve the atomic POS and public booking RPC boundaries.
- [x] Keep fixture reads/writes behind explicit local-demo/test branches; do not introduce production fixture fallback.

### P1 — Shared async lifecycle and tenant/session isolation
- [x] Make cache invalidation observable to mounted resource hooks and bind cache entries to the auth-session generation.
- [x] Propagate `AbortSignal` to PostgREST reads; suppress stale responses; mask previous-tenant state during tenant changes and clear old-session data immediately.
- [x] Reuse `useTenantResource` with typed customer, catalog, staff, appointment, invoice and customer-history loaders.
- [x] Add async architecture source-contract assertions and fake-repository cancellation tests. **Scope note:** loading/error/retry/tenant/session safeguards are source-contract tested, not exercised by mounted browser-component tests.

### P2 — Customer and service consumers
- [x] Migrate customer list/profile/history, POS selection/creation and related invoice/staff screens to shared async resources.
- [x] Use persisted UUIDs after confirmed customer/service writes; prevent repeated submissions and preserve form state when writes fail.
- [x] Preserve customer search, filtering, statistics and separate appointment/invoice history loading, error, retry and empty states.
- [x] Migrate service/category list, editor and dependent selection reads; use confirmed deletion; preserve service pricing, duration, active/online flags and search/filter behavior.
- [x] Add additive columns and same-tenant integrity checks for service qualification and appointment service IDs; normalize optional category to SQL `NULL`.

### P3 — Staff, appointment and public booking consumers
- [x] Migrate staff roster, commissions, service assignments, editor and POS/appointment selection to async resources.
- [x] Migrate appointment calendar and modal dependencies; add live advisory conflict checking, qualification filtering, retry/empty/error states and duplicate-save protection.
- [x] Preserve public `submit_public_booking()` RPC, persisted idempotency, server pricing/duration, staff qualification and database overlap protection; use returned IDs/status/pricing in confirmation.
- [x] Add additive server-side appointment status transition and link/schedule validation triggers; retain the earlier overlap trigger rather than replacing it.
- [x] Prevent public storefront/booking data from showing a prior salon payload on route changes; cancel network requests and provide retry on booking-page load failures.
- [x] Constrain appointment-modal status choices to the database transition map and display pending public requests as requests, not as confirmed appointments.

### P4 — Tests, documentation and handover
- [x] Add Phase 12 mapper, confirmed CRUD, cancellation propagation, public boundary, demo isolation and synchronous-read guardrail tests.
- [x] Run final `npm run lint`, `npm test -- --run`, and `npm run build`; all passed. Build retains the pre-existing >500 kB chunk warning.
- [x] Document exact source changes, synchronous demo references, localStorage boundaries, security scope, migration instructions, blockers and a Phase 13 recommendation.
- [x] Package the complete project ZIP without `node_modules`, build output, real credentials or generated live data.

## Explicitly unverified / external blockers

- [ ] Apply and review the additive SQL migration through the project’s normal process against a disposable staging Supabase project; this was intentionally not executed.
- [ ] Verify two-tenant RLS denial, all role permissions, inactive-membership denial, account/session revocation, grants and deployed migration history on staging.
- [ ] Exercise concurrent booking conflicts, idempotent retries, shift/break validation and status transitions against PostgreSQL; local static/fake-client tests do not establish database runtime behavior.
- [ ] Confirm production Supabase environment configuration and release workflow when authorized; no real credentials were requested or created.
- [ ] Add browser-mounted React tests for rendered loading/empty/error/retry behavior and in-flight tenant/session transitions in a later test-infrastructure step.

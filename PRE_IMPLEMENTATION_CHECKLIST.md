# Moonbox Salon — Evidence-Based Pre-Implementation Checklist

**Source:** `Moonbox-Salon-Phase8-Complete-Supabase-Migration-Updated.zip`  
**Inspection date:** 2026-11-14  
**Status:** Inspection completed before source modifications. The live Supabase project and Netlify deployment were not accessed.

## Inventory verified

- [x] Extracted supplied ZIP to a working copy; 158 files under `src/`.
- [x] Reviewed implementation, audit, Phase 1–8, CMS/security, appointment, feature-preservation, and setup documentation included in the ZIP.
- [x] Enumerated all checked-in migrations in chronological order: 10 files from `20261013000000_initial_schema.sql` through `20261113000002_phase4_business_transactions.sql`.
- [x] Checked migration timestamp collisions: none found.
- [x] Inspected `package.json`, `.env.example`, Supabase client/repository, `asyncDataService.ts`, `StorageService`, authentication/tenant architecture, public website API references, website service, landing CMS service, Netlify functions, and tests.
- [x] Confirmed existing script contracts: `npm run lint` (TypeScript no-emit), `npm test` (Vitest), and `npm run build` (Vite).

## Evidence-based implementation checklist

### P0 — Preserve constraints and establish safe baseline

- [x] Run tests/lint/build on the extracted source as the baseline; preserve final command output in `VALIDATION-OUTPUT.txt`.
- [x] Keep all existing pages/routes/features and never use live Supabase, execute SQL against any live database, deploy to Netlify, or introduce fabricated credentials.
- [x] Never edit historical migrations; no SQL migration was added or changed in this continuation.

### P1 — Async repository and session/tenant data access

- [ ] Audit the exact synchronous production call sites (the Phase 8 report states 76 sync reads; source search finds dozens of consumer modules).
- [ ] Convert feasible tenant-scoped reads to awaitable repository/query paths with loading, error, retry, empty, cancellation/stale suppression, and tenant/session invalidation.
- [ ] Convert business writes to confirmed async operations; eliminate false-success/fire-and-forget behavior and ensure UI/cache changes happen only after DB confirmation.
- [ ] Reconcile uncovered tables/domain methods against the actual schema before adding repository operations; do not trust browser roles or caller-supplied tenant IDs.

### P2 — Website Builder and Landing CMS

- [ ] Replace `websiteService.ts` localStorage/memory business storage with Supabase-backed access and preserve draft/published separation.
- [ ] Replace `landingPageService.ts` platform content/revision cache with authorized durable repository/RPC access.
- [ ] Ensure public retrieval returns only published/enabled safe fields; review and moderation must be server-authorized.
- [ ] Resolve missing `/api/public/websites/...` handlers or replace them with implemented, supported Supabase access paths.
- [ ] Document storage buckets, access policies, and signed/private file handling; never make payment receipts public.

### P3 — Privileged/platform operations and financial integrity

- [ ] Audit Super Admin mutations, AAL2 enforcement, tenant/role permissions, audit logging, plan/payment/announcement/settings flows.
- [ ] Reconcile public booking client flows with `submit_public_booking()` so no duplicate direct write follows an RPC success.
- [x] Reconcile POS RPC response envelope with caller types and add credential-free regression coverage. Server-side authoritative price/total validation remains open.
- [ ] Add/verify idempotency and safe bounded timeout/retry behavior without blind retries for non-idempotent writes.

### P4 — Configuration, tests, security, and handover

- [ ] Keep browser-safe `VITE_` variables separate from server-only secrets; `.env.example` must contain placeholders only.
- [x] Add targeted credential-free tests for the POS RPC response contract and clearly label what requires real PostgreSQL/Supabase staging.
- [x] Run `npm run lint`, `npm test -- --run`, and `npm run build`; report actual outputs in `VALIDATION-OUTPUT.txt`.
- [x] Produce the migration inventory/order, environment/Netlify setup, RLS/security notes, staging checklist, modified-file inventory, blocker report, and project ZIP.

## Initial findings and blockers

- Existing reports explicitly say the production migration is **not complete**. `PHASE8_COMPLETE_SUPABASE_MIGRATION_REPORT.md` says 76 synchronous read references remain and names Website Builder, Landing CMS, announcements, tenant/platform settings, and Super Admin operations as unresolved.
- `src/services/asyncDataService.ts` provides a single `useTenantData` snapshot hook, but most app modules still access `StorageService` synchronously. `StorageService` has a mixed legacy/confirmed-async API, so call-site migration is required rather than assuming the service name guarantees remote confirmation.
- `src/services/websiteService.ts` persists website records/reviews in localStorage or memory; `src/services/landingPageService.ts` uses synchronous platform content/revision storage.
- `src/services/publicWebsiteApi.ts` refers to `/api/public/websites/...` endpoints, but `netlify/functions/` contains only `_security.ts`, `cloudinary-sign.ts`, `send-email.ts`, and `supabase-admin.ts`; no website handler exists in the archive.
- `.env.example` has browser-public Supabase URL/anon key plus server-only secret placeholders, with no actual credentials.
- Migration filenames are unique and ordered; none has been executed here. Migration execution, actual RLS enforcement, AAL2 claims, storage policies, and Netlify integration all require later staging verification.
- Existing source-level tests and prior reports are not evidence of live PostgreSQL integration. The untouched baseline passed (42 tests); after the POS regression tests, final local checks passed (45 tests).

## Implementation strategy

Proceed by resolving high-risk correctness/security gaps in contained increments while preserving UI and existing interfaces where possible. If acceptance criterion scope cannot be completed and verified in this sandbox without risking broad application regressions, retain the code work that is safe, document exact unmet criteria, and do not claim completion.

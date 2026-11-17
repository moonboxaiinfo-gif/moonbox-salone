# Moonbox Salon — Phase 9 Continuation Report

**Source archive:** `Moonbox-Salon-Phase8-Complete-Supabase-Migration-Updated.zip`  
**Date:** 2026-11-14  
**Status:** Targeted code and handover work completed; the full Supabase migration is **not complete** and this project is **not production-ready**.

## Scope and constraints honored

The ZIP was extracted and reviewed before source edits. Existing Phase 1–8 reports, all ten migration files, the 158-file `src/` tree, package scripts, environment template, Supabase client/repository, async query layer, authentication/tenant context, public API references, website/CMS services, tests, and Netlify functions were inspected. No live Supabase project was connected, no SQL was executed, no secrets or credentials were requested or fabricated, and no deployment was performed.

The evidence-based initial checklist is in `PRE_IMPLEMENTATION_CHECKLIST.md`. The archive’s Phase 8 report states that 76 synchronous business-data read references remained and calls out unfinished Website Builder, Landing CMS, Super Admin, announcement, tenant/platform settings, and staging work. Source review confirms that local website and landing CMS persistence remain, and public website API URLs have no corresponding checked-in Netlify handlers.

## Implemented in this continuation

`src/services/supabaseRepository.ts` now explicitly interprets the JSON contract returned by `create_pos_invoice()` rather than casting the response envelope to an `Invoice`. It rejects unsuccessful/malformed responses, maps the saved invoice ID returned by the RPC, and maps the persisted row when an idempotent duplicate response includes one. This is a correctness improvement at the POS boundary; it does not fix client-supplied financial values accepted by the current SQL function.

`src/services/supabaseRepository.test.ts` adds three regression tests for successful envelope mapping, duplicate invoice mapping, and failure/malformed-response handling. Unit test count increased from 42 to 45.

`SUPABASE-SETUP-GUIDE.md` now lists all ten migrations in exact filename order and clarifies that the files have not been executed. `PRE_IMPLEMENTATION_CHECKLIST.md` records the inspection evidence and pre-edit plan. `VALIDATION-OUTPUT.txt` preserves the actual final local command output.

### Modified-file inventory

- `src/services/supabaseRepository.ts` — POS RPC envelope validation/mapping.
- `src/services/supabaseRepository.test.ts` — POS RPC mapping regressions.
- `SUPABASE-SETUP-GUIDE.md` — complete, correctly ordered migration list and execution status.
- `PRE_IMPLEMENTATION_CHECKLIST.md` — initial evidence-based inspection checklist.
- `PHASE9_IMPLEMENTATION_REPORT.md` — this report.
- `VALIDATION-OUTPUT.txt` — actual final local lint/test/build output.

All other original project files, features, routes, assets, and migrations are retained.

## Actual local test results

Commands run against the extracted project after edits:

```text
npm run lint                 PASS (tsc --noEmit)
npm test -- --run            PASS (9 test files, 45 tests)
npm run build                PASS (Vite 8.3.5)
```

The build reports a large client chunk of 1,313.63 kB (329.30 kB gzip), above Vite’s 500 kB advisory threshold. This is a warning, not a failed build. Full command output is preserved in `VALIDATION-OUTPUT.txt`.

These are local static/unit/build checks only. They are not PostgreSQL integration tests and do not prove deployed RLS or Supabase RPC behavior.

## Complete migration inventory and later execution order

The archive contains ten uniquely timestamped migration files, in this filename order:

1. `supabase/migrations/20261013000000_initial_schema.sql`
2. `supabase/migrations/20261017000000_admin_controlled_trials_and_mfa.sql`
3. `supabase/migrations/20261028000000_website_portfolio_builder.sql`
4. `supabase/migrations/20261109000000_enforce_superadmin_aal2.sql`
5. `supabase/migrations/20261109000001_landing_page_cms.sql`
6. `supabase/migrations/20261111000000_appointment_operations_hardening.sql`
7. `supabase/migrations/20261112000000_public_boundary_hardening.sql`
8. `supabase/migrations/20261113000000_auth_registration_rpc.sql`
9. `supabase/migrations/20261113000001_pos_atomic_rpc.sql`
10. `supabase/migrations/20261113000002_phase4_business_transactions.sql`

No duplicate migration timestamps were found. No migration was changed or run in this task. Confirm the target staging database’s migration history and dependency assumptions before applying anything; do not blindly replay files already applied elsewhere.

## Security and RLS review — source review only

The current source includes server-side Supabase token/platform-admin/AAL2 checks in the Supabase admin Netlify function and uses the public booking RPC boundary. The repository rechecks authenticated membership rather than retaining a cached membership authorization decision. The booking UI inspected here uses the RPC on the configured production path and does not appear to perform the post-RPC duplicate direct appointment write claimed in an older Phase 2 report; the old report is therefore not accepted as proof of current source behavior.

Still unverified/open: every table’s deployed RLS policy, role-specific owner/manager/receptionist/staff rights, AAL2 claims in the deployed function, public published-only website/CMS disclosure, notifications schema/RLS, cross-tenant denial, signed/private storage, and the full privileged operation surface. The current POS SQL checks membership and locks stock but accepts client-provided line prices and financial totals; a new reviewed additive migration is still required to establish authoritative server-side pricing and totals before production use.

## Remaining blockers — acceptance criteria not met

1. Most production business consumers still read synchronously from `StorageService` cache/local contracts. The shared `useTenantData` hook covers selected views rather than all modules; required loading/error/retry/empty/cancellation/session invalidation semantics are not complete app-wide.
2. The Website Builder (`websiteService.ts`) and Landing CMS (`landingPageService.ts`) still persist business content in localStorage/memory or synchronous platform-content cache. They are not fully wired to durable Supabase operations.
3. `src/services/publicWebsiteApi.ts` references `/api/public/websites/...` routes, but the archive has no corresponding website handlers under `netlify/functions/`. Do not assume these routes exist in deployment.
4. Super Admin, platform settings, announcements, audit and payment operations are not all converted to confirmed trusted async calls. Existing client-side role strings are not a security boundary.
5. Notification persistence is referenced by the repository/client map, but the checked-in migrations do not define a corresponding recipient-specific notifications table/policy.
6. POS amount derivation remains client-trusted in SQL despite the response handling fix. No actual inventory concurrency/rollback test was run.
7. Storage buckets and RLS/object policies are not included as verified deployable artifacts here. Payment receipts must not be exposed by public URL.
8. Staging tests are outstanding for two-tenant isolation, role matrix, membership revocation, session expiry/account switching, stale responses, booking idempotency/overlap, CMS draft privacy/publish authorization/revisions, Super Admin AAL2, payment authorization, and POS stock/financial integrity.
9. The existing bundle size warning remains; no broad code splitting was attempted in order to avoid unrelated architectural changes.

## Environment and Netlify handover

Use `.env.example` as the placeholder-only template; never check real values into source. Browser-safe variables are `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_CLOUDINARY_CLOUD_NAME`, and `VITE_SUPER_ADMIN_HOST`. Server-only variables include `SUPABASE_SERVICE_ROLE_KEY`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, and `RESEND_API_KEY`; do not prefix secrets with `VITE_`. The setup guide also documents `SUPABASE_URL`, `ALLOWED_ORIGINS`, and optional provider values needed by server functions; reconcile actual deployed function requirements in Netlify before configuring. No live credentials are included.

## VS Code / staging handover checklist

1. Verify the ZIP source revision and back up the target staging database.
2. Compare Supabase migration history against all ten files; apply only missing migrations in order after review.
3. Configure browser and server variables separately in local `.env` and Netlify settings. Never expose service-role keys to the browser.
4. Configure Auth providers, redirects, MFA, and a controlled first Super Admin; verify privileged requests reject AAL1 and non-admin sessions.
5. Create private storage buckets and least-privilege object policies; test tenant paths and signed receipt links.
6. Run SQL/RLS integration tests with separate salon accounts and each required role; add explicit draft-vs-published access tests.
7. Validate public booking, POS transactions, duplicate replay, stock concurrency, payments, and rollback paths against a disposable staging project.
8. Complete asynchronous UI migration and CMS/website server integration before marking the app ready for production.
9. Only after staging passes, review a separate release/production plan and authorize any deployment or production migration.

## Completion statement

This continuation makes a verified POS RPC response-contract correction, adds tests, and repairs migration handover documentation. It does **not** satisfy the user’s full final acceptance criteria; extensive code migration and external staging verification remain. No claim of complete Supabase migration, production readiness, successful live migration, or deployment is made.
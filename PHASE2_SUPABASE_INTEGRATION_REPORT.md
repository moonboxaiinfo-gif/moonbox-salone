# Moonbox Salon — Phase 2 Supabase Integration Report

## Executive summary

This is a **partial integration pass**, not a production-ready completion. Work was limited to code in the supplied Phase 1 archive. No SQL was run, no live Supabase or Netlify service was accessed, and no production records were changed. The repository now exposes additional awaitable Supabase CRUD operations for several current-schema entities, website/review rows, and landing-page documents; membership authorization is no longer cached in the repository across account changes. I restored the safe `.env.example` template omitted from the archive and added credential-free write/error tests.

The primary Phase 1 architectural problem remains: many screens still call synchronous `StorageService` methods, and production writes are still queued fire-and-forget with errors logged asynchronously. Those callers can continue to display success before Supabase confirms a write. `websiteService.ts` and `landingPageService.ts` remain browser-storage implementations and are **not wired** to the new repository methods. For those reasons the main objective—complete Supabase integration for every business module—has not been achieved.

## Modified files

1. `.env.example` — restored browser-safe Supabase URL/anon key, Cloudinary public cloud name, Super Admin host, and server-only secret placeholders. No credentials were added.
2. `src/services/supabaseRepository.ts` — membership authorization is fetched afresh per operation; added awaited insert/update/delete primitives and operations for expense/commission CRUD, support tickets, manual payment writes, appointment status, service/product categories, stock movements, announcements, website configurations/reviews, and landing-page draft/published documents. These are repository capabilities only; existing UI/service workflows are not all connected to them.
3. `src/services/supabaseRepository.crud.test.ts` — new isolated tests for an expense write/map, membership rejection, database write failure propagation, and empty-result delete failure.
4. `PHASE2_SUPABASE_INTEGRATION_REPORT.md` — this report.

No source files were deleted. No migrations were added, altered, or executed.

## Modules fully integrated

**None of the requested modules can be certified fully integrated end-to-end by this pass.** The repository has additional CRUD capabilities, but its consumers are not consistently awaiting those operations. Tenant membership checks in the browser do not replace server-side RLS, and live policy behavior was not tested.

Existing code does contain Supabase login/profile resolution, registration RPC, public booking RPC, and POS RPC paths. Source review does not establish that their complete user workflows are safe or production-ready; see incomplete items and security findings below.

## Modules still incomplete

- **Core repository/StorageService integration:** only part of entity CRUD is implemented; storage/bootstrap uses an in-memory cache. Existing synchronous methods still write cache state immediately and queue remote persistence without returning the remote result. Not every entity/mutation has a Supabase operation, and callers are not comprehensively async.
- **Website Builder and reviews:** `websiteService.ts` still reads/writes browser storage. New repository helpers for website config/reviews are not called by that service or its components. Public publishing/review moderation status and error states remain unconverted.
- **Landing-page CMS:** `landingPageService.ts`, `LandingPageEditor`, and public landing components still use `StorageService` platform-content methods, not `landing_page_documents`. CMS media metadata exists in a migration, but durable media upload/storage is not connected.
- **Expenses, commissions, manual payments, support tickets:** repository operations are incomplete as a flow and are not wired to forms/lists. Existing UI write calls remain synchronous. Manual-payment approval/rejection/Super Admin workflows have not been converted or tested end-to-end.
- **Notifications:** initial schema migrations do not define the `notifications` table referenced by `tableFor`; no verified notification persistence, recipient model, or RLS policy is available. Notification context remains storage-backed.
- **Announcements:** repository methods now exist, but the Super Admin announcement manager and salon notification/read path remain storage-backed; global authorization behavior is not exercised.
- **Super Admin and subscription operations:** trial grant/revoke/extend, plan assignment, salon approval/suspension, payment approval, audit logs, and platform settings still use existing sync storage paths or separate RPC patterns. They are not comprehensively converted to awaited operations.
- **Registration/trial/subscription:** source has an authenticated registration RPC and trial/admin RPC migrations, but the full account confirmation, membership bootstrap, plan/payment approval, rollback, and failure-state workflows have not been tested. No migration was applied to any database.
- **POS:** SQL contains a transaction-scoped invoice/stock RPC, but POS still calls synchronous `StorageService.createInvoice`; its remote call is queued. Repository currently treats the RPC JSON response as `Invoice` even though SQL returns an envelope (`success`, `invoice_id`/`duplicate`, and sometimes `invoice`), so it must be parsed before a saved invoice/receipt can be trusted. No concurrent stock test or live RPC test ran.
- **Public booking:** both `PublicBookingFlow` and `PublicBookingPage` call the booking API in Supabase mode, but after the RPC they also call `StorageService.saveCustomer` and `StorageService.saveAppointment`. In configured mode those appointment writes queue a second appointment upsert. This path needs removal/rework before production. No concurrent-booking test ran.
- **Async UI states and authorization:** dependent components have not all been changed to explicit loading/error/empty/success states. Owner/manager/receptionist/staff permission coverage is absent; RLS is the authoritative server-side enforcement and has not been tested with role accounts.
- **Storage/image uploads and receipt privacy:** no new storage wiring was completed. The prior report notes Cloudinary receipt URLs are not private merely because uploads are signed; this remains unresolved.

## Repository CRUD and tests

This pass adds awaited repository functions, not coverage for every CRUD operation. Automated tests exercise four new cases plus the three pre-existing mapping/tenant predicate tests. They do **not** test every entity's create/read/update/delete, an actual transaction rollback, independent salon sessions against RLS, roles, concurrent booking, or concurrent POS stock.

## Security and correctness issues discovered

1. **False-success risk:** synchronous `StorageService` operations return before queued Supabase operations settle. Components may report success and render local data despite rejected writes. Logging the eventual error is not equivalent to an error state or rollback.
2. **Booking duplicate write:** public booking RPC results are followed by local `saveAppointment`; in production this can queue another database upsert, potentially creating a duplicate appointment or returning an error after a booking already succeeded.
3. **POS response mismatch:** `create_pos_invoice` returns an envelope, not an `Invoice` row, while the repository casts the envelope directly to `Invoice`. POS callers also do not await the RPC result. Receipt creation/success handling cannot safely rely on this response.
4. **POS financial trust boundary:** the SQL RPC checks membership and locks/validates stock, but accepts client-supplied item prices/totals and does not recompute financial totals from authoritative service/product prices. A modified client can submit forged amounts. Review and remediate in a new migration before production.
5. **Role authorization:** the repository membership check proves active membership, not owner/manager/receptionist/staff permissions. Ensure database policies/RPC checks enforce each operation's role. This code pass did not test that they do.
6. **Notifications schema gap:** the client table map names a `notifications` table, but the checked-in migration set does not create it or a recipient-aware RLS policy. Do not rely on it in production until designed and migrated.
7. **Membership/session boundary:** the repository previously cached tenant IDs for its lifetime. This pass removes that cache, reducing stale authorization after account switching/revocation. RLS remains essential; no live test was possible.
8. **Storage privacy:** Cloudinary receipt URLs may be publicly deliverable; use a private bucket and short-lived authorized URLs or a protected delivery endpoint.
9. **Client configuration:** Supabase anon key and URL are browser-public by design; service-role key must only be used by server-side functions. The restored template makes that distinction explicit. No secret value was added to client code.
10. **MFA/RLS/live status:** project migrations define AAL2-aware Super Admin checks, but their deployment state and production enforcement are unknown because the live database was not contacted.

## Database migrations required

- **No migration was added in this pass.** The existing repository contains migrations through `20261113000001_pos_atomic_rpc.sql`; these are source files only and none were applied.
- A deployment environment must apply the existing migrations in dependency order (including the registration, public-boundary hardening, AAL2, appointment hardening, landing CMS, and POS atomic RPC migrations) after review/backups in a separate staging Supabase project. The project’s Phase 1 report lists the three newly introduced migration files that were still pending there; it is not evidence they exist in the live project.
- A new migration is required if persistent notifications are retained: create a recipient/salon-scoped model, indexes, and least-privilege RLS policies. Confirm whether the support-ticket workflow requires `waiting_for_customer`, which its TypeScript type permits but the initial SQL check constraint does not.
- Before deployment, write and review an additive migration (or a code-only remapping) for any RPC response/role/price-validation changes. Do not edit already-applied migrations. The POS authoritative-pricing validation and any uniqueness/idempotency refinements need staging validation first.
- Website and landing CMS tables already have checked-in migrations, but this frontend does not yet use them. Media storage bucket/policies and authorized upload/download routes still need design/deployment if CMS media is to be durable and private.

## Verification performed

- `npm ci --no-audit --no-fund` — passed (336 packages installed). It reported a deprecation notice for `node-domexception`.
- Baseline before `.env.example` restoration — TypeScript passed; tests failed because `.env.example` was missing from the supplied archive (26 passed, 1 failed of 27); build did not execute in that chained command.
- `npm run lint` — passed (`tsc --noEmit`).
- `npm test -- --run` — **6 test files passed, 31 tests passed, 0 failed**.
- `npm run build` — passed. Vite built successfully; emitted a large chunk advisory for the 1,300.08 kB minified JS chunk.
- Source/schema review — performed against the supplied files only.

Not tested: Supabase connectivity, migrations against a disposable or live database, actual RLS isolation, two salon accounts, roles, signup email confirmation, subscription payments/approval, public concurrent booking, POS concurrency/rollback, live storage policy, Netlify deployment, or production website publishing. No claim is made that any of those were tested.

## Exact blockers before production deployment

1. Wire all business reads/writes to async repository calls and only show success after confirmed server success; remove fire-and-forget persistence and add explicit failure handling/rollback.
2. Migrate `websiteService.ts` and `landingPageService.ts` and update every dependent component for asynchronous loading and error/empty/success states.
3. Finish CRUD and UI integration for expense categories/expenses, commissions, manual payments and approval, support tickets/messages, announcements, notifications (including schema/RLS), and Super Admin operations.
4. Remove the post-RPC direct booking writes from both public booking flows and add safe UI handling for duplicate/idempotent RPC responses.
5. Parse the POS RPC response correctly; make POS await persistence and confirm all permissions. Recompute price/discount/tax/total server-side from tenant-owned catalog data and test rollback/concurrent stock in staging.
6. Verify RLS for two distinct salons and each required role; fix policies/RPC role checks where tests show access exceeds intended permissions.
7. Decide whether `waiting_for_customer` is allowed and reconcile the TypeScript status with the database constraint using a reviewed migration if needed.
8. Apply the required migration chain only to a disposable staging Supabase project first; verify registration, MFA Super Admin approval, subscriptions, booking idempotency/overlap, and POS consistency there. No live SQL has been run.
9. Replace public Cloudinary receipt access with an authorized private delivery strategy and configure/verify storage policies.
10. Complete Netlify environment/function and deployed-route checks with deployment credentials and explicit release authorization. These were not available/used in this pass.

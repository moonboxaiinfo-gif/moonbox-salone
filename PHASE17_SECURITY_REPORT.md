# Phase 17 Security & Integration Report

## Summary

The uploaded project has been updated for a Supabase + Netlify deployment boundary. This is a source-code hardening and integration pass, not a claim that a live Supabase/Netlify deployment has been configured or proven secure. No external credentials were supplied, and no database migration was run against a live or staging project.

## Implemented

- Added Netlify `public-api` routes for whitelisted published-site reads, owner/manager-authorized draft reads and writes, publishing/unpublishing, review moderation/deletion, public review submission and an authoritative booking-RPC fallback. Client-supplied tenant folders, HTML, or published content are not trusted.
- Restricted public database access to salon, staff, customer, appointment, website configuration, and review rows. Added plan-entitlement checks, AAL2-gated platform-administrator RLS, appointment time-window/hours/overlap/phone-rate validation, and staff/customer plan row limits in the additive Phase 17 Supabase migration.
- Changed Cloudinary signing to require an authenticated active salon owner/manager, an entitled tenant, a server-derived tenant folder, and a limited image-format allow-list. Financial receipts are no longer accepted by the Cloudinary signer.
- Moved new bank payment receipts to a private `payment-receipts` Supabase Storage bucket, with owner-only uploads, tenant-scoped paths, MIME/size limits, restricted payment writes, and a five-minute signed-link endpoint that requires a verified AAL2 platform administrator.
- Replaced the arbitrary Resend relay with a one-time booking-confirmation template whose recipient and content come from a recent saved appointment. Added unique dispatch records to prevent replay.
- Connected production website drafts and review moderation to authenticated server operations. Made public review submission rate-limited, pending by default, and unable to self-verify; moderator updates are attributed and source review fields are immutable to clients.
- Updated deployment/environment documentation, strict browser security headers/CSP, and regression tests.

## Local verification

- `npm run lint` — passed (TypeScript no-emit).
- `npm test -- --run` — passed: **14 test files, 78 tests**.
- `npm run build` — passed.
- `npm run audit:prod` — passed: **0 production dependency vulnerabilities** at audit time.
- Phase 17 migration parsed as **109 top-level PostgreSQL statements** using `pglast`. This parser pass does not execute or validate PL/pgSQL behavior against a real Supabase schema.

The production build still emits an existing large JavaScript-chunk advisory (about 1.35 MB minified). It does not fail the build, but code-splitting/performance follow-up remains desirable.

## Follow-up migration transaction review — 2026-11-17

- Moved the existing `COMMIT;` from after the Phase 17 function comments to the absolute end of `supabase/migrations/20261117000000_phase17_security_boundaries.sql`. The formerly out-of-transaction statements are the private receipt bucket upsert, two Storage policies, manual-payment policies and validation trigger, and website-review moderator policy and immutability trigger. Their order and SQL are unchanged.
- Confirmed the Phase 17 file has exactly one top-level `BEGIN;` and one `COMMIT;`; `COMMIT;` is the final SQL statement. Added a regression assertion to `src/services/phase17Security.test.ts`.
- Reviewed Phase 17 policy replacement and dependencies: old policies are explicitly dropped or removed by table-scoped policy loops before replacement; its new service/product-category member SELECT policies do not duplicate policies created in earlier migrations. The migration requires the initial schema, Phase 4 notification/business objects, Phase 12 appointment columns and helpers, and Phase 13 owner/payment/POS corrections; the inventory places it last.
- Reviewed grants and RLS: the new email-dispatch and review-rate-limit tables enable RLS, revoke client/PUBLIC access, and grant access to `service_role`; the rate-limit RPC is likewise service-role-only. The feature helper is executable by authenticated users because policy expressions use it. Storage receipt access is restricted by a private bucket, salon-owner upload path checks, owner/AAL2-admin read checks, and no Phase 17 update/delete policy. Before applying to any existing project, check `storage.objects` for unrelated permissive policies that could widen access; that catalog was not part of this local-only follow-up.
- Reviewed all 13 migrations in filename order. No other migration has explicit transaction markers, and no `CREATE INDEX CONCURRENTLY`/`REINDEX CONCURRENTLY` statement was found. The remaining files use sequential dependencies from the initial schema through Phase 17; local review cannot prove execution against an actual database schema or data set.
- Follow-up validation: `git diff --check` passed; focused migration tests passed (**2 files, 12 tests**); `npm run lint` passed; `npm run build` passed with the existing large-chunk advisory. An initial lint run caught an unsafe indexed access in the new test assertion; the assertion was corrected and the final lint rerun passed.
- No remote migration, SQL write, deployment, commit, or push was performed.

## Required before production

1. Review the Phase 17 migration against the exact existing Supabase migration history, take a backup, apply it only to a disposable staging project first, and run two-tenant/RLS/AAL2/booking/POS/payment/review/storage acceptance tests. No migration was automatically applied.
2. Configure Netlify server-only variables from `.env.example`, including the Supabase service-role key, Cloudinary credentials, Resend credentials, `ALLOWED_ORIGINS`, and a random `RATE_LIMIT_HMAC_SECRET` of at least 32 characters. Configure `VITE_SUPABASE_URL` and the public anon key only as browser-safe build variables.
3. Configure/authenticate Supabase MFA and validate that AAL1 platform administrators are denied and AAL2 users are accepted. Configure the private Storage bucket/policies through the reviewed migration and verify owner upload and unauthorized-user denial.
4. Existing payment receipts that were previously stored as public Cloudinary URLs are **not** retroactively made private by this source change. They must be removed from the old Cloudinary account and re-uploaded into private Supabase Storage. No Cloudinary credentials were available here to delete or revoke existing objects.
5. The broader Phase 16 findings about remaining synchronous/local persistence in support, subscription/payment, announcements, platform settings and parts of Super Admin, as well as the Landing CMS, are not all resolved by this pass. Browser-rendered end-to-end tests and a live staged release verification remain outstanding.

**Release status: NOT YET PRODUCTION-READY.** The delivered code has improved boundaries and passes local checks, but credentials, migration rollout, legacy receipt cleanup, full-module data-layer conversion, and staging security testing are still prerequisites.

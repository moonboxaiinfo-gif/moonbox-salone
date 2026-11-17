# Phase 16 Remaining Blockers

## High-priority code blockers

1. **Public website API:** `src/services/publicWebsiteApi.ts` references website route handlers not present in the archive. Implement authenticated publish/unpublish, published-only public retrieval, public review submission, and safe booking fallback or fail closed.
2. **CMS persistence:** `websiteService.ts` and `landingPageService.ts` still persist drafts/reviews/revisions in localStorage or memory; replace with awaited Supabase/server operations and visible failure states.
3. **Private storage:** no verified Supabase Storage bucket/object policies or private receipt signed-delivery flow. Current upload/receipt URL paths are not proven private. Cloudinary signer also needs auth, tenant-bound folder generation, CORS allowlisting, file constraints, and review.
4. **Application-wide async migration:** salon profile and online-booking settings now await confirmed repository writes, but support, subscription/payment, announcements, platform settings, several Super Admin pages, and other data screens retain synchronous cache paths or confirmed-operation gaps.
5. **Role/policy completeness:** validate all roles across customer, appointment, inventory, invoices, commissions, expenses, payments, support, notifications, audit, CMS, and storage. Replace existing permissive policies, not just add new permissive ones.
6. **Audit completeness:** make sensitive tenant, membership, subscription, payment, CMS, website, financial, and admin writes generate authoritative, checked/transactional audit rows.
7. **Browser tests:** no configured mounted React/browser suite exists in the archive; login through Super Admin and all requested modules/state transitions remain untested.

## Database/staging blockers

- New Phase 13 SQL is source-only: no PostgreSQL parser/runtime or migration was used. Review function typing/search path/ownership, data compatibility, ACL interactions, and policy behavior in a disposable staging database.
- Compare the actual `schema_migrations` history before applying the new migration. No migration was executed here.
- Run two-tenant role tests; inactive/revoked membership and session switching; forged POS totals and payment review; stock concurrency/rollback; booking idempotency/overlap; CMS draft privacy; private file access; recipient-specific notifications.
- Verify AAL1 rejection/AAL2 acceptance for every privileged function, not only the payment review function in source.
- Validate local timezone, appointment advance notice, booking horizon, holidays/exceptions, and legacy empty hours with product owners and actual staging rows.

## External configuration blockers

Real Supabase/Netlify credentials, Auth redirect/MFA setup, first Super Admin bootstrap, Storage provider configuration, actual migration rollout, and any deployment require the user’s controlled environment and explicit release process. None was supplied, used, or fabricated.

**Status:** release blocked; production readiness NOT CLAIMED.

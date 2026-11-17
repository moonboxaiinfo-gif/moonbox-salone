# Phase 10 Remaining Blockers

Phase 10 is **not complete**. The following blockers remain after the async foundation change:

1. **Legacy synchronous consumers remain.** The audit found 151 non-test `StorageService` references. Exact files are listed in `PHASE10_PRE_IMPLEMENTATION_CHECKLIST.md`; the largest groups are salon modules, public booking/portfolio, website tabs, subscription, and Super Admin.
2. **TenantContext is still synchronous.** It reads and writes tenant records through `StorageService`; it needs an awaited repository-backed tenant loader and confirmed tenant-settings mutation path.
3. **NotificationContext is still synchronous.** Notification persistence and recipient-specific schema/RLS were not verified in the checked-in migrations.
4. **Website Builder and Landing CMS are not fully durable.** `websiteService.ts` still contains local compatibility paths and `landingPageService.ts` still uses local platform content/revisions. These require a dedicated CMS phase.
5. **Public website API handlers are absent.** `src/services/publicWebsiteApi.ts` references `/api/public/websites/...`, but matching checked-in Netlify handlers were not found.
6. **Super Admin mutations are not fully migrated.** Trial, plan, tenant, announcement, platform-settings, audit, support, and payment flows require trusted server/RPC contracts and deployed AAL2/RLS verification.
7. **POS financial authority remains open.** The current `create_pos_invoice()` path still accepts client-provided pricing/totals according to the Phase 9 review. The response-envelope fix is not server-side price derivation.
8. **No live integration evidence exists.** Cross-tenant denial, membership revocation, session expiry, RLS, storage privacy, booking overlap/idempotency, stock concurrency, and MFA AAL2 require a disposable staging Supabase project.
9. **Demo fixtures are still used by existing local-mode tests and compatibility UI.** No production seeding occurs, but a repeatable staging seed/reset script has not yet been added.
10. **Bundle-size advisory remains.** The existing large-client-chunk warning was not addressed in this architecture-focused phase.

These blockers are intentionally explicit; this report does not claim production readiness.

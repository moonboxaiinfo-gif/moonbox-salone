# Moonbox Salon — Final Project Status

**Status:** Partial Phase 13–16 continuation plus local security/database follow-on work; **not code-complete and not production-ready**.
**Source:** supplied Phase 12 ZIP.  
**Database:** the local source tree currently contains 15 migrations. This task did not query or change the remote database; earlier remote status statements describe an older 13-migration source tree and must be rechecked before applying anything.
**Deployment:** none.  
**Credentials:** none requested, created, or included.

## Delivered in this archive

- Additive Phase 13 POS/security migration source with server-derived prices/totals, stock transaction handling, commission writes, duplicate invoice protection, customer ownership checks, and targeted invoice/membership/payment-review policy/function changes.
- Async tenant-resource coverage for product/stock, expense/category, and commission reads; associated inventory/POS/expense/commission screens now display loading/error/retry states and reconcile after confirmed writes.
- Product quantity changes routed through stock-movement operations; opening stock uses the server-returned product ID and avoids the previous direct quantity plus movement double count.
- Salon profile and online-booking settings now wait for the repository’s confirmed Supabase update, disable repeat submission, and show persistence errors.
- Empty browser/server environment template, migration/source-contract regression coverage, and phase/security/staging/handover documents.

## Local checks

See `PHASE16_TEST_RESULTS.md` for exact baseline and final command output. Local lint/tests/build do not establish deployed Postgres security, role behavior, Storage privacy, MFA, or end-to-end readiness.

## Definition-of-done gaps

- Async Supabase migration is not application-wide; legacy sync/cache paths remain in other modules.
- Website Builder and Landing CMS still use local storage/memory paths; public API handlers are absent.
- Private Supabase Storage architecture and payment receipt protections are not delivered; Cloudinary signer requires remediation.
- Super Admin/platform/announcements/audit flows and the complete owner/manager/receptionist/staff permissions matrix are not finished.
- New SQL was not parsed/applied; no staging role, tenant, concurrency, MFA, booking, payment, CMS privacy, or storage tests were run.
- No browser-level module test suite was added or run.
- A new local additive migration covers explicit Staff assignment, assigned-record access, support-ticket creation attribution, subscription expiry, commission settlement, and plan-limit enforcement; it has not been executed against PostgreSQL.
- Custom-domain ownership verification, Staff Auth invitation/provisioning, and full async persistence for CMS/website/platform flows remain open items.

## Next steps

Continue using the existing linked project for read-only checks only. Do not create a second Supabase project. Resolve the listed local blockers, validate SQL and role behavior without writing to production, and obtain explicit approval before any production migration apply or deployment.

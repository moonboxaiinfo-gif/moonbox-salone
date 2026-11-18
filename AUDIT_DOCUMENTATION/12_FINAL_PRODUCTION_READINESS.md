# 12 - Final Production Readiness

## Executive decision

# NOT READY FOR PRODUCTION

The source is substantially hardened and passes local lint, build, and unit/source-contract tests, but the remote database and deployed environment were not inspected or tested. No production approval is supported by a successful build alone.

## Findings status

### Verified working

- Git worktree is clean.
- TypeScript/lint passes.
- 15 test files and 93 tests pass.
- Vite production build passes.
- Source code contains explicit tenant and role checks.
- Source migrations contain RLS, grants, transaction boundaries, private Storage definitions, and AAL2 helper logic.
- No service-role key or secret was found in browser client configuration.

### Verified defective

- Dual public-data architecture: Supabase/Netlify and MySQL/Express can diverge.
- Super Admin lifecycle writes are not wrapped in one database transaction.

### Not verified

- Remote migration history and live schema.
- Applied RLS policies, grants, triggers, functions, and indexes.
- Cross-tenant isolation.
- Private payment receipt bucket and signed URL.
- Super Admin MFA/AAL2 in deployment.
- Netlify routing, CORS, environment variables, and public booking.

### Requires isolated runtime testing

- Migration execution and rollback.
- Role matrix.
- Storage matrix.
- POS/stock concurrency.
- Public booking race/idempotency.
- Trial/payment lifecycle.
- Payment approval atomicity.
- CMS/public review/public portfolio flows.
- Restore and monitoring.

### Requires production owner approval

- Any migration application.
- First Super Admin enrollment and MFA setup.
- Storage bucket/policy creation or changes.
- Deployment to Netlify.
- Deployment of an Express/Render backend.
- Production environment secret configuration.
- DNS/custom-domain activation.

## Issue counts

| Severity | Count |
|---|---:|
| CRITICAL | 1 |
| HIGH | 5 |
| MEDIUM | 4 |
| LOW | 1 |
| INFORMATIONAL | 0 |
| **Total** | **11** |

Counts represent distinct audit findings:

- MBX-AUD-001: unknown remote migration state.
- MBX-AUD-002: dual public-data architecture.
- MBX-AUD-003: live cross-tenant RLS.
- MBX-AUD-004: live Storage privacy.
- MBX-AUD-005: live AAL2.
- MBX-AUD-006: direct admin lifecycle writes.
- MBX-AUD-007: overlapping migration helper replacements.
- MBX-AUD-008: trial implementation consistency.
- MBX-AUD-009: bundle size.
- MBX-AUD-010: lack of live integration coverage.
- MBX-AUD-011: recovery/monitoring evidence.

## Other requested totals

- Missing database objects: not verified.
- Software/database mismatches: 2 source-level findings.
- Security vulnerabilities: 4 live-verification or hardening findings; no live exploit claim.
- Features requiring testing: all production modules in the feature inventory.

## Recommended correction order

1. Establish an approved staging database copy and verify remote migration/schema history read-only.
2. Execute migration set in staging and inspect final catalog/RLS/grants/functions/triggers/storage.
3. Implement and test atomic database RPC lifecycle operations for trials, package assignment, suspension, and payment review.
4. Remove or isolate the MySQL public backend.
5. Run the two-salon role and RPC/Storage security matrix.
6. Test AAL2 and private receipt behavior.
7. Run public booking, POS, stock, payment, and subscription concurrency tests.
8. Add browser end-to-end coverage.
9. Configure monitoring, backup/PITR restore test, and Netlify custom-domain readiness.
10. Obtain production owner approval and perform a reviewed, backed-up migration/deployment.

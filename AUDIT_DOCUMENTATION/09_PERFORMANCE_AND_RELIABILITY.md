# 09 - Performance and Reliability

## Positive findings

- Tenant snapshot loads resources in parallel.
- AbortSignal and session-generation cache invalidation are implemented.
- Database migrations include indexes for tenant, status, date, membership, notification, appointment, and payment objects.
- POS, stock, status-history, public booking, and duplicate invoice operations use database locks or idempotency/RPC patterns.
- The build is successful and local tests are fast.

## Findings

### MBX-AUD-009 - MEDIUM

- **Exact path:** `package.json`, Vite build output
- **Description:** The production JavaScript bundle is approximately 1.35 MB and Vite reports a chunk-size warning.
- **Evidence:** Build transformed 2,215 modules and produced a 1,352.82 KB main JavaScript chunk.
- **Business impact:** Slower first-load performance on constrained networks.
- **Technical impact:** Main-thread parse cost and cache invalidation can affect perceived reliability.
- **Recommended solution:** Route-based code splitting and lazy loading for super-admin, CMS, reports, and website-builder modules.
- **Verification procedure:** Rebuild and verify route chunks, Lighthouse/field performance, and maximum chunk threshold.

### MBX-AUD-010 - MEDIUM

- **Exact path:** `src/services/*.test.ts`
- **Description:** Tests are source-contract and mock-oriented, not live PostgreSQL/browser integration tests.
- **Evidence:** 93 Vitest tests pass, but no RLS, AAL2, Storage, remote migration, or deployed browser test is present in the evidence.
- **Business impact:** Local success may mask tenant or payment defects.
- **Technical impact:** SQL execution, role grants, Storage metadata, and Netlify routing remain untested.
- **Recommended solution:** Add disposable staging integration and browser end-to-end suites.
- **Verification procedure:** Execute two-salon role matrix, RPC conflict cases, and Netlify function cases in staging.

### MBX-AUD-011 - LOW

- **Exact path:** Repository and deployment configuration
- **Description:** No verified backup/recovery or monitoring configuration was found in the audited evidence.
- **Business impact:** Recovery from migration or data failure is unproven.
- **Technical impact:** No verified RPO/RTO, point-in-time recovery, alerting, or restore-runbook evidence.
- **Recommended solution:** Document backup/PITR policy and add health/error monitoring.
- **Verification procedure:** Execute an approved restore drill in staging and record RPO/RTO.


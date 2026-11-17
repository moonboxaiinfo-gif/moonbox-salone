# Phase 13 Database Security Report

## Scope and evidence

This is a source-level review of the supplied migrations and the new additive migration `supabase/migrations/20261116000000_phase13_pos_authoritative.sql`. No Supabase project was connected; no migration history, effective database grants, deployed RLS, Storage bucket, or PostgreSQL runtime behavior was inspected.

## Targeted code changes

- POS: `create_pos_invoice(UUID, JSONB)` derives prices from tenant-owned services/products, validates customer and staff IDs against the salon, validates service qualification where configured, applies bounded discount and salon-configured tax calculations, derives final paid/balance values, and writes invoice, stock movement, commission, and customer totals in one transaction. Product stock rows are locked in deterministic order and aggregate quantities are checked before stock is changed.
- Duplicate invoice retries: per-salon/invoice-number transaction advisory lock and existing-invoice return.
- Invoice write boundary: removes the broad member-management policy and revokes authenticated INSERT/UPDATE/DELETE on invoices; existing invoice SELECT policy remains.
- Membership administration: replaces the legacy manager-or-owner `FOR ALL` policy with an owner-only helper; directory reads retain the original member policy.
- Manual payment review: preserves AAL2 and pending-only checks; assigns `auth.uid()` to UUID `reviewed_by`, and raises if the subscription row is absent on approval.

Focused source review also found that commission monetary columns were narrower than invoice columns and that the initial accepted total bound exceeded the invoice column capacity. The new source uses unbounded intermediate numerics, checks all invoice amounts against `NUMERIC(12,2)` limits before insertion, widens commission amount columns to `NUMERIC(12,2)`, and explicitly replaces the newly named membership policy before creating it. These fixes were reviewed from source only, not parsed or executed by PostgreSQL.

## Partial role matrix (source intent, not live-verified)

| Actor | Targeted permission in the new migration | Still outstanding |
|---|---|---|
| Salon Owner | Can administer memberships and use existing `sell` permission | Verify complete owner access and policy interactions in PostgreSQL |
| Manager | `sell` remains available through existing permission helper; membership administration removed | Audit direct customer/appointment/financial/admin table policies and all privileged operations |
| Receptionist | Existing helper permits `sell`; no new membership control | Verify approved POS/appointment/customer scope and direct DML limits |
| Staff | Existing helper permits `sell`; no new membership control | Verify financial restrictions and appointment/customer scope |
| Super Admin | Payment review requires `is_super_admin()` and AAL2; owner policy helper accepts existing Super Admin helper | Validate AAL1/AAL2 claims, all privileged operations, and tenant/platform audit trail |
| Anonymous visitor | Existing public booking RPC remains separately granted; no new public grants added | Public website handlers and published-only behavior remain absent from this implementation |

The source still contains broad legacy policies outside the targeted invoice and membership changes. A `CREATE POLICY` addition would OR with existing permissive policies, so any further hardening must replace named permissive policies after schema/history review.

## Required staging verification (NOT RUN)

1. Compare the database’s `supabase_migrations.schema_migrations` history with the 12 source migrations before applying any file.
2. In a disposable staging project, verify all function signatures, SQL parsing, grants, and owner/security-definer behavior.
3. Exercise forged item prices/totals, invalid quantities, cross-tenant customer/staff/product/service IDs, invoice replay, repeated product lines, concurrent stock sales, and rollback after a failing movement/commission insert.
4. Test owner/manager/receptionist/staff cross-tenant reads/writes and membership revocation; explicitly attempt direct invoice DML.
5. Test payment review with Super Admin AAL1/AAL2, rejected/approved transition, missing subscription behavior, and audit insertion.
6. Verify existing data compatibility and UI workflows before any staging rollout.

**Status:** Code artifacts present; local source-contract tests pass; database/staging verification NOT RUN. Do not treat this report as proof of deployed security.

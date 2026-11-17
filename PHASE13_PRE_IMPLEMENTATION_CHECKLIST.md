# Phase 13–16 Pre-Implementation Checklist

## Source and preservation

- [x] Extract the supplied Phase 12 ZIP to a clean workspace; project root is `moonbox-salon/`.
- [x] Review Phase 12 implementation report, remaining blockers, migration inventory, and test results.
- [x] Inventory package scripts, `.env.example`, Supabase migrations, repository, async resource layer, storage service, relevant components, and Netlify functions.
- [x] Preserve prior migrations; new database changes are additive in `20261116000000_phase13_pos_authoritative.sql`.
- [x] No production project, SQL connection, or deploy action was used.

## Source review findings informing implementation

- Baseline POS RPC locks products and decrements stock atomically but persists client-supplied prices/financial totals; invoice RLS had a broad member `FOR ALL` policy.
- Existing `review_manual_payment` writes JWT email to UUID `reviewed_by`.
- Membership `FOR ALL` policy used `is_salon_manager_or_owner`, despite `has_salon_permission('manage_members')` being owner-only.
- Phase 12 async resources covered customers/catalog/staff/appointments/invoices but not inventory/expenses/commissions.
- Inventory/POS/expense/commission list consumers used synchronous storage getters; initial product save followed by stock movement had separate operations and a client placeholder ID.
- Website and Landing CMS services remain localStorage/memory-based; no matching website Netlify handlers are present.
- Cloudinary signer accepts a caller folder, has wildcard CORS, and does not show tenant/user authorization; private storage is not established.

## Baseline validation before edits

- [x] `npm ci --no-audit --no-fund` completed successfully (336 packages; one deprecated `node-domexception` notice).
- [x] `npm run lint` — PASS.
- [x] `npm test -- --run` — PASS, 12 files / 68 tests.
- [x] `npm run build` — PASS; existing Vite large-chunk advisory noted.

## Implementation sequence and guardrails

1. Add async resources for inventory, expenses, and commissions and migrate their major consumers.
2. Close the POS authoritative pricing/total and direct invoice DML gaps via an additive migration; correct the payment actor type and membership policy scope.
3. Add local source-contract tests; run lint/tests/build.
4. Document missing Phase 15/16 work as blockers rather than claiming end-to-end completion.
5. Package source, assets, tests, migrations, templates, and reports without `node_modules`, build output, credentials, or temporary artifacts.

## Remaining inspection gaps

A complete audit of every production source path and every RLS/grant/function is still outstanding. No actual migration history or live policy can be checked without the user’s controlled staging credentials. No SQL execution or deployment is authorized by this task.

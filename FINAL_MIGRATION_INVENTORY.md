# Final Migration Inventory

This inventory is the source tree’s filename order. It is **not** a claim that these migrations have been applied to any database. This local workspace contains 15 migrations. Remote migration history has not been rechecked during this local-only architecture task; compare every file with the target project's migration table and inspect schema/data compatibility before execution. Do not create a second Supabase project or apply migrations without explicit approval.

1. `supabase/migrations/20261013000000_initial_schema.sql` — base schema, core RLS/policies, and tenant tables.
2. `supabase/migrations/20261017000000_admin_controlled_trials_and_mfa.sql` — subscription/trial controls and MFA-related functions.
3. `supabase/migrations/20261028000000_website_portfolio_builder.sql` — website config and reviews.
4. `supabase/migrations/20261109000000_enforce_superadmin_aal2.sql` — Super Admin AAL2 helper.
5. `supabase/migrations/20261109000001_landing_page_cms.sql` — landing CMS documents/media metadata and RLS.
6. `supabase/migrations/20261111000000_appointment_operations_hardening.sql` — status history and overlap/operation safeguards.
7. `supabase/migrations/20261112000000_public_boundary_hardening.sql` — public booking boundary and related policies.
8. `supabase/migrations/20261113000000_auth_registration_rpc.sql` — authenticated salon registration.
9. `supabase/migrations/20261113000001_pos_atomic_rpc.sql` — original atomic POS RPC; accepts client financial values and is replaced by the Phase 13 migration below.
10. `supabase/migrations/20261113000002_phase4_business_transactions.sql` — business RPCs, notifications, stock movement, payment review, support message, notification read.
11. `supabase/migrations/20261114000000_phase12_domain_integrity.sql` — additive service/staff/appointment integrity and public booking replacement.
12. `supabase/migrations/20261116000000_phase13_pos_authoritative.sql` — authoritative POS, invoice DML closure, membership policy correction, payment reviewed_by correction.
13. `supabase/migrations/20261117000000_phase17_security_boundaries.sql` — additive production-boundary hardening for platform admin, public database access, website publication, online booking throttling, payment receipts, and plan entitlements.
14. `supabase/migrations/20261117180000_phase1_security_corrections.sql` — forward-only role, tenant-isolation, server-side customer/appointment authorization, finance/report entitlement, support-message attribution, and plan-limit corrections approved after the Phase 1 audit.
15. `supabase/migrations/20261117190000_database_architecture_completion.sql` — trial-expiry authority, explicit Staff Auth assignment and assigned-record reads, role-scoped operational policies/RPCs, support-ticket creation attribution, commission settlement, and active-row plan-limit enforcement.

## Before any apply

- Confirm the target project's actual migration table and any manually applied SQL; do not blindly replay. Prior read-only reports referred to the earlier 13-file source tree and must not be used as current remote status.
- Inspect `CREATE OR REPLACE` signatures, function owner/security-definer privileges, table grants, policies, extension/function availability, existing data, and constraint compatibility.
- Validate the SQL and rollback/restore procedures without writing to the target. A local PostgreSQL test harness has not yet run the migration set; source-contract tests are not SQL execution.
- A read-only Supabase CLI dry run lists pending files but does not parse or execute their SQL. Obtain explicit approval before any migration apply.
- Back up the target under the approved operational process before any approved migration apply; do not assume a SQL migration can be automatically reversed.

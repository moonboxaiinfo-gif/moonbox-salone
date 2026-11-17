# Final Migration Inventory

This inventory is the source tree’s filename order. It is **not** a claim that these migrations have been applied to any database. Compare every file with the target staging project’s `supabase_migrations.schema_migrations` table and inspect schema/data compatibility before execution.

1. `supabase/migrations/20261013000000_initial_schema.sql` — base schema, core RLS and policies.
2. `supabase/migrations/20261017000000_admin_controlled_trials_and_mfa.sql` — subscription/trial controls and MFA-related functions.
3. `supabase/migrations/20261028000000_website_portfolio_builder.sql` — website config and reviews.
4. `supabase/migrations/20261109000000_enforce_superadmin_aal2.sql` — Super Admin AAL2 helper.
5. `supabase/migrations/20261109000001_landing_page_cms.sql` — landing CMS documents/media metadata and RLS.
6. `supabase/migrations/20261111000000_appointment_operations_hardening.sql` — status history and overlap/operation safeguards.
7. `supabase/migrations/20261112000000_public_boundary_hardening.sql` — public booking boundary and related policies.
8. `supabase/migrations/20261113000000_auth_registration_rpc.sql` — authenticated salon registration.
9. `supabase/migrations/20261113000001_pos_atomic_rpc.sql` — original atomic POS RPC; accepts client financial values and is replaced by the new Phase 13 migration below.
10. `supabase/migrations/20261113000002_phase4_business_transactions.sql` — business RPCs, notifications, stock movement, payment review, support message, notification read.
11. `supabase/migrations/20261114000000_phase12_domain_integrity.sql` — additive service/staff/appointment integrity and public booking replacement.
12. `supabase/migrations/20261116000000_phase13_pos_authoritative.sql` — new source-only migration: authoritative POS, invoice DML closure, membership policy correction, payment reviewed_by correction.

## Before staging apply

- Confirm the actual migration table and any manually applied SQL; do not blindly replay.
- Inspect `CREATE OR REPLACE` signatures, function owner/security-definer privileges, table grants, policies, extension/function availability, existing data, and constraint compatibility.
- Back up a disposable staging database and run the dry-run/plan supported by the approved tooling.
- Apply reviewed files in order only to that staging database. This task did not execute, deploy, or verify any SQL.
- Test migration rollback/restore procedures from a backup; do not assume a SQL migration can be automatically reversed.

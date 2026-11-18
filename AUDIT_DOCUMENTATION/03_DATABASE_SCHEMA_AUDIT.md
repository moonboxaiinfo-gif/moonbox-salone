# 03 - Database Schema Audit

## Migration inventory

The repository contains 15 ordered migrations, dated 2026-10-13 through 2026-11-17. The latest two migrations are:

- `20261117180000_phase1_security_corrections.sql`
- `20261117190000_database_architecture_completion.sql`

The 15 migrations contain tables, indexes, constraints, RLS policies, functions, triggers, Storage bucket/policy definitions, and public/anonymous and authenticated role grants.

## Verified static checks

- UUID primary keys use `gen_random_uuid()` with `pgcrypto`.
- `TIMESTAMPTZ` and `DATE` types are used for timestamps and subscription boundaries.
- Foreign-key relationships exist for memberships, subscriptions, tenant-owned records, profiles, and auth users.
- The latest migration set uses explicit transactions and ends with `COMMIT`.
- The test suite verifies migration source contracts and passed 93 tests.

## Missing/unverified database objects

No live catalog was available, so missing and unexpected remote objects cannot be determined. The following source objects require live confirmation:

- All tables and current columns.
- Applied migration history.
- Active RLS policies and grants.
- Storage bucket `payment-receipts`.
- Storage object policies.
- Final function signatures and trigger states.
- Pending migration effects or partial application.

## Migration risk findings

### MBX-AUD-001 - CRITICAL

- **Exact path:** `supabase/migrations/`, `supabase/.temp/linked-project.json`
- **Description:** Remote migration history and live schema metadata were not inspected.
- **Evidence:** The CLI was not installed in the environment and no disposable local PostgreSQL/Supabase runtime was available. The repo contains a linked project reference but credentials or a safe read-only session were not available.
- **Business impact:** A migration could partially apply or conflict with existing objects.
- **Technical impact:** Duplicate constraints, changed function signatures, missing grants, and RLS drift may exist remotely.
- **Recommended solution:** From an approved staging copy or read-only owner session, obtain migration history and schema catalog before applying anything.
- **Verification procedure:** Compare `supabase_migrations.schema_migrations`, `information_schema`, `pg_policies`, `pg_proc`, triggers, indexes, and Storage metadata against local migrations.

### MBX-AUD-007 - MEDIUM

- **Exact path:** `20261117000000_phase17_security_boundaries.sql`, `20261117180000_phase1_security_corrections.sql`, `20261117190000_database_architecture_completion.sql`
- **Description:** Late migrations redefine overlapping entitlement and role helper functions.
- **Evidence:** Multiple migrations replace `is_super_admin`, `salon_is_operational`, `salon_has_active_feature`, and `is_salon_owner` with stricter versions.
- **Business impact:** Runtime behavior could differ if migration state is incomplete or function replacement is skipped.
- **Technical impact:** Policy/function dependencies can be inconsistent between migration checkpoints.
- **Recommended solution:** Apply only the complete forward migration set to an isolated disposable database and execute contract plus role tests.
- **Verification procedure:** Query final `pg_get_functiondef` and compare final policy/function behavior against source after every migration checkpoint.


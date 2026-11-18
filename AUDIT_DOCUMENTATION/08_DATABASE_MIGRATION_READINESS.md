# 08 - Database Migration Readiness

## Repository evidence

- 15 migrations exist locally and sort by timestamp.
- Several later migrations are additive and explicitly restricted to review/staging.
- Final two migrations are forward-only and transaction-wrapped.
- A source-contract test suite passed and checks key migration strings and ordering.

## Readiness

Migration readiness is **NOT VERIFIED**. The remote project is linked in `.temp/linked-project.json`, but there was no approved safe read-only credential/session or local Supabase runtime to inspect/aply it. No migration or reset command was run.

## Blocking findings

### MBX-AUD-001 - CRITICAL

Unknown remote migration state prevents a safe production migration decision.

### MBX-AUD-007 - MEDIUM

Overlapping helper/function replacements require a disposable PostgreSQL validation pass.

## Pre-application procedure

1. Owner-approved staging or restore copy.
2. Capture remote schema and migration history.
3. Compare migration list and applied checksum/version.
4. Record existing objects and constraints.
5. Dry-run parse/plan without applying.
6. Apply each migration in timestamp order to staging.
7. Run RLS, Storage, RPC, booking, POS, payment, trial, and concurrency tests.
8. Take and verify backup before any owner-approved production apply.
9. Rollback plan must be migration-specific; do not use reset or destructive repair.


# VS Code and Supabase Setup Guide

This guide describes local setup and future verification only. The workspace contains 15 local migrations. This task performs no remote database access or writes; do not create a second Supabase project or apply migrations without explicit approval and a reviewed preflight/backup plan.

## Open and install

1. Extract `Moonbox-Salon-Phase16-Complete-Updated.zip` and open the extracted `moonbox-salon` folder in VS Code.
2. Use the project’s existing lockfile: run `npm ci` in the integrated terminal. Do not replace the lockfile with an unreviewed install.
3. Copy `.env.example` to `.env` locally. The template contains blank values; never commit `.env` or paste service-role keys into browser code.
4. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` only to the intended disposable staging project. Browser keys are public by design; RLS must enforce all authorization. Keep `SUPABASE_SERVICE_ROLE_KEY`, Cloudinary secrets, and mail secrets server-side only.

## Migration safety

1. Confirm the intended project reference in the CLI and dashboard; do not change the existing link as part of local validation.
2. Inspect the target migration history (`supabase_migrations.schema_migrations`) against `FINAL_MIGRATION_INVENTORY.md`; do not replay already-applied files blindly.
3. Review all 15 files against the target schema, table grants, function signatures, data compatibility, and RLS.
4. A CLI dry-run is read-only and does not parse or execute SQL. Never apply migrations until explicit approval. Never place a production `--db-url` in commands or logs.
5. Validate SQL and role behavior with an already-approved local/test database, without creating a second Supabase project. Source-contract tests alone do not prove PostgreSQL behavior.

## Auth, MFA, and first Super Admin

Configure only the needed Auth providers, site/redirect URLs, email verification, password recovery, and local callback URLs. Enable and test MFA for Super Admin accounts. Bootstrap the first administrator through a controlled, audited database/admin process with two-person review; do not create a browser role flag or promote a user through local storage. Test AAL1 rejection and AAL2 success before privileged tasks.

## Local verification

Run `npm run lint`, `npm test -- --run`, and `npm run build`. Use an approved isolated test database with Salon A and Salon B and separate Owner, Manager, Receptionist, and Staff users. Execute the scenarios in `PHASE16_REMAINING_BLOCKERS.md`; frontend/unit/source-contract tests do not establish database RLS or transaction correctness.

## Current configuration blockers

Remote migration state is intentionally not claimed here. The private `payment-receipts` bucket and object policies are defined in the Phase 17 migration; they are not confirmed installed by this local task. PostgreSQL execution, role/RLS tests, full CMS/public API flows, and deployment configuration remain outstanding. Do not store payment receipt files as publicly accessible URLs or mark this project production-ready until blockers and test-environment validation are resolved.

# VS Code and Supabase Setup Guide

This archive is source-only and uses demo/test data. Do not connect this working copy to a production project or apply migrations without an explicitly selected disposable staging project and reviewed backup plan.

## Open and install

1. Extract `Moonbox-Salon-Phase16-Complete-Updated.zip` and open the extracted `moonbox-salon` folder in VS Code.
2. Use the project’s existing lockfile: run `npm ci` in the integrated terminal. Do not replace the lockfile with an unreviewed install.
3. Copy `.env.example` to `.env` locally. The template contains blank values; never commit `.env` or paste service-role keys into browser code.
4. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` only to the intended disposable staging project. Browser keys are public by design; RLS must enforce all authorization. Keep `SUPABASE_SERVICE_ROLE_KEY`, Cloudinary secrets, and mail secrets server-side only.

## Migration safety

1. Confirm the Supabase project reference in the CLI and dashboard. Use a disposable staging project, not production.
2. Back up staging and inspect its migration history (`supabase_migrations.schema_migrations`) against `FINAL_MIGRATION_INVENTORY.md`; do not replay already-applied files blindly.
3. Review every unapplied migration against the actual schema, table grants, function signatures, row counts/data compatibility, and RLS. The Phase 13 POS migration is new and has not been parsed or executed by this task.
4. Use the team’s approved Supabase CLI/SQL review process, starting with a dry-run/plan where supported. Apply only reviewed files to disposable staging. Never copy a production `--db-url` into these commands.
5. Run the staging test plan before any separate production change request. This project is not release-approved by this handover.

## Auth, MFA, and first Super Admin

Configure only the needed Auth providers, site/redirect URLs, email verification, password recovery, and local callback URLs. Enable and test MFA for Super Admin accounts. Bootstrap the first administrator through a controlled, audited database/admin process with two-person review; do not create a browser role flag or promote a user through local storage. Test AAL1 rejection and AAL2 success before privileged tasks.

## Local verification

Run `npm run lint`, `npm test -- --run`, and `npm run build`. Use a staging-only test dataset with Salon A and Salon B and separate Owner, Manager, Receptionist, and Staff users. Execute the scenarios in `PHASE16_REMAINING_BLOCKERS.md`; current tests are local unit/source-contract checks only.

## Current configuration blockers

Supabase staging credentials are intentionally blank/not supplied. Storage buckets and private object policies, all role tests, and full CMS/public API flows remain outstanding. Do not store payment receipt files as publicly accessible URLs. Do not mark this project production-ready until the blockers and staging tests are resolved.

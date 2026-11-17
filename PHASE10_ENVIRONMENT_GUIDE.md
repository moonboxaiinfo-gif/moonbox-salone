# Phase 10 Environment Configuration Guide

Phase 10 does not include credentials, live Supabase configuration, SQL execution, or deployment. Use `.env.example` as the placeholder-only starting point.

## Browser-safe variables

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_CLOUDINARY_CLOUD_NAME`
- `VITE_SUPER_ADMIN_HOST`
- `VITE_ALLOW_LOCAL_ADMIN_DEMO=true` only for an explicitly isolated local/demo run; never enable it for production.

## Server-only variables

- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL`
- `ALLOWED_ORIGINS`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `RESEND_API_KEY`

Never prefix service-role or provider secrets with `VITE_`; Vite exposes `VITE_` variables to browser code. No service-role key is used by the async browser repository.

## Staging handoff

1. Create a disposable Supabase staging project and back it up before applying migrations.
2. Compare migration history with `PHASE10_MIGRATION_INVENTORY.md`.
3. Configure Auth redirects/providers and verify MFA/AAL2 for the Super Admin account.
4. Create private storage buckets and test signed receipt/media links.
5. Configure Netlify server variables separately from browser variables.
6. Run cross-tenant, role, revocation, booking, POS, CMS-draft, and private-storage tests before any production discussion.

Local fixtures are not automatically seeded into Supabase. A future staging seed/reset utility must be explicit, tenant-scoped, and never run from production startup.

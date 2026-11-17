# Netlify Handover Guide

## Current status

No deployment was performed or authorized. The application’s static build exists, but the public website client references `/api/public/websites/...` handlers that are absent from the supplied `netlify/functions/` archive. Website/CMS durable persistence and private receipt storage are also incomplete. Treat Netlify deployment as **blocked** until these routes/security gaps are fixed and staging-tested.

## Environment variables

Use the empty `.env.example` as a names-only reference. Configure values in Netlify site settings, never source control:

- Browser/build-visible: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_SUPER_ADMIN_HOST`.
- Server-only: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ALLOWED_ORIGINS`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `RESEND_API_KEY`.

Only set secrets required by the functions actually enabled. Never use a `VITE_` prefix for a secret. Restrict `ALLOWED_ORIGINS` to exact trusted origins; do not rely on a wildcard for privileged endpoints.

## Pre-deployment checklist

1. Resolve missing public website route handlers and add API tests; verify published-only reads and authenticated publish/unpublish.
2. Finish async CMS persistence, role checks, audit writes, and private media/receipt access.
3. Run the full Supabase staging role, tenant-isolation, booking, stock/POS, payment MFA, and storage test plan.
4. Confirm migration history and environment project references are staging, not production.
5. Run `npm ci`, `npm run lint`, `npm test -- --run`, and `npm run build` with no real secrets in the archive.
6. Inspect Netlify function logs and CORS behavior; test unauthorized/malformed requests and rate limits.
7. Obtain a separate user release decision before connecting or deploying production.

The included `netlify.toml` currently builds `dist` and redirects `/api/*` to functions. That redirect does not create the absent website handlers. The existing Cloudinary signer also requires security remediation before accepting uploads from public clients.

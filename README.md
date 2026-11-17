# Moonbox Salon — Website & Portfolio Builder

React/Vite salon management SaaS with a tenant-isolated Website & Portfolio Builder, public booking, published salon websites, moderated reviews, WhatsApp click-to-chat, SEO settings and responsive themes.

## Development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## Supabase + Netlify production setup

Configure the browser-safe Vite variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the build environment. Configure these **server-only** Netlify function variables in Netlify's environment settings: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_ANON_KEY` (used only to validate a bearer session), `ALLOWED_ORIGINS`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `RATE_LIMIT_HMAC_SECRET` (random value, at least 32 characters). Never prefix the service-role key, provider secrets, Resend key, or HMAC key with `VITE_`, commit real values, or include them in a client bundle.

Set `ALLOWED_ORIGINS` to the exact HTTPS origins that should be allowed to call functions cross-origin. Same-origin browser requests do not need CORS. Configure a verified sender for Resend; the email function sends only a one-time confirmation generated from a stored online booking and does not accept arbitrary recipients or HTML. Cloudinary signatures are issued only to active salon owners/managers and use server-derived tenant folders and format allow-lists.

Apply the SQL migrations in `supabase/migrations` in filename order to a disposable staging project first, inspect the resulting RLS policies and triggers, then apply them to production through the normal migration process. In particular, Phase 17 removes anonymous direct reads of salon/staff/customer data, requires AAL2 for platform-superadmin RLS, checks plan entitlements, secures website drafts/publication and adds booking/review/email abuse controls. Database migrations are **not** executed automatically by Netlify or this application. Confirm that the configured subscription plans and trial dates match the product rules before enabling tenant signup.

For production admin access, enable Supabase Auth MFA/TOTP and test both AAL1 denial and AAL2 success. Keep only the public anon key in `VITE_SUPABASE_ANON_KEY`; the service-role key must exist only in server-side function environments. Use separate Supabase and provider credentials for staging and production. Do not deploy until the staging checklist below passes and a backup/rollback plan exists.

## Verification

```bash
npm ci
npm run lint
npm test
npm run build
npm run audit:prod
```

Before production, test tenant-isolation attempts, unauthenticated function requests, owner/manager versus staff permissions, subscription expiry and plan limits, AAL1/AAL2 admin flows, booking overlap/time-window limits, duplicate booking retries, email replay, review rate limiting, website publish/unpublish, image/PDF upload restrictions, and POS stock/receipt flows using non-production data. Keep the generated audit report with the release evidence; a successful frontend build does not prove remote Supabase policies or provider credentials are deployed correctly.

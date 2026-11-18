# 11 - Deployment Readiness

## Configuration observed

- Netlify build: `npm ci`, `npm run build`, publish `dist`.
- SPA and API redirects configured.
- Security headers and CSP configured.
- Supabase browser variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Server-only variables: `SUPABASE_SERVICE_ROLE_KEY`, allowed origins, provider secrets, and rate-limit secret.
- Express server and MySQL compatibility exist but Netlify does not require a Render deployment unless `server.mjs` is intentionally hosted.

## Deployment risks

### MBX-AUD-002 - HIGH

The architecture can run in two different public-data modes. Deployment must choose and document the Supabase/Netlify path.

### MBX-AUD-004/005 - HIGH

Storage bucket, CORS, Supabase URL, and MFA must be verified in the deployed environment.

## Environment owner checks

- Set all required browser and server secrets outside source control.
- Set `VITE_SUPER_ADMIN_HOST` exactly to the production private hostname.
- Configure ALLOWED_ORIGINS with exact production origins.
- Confirm Supabase Auth redirect URLs and email recovery URLs.
- Confirm private payment receipt bucket exists and is truly private.
- Confirm AAL2 factor is enrolled only for the one approved Super Admin.
- Confirm Netlify functions use the intended Supabase project.
- Confirm no service-role key is exposed through `VITE_*`.


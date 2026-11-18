# 01 - Project Architecture Report

## Scope

Read-only audit of the complete repository and Git working tree. The worktree was clean on branch `main` before and after local validation.

## Verified architecture

- Frontend: React 19, TypeScript, Vite 8, Tailwind CSS.
- Primary data platform: Supabase Auth, PostgreSQL, and Storage.
- Hosting configuration: Netlify frontend/functions via `netlify.toml`.
- Secondary server: Express 4 in `server.mjs`, with a MySQL-compatible `DATABASE_URL` and an SPA fallback.
- State: React contexts for authentication, tenant, router, theme, and notifications; async repository hooks and a cache for tenant resources.
- Routes: landing, login, register, forgot/reset password, app/dashboard, private Super Admin portal, public booking, and public portfolio.
- Major modules: dashboard, appointments, customers, services, staff, POS/invoices, inventory, expenses, commissions, reports, website builder, subscriptions/payments, support, notifications, announcements, audit logs, landing CMS, and platform settings.

## Data architecture

The application has two implementation boundaries:

1. **Supabase/Netlify path:** browser-safe Vite Supabase variables, anonymous/authenticated Supabase clients, Netlify server functions, and 15 SQL migrations.
2. **Legacy compatibility path:** `server.mjs` uses MySQL tables `mbx_public_websites`, `mbx_public_reviews`, and `mbx_public_bookings`; browser `StorageService` retains local demo storage and can be enabled only in test or explicit local-demo mode.

The production repository and async hooks route supported resources through Supabase. Landing/CMS and public website operations also have Supabase implementations and Netlify handlers, but live deployment wiring remains unverified.

## Verified working

- Clean Git worktree.
- `npm run lint`: passed.
- `npm test`: 15 files and 93 tests passed.
- `npm run build`: passed; Vite emitted a bundle-size warning.
- Supabase credentials are separated between browser public variables and server-only variables in `.env.example`.

## Defects

### MBX-AUD-002 - HIGH

- **Exact path:** `server.mjs`, `package.json`, `netlify.toml`
- **Description:** A separate Express/MySQL public-data implementation duplicates the intended Supabase public website/booking architecture.
- **Evidence:** `server.mjs` creates MySQL tables and serves `/api/public/*`; Netlify redirects `/api/*` to Netlify functions, while the frontend primarily uses Supabase and Netlify public API handlers.
- **Business impact:** Operators could publish or serve data from different systems depending on hosting.
- **Technical impact:** Divergent schemas, authorization behavior, and transaction guarantees.
- **Recommended solution:** Select one production public-data backend; document and decommission or isolate the MySQL server implementation.
- **Verification procedure:** Trace a publish, review, and booking under the deployed host and confirm all writes/read from the chosen Supabase or MySQL backend.

## Not verified

- Live Netlify routing and environment variables.
- Live Supabase project migration history.
- Live Express/Render deployment, if one exists.
- CORS behavior in a deployed environment.
- Remote custom-domain routing.


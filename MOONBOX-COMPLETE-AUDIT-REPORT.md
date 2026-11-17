# Moonbox Salon v1.1 — Complete Technical Audit Report

**Audit date:** 2026-11-12  
**Scope:** Source archive, React/Vite application, Netlify functions, Supabase migrations, tests, and build configuration.  
**Important limitation:** No live Supabase project, Netlify deployment, Cloudinary account, email provider, or production data was accessed. Database/RLS behavior is therefore source-reviewed, not live-verified.

## Executive summary

The application preserves a broad salon SaaS feature set and currently passes its local TypeScript check, 24 unit tests, and Vite production build. However, the operational React data path is still predominantly `localStorage`/in-memory mock data. Supabase Auth is partially connected, but the main tenant, customer, appointment, inventory, invoice, expense, subscription, support, notification, and CMS workflows are not yet backed by Supabase in the frontend.

The most serious source-level issue was an unauthenticated Netlify Super Admin function using a service-role key. That function is now protected by Supabase token verification, `platform_admins.role = 'superadmin'`, AAL2 verification, strict origin handling, input validation, and actual-actor audit logging. Local mock data is also now fail-closed unless the explicit demo/test mode is enabled.

The project must **not** be described as production-ready until the remaining Supabase repository integration, live RLS tests, public booking deployment, file-storage policy setup, and signup/membership flow are completed in a staging project.

## Severity-ranked findings

| Severity | Finding | Affected files | Status |
|---|---|---|---|
| Critical | `netlify/functions/supabase-admin.ts` accepted privileged actions without validating Authorization, platform-admin membership, or AAL2. | `netlify/functions/supabase-admin.ts` | **Fixed in source**; live deployment not verified |
| Critical | Operational business data was stored in browser localStorage/in-memory state and auto-seeded from mock data. | `src/services/storageService.ts`, `src/data/mockInitialData.ts`, most dashboard components | **Partially mitigated**: production mock fallback now fails closed; Supabase CRUD migration remains open |
| Critical | Tenant isolation was caller-supplied in the browser rather than enforced by the active data path. | `storageService.ts`, `AuthContext.tsx`, `TenantContext.tsx` | **Open** until Supabase repository and live RLS tests are wired |
| High | Public booking API endpoints expected by `publicWebsiteApi.ts` were not present under `netlify/functions`. | `src/services/publicWebsiteApi.ts`, `netlify/functions/`, `netlify.toml` | **Open**; migration RPC added, handler/client wiring remains |
| High | Public RLS policies allowed arbitrary customer and online appointment inserts. | `20261013000000_initial_schema.sql` | **Improved additively** by `20261112000000_public_boundary_hardening.sql`; live policy verification required |
| High | Public booking relied on client-side conflict checks and local persistence. | `PublicBookingPage.tsx`, `PublicBookingFlow.tsx`, `storageService.ts` | **Open**; authoritative RPC added but not yet consumed by all UI paths |
| High | Signup did not atomically create `profiles`, `salons`, `salon_members`, and a pending subscription in Supabase. | `AuthContext.tsx`, initial migration | **Open** |
| High | Cloudinary signer accepted caller-supplied folders and wildcard CORS. | `netlify/functions/cloudinary-sign.ts` | **Open** |
| High | Email relay accepted arbitrary recipients/content with wildcard CORS and no rate/authorization policy. | `netlify/functions/send-email.ts` | **Open** |
| Medium | Audit log insertion accepted forged actor metadata through an overly broad policy. | initial migration | **Improved additively**; live RLS verification required |
| Medium | `server.mjs` exposes a separate MySQL website/booking implementation that is not the Netlify/Supabase production path. | `server.mjs`, `publicWebsiteApi.ts` | **Open architectural duplication** |
| Medium | Production bundle is approximately 1.28 MB minified and triggers Vite’s large-chunk warning. | Vite build output | **Open performance improvement** |
| Low | Theme, booking language, and receipt-width preferences remain in browser storage. | `ThemeContext.tsx`, `PublicBookingPage.tsx`, `InvoiceViewModal.tsx` | **Safe to retain** as UI preferences |

## Local-storage audit

| Usage | Purpose | Decision |
|---|---|---|
| `ThemeContext.tsx` | Theme preference | Safe local preference |
| `PublicBookingPage.tsx` | Booking language preference | Safe local preference |
| `InvoiceViewModal.tsx` | Receipt paper-width preference | Safe local preference; not business data |
| `ErrorBoundary.tsx` | Recovery cleanup and theme preservation | Safe only as recovery UI behavior |
| `AuthContext.tsx` session marker | Local user/session fallback | Must not be an authorization source; Supabase session is authoritative when configured |
| `StorageService.ts` tenants/users/customers/services/staff/appointments/products/invoices/expenses/payments/support/etc. | Business records | Must migrate to Supabase; production mock fallback is now disabled unless demo/test mode is explicit |
| `websiteService.ts` website/reviews | Salon website drafts/reviews | Must migrate to `website_configs`/`website_reviews` and Supabase Storage |
| `landingPageService.ts` CMS/revisions | Platform landing CMS | Must migrate to `landing_page_documents`/`landing_page_media` |

## Implemented in this pass

- Added `netlify/functions/_security.ts` for bearer-token extraction, safe CORS origin selection, Supabase user verification, platform-admin lookup, AAL2 verification, UUID validation, and JSON response handling.
- Replaced unauthenticated privileged logic in `netlify/functions/supabase-admin.ts` with server-authenticated actions and actual actor audit records.
- Added fail-closed behavior to `StorageService`: local demo seed/fallback is now only enabled with `VITE_ALLOW_LOCAL_ADMIN_DEMO=true` or test mode.
- Added additive migration `20261112000000_public_boundary_hardening.sql` with a validated, idempotent `submit_public_booking()` RPC, removal of broad anonymous mutation policies, active-salon service read constraints, forged-audit-row protection, and bounded trial extension validation.
- Preserved the existing UI components, routes, dashboards, and feature modules.

## Not verified in this environment

- Live Supabase migration execution and rollback.
- Cross-tenant RLS tests using two real authenticated accounts.
- AAL2 JWT behavior in a deployed Netlify function.
- Public booking submission against the RPC and appointment overlap trigger.
- Netlify function routing for website publish/review/booking endpoints.
- Cloudinary private delivery and receipt access.
- Resend sender-domain, recipient, and abuse controls.
- Production signup, approval, suspension, subscription expiry, and MFA enrollment.
- Existing users’ localStorage data migration.

## Recommended next implementation stage

Build a typed Supabase repository behind the existing `StorageService` contracts, beginning with profiles/memberships/tenants, services/staff, customers/appointments, then inventory/invoices/expenses/subscriptions. Update components to use async loading/error states and write integration tests against a disposable Supabase project. Keep demo mode explicit and separate from production configuration.

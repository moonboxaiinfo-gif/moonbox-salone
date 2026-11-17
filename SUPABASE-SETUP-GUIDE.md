# Moonbox Salon v1.1 — Supabase Setup Guide

## Source of truth

Supabase must be the production source of truth for authentication, salon membership, tenant records, customers, services, staff, appointments, inventory, invoices, expenses, subscriptions, support, audit logs, website configurations, reviews, and platform CMS content. Browser localStorage is only appropriate for UI preferences and explicit local demo/test mode.

## Migration order

Run migrations in filename order from `supabase/migrations/`:

1. `20261013000000_initial_schema.sql`
2. `20261017000000_admin_controlled_trials_and_mfa.sql`
3. `20261028000000_website_portfolio_builder.sql`
4. `20261109000000_enforce_superadmin_aal2.sql`
5. `20261109000001_landing_page_cms.sql`
6. `20261111000000_appointment_operations_hardening.sql`
7. `20261112000000_public_boundary_hardening.sql`
8. `20261113000000_auth_registration_rpc.sql`
9. `20261113000001_pos_atomic_rpc.sql`
10. `20261113000002_phase4_business_transactions.sql`

The migrations are source files only and have **not** been executed by this task. Review the full chain in a disposable staging project before any production use. `20261112000000_public_boundary_hardening.sql` removes broad anonymous write policies and adds `public.submit_public_booking(...)` as the validated public booking boundary. Later migrations add authenticated registration and atomic POS/business transaction RPCs.

## Main tables and relationships

- `salons` is the tenant root.
- `profiles` references `auth.users`.
- `salon_members` maps users to salons and carries owner/manager/receptionist/staff roles.
- `salon_subscriptions` references `salons` and `subscription_plans`.
- Customers, services, service categories, staff, products, product categories, stock movements, appointments, invoices, commissions, expenses, support tickets, and audit logs all carry `salon_id` directly or through a tenant-owned foreign key.
- `website_configs` stores draft and published salon snapshots; `website_reviews` stores moderated reviews.
- `landing_page_documents` and `landing_page_media` are platform-level CMS tables and are not tenant content.
- `appointment_status_history` records appointment lifecycle changes.

## Authentication and first Super Admin

1. Enable email/password authentication and MFA in the Supabase dashboard.
2. Create the first user through Supabase Auth using an operator-controlled invitation or dashboard flow. Do not create a public Super Admin registration route.
3. Create the matching `profiles` row using a privileged, reviewed SQL/admin process.
4. Insert the user into `platform_admins` with `role = 'superadmin'` using a secure operator session.
5. Enroll and verify a TOTP factor. Super Admin operations require JWT assurance level `aal2`.
6. Set `VITE_SUPER_ADMIN_HOST` and `ALLOWED_ORIGINS` to the real HTTPS admin/app origins.
7. Verify that the deployed admin function rejects missing, expired, non-admin, and AAL1 tokens.

## Environment variables

### Browser-safe

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_CLOUDINARY_CLOUD_NAME=<only-if-client upload flow remains enabled>
VITE_SUPER_ADMIN_HOST=admin.example.com
VITE_ALLOW_LOCAL_ADMIN_DEMO=false
```

### Server-only

```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
ALLOWED_ORIGINS=https://admin.example.com,https://app.example.com
CLOUDINARY_API_KEY=<if used>
CLOUDINARY_API_SECRET=<if used>
CLOUDINARY_CLOUD_NAME=<if used>
RESEND_API_KEY=<if used>
RESEND_FROM_EMAIL=Moonbox Salon <noreply@example.com>
```

Never prefix service-role, Cloudinary secret, or Resend secret values with `VITE_`. Never commit real values.

## RLS and public boundaries

- Salon members can access only authorized salon rows through `is_salon_member()`.
- Managers/owners are required for salon configuration and operational management.
- Super Admin access is separate and requires `platform_admins.role = 'superadmin'` plus AAL2 in `is_super_admin()`.
- Public reads must be limited to active salons, bookable services, and published website/CMS content.
- Public booking writes must use the `submit_public_booking()` RPC. It validates the active salon slug, service IDs, staff membership, duration, server-derived price, idempotency key, and relies on the overlap trigger.
- Test cross-tenant reads and writes with two real authenticated users before production rollout.

## Storage

Create separate buckets/prefixes for platform media, salon website assets, and payment receipts. Use tenant-derived paths, file-size/type limits, and private buckets for receipts and drafts. Deliver private objects through short-lived signed URLs. The current Cloudinary signer should not be treated as a private receipt-delivery mechanism until it has authenticated callers and restricted folders.

## Deployment sequence

1. Create/configure the Supabase project.
2. Apply the migrations in order.
3. Configure Auth redirect URLs and MFA.
4. Configure Storage buckets and policies.
5. Set Netlify browser-safe and server-only environment variables.
6. Deploy the Netlify build and functions.
7. Verify `/api/supabase-admin` rejects unauthenticated requests and accepts only verified AAL2 Super Admin requests.
8. Run staging RLS, signup, public booking, overlap, publish/unpublish, receipt, and subscription tests.
9. Only then migrate approved legacy localStorage data and deploy to production.

## Current limitation

The supplied frontend still has a large synchronous `StorageService` surface. The source now fails closed instead of silently seeding production mock data, but the complete async Supabase repository migration and UI loading/error-state conversion remain required before production readiness can be claimed.

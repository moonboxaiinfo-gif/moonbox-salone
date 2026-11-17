# Moonbox Salon SaaS — Phase 01 Security Status

## Implemented in this phase

- Supabase Super Admin sessions now require `aal2` before the frontend marks the user as a Super Admin.
- The database `is_super_admin()` predicate now requires both `platform_admins.role = 'superadmin'` and JWT assurance claim `aal2`.
- Production Super Admin hostname access requires `VITE_SUPER_ADMIN_HOST`; there is no production fallback hostname.
- Local repository MFA verification is blocked unless the explicit development-only flag `VITE_ALLOW_LOCAL_ADMIN_DEMO=true` is set.
- Duplicate Super Admin navigation entries for SaaS Plan Configuration and Platform Admins are hidden while legacy deep-link components remain intact.
- Payment approval UI now prevents approving non-pending records, prevents approval without a receipt, requires a rejection reason, prevents duplicate reviews at the storage layer, and supports image/PDF preview, zoom, reset, download, and close controls.

## Required production deployment steps

1. Apply `supabase/migrations/20261109000000_enforce_superadmin_aal2.sql` to the production Supabase project.
2. Set `VITE_SUPER_ADMIN_HOST=admin.moonboxdigital.com` in the admin deployment environment.
3. Deploy the public application at `moonboxdigital.com` and the Super Admin entry at `admin.moonboxdigital.com` using the existing hosting provider.
4. Configure HTTPS certificates and ensure the admin hostname is not routed to the public deployment without the Super Admin host check.
5. Keep `VITE_ALLOW_LOCAL_ADMIN_DEMO` unset or `false` in every production environment.
6. Verify Supabase MFA is enabled for every row in `platform_admins` and test AAL2 login with Google Authenticator or Microsoft Authenticator.

## Remaining blocked item

Payment receipts are currently uploaded to Cloudinary through the existing signed-upload function and stored as `secure_url` values. Cloudinary delivery is not private merely because upload signing is used. Secure cross-salon receipt access still requires a server-side authorized delivery endpoint or private Supabase Storage bucket with short-lived signed URLs and policies. This phase does not claim that requirement is complete.

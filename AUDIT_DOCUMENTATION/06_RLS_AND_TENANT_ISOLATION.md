# 06 - RLS and Tenant Isolation

## Tenant helpers

The source migration set defines membership and permission helpers, including:

- `is_salon_member`
- `is_salon_owner`
- `is_salon_manager_or_owner`
- `has_salon_permission`
- `salon_is_operational`
- `salon_has_active_feature`
- `current_user_staff_id`

## Repository boundary

The Supabase repository rechecks `auth.getUser()` and active `salon_members` before tenant reads/writes. CRUD helpers include both a salon identifier and record identifier. RLS remains the final database boundary.

## Verified working

Static source review confirms that hardened migrations remove broad anonymous public access and revoke direct customer/appointment and payment write paths where applicable. Source-contract tests passed.

## Not verified

- Live RLS SELECT/INSERT/UPDATE/DELETE behavior.
- Cross-tenant RPC calls.
- Storage object isolation.
- Staff explicit `auth_user_id` assignment behavior.
- Super Admin-only policy behavior.
- Function `SECURITY DEFINER` execution with actual JWT claims.

## Verification scenarios

1. Salon A Owner attempts to read/update/delete Salon B records.
2. Salon A Receptionist attempts to manage staff, invoices, or memberships.
3. Salon A Staff attempts direct customer/appointment writes.
4. Anonymous users attempt public CMS, review, booking, and Storage operations.
5. AAL1 and non-superadmin users call Super Admin RPC/functions.
6. An owner changes `tenantId`, `salon_id`, or RPC ID parameters.
7. A suspended/expired salon attempts data writes and feature RPCs.


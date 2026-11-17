# Phase 1 Security & User Roles Audit

**Project:** Moonbox Salon SaaS  
**Audit type:** Read-only source review  
**Scope:** All 13 Supabase migrations, RLS policies, database functions and grants, authentication and authorization code, receipt handling, and relevant Netlify functions  
**Production changes:** None. No Supabase write, migration apply, reset, repair, deployment, Git commit, or push was performed. No secrets or `.env` files were read.

## Executive summary

The application has a Supabase-backed multi-tenant architecture with salon membership roles, database RLS, privileged RPCs, and Netlify functions for server-side operations. Phase 17 adds meaningful controls, including AAL2 checks for platform administration, private payment-receipt storage, and server-side feature checks.

The source review found:

- **High:** Receptionist and Staff membership is sufficient for broad appointment/customer DML through `FOR ALL` policies, bypassing the intended role permission matrix.
- **High:** An AAL1 platform administrator session can start enrollment of an additional MFA factor; client-only checks do not protect the Auth API.
- **Medium:** Pending salon approval and entitlement state are not consistently enforced at database/RPC boundaries, permitting operational access before approval.
- **Low:** A tenant member can submit a support reply attributed to the platform support role.

No confirmed cross-salon data access bypass was identified in the reviewed paths. That is a source-level assessment only, not a finding about the deployed database. Actual production policies, grants, Auth settings, storage state, and deployed Netlify functions were not modified or verified as part of this audit.

## Existing architecture

- The browser uses Supabase Auth and the public client configuration. The application stores a user/session identifier locally for client state; those values are not an authorization boundary.
- `salon_members` associates authenticated users with salons and roles. SQL helpers such as `is_salon_member`, `is_salon_manager_or_owner`, and `has_salon_permission` support tenant and role checks.
- RLS policies govern direct table access. Security-definer functions and RPCs perform selected multi-step operations such as registration and POS transactions.
- `platform_admins` represents platform administrator identity. The Phase 17 `is_super_admin()` helper requires an administrator row, role `superadmin`, and JWT assurance level `aal2`.
- Netlify server-side handlers use server-only credentials for privileged operations. The receipt URL handler is designed to authorize access before issuing private-object access.
- The Phase 17 migration configures `payment-receipts` as private and binds receipt object paths to salon IDs. These controls are only source code until the migration is applied.

## Current permissions by role

The database contains a role permission helper intended to distinguish owner, manager, receptionist, and staff capabilities. Several broad RLS policies do not consistently call that helper. Therefore the table below describes the **effective risks found in source**, not a complete assurance of all deployed behavior.

| Role | Intended / observed source behavior | Audit notes |
|---|---|---|
| Owner | Salon owner membership; broad salon management; registration can create an active owner membership while the salon itself is pending approval. | The pending UI is not a backend boundary; status and sensitive operations need DB enforcement. |
| Manager | Intended to manage salon operations and selected settings. | Some policies scope managers correctly, but policy coverage is inconsistent. |
| Receptionist | Intended to handle customer-facing booking and service operations. | Broad customer and appointment `FOR ALL` policies also allow DML beyond that narrow intent. |
| Staff | Intended to access assigned/limited operational information. | Broad customer and appointment `FOR ALL` policies allow salon-wide DML; no assignment scoping is applied by those policies. |
| Super Admin | `platform_admins` identity plus AAL2 in the Phase 17 database helper; privileged Netlify paths verify identity/assurance. | MFA factor enrollment/replacement needs an independently enforced bootstrap/recovery policy. No account was created or promoted. |

## Findings ranked by severity

| # | Severity | Confidence | Finding |
|---|---|---:|---|
| 1 | HIGH | 9/10 | Salon members, including receptionist and staff roles, can manage all salon appointments and customers through broad `FOR ALL` policies. |
| 2 | HIGH | 8/10 | An AAL1 administrator session can enroll an additional MFA factor, potentially enabling an attacker-controlled factor and later AAL2 access. |
| 3 | MEDIUM | 9/10 | Salon approval and subscription/entitlement state are not consistently checked by database policies and operational RPCs; pending owners can reach protected operations or alter approval-controlled state. |
| 4 | LOW | 9/10 | Tenant members can submit support messages attributed to platform support by supplying client-controlled role/name fields. |

### 1. Broad appointment and customer permissions

**Files needing correction:**

- `supabase/migrations/20261013000000_initial_schema.sql` — customer and appointment policies around lines 529–541.
- `supabase/migrations/20261113000002_phase4_business_transactions.sql` — role permission helper around lines 41–55.
- Later migrations that replace these policies should be reviewed together to ensure no permissive policy remains.

The initial policies use `FOR ALL` with `public.is_salon_member(salon_id)`. That helper admits active members across salon roles. As a result, receptionist and staff users can directly select, insert, update, and delete all customer and appointment rows in their own salon, including customer contact data and internal appointment notes. The separate role-permission helper does not constrain these policies.

**Recommendation:** Replace broad member DML with explicit command-specific policies. Define receptionist booking operations and staff assignment scope, and reserve broad update/delete for owner/manager as approved. Apply equivalent customer protections. Verify the combination of all permissive policies because PostgreSQL ORs permissive policies for a command.

### 2. MFA factor enrollment for platform administrators

**Files needing correction:**

- `src/context/AuthContext.tsx` — `enrollSuperAdminMFA` around lines 298–315 and administrator sign-in/enrollment flow around lines 356–372.
- `supabase/migrations/20261117000000_phase17_security_boundaries.sql` — `is_super_admin()` around lines 7–23.
- `netlify/functions/_security.ts` — `requireSuperAdmin` around lines 83–103.

The database and Netlify privileged-operation checks require an enrolled Super Admin and AAL2. However, the client enrollment function checks for a platform-admin row and starts Supabase MFA enrollment without requiring an existing AAL2 session or verifying that this is a controlled initial enrollment. Supabase Auth factor enrollment itself is not made safe by hiding a UI control.

**Recommendation:** Define and enforce a controlled initial bootstrap, factor replacement, and recovery process. For administrators who already have a verified factor, require current AAL2 or an independently authenticated recovery process before adding/replacing factors. Confirm exact enforcement options against the project’s Supabase Auth configuration before implementation.

### 3. Pending approval and entitlement checks

**Files needing correction:**

- `supabase/migrations/20261013000000_initial_schema.sql` — salon update policy around lines 489–490.
- `supabase/migrations/20261113000000_auth_registration_rpc.sql` — registration creates pending salon and active owner membership around lines 31–35.
- `supabase/migrations/20261113000002_phase4_business_transactions.sql` — permission helper and operational RPCs around lines 41–70.
- `supabase/migrations/20261117000000_phase17_security_boundaries.sql` — public boundary and entitlement controls around lines 76–77 and feature helper uses.
- `src/App.tsx` — pending approval presentation around line 158.

Registration creates a salon in `pending_approval` while creating an active owner membership. The application’s pending screen is not a database authorization check. The salon update policy allows owners/managers to update the salon row without reserving approval-controlled fields, and the reviewed permission helper does not consistently require an approved salon or active subscription. Operational RPC authorization that depends only on membership can therefore allow calls before approval.

Phase 17 adds an entitlement function and applies it to selected operations, including inventory, portfolio, and online booking. The reviewed SQL does not apply the same entitlement requirement consistently to reports, commissions, and custom domains. The staff/customer row-limit trigger also counts existing rows without serializing concurrent inserts, so simultaneous inserts could exceed configured limits.

**Recommendation:** Enforce salon approval and entitlement on each sensitive DB policy/RPC, not only in React. Reserve approval-controlled columns for an AAL2 platform administrator using column-level grants and/or server-side validation. Add transaction-safe concurrency control for row limits.

### 4. Support sender attribution

**Files needing correction:**

- `supabase/migrations/20261113000002_phase4_business_transactions.sql` — support message RPC around lines 153–175.
- `src/components/support/SupportTicketsList.tsx` — message attribution display around line 346.
- `src/services/supabaseRepository.ts` — RPC arguments around lines 412–418.

The tenant-facing support RPC checks salon membership but accepts client-supplied sender role and sender name. A salon member can submit `support` as the role and an arbitrary name; the UI renders that message as platform support.

**Recommendation:** Derive tenant sender identity and role from `auth.uid()` and the authorized membership. Permit the `support` role only for verified platform-support authority, with AAL2 where required; reject client-supplied platform attribution.

## Cross-salon isolation

No confirmed cross-salon read/write bypass was identified in the reviewed source paths. Tenant helper predicates and reviewed RPC/Netlify operations generally include a salon scope. This does not prove complete tenant isolation:

- RLS must be tested with actual JWTs and separate Salon A/Salon B identities.
- Every SECURITY DEFINER function needs a review of its owner, fixed `search_path`, grants, and tenant predicates.
- All permissive policies on a table must be considered together.
- The deployed database may differ from the checked-in migrations.

## Payment receipt storage

Phase 17 specifies a private `payment-receipts` bucket, salon-prefixed object paths, upload constraints, and authorization through the receipt URL flow. A database validation trigger checks receipt path and object existence. Earlier read-only inspection found the bucket absent and no `storage.objects` policies, meaning Phase 17’s protections are not active until approved migration application. Do not treat the repository’s policy definitions as proof of deployed privacy.

Test anonymous access, cross-salon access, owners, managers, AAL1 administrators, and AAL2 administrators. Confirm receipt URLs are short-lived and cannot be reused to access other tenant objects.

## Recommended role permission matrix

This is a proposal for business-owner approval, not a statement of current effective permissions.

| Capability | Owner | Manager | Receptionist | Staff | Super Admin |
|---|---|---|---|---|---|
| Ordinary salon profile/settings | Manage | Limited delegated settings | No | No | Platform support only |
| Approval, subscription activation | Cannot self-approve | No | No | No | Manage through audited AAL2 path |
| Membership administration | Manage own salon | Optional delegated invitations | No | No | Platform administration, AAL2 |
| Appointments | Full salon management | Full salon management | Create/reschedule/cancel as approved | Assigned schedule and limited status updates | Platform support only, AAL2 |
| Customers | Full salon management | Full salon management | Necessary booking/contact actions | Assigned/scoped records only | Platform support only, AAL2 |
| Services and staff configuration | Manage | Manage | Read | Read/assigned view | Platform administration, AAL2 |
| POS, discounts, refunds | Full | Full or delegated | Sales; limited adjustments | Sales only if explicitly approved | Platform administration, AAL2 |
| Inventory, finance, commissions | Full | Manage | Limited read/sale functions | No finance administration | Platform administration, AAL2 |
| Tenant support messages | Tenant identity only | Tenant identity only | Tenant identity only | Tenant identity only | Platform-support attribution only, AAL2 |
| Payment receipts | Submit/view own salon | Only if explicitly approved | No | No | Review/view through AAL2-authorized flow |

## Required automated tests

1. **Two-tenant RLS matrix:** Create Salon A and Salon B with Owner, Manager, Receptionist, and Staff identities. Test `SELECT`, `INSERT`, `UPDATE`, and `DELETE` for appointments, customers, memberships, invoices, products, commissions, expenses, support tickets, payment requests, and website records. Assert cross-salon access is denied.
2. **Appointment/customer role tests:** Verify each role’s exact CRUD scope, staff assignment constraints, internal-note visibility, cancellation/reschedule permissions, and behavior under overlapping permissive policies.
3. **Pending approval:** Register a pending salon. Assert its owner cannot change approval status, activate a subscription, or invoke protected operational RPCs. Assert only the approved AAL2 platform path can approve it.
4. **MFA bootstrap/recovery:** Test controlled initial enrollment, existing-factor enrollment/replacement, recovery, AAL1 rejection, and AAL2 acceptance. Include direct Auth/API attempts, not only UI tests.
5. **Support attribution:** Assert tenant members cannot create a `support` sender or spoof another user’s name. Assert authorized support messages have server-derived attribution.
6. **Security-definer RPC and grants:** Exercise every RPC as anonymous, unrelated-tenant, inactive member, each salon role, AAL1 admin, and AAL2 admin. Verify `EXECUTE` and table grants, including default privileges.
7. **Private receipt access:** Test anonymous, cross-tenant, owner, manager, AAL1 admin, and AAL2 admin upload/read attempts; validate path binding, allowed content type/size, private bucket settings, and signed-link expiration.
8. **Entitlements and concurrency:** Test each plan feature at the database boundary. Run concurrent staff/customer inserts at plan limits and verify the configured limit cannot be exceeded.
9. **Netlify handler authorization:** Test missing/invalid tokens, wrong role, insufficient AAL, mismatched salon IDs, and unauthorized service-role-backed writes for every privileged handler.
10. **Registration confirmation:** Test signup with email confirmation enabled, then sign-in and completion. Verify no orphan Auth account, duplicate salon, or unapproved operational access results.

## Business-owner approval questions

1. May Staff see only their assigned appointments/customers, or all salon records? Which status updates may they make?
2. Which appointment and customer operations may Receptionists perform, including cancellation, rescheduling, internal notes, and deletion?
3. May Managers change salon profile, opening hours, billing, or staff memberships? Which fields must remain Owner-only?
4. Can a salon Owner ever activate a pending salon or subscription? The recommended default is no.
5. Should owners be able to invite existing users directly as active members? Is membership in multiple salons supported?
6. What is the approved first Super Admin bootstrap, factor replacement, and recovery procedure? How will exactly one primary Moonbox Digital Super Admin be operationally maintained?
7. Which tenant roles can update support tickets, and who may send messages attributed to platform support?
8. Should managers have receipt access, or should access remain limited to owners and AAL2 platform administrators?
9. Which subscription features must be enforced server-side for reports, commissions, and custom domains?

## Exact files needing correction

| File | Correction area |
|---|---|
| `supabase/migrations/20261013000000_initial_schema.sql` | Replace broad customer/appointment member `FOR ALL` policies; protect approval-controlled salon fields. |
| `supabase/migrations/20261113000002_phase4_business_transactions.sql` | Align RPC authorization with approval/subscription state; derive support sender attribution; review role helper against approved matrix. |
| `supabase/migrations/20261113000000_auth_registration_rpc.sql` | Preserve pending state and ensure follow-up after email confirmation cannot bypass authorization or create duplicates. |
| `supabase/migrations/20261117000000_phase17_security_boundaries.sql` | Complete server-side feature enforcement; protect approval-controlled writes and race-safe plan limits; verify receipt policies in a test database. |
| `src/context/AuthContext.tsx` | Constrain MFA enrollment/replacement UI to approved bootstrap/recovery flow; do not rely on this client check as the security boundary. |
| `netlify/functions/_security.ts` | Preserve AAL2/admin checks and test all service-role handlers against the same rules. |
| `src/services/supabaseRepository.ts` | Stop accepting tenant-controlled platform support identity fields. |
| `src/components/support/SupportTicketsList.tsx` | Render trusted server-derived sender roles only. |
| `src/App.tsx` | Keep pending approval UX, but treat it only as presentation after backend enforcement. |

## Verification limitations

This is a source review of the 13 local migrations and relevant application code. It does not confirm migration state, live RLS policies/grants, Auth MFA configuration, Storage state, Netlify environment variables, or deployed function versions. No database connection or remote operation was used for this audit. Findings must be validated with automated tests in an authorized local/test environment before any production change.

## Outcome and approval gate

The codebase is **not ready for production role/security sign-off** until the high-severity role and MFA issues are addressed, pending-approval enforcement is complete, support attribution is fixed, and the role matrix is approved and tested. This audit changed no application code or migration. The only requested deliverable created is this report. Wait for explicit approval before implementing any correction or performing any remote database operation.

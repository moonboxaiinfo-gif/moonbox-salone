# 05 - Database Security Audit

## Source-level security controls

- RLS is used extensively across tenant and platform tables.
- `SECURITY DEFINER` functions set explicit search paths in the later migrations.
- Super Admin helpers require `platform_admins.role = 'superadmin'` and, in the hardened migrations, AAL2.
- Tenant-owned data uses active membership and permission helpers.
- Public booking/customer/appointment direct anonymous mutation is removed or restricted in hardened migrations.
- Payment receipt bucket and Storage policies are defined as private.
- Netlify privileged functions validate bearer tokens and MFA for Super Admin actions.

## Security issues

### MBX-AUD-003 - HIGH

- **Exact path:** `supabase/migrations/`
- **Description:** Cross-tenant RLS behavior is not live-verified.
- **Evidence:** Static policies and helper functions exist, but no two-salon/two-user isolated PostgreSQL runtime was available.
- **Business impact:** A tenant may be able to read or mutate another salon's data if a policy/grant differs remotely.
- **Technical impact:** SQL catalog, grant, and policy drift can bypass the intended role boundaries.
- **Recommended solution:** Run owner/manager/receptionist/staff and two-salon tests against a disposable Supabase/Postgres instance.
- **Verification procedure:** For every tenant table and RPC, attempt cross-tenant select/insert/update/delete with valid and altered identifiers.

### MBX-AUD-004 - HIGH

- **Exact path:** `20261117000000_phase17_security_boundaries.sql`, `src/services/privateReceiptService.ts`, `netlify/functions/receipt-url.ts`
- **Description:** Private payment receipt bucket and signed-URL behavior are not live-verified.
- **Evidence:** Migration source defines a private bucket and policies, but live bucket metadata and AAL2 signed URL behavior were unavailable.
- **Business impact:** Receipt data could be inaccessible or, if misconfigured, exposed.
- **Technical impact:** Storage path, MIME, size, owner, and policy interactions can fail in deployment.
- **Verification procedure:** Upload with owner/non-owner users, inspect object metadata, attempt direct and signed downloads, and verify 300-second expiry.

### MBX-AUD-005 - HIGH

- **Exact path:** `netlify/functions/_security.ts`, `src/context/AuthContext.tsx`, `20261117000000_phase17_security_boundaries.sql`
- **Description:** AAL2 enforcement is not live-tested.
- **Evidence:** Source checks JWT `aal` and Supabase MFA state, but no MFA-enabled account or deployed function was available.
- **Business impact:** Platform administration could be unavailable or, if JWT handling differs, authorization may be uncertain.
- **Technical impact:** AAL2 claims and `platform_admins` rows must remain consistent across browser and server checks.
- **Verification procedure:** Test AAL1, AAL2, stale sessions, revoked enrollment, and one-row platform-admin constraints.

### MBX-AUD-006 - HIGH

- **Exact path:** `netlify/functions/supabase-admin.ts`
- **Description:** Privileged trial/package/status operations use direct service-role writes and can partially succeed.
- **Evidence:** Grant, revoke, extend, and assign actions update multiple tables/audit logs through separate Supabase calls rather than one database transaction.
- **Business impact:** Failed audit writes or subscription writes can leave misleading operational state.
- **Technical impact:** No rollback envelope or serializable transaction spans the operations.
- **Recommended solution:** Implement RPCs for each Super Admin lifecycle action and audit within the same PostgreSQL transaction.
- **Verification procedure:** Inject a failure between salon/subscription/audit writes and verify no partial state remains.


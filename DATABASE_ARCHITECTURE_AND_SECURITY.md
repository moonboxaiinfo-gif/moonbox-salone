# Moonbox Salon database architecture and security handover

## Scope and verification boundary

This is a local review of the application source and the 15 SQL migration files in `supabase/migrations/`, ordered by filename and dependency. No remote project was queried or changed, no migration was applied, and no secret-bearing `.env` file was read. The new migration and source changes are not yet verified by PostgreSQL execution.

The schema is a Supabase/PostgreSQL multi-tenant design. `auth.users` is the identity authority; `public.profiles` stores application profile data. Tenant operations use `salon_id`, active `salon_members` memberships, RLS, and narrowly scoped security-definer RPCs. The browser Supabase key is public; authorization must remain in RLS/RPCs and server functions.

## Migration inventory and execution order

See [FINAL_MIGRATION_INVENTORY.md](./FINAL_MIGRATION_INVENTORY.md) for all 15 filenames. The sequence is timestamp ordered. Migrations 14 and 15 depend on helpers and schema from earlier migrations; in particular, migration 15 depends on `has_salon_permission`, `is_salon_owner`, `is_salon_manager_or_owner`, `salon_members`, profiles, and the Phase 17 support-ticket policies/table.

The UUID generator is `gen_random_uuid()` with `pgcrypto` enabled in the initial migration. No `uuid_generate_v4()` or `uuid-ossp` references remain in the reviewed migration source. Source checks cannot prove extension installation or SQL executability on a target.

Migration 15 is additive/forward-only. It corrects trial expiry authority, adds explicit Staff/Auth assignment, replaces operational permissions and assigned-record RPCs, adds commission settlement and support-ticket creation RPCs, and enforces active plan limits on inserts/reactivation/tenant reassignment. It has one `BEGIN` and a final `COMMIT`.

Static inspection found explicit `BEGIN`/`COMMIT` markers in Phase 17 and migrations 14 and 15 only; the first 12 files contain no explicit transaction markers. Whether the CLI wraps each file in a transaction was not verified here. Do not infer rollback safety from file order or source-only tests.

## Schema and relationship map

| Domain | Tables / relations | Purpose and boundary |
|---|---|---|
| Identity and platform | `auth.users` -> `profiles`; `platform_admins` -> `profiles` | Auth identity, profile, and a single platform-admin row constrained to `superadmin`; privileged authority additionally requires an AAL2 JWT. |
| Tenants and membership | `salons`; `salon_members` -> salon/profile | Salon owns tenant data. Membership is unique per user/salon and assigns Owner, Manager, Receptionist, or Staff. Salon registration creates a pending-approval salon and owner membership through an authenticated RPC. |
| Subscription and payment | `subscription_plans`; `salon_subscriptions` -> salon/plan; `manual_payment_requests` -> salon/plan/profile reviewer | One subscription per salon; plan feature/row limits; bank-transfer request and reviewer state. Phase 17 also defines private Storage bucket `payment-receipts`. |
| Salon operations | `service_categories`, `services`, `staff`, `customers`, `appointments` -> salon, with appointments referencing operational rows | Services, staffing, customer records, bookings and scheduling. Appointment status history is in `appointment_status_history` -> appointment/salon. Migration 15 adds optional `staff.auth_user_id` -> profile for explicit staff assignment. |
| POS and finance | `product_categories`, `products`, `stock_movements`, `invoices`, `commissions`, `expense_categories`, `expenses` -> salon and applicable operational rows | Inventory and atomic POS; revenue is represented by invoices rather than a separate income table. Invoice/stock and commission operations are server-side RPCs. |
| Website and CMS | `website_configs`, `website_reviews`, `landing_page_documents`, `landing_page_media` | Salon portfolio/site data, customer reviews, and platform landing-page content/media metadata. Published website snapshots are server-controlled. |
| Support and platform operations | `support_tickets`, `notifications`, `announcements`, `audit_logs`, `transactional_email_dispatches`, `website_review_rate_limits` | Ticket conversations, targeted notifications, platform announcements, audit events, one-time booking-email dispatch, and hashed public-review throttle state. |

Tenant tables should have RLS enabled and enforce the `salon_id` boundary. The primary migration designs that boundary, and migrations 14/15 replace broad policies for sensitive customer, appointment, finance, staff, and inventory operations. This source review is not a catalog query against a running database.

### Explicitly incomplete schema/application support

- There is no dedicated custom-domain registration/verification table or lifecycle RPC. The plan feature flag and a salon JSON portfolio field are not sufficient to prove domain ownership, DNS verification, or certificate state. The custom-domain provider and approval/verification lifecycle need owner approval before adding that schema.
- Staff membership roles are supported, and the new `staff.auth_user_id` mapping enables assigned-record restrictions. There is no complete staff invitation/provisioning workflow yet; a manager can link only an already-active Staff membership.
- There is no separate income ledger; invoices are the revenue source. Confirm whether accounting requires adjustments/refunds or non-POS income before treating this as a complete accounting ledger.
- `support_tickets.messages` remains a JSONB conversation array rather than a normalized message table. Writes are attributed through RPCs, but normalization would be a separate data-model decision.
- Super Admin creation is intentionally not exposed through frontend code. The initial account still needs an audited, controlled bootstrap outside this schema migration.

## Recommended permission matrix

The matrix summarizes intended database authority, not a guarantee of application-screen behavior. All tenant rows remain scoped to memberships and salon IDs.

| Capability | Super Admin (AAL2) | Owner | Manager | Receptionist | Staff |
|---|---:|---:|---:|---:|---:|
| View/manage platform approvals, plans, subscriptions, payment reviews | Yes | No | No | No | No |
| Complete salon onboarding while pending | No | Own salon | No | No | No |
| Manage salon members and role assignment | Platform tasks only | Yes | No | No | No |
| Read customers / appointments | Platform support path | All in salon | All in salon | Operational fields | Only records assigned to linked Staff identity |
| Create/update customer and appointment records | Platform support path | Yes | Yes | Operational CRUD | No general CRUD; assigned status changes only |
| Change assigned appointment status | Platform support path | Yes | Yes | Yes | checked-in, in-progress, completed only |
| Manage services/categories and staff records | Platform support path | Yes | Yes | No | No |
| Sell / use POS | Platform support path | Yes | Yes | Yes | Not granted by general sell permission |
| Manage inventory | Platform support path | If plan permits | If plan permits | No | No |
| Read reports / invoices | Platform support path | If plan permits | If plan permits | No | No |
| Manage expenses/finance | Platform support path | Yes | Yes | No | No |
| Manage commissions | Platform support path | If plan permits | If plan permits | No | No |
| Create support ticket | Yes, AAL2 | Active member | Active member | Active member | Active member |
| Read private payment receipts | Yes, AAL2 | Own salon | No | No | No |
| Upload private payment receipt | No | Own salon | No | No | No |

“Platform support path” is not a blanket grant to direct-table access: policies/RPCs must check `is_super_admin()`, which in the hardened migration requires a current AAL2 JWT. Test every table and RPC with both AAL1 and AAL2.

## Security review findings and local corrections

### Implemented locally in this worktree

- Migration 15 makes `trial_ends_at` authoritative for trial access instead of allowing an extended legacy subscription `end_date` to extend the trial.
- Staff-to-Auth linkage is explicit and unique per salon. Staff access is not inferred by matching email addresses.
- Staff customer/appointment reads are restricted to linked, assigned operational records; appointment status writes are limited to the approved set.
- Operational table policies and grants are narrowed. Commission settlement is routed through an entitlement-checked RPC instead of direct updates.
- Active staff/customer plan limits are checked for inserts, reactivation, and salon reassignment under a per-salon advisory transaction lock.
- Support-ticket creation now uses `create_salon_support_ticket`; authenticated direct inserts are revoked, and first-message sender identity plus salon/user metadata are derived from the session/profile rather than client JSON.

### Remaining risks/blockers

1. **High — unexecuted SQL / transaction behavior.** Migrations 14 and 15 have not been run by a PostgreSQL parser/runtime. The first 12 files have no explicit transaction markers and the CLI's wrapping behavior was not verified. Review syntax, function grants/owners, trigger behavior, RLS interactions, and per-file atomicity in an approved local database before any remote apply.
2. **High — Auth Staff provisioning incomplete.** The new staff selector cannot invite/provision an Auth user. Do not equate an employee email field with an authenticated identity.
3. **High — incomplete async application persistence.** The repository/service layer still has legacy synchronous/cache paths and modules without complete server-backed CRUD, particularly Landing CMS, website builder/publication, some subscription/platform settings and announcement flows. Validate every production screen before claiming database-backed readiness.
4. **High — custom-domain ownership lifecycle missing.** A plan entitlement alone does not establish a safe domain claim/verification process.
5. **Medium — support conversation storage is JSONB.** The initial and appended messages are now attributed by RPC, but test concurrent append, status transitions, and message limits. Consider normalization only after business approval.
6. **Medium — initial Super Admin bootstrap is operational.** Exactly one row is constrained, but the schema does not create that account; use a documented, audited server-side bootstrap with MFA.
7. **Medium — local source tests are not RLS/PostgreSQL tests.** They can catch repository-contract regressions but cannot prove two-tenant isolation, transaction atomicity, race safety, Storage privacy, or MFA enforcement.
8. **Medium — no deployment verification.** Netlify environment variables, redirects, callback URLs, server-function secrets, CORS allowlist, and deployed function behavior were not read or tested.

## Environment and Storage setup

The blank `.env.example` names are: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_SUPER_ADMIN_HOST`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ALLOWED_ORIGINS`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `RATE_LIMIT_HMAC_SECRET`. No values are included here. `VITE_*` values are client-visible; never put service-role, Cloudinary API secret, mail, or HMAC keys in a `VITE_*` variable. Configure server-only secrets in the approved Netlify/Supabase secret store.

Phase 17 defines a private bucket with exact ID `payment-receipts`, 5 MiB limit, JPEG/PNG/WebP/PDF allowlist, UUID salon folder, UUID filename, Owner-only upload, and Owner/AAL2-admin read. The SQL configures the bucket and policies but this task does not confirm they exist remotely. Receipt URLs are object paths, not public URLs; privileged review uses a short-lived signed URL.

## Required automated test plan

| Test group | Required cases | Current verification |
|---|---|---|
| Roles and tenant boundaries | Two salons; Owner, Manager, Receptionist, linked Staff and AAL1/AAL2 Super Admin; SELECT/INSERT/UPDATE/DELETE against each tenant table | Not run against PostgreSQL |
| Pending and entitlements | Pending salon onboarding only; no operational access until approval; trial end, inactive plan, every feature flag and row limit | Source contracts only; no database runtime |
| Staff assignments | No email-based authorization; unique link; unlinked Staff denied; only assigned customer/appointments/status transitions | Repository/UI source tests; no RLS integration |
| Payments and Storage | Owner-only upload; private read; cross-salon receipt denial; AAL1 admin denial; amount/plan/reviewer fields cannot be forged | Phase 17 source tests only; Storage not exercised |
| POS and concurrency | Forged totals denied; tenant row ownership; stock lock/rollback; duplicate request idempotency; parallel inventory and plan-limit inserts | Existing source tests only; no concurrent DB test |
| Support | Forged initial sender rejected/ignored; direct insert denied; cross-tenant ticket read/write denied; tenant/support RPC attribution; concurrent append | Added repository RPC contract test; database behavior not run |
| Registration and admin bootstrap | Duplicate account/salon prevention; atomic rollback; pending state; exactly one primary admin; MFA promotion only through reviewed ops | No Auth integration test |
| Functions and deployment | RPC execute grants, SECURITY DEFINER search paths, Netlify auth/role checks, environment name presence, CORS and redirects | Not run |

## Local validation commands and result status

Run locally:

```powershell
npm run lint
npm test -- --run
npm run build
git diff --check
```

Validated in this task: `npm.cmd run lint` passed; `npm.cmd test -- --run` passed (15 files, 93 tests); `npm.cmd run build` passed with the existing large-chunk advisory; and `git diff --check` passed. Static inventory found 15 chronological migration files and no `uuid_generate_v4()`/`uuid-ossp` references. The environment had no `psql`, Supabase CLI, or Docker command available, so PostgreSQL parsing/execution and RLS tests could not run. These local checks do not substitute for the database test plan above.

## Safe future sequence

1. Complete custom-domain and Staff invitation decisions; resolve the remaining application persistence gaps.
2. Run the SQL migrations in a disposable local Supabase/PostgreSQL database, then run the role/tenant/storage/concurrency scenarios above.
3. Review the migration diff, target migration history, actual schema and grants, and approved backup/recovery plan. A CLI dry-run does not parse SQL.
4. Obtain explicit owner approval before any target database operation. The task that produced this report performs no remote database access or writes.

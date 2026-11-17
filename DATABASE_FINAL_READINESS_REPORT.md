# Moonbox Salon — Final Database Readiness Report

## Executive decision

**NOT READY for production initialization.** The 15 migrations appear chronologically ordered with their visible dependencies in place, and the final policies/functions show substantial tenant and privilege hardening. However, that is a static review—not proof that the files execute successfully on PostgreSQL. No PostgreSQL parser/runtime, disposable Supabase instance, RLS integration suite, or Storage runtime was available or used. Application/database integration also remains incomplete, and a Netlify entitlement check conflicts with the final database trial rule.

No Supabase, Netlify, or other remote service was contacted. No SQL was executed. No existing project files were changed; this report is the sole new file.

## Scope and verification limits

- Read all 15 files under `supabase/migrations/` in timestamp order and reviewed application database access, authentication/MFA, Netlify functions, subscription/payment/approval paths, and website/CMS services.
- Did not read `.env` files or inspect/print credentials.
- Did not run PostgreSQL validation, Supabase CLI commands, tests, lint, build, migrations, deployment, or Git operations.
- This report describes definitions in the repository. It does **not** certify the live database’s tables, policies, extensions, bucket contents, migration history, or configuration.
- Catalogues and final policy behavior cannot be independently confirmed without a disposable PostgreSQL/Supabase instance. SQL validity and empty-database execution therefore remain **unverified**.

## Migration inventory and order

| # | Migration | Static review |
|---|---|---|
| 1 | `20261013000000_initial_schema.sql` | Base schema, UUID generation through `gen_random_uuid()`, initial RLS, indexes, helper functions and legacy policies. Establishes the objects used by later files. |
| 2 | `20261017000000_admin_controlled_trials_and_mfa.sql` | Approval/trial administration and status constraints; depends on the base salons, subscriptions, profiles and platform-admin schema. |
| 3 | `20261028000000_website_portfolio_builder.sql` | `website_configs` and `website_reviews`, associated policies/indexes and update/review logic. |
| 4 | `20261109000000_enforce_superadmin_aal2.sql` | Replaces the Super Admin predicate with an AAL2 check and tightens its execute grant. |
| 5 | `20261109000001_landing_page_cms.sql` | Landing-page document/media tables, indexes, RLS and publication-related logic. |
| 6 | `20261111000000_appointment_operations_hardening.sql` | Appointment check-in/check-out/internal-note/idempotency fields, status history and transition logic. |
| 7 | `20261112000000_public_boundary_hardening.sql` | Public access and booking boundary changes; relies on appointment hardening. |
| 8 | `20261113000000_auth_registration_rpc.sql` | Authenticated salon-registration RPC and related authorization. |
| 9 | `20261113000001_pos_atomic_rpc.sql` | Initial transactional POS RPC and grants. |
| 10 | `20261113000002_phase4_business_transactions.sql` | Business transaction functions, notifications, support and related policies/functions. |
| 11 | `20261114000000_phase12_domain_integrity.sql` | Salon-scoped service/appointment fields and relationship/booking integrity logic. |
| 12 | `20261116000000_phase13_pos_authoritative.sql` | Authoritative POS/stock/payment behavior and final POS permission path. |
| 13 | `20261117000000_phase17_security_boundaries.sql` | Public-facing boundaries, private receipt bucket/policies, payment and website safeguards, rate limiting and email-dispatch schema. |
| 14 | `20261117180000_phase1_security_corrections.sql` | Final role/RLS corrections, single-account Super Admin constraint, approval-field protection and role-aware customer/appointment access. |
| 15 | `20261117190000_database_architecture_completion.sql` | Final operational/feature helpers, explicit staff-account linking, support attribution, commission settlement, row limits and authoritative trial deadline. |

The timestamps give a coherent forward-only order. The later corrections intentionally supersede earlier helpers/policies. Migrations 13–15 include explicit transaction boundaries; earlier files do not declare explicit `BEGIN`/`COMMIT`. The migration runner’s transaction semantics were not verified, so atomicity cannot be inferred from this static review.

### Dependency and empty-database assessment

Visible object dependencies are generally ordered correctly: base tables precede feature tables and RPCs; appointment hardening precedes idempotent/public booking logic; Phase 12 adds service and appointment arrays before later functions use them; the final role corrections follow the earlier policies; and migration 15 replaces the earlier trial-entitlement helper.

Two conditions deserve explicit preflight even on an allegedly empty project:

1. Migration 14’s `platform_admins_primary_role_only` CHECK and `platform_admins_single_account_idx` intentionally fail if pre-existing rows include a non-Super-Admin role or more than one administrator. The migration comments say it fails rather than repairing/deleting records. On a genuinely empty schema table this is not expected to block, but no remote state was inspected.
2. Empty-database execution is **not certified** until the complete sequence has been parsed and run against a disposable PostgreSQL/Supabase database. Conditional DDL and function bodies can still fail because of server-version, extension, grant, function-signature or policy dependencies.

UUID generation uses `gen_random_uuid()` in the inspected schema; no `uuid_generate_v4()` or `uuid-ossp` dependency was found in the current migration sequence. Availability/behavior on the target PostgreSQL version was not runtime-tested.

## Database object inventory

### Schemas and extensions

- Application objects are defined in `public`; authentication references Supabase’s `auth.users` and JWT helpers.
- The initial migration installs `pgcrypto`; UUID defaults use `gen_random_uuid()`. No `uuid-ossp`/`uuid_generate_v4()` dependency was found.
- The Phase 17 migration configures the Storage bucket through Supabase’s `storage.buckets` and `storage.objects` system tables. These are Supabase-provided objects, not created by this migration.
- Runtime extension inventory is unknown because no database was queried.

### Tables and principal columns

The final migration set defines **30 application tables**. Column lists below reflect the SQL declarations and later additions. `id` is the primary key unless another primary key is explicitly shown.

| Table | Columns (including later additions) |
|---|---|
| `subscription_plans` | `id`, `name`, `slug`, `description`, `monthly_price_lkr`, `yearly_price_lkr`, `max_staff`, `max_customers`, `has_inventory`, `has_online_booking`, `has_portfolio`, `has_custom_domain`, `has_reports`, `has_commissions`, `is_popular`, `is_active`, `created_at`, `updated_at` |
| `salons` | `id`, `name`, `slug`, `tagline`, `logo_url`, `country`, `currency`, `phone`, `whatsapp`, `email`, `website`, `address`, `city`, `opening_hours`, `settings`, `portfolio`, `onboarding_completed`, `onboarding_step`, `status`, `created_at`, `updated_at` |
| `profiles` | `id`, `email`, `full_name`, `phone`, `avatar_url`, `created_at`, `updated_at` |
| `platform_admins` | `user_id`, `role`, `created_at` |
| `salon_members` | `id`, `user_id`, `salon_id`, `role`, `status`, `created_at`, `updated_at` |
| `salon_subscriptions` | `id`, `salon_id`, `plan_id`, `status`, `billing_cycle`, `start_date`, `end_date`, `trial_ends_at`, `auto_renew`, `created_at`, `updated_at` |
| `manual_payment_requests` | `id`, `salon_id`, `salon_name`, `owner_email`, `plan_id`, `plan_name`, `billing_cycle`, `amount_lkr`, `bank_reference`, `payment_date`, `receipt_url`, `receipt_file_name`, `notes`, `status`, `rejection_reason`, `reviewed_by`, `reviewed_at`, `created_at` |
| `service_categories` | `id`, `salon_id`, `name`, `description`, `created_at` |
| `services` | `id`, `salon_id`, `category_id`, `name`, `description`, `price_lkr`, `duration_minutes`, `commission_rate`, `is_online_booking_enabled`, `is_active`, `created_at`, `updated_at`, `assigned_staff_ids` |
| `staff` | `id`, `salon_id`, `name`, `position`, `phone`, `email`, `status`, `default_service_commission`, `default_product_commission`, `working_hours`, `color`, `created_at`, `updated_at`, `auth_user_id` |
| `customers` | `id`, `salon_id`, `name`, `phone`, `whatsapp`, `email`, `gender`, `birthday`, `address`, `notes`, `status`, `total_spent_lkr`, `visits_count`, `last_visit_at`, `created_at`, `updated_at` |
| `appointments` | `id`, `salon_id`, `customer_id`, `customer_name`, `customer_phone`, `customer_email`, `staff_id`, `staff_name`, `service_names`, `service_ids`, `date`, `start_time`, `end_time`, `duration_minutes`, `total_price_lkr`, `status`, `payment_status`, `booking_source`, `notes`, `internal_notes`, `invoice_id`, `check_in_at`, `check_out_at`, `idempotency_key`, `created_at`, `updated_at` |
| `product_categories` | `id`, `salon_id`, `name`, `created_at` |
| `products` | `id`, `salon_id`, `category_id`, `name`, `sku`, `selling_price_lkr`, `cost_price_lkr`, `stock_quantity`, `low_stock_threshold`, `supplier`, `expiry_date`, `status`, `created_at`, `updated_at` |
| `stock_movements` | `id`, `salon_id`, `product_id`, `product_name`, `type`, `quantity_change`, `balance_after`, `reason`, `reference_id`, `created_at` |
| `invoices` | `id`, `salon_id`, `invoice_number`, `customer_id`, `customer_name`, `customer_phone`, `items`, `subtotal_lkr`, `discount_lkr`, `tax_lkr`, `tip_lkr`, `total_lkr`, `paid_amount_lkr`, `balance_lkr`, `payment_method`, `status`, `notes`, `created_by`, `created_at` |
| `commissions` | `id`, `salon_id`, `staff_id`, `staff_name`, `invoice_id`, `invoice_number`, `item_type`, `item_name`, `item_amount_lkr`, `commission_percentage`, `commission_amount_lkr`, `status`, `paid_at`, `created_at` |
| `expense_categories` | `id`, `salon_id`, `name`, `created_at` |
| `expenses` | `id`, `salon_id`, `category_id`, `category_name`, `description`, `amount_lkr`, `payment_method`, `date`, `notes`, `receipt_url`, `receipt_file_name`, `created_at` |
| `support_tickets` | `id`, `salon_id`, `salon_name`, `user_email`, `subject`, `category`, `priority`, `status`, `assigned_to`, `messages`, `created_at`, `updated_at` |
| `announcements` | `id`, `title`, `content`, `type`, `target_audience`, `is_active`, `published_at` |
| `audit_logs` | `id`, `salon_id`, `actor_email`, `actor_role`, `action`, `entity`, `entity_id`, `details`, `user_agent`, `ip_address`, `created_at` |
| `website_configs` | `salon_id` (primary key), `status`, `draft_config`, `published_config`, `published_at`, `last_saved_at`, `created_at`, `updated_at` |
| `website_reviews` | `id`, `salon_id`, `customer_name`, `customer_phone`, `rating`, `review_text`, `service_ref`, `status`, `is_featured`, `verified_booking`, `moderated_at`, `moderated_by`, `created_at`, `updated_at` |
| `landing_page_documents` | `id`, `status`, `version`, `content`, `created_by`, `updated_by`, `created_at`, `updated_at`, `published_at` |
| `landing_page_media` | `id`, `document_id`, `section_key`, `storage_path`, `alt_text`, `caption`, `display_order`, `is_enabled`, `created_by`, `created_at` |
| `appointment_status_history` | `id`, `salon_id`, `appointment_id`, `from_status`, `to_status`, `reason`, `changed_by`, `created_at` |
| `notifications` | `id`, `salon_id`, `recipient_user_id`, `recipient_role`, `title`, `message`, `type`, `read_at`, `created_at` |
| `transactional_email_dispatches` | `id`, `appointment_id`, `template`, `recipient_email`, `status`, `created_at`, `sent_at` |
| `website_review_rate_limits` | `salon_id`, `requester_hash`, `window_started_at`, `request_count`, `updated_at` |

The table/column inventory above is static. Confirm exact PostgreSQL types and default expressions by applying to a disposable database before sign-off.

### Primary keys, foreign keys, uniqueness and checks

- Most entity tables use UUID primary keys generated by `gen_random_uuid()`; `subscription_plans.id` is text, while `profiles.id` references `auth.users(id)`, `platform_admins.user_id` references `profiles(id)`, and `website_configs.salon_id` is both its primary key and a salon foreign key.
- Tenant relationships reference `salons`; memberships and subscriptions are unique per `(user_id, salon_id)` and `salon_id`, respectively. Product SKU is unique per salon; invoice number is unique per salon; email dispatch is unique per `(appointment_id, template)`.
- Other foreign-key links include subscriptions/payments to plans; service/product categories; appointments to customer/staff; stock movements to products; invoices to customers; commissions to staff/invoices; expenses to categories; support/notification/audit rows to salons; review moderation to profiles; landing media to documents; appointment history to appointments/profiles; staff login link to profiles; and email dispatch to appointments. Several nullable links use `SET NULL`; salon-owned child rows generally cascade on salon deletion.
- CHECK constraints cover salon/subscription/payment/member/appointment/product/stock/invoice/commission/ticket/announcement/review/website/landing/email status and type domains, positive/allowed review values and text lengths, billing cycle, payment method, and the Phase 14 single platform-admin role.
- Migration 14’s unique expression index allows at most one row in `platform_admins`; it does not ensure the row exists. Its CHECK constraint rejects the legacy `support` role.
- Important non-constraint indexes declared include salon slug/status; membership user/salon; payment salon/status; service/staff/customer/product/stock/invoice/commission/expense/audit salon lookups; customer phone per salon; appointment date/staff-date/status/idempotency; website config status and review salon/status; landing document status/update and media document/section; notification recipient/salon recency; Phase 17 public-booking rate limiting; and staff login lookup/uniqueness.
- Runtime presence and validity of every constraint/index is unknown.

### Functions, triggers and grants

The migrations define or replace helper predicates (`is_super_admin`, `is_salon_member`, `is_salon_owner`, `is_salon_manager_or_owner`, `has_salon_permission`, `salon_is_operational`, `salon_has_active_feature`, staff lookup and row-limit helpers), registration and trial/package administration RPCs, customer/appointment read-write RPCs, public booking, POS/inventory/payment/support/notification/commission RPCs, website-review/rate-limit helpers, and trigger functions for timestamps, authorization/integrity, appointment history/status, staff linking, approval-field protection, payment validation, website publication, and business constraints.

Final migrations revoke broad execution for many security-sensitive functions and grant narrowly to `authenticated` and/or `service_role`; public booking/review endpoints have explicit intended public/service paths. Phase 17’s receipt Storage rules use the private `payment-receipts` bucket and role/AAL2-aware access. Some earlier SECURITY DEFINER functions use `SET search_path = public`; later hardened functions often use `pg_catalog, public`. Review all remaining SECURITY DEFINER signatures and effective grants in PostgreSQL before release. Static source search cannot prove the effective privileges after Supabase default grants, role inheritance, trigger ownership, or platform defaults.

## RLS and role matrix

The SQL enables RLS across application tables and replaces several permissive legacy policies in later migrations. `service_role` is intended for trusted Netlify server paths and bypasses RLS; it must never be exposed to browser code. Phase 17 removes direct public reads of salon/service/staff/customer/website rows and routes public website access through a whitelisted server endpoint.

| Role | Intended effective access in final policy helpers |
|---|---|
| Unauthenticated/`anon` | No direct business-table access. Public booking/review paths are narrowly routed through designated RPC/server flows. Receipt Storage is private. |
| Owner | Own active salon; salon settings and membership administration; authorized operational/business data and enabled features; payment submission and receipt handling. Cannot self-approve or activate paid subscriptions. |
| Manager | Operational salon data and permitted staff/service/inventory/finance/report/commission functions, subject to active salon and subscription entitlements. Cannot manage members or approve salons. |
| Receptionist | Operational customer, appointment and sales functions; no staff/member, inventory, finance, report, or subscription administration outside explicitly allowed flows. |
| Staff | Limited to assigned staff row and assigned/linked appointment/customer operational records via constrained functions; not general salon-wide reporting/finance/member access. |
| Super Admin | Privileged policy branches require the platform-admin row and JWT AAL2. Approval, subscription and payment administration is server/database gated. |

The above is the intended policy model inferred from helper functions and policies, not a result of role-by-role integration tests. Policy composition is permissive by default unless marked restrictive; all policies on each table must be evaluated together. No live catalog query was performed.

### Security positives

- Tenant ownership is represented through salon foreign keys and membership checks; final customer/appointment paths are RPC-mediated and staff access is narrowed.
- Phase 14 protects salon approval/identity fields from ordinary owners and hardens policy/grant paths.
- Phase 15 uses `trial_ends_at` as the authoritative trial deadline, provides explicit staff-to-auth linking, and moves support message attribution into an identity-aware function.
- POS stock/invoice/commission operations use transactional database functions rather than trusting client-supplied stock totals.
- Phase 17 uses a private payment receipt bucket and removes direct public table access in favor of a server-side allowlisted API.
- Super Admin checks require both a platform-admin record and AAL2 at the database and Netlify boundaries.

## Application-to-database compatibility

| Feature | Database support | Application compatibility / status |
|---|---|---|
| Auth/profile, roles, salon registration | `profiles`, `salon_members`, registration RPC | Repository uses authenticated Supabase identities and role/membership reads. Registration is designed to create a pending salon; end-to-end authorization tests were not run. |
| Salon approval, trials, plans, manual payments | Salon/subscription/plan/payment tables and admin functions | Netlify service-role administration implements approval/trial/package/payment operations. See the trial-deadline mismatch below and non-atomic multi-step admin operations. |
| Customers and appointments | Tables plus role-limited RPCs, history and public booking | Repository calls customer/appointment RPCs and the public booking endpoint/RPC. Compatibility appears intentional; runtime/PostgREST signature checks remain outstanding. |
| Staff and permissions | `staff.auth_user_id`, memberships, scoped staff RPCs | The repository has an explicit link path. Some UI staff metadata (for example presentation-only fields) is not a database column and must not be assumed persisted. |
| POS, invoices, stock, commissions | Invoice/product/stock/commission tables and authoritative RPCs | Repository has transactional RPC paths; database concurrency and rollback behavior have not been integration-tested. |
| Expenses, reports, analytics | Expense, invoice, commission and stock tables with RLS | Schema supports key data, but actual report completeness and feature-entitlement enforcement need role/plan tests. |
| Website portfolio and reviews | `website_configs`, `website_reviews`; Netlify `public-api` and `PublicWebsiteApi` exist | The source also contains `WebsiteService` localStorage persistence. Confirm the production builder exclusively uses the API/database path; local-only flows do not persist across browsers/instances. Netlify entitlement checks are inconsistent with the final trial deadline. |
| Landing-page CMS | `landing_page_documents` and `landing_page_media` | `LandingPageService` still uses localStorage/memory rather than these tables. CMS edits are not reliably database-backed. No landing-media Storage bucket/policy was identified. |
| Support | `support_tickets` with JSONB messages and secure creation RPC | Creation attribution is hardened in SQL; Netlify/service-role updates and audit failures need transactional/error-path testing. Message JSONB limits message-level indexing/audit granularity. |
| Notifications and email | `notifications`, `transactional_email_dispatches` | Server-side writes are intended. Verify retries: a pending unique dispatch row may remain after a send exception unless the error path records `failed`. |
| Custom domains | Plan flag and salon `portfolio` JSON/UI fields | No dedicated domain lifecycle table or verified DNS/TLS/custom-host backend flow was found. UI state alone is not proof of domain ownership or entitlement. |
| Payment receipt storage | Private `payment-receipts` bucket and Phase 17 Storage policies | Correct intent is present; bucket existence, public flag, effective policy composition, signed URL expiry and cross-tenant access were not runtime-checked. |
| Netlify runtime | Server functions use Supabase server credentials and authorization helpers | Names/usage are source-visible; deployment environment configuration was not inspected. Never put service-role credentials in `VITE_*` browser variables. |

## Findings ranked by risk

### High

1. **Trial expiry can be bypassed in Netlify portfolio paths.** Migration 15 explicitly makes `trial_ends_at` authoritative and only falls back to `end_date` in the database helper. However, `netlify/functions/_security.ts` (`requireSalonManager(..., requirePortfolio=true)`) and `netlify/functions/public-api.ts` (`publicWebsite`) select/check `end_date` and do not use `trial_ends_at`. A trial whose legacy `end_date` exceeds its trial deadline can remain publishable/servable past expiration. Correct both server paths to use the same authoritative trial-vs-paid logic as `salon_is_operational`/`salon_has_active_feature`; add tests for a trial whose `end_date` is later than `trial_ends_at`, an expired trial, and an active paid subscription.
2. **Website/CMS persistence paths are mixed.** `WebsiteService` and `LandingPageService` retain localStorage/memory paths; the CMS tables are not the persistence source for the landing-page service. Verify and migrate all production editing/reading paths to the authenticated/server database APIs before claiming persistence. Add multi-session and serverless-instance persistence tests.
3. **No PostgreSQL execution validation.** All 15 migrations and security-definer functions remain unparsed/unexecuted in this audit. This is a hard release blocker: run the exact sequence only on a disposable local PostgreSQL/Supabase instance, then test policies/RPCs with multiple isolated tenants and roles. Do not treat lint/build as SQL validation.

### Medium

4. **Exactly one Super Admin is not guaranteed to exist.** The migration enforces at most one row and role `superadmin`, but cannot ensure a primary account exists or that its owner has MFA enrolled. Provision and verify the single approved account using a documented secure out-of-band process; test AAL1 denial and AAL2 success.
5. **Administrative workflows use multi-step service-role writes.** In `netlify/functions/supabase-admin.ts`, related salon/subscription/payment and audit operations are not consistently one database transaction; some audit write errors are ignored. A mid-flow failure can leave business state updated without a corresponding audit event or leave related records inconsistent. Move critical state transitions to authorized transactional RPCs and make audit failure behavior explicit.
6. **Custom-domain and CMS media workflows are incomplete.** No dedicated verified-domain lifecycle was found, and `landing_page_media.storage_path` has no corresponding bucket configuration/policy in the inspected migrations. Add ownership verification, entitlement checks and private/public media policy design before enabling those UI features.
7. **Email dispatch retry state needs verification.** The unique `(appointment_id, template)` dispatch record starts as `pending`. Ensure exceptions/timeouts transition it to `failed` and allow a safe retry; test duplicate requests and provider timeouts.
8. **Effective grants and SECURITY DEFINER search paths need live catalog review.** Several older functions retain `SET search_path = public`, and the repository does not establish a complete effective privilege inventory. Review every definer function’s owner, `EXECUTE` grants, fixed search path and object qualification against actual PostgreSQL role grants.

## Exact files requiring correction or verification

| File | Required action |
|---|---|
| `netlify/functions/_security.ts` | Align portfolio authorization with migration 15’s authoritative trial deadline and test boundary dates. |
| `netlify/functions/public-api.ts` | Align public website serving/entitlement checks with the same authoritative trial/active-subscription rule. |
| `src/services/websiteService.ts` | Confirm all production portfolio edits/read paths use persistent API/database storage; remove or explicitly gate local-only persistence. |
| `src/services/landingPageService.ts` | Connect CMS reads/writes to `landing_page_documents`/`landing_page_media` or clearly disable production CMS actions until implemented. |
| `netlify/functions/supabase-admin.ts` | Make subscription/approval/payment transitions transactional and surface audit failures. |
| `netlify/functions/send-email.ts` | Verify and correct dispatch failure-state/retry behavior. |
| `supabase/migrations/20261117190000_database_architecture_completion.sql` | Validate on PostgreSQL; review function grants, triggers, limits and trial rules in integration tests. |
| `supabase/migrations/20261117180000_phase1_security_corrections.sql` | Validate one-account constraint against the intended empty state and verify final policies/grants. |
| `supabase/migrations/20261117000000_phase17_security_boundaries.sql` | Validate full policy composition, private bucket settings, transaction behavior and media/payment access. |
| `supabase/migrations/` (all 15 files) | Apply in exact timestamp order to a disposable database and test rollback/atomicity assumptions; no remote application is recommended before this passes. |

## Required automated verification

1. PostgreSQL/Supabase disposable-database migration test from a clean database, including all 15 files and schema/type/function inspection afterward.
2. RLS matrix tests for Owner, Manager, Receptionist, Staff and Super Admin; two independent salons; SELECT/INSERT/UPDATE/DELETE and cross-tenant attempts.
3. Super Admin MFA tests for AAL1 denial/AAL2 authorization and no self-provisioning or duplicate platform-admin path.
4. Pending/suspended salon, trial-before/at/after-expiry, active paid, expired plan, disabled plan and per-feature entitlement tests—including the Netlify paths.
5. Payment receipt tests for private bucket, salon-owner access, AAL2 admin access, anonymous denial, cross-salon denial, signed URL expiry and legacy broad policies.
6. Registration duplicate prevention and salon-approval authorization tests.
7. POS/inventory concurrency, idempotency, rollback, commission settlement and customer/appointment cross-link tests.
8. Support attribution and service-role audit failure tests; email dispatch provider timeout/retry tests.
9. Website/CMS persistence tests across sessions/processes and custom-domain verification/entitlement tests.
10. Browser bundle/environment test confirming service-role keys are never included in client configuration or output.

## Final status and next action

**Final readiness: NOT READY.** The migration ordering and source-level architecture are promising but not verified by PostgreSQL execution. Production use is additionally blocked by the Netlify trial deadline mismatch, incomplete persistent website/CMS paths, and unfinished custom-domain/media integration.

**Safe next action:** create an isolated, disposable local Supabase/PostgreSQL test environment that contains no production data, run all 15 migrations in timestamp order, then execute the role/tenant/storage/entitlement tests listed above. Fix the local application mismatches and rerun those tests. Do not apply migrations to the linked or production project without explicit approval and a separate verified preflight.

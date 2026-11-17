# Moonbox Salon — Phase 1 Supabase Data Architecture Report

## Scope and preservation

This phase keeps the existing routes, page hierarchy, dashboards, public booking screens, website builder, CMS screens, POS, inventory, appointment lifecycle, staff, customer, invoice, expense, subscription, support, and Super Admin UI intact. The migration is layered behind the existing `StorageService` contracts so the current component workflows remain recognizable and usable.

No live Supabase project was modified and no migration was executed from this environment.

## Implemented

`src/services/supabaseRepository.ts` now provides a typed asynchronous repository for the current domain entities. It resolves the authenticated Supabase user from `auth.users`/`profiles`, resolves active `salon_members` records, verifies tenant access before tenant queries, maps snake_case database rows to the existing TypeScript domain shapes, and exposes async reads for tenants, plans, customers, services, categories, staff, appointments, inventory, stock movements, invoices, expenses, commissions, manual payments, and support tickets.

`src/services/storageService.ts` now uses localStorage only for explicit test/demo mode. In configured production mode, it uses an in-memory bootstrap cache populated from Supabase and no longer silently falls back to `mockInitialData`. Existing customer, service, staff, appointment, product, and invoice mutations queue asynchronous Supabase writes while keeping the existing synchronous UI contract during this migration phase. Errors are logged explicitly and never replaced with demo success.

`src/context/AuthContext.tsx` now resolves normal users from Supabase `profiles` and `salon_members`; it no longer creates a missing profile as an owner of a hard-coded tenant. Supabase-configured sign-in fails closed when the authenticated account has no active membership. Registration uses the new database RPC when an authenticated signup session is available.

`src/main.tsx` now awaits the data bootstrap before rendering the existing app shell. Public booking paths use the authoritative `submit_public_booking()` RPC when Supabase is configured. The alternate booking modal was updated without changing its confirmation UI or email workflow.

Two additive migrations were added. `20261113000000_auth_registration_rpc.sql` defines the atomic authenticated registration boundary that creates a profile, pending salon, owner membership, pending subscription, and audit record. `20261113000001_pos_atomic_rpc.sql` defines an atomic POS invoice boundary that locks and validates inventory before inserting the invoice and stock movements. These migrations are documentation/source changes only in this phase; they were not run.

## Tests added

`src/services/supabaseRepository.test.ts` covers domain row mapping for customers and appointments and verifies that only authenticated membership tenant IDs are accepted by the repository boundary. These tests are credential-free and do not claim live RLS verification.

## Remaining localStorage/business dependencies

Theme, booking-language, receipt-width, and error-recovery preferences remain intentionally device-local. Supabase Auth owns configured production sessions. The remaining business-oriented local dependencies are primarily the existing website/CMS services (`src/services/websiteService.ts`, `src/services/landingPageService.ts`) and the many legacy `StorageService` consumers that still use its synchronous cache contract. Secondary writes for expenses, commissions, manual payments, support tickets, notifications, announcements, and Super Admin operations still need repository methods and async component state updates. The production cache is now Supabase-hydrated, but full CRUD replacement is not complete for every module.

## Database requirements

Apply the existing migrations in order, followed by:

1. `20261112000000_public_boundary_hardening.sql`
2. `20261113000000_auth_registration_rpc.sql`
3. `20261113000001_pos_atomic_rpc.sql`

The new RPCs require the existing tenant helpers, the `pgcrypto` extension (`gen_random_uuid()`), the appointment overlap trigger, and the `profiles`, `salons`, `salon_members`, `salon_subscriptions`, `subscription_plans`, `customers`, `products`, `stock_movements`, and `invoices` tables. The live project must be backed up and tested in staging before execution.

## Validation

The final validation command is:

```bash
npm run lint && npm test -- --run && npm run build
```

The successful run should report 5 test files and 27 tests, with a successful Vite build. The build retains the existing large-client-chunk advisory. This local result does not verify database migrations, RLS behavior, concurrent bookings, MFA claims, or Netlify deployment.

## Next steps

First, apply the three new migrations to a disposable staging Supabase project and run two-account RLS tests. Then implement repository methods for website configs/reviews, landing CMS, expenses, commissions, payments, support, notifications, and announcements. Convert the highest-value dashboard components to async hooks with loading/error/empty/success states. Finally, replace the optimistic write-through queue with awaited repository results for POS, appointment, booking, and payment flows, and run staging end-to-end tests before Netlify deployment.

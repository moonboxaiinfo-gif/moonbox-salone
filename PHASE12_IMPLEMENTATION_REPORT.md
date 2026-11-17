# Moonbox Salon — Phase 12 Implementation Report

**Scope:** Customers, services/categories, staff and appointments — asynchronous Supabase migration  
**Source:** Supplied Phase 11 project ZIP  
**Status:** Code implementation and local checks complete; database deployment and live verification intentionally not performed.

## Summary

Phase 12 migrates the target business screens onto the existing `useTenantResource` architecture and authenticated `SupabaseRepository` methods. The shared resource layer now attaches PostgREST abort signals, suppresses obsolete results, invalidates mounted resources after writes, binds cached data to the active auth-session generation, clears mounted values on session change, and masks the former tenant’s rows while the new tenant resource loads.

Customer listing, customer details and history, the service/catalog editor and list, staff roster/editor, appointment calendar/editor, POS customer/catalog/staff selection, invoices/commission labels, public booking, and public salon/website service views now consume async resources or the existing published server payload. Loading, error/retry and empty states were retained or added where needed. Existing routes, color system and core modal layouts were preserved.

Confirmed customer/service/staff/appointment writes return server records and IDs; failed writes remain visible without closing forms, and forms/checkout prevent duplicate submits. POS now selects the persisted UUID when a newly created customer is confirmed. Service deletion waits for a confirmed delete. Appointment availability is checked against live async appointment data as an advisory client check; database overlap protection remains authoritative. Appointment status options follow the server transition map, and public confirmation uses the returned appointment/customer/staff IDs, status and server price. A pending public booking is described as a request pending salon confirmation.

## Persistence and security changes

The additive migration `supabase/migrations/20261114000000_phase12_domain_integrity.sql` adds `services.assigned_staff_ids` and `appointments.service_ids` without changing prior migrations. Triggers validate category/customer/staff/service tenant links, qualification, salon and staff hours/breaks, and allowed appointment lifecycle transitions. The public `submit_public_booking()` RPC keeps its SECURITY DEFINER boundary and validates enabled services, server price/duration, staff qualification, idempotency, automatic qualified-staff selection and database overlap protection. The existing appointment overlap trigger and idempotency index from prior migrations are preserved.

Authenticated repository reads and writes validate `auth.getUser()` against active `salon_members` before tenant-scoped operations. The migration does not weaken RLS; RLS remains the final database authorization boundary. No claim is made that live policies, grants, role permissions or SQL runtime behavior were verified: no database was connected and no SQL was executed.

## Modified files

The working tree was compared directly against the supplied archive. These are the exact pre-existing project files changed, plus the new Phase 12 checklist and migration:

```text
PHASE12_PRE_IMPLEMENTATION_CHECKLIST.md
src/components/appointments/AppointmentCalendar.tsx
src/components/appointments/AppointmentModal.tsx
src/components/commissions/CommissionList.tsx
src/components/customers/CustomerList.tsx
src/components/customers/CustomerModal.tsx
src/components/customers/CustomerProfileDrawer.tsx
src/components/invoices/InvoiceList.tsx
src/components/pos/POSRegister.tsx
src/components/public/PublicBookingFlow.tsx
src/components/public/PublicBookingPage.tsx
src/components/public/PublicPortfolioPage.tsx
src/components/public/PublicSalonPage.tsx
src/components/services/ServiceList.tsx
src/components/services/ServiceModal.tsx
src/components/staff/StaffList.tsx
src/components/staff/StaffModal.tsx
src/components/website/ServicesTab.tsx
src/components/website/ThemeTab.tsx
src/components/website/WebsiteRenderer.tsx
src/components/website/WebsiteWorkspace.tsx
src/services/asyncDataService.ts
src/services/phase10AsyncArchitecture.test.ts
src/services/phase12AsyncMigration.test.ts
src/services/phase7AsyncArchitecture.test.ts
src/services/publicWebsiteApi.ts
src/services/storageService.ts
src/services/supabaseRepository.crud.test.ts
src/services/supabaseRepository.test.ts
src/services/supabaseRepository.ts
supabase/migrations/20261114000000_phase12_domain_integrity.sql
```

The additional handover files are `PHASE12_IMPLEMENTATION_REPORT.md`, `PHASE12_REMAINING_BLOCKERS.md`, `PHASE12_TEST_RESULTS.md`, and `PHASE12_MIGRATION_INVENTORY.md`.

## Remaining synchronous references and browser storage

All remaining synchronous target-domain getters, availability lookups and local appointment/customer mutations are confined to explicit `isLocalDemoMode` branches in the shared demo loaders and public preview routes. The exact callsites and reasons are listed in `PHASE12_MIGRATION_INVENTORY.md`. No migrated production screen reads target-domain business records from synchronous `StorageService` getters.

`POSRegister.tsx` still calls `StorageService.getProducts()` for product inventory; products/stock were not one of the four Phase 12 domains and the existing product flow remains outside this migration. Other localStorage use remains for browser/session identity markers, theme and receipt-width preferences, public booking language, the pre-existing website-config/review feature, and explicit local demo storage. These are not silently used as the production source of truth for the migrated four domains.

## Tests and build

Final results: `npm run lint` passed; `npm test -- --run` passed **12 files / 68 tests**; `npm run build` passed. The production build continues to emit Vite’s existing warning that the main JavaScript chunk exceeds 500 kB. Tests include repository mapper and CRUD contracts, AbortSignal propagation, async architecture source guards, explicit demo isolation, loaded-empty/error/retry view contracts, public booking boundary/status contracts and stale-cache/session checks. They do not replace mounted-browser lifecycle tests or live PostgreSQL/RLS/concurrency verification.

## Required database rollout and next phase

Review and apply the additive migration only through the approved migration process after confirming the deployed migration history and backing up staging data. Then exercise active/inactive membership, role matrix, tenant-isolation, service qualification, working hours/breaks, slot conflicts, duplicate idempotent submissions, and appointment status transitions in a disposable staging Supabase project. Do not enable live booking until those checks pass.

**Recommended Phase 13:** staging database migration/reconciliation and two-tenant RLS/role/concurrency verification, followed by browser-mounted async lifecycle tests and production configuration/release readiness review.

# Moonbox Salon — Phase 12 Migration Inventory

## Domain status

| Domain / consumer | Production data path after Phase 12 | Confirmed writes / behavior |
|---|---|---|
| Customers | `useTenantCustomers` and repository `customers()`; customer profile histories use async appointment/invoice resources. List search/sort/statistics use the loaded server rows. | Customer create/edit awaits `saveCustomerConfirmed`; POS keeps the returned database UUID. Duplicate submit is locked; form stays open and values remain on failure. Customer delete was not supported by the supplied workflow. |
| Services and categories | Shared `useTenantCatalog` loads services and categories; POS, appointment forms, public views and website editing consume async/published payloads. | Service create/edit awaits confirmed upsert and returned UUID; deletion awaits confirmed repository delete. Empty category maps to SQL NULL. Service-staff qualification persists in the additive UUID array column. |
| Staff | `useTenantStaff` in roster, service/appointment editors, commissions and POS. Staff status, commission fields, working hours and color map from repository rows. | Staff create/edit awaits confirmed upsert; service assignments are stored on services’ qualified-staff relation. Existing role behavior is not widened. |
| Appointments | `useTenantAppointments` in calendar/editor/history; modal dependencies use async customers/catalog/staff and async appointment data for advisory overlap checks. | Create/edit/status operations await repository confirmation. Modal status choices follow allowed transitions; duplicate save is prevented. Database overlap and new tenant/qualification/hours/status triggers are the final guardrails. |
| Public booking | Published site payload is fetched with cancellable requests; client uses the existing `submit_public_booking()` RPC and the server-returned record. | RPC owns final eligibility, price/duration, persisted IDs/status, qualified-staff selection, idempotency and overlap behavior. Pending status is represented as a request, not as confirmed. |
| POS, history, website and commissions | POS customer/service/staff, invoice list/customer invoice history, commission staff labels and public/website catalogs no longer use synchronous target-domain cache reads in production. | POS invoice transaction retains its existing atomic confirmed persistence boundary. Website published content remains on its existing API flow. |

## Shared architecture changes

`src/services/asyncDataService.ts` reuses `useTenantResource` and exposes typed customer, catalog, staff, appointment, invoice and customer-history resources. Each loader receives a signal. Mounted invalidation listeners rerun resources; cache entries carry a session generation; a response from a prior session cannot update state/cache; auth transitions clear mounted data immediately; and a render-time resource key masks data from a previous tenant during the next tenant load.

`src/services/supabaseRepository.ts` attaches `AbortSignal` to PostgREST reads and retains authenticated `getUser()` plus active `salon_members` membership validation before tenant operations. Target writes map server-confirmed rows back to existing domain types. The new migration is additive and does not alter older migration files.

## Remaining synchronous target-domain references

The references below are deliberate demo/test adapters, not production sources of truth:

| File and line(s) | Calls | Why retained |
|---|---|---|
| `src/services/asyncDataService.ts:171,178,189,196,210` | synchronous customer/catalog/category/staff/appointment getters | Each is inside a loader branch guarded by `isLocalDemoMode`; production uses repository methods. |
| `src/components/public/PublicBookingPage.tsx:112,116,120` | services/categories/staff getters | Used only when `isLocalDemoMode` and the public route has its demo tenant; production uses the published website payload. |
| `src/components/public/PublicBookingPage.tsx:225,240` | `checkDoubleBooking()` | The production path short-circuits as advisory and does not read the cache; the local checks are in the demo-only branch. |
| `src/components/public/PublicBookingPage.tsx:314` | `checkDoubleBooking()` | Conditional expression uses the legacy checker only in `isLocalDemoMode`; the production RPC remains authoritative. |
| `src/components/public/PublicBookingPage.tsx:411` | `saveAppointment()` | Executed only after the explicit local-demo branch; configured production uses the secure RPC. |
| `src/components/public/PublicBookingFlow.tsx:108` | `checkDoubleBooking()` | Ternary confines cache conflict checks to local demo; production delegates the final decision to the RPC. |
| `src/components/public/PublicBookingFlow.tsx:124,131,208` | customer lookup/create and appointment save | Local CRM matching and local writes are inside explicit demo-only branches. Production submits one booking RPC and uses its persisted response. |
| `src/components/public/PublicPortfolioPage.tsx:62,66` | service/category getters | Published API payload is used in production; fallback to local site data is guarded by demo mode. |
| `src/components/website/WebsiteRenderer.tsx:25,29` | service/category getters | Renderer falls back to local data only in demo mode; production website workspace supplies loaded payload props. |

Other synchronous `StorageService` methods still exist for compatibility and demo fixtures, but no migrated production screen calls the target-domain business getters. `src/components/pos/POSRegister.tsx:78` still reads `StorageService.getProducts()` for product inventory; products/stock are outside the four Phase 12 domains. This is retained as a separate migration item rather than claimed as migrated.

## Remaining browser storage and fixture boundaries

`src/services/storageService.ts` reads/writes business fixture data only when `isLocalDemoMode` permits it. Other storage in the supplied project is for: login/session user markers and a superadmin MFA marker (`src/context/AuthContext.tsx`); theme preference (`src/context/ThemeContext.tsx`); receipt width (`src/components/invoices/InvoiceViewModal.tsx`); booking language (`src/components/public/PublicBookingPage.tsx`); website draft/published configuration, reviews and a client-side public review throttle (`src/services/websiteService.ts`); and error-boundary recovery (`src/components/common/ErrorBoundary.tsx`). The website builder and client-side review throttle are separate from the four migrated data domains and should be reviewed in their own phase if server-only persistence is required.

## New additive schema inventory

`supabase/migrations/20261114000000_phase12_domain_integrity.sql`:

- Adds `services.assigned_staff_ids UUID[]` and `appointments.service_ids UUID[]` plus GIN indexes.
- Enforces same-salon category, customer, staff and service links; service/stylist qualification; salon opening hours; staff working hours and breaks.
- Allows only pending/confirmed initial appointments and applies a server transition map to later status changes.
- Replaces the same-signature public booking function without removing its SECURITY DEFINER boundary or previous idempotency/overlap mechanisms; uses the database for persisted customer/appointment IDs, price/duration/status, qualification, available staff, and conflict protection.
- Is not applied or executed in this task. The project’s normal reviewed migration procedure and disposable staging verification remain required.

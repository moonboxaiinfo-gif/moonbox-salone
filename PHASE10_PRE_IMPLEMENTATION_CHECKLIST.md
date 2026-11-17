# Phase 10 Pre-Implementation Checklist

Date: 2026-11-14  
Source: `Moonbox-Salon-Phase9-Continuation.zip`  
Scope: async data architecture migration without live Supabase, SQL execution, or deployment.

## Evidence-based audit

The supplied source was extracted to `/home/ubuntu/moonbox-salon` before edits. The project contains the Phase 9 reports, ten uniquely timestamped Supabase migrations, repository/client code, local demo fixtures, Netlify functions, tests, and the full React component tree.

The audit found **151 synchronous `StorageService` references** in non-test application source. Only `DashboardOverview.tsx` and `ReportsDashboard.tsx` were using `useTenantData` before this phase. Production-safe confirmed writes already exist for several core domains, but many reads and several writes still use legacy synchronous/local contracts.

## Exact audited files with synchronous business-data references

- `src/context/TenantContext.tsx`
- `src/context/NotificationContext.tsx`
- `src/context/AuthContext.tsx`
- `src/services/asyncDataService.ts`
- `src/components/support/SupportTicketsList.tsx`
- `src/services/landingPageService.ts`
- `src/components/pos/POSRegister.tsx`
- `src/services/websiteService.ts`
- `src/components/commissions/CommissionList.tsx`
- `src/components/settings/OnlineBookingManager.tsx`
- `src/components/public/PremiumLandingPage.tsx`
- `src/services/entitlementService.ts`
- `src/components/settings/SalonSettings.tsx`
- `src/components/subscription/SubscriptionPage.tsx`
- `src/components/public/PublicSalonPage.tsx`
- `src/components/website/WebsiteRenderer.tsx`
- `src/components/subscription/BankTransferModal.tsx`
- `src/components/inventory/InventoryList.tsx`
- `src/components/public/PublicBookingPage.tsx`
- `src/components/website/ContactTab.tsx`
- `src/components/public/LandingPage.tsx`
- `src/components/inventory/ProductModal.tsx`
- `src/components/public/PublicPortfolioPage.tsx`
- `src/components/services/ServiceModal.tsx`
- `src/components/website/WebsiteWorkspace.tsx`
- `src/components/public/PublicBookingFlow.tsx`
- `src/components/services/ServiceList.tsx`
- `src/components/superadmin/AnnouncementsManager.tsx`
- `src/components/superadmin/PlanManagement.tsx`
- `src/components/public/NewLandingPage.tsx`
- `src/components/expenses/ExpenseList.tsx`
- `src/components/expenses/ExpenseModal.tsx`
- `src/components/superadmin/PaymentApprovals.tsx`
- `src/components/superadmin/SalonManagement.tsx`
- `src/components/invoices/InvoiceList.tsx`
- `src/components/customers/CustomerList.tsx`
- `src/components/superadmin/AuditLogViewer.tsx`
- `src/components/superadmin/SuperAdminDashboard.tsx`
- `src/components/customers/CustomerModal.tsx`
- `src/components/staff/StaffList.tsx`
- `src/components/portfolio/CustomDomainModal.tsx`
- `src/components/customers/CustomerProfileDrawer.tsx`
- `src/components/staff/StaffModal.tsx`
- `src/components/website/ThemeTab.tsx`
- `src/components/portfolio/PortfolioBuilder.tsx`
- `src/components/website/ServicesTab.tsx`
- `src/components/appointments/AppointmentModal.tsx`
- `src/components/website/CustomizeTab.tsx`
- `src/components/appointments/AppointmentCalendar.tsx`
- `src/components/auth/RegisterPage.tsx`

## Priorities and risks

1. **P0 — session and tenant boundary:** `AuthContext.tsx`, `TenantContext.tsx`, `NotificationContext.tsx`, and `asyncDataService.ts`. Stale local cache or revoked membership could expose old tenant state if reads are not session-bound.
2. **P0 — financial and booking writes:** `POSRegister.tsx`, `PublicBookingPage.tsx`, `PublicBookingFlow.tsx`, `AppointmentModal.tsx`, and `storageService.ts`. Writes must remain awaited, atomic, idempotent where applicable, and must not report success before the repository/RPC confirms success.
3. **P1 — business reads:** customer, service, staff, appointment, inventory, invoice, expense, commission, dashboard, and report consumers. These need loading/error/empty/retry handling and tenant-scoped repository loaders.
4. **P1 — privileged operations:** `superadmin/*`, `landingPageService.ts`, `AuthContext.tsx`, and platform repository methods. UI role strings are not authorization; deployed AAL2/RLS remains unverified.
5. **P1 — website/CMS:** `websiteService.ts`, `landingPageService.ts`, public website pages, and `publicWebsiteApi.ts`. Durable CMS and missing public Netlify handlers remain a separate integration concern.
6. **P2 — demo separation:** `storageService.ts`, `mockInitialData.ts`, auth registration fallback, and public local-demo branches. Fixtures must remain explicit and must never seed a future production database.

## Implementation completed in this phase

- Added a reusable `useTenantResource` lifecycle hook with loading, error, retry, session-scoped cache, tenant-keyed cache, cancellation on cleanup, and stale-response suppression.
- Changed the shared tenant snapshot path to call the authenticated `SupabaseRepository` directly in production. Local fixtures remain reachable only under explicit `isLocalDemoMode`.
- Added `SupabaseRepository.tenantDataSnapshot()` as the single parallel read boundary for the existing dashboard/report snapshot.
- Added documentation and preserved the existing RPC/write architecture.

## Not authorized / not performed

No live Supabase project was connected. No SQL was executed. No migration file was modified. No Netlify deployment or production data operation was performed.

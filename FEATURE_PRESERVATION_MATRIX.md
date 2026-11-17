# Moonbox Salon V3 — Feature Preservation Matrix

Baseline checkpoint: `f7ca065e8d432fadb5aaa37ed4c58630a97a2320` (`origin/main`). Baseline validation: `npm run lint` passed, `npm test` passed with 19 tests, and `npm run build` passed. The production build reports only the existing large-client-chunk warning.

## Routes and access boundaries

| Route | Active implementation | Access / behavior | Preservation criterion |
|---|---|---|---|
| `/` | `App.tsx` → `NewLandingPage.tsx` | Public marketing page | CTAs navigate to login/register/demo; pricing and FAQ anchors remain functional |
| `/login` | `LoginPage.tsx` | Public auth | Email/password, visibility toggle, forgot password and registration link remain available |
| `/register`, `/signup` | `RegisterPage.tsx` | Public auth | Multi-step salon registration and approval flow remain intact |
| `/forgot-password`, `/reset-password` | `ForgotPasswordPage.tsx` and router handling | Public auth | Recovery flow remains available |
| `/app`, `/dashboard` | `App.tsx` authenticated shell | Salon owner/staff or Super Admin | Tenant and role checks remain enforced |
| `/superadmin`, `/moonbox-control-portal` | `SuperAdminLogin.tsx`, `SuperAdminDashboard.tsx` | Restricted platform host and Super Admin | Admin-only operations remain protected |
| `/book/:salonSlug` | `PublicBookingPage.tsx`, `PublicBookingFlow.tsx` | Public tenant booking | Published salon lookup, service/staff/date selection and booking submission remain functional |
| `/portfolio/:salonSlug` | `PublicPortfolioPage.tsx` | Public published salon website | Published-only content, reviews and booking CTA remain isolated per tenant |

## Salon application modules

| Module | Route/tab owner | Current component(s) | Business operations preserved |
|---|---|---|---|
| Dashboard | `Sidebar` / `App` | `DashboardOverview.tsx` | Actual appointment, revenue, customer, payment, stock, schedule and report data |
| Appointments | `appointments` | `AppointmentCalendar.tsx`, `AppointmentModal.tsx` | Create, edit, cancel/delete where supported, staff/service/customer assignment, status and filters |
| Customers | `customers` | `CustomerList.tsx`, `CustomerModal.tsx`, `CustomerProfileDrawer.tsx` | Customer records, search, profile, history, notes and purchase context |
| Services | `services` | `ServiceList.tsx`, `ServiceModal.tsx` | Service categories, price, duration, online booking and staff assignment |
| Staff | `staff` | `StaffList.tsx`, `StaffModal.tsx` | Profiles, roles/status, schedules and commission settings |
| POS | `pos` | `POSRegister.tsx` | Service/product selection, customer, cart, discounts, payment, receipt and sale completion |
| Sales/invoices | `invoices` | `InvoiceList.tsx`, `InvoiceViewModal.tsx` | Transaction history, invoice detail and status |
| Inventory | `inventory` | `InventoryList.tsx`, `ProductModal.tsx`, `StockMovementModal.tsx` | Products, quantities, thresholds, categories, restocking and stock movements |
| Expenses | `expenses` | `ExpenseList.tsx`, `ExpenseModal.tsx` | Categories, records, payment method, receipts and reporting integration |
| Commissions | `commissions` | `CommissionList.tsx` | Existing commission calculations and staff reporting |
| Reports | `reports` | `ReportsDashboard.tsx` | Existing financial and operational calculations and exports |
| Website builder | `portfolio` | `WebsiteWorkspace.tsx` and website tabs | Themes, customization, services, gallery, reviews, contact, SEO, preview, publish/unpublish, domain, autosave and editor history |
| Online booking | `online_booking` | `OnlineBookingManager.tsx`, public booking components | Booking configuration and public booking workflow |
| Notifications | `notifications` | `NotificationCenter.tsx` | Existing notification visibility and actions |
| Settings | `settings` | `SalonSettings.tsx` | Existing salon configuration screens and actions |
| Support | `support` | `SupportTicketsList.tsx` | Tenant/support ticket workflow |
| Subscription | `subscription` | `SubscriptionPage.tsx`, `BankTransferModal.tsx` | Dynamic plans, billing cycle, manual bank transfer, receipt submission and approval status |

## Platform administration

`SuperAdminDashboard.tsx`, `SalonManagement.tsx`, `PaymentApprovals.tsx`, `PlanManagement.tsx`, `PlatformSettings.tsx`, `AuditLogViewer.tsx`, `AnnouncementsManager.tsx` and support tools remain restricted to the Super Admin role. Existing trial approval, payment approval, plan management, tenant management, audit and platform configuration behavior is not replaced by presentation changes.

## Data, APIs and security

`StorageService` remains the current local/data-layer source for tenant data, plans, appointments, payments, audit logs and admin operations. `supabaseClient.ts`, `websiteService.ts`, `publicWebsiteApi.ts`, Cloudinary signing and the production `server.mjs` remain compatibility boundaries. Existing Supabase migrations and tenant-isolation policies are preserved. Frontend visibility checks do not replace backend authorization, and no service-role secret is introduced into browser code.

## Verified V3 follow-up items

The baseline audit confirmed modal hook ordering issues in `AppointmentModal`, `CustomerModal`, `StaffModal`, `ServiceModal`, `ProductModal`, `ExpenseModal`, `PublicBookingFlow`, `OnboardingWizard`; a fake fallback receipt URL in `BankTransferModal`; and a Portfolio feature mismatch in subscription presentation. These are addressed as focused reliability fixes without changing business calculations or entitlement definitions.


## Phase 02 preservation and change record

The POS continues to use the existing tenant-filtered `StorageService` models and invoice write path; customer records, inventory, payment methods and appointments remain in place. Invoice sale creation now checks duplicate invoice identifiers and validates all requested stock before writing movements. The new cash-received amount is optional invoice metadata; existing invoices remain valid without it. Receipt reprints use the saved invoice records.

The header's three shortcuts were removed. Platform Website is still the `/` public route; Setup Wizard remains available through the existing `?onboarding=true` query; customer-facing booking remains available through `/book/:salonSlug`, the sidebar `online_booking` feature, website/portfolio CTAs and their existing booking API. The codebase contained no separately isolated standalone Booking Service module to delete; no shared booking API, table, migration, RLS policy, record, website, portfolio or booking component was removed.

Responsive source changes are limited to public salon/portfolio presentation and website themes. No customer website content, CMS configuration, domains, publishing or SEO data was migrated or deleted. See `PHASE2_IMPLEMENTATION_REPORT.md` for the precise verification boundaries and outstanding physical-device/live-site checks.

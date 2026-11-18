# 02 - Software Feature Inventory

| Feature | Frontend | Backend/data | Database dependency | Authentication/permission | Status |
|---|---|---|---|---|---|
| Landing/CMS | Premium landing components | Netlify public API and Supabase CMS repository | landing_page_documents/media | Public read; AAL2 super admin write | Requires live verification |
| Salon registration | RegisterPage/AuthContext | create_salon_for_current_user RPC | profiles, salons, salon_members, subscriptions, audit_logs | Authenticated | Implemented; live test required |
| Login/logout/reset | AuthContext and auth pages | Supabase Auth | profiles, platform_admins, salon_members | Authenticated or public reset | Implemented; live test required |
| Super Admin MFA | SuperAdminLogin/AuthContext | Supabase Auth MFA plus AAL2 database/function checks | platform_admins | AAL2 only | Requires live MFA test |
| Dashboard | DashboardOverview | Supabase/async repository or explicit demo mode | tenant snapshot resources | Active salon member | Implemented; live test required |
| Appointments | Calendar/modal/RPC repository | get/save/update Rpcs | appointments, status history, customers, staff | role and operational-plan checks | Implemented; live test required |
| Public booking | PublicBookingPage/Flow | submit_public_booking RPC or Netlify public API | salons, services, staff, appointments | Anonymous; RPC boundaries | Implemented; live test required |
| Customers | CustomerList/modal | save/get RPC | customers | Read/book role | Implemented; live test required |
| Staff | StaffList/modal | list RPC/direct repository | staff, memberships, auth_user_id | owner/manager manage staff | Implemented; live test required |
| Services/categories | ServiceList/modal | repository CRUD | services, service_categories | owner/manager manage | Implemented; live test required |
| POS/invoices | POSRegister/InvoiceList | create_pos_invoice RPC | invoices, products, stock_movements, customers | Active salon member/sell permission | Implemented; live test required |
| Inventory | InventoryList/product/stock modals | repository/RPC stock movement | products/categories/movements | owner/manager; inventory entitlement | Implemented; live test required |
| Expenses | ExpenseList/modal | repository CRUD | expenses/categories | manager/owner in RLS | Implemented; live test required |
| Commissions | CommissionList | repository/mark RPC | commissions | entitlement/role checks | Implemented; live test required |
| Reports | ReportsDashboard | async repository snapshot | appointments/invoices/expenses/customers/products | owner/manager reports entitlement | Implemented; live test required |
| Website builder | WebsiteWorkspace/tabs/themes | Netlify public API/Supabase repository | website_configs/reviews/media | owner/manager; portfolio entitlement | Implemented; live test required |
| Public portfolio | PublicPortfolioPage | public website API/Supabase | website configs and salon data | Public | Requires live verification |
| Salon settings | SalonSettings/Onboarding | repository update | salons | owner/manager | Implemented; live test required |
| Subscription | SubscriptionPage/Bank transfer modal | repository payment upload | subscription/payment requests/storage | owner; super admin approval | Implemented; live test required |
| Payments | Super Admin approvals | review_manual_payment RPC | manual_payment_requests/subscriptions/salons | AAL2 super admin | Requires live approval test |
| Support | SupportTicketsList | RPC append/create | support_tickets | authenticated salon member | Implemented; live test required |
| Notifications | NotificationCenter/context | repository/RPC | notifications | recipient user | Implemented; live test required |
| Platform operations | Super Admin components | AAL2 Netlify service function | salons/subscriptions/audit_logs/platform_admins | AAL2 super admin | Live deployment/transactions unverified |

## Issue summary

The frontend feature surface is broad and structurally implemented. The current evidence does not prove the complete feature lifecycle because the linked database and Netlify deployment were not accessed.


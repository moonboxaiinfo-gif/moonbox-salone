# Phase 13 Schema-to-Application Compatibility Report

**Scope:** source-level inventory of schema relationships and application data paths in the supplied migration tree. This is not a live schema diff; no database was connected and no SQL was applied or executed.

| Domain / tables | Application/repository path | Source-level compatibility and remaining checks |
|---|---|---|
| Salons, subscriptions, plans, memberships | `SupabaseRepository.tenantById/updateTenant`, `TenantContext`, subscription/Super Admin screens | Tenant settings use mapped salon fields and subscriptions; salon profile/online booking now await confirmed updates. Trial/plan/admin write paths remain incomplete; actual grants/RLS not verified. |
| Customers | repository customer list/save/history; POS customer selection | Customer rows are tenant-scoped by repository. New POS RPC resolves `customerId` to a customer in the target salon and derives name/phone server-side. Cross-tenant tests not run. |
| Services/categories and staff | async catalog/staff resources; POS service/staff selection | New POS RPC looks up active service/staff in the salon and checks `assigned_staff_ids` when configured. Actual column shape is based on the additive Phase 12 migration; database execution not run. |
| Products/categories/stock movements | new tenant resources; InventoryList/ProductModal/StockMovementModal/POSRegister | Product save excludes quantity; initial stock uses confirmed returned product UUID and an atomic stock movement. POS locks products and checks total requested stock. RPC runtime/concurrency and category mutation permissions not verified. |
| Invoices | POS register, invoice history/details, repository `createInvoiceAtomically` | Server RPC derives persisted lines/financial fields and returns row envelope; invoice DML is restricted to the function path in source. No invoice cancellation/adjustment workflow was found in the supplied callsites; if one exists in another deployment, a separate authorized RPC must be preserved/added. |
| Commissions | `CommissionList`, repository commissions and mark-paid operation | New POS RPC records commissions from server-derived line values and staff commission settings. Amount columns widened to invoice capacity in source. Paid-record immutability and effective grants need staging review. |
| Expenses/categories | ExpenseList/ExpenseModal and repository confirmed save/delete | Read paths now async. Receipt field is still a string URL; current file handling creates browser object URLs and is not durable/private. No private bucket/policy is included. |
| Manual payments/subscriptions | PaymentApprovals/SubscriptionPage and review RPC | Review function source assigns UUID actor via `auth.uid()` and preserves AAL2/pending state. App list reads and end-to-end approval are not migrated/tested. |
| Support tickets | SupportTicketsList and repository tenant support operations | Some confirmed mutations exist; list still uses sync cache and Super Admin all-ticket repository method is missing. |
| Notifications | NotificationContext and recipient-scoped repository/RPC | Existing source describes recipient-specific RLS and mark-read RPC. Cross-recipient and cross-tenant runtime checks are not run. |
| Website config/reviews, landing CMS, media | Website Builder/public API client and local WebsiteService/LandingPageService | Migrations exist for website configs/reviews/CMS metadata; app services remain localStorage/memory-backed and public Netlify route handlers are absent. Draft privacy, revision history, and private media remain blockers. |
| Audit logs / announcements / platform settings | audit and admin UI modules | Existing table and some mutation/reporting callsites exist, but complete server-authoritative audit coverage and async platform operations remain unverified/incomplete. |

## Database integrity review limits

The inventory used source migration declarations and referenced repository/component callsites. It did not compare actual column types, existing row distributions, effective grants, deployed RLS policy composition, extension versions, Storage configuration, or migration history. The Phase 13 migration contains targeted POS/member/payment changes only; it does not claim a full schema redesign.

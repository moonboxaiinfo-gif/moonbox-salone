# Phase 14 Async Migration Inventory

| Resource / screen | Current production read | Write/reconciliation | Status |
|---|---|---|---|
| Customers, services, staff, appointments | Existing `useTenantResource`/repository resources from Phase 12 | Confirmed writes and tenant invalidation | Existing Phase 12 implementation; database not live-tested |
| Products / POS catalog | New `useTenantProducts` in inventory and POS; repository list uses optional AbortSignal | POS invoice RPC; product save excludes stock; inventory movement RPC; invalidation after success | Implemented locally; SQL runtime NOT RUN |
| Stock movement history | New `useTenantStockMovements` in InventoryList | Atomic movement RPC; parent retries after success | Implemented locally; concurrency NOT RUN |
| Product categories | New `useTenantProductCategories` in ProductModal | Existing category save path remains; complete category CRUD/UI audit outstanding | Read path migrated; broader workflow incomplete |
| Expenses | New `useTenantExpenses` in ExpenseList | Confirmed repository writes; tenant invalidation replaces post-commit reload | Read path migrated; receipt storage remains unsafe/non-durable |
| Expense categories | New `useTenantExpenseCategories` in list/modal | Category write support exists in repository; full category management remains incomplete | Read path migrated |
| Commissions | New `useTenantCommissions` in CommissionList | Paid settlement awaits confirmed repository update and invalidates resource | Read path migrated; database role boundary NOT RUN |
| Notifications | Existing recipient-scoped repository/context implementation | Existing server RPC marks notifications read | Source implemented; RLS/runtime verification outstanding |
| Support tickets | Synchronous cache remains in some screens | Async repository operations exist for selected flows | Not migrated application-wide |
| Subscriptions / payments | Synchronous cache remains in UI paths | Selected trusted payment RPCs exist | Not migrated application-wide |
| Website Builder / Landing CMS | Browser localStorage/memory services remain | Not durable through current service interfaces | Not migrated |
| Announcements / platform settings / audit | Legacy sync calls or partial repository operations remain | Missing trusted operation coverage | Not migrated |

Shared semantics inherited from `useTenantResource`: loading, error, retry, AbortController cleanup, stale/session response suppression, cache invalidation, and tenant-key masking. Local source-contract tests verify presence and selected consumers; they do not simulate mounted React session changes or prove database isolation.

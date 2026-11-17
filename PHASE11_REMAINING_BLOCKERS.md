# Phase 11 Remaining Blockers

Phase 11 is **partially complete**, not production-ready.

The tenant and notification contexts are migrated, but the following evidence and work remain:

1. No live or disposable Supabase project was connected. RLS, function grants, cross-tenant denial, membership revocation, session expiry, and Super Admin AAL2 are source-level expectations only.
2. Existing `StorageService` notification writers remain in legacy business modules. They are available only through explicit local demo mode in the context path, but production event producers need a later trusted notification-delivery migration.
3. The current app still has many synchronous domain consumers outside TenantContext and NotificationContext. Phase 10 recorded 151 non-test references; Phase 11 reduces the context-level production reads but does not migrate every module.
4. Single-notification mark-read is implemented in the repository contract but not yet exposed as a dedicated notification-row action in the existing panel.
5. Durable Website Builder/Landing CMS persistence, missing public website handlers, Super Admin trusted operations, and client-trusted POS totals remain open from Phase 10.
6. The build still reports the existing large-client-chunk advisory.

Do not mark the project production-ready until staging tests exercise at least two salons, multiple roles, revoked membership, recipient-specific notifications, Super Admin AAL2, and failure/retry paths.

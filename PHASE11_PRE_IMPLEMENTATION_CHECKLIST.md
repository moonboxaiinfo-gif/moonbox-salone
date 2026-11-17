# Phase 11 Pre-Implementation Checklist

Source: Phase 10 workspace `/home/ubuntu/moonbox-salon`  
Scope: TenantContext and NotificationContext Supabase async migration; no live SQL or deployment.

## Audited source

- `src/context/TenantContext.tsx` — synchronous `StorageService.getTenantById`, `getPlans`, and `updateTenant`.
- `src/context/NotificationContext.tsx` — synchronous local notification reads and confirmed-write wrapper; no loading/error/retry state.
- `src/services/supabaseRepository.ts` — tenant membership, plans, and mark-all-notifications RPC existed; tenant-by-id and recipient-scoped notification read were missing.
- `src/services/asyncDataService.ts` — Phase 10 session/tenant cache invalidation foundation.
- `src/services/storageService.ts` — explicit demo-mode notification/tenant compatibility paths and production cache clearing.
- `src/components/notifications/NotificationCenter.tsx` — no remote loading/error state; mark-all button allowed repeated clicks.
- `src/components/onboarding/OnboardingWizard.tsx` — tenant update was not awaited before completing onboarding.
- `src/context/AuthContext.tsx` — logout/demo account switching cleared the old storage cache but not the Phase 10 async cache.
- `supabase/migrations/20261113000002_phase4_business_transactions.sql` — notifications table, recipient-specific RLS, and mark-all-read RPC already exist in source; no additive notification migration was required.

## Implementation priorities

1. Fail closed when Supabase is unavailable or active membership cannot be resolved.
2. Clear prior tenant state before account/tenant changes and suppress stale async results.
3. Require current-user membership and owner/manager role for tenant settings updates.
4. Read notifications using the authenticated recipient and tenant filter; rely on RLS as the final boundary.
5. Await remote mark-read confirmation before refreshing UI state.
6. Preserve explicit local demo mode only for fixtures and local compatibility behavior.
7. Add source/mapping tests, then run lint, unit tests, and build.

## Acceptance evidence

The migrated contexts expose loading/error/retry state, repository operations are awaited, and notification mapping derives `read` from `read_at`. Staging-only RLS, membership revocation, and AAL2 behavior remain unverified because no live Supabase project is connected.

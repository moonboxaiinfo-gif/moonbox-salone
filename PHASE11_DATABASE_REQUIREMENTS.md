# Phase 11 Database Requirements

No SQL was executed and no existing migration was modified.

## Existing notification contract verified in source

`supabase/migrations/20261113000002_phase4_business_transactions.sql` defines:

- `public.notifications` with `salon_id`, `recipient_user_id`, `recipient_role`, `title`, `message`, `type`, `read_at`, and `created_at`.
- RLS enabled on the table.
- SELECT/UPDATE policies requiring `recipient_user_id = auth.uid()` or the server-side `public.is_super_admin()` helper.
- `public.mark_notifications_read(UUID)` as a security-definer authenticated RPC, filtering by `recipient_user_id = auth.uid()` and optional salon ID.

Phase 11 therefore does not add a duplicate notification migration.

## Repository contracts added

- `SupabaseRepository.tenantById(tenantId)` — active membership checked before salon/subscription reads.
- `SupabaseRepository.updateTenant(tenant)` — active membership plus current-user owner/manager role check before updating salon settings.
- `SupabaseRepository.notificationsForCurrentUser(tenantId?)` — authenticated user filter plus tenant filter for salon users; Super Admin uses the server-authorized recipient query without a salon filter.
- `SupabaseRepository.markNotificationRead(notificationId)` — recipient-scoped update contract for future single-item UI.
- Existing `markNotificationsRead(tenantId?)` RPC remains the mark-all contract.

## Required staging verification

Verify table existence, policy behavior, function privileges, current migration history, and the `public.is_super_admin()`/membership helper definitions in a disposable staging project. Test two users and two salons, revoked membership, Super Admin AAL2, and attempts to read or update another recipient's notification.

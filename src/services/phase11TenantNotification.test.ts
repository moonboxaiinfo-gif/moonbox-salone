import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { mapSupabaseNotification } from './supabaseRepository';

const tenantContext = readFileSync(resolve(process.cwd(), 'src/context/TenantContext.tsx'), 'utf8');
const notificationContext = readFileSync(resolve(process.cwd(), 'src/context/NotificationContext.tsx'), 'utf8');
const notificationMigration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20261113000002_phase4_business_transactions.sql'), 'utf8');

describe('Phase 11 tenant and notification async migration guardrails', () => {
  it('maps unread notification rows without trusting client-provided recipient identity', () => {
    expect(mapSupabaseNotification({ id: 'n1', salon_id: 'salon-a', recipient_user_id: 'user-a', title: 'Booking', message: 'New booking', type: 'appointment', read_at: null, created_at: '2026-11-14T10:00:00Z' })).toMatchObject({
      id: 'n1', tenantId: 'salon-a', title: 'Booking', message: 'New booking', type: 'appointment', read: false,
    });
    expect(mapSupabaseNotification({ id: 'n2', salon_id: 'salon-a', recipient_user_id: 'user-a', title: 'Done', message: 'Read', type: 'support', read_at: '2026-11-14T10:01:00Z', created_at: '2026-11-14T10:00:00Z' }).read).toBe(true);
  });

  it('keeps tenant loading fail-closed and suppresses stale request results', () => {
    expect(tenantContext).toContain('const requestGeneration = useRef(0)');
    expect(tenantContext).toContain('requestGeneration.current !== generation');
    expect(tenantContext).toContain('Supabase is not configured. Tenant data cannot be loaded.');
    expect(tenantContext).toContain('setTenant(null)');
    expect(tenantContext).toContain('await repository.updateTenant(updated)');
  });

  it('uses authenticated recipient and tenant filters for notification reads', () => {
    expect(notificationContext).toContain('repository.notificationsForCurrentUser(isSuperAdmin ? undefined : tenantId)');
    expect(notificationContext).toContain('if (isLocalDemoMode)');
    expect(notificationContext).toContain('await repository.markNotificationsRead(tenantId)');
    expect(notificationContext).not.toContain('StorageService.getNotifications(tenantId);\n    setNotifications([...items]);');
  });

  it('has recipient-specific RLS and server-side mark-read support in the additive migration', () => {
    expect(notificationMigration).toContain('recipient_user_id = auth.uid()');
    expect(notificationMigration).toContain('CREATE OR REPLACE FUNCTION public.mark_notifications_read');
    expect(notificationMigration).toContain('GRANT EXECUTE ON FUNCTION public.mark_notifications_read(UUID) TO authenticated');
  });
});

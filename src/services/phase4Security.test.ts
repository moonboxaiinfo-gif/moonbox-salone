import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20261113000002_phase4_business_transactions.sql'), 'utf8');

describe('Phase 4 trusted business transaction contract', () => {
  it('defines server-side permission checks and atomic inventory movement', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.has_salon_permission');
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.record_stock_movement_atomic');
    expect(migration).toContain('FOR UPDATE');
    expect(migration).toContain("IF v_balance < 0 THEN RAISE EXCEPTION 'Insufficient stock.'");
  });

  it('requires Super Admin AAL2 for payment review', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.review_manual_payment');
    expect(migration).toContain("COALESCE((auth.jwt() ->> 'aal'), 'aal1') <> 'aal2'");
    expect(migration).toContain('reviewed_by = auth.jwt() ->> \'email\'');
  });

  it('creates recipient-specific notification storage and read state', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.notifications');
    expect(migration).toContain('recipient_user_id UUID');
    expect(migration).toContain('read_at TIMESTAMPTZ');
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.mark_notifications_read');
  });

  it('keeps privileged RPCs unavailable to public callers', () => {
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.record_stock_movement_atomic');
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.review_manual_payment');
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.append_support_ticket_message');
  });
});

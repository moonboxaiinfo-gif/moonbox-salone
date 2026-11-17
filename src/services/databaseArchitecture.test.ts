import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const migrationsDirectory = path.resolve(root, 'supabase/migrations');
const read = (file: string) => readFileSync(path.join(migrationsDirectory, file), 'utf8');

describe('Supabase database architecture source contracts', () => {
  const completionMigration = read('20261117190000_database_architecture_completion.sql');

  it('keeps the complete local migration set ordered and records its latest additive correction', () => {
    const migrations = readdirSync(migrationsDirectory)
      .filter((file) => file.endsWith('.sql'))
      .sort();
    expect(migrations).toHaveLength(15);
    expect(migrations[migrations.length - 2]).toBe('20261117180000_phase1_security_corrections.sql');
    expect(migrations[migrations.length - 1]).toBe('20261117190000_database_architecture_completion.sql');
    expect(read('20261013000000_initial_schema.sql')).toContain('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
    expect(completionMigration).toContain('trial_ends_at');
    expect(completionMigration).toContain('staff.auth_user_id');
  });

  it('keeps the completion migration in one transaction with COMMIT as the final statement', () => {
    const transactionMarkers = completionMigration.match(/^\s*(BEGIN|COMMIT)\s*;\s*$/gim) ?? [];
    expect(transactionMarkers.map((marker) => marker.trim().toUpperCase())).toEqual(['BEGIN;', 'COMMIT;']);
    expect(completionMigration.trimEnd()).toMatch(/COMMIT;\s*$/i);
  });

  it('derives support-ticket identity in the database and removes direct client insert access', () => {
    expect(completionMigration).toContain('DROP POLICY IF EXISTS "Salon members create their own support ticket"');
    expect(completionMigration).toContain('REVOKE INSERT ON public.support_tickets FROM anon, authenticated');
    expect(completionMigration).toContain('public.create_salon_support_ticket');
    expect(completionMigration).toContain("'senderRole', 'tenant'");
    expect(completionMigration).toContain("coalesce(nullif(v_profile.email, ''), auth.jwt() ->> 'email', '')");
    expect(completionMigration).toContain('GRANT EXECUTE ON FUNCTION public.create_salon_support_ticket');
  });

  it('enforces explicit staff assignments and active plan limits on activation or salon reassignment', () => {
    expect(completionMigration).toContain('CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_salon_auth_user');
    expect(completionMigration).toContain('m.role = \'staff\'');
    expect(completionMigration).toContain('BEFORE INSERT OR UPDATE OF status, salon_id ON public.staff');
    expect(completionMigration).toContain('BEFORE INSERT OR UPDATE OF status, salon_id ON public.customers');
    expect(completionMigration).toContain('pg_advisory_xact_lock(hashtextextended(v_lock_key, 0))');
  });

  it('uses the server-authorized commission settlement operation', () => {
    expect(completionMigration).toContain('CREATE OR REPLACE FUNCTION public.mark_commission_paid');
    expect(completionMigration).toContain("public.has_salon_permission(p_salon_id, 'manage_commissions')");
    expect(completionMigration).toContain("SET status = 'paid', paid_at = now()");
  });
});

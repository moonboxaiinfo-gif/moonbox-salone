import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const asyncSource = readFileSync(resolve(process.cwd(), 'src/services/asyncDataService.ts'), 'utf8');
const repositorySource = readFileSync(resolve(process.cwd(), 'src/services/supabaseRepository.ts'), 'utf8');
const storageSource = readFileSync(resolve(process.cwd(), 'src/services/storageService.ts'), 'utf8');

describe('Phase 10 async data architecture guardrails', () => {
  it('exposes a reusable tenant resource lifecycle with loading, error, retry and cancellation', () => {
    expect(asyncSource).toContain('export function useTenantResource');
    expect(asyncSource).toContain('loading:');
    expect(asyncSource).toContain('error:');
    expect(asyncSource).toContain('const retry = useCallback');
    expect(asyncSource).toContain('new AbortController()');
    expect(asyncSource).toContain('controller.abort()');
  });

  it('protects cached business data with an auth-session boundary and tenant key', () => {
    expect(asyncSource).toContain('supabase.auth.onAuthStateChange');
    expect(asyncSource).toContain('tenantCache.clear()');
    expect(asyncSource).toContain('`${tenantId}:${resource}`');
    expect(asyncSource).toContain('cached?.sessionVersion === requestSessionVersion');
    expect(asyncSource).toContain('requestSessionVersion !== sessionVersion');
  });

  it('provides one repository-owned parallel tenant snapshot boundary', () => {
    expect(repositorySource).toContain('async tenantDataSnapshot(tenantId: string)');
    expect(repositorySource).toContain('Promise.all([');
    expect(repositorySource).toContain('this.assertTenantAccess');
  });

  it('keeps local fixture access explicitly behind local demo mode', () => {
    expect(asyncSource).toContain('if (isLocalDemoMode) return StorageService.loadTenantData(tenantId);');
    expect(storageSource).toContain('export const isLocalDemoMode');
    expect(storageSource).toContain('A configured Supabase repository is required for production business operations.');
  });
});

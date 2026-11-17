import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const flow = readFileSync(resolve(process.cwd(), 'src/components/public/PublicBookingFlow.tsx'), 'utf8');
const page = readFileSync(resolve(process.cwd(), 'src/components/public/PublicBookingPage.tsx'), 'utf8');
const storage = readFileSync(resolve(process.cwd(), 'src/services/storageService.ts'), 'utf8');
const auth = readFileSync(resolve(process.cwd(), 'src/context/AuthContext.tsx'), 'utf8');
const asyncData = readFileSync(resolve(process.cwd(), 'src/services/asyncDataService.ts'), 'utf8');
const dashboard = readFileSync(resolve(process.cwd(), 'src/components/dashboard/DashboardOverview.tsx'), 'utf8');
const reports = readFileSync(resolve(process.cwd(), 'src/components/reports/ReportsDashboard.tsx'), 'utf8');

describe('Phase 7 async architecture guardrails', () => {
  it('keeps public local booking writes behind explicit demo mode', () => {
    expect(flow).toContain('if (!custId && isLocalDemoMode)');
    expect(flow).toContain('} else if (isLocalDemoMode)');
    expect(page).toContain('} else if (!isLocalDemoMode)');
    expect(page).toContain('PublicWebsiteApi.submitBooking');
  });

  it('invalidates production business cache on session transitions', () => {
    expect(storage).toContain('static clearProductionCache');
    expect(auth).toContain('StorageService.clearProductionCache();');
  });

  it('does not reintroduce the removed fire-and-forget persistence queue', () => {
    expect(storage).not.toContain('queueProductionWrite');
    expect(storage).not.toContain('void task().catch');
  });

  it('provides cancellation-aware loading/error/retry state for migrated reads', () => {
    expect(asyncData).toContain('useTenantData');
    expect(asyncData).toContain('let active = true');
    expect(asyncData).toContain('retry');
    expect(dashboard).toContain('useTenantData');
    expect(reports).toContain('useTenantData');
  });
});

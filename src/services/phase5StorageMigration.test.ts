import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const storageSource = readFileSync(resolve(process.cwd(), 'src/services/storageService.ts'), 'utf8');
const posSource = readFileSync(resolve(process.cwd(), 'src/components/pos/POSRegister.tsx'), 'utf8');
const appointmentSource = readFileSync(resolve(process.cwd(), 'src/components/appointments/AppointmentModal.tsx'), 'utf8');

describe('Phase 5 StorageService migration guardrails', () => {
  it('has no fire-and-forget production queue architecture', () => {
    expect(storageSource).not.toContain('queueProductionWrite');
    expect(storageSource).not.toContain('void task().catch');
    expect(storageSource).toContain('requireProductionRepository');
  });

  it('exposes confirmed core business writes', () => {
    for (const method of [
      'saveCustomerConfirmed', 'saveServiceConfirmed', 'saveStaffConfirmed',
      'saveAppointmentConfirmed', 'saveProductConfirmed',
      'recordStockMovementConfirmed', 'createInvoiceConfirmed',
      'updateAppointmentStatusConfirmed',
    ]) expect(storageSource).toContain(`static async ${method}`);
  });

  it('uses confirmed writes for POS and appointment creation', () => {
    expect(posSource).toContain('createInvoiceConfirmed');
    expect(posSource).toContain('saveCustomerConfirmed');
    expect(appointmentSource).toContain('saveAppointmentConfirmed');
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { StorageService } from './storageService';
import { Invoice } from '../types';

describe('StorageService Multi-Tenant & Business Logic Suite', () => {
  const tenant1 = 'tenant_moonbox_flagship';
  const tenant2 = 'tenant_aura_beauty';

  it('guarantees tenant data isolation between different salons', () => {
    const cust1 = StorageService.getCustomers(tenant1);
    const cust2 = StorageService.getCustomers(tenant2);

    expect(cust1.length).toBeGreaterThan(0);
    // Every customer in cust1 must strictly belong to tenant1
    expect(cust1.every(c => c.tenantId === tenant1)).toBe(true);

    // Every customer in cust2 must strictly belong to tenant2
    expect(cust2.every(c => c.tenantId === tenant2)).toBe(true);

    // Customer IDs must not cross over
    const cust1Ids = new Set(cust1.map(c => c.id));
    const overlap = cust2.some(c => cust1Ids.has(c.id));
    expect(overlap).toBe(false);
  });

  it('correctly detects appointment time conflicts and prevents double-booking', () => {
    const staffList = StorageService.getStaff(tenant1);
    const staffId = staffList[0].id;
    const testDate = '2026-10-25';

    // Save initial appointment: 10:00 to 11:00
    const apt1 = {
      id: `test_apt_${Date.now()}`,
      tenantId: tenant1,
      customerId: 'cust_01',
      customerName: 'Test Client',
      customerPhone: '0771234567',
      staffId: staffId,
      staffName: staffList[0].name,
      serviceIds: ['srv_01'],
      serviceNames: ['Signature Cut'],
      date: testDate,
      startTime: '10:00',
      endTime: '11:00',
      durationMinutes: 60,
      totalPriceLKR: 5500,
      status: 'confirmed' as const,
      paymentStatus: 'unpaid' as const,
      bookingSource: 'online_portal' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    StorageService.saveAppointment(apt1);

    // Conflicting interval: 10:30 to 11:30 (overlaps)
    const conflictCheck1 = StorageService.checkDoubleBooking(tenant1, staffId, testDate, '10:30', '11:30');
    expect(conflictCheck1.isConflict).toBe(true);

    // Non-conflicting interval: 11:30 to 12:30 (clean slot)
    const cleanCheck = StorageService.checkDoubleBooking(tenant1, staffId, testDate, '11:30', '12:30');
    expect(cleanCheck.isConflict).toBe(false);
  });

  it('enforces appointment lifecycle rules and records check-in/check-out timestamps', () => {
    const staff = StorageService.getStaff(tenant1)[0];
    const id = `lifecycle_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const appointment = {
      id,
      tenantId: tenant1,
      customerId: 'cust_01',
      customerName: 'Lifecycle Client',
      customerPhone: '0770000000',
      staffId: staff.id,
      staffName: staff.name,
      serviceIds: ['srv_01'],
      serviceNames: ['Signature Cut'],
      date: '2030-01-01',
      startTime: '08:00',
      endTime: '09:00',
      durationMinutes: 60,
      totalPriceLKR: 5500,
      status: 'confirmed' as const,
      paymentStatus: 'unpaid' as const,
      bookingSource: 'in_salon' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    expect(StorageService.saveAppointment(appointment).success).toBe(true);
    expect(StorageService.checkInAppointment(tenant1, id).success).toBe(true);
    expect(StorageService.getAppointments(tenant1).find(a => a.id === id)?.checkInAt).toBeDefined();
    expect(StorageService.checkOutAppointment(tenant1, id).success).toBe(false);
    expect(StorageService.updateAppointmentStatus(tenant1, id, 'in_progress').success).toBe(true);
    expect(StorageService.checkOutAppointment(tenant1, id).success).toBe(true);
    const completed = StorageService.getAppointments(tenant1).find(a => a.id === id);
    expect(completed?.status).toBe('completed');
    expect(completed?.checkOutAt).toBeDefined();
    expect(StorageService.updateAppointmentStatus(tenant1, id, 'confirmed').success).toBe(false);
  });

  it('deducts inventory accurately when stock movements are recorded', () => {
    const products = StorageService.getProducts(tenant1);
    const product = products[0];
    const initialStock = product.stockQuantity;

    const result = StorageService.recordStockMovement(
      tenant1,
      product.id,
      product.name,
      'sale',
      -2,
      'POS Retail Sale checkout'
    );

    expect(result.success).toBe(true);
    const updated = StorageService.getProducts(tenant1).find(p => p.id === product.id);
    expect(updated?.stockQuantity).toBe(initialStock - 2);
  });

  it('does not persist a duplicate POS invoice when checkout is submitted twice', () => {
    const invoiceId = `test_invoice_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const invoice: Invoice = {
      id: invoiceId,
      invoiceNumber: invoiceId,
      tenantId: tenant1,
      customerId: 'cust_walkin',
      customerName: 'Walk-in Client',
      items: [],
      subtotalLKR: 0,
      discountLKR: 0,
      taxLKR: 0,
      tipLKR: 0,
      totalLKR: 0,
      paidAmountLKR: 0,
      balanceLKR: 0,
      paymentMethod: 'cash',
      status: 'paid',
      createdBy: 'Test',
      createdAt: new Date().toISOString()
    };

    expect(StorageService.createInvoice(invoice).success).toBe(true);
    expect(StorageService.createInvoice(invoice)).toEqual({ success: false, error: 'This sale has already been recorded.' });
    expect(StorageService.getInvoices(tenant1).filter(saved => saved.id === invoiceId)).toHaveLength(1);
  });

  it('creates audit logs and tracks actions with actor metadata', () => {
    StorageService.logAudit({
      tenantId: tenant1,
      actorEmail: 'owner@moonboxdigital.com',
      actorRole: 'owner',
      action: 'TEST_AUDIT_ACTION',
      entity: 'settings',
      entityId: 'test_123',
      details: 'Automated test suite audit verification'
    });

    const logs = StorageService.getAuditLogs(tenant1);
    const found = logs.find(l => l.action === 'TEST_AUDIT_ACTION');
    expect(found).toBeDefined();
    expect(found?.actorEmail).toBe('owner@moonboxdigital.com');
  });
});

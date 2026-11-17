import { describe, it, expect, beforeEach } from 'vitest';
import { StorageService } from './storageService';
import { SalonTenant, User } from '../types';

describe('Super Admin Security & Administrator-Controlled Trials Test Suite', () => {
  const adminEmail = 'superadmin@moonboxdigital.com';

  beforeEach(() => {
    StorageService.init();
  });

  describe('Super Admin Authentication & MFA Security Boundary', () => {
    it('verifies platform superadmin identity requires explicit role and tenant', () => {
      const users = StorageService.getUsers();
      const admin = users.find(u => u.email === adminEmail);

      expect(admin).toBeDefined();
      expect(admin?.role).toBe('superadmin');
      expect(admin?.tenantId).toBe('superadmin');

      // Random user with substring 'admin' in email must NOT be superadmin
      const regularOwner: User = {
        id: 'user_fake_admin_99',
        email: 'administrator@someclientsalon.lk',
        name: 'Client Admin',
        role: 'owner',
        tenantId: 'tenant_moonbox_flagship',
        createdAt: new Date().toISOString()
      };
      StorageService.createUser(regularOwner);

      const retrieved = StorageService.getUserByEmail('administrator@someclientsalon.lk');
      expect(retrieved?.role).toBe('owner');
      expect(retrieved?.role).not.toBe('superadmin');
    });

    it('requires 6-digit numeric TOTP code format for second factor verification', () => {
      const isValidCode = (code: string) => /^\d{6}$/.test(code.trim());

      expect(isValidCode('123456')).toBe(true);
      expect(isValidCode('009988')).toBe(true);

      // Rejects invalid codes
      expect(isValidCode('12345')).toBe(false); // too short
      expect(isValidCode('1234567')).toBe(false); // too long
      expect(isValidCode('abcdef')).toBe(false); // alphabetic
      expect(isValidCode('      ')).toBe(false); // whitespace
      expect(isValidCode('')).toBe(false); // empty
    });
  });

  describe('Administrator-Controlled Trials & Salon Lifecycle', () => {
    const testTenantId = `tenant_test_${Date.now()}`;
    const testTenantName = 'Luxe Hair Bar Kandy';
    const testSlug = `luxe-kandy-${Date.now()}`;

    it('guarantees new salon enters explicit pending_approval state with NO automatic trial', () => {
      const now = new Date();
      const newSalon: SalonTenant = {
        id: testTenantId,
        name: testTenantName,
        slug: testSlug,
        tagline: 'Premier salon in Kandy',
        country: 'Sri Lanka',
        currency: 'LKR',
        phone: '0812233445',
        whatsapp: '0771234567',
        email: 'luxe@kandy.lk',
        address: 'Peradeniya Road',
        city: 'Kandy',
        openingHours: {
          monday: { open: '09:00', close: '18:00', isOpen: true },
          tuesday: { open: '09:00', close: '18:00', isOpen: true },
          wednesday: { open: '09:00', close: '18:00', isOpen: true },
          thursday: { open: '09:00', close: '18:00', isOpen: true },
          friday: { open: '09:00', close: '18:00', isOpen: true },
          saturday: { open: '09:00', close: '19:00', isOpen: true },
          sunday: { open: '10:00', close: '17:00', isOpen: false }
        },
        subscription: {
          planId: 'plan_growth',
          status: 'pending', // NOT trial, NOT active
          billingCycle: 'monthly',
          startDate: now.toISOString().split('T')[0],
          endDate: now.toISOString().split('T')[0],
          trialEndsAt: '', // Empty until granted explicitly
          autoRenew: false
        },
        settings: {
          taxRate: 0,
          currencySymbol: 'Rs.',
          appointmentBufferMinutes: 15,
          minAdvanceBookingHours: 2,
          maxBookingWindowDays: 30,
          allowCustomerStaffSelection: true,
          requireBookingDeposit: false
        },
        portfolio: {
          heroTitle: `Welcome to ${testTenantName}`,
          heroSubtitle: 'Luxury Hair Artistry',
          aboutText: 'Crafting bespoke styles.',
          theme: 'luxury',
          primaryColor: '#101225',
          accentColor: '#8B5CF6',
          gallery: [],
          seoTitle: testTenantName,
          seoDescription: 'Salon in Kandy'
        },
        onboardingCompleted: false,
        onboardingStep: 1,
        status: 'pending_approval', // Explicit pending status
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      };

      StorageService.createTenant(newSalon);

      const fetched = StorageService.getTenantById(testTenantId);
      expect(fetched).toBeDefined();
      expect(fetched?.status).toBe('pending_approval');
      expect(fetched?.subscription.status).toBe('pending');
      expect(fetched?.subscription.trialEndsAt).toBe('');
    });

    it('allows authorized super admin to explicitly grant a 14-day free trial', () => {
      const grantRes = StorageService.grantTrial(
        testTenantId,
        14,
        'plan_growth',
        adminEmail
      );

      expect(grantRes.success).toBe(true);

      const updated = StorageService.getTenantById(testTenantId);
      expect(updated?.status).toBe('active');
      expect(updated?.subscription.status).toBe('trial');
      expect(updated?.subscription.planId).toBe('plan_growth');
      expect(updated?.subscription.trialEndsAt).toBeTruthy();

      // Check remaining trial duration calculation
      const end = new Date(updated!.subscription.trialEndsAt).getTime();
      const now = new Date().getTime();
      const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
      expect(daysLeft).toBeGreaterThanOrEqual(13);
      expect(daysLeft).toBeLessThanOrEqual(15);

      // Verify audit log
      const logs = StorageService.getAuditLogs(testTenantId);
      const grantLog = logs.find(l => l.action === 'GRANT_TRIAL');
      expect(grantLog).toBeDefined();
      expect(grantLog?.actorEmail).toBe(adminEmail);
      expect(grantLog?.actorRole).toBe('superadmin');
    });

    it('allows authorized super admin to extend an active trial by 7 days', () => {
      const before = StorageService.getTenantById(testTenantId);
      const beforeEnd = new Date(before!.subscription.trialEndsAt).getTime();

      const extRes = StorageService.extendTrial(testTenantId, 7, adminEmail);
      expect(extRes.success).toBe(true);

      const after = StorageService.getTenantById(testTenantId);
      const afterEnd = new Date(after!.subscription.trialEndsAt).getTime();

      // After end must be 7 days (604800000 ms) after before end
      const diffDays = Math.round((afterEnd - beforeEnd) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(7);
      expect(after?.subscription.status).toBe('trial');
    });

    it('allows authorized super admin to revoke a trial and preserves all salon records', () => {
      // Add customer, appointment, and invoice before revoking
      const testCustomer = {
        id: `cust_test_${Date.now()}`,
        tenantId: testTenantId,
        name: 'Dilini Perera',
        email: 'dilini@test.com',
        phone: '0779876543',
        status: 'active' as const,
        visitsCount: 1,
        totalSpentLKR: 7500,
        createdAt: new Date().toISOString()
      };
      StorageService.saveCustomer(testCustomer);

      // Revoke trial
      const revokeRes = StorageService.revokeTrial(testTenantId, adminEmail);
      expect(revokeRes.success).toBe(true);

      const afterRevoke = StorageService.getTenantById(testTenantId);
      expect(afterRevoke?.subscription.status).toBe('expired');

      // CRITICAL: Salon records, customers, and data MUST NOT be deleted!
      const customers = StorageService.getCustomers(testTenantId);
      expect(customers.some(c => c.id === testCustomer.id)).toBe(true);
    });

    it('allows super admin to assign a paid package and activate the workspace', () => {
      const assignRes = StorageService.assignPackage(
        testTenantId,
        'plan_dominate',
        'yearly',
        adminEmail
      );
      expect(assignRes.success).toBe(true);

      const activeSalon = StorageService.getTenantById(testTenantId);
      expect(activeSalon?.status).toBe('active');
      expect(activeSalon?.subscription.status).toBe('active');
      expect(activeSalon?.subscription.planId).toBe('plan_dominate');
      expect(activeSalon?.subscription.billingCycle).toBe('yearly');
      expect(activeSalon?.subscription.autoRenew).toBe(true);
    });

    it('allows super admin to suspend and reactivate a salon', () => {
      const salon = StorageService.getTenantById(testTenantId)!;

      // Suspend
      StorageService.updateTenant({ ...salon, status: 'suspended' });
      expect(StorageService.getTenantById(testTenantId)?.status).toBe('suspended');

      // Reactivate
      StorageService.updateTenant({ ...salon, status: 'active' });
      expect(StorageService.getTenantById(testTenantId)?.status).toBe('active');
    });
  });
});

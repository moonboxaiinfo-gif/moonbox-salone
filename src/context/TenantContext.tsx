import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { SalonTenant, SubscriptionPlan } from '../types';
import { StorageService, isLocalDemoMode } from '../services/storageService';
import { createSupabaseRepository } from '../services/supabaseRepository';
import { clearAsyncDataCache } from '../services/asyncDataService';
import { useAuth } from './AuthContext';

interface TenantContextType {
  tenant: SalonTenant | null;
  plan: SubscriptionPlan | null;
  loading: boolean;
  error: string | null;
  trialDaysLeft: number;
  isTrial: boolean;
  isPendingApproval: boolean;
  isTrialExpired: boolean;
  isSubscriptionActive: boolean;
  refreshTenant: () => Promise<void>;
  retry: () => void;
  updateTenantData: (updater: (prev: SalonTenant) => SalonTenant) => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [tenant, setTenant] = useState<SalonTenant | null>(null);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const requestGeneration = useRef(0);

  const refreshTenant = useCallback(async () => {
    const user = currentUser;
    if (!user || user.role === 'superadmin') {
      setTenant(null);
      setPlan(null);
      setLoading(false);
      setError(null);
      clearAsyncDataCache();
      return;
    }

    const generation = ++requestGeneration.current;
    setTenant(null);
    setPlan(null);
    setLoading(true);
    setError(null);
    try {
      let nextTenant: SalonTenant | null;
      let nextPlan: SubscriptionPlan | undefined;
      if (isLocalDemoMode) {
        nextTenant = StorageService.getTenantById(user.tenantId) || null;
        nextPlan = StorageService.getPlans().find(item => item.id === nextTenant?.subscription.planId) || StorageService.getPlans()[0];
      } else {
        const repository = createSupabaseRepository();
        if (!repository) throw new Error('Supabase is not configured. Tenant data cannot be loaded.');
        nextTenant = await repository.tenantById(user.tenantId);
        const plans = await repository.plans();
        nextPlan = plans.find(item => item.id === nextTenant?.subscription.planId) || plans[0];
      }
      if (!nextTenant) throw new Error('The authenticated user is not an active member of a salon workspace.');
      // React ignores this result when currentUser changes; the effect cleanup
      // invalidates the request generation through the captured user identity.
      if (requestGeneration.current !== generation || currentUser?.id !== user.id || currentUser?.tenantId !== user.tenantId) return;
      setTenant(nextTenant);
      setPlan(nextPlan || null);
    } catch (cause) {
      if (requestGeneration.current === generation && currentUser?.id === user.id && currentUser?.tenantId === user.tenantId) {
        setTenant(null);
        setPlan(null);
        setError(cause instanceof Error ? cause.message : 'Could not load salon workspace.');
      }
    } finally {
      if (requestGeneration.current === generation && currentUser?.id === user.id && currentUser?.tenantId === user.tenantId) setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    requestGeneration.current += 1;
    if (!currentUser || currentUser.role === 'superadmin') {
      setTenant(null);
      setPlan(null);
      setLoading(false);
      setError(null);
      clearAsyncDataCache();
      return () => { requestGeneration.current += 1; };
    }
    setLoading(true);
    refreshTenant().catch(() => undefined);
    return () => { requestGeneration.current += 1; };
  }, [currentUser, attempt, refreshTenant]);

  const updateTenantData = useCallback(async (updater: (prev: SalonTenant) => SalonTenant) => {
    if (!tenant) throw new Error('Salon workspace is not loaded.');
    const updated = updater(tenant);
    if (isLocalDemoMode) {
      StorageService.updateTenant(updated);
      setTenant(updated);
      return;
    }
    const repository = createSupabaseRepository();
    if (!repository) throw new Error('Supabase is not configured. Tenant updates are unavailable.');
    const saved = await repository.updateTenant(updated);
    setTenant(saved);
    const plans = await repository.plans();
    setPlan(plans.find(item => item.id === saved.subscription.planId) || plans[0] || null);
    clearAsyncDataCache();
  }, [tenant]);

  let trialDaysLeft = 0;
  const isTrial = tenant?.subscription?.status === 'trial';
  if (isTrial && tenant?.subscription?.trialEndsAt) {
    const end = new Date(tenant.subscription.trialEndsAt).getTime();
    trialDaysLeft = Math.max(0, Math.ceil((end - new Date().getTime()) / (1000 * 60 * 60 * 24)));
  }
  const isPendingApproval = Boolean(tenant?.status === 'pending_approval' || tenant?.subscription?.status === 'pending');
  const isTrialExpired = Boolean(tenant?.subscription?.status === 'expired' || (isTrial && trialDaysLeft <= 0));
  const isSubscriptionActive = Boolean(tenant?.status === 'active' && (tenant?.subscription?.status === 'active' || (isTrial && trialDaysLeft > 0)));

  return (
    <TenantContext.Provider value={{ tenant, plan, loading, error, trialDaysLeft, isTrial, isPendingApproval, isTrialExpired, isSubscriptionActive, refreshTenant, retry: () => setAttempt(value => value + 1), updateTenantData }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) throw new Error('useTenant must be used within a TenantProvider');
  return context;
};

import { SalonTenant, SubscriptionPlan } from '../types';
import { StorageService } from './storageService';
import { DEFAULT_PLANS } from '../constants/plans';

// Extend SubscriptionPlan if needed, or just handle features dynamically
export type FeatureKey =
  | 'inventory'
  | 'commissions'
  | 'custom_domain'
  | 'reports'
  | 'online_booking'
  | 'portfolio';

export interface EntitlementCheckResult {
  allowed: boolean;
  reason?: string;
  requiredPlanName?: string;
}

export class EntitlementService {
  /**
   * Resolve current active subscription plan for a salon tenant.
   */
  static getTenantPlan(tenant: SalonTenant | null): SubscriptionPlan {
    const plans = StorageService.getPlans() || DEFAULT_PLANS;
    // Use planId to find the current plan configuration
    const plan = plans.find(p => p.id === tenant?.subscription?.planId) || plans[0];
    return plan;
  }

  /**
   * Check access to a specific package-gated feature.
   */
  static canAccessFeature(tenant: SalonTenant | null, feature: FeatureKey): EntitlementCheckResult {
    const plan = this.getTenantPlan(tenant);
    
    // Dynamic feature lookup based on the plan object
    // Assuming plan object has boolean flags for these features
    const hasFeature = (plan as any)[`has${feature.charAt(0).toUpperCase() + feature.slice(1).replace(/_([a-z])/g, g => g[1].toUpperCase())}`];

    if (!hasFeature) {
      return {
        allowed: false,
        reason: `The ${feature.replace('_', ' ')} feature is not included in the ${plan.name} plan.`,
        requiredPlanName: 'Higher Tier Plan'
      };
    }
    return { allowed: true };
  }
}

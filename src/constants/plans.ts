import { SubscriptionPlan } from '../types';

export const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: "plan_starter",
    name: "Moonbox Salon Starter",
    slug: "starter",
    description: "Ideal for boutique salons, independent stylists, and growing studios.",
    monthlyPriceLKR: 9500,
    yearlyPriceLKR: 95000, // 2 months free equivalent
    maxStaff: 3,
    maxCustomers: 500,
    hasInventory: false,
    hasOnlineBooking: true,
    hasPortfolio: true,
    hasCustomDomain: false,
    hasReports: true,
    hasCommissions: false,
    isActive: true
  },
  {
    id: "plan_growth",
    name: "Moonbox Salon Growth",
    slug: "growth",
    description: "Full-featured operational engine for established salons and beauty spas.",
    monthlyPriceLKR: 18500,
    yearlyPriceLKR: 185000,
    maxStaff: 10,
    maxCustomers: 3000,
    hasInventory: true,
    hasOnlineBooking: true,
    hasPortfolio: false,
    hasCustomDomain: true,
    hasReports: true,
    hasCommissions: true,
    isPopular: true,
    isActive: true
  },
  {
    id: "plan_premium",
    name: "Moonbox Salon Dominate",
    slug: "dominate",
    description: "Unlimited scale for luxury salons, multi-chair parlours, and franchise chains.",
    monthlyPriceLKR: 32000,
    yearlyPriceLKR: 320000,
    maxStaff: 50,
    maxCustomers: 25000,
    hasInventory: true,
    hasOnlineBooking: true,
    hasPortfolio: true,
    hasCustomDomain: true,
    hasReports: true,
    hasCommissions: true,
    isActive: true
  }
];

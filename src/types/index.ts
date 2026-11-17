/**
 * Moonbox Salon Multi-Tenant SaaS - Type Definitions
 */

export type UserRole = 'owner' | 'manager' | 'receptionist' | 'staff' | 'superadmin' | 'platform_support';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string; // 'superadmin' for platform admins
  avatar?: string;
  phone?: string;
  createdAt: string;
}

export type SubscriptionStatus = 'pending' | 'trial' | 'active' | 'past_due' | 'expired' | 'suspended' | 'cancelled' | 'inactive';
export type BillingCycle = 'monthly' | 'yearly';

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  monthlyPriceLKR: number;
  yearlyPriceLKR: number;
  maxStaff: number;
  maxCustomers: number;
  hasInventory: boolean;
  hasOnlineBooking: boolean;
  hasPortfolio: boolean;
  hasCustomDomain: boolean;
  hasReports: boolean;
  hasCommissions: boolean;
  isPopular?: boolean;
  isActive: boolean;
}

export interface SalonTenant {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  logoUrl?: string;
  country: string;
  currency: string; // 'LKR'
  phone: string;
  whatsapp: string;
  email: string;
  website?: string;
  address: string;
  city: string;
  openingHours: {
    [day: string]: { open: string; close: string; isOpen: boolean };
  };
  subscription: {
    planId: string;
    status: SubscriptionStatus;
    billingCycle: BillingCycle;
    startDate: string;
    endDate: string;
    trialEndsAt: string;
    autoRenew: boolean;
  };
  settings: {
    taxRate: number; // e.g. 0% or 2.5%
    currencySymbol: string;
    appointmentBufferMinutes: number;
    minAdvanceBookingHours: number;
    maxBookingWindowDays: number;
    allowCustomerStaffSelection: boolean;
    requireBookingDeposit: boolean;
    onlineBooking?: {
      enabled: boolean;
      pageTitle: string;
      pageSubtitle: string;
      successMessage: string;
      showPrices: boolean;
      showStaffSelection: boolean;
      allowWhatsApp: boolean;
      accentColor: string;
      backgroundColor: string;
    };
  };
  portfolio: {
    heroTitle: string;
    heroSubtitle: string;
    aboutText: string;
    theme: 'luxury' | 'modern' | 'minimal' | 'elegant' | 'beauty';
    primaryColor: string;
    accentColor: string;
    gallery: PortfolioImage[];
    customDomain?: {
      domain: string;
      verified: boolean;
      sslActive: boolean;
      token: string;
    };
    seoTitle: string;
    seoDescription: string;
  };
  onboardingCompleted: boolean;
  onboardingStep: number;
  status: 'pending_approval' | 'active' | 'suspended' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioImage {
  id: string;
  url: string;
  caption: string;
  category: string;
  isPublic: boolean;
}

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  gender?: 'female' | 'male' | 'other';
  birthday?: string;
  address?: string;
  notes?: string;
  status: 'active' | 'archived';
  totalSpentLKR: number;
  visitsCount: number;
  lastVisitAt?: string;
  createdAt: string;
}

export interface ServiceCategory {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
}

export interface Service {
  id: string;
  tenantId: string;
  categoryId: string;
  name: string;
  description?: string;
  priceLKR: number;
  durationMinutes: number;
  assignedStaffIds: string[];
  commissionRate: number; // percentage e.g. 15 = 15%
  isOnlineBookingEnabled: boolean;
  isActive: boolean;
}

export interface StaffWorkingHours {
  start: string; // e.g. "09:00"
  end: string;   // e.g. "18:00"
  isWorking: boolean;
  breakStart?: string; // e.g. "13:00"
  breakEnd?: string;   // e.g. "14:00"
}

export interface Staff {
  id: string;
  tenantId: string;
  name: string;
  position: string;
  title?: string;
  phone: string;
  email: string;
  status: 'active' | 'inactive' | 'on_leave';
  assignedServiceIds: string[];
  defaultServiceCommission: number; // %
  defaultProductCommission: number; // %
  workingHours: {
    [day: string]: StaffWorkingHours;
  };
  color: string; // for calendar display
  createdAt: string;
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'refunded';

export interface Appointment {
  id: string;
  tenantId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  staffId: string;
  staffName: string;
  serviceIds: string[];
  serviceNames: string[];
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMinutes: number;
  totalPriceLKR: number;
  status: AppointmentStatus;
  paymentStatus: PaymentStatus;
  bookingSource: 'in_salon' | 'online_portal' | 'phone' | 'whatsapp';
  notes?: string;
  internalNotes?: string;
  checkInAt?: string;
  checkOutAt?: string;
  invoiceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCategory {
  id: string;
  tenantId: string;
  name: string;
}

export interface Product {
  id: string;
  tenantId: string;
  categoryId: string;
  name: string;
  sku: string;
  sellingPriceLKR: number;
  costPriceLKR: number;
  stockQuantity: number;
  lowStockThreshold: number;
  supplier?: string;
  expiryDate?: string;
  status: 'active' | 'archived';
  createdAt: string;
}

export type StockMovementType = 'purchase' | 'sale' | 'adjustment' | 'damaged' | 'return';

export interface StockMovement {
  id: string;
  tenantId: string;
  productId: string;
  productName: string;
  type: StockMovementType;
  quantityChange: number; // + or -
  balanceAfter: number;
  reason: string;
  referenceId?: string; // invoiceId or purchaseId
  createdAt: string;
}

export interface CartItem {
  id: string;
  type: 'service' | 'product';
  itemId: string;
  name: string;
  unitPriceLKR: number;
  quantity: number;
  staffId?: string;
  staffName?: string;
  discountPercentage?: number;
}

export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'digital_qr' | 'other';

export interface InvoiceItem {
  type: 'service' | 'product';
  itemId: string;
  name: string;
  quantity: number;
  unitPriceLKR: number;
  discountLKR: number;
  totalLKR: number;
  staffId?: string;
  staffName?: string;
  commissionLKR?: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // e.g. "INV-2026-001"
  tenantId: string;
  appointmentId?: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  items: InvoiceItem[];
  /** Request-only input; the POS RPC derives and persists the discount amount. */
  discountPercent?: number;
  subtotalLKR: number;
  discountLKR: number;
  taxLKR: number;
  tipLKR: number;
  totalLKR: number;
  paidAmountLKR: number;
  cashReceivedLKR?: number;
  balanceLKR: number;
  paymentMethod: PaymentMethod;
  status: 'paid' | 'partially_paid' | 'refunded' | 'void';
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface ExpenseCategory {
  id: string;
  tenantId: string;
  name: string;
}

export interface Expense {
  id: string;
  tenantId: string;
  categoryId: string;
  categoryName: string;
  description: string;
  amountLKR: number;
  paymentMethod: PaymentMethod;
  date: string;
  notes?: string;
  receiptUrl?: string;
  receiptFileName?: string;
  createdAt: string;
}

export interface StaffCommissionRecord {
  id: string;
  tenantId: string;
  staffId: string;
  staffName: string;
  invoiceId: string;
  invoiceNumber: string;
  itemType: 'service' | 'product';
  itemName: string;
  itemAmountLKR: number;
  commissionPercentage: number;
  commissionAmountLKR: number;
  status: 'unpaid' | 'paid';
  paidAt?: string;
  createdAt: string;
}

export interface ManualPaymentRequest {
  id: string;
  tenantId: string;
  salonName: string;
  ownerEmail: string;
  planId: string;
  planName: string;
  billingCycle: BillingCycle;
  amountLKR: number;
  bankReference: string;
  paymentDate: string;
  receiptUrl?: string;
  receiptFileName?: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  tenantId: string;
  salonName: string;
  userEmail: string;
  subject: string;
  category: 'general' | 'billing' | 'technical' | 'feature_request';
  priority: 'normal' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_for_customer' | 'resolved' | 'closed';
  module?: string;
  diagnosticRef?: string;
  assignedTo?: string;
  messages: {
    id: string;
    senderEmail: string;
    senderRole: 'tenant' | 'support';
    senderName: string;
    content: string;
    createdAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'success' | 'warning' | 'critical';
  targetAudience: 'all' | 'trial' | 'active' | 'growth_premium';
  isActive: boolean;
  publishedAt: string;
}

export interface NotificationItem {
  id: string;
  tenantId: string; // 'superadmin' or salonId
  title: string;
  message: string;
  type: 'appointment' | 'inventory' | 'payment' | 'subscription' | 'support' | 'announcement';
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  tenantId?: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  entity: string;
  entityId?: string;
  details: string;
  ipAddress?: string;
  createdAt: string;
}

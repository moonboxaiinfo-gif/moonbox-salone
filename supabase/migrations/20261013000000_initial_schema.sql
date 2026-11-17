-- ==============================================================================
-- MOONBOX SALON SAAS — PRODUCTION POSTGRESQL SCHEMA WITH ROW LEVEL SECURITY (RLS)
-- Multi-Tenant Database Architecture for Sri Lankan Salon Operations
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. SUBSCRIPTION PLANS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  monthly_price_lkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
  yearly_price_lkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
  max_staff INTEGER NOT NULL DEFAULT 3,
  max_customers INTEGER NOT NULL DEFAULT 500,
  has_inventory BOOLEAN NOT NULL DEFAULT FALSE,
  has_online_booking BOOLEAN NOT NULL DEFAULT TRUE,
  has_portfolio BOOLEAN NOT NULL DEFAULT TRUE,
  has_custom_domain BOOLEAN NOT NULL DEFAULT FALSE,
  has_reports BOOLEAN NOT NULL DEFAULT TRUE,
  has_commissions BOOLEAN NOT NULL DEFAULT FALSE,
  is_popular BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 2. SALONS (TENANTS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.salons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  tagline TEXT DEFAULT 'Building a smarter salon.',
  logo_url TEXT,
  country TEXT NOT NULL DEFAULT 'Sri Lanka',
  currency TEXT NOT NULL DEFAULT 'LKR',
  phone TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT NOT NULL,
  website TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Colombo',
  opening_hours JSONB NOT NULL DEFAULT '{}'::jsonb,
  settings JSONB NOT NULL DEFAULT '{"taxRate": 0, "currencySymbol": "Rs.", "appointmentBufferMinutes": 15, "minAdvanceBookingHours": 2, "maxBookingWindowDays": 60, "allowCustomerStaffSelection": true, "requireBookingDeposit": false}'::jsonb,
  portfolio JSONB NOT NULL DEFAULT '{"heroTitle": "Welcome to Moonbox Salon", "heroSubtitle": "Luxury Hair & Aesthetics", "aboutText": "", "theme": "luxury", "gallery": [], "seoTitle": "", "seoDescription": ""}'::jsonb,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  onboarding_step INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_salons_slug ON public.salons (slug);
CREATE INDEX IF NOT EXISTS idx_salons_status ON public.salons (status);

-- ==============================================================================
-- 3. PROFILES & SALON MEMBERSHIPS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'superadmin' CHECK (role IN ('superadmin', 'support')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.salon_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'receptionist', 'staff')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, salon_id)
);

CREATE INDEX IF NOT EXISTS idx_salon_members_user ON public.salon_members (user_id);
CREATE INDEX IF NOT EXISTS idx_salon_members_salon ON public.salon_members (salon_id);

-- ==============================================================================
-- 4. SALON SUBSCRIPTIONS & MANUAL BANK PAYMENTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.salon_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'past_due', 'expired', 'suspended', 'cancelled')),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  trial_ends_at DATE,
  auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(salon_id)
);

CREATE TABLE IF NOT EXISTS public.manual_payment_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  salon_name TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  plan_id TEXT NOT NULL REFERENCES public.subscription_plans(id),
  plan_name TEXT NOT NULL,
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  amount_lkr NUMERIC(12, 2) NOT NULL,
  bank_reference TEXT NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  receipt_file_name TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manual_payments_salon ON public.manual_payment_requests (salon_id);
CREATE INDEX IF NOT EXISTS idx_manual_payments_status ON public.manual_payment_requests (status);

-- ==============================================================================
-- 5. SERVICES & CATEGORIES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.service_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.service_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price_lkr NUMERIC(10, 2) NOT NULL DEFAULT 0,
  duration_minutes INTEGER NOT NULL DEFAULT 45,
  commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 15,
  is_online_booking_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_salon ON public.services (salon_id);

-- ==============================================================================
-- 6. STAFF & WORKING HOURS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position TEXT NOT NULL DEFAULT 'Stylist',
  phone TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
  default_service_commission NUMERIC(5, 2) NOT NULL DEFAULT 20,
  default_product_commission NUMERIC(5, 2) NOT NULL DEFAULT 10,
  working_hours JSONB NOT NULL DEFAULT '{}'::jsonb,
  color TEXT NOT NULL DEFAULT '#9E4784',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_salon ON public.staff (salon_id);

-- ==============================================================================
-- 7. CUSTOMERS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp TEXT,
  email TEXT,
  gender TEXT,
  birthday DATE,
  address TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  total_spent_lkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
  visits_count INTEGER NOT NULL DEFAULT 0,
  last_visit_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_salon ON public.customers (salon_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers (salon_id, phone);

-- ==============================================================================
-- 8. APPOINTMENTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  staff_name TEXT NOT NULL,
  service_names TEXT[] NOT NULL DEFAULT '{}'::text[],
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 45,
  total_price_lkr NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partially_paid', 'paid', 'refunded')),
  booking_source TEXT NOT NULL DEFAULT 'in_salon' CHECK (booking_source IN ('in_salon', 'online_portal', 'phone', 'whatsapp')),
  notes TEXT,
  invoice_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_salon_date ON public.appointments (salon_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_staff_date ON public.appointments (salon_id, staff_id, date);

-- ==============================================================================
-- 9. PRODUCTS & INVENTORY
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  sku TEXT NOT NULL,
  selling_price_lkr NUMERIC(10, 2) NOT NULL DEFAULT 0,
  cost_price_lkr NUMERIC(10, 2) NOT NULL DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  supplier TEXT,
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(salon_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_products_salon ON public.products (salon_id);

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'sale', 'adjustment', 'damaged', 'return')),
  quantity_change INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reference_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_salon ON public.stock_movements (salon_id);

-- ==============================================================================
-- 10. INVOICES, SALES & COMMISSIONS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal_lkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount_lkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_lkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tip_lkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_lkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
  paid_amount_lkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
  balance_lkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'digital_qr', 'other')),
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'partially_paid', 'refunded', 'void')),
  notes TEXT,
  created_by TEXT NOT NULL DEFAULT 'Reception',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(salon_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_invoices_salon ON public.invoices (salon_id);

CREATE TABLE IF NOT EXISTS public.commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  staff_name TEXT NOT NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('service', 'product')),
  item_name TEXT NOT NULL,
  item_amount_lkr NUMERIC(10, 2) NOT NULL DEFAULT 0,
  commission_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0,
  commission_amount_lkr NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commissions_salon ON public.commissions (salon_id);
CREATE INDEX IF NOT EXISTS idx_commissions_staff ON public.commissions (salon_id, staff_id);

-- ==============================================================================
-- 11. EXPENSES & CATEGORIES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  category_name TEXT NOT NULL,
  description TEXT NOT NULL,
  amount_lkr NUMERIC(12, 2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  receipt_url TEXT,
  receipt_file_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_salon ON public.expenses (salon_id);

-- ==============================================================================
-- 12. SUPPORT TICKETS & ANNOUNCEMENTS & AUDIT LOGS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE,
  salon_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('general', 'billing', 'technical', 'feature_request')),
  priority TEXT NOT NULL CHECK (priority IN ('normal', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  assigned_to TEXT,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'critical')),
  target_audience TEXT NOT NULL DEFAULT 'all',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID REFERENCES public.salons(id) ON DELETE SET NULL,
  actor_email TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  details TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_salon ON public.audit_logs (salon_id);

-- ==============================================================================
-- 13. SECURITY FUNCTIONS & ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Helper function: Check if current user is platform super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE user_id = auth.uid()
  );
$$;

-- Helper function: Check if current user is member of a salon
CREATE OR REPLACE FUNCTION public.is_salon_member(lookup_salon_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.salon_members
    WHERE salon_id = lookup_salon_id 
      AND user_id = auth.uid() 
      AND status = 'active'
  ) OR public.is_super_admin();
$$;

-- Helper function: Check if user is salon owner or manager
CREATE OR REPLACE FUNCTION public.is_salon_manager_or_owner(lookup_salon_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.salon_members
    WHERE salon_id = lookup_salon_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'manager')
      AND status = 'active'
  ) OR public.is_super_admin();
$$;

-- Enable RLS on all tables
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- POLICIES: Subscription Plans
CREATE POLICY "Subscription plans are publicly viewable" 
  ON public.subscription_plans FOR SELECT USING (true);
CREATE POLICY "Only super admins can modify subscription plans" 
  ON public.subscription_plans FOR ALL USING (public.is_super_admin());

-- POLICIES: Salons
CREATE POLICY "Public can view active salons" 
  ON public.salons FOR SELECT USING (status = 'active');
CREATE POLICY "Members can view their own salon" 
  ON public.salons FOR SELECT USING (public.is_salon_member(id));
CREATE POLICY "Salon owners can update their salon" 
  ON public.salons FOR UPDATE USING (public.is_salon_manager_or_owner(id));
CREATE POLICY "Authenticated users can create salon" 
  ON public.salons FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- POLICIES: Profiles
CREATE POLICY "Users can read own profile" 
  ON public.profiles FOR SELECT USING (id = auth.uid() OR public.is_super_admin());
CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE USING (id = auth.uid());

-- POLICIES: Salon Members
CREATE POLICY "Salon members can view colleagues in same salon" 
  ON public.salon_members FOR SELECT USING (public.is_salon_member(salon_id));
CREATE POLICY "Salon owners can manage members" 
  ON public.salon_members FOR ALL USING (public.is_salon_manager_or_owner(salon_id));

-- POLICIES: Services & Categories
CREATE POLICY "Public can view active salon services" 
  ON public.services FOR SELECT USING (is_active = TRUE AND is_online_booking_enabled = TRUE);
CREATE POLICY "Salon members can view all salon services" 
  ON public.services FOR SELECT USING (public.is_salon_member(salon_id));
CREATE POLICY "Salon managers/owners can manage services" 
  ON public.services FOR ALL USING (public.is_salon_manager_or_owner(salon_id));

CREATE POLICY "Public can view service categories" 
  ON public.service_categories FOR SELECT USING (true);
CREATE POLICY "Salon managers can manage service categories" 
  ON public.service_categories FOR ALL USING (public.is_salon_manager_or_owner(salon_id));

-- POLICIES: Staff
CREATE POLICY "Public can view staff for booking" 
  ON public.staff FOR SELECT USING (status = 'active');
CREATE POLICY "Salon members can view all staff" 
  ON public.staff FOR SELECT USING (public.is_salon_member(salon_id));
CREATE POLICY "Salon managers can manage staff" 
  ON public.staff FOR ALL USING (public.is_salon_manager_or_owner(salon_id));

-- POLICIES: Customers
CREATE POLICY "Salon members can view their salon customers" 
  ON public.customers FOR SELECT USING (public.is_salon_member(salon_id));
CREATE POLICY "Salon members can manage customers" 
  ON public.customers FOR ALL USING (public.is_salon_member(salon_id));
CREATE POLICY "Allow public booking to register/find customer" 
  ON public.customers FOR INSERT WITH CHECK (true);

-- POLICIES: Appointments
CREATE POLICY "Salon members can view appointments" 
  ON public.appointments FOR SELECT USING (public.is_salon_member(salon_id));
CREATE POLICY "Public can create online booking appointment" 
  ON public.appointments FOR INSERT WITH CHECK (booking_source = 'online_portal');
CREATE POLICY "Salon members can manage appointments" 
  ON public.appointments FOR ALL USING (public.is_salon_member(salon_id));

-- POLICIES: Products, Stock & Invoices
CREATE POLICY "Salon members can view products" 
  ON public.products FOR SELECT USING (public.is_salon_member(salon_id));
CREATE POLICY "Salon members can manage products" 
  ON public.products FOR ALL USING (public.is_salon_manager_or_owner(salon_id));

CREATE POLICY "Salon members can view stock movements" 
  ON public.stock_movements FOR SELECT USING (public.is_salon_member(salon_id));
CREATE POLICY "Salon members can insert stock movements" 
  ON public.stock_movements FOR INSERT WITH CHECK (public.is_salon_member(salon_id));

CREATE POLICY "Salon members can view invoices" 
  ON public.invoices FOR SELECT USING (public.is_salon_member(salon_id));
CREATE POLICY "Salon members can manage invoices" 
  ON public.invoices FOR ALL USING (public.is_salon_member(salon_id));

-- POLICIES: Commissions & Expenses
CREATE POLICY "Salon members can view commissions" 
  ON public.commissions FOR SELECT USING (public.is_salon_member(salon_id));
CREATE POLICY "Salon managers can manage commissions" 
  ON public.commissions FOR ALL USING (public.is_salon_manager_or_owner(salon_id));

CREATE POLICY "Salon members can view expenses" 
  ON public.expenses FOR SELECT USING (public.is_salon_member(salon_id));
CREATE POLICY "Salon managers can manage expenses" 
  ON public.expenses FOR ALL USING (public.is_salon_manager_or_owner(salon_id));

-- POLICIES: Manual Payments & Subscriptions
CREATE POLICY "Salon owners can view their payment requests" 
  ON public.manual_payment_requests FOR SELECT USING (public.is_salon_member(salon_id));
CREATE POLICY "Salon owners can submit payment requests" 
  ON public.manual_payment_requests FOR INSERT WITH CHECK (public.is_salon_member(salon_id));
CREATE POLICY "Super admins can manage payment requests" 
  ON public.manual_payment_requests FOR ALL USING (public.is_super_admin());

CREATE POLICY "Salon members can view their subscription" 
  ON public.salon_subscriptions FOR SELECT USING (public.is_salon_member(salon_id));
CREATE POLICY "Super admins can manage salon subscriptions" 
  ON public.salon_subscriptions FOR ALL USING (public.is_super_admin());

-- POLICIES: Audit Logs & Announcements
CREATE POLICY "Announcements are readable by authenticated users" 
  ON public.announcements FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Super admins can manage announcements" 
  ON public.announcements FOR ALL USING (public.is_super_admin());

CREATE POLICY "Salon owners can view own audit logs" 
  ON public.audit_logs FOR SELECT USING (public.is_salon_member(salon_id));
CREATE POLICY "Super admins can view all audit logs" 
  ON public.audit_logs FOR ALL USING (public.is_super_admin());
CREATE POLICY "System can insert audit logs" 
  ON public.audit_logs FOR INSERT WITH CHECK (true);

-- Moonbox Salon Phase 17 — additive production-boundary hardening.
-- Source only: review and apply to a disposable Supabase staging project first.
BEGIN;

-- Platform-admin authority is valid only for an explicitly enrolled superadmin
-- whose current signed JWT has Supabase MFA assurance level AAL2.
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_admins pa
    WHERE pa.user_id = auth.uid()
      AND pa.role = 'superadmin'
      AND coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
  );
$$;
REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- The admin portal must be able to verify only the signed-in user's own row.
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'platform_admins' LOOP
    EXECUTE format('DROP POLICY %I ON public.platform_admins', p.policyname);
  END LOOP;
END $$;
GRANT SELECT ON public.platform_admins TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.platform_admins FROM anon, authenticated;
CREATE POLICY "Platform admins can read only their own authorization row"
  ON public.platform_admins FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- A single server-side helper is the database authority for plan entitlements.
CREATE OR REPLACE FUNCTION public.salon_has_active_feature(p_salon_id UUID, p_feature TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.salon_subscriptions ss
    JOIN public.subscription_plans sp ON sp.id = ss.plan_id
    WHERE ss.salon_id = p_salon_id
      AND ss.status IN ('trial', 'active')
      AND ss.end_date >= CURRENT_DATE
      AND sp.is_active = TRUE
      AND CASE p_feature
        WHEN 'inventory' THEN sp.has_inventory
        WHEN 'online_booking' THEN sp.has_online_booking
        WHEN 'portfolio' THEN sp.has_portfolio
        WHEN 'custom_domain' THEN sp.has_custom_domain
        WHEN 'reports' THEN sp.has_reports
        WHEN 'commissions' THEN sp.has_commissions
        ELSE FALSE
      END
  );
$$;
REVOKE ALL ON FUNCTION public.salon_has_active_feature(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.salon_has_active_feature(UUID, TEXT) TO authenticated, service_role;

CREATE POLICY "Salon members can view service categories"
  ON public.service_categories FOR SELECT TO authenticated
  USING (public.is_salon_member(salon_id));

-- Direct public SELECT exposed full tenant rows (including profile/contact and
-- staff fields); public pages now read through the whitelisted Netlify API.
DROP POLICY IF EXISTS "Public can view active salons" ON public.salons;
DROP POLICY IF EXISTS "Authenticated users can create salon" ON public.salons;
REVOKE INSERT ON public.salons FROM anon, authenticated;
DROP POLICY IF EXISTS "Public can view active salon services" ON public.services;
DROP POLICY IF EXISTS "Public can view service categories" ON public.service_categories;
DROP POLICY IF EXISTS "Public can view staff for booking" ON public.staff;
DROP POLICY IF EXISTS "Allow public booking to register/find customer" ON public.customers;
DROP POLICY IF EXISTS "Public can create online booking appointment" ON public.appointments;
REVOKE INSERT ON public.customers FROM anon;
REVOKE INSERT ON public.appointments FROM anon;

-- Anonymous visitors cannot query full draft JSON or customer phone numbers.
DROP POLICY IF EXISTS "Public can view published website config" ON public.website_configs;
DROP POLICY IF EXISTS "Public can view approved website reviews" ON public.website_reviews;
DROP POLICY IF EXISTS "Public can submit pending website review" ON public.website_reviews;
REVOKE INSERT ON public.website_reviews FROM anon, authenticated;

-- Managers may store drafts, but only the server's service-role publishing path
-- may change a published snapshot or its publication state.
DROP POLICY IF EXISTS "Salon managers can manage website config" ON public.website_configs;
CREATE POLICY "Salon managers may create entitled website drafts"
  ON public.website_configs FOR INSERT TO authenticated
  WITH CHECK (
    public.is_salon_manager_or_owner(salon_id)
    AND public.salon_has_active_feature(salon_id, 'portfolio')
    AND status = 'draft'
    AND published_config IS NULL
  );
CREATE POLICY "Salon managers may update entitled website drafts"
  ON public.website_configs FOR UPDATE TO authenticated
  USING (public.is_salon_manager_or_owner(salon_id) AND public.salon_has_active_feature(salon_id, 'portfolio'))
  WITH CHECK (public.is_salon_manager_or_owner(salon_id) AND public.salon_has_active_feature(salon_id, 'portfolio'));
CREATE POLICY "Salon managers may delete website drafts"
  ON public.website_configs FOR DELETE TO authenticated
  USING (public.is_salon_manager_or_owner(salon_id) AND public.salon_has_active_feature(salon_id, 'portfolio'));

CREATE OR REPLACE FUNCTION public.prevent_direct_website_publication()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    IF TG_OP = 'INSERT' AND (NEW.status <> 'draft' OR NEW.published_config IS NOT NULL OR NEW.published_at IS NOT NULL) THEN
      RAISE EXCEPTION 'Published website snapshots can only be written by the authorized server.';
    END IF;
    IF TG_OP = 'UPDATE' AND (
      NEW.status IS DISTINCT FROM OLD.status
      OR NEW.published_config IS DISTINCT FROM OLD.published_config
      OR NEW.published_at IS DISTINCT FROM OLD.published_at
    ) THEN
      RAISE EXCEPTION 'Published website snapshots can only be changed by the authorized server.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS website_publication_server_only ON public.website_configs;
CREATE TRIGGER website_publication_server_only
  BEFORE INSERT OR UPDATE ON public.website_configs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_direct_website_publication();

-- A phone-derived throttle reduces automated online-booking and confirmation
-- abuse while retaining idempotent retries for a legitimate booking.
CREATE OR REPLACE FUNCTION public.normalize_salon_phone(p_phone TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $$
  WITH digits AS (SELECT regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g') AS value)
  SELECT CASE
    WHEN left(value, 4) = '0094' AND length(value) >= 13 THEN '0' || substr(value, 5)
    WHEN left(value, 2) = '94' AND length(value) >= 11 THEN '0' || substr(value, 3)
    ELSE value
  END FROM digits;
$$;

CREATE INDEX IF NOT EXISTS idx_online_appointment_rate
  ON public.appointments (salon_id, created_at)
  WHERE booking_source = 'online_portal';

CREATE OR REPLACE FUNCTION public.enforce_online_booking_boundaries()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_salon public.salons%ROWTYPE;
  v_staff public.staff%ROWTYPE;
  v_timezone TEXT;
  v_min_hours NUMERIC;
  v_max_days INTEGER;
  v_now_local TIMESTAMP;
  v_requested_local TIMESTAMP;
  v_weekday TEXT;
  v_hours JSONB;
  v_open TIME;
  v_close TIME;
  v_break_start TIME;
  v_break_end TIME;
  v_phone TEXT;
  v_recent_count INTEGER;
BEGIN
  IF NEW.booking_source <> 'online_portal' THEN RETURN NEW; END IF;

  SELECT * INTO v_salon FROM public.salons WHERE id = NEW.salon_id AND status = 'active';
  IF NOT FOUND OR NOT public.salon_has_active_feature(NEW.salon_id, 'online_booking') THEN
    RAISE EXCEPTION 'Online booking is not available for this salon.';
  END IF;

  v_timezone := coalesce(nullif(v_salon.settings ->> 'timezone', ''), 'Asia/Colombo');
  IF NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = v_timezone) THEN v_timezone := 'Asia/Colombo'; END IF;
  v_min_hours := CASE
    WHEN coalesce(v_salon.settings ->> 'minAdvanceBookingHours', '') ~ '^\d{1,3}(\.\d+)?$'
      THEN (v_salon.settings ->> 'minAdvanceBookingHours')::NUMERIC
    ELSE 2
  END;
  v_min_hours := greatest(0, least(v_min_hours, 720));
  v_max_days := CASE
    WHEN coalesce(v_salon.settings ->> 'maxBookingWindowDays', '') ~ '^\d{1,3}$'
      THEN (v_salon.settings ->> 'maxBookingWindowDays')::INTEGER
    ELSE 60
  END;
  v_max_days := greatest(1, least(v_max_days, 365));
  v_now_local := now() AT TIME ZONE v_timezone;
  v_requested_local := NEW.date + NEW.start_time;
  IF v_requested_local < v_now_local + make_interval(mins => (v_min_hours * 60)::INTEGER)
     OR NEW.date > v_now_local::DATE + v_max_days THEN
    RAISE EXCEPTION 'The requested appointment is outside the salon booking window.';
  END IF;

  v_weekday := lower(trim(to_char(NEW.date, 'FMDay')));
  SELECT * INTO v_staff FROM public.staff
  WHERE id = NEW.staff_id AND salon_id = NEW.salon_id AND status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'Selected stylist is not active in this salon.'; END IF;
  v_hours := v_staff.working_hours -> v_weekday;
  IF v_hours IS NULL OR jsonb_typeof(v_hours) <> 'object' THEN v_hours := v_salon.opening_hours -> v_weekday; END IF;
  IF v_hours IS NOT NULL AND jsonb_typeof(v_hours) = 'object' THEN
    IF coalesce(nullif(v_hours ->> 'isWorking', '')::BOOLEAN,
                nullif(v_hours ->> 'isOpen', '')::BOOLEAN, TRUE) = FALSE THEN
      RAISE EXCEPTION 'The salon or stylist is not working on the requested date.';
    END IF;
    IF coalesce(v_hours ->> 'start', v_hours ->> 'open', '') ~ '^\d{2}:\d{2}(:\d{2})?$' THEN
      v_open := (coalesce(v_hours ->> 'start', v_hours ->> 'open'))::TIME;
    END IF;
    IF coalesce(v_hours ->> 'end', v_hours ->> 'close', '') ~ '^\d{2}:\d{2}(:\d{2})?$' THEN
      v_close := (coalesce(v_hours ->> 'end', v_hours ->> 'close'))::TIME;
    END IF;
    IF coalesce(v_hours ->> 'breakStart', '') ~ '^\d{2}:\d{2}(:\d{2})?$' THEN v_break_start := (v_hours ->> 'breakStart')::TIME; END IF;
    IF coalesce(v_hours ->> 'breakEnd', '') ~ '^\d{2}:\d{2}(:\d{2})?$' THEN v_break_end := (v_hours ->> 'breakEnd')::TIME; END IF;
    IF (v_open IS NOT NULL AND NEW.start_time < v_open)
      OR (v_close IS NOT NULL AND NEW.end_time > v_close)
      OR (v_break_start IS NOT NULL AND v_break_end IS NOT NULL AND NEW.start_time < v_break_end AND NEW.end_time > v_break_start) THEN
      RAISE EXCEPTION 'The requested appointment is outside working hours or overlaps a break.';
    END IF;
  END IF;

  -- Recheck under the same salon/staff/date lock for both explicit and automatic staff picks.
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.salon_id::TEXT || ':' || NEW.staff_id::TEXT || ':' || NEW.date::TEXT, 0));
  IF EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.salon_id = NEW.salon_id AND a.staff_id = NEW.staff_id AND a.date = NEW.date
      AND a.id IS DISTINCT FROM NEW.id
      AND a.status NOT IN ('cancelled', 'no_show')
      AND NEW.start_time < a.end_time AND NEW.end_time > a.start_time
  ) THEN
    RAISE EXCEPTION 'The selected stylist is no longer available for this time slot.';
  END IF;

  v_phone := public.normalize_salon_phone(NEW.customer_phone);
  IF length(v_phone) < 7 THEN RAISE EXCEPTION 'A valid customer phone number is required.'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.salon_id::TEXT || ':booking-phone:' || v_phone, 0));
  SELECT count(*) INTO v_recent_count FROM public.appointments a
  WHERE a.salon_id = NEW.salon_id
    AND a.booking_source = 'online_portal'
    AND public.normalize_salon_phone(a.customer_phone) = v_phone
    AND a.created_at >= now() - INTERVAL '24 hours';
  IF v_recent_count >= 5 THEN RAISE EXCEPTION 'Too many booking requests for this phone number. Try again later.'; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS online_booking_boundaries ON public.appointments;
CREATE TRIGGER online_booking_boundaries
  BEFORE INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_online_booking_boundaries();

-- Inventory plans cannot be bypassed by direct product or stock-row writes.
DROP POLICY IF EXISTS "Salon members can manage products" ON public.products;
CREATE POLICY "Salon managers can manage entitled inventory"
  ON public.products FOR ALL TO authenticated
  USING (public.is_salon_manager_or_owner(salon_id) AND public.salon_has_active_feature(salon_id, 'inventory'))
  WITH CHECK (public.is_salon_manager_or_owner(salon_id) AND public.salon_has_active_feature(salon_id, 'inventory'));
DROP POLICY IF EXISTS "Salon managers can manage product categories" ON public.product_categories;
CREATE POLICY "Salon managers can manage entitled product categories"
  ON public.product_categories FOR ALL TO authenticated
  USING (public.is_salon_manager_or_owner(salon_id) AND public.salon_has_active_feature(salon_id, 'inventory'))
  WITH CHECK (public.is_salon_manager_or_owner(salon_id) AND public.salon_has_active_feature(salon_id, 'inventory'));
CREATE POLICY "Salon members can view product categories"
  ON public.product_categories FOR SELECT TO authenticated
  USING (public.is_salon_member(salon_id));
DROP POLICY IF EXISTS "Salon members can insert stock movements" ON public.stock_movements;
REVOKE INSERT ON public.stock_movements FROM anon, authenticated;

-- A client cannot set or overwrite stock_quantity through product CRUD. Stock
-- changes must use the atomic stock-movement/POS RPCs.
REVOKE INSERT, UPDATE ON public.products FROM authenticated;
GRANT INSERT (id, salon_id, category_id, name, sku, selling_price_lkr, cost_price_lkr, low_stock_threshold, supplier, expiry_date, status)
  ON public.products TO authenticated;
GRANT UPDATE (id, category_id, name, sku, selling_price_lkr, cost_price_lkr, low_stock_threshold, supplier, expiry_date, status)
  ON public.products TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_salon_plan_row_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_limit INTEGER;
  v_count INTEGER;
  v_feature TEXT;
BEGIN
  IF TG_OP <> 'INSERT' THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME = 'staff' THEN
    IF EXISTS (SELECT 1 FROM public.staff WHERE id = NEW.id) THEN RETURN NEW; END IF;
    v_feature := 'staff';
    SELECT sp.max_staff INTO v_limit FROM public.salon_subscriptions ss
    JOIN public.subscription_plans sp ON sp.id = ss.plan_id
    WHERE ss.salon_id = NEW.salon_id AND ss.status IN ('trial', 'active')
      AND ss.end_date >= CURRENT_DATE AND sp.is_active = TRUE;
    SELECT count(*) INTO v_count FROM public.staff WHERE salon_id = NEW.salon_id AND status = 'active';
  ELSIF TG_TABLE_NAME = 'customers' THEN
    IF EXISTS (SELECT 1 FROM public.customers WHERE id = NEW.id) THEN RETURN NEW; END IF;
    v_feature := 'customers';
    SELECT sp.max_customers INTO v_limit FROM public.salon_subscriptions ss
    JOIN public.subscription_plans sp ON sp.id = ss.plan_id
    WHERE ss.salon_id = NEW.salon_id AND ss.status IN ('trial', 'active')
      AND ss.end_date >= CURRENT_DATE AND sp.is_active = TRUE;
    SELECT count(*) INTO v_count FROM public.customers WHERE salon_id = NEW.salon_id AND status = 'active';
  ELSE
    RETURN NEW;
  END IF;
  IF v_limit IS NULL THEN RAISE EXCEPTION 'An active subscription is required to add %.', v_feature; END IF;
  IF v_count >= v_limit THEN RAISE EXCEPTION 'The salon plan limit for % has been reached.', v_feature; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS enforce_salon_staff_limit ON public.staff;
CREATE TRIGGER enforce_salon_staff_limit BEFORE INSERT ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.enforce_salon_plan_row_limits();
DROP TRIGGER IF EXISTS enforce_salon_customer_limit ON public.customers;
CREATE TRIGGER enforce_salon_customer_limit BEFORE INSERT ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.enforce_salon_plan_row_limits();

CREATE OR REPLACE FUNCTION public.prevent_unentitled_stock_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.stock_quantity IS DISTINCT FROM OLD.stock_quantity
     AND NOT public.salon_has_active_feature(NEW.salon_id, 'inventory') THEN
    RAISE EXCEPTION 'An active inventory entitlement is required to change product stock.';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS prevent_unentitled_stock_change ON public.products;
CREATE TRIGGER prevent_unentitled_stock_change BEFORE UPDATE OF stock_quantity ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.prevent_unentitled_stock_change();

-- Notifications can be created only for an active member of the same salon.
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' LOOP
    EXECUTE format('DROP POLICY %I ON public.notifications', p.policyname);
  END LOOP;
END $$;
CREATE POLICY "Users can read their own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (recipient_user_id = auth.uid() OR public.is_super_admin());
CREATE POLICY "Salon managers notify members of their own salon"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (
    salon_id IS NOT NULL
    AND public.is_salon_manager_or_owner(salon_id)
    AND EXISTS (
      SELECT 1 FROM public.salon_members recipient
      WHERE recipient.salon_id = notifications.salon_id
        AND recipient.user_id = notifications.recipient_user_id
        AND recipient.status = 'active'
        AND (notifications.recipient_role IS NULL OR notifications.recipient_role = recipient.role)
    )
    AND char_length(title) BETWEEN 1 AND 200
    AND char_length(message) BETWEEN 1 AND 2000
  );
CREATE POLICY "Users may mark only their own notification read"
  ON public.notifications FOR UPDATE TO authenticated
  USING (recipient_user_id = auth.uid())
  WITH CHECK (recipient_user_id = auth.uid());
REVOKE UPDATE ON public.notifications FROM authenticated;
GRANT UPDATE (read_at) ON public.notifications TO authenticated;

-- Support records are salon-private. New tickets must use the authenticated
-- user's email; only salon managers and AAL2 platform admins can change them.
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'support_tickets' LOOP
    EXECUTE format('DROP POLICY %I ON public.support_tickets', p.policyname);
  END LOOP;
END $$;
CREATE POLICY "Salon members and admins read support tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (public.is_salon_member(salon_id) OR (salon_id IS NULL AND public.is_super_admin()));
CREATE POLICY "Salon members create their own support ticket"
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (
    salon_id IS NOT NULL
    AND public.is_salon_member(salon_id)
    AND lower(user_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    AND status = 'open'
    AND assigned_to IS NULL
    AND jsonb_typeof(messages) = 'array'
    AND jsonb_array_length(messages) <= 50
  );
CREATE POLICY "Salon managers and AAL2 admins update support tickets"
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (public.is_salon_manager_or_owner(salon_id) OR (salon_id IS NULL AND public.is_super_admin()))
  WITH CHECK (public.is_salon_manager_or_owner(salon_id) OR (salon_id IS NULL AND public.is_super_admin()));

-- Audit events are append-only for tenant users and cannot be forged for a
-- different salon or represented as a platform administrator.
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'audit_logs' LOOP
    EXECUTE format('DROP POLICY %I ON public.audit_logs', p.policyname);
  END LOOP;
END $$;
CREATE POLICY "Members read their salon audit events"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_salon_member(salon_id));
CREATE POLICY "AAL2 admins read platform audit events"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_super_admin());
CREATE POLICY "Users append their own audit events"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (
    lower(actor_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    AND (
      (salon_id IS NULL AND actor_role = 'superadmin' AND public.is_super_admin())
      OR (salon_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.salon_members m
        WHERE m.salon_id = audit_logs.salon_id AND m.user_id = auth.uid()
          AND m.status = 'active' AND m.role = audit_logs.actor_role
      ))
    )
  );
REVOKE UPDATE, DELETE ON public.audit_logs FROM anon, authenticated;

-- Announcements are not anonymously readable, and active salon membership is
-- required for authenticated clients to read non-platform messages.
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'announcements' LOOP
    EXECUTE format('DROP POLICY %I ON public.announcements', p.policyname);
  END LOOP;
END $$;
CREATE POLICY "Active announcements are visible to authenticated members"
  ON public.announcements FOR SELECT TO authenticated
  USING (is_active = TRUE AND (public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.salon_members m WHERE m.user_id = auth.uid() AND m.status = 'active'
  )));
CREATE POLICY "AAL2 admins manage announcements"
  ON public.announcements FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Durable one-time email dispatch records prevent an appointment ID from being
-- replayed to send unlimited messages. Only the service role may access them.
CREATE TABLE IF NOT EXISTS public.transactional_email_dispatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  template TEXT NOT NULL CHECK (template = 'booking-confirmation'),
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  UNIQUE (appointment_id, template)
);
ALTER TABLE public.transactional_email_dispatches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.transactional_email_dispatches FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.transactional_email_dispatches TO service_role;

-- Durable per-IP review throttle: keep only an HMAC-derived identifier, never
-- the raw client IP. Netlify must set RATE_LIMIT_HMAC_SECRET.
CREATE TABLE IF NOT EXISTS public.website_review_rate_limits (
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  requester_hash TEXT NOT NULL CHECK (requester_hash ~ '^[0-9a-f]{64}$'),
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (salon_id, requester_hash)
);
ALTER TABLE public.website_review_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.website_review_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.website_review_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.consume_public_review_rate_limit(
  p_salon_id UUID,
  p_requester_hash TEXT,
  p_max_requests INTEGER DEFAULT 5,
  p_window_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE v_count INTEGER;
BEGIN
  IF p_salon_id IS NULL OR coalesce(p_requester_hash, '') !~ '^[0-9a-f]{64}$'
     OR p_max_requests NOT BETWEEN 1 AND 20 OR p_window_minutes NOT BETWEEN 1 AND 1440 THEN
    RAISE EXCEPTION 'Invalid review rate-limit request.';
  END IF;
  DELETE FROM public.website_review_rate_limits
  WHERE updated_at < now() - INTERVAL '2 days';
  INSERT INTO public.website_review_rate_limits (salon_id, requester_hash, window_started_at, request_count, updated_at)
  VALUES (p_salon_id, p_requester_hash, now(), 1, now())
  ON CONFLICT (salon_id, requester_hash) DO UPDATE SET
    window_started_at = CASE
      WHEN website_review_rate_limits.window_started_at < now() - make_interval(mins => p_window_minutes) THEN now()
      ELSE website_review_rate_limits.window_started_at
    END,
    request_count = CASE
      WHEN website_review_rate_limits.window_started_at < now() - make_interval(mins => p_window_minutes) THEN 1
      ELSE website_review_rate_limits.request_count + 1
    END,
    updated_at = now()
  RETURNING request_count INTO v_count;
  RETURN v_count <= p_max_requests;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_public_review_rate_limit(UUID, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_public_review_rate_limit(UUID, TEXT, INTEGER, INTEGER) TO service_role;

COMMENT ON FUNCTION public.is_super_admin() IS 'True only for an explicitly authorized platform superadmin with a current AAL2 Supabase JWT.';
COMMENT ON FUNCTION public.salon_has_active_feature(UUID, TEXT) IS 'Server-side subscription status, expiry and feature entitlement check for tenant database operations.';
COMMENT ON FUNCTION public.enforce_online_booking_boundaries() IS 'Enforces active plan, booking window, salon/staff hours, overlap serialization and per-phone public booking rate limits.';

-- Private bank-slip storage: object paths are tenant-prefixed, uploads are
-- owner-only, immutable from browser clients, and never anonymously readable.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('payment-receipts', 'payment-receipts', FALSE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = FALSE,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
DROP POLICY IF EXISTS "Salon owners upload private payment receipts" ON storage.objects;
CREATE POLICY "Salon owners upload private payment receipts"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'payment-receipts'
    AND array_length(storage.foldername(name), 1) = 1
    AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    AND public.is_salon_owner(((storage.foldername(name))[1])::UUID)
    AND storage.filename(name) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp|pdf)$'
  );
DROP POLICY IF EXISTS "Salons and AAL2 admins read private payment receipts" ON storage.objects;
CREATE POLICY "Salons and AAL2 admins read private payment receipts"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-receipts'
    AND array_length(storage.foldername(name), 1) = 1
    AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    AND (
      public.is_salon_owner(((storage.foldername(name))[1])::UUID)
      OR public.is_super_admin()
    )
  );

-- Client-side bank requests cannot forge a different amount, plan name, salon
-- identity, reviewer, or state; the uploaded object must exist privately first.
DROP POLICY IF EXISTS "Salon owners can view their payment requests" ON public.manual_payment_requests;
DROP POLICY IF EXISTS "Salon owners can submit payment requests" ON public.manual_payment_requests;
DROP POLICY IF EXISTS "Super admins can manage payment requests" ON public.manual_payment_requests;
CREATE POLICY "Salon owners and AAL2 admins can view payment requests"
  ON public.manual_payment_requests FOR SELECT TO authenticated
  USING (public.is_salon_owner(salon_id) OR public.is_super_admin());
CREATE POLICY "Salon owners can submit pending payment requests"
  ON public.manual_payment_requests FOR INSERT TO authenticated
  WITH CHECK (
    public.is_salon_owner(salon_id)
    AND status = 'pending'
    AND rejection_reason IS NULL
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
  );
CREATE POLICY "AAL2 platform admins manage payment requests"
  ON public.manual_payment_requests FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());
REVOKE UPDATE, DELETE ON public.manual_payment_requests FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.validate_manual_payment_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_salon public.salons%ROWTYPE;
  v_plan public.subscription_plans%ROWTYPE;
  v_expected NUMERIC(12,2);
BEGIN
  IF TG_OP <> 'INSERT' OR coalesce(auth.role(), '') = 'service_role' THEN RETURN NEW; END IF;
  IF auth.uid() IS NULL OR NOT public.is_salon_owner(NEW.salon_id) THEN
    RAISE EXCEPTION 'Only an authenticated salon owner may submit a payment request.';
  END IF;
  SELECT * INTO v_salon FROM public.salons WHERE id = NEW.salon_id AND status = 'active';
  SELECT * INTO v_plan FROM public.subscription_plans WHERE id = NEW.plan_id AND is_active = TRUE;
  IF NOT FOUND OR v_plan.id IS NULL THEN RAISE EXCEPTION 'The selected subscription plan is not available.'; END IF;
  IF NEW.billing_cycle NOT IN ('monthly', 'yearly') THEN RAISE EXCEPTION 'Invalid billing cycle.'; END IF;
  v_expected := CASE WHEN NEW.billing_cycle = 'yearly' THEN v_plan.yearly_price_lkr ELSE v_plan.monthly_price_lkr END;
  IF v_expected <= 0 OR NEW.amount_lkr IS DISTINCT FROM v_expected THEN RAISE EXCEPTION 'The submitted payment amount does not match the selected plan.'; END IF;
  IF NEW.payment_date > CURRENT_DATE OR NEW.payment_date < CURRENT_DATE - 30 THEN RAISE EXCEPTION 'Payment date must be within the last 30 days.'; END IF;
  IF length(trim(coalesce(NEW.bank_reference, ''))) NOT BETWEEN 3 AND 100 THEN RAISE EXCEPTION 'Bank reference must contain 3 to 100 characters.'; END IF;
  NEW.salon_name := v_salon.name;
  NEW.owner_email := coalesce(auth.jwt() ->> 'email', '');
  NEW.plan_name := v_plan.name || CASE WHEN NEW.billing_cycle = 'yearly' THEN ' (Yearly)' ELSE ' (Monthly)' END;
  NEW.amount_lkr := v_expected;
  NEW.bank_reference := trim(NEW.bank_reference);
  NEW.status := 'pending';
  NEW.rejection_reason := NULL;
  NEW.reviewed_by := NULL;
  NEW.reviewed_at := NULL;
  NEW.notes := left(trim(coalesce(NEW.notes, '')), 1000);
  NEW.receipt_file_name := left(regexp_replace(coalesce(NEW.receipt_file_name, 'payment-receipt'), '[^[:alnum:]_. -]', '_', 'g'), 120);
  IF coalesce(NEW.receipt_url, '') !~* ('^' || NEW.salon_id::TEXT || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp|pdf)$')
     OR NOT EXISTS (
       SELECT 1 FROM storage.objects o
       WHERE o.bucket_id = 'payment-receipts' AND o.name = NEW.receipt_url
     ) THEN
    RAISE EXCEPTION 'A receipt in the salon private Supabase Storage bucket is required.';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS validate_manual_payment_request ON public.manual_payment_requests;
CREATE TRIGGER validate_manual_payment_request
  BEFORE INSERT ON public.manual_payment_requests
  FOR EACH ROW EXECUTE FUNCTION public.validate_manual_payment_request();

-- Review contact details are visible only to the salon's owner/manager.
DROP POLICY IF EXISTS "Salon members can view website reviews" ON public.website_reviews;
CREATE POLICY "Salon managers can view website reviews"
  ON public.website_reviews FOR SELECT TO authenticated
  USING (public.is_salon_manager_or_owner(salon_id));

CREATE OR REPLACE FUNCTION public.protect_website_review_source_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' AND (
    NEW.salon_id IS DISTINCT FROM OLD.salon_id
    OR NEW.customer_name IS DISTINCT FROM OLD.customer_name
    OR NEW.customer_phone IS DISTINCT FROM OLD.customer_phone
    OR NEW.rating IS DISTINCT FROM OLD.rating
    OR NEW.review_text IS DISTINCT FROM OLD.review_text
    OR NEW.service_ref IS DISTINCT FROM OLD.service_ref
    OR NEW.verified_booking IS DISTINCT FROM OLD.verified_booking
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  ) THEN
    RAISE EXCEPTION 'Customer review content and verification provenance are immutable.';
  END IF;
  IF NEW.is_featured AND NEW.status <> 'approved' THEN
    RAISE EXCEPTION 'Only approved reviews may be featured.';
  END IF;
  IF coalesce(auth.role(), '') <> 'service_role' AND (
    NEW.moderated_by IS DISTINCT FROM auth.uid()
    OR NEW.moderated_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Review moderation must be attributed to the authenticated moderator.';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_website_review_source_fields ON public.website_reviews;
CREATE TRIGGER protect_website_review_source_fields
  BEFORE UPDATE ON public.website_reviews
  FOR EACH ROW EXECUTE FUNCTION public.protect_website_review_source_fields();

COMMIT;

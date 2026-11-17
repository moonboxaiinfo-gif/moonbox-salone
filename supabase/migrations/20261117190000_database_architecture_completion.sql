-- Moonbox Salon database architecture completion.
-- Local, forward-only migration. Review and test only on an isolated local
-- database before considering any approved remote application.
BEGIN;

-- A trial's configured trial_ends_at is authoritative. The longer end_date is
-- retained for legacy compatibility but must not silently extend a trial.
CREATE OR REPLACE FUNCTION public.salon_is_operational(p_salon_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.salons s
    JOIN public.salon_subscriptions ss ON ss.salon_id = s.id
    JOIN public.subscription_plans sp ON sp.id = ss.plan_id
    WHERE s.id = p_salon_id
      AND s.status = 'active'
      AND ss.start_date <= CURRENT_DATE
      AND (
        (ss.status = 'trial' AND coalesce(ss.trial_ends_at, ss.end_date) >= CURRENT_DATE)
        OR (ss.status = 'active' AND ss.end_date >= CURRENT_DATE)
      )
      AND sp.is_active = TRUE
  );
$$;
REVOKE ALL ON FUNCTION public.salon_is_operational(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.salon_is_operational(UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.salon_has_active_feature(p_salon_id UUID, p_feature TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT public.salon_is_operational(p_salon_id)
    AND EXISTS (
      SELECT 1
      FROM public.salon_subscriptions ss
      JOIN public.subscription_plans sp ON sp.id = ss.plan_id
      WHERE ss.salon_id = p_salon_id
        AND ss.start_date <= CURRENT_DATE
        AND (
          (ss.status = 'trial' AND coalesce(ss.trial_ends_at, ss.end_date) >= CURRENT_DATE)
          OR (ss.status = 'active' AND ss.end_date >= CURRENT_DATE)
        )
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
REVOKE ALL ON FUNCTION public.salon_has_active_feature(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.salon_has_active_feature(UUID, TEXT) TO authenticated, service_role;

-- Staff login assignment is explicit; matching a staff email to an Auth email
-- is never used as an authorization decision.
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_salon_auth_user
  ON public.staff (salon_id, auth_user_id)
  WHERE auth_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_staff_auth_user
  ON public.staff (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.current_user_staff_id(p_salon_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT s.id
  FROM public.staff s
  JOIN public.salon_members m
    ON m.salon_id = s.salon_id
   AND m.user_id = s.auth_user_id
   AND m.role = 'staff'
   AND m.status = 'active'
  WHERE s.salon_id = p_salon_id
    AND s.auth_user_id = auth.uid()
    AND s.status = 'active'
    AND public.salon_is_operational(p_salon_id)
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.current_user_staff_id(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_staff_id(UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_salon_owner_member(p_salon_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.salon_members m
    WHERE m.salon_id = p_salon_id
      AND m.user_id = auth.uid()
      AND m.role = 'owner'
      AND m.status = 'active'
  );
$$;
REVOKE ALL ON FUNCTION public.is_salon_owner_member(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_salon_owner_member(UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.validate_staff_user_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.auth_user_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.salon_members m
    WHERE m.salon_id = NEW.salon_id
      AND m.user_id = NEW.auth_user_id
      AND m.role = 'staff'
      AND m.status = 'active'
  ) THEN
    RAISE EXCEPTION 'A linked login must be an active Staff member of this salon.';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS validate_staff_user_assignment ON public.staff;
CREATE TRIGGER validate_staff_user_assignment
  BEFORE INSERT OR UPDATE OF salon_id, auth_user_id ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.validate_staff_user_assignment();

CREATE OR REPLACE FUNCTION public.get_salon_staff_accounts(
  p_salon_id UUID,
  p_staff_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT public.has_salon_permission(p_salon_id, 'manage_staff') THEN
    RAISE EXCEPTION 'Active owner or manager permission is required to manage Staff logins.';
  END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'user_id', p.id,
    'full_name', p.full_name,
    'email', p.email
  ) ORDER BY p.full_name), '[]'::JSONB)
  INTO v_result
  FROM public.salon_members m
  JOIN public.profiles p ON p.id = m.user_id
  WHERE m.salon_id = p_salon_id
    AND m.role = 'staff'
    AND m.status = 'active'
    AND (
      NOT EXISTS (
        SELECT 1 FROM public.staff linked
        WHERE linked.salon_id = p_salon_id
          AND linked.auth_user_id = m.user_id
          AND linked.id <> coalesce(p_staff_id, '00000000-0000-0000-0000-000000000000'::UUID)
      )
      OR EXISTS (
        SELECT 1 FROM public.staff current_staff
        WHERE current_staff.id = p_staff_id
          AND current_staff.salon_id = p_salon_id
          AND current_staff.auth_user_id = m.user_id
      )
    );
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_salon_staff_accounts(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_salon_staff_accounts(UUID, UUID) TO authenticated;

-- Initial support messages must be attributed by the database, not accepted
-- from a client-supplied messages JSON document.
DROP POLICY IF EXISTS "Salon members create their own support ticket" ON public.support_tickets;
REVOKE INSERT ON public.support_tickets FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_salon_support_ticket(
  p_salon_id UUID,
  p_subject TEXT,
  p_category TEXT,
  p_priority TEXT,
  p_content TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_salon_name TEXT;
  v_user_email TEXT;
  v_ticket public.support_tickets%ROWTYPE;
  v_message JSONB;
BEGIN
  IF auth.uid() IS NULL
     OR p_salon_id IS NULL
     OR length(trim(coalesce(p_subject, ''))) NOT BETWEEN 1 AND 200
     OR p_category IS NULL OR p_category NOT IN ('general', 'billing', 'technical', 'feature_request')
     OR p_priority IS NULL OR p_priority NOT IN ('normal', 'high', 'urgent')
     OR length(trim(coalesce(p_content, ''))) NOT BETWEEN 1 AND 4000 THEN
    RAISE EXCEPTION 'A valid salon, subject, category, priority, and message are required.';
  END IF;

  SELECT s.name INTO v_salon_name
  FROM public.salons s
  WHERE s.id = p_salon_id;
  IF NOT FOUND OR NOT EXISTS (
    SELECT 1 FROM public.salon_members m
    WHERE m.salon_id = p_salon_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND m.role IN ('owner', 'manager', 'receptionist', 'staff')
  ) THEN
    RAISE EXCEPTION 'An active salon membership is required to create a support ticket.';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = auth.uid();
  v_user_email := coalesce(nullif(v_profile.email, ''), auth.jwt() ->> 'email', '');
  v_message := jsonb_build_object(
    'id', gen_random_uuid(),
    'senderEmail', v_user_email,
    'senderName', coalesce(nullif(trim(v_profile.full_name), ''), v_user_email, 'Salon member'),
    'senderRole', 'tenant',
    'content', trim(p_content),
    'createdAt', now()
  );
  INSERT INTO public.support_tickets (
    salon_id, salon_name, user_email, subject, category, priority,
    status, assigned_to, messages
  ) VALUES (
    p_salon_id, v_salon_name, v_user_email, trim(p_subject), p_category,
    p_priority, 'open', NULL, jsonb_build_array(v_message)
  )
  RETURNING * INTO v_ticket;
  RETURN to_jsonb(v_ticket);
END;
$$;
REVOKE ALL ON FUNCTION public.create_salon_support_ticket(UUID, TEXT, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.create_salon_support_ticket(UUID, TEXT, TEXT, TEXT, TEXT)
  TO authenticated;

-- Allow a pending owner to complete profile/onboarding fields without granting
-- access to operational records or the ability to approve their own salon.
DROP POLICY IF EXISTS "Active salon managers update ordinary salon settings" ON public.salons;
CREATE POLICY "Salon owners complete onboarding and managers update active settings"
  ON public.salons FOR UPDATE TO authenticated
  USING (
    public.is_salon_owner_member(id)
    OR public.is_salon_manager_or_owner(id)
  )
  WITH CHECK (
    public.is_salon_owner_member(id)
    OR public.is_salon_manager_or_owner(id)
  );

-- Replace legacy membership-wide policies as one coherent permission boundary.
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'service_categories', 'services', 'staff', 'product_categories',
        'products', 'stock_movements', 'appointment_status_history',
        'invoices', 'expenses', 'expense_categories', 'commissions'
      )
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename);
  END LOOP;
END $$;

CREATE POLICY "Operational members read service categories"
  ON public.service_categories FOR SELECT TO authenticated
  USING (public.has_salon_permission(salon_id, 'read'));
CREATE POLICY "Owners and managers manage service categories"
  ON public.service_categories FOR ALL TO authenticated
  USING (public.has_salon_permission(salon_id, 'manage_services'))
  WITH CHECK (public.has_salon_permission(salon_id, 'manage_services'));

CREATE POLICY "Operational members read services"
  ON public.services FOR SELECT TO authenticated
  USING (public.has_salon_permission(salon_id, 'read'));
CREATE POLICY "Owners and managers manage services"
  ON public.services FOR ALL TO authenticated
  USING (public.has_salon_permission(salon_id, 'manage_services'))
  WITH CHECK (public.has_salon_permission(salon_id, 'manage_services'));

CREATE POLICY "Operational members read staff directory"
  ON public.staff FOR SELECT TO authenticated
  USING (
    public.has_salon_permission(salon_id, 'read')
    OR auth_user_id = auth.uid()
  );
CREATE POLICY "Owners and managers manage staff"
  ON public.staff FOR ALL TO authenticated
  USING (public.has_salon_permission(salon_id, 'manage_staff'))
  WITH CHECK (public.has_salon_permission(salon_id, 'manage_staff'));

CREATE POLICY "Inventory-entitled sellers read product categories"
  ON public.product_categories FOR SELECT TO authenticated
  USING (
    public.has_salon_permission(salon_id, 'sell')
    AND public.salon_has_active_feature(salon_id, 'inventory')
  );
CREATE POLICY "Inventory-entitled managers manage product categories"
  ON public.product_categories FOR ALL TO authenticated
  USING (public.has_salon_permission(salon_id, 'manage_inventory'))
  WITH CHECK (public.has_salon_permission(salon_id, 'manage_inventory'));

CREATE POLICY "Inventory-entitled sellers read products"
  ON public.products FOR SELECT TO authenticated
  USING (
    public.has_salon_permission(salon_id, 'sell')
    AND public.salon_has_active_feature(salon_id, 'inventory')
  );
CREATE POLICY "Inventory-entitled managers manage products"
  ON public.products FOR ALL TO authenticated
  USING (public.has_salon_permission(salon_id, 'manage_inventory'))
  WITH CHECK (public.has_salon_permission(salon_id, 'manage_inventory'));

CREATE POLICY "Inventory-entitled managers read stock movements"
  ON public.stock_movements FOR SELECT TO authenticated
  USING (public.has_salon_permission(salon_id, 'manage_inventory'));

CREATE POLICY "Operational assigned staff and members read appointment history"
  ON public.appointment_status_history FOR SELECT TO authenticated
  USING (
    public.has_salon_permission(salon_id, 'read')
    OR (
      public.current_user_staff_id(salon_id) IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.appointments a
        WHERE a.id = appointment_status_history.appointment_id
          AND a.salon_id = appointment_status_history.salon_id
          AND a.staff_id = public.current_user_staff_id(salon_id)
      )
    )
  );

CREATE POLICY "Plan-entitled managers read invoices"
  ON public.invoices FOR SELECT TO authenticated
  USING (
    public.is_salon_manager_or_owner(salon_id)
    AND public.salon_has_active_feature(salon_id, 'reports')
  );

CREATE POLICY "Plan-entitled managers read expenses"
  ON public.expenses FOR SELECT TO authenticated
  USING (
    public.is_salon_manager_or_owner(salon_id)
    AND public.salon_has_active_feature(salon_id, 'reports')
  );
CREATE POLICY "Operational managers manage expenses"
  ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (public.has_salon_permission(salon_id, 'manage_finance'));
CREATE POLICY "Operational managers update expenses"
  ON public.expenses FOR UPDATE TO authenticated
  USING (public.has_salon_permission(salon_id, 'manage_finance'))
  WITH CHECK (public.has_salon_permission(salon_id, 'manage_finance'));
CREATE POLICY "Operational managers delete expenses"
  ON public.expenses FOR DELETE TO authenticated
  USING (public.has_salon_permission(salon_id, 'manage_finance'));

CREATE POLICY "Operational managers read expense categories"
  ON public.expense_categories FOR SELECT TO authenticated
  USING (public.has_salon_permission(salon_id, 'manage_finance'));
CREATE POLICY "Operational managers manage expense categories"
  ON public.expense_categories FOR ALL TO authenticated
  USING (public.has_salon_permission(salon_id, 'manage_finance'))
  WITH CHECK (public.has_salon_permission(salon_id, 'manage_finance'));

CREATE POLICY "Commission-entitled managers read commissions"
  ON public.commissions FOR SELECT TO authenticated
  USING (public.has_salon_permission(salon_id, 'manage_commissions'));

REVOKE ALL ON public.invoices, public.commissions, public.stock_movements,
  public.appointment_status_history FROM anon, authenticated;
GRANT SELECT ON public.invoices, public.commissions, public.stock_movements,
  public.appointment_status_history TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.invoices, public.commissions,
  public.stock_movements, public.appointment_status_history FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses, public.expense_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services, public.service_categories,
  public.staff, public.products, public.product_categories TO authenticated;

-- Restore only assigned-record Staff access through security-definer RPCs.
CREATE OR REPLACE FUNCTION public.get_salon_customers(p_salon_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_role TEXT;
  v_staff_id UUID;
  v_result JSONB;
BEGIN
  SELECT m.role INTO v_role FROM public.salon_members m
  WHERE m.salon_id = p_salon_id AND m.user_id = auth.uid() AND m.status = 'active';
  v_staff_id := public.current_user_staff_id(p_salon_id);
  IF v_role IS NULL OR v_role NOT IN ('owner', 'manager', 'receptionist', 'staff')
     OR (v_role = 'staff' AND v_staff_id IS NULL)
     OR NOT public.salon_is_operational(p_salon_id) THEN
    RAISE EXCEPTION 'Customer access is not available for this salon role or subscription.';
  END IF;
  IF v_role IN ('owner', 'manager') THEN
    SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.created_at DESC), '[]'::JSONB)
      INTO v_result FROM public.customers c WHERE c.salon_id = p_salon_id;
  ELSIF v_role = 'receptionist' THEN
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', c.id, 'salon_id', c.salon_id, 'name', c.name, 'phone', c.phone,
      'whatsapp', c.whatsapp, 'email', c.email, 'status', c.status,
      'created_at', c.created_at
    ) ORDER BY c.created_at DESC), '[]'::JSONB)
      INTO v_result FROM public.customers c WHERE c.salon_id = p_salon_id;
  ELSE
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', c.id, 'salon_id', c.salon_id, 'name', c.name, 'phone', c.phone,
      'status', c.status, 'created_at', c.created_at
    ) ORDER BY c.created_at DESC), '[]'::JSONB)
      INTO v_result
      FROM public.customers c
      WHERE c.salon_id = p_salon_id
        AND EXISTS (
          SELECT 1 FROM public.appointments a
          WHERE a.salon_id = p_salon_id
            AND a.staff_id = v_staff_id
            AND a.customer_id = c.id
        );
  END IF;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_salon_customers(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_salon_customers(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_salon_appointments(p_salon_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_role TEXT;
  v_staff_id UUID;
  v_result JSONB;
BEGIN
  SELECT m.role INTO v_role FROM public.salon_members m
  WHERE m.salon_id = p_salon_id AND m.user_id = auth.uid() AND m.status = 'active';
  v_staff_id := public.current_user_staff_id(p_salon_id);
  IF v_role IS NULL OR v_role NOT IN ('owner', 'manager', 'receptionist', 'staff')
     OR (v_role = 'staff' AND v_staff_id IS NULL)
     OR NOT public.salon_is_operational(p_salon_id) THEN
    RAISE EXCEPTION 'Appointment access is not available for this salon role or subscription.';
  END IF;
  IF v_role IN ('owner', 'manager') THEN
    SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.date DESC, a.start_time), '[]'::JSONB)
      INTO v_result FROM public.appointments a WHERE a.salon_id = p_salon_id;
  ELSIF v_role = 'receptionist' THEN
    SELECT coalesce(jsonb_agg(to_jsonb(a) - ARRAY[
      'internal_notes', 'payment_status', 'invoice_id', 'total_price_lkr'
    ] ORDER BY a.date DESC, a.start_time), '[]'::JSONB)
      INTO v_result FROM public.appointments a WHERE a.salon_id = p_salon_id;
  ELSE
    SELECT coalesce(jsonb_agg(to_jsonb(a) - ARRAY[
      'internal_notes', 'payment_status', 'invoice_id', 'total_price_lkr'
    ] ORDER BY a.date DESC, a.start_time), '[]'::JSONB)
      INTO v_result
      FROM public.appointments a
      WHERE a.salon_id = p_salon_id AND a.staff_id = v_staff_id;
  END IF;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_salon_appointments(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_salon_appointments(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_salon_appointment_status(
  p_salon_id UUID,
  p_appointment_id UUID,
  p_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_role TEXT;
  v_staff_id UUID;
  v_row public.appointments%ROWTYPE;
BEGIN
  SELECT m.role INTO v_role FROM public.salon_members m
  WHERE m.salon_id = p_salon_id AND m.user_id = auth.uid() AND m.status = 'active';
  v_staff_id := public.current_user_staff_id(p_salon_id);
  IF v_role IS NULL OR NOT public.salon_is_operational(p_salon_id) THEN
    RAISE EXCEPTION 'Appointment status access is not available for this salon role or subscription.';
  END IF;
  IF v_role = 'staff' THEN
    IF v_staff_id IS NULL OR p_status NOT IN ('checked_in', 'in_progress', 'completed') THEN
      RAISE EXCEPTION 'Staff may update only assigned appointments through approved service statuses.';
    END IF;
    UPDATE public.appointments SET status = p_status, updated_at = now()
    WHERE id = p_appointment_id AND salon_id = p_salon_id AND staff_id = v_staff_id
    RETURNING * INTO v_row;
  ELSIF v_role IN ('owner', 'manager', 'receptionist') THEN
    UPDATE public.appointments SET status = p_status, updated_at = now()
    WHERE id = p_appointment_id AND salon_id = p_salon_id
    RETURNING * INTO v_row;
  ELSE
    RAISE EXCEPTION 'Appointment status access is not available for this salon role.';
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'Appointment was not found in this salon.'; END IF;
  IF v_role IN ('receptionist', 'staff') THEN
    RETURN to_jsonb(v_row) - ARRAY[
      'internal_notes', 'payment_status', 'invoice_id', 'total_price_lkr'
    ];
  END IF;
  RETURN to_jsonb(v_row);
END;
$$;
REVOKE ALL ON FUNCTION public.update_salon_appointment_status(UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_salon_appointment_status(UUID, UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_commission_paid(
  p_salon_id UUID,
  p_commission_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_row public.commissions%ROWTYPE;
BEGIN
  IF NOT public.has_salon_permission(p_salon_id, 'manage_commissions') THEN
    RAISE EXCEPTION 'Commission-management permission and plan entitlement are required.';
  END IF;
  UPDATE public.commissions
  SET status = 'paid', paid_at = now()
  WHERE id = p_commission_id
    AND salon_id = p_salon_id
    AND status = 'unpaid'
  RETURNING * INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unpaid commission was not found in this salon.'; END IF;
  RETURN to_jsonb(v_row);
END;
$$;
REVOKE ALL ON FUNCTION public.mark_commission_paid(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_commission_paid(UUID, UUID) TO authenticated;

-- Limits apply both to new rows and reactivation of archived/inactive rows.
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
  v_lock_key TEXT;
BEGIN
  IF TG_TABLE_NAME = 'staff' THEN
    IF TG_OP = 'UPDATE' AND NEW.status <> 'active' THEN RETURN NEW; END IF;
    IF TG_OP = 'UPDATE' AND OLD.status = 'active' AND OLD.salon_id = NEW.salon_id THEN RETURN NEW; END IF;
    IF TG_OP = 'INSERT' AND NEW.status <> 'active' THEN RETURN NEW; END IF;
    v_feature := 'staff';
    v_lock_key := NEW.salon_id::TEXT || ':staff-limit';
    PERFORM pg_advisory_xact_lock(hashtextextended(v_lock_key, 0));
    SELECT sp.max_staff INTO v_limit
    FROM public.salon_subscriptions ss
    JOIN public.subscription_plans sp ON sp.id = ss.plan_id
    WHERE ss.salon_id = NEW.salon_id
      AND ss.start_date <= CURRENT_DATE
      AND (
        (ss.status = 'trial' AND coalesce(ss.trial_ends_at, ss.end_date) >= CURRENT_DATE)
        OR (ss.status = 'active' AND ss.end_date >= CURRENT_DATE)
      )
      AND sp.is_active = TRUE;
    SELECT count(*) INTO v_count FROM public.staff
    WHERE salon_id = NEW.salon_id AND status = 'active'
      AND (TG_OP = 'INSERT' OR id <> NEW.id);
  ELSIF TG_TABLE_NAME = 'customers' THEN
    IF TG_OP = 'UPDATE' AND NEW.status <> 'active' THEN RETURN NEW; END IF;
    IF TG_OP = 'UPDATE' AND OLD.status = 'active' AND OLD.salon_id = NEW.salon_id THEN RETURN NEW; END IF;
    IF TG_OP = 'INSERT' AND NEW.status <> 'active' THEN RETURN NEW; END IF;
    v_feature := 'customers';
    v_lock_key := NEW.salon_id::TEXT || ':customer-limit';
    PERFORM pg_advisory_xact_lock(hashtextextended(v_lock_key, 0));
    SELECT sp.max_customers INTO v_limit
    FROM public.salon_subscriptions ss
    JOIN public.subscription_plans sp ON sp.id = ss.plan_id
    WHERE ss.salon_id = NEW.salon_id
      AND ss.start_date <= CURRENT_DATE
      AND (
        (ss.status = 'trial' AND coalesce(ss.trial_ends_at, ss.end_date) >= CURRENT_DATE)
        OR (ss.status = 'active' AND ss.end_date >= CURRENT_DATE)
      )
      AND sp.is_active = TRUE;
    SELECT count(*) INTO v_count FROM public.customers
    WHERE salon_id = NEW.salon_id AND status = 'active'
      AND (TG_OP = 'INSERT' OR id <> NEW.id);
  ELSE
    RETURN NEW;
  END IF;
  IF v_limit IS NULL THEN
    RAISE EXCEPTION 'An active subscription is required to add or reactivate %.', v_feature;
  END IF;
  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'The salon plan limit for % has been reached.', v_feature;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS enforce_salon_staff_limit ON public.staff;
CREATE TRIGGER enforce_salon_staff_limit
  BEFORE INSERT OR UPDATE OF status, salon_id ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.enforce_salon_plan_row_limits();
DROP TRIGGER IF EXISTS enforce_salon_customer_limit ON public.customers;
CREATE TRIGGER enforce_salon_customer_limit
  BEFORE INSERT OR UPDATE OF status, salon_id ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.enforce_salon_plan_row_limits();

-- Record the authenticated Staff user's attribution on appointment history.
CREATE OR REPLACE FUNCTION public.record_appointment_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.appointment_status_history (
      salon_id, appointment_id, from_status, to_status, changed_by
    ) VALUES (
      NEW.salon_id, NEW.id,
      CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END,
      NEW.status, auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

COMMIT;

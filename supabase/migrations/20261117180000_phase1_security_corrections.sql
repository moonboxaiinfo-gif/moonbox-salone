-- Phase 1 forward-only security corrections.
-- Do not apply remotely without explicit owner approval and a production preflight.
BEGIN;

-- This project permits one platform identity only. This intentionally fails
-- rather than deleting or silently changing any existing platform accounts.
ALTER TABLE public.platform_admins
  ADD CONSTRAINT platform_admins_primary_role_only
  CHECK (role = 'superadmin');
CREATE UNIQUE INDEX platform_admins_single_account_idx
  ON public.platform_admins ((TRUE));

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
      AND ss.status IN ('trial', 'active')
      AND ss.start_date <= CURRENT_DATE
      AND ss.end_date >= CURRENT_DATE
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
        AND ss.status IN ('trial', 'active')
        AND ss.start_date <= CURRENT_DATE
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
REVOKE ALL ON FUNCTION public.salon_has_active_feature(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.salon_has_active_feature(UUID, TEXT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_salon_owner(p_salon_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.salon_members m
    JOIN public.salons s ON s.id = m.salon_id
    WHERE m.salon_id = p_salon_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND m.role = 'owner'
      AND s.status = 'active'
  );
$$;
REVOKE ALL ON FUNCTION public.is_salon_owner(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_salon_owner(UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_salon_manager_or_owner(lookup_salon_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT public.is_super_admin()
    OR (
      public.salon_is_operational(lookup_salon_id)
      AND EXISTS (
        SELECT 1 FROM public.salon_members m
        WHERE m.salon_id = lookup_salon_id
          AND m.user_id = auth.uid()
          AND m.role IN ('owner', 'manager')
          AND m.status = 'active'
      )
    );
$$;
REVOKE ALL ON FUNCTION public.is_salon_manager_or_owner(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_salon_manager_or_owner(UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.has_salon_permission(p_salon_id UUID, p_permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT CASE
    WHEN public.is_super_admin() THEN TRUE
    WHEN p_permission = 'support' THEN EXISTS (
      SELECT 1 FROM public.salon_members m
      WHERE m.salon_id = p_salon_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'manager', 'receptionist', 'staff')
    )
    WHEN NOT public.salon_is_operational(p_salon_id) THEN FALSE
    ELSE EXISTS (
      SELECT 1 FROM public.salon_members m
      WHERE m.salon_id = p_salon_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND CASE p_permission
          WHEN 'read' THEN m.role IN ('owner', 'manager', 'receptionist')
          WHEN 'book' THEN m.role IN ('owner', 'manager', 'receptionist')
          WHEN 'sell' THEN m.role IN ('owner', 'manager', 'receptionist')
          WHEN 'manage_customers' THEN m.role IN ('owner', 'manager', 'receptionist')
          WHEN 'manage_appointments' THEN m.role IN ('owner', 'manager', 'receptionist')
          WHEN 'manage_services' THEN m.role IN ('owner', 'manager')
          WHEN 'manage_staff' THEN m.role IN ('owner', 'manager')
          WHEN 'manage_inventory' THEN m.role IN ('owner', 'manager')
            AND public.salon_has_active_feature(p_salon_id, 'inventory')
          WHEN 'manage_finance' THEN m.role IN ('owner', 'manager')
          WHEN 'manage_members' THEN m.role = 'owner'
          WHEN 'read_reports' THEN m.role IN ('owner', 'manager')
            AND public.salon_has_active_feature(p_salon_id, 'reports')
          WHEN 'manage_commissions' THEN m.role IN ('owner', 'manager')
            AND public.salon_has_active_feature(p_salon_id, 'commissions')
          WHEN 'custom_domain' THEN m.role IN ('owner', 'manager')
            AND public.salon_has_active_feature(p_salon_id, 'custom_domain')
          ELSE FALSE
        END
    )
  END;
$$;
REVOKE ALL ON FUNCTION public.has_salon_permission(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_salon_permission(UUID, TEXT) TO authenticated, service_role;

-- A salon owner can edit ordinary profile settings only after activation.
-- The trigger below reserves approval and tenant identity fields for AAL2 admins.
DROP POLICY IF EXISTS "Salon owners can update their salon" ON public.salons;
CREATE POLICY "Active salon managers update ordinary salon settings"
  ON public.salons FOR UPDATE TO authenticated
  USING (public.is_salon_manager_or_owner(id))
  WITH CHECK (public.is_salon_manager_or_owner(id));

CREATE OR REPLACE FUNCTION public.protect_salon_approval_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF coalesce(auth.role(), '') NOT IN ('authenticated', 'anon')
     OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Salon identity and approval status are platform-controlled.';
  END IF;
  IF NEW.portfolio -> 'customDomain' IS DISTINCT FROM OLD.portfolio -> 'customDomain'
     AND NOT public.salon_has_active_feature(OLD.id, 'custom_domain') THEN
    RAISE EXCEPTION 'An active custom-domain entitlement is required.';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_salon_approval_fields ON public.salons;
CREATE TRIGGER protect_salon_approval_fields
  BEFORE UPDATE ON public.salons
  FOR EACH ROW EXECUTE FUNCTION public.protect_salon_approval_fields();

-- Explicit policies replace the historic member-wide appointment/customer
-- policies. Staff are denied until the schema has an explicit auth-user link.
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('appointments', 'customers', 'salon_members')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename);
  END LOOP;
END $$;

CREATE POLICY "Operational salon members read their directory"
  ON public.salon_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_salon_member(salon_id));
CREATE POLICY "Only active salon owners manage membership"
  ON public.salon_members FOR ALL TO authenticated
  USING (public.is_salon_owner(salon_id) OR public.is_super_admin())
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_salon_owner(salon_id)
      AND role IN ('owner', 'manager', 'receptionist', 'staff')
    )
  );

CREATE POLICY "Operational owners managers and receptionists read customers"
  ON public.customers FOR SELECT TO authenticated
  USING (public.has_salon_permission(salon_id, 'read'));
CREATE POLICY "Operational booking roles create customers"
  ON public.customers FOR INSERT TO authenticated
  WITH CHECK (public.has_salon_permission(salon_id, 'manage_customers'));
CREATE POLICY "Operational booking roles update customers"
  ON public.customers FOR UPDATE TO authenticated
  USING (public.has_salon_permission(salon_id, 'manage_customers'))
  WITH CHECK (public.has_salon_permission(salon_id, 'manage_customers'));
CREATE POLICY "Operational booking roles delete customers"
  ON public.customers FOR DELETE TO authenticated
  USING (public.has_salon_permission(salon_id, 'manage_customers'));

CREATE POLICY "Operational owners managers and receptionists read appointments"
  ON public.appointments FOR SELECT TO authenticated
  USING (public.has_salon_permission(salon_id, 'read'));
CREATE POLICY "Operational booking roles create appointments"
  ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (public.has_salon_permission(salon_id, 'manage_appointments'));
CREATE POLICY "Operational booking roles update appointments"
  ON public.appointments FOR UPDATE TO authenticated
  USING (public.has_salon_permission(salon_id, 'manage_appointments'))
  WITH CHECK (public.has_salon_permission(salon_id, 'manage_appointments'));
CREATE POLICY "Operational booking roles delete appointments"
  ON public.appointments FOR DELETE TO authenticated
  USING (public.has_salon_permission(salon_id, 'manage_appointments'));

-- PostgreSQL's shared authenticated role cannot implement per-membership column
-- privacy with grants. Reads and writes go through the following role-aware RPCs.
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.customers FROM anon, authenticated;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.appointments FROM anon, authenticated;
GRANT DELETE ON public.customers, public.appointments TO authenticated;
GRANT SELECT (id, salon_id) ON public.customers, public.appointments TO authenticated;

CREATE OR REPLACE FUNCTION public.get_salon_customers(p_salon_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_role TEXT;
  v_result JSONB;
BEGIN
  SELECT m.role INTO v_role FROM public.salon_members m
  WHERE m.salon_id = p_salon_id AND m.user_id = auth.uid() AND m.status = 'active';
  IF v_role IS NULL OR v_role NOT IN ('owner', 'manager', 'receptionist')
     OR NOT public.salon_is_operational(p_salon_id) THEN
    RAISE EXCEPTION 'Customer access is not available for this salon role or subscription.';
  END IF;
  IF v_role IN ('owner', 'manager') THEN
    SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.created_at DESC), '[]'::jsonb)
      INTO v_result FROM public.customers c WHERE c.salon_id = p_salon_id;
  ELSE
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', c.id, 'salon_id', c.salon_id, 'name', c.name, 'phone', c.phone,
      'whatsapp', c.whatsapp, 'email', c.email, 'status', c.status,
      'created_at', c.created_at
    ) ORDER BY c.created_at DESC), '[]'::jsonb)
      INTO v_result FROM public.customers c WHERE c.salon_id = p_salon_id;
  END IF;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_salon_customers(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_salon_customers(UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.save_salon_customer(p_salon_id UUID, p_customer JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_role TEXT;
  v_customer_id UUID;
  v_row public.customers%ROWTYPE;
BEGIN
  IF jsonb_typeof(p_customer) <> 'object' THEN
    RAISE EXCEPTION 'Customer payload must be an object.';
  END IF;
  SELECT m.role INTO v_role FROM public.salon_members m
  WHERE m.salon_id = p_salon_id AND m.user_id = auth.uid() AND m.status = 'active';
  IF v_role IS NULL OR v_role NOT IN ('owner', 'manager', 'receptionist')
     OR NOT public.salon_is_operational(p_salon_id) THEN
    RAISE EXCEPTION 'Customer management is not available for this salon role or subscription.';
  END IF;
  v_customer_id := nullif(p_customer ->> 'id', '')::UUID;
  IF v_customer_id IS NULL THEN v_customer_id := gen_random_uuid(); END IF;

  IF v_role = 'receptionist' THEN
    INSERT INTO public.customers (id, salon_id, name, phone, whatsapp, email)
    VALUES (v_customer_id, p_salon_id, trim(p_customer ->> 'name'),
      trim(p_customer ->> 'phone'), nullif(trim(p_customer ->> 'whatsapp'), ''),
      nullif(trim(p_customer ->> 'email'), ''))
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name, phone = EXCLUDED.phone,
      whatsapp = EXCLUDED.whatsapp, email = EXCLUDED.email,
      updated_at = now()
    WHERE public.customers.salon_id = p_salon_id
    RETURNING * INTO v_row;
  ELSE
    INSERT INTO public.customers (
      id, salon_id, name, phone, whatsapp, email, gender, birthday,
      address, notes, status
    ) VALUES (
      v_customer_id, p_salon_id, trim(p_customer ->> 'name'),
      trim(p_customer ->> 'phone'), nullif(trim(p_customer ->> 'whatsapp'), ''),
      nullif(trim(p_customer ->> 'email'), ''), nullif(p_customer ->> 'gender', ''),
      nullif(p_customer ->> 'birthday', '')::DATE,
      nullif(p_customer ->> 'address', ''), nullif(p_customer ->> 'notes', ''),
      coalesce(nullif(p_customer ->> 'status', ''), 'active')
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name, phone = EXCLUDED.phone,
      whatsapp = EXCLUDED.whatsapp, email = EXCLUDED.email,
      gender = EXCLUDED.gender, birthday = EXCLUDED.birthday,
      address = EXCLUDED.address, notes = EXCLUDED.notes,
      status = EXCLUDED.status, updated_at = now()
    WHERE public.customers.salon_id = p_salon_id
    RETURNING * INTO v_row;
  END IF;
  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Customer was not found in this salon.';
  END IF;
  IF v_role = 'receptionist' THEN
    RETURN to_jsonb(v_row) - ARRAY['gender', 'birthday', 'address', 'notes',
      'total_spent_lkr', 'visits_count', 'last_visit_at'];
  END IF;
  RETURN to_jsonb(v_row);
END;
$$;
REVOKE ALL ON FUNCTION public.save_salon_customer(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_salon_customer(UUID, JSONB) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_salon_appointments(p_salon_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_role TEXT;
  v_result JSONB;
BEGIN
  SELECT m.role INTO v_role FROM public.salon_members m
  WHERE m.salon_id = p_salon_id AND m.user_id = auth.uid() AND m.status = 'active';
  IF v_role IS NULL OR v_role NOT IN ('owner', 'manager', 'receptionist')
     OR NOT public.salon_is_operational(p_salon_id) THEN
    RAISE EXCEPTION 'Appointment access is not available for this salon role or subscription.';
  END IF;
  IF v_role IN ('owner', 'manager') THEN
    SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.date DESC, a.start_time), '[]'::jsonb)
      INTO v_result FROM public.appointments a WHERE a.salon_id = p_salon_id;
  ELSE
    SELECT coalesce(jsonb_agg(to_jsonb(a) - ARRAY[
      'internal_notes', 'payment_status', 'invoice_id'
    ] ORDER BY a.date DESC, a.start_time), '[]'::jsonb)
      INTO v_result FROM public.appointments a WHERE a.salon_id = p_salon_id;
  END IF;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_salon_appointments(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_salon_appointments(UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.save_salon_appointment(p_salon_id UUID, p_appointment JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_role TEXT;
  v_id UUID;
  v_customer_id UUID;
  v_staff_id UUID;
  v_service_ids UUID[];
  v_service_names TEXT[];
  v_price NUMERIC(10,2);
  v_service_count INTEGER;
  v_row public.appointments%ROWTYPE;
BEGIN
  IF jsonb_typeof(p_appointment) <> 'object' THEN
    RAISE EXCEPTION 'Appointment payload must be an object.';
  END IF;
  SELECT m.role INTO v_role FROM public.salon_members m
  WHERE m.salon_id = p_salon_id AND m.user_id = auth.uid() AND m.status = 'active';
  IF v_role IS NULL OR v_role NOT IN ('owner', 'manager', 'receptionist')
     OR NOT public.salon_is_operational(p_salon_id) THEN
    RAISE EXCEPTION 'Appointment management is not available for this salon role or subscription.';
  END IF;
  v_id := nullif(p_appointment ->> 'id', '')::UUID;
  IF v_id IS NULL THEN v_id := gen_random_uuid(); END IF;
  v_customer_id := nullif(p_appointment ->> 'customer_id', '')::UUID;
  v_staff_id := nullif(p_appointment ->> 'staff_id', '')::UUID;
  SELECT coalesce(array_agg(value::UUID), '{}'::UUID[]) INTO v_service_ids
  FROM jsonb_array_elements_text(coalesce(p_appointment -> 'service_ids', '[]'::JSONB));
  SELECT coalesce(array_agg(value), '{}'::TEXT[]) INTO v_service_names
  FROM jsonb_array_elements_text(coalesce(p_appointment -> 'service_names', '[]'::JSONB));
  SELECT coalesce(sum(s.price_lkr), 0)::NUMERIC(10,2), count(s.id)
    INTO v_price, v_service_count
  FROM unnest(v_service_ids) selected(service_id)
  JOIN public.services s ON s.id = selected.service_id AND s.salon_id = p_salon_id
  WHERE s.is_active = TRUE;
  IF v_service_count <> cardinality(v_service_ids) THEN
    RAISE EXCEPTION 'Selected appointment services are not available in this salon.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.appointments a WHERE a.id = v_id) THEN
    SELECT * INTO v_row FROM public.appointments a
    WHERE a.id = v_id AND a.salon_id = p_salon_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Appointment does not belong to this salon.'; END IF;
    UPDATE public.appointments SET
      customer_id = v_customer_id,
      customer_name = coalesce(p_appointment ->> 'customer_name', v_row.customer_name),
      customer_phone = coalesce(p_appointment ->> 'customer_phone', v_row.customer_phone),
      customer_email = nullif(p_appointment ->> 'customer_email', ''),
      staff_id = v_staff_id,
      staff_name = coalesce(p_appointment ->> 'staff_name', v_row.staff_name),
      service_ids = v_service_ids,
      service_names = v_service_names,
      date = coalesce(nullif(p_appointment ->> 'date', '')::DATE, v_row.date),
      start_time = coalesce(nullif(p_appointment ->> 'start_time', '')::TIME, v_row.start_time),
      end_time = coalesce(nullif(p_appointment ->> 'end_time', '')::TIME, v_row.end_time),
      duration_minutes = coalesce(nullif(p_appointment ->> 'duration_minutes', '')::INTEGER, v_row.duration_minutes),
      total_price_lkr = v_price,
      status = coalesce(nullif(p_appointment ->> 'status', ''), v_row.status),
      booking_source = v_row.booking_source,
      notes = nullif(p_appointment ->> 'notes', ''),
      updated_at = now()
    WHERE id = v_id AND salon_id = p_salon_id
    RETURNING * INTO v_row;
  ELSE
    INSERT INTO public.appointments (
      id, salon_id, customer_id, customer_name, customer_phone, customer_email,
      staff_id, staff_name, service_ids, service_names, date, start_time,
      end_time, duration_minutes, total_price_lkr, status, payment_status,
      booking_source, notes
    ) VALUES (
      v_id, p_salon_id, v_customer_id, trim(p_appointment ->> 'customer_name'),
      trim(p_appointment ->> 'customer_phone'), nullif(p_appointment ->> 'customer_email', ''),
      v_staff_id, trim(p_appointment ->> 'staff_name'), v_service_ids, v_service_names,
      (p_appointment ->> 'date')::DATE, (p_appointment ->> 'start_time')::TIME,
      (p_appointment ->> 'end_time')::TIME,
      coalesce(nullif(p_appointment ->> 'duration_minutes', '')::INTEGER, 45),
      v_price, coalesce(nullif(p_appointment ->> 'status', ''), 'pending'),
      'unpaid', coalesce(nullif(p_appointment ->> 'booking_source', ''), 'in_salon'),
      nullif(p_appointment ->> 'notes', '')
    )
    RETURNING * INTO v_row;
  END IF;
  IF v_role = 'receptionist' THEN
    RETURN to_jsonb(v_row) - ARRAY['internal_notes', 'payment_status', 'invoice_id'];
  END IF;
  RETURN to_jsonb(v_row);
END;
$$;
REVOKE ALL ON FUNCTION public.save_salon_appointment(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_salon_appointment(UUID, JSONB) TO authenticated, service_role;

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
  v_row public.appointments%ROWTYPE;
BEGIN
  SELECT m.role INTO v_role FROM public.salon_members m
  WHERE m.salon_id = p_salon_id AND m.user_id = auth.uid() AND m.status = 'active';
  IF v_role IS NULL OR v_role NOT IN ('owner', 'manager', 'receptionist')
     OR NOT public.salon_is_operational(p_salon_id) THEN
    RAISE EXCEPTION 'Appointment status access is not available for this salon role or subscription.';
  END IF;
  UPDATE public.appointments SET status = p_status, updated_at = now()
  WHERE id = p_appointment_id AND salon_id = p_salon_id
  RETURNING * INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION 'Appointment was not found in this salon.'; END IF;
  IF v_role = 'receptionist' THEN
    RETURN to_jsonb(v_row) - ARRAY['internal_notes', 'payment_status', 'invoice_id'];
  END IF;
  RETURN to_jsonb(v_row);
END;
$$;
REVOKE ALL ON FUNCTION public.update_salon_appointment_status(UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_salon_appointment_status(UUID, UUID, TEXT) TO authenticated, service_role;

-- The staff table has no auth.users foreign key or assignment mapping. This
-- migration intentionally exposes no appointment/customer rows to Staff until
-- that relationship is designed and added.

-- Financial and commission reads are not available to receptionist or staff.
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('invoices', 'expenses', 'commissions')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END $$;
CREATE POLICY "Plan-entitled owners and managers read invoices"
  ON public.invoices FOR SELECT TO authenticated
  USING (
    public.is_salon_manager_or_owner(salon_id)
    AND public.salon_has_active_feature(salon_id, 'reports')
  );
CREATE POLICY "Plan-entitled owners and managers read expenses"
  ON public.expenses FOR SELECT TO authenticated
  USING (
    public.is_salon_manager_or_owner(salon_id)
    AND public.salon_has_active_feature(salon_id, 'reports')
  );
CREATE POLICY "Owners and managers manage expenses"
  ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (public.is_salon_manager_or_owner(salon_id));
CREATE POLICY "Owners and managers update expenses"
  ON public.expenses FOR UPDATE TO authenticated
  USING (public.is_salon_manager_or_owner(salon_id))
  WITH CHECK (public.is_salon_manager_or_owner(salon_id));
CREATE POLICY "Owners and managers delete expenses"
  ON public.expenses FOR DELETE TO authenticated
  USING (public.is_salon_manager_or_owner(salon_id));
CREATE POLICY "Commission-entitled owners and managers read commissions"
  ON public.commissions FOR SELECT TO authenticated
  USING (public.has_salon_permission(salon_id, 'manage_commissions'));
CREATE POLICY "Commission-entitled owners and managers insert commissions"
  ON public.commissions FOR INSERT TO authenticated
  WITH CHECK (public.has_salon_permission(salon_id, 'manage_commissions'));
CREATE POLICY "Commission-entitled owners and managers update commissions"
  ON public.commissions FOR UPDATE TO authenticated
  USING (public.has_salon_permission(salon_id, 'manage_commissions'))
  WITH CHECK (public.has_salon_permission(salon_id, 'manage_commissions'));
CREATE POLICY "Commission-entitled owners and managers delete commissions"
  ON public.commissions FOR DELETE TO authenticated
  USING (public.has_salon_permission(salon_id, 'manage_commissions'));
GRANT SELECT ON public.invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses, public.commissions TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.invoices FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.prevent_direct_support_message_forgery()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF current_user = 'authenticated'
     AND NEW.messages IS DISTINCT FROM OLD.messages THEN
    RAISE EXCEPTION 'Support messages must be appended through the authorized support RPC.';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS prevent_direct_support_message_forgery ON public.support_tickets;
CREATE TRIGGER prevent_direct_support_message_forgery
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.prevent_direct_support_message_forgery();

CREATE OR REPLACE FUNCTION public.append_support_ticket_message(
  p_ticket_id UUID,
  p_content TEXT,
  p_sender_name TEXT,
  p_sender_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_ticket public.support_tickets%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_message JSONB;
  v_sender_role TEXT;
  v_sender_name TEXT;
  v_sender_email TEXT;
BEGIN
  IF auth.uid() IS NULL OR length(trim(coalesce(p_content, ''))) NOT BETWEEN 1 AND 4000 THEN
    RAISE EXCEPTION 'An authenticated user and a message of 1 to 4000 characters are required.';
  END IF;
  SELECT * INTO v_ticket FROM public.support_tickets
  WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Support ticket not found.'; END IF;

  IF public.is_super_admin() THEN
    v_sender_role := 'support';
    v_sender_name := 'Moonbox Digital Support';
  ELSE
    IF v_ticket.salon_id IS NULL
       OR NOT public.has_salon_permission(v_ticket.salon_id, 'support') THEN
      RAISE EXCEPTION 'Access denied for support ticket.';
    END IF;
    v_sender_role := 'tenant';
    SELECT * INTO v_profile FROM public.profiles WHERE id = auth.uid();
    v_sender_name := coalesce(nullif(trim(v_profile.full_name), ''),
      nullif(auth.jwt() ->> 'email', ''), 'Salon member');
  END IF;
  v_sender_email := coalesce(v_profile.email, auth.jwt() ->> 'email', '');
  v_message := jsonb_build_object(
    'id', gen_random_uuid(),
    'senderEmail', v_sender_email,
    'senderName', v_sender_name,
    'senderRole', v_sender_role,
    'content', trim(p_content),
    'createdAt', now()
  );
  UPDATE public.support_tickets
  SET messages = coalesce(messages, '[]'::jsonb) || jsonb_build_array(v_message),
      status = CASE WHEN v_sender_role = 'support' THEN 'waiting_for_customer' ELSE 'in_progress' END,
      updated_at = now()
  WHERE id = p_ticket_id;
  RETURN v_message;
END;
$$;
REVOKE ALL ON FUNCTION public.append_support_ticket_message(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.append_support_ticket_message(UUID, TEXT, TEXT, TEXT) TO authenticated, service_role;

-- Serialize per-salon/per-table insert counts before enforcing plan limits.
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
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.salon_id::TEXT || ':staff-limit', 0));
    SELECT sp.max_staff INTO v_limit FROM public.salon_subscriptions ss
    JOIN public.subscription_plans sp ON sp.id = ss.plan_id
    WHERE ss.salon_id = NEW.salon_id AND ss.status IN ('trial', 'active')
      AND ss.start_date <= CURRENT_DATE AND ss.end_date >= CURRENT_DATE
      AND sp.is_active = TRUE;
    SELECT count(*) INTO v_count FROM public.staff
      WHERE salon_id = NEW.salon_id AND status = 'active';
  ELSIF TG_TABLE_NAME = 'customers' THEN
    IF EXISTS (SELECT 1 FROM public.customers WHERE id = NEW.id) THEN RETURN NEW; END IF;
    v_feature := 'customers';
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.salon_id::TEXT || ':customer-limit', 0));
    SELECT sp.max_customers INTO v_limit FROM public.salon_subscriptions ss
    JOIN public.subscription_plans sp ON sp.id = ss.plan_id
    WHERE ss.salon_id = NEW.salon_id AND ss.status IN ('trial', 'active')
      AND ss.start_date <= CURRENT_DATE AND ss.end_date >= CURRENT_DATE
      AND sp.is_active = TRUE;
    SELECT count(*) INTO v_count FROM public.customers
      WHERE salon_id = NEW.salon_id AND status = 'active';
  ELSE
    RETURN NEW;
  END IF;
  IF v_limit IS NULL THEN
    RAISE EXCEPTION 'An active subscription is required to add %.', v_feature;
  END IF;
  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'The salon plan limit for % has been reached.', v_feature;
  END IF;
  RETURN NEW;
END;
$$;

COMMIT;

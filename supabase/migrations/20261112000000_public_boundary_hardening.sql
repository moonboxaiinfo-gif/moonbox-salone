-- Moonbox Salon public-boundary hardening.
-- Additive and non-destructive: existing records are preserved.
-- Apply after 20261111000000_appointment_operations_hardening.sql.

-- Public clients must not insert arbitrary customers or appointments. They use
-- submit_public_booking(), which validates every tenant-owned relationship.
DROP POLICY IF EXISTS "Allow public booking to register/find customer" ON public.customers;
DROP POLICY IF EXISTS "Public can create online booking appointment" ON public.appointments;
DROP POLICY IF EXISTS "Public can view service categories" ON public.service_categories;
DROP POLICY IF EXISTS "Public can view staff for booking" ON public.staff;

CREATE OR REPLACE FUNCTION public.submit_public_booking(
  p_salon_slug TEXT,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_email TEXT,
  p_staff_id UUID,
  p_service_ids UUID[],
  p_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_duration_minutes INTEGER,
  p_idempotency_key TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_salon public.salons%ROWTYPE;
  v_customer public.customers%ROWTYPE;
  v_appointment public.appointments%ROWTYPE;
  v_service_count INTEGER;
  v_expected_duration INTEGER;
  v_total NUMERIC(10,2);
BEGIN
  IF length(trim(coalesce(p_customer_name, ''))) NOT BETWEEN 2 AND 120
     OR length(regexp_replace(coalesce(p_customer_phone, ''), '[^0-9+]', '', 'g')) < 7
     OR p_date < CURRENT_DATE
     OR p_end_time <= p_start_time
     OR p_duration_minutes <= 0
     OR p_duration_minutes > 24 * 60
     OR p_service_ids IS NULL
     OR cardinality(p_service_ids) = 0
     OR length(trim(coalesce(p_idempotency_key, ''))) NOT BETWEEN 16 AND 160 THEN
    RAISE EXCEPTION 'Invalid public booking payload.';
  END IF;

  SELECT * INTO v_salon
  FROM public.salons
  WHERE lower(slug) = lower(trim(p_salon_slug))
    AND status = 'active';
  IF v_salon.id IS NULL THEN RAISE EXCEPTION 'Published salon not found.'; END IF;

  SELECT count(*), coalesce(sum(duration_minutes), 0), coalesce(sum(price_lkr), 0)
  INTO v_service_count, v_expected_duration, v_total
  FROM public.services
  WHERE salon_id = v_salon.id
    AND id = ANY(p_service_ids)
    AND is_active = TRUE
    AND is_online_booking_enabled = TRUE;
  IF v_service_count <> cardinality(p_service_ids) THEN RAISE EXCEPTION 'One or more selected services are unavailable.'; END IF;
  IF p_duration_minutes <> v_expected_duration THEN RAISE EXCEPTION 'Booking duration does not match the selected services.'; END IF;

  IF p_staff_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.staff
    WHERE id = p_staff_id AND salon_id = v_salon.id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Selected staff member is unavailable.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.appointments
    WHERE salon_id = v_salon.id
      AND idempotency_key = trim(p_idempotency_key)
  ) THEN
    SELECT * INTO v_appointment FROM public.appointments
    WHERE salon_id = v_salon.id AND idempotency_key = trim(p_idempotency_key)
    LIMIT 1;
    RETURN jsonb_build_object('success', true, 'duplicate', true, 'appointment_id', v_appointment.id);
  END IF;

  INSERT INTO public.customers (salon_id, name, phone, email)
  VALUES (v_salon.id, trim(p_customer_name), trim(p_customer_phone), nullif(trim(coalesce(p_customer_email, '')), ''))
  ON CONFLICT DO NOTHING;

  SELECT * INTO v_customer FROM public.customers
  WHERE salon_id = v_salon.id AND phone = trim(p_customer_phone)
  ORDER BY created_at ASC LIMIT 1;

  INSERT INTO public.appointments (
    salon_id, customer_id, customer_name, customer_phone, customer_email,
    staff_id, staff_name, service_names, date, start_time, end_time,
    duration_minutes, total_price_lkr, status, payment_status, booking_source,
    notes, idempotency_key
  )
  SELECT
    v_salon.id, v_customer.id, trim(p_customer_name), trim(p_customer_phone),
    nullif(trim(coalesce(p_customer_email, '')), ''), p_staff_id,
    coalesce((SELECT name FROM public.staff WHERE id = p_staff_id), 'Any available stylist'),
    ARRAY(SELECT name FROM public.services WHERE id = ANY(p_service_ids) ORDER BY array_position(p_service_ids, id)),
    p_date, p_start_time, p_end_time, p_duration_minutes, v_total,
    'pending', 'unpaid', 'online_portal', nullif(trim(coalesce(p_notes, '')), ''), trim(p_idempotency_key)
  RETURNING * INTO v_appointment;

  RETURN jsonb_build_object(
    'success', true,
    'duplicate', false,
    'appointment_id', v_appointment.id,
    'customer_id', v_customer.id,
    'total_price_lkr', v_total
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_public_booking(TEXT, TEXT, TEXT, TEXT, UUID, UUID[], DATE, TIME, TIME, INTEGER, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_booking(TEXT, TEXT, TEXT, TEXT, UUID, UUID[], DATE, TIME, TIME, INTEGER, TEXT, TEXT) TO anon, authenticated;

-- These RPCs are the only public write boundary for bookings. Public reads are
-- limited to active salons and bookable rows belonging to that salon by the
-- existing application/API lookup; private tenant tables remain RLS-protected.
COMMENT ON FUNCTION public.submit_public_booking(TEXT, TEXT, TEXT, TEXT, UUID, UUID[], DATE, TIME, TIME, INTEGER, TEXT, TEXT)
IS 'Validated public booking boundary. Rechecks active salon, services, staff, price, duration, idempotency, and relies on the appointment overlap trigger.';

-- Prevent forged audit rows from anonymous clients. Server-side SECURITY DEFINER
-- functions and authenticated member paths must supply the actor identity.
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can create own audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    actor_email = coalesce(auth.jwt() ->> 'email', '')
    AND (salon_id IS NULL OR public.is_salon_member(salon_id) OR public.is_super_admin())
  );

-- Public service reads must only expose bookable services for active salons.
DROP POLICY IF EXISTS "Public can view active salon services" ON public.services;
CREATE POLICY "Public can view bookable services for active salons"
  ON public.services FOR SELECT
  TO anon, authenticated
  USING (
    is_active = TRUE
    AND is_online_booking_enabled = TRUE
    AND EXISTS (SELECT 1 FROM public.salons s WHERE s.id = salon_id AND s.status = 'active')
  );

-- Trial extension is constrained to a bounded, positive value at the database boundary.
CREATE OR REPLACE FUNCTION public.extend_salon_trial(
  p_salon_id UUID,
  p_additional_days INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_end DATE;
  v_new_end DATE;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Access denied.'; END IF;
  IF p_additional_days NOT BETWEEN 1 AND 365 THEN RAISE EXCEPTION 'Additional trial days must be between 1 and 365.'; END IF;
  SELECT COALESCE(trial_ends_at, CURRENT_DATE) INTO v_current_end FROM public.salon_subscriptions WHERE salon_id = p_salon_id;
  IF v_current_end IS NULL THEN RAISE EXCEPTION 'Subscription not found.'; END IF;
  IF v_current_end < CURRENT_DATE THEN v_current_end := CURRENT_DATE; END IF;
  v_new_end := v_current_end + p_additional_days;
  UPDATE public.salon_subscriptions SET status = 'trial', trial_ends_at = v_new_end, updated_at = NOW() WHERE salon_id = p_salon_id;
  INSERT INTO public.audit_logs (salon_id, actor_email, actor_role, action, entity, entity_id, details)
  VALUES (p_salon_id, coalesce(auth.jwt() ->> 'email', auth.uid()::text), 'superadmin', 'EXTEND_TRIAL', 'subscription', p_salon_id::text, format('Extended trial by %s days until %s', p_additional_days, v_new_end));
  RETURN jsonb_build_object('success', true, 'trial_ends_at', v_new_end);
END;
$$;

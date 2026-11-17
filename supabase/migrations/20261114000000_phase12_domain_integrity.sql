-- Phase 12 domain integrity extensions.
-- Additive only. This file is source for review/deployment; it is not run by the
-- application and must be applied through the project's normal migration process.

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS assigned_staff_ids UUID[] NOT NULL DEFAULT '{}'::UUID[];

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS service_ids UUID[] NOT NULL DEFAULT '{}'::UUID[];

CREATE INDEX IF NOT EXISTS idx_services_salon_assigned_staff_ids
  ON public.services USING GIN (assigned_staff_ids);

CREATE INDEX IF NOT EXISTS idx_appointments_salon_service_ids
  ON public.appointments USING GIN (service_ids);

CREATE OR REPLACE FUNCTION public.validate_service_domain_links()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.category_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.service_categories c
    WHERE c.id = NEW.category_id AND c.salon_id = NEW.salon_id
  ) THEN
    RAISE EXCEPTION 'SERVICE_CATEGORY_TENANT_MISMATCH: category must belong to the same salon';
  END IF;

  IF EXISTS (
    SELECT 1 FROM unnest(coalesce(NEW.assigned_staff_ids, '{}'::UUID[])) AS selected(id)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.id = selected.id AND s.salon_id = NEW.salon_id
    )
  ) THEN
    RAISE EXCEPTION 'SERVICE_STAFF_TENANT_MISMATCH: assigned staff must belong to the same salon';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_service_domain_links ON public.services;
CREATE TRIGGER trg_validate_service_domain_links
  BEFORE INSERT OR UPDATE OF salon_id, category_id, assigned_staff_ids
  ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.validate_service_domain_links();

CREATE OR REPLACE FUNCTION public.validate_appointment_domain_links()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_weekday TEXT;
  v_salon_hours JSONB;
  v_staff_hours JSONB;
  v_open TIME;
  v_close TIME;
  v_break_start TIME;
  v_break_end TIME;
BEGIN
  IF NEW.customer_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = NEW.customer_id AND c.salon_id = NEW.salon_id
  ) THEN
    RAISE EXCEPTION 'APPOINTMENT_CUSTOMER_TENANT_MISMATCH: customer must belong to the same salon';
  END IF;

  IF NEW.staff_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.id = NEW.staff_id AND s.salon_id = NEW.salon_id
  ) THEN
    RAISE EXCEPTION 'APPOINTMENT_STAFF_TENANT_MISMATCH: staff must belong to the same salon';
  END IF;

  IF EXISTS (
    SELECT 1 FROM unnest(coalesce(NEW.service_ids, '{}'::UUID[])) AS selected(id)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = selected.id AND s.salon_id = NEW.salon_id
    )
  ) THEN
    RAISE EXCEPTION 'APPOINTMENT_SERVICE_TENANT_MISMATCH: services must belong to the same salon';
  END IF;

  IF NEW.staff_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM unnest(coalesce(NEW.service_ids, '{}'::UUID[])) AS selected(id)
    JOIN public.services s ON s.id = selected.id AND s.salon_id = NEW.salon_id
    WHERE cardinality(s.assigned_staff_ids) > 0
      AND NOT (NEW.staff_id = ANY(s.assigned_staff_ids))
  ) THEN
    RAISE EXCEPTION 'APPOINTMENT_STAFF_NOT_QUALIFIED: stylist must be assigned to every selected service';
  END IF;

  v_weekday := lower(trim(to_char(NEW.date, 'FMDay')));
  SELECT opening_hours -> v_weekday INTO v_salon_hours
  FROM public.salons WHERE id = NEW.salon_id;
  IF v_salon_hours IS NOT NULL AND jsonb_typeof(v_salon_hours) = 'object' THEN
    IF coalesce(nullif(v_salon_hours ->> 'isOpen', '')::BOOLEAN, TRUE) = FALSE THEN
      RAISE EXCEPTION 'APPOINTMENT_SALON_CLOSED: salon is closed on the requested date';
    END IF;
    v_open := nullif(v_salon_hours ->> 'open', '')::TIME;
    v_close := nullif(v_salon_hours ->> 'close', '')::TIME;
    IF (v_open IS NOT NULL AND NEW.start_time < v_open)
       OR (v_close IS NOT NULL AND NEW.end_time > v_close) THEN
      RAISE EXCEPTION 'APPOINTMENT_OUTSIDE_SALON_HOURS: appointment is outside salon hours';
    END IF;
  END IF;

  IF NEW.staff_id IS NOT NULL THEN
    SELECT working_hours -> v_weekday INTO v_staff_hours
    FROM public.staff WHERE id = NEW.staff_id AND salon_id = NEW.salon_id;
    IF v_staff_hours IS NOT NULL AND jsonb_typeof(v_staff_hours) = 'object' THEN
      IF coalesce(nullif(v_staff_hours ->> 'isWorking', '')::BOOLEAN, TRUE) = FALSE THEN
        RAISE EXCEPTION 'APPOINTMENT_STAFF_OFF: stylist is not scheduled to work on the requested date';
      END IF;
      v_open := nullif(v_staff_hours ->> 'start', '')::TIME;
      v_close := nullif(v_staff_hours ->> 'end', '')::TIME;
      v_break_start := nullif(v_staff_hours ->> 'breakStart', '')::TIME;
      v_break_end := nullif(v_staff_hours ->> 'breakEnd', '')::TIME;
      IF (v_open IS NOT NULL AND NEW.start_time < v_open)
         OR (v_close IS NOT NULL AND NEW.end_time > v_close) THEN
        RAISE EXCEPTION 'APPOINTMENT_OUTSIDE_STAFF_HOURS: appointment is outside stylist hours';
      END IF;
      IF v_break_start IS NOT NULL AND v_break_end IS NOT NULL
         AND NEW.start_time < v_break_end AND NEW.end_time > v_break_start THEN
        RAISE EXCEPTION 'APPOINTMENT_DURING_STAFF_BREAK: appointment overlaps stylist break time';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_appointment_domain_links ON public.appointments;
CREATE TRIGGER trg_validate_appointment_domain_links
  BEFORE INSERT OR UPDATE OF salon_id, customer_id, staff_id, service_ids, date, start_time, end_time
  ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.validate_appointment_domain_links();

CREATE OR REPLACE FUNCTION public.enforce_appointment_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowed_next TEXT[];
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('pending', 'confirmed') THEN
      RAISE EXCEPTION 'INVALID_APPOINTMENT_INITIAL_STATUS: appointment must start pending or confirmed';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;

  allowed_next := CASE OLD.status
    WHEN 'pending' THEN ARRAY['confirmed', 'cancelled', 'no_show']
    WHEN 'confirmed' THEN ARRAY['checked_in', 'cancelled', 'no_show']
    WHEN 'checked_in' THEN ARRAY['in_progress', 'cancelled']
    WHEN 'in_progress' THEN ARRAY['completed', 'cancelled']
    ELSE ARRAY[]::TEXT[]
  END;

  IF NOT (NEW.status = ANY(allowed_next)) THEN
    RAISE EXCEPTION 'INVALID_APPOINTMENT_STATUS_TRANSITION: % cannot transition to %', OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_appointment_status_transition ON public.appointments;
CREATE TRIGGER trg_enforce_appointment_status_transition
  BEFORE INSERT OR UPDATE OF status ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_appointment_status_transition();

-- Preserve the existing SECURITY DEFINER booking boundary while making the
-- server the authority for service assignment, price, duration, slot selection,
-- idempotency and persisted service IDs. A null requested staff ID means "any";
-- the function locks candidates and selects the first qualified, conflict-free
-- stylist, rather than trusting a browser cache.
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
  v_candidate RECORD;
  v_staff_id UUID := p_staff_id;
  v_staff_name TEXT;
  v_weekday TEXT;
  v_staff_hours JSONB;
  v_staff_open TIME;
  v_staff_close TIME;
  v_staff_break_start TIME;
  v_staff_break_end TIME;
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
  v_weekday := lower(trim(to_char(p_date, 'FMDay')));

  -- Serialize matching idempotency keys so simultaneous retries cannot create
  -- duplicate customer/appointment rows.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_salon.id::text || ':booking:' || trim(p_idempotency_key), 0));
  SELECT * INTO v_appointment FROM public.appointments
  WHERE salon_id = v_salon.id AND idempotency_key = trim(p_idempotency_key)
  LIMIT 1;
  IF v_appointment.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'duplicate', true,
      'appointment_id', v_appointment.id,
      'customer_id', v_appointment.customer_id,
      'staff_id', v_appointment.staff_id,
      'staff_name', v_appointment.staff_name,
      'total_price_lkr', v_appointment.total_price_lkr,
      'status', v_appointment.status
    );
  END IF;

  SELECT count(*), coalesce(sum(duration_minutes), 0), coalesce(sum(price_lkr), 0)
  INTO v_service_count, v_expected_duration, v_total
  FROM public.services
  WHERE salon_id = v_salon.id
    AND id = ANY(p_service_ids)
    AND is_active = TRUE
    AND is_online_booking_enabled = TRUE;
  IF v_service_count <> cardinality(p_service_ids) THEN RAISE EXCEPTION 'One or more selected services are unavailable.'; END IF;
  IF p_duration_minutes <> v_expected_duration
     OR p_end_time <> (p_start_time + make_interval(mins => v_expected_duration))::TIME THEN
    RAISE EXCEPTION 'Booking duration does not match the selected services.';
  END IF;

  IF v_staff_id IS NOT NULL THEN
    SELECT name INTO v_staff_name FROM public.staff
    WHERE id = v_staff_id AND salon_id = v_salon.id AND status = 'active';
    IF v_staff_name IS NULL THEN RAISE EXCEPTION 'Selected staff member is unavailable.'; END IF;
    IF EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.salon_id = v_salon.id
        AND s.id = ANY(p_service_ids)
        AND cardinality(s.assigned_staff_ids) > 0
        AND NOT (v_staff_id = ANY(s.assigned_staff_ids))
    ) THEN
      RAISE EXCEPTION 'Selected staff member is not qualified for every selected service.';
    END IF;
  ELSE
    FOR v_candidate IN
      SELECT id, name, working_hours FROM public.staff
      WHERE salon_id = v_salon.id AND status = 'active'
      ORDER BY id
    LOOP
      IF EXISTS (
        SELECT 1 FROM public.services s
        WHERE s.salon_id = v_salon.id
          AND s.id = ANY(p_service_ids)
          AND cardinality(s.assigned_staff_ids) > 0
          AND NOT (v_candidate.id = ANY(s.assigned_staff_ids))
      ) THEN
        CONTINUE;
      END IF;

      v_staff_hours := v_candidate.working_hours -> v_weekday;
      IF v_staff_hours IS NOT NULL AND jsonb_typeof(v_staff_hours) = 'object' THEN
        IF coalesce(nullif(v_staff_hours ->> 'isWorking', '')::BOOLEAN, TRUE) = FALSE THEN
          CONTINUE;
        END IF;
        v_staff_open := nullif(v_staff_hours ->> 'start', '')::TIME;
        v_staff_close := nullif(v_staff_hours ->> 'end', '')::TIME;
        v_staff_break_start := nullif(v_staff_hours ->> 'breakStart', '')::TIME;
        v_staff_break_end := nullif(v_staff_hours ->> 'breakEnd', '')::TIME;
        IF (v_staff_open IS NOT NULL AND p_start_time < v_staff_open)
           OR (v_staff_close IS NOT NULL AND p_end_time > v_staff_close)
           OR (v_staff_break_start IS NOT NULL AND v_staff_break_end IS NOT NULL
               AND p_start_time < v_staff_break_end AND p_end_time > v_staff_break_start) THEN
          CONTINUE;
        END IF;
      END IF;

      PERFORM pg_advisory_xact_lock(hashtextextended(v_salon.id::text || ':' || v_candidate.id::text || ':' || p_date::text, 0));
      IF NOT EXISTS (
        SELECT 1 FROM public.appointments a
        WHERE a.salon_id = v_salon.id
          AND a.staff_id = v_candidate.id
          AND a.date = p_date
          AND a.status NOT IN ('cancelled', 'no_show')
          AND p_start_time < a.end_time
          AND p_end_time > a.start_time
      ) THEN
        v_staff_id := v_candidate.id;
        v_staff_name := v_candidate.name;
        EXIT;
      END IF;
    END LOOP;

    IF v_staff_id IS NULL THEN RAISE EXCEPTION 'No qualified stylist is available for this slot.'; END IF;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_salon.id::text || ':customer:' || trim(p_customer_phone), 0));
  SELECT * INTO v_customer FROM public.customers
  WHERE salon_id = v_salon.id AND phone = trim(p_customer_phone)
  ORDER BY created_at ASC LIMIT 1;
  IF v_customer.id IS NULL THEN
    INSERT INTO public.customers (salon_id, name, phone, email)
    VALUES (v_salon.id, trim(p_customer_name), trim(p_customer_phone), nullif(trim(coalesce(p_customer_email, '')), ''))
    RETURNING * INTO v_customer;
  END IF;
  IF v_customer.id IS NULL THEN RAISE EXCEPTION 'Customer could not be created for this booking.'; END IF;

  INSERT INTO public.appointments (
    salon_id, customer_id, customer_name, customer_phone, customer_email,
    staff_id, staff_name, service_ids, service_names, date, start_time, end_time,
    duration_minutes, total_price_lkr, status, payment_status, booking_source,
    notes, idempotency_key
  )
  SELECT
    v_salon.id, v_customer.id, trim(p_customer_name), trim(p_customer_phone),
    nullif(trim(coalesce(p_customer_email, '')), ''), v_staff_id,
    coalesce(v_staff_name, 'Any available stylist'), p_service_ids,
    ARRAY(SELECT name FROM public.services WHERE id = ANY(p_service_ids) ORDER BY array_position(p_service_ids, id)),
    p_date, p_start_time, p_end_time, p_duration_minutes, v_total,
    'pending', 'unpaid', 'online_portal', nullif(trim(coalesce(p_notes, '')), ''), trim(p_idempotency_key)
  RETURNING * INTO v_appointment;

  RETURN jsonb_build_object(
    'success', true,
    'duplicate', false,
    'appointment_id', v_appointment.id,
    'customer_id', v_customer.id,
    'staff_id', v_appointment.staff_id,
    'staff_name', v_appointment.staff_name,
    'total_price_lkr', v_total,
    'status', v_appointment.status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_public_booking(TEXT, TEXT, TEXT, TEXT, UUID, UUID[], DATE, TIME, TIME, INTEGER, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_booking(TEXT, TEXT, TEXT, TEXT, UUID, UUID[], DATE, TIME, TIME, INTEGER, TEXT, TEXT) TO anon, authenticated;

COMMENT ON FUNCTION public.submit_public_booking(TEXT, TEXT, TEXT, TEXT, UUID, UUID[], DATE, TIME, TIME, INTEGER, TEXT, TEXT)
IS 'Validated public booking boundary. Enforces salon/service/staff qualification, server price/duration, idempotency, automatic qualified-stylist selection, persistent service IDs, and database overlap protection.';

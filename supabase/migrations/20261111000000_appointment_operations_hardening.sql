-- Moonbox Salon appointment operations hardening.
-- Additive only: this migration does not delete or rewrite existing records.

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS check_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS check_out_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS internal_notes TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE INDEX IF NOT EXISTS idx_appointments_salon_status_date
  ON public.appointments (salon_id, status, date, start_time);

CREATE UNIQUE INDEX IF NOT EXISTS uq_appointments_salon_idempotency
  ON public.appointments (salon_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.appointment_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL CHECK (to_status IN ('pending','confirmed','checked_in','in_progress','completed','cancelled','no_show')),
  reason TEXT,
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointment_status_history_appointment
  ON public.appointment_status_history (salon_id, appointment_id, created_at DESC);

ALTER TABLE public.appointment_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Salon members can view appointment status history" ON public.appointment_status_history;
CREATE POLICY "Salon members can view appointment status history"
  ON public.appointment_status_history FOR SELECT
  USING (public.is_salon_member(salon_id));

DROP POLICY IF EXISTS "Salon members can create appointment status history" ON public.appointment_status_history;
CREATE POLICY "Salon members can create appointment status history"
  ON public.appointment_status_history FOR INSERT
  WITH CHECK (public.is_salon_member(salon_id));

-- A transaction-scoped advisory lock makes overlapping writes deterministic for a
-- given salon/staff/date. The client-side availability check remains only a UX aid.
CREATE OR REPLACE FUNCTION public.prevent_appointment_staff_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conflict_id UUID;
BEGIN
  IF NEW.status IN ('cancelled', 'no_show') THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.salon_id::text || ':' || NEW.staff_id::text || ':' || NEW.date::text, 0));

  SELECT a.id INTO conflict_id
  FROM public.appointments a
  WHERE a.salon_id = NEW.salon_id
    AND a.staff_id = NEW.staff_id
    AND a.date = NEW.date
    AND a.id <> NEW.id
    AND a.status NOT IN ('cancelled', 'no_show')
    AND NEW.start_time < a.end_time
    AND NEW.end_time > a.start_time
  LIMIT 1;

  IF conflict_id IS NOT NULL THEN
    RAISE EXCEPTION 'APPOINTMENT_STAFF_OVERLAP: staff member already has an overlapping appointment';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_appointment_staff_overlap ON public.appointments;
CREATE TRIGGER trg_prevent_appointment_staff_overlap
  BEFORE INSERT OR UPDATE OF salon_id, staff_id, date, start_time, end_time, status
  ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.prevent_appointment_staff_overlap();

CREATE OR REPLACE FUNCTION public.record_appointment_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.appointment_status_history (salon_id, appointment_id, from_status, to_status)
    VALUES (NEW.salon_id, NEW.id, CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END, NEW.status);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_record_appointment_status_change ON public.appointments;
CREATE TRIGGER trg_record_appointment_status_change
  AFTER INSERT OR UPDATE OF status ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.record_appointment_status_change();

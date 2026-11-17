-- ==============================================================================
-- MOONBOX SALON SAAS — MIGRATION: ADMINISTRATOR-CONTROLLED TRIALS & PLATFORM MFA
-- Enforces explicit trial grants, pending salon status, and MFA verification
-- ==============================================================================

-- 1. Ensure salons table has 'pending_approval' status and defaults to it
ALTER TABLE public.salons 
  DROP CONSTRAINT IF EXISTS salons_status_check;

ALTER TABLE public.salons 
  ADD CONSTRAINT salons_status_check 
  CHECK (status IN ('pending_approval', 'active', 'suspended', 'archived'));

ALTER TABLE public.salons 
  ALTER COLUMN status SET DEFAULT 'pending_approval';

-- 2. Ensure salon_subscriptions table has 'pending' status and defaults to it
ALTER TABLE public.salon_subscriptions 
  DROP CONSTRAINT IF EXISTS salon_subscriptions_status_check;

ALTER TABLE public.salon_subscriptions 
  ADD CONSTRAINT salon_subscriptions_status_check 
  CHECK (status IN ('pending', 'trial', 'active', 'past_due', 'expired', 'suspended', 'cancelled'));

ALTER TABLE public.salon_subscriptions 
  ALTER COLUMN status SET DEFAULT 'pending';

-- 3. Super Admin Stored Procedure: Grant Free Trial explicitly (7, 14, or 30 days)
CREATE OR REPLACE FUNCTION public.grant_salon_trial(
  p_salon_id UUID,
  p_duration_days INTEGER,
  p_plan_id TEXT DEFAULT 'plan_growth'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trial_end DATE;
  v_end_date DATE;
  v_salon_name TEXT;
BEGIN
  -- Strict security: Only platform super admin can execute
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Access Denied: Only verified platform administrators can grant salon trials.';
  END IF;

  -- Validate allowed durations
  IF p_duration_days NOT IN (7, 14, 30) THEN
    RAISE EXCEPTION 'Invalid trial duration. Allowed durations are 7, 14, or 30 days.';
  END IF;

  SELECT name INTO v_salon_name FROM public.salons WHERE id = p_salon_id;
  IF v_salon_name IS NULL THEN
    RAISE EXCEPTION 'Salon with ID % not found.', p_salon_id;
  END IF;

  v_trial_end := CURRENT_DATE + (p_duration_days || ' days')::INTERVAL;
  v_end_date := v_trial_end + INTERVAL '30 days';

  -- Update salon status to active
  UPDATE public.salons 
  SET status = 'active', updated_at = NOW()
  WHERE id = p_salon_id;

  -- Upsert subscription to trial status
  INSERT INTO public.salon_subscriptions (
    salon_id, plan_id, status, billing_cycle, start_date, end_date, trial_ends_at, auto_renew
  ) VALUES (
    p_salon_id, p_plan_id, 'trial', 'monthly', CURRENT_DATE, v_end_date, v_trial_end, false
  )
  ON CONFLICT (salon_id) DO UPDATE SET
    plan_id = EXCLUDED.plan_id,
    status = 'trial',
    start_date = CURRENT_DATE,
    end_date = EXCLUDED.end_date,
    trial_ends_at = EXCLUDED.trial_ends_at,
    updated_at = NOW();

  -- Record audit log
  INSERT INTO public.audit_logs (
    salon_id, actor_email, actor_role, action, entity, entity_id, details
  ) VALUES (
    p_salon_id,
    auth.jwt() ->> 'email',
    'superadmin',
    'GRANT_TRIAL',
    'subscription',
    p_salon_id::TEXT,
    format('Granted %s-day free trial on plan %s until %s', p_duration_days, p_plan_id, v_trial_end)
  );

  RETURN jsonb_build_object(
    'success', true,
    'salon_id', p_salon_id,
    'trial_ends_at', v_trial_end,
    'duration_days', p_duration_days
  );
END;
$$;

-- 4. Super Admin Stored Procedure: Revoke Free Trial
-- Preserves all salon operational data intact while setting subscription to expired
CREATE OR REPLACE FUNCTION public.revoke_salon_trial(
  p_salon_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Access Denied: Only verified platform administrators can revoke salon trials.';
  END IF;

  UPDATE public.salon_subscriptions
  SET status = 'expired', trial_ends_at = CURRENT_DATE, updated_at = NOW()
  WHERE salon_id = p_salon_id;

  INSERT INTO public.audit_logs (
    salon_id, actor_email, actor_role, action, entity, entity_id, details
  ) VALUES (
    p_salon_id,
    auth.jwt() ->> 'email',
    'superadmin',
    'REVOKE_TRIAL',
    'subscription',
    p_salon_id::TEXT,
    'Revoked free trial. All customer, appointment, and invoice data preserved.'
  );

  RETURN jsonb_build_object('success', true, 'salon_id', p_salon_id);
END;
$$;

-- 5. Super Admin Stored Procedure: Extend Free Trial
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
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Access Denied: Only verified platform administrators can extend salon trials.';
  END IF;

  SELECT COALESCE(trial_ends_at, CURRENT_DATE) INTO v_current_end 
  FROM public.salon_subscriptions 
  WHERE salon_id = p_salon_id;

  IF v_current_end < CURRENT_DATE THEN
    v_current_end := CURRENT_DATE;
  END IF;

  v_new_end := v_current_end + (p_additional_days || ' days')::INTERVAL;

  UPDATE public.salon_subscriptions
  SET status = 'trial', trial_ends_at = v_new_end, updated_at = NOW()
  WHERE salon_id = p_salon_id;

  INSERT INTO public.audit_logs (
    salon_id, actor_email, actor_role, action, entity, entity_id, details
  ) VALUES (
    p_salon_id,
    auth.jwt() ->> 'email',
    'superadmin',
    'EXTEND_TRIAL',
    'subscription',
    p_salon_id::TEXT,
    format('Extended trial by %s days until %s', p_additional_days, v_new_end)
  );

  RETURN jsonb_build_object('success', true, 'trial_ends_at', v_new_end);
END;
$$;

-- 6. Super Admin Stored Procedure: Assign Package / Activate Subscription
CREATE OR REPLACE FUNCTION public.assign_salon_package(
  p_salon_id UUID,
  p_plan_id TEXT,
  p_billing_cycle TEXT DEFAULT 'monthly'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_end_date DATE;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Access Denied: Only verified platform administrators can assign packages.';
  END IF;

  IF p_billing_cycle = 'yearly' THEN
    v_end_date := CURRENT_DATE + INTERVAL '1 year';
  ELSE
    v_end_date := CURRENT_DATE + INTERVAL '1 month';
  END IF;

  UPDATE public.salons
  SET status = 'active', updated_at = NOW()
  WHERE id = p_salon_id;

  UPDATE public.salon_subscriptions
  SET plan_id = p_plan_id,
      status = 'active',
      billing_cycle = p_billing_cycle,
      start_date = CURRENT_DATE,
      end_date = v_end_date,
      auto_renew = true,
      updated_at = NOW()
  WHERE salon_id = p_salon_id;

  INSERT INTO public.audit_logs (
    salon_id, actor_email, actor_role, action, entity, entity_id, details
  ) VALUES (
    p_salon_id,
    auth.jwt() ->> 'email',
    'superadmin',
    'ASSIGN_PACKAGE',
    'subscription',
    p_salon_id::TEXT,
    format('Activated %s subscription on plan %s until %s', p_billing_cycle, p_plan_id, v_end_date)
  );

  RETURN jsonb_build_object('success', true, 'end_date', v_end_date);
END;
$$;

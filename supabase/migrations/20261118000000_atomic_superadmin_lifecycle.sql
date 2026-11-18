-- Moonbox Salon: one-transaction Super Admin lifecycle operations.
-- This additive migration does not modify or delete existing records.
BEGIN;

CREATE OR REPLACE FUNCTION public.execute_superadmin_lifecycle(
  p_action TEXT,
  p_salon_id UUID,
  p_duration_days INTEGER DEFAULT NULL,
  p_additional_days INTEGER DEFAULT NULL,
  p_plan_id TEXT DEFAULT NULL,
  p_billing_cycle TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_now TIMESTAMP WITH TIME ZONE := now();
  v_today DATE := CURRENT_DATE;
  v_trial_end DATE;
  v_end_date DATE;
  v_current_trial_end DATE;
  v_plan_id TEXT;
  v_billing_cycle TEXT;
BEGIN
  IF NOT public.is_super_admin()
     OR coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2' THEN
    RAISE EXCEPTION 'Verified Super Admin MFA (AAL2) is required.';
  END IF;

  IF p_salon_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.salons WHERE id = p_salon_id
  ) THEN
    RAISE EXCEPTION 'Salon not found.';
  END IF;

  IF p_action = 'grant_trial' THEN
    IF p_duration_days IS NULL OR p_duration_days NOT IN (7, 14, 30) THEN
      RAISE EXCEPTION 'durationDays must be 7, 14, or 30.';
    END IF;
    v_plan_id := coalesce(nullif(trim(p_plan_id), ''), 'plan_growth');
    IF NOT EXISTS (
      SELECT 1 FROM public.subscription_plans
      WHERE id = v_plan_id AND is_active
    ) THEN
      RAISE EXCEPTION 'The requested plan is not active.';
    END IF;
    v_trial_end := v_today + p_duration_days;
    v_end_date := v_trial_end + 30;

    UPDATE public.salons
    SET status = 'active', updated_at = v_now
    WHERE id = p_salon_id;

    INSERT INTO public.salon_subscriptions (
      salon_id, plan_id, status, billing_cycle, start_date,
      end_date, trial_ends_at, auto_renew, created_at, updated_at
    ) VALUES (
      p_salon_id, v_plan_id, 'trial', 'monthly', v_today,
      v_end_date, v_trial_end, FALSE, v_now, v_now
    )
    ON CONFLICT (salon_id) DO UPDATE SET
      plan_id = EXCLUDED.plan_id,
      status = EXCLUDED.status,
      billing_cycle = EXCLUDED.billing_cycle,
      start_date = EXCLUDED.start_date,
      end_date = EXCLUDED.end_date,
      trial_ends_at = EXCLUDED.trial_ends_at,
      auto_renew = EXCLUDED.auto_renew,
      updated_at = EXCLUDED.updated_at;

    INSERT INTO public.audit_logs (
      salon_id, actor_email, actor_role, action, entity, entity_id, details
    ) VALUES (
      p_salon_id, coalesce(auth.jwt() ->> 'email', auth.uid()::TEXT),
      'superadmin', 'GRANT_TRIAL', 'subscription', p_salon_id::TEXT,
      format('Granted %s-day trial until %s', p_duration_days, v_trial_end)
    );
    RETURN jsonb_build_object(
      'success', TRUE, 'action', p_action, 'salon_id', p_salon_id,
      'status', 'trial', 'trial_ends_at', v_trial_end
    );

  ELSIF p_action = 'revoke_trial' THEN
    UPDATE public.salon_subscriptions
    SET status = 'expired', trial_ends_at = v_today, updated_at = v_now
    WHERE salon_id = p_salon_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Salon subscription was not found.'; END IF;

    INSERT INTO public.audit_logs (
      salon_id, actor_email, actor_role, action, entity, entity_id, details
    ) VALUES (
      p_salon_id, coalesce(auth.jwt() ->> 'email', auth.uid()::TEXT),
      'superadmin', 'REVOKE_TRIAL', 'subscription', p_salon_id::TEXT,
      'Trial revoked. Salon operational data preserved.'
    );
    RETURN jsonb_build_object(
      'success', TRUE, 'action', p_action, 'salon_id', p_salon_id,
      'status', 'expired'
    );

  ELSIF p_action = 'extend_trial' THEN
    IF p_additional_days IS NULL
       OR p_additional_days < 1
       OR p_additional_days > 365 THEN
      RAISE EXCEPTION 'additionalDays must be an integer from 1 to 365.';
    END IF;
    SELECT trial_ends_at
    INTO v_current_trial_end
    FROM public.salon_subscriptions
    WHERE salon_id = p_salon_id
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Salon subscription was not found.'; END IF;
    v_trial_end := greatest(coalesce(v_current_trial_end, v_today), v_today)
                    + p_additional_days;

    UPDATE public.salon_subscriptions
    SET status = 'trial', trial_ends_at = v_trial_end, updated_at = v_now
    WHERE salon_id = p_salon_id;

    INSERT INTO public.audit_logs (
      salon_id, actor_email, actor_role, action, entity, entity_id, details
    ) VALUES (
      p_salon_id, coalesce(auth.jwt() ->> 'email', auth.uid()::TEXT),
      'superadmin', 'EXTEND_TRIAL', 'subscription', p_salon_id::TEXT,
      format('Extended trial by %s days until %s', p_additional_days, v_trial_end)
    );
    RETURN jsonb_build_object(
      'success', TRUE, 'action', p_action, 'salon_id', p_salon_id,
      'status', 'trial', 'trial_ends_at', v_trial_end
    );

  ELSIF p_action = 'assign_package' THEN
    v_plan_id := nullif(trim(coalesce(p_plan_id, '')), '');
    IF v_plan_id IS NULL OR length(v_plan_id) > 80 THEN
      RAISE EXCEPTION 'A valid planId is required.';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.subscription_plans
      WHERE id = v_plan_id AND is_active
    ) THEN
      RAISE EXCEPTION 'The requested plan is not active.';
    END IF;
    v_billing_cycle := CASE WHEN p_billing_cycle = 'yearly' THEN 'yearly' ELSE 'monthly' END;
    v_end_date := CASE
      WHEN v_billing_cycle = 'yearly' THEN (v_today + INTERVAL '1 year')::DATE
      ELSE (v_today + INTERVAL '1 month')::DATE
    END;

    UPDATE public.salons
    SET status = 'active', updated_at = v_now
    WHERE id = p_salon_id;

    INSERT INTO public.salon_subscriptions (
      salon_id, plan_id, status, billing_cycle, start_date,
      end_date, trial_ends_at, auto_renew, created_at, updated_at
    ) VALUES (
      p_salon_id, v_plan_id, 'active', v_billing_cycle, v_today,
      v_end_date, NULL, TRUE, v_now, v_now
    )
    ON CONFLICT (salon_id) DO UPDATE SET
      plan_id = EXCLUDED.plan_id,
      status = EXCLUDED.status,
      billing_cycle = EXCLUDED.billing_cycle,
      start_date = EXCLUDED.start_date,
      end_date = EXCLUDED.end_date,
      trial_ends_at = EXCLUDED.trial_ends_at,
      auto_renew = EXCLUDED.auto_renew,
      updated_at = EXCLUDED.updated_at;

    INSERT INTO public.audit_logs (
      salon_id, actor_email, actor_role, action, entity, entity_id, details
    ) VALUES (
      p_salon_id, coalesce(auth.jwt() ->> 'email', auth.uid()::TEXT),
      'superadmin', 'ASSIGN_PACKAGE', 'subscription', p_salon_id::TEXT,
      format('Assigned %s (%s)', v_plan_id, v_billing_cycle)
    );
    RETURN jsonb_build_object(
      'success', TRUE, 'action', p_action, 'salon_id', p_salon_id,
      'status', 'active', 'plan_id', v_plan_id, 'billing_cycle', v_billing_cycle
    );

  ELSIF p_action = 'update_salon_status' THEN
    IF p_status NOT IN ('active', 'suspended') THEN
      RAISE EXCEPTION 'status must be active or suspended.';
    END IF;
    UPDATE public.salons
    SET status = p_status, updated_at = v_now
    WHERE id = p_salon_id;

    INSERT INTO public.audit_logs (
      salon_id, actor_email, actor_role, action, entity, entity_id, details
    ) VALUES (
      p_salon_id, coalesce(auth.jwt() ->> 'email', auth.uid()::TEXT),
      'superadmin', 'UPDATE_SALON_STATUS', 'salon', p_salon_id::TEXT,
      format('Salon status changed to %s', p_status)
    );
    RETURN jsonb_build_object(
      'success', TRUE, 'action', p_action, 'salon_id', p_salon_id,
      'status', p_status
    );
  ELSE
    RAISE EXCEPTION 'Unsupported Super Admin lifecycle action.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.execute_superadmin_lifecycle(
  TEXT, UUID, INTEGER, INTEGER, TEXT, TEXT, TEXT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_superadmin_lifecycle(
  TEXT, UUID, INTEGER, INTEGER, TEXT, TEXT, TEXT
) TO authenticated;

COMMIT;

-- Atomic Auth-to-SaaS registration boundary.
-- Apply after the existing Moonbox migrations; do not run automatically from the client.
CREATE OR REPLACE FUNCTION public.create_salon_for_current_user(
  p_salon_name TEXT,
  p_owner_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_city TEXT,
  p_slug TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_salon_id UUID;
  v_slug TEXT := lower(trim(p_slug));
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authenticated user is required.'; END IF;
  IF length(trim(p_salon_name)) NOT BETWEEN 2 AND 160 OR length(trim(p_owner_name)) NOT BETWEEN 2 AND 120 THEN RAISE EXCEPTION 'Salon and owner names are invalid.'; END IF;
  IF length(v_slug) NOT BETWEEN 3 AND 80 OR v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' THEN RAISE EXCEPTION 'Salon slug is invalid.'; END IF;
  IF EXISTS (SELECT 1 FROM public.salons WHERE slug = v_slug) THEN RAISE EXCEPTION 'Salon slug is already in use.'; END IF;

  INSERT INTO public.profiles (id, email, full_name, phone)
  VALUES (v_user_id, lower(trim(p_email)), trim(p_owner_name), nullif(trim(p_phone), ''))
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, updated_at = NOW();

  INSERT INTO public.salons (name, slug, phone, whatsapp, email, address, city, status)
  VALUES (trim(p_salon_name), v_slug, trim(p_phone), trim(p_phone), lower(trim(p_email)), 'Main Street', coalesce(nullif(trim(p_city), ''), 'Colombo'), 'pending_approval')
  RETURNING id INTO v_salon_id;

  INSERT INTO public.salon_members (user_id, salon_id, role, status)
  VALUES (v_user_id, v_salon_id, 'owner', 'active');

  INSERT INTO public.salon_subscriptions (salon_id, plan_id, status, billing_cycle, start_date, end_date, auto_renew)
  SELECT v_salon_id, id, 'pending', 'monthly', CURRENT_DATE, CURRENT_DATE, false
  FROM public.subscription_plans
  WHERE id = 'plan_growth'
  LIMIT 1;

  INSERT INTO public.audit_logs (salon_id, actor_email, actor_role, action, entity, entity_id, details)
  VALUES (v_salon_id, lower(trim(p_email)), 'owner', 'REGISTER_SALON', 'salon', v_salon_id::text, 'Salon registered and awaits platform approval.');

  RETURN jsonb_build_object('success', true, 'salon_id', v_salon_id);
END;
$$;

REVOKE ALL ON FUNCTION public.create_salon_for_current_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_salon_for_current_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

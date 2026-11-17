-- MOONBOX SALON — PHASE 4 ADDITIVE BUSINESS TRANSACTIONS
-- This migration is intentionally additive. It is not executed against any live project by this task.

-- -----------------------------------------------------------------------------
-- Recipient-specific notifications
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE,
  recipient_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_role TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'system',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_salon ON public.notifications(salon_id, created_at DESC);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_status_check;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_status_check
  CHECK (status IN ('open', 'in_progress', 'waiting_for_customer', 'resolved', 'closed'));

CREATE POLICY "Users can read their own notifications"
  ON public.notifications FOR SELECT
  USING (recipient_user_id = auth.uid() OR public.is_super_admin());
CREATE POLICY "Salon managers can create salon notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (public.is_salon_member(salon_id) OR public.is_super_admin());
CREATE POLICY "Users can mark their own notifications read"
  ON public.notifications FOR UPDATE
  USING (recipient_user_id = auth.uid() OR public.is_super_admin())
  WITH CHECK (recipient_user_id = auth.uid() OR public.is_super_admin());

-- -----------------------------------------------------------------------------
-- Explicit permission matrix. All protected RPCs use this server-side helper.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_salon_permission(p_salon_id UUID, p_permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_super_admin() OR EXISTS (
    SELECT 1
    FROM public.salon_members m
    WHERE m.salon_id = p_salon_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND (
        (p_permission IN ('read', 'book', 'sell', 'support') AND m.role IN ('owner', 'manager', 'receptionist', 'staff')) OR
        (p_permission IN ('manage_services', 'manage_staff', 'manage_inventory', 'manage_finance', 'manage_support') AND m.role IN ('owner', 'manager')) OR
        (p_permission = 'manage_members' AND m.role = 'owner')
      )
  );
$$;
REVOKE ALL ON FUNCTION public.has_salon_permission(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_salon_permission(UUID, TEXT) TO authenticated;

-- -----------------------------------------------------------------------------
-- Atomic inventory movement. Prevents negative stock and preserves history.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_stock_movement_atomic(
  p_salon_id UUID,
  p_product_id UUID,
  p_type TEXT,
  p_quantity_change INTEGER,
  p_reason TEXT,
  p_reference_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_product public.products%ROWTYPE;
  v_balance INTEGER;
  v_movement public.stock_movements%ROWTYPE;
BEGIN
  IF NOT public.has_salon_permission(p_salon_id, 'manage_inventory') THEN
    RAISE EXCEPTION 'Access denied for inventory operation.';
  END IF;
  IF p_quantity_change = 0 OR p_type NOT IN ('purchase', 'sale', 'adjustment', 'damaged', 'return') THEN
    RAISE EXCEPTION 'Invalid stock movement.';
  END IF;

  SELECT * INTO v_product FROM public.products
  WHERE id = p_product_id AND salon_id = p_salon_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found.'; END IF;

  v_balance := v_product.stock_quantity + p_quantity_change;
  IF v_balance < 0 THEN RAISE EXCEPTION 'Insufficient stock.'; END IF;

  UPDATE public.products SET stock_quantity = v_balance WHERE id = p_product_id AND salon_id = p_salon_id;
  INSERT INTO public.stock_movements (salon_id, product_id, product_name, type, quantity_change, balance_after, reason, reference_id)
  VALUES (p_salon_id, p_product_id, v_product.name, p_type, p_quantity_change, v_balance, p_reason, p_reference_id)
  RETURNING * INTO v_movement;

  RETURN jsonb_build_object('product_id', p_product_id, 'balance_after', v_balance, 'movement_id', v_movement.id);
END;
$$;
REVOKE ALL ON FUNCTION public.record_stock_movement_atomic(UUID, UUID, TEXT, INTEGER, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_stock_movement_atomic(UUID, UUID, TEXT, INTEGER, TEXT, TEXT) TO authenticated;

-- -----------------------------------------------------------------------------
-- Trusted payment review. Client cannot activate subscriptions by editing rows.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.review_manual_payment(
  p_payment_id UUID,
  p_action TEXT,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_payment public.manual_payment_requests%ROWTYPE;
  v_end_date DATE;
BEGIN
  IF NOT public.is_super_admin() OR COALESCE((auth.jwt() ->> 'aal'), 'aal1') <> 'aal2' THEN
    RAISE EXCEPTION 'Verified Super Admin MFA (AAL2) is required.';
  END IF;
  IF p_action NOT IN ('approved', 'rejected') THEN RAISE EXCEPTION 'Invalid payment action.'; END IF;
  IF p_action = 'rejected' AND NULLIF(trim(p_rejection_reason), '') IS NULL THEN RAISE EXCEPTION 'A rejection reason is required.'; END IF;

  SELECT * INTO v_payment FROM public.manual_payment_requests WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND OR v_payment.status <> 'pending' THEN RAISE EXCEPTION 'Payment request is not pending.'; END IF;

  UPDATE public.manual_payment_requests
  SET status = p_action, rejection_reason = p_rejection_reason,
      reviewed_by = auth.jwt() ->> 'email', reviewed_at = NOW()
  WHERE id = p_payment_id;

  IF p_action = 'approved' THEN
    v_end_date := CURRENT_DATE + CASE WHEN v_payment.billing_cycle = 'yearly' THEN INTERVAL '1 year' ELSE INTERVAL '1 month' END;
    UPDATE public.salon_subscriptions
    SET plan_id = v_payment.plan_id, status = 'active', billing_cycle = v_payment.billing_cycle,
        start_date = CURRENT_DATE, end_date = v_end_date, trial_ends_at = NULL, auto_renew = true, updated_at = NOW()
    WHERE salon_id = v_payment.salon_id;
  END IF;

  INSERT INTO public.audit_logs (salon_id, actor_email, actor_role, action, entity, entity_id, details)
  VALUES (v_payment.salon_id, auth.jwt() ->> 'email', 'superadmin', upper(p_action) || '_PAYMENT', 'manual_payment', p_payment_id::TEXT, COALESCE(p_rejection_reason, 'Payment review completed.'));
  RETURN jsonb_build_object('success', true, 'status', p_action, 'payment_id', p_payment_id);
END;
$$;
REVOKE ALL ON FUNCTION public.review_manual_payment(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_manual_payment(UUID, TEXT, TEXT) TO authenticated;

-- -----------------------------------------------------------------------------
-- Support ticket message/status mutation and notification creation.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.append_support_ticket_message(
  p_ticket_id UUID,
  p_content TEXT,
  p_sender_name TEXT,
  p_sender_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_ticket public.support_tickets%ROWTYPE;
  v_message JSONB;
BEGIN
  SELECT * INTO v_ticket FROM public.support_tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Support ticket not found.'; END IF;
  IF NOT public.has_salon_permission(v_ticket.salon_id, 'support') AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Access denied for support ticket.';
  END IF;
  v_message := jsonb_build_object('id', gen_random_uuid(), 'senderEmail', auth.jwt() ->> 'email', 'senderName', p_sender_name, 'senderRole', p_sender_role, 'content', p_content, 'createdAt', NOW());
  UPDATE public.support_tickets
  SET messages = COALESCE(messages, '[]'::jsonb) || jsonb_build_array(v_message),
      status = CASE WHEN p_sender_role = 'support' THEN 'waiting_for_customer' ELSE 'in_progress' END,
      updated_at = NOW()
  WHERE id = p_ticket_id;
  RETURN v_message;
END;
$$;
REVOKE ALL ON FUNCTION public.append_support_ticket_message(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.append_support_ticket_message(UUID, TEXT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_salon_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_count INTEGER;
BEGIN
  UPDATE public.notifications SET read_at = COALESCE(read_at, NOW())
  WHERE recipient_user_id = auth.uid() AND (p_salon_id IS NULL OR salon_id = p_salon_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.mark_notifications_read(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read(UUID) TO authenticated;

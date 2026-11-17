-- Moonbox Salon Phase 13 — authoritative POS boundary.
-- Additive replacement of the existing POS RPC; source only until manually
-- reviewed and applied to a disposable staging database.
--
-- The browser may send item IDs, quantities, a discount percentage, a tip,
-- payment method, and receipt notes. It does not choose catalog prices, totals,
-- stock balances, paid amounts, customer ownership, staff names, or commission
-- values. This function derives those from tenant-owned rows in one transaction.

CREATE OR REPLACE FUNCTION public.create_pos_invoice(
  p_salon_id UUID,
  p_invoice JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_invoice_number TEXT := trim(coalesce(p_invoice ->> 'invoiceNumber', ''));
  v_idempotency_lock BIGINT;
  v_existing public.invoices%ROWTYPE;
  v_customer public.customers%ROWTYPE;
  v_service public.services%ROWTYPE;
  v_product public.products%ROWTYPE;
  v_staff_name TEXT;
  v_staff_service_commission NUMERIC(5,2);
  v_staff_product_commission NUMERIC(5,2);
  v_item JSONB;
  v_line JSONB;
  v_line_items JSONB := '[]'::JSONB;
  v_stock RECORD;
  v_invoice_id UUID;
  v_customer_id UUID;
  v_staff_id UUID;
  v_item_id UUID;
  v_quantity INTEGER;
  v_new_stock INTEGER;
  v_price NUMERIC;
  v_line_subtotal NUMERIC;
  v_line_discount NUMERIC;
  v_line_total NUMERIC;
  v_commission_rate NUMERIC(5,2);
  v_commission_amount NUMERIC;
  v_subtotal NUMERIC := 0;
  v_discount_percent NUMERIC;
  v_discount NUMERIC := 0;
  v_tax_percent NUMERIC;
  v_tax NUMERIC := 0;
  v_tip NUMERIC := 0;
  v_total NUMERIC;
  v_payment_method TEXT;
  v_customer_name TEXT;
  v_customer_phone TEXT;
  v_invoice_row JSONB;
BEGIN
  IF v_actor IS NULL OR NOT public.has_salon_permission(p_salon_id, 'sell') THEN
    RAISE EXCEPTION 'Active salon selling permission is required.';
  END IF;
  IF p_invoice IS NULL OR jsonb_typeof(p_invoice) <> 'object' THEN
    RAISE EXCEPTION 'Invalid invoice payload.';
  END IF;
  IF length(v_invoice_number) NOT BETWEEN 1 AND 80 THEN
    RAISE EXCEPTION 'Invoice number is invalid.';
  END IF;
  IF jsonb_typeof(p_invoice -> 'items') IS DISTINCT FROM 'array'
     OR jsonb_array_length(coalesce(p_invoice -> 'items', '[]'::JSONB)) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Invoice must contain between one and one hundred line items.';
  END IF;

  -- Serialize repeated invoice numbers so a retry cannot decrement stock twice.
  v_idempotency_lock := hashtextextended(p_salon_id::TEXT || ':pos:' || v_invoice_number, 0);
  PERFORM pg_advisory_xact_lock(v_idempotency_lock);
  SELECT * INTO v_existing FROM public.invoices
  WHERE salon_id = p_salon_id AND invoice_number = v_invoice_number
  LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'duplicate', true, 'invoice', to_jsonb(v_existing));
  END IF;

  -- Reject malformed IDs/quantities before any catalog lookup or write.
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_invoice -> 'items') LOOP
    IF coalesce(v_item ->> 'type', '') NOT IN ('service', 'product')
       OR coalesce(v_item ->> 'itemId', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       OR coalesce(v_item ->> 'quantity', '') !~ '^[1-9][0-9]{0,3}$' THEN
      RAISE EXCEPTION 'Invoice contains an invalid item type, ID, or quantity.';
    END IF;
  END LOOP;

  -- Lock each unique product in a stable order and validate the aggregate
  -- quantity (including repeated item IDs) before inserting the invoice.
  FOR v_stock IN
    SELECT (item.value ->> 'itemId')::UUID AS product_id,
           SUM((item.value ->> 'quantity')::INTEGER)::INTEGER AS required_quantity
    FROM jsonb_array_elements(p_invoice -> 'items') AS item(value)
    WHERE item.value ->> 'type' = 'product'
    GROUP BY (item.value ->> 'itemId')::UUID
    ORDER BY (item.value ->> 'itemId')::UUID
  LOOP
    SELECT * INTO v_product FROM public.products
    WHERE id = v_stock.product_id AND salon_id = p_salon_id AND status = 'active'
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Product is not available in this salon.'; END IF;
    IF v_product.stock_quantity < v_stock.required_quantity THEN
      RAISE EXCEPTION 'Insufficient stock for product %.', v_product.name;
    END IF;
  END LOOP;

  v_discount_percent := coalesce(nullif(p_invoice ->> 'discountPercent', '')::NUMERIC, 0);
  IF v_discount_percent < 0 OR v_discount_percent > 100 THEN
    RAISE EXCEPTION 'Discount percentage must be between 0 and 100.';
  END IF;
  IF v_discount_percent > 0 AND NOT public.has_salon_permission(p_salon_id, 'manage_finance') THEN
    RAISE EXCEPTION 'Owner or manager permission is required to apply a discount.';
  END IF;
  SELECT coalesce(nullif(settings ->> 'taxRate', '')::NUMERIC, 0)
    INTO v_tax_percent
  FROM public.salons WHERE id = p_salon_id;
  v_tax_percent := coalesce(v_tax_percent, 0);
  IF v_tax_percent < 0 OR v_tax_percent > 100 THEN
    RAISE EXCEPTION 'Configured salon tax rate is invalid.';
  END IF;
  v_tip := coalesce(nullif(p_invoice ->> 'tipLKR', '')::NUMERIC, 0);
  IF v_tip < 0 OR v_tip > 1000000000 THEN RAISE EXCEPTION 'Tip amount is invalid.'; END IF;
  v_payment_method := coalesce(p_invoice ->> 'paymentMethod', 'cash');
  IF v_payment_method NOT IN ('cash', 'card', 'bank_transfer', 'digital_qr', 'other') THEN
    RAISE EXCEPTION 'Payment method is invalid.';
  END IF;

  -- Resolve customer ownership. The POS sentinel means a walk-in; all other
  -- non-empty customer identifiers must be valid UUIDs belonging to this salon.
  IF nullif(p_invoice ->> 'customerId', '') IS NOT NULL
     AND p_invoice ->> 'customerId' <> 'cust_walkin' THEN
    IF (p_invoice ->> 'customerId') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
      RAISE EXCEPTION 'Customer identifier is invalid.';
    END IF;
    v_customer_id := (p_invoice ->> 'customerId')::UUID;
    SELECT * INTO v_customer FROM public.customers
    WHERE id = v_customer_id AND salon_id = p_salon_id
    FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Customer does not belong to this salon.'; END IF;
    v_customer_name := v_customer.name;
    v_customer_phone := v_customer.phone;
  ELSE
    v_customer_id := NULL;
    v_customer_name := coalesce(nullif(trim(p_invoice ->> 'customerName'), ''), 'Walk-in Client');
    v_customer_phone := nullif(trim(p_invoice ->> 'customerPhone'), '');
  END IF;

  -- Derive each line from tenant-owned service/product and staff records. Client
  -- unitPriceLKR, name, per-line totals, discount, commission, and staffName are
  -- deliberately ignored.
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_invoice -> 'items') LOOP
    v_item_id := (v_item ->> 'itemId')::UUID;
    v_quantity := (v_item ->> 'quantity')::INTEGER;
    v_staff_id := NULL;
    v_staff_name := NULL;
    v_staff_service_commission := NULL;
    v_staff_product_commission := NULL;
    v_commission_rate := NULL;
    IF nullif(v_item ->> 'staffId', '') IS NOT NULL THEN
      IF (v_item ->> 'staffId') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
        RAISE EXCEPTION 'Staff identifier is invalid.';
      END IF;
      v_staff_id := (v_item ->> 'staffId')::UUID;
      SELECT name, default_service_commission, default_product_commission
      INTO v_staff_name, v_staff_service_commission, v_staff_product_commission FROM public.staff
      WHERE id = v_staff_id AND salon_id = p_salon_id AND status = 'active'
      FOR SHARE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Staff member is not active in this salon.'; END IF;
    END IF;

    IF v_item ->> 'type' = 'service' THEN
      SELECT * INTO v_service FROM public.services
      WHERE id = v_item_id AND salon_id = p_salon_id AND is_active = TRUE
      FOR SHARE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Service is not active in this salon.'; END IF;
      IF v_staff_id IS NOT NULL AND cardinality(v_service.assigned_staff_ids) > 0
         AND NOT (v_staff_id = ANY(v_service.assigned_staff_ids)) THEN
        RAISE EXCEPTION 'Selected staff member is not assigned to this service.';
      END IF;
      v_price := v_service.price_lkr;
      IF v_staff_id IS NOT NULL THEN v_commission_rate := v_staff_service_commission; END IF;
    ELSE
      SELECT * INTO v_product FROM public.products
      WHERE id = v_item_id AND salon_id = p_salon_id AND status = 'active';
      IF NOT FOUND THEN RAISE EXCEPTION 'Product is not active in this salon.'; END IF;
      v_price := v_product.selling_price_lkr;
      IF v_staff_id IS NOT NULL THEN v_commission_rate := v_staff_product_commission; END IF;
    END IF;

    IF v_price < 0 OR v_commission_rate < 0 OR v_commission_rate > 100 THEN
      RAISE EXCEPTION 'Catalog price or commission rate is invalid.';
    END IF;
    v_line_subtotal := round(v_price * v_quantity, 2);
    v_line_discount := round(v_line_subtotal * v_discount_percent / 100, 2);
    v_line_total := v_line_subtotal - v_line_discount;
    v_commission_amount := CASE WHEN v_staff_id IS NULL THEN 0
      ELSE round(v_line_total * coalesce(v_commission_rate, 0) / 100, 2) END;
    v_subtotal := v_subtotal + v_line_subtotal;
    v_discount := v_discount + v_line_discount;
  v_line_items := v_line_items || jsonb_build_array(jsonb_build_object(
      'type', v_item ->> 'type', 'itemId', v_item_id,
      'name', CASE WHEN v_item ->> 'type' = 'service' THEN v_service.name ELSE v_product.name END,
      'quantity', v_quantity, 'unitPriceLKR', v_price,
      'discountLKR', v_line_discount, 'totalLKR', v_line_total,
      'staffId', v_staff_id, 'staffName', v_staff_name,
      'commissionPercentage', v_commission_rate,
      'commissionLKR', v_commission_amount
    ));
  END LOOP;

  v_tax := round(greatest(v_subtotal - v_discount, 0) * v_tax_percent / 100, 2);
  v_total := greatest(v_subtotal - v_discount, 0) + v_tax + v_tip;
  -- Invoice monetary columns are NUMERIC(12,2). Commission amount fields are
  -- widened below to the same capacity. Validate before any monetary INSERT.
  IF v_subtotal < 0 OR v_subtotal > 9999999999.99
     OR v_discount < 0 OR v_discount > 9999999999.99
     OR v_tax < 0 OR v_tax > 9999999999.99
     OR v_tip < 0 OR v_tip > 9999999999.99
     OR v_total < 0 OR v_total > 9999999999.99 THEN
    RAISE EXCEPTION 'Invoice amounts exceed the supported monetary limit.';
  END IF;
  v_invoice_id := gen_random_uuid();

  INSERT INTO public.invoices (
    id, salon_id, invoice_number, customer_id, customer_name, customer_phone,
    items, subtotal_lkr, discount_lkr, tax_lkr, tip_lkr, total_lkr,
    paid_amount_lkr, balance_lkr, payment_method, status, notes, created_by
  ) VALUES (
    v_invoice_id, p_salon_id, v_invoice_number, v_customer_id, v_customer_name,
    v_customer_phone, v_line_items, v_subtotal, v_discount, v_tax, v_tip,
    v_total, v_total, 0, v_payment_method, 'paid',
    nullif(trim(p_invoice ->> 'notes'), ''), coalesce(auth.jwt() ->> 'email', v_actor::TEXT)
  );

  -- Decrement stock and write history under the same transaction/row locks.
  FOR v_stock IN
    SELECT (item.value ->> 'itemId')::UUID AS product_id,
           SUM((item.value ->> 'quantity')::INTEGER)::INTEGER AS required_quantity
    FROM jsonb_array_elements(p_invoice -> 'items') AS item(value)
    WHERE item.value ->> 'type' = 'product'
    GROUP BY (item.value ->> 'itemId')::UUID
    ORDER BY (item.value ->> 'itemId')::UUID
  LOOP
    SELECT * INTO v_product FROM public.products
    WHERE id = v_stock.product_id AND salon_id = p_salon_id
    FOR UPDATE;
    UPDATE public.products SET stock_quantity = stock_quantity - v_stock.required_quantity, updated_at = now()
    WHERE id = v_stock.product_id AND salon_id = p_salon_id
    RETURNING stock_quantity INTO v_new_stock;
    INSERT INTO public.stock_movements (
      salon_id, product_id, product_name, type, quantity_change,
      balance_after, reason, reference_id
    ) VALUES (
      p_salon_id, v_stock.product_id, v_product.name, 'sale',
      -v_stock.required_quantity, v_new_stock, 'POS sale', v_invoice_id::TEXT
    );
  END LOOP;

  -- Commission rows use server-derived line values and staff/catalog rates.
  FOR v_line IN SELECT value FROM jsonb_array_elements(v_line_items) LOOP
    IF nullif(v_line ->> 'staffId', '') IS NOT NULL
       AND coalesce((v_line ->> 'commissionLKR')::NUMERIC, 0) > 0 THEN
      INSERT INTO public.commissions (
        salon_id, staff_id, staff_name, invoice_id, invoice_number,
        item_type, item_name, item_amount_lkr, commission_percentage,
        commission_amount_lkr, status
      ) VALUES (
        p_salon_id, (v_line ->> 'staffId')::UUID, v_line ->> 'staffName',
        v_invoice_id, v_invoice_number, v_line ->> 'type', v_line ->> 'name',
        (v_line ->> 'totalLKR')::NUMERIC, (v_line ->> 'commissionPercentage')::NUMERIC,
        (v_line ->> 'commissionLKR')::NUMERIC, 'unpaid'
      );
    END IF;
  END LOOP;

  IF v_customer_id IS NOT NULL THEN
    UPDATE public.customers
    SET total_spent_lkr = total_spent_lkr + v_total,
        visits_count = visits_count + 1,
        last_visit_at = now(), updated_at = now()
    WHERE id = v_customer_id AND salon_id = p_salon_id;
  END IF;

  SELECT to_jsonb(i) INTO v_invoice_row FROM public.invoices i WHERE i.id = v_invoice_id;
  RETURN jsonb_build_object('success', true, 'duplicate', false, 'invoice_id', v_invoice_id, 'invoice', v_invoice_row);
END;
$$;

REVOKE ALL ON FUNCTION public.create_pos_invoice(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_pos_invoice(UUID, JSONB) TO authenticated;

-- Replace the broad member DML policy. Invoice reads remain governed by the
-- existing SELECT policy; business invoice mutations must go through this RPC.
DROP POLICY IF EXISTS "Salon members can manage invoices" ON public.invoices;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.invoices FROM authenticated;

-- The legacy membership FOR ALL policy used a helper that includes both
-- managers and owners. Preserve member-directory reads but restrict membership
-- administration to an active owner (or AAL2-gated Super Admin helper).
CREATE OR REPLACE FUNCTION public.is_salon_owner(p_salon_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.salon_members actor
    WHERE actor.salon_id = p_salon_id
      AND actor.user_id = auth.uid()
      AND actor.status = 'active'
      AND actor.role = 'owner'
  );
$$;
REVOKE ALL ON FUNCTION public.is_salon_owner(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_salon_owner(UUID) TO authenticated;

DROP POLICY IF EXISTS "Salon owners can manage members" ON public.salon_members;
DROP POLICY IF EXISTS "Only salon owners manage memberships" ON public.salon_members;
CREATE POLICY "Only salon owners manage memberships"
  ON public.salon_members FOR ALL TO authenticated
  USING (public.is_super_admin() OR public.is_salon_owner(salon_id))
  WITH CHECK (
    public.is_super_admin()
    OR (role IN ('owner', 'manager', 'receptionist', 'staff') AND public.is_salon_owner(salon_id))
  );

-- Align commission money columns with invoice NUMERIC(12,2) limits so a valid
-- sale/commission does not fail midway solely because legacy columns were
-- narrower than the invoice columns.
ALTER TABLE public.commissions
  ALTER COLUMN item_amount_lkr TYPE NUMERIC(12,2),
  ALTER COLUMN commission_amount_lkr TYPE NUMERIC(12,2);

-- Correct the existing UUID reviewed_by column assignment. The original review
-- RPC stored auth.jwt()->>'email' in this UUID field, which can abort approvals.
CREATE OR REPLACE FUNCTION public.review_manual_payment(
  p_payment_id UUID,
  p_action TEXT,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_payment public.manual_payment_requests%ROWTYPE;
  v_end_date DATE;
BEGIN
  IF NOT public.is_super_admin() OR coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2' THEN
    RAISE EXCEPTION 'Verified Super Admin MFA (AAL2) is required.';
  END IF;
  IF p_action NOT IN ('approved', 'rejected') THEN RAISE EXCEPTION 'Invalid payment action.'; END IF;
  IF p_action = 'rejected' AND nullif(trim(p_rejection_reason), '') IS NULL THEN
    RAISE EXCEPTION 'A rejection reason is required.';
  END IF;

  SELECT * INTO v_payment FROM public.manual_payment_requests
  WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND OR v_payment.status <> 'pending' THEN
    RAISE EXCEPTION 'Payment request is not pending.';
  END IF;

  UPDATE public.manual_payment_requests
  SET status = p_action, rejection_reason = nullif(trim(p_rejection_reason), ''),
      reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = p_payment_id;

  IF p_action = 'approved' THEN
    v_end_date := CURRENT_DATE + CASE WHEN v_payment.billing_cycle = 'yearly'
      THEN INTERVAL '1 year' ELSE INTERVAL '1 month' END;
    UPDATE public.salon_subscriptions
    SET plan_id = v_payment.plan_id, status = 'active', billing_cycle = v_payment.billing_cycle,
        start_date = CURRENT_DATE, end_date = v_end_date, trial_ends_at = NULL,
        auto_renew = true, updated_at = now()
    WHERE salon_id = v_payment.salon_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Salon subscription was not found for approved payment.'; END IF;
  END IF;

  INSERT INTO public.audit_logs (salon_id, actor_email, actor_role, action, entity, entity_id, details)
  VALUES (v_payment.salon_id, coalesce(auth.jwt() ->> 'email', ''), 'superadmin',
          upper(p_action) || '_PAYMENT', 'manual_payment', p_payment_id::TEXT,
          coalesce(nullif(trim(p_rejection_reason), ''), 'Payment review completed.'));
  RETURN jsonb_build_object('success', true, 'status', p_action, 'payment_id', p_payment_id);
END;
$$;
REVOKE ALL ON FUNCTION public.review_manual_payment(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_manual_payment(UUID, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.create_pos_invoice(UUID, JSONB)
IS 'Phase 13 POS transaction: server-derived catalog prices, totals, customer/staff ownership, commission rows, invoice idempotency, and atomic inventory movement.';

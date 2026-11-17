-- Atomic POS invoice boundary. The client must call this RPC instead of
-- independently updating inventory and invoice rows.
CREATE OR REPLACE FUNCTION public.create_pos_invoice(
  p_salon_id UUID,
  p_invoice JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item JSONB;
  v_product public.products%ROWTYPE;
  v_invoice_id UUID;
  v_customer_id UUID;
  v_invoice_number TEXT := trim(p_invoice ->> 'invoiceNumber');
  v_quantity INTEGER;
  v_new_stock INTEGER;
  v_actor UUID := auth.uid();
BEGIN
  IF v_actor IS NULL OR NOT public.is_salon_member(p_salon_id) THEN RAISE EXCEPTION 'Salon membership is required.'; END IF;
  IF v_invoice_number IS NULL OR length(v_invoice_number) NOT BETWEEN 1 AND 80 THEN RAISE EXCEPTION 'Invoice number is invalid.'; END IF;
  IF EXISTS (SELECT 1 FROM public.invoices WHERE salon_id = p_salon_id AND invoice_number = v_invoice_number) THEN
    SELECT to_jsonb(i) INTO v_item FROM public.invoices i WHERE i.salon_id = p_salon_id AND i.invoice_number = v_invoice_number LIMIT 1;
    RETURN jsonb_build_object('duplicate', true, 'invoice', v_item);
  END IF;

  IF (p_invoice ->> 'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    v_invoice_id := (p_invoice ->> 'id')::uuid;
  ELSE
    v_invoice_id := gen_random_uuid();
  END IF;
  IF nullif(p_invoice ->> 'customerId', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    v_customer_id := (p_invoice ->> 'customerId')::uuid;
  END IF;

  -- Lock and validate every product before changing any stock.
  FOR v_item IN SELECT value FROM jsonb_array_elements(coalesce(p_invoice -> 'items', '[]'::jsonb)) LOOP
    IF v_item ->> 'type' = 'product' THEN
      SELECT * INTO v_product FROM public.products WHERE id = (v_item ->> 'itemId')::uuid AND salon_id = p_salon_id FOR UPDATE;
      IF v_product.id IS NULL THEN RAISE EXCEPTION 'Product is not available.'; END IF;
      v_quantity := greatest(1, (v_item ->> 'quantity')::integer);
      IF v_product.stock_quantity < v_quantity THEN RAISE EXCEPTION 'Insufficient stock for product %.', v_product.name; END IF;
    END IF;
  END LOOP;

  INSERT INTO public.invoices (id, salon_id, invoice_number, customer_id, customer_name, customer_phone, items, subtotal_lkr, discount_lkr, tax_lkr, tip_lkr, total_lkr, paid_amount_lkr, balance_lkr, payment_method, status, notes, created_by)
  VALUES (
    v_invoice_id, p_salon_id, v_invoice_number, v_customer_id, coalesce(p_invoice ->> 'customerName', 'Walk-in Client'), nullif(p_invoice ->> 'customerPhone', ''), coalesce(p_invoice -> 'items', '[]'::jsonb), coalesce((p_invoice ->> 'subtotalLKR')::numeric, 0), coalesce((p_invoice ->> 'discountLKR')::numeric, 0), coalesce((p_invoice ->> 'taxLKR')::numeric, 0), coalesce((p_invoice ->> 'tipLKR')::numeric, 0), coalesce((p_invoice ->> 'totalLKR')::numeric, 0), coalesce((p_invoice ->> 'paidAmountLKR')::numeric, 0), coalesce((p_invoice ->> 'balanceLKR')::numeric, 0), coalesce(p_invoice ->> 'paymentMethod', 'cash'), coalesce(p_invoice ->> 'status', 'paid'), nullif(p_invoice ->> 'notes', ''), coalesce(p_invoice ->> 'createdBy', v_actor::text)
  );

  FOR v_item IN SELECT value FROM jsonb_array_elements(coalesce(p_invoice -> 'items', '[]'::jsonb)) LOOP
    IF v_item ->> 'type' = 'product' THEN
      v_quantity := greatest(1, (v_item ->> 'quantity')::integer);
      UPDATE public.products SET stock_quantity = stock_quantity - v_quantity, updated_at = NOW() WHERE id = (v_item ->> 'itemId')::uuid AND salon_id = p_salon_id RETURNING stock_quantity INTO v_new_stock;
      INSERT INTO public.stock_movements (salon_id, product_id, product_name, type, quantity_change, balance_after, reason, reference_id)
      VALUES (p_salon_id, (v_item ->> 'itemId')::uuid, coalesce(v_item ->> 'name', 'Product'), 'sale', -v_quantity, v_new_stock, 'POS sale', v_invoice_id::text);
    END IF;
  END LOOP;

  IF v_customer_id IS NOT NULL THEN
    UPDATE public.customers SET total_spent_lkr = total_spent_lkr + coalesce((p_invoice ->> 'paidAmountLKR')::numeric, 0), visits_count = visits_count + 1, last_visit_at = NOW(), updated_at = NOW() WHERE id = v_customer_id AND salon_id = p_salon_id;
  END IF;
  RETURN jsonb_build_object('duplicate', false, 'invoice_id', v_invoice_id, 'success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.create_pos_invoice(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_pos_invoice(UUID, JSONB) TO authenticated;

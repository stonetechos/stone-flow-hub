
CREATE OR REPLACE FUNCTION public.reassign_quote_customer(
  p_quote_id uuid,
  p_new_customer_id uuid
) RETURNS public.quotes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_quote public.quotes;
  v_old_customer public.customers;
  v_new_customer public.customers;
  v_blocking_invoices int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  -- Only admin or sales_manager may reassign
  IF NOT (public.has_role(v_uid, 'admin') OR public.has_role(v_uid, 'sales_manager')) THEN
    RAISE EXCEPTION 'You do not have permission to reassign customers' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_quote FROM public.quotes WHERE id = p_quote_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote not found';
  END IF;

  IF v_quote.customer_id = p_new_customer_id THEN
    RAISE EXCEPTION 'Selected customer is already the owner of this quotation';
  END IF;

  SELECT * INTO v_new_customer FROM public.customers WHERE id = p_new_customer_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Selected customer not found';
  END IF;

  SELECT * INTO v_old_customer FROM public.customers WHERE id = v_quote.customer_id;

  -- Block if any finalised (non-draft, non-cancelled) invoice exists
  SELECT count(*) INTO v_blocking_invoices
    FROM public.invoices
    WHERE quote_id = v_quote.id
      AND status NOT IN ('draft','cancelled');

  IF v_blocking_invoices > 0 THEN
    RAISE EXCEPTION 'Cannot reassign: a finalised tax invoice already exists for this quotation';
  END IF;

  UPDATE public.quotes
    SET customer_id = p_new_customer_id,
        updated_at = now()
    WHERE id = v_quote.id
    RETURNING * INTO v_quote;

  -- Also update any draft invoices that were created but not yet issued,
  -- so the new customer flows through to future documents without duplication.
  UPDATE public.invoices
    SET customer_id = p_new_customer_id,
        updated_at = now()
    WHERE quote_id = v_quote.id AND status = 'draft';

  -- Audit trail — preserves both old and new customer identities forever.
  INSERT INTO public.activity_log (
    entity_type, entity_id, project_id, action, field_name, old_value, new_value, summary, actor_id
  ) VALUES (
    'quotes',
    v_quote.id,
    v_quote.project_id,
    'updated',
    'customer_id',
    jsonb_build_object(
      'customer_id', v_old_customer.id,
      'name', v_old_customer.name,
      'customer_code', v_old_customer.customer_code,
      'gst_number', v_old_customer.gst_number
    ),
    jsonb_build_object(
      'customer_id', v_new_customer.id,
      'name', v_new_customer.name,
      'customer_code', v_new_customer.customer_code,
      'gst_number', v_new_customer.gst_number
    ),
    format('Customer reassigned: %s → %s', COALESCE(v_old_customer.name,'—'), v_new_customer.name),
    v_uid
  );

  RETURN v_quote;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reassign_quote_customer(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reassign_quote_customer(uuid, uuid) TO authenticated;

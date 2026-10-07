-- Update convert_quote_to_invoice to copy hsn_sac from quote_items to invoice_items
CREATE OR REPLACE FUNCTION public.convert_quote_to_invoice(p_quote_id uuid, p_due_date date DEFAULT NULL)
RETURNS public.invoices LANGUAGE plpgsql SET search_path=public AS $$
DECLARE v_q public.quotes; v_inv public.invoices;
BEGIN
  SELECT * INTO v_q FROM public.quotes WHERE id = p_quote_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quote not found'; END IF;

  INSERT INTO public.invoices (invoice_no, quote_id, project_id, customer_id, status, issue_date, due_date, currency_code, company_id, notes, terms, created_by)
  VALUES ('', v_q.id, v_q.project_id, v_q.customer_id, 'draft', CURRENT_DATE, COALESCE(p_due_date, CURRENT_DATE + INTERVAL '15 days'), v_q.currency_code, v_q.company_id, v_q.notes, v_q.terms, auth.uid())
  RETURNING * INTO v_inv;

  INSERT INTO public.invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, tax_pct, hsn_sac, sort_order)
  SELECT v_inv.id, product_id, description, quantity, unit, unit_price, tax_pct, hsn_sac, sort_order
    FROM public.quote_items WHERE quote_id = v_q.id;

  UPDATE public.quotes SET status='converted' WHERE id = v_q.id;
  RETURN v_inv;
END; $$;

-- Also ensure convert_quote_to_sales_order carries hsn_sac across
CREATE OR REPLACE FUNCTION public.convert_quote_to_sales_order(p_quote_id uuid)
 RETURNS sales_orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_quote public.quotes;
  v_so    public.sales_orders;
BEGIN
  IF NOT public.has_staff_access(auth.uid()) THEN
    RAISE EXCEPTION 'permission denied' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_quote FROM public.quotes WHERE id = p_quote_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quote % not found', p_quote_id USING ERRCODE='P0002'; END IF;

  SELECT * INTO v_so FROM public.sales_orders
    WHERE quote_id = p_quote_id
    ORDER BY created_at DESC LIMIT 1;
  IF FOUND THEN RETURN v_so; END IF;

  INSERT INTO public.sales_orders(
    so_no, quote_id, project_id, customer_id, status, order_date, delivery_date, notes
  ) VALUES (
    '', v_quote.id, v_quote.project_id, v_quote.customer_id, 'draft',
    CURRENT_DATE, v_quote.valid_until, v_quote.notes
  ) RETURNING * INTO v_so;

  INSERT INTO public.sales_order_items(
    sales_order_id, product_id, product_name, description, category, stone_type, finish,
    unit, quantity, unit_price, discount_pct, tax_pct, fulfilment, hsn_sac, sort_order
  )
  SELECT
    v_so.id, qi.product_id, p.name, qi.description, pc.name,
    COALESCE(st.name, p.stone_type::text), p.finish::text,
    qi.unit, qi.quantity, qi.unit_price, 0, qi.tax_pct, qi.fulfilment, qi.hsn_sac, qi.sort_order
  FROM public.quote_items qi
  LEFT JOIN public.products p ON p.id = qi.product_id
  LEFT JOIN public.product_categories pc ON pc.id = p.category_id
  LEFT JOIN public.stone_types st ON st.id = p.stone_type_id
  WHERE qi.quote_id = v_quote.id
  ORDER BY qi.sort_order;

  SELECT * INTO v_so FROM public.sales_orders WHERE id = v_so.id;
  RETURN v_so;
END $function$;

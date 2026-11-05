-- Fix quotation terms leaking into sales invoices
-- Invoices are formal tax/accounting documents; quote promotional/booking terms must never appear on invoices.

CREATE OR REPLACE FUNCTION public.convert_quote_to_invoice(p_quote_id uuid, p_due_date date DEFAULT NULL)
RETURNS public.invoices LANGUAGE plpgsql SET search_path=public AS $$
DECLARE v_q public.quotes; v_inv public.invoices;
BEGIN
  SELECT * INTO v_q FROM public.quotes WHERE id = p_quote_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quote not found'; END IF;

  INSERT INTO public.invoices (invoice_no, quote_id, project_id, customer_id, status, issue_date, due_date, currency_code, company_id, notes, terms, created_by)
  VALUES ('', v_q.id, v_q.project_id, v_q.customer_id, 'draft', CURRENT_DATE, COALESCE(p_due_date, CURRENT_DATE + INTERVAL '15 days'), v_q.currency_code, v_q.company_id, v_q.notes, 'Due on Receipt', auth.uid())
  RETURNING * INTO v_inv;

  INSERT INTO public.invoice_items (invoice_id, product_id, description, notes, quantity, unit, unit_price, tax_pct, hsn_sac, sort_order)
  SELECT v_inv.id, product_id, description, notes, quantity, unit, unit_price, tax_pct, hsn_sac, sort_order
    FROM public.quote_items WHERE quote_id = v_q.id;

  UPDATE public.quotes SET status='converted' WHERE id = v_q.id;
  RETURN v_inv;
END; $$;

-- Clean existing invoices that inherited quotation terms & promotional clauses
UPDATE public.invoices
SET terms = 'Due on Receipt'
WHERE terms ILIKE '%advance taken upon%'
   OR terms ILIKE '%shree yantra%'
   OR terms ILIKE '%delivery timeline%'
   OR terms ILIKE '%order booking%'
   OR terms ILIKE '%variation in color%'
   OR LENGTH(terms) > 50;

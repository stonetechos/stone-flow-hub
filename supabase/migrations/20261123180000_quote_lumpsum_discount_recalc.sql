-- Migration: 20261123180000_quote_lumpsum_discount_recalc.sql
-- Support lumpsum discount in quotes recalculation trigger.
-- Whenever quote items are added, updated, or removed, recalculate:
-- subtotal = sum(item amounts)
-- tax_amount = sum(tax amounts)
-- total = greatest(0, (subtotal + tax_amount) - discount_amount)

CREATE OR REPLACE FUNCTION public.recalc_quote_totals(_quote_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub numeric(14,2);
  v_tax numeric(14,2);
  v_discount numeric(14,2) := 0;
  v_wf jsonb;
BEGIN
  SELECT COALESCE(SUM(quantity * unit_price), 0),
         COALESCE(SUM(quantity * unit_price * tax_pct / 100), 0)
    INTO v_sub, v_tax
    FROM public.quote_items
   WHERE quote_id = _quote_id;

  SELECT workflow_state INTO v_wf FROM public.quotes WHERE id = _quote_id;
  IF v_wf IS NOT NULL THEN
    IF (v_wf ? 'discount_amount') THEN
      v_discount := COALESCE(NULLIF(v_wf->>'discount_amount', '')::numeric, 0);
    ELSIF (v_wf ? 'discount') THEN
      v_discount := COALESCE(NULLIF(v_wf->>'discount', '')::numeric, 0);
    END IF;
  END IF;

  UPDATE public.quotes
     SET subtotal = v_sub,
         tax_amount = v_tax,
         total = GREATEST(0, (v_sub + v_tax) - v_discount)
   WHERE id = _quote_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recalc_quote_totals(uuid) TO authenticated, service_role;

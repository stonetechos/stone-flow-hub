-- Make the quote_items recalc trigger run as its owner so it can call
-- recalc_quote_totals() even though EXECUTE on that helper is revoked
-- from anon/authenticated. No change to RLS, GRANTs, or the totals
-- formula itself.
CREATE OR REPLACE FUNCTION public.trg_quote_item_recalc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.recalc_quote_totals(COALESCE(NEW.quote_id, OLD.quote_id));
  RETURN NULL;
END;
$$;
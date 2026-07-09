-- Fix: Payment delete fails with "permission denied for function recalc_invoice_totals".
-- The trigger trg_payment_recalc (SECURITY INVOKER) calls public.recalc_invoice_totals
-- which had no EXECUTE grant to authenticated, causing 42501 on payment INSERT/DELETE.
GRANT EXECUTE ON FUNCTION public.recalc_invoice_totals(uuid) TO authenticated;
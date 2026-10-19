-- Migration: 20261019223000_invoice_date_and_quote_reversion.sql
-- 1. Repair quotes whose invoices were deleted: if quotes.status = 'converted'
--    and no non-cancelled invoice exists, revert status back to 'accepted'.
UPDATE public.quotes q
SET status = 'accepted'
WHERE q.status = 'converted'
  AND NOT EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.quote_id = q.id
      AND i.status <> 'cancelled'
  );

-- 2. Trigger on invoices table: whenever an invoice is deleted, check if
--    any non-cancelled invoices remain for that quote. If none remain,
--    revert quotes.status back to 'accepted' automatically.
CREATE OR REPLACE FUNCTION public.handle_invoice_deleted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.quote_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.invoices
      WHERE quote_id = OLD.quote_id
        AND id <> OLD.id
        AND status <> 'cancelled'
    ) THEN
      UPDATE public.quotes
      SET status = 'accepted'
      WHERE id = OLD.quote_id;
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoice_deleted ON public.invoices;
CREATE TRIGGER trg_invoice_deleted
  AFTER DELETE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_invoice_deleted();

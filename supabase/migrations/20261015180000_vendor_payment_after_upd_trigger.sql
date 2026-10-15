-- Add AFTER UPDATE trigger on vendor_payments so edits to amount, paid_at,
-- vendor_id, or notes stay in sync with vendor_ledger_entries.
-- vendor_payment_after_ins() calls vendor_ledger_upsert() which already handles
-- ON CONFLICT (source_type, source_id) WHERE source_id IS NOT NULL DO UPDATE.

DROP TRIGGER IF EXISTS trg_vpay_after_upd ON public.vendor_payments;
CREATE TRIGGER trg_vpay_after_upd
  AFTER UPDATE ON public.vendor_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.vendor_payment_after_ins();

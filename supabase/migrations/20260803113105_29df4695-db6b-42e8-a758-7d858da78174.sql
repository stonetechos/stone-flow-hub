-- 1) Recalculate every allocated invoice when a receipt's status or amount changes.
--    Voiding a receipt previously left invoice amount_paid / balance_due / status stale
--    because recalc only ran on receipt_allocations changes.
CREATE OR REPLACE FUNCTION public.trg_receipt_status_recalc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_inv uuid;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status OR NEW.amount IS DISTINCT FROM OLD.amount THEN
    FOR v_inv IN
      SELECT DISTINCT invoice_id FROM public.receipt_allocations WHERE receipt_id = NEW.id
    LOOP
      PERFORM public.recalc_invoice_with_receipts(v_inv);
    END LOOP;
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_receipt_status_recalc ON public.receipts;
CREATE TRIGGER trg_receipt_status_recalc
AFTER UPDATE ON public.receipts
FOR EACH ROW EXECUTE FUNCTION public.trg_receipt_status_recalc();

-- 2) Repair any invoices whose paid amount drifted while the trigger was missing.
DO $$
DECLARE v_inv uuid;
BEGIN
  FOR v_inv IN SELECT DISTINCT invoice_id FROM public.receipt_allocations LOOP
    PERFORM public.recalc_invoice_with_receipts(v_inv);
  END LOOP;
END $$;

-- 3) Guard the milestone payment RPC against zero / negative / over-payment amounts.
CREATE OR REPLACE FUNCTION public.record_schedule_payment(_schedule_id uuid, _amount numeric, _receipt_no text DEFAULT NULL::text)
RETURNS customer_payment_schedules
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v public.customer_payment_schedules%ROWTYPE; v_bal numeric;
BEGIN
  IF NOT public.has_staff_access(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF COALESCE(_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  SELECT * INTO v FROM public.customer_payment_schedules WHERE id = _schedule_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Schedule % not found', _schedule_id; END IF;
  IF v.status = 'cancelled' THEN RAISE EXCEPTION 'Cannot record a payment on a cancelled milestone'; END IF;

  v_bal := v.amount - COALESCE(v.paid_amount, 0);
  IF _amount > v_bal + 0.01 THEN
    RAISE EXCEPTION 'Amount % exceeds the milestone balance %', _amount, v_bal;
  END IF;

  UPDATE public.customer_payment_schedules
     SET paid_amount = LEAST(amount, COALESCE(paid_amount,0) + _amount),
         status = CASE
                    WHEN COALESCE(paid_amount,0) + _amount >= amount - 0.01 THEN 'paid'
                    ELSE 'partial'
                  END,
         notes = COALESCE(_receipt_no, notes),
         updated_at = now()
   WHERE id = _schedule_id
   RETURNING * INTO v;
  RETURN v;
END $function$;
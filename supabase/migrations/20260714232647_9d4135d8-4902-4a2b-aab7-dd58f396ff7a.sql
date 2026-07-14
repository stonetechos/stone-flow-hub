-- Phase G.9A.2 -- Payment workflow correction.
--
-- Investigation findings (see commit message for the full trace):
-- 1. Two separate, disconnected "record a payment" systems exist:
--    `payments` (written by /payments/new and the invoice quick-pay button)
--    is not included anywhere in the customer_ledger view, so it can never
--    show up in Ledger. `receipts` (+ receipt_allocations, written by
--    /receipts/new and the Customer Payment Centre) is the complete system:
--    allocations link a receipt to specific invoices, a trigger keeps
--    invoice balance_due/status in sync, and customer_ledger already reads
--    from it. Receipts is the correct, complete implementation; Payments is
--    the disconnected legacy one.
-- 2. Two separate invoice-recalculation functions exist and disagree:
--    recalc_invoice_totals() (sums payments only) is called whenever an
--    invoice_item or a payments row changes; recalc_invoice_with_receipts()
--    (sums payments + receipt_allocations) is called only when a
--    receipt_allocations row changes. Editing an invoice's line items after
--    a receipt-based payment was recorded re-runs the narrower function and
--    silently drops the receipt's contribution from the invoice's balance.
--
-- This migration:
-- A. Makes recalc_invoice_totals() a thin delegate to
--    recalc_invoice_with_receipts() -- one real calculation instead of two
--    that can disagree. Every existing trigger/caller keeps working
--    unchanged (same function name, same signature); it just now always
--    gets the correct, complete answer.
-- B. Creates public.payment_register, a view unioning receipts (the
--    complete system) with legacy payments rows, so the Payments page can
--    show every real transaction without requiring a second write path or
--    deleting/moving any existing row. security_invoker is set from
--    creation (matching the fix customer_ledger and customer_payment_
--    dashboard needed after the fact -- getting it right here from the
--    start) so RLS on the underlying tables is enforced for the querying
--    user, not the view owner.
--
-- Deliberately out of scope for this migration (per instruction --
-- Executive Intelligence calculations are not to be modified): the
-- customer_payment_schedules / customer_payment_dashboard milestone system
-- that Executive Intelligence's collection-priority insight reads from is a
-- separate, fourth mechanism untouched here. Linking receipts to payment
-- schedule milestones is a distinct follow-up, not folded into this fix.

-- ---------------------------------------------------------------------
-- A. Unify invoice recalculation on the complete (payments + receipts)
--    formula. recalc_invoice_with_receipts already exists and is correct;
--    recalc_invoice_totals becomes a pure delegate so both existing
--    triggers (trg_invoice_items_recalc on invoice_items, trg_payments_
--    recalc on payments) automatically get the fixed behaviour with no
--    trigger definition changes needed.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalc_invoice_totals(_invoice_id uuid)
RETURNS void LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  -- Deprecated duplicate calculation removed -- delegates to the single
  -- source of truth so payments-only and payments+receipts callers can
  -- never disagree again.
  PERFORM public.recalc_invoice_with_receipts(_invoice_id);
END;
$$;

-- ---------------------------------------------------------------------
-- B. Payment register view -- Receipts (primary, complete) UNION legacy
--    Payments, so the Payments page can display every real transaction.
--    One row per receipt (not per allocation): a receipt can be allocated
--    across multiple invoices, so the "primary" invoice shown here is the
--    single largest allocation for that receipt -- the full breakdown
--    still lives on the receipt's own detail page via receipt_allocations,
--    unchanged and unaffected by this view.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.payment_register
WITH (security_invoker = true) AS
  SELECT
    r.id,
    'receipt'::text AS source,
    r.receipt_no AS doc_no,
    r.customer_id,
    c.name AS customer_name,
    ra.invoice_id,
    i.invoice_no,
    r.amount,
    r.method,
    r.reference_no,
    r.remarks AS notes,
    r.received_at::timestamptz AS paid_at,
    r.status,
    r.created_at
  FROM public.receipts r
  LEFT JOIN public.customers c ON c.id = r.customer_id
  LEFT JOIN LATERAL (
    SELECT ra.invoice_id
      FROM public.receipt_allocations ra
     WHERE ra.receipt_id = r.id
     ORDER BY ra.amount DESC, ra.created_at ASC
     LIMIT 1
  ) ra ON true
  LEFT JOIN public.invoices i ON i.id = ra.invoice_id
  WHERE r.status = 'active'
  UNION ALL
  SELECT
    p.id,
    'payment'::text AS source,
    p.payment_no AS doc_no,
    i.customer_id,
    c.name AS customer_name,
    p.invoice_id,
    i.invoice_no,
    p.amount,
    p.method,
    p.reference_no,
    p.notes,
    p.paid_at,
    'active'::text AS status,
    p.created_at
  FROM public.payments p
  JOIN public.invoices i ON i.id = p.invoice_id
  LEFT JOIN public.customers c ON c.id = i.customer_id;

GRANT SELECT ON public.payment_register TO authenticated, service_role;

-- Phase G.9A (Ledger consistency) -- include legacy `payments` in
-- customer_ledger.
--
-- Audit finding: customer_ledger unions invoices + receipts + credit_notes
-- + debit_notes + refunds -- it never included the `payments` table. An
-- invoice paid through the legacy Payments path (not Receipts) already
-- shows correctly as paid on the invoice itself and on the Payments page
-- (payment_register, G.9A.2), but was invisible to Ledger, since nothing
-- in Ledger ever recorded a credit for it.
--
-- This is more than a display gap: customer_ledger is read directly by
-- src/lib/executive/kpis.ts and src/lib/executive/brief.functions.ts,
-- which sum its debit/credit columns into an Executive KPI/Brief
-- receivables figure -- while those same files separately query the
-- `payments` table directly for a different figure ("monthly
-- collections"). The same real collection could be correctly counted in
-- one Executive number and simultaneously missing from another.
--
-- Fix: add one more UNION branch for `payments`, matching the existing
-- `receipt` branch's shape and filtering exactly (an active, real
-- transaction contributing a credit). This is a data-completeness fix to
-- an existing view -- the Executive KPI/Brief aggregation formulas
-- themselves (how debit/credit are summed) are untouched.

CREATE OR REPLACE VIEW public.customer_ledger
WITH (security_invoker = true) AS
  SELECT i.customer_id, i.issue_date AS entry_date, 'invoice'::text AS entry_type,
         i.id AS ref_id, i.invoice_no AS ref_no, i.total AS debit, 0::numeric AS credit, i.status::text AS status
    FROM public.invoices i WHERE i.status <> 'cancelled'
  UNION ALL
  SELECT r.customer_id, r.received_at, 'receipt', r.id, r.receipt_no, 0, r.net_amount, r.status
    FROM public.receipts r WHERE r.status='active'
  UNION ALL
  SELECT i.customer_id, p.paid_at::date, 'payment', p.id, p.payment_no, 0::numeric, p.amount, 'active'::text
    FROM public.payments p
    JOIN public.invoices i ON i.id = p.invoice_id
  UNION ALL
  SELECT c.customer_id, c.issued_at, 'credit_note', c.id, c.cn_no, 0, c.amount, c.status
    FROM public.credit_notes c WHERE c.status='active'
  UNION ALL
  SELECT d.customer_id, d.issued_at, 'debit_note', d.id, d.dn_no, d.amount, 0, d.status
    FROM public.debit_notes d WHERE d.status='active'
  UNION ALL
  SELECT rf.customer_id, rf.refunded_at, 'refund', rf.id, rf.refund_no, rf.amount, 0, rf.status
    FROM public.refunds rf WHERE rf.status='active';

GRANT SELECT ON public.customer_ledger TO authenticated;

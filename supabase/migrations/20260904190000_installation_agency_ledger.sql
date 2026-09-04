-- Installation Agency Ledger (Task #48) — Rishi, via AskUserQuestion:
-- "Manual entry only" — assigning an agency on an approved quote is just a
-- record of who's doing the job; no automatic ledger posting. Staff record
-- charge/payment entries by hand, the same way vendor payments post today
-- — except there is deliberately NO trigger and NO SECURITY DEFINER
-- upsert function here (contrast with vendor_ledger_entries/
-- vendor_ledger_upsert in 20260707144257_...sql): every row is a plain
-- authenticated INSERT under normal staff RLS, because nothing else in
-- the app ever posts to this table automatically.
--
-- Debit/credit convention matches vendor_ledger_entries: debit = amount
-- charged to us by the agency (increases what we owe them), credit =
-- amount we've paid them (decreases the balance). The UI presents this as
-- an explicit "Charge" vs "Payment" choice rather than inferring it from
-- a payment-type enum, since there's no trigger to do that inference for
-- us here.

CREATE TABLE public.installation_agency_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_agency_id UUID NOT NULL REFERENCES public.installation_agencies(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  ref_no TEXT,
  debit NUMERIC(14,2) NOT NULL DEFAULT 0,
  credit NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  company_id UUID,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX installation_agency_ledger_agency_idx
  ON public.installation_agency_ledger_entries(installation_agency_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.installation_agency_ledger_entries TO authenticated;
GRANT ALL ON public.installation_agency_ledger_entries TO service_role;
ALTER TABLE public.installation_agency_ledger_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can read installation_agency_ledger_entries" ON public.installation_agency_ledger_entries
  FOR SELECT TO authenticated USING (public.has_staff_access(auth.uid()));
CREATE POLICY "Staff can write installation_agency_ledger_entries" ON public.installation_agency_ledger_entries
  FOR ALL TO authenticated USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));

-- Running balance per agency — same windowed-sum shape as public.vendor_ledger.
CREATE OR REPLACE VIEW public.installation_agency_ledger WITH (security_invoker = on) AS
SELECT
  e.id, e.installation_agency_id, e.entry_date, e.description, e.ref_no,
  e.debit, e.credit, e.notes, e.created_at,
  SUM(e.debit - e.credit) OVER (
    PARTITION BY e.installation_agency_id
    ORDER BY e.entry_date, e.created_at, e.id
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS running_balance
FROM public.installation_agency_ledger_entries e;

GRANT SELECT ON public.installation_agency_ledger TO authenticated;

NOTIFY pgrst, 'reload schema';

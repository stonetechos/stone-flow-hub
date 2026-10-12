-- Personal Transfers & Ledgers
-- Enables tracking transfers between personal accounts (Rishi Rai, Raman Pupneja),
-- UPI accounts, and Stone Tech Current Account / Cash Drawer.
-- Includes ledger balance computation, UTR tracking, and partner settlements.

CREATE TABLE IF NOT EXISTS public.personal_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  from_account TEXT NOT NULL,
  from_account_custom TEXT,
  to_account TEXT NOT NULL,
  to_account_custom TEXT,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (amount > 0),
  category TEXT NOT NULL DEFAULT 'other',
  reference_no TEXT DEFAULT '',
  remarks TEXT NOT NULL DEFAULT '',
  receipt_url TEXT,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS personal_transfers_date_idx ON public.personal_transfers(transfer_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS personal_transfers_from_acc_idx ON public.personal_transfers(from_account);
CREATE INDEX IF NOT EXISTS personal_transfers_to_acc_idx ON public.personal_transfers(to_account);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_transfers TO authenticated;
GRANT ALL ON public.personal_transfers TO service_role;

ALTER TABLE public.personal_transfers ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users with admin/super_admin/accounting role or directors (Rishi, Raman)
CREATE POLICY "Admins or directors can view personal_transfers" ON public.personal_transfers
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR auth.jwt() ->> 'email' IN ('raman.pupneja@gmail.com', 'stonetechrajasthan@gmail.com', 'rishirai@gmail.com')
  );

CREATE POLICY "Admins or directors can insert personal_transfers" ON public.personal_transfers
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR auth.jwt() ->> 'email' IN ('raman.pupneja@gmail.com', 'stonetechrajasthan@gmail.com', 'rishirai@gmail.com')
  );

CREATE POLICY "Admins or directors can update personal_transfers" ON public.personal_transfers
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR auth.jwt() ->> 'email' IN ('raman.pupneja@gmail.com', 'stonetechrajasthan@gmail.com', 'rishirai@gmail.com')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR auth.jwt() ->> 'email' IN ('raman.pupneja@gmail.com', 'stonetechrajasthan@gmail.com', 'rishirai@gmail.com')
  );

CREATE POLICY "Admins or directors can delete personal_transfers" ON public.personal_transfers
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR auth.jwt() ->> 'email' IN ('raman.pupneja@gmail.com', 'stonetechrajasthan@gmail.com', 'rishirai@gmail.com')
  );

DROP TRIGGER IF EXISTS personal_transfers_touch ON public.personal_transfers;
CREATE TRIGGER personal_transfers_touch BEFORE UPDATE ON public.personal_transfers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

NOTIFY pgrst, 'reload schema';

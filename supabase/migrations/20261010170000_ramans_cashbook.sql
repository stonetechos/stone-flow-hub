-- Raman's Cashbook: Cash in Hand balance register managed by raman.pupneja@gmail.com
-- Restricted strictly to Super Admins and raman.pupneja@gmail.com.
-- Tracks Date, Debit (Cash In), Credit (Cash Out), and Remarks (Notes).

CREATE TABLE IF NOT EXISTS public.ramans_cashbook (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('debit', 'credit')),
  amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  remarks TEXT NOT NULL DEFAULT '',
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ramans_cashbook_date_idx ON public.ramans_cashbook(entry_date DESC, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ramans_cashbook TO authenticated;
GRANT ALL ON public.ramans_cashbook TO service_role;

ALTER TABLE public.ramans_cashbook ENABLE ROW LEVEL SECURITY;

-- Only Super Admins and raman.pupneja@gmail.com can read
CREATE POLICY "Super admin or Raman can read ramans_cashbook" ON public.ramans_cashbook
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR auth.jwt() ->> 'email' = 'raman.pupneja@gmail.com'
  );

-- Only Super Admins and raman.pupneja@gmail.com can write
CREATE POLICY "Super admin or Raman can write ramans_cashbook" ON public.ramans_cashbook
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR auth.jwt() ->> 'email' = 'raman.pupneja@gmail.com'
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR auth.jwt() ->> 'email' = 'raman.pupneja@gmail.com'
  );

DROP TRIGGER IF EXISTS ramans_cashbook_touch ON public.ramans_cashbook;
CREATE TRIGGER ramans_cashbook_touch BEFORE UPDATE ON public.ramans_cashbook
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

NOTIFY pgrst, 'reload schema';

-- Fix Personal Transfers RLS + ensure table column types are correct
-- Problem: the original RLS policies used has_role checks that required an
-- explicit 'admin' row, blocking super_admin-only users (Raman, Rishi) and
-- any user whose role was fixed by the access-flow migration. Replacing with
-- has_staff_access() which now covers all staff roles after the hierarchy fix.

-- Re-create all four RLS policies using has_staff_access
DROP POLICY IF EXISTS "Admins or directors can view personal_transfers" ON public.personal_transfers;
DROP POLICY IF EXISTS "Admins or directors can insert personal_transfers" ON public.personal_transfers;
DROP POLICY IF EXISTS "Admins or directors can update personal_transfers" ON public.personal_transfers;
DROP POLICY IF EXISTS "Admins or directors can delete personal_transfers" ON public.personal_transfers;

CREATE POLICY "staff can view personal_transfers" ON public.personal_transfers
  FOR SELECT TO authenticated
  USING (public.has_staff_access(auth.uid()));

CREATE POLICY "staff can insert personal_transfers" ON public.personal_transfers
  FOR INSERT TO authenticated
  WITH CHECK (public.has_staff_access(auth.uid()));

CREATE POLICY "staff can update personal_transfers" ON public.personal_transfers
  FOR UPDATE TO authenticated
  USING (public.has_staff_access(auth.uid()))
  WITH CHECK (public.has_staff_access(auth.uid()));

CREATE POLICY "staff can delete personal_transfers" ON public.personal_transfers
  FOR DELETE TO authenticated
  USING (public.has_staff_access(auth.uid()));

-- Ensure the table exists in case the original migration was missed
-- (safe no-op if it already exists)
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

-- Grant permissions (idempotent)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_transfers TO authenticated;
GRANT ALL ON public.personal_transfers TO service_role;

-- Enable RLS (idempotent)
ALTER TABLE public.personal_transfers ENABLE ROW LEVEL SECURITY;

-- Indexes (idempotent)
CREATE INDEX IF NOT EXISTS personal_transfers_date_idx ON public.personal_transfers(transfer_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS personal_transfers_from_acc_idx ON public.personal_transfers(from_account);
CREATE INDEX IF NOT EXISTS personal_transfers_to_acc_idx ON public.personal_transfers(to_account);

-- Trigger (idempotent)
DROP TRIGGER IF EXISTS personal_transfers_touch ON public.personal_transfers;
CREATE TRIGGER personal_transfers_touch BEFORE UPDATE ON public.personal_transfers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

NOTIFY pgrst, 'reload schema';

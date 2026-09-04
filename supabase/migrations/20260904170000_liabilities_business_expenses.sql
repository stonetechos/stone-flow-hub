-- Liabilities + Business Expenses (Task #44/#45 of the Purchase-module
-- follow-on build; see engineering/purchase-module-and-sidebar-restructure-
-- plan-2026-09-04.md progress log). Rishi's request:
--   "The business liabilities are also there. Make a section in the
--   sidebar which opens a page in which we can add liabilities. It should
--   have sections like Xth day of every month... There should be Business
--   Expense Column too, in which the current date is already available...
--   blank boxes to enter [description], and in the next box the amount."
--
-- Two independent, simple tables — no cross-referencing needed at the DB
-- level; growthAdvisory.ts (Task #46) reads both client-side to fold into
-- the margin/pricing/sales-target analysis. Both use the same plain
-- two-policy RLS style as carting_agencies (staff read + staff write) —
-- neither is a numbered document (no entity_sequences prefix needed).
--
-- Note on the ₹50L annual net-margin goal Rishi also asked for in the same
-- message: that is NOT a new table. It's stored as a single row in the
-- already-existing public.app_settings key/value store (key
-- "finance.annual_net_margin_goal"), same mechanism used for every other
-- app-wide setting — see src/lib/app-settings/api.ts. No migration needed
-- for it; the UI upserts it on first save. (app_settings writes are
-- admin-only per its RLS policy — see that table's migration — so the
-- goal-editing control on the Liabilities page is admin-gated.)

-- ---------------------------------------------------------------------
-- Liabilities
-- ---------------------------------------------------------------------
CREATE TABLE public.liabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  -- 1-31 = "due on the Nth of every month" grouping key Rishi asked for.
  -- NULL = one-time / no fixed monthly date (its own "No fixed date"
  -- section in the UI rather than forcing a day).
  due_day_of_month INT CHECK (due_day_of_month IS NULL OR (due_day_of_month BETWEEN 1 AND 31)),
  is_recurring BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  sort_order INT NOT NULL DEFAULT 100,
  company_id UUID,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.liabilities TO authenticated;
GRANT ALL ON public.liabilities TO service_role;
ALTER TABLE public.liabilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can read liabilities" ON public.liabilities FOR SELECT TO authenticated
  USING (public.has_staff_access(auth.uid()));
CREATE POLICY "Staff can write liabilities" ON public.liabilities FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));
CREATE TRIGGER liabilities_touch BEFORE UPDATE ON public.liabilities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- Business Expenses (day-to-day petty cash: stationery, tea, maid,
-- donation, etc. — Rishi's own examples)
-- ---------------------------------------------------------------------
CREATE TABLE public.business_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  company_id UUID,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX business_expenses_date_idx ON public.business_expenses(expense_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_expenses TO authenticated;
GRANT ALL ON public.business_expenses TO service_role;
ALTER TABLE public.business_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can read business_expenses" ON public.business_expenses FOR SELECT TO authenticated
  USING (public.has_staff_access(auth.uid()));
CREATE POLICY "Staff can write business_expenses" ON public.business_expenses FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));
CREATE TRIGGER business_expenses_touch BEFORE UPDATE ON public.business_expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

NOTIFY pgrst, 'reload schema';

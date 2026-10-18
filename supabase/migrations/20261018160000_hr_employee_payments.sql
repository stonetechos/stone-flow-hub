-- Migration: HR Employee Intermediate Payments & Advances
-- Timestamp: 2026-10-18 16:00:00

CREATE TABLE IF NOT EXISTS public.hr_employee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL CHECK (amount > 0),
  payment_type text NOT NULL DEFAULT 'advance' CHECK (payment_type IN ('advance', 'salary_part', 'bonus', 'incentive', 'loan', 'settlement')),
  payment_method text NOT NULL DEFAULT 'bank_transfer',
  account_name text,
  reference_no text,
  payroll_month text NOT NULL,
  is_deducted_from_payroll boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'cancelled')),
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hr_emp_payments_emp_idx ON public.hr_employee_payments(employee_id, payroll_month);
CREATE INDEX IF NOT EXISTS hr_emp_payments_month_idx ON public.hr_employee_payments(payroll_month, payment_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_employee_payments TO authenticated;
GRANT ALL ON public.hr_employee_payments TO service_role;

ALTER TABLE public.hr_employee_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hr_emp_payments_read ON public.hr_employee_payments;
CREATE POLICY hr_emp_payments_read ON public.hr_employee_payments
  FOR SELECT TO authenticated
  USING (public.is_hr_admin(auth.uid()) OR employee_id = public.current_employee_id());

DROP POLICY IF EXISTS hr_emp_payments_write ON public.hr_employee_payments;
CREATE POLICY hr_emp_payments_write ON public.hr_employee_payments
  FOR ALL TO authenticated
  USING (public.is_hr_admin(auth.uid()))
  WITH CHECK (public.is_hr_admin(auth.uid()));

DROP TRIGGER IF EXISTS set_hr_employee_payments_updated_at ON public.hr_employee_payments;
CREATE TRIGGER set_hr_employee_payments_updated_at
  BEFORE UPDATE ON public.hr_employee_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

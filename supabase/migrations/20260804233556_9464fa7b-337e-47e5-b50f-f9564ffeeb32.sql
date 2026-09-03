-- ============ Payroll masters ============
CREATE TABLE public.hr_salary_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  kind text NOT NULL DEFAULT 'earning' CHECK (kind IN ('earning','deduction')),
  calc_type text NOT NULL DEFAULT 'fixed' CHECK (calc_type IN ('fixed','percent_of_basic','percent_of_ctc','balance')),
  value numeric NOT NULL DEFAULT 0,
  is_taxable boolean NOT NULL DEFAULT true,
  pf_applicable boolean NOT NULL DEFAULT false,
  esi_applicable boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_salary_components TO authenticated;
GRANT ALL ON public.hr_salary_components TO service_role;
ALTER TABLE public.hr_salary_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "components_read_staff" ON public.hr_salary_components FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "components_write_hr" ON public.hr_salary_components FOR ALL TO authenticated
  USING (public.is_hr_admin(auth.uid())) WITH CHECK (public.is_hr_admin(auth.uid()));
CREATE TRIGGER hr_salary_components_updated BEFORE UPDATE ON public.hr_salary_components FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.hr_payroll_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  pf_employee_pct numeric NOT NULL DEFAULT 12,
  pf_employer_pct numeric NOT NULL DEFAULT 12,
  pf_wage_ceiling numeric NOT NULL DEFAULT 15000,
  pf_limit_to_ceiling boolean NOT NULL DEFAULT true,
  esi_employee_pct numeric NOT NULL DEFAULT 0.75,
  esi_employer_pct numeric NOT NULL DEFAULT 3.25,
  esi_wage_ceiling numeric NOT NULL DEFAULT 21000,
  pt_slabs jsonb NOT NULL DEFAULT '[{"upto":7500,"amount":0},{"upto":10000,"amount":175},{"upto":null,"amount":200}]'::jsonb,
  tds_enabled boolean NOT NULL DEFAULT true,
  standard_deduction numeric NOT NULL DEFAULT 75000,
  overtime_multiplier numeric NOT NULL DEFAULT 1.5,
  payroll_cutoff_day integer NOT NULL DEFAULT 25,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.hr_payroll_settings TO authenticated;
GRANT ALL ON public.hr_payroll_settings TO service_role;
ALTER TABLE public.hr_payroll_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payroll_settings_read_staff" ON public.hr_payroll_settings FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "payroll_settings_write_hr" ON public.hr_payroll_settings FOR ALL TO authenticated
  USING (public.is_hr_admin(auth.uid())) WITH CHECK (public.is_hr_admin(auth.uid()));
CREATE TRIGGER hr_payroll_settings_updated BEFORE UPDATE ON public.hr_payroll_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.hr_payroll_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

-- ============ Salary structures ============
CREATE TABLE public.hr_salary_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  ctc_annual numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','superseded')),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX hr_salary_structures_emp_idx ON public.hr_salary_structures(employee_id, effective_from DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_salary_structures TO authenticated;
GRANT ALL ON public.hr_salary_structures TO service_role;
ALTER TABLE public.hr_salary_structures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "structures_read" ON public.hr_salary_structures FOR SELECT TO authenticated
  USING (public.is_hr_admin(auth.uid()) OR employee_id = public.current_employee_id());
CREATE POLICY "structures_write_hr" ON public.hr_salary_structures FOR ALL TO authenticated
  USING (public.is_hr_admin(auth.uid())) WITH CHECK (public.is_hr_admin(auth.uid()));
CREATE TRIGGER hr_salary_structures_updated BEFORE UPDATE ON public.hr_salary_structures FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.hr_salary_structure_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id uuid NOT NULL REFERENCES public.hr_salary_structures(id) ON DELETE CASCADE,
  component_id uuid REFERENCES public.hr_salary_components(id) ON DELETE SET NULL,
  label text NOT NULL,
  kind text NOT NULL DEFAULT 'earning' CHECK (kind IN ('earning','deduction')),
  monthly_amount numeric NOT NULL DEFAULT 0,
  is_taxable boolean NOT NULL DEFAULT true,
  pf_applicable boolean NOT NULL DEFAULT false,
  esi_applicable boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX hr_salary_structure_lines_idx ON public.hr_salary_structure_lines(structure_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_salary_structure_lines TO authenticated;
GRANT ALL ON public.hr_salary_structure_lines TO service_role;
ALTER TABLE public.hr_salary_structure_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "structure_lines_read" ON public.hr_salary_structure_lines FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.hr_salary_structures s WHERE s.id = structure_id
    AND (public.is_hr_admin(auth.uid()) OR s.employee_id = public.current_employee_id())));
CREATE POLICY "structure_lines_write_hr" ON public.hr_salary_structure_lines FOR ALL TO authenticated
  USING (public.is_hr_admin(auth.uid())) WITH CHECK (public.is_hr_admin(auth.uid()));

-- ============ Loans & reimbursements ============
CREATE TABLE public.hr_loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  loan_type text NOT NULL DEFAULT 'advance' CHECK (loan_type IN ('advance','loan')),
  principal numeric NOT NULL DEFAULT 0,
  installment_amount numeric NOT NULL DEFAULT 0,
  installments_total integer NOT NULL DEFAULT 1,
  installments_paid integer NOT NULL DEFAULT 0,
  outstanding numeric NOT NULL DEFAULT 0,
  start_month date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed','cancelled')),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX hr_loans_emp_idx ON public.hr_loans(employee_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_loans TO authenticated;
GRANT ALL ON public.hr_loans TO service_role;
ALTER TABLE public.hr_loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loans_read" ON public.hr_loans FOR SELECT TO authenticated
  USING (public.is_hr_admin(auth.uid()) OR employee_id = public.current_employee_id());
CREATE POLICY "loans_write_hr" ON public.hr_loans FOR ALL TO authenticated
  USING (public.is_hr_admin(auth.uid())) WITH CHECK (public.is_hr_admin(auth.uid()));
CREATE TRIGGER hr_loans_updated BEFORE UPDATE ON public.hr_loans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.hr_reimbursements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  claim_date date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL DEFAULT 'general',
  amount numeric NOT NULL DEFAULT 0,
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','paid')),
  approved_by uuid,
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX hr_reimbursements_emp_idx ON public.hr_reimbursements(employee_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_reimbursements TO authenticated;
GRANT ALL ON public.hr_reimbursements TO service_role;
ALTER TABLE public.hr_reimbursements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reimb_read" ON public.hr_reimbursements FOR SELECT TO authenticated
  USING (public.is_hr_admin(auth.uid()) OR employee_id = public.current_employee_id());
CREATE POLICY "reimb_insert_own" ON public.hr_reimbursements FOR INSERT TO authenticated
  WITH CHECK (public.is_hr_admin(auth.uid()) OR employee_id = public.current_employee_id());
CREATE POLICY "reimb_write_hr" ON public.hr_reimbursements FOR UPDATE TO authenticated
  USING (public.is_hr_admin(auth.uid())) WITH CHECK (public.is_hr_admin(auth.uid()));
CREATE POLICY "reimb_delete_hr" ON public.hr_reimbursements FOR DELETE TO authenticated
  USING (public.is_hr_admin(auth.uid()));
CREATE TRIGGER hr_reimbursements_updated BEFORE UPDATE ON public.hr_reimbursements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ Payroll runs & payslips ============
CREATE TABLE public.hr_payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_code text,
  period_month integer NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year integer NOT NULL CHECK (period_year BETWEEN 2000 AND 2100),
  branch_id uuid REFERENCES public.hr_branches(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_approval','approved','paid','cancelled')),
  employee_count integer NOT NULL DEFAULT 0,
  total_gross numeric NOT NULL DEFAULT 0,
  total_deductions numeric NOT NULL DEFAULT 0,
  total_net numeric NOT NULL DEFAULT 0,
  total_employer_cost numeric NOT NULL DEFAULT 0,
  processed_at timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  paid_at timestamptz,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX hr_payroll_runs_period_idx ON public.hr_payroll_runs(period_year, period_month, COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE status <> 'cancelled';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_payroll_runs TO authenticated;
GRANT ALL ON public.hr_payroll_runs TO service_role;
ALTER TABLE public.hr_payroll_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payroll_runs_read_hr" ON public.hr_payroll_runs FOR SELECT TO authenticated
  USING (public.is_hr_admin(auth.uid()));
CREATE POLICY "payroll_runs_write_hr" ON public.hr_payroll_runs FOR ALL TO authenticated
  USING (public.is_hr_admin(auth.uid())) WITH CHECK (public.is_hr_admin(auth.uid()));
CREATE TRIGGER hr_payroll_runs_updated BEFORE UPDATE ON public.hr_payroll_runs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.hr_payslips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.hr_payroll_runs(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  employee_name text,
  employee_code text,
  payable_days numeric NOT NULL DEFAULT 0,
  present_days numeric NOT NULL DEFAULT 0,
  lop_days numeric NOT NULL DEFAULT 0,
  paid_leave_days numeric NOT NULL DEFAULT 0,
  overtime_hours numeric NOT NULL DEFAULT 0,
  overtime_amount numeric NOT NULL DEFAULT 0,
  gross_earnings numeric NOT NULL DEFAULT 0,
  total_deductions numeric NOT NULL DEFAULT 0,
  net_pay numeric NOT NULL DEFAULT 0,
  pf_employee numeric NOT NULL DEFAULT 0,
  pf_employer numeric NOT NULL DEFAULT 0,
  esi_employee numeric NOT NULL DEFAULT 0,
  esi_employer numeric NOT NULL DEFAULT 0,
  professional_tax numeric NOT NULL DEFAULT 0,
  tds numeric NOT NULL DEFAULT 0,
  loan_deduction numeric NOT NULL DEFAULT 0,
  reimbursements numeric NOT NULL DEFAULT 0,
  employer_cost numeric NOT NULL DEFAULT 0,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX hr_payslips_run_emp_idx ON public.hr_payslips(run_id, employee_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_payslips TO authenticated;
GRANT ALL ON public.hr_payslips TO service_role;
ALTER TABLE public.hr_payslips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payslips_read" ON public.hr_payslips FOR SELECT TO authenticated
  USING (public.is_hr_admin(auth.uid()) OR employee_id = public.current_employee_id());
CREATE POLICY "payslips_write_hr" ON public.hr_payslips FOR ALL TO authenticated
  USING (public.is_hr_admin(auth.uid())) WITH CHECK (public.is_hr_admin(auth.uid()));

CREATE TABLE public.hr_payslip_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payslip_id uuid NOT NULL REFERENCES public.hr_payslips(id) ON DELETE CASCADE,
  label text NOT NULL,
  kind text NOT NULL DEFAULT 'earning' CHECK (kind IN ('earning','deduction','employer')),
  amount numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0
);
CREATE INDEX hr_payslip_lines_idx ON public.hr_payslip_lines(payslip_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_payslip_lines TO authenticated;
GRANT ALL ON public.hr_payslip_lines TO service_role;
ALTER TABLE public.hr_payslip_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payslip_lines_read" ON public.hr_payslip_lines FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.hr_payslips p WHERE p.id = payslip_id
    AND (public.is_hr_admin(auth.uid()) OR p.employee_id = public.current_employee_id())));
CREATE POLICY "payslip_lines_write_hr" ON public.hr_payslip_lines FOR ALL TO authenticated
  USING (public.is_hr_admin(auth.uid())) WITH CHECK (public.is_hr_admin(auth.uid()));

CREATE TABLE public.hr_loan_repayments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES public.hr_loans(id) ON DELETE CASCADE,
  payslip_id uuid REFERENCES public.hr_payslips(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  paid_on date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX hr_loan_repayments_idx ON public.hr_loan_repayments(loan_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_loan_repayments TO authenticated;
GRANT ALL ON public.hr_loan_repayments TO service_role;
ALTER TABLE public.hr_loan_repayments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loan_repayments_read" ON public.hr_loan_repayments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.hr_loans l WHERE l.id = loan_id
    AND (public.is_hr_admin(auth.uid()) OR l.employee_id = public.current_employee_id())));
CREATE POLICY "loan_repayments_write_hr" ON public.hr_loan_repayments FOR ALL TO authenticated
  USING (public.is_hr_admin(auth.uid())) WITH CHECK (public.is_hr_admin(auth.uid()));
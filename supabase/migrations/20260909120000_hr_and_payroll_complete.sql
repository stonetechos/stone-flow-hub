-- =============================================================================
-- Migration: HR Operations & Payroll Complete Foundation
-- Timestamp: 2026-09-09 12:00:00
-- Consolidates:
--   1. HR Foundation (Branches, Shifts, Attendance, Leaves, Devices)
--   2. Attendance Helper Functions & Staff/HR RLS Policies
--   3. Payroll Masters (Salary Components, Settings, Salary Structures, Loans, Runs, Payslips)
-- Idempotent & safe to re-run in Supabase SQL Editor.
-- =============================================================================

-- 1. Roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'hr';

-- 2. Enums
DO $$ BEGIN CREATE TYPE public.hr_shift_type AS ENUM ('general','night','flexible','rotational'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.hr_punch_direction AS ENUM ('in','out','break_in','break_out'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.hr_punch_source AS ENUM ('biometric','mobile','web','manual','import'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.hr_device_vendor AS ENUM ('zkteco','essl','matrix','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.hr_approval_status AS ENUM ('not_required','pending','approved','rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.hr_attendance_status AS ENUM ('present','absent','late','half_day','holiday','weekend','on_leave','wfh','field_duty','tour','training','comp_off'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.hr_leave_status AS ENUM ('draft','pending','manager_approved','approved','rejected','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Branches
CREATE TABLE IF NOT EXISTS public.hr_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE,
  address text,
  city text,
  state text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  geofence_radius_m integer NOT NULL DEFAULT 200,
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_branches TO authenticated;
GRANT ALL ON public.hr_branches TO service_role;
ALTER TABLE public.hr_branches ENABLE ROW LEVEL SECURITY;

-- 4. Shifts
CREATE TABLE IF NOT EXISTS public.hr_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE,
  shift_type public.hr_shift_type NOT NULL DEFAULT 'general',
  start_time time,
  end_time time,
  break_minutes integer NOT NULL DEFAULT 60,
  grace_minutes integer NOT NULL DEFAULT 10,
  half_day_hours numeric(4,2) NOT NULL DEFAULT 4,
  full_day_hours numeric(4,2) NOT NULL DEFAULT 8,
  early_leaving_grace_minutes integer NOT NULL DEFAULT 10,
  weekly_offs integer[] NOT NULL DEFAULT '{0}',
  overtime_enabled boolean NOT NULL DEFAULT false,
  overtime_after_minutes integer NOT NULL DEFAULT 30,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_shifts TO authenticated;
GRANT ALL ON public.hr_shifts TO service_role;
ALTER TABLE public.hr_shifts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.hr_shift_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  shift_id uuid NOT NULL REFERENCES public.hr_shifts(id) ON DELETE RESTRICT,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hr_shift_assignments_emp_idx ON public.hr_shift_assignments(employee_id, effective_from DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_shift_assignments TO authenticated;
GRANT ALL ON public.hr_shift_assignments TO service_role;
ALTER TABLE public.hr_shift_assignments ENABLE ROW LEVEL SECURITY;

-- 5. Holidays
CREATE TABLE IF NOT EXISTS public.hr_holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  holiday_date date NOT NULL,
  branch_id uuid REFERENCES public.hr_branches(id) ON DELETE CASCADE,
  is_optional boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS hr_holidays_unique_idx ON public.hr_holidays(holiday_date, COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_holidays TO authenticated;
GRANT ALL ON public.hr_holidays TO service_role;
ALTER TABLE public.hr_holidays ENABLE ROW LEVEL SECURITY;

-- 6. Attendance devices
CREATE TABLE IF NOT EXISTS public.hr_attendance_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  vendor public.hr_device_vendor NOT NULL DEFAULT 'other',
  serial_no text UNIQUE,
  branch_id uuid REFERENCES public.hr_branches(id) ON DELETE SET NULL,
  ip_address text,
  last_sync_at timestamptz,
  last_sync_status text,
  is_active boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_attendance_devices TO authenticated;
GRANT ALL ON public.hr_attendance_devices TO service_role;
ALTER TABLE public.hr_attendance_devices ENABLE ROW LEVEL SECURITY;

-- 7. Attendance punches
CREATE TABLE IF NOT EXISTS public.hr_attendance_punches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  punch_at timestamptz NOT NULL DEFAULT now(),
  direction public.hr_punch_direction NOT NULL,
  source public.hr_punch_source NOT NULL DEFAULT 'mobile',
  device_id uuid REFERENCES public.hr_attendance_devices(id) ON DELETE SET NULL,
  branch_id uuid REFERENCES public.hr_branches(id) ON DELETE SET NULL,
  latitude numeric(10,7),
  longitude numeric(10,7),
  gps_accuracy_m numeric(8,2),
  battery_pct integer,
  network_status text,
  device_info text,
  photo_url text,
  within_geofence boolean,
  distance_m numeric(10,2),
  reason text,
  approval_status public.hr_approval_status NOT NULL DEFAULT 'not_required',
  approved_by uuid,
  approved_at timestamptz,
  external_ref text,
  is_duplicate boolean NOT NULL DEFAULT false,
  synced_at timestamptz,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hr_punches_emp_time_idx ON public.hr_attendance_punches(employee_id, punch_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS hr_punches_external_ref_idx ON public.hr_attendance_punches(external_ref) WHERE external_ref IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_attendance_punches TO authenticated;
GRANT ALL ON public.hr_attendance_punches TO service_role;
ALTER TABLE public.hr_attendance_punches ENABLE ROW LEVEL SECURITY;

-- 8. Daily attendance
CREATE TABLE IF NOT EXISTS public.hr_attendance_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  status public.hr_attendance_status NOT NULL DEFAULT 'absent',
  shift_id uuid REFERENCES public.hr_shifts(id) ON DELETE SET NULL,
  first_in timestamptz,
  last_out timestamptz,
  working_minutes integer NOT NULL DEFAULT 0,
  break_minutes integer NOT NULL DEFAULT 0,
  late_minutes integer NOT NULL DEFAULT 0,
  early_leaving_minutes integer NOT NULL DEFAULT 0,
  overtime_minutes integer NOT NULL DEFAULT 0,
  is_manual_override boolean NOT NULL DEFAULT false,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, work_date)
);
CREATE INDEX IF NOT EXISTS hr_attendance_days_date_idx ON public.hr_attendance_days(work_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_attendance_days TO authenticated;
GRANT ALL ON public.hr_attendance_days TO service_role;
ALTER TABLE public.hr_attendance_days ENABLE ROW LEVEL SECURITY;

-- 9. Leaves
CREATE TABLE IF NOT EXISTS public.hr_leave_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE,
  is_paid boolean NOT NULL DEFAULT true,
  accrual_per_year numeric(6,2) NOT NULL DEFAULT 0,
  carry_forward boolean NOT NULL DEFAULT false,
  max_carry_forward numeric(6,2) NOT NULL DEFAULT 0,
  requires_approval boolean NOT NULL DEFAULT true,
  max_consecutive_days integer,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_leave_types TO authenticated;
GRANT ALL ON public.hr_leave_types TO service_role;
ALTER TABLE public.hr_leave_types ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.hr_leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES public.hr_leave_types(id) ON DELETE CASCADE,
  year integer NOT NULL,
  opening numeric(6,2) NOT NULL DEFAULT 0,
  accrued numeric(6,2) NOT NULL DEFAULT 0,
  used numeric(6,2) NOT NULL DEFAULT 0,
  carried_forward numeric(6,2) NOT NULL DEFAULT 0,
  expires_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, leave_type_id, year)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_leave_balances TO authenticated;
GRANT ALL ON public.hr_leave_balances TO service_role;
ALTER TABLE public.hr_leave_balances ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.hr_leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES public.hr_leave_types(id) ON DELETE RESTRICT,
  from_date date NOT NULL,
  to_date date NOT NULL,
  days numeric(5,2) NOT NULL DEFAULT 1,
  is_half_day boolean NOT NULL DEFAULT false,
  reason text,
  status public.hr_leave_status NOT NULL DEFAULT 'pending',
  manager_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  manager_action_by uuid,
  manager_action_at timestamptz,
  hr_action_by uuid,
  hr_action_at timestamptz,
  rejection_reason text,
  attachment_url text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hr_leave_requests_emp_idx ON public.hr_leave_requests(employee_id, from_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_leave_requests TO authenticated;
GRANT ALL ON public.hr_leave_requests TO service_role;
ALTER TABLE public.hr_leave_requests ENABLE ROW LEVEL SECURITY;

-- 10. Employee extensions
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.hr_branches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS confirmation_date date,
  ADD COLUMN IF NOT EXISTS probation_end_date date,
  ADD COLUMN IF NOT EXISTS resignation_date date,
  ADD COLUMN IF NOT EXISTS exit_date date,
  ADD COLUMN IF NOT EXISTS passport_no text,
  ADD COLUMN IF NOT EXISTS driving_license_no text,
  ADD COLUMN IF NOT EXISTS pf_no text,
  ADD COLUMN IF NOT EXISTS esic_no text,
  ADD COLUMN IF NOT EXISTS uan_no text,
  ADD COLUMN IF NOT EXISTS nominee jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS education jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS experience jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 11. Helper Functions
CREATE OR REPLACE FUNCTION public.is_hr_admin(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _uid
      AND role::text IN ('admin', 'super_admin', 'hr')
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_hr_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_hr_admin(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_hr_manager(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _uid
      AND role::text IN ('admin', 'super_admin', 'hr', 'sales_manager')
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_hr_manager(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_hr_manager(uuid) TO authenticated, service_role;

-- 12. Policies for Attendance & Leaves
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['hr_branches','hr_shifts','hr_shift_assignments','hr_holidays','hr_leave_types']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_select_staff', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_staff(auth.uid()))', t||'_select_staff', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_write_hr', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_hr_admin(auth.uid())) WITH CHECK (public.is_hr_admin(auth.uid()))', t||'_write_hr', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS hr_devices_all_hr ON public.hr_attendance_devices;
CREATE POLICY hr_devices_all_hr ON public.hr_attendance_devices
  FOR ALL TO authenticated
  USING (public.is_hr_admin(auth.uid()))
  WITH CHECK (public.is_hr_admin(auth.uid()));

DROP POLICY IF EXISTS hr_punches_select ON public.hr_attendance_punches;
CREATE POLICY hr_punches_select ON public.hr_attendance_punches
  FOR SELECT TO authenticated
  USING (public.is_hr_manager(auth.uid()) OR employee_id = public.current_employee_id());

DROP POLICY IF EXISTS hr_punches_insert_self ON public.hr_attendance_punches;
CREATE POLICY hr_punches_insert_self ON public.hr_attendance_punches
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_hr_admin(auth.uid())
    OR (employee_id = public.current_employee_id() AND approval_status IN ('not_required','pending'))
  );

DROP POLICY IF EXISTS hr_punches_update_hr ON public.hr_attendance_punches;
CREATE POLICY hr_punches_update_hr ON public.hr_attendance_punches
  FOR UPDATE TO authenticated
  USING (public.is_hr_manager(auth.uid()))
  WITH CHECK (public.is_hr_manager(auth.uid()));

DROP POLICY IF EXISTS hr_punches_delete_hr ON public.hr_attendance_punches;
CREATE POLICY hr_punches_delete_hr ON public.hr_attendance_punches
  FOR DELETE TO authenticated
  USING (public.is_hr_admin(auth.uid()));

DROP POLICY IF EXISTS hr_days_select ON public.hr_attendance_days;
CREATE POLICY hr_days_select ON public.hr_attendance_days
  FOR SELECT TO authenticated
  USING (public.is_hr_manager(auth.uid()) OR employee_id = public.current_employee_id());

DROP POLICY IF EXISTS hr_days_write_hr ON public.hr_attendance_days;
CREATE POLICY hr_days_write_hr ON public.hr_attendance_days
  FOR ALL TO authenticated
  USING (public.is_hr_admin(auth.uid()))
  WITH CHECK (public.is_hr_admin(auth.uid()));

DROP POLICY IF EXISTS hr_balances_select ON public.hr_leave_balances;
CREATE POLICY hr_balances_select ON public.hr_leave_balances
  FOR SELECT TO authenticated
  USING (public.is_hr_manager(auth.uid()) OR employee_id = public.current_employee_id());

DROP POLICY IF EXISTS hr_balances_write_hr ON public.hr_leave_balances;
CREATE POLICY hr_balances_write_hr ON public.hr_leave_balances
  FOR ALL TO authenticated
  USING (public.is_hr_admin(auth.uid()))
  WITH CHECK (public.is_hr_admin(auth.uid()));

DROP POLICY IF EXISTS hr_requests_select ON public.hr_leave_requests;
CREATE POLICY hr_requests_select ON public.hr_leave_requests
  FOR SELECT TO authenticated
  USING (
    public.is_hr_manager(auth.uid())
    OR employee_id = public.current_employee_id()
    OR manager_id = public.current_employee_id()
  );

DROP POLICY IF EXISTS hr_requests_insert_self ON public.hr_leave_requests;
CREATE POLICY hr_requests_insert_self ON public.hr_leave_requests
  FOR INSERT TO authenticated
  WITH CHECK (public.is_hr_admin(auth.uid()) OR employee_id = public.current_employee_id());

DROP POLICY IF EXISTS hr_requests_update ON public.hr_leave_requests;
CREATE POLICY hr_requests_update ON public.hr_leave_requests
  FOR UPDATE TO authenticated
  USING (
    public.is_hr_admin(auth.uid())
    OR manager_id = public.current_employee_id()
    OR (employee_id = public.current_employee_id() AND status = 'pending')
  )
  WITH CHECK (
    public.is_hr_admin(auth.uid())
    OR manager_id = public.current_employee_id()
    OR (employee_id = public.current_employee_id() AND status = 'pending')
  );

DROP POLICY IF EXISTS hr_requests_delete_hr ON public.hr_leave_requests;
CREATE POLICY hr_requests_delete_hr ON public.hr_leave_requests
  FOR DELETE TO authenticated
  USING (public.is_hr_admin(auth.uid()));

-- =============================================================================
-- 13. Payroll Masters & Settings
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.hr_salary_components (
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

DROP POLICY IF EXISTS "components_read_staff" ON public.hr_salary_components;
CREATE POLICY "components_read_staff" ON public.hr_salary_components FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "components_write_hr" ON public.hr_salary_components;
CREATE POLICY "components_write_hr" ON public.hr_salary_components FOR ALL TO authenticated
  USING (public.is_hr_admin(auth.uid())) WITH CHECK (public.is_hr_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.hr_payroll_settings (
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

DROP POLICY IF EXISTS "payroll_settings_read_staff" ON public.hr_payroll_settings;
CREATE POLICY "payroll_settings_read_staff" ON public.hr_payroll_settings FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "payroll_settings_write_hr" ON public.hr_payroll_settings;
CREATE POLICY "payroll_settings_write_hr" ON public.hr_payroll_settings FOR ALL TO authenticated
  USING (public.is_hr_admin(auth.uid())) WITH CHECK (public.is_hr_admin(auth.uid()));

INSERT INTO public.hr_payroll_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

-- 14. Salary Structures
CREATE TABLE IF NOT EXISTS public.hr_salary_structures (
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
CREATE INDEX IF NOT EXISTS hr_salary_structures_emp_idx ON public.hr_salary_structures(employee_id, effective_from DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_salary_structures TO authenticated;
GRANT ALL ON public.hr_salary_structures TO service_role;
ALTER TABLE public.hr_salary_structures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "structures_read" ON public.hr_salary_structures;
CREATE POLICY "structures_read" ON public.hr_salary_structures FOR SELECT TO authenticated
  USING (public.is_hr_admin(auth.uid()) OR employee_id = public.current_employee_id());

DROP POLICY IF EXISTS "structures_write_hr" ON public.hr_salary_structures;
CREATE POLICY "structures_write_hr" ON public.hr_salary_structures FOR ALL TO authenticated
  USING (public.is_hr_admin(auth.uid())) WITH CHECK (public.is_hr_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.hr_salary_structure_lines (
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
CREATE INDEX IF NOT EXISTS hr_salary_structure_lines_idx ON public.hr_salary_structure_lines(structure_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_salary_structure_lines TO authenticated;
GRANT ALL ON public.hr_salary_structure_lines TO service_role;
ALTER TABLE public.hr_salary_structure_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "structure_lines_read" ON public.hr_salary_structure_lines;
CREATE POLICY "structure_lines_read" ON public.hr_salary_structure_lines FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.hr_salary_structures s WHERE s.id = structure_id
    AND (public.is_hr_admin(auth.uid()) OR s.employee_id = public.current_employee_id())));

DROP POLICY IF EXISTS "structure_lines_write_hr" ON public.hr_salary_structure_lines;
CREATE POLICY "structure_lines_write_hr" ON public.hr_salary_structure_lines FOR ALL TO authenticated
  USING (public.is_hr_admin(auth.uid())) WITH CHECK (public.is_hr_admin(auth.uid()));

-- 15. Loans & Reimbursements
CREATE TABLE IF NOT EXISTS public.hr_loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  loan_type text NOT NULL DEFAULT 'advance' CHECK (loan_type IN ('advance','loan')),
  principal numeric NOT NULL,
  installment_amount numeric NOT NULL,
  installments_total integer NOT NULL,
  installments_paid integer NOT NULL DEFAULT 0,
  outstanding numeric NOT NULL,
  start_month text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed','written_off')),
  reason text,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hr_loans_emp_idx ON public.hr_loans(employee_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_loans TO authenticated;
GRANT ALL ON public.hr_loans TO service_role;
ALTER TABLE public.hr_loans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "loans_read" ON public.hr_loans;
CREATE POLICY "loans_read" ON public.hr_loans FOR SELECT TO authenticated
  USING (public.is_hr_admin(auth.uid()) OR employee_id = public.current_employee_id());

DROP POLICY IF EXISTS "loans_write_hr" ON public.hr_loans;
CREATE POLICY "loans_write_hr" ON public.hr_loans FOR ALL TO authenticated
  USING (public.is_hr_admin(auth.uid())) WITH CHECK (public.is_hr_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.hr_reimbursements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  claim_date date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL,
  amount numeric NOT NULL,
  description text,
  receipt_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','paid')),
  approved_by uuid,
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hr_reimbursements_emp_idx ON public.hr_reimbursements(employee_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_reimbursements TO authenticated;
GRANT ALL ON public.hr_reimbursements TO service_role;
ALTER TABLE public.hr_reimbursements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reimb_read" ON public.hr_reimbursements;
CREATE POLICY "reimb_read" ON public.hr_reimbursements FOR SELECT TO authenticated
  USING (public.is_hr_admin(auth.uid()) OR employee_id = public.current_employee_id());

DROP POLICY IF EXISTS "reimb_insert_own" ON public.hr_reimbursements;
CREATE POLICY "reimb_insert_own" ON public.hr_reimbursements FOR INSERT TO authenticated
  WITH CHECK (public.is_hr_admin(auth.uid()) OR employee_id = public.current_employee_id());

DROP POLICY IF EXISTS "reimb_write_hr" ON public.hr_reimbursements;
CREATE POLICY "reimb_write_hr" ON public.hr_reimbursements FOR UPDATE TO authenticated
  USING (public.is_hr_admin(auth.uid())) WITH CHECK (public.is_hr_admin(auth.uid()));

DROP POLICY IF EXISTS "reimb_delete_hr" ON public.hr_reimbursements;
CREATE POLICY "reimb_delete_hr" ON public.hr_reimbursements FOR DELETE TO authenticated
  USING (public.is_hr_admin(auth.uid()));

-- 16. Payroll Runs & Payslips
CREATE TABLE IF NOT EXISTS public.hr_payroll_runs (
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
CREATE UNIQUE INDEX IF NOT EXISTS hr_payroll_runs_period_idx ON public.hr_payroll_runs(period_year, period_month, COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE status <> 'cancelled';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_payroll_runs TO authenticated;
GRANT ALL ON public.hr_payroll_runs TO service_role;
ALTER TABLE public.hr_payroll_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payroll_runs_read_hr" ON public.hr_payroll_runs;
CREATE POLICY "payroll_runs_read_hr" ON public.hr_payroll_runs FOR SELECT TO authenticated
  USING (public.is_hr_admin(auth.uid()));

DROP POLICY IF EXISTS "payroll_runs_write_hr" ON public.hr_payroll_runs;
CREATE POLICY "payroll_runs_write_hr" ON public.hr_payroll_runs FOR ALL TO authenticated
  USING (public.is_hr_admin(auth.uid())) WITH CHECK (public.is_hr_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.hr_payslips (
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
CREATE UNIQUE INDEX IF NOT EXISTS hr_payslips_run_emp_idx ON public.hr_payslips(run_id, employee_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_payslips TO authenticated;
GRANT ALL ON public.hr_payslips TO service_role;
ALTER TABLE public.hr_payslips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payslips_read" ON public.hr_payslips;
CREATE POLICY "payslips_read" ON public.hr_payslips FOR SELECT TO authenticated
  USING (public.is_hr_admin(auth.uid()) OR employee_id = public.current_employee_id());

DROP POLICY IF EXISTS "payslips_write_hr" ON public.hr_payslips;
CREATE POLICY "payslips_write_hr" ON public.hr_payslips FOR ALL TO authenticated
  USING (public.is_hr_admin(auth.uid())) WITH CHECK (public.is_hr_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.hr_payslip_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payslip_id uuid NOT NULL REFERENCES public.hr_payslips(id) ON DELETE CASCADE,
  label text NOT NULL,
  kind text NOT NULL DEFAULT 'earning' CHECK (kind IN ('earning','deduction','employer')),
  amount numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS hr_payslip_lines_idx ON public.hr_payslip_lines(payslip_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_payslip_lines TO authenticated;
GRANT ALL ON public.hr_payslip_lines TO service_role;
ALTER TABLE public.hr_payslip_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payslip_lines_read" ON public.hr_payslip_lines;
CREATE POLICY "payslip_lines_read" ON public.hr_payslip_lines FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.hr_payslips p WHERE p.id = payslip_id
    AND (public.is_hr_admin(auth.uid()) OR p.employee_id = public.current_employee_id())));

DROP POLICY IF EXISTS "payslip_lines_write_hr" ON public.hr_payslip_lines;
CREATE POLICY "payslip_lines_write_hr" ON public.hr_payslip_lines FOR ALL TO authenticated
  USING (public.is_hr_admin(auth.uid())) WITH CHECK (public.is_hr_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.hr_loan_repayments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES public.hr_loans(id) ON DELETE CASCADE,
  payslip_id uuid REFERENCES public.hr_payslips(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  paid_on date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hr_loan_repayments_idx ON public.hr_loan_repayments(loan_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_loan_repayments TO authenticated;
GRANT ALL ON public.hr_loan_repayments TO service_role;
ALTER TABLE public.hr_loan_repayments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "loan_repayments_read" ON public.hr_loan_repayments;
CREATE POLICY "loan_repayments_read" ON public.hr_loan_repayments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.hr_loans l WHERE l.id = loan_id
    AND (public.is_hr_admin(auth.uid()) OR l.employee_id = public.current_employee_id())));

DROP POLICY IF EXISTS "loan_repayments_write_hr" ON public.hr_loan_repayments;
CREATE POLICY "loan_repayments_write_hr" ON public.hr_loan_repayments FOR ALL TO authenticated
  USING (public.is_hr_admin(auth.uid())) WITH CHECK (public.is_hr_admin(auth.uid()));

-- 17. Triggers for updated_at
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'hr_branches',
    'hr_shifts',
    'hr_shift_assignments',
    'hr_holidays',
    'hr_attendance_devices',
    'hr_attendance_punches',
    'hr_attendance_days',
    'hr_leave_types',
    'hr_leave_balances',
    'hr_leave_requests',
    'hr_salary_components',
    'hr_payroll_settings',
    'hr_salary_structures',
    'hr_loans',
    'hr_reimbursements',
    'hr_payroll_runs'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I', t);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t);
  END LOOP;
END $$;

-- ============ Roles ============
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'hr';

-- ============ Enums ============
DO $$ BEGIN CREATE TYPE public.hr_shift_type AS ENUM ('general','night','flexible','rotational'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.hr_punch_direction AS ENUM ('in','out','break_in','break_out'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.hr_punch_source AS ENUM ('biometric','mobile','web','manual','import'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.hr_device_vendor AS ENUM ('zkteco','essl','matrix','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.hr_approval_status AS ENUM ('not_required','pending','approved','rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.hr_attendance_status AS ENUM ('present','absent','late','half_day','holiday','weekend','on_leave','wfh','field_duty','tour','training','comp_off'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.hr_leave_status AS ENUM ('draft','pending','manager_approved','approved','rejected','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ Branches ============
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

-- ============ Shifts ============
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

-- ============ Holidays ============
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

-- ============ Attendance devices ============
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

-- ============ Punches ============
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

-- ============ Daily attendance ============
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

-- ============ Leave ============
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

-- ============ Employee master extensions ============
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

-- ============ updated_at triggers ============
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['hr_branches','hr_shifts','hr_shift_assignments','hr_holidays','hr_attendance_devices','hr_attendance_punches','hr_attendance_days','hr_leave_types','hr_leave_balances','hr_leave_requests']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I', t);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t);
  END LOOP;
END $$;

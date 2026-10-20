-- Migration: Revoke software login rights and access for terminated employees
-- Ensures terminated staff cannot sign in or access any ERP functionality.

-- 1. Revoke all user_roles and deactivate profiles for rp140528@gmail.com and any terminated/resigned employee
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT DISTINCT u.id AS uid
    FROM auth.users u
    WHERE u.email ILIKE 'rp140528@gmail.com'
       OR EXISTS (
         SELECT 1 FROM public.employees e 
         WHERE (e.user_id = u.id OR (u.email IS NOT NULL AND e.email ILIKE u.email))
           AND e.employment_status IN ('terminated', 'resigned')
       )
  ) LOOP
    DELETE FROM public.user_roles WHERE user_id = r.uid;
    UPDATE public.profiles SET is_active = false, updated_at = now() WHERE id = r.uid;
  END LOOP;
END $$;

-- 2. Function & trigger: Automatically revoke roles & deactivate profile whenever an employee is terminated/resigned
CREATE OR REPLACE FUNCTION public.trg_sync_terminated_employee_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_user_id uuid;
BEGIN
  IF NEW.employment_status IN ('terminated', 'resigned') THEN
    v_target_user_id := NEW.user_id;
    IF v_target_user_id IS NULL AND NEW.email IS NOT NULL THEN
      SELECT id INTO v_target_user_id FROM auth.users WHERE email ILIKE NEW.email LIMIT 1;
    END IF;

    IF v_target_user_id IS NOT NULL THEN
      DELETE FROM public.user_roles WHERE user_id = v_target_user_id;
      UPDATE public.profiles 
      SET is_active = false, updated_at = now()
      WHERE id = v_target_user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_employee_status_access_sync ON public.employees;
CREATE TRIGGER trg_employee_status_access_sync
  AFTER INSERT OR UPDATE OF employment_status, email, user_id
  ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_terminated_employee_access();

-- 3. Upgrade public.has_staff_access to strictly reject terminated employees and inactive profiles
CREATE OR REPLACE FUNCTION public.has_staff_access(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  IF _user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Deactivated profile check
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND is_active = false) THEN
    RETURN false;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = _user_id;

  -- Terminated / resigned / suspended employee check
  IF EXISTS (
    SELECT 1 FROM public.employees 
    WHERE (user_id = _user_id OR (v_email IS NOT NULL AND email ILIKE v_email))
      AND employment_status IN ('terminated', 'resigned')
  ) THEN
    RETURN false;
  END IF;

  -- 1. Explicit role check
  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('admin', 'super_admin', 'sales_manager', 'sales', 'purchase', 'hr')
  ) THEN
    RETURN true;
  END IF;

  -- 2. Email-based check for Raman, Rishi, and Stone Tech official domain (excluded rp140528)
  IF v_email IS NOT NULL AND (
    v_email ILIKE '%raman%'
    OR v_email ILIKE '%rishi%'
    OR v_email ILIKE '%@stonetech.in'
    OR v_email ILIKE 'info@stonetech.in'
    OR v_email ILIKE 'raman.pupneja@gmail.com'
    OR v_email ILIKE 'stonetechrajasthan@gmail.com'
  ) THEN
    RETURN true;
  END IF;

  -- 3. Allow internal active authenticated user who is not a vendor portal user
  IF NOT EXISTS (SELECT 1 FROM public.vendor_users WHERE user_id = _user_id) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.has_staff_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_staff_access(uuid) TO authenticated, service_role;

-- 4. Upgrade public.has_role to strictly block terminated employees
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  IF _user_id IS NULL THEN
    RETURN false;
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND is_active = false) THEN
    RETURN false;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = _user_id;

  IF EXISTS (
    SELECT 1 FROM public.employees 
    WHERE (user_id = _user_id OR (v_email IS NOT NULL AND email ILIKE v_email))
      AND employment_status IN ('terminated', 'resigned')
  ) THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND (
        role = _role
        OR role = 'super_admin'
        OR (_role = 'admin' AND role = 'super_admin')
      )
  );
END;
$$;

-- 5. Upgrade public.has_any_role to strictly block terminated employees
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  IF _user_id IS NULL THEN
    RETURN false;
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND is_active = false) THEN
    RETURN false;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = _user_id;

  IF EXISTS (
    SELECT 1 FROM public.employees 
    WHERE (user_id = _user_id OR (v_email IS NOT NULL AND email ILIKE v_email))
      AND employment_status IN ('terminated', 'resigned')
  ) THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND (
        role = ANY(_roles)
        OR role = 'super_admin'
        OR (role = 'admin' AND ('sales' = ANY(_roles) OR 'purchase' = ANY(_roles) OR 'sales_manager' = ANY(_roles)))
      )
  );
END;
$$;

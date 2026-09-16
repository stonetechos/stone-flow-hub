-- Migration: Fix Workforce Owner Permissions, Allow Super Admin & HR, Add Employee KRAs and KPAs
-- Resolves RLS error on employee creation and adds first-class support for employee KRAs & KPAs.

-- 1. Ensure kras and kpas columns exist on public.employees
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS kras jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS kpas jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2. Update public.workforce_is_owner
-- Checks if user has admin, super_admin, hr, or sales_manager role.
-- Also allows write if user_roles table has no rows yet (bootstrap safeguard).
CREATE OR REPLACE FUNCTION public.workforce_is_owner(_uid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Bootstrap safeguard: if no user roles are assigned yet, allow any authenticated user
  IF NOT EXISTS (SELECT 1 FROM public.user_roles) THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _uid
      AND role::text IN ('admin', 'super_admin', 'hr', 'sales_manager')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.workforce_is_owner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.workforce_is_owner(uuid) TO authenticated, service_role;

-- 3. Re-apply RLS policy on public.employees
DROP POLICY IF EXISTS "employees owner write" ON public.employees;
CREATE POLICY "employees owner write" ON public.employees
  FOR ALL TO authenticated
  USING (public.workforce_is_owner(auth.uid()))
  WITH CHECK (public.workforce_is_owner(auth.uid()));

DROP POLICY IF EXISTS "employees self read" ON public.employees;
CREATE POLICY "employees self read" ON public.employees
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.workforce_is_owner(auth.uid()));

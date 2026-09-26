-- Migration: 20260926230000_fix_missing_columns_and_rls.sql
-- Consolidated fix for columns and RLS that were defined in earlier migrations
-- but may not have been applied to the live database. All statements use
-- IF NOT EXISTS / OR REPLACE so re-running is safe.

-- 1. Add force_password_change to profiles if missing
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS force_password_change boolean NOT NULL DEFAULT false;

-- 2. Add ip_address to activity_log if missing
ALTER TABLE public.activity_log
  ADD COLUMN IF NOT EXISTS ip_address inet;

-- 3. Ensure user_roles grants for authenticated users
GRANT ALL ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- 4. Recreate user_roles RLS policy to allow admins/super_admins/staff to manage
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;

CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_staff_access(auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_staff_access(auth.uid())
  );

-- 5. Allow users to read their own role row (needed for useRoles hook)
DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;

CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 6. Re-create the trigger function that protects privileged profile fields
--    but allows users to clear their own force_password_change flag.
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service-role / trigger contexts (no JWT) and admins may change anything.
  IF auth.uid() IS NULL
     OR public.has_role(auth.uid(), 'admin'::app_role)
     OR public.has_role(auth.uid(), 'super_admin'::app_role)
  THEN
    RETURN NEW;
  END IF;

  -- Allow users to clear their own forced password change flag when they set a new password.
  IF NEW.id = auth.uid()
     AND OLD.force_password_change IS TRUE
     AND NEW.force_password_change IS FALSE
     AND NEW.is_active IS NOT DISTINCT FROM OLD.is_active
     AND NEW.job_title IS NOT DISTINCT FROM OLD.job_title
     AND NEW.department IS NOT DISTINCT FROM OLD.department
  THEN
    RETURN NEW;
  END IF;

  IF NEW.is_active IS DISTINCT FROM OLD.is_active
     OR NEW.job_title IS DISTINCT FROM OLD.job_title
     OR NEW.department IS DISTINCT FROM OLD.department
     OR NEW.force_password_change IS DISTINCT FROM OLD.force_password_change
  THEN
    RAISE EXCEPTION 'Only an administrator can change account status, job title, department or the forced password-change flag'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

-- Attach the trigger if it doesn't exist
DROP TRIGGER IF EXISTS protect_profile_privileged_fields_trigger ON public.profiles;
CREATE TRIGGER protect_profile_privileged_fields_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileged_fields();

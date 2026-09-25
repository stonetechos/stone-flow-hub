-- Migration: 20260925133000_allow_self_clear_force_password_change.sql
-- Allow users to clear force_password_change on their own profile when activating account,
-- while retaining strict protection against unauthorized changes to active status, role, or other users.

CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service-role / trigger contexts (no JWT) and admins may change anything.
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Allow users to clear their own forced password change flag when they set their password
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

-- 1. Prevent non-admins from changing HR / lifecycle controlled profile fields.
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service-role / trigger contexts (no JWT) and admins may change anything.
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::app_role) THEN
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

DROP TRIGGER IF EXISTS trg_protect_profile_privileged_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_privileged_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_privileged_fields();

-- 2. Activity log: stop staff fabricating arbitrary audit history.
--    The only legitimate client-side insert is the denied super-admin
--    role-change attempt recorded by src/lib/admin/users.ts. Everything
--    else is written by the log_activity() SECURITY DEFINER trigger or by
--    server-side admin code using the service role.
DROP POLICY IF EXISTS "al insert staff self" ON public.activity_log;

CREATE POLICY "al insert denied role attempt only"
  ON public.activity_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND public.has_staff_access(auth.uid())
    AND entity_type = 'user'
    AND action = 'super_admin_role_change_attempted'::activity_action
  );
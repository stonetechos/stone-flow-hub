
-- Fix 1: Restrict overly permissive tasks policies
DROP POLICY IF EXISTS "Authenticated insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated delete tasks" ON public.tasks;

CREATE POLICY "Users insert own tasks" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users update own or assigned tasks" ON public.tasks
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR assigned_to = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (created_by = auth.uid() OR assigned_to = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users delete own tasks" ON public.tasks
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Fix 2: Prevent forged activity_log inserts
DROP POLICY IF EXISTS "al insert self" ON public.activity_log;
CREATE POLICY "al insert self" ON public.activity_log
  FOR INSERT TO authenticated
  WITH CHECK (actor_id IS NOT NULL AND actor_id = auth.uid());

-- Fix 3: Prevent role-lookup disclosure for arbitrary user_ids.
-- Only allow lookups for the caller's own uid unless caller is an admin.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _user_id IS DISTINCT FROM auth.uid() THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
      RETURN false;
    END IF;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _user_id IS DISTINCT FROM auth.uid() THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
      RETURN false;
    END IF;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  );
END;
$$;

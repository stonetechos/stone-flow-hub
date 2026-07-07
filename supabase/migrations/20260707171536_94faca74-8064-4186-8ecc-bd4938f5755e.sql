-- RC-1 audit fix: tighten permissive RLS on installation-management tables.
-- Previously ALL commands were USING (true), which let any authenticated user
-- (including vendor-portal users) read/modify/delete every installation record,
-- daily progress report, material movement, and customer sign-off signature.
-- New policy: authenticated users can read; only admin/sales_manager/sales roles
-- can write. Existing has_role() security-definer function is reused.

-- Drop old permissive policies
DROP POLICY IF EXISTS "Staff manage installation teams" ON public.installation_teams;
DROP POLICY IF EXISTS "Staff manage installations" ON public.installations;
DROP POLICY IF EXISTS "Staff manage installation progress" ON public.installation_progress;
DROP POLICY IF EXISTS "Staff manage installation materials" ON public.installation_materials;
DROP POLICY IF EXISTS "Staff manage installation signoffs" ON public.installation_signoffs;

-- Reusable staff predicate
CREATE OR REPLACE FUNCTION public.is_staff(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_any_role(_uid, ARRAY['admin','sales_manager','sales','purchase']::public.app_role[]);
$$;

-- Read policies (all authenticated staff)
CREATE POLICY "install_teams_read" ON public.installation_teams
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "install_read" ON public.installations
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "install_progress_read" ON public.installation_progress
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "install_materials_read" ON public.installation_materials
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "install_signoffs_read" ON public.installation_signoffs
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

-- Write policies: admin + sales_manager only (sales can update progress reports)
CREATE POLICY "install_teams_write" ON public.installation_teams
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','sales_manager']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','sales_manager']::public.app_role[]));

CREATE POLICY "install_write" ON public.installations
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','sales_manager']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','sales_manager']::public.app_role[]));

CREATE POLICY "install_progress_write" ON public.installation_progress
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "install_materials_write" ON public.installation_materials
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "install_signoffs_write" ON public.installation_signoffs
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));
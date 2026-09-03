DROP POLICY IF EXISTS "Authenticated users can view company profile" ON public.company_profiles;
CREATE POLICY "Staff can view company profile"
ON public.company_profiles
FOR SELECT
TO authenticated
USING (public.has_staff_access(auth.uid()));
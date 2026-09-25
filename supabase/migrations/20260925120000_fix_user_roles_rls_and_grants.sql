-- Migration: 20260925120000_fix_user_roles_rls_and_grants.sql
-- Grant full table permissions on user_roles to authenticated users
-- and ensure RLS policy allows admins and staff to manage roles.

GRANT ALL ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- Recreate policy to avoid RLS rejection for admins/staff
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;

CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_staff_access(auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_staff_access(auth.uid())
  );

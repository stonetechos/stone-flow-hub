-- Helper: HR-or-admin
CREATE OR REPLACE FUNCTION public.is_hr_admin(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_any_role(_uid, ARRAY['admin','super_admin','hr']::public.app_role[]);
$$;
REVOKE EXECUTE ON FUNCTION public.is_hr_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_hr_admin(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_hr_manager(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_any_role(_uid, ARRAY['admin','super_admin','hr','sales_manager']::public.app_role[]);
$$;
REVOKE EXECUTE ON FUNCTION public.is_hr_manager(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_hr_manager(uuid) TO authenticated, service_role;

-- Master data: staff read, HR/admin write
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['hr_branches','hr_shifts','hr_shift_assignments','hr_holidays','hr_leave_types']
  LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_staff(auth.uid()))', t||'_select_staff', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_hr_admin(auth.uid())) WITH CHECK (public.is_hr_admin(auth.uid()))', t||'_write_hr', t);
  END LOOP;
END $$;

-- Devices: HR/admin only
CREATE POLICY hr_devices_all_hr ON public.hr_attendance_devices
  FOR ALL TO authenticated
  USING (public.is_hr_admin(auth.uid()))
  WITH CHECK (public.is_hr_admin(auth.uid()));

-- Punches
CREATE POLICY hr_punches_select ON public.hr_attendance_punches
  FOR SELECT TO authenticated
  USING (public.is_hr_manager(auth.uid()) OR employee_id = public.current_employee_id());

CREATE POLICY hr_punches_insert_self ON public.hr_attendance_punches
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_hr_admin(auth.uid())
    OR (employee_id = public.current_employee_id() AND approval_status IN ('not_required','pending'))
  );

CREATE POLICY hr_punches_update_hr ON public.hr_attendance_punches
  FOR UPDATE TO authenticated
  USING (public.is_hr_manager(auth.uid()))
  WITH CHECK (public.is_hr_manager(auth.uid()));

CREATE POLICY hr_punches_delete_hr ON public.hr_attendance_punches
  FOR DELETE TO authenticated
  USING (public.is_hr_admin(auth.uid()));

-- Daily attendance
CREATE POLICY hr_days_select ON public.hr_attendance_days
  FOR SELECT TO authenticated
  USING (public.is_hr_manager(auth.uid()) OR employee_id = public.current_employee_id());

CREATE POLICY hr_days_write_hr ON public.hr_attendance_days
  FOR ALL TO authenticated
  USING (public.is_hr_admin(auth.uid()))
  WITH CHECK (public.is_hr_admin(auth.uid()));

-- Leave balances
CREATE POLICY hr_balances_select ON public.hr_leave_balances
  FOR SELECT TO authenticated
  USING (public.is_hr_manager(auth.uid()) OR employee_id = public.current_employee_id());

CREATE POLICY hr_balances_write_hr ON public.hr_leave_balances
  FOR ALL TO authenticated
  USING (public.is_hr_admin(auth.uid()))
  WITH CHECK (public.is_hr_admin(auth.uid()));

-- Leave requests
CREATE POLICY hr_leave_select ON public.hr_leave_requests
  FOR SELECT TO authenticated
  USING (public.is_hr_manager(auth.uid()) OR employee_id = public.current_employee_id());

CREATE POLICY hr_leave_insert ON public.hr_leave_requests
  FOR INSERT TO authenticated
  WITH CHECK (public.is_hr_admin(auth.uid()) OR employee_id = public.current_employee_id());

CREATE POLICY hr_leave_update ON public.hr_leave_requests
  FOR UPDATE TO authenticated
  USING (
    public.is_hr_manager(auth.uid())
    OR (employee_id = public.current_employee_id() AND status IN ('draft','pending'))
  )
  WITH CHECK (
    public.is_hr_manager(auth.uid())
    OR (employee_id = public.current_employee_id() AND status IN ('draft','pending','cancelled'))
  );

CREATE POLICY hr_leave_delete ON public.hr_leave_requests
  FOR DELETE TO authenticated
  USING (public.is_hr_admin(auth.uid()));

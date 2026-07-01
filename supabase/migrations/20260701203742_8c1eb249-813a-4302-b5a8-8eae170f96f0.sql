
DROP POLICY IF EXISTS "Profiles readable by authenticated" ON public.profiles;
CREATE POLICY "profiles read own or admin" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "customers read all auth" ON public.customers;
DROP POLICY IF EXISTS "customers insert auth" ON public.customers;
CREATE POLICY "customers read staff" ON public.customers
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','sales_manager','sales','purchase']::app_role[]));
CREATE POLICY "customers insert staff" ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','sales_manager','sales']::app_role[]));

DROP POLICY IF EXISTS "customer_contacts auth all" ON public.customer_contacts;
CREATE POLICY "customer_contacts staff read" ON public.customer_contacts
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','sales_manager','sales','purchase']::app_role[]));
CREATE POLICY "customer_contacts staff insert" ON public.customer_contacts
  FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','sales_manager','sales']::app_role[]));
CREATE POLICY "customer_contacts staff update" ON public.customer_contacts
  FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','sales_manager','sales']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','sales_manager','sales']::app_role[]));
CREATE POLICY "customer_contacts admin delete" ON public.customer_contacts
  FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','sales_manager']::app_role[]));

DROP POLICY IF EXISTS "vendors read auth" ON public.vendors;
DROP POLICY IF EXISTS "vendors write auth" ON public.vendors;
CREATE POLICY "vendors read purchase" ON public.vendors
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','purchase']::app_role[]));
CREATE POLICY "vendors write purchase" ON public.vendors
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','purchase']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','purchase']::app_role[]));

DROP POLICY IF EXISTS "vendor_contacts auth all" ON public.vendor_contacts;
CREATE POLICY "vendor_contacts purchase all" ON public.vendor_contacts
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','purchase']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','purchase']::app_role[]));

DROP POLICY IF EXISTS "al insert auth" ON public.activity_log;
CREATE POLICY "al insert self" ON public.activity_log
  FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
 RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles));
$$;

DROP POLICY IF EXISTS "user_roles admin read" ON public.user_roles;
CREATE POLICY "user_roles admin read" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_existing_count int;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  SELECT count(*) INTO v_existing_count FROM public.user_roles;
  IF v_existing_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.log_activity() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.log_enquiry_stage_change() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.assign_customer_code() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.assign_project_code() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.assign_product_code() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.assign_vendor_code() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.assign_enquiry_code() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.assign_rfq_code() FROM PUBLIC, authenticated, anon;

DROP POLICY IF EXISTS "stonetech-files read auth" ON storage.objects;
DROP POLICY IF EXISTS "stonetech-files insert auth" ON storage.objects;
DROP POLICY IF EXISTS "stonetech-files update auth" ON storage.objects;
DROP POLICY IF EXISTS "stonetech-files delete auth" ON storage.objects;

CREATE POLICY "stonetech-files read owner or staff" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'stonetech-files' AND (
      owner = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.file_objects f
        WHERE f.bucket = 'stonetech-files'
          AND f.object_path = storage.objects.name
          AND (f.uploaded_by = auth.uid()
               OR public.has_any_role(auth.uid(),
                    ARRAY['admin','sales_manager','sales','purchase']::app_role[]))
      )
    )
  );

CREATE POLICY "stonetech-files insert self" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'stonetech-files' AND owner = auth.uid());

CREATE POLICY "stonetech-files update owner" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'stonetech-files' AND (
      owner = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.file_objects f
        WHERE f.bucket = 'stonetech-files' AND f.object_path = storage.objects.name AND f.uploaded_by = auth.uid()
      )
      OR public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "stonetech-files delete owner" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'stonetech-files' AND (
      owner = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.file_objects f
        WHERE f.bucket = 'stonetech-files' AND f.object_path = storage.objects.name AND f.uploaded_by = auth.uid()
      )
      OR public.has_role(auth.uid(), 'admin')
    )
  );

-- Migration: Default Pass-Through User Roles & Organizational Data Access
-- Guarantees that every user entered into the system (including Raman, Rishi, and any new staff)
-- automatically receives their designated role and full access to all software entries.

-- 1. Auto-heal all existing users in auth.users
DO $$
DECLARE
  u RECORD;
  v_role public.app_role;
BEGIN
  FOR u IN (
    SELECT id, email, raw_user_meta_data
    FROM auth.users
  ) LOOP
    -- Determine role: Directors (Raman, Rishi) are super_admin, others default to admin
    IF u.email ILIKE '%raman%' OR u.email ILIKE '%rishi%' 
       OR u.email IN ('raman.pupneja@gmail.com', 'rp140528@gmail.com', 'stonetechrajasthan@gmail.com', 'rishirai@gmail.com') THEN
      v_role := 'super_admin'::public.app_role;
    ELSE
      v_role := COALESCE(
        NULLIF(u.raw_user_meta_data->>'role', 'none')::public.app_role,
        'admin'::public.app_role
      );
    END IF;

    -- Upsert profile with active status and live (non-demo) mode
    INSERT INTO public.profiles (
      id,
      email,
      full_name,
      is_active,
      is_demo_mode,
      force_password_change
    )
    VALUES (
      u.id,
      u.email,
      COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
      true,
      false,
      false
    )
    ON CONFLICT (id) DO UPDATE SET
      is_active = true,
      is_demo_mode = false,
      force_password_change = false;

    -- Ensure primary role is assigned in user_roles
    INSERT INTO public.user_roles (user_id, role)
    VALUES (u.id, v_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    -- If super_admin, also ensure admin role exists for backward-compatible checks
    IF v_role = 'super_admin' THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (u.id, 'admin'::public.app_role)
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- 2. Drop restrictive demo_mode_isolation policies that could hide data from new logins
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'customers','projects','products','vendors',
    'enquiries','enquiry_items','followups','site_visits','project_notes',
    'rfqs','rfq_items','vendor_requests','vendor_quotes','vendor_quote_items',
    'quotes','quote_items','sales_orders','purchase_orders',
    'production_orders','production_pieces','production_stages','qc_results',
    'inventory_items','dispatches','invoices','invoice_items','payments','payment_links',
    'tasks','activity_log','artwork_approvals','file_objects','favorites','comments'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "demo_mode_isolation" ON public.%I', t);
  END LOOP;
END $$;

-- Ensure current_demo_mode always safely defaults to false
CREATE OR REPLACE FUNCTION public.current_demo_mode()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_demo_mode FROM public.profiles WHERE id = auth.uid()), false);
$$;

-- 3. Upgrade public.has_staff_access
CREATE OR REPLACE FUNCTION public.has_staff_access(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  IF _user_id IS NULL THEN
    RETURN false;
  END IF;

  -- 1. Check if user holds any staff / administrative role
  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('admin', 'super_admin', 'sales_manager', 'sales', 'purchase', 'hr')
  ) THEN
    RETURN true;
  END IF;

  -- 2. Email-based check for Raman, Rishi, and Stone Tech staff
  SELECT email INTO v_email FROM auth.users WHERE id = _user_id;
  IF v_email IS NOT NULL AND (
    v_email ILIKE '%raman%'
    OR v_email ILIKE '%rishi%'
    OR v_email ILIKE '%@stonetech.in'
    OR v_email ILIKE 'info@stonetech.in'
    OR v_email ILIKE 'rp140528@gmail.com'
    OR v_email ILIKE 'raman.pupneja@gmail.com'
    OR v_email ILIKE 'stonetechrajasthan@gmail.com'
  ) THEN
    RETURN true;
  END IF;

  -- 3. Allow any internal authenticated user who is not a vendor portal user
  IF NOT EXISTS (SELECT 1 FROM public.vendor_users WHERE user_id = _user_id) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.has_staff_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_staff_access(uuid) TO authenticated, service_role;

-- 4. Upgrade public.has_role and public.has_any_role with full hierarchy support
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _user_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND (
        role = _role
        OR role = 'super_admin'
        OR (_role = 'admin' AND role = 'super_admin')
      )
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
  IF _user_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND (
        role = ANY(_roles)
        OR role = 'super_admin'
        OR (role = 'admin' AND ('sales' = ANY(_roles) OR 'purchase' = ANY(_roles) OR 'sales_manager' = ANY(_roles)))
      )
  );
END;
$$;

-- 5. Upgrade handle_new_user trigger to default pass on roles to EVERY new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role public.app_role;
BEGIN
  -- Determine default role: Directors are super_admin, others default to admin
  IF NEW.email ILIKE '%raman%' OR NEW.email ILIKE '%rishi%'
     OR NEW.email IN ('raman.pupneja@gmail.com', 'rp140528@gmail.com', 'stonetechrajasthan@gmail.com', 'rishirai@gmail.com') THEN
    v_role := 'super_admin'::public.app_role;
  ELSE
    v_role := COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'role', 'none')::public.app_role,
      'admin'::public.app_role
    );
  END IF;

  -- Create active profile with live data mode
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    is_active,
    is_demo_mode,
    force_password_change
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    true,
    false,
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    is_active = true,
    is_demo_mode = false,
    force_password_change = false;

  -- Automatically grant default role so entries flow immediately on first login
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF v_role = 'super_admin' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Ensure RLS policies on customers, enquiries, quotes, and orders allow staff access
DROP POLICY IF EXISTS "customers read staff" ON public.customers;
CREATE POLICY "customers read staff" ON public.customers
  FOR SELECT TO authenticated
  USING (public.has_staff_access(auth.uid()));

DROP POLICY IF EXISTS "customers insert staff" ON public.customers;
CREATE POLICY "customers insert staff" ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK (public.has_staff_access(auth.uid()));

DROP POLICY IF EXISTS "customers update auth" ON public.customers;
CREATE POLICY "customers update auth" ON public.customers
  FOR UPDATE TO authenticated
  USING (public.has_staff_access(auth.uid()))
  WITH CHECK (public.has_staff_access(auth.uid()));

DROP POLICY IF EXISTS "customer_contacts staff read" ON public.customer_contacts;
CREATE POLICY "customer_contacts staff read" ON public.customer_contacts
  FOR SELECT TO authenticated
  USING (public.has_staff_access(auth.uid()));

DROP POLICY IF EXISTS "customer_contacts staff insert" ON public.customer_contacts;
CREATE POLICY "customer_contacts staff insert" ON public.customer_contacts
  FOR INSERT TO authenticated
  WITH CHECK (public.has_staff_access(auth.uid()));

DROP POLICY IF EXISTS "customer_contacts staff update" ON public.customer_contacts;
CREATE POLICY "customer_contacts staff update" ON public.customer_contacts
  FOR UPDATE TO authenticated
  USING (public.has_staff_access(auth.uid()))
  WITH CHECK (public.has_staff_access(auth.uid()));

DROP POLICY IF EXISTS "vendors read purchase" ON public.vendors;
CREATE POLICY "vendors read purchase" ON public.vendors
  FOR SELECT TO authenticated
  USING (public.has_staff_access(auth.uid()));

DROP POLICY IF EXISTS "vendors write purchase" ON public.vendors;
CREATE POLICY "vendors write purchase" ON public.vendors
  FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid()))
  WITH CHECK (public.has_staff_access(auth.uid()));

NOTIFY pgrst, 'reload schema';

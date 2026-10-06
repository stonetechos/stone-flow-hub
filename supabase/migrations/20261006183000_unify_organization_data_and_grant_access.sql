-- =========================================================================
-- Migration: 20261006183000_unify_organization_data_and_grant_access.sql
-- 
-- Unify all database entries across the entire organisation so that all entries
-- (including those created by rp140528@gmail.com) are fully accessible to all
-- users with super admin or admin rights, and across all staff members.
-- =========================================================================

-- 1. PROMOTE ALL DATA: Update any records stamped with is_demo = true to is_demo = false
-- across all operational business tables so no entries are hidden or isolated.
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'customers','projects','products','vendors',
    'enquiries','enquiry_items','followups','site_visits','project_notes',
    'rfqs','rfq_items','vendor_requests','vendor_quotes','vendor_quote_items',
    'quotes','quote_items','sales_orders','sales_order_items','purchase_orders',
    'production_orders','production_pieces','production_stages','qc_results',
    'inventory_items','dispatches','invoices','invoice_items','payments','payment_links',
    'tasks','activity_log','artwork_approvals','file_objects','favorites','comments'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Drop restrictive isolation policy that hid rows between live mode and demo mode
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS "demo_mode_isolation" ON public.%I', t);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    -- Promote existing is_demo = true rows to false so they are part of live org database
    BEGIN
      EXECUTE format('UPDATE public.%I SET is_demo = false WHERE is_demo = true', t);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END $$;

-- 2. Neutralize set_is_demo() trigger function so future inserts always default to live data (is_demo = false)
CREATE OR REPLACE FUNCTION public.set_is_demo()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.is_demo := false;
  RETURN NEW;
END;
$$;

-- 3. Neutralize current_demo_mode() so it always evaluates to false
CREATE OR REPLACE FUNCTION public.current_demo_mode()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT false;
$$;

-- 4. Reset is_demo_mode on all profiles to false
UPDATE public.profiles SET is_demo_mode = false WHERE is_demo_mode IS TRUE;
ALTER TABLE public.profiles ALTER COLUMN is_demo_mode SET DEFAULT false;

-- 5. Auto-heal rp140528@gmail.com and all organisation users into user_roles with 'admin' role
DO $$
DECLARE
  u RECORD;
BEGIN
  -- Explicitly ensure rp140528@gmail.com profile exists and is active
  FOR u IN (
    SELECT id, email, raw_user_meta_data
    FROM auth.users
    WHERE email ILIKE 'rp140528@gmail.com'
  ) LOOP
    INSERT INTO public.profiles (id, email, full_name, is_active, is_demo_mode, force_password_change)
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

    INSERT INTO public.user_roles (user_id, role)
    VALUES (u.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END LOOP;

  -- Ensure all other organisation users (non-vendor accounts) have admin role in user_roles
  INSERT INTO public.user_roles (user_id, role)
  SELECT id, 'admin'::public.app_role
  FROM auth.users
  WHERE email ILIKE '%@stonetech.in'
     OR email ILIKE 'info@stonetech.in'
     OR email ILIKE 'rp140528@gmail.com'
     OR id NOT IN (SELECT user_id FROM public.vendor_users WHERE user_id IS NOT NULL)
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;

-- 6. Update has_staff_access: explicitly include rp140528@gmail.com and any organisation authenticated user
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

  -- Bootstrap safeguard: if no user roles are defined yet, permit authenticated user
  IF NOT EXISTS (SELECT 1 FROM public.user_roles) THEN
    RETURN true;
  END IF;

  -- Check if user has an explicit staff role
  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('admin', 'super_admin', 'sales_manager', 'sales', 'purchase', 'hr')
  ) THEN
    RETURN true;
  END IF;

  -- Organization email domain / specific account check
  SELECT email INTO v_email FROM auth.users WHERE id = _user_id;
  IF v_email IS NOT NULL AND (
    v_email ILIKE '%@stonetech.in'
    OR v_email ILIKE 'info@stonetech.in'
    OR v_email ILIKE 'rp140528@gmail.com'
  ) THEN
    RETURN true;
  END IF;

  -- Any internal authenticated user not registered under vendor portal is granted staff access
  IF NOT EXISTS (SELECT 1 FROM public.vendor_users WHERE user_id = _user_id) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.has_staff_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_staff_access(uuid) TO authenticated, service_role;

-- 7. Update handle_new_user trigger to assign admin role and is_demo_mode = false to all new organization users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, is_demo_mode)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    false
  )
  ON CONFLICT (id) DO UPDATE SET is_demo_mode = false;

  -- Automatically grant admin role to new accounts so they can access organizational data
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

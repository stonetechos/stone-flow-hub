
-- =========================================================================
-- STONE TECH OS - MODULE 1 SCHEMA
-- =========================================================================

-- ----- ENUMS -----
CREATE TYPE public.app_role AS ENUM ('admin', 'sales_manager', 'sales', 'purchase');

CREATE TYPE public.customer_type AS ENUM (
  'builder', 'architect', 'interior_designer', 'contractor',
  'individual', 'company', 'government', 'other'
);

CREATE TYPE public.contact_designation AS ENUM (
  'owner', 'architect', 'purchase_manager', 'site_engineer',
  'accounts', 'procurement', 'other'
);

CREATE TYPE public.project_type AS ENUM (
  'residential', 'commercial', 'hospitality', 'healthcare',
  'institutional', 'industrial', 'villa', 'apartment', 'other'
);

CREATE TYPE public.stone_type AS ENUM (
  'marble', 'granite', 'quartz', 'sandstone', 'limestone',
  'travertine', 'onyx', 'slate', 'engineered', 'other'
);

CREATE TYPE public.stone_finish AS ENUM (
  'polished', 'honed', 'leather', 'flamed', 'brushed',
  'sandblasted', 'bush_hammered', 'antique', 'other'
);

CREATE TYPE public.product_unit AS ENUM (
  'sqft', 'sqm', 'piece', 'slab', 'linear_ft', 'linear_m', 'cbm'
);

CREATE TYPE public.preferred_transport AS ENUM (
  'road', 'rail', 'sea', 'air', 'mixed'
);

CREATE TYPE public.lead_stage AS ENUM (
  'new_lead', 'contacted', 'site_visit_scheduled', 'site_visit_completed',
  'sample_sent', 'customer_quotation_sent', 'negotiation', 'rfq_sent',
  'vendor_quote_received', 'vendor_approved', 'customer_approved',
  'production', 'dispatch', 'completed', 'lost', 'cancelled'
);

CREATE TYPE public.enquiry_priority AS ENUM ('low', 'normal', 'high', 'urgent');

CREATE TYPE public.followup_status AS ENUM (
  'pending', 'done', 'snoozed', 'missed', 'cancelled'
);

CREATE TYPE public.followup_channel AS ENUM (
  'call', 'whatsapp', 'email', 'meeting', 'site_visit'
);

CREATE TYPE public.rfq_status AS ENUM (
  'draft', 'sent', 'partially_received', 'fully_received', 'closed', 'cancelled'
);

CREATE TYPE public.vendor_request_status AS ENUM (
  'pending', 'submitted', 'declined', 'expired', 'closed_lost'
);

CREATE TYPE public.site_visit_status AS ENUM (
  'scheduled', 'completed', 'cancelled', 'rescheduled'
);

CREATE TYPE public.file_folder AS ENUM (
  'product_image', 'site_image', 'drawing', 'boq', 'quotation',
  'purchase_order', 'invoice', 'delivery_challan', 'transport_document',
  'sample_photo', 'reference', 'other'
);

CREATE TYPE public.activity_action AS ENUM (
  'created', 'updated', 'deleted', 'status_changed', 'assigned',
  'file_uploaded', 'rfq_sent', 'quote_received', 'quote_approved',
  'followup_completed', 'note_added'
);

-- ----- HELPER: updated_at trigger -----
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ----- ENTITY SEQUENCES (code generation) -----
CREATE TABLE public.entity_sequences (
  prefix text PRIMARY KEY,
  last_value bigint NOT NULL DEFAULT 0,
  width int NOT NULL DEFAULT 6
);

INSERT INTO public.entity_sequences (prefix, width) VALUES
  ('CUS', 6), ('PRJ', 6), ('ENQ', 6), ('PRD', 6), ('VEN', 6), ('RFQ', 6);

GRANT SELECT ON public.entity_sequences TO authenticated;
GRANT ALL ON public.entity_sequences TO service_role;
ALTER TABLE public.entity_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sequences readable by authenticated"
  ON public.entity_sequences FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.next_code(_prefix text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next bigint;
  v_width int;
BEGIN
  UPDATE public.entity_sequences
     SET last_value = last_value + 1
   WHERE prefix = _prefix
   RETURNING last_value, width INTO v_next, v_width;

  IF v_next IS NULL THEN
    RAISE EXCEPTION 'Unknown sequence prefix: %', _prefix;
  END IF;

  RETURN _prefix || '-' || lpad(v_next::text, v_width, '0');
END;
$$;

-- ----- PROFILES -----
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles readable by authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----- USER ROLES -----
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- security-definer role check (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles public.app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles)
  );
$$;

CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ----- HANDLE NEW USER: auto profile + first user becomes admin -----
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_count int;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;

  SELECT count(*) INTO v_existing_count FROM public.user_roles;
  IF v_existing_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'sales')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================================
-- CUSTOMER MASTER
-- =========================================================================
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_code text UNIQUE NOT NULL,
  name text NOT NULL,
  customer_type public.customer_type NOT NULL DEFAULT 'company',
  -- contact
  primary_phone text,
  primary_email text,
  whatsapp text,
  website text,
  -- address
  billing_address text,
  city text,
  state text,
  pincode text,
  country text DEFAULT 'India',
  -- tax
  gst_number text,
  pan text,
  -- meta
  source text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  -- ownership
  created_by uuid REFERENCES auth.users(id),
  -- reserved future hooks
  company_id uuid,
  currency_code text NOT NULL DEFAULT 'INR',
  external_ref jsonb,
  workflow_state jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX customers_email_unique_lower
  ON public.customers (lower(primary_email)) WHERE primary_email IS NOT NULL;
CREATE INDEX customers_phone_idx ON public.customers (primary_phone);
CREATE INDEX customers_whatsapp_idx ON public.customers (whatsapp);
CREATE INDEX customers_name_idx ON public.customers (lower(name));
CREATE INDEX customers_city_idx ON public.customers (city);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers read all auth" ON public.customers
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "customers insert auth" ON public.customers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "customers update auth" ON public.customers
  FOR UPDATE TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY['admin','sales_manager']::public.app_role[])
    OR created_by = auth.uid()
  );
CREATE POLICY "customers delete admin" ON public.customers
  FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','sales_manager']::public.app_role[]));

CREATE TRIGGER customers_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.assign_customer_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.customer_code IS NULL OR NEW.customer_code = '' THEN
    NEW.customer_code := public.next_code('CUS');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER customers_assign_code BEFORE INSERT ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.assign_customer_code();

-- ----- CUSTOMER CONTACTS -----
CREATE TABLE public.customer_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  name text NOT NULL,
  designation public.contact_designation NOT NULL DEFAULT 'other',
  phone text,
  whatsapp text,
  email text,
  is_primary boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX customer_contacts_customer_idx ON public.customer_contacts (customer_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_contacts TO authenticated;
GRANT ALL ON public.customer_contacts TO service_role;
ALTER TABLE public.customer_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customer_contacts auth all" ON public.customer_contacts
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE TRIGGER customer_contacts_updated_at BEFORE UPDATE ON public.customer_contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- PROJECT MASTER
-- =========================================================================
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code text UNIQUE NOT NULL,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  name text NOT NULL,
  project_type public.project_type NOT NULL DEFAULT 'residential',
  -- site
  site_address text,
  city text,
  state text,
  pincode text,
  -- key contacts (optional)
  architect_contact_id uuid REFERENCES public.customer_contacts(id) ON DELETE SET NULL,
  purchase_contact_id uuid REFERENCES public.customer_contacts(id) ON DELETE SET NULL,
  -- planning
  expected_value_inr numeric(14,2),
  expected_start_date date,
  expected_completion_date date,
  -- ownership
  owner_user_id uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  -- denorm pipeline stage (set by latest enquiry stage; canonical lives on enquiries)
  stage public.lead_stage NOT NULL DEFAULT 'new_lead',
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  -- reserved hooks
  company_id uuid,
  currency_code text NOT NULL DEFAULT 'INR',
  external_ref jsonb,
  workflow_state jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX projects_customer_idx ON public.projects (customer_id);
CREATE INDEX projects_owner_idx ON public.projects (owner_user_id);
CREATE INDEX projects_stage_idx ON public.projects (stage);
CREATE INDEX projects_city_idx ON public.projects (city);
CREATE INDEX projects_name_idx ON public.projects (lower(name));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects read all auth" ON public.projects
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "projects insert auth" ON public.projects
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "projects update" ON public.projects
  FOR UPDATE TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY['admin','sales_manager']::public.app_role[])
    OR owner_user_id = auth.uid()
    OR created_by = auth.uid()
  );
CREATE POLICY "projects delete admin" ON public.projects
  FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','sales_manager']::public.app_role[]));

CREATE TRIGGER projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.assign_project_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.project_code IS NULL OR NEW.project_code = '' THEN
    NEW.project_code := public.next_code('PRJ');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER projects_assign_code BEFORE INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.assign_project_code();

-- ----- PROJECT NOTES -----
CREATE TABLE public.project_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX project_notes_project_idx ON public.project_notes (project_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_notes TO authenticated;
GRANT ALL ON public.project_notes TO service_role;
ALTER TABLE public.project_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notes auth all" ON public.project_notes
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ----- SITE VISITS -----
CREATE TABLE public.site_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scheduled_at timestamptz,
  conducted_at timestamptz,
  conducted_by uuid REFERENCES auth.users(id),
  attendees text[],
  summary text,
  status public.site_visit_status NOT NULL DEFAULT 'scheduled',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX site_visits_project_idx ON public.site_visits (project_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_visits TO authenticated;
GRANT ALL ON public.site_visits TO service_role;
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_visits auth all" ON public.site_visits
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE TRIGGER site_visits_updated_at BEFORE UPDATE ON public.site_visits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- PRODUCT MASTER
-- =========================================================================
CREATE TABLE public.product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  parent_id uuid REFERENCES public.product_categories(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_categories TO authenticated;
GRANT ALL ON public.product_categories TO service_role;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories read auth" ON public.product_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "categories write managers" ON public.product_categories
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','sales_manager','purchase']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','sales_manager','purchase']::public.app_role[]));

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code text UNIQUE NOT NULL,
  name text NOT NULL,
  category_id uuid REFERENCES public.product_categories(id) ON DELETE SET NULL,
  stone_type public.stone_type,
  finish public.stone_finish,
  thickness_mm numeric(6,2),
  default_unit public.product_unit NOT NULL DEFAULT 'sqft',
  origin_country text,
  hsn_code text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  -- reserved hooks
  company_id uuid,
  external_ref jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX products_category_idx ON public.products (category_id);
CREATE INDEX products_name_idx ON public.products (lower(name));
CREATE INDEX products_active_idx ON public.products (is_active);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products read auth" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "products write auth" ON public.products
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.assign_product_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.product_code IS NULL OR NEW.product_code = '' THEN
    NEW.product_code := public.next_code('PRD');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER products_assign_code BEFORE INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.assign_product_code();

CREATE TABLE public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  file_object_id uuid,
  url text,
  sort_order int NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_images_product_idx ON public.product_images (product_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_images TO authenticated;
GRANT ALL ON public.product_images TO service_role;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_images auth all" ON public.product_images
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- =========================================================================
-- VENDOR MASTER
-- =========================================================================
CREATE TABLE public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_code text UNIQUE NOT NULL,
  company_name text NOT NULL,
  gst_number text,
  pan text,
  address text,
  city text,
  state text,
  pincode text,
  country text DEFAULT 'India',
  rating numeric(2,1) CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5)),
  payment_terms text,
  lead_time_days int,
  preferred_transport public.preferred_transport,
  bank_name text,
  bank_account text,
  ifsc text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  company_id uuid,
  currency_code text NOT NULL DEFAULT 'INR',
  external_ref jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX vendors_name_idx ON public.vendors (lower(company_name));
CREATE INDEX vendors_city_idx ON public.vendors (city);
CREATE INDEX vendors_active_idx ON public.vendors (is_active);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendors TO authenticated;
GRANT ALL ON public.vendors TO service_role;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vendors read auth" ON public.vendors FOR SELECT TO authenticated USING (true);
CREATE POLICY "vendors write auth" ON public.vendors
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TRIGGER vendors_updated_at BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.assign_vendor_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.vendor_code IS NULL OR NEW.vendor_code = '' THEN
    NEW.vendor_code := public.next_code('VEN');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER vendors_assign_code BEFORE INSERT ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.assign_vendor_code();

CREATE TABLE public.vendor_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  name text NOT NULL,
  designation text,
  phone text,
  whatsapp text,
  email text,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX vendor_contacts_vendor_idx ON public.vendor_contacts (vendor_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_contacts TO authenticated;
GRANT ALL ON public.vendor_contacts TO service_role;
ALTER TABLE public.vendor_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vendor_contacts auth all" ON public.vendor_contacts
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TABLE public.vendor_product_categories (
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.product_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (vendor_id, category_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_product_categories TO authenticated;
GRANT ALL ON public.vendor_product_categories TO service_role;
ALTER TABLE public.vendor_product_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vpc auth all" ON public.vendor_product_categories
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TABLE public.vendor_products (
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  price_per_unit numeric(12,2),
  lead_time_days int,
  remarks text,
  PRIMARY KEY (vendor_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_products TO authenticated;
GRANT ALL ON public.vendor_products TO service_role;
ALTER TABLE public.vendor_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vp auth all" ON public.vendor_products
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- =========================================================================
-- ENQUIRIES + PIPELINE
-- =========================================================================
CREATE TABLE public.enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_no text UNIQUE NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  stage public.lead_stage NOT NULL DEFAULT 'new_lead',
  priority public.enquiry_priority NOT NULL DEFAULT 'normal',
  required_delivery_date date,
  budget_inr numeric(14,2),
  source text,
  notes text,
  lost_reason text,
  assigned_to uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  -- reserved hooks
  company_id uuid,
  currency_code text NOT NULL DEFAULT 'INR',
  external_ref jsonb,
  workflow_state jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX enquiries_project_idx ON public.enquiries (project_id);
CREATE INDEX enquiries_customer_idx ON public.enquiries (customer_id);
CREATE INDEX enquiries_stage_idx ON public.enquiries (stage);
CREATE INDEX enquiries_assigned_idx ON public.enquiries (assigned_to);
CREATE INDEX enquiries_created_idx ON public.enquiries (created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.enquiries TO authenticated;
GRANT ALL ON public.enquiries TO service_role;
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enquiries read auth" ON public.enquiries FOR SELECT TO authenticated USING (true);
CREATE POLICY "enquiries write auth" ON public.enquiries
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TRIGGER enquiries_updated_at BEFORE UPDATE ON public.enquiries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.assign_enquiry_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.enquiry_no IS NULL OR NEW.enquiry_no = '' THEN
    NEW.enquiry_no := public.next_code('ENQ');
  END IF;
  -- sync customer_id from project
  IF NEW.customer_id IS NULL THEN
    SELECT customer_id INTO NEW.customer_id FROM public.projects WHERE id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER enquiries_assign_code BEFORE INSERT ON public.enquiries
  FOR EACH ROW EXECUTE FUNCTION public.assign_enquiry_code();

CREATE TABLE public.enquiry_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id uuid NOT NULL REFERENCES public.enquiries(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name_snapshot text NOT NULL,
  quantity numeric(12,2) NOT NULL DEFAULT 0,
  unit public.product_unit NOT NULL DEFAULT 'sqft',
  target_price numeric(12,2),
  remarks text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX enquiry_items_enquiry_idx ON public.enquiry_items (enquiry_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enquiry_items TO authenticated;
GRANT ALL ON public.enquiry_items TO service_role;
ALTER TABLE public.enquiry_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enquiry_items auth all" ON public.enquiry_items
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TABLE public.enquiry_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id uuid NOT NULL REFERENCES public.enquiries(id) ON DELETE CASCADE,
  from_stage public.lead_stage,
  to_stage public.lead_stage NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  note text,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX esh_enquiry_idx ON public.enquiry_stage_history (enquiry_id, changed_at DESC);
GRANT SELECT, INSERT ON public.enquiry_stage_history TO authenticated;
GRANT ALL ON public.enquiry_stage_history TO service_role;
ALTER TABLE public.enquiry_stage_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "esh read auth" ON public.enquiry_stage_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "esh insert auth" ON public.enquiry_stage_history
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION public.log_enquiry_stage_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.enquiry_stage_history (enquiry_id, from_stage, to_stage, changed_by)
    VALUES (NEW.id, NULL, NEW.stage, NEW.created_by);
  ELSIF NEW.stage IS DISTINCT FROM OLD.stage THEN
    INSERT INTO public.enquiry_stage_history (enquiry_id, from_stage, to_stage, changed_by)
    VALUES (NEW.id, OLD.stage, NEW.stage, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER enquiries_stage_log
  AFTER INSERT OR UPDATE OF stage ON public.enquiries
  FOR EACH ROW EXECUTE FUNCTION public.log_enquiry_stage_change();

-- =========================================================================
-- FOLLOW-UPS
-- =========================================================================
CREATE TABLE public.followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id uuid REFERENCES public.enquiries(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  channel public.followup_channel NOT NULL DEFAULT 'call',
  status public.followup_status NOT NULL DEFAULT 'pending',
  assigned_to uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  notes text,
  outcome_notes text,
  completed_at timestamptz,
  next_followup_id uuid REFERENCES public.followups(id),
  company_id uuid,
  external_ref jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX followups_scheduled_idx ON public.followups (scheduled_at);
CREATE INDEX followups_status_idx ON public.followups (status);
CREATE INDEX followups_assigned_idx ON public.followups (assigned_to);
CREATE INDEX followups_enquiry_idx ON public.followups (enquiry_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.followups TO authenticated;
GRANT ALL ON public.followups TO service_role;
ALTER TABLE public.followups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "followups auth all" ON public.followups
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE TRIGGER followups_updated_at BEFORE UPDATE ON public.followups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- RFQ + VENDOR QUOTES
-- =========================================================================
CREATE TABLE public.rfqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_no text UNIQUE NOT NULL,
  enquiry_id uuid NOT NULL REFERENCES public.enquiries(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  status public.rfq_status NOT NULL DEFAULT 'draft',
  due_date date,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  company_id uuid,
  currency_code text NOT NULL DEFAULT 'INR',
  external_ref jsonb,
  workflow_state jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX rfqs_enquiry_idx ON public.rfqs (enquiry_id);
CREATE INDEX rfqs_project_idx ON public.rfqs (project_id);
CREATE INDEX rfqs_status_idx ON public.rfqs (status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rfqs TO authenticated;
GRANT ALL ON public.rfqs TO service_role;
ALTER TABLE public.rfqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rfqs auth all" ON public.rfqs
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE TRIGGER rfqs_updated_at BEFORE UPDATE ON public.rfqs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.assign_rfq_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.rfq_no IS NULL OR NEW.rfq_no = '' THEN
    NEW.rfq_no := public.next_code('RFQ');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER rfqs_assign_code BEFORE INSERT ON public.rfqs
  FOR EACH ROW EXECUTE FUNCTION public.assign_rfq_code();

CREATE TABLE public.rfq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id uuid NOT NULL REFERENCES public.rfqs(id) ON DELETE CASCADE,
  enquiry_item_id uuid REFERENCES public.enquiry_items(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name_snapshot text NOT NULL,
  quantity numeric(12,2) NOT NULL,
  unit public.product_unit NOT NULL DEFAULT 'sqft',
  specs text,
  sort_order int NOT NULL DEFAULT 0
);
CREATE INDEX rfq_items_rfq_idx ON public.rfq_items (rfq_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rfq_items TO authenticated;
GRANT ALL ON public.rfq_items TO service_role;
ALTER TABLE public.rfq_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rfq_items auth all" ON public.rfq_items
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TABLE public.vendor_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id uuid NOT NULL REFERENCES public.rfqs(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  response_status public.vendor_request_status NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  sent_by uuid REFERENCES auth.users(id),
  reminder_count int NOT NULL DEFAULT 0,
  last_reminder_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rfq_id, vendor_id)
);
CREATE INDEX vr_rfq_idx ON public.vendor_requests (rfq_id);
CREATE INDEX vr_vendor_idx ON public.vendor_requests (vendor_id);
CREATE INDEX vr_status_idx ON public.vendor_requests (response_status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_requests TO authenticated;
GRANT ALL ON public.vendor_requests TO service_role;
ALTER TABLE public.vendor_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vr auth all" ON public.vendor_requests
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE TRIGGER vr_updated_at BEFORE UPDATE ON public.vendor_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.vendor_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_request_id uuid NOT NULL UNIQUE REFERENCES public.vendor_requests(id) ON DELETE CASCADE,
  quote_no text,
  gst_included boolean NOT NULL DEFAULT true,
  freight_inr numeric(12,2) NOT NULL DEFAULT 0,
  dispatch_days int,
  stock_available boolean,
  valid_until date,
  remarks text,
  total_inr numeric(14,2) NOT NULL DEFAULT 0,
  is_approved boolean NOT NULL DEFAULT false,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  submitted_by uuid REFERENCES auth.users(id),
  currency_code text NOT NULL DEFAULT 'INR',
  external_ref jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX vq_approved_idx ON public.vendor_quotes (is_approved);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_quotes TO authenticated;
GRANT ALL ON public.vendor_quotes TO service_role;
ALTER TABLE public.vendor_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vq auth all" ON public.vendor_quotes
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE TRIGGER vq_updated_at BEFORE UPDATE ON public.vendor_quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.vendor_quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_quote_id uuid NOT NULL REFERENCES public.vendor_quotes(id) ON DELETE CASCADE,
  rfq_item_id uuid REFERENCES public.rfq_items(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name_snapshot text NOT NULL,
  price_per_unit numeric(12,2) NOT NULL DEFAULT 0,
  quantity numeric(12,2) NOT NULL DEFAULT 0,
  unit public.product_unit NOT NULL DEFAULT 'sqft',
  line_total numeric(14,2) GENERATED ALWAYS AS (price_per_unit * quantity) STORED,
  remarks text
);
CREATE INDEX vqi_quote_idx ON public.vendor_quote_items (vendor_quote_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_quote_items TO authenticated;
GRANT ALL ON public.vendor_quote_items TO service_role;
ALTER TABLE public.vendor_quote_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vqi auth all" ON public.vendor_quote_items
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- =========================================================================
-- TAGS (polymorphic via dedicated joins)
-- =========================================================================
CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  color text NOT NULL DEFAULT '#14B8A6',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tags TO authenticated;
GRANT ALL ON public.tags TO service_role;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tags read auth" ON public.tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "tags write auth" ON public.tags
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TABLE public.customer_tags (
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (customer_id, tag_id)
);
CREATE TABLE public.project_tags (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, tag_id)
);
CREATE TABLE public.enquiry_tags (
  enquiry_id uuid NOT NULL REFERENCES public.enquiries(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (enquiry_id, tag_id)
);
CREATE TABLE public.vendor_tags (
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (vendor_id, tag_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_tags, public.project_tags, public.enquiry_tags, public.vendor_tags TO authenticated;
GRANT ALL ON public.customer_tags, public.project_tags, public.enquiry_tags, public.vendor_tags TO service_role;
ALTER TABLE public.customer_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiry_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ct auth all" ON public.customer_tags FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "pt auth all" ON public.project_tags FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "et auth all" ON public.enquiry_tags FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "vt auth all" ON public.vendor_tags FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- =========================================================================
-- FILE OBJECTS (polymorphic)
-- =========================================================================
CREATE TABLE public.file_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  folder public.file_folder NOT NULL DEFAULT 'other',
  bucket text NOT NULL,
  object_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid REFERENCES auth.users(id),
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX fo_entity_idx ON public.file_objects (entity_type, entity_id);
CREATE INDEX fo_project_idx ON public.file_objects (project_id);
CREATE INDEX fo_folder_idx ON public.file_objects (folder);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.file_objects TO authenticated;
GRANT ALL ON public.file_objects TO service_role;
ALTER TABLE public.file_objects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "files auth all" ON public.file_objects
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- =========================================================================
-- ACTIVITY LOG (polymorphic audit)
-- =========================================================================
CREATE TABLE public.activity_log (
  id bigserial PRIMARY KEY,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  action public.activity_action NOT NULL,
  field_name text,
  old_value jsonb,
  new_value jsonb,
  summary text,
  actor_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX al_entity_idx ON public.activity_log (entity_type, entity_id, created_at DESC);
CREATE INDEX al_project_idx ON public.activity_log (project_id, created_at DESC);
CREATE INDEX al_actor_idx ON public.activity_log (actor_id);

GRANT SELECT, INSERT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "al read auth" ON public.activity_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "al insert auth" ON public.activity_log
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- generic activity logger
CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_action public.activity_action;
  v_entity_id uuid;
  v_project_id uuid;
  v_summary text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    v_entity_id := NEW.id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'updated';
    v_entity_id := NEW.id;
  ELSE
    v_action := 'deleted';
    v_entity_id := OLD.id;
  END IF;

  -- pull project_id when present
  IF TG_TABLE_NAME IN ('enquiries','followups','rfqs','site_visits','project_notes') THEN
    IF TG_OP = 'DELETE' THEN
      v_project_id := OLD.project_id;
    ELSE
      v_project_id := NEW.project_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'projects' THEN
    v_project_id := v_entity_id;
  END IF;

  v_summary := TG_TABLE_NAME || ' ' || v_action;

  INSERT INTO public.activity_log (entity_type, entity_id, project_id, action, summary, actor_id)
  VALUES (TG_TABLE_NAME, v_entity_id, v_project_id, v_action, v_summary, auth.uid());

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- attach to core tables
CREATE TRIGGER log_customers_activity AFTER INSERT OR UPDATE OR DELETE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER log_projects_activity AFTER INSERT OR UPDATE OR DELETE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER log_enquiries_activity AFTER INSERT OR UPDATE OR DELETE ON public.enquiries
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER log_vendors_activity AFTER INSERT OR UPDATE OR DELETE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER log_rfqs_activity AFTER INSERT OR UPDATE OR DELETE ON public.rfqs
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER log_followups_activity AFTER INSERT OR UPDATE OR DELETE ON public.followups
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

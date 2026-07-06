
-- =========================================================
-- Module 3 — Migration 2: manufacturing + procurement + artwork + veneer
-- =========================================================

-- Sequences for MFG codes
INSERT INTO public.entity_sequences (prefix, last_value, width) VALUES ('MFG', 0, 4)
  ON CONFLICT (prefix) DO NOTHING;

-- 1. Production orders --------------------------------------------------------
CREATE TYPE public.production_status AS ENUM ('planned','in_progress','on_hold','completed','cancelled');

CREATE TABLE public.production_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mfg_no text NOT NULL DEFAULT '',
  sales_order_id uuid REFERENCES public.sales_orders(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity numeric(14,3) NOT NULL,
  unit text NOT NULL DEFAULT 'sqft',
  status public.production_status NOT NULL DEFAULT 'planned',
  planned_start date,
  planned_end date,
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_orders TO authenticated;
GRANT ALL ON public.production_orders TO service_role;
ALTER TABLE public.production_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage production_orders" ON public.production_orders FOR ALL TO authenticated USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));
CREATE TRIGGER production_orders_touch BEFORE UPDATE ON public.production_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.assign_mfg_code() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN IF NEW.mfg_no IS NULL OR NEW.mfg_no='' THEN NEW.mfg_no := public.next_code('MFG'); END IF; RETURN NEW; END; $$;
CREATE TRIGGER production_orders_assign_code BEFORE INSERT ON public.production_orders FOR EACH ROW EXECUTE FUNCTION public.assign_mfg_code();
CREATE INDEX production_orders_so_idx ON public.production_orders(sales_order_id);
CREATE INDEX production_orders_status_idx ON public.production_orders(status);

-- 2. Production stages --------------------------------------------------------
CREATE TABLE public.production_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id uuid NOT NULL REFERENCES public.production_orders(id) ON DELETE CASCADE,
  stage_id uuid NOT NULL REFERENCES public.manufacturing_stages(id) ON DELETE RESTRICT,
  sort_order int NOT NULL DEFAULT 100,
  assigned_vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  assigned_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  planned_date date,
  started_at timestamptz,
  actual_completed_at timestamptz,
  delay_reason text,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','skipped','blocked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_stages TO authenticated;
GRANT ALL ON public.production_stages TO service_role;
ALTER TABLE public.production_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage production_stages" ON public.production_stages FOR ALL TO authenticated USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));
CREATE TRIGGER production_stages_touch BEFORE UPDATE ON public.production_stages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX production_stages_po_idx ON public.production_stages(production_order_id, sort_order);

-- 3. Stage attachments --------------------------------------------------------
CREATE TABLE public.production_stage_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id uuid NOT NULL REFERENCES public.production_stages(id) ON DELETE CASCADE,
  file_object_id uuid NOT NULL REFERENCES public.file_objects(id) ON DELETE CASCADE,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_stage_files TO authenticated;
GRANT ALL ON public.production_stage_files TO service_role;
ALTER TABLE public.production_stage_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage production_stage_files" ON public.production_stage_files FOR ALL TO authenticated USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));

-- 4. Vendor capability matrices ----------------------------------------------
CREATE TYPE public.vendor_capability AS ENUM ('cnc','waterjet','inlay','flexible_stone','calibration','edge_processing','polishing','metal_inlay','sculpture');

CREATE TABLE public.vendor_stone_types (
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  stone_type_id uuid NOT NULL REFERENCES public.stone_types(id) ON DELETE CASCADE,
  PRIMARY KEY (vendor_id, stone_type_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_stone_types TO authenticated;
GRANT ALL ON public.vendor_stone_types TO service_role;
ALTER TABLE public.vendor_stone_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage vendor_stone_types" ON public.vendor_stone_types FOR ALL TO authenticated USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));

CREATE TABLE public.vendor_finishes (
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  surface_finish_id uuid NOT NULL REFERENCES public.surface_finishes(id) ON DELETE CASCADE,
  PRIMARY KEY (vendor_id, surface_finish_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_finishes TO authenticated;
GRANT ALL ON public.vendor_finishes TO service_role;
ALTER TABLE public.vendor_finishes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage vendor_finishes" ON public.vendor_finishes FOR ALL TO authenticated USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));

CREATE TABLE public.vendor_capabilities (
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  capability public.vendor_capability NOT NULL,
  notes text,
  PRIMARY KEY (vendor_id, capability)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_capabilities TO authenticated;
GRANT ALL ON public.vendor_capabilities TO service_role;
ALTER TABLE public.vendor_capabilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage vendor_capabilities" ON public.vendor_capabilities FOR ALL TO authenticated USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));

-- Extend vendors with capacity attributes
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS max_slab_length_mm numeric(9,2),
  ADD COLUMN IF NOT EXISTS max_slab_width_mm numeric(9,2),
  ADD COLUMN IF NOT EXISTS daily_capacity numeric(12,2),
  ADD COLUMN IF NOT EXISTS daily_capacity_uom text,
  ADD COLUMN IF NOT EXISTS lead_time_days int,
  ADD COLUMN IF NOT EXISTS moq numeric(12,2),
  ADD COLUMN IF NOT EXISTS moq_uom text,
  ADD COLUMN IF NOT EXISTS quality_rating int CHECK (quality_rating BETWEEN 1 AND 5);

-- 5. Product artworks ---------------------------------------------------------
CREATE TABLE public.product_artworks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  production_order_id uuid REFERENCES public.production_orders(id) ON DELETE CASCADE,
  file_object_id uuid NOT NULL REFERENCES public.file_objects(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('stl','dxf','cad','ai','pdf','toolpath','render','photo','other')),
  revision int NOT NULL DEFAULT 1,
  is_approved boolean NOT NULL DEFAULT false,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (product_id IS NOT NULL OR production_order_id IS NOT NULL)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_artworks TO authenticated;
GRANT ALL ON public.product_artworks TO service_role;
ALTER TABLE public.product_artworks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage product_artworks" ON public.product_artworks FOR ALL TO authenticated USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));
CREATE TRIGGER product_artworks_touch BEFORE UPDATE ON public.product_artworks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX product_artworks_product_idx ON public.product_artworks(product_id, revision DESC);
CREATE INDEX product_artworks_po_idx ON public.product_artworks(production_order_id, revision DESC);

CREATE TABLE public.artwork_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_id uuid NOT NULL REFERENCES public.product_artworks(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','revision_requested')),
  feedback text,
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.artwork_approvals TO authenticated;
GRANT ALL ON public.artwork_approvals TO service_role;
ALTER TABLE public.artwork_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage artwork_approvals" ON public.artwork_approvals FOR ALL TO authenticated USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));
CREATE TRIGGER artwork_approvals_touch BEFORE UPDATE ON public.artwork_approvals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. Flexible-veneer 1:1 profile ---------------------------------------------
CREATE TABLE public.product_veneer_specs (
  product_id uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  sheet_length_mm numeric(9,2),
  sheet_width_mm numeric(9,2),
  backing_type text,
  form text CHECK (form IN ('sheet','roll')),
  bend_radius_mm numeric(9,2),
  fire_rating text,
  weight_kg_m2 numeric(8,3),
  indoor_ok boolean NOT NULL DEFAULT true,
  outdoor_ok boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_veneer_specs TO authenticated;
GRANT ALL ON public.product_veneer_specs TO service_role;
ALTER TABLE public.product_veneer_specs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage product_veneer_specs" ON public.product_veneer_specs FOR ALL TO authenticated USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));
CREATE TRIGGER product_veneer_specs_touch BEFORE UPDATE ON public.product_veneer_specs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. Inventory: stone-aware traceability -------------------------------------
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS lot_no text,
  ADD COLUMN IF NOT EXISTS slab_no text,
  ADD COLUMN IF NOT EXISTS block_no text,
  ADD COLUMN IF NOT EXISTS size_length_mm numeric(9,2),
  ADD COLUMN IF NOT EXISTS size_width_mm numeric(9,2),
  ADD COLUMN IF NOT EXISTS thickness_mm numeric(8,2),
  ADD COLUMN IF NOT EXISTS bundle_qty numeric(12,3),
  ADD COLUMN IF NOT EXISTS bundle_uom text,
  ADD COLUMN IF NOT EXISTS origin_country text,
  ADD COLUMN IF NOT EXISTS arrival_date date;
CREATE INDEX IF NOT EXISTS inventory_items_lot_idx ON public.inventory_items(lot_no);

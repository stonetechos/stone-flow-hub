-- 1. Sales Order supply_scope
ALTER TABLE public.sales_orders
  ADD COLUMN IF NOT EXISTS supply_scope TEXT NOT NULL DEFAULT 'material_only'
    CHECK (supply_scope IN ('material_only','supply_and_installation'));
CREATE INDEX IF NOT EXISTS sales_orders_supply_scope_idx ON public.sales_orders(supply_scope);

-- 2. Installation Teams
CREATE TABLE IF NOT EXISTS public.installation_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_code TEXT UNIQUE,
  name TEXT NOT NULL,
  supervisor_name TEXT,
  supervisor_phone TEXT,
  members JSONB NOT NULL DEFAULT '[]'::jsonb,
  skills TEXT[] NOT NULL DEFAULT '{}',
  vehicle TEXT,
  daily_capacity_sqft NUMERIC,
  lifecycle_status public.mdm_lifecycle_status NOT NULL DEFAULT 'active',
  is_active BOOLEAN NOT NULL DEFAULT true,
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.installation_teams TO authenticated;
GRANT ALL ON public.installation_teams TO service_role;
ALTER TABLE public.installation_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage installation teams" ON public.installation_teams
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS installation_teams_lifecycle_idx ON public.installation_teams(lifecycle_status);

CREATE OR REPLACE FUNCTION public.assign_installation_team_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.team_code IS NULL OR NEW.team_code = '' THEN
    NEW.team_code := public.next_code('ITM');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS installation_teams_assign_code ON public.installation_teams;
CREATE TRIGGER installation_teams_assign_code BEFORE INSERT ON public.installation_teams
  FOR EACH ROW EXECUTE FUNCTION public.assign_installation_team_code();
DROP TRIGGER IF EXISTS installation_teams_updated_at ON public.installation_teams;
CREATE TRIGGER installation_teams_updated_at BEFORE UPDATE ON public.installation_teams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Installations
CREATE TABLE IF NOT EXISTS public.installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_no TEXT UNIQUE,
  sales_order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  project_id  UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  estimate_id UUID REFERENCES public.estimates(id) ON DELETE SET NULL,
  team_id     UUID REFERENCES public.installation_teams(id) ON DELETE SET NULL,
  supervisor_name TEXT,
  site_address TEXT,
  gps_lat NUMERIC,
  gps_lng NUMERIC,
  planned_start_date DATE,
  planned_end_date   DATE,
  actual_start_date  DATE,
  actual_end_date    DATE,
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned','scheduled','in_progress','on_hold','completed','signed_off','cancelled')),
  lifecycle_status public.mdm_lifecycle_status NOT NULL DEFAULT 'active',
  is_active BOOLEAN NOT NULL DEFAULT true,
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  progress_pct NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.installations TO authenticated;
GRANT ALL ON public.installations TO service_role;
ALTER TABLE public.installations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage installations" ON public.installations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS installations_so_idx        ON public.installations(sales_order_id);
CREATE INDEX IF NOT EXISTS installations_customer_idx  ON public.installations(customer_id);
CREATE INDEX IF NOT EXISTS installations_project_idx   ON public.installations(project_id);
CREATE INDEX IF NOT EXISTS installations_team_idx      ON public.installations(team_id);
CREATE INDEX IF NOT EXISTS installations_status_idx    ON public.installations(status);
CREATE INDEX IF NOT EXISTS installations_lifecycle_idx ON public.installations(lifecycle_status);
CREATE INDEX IF NOT EXISTS installations_planned_idx   ON public.installations(planned_start_date);

CREATE OR REPLACE FUNCTION public.assign_installation_no()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.installation_no IS NULL OR NEW.installation_no = '' THEN
    NEW.installation_no := public.next_code('INS');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS installations_assign_no ON public.installations;
CREATE TRIGGER installations_assign_no BEFORE INSERT ON public.installations
  FOR EACH ROW EXECUTE FUNCTION public.assign_installation_no();
DROP TRIGGER IF EXISTS installations_updated_at ON public.installations;
CREATE TRIGGER installations_updated_at BEFORE UPDATE ON public.installations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.sync_installation_from_sales_order()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_exists UUID;
BEGIN
  IF NEW.supply_scope IS DISTINCT FROM 'supply_and_installation' THEN RETURN NEW; END IF;
  SELECT id INTO v_exists FROM public.installations WHERE sales_order_id = NEW.id LIMIT 1;
  IF v_exists IS NOT NULL THEN RETURN NEW; END IF;
  INSERT INTO public.installations
    (sales_order_id, customer_id, project_id, planned_start_date, planned_end_date, status)
  VALUES
    (NEW.id, NEW.customer_id, NEW.project_id, NEW.delivery_date, NEW.delivery_date, 'planned');
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS sales_orders_sync_installation ON public.sales_orders;
CREATE TRIGGER sales_orders_sync_installation
  AFTER INSERT OR UPDATE OF supply_scope, customer_id, project_id, delivery_date
  ON public.sales_orders
  FOR EACH ROW EXECUTE FUNCTION public.sync_installation_from_sales_order();

-- 4. Daily Site Progress
CREATE TABLE IF NOT EXISTS public.installation_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id UUID NOT NULL REFERENCES public.installations(id) ON DELETE CASCADE,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  work_completed TEXT,
  area_completed_sqft NUMERIC,
  balance_work TEXT,
  labour_present INTEGER,
  material_consumed TEXT,
  material_shortage TEXT,
  safety_observations TEXT,
  customer_remarks TEXT,
  supervisor_remarks TEXT,
  progress_pct NUMERIC,
  reported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.installation_progress TO authenticated;
GRANT ALL ON public.installation_progress TO service_role;
ALTER TABLE public.installation_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage installation progress" ON public.installation_progress
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS installation_progress_inst_idx
  ON public.installation_progress(installation_id, report_date DESC);

CREATE OR REPLACE FUNCTION public.sync_installation_progress_pct()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.progress_pct IS NOT NULL THEN
    UPDATE public.installations
       SET progress_pct = NEW.progress_pct,
           actual_start_date = COALESCE(actual_start_date, NEW.report_date),
           status = CASE WHEN status IN ('planned','scheduled') THEN 'in_progress' ELSE status END
     WHERE id = NEW.installation_id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS installation_progress_pct ON public.installation_progress;
CREATE TRIGGER installation_progress_pct AFTER INSERT ON public.installation_progress
  FOR EACH ROW EXECUTE FUNCTION public.sync_installation_progress_pct();

-- 5. Installation Materials
CREATE TABLE IF NOT EXISTS public.installation_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id UUID NOT NULL REFERENCES public.installations(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  description TEXT,
  unit TEXT,
  qty_dispatched NUMERIC NOT NULL DEFAULT 0,
  qty_received   NUMERIC NOT NULL DEFAULT 0,
  qty_installed  NUMERIC NOT NULL DEFAULT 0,
  qty_damaged    NUMERIC NOT NULL DEFAULT 0,
  qty_returned   NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.installation_materials TO authenticated;
GRANT ALL ON public.installation_materials TO service_role;
ALTER TABLE public.installation_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage installation materials" ON public.installation_materials
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS installation_materials_inst_idx
  ON public.installation_materials(installation_id);
DROP TRIGGER IF EXISTS installation_materials_updated_at ON public.installation_materials;
CREATE TRIGGER installation_materials_updated_at BEFORE UPDATE ON public.installation_materials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.record_installation_material(
  p_installation_id UUID,
  p_product_id UUID,
  p_kind TEXT,
  p_qty NUMERIC,
  p_unit TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row_id UUID;
  v_mv_type TEXT;
  v_dir TEXT;
BEGIN
  IF p_qty IS NULL OR p_qty <= 0 THEN RAISE EXCEPTION 'quantity must be positive'; END IF;
  IF p_kind NOT IN ('dispatched','received','installed','damaged','returned') THEN
    RAISE EXCEPTION 'invalid kind %', p_kind;
  END IF;

  SELECT id INTO v_row_id
  FROM public.installation_materials
  WHERE installation_id = p_installation_id
    AND product_id IS NOT DISTINCT FROM p_product_id
  LIMIT 1;

  IF v_row_id IS NULL THEN
    INSERT INTO public.installation_materials
      (installation_id, product_id, unit, description,
       qty_dispatched, qty_received, qty_installed, qty_damaged, qty_returned, notes)
    VALUES
      (p_installation_id, p_product_id, p_unit, p_description,
       CASE WHEN p_kind='dispatched' THEN p_qty ELSE 0 END,
       CASE WHEN p_kind='received'   THEN p_qty ELSE 0 END,
       CASE WHEN p_kind='installed'  THEN p_qty ELSE 0 END,
       CASE WHEN p_kind='damaged'    THEN p_qty ELSE 0 END,
       CASE WHEN p_kind='returned'   THEN p_qty ELSE 0 END,
       p_notes)
    RETURNING id INTO v_row_id;
  ELSE
    UPDATE public.installation_materials
       SET qty_dispatched = qty_dispatched + CASE WHEN p_kind='dispatched' THEN p_qty ELSE 0 END,
           qty_received   = qty_received   + CASE WHEN p_kind='received'   THEN p_qty ELSE 0 END,
           qty_installed  = qty_installed  + CASE WHEN p_kind='installed'  THEN p_qty ELSE 0 END,
           qty_damaged    = qty_damaged    + CASE WHEN p_kind='damaged'    THEN p_qty ELSE 0 END,
           qty_returned   = qty_returned   + CASE WHEN p_kind='returned'   THEN p_qty ELSE 0 END,
           notes = COALESCE(p_notes, notes)
     WHERE id = v_row_id;
  END IF;

  v_mv_type := CASE p_kind
    WHEN 'dispatched' THEN 'dispatch'
    WHEN 'received'   THEN 'transfer'
    WHEN 'installed'  THEN 'production_consumption'
    WHEN 'damaged'    THEN 'adjustment'
    WHEN 'returned'   THEN 'return'
  END;
  v_dir := CASE p_kind
    WHEN 'received' THEN 'in'
    WHEN 'returned' THEN 'in'
    ELSE 'out'
  END;

  INSERT INTO public.inventory_movements
    (product_id, movement_type, direction, quantity, unit,
     source_type, source_id, ref_no, notes, moved_at)
  VALUES
    (p_product_id, v_mv_type, v_dir, p_qty, p_unit,
     'installation', p_installation_id,
     (SELECT installation_no FROM public.installations WHERE id = p_installation_id),
     COALESCE(p_notes, 'Installation ' || p_kind), now());

  RETURN v_row_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.record_installation_material(UUID, UUID, TEXT, NUMERIC, TEXT, TEXT, TEXT) TO authenticated;

-- 6. Sign-offs
CREATE TABLE IF NOT EXISTS public.installation_signoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id UUID NOT NULL REFERENCES public.installations(id) ON DELETE CASCADE,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  customer_name TEXT,
  customer_rating INTEGER CHECK (customer_rating BETWEEN 1 AND 5),
  remarks TEXT,
  signature_file_id UUID REFERENCES public.file_objects(id) ON DELETE SET NULL,
  signed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (installation_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.installation_signoffs TO authenticated;
GRANT ALL ON public.installation_signoffs TO service_role;
ALTER TABLE public.installation_signoffs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage installation signoffs" ON public.installation_signoffs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.finalize_installation_on_signoff()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.installations
     SET status = 'signed_off',
         actual_end_date = COALESCE(actual_end_date, CURRENT_DATE),
         progress_pct = 100
   WHERE id = NEW.installation_id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS installation_signoffs_finalize ON public.installation_signoffs;
CREATE TRIGGER installation_signoffs_finalize AFTER INSERT ON public.installation_signoffs
  FOR EACH ROW EXECUTE FUNCTION public.finalize_installation_on_signoff();

-- 7. Dashboard KPI view
CREATE OR REPLACE VIEW public.installation_dashboard_kpis
WITH (security_invoker = true) AS
SELECT
  (SELECT COUNT(*) FROM public.installations
     WHERE status IN ('planned','scheduled','in_progress','on_hold')
       AND lifecycle_status = 'active') AS active_installations,
  (SELECT COUNT(*) FROM public.installations
     WHERE status IN ('planned','scheduled','in_progress')
       AND planned_end_date IS NOT NULL
       AND planned_end_date < CURRENT_DATE
       AND lifecycle_status = 'active') AS delayed_sites,
  (SELECT COUNT(DISTINCT team_id) FROM public.installations
     WHERE status = 'in_progress' AND team_id IS NOT NULL) AS teams_on_site,
  (SELECT COALESCE(AVG(progress_pct),0) FROM public.installations
     WHERE status IN ('in_progress','on_hold')) AS avg_progress_pct,
  (SELECT COUNT(*) FROM public.installation_materials
     WHERE qty_dispatched - qty_received - qty_returned > 0) AS material_shortages,
  (SELECT COUNT(*) FROM public.installations i
     WHERE i.status = 'completed'
       AND NOT EXISTS (SELECT 1 FROM public.installation_signoffs s WHERE s.installation_id = i.id))
    AS signoffs_pending,
  (SELECT COALESCE(SUM(q.total),0)
     FROM public.installations i
     LEFT JOIN public.sales_orders so ON so.id = i.sales_order_id
     LEFT JOIN public.quotes q ON q.id = so.quote_id
     WHERE i.lifecycle_status = 'active') AS installation_revenue;
GRANT SELECT ON public.installation_dashboard_kpis TO authenticated;

-- 8. Backfill (safe: none exist yet)
INSERT INTO public.installations (sales_order_id, customer_id, project_id, planned_start_date, planned_end_date, status)
SELECT so.id, so.customer_id, so.project_id, so.delivery_date, so.delivery_date, 'planned'
FROM public.sales_orders so
WHERE so.supply_scope = 'supply_and_installation'
  AND NOT EXISTS (SELECT 1 FROM public.installations i WHERE i.sales_order_id = so.id);
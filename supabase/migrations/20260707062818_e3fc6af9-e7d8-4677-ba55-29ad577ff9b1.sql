
-- 1) sequence for estimate numbers
INSERT INTO public.entity_sequences (prefix, last_value, width)
VALUES ('EST', 0, 5)
ON CONFLICT (prefix) DO NOTHING;

-- 2) enums
DO $$ BEGIN
  CREATE TYPE public.estimate_template AS ENUM (
    'material_supply','material_install','custom_articles','custom_manufacturing'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.estimate_status AS ENUM (
    'draft','sent','accepted','rejected','expired','converted','cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.estimate_item_category AS ENUM (
    'material','manufacturing','installation','consumable','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.estimate_document_kind AS ENUM (
    'customer_pdf','cost_sheet_pdf','whatsapp_text','email_html'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) estimates
CREATE TABLE public.estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_no text NOT NULL DEFAULT '',
  template public.estimate_template NOT NULL,
  status public.estimate_status NOT NULL DEFAULT 'draft',
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  enquiry_id uuid REFERENCES public.enquiries(id) ON DELETE SET NULL,
  source_quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  currency_code text NOT NULL DEFAULT 'INR',
  valid_until date,
  notes text,
  terms text,
  -- cost buckets (auto-derived from items + components)
  material_cost numeric(14,2) NOT NULL DEFAULT 0,
  manufacturing_cost numeric(14,2) NOT NULL DEFAULT 0,
  installation_cost numeric(14,2) NOT NULL DEFAULT 0,
  adhesives_cost numeric(14,2) NOT NULL DEFAULT 0,
  chemicals_cost numeric(14,2) NOT NULL DEFAULT 0,
  sealer_cost numeric(14,2) NOT NULL DEFAULT 0,
  packing_cost numeric(14,2) NOT NULL DEFAULT 0,
  freight_cost numeric(14,2) NOT NULL DEFAULT 0,
  other_cost numeric(14,2) NOT NULL DEFAULT 0,
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  margin_pct numeric(6,2) NOT NULL DEFAULT 0,
  margin_amount numeric(14,2) NOT NULL DEFAULT 0,
  gst_pct numeric(5,2) NOT NULL DEFAULT 18,
  gst_amount numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  payment_schedule_kind text NOT NULL DEFAULT 'custom', -- '75_25' | '80_20' | 'custom'
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_demo boolean NOT NULL DEFAULT false
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.estimates TO authenticated;
GRANT ALL ON public.estimates TO service_role;
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "estimates staff read" ON public.estimates
  FOR SELECT TO authenticated
  USING (public.has_staff_access(auth.uid()));
CREATE POLICY "estimates staff write" ON public.estimates
  FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid()))
  WITH CHECK (public.has_staff_access(auth.uid()));

CREATE INDEX estimates_project_idx ON public.estimates(project_id);
CREATE INDEX estimates_customer_idx ON public.estimates(customer_id);
CREATE INDEX estimates_status_idx ON public.estimates(status);

-- 4) estimate_items
CREATE TABLE public.estimate_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id uuid NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  category public.estimate_item_category NOT NULL DEFAULT 'material',
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity numeric(14,3) NOT NULL DEFAULT 1,
  unit text,
  unit_price numeric(14,2) NOT NULL DEFAULT 0,
  tax_pct numeric(5,2) NOT NULL DEFAULT 0,
  line_total numeric(14,2) NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  is_demo boolean NOT NULL DEFAULT false
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estimate_items TO authenticated;
GRANT ALL ON public.estimate_items TO service_role;
ALTER TABLE public.estimate_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "estimate_items staff read" ON public.estimate_items
  FOR SELECT TO authenticated USING (public.has_staff_access(auth.uid()));
CREATE POLICY "estimate_items staff write" ON public.estimate_items
  FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid()))
  WITH CHECK (public.has_staff_access(auth.uid()));
CREATE INDEX estimate_items_estimate_idx ON public.estimate_items(estimate_id);

-- 5) estimate_cost_components (adhesives/chemicals/sealer/packing/freight/other)
CREATE TABLE public.estimate_cost_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id uuid NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  kind text NOT NULL,               -- 'adhesives'|'chemicals'|'sealer'|'packing'|'freight'|'other'
  label text,
  quantity numeric(14,3) NOT NULL DEFAULT 1,
  unit text,
  unit_price numeric(14,2) NOT NULL DEFAULT 0,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  is_demo boolean NOT NULL DEFAULT false
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estimate_cost_components TO authenticated;
GRANT ALL ON public.estimate_cost_components TO service_role;
ALTER TABLE public.estimate_cost_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "estimate_cost_components staff read" ON public.estimate_cost_components
  FOR SELECT TO authenticated USING (public.has_staff_access(auth.uid()));
CREATE POLICY "estimate_cost_components staff write" ON public.estimate_cost_components
  FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid()))
  WITH CHECK (public.has_staff_access(auth.uid()));
CREATE INDEX estimate_cost_components_estimate_idx ON public.estimate_cost_components(estimate_id);

-- 6) estimate_payment_schedules
CREATE TABLE public.estimate_payment_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id uuid NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  label text NOT NULL,
  pct numeric(6,3) NOT NULL,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  due_offset_days int NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  is_demo boolean NOT NULL DEFAULT false
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estimate_payment_schedules TO authenticated;
GRANT ALL ON public.estimate_payment_schedules TO service_role;
ALTER TABLE public.estimate_payment_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "estimate_payment_schedules staff read" ON public.estimate_payment_schedules
  FOR SELECT TO authenticated USING (public.has_staff_access(auth.uid()));
CREATE POLICY "estimate_payment_schedules staff write" ON public.estimate_payment_schedules
  FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid()))
  WITH CHECK (public.has_staff_access(auth.uid()));
CREATE INDEX estimate_payment_schedules_estimate_idx ON public.estimate_payment_schedules(estimate_id);

-- 7) estimate_documents
CREATE TABLE public.estimate_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id uuid NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  kind public.estimate_document_kind NOT NULL,
  version int NOT NULL DEFAULT 1,
  subject text,
  body_text text,
  body_html text,
  file_id uuid REFERENCES public.file_objects(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_demo boolean NOT NULL DEFAULT false
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estimate_documents TO authenticated;
GRANT ALL ON public.estimate_documents TO service_role;
ALTER TABLE public.estimate_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "estimate_documents staff read" ON public.estimate_documents
  FOR SELECT TO authenticated USING (public.has_staff_access(auth.uid()));
CREATE POLICY "estimate_documents staff write" ON public.estimate_documents
  FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid()))
  WITH CHECK (public.has_staff_access(auth.uid()));
CREATE INDEX estimate_documents_estimate_idx ON public.estimate_documents(estimate_id);

-- 8) optional back-link on quotes
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS estimate_id uuid
  REFERENCES public.estimates(id) ON DELETE SET NULL;

-- 9) triggers: auto number, updated_at, line totals, header recompute, activity, demo flag

CREATE OR REPLACE FUNCTION public.assign_estimate_code()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.estimate_no IS NULL OR NEW.estimate_no = '' THEN
    NEW.estimate_no := public.next_code('EST');
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_estimates_code BEFORE INSERT ON public.estimates
  FOR EACH ROW EXECUTE FUNCTION public.assign_estimate_code();
CREATE TRIGGER trg_estimates_updated BEFORE UPDATE ON public.estimates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_estimates_demo BEFORE INSERT ON public.estimates
  FOR EACH ROW EXECUTE FUNCTION public.set_is_demo();
CREATE TRIGGER trg_estimate_items_demo BEFORE INSERT ON public.estimate_items
  FOR EACH ROW EXECUTE FUNCTION public.set_is_demo();
CREATE TRIGGER trg_estimate_cost_components_demo BEFORE INSERT ON public.estimate_cost_components
  FOR EACH ROW EXECUTE FUNCTION public.set_is_demo();
CREATE TRIGGER trg_estimate_payment_schedules_demo BEFORE INSERT ON public.estimate_payment_schedules
  FOR EACH ROW EXECUTE FUNCTION public.set_is_demo();
CREATE TRIGGER trg_estimate_documents_demo BEFORE INSERT ON public.estimate_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_is_demo();

CREATE OR REPLACE FUNCTION public.trg_estimate_item_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.line_total := ROUND(NEW.quantity * NEW.unit_price * (1 + NEW.tax_pct/100), 2);
  RETURN NEW;
END $$;
CREATE TRIGGER trg_estimate_items_touch BEFORE INSERT OR UPDATE ON public.estimate_items
  FOR EACH ROW EXECUTE FUNCTION public.trg_estimate_item_touch();

CREATE OR REPLACE FUNCTION public.trg_estimate_component_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.amount := ROUND(NEW.quantity * NEW.unit_price, 2);
  RETURN NEW;
END $$;
CREATE TRIGGER trg_estimate_components_touch BEFORE INSERT OR UPDATE ON public.estimate_cost_components
  FOR EACH ROW EXECUTE FUNCTION public.trg_estimate_component_touch();

CREATE OR REPLACE FUNCTION public.recalc_estimate_totals(_estimate_id uuid)
RETURNS void LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE
  v_material numeric(14,2); v_mfg numeric(14,2); v_install numeric(14,2); v_other_items numeric(14,2);
  v_adh numeric(14,2); v_chem numeric(14,2); v_seal numeric(14,2); v_pack numeric(14,2); v_frt numeric(14,2); v_other numeric(14,2);
  v_sub numeric(14,2); v_margin_pct numeric(6,2); v_margin_amt numeric(14,2);
  v_gst_pct numeric(5,2); v_gst_amt numeric(14,2); v_total numeric(14,2);
BEGIN
  SELECT
    COALESCE(SUM(CASE WHEN category='material' THEN line_total END),0),
    COALESCE(SUM(CASE WHEN category='manufacturing' THEN line_total END),0),
    COALESCE(SUM(CASE WHEN category='installation' THEN line_total END),0),
    COALESCE(SUM(CASE WHEN category IN ('consumable','other') THEN line_total END),0)
  INTO v_material, v_mfg, v_install, v_other_items
  FROM public.estimate_items WHERE estimate_id = _estimate_id;

  SELECT
    COALESCE(SUM(CASE WHEN kind='adhesives' THEN amount END),0),
    COALESCE(SUM(CASE WHEN kind='chemicals' THEN amount END),0),
    COALESCE(SUM(CASE WHEN kind='sealer' THEN amount END),0),
    COALESCE(SUM(CASE WHEN kind='packing' THEN amount END),0),
    COALESCE(SUM(CASE WHEN kind='freight' THEN amount END),0),
    COALESCE(SUM(CASE WHEN kind NOT IN ('adhesives','chemicals','sealer','packing','freight') THEN amount END),0)
  INTO v_adh, v_chem, v_seal, v_pack, v_frt, v_other
  FROM public.estimate_cost_components WHERE estimate_id = _estimate_id;

  SELECT margin_pct, gst_pct INTO v_margin_pct, v_gst_pct
  FROM public.estimates WHERE id = _estimate_id;

  v_sub := v_material + v_mfg + v_install + v_other_items + v_adh + v_chem + v_seal + v_pack + v_frt + v_other;
  v_margin_amt := ROUND(v_sub * v_margin_pct / 100, 2);
  v_gst_amt := ROUND((v_sub + v_margin_amt) * v_gst_pct / 100, 2);
  v_total := v_sub + v_margin_amt + v_gst_amt;

  UPDATE public.estimates SET
    material_cost = v_material,
    manufacturing_cost = v_mfg,
    installation_cost = v_install,
    adhesives_cost = v_adh,
    chemicals_cost = v_chem,
    sealer_cost = v_seal,
    packing_cost = v_pack,
    freight_cost = v_frt,
    other_cost = v_other_items + v_other,
    subtotal = v_sub,
    margin_amount = v_margin_amt,
    gst_amount = v_gst_amt,
    total = v_total
  WHERE id = _estimate_id;

  -- refresh payment-schedule amounts based on new total
  UPDATE public.estimate_payment_schedules
     SET amount = ROUND(v_total * pct / 100, 2)
   WHERE estimate_id = _estimate_id;
END $$;

CREATE OR REPLACE FUNCTION public.trg_estimate_item_recalc()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.recalc_estimate_totals(COALESCE(NEW.estimate_id, OLD.estimate_id));
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER trg_estimate_items_recalc AFTER INSERT OR UPDATE OR DELETE ON public.estimate_items
  FOR EACH ROW EXECUTE FUNCTION public.trg_estimate_item_recalc();
CREATE TRIGGER trg_estimate_components_recalc AFTER INSERT OR UPDATE OR DELETE ON public.estimate_cost_components
  FOR EACH ROW EXECUTE FUNCTION public.trg_estimate_item_recalc();

CREATE OR REPLACE FUNCTION public.trg_estimate_header_recalc()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.margin_pct IS DISTINCT FROM OLD.margin_pct
     OR NEW.gst_pct IS DISTINCT FROM OLD.gst_pct THEN
    PERFORM public.recalc_estimate_totals(NEW.id);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_estimates_header_recalc AFTER UPDATE ON public.estimates
  FOR EACH ROW EXECUTE FUNCTION public.trg_estimate_header_recalc();


-- ============ QC TEMPLATES ============
CREATE TABLE IF NOT EXISTS public.qc_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  family_id uuid REFERENCES public.product_families(id) ON DELETE SET NULL,
  stage_id uuid REFERENCES public.manufacturing_stages(id) ON DELETE SET NULL,
  category text NOT NULL DEFAULT 'general', -- surface/dimension/thickness/edge/colour/crack/packing/dispatch/general
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  sort_order int NOT NULL DEFAULT 100,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qc_templates TO authenticated;
GRANT ALL ON public.qc_templates TO service_role;
ALTER TABLE public.qc_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in can read qc_templates" ON public.qc_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage qc_templates" ON public.qc_templates FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));
CREATE TRIGGER qc_templates_touch BEFORE UPDATE ON public.qc_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.qc_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.qc_templates(id) ON DELETE CASCADE,
  label text NOT NULL,
  description text,
  is_required boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qc_template_items TO authenticated;
GRANT ALL ON public.qc_template_items TO service_role;
ALTER TABLE public.qc_template_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in can read qc_template_items" ON public.qc_template_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage qc_template_items" ON public.qc_template_items FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));

-- ============ QC RESULTS ============
DO $$ BEGIN
  CREATE TYPE public.qc_outcome AS ENUM ('pass','fail','rework','approved','rejected','not_checked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.qc_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_stage_id uuid NOT NULL REFERENCES public.production_stages(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.qc_templates(id) ON DELETE SET NULL,
  item_id uuid REFERENCES public.qc_template_items(id) ON DELETE SET NULL,
  label text NOT NULL,
  outcome public.qc_outcome NOT NULL DEFAULT 'not_checked',
  remarks text,
  image_urls text[] NOT NULL DEFAULT '{}',
  inspector_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS qc_results_stage_idx ON public.qc_results(production_stage_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qc_results TO authenticated;
GRANT ALL ON public.qc_results TO service_role;
ALTER TABLE public.qc_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage qc_results" ON public.qc_results FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));
CREATE TRIGGER qc_results_touch BEFORE UPDATE ON public.qc_results
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ INSTALLATION TRACKING ============
DO $$ BEGIN
  CREATE TYPE public.installation_status AS ENUM (
    'ready','packed','loaded','dispatched','delivered',
    'installed','damaged','replacement_required','replaced','returned'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.production_pieces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id uuid NOT NULL REFERENCES public.production_orders(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  piece_no text NOT NULL,
  bundle_no text,
  crate_no text,
  room text,
  elevation text,
  wall text,
  drawing_ref text,
  revision text,
  install_sequence int,
  status public.installation_status NOT NULL DEFAULT 'ready',
  status_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (production_order_id, piece_no)
);
CREATE INDEX IF NOT EXISTS pieces_po_idx ON public.production_pieces(production_order_id);
CREATE INDEX IF NOT EXISTS pieces_project_idx ON public.production_pieces(project_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_pieces TO authenticated;
GRANT ALL ON public.production_pieces TO service_role;
ALTER TABLE public.production_pieces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage production_pieces" ON public.production_pieces FOR ALL TO authenticated
  USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));
CREATE TRIGGER production_pieces_touch BEFORE UPDATE ON public.production_pieces
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PRODUCT CONFIGURATOR EXTENSIONS ============
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS commercial_name text,
  ADD COLUMN IF NOT EXISTS technical_description text,
  ADD COLUMN IF NOT EXISTS gst_pct numeric(5,2),
  ADD COLUMN IF NOT EXISTS estimated_mfg_days int,
  ADD COLUMN IF NOT EXISTS waste_pct numeric(5,2),
  ADD COLUMN IF NOT EXISTS required_capabilities text[] NOT NULL DEFAULT '{}';

-- ============ BULK IMPORT AUDIT ============
CREATE TABLE IF NOT EXISTS public.bulk_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_table text NOT NULL,
  filename text,
  row_count int NOT NULL DEFAULT 0,
  success_count int NOT NULL DEFAULT 0,
  error_count int NOT NULL DEFAULT 0,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.bulk_imports TO authenticated;
GRANT ALL ON public.bulk_imports TO service_role;
ALTER TABLE public.bulk_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read bulk_imports" ON public.bulk_imports FOR SELECT TO authenticated
  USING (public.has_staff_access(auth.uid()));
CREATE POLICY "Staff insert bulk_imports" ON public.bulk_imports FOR INSERT TO authenticated
  WITH CHECK (public.has_staff_access(auth.uid()));

-- ============ SEED A FEW QC TEMPLATES ============
INSERT INTO public.qc_templates (code, name, category, sort_order) VALUES
  ('QC-SURFACE','Surface Finish QC','surface',10),
  ('QC-DIMENSION','Dimension QC','dimension',20),
  ('QC-THICKNESS','Thickness QC','thickness',30),
  ('QC-EDGE','Edge QC','edge',40),
  ('QC-COLOUR','Colour / Shade QC','colour',50),
  ('QC-CRACK','Crack Inspection','crack',60),
  ('QC-PACKING','Packing QC','packing',70),
  ('QC-DISPATCH','Dispatch QC','dispatch',80)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.qc_template_items (template_id, label, sort_order)
SELECT t.id, item.label, item.sort
FROM public.qc_templates t
JOIN LATERAL (
  VALUES
    ('QC-SURFACE','Finish matches sample',10),
    ('QC-SURFACE','No visible scratches',20),
    ('QC-SURFACE','Uniform gloss / texture',30),
    ('QC-DIMENSION','Length within tolerance',10),
    ('QC-DIMENSION','Width within tolerance',20),
    ('QC-DIMENSION','Diagonal squareness',30),
    ('QC-THICKNESS','Thickness within tolerance',10),
    ('QC-THICKNESS','Consistent across the slab',20),
    ('QC-EDGE','Edge profile as specified',10),
    ('QC-EDGE','No chipping or fracture',20),
    ('QC-COLOUR','Matches approved shade card',10),
    ('QC-COLOUR','No unwanted veins / patches',20),
    ('QC-CRACK','No visible cracks',10),
    ('QC-CRACK','No hairline cracks under light',20),
    ('QC-PACKING','Correct crate / bundle numbering',10),
    ('QC-PACKING','Cushioning as per SOP',20),
    ('QC-DISPATCH','Piece count matches packing list',10),
    ('QC-DISPATCH','Vehicle sealed / documented',20)
) AS item(tcode, label, sort) ON item.tcode = t.code
WHERE NOT EXISTS (SELECT 1 FROM public.qc_template_items i WHERE i.template_id = t.id)
;

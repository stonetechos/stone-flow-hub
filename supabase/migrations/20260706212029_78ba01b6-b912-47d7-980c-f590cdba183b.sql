
-- =========================================================
-- Module 3 (stone industry) — Migration 1: masters + product FKs + seeds
-- =========================================================

-- 1. Stone types
CREATE TABLE public.stone_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  density_kg_m3 numeric(8,2),
  water_absorption_pct numeric(6,3),
  mohs_hardness numeric(3,1),
  indoor_ok boolean NOT NULL DEFAULT true,
  outdoor_ok boolean NOT NULL DEFAULT true,
  slip_rating text,
  weather_resistance text,
  uv_resistance text,
  recommended_applications text[] NOT NULL DEFAULT '{}',
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stone_types TO authenticated;
GRANT ALL ON public.stone_types TO service_role;
ALTER TABLE public.stone_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can read stone_types" ON public.stone_types FOR SELECT TO authenticated USING (public.has_staff_access(auth.uid()));
CREATE POLICY "Staff can write stone_types" ON public.stone_types FOR ALL TO authenticated USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));
CREATE TRIGGER stone_types_touch BEFORE UPDATE ON public.stone_types FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Surface finishes
CREATE TABLE public.surface_finishes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  anti_slip boolean NOT NULL DEFAULT false,
  indoor_ok boolean NOT NULL DEFAULT true,
  outdoor_ok boolean NOT NULL DEFAULT true,
  cost_multiplier numeric(6,3) NOT NULL DEFAULT 1.000,
  lead_time_days_delta int NOT NULL DEFAULT 0,
  applicable_stone_type_ids uuid[] NOT NULL DEFAULT '{}',
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.surface_finishes TO authenticated;
GRANT ALL ON public.surface_finishes TO service_role;
ALTER TABLE public.surface_finishes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can read surface_finishes" ON public.surface_finishes FOR SELECT TO authenticated USING (public.has_staff_access(auth.uid()));
CREATE POLICY "Staff can write surface_finishes" ON public.surface_finishes FOR ALL TO authenticated USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));
CREATE TRIGGER surface_finishes_touch BEFORE UPDATE ON public.surface_finishes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Edge finishes
CREATE TABLE public.edge_finishes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  cost_multiplier numeric(6,3) NOT NULL DEFAULT 1.000,
  machine_required boolean NOT NULL DEFAULT false,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.edge_finishes TO authenticated;
GRANT ALL ON public.edge_finishes TO service_role;
ALTER TABLE public.edge_finishes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can read edge_finishes" ON public.edge_finishes FOR SELECT TO authenticated USING (public.has_staff_access(auth.uid()));
CREATE POLICY "Staff can write edge_finishes" ON public.edge_finishes FOR ALL TO authenticated USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));
CREATE TRIGGER edge_finishes_touch BEFORE UPDATE ON public.edge_finishes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Product families
CREATE TABLE public.product_families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  default_uom text NOT NULL DEFAULT 'sqft',
  requires_artwork boolean NOT NULL DEFAULT false,
  requires_configurator boolean NOT NULL DEFAULT false,
  icon text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_families TO authenticated;
GRANT ALL ON public.product_families TO service_role;
ALTER TABLE public.product_families ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can read product_families" ON public.product_families FOR SELECT TO authenticated USING (public.has_staff_access(auth.uid()));
CREATE POLICY "Staff can write product_families" ON public.product_families FOR ALL TO authenticated USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));
CREATE TRIGGER product_families_touch BEFORE UPDATE ON public.product_families FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Manufacturing stages
CREATE TYPE public.stage_owner AS ENUM ('vendor','employee','either');

CREATE TABLE public.manufacturing_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 100,
  default_owner public.stage_owner NOT NULL DEFAULT 'either',
  typical_days int NOT NULL DEFAULT 1,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manufacturing_stages TO authenticated;
GRANT ALL ON public.manufacturing_stages TO service_role;
ALTER TABLE public.manufacturing_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can read manufacturing_stages" ON public.manufacturing_stages FOR SELECT TO authenticated USING (public.has_staff_access(auth.uid()));
CREATE POLICY "Staff can write manufacturing_stages" ON public.manufacturing_stages FOR ALL TO authenticated USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));
CREATE TRIGGER manufacturing_stages_touch BEFORE UPDATE ON public.manufacturing_stages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. Extend products (only truly-new columns; thickness_mm / origin_country / is_active already exist)
ALTER TABLE public.products
  ADD COLUMN family_id uuid REFERENCES public.product_families(id) ON DELETE SET NULL,
  ADD COLUMN stone_type_id uuid REFERENCES public.stone_types(id) ON DELETE SET NULL,
  ADD COLUMN surface_finish_id uuid REFERENCES public.surface_finishes(id) ON DELETE SET NULL,
  ADD COLUMN edge_finish_id uuid REFERENCES public.edge_finishes(id) ON DELETE SET NULL,
  ADD COLUMN colour text,
  ADD COLUMN size_length_mm numeric(9,2),
  ADD COLUMN size_width_mm numeric(9,2),
  ADD COLUMN weight_kg_per_unit numeric(10,3),
  ADD COLUMN technical_specs jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN market_price_inr numeric(14,2),
  ADD COLUMN last_purchase_price_inr numeric(14,2),
  ADD COLUMN last_selling_price_inr numeric(14,2),
  ADD COLUMN ai_tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN is_custom boolean NOT NULL DEFAULT false,
  ADD COLUMN config_hash text,
  ADD COLUMN config_json jsonb;

CREATE UNIQUE INDEX products_config_hash_uidx ON public.products(config_hash) WHERE config_hash IS NOT NULL;
CREATE INDEX products_family_idx ON public.products(family_id);
CREATE INDEX products_stone_type_idx ON public.products(stone_type_id);

-- 7. Child tables for products
CREATE TABLE public.product_technical_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  file_object_id uuid REFERENCES public.file_objects(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('datasheet','installation','care','certificate','other')),
  title text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_technical_docs TO authenticated;
GRANT ALL ON public.product_technical_docs TO service_role;
ALTER TABLE public.product_technical_docs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage product_technical_docs" ON public.product_technical_docs FOR ALL TO authenticated USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));

CREATE TABLE public.product_similar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  similar_product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  weight numeric(4,3) NOT NULL DEFAULT 0.500,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, similar_product_id),
  CHECK (product_id <> similar_product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_similar TO authenticated;
GRANT ALL ON public.product_similar TO service_role;
ALTER TABLE public.product_similar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage product_similar" ON public.product_similar FOR ALL TO authenticated USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));

CREATE TABLE public.product_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('purchase','selling','market')),
  price_inr numeric(14,2) NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  source_ref text,
  captured_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_price_history TO authenticated;
GRANT ALL ON public.product_price_history TO service_role;
ALTER TABLE public.product_price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage product_price_history" ON public.product_price_history FOR ALL TO authenticated USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));
CREATE INDEX product_price_history_product_captured_idx ON public.product_price_history(product_id, captured_at DESC);

-- =========================================================
-- Seeds
-- =========================================================

INSERT INTO public.stone_types (code,name,density_kg_m3,water_absorption_pct,mohs_hardness,indoor_ok,outdoor_ok,slip_rating,weather_resistance,uv_resistance,recommended_applications,sort_order) VALUES
  ('SANDSTONE','Sandstone',2400,3.5,6.5,true,true,'R11','high','high',ARRAY['wall_cladding','facade','flooring','paving'],10),
  ('LIMESTONE','Limestone',2500,4.0,4.0,true,true,'R10','medium','medium',ARRAY['wall_cladding','flooring','murals'],20),
  ('MARBLE','Marble',2700,0.5,4.0,true,false,'R9','low','medium',ARRAY['flooring','wall_cladding','countertop','sculpture'],30),
  ('GRANITE','Granite',2750,0.3,7.0,true,true,'R11','very_high','very_high',ARRAY['flooring','countertop','facade','paving'],40),
  ('SLATE','Slate',2800,0.4,5.5,true,true,'R12','high','high',ARRAY['roofing','wall_cladding','flooring'],50),
  ('QUARTZITE','Quartzite',2650,0.3,7.5,true,true,'R11','very_high','very_high',ARRAY['countertop','flooring','wall_cladding'],60),
  ('BASALT','Basalt',2950,0.5,6.0,true,true,'R11','very_high','very_high',ARRAY['paving','wall_cladding','facade'],70),
  ('TRAVERTINE','Travertine',2400,3.0,4.5,true,true,'R10','medium','medium',ARRAY['wall_cladding','flooring','facade'],80),
  ('ONYX','Onyx',2700,0.7,6.5,true,false,'R9','low','low',ARRAY['feature_wall','countertop','sculpture'],90),
  ('FLEXIBLE_STONE','Flexible Stone',1200,0.8,3.5,true,true,'R10','high','high',ARRAY['wall_cladding','curved_surfaces','veneer'],100);

INSERT INTO public.surface_finishes (code,name,anti_slip,indoor_ok,outdoor_ok,cost_multiplier,lead_time_days_delta,sort_order) VALUES
  ('NATURAL','Natural',true,true,true,1.000,0,10),
  ('SAWN','Sawn',true,true,true,1.050,1,20),
  ('ROCKFACE','Rockface',true,false,true,1.100,2,30),
  ('SPLITFACE','Splitface',true,false,true,1.100,2,40),
  ('SHOT_BLASTED','Shot Blasted',true,true,true,1.150,2,50),
  ('BUSH_HAMMERED','Bush Hammered',true,true,true,1.200,3,60),
  ('SANDBLASTED','Sandblasted',true,true,true,1.150,2,70),
  ('FLAMED','Flamed',true,false,true,1.180,3,80),
  ('BRUSHED','Brushed',false,true,true,1.180,2,90),
  ('HONED','Honed',false,true,true,1.220,3,100),
  ('LEATHER','Leather',false,true,false,1.300,4,110),
  ('POLISHED','Polished',false,true,false,1.350,4,120),
  ('ANTIQUE','Antique',false,true,true,1.280,3,130);

INSERT INTO public.edge_finishes (code,name,cost_multiplier,machine_required,sort_order) VALUES
  ('STRAIGHT','Straight',1.000,false,10),
  ('MACHINE_CUT','Machine Cut',1.020,true,20),
  ('BEVEL','Bevel',1.080,true,30),
  ('CHAMFER','Chamfer',1.080,true,40),
  ('HALF_BULLNOSE','Half Bullnose',1.150,true,50),
  ('BULLNOSE','Bullnose',1.200,true,60),
  ('MITRED','Mitred',1.220,true,70),
  ('ROCKFACE_EDGE','Rockface Edge',1.100,false,80),
  ('HAND_CHISELLED','Hand Chiselled',1.250,false,90);

INSERT INTO public.product_families (code,name,default_uom,requires_artwork,requires_configurator,icon,sort_order) VALUES
  ('STONE_MOSAIC','Stone Mosaic','sqft',false,true,'grid-3x3',10),
  ('STONE_PANEL','Stone Panel','sqft',false,true,'square',20),
  ('WALL_CLADDING','Wall Cladding','sqft',false,true,'layout-panel-top',30),
  ('STONE_VENEER','Stone Veneer','sqft',false,true,'layers',40),
  ('STONE_SLAB','Stone Slab','sqft',false,false,'square-stack',50),
  ('CUSTOM_STONE','Custom Stone','piece',false,true,'settings-2',60),
  ('CNC_ENGRAVING','CNC Engraving','piece',true,true,'chisel',70),
  ('MURAL','Mural','piece',true,false,'image',80),
  ('INLAY_ARTWORK','Inlay Artwork','piece',true,false,'gem',90),
  ('WATERJET','Waterjet Product','piece',true,true,'droplets',100),
  ('TABLE_TOP','Table Top','piece',false,true,'square-user',110),
  ('STAIR','Stair','piece',false,true,'stairs',120),
  ('COUNTERTOP','Countertop','sqft',false,true,'rectangle-horizontal',130),
  ('FOUNTAIN','Fountain','piece',true,false,'shell',140),
  ('SCULPTURE','Sculpture','piece',true,false,'crown',150),
  ('ARCHITECTURAL_FEATURE','Architectural Feature','piece',true,true,'columns-4',160);

INSERT INTO public.manufacturing_stages (code,name,sort_order,default_owner,typical_days) VALUES
  ('RAW_STONE','Raw Stone',10,'vendor',1),
  ('CUTTING','Cutting',20,'vendor',2),
  ('CALIBRATION','Calibration',30,'vendor',1),
  ('SURFACE_FINISH','Surface Finishing',40,'either',2),
  ('EDGE_PROCESSING','Edge Processing',50,'either',1),
  ('CNC_ENGRAVING','CNC Engraving',60,'employee',3),
  ('WATERJET','Waterjet',70,'employee',2),
  ('INLAY','Inlay',80,'employee',5),
  ('QC','Quality Check',90,'employee',1),
  ('PACKING','Packing',100,'employee',1),
  ('DISPATCH','Dispatch',110,'employee',1);

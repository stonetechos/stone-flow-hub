
-- ============================================================
-- Phase B: 7 new masters
-- ============================================================
CREATE TABLE public.stone_colours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  hex text,
  family text CHECK (family IN ('warm','cool','neutral','black','white','red','green','blue','yellow','brown','multi')),
  notes text,
  sort_order int NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stone_colours TO authenticated;
GRANT ALL ON public.stone_colours TO service_role;
ALTER TABLE public.stone_colours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stone_colours_read_all" ON public.stone_colours FOR SELECT TO authenticated USING (true);
CREATE POLICY "stone_colours_write_staff" ON public.stone_colours FOR ALL TO authenticated USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));
CREATE TRIGGER trg_stone_colours_updated BEFORE UPDATE ON public.stone_colours FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.stone_origins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  country text,
  region text,
  notes text,
  sort_order int NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stone_origins TO authenticated;
GRANT ALL ON public.stone_origins TO service_role;
ALTER TABLE public.stone_origins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stone_origins_read_all" ON public.stone_origins FOR SELECT TO authenticated USING (true);
CREATE POLICY "stone_origins_write_staff" ON public.stone_origins FOR ALL TO authenticated USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));
CREATE TRIGGER trg_stone_origins_updated BEFORE UPDATE ON public.stone_origins FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  indoor_ok boolean NOT NULL DEFAULT true,
  outdoor_ok boolean NOT NULL DEFAULT true,
  wet_area_ok boolean NOT NULL DEFAULT false,
  notes text,
  sort_order int NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "applications_read_all" ON public.applications FOR SELECT TO authenticated USING (true);
CREATE POLICY "applications_write_staff" ON public.applications FOR ALL TO authenticated USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));
CREATE TRIGGER trg_applications_updated BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.thicknesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  mm numeric(6,2) NOT NULL,
  is_slab_std boolean NOT NULL DEFAULT true,
  is_veneer boolean NOT NULL DEFAULT false,
  notes text,
  sort_order int NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.thicknesses TO authenticated;
GRANT ALL ON public.thicknesses TO service_role;
ALTER TABLE public.thicknesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "thicknesses_read_all" ON public.thicknesses FOR SELECT TO authenticated USING (true);
CREATE POLICY "thicknesses_write_staff" ON public.thicknesses FOR ALL TO authenticated USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));
CREATE TRIGGER trg_thicknesses_updated BEFORE UPDATE ON public.thicknesses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.quality_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  rank int NOT NULL DEFAULT 100,
  description text,
  sort_order int NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quality_grades TO authenticated;
GRANT ALL ON public.quality_grades TO service_role;
ALTER TABLE public.quality_grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quality_grades_read_all" ON public.quality_grades FOR SELECT TO authenticated USING (true);
CREATE POLICY "quality_grades_write_staff" ON public.quality_grades FOR ALL TO authenticated USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));
CREATE TRIGGER trg_quality_grades_updated BEFORE UPDATE ON public.quality_grades FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.packaging_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  is_export_ok boolean NOT NULL DEFAULT true,
  typical_weight_kg numeric(10,2),
  notes text,
  sort_order int NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.packaging_types TO authenticated;
GRANT ALL ON public.packaging_types TO service_role;
ALTER TABLE public.packaging_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "packaging_types_read_all" ON public.packaging_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "packaging_types_write_staff" ON public.packaging_types FOR ALL TO authenticated USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));
CREATE TRIGGER trg_packaging_types_updated BEFORE UPDATE ON public.packaging_types FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.uoms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  symbol text NOT NULL,
  dimension text NOT NULL CHECK (dimension IN ('area','length','volume','count','mass')),
  factor_to_base numeric(14,6),
  notes text,
  sort_order int NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.uoms TO authenticated;
GRANT ALL ON public.uoms TO service_role;
ALTER TABLE public.uoms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "uoms_read_all" ON public.uoms FOR SELECT TO authenticated USING (true);
CREATE POLICY "uoms_write_staff" ON public.uoms FOR ALL TO authenticated USING (public.has_staff_access(auth.uid())) WITH CHECK (public.has_staff_access(auth.uid()));
CREATE TRIGGER trg_uoms_updated BEFORE UPDATE ON public.uoms FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Extend products with configurator FKs
-- ============================================================
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS colour_id uuid REFERENCES public.stone_colours(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origin_id uuid REFERENCES public.stone_origins(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quality_grade_id uuid REFERENCES public.quality_grades(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS packaging_type_id uuid REFERENCES public.packaging_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS uom_id uuid REFERENCES public.uoms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS thickness_id uuid REFERENCES public.thicknesses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS application_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS processing jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS config_json jsonb,
  ADD COLUMN IF NOT EXISTS config_hash text,
  ADD COLUMN IF NOT EXISTS is_custom boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS auto_description text;
CREATE UNIQUE INDEX IF NOT EXISTS products_config_hash_uk ON public.products(config_hash) WHERE config_hash IS NOT NULL;

-- Family attributes for configurator
ALTER TABLE public.product_families
  ADD COLUMN IF NOT EXISTS configurable_attributes jsonb NOT NULL DEFAULT '[]'::jsonb;

-- ============================================================
-- Project-based manufacturing
-- ============================================================
ALTER TABLE public.production_orders
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS enquiry_id uuid REFERENCES public.enquiries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS drawing_ref text,
  ADD COLUMN IF NOT EXISTS revision text,
  ADD COLUMN IF NOT EXISTS room text,
  ADD COLUMN IF NOT EXISTS elevation text,
  ADD COLUMN IF NOT EXISTS wall text,
  ADD COLUMN IF NOT EXISTS install_sequence int,
  ADD COLUMN IF NOT EXISTS crate_no text,
  ADD COLUMN IF NOT EXISTS bundle_no text;

ALTER TABLE public.production_stages
  ADD COLUMN IF NOT EXISTS is_outsourced boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS planned_start date,
  ADD COLUMN IF NOT EXISTS actual_start timestamptz,
  ADD COLUMN IF NOT EXISTS qc_checklist jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Auto-generate default stages on production_order INSERT
CREATE OR REPLACE FUNCTION public.seed_production_stages()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id, sort_order FROM public.manufacturing_stages WHERE is_active = true ORDER BY sort_order LOOP
    INSERT INTO public.production_stages (production_order_id, stage_id, sort_order, status)
    VALUES (NEW.id, r.id, r.sort_order, 'pending');
  END LOOP;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_seed_production_stages ON public.production_orders;
CREATE TRIGGER trg_seed_production_stages AFTER INSERT ON public.production_orders
FOR EACH ROW EXECUTE FUNCTION public.seed_production_stages();

-- ============================================================
-- Vendor capability expansion (drop + recreate enum)
-- ============================================================
-- Add capability values used by RFQ routing.
DO $$ BEGIN
  BEGIN ALTER TYPE public.vendor_capability ADD VALUE IF NOT EXISTS 'rockface'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE public.vendor_capability ADD VALUE IF NOT EXISTS 'splitface'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE public.vendor_capability ADD VALUE IF NOT EXISTS 'shot_blast'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE public.vendor_capability ADD VALUE IF NOT EXISTS 'bush_hammer'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE public.vendor_capability ADD VALUE IF NOT EXISTS 'polished'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE public.vendor_capability ADD VALUE IF NOT EXISTS 'honed'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE public.vendor_capability ADD VALUE IF NOT EXISTS 'leather'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE public.vendor_capability ADD VALUE IF NOT EXISTS 'bevel'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE public.vendor_capability ADD VALUE IF NOT EXISTS 'bullnose'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE public.vendor_capability ADD VALUE IF NOT EXISTS 'brass_inlay'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE public.vendor_capability ADD VALUE IF NOT EXISTS 'semi_precious_inlay'; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ============================================================
-- Seeds
-- ============================================================
INSERT INTO public.stone_colours (code,name,hex,family,sort_order) VALUES
('BEIGE','Beige','#E1C699','warm',10),
('KANDLA_GREY','Kandla Grey','#6b7280','cool',20),
('KANDLA_YELLOW','Kandla Yellow','#d6b458','warm',25),
('RAINBOW','Rainbow','#a17e5b','multi',30),
('TEAKWOOD','Teakwood','#7a5230','brown',40),
('MINT_WHITE','Mint White','#f4f7f1','white',50),
('BLACK_GALAXY','Black Galaxy','#0b0d10','black',60),
('CARRARA_WHITE','Carrara White','#eeeeee','white',70),
('STATUARIO','Statuario','#f2f2ef','white',80),
('EMPERADOR_DARK','Emperador Dark','#4a2e21','brown',90),
('BOTTICINO','Botticino','#dcc9a3','warm',100),
('DESERT_BROWN','Desert Brown','#8b5a2b','brown',110),
('COPPER','Copper','#b87333','red',120),
('AUTUMN_BROWN','Autumn Brown','#7b3f00','brown',130),
('LILAC','Lilac','#c8a2c8','multi',140),
('MODAK','Modak','#c48a5a','warm',150),
('DHOLPUR_BEIGE','Dholpur Beige','#d4b17a','warm',160),
('TANDUR_BLUE','Tandur Blue','#4a6274','blue',170),
('TANDUR_YELLOW','Tandur Yellow','#c9a24b','warm',180),
('CUDDAPAH_BLACK','Cuddapah Black','#12130f','black',190),
('JAISALMER_YELLOW','Jaisalmer Yellow','#c2924a','yellow',200),
('MAKRANA_WHITE','Makrana White','#f5f2ea','white',210),
('GREEN_MARBLE','Green Marble','#4d7a52','green',220),
('ONYX_HONEY','Onyx Honey','#c68a3a','warm',230)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.stone_origins (code,name,country,region,sort_order) VALUES
('IN_RAJ','India — Rajasthan','India','Rajasthan',10),
('IN_KAR','India — Karnataka','India','Karnataka',20),
('IN_AP','India — Andhra Pradesh','India','Andhra Pradesh',30),
('IN_TN','India — Tamil Nadu','India','Tamil Nadu',40),
('IN_GJ','India — Gujarat','India','Gujarat',50),
('IN_MP','India — Madhya Pradesh','India','Madhya Pradesh',60),
('IT_CARR','Italy — Carrara','Italy','Tuscany',70),
('IT_SICILY','Italy — Sicily','Italy','Sicily',80),
('TR_MARM','Turkey — Marmara','Turkey','Marmara',90),
('TR_AFYON','Turkey — Afyon','Turkey','Afyon',100),
('BR_ESPI','Brazil — Espírito Santo','Brazil','Espírito Santo',110),
('SPAIN','Spain','Spain',NULL,120),
('IRAN','Iran','Iran',NULL,130),
('GREECE','Greece','Greece',NULL,140),
('EGYPT','Egypt','Egypt',NULL,150)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.applications (code,name,indoor_ok,outdoor_ok,wet_area_ok,sort_order) VALUES
('WALL_CLAD','Wall Cladding',true,true,false,10),
('FLOORING','Flooring',true,true,false,20),
('FACADE','Facade',false,true,false,30),
('COUNTERTOP','Countertop',true,false,true,40),
('BATHROOM','Bathroom',true,false,true,50),
('POOL','Pool / Water Feature',false,true,true,60),
('LANDSCAPE','Landscape',false,true,false,70),
('TEMPLE','Temple / Sacred',true,true,false,80),
('STAIR','Staircase',true,true,false,90),
('WINDOW_SILL','Window Sill',true,true,false,100),
('KITCHEN','Kitchen',true,false,true,110),
('LOBBY','Lobby / Reception',true,false,false,120),
('FEATURE_WALL','Feature Wall',true,true,false,130),
('DRIVEWAY','Driveway',false,true,false,140),
('FOUNTAIN','Fountain',false,true,true,150),
('MURAL','Mural / Artwork',true,true,false,160),
('COLUMN','Column / Pillar',true,true,false,170),
('SCULPTURE','Sculpture',true,true,false,180)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.thicknesses (code,name,mm,is_slab_std,is_veneer,sort_order) VALUES
('T3','3 mm (veneer)',3,false,true,10),
('T10','10 mm',10,true,false,20),
('T15','15 mm',15,true,false,30),
('T18','18 mm',18,true,false,40),
('T20','20 mm',20,true,false,50),
('T25','25 mm',25,true,false,60),
('T30','30 mm',30,true,false,70),
('T40','40 mm',40,true,false,80),
('T50','50 mm',50,true,false,90),
('T75','75 mm',75,true,false,100)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.quality_grades (code,name,rank,description,sort_order) VALUES
('PREMIUM','Premium',10,'Top selection, uniform colour, no defects',10),
('EXPORT','Export',20,'Export-quality with minimal veining variation',20),
('A','Grade A',30,'Standard commercial grade',30),
('B','Grade B',40,'Minor defects acceptable',40),
('C','Grade C',50,'Rustic / high-variation batch',50),
('COMMERCIAL','Commercial',60,'General use, bulk order',60)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.packaging_types (code,name,is_export_ok,typical_weight_kg,sort_order) VALUES
('WOOD_CRATE','Wooden Crate',true,45,10),
('FUMIG_CRATE','Fumigated Crate',true,45,20),
('PALLET','Pallet',true,25,30),
('BUNDLE','Bundle',false,15,40),
('CARTON','Carton',true,5,50),
('FOAM_WRAP','Foam Wrap',true,2,60),
('IRON_FRAME','Iron A-Frame',true,80,70),
('LOOSE','Loose (local)',false,NULL,80)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.uoms (code,name,symbol,dimension,factor_to_base,sort_order) VALUES
('SQFT','Square Foot','sq ft','area',0.092903,10),
('SQM','Square Metre','sq m','area',1,20),
('PIECE','Piece','pc','count',1,30),
('SLAB','Slab','slab','count',1,40),
('LF','Linear Foot','lin ft','length',0.3048,50),
('LM','Linear Metre','lin m','length',1,60),
('CBM','Cubic Metre','cbm','volume',1,70),
('KG','Kilogram','kg','mass',1,80),
('SET','Set','set','count',1,90),
('BOX','Box','box','count',1,100)
ON CONFLICT (code) DO NOTHING;

-- Extra product families
INSERT INTO public.product_families (code,name,default_uom,requires_artwork,requires_configurator,sort_order) VALUES
('STONE_MOSAIC','Stone Mosaic','sqft',false,true,10),
('INTERLOCKING_PANEL','Interlocking Panel','sqft',false,true,20),
('RANDOM_CLADDING','Random Cladding','sqft',false,true,30),
('ASHLAR_CLADDING','Ashlar Cladding','sqft',false,true,40),
('CRAZY_PAVING','Crazy Paving','sqft',false,true,50),
('FLEXIBLE_VENEER','Flexible Stone Veneer','sqft',false,true,60),
('MURAL','Stone Mural','piece',true,true,70),
('CNC_ARTWORK','CNC Engraved Artwork','piece',true,true,80),
('WATERJET_DESIGN','Waterjet Artwork','piece',true,true,90),
('SEMI_PRECIOUS_INLAY','Semi-Precious Inlay','piece',true,true,100),
('METAL_INLAY','Metal Inlay (Brass etc.)','piece',true,true,110),
('TEMPLE_CARVING','Temple Carving','piece',true,true,120),
('FEATURE_WALL','Feature Wall','sqft',false,true,130),
('FOUNTAIN','Fountain','piece',true,true,140),
('SCULPTURE','Sculpture','piece',true,true,150),
('COUNTERTOP','Countertop','sqft',false,true,160),
('WINDOW_SILL','Window Sill','linear_ft',false,true,170),
('STAIRCASE','Staircase','piece',false,true,180),
('TABLE_TOP','Table Top','piece',false,true,190),
('CUSTOM_PRODUCT','Custom Stone Product','piece',true,true,999)
ON CONFLICT (code) DO NOTHING;

-- Seed configurable_attributes per family
UPDATE public.product_families SET configurable_attributes = to_jsonb(ARRAY['family','stone_type','colour','origin','finish','size','application','packaging','uom']) WHERE code = 'STONE_MOSAIC';
UPDATE public.product_families SET configurable_attributes = to_jsonb(ARRAY['family','stone_type','colour','origin','finish','thickness','size','application','packaging','uom']) WHERE code IN ('INTERLOCKING_PANEL','RANDOM_CLADDING','ASHLAR_CLADDING','CRAZY_PAVING','FEATURE_WALL');
UPDATE public.product_families SET configurable_attributes = to_jsonb(ARRAY['family','stone_type','colour','backing','form','size','application','uom']) WHERE code = 'FLEXIBLE_VENEER';
UPDATE public.product_families SET configurable_attributes = to_jsonb(ARRAY['family','stone_type','colour','finish','size','artwork','application','packaging','uom']) WHERE code IN ('MURAL','TEMPLE_CARVING');
UPDATE public.product_families SET configurable_attributes = to_jsonb(ARRAY['family','stone_type','colour','finish','thickness','size','artwork','application','packaging','uom']) WHERE code IN ('CNC_ARTWORK','WATERJET_DESIGN');
UPDATE public.product_families SET configurable_attributes = to_jsonb(ARRAY['family','base_stone','inlay_material','finish','thickness','size','artwork','packaging','uom']) WHERE code IN ('SEMI_PRECIOUS_INLAY','METAL_INLAY');
UPDATE public.product_families SET configurable_attributes = to_jsonb(ARRAY['family','stone_type','colour','finish','edge','thickness','size','application','packaging','uom']) WHERE code IN ('COUNTERTOP','TABLE_TOP','WINDOW_SILL','STAIRCASE');
UPDATE public.product_families SET configurable_attributes = to_jsonb(ARRAY['family','stone_type','colour','finish','size','artwork','packaging','uom']) WHERE code IN ('FOUNTAIN','SCULPTURE');
UPDATE public.product_families SET configurable_attributes = to_jsonb(ARRAY['family','stone_type','colour','origin','finish','edge','thickness','size','application','processing','grade','packaging','uom','artwork']) WHERE code = 'CUSTOM_PRODUCT';

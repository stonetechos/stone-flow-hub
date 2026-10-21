-- Migration: Seed 29 default natural stone products across 5 core categories
-- Corresponds to Stone Tech CRM's standard architectural stone range

DO $$
DECLARE
  v_cat_slabs uuid;
  v_cat_landscaping uuid;
  v_cat_art uuid;
  v_cat_cladding uuid;
  v_cat_flooring uuid;
BEGIN
  -- 1. Ensure the 5 core product categories exist
  INSERT INTO public.product_categories (name, slug, sort_order, is_active)
  VALUES ('Slabs & Blocks', 'slabs-blocks', 10, true)
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_cat_slabs;

  INSERT INTO public.product_categories (name, slug, sort_order, is_active)
  VALUES ('Landscaping & Exterior', 'landscaping-exterior', 20, true)
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_cat_landscaping;

  INSERT INTO public.product_categories (name, slug, sort_order, is_active)
  VALUES ('Art & Articles', 'art-articles', 30, true)
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_cat_art;

  INSERT INTO public.product_categories (name, slug, sort_order, is_active)
  VALUES ('Veneers & Cladding', 'veneers-cladding', 40, true)
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_cat_cladding;

  INSERT INTO public.product_categories (name, slug, sort_order, is_active)
  VALUES ('Flooring', 'flooring', 50, true)
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_cat_flooring;

  -- Fallback if already existed and RETURNING didn't fire
  IF v_cat_slabs IS NULL THEN SELECT id INTO v_cat_slabs FROM public.product_categories WHERE slug = 'slabs-blocks'; END IF;
  IF v_cat_landscaping IS NULL THEN SELECT id INTO v_cat_landscaping FROM public.product_categories WHERE slug = 'landscaping-exterior'; END IF;
  IF v_cat_art IS NULL THEN SELECT id INTO v_cat_art FROM public.product_categories WHERE slug = 'art-articles'; END IF;
  IF v_cat_cladding IS NULL THEN SELECT id INTO v_cat_cladding FROM public.product_categories WHERE slug = 'veneers-cladding'; END IF;
  IF v_cat_flooring IS NULL THEN SELECT id INTO v_cat_flooring FROM public.product_categories WHERE slug = 'flooring'; END IF;

  -- 2. Seed the 29 default products if not present
  -- Category: Slabs & Blocks
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE lower(name) = lower('Italian Marble Slabs')) THEN
    INSERT INTO public.products (name, category_id, stone_type, finish, thickness_mm, default_unit, hsn_code, description, is_active)
    VALUES ('Italian Marble Slabs', v_cat_slabs, 'marble', 'polished', 18, 'sqft', '68022190', 'Premium imported Italian marble slabs for high-end flooring and feature walls', true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.products WHERE lower(name) = lower('Indian Marble Slabs')) THEN
    INSERT INTO public.products (name, category_id, stone_type, finish, thickness_mm, default_unit, hsn_code, description, is_active)
    VALUES ('Indian Marble Slabs', v_cat_slabs, 'marble', 'polished', 18, 'sqft', '68022190', 'Finest indigenous Indian marble slabs (Makrana, Morwad, Dungri, Ambaji)', true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.products WHERE lower(name) = lower('Granite Slabs')) THEN
    INSERT INTO public.products (name, category_id, stone_type, finish, thickness_mm, default_unit, hsn_code, description, is_active)
    VALUES ('Granite Slabs', v_cat_slabs, 'granite', 'polished', 18, 'sqft', '68022390', 'High-durability granite slabs for countertops, steps, and heavy footfall areas', true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.products WHERE lower(name) = lower('Limestone Slabs')) THEN
    INSERT INTO public.products (name, category_id, stone_type, finish, thickness_mm, default_unit, hsn_code, description, is_active)
    VALUES ('Limestone Slabs', v_cat_slabs, 'limestone', 'honed', 20, 'sqft', '68029200', 'Architectural limestone slabs (Kota, Tandur, Shahabad, Jaisalmer)', true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.products WHERE lower(name) = lower('Agate Slabs')) THEN
    INSERT INTO public.products (name, category_id, stone_type, finish, thickness_mm, default_unit, hsn_code, description, is_active)
    VALUES ('Agate Slabs', v_cat_slabs, 'onyx', 'polished', 20, 'sqft', '68029900', 'Semi-precious back-lit agate composite slabs for statement walls and bars', true);
  END IF;

  -- Category: Landscaping & Exterior
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE lower(name) = lower('Cobblestone')) THEN
    INSERT INTO public.products (name, category_id, stone_type, finish, thickness_mm, default_unit, hsn_code, description, is_active)
    VALUES ('Cobblestone', v_cat_landscaping, 'sandstone', 'other', 50, 'sqft', '68010000', 'Natural cleft stone cobblestones for driveways, ramps, and pathways', true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.products WHERE lower(name) = lower('Pebblestone')) THEN
    INSERT INTO public.products (name, category_id, stone_type, finish, thickness_mm, default_unit, hsn_code, description, is_active)
    VALUES ('Pebblestone', v_cat_landscaping, 'other', 'other', NULL, 'sqft', '68010000', 'Tumbled and river pebbles in multiple colors for landscaping and accents', true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.products WHERE lower(name) = lower('Boulders')) THEN
    INSERT INTO public.products (name, category_id, stone_type, finish, thickness_mm, default_unit, hsn_code, description, is_active)
    VALUES ('Boulders', v_cat_landscaping, 'other', 'other', NULL, 'piece', '68010000', 'Natural river and quarry landscape boulders for exterior focal points', true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.products WHERE lower(name) = lower('Stepping Stone')) THEN
    INSERT INTO public.products (name, category_id, stone_type, finish, thickness_mm, default_unit, hsn_code, description, is_active)
    VALUES ('Stepping Stone', v_cat_landscaping, 'sandstone', 'flamed', 35, 'sqft', '68010000', 'Textured natural non-slip stepping stones for lawns and walkways', true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.products WHERE lower(name) = lower('Waterfall')) THEN
    INSERT INTO public.products (name, category_id, stone_type, finish, thickness_mm, default_unit, hsn_code, description, is_active)
    VALUES ('Waterfall', v_cat_landscaping, 'other', 'other', NULL, 'piece', '68029900', 'Custom-crafted natural stone water features and cascading waterfall panels', true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.products WHERE lower(name) = lower('Fountain')) THEN
    INSERT INTO public.products (name, category_id, stone_type, finish, thickness_mm, default_unit, hsn_code, description, is_active)
    VALUES ('Fountain', v_cat_landscaping, 'marble', 'other', NULL, 'piece', '68029900', 'Tiered and monolithic architectural stone fountains for courtyards and entrances', true);
  END IF;

  -- Category: Art & Articles
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE lower(name) = lower('Sculptures')) THEN
    INSERT INTO public.products (name, category_id, stone_type, finish, thickness_mm, default_unit, hsn_code, description, is_active)
    VALUES ('Sculptures', v_cat_art, 'marble', 'other', NULL, 'piece', '97030090', 'Hand-carved architectural stone sculptures, statues, and artistic artifacts', true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.products WHERE lower(name) = lower('Custom Stone Basins')) THEN
    INSERT INTO public.products (name, category_id, stone_type, finish, thickness_mm, default_unit, hsn_code, description, is_active)
    VALUES ('Custom Stone Basins', v_cat_art, 'marble', 'honed', NULL, 'piece', '68029900', 'Bespoke hand-carved monolithic stone washbasins and vanity sinks', true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.products WHERE lower(name) = lower('Agate Stone Articles')) THEN
    INSERT INTO public.products (name, category_id, stone_type, finish, thickness_mm, default_unit, hsn_code, description, is_active)
    VALUES ('Agate Stone Articles', v_cat_art, 'onyx', 'polished', NULL, 'piece', '68029900', 'Handcrafted semi-precious agate platters, coasters, and luxury lifestyle artifacts', true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.products WHERE lower(name) = lower('Inlay Work')) THEN
    INSERT INTO public.products (name, category_id, stone_type, finish, thickness_mm, default_unit, hsn_code, description, is_active)
    VALUES ('Inlay Work', v_cat_art, 'marble', 'polished', 18, 'sqft', '68022190', 'Pietra dura and precision waterjet semi-precious stone inlay in marble', true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.products WHERE lower(name) = lower('Table Top')) THEN
    INSERT INTO public.products (name, category_id, stone_type, finish, thickness_mm, default_unit, hsn_code, description, is_active)
    VALUES ('Table Top', v_cat_art, 'marble', 'polished', 20, 'sqft', '68022190', 'Solid natural stone and marble dining, console, and center tabletops', true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.products WHERE lower(name) = lower('Stone Murals')) THEN
    INSERT INTO public.products (name, category_id, stone_type, finish, thickness_mm, default_unit, hsn_code, description, is_active)
    VALUES ('Stone Murals', v_cat_art, 'sandstone', 'other', 30, 'sqft', '97030090', '3D carved stone wall murals and CNC relief artwork for facades and lobbies', true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.products WHERE lower(name) = lower('Stone Veneer Artwork')) THEN
    INSERT INTO public.products (name, category_id, stone_type, finish, thickness_mm, default_unit, hsn_code, description, is_active)
    VALUES ('Stone Veneer Artwork', v_cat_art, 'slate', 'other', 2, 'sqft', '97030090', 'Contemporary backlit artwork created on translucent and ultra-thin flexible stone veneer', true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.products WHERE lower(name) = lower('Temple Work Handcrafting')) THEN
    INSERT INTO public.products (name, category_id, stone_type, finish, thickness_mm, default_unit, hsn_code, description, is_active)
    VALUES ('Temple Work Handcrafting', v_cat_art, 'marble', 'other', NULL, 'sqft', '68029900', 'Intricate traditional handcrafting, jali screens, shikhar elements, and mandir shrines', true);
  END IF;

  -- Category: Veneers & Cladding
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE lower(name) = lower('Stone Veneer')) THEN
    INSERT INTO public.products (name, category_id, stone_type, finish, thickness_mm, default_unit, hsn_code, description, is_active)
    VALUES ('Stone Veneer', v_cat_cladding, 'slate', 'other', 2, 'sqft', '68029900', 'Ultra-thin lightweight flexible natural stone veneer for interior and curved wall applications', true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.products WHERE lower(name) = lower('Clay Veneers')) THEN
    INSERT INTO public.products (name, category_id, stone_type, finish, thickness_mm, default_unit, hsn_code, description, is_active)
    VALUES ('Clay Veneers', v_cat_cladding, 'other', 'other', 3, 'sqft', '69072100', 'Flexible terracotta and clay veneer sheets for earthy textured elevations', true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.products WHERE lower(name) = lower('PU Panels')) THEN
    INSERT INTO public.products (name, category_id, stone_type, finish, thickness_mm, default_unit, hsn_code, description, is_active)
    VALUES ('PU Panels', v_cat_cladding, 'engineered', 'other', 25, 'sqft', '39269099', 'High-density polyurethane faux stone featherweight interlocking 3D accent panels', true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.products WHERE lower(name) = lower('Natural Stone Cladding Tiles')) THEN
    INSERT INTO public.products (name, category_id, stone_type, finish, thickness_mm, default_unit, hsn_code, description, is_active)
    VALUES ('Natural Stone Cladding Tiles', v_cat_cladding, 'sandstone', 'other', 15, 'sqft', '68022190', 'Precision calibrated natural stone wall cladding tiles for exterior facades', true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.products WHERE lower(name) = lower('Natural Stone Interlocking Panels')) THEN
    INSERT INTO public.products (name, category_id, stone_type, finish, thickness_mm, default_unit, hsn_code, description, is_active)
    VALUES ('Natural Stone Interlocking Panels', v_cat_cladding, 'slate', 'other', 15, 'sqft', '68022190', 'Z-shape and ledger lock interlocking stone wall panels for seamless textures', true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.products WHERE lower(name) = lower('Natural Stone Mosaics')) THEN
    INSERT INTO public.products (name, category_id, stone_type, finish, thickness_mm, default_unit, hsn_code, description, is_active)
    VALUES ('Natural Stone Mosaics', v_cat_cladding, 'marble', 'honed', 10, 'sqft', '68022190', 'Mesh-backed geometric, herringbone, and basketweave natural marble mosaic sheets', true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.products WHERE lower(name) = lower('Custom Stone Cladding')) THEN
    INSERT INTO public.products (name, category_id, stone_type, finish, thickness_mm, default_unit, hsn_code, description, is_active)
    VALUES ('Custom Stone Cladding', v_cat_cladding, 'limestone', 'honed', 20, 'sqft', '68022190', 'Architectural custom-dimension stone panels for dry-clad and mechanical fixing', true);
  END IF;

  -- Category: Flooring
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE lower(name) = lower('General Flooring')) THEN
    INSERT INTO public.products (name, category_id, stone_type, finish, thickness_mm, default_unit, hsn_code, description, is_active)
    VALUES ('General Flooring', v_cat_flooring, 'marble', 'polished', 18, 'sqft', '68022190', 'Standard cut-to-size natural stone and marble flooring tiles', true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.products WHERE lower(name) = lower('Custom Flooring')) THEN
    INSERT INTO public.products (name, category_id, stone_type, finish, thickness_mm, default_unit, hsn_code, description, is_active)
    VALUES ('Custom Flooring', v_cat_flooring, 'marble', 'polished', 18, 'sqft', '68022190', 'Tailored bookmatched patterns, waterjet borders, and bespoke flooring layouts', true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.products WHERE lower(name) = lower('Crazy Pattern in Stone')) THEN
    INSERT INTO public.products (name, category_id, stone_type, finish, thickness_mm, default_unit, hsn_code, description, is_active)
    VALUES ('Crazy Pattern in Stone', v_cat_flooring, 'sandstone', 'other', 25, 'sqft', '68010000', 'Rustic irregular shaped natural flagstone and crazy paving for outdoor patios', true);
  END IF;

END $$;

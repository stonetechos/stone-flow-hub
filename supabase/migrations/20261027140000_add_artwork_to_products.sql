-- Migration: Add Artwork product to master catalog and material_interest enum
DO $$
DECLARE
  v_cat_art uuid;
BEGIN
  -- 1. Ensure Art & Articles category exists
  SELECT id INTO v_cat_art FROM public.product_categories WHERE slug = 'art-articles';
  IF v_cat_art IS NULL THEN
    INSERT INTO public.product_categories (name, slug, sort_order, is_active)
    VALUES ('Art & Articles', 'art-articles', 30, true)
    RETURNING id INTO v_cat_art;
  END IF;

  -- 2. Seed Artwork product if not already present
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE lower(name) = lower('Artwork')) THEN
    INSERT INTO public.products (
      name, category_id, stone_type, finish, thickness_mm, default_unit, hsn_code, description, is_active
    )
    VALUES (
      'Artwork', v_cat_art, 'marble', 'other', NULL, 'piece', '97030090',
      'Bespoke architectural stone artwork, relief carvings, and fine decorative stone art', true
    );
  END IF;

  -- 3. Add to material_interest enum safely
  BEGIN
    ALTER TYPE public.material_interest ADD VALUE IF NOT EXISTS 'artwork';
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;
END $$;

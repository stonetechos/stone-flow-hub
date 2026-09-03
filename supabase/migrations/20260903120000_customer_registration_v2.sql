-- =========================================================================
-- Customer Registration v2 (Step 1 of the simplification rebuild)
-- Adds the new "Type of Customer" values, a referral name field, a site
-- address distinct from billing address, a "Type of space" classification,
-- and a multi-select "Material In" interest list — all additive so existing
-- customers and every other module (invoicing, GST, quotes) keep working
-- unchanged.
-- =========================================================================

-- ----- customer_type: add the new acquisition/classification values -----
-- Existing values (builder, architect, interior_designer, contractor,
-- individual, company, government, other) are left in place for existing
-- rows and are simply no longer offered in the create form's dropdown.
ALTER TYPE public.customer_type ADD VALUE IF NOT EXISTS 'walk_in';
ALTER TYPE public.customer_type ADD VALUE IF NOT EXISTS 'b2b';
ALTER TYPE public.customer_type ADD VALUE IF NOT EXISTS 'google_search';
ALTER TYPE public.customer_type ADD VALUE IF NOT EXISTS 'reference';

-- ----- Type of space (new enum) -----
DO $$ BEGIN
  CREATE TYPE public.space_type AS ENUM (
    'bungalow', 'apartment', 'farmhouse', 'commercial_space', 'resort',
    'residential_building', 'educational_institution', 'holy_place',
    'garden', 'exhibition', 'showroom', 'spa', 'restaurant', 'hotel',
    'govt_institution', 'college', 'hostel', 'mall'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ----- Material In options (new enum, used as an array column) -----
DO $$ BEGIN
  CREATE TYPE public.material_interest AS ENUM (
    'natural_stone_interlocking_panels', 'natural_stone_mosaics', 'stone_murals',
    'inlay_work', 'table_top', 'custom_stone_cladding', 'crazy_pattern_in_stone',
    'general_flooring', 'custom_flooring', 'stepping_stone', 'stone_veneer',
    'pu_panels', 'stone_veneer_artwork', 'agate_slabs'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ----- New columns on customers -----
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS referred_by text,
  ADD COLUMN IF NOT EXISTS site_address text,
  ADD COLUMN IF NOT EXISTS space_type public.space_type,
  ADD COLUMN IF NOT EXISTS material_interests public.material_interest[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.customers.referred_by IS 'Name of the person who referred this customer — only meaningful when customer_type = ''reference''.';
COMMENT ON COLUMN public.customers.site_address IS 'Site''s area/address — where the work happens, distinct from billing_address.';
COMMENT ON COLUMN public.customers.space_type IS 'Type of space at the site (bungalow, apartment, showroom, etc.).';
COMMENT ON COLUMN public.customers.material_interests IS 'Multi-select list of stone/material products the customer is interested in.';

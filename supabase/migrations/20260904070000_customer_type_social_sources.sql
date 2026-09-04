-- =========================================================================
-- Add Instagram, IndiaMART, and Pinterest as "Type of Customer" acquisition
-- sources, alongside the existing google_search/reference values added in
-- the Customer Registration v2 migration.
-- =========================================================================

ALTER TYPE public.customer_type ADD VALUE IF NOT EXISTS 'instagram';
ALTER TYPE public.customer_type ADD VALUE IF NOT EXISTS 'indiamart';
ALTER TYPE public.customer_type ADD VALUE IF NOT EXISTS 'pinterest';


-- ============================================================
-- Company Profiles: multi-firm support + new branding fields
-- ============================================================
ALTER TABLE public.company_profiles
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS alt_logo_url text,
  ADD COLUMN IF NOT EXISTS primary_contact text,
  ADD COLUMN IF NOT EXISTS secondary_contact text,
  ADD COLUMN IF NOT EXISTS msme_no text,
  ADD COLUMN IF NOT EXISTS designation text,
  ADD COLUMN IF NOT EXISTS qr_code_url text,
  ADD COLUMN IF NOT EXISTS invoice_footer text,
  ADD COLUMN IF NOT EXISTS terms_and_conditions text;

-- Allow multiple active firms. Drop any prior single-active index if present.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT indexname FROM pg_indexes
     WHERE schemaname='public' AND tablename='company_profiles'
       AND indexname ILIKE '%active%'
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS public.%I', r.indexname);
  END LOOP;
END $$;

-- ============================================================
-- Invoice status: add `issued`
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
     JOIN pg_type t ON t.oid = e.enumtypid
     WHERE t.typname='invoice_status' AND e.enumlabel='issued'
  ) THEN
    ALTER TYPE public.invoice_status ADD VALUE 'issued' AFTER 'draft';
  END IF;
END $$;

-- ============================================================
-- Invoices: firm link, site address, header extras, logistics, charges
-- ============================================================
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS company_profile_id uuid REFERENCES public.company_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS billing_address text,
  ADD COLUMN IF NOT EXISTS site_name text,
  ADD COLUMN IF NOT EXISTS site_address text,
  ADD COLUMN IF NOT EXISTS site_contact_name text,
  ADD COLUMN IF NOT EXISTS site_contact_phone text,
  ADD COLUMN IF NOT EXISTS customer_po_no text,
  ADD COLUMN IF NOT EXISTS payment_terms text,
  ADD COLUMN IF NOT EXISTS sales_executive_id uuid,
  -- logistics (all optional)
  ADD COLUMN IF NOT EXISTS transporter text,
  ADD COLUMN IF NOT EXISTS vehicle_no text,
  ADD COLUMN IF NOT EXISTS truck_no text,
  ADD COLUMN IF NOT EXISTS lr_no text,
  ADD COLUMN IF NOT EXISTS driver_name text,
  ADD COLUMN IF NOT EXISTS driver_mobile text,
  ADD COLUMN IF NOT EXISTS dispatch_date date,
  ADD COLUMN IF NOT EXISTS eway_bill_no text,
  ADD COLUMN IF NOT EXISTS einvoice_irn text,
  ADD COLUMN IF NOT EXISTS dispatch_remarks text,
  -- extra charges (default 0; recalc trigger will consume when updated)
  ADD COLUMN IF NOT EXISTS freight numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS packing numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loading numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unloading numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_charges numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS round_off numeric NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS invoices_company_profile_id_idx
  ON public.invoices(company_profile_id);

-- ============================================================
-- Invoice items: discount %
-- ============================================================
ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS discount_pct numeric NOT NULL DEFAULT 0;

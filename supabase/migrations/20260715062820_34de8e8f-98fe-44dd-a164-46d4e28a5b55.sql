-- Company Profile / Company Master module.
--
-- Audit finding: the app already had a single-source concept for
-- documents' own letterhead info — `app_settings.branding`, a loose JSON
-- blob (company_name/tagline/address/phone/email/gstin/website/colours)
-- read via lib/branding/loadBranding() and consumed by the shared PDF
-- engine (lib/pdf/generator.ts), the email shell, and dispatch print. It
-- had no admin UI, no structured columns, no GSTIN validation, no bank
-- details, no signatory/signature/stamp, and defaulted "Stone Tech" only
-- in application code (lib/branding/index.ts's DEFAULT_BRANDING) rather
-- than in the database.
--
-- This migration creates the real, structured, single source of truth —
-- `company_profiles` — and a following code change repoints
-- loadBranding() to read from it instead of app_settings.branding, so
-- every existing consumer (invoices, quotes, POs, delivery challans,
-- receipts, estimates, email templates) picks up the richer data with no
-- per-document changes. `is_active` plus a partial unique index (rather
-- than a hardcoded single-row assumption) is what makes this
-- multi-company-ready later without a schema change: today exactly one
-- row has is_active = true; a future "switch active company" feature is
-- just an UPDATE away.

CREATE TABLE public.company_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active boolean NOT NULL DEFAULT true,

  company_name text NOT NULL,
  gstin text,
  legal_business_name text,
  trade_name text,

  address_line1 text,
  address_line2 text,
  city text,
  state text,
  pincode text,
  country text NOT NULL DEFAULT 'India',

  phone text,
  mobile text,
  email text,
  website text,
  logo_url text,

  pan text,
  cin text,

  bank_name text,
  bank_branch text,
  bank_account_number text,
  bank_ifsc text,
  upi_id text,

  authorized_signatory text,
  signature_url text,
  stamp_url text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Defense in depth alongside the client-side Zod check (Task 9 —
  -- "Validate the GSTIN format before saving"). Standard 15-character
  -- GSTIN: 2-digit state code + 10-character PAN + 1-digit entity number
  -- + literal 'Z' + 1 checksum alphanumeric. Nullable because a brand
  -- new company profile may be created before GSTIN is known.
  CONSTRAINT company_profiles_gstin_format CHECK (
    gstin IS NULL OR gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
  )
);

-- Only one active company profile at a time (Task 8 — "only one active
-- Company Profile by default"). A partial unique index rather than a
-- singleton-row constraint, so inserting a second, inactive company row
-- for future multi-company support is always allowed.
CREATE UNIQUE INDEX company_profiles_single_active_idx
  ON public.company_profiles (is_active)
  WHERE is_active = true;

GRANT SELECT ON public.company_profiles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.company_profiles TO authenticated;
GRANT ALL ON public.company_profiles TO service_role;

ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;

-- Task 11: every signed-in user can read (documents/print/email all need
-- it), only admins can write.
CREATE POLICY "Authenticated users can view company profile" ON public.company_profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert company profile" ON public.company_profiles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update company profile" ON public.company_profiles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete company profile" ON public.company_profiles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Reuses the existing generic updated_at trigger function.
CREATE TRIGGER trg_company_profiles_updated
  BEFORE UPDATE ON public.company_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Default company details (Requirements 2-3).
INSERT INTO public.company_profiles (company_name, gstin, is_active)
VALUES ('Stone Tech', '24BJEPR8383P1ZB', true);

-- Public-read storage bucket for logo/signature/stamp uploads. These
-- images are embedded in generated PDFs and emails sent to recipients
-- who are never authenticated Supabase users, so — unlike the existing
-- private stonetech-files bucket (signed URLs, lib/attachments/api.ts) —
-- this one needs durable public URLs, not short-lived signed ones.
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read company assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'company-assets');
CREATE POLICY "Admins upload company assets" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'company-assets' AND public.has_role(auth.uid(), 'admin'::app_role)
  );
CREATE POLICY "Admins update company assets" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'company-assets' AND public.has_role(auth.uid(), 'admin'::app_role)
  );
CREATE POLICY "Admins delete company assets" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'company-assets' AND public.has_role(auth.uid(), 'admin'::app_role)
  );

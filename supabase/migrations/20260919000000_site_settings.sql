-- Migration: site_settings
-- Stores key/value pairs that control editable landing-page content.
-- Admins can update rows; everyone (including anonymous visitors) can read.

CREATE TABLE IF NOT EXISTS public.site_settings (
  key         text PRIMARY KEY,
  value       jsonb        NOT NULL,
  label       text         NOT NULL DEFAULT '',
  description text         NOT NULL DEFAULT '',
  updated_at  timestamptz  NOT NULL DEFAULT now(),
  updated_by  uuid         REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read (landing page is public).
CREATE POLICY "site_settings_public_read"
  ON public.site_settings
  FOR SELECT
  USING (true);

-- Only admin / super_admin can write.
CREATE POLICY "site_settings_admin_write"
  ON public.site_settings
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Seed default values.
INSERT INTO public.site_settings (key, value, label, description) VALUES
  (
    'google_rating',
    '4.9'::jsonb,
    'Google Rating',
    'The star rating shown on the landing page and in the estimate form (e.g. 4.9).'
  ),
  (
    'reviews',
    '[
      {
        "quote": "Exceptional craftsmanship on our villa''s fluted stone elevation. The dry-lay matching and sub-millimeter tolerances delivered by Stone Tech were impeccable.",
        "author": "Ar. Mihir Patel",
        "role": "Principal Architect, Ahmedabad",
        "rating": 5
      },
      {
        "quote": "Visited their SG Business Hub showroom in Gota. The CNC mandir murals and flexible stone veneers exceeded our expectations. Extremely prompt WhatsApp coordination.",
        "author": "Bhavin Shah",
        "role": "Homeowner, Gota, Ahmedabad",
        "rating": 5
      },
      {
        "quote": "Direct Rajasthan quarry sourcing with 3-year warranty and zero transit breakage. The most reliable natural stone partner for our luxury residences.",
        "author": "Pooja Mehta",
        "role": "Luxury Interior Designer",
        "rating": 5
      }
    ]'::jsonb,
    'Customer Reviews',
    'The review carousel shown in the Contact / Reach Us section. Each item must have quote, author, role, and rating (1-5).'
  ),
  (
    'estimate_card_heading',
    '"Request for Estimate"'::jsonb,
    'Estimate Card Heading',
    'Title of the Request for Estimate card on the landing page.'
  ),
  (
    'estimate_card_subtext',
    '"Get a personalised stone estimate — WhatsApp-ready in minutes."'::jsonb,
    'Estimate Card Sub-text',
    'Subtitle / description line inside the Request for Estimate card.'
  )
ON CONFLICT (key) DO NOTHING;

-- Auto-update updated_at on every write.
CREATE OR REPLACE FUNCTION public.site_settings_updated_at()
  RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.site_settings_updated_at();

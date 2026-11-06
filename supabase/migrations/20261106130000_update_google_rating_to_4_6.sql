-- Migration: Update google_rating to 4.6
-- Updates app_settings for site.google_rating and google_rating

INSERT INTO public.app_settings (key, value, description, updated_at)
VALUES ('site.google_rating', '"4.6"'::jsonb, 'Site setting for google_rating', now())
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, updated_at = now();

INSERT INTO public.app_settings (key, value, description, updated_at)
VALUES ('google_rating', '"4.6"'::jsonb, 'Google Business Rating', now())
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, updated_at = now();

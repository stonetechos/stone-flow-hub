-- Migration: Ensure Instagram handle and clean any Makrana / Rajasthan references from DB settings
-- Date: 2026-11-20

DO $$
BEGIN
  -- Update site.website_landing_content in app_settings
  IF EXISTS (SELECT 1 FROM public.app_settings WHERE key = 'site.website_landing_content') THEN
    UPDATE public.app_settings
    SET value = value 
      || jsonb_build_object(
        'brandTagline', 'Architectural Stone Atelier · Ahmedabad',
        'contactAddressMakrana', '',
        'contactAddressJaipur', 'E-02, Ground Floor, in front of The Festival Residency, SG Business Hub, Vasant Nagar, Gota, Ahmedabad, Gujarat, Pin Code: 380060'
      ),
      updated_at = now()
    WHERE key = 'site.website_landing_content';
  END IF;

  -- Also update website.landing_content if present
  IF EXISTS (SELECT 1 FROM public.app_settings WHERE key = 'website.landing_content') THEN
    UPDATE public.app_settings
    SET value = value 
      || jsonb_build_object(
        'brandTagline', 'Architectural Stone Atelier · Ahmedabad',
        'contactAddressMakrana', '',
        'contactAddressJaipur', 'E-02, Ground Floor, in front of The Festival Residency, SG Business Hub, Vasant Nagar, Gota, Ahmedabad, Gujarat, Pin Code: 380060'
      ),
      updated_at = now()
    WHERE key = 'website.landing_content';
  END IF;
END $$;

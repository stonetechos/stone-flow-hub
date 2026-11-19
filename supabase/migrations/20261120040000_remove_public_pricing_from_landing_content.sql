-- Migration: Remove public viewable pricing and factory rate references from landing content app_settings

DO $$
DECLARE
  v_rec RECORD;
  v_val jsonb;
BEGIN
  FOR v_rec IN SELECT key, value FROM public.app_settings WHERE key IN ('site.website_landing_content', 'website.landing_content') LOOP
    v_val := v_rec.value;
    
    -- Update showcaseSectionSubtitle
    IF v_val ? 'showcaseSectionSubtitle' THEN
      v_val := jsonb_set(
        v_val,
        '{showcaseSectionSubtitle}',
        '"Explore our verified architectural stone collection and bespoke finishes, or view live Instagram installation feeds from our luxury villa, hotel & mandir projects."'
      );
    END IF;

    -- Update announcementText if it mentions rates
    IF v_val ? 'announcementText' THEN
      v_val := jsonb_set(
        v_val,
        '{announcementText}',
        '"✨ 2026 Architectural Natural Stone & Cladding Collections Now Published!"'
      );
    END IF;

    UPDATE public.app_settings
    SET value = v_val, updated_at = now()
    WHERE key = v_rec.key;
  END LOOP;
END $$;

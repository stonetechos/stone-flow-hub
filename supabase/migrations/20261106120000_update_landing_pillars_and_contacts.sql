-- Migration: Update landing page pillars and contact phone numbers
-- Updates app_settings for site.website_landing_content and website.landing_content

DO $$
DECLARE
  v_payload jsonb;
BEGIN
  v_payload := jsonb_build_object(
    'brandTitle', 'STONE TECH',
    'brandSubtitle', 'Architectural Stone Atelier',
    'brandTagline', 'India''s Premier Natural Stone Fabrication Hub',
    'whyUsSectionTitle', 'Why Architectural Leaders Choose Stone Tech',
    'pillar1Title', 'AI-to-ArtCAM Custom Fabrication',
    'pillar1Desc', 'We translate AI-generated designs and concepts into proprietary 3D ArtCAM files, crafting bespoke architectural stone reliefs tailored to your custom specifications—fabricated for the very first time.',
    'pillar2Title', 'Stone Geology & Surface Performance Mastery',
    'pillar2Desc', 'In-depth expertise in stone character, weathering resistance, surface friction (anti-slip), and specialized treatments to preserve structural beauty even when demanding conditions require nuanced stone selection.',
    'pillar3Title', 'In-House Ahmedabad Workshops & Transparency',
    'pillar3Desc', 'Our dedicated CNC cutting and stone inlay workshops in Ahmedabad offer real-time progress tracking and an open-door policy for customer visits, providing complete transparency into our workmanship.',
    'pillar4Title', 'Curated Artist & Multi-Discipline Collaborations',
    'pillar4Desc', 'Active collaborations with fine artists across varied disciplines give us access to specialized tooling and cross-medium mastery to realize one-of-a-kind stone artpieces matching your distinct architectural theme.',
    'contactPhone1', '+91 77420 90866',
    'contactPhone2', '+91 97844 52998',
    'contactEmail', 'info@stonetech.in',
    'contactHours', 'Mon – Sat: 10:00 AM – 7:30 PM IST',
    'contactAddressJaipur', 'E-02, Ground Floor, in front of The Festival Residency, SG Business Hub, Vasant Nagar, Gota, Ahmedabad, Gujarat, Pin Code: 380060',
    'contactAddressMakrana', '',
    'heroTitlePart1', 'Architectural Stone, Crafted for ',
    'heroTitleHighlight', 'Extraordinary Spaces.',
    'heroDescription', 'From handcrafted stone veneers to CNC-carved murals, custom flooring and luxury facades—we transform natural stone into timeless architectural statements.',
    'heroCustomersServed', '1500+',
    'heroWarranty', '3 Years',
    'heroPricingBadge', 'Direct',
    'heroGoogleRating', '4.6/ 5.0',
    'heroBenefit1', 'Design Understanding',
    'heroBenefit2', 'Own CNC & Inlay Workshops ',
    'heroBenefit3', 'Pan India Delivery',
    'heroBenefit4', 'Design-to-Installation Support',
    'productsTabTitle', 'Natural Stone Products & Catalogue',
    'installationsTabTitle', 'Live Installations & Executed Works (Instagram)',
    'showcaseSectionTitle', 'Architectural Products & Live Executed Works',
    'showcaseSectionSubtitle', 'Explore our verified stone catalogue with transparent factory rates attached, or view live Instagram installation feeds from our luxury villa, hotel & mandir projects.',
    'announcementEnabled', true,
    'announcementText', '✨ 2026 Architectural Natural Stone Catalog & Live Mine Rates Now Published!',
    'announcementLinkText', 'View Catalog',
    'announcementLinkUrl', '#wall-cladding-catalogue'
  );

  INSERT INTO public.app_settings (key, value, description, updated_at)
  VALUES ('site.website_landing_content', v_payload, 'Site setting for website_landing_content', now())
  ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value, updated_at = now();

  INSERT INTO public.app_settings (key, value, description, updated_at)
  VALUES ('website.landing_content', v_payload, 'Public Website Landing Page Matter & CMS Content', now())
  ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value, updated_at = now();
END $$;

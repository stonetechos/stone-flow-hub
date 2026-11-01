/**
 * landing-content-store.ts
 *
 * Real-time reactive CMS store for Stone Tech OS public website landing page.
 * Allows Super Admins to edit all website text, headlines, metrics, benefits,
 * pillars, contact info, and announcement banners from the internal STOS sidebar backend.
 * Persists to Supabase `app_settings` and synchronizes across all sessions.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface WebsiteLandingContent {
  // Brand & Nav
  brandTitle: string;
  brandSubtitle: string;
  brandTagline: string;

  // Hero Section Matter
  heroTitlePart1: string;
  heroTitleHighlight: string;
  heroDescription: string;
  heroCustomersServed: string;
  heroWarranty: string;
  heroPricingBadge: string;
  heroGoogleRating: string;
  heroBenefit1: string;
  heroBenefit2: string;
  heroBenefit3: string;
  heroBenefit4: string;

  // Showcase Section & Tabs Matter
  showcaseSectionTitle: string;
  showcaseSectionSubtitle: string;
  productsTabTitle: string;
  installationsTabTitle: string;

  // Why Us (4 Pillars)
  whyUsSectionTitle: string;
  pillar1Title: string;
  pillar1Desc: string;
  pillar2Title: string;
  pillar2Desc: string;
  pillar3Title: string;
  pillar3Desc: string;
  pillar4Title: string;
  pillar4Desc: string;

  // Contact Center & Atelier Details
  contactPhone1: string;
  contactPhone2: string;
  contactEmail: string;
  contactAddressJaipur: string;
  contactAddressMakrana: string;
  contactHours: string;

  // Announcement Banner
  announcementEnabled: boolean;
  announcementText: string;
  announcementLinkText: string;
  announcementLinkUrl: string;
}

export const DEFAULT_LANDING_CONTENT: WebsiteLandingContent = {
  brandTitle: "STONE TECH",
  brandSubtitle: "Architectural Stone Atelier",
  brandTagline: "India's Premier Natural Stone Fabrication Hub",

  heroTitlePart1: "Architectural Stone, Crafted for ",
  heroTitleHighlight: "Extraordinary Spaces.",
  heroDescription:
    "From handcrafted stone veneers to CNC-carved murals, custom flooring and luxury facades—we transform natural stone into timeless architectural statements.",
  heroCustomersServed: "500+",
  heroWarranty: "3 Years",
  heroPricingBadge: "Direct",
  heroGoogleRating: "4.9 / 5.0",
  heroBenefit1: "Direct Quarry Sourcing",
  heroBenefit2: "CNC & Waterjet Precision",
  heroBenefit3: "Pan India Installation",
  heroBenefit4: "Design-to-Installation Support",

  showcaseSectionTitle: "Architectural Products & Live Executed Works",
  showcaseSectionSubtitle:
    "Explore our verified stone catalogue with transparent factory rates attached, or view live Instagram installation feeds from our luxury villa, hotel & mandir projects.",
  productsTabTitle: "Natural Stone Products & Catalogue",
  installationsTabTitle: "Live Installations & Executed Works (Instagram)",

  whyUsSectionTitle: "Why Architectural Leaders Choose Stone Tech",
  pillar1Title: "Direct Quarry Sourcing",
  pillar1Desc:
    "We own and partner with premier quarries in Makrana, Rajasthan, cutting out middlemen for unmatched purity and price.",
  pillar2Title: "Precision Engineering",
  pillar2Desc:
    "Italian 5-axis CNC bridges and abrasive waterjets calibrate slabs to ±0.5mm tolerance with seamless book-matching.",
  pillar3Title: "Full Lineage Traceability",
  pillar3Desc:
    "Every block, slab, and lot is tagged with verifiable GPS extraction origins, physical test reports, and density data.",
  pillar4Title: "Master Artisan Detailing",
  pillar4Desc:
    "Generational master stonemasons hand-finish flutes, bevels, inlays, and sacred temple reliefs with artisanal pride.",

  contactPhone1: "+91 94141 61129",
  contactPhone2: "+91 77420 90866",
  contactEmail: "info@stonetech.in",
  contactAddressJaipur: "RIICO Industrial Area, Mansarovar & Sitapura, Jaipur, Rajasthan",
  contactAddressMakrana: "Gunawati Road, Makrana, Didwana-Kuchaman District, Rajasthan 341505",
  contactHours: "Mon – Sat: 9:00 AM – 7:30 PM IST",

  announcementEnabled: true,
  announcementText: "✨ 2026 Architectural Natural Stone Catalog & Live Mine Rates Now Published!",
  announcementLinkText: "View Catalog",
  announcementLinkUrl: "#wall-cladding-catalogue",
};

const STORAGE_KEY = "stos_website_landing_content";
const EVENT_KEY = "stos_website_content_sync";

function loadSavedContent(): WebsiteLandingContent {
  if (typeof window === "undefined") return DEFAULT_LANDING_CONTENT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_LANDING_CONTENT, ...parsed };
    }
  } catch (e) {
    console.warn("[CMS Store] load error:", e);
  }
  return DEFAULT_LANDING_CONTENT;
}

export function useWebsiteContent() {
  const [content, setContent] = useState<WebsiteLandingContent>(loadSavedContent);
  const [isSaving, setIsSaving] = useState(false);

  // Sync from Supabase on mount
  useEffect(() => {
    let mounted = true;
    async function fetchRemote() {
      try {
        const { data } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", "website.landing_content")
          .maybeSingle();

        if (data?.value && typeof data.value === "object" && mounted) {
          const merged = { ...DEFAULT_LANDING_CONTENT, ...data.value };
          setContent(merged);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          } catch {
            /* ignore */
          }
        }
      } catch (e) {
        console.warn("[CMS Store] Remote sync fallback to local:", e);
      }
    }
    fetchRemote();

    const handleSync = () => {
      setContent(loadSavedContent());
    };
    window.addEventListener(EVENT_KEY, handleSync);
    window.addEventListener("storage", handleSync);

    return () => {
      mounted = false;
      window.removeEventListener(EVENT_KEY, handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const updateContent = useCallback(
    async (updates: Partial<WebsiteLandingContent>) => {
      setIsSaving(true);
      try {
        const next = { ...content, ...updates };
        setContent(next);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        window.dispatchEvent(new CustomEvent(EVENT_KEY));

        // Save to Supabase app_settings
        await supabase.from("app_settings").upsert(
          {
            key: "website.landing_content",
            value: next as unknown as never,
            description: "Public Website Landing Page Matter & CMS Content",
          },
          { onConflict: "key" },
        );
      } catch (e) {
        console.warn("[CMS Store] save warning:", e);
      } finally {
        setIsSaving(false);
      }
    },
    [content],
  );

  const resetToDefaults = useCallback(async () => {
    setIsSaving(true);
    try {
      setContent(DEFAULT_LANDING_CONTENT);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_LANDING_CONTENT));
      window.dispatchEvent(new CustomEvent(EVENT_KEY));
      await supabase.from("app_settings").upsert(
        {
          key: "website.landing_content",
          value: DEFAULT_LANDING_CONTENT as unknown as never,
          description: "Public Website Landing Page Matter & CMS Content",
        },
        { onConflict: "key" },
      );
    } catch (e) {
      console.warn("[CMS Store] reset warning:", e);
    } finally {
      setIsSaving(false);
    }
  }, []);

  return {
    content,
    isSaving,
    updateContent,
    resetToDefaults,
  };
}

/**
 * Landing Page Matter & CMS Content Store
 *
 * Centralizes all editable copy, marketing headlines, metrics,
 * and contact details displayed on the public landing page (stonetech.in).
 * Persists to Supabase `public.app_settings` via TanStack Start server functions,
 * ensuring unauthenticated landing page visitors and staff see synchronized content.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSiteSettings, SITE_SETTINGS_QUERY_KEY } from "@/lib/site-settings/use-site-settings";
import { upsertSiteSetting } from "@/lib/site-settings/api";

export interface WebsiteLandingContent {
  // Brand & Nav
  brandName: string;
  brandTagline: string;

  // Hero Section
  heroTitlePart1: string;
  heroTitleHighlight: string;
  heroDescription: string;
  heroCustomersServed: string;
  heroWarranty: string;
  heroPricingBadge: string;
  heroGoogleRating: string;

  // Hero Value Pills
  heroBenefit1: string;
  heroBenefit2: string;
  heroBenefit3: string;
  heroBenefit4: string;

  // Showcase Section
  showcaseSectionTitle: string;
  showcaseSectionSubtitle: string;
  productsTabTitle: string;
  installationsTabTitle: string;

  // Why Choose Us (4 Pillars)
  whyUsSectionTitle: string;
  pillar1Title: string;
  pillar1Desc: string;
  pillar2Title: string;
  pillar2Desc: string;
  pillar3Title: string;
  pillar3Desc: string;
  pillar4Title: string;
  pillar4Desc: string;

  // Contact Center & Factory Details
  contactPhone1: string;
  contactPhone2: string;
  contactEmail: string;
  contactAddressJaipur: string;
  contactAddressMakrana: string;
  contactHours: string;

  // Optional Announcement Bar
  announcementEnabled: boolean;
  announcementText: string;
  announcementLinkText: string;
  announcementLinkUrl: string;
}

export const DEFAULT_LANDING_CONTENT: WebsiteLandingContent = {
  brandName: "Stone Tech",
  brandTagline: "Architectural Stone Atelier · Jaipur & Makrana",

  heroTitlePart1: "Direct-from-Quarry",
  heroTitleHighlight: "Natural Stone Panels & Slabs",
  heroDescription:
    "We cut, polish, dry-lay, and crate natural stone wall cladding, Italian & Makrana marble, fluted panels, and elevation murals directly from our Rajasthan quarries & fabrication atelier.",
  heroCustomersServed: "1500+",
  heroWarranty: "10-Year Warranty",
  heroPricingBadge: "Direct Workshop Pricing",
  heroGoogleRating: "4.9",

  heroBenefit1: "Direct Quarry Source",
  heroBenefit2: "CNC & Hand-carved",
  heroBenefit3: "Pan-India Crated Dispatch",
  heroBenefit4: "Architect WhatsApp Support",

  showcaseSectionTitle: "Architectural Products & Live Executed Works",
  showcaseSectionSubtitle:
    "Explore our precision-crafted stone cladding, mosaics, slabs, and real-world installations for luxury homes, hotels & temples.",
  productsTabTitle: "Natural Stone Products & Catalogue",
  installationsTabTitle: "Live Installations & Executed Works (Instagram)",

  whyUsSectionTitle: "Why Luxury Architects Choose Stone Tech Atelier",
  pillar1Title: "Direct Quarry Sourcing",
  pillar1Desc:
    "Zero middlemen markups. We source blocks directly from our Makrana, Jodhpur, and Udaipur quarries for unmatched stone density and natural vein integrity.",
  pillar2Title: "5-Axis CNC & Artisan Carving",
  pillar2Desc:
    "Sub-millimeter calibrated finishes combined with generation-old Rajasthani stone chiselling artistry for intricate relief patterns.",
  pillar3Title: "Dry-Lay & Numbered Panels",
  pillar3Desc:
    "Every mosaic, veneer, and cladding order is pre-assembled on factory floors and high-resolution photo-approved on WhatsApp before crating.",
  pillar4Title: "Zero-Breakage Export Crating",
  pillar4Desc:
    "Foam-lined fumigated wooden crates with reinforced corners delivered securely across all Indian states and overseas destinations.",

  contactPhone1: "+91 97844 52998",
  contactPhone2: "+91 77420 90866",
  contactEmail: "info@stonetech.in",
  contactAddressJaipur: "RIICO Industrial Area, Mansarovar & Sitapura, Jaipur, Rajasthan",
  contactAddressMakrana: "Gunawati Road, Makrana, Didwana-Kuchaman District, Rajasthan 341505",
  contactHours: "Mon – Sat: 9:00 AM – 7:30 PM IST",

  announcementEnabled: false,
  announcementText: "",
  announcementLinkText: "",
  announcementLinkUrl: "",
};

const STORAGE_KEY = "stos_website_landing_content";
const EVENT_KEY = "stos_website_content_sync";

function loadSavedContent(): Partial<WebsiteLandingContent> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn("[CMS Store] load error:", e);
  }
  return {};
}

export function useWebsiteContent() {
  const { data: settings } = useSiteSettings();
  const queryClient = useQueryClient();
  const [localOverride, setLocalOverride] = useState<WebsiteLandingContent | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [, setTick] = useState(0);

  // Compute merged content:
  // Base: DEFAULT_LANDING_CONTENT
  // Layer 1: localStorage cache
  // Layer 2: remote server settings from Supabase (source of truth)
  // Layer 3: localOverride while actively editing/saving
  const content: WebsiteLandingContent = useMemo(() => {
    if (localOverride) return localOverride;

    const local = loadSavedContent();
    const remote = settings?.website_landing_content;

    let merged: WebsiteLandingContent = { ...DEFAULT_LANDING_CONTENT };
    if (local && typeof local === "object") {
      merged = { ...merged, ...local };
    }
    if (remote && typeof remote === "object" && Object.keys(remote).length > 0) {
      merged = {
        ...merged,
        ...(remote as unknown as Partial<WebsiteLandingContent>),
      };
      // Keep local storage fresh with the authoritative remote copy
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } catch {
        /* ignore */
      }
    }
    return merged;
  }, [localOverride, settings?.website_landing_content]);

  // Sync across tabs / events
  useEffect(() => {
    const handleSync = () => {
      setTick((t) => t + 1);
    };
    window.addEventListener(EVENT_KEY, handleSync);
    window.addEventListener("storage", handleSync);

    return () => {
      window.removeEventListener(EVENT_KEY, handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const updateContent = useCallback(
    async (updates: Partial<WebsiteLandingContent>) => {
      setIsSaving(true);
      try {
        const next = { ...content, ...updates };
        setLocalOverride(next);

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        window.dispatchEvent(new CustomEvent(EVENT_KEY));

        // Save to Supabase app_settings via server function (supabaseAdmin bypasses client RLS)
        await upsertSiteSetting("website_landing_content", next);

        // Invalidate site settings cache so all consumers get the updated data immediately
        await queryClient.invalidateQueries({ queryKey: SITE_SETTINGS_QUERY_KEY });
      } catch (e) {
        console.warn("[CMS Store] save warning:", e);
      } finally {
        setLocalOverride(null);
        setIsSaving(false);
      }
    },
    [content, queryClient],
  );

  const resetToDefaults = useCallback(async () => {
    setIsSaving(true);
    try {
      setLocalOverride(DEFAULT_LANDING_CONTENT);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_LANDING_CONTENT));
      } catch {
        /* ignore */
      }
      window.dispatchEvent(new CustomEvent(EVENT_KEY));

      await upsertSiteSetting("website_landing_content", DEFAULT_LANDING_CONTENT);
      await queryClient.invalidateQueries({ queryKey: SITE_SETTINGS_QUERY_KEY });
    } catch (e) {
      console.warn("[CMS Store] reset warning:", e);
    } finally {
      setLocalOverride(null);
      setIsSaving(false);
    }
  }, [queryClient]);

  return {
    content,
    isSaving,
    updateContent,
    resetToDefaults,
  };
}

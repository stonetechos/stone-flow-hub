/**
 * Primary Landing & Customer Inquiry Portal for www.stonetech.in.
 *
 * Modeled after Livspace's architectural design studio layout, tailored
 * for Stone Tech's bespoke natural stone atelier (Stone Veneer, 3D Wall Cladding,
 * Interlocking Ledgestone, Waterjet Inlays, CNC Mandir Murals & Italian Marble).
 *
 * Features:
 * - Livspace split-screen hero (authority, trust stats & floating estimation card)
 * - Direct selection from Master Stone Products
 * - Space & architectural concept description with quick suggestion chips
 * - Browser-side canvas image compression for up to 10 photos/drawings
 * - WhatsApp-first sign up with international country code dropdown
 * - Live interactive calendar date picker starting strictly from current date
 * - Curated Stone Collections grid with 1-tap "Select & Estimate" triggers
 * - 4 core value pillars (Quarry Direct, CNC Cutting, WhatsApp proofs, Export crating)
 * - Broad "How to reach Us?" section with Google 4.6 rating & direct Maps directions
 * - Returning customer inquiry tracking modal
 * - Separate Staff / Employee ERP portal login in footer
 * - Sticky mobile bottom action bar
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useMemo, useEffect, type FormEvent, type ChangeEvent } from "react";
import { toIndicDigits } from "@/lib/format";
import {
  Sparkles,
  Upload,
  X,
  Check,
  Calendar as CalendarIcon,
  Phone,
  User,
  MapPin,
  Building,
  ArrowRight,
  ArrowLeft,
  ArrowDown,
  ShieldCheck,
  Star,
  ExternalLink,
  Send,
  Loader2,
  CheckCircle2,
  Lock,
  Gem,
  Compass,
  Eye,
  Palette,
  Truck,
  Search,
  Briefcase,
  Tag,
  Camera,
  Wrench,
  FileUp,
  Layers,
  CircleDot,
  Menu,
  Calculator,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CountryCodeSelect } from "@/components/forms/inputs/CountryCodeSelect";
import { CustomerInquiryLookupDialog } from "@/components/enquiry/CustomerInquiryLookupDialog";
import { LuxuryProductShowcase } from "@/components/landing/LuxuryProductShowcase";
import { WallCladdingCatalog } from "@/components/catalog/WallCladdingCatalog";
import { StoneVeneerCatalog } from "@/components/catalog/StoneVeneerCatalog";
import { GlassBricksCatalog } from "@/components/catalog/GlassBricksCatalog";
import { FlexibleClayCatalog } from "@/components/catalog/FlexibleClayCatalog";
import { StonePebblesCatalog } from "@/components/catalog/StonePebblesCatalog";
import { MasterProductCatalog, type ProductTab } from "@/components/catalog/MasterProductCatalog";
import { DownloadCataloguesDropdown } from "@/components/catalog/DownloadCataloguesDropdown";
import { InstalledWorksGallery } from "@/components/catalog/InstalledWorksGallery";
import { ContactCenter } from "@/components/landing/ContactCenter";
import { JobOpeningsDialog } from "@/components/landing/JobOpeningsDialog";
import { ShreeYantraHeroShowcase } from "@/components/landing/ShreeYantraHeroShowcase";
import {
  RequestEstimateDialog,
  matchMasterProduct,
} from "@/components/landing/RequestEstimateDialog";
import { supabase } from "@/integrations/supabase/client";
import {
  submitPublicEnquiryServerFn,
  type PublicInquiryResult,
} from "@/lib/enquiries/public-inquiry.functions";
import {
  useSiteSettingsValue,
  SITE_SETTINGS_QUERY_KEY,
} from "@/lib/site-settings/use-site-settings";
import { fetchSiteSettings } from "@/lib/site-settings/api";
import { useWebsiteContent } from "@/lib/cms/landing-content-store";
import { StonemanCustomerDialog } from "@/components/mascot/StonemanCustomerDialog";
import { LanguageToggle } from "@/components/global/LanguageToggle";
import { removeThemes } from "@/components/global/ThemeSwitcher";
import { useTranslation } from "react-i18next";
import { wallSqft, type LengthUnit } from "@/lib/quotes/estimateCatalog";
import {
  getLandingTexts,
  getLocalizedProducts,
  getLocalizedSpaceTypes,
  getLocalizedCustomerRoles,
  getLocalizedQuickIdeas,
  getProductNameInLang,
} from "@/lib/i18n/landing-i18n";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    try {
      await context.queryClient.ensureQueryData({
        queryKey: SITE_SETTINGS_QUERY_KEY,
        queryFn: fetchSiteSettings,
        staleTime: 30 * 1000,
      });
    } catch {
      /* ignore */
    }
  },
  head: () => ({
    meta: [
      { title: "Stone Tech - Architectural Stone Atelier & Catalogues" },
      {
        name: "description",
        content:
          "India's premier architectural natural stone atelier. Custom Stone Veneer, 3D Wall Cladding, Interlocking Panels, Glass Bricks & Italian Marble. Download verified PDF catalogues in English, Hindi & Gujarati.",
      },
      { property: "og:title", content: "Stone Tech - Architectural Stone Atelier & Catalogues" },
      {
        property: "og:description",
        content:
          "Explore & download verified architectural natural stone catalogues (Wall Cladding, Ultra-Thin Stone Veneer, Glass Bricks, Flexible Clay Veneers & Stone Pebbles) in English, Hindi & Gujarati.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:image",
        content: "https://stonetech.in/branding/stone-tech-og-banner.png?v=4",
      },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Stone Tech - Architectural Stone Atelier & Catalogues" },
      {
        name: "twitter:description",
        content:
          "Explore & download verified architectural natural stone catalogues in English, Hindi & Gujarati. Explore 275+ Wall Claddings & 98+ Stone Veneers.",
      },
      {
        name: "twitter:image",
        content: "https://stonetech.in/branding/stone-tech-og-banner.png?v=4",
      },
    ],
  }),
  component: HomePage,
});

export const CUSTOMER_ROLES = [
  { label: "Owner / Homeowner", value: "Owner / Homeowner", type: "individual" },
  { label: "Architect", value: "Architect", type: "architect" },
  { label: "Interior Designer", value: "Interior Designer", type: "interior_designer" },
  { label: "Contractor / Builder", value: "Contractor / Builder", type: "contractor" },
  { label: "Other", value: "Other", type: "other" },
];

interface ProductOption {
  id: string;
  name: string;
  tagline: string;
  popular?: boolean;
}

const MASTER_PRODUCT_OPTIONS: ProductOption[] = [
  // Slabs & Stone Types
  {
    id: "italian_marble_slabs",
    name: "Italian Marble Slabs",
    tagline: "Imported luxury bookmatched Italian marble slabs for high-end villas & lobbies",
    popular: true,
  },
  {
    id: "indian_marble_slabs",
    name: "Indian Marble Slabs",
    tagline: "Ambaji white, Banswara, and premium Indian marble slabs",
    popular: true,
  },
  {
    id: "granite_slabs",
    name: "Granite Slabs",
    tagline: "Exotic and architectural high-durability natural granite slabs",
    popular: true,
  },
  {
    id: "limestone_slabs",
    name: "Limestone Slabs",
    tagline: "Natural cleft and calibrated Kota & limestone slabs for exterior elevations",
  },
  {
    id: "cobblestone",
    name: "Cobblestone",
    tagline: "Heavy-duty cleft natural stone cobblestones for driveways & pathways",
  },
  {
    id: "pebblestone",
    name: "Pebblestone",
    tagline: "Polished river pebbles and tumbled landscaping stones",
  },
  {
    id: "boulders",
    name: "Boulders",
    tagline: "Large natural rock monoliths and landscape garden boulders",
  },
  {
    id: "sculptures",
    name: "Sculptures",
    tagline: "Hand-carved architectural stone statues and bespoke artistic sculptures",
  },
  {
    id: "artwork",
    name: "Artwork",
    tagline: "Bespoke architectural stone artwork, relief carvings & fine decorative stone art",
  },
  {
    id: "custom_stone_basins",
    name: "Custom Stone Basins",
    tagline: "Monolithic hand-carved stone washbasins and natural vanity bowls",
  },
  {
    id: "agate_stone_articles",
    name: "Agate Stone Articles",
    tagline: "Exclusive semi-precious agate artifacts and luxury home decor",
  },
  {
    id: "waterfall",
    name: "Waterfall",
    tagline: "Cascading architectural natural stone waterfalls and water features",
  },
  {
    id: "fountain",
    name: "Fountain",
    tagline: "Classical and contemporary hand-carved stone fountains",
  },
  {
    id: "temple_work_handcrafting",
    name: "Temple Work Handcrafting",
    tagline: "Sacred mandir stone architecture, intricately carved pillars & jaalis",
  },
  // Cladding, Flooring & Special Articles
  {
    id: "natural_stone_cladding_tiles",
    name: "Natural Stone Cladding Tiles",
    tagline: "Precision-cut natural stone tiles for wall cladding & elevations",
  },
  {
    id: "natural_stone_interlocking_panels",
    name: "Natural Stone Interlocking Panels",
    tagline: "Seamless 3D textured ledgestone & interlocking elevation panels",
    popular: true,
  },
  {
    id: "natural_stone_mosaics",
    name: "Natural Stone Mosaics",
    tagline: "Artistic geometric mosaic patterns and handcrafted mesh tiles",
  },
  {
    id: "stone_murals",
    name: "Stone Murals",
    tagline: "CNC 3D carved temple mandirs, artistic jaalis & stone wall sculptures",
  },
  {
    id: "inlay_work",
    name: "Inlay Work",
    tagline: "Waterjet geometric medallions, floral Pietra Dura floor inlays & brass borders",
  },
  {
    id: "table_top",
    name: "Table Top",
    tagline: "Luxury dining tables, kitchen waterfall islands & stone vanity counters",
  },
  {
    id: "custom_stone_cladding",
    name: "Custom Stone Cladding",
    tagline: "Exterior elevation facades & interior 3D textured accent feature walls",
    popular: true,
  },
  {
    id: "crazy_pattern_in_stone",
    name: "Crazy Pattern in Stone",
    tagline: "Artisanal random irregular flagstone paving and crazy flooring",
  },
  {
    id: "general_flooring",
    name: "General Flooring",
    tagline: "Precision calibrated natural stone flooring slabs and tiles",
  },
  {
    id: "custom_flooring",
    name: "Custom Flooring",
    tagline: "Imported Italian marble, premium granites & dry-lay vein matching",
  },
  {
    id: "stepping_stone",
    name: "Stepping Stone",
    tagline: "Natural garden cobbles, flagstones, pavers & pathway stepping stones",
  },
  {
    id: "stone_veneer",
    name: "Stone Veneer",
    tagline:
      "Ultra-thin, flexible natural slate & quartzite sheets for walls, ceilings & furniture",
    popular: true,
  },
  {
    id: "clay_veneers",
    name: "Clay Veneers",
    tagline: "Eco-friendly ultra-thin flexible clay wall coverings and terracotta finishes",
  },
  {
    id: "glass_bricks",
    name: "Glass Bricks",
    tagline:
      "Architectural hollow and solid crystal glass blocks for acoustic partitions & luminous facades",
    popular: true,
  },
  {
    id: "pu_panels",
    name: "PU Panels",
    tagline: "Ultra-lightweight, quick-mount high-definition faux stone replica panels",
  },
  {
    id: "stone_veneer_artwork",
    name: "Stone Veneer Artwork",
    tagline: "Curated backlit artistic translucent stone veneer compositions",
  },
  {
    id: "agate_slabs",
    name: "Agate Slabs",
    tagline: "Backlit translucent luxury quartz slabs for bar counters & entry foyers",
  },
];

const SPACE_TYPES = [
  "Bungalow / Villa",
  "Apartment / Flat",
  "Commercial Office",
  "Hotel / Resort",
  "Temple / Mandir",
  "Farmhouse",
  "Restaurant / Cafe",
  "Showroom / Retail",
  "Other",
];

const QUICK_IDEA_SUGGESTIONS = [
  "Living Room TV Accent Wall",
  "Exterior Elevation Facade",
  "Foyer Inlay Flooring",
  "Temple / Mandir Carving",
  "Bathroom Wall Cladding",
  "Dining Table Top",
  "Balcony Feature Wall",
];

// Helper to compress image in browser using HTML5 Canvas
async function compressImage(file: File, maxDimension = 1600, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => reject(new Error("Failed to decode image"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function HomePage() {
  const siteSettings = useSiteSettingsValue();
  const { content: cmsContent } = useWebsiteContent();
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.substring(0, 2) || "en";
  const texts = getLandingTexts(currentLang);
  const isEn = currentLang === "en";

  useEffect(() => {
    // The public website must always retain its authentic natural stone atelier design and never inherit internal STOS themes
    removeThemes();
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      if (currentLang === "hi") {
        document.title = "स्टोन टेक - वास्तुशिल्पीय प्राकृतिक पाषाण एटेलियर एवं वॉल क्लैडिंग";
      } else if (currentLang === "gu") {
        document.title = "સ્ટોન ટેક - વાસ્તુશિલ્પીય પ્રાકૃતિક પાષાણ એટેલિયર અને વોલ ક્લેડિંગ";
      } else {
        document.title = "Stone Tech - Architectural Natural Stone Atelier & Wall Cladding";
      }
    }
  }, [currentLang]);

  // Dialog, selection & showcase states
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isEstimateOpen, setIsEstimateOpen] = useState(false);
  const [showcaseTab, setShowcaseTab] = useState<ProductTab>("cladding");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [prepaymentDiscountSelected, setPrepaymentDiscountSelected] = useState(false);
  const [planDescription, setPlanDescription] = useState<string>("");
  const [stonemanOpen, setStonemanOpen] = useState(false);

  // Deep-link / WhatsApp share listener for estimate modal
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleHash = () => {
      const h = window.location.hash.toLowerCase();
      const s = window.location.search.toLowerCase();
      if (
        h === "#lead-form" ||
        h === "#request-estimate" ||
        h === "#estimate" ||
        s.includes("estimate")
      ) {
        setIsEstimateOpen(true);
      }
    };
    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  const scrollToForm = (productNameToSelect?: string, withDiscount = false) => {
    if (withDiscount) {
      setPrepaymentDiscountSelected(true);
      toast.success(texts.prepaymentOffer.appliedToast);
    }

    if (productNameToSelect) {
      const matched = matchMasterProduct(productNameToSelect);
      setSelectedProducts([matched]);
      if (matched !== productNameToSelect && productNameToSelect.trim()) {
        setPlanDescription((prev) => {
          const ref = `Reference Project: ${productNameToSelect.trim()}`;
          return prev.includes(productNameToSelect) ? prev : prev ? `${prev}\n${ref}` : ref;
        });
      }
      toast.success(`Selected "${matched}" for your estimate!`);
    }

    setIsEstimateOpen(true);
  };

  // Primary contact phone cleaned for WhatsApp links
  const primaryPhoneClean = useMemo(() => {
    const raw = cmsContent.contactPhone1 || "917742090866";
    const cleaned = raw.replace(/[^0-9]/g, "");
    return cleaned.startsWith("91") || cleaned.length > 10 ? cleaned : `91${cleaned}`;
  }, [cmsContent.contactPhone1]);

  // -------------------------------------------------------------
  // MAIN LIVSPACE-STYLE ARCHITECTURAL LANDING VIEW
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen paper-texture dark:bg-slate-950 text-foreground antialiased pb-20 sm:pb-12 w-full max-w-full overflow-x-hidden">
      {/* 1. STOS ENTERPRISE NAVBAR (TURQUOISE & PAPER WHITE) */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur-md shadow-2xs pt-[max(env(safe-area-inset-top),0px)]">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand Logo & Name — HD Logo & Never Truncated */}
          <Link to="/" className="flex items-center gap-2.5 sm:gap-3 shrink-0 group">
            <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-white/95 p-1 shadow-sm shadow-cyan-950/15 border border-cyan-200/70 ring-1 ring-cyan-500/20 transition-transform group-hover:scale-105">
              <img
                src="/branding/stone-tech-logo.png"
                alt="Stone Tech"
                className="h-full w-full object-contain"
                width={44}
                height={44}
              />
            </div>
            <div className="flex flex-col shrink-0">
              <span className="text-base sm:text-xl font-black tracking-tight uppercase text-foreground leading-tight whitespace-nowrap">
                {texts.brandName || "STONE TECH"}
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider sm:tracking-widest leading-none mt-0.5 whitespace-nowrap">
                {texts.brandSubtitle}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 xl:gap-8 text-sm font-semibold text-foreground/80">
            <a
              href="#wall-cladding-catalogue"
              onClick={() => setShowcaseTab("cladding")}
              className="hover:text-primary transition-colors whitespace-nowrap py-1"
            >
              {texts.nav.ourProducts || "Our Products"}
            </a>
            <a
              href="#wall-cladding-catalogue"
              onClick={() => setShowcaseTab("installations")}
              className="hover:text-primary transition-colors whitespace-nowrap py-1"
            >
              {texts.nav.ourWork || "Our Works"}
            </a>
            <button
              type="button"
              onClick={() => setIsEstimateOpen(true)}
              className="hover:text-primary transition-colors whitespace-nowrap py-1 flex items-center gap-1.5 cursor-pointer text-foreground/80 hover:text-primary font-semibold text-sm"
            >
              <Calculator className="h-4 w-4 text-[#006788] dark:text-[#38bdf8]" />
              <span>{texts.nav.requestEstimate || "Request for Estimate"}</span>
            </button>
            <a
              href="#why-us"
              className="hover:text-primary transition-colors whitespace-nowrap py-1"
            >
              {texts.nav.whyUs}
            </a>
            <JobOpeningsDialog
              trigger={
                <button
                  type="button"
                  className="group hover:text-primary transition-colors whitespace-nowrap py-1 flex items-center gap-1.5 cursor-pointer text-foreground/85 hover:text-foreground font-semibold"
                >
                  <Briefcase className="h-4 w-4 text-primary transition-transform group-hover:scale-110" />
                  <span>{texts.nav.jobOpenings}</span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-linear-to-r from-rose-600 via-orange-500 to-amber-500 text-white font-extrabold shadow-sm ring-1 ring-white/30 animate-attention-badge select-none ml-0.5">
                    <span className="relative flex h-1.5 w-1.5 mr-1">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-90" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                    </span>
                    <span className="text-[9.5px] font-black uppercase tracking-wider text-white leading-none">
                      {texts.nav.newBadge}
                    </span>
                  </span>
                </button>
              }
            />
            <a
              href="#contact-us"
              className="hover:text-primary transition-colors whitespace-nowrap py-1"
            >
              {texts.nav.contact}
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Mobile Navigation Menu Drawer */}
            <div className="md:hidden">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg border-border/80 bg-background/90 text-foreground shadow-2xs hover:border-[#006788] hover:text-[#006788] shrink-0 cursor-pointer"
                    aria-label="Open Navigation Menu"
                  >
                    <Menu className="h-4.5 w-4.5 text-[#006788] dark:text-[#38bdf8]" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="w-[300px] sm:w-[340px] p-0 flex flex-col bg-background/98 backdrop-blur-md border-l border-border"
                >
                  <SheetHeader className="p-4 border-b border-border text-left flex flex-row items-center justify-between space-y-0">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 p-1 border border-[#c9d1d4] shadow-2xs">
                        <img
                          src="/branding/stone-tech-logo.png"
                          alt="Stone Tech"
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <div className="flex flex-col">
                        <SheetTitle className="text-sm font-bold tracking-tight text-foreground uppercase">
                          {texts.brandName || "STONE TECH"}
                        </SheetTitle>
                        <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
                          {texts.brandSubtitle}
                        </span>
                      </div>
                    </div>
                  </SheetHeader>

                  <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1">
                      Explore Atelier
                    </div>

                    {/* Our Products */}
                    <a
                      href="#wall-cladding-catalogue"
                      onClick={() => {
                        setShowcaseTab("cladding");
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-foreground hover:bg-[#e0f1f5] hover:text-[#015474] dark:hover:bg-[#015474]/30 dark:hover:text-[#67e8f9] transition-all"
                    >
                      <Layers className="h-4 w-4 text-[#006788] dark:text-[#38bdf8]" />
                      <span>{texts.nav.ourProducts || "Our Products"}</span>
                    </a>

                    {/* Our Works */}
                    <a
                      href="#wall-cladding-catalogue"
                      onClick={() => {
                        setShowcaseTab("installations");
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-foreground hover:bg-[#e0f1f5] hover:text-[#015474] dark:hover:bg-[#015474]/30 dark:hover:text-[#67e8f9] transition-all"
                    >
                      <Gem className="h-4 w-4 text-[#006788] dark:text-[#38bdf8]" />
                      <span>{texts.nav.ourWork || "Our Works"}</span>
                    </a>

                    {/* Request for Estimate */}
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setIsEstimateOpen(true);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-foreground hover:bg-[#e0f1f5] hover:text-[#015474] dark:hover:bg-[#015474]/30 dark:hover:text-[#67e8f9] transition-all cursor-pointer text-left"
                    >
                      <Calculator className="h-4 w-4 text-[#006788] dark:text-[#38bdf8]" />
                      <span>{texts.nav.requestEstimate || "Request for Estimate"}</span>
                    </button>

                    {/* Why Us / About Us */}
                    <a
                      href="#why-us"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-foreground hover:bg-[#e0f1f5] hover:text-[#015474] dark:hover:bg-[#015474]/30 dark:hover:text-[#67e8f9] transition-all"
                    >
                      <ShieldCheck className="h-4 w-4 text-[#006788] dark:text-[#38bdf8]" />
                      <span>{texts.nav.whyUs}</span>
                    </a>

                    {/* Job Openings */}
                    <div onClick={() => setMobileMenuOpen(false)}>
                      <JobOpeningsDialog
                        trigger={
                          <button
                            type="button"
                            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold text-foreground hover:bg-[#e0f1f5] hover:text-[#015474] dark:hover:bg-[#015474]/30 dark:hover:text-[#67e8f9] transition-all cursor-pointer text-left"
                          >
                            <div className="flex items-center gap-3">
                              <Briefcase className="h-4 w-4 text-[#006788] dark:text-[#38bdf8]" />
                              <span>{texts.nav.jobOpenings}</span>
                            </div>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-linear-to-r from-rose-600 via-orange-500 to-amber-500 text-white font-black text-[9px] uppercase tracking-wider animate-attention-badge">
                              {texts.nav.newBadge}
                            </span>
                          </button>
                        }
                      />
                    </div>

                    {/* Track Inquiry */}
                    <div onClick={() => setMobileMenuOpen(false)}>
                      <CustomerInquiryLookupDialog
                        trigger={
                          <button
                            type="button"
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-foreground hover:bg-[#e0f1f5] hover:text-[#015474] dark:hover:bg-[#015474]/30 dark:hover:text-[#67e8f9] transition-all cursor-pointer text-left"
                          >
                            <Search className="h-4 w-4 text-[#006788] dark:text-[#38bdf8]" />
                            <span>{texts.nav.trackInquiry}</span>
                          </button>
                        }
                      />
                    </div>

                    {/* Contact Us */}
                    <a
                      href="#contact-us"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-foreground hover:bg-[#e0f1f5] hover:text-[#015474] dark:hover:bg-[#015474]/30 dark:hover:text-[#67e8f9] transition-all"
                    >
                      <Phone className="h-4 w-4 text-[#006788] dark:text-[#38bdf8]" />
                      <span>{texts.nav.contact}</span>
                    </a>

                    <div className="pt-3 border-t border-border mt-3 space-y-2">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1">
                        Privilege & Staff
                      </div>

                      <Link
                        to="/auth"
                        search={{ flow: "signin" }}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-foreground hover:bg-[#e0f1f5] hover:text-[#015474] dark:hover:bg-[#015474]/30 dark:hover:text-[#67e8f9] transition-all"
                      >
                        <Lock className="h-4 w-4 text-[#006788] dark:text-[#38bdf8]" />
                        <span>{texts.nav.employeesLogin}</span>
                      </Link>

                      <a
                        href={`https://api.whatsapp.com/send?phone=${primaryPhoneClean}&text=Hi%20Stone%20Tech%20Team,%20I%20have%20an%20inquiry%20for%20stone%20requirements`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-bold bg-[#e0f1f5] text-[#015474] hover:bg-[#d0eaf1] dark:bg-[#015474]/30 dark:text-[#67e8f9] border border-[#c9d1d4] dark:border-[#00597b] transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <Phone className="h-4 w-4 text-[#006788] dark:text-[#38bdf8]" />
                          <span>WhatsApp Consultation</span>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 text-[#006788]/70" />
                      </a>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Language Switcher — visible on sm+ (mobile already has it fixed in bottom bar) */}
            <LanguageToggle className="hidden sm:inline-flex h-8 sm:h-9 px-2 sm:px-2.5 text-xs rounded-lg border border-border/80 bg-background/80" />

            {/* Customer Tracking Dialog — visible on sm+ */}
            <div className="hidden sm:block">
              <CustomerInquiryLookupDialog
                trigger={
                  <Button
                    variant="outline"
                    size="default"
                    className="h-8 sm:h-9 px-2 sm:px-3.5 gap-1 sm:gap-1.5 text-xs font-semibold shadow-2xs border-border/90 hover:border-[#006788] hover:text-[#006788] shrink-0 rounded-lg"
                  >
                    <Search className="h-3.5 w-3.5 text-[#006788] dark:text-[#38bdf8] shrink-0" />
                    <span className="whitespace-nowrap">{texts.nav.trackInquiry}</span>
                  </Button>
                }
              />
            </div>

            {/* Employees Login CTA — circled lock icon to save navbar space (desktop only; mobile in drawer menu) */}
            <Button
              asChild
              size="icon"
              className="hidden md:inline-flex h-8 w-8 sm:h-9 sm:w-9 rounded-full shadow-2xs transition-transform hover:scale-105 shrink-0 border bg-[#006788] text-white hover:bg-[#00597b] border-[#006788]"
            >
              <Link
                to="/auth"
                search={{ flow: "signin" }}
                className="flex items-center justify-center"
                title={texts.nav.employeesLogin}
                aria-label={texts.nav.employeesLogin}
              >
                <Lock className="h-4 w-4 shrink-0 stroke-[2.25] text-white" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* 2. ARCHITECTURAL HERO SECTION */}
      <section className="relative overflow-hidden pt-8 pb-12 sm:pt-12 sm:pb-16 lg:pt-14 lg:pb-20 border-b border-[#E9E6E1] dark:border-stone-800 bg-[#FAF8F4] dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            {/* LEFT COLUMN: Authority, Brand Prestige, Metrics & Value Checklist */}
            <div className="lg:col-span-6 space-y-5 sm:space-y-6 pt-1 lg:pt-2 flex flex-col justify-between animate-in fade-in-50 duration-300">
              {/* Main Heading */}
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-[44px] xl:text-[48px] font-normal sm:font-medium tracking-tight text-[#111111] dark:text-stone-100 leading-[1.18] sm:leading-[1.14]">
                {isEn ? cmsContent.heroTitlePart1 || texts.hero.titlePart1 : texts.hero.titlePart1}
                <span className="text-[#006788] dark:text-[#38bdf8] font-semibold italic sm:not-italic">
                  {isEn
                    ? cmsContent.heroTitleHighlight || texts.hero.titleHighlight
                    : texts.hero.titleHighlight}
                </span>
              </h1>

              {/* 4 Trust Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-1">
                <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-[#E9E6E1] dark:border-stone-800 bg-white dark:bg-stone-900/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all duration-250 ease-out hover:-translate-y-[3px] hover:shadow-sm cursor-default">
                  <div className="text-xl sm:text-2xl font-bold tracking-tight text-[#111111] dark:text-stone-100">
                    {toIndicDigits(cmsContent.heroCustomersServed || "1500+", currentLang)}
                  </div>
                  <div className="text-[11px] sm:text-xs text-[#5F6368] dark:text-stone-400 font-medium mt-1">
                    {texts.hero.customersServed}
                  </div>
                </div>

                <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-[#E9E6E1] dark:border-stone-800 bg-white dark:bg-stone-900/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all duration-250 ease-out hover:-translate-y-[3px] hover:shadow-sm cursor-default">
                  <div className="text-xl sm:text-2xl font-bold tracking-tight text-[#111111] dark:text-stone-100">
                    {toIndicDigits(
                      isEn
                        ? cmsContent.heroWarranty || texts.hero.yearsWarranty
                        : texts.hero.yearsWarranty,
                      currentLang,
                    )}
                  </div>
                  <div className="text-[11px] sm:text-xs text-[#5F6368] dark:text-stone-400 font-medium mt-1">
                    {texts.hero.installationWarranty}
                  </div>
                </div>

                <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-[#E9E6E1] dark:border-stone-800 bg-white dark:bg-stone-900/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all duration-250 ease-out hover:-translate-y-[3px] hover:shadow-sm cursor-default">
                  <div className="text-xl sm:text-2xl font-bold tracking-tight text-[#111111] dark:text-stone-100">
                    {isEn
                      ? cmsContent.heroPricingBadge &&
                        !cmsContent.heroPricingBadge.toLowerCase().includes("direct") &&
                        !cmsContent.heroPricingBadge.toLowerCase().includes("quarry")
                        ? cmsContent.heroPricingBadge
                        : texts.hero.direct
                      : texts.hero.direct}
                  </div>
                  <div className="text-[11px] sm:text-xs text-[#5F6368] dark:text-stone-400 font-medium mt-1">
                    {texts.hero.quarryPricing}
                  </div>
                </div>

                <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-[#E9E6E1] dark:border-stone-800 bg-white dark:bg-stone-900/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all duration-250 ease-out hover:-translate-y-[3px] hover:shadow-sm cursor-default">
                  <div className="text-xl sm:text-2xl font-bold tracking-tight text-[#111111] dark:text-stone-100 flex items-center gap-1">
                    <span>{toIndicDigits(cmsContent.heroGoogleRating || "4.6", currentLang)}</span>
                    <span className="text-[#006788] dark:text-[#38bdf8] text-base sm:text-lg">
                      ★
                    </span>
                  </div>
                  <div className="text-[11px] sm:text-xs text-[#5F6368] dark:text-stone-400 font-medium mt-1">
                    {texts.hero.googleRating}
                  </div>
                </div>
              </div>

              {/* Supporting Copy */}
              <div className="space-y-4 pt-1">
                <p className="text-sm sm:text-[15px] text-[#5F6368] dark:text-stone-300 leading-relaxed max-w-xl font-normal">
                  {isEn
                    ? cmsContent.heroDescription || texts.hero.description
                    : texts.hero.description}
                </p>

                {/* Benefits Checklist */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-[#111111] dark:text-stone-200">
                    <Check className="h-4 w-4 text-[#006788] dark:text-[#38bdf8] shrink-0 stroke-[2.25]" />
                    <span>
                      {isEn
                        ? cmsContent.heroBenefit1 || texts.hero.benefits.quarry
                        : texts.hero.benefits.quarry}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-[#111111] dark:text-stone-200">
                    <Check className="h-4 w-4 text-[#006788] dark:text-[#38bdf8] shrink-0 stroke-[2.25]" />
                    <span>
                      {isEn
                        ? cmsContent.heroBenefit2 || texts.hero.benefits.cnc
                        : texts.hero.benefits.cnc}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-[#111111] dark:text-stone-200">
                    <Check className="h-4 w-4 text-[#006788] dark:text-[#38bdf8] shrink-0 stroke-[2.25]" />
                    <span>
                      {isEn
                        ? cmsContent.heroBenefit3 || texts.hero.benefits.panIndia
                        : texts.hero.benefits.panIndia}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-[#111111] dark:text-stone-200">
                    <Check className="h-4 w-4 text-[#006788] dark:text-[#38bdf8] shrink-0 stroke-[2.25]" />
                    <span>
                      {isEn
                        ? cmsContent.heroBenefit4 || texts.hero.benefits.support
                        : texts.hero.benefits.support}
                    </span>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="pt-1 flex flex-wrap items-center gap-4">
                <a
                  href="#gallery-feed"
                  className="group inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#006788] dark:text-[#38bdf8] transition-colors relative cursor-pointer"
                >
                  <span className="relative pb-0.5">
                    {texts.hero.exploreProjects}
                    <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-[#006788] dark:bg-[#38bdf8] transition-all duration-300 ease-out group-hover:w-full" />
                  </span>
                  <ArrowDown className="h-3.5 w-3.5 transition-transform duration-250 ease-out group-hover:translate-y-1" />
                </a>
              </div>
            </div>

            {/* RIGHT COLUMN: Scaled Sacred Shree Yantra & Prepayment Privilege Showcase */}
            <div
              id="lead-form"
              className="lg:col-span-6 scroll-mt-24 flex flex-col justify-center animate-in fade-in-50 duration-300"
            >
              <ShreeYantraHeroShowcase
                lang={currentLang as "en" | "hi" | "gu"}
                isClaimed={prepaymentDiscountSelected}
                onToggleClaim={() => {
                  const next = !prepaymentDiscountSelected;
                  setPrepaymentDiscountSelected(next);
                  if (next) {
                    toast.success(texts.prepaymentOffer.appliedToast);
                    setIsEstimateOpen(true);
                  } else {
                    toast.info("Prepayment privilege unselected.");
                  }
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2b. ARCHITECTURAL PRODUCT SHOWCASE & LIVE INSTALLATIONS GALLERY */}
      <section
        id="wall-cladding-catalogue"
        className="py-14 sm:py-20 border-b border-border/60 bg-gradient-to-b from-stone-50/50 via-background to-stone-50/30 dark:from-stone-950/40 dark:via-background dark:to-stone-950/20 scroll-mt-16"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
          {/* Section Header */}
          <div className="text-center space-y-3">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#015474] dark:text-[#67e8f9]">
              {isEn
                ? cmsContent.showcaseSectionTitle || texts.showcase.sectionTitle
                : texts.showcase.sectionTitle}
            </h2>
            <p className="text-base sm:text-lg text-[#015474]/80 dark:text-[#67e8f9]/80 max-w-2xl mx-auto font-medium">
              {isEn
                ? (cmsContent.showcaseSectionSubtitle || texts.showcase.sectionSubtitle)
                    .replace(/with transparent factory rates attached,?\s*/gi, "")
                    .replace(/with transparent factory rates,?\s*/gi, "")
                : texts.showcase.sectionSubtitle}
            </p>
          </div>

          {/* TOP-RIGHT CATALOGUE PDF DOWNLOAD CONTROL (ABOVE THE BOX) */}
          <div
            id="download-catalogues"
            className="relative z-30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-2 sm:mb-3 pt-1 scroll-mt-28"
          >
            <div id="catalogues" className="scroll-mt-28" />
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#006788] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#006788]" />
              </span>
              <span>
                {currentLang === "gu"
                  ? "વાસ્તુશિલ્પીય કેટલોગ્સ અને સ્પેસિફિકેશન્સ"
                  : currentLang === "hi"
                    ? "वास्तुशिल्पीय कैटलॉग एवं विनिर्देश"
                    : "Architectural Catalogues & Specifications"}
              </span>
            </div>

            <div className="w-full sm:w-auto flex items-center justify-end">
              <DownloadCataloguesDropdown />
            </div>
          </div>

          {/* MASTER ARCHITECTURAL PRODUCT DISPLAY WITH INTEGRATED TABS */}
          <MasterProductCatalog
            activeTab={showcaseTab}
            onTabChange={(tab) => setShowcaseTab(tab)}
            onSelectProduct={(productDesc) => {
              scrollToForm(productDesc);
            }}
          />

          {/* LUXURY ARCHITECTURAL SHOWCASE (WHEN INSTALLATIONS TAB ACTIVE) */}
          {showcaseTab === "installations" && (
            <div id="gallery-feed" className="animate-in fade-in duration-300 space-y-12 pt-6">
              <LuxuryProductShowcase
                onSelectProduct={scrollToForm}
                selectedProducts={selectedProducts}
              />
            </div>
          )}
        </div>
      </section>

      {/* 2. WHY STONE TECH (THE 4 PILLARS) */}
      <section id="why-us" className="py-16 sm:py-20 border-b border-border/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#015474] dark:text-[#67e8f9]">
              {isEn ? cmsContent.whyUsSectionTitle || texts.whyUs.title : texts.whyUs.title}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-xl border border-border bg-card space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#e0f1f5] text-[#006788] dark:bg-[#015474]/30 dark:text-[#38bdf8]">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-[#015474] dark:text-[#67e8f9]">
                {isEn ? cmsContent.pillar1Title || texts.whyUs.p1Title : texts.whyUs.p1Title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isEn ? cmsContent.pillar1Desc || texts.whyUs.p1Desc : texts.whyUs.p1Desc}
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#e0f1f5] text-[#006788] dark:bg-[#015474]/30 dark:text-[#38bdf8]">
                <Compass className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-[#015474] dark:text-[#67e8f9]">
                {isEn ? cmsContent.pillar2Title || texts.whyUs.p2Title : texts.whyUs.p2Title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isEn ? cmsContent.pillar2Desc || texts.whyUs.p2Desc : texts.whyUs.p2Desc}
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#e0f1f5] text-[#006788] dark:bg-[#015474]/30 dark:text-[#38bdf8]">
                <Eye className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-[#015474] dark:text-[#67e8f9]">
                {isEn ? cmsContent.pillar3Title || texts.whyUs.p3Title : texts.whyUs.p3Title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isEn ? cmsContent.pillar3Desc || texts.whyUs.p3Desc : texts.whyUs.p3Desc}
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#e0f1f5] text-[#006788] dark:bg-[#015474]/30 dark:text-[#38bdf8]">
                <Palette className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-[#015474] dark:text-[#67e8f9]">
                {isEn ? cmsContent.pillar4Title || texts.whyUs.p4Title : texts.whyUs.p4Title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isEn ? cmsContent.pillar4Desc || texts.whyUs.p4Desc : texts.whyUs.p4Desc}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. BROAD "HOW TO REACH US" & VERIFIED RATINGS FOOTER */}
      <ContactCenter />

      {/* 4. FOOTER WITH BRAND ATELIER & EMPLOYEES LOGIN */}
      <footer className="border-t border-border/80 bg-background/80 py-6 px-4 text-xs text-muted-foreground pb-24 sm:pb-6">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <img
              src="/branding/stone-tech-logo.png"
              alt="Stone Tech"
              className="h-5 w-5 object-contain rounded"
            />
            <span className="font-bold text-foreground tracking-tight">
              {texts.brandName || "STONE TECH"}
            </span>
            <span>• {texts.brandSubtitle}</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <Link
              to="/careers"
              className="hover:text-primary transition-colors cursor-pointer underline-offset-4 hover:underline"
            >
              {currentLang === "hi" ? "करियर" : currentLang === "gu" ? "કારકિર્દી" : "Careers"}
            </Link>
            <span>•</span>
            <CustomerInquiryLookupDialog
              trigger={
                <button
                  type="button"
                  className="hover:text-primary transition-colors cursor-pointer underline-offset-4 hover:underline"
                >
                  {texts.nav.trackInquiry}
                </button>
              }
            />
            <span>•</span>
            <Link
              to="/auth"
              search={{ flow: "signin" }}
              className="inline-flex items-center gap-1 hover:text-primary transition-colors underline-offset-4 hover:underline"
            >
              <Lock className="h-3 w-3" />
              <span>{texts.nav.employeesLogin}</span>
            </Link>
          </div>
        </div>
      </footer>

      {/* 9. STICKY MOBILE ACTION BAR (LIVSPACE MOBILE PATTERN) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border p-2 sm:p-2.5 pb-[max(env(safe-area-inset-bottom),0.625rem)] flex items-center gap-1.5 sm:gap-2 shadow-xl">
        <LanguageToggle className="h-10 px-2 text-xs border border-border shrink-0 bg-background" />
        <Button
          asChild
          size="sm"
          className="flex-1 h-10 bg-[#e0f1f5] text-[#015474] hover:bg-[#d0eaf1] border border-[#c9d1d4] dark:bg-[#015474]/40 dark:text-[#67e8f9] dark:border-[#00597b] font-bold gap-1 text-xs shadow-2xs"
        >
          <a
            href={`https://api.whatsapp.com/send?phone=${primaryPhoneClean}&text=Hi%20Stone%20Tech%20Team,%20I%20have%20an%20inquiry%20for%20stone%20requirements`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Phone className="h-3.5 w-3.5 text-[#006788] dark:text-[#38bdf8] shrink-0" />
            <span className="truncate">{texts.mobileBar.whatsapp}</span>
          </a>
        </Button>

        <Button
          onClick={() => scrollToForm()}
          size="sm"
          className="flex-1 h-10 bg-[#006788] hover:bg-[#00597b] text-white font-bold gap-1 text-xs cursor-pointer shadow-md"
        >
          <span className="truncate">{texts.mobileBar.freeEstimate}</span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0" />
        </Button>
      </div>

      {/* Native / PWA bottom safe-area underlay in signature turquoise */}
      <div
        aria-hidden="true"
        className="fixed bottom-0 inset-x-0 h-[env(safe-area-inset-bottom,0px)] bg-[#015474] z-30 pointer-events-none sm:hidden"
      />

      {/* StoneMan AI Customer Track Order Dialog */}
      <StonemanCustomerDialog open={stonemanOpen} onOpenChange={setStonemanOpen} />
      {/* Request for Estimate Dialog (Full 2-Step Form with Uploads & Success View) */}
      <RequestEstimateDialog
        open={isEstimateOpen}
        onOpenChange={setIsEstimateOpen}
        selectedProducts={selectedProducts}
        setSelectedProducts={setSelectedProducts}
        prepaymentDiscountSelected={prepaymentDiscountSelected}
        setPrepaymentDiscountSelected={setPrepaymentDiscountSelected}
        planDescription={planDescription}
        setPlanDescription={setPlanDescription}
      />
    </div>
  );
}

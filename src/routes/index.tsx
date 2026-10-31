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
 * - Broad "How to reach Us?" section with Google 4.9 rating & direct Maps directions
 * - Returning customer inquiry tracking modal
 * - Separate Staff / Employee ERP portal login in footer
 * - Sticky mobile bottom action bar
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useMemo, useEffect, type FormEvent, type ChangeEvent } from "react";
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
  Truck,
  Search,
  Briefcase,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CountryCodeSelect } from "@/components/forms/inputs/CountryCodeSelect";
import { CustomerInquiryLookupDialog } from "@/components/enquiry/CustomerInquiryLookupDialog";
import { StoneGalleryFeed } from "@/components/landing/StoneGalleryFeed";
import { LuxuryProductShowcase } from "@/components/landing/LuxuryProductShowcase";
import { ContactCenter } from "@/components/landing/ContactCenter";
import { JobOpeningsDialog } from "@/components/landing/JobOpeningsDialog";
import { ShreeYantraHeroShowcase } from "@/components/landing/ShreeYantraHeroShowcase";
import { supabase } from "@/integrations/supabase/client";
import {
  submitPublicEnquiryServerFn,
  type PublicInquiryResult,
} from "@/lib/enquiries/public-inquiry.functions";
import { useSiteSettingsValue } from "@/lib/site-settings/use-site-settings";
import { StonemanMascot } from "@/components/mascot/StonemanMascot";
import { StonemanCustomerDialog } from "@/components/mascot/StonemanCustomerDialog";
import { LanguageToggle } from "@/components/global/LanguageToggle";
import { useTranslation } from "react-i18next";
import {
  getLandingTexts,
  getLocalizedProducts,
  getLocalizedSpaceTypes,
  getLocalizedCustomerRoles,
  getLocalizedQuickIdeas,
  getProductNameInLang,
} from "@/lib/i18n/landing-i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Stone Tech-Architectural Stone Atelier" },
      {
        name: "description",
        content:
          "India's premier architectural natural stone atelier. Custom Stone Veneer, 3D Wall Cladding, Interlocking Panels, Waterjet Inlays & Italian Marble. Instant WhatsApp quotation.",
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
    tagline: "Pure Makrana, Ambaji white, and premium Indian marble slabs",
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const siteSettings = useSiteSettingsValue();
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.substring(0, 2) || "en";
  const texts = getLandingTexts(currentLang);
  const localizedProducts = useMemo(
    () => getLocalizedProducts(MASTER_PRODUCT_OPTIONS, currentLang),
    [currentLang],
  );
  const localizedSpaceTypes = useMemo(
    () => getLocalizedSpaceTypes(SPACE_TYPES, currentLang),
    [currentLang],
  );
  const localizedCustomerRoles = useMemo(
    () => getLocalizedCustomerRoles(CUSTOMER_ROLES, currentLang),
    [currentLang],
  );
  const localizedQuickIdeas = useMemo(
    () => getLocalizedQuickIdeas(QUICK_IDEA_SUGGESTIONS, currentLang),
    [currentLang],
  );

  // Form states (2-Step Continuation 1/2 and 2/2)
  const [formStep, setFormStep] = useState<1 | 2>(1);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [spaceType, setSpaceType] = useState<string>("");
  const [planDescription, setPlanDescription] = useState<string>("");

  // Customer contact states with country code
  const [customerRole, setCustomerRole] = useState<string>("Owner / Homeowner");
  const [name, setName] = useState<string>("");
  const [countryCode, setCountryCode] = useState<string>("+91");
  const [whatsapp, setWhatsapp] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [city, setCity] = useState<string>("");

  // Validation & Error states
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Live Calendar required date starting from today
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [requiredDate, setRequiredDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split("T")[0];
  });

  // Photo uploads (up to 10)
  const [photos, setPhotos] = useState<
    Array<{ name: string; dataUrl: string; size: number; previewUrl: string }>
  >([]);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<PublicInquiryResult | null>(null);

  // StoneMan AI Mascot Dialog state
  const [stonemanOpen, setStonemanOpen] = useState(false);

  // 100% Prepayment Privilege Offer state
  const [prepaymentDiscountSelected, setPrepaymentDiscountSelected] = useState(false);

  // Clear specific error on field change
  const clearError = (field: string) => {
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Smart matching of external/gallery product names to master stone categories
  const matchMasterProduct = (rawName: string): string => {
    const trimmed = rawName.trim().toLowerCase();
    const direct = MASTER_PRODUCT_OPTIONS.find((p) => p.name.toLowerCase() === trimmed);
    if (direct) return direct.name;

    if (trimmed.includes("italian")) {
      return "Italian Marble Slabs";
    }
    if (trimmed.includes("indian") && trimmed.includes("marble")) {
      return "Indian Marble Slabs";
    }
    if (trimmed.includes("limestone")) {
      return "Limestone Slabs";
    }
    if (trimmed.includes("cobble")) {
      return "Cobblestone";
    }
    if (trimmed.includes("pebble")) {
      return "Pebblestone";
    }
    if (trimmed.includes("boulder")) {
      return "Boulders";
    }
    if (trimmed.includes("sculpt")) {
      return "Sculptures";
    }
    if (trimmed.includes("artwork") || trimmed.includes("art piece")) {
      return "Artwork";
    }
    if (trimmed.includes("basin") || trimmed.includes("sink")) {
      return "Custom Stone Basins";
    }
    if (trimmed.includes("waterfall")) {
      return "Waterfall";
    }
    if (trimmed.includes("fountain")) {
      return "Fountain";
    }
    if (trimmed.includes("temple") || trimmed.includes("mandir")) {
      return "Temple Work Handcrafting";
    }
    if (trimmed.includes("clay")) {
      return "Clay Veneers";
    }
    if (trimmed.includes("veneer") || trimmed.includes("slim") || trimmed.includes("sheet")) {
      return "Stone Veneer";
    }
    if (
      trimmed.includes("cladding") ||
      trimmed.includes("elevation") ||
      trimmed.includes("facade") ||
      trimmed.includes("sandstone")
    ) {
      return "Custom Stone Cladding";
    }
    if (trimmed.includes("interlock") || trimmed.includes("ledge") || trimmed.includes("panel")) {
      return "Natural Stone Interlocking Panels";
    }
    if (trimmed.includes("mosaic") || trimmed.includes("brass") || trimmed.includes("waterjet")) {
      return "Natural Stone Mosaics";
    }
    if (trimmed.includes("inlay")) {
      return "Inlay Work";
    }
    if (trimmed.includes("mural") || trimmed.includes("carv") || trimmed.includes("jaali")) {
      return "Stone Murals";
    }
    if (trimmed.includes("crazy")) {
      return "Crazy Pattern in Stone";
    }
    if (trimmed.includes("floor") || trimmed.includes("marble") || trimmed.includes("granite")) {
      return "Custom Flooring";
    }
    if (
      trimmed.includes("table") ||
      trimmed.includes("counter") ||
      trimmed.includes("island") ||
      trimmed.includes("vanity")
    ) {
      return "Table Top";
    }
    if (
      trimmed.includes("pu ") ||
      trimmed.includes("polyurethane") ||
      trimmed.includes("lightweight")
    ) {
      return "PU Panels";
    }
    if (
      trimmed.includes("step") ||
      trimmed.includes("landscape") ||
      trimmed.includes("garden") ||
      trimmed.includes("pathway") ||
      trimmed.includes("paver")
    ) {
      return "Stepping Stone";
    }
    if (
      trimmed.includes("agate") ||
      trimmed.includes("onyx") ||
      trimmed.includes("semi-precious") ||
      trimmed.includes("backlit") ||
      trimmed.includes("gem")
    ) {
      return "Agate Slabs";
    }

    return "Custom Stone Cladding";
  };

  // Toggle product selection
  const toggleProduct = (productName: string) => {
    clearError("selectedProducts");
    setSelectedProducts((prev) =>
      prev.includes(productName) ? prev.filter((p) => p !== productName) : [...prev, productName],
    );
  };

  const scrollToForm = (productNameToSelect?: string, withDiscount = false) => {
    // Crucial: ALWAYS bring the user to Step 1 so the product selection is in view!
    setFormStep(1);
    clearError("selectedProducts");

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
    const formEl = document.getElementById("lead-form");
    if (formEl) {
      formEl.scrollIntoView({ behavior: "smooth", block: "start" });
      formEl.classList.add("ring-4", "ring-emerald-500/60", "transition-all", "duration-500");
      setTimeout(() => {
        formEl.classList.remove("ring-4", "ring-emerald-500/60");
      }, 2000);
    }
  };

  const appendIdea = (idea: string) => {
    setPlanDescription((prev) => (prev ? `${prev}, ${idea}` : idea));
  };

  const setQuickDays = (days: number) => {
    clearError("requiredDate");
    const d = new Date();
    d.setDate(d.getDate() + days);
    setRequiredDate(d.toISOString().split("T")[0]);
  };

  // Pre-calculated WhatsApp fallback URL in case of network timeout
  const fallbackWhatsappUrl = useMemo(() => {
    const prods = selectedProducts.length > 0 ? selectedProducts.join(", ") : "Architectural Stone";
    const discountLine = prepaymentDiscountSelected
      ? `*Prepayment Privilege:* 100% Advance Payment (5% Discount + Free Certified Shree Yantra worth ₹14,999 on stone product orders > ₹1L*)\n`
      : "";
    const text = encodeURIComponent(
      `Hello Stone Tech Team! I would like to request an estimate for:\n\n` +
        `*Name:* ${name || "Client"}\n` +
        `*WhatsApp:* ${whatsapp || "Not specified"}\n` +
        `*Products:* ${prods}\n` +
        `*Space:* ${spaceType}\n` +
        `*City:* ${city || "Not specified"}\n` +
        `*Required by:* ${requiredDate}\n` +
        discountLine +
        (planDescription ? `*Details:* ${planDescription}\n` : ""),
    );
    return `https://api.whatsapp.com/send?phone=917742090866&text=${text}`;
  }, [
    name,
    whatsapp,
    selectedProducts,
    spaceType,
    city,
    requiredDate,
    planDescription,
    prepaymentDiscountSelected,
  ]);

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 10 - photos.length;
    if (remainingSlots <= 0) {
      toast.error(texts.errors.maxPhotos);
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    setIsProcessingPhotos(true);

    try {
      const processed: Array<{
        name: string;
        dataUrl: string;
        size: number;
        previewUrl: string;
      }> = [];

      for (const file of filesToProcess) {
        if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
          toast.error(texts.errors.invalidFileType.replace("{{filename}}", file.name));
          continue;
        }

        try {
          const dataUrl = await compressImage(file);
          processed.push({
            name: file.name,
            dataUrl,
            size: file.size,
            previewUrl: dataUrl,
          });
        } catch {
          toast.error(`Could not process ${file.name}`);
        }
      }

      setPhotos((prev) => [...prev, ...processed]);
      if (processed.length > 0) {
        toast.success(`Added ${processed.length} photo(s).`);
      }
    } finally {
      setIsProcessingPhotos(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    setSubmitError(null);

    if (formStep === 1) {
      const step1Errors: Record<string, string> = {};
      if (selectedProducts.length === 0) {
        step1Errors.selectedProducts = texts.errors.selectProduct;
      }
      if (!spaceType.trim()) {
        step1Errors.spaceType = texts.errors.selectSpace;
      }
      if (Object.keys(step1Errors).length > 0) {
        setFormErrors(step1Errors);
        toast.error(Object.values(step1Errors)[0]);
        return;
      }
      setFormErrors({});
      setFormStep(2);
      return;
    }

    const errors: Record<string, string> = {};
    if (selectedProducts.length === 0) {
      errors.selectedProducts = texts.errors.selectProduct;
    }
    if (!spaceType.trim()) {
      errors.spaceType = texts.errors.selectSpace;
    }
    if (!name.trim()) {
      errors.name = texts.errors.enterName;
    }
    const cleanDigits = whatsapp.replace(/\D/g, "");
    if (cleanDigits.length < 7) {
      errors.whatsapp = texts.errors.validWhatsapp;
    }
    if (!city.trim()) {
      errors.city = texts.errors.enterCity;
    }
    if (!requiredDate) {
      errors.requiredDate = texts.errors.pickDate;
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      const firstError = Object.values(errors)[0];
      toast.error(firstError);
      if (errors.selectedProducts || errors.spaceType) {
        setFormStep(1);
      }
      return;
    }

    setFormErrors({});
    setIsSubmitting(true);

    try {
      const selectedRoleObj = CUSTOMER_ROLES.find((r) => r.value === customerRole);
      const finalPlanDescription = prepaymentDiscountSelected
        ? `${planDescription.trim()}\n[Prepayment Privilege: 100% advance payment for 5% discount + Certified Shree Yantra worth ₹14,999 on stone product orders > ₹1L*]`.trim()
        : planDescription.trim();

      const result = await submitPublicEnquiryServerFn({
        data: {
          name: name.trim(),
          country_code: countryCode,
          whatsapp: cleanDigits,
          email: email.trim(),
          city: city.trim(),
          customer_role: customerRole,
          customer_type: "website",
          space_type: spaceType,
          required_date: requiredDate,
          selected_products: selectedProducts,
          plan_description: finalPlanDescription,
          photos: photos.map((p) => ({
            name: p.name,
            dataUrl: p.dataUrl,
            size: p.size,
          })),
        },
      });

      setSubmittedResult(result);
      toast.success(texts.errors.inquirySuccessToast);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      console.error("Submission failed:", err);
      const msg =
        err instanceof Error ? err.message : "Failed to submit inquiry. Please try again.";
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // SUCCESS CONFIRMATION VIEW
  // -------------------------------------------------------------
  if (submittedResult) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-stone-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-12 px-4 sm:px-6">
        <div className="mx-auto max-w-xl">
          <Card className="border-emerald-200/80 shadow-2xl dark:border-emerald-900/50 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 px-6 py-8 text-center text-white">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-xs mb-3 shadow-inner">
                <CheckCircle2 className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                {texts.success.title}
              </h1>
              <p className="text-emerald-100 text-sm mt-1">
                {texts.success.thankYou.replace("{{name}}", submittedResult.customer_name)}
              </p>
            </div>

            <CardContent className="p-6 sm:p-8 space-y-6">
              <div className="rounded-xl border border-border/80 bg-muted/30 p-4 text-center space-y-1">
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  {texts.success.refNumber}
                </div>
                <div className="text-2xl sm:text-3xl font-mono font-bold text-primary tracking-wide">
                  {submittedResult.enquiry_no}
                </div>
                <p className="text-xs text-muted-foreground">{texts.success.refNote}</p>
              </div>

              {/* 5% Prepayment Privilege Locked Badge */}
              {prepaymentDiscountSelected && (
                <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/40 p-3.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="text-xs font-bold text-amber-950 dark:text-amber-200">
                      Prepayment Privilege Locked: 5% OFF + Free Shree Yantra (Orders &gt; ₹1L)*
                    </span>
                  </div>
                  <Badge className="bg-emerald-600 text-white font-bold text-[10px]">
                    PRIVILEGE LOCKED
                  </Badge>
                </div>
              )}

              {/* WhatsApp instant response card */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 dark:border-emerald-900 dark:bg-emerald-950/30 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366] text-white shrink-0 shadow-xs">
                    <Phone className="h-5 w-5 fill-current" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
                      {texts.success.whatsappSent.replace("{{phone}}", submittedResult.whatsapp)}
                    </h3>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                      {texts.success.whatsappDesc}
                    </p>
                  </div>
                </div>

                <Button
                  asChild
                  className="w-full bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold gap-2 shadow-sm h-11"
                >
                  <a href={submittedResult.whatsapp_link} target="_blank" rel="noopener noreferrer">
                    <Send className="h-4 w-4" />
                    <span>{texts.success.openWhatsapp}</span>
                  </a>
                </Button>
              </div>

              {/* Showroom & Google Map details */}
              <div className="rounded-xl border border-border p-4 bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-rose-500" />
                    <span className="text-sm font-bold">{texts.success.visitCenter}</span>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[11px] gap-1 border-amber-300 text-amber-800 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 font-semibold"
                  >
                    <Star className="h-3 w-3 fill-amber-500 text-amber-500" />{" "}
                    {texts.success.onGoogle.replace(
                      "{{rating}}",
                      String(siteSettings.google_rating),
                    )}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{texts.success.touchFeel}</p>
                <Button asChild variant="outline" size="sm" className="w-full gap-2 text-xs">
                  <a
                    href="https://share.google/0J6h6joQLwo1hVTWJ"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>{texts.success.getDirections}</span>
                  </a>
                </Button>
              </div>

              <Button
                variant="ghost"
                onClick={() => {
                  setSubmittedResult(null);
                  setPhotos([]);
                  setPlanDescription("");
                }}
                className="w-full text-xs text-muted-foreground hover:text-foreground"
              >
                {texts.success.submitAnother}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
                STONE TECH
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider sm:tracking-widest leading-none mt-0.5 whitespace-nowrap">
                {texts.brandSubtitle}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 xl:gap-8 text-sm font-semibold text-foreground/80">
            <a
              href="#gallery-feed"
              className="hover:text-primary transition-colors whitespace-nowrap py-1"
            >
              {texts.nav.ourWork}
            </a>
            <a
              href="#why-us"
              className="hover:text-primary transition-colors whitespace-nowrap py-1"
            >
              {texts.nav.whyUs}
            </a>
            <JobOpeningsDialog
              trigger={
                <button className="hover:text-primary transition-colors cursor-pointer flex items-center gap-1.5 text-sm font-semibold text-foreground/80 py-1 whitespace-nowrap">
                  <Briefcase className="h-4 w-4 text-primary" />
                  <span>{texts.nav.jobOpenings}</span>
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
            {/* Language Switcher — visible on sm+ (mobile already has it fixed in bottom bar) */}
            <LanguageToggle className="hidden sm:inline-flex h-8 sm:h-9 px-2 sm:px-2.5 text-xs rounded-lg border border-border/80 bg-background/80" />

            {/* Customer Tracking Dialog — visible on sm+ */}
            <div className="hidden sm:block">
              <CustomerInquiryLookupDialog
                trigger={
                  <Button
                    variant="outline"
                    size="default"
                    className="h-8 sm:h-9 px-2 sm:px-3.5 gap-1 sm:gap-1.5 text-xs font-semibold shadow-2xs border-border/90 hover:border-primary/60 hover:text-primary shrink-0 rounded-lg"
                  >
                    <Search className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="whitespace-nowrap">{texts.nav.trackInquiry}</span>
                  </Button>
                }
              />
            </div>

            {/* Employees Login CTA — full on desktop, sleek compact icon on mobile */}
            <Button
              asChild
              size="default"
              className="h-8 sm:h-9 px-2 sm:px-3.5 gap-1 sm:gap-1.5 text-xs font-semibold shadow-2xs transition-colors shrink-0 rounded-lg border bg-primary text-primary-foreground hover:bg-primary/90 border-primary"
            >
              <Link
                to="/auth"
                search={{ flow: "signin" }}
                className="inline-flex items-center gap-1 sm:gap-1.5 whitespace-nowrap"
                title={texts.nav.employeesLogin}
                aria-label={texts.nav.employeesLogin}
              >
                <Lock
                  className="h-3.5 w-3.5 shrink-0 stroke-[2.25] text-primary-foreground"
                  aria-hidden="true"
                />
                <span className="hidden sm:inline">{texts.nav.employeesLogin}</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* 2. ARCHITECTURAL HERO SECTION */}
      <section className="relative overflow-hidden pt-8 pb-12 sm:pt-12 sm:pb-16 lg:pt-14 lg:pb-20 border-b border-[#E9E6E1] dark:border-stone-800 bg-[#FAF8F4] dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* LEFT COLUMN: Authority, Brand Prestige, Metrics & Value Checklist */}
            <div className="lg:col-span-6 space-y-6 sm:space-y-7 pt-1 lg:pt-2 animate-in fade-in-50 duration-300">
              {/* Main Heading */}
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-[44px] xl:text-[48px] font-normal sm:font-medium tracking-tight text-[#111111] dark:text-stone-100 leading-[1.18] sm:leading-[1.14]">
                {texts.hero.titlePart1}
                <span className="text-[#0D7A7B] dark:text-[#2dd4bf] font-semibold italic sm:not-italic">
                  {texts.hero.titleHighlight}
                </span>
              </h1>

              {/* 4 Trust Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-1">
                <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-[#E9E6E1] dark:border-stone-800 bg-white dark:bg-stone-900/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all duration-250 ease-out hover:-translate-y-[3px] hover:shadow-sm cursor-default">
                  <div className="text-xl sm:text-2xl font-bold tracking-tight text-[#111111] dark:text-stone-100">
                    1500+
                  </div>
                  <div className="text-[11px] sm:text-xs text-[#5F6368] dark:text-stone-400 font-medium mt-1">
                    {texts.hero.customersServed}
                  </div>
                </div>

                <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-[#E9E6E1] dark:border-stone-800 bg-white dark:bg-stone-900/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all duration-250 ease-out hover:-translate-y-[3px] hover:shadow-sm cursor-default">
                  <div className="text-xl sm:text-2xl font-bold tracking-tight text-[#111111] dark:text-stone-100">
                    {texts.hero.yearsWarranty}
                  </div>
                  <div className="text-[11px] sm:text-xs text-[#5F6368] dark:text-stone-400 font-medium mt-1">
                    {texts.hero.installationWarranty}
                  </div>
                </div>

                <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-[#E9E6E1] dark:border-stone-800 bg-white dark:bg-stone-900/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all duration-250 ease-out hover:-translate-y-[3px] hover:shadow-sm cursor-default">
                  <div className="text-xl sm:text-2xl font-bold tracking-tight text-[#111111] dark:text-stone-100">
                    {texts.hero.direct}
                  </div>
                  <div className="text-[11px] sm:text-xs text-[#5F6368] dark:text-stone-400 font-medium mt-1">
                    {texts.hero.quarryPricing}
                  </div>
                </div>

                <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-[#E9E6E1] dark:border-stone-800 bg-white dark:bg-stone-900/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all duration-250 ease-out hover:-translate-y-[3px] hover:shadow-sm cursor-default">
                  <div className="text-xl sm:text-2xl font-bold tracking-tight text-[#111111] dark:text-stone-100 flex items-center gap-1">
                    <span>4.6</span>
                    <span className="text-[#0D7A7B] text-base sm:text-lg">★</span>
                  </div>
                  <div className="text-[11px] sm:text-xs text-[#5F6368] dark:text-stone-400 font-medium mt-1">
                    {texts.hero.googleRating}
                  </div>
                </div>
              </div>

              {/* Scaled Sacred Shree Yantra & Prepayment Privilege Showcase (Single Exclusive Ad) */}
              <ShreeYantraHeroShowcase
                isClaimed={prepaymentDiscountSelected}
                onToggleClaim={() => {
                  const next = !prepaymentDiscountSelected;
                  setPrepaymentDiscountSelected(next);
                  if (next) {
                    toast.success(texts.prepaymentOffer.appliedToast);
                    const formEl = document.getElementById("lead-form");
                    if (formEl) {
                      formEl.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                  } else {
                    toast.info("Prepayment privilege unselected.");
                  }
                }}
              />

              {/* Supporting Copy */}
              <div className="space-y-4 pt-1">
                <p className="text-sm sm:text-[15px] text-[#5F6368] dark:text-stone-300 leading-relaxed max-w-xl font-normal">
                  {texts.hero.description}
                </p>

                {/* Benefits Checklist */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-[#111111] dark:text-stone-200">
                    <Check className="h-4 w-4 text-[#0D7A7B] shrink-0 stroke-[2.25]" />
                    <span>{texts.hero.benefits.quarry}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-[#111111] dark:text-stone-200">
                    <Check className="h-4 w-4 text-[#0D7A7B] shrink-0 stroke-[2.25]" />
                    <span>{texts.hero.benefits.cnc}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-[#111111] dark:text-stone-200">
                    <Check className="h-4 w-4 text-[#0D7A7B] shrink-0 stroke-[2.25]" />
                    <span>{texts.hero.benefits.panIndia}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-[#111111] dark:text-stone-200">
                    <Check className="h-4 w-4 text-[#0D7A7B] shrink-0 stroke-[2.25]" />
                    <span>{texts.hero.benefits.support}</span>
                  </div>
                </div>

                {/* CTA */}
                <div className="pt-2">
                  <a
                    href="#gallery-feed"
                    className="group inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#0D7A7B] dark:text-[#2dd4bf] transition-colors relative cursor-pointer"
                  >
                    <span className="relative pb-0.5">
                      {texts.hero.exploreProjects}
                      <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-[#0D7A7B] dark:bg-[#2dd4bf] transition-all duration-300 ease-out group-hover:w-full" />
                    </span>
                    <ArrowDown className="h-3.5 w-3.5 transition-transform duration-250 ease-out group-hover:translate-y-1" />
                  </a>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Floating Request for Estimate Card */}
            <div id="lead-form" className="lg:col-span-6 scroll-mt-24">
              <Card className="border-border/90 shadow-xl bg-card rounded-2xl overflow-hidden ring-1 ring-border/50">
                {/* Card Top Title Banner */}
                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white p-5 sm:p-6 border-b border-primary/20">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                      {texts.form.title}
                    </h2>
                  </div>
                </div>

                {/* Step Progress Continuation Bar (1/2 and 2/2) */}
                <div className="border-b border-border/60 bg-slate-900/95 px-3.5 sm:px-5 py-2.5 sm:py-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setFormStep(1)}
                      className={cn(
                        "flex items-center gap-1.5 font-bold transition-colors min-w-0 cursor-pointer py-1",
                        formStep === 1
                          ? "text-teal-300 font-extrabold"
                          : "text-slate-400 hover:text-slate-200",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold shrink-0 transition-colors",
                          formStep === 1
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "border border-slate-700 bg-slate-800 text-slate-400",
                        )}
                      >
                        1
                      </span>
                      <span className="hidden sm:inline">{texts.form.step1}</span>
                      <span className="sm:hidden text-[11px] truncate">
                        {texts.form.step1Short}
                      </span>
                      {selectedProducts.length > 0 && (
                        <span className="ml-1 rounded-full bg-teal-500/20 text-teal-300 text-[10px] px-1.5 py-0.2 font-mono">
                          {selectedProducts.length}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormStep(2)}
                      className={cn(
                        "flex items-center gap-1.5 font-bold transition-colors min-w-0 cursor-pointer py-1",
                        formStep === 2
                          ? "text-teal-300 font-extrabold"
                          : "text-slate-400 hover:text-slate-200",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold shrink-0 transition-colors",
                          formStep === 2
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "border border-slate-700 bg-slate-800 text-slate-400",
                        )}
                      >
                        2
                      </span>
                      <span className="hidden sm:inline">{texts.form.step2}</span>
                      <span className="sm:hidden text-[11px] truncate">
                        {texts.form.step2Short}
                      </span>
                    </button>
                  </div>

                  {/* Visual Progress Bar Track */}
                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-teal-500 via-primary to-cyan-400 transition-all duration-300 ease-out"
                      style={{ width: formStep === 1 ? "50%" : "100%" }}
                    />
                  </div>
                </div>

                <CardContent className="paper-texture p-5 sm:p-6">
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* PART 1/2: PRODUCTS, SPACE & PHOTO UPLOADS */}
                    {formStep === 1 && (
                      <div className="space-y-5 animate-in fade-in-50 duration-200">
                        {/* STEP 1: PRODUCT SELECTION */}
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-bold">
                                1
                              </span>
                              <span>
                                {texts.form.selectProducts}{" "}
                                <span className="text-destructive">*</span>:
                              </span>
                            </label>
                            <div className="flex items-center gap-2">
                              {selectedProducts.length > 0 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setSelectedProducts([]);
                                  }}
                                  className="text-[11px] text-muted-foreground hover:text-destructive underline cursor-pointer"
                                >
                                  {texts.form.clear}
                                </button>
                              )}
                              <Badge
                                variant={selectedProducts.length > 0 ? "default" : "outline"}
                                className={cn(
                                  "text-[10px] font-bold h-5 px-1.5",
                                  selectedProducts.length > 0
                                    ? "bg-teal-600 text-white"
                                    : "text-muted-foreground",
                                )}
                              >
                                {texts.form.selectedCount.replace(
                                  "{{count}}",
                                  String(selectedProducts.length),
                                )}
                              </Badge>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                            {localizedProducts.map((prod) => {
                              const isSelected = selectedProducts.includes(prod.canonicalName);
                              return (
                                <button
                                  key={prod.id}
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    toggleProduct(prod.canonicalName);
                                  }}
                                  aria-pressed={isSelected}
                                  className={cn(
                                    "p-2.5 rounded-xl border text-left transition-all text-xs flex items-center justify-between gap-1.5 cursor-pointer select-none active:scale-[0.98]",
                                    isSelected
                                      ? "border-teal-600 dark:border-teal-400 bg-teal-50 dark:bg-teal-950/70 text-teal-950 dark:text-teal-100 font-bold ring-2 ring-teal-500/40 shadow-xs"
                                      : "border-stone-200 dark:border-stone-800 bg-background hover:bg-muted/70 text-stone-700 dark:text-stone-300 hover:text-foreground",
                                  )}
                                >
                                  <span className="leading-snug line-clamp-2">{prod.name}</span>
                                  {isSelected ? (
                                    <div className="h-4 w-4 rounded bg-teal-600 dark:bg-teal-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                                      <Check className="h-3 w-3 stroke-[3]" />
                                    </div>
                                  ) : (
                                    <div className="h-4 w-4 rounded border-2 border-stone-300 dark:border-stone-600 bg-background shrink-0" />
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-muted-foreground px-0.5">
                            <span>{texts.form.tapHint}</span>
                            {selectedProducts.length < MASTER_PRODUCT_OPTIONS.length && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedProducts(MASTER_PRODUCT_OPTIONS.map((p) => p.name));
                                }}
                                className="text-primary hover:underline font-medium cursor-pointer"
                              >
                                {texts.form.selectAll.replace(
                                  "{{count}}",
                                  String(MASTER_PRODUCT_OPTIONS.length),
                                )}
                              </button>
                            )}
                          </div>

                          {formErrors.selectedProducts && (
                            <p className="text-[11px] text-destructive font-medium mt-1">
                              {formErrors.selectedProducts}
                            </p>
                          )}
                        </div>

                        {/* STEP 2: SPACE TYPE & PLAN DESCRIPTION */}
                        <div className="space-y-2.5 pt-2 border-t border-border/80">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-bold">
                                2
                              </span>
                              <span>
                                {texts.form.spaceType} <span className="text-destructive">*</span>:
                              </span>
                            </label>
                            {spaceType && (
                              <button
                                type="button"
                                onClick={() => setSpaceType("")}
                                className="text-[11px] text-muted-foreground hover:text-destructive underline cursor-pointer"
                              >
                                {texts.form.clear}
                              </button>
                            )}
                          </div>

                          {/* Space Type Selector Chips */}
                          <div className="flex flex-wrap gap-1.5">
                            {localizedSpaceTypes.slice(0, 6).map((st) => (
                              <button
                                key={st.value}
                                type="button"
                                onClick={() => {
                                  clearError("spaceType");
                                  setSpaceType((prev) => (prev === st.value ? "" : st.value));
                                }}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                                  spaceType === st.value
                                    ? "border-primary bg-primary text-primary-foreground shadow-2xs font-semibold"
                                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                                }`}
                              >
                                {st.label}
                              </button>
                            ))}
                          </div>

                          {formErrors.spaceType && (
                            <p className="text-[11px] text-destructive font-medium mt-1">
                              {formErrors.spaceType}
                            </p>
                          )}

                          {/* Description & Quick Idea Suggestions */}
                          <div className="space-y-1.5">
                            <Textarea
                              value={planDescription}
                              onChange={(e) => setPlanDescription(e.target.value)}
                              placeholder={texts.form.descPlaceholder}
                              rows={2}
                              className="text-xs resize-none bg-background"
                            />
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <Sparkles className="h-3 w-3 text-primary" /> {texts.form.ideas}
                              </span>
                              {localizedQuickIdeas.slice(0, 4).map((tag) => (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => appendIdea(tag)}
                                  className="text-[10px] rounded-full border border-border px-2 py-0.5 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                                >
                                  + {tag}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* STEP 3: PHOTO / CAD UPLOADER (UP TO 10) */}
                        <div className="space-y-2 pt-2 border-t border-border/80">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-bold">
                                3
                              </span>
                              <span>{texts.form.uploadLabel}</span>
                            </label>
                            <Badge
                              variant="outline"
                              className="text-[10px] font-mono border-border bg-muted/30"
                            >
                              {texts.form.filesCount.replace("{{count}}", String(photos.length))}
                            </Badge>
                          </div>

                          {/* Hidden File Input */}
                          <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept="image/*,application/pdf"
                            onChange={handlePhotoUpload}
                            className="hidden"
                          />

                          {photos.length < 10 && (
                            <div
                              onClick={() => fileInputRef.current?.click()}
                              className="rounded-xl border border-dashed border-primary/40 hover:border-primary bg-background/60 hover:bg-muted/40 p-3 text-center cursor-pointer transition-all flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground"
                            >
                              {isProcessingPhotos ? (
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                              ) : (
                                <Upload className="h-4 w-4 text-primary" />
                              )}
                              <span>
                                {isProcessingPhotos
                                  ? texts.form.compressing
                                  : texts.form.uploadPrompt}
                              </span>
                            </div>
                          )}

                          {/* Photo Thumbnail Gallery */}
                          {photos.length > 0 && (
                            <div className="grid grid-cols-4 gap-2 pt-1">
                              {photos.map((photo, index) => (
                                <div
                                  key={index}
                                  className="relative group rounded-lg border border-border overflow-hidden bg-background aspect-square shadow-2xs"
                                >
                                  <img
                                    src={photo.previewUrl}
                                    alt={photo.name}
                                    className="h-full w-full object-cover"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removePhoto(index)}
                                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/80 hover:bg-destructive text-white flex items-center justify-center transition-colors"
                                    aria-label="Remove photo"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* CONTINUE TO PART 2/2 BUTTON */}
                        <div className="pt-2">
                          <Button
                            type="button"
                            onClick={() => {
                              const step1Errors: Record<string, string> = {};
                              if (selectedProducts.length === 0) {
                                step1Errors.selectedProducts = texts.errors.selectProduct;
                              }
                              if (!spaceType.trim()) {
                                step1Errors.spaceType = texts.errors.selectSpace;
                              }
                              if (Object.keys(step1Errors).length > 0) {
                                setFormErrors(step1Errors);
                                toast.error(Object.values(step1Errors)[0]);
                                return;
                              }
                              setFormErrors({});
                              setFormStep(2);
                            }}
                            className="w-full h-11 sm:h-12 text-xs sm:text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-2 shadow-md cursor-pointer"
                          >
                            <span className="hidden sm:inline">{texts.form.continueBtn}</span>
                            <span className="sm:hidden">{texts.form.continueBtnShort}</span>
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* PART 2/2: CONTACT, WHATSAPP & DELIVERY TIMELINE */}
                    {formStep === 2 && (
                      <div className="space-y-5 animate-in fade-in-50 duration-200">
                        {/* Quick Selection Summary */}
                        <div className="rounded-xl border border-border/80 bg-background/90 p-3 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-semibold text-muted-foreground shrink-0">
                              {texts.form.selectedLabel}
                            </span>
                            <span className="font-bold text-foreground truncate">
                              {selectedProducts
                                .map((p) => getProductNameInLang(p, currentLang))
                                .join(", ") || texts.form.noneSelected}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFormStep(1)}
                            className="text-[11px] font-bold text-primary hover:underline shrink-0 cursor-pointer"
                          >
                            {texts.form.editStep1}
                          </button>
                        </div>

                        {/* STEP 4: CONTACT & LIVE CALENDAR PICKER */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-bold">
                                4
                              </span>
                              <span>{texts.form.contactTitle}</span>
                            </label>
                          </div>

                          {/* Customer Persona / Role Selector */}
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                              <span>
                                {texts.form.yourRole} <span className="text-destructive">*</span>
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {texts.form.selectOne}
                              </span>
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                              {localizedCustomerRoles.map((role) => {
                                const isSelected = customerRole === role.value;
                                return (
                                  <button
                                    key={role.value}
                                    type="button"
                                    onClick={() => setCustomerRole(role.value)}
                                    className={`p-2 rounded-xl border text-left transition-all text-xs flex items-center justify-between gap-1 cursor-pointer ${
                                      isSelected
                                        ? "border-primary bg-primary/10 text-foreground font-bold ring-1 ring-primary/30 shadow-2xs"
                                        : "border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground"
                                    }`}
                                  >
                                    <span className="truncate">{role.label}</span>
                                    {isSelected && (
                                      <Check className="h-3.5 w-3.5 text-primary shrink-0 stroke-[3]" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {/* Full Name */}
                            <div>
                              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                                {texts.form.fullName} <span className="text-destructive">*</span>
                              </label>
                              <Input
                                value={name}
                                onChange={(e) => {
                                  setName(e.target.value);
                                  clearError("name");
                                }}
                                placeholder="Rajesh Sharma"
                                className={cn(
                                  "h-9 text-xs bg-background transition-colors",
                                  formErrors.name &&
                                    "border-destructive focus-visible:ring-destructive",
                                )}
                              />
                              {formErrors.name && (
                                <p className="text-[11px] text-destructive font-medium mt-1">
                                  {formErrors.name}
                                </p>
                              )}
                            </div>

                            {/* WhatsApp Number with Country Code Dropdown */}
                            <div>
                              <label className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mb-1 block flex items-center gap-1">
                                <Phone className="h-3 w-3 fill-current" />{" "}
                                {texts.form.whatsappNumber}{" "}
                                <span className="text-destructive">*</span>
                              </label>
                              <div className="flex items-center">
                                <CountryCodeSelect value={countryCode} onChange={setCountryCode} />
                                <Input
                                  type="tel"
                                  value={whatsapp}
                                  onChange={(e) => {
                                    setWhatsapp(e.target.value);
                                    clearError("whatsapp");
                                  }}
                                  placeholder="98765 43210"
                                  className={cn(
                                    "h-9 text-xs font-medium rounded-l-none border-l-0 border-emerald-300 focus-visible:ring-emerald-500 dark:border-emerald-800 bg-background transition-colors",
                                    formErrors.whatsapp &&
                                      "border-destructive focus-visible:ring-destructive",
                                  )}
                                />
                              </div>
                              {formErrors.whatsapp && (
                                <p className="text-[11px] text-destructive font-medium mt-1">
                                  {formErrors.whatsapp}
                                </p>
                              )}
                            </div>

                            {/* City / Location */}
                            <div>
                              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                                {texts.form.projectCity} <span className="text-destructive">*</span>
                              </label>
                              <Input
                                value={city}
                                onChange={(e) => {
                                  setCity(e.target.value);
                                  clearError("city");
                                }}
                                placeholder={texts.form.cityPlaceholder}
                                className={cn(
                                  "h-9 text-xs bg-background transition-colors",
                                  formErrors.city &&
                                    "border-destructive focus-visible:ring-destructive",
                                )}
                              />
                              {formErrors.city && (
                                <p className="text-[11px] text-destructive font-medium mt-1">
                                  {formErrors.city}
                                </p>
                              )}
                            </div>

                            {/* Email (Optional) */}
                            <div>
                              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                                {texts.form.emailOptional}
                              </label>
                              <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="rajesh@example.com"
                                className="h-9 text-xs bg-background"
                              />
                            </div>
                          </div>

                          {/* Live Interactive Calendar starting from today */}
                          <div className="space-y-1.5 pt-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-foreground flex items-center gap-1">
                                <CalendarIcon className="h-3 w-3 text-primary" />{" "}
                                {texts.form.requiredDate}{" "}
                                <span className="text-destructive">*</span>
                              </span>
                              <span className="text-muted-foreground">
                                {texts.form.pickFromCalendar}
                              </span>
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                              <Input
                                type="date"
                                min={todayStr}
                                value={requiredDate}
                                onChange={(e) => {
                                  setRequiredDate(e.target.value);
                                  clearError("requiredDate");
                                }}
                                className={cn(
                                  "h-9 text-xs font-medium cursor-pointer bg-background transition-colors",
                                  formErrors.requiredDate &&
                                    "border-destructive focus-visible:ring-destructive",
                                )}
                              />

                              {/* Quick Jump Timeline Chips */}
                              <div className="flex items-center gap-1 shrink-0">
                                {[
                                  { label: "+7d", days: 7 },
                                  { label: "15d", days: 15 },
                                  { label: "1mo", days: 30 },
                                  { label: "2mo", days: 60 },
                                ].map((q) => {
                                  const d = new Date();
                                  d.setDate(d.getDate() + q.days);
                                  const matchStr = d.toISOString().split("T")[0];
                                  const isActive = requiredDate === matchStr;

                                  return (
                                    <button
                                      key={q.days}
                                      type="button"
                                      onClick={() => setQuickDays(q.days)}
                                      className={
                                        isActive
                                          ? "text-[10px] px-2 py-1 rounded border border-primary/40 bg-primary/10 text-primary font-bold cursor-pointer"
                                          : "text-[10px] px-2 py-1 rounded border border-border hover:bg-muted text-muted-foreground cursor-pointer"
                                      }
                                    >
                                      {q.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                            {formErrors.requiredDate && (
                              <p className="text-[11px] text-destructive font-medium mt-1">
                                {formErrors.requiredDate}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Network/Timeout 1-Tap WhatsApp Fallback */}
                        {submitError && (
                          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 dark:border-amber-800 dark:bg-amber-950/40 text-xs space-y-2">
                            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-semibold">
                              <Phone className="h-4 w-4 text-emerald-600" />
                              <span>{texts.form.instantWhatsappOption}</span>
                            </div>
                            <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                              {texts.form.instantWhatsappDesc}
                            </p>
                            <Button
                              asChild
                              size="sm"
                              className="w-full bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold gap-1.5 shadow-sm h-10"
                            >
                              <a
                                href={fallbackWhatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Phone className="h-3.5 w-3.5 fill-current" />
                                <span>{texts.form.sendWhatsappBtn}</span>
                              </a>
                            </Button>
                          </div>
                        )}

                        {/* SUBMIT / BACK BUTTONS */}
                        <div className="pt-2 flex items-center gap-2 sm:gap-2.5">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setFormStep(1)}
                            className="h-11 sm:h-12 px-3 sm:px-4 text-xs font-bold gap-1.5 border-border shrink-0 cursor-pointer"
                          >
                            <ArrowLeft className="h-4 w-4" />
                            <span className="hidden sm:inline">{texts.form.backBtn}</span>
                            <span className="sm:hidden">{texts.form.back}</span>
                          </Button>

                          <Button
                            type="submit"
                            disabled={isSubmitting || isProcessingPhotos}
                            className="flex-1 h-11 sm:h-12 text-xs sm:text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-2 shadow-md min-w-0 cursor-pointer"
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                                <span className="truncate">{texts.form.submitting}</span>
                              </>
                            ) : (
                              <>
                                <span className="truncate">{texts.form.submitBtn}</span>
                                <ArrowRight className="h-4 w-4 shrink-0" />
                              </>
                            )}
                          </Button>
                        </div>

                        <div className="text-center text-[11px] text-muted-foreground mt-2 flex items-center justify-center gap-1.5">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                          <span>{texts.form.trustNote}</span>
                        </div>
                      </div>
                    )}
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* 2b. LIVE INSTALLATIONS & EXECUTED WORKS (GALLERY FEED & CURATED SHOWCASE) */}
      <section className="py-12 sm:py-16 border-b border-border/60 bg-gradient-to-b from-stone-50/50 via-background to-stone-50/30 dark:from-stone-950/40 dark:via-background dark:to-stone-950/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Embedded Stone Gallery Feed in rounded container */}
          <div id="gallery-feed" className="scroll-mt-24">
            <StoneGalleryFeed onSelectProduct={scrollToForm} />
          </div>

          {/* Curated Luxury Architectural Products Showcase */}
          <LuxuryProductShowcase
            onSelectProduct={scrollToForm}
            selectedProducts={selectedProducts}
          />
        </div>
      </section>

      {/* 2. WHY STONE TECH (THE 4 PILLARS) */}
      <section id="why-us" className="py-16 sm:py-20 border-b border-border/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              {texts.whyUs.title}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-xl border border-border bg-card space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Gem className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold">{texts.whyUs.p1Title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{texts.whyUs.p1Desc}</p>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                <Compass className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold">{texts.whyUs.p2Title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{texts.whyUs.p2Desc}</p>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <Phone className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold">{texts.whyUs.p3Title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{texts.whyUs.p3Desc}</p>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600">
                <Truck className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold">{texts.whyUs.p4Title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{texts.whyUs.p4Desc}</p>
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
            <span className="font-bold text-foreground tracking-tight">STONE TECH</span>
            <span>• {texts.brandSubtitle}</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
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
          className="flex-1 h-10 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold gap-1 text-xs"
        >
          <a
            href="https://api.whatsapp.com/send?phone=917742090866&text=Hi%20Stone%20Tech%20Team,%20I%20have%20an%20inquiry%20for%20stone%20requirements"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Phone className="h-3.5 w-3.5 fill-current shrink-0" />
            <span className="truncate">{texts.mobileBar.whatsapp}</span>
          </a>
        </Button>

        <Button
          onClick={() => scrollToForm()}
          size="sm"
          className="flex-1 h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-1 text-xs cursor-pointer shadow-md"
        >
          <span className="truncate">{texts.mobileBar.freeEstimate}</span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0" />
        </Button>
      </div>

      {/* StoneMan AI Mascot Assistant & Track Order Dialog */}
      <StonemanMascot
        onClick={() => setStonemanOpen(true)}
        className={
          stonemanOpen ? "pointer-events-none opacity-0 transition-opacity duration-200" : ""
        }
      />
      <StonemanCustomerDialog open={stonemanOpen} onOpenChange={setStonemanOpen} />
    </div>
  );
}

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
import { ContactCenter } from "@/components/landing/ContactCenter";
import { JobOpeningsDialog } from "@/components/landing/JobOpeningsDialog";
import { supabase } from "@/integrations/supabase/client";
import {
  submitPublicEnquiryServerFn,
  type PublicInquiryResult,
} from "@/lib/enquiries/public-inquiry.functions";
import { useSiteSettingsValue } from "@/lib/site-settings/use-site-settings";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Stone Tech — Bespoke Natural Stone & Architectural Finishes" },
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
  {
    id: "stone_veneer",
    name: "Stone Veneer",
    tagline:
      "Ultra-thin, flexible natural slate & quartzite sheets for walls, ceilings & furniture",
    popular: true,
  },
  {
    id: "custom_stone_cladding",
    name: "Custom Stone Cladding",
    tagline: "Exterior elevation facades & interior 3D textured accent feature walls",
    popular: true,
  },
  {
    id: "interlocking_panels",
    name: "Interlocking Panels",
    tagline: "Seamless 3D textured ledgestone & interlocking elevation panels",
    popular: true,
  },
  {
    id: "stone_mosaics_inlay",
    name: "Stone Mosaics & Inlay",
    tagline: "Waterjet geometric medallions, floral floor inlays & brass borders",
  },
  {
    id: "stone_murals_carvings",
    name: "Stone Murals & Carvings",
    tagline: "CNC 3D carved temple mandirs, artistic jaalis & stone wall sculptures",
  },
  {
    id: "marble_granite_flooring",
    name: "Custom Flooring",
    tagline: "Imported Italian marble, premium granites & dry-lay vein matching",
  },
  {
    id: "table_tops_countertops",
    name: "Table Tops & Countertops",
    tagline: "Luxury dining tables, kitchen waterfall islands & stone vanity counters",
  },
  {
    id: "pu_decorative_panels",
    name: "PU Decorative Panels",
    tagline: "Ultra-lightweight, quick-mount high-definition faux stone replica panels",
  },
  {
    id: "stepping_stones_landscaping",
    name: "Stepping Stones & Landscape",
    tagline: "Natural garden cobbles, flagstones, pavers & water feature boulders",
  },
  {
    id: "agate_semi_precious",
    name: "Agate & Semi-Precious Slabs",
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

  // Auth state for staff
  const [isAuthenticatedStaff, setIsAuthenticatedStaff] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setIsAuthenticatedStaff(true);
      }
    });
  }, []);

  // Form states (2-Step Continuation 1/2 and 2/2)
  const [formStep, setFormStep] = useState<1 | 2>(1);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [spaceType, setSpaceType] = useState<string>("Bungalow / Villa");
  const [planDescription, setPlanDescription] = useState<string>("");

  // Customer contact states with country code
  const [customerRole, setCustomerRole] = useState<string>("Owner / Homeowner");
  const [name, setName] = useState<string>("");
  const [countryCode, setCountryCode] = useState<string>("+91");
  const [whatsapp, setWhatsapp] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [city, setCity] = useState<string>("");

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

  // Toggle product selection
  const toggleProduct = (productName: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productName) ? prev.filter((p) => p !== productName) : [...prev, productName],
    );
  };

  const scrollToForm = (productNameToSelect?: string) => {
    if (productNameToSelect && !selectedProducts.includes(productNameToSelect)) {
      setSelectedProducts((prev) => [...prev, productNameToSelect]);
    }
    setFormStep(1);
    const formEl = document.getElementById("lead-form");
    if (formEl) {
      formEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const appendIdea = (idea: string) => {
    setPlanDescription((prev) => (prev ? `${prev}, ${idea}` : idea));
  };

  const setQuickDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setRequiredDate(d.toISOString().split("T")[0]);
  };

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 10 - photos.length;
    if (remainingSlots <= 0) {
      toast.error("You can upload a maximum of 10 photos.");
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
          toast.error(`${file.name} is not an image or PDF file.`);
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

    if (formStep === 1) {
      if (selectedProducts.length === 0) {
        toast.error("Please select at least one stone product to proceed.");
        return;
      }
      setFormStep(2);
      return;
    }

    if (!name.trim()) {
      toast.error("Please enter your full name.");
      return;
    }
    const cleanDigits = whatsapp.replace(/\D/g, "");
    if (cleanDigits.length < 7) {
      toast.error("Please enter a valid WhatsApp phone number.");
      return;
    }
    if (!city.trim()) {
      toast.error("Please enter your project city or location.");
      return;
    }
    if (!requiredDate) {
      toast.error("Please pick your required completion date from the calendar.");
      return;
    }
    if (selectedProducts.length === 0 && !planDescription.trim() && photos.length === 0) {
      toast.error("Please select a product, upload photos, or describe your stone requirements.");
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedRoleObj = CUSTOMER_ROLES.find((r) => r.value === customerRole);
      const result = await submitPublicEnquiryServerFn({
        data: {
          name: name.trim(),
          country_code: countryCode,
          whatsapp: cleanDigits,
          email: email.trim(),
          city: city.trim(),
          customer_role: customerRole,
          customer_type: selectedRoleObj?.type || "individual",
          space_type: spaceType,
          required_date: requiredDate,
          selected_products: selectedProducts,
          plan_description: planDescription.trim(),
          photos: photos.map((p) => ({
            name: p.name,
            dataUrl: p.dataUrl,
            size: p.size,
          })),
        },
      });

      setSubmittedResult(result);
      toast.success(
        "Inquiry received successfully! Our stone specialist will connect with you on WhatsApp.",
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      console.error("Submission failed:", err);
      const msg =
        err instanceof Error ? err.message : "Failed to submit inquiry. Please try again.";
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
                Inquiry Received!
              </h1>
              <p className="text-emerald-100 text-sm mt-1">
                Thank you, {submittedResult.customer_name}. We have registered your custom stone
                requirements.
              </p>
            </div>

            <CardContent className="p-6 sm:p-8 space-y-6">
              <div className="rounded-xl border border-border/80 bg-muted/30 p-4 text-center space-y-1">
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  Inquiry Reference Number
                </div>
                <div className="text-2xl sm:text-3xl font-mono font-bold text-primary tracking-wide">
                  {submittedResult.enquiry_no}
                </div>
                <p className="text-xs text-muted-foreground">
                  Keep this reference code for instant swatch tracking and dispatch updates.
                </p>
              </div>

              {/* WhatsApp instant response card */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 dark:border-emerald-900 dark:bg-emerald-950/30 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366] text-white shrink-0 shadow-xs">
                    <Phone className="h-5 w-5 fill-current" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
                      Automated WhatsApp Update Sent to {submittedResult.whatsapp}
                    </h3>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                      Our system is generating your stone estimate and swatch kit. Connect directly
                      with our lead architect on WhatsApp to receive rapid pricing & high-res slab
                      photos:
                    </p>
                  </div>
                </div>

                <Button
                  asChild
                  className="w-full bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold gap-2 shadow-sm h-11"
                >
                  <a href={submittedResult.whatsapp_link} target="_blank" rel="noopener noreferrer">
                    <Send className="h-4 w-4" />
                    <span>Open WhatsApp & Chat Now</span>
                  </a>
                </Button>
              </div>

              {/* Showroom & Google Map details */}
              <div className="rounded-xl border border-border p-4 bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-rose-500" />
                    <span className="text-sm font-bold">Visit Our Stone Experience Center</span>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[11px] gap-1 border-amber-300 text-amber-800 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 font-semibold"
                  >
                    <Star className="h-3 w-3 fill-amber-500 text-amber-500" />{" "}
                    {siteSettings.google_rating} on Google
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Touch and feel 200+ curated live slabs, 3D elevation claddings, and flexible stone
                  veneer installations.
                </p>
                <Button asChild variant="outline" size="sm" className="w-full gap-2 text-xs">
                  <a
                    href="https://share.google/0J6h6joQLwo1hVTWJ"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Get Exact Directions on Google Maps</span>
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
                Submit Another Project Requirement
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
    <div className="min-h-screen paper-texture dark:bg-slate-950 text-foreground antialiased pb-20 sm:pb-12">
      {/* 1. LIVSPACE LUXURY NAVBAR */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md shadow-2xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo & Tagline */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/95 p-1 shadow-xs border border-border/80 ring-1 ring-black/5">
              <img
                src="/branding/stone-tech-icon.png"
                alt="Stone Tech"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <div className="text-base font-black tracking-wider uppercase text-foreground leading-none">
                STONE TECH
              </div>
              <div className="text-[10px] text-muted-foreground uppercase font-semibold tracking-widest mt-0.5">
                Architectural Stone Atelier
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-muted-foreground">
            <a href="#gallery-feed" className="hover:text-primary transition-colors">
              Our Work
            </a>
            <a href="#why-us" className="hover:text-primary transition-colors">
              Why Us
            </a>
            <JobOpeningsDialog />
            <a href="#contact-us" className="hover:text-primary transition-colors">
              Contact
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Customer Tracking Dialog */}
            <CustomerInquiryLookupDialog />

            {/* Employees Login CTA */}
            <Button
              asChild
              size="sm"
              variant={isAuthenticatedStaff ? "default" : "outline"}
              className={cn(
                "h-8 px-3 gap-1.5 text-xs font-semibold shadow-2xs border transition-colors shrink-0",
                isAuthenticatedStaff
                  ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                  : "border-border/90 bg-background/90 text-foreground hover:bg-muted/80 hover:text-foreground",
              )}
            >
              <Link
                to={isAuthenticatedStaff ? "/dashboard" : "/auth"}
                search={isAuthenticatedStaff ? undefined : { flow: "signin" }}
                className="inline-flex items-center gap-1.5"
              >
                <Lock
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 stroke-[2.25]",
                    isAuthenticatedStaff
                      ? "text-primary-foreground"
                      : "text-amber-600 dark:text-amber-400",
                  )}
                  aria-hidden="true"
                />
                <span>Employees Login</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* 2. LIVSPACE SPLIT-SCREEN HERO SECTION */}
      <section className="relative overflow-hidden pt-8 pb-12 sm:pt-12 sm:pb-16 lg:pt-14 lg:pb-20 border-b border-border/60 bg-gradient-to-b from-stone-100/60 via-background to-stone-50/40 dark:from-slate-900/50 dark:via-background dark:to-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* LEFT COLUMN: Authority, Brand Prestige, Embedded Feed & Contact Center */}
            <div className="lg:col-span-6 space-y-6 pt-2">
              {/* Bold Architectural Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-[1.15]">
                Bespoke Natural Stone &amp; Architectural Finishes for{" "}
                <span className="bg-gradient-to-r from-amber-600 via-amber-700 to-stone-800 bg-clip-text text-transparent dark:from-amber-400 dark:to-stone-200">
                  Luxury Living
                </span>
              </h1>

              {/* 4 Trust Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-1">
                <div className="p-3 rounded-xl border border-border/80 bg-background/80 shadow-2xs">
                  <div className="text-2xl font-black text-foreground">1500+</div>
                  <div className="text-xs text-muted-foreground font-medium mt-0.5">
                    Customers Trust
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-border/80 bg-background/80 shadow-2xs">
                  <div className="text-2xl font-black text-foreground">3 Years</div>
                  <div className="text-xs text-muted-foreground font-medium mt-0.5">
                    Surface Warranty
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-border/80 bg-background/80 shadow-2xs">
                  <div className="text-2xl font-black text-foreground">0%</div>
                  <div className="text-xs text-muted-foreground font-medium mt-0.5">
                    Middleman Markup
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-amber-300/80 bg-amber-50/50 dark:border-amber-900/60 dark:bg-amber-950/20 shadow-2xs">
                  <div className="text-2xl font-black text-amber-700 dark:text-amber-400 flex items-center gap-1">
                    {siteSettings.google_rating}{" "}
                    <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                  </div>
                  <div className="text-xs text-muted-foreground font-medium mt-0.5">
                    Google Verified
                  </div>
                </div>
              </div>

              {/* Embedded Stone Gallery Feed in a rounded container without sharp edges */}
              <div id="gallery-feed">
                <StoneGalleryFeed onSelectProduct={scrollToForm} />
              </div>
            </div>

            {/* RIGHT COLUMN: Floating Request for Estimate Card */}
            <div id="lead-form" className="lg:col-span-6 scroll-mt-24">
              <Card className="border-border/90 shadow-xl bg-card rounded-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/5">
                {/* Card Top Title Banner */}
                <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 text-white p-5 sm:p-6">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                    Request for estimate
                  </h2>
                </div>

                {/* Step Progress Continuation Bar (1/2 and 2/2) */}
                <div className="border-b border-amber-900/40 bg-stone-900/95 px-5 py-3 text-xs">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setFormStep(1)}
                      className={cn(
                        "flex items-center gap-1.5 font-bold transition-colors",
                        formStep === 1 ? "text-amber-400" : "text-stone-400 hover:text-stone-200",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                          formStep === 1
                            ? "bg-amber-500 text-stone-950 shadow-xs"
                            : "border border-stone-600 bg-stone-800 text-stone-300",
                        )}
                      >
                        1
                      </span>
                      <span>Part 1/2: Stone Requirements</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (selectedProducts.length === 0) {
                          toast.error("Please select at least one stone product to proceed.");
                          return;
                        }
                        setFormStep(2);
                      }}
                      className={cn(
                        "flex items-center gap-1.5 font-bold transition-colors",
                        formStep === 2 ? "text-amber-400" : "text-stone-400 hover:text-stone-200",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                          formStep === 2
                            ? "bg-amber-500 text-stone-950 shadow-xs"
                            : "border border-stone-600 bg-stone-800 text-stone-300",
                        )}
                      >
                        2
                      </span>
                      <span>Part 2/2: Contact &amp; Timeline</span>
                    </button>
                  </div>

                  {/* Visual Progress Bar Track */}
                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-stone-800">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-300 ease-out"
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
                              <span>Select Stone Products:</span>
                            </label>
                            <span className="text-[11px] text-muted-foreground">
                              Select multiple
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {MASTER_PRODUCT_OPTIONS.slice(0, 8).map((prod) => {
                              const isSelected = selectedProducts.includes(prod.name);
                              return (
                                <button
                                  key={prod.id}
                                  type="button"
                                  onClick={() => toggleProduct(prod.name)}
                                  className={`p-2.5 rounded-xl border text-left transition-all text-xs flex items-center justify-between gap-1.5 ${
                                    isSelected
                                      ? "border-amber-600 bg-amber-500/10 text-foreground font-semibold ring-1 ring-amber-500/30"
                                      : "border-border bg-background hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                                  }`}
                                >
                                  <span className="truncate">{prod.name}</span>
                                  {isSelected ? (
                                    <Check className="h-3.5 w-3.5 text-amber-600 shrink-0 stroke-[3]" />
                                  ) : (
                                    <div className="h-3 w-3 rounded-full border border-muted-foreground/30 shrink-0" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* STEP 2: SPACE TYPE & PLAN DESCRIPTION */}
                        <div className="space-y-2.5 pt-2 border-t border-border/80">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-bold">
                                2
                              </span>
                              <span>Project Space &amp; Concept:</span>
                            </label>
                          </div>

                          {/* Space Type Selector Chips */}
                          <div className="flex flex-wrap gap-1.5">
                            {SPACE_TYPES.slice(0, 6).map((st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() => setSpaceType(st)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                                  spaceType === st
                                    ? "border-primary bg-primary text-primary-foreground shadow-2xs"
                                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                                }`}
                              >
                                {st}
                              </button>
                            ))}
                          </div>

                          {/* Description & Quick Idea Suggestions */}
                          <div className="space-y-1.5">
                            <Textarea
                              value={planDescription}
                              onChange={(e) => setPlanDescription(e.target.value)}
                              placeholder="Dimensions, wall sizes, or details (e.g., Living room TV wall 12x10 ft, exterior elevation in slate grey)..."
                              rows={2}
                              className="text-xs resize-none bg-background"
                            />
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <Sparkles className="h-3 w-3 text-amber-500" /> Ideas:
                              </span>
                              {QUICK_IDEA_SUGGESTIONS.slice(0, 4).map((tag) => (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => appendIdea(tag)}
                                  className="text-[10px] rounded-full border border-border px-2 py-0.5 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
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
                              <span>Upload Photos / CAD (Up to 10):</span>
                            </label>
                            <Badge
                              variant="outline"
                              className="text-[10px] font-mono border-border bg-muted/30"
                            >
                              {photos.length}/10 files
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
                                  ? "Compressing photos..."
                                  : "Tap to upload site photos, sketches or CAD drawings"}
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
                              if (selectedProducts.length === 0) {
                                toast.error("Please select at least one stone product to proceed.");
                                return;
                              }
                              setFormStep(2);
                            }}
                            className="w-full h-12 text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white gap-2 shadow-md"
                          >
                            <span>Continue to Step 2/2: Delivery &amp; Contact Details</span>
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
                              Selected:
                            </span>
                            <span className="font-bold text-foreground truncate">
                              {selectedProducts.join(", ") || "Custom Stone"}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFormStep(1)}
                            className="text-[11px] font-bold text-amber-600 hover:underline shrink-0"
                          >
                            Edit (1/2)
                          </button>
                        </div>

                        {/* STEP 4: CONTACT & LIVE CALENDAR PICKER */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-bold">
                                4
                              </span>
                              <span>Contact &amp; Timeline:</span>
                            </label>
                          </div>

                          {/* Customer Persona / Role Selector */}
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                              <span>
                                Your Role / Identity <span className="text-destructive">*</span>
                              </span>
                              <span className="text-[10px] text-muted-foreground">Select one</span>
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                              {CUSTOMER_ROLES.map((role) => {
                                const isSelected = customerRole === role.value;
                                return (
                                  <button
                                    key={role.value}
                                    type="button"
                                    onClick={() => setCustomerRole(role.value)}
                                    className={`p-2 rounded-xl border text-left transition-all text-xs flex items-center justify-between gap-1 ${
                                      isSelected
                                        ? "border-amber-600 bg-amber-500/10 text-foreground font-bold ring-1 ring-amber-500/30 shadow-2xs"
                                        : "border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground"
                                    }`}
                                  >
                                    <span className="truncate">{role.label}</span>
                                    {isSelected && (
                                      <Check className="h-3.5 w-3.5 text-amber-600 shrink-0 stroke-[3]" />
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
                                Your Full Name <span className="text-destructive">*</span>
                              </label>
                              <Input
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Rajesh Sharma"
                                className="h-9 text-xs bg-background"
                              />
                            </div>

                            {/* WhatsApp Number with Country Code Dropdown */}
                            <div>
                              <label className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mb-1 block flex items-center gap-1">
                                <Phone className="h-3 w-3 fill-current" /> Enter WhatsApp Number:{" "}
                                <span className="text-destructive">*</span>
                              </label>
                              <div className="flex items-center">
                                <CountryCodeSelect value={countryCode} onChange={setCountryCode} />
                                <Input
                                  required
                                  type="tel"
                                  value={whatsapp}
                                  onChange={(e) => setWhatsapp(e.target.value)}
                                  placeholder="98765 43210"
                                  className="h-9 text-xs font-medium rounded-l-none border-l-0 border-emerald-300 focus-visible:ring-emerald-500 dark:border-emerald-800 bg-background"
                                />
                              </div>
                            </div>

                            {/* City / Location */}
                            <div>
                              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                                Project City / Location <span className="text-destructive">*</span>
                              </label>
                              <Input
                                required
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                placeholder="e.g. Ahmedabad, Jaipur, Delhi"
                                className="h-9 text-xs bg-background"
                              />
                            </div>

                            {/* Email (Optional) */}
                            <div>
                              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                                Email (Optional)
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
                                <CalendarIcon className="h-3 w-3 text-primary" /> Required
                                Completion Date: <span className="text-destructive">*</span>
                              </span>
                              <span className="text-muted-foreground">Pick from calendar</span>
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                              <Input
                                required
                                type="date"
                                min={todayStr}
                                value={requiredDate}
                                onChange={(e) => setRequiredDate(e.target.value)}
                                className="h-9 text-xs font-medium cursor-pointer bg-background"
                              />

                              {/* Quick Jump Timeline Chips */}
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setQuickDays(7)}
                                  className="text-[10px] px-2 py-1 rounded border border-border hover:bg-muted text-muted-foreground"
                                >
                                  +7d
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setQuickDays(15)}
                                  className="text-[10px] px-2 py-1 rounded border border-amber-600/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold"
                                >
                                  15d
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setQuickDays(30)}
                                  className="text-[10px] px-2 py-1 rounded border border-border hover:bg-muted text-muted-foreground"
                                >
                                  1mo
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setQuickDays(60)}
                                  className="text-[10px] px-2 py-1 rounded border border-border hover:bg-muted text-muted-foreground"
                                >
                                  2mo
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* SUBMIT / BACK BUTTONS */}
                        <div className="pt-2 flex items-center gap-2.5">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setFormStep(1)}
                            className="h-12 px-4 text-xs font-bold gap-1.5 border-border"
                          >
                            <ArrowLeft className="h-4 w-4" />
                            <span>Back (1/2)</span>
                          </Button>

                          <Button
                            type="submit"
                            disabled={isSubmitting || isProcessingPhotos}
                            className="flex-1 h-12 text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white gap-2 shadow-md"
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Submitting request &amp; photos...</span>
                              </>
                            ) : (
                              <>
                                <span>Request for estimate</span>
                                <ArrowRight className="h-4 w-4" />
                              </>
                            )}
                          </Button>
                        </div>

                        <div className="text-center text-[11px] text-muted-foreground mt-2 flex items-center justify-center gap-1.5">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Direct quarry pricing sent to WhatsApp</span>
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

      {/* 2. WHY STONE TECH (THE 4 PILLARS) */}
      <section id="why-us" className="py-16 sm:py-20 border-b border-border/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Built on Precision, Lineage & Transparency
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-xl border border-border bg-card space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                <Gem className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold">Quarry Direct Sourcing</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                No middleman or distributor markups. We source raw blocks straight from certified
                mines in Rajasthan and global stone centers.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                <Compass className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold">Sub-Millimeter CNC Cutting</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                High-pressure 5-axis CNC waterjet routers ensure under 0.5mm joint tolerances for
                flawless seamless installation.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <Phone className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold">WhatsApp Progress Updates</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Get high-resolution photo and video proofs of your stone blocks, dry-lay matching,
                and packaging sent to WhatsApp in real-time.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600">
                <Truck className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold">Export Zero-Damage Crating</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Every shipment is cushioned in EPE shock foam and sealed within export-grade wooden
                crates with 100% transit replacement coverage.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. BROAD "HOW TO REACH US" & VERIFIED RATINGS FOOTER */}
      <ContactCenter />

      {/* 9. STICKY MOBILE ACTION BAR (LIVSPACE MOBILE PATTERN) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border p-3 flex items-center gap-2.5 shadow-xl">
        <Button
          asChild
          size="sm"
          className="flex-1 h-11 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold gap-1.5 text-xs"
        >
          <a
            href="https://api.whatsapp.com/send?phone=919829000000&text=Hi%20Stone%20Tech%20Team,%20I%20have%20an%20inquiry%20for%20stone%20requirements"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Phone className="h-3.5 w-3.5 fill-current" />
            <span>WhatsApp Us</span>
          </a>
        </Button>

        <Button
          onClick={() => scrollToForm()}
          size="sm"
          className="flex-1 h-11 bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1.5 text-xs"
        >
          <span>Get Free Estimate</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

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
 * - 3-step fabrication journey & 4 core value pillars
 * - Experience Center showcase with Google 4.9 rating & direct Maps directions
 * - Collapsible Radix FAQ accordion
 * - Returning customer inquiry tracking modal
 * - Separate Staff / Employee ERP portal login and authenticated ERP jump
 * - Sticky mobile bottom action bar
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useMemo, useEffect, type FormEvent, type ChangeEvent } from "react";
import {
  Sparkles,
  Camera,
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CountryCodeSelect } from "@/components/forms/inputs/CountryCodeSelect";
import { CustomerInquiryLookupDialog } from "@/components/enquiry/CustomerInquiryLookupDialog";
import { InstagramGallery } from "@/components/landing/InstagramGallery";
import { supabase } from "@/integrations/supabase/client";
import {
  submitPublicEnquiryServerFn,
  type PublicInquiryResult,
} from "@/lib/enquiries/public-inquiry.functions";

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

const FAQ_ITEMS = [
  {
    q: "How soon will I receive my quote and stone consultation on WhatsApp?",
    a: "Within 15 to 30 minutes during business hours. Once you submit your inquiry, our automated system registers your specs and alerts our senior stone architect. You will receive an immediate acknowledgment followed by an itemized estimate, CAD recommendations, and photos directly on WhatsApp.",
  },
  {
    q: "Can I get physical stone swatches delivered to my doorstep?",
    a: "Yes! We courier curated swatch boxes containing real samples of Flexible Stone Veneer, Cladding stones, and Marble finishes directly to your site or office so you and your architect can inspect texture, weight, and color in natural light.",
  },
  {
    q: "What is Dry-Lay inspection and how does it prevent mismatches?",
    a: "Before cutting or packing Italian marble and stone claddings, our master masons assemble the full slab layout on our workshop floor. We take high-resolution 4K photos and video walkthroughs to confirm vein flow and color harmony with you before dispatch.",
  },
  {
    q: "Do you deliver and install outside Rajasthan across India?",
    a: "Absolutely. We ship nationwide across all major metros (Delhi NCR, Mumbai, Bengaluru, Hyderabad, Chennai, Kolkata, Pune) as well as tier-2/3 cities and international export hubs (UAE, USA, UK). Materials are shipped in engineered, foam-padded wooden crates with transit insurance.",
  },
  {
    q: "How do I track my submitted inquiry or existing order?",
    a: "Click 'Track My Inquiry' in the top navigation bar at any time. Enter the WhatsApp number you used during submission to see live status updates, assigned stone specialist, and quotation details.",
  },
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
  const [selectedProducts, setSelectedProducts] = useState<string[]>(["Stone Veneer"]);
  const [spaceType, setSpaceType] = useState<string>("Bungalow / Villa");
  const [planDescription, setPlanDescription] = useState<string>("");

  // Customer contact states with country code
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
      const result = await submitPublicEnquiryServerFn({
        data: {
          name: name.trim(),
          country_code: countryCode,
          whatsapp: cleanDigits,
          email: email.trim(),
          city: city.trim(),
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
                    <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> 4.9 on Google
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Touch and feel 200+ curated live slabs, 3D elevation claddings, and flexible stone
                  veneer installations.
                </p>
                <Button asChild variant="outline" size="sm" className="w-full gap-2 text-xs">
                  <a
                    href="https://www.google.com/maps/search/?api=1&query=Stone+Tech+Marble+Granite"
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
            <a href="#instagram-feed" className="hover:text-primary transition-colors">
              Instagram Feed
            </a>
            <a href="#how-it-works" className="hover:text-primary transition-colors">
              How It Works
            </a>
            <a href="#why-us" className="hover:text-primary transition-colors">
              Why Us
            </a>
            <a href="#experience-center" className="hover:text-primary transition-colors">
              Experience Center
            </a>
            <a href="#faq" className="hover:text-primary transition-colors">
              FAQ
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Customer Tracking Dialog */}
            <CustomerInquiryLookupDialog />

            {/* Staff ERP Login or Dashboard Jump */}
            {isAuthenticatedStaff ? (
              <Button
                asChild
                size="sm"
                className="h-8 gap-1.5 text-xs font-semibold bg-primary text-primary-foreground"
              >
                <Link to="/dashboard">
                  <Building className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Open</span> ERP
                </Link>
              </Button>
            ) : (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs font-medium border-border hover:bg-muted"
              >
                <Link to="/auth" search={{ flow: "signin" }}>
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="hidden sm:inline">Staff</span> Login
                </Link>
              </Button>
            )}

            {/* Primary Get Estimate CTA */}
            <Button
              onClick={() => scrollToForm()}
              size="sm"
              className="h-8 text-xs font-bold gap-1 bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
            >
              <span>Get Estimate</span>
              <ArrowRight className="h-3.5 w-3.5 hidden sm:inline" />
            </Button>
          </div>
        </div>
      </header>

      {/* 2. LIVSPACE SPLIT-SCREEN HERO SECTION */}
      <section className="relative overflow-hidden pt-8 pb-12 sm:pt-12 sm:pb-16 lg:pt-14 lg:pb-20 border-b border-border/60 bg-gradient-to-b from-stone-100/60 via-background to-stone-50/40 dark:from-slate-900/50 dark:via-background dark:to-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* LEFT COLUMN: Authority, Brand Prestige & Trust Metrics */}
            <div className="lg:col-span-6 space-y-6 pt-2">
              {/* Category Pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-600/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-bold tracking-wide">
                <Gem className="h-3.5 w-3.5" />
                <span>India's Premier Natural Stone Atelier • Direct Quarry Pricing</span>
              </div>

              {/* Bold Architectural Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-[1.15]">
                Bespoke Natural Stone & Architectural Finishes for{" "}
                <span className="bg-gradient-to-r from-amber-600 via-amber-700 to-stone-800 bg-clip-text text-transparent dark:from-amber-400 dark:to-stone-200">
                  Luxury Living
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                Flexible Stone Veneers, 3D Elevation Claddings, CNC Temple Murals & Bookmatched
                Italian Marble. Handcrafted direct from Rajasthan quarries with a 10-year surface
                durability guarantee.
              </p>

              {/* Livspace-style 4 Trust Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2">
                <div className="p-3 rounded-xl border border-border/80 bg-background/80 shadow-2xs">
                  <div className="text-2xl font-black text-foreground">500+</div>
                  <div className="text-xs text-muted-foreground font-medium mt-0.5">
                    Luxury Projects Done
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-border/80 bg-background/80 shadow-2xs">
                  <div className="text-2xl font-black text-foreground">10-Year</div>
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
                    4.9 <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                  </div>
                  <div className="text-xs text-muted-foreground font-medium mt-0.5">
                    Google Verified
                  </div>
                </div>
              </div>

              {/* Assurance Checklist */}
              <div className="space-y-2.5 pt-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </div>
                  <span>Complimentary physical swatch kit dispatched to your doorstep</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </div>
                  <span>3D dry-lay & laser vein matching photos approved before dispatch</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </div>
                  <span>Transparent quarry-direct estimate sent straight to your WhatsApp</span>
                </div>
              </div>

              {/* Quick Social Proof Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* Google Verified Card */}
                <a
                  href="https://www.google.com/maps/search/?api=1&query=Stone+Tech+Marble+Granite"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl border border-blue-200/80 bg-gradient-to-r from-blue-50/50 via-sky-50/30 to-background hover:border-blue-300 dark:border-blue-900/40 dark:from-blue-950/20 dark:to-slate-900 transition-all shadow-2xs group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-border shadow-xs text-blue-600 font-black text-sm">
                      G
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground flex items-center gap-1">
                        <span>Showroom Locator</span>
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-1 py-0.2 rounded">
                          ⭐ 4.9
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-rose-500" />
                        <span>Get directions</span>
                      </div>
                    </div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-blue-600 transition-colors" />
                </a>

                {/* Instagram Portfolio Card */}
                <a
                  href="https://www.instagram.com/stonetech.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl border border-pink-200/80 bg-gradient-to-r from-pink-50/50 via-rose-50/30 to-background hover:border-pink-300 dark:border-pink-900/40 dark:from-pink-950/20 dark:to-slate-900 transition-all shadow-2xs group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white shadow-xs">
                      <Camera className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground group-hover:text-pink-600 dark:group-hover:text-pink-400">
                        Instagram Gallery
                      </div>
                      <div className="text-[11px] text-muted-foreground">500+ executed sites</div>
                    </div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-pink-600 transition-colors" />
                </a>
              </div>
            </div>

            {/* RIGHT COLUMN: Livspace Floating Lead Capture Card */}
            <div id="lead-form" className="lg:col-span-6 scroll-mt-24">
              <Card className="border-border/90 shadow-xl bg-card rounded-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/5">
                {/* Card Top Title Banner */}
                <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 text-white p-5 sm:p-6 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-widest font-bold text-amber-300">
                      Step-by-Step Estimate
                    </span>
                    <Badge className="bg-emerald-500/20 text-emerald-200 border-emerald-400/30 text-[10px] font-semibold">
                      ⚡ Quick Response
                    </Badge>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                    Get Free Stone Estimate &amp; Swatches
                  </h2>
                  <p className="text-xs text-stone-300">
                    Receive transparent factory pricing, dry-lay guidance, and swatch kit on
                    WhatsApp.
                  </p>
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
                          <div className="text-center text-[11px] text-muted-foreground mt-2 flex items-center justify-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                            <span>
                              Next: Enter WhatsApp number to receive dry-lay photos &amp; instant
                              pricing
                            </span>
                          </div>
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
                              <span>WhatsApp &amp; Required Date:</span>
                            </label>
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
                                placeholder="e.g. Jaipur, Delhi, Dubai"
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
                                <span>Submitting requirement &amp; photos...</span>
                              </>
                            ) : (
                              <>
                                <span>Get Free Stone Estimate &amp; Swatches</span>
                                <ArrowRight className="h-4 w-4" />
                              </>
                            )}
                          </Button>
                        </div>

                        <div className="text-center text-[11px] text-muted-foreground mt-2 flex items-center justify-center gap-1.5">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Zero-spam guarantee • Direct quarry pricing sent to WhatsApp</span>
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

      {/* 3. OFFICIAL INSTAGRAM FEED & EXECUTED SITES GALLERY (300 POSTS) */}
      <InstagramGallery onSelectProduct={scrollToForm} />

      {/* 4. HOW STONE TECH WORKS (THE LIVSPACE 3-STEP JOURNEY) */}
      <section
        id="how-it-works"
        className="py-16 sm:py-20 bg-muted/20 border-b border-border/60 relative overflow-hidden"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <Badge
              variant="outline"
              className="text-xs uppercase tracking-widest text-primary border-primary/30 bg-primary/10 font-bold"
            >
              The Stone Tech Process
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              From Quarry to Your Space in 3 Simple Steps
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              We eliminate intermediaries, providing direct access to master masons, laser dry-lay
              checks, and doorstep delivery.
            </p>
          </div>

          {/* 3 Step Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="p-6 rounded-2xl border border-border/80 bg-background shadow-xs space-y-4 relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 font-black text-xl">
                1
              </div>
              <h3 className="text-lg font-bold text-foreground">Share Requirements & Plans</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Pick your preferred stone categories, enter wall dimensions, or upload architectural
                sketches, elevation CAD drawings, or site photos.
              </p>
              <div className="text-[11px] font-semibold text-primary flex items-center gap-1">
                <span>Free Swatch Kit Included</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl border border-border/80 bg-background shadow-xs space-y-4 relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary font-black text-xl">
                2
              </div>
              <h3 className="text-lg font-bold text-foreground">3D Dry-Lay & WhatsApp Quote</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Our stone architects calculate square footage, verify vein continuity, and deliver
                an itemized factory quote along with 3D dry-lay photos directly to your WhatsApp.
              </p>
              <div className="text-[11px] font-semibold text-primary flex items-center gap-1">
                <span>15-Minute Turnaround</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl border border-border/80 bg-background shadow-xs space-y-4 relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 font-black text-xl">
                3
              </div>
              <h3 className="text-lg font-bold text-foreground">Quarry Crafting & Site Delivery</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Sub-millimeter CNC cutting, artisanal hand-dressing, and heavy-duty fumigated wooden
                crating delivered safely to your project site pan-India.
              </p>
              <div className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                <span>Zero Transit Breakage Guarantee</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. WHY STONE TECH (THE 4 PILLARS) */}
      <section id="why-us" className="py-16 sm:py-20 border-b border-border/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <Badge
              variant="outline"
              className="text-xs uppercase tracking-widest text-amber-600 border-amber-500/30 bg-amber-500/10 font-bold"
            >
              Why Architects Choose Us
            </Badge>
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

      {/* 6. EXPERIENCE CENTER & GOOGLE 4.9 REVIEWS SHOWCASE */}
      <section
        id="experience-center"
        className="py-16 sm:py-20 bg-muted/20 border-b border-border/60"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-6">
              <Badge
                variant="outline"
                className="text-xs uppercase tracking-widest text-rose-600 border-rose-500/30 bg-rose-500/10 font-bold"
              >
                Visit Our Studio
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Touch & Feel 200+ Live Stone Textures at Our Experience Center
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Architects, interior designers, and discerning homeowners are invited to experience
                our full-scale 3D stone elevation mockups, flexible stone veneer displays, and
                waterjet medallions in person.
              </p>

              {/* Showroom Features */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-4 rounded-xl border border-border bg-background flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 font-bold">
                    G
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground flex items-center gap-1">
                      <span>Google Verified Business</span>
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-950 dark:text-amber-300 px-1 rounded">
                        ⭐ 4.9 / 5.0
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Based on 120+ architect reviews
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-border bg-background flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-50 dark:bg-pink-950 text-pink-600">
                    <Camera className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">Instagram Showcase</div>
                    <div className="text-[11px] text-muted-foreground">
                      Over 500+ site photos & videos
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button asChild size="default" className="gap-2 bg-primary font-bold text-xs h-10">
                  <a
                    href="https://www.google.com/maps/search/?api=1&query=Stone+Tech+Marble+Granite"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MapPin className="h-4 w-4 text-rose-400" />
                    <span>Get Directions on Google Maps</span>
                    <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                  </a>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  size="default"
                  className="gap-2 text-xs h-10 border-pink-300 text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-950/20"
                >
                  <a
                    href="https://www.instagram.com/stonetech.in"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Camera className="h-4 w-4" />
                    <span>Explore Instagram Feed</span>
                    <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                  </a>
                </Button>
              </div>
            </div>

            {/* Testimonials Card */}
            <div className="lg:col-span-5 space-y-4">
              <Card className="border-border/80 bg-background shadow-lg p-6 space-y-4">
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                </div>
                <blockquote className="text-xs sm:text-sm text-foreground italic leading-relaxed">
                  "Stone Tech transformed our bungalow facade with their 3D elevation cladding and
                  translucent stone veneer foyer wall. The WhatsApp progress updates and dry-lay
                  matching gave us 100% confidence before shipping."
                </blockquote>
                <div className="flex items-center justify-between border-t border-border/80 pt-3">
                  <div>
                    <div className="text-xs font-bold text-foreground">Vikramaditya S.</div>
                    <div className="text-[10px] text-muted-foreground">
                      Principal Architect, Jaipur
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    Verified Project
                  </Badge>
                </div>
              </Card>

              <Card className="border-border/80 bg-background shadow-lg p-6 space-y-4">
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                </div>
                <blockquote className="text-xs sm:text-sm text-foreground italic leading-relaxed">
                  "The Makrana marble mandir jaali carving was delivered with zero transit damage.
                  Every edge was laser-smooth. Truly master craftsmanship."
                </blockquote>
                <div className="flex items-center justify-between border-t border-border/80 pt-3">
                  <div>
                    <div className="text-xs font-bold text-foreground">Ananya Mehrotra</div>
                    <div className="text-[10px] text-muted-foreground">
                      Villa Owner, South Delhi
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    Verified Project
                  </Badge>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FREQUENTLY ASKED QUESTIONS (LIVSPACE RADIX ACCORDION) */}
      <section id="faq" className="py-16 sm:py-20 border-b border-border/60">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-3">
            <Badge
              variant="outline"
              className="text-xs uppercase tracking-widest text-primary border-primary/30 bg-primary/10 font-bold"
            >
              Frequently Asked Questions
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Got Questions? We Have Answers.
            </h2>
            <p className="text-sm text-muted-foreground">
              Everything you need to know about custom stone estimation, swatches, and fabrication.
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-3">
            {FAQ_ITEMS.map((item, idx) => (
              <AccordionItem
                key={idx}
                value={`faq-${idx}`}
                className="border border-border/80 rounded-xl px-5 bg-card"
              >
                <AccordionTrigger className="text-sm font-bold text-foreground hover:no-underline py-4">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-xs text-muted-foreground leading-relaxed pb-4">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* 8. FOOTER WITH GOOGLE BUSINESS & STAFF ERP ACCESS */}
      <footer className="border-t border-border/80 pt-10 pb-16 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/95 p-1 shadow-xs border border-border/80">
                <img
                  src="/branding/stone-tech-icon.png"
                  alt="Stone Tech"
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <div className="text-sm font-black tracking-wider uppercase text-foreground">
                  STONE TECH
                </div>
                <div className="text-[10px] text-muted-foreground uppercase font-semibold tracking-widest">
                  Architectural Stone Atelier
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-muted-foreground">
              <a
                href="https://www.google.com/maps/search/?api=1&query=Stone+Tech+Marble+Granite"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground flex items-center gap-1"
              >
                <MapPin className="h-3.5 w-3.5 text-rose-500" />
                <span>Locate Showroom</span>
              </a>
              <a
                href="https://www.instagram.com/stonetech.in"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-pink-600 flex items-center gap-1"
              >
                <Camera className="h-3.5 w-3.5 text-pink-500" />
                <span>Instagram Portfolio</span>
              </a>
              <Link
                to="/auth"
                search={{ flow: "signin" }}
                className="hover:text-foreground flex items-center gap-1"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Staff & Employee ERP Portal</span>
              </Link>
            </div>
          </div>

          <div className="border-t border-border/60 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <p>
              © {new Date().getFullYear()} Stone Tech. Premium Natural Stone Fabrication, Veneers &
              Architectural Export.
            </p>
            <p className="flex items-center gap-1">
              <span>Rajasthan Quarry Operations • Worldwide Dispatch</span>
            </p>
          </div>
        </div>
      </footer>

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

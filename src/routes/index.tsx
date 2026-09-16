/**
 * Primary Landing & Customer Inquiry Portal for www.stonetech.in.
 *
 * Provides a modern, high-converting architectural stone design studio experience
 * (inspired by Livspace, tailored for custom veneers, cladding, inlays & marble).
 *
 * Features:
 * - Direct selection from Master Stone Products
 * - Space & architectural concept description
 * - Client-side compressed photo/drawing uploads (up to 10 files)
 * - WhatsApp-first sign up with international country code dropdown
 * - Live interactive calendar date picker starting strictly from current date
 * - Returning customer inquiry tracking modal
 * - Separate Staff / Employee ERP portal login and dashboard jump
 * - Google Verified Business (4.9 rating) & Showroom Maps locator
 * - Instagram portfolio link
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
  ShieldCheck,
  Star,
  ExternalLink,
  Layers,
  FileText,
  Send,
  Loader2,
  CheckCircle2,
  Info,
  Lock,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { CountryCodeSelect } from "@/components/forms/inputs/CountryCodeSelect";
import { CustomerInquiryLookupDialog } from "@/components/enquiry/CustomerInquiryLookupDialog";
import { supabase } from "@/integrations/supabase/client";
import {
  submitPublicEnquiryServerFn,
  type PublicInquiryResult,
} from "@/lib/enquiries/public-inquiry.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Stone Tech — Custom Natural Stone & Architectural Finishes" },
      {
        name: "description",
        content:
          "India's premier architectural stone atelier. Custom Stone Veneer, 3D Wall Cladding, Interlocking Panels, Waterjet Inlays & Italian Marble. Instant WhatsApp quotation.",
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
    tagline: "Flexible, ultra-thin natural stone sheets for walls, ceilings & furniture",
    popular: true,
  },
  {
    id: "custom_stone_cladding",
    name: "Custom Stone Cladding",
    tagline: "Exterior elevation facades & interior 3D textured accent walls",
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

  // Auth state for staff
  const [isAuthenticatedStaff, setIsAuthenticatedStaff] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setIsAuthenticatedStaff(true);
      }
    });
  }, []);

  // Form states
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
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-10 px-4 sm:px-6">
        <div className="mx-auto max-w-xl">
          <Card className="border-green-200/80 shadow-xl dark:border-green-900/50 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-8 text-center text-white">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-xs mb-3 shadow-inner">
                <CheckCircle2 className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Inquiry Received!</h1>
              <p className="text-emerald-100 text-sm mt-1">
                Thank you, {submittedResult.customer_name}. We have logged your stone requirement.
              </p>
            </div>

            <CardContent className="p-6 sm:p-8 space-y-6">
              <div className="rounded-xl border border-border/80 bg-muted/30 p-4 text-center space-y-1">
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  Inquiry Reference Number
                </div>
                <div className="text-2xl font-mono font-bold text-primary tracking-wide">
                  {submittedResult.enquiry_no}
                </div>
                <p className="text-xs text-muted-foreground">
                  Save this number for instant updates & quotation tracking.
                </p>
              </div>

              {/* WhatsApp instant response card */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white shrink-0 mt-0.5">
                    <Phone className="h-4 w-4 fill-current" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
                      Automated WhatsApp Update Sent to {submittedResult.whatsapp}
                    </h3>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300">
                      Our system is generating your stone estimate and swatch kit. Connect directly
                      with our lead architect on WhatsApp to receive quick pricing:
                    </p>
                  </div>
                </div>

                <Button
                  asChild
                  className="w-full bg-[#25D366] hover:bg-[#1EBE5D] text-white font-semibold gap-2 shadow-sm"
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
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="text-sm font-bold">Visit Our Stone Experience Center</span>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[11px] gap-1 border-amber-300 text-amber-800 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300"
                  >
                    <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> 4.9 on Google
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Explore over 200+ curated live slabs, 3D wall claddings, and stone veneer
                  installations.
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
                className="w-full text-xs text-muted-foreground"
              >
                Submit Another Inquiry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // MAIN INQUIRY FORM VIEW
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100/40 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-foreground pb-16">
      {/* 1. HERO & BRANDING SECTION */}
      <header className="border-b border-border/80 bg-background/95 backdrop-blur-md sticky top-0 z-30 shadow-2xs">
        <div className="mx-auto max-w-4xl px-4 py-2.5 sm:px-6 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black text-lg shadow-xs">
              ST
            </div>
            <div>
              <div className="text-base font-black tracking-wider uppercase text-foreground">
                STONE TECH
              </div>
              <div className="text-[10px] text-muted-foreground uppercase font-semibold tracking-widest">
                Architectural Stone Atelier
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Customer Tracking Dialog */}
            <CustomerInquiryLookupDialog />

            {/* Staff / Employee Login Button or ERP Jump */}
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
                <Link to="/auth">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="hidden sm:inline">Staff</span> Login
                </Link>
              </Button>
            )}

            <Button
              asChild
              variant="default"
              size="sm"
              className="gap-1.5 text-xs h-8 bg-[#25D366] hover:bg-[#1EBE5D] text-white border-0 font-semibold"
            >
              <a
                href="https://api.whatsapp.com/send?phone=919829000000&text=Hi%20Stone%20Tech%20Team,%20I%20have%20an%20inquiry%20for%20stone%20requirements"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Phone className="h-3 w-3 fill-current" />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pt-6 sm:px-6 space-y-6">
        {/* HERO BANNER & TAGLINE */}
        <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-900 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl space-y-3">
            <Badge className="bg-blue-500/20 text-blue-200 border-blue-400/30 text-xs font-semibold px-2.5 py-0.5">
              Direct from Quarry & Craft Workshop • Pan-India Delivery
            </Badge>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              Custom Natural Stone & Architectural Finishes
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Share your project plans, sketches, or site photos. Select from Stone Veneer, Custom
              Cladding, Floor Inlays & get an instant automated quote on WhatsApp.
            </p>
          </div>
        </div>

        {/* 2. SOCIAL PROOF & GOOGLE LOCATION CARD */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Instagram Portfolio Card */}
          <a
            href="https://www.instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3.5 rounded-xl border border-pink-200/80 bg-gradient-to-r from-pink-50/50 via-rose-50/30 to-amber-50/30 hover:border-pink-300 dark:border-pink-900/40 dark:from-pink-950/20 dark:to-slate-900 transition-all shadow-2xs group"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white shadow-xs">
                <Camera className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-foreground group-hover:text-pink-600 dark:group-hover:text-pink-400 flex items-center gap-1">
                  <span>Our Instagram Gallery</span>
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Browse 500+ executed villa & commercial projects
                </div>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground/60 group-hover:translate-x-1 group-hover:text-pink-600 transition-transform" />
          </a>

          {/* Google for Business Glimpse & Direct Maps Route */}
          <a
            href="https://www.google.com/maps/search/?api=1&query=Stone+Tech+Marble+Granite"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3.5 rounded-xl border border-blue-200/80 bg-gradient-to-r from-blue-50/50 via-sky-50/30 to-slate-50 hover:border-blue-300 dark:border-blue-900/40 dark:from-blue-950/20 dark:to-slate-900 transition-all shadow-2xs group"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-border shadow-xs text-blue-600 font-black text-base">
                G
              </div>
              <div>
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span>Google Verified Business</span>
                  <span className="inline-flex items-center text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.2 rounded">
                    ⭐ 4.9 / 5.0
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-rose-500" />
                  <span>Tap to locate showroom & get directions</span>
                </div>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground/60 group-hover:translate-x-1 group-hover:text-blue-600 transition-transform" />
          </a>
        </div>

        {/* 3. INQUIRY FORM */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION A: PRODUCT SELECTION (FROM MASTER) */}
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-xs space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  1
                </span>
                <h2 className="text-base sm:text-lg font-bold">Select Products of Interest</h2>
              </div>
              <p className="text-xs text-muted-foreground pl-8">
                Choose one or more natural stone products registered in our workshop master.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {MASTER_PRODUCT_OPTIONS.map((prod) => {
                const isSelected = selectedProducts.includes(prod.name);
                return (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => toggleProduct(prod.name)}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
                        : "border-border hover:border-border/80 hover:bg-muted/40"
                    }`}
                  >
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border mt-0.5 transition-colors ${
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/40 bg-background"
                      }`}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </div>
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-sm font-semibold ${isSelected ? "text-primary" : "text-foreground"}`}
                        >
                          {prod.name}
                        </span>
                        {prod.popular && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300"
                          >
                            Popular
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-tight line-clamp-2">
                        {prod.tagline}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION B: PLAN DESCRIPTION & SPACE TYPE */}
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-xs space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  2
                </span>
                <h2 className="text-base sm:text-lg font-bold">Describe Your Plan & Space</h2>
              </div>
              <p className="text-xs text-muted-foreground pl-8">
                Tell us about your space type, wall dimensions, design concepts, or requirements.
              </p>
            </div>

            {/* Space Type Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Type of Project / Space:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {SPACE_TYPES.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSpaceType(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      spaceType === st
                        ? "border-primary bg-primary text-primary-foreground shadow-2xs"
                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Plan Description Textarea */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Plan Details or Dimensions (Optional):
                </label>
              </div>
              <Textarea
                value={planDescription}
                onChange={(e) => setPlanDescription(e.target.value)}
                placeholder="E.g., Living room TV accent wall (12 ft width x 10 ft height), exterior elevation facade cladding in slate grey, or foyer floor medallion requirement..."
                rows={3}
                className="text-sm resize-none"
              />

              {/* Idea suggestion pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-500" /> Quick tags:
                </span>
                {QUICK_IDEA_SUGGESTIONS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => appendIdea(tag)}
                    className="text-[11px] rounded-full border border-border/80 px-2.5 py-0.5 bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION C: UPLOAD UP TO 10 PHOTOS OR DRAWINGS */}
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    3
                  </span>
                  <h2 className="text-base sm:text-lg font-bold">
                    Upload Photos or Drawings (Up to 10)
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground pl-8">
                  Upload site photos, drawings, CAD layouts, architectural references, or design
                  inspirations.
                </p>
              </div>

              <Badge
                variant="outline"
                className={`text-xs font-mono font-bold ${
                  photos.length >= 10
                    ? "border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                    : "border-blue-200 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                }`}
              >
                {photos.length} / 10 photos
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

            {/* Upload Drag/Click Zone */}
            {photos.length < 10 && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl border-2 border-dashed border-primary/30 hover:border-primary/60 bg-muted/20 hover:bg-muted/40 p-6 text-center cursor-pointer transition-all space-y-2"
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {isProcessingPhotos ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Upload className="h-6 w-6" />
                  )}
                </div>
                <div className="space-y-0.5">
                  <div className="text-sm font-semibold text-foreground">
                    {isProcessingPhotos
                      ? "Compressing and preparing photos..."
                      : "Tap to select photos or drag & drop here"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Supports JPG, PNG, WebP, HEIC & PDF drawings (up to 10 files)
                  </p>
                </div>
              </div>
            )}

            {/* Rendered Uploaded Photo Thumbnails */}
            {photos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-2">
                {photos.map((photo, index) => (
                  <div
                    key={index}
                    className="relative group rounded-lg border border-border overflow-hidden bg-background aspect-square shadow-2xs flex flex-col justify-end"
                  >
                    <img
                      src={photo.previewUrl}
                      alt={photo.name}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePhoto(index);
                      }}
                      className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/70 hover:bg-destructive text-white flex items-center justify-center transition-colors shadow-xs"
                      aria-label="Remove photo"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="relative p-1.5 text-[10px] text-white truncate font-medium">
                      {photo.name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION D: CUSTOMER DETAILS & CALENDAR REQUIRED DATE */}
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-xs space-y-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  4
                </span>
                <h2 className="text-base sm:text-lg font-bold">
                  Your WhatsApp Number & Project Timeline
                </h2>
              </div>
              <p className="text-xs text-muted-foreground pl-8">
                Your quotation, catalogue photos, and dimensions will be delivered directly to your
                WhatsApp.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <User className="h-3.5 w-3.5" /> Your Full Name{" "}
                  <span className="text-destructive">*</span>
                </label>
                <Input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rajesh Sharma"
                  className="h-10 text-sm"
                />
              </div>

              {/* WhatsApp Number with Country Code Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 fill-current" /> Enter WhatsApp Number:{" "}
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
                    className="h-10 text-sm font-medium rounded-l-none border-l-0 border-emerald-300 focus-visible:ring-emerald-500 dark:border-emerald-800"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Quotes & stone swatches will be sent directly to this WhatsApp number.
                </p>
              </div>

              {/* City / Location */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> Site City / Location{" "}
                  <span className="text-destructive">*</span>
                </label>
                <Input
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Jaipur, Delhi, Mumbai, Dubai, Singapore"
                  className="h-10 text-sm"
                />
              </div>

              {/* Email (Optional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Email Address (Optional)
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rajesh@example.com"
                  className="h-10 text-sm"
                />
              </div>
            </div>

            {/* LIVE CALENDAR: REQUIRED BY DATE */}
            <div className="space-y-2.5 pt-2 border-t border-border/80">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                  <span>When do you need this completed / delivered?</span>
                  <span className="text-destructive">*</span>
                </label>
                <span className="text-xs text-muted-foreground">Pick date from calendar</span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <Input
                    required
                    type="date"
                    min={todayStr}
                    value={requiredDate}
                    onChange={(e) => setRequiredDate(e.target.value)}
                    className="h-11 text-sm font-medium pr-10 cursor-pointer"
                  />
                  <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>

                {/* Quick Timeline Chips */}
                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setQuickDays(7)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-border hover:border-primary hover:bg-primary/5 text-muted-foreground hover:text-primary transition-colors"
                  >
                    1 Week
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDays(15)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-primary/40 bg-primary/10 text-primary font-semibold hover:bg-primary/20 transition-colors"
                  >
                    15 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDays(30)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-border hover:border-primary hover:bg-primary/5 text-muted-foreground hover:text-primary transition-colors"
                  >
                    1 Month
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDays(60)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-border hover:border-primary hover:bg-primary/5 text-muted-foreground hover:text-primary transition-colors"
                  >
                    2 Months
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3 shrink-0" />
                Calendar starts from today. Selecting a date helps our workshop schedule raw block
                cutting and dry lay.
              </p>
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="pt-2">
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting || isProcessingPhotos}
              className="w-full h-14 text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-2.5 shadow-lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Submitting your inquiry & photos...</span>
                </>
              ) : (
                <>
                  <span>Submit Inquiry & Request Quote</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground mt-2.5 flex items-center justify-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Zero-spam guarantee. Direct factory pricing sent to your WhatsApp.</span>
            </p>
          </div>
        </form>
      </main>

      {/* FOOTER WITH GOOGLE BUSINESS & STAFF ERP ACCESS */}
      <footer className="mt-16 border-t border-border/70 pt-8 pb-12 bg-muted/20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center space-y-4 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center justify-center gap-4 font-bold text-foreground">
            <span>Stone Tech OS</span>
            <span>•</span>
            <a
              href="https://www.google.com/maps/search/?api=1&query=Stone+Tech+Marble+Granite"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline flex items-center gap-1"
            >
              <MapPin className="h-3 w-3" />
              <span>Locate Showroom on Google Maps</span>
            </a>
            <span>•</span>
            <a
              href="https://www.instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-pink-600 hover:underline flex items-center gap-1"
            >
              <Camera className="h-3 w-3" />
              <span>Instagram Gallery</span>
            </a>
            <span>•</span>
            <Link
              to="/auth"
              className="text-muted-foreground hover:text-foreground hover:underline flex items-center gap-1"
            >
              <Lock className="h-3 w-3" />
              <span>Staff & Employee ERP Portal</span>
            </Link>
          </div>
          <p>
            © {new Date().getFullYear()} Stone Tech. Premium Natural Stone Fabrication, Veneers &
            Architectural Export.
          </p>
        </div>
      </footer>
    </div>
  );
}

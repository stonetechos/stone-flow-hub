import { useState, useRef, useMemo, type FormEvent, type ChangeEvent } from "react";
import {
  Sparkles,
  Upload,
  X,
  Check,
  Calendar as CalendarIcon,
  Phone,
  User,
  MapPin,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Star,
  ExternalLink,
  Send,
  Loader2,
  CheckCircle2,
  Compass,
  Truck,
  Wrench,
  Camera,
  FileUp,
  Calculator,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CountryCodeSelect } from "@/components/forms/inputs/CountryCodeSelect";
import { wallSqft, type LengthUnit } from "@/lib/quotes/estimateCatalog";
import {
  submitPublicEnquiryServerFn,
  type PublicInquiryResult,
} from "@/lib/enquiries/public-inquiry.functions";
import { useSiteSettingsValue } from "@/lib/site-settings/use-site-settings";
import { useWebsiteContent } from "@/lib/cms/landing-content-store";
import { useTranslation } from "react-i18next";
import { toIndicDigits } from "@/lib/format";
import {
  getLandingTexts,
  getLocalizedProducts,
  getLocalizedSpaceTypes,
  getLocalizedCustomerRoles,
  getLocalizedQuickIdeas,
  getProductNameInLang,
} from "@/lib/i18n/landing-i18n";

export const CUSTOMER_ROLES = [
  { label: "Owner / Homeowner", value: "Owner / Homeowner", type: "individual" },
  { label: "Architect", value: "Architect", type: "architect" },
  { label: "Interior Designer", value: "Interior Designer", type: "interior_designer" },
  { label: "Contractor / Builder", value: "Contractor / Builder", type: "contractor" },
  { label: "Other", value: "Other", type: "other" },
];

export interface ProductOption {
  id: string;
  name: string;
  tagline: string;
  popular?: boolean;
}

export const MASTER_PRODUCT_OPTIONS: ProductOption[] = [
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

export const SPACE_TYPES = [
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

export const QUICK_IDEA_SUGGESTIONS = [
  "Living Room TV Accent Wall",
  "Exterior Elevation Facade",
  "Foyer Inlay Flooring",
  "Temple / Mandir Carving",
  "Bathroom Wall Cladding",
  "Dining Table Top",
  "Balcony Feature Wall",
];

export async function compressImage(
  file: File,
  maxDimension = 1600,
  quality = 0.8,
): Promise<string> {
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

export { matchMasterProduct } from "@/lib/quotes/matchMasterProduct";

export interface RequestEstimateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProducts: string[];
  setSelectedProducts: React.Dispatch<React.SetStateAction<string[]>>;
  prepaymentDiscountSelected: boolean;
  setPrepaymentDiscountSelected: React.Dispatch<React.SetStateAction<boolean>>;
  planDescription: string;
  setPlanDescription: React.Dispatch<React.SetStateAction<string>>;
}

export function RequestEstimateDialog({
  open,
  onOpenChange,
  selectedProducts,
  setSelectedProducts,
  prepaymentDiscountSelected,
  setPrepaymentDiscountSelected,
  planDescription,
  setPlanDescription,
}: RequestEstimateDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wallPhotoInputRef = useRef<HTMLInputElement>(null);
  const cadFileInputRef = useRef<HTMLInputElement>(null);

  const siteSettings = useSiteSettingsValue();
  const { content: cmsContent } = useWebsiteContent();
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

  // Form states
  const [formStep, setFormStep] = useState<1 | 2>(1);
  const [spaceType, setSpaceType] = useState<string>("");
  const [serviceScope, setServiceScope] = useState<"supply_and_installation" | "supply_only">(
    "supply_and_installation",
  );
  const [dimLength, setDimLength] = useState<string>("");
  const [dimHeight, setDimHeight] = useState<string>("");
  const [dimUnit, setDimUnit] = useState<LengthUnit>("ft");

  const calculatedSqft = useMemo(() => {
    const l = parseFloat(dimLength);
    const h = parseFloat(dimHeight);
    if (!isNaN(l) && !isNaN(h) && l > 0 && h > 0) {
      return wallSqft(h, l, dimUnit);
    }
    return null;
  }, [dimLength, dimHeight, dimUnit]);

  // Customer contact states
  const [customerRole, setCustomerRole] = useState<string>("Owner / Homeowner");
  const [name, setName] = useState<string>("");
  const [countryCode, setCountryCode] = useState<string>("+91");
  const [whatsapp, setWhatsapp] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [city, setCity] = useState<string>("");

  // Validation & Error states
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Date starting from today
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [requiredDate, setRequiredDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split("T")[0];
  });

  // Photo uploads
  const [photos, setPhotos] = useState<
    Array<{
      name: string;
      dataUrl: string;
      size: number;
      previewUrl: string;
      tag: "wall_photo" | "drawing" | "general";
    }>
  >([]);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<PublicInquiryResult | null>(null);

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

  const toggleProduct = (productName: string) => {
    clearError("selectedProducts");
    setSelectedProducts((prev) =>
      prev.includes(productName) ? prev.filter((p) => p !== productName) : [...prev, productName],
    );
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

  // Primary contact phone cleaned for WhatsApp links
  const primaryPhoneClean = useMemo(() => {
    const raw = cmsContent.contactPhone1 || "917742090866";
    const cleaned = raw.replace(/[^0-9]/g, "");
    return cleaned.startsWith("91") || cleaned.length > 10 ? cleaned : `91${cleaned}`;
  }, [cmsContent.contactPhone1]);

  // Fallback WhatsApp link
  const fallbackWhatsappUrl = useMemo(() => {
    const prods = selectedProducts.length > 0 ? selectedProducts.join(", ") : "Architectural Stone";
    const scopePart =
      serviceScope === "supply_only"
        ? "Supply Only (Material Delivery)"
        : "Supply + Installation (Turnkey)";
    const wallPhotosCount = photos.filter((p) => p.tag === "wall_photo").length;
    const discountLine = prepaymentDiscountSelected
      ? `*Prepayment Privilege:* 100% Advance Payment (5% Discount + Free Certified Shree Yantra worth ₹14,999 on stone product orders > ₹1L*)\n`
      : "";
    const dimLine = calculatedSqft
      ? `*Dimensions:* ${dimLength} × ${dimHeight} ${dimUnit} (~${calculatedSqft.toFixed(2)} sq.ft)\n`
      : "";
    const text = encodeURIComponent(
      `Hello Stone Tech Team! I would like to request an estimate for:\n\n` +
        `*Name:* ${name || "Client"}\n` +
        `*WhatsApp:* ${whatsapp || "Not specified"}\n` +
        `*Service Scope:* ${scopePart}\n` +
        `*Products:* ${prods}\n` +
        `*Space:* ${spaceType}\n` +
        dimLine +
        `*City:* ${city || "Not specified"}\n` +
        `*Required by:* ${requiredDate}\n` +
        (wallPhotosCount > 0 ? `*Wall Pictures:* ${wallPhotosCount} attached\n` : "") +
        discountLine +
        (planDescription ? `*Details:* ${planDescription}\n` : ""),
    );
    return `https://api.whatsapp.com/send?phone=${primaryPhoneClean}&text=${text}`;
  }, [
    name,
    whatsapp,
    serviceScope,
    photos,
    selectedProducts,
    spaceType,
    city,
    requiredDate,
    planDescription,
    dimLength,
    dimHeight,
    dimUnit,
    calculatedSqft,
    primaryPhoneClean,
    prepaymentDiscountSelected,
  ]);

  const handlePhotoUpload = async (
    e: ChangeEvent<HTMLInputElement>,
    tag: "wall_photo" | "drawing" | "general" = "general",
  ) => {
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
        tag: "wall_photo" | "drawing" | "general";
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
            tag,
          });
        } catch {
          toast.error(`Could not process ${file.name}`);
        }
      }

      setPhotos((prev) => [...prev, ...processed]);
      if (processed.length > 0) {
        toast.success(
          tag === "wall_photo"
            ? `Added ${processed.length} picture(s) of the walls.`
            : `Added ${processed.length} file(s).`,
        );
      }
    } finally {
      setIsProcessingPhotos(false);
      if (e.target) e.target.value = "";
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
    if (cleanDigits.length < 6) {
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
      const dimLine = calculatedSqft
        ? `[Dimensions: ${dimLength} × ${dimHeight} ${dimUnit} (~${calculatedSqft.toFixed(2)} sq.ft)]`
        : "";
      const baseDesc = [dimLine, planDescription.trim()].filter(Boolean).join("\n");
      const finalPlanDescription = prepaymentDiscountSelected
        ? `${baseDesc}\n[Prepayment Privilege: 100% advance payment for 5% discount + Certified Shree Yantra worth ₹14,999 on stone product orders > ₹1L*]`.trim()
        : baseDesc;

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
          service_scope: serviceScope,
          required_date: requiredDate,
          selected_products: selectedProducts,
          plan_description: finalPlanDescription,
          photos: photos.map((p) => ({
            name: p.name,
            dataUrl: p.dataUrl,
            size: p.size,
            tag: p.tag,
          })),
        },
      });

      setSubmittedResult(result);
      toast.success(texts.errors.inquirySuccessToast);
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

  const handleReset = () => {
    setSubmittedResult(null);
    setPhotos([]);
    setPlanDescription("");
    setFormStep(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        noAutoScroll
        className="w-[calc(100vw-1rem)] max-w-2xl lg:max-w-3xl p-0 overflow-hidden rounded-2xl border-border/90 shadow-2xl bg-card"
      >
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-[#012b3c] text-white px-5 py-4 border-b border-primary/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#006788] text-white shadow-xs">
              <Calculator className="h-4.5 w-4.5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
                {texts.form.title}
              </DialogTitle>
              <p className="text-[11px] text-[#67e8f9] font-medium leading-none mt-0.5">
                {prepaymentDiscountSelected
                  ? "✓ 5% Advance Prepayment Discount + Free Shree Yantra Unlocked"
                  : "Authentic Stone Fabrication & Turnkey Installation Quotation"}
              </p>
            </div>
          </div>
        </div>

        {/* If submitted, show full success confirmation inside dialog */}
        {submittedResult ? (
          <div className="overflow-y-auto max-h-[calc(88dvh-80px)] p-5 sm:p-6 space-y-5">
            <div className="rounded-2xl bg-gradient-to-r from-[#015474] via-[#006788] to-[#015474] p-6 text-center text-white shadow-md">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-xs mb-3 shadow-inner">
                <CheckCircle2 className="h-9 w-9 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                {texts.success.title}
              </h2>
              <p className="text-[#e0f1f5] text-xs sm:text-sm mt-1">
                {texts.success.thankYou.replace("{{name}}", submittedResult.customer_name)}
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-muted/30 p-4 text-center space-y-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                {texts.success.refNumber}
              </div>
              <div className="text-2xl sm:text-3xl font-mono font-bold text-primary tracking-wide">
                {submittedResult.enquiry_no}
              </div>
              <p className="text-xs text-muted-foreground">{texts.success.refNote}</p>
            </div>

            {prepaymentDiscountSelected && (
              <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/40 p-3.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="text-xs font-bold text-amber-950 dark:text-amber-200">
                    Prepayment Privilege Locked: 5% OFF + Free Shree Yantra (Orders &gt; ₹1L)*
                  </span>
                </div>
                <Badge className="bg-[#006788] text-white font-bold text-[10px]">
                  PRIVILEGE LOCKED
                </Badge>
              </div>
            )}

            {/* WhatsApp instant response card */}
            <div className="rounded-xl border border-[#c9d1d4] bg-[#e0f1f5]/60 p-4 dark:border-[#00597b] dark:bg-[#015474]/20 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#006788] text-white shrink-0 shadow-xs">
                  <Phone className="h-5 w-5 fill-current" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#015474] dark:text-[#67e8f9]">
                    {texts.success.whatsappSent.replace("{{phone}}", submittedResult.whatsapp)}
                  </h3>
                  <p className="text-xs text-[#015474]/80 dark:text-[#67e8f9]/80 leading-relaxed">
                    {texts.success.whatsappDesc}
                  </p>
                </div>
              </div>

              <Button
                asChild
                className="w-full bg-[#006788] hover:bg-[#00597b] text-white font-bold gap-2 shadow-sm h-11 cursor-pointer"
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
                  {texts.success.onGoogle.replace("{{rating}}", String(siteSettings.google_rating))}
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

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 text-xs font-semibold cursor-pointer"
              >
                Close
              </Button>
              <Button
                variant="ghost"
                onClick={handleReset}
                className="flex-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {texts.success.submitAnother}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Step Progress Continuation Bar (1/2 and 2/2) */}
            <div className="border-b border-border/60 bg-slate-900/95 px-4 sm:px-6 py-2.5 text-xs shrink-0">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setFormStep(1)}
                  className={cn(
                    "flex items-center gap-1.5 font-bold transition-colors min-w-0 cursor-pointer py-0.5",
                    formStep === 1
                      ? "text-[#67e8f9] font-extrabold"
                      : "text-slate-400 hover:text-slate-200",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-4.5 w-4.5 items-center justify-center rounded-full text-[10px] font-bold shrink-0 transition-colors",
                      formStep === 1
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "border border-slate-700 bg-slate-800 text-slate-400",
                    )}
                  >
                    1
                  </span>
                  <span className="hidden sm:inline">{texts.form.step1}</span>
                  <span className="sm:hidden text-[11px] truncate">{texts.form.step1Short}</span>
                  {selectedProducts.length > 0 && (
                    <span className="ml-1 rounded-full bg-[#006788]/40 text-[#67e8f9] text-[10px] px-1.5 py-0.2 font-mono">
                      {selectedProducts.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setFormStep(2)}
                  className={cn(
                    "flex items-center gap-1.5 font-bold transition-colors min-w-0 cursor-pointer py-0.5",
                    formStep === 2
                      ? "text-[#67e8f9] font-extrabold"
                      : "text-slate-400 hover:text-slate-200",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-4.5 w-4.5 items-center justify-center rounded-full text-[10px] font-bold shrink-0 transition-colors",
                      formStep === 2
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "border border-slate-700 bg-slate-800 text-slate-400",
                    )}
                  >
                    2
                  </span>
                  <span className="hidden sm:inline">{texts.form.step2}</span>
                  <span className="sm:hidden text-[11px] truncate">{texts.form.step2Short}</span>
                </button>
              </div>

              {/* Visual Progress Bar Track */}
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-[#015474] via-[#006788] to-[#38bdf8] transition-all duration-300 ease-out"
                  style={{ width: formStep === 1 ? "50%" : "100%" }}
                />
              </div>
            </div>

            {/* Scrollable Form Body */}
            <div className="overflow-y-auto max-h-[calc(85dvh-120px)] p-4 sm:p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* PART 1/2: PRODUCTS, SPACE & PHOTO UPLOADS */}
                {formStep === 1 && (
                  <div className="space-y-4 animate-in fade-in-50 duration-200">
                    {/* STEP 1: PRODUCT SELECTION */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10.5px] font-bold">
                            1
                          </span>
                          <span>
                            {texts.form.selectProducts} <span className="text-destructive">*</span>:
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
                                ? "bg-[#006788] text-white"
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

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2 max-h-48 overflow-y-auto pr-1">
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
                                "p-2 sm:p-2.5 rounded-xl border text-left transition-all text-xs flex items-center justify-between gap-1.5 cursor-pointer select-none active:scale-[0.98]",
                                isSelected
                                  ? "border-[#006788] dark:border-[#38bdf8] bg-[#e0f1f5] dark:bg-[#015474]/60 text-[#015474] dark:text-[#e0f1f5] font-bold ring-2 ring-[#006788]/40 shadow-xs"
                                  : "border-stone-200 dark:border-stone-800 bg-background hover:bg-muted/70 text-stone-700 dark:text-stone-300 hover:text-foreground",
                              )}
                            >
                              <span className="leading-snug line-clamp-2">{prod.name}</span>
                              {isSelected ? (
                                <div className="h-4 w-4 rounded bg-[#006788] text-white flex items-center justify-center shrink-0 shadow-2xs">
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
                    <div className="space-y-2 pt-2 border-t border-border/80">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10.5px] font-bold">
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
                        <p className="text-[11px] text-destructive font-medium mt-0.5">
                          {formErrors.spaceType}
                        </p>
                      )}

                      {/* Dimensions & Length Unit Selector (ft / in / mm / m) */}
                      <div className="rounded-xl border border-border/80 bg-muted/20 p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                            <Compass className="h-3.5 w-3.5 text-primary" />
                            <span>
                              {currentLang === "hi"
                                ? "सतह आयाम (लंबाई × ऊंचाई)"
                                : currentLang === "gu"
                                  ? "સપાટી પરિમાણો (લંબાઈ × ઊંચાઈ)"
                                  : "Surface Dimensions (Length × Height)"}
                            </span>
                          </span>
                          {calculatedSqft !== null && (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-bold font-mono px-2 py-0.2 border-primary/40 text-primary bg-primary/5"
                            >
                              ≈ {toIndicDigits(calculatedSqft.toFixed(2), currentLang)}{" "}
                              {currentLang === "hi"
                                ? "वर्गफ़ुट"
                                : currentLang === "gu"
                                  ? "ચો.ફૂટ"
                                  : "sq.ft"}
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] font-medium text-muted-foreground block mb-0.5">
                              {currentLang === "hi"
                                ? "लंबाई"
                                : currentLang === "gu"
                                  ? "લંબાઈ"
                                  : "Length"}
                            </label>
                            <Input
                              type="number"
                              step="any"
                              placeholder="e.g. 12"
                              value={dimLength}
                              onChange={(e) => setDimLength(e.target.value)}
                              className="h-8 text-xs bg-background"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-medium text-muted-foreground block mb-0.5">
                              {currentLang === "hi"
                                ? "ऊंचाई / चौड़ाई"
                                : currentLang === "gu"
                                  ? "ઊંચાઈ / પહોળાઈ"
                                  : "Height / Width"}
                            </label>
                            <Input
                              type="number"
                              step="any"
                              placeholder="e.g. 10"
                              value={dimHeight}
                              onChange={(e) => setDimHeight(e.target.value)}
                              className="h-8 text-xs bg-background"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-medium text-muted-foreground block mb-0.5">
                              {currentLang === "hi"
                                ? "इकाई"
                                : currentLang === "gu"
                                  ? "એકમ"
                                  : "Unit"}
                            </label>
                            <select
                              value={dimUnit}
                              onChange={(e) => setDimUnit(e.target.value as LengthUnit)}
                              className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                              <option value="ft">
                                {currentLang === "hi"
                                  ? "फ़ीट (ft)"
                                  : currentLang === "gu"
                                    ? "ફૂટ (ft)"
                                    : "ft (Feet)"}
                              </option>
                              <option value="in">
                                {currentLang === "hi"
                                  ? "इंच (in)"
                                  : currentLang === "gu"
                                    ? "ઇંચ (in)"
                                    : "in (Inches)"}
                              </option>
                              <option value="mm">
                                {currentLang === "hi"
                                  ? "मिमी (mm)"
                                  : currentLang === "gu"
                                    ? "મિમી (mm)"
                                    : "mm (Millimeters)"}
                              </option>
                              <option value="m">
                                {currentLang === "hi"
                                  ? "मीटर (m)"
                                  : currentLang === "gu"
                                    ? "મીટર (m)"
                                    : "m (Meters)"}
                              </option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Description & Quick Idea Suggestions */}
                      <div className="space-y-1.5">
                        <Textarea
                          value={planDescription}
                          onChange={(e) => setPlanDescription(e.target.value)}
                          placeholder={texts.form.descPlaceholder}
                          rows={2}
                          className="text-xs resize-none bg-background min-h-[50px] py-1.5"
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

                    {/* STEP 3: SERVICE REQUIREMENT */}
                    <div className="space-y-2 pt-2 border-t border-border/80">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10.5px] font-bold">
                            3
                          </span>
                          <span>
                            {texts.form.serviceScope} <span className="text-destructive">*</span>:
                          </span>
                        </label>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-bold px-1.5 py-0 border-[#c9d1d4] text-[#015474] dark:text-[#67e8f9] bg-[#e0f1f5] dark:bg-[#015474]/40"
                        >
                          {serviceScope === "supply_and_installation"
                            ? currentLang === "hi"
                              ? "टर्नकी निष्पादन"
                              : currentLang === "gu"
                                ? "ટર્નકી અમલીકરણ"
                                : "Turnkey Execution"
                            : currentLang === "hi"
                              ? "सामग्री वितरण"
                              : currentLang === "gu"
                                ? "સામગ્રી ડિલિવરી"
                                : "Material Delivery"}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {/* Option 1: Supply Only */}
                        <button
                          type="button"
                          onClick={() => setServiceScope("supply_only")}
                          className={cn(
                            "p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 select-none",
                            serviceScope === "supply_only"
                              ? "border-[#006788] dark:border-[#38bdf8] bg-[#e0f1f5]/80 dark:bg-[#015474]/60 ring-2 ring-[#006788]/40 shadow-2xs"
                              : "border-border bg-background hover:bg-muted/60 text-muted-foreground",
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                              <Truck className="h-3.5 w-3.5 text-[#006788] dark:text-[#38bdf8] shrink-0" />
                              <span>{texts.form.supplyOnly}</span>
                            </span>
                            {serviceScope === "supply_only" ? (
                              <div className="h-4 w-4 rounded bg-[#006788] text-white flex items-center justify-center shrink-0">
                                <Check className="h-3 w-3 stroke-[3]" />
                              </div>
                            ) : (
                              <div className="h-4 w-4 rounded border-2 border-stone-300 dark:border-stone-600 shrink-0" />
                            )}
                          </div>
                          <p className="text-[10.5px] text-muted-foreground leading-tight">
                            {texts.form.supplyOnlyDesc}
                          </p>
                        </button>

                        {/* Option 2: Supply + Installation */}
                        <button
                          type="button"
                          onClick={() => setServiceScope("supply_and_installation")}
                          className={cn(
                            "p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 select-none",
                            serviceScope === "supply_and_installation"
                              ? "border-[#006788] dark:border-[#38bdf8] bg-[#e0f1f5]/80 dark:bg-[#015474]/60 ring-2 ring-[#006788]/40 shadow-2xs"
                              : "border-border bg-background hover:bg-muted/60 text-muted-foreground",
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                              <Wrench className="h-3.5 w-3.5 text-[#006788] dark:text-[#38bdf8] shrink-0" />
                              <span>{texts.form.supplyAndInstallation}</span>
                            </span>
                            {serviceScope === "supply_and_installation" ? (
                              <div className="h-4 w-4 rounded bg-[#006788] text-white flex items-center justify-center shrink-0">
                                <Check className="h-3 w-3 stroke-[3]" />
                              </div>
                            ) : (
                              <div className="h-4 w-4 rounded border-2 border-stone-300 dark:border-stone-600 shrink-0" />
                            )}
                          </div>
                          <p className="text-[10.5px] text-muted-foreground leading-tight">
                            {texts.form.supplyAndInstallationDesc}
                          </p>
                        </button>
                      </div>
                    </div>

                    {/* STEP 4: PICTURES OF THE WALLS & CAD UPLOADER */}
                    <div className="space-y-2 pt-2 border-t border-border/80">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10.5px] font-bold">
                            4
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

                      {/* Hidden File Inputs */}
                      <input
                        ref={wallPhotoInputRef}
                        type="file"
                        multiple
                        accept="image/*,application/pdf"
                        onChange={(e) => handlePhotoUpload(e, "wall_photo")}
                        className="hidden"
                      />
                      <input
                        ref={cadFileInputRef}
                        type="file"
                        multiple
                        accept="image/*,application/pdf"
                        onChange={(e) => handlePhotoUpload(e, "drawing")}
                        className="hidden"
                      />
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*,application/pdf"
                        onChange={(e) => handlePhotoUpload(e, "general")}
                        className="hidden"
                      />

                      {photos.length < 10 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {/* Dedicated Wall Pictures Upload Trigger */}
                          <div
                            onClick={() => wallPhotoInputRef.current?.click()}
                            className="rounded-xl border-2 border-dashed border-[#006788]/50 hover:border-[#006788] bg-[#e0f1f5]/40 hover:bg-[#e0f1f5]/80 dark:bg-[#015474]/20 dark:hover:bg-[#015474]/40 p-2.5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1 text-xs text-[#015474] dark:text-[#e0f1f5]"
                          >
                            <div className="flex items-center gap-1.5 font-bold">
                              {isProcessingPhotos ? (
                                <Loader2 className="h-4 w-4 animate-spin text-[#006788] dark:text-[#38bdf8]" />
                              ) : (
                                <Camera className="h-4 w-4 text-[#006788] dark:text-[#38bdf8]" />
                              )}
                              <span>{texts.form.uploadWallPhotos}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground leading-tight">
                              {currentLang === "hi"
                                ? "लिविंग रूम, बाहरी एलिवेशन या फीचर दीवारें"
                                : currentLang === "gu"
                                  ? "લિવિંગ રૂમ, બાહ્ય એલિવેશન અથવા ફીચર દિવાલો"
                                  : "Living room, exterior elevation or feature walls"}
                            </span>
                          </div>

                          {/* Architectural Plan / CAD / PDF Upload Trigger */}
                          <div
                            onClick={() => cadFileInputRef.current?.click()}
                            className="rounded-xl border border-dashed border-primary/40 hover:border-primary bg-background/60 hover:bg-muted/40 p-2.5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <div className="flex items-center gap-1.5 font-semibold">
                              {isProcessingPhotos ? (
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                              ) : (
                                <FileUp className="h-4 w-4 text-primary" />
                              )}
                              <span>{texts.form.uploadCad}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground leading-tight">
                              {currentLang === "hi"
                                ? "वास्तुशिल्पीय एलिवेशन या सीएडी ड्राइंग"
                                : currentLang === "gu"
                                  ? "વાસ્તુશિલ્પીય એલિવેશન અથવા સીએડી ડ્રોઇંગ"
                                  : "Architectural elevation or CAD drawing"}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Photo Thumbnail Gallery */}
                      {photos.length > 0 && (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
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
                              <div className="absolute bottom-1 left-1 right-1">
                                <Badge
                                  className={cn(
                                    "text-[9px] px-1 py-0 font-medium truncate w-full text-center block",
                                    photo.tag === "wall_photo"
                                      ? "bg-[#015474] text-white"
                                      : photo.tag === "drawing"
                                        ? "bg-[#006788] text-white"
                                        : "bg-slate-800/90 text-white",
                                  )}
                                >
                                  {photo.tag === "wall_photo"
                                    ? `📸 ${texts.form.wallPhotoTag}`
                                    : photo.tag === "drawing"
                                      ? `📐 ${texts.form.drawingTag}`
                                      : "Attachment"}
                                </Badge>
                              </div>
                              <button
                                type="button"
                                onClick={() => removePhoto(index)}
                                className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/80 hover:bg-destructive text-white flex items-center justify-center transition-colors cursor-pointer"
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
                        className="w-full h-11 text-xs sm:text-sm font-bold bg-[#006788] hover:bg-[#00597b] text-white gap-2 shadow-md cursor-pointer"
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
                  <div className="space-y-4 animate-in fade-in-50 duration-200">
                    {/* Quick Selection Summary */}
                    <div className="rounded-xl border border-border/80 bg-background/90 p-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <span className="font-semibold text-muted-foreground shrink-0">
                          {texts.form.selectedLabel}
                        </span>
                        <span className="font-bold text-foreground truncate">
                          {selectedProducts
                            .map((p) => getProductNameInLang(p, currentLang))
                            .join(", ") || texts.form.noneSelected}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-bold px-1.5 py-0 border-[#c9d1d4] text-[#015474] dark:text-[#67e8f9] bg-[#e0f1f5] dark:bg-[#015474]/40 shrink-0"
                        >
                          {serviceScope === "supply_only"
                            ? `📦 ${texts.form.supplyOnly}`
                            : `🛠️ ${texts.form.supplyAndInstallation}`}
                        </Badge>
                        {photos.filter((p) => p.tag === "wall_photo").length > 0 && (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-medium px-1.5 py-0 border-[#c9d1d4] text-[#015474] dark:text-[#67e8f9] bg-[#e0f1f5] dark:bg-[#015474]/40 shrink-0"
                          >
                            📸 {photos.filter((p) => p.tag === "wall_photo").length} Wall Pic(s)
                          </Badge>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormStep(1)}
                        className="text-[11px] font-bold text-primary hover:underline shrink-0 cursor-pointer ml-2"
                      >
                        {texts.form.editStep1}
                      </button>
                    </div>

                    {/* STEP 5: CONTACT & LIVE CALENDAR PICKER */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-bold">
                            5
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
                          <label className="text-[11px] font-semibold text-[#015474] dark:text-[#67e8f9] mb-1 block flex items-center gap-1">
                            <Phone className="h-3 w-3 fill-current" /> {texts.form.whatsappNumber}{" "}
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
                                "h-9 text-xs font-medium rounded-l-none border-l-0 border-[#c9d1d4] focus-visible:ring-[#006788] dark:border-[#00597b] bg-background transition-colors",
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
                            {texts.form.requiredDate} <span className="text-destructive">*</span>
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

                    {/* Prepayment Privilege Banner if Selected */}
                    {prepaymentDiscountSelected && (
                      <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/40 p-3 flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span className="font-bold text-amber-950 dark:text-amber-200 text-[11px]">
                            5% Instant Discount + Free Certified Shree Yantra will be applied to
                            your quotation.
                          </span>
                        </div>
                        <Badge className="bg-[#006788] text-white font-bold text-[9px] shrink-0">
                          APPLIED
                        </Badge>
                      </div>
                    )}

                    {/* Network/Timeout WhatsApp Fallback */}
                    {submitError && (
                      <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 dark:border-amber-800 dark:bg-amber-950/40 text-xs space-y-2">
                        <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-semibold">
                          <Phone className="h-4 w-4 text-[#006788] dark:text-[#38bdf8]" />
                          <span>{texts.form.instantWhatsappOption}</span>
                        </div>
                        <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                          {texts.form.instantWhatsappDesc}
                        </p>
                        <Button
                          asChild
                          size="sm"
                          className="w-full bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold gap-1.5 shadow-sm h-10 cursor-pointer"
                        >
                          <a href={fallbackWhatsappUrl} target="_blank" rel="noopener noreferrer">
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
                        className="flex-1 h-11 sm:h-12 text-xs sm:text-sm font-bold bg-[#006788] hover:bg-[#00597b] text-white gap-2 shadow-md min-w-0 cursor-pointer"
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
                      <ShieldCheck className="h-3.5 w-3.5 text-[#006788] dark:text-[#38bdf8]" />
                      <span>{texts.form.trustNote}</span>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * WallCladdingCatalog.tsx
 *
 * Full-featured Architectural Product Catalogue for Natural Stone Wall Cladding Mosaics & Panels.
 * Matches the exact box size, 3-column aspect-square layout, hover overlay, and modal dialog
 * specifications of "LIVE INSTALLATIONS & EXECUTED WORKS" (StoneGalleryFeed.tsx).
 *
 * Capabilities:
 * - Identical container, height limits (max-h-[640px] sm:max-h-[700px] lg:max-h-[750px]), and 3-column square grid
 * - Smooth infinite / progressive loading with 60fps native momentum scrolling
 * - Clean default card view with elegant hover overlay displaying product name, live quarry rate & specs
 * - Super admin price writing & attachment directly on/over the image, synced everywhere (ERP & Quote Calculator)
 * - WhatsApp PDF softcopy download & WhatsApp inquiry integration
 * - Side-by-side architectural modal dialog (sm:max-w-2xl rounded-3xl)
 */

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Search,
  Download,
  Share2,
  Pencil,
  Sparkles,
  Eye,
  Layers,
  ShieldCheck,
  RotateCcw,
  RotateCw,
  ArrowUpDown,
  FileDown,
  X,
  Maximize2,
  ChevronDown,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAttachedProductPrices, type AttachedProductPrice } from "@/lib/catalog/product-prices";
import { AttachPriceDialog, type PatternPriceTarget } from "./AttachPriceDialog";
import { useRoles } from "@/hooks/use-roles";
import { useWebsiteCatalog, type CatalogProduct } from "@/lib/catalog/catalog-store";
import { useSiteSettingsValue } from "@/lib/site-settings/use-site-settings";
import { transliterateName } from "@/lib/i18n/transliterate";
import { toIndicDigits } from "@/lib/format";
import { CATALOG_ITEMS_BY_CODE } from "@/lib/i18n/catalogue-items-i18n";

function getCladdingName(
  item: { code?: string; id?: string; name: string },
  lang: "en" | "hi" | "gu",
): string {
  const code = item.code || item.id || item.name;
  return toIndicDigits(code, lang);
}

export type WallCladdingItem = CatalogProduct;

interface WallCladdingCatalogProps {
  onSelectPattern?: (pattern: WallCladdingItem, price: AttachedProductPrice) => void;
  className?: string;
  initialCategory?: string;
  showAdminBanner?: boolean;
}

const CATALOG_TEXTS = {
  en: {
    heading: "Natural Stone Wall Cladding & Architectural Mosaics",
    patternsCount: "Patterns",
    allCollections: "All Collections",
    allStones: "All Stones",
    allPatterns: "All Patterns",
    searchPlaceholder: "Search...",
    pdf: "PDF",
    pdfBtn: "Catalogue in English Language",
    pdfFile: "StoneTech_NaturalStone_WallCl_Options_English.pdf",
    veneerPdfFile: "StoneTech_Stone_Veneer_Catalogue_English.pdf",
    cataloguesBtn: "Catalogues (PDF)",
    veneerBtn: "Stone Veneer (106 Pgs)",
    claddingBtn: "Wall Cladding (71 Pgs)",
    veneerTitle: "Ultra-Thin Stone Veneer (106 Pgs)",
    veneerDesc: "98 Luxury flexible natural stone sheets · Slate, Sandstone, Marble & Limestone",
    claddingTitle: "Natural Stone Cladding (71 Pgs)",
    claddingDesc: "275 Precision CNC 3D reliefs, murals & natural splitface ledgers",
    glassBricksTitle: "Architectural Glass Bricks",
    solidGlass: "Solid Glass (34 Pgs)",
    hollowGlass: "Hollow Glass (49 Pgs)",
    priceBtn: "Price",
    specsBtn: "Specs",
    sqftUnit: "/ sq.ft",
    noMatching: "No matching patterns",
    noMatchingDesc: "Try clearing your search or changing the collection filter.",
    resetFilters: "Reset Filters",
    categories: {
      "Stone Wall Cladding": "Stone Wall Cladding",
      "Stone Wall Mural Artwork": "Stone Wall Mural Artwork",
      "Horizontal Strip & Ledgestone Panels": "Horizontal Strip & Ledgestone Panels",
      "Stone Inlay": "Stone Inlay",
    } as Record<string, string>,
  },
  hi: {
    heading: "प्राकृतिक पाषाण क्लैडिंग एवं वास्तुशिल्पीय मोज़ेक",
    patternsCount: "पैटर्न्स",
    allCollections: "सभी संग्रह",
    allStones: "सभी पत्थर",
    allPatterns: "सभी पैटर्न्स",
    searchPlaceholder: "खोजें...",
    pdf: "PDF",
    pdfBtn: "हिंदी भाषा में कैटलॉग",
    pdfFile: "StoneTech_NaturalStone_WallCl_Options_Hindi.pdf",
    veneerPdfFile: "StoneTech_Stone_Veneer_Catalogue_Hindi.pdf",
    cataloguesBtn: "कैटलॉग डाउनलोड (PDF)",
    veneerBtn: "स्टोन विनियर (१०६ पेज)",
    claddingBtn: "वॉल क्लैडिंग (७१ पेज)",
    veneerTitle: "अत्यंत पतली स्टोन विनियर (१०६ पेज)",
    veneerDesc: "९८ फ्लेक्सिबल असली पत्थर पैटर्न्स · स्लेट, सैंडस्टोन, मार्बल एवं लाइमस्टोन",
    claddingTitle: "प्राकृतिक पाषाण वॉल क्लैडिंग (७१ पेज)",
    claddingDesc: "२७५ सटीक सीएनसी ३D रिलीफ, म्यूरल्स एवं स्प्लिटफेस लेजर्स",
    glassBricksTitle: "वास्तुशिल्पीय कांच की ईंटें",
    solidGlass: "ठोस कांच (३४ पेज)",
    hollowGlass: "खोखली कांच (४९ पेज)",
    priceBtn: "मूल्य",
    specsBtn: "विशेषताएं",
    sqftUnit: "/ वर्गफ़ुट",
    noMatching: "कोई मेल खाता पैटर्न नहीं मिला",
    noMatchingDesc: "अपनी खोज साफ़ करने या संग्रह फ़िल्टर बदलने का प्रयास करें।",
    resetFilters: "फ़िल्टर रीसेट करें",
    categories: {
      "Stone Wall Cladding": "स्टोन वॉल क्लैडिंग",
      "Stone Wall Mural Artwork": "स्टोन वॉल म्यूरल आर्टवर्क",
      "Horizontal Strip & Ledgestone Panels": "हॉरिजॉन्टल स्ट्रिप एवं लेजस्टोन पैनल्स",
      "Stone Inlay": "स्टोन इनले (जड़ाई कार्य)",
    } as Record<string, string>,
  },
  gu: {
    heading: "કુદરતી સ્ટોન વોલ ક્લેડિંગ અને વાસ્તુશિલ્પીય મોઝેઇક",
    patternsCount: "પેટર્ન",
    allCollections: "બધા સંગ્રહ",
    allStones: "બધા પથ્થરો",
    allPatterns: "બધી પેટર્ન",
    searchPlaceholder: "શોધો...",
    pdf: "PDF",
    pdfBtn: "ગુજરાતી ભાષામાં કેટલોગ",
    pdfFile: "StoneTech_NaturalStone_WallCl_Options_Gujarati.pdf",
    veneerPdfFile: "StoneTech_Stone_Veneer_Catalogue_Gujarati.pdf",
    cataloguesBtn: "કેટલોગ ડાઉનલોડ (PDF)",
    veneerBtn: "સ્ટોન વિનિયર (૧૦૬ પેજ)",
    claddingBtn: "વોલ ક્લેડિંગ (૭૧ પેજ)",
    veneerTitle: "અત્યંત પાતળી સ્ટોન વિનિયર (૧૦૬ પેજ)",
    veneerDesc: "૯૮ ફ્લેક્સિબલ અસલી પથ્થર પેટર્ન · સ્લેટ, સેન્ડસ્ટોન, માર્બલ અને લાઇમસ્ટોન",
    claddingTitle: "કુદરતી પાષાણ વોલ ક્લેડિંગ (૭૧ પેજ)",
    claddingDesc: "૨૭૫ સચોટ CNC ૩D રિલીફ, મ્યુરલ્સ અને સ્પ્લિટફેસ લેજર્સ",
    glassBricksTitle: "વાસ્તુશિલ્પીય કાચની ઈંટો",
    solidGlass: "નક્કર કાચ (૩૪ પેજ)",
    hollowGlass: "પોલી કાચ (૪૯ પેજ)",
    priceBtn: "કિંમત",
    specsBtn: "વિગતો",
    sqftUnit: "/ ચો.ફૂટ",
    noMatching: "કોઈ મેળ ખાતી પેટર્ન મળી નથી",
    noMatchingDesc: "તમારી શોધ સાફ કરવાનો અથવા સંગ્રહ ફિલ્ટર બદલવાનો પ્રયાસ કરો.",
    resetFilters: "ફિલ્ટર્સ રીસેટ કરો",
    categories: {
      "Stone Wall Cladding": "સ્ટોન વોલ ક્લેડિંગ",
      "Stone Wall Mural Artwork": "સ્ટોન વોલ મ્યુરલ આર્ટવર્ક",
      "Horizontal Strip & Ledgestone Panels": "હોરિઝોન્ટલ સ્ટ્રીપ અને લેજસ્ટોન પેનલ્સ",
      "Stone Inlay": "સ્ટોન ઇનલે (જડતર કામ)",
    } as Record<string, string>,
  },
};

const INITIAL_BATCH = 18;
const BATCH_SIZE = 18;

export function WallCladdingCatalog({
  onSelectPattern,
  className,
  initialCategory = "all",
  showAdminBanner = false,
}: WallCladdingCatalogProps) {
  const { isSuperAdmin: userIsSuperAdmin } = useRoles();
  const { i18n } = useTranslation();
  const lang = (i18n.language?.substring(0, 2) || "en") as "en" | "hi" | "gu";
  const t = CATALOG_TEXTS[lang] || CATALOG_TEXTS.en;
  const getCategoryLabel = (cat: string) => t.categories[cat] || cat;
  const siteSettings = useSiteSettingsValue();
  const { products, updateProduct } = useWebsiteCatalog(siteSettings);
  const {
    customPrices,
    getPrice,
    updatePrice,
    resetPrice,
    resetAllPrices,
    batchAdjust,
    exportJson,
  } = useAttachedProductPrices();

  // Admin Mode state (defaults to true if super admin, or user can toggle)
  const [adminMode, setAdminMode] = useState<boolean>(true);
  const isSuperAdmin = userIsSuperAdmin || adminMode;

  // Filtering states
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedStoneType, setSelectedStoneType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"index" | "price-asc" | "price-desc" | "name">("index");

  // Infinite scroll batch state
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_BATCH);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Dialog targets
  const [priceEditTarget, setPriceEditTarget] = useState<PatternPriceTarget | null>(null);
  const [lightboxTarget, setLightboxTarget] = useState<WallCladdingItem | null>(null);
  const [isFullScreenZoom, setIsFullScreenZoom] = useState<boolean>(false);

  // Categories & Stone Types extraction
  const categories = useMemo(() => {
    const set = new Set(products.map((item) => item.category));
    return ["all", ...Array.from(set)];
  }, [products]);

  const stoneTypes = useMemo(() => {
    const set = new Set(products.map((item) => item.stoneType));
    return ["all", ...Array.from(set)];
  }, [products]);

  // Filtered & Sorted items (respects custom drag & drop sequence from CMS)
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    const items = products.filter((item) => {
      if (selectedCategory !== "all" && item.category !== selectedCategory) return false;
      if (selectedStoneType !== "all" && item.stoneType !== selectedStoneType) return false;
      if (!q) return true;

      const p = getPrice(item.id, item.category, item.stoneType, item.index);
      return (
        item.name.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        (item.code && item.code.toLowerCase().includes(q)) ||
        item.stoneType.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (p.badge && p.badge.toLowerCase().includes(q)) ||
        item.finishes?.some((f) => f.toLowerCase().includes(q)) ||
        item.applications?.some((a) => a.toLowerCase().includes(q))
      );
    });

    // If explicit sorting by price or name is requested, apply it;
    // otherwise preserve exact custom sequence from `products` (useWebsiteCatalog order)
    if (sortBy === "price-asc") {
      return [...items].sort((a, b) => {
        const priceA = getPrice(a.id, a.category, a.stoneType, a.index).price;
        const priceB = getPrice(b.id, b.category, b.stoneType, b.index).price;
        return priceA - priceB;
      });
    }
    if (sortBy === "price-desc") {
      return [...items].sort((a, b) => {
        const priceA = getPrice(a.id, a.category, a.stoneType, a.index).price;
        const priceB = getPrice(b.id, b.category, b.stoneType, b.index).price;
        return priceB - priceA;
      });
    }
    if (sortBy === "name") {
      return [...items].sort((a, b) => a.name.localeCompare(b.name));
    }

    return items;
  }, [products, search, selectedCategory, selectedStoneType, sortBy, getPrice]);

  // High-performance infinite scroll: uses IntersectionObserver on bottom sentinel
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const container = scrollContainerRef.current;
    if (!sentinel || !container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting) {
          setVisibleCount((prev) => {
            if (prev >= filteredItems.length) return prev;
            return Math.min(prev + BATCH_SIZE, filteredItems.length);
          });
        }
      },
      {
        root: container,
        rootMargin: "350px 0px",
        threshold: 0,
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredItems.length]);

  const displayedItems = useMemo(() => {
    return filteredItems.slice(0, visibleCount);
  }, [filteredItems, visibleCount]);

  const handleEditPrice = useCallback(
    (item: WallCladdingItem) => {
      const p = getPrice(item.id, item.category, item.stoneType, item.index);
      setPriceEditTarget({
        id: item.id,
        code: item.code,
        name: item.name,
        image: item.image,
        category: item.category,
        stoneType: item.stoneType,
        index: item.index,
        currentPrice: p,
      });
    },
    [getPrice],
  );

  const handleWhatsAppInquiry = (item: WallCladdingItem) => {
    const p = getPrice(item.id, item.category, item.stoneType, item.index);
    const itemCode = item.code || item.id;
    const text = encodeURIComponent(
      `Hello Stone Tech Atelier,\n\nI am interested in your Natural Stone Wall Cladding pattern:\n*${item.name}* (Code: ${itemCode})\n*Category:* ${item.category}\n*Stone:* ${item.stoneType}\n*Standard Relief:* ${item.thickness}\n*Catalogue Price:* ${p.currency} ${p.price} / ${p.unit}\n\nPlease share availability, project discount, and freight estimate.\nReference URL: https://stonetech.in#cladding-${item.id}`,
    );
    window.open(`https://wa.me/917742090866?text=${text}`, "_blank");
  };

  const handleBatchAdjustPrompt = () => {
    const val = window.prompt(
      "Enter price adjustment percentage (e.g. +10 for +10%, or -5 for -5%):",
      "+10",
    );
    if (!val) return;
    const num = parseFloat(val);
    if (isNaN(num)) {
      toast.error("Invalid percentage value");
      return;
    }
    batchAdjust(num);
    toast.success(`Adjusted all custom attached prices by ${num > 0 ? "+" : ""}${num}%`);
  };

  return (
    <div className="space-y-4">
      {/* Super Admin Control Bar (if enabled) */}
      {showAdminBanner && (
        <div className="rounded-2xl border border-cyan-800/40 bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 p-3.5 text-white shadow-md">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-white">
                    Super Admin Rights: Live Price Attachment &amp; ERP Sync
                  </h3>
                  <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-400/40 text-[9px]">
                    Super Admin
                  </Badge>
                </div>
                <p className="text-[11px] text-cyan-100/70">
                  Click the pencil icon on any item or modal to edit rates. All edits sync live to
                  the Quote Calculator.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-lg border border-white/10 text-xs">
                <span className="text-[11px]">Admin Edit:</span>
                <Switch checked={adminMode} onCheckedChange={setAdminMode} />
              </div>

              {adminMode && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBatchAdjustPrompt}
                    className="h-7 text-xs border-cyan-700/60 bg-cyan-950/60 text-cyan-200 hover:bg-cyan-900"
                  >
                    <ArrowUpDown className="h-3 w-3 mr-1" />
                    Adjust +/- %
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const json = exportJson();
                      const blob = new Blob([json], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `stos-wall-cladding-prices-${new Date().toISOString().slice(0, 10)}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.success("Exported price sheet");
                    }}
                    className="h-7 text-xs border-cyan-700/60 bg-cyan-950/60 text-cyan-200 hover:bg-cyan-900"
                  >
                    <FileDown className="h-3 w-3 mr-1" />
                    Export
                  </Button>

                  {Object.keys(customPrices).length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (
                          window.confirm("Reset all custom attached prices to benchmark rates?")
                        ) {
                          resetAllPrices();
                          toast.success("Reset all prices to benchmarks");
                        }
                      }}
                      className="h-7 text-xs text-amber-300 hover:text-amber-200 hover:bg-amber-950/30"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Reset
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Outer rounded container without sharp edges — EXACT SAME SPEC as StoneGalleryFeed */}
      <div
        className={cn(
          "rounded-3xl border border-border/80 bg-card/70 backdrop-blur-xs p-4 sm:p-5 shadow-md space-y-3.5",
          className,
        )}
      >
        {/* Header Strip with Live Status, Integrated Category Filter, Search, and WhatsApp PDF */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#006788] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#006788]" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              {t.heading}
            </span>
            <span className="text-[11px] text-muted-foreground hidden md:inline">
              ({filteredItems.length} {t.patternsCount})
            </span>
          </div>

          {/* Compact Right Controls: Category Dropdown, Search & WhatsApp PDF */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Dropdown */}
            <Select
              value={selectedCategory}
              onValueChange={(v) => {
                setSelectedCategory(v);
                setVisibleCount(INITIAL_BATCH);
              }}
            >
              <SelectTrigger className="h-8 text-xs bg-background/80 w-[150px] sm:w-[180px]">
                <SelectValue placeholder={t.allCollections} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  {t.allCollections} ({products.length})
                </SelectItem>
                {categories
                  .filter((s) => s !== "all")
                  .map((cat) => (
                    <SelectItem key={cat} value={cat} className="text-xs">
                      {getCategoryLabel(cat)} ({products.filter((p) => p.category === cat).length})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            {/* Stone Geology Dropdown */}
            <Select
              value={selectedStoneType}
              onValueChange={(v) => {
                setSelectedStoneType(v);
                setVisibleCount(INITIAL_BATCH);
              }}
            >
              <SelectTrigger className="h-8 text-xs bg-background/80 w-[120px] sm:w-[140px] hidden sm:flex">
                <SelectValue placeholder={t.allStones} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  {t.allStones}
                </SelectItem>
                {stoneTypes
                  .filter((s) => s !== "all")
                  .map((stone) => (
                    <SelectItem key={stone} value={stone} className="text-xs">
                      {stone}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            {/* Quick Search */}
            <div className="relative w-28 sm:w-36">
              <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setVisibleCount(INITIAL_BATCH);
                }}
                placeholder={t.searchPlaceholder}
                className="pl-7 pr-6 h-8 text-xs bg-background/80"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setVisibleCount(INITIAL_BATCH);
                  }}
                  className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Quick One-Click Download: Stone Veneer (Active Language) */}
            <a
              href={`/catalogues/${t.veneerPdfFile}?v=2026-v2`}
              download={t.veneerPdfFile}
              title={t.veneerTitle}
              className="inline-flex"
            >
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2.5 text-xs text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden md:inline font-medium">{t.veneerBtn}</span>
                <span className="md:hidden font-medium">
                  {lang === "gu" ? "વિનિયર" : lang === "hi" ? "विनियर" : "Veneer"}
                </span>
              </Button>
            </a>

            {/* Comprehensive Multi-Catalogue & Multi-Language Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2.5 text-xs text-[#015474] dark:text-[#67e8f9] border-[#006788]/30 hover:bg-[#e0f1f5]/60 gap-1"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline font-medium">{t.cataloguesBtn}</span>
                  <span className="sm:hidden font-medium">{t.pdf}</span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[330px] sm:w-[380px] p-2.5 space-y-2.5">
                {/* 1. Stone Veneer Catalogue */}
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                      {t.veneerTitle}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 h-4 border-amber-500/40 text-amber-700 dark:text-amber-300"
                    >
                      106 Pgs
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-tight">{t.veneerDesc}</p>
                  <div className="flex items-center gap-1.5 pt-1">
                    <a
                      href="/catalogues/StoneTech_Stone_Veneer_Catalogue_English.pdf?v=2026-v2"
                      download="StoneTech_Stone_Veneer_Catalogue_English.pdf"
                      className={cn(
                        "flex-1 text-center py-1 px-1.5 text-[11px] font-medium rounded border transition-colors",
                        lang === "en"
                          ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                          : "bg-background/80 hover:bg-accent border-border text-foreground",
                      )}
                    >
                      English
                    </a>
                    <a
                      href="/catalogues/StoneTech_Stone_Veneer_Catalogue_Hindi.pdf?v=2026-v2"
                      download="StoneTech_Stone_Veneer_Catalogue_Hindi.pdf"
                      className={cn(
                        "flex-1 text-center py-1 px-1.5 text-[11px] font-medium rounded border transition-colors",
                        lang === "hi"
                          ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                          : "bg-background/80 hover:bg-accent border-border text-foreground",
                      )}
                    >
                      हिंदी
                    </a>
                    <a
                      href="/catalogues/StoneTech_Stone_Veneer_Catalogue_Gujarati.pdf?v=2026-v2"
                      download="StoneTech_Stone_Veneer_Catalogue_Gujarati.pdf"
                      className={cn(
                        "flex-1 text-center py-1 px-1.5 text-[11px] font-medium rounded border transition-colors",
                        lang === "gu"
                          ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                          : "bg-background/80 hover:bg-accent border-border text-foreground",
                      )}
                    >
                      ગુજરાતી
                    </a>
                  </div>
                </div>

                {/* 2. Wall Cladding Catalogue */}
                <div className="rounded-lg border border-[#006788]/20 bg-[#e0f1f5]/30 dark:bg-[#015474]/15 p-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-[#006788] dark:text-[#38bdf8]" />
                      {t.claddingTitle}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 h-4 border-[#006788]/30 text-[#015474] dark:text-[#67e8f9]"
                    >
                      71 Pgs
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    {t.claddingDesc}
                  </p>
                  <div className="flex items-center gap-1.5 pt-1">
                    <a
                      href="/catalogues/StoneTech_NaturalStone_WallCl_Options_English.pdf?v=26-27-v3"
                      download="StoneTech_NaturalStone_WallCl_Options_English.pdf"
                      className={cn(
                        "flex-1 text-center py-1 px-1.5 text-[11px] font-medium rounded border transition-colors",
                        lang === "en"
                          ? "bg-[#015474] text-white border-[#015474] shadow-xs"
                          : "bg-background/80 hover:bg-accent border-border text-foreground",
                      )}
                    >
                      English
                    </a>
                    <a
                      href="/catalogues/StoneTech_NaturalStone_WallCl_Options_Hindi.pdf?v=26-27-v3"
                      download="StoneTech_NaturalStone_WallCl_Options_Hindi.pdf"
                      className={cn(
                        "flex-1 text-center py-1 px-1.5 text-[11px] font-medium rounded border transition-colors",
                        lang === "hi"
                          ? "bg-[#015474] text-white border-[#015474] shadow-xs"
                          : "bg-background/80 hover:bg-accent border-border text-foreground",
                      )}
                    >
                      हिंदी
                    </a>
                    <a
                      href="/catalogues/StoneTech_NaturalStone_WallCl_Options_Gujarati.pdf?v=26-27-v3"
                      download="StoneTech_NaturalStone_WallCl_Options_Gujarati.pdf"
                      className={cn(
                        "flex-1 text-center py-1 px-1.5 text-[11px] font-medium rounded border transition-colors",
                        lang === "gu"
                          ? "bg-[#015474] text-white border-[#015474] shadow-xs"
                          : "bg-background/80 hover:bg-accent border-border text-foreground",
                      )}
                    >
                      ગુજરાતી
                    </a>
                  </div>
                </div>

                {/* 3. Glass Bricks Catalogues */}
                <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                      <FileDown className="h-3.5 w-3.5 text-sky-600" />
                      {t.glassBricksTitle}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                    <a
                      href="/catalogues/StoneTech_Solid_Glass_Bricks_Catalogue_2026.pdf?v=2026-v1"
                      download="StoneTech_Solid_Glass_Bricks_Catalogue_2026.pdf"
                      className="py-1 px-1.5 text-[11px] font-medium rounded border bg-background/80 hover:bg-accent border-border text-foreground flex items-center justify-center gap-1"
                    >
                      <Download className="h-3 w-3 text-sky-600" />
                      {t.solidGlass}
                    </a>
                    <a
                      href="/catalogues/StoneTech_Glass_Bricks_Catalogue_2026.pdf?v=2026-v1"
                      download="StoneTech_Glass_Bricks_Catalogue_2026.pdf"
                      className="py-1 px-1.5 text-[11px] font-medium rounded border bg-background/80 hover:bg-accent border-border text-foreground flex items-center justify-center gap-1"
                    >
                      <Download className="h-3 w-3 text-sky-600" />
                      {t.hollowGlass}
                    </a>
                  </div>
                </div>

                {/* 4. Flexible Clay Veneers Catalogue */}
                <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                      <FileDown className="h-3.5 w-3.5 text-orange-600" />
                      {lang === "gu"
                        ? "ફ્લેક્સિબલ ક્લે વિનિયર"
                        : lang === "hi"
                          ? "फ्लेक्सिबल क्ले विनियर"
                          : "Flexible Clay Veneers"}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 h-4 border-orange-500/40 text-orange-700 dark:text-orange-300"
                    >
                      37 Pgs
                    </Badge>
                  </div>
                  <a
                    href="/catalogues/StoneTech_Flexible_Clay_Veneers_Catalogue_2026.pdf?v=2026-v1"
                    download="StoneTech_Flexible_Clay_Veneers_Catalogue_2026.pdf"
                    className="w-full py-1 px-2 text-[11px] font-medium rounded border bg-background/80 hover:bg-accent border-border text-foreground flex items-center justify-between gap-1"
                  >
                    <span className="flex items-center gap-1.5">
                      <Download className="h-3 w-3 text-orange-600" />
                      <span>
                        {lang === "gu"
                          ? "માસ્ટર કેટલોગ ૨૦૨૬"
                          : lang === "hi"
                            ? "मास्टर कैटलॉग २०२૬"
                            : "Master Catalogue 2026"}
                      </span>
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">15.4 MB</span>
                  </a>
                </div>

                {/* 5. Natural Stone Pebbles & Semi-Precious Aggregates Catalogue */}
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                      <FileDown className="h-3.5 w-3.5 text-amber-600" />
                      {lang === "gu"
                        ? "કુદરતી સ્ટોન પેબલ્સ"
                        : lang === "hi"
                          ? "नेचुरल स्टोन पेबल्स"
                          : "Natural Stone Pebbles"}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 h-4 border-amber-500/40 text-amber-700 dark:text-amber-300"
                    >
                      23 Pgs
                    </Badge>
                  </div>
                  <a
                    href="/catalogues/StoneTech_Stone_Pebbles_Catalogue_2026.pdf?v=2026-v1"
                    download="StoneTech_Stone_Pebbles_Catalogue_2026.pdf"
                    className="w-full py-1 px-2 text-[11px] font-medium rounded border bg-background/80 hover:bg-accent border-border text-foreground flex items-center justify-between gap-1"
                  >
                    <span className="flex items-center gap-1.5">
                      <Download className="h-3 w-3 text-amber-600" />
                      <span>
                        {lang === "gu"
                          ? "માસ્ટર કેટલોગ ૨૦૨૬"
                          : lang === "hi"
                            ? "मास्टर कैटलॉग २०२६"
                            : "Master Catalogue 2026"}
                      </span>
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">16.2 MB</span>
                  </a>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Quick Collection Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-none [touch-action:pan-x]">
          <button
            type="button"
            onClick={() => {
              setSelectedCategory("all");
              setVisibleCount(INITIAL_BATCH);
            }}
            className={cn(
              "px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all border shrink-0",
              selectedCategory === "all"
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-muted/50 text-muted-foreground border-border/60 hover:text-foreground hover:bg-muted",
            )}
          >
            {t.allPatterns} ({products.length})
          </button>
          {categories
            .filter((c) => c !== "all")
            .map((cat) => {
              const count = products.filter((p) => p.category === cat).length;
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat);
                    setVisibleCount(INITIAL_BATCH);
                  }}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-1.5 shrink-0",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-muted/50 text-muted-foreground border-border/60 hover:text-foreground hover:bg-muted",
                  )}
                >
                  {cat === "Horizontal Strip & Ledgestone Panels" && <Layers className="h-3 w-3" />}
                  <span>{getCategoryLabel(cat)}</span>
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded-full",
                      isSelected
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-background/80 text-muted-foreground",
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
        </div>

        {/* Unconstrained Flow Grid without inner scroll trap (enables smooth scrolling to footer) */}
        <div ref={scrollContainerRef} className="rounded-2xl pb-2">
          {filteredItems.length === 0 ? (
            <div className="text-center py-16 border rounded-2xl bg-muted/20 space-y-3">
              <Layers className="h-10 w-10 text-muted-foreground mx-auto" />
              <h4 className="text-base font-semibold text-foreground">{t.noMatching}</h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">{t.noMatchingDesc}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setSelectedCategory("all");
                  setSelectedStoneType("all");
                  setVisibleCount(INITIAL_BATCH);
                }}
              >
                {t.resetFilters}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-2.5 pb-2">
              {displayedItems.map((item, idx) => {
                const price = getPrice(item.id, item.category, item.stoneType, item.index);

                return (
                  <div
                    key={`${item.id}-${idx}`}
                    onClick={() => setLightboxTarget(item)}
                    style={{
                      contentVisibility: idx >= INITIAL_BATCH ? "auto" : undefined,
                      containIntrinsicSize: idx >= INITIAL_BATCH ? "auto 120px" : undefined,
                    }}
                    className="group relative aspect-square rounded-xl sm:rounded-2xl overflow-hidden cursor-pointer bg-[#f8fafc] dark:bg-stone-900/70 border border-slate-200/80 dark:border-stone-800 hover:border-[#006788]/60 shadow-2xs hover:shadow-md transition-all duration-300 flex items-center justify-center p-2"
                    title={getCladdingName(item, lang)}
                  >
                    {/* Media Image — Complete uncropped panel with smooth zoom on hover matching PDF quality */}
                    <img
                      src={item.image}
                      alt={getCladdingName(item, lang)}
                      loading="lazy"
                      decoding="async"
                      className="max-h-[95%] max-w-[95%] w-auto h-auto object-contain drop-shadow-xs select-none transition-transform duration-500 ease-out group-hover:scale-115 pointer-events-none"
                      style={
                        item.rotation ? { transform: `rotate(${item.rotation}deg)` } : undefined
                      }
                    />

                    {/* Subtle dark gradient overlay on hover — EXACT SAME as Live Installations */}
                    <div className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2 text-white z-10">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-semibold truncate max-w-[85%] drop-shadow-xs">
                          {getCladdingName(item, lang)}
                        </span>
                        <Eye className="h-3 w-3 shrink-0 opacity-80" />
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-bold">
                        {isSuperAdmin ? (
                          <span className="flex items-baseline gap-1 text-emerald-400">
                            <span>
                              {price.currency} {toIndicDigits(price.price, lang)}
                            </span>
                            <span className="text-[9px] text-white/70">{t.sqftUnit}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-400 font-semibold">
                            {lang === "gu"
                              ? "વિનંતી પર ભાવ"
                              : lang === "hi"
                                ? "अनुरोध पर मूल्य"
                                : "Price on Request"}
                          </span>
                        )}

                        <div className="flex items-center gap-1">
                          {isSuperAdmin && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditPrice(item);
                              }}
                              className="px-1.5 py-0.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-[9px] font-bold shadow-xs flex items-center gap-0.5"
                              title="Super Admin: Edit Price"
                            >
                              <Pencil className="h-2.5 w-2.5" />
                              <span>{t.priceBtn}</span>
                            </button>
                          )}
                          <span className="text-[9.5px] bg-white/20 hover:bg-white/30 px-1.5 py-0.5 rounded font-medium">
                            {t.specsBtn}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load More Button — Manual control to prevent infinite scroll bounce & traps */}
          {displayedItems.length < filteredItems.length && (
            <div className="py-6 text-center flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, filteredItems.length))
                }
                className="h-8 text-xs cursor-pointer border-amber-500/30 font-semibold"
              >
                Load More Patterns ({filteredItems.length - displayedItems.length} remaining)
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setVisibleCount(filteredItems.length)}
                className="h-8 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Show All ({filteredItems.length})
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Super Admin Attach Price Dialog */}
      <AttachPriceDialog
        target={priceEditTarget}
        onOpenChange={(open) => {
          if (!open) setPriceEditTarget(null);
        }}
        onSave={async (id, priceData) => {
          updatePrice(id, priceData);
          if (priceEditTarget) {
            try {
              await updateProduct(id, {
                ...priceData,
                name: priceEditTarget.name,
                category: priceEditTarget.category,
                stoneType: priceEditTarget.stoneType,
              });
            } catch (e) {
              console.warn("[AttachPrice] sync to ERP warning:", e);
            }
          }
        }}
        onReset={(id) => {
          resetPrice(id);
        }}
      />

      {/* Architectural Lightbox Dialog — Wide 2-Column Modal Layout with Uncropped Full Image */}
      <Dialog
        open={Boolean(lightboxTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setLightboxTarget(null);
            setIsFullScreenZoom(false);
          }
        }}
      >
        {lightboxTarget && (
          <DialogContent className="sm:max-w-3xl md:max-w-4xl lg:max-w-5xl p-0 overflow-hidden rounded-3xl border-border max-h-[92vh]">
            {(() => {
              const price = getPrice(
                lightboxTarget.id,
                lightboxTarget.category,
                lightboxTarget.stoneType,
                lightboxTarget.index,
              );
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 md:max-h-[90vh] overflow-hidden">
                  {/* Left side: High-Res Full Image with object-contain (NO CROPPING) */}
                  <div
                    onClick={() => setIsFullScreenZoom(true)}
                    className="bg-stone-950 dark:bg-black flex items-center justify-center select-none overflow-hidden group relative p-4 sm:p-6 md:p-8 min-h-[340px] sm:min-h-[440px] md:min-h-[500px] cursor-zoom-in"
                    title="Click to view full screen high-resolution image"
                  >
                    <img
                      src={lightboxTarget.image}
                      alt={lightboxTarget.name}
                      className="max-h-[72vh] w-auto h-auto max-w-full object-contain rounded-xl shadow-2xl select-none transition-all duration-300"
                      style={
                        lightboxTarget.rotation
                          ? { transform: `rotate(${lightboxTarget.rotation}deg)` }
                          : undefined
                      }
                    />
                    <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/15 text-[10.5px] font-mono text-cyan-300 font-bold pointer-events-none">
                      {lightboxTarget.code || lightboxTarget.id}
                    </div>

                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          const currentRot = lightboxTarget.rotation || 0;
                          const nextRot = (currentRot + 90) % 360;
                          await updateProduct(lightboxTarget.id, { rotation: nextRot });
                          setLightboxTarget({ ...lightboxTarget, rotation: nextRot });
                          toast.success(
                            `Rotated photo to ${nextRot}° (lossless, saved everywhere)`,
                          );
                        }}
                        className="absolute top-3 right-3 bg-black/75 hover:bg-amber-600 text-white px-2.5 py-1.5 rounded-xl backdrop-blur-md border border-white/15 transition-colors shadow-lg flex items-center gap-1.5 text-xs font-semibold z-20"
                        title="Rotate picture 90° clockwise (lossless)"
                      >
                        <RotateCw className="h-3.5 w-3.5" />
                        <span>
                          {lightboxTarget.rotation ? `${lightboxTarget.rotation}°` : "Rotate"}
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsFullScreenZoom(true);
                      }}
                      className="absolute top-3 right-3 bg-black/60 hover:bg-black/85 backdrop-blur-xs text-white px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-md border border-white/10 transition-all cursor-pointer"
                      title="View full-resolution uncropped image"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                      <span className="text-[11px] hidden sm:inline">Full Image</span>
                    </button>
                  </div>

                  {/* Right side: Details, Specs & Inquire */}
                  <div className="p-6 flex flex-col justify-between space-y-4 bg-background overflow-y-auto max-h-[90vh]">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <Badge variant="secondary" className="text-[11px] font-medium">
                          {lightboxTarget.category}
                        </Badge>
                        <span className="font-medium text-foreground">
                          {lightboxTarget.stoneType}
                        </span>
                      </div>

                      <div>
                        <DialogTitle className="text-lg font-bold leading-snug">
                          {getCladdingName(lightboxTarget, lang)}
                        </DialogTitle>
                        <div className="flex items-baseline gap-1.5 mt-1">
                          {isSuperAdmin ? (
                            <>
                              <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                                {price.currency} {toIndicDigits(price.price, lang)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {price.unit === "sq.ft" ? t.sqftUnit : `/ ${price.unit}`}
                              </span>
                              {price.mrp && (
                                <span className="text-xs text-muted-foreground line-through ml-1">
                                  {price.currency} {toIndicDigits(price.mrp, lang)}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-base font-bold text-foreground">
                              {lang === "gu"
                                ? "વિનંતી પર ભાવ ઉપલબ્ધ"
                                : lang === "hi"
                                  ? "अनुरोध पर मूल्य उपलब्ध"
                                  : "Price on Request"}
                            </span>
                          )}
                          {isSuperAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                const target = lightboxTarget;
                                setLightboxTarget(null);
                                handleEditPrice(target);
                              }}
                              className="ml-2 px-2 py-0.5 rounded bg-cyan-600/10 hover:bg-cyan-600/20 text-cyan-700 dark:text-cyan-300 text-xs font-semibold flex items-center gap-1"
                            >
                              <Pencil className="h-3 w-3" />
                              <span>{t.priceBtn}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                        {lang === "hi"
                          ? `प्रीमियम प्राकृतिक ${transliterateName(lightboxTarget.stoneType, lang)} वास्तुशिल्प पैनल। बाहरी एलिवेशन, बाउंड्री फसाड और लक्जरी आंतरिक दीवारों के लिए विशेष रूप से निर्मित।`
                          : lang === "gu"
                            ? `પ્રીમિયમ કુદરતી ${transliterateName(lightboxTarget.stoneType, lang)} વાસ્તુશિલ્પીય પેનલ. બાહ્ય એલિવેશન, બાઉન્ડ્રી ફેસાડ અને લક્ઝરી આંતરિક દિવાલો માટે ખાસ નિર્મિત.`
                            : `Precision natural ${lightboxTarget.stoneType.toLowerCase()} architectural panel. Engineered for exterior elevations, boundary facades, and luxury interior feature walls.`}
                      </DialogDescription>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs">
                        <div>
                          <span className="text-muted-foreground block text-[10px]">
                            {lang === "hi"
                              ? "पत्थर प्रकार"
                              : lang === "gu"
                                ? "પથ્થર પ્રકાર"
                                : "Stone Type"}
                          </span>
                          <span className="font-medium truncate block">
                            {transliterateName(lightboxTarget.stoneType || "Natural Stone", lang)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px]">
                            {lang === "hi" ? "श्रेणी" : lang === "gu" ? "શ્રેણી" : "Category"}
                          </span>
                          <span className="font-medium truncate block">
                            {lightboxTarget.category || "Stone Wall Cladding"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px]">
                            {lang === "hi"
                              ? "सतह फिनिश"
                              : lang === "gu"
                                ? "સપાટી ફિનિશ"
                                : "Surface Finish"}
                          </span>
                          <span className="font-medium truncate block">
                            {transliterateName(
                              lightboxTarget.finishes?.join(", ") || "Natural Cleft",
                              lang,
                            )}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px]">
                            {lang === "hi"
                              ? "डिलीवरी समय"
                              : lang === "gu"
                                ? "ડિલિવરી સમય"
                                : "Lead Time"}
                          </span>
                          <span className="font-medium truncate block text-emerald-600 dark:text-emerald-400">
                            {lang === "hi"
                              ? "भेजने के लिए तैयार"
                              : lang === "gu"
                                ? "મોકલવા માટે તૈયાર"
                                : price.leadTime || "Ready to Ship"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-border/60">
                      {onSelectPattern && (
                        <Button
                          className="w-full font-semibold bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
                          size="sm"
                          onClick={() => {
                            setLightboxTarget(null);
                            onSelectPattern(lightboxTarget, price);
                            toast.success(
                              lang === "hi"
                                ? `आपके अनुमान के लिए "${getCladdingName(lightboxTarget, lang)}" चुना गया!`
                                : lang === "gu"
                                  ? `તમારા અંદાજ માટે "${getCladdingName(lightboxTarget, lang)}" પસંદ કરાયું!`
                                  : `Selected "${getCladdingName(lightboxTarget, lang)}" for your estimate inquiry!`,
                            );
                          }}
                        >
                          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                          {lang === "hi"
                            ? "अनुमान में जोड़ें व गणना करें"
                            : lang === "gu"
                              ? "અંદાજમાં ઉમેરો અને ગણતરી કરો"
                              : "Add to Estimate & Calculate"}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        className="w-full text-xs font-semibold text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                        size="sm"
                        onClick={() => handleWhatsAppInquiry(lightboxTarget)}
                      >
                        <Share2 className="h-3.5 w-3.5 mr-1.5" />
                        {lang === "hi"
                          ? "व्हाट्सएप पर तुरंत पूछताछ करें"
                          : lang === "gu"
                            ? "વોટ્સએપ પર તાત્કાલિક પૂછપરછ કરો"
                            : "Inquire on WhatsApp"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        )}
      </Dialog>

      {/* Full-Screen Zoom Lightbox Overlay */}
      {isFullScreenZoom && lightboxTarget && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200"
          onClick={() => setIsFullScreenZoom(false)}
        >
          <button
            type="button"
            onClick={() => setIsFullScreenZoom(false)}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/25 text-white p-2.5 rounded-full backdrop-blur-md transition-colors z-[101]"
            aria-label="Close full view"
          >
            <X className="h-6 w-6" />
          </button>
          <div className="relative max-w-7xl max-h-[94vh] flex flex-col items-center justify-center">
            <img
              src={lightboxTarget.image}
              alt={lightboxTarget.name}
              className="max-h-[86vh] max-w-full w-auto h-auto object-contain rounded-xl shadow-2xl transition-all duration-300"
              style={
                lightboxTarget.rotation
                  ? { transform: `rotate(${lightboxTarget.rotation}deg)` }
                  : undefined
              }
            />
            <div className="mt-3 text-center text-white/90">
              <div className="text-sm font-bold">
                {lightboxTarget.name} ({lightboxTarget.code || lightboxTarget.id})
              </div>
              <div className="text-xs text-white/60">
                {lightboxTarget.category} · {lightboxTarget.stoneType} · {lightboxTarget.thickness}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

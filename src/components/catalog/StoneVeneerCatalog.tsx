/**
 * StoneVeneerCatalog.tsx
 *
 * Architectural Product Catalogue for Ultra-Thin Flexible Natural Stone Veneer Sheets.
 * Displays 98 authentic luxury stone patterns across 4 collections:
 *   - Slate Stone Collection (50 patterns)
 *   - Sandstone Collection (22 patterns)
 *   - Marble Stone Collection (16 patterns)
 *   - Limestone Collection (10 patterns)
 *
 * Conforms to the exact Stone Tech OS design system:
 * - 3-column square aspect grid with smooth infinite batch scrolling
 * - Elegant hover overlay with product name, code, live factory rate & specs
 * - Architectural Lightbox Modal with uncropped high-res slab & installed render toggle
 * - One-click "Request Estimation" connecting directly to the lead form
 * - Multi-language PDF softcopy download (English, Hindi, Gujarati)
 */

import { useState, useMemo, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Search,
  Download,
  Share2,
  Sparkles,
  Eye,
  Layers,
  ShieldCheck,
  RotateCw,
  Maximize2,
  ArrowUpDown,
  FileDown,
  X,
  ChevronDown,
  ArrowRight,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import rawVeneerData from "@/data/stone-veneer-catalog.json";
import { CATALOG_ITEMS_BY_CODE } from "@/lib/i18n/catalogue-items-i18n";

export interface StoneVeneerItem {
  id: string;
  index: number;
  code: string;
  name: string;
  rawName: string;
  slug: string;
  collection: string;
  category: string;
  stoneType: string;
  pattern: string;
  image: string;
  sceneImage: string;
  standardSizes: string;
  thickness: string;
  weight: string;
  backing: string;
  bending: string;
  fire: string;
  applications: string[];
  finishes: string[];
  price: number;
  unit: string;
  badge: string;
  leadTime: string;
  desc: string;
}

const VENEER_PRODUCTS: StoneVeneerItem[] = rawVeneerData as StoneVeneerItem[];

interface StoneVeneerCatalogProps {
  onSelectProduct?: (productName: string) => void;
  className?: string;
  initialCollection?: string;
}

const TEXTS = {
  en: {
    heading: "Ultra-Thin Flexible Natural Stone Veneer",
    patternsCount: "Patterns",
    allCollections: "All Collections",
    searchPlaceholder: "Search 98 stone veneer patterns, colors, collections...",
    cataloguesBtn: "Catalogue (PDF)",
    downloadPdf: "Download PDF Catalogue",
    englishPdf: "English Edition (106 Pgs)",
    hindiPdf: "Hindi Edition · हिंदी (106 Pgs)",
    gujaratiPdf: "Gujarati Edition · ગુજરાતી (106 Pgs)",
    sortBy: "Sort by",
    sortDefault: "Default Sequence",
    sortName: "Name (A–Z)",
    sortPriceAsc: "Price (Low to High)",
    sortPriceDesc: "Price (High to Low)",
    requestEstimate: "Request Estimation for this Veneer",
    quickEstimate: "Quick Estimate",
    viewDetails: "View Details & Specs",
    specs: "Specifications",
    dimensions: "Standard Dimensions",
    thickness: "Thickness",
    weight: "Weight",
    bendingRadius: "Bending Radius",
    backing: "Backing Substrate",
    fireSafety: "Fire Rating",
    applications: "Recommended Applications",
    finishes: "Available Finishes",
    quarryRate: "Quarry Direct Rate",
    inStock: "Ready to Ship",
    shareWhatsApp: "Share on WhatsApp",
    noMatching: "No matching stone veneer patterns found",
    resetFilters: "Reset Filters",
  },
  hi: {
    heading: "अत्यंत पतली लचीली प्राकृतिक स्टोन विनियर",
    patternsCount: "पैटर्न्स",
    allCollections: "सभी संग्रह",
    searchPlaceholder: "९८ स्टोन विनियर पैटर्न्स, रंग या संग्रह खोजें...",
    cataloguesBtn: "कैटलॉग डाउनलोड (PDF)",
    downloadPdf: "PDF कैटलॉग डाउनलोड करें",
    englishPdf: "अंग्रेजी संस्करण (१०६ पेज)",
    hindiPdf: "हिंदी संस्करण · हिंदी (१०६ पेज)",
    gujaratiPdf: "गुजराती संस्करण · ગુજરાતી (૧૦૬ પેજ)",
    sortBy: "क्रमबद्ध करें",
    sortDefault: "डिफ़ॉल्ट क्रम",
    sortName: "नाम (A–Z)",
    sortPriceAsc: "मूल्य (कम से अधिक)",
    sortPriceDesc: "मूल्य (अधिक से कम)",
    requestEstimate: "इस विनियर हेतु अनुमान का अनुरोध करें",
    quickEstimate: "त्वरित अनुमान",
    viewDetails: "विवरण और विशेषताएं",
    specs: "तकनीकी विशेषताएं",
    dimensions: "मानक माप",
    thickness: "मोटाई",
    weight: "वजन",
    bendingRadius: "मोड़ने की क्षमता",
    backing: "सब्सट्रेट बैकिंग",
    fireSafety: "अग्नि सुरक्षा",
    applications: "उपयुक्त अनुप्रयोग",
    finishes: "उपलब्ध फिनिश",
    quarryRate: "सीधी खदान दर",
    inStock: "तत्काल शिपिंग हेतु उपलब्ध",
    shareWhatsApp: "व्हाट्सएप पर साझा करें",
    noMatching: "कोई मेल खाता पैटर्न नहीं मिला",
    resetFilters: "फ़िल्टर रीसेट करें",
  },
  gu: {
    heading: "અત્યંત પાતળી લચીલી કુદરતી સ્ટોન વિનિયર",
    patternsCount: "પેટર્ન",
    allCollections: "બધા સંગ્રહ",
    searchPlaceholder: "૯૮ સ્ટોન વિનિયર પેટર્ન, રંગ અથવા સંગ્રહ શોધો...",
    cataloguesBtn: "કેટલોગ ડાઉનલોડ (PDF)",
    downloadPdf: "PDF કેટલોગ ડાઉનલોડ કરો",
    englishPdf: "અંગ્રેજી આવૃત્તિ (૧૦૬ પેજ)",
    hindiPdf: "હિન્દી આવૃત્તિ · हिंदी (૧૦૬ પેજ)",
    gujaratiPdf: "ગુજરાતી આવૃત્તિ · ગુજરાતી (૧૦૬ પેજ)",
    sortBy: "ક્રમબદ્ધ કરો",
    sortDefault: "ડિફૉલ્ટ ક્રમ",
    sortName: "નામ (A–Z)",
    sortPriceAsc: "કિંમત (ઓછી થી વધુ)",
    sortPriceDesc: "કિંમત (વધુ થી ઓછી)",
    requestEstimate: "આ વિનિયર માટે અંદાજ મેળવો",
    quickEstimate: "ઝડપી અંદાજ",
    viewDetails: "વિગતો અને સ્પષ્ટીકરણો",
    specs: "ટેકનિકલ વિગતો",
    dimensions: "સ્ટાન્ડર્ડ માપ",
    thickness: "જાડાઈ",
    weight: "વજન",
    bendingRadius: "વાળવાની ત્રિજ્યા",
    backing: "બેકિંગ સબસ્ટ્રેટ",
    fireSafety: "અગ્નિ સુરક્ષા રેટિંગ",
    applications: "ઉપયોગી એપ્લિકેશન્સ",
    finishes: "ઉપલબ્ધ ફિનિશ",
    quarryRate: "સીધા ખાણ દર",
    inStock: "શિપિંગ માટે તૈયાર",
    shareWhatsApp: "વોટ્સએપ પર શેર કરો",
    noMatching: "કોઈ મેળ ખાતી પેટર્ન મળી નથી",
    resetFilters: "ફિલ્ટર્સ રીસેટ કરો",
  },
};

const INITIAL_BATCH = 18;
const BATCH_SIZE = 18;

export function StoneVeneerCatalog({
  onSelectProduct,
  className,
  initialCollection = "all",
}: StoneVeneerCatalogProps) {
  const { i18n } = useTranslation();
  const lang = (i18n.language?.substring(0, 2) || "en") as "en" | "hi" | "gu";
  const t = TEXTS[lang] || TEXTS.en;

  const [search, setSearch] = useState("");
  const [selectedCollection, setSelectedCollection] = useState<string>(initialCollection);
  const [sortBy, setSortBy] = useState<"index" | "name" | "price-asc" | "price-desc">("index");
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_BATCH);
  const [lightboxTarget, setLightboxTarget] = useState<StoneVeneerItem | null>(null);
  const [activeViewMode, setActiveViewMode] = useState<"slab" | "scene">("slab");
  const [imageRotation, setImageRotation] = useState<number>(0);
  const [isFullScreenZoom, setIsFullScreenZoom] = useState<boolean>(false);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Localized items
  const localizedItems = useMemo(() => {
    return VENEER_PRODUCTS.map((p) => {
      const loc = lang !== "en" ? CATALOG_ITEMS_BY_CODE[p.code] : undefined;
      const localizedName = (lang !== "en" && loc?.name?.[lang]) || p.name;
      const localizedCol = (lang !== "en" && loc?.category?.[lang]) || p.collection;
      return {
        ...p,
        name: localizedName,
        collection: localizedCol,
      };
    });
  }, [lang]);

  // Collections extraction
  const collections = useMemo(() => {
    const list = Array.from(new Set(localizedItems.map((p) => p.collection)));
    return ["all", ...list];
  }, [localizedItems]);

  // Filtered & Sorted items
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    const items = localizedItems.filter((item) => {
      if (selectedCollection !== "all" && item.collection !== selectedCollection) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.rawName.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.collection.toLowerCase().includes(q) ||
        item.stoneType.toLowerCase().includes(q) ||
        item.pattern.toLowerCase().includes(q)
      );
    });

    if (sortBy === "name") {
      return [...items].sort((a, b) => a.name.localeCompare(b.name));
    }
    if (sortBy === "price-asc") {
      return [...items].sort((a, b) => a.price - b.price);
    }
    if (sortBy === "price-desc") {
      return [...items].sort((a, b) => b.price - a.price);
    }
    return items;
  }, [search, selectedCollection, sortBy, localizedItems]);

  // Infinite scroll
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
      { root: container, rootMargin: "300px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredItems.length]);

  const visibleItems = useMemo(
    () => filteredItems.slice(0, visibleCount),
    [filteredItems, visibleCount],
  );

  const handleEstimateClick = (item: StoneVeneerItem) => {
    setLightboxTarget(null);
    if (onSelectProduct) {
      onSelectProduct(`${item.name} (${item.code}) - ${item.collection}`);
    }
  };

  const shareWhatsApp = (item: StoneVeneerItem) => {
    const text = encodeURIComponent(
      `Hello Stone Tech Team, I am interested in *${item.name}* (${item.code}) - ${item.collection}.\nSpecifications: ${item.standardSizes}, ${item.thickness}.\nPlease provide an estimation quote.`,
    );
    window.open(`https://api.whatsapp.com/send?phone=919825123456&text=${text}`, "_blank");
  };

  return (
    <div
      className={cn(
        "bg-card border border-border/70 rounded-2xl sm:rounded-3xl shadow-sm overflow-hidden p-4 sm:p-6 lg:p-8 space-y-6",
        className,
      )}
    >
      {/* 1. TOP HEADER & TOOLBAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <span>{t.heading}</span>
            </h3>
            <Badge variant="secondary" className="font-bold text-xs px-2.5 py-0.5 rounded-full">
              {filteredItems.length} {t.patternsCount}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            98 luxury flexible natural stone sheets split from authentic quarry rock · 100% genuine
            stone
          </p>
        </div>

        {/* Action Controls: PDF Catalogs & Sorters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Download Multi-Language PDF Catalog Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 font-bold text-xs border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
              >
                <FileDown className="h-4 w-4" />
                <span>{t.cataloguesBtn}</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-2 space-y-1">
              <DropdownMenuLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 py-1">
                {t.downloadPdf}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a
                  href="/catalogues/StoneTech_Stone_Veneer_Catalogue_English.pdf"
                  download="StoneTech_Stone_Veneer_Catalogue_English.pdf"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between text-xs font-semibold cursor-pointer py-2 px-2.5 rounded-md hover:bg-muted"
                >
                  <span className="flex items-center gap-2">
                    <Download className="h-3.5 w-3.5 text-primary" />
                    <span>{t.englishPdf}</span>
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    15.5 MB
                  </Badge>
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href="/catalogues/StoneTech_Stone_Veneer_Catalogue_Hindi.pdf"
                  download="StoneTech_Stone_Veneer_Catalogue_Hindi.pdf"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between text-xs font-semibold cursor-pointer py-2 px-2.5 rounded-md hover:bg-muted"
                >
                  <span className="flex items-center gap-2">
                    <Download className="h-3.5 w-3.5 text-primary" />
                    <span>{t.hindiPdf}</span>
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    15.0 MB
                  </Badge>
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href="/catalogues/StoneTech_Stone_Veneer_Catalogue_Gujarati.pdf"
                  download="StoneTech_Stone_Veneer_Catalogue_Gujarati.pdf"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between text-xs font-semibold cursor-pointer py-2 px-2.5 rounded-md hover:bg-muted"
                >
                  <span className="flex items-center gap-2">
                    <Download className="h-3.5 w-3.5 text-primary" />
                    <span>{t.gujaratiPdf}</span>
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    15.0 MB
                  </Badge>
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Select
            value={sortBy}
            onValueChange={(val: "index" | "name" | "price-asc" | "price-desc") => setSortBy(val)}
          >
            <SelectTrigger className="h-9 text-xs w-[160px] gap-1.5 font-medium">
              <ArrowUpDown className="h-3.5 w-3.5 opacity-60 shrink-0" />
              <SelectValue placeholder={t.sortBy} />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="index">{t.sortDefault}</SelectItem>
              <SelectItem value="name">{t.sortName}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 2. FILTERS: SEARCH BAR + COLLECTION PILLS */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="pl-9 h-10 text-xs sm:text-sm bg-background/80"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Collection Filter Tabs / Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {collections.map((coll) => {
            const isAll = coll === "all";
            const isSelected = selectedCollection === coll;
            const count = isAll
              ? VENEER_PRODUCTS.length
              : VENEER_PRODUCTS.filter((p) => p.collection === coll).length;

            return (
              <button
                key={coll}
                type="button"
                onClick={() => setSelectedCollection(coll)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer",
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <span>
                  {isAll
                    ? t.allCollections
                    : coll.replace(" Stone Collection", "").replace(" Collection", "")}
                </span>
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full font-mono",
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
      </div>

      {/* 3. SQUEEZED PRODUCT GRID (Unconstrained Flow without inner scroll trap) */}
      <div ref={scrollContainerRef} className="rounded-2xl pb-2">
        {filteredItems.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <p className="text-sm font-semibold text-muted-foreground">{t.noMatching}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setSelectedCollection("all");
              }}
            >
              {t.resetFilters}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-2.5 sm:gap-3">
            {visibleItems.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => {
                  setLightboxTarget(item);
                  setActiveViewMode("slab");
                  setImageRotation(0);
                }}
                className="group relative aspect-square rounded-xl sm:rounded-2xl overflow-hidden cursor-pointer bg-stone-900/95 dark:bg-black border border-border/60 hover:border-amber-500/50 shadow-2xs hover:shadow-md transition-all duration-300 flex items-center justify-center p-1 sm:p-2"
              >
                {/* Product Image */}
                <img
                  src={item.image}
                  alt={item.name}
                  loading={idx < 9 ? "eager" : "lazy"}
                  decoding="async"
                  className="w-full h-full object-cover rounded-lg sm:rounded-xl transition-transform duration-500 group-hover:scale-105"
                />

                {/* Top Badge: Stone Collection Tag */}
                <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
                  <Badge className="bg-black/75 hover:bg-black/90 backdrop-blur-md text-[10px] text-white border-white/20 font-semibold px-2 py-0.5">
                    {item.stoneType}
                  </Badge>
                </div>

                {/* Bottom Hover Overlay with Details & Quick Estimate Button */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-2.5 sm:p-3.5 pt-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end gap-1.5 z-10">
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold truncate text-white">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-stone-300 truncate font-mono">
                        {item.code} · {item.thickness}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] font-bold text-amber-400">
                        {lang === "gu" ? "વિનંતી પર" : lang === "hi" ? "अनुरोध पर" : "On Request"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 pt-1">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEstimateClick(item);
                      }}
                      className="flex-1 h-7 text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-stone-950 gap-1 rounded-lg"
                    >
                      <span>{t.quickEstimate}</span>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxTarget(item);
                        setActiveViewMode("slab");
                      }}
                      className="h-7 px-2 text-[11px] border-white/20 bg-white/10 hover:bg-white/20 text-white rounded-lg"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More Button — Manual control to prevent infinite scroll bounce & traps */}
        {visibleItems.length < filteredItems.length && (
          <div className="py-6 text-center flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVisibleCount((prev) => Math.min(prev + 18, filteredItems.length))}
              className="h-8 text-xs cursor-pointer border-amber-500/30 font-semibold"
            >
              Load More Varieties ({filteredItems.length - visibleItems.length} remaining)
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

      {/* 4. ARCHITECTURAL LIGHTBOX MODAL DIALOG */}
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
          <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-2xl sm:rounded-3xl border-border bg-card">
            <div className="grid grid-cols-1 md:grid-cols-2 max-h-[85vh] overflow-y-auto">
              {/* Left Column: Full Uncropped High-Res Image Display */}
              <div className="relative bg-stone-950 dark:bg-black p-4 flex flex-col items-center justify-center min-h-[320px] md:min-h-[480px]">
                {/* View Switcher: Pure Slab Texture vs Installed Architectural Scene */}
                <div className="absolute top-3 left-3 z-20 flex items-center gap-1 bg-black/75 backdrop-blur-md rounded-xl p-0.5 border border-white/15">
                  <button
                    type="button"
                    onClick={() => setActiveViewMode("slab")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                      activeViewMode === "slab"
                        ? "bg-amber-500 text-stone-950 font-bold"
                        : "text-stone-300 hover:text-white",
                    )}
                  >
                    Natural Slab
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveViewMode("scene")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                      activeViewMode === "scene"
                        ? "bg-amber-500 text-stone-950 font-bold"
                        : "text-stone-300 hover:text-white",
                    )}
                  >
                    Architectural Scene
                  </button>
                </div>

                {/* Lossless 90° Rotation Tool */}
                <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setImageRotation((prev) => (prev + 90) % 360)}
                    className="p-1.5 bg-black/75 hover:bg-black text-white rounded-xl backdrop-blur-md border border-white/15 cursor-pointer transition-colors"
                    title="Rotate 90°"
                  >
                    <RotateCw className="h-4 w-4" />
                  </button>
                </div>

                {/* Displayed Image */}
                <div className="w-full h-full flex items-center justify-center overflow-hidden p-2">
                  <img
                    src={
                      activeViewMode === "slab" ? lightboxTarget.image : lightboxTarget.sceneImage
                    }
                    alt={lightboxTarget.name}
                    style={{ transform: `rotate(${imageRotation}deg)` }}
                    className={cn(
                      "max-h-[380px] md:max-h-[440px] w-auto max-w-full object-contain rounded-xl transition-transform duration-300",
                      isFullScreenZoom && "scale-125 cursor-zoom-out",
                    )}
                    onClick={() => setIsFullScreenZoom((prev) => !prev)}
                  />
                </div>

                <div className="absolute bottom-3 inset-x-0 text-center pointer-events-none">
                  <span className="text-[11px] text-stone-400 bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs">
                    {activeViewMode === "slab"
                      ? "High-Definition 100% Real Natural Stone Sheet"
                      : "Executed Architectural Installation"}
                  </span>
                </div>
              </div>

              {/* Right Column: Full Specifications & Estimation Action */}
              <div className="p-5 sm:p-6 space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-amber-500 text-stone-950 font-bold text-[11px]">
                        {lightboxTarget.collection}
                      </Badge>
                      <Badge variant="outline" className="font-mono text-[11px]">
                        {lightboxTarget.code}
                      </Badge>
                    </div>
                    <DialogTitle className="text-xl sm:text-2xl font-black text-foreground">
                      {lightboxTarget.name}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-1">
                      {lightboxTarget.desc}
                    </DialogDescription>
                  </div>

                  {/* Benchmark Quarry Price */}
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                        {lang === "gu"
                          ? "વાસ્તુશિલ્પીય ભાવ પરામર્શ"
                          : lang === "hi"
                            ? "वास्तुशिल्पीय मूल्य परामर्श"
                            : "Architectural Pricing"}
                      </p>
                      <p className="text-base font-bold text-foreground">
                        {lang === "gu"
                          ? "વિનંતી પર ભાવ ઉપલબ્ધ"
                          : lang === "hi"
                            ? "अनुरोध पर मूल्य उपलब्ध"
                            : "Price on Request"}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs font-semibold">
                      {t.inStock}
                    </Badge>
                  </div>

                  {/* Technical Specifications Table */}
                  <div className="space-y-2 text-xs">
                    <p className="font-bold text-foreground text-xs uppercase tracking-wider text-muted-foreground">
                      {t.specs}
                    </p>
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-muted/60 border border-border/50 text-[11px]">
                      <div>
                        <span className="text-muted-foreground block">{t.dimensions}</span>
                        <span className="font-semibold text-foreground">
                          {lightboxTarget.standardSizes}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">{t.thickness}</span>
                        <span className="font-semibold text-foreground">
                          {lightboxTarget.thickness}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">{t.weight}</span>
                        <span className="font-semibold text-foreground">
                          {lightboxTarget.weight}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">{t.bendingRadius}</span>
                        <span className="font-semibold text-foreground">
                          {lightboxTarget.bending}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground block">{t.backing}</span>
                        <span className="font-semibold text-foreground">
                          {lightboxTarget.backing}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground block">{t.fireSafety}</span>
                        <span className="font-semibold text-foreground">{lightboxTarget.fire}</span>
                      </div>
                    </div>
                  </div>

                  {/* Recommended Applications */}
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      {t.applications}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {lightboxTarget.applications.map((app) => (
                        <span
                          key={app}
                          className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-medium text-foreground"
                        >
                          {app}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom Actions: Request Estimation + WhatsApp */}
                <div className="pt-3 border-t border-border/60 space-y-2">
                  <Button
                    onClick={() => handleEstimateClick(lightboxTarget)}
                    className="w-full h-11 text-xs sm:text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-2 rounded-xl shadow-md cursor-pointer"
                  >
                    <span>{t.requestEstimate}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => shareWhatsApp(lightboxTarget)}
                    className="w-full h-9 text-xs font-semibold gap-2 border-[#006788]/30 text-[#015474] dark:text-[#67e8f9] hover:bg-[#e0f1f5]/60 rounded-xl cursor-pointer"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    <span>{t.shareWhatsApp}</span>
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

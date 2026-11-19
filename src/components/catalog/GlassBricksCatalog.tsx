/**
 * GlassBricksCatalog.tsx
 *
 * Architectural Product Catalogue for Hollow & Solid Glass Bricks.
 * Covers 67 architectural patterns:
 *   - 38 Architectural Hollow Glass Bricks (Soundproof, Thermal & Daylighting)
 *   - 29 Solid Crystal Glass Bricks (Refractive Luxury Masonry & Lighted Bars)
 *
 * Capabilities:
 * - 3-column square aspect grid with smooth infinite batch scrolling
 * - Elegant hover overlay with product name, code, series & factory rates
 * - Architectural Lightbox Modal with toggle between Brick Macro & Live Lighting Scene
 * - One-click "Request Estimation" connecting directly to the lead form
 * - Direct download for Solid (36 pgs) and Hollow (47 pgs) 2026 Master Catalogues
 */

import { useState, useMemo, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Search,
  Download,
  Share2,
  Sparkles,
  Eye,
  ShieldCheck,
  RotateCw,
  ArrowUpDown,
  FileDown,
  X,
  ChevronDown,
  ArrowRight,
  Sun,
  VolumeX,
  ShieldAlert,
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
import { cn } from "@/lib/utils";
import rawGlassData from "@/data/glass-bricks-catalog.json";
import { CATALOG_ITEMS_BY_CODE } from "@/lib/i18n/catalogue-items-i18n";
import { toIndicDigits } from "@/lib/format";

export interface GlassBrickItem {
  id: string;
  index: number;
  code: string;
  name: string;
  slug: string;
  series: "Hollow Glass Bricks" | "Solid Glass Bricks";
  category: string;
  type: string;
  collection: string;
  image: string;
  sceneImage: string;
  standardSizes: string;
  thickness: string;
  weight: string;
  packing: string;
  lightTransmission: string;
  soundInsulation: string;
  thermalInsulation: string;
  fireRating: string;
  compressiveStrength: string;
  refractiveIndex?: string;
  applications: string[];
  finishes: string[];
  price: number;
  unit: string;
  badge: string;
  leadTime: string;
  desc: string;
}

const GLASS_PRODUCTS: GlassBrickItem[] = rawGlassData as GlassBrickItem[];

interface GlassBricksCatalogProps {
  onSelectProduct?: (productName: string) => void;
  className?: string;
  initialSeries?: string;
}

const TEXTS = {
  en: {
    heading: "Architectural Glass Bricks & Crystal Masonry",
    patternsCount: "Patterns",
    allSeries: "All Series",
    hollowSeries: "Hollow Glass Bricks (38)",
    solidSeries: "Solid Crystal Bricks (29)",
    searchPlaceholder: "Search 67 glass brick patterns, sizes, acoustics...",
    cataloguesBtn: "Catalogues (PDF)",
    downloadPdf: "Download Official Catalogues",
    solidPdf: "Solid Crystal Bricks (36 Pgs)",
    hollowPdf: "Hollow Glass Bricks (47 Pgs)",
    sortBy: "Sort by",
    sortDefault: "Default Sequence",
    sortName: "Name (A–Z)",
    sortPriceAsc: "Price (Low to High)",
    sortPriceDesc: "Price (High to Low)",
    requestEstimate: "Request Estimation for this Glass Brick",
    quickEstimate: "Quick Estimate",
    viewDetails: "View Details & Specs",
    specs: "Technical Engineering Specs",
    dimensions: "Standard Dimensions",
    thickness: "Thickness",
    weight: "Weight / Unit",
    lightTransmission: "Light Transmission",
    soundInsulation: "Acoustic Insulation",
    fireRating: "Fire Safety Rating",
    compressiveStrength: "Compressive Strength",
    applications: "Recommended Applications",
    finishes: "Available Optical Finishes",
    quarryRate: "Direct Factory Benchmark",
    inStock: "Ready to Ship",
    shareWhatsApp: "Share on WhatsApp",
    noMatching: "No matching glass brick patterns found",
    resetFilters: "Reset Filters",
  },
  hi: {
    heading: "वास्तुशिल्पीय कांच की ईंटें एवं क्रिस्टल चिनाई",
    patternsCount: "पैटर्न्स",
    allSeries: "सभी सीरीज़",
    hollowSeries: "खोखली कांच की ईंटें (३८)",
    solidSeries: "ठोस क्रिस्टल कांच ईंटें (२९)",
    searchPlaceholder: "६७ ग्लास ब्रिक्स पैटर्न्स, माप या विशेषताएं खोजें...",
    cataloguesBtn: "कैटलॉग डाउनलोड (PDF)",
    downloadPdf: "आधिकारिक कैटलॉग डाउनलोड करें",
    solidPdf: "ठोस क्रिस्टल कांच ईंटें (३६ पेज)",
    hollowPdf: "खोखली कांच की ईंटें (४७ पेज)",
    sortBy: "क्रमबद्ध करें",
    sortDefault: "डिफ़ॉल्ट क्रम",
    sortName: "नाम (A–Z)",
    sortPriceAsc: "मूल्य (कम से अधिक)",
    sortPriceDesc: "मूल्य (अधिक से कम)",
    requestEstimate: "इस ग्लास ब्रिक हेतु अनुमान का अनुरोध करें",
    quickEstimate: "त्वरित अनुमान",
    viewDetails: "विवरण और विशेषताएं",
    specs: "इंजीनियरिंग विनिर्देश",
    dimensions: "मानक माप",
    thickness: "मोटाई",
    weight: "वजन / इकाई",
    lightTransmission: "प्रकाश संप्रेषण",
    soundInsulation: "ध्वनि इन्सुलेशन",
    fireRating: "अग्नि सुरक्षा रેટिंग",
    compressiveStrength: "लोड वहन क्षमता",
    applications: "उपयुक्त अनुप्रयोग",
    finishes: "ऑप्टिकल फिनिश",
    quarryRate: "सीधी फैक्ट्री दर",
    inStock: "तत्काल शिपिंग हेतु उपलब्ध",
    shareWhatsApp: "व्हाट्सएप पर साझा करें",
    noMatching: "कोई मेल खाता पैटर्न नहीं मिला",
    resetFilters: "फ़िल्टर रीसेट करें",
  },
  gu: {
    heading: "વાસ્તુશિલ્પીય કાચની ઈંટો અને ક્રિસ્ટલ ચણતર",
    patternsCount: "પેટર્ન",
    allSeries: "બધી સિરીઝ",
    hollowSeries: "પોલી કાચની ઈંટો (૩૮)",
    solidSeries: "નક્કર ક્રિસ્ટલ કાચ ઈંટો (૨૯)",
    searchPlaceholder: "૬૭ ગ્લાસ બ્રિક્સ પેટર્ન, માપ અથવા વિશેષતાઓ શોધો...",
    cataloguesBtn: "કેટલોગ ડાઉનલોડ (PDF)",
    downloadPdf: "સત્તાવાર કેટલોગ ડાઉનલોડ કરો",
    solidPdf: "નક્કર ક્રિસ્ટલ કાચ ઈંટો (૩૬ પેજ)",
    hollowPdf: "પોલી કાચની ઈંટો (૪૭ પેજ)",
    sortBy: "ક્રમબદ્ધ કરો",
    sortDefault: "ડિફૉલ્ટ ક્રમ",
    sortName: "નામ (A–Z)",
    sortPriceAsc: "કિંમત (ઓછી થી વધુ)",
    sortPriceDesc: "કિંમત (વધુ થી ઓછી)",
    requestEstimate: "આ ગ્લાસ બ્રિક માટે અંદાજ મેળવો",
    quickEstimate: "ઝડપી અંદાજ",
    viewDetails: "વિગતો અને સ્પષ્ટીકરણો",
    specs: "એન્જિનિયરિંગ વિગતો",
    dimensions: "સ્ટાન્ડર્ડ માપ",
    thickness: "જાડાઈ",
    weight: "વજન / નંગ",
    lightTransmission: "પ્રકાશ પ્રસારણ",
    soundInsulation: "ધ્વનિ ઇન્સ્યુલેશન",
    fireRating: "અગ્નિ સુરક્ષા રેટિંગ",
    compressiveStrength: "લોડ ક્ષમતા",
    applications: "ઉપયોગી એપ્લિકેશન્સ",
    finishes: "ઓપ્ટિકલ ફિનિશ",
    quarryRate: "સીધા ફેક્ટરી દર",
    inStock: "શિપિંગ માટે તૈયાર",
    shareWhatsApp: "વોટ્સએપ પર શેર કરો",
    noMatching: "કોઈ મેળ ખાતી પેટર્ન મળી નથી",
    resetFilters: "ફિલ્ટર્સ રીસેટ કરો",
  },
};

const INITIAL_BATCH = 18;
const BATCH_SIZE = 18;

export function GlassBricksCatalog({
  onSelectProduct,
  className,
  initialSeries = "all",
}: GlassBricksCatalogProps) {
  const { i18n } = useTranslation();
  const lang = (i18n.language?.substring(0, 2) || "en") as "en" | "hi" | "gu";
  const t = TEXTS[lang] || TEXTS.en;

  const [search, setSearch] = useState("");
  const [selectedSeries, setSelectedSeries] = useState<string>(initialSeries);
  const [sortBy, setSortBy] = useState<"index" | "name" | "price-asc" | "price-desc">("index");
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_BATCH);
  const [lightboxTarget, setLightboxTarget] = useState<GlassBrickItem | null>(null);
  const [activeViewMode, setActiveViewMode] = useState<"brick" | "scene">("brick");
  const [imageRotation, setImageRotation] = useState<number>(0);
  const [isFullScreenZoom, setIsFullScreenZoom] = useState<boolean>(false);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const getBrickName = (item: GlassBrickItem) => {
    if (lang !== "en" && CATALOG_ITEMS_BY_CODE[item.code]?.name?.[lang]) {
      return CATALOG_ITEMS_BY_CODE[item.code].name[lang];
    }
    return item.name;
  };

  // Filtered & Sorted items
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    const items = GLASS_PRODUCTS.filter((item) => {
      if (selectedSeries !== "all" && item.series !== selectedSeries) return false;
      if (!q) return true;
      const localizedName = getBrickName(item).toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        localizedName.includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q) ||
        item.collection.toLowerCase().includes(q) ||
        item.standardSizes.toLowerCase().includes(q)
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
  }, [search, selectedSeries, sortBy]);

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

  const handleEstimateClick = (item: GlassBrickItem) => {
    setLightboxTarget(null);
    if (onSelectProduct) {
      onSelectProduct(`${item.name} (${item.code}) - ${item.series}`);
    }
  };

  const shareWhatsApp = (item: GlassBrickItem) => {
    const text = encodeURIComponent(
      `Hello Stone Tech Team, I am interested in *${item.name}* (${item.code}) - ${item.series}.\nSize: ${item.standardSizes}, ${item.thickness}.\nPlease provide an estimation quote.`,
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
              <Sparkles className="h-5 w-5 text-cyan-500" />
              <span>{t.heading}</span>
            </h3>
            <Badge variant="secondary" className="font-bold text-xs px-2.5 py-0.5 rounded-full">
              {filteredItems.length} {t.patternsCount}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Acoustic dual-chamber hollow glass blocks & heavy-duty solid optical crystal bricks for
            luminous architecture
          </p>
        </div>

        {/* Action Controls: PDF Catalogs & Sorters */}
        <div className="flex items-center gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 font-bold text-xs border-cyan-500/30 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10"
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
                  href="/catalogues/StoneTech_Solid_Glass_Bricks_Catalogue_2026.pdf"
                  download="StoneTech_Solid_Glass_Bricks_Catalogue_2026.pdf"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between text-xs font-semibold cursor-pointer py-2 px-2.5 rounded-md hover:bg-muted"
                >
                  <span className="flex items-center gap-2">
                    <Download className="h-3.5 w-3.5 text-cyan-600" />
                    <span>{t.solidPdf}</span>
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    9.0 MB
                  </Badge>
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href="/catalogues/StoneTech_Glass_Bricks_Catalogue_2026.pdf"
                  download="StoneTech_Glass_Bricks_Catalogue_2026.pdf"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between text-xs font-semibold cursor-pointer py-2 px-2.5 rounded-md hover:bg-muted"
                >
                  <span className="flex items-center gap-2">
                    <Download className="h-3.5 w-3.5 text-cyan-600" />
                    <span>{t.hollowPdf}</span>
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    6.4 MB
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

      {/* 2. FILTERS: SEARCH BAR + SERIES PILLS */}
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

        {/* Series Filter Tabs / Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedSeries("all")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer",
              selectedSeries === "all"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <span>{t.allSeries}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-background/80">
              {GLASS_PRODUCTS.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedSeries("Hollow Glass Bricks")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer",
              selectedSeries === "Hollow Glass Bricks"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <span>{t.hollowSeries}</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedSeries("Solid Glass Bricks")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer",
              selectedSeries === "Solid Glass Bricks"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <span>{t.solidSeries}</span>
          </button>
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
                setSelectedSeries("all");
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
                  setActiveViewMode("brick");
                  setImageRotation(0);
                }}
                className="group relative aspect-square rounded-xl sm:rounded-2xl overflow-hidden cursor-pointer bg-stone-900/95 dark:bg-black border border-border/60 hover:border-cyan-500/50 shadow-2xs hover:shadow-md transition-all duration-300 flex items-center justify-center p-1 sm:p-2"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  loading={idx < 9 ? "eager" : "lazy"}
                  decoding="async"
                  className="w-full h-full object-contain rounded-lg sm:rounded-xl transition-transform duration-500 group-hover:scale-105"
                />

                {/* Top Badge: Series Tag */}
                <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
                  <Badge className="bg-black/75 hover:bg-black/90 backdrop-blur-md text-[10px] text-cyan-300 border-white/20 font-semibold px-2 py-0.5">
                    {item.series === "Solid Glass Bricks"
                      ? lang === "gu"
                        ? "નક્કર કાચ"
                        : lang === "hi"
                          ? "ठोस कांच"
                          : "Solid Crystal"
                      : lang === "gu"
                        ? "પોલી કાચ"
                        : lang === "hi"
                          ? "खोखली कांच"
                          : "Hollow Block"}
                  </Badge>
                </div>

                {/* Bottom Hover Overlay with Details & Quick Estimate Button */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-2.5 sm:p-3.5 pt-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end gap-1.5 z-10">
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold truncate text-white">
                        {getBrickName(item)}
                      </p>
                      <p className="text-[10px] text-cyan-200 truncate font-mono">
                        {item.code} · {toIndicDigits(item.standardSizes, lang)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] font-bold text-cyan-300">
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
                      className="flex-1 h-7 text-[11px] font-bold bg-cyan-500 hover:bg-cyan-600 text-stone-950 gap-1 rounded-lg"
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
                        setActiveViewMode("brick");
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
              className="h-8 text-xs cursor-pointer border-cyan-500/30 font-semibold"
            >
              Load More Designs ({filteredItems.length - visibleItems.length} remaining)
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
              {/* Left Column: Full Uncropped Image with Brick vs Installed Scene Switcher */}
              <div className="relative bg-stone-950 dark:bg-black p-4 flex flex-col items-center justify-center min-h-[320px] md:min-h-[480px]">
                {/* View Switcher: Pure Brick vs Installed Architectural Scene */}
                <div className="absolute top-3 left-3 z-20 flex items-center gap-1 bg-black/75 backdrop-blur-md rounded-xl p-0.5 border border-white/15">
                  <button
                    type="button"
                    onClick={() => setActiveViewMode("brick")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                      activeViewMode === "brick"
                        ? "bg-cyan-500 text-stone-950 font-bold"
                        : "text-stone-300 hover:text-white",
                    )}
                  >
                    Glass Brick
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveViewMode("scene")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                      activeViewMode === "scene"
                        ? "bg-cyan-500 text-stone-950 font-bold"
                        : "text-stone-300 hover:text-white",
                    )}
                  >
                    Lighting Scene
                  </button>
                </div>

                {/* 90° Rotation Tool */}
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

                {/* Image Display */}
                <div className="w-full h-full flex items-center justify-center overflow-hidden p-2">
                  <img
                    src={
                      activeViewMode === "brick" ? lightboxTarget.image : lightboxTarget.sceneImage
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
                  <span className="text-[11px] text-cyan-200 bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs">
                    {activeViewMode === "brick"
                      ? "High-Refractive Architectural Glass Unit"
                      : "Executed Architectural Lighting Installation"}
                  </span>
                </div>
              </div>

              {/* Right Column: Full Specifications & Actions */}
              <div className="p-5 sm:p-6 space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-cyan-500 text-stone-950 font-bold text-[11px]">
                        {lightboxTarget.series}
                      </Badge>
                      <Badge variant="outline" className="font-mono text-[11px]">
                        {lightboxTarget.code}
                      </Badge>
                    </div>
                    <DialogTitle className="text-xl sm:text-2xl font-black text-foreground">
                      {getBrickName(lightboxTarget)}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-1">
                      {lightboxTarget.desc}
                    </DialogDescription>
                  </div>

                  {/* Benchmark Factory Price */}
                  <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider">
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

                  {/* Engineering Specifications Table */}
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
                        <span className="text-muted-foreground block">{t.lightTransmission}</span>
                        <span className="font-semibold text-foreground">
                          {lightboxTarget.lightTransmission}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground block">{t.soundInsulation}</span>
                        <span className="font-semibold text-foreground">
                          {lightboxTarget.soundInsulation}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground block">{t.compressiveStrength}</span>
                        <span className="font-semibold text-foreground">
                          {lightboxTarget.compressiveStrength}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Applications */}
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

                {/* Bottom Actions */}
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
                    className="w-full h-9 text-xs font-semibold gap-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-xl cursor-pointer"
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

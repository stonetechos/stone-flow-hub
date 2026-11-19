/**
 * StonePebblesCatalog.tsx
 *
 * Architectural Master Catalogue for Natural Stone Pebbles & Semi-Precious Aggregates.
 * Displays 75 authentic curated items:
 *   - Semi-Precious Agates (Rose Quartz, Crystal Quartz, African Amethyst, Lapis Lazuli, etc.)
 *   - Translucent Onyx Pebbles (White Glaze, Blue, Orange, Pink, Cherry, Purple, Soft Lime, etc.)
 *   - Landscape & Riverbed Stones (Elegant Black, California UG, Arabian Dunes, White Dew, etc.)
 *   - Monumental Jumbo Boulders & Flat Stepping Discs (80-180mm Boulders, Smooth Steppers)
 *   - Precision Mini Pebbles & Architectural Chips (Navratna Mini, Nano White, Marble & Kota Chips)
 *   - Decorative & Specialty Art Aggregates (Stone Spheres, Hand Painted, Arcobaleno)
 *
 * Capabilities:
 * - 3-column / 4-column responsive square aspect ratio grid with lazy loading
 * - Clean hover overlay with product name, mineral code, sizes & benchmark rates
 * - Architectural Lightbox Modal with high-definition square imagery, sizes, mineralogy & applications
 * - One-click "Request Estimation" triggering the parent estimation request flow
 * - Direct download of Stone Tech Stone Pebbles 2026 Master Catalogue (PDF)
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
  Maximize2,
  CircleDot,
  Check,
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
import rawCatalogData from "@/data/stone-pebbles-catalog.json";

export interface StonePebbleItem {
  id: string;
  index: number;
  code: string;
  name: string;
  fullName: string;
  slug: string;
  category: string;
  mineral: string;
  finish: string;
  sizes: string;
  color: string;
  image: string;
  price: number;
  unit: string;
  hardness: string;
  applications: string[];
  packaging: string;
  leadTime: string;
  badge: string;
  desc: string;
}

const PEBBLES_DATA: StonePebbleItem[] = rawCatalogData as StonePebbleItem[];

export interface StonePebblesCatalogProps {
  onSelectProduct?: (productDescription: string) => void;
  className?: string;
  initialCategory?: string;
}

const TEXTS = {
  en: {
    heading: "Natural Stone Pebbles & Semi-Precious Aggregates",
    subheading:
      "75 curated river stones, translucent onyx, precious agates, monumental boulders and architectural micro-chips.",
    patternsCount: "Varieties",
    allCategories: "All Collections (75)",
    searchPlaceholder: "Search 75 stone pebbles, rose quartz, onyx, river black, jumbo...",
    cataloguesBtn: "Catalogue (PDF)",
    downloadPdf: "Download Master Catalogue",
    catalogue2026: "Stone Pebbles 2026 Master Edition (23 Pgs)",
    sortBy: "Sort by",
    sortDefault: "Catalogue Sequence",
    sortName: "Name (A–Z)",
    sortPriceAsc: "Price (Low to High)",
    sortPriceDesc: "Price (High to Low)",
    requestEstimate: "Request Estimation for this Pebble Variety",
    quickEstimate: "Quick Estimate",
    viewDetails: "View Details & Specs",
    specs: "Architectural & Mineral Specifications",
    availableSizes: "Available Size Grades",
    mineralFamily: "Mineralogical Family",
    mohsHardness: "Mohs Hardness",
    surfaceFinish: "Surface Finish & Luster",
    colorTone: "Natural Color Tone",
    applications: "Recommended Architectural Applications",
    packaging: "Standard Export Packaging",
    quarryRate: "Direct Factory Benchmark",
    inStock: "In Stock · Ready to Dispatch",
    shareWhatsApp: "Share on WhatsApp",
    noMatching: "No matching stone pebble varieties found",
    resetFilters: "Reset Filters",
  },
  hi: {
    heading: "प्राकृतिक स्टोन पेबल्स एवं सेमी-प्रेशियस एग्रीगेट्स",
    subheading:
      "७५ चयनित प्राकृतिक नदी पत्थर, पारभासी गोमेद, कीमती अकीक, विशाल बोल्डर एवं माइक्रो-चिप्स।",
    patternsCount: "प्रकार",
    allCategories: "सभी संग्रह (७५)",
    searchPlaceholder: "७५ स्टोन पेबल्स, रोज़ क्वार्ट्ज, गोमेद, ब्लैक रिवर खोजें...",
    cataloguesBtn: "कैटलॉग डाउनलोड (PDF)",
    downloadPdf: "मास्टर कैटलॉग डाउनलोड करें",
    catalogue2026: "स्टोन पेबल्स कैटलॉग २०२६ (२३ पेज)",
    sortBy: "क्रमबद्ध करें",
    sortDefault: "कैटलॉग क्रम",
    sortName: "नाम (A–Z)",
    sortPriceAsc: "मूल्य (कम से अधिक)",
    sortPriceDesc: "मूल्य (अधिक से कम)",
    requestEstimate: "इस पेबल वेरायटी हेतु अनुमान का अनुरोध करें",
    quickEstimate: "त्वरित अनुमान",
    viewDetails: "विवरण और विशेषताएं",
    specs: "वास्तुशिल्प एवं खनिज विनिर्देश",
    availableSizes: "उपलब्ध माप",
    mineralFamily: "खनिज परिवार",
    mohsHardness: "मोह कठोरता",
    surfaceFinish: "सतह फिनिश",
    colorTone: "प्राकृतिक रंग टोन",
    applications: "उपयुक्त वास्तु अनुप्रयोग",
    packaging: "मानक निर्यात पैकेजिंग",
    quarryRate: "सीधी फैक्ट्री दर",
    inStock: "तत्काल शिपिंग हेतु उपलब्ध",
    shareWhatsApp: "व्हाट्सएप पर साझा करें",
    noMatching: "कोई मेल खाता पेबल प्रकार नहीं मिला",
    resetFilters: "फ़िल्टर रीसेट करें",
  },
  gu: {
    heading: "કુદરતી સ્ટોન પેબલ્સ અને સેમી-પ્રેશિયસ એગ્રીગેટ્સ",
    subheading:
      "૭૫ પસંદ કરેલા નદીના પથ્થરો, ઓનિક્સ, અકીક, વિશાળ પથ્થરો અને આર્કિટેક્ચરલ માઇક્રો-ચિપ્સ.",
    patternsCount: "પ્રકારો",
    allCategories: "બધા સંગ્રહ (૭૫)",
    searchPlaceholder: "૭૫ સ્ટોન પેબલ્સ, રોઝ ક્વાર્ટ્ઝ, ઓનિક્સ, રિવર બ્લેક શોધો...",
    cataloguesBtn: "કેટલોગ ડાઉનલોડ (PDF)",
    downloadPdf: "માસ્ટર કેટલોગ ડાઉનલોડ કરો",
    catalogue2026: "સ્ટોન પેબલ્સ કેટલોગ ૨૦૨૬ (૨૩ પેજ)",
    sortBy: "ક્રમબદ્ધ કરો",
    sortDefault: "કેટલોગ ક્રમ",
    sortName: "નામ (A–Z)",
    sortPriceAsc: "કિંમત (ઓછી થી વધુ)",
    sortPriceDesc: "કિંમત (વધુ થી ઓછી)",
    requestEstimate: "આ પેબલ માટે અંદાજ મેળવો",
    quickEstimate: "ઝડપી અંદાજ",
    viewDetails: "વિગતો અને સ્પષ્ટીકરણો",
    specs: "આર્કિટેક્ચરલ અને ખનિજ વિગતો",
    availableSizes: "ઉપલબ્ધ માપ",
    mineralFamily: "ખનિજ પરિવાર",
    mohsHardness: "મોહ કઠિનતા",
    surfaceFinish: "સપાટી ફિનિશ",
    colorTone: "કુદરતી રંગ",
    applications: "ઉપયોગી એપ્લિકેશન્સ",
    packaging: "સ્ટાન્ડર્ડ પેકેજિંગ",
    quarryRate: "સીધા ફેક્ટરી દર",
    inStock: "શિપિંગ માટે તૈયાર",
    shareWhatsApp: "વોટ્સએપ પર શેર કરો",
    noMatching: "કોઈ મેળ ખાતી પેબલ મળી નથી",
    resetFilters: "ફિલ્ટર્સ રીસેટ કરો",
  },
};

const INITIAL_BATCH = 18;
const BATCH_SIZE = 18;

export function StonePebblesCatalog({
  onSelectProduct,
  className = "",
  initialCategory = "all",
}: StonePebblesCatalogProps) {
  const { i18n } = useTranslation();
  const lang = (i18n.language?.substring(0, 2) || "en") as "en" | "hi" | "gu";
  const t = TEXTS[lang] || TEXTS.en;

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [sortBy, setSortBy] = useState<"index" | "name" | "price-asc" | "price-desc">("index");
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_BATCH);
  const [lightboxTarget, setLightboxTarget] = useState<StonePebbleItem | null>(null);

  const loaderRef = useRef<HTMLDivElement>(null);

  // Derive dynamic category pills with counts
  const categoriesList = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of PEBBLES_DATA) {
      map.set(item.category, (map.get(item.category) || 0) + 1);
    }
    return Array.from(map.entries()).map(([cat, count]) => ({
      key: cat,
      label: `${cat} (${count})`,
      count,
    }));
  }, []);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    const result = PEBBLES_DATA.filter((item) => {
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.code.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.mineral.toLowerCase().includes(q) ||
          item.color.toLowerCase().includes(q) ||
          item.finish.toLowerCase().includes(q) ||
          item.sizes.toLowerCase().includes(q)
        );
      }
      return true;
    });

    if (sortBy === "name") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "price-asc") {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-desc") {
      result.sort((a, b) => b.price - a.price);
    } else {
      result.sort((a, b) => a.index - b.index);
    }

    return result;
  }, [selectedCategory, search, sortBy]);

  const displayedItems = useMemo(() => {
    return filteredItems.slice(0, visibleCount);
  }, [filteredItems, visibleCount]);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < filteredItems.length) {
          setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, filteredItems.length));
        }
      },
      { threshold: 0.2 },
    );

    const el = loaderRef.current;
    if (el) observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
    };
  }, [visibleCount, filteredItems.length]);

  const handleShare = (item: StonePebbleItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/#pebble-${item.code.toLowerCase()}`;
    const text = `Check out ${item.name} (${item.code}) from Stone Tech Atelier: ${url}`;
    if (navigator.share) {
      navigator.share({ title: item.name, text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Link copied to clipboard!");
    }
  };

  const handleSelectProduct = (item: StonePebbleItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLightboxTarget(null);
    const desc = `${item.name} (${item.code}) - ${item.category} [Sizes: ${item.sizes}] @ ₹${item.price}/${item.unit}`;
    if (onSelectProduct) {
      onSelectProduct(desc);
    } else {
      toast.success(`Selected ${item.name} for quotation`);
    }
  };

  return (
    <div className={`w-full space-y-6 ${className}`}>
      {/* HEADER / TOOLBAR */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/60 p-4 sm:p-6 backdrop-blur-sm shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center rounded-lg bg-amber-500/10 p-1.5 text-amber-500 border border-amber-500/20">
                <CircleDot className="h-4 w-4" />
              </span>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {t.heading}
              </h2>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">{t.subheading}</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className="text-xs px-2.5 py-1 border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/5"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              {filteredItems.length} {t.patternsCount}
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 cursor-pointer border-amber-500/30 hover:bg-amber-500/10"
                >
                  <Download className="h-3.5 w-3.5 text-amber-500" />
                  <span className="hidden sm:inline">{t.cataloguesBtn}</span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Official 2026 Architectural Catalogues
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a
                    href="/catalogues/StoneTech_Stone_Pebbles_Catalogue_2026.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cursor-pointer flex items-center justify-between py-2 text-xs"
                  >
                    <span className="font-semibold text-foreground">{t.catalogue2026}</span>
                    <FileDown className="h-4 w-4 text-amber-500 ml-2" />
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* CONTROLS BAR: SEARCH, FILTERS, SORT */}
        <div className="flex flex-col md:flex-row gap-3 pt-2 border-t border-border/40">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t.searchPlaceholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setVisibleCount(INITIAL_BATCH);
              }}
              className="pl-9 text-xs sm:text-sm bg-background/80"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <Select
              value={sortBy}
              onValueChange={(val: "index" | "name" | "price-asc" | "price-desc") => setSortBy(val)}
            >
              <SelectTrigger className="w-[180px] text-xs h-9 bg-background/80">
                <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 opacity-60" />
                <SelectValue placeholder={t.sortBy} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="index" className="text-xs">
                  {t.sortDefault}
                </SelectItem>
                <SelectItem value="name" className="text-xs">
                  {t.sortName}
                </SelectItem>
                <SelectItem value="price-asc" className="text-xs">
                  {t.sortPriceAsc}
                </SelectItem>
                <SelectItem value="price-desc" className="text-xs">
                  {t.sortPriceDesc}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* CATEGORY FILTER PILLS */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <button
            type="button"
            onClick={() => {
              setSelectedCategory("all");
              setVisibleCount(INITIAL_BATCH);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === "all"
                ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40"
            }`}
          >
            {t.allCategories}
          </button>
          {categoriesList.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => {
                setSelectedCategory(cat.key);
                setVisibleCount(INITIAL_BATCH);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat.key
                  ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* PRODUCT GRID (3 / 4 COLUMNS, EQUAL SIZED 1:1 FRAMES) */}
      {displayedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border bg-card/40">
          <CircleDot className="h-10 w-10 text-muted-foreground/60 mb-3" />
          <p className="text-sm font-semibold text-foreground">{t.noMatching}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearch("");
              setSelectedCategory("all");
            }}
            className="mt-3 text-xs cursor-pointer"
          >
            {t.resetFilters}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayedItems.map((item) => (
            <div
              key={item.code}
              onClick={() => setLightboxTarget(item)}
              className="group relative flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card hover:border-amber-500/50 hover:shadow-lg transition-all duration-300 cursor-pointer"
            >
              {/* IMAGE FRAME (EQUAL-SIZED 1:1 SQUARE) */}
              <div className="relative aspect-square w-full overflow-hidden bg-slate-950/80">
                <img
                  src={item.image}
                  alt={item.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* TOP BADGES */}
                <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
                  <span className="rounded-md bg-amber-500 px-2 py-0.5 text-[10px] font-extrabold text-slate-950 tracking-wider shadow-sm">
                    {item.code}
                  </span>
                  <span className="rounded-md bg-slate-950/80 backdrop-blur-xs px-2 py-0.5 text-[9px] font-semibold text-cyan-300 border border-cyan-500/30">
                    {item.category}
                  </span>
                </div>

                {/* QUICK SHARE BUTTON */}
                <button
                  type="button"
                  onClick={(e) => handleShare(item, e)}
                  className="absolute top-2 right-2 rounded-full bg-slate-950/70 backdrop-blur-xs p-1.5 text-slate-300 hover:text-white transition-opacity z-10 cursor-pointer opacity-80 group-hover:opacity-100"
                  title="Share"
                >
                  <Share2 className="h-3.5 w-3.5" />
                </button>

                {/* HOVER OVERLAY */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 z-10">
                  <p className="text-[11px] text-amber-300 font-medium line-clamp-1 mb-1">
                    {item.mineral}
                  </p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white font-bold">
                      ₹{item.price}/{item.unit}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-amber-400 font-semibold">
                      <Eye className="h-3.5 w-3.5" /> Quick View
                    </span>
                  </div>
                </div>
              </div>

              {/* PRODUCT INFO */}
              <div className="p-3.5 flex flex-col flex-1 justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-foreground group-hover:text-amber-500 transition-colors line-clamp-1">
                    {item.name}
                  </h3>
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium line-clamp-1">
                    {item.finish}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground line-clamp-1">
                    <strong>Sizes:</strong> {item.sizes}
                  </p>
                </div>

                <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-foreground">₹{item.price}</span>
                    <span className="text-[10px] text-muted-foreground">/{item.unit}</span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={(e) => handleSelectProduct(item, e)}
                    className="h-7 text-[11px] px-2.5 border-amber-500/40 hover:bg-amber-500 hover:text-slate-950 cursor-pointer font-semibold"
                  >
                    Estimate
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* INFINITE SCROLL SENTINEL */}
      {visibleCount < filteredItems.length && (
        <div ref={loaderRef} className="flex justify-center py-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, filteredItems.length))
            }
            className="text-xs gap-2 cursor-pointer border-amber-500/30"
          >
            <RotateCw className="h-3.5 w-3.5 text-amber-500" />
            Load More Pebbles ({filteredItems.length - visibleCount} remaining)
          </Button>
        </div>
      )}

      {/* ARCHITECTURAL LIGHTBOX MODAL */}
      <Dialog
        open={Boolean(lightboxTarget)}
        onOpenChange={(open) => {
          if (!open) setLightboxTarget(null);
        }}
      >
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-card border-border/80 sm:rounded-2xl">
          {lightboxTarget && (
            <div className="flex flex-col md:flex-row">
              {/* LEFT: 1:1 SQUARE IMAGE */}
              <div className="relative aspect-square md:w-1/2 w-full bg-slate-950 flex items-center justify-center overflow-hidden">
                <img
                  src={lightboxTarget.image}
                  alt={lightboxTarget.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 flex gap-1.5 z-10">
                  <span className="rounded-md bg-amber-500 px-2.5 py-1 text-xs font-extrabold text-slate-950 tracking-wider shadow-md">
                    {lightboxTarget.code}
                  </span>
                  <span className="rounded-md bg-slate-950/80 backdrop-blur-xs px-2.5 py-1 text-xs font-semibold text-cyan-300 border border-cyan-500/30">
                    {lightboxTarget.category}
                  </span>
                </div>
              </div>

              {/* RIGHT: SPECS & ACTIONS */}
              <div className="p-5 md:p-6 md:w-1/2 flex flex-col justify-between space-y-4 overflow-y-auto max-h-[80vh]">
                <div>
                  <DialogHeader className="p-0 text-left">
                    <DialogTitle className="text-xl font-bold text-foreground">
                      {lightboxTarget.name}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                      {lightboxTarget.finish}
                    </DialogDescription>
                  </DialogHeader>

                  <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                    {lightboxTarget.desc}
                  </p>

                  <div className="mt-4 space-y-2 border-t border-border/40 pt-3 text-xs">
                    <div className="flex justify-between py-1 border-b border-border/20">
                      <span className="text-muted-foreground">{t.availableSizes}:</span>
                      <span className="font-semibold text-foreground text-right">
                        {lightboxTarget.sizes}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/20">
                      <span className="text-muted-foreground">{t.mineralFamily}:</span>
                      <span className="font-semibold text-foreground text-right">
                        {lightboxTarget.mineral}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/20">
                      <span className="text-muted-foreground">{t.colorTone}:</span>
                      <span className="font-semibold text-foreground text-right">
                        {lightboxTarget.color}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/20">
                      <span className="text-muted-foreground">{t.mohsHardness}:</span>
                      <span className="font-semibold text-foreground text-right">
                        {lightboxTarget.hardness}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/20">
                      <span className="text-muted-foreground">{t.packaging}:</span>
                      <span className="font-semibold text-foreground text-right">
                        {lightboxTarget.packaging}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                      {t.applications}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {lightboxTarget.applications.map((app, i) => (
                        <span
                          key={i}
                          className="rounded-md bg-muted/60 px-2 py-0.5 text-[10px] text-foreground border border-border/40"
                        >
                          {app}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-muted-foreground block">{t.quarryRate}</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-foreground">
                          ₹{lightboxTarget.price}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          /{lightboxTarget.unit}
                        </span>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-1 text-[10px] font-bold">
                      {t.inStock}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={() => handleSelectProduct(lightboxTarget)}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs h-10 cursor-pointer shadow-md"
                    >
                      {t.requestEstimate}
                      <ArrowRight className="h-4 w-4 ml-1.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={(e) => handleShare(lightboxTarget, e)}
                      className="h-10 px-3 cursor-pointer"
                      title="Share link"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * InstalledWorksGallery.tsx
 *
 * Architectural Gallery of Real Executed Projects & Live Installations across:
 *   - Natural Stone Wall Cladding & 3D Reliefs
 *   - Ultra-Thin Flexible Stone Veneer (Villas, Columns, Backlit)
 *   - Architectural Glass Bricks (Partitions, Facades & Lighted Bars)
 *   - Flexible Clay Veneers (Curvilinear Facades & Double-Height Lobbies)
 *
 * Connects directly to the Estimation Request flow.
 */

import { useState, useMemo, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Search,
  Share2,
  Camera,
  MapPin,
  Sparkles,
  Eye,
  RotateCw,
  ArrowRight,
  X,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import rawGalleryData from "@/data/installed-works-gallery.json";

export interface InstalledWorkItem {
  id: string;
  title: string;
  category: "cladding" | "stone-veneer" | "glass-bricks" | "clay-veneers";
  categoryLabel: string;
  productCode: string;
  productName: string;
  image: string;
  location: string;
  stoneType: string;
  specs: string;
  description: string;
}

const GALLERY_ITEMS: InstalledWorkItem[] = rawGalleryData as InstalledWorkItem[];

interface InstalledWorksGalleryProps {
  onSelectProduct?: (productName: string) => void;
  className?: string;
  initialCategory?: string;
}

const TEXTS = {
  en: {
    heading: "Few of Our Works",
    projectsCount: "Executed Projects",
    allCategories: "All Projects",
    claddingCategory: "Stone Cladding",
    veneerCategory: "Stone Veneer",
    glassCategory: "Glass Bricks",
    clayCategory: "Clay Veneers",
    searchPlaceholder: "Search executed projects, locations (Mumbai, Hyderabad, Jaipur)...",
    requestEstimate: "Request Estimation for this Work",
    quickEstimate: "Quick Estimate",
    viewDetails: "View Installation Details",
    location: "Project Location",
    material: "Stone & Material System",
    specs: "Architectural Specifications",
    referenceProduct: "Reference Product Code",
    shareWhatsApp: "Inquire on WhatsApp",
    noMatching: "No matching architectural projects found",
    resetFilters: "Reset Filters",
  },
  hi: {
    heading: "हमारे कुछ कार्य",
    projectsCount: "पूर्ण प्रोजेक्ट्स",
    allCategories: "सभी प्रोजेक्ट्स",
    claddingCategory: "स्टोन क्लैडिंग",
    veneerCategory: "स्टोन विनियर",
    glassCategory: "ग्लास ब्रिक्स",
    clayCategory: "क्ले विनियर",
    searchPlaceholder: "पूर्ण प्रोजेक्ट्स, शहर (मुंबई, हैदराबाद, जयपुर) खोजें...",
    requestEstimate: "इस फिनिश हेतु अनुमान का अनुरोध करें",
    quickEstimate: "त्वरित अनुमान",
    viewDetails: "स्थापना विवरण देखें",
    location: "प्रोजेक्ट का स्थान",
    material: "पत्थर एवं सामग्री प्रणाली",
    specs: "वास्तुशिल्प विनिर्देश",
    referenceProduct: "रेफरेंस प्रोडक्ट कोड",
    shareWhatsApp: "व्हाट्सएप पर पूछताछ करें",
    noMatching: "कोई मेल खाता प्रोजेक्ट नहीं मिला",
    resetFilters: "फ़िल्टर रीसेट करें",
  },
  gu: {
    heading: "અમારા કેટલાક કાર્યો",
    projectsCount: "પૂર્ણ પ્રોજેક્ટ્સ",
    allCategories: "બધા પ્રોજેક્ટ્સ",
    claddingCategory: "પાષાણ ક્લેડિંગ",
    veneerCategory: "સ્ટોન વિનિયર",
    glassCategory: "કાચની ઈંટો",
    clayCategory: "ક્લે વિનિયર",
    searchPlaceholder: "પૂર્ણ પ્રોજેક્ટ્સ, સ્થળ (મુંબઈ, હૈદરાબાદ, સુરત) શોધો...",
    requestEstimate: "આ કામગીરી માટે અંદાજ મેળવો",
    quickEstimate: "ઝડપી અંદાજ",
    viewDetails: "ઇન્સ્ટોલેશન વિગતો જુઓ",
    location: "પ્રોજેક્ટ સ્થળ",
    material: "પથ્થર અને મટિરિયલ સિસ્ટમ",
    specs: "વાસ્તુશિલ્પીય વિગતો",
    referenceProduct: "રેફરન્સ પ્રોડક્ટ કોડ",
    shareWhatsApp: "વોટ્સએપ પર પૂછપરછ કરો",
    noMatching: "કોઈ મેળ ખાતો પ્રોજેક્ટ મળ્યો નથી",
    resetFilters: "ફિલ્ટર્સ રીસેટ કરો",
  },
};

const INITIAL_BATCH = 18;
const BATCH_SIZE = 18;

export function InstalledWorksGallery({
  onSelectProduct,
  className,
  initialCategory = "all",
}: InstalledWorksGalleryProps) {
  const { i18n } = useTranslation();
  const lang = (i18n.language?.substring(0, 2) || "en") as "en" | "hi" | "gu";
  const t = TEXTS[lang] || TEXTS.en;

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_BATCH);
  const [lightboxTarget, setLightboxTarget] = useState<InstalledWorkItem | null>(null);
  const [imageRotation, setImageRotation] = useState<number>(0);
  const [isFullScreenZoom, setIsFullScreenZoom] = useState<boolean>(false);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Filtered items
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return GALLERY_ITEMS.filter((item) => {
      if (selectedCategory !== "all" && item.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.stoneType.toLowerCase().includes(q) ||
        item.productCode.toLowerCase().includes(q) ||
        item.productName.toLowerCase().includes(q) ||
        item.categoryLabel.toLowerCase().includes(q) ||
        item.specs.toLowerCase().includes(q)
      );
    });
  }, [search, selectedCategory]);

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

  const handleEstimateClick = (item: InstalledWorkItem) => {
    setLightboxTarget(null);
    if (onSelectProduct) {
      onSelectProduct(
        `${item.productName} (${item.productCode}) - Reference Site: ${item.location}`,
      );
    }
  };

  const shareWhatsApp = (item: InstalledWorkItem) => {
    const text = encodeURIComponent(
      `Hello Stone Tech Team, I saw this project in your Live Installed Portfolio: *${item.title}* at ${item.location}.\nReference Stone: ${item.productName} (${item.productCode}).\nPlease provide an estimation quote for a similar requirement.`,
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
              <Camera className="h-5 w-5 text-emerald-500" />
              <span>{t.heading}</span>
            </h3>
            <Badge variant="secondary" className="font-bold text-xs px-2.5 py-0.5 rounded-full">
              {filteredItems.length} {t.projectsCount}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Executed architectural installations across luxury villas, corporate atriums, boutique
            hotels & sacred architecture
          </p>
        </div>
      </div>

      {/* 2. FILTERS: SEARCH BAR + CATEGORY PILLS */}
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

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer",
              selectedCategory === "all"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <span>{t.allCategories}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-background/80">
              {GALLERY_ITEMS.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory("cladding")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer",
              selectedCategory === "cladding"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <span>{t.claddingCategory}</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory("stone-veneer")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer",
              selectedCategory === "stone-veneer"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <span>{t.veneerCategory}</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory("glass-bricks")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer",
              selectedCategory === "glass-bricks"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <span>{t.glassCategory}</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory("clay-veneers")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer",
              selectedCategory === "clay-veneers"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <span>{t.clayCategory}</span>
          </button>
        </div>
      </div>

      {/* 3. SQUEEZED PROJECT GRID (Unconstrained Flow without inner scroll trap) */}
      <div ref={scrollContainerRef} className="rounded-2xl pb-2">
        {filteredItems.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <p className="text-sm font-semibold text-muted-foreground">{t.noMatching}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setSelectedCategory("all");
              }}
            >
              {t.resetFilters}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {visibleItems.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => {
                  setLightboxTarget(item);
                  setImageRotation(0);
                }}
                className="group relative aspect-4/3 sm:aspect-square rounded-xl sm:rounded-2xl overflow-hidden cursor-pointer bg-stone-900 border border-border/60 hover:border-emerald-500/50 shadow-2xs hover:shadow-md transition-all duration-300 flex items-center justify-center"
              >
                <img
                  src={item.image}
                  alt={item.title}
                  loading={idx < 6 ? "eager" : "lazy"}
                  decoding="async"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Top Badge: Category */}
                <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
                  <Badge className="bg-black/80 hover:bg-black text-[10px] text-white border-white/20 font-semibold px-2 py-0.5 backdrop-blur-md">
                    {item.categoryLabel}
                  </Badge>
                </div>

                {/* Bottom Overlay with Project Details */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-3 pt-8 text-white transition-opacity duration-300 flex flex-col justify-end gap-1.5 z-10">
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold truncate text-white">{item.title}</p>
                    <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5 truncate">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span>{item.location}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 pt-1">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEstimateClick(item);
                      }}
                      className="flex-1 h-7 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1 rounded-lg"
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
              onClick={() => setVisibleCount((prev) => Math.min(prev + 12, filteredItems.length))}
              className="h-8 text-xs cursor-pointer border-emerald-500/30 font-semibold"
            >
              Load More Projects ({filteredItems.length - visibleItems.length} remaining)
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
              {/* Left Column: Full Project Photo */}
              <div className="relative bg-stone-950 dark:bg-black p-4 flex flex-col items-center justify-center min-h-[320px] md:min-h-[480px]">
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

                <div className="w-full h-full flex items-center justify-center overflow-hidden p-2">
                  <img
                    src={lightboxTarget.image}
                    alt={lightboxTarget.title}
                    style={{ transform: `rotate(${imageRotation}deg)` }}
                    className={cn(
                      "max-h-[380px] md:max-h-[440px] w-auto max-w-full object-contain rounded-xl transition-transform duration-300",
                      isFullScreenZoom && "scale-125 cursor-zoom-out",
                    )}
                    onClick={() => setIsFullScreenZoom((prev) => !prev)}
                  />
                </div>

                <div className="absolute bottom-3 inset-x-0 text-center pointer-events-none">
                  <span className="text-[11px] text-emerald-300 bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs flex items-center justify-center gap-1 mx-auto w-fit">
                    <MapPin className="h-3 w-3" />
                    <span>{lightboxTarget.location}</span>
                  </span>
                </div>
              </div>

              {/* Right Column: Project Context & Estimation Action */}
              <div className="p-5 sm:p-6 space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-emerald-600 text-white font-bold text-[11px]">
                        {lightboxTarget.categoryLabel}
                      </Badge>
                      <Badge variant="outline" className="font-mono text-[11px]">
                        {lightboxTarget.productCode}
                      </Badge>
                    </div>
                    <DialogTitle className="text-xl sm:text-2xl font-black text-foreground">
                      {lightboxTarget.title}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-1">
                      {lightboxTarget.description}
                    </DialogDescription>
                  </div>

                  {/* Project Specifications */}
                  <div className="space-y-2 text-xs">
                    <p className="font-bold text-foreground text-xs uppercase tracking-wider text-muted-foreground">
                      {t.specs}
                    </p>
                    <div className="space-y-2 p-3 rounded-xl bg-muted/60 border border-border/50 text-[11px]">
                      <div>
                        <span className="text-muted-foreground block">{t.location}</span>
                        <span className="font-semibold text-foreground">
                          {lightboxTarget.location}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">{t.material}</span>
                        <span className="font-semibold text-foreground">
                          {lightboxTarget.stoneType}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">{t.specs}</span>
                        <span className="font-semibold text-foreground">
                          {lightboxTarget.specs}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">{t.referenceProduct}</span>
                        <span className="font-mono font-semibold text-primary">
                          {lightboxTarget.productName} ({lightboxTarget.productCode})
                        </span>
                      </div>
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

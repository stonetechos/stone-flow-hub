/**
 * MasterProductCatalog.tsx
 *
 * Unified Architectural Product Showcase & Multi-Collection Catalogue for Stone Tech Atelier.
 * Directly integrates all product divisions into a single unified display with tab navigation:
 *   1. Natural Stone Cladding & Architectural Mosaics (275 Patterns)
 *   2. Ultra-Thin Flexible Stone Veneers (98 Varieties)
 *   3. Architectural Solid & Hollow Glass Bricks (67 Designs)
 *   4. Flexible Clay Veneers & 3D Architectural Textures (40 Patterns)
 *   5. Natural Stone Pebbles & Semi-Precious Aggregates (75 Varieties)
 *   6. Live Installed Works & Architectural Portfolio (44 Executed Projects)
 *
 * Each tab dynamically provides:
 *   - Tab switcher directly inside the card header
 *   - Category / Collection dropdown matching that product family
 *   - Secondary facet dropdown (Geology / Finish / Profile / Project Location)
 *   - Instant debounced search bar
 *   - Complete 5-Catalogue Master PDF download menu (including Stone Pebbles 2026)
 *   - Quick filter collection pills with exact live item counts
 *   - Responsive 3-to-4-column product grid with 1-click estimation request
 *   - Architectural Lightbox Modal with full technical specifications
 */

import { useState, useMemo, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Layers,
  Sparkles,
  Gem,
  Compass,
  CircleDot,
  Camera,
  Search,
  Download,
  BookOpen,
  FileDown,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Eye,
  ShieldCheck,
  Check,
  Share2,
  ExternalLink,
  RotateCw,
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

// Static JSON catalogs
import rawCladdingData from "@/data/wall-cladding-catalog.json";
import rawVeneerData from "@/data/stone-veneer-catalog.json";
import rawGlassData from "@/data/glass-bricks-catalog.json";
import rawClayData from "@/data/flexible-clay-catalog.json";
import rawPebblesData from "@/data/stone-pebbles-catalog.json";
import rawInstallsData from "@/data/installed-works-gallery.json";

export type ProductTab =
  | "cladding"
  | "stone-veneer"
  | "glass-bricks"
  | "clay-veneers"
  | "pebbles"
  | "installations";

export interface CatalogItemSpec {
  label: string;
  val: string;
}

export interface CatalogItem {
  id: string;
  code: string;
  name: string;
  category: string;
  subCategory: string;
  image: string;
  sceneImage?: string;
  price: number | null;
  unit: string | null;
  sizes: string;
  details: string;
  desc: string;
  specs: CatalogItemSpec[];
  externalLink?: string | null;
}

export interface MasterProductCatalogProps {
  activeTab?: ProductTab;
  onTabChange?: (tab: ProductTab) => void;
  onSelectProduct?: (productDescription: string) => void;
  className?: string;
  showAdminBanner?: boolean;
}

export function MasterProductCatalog({
  activeTab: externalActiveTab,
  onTabChange,
  onSelectProduct,
  className = "",
  showAdminBanner = false,
}: MasterProductCatalogProps) {
  const { i18n } = useTranslation();
  const lang = (i18n.language?.substring(0, 2) || "en") as "en" | "hi" | "gu";

  // Internal tab state if uncontrolled
  const [internalTab, setInternalTab] = useState<ProductTab>("cladding");
  const currentTab = externalActiveTab || internalTab;

  const handleTabChange = (tab: ProductTab) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalTab(tab);
    }
    // Reset filters on tab switch
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedSubFilter("all");
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  };

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSubFilter, setSelectedSubFilter] = useState("all");
  const [lightboxItem, setLightboxItem] = useState<CatalogItem | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Normalize data collections
  const currentDataset: CatalogItem[] = useMemo(() => {
    switch (currentTab) {
      case "stone-veneer":
        return (rawVeneerData as Array<Record<string, unknown>>).map((v) => ({
          id: String(v.code),
          code: String(v.code),
          name: String(v.name),
          category: String(v.series || "Natural Stone Veneer"),
          subCategory: v.translucent ? "Translucent (Backlit)" : "Natural Cleft",
          image: String(v.slabImage || v.image || ""),
          price: typeof v.price === "number" ? v.price : 195,
          unit: String(v.unit || "sq.ft"),
          sizes: String(v.standardSizes || "1220 × 610 mm"),
          details: v.stoneType ? `Natural ${v.stoneType}` : String(v.series || ""),
          desc: String(
            v.desc || "Ultra-thin flexible natural stone veneer sheet with fiberglass backing.",
          ),
          specs: [
            { label: "Dimensions", val: String(v.standardSizes || "1220 × 610 mm") },
            { label: "Thickness", val: String(v.thickness || "1.5 – 2.0 mm") },
            { label: "Weight", val: String(v.weight || "1.5 kg / sheet") },
            { label: "Backing", val: "Fiberglass & Polyester Resin" },
          ],
        }));
      case "glass-bricks":
        return (rawGlassData as Array<Record<string, unknown>>).map((g) => ({
          id: String(g.code),
          code: String(g.code),
          name: String(g.name),
          category: String(g.series || "Glass Bricks"),
          subCategory: String(g.pattern || "Clear Pattern"),
          image: String(g.image || ""),
          price: typeof g.price === "number" ? g.price : 420,
          unit: String(g.unit || "pc"),
          sizes: String(g.dimensions || "190 × 190 × 80 mm"),
          details: String(g.finish || g.series || ""),
          desc: String(
            g.desc ||
              "Architectural optical-grade glass brick with precision geometric refraction.",
          ),
          specs: [
            { label: "Dimensions", val: String(g.dimensions || "190 × 190 × 80 mm") },
            { label: "Weight", val: String(g.weight || "2.3 kg / pc") },
            { label: "Fire Resistance", val: String(g.fireRating || "60 – 90 Minutes") },
            { label: "Sound Insulation", val: "Rw 40 dB" },
          ],
        }));
      case "clay-veneers":
        return (rawClayData as Array<Record<string, unknown>>).map((c) => ({
          id: String(c.code),
          code: String(c.code),
          name: String(c.rawName || c.name),
          category: String(c.series || "Clay Veneer"),
          subCategory: String(c.profile || "3D Relief"),
          image: String(c.image || ""),
          sceneImage: c.sceneImage ? String(c.sceneImage) : undefined,
          price: typeof c.price === "number" ? c.price : 220,
          unit: String(c.unit || "sq.ft"),
          sizes: String(c.standardSizes || "1200 × 2400 mm"),
          details: String(c.profile || c.series || ""),
          desc: String(
            c.desc ||
              "Flexible modified mineral clay architectural veneer for curved and exterior elevations.",
          ),
          specs: [
            { label: "Dimensions", val: String(c.standardSizes || "1200 × 2400 mm") },
            { label: "Thickness", val: String(c.thickness || "2.5 – 3.5 mm") },
            { label: "Weight", val: String(c.weight || "3.8 kg / m²") },
            { label: "Fire Rating", val: String(c.fire || "Class A Non-Combustible") },
          ],
        }));
      case "pebbles":
        return (rawPebblesData as Array<Record<string, unknown>>).map((p) => ({
          id: String(p.code),
          code: String(p.code),
          name: String(p.name),
          category: String(p.category || "Stone Pebbles"),
          subCategory: String(p.finish || "Natural"),
          image: String(p.image || ""),
          price: typeof p.price === "number" ? p.price : 38,
          unit: String(p.unit || "kg"),
          sizes: String(p.sizes || "20-40 mm"),
          details: String(p.mineral || ""),
          desc: String(
            p.desc ||
              "Curated architectural stone pebbles and semi-precious decorative aggregates.",
          ),
          specs: [
            { label: "Available Sizes", val: String(p.sizes || "") },
            { label: "Mineral Family", val: String(p.mineral || "") },
            { label: "Color Tone", val: String(p.color || "") },
            { label: "Hardness", val: String(p.hardness || "") },
            { label: "Packaging", val: String(p.packaging || "") },
          ],
        }));
      case "installations":
        return (rawInstallsData as Array<Record<string, unknown>>).map((ins) => ({
          id: String(ins.id),
          code: String(ins.productCode || ins.id),
          name: String(ins.title || ""),
          category: String(ins.categoryLabel || ins.category || "Executed Works"),
          subCategory: String(ins.location || "Executed Project"),
          image: String(ins.image || ""),
          price: null,
          unit: null,
          sizes: String(ins.specs || "Custom On-Site Architecture"),
          details: String(ins.stoneType || ins.location || ""),
          desc: String(
            ins.description ||
              "Live verified installation by Stone Tech Atelier engineering teams.",
          ),
          specs: [
            { label: "Project Site", val: String(ins.location || "") },
            { label: "Material Specified", val: String(ins.stoneType || "") },
            { label: "Architecture Specs", val: String(ins.specs || "") },
          ],
          externalLink: ins.instagramUrl ? String(ins.instagramUrl) : null,
        }));
      case "cladding":
      default:
        return (rawCladdingData as Array<Record<string, unknown>>).map((c) => {
          const imgs = Array.isArray(c.images) ? (c.images as string[]) : [];
          return {
            id: String(c.id),
            code: String(c.id),
            name: String(c.name || ""),
            category: String(c.category || "Stone Wall Cladding"),
            subCategory: String(c.stoneType || "Sandstone"),
            image: String(imgs[0] || c.image || ""),
            price: typeof c.price === "number" ? c.price : 240,
            unit: "sq.ft",
            sizes: "600 × 300 mm / Modular",
            details: String(c.stoneType || "Natural Stone"),
            desc: String(
              c.description ||
                "Precision CNC architectural natural stone wall cladding relief panel.",
            ),
            specs: [
              { label: "Stone Type", val: String(c.stoneType || "Natural Stone") },
              { label: "Category", val: String(c.category || "") },
              { label: "Surface Finish", val: String(c.finish || "CNC Carved / Natural Cleft") },
            ],
          };
        });
    }
  }, [currentTab]);

  // Derive dynamic Category options (Dropdown 1) with counts
  const categoryOptions = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of currentDataset) {
      if (item.category) {
        map.set(item.category, (map.get(item.category) || 0) + 1);
      }
    }
    return Array.from(map.entries()).map(([cat, count]) => ({
      key: cat,
      label: `${cat} (${count})`,
      count,
    }));
  }, [currentDataset]);

  // Derive dynamic Secondary options (Dropdown 2: Geology / Finish / Profile) with counts
  const subFilterOptions = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of currentDataset) {
      if (item.subCategory) {
        map.set(item.subCategory, (map.get(item.subCategory) || 0) + 1);
      }
    }
    return Array.from(map.entries()).map(([sub, count]) => ({
      key: sub,
      label: `${sub} (${count})`,
      count,
    }));
  }, [currentDataset]);

  // Filter items based on active criteria
  const filteredItems = useMemo(() => {
    return currentDataset.filter((item) => {
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }
      if (selectedSubFilter !== "all" && item.subCategory !== selectedSubFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.code.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          (item.subCategory && item.subCategory.toLowerCase().includes(q)) ||
          (item.details && item.details.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [currentDataset, selectedCategory, selectedSubFilter, searchQuery]);

  // Reset scroll position when filter criteria changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [currentTab, selectedCategory, selectedSubFilter, searchQuery]);

  const scrollToContainerTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const displayedItems = filteredItems;

  const handleSelectProductClick = (item: CatalogItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLightboxItem(null);
    const desc = `${item.name} (${item.code}) - ${item.category} [${item.sizes || "Standard"}] ${
      item.price ? `@ ₹${item.price}/${item.unit}` : ""
    }`;
    if (onSelectProduct) {
      onSelectProduct(desc);
    } else {
      toast.success(`Selected ${item.name} for quotation estimation`);
    }
  };

  const handleShare = (item: CatalogItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/#${currentTab}-${item.code.toLowerCase()}`;
    const text = `Check out ${item.name} (${item.code}) from Stone Tech Atelier: ${url}`;
    if (navigator.share) {
      navigator.share({ title: item.name, text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Link copied to clipboard!");
    }
  };

  // Heading texts & dropdown placeholders per tab
  const tabMetadata = {
    cladding: {
      title:
        lang === "gu"
          ? "નેચરલ સ્ટોન ક્લેડિંગ અને આર્કિટેક્ચરલ મોઝેઇક"
          : lang === "hi"
            ? "नेचुरल स्टोन क्लैडिंग एवं आर्किटेक्चरल मोज़ेक"
            : "NATURAL STONE WALL CLADDING & ARCHITECTURAL MOSAICS",
      countLabel: "Patterns",
      dropdown1Placeholder: "All Collections",
      dropdown2Placeholder: "All Stones",
      searchPlaceholder: "Search 275 cladding patterns...",
    },
    "stone-veneer": {
      title:
        lang === "gu"
          ? "અલ્ટ્રા-થિન ફ્લેક્સિબલ નેચરલ સ્ટોન વિનિયર"
          : lang === "hi"
            ? "अल्ट्रा-थिन फ्लेक्सिबल नेचुरल स्टोन विनियर"
            : "ULTRA-THIN FLEXIBLE NATURAL STONE VENEERS",
      countLabel: "Varieties",
      dropdown1Placeholder: "All Collections",
      dropdown2Placeholder: "All Finishes",
      searchPlaceholder: "Search 98 stone veneers, slate, marble...",
    },
    "glass-bricks": {
      title:
        lang === "gu"
          ? "આર્કિટેક્ચરલ સોલિડ અને હોલો ગ્લાસ બ્રિક્સ"
          : lang === "hi"
            ? "आर्किटेक्चरल सॉलिड एवं हॉलो ग्लास ब्रिक्स"
            : "ARCHITECTURAL SOLID & HOLLOW GLASS BRICKS",
      countLabel: "Designs",
      dropdown1Placeholder: "All Types",
      dropdown2Placeholder: "All Profiles",
      searchPlaceholder: "Search 67 glass bricks, wave, bubble, tinted...",
    },
    "clay-veneers": {
      title:
        lang === "gu"
          ? "ફ્લેક્સિબલ ક્લે વિનિયર અને ૩D આર્કિટેક્ચરલ ટેક્સચર"
          : lang === "hi"
            ? "फ्लेक्सिबल क्ले विनियर एवं ३D आर्किटेक्चरल टेक्सचर्स"
            : "FLEXIBLE CLAY VENEERS & 3D ARCHITECTURAL TEXTURES",
      countLabel: "Textures",
      dropdown1Placeholder: "All Collections",
      dropdown2Placeholder: "All Profiles",
      searchPlaceholder: "Search 40 flexible clay textures, fluted, travertino...",
    },
    pebbles: {
      title:
        lang === "gu"
          ? "કુદરતી સ્ટોન પેબલ્સ અને સેમી-પ્રેશિયસ એગ્રીગેટ્સ"
          : lang === "hi"
            ? "प्राकृतिक स्टोन पेबल्स एवं सेमी-प्रेशियस एग्रीगेट्स"
            : "NATURAL STONE PEBBLES & SEMI-PRECIOUS AGGREGATES",
      countLabel: "Varieties",
      dropdown1Placeholder: "All Collections",
      dropdown2Placeholder: "All Finishes",
      searchPlaceholder: "Search 75 stone pebbles, rose quartz, onyx, river black...",
    },
    installations: {
      title:
        lang === "gu"
          ? "લાઇવ ઇન્સ્ટોલેશન કાર્યો અને પ્રોજેક્ટ ગેલેરી"
          : lang === "hi"
            ? "लाइव इंस्टॉलेशन कार्य एवं प्रोजेक्ट गैलरी"
            : "LIVE INSTALLED WORKS & ARCHITECTURAL PROJECTS",
      countLabel: "Projects",
      dropdown1Placeholder: "All Categories",
      dropdown2Placeholder: "All Locations",
      searchPlaceholder: "Search executed projects, villas, hotels, temples...",
    },
  }[currentTab];

  const isHi = lang.startsWith("hi");
  const isGu = lang.startsWith("gu");
  const activeLangCode: "en" | "hi" | "gu" = isHi ? "hi" : isGu ? "gu" : "en";

  const activeTabPdf = useMemo(() => {
    switch (currentTab) {
      case "stone-veneer":
        return {
          label:
            lang === "gu"
              ? "વિનિયર (106 Pgs)"
              : lang === "hi"
                ? "विनियर (106 Pgs)"
                : "Stone Veneer (106 Pgs)",
          url: isHi
            ? "/catalogues/StoneTech_Stone_Veneer_Catalogue_Hindi.pdf"
            : isGu
              ? "/catalogues/StoneTech_Stone_Veneer_Catalogue_Gujarati.pdf"
              : "/catalogues/StoneTech_Stone_Veneer_Catalogue_2026.pdf",
          filename: isHi
            ? "StoneTech_Stone_Veneer_Catalogue_Hindi.pdf"
            : isGu
              ? "StoneTech_Stone_Veneer_Catalogue_Gujarati.pdf"
              : "StoneTech_Stone_Veneer_Catalogue_2026.pdf",
        };
      case "glass-bricks":
        return {
          label: "Glass Bricks (67 Designs)",
          url: "/catalogues/StoneTech_Solid_Glass_Bricks_Catalogue_2026.pdf",
          filename: "StoneTech_Solid_Glass_Bricks_Catalogue_2026.pdf",
        };
      case "clay-veneers":
        return {
          label: "Clay Veneers (37 Pgs)",
          url: "/catalogues/StoneTech_Flexible_Clay_Veneers_Catalogue_2026.pdf",
          filename: "StoneTech_Flexible_Clay_Veneers_Catalogue_2026.pdf",
        };
      case "pebbles":
        return {
          label: "Stone Pebbles (23 Pgs)",
          url: "/catalogues/StoneTech_Stone_Pebbles_Catalogue_2026.pdf",
          filename: "StoneTech_Stone_Pebbles_Catalogue_2026.pdf",
        };
      case "cladding":
      default:
        return {
          label:
            lang === "gu"
              ? "વોલ ક્લેડિંગ (71 Pgs)"
              : lang === "hi"
                ? "वॉल क्लैडिंग (71 Pgs)"
                : "Wall Cladding (71 Pgs)",
          url: isHi
            ? "/catalogues/StoneTech_NaturalStone_WallCl_Options_Hindi.pdf"
            : isGu
              ? "/catalogues/StoneTech_NaturalStone_WallCl_Options_Gujarati.pdf"
              : "/catalogues/StoneTech_NaturalStone_WallCl_Options_English.pdf",
          filename: isHi
            ? "StoneTech_NaturalStone_WallCl_Options_Hindi.pdf"
            : isGu
              ? "StoneTech_NaturalStone_WallCl_Options_Gujarati.pdf"
              : "StoneTech_NaturalStone_WallCl_Options_English.pdf",
        };
    }
  }, [currentTab, isHi, isGu, lang]);

  return (
    <div
      className={cn(
        "rounded-3xl border border-border/80 bg-card/80 backdrop-blur-xs p-4 sm:p-6 shadow-md space-y-4",
        className,
      )}
    >
      {/* 1. MASTER PRODUCT DIVISION TABS STRIP (DIRECTLY IN THE CARD DISPLAY) */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-muted/80 border border-border/60 overflow-x-auto scrollbar-none [touch-action:pan-x]">
        <button
          type="button"
          onClick={() => handleTabChange("cladding")}
          className={cn(
            "flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer",
            currentTab === "cladding"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Layers className="h-4 w-4" />
          <span>Natural Stone Cladding (275)</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("stone-veneer")}
          className={cn(
            "flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer",
            currentTab === "stone-veneer"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span>Stone Veneer (98)</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("glass-bricks")}
          className={cn(
            "flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer",
            currentTab === "glass-bricks"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Gem className="h-4 w-4 text-cyan-500" />
          <span>Glass Bricks (67)</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("clay-veneers")}
          className={cn(
            "flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer",
            currentTab === "clay-veneers"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Compass className="h-4 w-4 text-orange-500" />
          <span>Clay Veneers (40)</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("pebbles")}
          className={cn(
            "flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer",
            currentTab === "pebbles"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <CircleDot className="h-4 w-4 text-amber-500" />
          <span>Stone Pebbles (75)</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("installations")}
          className={cn(
            "flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer",
            currentTab === "installations"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Camera className="h-4 w-4 text-emerald-500" />
          <span>Live Installed Works</span>
        </button>
      </div>

      {/* 2. DYNAMIC CONTROLS ROW: TITLE, 2 ADAPTIVE DROPDOWNS, SEARCH & 5-PDF MENU */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1 border-t border-border/40">
        {/* Title with live pulsating beacon */}
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
            {tabMetadata.title}
          </span>
          <span className="text-[11px] text-muted-foreground font-semibold">
            ({filteredItems.length} {tabMetadata.countLabel})
          </span>
        </div>

        {/* Set of Dropdowns & Controls */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Dropdown 1: Category / Collection */}
          <Select
            value={selectedCategory}
            onValueChange={(val) => {
              setSelectedCategory(val);
            }}
          >
            <SelectTrigger className="h-8 text-xs bg-background/90 w-[150px] sm:w-[170px]">
              <SelectValue placeholder={tabMetadata.dropdown1Placeholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                {tabMetadata.dropdown1Placeholder} ({currentDataset.length})
              </SelectItem>
              {categoryOptions.map((opt) => (
                <SelectItem key={opt.key} value={opt.key} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Dropdown 2: Sub-filter (Geology / Finish / Profile) */}
          <Select
            value={selectedSubFilter}
            onValueChange={(val) => {
              setSelectedSubFilter(val);
            }}
          >
            <SelectTrigger className="h-8 text-xs bg-background/90 w-[130px] sm:w-[150px] hidden sm:flex">
              <SelectValue placeholder={tabMetadata.dropdown2Placeholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                {tabMetadata.dropdown2Placeholder}
              </SelectItem>
              {subFilterOptions.map((opt) => (
                <SelectItem key={opt.key} value={opt.key} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Search Input */}
          <div className="relative flex-1 sm:w-44 md:w-52">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder={tabMetadata.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
              }}
              className="pl-8 h-8 text-xs bg-background/90"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Quick 1-Click Active Language PDF Download */}
          <a
            href={activeTabPdf.url}
            download={activeTabPdf.filename}
            className="inline-flex"
            title={`Download ${activeTabPdf.label} (${activeLangCode.toUpperCase()})`}
          >
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2.5 text-xs text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 gap-1.5 cursor-pointer font-semibold shrink-0"
            >
              <Download className="h-3.5 w-3.5 text-amber-500" />
              <span className="hidden md:inline font-medium">{activeTabPdf.label}</span>
              <span className="md:hidden font-medium">PDF</span>
              <Badge
                variant="secondary"
                className="text-[9px] px-1 py-0 h-3.5 uppercase font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300"
              >
                {activeLangCode}
              </Badge>
            </Button>
          </a>

          {/* Catalogues (PDF) Comprehensive Library Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2.5 text-xs text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 gap-1.5 cursor-pointer font-semibold shrink-0"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Catalogues (PDF)</span>
                <span className="sm:hidden">PDF</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[330px] sm:w-[380px] p-2.5 space-y-2.5">
              <DropdownMenuLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Stone Tech Atelier 2026 Architectural Catalogues
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {/* 1. Natural Stone Cladding Catalogue */}
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-emerald-600" />
                    Natural Stone Cladding (71 Pgs)
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-4 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                  >
                    275 Patterns
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <a
                    href="/catalogues/StoneTech_NaturalStone_WallCl_Options_English.pdf"
                    download="StoneTech_NaturalStone_WallCl_Options_English.pdf"
                    className={cn(
                      "flex-1 text-center py-1 px-1.5 text-[11px] font-medium rounded border transition-colors",
                      activeLangCode === "en"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-background/80 hover:bg-accent border-border text-foreground",
                    )}
                  >
                    English
                  </a>
                  <a
                    href="/catalogues/StoneTech_NaturalStone_WallCl_Options_Hindi.pdf"
                    download="StoneTech_NaturalStone_WallCl_Options_Hindi.pdf"
                    className={cn(
                      "flex-1 text-center py-1 px-1.5 text-[11px] font-medium rounded border transition-colors",
                      activeLangCode === "hi"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-background/80 hover:bg-accent border-border text-foreground",
                    )}
                  >
                    हिंदी
                  </a>
                  <a
                    href="/catalogues/StoneTech_NaturalStone_WallCl_Options_Gujarati.pdf"
                    download="StoneTech_NaturalStone_WallCl_Options_Gujarati.pdf"
                    className={cn(
                      "flex-1 text-center py-1 px-1.5 text-[11px] font-medium rounded border transition-colors",
                      activeLangCode === "gu"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-background/80 hover:bg-accent border-border text-foreground",
                    )}
                  >
                    ગુજરાતી
                  </a>
                </div>
              </div>

              {/* 2. Stone Veneer Catalogue */}
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                    Ultra-Thin Stone Veneer (106 Pgs)
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-4 border-amber-500/40 text-amber-700 dark:text-amber-300"
                  >
                    98 Varieties
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <a
                    href="/catalogues/StoneTech_Stone_Veneer_Catalogue_English.pdf"
                    download="StoneTech_Stone_Veneer_Catalogue_English.pdf"
                    className={cn(
                      "flex-1 text-center py-1 px-1.5 text-[11px] font-medium rounded border transition-colors",
                      activeLangCode === "en"
                        ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                        : "bg-background/80 hover:bg-accent border-border text-foreground",
                    )}
                  >
                    English
                  </a>
                  <a
                    href="/catalogues/StoneTech_Stone_Veneer_Catalogue_Hindi.pdf"
                    download="StoneTech_Stone_Veneer_Catalogue_Hindi.pdf"
                    className={cn(
                      "flex-1 text-center py-1 px-1.5 text-[11px] font-medium rounded border transition-colors",
                      activeLangCode === "hi"
                        ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                        : "bg-background/80 hover:bg-accent border-border text-foreground",
                    )}
                  >
                    हिंदी
                  </a>
                  <a
                    href="/catalogues/StoneTech_Stone_Veneer_Catalogue_Gujarati.pdf"
                    download="StoneTech_Stone_Veneer_Catalogue_Gujarati.pdf"
                    className={cn(
                      "flex-1 text-center py-1 px-1.5 text-[11px] font-medium rounded border transition-colors",
                      activeLangCode === "gu"
                        ? "bg-amber-600 text-white border-amber-600 shadow-xs"
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
                    <Gem className="h-3.5 w-3.5 text-sky-600" />
                    Architectural Glass Bricks (67 Designs)
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                  <a
                    href="/catalogues/StoneTech_Solid_Glass_Bricks_Catalogue_2026.pdf"
                    download="StoneTech_Solid_Glass_Bricks_Catalogue_2026.pdf"
                    className="py-1 px-1.5 text-[11px] font-medium rounded border bg-background/80 hover:bg-accent border-border text-foreground flex items-center justify-center gap-1"
                  >
                    <Download className="h-3 w-3 text-sky-600" />
                    Solid Glass (34 Pgs)
                  </a>
                  <a
                    href="/catalogues/StoneTech_Glass_Bricks_Catalogue_2026.pdf"
                    download="StoneTech_Glass_Bricks_Catalogue_2026.pdf"
                    className="py-1 px-1.5 text-[11px] font-medium rounded border bg-background/80 hover:bg-accent border-border text-foreground flex items-center justify-center gap-1"
                  >
                    <Download className="h-3 w-3 text-sky-600" />
                    Hollow Glass (49 Pgs)
                  </a>
                </div>
              </div>

              {/* 4. Flexible Clay Veneers Catalogue */}
              <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                    <Compass className="h-3.5 w-3.5 text-orange-600" />
                    Flexible Clay Veneers (37 Pgs)
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-4 border-orange-500/40 text-orange-700 dark:text-orange-300"
                  >
                    40 Textures
                  </Badge>
                </div>
                <a
                  href="/catalogues/StoneTech_Flexible_Clay_Veneers_Catalogue_2026.pdf"
                  download="StoneTech_Flexible_Clay_Veneers_Catalogue_2026.pdf"
                  className="w-full py-1 px-2 text-[11px] font-medium rounded border bg-background/80 hover:bg-accent border-border text-foreground flex items-center justify-between gap-1"
                >
                  <span className="flex items-center gap-1.5">
                    <Download className="h-3 w-3 text-orange-600" />
                    <span>Master Catalogue 2026</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">15.4 MB</span>
                </a>
              </div>

              {/* 5. Natural Stone Pebbles Catalogue (NEW!) */}
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                    <CircleDot className="h-3.5 w-3.5 text-amber-500" />
                    Stone Pebbles &amp; Aggregates (23 Pgs)
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-4 border-amber-500/40 text-amber-700 dark:text-amber-300"
                  >
                    75 Varieties
                  </Badge>
                </div>
                <a
                  href="/catalogues/StoneTech_Stone_Pebbles_Catalogue_2026.pdf"
                  download="StoneTech_Stone_Pebbles_Catalogue_2026.pdf"
                  className="w-full py-1 px-2 text-[11px] font-medium rounded border bg-background/80 hover:bg-accent border-border text-foreground flex items-center justify-between gap-1"
                >
                  <span className="flex items-center gap-1.5">
                    <Download className="h-3 w-3 text-amber-500" />
                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                      Master Catalogue 2026
                    </span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">16.2 MB</span>
                </a>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 3. QUICK COLLECTION PILLS WITH LIVE COUNTS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none [touch-action:pan-x]">
        <button
          type="button"
          onClick={() => {
            setSelectedCategory("all");
          }}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
            selectedCategory === "all"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40",
          )}
        >
          All {tabMetadata.countLabel} ({currentDataset.length})
        </button>
        {categoryOptions.map((cat) => (
          <button
            key={cat.key}
            type="button"
            onClick={() => {
              setSelectedCategory(cat.key);
            }}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
              selectedCategory === cat.key
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40",
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 4. SQUEEZED 9-ITEM BOX VIEWPORT WITH SMOOTH IN-BOX SCROLLING */}
      {displayedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border bg-card/40">
          <Layers className="h-10 w-10 text-muted-foreground/60 mb-3" />
          <p className="text-sm font-semibold text-foreground">No matching products found</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
              setSelectedSubFilter("all");
            }}
            className="mt-3 text-xs cursor-pointer"
          >
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* 2-Row 8-Product Catalog Box with Smooth In-Box Scroll */}
          <div
            ref={scrollContainerRef}
            aria-label="Architectural Products 8-Item Frame"
            className={cn(
              "relative w-full rounded-2xl border border-border/80 bg-card/40 p-2 sm:p-3 shadow-inner",
              "h-[530px] sm:h-[560px] md:h-[620px] lg:h-[700px] xl:h-[780px]",
              "overflow-y-auto overscroll-y-auto",
              "[scrollbar-width:thin] scrollbar-thumb-muted-foreground/30 hover:scrollbar-thumb-muted-foreground/60",
              "[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-muted/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50",
            )}
            style={{ overscrollBehaviorY: "auto" }}
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
              {displayedItems.map((item) => (
                <div
                  key={item.code}
                  onClick={() => setLightboxItem(item)}
                  style={{ contentVisibility: "auto", containIntrinsicSize: "360px" }}
                  className="group relative flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card hover:border-amber-500/60 hover:shadow-md transition-all duration-200 cursor-pointer"
                >
                  {/* Squeezed Product Image Frame */}
                  <div className="relative aspect-square w-full overflow-hidden bg-slate-950/80">
                    <img
                      src={item.image}
                      alt={item.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />

                    {/* Top badges */}
                    <div className="absolute top-2 left-2 flex items-center gap-1 z-10">
                      <span className="rounded-md bg-amber-500 px-1.5 py-0.5 text-[9px] font-extrabold text-slate-950 tracking-wider shadow-xs">
                        {item.code}
                      </span>
                      <span className="rounded-md bg-slate-950/85 backdrop-blur-xs px-1.5 py-0.5 text-[8.5px] font-semibold text-cyan-300 border border-cyan-500/30 line-clamp-1 max-w-[110px]">
                        {item.category}
                      </span>
                    </div>

                    {/* Quick Share */}
                    <button
                      type="button"
                      onClick={(e) => handleShare(item, e)}
                      className="absolute top-2 right-2 rounded-full bg-slate-950/70 backdrop-blur-xs p-1 text-slate-300 hover:text-white transition-opacity z-10 cursor-pointer opacity-70 group-hover:opacity-100"
                      title="Share"
                    >
                      <Share2 className="h-3 w-3" />
                    </button>

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-2.5 z-10">
                      <p className="text-[10px] text-amber-300 font-medium line-clamp-1 mb-0.5">
                        {item.details}
                      </p>
                      <div className="flex items-center justify-between text-[11px]">
                        {item.price ? (
                          <span className="text-white font-bold">
                            ₹{item.price}/{item.unit}
                          </span>
                        ) : (
                          <span className="text-white font-bold">Verified Portfolio</span>
                        )}
                        <span className="flex items-center gap-0.5 text-[10px] text-amber-400 font-semibold">
                          <Eye className="h-3 w-3" /> Details
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Squeezed Product Info */}
                  <div className="p-2 sm:p-2.5 flex flex-col flex-1 justify-between gap-1.5">
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-foreground group-hover:text-amber-500 transition-colors line-clamp-1">
                        {item.name}
                      </h3>
                      <p className="text-[10px] sm:text-[11px] text-amber-600 dark:text-amber-400 font-medium line-clamp-1">
                        {item.details}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground line-clamp-1">
                        <span className="font-semibold">Size:</span> {item.sizes}
                      </p>
                    </div>

                    <div className="pt-1.5 border-t border-border/40 flex items-center justify-between gap-1">
                      {item.price ? (
                        <div>
                          <span className="text-xs font-bold text-foreground">₹{item.price}</span>
                          <span className="text-[9px] text-muted-foreground">/{item.unit}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          Live Executed
                        </span>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={(e) => handleSelectProductClick(item, e)}
                        className="h-6 text-[10px] px-2 border-amber-500/40 hover:bg-amber-500 hover:text-slate-950 cursor-pointer font-semibold shrink-0"
                      >
                        Estimate
                        <ArrowRight className="h-2.5 w-2.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Crisp Action & Navigation Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="font-semibold text-foreground">
                Showing {filteredItems.length} {tabMetadata.countLabel}
              </span>
              <span className="hidden md:inline text-[11px]">·</span>
              <span className="hidden md:inline text-[11px]">
                2-Row Frame (8 visible) · Scroll box to explore all
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={scrollToContainerTop}
                className="h-7 px-2.5 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                title="Scroll to Top of Catalog"
              >
                <ChevronUp className="h-3.5 w-3.5 mr-1" />
                Top
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const footer = document.querySelector("footer");
                  if (footer) {
                    footer.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                className="h-7 px-2.5 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                title="Scroll past catalog to Footer"
              >
                <ChevronDown className="h-3.5 w-3.5 mr-1" />
                Page Footer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ARCHITECTURAL LIGHTBOX MODAL */}
      <Dialog
        open={Boolean(lightboxItem)}
        onOpenChange={(open) => {
          if (!open) setLightboxItem(null);
        }}
      >
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-card border-border/80 sm:rounded-2xl">
          {lightboxItem && (
            <div className="flex flex-col md:flex-row">
              <div className="relative aspect-square md:w-1/2 w-full bg-slate-950 flex items-center justify-center overflow-hidden">
                <img
                  src={lightboxItem.image}
                  alt={lightboxItem.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 flex gap-1.5 z-10">
                  <span className="rounded-md bg-amber-500 px-2.5 py-1 text-xs font-extrabold text-slate-950 tracking-wider shadow-md">
                    {lightboxItem.code}
                  </span>
                  <span className="rounded-md bg-slate-950/80 backdrop-blur-xs px-2.5 py-1 text-xs font-semibold text-cyan-300 border border-cyan-500/30">
                    {lightboxItem.category}
                  </span>
                </div>
              </div>

              <div className="p-5 md:p-6 md:w-1/2 flex flex-col justify-between space-y-4 overflow-y-auto max-h-[80vh]">
                <div>
                  <DialogHeader className="p-0 text-left">
                    <DialogTitle className="text-xl font-bold text-foreground">
                      {lightboxItem.name}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                      {lightboxItem.details}
                    </DialogDescription>
                  </DialogHeader>

                  <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                    {lightboxItem.desc}
                  </p>

                  {lightboxItem.specs && (
                    <div className="mt-4 space-y-1.5 border-t border-border/40 pt-3 text-xs">
                      {lightboxItem.specs.map((sp: CatalogItemSpec, i: number) => (
                        <div
                          key={i}
                          className="flex justify-between py-1 border-b border-border/20"
                        >
                          <span className="text-muted-foreground">{sp.label}:</span>
                          <span className="font-semibold text-foreground text-right">{sp.val}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-border/60 space-y-3">
                  {lightboxItem.price ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs text-muted-foreground block">
                          Direct Factory Benchmark
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-foreground">
                            ₹{lightboxItem.price}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            /{lightboxItem.unit}
                          </span>
                        </div>
                      </div>
                      <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-1 text-[10px] font-bold">
                        Ready to Ship
                      </span>
                    </div>
                  ) : null}

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={() => handleSelectProductClick(lightboxItem)}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs h-10 cursor-pointer shadow-md"
                    >
                      Request Estimation for this Product
                      <ArrowRight className="h-4 w-4 ml-1.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={(e) => handleShare(lightboxItem, e)}
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

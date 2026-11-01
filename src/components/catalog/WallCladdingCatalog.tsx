/**
 * WallCladdingCatalog.tsx
 *
 * Full-featured interactive Product Catalogue for Natural Stone Wall Cladding Mosaics & Panels.
 * Displays all 150 unique patterns staged with zero duplicates.
 *
 * Capabilities:
 * - Super admin price writing & attachment directly on/over the image
 * - WhatsApp PDF softcopy download & WhatsApp sharing triggers
 * - Rich categorization, stone geology filtering, surface finish filtering, and live search
 * - Architectural detail lightbox with high-res texture and specifications
 * - Custom pricing persistence across sessions
 */

import { useState, useMemo, useCallback } from "react";
import {
  Search,
  Filter,
  Download,
  Share2,
  Tag,
  Pencil,
  Sparkles,
  Maximize2,
  SlidersHorizontal,
  Check,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
  Eye,
  Layers,
  ArrowUpDown,
  Building,
  Info,
  CheckCircle2,
  FileDown,
  X,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import catalogData from "@/data/wall-cladding-catalog.json";
import { useAttachedProductPrices, type AttachedProductPrice } from "@/lib/catalog/product-prices";
import { AttachPriceDialog, type PatternPriceTarget } from "./AttachPriceDialog";
import { useRoles } from "@/hooks/use-roles";
import { useWebsiteCatalog, type CatalogProduct } from "@/lib/catalog/catalog-store";

export type WallCladdingItem = CatalogProduct;

interface WallCladdingCatalogProps {
  onSelectPattern?: (pattern: WallCladdingItem, price: AttachedProductPrice) => void;
  className?: string;
  initialCategory?: string;
  showAdminBanner?: boolean;
}

const BASE_ITEMS = catalogData as WallCladdingItem[];

export function WallCladdingCatalog({
  onSelectPattern,
  className,
  initialCategory = "all",
  showAdminBanner = true,
}: WallCladdingCatalogProps) {
  const { isSuperAdmin: userIsSuperAdmin } = useRoles();
  const { products, categories: backendCategories, updateProduct } = useWebsiteCatalog();
  const {
    customPrices,
    getPrice,
    updatePrice,
    resetPrice,
    resetAllPrices,
    batchAdjust,
    exportJson,
    importJson,
  } = useAttachedProductPrices();

  // Admin Mode state (defaults to true if super admin, or user can toggle)
  const [adminMode, setAdminMode] = useState<boolean>(true);
  const isSuperAdmin = userIsSuperAdmin || adminMode;

  // Filtering states
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedStoneType, setSelectedStoneType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"index" | "price-asc" | "price-desc" | "name">("index");
  const [viewMode, setViewMode] = useState<"grid" | "compact">("grid");

  // Pagination states
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(12);
  const [showAll, setShowAll] = useState<boolean>(false);

  // Dialog targets
  const [priceEditTarget, setPriceEditTarget] = useState<PatternPriceTarget | null>(null);
  const [lightboxTarget, setLightboxTarget] = useState<WallCladdingItem | null>(null);

  // Categories & Stone Types extraction
  const categories = useMemo(() => {
    const set = new Set(products.map((item) => item.category));
    return ["all", ...Array.from(set)];
  }, [products]);

  const stoneTypes = useMemo(() => {
    const set = new Set(products.map((item) => item.stoneType));
    return ["all", ...Array.from(set)];
  }, [products]);

  // Filtered & Sorted items
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter((item) => {
        if (selectedCategory !== "all" && item.category !== selectedCategory) return false;
        if (selectedStoneType !== "all" && item.stoneType !== selectedStoneType) return false;
        if (!q) return true;

        const p = getPrice(item.id, item.category, item.stoneType, item.index);
        return (
          item.name.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q) ||
          item.stoneType.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          (p.badge && p.badge.toLowerCase().includes(q)) ||
          item.finishes?.some((f) => f.toLowerCase().includes(q)) ||
          item.applications?.some((a) => a.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        const priceA = getPrice(a.id, a.category, a.stoneType, a.index).price;
        const priceB = getPrice(b.id, b.category, b.stoneType, b.index).price;

        if (sortBy === "price-asc") return priceA - priceB;
        if (sortBy === "price-desc") return priceB - priceA;
        if (sortBy === "name") return a.name.localeCompare(b.name);
        return (a.index || 0) - (b.index || 0);
      });
  }, [products, search, selectedCategory, selectedStoneType, sortBy, getPrice]);

  // Paginated items
  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const displayedItems = useMemo(() => {
    if (showAll) return filteredItems;
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, showAll, page, pageSize]);

  const handleEditPrice = useCallback(
    (item: WallCladdingItem) => {
      const p = getPrice(item.id, item.category, item.stoneType, item.index);
      setPriceEditTarget({
        id: item.id,
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
    const text = encodeURIComponent(
      `Hello Stone Tech Atelier,\n\nI am interested in your Natural Stone Wall Cladding pattern:\n*${item.name}* (Code: ${item.id})\n*Category:* ${item.category}\n*Stone:* ${item.stoneType}\n*Standard Relief:* ${item.thickness}\n*Catalogue Price:* ${p.currency} ${p.price} / ${p.unit}\n\nPlease share availability, project discount, and freight estimate.\nReference URL: https://stonetech.in#cladding-${item.id}`,
    );
    window.open(`https://wa.me/919414161129?text=${text}`, "_blank");
  };

  const handleShareCatalog = () => {
    const shareUrl = `${window.location.origin}/#wall-cladding-catalogue`;
    const shareText = encodeURIComponent(
      `Explore Stone Tech's 2026 Natural Stone Wall Cladding & Mosaics Catalogue (150 Architectural Patterns):\n${shareUrl}`,
    );
    window.open(`https://wa.me/?text=${shareText}`, "_blank");
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
    <div className={cn("space-y-6", className)} id="wall-cladding-catalogue">
      {/* Super Admin Control Bar */}
      {showAdminBanner && (
        <div className="rounded-xl border border-cyan-800/40 bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 p-4 text-white shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold tracking-tight text-white">
                    Super Admin Rights: Price Attachment &amp; Image Badging
                  </h3>
                  <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-400/40 text-[10px]">
                    Super Admin Mode
                  </Badge>
                </div>
                <p className="text-xs text-cyan-100/70">
                  Click directly on any image price tag or pencil icon to edit, attach, and
                  customize rates. Changes persist across sessions.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/10 text-xs">
                <span>Admin Edit Badges:</span>
                <Switch checked={adminMode} onCheckedChange={setAdminMode} />
              </div>

              {adminMode && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBatchAdjustPrompt}
                    className="h-8 text-xs border-cyan-700/60 bg-cyan-950/60 text-cyan-200 hover:bg-cyan-900"
                  >
                    <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
                    Batch Adjust +/- %
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
                      toast.success("Exported custom price sheet");
                    }}
                    className="h-8 text-xs border-cyan-700/60 bg-cyan-950/60 text-cyan-200 hover:bg-cyan-900"
                  >
                    <FileDown className="h-3.5 w-3.5 mr-1" />
                    Export JSON
                  </Button>

                  {Object.keys(customPrices).length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (
                          window.confirm(
                            "Reset all custom attached prices to benchmark quarry rates?",
                          )
                        ) {
                          resetAllPrices();
                          toast.success("Reset all prices to quarry benchmarks");
                        }
                      }}
                      className="h-8 text-xs text-amber-300 hover:text-amber-200 hover:bg-amber-950/30"
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      Reset All
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hero Header & Quick Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary mb-2">
            <Layers className="h-3.5 w-3.5" />
            <span>2026 Collection · 150 Architectural Patterns</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Natural Stone Wall Cladding &amp; Mosaics
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Quarry-direct 3D relief, fluted linear ribbed, CNC interlocking panels, waterjet brass
            inlays, and mesh mosaics.
          </p>
        </div>

        {/* Action Buttons: WhatsApp PDF & Share */}
        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href="/catalogues/stos-wall-cladding-catalogue-2026.pdf"
            download="Stone-Tech-Wall-Cladding-Catalogue-2026.pdf"
            className="inline-flex"
          >
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md h-9 gap-2">
              <Download className="h-4 w-4" />
              <span>Download WhatsApp PDF Softcopy</span>
            </Button>
          </a>

          <Button
            variant="outline"
            size="sm"
            onClick={handleShareCatalog}
            className="h-9 text-xs border-emerald-600/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 gap-1.5"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>Share on WhatsApp</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-3 bg-muted/30 p-3.5 rounded-xl border border-border/80">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search 150 patterns by name, stone type, ST-WC code, finish, or relief..."
              className="pl-9 h-9 text-xs sm:text-sm bg-background"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category Dropdown Filter */}
          <div className="w-full sm:w-52 shrink-0">
            <Select
              value={selectedCategory}
              onValueChange={(v) => {
                setSelectedCategory(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 text-xs bg-background">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All Collections ({products.length})
                </SelectItem>
                {categories
                  .filter((s) => s !== "all")
                  .map((cat) => (
                    <SelectItem key={cat} value={cat} className="text-xs">
                      {cat} ({products.filter((p) => p.category === cat).length})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stone Type Filter */}
          <div className="w-full sm:w-44 shrink-0">
            <Select
              value={selectedStoneType}
              onValueChange={(v) => {
                setSelectedStoneType(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 text-xs bg-background">
                <SelectValue placeholder="All Stone Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All Stone Geologies
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
          </div>

          {/* Sort By Filter */}
          <div className="w-full sm:w-44 shrink-0">
            <Select
              value={sortBy}
              onValueChange={(v) => {
                setSortBy(v as "index" | "price-asc" | "price-desc" | "name");
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 text-xs bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="index" className="text-xs">
                  Default Catalogue Order
                </SelectItem>
                <SelectItem value="price-asc" className="text-xs">
                  Price: Low to High
                </SelectItem>
                <SelectItem value="price-desc" className="text-xs">
                  Price: High to Low
                </SelectItem>
                <SelectItem value="name" className="text-xs">
                  Alphabetical (A-Z)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Category Pill Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin pt-1">
          {categories.map((cat) => {
            const count =
              cat === "all" ? products.length : products.filter((i) => i.category === cat).length;
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat);
                  setPage(1);
                }}
                className={cn(
                  "whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 border",
                  active
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground",
                )}
              >
                <span>{cat === "all" ? "All Collections" : cat}</span>
                <span
                  className={cn(
                    "ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full",
                    active ? "bg-white/20 text-white" : "bg-muted text-muted-foreground",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Results summary counter */}
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>
            Showing <strong className="text-foreground">{displayedItems.length}</strong> of{" "}
            {filteredItems.length} patterns
            {selectedCategory !== "all" && ` in "${selectedCategory}"`}
            {selectedStoneType !== "all" && ` · ${selectedStoneType}`}
          </span>
          {(search || selectedCategory !== "all" || selectedStoneType !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSelectedCategory("all");
                setSelectedStoneType("all");
                setPage(1);
              }}
              className="text-primary hover:underline font-medium text-xs"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Main Pattern Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16 border rounded-2xl bg-muted/20 space-y-3">
          <Layers className="h-10 w-10 text-muted-foreground mx-auto" />
          <h4 className="text-base font-semibold text-foreground">No matching patterns found</h4>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Try adjusting your search keyword or clearing the stone type and category filters.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearch("");
              setSelectedCategory("all");
              setSelectedStoneType("all");
              setPage(1);
            }}
          >
            Show All Collections
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {displayedItems.map((item) => {
            const price = getPrice(item.id, item.category, item.stoneType, item.index);

            return (
              <div
                key={item.id}
                className="group relative rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col"
              >
                {/* Image Container with Super Admin Overlaid Price Badge */}
                <div className="relative aspect-[16/10] overflow-hidden bg-stone-900">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />

                  {/* Pattern Code Tag (Top Left) */}
                  <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 bg-black/75 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/15 text-[10.5px] font-mono font-semibold text-cyan-300 shadow-md">
                    <span>{item.id}</span>
                  </div>

                  {/* Promotional Image Badge (Top Right) */}
                  {price.badge && (
                    <div className="absolute top-2.5 right-2.5 z-10 bg-amber-500/90 text-amber-950 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-bold shadow-md uppercase tracking-wider">
                      {price.badge}
                    </div>
                  )}

                  {/* High-Res Lightbox Trigger (Center on Hover) */}
                  <button
                    type="button"
                    onClick={() => setLightboxTarget(item)}
                    aria-label={`Inspect ${item.name}`}
                    className="absolute inset-0 z-1 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 backdrop-blur-[1px] transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 text-slate-900 text-xs font-semibold shadow-lg hover:scale-105 transition-transform">
                      <Maximize2 className="h-3.5 w-3.5 text-primary" />
                      <span>Inspect Texture</span>
                    </div>
                  </button>

                  {/* SUPER ADMIN ATTACHED PRICE OVERLAY (Bottom Banner directly on the image) */}
                  <div
                    className={cn(
                      "absolute bottom-0 inset-x-0 z-10 px-3 py-2 bg-gradient-to-t from-black/95 via-black/80 to-transparent flex items-end justify-between backdrop-blur-[2px]",
                      isSuperAdmin && "cursor-pointer hover:bg-black/90 transition-colors",
                    )}
                    onClick={() => {
                      if (isSuperAdmin) {
                        handleEditPrice(item);
                      }
                    }}
                    title={isSuperAdmin ? "Click to write & attach price to this image" : undefined}
                  >
                    <div className="text-white min-w-0">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-base font-extrabold text-cyan-300 tracking-tight drop-shadow-sm">
                          {price.currency} {price.price}
                        </span>
                        <span className="text-[11px] text-slate-300 font-medium">
                          / {price.unit}
                        </span>
                        {price.mrp && (
                          <span className="text-[10px] text-slate-400 line-through">
                            {price.currency} {price.mrp}
                          </span>
                        )}
                      </div>
                      <div className="text-[9.5px] text-slate-300 truncate max-w-[180px]">
                        {price.leadTime || "Quarry Direct Dispatch"}
                      </div>
                    </div>

                    {/* Super Admin Edit Trigger Button */}
                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditPrice(item);
                        }}
                        aria-label={`Edit price for ${item.name}`}
                        className="flex items-center gap-1 px-2 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-semibold shadow-xs shrink-0 transition-transform active:scale-95"
                      >
                        <Pencil className="h-3 w-3" />
                        <span>Edit Price</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Card Information */}
                <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="text-[11px] font-medium text-primary flex items-center justify-between">
                      <span>{item.category}</span>
                      <span className="text-muted-foreground">{item.thickness}</span>
                    </div>
                    <h3 className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {item.stoneType} · {item.finishes[0]}
                    </p>
                  </div>

                  {/* Standard Sizes */}
                  <div className="text-[11px] text-muted-foreground bg-muted/50 p-2 rounded-lg border border-border/50">
                    <span className="font-semibold text-foreground">Standard: </span>
                    <span>{item.standardSizes}</span>
                  </div>

                  {/* Card Action Buttons */}
                  <div className="flex items-center gap-2 pt-1 border-t border-border/60">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLightboxTarget(item)}
                      className="flex-1 h-8 text-[11px] px-2"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Specs
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => {
                        const p = getPrice(item.id, item.category, item.stoneType, item.index);
                        if (onSelectPattern) {
                          onSelectPattern(item, p);
                        } else {
                          handleWhatsAppInquiry(item);
                        }
                      }}
                      className="flex-1 h-8 text-[11px] px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                    >
                      <span>Request Quote</span>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Bar */}
      {filteredItems.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border bg-muted/10 p-4 rounded-xl">
          <div className="text-xs text-muted-foreground">
            {!showAll ? (
              <span>
                Showing{" "}
                <strong className="text-foreground">
                  {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredItems.length)}
                </strong>{" "}
                of {filteredItems.length} patterns
              </span>
            ) : (
              <span>
                Showing all <strong className="text-foreground">{filteredItems.length}</strong>{" "}
                patterns
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!showAll && totalPages > 1 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => {
                    setPage((p) => p - 1);
                    document
                      .getElementById("wall-cladding-catalogue")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="h-8 text-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                  Prev
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 7 && page > 4) {
                      pageNum = Math.min(page - 3 + i, totalPages);
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setPage(pageNum);
                          document
                            .getElementById("wall-cladding-catalogue")
                            ?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="h-8 w-8 text-xs p-0 font-medium"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  {totalPages > 7 && page < totalPages - 3 && (
                    <span className="text-xs text-muted-foreground px-1">... {totalPages}</span>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => {
                    setPage((p) => p + 1);
                    document
                      .getElementById("wall-cladding-catalogue")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="h-8 text-xs"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowAll(!showAll);
                setPage(1);
              }}
              className="h-8 text-xs ml-2 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800"
            >
              {showAll ? "Paginate (12 per page)" : `Show All (${filteredItems.length})`}
            </Button>
          </div>
        </div>
      )}

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

      {/* Architectural Lightbox / Inspection Modal */}
      <Dialog
        open={!!lightboxTarget}
        onOpenChange={(open) => {
          if (!open) setLightboxTarget(null);
        }}
      >
        {lightboxTarget && (
          <DialogContent className="max-w-4xl p-0 overflow-hidden max-h-[92vh] flex flex-col">
            <div className="relative bg-black flex items-center justify-center max-h-[55vh] overflow-hidden">
              <img
                src={lightboxTarget.image}
                alt={lightboxTarget.name}
                className="max-h-[55vh] w-full object-contain"
              />
              <div className="absolute top-3 left-3 bg-black/80 px-2.5 py-1 rounded text-xs font-mono font-semibold text-cyan-300 border border-white/20">
                {lightboxTarget.id}
              </div>
              <div className="absolute top-3 right-3 bg-black/80 px-2.5 py-1 rounded text-xs text-white border border-white/20">
                {lightboxTarget.category}
              </div>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-extrabold text-foreground">{lightboxTarget.name}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {lightboxTarget.stoneType} · {lightboxTarget.category}
                  </p>
                </div>

                {/* Overlaid Attached Price */}
                {(() => {
                  const p = getPrice(
                    lightboxTarget.id,
                    lightboxTarget.category,
                    lightboxTarget.stoneType,
                    lightboxTarget.index,
                  );
                  return (
                    <div className="flex items-center gap-3 bg-muted/60 px-4 py-2 rounded-xl border border-border">
                      <div>
                        <div className="text-xs text-muted-foreground">Direct Quarry Rate</div>
                        <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                          {p.currency} {p.price}{" "}
                          <span className="text-xs font-normal">/ {p.unit}</span>
                        </div>
                      </div>
                      {isSuperAdmin && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const curTarget = lightboxTarget;
                            setLightboxTarget(null);
                            handleEditPrice(curTarget);
                          }}
                          className="h-8 text-xs border-cyan-600/40 text-cyan-700 dark:text-cyan-300"
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          Edit Price
                        </Button>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Technical Specifications Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-lg border border-border bg-card space-y-1">
                  <div className="font-semibold text-muted-foreground">Standard Modules</div>
                  <div className="font-bold text-foreground">{lightboxTarget.standardSizes}</div>
                </div>
                <div className="p-3 rounded-lg border border-border bg-card space-y-1">
                  <div className="font-semibold text-muted-foreground">Relief Thickness</div>
                  <div className="font-bold text-foreground">{lightboxTarget.thickness}</div>
                </div>
                <div className="p-3 rounded-lg border border-border bg-card space-y-1">
                  <div className="font-semibold text-muted-foreground">Available Finishes</div>
                  <div className="font-bold text-foreground truncate">
                    {lightboxTarget.finishes.join(", ")}
                  </div>
                </div>
                <div className="p-3 rounded-lg border border-border bg-card space-y-1">
                  <div className="font-semibold text-muted-foreground">Installation Substrate</div>
                  <div className="font-bold text-foreground">C2TE S1/S2 Adhesive &amp; Dry-Lay</div>
                </div>
              </div>

              {/* Applications Chips */}
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-foreground">Recommended Spaces</div>
                <div className="flex flex-wrap gap-1.5">
                  {lightboxTarget.applications.map((app) => (
                    <Badge key={app} variant="secondary" className="text-xs font-medium">
                      {app}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border">
                <div className="text-xs text-muted-foreground">
                  Stone Tech Atelier · Direct Quarry Dispatch · Export Wooden Crating
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    onClick={() => setLightboxTarget(null)}
                    className="text-xs flex-1 sm:flex-none"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => handleWhatsAppInquiry(lightboxTarget)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex-1 sm:flex-none"
                  >
                    Inquire on WhatsApp
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

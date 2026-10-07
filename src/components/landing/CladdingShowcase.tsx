/**
 * CladdingShowcase.tsx
 *
 * Interactive Wall Cladding Products Showcase for www.stonetech.in.
 * Displays cladding products with clickable sample images that open
 * high-resolution previews of actual walls where these products are installed.
 */

import { useState } from "react";
import {
  Sparkles,
  Layers,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  CheckCircle2,
  Building2,
  Phone,
  Eye,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useSiteSettingsValue } from "@/lib/site-settings/use-site-settings";
import type { CladdingProductItem } from "@/lib/site-settings/types";
import { cn } from "@/lib/utils";

interface CladdingShowcaseProps {
  onSelectProduct?: (productName: string) => void;
  className?: string;
}

export function CladdingShowcase({ onSelectProduct, className }: CladdingShowcaseProps) {
  const settings = useSiteSettingsValue();
  const products = settings.cladding_products || [];

  const [selectedProduct, setSelectedProduct] = useState<CladdingProductItem | null>(null);
  const [activeWallIndex, setActiveWallIndex] = useState<number>(0);

  const handleOpenProduct = (prod: CladdingProductItem, initialWallIdx = 0) => {
    setSelectedProduct(prod);
    setActiveWallIndex(initialWallIdx);
  };

  const handleNextWall = () => {
    if (!selectedProduct || !selectedProduct.wallImages?.length) return;
    setActiveWallIndex((prev) => (prev + 1) % selectedProduct.wallImages.length);
  };

  const handlePrevWall = () => {
    if (!selectedProduct || !selectedProduct.wallImages?.length) return;
    setActiveWallIndex((prev) => (prev === 0 ? selectedProduct.wallImages.length - 1 : prev - 1));
  };

  return (
    <section
      id="cladding-showcase"
      className={cn("scroll-mt-20 space-y-8", className)}
      aria-label="Wall Cladding Products and Installations"
    >
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/60 pb-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            <Layers className="h-3.5 w-3.5" />
            <span>Interactive Cladding &amp; Wall Applications</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
            Wall Cladding Products
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
            Click on any cladding product below to explore photographs of real architectural walls,
            elevation facades, and luxury interior spaces where they have been installed.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground shrink-0 bg-muted/40 px-3.5 py-2 rounded-lg border border-border/50">
          <Camera className="h-4 w-4 text-primary" />
          <span>Click any tile to view installed walls</span>
        </div>
      </div>

      {/* Cladding products grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((prod) => {
          const wallCount = prod.wallImages?.length || 0;
          return (
            <div
              key={prod.id}
              className="group relative rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col"
            >
              {/* Product material sample photo (clickable) */}
              <div
                className="relative aspect-4/3 w-full overflow-hidden bg-stone-100 dark:bg-stone-900 cursor-pointer"
                onClick={() => handleOpenProduct(prod, 0)}
              >
                <img
                  src={prod.materialImage}
                  alt={prod.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                {/* Badge top-left */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  <Badge
                    variant="secondary"
                    className="bg-background/90 text-foreground backdrop-blur-xs text-[11px] font-semibold border-border/60 shadow-xs"
                  >
                    {prod.category}
                  </Badge>
                </div>

                {/* Click-to-view CTA badge at center-bottom */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                  <div className="flex items-center gap-1.5 text-xs font-semibold drop-shadow-md">
                    <Eye className="h-3.5 w-3.5 text-primary-foreground" />
                    <span>View Installed Walls ({wallCount})</span>
                  </div>
                  <span className="p-1.5 rounded-full bg-white/20 backdrop-blur-md group-hover:bg-primary group-hover:text-primary-foreground transition-colors shadow-xs">
                    <Maximize2 className="h-3.5 w-3.5 text-white" />
                  </span>
                </div>
              </div>

              {/* Product card body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <h3
                    className="font-bold text-base sm:text-lg text-foreground group-hover:text-primary transition-colors cursor-pointer leading-snug"
                    onClick={() => handleOpenProduct(prod, 0)}
                  >
                    {prod.name}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {prod.tagline}
                  </p>

                  {/* Suitable wall location pills */}
                  {prod.suitableWalls && prod.suitableWalls.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-1.5">
                      {prod.suitableWalls.slice(0, 3).map((wall, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 text-[10px] font-medium bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-md border border-border/40"
                        >
                          <Building2 className="h-2.5 w-2.5 text-primary" />
                          {wall}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="pt-3 border-t border-border/50 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs font-semibold h-8 rounded-lg cursor-pointer"
                    onClick={() => handleOpenProduct(prod, 0)}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1 text-primary" />
                    See Walls
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 text-xs font-bold h-8 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
                    onClick={() => {
                      if (onSelectProduct) {
                        onSelectProduct("Custom Stone Cladding");
                      }
                    }}
                  >
                    <span>Get Estimate</span>
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Wall Application Lightbox Dialog */}
      <Dialog
        open={!!selectedProduct}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedProduct(null);
            setActiveWallIndex(0);
          }
        }}
      >
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background border-border/80">
          {selectedProduct && (
            <div className="flex flex-col max-h-[90vh]">
              {/* Modal header */}
              <div className="px-5 sm:px-6 py-4 border-b border-border/70 flex items-center justify-between bg-muted/20">
                <DialogHeader className="space-y-1 text-left">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-semibold text-primary">
                      {selectedProduct.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground">Wall Application Showcase</span>
                  </div>
                  <DialogTitle className="text-lg sm:text-xl font-bold text-foreground">
                    {selectedProduct.name}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground line-clamp-1">
                    {selectedProduct.tagline}
                  </DialogDescription>
                </DialogHeader>
              </div>

              {/* Modal body */}
              <div className="overflow-y-auto p-5 sm:p-6 space-y-6">
                {/* Main Wall Installation Viewer */}
                {selectedProduct.wallImages && selectedProduct.wallImages.length > 0 ? (
                  <div className="space-y-4">
                    <div className="relative aspect-16/10 sm:aspect-16/9 w-full rounded-xl overflow-hidden bg-black/90 shadow-lg border border-border/50">
                      <img
                        src={selectedProduct.wallImages[activeWallIndex]?.url}
                        alt={
                          selectedProduct.wallImages[activeWallIndex]?.title || selectedProduct.name
                        }
                        className="h-full w-full object-contain sm:object-cover"
                      />

                      {/* Navigation buttons */}
                      {selectedProduct.wallImages.length > 1 && (
                        <>
                          <Button
                            variant="secondary"
                            size="icon"
                            className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/60 hover:bg-black/80 text-white border-0 shadow-md backdrop-blur-xs"
                            onClick={handlePrevWall}
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </Button>
                          <Button
                            variant="secondary"
                            size="icon"
                            className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/60 hover:bg-black/80 text-white border-0 shadow-md backdrop-blur-xs"
                            onClick={handleNextWall}
                          >
                            <ChevronRight className="h-5 w-5" />
                          </Button>
                        </>
                      )}

                      {/* Wall Info overlay pill */}
                      <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/85 via-black/50 to-transparent text-white space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground uppercase tracking-wider">
                            <Building2 className="h-3 w-3" />
                            {selectedProduct.wallImages[activeWallIndex]?.spaceType ||
                              "Installed Wall"}
                          </span>
                          <span className="text-xs text-white/80">
                            {activeWallIndex + 1} of {selectedProduct.wallImages.length} Installed
                            Photos
                          </span>
                        </div>
                        <h4 className="text-sm sm:text-base font-bold text-white">
                          {selectedProduct.wallImages[activeWallIndex]?.title}
                        </h4>
                        {selectedProduct.wallImages[activeWallIndex]?.description && (
                          <p className="text-xs text-white/90 line-clamp-2">
                            {selectedProduct.wallImages[activeWallIndex]?.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Thumbnail strip */}
                    {selectedProduct.wallImages.length > 1 && (
                      <div className="flex items-center gap-3 overflow-x-auto pb-2">
                        {selectedProduct.wallImages.map((wall, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveWallIndex(idx)}
                            className={cn(
                              "relative shrink-0 h-16 w-24 sm:h-20 sm:w-28 rounded-lg overflow-hidden border-2 transition-all cursor-pointer",
                              activeWallIndex === idx
                                ? "border-primary ring-2 ring-primary/30 scale-102"
                                : "border-border/60 opacity-70 hover:opacity-100",
                            )}
                          >
                            <img
                              src={wall.url}
                              alt={wall.title}
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/20" />
                            <span className="absolute bottom-1 left-1 text-[9px] font-bold text-white bg-black/60 px-1 rounded truncate max-w-[90%]">
                              {wall.spaceType}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                    Wall photos being curated. Connect with our architect on WhatsApp for high-res
                    project archives.
                  </div>
                )}

                {/* Material & Spec Details Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-xl border border-border/70 bg-muted/20 p-4">
                  <div className="flex items-start gap-3">
                    <img
                      src={selectedProduct.materialImage}
                      alt="Sample Swatch"
                      className="h-16 w-16 rounded-lg object-cover border border-border/80 shrink-0"
                    />
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                        Cladding Swatch
                      </span>
                      <p className="text-xs font-bold text-foreground">{selectedProduct.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {selectedProduct.finish || "Natural Rockface Finish"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Recommended Installation Walls
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(selectedProduct.suitableWalls || []).map((w, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs font-medium">
                          {w}
                        </Badge>
                      ))}
                    </div>
                    {selectedProduct.description && (
                      <p className="text-xs text-muted-foreground pt-1 leading-relaxed">
                        {selectedProduct.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal footer / CTA */}
              <div className="px-5 sm:px-6 py-4 border-t border-border/70 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Custom sizes, dry-lay matching &amp; site delivery across India</span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    asChild
                    size="sm"
                    className="text-xs font-semibold gap-1.5 flex-1 sm:flex-initial"
                  >
                    <a
                      href={`https://wa.me/917742090866?text=${encodeURIComponent(
                        `Hello Stone Tech, I am interested in ${selectedProduct.name} for my wall cladding project. Please share high-res photos and rates.`,
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Phone className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Inquire on WhatsApp</span>
                    </a>
                  </Button>

                  <Button
                    size="sm"
                    className="text-xs font-bold gap-1.5 flex-1 sm:flex-initial bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={() => {
                      if (onSelectProduct) {
                        onSelectProduct("Custom Stone Cladding");
                      }
                      setSelectedProduct(null);
                    }}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Select for Estimate</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

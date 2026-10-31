import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Gift, Check, ShieldCheck, Eye, Flame, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { ShreeYantraDialog } from "./ShreeYantraDialog";

export interface ShreeYantraShowcaseSectionProps {
  isClaimed: boolean;
  onClaimOffer: () => void;
  className?: string;
}

export function ShreeYantraShowcaseSection({
  isClaimed,
  onClaimOffer,
  className,
}: ShreeYantraShowcaseSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <section
        id="shree-yantra-privilege"
        className={cn(
          "py-12 sm:py-16 lg:py-20 border-b border-border/70 bg-gradient-to-b from-amber-500/5 via-stone-50/50 to-emerald-500/5 dark:from-amber-950/20 dark:via-stone-950 dark:to-emerald-950/20 relative overflow-hidden",
          className,
        )}
      >
        {/* Ambient decorative radial glow */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 space-y-10 sm:space-y-12">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-black uppercase text-xs tracking-wider px-3 py-1 shadow-sm border border-amber-400/50">
                <Sparkles className="h-3.5 w-3.5 mr-1 fill-stone-950" />
                Auspicious Architectural Blessing
              </Badge>
              <Badge
                variant="outline"
                className="border-emerald-500/50 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 font-bold text-xs px-3 py-1"
              >
                <Gift className="h-3.5 w-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                Complimentary Gift Worth ₹14,999
              </Badge>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold tracking-tight text-foreground leading-tight">
              Get a Certified Sacred 3D Shree Yantra{" "}
              <span className="text-amber-600 dark:text-amber-400 underline decoration-amber-400/60 underline-offset-6">
                Worth ₹14,999
              </span>{" "}
              With Your Order
            </h2>

            <p className="font-cursive text-lg sm:text-xl text-emerald-700 dark:text-emerald-400 font-bold">
              ✨ Pre-make 100% payment to avail 5% discount + unlock this handcrafted divine
              blessing!
            </p>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              At Stone Tech, we believe timeless stone craftsmanship and sacred geometry share the
              same eternal soul. To honor patrons creating extraordinary homes, villas, and mandirs,
              we present this certified 3D multi-layered Shree Yantra as an auspicious gift.
            </p>
          </div>

          {/* 2-Column Showcase */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left: Masterpiece Artwork Frame */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div
                onClick={() => setModalOpen(true)}
                className="group relative rounded-2xl overflow-hidden border-4 border-amber-400/70 bg-stone-950 shadow-2xl hover:shadow-amber-500/30 hover:border-amber-400 transition-all duration-500 cursor-pointer max-w-md w-full"
              >
                <img
                  src="/images/shree-yantra.jpg"
                  alt="Certified Handcrafted 3D Sacred Shree Yantra Showcase"
                  className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700"
                  loading="lazy"
                />

                {/* Top Corner Floating Badge */}
                <div className="absolute top-3 right-3">
                  <Badge className="bg-amber-500 text-stone-950 font-black text-xs px-2.5 py-1 shadow-lg border border-amber-300">
                    MRP ₹14,999 · FREE GIFT
                  </Badge>
                </div>

                {/* Bottom Inspection Plaque */}
                <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 bg-gradient-to-t from-stone-950/95 via-stone-950/80 to-transparent flex items-center justify-between text-xs text-amber-200">
                  <span className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-amber-400" />
                    Certified Sacred 3D Geometry
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-300 group-hover:underline">
                    <Eye className="h-3.5 w-3.5" />
                    Tap to expand
                  </span>
                </div>
              </div>

              <div className="mt-3 text-center">
                <span className="text-xs text-muted-foreground font-medium">
                  Multi-layered natural hardwood · Sacred central bindu · Authentic Vedic
                  proportions
                </span>
              </div>
            </div>

            {/* Right: Privileges & Significance */}
            <div className="lg:col-span-7 space-y-6">
              {/* Highlight Perks Card */}
              <div className="p-4 sm:p-5 rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-amber-500/10 to-teal-500/10 dark:from-emerald-950/40 dark:via-stone-900/80 dark:to-teal-950/40 space-y-3.5 shadow-sm">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  <Flame className="h-4 w-4 text-amber-500 fill-amber-500" />
                  Double Celebration Privilege Breakdown:
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 bg-white/70 dark:bg-stone-900/70 p-3 rounded-xl border border-emerald-500/20">
                    <div className="h-7 w-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 font-black text-xs">
                      1
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-bold text-foreground">
                        Flat 5% Instant Cash Deduction
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Pre-make 100% advance payment upon quotation confirmation to lock in a
                        direct 5% discount across your custom stone fabrication order.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-white/70 dark:bg-stone-900/70 p-3 rounded-xl border border-amber-500/20">
                    <div className="h-7 w-7 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center shrink-0 font-black text-xs">
                      2
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-bold text-foreground">
                        FREE Certified Shree Yantra (Worth ₹14,999)
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Gifted with every purchase of more than ₹1 Lakh (Product amount)*, safely
                        crated and delivered right to your doorstep along with your natural stone
                        order.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3 Craftsmanship Pillars */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-border/80 bg-background/80 space-y-1">
                  <div className="text-amber-500 font-bold text-xs uppercase tracking-wide flex items-center gap-1">
                    🕉️ Sacred Form
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    9 interlocking triangles creating 43 sub-triangles for spiritual resonance.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-border/80 bg-background/80 space-y-1">
                  <div className="text-amber-500 font-bold text-xs uppercase tracking-wide flex items-center gap-1">
                    🪵 Layered Wood
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Precision CNC relief in seasoned natural hardwood with deep multi-tier depth.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-border/80 bg-background/80 space-y-1">
                  <div className="text-amber-500 font-bold text-xs uppercase tracking-wide flex items-center gap-1">
                    📜 Certified
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Includes official authenticity certificate and luxury gift packaging.
                  </p>
                </div>
              </div>

              {/* Asterisk Terms & Conditions */}
              <div className="p-3 rounded-xl bg-muted/60 border border-border text-xs text-muted-foreground space-y-1">
                <span className="font-bold text-foreground block">* Terms &amp; Conditions:</span>
                <p className="leading-relaxed">
                  The complimentary certified Shree Yantra (worth ₹14,999) is applicable on stone
                  product purchase value exceeding ₹1,00,000 (excludes site installation labour and
                  chemical/adhesive charges). 5% prepayment discount is applied upon quotation
                  approval with 100% advance payment.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <Button
                  type="button"
                  onClick={onClaimOffer}
                  className={cn(
                    "w-full sm:w-auto font-bold text-xs h-11 px-6 gap-2 shadow-md transition-all cursor-pointer",
                    isClaimed
                      ? "bg-emerald-700 hover:bg-emerald-800 text-white"
                      : "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white hover:scale-[1.02]",
                  )}
                >
                  {isClaimed ? (
                    <>
                      <Check className="h-4 w-4 stroke-[3]" />
                      <span>Privilege Claimed · Scroll to Form</span>
                      <ArrowUp className="h-3.5 w-3.5 ml-1" />
                    </>
                  ) : (
                    <>
                      <Gift className="h-4 w-4" />
                      <span>Claim 5% Discount + Free Shree Yantra</span>
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(true)}
                  className="w-full sm:w-auto font-semibold text-xs h-11 px-5 border-amber-400/50 hover:bg-amber-500/10 text-stone-800 dark:text-amber-200 cursor-pointer"
                >
                  <Eye className="h-4 w-4 mr-1.5 text-amber-600 dark:text-amber-400" />
                  <span>Inspect Sacred Geometry Details</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modal Dialog */}
      <ShreeYantraDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        onClaimOffer={onClaimOffer}
        isClaimed={isClaimed}
      />
    </>
  );
}

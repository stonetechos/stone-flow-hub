import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, Check, ShieldCheck, Eye, Flame, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ShreeYantraDialog } from "./ShreeYantraDialog";

export interface ShreeYantraHeroShowcaseProps {
  isClaimed: boolean;
  onToggleClaim: () => void;
  className?: string;
}

export function ShreeYantraHeroShowcase({
  isClaimed,
  onToggleClaim,
  className,
}: ShreeYantraHeroShowcaseProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div
        className={cn(
          "relative rounded-2xl border-2 transition-all duration-300 p-4 sm:p-5 shadow-lg overflow-hidden group",
          isClaimed
            ? "border-emerald-500 bg-gradient-to-br from-emerald-500/10 via-amber-500/5 to-teal-500/10 dark:from-emerald-950/40 dark:via-stone-900/90 dark:to-teal-950/40 ring-2 ring-emerald-500/40"
            : "border-amber-400/80 bg-gradient-to-br from-amber-500/10 via-stone-50/70 to-emerald-500/10 dark:from-amber-950/30 dark:via-stone-900/90 dark:to-emerald-950/30 hover:border-amber-500 ring-1 ring-amber-400/30",
          className,
        )}
      >
        {/* Ambient warm golden glow in background */}
        <div className="absolute top-0 right-0 w-60 h-60 bg-gradient-to-br from-amber-400/20 via-amber-500/10 to-transparent rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-emerald-400/15 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          {isClaimed && (
            <div className="flex justify-end">
              <Badge className="bg-emerald-600 text-white font-extrabold text-[10px] sm:text-[11px] px-2.5 py-0.5 tracking-wider animate-in fade-in shadow-xs">
                ✓ PRIVILEGE UNLOCKED
              </Badge>
            </div>
          )}

          {/* 2. Headline & Subtitle */}
          <div className="space-y-1.5 text-left">
            <h3 className="text-lg sm:text-xl lg:text-[22px] font-serif font-bold text-foreground tracking-tight leading-snug">
              Get a Certified Sacred 3D Shree Yantra{" "}
              <span className="text-amber-600 dark:text-amber-400 underline decoration-amber-400/60 underline-offset-4">
                Worth ₹14,999
              </span>{" "}
              With Your Order
            </h3>

            <p className="font-cursive text-base sm:text-lg text-emerald-700 dark:text-emerald-400 font-bold">
              ✨ Pre-make 100% payment to avail 5% discount + unlock this handcrafted divine
              blessing!
            </p>

            <p className="text-xs text-muted-foreground leading-relaxed">
              At Stone Tech, we believe timeless stone craftsmanship and sacred geometry share the
              same eternal soul. To honor patrons creating extraordinary homes, villas, and mandirs,
              we present this certified 3D multi-layered Shree Yantra as an auspicious gift.
            </p>
          </div>

          {/* 3. Middle Section: Image Showcase + Double Privilege Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 sm:gap-4 items-stretch">
            {/* Left: Masterpiece Artwork Frame */}
            <div className="sm:col-span-5 flex flex-col items-center justify-center">
              <div
                onClick={() => setModalOpen(true)}
                className="group/img relative rounded-xl overflow-hidden border-2 border-amber-400/80 bg-stone-950 shadow-md hover:shadow-amber-500/30 hover:border-amber-400 transition-all duration-300 cursor-pointer w-full max-w-[210px] aspect-3/4 sm:aspect-auto sm:h-full sm:min-h-[190px] flex items-center justify-center"
                title="Click to view certified Shree Yantra artwork in full resolution"
              >
                <img
                  src="/images/shree-yantra.jpg"
                  alt="Certified Handcrafted 3D Sacred Shree Yantra Showcase"
                  className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500"
                  loading="eager"
                />

                {/* Bottom Inspection Plaque */}
                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-stone-950/95 via-stone-950/80 to-transparent flex items-center justify-between text-[10px] text-amber-200">
                  <span className="font-bold flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-amber-400" />
                    Sacred 3D Geometry
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-amber-300 font-semibold group-hover/img:underline">
                    <Eye className="h-2.5 w-2.5" />
                    Tap to zoom
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Double Celebration Privilege Breakdown */}
            <div className="sm:col-span-7 flex flex-col justify-between space-y-2">
              <div className="p-3 sm:p-3.5 rounded-xl border border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-amber-500/5 to-teal-500/10 dark:from-emerald-950/40 dark:via-stone-900/80 dark:to-teal-950/40 space-y-2.5">
                <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  <Flame className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                  Double Celebration Privilege Breakdown:
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-2.5 bg-white/80 dark:bg-stone-900/80 p-2.5 rounded-lg border border-emerald-500/20 shadow-2xs">
                    <div className="h-5 w-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 font-black text-[10px] mt-0.5">
                      1
                    </div>
                    <div className="space-y-0.5 text-left">
                      <h4 className="text-xs font-bold text-foreground leading-tight">
                        Flat 5% Instant Cash Deduction
                      </h4>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        Pre-make 100% advance payment upon quotation confirmation to lock in a
                        direct 5% discount across your custom stone order.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 bg-white/80 dark:bg-stone-900/80 p-2.5 rounded-lg border border-amber-500/20 shadow-2xs">
                    <div className="h-5 w-5 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center shrink-0 font-black text-[10px] mt-0.5">
                      2
                    </div>
                    <div className="space-y-0.5 text-left">
                      <h4 className="text-xs font-bold text-foreground leading-tight">
                        FREE Certified Shree Yantra (Worth ₹14,999)
                      </h4>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        Gifted with every purchase of more than ₹1 Lakh (Product amount)*, safely
                        crated and delivered right to your doorstep.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Three Craftsmanship Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-0.5">
            <div className="p-2 sm:p-2.5 rounded-lg border border-border/80 bg-background/80 space-y-0.5 text-left">
              <div className="text-amber-600 dark:text-amber-400 font-bold text-[11px] uppercase tracking-wide flex items-center gap-1">
                🕉️ Sacred Form
              </div>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-tight">
                9 interlocking triangles creating 43 sub-triangles for spiritual resonance.
              </p>
            </div>

            <div className="p-2 sm:p-2.5 rounded-lg border border-border/80 bg-background/80 space-y-0.5 text-left">
              <div className="text-amber-600 dark:text-amber-400 font-bold text-[11px] uppercase tracking-wide flex items-center gap-1">
                🪵 Layered Wood
              </div>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-tight">
                Precision CNC relief in seasoned natural hardwood with multi-tier depth.
              </p>
            </div>

            <div className="p-2 sm:p-2.5 rounded-lg border border-border/80 bg-background/80 space-y-0.5 text-left">
              <div className="text-amber-600 dark:text-amber-400 font-bold text-[11px] uppercase tracking-wide flex items-center gap-1">
                📜 Certified
              </div>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-tight">
                Includes official authenticity certificate and luxury gift packaging.
              </p>
            </div>
          </div>

          {/* 5. Terms & Conditions Footnote Box */}
          <div className="p-2.5 sm:p-3 rounded-lg bg-muted/60 border border-border text-[11px] text-muted-foreground text-left space-y-0.5">
            <span className="font-bold text-foreground block">* Terms &amp; Conditions:</span>
            <p className="leading-relaxed">
              The complimentary certified Shree Yantra (worth ₹14,999) is applicable on stone
              product purchase value exceeding ₹1,00,000 (excludes site installation labour and
              chemical/adhesive charges). 5% prepayment discount is applied upon quotation approval
              with 100% advance payment.
            </p>
          </div>

          {isClaimed && (
            <p className="font-cursive text-emerald-700 dark:text-emerald-300 text-sm font-bold pt-0.5 animate-in fade-in duration-200 text-left">
              🎉 Both privileges are registered! Complete the estimate form on the right to lock in
              your quotation.
            </p>
          )}

          {/* 6. Action Buttons */}
          <div className="pt-1 flex flex-col sm:flex-row items-center gap-2.5">
            <Button
              type="button"
              onClick={onToggleClaim}
              className={cn(
                "w-full sm:flex-1 font-bold text-xs h-10 sm:h-11 px-4 gap-1.5 shadow-md cursor-pointer transition-all",
                isClaimed
                  ? "bg-emerald-700 hover:bg-emerald-800 text-white"
                  : "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white hover:scale-[1.02]",
              )}
            >
              {isClaimed ? (
                <>
                  <Check className="h-4 w-4 stroke-[3]" />
                  <span>5% Off + Free Shree Yantra Claimed</span>
                </>
              ) : (
                <>
                  <Gift className="h-4 w-4" />
                  <span>Claim 5% Discount + Free Shree Yantra</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(true)}
              className="w-full sm:w-auto font-semibold text-xs h-10 sm:h-11 px-4 border-amber-400/60 hover:bg-amber-500/10 text-stone-800 dark:text-amber-200 cursor-pointer"
            >
              <Eye className="h-3.5 w-3.5 mr-1 text-amber-600 dark:text-amber-400" />
              <span>Inspect Sacred Geometry Details</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Lightbox / Details Modal */}
      <ShreeYantraDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        onClaimOffer={() => {
          if (!isClaimed) onToggleClaim();
        }}
        isClaimed={isClaimed}
      />
    </>
  );
}

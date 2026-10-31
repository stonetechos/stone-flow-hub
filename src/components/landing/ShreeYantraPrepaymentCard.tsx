import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check, Gift, ArrowRight, Eye, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { ShreeYantraDialog } from "./ShreeYantraDialog";

export interface ShreeYantraPrepaymentCardProps {
  isClaimed: boolean;
  onToggleClaim: () => void;
  className?: string;
}

export function ShreeYantraPrepaymentCard({
  isClaimed,
  onToggleClaim,
  className,
}: ShreeYantraPrepaymentCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <>
      <div
        className={cn(
          "relative rounded-2xl border-2 transition-all duration-300 p-4 sm:p-5 shadow-md overflow-hidden group",
          isClaimed
            ? "border-emerald-500 bg-gradient-to-br from-emerald-950/20 via-amber-50/50 to-teal-950/20 dark:from-emerald-950/50 dark:via-stone-900/90 dark:to-teal-950/50 ring-2 ring-emerald-500/40 shadow-lg"
            : "border-amber-400/60 bg-gradient-to-br from-amber-500/10 via-white to-emerald-500/10 dark:from-amber-950/30 dark:via-stone-900/90 dark:to-emerald-950/30 hover:border-amber-500 ring-1 ring-amber-400/30",
          className,
        )}
      >
        {/* Ambient Warm Golden Glow in background */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-gradient-to-br from-amber-400/20 to-emerald-400/15 rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />

        <div className="relative z-10 space-y-3.5">
          {/* Top Bar: Badges & Peppy Tagline */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-stone-950 text-[10px] sm:text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 border border-amber-300 shadow-xs">
                <Sparkles className="h-3 w-3 mr-1 fill-stone-950 inline" />
                Celebration Privilege
              </Badge>
              <span className="font-cursive text-amber-700 dark:text-amber-400 font-bold text-sm sm:text-base">
                100% Prepay = Flat 5% Off + ₹14,999 Divine Gift! ✨
              </span>
            </div>

            {isClaimed && (
              <Badge className="bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5 tracking-wider animate-in fade-in">
                ✓ PRIVILEGE UNLOCKED
              </Badge>
            )}
          </div>

          {/* Main Visual Content: Image + Perks */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            {/* Shree Yantra Visual Thumbnail with Badges */}
            <div
              onClick={() => setDetailsOpen(true)}
              className="relative shrink-0 cursor-pointer group/img rounded-xl overflow-hidden border-2 border-amber-400/80 bg-stone-950 shadow-md hover:shadow-amber-500/30 hover:scale-105 transition-all duration-300 w-28 h-28 sm:w-32 sm:h-32"
              title="Click to view certified Shree Yantra artwork details"
            >
              <img
                src="/images/shree-yantra.jpg"
                alt="Certified Handcrafted 3D Sacred Shree Yantra worth ₹14,999"
                className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-500"
                loading="eager"
              />
              {/* Overlay Badge */}
              <div className="absolute top-1 left-1 right-1 flex justify-center">
                <Badge className="bg-amber-500 text-stone-950 font-black text-[9px] px-1.5 py-0 shadow-xs border border-amber-300">
                  FREE · MRP ₹14,999
                </Badge>
              </div>
              {/* Bottom Quick Look Bar */}
              <div className="absolute inset-x-0 bottom-0 bg-stone-950/85 backdrop-blur-xs py-1 px-1 text-center flex items-center justify-center gap-1 text-[9px] font-semibold text-amber-200">
                <Eye className="h-2.5 w-2.5" />
                <span>Tap to inspect</span>
              </div>
            </div>

            {/* Offer Copy & Bullet Perks */}
            <div className="space-y-2 flex-1 min-w-0 text-left">
              <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight leading-snug">
                Premake 100% Payment to Avail{" "}
                <span className="text-emerald-700 dark:text-emerald-400 underline decoration-amber-400/70 underline-offset-4 font-extrabold">
                  5% Discount
                </span>{" "}
                + Free Shree Yantra
              </h3>

              {/* 2 Bullet Perks */}
              <div className="space-y-1.5 text-xs text-foreground/90">
                <div className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold text-sm shrink-0">⚡</span>
                  <span className="leading-tight">
                    <strong className="text-emerald-800 dark:text-emerald-300 font-bold">
                      Flat 5% Instant Cash Discount
                    </strong>{" "}
                    deducted on entire quotation upon 100% advance payment.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold text-sm shrink-0">🪔</span>
                  <span className="leading-tight">
                    <strong className="text-amber-700 dark:text-amber-300 font-bold">
                      FREE Certified Shree Yantra (Worth ₹14,999)
                    </strong>{" "}
                    gifted with every purchase of more than ₹1 Lakh (Product amount)*.
                  </span>
                </div>
              </div>

              {/* Terms Footnote */}
              <p className="text-[11px] text-muted-foreground/90 leading-tight pt-1">
                * <span className="font-semibold">Terms &amp; Conditions:</span> Complimentary Shree
                Yantra applies strictly on natural stone product value &gt; ₹1,00,000 (excludes
                installation &amp; chemical charges).
              </p>

              {isClaimed && (
                <p className="font-cursive text-emerald-700 dark:text-emerald-300 text-sm font-bold pt-1 animate-in fade-in duration-200">
                  🎉 Both privileges are registered! Fill the estimate form to finalize your quote.
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-1 flex flex-col sm:flex-row items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={onToggleClaim}
              className={cn(
                "w-full sm:flex-1 text-xs font-bold h-10 px-4 gap-1.5 shadow-sm cursor-pointer transition-all",
                isClaimed
                  ? "bg-emerald-700 hover:bg-emerald-800 text-white"
                  : "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white hover:scale-[1.02] shadow-emerald-500/20",
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
              size="sm"
              onClick={() => setDetailsOpen(true)}
              className="w-full sm:w-auto text-xs font-semibold h-10 px-3.5 border-amber-400/50 hover:bg-amber-500/10 text-stone-800 dark:text-amber-200 cursor-pointer"
            >
              <Eye className="h-3.5 w-3.5 mr-1 text-amber-600 dark:text-amber-400" />
              <span>Inspect Artwork (₹14,999)</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Lightbox / Details Modal */}
      <ShreeYantraDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onClaimOffer={() => {
          if (!isClaimed) onToggleClaim();
        }}
        isClaimed={isClaimed}
      />
    </>
  );
}

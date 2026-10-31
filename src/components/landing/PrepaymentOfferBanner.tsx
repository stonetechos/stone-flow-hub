import { useState } from "react";
import { Sparkles, Calculator, ArrowRight, X, Percent, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PrepaymentOfferBannerProps {
  onOpenCalculator: () => void;
  onClaimDiscount: () => void;
  className?: string;
}

export function PrepaymentOfferBanner({
  onOpenCalculator,
  onClaimDiscount,
  className,
}: PrepaymentOfferBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) {
    return (
      <div className="fixed bottom-16 sm:bottom-6 left-4 z-40 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <button
          type="button"
          onClick={() => setIsDismissed(false)}
          className="group flex items-center gap-2 rounded-full border border-amber-400/40 bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-950 px-3.5 py-1.5 text-xs text-white shadow-xl backdrop-blur-md transition-all hover:scale-105 hover:border-amber-400 cursor-pointer"
          title="Reopen 5% Prepayment Offer Banner"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400/20 text-amber-300 text-[10px]">
            ✨
          </span>
          <span className="font-bold text-[11px] text-amber-300">100% Prepay = 5% Off</span>
          <span className="font-cursive text-emerald-300 text-sm hidden sm:inline">
            Tap to view offer
          </span>
        </button>
      </div>
    );
  }

  return (
    <aside
      aria-label="Prepayment discount offer"
      className={cn(
        "relative z-40 border-b border-amber-400/30 bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-950 text-white shadow-md overflow-hidden",
        className,
      )}
    >
      {/* Subtle animated gradient sweep */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_3s_infinite] pointer-events-none" />

      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-2 sm:py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 text-center sm:text-left">
        {/* Left Side: Badge & Offer Tagline */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center sm:justify-start">
          <Badge className="bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 font-black text-[10px] sm:text-[11px] uppercase tracking-wider px-2 py-0.5 shadow-xs border border-amber-300/40 shrink-0">
            <Sparkles className="h-3 w-3 mr-1 fill-stone-950 shrink-0" />
            <span>Privilege Offer</span>
          </Badge>

          <div className="text-xs sm:text-sm font-semibold tracking-tight text-white flex items-center gap-1.5 flex-wrap justify-center">
            <span>Premake 100% payment to avail</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-extrabold border border-emerald-400/40">
              5% instant discount
            </span>
            <span className="hidden md:inline text-stone-200">on all custom stone orders!</span>
            <span className="font-cursive text-amber-300 text-base sm:text-lg font-bold ml-1 hidden lg:inline">
              ✨ 100% Advance = 5% Off
            </span>
          </div>
        </div>

        {/* Right Side: Interactive Action Buttons & Dismiss */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenCalculator}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold bg-white/10 hover:bg-white/20 text-emerald-200 hover:text-white border border-white/15 backdrop-blur-xs transition-colors cursor-pointer"
          >
            <Calculator className="h-3.5 w-3.5 text-amber-300" />
            <span>Calculate Savings</span>
          </button>

          <Button
            type="button"
            size="sm"
            onClick={onClaimDiscount}
            className="h-7 sm:h-8 px-2.5 sm:px-3 text-[11px] sm:text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white gap-1 shadow-sm border border-emerald-400/30 cursor-pointer"
          >
            <span>Claim 5% Off</span>
            <ArrowRight className="h-3 w-3" />
          </Button>

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1 rounded-md text-stone-400 hover:text-white hover:bg-white/10 transition-colors ml-1 cursor-pointer"
            aria-label="Dismiss offer banner"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

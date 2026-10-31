import { useState, useId } from "react";
import { Sparkles, Calculator, Check, ArrowRight, ShieldCheck, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatInr } from "@/lib/format";

interface PrepaymentOfferCardProps {
  onApplyDiscount?: () => void;
  className?: string;
  isCompact?: boolean;
}

const PRESET_AMOUNTS = [
  { label: "₹50K", value: 50000, desc: "Accent Wall / Vanity" },
  { label: "₹1.5L", value: 150000, desc: "Living Room Cladding" },
  { label: "₹3L", value: 300000, desc: "Elevation Facade" },
  { label: "₹5L", value: 500000, desc: "Luxury Villa / Mandir" },
  { label: "₹10L", value: 1000000, desc: "Grand Estate / Monolith" },
];

export function PrepaymentOfferCard({
  onApplyDiscount,
  className,
  isCompact = false,
}: PrepaymentOfferCardProps) {
  const [amount, setAmount] = useState<number>(150000);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const inputId = useId();

  const discountAmount = Math.round(amount * 0.05);
  const netAmount = amount - discountAmount;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setAmount(val);
    setIsCustomMode(false);
  };

  const handleCustomInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, "");
    const num = Number(rawVal);
    setAmount(Number.isFinite(num) ? num : 0);
    setIsCustomMode(true);
  };

  return (
    <div
      className={cn(
        "relative rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-background to-teal-950/20 dark:from-emerald-950/40 dark:via-stone-900/90 dark:to-teal-950/40 p-5 sm:p-6 shadow-xl backdrop-blur-sm overflow-hidden ring-1 ring-emerald-500/20",
        className,
      )}
    >
      {/* Subtle background decorative light & pattern */}
      <div className="absolute -top-16 -right-16 h-36 w-36 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 h-36 w-36 rounded-full bg-teal-500/10 blur-2xl pointer-events-none" />

      {/* Header Tagline & Special Cursive Font */}
      <div className="relative z-10 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-950 font-black text-[11px] uppercase tracking-wider px-2.5 py-0.5 shadow-sm border border-amber-400/40 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 fill-stone-950" />
            <span>Special Privilege Offer</span>
          </Badge>
          <span className="font-cursive text-emerald-600 dark:text-emerald-400 text-base sm:text-lg font-bold tracking-wide">
            100% Prepayment = Flat 5% Off
          </span>
        </div>

        <div>
          <h3 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Premake 100% payment to avail 5% discount</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pay 100% advance upon quotation approval to lock in an instant 5% privilege discount on
            your custom stone order.
          </p>
        </div>
      </div>

      {/* Interactive Savings Calculator */}
      <div className="relative z-10 mt-5 space-y-4 pt-4 border-t border-border/80">
        <div className="flex items-center justify-between text-xs font-semibold text-foreground">
          <label htmlFor={inputId} className="flex items-center gap-1.5 cursor-pointer">
            <Calculator className="h-3.5 w-3.5 text-primary" />
            <span>Select or Enter Project Estimate:</span>
          </label>
          <span className="text-primary font-bold text-sm">{formatInr(amount)}</span>
        </div>

        {/* Preset Chips */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
          {PRESET_AMOUNTS.map((preset) => {
            const isSelected = !isCustomMode && amount === preset.value;
            return (
              <button
                key={preset.value}
                type="button"
                onClick={() => {
                  setAmount(preset.value);
                  setIsCustomMode(false);
                }}
                className={cn(
                  "p-2 rounded-xl text-center text-xs font-semibold border transition-all cursor-pointer select-none",
                  isSelected
                    ? "border-emerald-600 dark:border-emerald-400 bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/30 scale-[1.02]"
                    : "border-border/80 bg-background/90 hover:bg-muted text-muted-foreground hover:text-foreground",
                )}
                title={preset.desc}
              >
                <div className="font-bold">{preset.label}</div>
                <div
                  className={cn(
                    "text-[9px] truncate mt-0.5",
                    isSelected ? "text-emerald-100" : "text-muted-foreground/80",
                  )}
                >
                  {preset.desc.split("/")[0]}
                </div>
              </button>
            );
          })}
        </div>

        {/* Interactive Slider & Custom Value Input */}
        <div className="space-y-2">
          <input
            type="range"
            min={25000}
            max={1000000}
            step={5000}
            value={amount}
            onChange={handleSliderChange}
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-emerald-600 dark:accent-emerald-400"
            aria-label="Adjust stone project amount"
          />
          <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
            <span>₹25,000</span>
            <span>₹5,00,000</span>
            <span>₹10,00,000+</span>
          </div>
        </div>

        {/* Custom Input */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
              ₹
            </span>
            <Input
              id={inputId}
              type="text"
              value={amount ? amount.toLocaleString("en-IN") : ""}
              onChange={handleCustomInput}
              placeholder="Enter custom amount..."
              className="pl-7 h-9 text-xs font-medium bg-background"
            />
          </div>
          {isCustomMode && (
            <Badge variant="outline" className="text-[10px] text-primary shrink-0">
              Custom Value
            </Badge>
          )}
        </div>

        {/* Dynamic Calculation Breakdown */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/30 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Estimated Project Value:</span>
            <span className="font-semibold text-foreground">{formatInr(amount)}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
              <Tag className="h-3 w-3" />
              <span>Instant 5% Prepayment Discount:</span>
            </span>
            <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
              - {formatInr(discountAmount)}
            </span>
          </div>

          <div className="pt-2 border-t border-border/60 flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Net Amount Payable:</span>
            <span className="text-base sm:text-lg font-black text-foreground">
              {formatInr(netAmount)}
            </span>
          </div>

          {/* Celebratory Callout with Cursive Font */}
          <div className="pt-1 text-center">
            <span className="font-cursive text-emerald-700 dark:text-emerald-300 text-base sm:text-lg font-bold">
              ✨ You save {formatInr(discountAmount)} directly with 100% advance payment!
            </span>
          </div>
        </div>

        {/* 1-Tap Action Button */}
        {onApplyDiscount && (
          <Button
            type="button"
            onClick={onApplyDiscount}
            className="w-full h-11 text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-md cursor-pointer transition-all hover:scale-[1.01]"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Claim 5% Discount in Estimate</span>
            <ArrowRight className="h-4 w-4 ml-auto" />
          </Button>
        )}
      </div>
    </div>
  );
}

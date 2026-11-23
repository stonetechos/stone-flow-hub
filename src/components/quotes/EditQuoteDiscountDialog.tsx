import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Loader2, Sparkles, Tag, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NumericInput } from "@/components/forms/inputs/SmartInputs";
import { formatInr } from "@/lib/format";
import { toUserMessage } from "@/lib/errors";
import { invalidateQuote } from "@/lib/query-invalidation";
import { updateQuoteDiscount } from "@/lib/quotes/api";
import { calculateEffectiveQuoteTotal } from "@/lib/quotes/discount";

interface EditQuoteDiscountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId: string;
  quoteNo: string;
  subtotal: number;
  taxAmount: number;
  currentDiscount: number;
  saleMode?: string;
}

const PRESET_DISCOUNTS = [500, 1000, 2000, 3500, 5000, 10000];

export function EditQuoteDiscountDialog({
  open,
  onOpenChange,
  quoteId,
  quoteNo,
  subtotal,
  taxAmount,
  currentDiscount,
  saleMode = "invoiced",
}: EditQuoteDiscountDialogProps) {
  const qc = useQueryClient();
  const [discountVal, setDiscountVal] = useState<string>("");

  useEffect(() => {
    if (open) {
      setDiscountVal(currentDiscount > 0 ? String(currentDiscount) : "");
    }
  }, [open, currentDiscount]);

  const numericDiscount = discountVal.trim() ? Number(discountVal) : 0;
  const validDiscount = !isNaN(numericDiscount) && numericDiscount > 0 ? numericDiscount : 0;

  const breakdown = calculateEffectiveQuoteTotal({
    subtotal,
    taxAmount,
    discountAmount: validDiscount,
    saleMode,
  });

  const mutation = useMutation({
    mutationFn: () => updateQuoteDiscount(quoteId, validDiscount > 0 ? validDiscount : null),
    onSuccess: () => {
      invalidateQuote(qc, quoteId);
      if (validDiscount > 0) {
        toast.success(
          `Discount of ${formatInr(validDiscount)} applied to ${quoteNo}. Total is now ${formatInr(breakdown.total)}.`,
        );
      } else {
        toast.success(
          `Discount removed from ${quoteNo}. Total restored to ${formatInr(breakdown.total)}.`,
        );
      }
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(toUserMessage(err));
    },
  });

  const applyPreset = (amount: number) => {
    setDiscountVal(String(amount));
  };

  const clearDiscount = () => {
    setDiscountVal("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold">
                Negotiated Discount · {quoteNo}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Apply an agreed lumpsum amount to reduce the total quotation payable.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Discount Input */}
          <div>
            <label className="text-xs font-semibold text-foreground flex items-center justify-between mb-1.5">
              <span>Discount Amount (₹ lumpsum)</span>
              {validDiscount > 0 && (
                <button
                  type="button"
                  onClick={clearDiscount}
                  className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-0.5 cursor-pointer"
                >
                  <X className="h-3 w-3" /> Clear
                </button>
              )}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                ₹
              </span>
              <NumericInput
                placeholder="e.g. 3500"
                value={discountVal}
                onChange={(val) => setDiscountVal(val)}
                min={0}
                allowDecimal={false}
                className="pl-8 text-base font-semibold h-10 tracking-wide"
                autoFocus
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Mentioned clearly as &ldquo;<strong>Discount</strong>&rdquo; on the quotation,
              WhatsApp summary, print view, and PDF exports.
            </p>
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <span className="text-[11px] font-medium text-muted-foreground block mb-1.5 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" /> Quick Presets
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_DISCOUNTS.map((preset) => {
                const isSelected = validDiscount === preset;
                return (
                  <Button
                    key={preset}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    className={`h-7 px-2.5 text-xs font-medium cursor-pointer ${
                      isSelected
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                    }`}
                    onClick={() => applyPreset(preset)}
                  >
                    {formatInr(preset)}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Live Calculation Breakdown Card */}
          <div className="rounded-lg border border-border/80 bg-muted/40 p-3.5 space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Subtotal:</span>
              <span className="font-medium text-foreground">{formatInr(subtotal)}</span>
            </div>

            {saleMode !== "cash" && (
              <div className="flex justify-between items-center text-muted-foreground">
                <span>GST Tax:</span>
                <span className="font-medium text-foreground">{formatInr(taxAmount)}</span>
              </div>
            )}

            {saleMode === "cash" && (
              <div className="flex justify-between items-center text-emerald-700 dark:text-emerald-400 text-xs">
                <span>Tax Mode:</span>
                <span className="font-medium">Cash Deal (No GST · Challan Only)</span>
              </div>
            )}

            <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-semibold pt-0.5">
              <span className="flex items-center gap-1">
                <Tag className="h-3.5 w-3.5" />
                Discount:
              </span>
              <span className="tabular-nums">
                {validDiscount > 0 ? `- ${formatInr(validDiscount)}` : "₹0"}
              </span>
            </div>

            <div className="border-t border-border pt-2 flex justify-between items-center text-sm sm:text-base font-bold text-foreground">
              <span>Revised Total:</span>
              <span className="text-primary font-black text-base sm:text-lg">
                {formatInr(breakdown.total)}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="mr-1.5 h-4 w-4" />
                Apply Discount
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

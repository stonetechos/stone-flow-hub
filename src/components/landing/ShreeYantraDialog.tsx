import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check, Gift, ShieldCheck, Flame, ExternalLink, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ShreeYantraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClaimOffer?: () => void;
  isClaimed?: boolean;
}

export function ShreeYantraDialog({
  open,
  onOpenChange,
  onClaimOffer,
  isClaimed = false,
}: ShreeYantraDialogProps) {
  const [imageZoomed, setImageZoomed] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-background border-amber-500/40 shadow-2xl rounded-2xl max-h-[92vh] flex flex-col">
        {/* Top Gold Foil Bar */}
        <div className="h-2 w-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 shrink-0" />

        <div className="overflow-y-auto p-4 sm:p-6 space-y-6">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-black uppercase text-[11px] tracking-wider px-2.5 py-0.5 shadow-xs border border-amber-400/50">
                <Sparkles className="h-3 w-3 mr-1 fill-stone-950 inline" />
                Special Celebration Privilege
              </Badge>
              <Badge
                variant="outline"
                className="border-emerald-500/50 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 font-bold text-[11px] px-2.5 py-0.5"
              >
                <Gift className="h-3 w-3 mr-1 inline" />
                Complimentary Gift · Worth ₹14,999
              </Badge>
              {isClaimed && (
                <Badge className="bg-emerald-600 text-white font-bold text-[11px] px-2.5 py-0.5 animate-in fade-in">
                  ✓ PRIVILEGE CLAIMED
                </Badge>
              )}
            </div>

            <DialogTitle className="text-xl sm:text-2xl font-serif font-bold text-foreground tracking-tight leading-snug">
              Certified Handcrafted 3D Sacred Shree Yantra
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              An auspicious architectural masterpiece designed to invite prosperity and positive
              energy into your home, villa, or mandir.
            </DialogDescription>
          </DialogHeader>

          {/* Main 2-Column Content */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 items-start">
            {/* Left: High-Res Photo Showcase */}
            <div className="md:col-span-6 space-y-2">
              <div
                onClick={() => setImageZoomed(!imageZoomed)}
                className="group relative rounded-xl overflow-hidden border-2 border-amber-400/50 bg-stone-950 shadow-lg cursor-zoom-in transition-all duration-300 hover:border-amber-400 hover:shadow-amber-500/20"
              >
                <img
                  src="/images/shree-yantra.jpg"
                  alt="Certified Handcrafted 3D Sacred Shree Yantra"
                  className={cn(
                    "w-full h-auto object-cover transition-transform duration-500",
                    imageZoomed ? "scale-125" : "group-hover:scale-105",
                  )}
                  loading="eager"
                />
                <div className="absolute top-2.5 right-2.5">
                  <Badge className="bg-amber-500/95 text-stone-950 font-extrabold text-[10px] tracking-wide shadow-md backdrop-blur-xs">
                    MRP ₹14,999 · FREE
                  </Badge>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-stone-950/90 via-stone-950/50 to-transparent flex items-center justify-between text-[11px] text-amber-200">
                  <span className="font-semibold flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
                    Certified Sacred Geometry
                  </span>
                  <span className="text-[10px] opacity-90 underline underline-offset-2">
                    {imageZoomed ? "Click to reset" : "Click to zoom"}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground text-center font-cursive text-emerald-700 dark:text-emerald-400 text-sm">
                ✨ Handcrafted multi-layered natural hardwood with sacred central bindu
              </p>
            </div>

            {/* Right: Specifications & Double Privilege Details */}
            <div className="md:col-span-6 space-y-4">
              {/* Double Privilege Summary Box */}
              <div className="p-3.5 rounded-xl border border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-amber-500/5 to-teal-500/10 dark:from-emerald-950/40 dark:via-stone-900/60 dark:to-teal-950/40 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                  <Flame className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                  Your 2 Exclusive Prepayment Privileges:
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <div className="h-5 w-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 font-bold text-[10px] mt-0.5">
                      1
                    </div>
                    <div>
                      <span className="font-bold text-foreground">
                        Flat 5% Instant Cash Discount
                      </span>
                      <p className="text-muted-foreground text-[11px]">
                        Pre-make 100% advance payment upon quotation confirmation to lock in a
                        direct 5% deduction on your entire order.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <div className="h-5 w-5 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center shrink-0 font-bold text-[10px] mt-0.5">
                      2
                    </div>
                    <div>
                      <span className="font-bold text-foreground">
                        FREE Certified Shree Yantra (Worth ₹14,999)
                      </span>
                      <p className="text-muted-foreground text-[11px]">
                        Delivered safely with your stone order with every purchase exceeding ₹1 Lakh
                        (Product amount)*.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Artwork Highlights */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Masterpiece Craftsmanship Details
                </h4>
                <ul className="text-xs space-y-1.5 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-foreground">Authentic Maha Meru Geometry:</strong> 9
                      interlocking primary triangles forming 43 sub-triangles and sacred lotus
                      petals.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-foreground">Layered Hardwood Relief:</strong>{" "}
                      High-precision CNC carving in seasoned natural wood, hand-finished with warm
                      teak patina.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-foreground">Certified &amp; Consecrated:</strong>{" "}
                      Includes Certificate of Sacred Geometry Authenticity and protective luxury
                      packaging.
                    </span>
                  </li>
                </ul>
              </div>

              {/* Asterisk Terms & Conditions */}
              <div className="p-2.5 rounded-lg bg-muted/60 border border-border text-[11px] text-muted-foreground space-y-1">
                <span className="font-bold text-foreground block">* Terms &amp; Conditions:</span>
                <p className="leading-relaxed">
                  The complimentary Shree Yantra (worth ₹14,999) is applicable on stone product
                  purchase value exceeding ₹1,00,000 (excludes site installation and
                  chemical/adhesive charges). Prepayment discount applies when 100% advance payment
                  is completed upon quotation approval.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    if (onClaimOffer) onClaimOffer();
                    onOpenChange(false);
                  }}
                  className={cn(
                    "w-full font-bold text-xs h-10 px-5 gap-2 shadow-md transition-all cursor-pointer",
                    isClaimed
                      ? "bg-emerald-700 hover:bg-emerald-800 text-white"
                      : "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white hover:scale-[1.02]",
                  )}
                >
                  {isClaimed ? (
                    <>
                      <Check className="h-4 w-4 stroke-[3]" />
                      <span>Privilege Already Claimed</span>
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
                  onClick={() => onOpenChange(false)}
                  className="w-full sm:w-auto text-xs h-10 px-4 cursor-pointer"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

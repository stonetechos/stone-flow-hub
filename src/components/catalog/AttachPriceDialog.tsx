import { useState, useEffect } from "react";
import {
  Tag,
  Sparkles,
  Check,
  RotateCcw,
  ShieldCheck,
  DollarSign,
  Calendar,
  Info,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { AttachedProductPrice } from "@/lib/catalog/product-prices";

export interface PatternPriceTarget {
  id: string;
  name: string;
  image: string;
  category: string;
  stoneType: string;
  index: number;
  currentPrice: AttachedProductPrice;
}

interface AttachPriceDialogProps {
  target: PatternPriceTarget | null;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, priceData: Partial<AttachedProductPrice>) => void;
  onReset: (id: string) => void;
}

const COMMON_BADGES = [
  "Quarry Direct",
  "Export Grade",
  "Architect Exclusive",
  "CNC 3D Carved",
  "Brass & Stone Inlay",
  "Best Seller",
  "Limited Quarry Run",
  "Custom Order Only",
];

const CURRENCIES = [
  { symbol: "₹", label: "₹ INR (Indian Rupee)" },
  { symbol: "$", label: "$ USD (US Dollar)" },
  { symbol: "€", label: "€ EUR (Euro)" },
  { symbol: "AED", label: "AED (UAE Dirham)" },
  { symbol: "£", label: "£ GBP (British Pound)" },
];

const UNITS = [
  { value: "sq.ft", label: "per sq.ft (Square Feet)" },
  { value: "sq.m", label: "per sq.m (Square Meter)" },
  { value: "module", label: "per module (Interlocking)" },
  { value: "tile", label: "per tile (Piece)" },
  { value: "box", label: "per box (Pack)" },
];

export function AttachPriceDialog({
  target,
  onOpenChange,
  onSave,
  onReset,
}: AttachPriceDialogProps) {
  const [currency, setCurrency] = useState("₹");
  const [price, setPrice] = useState<number>(450);
  const [unit, setUnit] = useState("sq.ft");
  const [mrp, setMrp] = useState<number | undefined>(undefined);
  const [badge, setBadge] = useState("Quarry Direct");
  const [leadTime, setLeadTime] = useState("In Stock - Ready to Ship");
  const [notes, setNotes] = useState("");
  const [showOnPdf, setShowOnPdf] = useState(true);

  useEffect(() => {
    if (target) {
      const p = target.currentPrice;
      setCurrency(p.currency || "₹");
      setPrice(p.price || 450);
      setUnit(p.unit || "sq.ft");
      setMrp(p.mrp);
      setBadge(p.badge || "Quarry Direct");
      setLeadTime(p.leadTime || "In Stock - Ready to Ship");
      setNotes(p.notes || "Ex-factory Makrana, crating included.");
      setShowOnPdf(p.showOnPdf !== false);
    }
  }, [target]);

  if (!target) return null;

  const handleSave = () => {
    if (isNaN(price) || price <= 0) {
      toast.error("Please enter a valid price greater than zero");
      return;
    }

    onSave(target.id, {
      currency,
      price,
      unit,
      mrp: mrp && !isNaN(mrp) ? mrp : undefined,
      badge: badge.trim() || undefined,
      leadTime: leadTime.trim() || undefined,
      notes: notes.trim() || undefined,
      showOnPdf,
    });

    toast.success(`Attached price ${currency} ${price}/${unit} directly to ${target.name}`);
    onOpenChange(false);
  };

  const handleReset = () => {
    onReset(target.id);
    toast.success(`Reset ${target.name} to benchmark quarry pricing`);
    onOpenChange(false);
  };

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400">
            <ShieldCheck className="h-5 w-5" />
            <DialogTitle>Attach &amp; Write Product Price (Super Admin)</DialogTitle>
          </div>
          <DialogDescription>
            Directly bind pricing, commercial tags, and lead times to this stone cladding pattern.
            The price will be prominently overlaid directly onto the product image and rendered in
            the WhatsApp PDF softcopy.
          </DialogDescription>
        </DialogHeader>

        {/* Pattern Header / Visual Preview Card */}
        <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/40 p-3">
          <div className="relative h-16 w-24 overflow-hidden rounded-lg border border-border/80 shrink-0 bg-stone-900">
            <img
              src={target.image}
              alt={target.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <div className="absolute top-1 left-1 bg-black/75 px-1 py-0.5 rounded text-[9px] font-mono text-cyan-300">
              {target.id}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-foreground truncate">{target.name}</h4>
              {target.currentPrice.isCustom && (
                <Badge
                  variant="secondary"
                  className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                >
                  Custom Attached
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {target.category} · {target.stoneType}
            </p>
            <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span>Current Overlaid Price:</span>
              <span>
                {target.currentPrice.currency} {target.currentPrice.price} /{" "}
                {target.currentPrice.unit}
              </span>
            </div>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="space-y-4 py-2"
        >
          {/* Price & Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.symbol} value={c.symbol} className="text-xs">
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Unit Price (Net Factory)</span>
                <span className="text-[10px] text-muted-foreground">
                  Attached directly on image
                </span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-muted-foreground">
                  {currency}
                </span>
                <Input
                  type="number"
                  min={1}
                  step={5}
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="pl-8 h-9 text-sm font-bold text-foreground"
                  required
                />
              </div>
            </div>
          </div>

          {/* Quick Adjustment Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground font-medium mr-1">Quick +/-:</span>
            {[-50, -20, +20, +50, +100].map((delta) => (
              <button
                key={delta}
                type="button"
                onClick={() => setPrice((prev) => Math.max(50, prev + delta))}
                className="text-[10.5px] font-semibold px-2 py-0.5 rounded border border-border/80 bg-background hover:bg-muted transition-colors"
              >
                {delta > 0 ? `+${currency}${delta}` : `-${currency}${Math.abs(delta)}`}
              </button>
            ))}
          </div>

          {/* Pricing Unit & MRP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Billing Unit</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u.value} value={u.value} className="text-xs">
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Strike-Through MRP (Optional)</span>
                <span className="text-[10px] text-muted-foreground">
                  For wholesale discount tag
                </span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs text-muted-foreground">
                  {currency}
                </span>
                <Input
                  type="number"
                  min={price}
                  step={10}
                  value={mrp ?? ""}
                  placeholder={String(Math.round(price * 1.3))}
                  onChange={(e) => setMrp(e.target.value ? Number(e.target.value) : undefined)}
                  className="pl-8 h-9 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Promotional Badge on Image */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center justify-between">
              <span>Image Badge Tag</span>
              <span className="text-[10px] text-muted-foreground">Renders in corner of image</span>
            </Label>
            <Input
              value={badge}
              onChange={(e) => setBadge(e.target.value)}
              placeholder="e.g. Quarry Direct, Architect Exclusive"
              className="h-9 text-xs"
            />
            <div className="flex flex-wrap gap-1 pt-1">
              {COMMON_BADGES.slice(0, 4).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBadge(b)}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Lead Time & Dispatch Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Quarry Lead Time</Label>
              <Input
                value={leadTime}
                onChange={(e) => setLeadTime(e.target.value)}
                placeholder="e.g. In Stock - Ready to Ship"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Terms / Packing Notes</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Ex-factory Makrana, crating included"
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* PDF Softcopy Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-muted/20">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-foreground">
                Include in WhatsApp PDF Softcopy
              </div>
              <div className="text-[11px] text-muted-foreground">
                Print this price badge in exported catalog PDFs. If disabled, prints &quot;Price on
                Request&quot;.
              </div>
            </div>
            <Switch checked={showOnPdf} onCheckedChange={setShowOnPdf} />
          </div>

          <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-border">
            {target.currentPrice.isCustom ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="w-full sm:w-auto text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Reset to Benchmark
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
              >
                <Check className="h-3.5 w-3.5 mr-1.5" />
                Attach Price to Image
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

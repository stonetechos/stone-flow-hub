/**
 * Stone Tech OS (STOS) — Quotation Terms & Delivery Timeline Manager
 *
 * Allows users to:
 * 1. Directly view and edit Quotation Terms & Conditions.
 * 2. Optionally insert standard Supply Only or Supply + Installation terms.
 * 3. Add or remove the client-supplied stone breakage liability waiver.
 * 4. Configure delivery timeline (days / date).
 * 5. Leave blank to omit terms from the Quotation PDF and WhatsApp message.
 */
import { useState, useEffect } from "react";
import { formatInr } from "@/lib/format";
import {
  type DealScope,
  type DeliveryTimelineMode,
  generateQuoteTerms,
  buildClientProvidedSlabBreakageTerm,
  hasClientBreakageDisclaimer,
  buildDeliveryTimelineTerm,
  ADVANCE_PAYMENT_THRESHOLD_INR,
} from "@/lib/quotes/terms";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  ShieldCheck,
  AlertCircle,
  FileText,
  ShieldAlert,
  Sparkles,
  Trash2,
} from "lucide-react";

export interface QuoteTermsManagerProps {
  terms: string;
  onChangeTerms: (terms: string) => void;
  dealScope: DealScope;
  onChangeDealScope?: (scope: DealScope) => void;
  totalAmount: number;
  initialTimelineDays?: string;
  initialDeliveryDate?: string;
  clientProvidedSlab?: boolean;
  onChangeClientProvidedSlab?: (clientProvided: boolean) => void;
  onTimelineChange?: (timeline: {
    mode: DeliveryTimelineMode;
    days?: string;
    date?: string;
  }) => void;
  className?: string;
}

const COMMON_DAYS_CHIPS = ["7", "10", "15", "21", "30", "45"];

export function QuoteTermsManager({
  terms,
  onChangeTerms,
  dealScope,
  onChangeDealScope,
  totalAmount,
  initialTimelineDays = "15",
  initialDeliveryDate = "",
  clientProvidedSlab,
  onChangeClientProvidedSlab,
  onTimelineChange,
  className = "",
}: QuoteTermsManagerProps) {
  const [timelineMode, setTimelineMode] = useState<DeliveryTimelineMode>(
    initialDeliveryDate ? "date" : "days",
  );
  const [days, setDays] = useState<string>(initialTimelineDays);
  const [date, setDate] = useState<string>(initialDeliveryDate);
  const [isClientProvided, setIsClientProvided] = useState<boolean>(
    clientProvidedSlab ?? hasClientBreakageDisclaimer(terms),
  );

  // Sync external clientProvidedSlab prop changes without wiping custom terms
  useEffect(() => {
    if (clientProvidedSlab !== undefined && clientProvidedSlab !== isClientProvided) {
      setIsClientProvided(clientProvidedSlab);
    }
  }, [clientProvidedSlab, isClientProvided]);

  const isUnderFiftyThousand = totalAmount > 0 && totalAmount < ADVANCE_PAYMENT_THRESHOLD_INR;
  const hasTermsContent = Boolean(terms && terms.trim());

  // Explicit user action to insert standard terms for selected scope
  const handleApplyStandardTerms = (scopeToApply: DealScope = dealScope) => {
    const generated = generateQuoteTerms({
      dealScope: scopeToApply,
      totalAmount,
      timelineMode,
      timelineDays: days,
      deliveryDate: date,
      clientProvidedSlab: isClientProvided,
    });

    onChangeTerms(generated);

    if (onTimelineChange) {
      onTimelineChange({
        mode: timelineMode,
        days,
        date,
      });
    }
  };

  const handleModeChange = (newMode: DeliveryTimelineMode) => {
    setTimelineMode(newMode);
    if (onTimelineChange) {
      onTimelineChange({
        mode: newMode,
        days,
        date,
      });
    }
  };

  const handleDaysChange = (newDays: string) => {
    setDays(newDays);
    if (onTimelineChange) {
      onTimelineChange({
        mode: "days",
        days: newDays,
        date,
      });
    }
  };

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    if (onTimelineChange) {
      onTimelineChange({
        mode: "date",
        days,
        date: newDate,
      });
    }
  };

  const handleScopeChange = (newScope: DealScope) => {
    if (onChangeDealScope) {
      onChangeDealScope(newScope);
    }
  };

  // Toggle disclaimer on existing terms without clearing custom edits
  const handleToggleClientSlab = (enable: boolean) => {
    setIsClientProvided(enable);
    if (onChangeClientProvidedSlab) {
      onChangeClientProvidedSlab(enable);
    }

    if (!terms || !terms.trim()) return;

    const disclaimerText = buildClientProvidedSlabBreakageTerm();
    const currentLines = terms
      .split("\n\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (enable) {
      // Prepend disclaimer if not present
      if (!hasClientBreakageDisclaimer(terms)) {
        const cleaned = currentLines.map((l) => l.replace(/^\d+[.)]\s*/, ""));
        const newTerms = [disclaimerText, ...cleaned]
          .map((t, idx) => `${idx + 1}. ${t}`)
          .join("\n\n");
        onChangeTerms(newTerms);
      }
    } else {
      // Remove disclaimer if present
      const filtered = currentLines.filter(
        (l) =>
          !l.toLowerCase().includes("client-supplied stone") &&
          !l.toLowerCase().includes("client's own risk"),
      );
      const cleaned = filtered.map((l) => l.replace(/^\d+[.)]\s*/, ""));
      const newTerms = cleaned.map((t, idx) => `${idx + 1}. ${t}`).join("\n\n");
      onChangeTerms(newTerms);
    }
  };

  // Update only timeline clause in existing terms
  const handleUpdateTimelineInTerms = () => {
    const timelineTerm = buildDeliveryTimelineTerm(timelineMode, {
      timelineDays: days,
      deliveryDate: date,
    });
    const deliveryClause = `Delivery Timeline: ${timelineTerm}`;

    if (!terms || !terms.trim()) {
      handleApplyStandardTerms();
      return;
    }

    const lines = terms
      .split("\n\n")
      .map((l) => l.trim())
      .filter(Boolean);
    let updated = false;
    const remapped = lines.map((line) => {
      if (
        line.toLowerCase().includes("delivery timeline:") ||
        line.toLowerCase().includes("time duration to deliver")
      ) {
        updated = true;
        return deliveryClause;
      }
      return line.replace(/^\d+[.)]\s*/, "");
    });

    if (!updated) {
      remapped.splice(isClientProvided ? 1 : 0, 0, deliveryClause);
    }

    const renumbered = remapped.map((t, idx) => `${idx + 1}. ${t}`).join("\n\n");
    onChangeTerms(renumbered);
  };

  return (
    <div className={`rounded-lg border border-border bg-card p-4 space-y-4 shadow-xs ${className}`}>
      {/* Header & Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/70 pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <h4 className="text-sm font-semibold text-foreground">
            Quotation Terms &amp; Conditions (Editable)
          </h4>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {hasTermsContent ? (
            <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-300 text-[11px] gap-1"
            >
              Affixed to Quote &amp; PDF
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="bg-slate-50 text-slate-600 border-slate-300 text-[11px]"
            >
              No Terms (Minimal PDF)
            </Badge>
          )}

          {isUnderFiftyThousand ? (
            <Badge
              variant="outline"
              className="bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/30 dark:text-amber-300 text-[11px] gap-1"
            >
              <AlertCircle className="h-3 w-3" />
              Order &lt; ₹50k: 100% Advance
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 text-[11px]"
            >
              {dealScope === "supply_only"
                ? "Payment: 80% Adv + 20% Delivery"
                : "Payment: 50% Adv + 30% Del + 20% Install"}
            </Badge>
          )}

          {isClientProvided && (
            <Badge
              variant="outline"
              className="bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/30 dark:text-purple-300 text-[11px] gap-1 font-semibold"
            >
              <ShieldAlert className="h-3 w-3 text-purple-700" />
              Breakage Disclaimer Active
            </Badge>
          )}
        </div>
      </div>

      {/* Row 1: Deal Scope & Delivery Timeline Selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Deal Scope Selector */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Deal Scope</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleScopeChange("supply_only")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border text-center transition-colors cursor-pointer ${
                dealScope === "supply_only"
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-muted/30 hover:bg-muted text-muted-foreground border-border"
              }`}
            >
              Supply Only (80/20)
            </button>
            <button
              type="button"
              onClick={() => handleScopeChange("supply_and_installation")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border text-center transition-colors cursor-pointer ${
                dealScope === "supply_and_installation"
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-muted/30 hover:bg-muted text-muted-foreground border-border"
              }`}
            >
              Supply + Install (50/30/20)
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {dealScope === "supply_and_installation"
              ? "Installation includes scaffolding, workable wall surface inspection, and 50/30/20 payment terms."
              : "Supply only includes product dispatch, natural variation, non-returnable policy, and 80/20 payment terms."}
          </p>
        </div>

        {/* Delivery Timeline Mode & Input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-muted-foreground">
              Delivery / Dispatch Timeline
            </Label>
            <div className="inline-flex rounded-md border border-border p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => handleModeChange("days")}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                  timelineMode === "days"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Clock className="h-3 w-3" />
                Days
              </button>
              <button
                type="button"
                onClick={() => handleModeChange("date")}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                  timelineMode === "date"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Calendar className="h-3 w-3" />
                On or Before Date
              </button>
            </div>
          </div>

          {timelineMode === "days" ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={days}
                  onChange={(e) => handleDaysChange(e.target.value)}
                  placeholder="e.g. 15 or 15-20 working days"
                  className="h-8 text-xs font-medium"
                />
                <span className="text-xs text-muted-foreground shrink-0">days</span>
                {hasTermsContent && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleUpdateTimelineInTerms}
                    className="h-8 text-[11px] shrink-0 cursor-pointer"
                    title="Update only the delivery timeline line in the terms below"
                  >
                    Sync to Terms
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground mr-1">Quick chips:</span>
                {COMMON_DAYS_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleDaysChange(chip)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors cursor-pointer ${
                      days === chip
                        ? "bg-primary/10 text-primary border-primary font-bold"
                        : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {chip}d
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="h-8 text-xs font-medium"
                />
                {hasTermsContent && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleUpdateTimelineInTerms}
                    className="h-8 text-[11px] shrink-0 cursor-pointer"
                    title="Update only the delivery timeline date in the terms below"
                  >
                    Sync to Terms
                  </Button>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Sets term to &quot;Completed on or before [Date]&quot;.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Client Stone Sourcing & Breakage Clause Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs">
        <div className="flex items-center gap-2">
          <ShieldAlert
            className={`h-4 w-4 shrink-0 ${isClientProvided ? "text-purple-600" : "text-muted-foreground"}`}
          />
          <div>
            <span className="font-semibold text-foreground">
              Client-Supplied Stone / Slab Scope
            </span>
            <span className="text-[11px] text-muted-foreground ml-1.5 hidden sm:inline">
              (Affixes Priority Term #1: Stone breakage &amp; cracking liability waiver during CNC
              carving &amp; transit)
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => handleToggleClientSlab(!isClientProvided)}
            className={`text-xs px-2.5 py-1 rounded font-medium border transition-colors cursor-pointer flex items-center gap-1.5 ${
              isClientProvided
                ? "bg-purple-700 text-white border-purple-700 shadow-2xs font-semibold"
                : "bg-background text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            {isClientProvided ? "Disclaimer Active" : "Add Breakage Disclaimer"}
          </button>
        </div>
      </div>

      {/* Action Toolbar to Insert / Clear Terms */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/60">
        <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-primary" />
          Editable Terms Text
        </Label>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleApplyStandardTerms("supply_only")}
            className="h-7 text-xs gap-1 cursor-pointer bg-muted/30 hover:bg-muted"
            title="Populate standard Supply Only terms with 80/20 payment"
          >
            <Sparkles className="h-3 w-3 text-cyan-600" />
            Insert Supply Terms (80/20)
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleApplyStandardTerms("supply_and_installation")}
            className="h-7 text-xs gap-1 cursor-pointer bg-muted/30 hover:bg-muted"
            title="Populate standard Supply + Installation terms with 50/30/20 payment"
          >
            <Sparkles className="h-3 w-3 text-emerald-600" />
            Insert Supply + Install Terms (50/30/20)
          </Button>
          {hasTermsContent && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChangeTerms("")}
              className="h-7 text-xs gap-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
              title="Clear all terms (leaves quote PDF clean and minimal)"
            >
              <Trash2 className="h-3 w-3" />
              Clear Terms
            </Button>
          )}
        </div>
      </div>

      {/* Terms & Conditions Textarea */}
      <div className="space-y-1.5">
        <Textarea
          rows={8}
          value={terms ?? ""}
          onChange={(e) => onChangeTerms(e.target.value)}
          placeholder="Terms & Conditions are optional. Leave blank to omit terms from the quotation PDF & WhatsApp, or click one of the buttons above to insert standard polished terms..."
          className="text-xs font-mono leading-relaxed bg-muted/10 border-border focus:bg-background"
        />
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            {hasTermsContent
              ? "Directly editable — what is written above is exactly what prints on the quotation PDF and WhatsApp."
              : "No terms affixed. Quotation PDF will be clean and minimal without legal bullet points."}
          </span>
          <span>Order Value: {formatInr(totalAmount)}</span>
        </div>
      </div>
    </div>
  );
}

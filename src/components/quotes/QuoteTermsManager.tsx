/**
 * Stone Tech OS (STOS) — Quotation Terms & Delivery Timeline Manager
 *
 * Allows users to:
 * 1. Select Delivery Timeline by Days (with quick chips) or "On or Before Date".
 * 2. View automatic payment terms according to the < ₹50,000 threshold and deal scope.
 * 3. Inspect, verify, and customize the polished Terms & Conditions prior to quote creation/saving.
 */
import { useState, useEffect } from "react";
import { formatInr } from "@/lib/format";
import {
  type DealScope,
  type DeliveryTimelineMode,
  generateQuoteTerms,
  ADVANCE_PAYMENT_THRESHOLD_INR,
} from "@/lib/quotes/terms";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, RefreshCw, ShieldCheck, AlertCircle, FileText } from "lucide-react";

export interface QuoteTermsManagerProps {
  terms: string;
  onChangeTerms: (terms: string) => void;
  dealScope: DealScope;
  onChangeDealScope?: (scope: DealScope) => void;
  totalAmount: number;
  initialTimelineDays?: string;
  initialDeliveryDate?: string;
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
  onTimelineChange,
  className = "",
}: QuoteTermsManagerProps) {
  const [timelineMode, setTimelineMode] = useState<DeliveryTimelineMode>(
    initialDeliveryDate ? "date" : "days",
  );
  const [days, setDays] = useState<string>(initialTimelineDays);
  const [date, setDate] = useState<string>(initialDeliveryDate);

  const isUnderFiftyThousand = totalAmount > 0 && totalAmount < ADVANCE_PAYMENT_THRESHOLD_INR;

  // Helper to recompute terms
  const handleApplyStandardTerms = (
    overrideScope?: DealScope,
    overrideMode?: DeliveryTimelineMode,
    overrideDays?: string,
    overrideDate?: string,
  ) => {
    const activeScope = overrideScope ?? dealScope;
    const activeMode = overrideMode ?? timelineMode;
    const activeDays = overrideDays ?? days;
    const activeDate = overrideDate ?? date;

    const generated = generateQuoteTerms({
      dealScope: activeScope,
      totalAmount,
      timelineMode: activeMode,
      timelineDays: activeDays,
      deliveryDate: activeDate,
    });

    onChangeTerms(generated);

    if (onTimelineChange) {
      onTimelineChange({
        mode: activeMode,
        days: activeDays,
        date: activeDate,
      });
    }
  };

  const handleModeChange = (newMode: DeliveryTimelineMode) => {
    setTimelineMode(newMode);
    handleApplyStandardTerms(dealScope, newMode, days, date);
  };

  const handleDaysChange = (newDays: string) => {
    setDays(newDays);
    handleApplyStandardTerms(dealScope, "days", newDays, date);
  };

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    handleApplyStandardTerms(dealScope, "date", days, newDate);
  };

  const handleScopeChange = (newScope: DealScope) => {
    if (onChangeDealScope) {
      onChangeDealScope(newScope);
    }
    handleApplyStandardTerms(newScope, timelineMode, days, date);
  };

  // If terms are empty on mount, initialize them with polished defaults
  useEffect(() => {
    if (!terms || !terms.trim()) {
      handleApplyStandardTerms();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`rounded-lg border border-border bg-card p-4 space-y-4 shadow-xs ${className}`}>
      {/* Header & Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/70 pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <h4 className="text-sm font-semibold text-foreground">
            Terms & Conditions & Delivery Timeline
          </h4>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {isUnderFiftyThousand ? (
            <Badge
              variant="outline"
              className="bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/30 dark:text-amber-300 text-[11px] gap-1"
            >
              <AlertCircle className="h-3 w-3" />
              Order &lt; ₹50k: 100% Advance Payment
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
          <Badge variant="outline" className="text-[11px]">
            {dealScope === "supply_only" ? "Supply Only (7 terms)" : "Supply + Install (9 terms)"}
          </Badge>
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
              Supply Only
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
              Supply + Installation
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {dealScope === "supply_and_installation"
              ? "Includes scaffolding, surface inspection, and 50/30/20 payment terms."
              : "Includes supply delivery, non-returnable policy, and 80/20 payment terms."}
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
              <Input
                type="date"
                value={date}
                onChange={(e) => handleDateChange(e.target.value)}
                className="h-8 text-xs font-medium"
              />
              <p className="text-[10px] text-muted-foreground">
                Sets term 1 to &quot;Completed on or before [Date]&quot;.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Terms & Conditions Textarea with Quick Actions */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-primary" />
            Polished Terms & Conditions (Appears on Quotation PDF &amp; WhatsApp)
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleApplyStandardTerms()}
            className="h-6 text-[11px] gap-1 text-primary hover:text-primary hover:bg-primary/10 cursor-pointer"
            title="Reapply standard polished terms based on current total, scope, and timeline"
          >
            <RefreshCw className="h-3 w-3" />
            Regenerate Polished Terms
          </Button>
        </div>
        <Textarea
          rows={7}
          value={terms}
          onChange={(e) => onChangeTerms(e.target.value)}
          placeholder="Terms & Conditions will be formatted here..."
          className="text-xs font-mono leading-relaxed bg-muted/10 border-border focus:bg-background"
        />
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>You can freely edit or verify these terms above before saving the quotation.</span>
          <span>Order Value: {formatInr(totalAmount)}</span>
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Sliders,
  Wallet,
  Smartphone,
  Banknote,
  Receipt,
  FileSpreadsheet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatInr } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";

/* -------------------------------------------------------------------------- */
/* 1. Precision SVG Speedometer & Health Meter Gauge                          */
/* -------------------------------------------------------------------------- */

interface SpeedometerGaugeProps {
  value: number; // 0 to 100 or current amount
  max?: number;
  label: string;
  sublabel?: string;
  unit?: string;
  size?: "sm" | "md" | "lg";
  mode?: "health" | "risk"; // health: 100 is green, 0 is red. risk: 0 is green, 100 is red.
  statusText?: string;
  showNeedle?: boolean;
}

export function SpeedometerGauge({
  value,
  max = 100,
  label,
  sublabel,
  unit = "%",
  size = "md",
  mode = "health",
  statusText,
  showNeedle = true,
}: SpeedometerGaugeProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  // Determine angle for semi-circle: 180 degrees sweep (from -90 to +90)
  const angle = -90 + (percentage / 100) * 180;

  // Arc dimensions
  const radius = size === "lg" ? 82 : size === "md" ? 70 : 54;
  const strokeWidth = size === "lg" ? 14 : size === "md" ? 11 : 8;
  const cx = 100;
  const cy = size === "lg" ? 95 : size === "md" ? 85 : 68;

  // Compute circumferences for dashoffset
  const arcLength = Math.PI * radius;
  const strokeDashoffset = arcLength - (percentage / 100) * arcLength;

  // Color mapping based on mode
  const isHealthy = mode === "health" ? percentage >= 80 : percentage <= 50;
  const isModerate =
    mode === "health" ? percentage >= 50 && percentage < 80 : percentage > 50 && percentage <= 75;
  const isDanger = mode === "health" ? percentage < 50 : percentage > 75;

  const activeColor = isHealthy
    ? "#10b981" // emerald
    : isModerate
      ? "#f59e0b" // amber
      : "#ef4444"; // rose

  const trackBg = "rgba(148, 163, 184, 0.18)";

  const viewBoxHeight = size === "lg" ? 120 : size === "md" ? 105 : 85;

  return (
    <div className="flex flex-col items-center justify-center text-center p-2">
      <div className="relative w-full flex justify-center">
        <svg
          viewBox={`0 0 200 ${viewBoxHeight}`}
          className={cn(
            "overflow-visible drop-shadow-xs",
            size === "lg" ? "w-52 h-32" : size === "md" ? "w-44 h-26" : "w-32 h-20",
          )}
        >
          <defs>
            <linearGradient id="gauge-health-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              {mode === "health" ? (
                <>
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#10b981" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="85%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#ef4444" />
                </>
              )}
            </linearGradient>

            <filter id="needle-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Background Track Arc */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke={trackBg}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Value Progress Arc */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke="url(#gauge-health-gradient)"
            strokeWidth={strokeWidth}
            strokeDasharray={arcLength}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />

          {/* Tick Marks (0%, 50%, 100%) */}
          <text
            x={cx - radius - 2}
            y={cy + 14}
            textAnchor="middle"
            className="text-[9px] fill-slate-400 font-mono font-bold"
          >
            0
          </text>
          <text
            x={cx}
            y={cy - radius - 6}
            textAnchor="middle"
            className="text-[9px] fill-slate-400 font-mono font-bold"
          >
            50%
          </text>
          <text
            x={cx + radius + 2}
            y={cy + 14}
            textAnchor="middle"
            className="text-[9px] fill-slate-400 font-mono font-bold"
          >
            100%
          </text>

          {/* Dynamic Needle Indicator */}
          {showNeedle && (
            <g
              transform={`rotate(${angle}, ${cx}, ${cy})`}
              className="transition-transform duration-700 ease-out"
              filter="url(#needle-glow)"
            >
              <line
                x1={cx}
                y1={cy}
                x2={cx}
                y2={cy - radius + strokeWidth / 2}
                stroke={activeColor}
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <circle cx={cx} cy={cy} r="5" fill="#1e293b" stroke={activeColor} strokeWidth="2.5" />
            </g>
          )}

          {/* Numeric Readout in center of gauge */}
          <text
            x={cx}
            y={cy - (size === "lg" ? 12 : 8)}
            textAnchor="middle"
            className="font-mono font-black text-xl sm:text-2xl fill-slate-900 dark:fill-slate-100"
          >
            {unit === "₹" ? formatInr(value) : `${Math.round(percentage)}${unit}`}
          </text>
        </svg>
      </div>

      <div className="mt-1 space-y-0.5">
        <div className="text-xs font-bold text-foreground tracking-tight">{label}</div>
        {sublabel && <div className="text-[10.5px] text-muted-foreground">{sublabel}</div>}
        {statusText && (
          <div className="pt-1">
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase",
                isHealthy
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300/80"
                  : isModerate
                    ? "bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200 border border-amber-300/80"
                    : "bg-rose-100 text-rose-900 dark:bg-rose-950/70 dark:text-rose-200 border border-rose-300/80 animate-pulse",
              )}
            >
              {statusText}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Mini Radial Progress Dial for Category Cards                            */
/* -------------------------------------------------------------------------- */

export function MiniRadialMeter({
  percentage,
  size = 46,
  strokeWidth = 5,
  status = "balanced",
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  status?: "deficit" | "balanced" | "surplus";
}) {
  const r = (size - strokeWidth) / 2;
  const circum = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, percentage));
  const offset = circum - (clamped / 100) * circum;

  const color = status === "deficit" ? "#ef4444" : status === "surplus" ? "#10b981" : "#059669";

  return (
    <div className="relative inline-flex items-center justify-center shrink-0">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(148, 163, 184, 0.2)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circum}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute font-mono text-[10px] font-black text-foreground">
        {Math.round(clamped)}%
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Interactive Live HSN Balance Simulator Widget                           */
/* -------------------------------------------------------------------------- */

export function HsnInteractiveSimulator({
  defaultHsn = "6802",
  defaultSold = 318,
  defaultPurchased = 318,
  onReset,
}: {
  defaultHsn?: string;
  defaultSold?: number;
  defaultPurchased?: number;
  onReset?: () => void;
}) {
  const [selectedHsn, setSelectedHsn] = useState(defaultHsn);
  const [simSoldQty, setSimSoldQty] = useState(defaultSold);
  const [simPurchasedQty, setSimPurchasedQty] = useState(defaultPurchased);
  const [avgUnitRate, setAvgUnitRate] = useState(250);

  const HSN_OPTIONS: Record<string, { name: string; unit: string; defaultRate: number }> = {
    "6802": { name: "Natural Stone Claddings & Murals", unit: "sq.ft", defaultRate: 250 },
    "2516": { name: "Granite & Sandstone Blocks", unit: "sq.ft", defaultRate: 180 },
    "3214": { name: "Adhesives & Tile Mastics", unit: "bag", defaultRate: 900 },
    "3824": { name: "Chemical Sealers & Repellents", unit: "ltr", defaultRate: 2500 },
    "9954": { name: "Fixing Labour Services", unit: "sq.ft", defaultRate: 80 },
    "9965": { name: "Local Carting & Freight", unit: "trip", defaultRate: 2500 },
  };

  const meta = HSN_OPTIONS[selectedHsn] || HSN_OPTIONS["6802"];

  const deficitQty = Math.max(0, simSoldQty - simPurchasedQty);
  const deficitValue = deficitQty * avgUnitRate;
  const coverageRatio =
    simSoldQty > 0 ? Math.min(100, Math.round((simPurchasedQty / simSoldQty) * 100)) : 100;

  const handleCategoryChange = (hsn: string) => {
    setSelectedHsn(hsn);
    setAvgUnitRate(HSN_OPTIONS[hsn]?.defaultRate || 250);
  };

  return (
    <div className="rounded-2xl border border-purple-200 dark:border-purple-800/60 bg-gradient-to-br from-purple-50/60 via-background to-emerald-50/40 dark:from-purple-950/20 dark:via-background dark:to-emerald-950/15 p-4 sm:p-5 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-700 text-white shadow-xs">
            <Sliders className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span>Interactive HSN Balancing Simulator &amp; What-If Tester</span>
              <Badge className="bg-purple-100 text-purple-900 border-purple-300 text-[10px] uppercase font-bold">
                Live Dial
              </Badge>
            </h4>
            <p className="text-xs text-muted-foreground">
              Adjust sliders below to test how customer sales vs inward purchase bills move the
              statutory compliance health meter.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setSimSoldQty(318);
            setSimPurchasedQty(318);
            setSelectedHsn("6802");
            setAvgUnitRate(250);
            onReset?.();
          }}
          className="h-7 text-xs gap-1 cursor-pointer"
        >
          <RotateCcw className="h-3 w-3" />
          Reset Tester
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Left: Speedometer Gauge */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center p-2 rounded-xl bg-card border border-border/60 shadow-2xs">
          <SpeedometerGauge
            value={coverageRatio}
            max={100}
            label={`HSN ${selectedHsn} Coverage Meter`}
            sublabel={`${simPurchasedQty} ${meta.unit} inward of ${simSoldQty} ${meta.unit} sold`}
            unit="%"
            size="md"
            mode="health"
            statusText={
              deficitQty > 0 ? `Deficit: ${deficitQty} ${meta.unit}` : "100% Inward Covered · Safe"
            }
          />
        </div>

        {/* Right: Interactive Slider Controls */}
        <div className="lg:col-span-8 space-y-4">
          {/* Category Pill Selectors */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {Object.entries(HSN_OPTIONS).map(([code, opt]) => (
              <button
                key={code}
                type="button"
                onClick={() => handleCategoryChange(code)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border",
                  selectedHsn === code
                    ? "bg-purple-700 text-white border-purple-800 shadow-xs"
                    : "bg-muted/50 text-muted-foreground border-border/60 hover:bg-muted hover:text-foreground",
                )}
              >
                <span>{code}</span>
                <span className="ml-1 opacity-80 text-[10px]">({opt.unit})</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Slider 1: Sold Outward Billed */}
            <div className="space-y-1.5 rounded-xl border bg-card p-3 shadow-2xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-rose-700 dark:text-rose-400">
                  Billed Outward (Sales)
                </span>
                <span className="font-mono font-bold text-foreground">
                  {simSoldQty} {meta.unit}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1000"
                step="10"
                value={simSoldQty}
                onChange={(e) => setSimSoldQty(Number(e.target.value))}
                className="w-full accent-rose-600 cursor-pointer"
              />
              <div className="text-[10px] text-muted-foreground flex justify-between">
                <span>0</span>
                <span>500</span>
                <span>1,000 {meta.unit}</span>
              </div>
            </div>

            {/* Slider 2: Purchased Inward Covered */}
            <div className="space-y-1.5 rounded-xl border bg-card p-3 shadow-2xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  Inward Covered (Purchases)
                </span>
                <span className="font-mono font-bold text-foreground">
                  {simPurchasedQty} {meta.unit}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1000"
                step="10"
                value={simPurchasedQty}
                onChange={(e) => setSimPurchasedQty(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="text-[10px] text-muted-foreground flex justify-between">
                <span>0</span>
                <span>500</span>
                <span>1,000 {meta.unit}</span>
              </div>
            </div>
          </div>

          {/* Simulation Result Callout */}
          <div
            className={cn(
              "p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5",
              deficitQty > 0
                ? "bg-rose-50/80 border-rose-300 dark:bg-rose-950/30 dark:border-rose-800 text-rose-950 dark:text-rose-200"
                : "bg-emerald-50/80 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200",
            )}
          >
            <div>
              <div className="font-bold flex items-center gap-1.5">
                {deficitQty > 0 ? (
                  <>
                    <AlertTriangle className="h-4 w-4 text-rose-600" />
                    <span>
                      Deficit of {deficitQty} {meta.unit} ({formatInr(deficitValue)})
                    </span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span>100% Inward Covered — Zero Negative Stock</span>
                  </>
                )}
              </div>
              <p className="text-[11px] opacity-85 mt-0.5">
                {deficitQty > 0
                  ? `GST statutory requirement: You need supplier purchase bills for ${deficitQty} ${meta.unit} of HSN ${selectedHsn} to avert negative-stock red flags.`
                  : `All outward customer supplies are backed by adequate quarry & supplier purchase invoices.`}
              </p>
            </div>

            <Button
              asChild
              size="sm"
              className={cn(
                "h-7 text-xs font-bold cursor-pointer shrink-0",
                deficitQty > 0
                  ? "bg-rose-700 hover:bg-rose-800 text-white"
                  : "bg-emerald-700 hover:bg-emerald-800 text-white",
              )}
            >
              <Link to="/purchase-invoices/new">
                <FileSpreadsheet className="h-3 w-3 mr-1" />
                Add Purchase Bill →
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Interactive SFT Scrutiny Inflow Simulator (Raman & Rishi)               */
/* -------------------------------------------------------------------------- */

export function SftInflowSimulator({
  ramanCurrent = 0,
  rishiCurrent = 0,
}: {
  ramanCurrent?: number;
  rishiCurrent?: number;
}) {
  const [targetAccount, setTargetAccount] = useState<"raman" | "rishi">("raman");
  const [simDepositAmount, setSimDepositAmount] = useState<number>(100000);

  const baseCurrent = targetAccount === "raman" ? ramanCurrent : rishiCurrent;
  const projectedTotal = baseCurrent + simDepositAmount;
  const limit = 10_00_000;
  const projectedHeadroom = Math.max(0, limit - projectedTotal);
  const utilizationPct = Math.round((projectedTotal / limit) * 1000) / 10;

  const isCritical = utilizationPct >= 90;
  const isHighRisk = utilizationPct >= 75 && utilizationPct < 90;
  const isCaution = utilizationPct >= 50 && utilizationPct < 75;
  const isSafe = utilizationPct < 50;

  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-gradient-to-br from-amber-50/60 via-background to-rose-50/30 dark:from-amber-950/20 dark:via-background dark:to-rose-950/15 p-4 sm:p-5 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-600 text-white shadow-xs">
            <Smartphone className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span>Personal UPI Inflow Scrutiny Simulator (Section 285BA / ₹10L Ceiling)</span>
              <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] uppercase font-bold">
                Rule 114E
              </Badge>
            </h4>
            <p className="text-xs text-muted-foreground">
              Simulate customer payments to personal savings UPI before accepting them to protect
              against automatic banking tax notices.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-muted border border-border/60">
          <button
            type="button"
            onClick={() => setTargetAccount("raman")}
            className={cn(
              "px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer",
              targetAccount === "raman"
                ? "bg-white dark:bg-slate-800 text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Raman
          </button>
          <button
            type="button"
            onClick={() => setTargetAccount("rishi")}
            className={cn(
              "px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer",
              targetAccount === "rishi"
                ? "bg-white dark:bg-slate-800 text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Rishi
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Speedometer Gauge */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-3 rounded-xl bg-card border border-border/60 shadow-2xs">
          <SpeedometerGauge
            value={projectedTotal}
            max={limit}
            label={`${targetAccount === "raman" ? "Raman" : "Rishi"}'s Projected SFT Exposure`}
            sublabel={`Projected ₹${formatInr(projectedTotal)} of ₹10,00,000 threshold`}
            unit="%"
            size="lg"
            mode="risk"
            statusText={
              isCritical
                ? "🔴 Critical SFT Danger (>90%)"
                : isHighRisk
                  ? "🟠 High Scrutiny Risk (75-90%)"
                  : isCaution
                    ? "🟡 Moderate Inflow (50-75%)"
                    : "🟢 Safe Headroom (<50%)"
            }
          />
        </div>

        {/* Controls */}
        <div className="lg:col-span-7 space-y-4">
          <div className="space-y-2 rounded-xl border bg-card p-3.5 shadow-2xs">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">
                Simulate Customer UPI Deposit to {targetAccount === "raman" ? "Raman" : "Rishi"}
              </span>
              <span className="font-mono font-bold text-amber-700 dark:text-amber-400 text-sm">
                + {formatInr(simDepositAmount)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="500000"
              step="10000"
              value={simDepositAmount}
              onChange={(e) => setSimDepositAmount(Number(e.target.value))}
              className="w-full accent-amber-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>₹0</span>
              <span>₹2,50,000</span>
              <span>₹5,00,000</span>
            </div>
          </div>

          {/* Detailed Metric Rollup */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-lg border bg-card shadow-2xs">
              <div className="text-[10px] text-muted-foreground font-semibold">
                Existing Credits
              </div>
              <div className="text-xs font-mono font-bold text-foreground">
                {formatInr(baseCurrent)}
              </div>
            </div>
            <div className="p-2.5 rounded-lg border bg-card shadow-2xs">
              <div className="text-[10px] text-muted-foreground font-semibold">Projected Total</div>
              <div className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400">
                {formatInr(projectedTotal)}
              </div>
            </div>
            <div className="p-2.5 rounded-lg border bg-card shadow-2xs">
              <div className="text-[10px] text-muted-foreground font-semibold">Safe Headroom</div>
              <div
                className={cn(
                  "text-xs font-mono font-bold",
                  projectedHeadroom > 250000
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-rose-700 dark:text-rose-400",
                )}
              >
                {formatInr(projectedHeadroom)}
              </div>
            </div>
          </div>

          {/* Dynamic Advice Alert */}
          <div
            className={cn(
              "p-3 rounded-xl border text-xs",
              isCritical || isHighRisk
                ? "bg-rose-50/90 border-rose-300 dark:bg-rose-950/30 dark:border-rose-800 text-rose-950 dark:text-rose-200"
                : isCaution
                  ? "bg-amber-50/90 border-amber-300 dark:bg-amber-950/30 dark:border-amber-800 text-amber-950 dark:text-amber-200"
                  : "bg-emerald-50/90 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200",
            )}
          >
            <div className="font-bold flex items-center gap-1.5">
              {isCritical || isHighRisk ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                  <span>Statutory Notice Warning (Section 285BA Exposure)</span>
                </>
              ) : isCaution ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span>Approaching SFT Ceiling — Balance with Partner</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Safe Operations Zone</span>
                </>
              )}
            </div>
            <p className="text-[11px] opacity-90 mt-1">
              {isCritical
                ? "DANGER: This deposit will push personal savings credits past ₹9L. Banks file Form 61A (SFT-004) automatically at ₹10L. Divert this payment immediately to Bank of Baroda Current Account or Direct Quarry/Vendor Offset!"
                : isHighRisk
                  ? `Caution: Remaining headroom is reduced to ${formatInr(projectedHeadroom)}. Cease personal UPI payments for large orders and ask the customer to transfer directly to company account.`
                  : isCaution
                    ? `Moderate headroom remaining (${formatInr(projectedHeadroom)}). Route upcoming client payments to ${targetAccount === "raman" ? "Rishi" : "Raman"}'s account to balance exposure.`
                    : `Safe headroom of ${formatInr(projectedHeadroom)} remaining before statutory reporting limits are triggered.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

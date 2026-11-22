import { useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Sliders,
  Smartphone,
  Receipt,
  FileSpreadsheet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatInr } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { useActiveTheme, type ThemeId } from "@/components/global/ThemeSwitcher";

/* -------------------------------------------------------------------------- */
/* 0. Theme-Aware 3D Palette Configurations                                    */
/* -------------------------------------------------------------------------- */

export interface ThemeGaugePalette {
  id: ThemeId;
  name: string;
  bezelLight: string;
  bezelMid: string;
  bezelDark: string;
  bezelAccent: string;
  dialBgLight: string;
  dialBgDark: string;
  needleLight: string;
  needleDark: string;
  needleCenter: string;
  needleScrew: string;
  digitalBoxBg: string;
  digitalBoxBorder: string;
  digitalTextGlow: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  accentGlow: string;
  cardBgGradient: string;
  cardBorder: string;
  cardRing: string;
  activePillBg: string;
  activePillText: string;
  activePillBorder: string;
  activePillShadow: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

export const THEME_GAUGE_PALETTES: Record<ThemeId, ThemeGaugePalette> = {
  "st-og": {
    id: "st-og",
    name: "Quarry Deep Teal",
    bezelLight: "#22d3ee",
    bezelMid: "#0e7490",
    bezelDark: "#083b43",
    bezelAccent: "#0891b2",
    dialBgLight: "#f0fdfa",
    dialBgDark: "#e0f2fe",
    needleLight: "#38bdf8",
    needleDark: "#0891b2",
    needleCenter: "#083b43",
    needleScrew: "#22d3ee",
    digitalBoxBg: "#082f38",
    digitalBoxBorder: "rgba(34, 211, 238, 0.45)",
    digitalTextGlow: "0 0 10px rgba(34, 211, 238, 0.8)",
    primary: "#0891b2",
    primaryLight: "#22d3ee",
    primaryDark: "#083b43",
    accentGlow: "rgba(8, 145, 178, 0.4)",
    cardBgGradient:
      "linear-gradient(135deg, rgba(8, 59, 67, 0.05) 0%, rgba(255, 255, 255, 0.98) 50%, rgba(8, 145, 178, 0.07) 100%)",
    cardBorder: "border-cyan-200/90 dark:border-cyan-900/60",
    cardRing: "ring-cyan-500/30",
    activePillBg: "linear-gradient(135deg, #083b43 0%, #0891b2 100%)",
    activePillText: "#ffffff",
    activePillBorder: "border-cyan-600",
    activePillShadow: "0 6px 14px -2px rgba(8, 145, 178, 0.45)",
    badgeBg: "bg-cyan-50 dark:bg-cyan-950/70",
    badgeText: "text-cyan-900 dark:text-cyan-200",
    badgeBorder: "border-cyan-300 dark:border-cyan-800",
  },
  "st-bw": {
    id: "st-bw",
    name: "Architectural Monochrome",
    bezelLight: "#ffffff",
    bezelMid: "#71717a",
    bezelDark: "#18181b",
    bezelAccent: "#27272a",
    dialBgLight: "#ffffff",
    dialBgDark: "#e4e4e7",
    needleLight: "#ffffff",
    needleDark: "#27272a",
    needleCenter: "#18181b",
    needleScrew: "#d4d4d8",
    digitalBoxBg: "#18181b",
    digitalBoxBorder: "rgba(255, 255, 255, 0.35)",
    digitalTextGlow: "0 0 10px rgba(255, 255, 255, 0.65)",
    primary: "#18181b",
    primaryLight: "#71717a",
    primaryDark: "#09090b",
    accentGlow: "rgba(0, 0, 0, 0.35)",
    cardBgGradient:
      "linear-gradient(135deg, rgba(0, 0, 0, 0.03) 0%, rgba(255, 255, 255, 0.98) 50%, rgba(0, 0, 0, 0.06) 100%)",
    cardBorder: "border-zinc-300 dark:border-zinc-700",
    cardRing: "ring-zinc-700/30",
    activePillBg: "linear-gradient(135deg, #09090b 0%, #27272a 100%)",
    activePillText: "#ffffff",
    activePillBorder: "border-zinc-700",
    activePillShadow: "0 6px 14px -2px rgba(0, 0, 0, 0.4)",
    badgeBg: "bg-zinc-100 dark:bg-zinc-800",
    badgeText: "text-zinc-900 dark:text-zinc-100",
    badgeBorder: "border-zinc-300 dark:border-zinc-600",
  },
  "st-pop": {
    id: "st-pop",
    name: "Electric Pop Multi",
    bezelLight: "#f472b6",
    bezelMid: "#ec4899",
    bezelDark: "#831843",
    bezelAccent: "#8b5cf6",
    dialBgLight: "#fdf2f8",
    dialBgDark: "#faf5ff",
    needleLight: "#f472b6",
    needleDark: "#ec4899",
    needleCenter: "#1e1b4b",
    needleScrew: "#a855f7",
    digitalBoxBg: "#2e1065",
    digitalBoxBorder: "rgba(244, 114, 182, 0.45)",
    digitalTextGlow: "0 0 10px rgba(236, 72, 153, 0.8)",
    primary: "#ec4899",
    primaryLight: "#f472b6",
    primaryDark: "#831843",
    accentGlow: "rgba(236, 72, 153, 0.45)",
    cardBgGradient:
      "linear-gradient(135deg, rgba(236, 72, 153, 0.06) 0%, rgba(255, 255, 255, 0.98) 50%, rgba(139, 92, 246, 0.08) 100%)",
    cardBorder: "border-pink-200/90 dark:border-pink-900/60",
    cardRing: "ring-pink-500/30",
    activePillBg: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
    activePillText: "#ffffff",
    activePillBorder: "border-pink-600",
    activePillShadow: "0 6px 14px -2px rgba(236, 72, 153, 0.45)",
    badgeBg: "bg-pink-50 dark:bg-pink-950/70",
    badgeText: "text-pink-900 dark:text-pink-200",
    badgeBorder: "border-pink-300 dark:border-pink-800",
  },
  "st-pastel": {
    id: "st-pastel",
    name: "Eucalyptus Pastel",
    bezelLight: "#99f6e4",
    bezelMid: "#446860",
    bezelDark: "#283e39",
    bezelAccent: "#2d6a5f",
    dialBgLight: "#fdfbf7",
    dialBgDark: "#f4efe9",
    needleLight: "#5eead4",
    needleDark: "#2d6a5f",
    needleCenter: "#283e39",
    needleScrew: "#99f6e4",
    digitalBoxBg: "#1b2c28",
    digitalBoxBorder: "rgba(153, 246, 228, 0.4)",
    digitalTextGlow: "0 0 10px rgba(153, 246, 228, 0.75)",
    primary: "#2d6a5f",
    primaryLight: "#99f6e4",
    primaryDark: "#283e39",
    accentGlow: "rgba(45, 106, 95, 0.4)",
    cardBgGradient:
      "linear-gradient(135deg, rgba(40, 62, 57, 0.05) 0%, rgba(255, 255, 255, 0.98) 50%, rgba(251, 207, 232, 0.07) 100%)",
    cardBorder: "border-stone-300/80 dark:border-stone-700/60",
    cardRing: "ring-teal-700/30",
    activePillBg: "linear-gradient(135deg, #283e39 0%, #2d6a5f 100%)",
    activePillText: "#ffffff",
    activePillBorder: "border-teal-700",
    activePillShadow: "0 6px 14px -2px rgba(45, 106, 95, 0.4)",
    badgeBg: "bg-teal-50/80 dark:bg-teal-950/70",
    badgeText: "text-teal-900 dark:text-teal-200",
    badgeBorder: "border-teal-300/80 dark:border-teal-800",
  },
};

/* -------------------------------------------------------------------------- */
/* 1. Precision 3D SVG Speedometer & Health Meter Gauge                        */
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
  const activeThemeId = useActiveTheme();
  const palette = THEME_GAUGE_PALETTES[activeThemeId] || THEME_GAUGE_PALETTES["st-og"];

  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  // Determine angle for semi-circle: 180 degrees sweep (from -90 to +90)
  const angle = -90 + (percentage / 100) * 180;

  // Arc dimensions
  const radius = size === "lg" ? 82 : size === "md" ? 70 : 54;
  const strokeWidth = size === "lg" ? 14 : size === "md" ? 11 : 8;
  const outerBezelRadius = radius + strokeWidth + 7;
  const cx = 100;
  const cy = size === "lg" ? 98 : size === "md" ? 88 : 70;

  // Compute circumferences for dashoffset
  const arcLength = Math.PI * radius;
  const strokeDashoffset = arcLength - (percentage / 100) * arcLength;

  // Color mapping based on mode
  const isHealthy = mode === "health" ? percentage >= 80 : percentage <= 50;
  const isModerate =
    mode === "health" ? percentage >= 50 && percentage < 80 : percentage > 50 && percentage <= 75;

  const activeColor = isHealthy
    ? "#10b981" // emerald
    : isModerate
      ? "#f59e0b" // amber
      : "#ef4444"; // rose

  const viewBoxHeight = size === "lg" ? 130 : size === "md" ? 115 : 92;
  const uniqueId = Math.random().toString(36).substring(2, 8);

  return (
    <div className="flex flex-col items-center justify-center text-center p-2 relative select-none">
      <div className="relative w-full flex justify-center">
        <svg
          viewBox={`0 0 200 ${viewBoxHeight}`}
          className={cn(
            "overflow-visible drop-shadow-[0_8px_16px_rgba(0,0,0,0.12)]",
            size === "lg" ? "w-56 h-34" : size === "md" ? "w-48 h-28" : "w-36 h-22",
          )}
        >
          <defs>
            {/* 3D Outer Bezel Conic/Linear Gradient matching theme */}
            <linearGradient id={`bezel-grad-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={palette.bezelLight} />
              <stop offset="30%" stopColor={palette.bezelMid} />
              <stop offset="70%" stopColor={palette.bezelDark} />
              <stop offset="100%" stopColor={palette.bezelAccent} />
            </linearGradient>

            {/* 3D Bezel Specular Rim Highlight */}
            <linearGradient id={`bezel-rim-${uniqueId}`} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
              <stop offset="45%" stopColor="#94a3b8" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.9" />
            </linearGradient>

            {/* Recessed Dial Plate Radial Gradient */}
            <radialGradient id={`dial-plate-${uniqueId}`} cx="50%" cy="40%" r="65%">
              <stop offset="0%" stopColor={palette.dialBgLight} stopOpacity="0.95" />
              <stop offset="70%" stopColor={palette.dialBgDark} stopOpacity="0.9" />
              <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.8" />
            </radialGradient>

            {/* 3D Health Meter Core Gradient */}
            <linearGradient id={`health-grad-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="0%">
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

            {/* 3D Tubular Glass/Neon Specular Lighting */}
            <linearGradient id={`tube-highlight-${uniqueId}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.25" />
            </linearGradient>

            {/* Glass Lens Dome Glare Sheen */}
            <linearGradient id={`glass-sheen-${uniqueId}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
            </linearGradient>

            {/* Chrome Hub Radial Highlight */}
            <radialGradient id={`hub-grad-${uniqueId}`} cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="45%" stopColor="#94a3b8" />
              <stop offset="80%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0f172a" />
            </radialGradient>

            {/* Needle 3D Drop Shadow */}
            <filter id={`needle-shadow-${uniqueId}`} x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="2" dy="3.5" stdDeviation="2.5" floodOpacity="0.4" />
            </filter>

            {/* Digital Display Inset Shadow */}
            <filter id={`digital-shadow-${uniqueId}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodOpacity="0.3" floodColor="#000" />
            </filter>
          </defs>

          {/* 1. 3D Beveled Outer Casing (Metallic Pod) */}
          <path
            d={`M ${cx - outerBezelRadius} ${cy + 6} A ${outerBezelRadius} ${outerBezelRadius} 0 0 1 ${cx + outerBezelRadius} ${cy + 6} Z`}
            fill={`url(#bezel-grad-${uniqueId})`}
          />
          <path
            d={`M ${cx - outerBezelRadius + 1.5} ${cy + 5} A ${outerBezelRadius - 1.5} ${outerBezelRadius - 1.5} 0 0 1 ${cx + outerBezelRadius - 1.5} ${cy + 5}`}
            fill="none"
            stroke={`url(#bezel-rim-${uniqueId})`}
            strokeWidth="2"
          />

          {/* 2. Recessed Dial Face Plate */}
          <path
            d={`M ${cx - radius - strokeWidth / 2 - 3} ${cy + 4} A ${radius + strokeWidth / 2 + 3} ${radius + strokeWidth / 2 + 3} 0 0 1 ${cx + radius + strokeWidth / 2 + 3} ${cy + 4} Z`}
            fill={`url(#dial-plate-${uniqueId})`}
            stroke="rgba(0,0,0,0.2)"
            strokeWidth="1"
          />

          {/* 3. Deep 3D Recessed Groove Arc Track */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke="rgba(15, 23, 42, 0.12)"
            strokeWidth={strokeWidth + 2}
            strokeLinecap="round"
          />
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke="rgba(255, 255, 255, 0.85)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* 4. Active Progress Arc (3D Tubular Glowing Bar) */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke={`url(#health-grad-${uniqueId})`}
            strokeWidth={strokeWidth}
            strokeDasharray={arcLength}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
          {/* Tubular Specular Highlight on top of bar */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke={`url(#tube-highlight-${uniqueId})`}
            strokeWidth={strokeWidth * 0.45}
            strokeDasharray={arcLength}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out pointer-events-none"
          />

          {/* 5. 3D Embossed Tick Marks */}
          <g className="font-mono text-[9px] font-black fill-slate-700 dark:fill-slate-300">
            <text x={cx - radius - 2} y={cy + 15} textAnchor="middle">
              0
            </text>
            <text x={cx} y={cy - radius - 5} textAnchor="middle">
              50%
            </text>
            <text x={cx + radius + 2} y={cy + 15} textAnchor="middle">
              100%
            </text>
          </g>

          {/* 6. Recessed 3D Digital Box Readout */}
          <rect
            x={cx - 38}
            y={cy - (size === "lg" ? 28 : 22)}
            width="76"
            height={size === "lg" ? 24 : 19}
            rx="5"
            fill={palette.digitalBoxBg}
            stroke={palette.digitalBoxBorder}
            strokeWidth="1.2"
            filter={`url(#digital-shadow-${uniqueId})`}
          />
          <text
            x={cx}
            y={cy - (size === "lg" ? 12 : 8)}
            textAnchor="middle"
            className="font-mono font-black text-base sm:text-lg fill-white tracking-wider"
            style={{ textShadow: palette.digitalTextGlow }}
          >
            {unit === "₹" ? formatInr(value) : `${Math.round(percentage)}${unit}`}
          </text>

          {/* 7. Precision 3D Machined Needle Indicator */}
          {showNeedle && (
            <g
              transform={`rotate(${angle}, ${cx}, ${cy})`}
              className="transition-transform duration-700 ease-out"
              filter={`url(#needle-shadow-${uniqueId})`}
            >
              {/* Left facet: lighter metallic bevel */}
              <polygon
                points={`${cx - 3.5},${cy} ${cx},${cy - radius + strokeWidth / 2 - 2} ${cx},${cy}`}
                fill={palette.needleLight}
              />
              {/* Right facet: shaded metallic bevel */}
              <polygon
                points={`${cx + 3.5},${cy} ${cx},${cy - radius + strokeWidth / 2 - 2} ${cx},${cy}`}
                fill={palette.needleDark}
              />
              {/* Center ridge specular highlight */}
              <line
                x1={cx}
                y1={cy}
                x2={cx}
                y2={cy - radius + strokeWidth / 2 - 2}
                stroke="#ffffff"
                strokeWidth="0.8"
                strokeOpacity="0.9"
              />
              {/* Needle Tip jewel */}
              <circle
                cx={cx}
                cy={cy - radius + strokeWidth / 2 - 2}
                r="1.8"
                fill="#ffffff"
                stroke={activeColor}
                strokeWidth="0.8"
              />

              {/* 3D Spindle Hub: Concentric Machined Rings */}
              <circle
                cx={cx}
                cy={cy}
                r="7.5"
                fill={`url(#hub-grad-${uniqueId})`}
                stroke="rgba(0,0,0,0.4)"
                strokeWidth="1"
              />
              <circle cx={cx} cy={cy} r="4.5" fill={palette.needleCenter} />
              <circle
                cx={cx}
                cy={cy}
                r="2"
                fill={palette.needleScrew}
                stroke="#ffffff"
                strokeWidth="0.5"
              />
            </g>
          )}

          {/* 8. 3D Glass Dome Lens Glare Sheen (Curved reflection) */}
          <path
            d={`M ${cx - radius + 6} ${cy - 12} A ${radius - 6} ${radius - 6} 0 0 1 ${cx + radius - 6} ${cy - 12} Q ${cx} ${cy - radius * 0.55} ${cx - radius + 6} ${cy - 12}`}
            fill={`url(#glass-sheen-${uniqueId})`}
            pointerEvents="none"
          />
        </svg>
      </div>

      <div className="mt-2 space-y-1">
        <div className="text-xs font-black text-foreground tracking-tight flex items-center justify-center gap-1.5">
          <span>{label}</span>
        </div>
        {sublabel && <div className="text-[10.5px] text-muted-foreground">{sublabel}</div>}
        {statusText && (
          <div className="pt-1">
            <span
              className={cn(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase shadow-2xs border-t border-b-2",
                isHealthy
                  ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200 border-t-white border-b-emerald-400 dark:border-b-emerald-800"
                  : isModerate
                    ? "bg-amber-100 text-amber-950 dark:bg-amber-950/80 dark:text-amber-200 border-t-white border-b-amber-400 dark:border-b-amber-800"
                    : "bg-rose-100 text-rose-950 dark:bg-rose-950/80 dark:text-rose-200 border-t-white border-b-rose-400 dark:border-b-rose-800 animate-pulse",
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
/* 2. 3D Convex Mini Radial Progress Dial for Category Cards                  */
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
  const activeThemeId = useActiveTheme();
  const palette = THEME_GAUGE_PALETTES[activeThemeId] || THEME_GAUGE_PALETTES["st-og"];

  const r = (size - strokeWidth) / 2;
  const circum = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, percentage));
  const offset = circum - (clamped / 100) * circum;

  const color =
    status === "deficit" ? "#ef4444" : status === "surplus" ? palette.primary : "#10b981";

  return (
    <div className="relative inline-flex items-center justify-center shrink-0 drop-shadow-xs">
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <radialGradient id={`mini-convex-${size}`} cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#f1f5f9" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.7" />
          </radialGradient>
        </defs>

        {/* 3D Convex Disc Center */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r - strokeWidth / 2}
          fill={`url(#mini-convex-${size})`}
        />

        {/* Outer 3D Recessed Channel */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(148, 163, 184, 0.28)"
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* 3D Glowing Progress Arc */}
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
      <span className="absolute font-mono text-[10px] font-black text-foreground drop-shadow-2xs">
        {Math.round(clamped)}%
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. 3D Interactive Live HSN Balance Simulator (Theme-Adaptive)              */
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
  const activeThemeId = useActiveTheme();
  const palette = THEME_GAUGE_PALETTES[activeThemeId] || THEME_GAUGE_PALETTES["st-og"];

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
    <div
      style={{
        background: palette.cardBgGradient,
        boxShadow:
          "0 14px 30px -8px rgba(0,0,0,0.12), 0 4px 10px -2px rgba(0,0,0,0.06), inset 0 1.5px 0 rgba(255,255,255,0.9), inset 0 -2px 0 rgba(0,0,0,0.08)",
      }}
      className={cn(
        "rounded-2xl border-t-2 border-l-2 border-r border-b-3 p-4 sm:p-5 space-y-4 transition-all",
        palette.cardBorder,
        "border-t-white/95 dark:border-t-white/20 border-b-black/15 dark:border-b-black/50",
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div
            style={{ background: palette.activePillBg, boxShadow: palette.activePillShadow }}
            className="p-2.5 rounded-xl text-white border-t border-white/40"
          >
            <Sliders className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-foreground flex items-center gap-2">
              <span>Interactive HSN Balancing Simulator &amp; What-If Tester</span>
              <Badge
                className={cn(
                  palette.badgeBg,
                  palette.badgeText,
                  palette.badgeBorder,
                  "text-[10px] uppercase font-bold shadow-2xs border-t border-b-2",
                )}
              >
                3D LIVE DIAL
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
          className="h-8 text-xs gap-1 cursor-pointer font-bold border-t border-b-2 border-black/15 shadow-2xs hover:-translate-y-0.5 active:translate-y-0.5 transition-all"
        >
          <RotateCcw className="h-3 w-3" />
          Reset Tester
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Left: 3D Speedometer Gauge Pod */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center p-3 rounded-2xl bg-card border-t-2 border-l border-r border-b-3 border-t-white/90 dark:border-t-white/10 border-b-black/15 dark:border-b-black/40 shadow-[0_10px_20px_-4px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
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

        {/* Right: Interactive 3D Tactile Slider Controls */}
        <div className="lg:col-span-8 space-y-4">
          {/* Category Pill Selectors in 3D */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {Object.entries(HSN_OPTIONS).map(([code, opt]) => {
              const isSelected = selectedHsn === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => handleCategoryChange(code)}
                  style={
                    isSelected
                      ? {
                          background: palette.activePillBg,
                          color: palette.activePillText,
                          boxShadow: palette.activePillShadow,
                        }
                      : undefined
                  }
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-t border-b-2",
                    isSelected
                      ? "border-t-white/40 border-b-black/25 scale-[1.02]"
                      : "bg-card text-muted-foreground border-border/80 hover:bg-muted hover:text-foreground shadow-2xs hover:-translate-y-0.5",
                  )}
                >
                  <span>{code}</span>
                  <span className="ml-1 opacity-80 text-[10px]">({opt.unit})</span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Slider 1: Sold Outward Billed */}
            <div className="space-y-2 rounded-2xl border-t-2 border-l border-r border-b-3 border-t-white/90 dark:border-t-white/10 border-b-black/15 dark:border-b-black/40 bg-card p-3.5 shadow-[0_6px_14px_-2px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.8)]">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-rose-700 dark:text-rose-400">
                  Billed Outward (Sales)
                </span>
                <span className="font-mono font-black text-foreground">
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
                className="w-full accent-rose-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg shadow-inner"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>0</span>
                <span>500</span>
                <span>1,000 {meta.unit}</span>
              </div>
            </div>

            {/* Slider 2: Inward Purchases */}
            <div className="space-y-2 rounded-2xl border-t-2 border-l border-r border-b-3 border-t-white/90 dark:border-t-white/10 border-b-black/15 dark:border-b-black/40 bg-card p-3.5 shadow-[0_6px_14px_-2px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.8)]">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-emerald-700 dark:text-emerald-400">
                  Inward Covered (Purchases)
                </span>
                <span className="font-mono font-black text-foreground">
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
                className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg shadow-inner"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>0</span>
                <span>500</span>
                <span>1,000 {meta.unit}</span>
              </div>
            </div>
          </div>

          {/* Result Alert & 3D Action Banner */}
          <div
            className={cn(
              "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border-t-2 border-l border-r border-b-3 text-xs shadow-[0_8px_16px_-4px_rgba(0,0,0,0.08)]",
              deficitQty > 0
                ? "bg-rose-50/95 border-rose-300 dark:bg-rose-950/30 dark:border-rose-800 text-rose-950 dark:text-rose-200 border-t-white/80 border-b-rose-400/80"
                : "bg-emerald-50/95 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200 border-t-white/80 border-b-emerald-400/80",
            )}
          >
            <div>
              <div className="font-black text-sm flex items-center gap-1.5">
                {deficitQty > 0 ? (
                  <>
                    <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>
                      Inward Purchase Deficit: {deficitQty} {meta.unit} (~₹{formatInr(deficitValue)}
                      )
                    </span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>100% Inward Covered — Zero Negative Stock</span>
                  </>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {deficitQty > 0
                  ? `You must procure purchase invoices from quarries/vendors for at least ${deficitQty} ${meta.unit} under HSN ${selectedHsn} to avoid GST audit notices.`
                  : "All outward customer supplies are backed by adequate quarry & supplier purchase invoices."}
              </p>
            </div>

            <Button
              asChild
              size="sm"
              style={
                deficitQty > 0
                  ? {
                      background: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
                      boxShadow: "0 6px 14px -2px rgba(225,29,72,0.45)",
                    }
                  : {
                      background: palette.activePillBg,
                      boxShadow: palette.activePillShadow,
                    }
              }
              className="font-extrabold text-white shrink-0 border-t border-white/40 border-b-2 border-black/25 hover:-translate-y-0.5 active:translate-y-0.5 transition-all cursor-pointer h-8 text-xs"
            >
              <Link to="/purchase-invoices">
                <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />
                Add Purchase Bill &rarr;
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. 3D Personal Accounts SFT Scrutiny Simulator (Theme-Adaptive)             */
/* -------------------------------------------------------------------------- */

export function SftInflowSimulator({
  ramanCurrent = 0,
  rishiCurrent = 0,
}: {
  ramanCurrent?: number;
  rishiCurrent?: number;
}) {
  const activeThemeId = useActiveTheme();
  const palette = THEME_GAUGE_PALETTES[activeThemeId] || THEME_GAUGE_PALETTES["st-og"];

  const [targetAccount, setTargetAccount] = useState<"raman" | "rishi">("raman");
  const [simDepositAmount, setSimDepositAmount] = useState<number>(50000);

  const baseCurrent = targetAccount === "raman" ? ramanCurrent : rishiCurrent;
  const projectedTotal = baseCurrent + simDepositAmount;
  const limit = 1000000;
  const projectedHeadroom = Math.max(0, limit - projectedTotal);

  const isCaution = projectedTotal >= 500000 && projectedTotal < 750000;
  const isHighRisk = projectedTotal >= 750000 && projectedTotal < 900000;
  const isCritical = projectedTotal >= 900000;

  return (
    <div
      style={{
        background: palette.cardBgGradient,
        boxShadow:
          "0 14px 30px -8px rgba(0,0,0,0.12), 0 4px 10px -2px rgba(0,0,0,0.06), inset 0 1.5px 0 rgba(255,255,255,0.9), inset 0 -2px 0 rgba(0,0,0,0.08)",
      }}
      className={cn(
        "rounded-2xl border-t-2 border-l-2 border-r border-b-3 p-4 sm:p-5 space-y-4 transition-all",
        palette.cardBorder,
        "border-t-white/95 dark:border-t-white/20 border-b-black/15 dark:border-b-black/50",
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div
            style={{ background: palette.activePillBg, boxShadow: palette.activePillShadow }}
            className="p-2.5 rounded-xl text-white border-t border-white/40"
          >
            <Smartphone className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-foreground flex items-center gap-2">
              <span>Personal UPI Inflow Scrutiny Simulator (Section 285BA / ₹10L Ceiling)</span>
              <Badge
                className={cn(
                  palette.badgeBg,
                  palette.badgeText,
                  palette.badgeBorder,
                  "text-[10px] uppercase font-bold shadow-2xs border-t border-b-2",
                )}
              >
                Rule 114E
              </Badge>
            </h4>
            <p className="text-xs text-muted-foreground">
              Simulate customer payments to personal savings UPI before accepting them to protect
              against automatic banking tax notices.
            </p>
          </div>
        </div>

        {/* 3D Rocker Switch for Raman / Rishi */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-card border-t-2 border-l border-r border-b-2 border-t-white/90 dark:border-t-white/10 border-b-black/15 shadow-inner">
          <button
            type="button"
            onClick={() => setTargetAccount("raman")}
            style={
              targetAccount === "raman"
                ? {
                    background: palette.activePillBg,
                    color: palette.activePillText,
                    boxShadow: palette.activePillShadow,
                  }
                : undefined
            }
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border-t border-b-2",
              targetAccount === "raman"
                ? "border-t-white/40 border-b-black/25"
                : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            Raman
          </button>
          <button
            type="button"
            onClick={() => setTargetAccount("rishi")}
            style={
              targetAccount === "rishi"
                ? {
                    background: palette.activePillBg,
                    color: palette.activePillText,
                    boxShadow: palette.activePillShadow,
                  }
                : undefined
            }
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border-t border-b-2",
              targetAccount === "rishi"
                ? "border-t-white/40 border-b-black/25"
                : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            Rishi
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Speedometer Gauge Pod */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-3 rounded-2xl bg-card border-t-2 border-l border-r border-b-3 border-t-white/90 dark:border-t-white/10 border-b-black/15 dark:border-b-black/40 shadow-[0_10px_20px_-4px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
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
          <div className="space-y-2 rounded-2xl border-t-2 border-l border-r border-b-3 border-t-white/90 dark:border-t-white/10 border-b-black/15 dark:border-b-black/40 bg-card p-4 shadow-[0_6px_14px_-2px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.8)]">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-foreground">
                Simulate Customer UPI Deposit to {targetAccount === "raman" ? "Raman" : "Rishi"}
              </span>
              <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-sm">
                + ₹{formatInr(simDepositAmount)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="500000"
              step="10000"
              value={simDepositAmount}
              onChange={(e) => setSimDepositAmount(Number(e.target.value))}
              className="w-full accent-amber-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg shadow-inner"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>₹0</span>
              <span>₹2,50,000</span>
              <span>₹5,00,000</span>
            </div>
          </div>

          {/* Detailed Metric Rollup */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-2xl border-t-2 border-l border-r border-b-3 border-t-white/90 border-b-black/15 bg-card shadow-2xs">
              <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                Existing Credits
              </div>
              <div className="text-sm font-mono font-black text-foreground mt-0.5">
                ₹{formatInr(baseCurrent)}
              </div>
            </div>
            <div className="p-3 rounded-2xl border-t-2 border-l border-r border-b-3 border-t-white/90 border-b-black/15 bg-card shadow-2xs">
              <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                Projected Total
              </div>
              <div className="text-sm font-mono font-black text-amber-600 dark:text-amber-400 mt-0.5">
                ₹{formatInr(projectedTotal)}
              </div>
            </div>
            <div className="p-3 rounded-2xl border-t-2 border-l border-r border-b-3 border-t-white/90 border-b-black/15 bg-card shadow-2xs">
              <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                Safe Headroom
              </div>
              <div
                className={cn(
                  "text-sm font-mono font-black mt-0.5",
                  projectedHeadroom > 250000
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-rose-700 dark:text-rose-400",
                )}
              >
                ₹{formatInr(projectedHeadroom)}
              </div>
            </div>
          </div>

          {/* Dynamic Advice Alert */}
          <div
            className={cn(
              "p-3.5 rounded-2xl border-t-2 border-l border-r border-b-3 text-xs shadow-2xs",
              isCritical || isHighRisk
                ? "bg-rose-50/95 border-rose-300 dark:bg-rose-950/30 dark:border-rose-800 text-rose-950 dark:text-rose-200 border-t-white/80 border-b-rose-400/80"
                : isCaution
                  ? "bg-amber-50/95 border-amber-300 dark:bg-amber-950/30 dark:border-amber-800 text-amber-950 dark:text-amber-200 border-t-white/80 border-b-amber-400/80"
                  : "bg-emerald-50/95 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200 border-t-white/80 border-b-emerald-400/80",
            )}
          >
            <div className="font-black flex items-center gap-1.5">
              {isCritical || isHighRisk ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>Statutory Notice Warning (Section 285BA Exposure)</span>
                </>
              ) : isCaution ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>Approaching SFT Ceiling — Balance with Partner</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Safe Operations Zone</span>
                </>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {isCritical
                ? "Cease personal UPI collections immediately! Divert all customer inflows to Bank of Baroda Company Current Account or Direct Quarry Vendor Offsets."
                : isHighRisk
                  ? `Only ₹${formatInr(projectedHeadroom)} remaining before automatic bank scrutiny trigger. Suggest asking customer to pay quarry directly or switch to partner.`
                  : isCaution
                    ? `Remaining headroom is ₹${formatInr(projectedHeadroom)}. Start balancing collections between Raman and Rishi.`
                    : "Personal UPI deposits are within safe statutory limits. No reporting risk."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

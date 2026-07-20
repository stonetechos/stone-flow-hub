/**
 * Shared STDL tone helpers.
 *
 * Every "signal" surface in the app — status pills, priority badges, insight
 * cards, dot markers, KPI value tints — must map through this module so a
 * theme swap (Executive / Quarry / Foundry / Atelier) restyles the entire
 * product from a single source of truth. Raw palette classes
 * (`text-emerald-600`, `bg-amber-500/10`, `border-red-500/40`) are forbidden
 * in feature code; call `toneText`, `toneSurface`, `toneBorder`, `toneDot`
 * instead.
 */

export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

/** Loose signal keywords used across dashboards — map to the canonical Tone. */
export type ToneSignal =
  | Tone
  | "ok"
  | "positive"
  | "warn"
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "hot"
  | "warm"
  | "cold"
  | "dormant"
  | "lost"
  | "healthy"
  | "attention"
  | "excellent";

const SIGNAL_MAP: Record<ToneSignal, Tone> = {
  neutral: "neutral",
  info: "info",
  success: "success",
  warning: "warning",
  danger: "danger",
  ok: "success",
  positive: "success",
  healthy: "success",
  excellent: "success",
  low: "success",
  warn: "warning",
  warm: "warning",
  medium: "warning",
  attention: "warning",
  hot: "warning",
  critical: "danger",
  high: "danger",
  cold: "info",
  dormant: "neutral",
  lost: "neutral",
};

export function resolveTone(signal: ToneSignal | undefined | null): Tone {
  if (!signal) return "neutral";
  return SIGNAL_MAP[signal] ?? "neutral";
}

/** Foreground text colour for a tone. */
export function toneText(signal: ToneSignal | undefined | null): string {
  const t = resolveTone(signal);
  return {
    neutral: "text-muted-foreground",
    info: "text-status-info-fg",
    success: "text-status-success-fg",
    warning: "text-status-warning-fg",
    danger: "text-status-danger-fg",
  }[t];
}

/** Full surface trio (bg + text + border) — used by insight cards, chips. */
export function toneSurface(signal: ToneSignal | undefined | null): string {
  const t = resolveTone(signal);
  return {
    neutral: "bg-muted/40 text-muted-foreground border-border-subtle",
    info: "bg-status-info-bg text-status-info-fg border-status-info-border",
    success: "bg-status-success-bg text-status-success-fg border-status-success-border",
    warning: "bg-status-warning-bg text-status-warning-fg border-status-warning-border",
    danger: "bg-status-danger-bg text-status-danger-fg border-status-danger-border",
  }[t];
}

/** Border only — for outlined badges / cards. */
export function toneBorder(signal: ToneSignal | undefined | null): string {
  const t = resolveTone(signal);
  return {
    neutral: "border-border",
    info: "border-status-info-border",
    success: "border-status-success-border",
    warning: "border-status-warning-border",
    danger: "border-status-danger-border",
  }[t];
}

/** Solid dot background — for timeline dots, legend chips. */
export function toneDot(signal: ToneSignal | undefined | null): string {
  const t = resolveTone(signal);
  return {
    neutral: "bg-muted-foreground/50",
    info: "bg-status-info-fg",
    success: "bg-status-success-fg",
    warning: "bg-status-warning-fg",
    danger: "bg-status-danger-fg",
  }[t];
}

/** Muted tinted background used by calendar / category chips. */
export function toneSoftBg(signal: ToneSignal | undefined | null): string {
  const t = resolveTone(signal);
  return {
    neutral: "bg-muted text-muted-foreground",
    info: "bg-status-info-bg text-status-info-fg",
    success: "bg-status-success-bg text-status-success-fg",
    warning: "bg-status-warning-bg text-status-warning-fg",
    danger: "bg-status-danger-bg text-status-danger-fg",
  }[t];
}

/** Numeric business-health score → tone. */
export function scoreTone(score: number): Tone {
  if (score >= 80) return "success";
  if (score >= 60) return "warning";
  if (score >= 40) return "warning";
  return "danger";
}

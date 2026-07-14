/**
 * Type contracts for the Executive Aggregator (Phase G.6).
 *
 * Everything here consumes the Insight Quality Layer's output (Phase
 * G.5.5's `processInsights()`) and describes the one deterministic
 * Executive Brief built from it. Nothing in this module reaches back into
 * providers, the registry, or the database — it only re-shapes the
 * `ProcessedInsights` a caller already has.
 */
import type { ProcessedInsight, ProcessedInsights } from "@/lib/insights/quality/pipeline";
import type { Tone } from "@/lib/ui/tones";

export type { ProcessedInsight };
/** Alias matching the phase spec's naming ("Input: ProcessedInsightResult") —
 *  identical shape to `ProcessedInsights` from the quality layer. */
export type ProcessedInsightResult = ProcessedInsights;

export type ExecutiveHealthLevel = "Excellent" | "Healthy" | "Stable" | "Watch" | "Critical";

/** Minimal count shape `health.ts` needs — deliberately not the full
 *  `ExecutiveSummary` so `sections.ts` can reuse the same calculation for
 *  a single module's counts, not just the global summary. */
export interface HealthCounts {
  critical: number;
  warning: number;
  healthy: number;
  total: number;
}

export interface ExecutiveHealth {
  level: ExecutiveHealthLevel;
  reason: string;
  criticalCount: number;
  warningCount: number;
  healthyCount: number;
}

/** The single most important thing to look at right now. */
export interface ExecutiveHeadline {
  headline: string;
  subtitle: string;
  reason: string;
  module: string;
  tone: Tone;
  insightId: string;
  href: string;
}

export interface ExecutiveAction {
  id: string;
  title: string;
  href: string;
  module: string;
  tone: Tone;
  normalizedPriority: number;
  entityType: string;
  entityId: string;
}

/**
 * critical/warning/healthy mirror the quality layer's own summary counts.
 * `resolved` counts insights the quality layer already consolidated away
 * (duplicates absorbed by merge/dedupe, plus conflicts folded into
 * `supportingContext`) — i.e. how much noise was cleaned up before this
 * brief was built, not a workflow "resolved" status (nothing in this app
 * tracks that). `attentionRequired` = critical + warning. `completionRatio`
 * = healthy / total (1 when there are no insights at all — nothing
 * outstanding).
 */
export interface ExecutiveMetric {
  critical: number;
  warning: number;
  healthy: number;
  resolved: number;
  attentionRequired: number;
  completionRatio: number;
}

export interface ExecutiveSection {
  /** Display label — "Sales" | "Operations" | "Finance" | "Customers". */
  module: string;
  headline: string;
  topInsight: ProcessedInsight | null;
  count: number;
  health: ExecutiveHealth;
  topAction: ExecutiveAction | null;
}

export interface ExecutiveBrief {
  headline: ExecutiveHeadline;
  health: ExecutiveHealth;
  metrics: ExecutiveMetric;
  sections: ExecutiveSection[];
  topActions: ExecutiveAction[];
  generatedAt: string;
}

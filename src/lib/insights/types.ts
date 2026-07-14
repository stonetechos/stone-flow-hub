/**
 * Executive Intelligence Foundation — Insight type contracts.
 *
 * An `Insight` is the smallest unit surfaced by the executive intelligence
 * layer: a single risk, warning, opportunity, or suggested action, sourced
 * from anywhere in the app (sales, cash, procurement, production, ...).
 *
 * Phase G.1 defined the pluggable shape with just id/source/kind/title.
 * Phase G.2 (Sales Intelligence Pack) formalizes the full contract every
 * real producer must fill in: `module`, `confidence`, `why`, `action`,
 * and `entity` are required from here on — a provider that can't explain
 * *why* an insight fired, or where it deep-links to, shouldn't emit one.
 * `value` and `expiresAt` stay optional since not every insight has a
 * monetary value or a natural expiry.
 */
import type { InsightKind } from "@/components/dashboard/InsightCard";
import type { ToneSignal } from "@/lib/ui/tones";

// Re-exported so consumers only need to import from `lib/insights`, not reach
// into the dashboard component folder for the kind union.
export type { InsightKind };

/** What an insight is "about" — the record a user would want to open. */
export interface InsightEntityRef {
  /** e.g. "quote" | "enquiry" | "followup" | "customer". */
  type: string;
  id: string;
  /** Human-readable label — e.g. the quote_no / enquiry_no. */
  label: string;
}

/** The single primary call-to-action a card offers. */
export interface InsightAction {
  label: string;
  /** In-app route, passed straight through to <InsightCard to>. */
  href: string;
}

/** A single executive insight, ready to render via <InsightCard>/<InsightList>. */
export interface Insight {
  /** Stable id, unique within its own source. Used for React keys and de-dupe. */
  id: string;
  /** Provider id that produced this — internal key for registry lookups,
   *  react-query cache keys, and de-dupe. Not shown to the user. */
  source: string;
  /** Human-facing pack/module name this insight belongs to, e.g. "Sales". */
  module: string;
  kind: InsightKind;
  tone: ToneSignal;
  /**
   * Deterministic confidence, 0..1, in this insight's classification.
   * This is NOT a prediction or ML score — every Sales Intelligence
   * provider is pure rule-based TypeScript over real rows. It reflects
   * how completely the underlying data supports the rule that fired
   * (e.g. reduced when a provider had to fall back to a weaker signal).
   */
  confidence: number;
  title: string;
  /** Explanation — must reference real underlying data (dates, amounts,
   *  counts, stage names). No placeholder or demo copy. */
  why: string;
  action: InsightAction;
  entity: InsightEntityRef;
  /** Business value in INR, when the insight has one (quote total, enquiry budget). */
  value?: number;
  /** Higher sorts first within a merged list. Default 0 when absent. */
  priority?: number;
  /** ISO timestamp — when this insight was generated. */
  generatedAt?: string;
  /** ISO timestamp — when this insight stops being relevant, if it naturally expires. */
  expiresAt?: string;
}

/**
 * Contract every insight producer must implement to plug into the
 * Executive Intelligence Foundation.
 *
 * Producers are intentionally dumb from the registry's point of view: they
 * just resolve a list of `Insight`s. Anything from a simple derived-data
 * lookup to a future AI/prediction service can sit behind `fetch` without
 * the registry, bus, or UI layer changing.
 */
export interface InsightProvider {
  /** Stable, unique key — also used as `Insight.source` for its output and
   *  as the react-query cache key segment (see ./hooks). */
  id: string;
  /** Human label — e.g. for a future settings/debug panel listing producers. */
  label: string;
  /** Async fetch — resolves the current set of insights for this producer. */
  fetch: () => Promise<Insight[]>;
}

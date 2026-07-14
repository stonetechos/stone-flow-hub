/**
 * Executive Intelligence Foundation — Insight type contracts (Phase G.1).
 *
 * An `Insight` is the smallest unit surfaced by the executive intelligence
 * layer: a single risk, warning, opportunity, or suggested action, sourced
 * from anywhere in the app (sales, cash, procurement, production, ...).
 *
 * Phase G.1 defines the pluggable *shape* only. No producer emits real
 * insights yet — that begins in a later phase, by calling
 * `registerInsightProvider` (see ./registry) from a feature module.
 */
import type { InsightKind } from "@/components/dashboard/InsightCard";
import type { ToneSignal } from "@/lib/ui/tones";

// Re-exported so consumers only need to import from `lib/insights`, not reach
// into the dashboard component folder for the kind union.
export type { InsightKind };

/** A single executive insight, ready to render via <InsightCard>/<InsightList>. */
export interface Insight {
  /** Stable id, unique within its own source. Used for React keys and de-dupe. */
  id: string;
  /** Which provider produced this — e.g. "business-health", "risk", "procurement". */
  source: string;
  kind: InsightKind;
  /** Optional explicit tone override; defaults to the kind's tone (see InsightCard). */
  tone?: ToneSignal;
  title: string;
  detail?: string;
  /** Optional in-app link — passed straight through to <InsightCard to>. */
  href?: string;
  /** Higher sorts first within a merged list. Default 0. */
  priority?: number;
  /** ISO timestamp — when this insight was generated (freshness / sorting / display). */
  generatedAt?: string;
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

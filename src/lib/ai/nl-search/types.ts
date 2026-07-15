/**
 * Natural Language Search — shared type contracts.
 *
 * Phase G.9B.1. Permanent principle: "The LLM understands. The ERP
 * decides. The database remains authoritative." `NlStructuredIntent` is
 * the ONLY thing the LLM ever produces — a classification of what the
 * user meant, never actual business data. Everything after that
 * (`NlResultItem[]`) is produced exclusively by calling real, existing
 * data APIs (entity list functions, Insight Providers, globalSearch) —
 * the LLM never sees a database row and never writes the final answer.
 */

/** The 9 categories Task 3 requires. `timeline_summary` is future-ready —
 *  accepted by the type and the LLM classifier, but resolves through the
 *  same `recent_activity` path today since no dedicated timeline
 *  aggregator exists yet (see the phase deliverable's Task 6 note). */
export type NlIntentCategory =
  | "search"
  | "navigate"
  | "filter"
  | "open_record"
  | "summarize_record"
  | "explain_status"
  | "show_related"
  | "recent_activity"
  | "timeline_summary"
  /** Not a data question at all (how-to, terminology, general chat) —
   *  the signal to fall back to the existing askCopilot free-text chat
   *  instead of running NL Search. */
  | "chat";

/** Entity types NL Search knows how to resolve. Mirrors globalSearch's
 *  SearchGroupKey where they overlap — kept as a separate, slightly
 *  coarser union because a few groups (e.g. "contacts", "architects")
 *  are sub-views of "customer" for search-intent purposes. */
export type NlEntityType =
  | "customer"
  | "enquiry"
  | "quote"
  | "sales_order"
  | "invoice"
  | "receipt"
  | "dispatch"
  | "installation"
  | "purchase_order"
  | "vendor"
  | "product"
  | "inventory_item"
  | "project";

export interface NlFilters {
  /** Loose, LLM-classified status bucket — deliberately a free string
   *  ("unpaid", "overdue", "pending", "low_stock", "late", "active",
   *  ...) rather than a closed enum, because the *meaning* of each
   *  bucket is entity-specific and resolved in resolve.ts, not here. */
  status?: string;
  dateRange?: "today" | "this_week" | "next_week" | "this_month" | "next_month" | "overdue";
  customerName?: string;
}

/** What the LLM call returns — structure only, never data. */
export interface NlStructuredIntent {
  intent: NlIntentCategory;
  entityType?: NlEntityType;
  /** Free-text terms for name/code/product matching. */
  searchText?: string;
  /** A specific document/record identifier the user named directly
   *  (e.g. "QUO-000021") — used for open_record. */
  identifier?: string;
  filters?: NlFilters;
}

export interface NlResultItem {
  id: string;
  entityType: NlEntityType;
  title: string;
  subtitle?: string | null;
  href: string;
  /** Higher sorts first — see rank.ts for how this is computed. */
  rank: number;
  /** Phase G.8.9/G.9B.1 re-audit (Task B4 — "prefer active records, recent
   *  activity"). Both optional: populated where the underlying row makes
   *  the signal unambiguous (is_active flags, unambiguous terminal
   *  statuses, updated_at), left undefined otherwise so rank.ts treats an
   *  unknown signal as neutral rather than penalizing it. */
  updatedAt?: string | null;
  isActive?: boolean;
}

export interface NlSearchResponse {
  intent: NlStructuredIntent;
  /** One-line, deterministic (non-LLM-generated) restatement of what was
   *  searched — built from the structured intent itself, e.g. "invoice
   *  · unpaid · for \"shiv solanki\"" — not a second AI call. */
  interpretation: string;
  results: NlResultItem[];
  resultCount: number;
}

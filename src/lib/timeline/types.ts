/**
 * Business Timeline — shared event contract.
 *
 * Phase G.10. Permanent principle: "The timeline is a VIEW of business
 * history. It is NOT another module requiring user maintenance." This
 * type is never written to a table — every `TimelineEvent` is built at
 * query time by normalizing rows that already exist because some other
 * ERP workflow created them (activity_log triggers, or a document's own
 * created_at/status columns). See lib/timeline/api.ts.
 */

/** Every event kind this phase's audit found flowing into the ERP today.
 *  Deliberately a flat union (not a class hierarchy) so a new source can
 *  add one kind without touching consumers — every consumer already
 *  switches on `kind` for its icon/label, so an unhandled kind falls back
 *  to a generic rendering rather than breaking. */
export type TimelineEventKind =
  | "activity" // raw activity_log row not covered by a richer kind below
  | "enquiry"
  | "quote"
  | "sales_order"
  | "purchase_order"
  | "invoice"
  | "receipt"
  | "dispatch"
  | "installation"
  | "task"
  | "followup"
  | "rfq_sent"
  | "vendor_quote"
  | "ledger";

export interface TimelineEvent {
  /** Stable, globally-unique within one timeline fetch — `${source}:${id}`,
   *  mirroring the Insight Registry's compound-identity convention. */
  id: string;
  /** ISO timestamp — when the event actually happened, not when this row
   *  was fetched. */
  at: string;
  kind: TimelineEventKind;
  /** Human label, e.g. "Quotation approved · QUO-000021". */
  title: string;
  /** One-line supporting detail, or null. */
  detail: string | null;
  /** The document/record's own number, e.g. "QUO-000021", or null for
   *  events with no reference number (e.g. a generic activity_log edit). */
  refNo: string | null;
  /** Loose status word from the source row (e.g. "approved", "pending"),
   *  or null. */
  status: string | null;
  /** Deep link to the source record, or null if it has no detail page. */
  route: string | null;
  amount: number | null;
  /** Who performed the action, when known (activity_log.actor_id,
   *  created_by, etc.). Null for system/trigger-only events. */
  userId: string | null;
  relatedCustomerId: string | null;
  relatedProjectId: string | null;
  /** Optional severity for visually flagging risk/delay events inline in
   *  the timeline (e.g. a dispatch marked overdue) — most events are
   *  informational and leave this null. */
  severity: "info" | "warning" | "danger" | null;
  /** Short, deterministic (non-LLM-generated) machine-readable summary
   *  used as grounding context for Copilot (Task 4) — never prose meant
   *  for the LLM to embellish, just the facts of what happened. */
  aiContext: string;
}

/** A scope narrows a timeline fetch to one relationship — a customer, a
 *  project, a vendor, or a single generic entity (the fallback every
 *  document detail page's own "Timeline" tab already used before this
 *  phase). Exactly one key should be set. */
export type TimelineScope =
  | { customerId: string }
  | { projectId: string }
  | { vendorId: string }
  | { entityType: string; entityId: string };

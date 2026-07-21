/**
 * Workflow Engine handler for "create_quotation" (VIE Phase 3 — Milestone 4:
 * Action Handler).
 *
 * Calls createQuote() from lib/quotes/api.ts — the EXACT SAME function the
 * existing manual "New Quotation" form already calls. No parallel write
 * path, no duplicated business logic (ADR-0001 requirement 2), same
 * discipline as logEnquiry.ts/createCustomer.ts/noteFollowup.ts.
 *
 * Reconstructs a QuoteCreateInput-shaped candidate from `params` and
 * validates it with the REAL, reused quoteCreateSchema (from
 * lib/quotes/schema.ts) before calling createQuote() — not a hand-rolled
 * field-by-field check. This is deliberate: quoteCreateSchema already knows
 * every mandatory field (project_id, at least one item, and each item's
 * unit_price with no default) — re-deriving that as bespoke handler logic
 * would duplicate business logic quoteCreateSchema already owns, which
 * ADR-0001 requirement 2 and this milestone's own "reuse the existing quote
 * schema" instruction both rule out.
 *
 * On missing/invalid mandatory fields, this throws rather than calling
 * createQuote() — the exact same "unreachable guard" convention every other
 * handler in this directory already uses for a Planner-guaranteed field
 * that somehow arrived missing (see logEnquiry.ts/createCustomer.ts/
 * noteFollowup.ts). One deliberate difference from that established
 * convention: for create_quotation this is NOT actually an unreachable edge
 * case today. Milestone 2's planCreateQuotation() only ever resolves
 * customer_id/project_id — it does not yet extract line items or prices
 * (see planner/index.ts and types.ts's createQuotationEntitiesSchema, both
 * deliberately minimal per VIE-CreateQuotation-Architecture-Review.md §12).
 * Per the UX Contract §3/§5, a missing price is expected to be this
 * intent's dominant, ordinary outcome, not a rare bug — so this guard fires
 * routinely today, not "should never happen." The thrown message is
 * itemized (one entry per failed schema check, e.g. which field or which
 * line item) so the specific reason is preserved rather than lost — this is
 * the closest available way to satisfy this milestone's "preserve
 * blockers, never fabricate values" instruction without touching
 * workflowEngine.ts (explicitly out of scope): the existing, unmodified
 * executeAction() catch block persists this message verbatim to
 * vie_actions.error_message and sets status "failed" rather than "applied"
 * — nothing is silently invented, and nothing is silently marked as if it
 * succeeded. See this milestone's response for the full reasoning on why a
 * distinct, non-throwing "draft" outcome isn't achievable without a
 * Workflow Engine change, which this milestone does not make.
 */
import { createQuote } from "@/lib/quotes/api";
import { quoteCreateSchema } from "@/lib/quotes/schema";
import { registerVieAction, type VieActionResult } from "./registry";

registerVieAction("create_quotation", async (params): Promise<VieActionResult> => {
  const candidate = {
    project_id: params.project_id,
    enquiry_id: params.enquiry_id ?? null,
    category: params.category ?? null,
    valid_until: params.valid_until,
    notes: params.notes,
    terms: params.terms,
    items: Array.isArray(params.items) ? params.items : [],
  };

  const parsed = quoteCreateSchema.safeParse(candidate);
  if (!parsed.success) {
    const blockers = parsed.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "(quotation)";
      return `${path}: ${issue.message}`;
    });
    throw new Error(
      `Cannot create quotation — missing or invalid required fields, never fabricated: ${blockers.join("; ")}`,
    );
  }

  const quote = await createQuote(parsed.data);
  return { linkedRecordType: "quote", linkedRecordId: quote.id };
});

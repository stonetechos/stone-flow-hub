/**
 * Natural Language Search — server function.
 *
 * Phase G.9B.1. This is the ONLY place the LLM is called for NL Search,
 * and its sole job is classification: turn free text into a
 * `NlStructuredIntent`. It never sees a database row and never writes
 * the answer shown to the user — `resolveIntent()` (real data APIs /
 * Insight Providers / globalSearch) and `rankResults()` (deterministic
 * scoring) do that. This mirrors `askCopilot`'s auth/server-fn pattern
 * exactly but is a parallel, separate code path — `askCopilot` itself
 * is untouched, preserving its existing "STRICT DATA RULE" behavior for
 * genuine how-to/general questions.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { NlSearchResponse, NlStructuredIntent } from "./nl-search/types";

const nlSearchInput = z.object({
  query: z.string().min(1).max(500),
  /** Phase G.10 — the client's current page, threaded through only to
   *  resolve "this customer"/"this project" style references in
   *  resolveTimelineIntent(). Never shown to the LLM classifier above;
   *  it classifies free text only. */
  context: z
    .object({
      entity: z.string().optional(),
      entityId: z.string().optional(),
    })
    .optional(),
});

const INTENT_SYSTEM_PROMPT = `You are the intent classifier for Stone Tech OS's Natural Language Search.
Your ONLY job is to classify a user's free-text query into a structured intent. You have NO access to the database and MUST NOT invent, guess, or state any specific business record, name, number, amount, or date as fact. You never generate SQL and never bypass existing APIs — you only classify.

Return STRICT JSON matching this shape (omit optional keys you don't need):
{
  "intent": "search" | "navigate" | "filter" | "open_record" | "summarize_record" | "explain_status" | "show_related" | "recent_activity" | "timeline_summary" | "chat",
  "entityType": "customer" | "enquiry" | "quote" | "sales_order" | "invoice" | "receipt" | "dispatch" | "installation" | "purchase_order" | "vendor" | "product" | "inventory_item" | "project",
  "searchText": "free text terms for name/code/product matching",
  "identifier": "a specific document number the user named directly, e.g. QUO-000021",
  "filters": {
    "status": "a loose status word like unpaid, overdue, pending, low_stock, late, active",
    "dateRange": "today" | "this_week" | "next_week" | "this_month" | "next_month" | "overdue",
    "customerName": "a customer name mentioned in the query",
    "sinceDays": "a NUMBER of days, only for backward-looking history questions like 'in the last 90 days' or 'in the past month' (30)"
  }
}

Rules:
- "chat" is for questions that are NOT about looking up specific records — how-to questions, terminology, general conversation. Use it when nothing else fits.
- "open_record" is for queries naming a specific document number (e.g. "Open quotation QUO-000021").
- "navigate" is for queries asking to go to a module/page in general (e.g. "take me to invoices").
- "filter"/"search" are for queries asking for a list of records matching criteria.
- "recent_activity"/"timeline_summary"/"show_related" are for questions asking what happened with ONE specific customer, project or vendor — set entityType and either customerName/searchText (a name) or leave both unset if the query doesn't name one.
- "explain_status" is for "why is X still Y" questions about one specific record — set entityType and identifier if a document number is given.
- "summarize_record" is for "summarize this record's history" questions — set entityType and identifier/searchText.
- Only set entityType when you can identify one from the union above.
- Never fabricate a searchText/identifier/customerName that wasn't implied by the query.

Examples:
"Show unpaid invoices for Shiv Solanki" -> {"intent":"filter","entityType":"invoice","filters":{"status":"unpaid","customerName":"Shiv Solanki"}}
"Open quotation QUO-000021" -> {"intent":"open_record","entityType":"quote","identifier":"QUO-000021"}
"Pending dispatches this week" -> {"intent":"filter","entityType":"dispatch","filters":{"status":"pending","dateRange":"this_week"}}
"Customers with overdue payments" -> {"intent":"filter","entityType":"customer","filters":{"status":"overdue"}}
"Projects starting next month" -> {"intent":"filter","entityType":"project","filters":{"dateRange":"next_month"}}
"Late installations" -> {"intent":"filter","entityType":"installation","filters":{"status":"late"}}
"Low stock of Mint Sandstone" -> {"intent":"filter","entityType":"inventory_item","searchText":"Mint Sandstone","filters":{"status":"low_stock"}}
"What happened with Shiv Solanki during the last 90 days?" -> {"intent":"timeline_summary","entityType":"customer","filters":{"customerName":"Shiv Solanki","sinceDays":90}}
"Why is quotation QUO-000050 still pending?" -> {"intent":"explain_status","entityType":"quote","identifier":"QUO-000050"}
"Show every interaction before I call this customer" -> {"intent":"show_related","entityType":"customer"}
"When was the last payment received from Ashish Patel?" -> {"intent":"recent_activity","entityType":"customer","filters":{"customerName":"Ashish Patel"}}
"Summarize this project's history" -> {"intent":"summarize_record","entityType":"project"}
"How does the manufacturing workflow work" -> {"intent":"chat"}

Return JSON only, no prose.`;

/** Deterministic (non-LLM) restatement of the structured intent, so the
 *  user always sees exactly what was searched — never a second AI call
 *  and never text the LLM could hallucinate. */
function buildInterpretation(intent: NlStructuredIntent): string {
  const parts: string[] = [];
  if (intent.entityType) parts.push(intent.entityType.replace(/_/g, " "));
  if (intent.filters?.status) parts.push(intent.filters.status.replace(/_/g, " "));
  if (intent.filters?.dateRange) parts.push(intent.filters.dateRange.replace(/_/g, " "));
  if (intent.filters?.customerName) parts.push(`for "${intent.filters.customerName}"`);
  if (intent.searchText) parts.push(`"${intent.searchText}"`);
  if (intent.identifier) parts.push(intent.identifier);
  return parts.length > 0 ? parts.join(" · ") : "results";
}

export const nlSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => nlSearchInput.parse(d))
  .handler(async ({ data, context }): Promise<NlSearchResponse> => {
    // Every list*()/getBusinessTimeline()/globalSearch() call this triggers
    // (resolveIntent's full call graph, several layers deep, including the
    // Insight Providers it fans out to) reads its Supabase client via
    // getDb(), which defaults to the anonymous browser singleton unless a
    // request has opted into an authenticated scope. withAuthenticatedClient
    // is that opt-in: it makes context.supabase — the client
    // requireSupabaseAuth's middleware already built with this caller's real
    // bearer token — the client every one of those nested calls resolves to,
    // so RLS evaluates as the actual signed-in user instead of silently
    // running unauthenticated. See integrations/supabase/server-context.ts
    // for the full rationale.
    const { withAuthenticatedClient } = await import("@/integrations/supabase/server-context");

    return withAuthenticatedClient(context.supabase, async () => {
      const { chatJson } = await import("./gateway.server");
      const { resolveIntent } = await import("./nl-search/resolve");
      const { rankResults } = await import("./nl-search/rank");

      const intent = await chatJson<NlStructuredIntent>(
        [
          { role: "system", content: INTENT_SYSTEM_PROMPT },
          { role: "user", content: data.query },
        ],
        { temperature: 0 },
      );

      if (intent.intent === "chat") {
        return { intent, interpretation: "general question", results: [], resultCount: 0 };
      }

      const rawResults = await resolveIntent(intent, data.context);
      const ranked = await rankResults(rawResults, intent);
      const results = ranked.slice(0, 8);

      return {
        intent,
        interpretation: buildInterpretation(intent),
        results,
        resultCount: results.length,
      };
    });
  });

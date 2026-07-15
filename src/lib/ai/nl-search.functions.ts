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
    "customerName": "a customer name mentioned in the query"
  }
}

Rules:
- "chat" is for questions that are NOT about looking up specific records — how-to questions, terminology, general conversation. Use it when nothing else fits.
- "open_record" is for queries naming a specific document number (e.g. "Open quotation QUO-000021").
- "navigate" is for queries asking to go to a module/page in general (e.g. "take me to invoices").
- "filter"/"search" are for queries asking for a list of records matching criteria.
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
  .handler(async ({ data }): Promise<NlSearchResponse> => {
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

    const rawResults = await resolveIntent(intent);
    const ranked = await rankResults(rawResults, intent);
    const results = ranked.slice(0, 8);

    return {
      intent,
      interpretation: buildInterpretation(intent),
      results,
      resultCount: results.length,
    };
  });

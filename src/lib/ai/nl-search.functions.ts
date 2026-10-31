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
import type {
  NlFilters,
  NlSearchResponse,
  NlStructuredIntent,
  NlEntityType,
} from "./nl-search/types";
import { stripIndianHonorifics } from "./nl-search/resolve";

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

const INTENT_SYSTEM_PROMPT = `You are the intent classifier for STOS's Natural Language Search.
Your ONLY job is to classify a user's free-text query into a structured intent. You have NO access to the database and MUST NOT invent, guess, or state any specific business record, name, number, amount, or date as fact. You never generate SQL and never bypass existing APIs — you only classify.

Return STRICT JSON matching this shape (omit optional keys you don't need):
{
  "intent": "search" | "navigate" | "filter" | "open_record" | "summarize_record" | "explain_status" | "show_related" | "recent_activity" | "timeline_summary" | "chat",
  "entityType": "customer" | "enquiry" | "quote" | "sales_order" | "invoice" | "receipt" | "dispatch" | "installation" | "purchase_order" | "vendor" | "product" | "inventory_item" | "project" | "rfq" | "task" | "followup",
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
"Pending quotations" -> {"intent":"filter","entityType":"quote","filters":{"status":"pending"}}
"Open RFQs" -> {"intent":"filter","entityType":"rfq","filters":{"status":"pending"}}
"My tasks due this week" -> {"intent":"filter","entityType":"task","filters":{"dateRange":"this_week"}}
"Follow ups scheduled today for Mint Stone" -> {"intent":"filter","entityType":"followup","searchText":"Mint Stone","filters":{"dateRange":"today"}}
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

/**
 * Fast deterministic intent classifier — runs without external LLM.
 * Classifies queries like:
 * - "Can you tell me the quotation of Mehulbhai" -> { intent: "filter", entityType: "quote", filters: { customerName: "Mehul" }, searchText: "Mehulbhai" }
 * - "Invoices for Dinesh" -> { intent: "filter", entityType: "invoice", filters: { customerName: "Dinesh" }, searchText: "Dinesh" }
 * - "Pending dispatches this week" -> { intent: "filter", entityType: "dispatch", filters: { status: "pending", dateRange: "this_week" } }
 * - "QUO-000025" -> { intent: "open_record", entityType: "quote", identifier: "QUO-000025" }
 */
export function extractDeterministicIntent(
  rawQuery: string,
  _context?: { entity?: string; entityId?: string },
): NlStructuredIntent | null {
  const query = rawQuery.trim();
  if (!query) return null;

  // 1. Check for specific document IDs
  const quoMatch = query.match(/\b(QUO-\d+)\b/i);
  if (quoMatch) {
    return { intent: "open_record", entityType: "quote", identifier: quoMatch[1].toUpperCase() };
  }
  const invMatch = query.match(/\b(INV-\d+)\b/i);
  if (invMatch) {
    return { intent: "open_record", entityType: "invoice", identifier: invMatch[1].toUpperCase() };
  }
  const soMatch = query.match(/\b(SO-\d+)\b/i);
  if (soMatch) {
    return {
      intent: "open_record",
      entityType: "sales_order",
      identifier: soMatch[1].toUpperCase(),
    };
  }
  const poMatch = query.match(/\b(PO-\d+)\b/i);
  if (poMatch) {
    return {
      intent: "open_record",
      entityType: "purchase_order",
      identifier: poMatch[1].toUpperCase(),
    };
  }
  const rfqMatch = query.match(/\b(RFQ-\d+)\b/i);
  if (rfqMatch) {
    return { intent: "open_record", entityType: "rfq", identifier: rfqMatch[1].toUpperCase() };
  }
  const enqMatch = query.match(/\b(ENQ-\d+)\b/i);
  if (enqMatch) {
    return { intent: "open_record", entityType: "enquiry", identifier: enqMatch[1].toUpperCase() };
  }
  const dispMatch = query.match(/\b(DISP(?:ATCH)?-\d+)\b/i);
  if (dispMatch) {
    return {
      intent: "open_record",
      entityType: "dispatch",
      identifier: dispMatch[1].toUpperCase(),
    };
  }
  const recMatch = query.match(/\b(REC-\d+)\b/i);
  if (recMatch) {
    return { intent: "open_record", entityType: "receipt", identifier: recMatch[1].toUpperCase() };
  }

  const lower = query.toLowerCase();

  // 2. Pure general conversation / how-to check
  const isHowTo = /^(how\s+(?:do|to|can|should)|what\s+does|explain\b|who\s+are\s+we)/i.test(lower);
  if (isHowTo && !/\b(quotations?|quotes?|invoices?|orders?|enquir|customers?)\b/i.test(lower)) {
    return { intent: "chat" };
  }

  // 3. Status filters
  let status: string | undefined;
  if (/\bunpaid\b/i.test(lower)) status = "unpaid";
  else if (/\boverdue\b/i.test(lower)) status = "overdue";
  else if (/\bpending\b/i.test(lower)) status = "pending";
  else if (/\bactive\b/i.test(lower)) status = "active";
  else if (/\blate\b/i.test(lower)) status = "late";
  else if (/\blow[\s_]stock\b/i.test(lower)) status = "low_stock";
  else if (/\bapproved\b/i.test(lower)) status = "approved";

  // 4. Date range filters
  let dateRange: NlFilters["dateRange"] | undefined;
  if (/\btoday\b/i.test(lower)) dateRange = "today";
  else if (/\bthis\s*week\b/i.test(lower)) dateRange = "this_week";
  else if (/\bnext\s*week\b/i.test(lower)) dateRange = "next_week";
  else if (/\bthis\s*month\b/i.test(lower)) dateRange = "this_month";
  else if (/\bnext\s*month\b/i.test(lower)) dateRange = "next_month";

  // 5. Detect Entity Type
  let entityType: NlEntityType | undefined;
  if (/\b(quotations?|quotes?|estimates?)\b/i.test(lower)) entityType = "quote";
  else if (/\b(invoices?|bills?|challans?)\b/i.test(lower)) entityType = "invoice";
  else if (/\b(sales\s*orders?|so\b|orders?)\b/i.test(lower)) entityType = "sales_order";
  else if (/\b(enquir(?:y|ies)|inquir(?:y|ies)|leads?)\b/i.test(lower)) entityType = "enquiry";
  else if (/\b(dispatch(?:es)?|deliver(?:y|ies)|shipments?)\b/i.test(lower))
    entityType = "dispatch";
  else if (/\b(installations?|fittings?)\b/i.test(lower)) entityType = "installation";
  else if (/\b(purchase\s*orders?|pos?)\b/i.test(lower)) entityType = "purchase_order";
  else if (/\b(vendors?|suppliers?|supplying\s*partners?|partners?)\b/i.test(lower))
    entityType = "vendor";
  else if (/\b(customers?|clients?|parties|party)\b/i.test(lower)) entityType = "customer";
  else if (/\b(rfqs?)\b/i.test(lower)) entityType = "rfq";
  else if (/\b(tasks?|todos?|to-dos?)\b/i.test(lower)) entityType = "task";
  else if (/\b(follow-?ups?)\b/i.test(lower)) entityType = "followup";
  else if (/\b(projects?|sites?)\b/i.test(lower)) entityType = "project";

  // 6. Extract target name
  let customerName: string | undefined;
  let searchText: string | undefined;

  // Pattern A: "(entity) of/for/to (Name)" (e.g. "quotation of Mehulbhai", "invoices for Dinesh")
  const ofMatch = lower.match(
    /(?:quotations?|quotes?|estimates?|invoices?|bills?|orders?|enquir(?:y|ies)|status|details|update|balance)\s+(?:of|for|to|from)\s+([a-z0-9\s]+?)(?:\s+(?:status|details|pending|today|please|now)|\?|$)/i,
  );
  if (ofMatch && ofMatch[1].trim()) {
    const raw = ofMatch[1].trim();
    customerName = stripIndianHonorifics(raw);
    searchText = raw;
  }

  // Pattern B: "(Name)'s (entity)"
  if (!customerName) {
    const possessiveMatch = lower.match(
      /([a-z0-9\s]+?)'s\s+(?:quotations?|quotes?|estimates?|invoices?|bills?|orders?|enquir(?:y|ies)|status|details)/i,
    );
    if (possessiveMatch && possessiveMatch[1].trim()) {
      const raw = possessiveMatch[1].trim();
      customerName = stripIndianHonorifics(raw);
      searchText = raw;
    }
  }

  // Pattern C: "(Name) (entity)" (e.g. "Mehulbhai quotation", "Dinesh invoice")
  if (!customerName) {
    const prefixMatch = lower.match(
      /\b([a-z]+(?:bhai|ben|ji|kumar|sheth|seth)?)\s+(?:quotations?|quotes?|invoices?|bills?|orders?|enquir)/i,
    );
    if (prefixMatch && prefixMatch[1].trim()) {
      const raw = prefixMatch[1].trim();
      customerName = stripIndianHonorifics(raw);
      searchText = raw;
    }
  }

  // Pattern D: "customer (Name)"
  if (!customerName && entityType === "customer") {
    const cusMatch = lower.match(
      /(?:customer|client|party)\s+([a-z0-9\s]+?)(?:\s+(?:details|profile|history|please)|\?|$)/i,
    );
    if (cusMatch && cusMatch[1].trim()) {
      const raw = cusMatch[1].trim();
      customerName = stripIndianHonorifics(raw);
      searchText = raw;
    }
  }

  if (entityType || customerName || status || dateRange) {
    return {
      intent: "filter",
      entityType: entityType ?? (customerName ? "quote" : undefined),
      searchText: searchText ?? (customerName || undefined),
      filters: {
        status,
        dateRange,
        customerName: customerName || undefined,
      },
    };
  }

  const cleanSearch = query
    .replace(
      /^(can\s+you\s+(?:please\s+)?tell\s+me|tell\s+me|show\s+me|find|search|lookup|where\s+is|give\s+me|what\s+is)\s+/i,
      "",
    )
    .replace(/[?.]+$/g, "")
    .trim();

  return {
    intent: "search",
    searchText: cleanSearch || query,
  };
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
      const { resolveIntent } = await import("./nl-search/resolve");
      const { rankResults } = await import("./nl-search/rank");

      let intent: NlStructuredIntent | null = null;

      // Try LLM classification if configured
      try {
        const { getEffectiveAiConfig, chatJson } = await import("./gateway.server");
        const aiConfig = await getEffectiveAiConfig();
        if (aiConfig) {
          intent = await chatJson<NlStructuredIntent>(
            [
              { role: "system", content: INTENT_SYSTEM_PROMPT },
              { role: "user", content: data.query },
            ],
            { temperature: 0 },
          );
        }
      } catch (err) {
        console.warn(
          "[nlSearch] LLM classification unavailable, using deterministic classifier:",
          err,
        );
      }

      // Fast, deterministic intent extraction fallback
      if (!intent) {
        intent = extractDeterministicIntent(data.query, data.context) ?? {
          intent: "search",
          searchText: data.query.trim(),
        };
      }

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

/**
 * Multi-Tier Correlation & Matching Engine for Quotations and Delivery Challans.
 *
 * Ensures Delivery Challans (public.dispatches) reliably associate with Quotations
 * (public.quotes) across every workflow:
 *  1. Explicit quote_id on dispatches
 *  2. document_lineage (quote <-> dispatch)
 *  3. Sales Order linkage (dispatch -> sales_order -> quote)
 *  4. Direct quote number or UUID referenced in notes / remarks / tags
 *  5. Smart customer & project match with amount and date proximity scoring
 */

export interface QuoteMatchCandidate {
  id: string;
  quote_no: string;
  customer_id?: string | null;
  project_id?: string | null;
  total?: number | string | null;
  created_at?: string | null;
  status?: string | null;
}

export interface DispatchMatchCandidate {
  id: string;
  dispatch_no: string;
  quote_id?: string | null;
  sales_order_id?: string | null;
  customer_id?: string | null;
  project_id?: string | null;
  status?: string | null;
  dispatch_date?: string | null;
  carting_charge?: number | string | null;
  notes?: string | null;
  remarks?: string | null;
  created_at?: string | null;
  sales_order?: {
    id: string;
    quote_id?: string | null;
    so_no?: string | null;
  } | null;
}

export interface LineageMatchLink {
  source_id: string;
  target_id: string;
  source_type: string;
  target_type: string;
}

export type MatchConfidence =
  | "explicit"
  | "lineage"
  | "sales_order"
  | "quote_reference"
  | "customer_match";

export interface DispatchMatchResult {
  quoteId: string;
  dispatchId: string;
  confidence: MatchConfidence;
  score: number;
  reason: string;
}

/**
 * Normalizes quote numbers for fuzzy text matching:
 * "QUO-000013" -> "quo000013", "13"
 */
function extractQuoteTokens(quoteNo: string): string[] {
  const tokens: string[] = [quoteNo.toLowerCase().trim()];
  const digits = quoteNo.replace(/\D/g, "");
  if (digits) {
    tokens.push(digits);
    const unpadded = String(parseInt(digits, 10));
    if (unpadded !== digits) tokens.push(unpadded);
  }
  return tokens;
}

/**
 * Evaluates whether dispatch text mentions the quote.
 */
function checkTextMention(
  text: string,
  quote: QuoteMatchCandidate,
): { mentions: boolean; isExactNo: boolean } {
  const lowerText = text.toLowerCase();
  if (lowerText.includes(quote.id.toLowerCase())) {
    return { mentions: true, isExactNo: true };
  }

  const quoteNoLower = quote.quote_no.toLowerCase();
  if (lowerText.includes(quoteNoLower)) {
    return { mentions: true, isExactNo: true };
  }

  // Check pattern like "Quote #QUO-000013" or "Quote 13"
  const tokens = extractQuoteTokens(quote.quote_no);
  for (const t of tokens) {
    if (t.length >= 2 && lowerText.includes(t)) {
      // Check if it's surrounded by quote indicators or word boundaries
      const regex = new RegExp(`(?:quote|quo|challan|for|#)\\s*[:#-]?\\s*0*${t}\\b`, "i");
      if (regex.test(text)) {
        return { mentions: true, isExactNo: true };
      }
    }
  }

  return { mentions: false, isExactNo: false };
}

/**
 * Calculate similarity / match score between a candidate dispatch and quote.
 */
export function calculateMatchScore(
  quote: QuoteMatchCandidate,
  dispatch: DispatchMatchCandidate,
  lineageLinks?: LineageMatchLink[],
  soToQuoteMap?: Map<string, string> | Record<string, string>,
): { score: number; confidence: MatchConfidence; reason: string } | null {
  // Exclude cancelled dispatches
  if (dispatch.status === "cancelled") return null;

  // 1. Explicit foreign key on dispatch
  if (dispatch.quote_id && dispatch.quote_id === quote.id) {
    return {
      score: 1000,
      confidence: "explicit",
      reason: `Direct quote_id linked to ${quote.quote_no}`,
    };
  }

  // 2. Document Lineage
  if (lineageLinks && lineageLinks.length > 0) {
    const hasLineage = lineageLinks.some(
      (l) =>
        (l.source_type === "quote" &&
          l.source_id === quote.id &&
          l.target_type === "dispatch" &&
          l.target_id === dispatch.id) ||
        (l.source_type === "dispatch" &&
          l.source_id === dispatch.id &&
          l.target_type === "quote" &&
          l.target_id === quote.id),
    );
    if (hasLineage) {
      return {
        score: 900,
        confidence: "lineage",
        reason: `Document lineage hop (Quote -> Dispatch)`,
      };
    }
  }

  // 3. Sales Order Linkage
  const soQuoteId =
    dispatch.sales_order?.quote_id ??
    (dispatch.sales_order_id
      ? soToQuoteMap instanceof Map
        ? soToQuoteMap.get(dispatch.sales_order_id)
        : soToQuoteMap?.[dispatch.sales_order_id]
      : null);

  if (soQuoteId && soQuoteId === quote.id) {
    return {
      score: 800,
      confidence: "sales_order",
      reason: `Sales Order #${dispatch.sales_order?.so_no || "SO"} linked to ${quote.quote_no}`,
    };
  }

  // 4. Text / Notes / Remarks matching
  const combinedText = `${dispatch.notes || ""} ${dispatch.remarks || ""}`;
  if (combinedText.trim()) {
    const textCheck = checkTextMention(combinedText, quote);
    if (textCheck.mentions) {
      return {
        score: 700,
        confidence: "quote_reference",
        reason: `Notes mention ${quote.quote_no}`,
      };
    }
  }

  // 5. Customer Matching
  if (dispatch.customer_id && quote.customer_id && dispatch.customer_id === quote.customer_id) {
    let score = 100;
    const reasons: string[] = ["Same customer"];

    // Project match bonus
    if (dispatch.project_id && quote.project_id && dispatch.project_id === quote.project_id) {
      score += 40;
      reasons.push("matching project");
    }

    // Amount correlation bonus
    const qTotal = Number(quote.total || 0);
    const carting = Number(dispatch.carting_charge || 0);
    if (qTotal > 0) {
      // If dispatch notes or items approximate quote amount
      const diffWithCarting = Math.abs(qTotal + carting - qTotal); // carting diff
      if (diffWithCarting < 5000) {
        score += 25;
      }
    }

    // Date proximity bonus
    const dDateStr = dispatch.dispatch_date || dispatch.created_at;
    const qDateStr = quote.created_at;
    if (dDateStr && qDateStr) {
      const dTime = new Date(dDateStr).getTime();
      const qTime = new Date(qDateStr).getTime();
      if (!Number.isNaN(dTime) && !Number.isNaN(qTime)) {
        const daysDiff = Math.abs(dTime - qTime) / (1000 * 60 * 60 * 24);
        if (daysDiff <= 3) {
          score += 35;
          reasons.push("same creation timeline");
        } else if (daysDiff <= 14) {
          score += 20;
          reasons.push("within 2 weeks");
        } else if (daysDiff <= 45) {
          score += 10;
        }
      }
    }

    return {
      score,
      confidence: "customer_match",
      reason: `Customer match (${reasons.join(", ")})`,
    };
  }

  return null;
}

/**
 * Correlates an array of quotes with candidate dispatches.
 * Returns a dictionary mapping quoteId -> array of matched dispatches.
 */
export function correlateDispatchesToQuotes<
  Q extends QuoteMatchCandidate,
  D extends DispatchMatchCandidate,
>(
  quotes: Q[],
  dispatches: D[],
  options?: {
    lineage?: LineageMatchLink[];
    soToQuoteMap?: Map<string, string> | Record<string, string>;
  },
): Record<string, D[]> {
  const result: Record<string, D[]> = {};
  for (const q of quotes) {
    result[q.id] = [];
  }

  if (quotes.length === 0 || dispatches.length === 0) {
    return result;
  }

  // Calculate scores for all valid pairs
  const scoredPairs: Array<{
    quote: Q;
    dispatch: D;
    score: number;
    confidence: MatchConfidence;
    reason: string;
  }> = [];

  for (const d of dispatches) {
    if (d.status === "cancelled") continue;
    for (const q of quotes) {
      const match = calculateMatchScore(q, d, options?.lineage, options?.soToQuoteMap);
      if (match) {
        scoredPairs.push({
          quote: q,
          dispatch: d,
          score: match.score,
          confidence: match.confidence,
          reason: match.reason,
        });
      }
    }
  }

  // Sort descending by score
  scoredPairs.sort((a, b) => b.score - a.score);

  const assignedDispatchIds = new Set<string>();

  // High-confidence tier matches (explicit, lineage, sales_order, direct quote mention)
  for (const pair of scoredPairs) {
    if (pair.score >= 600) {
      if (!result[pair.quote.id].some((d) => d.id === pair.dispatch.id)) {
        result[pair.quote.id].push(pair.dispatch);
        assignedDispatchIds.add(pair.dispatch.id);
      }
    }
  }

  // Customer-level matches: assign unclaimed dispatches to the best-matching quote
  for (const pair of scoredPairs) {
    if (pair.score < 600) {
      if (!assignedDispatchIds.has(pair.dispatch.id)) {
        if (!result[pair.quote.id].some((d) => d.id === pair.dispatch.id)) {
          result[pair.quote.id].push(pair.dispatch);
          assignedDispatchIds.add(pair.dispatch.id);
        }
      }
    }
  }

  return result;
}

/**
 * Finds the single best quote match for a customer dispatch candidate.
 * Useful in New Delivery Challan / Edit screens when picking a customer.
 */
export function findBestQuoteForCustomer<Q extends QuoteMatchCandidate>(
  customerId: string,
  quotes: Q[],
  projectId?: string | null,
): Q | null {
  const customerQuotes = quotes.filter((q) => q.customer_id === customerId);
  if (customerQuotes.length === 0) return null;
  if (customerQuotes.length === 1) return customerQuotes[0];

  // Prioritize accepted status first
  const accepted = customerQuotes.filter((q) => q.status === "accepted");
  const pool = accepted.length > 0 ? accepted : customerQuotes;

  if (projectId) {
    const withProj = pool.find((q) => q.project_id === projectId);
    if (withProj) return withProj;
  }

  // Otherwise return the most recently created quote
  return pool.slice().sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
    return tb - ta;
  })[0];
}

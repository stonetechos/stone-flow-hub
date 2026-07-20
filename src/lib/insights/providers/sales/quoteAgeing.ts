/**
 * QuoteAgeingProvider — flags open (sent, not yet responded to) quotes
 * that have been sitting too long without the customer accepting,
 * rejecting, or the sales team following up.
 *
 * Reads: quotes, customers (via the existing `listQuotes` join — no new
 * query shape is introduced for the customer side).
 */
import { listQuotes } from "@/lib/quotes/api";
import { formatInr } from "@/lib/format";
import type { Insight, InsightProvider } from "@/lib/insights/types";
import { daysSince } from "@/lib/insights/shared/dates";
import { computeConfidence, computePriority } from "@/lib/insights/shared/priority";
import { QUOTE_AGEING_THRESHOLDS } from "./thresholds";

export const QUOTE_AGEING_PROVIDER_ID = "sales.quote-ageing";

export type QuoteAgeingBand = "healthy" | "ageing" | "stale";

/** Pure classification — no I/O, easy to test in isolation. */
export function classifyQuoteAge(
  ageDays: number,
  thresholds = QUOTE_AGEING_THRESHOLDS,
): QuoteAgeingBand {
  if (ageDays <= thresholds.healthyMaxDays) return "healthy";
  if (ageDays <= thresholds.ageingMaxDays) return "ageing";
  return "stale";
}

export const QuoteAgeingProvider: InsightProvider = {
  id: QUOTE_AGEING_PROVIDER_ID,
  label: "Quote ageing",
  fetch: async () => {
    const quotes = await listQuotes();
    const open = quotes.filter((q) => q.status === "sent");
    if (open.length === 0) return [];

    const now = Date.now();
    const insights: Insight[] = [];

    for (const quote of open) {
      const ageDays = daysSince(quote.issue_date, now);
      const band = classifyQuoteAge(ageDays);
      if (band === "healthy") continue;

      const customerName = quote.customer?.name ?? "Unknown customer";
      insights.push({
        id: `${QUOTE_AGEING_PROVIDER_ID}:${quote.id}`,
        source: QUOTE_AGEING_PROVIDER_ID,
        module: "Sales",
        kind: band === "stale" ? "risk" : "warning",
        tone: band === "stale" ? "danger" : "warning",
        confidence: computeConfidence(0),
        title: `${quote.quote_no} is ${band} — ${ageDays}d awaiting response`,
        why:
          `Quote ${quote.quote_no} for ${customerName} (${formatInr(quote.total)}) was sent ` +
          `${ageDays} day${ageDays === 1 ? "" : "s"} ago and is still "sent" with no response — ` +
          `beyond the ${band === "stale" ? QUOTE_AGEING_THRESHOLDS.ageingMaxDays : QUOTE_AGEING_THRESHOLDS.healthyMaxDays}-day ` +
          `${band === "stale" ? "stale" : "healthy"} threshold.`,
        action: { label: "Open quote", href: `/quotes/${quote.id}` },
        entity: { type: "quote", id: quote.id, label: quote.quote_no },
        value: quote.total,
        priority: computePriority({
          urgencyDays: ageDays - QUOTE_AGEING_THRESHOLDS.healthyMaxDays,
          valueInr: quote.total,
        }),
        generatedAt: new Date().toISOString(),
      });
    }

    return insights;
  },
};

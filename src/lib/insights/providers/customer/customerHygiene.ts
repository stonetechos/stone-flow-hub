/**
 * CustomerHygieneProvider — Phase G.8 Part 1 refinement.
 *
 * Phase G.5's original version flagged every customer with any missing
 * master-data field (email, phone, GSTIN, address, ...) — one insight per
 * customer, regardless of whether anything was actually blocked. In
 * practice this drowned Executive Intelligence in routine data-entry
 * noise rather than surfacing anything actionable.
 *
 * This version only fires when a missing field is actively blocking a
 * real, open workflow step:
 *  1. A draft quote can't be emailed — customer has no primary_email.
 *  2. A draft invoice can't be finalized as a GST invoice — the
 *     customer's type normally carries a GSTIN and none is on file.
 *  3. A planned dispatch can't proceed — no site address recorded.
 *  4. An unpaid payment-schedule milestone's reminder can't be sent —
 *     the customer has no phone, email, or contact of any kind on file.
 *
 * The generic "customer X has N data gaps" completeness check this
 * provider used to run has been moved, unchanged in substance, to
 * ./customerDataQuality.ts as a future-ready Data Quality report. That
 * module is intentionally NOT registered here or in ./index.ts, so it
 * cannot reach Copilot, DangerNotifications, or the Executive Brief —
 * see that file's header comment for how a later phase can wire it up.
 *
 * Reads: listQuotes(), listInvoices(), listDispatches(), listCustomers(),
 * hub.allCustomerContacts(), listPaymentDashboard() — all existing bulk
 * fetches already used elsewhere in the Insight Framework (quoteAgeing,
 * dispatchRisk, the original hygiene provider, and collectionPriority
 * respectively). No new query shapes are introduced.
 */
import { listQuotes } from "@/lib/quotes/api";
import { listInvoices } from "@/lib/invoices/api";
import { listDispatches } from "@/lib/dispatch/api";
import { listCustomers, type CustomerRow } from "@/lib/customers/api";
import { hub, type CustomerContactRow } from "@/lib/hubs/api";
import { listPaymentDashboard } from "@/lib/customer-payments/schedule";
import { formatInr } from "@/lib/format";
import type { Insight, InsightProvider } from "@/lib/insights/types";
import { daysSince } from "@/lib/insights/shared/dates";
import { computePriority } from "@/lib/insights/shared/priority";
import { CUSTOMER_HYGIENE_THRESHOLDS as THRESHOLDS } from "./thresholds";

export const CUSTOMER_HYGIENE_PROVIDER_ID = "customer.hygiene";

const GSTIN_REQUIRED_TYPES = new Set<string>(THRESHOLDS.gstinRequiredTypes);

function hasContactChannel(customer: CustomerRow, contacts: CustomerContactRow[]): boolean {
  if (customer.primary_phone || customer.primary_email) return true;
  return contacts.some((c) => c.phone || c.email || c.whatsapp);
}

export const CustomerHygieneProvider: InsightProvider = {
  id: CUSTOMER_HYGIENE_PROVIDER_ID,
  label: "Customer hygiene",
  fetch: async () => {
    const [quotes, invoices, dispatches, customers, contacts, unpaidSchedules] = await Promise.all([
      listQuotes(),
      listInvoices(),
      listDispatches(),
      listCustomers(),
      hub.allCustomerContacts(),
      listPaymentDashboard(),
    ]);

    const customersById = new Map<string, CustomerRow>(customers.map((c) => [c.id, c]));
    const contactsByCustomer = new Map<string, CustomerContactRow[]>();
    for (const c of contacts) {
      const list = contactsByCustomer.get(c.customer_id) ?? [];
      list.push(c);
      contactsByCustomer.set(c.customer_id, list);
    }

    const now = new Date().toISOString();
    const nowMs = Date.now();
    const insights: Insight[] = [];

    // 1. Draft quotes that can't be emailed — no address to send them to.
    for (const quote of quotes) {
      if (quote.status !== "draft" || !quote.customer) continue;
      const customer = customersById.get(quote.customer.id);
      if (!customer || customer.primary_email) continue;

      const ageDays = daysSince(quote.created_at, nowMs);
      insights.push({
        id: `${CUSTOMER_HYGIENE_PROVIDER_ID}:quote-email:${quote.id}`,
        source: CUSTOMER_HYGIENE_PROVIDER_ID,
        module: "Customer",
        kind: "risk",
        tone: "danger",
        confidence: 1,
        title: `${quote.quote_no} can't be emailed — customer has no email`,
        why: `${customer.name} (${customer.customer_code}) has no email on file, so draft quote ${quote.quote_no} cannot be sent.`,
        action: { label: "Open quote", href: `/quotes/${quote.id}` },
        entity: { type: "quote", id: quote.id, label: quote.quote_no },
        priority: computePriority({ urgencyDays: ageDays }),
        generatedAt: now,
      });
    }

    // 2. Draft invoices that can't be finalized as a GST invoice — no GSTIN.
    for (const invoice of invoices) {
      if (invoice.status !== "draft" || !invoice.customer) continue;
      const customer = customersById.get(invoice.customer.id);
      if (!customer || !GSTIN_REQUIRED_TYPES.has(customer.customer_type) || customer.gst_number) continue;

      const ageDays = daysSince(invoice.created_at, nowMs);
      insights.push({
        id: `${CUSTOMER_HYGIENE_PROVIDER_ID}:invoice-gst:${invoice.id}`,
        source: CUSTOMER_HYGIENE_PROVIDER_ID,
        module: "Customer",
        kind: "risk",
        tone: "danger",
        confidence: 1,
        title: `${invoice.invoice_no} can't be issued as a GST invoice — GSTIN missing`,
        why: `${customer.name} (${customer.customer_code}) is a "${customer.customer_type}" account with no GSTIN on file, so draft invoice ${invoice.invoice_no} cannot be finalized as a GST invoice.`,
        action: { label: "Open invoice", href: `/invoices/${invoice.id}` },
        entity: { type: "invoice", id: invoice.id, label: invoice.invoice_no },
        priority: computePriority({ urgencyDays: ageDays }),
        generatedAt: now,
      });
    }

    // 3. Planned dispatches that can't proceed — no delivery address.
    for (const d of dispatches) {
      if (d.status !== "planned") continue;
      if (d.site_address && d.site_address.trim() !== "") continue;

      const ageDays = daysSince(d.created_at, nowMs);
      const customerPart = d.customer ? ` for ${d.customer.name}` : "";
      insights.push({
        id: `${CUSTOMER_HYGIENE_PROVIDER_ID}:dispatch-address:${d.id}`,
        source: CUSTOMER_HYGIENE_PROVIDER_ID,
        module: "Customer",
        kind: "risk",
        tone: "danger",
        confidence: 1,
        title: `Dispatch ${d.dispatch_no} can't proceed — delivery address missing`,
        why: `Dispatch ${d.dispatch_no}${customerPart} has no site address recorded, so it cannot be dispatched.`,
        action: { label: "Open dispatch", href: `/dispatch/${d.id}` },
        entity: { type: "dispatch", id: d.id, label: d.dispatch_no },
        priority: computePriority({ urgencyDays: ageDays }),
        generatedAt: now,
      });
    }

    // 4. Unpaid milestones whose reminder can't be sent — no contact at all.
    const unpaidByCustomer = new Map<string, typeof unpaidSchedules>();
    for (const row of unpaidSchedules) {
      if (!row.customer_id) continue;
      const list = unpaidByCustomer.get(row.customer_id) ?? [];
      list.push(row);
      unpaidByCustomer.set(row.customer_id, list);
    }

    for (const [customerId, rows] of unpaidByCustomer) {
      const customer = customersById.get(customerId);
      if (!customer) continue;
      const custContacts = contactsByCustomer.get(customerId) ?? [];
      if (hasContactChannel(customer, custContacts)) continue;

      const mostOverdue = [...rows].sort((a, b) => (a.days_to_due ?? 0) - (b.days_to_due ?? 0))[0];
      const overdueDays = Math.max(0, -(mostOverdue.days_to_due ?? 0));
      const totalOutstanding = rows.reduce((sum, r) => sum + (r.balance_due ?? 0), 0);

      insights.push({
        id: `${CUSTOMER_HYGIENE_PROVIDER_ID}:reminder-contact:${customerId}`,
        source: CUSTOMER_HYGIENE_PROVIDER_ID,
        module: "Customer",
        kind: "risk",
        tone: "danger",
        confidence: 1,
        title: `${customer.name} — payment reminder can't be sent, no contact on file`,
        why:
          `${customer.name} (${customer.customer_code}) has ${rows.length} unpaid milestone${rows.length === 1 ? "" : "s"} ` +
          `totalling ${formatInr(totalOutstanding)} but no phone, email, or contact on file to send a reminder to.`,
        action: { label: "Open customer", href: `/customers/${customerId}` },
        entity: { type: "customer", id: customerId, label: customer.name },
        value: totalOutstanding,
        priority: computePriority({ urgencyDays: overdueDays, valueInr: totalOutstanding }),
        generatedAt: now,
      });
    }

    return insights;
  },
};

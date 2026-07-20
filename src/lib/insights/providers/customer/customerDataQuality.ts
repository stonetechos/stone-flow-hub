/**
 * CustomerDataQualityProvider — future-ready Data Quality category
 * (Phase G.8 Part 1).
 *
 * This is Phase G.5's original CustomerHygieneProvider logic, carried
 * over unchanged in substance: one report entry per customer with at
 * least one master-data gap (missing email, phone, GSTIN, billing
 * address/city/state/pincode, or primary contact), all gaps folded into
 * a single explanation per customer rather than one entry per field.
 *
 * It was split out of customerHygiene.ts because routine data-entry
 * completeness is a Data Quality concern, not an Executive Intelligence
 * one — customerHygiene.ts now only fires when missing data blocks a
 * real, open workflow step (a quote that can't be emailed, an invoice
 * that can't be GST-finalized, a dispatch with no address, a payment
 * reminder with no contact).
 *
 * Deliberately NOT exported from ./index.ts's registration array and
 * NOT called by anything — this module exists so a later phase can power
 * a dedicated "Data Quality" report/dashboard (e.g. a data-hygiene
 * scorecard for ops/admin) without it polluting Copilot or the
 * Executive Brief today. To wire it in later: import
 * `CustomerDataQualityProvider` where needed (e.g. a standalone
 * `useDataQualityReport()` hook, or a future admin screen) — it does not
 * need to go through the Insight Registry at all unless that future
 * surface specifically wants it to.
 */
import { listCustomers } from "@/lib/customers/api";
import { hub, type CustomerContactRow } from "@/lib/hubs/api";
import type { Insight, InsightProvider } from "@/lib/insights/types";
import { computePriority } from "@/lib/insights/shared/priority";
import { CUSTOMER_HYGIENE_THRESHOLDS as THRESHOLDS } from "./thresholds";

export const CUSTOMER_DATA_QUALITY_PROVIDER_ID = "customer.data-quality";

const GSTIN_REQUIRED_TYPES = new Set<string>(THRESHOLDS.gstinRequiredTypes);

export const CustomerDataQualityProvider: InsightProvider = {
  id: CUSTOMER_DATA_QUALITY_PROVIDER_ID,
  label: "Customer data quality",
  fetch: async () => {
    const [customers, contacts] = await Promise.all([listCustomers(), hub.allCustomerContacts()]);

    const contactsByCustomer = new Map<string, CustomerContactRow[]>();
    for (const c of contacts) {
      const list = contactsByCustomer.get(c.customer_id) ?? [];
      list.push(c);
      contactsByCustomer.set(c.customer_id, list);
    }

    const now = new Date().toISOString();
    const insights: Insight[] = [];

    for (const customer of customers) {
      const reasons: string[] = [];

      if (!customer.primary_email) reasons.push("missing email");
      if (!customer.primary_phone) reasons.push("missing phone");

      const customerContacts = contactsByCustomer.get(customer.id) ?? [];
      if (customerContacts.length === 0) {
        reasons.push("no contacts on file");
      } else if (!customerContacts.some((c) => c.is_primary)) {
        reasons.push("no primary contact designated");
      }

      const billingGaps: string[] = [];
      if (!customer.billing_address) billingGaps.push("address");
      if (!customer.city) billingGaps.push("city");
      if (!customer.state) billingGaps.push("state");
      if (!customer.pincode) billingGaps.push("pincode");
      if (billingGaps.length > 0)
        reasons.push(`incomplete billing information (missing ${billingGaps.join(", ")})`);

      if (GSTIN_REQUIRED_TYPES.has(customer.customer_type) && !customer.gst_number) {
        reasons.push(`missing GSTIN (customer type "${customer.customer_type}" normally has one)`);
      }

      if (reasons.length === 0) continue;

      insights.push({
        id: `${CUSTOMER_DATA_QUALITY_PROVIDER_ID}:${customer.id}`,
        source: CUSTOMER_DATA_QUALITY_PROVIDER_ID,
        module: "Customer",
        kind: "action",
        tone: "warning",
        confidence: 1,
        title: `${customer.name} — ${reasons.length} data gap${reasons.length === 1 ? "" : "s"}`,
        why: `${customer.name} (${customer.customer_code}): ${reasons.join("; ")}.`,
        action: { label: "Open customer", href: `/customers/${customer.id}` },
        entity: { type: "customer", id: customer.id, label: customer.name },
        priority: computePriority({ urgencyDays: reasons.length * 3 }),
        generatedAt: now,
      });
    }

    return insights;
  },
};

/**
 * CustomerHygieneProvider — flags customer master-data gaps: missing
 * contact details, no primary contact, incomplete billing information, and
 * missing GSTIN where the customer's type expects one.
 *
 * Reads: `listCustomers()` (existing bulk fetch) and
 * `hub.allCustomerContacts()` (new bulk export added to `lib/hubs/api.ts`
 * this phase — every other `hub.*` contact lookup there is scoped to one
 * customerId; this is the bulk counterpart needed to check every customer
 * at once).
 *
 * One insight per customer with at least one gap — all gaps folded into a
 * single `why` rather than one insight per missing field.
 */
import { listCustomers } from "@/lib/customers/api";
import { hub } from "@/lib/hubs/api";
import type { Insight, InsightProvider } from "@/lib/insights/types";
import { computePriority } from "@/lib/insights/shared/priority";
import { CUSTOMER_HYGIENE_THRESHOLDS as THRESHOLDS } from "./thresholds";

export const CUSTOMER_HYGIENE_PROVIDER_ID = "customer.hygiene";

const GSTIN_REQUIRED_TYPES = new Set<string>(THRESHOLDS.gstinRequiredTypes);

export const CustomerHygieneProvider: InsightProvider = {
  id: CUSTOMER_HYGIENE_PROVIDER_ID,
  label: "Customer hygiene",
  fetch: async () => {
    const [customers, contacts] = await Promise.all([listCustomers(), hub.allCustomerContacts()]);

    const contactsByCustomer = new Map<string, typeof contacts>();
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
      if (billingGaps.length > 0) reasons.push(`incomplete billing information (missing ${billingGaps.join(", ")})`);

      if (GSTIN_REQUIRED_TYPES.has(customer.customer_type) && !customer.gst_number) {
        reasons.push(`missing GSTIN (customer type "${customer.customer_type}" normally has one)`);
      }

      if (reasons.length === 0) continue;

      insights.push({
        id: `${CUSTOMER_HYGIENE_PROVIDER_ID}:${customer.id}`,
        source: CUSTOMER_HYGIENE_PROVIDER_ID,
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

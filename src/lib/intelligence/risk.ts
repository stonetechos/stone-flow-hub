/**
 * Stone Tech Intelligence — Risk detection.
 *
 * Phase G.8.8 (Final Intelligence Consolidation) trimmed this file. It
 * used to compute 7 rule types; 5 of them (inactive_enquiry,
 * quotation_stale, payment_overdue, dispatch_overdue, installation_overdue)
 * independently recomputed facts that real Insight Providers already
 * compute (ColdEnquiryProvider, QuoteAgeingProvider,
 * CollectionPriorityProvider/PaymentScheduleAdherenceProvider,
 * DispatchRiskProvider, InstallationDelayProvider respectively) — genuine
 * duplicate business logic, on different thresholds, feeding 3 dashboards
 * that never reconciled with what Copilot/customer pages showed. Those 5
 * rules are retired; the dashboards that used them now consume the real
 * providers directly via `getOperationalRiskCounts()`
 * (`lib/insights/shared/operationalRiskCounts.ts`).
 *
 * What's left here — `no_salesperson` and `vendor_delay` — are the two
 * facts that had no Insight Provider equivalent (a genuine coverage gap,
 * not a duplicate). They were wrapped as real providers in G.8.7
 * (EnquiryOwnershipProvider, VendorDeliveryRiskProvider), which both call
 * this function for the underlying query rather than re-querying — this
 * file remains the single source of truth for these two facts, just no
 * longer for the other five.
 */
import { supabase } from "@/integrations/supabase/client";
import { STAGE_TO_UMBRELLA } from "@/lib/constants";
import type { LeadStage } from "@/lib/types";

export type RiskKey = "vendor_delay" | "no_salesperson";

export interface RiskItem {
  key: RiskKey;
  severity: "low" | "medium" | "high";
  entity: "enquiry" | "po" | "rfq";
  entityId: string;
  label: string;
  reason: string;
  daysOverdue: number;
  href: string;
}

export interface RiskSummary {
  items: RiskItem[];
  counts: Record<RiskKey, number>;
}

const now = () => Date.now();
const days = (iso: string | null) =>
  iso ? Math.max(0, Math.floor((now() - new Date(iso).getTime()) / 86_400_000)) : 0;

export async function getRiskSummary(): Promise<RiskSummary> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const from = (t: string) => (supabase.from as unknown as (n: string) => any)(t);

  const [enqRes, poRes, rfqRes] = await Promise.all([
    from("enquiries").select("id,enquiry_no,stage,assigned_to,updated_at,created_at").limit(2000),
    from("purchase_orders").select("id,po_no,status,expected_date").limit(2000),
    from("rfqs").select("id,rfq_no,status,due_date").limit(2000),
  ]);

  const items: RiskItem[] = [];
  const counts = {} as Record<RiskKey, number>;
  const bump = (k: RiskKey) => (counts[k] = (counts[k] ?? 0) + 1);
  const add = (r: RiskItem) => {
    items.push(r);
    bump(r.key);
  };

  for (const e of (enqRes.data ?? []) as Array<{
    id: string;
    enquiry_no: string;
    stage: LeadStage;
    assigned_to: string | null;
    updated_at: string;
    created_at: string;
  }>) {
    const umb = STAGE_TO_UMBRELLA[e.stage];
    if (umb === "lost" || umb === "cancelled" || umb === "completed") continue;
    if (!e.assigned_to) {
      const inactive = days(e.updated_at ?? e.created_at);
      add({
        key: "no_salesperson",
        severity: "high",
        entity: "enquiry",
        entityId: e.id,
        label: e.enquiry_no,
        reason: "No salesperson assigned",
        daysOverdue: inactive,
        href: `/enquiries/${e.id}`,
      });
    }
  }

  for (const p of (poRes.data ?? []) as Array<{
    id: string;
    po_no: string;
    status: string;
    expected_date: string | null;
  }>) {
    if (["received", "closed", "cancelled"].includes(String(p.status))) continue;
    if (p.expected_date && new Date(p.expected_date).getTime() < now()) {
      const od = days(p.expected_date);
      add({
        key: "vendor_delay",
        severity: od > 14 ? "high" : "medium",
        entity: "po",
        entityId: p.id,
        label: p.po_no,
        reason: `Vendor delivery late ${od} days`,
        daysOverdue: od,
        href: `/purchase-orders/${p.id}`,
      });
    }
  }

  for (const r of (rfqRes.data ?? []) as Array<{
    id: string;
    rfq_no: string;
    status: string;
    due_date: string | null;
  }>) {
    if (["closed", "awarded", "cancelled"].includes(String(r.status))) continue;
    if (r.due_date && new Date(r.due_date).getTime() < now()) {
      const od = days(r.due_date);
      add({
        key: "vendor_delay",
        severity: "medium",
        entity: "rfq",
        entityId: r.id,
        label: r.rfq_no,
        reason: `RFQ past due ${od} days`,
        daysOverdue: od,
        href: `/rfqs/${r.id}`,
      });
    }
  }

  items.sort((a, b) =>
    a.severity === b.severity
      ? b.daysOverdue - a.daysOverdue
      : a.severity === "high"
        ? -1
        : b.severity === "high"
          ? 1
          : a.severity === "medium"
            ? -1
            : 1,
  );
  return { items, counts };
}

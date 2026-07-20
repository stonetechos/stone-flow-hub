/**
 * Stone Tech Intelligence — Business Health Dashboard aggregator.
 *
 * Computes composite 0-100 sub-scores across Sales, Cash Flow, Leads,
 * Operations, Vendors and Customer Satisfaction. Every sub-score is a
 * simple rule-based rollup over data already collected by earlier phases.
 *
 * Phase G.8.8: the risk-derived counts (overdue payments, inactive
 * enquiries, dispatch/installation delays, vendor delays) now come from
 * `getOperationalRiskCounts()` — the real Insight Providers — instead of
 * `lib/intelligence/risk.ts`'s retired duplicate rules. The rest of this
 * file (quote conversion, revenue trend, installs-completed ratio, etc.)
 * is genuine composite scoring over raw data, not duplicated anywhere
 * else, and is unchanged.
 */
import { supabase } from "@/integrations/supabase/client";
import { getOperationalRiskCounts } from "@/lib/insights/shared/operationalRiskCounts";

export interface HealthMetric {
  key: string;
  label: string;
  score: number;
  trend?: "up" | "flat" | "down";
  note: string;
}

export interface BusinessHealth {
  overall: number;
  metrics: HealthMetric[];
  pendingRisks: number;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export async function getBusinessHealth(): Promise<BusinessHealth> {
  const risk = await getOperationalRiskCounts();

  const [enqRes, quoteRes, soRes, invRes, receiptRes, dispRes, instRes, poRes] = await Promise.all([
    supabase.from("enquiries").select("id,stage,updated_at,assigned_to,created_at").limit(3000),
    supabase.from("quotes").select("id,status,total,created_at").limit(3000),
    supabase.from("sales_orders").select("id,status,created_at").limit(3000),
    supabase.from("invoices").select("id,status,due_date,balance_due,total,created_at").limit(3000),
    supabase.from("receipts").select("id,net_amount,received_at,created_at").limit(3000),
    supabase.from("dispatches").select("id,status,dispatch_date").limit(3000),
    supabase.from("installations").select("id,status,planned_end_date,actual_end_date").limit(3000),
    supabase.from("purchase_orders").select("id,status,expected_date").limit(3000),
  ]);

  const enqs = enqRes.data ?? [];
  const quotes = quoteRes.data ?? [];
  const sos = soRes.data ?? [];
  const invoices = invRes.data ?? [];
  const receipts = receiptRes.data ?? [];
  const dispatches = dispRes.data ?? [];
  const installs = instRes.data ?? [];
  const pos = poRes.data ?? [];

  // Sales health: conversion + funnel activity
  const sent = quotes.filter((q) => q.status === "sent" || q.status === "converted").length;
  const converted = quotes.filter((q) => q.status === "converted").length;
  const salesConv = sent === 0 ? 40 : (converted / sent) * 100;
  const salesActivity = Math.min(100, (sos.length / Math.max(1, enqs.length)) * 400);
  const sales: HealthMetric = {
    key: "sales",
    label: "Sales",
    score: clamp(salesConv * 0.6 + salesActivity * 0.4),
    note: `${converted}/${sent} quotes converted`,
  };

  // Cash flow health: paid vs outstanding + overdue penalty
  const totalInv = invoices.reduce((a, i) => a + Number(i.total ?? 0), 0);
  const outstanding = invoices.reduce((a, i) => a + Number(i.balance_due ?? 0), 0);
  const paidRatio = totalInv === 0 ? 0.6 : Math.max(0, 1 - outstanding / totalInv);
  const overdueCount = risk.paymentOverdue;
  const cash: HealthMetric = {
    key: "cash",
    label: "Cash Flow",
    score: clamp(paidRatio * 100 - Math.min(40, overdueCount * 4)),
    note: `₹${Math.round(outstanding).toLocaleString("en-IN")} outstanding · ${overdueCount} overdue`,
  };

  // Lead health: assigned/inactive
  const active = enqs.filter(
    (e) => !["completed", "lost", "cancelled"].includes(String(e.stage)),
  ).length;
  const unassigned = enqs.filter(
    (e) => !e.assigned_to && !["completed", "lost", "cancelled"].includes(String(e.stage)),
  ).length;
  const inactivePenalty = Math.min(50, risk.inactiveEnquiry * 2);
  const unassignedPenalty = Math.min(30, unassigned * 3);
  const leads: HealthMetric = {
    key: "leads",
    label: "Lead Health",
    score: clamp(100 - inactivePenalty - unassignedPenalty),
    note: `${active} active · ${unassigned} unassigned`,
  };

  // Operations: dispatch + installation on time
  const dispOverdue = risk.dispatchOverdue;
  const instOverdue = risk.installationOverdue;
  const onTime = 100 - Math.min(60, dispOverdue * 6) - Math.min(40, instOverdue * 5);
  const ops: HealthMetric = {
    key: "ops",
    label: "Operations",
    score: clamp(onTime),
    note: `${dispOverdue} dispatches · ${instOverdue} installs overdue`,
  };

  // Vendor health: PO delivery on time
  const openPO = pos.filter(
    (p) => !["received", "closed", "cancelled"].includes(String(p.status)),
  ).length;
  const vendorDelays = risk.vendorDelay;
  const vendor: HealthMetric = {
    key: "vendor",
    label: "Vendors",
    score: clamp(100 - Math.min(70, vendorDelays * 5)),
    note: `${openPO} open POs · ${vendorDelays} delays`,
  };

  // Customer satisfaction proxy: installations completed vs overdue
  const completedInstalls = installs.filter(
    (i) => i.status === "completed" || i.actual_end_date,
  ).length;
  const totalInstalls = installs.length;
  const csScore =
    totalInstalls === 0
      ? 70
      : (completedInstalls / totalInstalls) * 100 - Math.min(30, instOverdue * 4);
  const cs: HealthMetric = {
    key: "csat",
    label: "Customer Satisfaction",
    score: clamp(csScore),
    note: `${completedInstalls}/${totalInstalls} installs completed`,
  };

  // Revenue + conversion trend (last 30 vs previous 30 days)
  const now = Date.now();
  const in30 = (iso: string | null) => iso && new Date(iso).getTime() > now - 30 * 86_400_000;
  const inPrev30 = (iso: string | null) =>
    iso &&
    new Date(iso).getTime() > now - 60 * 86_400_000 &&
    new Date(iso).getTime() <= now - 30 * 86_400_000;
  const rev30 = receipts
    .filter((r) => in30(r.received_at ?? r.created_at))
    .reduce((a, r) => a + Number(r.net_amount ?? 0), 0);
  const revPrev30 = receipts
    .filter((r) => inPrev30(r.received_at ?? r.created_at))
    .reduce((a, r) => a + Number(r.net_amount ?? 0), 0);
  const revenue: HealthMetric = {
    key: "revenue_trend",
    label: "Revenue Trend (30d)",
    score: clamp(50 + (revPrev30 === 0 ? 20 : ((rev30 - revPrev30) / revPrev30) * 50)),
    trend: rev30 > revPrev30 * 1.05 ? "up" : rev30 < revPrev30 * 0.95 ? "down" : "flat",
    note: `₹${Math.round(rev30).toLocaleString("en-IN")} vs ₹${Math.round(revPrev30).toLocaleString("en-IN")}`,
  };
  const convThis = quotes.filter((q) => in30(q.created_at) && q.status === "converted").length;
  const convPrev = quotes.filter((q) => inPrev30(q.created_at) && q.status === "converted").length;
  const conversion: HealthMetric = {
    key: "conversion_trend",
    label: "Conversion Trend (30d)",
    score: clamp(50 + (convPrev === 0 ? 20 : ((convThis - convPrev) / Math.max(1, convPrev)) * 50)),
    trend: convThis > convPrev ? "up" : convThis < convPrev ? "down" : "flat",
    note: `${convThis} vs ${convPrev} conversions`,
  };

  const metrics = [sales, cash, leads, ops, vendor, cs, revenue, conversion];
  const weighted =
    sales.score * 0.2 +
    cash.score * 0.2 +
    leads.score * 0.15 +
    ops.score * 0.15 +
    vendor.score * 0.1 +
    cs.score * 0.1 +
    revenue.score * 0.05 +
    conversion.score * 0.05;
  return { overall: clamp(weighted), metrics, pendingRisks: risk.total };
}

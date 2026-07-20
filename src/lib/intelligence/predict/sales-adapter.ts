/**
 * Sales Predictive Intelligence adapter.
 *
 * Composes the four pure producers in `./sales.ts` against live data with a
 * strict budget of four Supabase reads for the whole sales sweep:
 *
 *   1. quotes  (open: draft/sent, limit 200)
 *   2. enquiries (active stages, limit 200)
 *   3. followups (open + latest per enquiry, limit 500)
 *   4. sales_orders (last 12 months, limit 1000)
 *
 * Every derived baseline (customer win-rate, order cadence, stage age) is
 * computed in-memory from those four result sets. No cron, no writes.
 */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import {
  predictEnquiryCold,
  predictQuoteConversion,
  predictRepeatOrderThisMonth,
  predictStopBuying,
  type CustomerOrderCadenceInput,
} from "./sales";
import type { Prediction } from "./types";
import { daysBetween } from "./baselines";

export interface SalesPredictionBundle {
  quoteConversion: Prediction[];
  enquiriesCold: Prediction[];
  repeatOrder: Prediction[];
  stopBuying: Prediction[];
}

const EMPTY: SalesPredictionBundle = {
  quoteConversion: [],
  enquiriesCold: [],
  repeatOrder: [],
  stopBuying: [],
};

export async function getSalesPredictions(): Promise<SalesPredictionBundle> {
  const twelveMonthsAgo = new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10);

  const [quotesR, enquiriesR, followupsR, ordersR] = await Promise.all([
    supabase
      .from("quotes")
      .select("id,quote_no,status,issue_date,valid_until,total,customer_id,enquiry_id,updated_at")
      .in("status", ["draft", "sent", "accepted", "converted", "rejected", "expired"])
      .order("issue_date", { ascending: false })
      .limit(400),
    supabase
      .from("enquiries")
      .select("id,enquiry_no,stage,updated_at,budget_inr,customer_id")
      .not("stage", "in", "(completed,cancelled,lost,after_sales,production,dispatch)")
      .order("updated_at", { ascending: false })
      .limit(200),
    supabase
      .from("followups")
      .select("id,enquiry_id,scheduled_at,status,completed_at,updated_at")
      .order("scheduled_at", { ascending: true })
      .limit(500),
    supabase
      .from("sales_orders")
      .select("id,customer_id,order_date,status")
      .gte("order_date", twelveMonthsAgo)
      .order("order_date", { ascending: false })
      .limit(1000),
  ]);
  for (const r of [quotesR, enquiriesR, followupsR, ordersR]) {
    if (r.error) throw new AppError(mapDbError(r.error));
  }

  const quotes = quotesR.data ?? [];
  const enquiries = enquiriesR.data ?? [];
  const followups = followupsR.data ?? [];
  const orders = ordersR.data ?? [];

  // Follow-up derived features (per enquiry).
  const nextByEnquiry = new Map<string, string>();
  const lastByEnquiry = new Map<string, string>();
  for (const f of followups) {
    if (!f.enquiry_id) continue;
    if (f.status === "pending" && !nextByEnquiry.has(f.enquiry_id)) {
      nextByEnquiry.set(f.enquiry_id, f.scheduled_at);
    }
    const seenAt = f.completed_at ?? f.updated_at ?? null;
    if (seenAt) {
      const prev = lastByEnquiry.get(f.enquiry_id);
      if (!prev || seenAt > prev) lastByEnquiry.set(f.enquiry_id, seenAt);
    }
  }

  const enquiriesById = new Map(enquiries.map((e) => [e.id, e]));

  // Quote-side lookups.
  const quotesByCustomer = new Map<string, typeof quotes>();
  for (const q of quotes) {
    if (!q.customer_id) continue;
    const arr = quotesByCustomer.get(q.customer_id) ?? [];
    arr.push(q);
    quotesByCustomer.set(q.customer_id, arr);
  }

  const quoteConversion: Prediction[] = [];
  for (const q of quotes) {
    if (!["draft", "sent"].includes(q.status ?? "")) continue;
    const history = (q.customer_id ? (quotesByCustomer.get(q.customer_id) ?? []) : []).filter(
      (h) => h.id !== q.id,
    );
    const enq = q.enquiry_id ? (enquiriesById.get(q.enquiry_id) ?? null) : null;
    const nextFup = q.enquiry_id ? (nextByEnquiry.get(q.enquiry_id) ?? null) : null;
    const pred = predictQuoteConversion({
      quote: {
        id: q.id,
        quote_no: q.quote_no ?? null,
        status: q.status ?? "",
        issue_date: q.issue_date ?? null,
        valid_until: q.valid_until ?? null,
        total: q.total ?? null,
        customer_id: q.customer_id ?? null,
        enquiry_id: q.enquiry_id ?? null,
      },
      customerQuoteHistory: history.map((h) => ({ id: h.id, status: h.status ?? "" })),
      enquiryStage: enq?.stage ?? null,
      hasScheduledFollowup: Boolean(nextFup),
      lastActivityAt: q.updated_at ?? q.issue_date ?? null,
    });
    if (pred) quoteConversion.push(pred);
  }

  // Stage-median baseline per stage (from enquiries currently listed).
  const stageAges = new Map<string, number[]>();
  for (const e of enquiries) {
    const arr = stageAges.get(e.stage) ?? [];
    arr.push(daysBetween(e.updated_at));
    stageAges.set(e.stage, arr);
  }
  const stageMedian = new Map<string, number>();
  for (const [stage, arr] of stageAges) {
    if (arr.length < 3) continue;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    stageMedian.set(stage, sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2);
  }

  const enquiriesCold: Prediction[] = [];
  for (const e of enquiries) {
    const last = lastByEnquiry.get(e.id) ?? null;
    const dsl = last ? daysBetween(last) : null;
    const pred = predictEnquiryCold({
      enquiry: {
        id: e.id,
        enquiry_no: e.enquiry_no ?? null,
        stage: e.stage,
        updated_at: e.updated_at,
        budget_inr: e.budget_inr ?? null,
        customer_id: e.customer_id ?? null,
      },
      daysSinceLastFollowup: dsl,
      nextFollowupAt: nextByEnquiry.get(e.id) ?? null,
      stageMedianDays: stageMedian.get(e.stage) ?? null,
    });
    if (pred) enquiriesCold.push(pred);
  }

  // Group orders per customer.
  const byCustomer = new Map<string, typeof orders>();
  for (const o of orders) {
    if (!o.customer_id) continue;
    const arr = byCustomer.get(o.customer_id) ?? [];
    arr.push(o);
    byCustomer.set(o.customer_id, arr);
  }

  const repeatOrder: Prediction[] = [];
  const stopBuying: Prediction[] = [];
  for (const [customerId, list] of byCustomer) {
    const input: CustomerOrderCadenceInput = {
      customer: { id: customerId, name: customerId }, // adapter caller can enrich name later
      orders: list.map((o) => ({
        id: o.id,
        order_date: o.order_date ?? "",
        status: o.status ?? "",
      })),
    };
    const r = predictRepeatOrderThisMonth(input);
    if (r) repeatOrder.push(r);
    const s = predictStopBuying(input);
    if (s) stopBuying.push(s);
  }

  return { quoteConversion, enquiriesCold, repeatOrder, stopBuying };
}

export const _EMPTY_SALES_BUNDLE = EMPTY;

/**
 * Stone Tech Intelligence — enquiry context loader.
 *
 * Read-only helpers that turn an enquiry (and its related project) into the
 * `ActionInputs` and `ScoreInputs` bundles consumed by the rule engines.
 * Reuses existing tables; no new writes and no schema changes.
 */
import { supabase } from "@/integrations/supabase/client";
import { daysSince } from "@/lib/lead-stage/health";
import { getEnquirySignal } from "@/lib/lead-stage/signals";
import { computeNextBestActions, type ActionInputs, type NextBestAction } from "./actions";
import { computeLeadScore, type ScoreBreakdown, type ScoreInputs } from "./score";
import type { LeadStage } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export interface EnquiryIntelligence {
  actions: NextBestAction[];
  topAction: NextBestAction | null;
  score: ScoreBreakdown;
  inputs: ActionInputs;
}

export interface EnquiryContext {
  id: string;
  stage: LeadStage;
  projectId: string | null;
  assignedTo: string | null;
  budgetInr: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

async function loadRelatedFlags(ctx: EnquiryContext) {
  const from = (t: string) => (supabase.from as unknown as (n: string) => Any)(t);
  const projectId = ctx.projectId;
  const [
    quoteRes,
    soRes,
    invRes,
    receiptRes,
    svRes,
    rfqRes,
    vqRes,
    poRes,
    prodRes,
    dispRes,
    instRes,
    fupCountRes,
  ] = await Promise.all([
    from("quotes").select("id,status,total").eq("enquiry_id", ctx.id),
    projectId
      ? from("sales_orders").select("id,status").eq("project_id", projectId)
      : Promise.resolve({ data: [] }),
    projectId
      ? from("invoices").select("id,status,due_date,balance_due").eq("project_id", projectId)
      : Promise.resolve({ data: [] }),
    projectId
      ? from("receipts").select("id,net_amount").eq("project_id", projectId)
      : Promise.resolve({ data: [] }),
    projectId
      ? from("site_visits").select("id,status,conducted_at").eq("project_id", projectId)
      : Promise.resolve({ data: [] }),
    from("rfqs").select("id,status").eq("enquiry_id", ctx.id),
    from("vendor_quotes")
      .select("id,status,rfq:rfqs!inner(enquiry_id)")
      .eq("rfq.enquiry_id", ctx.id),
    projectId
      ? from("purchase_orders").select("id,status").eq("project_id", projectId)
      : Promise.resolve({ data: [] }),
    projectId
      ? from("production_orders").select("id,status").eq("project_id", projectId)
      : Promise.resolve({ data: [] }),
    projectId
      ? from("dispatches").select("id,status,dispatch_date").eq("project_id", projectId)
      : Promise.resolve({ data: [] }),
    projectId
      ? from("installations").select("id,status,actual_end_date").eq("project_id", projectId)
      : Promise.resolve({ data: [] }),
    supabase
      .from("followups")
      .select("id", { count: "exact", head: true })
      .eq("enquiry_id", ctx.id)
      .gte("created_at", new Date(Date.now() - 30 * 86_400_000).toISOString()),
  ]);

  const quotes = (quoteRes.data ?? []) as Array<{ status: string }>;
  const invoices = (invRes.data ?? []) as Array<{
    status: string;
    due_date: string | null;
    balance_due: number | null;
  }>;
  const receipts = (receiptRes.data ?? []) as Array<{ net_amount: number | null }>;
  const siteVisits = (svRes.data ?? []) as Array<{ status: string; conducted_at: string | null }>;
  const vqs = (vqRes.data ?? []) as Array<{ status: string }>;
  const prods = (prodRes.data ?? []) as Array<{ status: string }>;
  const dispatches = (dispRes.data ?? []) as Array<{
    status: string;
    dispatch_date: string | null;
  }>;
  const installs = (instRes.data ?? []) as Array<{
    status: string;
    actual_end_date: string | null;
  }>;

  const now = Date.now();
  const overdueInv = invoices
    .filter(
      (i) =>
        i.status !== "paid" &&
        (i.balance_due ?? 0) > 0 &&
        i.due_date &&
        new Date(i.due_date).getTime() < now,
    )
    .map((i) => Math.max(0, Math.floor((now - new Date(i.due_date!).getTime()) / 86_400_000)));
  const invoiceDaysOverdue = overdueInv.length ? Math.max(...overdueInv) : 0;

  return {
    hasPendingQuote: quotes.some((q) => q.status === "sent" || q.status === "draft"),
    hasSalesOrder: (soRes.data ?? []).length > 0,
    hasInvoice: invoices.length > 0,
    hasAdvancePayment: receipts.reduce((a, r) => a + Number(r.net_amount ?? 0), 0) > 0,
    hasFullPayment: invoices.length > 0 && invoices.every((i) => (i.balance_due ?? 0) === 0),
    hasSiteVisitCompleted: siteVisits.some((s) => s.status === "completed" || !!s.conducted_at),
    hasSampleSent: false, // no dedicated table; treated as unknown
    hasRfq: (rfqRes.data ?? []).length > 0,
    hasApprovedVendor:
      vqs.some((v) => v.status === "approved" || v.status === "accepted") ||
      (poRes.data ?? []).length > 0,
    hasProductionStarted: prods.some((p) =>
      ["in_progress", "completed", "started"].includes(String(p.status)),
    ),
    hasDispatchScheduled: dispatches.length > 0,
    hasInstallationScheduled: installs.length > 0,
    hasInstallationCompleted: installs.some((i) => i.status === "completed" || !!i.actual_end_date),
    hasReview: false,
    invoiceDaysOverdue,
    followupCount30d: fupCountRes.count ?? 0,
  };
}

export async function getEnquiryIntelligence(ctx: EnquiryContext): Promise<EnquiryIntelligence> {
  const signal = await getEnquirySignal(ctx.id, ctx.stage, ctx.updatedAt ?? ctx.createdAt);
  const flags = await loadRelatedFlags(ctx);

  const daysInStage = daysSince(signal.stage_entered_at ?? ctx.updatedAt ?? ctx.createdAt);
  const daysSinceLastFollowup = signal.last_followup_at ? daysSince(signal.last_followup_at) : null;
  const followupOverdue =
    !!signal.next_followup && new Date(signal.next_followup.scheduled_at).getTime() < Date.now();

  const inputs: ActionInputs = {
    enquiryId: ctx.id,
    stage: ctx.stage,
    projectId: ctx.projectId,
    assignedTo: ctx.assignedTo,
    daysInStage,
    daysSinceLastFollowup,
    followupOverdue,
    ...flags,
  };
  const actions = computeNextBestActions(inputs);

  const scoreInputs: ScoreInputs = {
    stage: ctx.stage,
    daysInStage,
    daysSinceLastFollowup,
    followupOverdue,
    budgetInr: ctx.budgetInr,
    hasQuoteSent: flags.hasPendingQuote,
    hasSiteVisitCompleted: flags.hasSiteVisitCompleted,
    hasSampleSent: flags.hasSampleSent,
    hasAdvancePayment: flags.hasAdvancePayment,
    daysSinceLastActivity: daysSinceLastFollowup,
    followupCount30d: flags.followupCount30d,
  };
  const score = computeLeadScore(scoreInputs);
  return { actions, topAction: actions[0] ?? null, score, inputs };
}

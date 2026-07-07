/**
 * AI Procurement Health — analyses live KPIs + vendor performance and returns
 * ranked recommendations with explanations. Runs on the server with the shared
 * Lovable AI Gateway (LOVABLE_API_KEY on the server).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({}).default({});

export type ProcurementHealthDimension =
  | "vendor_reliability"
  | "material_quality"
  | "price_stability"
  | "delay_prediction"
  | "cash_flow"
  | "project_risk"
  | "payment_priority"
  | "procurement_priority";

export type ProcurementHealthFinding = {
  dimension: ProcurementHealthDimension;
  headline: string;
  detail: string;
  severity: "info" | "warn" | "risk";
  actions: string[];
};

export type ProcurementHealthReport = {
  overall_score: number;
  summary: string;
  findings: ProcurementHealthFinding[];
  generated_at: string;
};

export const generateProcurementHealth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ context }): Promise<ProcurementHealthReport> => {
    const { supabase } = context;
    const [{ data: kpi }, { data: vendors }, { data: overduePos }, { data: pendingGrns }] =
      await Promise.all([
        supabase.from("procurement_kpis" as never).select("*").maybeSingle(),
        supabase
          .from("vendor_performance_cache" as never)
          .select("*")
          .order("last_calculated_at", { ascending: false })
          .limit(15),
        supabase
          .from("purchase_orders")
          .select("id,po_no,expected_date,vendor_id,delivery_risk")
          .lt("expected_date", new Date().toISOString().slice(0, 10))
          .not("status", "in", "(received,cancelled)")
          .limit(25),
        supabase
          .from("grns" as never)
          .select("id,grn_no,overall_acceptance,received_date")
          .eq("overall_acceptance", "pending")
          .order("received_date", { ascending: false })
          .limit(25),
      ]);

    const facts = {
      kpi: kpi ?? {},
      vendors: vendors ?? [],
      overdue_purchase_orders: overduePos ?? [],
      pending_inspections: pendingGrns ?? [],
    };

    const { chatJson } = await import("@/lib/ai/gateway.server");
    const system = [
      "You are the Stone Tech OS Procurement Health analyst.",
      "Analyse the raw facts and return a JSON report grading procurement health across these dimensions:",
      "vendor_reliability, material_quality, price_stability, delay_prediction, cash_flow, project_risk, payment_priority, procurement_priority.",
      "Every finding MUST include a specific, evidence-based explanation citing numbers or vendor names from the facts.",
      "Never invent data that is not present. If a dimension has insufficient data, mark severity 'info' and explain what is missing.",
      "Use INR (₹) and metric units.",
    ].join("\n");
    const prompt = `FACTS:\n${JSON.stringify(facts, null, 2)}\n\nReturn JSON matching this TypeScript type:
{
  "overall_score": number,           // 0-100
  "summary": string,                 // 2-3 sentence executive brief
  "findings": Array<{
    "dimension": "vendor_reliability" | "material_quality" | "price_stability" | "delay_prediction" | "cash_flow" | "project_risk" | "payment_priority" | "procurement_priority",
    "headline": string,
    "detail": string,
    "severity": "info" | "warn" | "risk",
    "actions": string[]              // 1-3 concrete next steps
  }>
}`;

    const result = await chatJson<Omit<ProcurementHealthReport, "generated_at">>(
      [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      { temperature: 0.2 },
    );
    return { ...result, generated_at: new Date().toISOString() };
  });

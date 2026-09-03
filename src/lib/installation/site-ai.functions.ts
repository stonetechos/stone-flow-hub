/** AI Site Assistant — analyses installation delay, labour, material, satisfaction. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireStaff } from "@/lib/ai/require-staff";

const input = z.object({ installation_id: z.string().uuid() });

type Snapshot = {
  installation_no: string | null;
  status: string | null;
  progress_pct: number;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  reports_count: number;
  recent_labour: Array<number | null>;
  recent_progress: Array<number | null>;
  recent_shortages: string[];
  material_totals: {
    dispatched: number;
    received: number;
    installed: number;
    damaged: number;
    returned: number;
  };
  customer_rating: number | null;
  customer_remarks: string | null;
};

type AiResult = {
  scores?: Record<string, number>;
  summary?: string;
  recommendations?: Array<{ category: string; action: string; explanation: string }>;
};

type Row = Record<string, unknown>;
const s = (v: unknown): string | null => (v == null ? null : String(v));
const n = (v: unknown): number => (v == null ? 0 : Number(v));
const nOrNull = (v: unknown): number | null => (v == null ? null : Number(v));

export const analyzeInstallationSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => input.parse(d))
  .handler(async ({ data, context }): Promise<{ snapshot: Snapshot; ai: AiResult }> => {
    await requireStaff(context);
    const { chat } = await import("@/lib/ai/gateway.server");
    const { supabase } = context;

    const [inst, progress, materials, signoff] = await Promise.all([
      supabase.from("installations").select("*").eq("id", data.installation_id).maybeSingle(),
      supabase
        .from("installation_progress")
        .select("*")
        .eq("installation_id", data.installation_id)
        .order("report_date", { ascending: false })
        .limit(30),
      supabase
        .from("installation_materials")
        .select("*")
        .eq("installation_id", data.installation_id),
      supabase
        .from("installation_signoffs")
        .select("*")
        .eq("installation_id", data.installation_id)
        .maybeSingle(),
    ]);

    const i = (inst.data ?? null) as Row | null;
    if (!i) throw new Error("installation not found");
    const reports = (progress.data ?? []) as Row[];
    const mats = (materials.data ?? []) as Row[];
    const sign = (signoff.data ?? null) as Row | null;

    type Totals = {
      dispatched: number;
      received: number;
      installed: number;
      damaged: number;
      returned: number;
    };
    const totals: Totals = mats.reduce<Totals>(
      (acc, m) => ({
        dispatched: acc.dispatched + n(m.qty_dispatched),
        received: acc.received + n(m.qty_received),
        installed: acc.installed + n(m.qty_installed),
        damaged: acc.damaged + n(m.qty_damaged),
        returned: acc.returned + n(m.qty_returned),
      }),
      { dispatched: 0, received: 0, installed: 0, damaged: 0, returned: 0 },
    );

    const snapshot: Snapshot = {
      installation_no: s(i.installation_no),
      status: s(i.status),
      progress_pct: n(i.progress_pct),
      planned_start_date: s(i.planned_start_date),
      planned_end_date: s(i.planned_end_date),
      actual_start_date: s(i.actual_start_date),
      actual_end_date: s(i.actual_end_date),
      reports_count: reports.length,
      recent_labour: reports.slice(0, 7).map((r) => nOrNull(r.labour_present)),
      recent_progress: reports.slice(0, 7).map((r) => nOrNull(r.progress_pct)),
      recent_shortages: reports
        .slice(0, 7)
        .map((r) => s(r.material_shortage))
        .filter((x): x is string => Boolean(x)),
      material_totals: totals,
      customer_rating: nOrNull(sign?.customer_rating),
      customer_remarks: s(sign?.remarks ?? null),
    };

    const system = [
      "You are the STOS Installation Site Assistant.",
      "Analyse the installation site health across FIVE dimensions and return a JSON object.",
      "Dimensions: delay_risk, labour_productivity, material_consumption, installation_progress, customer_satisfaction.",
      "For each: score 0-100, one-line reasoning grounded in the numbers you were given.",
      "Then produce up to 4 recommendations. Each: category (manpower | material | schedule | quality), action (imperative), explanation (why, referencing the data).",
      'Return ONLY strict JSON: {"scores":{...},"summary":"...","recommendations":[{"category":"","action":"","explanation":""}]}.',
    ].join("\n");

    const reply = await chat(
      [
        { role: "system", content: system },
        { role: "user", content: `Installation snapshot:\n${JSON.stringify(snapshot, null, 2)}` },
      ],
      { temperature: 0.2 },
    );

    let parsed: AiResult;
    try {
      const match = reply.match(/\{[\s\S]*\}$/);
      parsed = JSON.parse(match ? match[0] : reply) as AiResult;
    } catch {
      parsed = { summary: reply, scores: {}, recommendations: [] };
    }
    return { snapshot, ai: parsed };
  });

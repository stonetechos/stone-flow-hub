/** AI Site Assistant — analyses installation delay, labour, material, satisfaction. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const input = z.object({ installation_id: z.string().uuid() });

export const analyzeInstallationSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => input.parse(d))
  .handler(async ({ data, context }) => {
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

    const i = inst.data as Record<string, unknown> | null;
    if (!i) throw new Error("installation not found");
    const reports = (progress.data ?? []) as Array<Record<string, unknown>>;
    const mats = (materials.data ?? []) as Array<Record<string, number | string | null>>;
    const s = signoff.data as Record<string, unknown> | null;

    const totals = mats.reduce(
      (acc, m) => ({
        dispatched: acc.dispatched + Number(m.qty_dispatched ?? 0),
        received: acc.received + Number(m.qty_received ?? 0),
        installed: acc.installed + Number(m.qty_installed ?? 0),
        damaged: acc.damaged + Number(m.qty_damaged ?? 0),
        returned: acc.returned + Number(m.qty_returned ?? 0),
      }),
      { dispatched: 0, received: 0, installed: 0, damaged: 0, returned: 0 },
    );

    const summary = {
      installation_no: i.installation_no,
      status: i.status,
      progress_pct: i.progress_pct,
      planned_start_date: i.planned_start_date,
      planned_end_date: i.planned_end_date,
      actual_start_date: i.actual_start_date,
      actual_end_date: i.actual_end_date,
      reports_count: reports.length,
      recent_labour: reports.slice(0, 7).map((r) => r.labour_present),
      recent_progress: reports.slice(0, 7).map((r) => r.progress_pct),
      recent_shortages: reports.slice(0, 7).map((r) => r.material_shortage).filter(Boolean),
      material_totals: totals,
      customer_rating: s?.customer_rating ?? null,
      customer_remarks: s?.remarks ?? null,
    };

    const system = [
      "You are the Stone Tech OS Installation Site Assistant.",
      "Analyse the installation site health across FIVE dimensions and return a JSON object.",
      "Dimensions: delay_risk, labour_productivity, material_consumption, installation_progress, customer_satisfaction.",
      "For each: score 0-100, one-line reasoning grounded in the numbers you were given.",
      "Then produce up to 4 recommendations. Each: category (manpower | material | schedule | quality), action (imperative), explanation (why, referencing the data).",
      'Return ONLY strict JSON: {"scores":{...},"summary":"...","recommendations":[{"category":"","action":"","explanation":""}]}.',
    ].join("\n");

    const reply = await chat(
      [
        { role: "system", content: system },
        { role: "user", content: `Installation snapshot:\n${JSON.stringify(summary, null, 2)}` },
      ],
      { temperature: 0.2 },
    );

    let parsed: unknown = null;
    try {
      const match = reply.match(/\{[\s\S]*\}$/);
      parsed = JSON.parse(match ? match[0] : reply);
    } catch {
      parsed = { summary: reply, scores: {}, recommendations: [] };
    }
    return { snapshot: summary, ai: parsed };
  });

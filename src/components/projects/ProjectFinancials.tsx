/**
 * Project 360 finance strip — rolls up quote value, invoice totals, payments,
 * outstanding, and estimated margin against project budget.
 */
import { useQuery } from "@tanstack/react-query";
import { Wallet, TrendingUp, AlertTriangle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { formatInr } from "@/lib/format";

export function ProjectFinancials({ projectId }: { projectId: string }) {
  const q = useQuery({
    queryKey: ["project_360_finance", projectId],
    queryFn: async () => {
      const [proj, invs, pays] = await Promise.all([
        supabase.from("projects").select("total_value, budget_cost").eq("id", projectId).maybeSingle(),
        supabase.from("invoices").select("total, balance_due").eq("project_id", projectId),
        supabase.from("payments").select("amount, invoice_id, invoice:invoice_id(project_id)").limit(2000),
      ]);
      const invoices = invs.data ?? [];
      const invoiced = invoices.reduce((s, i) => s + Number(i.total ?? 0), 0);
      const outstanding = invoices.reduce((s, i) => s + Number(i.balance_due ?? 0), 0);
      const collected = (pays.data ?? [])
        .filter((p) => (p.invoice as { project_id?: string } | null)?.project_id === projectId)
        .reduce((s, p) => s + Number(p.amount ?? 0), 0);
      const pipeline = Number(proj.data?.total_value ?? 0);
      const cost = Number(proj.data?.budget_cost ?? 0);
      return {
        pipeline, invoiced, collected, outstanding,
        estMargin: pipeline - cost,
        marginPct: pipeline > 0 ? ((pipeline - cost) / pipeline) * 100 : 0,
      };
    },
  });
  const s = q.data;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <Kpi icon={TrendingUp} label="Pipeline" value={s ? formatInr(s.pipeline) : "—"} />
      <Kpi icon={TrendingUp} label="Invoiced" value={s ? formatInr(s.invoiced) : "—"} />
      <Kpi icon={Wallet} label="Collected" value={s ? formatInr(s.collected) : "—"} />
      <Kpi icon={AlertTriangle} label="Outstanding" value={s ? formatInr(s.outstanding) : "—"} tone={s && s.outstanding > 0 ? "warn" : undefined} />
      <Kpi icon={Sparkles} label="Est. margin" value={s ? `${formatInr(s.estMargin)} (${s.marginPct.toFixed(0)}%)` : "—"} />
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode; tone?: "warn" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground"><Icon className="h-3 w-3" />{label}</div>
        <div className={`mt-1 truncate text-lg font-semibold ${tone === "warn" ? "text-amber-600" : ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

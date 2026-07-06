import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Factory, Hammer, ShieldCheck, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/dashboards/production")({ ssr: false, component: ProductionDashboard });

function ProductionDashboard() {
  const stats = useQuery({
    queryKey: ["dash", "production"],
    queryFn: async () => {
      const [po, pcs, qcRows] = await Promise.all([
        supabase.from("production_orders").select("id, status, planned_end").limit(5000),
        supabase.from("production_pieces" as never).select("status").limit(10000),
        supabase.from("qc_results" as never).select("outcome").limit(10000),
      ]);
      const orders = (po.data ?? []) as Array<{ status: string; planned_end: string | null }>;
      const pieces = (pcs.data ?? []) as Array<{ status: string }>;
      const qc = (qcRows.data ?? []) as Array<{ outcome: string }>;
      const today = new Date().toISOString().slice(0, 10);
      return {
        planned: orders.filter((o) => o.status === "planned").length,
        in_progress: orders.filter((o) => o.status === "in_progress").length,
        qc_pending: orders.filter((o) => o.status === "qc_pending").length,
        overdue: orders.filter((o) => o.planned_end && o.planned_end < today && o.status !== "completed").length,
        pieces_installed: pieces.filter((p) => p.status === "installed").length,
        pieces_damaged: pieces.filter((p) => p.status === "damaged").length,
        qc_pass: qc.filter((r) => r.outcome === "pass" || r.outcome === "approved").length,
        qc_fail: qc.filter((r) => r.outcome === "fail" || r.outcome === "rejected").length,
      };
    },
  });
  const s = stats.data;
  return (
    <div>
      <PageHeader title="Production Dashboard" subtitle="Live workshop status, QC and installation." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Factory} label="Planned" value={s?.planned ?? "—"} to="/manufacturing" />
        <Kpi icon={Hammer} label="In progress" value={s?.in_progress ?? "—"} to="/manufacturing" />
        <Kpi icon={ShieldCheck} label="QC pending" value={s?.qc_pending ?? "—"} to="/manufacturing" />
        <Kpi icon={AlertTriangle} label="Overdue" value={s?.overdue ?? "—"} to="/manufacturing" />
        <Kpi icon={ShieldCheck} label="QC pass" value={s?.qc_pass ?? "—"} to="/manufacturing" />
        <Kpi icon={AlertTriangle} label="QC fail" value={s?.qc_fail ?? "—"} to="/manufacturing" />
        <Kpi icon={Factory} label="Pieces installed" value={s?.pieces_installed ?? "—"} to="/manufacturing" />
        <Kpi icon={AlertTriangle} label="Pieces damaged" value={s?.pieces_damaged ?? "—"} to="/manufacturing" />
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, to }: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode; to: string }) {
  return (
    <Link to={to as never}>
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</CardTitle></CardHeader>
        <CardContent className="text-2xl font-semibold">{value}</CardContent>
      </Card>
    </Link>
  );
}

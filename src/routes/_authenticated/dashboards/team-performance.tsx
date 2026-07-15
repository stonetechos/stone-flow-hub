/** Team Performance Dashboard — per-salesperson KPIs. */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { getTeamPerformance } from "@/lib/lead-analytics/api";
import { toUserMessage } from "@/lib/errors";
import { formatInr } from "@/lib/format";
import { BarCard } from "@/components/dashboard/ChartCards";

export const Route = createFileRoute("/_authenticated/dashboards/team-performance")({
  ssr: false,
  component: TeamPerformanceDashboard,
});

function TeamPerformanceDashboard() {
  const q = useQuery({ queryKey: ["lead-analytics", "team"], queryFn: getTeamPerformance, staleTime: 60_000 });
  if (q.isLoading || !q.data) return <><PageHeader title="Team Performance" /><LoadingBlock /></>;
  if (q.error) return <><PageHeader title="Team Performance" /><ErrorBlock message={toUserMessage(q.error)} onRetry={() => q.refetch()} /></>;
  const rows = q.data!;

  return (
    <div>
      <PageHeader title="Team Performance" subtitle="Per-salesperson leads, quotations, conversions and revenue." />

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Salesperson</th>
                <th className="px-3 py-2 text-right">Leads</th>
                <th className="px-3 py-2 text-right">Quotation %</th>
                <th className="px-3 py-2 text-right">Conversion %</th>
                <th className="px-3 py-2 text-right">Orders Closed</th>
                <th className="px-3 py-2 text-right">Lost Leads</th>
                <th className="px-3 py-2 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No sales activity yet.</td></tr>
              ) : rows.map((r) => (
                <tr key={r.userId} className="border-t border-border hover:bg-accent/50">
                  <td className="px-3 py-2 font-medium">{r.name}</td>
                  <td className="px-3 py-2 text-right">{r.leads}</td>
                  <td className="px-3 py-2 text-right">{r.quotationPct}%</td>
                  <td className="px-3 py-2 text-right">{r.conversionPct}%</td>
                  <td className="px-3 py-2 text-right">{r.ordersClosed}</td>
                  <td className="px-3 py-2 text-right">{r.lostLeads}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatInr(r.revenueInr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <BarCard title="Revenue by salesperson" data={rows.slice(0, 10).map((r) => ({ label: r.name, value: r.revenueInr }))} />
        <BarCard title="Leads handled" data={rows.slice(0, 10).map((r) => ({ label: r.name, value: r.leads }))} formatValue={(v) => String(v)} />
      </div>
    </div>
  );
}

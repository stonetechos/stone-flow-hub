/** Project profitability table. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { getProjectProfitability } from "@/lib/executive/profitability";
import { formatInr } from "@/lib/format";
import { toUserMessage } from "@/lib/errors";

export const Route = createFileRoute("/_authenticated/dashboards/profitability")({
  ssr: false,
  component: ProfitabilityDashboard,
});

function ProfitabilityDashboard() {
  const q = useQuery({ queryKey: ["exec", "profitability"], queryFn: getProjectProfitability, staleTime: 60_000 });
  if (q.isLoading) return <LoadingBlock />;
  if (q.error) return <ErrorBlock message={toUserMessage(q.error)} />;
  return (
    <div>
      <PageHeader title="Project Profitability" subtitle="Per-project P&L — estimate → sales → costs → net." />
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground border-b">
              <tr>
                <th className="text-left p-2">Project</th>
                <th className="text-left p-2">Customer</th>
                <th className="text-right p-2">Estimate</th>
                <th className="text-right p-2">Quoted</th>
                <th className="text-right p-2">Sales</th>
                <th className="text-right p-2">Material</th>
                <th className="text-right p-2">Procurement</th>
                <th className="text-right p-2">Install</th>
                <th className="text-right p-2">Labour</th>
                <th className="text-right p-2">Transport</th>
                <th className="text-right p-2">Gross</th>
                <th className="text-right p-2">Net</th>
                <th className="text-right p-2">%</th>
              </tr>
            </thead>
            <tbody>
              {(q.data ?? []).map((r) => (
                <tr key={r.project_id} className="border-b hover:bg-muted/40">
                  <td className="p-2"><Link to="/projects/$projectId" params={{ projectId: r.project_id }} className="text-primary hover:underline">{r.project_name}</Link></td>
                  <td className="p-2 text-muted-foreground">{r.customer_name ?? "—"}</td>
                  <td className="p-2 text-right">{formatInr(r.estimate_value)}</td>
                  <td className="p-2 text-right">{formatInr(r.quoted_value)}</td>
                  <td className="p-2 text-right">{formatInr(r.actual_sales)}</td>
                  <td className="p-2 text-right">{formatInr(r.material_cost)}</td>
                  <td className="p-2 text-right">{formatInr(r.procurement_cost)}</td>
                  <td className="p-2 text-right">{formatInr(r.installation_cost)}</td>
                  <td className="p-2 text-right">{formatInr(r.labour_cost)}</td>
                  <td className="p-2 text-right">{formatInr(r.transport_cost)}</td>
                  <td className="p-2 text-right">{formatInr(r.gross_profit)}</td>
                  <td className={`p-2 text-right font-medium ${r.net_profit < 0 ? "text-red-600" : "text-emerald-600"}`}>{formatInr(r.net_profit)}</td>
                  <td className="p-2 text-right">{r.profit_pct.toFixed(1)}%</td>
                </tr>
              ))}
              {(q.data ?? []).length === 0 && <tr><td colSpan={13} className="p-4 text-center text-muted-foreground">No projects.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <p className="mt-3 text-xs text-muted-foreground">
        Cost inputs come from the approved estimate (material, manufacturing, install, freight); procurement uses actual vendor payments linked to project GRNs. Numbers are live — never estimated.
      </p>
    </div>
  );
}

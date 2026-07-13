/** Customer intelligence route. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { getCustomerIntel, type CustomerScore } from "@/lib/executive/customer-intel";
import { formatInr } from "@/lib/format";
import { toUserMessage } from "@/lib/errors";

export const Route = createFileRoute("/_authenticated/dashboards/customer-intelligence")({
  ssr: false,
  component: CustomerIntelPage,
});

function CustomerIntelPage() {
  const q = useQuery({ queryKey: ["exec", "customer-intel"], queryFn: getCustomerIntel, staleTime: 60_000 });
  if (q.isLoading) return <LoadingBlock />;
  if (q.error) return <ErrorBlock message={toUserMessage(q.error)} />;
  const d = q.data!;
  return (
    <div>
      <PageHeader title="Customer Intelligence" subtitle="Where revenue comes from, who's at risk, and who's dormant." />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <List title="Top by revenue" rows={d.top_by_revenue} col="revenue" />
        <List title="Most profitable" rows={d.most_profitable} col="revenue" />
        <List title="Repeat customers" rows={d.repeat} col="orders" />
        <List title="High outstanding" rows={d.high_outstanding} col="outstanding" tone="warn" />
        <List title="Delayed payers" rows={d.delayed_payers} col="overdue" tone="warn" />
        <List title="Inactive (180d+)" rows={d.inactive} col="last_order" />
        <List title="Potential high-value" rows={d.potential_high_value} col="revenue" />
      </div>
    </div>
  );
}

function List({ title, rows, col, tone }: { title: string; rows: CustomerScore[]; col: "revenue" | "orders" | "outstanding" | "overdue" | "last_order"; tone?: "warn" }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0 ? <div className="text-xs text-muted-foreground">No data.</div> : (
          <ol className="text-sm space-y-1">
            {rows.map((r, i) => (
              <li key={r.customer_id + i} className="flex justify-between gap-2">
                <Link to="/customers/$customerId" params={{ customerId: r.customer_id }} className="truncate text-primary hover:underline">{i + 1}. {r.name}</Link>
                <span className={tone === "warn" ? "text-status-warning-fg" : "text-muted-foreground"}>{formatValue(r, col)}</span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function formatValue(r: CustomerScore, col: "revenue" | "orders" | "outstanding" | "overdue" | "last_order"): string {
  if (col === "revenue") return formatInr(r.revenue);
  if (col === "orders") return `${r.orders_count} orders`;
  if (col === "outstanding") return formatInr(r.outstanding);
  if (col === "overdue") return `${r.overdue_days}d`;
  return r.last_order_at ? new Date(r.last_order_at).toLocaleDateString("en-IN") : "never";
}

/** Sales Funnel Dashboard — funnel visual + conversion metrics. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { getFunnelSummary } from "@/lib/lead-analytics/api";
import { toUserMessage } from "@/lib/errors";
import { formatInr } from "@/lib/format";
import { moneyShort } from "@/components/dashboard/ChartCards";

export const Route = createFileRoute("/_authenticated/dashboards/sales-funnel")({
  ssr: false,
  component: SalesFunnelDashboard,
});

function SalesFunnelDashboard() {
  const q = useQuery({
    queryKey: ["lead-analytics", "funnel"],
    queryFn: getFunnelSummary,
    staleTime: 60_000,
  });
  if (q.isLoading || !q.data)
    return (
      <>
        <PageHeader title="Sales Funnel" />
        <LoadingBlock />
      </>
    );
  if (q.error)
    return (
      <>
        <PageHeader title="Sales Funnel" />
        <ErrorBlock message={toUserMessage(q.error)} onRetry={() => q.refetch()} />
      </>
    );
  const d = q.data!;
  const maxCount = Math.max(1, ...d.stages.map((s) => s.count));

  return (
    <div>
      <PageHeader
        title="Sales Funnel"
        subtitle="Volume, value, conversion and drop-off across every active stage."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Metric label="Total leads" value={String(d.totalLeads)} />
        <Metric label="Won" value={String(d.wonCount)} tone="success" />
        <Metric label="Lost %" value={d.lostPct + "%"} tone="danger" />
        <Metric label="Won %" value={d.wonPct + "%"} tone="success" />
        <Metric label="Avg quotation" value={moneyShort(d.avgQuotationInr)} />
        <Metric label="Avg order" value={moneyShort(d.avgOrderInr)} />
      </div>

      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Pipeline funnel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-2">
          {d.stages.map((s) => {
            const width = Math.max(6, Math.round((s.count / maxCount) * 100));
            return (
              <Link
                key={s.id}
                to="/enquiries"
                search={{ umbrella: s.id }}
                className="block rounded-md border border-transparent px-2 py-1 hover:border-border hover:bg-accent"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium">{s.label}</span>
                  <span className="text-muted-foreground">
                    {s.count} leads · {formatInr(s.revenueInr)} · conv {s.conversionPct}%
                    {s.dropOffPct > 0 && (
                      <span className="ml-2 text-destructive">↓ {s.dropOffPct}%</span>
                    )}
                  </span>
                </div>
                <div className="mt-1 h-3 w-full overflow-hidden rounded-sm bg-muted">
                  <div
                    className="h-full rounded-sm bg-primary transition-all"
                    style={{ width: width + "%" }}
                  />
                </div>
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "danger";
}) {
  const cls =
    tone === "success"
      ? "border-success/30 bg-success/5"
      : tone === "danger"
        ? "border-destructive/30 bg-destructive/5"
        : "border-border bg-card";
  return (
    <div className={`rounded-lg border px-3 py-3 ${cls}`}>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-display text-2xl font-bold">{value}</div>
    </div>
  );
}

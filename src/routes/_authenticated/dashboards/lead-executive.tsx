/** Lead Executive Dashboard — the 13 umbrella cards, clickable into the CRM. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Crown } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { getExecutiveOverview } from "@/lib/lead-analytics/api";
import { toUserMessage } from "@/lib/errors";
import { moneyShort } from "@/components/dashboard/ChartCards";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboards/lead-executive")({
  ssr: false,
  component: LeadExecutiveDashboard,
});

function tone(group: string) {
  switch (group) {
    case "won":
      return "border-success/40 bg-success/5";
    case "post_sale":
      return "border-primary/25 bg-primary/5";
    case "lost":
      return "border-destructive/30 bg-destructive/5";
    default:
      return "border-border bg-card";
  }
}

function LeadExecutiveDashboard() {
  const q = useQuery({
    queryKey: ["lead-analytics", "executive"],
    queryFn: getExecutiveOverview,
    staleTime: 60_000,
  });
  if (q.isLoading || !q.data)
    return (
      <>
        <PageHeader
          title="Lead Executive Dashboard"
          subtitle="Complete view of every stage in the customer lifecycle."
        />
        <LoadingBlock />
      </>
    );
  if (q.error)
    return (
      <>
        <PageHeader title="Lead Executive Dashboard" />
        <ErrorBlock message={toUserMessage(q.error)} onRetry={() => q.refetch()} />
      </>
    );
  const d = q.data!;

  return (
    <div>
      <PageHeader
        title="Lead Executive Dashboard"
        subtitle="Every stage of the customer lifecycle at a glance. Click any card to open the filtered CRM."
      />

      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Crown className="h-4 w-4 text-primary" /> Total leads
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="font-display text-4xl font-bold">{d.totalLeads}</div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {d.cards.map((c) => (
          <Link key={c.id} to="/enquiries" search={{ umbrella: c.id }} className="block">
            <div
              className={cn(
                "h-full rounded-lg border px-3 py-3 transition-shadow hover:shadow-md",
                tone(c.group),
              )}
            >
              <div className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {c.label}
              </div>
              <div className="mt-1 font-display text-3xl font-bold">{c.count}</div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="truncate">
                  {c.revenueInr > 0 ? moneyShort(c.revenueInr) : "—"}
                </span>
                <span className="shrink-0">{c.avgDays}d avg</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

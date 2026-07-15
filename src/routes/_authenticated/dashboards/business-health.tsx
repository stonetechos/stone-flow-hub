/**
 * Business Health Dashboard — composite 0-100 score across Sales, Cash,
 * Leads, Operations, Vendors, Customer Satisfaction plus trend indicators
 * and the count of pending risks. Read-only; reuses existing tables via
 * `getBusinessHealth` + `getRiskSummary`.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowRight, ArrowUp, Gauge } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { toUserMessage } from "@/lib/errors";
import { getBusinessHealth, type HealthMetric } from "@/lib/intelligence/business-health";
import { cn } from "@/lib/utils";
import { useExecutiveInsights } from "@/hooks/useExecutiveInsights";

export const Route = createFileRoute("/_authenticated/dashboards/business-health")({
  ssr: false,
  component: BusinessHealthDashboard,
});

import { toneText } from "@/lib/ui/tones";

function toneOf(score: number) {
  if (score >= 80) return toneText("success");
  if (score >= 60) return toneText("warning");
  if (score >= 40) return toneText("warning");
  return toneText("danger");
}

function BusinessHealthDashboard() {
  const q = useQuery({ queryKey: ["intel", "business-health"], queryFn: getBusinessHealth, staleTime: 60_000 });
  const { executiveBrief } = useExecutiveInsights();
  if (q.isLoading || !q.data) return <><PageHeader title="Business Health" /><LoadingBlock /></>;
  if (q.error) return <><PageHeader title="Business Health" /><ErrorBlock message={toUserMessage(q.error)} onRetry={() => q.refetch()} /></>;
  const h = q.data!;
  const m = executiveBrief.metrics;

  return (
    <div>
      <PageHeader title="Business Health" subtitle="Composite view of sales, cash, ops, vendors and customer satisfaction." />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Gauge className="h-4 w-4" /> Overall</CardTitle></CardHeader>
          <CardContent>
            <div className={cn("text-5xl font-bold tabular-nums", toneOf(h.overall))}>{h.overall}</div>
            <div className="mt-2 text-xs text-muted-foreground">Weighted across all dimensions.</div>
            <Link to="/dashboards/daily-action" className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline">
              {h.pendingRisks} pending risk{h.pendingRisks === 1 ? "" : "s"} — review <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
        <div className="md:col-span-2 grid gap-3 sm:grid-cols-2">
          {h.metrics.map((metric) => <MetricCard key={metric.key} m={metric} />)}
        </div>
      </div>

      {/* ------------------- INSIGHT METRICS (Phase G.7) ------------------- */}
      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Insight metrics
        </h2>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <StatTile label="Critical" value={m.critical} tone="danger" />
          <StatTile label="Warning" value={m.warning} tone="warning" />
          <StatTile label="Healthy" value={m.healthy} tone="success" />
          <StatTile label="Resolved" value={m.resolved} />
          <StatTile label="Attention required" value={m.attentionRequired} />
          <StatTile label="Completion ratio" value={`${Math.round(m.completionRatio * 100)}%`} />
        </div>
      </div>
    </div>
  );
}

function MetricCard({ m }: { m: HealthMetric }) {
  const Trend = m.trend === "up" ? ArrowUp : m.trend === "down" ? ArrowDown : ArrowRight;
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{m.label}</span>
          {m.trend && <Trend className={cn("h-3 w-3", m.trend === "up" ? toneText("success") : m.trend === "down" ? toneText("danger") : "")} />}
        </div>
        <div className={cn("mt-1 text-2xl font-bold tabular-nums", toneOf(m.score))}>{m.score}</div>
        <div className="mt-1 text-[11px] text-muted-foreground">{m.note}</div>
      </CardContent>
    </Card>
  );
}

function StatTile({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "danger" | "warning" | "success" }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={cn("mt-1 text-2xl font-bold tabular-nums", tone ? toneText(tone) : "")}>{value}</div>
      </CardContent>
    </Card>
  );
}

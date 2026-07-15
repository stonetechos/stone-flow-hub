/** Lead Health Dashboard — rule-based health buckets. */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, ThermometerSnowflake, TimerOff, Ban, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { getHealthBuckets } from "@/lib/lead-analytics/api";
import { toUserMessage } from "@/lib/errors";
import { DonutCard } from "@/components/dashboard/ChartCards";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboards/lead-health")({
  ssr: false,
  component: LeadHealthDashboard,
});

function LeadHealthDashboard() {
  const q = useQuery({ queryKey: ["lead-analytics", "health"], queryFn: getHealthBuckets, staleTime: 60_000 });
  if (q.isLoading || !q.data) return <><PageHeader title="Lead Health" /><LoadingBlock /></>;
  if (q.error) return <><PageHeader title="Lead Health" /><ErrorBlock message={toUserMessage(q.error)} onRetry={() => q.refetch()} /></>;
  const b = q.data!;

  const cards = [
    { label: "Healthy", value: b.healthy, icon: <ShieldCheck className="h-4 w-4" />, tone: "success" as const },
    { label: "Warning", value: b.warning, icon: <Activity className="h-4 w-4" />, tone: "warn" as const },
    { label: "Critical", value: b.critical, icon: <AlertTriangle className="h-4 w-4" />, tone: "danger" as const },
    { label: "Cold", value: b.cold, icon: <ThermometerSnowflake className="h-4 w-4" />, tone: "info" as const },
    { label: "Inactive", value: b.inactive, icon: <Ban className="h-4 w-4" />, tone: "muted" as const },
    { label: "No activity >30d", value: b.noActivity30d, icon: <TimerOff className="h-4 w-4" />, tone: "danger" as const },
  ];

  return (
    <div>
      <PageHeader title="Lead Health Dashboard" subtitle="Which leads need immediate attention." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <div key={c.label} className={cn("rounded-lg border px-3 py-3", toneClass(c.tone))}>
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{c.label}</div>
              <span className="text-primary">{c.icon}</span>
            </div>
            <div className="mt-0.5 font-display text-3xl font-bold">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <DonutCard
          title="Distribution"
          data={cards.filter((c) => c.label !== "No activity >30d").map((c) => ({ label: c.label, value: c.value }))}
          valueLabel="Leads"
          formatValue={(v) => String(v)}
        />
      </div>
    </div>
  );
}

function toneClass(t: "success" | "warn" | "danger" | "info" | "muted") {
  if (t === "success") return "border-success/40 bg-success/5";
  if (t === "warn") return "border-warning/40 bg-warning/5";
  if (t === "danger") return "border-destructive/40 bg-destructive/5";
  if (t === "info") return "border-primary/25 bg-primary/5";
  return "border-border bg-card";
}

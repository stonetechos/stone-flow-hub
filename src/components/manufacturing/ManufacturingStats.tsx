/**
 * Manufacturing dashboard KPI strip — read-only cards summarising
 * production_orders + QC pending. Shown at the top of `/manufacturing`.
 */
import { useQuery } from "@tanstack/react-query";
import { Factory, Clock, AlertTriangle, CheckCircle2, PauseCircle, ShieldCheck, ListChecks } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getManufacturingStats } from "@/lib/manufacturing/api";
import { cn } from "@/lib/utils";

export function ManufacturingStats() {
  const q = useQuery({
    queryKey: ["manufacturing", "stats"],
    queryFn: getManufacturingStats,
    refetchInterval: 60_000,
  });
  const s = q.data;

  const cards = [
    { label: "Planned", value: s?.planned, icon: ListChecks, tone: "text-muted-foreground" },
    { label: "In Progress", value: s?.in_progress, icon: Clock, tone: "text-status-warning-fg" },
    { label: "On Hold", value: s?.on_hold, icon: PauseCircle, tone: "text-status-warning-fg" },
    { label: "QC Pending", value: s?.qc_pending, icon: ShieldCheck, tone: "text-status-info-fg" },
    { label: "Overdue", value: s?.overdue, icon: AlertTriangle, tone: "text-destructive" },
    { label: "Completed Today", value: s?.completed_today, icon: CheckCircle2, tone: "text-primary" },
    { label: "Total Orders", value: s?.total, icon: Factory, tone: "text-muted-foreground" },
  ];

  return (
    <div className="mb-4 grid gap-2 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.label} className="p-3 transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{c.label}</p>
                <p className={cn("mt-0.5 font-display text-2xl font-semibold tabular-nums", c.tone)}>
                  {q.isLoading ? "—" : (c.value ?? 0)}
                </p>
              </div>
              <Icon className={cn("h-5 w-5 opacity-70", c.tone)} />
            </div>
          </Card>
        );
      })}
    </div>
  );
}

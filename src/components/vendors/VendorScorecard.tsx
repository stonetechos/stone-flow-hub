/**
 * Vendor scorecard — reads vendor_performance_cache and renders
 * the analytical summary shown on the Vendor detail Overview tab.
 * All numbers are cached and refreshed by triggers on PO / vendor_quote /
 * vendor_request changes; this component only reads.
 */
import { useQuery } from "@tanstack/react-query";
import { Award, Star, TrendingUp, Clock, Package, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Perf = {
  score: number;
  is_preferred: boolean;
  approval_pct: number;
  completion_pct: number;
  delay_pct: number;
  orders_count: number;
  quotes_submitted: number;
  quotes_approved: number;
  avg_response_hours: number | null;
  avg_dispatch_days: number | null;
  purchase_value: number;
  last_rfq_at: string | null;
  last_order_at: string | null;
} | null;

export function VendorScorecard({ vendorId }: { vendorId: string }) {
  const q = useQuery({
    queryKey: ["vendor", vendorId, "scorecard"],
    queryFn: async (): Promise<Perf> => {
      const { data, error } = await supabase
        .from("vendor_performance_cache")
        .select("*")
        .eq("vendor_id", vendorId)
        .maybeSingle();
      if (error) throw error;
      return (data as Perf) ?? null;
    },
  });

  const p = q.data;
  const stars = Math.max(0, Math.min(5, Math.round((p?.score ?? 0) / 20)));
  const tier = p?.is_preferred
    ? "Preferred"
    : (p?.score ?? 0) >= 75
      ? "Top Performer"
      : (p?.score ?? 0) >= 50
        ? "Reliable"
        : "Building history";

  return (
    <Card className="shadow-1">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Vendor Scorecard</CardTitle>
        <div className="flex items-center gap-2">
          {p?.is_preferred && (
            <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/10">
              <Award className="h-3 w-3" /> Preferred
            </Badge>
          )}
          <Badge variant="outline">{tier}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={cn(
                  "h-5 w-5",
                  i < stars ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40",
                )}
              />
            ))}
          </div>
          <p className="font-display text-2xl font-semibold tabular-nums">
            {q.isLoading ? "—" : Math.round(p?.score ?? 0)}
            <span className="ml-1 text-xs font-normal text-muted-foreground">/ 100</span>
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          <Metric icon={CheckCircle2} label="Approval %" value={pct(p?.approval_pct)} />
          <Metric icon={Package} label="Orders" value={String(p?.orders_count ?? 0)} />
          <Metric icon={TrendingUp} label="Completion %" value={pct(p?.completion_pct)} />
          <Metric icon={Clock} label="Avg response" value={hours(p?.avg_response_hours)} />
          <Metric icon={Clock} label="Avg dispatch" value={days(p?.avg_dispatch_days)} />
          <Metric
            icon={TrendingUp}
            label="Delay %"
            value={pct(p?.delay_pct)}
            tone={(p?.delay_pct ?? 0) > 20 ? "warn" : undefined}
          />
        </div>

        {p && (p.quotes_submitted > 0 || p.orders_count > 0) && (
          <p className="mt-4 text-xs text-muted-foreground">
            {p.quotes_approved} of {p.quotes_submitted} vendor quotes approved · Purchase value ₹
            {Math.round(p.purchase_value).toLocaleString("en-IN")}
            {p.last_order_at
              ? ` · Last order ${new Date(p.last_order_at).toLocaleDateString()}`
              : ""}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Star;
  label: string;
  value: string;
  tone?: "warn";
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border p-2">
      <Icon
        className={cn(
          "h-4 w-4 shrink-0",
          tone === "warn" ? "text-destructive" : "text-muted-foreground",
        )}
      />
      <div className="min-w-0">
        <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="font-medium tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function pct(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${Math.round(v)}%`;
}
function hours(v: number | null | undefined): string {
  if (v == null) return "—";
  if (v < 1) return `${Math.round(v * 60)}m`;
  if (v < 48) return `${v.toFixed(1)}h`;
  return `${Math.round(v / 24)}d`;
}
function days(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${v.toFixed(1)}d`;
}

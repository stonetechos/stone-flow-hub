/**
 * Lead Pipeline widget — 13 business-friendly umbrellas displayed with count,
 * expected revenue, and average days in stage. Clicking any umbrella deep-links
 * to the Enquiries CRM filtered to that umbrella.
 */
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { qk } from "@/lib/query-keys";
import { getEnquiryPipeline, type StageAggregate } from "@/lib/enquiries/api";
import { LEAD_UMBRELLAS, STAGE_TO_UMBRELLA, type LeadUmbrellaId } from "@/lib/constants";
import { cn } from "@/lib/utils";

function formatMoney(n: number): string {
  if (n >= 1_00_00_000) return "₹" + (n / 1_00_00_000).toFixed(1) + " Cr";
  if (n >= 1_00_000) return "₹" + (n / 1_00_000).toFixed(1) + " L";
  if (n >= 1_000) return "₹" + (n / 1_000).toFixed(1) + "K";
  return "₹" + n.toLocaleString("en-IN");
}

function groupTone(group: string): string {
  switch (group) {
    case "won":
      return "border-success/40 bg-success/5";
    case "post_sale":
      return "border-primary/20 bg-primary/5";
    case "lost":
      return "border-destructive/30 bg-destructive/5";
    default:
      return "border-border bg-card";
  }
}

export function LeadPipelineWidget() {
  const { data, isLoading } = useQuery({
    queryKey: qk.enquiries.pipeline,
    queryFn: getEnquiryPipeline,
  });

  // Roll underlying stages up into umbrellas.
  const rolled = new Map<
    LeadUmbrellaId,
    { count: number; revenue: number; days: number; wcount: number }
  >();
  for (const u of LEAD_UMBRELLAS) {
    rolled.set(u.id, { count: 0, revenue: 0, days: 0, wcount: 0 });
  }
  for (const row of (data ?? []) as StageAggregate[]) {
    const u = STAGE_TO_UMBRELLA[row.stage];
    if (!u) continue;
    const b = rolled.get(u)!;
    b.count += row.count;
    b.revenue += row.revenue_inr;
    b.days += row.avg_days_in_stage * row.count;
    b.wcount += row.count;
  }

  return (
    <Card className="shadow-1">
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <TrendingUp className="h-4 w-4 text-primary" /> Lead Pipeline
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-md bg-muted/60" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {LEAD_UMBRELLAS.map((u) => {
              const b = rolled.get(u.id)!;
              const avg = b.wcount === 0 ? 0 : Math.round(b.days / b.wcount);
              return (
                <Link
                  key={u.id}
                  to="/enquiries"
                  search={{ umbrella: u.id }}
                  className={cn(
                    "block rounded-md border px-3 py-2 transition-shadow hover:shadow-2",
                    groupTone(u.group),
                  )}
                >
                  <div className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {u.label}
                  </div>
                  <div className="mt-0.5 font-display text-xl font-bold text-foreground">
                    {b.count}
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-1 text-[11px] text-muted-foreground">
                    <span className="truncate">{b.revenue > 0 ? formatMoney(b.revenue) : "—"}</span>
                    <span className="shrink-0">{avg}d avg</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

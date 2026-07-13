/**
 * Business Priorities card — deterministic list of actionable priorities
 * derived exclusively from real database records via `getCommandCenter()`.
 *
 * No LLM, no fabricated summaries, no placeholder examples. Every item shown
 * references an actual row (project, invoice, inventory item, etc.) and links
 * to the record it describes. If the aggregator returns no insights, we show
 * an honest empty state.
 */
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Sparkles, ArrowRight, AlertTriangle, TrendingUp, ShieldAlert, CircleCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getCommandCenter, type OwnerInsight } from "@/lib/executive/command-center";
import { toUserMessage } from "@/lib/errors";

const KIND_META: Record<
  OwnerInsight["kind"],
  { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
  risk: { label: "Risk", icon: ShieldAlert, tone: "text-destructive" },
  warning: { label: "Warning", icon: AlertTriangle, tone: "text-amber-600 dark:text-amber-400" },
  opportunity: { label: "Opportunity", icon: TrendingUp, tone: "text-emerald-600 dark:text-emerald-400" },
  action: { label: "Action", icon: CircleCheck, tone: "text-primary" },
};

export function BusinessInsightsCard() {
  const q = useQuery({
    queryKey: ["executive", "command-center", "insights"],
    queryFn: getCommandCenter,
    staleTime: 5 * 60_000,
  });

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          Business Priorities
          <Badge variant="secondary" className="ml-auto text-[10px] uppercase">
            Live data
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {q.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : q.error ? (
          <p className="text-sm text-destructive">{toUserMessage(q.error)}</p>
        ) : (q.data?.insights.length ?? 0) === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">No actionable priorities found today.</p>
            <p className="mt-1">
              Recommendations will appear here automatically as real operational data (overdue payments,
              delayed projects, material shortages, etc.) becomes available.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {(q.data?.insights ?? []).map((i, idx) => {
              const meta = KIND_META[i.kind];
              const Icon = meta.icon;
              const body = (
                <div className="flex items-start gap-3 rounded-md border border-border bg-background p-3 transition-colors hover:bg-accent/40">
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${meta.tone}`} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{i.title}</span>
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                        {meta.label}
                      </Badge>
                    </div>
                    <div className="mt-0.5 text-sm text-muted-foreground">{i.detail}</div>
                  </div>
                  {i.to && <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />}
                </div>
              );
              return (
                <li key={idx}>
                  {i.to ? (
                    <Link to={i.to as never} className="block">
                      {body}
                    </Link>
                  ) : (
                    body
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

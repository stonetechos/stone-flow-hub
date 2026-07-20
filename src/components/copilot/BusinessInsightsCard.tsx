/**
 * Business Priorities card — deterministic list of actionable priorities.
 *
 * Phase G.8.8: previously sourced from `getCommandCenter()`'s ad-hoc
 * `OwnerInsight[]` (lib/executive/command-center.ts), a private aggregator
 * with no stable identity that duplicated two existing Insight Providers
 * (CollectionPriorityProvider for "payment needing attention",
 * InventoryShortageProvider for "material shortage") and had one genuine
 * gap ("biggest delayed project", now covered by the new
 * ProjectDelayProvider). Now sources directly from the same Insight
 * Provider registry every other Intelligence surface reads — Copilot's
 * own Insights panel, EntityInsightPanel, DangerNotifications,
 * smart-notifications, daily-action — via `useExecutiveInsights()`, and
 * shares the same dismiss lifecycle (`useInsightLifecycle`) so dismissing
 * a priority here means it stops resurfacing everywhere else too.
 *
 * No LLM, no fabricated summaries, no placeholder examples. Every item
 * shown references an actual row and links to the record it describes —
 * unchanged from before, just sourced from the shared pipeline instead of
 * a private one.
 */
import { Link } from "@tanstack/react-router";
import {
  Sparkles,
  ArrowRight,
  AlertTriangle,
  TrendingUp,
  ShieldAlert,
  CircleCheck,
  X,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useExecutiveInsights } from "@/hooks/useExecutiveInsights";
import { useInsightLifecycle } from "@/lib/insights/state/hooks";
import type { InsightKind } from "@/lib/insights/types";

const KIND_META: Record<
  InsightKind,
  { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
  risk: { label: "Risk", icon: ShieldAlert, tone: "text-destructive" },
  warning: { label: "Warning", icon: AlertTriangle, tone: "text-amber-600 dark:text-amber-400" },
  opportunity: {
    label: "Opportunity",
    icon: TrendingUp,
    tone: "text-emerald-600 dark:text-emerald-400",
  },
  action: { label: "Action", icon: CircleCheck, tone: "text-primary" },
};

const TOP_N = 5;

export function BusinessInsightsCard() {
  const { processedInsights, loading } = useExecutiveInsights();
  const { active, setStatus } = useInsightLifecycle(processedInsights);
  const top = [...active]
    .sort((a, b) => b.normalizedPriority - a.normalizedPriority)
    .slice(0, TOP_N);

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
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : top.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">No actionable priorities found today.</p>
            <p className="mt-1">
              Recommendations will appear here automatically as real operational data (overdue
              payments, delayed projects, material shortages, etc.) becomes available.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {top.map((i) => {
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
                    <div className="mt-0.5 text-sm text-muted-foreground">{i.why}</div>
                  </div>
                  <button
                    type="button"
                    aria-label="Dismiss"
                    title="Dismiss"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setStatus(i, "dismissed");
                    }}
                    className="mt-0.5 shrink-0 rounded p-0.5 opacity-50 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  {i.action.href && (
                    <ArrowRight
                      className="mt-1 h-4 w-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                  )}
                </div>
              );
              return (
                <li key={`${i.source}:${i.id}`}>
                  {i.action.href ? (
                    <Link to={i.action.href as never} className="block">
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

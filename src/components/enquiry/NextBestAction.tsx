import { Link } from "@tanstack/react-router";
import { AlertCircle, ArrowRight, Clock, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { NextBestAction, ActionPriority } from "@/lib/intelligence/actions";
import { cn } from "@/lib/utils";

const TONE: Record<ActionPriority, string> = {
  urgent: "bg-status-danger-bg text-status-danger-fg border-status-danger-border",
  high: "bg-status-warning-bg text-status-warning-fg border-status-warning-border",
  medium: "bg-status-warning-bg text-status-warning-fg border-status-warning-border",
  low: "bg-status-success-bg text-status-success-fg border-status-success-border",
};

interface Props {
  actions: NextBestAction[];
  loading?: boolean;
}

export function NextBestAction({ actions, loading }: Props) {
  if (loading) {
    return (
      <Card className="shadow-1">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4" /> Next Best Action</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground">Analysing…</CardContent>
      </Card>
    );
  }
  if (actions.length === 0) {
    return (
      <Card className="shadow-1">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4" /> Next Best Action</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground">All clear — no recommended action right now.</CardContent>
      </Card>
    );
  }
  const [top, ...rest] = actions;
  return (
    <Card className="shadow-1">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" /> Next Best Action
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <TopAction a={top} />
        {rest.length > 0 && (
          <div className="space-y-1 border-t border-border pt-2">
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">More recommendations</div>
            {rest.slice(0, 4).map((a) => (
              <RowAction key={a.key + a.label} a={a} />
            ))}
          </div>
        )}
        <div className="text-[11px] text-muted-foreground">Recommendations only. Nothing is executed automatically.</div>
      </CardContent>
    </Card>
  );
}

function TopAction({ a }: { a: NextBestAction }) {
  return (
    <div className={cn("rounded-md border p-3 space-y-1.5", TONE[a.priority])}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={cn("uppercase text-[10px]", TONE[a.priority])}>{a.priority}</Badge>
        <span className="text-sm font-semibold">{a.label}</span>
        {a.daysOverdue > 0 && <span className="inline-flex items-center gap-1 text-[11px]"><Clock className="h-3 w-3" /> {a.daysOverdue}d overdue</span>}
      </div>
      <div className="text-xs opacity-90">{a.reason}</div>
      <div className="text-[11px] opacity-80 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Expected: {a.expectedOutcome}</div>
      {a.href && (
        <Link to={a.href} className="inline-flex items-center gap-1 text-xs font-medium hover:underline">Go <ArrowRight className="h-3 w-3" /></Link>
      )}
    </div>
  );
}

function RowAction({ a }: { a: NextBestAction }) {
  return (
    <div className="flex items-start justify-between gap-2 text-xs">
      <div>
        <div className="font-medium">{a.label}</div>
        <div className="text-muted-foreground">{a.reason}</div>
      </div>
      <Badge variant="outline" className={cn("shrink-0 text-[10px] uppercase", TONE[a.priority])}>{a.priority}</Badge>
    </div>
  );
}

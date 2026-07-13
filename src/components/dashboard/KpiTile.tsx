/**
 * KpiTile — canonical dashboard KPI tile.
 *
 * Every dashboard KPI ("Sales pipeline", "Overdue payments", …) must render
 * through this component. It handles: value tinting via STDL tones, optional
 * sub-line, optional icon, optional deep-link, and consistent hover
 * affordance. Feature code never sets raw colour classes — pass a `tone`
 * signal instead.
 */
import type { ElementType, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toneText, type ToneSignal } from "@/lib/ui/tones";

export interface KpiTileProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ElementType;
  tone?: ToneSignal;
  to?: string;
  className?: string;
}

export function KpiTile({ label, value, sub, icon: Icon, tone, to, className }: KpiTileProps) {
  const body = (
    <Card className={cn("h-full transition-shadow hover:shadow-e2", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          {Icon && <Icon className="h-3.5 w-3.5" />}
          <span className="truncate">{label}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-semibold tabular-nums", tone && toneText(tone))}>
          {value}
        </div>
        {sub && <div className={cn("mt-1 text-xs", tone ? toneText(tone) : "text-muted-foreground")}>{sub}</div>}
      </CardContent>
    </Card>
  );
  return to ? <Link to={to as never}>{body}</Link> : body;
}

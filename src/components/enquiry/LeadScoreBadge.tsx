import { Badge } from "@/components/ui/badge";
import { SCORE_TIER_META, type ScoreBreakdown } from "@/lib/intelligence/score";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Props {
  score: ScoreBreakdown;
  compact?: boolean;
}

export function LeadScoreBadge({ score, compact }: Props) {
  const meta = SCORE_TIER_META[score.tier];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className={cn("gap-1 font-medium", meta.className)}>
          <span className="tabular-nums">{score.score}</span>
          {!compact && <span>· {meta.label}</span>}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <div className="space-y-0.5 text-xs">
          {score.reasons.map((r, i) => (
            <div key={i} className="flex justify-between gap-3">
              <span>{r.label}</span>
              <span className={r.delta >= 0 ? "text-emerald-400" : "text-red-400"}>{r.delta > 0 ? "+" : ""}{r.delta}</span>
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

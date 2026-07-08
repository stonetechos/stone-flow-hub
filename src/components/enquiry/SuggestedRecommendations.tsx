/**
 * Suggested-next-stage panel. Consumes recommendations produced by Phase 1
 * DB triggers via `listPendingRecommendations`. Accept updates the lead
 * stage; Dismiss marks the recommendation rejected. The system never mutates
 * `enquiries.stage` on its own — only the salesperson does, from here.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, X, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  listPendingRecommendations,
  resolveRecommendation,
  type StageRecommendation,
} from "@/lib/milestones/api";
import { LEAD_STAGE_LABEL, stageToUmbrella } from "@/lib/constants";
import { toUserMessage } from "@/lib/errors";
import { invalidateEnquiry } from "@/lib/query-invalidation";
import { qk } from "@/lib/query-keys";

export function SuggestedRecommendations({ enquiryId }: { enquiryId: string }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["stage_recommendations", enquiryId],
    queryFn: () => listPendingRecommendations(enquiryId),
  });

  const resolve = useMutation({
    mutationFn: (input: { rec: StageRecommendation; accept: boolean }) =>
      resolveRecommendation({
        recommendationId: input.rec.id,
        enquiryId,
        suggestedStage: input.rec.suggested_stage,
        accept: input.accept,
      }),
    onSuccess: (_d, vars) => {
      toast.success(vars.accept ? "Stage updated" : "Suggestion dismissed");
      invalidateEnquiry(qc, enquiryId);
      qc.invalidateQueries({ queryKey: ["stage_recommendations", enquiryId] });
      qc.invalidateQueries({ queryKey: qk.enquiries.pipeline });
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const recs = q.data ?? [];
  if (q.isLoading || recs.length === 0) return null;

  return (
    <div className="space-y-2 rounded-md border border-primary/20 bg-primary/5 p-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
        <Sparkles className="h-3.5 w-3.5" /> Suggested next stage
      </div>
      <ul className="space-y-2">
        {recs.map((r) => {
          const umb = stageToUmbrella(r.suggested_stage);
          const busy = resolve.isPending && resolve.variables?.rec.id === r.id;
          return (
            <li
              key={r.id}
              className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card p-2 text-xs"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium">
                  Move to <span className="text-primary">{umb.label}</span>
                  <span className="ml-1 text-muted-foreground">
                    ({LEAD_STAGE_LABEL[r.suggested_stage]})
                  </span>
                </div>
                <div className="text-muted-foreground">{r.reason}</div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => resolve.mutate({ rec: r, accept: false })}
                >
                  <X className="mr-1 h-3.5 w-3.5" /> Dismiss
                </Button>
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => resolve.mutate({ rec: r, accept: true })}
                >
                  {busy ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="mr-1 h-3.5 w-3.5" />
                  )}
                  Accept
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

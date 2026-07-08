/**
 * Operational Progress panel — shows the ordered milestone checklist for a
 * project, sourced from `project_milestones` (populated by Phase 1 triggers).
 * Rendered separately from Lead Stage so users see execution progress at a
 * glance without changing the CRM stage. Read-only for non-admins; the
 * milestone data is the single source of truth (no duplicate tracking).
 */
import { useQuery } from "@tanstack/react-query";
import { Check, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listProjectMilestones, MILESTONE_ORDER } from "@/lib/milestones/api";

export function OperationalProgress({ projectId }: { projectId: string | null }) {
  const q = useQuery({
    queryKey: ["project_milestones", projectId],
    queryFn: () => (projectId ? listProjectMilestones(projectId) : Promise.resolve([])),
    enabled: !!projectId,
  });

  const doneByKey = new Map((q.data ?? []).map((m) => [m.milestone_key, m]));

  return (
    <Card className="shadow-1">
      <CardHeader>
        <CardTitle className="text-sm">Operational Progress</CardTitle>
      </CardHeader>
      <CardContent>
        {!projectId ? (
          <p className="text-xs text-muted-foreground">
            No project yet — convert this lead to unlock execution milestones.
          </p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {MILESTONE_ORDER.map(({ key, label }) => {
              const done = doneByKey.get(key);
              return (
                <li key={key} className="flex items-center gap-2">
                  {done ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground/40" />
                  )}
                  <span className={done ? "" : "text-muted-foreground"}>{label}</span>
                  {done ? (
                    <span className="ml-auto text-[11px] text-muted-foreground">
                      {new Date(done.completed_at).toLocaleDateString("en-IN")}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

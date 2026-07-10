/**
 * Dashboard widget — Workforce Intelligence morning summary.
 * Rule-based; owner-only. Renders a compact snapshot with a deep link
 * to the full Owner Intelligence page.
 */
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Users } from "lucide-react";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Stat, StatRow } from "@/components/layout/Stat";
import { Badge } from "@/components/ui/badge";
import { listEmployees, listTasks } from "@/lib/workforce/api";
import { computeEmployeeScore, type EmployeeScore } from "@/lib/workforce/scoring";
import { buildOwnerSummary } from "@/lib/workforce/owner-intel";
import { useRoles } from "@/hooks/use-roles";

export function WorkforceSummaryWidget() {
  const roles = useRoles();
  const canView = roles.isAdmin || roles.isSalesManager;

  const employees = useQuery({
    queryKey: ["wf", "employees", "list", ""],
    queryFn: () => listEmployees(""),
    enabled: canView,
  });
  const tasks = useQuery({
    queryKey: ["wf", "tasks", "all"],
    queryFn: () => listTasks({}),
    enabled: canView,
  });
  const scores = useQuery({
    queryKey: ["wf", "scores", "all", (employees.data ?? []).length],
    queryFn: async () => {
      const m = new Map<string, EmployeeScore>();
      for (const e of employees.data ?? []) {
        try { m.set(e.id, await computeEmployeeScore(e.id, e.designation_id, e.user_id)); } catch { /* skip */ }
      }
      return m;
    },
    enabled: canView && (employees.data?.length ?? 0) > 0,
  });

  if (!canView || (employees.data?.length ?? 0) === 0) return null;

  const summary = buildOwnerSummary(employees.data ?? [], tasks.data ?? [], scores.data ?? new Map());
  const recs = summary.recommendations.slice(0, 3);

  return (
    <section>
      <SectionHeader
        title="Workforce Intelligence"
        description="Morning brief — rule-based, explainable."
        actions={
          <Link
            to="/workforce-intelligence/owner"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Full panel <ArrowRight className="h-3 w-3" />
          </Link>
        }
      />
      <StatRow>
        <Stat label="Team" value={summary.totalEmployees} icon={<Users className="h-3.5 w-3.5" />} to="/workforce-intelligence/employees" />
        <Stat label="Pending" value={summary.pending + summary.inProgress} to="/workforce-intelligence" />
        <Stat label="Overdue" value={summary.overdue} tone={summary.overdue > 0 ? "primary" : "default"} to="/workforce-intelligence/owner" />
        <Stat label="Completion" value={`${summary.completionPct}%`} to="/workforce-intelligence/performance" />
      </StatRow>
      {(summary.topPerformer || summary.needsAttention) && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {summary.topPerformer && (
            <Badge variant="secondary">Top: {summary.topPerformer.name} ({summary.topPerformer.pct.toFixed(0)}%)</Badge>
          )}
          {summary.needsAttention && (
            <Badge variant="outline">Attention: {summary.needsAttention.name} ({summary.needsAttention.pct.toFixed(0)}%)</Badge>
          )}
        </div>
      )}
      {recs.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {recs.map((r, i) => (
            <li key={`${r.kind}-${i}`} className="text-muted-foreground">
              <span className="font-medium text-foreground">{r.title}</span> — {r.reason}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

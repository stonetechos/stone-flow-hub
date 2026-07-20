/**
 * Owner Intelligence Panel — rule-based recommendations, workload
 * distribution, department summary, appreciation and coaching prompts.
 * No AI. Every insight is derived from ERP rules.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Award, HeartHandshake, ShieldAlert, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, SkeletonTable, ErrorBlock } from "@/components/layout/States";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listEmployees, listTasks } from "@/lib/workforce/api";
import { computeEmployeeScore, type EmployeeScore } from "@/lib/workforce/scoring";
import { buildOwnerSummary, type OwnerRecommendation } from "@/lib/workforce/owner-intel";
import { toUserMessage } from "@/lib/errors";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/workforce-intelligence/owner/")({
  head: () => ({ meta: [{ title: "Owner Intelligence" }] }),
  component: OwnerIntelPage,
});

function OwnerIntelPage() {
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
      const map = new Map<string, EmployeeScore>();
      for (const e of employees.data ?? []) {
        try {
          map.set(e.id, await computeEmployeeScore(e.id, e.designation_id, e.user_id));
        } catch {
          /* skip */
        }
      }
      return map;
    },
    enabled: canView && (employees.data?.length ?? 0) > 0,
  });

  if (!canView) {
    return (
      <>
        <PageHeader title="Owner Intelligence" />
        <EmptyState title="Owners only" message="Only admin / sales manager can view this panel." />
      </>
    );
  }

  if (employees.isLoading || tasks.isLoading) return <SkeletonTable />;
  if (employees.isError) return <ErrorBlock message={toUserMessage(employees.error)} />;

  const summary = buildOwnerSummary(
    employees.data ?? [],
    tasks.data ?? [],
    scores.data ?? new Map(),
  );

  const bucket = (kind: OwnerRecommendation["kind"]) =>
    summary.recommendations.filter((r) => r.kind === kind);

  return (
    <>
      <PageHeader
        title="Owner Intelligence"
        subtitle="Morning brief — rule-based, explainable."
        eyebrow="Workforce Intelligence"
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Metric label="Employees" value={summary.totalEmployees} />
        <Metric label="Total tasks" value={summary.totalTasks} />
        <Metric label="Pending" value={summary.pending + summary.inProgress} />
        <Metric label="Overdue" value={summary.overdue} tone="danger" />
        <Metric label="Completion" value={`${summary.completionPct}%`} tone="positive" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-6">
        <Section icon={<HeartHandshake className="h-4 w-4" />} title="Suggested discussions">
          <RecList items={bucket("discussion")} />
        </Section>
        <Section
          icon={<ShieldAlert className="h-4 w-4 text-destructive" />}
          title="Critical pending work"
        >
          <RecList items={bucket("critical")} />
        </Section>
        <Section
          icon={<Award className="h-4 w-4 text-status-success-fg" />}
          title="Employees needing appreciation"
        >
          <RecList items={bucket("appreciation")} />
        </Section>
        <Section
          icon={<AlertTriangle className="h-4 w-4 text-status-warning-fg" />}
          title="Employees needing coaching"
        >
          <RecList items={bucket("coaching")} />
        </Section>
        <Section
          icon={<ShieldAlert className="h-4 w-4 text-status-warning-fg" />}
          title="High-risk operational areas"
        >
          <RecList items={bucket("risk")} />
        </Section>
        <Section icon={<Users className="h-4 w-4" />} title="Department summary">
          {summary.byDepartment.length === 0 ? (
            <EmptyState title="No departments" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Pending</TableHead>
                  <TableHead>Completion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.byDepartment.map((d) => (
                  <TableRow key={d.department}>
                    <TableCell>{d.department}</TableCell>
                    <TableCell>{d.total}</TableCell>
                    <TableCell>{d.pending}</TableCell>
                    <TableCell>{d.completion}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Section>
      </div>

      <h3 className="mb-3 font-display text-sm font-semibold">Workload distribution</h3>
      {summary.workloadByEmployee.length === 0 ? (
        <EmptyState title="No workload yet" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Pending</TableHead>
              <TableHead>Overdue</TableHead>
              <TableHead>Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summary.workloadByEmployee.map((w) => {
              const s = scores.data?.get(w.employeeId);
              return (
                <TableRow key={w.employeeId}>
                  <TableCell>
                    <Link
                      to="/workforce-intelligence/employees/$id"
                      params={{ id: w.employeeId }}
                      className="font-medium hover:underline"
                    >
                      {w.name}
                    </Link>
                  </TableCell>
                  <TableCell>{w.pending}</TableCell>
                  <TableCell>
                    {w.overdue > 0 ? <Badge variant="destructive">{w.overdue}</Badge> : 0}
                  </TableCell>
                  <TableCell>{s ? `${s.overall_pct}%` : "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: "positive" | "danger";
}) {
  const cls =
    tone === "positive" ? "text-status-success-fg" : tone === "danger" ? "text-destructive" : "";
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${cls}`}>{value}</div>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          {icon} {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function RecList({ items }: { items: OwnerRecommendation[] }) {
  if (items.length === 0)
    return <p className="text-sm text-muted-foreground">Nothing to flag right now.</p>;
  return (
    <ul className="space-y-2">
      {items.map((r, i) => (
        <li key={`${r.kind}-${r.employeeId ?? "x"}-${i}`} className="rounded-md border p-2">
          <div className="text-sm font-medium">
            {r.employeeId ? (
              <Link
                to="/workforce-intelligence/employees/$id"
                params={{ id: r.employeeId }}
                className="hover:underline"
              >
                {r.title}
              </Link>
            ) : (
              r.title
            )}
          </div>
          <div className="text-xs text-muted-foreground">{r.reason}</div>
        </li>
      ))}
    </ul>
  );
}

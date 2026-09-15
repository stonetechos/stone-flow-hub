/**
 * Cross-employee performance board. Rule-based scoring — no AI.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, SkeletonTable, ErrorBlock } from "@/components/layout/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listEmployees, listDesignations } from "@/lib/workforce/api";
import { computeEmployeeScore, type EmployeeScore } from "@/lib/workforce/scoring";
import { GRADE_LABELS } from "@/lib/workforce/types";
import { toUserMessage } from "@/lib/errors";

export const Route = createFileRoute("/_authenticated/workforce-intelligence/performance/")({
  head: () => ({ meta: [{ title: "Performance — Workforce Intelligence" }] }),
  component: PerformanceView,
});

export function PerformanceView() {
  const employees = useQuery({
    queryKey: ["wf", "employees", "list", ""],
    queryFn: () => listEmployees(""),
  });
  const designations = useQuery({ queryKey: ["wf", "designations"], queryFn: listDesignations });

  const scoreQuery = useQuery({
    queryKey: ["wf", "performance", "board", (employees.data ?? []).length],
    queryFn: async () => {
      const out = new Map<string, EmployeeScore>();
      for (const e of employees.data ?? []) {
        try {
          out.set(e.id, await computeEmployeeScore(e.id, e.designation_id, e.user_id));
        } catch {
          /* skip */
        }
      }
      return out;
    },
    enabled: (employees.data?.length ?? 0) > 0,
  });

  const desigMap = new Map((designations.data ?? []).map((d) => [d.id, d.name]));

  return (
    <>
      <PageHeader
        title="Performance"
        subtitle="Rule-based KRA scoring for the current month."
        eyebrow="Workforce Intelligence"
        actions={
          <Button asChild size="sm">
            <Link to="/workforce-intelligence/employees/new" search={{ id: undefined }}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> New employee
            </Link>
          </Button>
        }
      />
      {employees.isLoading || scoreQuery.isLoading ? (
        <SkeletonTable />
      ) : employees.isError ? (
        <ErrorBlock message={toUserMessage(employees.error)} />
      ) : (employees.data ?? []).length === 0 ? (
        <EmptyState
          title="No employees yet"
          message="Add your first employee to start tracking performance scorecards."
          action={
            <Button asChild size="sm">
              <Link to="/workforce-intelligence/employees/new" search={{ id: undefined }}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add employee
              </Link>
            </Button>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Grade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(employees.data ?? [])
              .map((e) => ({ e, s: scoreQuery.data?.get(e.id) }))
              .sort((a, b) => (b.s?.overall_pct ?? -1) - (a.s?.overall_pct ?? -1))
              .map(({ e, s }) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <Link
                      to="/workforce-intelligence/employees/$id"
                      params={{ id: e.id }}
                      className="font-medium hover:underline"
                    >
                      {e.full_name}
                    </Link>
                  </TableCell>
                  <TableCell>{e.designation_id ? desigMap.get(e.designation_id) : "—"}</TableCell>
                  <TableCell>{s ? `${s.overall_pct}%` : "—"}</TableCell>
                  <TableCell>{s ? <Badge>{GRADE_LABELS[s.grade]}</Badge> : "—"}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}

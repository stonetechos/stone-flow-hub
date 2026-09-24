/**
 * Cross-employee performance board. Rule-based scoring — no AI.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
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
import { transliterateName } from "@/lib/i18n/transliterate";

export const Route = createFileRoute("/_authenticated/workforce-intelligence/performance/")({
  head: () => ({ meta: [{ title: "Performance — Workforce Intelligence" }] }),
  component: PerformanceView,
});

export function PerformanceView() {
  const { t, i18n } = useTranslation();
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
        title={t("workforce.performance.title", "Performance")}
        subtitle={t(
          "workforce.performance.subtitle",
          "Rule-based KRA scoring for the current month.",
        )}
        eyebrow={t("workforce.eyebrow", "Workforce Intelligence")}
      />
      {employees.isLoading || scoreQuery.isLoading ? (
        <SkeletonTable />
      ) : employees.isError ? (
        <ErrorBlock message={toUserMessage(employees.error)} />
      ) : (employees.data ?? []).length === 0 ? (
        <EmptyState
          title={t("workforce.performance.emptyTitle", "No employees yet")}
          message={t(
            "workforce.performance.emptyMessage",
            "Add your first employee to start tracking performance scorecards.",
          )}
          action={
            <Button asChild size="sm">
              <Link to="/workforce-intelligence/employees/new" search={{ id: undefined }}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />{" "}
                {t("workforce.employees.addEmployee", "Add employee")}
              </Link>
            </Button>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("workforce.employees.columns.name", "Employee")}</TableHead>
              <TableHead>{t("workforce.employees.columns.designation", "Role")}</TableHead>
              <TableHead>{t("workforce.performance.score", "Score")}</TableHead>
              <TableHead>{t("workforce.performance.grade", "Grade")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(employees.data ?? [])
              .map((e) => ({ e, s: scoreQuery.data?.get(e.id) }))
              .sort((a, b) => (b.s?.overall_pct ?? -1) - (a.s?.overall_pct ?? -1))
              .map(({ e, s }) => {
                const desig = e.designation_id ? desigMap.get(e.designation_id) : null;
                return (
                  <TableRow key={e.id}>
                    <TableCell>
                      <Link
                        to="/workforce-intelligence/employees/$id"
                        params={{ id: e.id }}
                        className="font-medium hover:underline"
                      >
                        {transliterateName(e.full_name, i18n.language)}
                      </Link>
                    </TableCell>
                    <TableCell>{desig ? t(desig, desig) : "—"}</TableCell>
                    <TableCell>{s ? `${s.overall_pct}%` : "—"}</TableCell>
                    <TableCell>{s ? <Badge>{GRADE_LABELS[s.grade]}</Badge> : "—"}</TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      )}
    </>
  );
}

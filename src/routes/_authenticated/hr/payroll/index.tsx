/**
 * Payroll runs — the monthly cycle. A run is created for a period, processed
 * from live salary structures and attendance, then approved and marked paid.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, Play, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createPayrollRun, listPayrollRuns, processPayrollRun } from "@/lib/hr/payroll-api";
import { MONTH_LABELS, periodLabel } from "@/lib/hr/payroll-engine";
import { listBranches } from "@/lib/hr/api";
import { formatInr } from "@/lib/format";
import { toUserMessage } from "@/lib/errors";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/hr/payroll/")({
  head: () => ({
    meta: [
      { title: "Payroll — Human Resources" },
      {
        name: "description",
        content: "Monthly payroll runs, processing, approvals and payout totals.",
      },
    ],
  }),
  component: PayrollRunsPage,
});

const STATUS_TONE: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  pending_approval: "secondary",
  approved: "default",
  paid: "default",
  cancelled: "destructive",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  pending_approval: "Pending approval",
  approved: "Approved",
  paid: "Paid",
  cancelled: "Cancelled",
};

function PayrollRunsPage() {
  const qc = useQueryClient();
  const roles = useRoles();
  const canRun = roles.hasAnyRole(["admin", "hr"]);
  const now = new Date();

  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [branchId, setBranchId] = useState("all");

  const runs = useQuery({ queryKey: ["hr", "payroll-runs"], queryFn: listPayrollRuns });
  const branches = useQuery({ queryKey: ["hr", "branches"], queryFn: listBranches });

  const create = useMutation({
    mutationFn: () =>
      createPayrollRun({
        period_month: Number(month),
        period_year: Number(year),
        branch_id: branchId === "all" ? null : branchId,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr", "payroll-runs"] });
      toast.success("Payroll run created — process it to generate payslips");
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const process = useMutation({
    mutationFn: (id: string) => processPayrollRun(id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["hr", "payroll-runs"] });
      toast.success(
        res.skipped.length
          ? `${res.processed} payslips generated · ${res.skipped.length} skipped without a salary structure`
          : `${res.processed} payslips generated`,
      );
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <>
      <PageHeader
        title="Payroll"
        subtitle="Create a monthly run, process it from attendance and salary structures, then approve."
        eyebrow="Human Resources"
      />

      {canRun ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">New payroll run</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger aria-label="Payroll month">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {MONTH_LABELS.map((m, i) => (
                  <SelectItem key={m} value={String(i + 1)}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger aria-label="Payroll year">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger aria-label="Branch">
                <SelectValue placeholder="All branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All branches</SelectItem>
                {(branches.data ?? []).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => create.mutate()} disabled={create.isPending}>
              <Plus className="mr-2 h-4 w-4" />
              {create.isPending ? "Creating…" : "Create run"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="min-w-0 overflow-x-auto">
        {runs.isLoading ? (
          <SkeletonTable />
        ) : runs.isError ? (
          <ErrorBlock message={toUserMessage(runs.error)} />
        ) : (runs.data ?? []).length === 0 ? (
          <EmptyState
            title="No payroll runs yet"
            message="Create a run for the current month to generate payslips from salary structures and attendance."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Employees</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Deductions</TableHead>
                <TableHead className="text-right">Net payout</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(runs.data ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    {periodLabel(r.period_year, r.period_month)}
                    {r.run_code ? (
                      <span className="text-muted-foreground ml-2 text-xs">{r.run_code}</span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_TONE[r.status] ?? "outline"}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{r.employee_count}</TableCell>
                  <TableCell className="text-right">{formatInr(Number(r.total_gross))}</TableCell>
                  <TableCell className="text-right">
                    {formatInr(Number(r.total_deductions))}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatInr(Number(r.total_net))}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {canRun && r.status !== "approved" && r.status !== "paid" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => process.mutate(r.id)}
                          disabled={process.isPending}
                        >
                          <Play className="mr-1 h-3.5 w-3.5" />
                          Process
                        </Button>
                      ) : null}
                      <Button size="sm" variant="ghost" asChild>
                        <Link to="/hr/payroll/$runId" params={{ runId: r.id }}>
                          Open <ArrowRight className="ml-1 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </>
  );
}

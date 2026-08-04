/**
 * Payroll run detail — the payslip register for one period, with approval and
 * payout controls and a per-employee payslip breakdown.
 */
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BadgeCheck, Banknote, Play } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import {
  getPayrollRun,
  listPayslipLines,
  listPayslips,
  processPayrollRun,
  setPayrollRunStatus,
} from "@/lib/hr/payroll-api";
import { periodLabel } from "@/lib/hr/payroll-engine";
import { formatInr } from "@/lib/format";
import { toUserMessage } from "@/lib/errors";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/hr/payroll/$runId")({
  head: () => ({
    meta: [
      { title: "Payroll run — Human Resources" },
      { name: "description", content: "Payslip register, approvals and payout for a payroll run." },
    ],
  }),
  component: PayrollRunDetail,
});

function PayrollRunDetail() {
  const { runId } = useParams({ from: "/_authenticated/hr/payroll/$runId" });
  const qc = useQueryClient();
  const roles = useRoles();
  const canManage = roles.hasAnyRole(["admin", "hr"]);
  const [openPayslip, setOpenPayslip] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"approved" | "paid" | null>(null);

  const run = useQuery({ queryKey: ["hr", "payroll-run", runId], queryFn: () => getPayrollRun(runId) });
  const slips = useQuery({ queryKey: ["hr", "payslips", runId], queryFn: () => listPayslips(runId) });
  const lines = useQuery({
    queryKey: ["hr", "payslip-lines", openPayslip],
    queryFn: () => listPayslipLines(openPayslip!),
    enabled: !!openPayslip,
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["hr", "payroll-run", runId] });
    qc.invalidateQueries({ queryKey: ["hr", "payslips", runId] });
    qc.invalidateQueries({ queryKey: ["hr", "payroll-runs"] });
  }

  const process = useMutation({
    mutationFn: () => processPayrollRun(runId),
    onSuccess: (res) => {
      refresh();
      toast.success(`${res.processed} payslips generated`);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const changeStatus = useMutation({
    mutationFn: (status: "approved" | "paid") => setPayrollRunStatus(runId, status),
    onSuccess: () => {
      refresh();
      setConfirm(null);
      toast.success("Payroll run updated");
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const current = slips.data?.find((s) => s.id === openPayslip) ?? null;
  const status = run.data?.status ?? "draft";
  const locked = status === "approved" || status === "paid";

  return (
    <>
      <PageHeader
        title={run.data ? periodLabel(run.data.period_year, run.data.period_month) : "Payroll run"}
        subtitle="Payslip register for this period. Processing recomputes every payslip from live data."
        eyebrow="Payroll"
        actions={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              {!locked ? (
                <Button
                  variant="outline"
                  onClick={() => process.mutate()}
                  disabled={process.isPending}
                >
                  <Play className="mr-2 h-4 w-4" />
                  {process.isPending ? "Processing…" : "Process"}
                </Button>
              ) : null}
              {status === "pending_approval" ? (
                <Button onClick={() => setConfirm("approved")} disabled={changeStatus.isPending}>
                  <BadgeCheck className="mr-2 h-4 w-4" />
                  Approve
                </Button>
              ) : null}
              {status === "approved" ? (
                <Button onClick={() => setConfirm("paid")} disabled={changeStatus.isPending}>
                  <Banknote className="mr-2 h-4 w-4" />
                  Mark paid
                </Button>
              ) : null}
            </div>
          ) : null
        }
      />

      {run.isError ? <ErrorBlock message={toUserMessage(run.error)} /> : null}

      {run.data ? (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Employees", value: String(run.data.employee_count) },
            { label: "Gross", value: formatInr(Number(run.data.total_gross)) },
            { label: "Deductions", value: formatInr(Number(run.data.total_deductions)) },
            { label: "Net payout", value: formatInr(Number(run.data.total_net)) },
          ].map((s) => (
            <Card key={s.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-muted-foreground text-xs font-medium uppercase">
                  {s.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{s.value}</CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <div className="min-w-0 overflow-x-auto">
        {slips.isLoading ? (
          <SkeletonTable />
        ) : slips.isError ? (
          <ErrorBlock message={toUserMessage(slips.error)} />
        ) : (slips.data ?? []).length === 0 ? (
          <EmptyState
            title="No payslips yet"
            message="Process this run to generate payslips from salary structures, attendance and pending deductions."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead className="text-right">Paid days</TableHead>
                <TableHead className="text-right">LOP</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Deductions</TableHead>
                <TableHead className="text-right">Net pay</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(slips.data ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {p.employee_name ?? "—"}
                    {p.employee_code ? (
                      <span className="text-muted-foreground ml-2 text-xs">{p.employee_code}</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right">{Number(p.payable_days)}</TableCell>
                  <TableCell className="text-right">{Number(p.lop_days)}</TableCell>
                  <TableCell className="text-right">{formatInr(Number(p.gross_earnings))}</TableCell>
                  <TableCell className="text-right">
                    {formatInr(Number(p.total_deductions))}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatInr(Number(p.net_pay))}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => setOpenPayslip(p.id)}>
                      Payslip
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={!!openPayslip} onOpenChange={(o) => !o && setOpenPayslip(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{current?.employee_name ?? "Payslip"}</DialogTitle>
            <DialogDescription>
              {run.data ? periodLabel(run.data.period_year, run.data.period_month) : ""} ·{" "}
              {current ? `${Number(current.payable_days)} paid days` : ""}
            </DialogDescription>
          </DialogHeader>
          {lines.isLoading ? (
            <SkeletonTable />
          ) : (
            <div className="space-y-4 text-sm">
              {(["earning", "deduction", "employer"] as const).map((kind) => {
                const group = (lines.data ?? []).filter((l) => l.kind === kind);
                if (group.length === 0) return null;
                return (
                  <div key={kind}>
                    <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                      {kind === "earning"
                        ? "Earnings"
                        : kind === "deduction"
                          ? "Deductions"
                          : "Employer contributions"}
                    </p>
                    <div className="divide-border divide-y rounded-md border">
                      {group.map((l) => (
                        <div key={l.id} className="flex justify-between px-3 py-1.5">
                          <span>{l.label}</span>
                          <span className="tabular-nums">{formatInr(Number(l.amount))}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {current ? (
                <div className="flex items-center justify-between rounded-md border px-3 py-2 font-medium">
                  <span>Net pay</span>
                  <Badge variant="default" className="text-sm">
                    {formatInr(Number(current.net_pay))}
                  </Badge>
                </div>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm === "paid" ? "Mark payroll as paid?" : "Approve this payroll run?"}
        description={
          confirm === "paid"
            ? "Record that salaries for this period have been disbursed."
            : "Approved runs are locked and can no longer be recalculated."
        }
        confirmLabel={confirm === "paid" ? "Mark paid" : "Approve"}
        onConfirm={() => confirm && changeStatus.mutate(confirm)}
      />
    </>
  );
}

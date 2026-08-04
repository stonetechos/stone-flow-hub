/**
 * Leave management — request, approve and track balances. Approval is a two
 * step flow (manager, then HR) so the same screen serves both audiences.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import {
  createLeaveRequest,
  getMyEmployee,
  listLeaveBalances,
  listLeaveRequests,
  listLeaveTypes,
  setLeaveStatus,
} from "@/lib/hr/api";
import { listEmployees } from "@/lib/workforce/api";
import { LEAVE_STATUS_LABEL, type LeaveStatus } from "@/lib/hr/types";
import { toUserMessage } from "@/lib/errors";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/hr/leave")({
  head: () => ({
    meta: [
      { title: "Leave Management — Human Resources" },
      { name: "description", content: "Leave requests, approvals and balances." },
    ],
  }),
  component: LeavePage,
});

function daysBetween(from: string, to: string): number {
  if (!from || !to) return 0;
  const ms = new Date(to).getTime() - new Date(from).getTime();
  if (Number.isNaN(ms) || ms < 0) return 0;
  return Math.round(ms / 86_400_000) + 1;
}

function LeavePage() {
  const qc = useQueryClient();
  const auth = useAuthReady();
  const roles = useRoles();
  const canApprove = roles.hasAnyRole(["admin", "hr", "sales_manager"]);
  const year = new Date().getFullYear();

  const [statusFilter, setStatusFilter] = useState<"all" | LeaveStatus>("all");
  const [typeId, setTypeId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");

  const me = useQuery({
    queryKey: ["hr", "me-employee", auth.user?.id],
    queryFn: () => getMyEmployee(auth.user!.id),
    enabled: !!auth.user?.id,
  });
  const types = useQuery({ queryKey: ["hr", "leave-types"], queryFn: listLeaveTypes });
  const requests = useQuery({
    queryKey: ["hr", "leave-requests", statusFilter],
    queryFn: () =>
      listLeaveRequests(statusFilter === "all" ? undefined : { status: statusFilter }),
  });
  const balances = useQuery({
    queryKey: ["hr", "leave-balances", year],
    queryFn: () => listLeaveBalances(year),
  });
  const employees = useQuery({
    queryKey: ["wf", "employees", "list", ""],
    queryFn: () => listEmployees(""),
  });

  const employeeName = useMemo(
    () => new Map((employees.data ?? []).map((e) => [e.id, e.full_name])),
    [employees.data],
  );
  const typeName = useMemo(
    () => new Map((types.data ?? []).map((t) => [t.id, t.name])),
    [types.data],
  );
  const myBalances = (balances.data ?? []).filter((b) => me.data && b.employee_id === me.data.id);
  const days = daysBetween(fromDate, toDate);

  const apply = useMutation({
    mutationFn: () => {
      if (!me.data) throw new Error("Your login is not linked to an employee record yet.");
      return createLeaveRequest({
        employee_id: me.data.id,
        leave_type_id: typeId,
        from_date: fromDate,
        to_date: toDate,
        days,
        reason: reason.trim() || null,
        manager_id: me.data.reporting_manager_id ?? null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr", "leave-requests"] });
      setTypeId("");
      setFromDate("");
      setToDate("");
      setReason("");
      toast.success("Leave request submitted");
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const decide = useMutation({
    mutationFn: (v: { id: string; status: LeaveStatus }) => setLeaveStatus(v.id, v.status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr", "leave-requests"] });
      toast.success("Request updated");
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  return (
    <>
      <PageHeader
        title="Leave management"
        subtitle="Apply for leave, track balances and clear approvals."
        eyebrow="Human Resources"
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="shadow-1">
          <CardHeader>
            <CardTitle className="text-sm">Apply for leave</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!me.data && !me.isLoading ? (
              <p className="text-sm text-muted-foreground">
                Your login isn&apos;t linked to an employee record yet, so you can&apos;t apply.
                Ask HR to link your account.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Select value={typeId} onValueChange={setTypeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Leave type" />
                    </SelectTrigger>
                    <SelectContent>
                      {(types.data ?? []).map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                  <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                </div>
                <Textarea
                  rows={2}
                  placeholder="Reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {days > 0 ? `${days} day${days > 1 ? "s" : ""}` : "Select a date range"}
                  </span>
                  <Button
                    size="sm"
                    disabled={!typeId || days <= 0 || apply.isPending || !me.data}
                    onClick={() => apply.mutate()}
                  >
                    <Plus className="mr-1 h-4 w-4" /> Submit request
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-1">
          <CardHeader>
            <CardTitle className="text-sm">My balances ({year})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {myBalances.length === 0 ? (
              <p className="text-muted-foreground">
                No leave balances allocated to you for {year} yet.
              </p>
            ) : (
              myBalances.map((b) => (
                <div key={b.id} className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {typeName.get(b.leave_type_id) ?? "Leave"}
                  </span>
                  <span className="tabular-nums">
                    {Number(b.balance_days)} of {Number(b.entitled_days)} left
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex items-end gap-2">
        <div className="min-w-48">
          <label className="mb-1 block text-xs text-muted-foreground">Status</label>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as "all" | LeaveStatus)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All requests</SelectItem>
              {(Object.keys(LEAVE_STATUS_LABEL) as LeaveStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {LEAVE_STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 min-w-0 overflow-x-auto">
        {requests.isLoading ? (
          <SkeletonTable />
        ) : requests.isError ? (
          <ErrorBlock message={toUserMessage(requests.error)} />
        ) : (requests.data ?? []).length === 0 ? (
          <EmptyState title="No leave requests" message="Requests appear here once submitted." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Status</TableHead>
                {canApprove && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(requests.data ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap">
                    {employeeName.get(r.employee_id) ?? "—"}
                  </TableCell>
                  <TableCell>{typeName.get(r.leave_type_id) ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-xs">
                    {r.from_date} → {r.to_date}
                  </TableCell>
                  <TableCell>{Number(r.days)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        r.status === "approved"
                          ? "default"
                          : r.status === "rejected" || r.status === "cancelled"
                            ? "destructive"
                            : "outline"
                      }
                    >
                      {LEAVE_STATUS_LABEL[r.status]}
                    </Badge>
                  </TableCell>
                  {canApprove && (
                    <TableCell className="text-right">
                      {(r.status === "pending" || r.status === "manager_approved") && (
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={decide.isPending}
                            onClick={() =>
                              decide.mutate({
                                id: r.id,
                                status: r.status === "pending" ? "manager_approved" : "approved",
                              })
                            }
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={decide.isPending}
                            onClick={() => decide.mutate({ id: r.id, status: "rejected" })}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </>
  );
}

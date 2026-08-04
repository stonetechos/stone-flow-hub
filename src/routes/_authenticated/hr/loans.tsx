/**
 * Loans, advances and reimbursements — the recurring deductions and one-off
 * payouts the payroll engine folds into each payslip.
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  closeLoan,
  createLoan,
  createReimbursement,
  listLoans,
  listReimbursements,
  setReimbursementStatus,
} from "@/lib/hr/payroll-api";
import { listEmployees } from "@/lib/workforce/api";
import { formatInr } from "@/lib/format";
import { toUserMessage } from "@/lib/errors";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/hr/loans")({
  head: () => ({
    meta: [
      { title: "Loans & Reimbursements — Human Resources" },
      {
        name: "description",
        content: "Employee advances, loan instalments and expense reimbursement claims.",
      },
    ],
  }),
  component: LoansPage,
});

const STATUS_TONE: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  active: "default",
  closed: "outline",
  pending: "secondary",
  approved: "default",
  paid: "default",
  rejected: "destructive",
};

function LoansPage() {
  const qc = useQueryClient();
  const roles = useRoles();
  const canWrite = roles.hasAnyRole(["admin", "hr"]);
  const today = new Date().toISOString().slice(0, 10);

  const [loanForm, setLoanForm] = useState({
    employee_id: "",
    loan_type: "advance" as "advance" | "loan",
    principal: "",
    installments_total: "1",
    start_month: today.slice(0, 8) + "01",
  });
  const [claimForm, setClaimForm] = useState({
    employee_id: "",
    claim_date: today,
    category: "travel",
    amount: "",
  });

  const employees = useQuery({
    queryKey: ["wf", "employees", "list", ""],
    queryFn: () => listEmployees(""),
  });
  const loans = useQuery({ queryKey: ["hr", "loans"], queryFn: () => listLoans() });
  const claims = useQuery({
    queryKey: ["hr", "reimbursements"],
    queryFn: () => listReimbursements(),
  });

  const nameOf = useMemo(
    () => new Map((employees.data ?? []).map((e) => [e.id, e.full_name])),
    [employees.data],
  );

  const addLoan = useMutation({
    mutationFn: () =>
      createLoan({
        employee_id: loanForm.employee_id,
        loan_type: loanForm.loan_type,
        principal: Number(loanForm.principal || 0),
        installments_total: Number(loanForm.installments_total || 1),
        start_month: loanForm.start_month,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr", "loans"] });
      setLoanForm((f) => ({ ...f, employee_id: "", principal: "" }));
      toast.success("Advance recorded");
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const close = useMutation({
    mutationFn: (id: string) => closeLoan(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr", "loans"] });
      toast.success("Loan closed");
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const addClaim = useMutation({
    mutationFn: () =>
      createReimbursement({
        employee_id: claimForm.employee_id,
        claim_date: claimForm.claim_date,
        category: claimForm.category,
        amount: Number(claimForm.amount || 0),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr", "reimbursements"] });
      setClaimForm((f) => ({ ...f, employee_id: "", amount: "" }));
      toast.success("Claim submitted");
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const decide = useMutation({
    mutationFn: (v: { id: string; status: "approved" | "rejected" }) =>
      setReimbursementStatus(v.id, v.status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr", "reimbursements"] });
      toast.success("Claim updated");
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const employeeSelect = (value: string, onChange: (v: string) => void, id: string) => (
    <div>
      <Label htmlFor={id}>Employee</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id}>
          <SelectValue placeholder="Select employee" />
        </SelectTrigger>
        <SelectContent>
          {(employees.data ?? []).map((e) => (
            <SelectItem key={e.id} value={e.id}>
              {e.full_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <>
      <PageHeader
        title="Loans & reimbursements"
        subtitle="Advances recover automatically through payroll instalments; approved claims are paid with salary."
        eyebrow="Human Resources"
      />

      <Tabs defaultValue="loans">
        <TabsList>
          <TabsTrigger value="loans">Loans & advances</TabsTrigger>
          <TabsTrigger value="claims">Reimbursements</TabsTrigger>
        </TabsList>

        <TabsContent value="loans" className="space-y-6">
          {canWrite ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">New advance or loan</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {employeeSelect(
                  loanForm.employee_id,
                  (v) => setLoanForm((f) => ({ ...f, employee_id: v })),
                  "loan-employee",
                )}
                <div>
                  <Label htmlFor="loan-type">Type</Label>
                  <Select
                    value={loanForm.loan_type}
                    onValueChange={(v) =>
                      setLoanForm((f) => ({ ...f, loan_type: v as "advance" | "loan" }))
                    }
                  >
                    <SelectTrigger id="loan-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="advance">Advance</SelectItem>
                      <SelectItem value="loan">Loan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="loan-principal">Amount</Label>
                  <Input
                    id="loan-principal"
                    inputMode="numeric"
                    value={loanForm.principal}
                    onChange={(e) => setLoanForm((f) => ({ ...f, principal: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="loan-installments">Instalments</Label>
                  <Input
                    id="loan-installments"
                    inputMode="numeric"
                    value={loanForm.installments_total}
                    onChange={(e) =>
                      setLoanForm((f) => ({ ...f, installments_total: e.target.value }))
                    }
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={() => addLoan.mutate()} disabled={addLoan.isPending}>
                    <Plus className="mr-2 h-4 w-4" />
                    {addLoan.isPending ? "Saving…" : "Record"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <div className="min-w-0 overflow-x-auto">
            {loans.isLoading ? (
              <SkeletonTable />
            ) : loans.isError ? (
              <ErrorBlock message={toUserMessage(loans.error)} />
            ) : (loans.data ?? []).length === 0 ? (
              <EmptyState
                title="No advances recorded"
                message="Salary advances and loans appear here and recover automatically through payroll."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Principal</TableHead>
                    <TableHead className="text-right">Instalment</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(loans.data ?? []).map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">
                        {nameOf.get(l.employee_id) ?? "—"}
                      </TableCell>
                      <TableCell className="capitalize">{l.loan_type}</TableCell>
                      <TableCell className="text-right">{formatInr(Number(l.principal))}</TableCell>
                      <TableCell className="text-right">
                        {formatInr(Number(l.installment_amount))}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatInr(Number(l.outstanding))}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_TONE[l.status] ?? "outline"}>{l.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {canWrite && l.status === "active" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => close.mutate(l.id)}
                            disabled={close.isPending}
                          >
                            Close
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="claims" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">New claim</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {employeeSelect(
                claimForm.employee_id,
                (v) => setClaimForm((f) => ({ ...f, employee_id: v })),
                "claim-employee",
              )}
              <div>
                <Label htmlFor="claim-date">Claim date</Label>
                <Input
                  id="claim-date"
                  type="date"
                  value={claimForm.claim_date}
                  onChange={(e) => setClaimForm((f) => ({ ...f, claim_date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="claim-category">Category</Label>
                <Select
                  value={claimForm.category}
                  onValueChange={(v) => setClaimForm((f) => ({ ...f, category: v }))}
                >
                  <SelectTrigger id="claim-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["travel", "food", "fuel", "lodging", "site", "other"].map((c) => (
                      <SelectItem key={c} value={c} className="capitalize">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="claim-amount">Amount</Label>
                <Input
                  id="claim-amount"
                  inputMode="numeric"
                  value={claimForm.amount}
                  onChange={(e) => setClaimForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={() => addClaim.mutate()} disabled={addClaim.isPending}>
                  <Plus className="mr-2 h-4 w-4" />
                  {addClaim.isPending ? "Submitting…" : "Submit"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="min-w-0 overflow-x-auto">
            {claims.isLoading ? (
              <SkeletonTable />
            ) : claims.isError ? (
              <ErrorBlock message={toUserMessage(claims.error)} />
            ) : (claims.data ?? []).length === 0 ? (
              <EmptyState
                title="No claims yet"
                message="Approved reimbursement claims are paid out with the next payroll run."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(claims.data ?? []).map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        {nameOf.get(c.employee_id) ?? "—"}
                      </TableCell>
                      <TableCell>{c.claim_date}</TableCell>
                      <TableCell className="capitalize">{c.category}</TableCell>
                      <TableCell className="text-right">{formatInr(Number(c.amount))}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_TONE[c.status] ?? "outline"}>{c.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {canWrite && c.status === "pending" ? (
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Approve claim"
                              onClick={() => decide.mutate({ id: c.id, status: "approved" })}
                              disabled={decide.isPending}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Reject claim"
                              onClick={() => decide.mutate({ id: c.id, status: "rejected" })}
                              disabled={decide.isPending}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}

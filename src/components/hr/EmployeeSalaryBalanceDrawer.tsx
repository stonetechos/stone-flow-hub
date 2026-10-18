import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  CheckCircle2,
  DollarSign,
  MessageSquare,
  Plus,
  Trash2,
  User,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  cancelEmployeePayment,
  formatMonthLabel,
  generateEmployeePaymentWhatsAppMessage,
  type EmployeeSalaryMonthBalance,
  type EmployeePayment,
} from "@/lib/hr/employee-payments";
import { formatInr } from "@/lib/format";
import { toUserMessage } from "@/lib/errors";
import { openWhatsappToContact } from "@/lib/whatsapp";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balance: EmployeeSalaryMonthBalance | null;
  payrollMonth: string;
  onRecordNewPayment?: (employeeId: string) => void;
}

export function EmployeeSalaryBalanceDrawer({
  open,
  onOpenChange,
  balance,
  payrollMonth,
  onRecordNewPayment,
}: Props) {
  const qc = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const cancelMut = useMutation({
    mutationFn: (paymentId: string) => cancelEmployeePayment(paymentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr", "employee-payments"] });
      qc.invalidateQueries({ queryKey: ["hr", "salary-balances"] });
      qc.invalidateQueries({ queryKey: ["hr", "payroll-runs"] });
      toast.success("Payment removed");
      setDeleteId(null);
    },
    onError: (err) => {
      toast.error(toUserMessage(err));
    },
  });

  if (!balance) return null;

  const monthLabel = formatMonthLabel(payrollMonth);

  function handleShareWhatsApp() {
    if (!balance || !balance.phone) {
      toast.error("Employee does not have a registered phone number for WhatsApp.");
      return;
    }

    const latestPayment = balance.payments[0];

    const msg = generateEmployeePaymentWhatsAppMessage({
      employeeName: balance.employeeName,
      amount: balance.totalIntermediatePaid,
      paymentType: latestPayment?.payment_type || "advance",
      paymentMethod:
        latestPayment?.account_name || latestPayment?.payment_method || "Direct Transfer",
      paymentDate: latestPayment?.payment_date || new Date().toISOString().slice(0, 10),
      payrollMonth,
      totalPaidThisMonth: balance.totalIntermediatePaid,
      remainingSalaryDue: balance.remainingSalaryDue,
      notes: latestPayment?.notes || "Monthly intermediate payments statement",
    });

    openWhatsappToContact(balance.phone, msg);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {balance.employeeName.charAt(0)}
                </div>
                <div>
                  <DialogTitle className="text-base font-bold">{balance.employeeName}</DialogTitle>
                  <DialogDescription className="text-xs">
                    {balance.employeeCode ? `${balance.employeeCode} • ` : ""}
                    {balance.department ? `${balance.department} • ` : ""}
                    Month: <span className="font-semibold text-foreground">{monthLabel}</span>
                  </DialogDescription>
                </div>
              </div>

              {balance.phone && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
                  onClick={handleShareWhatsApp}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  WhatsApp
                </Button>
              )}
            </div>
          </DialogHeader>

          {/* Month Financial Status Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
            <div className="rounded-lg border bg-card p-3 space-y-1">
              <span className="text-[11px] text-muted-foreground uppercase font-medium">
                Base Net Salary
              </span>
              <div className="text-lg font-bold tabular-nums">
                {formatInr(balance.estimatedNetSalary)}
              </div>
              <span className="text-[10px] text-muted-foreground block">Standard monthly pay</span>
            </div>

            <div className="rounded-lg border bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 p-3 space-y-1">
              <span className="text-[11px] text-amber-800 dark:text-amber-300 uppercase font-medium">
                Intermediate Paid
              </span>
              <div className="text-lg font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                {formatInr(balance.totalIntermediatePaid)}
              </div>
              <span className="text-[10px] text-amber-600 dark:text-amber-500 block">
                {balance.payments.length} payment{balance.payments.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 p-3 space-y-1 sm:col-span-2">
              <span className="text-[11px] text-emerald-800 dark:text-emerald-300 uppercase font-medium">
                Remaining Salary Due After Month Ends
              </span>
              <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                {balance.remainingSalaryDue > 0
                  ? formatInr(balance.remainingSalaryDue)
                  : balance.advanceExcess > 0
                    ? `₹0 (Surplus ${formatInr(balance.advanceExcess)})`
                    : "₹0 (Fully Paid)"}
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-500 block">
                {balance.remainingSalaryDue > 0
                  ? "To be disbursed after month concludes"
                  : "All monthly dues cleared"}
              </span>
            </div>
          </div>

          {/* Intermediate Payments Ledger */}
          <div className="space-y-3 pt-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <Wallet className="h-4 w-4 text-primary" />
                Intermediate Payments Recorded ({balance.payments.length})
              </h4>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-xs h-7"
                onClick={() => {
                  onOpenChange(false);
                  onRecordNewPayment?.(balance.employeeId);
                }}
              >
                <Plus className="h-3 w-3" /> Add Payment
              </Button>
            </div>

            {balance.payments.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No intermediate payments or advances recorded for {balance.employeeName} in{" "}
                {monthLabel}.
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs gap-1.5"
                    onClick={() => {
                      onOpenChange(false);
                      onRecordNewPayment?.(balance.employeeId);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Record First Payment
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Method / Account</TableHead>
                      <TableHead className="text-xs">Ref / Notes</TableHead>
                      <TableHead className="text-xs text-right">Amount</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {balance.payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-xs font-medium whitespace-nowrap">
                          {p.payment_date}
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {p.payment_type.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {p.account_name || p.payment_method}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                          {p.reference_no ? `${p.reference_no} • ` : ""}
                          {p.notes || "—"}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-right tabular-nums text-foreground">
                          {formatInr(p.amount)}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteId(p.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(op) => !op && setDeleteId(null)}
        title="Remove Payment Record"
        description="Are you sure you want to remove this payment entry? This will adjust the employee's remaining salary balance."
        confirmLabel="Remove Payment"
        tone="danger"
        busy={cancelMut.isPending}
        onConfirm={() => deleteId && cancelMut.mutate(deleteId)}
      />
    </>
  );
}

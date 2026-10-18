import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Banknote, Check, Plus, MessageSquare } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listEmployees } from "@/lib/workforce/api";
import {
  EMPLOYEE_PAYMENT_METHODS,
  EMPLOYEE_PAYMENT_TYPES,
  currentMonthStr,
  formatMonthLabel,
  generateEmployeePaymentWhatsAppMessage,
  recordEmployeePayment,
  listCompanySalaryBalances,
  type EmployeePaymentType,
  type EmployeePaymentMethodId,
} from "@/lib/hr/employee-payments";
import { formatInr } from "@/lib/format";
import { toUserMessage } from "@/lib/errors";
import { openWhatsappToContact } from "@/lib/whatsapp";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEmployeeId?: string;
  defaultMonth?: string;
  onSuccess?: () => void;
}

export function RecordEmployeePaymentDialog({
  open,
  onOpenChange,
  defaultEmployeeId,
  defaultMonth,
  onSuccess,
}: Props) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const selectedMonth = defaultMonth || currentMonthStr();

  const [employeeId, setEmployeeId] = useState(defaultEmployeeId || "");
  const [paymentDate, setPaymentDate] = useState(today);
  const [amount, setAmount] = useState("");
  const [paymentType, setPaymentType] = useState<EmployeePaymentType>("advance");
  const [paymentMethod, setPaymentMethod] = useState<EmployeePaymentMethodId>("upi_personal_rishi");
  const [referenceNo, setReferenceNo] = useState("");
  const [isDeducted, setIsDeducted] = useState(true);
  const [notes, setNotes] = useState("");
  const [shareWhatsApp, setShareWhatsApp] = useState(false);

  useEffect(() => {
    if (open) {
      if (defaultEmployeeId) setEmployeeId(defaultEmployeeId);
      setPaymentDate(today);
      setAmount("");
      setReferenceNo("");
      setNotes("");
      setShareWhatsApp(false);
      setIsDeducted(true);
    }
  }, [open, defaultEmployeeId, today]);

  const employeesQ = useQuery({
    queryKey: ["wf", "employees", "list", ""],
    queryFn: () => listEmployees(""),
    enabled: open,
  });

  const salaryBalancesQ = useQuery({
    queryKey: ["hr", "salary-balances", selectedMonth],
    queryFn: () => listCompanySalaryBalances(selectedMonth),
    enabled: open && Boolean(employeeId),
  });

  const activeEmployees = (employeesQ.data ?? []).filter((e) => e.employment_status === "active");

  const selectedBalance = salaryBalancesQ.data?.balances.find((b) => b.employeeId === employeeId);

  const selectedEmployee = activeEmployees.find((e) => e.id === employeeId);

  // Calculate live preview of remaining balance
  const parsedAmount = Math.max(0, Number(amount) || 0);
  const currentRemaining = selectedBalance?.remainingSalaryDue ?? 0;
  const newRemaining = isDeducted ? Math.max(0, currentRemaining - parsedAmount) : currentRemaining;
  const advanceExcess = isDeducted
    ? Math.max(
        0,
        (selectedBalance?.totalIntermediatePaid ?? 0) +
          parsedAmount -
          (selectedBalance?.estimatedNetSalary ?? 0),
      )
    : 0;

  const recordMut = useMutation({
    mutationFn: async () => {
      if (!employeeId) throw new Error("Please select an employee");
      if (!parsedAmount || parsedAmount <= 0) {
        throw new Error("Please enter a valid payment amount");
      }

      const methodObj = EMPLOYEE_PAYMENT_METHODS.find((m) => m.id === paymentMethod);

      const payment = await recordEmployeePayment({
        employee_id: employeeId,
        payment_date: paymentDate,
        amount: parsedAmount,
        payment_type: paymentType,
        payment_method: paymentMethod,
        account_name: methodObj?.account || paymentMethod,
        reference_no: referenceNo || null,
        payroll_month: selectedMonth,
        is_deducted_from_payroll: isDeducted,
        notes: notes || null,
      });

      return { payment, methodLabel: methodObj?.label || paymentMethod };
    },
    onSuccess: ({ payment, methodLabel }) => {
      qc.invalidateQueries({ queryKey: ["hr", "employee-payments"] });
      qc.invalidateQueries({ queryKey: ["hr", "salary-balances"] });
      qc.invalidateQueries({ queryKey: ["hr", "payroll-runs"] });
      qc.invalidateQueries({ queryKey: ["hr", "loans"] });

      toast.success(
        `Payment of ${formatInr(parsedAmount)} recorded for ${selectedEmployee?.full_name || "employee"}`,
      );

      if (shareWhatsApp && selectedEmployee?.phone) {
        const msg = generateEmployeePaymentWhatsAppMessage({
          employeeName: selectedEmployee.full_name,
          amount: parsedAmount,
          paymentType,
          paymentMethod: methodLabel,
          paymentDate,
          referenceNo: referenceNo || null,
          payrollMonth: selectedMonth,
          totalPaidThisMonth: (selectedBalance?.totalIntermediatePaid ?? 0) + parsedAmount,
          remainingSalaryDue: newRemaining,
          notes: notes || null,
        });

        openWhatsappToContact(selectedEmployee.phone, msg);
      }

      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(toUserMessage(err));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Banknote className="h-5 w-5 text-emerald-600" />
            Record Employee Payment / Intermediate Advance
          </DialogTitle>
          <DialogDescription>
            Input any intermediate payment, salary advance, or mid-month payout for{" "}
            <span className="font-semibold text-foreground">{formatMonthLabel(selectedMonth)}</span>
            .
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Employee Picker */}
          <div className="space-y-1.5">
            <Label htmlFor="emp-select">Employee *</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger id="emp-select" className="w-full">
                <SelectValue placeholder="Select an active employee" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {activeEmployees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.full_name} {e.employee_code ? `(${e.employee_code})` : ""}{" "}
                    {e.department ? `• ${e.department}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Live Salary Balance Radar */}
          {selectedBalance && (
            <div className="rounded-lg border border-border/80 bg-muted/40 p-3 text-xs space-y-1.5">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>
                  Month:{" "}
                  <strong className="text-foreground">{formatMonthLabel(selectedMonth)}</strong>
                </span>
                <span>
                  Base Net Salary:{" "}
                  <strong className="text-foreground">
                    {formatInr(selectedBalance.estimatedNetSalary)}
                  </strong>
                </span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>
                  Already Paid This Month:{" "}
                  <strong className="text-amber-600 dark:text-amber-400">
                    {formatInr(selectedBalance.totalIntermediatePaid)}
                  </strong>
                </span>
                <span>
                  Current Remaining Due:{" "}
                  <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    {formatInr(selectedBalance.remainingSalaryDue)}
                  </strong>
                </span>
              </div>
              {parsedAmount > 0 && isDeducted && (
                <div className="pt-1.5 border-t border-border/60 flex justify-between items-center font-medium">
                  <span className="text-muted-foreground">Remaining after this payment:</span>
                  <span
                    className={
                      newRemaining > 0
                        ? "text-emerald-600 font-bold text-sm"
                        : "text-primary font-bold text-sm"
                    }
                  >
                    {newRemaining > 0
                      ? formatInr(newRemaining) + " Due at Month-End"
                      : advanceExcess > 0
                        ? `₹0 Due (+ ${formatInr(advanceExcess)} Advance Surplus)`
                        : "₹0 Due (Fully Paid)"}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Payment Date & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="payment-date">Payment Date *</Label>
              <Input
                id="payment-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment-amount">Amount (₹) *</Label>
              <Input
                id="payment-amount"
                type="number"
                placeholder="e.g. 5000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
                step="1"
              />
            </div>
          </div>

          {/* Payment Type & Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="payment-type">Payment Type</Label>
              <Select
                value={paymentType}
                onValueChange={(val) => {
                  const t = val as EmployeePaymentType;
                  setPaymentType(t);
                  const opt = EMPLOYEE_PAYMENT_TYPES.find((o) => o.id === t);
                  if (opt) setIsDeducted(opt.defaultDeduct);
                }}
              >
                <SelectTrigger id="payment-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYEE_PAYMENT_TYPES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="payment-method">Payment Method / Account *</Label>
              <Select
                value={paymentMethod}
                onValueChange={(val) => setPaymentMethod(val as EmployeePaymentMethodId)}
              >
                <SelectTrigger id="payment-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYEE_PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reference / UTR Number */}
          <div className="space-y-1.5">
            <Label htmlFor="payment-ref">Reference No / UTR / Cheque (Optional)</Label>
            <Input
              id="payment-ref"
              placeholder="e.g. UPI/42981204981 or Cheque #10492"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
            />
          </div>

          {/* Deduct checkbox */}
          <div className="flex items-start space-x-2 pt-1">
            <Checkbox
              id="deduct-checkbox"
              checked={isDeducted}
              onCheckedChange={(checked) => setIsDeducted(Boolean(checked))}
            />
            <div className="grid gap-1 leading-none">
              <label
                htmlFor="deduct-checkbox"
                className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Deduct from month-end salary payout
              </label>
              <p className="text-[11px] text-muted-foreground">
                When checked, this amount reduces the remaining net salary due to the employee at
                month end.
              </p>
            </div>
          </div>

          {/* Notes / Remarks */}
          <div className="space-y-1.5">
            <Label htmlFor="payment-notes">Remarks / Purpose (Optional)</Label>
            <Textarea
              id="payment-notes"
              placeholder="e.g. Festival advance, Medical emergency, Mid-month allowance..."
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* WhatsApp option */}
          {selectedEmployee?.phone && (
            <div className="flex items-center space-x-2 rounded-md bg-emerald-50 dark:bg-emerald-950/30 p-2.5 border border-emerald-200 dark:border-emerald-800">
              <Checkbox
                id="whatsapp-checkbox"
                checked={shareWhatsApp}
                onCheckedChange={(checked) => setShareWhatsApp(Boolean(checked))}
              />
              <label
                htmlFor="whatsapp-checkbox"
                className="text-xs font-medium text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5 cursor-pointer"
              >
                <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                Send payment voucher receipt &amp; updated remaining salary to employee&apos;s
                WhatsApp
              </label>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} type="button">
            Cancel
          </Button>
          <Button
            onClick={() => recordMut.mutate()}
            disabled={!employeeId || parsedAmount <= 0 || recordMut.isPending}
            className="gap-1.5"
          >
            {recordMut.isPending ? (
              "Saving…"
            ) : (
              <>
                <Check className="h-4 w-4" />
                Record Payment
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

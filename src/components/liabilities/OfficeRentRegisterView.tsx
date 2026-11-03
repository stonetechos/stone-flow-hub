import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Calendar,
  CreditCard,
  Plus,
  Trash2,
  RefreshCw,
  ShieldAlert,
  Wrench,
  DollarSign,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { formatInr, formatDate } from "@/lib/format";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/forms/Field";
import { CurrencyInput } from "@/components/forms/inputs/SmartInputs";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import {
  getOfficeRentRegister,
  saveOfficeRentRegister,
  getRentReconciliation,
} from "@/lib/liabilities/rent-register.api";
import type {
  OfficeRentRegisterData,
  RentPaymentRecord,
  MaintenanceAmcRecord,
  OfficeRentSettings,
  SecurityDepositLedger,
  MonthlyRentScheduleRow,
} from "@/lib/liabilities/rent-register.types";

interface Props {
  canWrite?: boolean;
}

export function OfficeRentRegisterView({ canWrite = true }: Props) {
  const qc = useQueryClient();

  const {
    data: register,
    isLoading,
    error,
  } = useQuery({
    queryKey: qk.liabilities.rentRegister(),
    queryFn: getOfficeRentRegister,
  });

  const reconciliationResult = useMemo(() => {
    if (!register) return null;
    return getRentReconciliation(register);
  }, [register]);

  const saveMutation = useMutation({
    mutationFn: (newData: OfficeRentRegisterData) => saveOfficeRentRegister(newData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.liabilities.rentRegister() });
      toast.success("Office rent register updated successfully");
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  // Dialog States
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<RentPaymentRecord | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<RentPaymentRecord | null>(null);

  const [paymentForm, setPaymentForm] = useState<Omit<RentPaymentRecord, "id" | "createdAt">>({
    paymentDate: new Date().toISOString().slice(0, 10),
    monthFor: new Date().toISOString().slice(0, 7),
    amount: 0,
    paymentMode: "Cheque",
    referenceNo: "",
    chequeDate: "",
    bankName: "",
    notes: "",
  });

  // Maintenance Dialog
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<MaintenanceAmcRecord | null>(null);
  const [maintenanceToDelete, setMaintenanceToDelete] = useState<MaintenanceAmcRecord | null>(null);

  const [maintenanceForm, setMaintenanceForm] = useState<
    Omit<MaintenanceAmcRecord, "id" | "createdAt">
  >({
    type: "Society Maintenance",
    title: "",
    periodLabel: "",
    billDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    amount: 0,
    paidAmount: 0,
    isPaid: false,
    paymentDate: "",
    paymentRef: "",
    notes: "",
  });

  // Deposit Edit Dialog
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [depositForm, setDepositForm] = useState<SecurityDepositLedger | null>(null);

  // Settings Edit Dialog
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState<OfficeRentSettings | null>(null);

  // Handlers
  const handleOpenAddPayment = (defaultMonth?: string, defaultAmount?: number) => {
    setEditingPayment(null);
    setPaymentForm({
      paymentDate: new Date().toISOString().slice(0, 10),
      monthFor: defaultMonth || new Date().toISOString().slice(0, 7),
      amount: defaultAmount || register?.settings.monthlyRent || 0,
      paymentMode: "Cheque",
      referenceNo: "",
      chequeDate: "",
      bankName: "",
      notes: "",
    });
    setPaymentDialogOpen(true);
  };

  const handleOpenEditPayment = (payment: RentPaymentRecord) => {
    setEditingPayment(payment);
    setPaymentForm({
      paymentDate: payment.paymentDate,
      monthFor: payment.monthFor,
      amount: payment.amount,
      paymentMode: payment.paymentMode,
      referenceNo: payment.referenceNo || "",
      chequeDate: payment.chequeDate || "",
      bankName: payment.bankName || "",
      notes: payment.notes || "",
    });
    setPaymentDialogOpen(true);
  };

  const handleSavePayment = () => {
    if (!register) return;
    if (paymentForm.amount <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    let updatedPayments: RentPaymentRecord[];
    if (editingPayment) {
      updatedPayments = register.payments.map((p) =>
        p.id === editingPayment.id
          ? {
              ...p,
              ...paymentForm,
            }
          : p,
      );
    } else {
      const newPayment: RentPaymentRecord = {
        id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        ...paymentForm,
        createdAt: new Date().toISOString(),
      };
      updatedPayments = [newPayment, ...register.payments];
    }

    saveMutation.mutate(
      { ...register, payments: updatedPayments, updatedAt: new Date().toISOString() },
      { onSuccess: () => setPaymentDialogOpen(false) },
    );
  };

  const handleDeletePayment = (payment: RentPaymentRecord) => {
    if (!register) return;
    const updatedPayments = register.payments.filter((p) => p.id !== payment.id);
    saveMutation.mutate(
      { ...register, payments: updatedPayments, updatedAt: new Date().toISOString() },
      { onSuccess: () => setPaymentToDelete(null) },
    );
  };

  // Maintenance Handlers
  const handleOpenAddMaintenance = () => {
    setEditingMaintenance(null);
    setMaintenanceForm({
      type: "Society Maintenance",
      title: "Society Maintenance",
      periodLabel: new Date().toLocaleString("en-US", { month: "short", year: "numeric" }),
      billDate: new Date().toISOString().slice(0, 10),
      dueDate: "",
      amount: 0,
      paidAmount: 0,
      isPaid: false,
      paymentDate: "",
      paymentRef: "",
      notes: "",
    });
    setMaintenanceDialogOpen(true);
  };

  const handleOpenEditMaintenance = (m: MaintenanceAmcRecord) => {
    setEditingMaintenance(m);
    setMaintenanceForm({
      type: m.type,
      title: m.title,
      periodLabel: m.periodLabel,
      billDate: m.billDate || "",
      dueDate: m.dueDate || "",
      amount: m.amount,
      paidAmount: m.paidAmount,
      isPaid: m.isPaid,
      paymentDate: m.paymentDate || "",
      paymentRef: m.paymentRef || "",
      notes: m.notes || "",
    });
    setMaintenanceDialogOpen(true);
  };

  const handleSaveMaintenance = () => {
    if (!register) return;
    if (maintenanceForm.amount <= 0) {
      toast.error("Please enter a valid bill amount");
      return;
    }

    const isFullyPaid = maintenanceForm.paidAmount >= maintenanceForm.amount;
    let updatedList: MaintenanceAmcRecord[];
    if (editingMaintenance) {
      updatedList = register.maintenance.map((m) =>
        m.id === editingMaintenance.id
          ? {
              ...m,
              ...maintenanceForm,
              isPaid: isFullyPaid,
            }
          : m,
      );
    } else {
      const newRec: MaintenanceAmcRecord = {
        id: `maint_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        ...maintenanceForm,
        isPaid: isFullyPaid,
        createdAt: new Date().toISOString(),
      };
      updatedList = [newRec, ...register.maintenance];
    }

    saveMutation.mutate(
      { ...register, maintenance: updatedList, updatedAt: new Date().toISOString() },
      { onSuccess: () => setMaintenanceDialogOpen(false) },
    );
  };

  const handleDeleteMaintenance = (m: MaintenanceAmcRecord) => {
    if (!register) return;
    const updatedList = register.maintenance.filter((item) => item.id !== m.id);
    saveMutation.mutate(
      { ...register, maintenance: updatedList, updatedAt: new Date().toISOString() },
      { onSuccess: () => setMaintenanceToDelete(null) },
    );
  };

  // Deposit Handlers
  const handleOpenDeposit = () => {
    if (!register) return;
    setDepositForm({ ...register.deposit });
    setDepositDialogOpen(true);
  };

  const handleSaveDeposit = () => {
    if (!register || !depositForm) return;
    saveMutation.mutate(
      { ...register, deposit: depositForm, updatedAt: new Date().toISOString() },
      { onSuccess: () => setDepositDialogOpen(false) },
    );
  };

  // Settings Handlers
  const handleOpenSettings = () => {
    if (!register) return;
    setSettingsForm({ ...register.settings });
    setSettingsDialogOpen(true);
  };

  const handleSaveSettings = () => {
    if (!register || !settingsForm) return;
    saveMutation.mutate(
      { ...register, settings: settingsForm, updatedAt: new Date().toISOString() },
      { onSuccess: () => setSettingsDialogOpen(false) },
    );
  };

  const handleToggleDepositOffset = (offset: boolean) => {
    if (!register) return;
    saveMutation.mutate({
      ...register,
      deposit: { ...register.deposit, offsetAgainstRent: offset },
      updatedAt: new Date().toISOString(),
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading office rent and tenancy register...
        </div>
      </div>
    );
  }

  if (error || !register || !reconciliationResult) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive">
        Failed to load office rent register.
      </div>
    );
  }

  const { settings, deposit, payments, maintenance } = register;
  const { schedule, reconciliation } = reconciliationResult;
  const {
    totalRentAccrued,
    totalRentPaid,
    netRentOutstanding,
    depositShortfallOwedByLandlord,
    totalMaintenanceBilled,
    totalMaintenancePaid,
    netMaintenanceOutstanding,
    grossPayable,
    optimalNetPayable,
    currentMonthAdvanceDue,
    currentMonthDueDate,
    currentMonthKey,
  } = reconciliation;

  return (
    <div className="space-y-6">
      {/* Property & Tenancy Context Header Card */}
      <div className="rounded-lg border border-border bg-card p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground tracking-tight">
                {settings.propertyName}
              </h2>
              <Badge
                variant="outline"
                className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
              >
                Advance Rent (Due {settings.dueDayOfMonth}th)
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {settings.propertyAddress} • Landlord:{" "}
              <span className="font-medium text-foreground">{settings.landlordName}</span>
              {settings.landlordPhone && ` (${settings.landlordPhone})`} • Baseline Month:{" "}
              <span className="font-semibold text-foreground">Feb 2025 (Cleared)</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canWrite && (
              <>
                <Button variant="outline" size="sm" onClick={handleOpenSettings}>
                  Edit Tenancy Terms
                </Button>
                <Button variant="outline" size="sm" onClick={handleOpenDeposit} className="gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-amber-500" />
                  Deposit Ledger
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleOpenAddPayment()}
                  className="gap-1.5 bg-primary"
                >
                  <Plus className="h-4 w-4" />
                  Record Rent Payment
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards — The Optimum Calculation Engine */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Optimum Net Payable */}
        <Card className="p-4 border-2 border-primary/40 bg-gradient-to-br from-primary/5 via-card to-background shadow-sm">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Optimal Net Payable
            </span>
            <div className="rounded-full bg-primary/20 p-1.5 text-primary">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-primary">
            {formatInr(optimalNetPayable)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {deposit.offsetAgainstRent && depositShortfallOwedByLandlord > 0 ? (
                <span className="text-emerald-600 font-medium">
                  Includes -{formatInr(depositShortfallOwedByLandlord)} deposit offset
                </span>
              ) : (
                <span>Gross: {formatInr(grossPayable)}</span>
              )}
            </span>
            <span className="font-medium text-foreground">
              Rent + AMC {deposit.offsetAgainstRent ? "- Deposit" : ""}
            </span>
          </div>
        </Card>

        {/* Card 2: Current Month Rent (Advance Due by 5th) */}
        <Card className="p-4 border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Advance Rent ({currentMonthKey})
            </span>
            <div className="rounded-full bg-blue-500/10 p-1.5 text-blue-600">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {formatInr(currentMonthAdvanceDue)}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Due on or before{" "}
            <strong className="text-foreground">{formatDate(currentMonthDueDate)}</strong>
            {currentMonthAdvanceDue === 0 && (
              <span className="ml-1 text-emerald-600 font-medium">✓ Fully Paid</span>
            )}
          </p>
        </Card>

        {/* Card 3: Landlord Deposit Mismatch / Shortfall */}
        <Card className="p-4 border border-amber-500/30 bg-amber-500/5 shadow-sm">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-medium uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Deposit Landlord Shortfall
            </span>
            <div className="rounded-full bg-amber-500/20 p-1.5 text-amber-600">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
            {formatInr(depositShortfallOwedByLandlord)}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Unreturned old deposit owed by landlord.
          </p>
        </Card>

        {/* Card 4: Unpaid Society Maintenance / AMC */}
        <Card className="p-4 border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Unpaid Maintenance & AMC
            </span>
            <div className="rounded-full bg-rose-500/10 p-1.5 text-rose-600">
              <Wrench className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
            {formatInr(netMaintenanceOutstanding)}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Billed: {formatInr(totalMaintenanceBilled)} • Paid: {formatInr(totalMaintenancePaid)}
          </p>
        </Card>
      </div>

      {/* Optimum Calculation Reconciled Breakdown Card */}
      <Card className="p-5 border border-primary/20 bg-card shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <h3 className="font-semibold text-foreground text-base flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              Optimum Payment Calculation Engine & Tenancy Settlement
            </h3>
            <p className="text-xs text-muted-foreground">
              Mathematically reconciles monthly advance rents, unreturned deposit cheque
              discrepancy, and society AMC.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-muted/50 px-3 py-1.5 rounded-md border border-border">
            <span className="text-xs font-medium text-foreground">Offset Unreturned Deposit:</span>
            <Switch
              checked={deposit.offsetAgainstRent}
              onCheckedChange={handleToggleDepositOffset}
              disabled={!canWrite}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3 rounded-md bg-muted/40 space-y-1 border border-border">
            <div className="text-muted-foreground">1. Total Rent Scheduled</div>
            <div className="text-sm font-semibold text-foreground">
              {formatInr(totalRentAccrued)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              Paid: {formatInr(totalRentPaid)} • Pending: {formatInr(netRentOutstanding)}
            </div>
          </div>

          <div className="p-3 rounded-md bg-muted/40 space-y-1 border border-border">
            <div className="text-muted-foreground">2. Unpaid Maintenance & AMC</div>
            <div className="text-sm font-semibold text-rose-600">
              {formatInr(netMaintenanceOutstanding)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {maintenance.filter((m) => m.amount > m.paidAmount).length} unpaid bills pending
            </div>
          </div>

          <div className="p-3 rounded-md bg-muted/40 space-y-1 border border-border">
            <div className="text-muted-foreground">3. Landlord Deposit Shortfall</div>
            <div className="text-sm font-semibold text-amber-600">
              {deposit.offsetAgainstRent
                ? `- ${formatInr(depositShortfallOwedByLandlord)}`
                : "Not Offset"}
            </div>
            <div className="text-[11px] text-muted-foreground">
              Landlord kept {formatInr(depositShortfallOwedByLandlord)} of old deposit
            </div>
          </div>

          <div className="p-3 rounded-md bg-primary/10 border border-primary/30 space-y-1">
            <div className="text-primary font-medium">Final Optimum Due to Pay</div>
            <div className="text-base font-bold text-primary">{formatInr(optimalNetPayable)}</div>
            <div className="text-[11px] text-muted-foreground">
              Exact net check / transfer amount
            </div>
          </div>
        </div>
      </Card>

      {/* Section 1: Monthly Advance Rent Schedule & Ledgers (from Feb 2025 onwards) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Monthly Advance Rent Schedule (Feb 2025 – Present)
            </h3>
            <p className="text-xs text-muted-foreground">
              Rent is payable in advance before the 5th of each respective month. Feb 2025 was fully
              cleared baseline.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenAddPayment()}
              className="text-xs gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Payment Entry
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-md border border-border bg-card shadow-sm">
          <Table className="w-full text-xs">
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-36">Month</TableHead>
                <TableHead className="w-32">Due Date</TableHead>
                <TableHead className="w-28 text-right">Rent Due</TableHead>
                <TableHead className="w-28 text-right">Paid</TableHead>
                <TableHead className="w-28 text-right">Balance</TableHead>
                <TableHead className="w-32 text-center">Status</TableHead>
                <TableHead>Payment Details / Cheque Ref</TableHead>
                <TableHead className="w-24 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedule.map((row: MonthlyRentScheduleRow) => {
                const monthPayments = payments.filter((p) => p.monthFor === row.monthKey);
                const isCurrent = row.monthKey === currentMonthKey;
                const isBaseline = row.monthKey === settings.startMonth;

                return (
                  <TableRow
                    key={row.monthKey}
                    className={isCurrent ? "bg-primary/5 font-medium" : undefined}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1.5">
                        {row.monthLabel}
                        {isCurrent && (
                          <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                            Current
                          </Badge>
                        )}
                        {isBaseline && (
                          <Badge
                            variant="outline"
                            className="text-[10px] py-0 px-1.5 text-muted-foreground"
                          >
                            Baseline
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(row.dueDate)}
                    </TableCell>
                    <TableCell className="text-right">{formatInr(row.rentDue)}</TableCell>
                    <TableCell className="text-right text-emerald-600 font-medium">
                      {formatInr(row.totalPaid)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-semibold ${
                        row.balanceDue > 0 ? "text-rose-600" : "text-emerald-600"
                      }`}
                    >
                      {formatInr(row.balanceDue)}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.status === "cleared" && (
                        <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">
                          Cleared (Base)
                        </Badge>
                      )}
                      {row.status === "paid" && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                        >
                          Paid in Full
                        </Badge>
                      )}
                      {row.status === "partial" && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30"
                        >
                          Partial Paid
                        </Badge>
                      )}
                      {row.status === "advance_due" && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30"
                        >
                          Advance Due
                        </Badge>
                      )}
                      {row.status === "overdue" && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-rose-500/10 text-rose-600 border-rose-500/30"
                        >
                          Overdue
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {monthPayments.length === 0 ? (
                        <span className="text-muted-foreground italic">No payments logged</span>
                      ) : (
                        <div className="space-y-1">
                          {monthPayments.map((p) => (
                            <div key={p.id} className="flex items-center gap-2 text-[11px]">
                              <span className="font-medium text-foreground">
                                {formatInr(p.amount)}
                              </span>
                              <span className="text-muted-foreground">
                                via {p.paymentMode} {p.referenceNo ? `(#${p.referenceNo})` : ""} on{" "}
                                {formatDate(p.paymentDate)}
                              </span>
                              {canWrite && (
                                <button
                                  onClick={() => handleOpenEditPayment(p)}
                                  className="text-primary hover:underline ml-1"
                                >
                                  edit
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {canWrite && !isBaseline && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() =>
                            handleOpenAddPayment(
                              row.monthKey,
                              row.balanceDue || settings.monthlyRent,
                            )
                          }
                        >
                          + Pay
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Section 2: Security Deposit Renewal & Landlord Mismatch Ledger */}
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              Security Deposit Renewal & Shortfall Ledger
            </h3>
            <p className="text-xs text-muted-foreground">
              Landlord renewed deposit via cheque, but refunded only part of the old deposit back.
            </p>
          </div>
          {canWrite && (
            <Button variant="outline" size="sm" onClick={handleOpenDeposit} className="text-xs">
              Update Deposit Figures
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3 rounded-md bg-muted/40 border border-border">
            <span className="text-muted-foreground">Old Security Deposit</span>
            <div className="text-base font-semibold text-foreground mt-0.5">
              {formatInr(deposit.oldDepositAmount)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">Previous deposit held</div>
          </div>

          <div className="p-3 rounded-md bg-muted/40 border border-border">
            <span className="text-muted-foreground">New Deposit Paid (Renewal Cheque)</span>
            <div className="text-base font-semibold text-blue-600 mt-0.5">
              {formatInr(deposit.newDepositPaidAmount)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {deposit.newDepositChequeNo
                ? `Cheque #${deposit.newDepositChequeNo}`
                : "Cheque handed over"}
            </div>
          </div>

          <div className="p-3 rounded-md bg-muted/40 border border-border">
            <span className="text-muted-foreground">Old Deposit Refund Received</span>
            <div className="text-base font-semibold text-emerald-600 mt-0.5">
              {formatInr(deposit.oldDepositRefundReceived)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              Partially returned by landlord
            </div>
          </div>

          <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/30">
            <span className="text-amber-800 dark:text-amber-400 font-medium">
              Unreturned Shortfall
            </span>
            <div className="text-base font-bold text-amber-600 dark:text-amber-400 mt-0.5">
              {formatInr(depositShortfallOwedByLandlord)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {deposit.offsetAgainstRent ? "Deducted from rent calculation" : "Not yet offset"}
            </div>
          </div>
        </div>

        {deposit.notes && (
          <div className="p-3 rounded-md bg-muted/20 border border-border text-xs text-muted-foreground">
            <strong>Notes / History:</strong> {deposit.notes}
          </div>
        )}
      </div>

      {/* Section 3: Society Maintenance & AMC Registry */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Wrench className="h-4 w-4 text-primary" />
              Society Maintenance & AMC Bills
            </h3>
            <p className="text-xs text-muted-foreground">
              Register society maintenance, lift AMC, common electricity, and other commercial unit
              charges.
            </p>
          </div>
          {canWrite && (
            <Button size="sm" onClick={handleOpenAddMaintenance} className="text-xs gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Add Maintenance / AMC Bill
            </Button>
          )}
        </div>

        {maintenance.length === 0 ? (
          <div className="p-6 text-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
            No maintenance or AMC bills added yet. Click &quot;Add Maintenance / AMC Bill&quot; to
            log pending dues.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border bg-card shadow-sm">
            <Table className="w-full text-xs">
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-36">Category</TableHead>
                  <TableHead>Bill Title / Period</TableHead>
                  <TableHead className="w-28">Bill Date</TableHead>
                  <TableHead className="w-28">Due Date</TableHead>
                  <TableHead className="w-28 text-right">Bill Amount</TableHead>
                  <TableHead className="w-28 text-right">Paid</TableHead>
                  <TableHead className="w-28 text-right">Unpaid Balance</TableHead>
                  <TableHead className="w-28 text-center">Status</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {maintenance.map((m) => {
                  const balance = Math.max(0, m.amount - m.paidAmount);
                  const isPaid = m.isPaid || balance === 0;

                  return (
                    <TableRow key={m.id}>
                      <TableCell>
                        <Badge variant="outline" className="text-[11px]">
                          {m.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div>{m.title}</div>
                        <div className="text-[11px] text-muted-foreground">{m.periodLabel}</div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {m.billDate ? formatDate(m.billDate) : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {m.dueDate ? formatDate(m.dueDate) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatInr(m.amount)}
                      </TableCell>
                      <TableCell className="text-right text-emerald-600">
                        {formatInr(m.paidAmount)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold ${
                          balance > 0 ? "text-rose-600" : "text-emerald-600"
                        }`}
                      >
                        {formatInr(balance)}
                      </TableCell>
                      <TableCell className="text-center">
                        {isPaid ? (
                          <Badge
                            variant="outline"
                            className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                          >
                            Cleared
                          </Badge>
                        ) : m.paidAmount > 0 ? (
                          <Badge
                            variant="outline"
                            className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30"
                          >
                            Partial
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-xs bg-rose-500/10 text-rose-600 border-rose-500/30"
                          >
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {canWrite && (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => handleOpenEditMaintenance(m)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-destructive"
                              onClick={() => setMaintenanceToDelete(m)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Section 4: All Recorded Rent Payment Entries */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              All Rent Payment Transactions Logged ({payments.length})
            </h3>
            <p className="text-xs text-muted-foreground">
              Individual cheques, bank transfers, RTGS, and payment slips recorded towards office
              rent.
            </p>
          </div>
        </div>

        {payments.length === 0 ? (
          <div className="p-6 text-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
            No payments recorded yet. Click &quot;Record Rent Payment&quot; at the top to add a
            payment entry.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border bg-card shadow-sm">
            <Table className="w-full text-xs">
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-28">Payment Date</TableHead>
                  <TableHead className="w-28">For Month</TableHead>
                  <TableHead className="w-28 text-right">Amount</TableHead>
                  <TableHead className="w-36">Mode</TableHead>
                  <TableHead className="w-36">Reference / Cheque No</TableHead>
                  <TableHead className="w-36">Bank Name</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{formatDate(p.paymentDate)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {p.monthFor}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-emerald-600">
                      {formatInr(p.amount)}
                    </TableCell>
                    <TableCell>{p.paymentMode}</TableCell>
                    <TableCell className="font-mono text-[11px]">{p.referenceNo || "—"}</TableCell>
                    <TableCell>{p.bankName || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{p.notes || "—"}</TableCell>
                    <TableCell className="text-right">
                      {canWrite && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => handleOpenEditPayment(p)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-destructive"
                            onClick={() => setPaymentToDelete(p)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Dialog: Record / Edit Payment */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingPayment ? "Edit Rent Payment" : "Record Office Rent Payment"}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Month For" required>
                <Input
                  type="month"
                  value={paymentForm.monthFor}
                  onChange={(e) => setPaymentForm({ ...paymentForm, monthFor: e.target.value })}
                  min="2025-02"
                />
              </Field>
              <Field label="Payment Date" required>
                <Input
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount (₹)" required>
                <CurrencyInput
                  value={String(paymentForm.amount || "")}
                  onChange={(val) => setPaymentForm({ ...paymentForm, amount: Number(val) || 0 })}
                  min={1}
                />
              </Field>
              <Field label="Payment Mode" required>
                <Select
                  value={paymentForm.paymentMode}
                  onValueChange={(val) =>
                    setPaymentForm({
                      ...paymentForm,
                      paymentMode: val as RentPaymentRecord["paymentMode"],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                    <SelectItem value="Bank Transfer (NEFT/RTGS/IMPS)">
                      Bank Transfer (NEFT/RTGS/IMPS)
                    </SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Cheque No / UTR Reference">
                <Input
                  placeholder="e.g. Cheque #492810 or UTR"
                  value={paymentForm.referenceNo || ""}
                  onChange={(e) => setPaymentForm({ ...paymentForm, referenceNo: e.target.value })}
                />
              </Field>
              <Field label="Bank Name">
                <Input
                  placeholder="e.g. HDFC / ICICI / SBI"
                  value={paymentForm.bankName || ""}
                  onChange={(e) => setPaymentForm({ ...paymentForm, bankName: e.target.value })}
                />
              </Field>
            </div>

            <Field label="Notes / Cheque Clearance Memo">
              <Textarea
                placeholder="Remarks about cheque clearance, handover date, or deduction notes..."
                value={paymentForm.notes || ""}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                rows={2}
              />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePayment} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save Payment Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Maintenance & AMC Bill */}
      <Dialog open={maintenanceDialogOpen} onOpenChange={setMaintenanceDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingMaintenance ? "Edit Maintenance / AMC Bill" : "Add Maintenance / AMC Bill"}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Category" required>
                <Select
                  value={maintenanceForm.type}
                  onValueChange={(val) =>
                    setMaintenanceForm({
                      ...maintenanceForm,
                      type: val as MaintenanceAmcRecord["type"],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Society Maintenance">Society Maintenance</SelectItem>
                    <SelectItem value="AMC">Equipment / Lift AMC</SelectItem>
                    <SelectItem value="Electricity / Utility">Electricity / Utility</SelectItem>
                    <SelectItem value="Property Tax">Property Tax</SelectItem>
                    <SelectItem value="Other">Other Bill</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Period Label (e.g. Nov 2025)" required>
                <Input
                  placeholder="e.g. Nov 2025, Q3 2025"
                  value={maintenanceForm.periodLabel}
                  onChange={(e) =>
                    setMaintenanceForm({ ...maintenanceForm, periodLabel: e.target.value })
                  }
                />
              </Field>
            </div>

            <Field label="Bill Title / Description" required>
              <Input
                placeholder="e.g. SG Business Hub Quarterly Maintenance"
                value={maintenanceForm.title}
                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, title: e.target.value })}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Total Bill Amount (₹)" required>
                <CurrencyInput
                  value={String(maintenanceForm.amount || "")}
                  onChange={(val) =>
                    setMaintenanceForm({ ...maintenanceForm, amount: Number(val) || 0 })
                  }
                  min={1}
                />
              </Field>
              <Field label="Amount Already Paid (₹)">
                <CurrencyInput
                  value={String(maintenanceForm.paidAmount || "")}
                  onChange={(val) =>
                    setMaintenanceForm({ ...maintenanceForm, paidAmount: Number(val) || 0 })
                  }
                  min={0}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Bill Date">
                <Input
                  type="date"
                  value={maintenanceForm.billDate || ""}
                  onChange={(e) =>
                    setMaintenanceForm({ ...maintenanceForm, billDate: e.target.value })
                  }
                />
              </Field>
              <Field label="Due Date">
                <Input
                  type="date"
                  value={maintenanceForm.dueDate || ""}
                  onChange={(e) =>
                    setMaintenanceForm({ ...maintenanceForm, dueDate: e.target.value })
                  }
                />
              </Field>
            </div>

            <Field label="Notes">
              <Textarea
                placeholder="Details of bill receipt, cheque issued or pending approval..."
                value={maintenanceForm.notes || ""}
                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, notes: e.target.value })}
                rows={2}
              />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMaintenanceDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveMaintenance} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save Bill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Edit Security Deposit Ledger */}
      <Dialog open={depositDialogOpen} onOpenChange={setDepositDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage Security Deposit Renewal & Shortfall</DialogTitle>
          </DialogHeader>
          {depositForm && (
            <DialogBody className="space-y-4 text-xs">
              <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                Track the renewal cheque given to the landlord and the partial refund returned back.
                Any shortfall is mathematically subtracted in your optimum rent payment.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Old Deposit Amount (₹)" required>
                  <CurrencyInput
                    value={String(depositForm.oldDepositAmount || "")}
                    onChange={(val) =>
                      setDepositForm({ ...depositForm, oldDepositAmount: Number(val) || 0 })
                    }
                    min={0}
                  />
                </Field>
                <Field label="Old Deposit Refund Received (₹)" required>
                  <CurrencyInput
                    value={String(depositForm.oldDepositRefundReceived || "")}
                    onChange={(val) =>
                      setDepositForm({
                        ...depositForm,
                        oldDepositRefundReceived: Number(val) || 0,
                      })
                    }
                    min={0}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Renewal Cheque Given Amount (₹)" required>
                  <CurrencyInput
                    value={String(depositForm.newDepositPaidAmount || "")}
                    onChange={(val) =>
                      setDepositForm({
                        ...depositForm,
                        newDepositPaidAmount: Number(val) || 0,
                      })
                    }
                    min={0}
                  />
                </Field>
                <Field label="Renewal Cheque No">
                  <Input
                    placeholder="e.g. 509214"
                    value={depositForm.newDepositChequeNo || ""}
                    onChange={(e) =>
                      setDepositForm({ ...depositForm, newDepositChequeNo: e.target.value })
                    }
                  />
                </Field>
              </div>

              <div className="flex items-center justify-between p-3 rounded-md border border-border bg-muted/30">
                <div>
                  <div className="font-medium text-foreground">
                    Automatically Deduct Shortfall from Rent Due
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Offset the unreturned old deposit against pending monthly advance rent
                  </div>
                </div>
                <Switch
                  checked={depositForm.offsetAgainstRent}
                  onCheckedChange={(val) =>
                    setDepositForm({ ...depositForm, offsetAgainstRent: val })
                  }
                />
              </div>

              <Field label="Deposit Notes & Cheque History">
                <Textarea
                  placeholder="Record cheque dates, conversations with landlord about partial return..."
                  value={depositForm.notes || ""}
                  onChange={(e) => setDepositForm({ ...depositForm, notes: e.target.value })}
                  rows={2}
                />
              </Field>
            </DialogBody>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDepositDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDeposit} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save Deposit Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Edit Tenancy Terms */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Tenancy Settings & Advance Rent Terms</DialogTitle>
          </DialogHeader>
          {settingsForm && (
            <DialogBody className="space-y-4 text-xs">
              <Field label="Property Name" required>
                <Input
                  value={settingsForm.propertyName}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, propertyName: e.target.value })
                  }
                />
              </Field>

              <Field label="Property Address">
                <Input
                  value={settingsForm.propertyAddress}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, propertyAddress: e.target.value })
                  }
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Landlord Name" required>
                  <Input
                    value={settingsForm.landlordName}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, landlordName: e.target.value })
                    }
                  />
                </Field>
                <Field label="Landlord Phone">
                  <Input
                    value={settingsForm.landlordPhone || ""}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, landlordPhone: e.target.value })
                    }
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Monthly Rent (₹)" required>
                  <CurrencyInput
                    value={String(settingsForm.monthlyRent || "")}
                    onChange={(val) =>
                      setSettingsForm({ ...settingsForm, monthlyRent: Number(val) || 0 })
                    }
                    min={1}
                  />
                </Field>
                <Field label="Due Day of Month (Advance)" required>
                  <Input
                    type="number"
                    min={1}
                    max={28}
                    value={settingsForm.dueDayOfMonth}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        dueDayOfMonth: parseInt(e.target.value, 10) || 5,
                      })
                    }
                  />
                </Field>
              </div>

              <div className="p-3 rounded-md bg-muted/40 border border-border text-xs text-muted-foreground">
                <strong>Advance Rent Rule:</strong> Rent for every month is due in advance on or
                before the{" "}
                <strong className="text-foreground">{settingsForm.dueDayOfMonth}th</strong> (e.g.
                November rent is due before November 5th). Baseline is <strong>Feb 2025</strong>{" "}
                where rent was fully cleared.
              </div>
            </DialogBody>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSettings} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save Tenancy Settings"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Payment Confirm */}
      <ConfirmDialog
        open={!!paymentToDelete}
        onOpenChange={(o) => {
          if (!o) setPaymentToDelete(null);
        }}
        title="Delete Payment Entry?"
        description={
          paymentToDelete
            ? `Are you sure you want to remove the payment entry of ${formatInr(
                paymentToDelete.amount,
              )} for ${paymentToDelete.monthFor}?`
            : ""
        }
        onConfirm={() => {
          if (paymentToDelete) handleDeletePayment(paymentToDelete);
        }}
      />

      {/* Delete Maintenance Confirm */}
      <ConfirmDialog
        open={!!maintenanceToDelete}
        onOpenChange={(o) => {
          if (!o) setMaintenanceToDelete(null);
        }}
        title="Delete Maintenance Bill?"
        description={
          maintenanceToDelete
            ? `Are you sure you want to remove the bill "${maintenanceToDelete.title}" of ${formatInr(
                maintenanceToDelete.amount,
              )}?`
            : ""
        }
        onConfirm={() => {
          if (maintenanceToDelete) handleDeleteMaintenance(maintenanceToDelete);
        }}
      />
    </div>
  );
}

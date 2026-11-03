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
  BookOpen,
  ArrowDownLeft,
  ArrowUpRight,
  Package,
  Layers,
  Banknote,
  Receipt,
  HelpCircle,
  CheckCircle,
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
  getDiaryAccounting,
} from "@/lib/liabilities/rent-register.api";
import type {
  OfficeRentRegisterData,
  TenancyLedgerEntry,
  TenancyEntryCategory,
  MaintenanceAmcRecord,
  OfficeRentSettings,
  SecurityDepositLedger,
  ComputedDiaryRow,
} from "@/lib/liabilities/rent-register.types";

interface Props {
  canWrite?: boolean;
}

const CATEGORY_META: Record<
  TenancyEntryCategory,
  {
    label: string;
    impact: "we_owe_less" | "we_owe_more";
    direction: "we_paid_or_charged" | "landlord_paid_or_refunded";
    badgeClass: string;
    icon: typeof Plus;
  }
> = {
  rent_payment_bank: {
    label: "Rent Paid (Bank / NEFT / RTGS)",
    impact: "we_owe_less",
    direction: "we_paid_or_charged",
    badgeClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    icon: Banknote,
  },
  rent_payment_cash: {
    label: "Rent Paid (Cash)",
    impact: "we_owe_less",
    direction: "we_paid_or_charged",
    badgeClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    icon: Banknote,
  },
  rent_payment_cheque: {
    label: "Rent Paid (Cheque)",
    impact: "we_owe_less",
    direction: "we_paid_or_charged",
    badgeClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    icon: Receipt,
  },
  material_sale_to_landlord: {
    label: "Stone / Material Sold to Landlord",
    impact: "we_owe_less",
    direction: "we_paid_or_charged",
    badgeClass: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30",
    icon: Package,
  },
  landlord_payment_for_material: {
    label: "Landlord Paid Cash for Material",
    impact: "we_owe_more",
    direction: "landlord_paid_or_refunded",
    badgeClass: "bg-purple-500/10 text-purple-600 border-purple-500/30",
    icon: DollarSign,
  },
  deposit_refund_received: {
    label: "Partial Deposit Refund Received",
    impact: "we_owe_more",
    direction: "landlord_paid_or_refunded",
    badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    icon: ArrowDownLeft,
  },
  deposit_renewal_cheque: {
    label: "New Deposit Cheque Given",
    impact: "we_owe_less",
    direction: "we_paid_or_charged",
    badgeClass: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    icon: ArrowUpRight,
  },
  maintenance_charge: {
    label: "Society Maintenance / AMC Charge",
    impact: "we_owe_more",
    direction: "we_paid_or_charged",
    badgeClass: "bg-rose-500/10 text-rose-600 border-rose-500/30",
    icon: Wrench,
  },
  maintenance_payment: {
    label: "Society Maintenance Paid",
    impact: "we_owe_less",
    direction: "we_paid_or_charged",
    badgeClass: "bg-teal-500/10 text-teal-600 border-teal-500/30",
    icon: CheckCircle,
  },
  rent_charge: {
    label: "Monthly Rent Accrual",
    impact: "we_owe_more",
    direction: "we_paid_or_charged",
    badgeClass: "bg-muted text-muted-foreground",
    icon: Calendar,
  },
  other_credit: {
    label: "Other Credit / Deduction",
    impact: "we_owe_less",
    direction: "we_paid_or_charged",
    badgeClass: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    icon: Plus,
  },
  other_debit: {
    label: "Other Debit / Extra Charge",
    impact: "we_owe_more",
    direction: "we_paid_or_charged",
    badgeClass: "bg-rose-500/10 text-rose-600 border-rose-500/30",
    icon: Trash2,
  },
};

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

  const accounting = useMemo(() => {
    if (!register) return null;
    return getDiaryAccounting(register);
  }, [register]);

  const saveMutation = useMutation({
    mutationFn: (newData: OfficeRentRegisterData) => saveOfficeRentRegister(newData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.liabilities.rentRegister() });
      toast.success("Office rent diary updated successfully");
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  // Entry Dialog States
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TenancyLedgerEntry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<TenancyLedgerEntry | null>(null);

  const [entryForm, setEntryForm] = useState<Omit<TenancyLedgerEntry, "id" | "createdAt">>({
    date: new Date().toISOString().slice(0, 10),
    category: "rent_payment_bank",
    direction: "we_paid_or_charged",
    impact: "we_owe_less",
    amount: 0,
    paymentMode: "Bank Transfer (NEFT/RTGS/IMPS)",
    referenceNo: "",
    bankName: "",
    description: "",
    monthTag: "",
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
    notes: "",
  });

  // Deposit Edit Dialog
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [depositForm, setDepositForm] = useState<SecurityDepositLedger | null>(null);

  // Settings Edit Dialog
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState<OfficeRentSettings | null>(null);

  // Handlers
  const handleOpenAddEntry = (category: TenancyEntryCategory = "rent_payment_bank") => {
    setEditingEntry(null);
    const meta = CATEGORY_META[category];
    setEntryForm({
      date: new Date().toISOString().slice(0, 10),
      category,
      direction: meta.direction,
      impact: meta.impact,
      amount: 0,
      paymentMode:
        category === "rent_payment_cash" || category === "landlord_payment_for_material"
          ? "Cash"
          : category === "material_sale_to_landlord"
            ? "Contra / Adjusted"
            : category === "rent_payment_cheque" || category === "deposit_renewal_cheque"
              ? "Cheque"
              : "Bank Transfer (NEFT/RTGS/IMPS)",
      referenceNo: "",
      bankName: "",
      description: "",
      monthTag: new Date().toISOString().slice(0, 7),
    });
    setEntryDialogOpen(true);
  };

  const handleOpenEditEntry = (entry: TenancyLedgerEntry) => {
    setEditingEntry(entry);
    setEntryForm({
      date: entry.date,
      category: entry.category,
      direction: entry.direction,
      impact: entry.impact,
      amount: entry.amount,
      paymentMode: entry.paymentMode,
      referenceNo: entry.referenceNo || "",
      bankName: entry.bankName || "",
      description: entry.description || "",
      monthTag: entry.monthTag || "",
    });
    setEntryDialogOpen(true);
  };

  const handleCategoryChange = (cat: TenancyEntryCategory) => {
    const meta = CATEGORY_META[cat];
    setEntryForm((prev) => ({
      ...prev,
      category: cat,
      direction: meta.direction,
      impact: meta.impact,
      paymentMode:
        cat === "rent_payment_cash" || cat === "landlord_payment_for_material"
          ? "Cash"
          : cat === "material_sale_to_landlord"
            ? "Contra / Adjusted"
            : cat === "rent_payment_cheque" || cat === "deposit_renewal_cheque"
              ? "Cheque"
              : prev.paymentMode,
    }));
  };

  const handleSaveEntry = () => {
    if (!register) return;
    if (entryForm.amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!entryForm.description.trim()) {
      toast.error("Please add a note or description for this diary entry");
      return;
    }

    let updatedEntries: TenancyLedgerEntry[];
    const currentEntries = register.entries || [];

    if (editingEntry) {
      updatedEntries = currentEntries.map((e) =>
        e.id === editingEntry.id
          ? {
              ...e,
              ...entryForm,
            }
          : e,
      );
    } else {
      const newEntry: TenancyLedgerEntry = {
        id: `diary_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        ...entryForm,
        createdAt: new Date().toISOString(),
      };
      updatedEntries = [newEntry, ...currentEntries];
    }

    saveMutation.mutate(
      { ...register, entries: updatedEntries, updatedAt: new Date().toISOString() },
      { onSuccess: () => setEntryDialogOpen(false) },
    );
  };

  const handleDeleteEntry = (entry: TenancyLedgerEntry) => {
    if (!register) return;
    const currentEntries = register.entries || [];
    const updated = currentEntries.filter((e) => e.id !== entry.id);
    saveMutation.mutate(
      { ...register, entries: updated, updatedAt: new Date().toISOString() },
      { onSuccess: () => setEntryToDelete(null) },
    );
  };

  // Maintenance Handlers
  const handleOpenAddMaintenance = () => {
    setEditingMaintenance(null);
    setMaintenanceForm({
      type: "Society Maintenance",
      title: "SG Business Hub Society Maintenance",
      periodLabel: new Date().toLocaleString("en-US", { month: "short", year: "numeric" }),
      billDate: new Date().toISOString().slice(0, 10),
      dueDate: "",
      amount: 0,
      paidAmount: 0,
      isPaid: false,
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

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading office rent and tenancy diary...
        </div>
      </div>
    );
  }

  if (error || !register || !accounting) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive">
        Failed to load office rent register.
      </div>
    );
  }

  const { settings, deposit, maintenance } = register;
  const { summary, diaryRows } = accounting;

  return (
    <div className="space-y-6">
      {/* Property & Diary Context Header Card */}
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
                Diary Mode (Mar 2025 – Nov 2026)
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {settings.propertyAddress} • Landlord:{" "}
              <span className="font-medium text-foreground">{settings.landlordName}</span>
              {settings.landlordPhone && ` (${settings.landlordPhone})`} • Baseline Month:{" "}
              <span className="font-semibold text-foreground">Feb 2025 (Cleared)</span> • Monthly
              Rent:{" "}
              <span className="font-semibold text-foreground">
                {formatInr(settings.monthlyRent)}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canWrite && (
              <>
                <Button variant="outline" size="sm" onClick={handleOpenSettings}>
                  Contract Terms
                </Button>
                <Button variant="outline" size="sm" onClick={handleOpenDeposit} className="gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-amber-500" />
                  Deposit Ledger
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleOpenAddEntry("rent_payment_bank")}
                  className="gap-1.5 bg-primary"
                >
                  <Plus className="h-4 w-4" />
                  Record Diary Entry
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards — Inbuilt Master Calculator */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Master Final Optimum Net Payable */}
        <Card className="p-4 border-2 border-primary/50 bg-gradient-to-br from-primary/10 via-card to-background shadow-sm">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Exact Net Payable Now
            </span>
            <div className="rounded-full bg-primary/20 p-1.5 text-primary">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black tracking-tight text-primary">
            {formatInr(summary.finalOptimumNetPayable)}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            After deducting all lumpsums, cash, material sales & deposit refund.
          </p>
        </Card>

        {/* Card 2: Total Rent Contract Obligations (Mar 2025 - Nov 2026) */}
        <Card className="p-4 border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Rent Contract Total ({summary.totalRentContractMonths} Mos)
            </span>
            <div className="rounded-full bg-blue-500/10 p-1.5 text-blue-600">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {formatInr(summary.totalRentContractAmount)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Paid: {formatInr(summary.totalRentPaidByUs)}</span>
            <span className="font-semibold text-rose-600">
              Due: {formatInr(summary.rentBalanceDue)}
            </span>
          </div>
        </Card>

        {/* Card 3: Material Supplied to Landlord (Contra Offset) */}
        <Card className="p-4 border border-indigo-500/30 bg-indigo-500/5 shadow-sm">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-medium uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
              Material Sold to Landlord
            </span>
            <div className="rounded-full bg-indigo-500/20 p-1.5 text-indigo-600">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
            {formatInr(summary.totalMaterialSoldToLandlord)}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Landlord paid: {formatInr(summary.totalLandlordPaidForMaterial)} • Net offset:{" "}
            <strong className="text-foreground">
              {formatInr(summary.netMaterialOwedByLandlord)}
            </strong>
          </p>
        </Card>

        {/* Card 4: Unreturned Deposit Owed by Landlord */}
        <Card className="p-4 border border-amber-500/30 bg-amber-500/5 shadow-sm">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-medium uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Deposit Shortfall Owed
            </span>
            <div className="rounded-full bg-amber-500/20 p-1.5 text-amber-600">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
            {formatInr(summary.depositShortfallOwedByLandlord)}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Old: {formatInr(summary.oldDepositAmount)} • Returned:{" "}
            {formatInr(summary.depositRefundReceived)}
          </p>
        </Card>
      </div>

      {/* Detailed Calculator Breakdown Card */}
      <Card className="p-5 border border-primary/20 bg-card shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <h3 className="font-semibold text-foreground text-base flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              Inbuilt Tenancy Accounting Calculator & Final Reconciliation
            </h3>
            <p className="text-xs text-muted-foreground">
              Mathematical reconciliation from March 2025 to November 2026 (
              {summary.totalRentContractMonths} months @ {formatInr(settings.monthlyRent)}/mo).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenAddEntry("material_sale_to_landlord")}
              className="text-xs gap-1.5"
            >
              <Package className="h-3.5 w-3.5 text-indigo-500" />+ Material Sold
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenAddEntry("rent_payment_cash")}
              className="text-xs gap-1.5"
            >
              <Banknote className="h-3.5 w-3.5 text-emerald-500" />+ Cash Paid
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
          <div className="p-3 rounded-md bg-muted/40 border border-border space-y-1">
            <span className="text-muted-foreground">1. Total Contract Rent</span>
            <div className="text-sm font-semibold text-foreground">
              {formatInr(summary.totalRentContractAmount)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {summary.totalRentContractMonths} mos × {formatInr(settings.monthlyRent)}
            </div>
          </div>

          <div className="p-3 rounded-md bg-muted/40 border border-border space-y-1">
            <span className="text-muted-foreground">2. Less: Total Rent Paid</span>
            <div className="text-sm font-semibold text-emerald-600">
              - {formatInr(summary.totalRentPaidByUs)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              All bank, cash & cheque transfers
            </div>
          </div>

          <div className="p-3 rounded-md bg-muted/40 border border-border space-y-1">
            <span className="text-muted-foreground">3. Less: Unreturned Deposit</span>
            <div className="text-sm font-semibold text-amber-600">
              - {formatInr(summary.depositShortfallOwedByLandlord)}
            </div>
            <div className="text-[11px] text-muted-foreground">Old deposit landlord kept</div>
          </div>

          <div className="p-3 rounded-md bg-muted/40 border border-border space-y-1">
            <span className="text-muted-foreground">4. Less: Stone Material Balance</span>
            <div className="text-sm font-semibold text-indigo-600">
              - {formatInr(summary.netMaterialOwedByLandlord)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              Sold: {formatInr(summary.totalMaterialSoldToLandlord)} - Recd:{" "}
              {formatInr(summary.totalLandlordPaidForMaterial)}
            </div>
          </div>

          <div className="p-3 rounded-md bg-primary/10 border border-primary/30 space-y-1">
            <span className="text-primary font-medium">5. Final Net Payable</span>
            <div className="text-base font-bold text-primary">
              {formatInr(summary.finalOptimumNetPayable)}
            </div>
            <div className="text-[11px] text-muted-foreground">Exact settlement amount</div>
          </div>
        </div>
      </Card>

      {/* Tenancy Diary Table */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Office Rent & Tenancy Diary ({diaryRows.length} transactions)
            </h3>
            <p className="text-xs text-muted-foreground">
              Log every transaction like a diary — lumpsum bank transfers, cash payments, deposit
              returns in parts, stone materials purchased by landlord, and adjustments.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => handleOpenAddEntry("rent_payment_bank")}
              className="text-xs gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Transaction
            </Button>
          </div>
        </div>

        {diaryRows.length === 0 ? (
          <div className="p-8 text-center rounded-lg border border-dashed border-border bg-card/50 space-y-3">
            <div className="text-sm font-medium text-foreground">
              No diary transactions logged yet
            </div>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Start adding your payment entries — whether you paid a lumpsum amount, paid cash, or
              the landlord bought stone material from you. The calculator will automatically balance
              everything!
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <Button size="sm" onClick={() => handleOpenAddEntry("rent_payment_bank")}>
                + Add First Payment Entry
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border bg-card shadow-sm">
            <Table className="w-full text-xs">
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-28">Date</TableHead>
                  <TableHead className="w-48">Transaction Type</TableHead>
                  <TableHead>Diary Notes & Description</TableHead>
                  <TableHead className="w-28">Mode</TableHead>
                  <TableHead className="w-32">Reference / Cheque</TableHead>
                  <TableHead className="w-28 text-right">Payment Made</TableHead>
                  <TableHead className="w-28 text-right">Payment Recd</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {diaryRows.map(({ entry }) => {
                  const meta = CATEGORY_META[entry.category] || CATEGORY_META.other_credit;
                  const isWePaid = entry.impact === "we_owe_less";

                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{formatDate(entry.date)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[11px] ${meta.badgeClass}`}>
                          {meta.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">{entry.description}</div>
                        {entry.monthTag && (
                          <span className="text-[10px] text-muted-foreground">
                            For: {entry.monthTag}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{entry.paymentMode}</TableCell>
                      <TableCell className="font-mono text-[11px]">
                        {entry.referenceNo || "—"}
                        {entry.bankName && (
                          <span className="text-muted-foreground block text-[10px]">
                            {entry.bankName}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-emerald-600">
                        {isWePaid ? formatInr(entry.amount) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-purple-600">
                        {!isWePaid ? formatInr(entry.amount) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {canWrite && (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => handleOpenEditEntry(entry)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-destructive"
                              onClick={() => setEntryToDelete(entry)}
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

      {/* Society Maintenance & AMC Section */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Wrench className="h-4 w-4 text-primary" />
              Society Maintenance & AMC Bills
            </h3>
            <p className="text-xs text-muted-foreground">
              Register maintenance or AMC charges for your unit. Unpaid balances are automatically
              factored into what you owe.
            </p>
          </div>
          {canWrite && (
            <Button size="sm" onClick={handleOpenAddMaintenance} className="text-xs gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Add Maintenance Bill
            </Button>
          )}
        </div>

        {maintenance.length === 0 ? (
          <div className="p-4 text-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
            No maintenance or AMC bills added yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border bg-card shadow-sm">
            <Table className="w-full text-xs">
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-36">Category</TableHead>
                  <TableHead>Bill Title / Period</TableHead>
                  <TableHead className="w-28 text-right">Bill Amount</TableHead>
                  <TableHead className="w-28 text-right">Paid</TableHead>
                  <TableHead className="w-28 text-right">Unpaid Balance</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {maintenance.map((m) => {
                  const bal = Math.max(0, m.amount - m.paidAmount);
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
                      <TableCell className="text-right font-medium">
                        {formatInr(m.amount)}
                      </TableCell>
                      <TableCell className="text-right text-emerald-600">
                        {formatInr(m.paidAmount)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold ${
                          bal > 0 ? "text-rose-600" : "text-emerald-600"
                        }`}
                      >
                        {formatInr(bal)}
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

      {/* Dialog: Add/Edit Diary Entry */}
      <Dialog open={entryDialogOpen} onOpenChange={setEntryDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingEntry ? "Edit Diary Transaction" : "Record Diary Transaction"}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4 text-xs">
            <Field label="Transaction Category" required>
              <Select
                value={entryForm.category}
                onValueChange={(val) => handleCategoryChange(val as TenancyEntryCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rent_payment_bank">Rent Paid (Bank / NEFT / RTGS)</SelectItem>
                  <SelectItem value="rent_payment_cash">Rent Paid in Cash</SelectItem>
                  <SelectItem value="rent_payment_cheque">Rent Paid via Cheque</SelectItem>
                  <SelectItem value="material_sale_to_landlord">
                    Stone / Material Sold to Landlord (Deduct from rent)
                  </SelectItem>
                  <SelectItem value="landlord_payment_for_material">
                    Landlord Paid Cash for Material
                  </SelectItem>
                  <SelectItem value="deposit_refund_received">
                    Deposit Refund Returned by Landlord (in parts)
                  </SelectItem>
                  <SelectItem value="deposit_renewal_cheque">
                    New Deposit Renewal Cheque Given
                  </SelectItem>
                  <SelectItem value="other_credit">Other Credit / Expense Deducted</SelectItem>
                  <SelectItem value="other_debit">Other Debit / Extra Charge</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Diary Description & Details" required>
              <Input
                placeholder="e.g. Paid lumpsum ₹50k, or He bought 100 sqft mint sandstone"
                value={entryForm.description}
                onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount (₹)" required>
                <CurrencyInput
                  value={String(entryForm.amount || "")}
                  onChange={(val) => setEntryForm({ ...entryForm, amount: Number(val) || 0 })}
                  min={1}
                />
              </Field>
              <Field label="Transaction Date" required>
                <Input
                  type="date"
                  value={entryForm.date}
                  onChange={(e) => setEntryForm({ ...entryForm, date: e.target.value })}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Payment Mode">
                <Select
                  value={entryForm.paymentMode}
                  onValueChange={(val) =>
                    setEntryForm({
                      ...entryForm,
                      paymentMode: val as TenancyLedgerEntry["paymentMode"],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bank Transfer (NEFT/RTGS/IMPS)">Bank Transfer</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="Contra / Adjusted">Contra / Adjusted</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="For Month (Optional)">
                <Input
                  type="month"
                  value={entryForm.monthTag || ""}
                  onChange={(e) => setEntryForm({ ...entryForm, monthTag: e.target.value })}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Cheque No / UTR Reference">
                <Input
                  placeholder="e.g. Cheque #509214 or UTR"
                  value={entryForm.referenceNo || ""}
                  onChange={(e) => setEntryForm({ ...entryForm, referenceNo: e.target.value })}
                />
              </Field>
              <Field label="Bank Name">
                <Input
                  placeholder="e.g. HDFC / SBI"
                  value={entryForm.bankName || ""}
                  onChange={(e) => setEntryForm({ ...entryForm, bankName: e.target.value })}
                />
              </Field>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEntryDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEntry} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save Diary Transaction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Maintenance & AMC */}
      <Dialog open={maintenanceDialogOpen} onOpenChange={setMaintenanceDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingMaintenance ? "Edit Maintenance / AMC Bill" : "Add Maintenance Bill"}
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
              <Field label="Period Label" required>
                <Input
                  placeholder="e.g. Q1 2025-26"
                  value={maintenanceForm.periodLabel}
                  onChange={(e) =>
                    setMaintenanceForm({ ...maintenanceForm, periodLabel: e.target.value })
                  }
                />
              </Field>
            </div>

            <Field label="Description / Title" required>
              <Input
                value={maintenanceForm.title}
                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, title: e.target.value })}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Bill Amount (₹)" required>
                <CurrencyInput
                  value={String(maintenanceForm.amount || "")}
                  onChange={(val) =>
                    setMaintenanceForm({ ...maintenanceForm, amount: Number(val) || 0 })
                  }
                  min={1}
                />
              </Field>
              <Field label="Paid Amount (₹)">
                <CurrencyInput
                  value={String(maintenanceForm.paidAmount || "")}
                  onChange={(val) =>
                    setMaintenanceForm({ ...maintenanceForm, paidAmount: Number(val) || 0 })
                  }
                  min={0}
                />
              </Field>
            </div>
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

      {/* Dialog: Security Deposit */}
      <Dialog open={depositDialogOpen} onOpenChange={setDepositDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Security Deposit Figures</DialogTitle>
          </DialogHeader>
          {depositForm && (
            <DialogBody className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Old Security Deposit (₹)" required>
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

              <div className="flex items-center justify-between p-3 rounded-md border border-border bg-muted/30">
                <div>
                  <div className="font-medium text-foreground">
                    Automatically Deduct Shortfall from Rent Due
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Offset unreturned old deposit against net rent payable
                  </div>
                </div>
                <Switch
                  checked={depositForm.offsetAgainstRent}
                  onCheckedChange={(val) =>
                    setDepositForm({ ...depositForm, offsetAgainstRent: val })
                  }
                />
              </div>
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

      {/* Dialog: Contract Settings */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Contract & Rent Settings</DialogTitle>
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
                <Field label="Due Day of Month" required>
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

              <div className="grid grid-cols-2 gap-3">
                <Field label="Start Month (Baseline)" required>
                  <Input
                    type="month"
                    value={settingsForm.startMonth}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, startMonth: e.target.value })
                    }
                  />
                </Field>
                <Field label="Horizon End Month" required>
                  <Input
                    type="month"
                    value={settingsForm.endMonth || "2026-11"}
                    onChange={(e) => setSettingsForm({ ...settingsForm, endMonth: e.target.value })}
                  />
                </Field>
              </div>

              <div className="p-3 rounded-md bg-muted/40 border border-border text-xs text-muted-foreground">
                <strong>Accounting Horizon:</strong> Tracking rent from{" "}
                <strong className="text-foreground">March 2025</strong> to{" "}
                <strong className="text-foreground">
                  {settingsForm.endMonth || "November 2026"}
                </strong>
                .
              </div>
            </DialogBody>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSettings} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Entry Confirm */}
      <ConfirmDialog
        open={!!entryToDelete}
        onOpenChange={(o) => {
          if (!o) setEntryToDelete(null);
        }}
        title="Delete Diary Transaction?"
        description={
          entryToDelete
            ? `Are you sure you want to remove "${entryToDelete.description}" of ${formatInr(
                entryToDelete.amount,
              )}?`
            : ""
        }
        onConfirm={() => {
          if (entryToDelete) handleDeleteEntry(entryToDelete);
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

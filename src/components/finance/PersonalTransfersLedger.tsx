import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ArrowLeftRight,
  ArrowRight,
  Plus,
  Search,
  Download,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
  User,
  Building2,
  Wallet,
  Smartphone,
  Landmark,
  Coins,
  ShieldAlert,
  Calendar,
  Filter,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTableShell } from "@/components/data/DataTableShell";
import { TablePagination } from "@/components/data/Pagination";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { formatInr, formatDate } from "@/lib/format";
import { qk } from "@/lib/query-keys";
import { invalidatePersonalTransfers } from "@/lib/query-invalidation";
import { toUserMessage } from "@/lib/errors";
import {
  listPersonalTransfers,
  createPersonalTransfer,
  updatePersonalTransfer,
  deletePersonalTransfer,
} from "@/lib/personal-transfers/api";
import {
  TRANSFER_ACCOUNTS,
  TRANSFER_CATEGORIES,
  computeScopedLedger,
  getAccountDef,
  getAccountDisplayName,
  getAccountShortName,
  getCategoryDisplayName,
  type LedgerPerspective,
  type PersonalTransferInput,
  type PersonalTransferRow,
  type EnrichedTransferLedgerRow,
} from "@/lib/personal-transfers/schema";

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

const DEFAULT_FORM: PersonalTransferInput = {
  transfer_date: todayDate(),
  from_account: "stone_tech_current",
  from_account_custom: "",
  to_account: "rishi_upi",
  to_account_custom: "",
  amount: 0,
  category: "drawings",
  reference_no: "",
  remarks: "",
  receipt_url: "",
};

export function PersonalTransfersLedger() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const [perspective, setPerspective] = useState<LedgerPerspective>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  // Default: show from the start of the current Indian financial year (April 1)
  // Leave toDate empty so all records up to today are included.
  const [fromDate, setFromDate] = useState(() => {
    const now = new Date();
    const fyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return `${fyStart}-04-01`;
  });
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<PersonalTransferRow | null>(null);
  const [formData, setFormData] = useState<PersonalTransferInput>(DEFAULT_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch Transfers
  const transfersQ = useQuery({
    queryKey: qk.personalTransfers.list(fromDate, toDate),
    queryFn: () =>
      listPersonalTransfers({ fromDate: fromDate || undefined, toDate: toDate || undefined }),
  });

  const allTransfers = useMemo(() => transfersQ.data ?? [], [transfersQ.data]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (input: PersonalTransferInput) => createPersonalTransfer(input),
    onSuccess: () => {
      toast.success("Personal transfer recorded successfully");
      invalidatePersonalTransfers(qc);
      setIsDialogOpen(false);
      setFormData(DEFAULT_FORM);
      setEditingTransfer(null);
    },
    onError: (err) => {
      toast.error(toUserMessage(err));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: PersonalTransferInput }) =>
      updatePersonalTransfer(id, input),
    onSuccess: () => {
      toast.success("Transfer updated successfully");
      invalidatePersonalTransfers(qc);
      setIsDialogOpen(false);
      setFormData(DEFAULT_FORM);
      setEditingTransfer(null);
    },
    onError: (err) => {
      toast.error(toUserMessage(err));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePersonalTransfer(id),
    onSuccess: () => {
      toast.success("Transfer deleted successfully");
      invalidatePersonalTransfers(qc);
      setDeletingId(null);
    },
    onError: (err) => {
      toast.error(toUserMessage(err));
    },
  });

  // Calculate high-level KPI summaries for each entity
  const rishiSummary = useMemo(() => computeScopedLedger(allTransfers, "rishi"), [allTransfers]);
  const ramanSummary = useMemo(() => computeScopedLedger(allTransfers, "raman"), [allTransfers]);
  const companySummary = useMemo(
    () => computeScopedLedger(allTransfers, "company"),
    [allTransfers],
  );
  const allSummary = useMemo(() => computeScopedLedger(allTransfers, "all"), [allTransfers]);

  // Current active ledger perspective
  const currentScoped = useMemo(() => {
    return computeScopedLedger(allTransfers, perspective);
  }, [allTransfers, perspective]);

  // Filtered rows for display
  const filteredRows = useMemo(() => {
    return currentScoped.rows.filter((row) => {
      if (categoryFilter !== "all" && row.category !== categoryFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const textToMatch =
          `${row.remarks} ${row.reference_no ?? ""} ${row.fromDisplay} ${row.toDisplay} ${row.categoryDisplay}`.toLowerCase();
        if (!textToMatch.includes(q)) return false;
      }
      return true;
    });
  }, [currentScoped.rows, categoryFilter, searchTerm]);

  // Paginated rows
  const totalFiltered = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  // Open Dialog for New
  const handleOpenNew = (presetFrom?: string, presetTo?: string, presetCategory?: string) => {
    setEditingTransfer(null);
    setFormData({
      ...DEFAULT_FORM,
      transfer_date: todayDate(),
      from_account: presetFrom || "stone_tech_current",
      to_account: presetTo || "rishi_upi",
      category: presetCategory || "drawings",
    });
    setFormErrors({});
    setIsDialogOpen(true);
  };

  // Open Dialog for Edit
  const handleOpenEdit = (transfer: PersonalTransferRow) => {
    setEditingTransfer(transfer);
    setFormData({
      transfer_date: transfer.transfer_date,
      from_account: transfer.from_account,
      from_account_custom: transfer.from_account_custom || "",
      to_account: transfer.to_account,
      to_account_custom: transfer.to_account_custom || "",
      amount: transfer.amount,
      category: transfer.category,
      reference_no: transfer.reference_no || "",
      remarks: transfer.remarks,
      receipt_url: transfer.receipt_url || "",
    });
    setFormErrors({});
    setIsDialogOpen(true);
  };

  // Form Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!formData.transfer_date) {
      errors.transfer_date = "Date is required";
    }
    if (!formData.amount || Number(formData.amount) <= 0) {
      errors.amount = "Amount must be greater than 0";
    }
    if (!formData.from_account) {
      errors.from_account = "Sender account is required";
    }
    if (formData.from_account === "other" && !formData.from_account_custom?.trim()) {
      errors.from_account_custom = "Please enter custom sender account name";
    }
    if (!formData.to_account) {
      errors.to_account = "Receiver account is required";
    }
    if (formData.to_account === "other" && !formData.to_account_custom?.trim()) {
      errors.to_account_custom = "Please enter custom receiver account name";
    }
    if (formData.from_account !== "other" && formData.from_account === formData.to_account) {
      errors.to_account = "From and To accounts cannot be identical";
    }
    if (!formData.remarks?.trim()) {
      errors.remarks = "Please enter remarks or description";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (editingTransfer) {
      updateMutation.mutate({ id: editingTransfer.id, input: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  // CSV Export
  const handleExportCsv = () => {
    if (filteredRows.length === 0) {
      toast.info("No records to export");
      return;
    }

    const headers = [
      "Date",
      "From Account",
      "To Account",
      "Category",
      "Amount",
      "Inflow (Credit)",
      "Outflow (Debit)",
      "Running Balance",
      "Reference / UTR",
      "Remarks",
    ];

    const csvData = filteredRows.map((r) => [
      r.transfer_date,
      `"${r.fromDisplay}"`,
      `"${r.toDisplay}"`,
      `"${r.categoryDisplay}"`,
      r.amount,
      r.credit || 0,
      r.debit || 0,
      r.runningBalance || 0,
      `"${r.reference_no || ""}"`,
      `"${(r.remarks || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...csvData.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `personal_transfers_${perspective}_${todayDate()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Ledger exported to CSV");
  };

  // Helper for Account Badge
  const renderAccountBadge = (accId: string, customName?: string | null) => {
    const def = getAccountDef(accId);
    const label = getAccountShortName(accId, customName);

    if (def?.owner === "rishi") {
      return (
        <Badge
          variant="outline"
          className="border-purple-500/40 bg-purple-50 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 gap-1 text-[11px] font-medium"
        >
          {def.type === "upi" ? (
            <Smartphone className="h-3 w-3 text-purple-600" />
          ) : (
            <Landmark className="h-3 w-3 text-purple-600" />
          )}
          <span>{label}</span>
        </Badge>
      );
    }

    if (def?.owner === "raman") {
      return (
        <Badge
          variant="outline"
          className="border-amber-500/40 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 gap-1 text-[11px] font-medium"
        >
          {def.type === "upi" ? (
            <Smartphone className="h-3 w-3 text-amber-600" />
          ) : (
            <Landmark className="h-3 w-3 text-amber-600" />
          )}
          <span>{label}</span>
        </Badge>
      );
    }

    if (def?.owner === "company") {
      return (
        <Badge
          variant="outline"
          className="border-emerald-500/40 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 gap-1 text-[11px] font-medium"
        >
          {def.type === "cash" ? (
            <Coins className="h-3 w-3 text-emerald-600" />
          ) : (
            <Building2 className="h-3 w-3 text-emerald-600" />
          )}
          <span>{label}</span>
        </Badge>
      );
    }

    return (
      <Badge
        variant="outline"
        className="border-slate-500/40 bg-slate-50 text-slate-800 dark:bg-slate-900 dark:text-slate-300 gap-1 text-[11px] font-medium"
      >
        <Wallet className="h-3 w-3 text-slate-500" />
        <span>{label}</span>
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* 4 High-Level Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Rishi Rai Position */}
        <Card
          onClick={() => setPerspective("rishi")}
          className={`cursor-pointer transition-all border-purple-500/30 hover:border-purple-500 shadow-xs ${
            perspective === "rishi"
              ? "ring-2 ring-purple-500 bg-purple-50/20 dark:bg-purple-950/10"
              : ""
          }`}
        >
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                <span>Rishi Rai Ledger</span>
              </span>
              <div className="h-6 w-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center dark:bg-purple-900/50 dark:text-purple-300">
                {rishiSummary.netBalance >= 0 ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
              </div>
            </div>
            <div className="text-xl font-extrabold tracking-tight text-foreground">
              {formatInr(rishiSummary.netBalance)}
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-purple-100 dark:border-purple-900/40">
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                In: +{formatInr(rishiSummary.totalInflow)}
              </span>
              <span className="text-rose-600 dark:text-rose-400 font-medium">
                Out: -{formatInr(rishiSummary.totalOutflow)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 2. Raman Pupneja Position */}
        <Card
          onClick={() => setPerspective("raman")}
          className={`cursor-pointer transition-all border-amber-500/30 hover:border-amber-500 shadow-xs ${
            perspective === "raman"
              ? "ring-2 ring-amber-500 bg-amber-50/20 dark:bg-amber-950/10"
              : ""
          }`}
        >
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                <span>Raman Pupneja Ledger</span>
              </span>
              <div className="h-6 w-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center dark:bg-amber-900/50 dark:text-amber-300">
                {ramanSummary.netBalance >= 0 ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
              </div>
            </div>
            <div className="text-xl font-extrabold tracking-tight text-foreground">
              {formatInr(ramanSummary.netBalance)}
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-amber-100 dark:border-amber-900/40">
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                In: +{formatInr(ramanSummary.totalInflow)}
              </span>
              <span className="text-rose-600 dark:text-rose-400 font-medium">
                Out: -{formatInr(ramanSummary.totalOutflow)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 3. Stone Tech Operations Position */}
        <Card
          onClick={() => setPerspective("company")}
          className={`cursor-pointer transition-all border-emerald-500/30 hover:border-emerald-500 shadow-xs ${
            perspective === "company"
              ? "ring-2 ring-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10"
              : ""
          }`}
        >
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                <span>Stone Tech Movement</span>
              </span>
              <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center dark:bg-emerald-900/50 dark:text-emerald-300">
                <ArrowLeftRight className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-xl font-extrabold tracking-tight text-foreground">
              {formatInr(companySummary.netBalance)}
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-emerald-100 dark:border-emerald-900/40">
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                In: +{formatInr(companySummary.totalInflow)}
              </span>
              <span className="text-rose-600 dark:text-rose-400 font-medium">
                Out: -{formatInr(companySummary.totalOutflow)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 4. Total Volume & All Transfers */}
        <Card
          onClick={() => setPerspective("all")}
          className={`cursor-pointer transition-all border-border hover:border-primary/50 shadow-xs ${
            perspective === "all" ? "ring-2 ring-primary bg-primary/5" : ""
          }`}
        >
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ArrowLeftRight className="h-3.5 w-3.5" />
                <span>Total Transfers</span>
              </span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-semibold">
                {allSummary.transferCount} entries
              </Badge>
            </div>
            <div className="text-xl font-extrabold tracking-tight text-foreground">
              {formatInr(allSummary.totalInflow)}
            </div>
            <div className="text-[10px] text-muted-foreground pt-1 border-t border-border">
              Cumulative internal & partner transaction flow
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Transfer Fast Presets */}
      <Card className="border-border bg-muted/20">
        <CardContent className="p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1">
              <span>Quick Transfer:</span>
            </span>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7 px-2.5 bg-background border-purple-500/30 hover:border-purple-500"
              onClick={() => handleOpenNew("stone_tech_current", "rishi_upi", "drawings")}
            >
              Stone Tech BOB → Rishi UPI
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7 px-2.5 bg-background border-amber-500/30 hover:border-amber-500"
              onClick={() => handleOpenNew("stone_tech_current", "raman_upi", "drawings")}
            >
              Stone Tech BOB → Raman UPI
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7 px-2.5 bg-background border-purple-500/30 hover:border-purple-500"
              onClick={() => handleOpenNew("rishi_bank", "raman_upi", "partner_settlement")}
            >
              Rishi Bank → Raman UPI
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7 px-2.5 bg-background border-amber-500/30 hover:border-amber-500"
              onClick={() => handleOpenNew("raman_bank", "rishi_upi", "partner_settlement")}
            >
              Raman Bank → Rishi UPI
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7 px-2.5 bg-background border-emerald-500/30 hover:border-emerald-500"
              onClick={() => handleOpenNew("rishi_upi", "stone_tech_current", "capital_infusion")}
            >
              Rishi UPI → Stone Tech BOB
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7 px-2.5 bg-background border-emerald-500/30 hover:border-emerald-500"
              onClick={() => handleOpenNew("raman_upi", "stone_tech_current", "capital_infusion")}
            >
              Raman UPI → Stone Tech BOB
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7 px-2.5 bg-background border-emerald-500/30 hover:border-emerald-500"
              onClick={() => handleOpenNew("stone_tech_current", "stone_tech_upi", "self_transfer")}
            >
              BOB Current → BOB UPI
            </Button>
          </div>

          <Button
            size="sm"
            onClick={() => handleOpenNew()}
            className="bg-primary text-primary-foreground font-semibold shadow-xs h-8 px-3 ml-auto"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Record Personal Transfer
          </Button>
        </CardContent>
      </Card>

      {/* Main Perspective Selector & Table Shell */}
      <div className="space-y-4">
        {/* Ledger Perspective Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Tabs
            value={perspective}
            onValueChange={(v) => {
              setPerspective(v as LedgerPerspective);
              setPage(1);
            }}
          >
            <TabsList className="bg-muted/70 p-1">
              <TabsTrigger value="all" className="text-xs px-3">
                All Transfers ({allSummary.transferCount})
              </TabsTrigger>
              <TabsTrigger value="rishi" className="text-xs px-3 gap-1">
                <span className="h-2 w-2 rounded-full bg-purple-500 inline-block" />
                Rishi Rai Ledger ({rishiSummary.transferCount})
              </TabsTrigger>
              <TabsTrigger value="raman" className="text-xs px-3 gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />
                Raman Pupneja Ledger ({ramanSummary.transferCount})
              </TabsTrigger>
              <TabsTrigger value="company" className="text-xs px-3 gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                Stone Tech Operations ({companySummary.transferCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={filteredRows.length === 0}
            className="text-xs gap-1.5 h-8 self-start sm:self-auto"
          >
            <Download className="h-3.5 w-3.5" />
            Export Ledger (CSV)
          </Button>
        </div>

        {/* Filters Toolbar */}
        <Card className="border-border p-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search remarks, UTR, accounts..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-8 text-xs h-8"
              />
            </div>

            {/* Category Filter */}
            <Select
              value={categoryFilter}
              onValueChange={(val) => {
                setCategoryFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="text-xs h-8">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {TRANSFER_CATEGORIES.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* From Date */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">From:</span>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                className="text-xs h-8"
              />
            </div>

            {/* To Date */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">To:</span>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                className="text-xs h-8"
              />
              {(fromDate || toDate || searchTerm || categoryFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFromDate("");
                    setToDate("");
                    setSearchTerm("");
                    setCategoryFilter("all");
                    setPage(1);
                  }}
                  className="text-[11px] h-8 px-2 text-muted-foreground hover:text-foreground"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Ledger Table */}
        <DataTableShell>
          {transfersQ.isLoading ? (
            <SkeletonTable rows={6} />
          ) : transfersQ.isError ? (
            <ErrorBlock
              message={toUserMessage(transfersQ.error)}
              onRetry={() => transfersQ.refetch()}
            />
          ) : paginatedRows.length === 0 ? (
            <EmptyState
              icon={<ArrowLeftRight className="h-5 w-5" />}
              title="No personal transfers recorded"
              message={
                fromDate || toDate
                  ? `No transfers found for the selected date range. Try "Show all time" or record the first one.`
                  : "Record payments received into personal accounts, transfers to UPI, partner settlements, or drawings."
              }
              action={
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  {(fromDate || toDate) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setFromDate("");
                        setToDate("");
                        setPage(1);
                      }}
                    >
                      Show all time
                    </Button>
                  )}
                  <Button size="sm" onClick={() => handleOpenNew()}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Record First Transfer
                  </Button>
                </div>
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px] text-xs">Date</TableHead>
                    <TableHead className="text-xs">From (Sender)</TableHead>
                    <TableHead className="w-[30px] p-0 text-center"></TableHead>
                    <TableHead className="text-xs">To (Receiver)</TableHead>
                    <TableHead className="text-xs">Category</TableHead>
                    <TableHead className="text-xs">Reference / UTR</TableHead>
                    <TableHead className="text-xs">Remarks / Purpose</TableHead>

                    {/* If viewing a specific person/company ledger, display Inflow, Outflow, and Running Balance */}
                    {perspective !== "all" ? (
                      <>
                        <TableHead className="text-right text-xs text-emerald-600 dark:text-emerald-400">
                          Inflow (Credit)
                        </TableHead>
                        <TableHead className="text-right text-xs text-rose-600 dark:text-rose-400">
                          Outflow (Debit)
                        </TableHead>
                        <TableHead className="text-right text-xs font-bold">Balance</TableHead>
                      </>
                    ) : (
                      <TableHead className="text-right text-xs">Amount</TableHead>
                    )}

                    <TableHead className="w-[70px] text-right text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRows.map((row) => (
                    <TableRow key={row.id} className="hover:bg-muted/40">
                      <TableCell className="text-xs font-medium whitespace-nowrap">
                        {formatDate(row.transfer_date)}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {renderAccountBadge(row.from_account, row.from_account_custom)}
                      </TableCell>
                      <TableCell className="text-center p-0 text-muted-foreground">
                        <ArrowRight className="h-3 w-3 inline text-muted-foreground/60" />
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {renderAccountBadge(row.to_account, row.to_account_custom)}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        <Badge variant="secondary" className="text-[10px] font-normal">
                          {row.categoryDisplay}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {row.reference_no ? row.reference_no : "—"}
                      </TableCell>
                      <TableCell className="text-xs max-w-xs truncate" title={row.remarks}>
                        {row.remarks}
                      </TableCell>

                      {perspective !== "all" ? (
                        <>
                          <TableCell className="text-right text-xs font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            {row.credit > 0 ? `+${formatInr(row.credit)}` : "—"}
                          </TableCell>
                          <TableCell className="text-right text-xs font-semibold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                            {row.debit > 0 ? `-${formatInr(row.debit)}` : "—"}
                          </TableCell>
                          <TableCell className="text-right text-xs font-bold whitespace-nowrap">
                            <span
                              className={
                                row.runningBalance >= 0
                                  ? "text-emerald-700 dark:text-emerald-400"
                                  : "text-rose-600 dark:text-rose-400"
                              }
                            >
                              {formatInr(row.runningBalance)}
                            </span>
                          </TableCell>
                        </>
                      ) : (
                        <TableCell className="text-right text-xs font-bold text-foreground whitespace-nowrap">
                          {formatInr(row.amount)}
                        </TableCell>
                      )}

                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => handleOpenEdit(row)}
                            title="Edit Transfer"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-rose-600"
                            onClick={() => setDeletingId(row.id)}
                            title="Delete Transfer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalFiltered > pageSize && (
                <TablePagination
                  page={currentPage}
                  pageSize={pageSize}
                  total={totalFiltered}
                  onPageChange={setPage}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setPage(1);
                  }}
                />
              )}
            </>
          )}
        </DataTableShell>
      </div>

      {/* Record / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <ArrowLeftRight className="h-4 w-4 text-primary" />
              <span>{editingTransfer ? "Edit Personal Transfer" : "Record Personal Transfer"}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <DialogBody className="space-y-4 py-2">
              {/* Date & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Transfer Date <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={formData.transfer_date}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, transfer_date: e.target.value }))
                    }
                    className="text-xs"
                  />
                  {formErrors.transfer_date && (
                    <p className="text-[11px] text-rose-500">{formErrors.transfer_date}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="e.g. 50000"
                    value={formData.amount || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        amount: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="text-xs font-mono font-semibold"
                  />
                  {formErrors.amount && (
                    <p className="text-[11px] text-rose-500">{formErrors.amount}</p>
                  )}
                </div>
              </div>

              {/* From Account */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Sender Account (From) <span className="text-rose-500">*</span>
                </label>
                <Select
                  value={formData.from_account}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, from_account: val }))}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select Sender Account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rishi_bank">Rishi Rai — Personal Bank A/c</SelectItem>
                    <SelectItem value="rishi_upi">Rishi Rai — UPI</SelectItem>
                    <SelectItem value="raman_bank">Raman Pupneja — Personal Bank A/c</SelectItem>
                    <SelectItem value="raman_upi">Raman Pupneja — UPI</SelectItem>
                    <SelectItem value="stone_tech_current">
                      Stone Tech Operations — BOB Current A/c
                    </SelectItem>
                    <SelectItem value="stone_tech_upi">
                      Stone Tech Operations — BOB UPI Current A/c
                    </SelectItem>
                    <SelectItem value="petty_cash">Stone Tech — Cash Drawer</SelectItem>
                    <SelectItem value="other">Other Account</SelectItem>
                  </SelectContent>
                </Select>
                {formData.from_account === "other" && (
                  <Input
                    placeholder="Enter custom sender account name"
                    value={formData.from_account_custom || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, from_account_custom: e.target.value }))
                    }
                    className="text-xs mt-1.5"
                  />
                )}
                {formErrors.from_account && (
                  <p className="text-[11px] text-rose-500">{formErrors.from_account}</p>
                )}
                {formErrors.from_account_custom && (
                  <p className="text-[11px] text-rose-500">{formErrors.from_account_custom}</p>
                )}
              </div>

              {/* To Account */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Receiver Account (To) <span className="text-rose-500">*</span>
                </label>
                <Select
                  value={formData.to_account}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, to_account: val }))}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select Receiver Account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rishi_bank">Rishi Rai — Personal Bank A/c</SelectItem>
                    <SelectItem value="rishi_upi">Rishi Rai — UPI</SelectItem>
                    <SelectItem value="raman_bank">Raman Pupneja — Personal Bank A/c</SelectItem>
                    <SelectItem value="raman_upi">Raman Pupneja — UPI</SelectItem>
                    <SelectItem value="stone_tech_current">
                      Stone Tech Operations — BOB Current A/c
                    </SelectItem>
                    <SelectItem value="stone_tech_upi">
                      Stone Tech Operations — BOB UPI Current A/c
                    </SelectItem>
                    <SelectItem value="petty_cash">Stone Tech — Cash Drawer</SelectItem>
                    <SelectItem value="other">Other Account</SelectItem>
                  </SelectContent>
                </Select>
                {formData.to_account === "other" && (
                  <Input
                    placeholder="Enter custom receiver account name"
                    value={formData.to_account_custom || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, to_account_custom: e.target.value }))
                    }
                    className="text-xs mt-1.5"
                  />
                )}
                {formErrors.to_account && (
                  <p className="text-[11px] text-rose-500">{formErrors.to_account}</p>
                )}
                {formErrors.to_account_custom && (
                  <p className="text-[11px] text-rose-500">{formErrors.to_account_custom}</p>
                )}
              </div>

              {/* Category & Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Transfer Category / Purpose
                  </label>
                  <Select
                    value={formData.category}
                    onValueChange={(val) => setFormData((prev) => ({ ...prev, category: val }))}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRANSFER_CATEGORIES.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs">
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Reference / UTR / Cheque No.
                  </label>
                  <Input
                    placeholder="e.g. UPI Ref / UTR 4209..."
                    value={formData.reference_no || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, reference_no: e.target.value }))
                    }
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              {/* Description / Remarks */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Description / Remarks <span className="text-rose-500">*</span>
                </label>
                <Textarea
                  placeholder="e.g. Customer payment received from Mr. Sharma for Italian Marble advance, transferred to company"
                  rows={3}
                  value={formData.remarks}
                  onChange={(e) => setFormData((prev) => ({ ...prev, remarks: e.target.value }))}
                  className="text-xs"
                />
                {formErrors.remarks && (
                  <p className="text-[11px] text-rose-500">{formErrors.remarks}</p>
                )}
              </div>
            </DialogBody>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-primary text-primary-foreground font-semibold"
              >
                {editingTransfer ? "Update Transfer" : "Save Transfer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(deletingId)}
        onOpenChange={(open) => !open && setDeletingId(null)}
        title="Delete Transfer Entry"
        description="Are you sure you want to delete this transfer? This action will permanently remove this record from all personal and partner ledgers."
        confirmLabel="Delete"
        tone="danger"
        onConfirm={() => {
          if (deletingId) {
            deleteMutation.mutate(deletingId);
          }
        }}
      />
    </div>
  );
}

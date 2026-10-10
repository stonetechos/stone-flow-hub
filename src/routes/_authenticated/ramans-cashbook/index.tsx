import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  ShieldAlert,
  LayoutDashboard,
  Search,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorBlock, SkeletonTable, EmptyState } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { Field } from "@/components/forms/Field";
import { CurrencyInput } from "@/components/forms/inputs/SmartInputs";
import { RowActions } from "@/components/data/RowActions";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
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
import { toUserMessage } from "@/lib/errors";
import { formatInr, formatDate } from "@/lib/format";
import { qk } from "@/lib/query-keys";
import { useRoles } from "@/hooks/use-roles";
import { useCurrentUserEmail } from "@/lib/nav/preferences";
import {
  listCashbookEntries,
  createCashbookEntry,
  updateCashbookEntry,
  deleteCashbookEntry,
} from "@/lib/cashbook/api";
import {
  cashbookEntryInputSchema,
  type CashbookEntryInput,
  type CashbookEntryRow,
  type CashbookEntryType,
} from "@/lib/cashbook/schema";

export const Route = createFileRoute("/_authenticated/ramans-cashbook/")({
  ssr: false,
  component: RamansCashbookPage,
});

function today() {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY_EDIT: CashbookEntryInput = {
  entry_date: today(),
  entry_type: "debit",
  amount: 0,
  remarks: "",
};

function RamansCashbookPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const roles = useRoles();
  const userEmail = useCurrentUserEmail();

  // Super Admin or Raman Pupneja strictly authorized
  const isAuthorized = roles.isSuperAdmin || userEmail?.toLowerCase() === "raman.pupneja@gmail.com";

  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({});
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Quick entry state
  const [quickDate, setQuickDate] = useState(today());
  const [quickType, setQuickType] = useState<CashbookEntryType>("debit");
  const [quickAmount, setQuickAmount] = useState<string>("");
  const [quickRemarks, setQuickRemarks] = useState("");

  // Edit / Delete dialogs
  const [editing, setEditing] = useState<CashbookEntryRow | null>(null);
  const [editForm, setEditForm] = useState<CashbookEntryInput>(EMPTY_EDIT);
  const [toDelete, setToDelete] = useState<CashbookEntryRow | null>(null);

  const query = useQuery({
    queryKey: qk.cashbook.list(dateRange.from, dateRange.to),
    queryFn: () => listCashbookEntries(dateRange),
    enabled: roles.isReady && isAuthorized,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: qk.cashbook.all });

  const createMut = useMutation({
    mutationFn: (input: CashbookEntryInput) => createCashbookEntry(input),
    onSuccess: () => {
      toast.success(
        quickType === "debit"
          ? "Cash In (Debit) entry recorded"
          : "Cash Out (Credit) entry recorded",
      );
      invalidate();
      setQuickAmount("");
      setQuickRemarks("");
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const updateMut = useMutation({
    mutationFn: (vars: { id: string; input: CashbookEntryInput }) =>
      updateCashbookEntry(vars.id, vars.input),
    onSuccess: () => {
      toast.success("Cashbook entry updated");
      invalidate();
      setEditing(null);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteCashbookEntry(id),
    onSuccess: () => {
      toast.success("Cashbook entry deleted");
      invalidate();
      setToDelete(null);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const openEdit = (row: CashbookEntryRow) => {
    setEditForm({
      entry_date: row.entry_date,
      entry_type: row.entry_type,
      amount: row.amount,
      remarks: row.remarks ?? "",
    });
    setEditing(row);
  };

  const allRows = useMemo(() => query.data?.rows ?? [], [query.data?.rows]);
  const filteredRows = useMemo(() => {
    if (!q.trim()) return allRows;
    const s = q.toLowerCase().trim();
    return allRows.filter((r) => r.remarks.toLowerCase().includes(s));
  }, [allRows, q]);

  const pageRows = useMemo(() => {
    return filteredRows.slice((page - 1) * pageSize, page * pageSize);
  }, [filteredRows, page, pageSize]);

  // Loading state
  if (!roles.isReady) {
    return (
      <div className="p-6">
        <SkeletonTable rows={6} columns={6} />
      </div>
    );
  }

  // Access denied state for non-super-admins
  if (!isAuthorized) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center p-4">
        <div className="relative max-w-lg w-full rounded-2xl border border-border/80 bg-surface-card p-6 sm:p-8 shadow-e3 text-center space-y-5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-8 ring-rose-500/5">
            <ShieldAlert className="h-7 w-7" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
              Super Admin Privilege Required
            </span>
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Raman's Cashbook Restricted
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This cash in hand ledger is strictly reserved for{" "}
              <strong>Super Administrators</strong> and <strong>Raman Pupneja</strong>.
            </p>
          </div>

          <div className="pt-2 flex justify-center">
            <Button asChild variant="default" size="sm" className="gap-2">
              <Link to="/dashboard">
                <LayoutDashboard className="h-4 w-4" />
                <span>Return to Dashboard</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentBalance = query.data?.currentBalance ?? 0;
  const totalDebit = query.data?.totalDebit ?? 0;
  const totalCredit = query.data?.totalCredit ?? 0;

  const handleExportCsv = () => {
    if (allRows.length === 0) {
      toast.info("No entries to export");
      return;
    }
    const headers = ["Date", "Type", "Debit (INR)", "Credit (INR)", "Balance (INR)", "Remarks"];
    const csvLines = [headers.join(",")];
    allRows.forEach((r) => {
      csvLines.push(
        [
          r.entry_date,
          r.entry_type.toUpperCase(),
          r.debit || 0,
          r.credit || 0,
          r.running_balance || 0,
          `"${(r.remarks || "").replace(/"/g, '""')}"`,
        ].join(","),
      );
    });
    const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ramans_cashbook_${today()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Cashbook exported to CSV");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("cashbook.title", "Raman's Cashbook")}
        subtitle={t(
          "cashbook.subtitle",
          "Cash in hand ledger managed by Raman Pupneja. Live tracking of debits, credits, running balances, and notes.",
        )}
        actions={
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCsv}>
            <Download className="h-4 w-4" />
            <span>{t("common.exportCsv", "Export CSV")}</span>
          </Button>
        }
      />

      {/* KPI Balance Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Cash in Hand Balance */}
        <Card className="border-teal-800/20 bg-gradient-to-br from-teal-900/10 via-background to-background shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("cashbook.cashInHand", "Cash In Hand Balance")}
              </span>
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  currentBalance >= 0
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                }`}
              >
                <Wallet className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl tabular-nums">
              {formatInr(currentBalance)}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  currentBalance >= 0 ? "bg-emerald-500" : "bg-rose-500"
                }`}
              />
              <span>
                {currentBalance >= 0
                  ? t("cashbook.positiveLiquidity", "Healthy Cash Balance")
                  : t("cashbook.deficit", "Cash Deficit / Overdrawn")}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Total Cash In (Debits) */}
        <Card className="shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("cashbook.totalDebit", "Total Inflow (Debits)")}
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ArrowDownLeft className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400 sm:text-3xl tabular-nums">
              {formatInr(totalDebit)}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {t("cashbook.totalCashInReceived", "Total cash deposits & receipts")}
            </div>
          </CardContent>
        </Card>

        {/* Total Cash Out (Credits) */}
        <Card className="shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("cashbook.totalCredit", "Total Outflow (Credits)")}
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <ArrowUpRight className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-rose-700 dark:text-rose-400 sm:text-3xl tabular-nums">
              {formatInr(totalCredit)}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {t("cashbook.totalCashPaidOut", "Total cash withdrawals & expenses")}
            </div>
          </CardContent>
        </Card>

        {/* Total Transactions */}
        <Card className="shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("cashbook.entriesCount", "Recorded Entries")}
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Coins className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl tabular-nums">
              {allRows.length}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {t("cashbook.managedByRaman", "Managed by raman.pupneja@gmail.com")}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Entry Form */}
      <Card className="border border-border/70 shadow-xs">
        <CardContent className="p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              <h3 className="text-sm font-semibold text-foreground">
                {t("cashbook.quickEntryTitle", "Record Cash Transaction")}
              </h3>
            </div>
            <span className="text-xs text-muted-foreground">
              {t("cashbook.inRemarksNotes", "Enter amount, select type, and provide notes")}
            </span>
          </div>

          <form
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[140px_160px_160px_1fr_auto] lg:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              const amt = Number(quickAmount || 0);
              if (amt <= 0) {
                toast.error("Please enter a valid amount greater than 0");
                return;
              }
              if (!quickRemarks.trim()) {
                toast.error("Remarks / notes are required");
                return;
              }
              createMut.mutate({
                entry_date: quickDate,
                entry_type: quickType,
                amount: amt,
                remarks: quickRemarks.trim(),
              });
            }}
          >
            {/* 1. Date */}
            <Field label={t("common.date", "Date")} required>
              <Input
                type="date"
                value={quickDate}
                onChange={(e) => setQuickDate(e.target.value)}
                className="h-9"
              />
            </Field>

            {/* 2. Type (Debit vs Credit) */}
            <Field label={t("cashbook.type", "Transaction Type")} required>
              <div className="grid grid-cols-2 gap-1 rounded-md border border-border p-0.5 bg-muted/40">
                <button
                  type="button"
                  onClick={() => setQuickType("debit")}
                  className={`flex h-8 items-center justify-center rounded text-xs font-semibold transition-all ${
                    quickType === "debit"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("cashbook.debit", "Debit (In)")}
                </button>
                <button
                  type="button"
                  onClick={() => setQuickType("credit")}
                  className={`flex h-8 items-center justify-center rounded text-xs font-semibold transition-all ${
                    quickType === "credit"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("cashbook.credit", "Credit (Out)")}
                </button>
              </div>
            </Field>

            {/* 3. Amount */}
            <Field label={t("common.amount", "Amount")} required>
              <CurrencyInput
                value={quickAmount}
                onChange={setQuickAmount}
                placeholder="0.00"
                className="h-9"
              />
            </Field>

            {/* 4. Remarks (Notes) */}
            <Field label={t("common.remarks", "Remarks / Notes")} required>
              <Input
                value={quickRemarks}
                onChange={(e) => setQuickRemarks(e.target.value)}
                placeholder={t(
                  "cashbook.remarksPlaceholder",
                  "Write notes (e.g. Client advance, site petty cash, fuel spend...)",
                )}
                className="h-9"
              />
            </Field>

            {/* 5. Submit Button */}
            <Button
              type="submit"
              disabled={createMut.isPending}
              className={`h-9 font-semibold ${
                quickType === "debit"
                  ? "bg-emerald-700 hover:bg-emerald-800 text-white"
                  : "bg-rose-700 hover:bg-rose-800 text-white"
              }`}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              {quickType === "debit"
                ? t("cashbook.addDebit", "Add Inflow")
                : t("cashbook.addCredit", "Add Outflow")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder={t("cashbook.searchRemarks", "Search notes / remarks…")}
            className="pl-9 h-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateRange.from ?? ""}
            onChange={(e) => {
              setDateRange((prev) => ({ ...prev, from: e.target.value || undefined }));
              setPage(1);
            }}
            className="h-9 w-36 text-xs"
            placeholder="From date"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            value={dateRange.to ?? ""}
            onChange={(e) => {
              setDateRange((prev) => ({ ...prev, to: e.target.value || undefined }));
              setPage(1);
            }}
            className="h-9 w-36 text-xs"
            placeholder="To date"
          />
          {(dateRange.from || dateRange.to) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDateRange({});
                setPage(1);
              }}
              className="h-9 text-xs"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Ledger Table */}
      {query.isLoading ? (
        <SkeletonTable rows={6} columns={6} />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : filteredRows.length === 0 ? (
        <EmptyState
          icon={<Coins className="h-6 w-6" />}
          title={t("cashbook.emptyTitle", "No cashbook entries recorded")}
          message={t(
            "cashbook.emptyMessage",
            "Use the quick entry form above to record your first debit (cash in) or credit (cash out) transaction.",
          )}
        />
      ) : (
        <DataTableShell
          footer={
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={filteredRows.length}
              onPageChange={setPage}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
            />
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">{t("common.date", "Date")}</TableHead>
                <TableHead className="w-[110px]">{t("common.type", "Type")}</TableHead>
                <TableHead className="text-right w-[140px]">
                  {t("cashbook.debitCol", "Debit (In)")}
                </TableHead>
                <TableHead className="text-right w-[140px]">
                  {t("cashbook.creditCol", "Credit (Out)")}
                </TableHead>
                <TableHead className="text-right w-[150px]">
                  {t("cashbook.balanceCol", "Balance")}
                </TableHead>
                <TableHead>{t("common.remarks", "Remarks / Notes")}</TableHead>
                <TableHead className="w-12 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((r) => {
                const isDebit = r.entry_type === "debit";
                return (
                  <TableRow key={r.id}>
                    {/* Date */}
                    <TableCell className="text-sm font-medium">
                      {formatDate(r.entry_date)}
                    </TableCell>

                    {/* Type Badge */}
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`font-semibold capitalize ${
                          isDebit
                            ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                        }`}
                      >
                        {isDebit ? "Debit (In)" : "Credit (Out)"}
                      </Badge>
                    </TableCell>

                    {/* Debit Column */}
                    <TableCell className="text-right font-medium tabular-nums text-emerald-700 dark:text-emerald-400">
                      {isDebit ? `+${formatInr(r.amount)}` : "—"}
                    </TableCell>

                    {/* Credit Column */}
                    <TableCell className="text-right font-medium tabular-nums text-rose-700 dark:text-rose-400">
                      {!isDebit ? `-${formatInr(r.amount)}` : "—"}
                    </TableCell>

                    {/* Running Balance Column */}
                    <TableCell className="text-right font-bold tabular-nums">
                      <span
                        className={
                          (r.running_balance ?? 0) >= 0
                            ? "text-foreground"
                            : "text-rose-600 dark:text-rose-400"
                        }
                      >
                        {formatInr(r.running_balance ?? 0)}
                      </span>
                    </TableCell>

                    {/* Remarks / Notes */}
                    <TableCell className="text-sm text-foreground max-w-md">
                      <div className="font-normal leading-relaxed whitespace-pre-wrap break-words">
                        {r.remarks || "—"}
                      </div>
                    </TableCell>

                    {/* Row Actions */}
                    <TableCell className="text-right">
                      <RowActions
                        canEdit={true}
                        canDelete={true}
                        onEdit={() => openEdit(r)}
                        onDelete={() => setToDelete(r)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DataTableShell>
      )}

      {/* Edit Entry Dialog */}
      {editing && (
        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t("cashbook.editEntryTitle", "Edit Cashbook Entry")}</DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-4">
              <Field label={t("common.date", "Date")} required>
                <Input
                  type="date"
                  value={editForm.entry_date}
                  onChange={(e) => setEditForm((f) => ({ ...f, entry_date: e.target.value }))}
                />
              </Field>

              <Field label={t("cashbook.type", "Type")} required>
                <div className="grid grid-cols-2 gap-2 rounded-md border border-border p-1">
                  <button
                    type="button"
                    onClick={() => setEditForm((f) => ({ ...f, entry_type: "debit" }))}
                    className={`flex h-9 items-center justify-center rounded text-xs font-semibold transition-all ${
                      editForm.entry_type === "debit"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t("cashbook.debit", "Debit (Inflow)")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditForm((f) => ({ ...f, entry_type: "credit" }))}
                    className={`flex h-9 items-center justify-center rounded text-xs font-semibold transition-all ${
                      editForm.entry_type === "credit"
                        ? "bg-rose-600 text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t("cashbook.credit", "Credit (Outflow)")}
                  </button>
                </div>
              </Field>

              <Field label={t("common.amount", "Amount")} required>
                <CurrencyInput
                  value={String(editForm.amount || "")}
                  onChange={(val) => setEditForm((f) => ({ ...f, amount: Number(val || 0) }))}
                />
              </Field>

              <Field label={t("common.remarks", "Remarks / Notes")} required>
                <Textarea
                  rows={3}
                  value={editForm.remarks}
                  onChange={(e) => setEditForm((f) => ({ ...f, remarks: e.target.value }))}
                  placeholder="Notes explaining this transaction..."
                />
              </Field>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>
                {t("common.cancel", "Cancel")}
              </Button>
              <Button
                disabled={updateMut.isPending}
                onClick={() => {
                  if (Number(editForm.amount) <= 0) {
                    toast.error("Amount must be greater than 0");
                    return;
                  }
                  if (!editForm.remarks.trim()) {
                    toast.error("Remarks / notes are required");
                    return;
                  }
                  updateMut.mutate({ id: editing.id, input: editForm });
                }}
              >
                {t("common.save", "Save Changes")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={t("cashbook.deleteTitle", "Delete Cashbook Entry")}
        description={
          toDelete
            ? `Delete ${toDelete.entry_type.toUpperCase()} entry of ${formatInr(
                toDelete.amount,
              )} on ${formatDate(toDelete.entry_date)}? Running balances will be automatically recalculated.`
            : ""
        }
        confirmLabel={t("common.delete", "Delete")}
        tone="danger"
        busy={delMut.isPending}
        onConfirm={() => {
          if (toDelete) delMut.mutate(toDelete.id);
        }}
      />
    </div>
  );
}

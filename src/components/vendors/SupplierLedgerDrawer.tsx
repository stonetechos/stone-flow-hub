import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  MessageCircle,
  ExternalLink,
  Plus,
  Wallet,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  Calendar,
  Building2,
  Phone,
  FileText,
  Pencil,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { toast } from "sonner";
import { qk } from "@/lib/query-keys";
import { formatInr, formatDate } from "@/lib/format";
import { toUserMessage } from "@/lib/errors";
import { type VendorRow, getVendorPhone, getVendorContactName } from "@/lib/vendors/api";
import {
  listVendorLedger,
  summariseLedger,
  sourceLabel,
  routeForLedgerRow,
  createVendorLedgerEntry,
} from "@/lib/vendors/ledger";
import { EditVendorPaymentDialog } from "@/components/vendor-payments/EditVendorPaymentDialog";
import { getVendorPayment } from "@/lib/vendor-payments/api";
import { ShareStatementDialog } from "@/components/statements/ShareStatementDialog";
import {
  getCurrentStatementTimestamp,
  type AccountingStatementData,
} from "@/lib/statements/accounting-statement";

interface SupplierLedgerDrawerProps {
  vendor: VendorRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupplierLedgerDrawer({ vendor, open, onOpenChange }: SupplierLedgerDrawerProps) {
  const qc = useQueryClient();
  const [statementOpen, setStatementOpen] = useState(false);
  const [recordEntryOpen, setRecordEntryOpen] = useState(false);
  const [editPaymentId, setEditPaymentId] = useState<string | null>(null);

  const editPaymentQ = useQuery({
    queryKey: qk.vendorPayments.byId(editPaymentId ?? ""),
    queryFn: () => (editPaymentId ? getVendorPayment(editPaymentId) : null),
    enabled: !!editPaymentId,
  });

  // Form state for manual entry
  const [entryType, setEntryType] = useState<
    "opening_balance" | "purchase_invoice" | "vendor_payment" | "adjustment"
  >("opening_balance");
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [entryRef, setEntryRef] = useState("");
  const [entryAmount, setEntryAmount] = useState("");
  const [entrySide, setEntrySide] = useState<"debit" | "credit">("debit");
  const [entryNotes, setEntryNotes] = useState("");

  const vendorId = vendor?.id ?? "";

  const ledgerQ = useQuery({
    queryKey: qk.vendorLedger.byVendor(vendorId),
    queryFn: () => listVendorLedger(vendorId),
    enabled: !!vendorId && open,
    staleTime: 15_000,
  });

  const summary = useMemo(() => summariseLedger(ledgerQ.data ?? []), [ledgerQ.data]);

  const vendorPhone = getVendorPhone(vendor);
  const vendorContact = getVendorContactName(vendor);

  const statementData: AccountingStatementData = useMemo(() => {
    return {
      party: {
        partyType: "vendor",
        id: vendorId,
        name: vendor?.company_name || "Supplier",
        code: vendor?.vendor_code,
        phone: vendorPhone,
        whatsapp: vendorPhone,
        contactPerson: vendorContact,
        city: vendor?.city,
      },
      asOfTimestamp: getCurrentStatementTimestamp(),
      totalDebit: summary.totalDebit,
      totalCredit: summary.totalCredit,
      balance: summary.outstanding,
      transactions: (ledgerQ.data ?? []).map((r) => ({
        date: r.entry_date,
        type: sourceLabel(r.source_type),
        refNo: r.ref_no || "—",
        description: r.description,
        debit: r.debit,
        credit: r.credit,
        runningBalance: r.running_balance,
      })),
    };
  }, [vendor, vendorId, vendorPhone, vendorContact, summary, ledgerQ.data]);

  const addEntryMutation = useMutation({
    mutationFn: async () => {
      const amount = Number(entryAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Please enter a valid positive amount");
      }

      const isDebit = entrySide === "debit";
      return createVendorLedgerEntry({
        vendor_id: vendorId,
        entry_date: entryDate,
        source_type: entryType,
        ref_no: entryRef.trim() || undefined,
        description:
          entryNotes.trim() ||
          (entryType === "opening_balance" ? "Opening Balance" : "Manual Adjustment"),
        debit: isDebit ? amount : 0,
        credit: !isDebit ? amount : 0,
        notes: entryNotes.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.success("Ledger entry recorded successfully");
      setRecordEntryOpen(false);
      setEntryAmount("");
      setEntryRef("");
      setEntryNotes("");
      void qc.invalidateQueries({ queryKey: qk.vendorLedger.byVendor(vendorId) });
      void qc.invalidateQueries({ queryKey: qk.vendorLedger.allSummaries });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to save entry");
    },
  });

  if (!vendor) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0 flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-border bg-slate-50/60 dark:bg-slate-900/60">
            <SheetHeader className="text-left space-y-1">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className="font-mono text-[11px] uppercase tracking-wide">
                  {vendor.vendor_code || "SUPPLIER"}
                </Badge>
                <Link
                  to="/vendors/$vendorId/ledger"
                  params={{ vendorId }}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                >
                  <span>Open Full Page</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
              <SheetTitle className="text-lg font-bold text-foreground">
                {vendor.company_name}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
                {vendorContact && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    {vendorContact}
                  </span>
                )}
                {vendorPhone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    {vendorPhone}
                  </span>
                )}
                {vendor.city && <span>· {vendor.city}</span>}
                {vendor.gst_number && (
                  <span className="font-mono text-[11px]">· GST: {vendor.gst_number}</span>
                )}
              </SheetDescription>
            </SheetHeader>

            {/* Top Action Buttons */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shadow-xs text-xs h-8 cursor-pointer"
                onClick={() => setStatementOpen(true)}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>Send Statement (WhatsApp)</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs h-8 cursor-pointer bg-white dark:bg-slate-900"
                onClick={() => setRecordEntryOpen(!recordEntryOpen)}
              >
                <Plus className="h-3.5 w-3.5 text-primary" />
                <span>{recordEntryOpen ? "Close Entry Form" : "Record Ledger Entry"}</span>
              </Button>
            </div>
          </div>

          <div className="p-5 space-y-5 flex-1">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border p-3 bg-card shadow-2xs">
                <span className="text-[11px] text-muted-foreground block font-medium">
                  Total Billed
                </span>
                <span className="text-base sm:text-lg font-bold font-mono text-foreground mt-0.5 block">
                  {formatInr(summary.totalDebit)}
                </span>
              </div>
              <div className="rounded-lg border border-border p-3 bg-card shadow-2xs">
                <span className="text-[11px] text-muted-foreground block font-medium">
                  Total Paid
                </span>
                <span className="text-base sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                  {formatInr(summary.totalCredit)}
                </span>
              </div>
              <div className="rounded-lg border border-border p-3 bg-card shadow-2xs">
                <span className="text-[11px] text-muted-foreground block font-medium">
                  Balance Due
                </span>
                <span
                  className={`text-base sm:text-lg font-bold font-mono mt-0.5 block ${
                    summary.outstanding > 0
                      ? "text-amber-600 dark:text-amber-400"
                      : summary.outstanding < 0
                        ? "text-blue-600"
                        : "text-muted-foreground"
                  }`}
                >
                  {formatInr(summary.outstanding)}
                </span>
              </div>
            </div>

            {/* In-drawer Quick Record Entry Form */}
            {recordEntryOpen && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Receipt className="h-4 w-4 text-primary" />
                    <span>Record Manual Entry or Opening Balance</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setRecordEntryOpen(false)}
                    className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Entry Type</Label>
                    <Select
                      value={entryType}
                      onValueChange={(v) => {
                        const type = v as typeof entryType;
                        setEntryType(type);
                        if (type === "opening_balance") {
                          setEntrySide("debit");
                        } else if (type === "vendor_payment") {
                          setEntrySide("credit");
                        } else if (type === "purchase_invoice") {
                          setEntrySide("debit");
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="opening_balance">Opening Balance</SelectItem>
                        <SelectItem value="purchase_invoice">Bill / Purchase Invoice</SelectItem>
                        <SelectItem value="vendor_payment">Payment Made</SelectItem>
                        <SelectItem value="adjustment">Accounting Adjustment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px]">Entry Date</Label>
                    <Input
                      type="date"
                      value={entryDate}
                      onChange={(e) => setEntryDate(e.target.value)}
                      className="h-8 text-xs bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px]">Side / Effect</Label>
                    <Select
                      value={entrySide}
                      onValueChange={(v) => setEntrySide(v as "debit" | "credit")}
                    >
                      <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="debit">Debit (+ Payable / Bill)</SelectItem>
                        <SelectItem value="credit">Credit (- Payment / Advance)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px]">Amount (₹)</Label>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="e.g. 50000"
                      value={entryAmount}
                      onChange={(e) => setEntryAmount(e.target.value)}
                      className="h-8 text-xs font-mono font-medium bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-[11px]">Reference / Bill # / Chq #</Label>
                    <Input
                      placeholder="e.g. INV-2026-901 or Cheque #847291"
                      value={entryRef}
                      onChange={(e) => setEntryRef(e.target.value)}
                      className="h-8 text-xs bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-[11px]">Notes / Remarks</Label>
                    <Input
                      placeholder="e.g. Natural Stone Slabs advance opening balance"
                      value={entryNotes}
                      onChange={(e) => setEntryNotes(e.target.value)}
                      className="h-8 text-xs bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>

                <div className="pt-1 flex justify-end">
                  <Button
                    size="sm"
                    className="h-8 text-xs font-semibold gap-1.5"
                    disabled={addEntryMutation.isPending || !entryAmount}
                    onClick={() => addEntryMutation.mutate()}
                  >
                    {addEntryMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    <span>Save to Ledger</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Transactions Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-foreground">
                  Ledger Statement ({ledgerQ.data?.length ?? 0} Transactions)
                </h4>
                <span className="text-[11px] text-muted-foreground">Chronological Order</span>
              </div>

              {ledgerQ.isLoading ? (
                <SkeletonTable rows={4} columns={5} />
              ) : ledgerQ.error ? (
                <ErrorBlock
                  message={toUserMessage(ledgerQ.error)}
                  onRetry={() => ledgerQ.refetch()}
                />
              ) : (ledgerQ.data ?? []).length === 0 ? (
                <EmptyState
                  icon={<Wallet className="h-6 w-6" />}
                  title="No ledger activity recorded yet"
                  message="Purchase invoices, material bills, payments, and opening balances will appear here as they are added."
                />
              ) : (
                <div className="rounded-lg border border-border overflow-hidden bg-card">
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-900">
                      <TableRow className="text-[11px]">
                        <TableHead className="py-2">Date</TableHead>
                        <TableHead className="py-2">Type</TableHead>
                        <TableHead className="py-2">Ref #</TableHead>
                        <TableHead className="py-2 text-right">Debit</TableHead>
                        <TableHead className="py-2 text-right">Credit</TableHead>
                        <TableHead className="py-2 text-right">Balance</TableHead>
                        <TableHead className="py-2 text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-xs">
                      {ledgerQ.data!.map((row) => {
                        const route = routeForLedgerRow(row);
                        const isPayment = row.source_type === "vendor_payment";
                        const paymentLookupId = row.source_id || row.ref_no;

                        return (
                          <TableRow key={row.id} className="hover:bg-muted/40">
                            <TableCell className="py-2.5 tabular-nums text-muted-foreground text-[11px]">
                              {formatDate(row.entry_date)}
                            </TableCell>
                            <TableCell className="py-2.5">
                              <Badge variant="outline" className="text-[10px] font-normal py-0">
                                {sourceLabel(row.source_type)}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2.5 font-mono text-[11px]">
                              {route ? (
                                <Link
                                  to={route}
                                  className="text-primary hover:underline font-semibold inline-flex items-center gap-1"
                                  title="View complete document details"
                                >
                                  <span>{row.ref_no || "—"}</span>
                                  <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                                </Link>
                              ) : (
                                row.ref_no || "—"
                              )}
                            </TableCell>
                            <TableCell className="py-2.5 text-right font-mono tabular-nums">
                              {row.debit ? formatInr(row.debit) : "—"}
                            </TableCell>
                            <TableCell className="py-2.5 text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                              {row.credit ? formatInr(row.credit) : "—"}
                            </TableCell>
                            <TableCell className="py-2.5 text-right font-mono tabular-nums font-semibold">
                              <span
                                className={
                                  row.running_balance > 0
                                    ? "text-amber-600 dark:text-amber-400"
                                    : ""
                                }
                              >
                                {formatInr(row.running_balance)}
                              </span>
                            </TableCell>
                            <TableCell className="py-2 text-right">
                              {isPayment && paymentLookupId ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-1.5 text-[11px] font-medium gap-1 text-primary hover:text-primary hover:bg-primary/10"
                                  onClick={() => setEditPaymentId(paymentLookupId)}
                                  title="Edit payment amount, date, method, or notes"
                                >
                                  <Pencil className="h-3 w-3" />
                                  <span>Edit</span>
                                </Button>
                              ) : route ? (
                                <Link
                                  to={route}
                                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground font-medium p-1 hover:bg-muted rounded"
                                  title="Open details"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Share Statement Dialog */}
      <ShareStatementDialog
        open={statementOpen}
        onOpenChange={setStatementOpen}
        data={statementData}
      />

      {/* Edit Vendor Payment Dialog */}
      <EditVendorPaymentDialog
        open={!!editPaymentId}
        onOpenChange={(isOpen) => {
          if (!isOpen) setEditPaymentId(null);
        }}
        payment={editPaymentQ.data ?? null}
        onSuccess={() => {
          void qc.invalidateQueries({ queryKey: qk.vendorLedger.byVendor(vendorId) });
          void qc.invalidateQueries({ queryKey: qk.vendorLedger.allSummaries });
          setEditPaymentId(null);
        }}
      />
    </>
  );
}

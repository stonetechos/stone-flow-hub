import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  User,
  Building2,
  Smartphone,
  Banknote,
  CreditCard,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorBlock, SkeletonTable, EmptyState } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Field } from "@/components/forms/Field";
import { CurrencyInput } from "@/components/forms/inputs/SmartInputs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RowActions } from "@/components/data/RowActions";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import { DataTableShell } from "@/components/data/DataTableShell";
import { EntityPicker } from "@/components/forms/EntityPicker";
import { toUserMessage } from "@/lib/errors";
import { formatInr, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { qk } from "@/lib/query-keys";
import {
  createInstallationLedgerEntry,
  updateInstallationLedgerEntry,
  deleteInstallationLedgerEntry,
  listInstallationLedger,
  type InstallationLedgerRow,
} from "@/lib/installation-ledger/api";
import { invalidateInstallationLedger } from "@/lib/query-invalidation";
import {
  listInstallationAgencies,
  getAgencyCategoryInfo,
  parsePaymentMeta,
} from "@/lib/installation-agencies/api";
import { LEDGER_ENTRY_TYPES, type LedgerEntryType } from "@/lib/installation-ledger/schema";
import { useRoles } from "@/hooks/use-roles";
import { ShareStatementDialog } from "@/components/statements/ShareStatementDialog";
import {
  getCurrentStatementTimestamp,
  type AccountingStatementData,
} from "@/lib/statements/accounting-statement";

/**
 * Installation Agency Ledger — per-agency detail.
 * Displays agency category/specialization, running balance, and allows recording
 * both Company Direct and Customer Direct (UPI/Cash) payments.
 */
export const Route = createFileRoute("/_authenticated/installation-ledger/$agencyId")({
  ssr: false,
  component: InstallationLedgerDetail,
});

function today() {
  return new Date().toISOString().slice(0, 10);
}

function InstallationLedgerDetail() {
  const { agencyId } = Route.useParams();
  const qc = useQueryClient();
  const roles = useRoles();

  const agenciesQuery = useQuery({
    queryKey: qk.installationAgencies.list(),
    queryFn: () => listInstallationAgencies(false),
  });
  const ledgerQuery = useQuery({
    queryKey: qk.installationLedger.byAgency(agencyId),
    queryFn: () => listInstallationLedger(agencyId),
  });

  const agency = (agenciesQuery.data ?? []).find((a) => a.id === agencyId);
  const categories = getAgencyCategoryInfo(agency);

  const [recording, setRecording] = useState(false);
  const [statementOpen, setStatementOpen] = useState(false);
  const [entryType, setEntryType] = useState<LedgerEntryType>("charge");
  const [entryDate, setEntryDate] = useState(today());
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [refNo, setRefNo] = useState("");
  const [notes, setNotes] = useState("");

  // Customer on our behalf payment fields
  const [paidBy, setPaidBy] = useState<"company" | "customer">("company");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [paymentChannel, setPaymentChannel] = useState<"upi" | "cash" | "bank_transfer" | "cheque">(
    "upi",
  );

  const [toDelete, setToDelete] = useState<InstallationLedgerRow | null>(null);
  const [toEdit, setToEdit] = useState<InstallationLedgerRow | null>(null);
  const [editType, setEditType] = useState<LedgerEntryType>("charge");
  const [editDate, setEditDate] = useState(today());
  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editRefNo, setEditRefNo] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editPaidBy, setEditPaidBy] = useState<"company" | "customer">("company");
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editPaymentChannel, setEditPaymentChannel] = useState<
    "upi" | "cash" | "bank_transfer" | "cheque"
  >("upi");

  const resetForm = () => {
    setEntryType("charge");
    setEntryDate(today());
    setDescription("");
    setAmount("");
    setRefNo("");
    setNotes("");
    setPaidBy("company");
    setCustomerId(null);
    setCustomerName("");
    setPaymentChannel("upi");
  };

  const handleOpenEdit = (r: InstallationLedgerRow) => {
    const meta = parsePaymentMeta(r);
    setToEdit(r);
    setEditType(r.debit > 0 ? "charge" : "payment");
    setEditDate(r.entry_date);
    setEditDescription(r.description);
    setEditAmount(String(r.debit > 0 ? r.debit : r.credit));
    setEditRefNo(r.ref_no ?? "");
    setEditNotes(
      (r.notes ?? "")
        .replace(/\[PaidBy:[^\]]+\]\s*/g, "")
        .replace(/\[Customer:[^\]]+\]\s*/g, "")
        .replace(/\[Method:[^\]]+\]\s*/g, "")
        .trim(),
    );
    setEditPaidBy(meta.isCustomerPayment ? "customer" : "company");
    setEditCustomerName(meta.customerName);
    setEditPaymentChannel(
      meta.channel === "cash"
        ? "cash"
        : meta.channel === "bank_transfer"
          ? "bank_transfer"
          : meta.channel === "cheque"
            ? "cheque"
            : "upi",
    );
  };

  const createMut = useMutation({
    mutationFn: async () => {
      let finalDescription = description.trim();
      let finalRef = refNo.trim();
      let finalNotes = notes.trim();

      if (entryType === "payment" && paidBy === "customer") {
        const channelLabel = paymentChannel.toUpperCase();
        if (!finalDescription) {
          finalDescription = `Paid by Customer${
            customerName ? `: ${customerName}` : ""
          } (${channelLabel})`;
        }
        if (!finalRef) {
          finalRef = `${channelLabel} (Direct to Agency)`;
        }
        const tags = `[PaidBy:customer]${
          customerName ? ` [Customer:${customerName}]` : ""
        } [Method:${paymentChannel}]`;
        finalNotes = finalNotes ? `${tags} ${finalNotes}` : tags;
      }

      return createInstallationLedgerEntry({
        installation_agency_id: agencyId,
        entry_date: entryDate,
        entry_type: entryType,
        amount: Number(amount || 0),
        description:
          finalDescription || (entryType === "charge" ? "Agency charge" : "Payment to agency"),
        ref_no: finalRef || null,
        notes: finalNotes || null,
      });
    },
    onSuccess: () => {
      toast.success("Entry recorded");
      invalidateInstallationLedger(qc, agencyId);
      setRecording(false);
      resetForm();
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteInstallationLedgerEntry(id),
    onSuccess: () => {
      toast.success("Ledger entry deleted");
      invalidateInstallationLedger(qc, agencyId);
      setToDelete(null);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const editMut = useMutation({
    mutationFn: async () => {
      if (!toEdit) throw new Error("No entry selected");
      let finalDescription = editDescription.trim();
      let finalRef = editRefNo.trim();
      let finalNotes = editNotes.trim();

      if (editType === "payment" && editPaidBy === "customer") {
        const channelLabel = editPaymentChannel.toUpperCase();
        if (!finalDescription) {
          finalDescription = `Paid by Customer${
            editCustomerName ? `: ${editCustomerName}` : ""
          } (${channelLabel})`;
        }
        if (!finalRef) {
          finalRef = `${channelLabel} (Direct to Agency)`;
        }
        const tags = `[PaidBy:customer]${
          editCustomerName ? ` [Customer:${editCustomerName}]` : ""
        } [Method:${editPaymentChannel}]`;
        finalNotes = finalNotes ? `${tags} ${finalNotes}` : tags;
      }

      return updateInstallationLedgerEntry(toEdit.id, {
        entry_date: editDate,
        entry_type: editType,
        amount: Number(editAmount || 0),
        description: finalDescription,
        ref_no: finalRef || null,
        notes: finalNotes || null,
      });
    },
    onSuccess: () => {
      toast.success("Ledger entry updated");
      invalidateInstallationLedger(qc, agencyId);
      setToEdit(null);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const rows = ledgerQuery.data ?? [];
  const balance = rows.length > 0 ? rows[rows.length - 1].running_balance : 0;
  const totalCharge = rows.reduce((s, r) => s + (Number(r.debit) || 0), 0);
  const totalPayment = rows.reduce((s, r) => s + (Number(r.credit) || 0), 0);

  const statementData: AccountingStatementData = {
    party: {
      partyType: "agency",
      id: agencyId,
      name: agency?.name || "Agency",
      code: agency?.code,
      phone: (agency as unknown as { phone?: string })?.phone || null,
      whatsapp: (agency as unknown as { whatsapp?: string })?.whatsapp || null,
      contactPerson: (agency as unknown as { contact_person?: string })?.contact_person || null,
    },
    asOfTimestamp: getCurrentStatementTimestamp(),
    totalDebit: totalCharge,
    totalCredit: totalPayment,
    balance: balance,
    transactions: rows.map((r) => ({
      date: r.entry_date,
      type: r.debit > 0 ? "Work / Installation Charge" : "Payment Disbursement",
      refNo: r.ref_no || "—",
      description: r.description,
      debit: r.debit,
      credit: r.credit,
      runningBalance: r.running_balance,
    })),
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={agency ? agency.name : "Agency Ledger"}
        eyebrow={
          categories.length > 0 ? (
            <div className="flex gap-1 mb-1">
              {categories.map((c, i) => (
                <Badge key={i} variant="outline" className={cn("text-xs py-0.5", c.badgeClass)}>
                  {c.label}
                </Badge>
              ))}
            </div>
          ) : undefined
        }
        subtitle={
          agency
            ? `Running balance: ${formatInr(balance)} (${
                balance > 0
                  ? "Amount payable to agency"
                  : balance < 0
                    ? "Advance / Excess paid"
                    : "Settled"
              })`
            : undefined
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs font-semibold"
              onClick={() => setStatementOpen(true)}
            >
              <MessageCircle className="h-4 w-4" />
              Share Statement (WhatsApp)
            </Button>
            {roles.canWrite && (
              <Button size="sm" onClick={() => setRecording(true)}>
                <Plus className="mr-2 h-4 w-4" /> Record entry
              </Button>
            )}
          </div>
        }
      />

      {ledgerQuery.isLoading ? (
        <SkeletonTable rows={5} columns={7} />
      ) : ledgerQuery.error ? (
        <ErrorBlock
          message={toUserMessage(ledgerQuery.error)}
          onRetry={() => ledgerQuery.refetch()}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No entries yet"
          message="Record a charge or payment to start this agency's ledger."
          action={
            roles.canWrite ? (
              <Button onClick={() => setRecording(true)}>
                <Plus className="mr-2 h-4 w-4" /> Record entry
              </Button>
            ) : undefined
          }
        />
      ) : (
        <DataTableShell>
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Date</TableHead>
                <TableHead className="min-w-[200px]">Description & Payer</TableHead>
                <TableHead className="min-w-[140px]">Reference</TableHead>
                <TableHead className="text-right w-28">Charge (Dr)</TableHead>
                <TableHead className="text-right w-28">Payment (Cr)</TableHead>
                <TableHead className="text-right w-32">Balance</TableHead>
                <TableHead className="w-12 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const meta = parsePaymentMeta(r);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(r.entry_date)}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 max-w-[260px]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-sm text-foreground">
                            {r.description}
                          </span>
                        </div>
                        {meta.isCustomerPayment && (
                          <div className="flex items-center gap-1">
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30 font-medium py-0 px-1.5"
                            >
                              <User className="h-3 w-3 mr-0.5" />
                              Paid by Customer
                            </Badge>
                            {meta.channel === "upi" ? (
                              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                                UPI
                              </span>
                            ) : meta.channel === "cash" ? (
                              <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400">
                                Cash
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                      {r.ref_no ?? "—"}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap font-medium text-rose-600 dark:text-rose-400">
                      {r.debit > 0 ? formatInr(r.debit) : "—"}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap font-medium text-emerald-600 dark:text-emerald-400">
                      {r.credit > 0 ? formatInr(r.credit) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-semibold whitespace-nowrap">
                      {formatInr(r.running_balance)}
                    </TableCell>
                    <TableCell className="text-right">
                      <RowActions
                        canEdit={roles.canWrite}
                        canDelete={roles.canDelete}
                        onEdit={() => handleOpenEdit(r)}
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

      {/* Record Entry Dialog */}
      <Dialog
        open={recording}
        onOpenChange={(o) => {
          if (!o) {
            setRecording(false);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle>Record agency ledger entry</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (Number(amount || 0) <= 0) {
                toast.error("Please enter a valid amount");
                return;
              }
              createMut.mutate();
            }}
          >
            <DialogBody className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Entry type" required>
                  <Select
                    value={entryType}
                    onValueChange={(v) => setEntryType(v as LedgerEntryType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEDGER_ENTRY_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t === "charge" ? "Charge (they billed us)" : "Payment (we paid them)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Date" required>
                  <Input
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                  />
                </Field>
              </div>

              <Field label="Amount (₹)" required>
                <CurrencyInput value={amount} onChange={setAmount} />
              </Field>

              {/* PAYMENT SOURCE TOGGLE (IF PAYMENT) */}
              {entryType === "payment" && (
                <div className="rounded-xl border border-border/80 bg-muted/30 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">
                      Who is paying this agency?
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaidBy("company")}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg border text-xs font-medium cursor-pointer transition-all",
                        paidBy === "company"
                          ? "border-primary bg-primary/10 text-primary shadow-xs"
                          : "border-border bg-background hover:bg-muted/50 text-muted-foreground",
                      )}
                    >
                      <Building2 className="h-4 w-4 shrink-0" />
                      <div className="text-left">
                        <div className="font-semibold text-foreground">Company Direct</div>
                        <div className="text-[10px] text-muted-foreground">Stone Tech Account</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaidBy("customer")}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg border text-xs font-medium cursor-pointer transition-all",
                        paidBy === "customer"
                          ? "border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-300 shadow-xs"
                          : "border-border bg-background hover:bg-muted/50 text-muted-foreground",
                      )}
                    >
                      <User className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
                      <div className="text-left">
                        <div className="font-semibold text-foreground">Customer on our behalf</div>
                        <div className="text-[10px] text-muted-foreground">
                          UPI / Cash to agency
                        </div>
                      </div>
                    </button>
                  </div>

                  {paidBy === "customer" && (
                    <div className="space-y-3 pt-2 border-t border-border/60">
                      <Field label="Customer (Who paid on our behalf?)">
                        <EntityPicker
                          type="customer"
                          value={customerId}
                          onChange={(id, row) => {
                            setCustomerId(id);
                            if (row) setCustomerName((row as { name?: string })?.name ?? "");
                          }}
                          placeholder="Search customer…"
                        />
                        <div className="mt-1.5">
                          <Input
                            placeholder="Or type customer / site name"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className="text-xs h-8"
                          />
                        </div>
                      </Field>

                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Payment Method">
                          <Select
                            value={paymentChannel}
                            onValueChange={(v) => setPaymentChannel(v as typeof paymentChannel)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="upi">UPI (GPay/PhonePe)</SelectItem>
                              <SelectItem value="cash">Cash (at site)</SelectItem>
                              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                              <SelectItem value="cheque">Cheque</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>

                        <Field label="Reference / UPI">
                          <Input
                            value={refNo}
                            onChange={(e) => setRefNo(e.target.value)}
                            placeholder="e.g. UPI / Ref #"
                            className="h-9 text-xs"
                          />
                        </Field>
                      </div>
                    </div>
                  )}

                  {paidBy === "company" && (
                    <div className="pt-2 border-t border-border/60">
                      <Field label="Reference # / UTR">
                        <Input
                          value={refNo}
                          onChange={(e) => setRefNo(e.target.value)}
                          placeholder="e.g. UTR / Cheque / Bank Ref"
                          className="h-9 text-xs"
                        />
                      </Field>
                    </div>
                  )}
                </div>
              )}

              {/* Charge Reference */}
              {entryType === "charge" && (
                <Field label="Bill / Reference #">
                  <Input
                    value={refNo}
                    onChange={(e) => setRefNo(e.target.value)}
                    placeholder="e.g. Bill # / Memo Ref"
                  />
                </Field>
              )}

              <Field label="Description">
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    entryType === "charge"
                      ? "e.g. Polishing work — Sharma site"
                      : paidBy === "customer"
                        ? "e.g. Paid by Customer via UPI"
                        : "e.g. Payment to agency"
                  }
                />
              </Field>

              <Field label="Notes (Optional)">
                <Textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional remarks or site context…"
                  className="text-xs"
                />
              </Field>
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setRecording(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMut.isPending}>
                Save entry
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Entry Dialog */}
      <Dialog
        open={!!toEdit}
        onOpenChange={(o) => {
          if (!o) setToEdit(null);
        }}
      >
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle>Edit ledger entry</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (Number(editAmount || 0) <= 0) {
                toast.error("Amount must be greater than zero");
                return;
              }
              editMut.mutate();
            }}
          >
            <DialogBody className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Entry type" required>
                  <Select value={editType} onValueChange={(v) => setEditType(v as LedgerEntryType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEDGER_ENTRY_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t === "charge" ? "Charge (they billed us)" : "Payment (we paid them)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Date" required>
                  <Input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    required
                  />
                </Field>
              </div>

              <Field label="Amount" required>
                <CurrencyInput value={editAmount} onChange={setEditAmount} />
              </Field>

              {editType === "payment" && (
                <div className="rounded-xl border border-border/80 bg-muted/30 p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditPaidBy("company")}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg border text-xs font-medium cursor-pointer transition-all",
                        editPaidBy === "company"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground",
                      )}
                    >
                      <Building2 className="h-4 w-4" />
                      <span>Company</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditPaidBy("customer")}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg border text-xs font-medium cursor-pointer transition-all",
                        editPaidBy === "customer"
                          ? "border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-300"
                          : "border-border bg-background text-muted-foreground",
                      )}
                    >
                      <User className="h-4 w-4" />
                      <span>Customer</span>
                    </button>
                  </div>

                  {editPaidBy === "customer" && (
                    <div className="space-y-2 pt-2 border-t border-border/60">
                      <Field label="Customer / Payer Name">
                        <Input
                          value={editCustomerName}
                          onChange={(e) => setEditCustomerName(e.target.value)}
                          placeholder="e.g. Ramesh Sharma"
                          className="h-8 text-xs"
                        />
                      </Field>
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Channel">
                          <Select
                            value={editPaymentChannel}
                            onValueChange={(v) =>
                              setEditPaymentChannel(v as typeof editPaymentChannel)
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="upi">UPI</SelectItem>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="bank_transfer">Bank</SelectItem>
                              <SelectItem value="cheque">Cheque</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field label="Reference">
                          <Input
                            value={editRefNo}
                            onChange={(e) => setEditRefNo(e.target.value)}
                            className="h-8 text-xs"
                          />
                        </Field>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {editType === "charge" && (
                <Field label="Reference #">
                  <Input value={editRefNo} onChange={(e) => setEditRefNo(e.target.value)} />
                </Field>
              )}

              <Field label="Description" required>
                <Input
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  required
                />
              </Field>

              <Field label="Notes">
                <Textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                />
              </Field>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setToEdit(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editMut.isPending}>
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete ledger entry?"
        description={
          toDelete
            ? `Are you sure you want to delete "${toDelete.description}"? This entry will be permanently removed and the running balance will be recalculated.`
            : ""
        }
        busy={deleteMut.isPending}
        onConfirm={() => toDelete && deleteMut.mutate(toDelete.id)}
      />

      <ShareStatementDialog
        open={statementOpen}
        onOpenChange={setStatementOpen}
        data={statementData}
      />
    </div>
  );
}

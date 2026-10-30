import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  HandCoins,
  User,
  Building2,
  Smartphone,
  Banknote,
  CheckCircle2,
  Filter,
  Tag,
  CreditCard,
  ReceiptText,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Button } from "@/components/ui/button";
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
import { Field } from "@/components/forms/Field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DataToolbar } from "@/components/data/DataToolbar";
import { DataTableShell } from "@/components/data/DataTableShell";
import { TablePagination } from "@/components/data/Pagination";
import { RowActions } from "@/components/data/RowActions";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import { EntityPicker } from "@/components/forms/EntityPicker";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { formatInr, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  listInstallationLedger,
  createInstallationLedgerEntry,
  updateInstallationLedgerEntry,
  deleteInstallationLedgerEntry,
  type InstallationLedgerRow,
} from "@/lib/installation-ledger/api";
import { invalidateInstallationLedger, invalidateCustomer } from "@/lib/query-invalidation";
import {
  listInstallationAgencies,
  AGENCY_WORK_TYPES,
  getAgencyCategoryInfo,
  parsePaymentMeta,
  type InstallationAgencyRow,
  type AgencyWorkType,
} from "@/lib/installation-agencies/api";
import { createReceipt } from "@/lib/receipts/api";
import { useRoles } from "@/hooks/use-roles";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_authenticated/agency-payments")({
  ssr: false,
  component: AgencyPaymentsPage,
});

function today() {
  return new Date().toISOString().slice(0, 10);
}

function AgencyPaymentsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const roles = useRoles();
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 250);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [payerFilter, setPayerFilter] = useState<"all" | "company" | "customer">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [openCreate, setOpenCreate] = useState(false);
  const [toDelete, setToDelete] = useState<InstallationLedgerRow | null>(null);
  const [toEdit, setToEdit] = useState<InstallationLedgerRow | null>(null);

  // Create Form State
  const [form, setForm] = useState({
    installation_agency_id: "",
    entry_date: today(),
    amount: 0,
    paid_by: "company" as "company" | "customer",
    customer_id: null as string | null,
    customer_name: "",
    payment_channel: "upi" as "upi" | "cash" | "bank_transfer" | "cheque",
    ref_no: "",
    description: "",
    notes: "",
    also_record_customer_receipt: false,
  });

  // Edit Form State
  const [editForm, setEditForm] = useState({
    installation_agency_id: "",
    entry_date: today(),
    amount: 0,
    paid_by: "company" as "company" | "customer",
    customer_id: null as string | null,
    customer_name: "",
    payment_channel: "upi" as "upi" | "cash" | "bank_transfer" | "cheque",
    ref_no: "",
    description: "",
    notes: "",
  });

  const agenciesQuery = useQuery({
    queryKey: qk.installationAgencies.list(),
    queryFn: () => listInstallationAgencies(false),
  });

  const ledgerQuery = useQuery({
    queryKey: qk.installationLedger.all(),
    queryFn: () => listInstallationLedger(),
  });

  const agencyMap = useMemo(
    () => new Map((agenciesQuery.data ?? []).map((a) => [a.id, a])),
    [agenciesQuery.data],
  );
  const agencies = agenciesQuery.data ?? [];

  const paymentRows = useMemo(() => {
    const all = ledgerQuery.data ?? [];
    // Only payments (credit > 0)
    let payments = all.filter((r) => Number(r.credit ?? 0) > 0);
    // Sort newest first
    payments.sort((a, b) => (b.entry_date > a.entry_date ? 1 : -1));

    // Category Filter
    if (categoryFilter !== "all") {
      payments = payments.filter((p) => {
        const agency = agencyMap.get(p.installation_agency_id);
        const cats = getAgencyCategoryInfo(agency);
        return cats.some((c) => c.value === categoryFilter);
      });
    }

    // Payer Filter
    if (payerFilter !== "all") {
      payments = payments.filter((p) => {
        const meta = parsePaymentMeta(p);
        return payerFilter === "customer" ? meta.isCustomerPayment : !meta.isCustomerPayment;
      });
    }

    // Search query filter
    if (!dq) return payments;
    const term = dq.toLowerCase();
    return payments.filter((p) => {
      const agency = agencyMap.get(p.installation_agency_id);
      const cats = getAgencyCategoryInfo(agency);
      const meta = parsePaymentMeta(p);
      return (
        agency?.name.toLowerCase().includes(term) ||
        agency?.code.toLowerCase().includes(term) ||
        cats.some((c) => c.label.toLowerCase().includes(term)) ||
        meta.customerName.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term) ||
        (p.ref_no && p.ref_no.toLowerCase().includes(term)) ||
        (p.notes && p.notes.toLowerCase().includes(term))
      );
    });
  }, [ledgerQuery.data, dq, categoryFilter, payerFilter, agencyMap]);

  const totalPaid = useMemo(
    () => paymentRows.reduce((acc, r) => acc + Number(r.credit ?? 0), 0),
    [paymentRows],
  );

  const pageRows = paymentRows.slice((page - 1) * pageSize, page * pageSize);

  const recordMut = useMutation({
    mutationFn: async () => {
      const isCust = form.paid_by === "customer";
      const channelLabel = form.payment_channel.toUpperCase();
      const agency = agencyMap.get(form.installation_agency_id);
      const agencyName = agency?.name ?? "Agency";

      // Formulate clear, structured description
      let finalDescription = form.description.trim();
      if (!finalDescription) {
        if (isCust) {
          finalDescription = `Paid by Customer${
            form.customer_name ? `: ${form.customer_name}` : ""
          } (${channelLabel})`;
        } else {
          finalDescription = "Payment to agency";
        }
      }

      // Structured reference #
      let finalRef = form.ref_no.trim();
      if (isCust && !finalRef) {
        finalRef = `${channelLabel} (Direct to Agency)`;
      }

      // Structured metadata notes tag
      let finalNotes = form.notes.trim();
      if (isCust) {
        const tags = `[PaidBy:customer]${
          form.customer_name ? ` [Customer:${form.customer_name}]` : ""
        } [Method:${form.payment_channel}]`;
        finalNotes = finalNotes ? `${tags} ${finalNotes}` : tags;
      }

      // 1. Record in Agency Ledger
      const ledgerEntry = await createInstallationLedgerEntry({
        installation_agency_id: form.installation_agency_id,
        entry_date: form.entry_date,
        entry_type: "payment",
        amount: form.amount,
        description: finalDescription,
        ref_no: finalRef || null,
        notes: finalNotes || null,
      });

      // 2. Optionally record receipt in Customer Ledger
      if (isCust && form.also_record_customer_receipt && form.customer_id) {
        try {
          await createReceipt({
            customer_id: form.customer_id,
            received_at: form.entry_date,
            amount: form.amount,
            method: form.payment_channel === "cash" ? "cash" : "upi_manual",
            tds_amount: 0,
            bank_charges: 0,
            reference_no: finalRef || `Paid to agency: ${agencyName}`,
            remarks: `Direct payment made to agency/contractor (${agencyName}) on Stone Tech's behalf.`,
            allocations: [],
          });
          invalidateCustomer(qc, form.customer_id);
        } catch (custErr) {
          console.error("Failed to post customer ledger receipt", custErr);
          toast.warning(
            "Agency ledger updated, but customer receipt could not be posted automatically.",
          );
        }
      }

      return ledgerEntry;
    },
    onSuccess: () => {
      toast.success(
        form.paid_by === "customer"
          ? "Customer direct payment recorded in agency ledger!"
          : t("agencyPayments.recorded", "Agency payment recorded"),
      );
      invalidateInstallationLedger(qc, form.installation_agency_id);
      setOpenCreate(false);
      setForm({
        installation_agency_id: "",
        entry_date: today(),
        amount: 0,
        paid_by: "company",
        customer_id: null,
        customer_name: "",
        payment_channel: "upi",
        ref_no: "",
        description: "",
        notes: "",
        also_record_customer_receipt: false,
      });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteInstallationLedgerEntry(id),
    onSuccess: () => {
      toast.success(t("agencyPayments.deleted", "Agency payment deleted"));
      invalidateInstallationLedger(qc, toDelete?.installation_agency_id);
      setToDelete(null);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const editMut = useMutation({
    mutationFn: async () => {
      if (!toEdit) throw new Error("No payment selected");
      const isCust = editForm.paid_by === "customer";
      const channelLabel = editForm.payment_channel.toUpperCase();

      let finalDescription = editForm.description.trim();
      if (!finalDescription) {
        if (isCust) {
          finalDescription = `Paid by Customer${
            editForm.customer_name ? `: ${editForm.customer_name}` : ""
          } (${channelLabel})`;
        } else {
          finalDescription = "Payment to agency";
        }
      }

      let finalRef = editForm.ref_no.trim();
      if (isCust && !finalRef) {
        finalRef = `${channelLabel} (Direct to Agency)`;
      }

      let finalNotes = editForm.notes.trim();
      // Remove old tags if re-saving
      finalNotes = finalNotes
        .replace(/\[PaidBy:[^\]]+\]\s*/g, "")
        .replace(/\[Customer:[^\]]+\]\s*/g, "")
        .replace(/\[Method:[^\]]+\]\s*/g, "")
        .trim();
      if (isCust) {
        const tags = `[PaidBy:customer]${
          editForm.customer_name ? ` [Customer:${editForm.customer_name}]` : ""
        } [Method:${editForm.payment_channel}]`;
        finalNotes = finalNotes ? `${tags} ${finalNotes}` : tags;
      }

      return updateInstallationLedgerEntry(toEdit.id, {
        installation_agency_id: editForm.installation_agency_id,
        entry_date: editForm.entry_date,
        entry_type: "payment",
        amount: editForm.amount,
        description: finalDescription,
        ref_no: finalRef || null,
        notes: finalNotes || null,
      });
    },
    onSuccess: () => {
      toast.success(t("agencyPayments.updated", "Agency payment updated"));
      invalidateInstallationLedger(qc, editForm.installation_agency_id);
      if (toEdit && toEdit.installation_agency_id !== editForm.installation_agency_id) {
        invalidateInstallationLedger(qc, toEdit.installation_agency_id);
      }
      setToEdit(null);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const selectedCreateAgency = agencyMap.get(form.installation_agency_id);
  const selectedCreateCategories = getAgencyCategoryInfo(selectedCreateAgency);

  const selectedEditAgency = agencyMap.get(editForm.installation_agency_id);
  const selectedEditCategories = getAgencyCategoryInfo(selectedEditAgency);

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("agencyPayments.title", "Installation Team Payments")}
        subtitle="Payment settlements, advances, and direct customer payments recorded for installation, polishing, and carting teams."
        actions={
          roles.canWrite ? (
            <Button size="sm" onClick={() => setOpenCreate(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t("agencyPayments.recordPayment", "Record team payment")}
            </Button>
          ) : undefined
        }
      />

      {/* Toolbar with Category and Payer Filters */}
      <div className="space-y-2">
        <DataToolbar
          count={paymentRows.length}
          search={q}
          onSearchChange={setQ}
          searchPlaceholder="Search team, category, ref #, customer…"
          extra={
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter */}
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-8 text-xs w-[170px] bg-background">
                  <Tag className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {AGENCY_WORK_TYPES.map((wt) => (
                    <SelectItem key={wt.value} value={wt.value}>
                      {wt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Payer Source Filter */}
              <Select
                value={payerFilter}
                onValueChange={(v) => setPayerFilter(v as typeof payerFilter)}
              >
                <SelectTrigger className="h-8 text-xs w-[160px] bg-background">
                  <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="All Payers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payers</SelectItem>
                  <SelectItem value="company">🏢 Paid by Company</SelectItem>
                  <SelectItem value="customer">👤 Paid by Customer</SelectItem>
                </SelectContent>
              </Select>

              <span className="hidden text-xs text-muted-foreground lg:inline font-medium ml-2">
                {t("agencyPayments.totalPaid", "Total Paid")}: {formatInr(totalPaid)}
              </span>
            </div>
          }
        />
      </div>

      {ledgerQuery.isLoading || agenciesQuery.isLoading ? (
        <SkeletonTable rows={5} columns={7} />
      ) : ledgerQuery.error ? (
        <ErrorBlock
          message={toUserMessage(ledgerQuery.error)}
          onRetry={() => ledgerQuery.refetch()}
        />
      ) : paymentRows.length === 0 ? (
        <EmptyState
          title={t("agencyPayments.emptyTitle", "No agency payments found")}
          message={
            categoryFilter !== "all" || payerFilter !== "all" || q
              ? "No payments match the applied filters or search."
              : t(
                  "agencyPayments.emptyMessage",
                  "Record a payment to an installation, polishing, or transport team to track settlements.",
                )
          }
          action={
            roles.canWrite ? (
              <Button size="sm" onClick={() => setOpenCreate(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t("agencyPayments.recordPayment", "Record team payment")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <DataTableShell
          footer={
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={paymentRows.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          }
        >
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">{t("agencyPayments.columns.date", "Date")}</TableHead>
                <TableHead className="min-w-[170px]">
                  {t("agencyPayments.columns.agency", "Installation Team")}
                </TableHead>
                {/* User Request: Mention their category (polishing, carting, transport, etc.) instead of generic description */}
                <TableHead className="min-w-[200px]">Category / Specialization</TableHead>
                <TableHead className="min-w-[180px]">Payment Source & Ref #</TableHead>
                <TableHead className="text-right w-32">
                  {t("agencyPayments.columns.amountPaid", "Amount Paid")}
                </TableHead>
                <TableHead className="w-24">
                  {t("agencyPayments.columns.ledger", "Ledger")}
                </TableHead>
                <TableHead className="w-12 text-right">{t("common.actions", "Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((r) => {
                const agency = agencyMap.get(r.installation_agency_id);
                const categories = getAgencyCategoryInfo(agency);
                const meta = parsePaymentMeta(r);

                return (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(r.entry_date)}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <HandCoins className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate max-w-[180px]">
                          {agency?.name ?? t("agencyPayments.unknownAgency", "Unknown agency")}
                        </span>
                      </div>
                    </TableCell>

                    {/* CATEGORY & SPECIALIZATION BADGES */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex flex-wrap gap-1">
                          {categories.map((cat, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className={cn("text-[11px] font-medium py-0.5 px-2", cat.badgeClass)}
                            >
                              {cat.label}
                            </Badge>
                          ))}
                        </div>
                        {/* Show custom note if not the generic "Payment to agency" */}
                        {r.description &&
                          r.description !== "Payment to agency" &&
                          !r.description.toLowerCase().startsWith("paid by customer") && (
                            <p
                              className="text-[11px] text-muted-foreground truncate max-w-[220px]"
                              title={r.description}
                            >
                              {r.description}
                            </p>
                          )}
                      </div>
                    </TableCell>

                    {/* PAYMENT SOURCE & REFERENCE # */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {meta.isCustomerPayment ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30 font-medium gap-1 py-0.5"
                            >
                              <User className="h-3 w-3" />
                              <span>Paid by Customer</span>
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-400/30 font-medium gap-1 py-0.5"
                            >
                              <Building2 className="h-3 w-3" />
                              <span>Company Direct</span>
                            </Badge>
                          )}

                          {meta.channel === "upi" ? (
                            <Badge
                              variant="secondary"
                              className="text-[9px] font-mono uppercase bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                            >
                              UPI
                            </Badge>
                          ) : meta.channel === "cash" ? (
                            <Badge
                              variant="secondary"
                              className="text-[9px] font-mono uppercase bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                            >
                              Cash
                            </Badge>
                          ) : null}
                        </div>

                        {/* Reference or Customer Name */}
                        <div className="text-xs font-mono text-muted-foreground flex items-center gap-1 truncate max-w-[240px]">
                          {meta.customerName && (
                            <span className="font-sans font-semibold text-foreground mr-1">
                              {meta.customerName}
                            </span>
                          )}
                          <span>{r.ref_no ?? "—"}</span>
                        </div>
                      </div>
                    </TableCell>

                    {/* AMOUNT */}
                    <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {formatInr(r.credit)}
                    </TableCell>

                    {/* LEDGER LINK */}
                    <TableCell className="whitespace-nowrap">
                      <Link
                        to="/installation-ledger/$agencyId"
                        params={{ agencyId: r.installation_agency_id }}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        {t("agencyPayments.viewLedger", "View ledger")}
                      </Link>
                    </TableCell>

                    {/* ACTIONS */}
                    <TableCell className="text-right">
                      <RowActions
                        canEdit={roles.canWrite}
                        canDelete={roles.canDelete}
                        onEdit={() => {
                          const parsed = parsePaymentMeta(r);
                          setToEdit(r);
                          setEditForm({
                            installation_agency_id: r.installation_agency_id,
                            entry_date: r.entry_date,
                            amount: Number(r.credit || 0),
                            paid_by: parsed.isCustomerPayment ? "customer" : "company",
                            customer_id: null,
                            customer_name: parsed.customerName,
                            payment_channel:
                              parsed.channel === "cash"
                                ? "cash"
                                : parsed.channel === "bank_transfer"
                                  ? "bank_transfer"
                                  : parsed.channel === "cheque"
                                    ? "cheque"
                                    : "upi",
                            ref_no: r.ref_no ?? "",
                            description: r.description ?? "",
                            notes: (r.notes ?? "")
                              .replace(/\[PaidBy:[^\]]+\]\s*/g, "")
                              .replace(/\[Customer:[^\]]+\]\s*/g, "")
                              .replace(/\[Method:[^\]]+\]\s*/g, "")
                              .trim(),
                          });
                        }}
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

      {/* RECORD AGENCY PAYMENT DIALOG */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-lg w-full">
          <DialogHeader>
            <DialogTitle>{t("agencyPayments.dialogTitle", "Record agency payment")}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.installation_agency_id) {
                toast.error("Please select an agency");
                return;
              }
              if (form.amount <= 0) {
                toast.error("Please enter a valid amount");
                return;
              }
              recordMut.mutate();
            }}
          >
            <DialogBody className="space-y-4">
              {/* Agency Selection */}
              <Field label={t("agencyPayments.fieldAgency", "Agency / Contractor")} required>
                <Select
                  value={form.installation_agency_id}
                  onValueChange={(v) => setForm({ ...form, installation_agency_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("agencyPayments.selectAgency", "Select agency…")} />
                  </SelectTrigger>
                  <SelectContent>
                    {agencies.map((a) => {
                      const cats = getAgencyCategoryInfo(a);
                      return (
                        <SelectItem key={a.id} value={a.id}>
                          <div className="flex items-center justify-between gap-2 w-full">
                            <span className="font-medium">{a.name}</span>
                            <div className="flex gap-1">
                              {cats.map((c, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground"
                                >
                                  {c.label}
                                </span>
                              ))}
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                {/* Show selected agency category preview */}
                {selectedCreateAgency && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-[11px] text-muted-foreground">Category:</span>
                    {selectedCreateCategories.map((c, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className={cn("text-[10px] py-0 px-1.5", c.badgeClass)}
                      >
                        {c.label}
                      </Badge>
                    ))}
                  </div>
                )}
              </Field>

              {/* Date & Amount */}
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("agencyPayments.fieldPaymentDate", "Payment date")} required>
                  <Input
                    type="date"
                    value={form.entry_date}
                    onChange={(e) => setForm({ ...form, entry_date: e.target.value })}
                    required
                  />
                </Field>
                <Field label={t("agencyPayments.fieldAmount", "Amount (₹)")} required>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={form.amount || ""}
                    onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </Field>
              </div>

              {/* PAYMENT SOURCE SELECTOR: COMPANY VS CUSTOMER ON OUR BEHALF */}
              <div className="rounded-xl border border-border/80 bg-muted/30 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">
                    Who is paying this agency?
                  </label>
                  <span className="text-[11px] text-muted-foreground">
                    Impacts ledger attribution
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, paid_by: "company" })}
                    className={cn(
                      "flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-all",
                      form.paid_by === "company"
                        ? "border-primary bg-primary/10 text-primary shadow-xs"
                        : "border-border bg-background hover:bg-muted/50 text-muted-foreground",
                    )}
                  >
                    <Building2 className="h-4 w-4 shrink-0" />
                    <div className="text-left">
                      <div className="font-semibold text-foreground">Company Direct</div>
                      <div className="text-[10px] text-muted-foreground">
                        Stone Tech Account / Cash
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, paid_by: "customer" })}
                    className={cn(
                      "flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-all",
                      form.paid_by === "customer"
                        ? "border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-300 shadow-xs"
                        : "border-border bg-background hover:bg-muted/50 text-muted-foreground",
                    )}
                  >
                    <User className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
                    <div className="text-left">
                      <div className="font-semibold text-foreground">Customer on our behalf</div>
                      <div className="text-[10px] text-muted-foreground">
                        Direct to agency via UPI / Cash
                      </div>
                    </div>
                  </button>
                </div>

                {/* If Paid by Customer on our behalf */}
                {form.paid_by === "customer" && (
                  <div className="space-y-3 pt-2 border-t border-border/60">
                    <Field label="Customer (Who paid on our behalf?)" required>
                      <EntityPicker
                        type="customer"
                        value={form.customer_id}
                        onChange={(id, row) =>
                          setForm((f) => ({
                            ...f,
                            customer_id: id,
                            customer_name: (row as { name?: string })?.name ?? f.customer_name,
                          }))
                        }
                        placeholder="Search & select customer…"
                      />
                      <div className="mt-1.5">
                        <Input
                          placeholder="Or type customer / site name (e.g. Ramesh Sharma - Villa)"
                          value={form.customer_name}
                          onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                          className="text-xs h-8"
                        />
                      </div>
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Payment Method" required>
                        <Select
                          value={form.payment_channel}
                          onValueChange={(v) =>
                            setForm({
                              ...form,
                              payment_channel: v as typeof form.payment_channel,
                            })
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="upi">
                              <div className="flex items-center gap-1.5">
                                <Smartphone className="h-3.5 w-3.5 text-emerald-600" />
                                <span>UPI (GPay / PhonePe / QR)</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="cash">
                              <div className="flex items-center gap-1.5">
                                <Banknote className="h-3.5 w-3.5 text-amber-600" />
                                <span>Cash (Paid at Site)</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="bank_transfer">
                              <div className="flex items-center gap-1.5">
                                <Building2 className="h-3.5 w-3.5 text-blue-600" />
                                <span>Bank Transfer / IMPS</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="cheque">
                              <div className="flex items-center gap-1.5">
                                <CreditCard className="h-3.5 w-3.5 text-purple-600" />
                                <span>Cheque</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>

                      <Field label="Reference / UPI / Note">
                        <Input
                          value={form.ref_no}
                          onChange={(e) => setForm({ ...form, ref_no: e.target.value })}
                          placeholder={
                            form.payment_channel === "upi"
                              ? "e.g. UPI Ref / GPay Ref"
                              : form.payment_channel === "cash"
                                ? "e.g. Site cash handover note"
                                : "e.g. UTR / Cheque #"
                          }
                          className="h-9 text-xs"
                        />
                      </Field>
                    </div>

                    {/* Option to also post to customer ledger */}
                    {form.customer_id && (
                      <div className="flex items-start gap-2.5 rounded-lg bg-background p-2.5 border border-border">
                        <Checkbox
                          id="customer-ledger-sync"
                          checked={form.also_record_customer_receipt}
                          onCheckedChange={(c) =>
                            setForm({ ...form, also_record_customer_receipt: !!c })
                          }
                          className="mt-0.5"
                        />
                        <div className="space-y-0.5 text-xs">
                          <label
                            htmlFor="customer-ledger-sync"
                            className="font-medium text-foreground cursor-pointer"
                          >
                            Also record as receipt in Customer Ledger
                          </label>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            Credits {formatInr(form.amount || 0)} to the customer's ledger,
                            acknowledging that they paid this amount to the agency on your company's
                            behalf.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* If Paid by Company */}
                {form.paid_by === "company" && (
                  <div className="space-y-3 pt-2 border-t border-border/60">
                    <Field label="Reference # / UTR / Cheque #">
                      <Input
                        value={form.ref_no}
                        onChange={(e) => setForm({ ...form, ref_no: e.target.value })}
                        placeholder="e.g. UTR / Cheque / Bank Ref"
                        className="h-9 text-xs"
                      />
                    </Field>
                    <Field label="Description (Optional)">
                      <Input
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        placeholder="e.g. Site installation advance"
                        className="h-9 text-xs"
                      />
                    </Field>
                  </div>
                )}
              </div>

              {/* Notes */}
              <Field label={t("agencyPayments.fieldNotes", "Notes (Optional)")}>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Additional remarks, labourers present, or site details…"
                  rows={2}
                  className="text-xs"
                />
              </Field>
            </DialogBody>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setOpenCreate(false)}>
                {t("common.cancel", "Cancel")}
              </Button>
              <Button type="submit" disabled={recordMut.isPending}>
                {t("agencyPayments.recordPayment", "Record payment")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT AGENCY PAYMENT DIALOG */}
      <Dialog open={!!toEdit} onOpenChange={(o) => !o && setToEdit(null)}>
        <DialogContent className="max-w-lg w-full">
          <DialogHeader>
            <DialogTitle>{t("agencyPayments.editDialogTitle", "Edit agency payment")}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!editForm.installation_agency_id) {
                toast.error("Please select an agency");
                return;
              }
              if (editForm.amount <= 0) {
                toast.error("Please enter a valid amount");
                return;
              }
              editMut.mutate();
            }}
          >
            <DialogBody className="space-y-4">
              <Field label={t("agencyPayments.fieldAgency", "Agency / Contractor")} required>
                <Select
                  value={editForm.installation_agency_id}
                  onValueChange={(v) => setEditForm({ ...editForm, installation_agency_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("agencyPayments.selectAgency", "Select agency…")} />
                  </SelectTrigger>
                  <SelectContent>
                    {agencies.map((a) => {
                      const cats = getAgencyCategoryInfo(a);
                      return (
                        <SelectItem key={a.id} value={a.id}>
                          <div className="flex items-center justify-between gap-2 w-full">
                            <span className="font-medium">{a.name}</span>
                            <div className="flex gap-1">
                              {cats.map((c, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground"
                                >
                                  {c.label}
                                </span>
                              ))}
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                {selectedEditAgency && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-[11px] text-muted-foreground">Category:</span>
                    {selectedEditCategories.map((c, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className={cn("text-[10px] py-0 px-1.5", c.badgeClass)}
                      >
                        {c.label}
                      </Badge>
                    ))}
                  </div>
                )}
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label={t("agencyPayments.fieldPaymentDate", "Payment date")} required>
                  <Input
                    type="date"
                    value={editForm.entry_date}
                    onChange={(e) => setEditForm({ ...editForm, entry_date: e.target.value })}
                    required
                  />
                </Field>
                <Field label={t("agencyPayments.fieldAmount", "Amount (₹)")} required>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={editForm.amount || ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, amount: parseFloat(e.target.value) || 0 })
                    }
                    required
                  />
                </Field>
              </div>

              {/* PAYMENT SOURCE SELECTOR */}
              <div className="rounded-xl border border-border/80 bg-muted/30 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">
                    Who paid this agency?
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, paid_by: "company" })}
                    className={cn(
                      "flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-all",
                      editForm.paid_by === "company"
                        ? "border-primary bg-primary/10 text-primary shadow-xs"
                        : "border-border bg-background hover:bg-muted/50 text-muted-foreground",
                    )}
                  >
                    <Building2 className="h-4 w-4 shrink-0" />
                    <div className="text-left">
                      <div className="font-semibold text-foreground">Company Direct</div>
                      <div className="text-[10px] text-muted-foreground">
                        Stone Tech Account / Cash
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, paid_by: "customer" })}
                    className={cn(
                      "flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-all",
                      editForm.paid_by === "customer"
                        ? "border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-300 shadow-xs"
                        : "border-border bg-background hover:bg-muted/50 text-muted-foreground",
                    )}
                  >
                    <User className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
                    <div className="text-left">
                      <div className="font-semibold text-foreground">Customer on our behalf</div>
                      <div className="text-[10px] text-muted-foreground">
                        Direct to agency via UPI / Cash
                      </div>
                    </div>
                  </button>
                </div>

                {editForm.paid_by === "customer" && (
                  <div className="space-y-3 pt-2 border-t border-border/60">
                    <Field label="Customer / Client Name">
                      <Input
                        placeholder="e.g. Ramesh Sharma"
                        value={editForm.customer_name}
                        onChange={(e) =>
                          setEditForm({ ...editForm, customer_name: e.target.value })
                        }
                        className="text-xs h-8"
                      />
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Payment Method" required>
                        <Select
                          value={editForm.payment_channel}
                          onValueChange={(v) =>
                            setEditForm({
                              ...editForm,
                              payment_channel: v as typeof editForm.payment_channel,
                            })
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="upi">UPI (GPay / PhonePe / QR)</SelectItem>
                            <SelectItem value="cash">Cash (Paid at Site)</SelectItem>
                            <SelectItem value="bank_transfer">Bank Transfer / IMPS</SelectItem>
                            <SelectItem value="cheque">Cheque</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>

                      <Field label="Reference / UPI / Note">
                        <Input
                          value={editForm.ref_no}
                          onChange={(e) => setEditForm({ ...editForm, ref_no: e.target.value })}
                          placeholder="e.g. UPI Ref / GPay Ref"
                          className="h-9 text-xs"
                        />
                      </Field>
                    </div>
                  </div>
                )}

                {editForm.paid_by === "company" && (
                  <div className="space-y-3 pt-2 border-t border-border/60">
                    <Field label="Reference # / UTR">
                      <Input
                        value={editForm.ref_no}
                        onChange={(e) => setEditForm({ ...editForm, ref_no: e.target.value })}
                        placeholder="e.g. UTR / Cheque / Bank Ref"
                        className="h-9 text-xs"
                      />
                    </Field>
                  </div>
                )}
              </div>

              <Field label={t("agencyPayments.fieldNotes", "Notes")}>
                <Textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={2}
                  className="text-xs"
                />
              </Field>
            </DialogBody>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setToEdit(null)}>
                {t("common.cancel", "Cancel")}
              </Button>
              <Button type="submit" disabled={editMut.isPending}>
                {t("common.save", "Save changes")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={t("agencyPayments.deleteTitle", "Delete agency payment?")}
        description={
          toDelete
            ? t(
                "agencyPayments.deleteDesc",
                "This payment of {{amount}} for {{agency}} will be permanently removed and reversed from the ledger.",
                {
                  amount: formatInr(toDelete.credit),
                  agency:
                    agencyMap.get(toDelete.installation_agency_id)?.name ??
                    t("agencyPayments.unknownAgency", "agency"),
                },
              )
            : ""
        }
        busy={deleteMut.isPending}
        onConfirm={() => toDelete && deleteMut.mutate(toDelete.id)}
      />
    </div>
  );
}

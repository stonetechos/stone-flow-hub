import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, HandCoins } from "lucide-react";
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
import { DataToolbar } from "@/components/data/DataToolbar";
import { DataTableShell } from "@/components/data/DataTableShell";
import { TablePagination } from "@/components/data/Pagination";
import { RowActions } from "@/components/data/RowActions";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { formatInr, formatDate } from "@/lib/format";
import {
  listInstallationLedger,
  createInstallationLedgerEntry,
  updateInstallationLedgerEntry,
  deleteInstallationLedgerEntry,
  type InstallationLedgerRow,
} from "@/lib/installation-ledger/api";
import { invalidateInstallationLedger } from "@/lib/query-invalidation";
import { listInstallationAgencies } from "@/lib/installation-agencies/api";
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [openCreate, setOpenCreate] = useState(false);
  const [toDelete, setToDelete] = useState<InstallationLedgerRow | null>(null);
  const [toEdit, setToEdit] = useState<InstallationLedgerRow | null>(null);

  const [form, setForm] = useState({
    installation_agency_id: "",
    entry_date: today(),
    description: "Payment to agency",
    ref_no: "",
    amount: 0,
    notes: "",
  });

  const [editForm, setEditForm] = useState({
    installation_agency_id: "",
    entry_date: today(),
    description: "",
    ref_no: "",
    amount: 0,
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
    const payments = all.filter((r) => Number(r.credit ?? 0) > 0);
    // Sort newest first for payment register
    payments.sort((a, b) => (b.entry_date > a.entry_date ? 1 : -1));

    if (!dq) return payments;
    const term = dq.toLowerCase();
    return payments.filter((p) => {
      const agency = agencyMap.get(p.installation_agency_id);
      return (
        agency?.name.toLowerCase().includes(term) ||
        agency?.code.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term) ||
        (p.ref_no && p.ref_no.toLowerCase().includes(term))
      );
    });
  }, [ledgerQuery.data, dq, agencyMap]);

  const totalPaid = useMemo(
    () => paymentRows.reduce((acc, r) => acc + Number(r.credit ?? 0), 0),
    [paymentRows],
  );

  const pageRows = paymentRows.slice((page - 1) * pageSize, page * pageSize);

  const recordMut = useMutation({
    mutationFn: () =>
      createInstallationLedgerEntry({
        installation_agency_id: form.installation_agency_id,
        entry_date: form.entry_date,
        entry_type: "payment",
        amount: form.amount,
        description: form.description,
        ref_no: form.ref_no || null,
        notes: form.notes || null,
      }),
    onSuccess: () => {
      toast.success(t("agencyPayments.recorded", "Agency payment recorded"));
      invalidateInstallationLedger(qc, form.installation_agency_id);
      setOpenCreate(false);
      setForm({
        installation_agency_id: "",
        entry_date: today(),
        description: "Payment to agency",
        ref_no: "",
        amount: 0,
        notes: "",
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
    mutationFn: () => {
      if (!toEdit) throw new Error("No payment selected");
      return updateInstallationLedgerEntry(toEdit.id, {
        installation_agency_id: editForm.installation_agency_id,
        entry_date: editForm.entry_date,
        entry_type: "payment",
        amount: editForm.amount,
        description: editForm.description,
        ref_no: editForm.ref_no || null,
        notes: editForm.notes || null,
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

  return (
    <div>
      <PageHeader
        title={t("agencyPayments.title", "Agency's Payments")}
        subtitle={t(
          "agencyPayments.subtitle",
          "Payment settlements, advances, and adjustments recorded for installation agencies.",
        )}
        actions={
          roles.canWrite ? (
            <Button size="sm" onClick={() => setOpenCreate(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t("agencyPayments.recordPayment", "Record agency payment")}
            </Button>
          ) : undefined
        }
      />

      <DataToolbar
        count={paymentRows.length}
        search={q}
        onSearchChange={setQ}
        searchPlaceholder={t(
          "agencyPayments.searchPlaceholder",
          "Search agency, ref #, description…",
        )}
        extra={
          <span className="hidden text-xs text-muted-foreground md:inline">
            {t("agencyPayments.totalPaid", "Total Paid")}: {formatInr(totalPaid)}
          </span>
        }
      />

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
          message={t(
            "agencyPayments.emptyMessage",
            "Record a payment to an installation agency to track settlements.",
          )}
          action={
            roles.canWrite ? (
              <Button size="sm" onClick={() => setOpenCreate(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t("agencyPayments.recordPayment", "Record agency payment")}
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
          <Table className="min-w-[680px]">
            <TableHeader>
              <TableRow>
                <TableHead>{t("agencyPayments.columns.date", "Date")}</TableHead>
                <TableHead>{t("agencyPayments.columns.agency", "Agency")}</TableHead>
                <TableHead>{t("agencyPayments.columns.description", "Description")}</TableHead>
                <TableHead>{t("agencyPayments.columns.refNo", "Reference #")}</TableHead>
                <TableHead className="text-right">
                  {t("agencyPayments.columns.amountPaid", "Amount Paid")}
                </TableHead>
                <TableHead>{t("agencyPayments.columns.ledger", "Ledger")}</TableHead>
                <TableHead className="w-12 text-right">{t("common.actions", "Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((r) => {
                const agency = agencyMap.get(r.installation_agency_id);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(r.entry_date)}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <HandCoins className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate max-w-[150px] sm:max-w-none">
                          {agency?.name ?? t("agencyPayments.unknownAgency", "Unknown agency")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{r.description}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {r.ref_no ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {formatInr(r.credit)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Link
                        to="/installation-ledger/$agencyId"
                        params={{ agencyId: r.installation_agency_id }}
                        className="text-xs text-primary hover:underline"
                      >
                        {t("agencyPayments.viewLedger", "View ledger")}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">
                      <RowActions
                        canEdit={roles.canWrite}
                        canDelete={roles.canDelete}
                        onEdit={() => {
                          setToEdit(r);
                          setEditForm({
                            installation_agency_id: r.installation_agency_id,
                            entry_date: r.entry_date,
                            description: r.description,
                            ref_no: r.ref_no ?? "",
                            amount: Number(r.credit || 0),
                            notes: r.notes ?? "",
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

      {/* Create Dialog */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle>{t("agencyPayments.dialogTitle", "Record agency payment")}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.installation_agency_id) {
                toast.error("Please select an installation agency");
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
              <Field label={t("agencyPayments.fieldAgency", "Installation agency")} required>
                <Select
                  value={form.installation_agency_id}
                  onValueChange={(v) => setForm({ ...form, installation_agency_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("agencyPayments.selectAgency", "Select agency…")} />
                  </SelectTrigger>
                  <SelectContent>
                    {agencies.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

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

              <Field label={t("agencyPayments.fieldDescription", "Description")} required>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Site installation advance"
                  required
                />
              </Field>

              <Field label={t("agencyPayments.fieldRefNo", "Reference # / UTR")}>
                <Input
                  value={form.ref_no}
                  onChange={(e) => setForm({ ...form, ref_no: e.target.value })}
                  placeholder="e.g. UTR / Cheque / Bank Ref"
                />
              </Field>

              <Field label={t("agencyPayments.fieldNotes", "Notes")}>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
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

      {/* Edit Dialog */}
      <Dialog open={!!toEdit} onOpenChange={(o) => !o && setToEdit(null)}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle>{t("agencyPayments.editDialogTitle", "Edit agency payment")}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!editForm.installation_agency_id) {
                toast.error("Please select an installation agency");
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
              <Field label={t("agencyPayments.fieldAgency", "Installation agency")} required>
                <Select
                  value={editForm.installation_agency_id}
                  onValueChange={(v) => setEditForm({ ...editForm, installation_agency_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("agencyPayments.selectAgency", "Select agency…")} />
                  </SelectTrigger>
                  <SelectContent>
                    {agencies.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

              <Field label={t("agencyPayments.fieldDescription", "Description")} required>
                <Input
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="e.g. Site installation advance"
                  required
                />
              </Field>

              <Field label={t("agencyPayments.fieldRefNo", "Reference # / UTR")}>
                <Input
                  value={editForm.ref_no}
                  onChange={(e) => setEditForm({ ...editForm, ref_no: e.target.value })}
                  placeholder="e.g. UTR / Cheque / Bank Ref"
                />
              </Field>

              <Field label={t("agencyPayments.fieldNotes", "Notes")}>
                <Textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={2}
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

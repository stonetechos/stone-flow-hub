import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
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
import { RowActions } from "@/components/data/RowActions";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import { DataTableShell } from "@/components/data/DataTableShell";
import { toUserMessage } from "@/lib/errors";
import { formatInr } from "@/lib/format";
import { qk } from "@/lib/query-keys";
import {
  createInstallationLedgerEntry,
  updateInstallationLedgerEntry,
  deleteInstallationLedgerEntry,
  listInstallationLedger,
  type InstallationLedgerRow,
} from "@/lib/installation-ledger/api";
import { invalidateInstallationLedger } from "@/lib/query-invalidation";
import { listInstallationAgencies } from "@/lib/installation-agencies/api";
import { LEDGER_ENTRY_TYPES, type LedgerEntryType } from "@/lib/installation-ledger/schema";
import { useRoles } from "@/hooks/use-roles";

/**
 * Installation Agency Ledger — per-agency detail (Task #48). Manual entry
 * only: the "Record entry" dialog is the entire write path, mirroring how
 * a vendor payment gets recorded today, except the debit/credit choice is
 * explicit here (Charge vs Payment) since there's no trigger inferring it.
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

  const [recording, setRecording] = useState(false);
  const [entryType, setEntryType] = useState<LedgerEntryType>("charge");
  const [entryDate, setEntryDate] = useState(today());
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [refNo, setRefNo] = useState("");
  const [notes, setNotes] = useState("");

  const [toDelete, setToDelete] = useState<InstallationLedgerRow | null>(null);
  const [toEdit, setToEdit] = useState<InstallationLedgerRow | null>(null);
  const [editType, setEditType] = useState<LedgerEntryType>("charge");
  const [editDate, setEditDate] = useState(today());
  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editRefNo, setEditRefNo] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const resetForm = () => {
    setEntryType("charge");
    setEntryDate(today());
    setDescription("");
    setAmount("");
    setRefNo("");
    setNotes("");
  };

  const handleOpenEdit = (r: InstallationLedgerRow) => {
    setToEdit(r);
    setEditType(r.debit > 0 ? "charge" : "payment");
    setEditDate(r.entry_date);
    setEditDescription(r.description);
    setEditAmount(String(r.debit > 0 ? r.debit : r.credit));
    setEditRefNo(r.ref_no ?? "");
    setEditNotes(r.notes ?? "");
  };

  const createMut = useMutation({
    mutationFn: () =>
      createInstallationLedgerEntry({
        installation_agency_id: agencyId,
        entry_date: entryDate,
        entry_type: entryType,
        amount: Number(amount || 0),
        description,
        ref_no: refNo || null,
        notes: notes || null,
      }),
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
    mutationFn: () => {
      if (!toEdit) throw new Error("No entry selected");
      return updateInstallationLedgerEntry(toEdit.id, {
        entry_date: editDate,
        entry_type: editType,
        amount: Number(editAmount || 0),
        description: editDescription,
        ref_no: editRefNo || null,
        notes: editNotes || null,
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

  return (
    <div>
      <PageHeader
        title={agency ? agency.name : "Installation Agency Ledger"}
        subtitle={agency ? `Running balance ${formatInr(balance)}` : undefined}
        actions={
          roles.canWrite ? (
            <Button size="sm" onClick={() => setRecording(true)}>
              <Plus className="mr-2 h-4 w-4" /> Record entry
            </Button>
          ) : undefined
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
          <Table className="min-w-[650px]">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Charge (Dr)</TableHead>
                <TableHead>Payment (Cr)</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead className="w-12 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm whitespace-nowrap">{r.entry_date}</TableCell>
                  <TableCell className="font-medium max-w-[220px] truncate">
                    {r.description}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {r.ref_no ?? "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {r.debit > 0 ? formatInr(r.debit) : "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {r.credit > 0 ? formatInr(r.credit) : "—"}
                  </TableCell>
                  <TableCell className="font-semibold whitespace-nowrap">
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
              ))}
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
            <DialogTitle>Record ledger entry</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!description.trim()) {
                toast.error("Description is required");
                return;
              }
              createMut.mutate();
            }}
          >
            <DialogBody className="grid gap-3 sm:grid-cols-2">
              <Field label="Entry type" required>
                <Select value={entryType} onValueChange={(v) => setEntryType(v as LedgerEntryType)}>
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
              <Field label="Amount" required>
                <CurrencyInput value={amount} onChange={setAmount} />
              </Field>
              <Field label="Reference #">
                <Input value={refNo} onChange={(e) => setRefNo(e.target.value)} />
              </Field>
              <Field label="Description" required className="sm:col-span-2">
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Installation charge — Sharma residence"
                  required
                />
              </Field>
              <Field label="Notes" className="sm:col-span-2">
                <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
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
                Save
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
              if (!editDescription.trim()) {
                toast.error("Description is required");
                return;
              }
              if (Number(editAmount || 0) <= 0) {
                toast.error("Amount must be greater than zero");
                return;
              }
              editMut.mutate();
            }}
          >
            <DialogBody className="grid gap-3 sm:grid-cols-2">
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
              <Field label="Amount" required>
                <CurrencyInput value={editAmount} onChange={setEditAmount} />
              </Field>
              <Field label="Reference #">
                <Input value={editRefNo} onChange={(e) => setEditRefNo(e.target.value)} />
              </Field>
              <Field label="Description" required className="sm:col-span-2">
                <Input
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="e.g. Installation charge — Sharma residence"
                  required
                />
              </Field>
              <Field label="Notes" className="sm:col-span-2">
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
    </div>
  );
}

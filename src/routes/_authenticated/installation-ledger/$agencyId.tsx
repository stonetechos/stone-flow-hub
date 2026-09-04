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
import { toUserMessage } from "@/lib/errors";
import { formatInr } from "@/lib/format";
import { qk } from "@/lib/query-keys";
import {
  createInstallationLedgerEntry,
  listInstallationLedger,
} from "@/lib/installation-ledger/api";
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

  const resetForm = () => {
    setEntryType("charge");
    setEntryDate(today());
    setDescription("");
    setAmount("");
    setRefNo("");
    setNotes("");
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
      qc.invalidateQueries({ queryKey: qk.installationLedger.byAgency(agencyId) });
      qc.invalidateQueries({ queryKey: qk.installationLedger.summaries() });
      setRecording(false);
      resetForm();
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const rows = ledgerQuery.data ?? [];
  const balance = rows.length > 0 ? rows[rows.length - 1].running_balance : 0;

  return (
    <div>
      <PageHeader
        title={agency ? agency.name : "Installation Agency Ledger"}
        subtitle={
          agency ? `Code ${agency.code} — running balance ${formatInr(balance)}` : undefined
        }
        actions={
          roles.canWrite ? (
            <Button size="sm" onClick={() => setRecording(true)}>
              <Plus className="mr-2 h-4 w-4" /> Record entry
            </Button>
          ) : undefined
        }
      />

      {ledgerQuery.isLoading ? (
        <SkeletonTable rows={5} columns={6} />
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
        <div className="overflow-x-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Charge (Dr)</TableHead>
                <TableHead>Payment (Cr)</TableHead>
                <TableHead>Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm">{r.entry_date}</TableCell>
                  <TableCell className="font-medium">{r.description}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.ref_no ?? "—"}</TableCell>
                  <TableCell>{r.debit > 0 ? formatInr(r.debit) : "—"}</TableCell>
                  <TableCell>{r.credit > 0 ? formatInr(r.credit) : "—"}</TableCell>
                  <TableCell className="font-semibold">{formatInr(r.running_balance)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={recording}
        onOpenChange={(o) => {
          if (!o) {
            setRecording(false);
            resetForm();
          }
        }}
      >
        <DialogContent>
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
    </div>
  );
}

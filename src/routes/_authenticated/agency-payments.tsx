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
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { formatInr, formatDate } from "@/lib/format";
import {
  listInstallationLedger,
  createInstallationLedgerEntry,
} from "@/lib/installation-ledger/api";
import { listInstallationAgencies } from "@/lib/installation-agencies/api";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/agency-payments")({
  ssr: false,
  component: AgencyPaymentsPage,
});

function today() {
  return new Date().toISOString().slice(0, 10);
}

function AgencyPaymentsPage() {
  const qc = useQueryClient();
  const roles = useRoles();
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 250);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [openCreate, setOpenCreate] = useState(false);

  const [form, setForm] = useState({
    installation_agency_id: "",
    entry_date: today(),
    description: "Payment to agency",
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
      toast.success("Agency payment recorded");
      qc.invalidateQueries({ queryKey: qk.installationLedger.all() });
      qc.invalidateQueries({ queryKey: qk.installationLedger.summaries() });
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

  return (
    <div>
      <PageHeader
        title="Agency's Payments"
        subtitle="Payment settlements, advances, and adjustments recorded for installation agencies."
        actions={
          roles.canWrite ? (
            <Button size="sm" onClick={() => setOpenCreate(true)}>
              <Plus className="mr-2 h-4 w-4" /> Record agency payment
            </Button>
          ) : undefined
        }
      />

      <DataToolbar
        count={paymentRows.length}
        search={q}
        onSearchChange={setQ}
        searchPlaceholder="Search agency, ref #, description…"
        extra={
          <span className="hidden text-xs text-muted-foreground md:inline">
            Total Paid: {formatInr(totalPaid)}
          </span>
        }
      />

      {ledgerQuery.isLoading || agenciesQuery.isLoading ? (
        <SkeletonTable rows={5} columns={6} />
      ) : ledgerQuery.error ? (
        <ErrorBlock
          message={toUserMessage(ledgerQuery.error)}
          onRetry={() => ledgerQuery.refetch()}
        />
      ) : paymentRows.length === 0 ? (
        <EmptyState
          title="No agency payments found"
          message="Record a payment to an installation agency to track settlements."
          action={
            roles.canWrite ? (
              <Button size="sm" onClick={() => setOpenCreate(true)}>
                <Plus className="mr-2 h-4 w-4" /> Record agency payment
              </Button>
            ) : undefined
          }
        />
      ) : (
        <DataTableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Agency</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Reference #</TableHead>
                <TableHead className="text-right">Amount Paid</TableHead>
                <TableHead>Ledger</TableHead>
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
                        <HandCoins className="h-4 w-4 text-muted-foreground" />
                        <span>{agency?.name ?? "Unknown agency"}</span>
                        {agency?.code && (
                          <span className="font-mono text-xs text-muted-foreground">
                            ({agency.code})
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{r.description}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {r.ref_no ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatInr(r.credit)}
                    </TableCell>
                    <TableCell>
                      <Link
                        to="/installation-ledger/$agencyId"
                        params={{ agencyId: r.installation_agency_id }}
                        className="text-xs text-primary hover:underline"
                      >
                        View ledger
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <TablePagination
            page={page}
            pageSize={pageSize}
            total={paymentRows.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </DataTableShell>
      )}

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record agency payment</DialogTitle>
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
              <Field label="Installation agency" required>
                <Select
                  value={form.installation_agency_id}
                  onValueChange={(v) => setForm({ ...form, installation_agency_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select agency…" />
                  </SelectTrigger>
                  <SelectContent>
                    {agencies.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} ({a.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Payment date" required>
                  <Input
                    type="date"
                    value={form.entry_date}
                    onChange={(e) => setForm({ ...form, entry_date: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Amount (₹)" required>
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

              <Field label="Description" required>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Site installation advance"
                  required
                />
              </Field>

              <Field label="Reference # / UTR">
                <Input
                  value={form.ref_no}
                  onChange={(e) => setForm({ ...form, ref_no: e.target.value })}
                  placeholder="e.g. UTR / Cheque / Bank Ref"
                />
              </Field>

              <Field label="Notes">
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                />
              </Field>
            </DialogBody>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setOpenCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={recordMut.isPending}>
                Record payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

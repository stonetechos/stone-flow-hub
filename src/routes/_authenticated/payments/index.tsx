import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Wallet, Banknote, HandCoins, Users, Factory } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Badge } from "@/components/ui/badge";
import { RowActions } from "@/components/data/RowActions";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import { DataToolbar } from "@/components/data/DataToolbar";
import { DataTableShell } from "@/components/data/DataTableShell";
import { TablePagination } from "@/components/data/Pagination";
import { ColumnsMenu, type ColumnDef } from "@/components/data/ColumnsMenu";
import { DensityMenu } from "@/components/data/DensityMenu";
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
import { useTablePrefs } from "@/hooks/use-table-prefs";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { deletePayment, listPaymentRegister, type PaymentRegisterRow } from "@/lib/payments/crud";
import {
  deleteVendorPayment,
  listVendorPayments,
  type VendorPaymentListItem,
} from "@/lib/vendor-payments/api";
import {
  listInstallationAgencies,
  type InstallationAgencyRow,
} from "@/lib/installation-agencies/api";
import {
  listInstallationLedger,
  createInstallationLedgerEntry,
} from "@/lib/installation-ledger/api";
import { invalidatePayment, invalidateVendorPayment } from "@/lib/query-invalidation";
import { useRoles } from "@/hooks/use-roles";
import { formatInr, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/payments/")({
  ssr: false,
  component: UnifiedPaymentsPage,
  validateSearch: (s: Record<string, unknown>): { q?: string; tab?: string } => ({
    q: typeof s.q === "string" ? s.q : undefined,
    tab: typeof s.tab === "string" ? s.tab : undefined,
  }),
});

function UnifiedPaymentsPage() {
  const search = Route.useSearch();
  const [activeTab, setActiveTab] = useState<"customer" | "vendor" | "agency">(
    (search.tab as "customer" | "vendor" | "agency") || "customer",
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        subtitle="Manage customer payment receipts, vendor bill settlements, and agency disbursements in one place."
      />

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "customer" | "vendor" | "agency")}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-3 md:w-auto md:inline-flex">
          <TabsTrigger value="customer" className="gap-2">
            <Wallet className="h-4 w-4" />
            <span>Customer Payments</span>
          </TabsTrigger>
          <TabsTrigger value="vendor" className="gap-2">
            <Banknote className="h-4 w-4" />
            <span>Vendor Payments</span>
          </TabsTrigger>
          <TabsTrigger value="agency" className="gap-2">
            <HandCoins className="h-4 w-4" />
            <span>Agency Payments</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="customer">
          <CustomerPaymentsTab />
        </TabsContent>

        <TabsContent value="vendor">
          <VendorPaymentsTab />
        </TabsContent>

        <TabsContent value="agency">
          <AgencyPaymentsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ======================================================================
// 1. Customer Payments Tab
// ======================================================================
function CustomerPaymentsTab() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const roles = useRoles();
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 250);
  const [toDelete, setToDelete] = useState<PaymentRegisterRow | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { prefs, setDensity, toggleColumn, isHidden } = useTablePrefs("payments");

  const columnDefs: ColumnDef[] = useMemo(
    () => [
      { key: "no", label: "No.", required: true },
      { key: "invoice", label: "Invoice" },
      { key: "method", label: "Method" },
      { key: "reference", label: "Reference" },
      { key: "date", label: "Date" },
      { key: "amount", label: "Amount" },
    ],
    [],
  );

  const query = useQuery({
    queryKey: qk.paymentRegister.list(dq),
    queryFn: () => listPaymentRegister(dq),
  });

  const del = useMutation({
    mutationFn: (id: string) => deletePayment(id),
    onSuccess: () => {
      toast.success("Payment deleted");
      invalidatePayment(qc);
      setToDelete(null);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  useEffect(() => setPage(1), [dq]);

  const rows = query.data ?? [];
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div>
      <DataToolbar
        count={rows.length}
        search={q}
        onSearchChange={setQ}
        searchPlaceholder="Search customer payment or reference…"
        columns={<ColumnsMenu columns={columnDefs} isHidden={isHidden} onToggle={toggleColumn} />}
        density={<DensityMenu density={prefs.density} onChange={setDensity} />}
        action={
          roles.canWrite ? (
            <Button size="sm" className="h-8" onClick={() => nav({ to: "/receipts/new" })}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> New receipt
            </Button>
          ) : null
        }
      />

      {query.isLoading ? (
        <SkeletonTable rows={6} columns={6} />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-6 w-6" />}
          title="No customer payments yet"
          message="Record a payment or advance received from a customer."
          action={
            roles.canWrite ? (
              <Button onClick={() => nav({ to: "/receipts/new" })}>
                <Plus className="mr-2 h-4 w-4" /> New receipt
              </Button>
            ) : undefined
          }
        />
      ) : (
        <DataTableShell
          density={prefs.density}
          footer={
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={rows.length}
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
                {!isHidden("no") && <TableHead>No.</TableHead>}
                {!isHidden("invoice") && <TableHead>Invoice</TableHead>}
                {!isHidden("method") && <TableHead>Method</TableHead>}
                {!isHidden("reference") && <TableHead>Reference</TableHead>}
                {!isHidden("date") && <TableHead>Date</TableHead>}
                {!isHidden("amount") && <TableHead className="text-right">Amount</TableHead>}
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((r) => (
                <TableRow key={r.id}>
                  {!isHidden("no") && (
                    <TableCell className="font-mono text-xs">
                      {r.source === "receipt" ? (
                        <Link
                          to="/receipts/$receiptId"
                          params={{ receiptId: r.id }}
                          className="text-primary hover:underline"
                        >
                          {r.doc_no}
                        </Link>
                      ) : (
                        <Link
                          to="/payments/$id"
                          params={{ id: r.id }}
                          className="text-primary hover:underline"
                        >
                          {r.doc_no}
                        </Link>
                      )}
                    </TableCell>
                  )}
                  {!isHidden("invoice") && (
                    <TableCell className="font-mono text-xs">{r.invoice_no ?? "—"}</TableCell>
                  )}
                  {!isHidden("method") && (
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {r.method.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                  )}
                  {!isHidden("reference") && <TableCell>{r.reference_no ?? "—"}</TableCell>}
                  {!isHidden("date") && (
                    <TableCell>{new Date(r.paid_at).toLocaleDateString()}</TableCell>
                  )}
                  {!isHidden("amount") && (
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatInr(Number(r.amount))}
                    </TableCell>
                  )}
                  <TableCell>
                    {r.source === "payment" && (
                      <RowActions
                        onEdit={() => nav({ to: "/payments/$id/edit", params: { id: r.id } })}
                        onDelete={() => setToDelete(r)}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete payment?"
        description={toDelete ? `${toDelete.doc_no} will be removed.` : ""}
        busy={del.isPending}
        tone="danger"
        onConfirm={() => toDelete && del.mutate(toDelete.id)}
      />
    </div>
  );
}

// ======================================================================
// 2. Vendor Payments Tab
// ======================================================================
function VendorPaymentsTab() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const roles = useRoles();
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 250);
  const [toDelete, setToDelete] = useState<VendorPaymentListItem | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { prefs, setDensity, toggleColumn, isHidden } = useTablePrefs("vendor-payments");

  const columnDefs: ColumnDef[] = useMemo(
    () => [
      { key: "no", label: "Payment #", required: true },
      { key: "vendor", label: "Vendor" },
      { key: "po", label: "PO" },
      { key: "type", label: "Type" },
      { key: "amount", label: "Amount" },
      { key: "paid", label: "Paid on" },
    ],
    [],
  );

  const query = useQuery({
    queryKey: qk.vendorPayments.list(dq),
    queryFn: () => listVendorPayments(dq),
  });
  useEffect(() => setPage(1), [dq]);

  const del = useMutation({
    mutationFn: (id: string) => deleteVendorPayment(id),
    onSuccess: (_void, id) => {
      toast.success("Payment removed");
      invalidateVendorPayment(qc, toDelete?.vendor_id, id);
      setToDelete(null);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const rows = query.data ?? [];
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div>
      <DataToolbar
        count={rows.length}
        search={q}
        onSearchChange={setQ}
        searchPlaceholder="Search payment no or reference…"
        columns={<ColumnsMenu columns={columnDefs} isHidden={isHidden} onToggle={toggleColumn} />}
        density={<DensityMenu density={prefs.density} onChange={setDensity} />}
        action={
          roles.canWrite ? (
            <Button size="sm" className="h-8" onClick={() => nav({ to: "/vendor-payments/new" })}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Record payment
            </Button>
          ) : null
        }
      />

      {query.isLoading ? (
        <SkeletonTable rows={6} columns={6} />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Banknote className="h-6 w-6" />}
          title="No vendor payments yet"
          message="Record an advance, part or full payment to a vendor."
          action={
            roles.canWrite ? (
              <Button onClick={() => nav({ to: "/vendor-payments/new" })}>
                <Plus className="mr-2 h-4 w-4" /> Record payment
              </Button>
            ) : undefined
          }
        />
      ) : (
        <DataTableShell
          density={prefs.density}
          footer={
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={rows.length}
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
                {!isHidden("no") && <TableHead>Payment #</TableHead>}
                {!isHidden("vendor") && <TableHead>Vendor</TableHead>}
                {!isHidden("po") && <TableHead>PO</TableHead>}
                {!isHidden("type") && <TableHead>Type</TableHead>}
                {!isHidden("amount") && <TableHead className="text-right">Amount</TableHead>}
                {!isHidden("paid") && <TableHead>Paid on</TableHead>}
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((r) => (
                <TableRow key={r.id}>
                  {!isHidden("no") && (
                    <TableCell className="font-mono text-xs">
                      <Link
                        to="/vendor-payments/$id"
                        params={{ id: r.id }}
                        className="text-primary hover:underline"
                      >
                        {r.payment_no}
                      </Link>
                    </TableCell>
                  )}
                  {!isHidden("vendor") && (
                    <TableCell>
                      {r.vendor ? (
                        <Link
                          to="/vendors/$vendorId"
                          params={{ vendorId: r.vendor.id }}
                          className="text-primary hover:underline"
                        >
                          {r.vendor.company_name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  )}
                  {!isHidden("po") && (
                    <TableCell>
                      {r.purchase_order ? (
                        <Link
                          to="/purchase-orders/$id"
                          params={{ id: r.purchase_order.id }}
                          className="text-primary hover:underline"
                        >
                          {r.purchase_order.po_no}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  )}
                  {!isHidden("type") && (
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {r.payment_type.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                  )}
                  {!isHidden("amount") && (
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatInr(Number(r.amount))}
                    </TableCell>
                  )}
                  {!isHidden("paid") && (
                    <TableCell className="text-muted-foreground">
                      {r.paid_at ? formatDate(r.paid_at) : "—"}
                    </TableCell>
                  )}
                  <TableCell>
                    {roles.canWrite && <RowActions onDelete={() => setToDelete(r)} />}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete vendor payment?"
        description={
          toDelete
            ? `Payment ${toDelete.payment_no} (${formatInr(toDelete.amount)}) will be removed.`
            : ""
        }
        busy={del.isPending}
        tone="danger"
        onConfirm={() => toDelete && del.mutate(toDelete.id)}
      />
    </div>
  );
}

// ======================================================================
// 3. Agency Payments Tab
// ======================================================================
function AgencyPaymentsTab() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 250);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [openCreate, setOpenCreate] = useState(false);

  const [form, setForm] = useState({
    installation_agency_id: "",
    entry_date: new Date().toISOString().slice(0, 10),
    description: "Payment to agency",
    ref_no: "",
    amount: 0,
    notes: "",
  });

  const agenciesQuery = useQuery<InstallationAgencyRow[]>({
    queryKey: qk.installationAgencies.list(),
    queryFn: () => listInstallationAgencies(false),
  });

  const ledgerQuery = useQuery({
    queryKey: qk.installationLedger.all(),
    queryFn: () => listInstallationLedger(),
  });

  const agencies = agenciesQuery.data ?? [];
  const agencyMap = useMemo(
    () => new Map((agenciesQuery.data ?? []).map((a: InstallationAgencyRow) => [a.id, a])),
    [agenciesQuery.data],
  );

  const paymentRows = useMemo(() => {
    const all = ledgerQuery.data ?? [];
    const payments = all.filter((r) => Number(r.credit ?? 0) > 0);
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
        entry_date: new Date().toISOString().slice(0, 10),
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
      <DataToolbar
        count={paymentRows.length}
        search={q}
        onSearchChange={(v) => {
          setQ(v);
          setPage(1);
        }}
        searchPlaceholder="Search agency, ref no, description…"
        action={
          <Button size="sm" className="h-8" onClick={() => setOpenCreate(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Record payment
          </Button>
        }
      />

      {ledgerQuery.isLoading ? (
        <SkeletonTable rows={6} columns={6} />
      ) : ledgerQuery.error ? (
        <ErrorBlock
          message={toUserMessage(ledgerQuery.error)}
          onRetry={() => ledgerQuery.refetch()}
        />
      ) : paymentRows.length === 0 ? (
        <EmptyState
          icon={<HandCoins className="h-6 w-6" />}
          title="No agency payments recorded"
          message="Record payments made to installation and carting agencies."
          action={
            <Button onClick={() => setOpenCreate(true)}>
              <Plus className="mr-2 h-4 w-4" /> Record payment
            </Button>
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
                <TableHead>Ref / UTR</TableHead>
                <TableHead className="text-right">Amount Paid</TableHead>
                <TableHead className="w-20 text-right">Statement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((p) => {
                const agency = agencyMap.get(p.installation_agency_id);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="whitespace-nowrap font-mono text-xs">
                      {formatDate(p.entry_date)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{agency?.name ?? "Agency"}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {agency?.code ?? ""}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{p.description}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {p.ref_no || "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-emerald-600">
                      {formatInr(Number(p.credit))}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" asChild>
                        <Link
                          to="/installation-ledger/$agencyId"
                          params={{ agencyId: p.installation_agency_id }}
                        >
                          View
                        </Link>
                      </Button>
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
                    {agencies.map((a: InstallationAgencyRow) => (
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

              <Field label="Payment reference (UTR / Cheque)">
                <Input
                  value={form.ref_no}
                  onChange={(e) => setForm({ ...form, ref_no: e.target.value })}
                  placeholder="e.g. UTR8912384"
                />
              </Field>

              <Field label="Internal notes">
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  placeholder="Optional remarks…"
                />
              </Field>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={recordMut.isPending}>
                {recordMut.isPending ? "Recording…" : "Save payment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Receipt } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RowActions } from "@/components/data/RowActions";
import { SafeDeleteDialog } from "@/components/mdm/SafeDeleteDialog";
import { DataToolbar } from "@/components/data/DataToolbar";
import { DataTableShell } from "@/components/data/DataTableShell";
import { TablePagination } from "@/components/data/Pagination";
import { ColumnsMenu, type ColumnDef } from "@/components/data/ColumnsMenu";
import { DensityMenu } from "@/components/data/DensityMenu";
import { useTablePrefs } from "@/hooks/use-table-prefs";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { deleteInvoice, listInvoices, type InvoiceListItem } from "@/lib/invoices/api";
import { formatInr } from "@/lib/format";
import { invalidateInvoice } from "@/lib/query-invalidation";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/invoices/")({
  ssr: false,
  component: InvoicesPage,
  validateSearch: (s: Record<string, unknown>): { status?: string; q?: string } => ({
    status: typeof s.status === "string" ? s.status : undefined,
    q: typeof s.q === "string" ? s.q : undefined,
  }),
});

function InvoicesPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const roles = useRoles();
  const search = Route.useSearch();
  const statusFilter = search.status ?? "all";
  const [q, setQ] = useState(search.q ?? "");
  const dq = useDebouncedValue(q, 250);
  const [toDelete, setToDelete] = useState<InvoiceListItem | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const query = useQuery({ queryKey: qk.invoices.list(dq), queryFn: () => listInvoices(dq) });
  const del = useMutation({
    mutationFn: (id: string) => deleteInvoice(id),
    onSuccess: () => {
      toast.success("Invoice deleted");
      invalidateInvoice(qc);
      setToDelete(null);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const { prefs, setDensity, toggleColumn, isHidden } = useTablePrefs("invoices");
  const columnDefs: ColumnDef[] = useMemo(
    () => [
      { key: "no", label: "Invoice no.", required: true },
      { key: "customer", label: "Customer" },
      { key: "project", label: "Project" },
      { key: "status", label: "Status" },
      { key: "total", label: "Total" },
      { key: "balance", label: "Balance" },
      { key: "due", label: "Due" },
    ],
    [],
  );

  const setStatusFilter = (v: string) =>
    nav({
      to: "/invoices",
      search: { status: v === "all" ? undefined : v, q: dq || undefined },
    });
  const commitSearch = (v: string) => {
    setQ(v);
    setPage(1);
    nav({
      to: "/invoices",
      search: { status: statusFilter === "all" ? undefined : statusFilter, q: v || undefined },
    });
  };
  const rows = (query.data ?? []).filter(
    (r) => statusFilter === "all" || r.status === statusFilter,
  );
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, dq]);

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle="Collect payments — Razorpay links or manual entries."
      />

      <DataToolbar
        count={rows.length}
        search={q}
        onSearchChange={commitSearch}
        searchPlaceholder="Search by invoice no…"
        primaryFilter={
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="partially_paid">Partially paid</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        }
        columns={
          <ColumnsMenu columns={columnDefs} isHidden={isHidden} onToggle={toggleColumn} />
        }
        density={<DensityMenu density={prefs.density} onChange={setDensity} />}
        action={
          roles.canWrite && (
            <Button size="sm" className="h-8" onClick={() => nav({ to: "/invoices/new" })}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> New invoice
            </Button>
          )
        }
      />

      {query.isLoading ? (
        <SkeletonTable rows={6} columns={5} />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Receipt className="h-6 w-6" />}
          title="No invoices yet"
          message="Convert an accepted quote to create your first invoice."
          action={
            <Button onClick={() => nav({ to: "/invoices/new" })}>
              <Plus className="mr-2 h-4 w-4" /> New invoice
            </Button>
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
                {!isHidden("customer") && <TableHead>Customer</TableHead>}
                {!isHidden("project") && <TableHead>Project</TableHead>}
                {!isHidden("status") && <TableHead>Status</TableHead>}
                {!isHidden("total") && <TableHead className="text-right">Total</TableHead>}
                {!isHidden("balance") && <TableHead className="text-right">Balance</TableHead>}
                {!isHidden("due") && <TableHead>Due</TableHead>}
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((r) => (
                <TableRow key={r.id}>
                  {!isHidden("no") && (
                    <TableCell className="font-mono text-xs">
                      <Link
                        to="/invoices/$invoiceId"
                        params={{ invoiceId: r.id }}
                        className="text-primary hover:underline"
                      >
                        {r.invoice_no}
                      </Link>
                    </TableCell>
                  )}
                  {!isHidden("customer") && <TableCell>{r.customer?.name ?? "—"}</TableCell>}
                  {!isHidden("project") && <TableCell>{r.project?.name ?? "—"}</TableCell>}
                  {!isHidden("status") && (
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {r.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                  )}
                  {!isHidden("total") && (
                    <TableCell className="text-right tabular-nums">{formatInr(r.total)}</TableCell>
                  )}
                  {!isHidden("balance") && (
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatInr(r.balance_due)}
                    </TableCell>
                  )}
                  {!isHidden("due") && <TableCell>{r.due_date ?? "—"}</TableCell>}
                  <TableCell>
                    <RowActions
                      onEdit={() =>
                        nav({ to: "/invoices/$invoiceId/edit", params: { invoiceId: r.id } })
                      }
                      onDelete={() => setToDelete(r)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
      )}


      <SafeDeleteDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        entityType="invoice"
        entityId={toDelete?.id ?? null}
        entityLabel={toDelete ? toDelete.invoice_no : ""}
        busy={del.isPending}
        onConfirmDelete={() => toDelete && del.mutate(toDelete.id)}
      />
    </div>
  );
}

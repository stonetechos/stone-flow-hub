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
import { RowActions } from "@/components/data/RowActions";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import { StatusPill } from "@/components/entity/StatusPill";
import { DataToolbar } from "@/components/data/DataToolbar";
import { DataTableShell } from "@/components/data/DataTableShell";
import { TablePagination } from "@/components/data/Pagination";
import { ColumnsMenu, type ColumnDef } from "@/components/data/ColumnsMenu";
import { DensityMenu } from "@/components/data/DensityMenu";
import { useTablePrefs } from "@/hooks/use-table-prefs";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import {
  deletePurchaseInvoice,
  listPurchaseInvoices,
  type PurchaseInvoiceListItem,
} from "@/lib/purchase-invoices/api";
import { PURCHASE_INVOICE_STATUSES } from "@/lib/purchase-invoices/schema";
import { invalidatePurchaseInvoice } from "@/lib/query-invalidation";
import { formatInr, formatDate } from "@/lib/format";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/purchase-invoices/")({
  ssr: false,
  component: PurchaseInvoicesPage,
  validateSearch: (s: Record<string, unknown>): { status?: string; q?: string } => ({
    status: typeof s.status === "string" ? s.status : undefined,
    q: typeof s.q === "string" ? s.q : undefined,
  }),
});

function PurchaseInvoicesPage() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const roles = useRoles();
  const search = Route.useSearch();
  const status = search.status ?? "";
  const [q, setQ] = useState(search.q ?? "");
  const dq = useDebouncedValue(q, 250);
  const [toDelete, setToDelete] = useState<PurchaseInvoiceListItem | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { prefs, setDensity, toggleColumn, isHidden } = useTablePrefs("purchase-invoices");

  const columnDefs: ColumnDef[] = useMemo(
    () => [
      { key: "no", label: "No.", required: true },
      { key: "vendorInvoiceNo", label: "Vendor's #" },
      { key: "vendor", label: "Vendor" },
      { key: "po", label: "Purchase order" },
      { key: "date", label: "Invoice date" },
      { key: "due", label: "Due" },
      { key: "total", label: "Total" },
      { key: "status", label: "Status" },
    ],
    [],
  );

  const query = useQuery({
    queryKey: qk.purchaseInvoices.list(dq, status),
    queryFn: () => listPurchaseInvoices(dq, status),
  });
  useEffect(() => setPage(1), [dq, status]);

  const del = useMutation({
    mutationFn: (id: string) => deletePurchaseInvoice(id),
    onSuccess: (_void, id) => {
      toast.success("Purchase invoice deleted");
      invalidatePurchaseInvoice(qc, id, toDelete?.vendor_id);
      setToDelete(null);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const setStatus = (v: string) =>
    nav({ to: "/purchase-invoices", search: { status: v || undefined, q: dq || undefined } });
  const commitSearch = (v: string) => {
    setQ(v);
    nav({ to: "/purchase-invoices", search: { status: status || undefined, q: v || undefined } });
  };

  const rows = query.data ?? [];
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const totalOutstanding = rows
    .filter((r) => r.status !== "cancelled")
    .reduce((s, r) => s + Number(r.total_amount ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="Purchase Invoices"
        subtitle="Vendor bills recorded against purchase orders, with invoice image or file attached."
      />

      <DataToolbar
        count={rows.length}
        search={q}
        onSearchChange={commitSearch}
        searchPlaceholder="Search invoice #, vendor's #…"
        primaryFilter={
          <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
            <SelectTrigger className="h-8 w-40 text-sm">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {PURCHASE_INVOICE_STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        extra={
          <span className="hidden text-xs text-muted-foreground md:inline">
            Total {formatInr(totalOutstanding)}
          </span>
        }
        columns={<ColumnsMenu columns={columnDefs} isHidden={isHidden} onToggle={toggleColumn} />}
        density={<DensityMenu density={prefs.density} onChange={setDensity} />}
        action={
          roles.canWrite ? (
            <Button size="sm" className="h-8" onClick={() => nav({ to: "/purchase-invoices/new" })}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Record invoice
            </Button>
          ) : null
        }
      />

      {query.isLoading ? (
        <SkeletonTable rows={6} columns={8} />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Receipt className="h-6 w-6" />}
          title="No purchase invoices yet"
          message="Record a vendor's invoice to start tracking what's billed against each purchase order."
          action={
            roles.canWrite ? (
              <Button onClick={() => nav({ to: "/purchase-invoices/new" })}>
                <Plus className="mr-2 h-4 w-4" /> Record invoice
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
                {!isHidden("vendorInvoiceNo") && <TableHead>Vendor's #</TableHead>}
                {!isHidden("vendor") && <TableHead>Vendor</TableHead>}
                {!isHidden("po") && <TableHead>Purchase order</TableHead>}
                {!isHidden("date") && <TableHead>Invoice date</TableHead>}
                {!isHidden("due") && <TableHead>Due</TableHead>}
                {!isHidden("total") && <TableHead className="text-right">Total</TableHead>}
                {!isHidden("status") && <TableHead>Status</TableHead>}
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((r) => (
                <TableRow key={r.id}>
                  {!isHidden("no") && (
                    <TableCell className="font-mono text-xs">
                      <Link
                        to="/purchase-invoices/$id"
                        params={{ id: r.id }}
                        className="text-primary hover:underline"
                      >
                        {r.invoice_no}
                      </Link>
                    </TableCell>
                  )}
                  {!isHidden("vendorInvoiceNo") && (
                    <TableCell className="text-sm">{r.vendor_invoice_no ?? "—"}</TableCell>
                  )}
                  {!isHidden("vendor") && <TableCell>{r.vendor?.company_name ?? "—"}</TableCell>}
                  {!isHidden("po") && (
                    <TableCell className="text-sm">
                      {r.purchase_order ? (
                        <Link
                          to="/purchase-orders/$id"
                          params={{ id: r.purchase_order.id }}
                          className="hover:underline"
                        >
                          {r.purchase_order.po_no}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  )}
                  {!isHidden("date") && (
                    <TableCell className="text-sm">{formatDate(r.invoice_date)}</TableCell>
                  )}
                  {!isHidden("due") && (
                    <TableCell className="text-sm">
                      {r.due_date ? formatDate(r.due_date) : "—"}
                    </TableCell>
                  )}
                  {!isHidden("total") && (
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatInr(r.total_amount)}
                    </TableCell>
                  )}
                  {!isHidden("status") && (
                    <TableCell>
                      <StatusPill
                        status={r.status}
                        tone={r.status === "disputed" ? "warning" : undefined}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <RowActions
                      onEdit={() =>
                        nav({ to: "/purchase-invoices/$id/edit", params: { id: r.id } })
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

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete purchase invoice?"
        description={toDelete ? `${toDelete.invoice_no} will be removed.` : ""}
        busy={del.isPending}
        onConfirm={() => toDelete && del.mutate(toDelete.id)}
      />
    </div>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ShoppingCart } from "lucide-react";
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
import { SafeDeleteDialog } from "@/components/mdm/SafeDeleteDialog";
import { StatusPill } from "@/components/entity/StatusPill";
import { DataToolbar } from "@/components/data/DataToolbar";
import { DataTableShell } from "@/components/data/DataTableShell";
import { TablePagination } from "@/components/data/Pagination";
import { ColumnsMenu, type ColumnDef } from "@/components/data/ColumnsMenu";
import { DensityMenu } from "@/components/data/DensityMenu";
import { useTablePrefs } from "@/hooks/use-table-prefs";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { deleteSalesOrder, listSalesOrders, type SalesOrderListItem } from "@/lib/sales-orders/api";
import { SALES_ORDER_STATUSES } from "@/lib/sales-orders/schema";
import { invalidateSalesOrder } from "@/lib/query-invalidation";

export const Route = createFileRoute("/_authenticated/sales-orders/")({
  ssr: false,
  component: SalesOrdersPage,
  validateSearch: (s: Record<string, unknown>): { status?: string } =>
    typeof s.status === "string" ? { status: s.status } : {},
});

function SalesOrdersPage() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const search = Route.useSearch();
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 250);
  const [status, setStatus] = useState<string>(search.status ?? "");
  const [toDelete, setToDelete] = useState<SalesOrderListItem | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { prefs, setDensity, toggleColumn, isHidden } = useTablePrefs("sales-orders");

  const columnDefs: ColumnDef[] = useMemo(
    () => [
      { key: "no", label: "No.", required: true },
      { key: "customer", label: "Customer" },
      { key: "project", label: "Project" },
      { key: "quote", label: "Quote" },
      { key: "date", label: "Order date" },
      { key: "status", label: "Status" },
    ],
    [],
  );

  const query = useQuery({
    queryKey: qk.salesOrders.list(dq, status),
    queryFn: () => listSalesOrders(dq, status),
  });
  useEffect(() => setPage(1), [dq, status]);

  const del = useMutation({
    mutationFn: (id: string) => deleteSalesOrder(id),
    onSuccess: () => {
      toast.success("Sales order deleted");
      invalidateSalesOrder(qc);
      setToDelete(null);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const rows = query.data ?? [];
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div>
      <PageHeader
        title="Sales Orders"
        subtitle="Confirmed orders converted from customer quotations."
      />

      <DataToolbar
        count={rows.length}
        search={q}
        onSearchChange={setQ}
        searchPlaceholder="Search by SO no…"
        primaryFilter={
          <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
            <SelectTrigger className="h-8 w-44 text-sm">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {SALES_ORDER_STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        columns={<ColumnsMenu columns={columnDefs} isHidden={isHidden} onToggle={toggleColumn} />}
        density={<DensityMenu density={prefs.density} onChange={setDensity} />}
        action={
          <Button size="sm" className="h-8" onClick={() => nav({ to: "/sales-orders/new" })}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> New sales order
          </Button>
        }
      />

      {query.isLoading ? (
        <SkeletonTable rows={6} columns={6} />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart className="h-6 w-6" />}
          title="No sales orders yet"
          message="Create a sales order to start production tracking."
          action={
            <Button onClick={() => nav({ to: "/sales-orders/new" })}>
              <Plus className="mr-2 h-4 w-4" /> New sales order
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
                {!isHidden("quote") && <TableHead>Quote</TableHead>}
                {!isHidden("date") && <TableHead>Order date</TableHead>}
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
                        to="/sales-orders/$id"
                        params={{ id: r.id }}
                        className="text-primary hover:underline"
                      >
                        {r.so_no}
                      </Link>
                    </TableCell>
                  )}
                  {!isHidden("customer") && <TableCell>{r.customer?.name ?? "—"}</TableCell>}
                  {!isHidden("project") && <TableCell>{r.project?.name ?? "—"}</TableCell>}
                  {!isHidden("quote") && (
                    <TableCell className="font-mono text-xs">{r.quote?.quote_no ?? "—"}</TableCell>
                  )}
                  {!isHidden("date") && <TableCell>{r.order_date}</TableCell>}
                  {!isHidden("status") && (
                    <TableCell>
                      <StatusPill status={r.status} />
                    </TableCell>
                  )}
                  <TableCell>
                    <RowActions
                      onEdit={() => nav({ to: "/sales-orders/$id/edit", params: { id: r.id } })}
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
        entityType="sales_order"
        entityId={toDelete?.id ?? null}
        entityLabel={toDelete ? toDelete.so_no : ""}
        busy={del.isPending}
        onConfirmDelete={() => toDelete && del.mutate(toDelete.id)}
      />
    </div>
  );
}

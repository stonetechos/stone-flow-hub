import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Truck } from "lucide-react";
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
  deletePurchaseTransportation,
  listPurchaseTransportation,
  type PurchaseTransportListItem,
} from "@/lib/purchase-transportation/api";
import { PURCHASE_TRANSPORT_STATUSES } from "@/lib/purchase-transportation/schema";
import { invalidatePurchaseTransport } from "@/lib/query-invalidation";
import { formatInr, formatDate } from "@/lib/format";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/purchase-transport/")({
  ssr: false,
  component: PurchaseTransportPage,
  validateSearch: (s: Record<string, unknown>): { status?: string; q?: string } => ({
    status: typeof s.status === "string" ? s.status : undefined,
    q: typeof s.q === "string" ? s.q : undefined,
  }),
});

function PurchaseTransportPage() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const roles = useRoles();
  const search = Route.useSearch();
  const status = search.status ?? "";
  const [q, setQ] = useState(search.q ?? "");
  const dq = useDebouncedValue(q, 250);
  const [toDelete, setToDelete] = useState<PurchaseTransportListItem | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { prefs, setDensity, toggleColumn, isHidden } = useTablePrefs("purchase-transport");

  const columnDefs: ColumnDef[] = useMemo(
    () => [
      { key: "no", label: "No.", required: true },
      { key: "po", label: "Purchase order" },
      { key: "vendor", label: "Vendor" },
      { key: "agency", label: "Carting agency" },
      { key: "date", label: "Transport date" },
      { key: "freight", label: "Freight" },
      { key: "balance", label: "Balance due" },
      { key: "status", label: "Status" },
    ],
    [],
  );

  const query = useQuery({
    queryKey: qk.purchaseTransport.list(dq, status),
    queryFn: () => listPurchaseTransportation(dq, status),
  });
  useEffect(() => setPage(1), [dq, status]);

  const del = useMutation({
    mutationFn: (id: string) => deletePurchaseTransportation(id),
    onSuccess: (_void, id) => {
      toast.success("Purchase transportation entry deleted");
      invalidatePurchaseTransport(qc, id, toDelete?.vendor_id ?? undefined);
      setToDelete(null);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const setStatus = (v: string) =>
    nav({ to: "/purchase-transport", search: { status: v || undefined, q: dq || undefined } });
  const commitSearch = (v: string) => {
    setQ(v);
    nav({ to: "/purchase-transport", search: { status: status || undefined, q: v || undefined } });
  };

  const rows = query.data ?? [];
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const totalBalanceDue = rows
    .filter((r) => r.status !== "cancelled")
    .reduce((s, r) => s + Number(r.balance_due ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="Purchase Transportation"
        subtitle="Inbound shipments from vendors — carting agency, driver, freight and amount paid, keyed to a purchase order."
      />

      <DataToolbar
        count={rows.length}
        search={q}
        onSearchChange={commitSearch}
        searchPlaceholder="Search transport #, vehicle, LR #…"
        primaryFilter={
          <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
            <SelectTrigger className="h-8 w-40 text-sm">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {PURCHASE_TRANSPORT_STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        extra={
          <span className="hidden text-xs text-muted-foreground md:inline">
            Balance due {formatInr(totalBalanceDue)}
          </span>
        }
        columns={<ColumnsMenu columns={columnDefs} isHidden={isHidden} onToggle={toggleColumn} />}
        density={<DensityMenu density={prefs.density} onChange={setDensity} />}
        action={
          roles.canWrite ? (
            <Button
              size="sm"
              className="h-8"
              onClick={() => nav({ to: "/purchase-transport/new" })}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Log shipment
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
          icon={<Truck className="h-6 w-6" />}
          title="No inbound shipments logged yet"
          message="Log a shipment to track carting agency, driver, freight and amount paid against a purchase order."
          action={
            roles.canWrite ? (
              <Button onClick={() => nav({ to: "/purchase-transport/new" })}>
                <Plus className="mr-2 h-4 w-4" /> Log shipment
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
                {!isHidden("po") && <TableHead>Purchase order</TableHead>}
                {!isHidden("vendor") && <TableHead>Vendor</TableHead>}
                {!isHidden("agency") && <TableHead>Carting agency</TableHead>}
                {!isHidden("date") && <TableHead>Transport date</TableHead>}
                {!isHidden("freight") && <TableHead className="text-right">Freight</TableHead>}
                {!isHidden("balance") && <TableHead className="text-right">Balance due</TableHead>}
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
                        to="/purchase-transport/$id"
                        params={{ id: r.id }}
                        className="text-primary hover:underline"
                      >
                        {r.transport_no}
                      </Link>
                    </TableCell>
                  )}
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
                  {!isHidden("vendor") && <TableCell>{r.vendor?.company_name ?? "—"}</TableCell>}
                  {!isHidden("agency") && <TableCell>{r.carting_agency?.name ?? "—"}</TableCell>}
                  {!isHidden("date") && (
                    <TableCell className="text-sm">{formatDate(r.transport_date)}</TableCell>
                  )}
                  {!isHidden("freight") && (
                    <TableCell className="text-right tabular-nums">
                      {formatInr(r.freight_amount)}
                    </TableCell>
                  )}
                  {!isHidden("balance") && (
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatInr(r.balance_due)}
                    </TableCell>
                  )}
                  {!isHidden("status") && (
                    <TableCell>
                      <StatusPill status={r.status} />
                    </TableCell>
                  )}
                  <TableCell>
                    <RowActions
                      onEdit={() =>
                        nav({ to: "/purchase-transport/$id/edit", params: { id: r.id } })
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
        title="Delete this shipment entry?"
        description={toDelete ? `${toDelete.transport_no} will be removed.` : ""}
        busy={del.isPending}
        onConfirm={() => toDelete && del.mutate(toDelete.id)}
      />
    </div>
  );
}

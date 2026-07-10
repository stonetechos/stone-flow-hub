import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Truck } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { deleteDispatch, listDispatches, type DispatchListItem } from "@/lib/dispatch/api";
import { DISPATCH_STATUSES } from "@/lib/dispatch/schema";
import { invalidateDispatch } from "@/lib/query-invalidation";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/dispatch/")({
  ssr: false,
  component: DispatchPage,
  validateSearch: (s: Record<string, unknown>): { status?: string; q?: string } => ({
    status: typeof s.status === "string" ? s.status : undefined,
    q: typeof s.q === "string" ? s.q : undefined,
  }),
});

function DispatchPage() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const roles = useRoles();
  const search = Route.useSearch();
  const status = search.status ?? "";
  const [q, setQ] = useState(search.q ?? "");
  const dq = useDebouncedValue(q, 250);
  const [toDelete, setToDelete] = useState<DispatchListItem | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { prefs, setDensity, toggleColumn, isHidden } = useTablePrefs("dispatch");

  const columnDefs: ColumnDef[] = useMemo(
    () => [
      { key: "no", label: "No.", required: true },
      { key: "so", label: "Sales Order" },
      { key: "carrier", label: "Carrier" },
      { key: "tracking", label: "Tracking" },
      { key: "date", label: "Date" },
      { key: "status", label: "Status" },
    ],
    [],
  );

  const query = useQuery({ queryKey: qk.dispatch.list(dq, status), queryFn: () => listDispatches(dq, status) });
  useEffect(() => setPage(1), [dq, status]);

  const del = useMutation({
    mutationFn: (id: string) => deleteDispatch(id),
    onSuccess: () => {
      toast.success("Dispatch deleted");
      invalidateDispatch(qc);
      setToDelete(null);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const setStatus = (v: string) =>
    nav({ to: "/dispatch", search: { status: v || undefined, q: dq || undefined } });
  const commitSearch = (v: string) => {
    setQ(v);
    nav({ to: "/dispatch", search: { status: status || undefined, q: v || undefined } });
  };

  const rows = query.data ?? [];
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div>
      <PageHeader
        title="Delivery challans"
        subtitle="Outbound deliveries against sales orders. Each challan is an independent record of what left the yard."
      />

      <DataToolbar
        count={rows.length}
        search={q}
        onSearchChange={commitSearch}
        searchPlaceholder="Search dispatch, carrier, tracking…"
        primaryFilter={
          <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
            <SelectTrigger className="h-8 w-44 text-sm"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {DISPATCH_STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        columns={<ColumnsMenu columns={columnDefs} isHidden={isHidden} onToggle={toggleColumn} />}
        density={<DensityMenu density={prefs.density} onChange={setDensity} />}
        action={
          roles.canWrite ? (
            <Button size="sm" className="h-8" onClick={() => nav({ to: "/dispatch/new" })}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> New delivery challan
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
          icon={<Truck className="h-6 w-6" />}
          title="No dispatches yet"
          message="Create a dispatch to plan an outbound shipment."
          action={
            roles.canWrite ? (
              <Button onClick={() => nav({ to: "/dispatch/new" })}>
                <Plus className="mr-2 h-4 w-4" /> New dispatch
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
              onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
            />
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                {!isHidden("no") && <TableHead>No.</TableHead>}
                {!isHidden("so") && <TableHead>Sales Order</TableHead>}
                {!isHidden("carrier") && <TableHead>Carrier</TableHead>}
                {!isHidden("tracking") && <TableHead>Tracking</TableHead>}
                {!isHidden("date") && <TableHead>Date</TableHead>}
                {!isHidden("status") && <TableHead>Status</TableHead>}
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((r) => (
                <TableRow key={r.id}>
                  {!isHidden("no") && (
                    <TableCell className="font-mono text-xs">
                      <Link to="/dispatch/$id" params={{ id: r.id }} className="text-primary hover:underline">
                        {r.dispatch_no}
                      </Link>
                    </TableCell>
                  )}
                  {!isHidden("so") && <TableCell className="font-mono text-xs">{r.sales_order?.so_no ?? "—"}</TableCell>}
                  {!isHidden("carrier") && <TableCell>{r.carrier ?? "—"}</TableCell>}
                  {!isHidden("tracking") && <TableCell>{r.tracking_no ?? "—"}</TableCell>}
                  {!isHidden("date") && <TableCell>{r.dispatch_date}</TableCell>}
                  {!isHidden("status") && <TableCell><StatusPill status={r.status} /></TableCell>}
                  <TableCell>
                    <RowActions
                      onEdit={() => nav({ to: "/dispatch/$id/edit", params: { id: r.id } })}
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
        title="Delete dispatch?"
        description={toDelete ? `${toDelete.dispatch_no} will be removed.` : ""}
        busy={del.isPending}
        onConfirm={() => toDelete && del.mutate(toDelete.id)}
      />
    </div>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Truck } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Button } from "@/components/ui/button";
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
import { deleteGrn, listGrns, type GrnListItem } from "@/lib/grns/api";
import { invalidateGrn } from "@/lib/query-invalidation";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/grns/")({
  ssr: false,
  component: GrnsPage,
});

function GrnsPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const roles = useRoles();
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 250);
  const [toDelete, setToDelete] = useState<GrnListItem | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { prefs, setDensity, toggleColumn, isHidden } = useTablePrefs("grns");

  const columnDefs: ColumnDef[] = useMemo(
    () => [
      { key: "no", label: "GRN", required: true },
      { key: "vendor", label: "Vendor" },
      { key: "po", label: "PO" },
      { key: "received", label: "Received" },
      { key: "status", label: "Status" },
      { key: "acceptance", label: "Acceptance" },
    ],
    [],
  );

  const query = useQuery({ queryKey: qk.grns.list(dq), queryFn: () => listGrns(dq) });
  useEffect(() => setPage(1), [dq]);

  const del = useMutation({
    mutationFn: (id: string) => deleteGrn(id),
    onSuccess: () => {
      toast.success("GRN deleted");
      invalidateGrn(qc);
      setToDelete(null);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const rows = query.data ?? [];
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div>
      <PageHeader
        title="Goods Receipt Notes"
        subtitle="Receive material against purchase orders, capture batches and inspection."
      />

      <DataToolbar
        count={rows.length}
        search={q}
        onSearchChange={setQ}
        searchPlaceholder="Search GRN no, challan, vehicle…"
        columns={<ColumnsMenu columns={columnDefs} isHidden={isHidden} onToggle={toggleColumn} />}
        density={<DensityMenu density={prefs.density} onChange={setDensity} />}
        action={
          roles.canWrite ? (
            <Button size="sm" className="h-8" onClick={() => nav({ to: "/grns/new" })}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> New GRN
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
          title="No GRNs yet"
          message="Receive material against a purchase order to create your first GRN."
          action={
            roles.canWrite ? (
              <Button onClick={() => nav({ to: "/grns/new" })}>
                <Plus className="mr-2 h-4 w-4" /> New GRN
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
                {!isHidden("no") && <TableHead>GRN</TableHead>}
                {!isHidden("vendor") && <TableHead>Vendor</TableHead>}
                {!isHidden("po") && <TableHead>PO</TableHead>}
                {!isHidden("received") && <TableHead>Received</TableHead>}
                {!isHidden("status") && <TableHead>Status</TableHead>}
                {!isHidden("acceptance") && <TableHead>Acceptance</TableHead>}
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((r) => (
                <TableRow key={r.id}>
                  {!isHidden("no") && (
                    <TableCell className="font-mono text-xs">
                      <Link to="/grns/$id" params={{ id: r.id }} className="text-primary hover:underline">
                        {r.grn_no}
                      </Link>
                    </TableCell>
                  )}
                  {!isHidden("vendor") && <TableCell>{r.vendor?.company_name ?? "—"}</TableCell>}
                  {!isHidden("po") && (
                    <TableCell>
                      {r.purchase_order ? (
                        <Link to="/purchase-orders/$id" params={{ id: r.purchase_order.id }} className="text-primary hover:underline">
                          {r.purchase_order.po_no}
                        </Link>
                      ) : "—"}
                    </TableCell>
                  )}
                  {!isHidden("received") && <TableCell>{r.received_date}</TableCell>}
                  {!isHidden("status") && <TableCell><StatusPill status={r.status} /></TableCell>}
                  {!isHidden("acceptance") && (
                    <TableCell className="capitalize text-sm">{r.overall_acceptance.replace(/_/g, " ")}</TableCell>
                  )}
                  <TableCell>
                    <RowActions onDelete={() => setToDelete(r)} />
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
        title="Delete GRN?"
        description={toDelete ? `${toDelete.grn_no} will be removed. Inventory and ledger entries are reversed automatically.` : ""}
        busy={del.isPending}
        onConfirm={() => toDelete && del.mutate(toDelete.id)}
      />
    </div>
  );
}

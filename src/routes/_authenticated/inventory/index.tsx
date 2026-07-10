import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Warehouse } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RowActions } from "@/components/data/RowActions";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import { DataToolbar } from "@/components/data/DataToolbar";
import { DataTableShell } from "@/components/data/DataTableShell";
import { TablePagination } from "@/components/data/Pagination";
import { ColumnsMenu, type ColumnDef } from "@/components/data/ColumnsMenu";
import { DensityMenu } from "@/components/data/DensityMenu";
import { useTablePrefs } from "@/hooks/use-table-prefs";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { deleteInventoryItem, listInventory, type InventoryListItem } from "@/lib/inventory/api";
import { invalidateInventory } from "@/lib/query-invalidation";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/inventory/")({
  ssr: false,
  component: InventoryPage,
  validateSearch: (s: Record<string, unknown>): { q?: string } => ({
    q: typeof s.q === "string" ? s.q : undefined,
  }),
});

function InventoryPage() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const roles = useRoles();
  const search = Route.useSearch();
  const [q, setQ] = useState(search.q ?? "");
  const dq = useDebouncedValue(q, 250);
  const [toDelete, setToDelete] = useState<InventoryListItem | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { prefs, setDensity, toggleColumn, isHidden } = useTablePrefs("inventory");

  const columnDefs: ColumnDef[] = useMemo(
    () => [
      { key: "code", label: "Code", required: true },
      { key: "product", label: "Product" },
      { key: "location", label: "Location" },
      { key: "unit", label: "Unit" },
      { key: "onHand", label: "On hand" },
      { key: "reorder", label: "Reorder" },
    ],
    [],
  );

  const query = useQuery({ queryKey: qk.inventory.list(dq), queryFn: () => listInventory(dq) });
  useEffect(() => setPage(1), [dq]);

  const del = useMutation({
    mutationFn: (id: string) => deleteInventoryItem(id),
    onSuccess: () => {
      toast.success("Stock item deleted");
      invalidateInventory(qc);
      setToDelete(null);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });
  const commitSearch = (v: string) => {
    setQ(v);
    nav({ to: "/inventory", search: { q: v || undefined } });
  };

  const rows = query.data ?? [];
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div>
      <PageHeader title="Inventory" subtitle="Track stock positions across locations." />

      <DataToolbar
        count={rows.length}
        search={q}
        onSearchChange={commitSearch}
        searchPlaceholder="Search stock code, location…"
        columns={<ColumnsMenu columns={columnDefs} isHidden={isHidden} onToggle={toggleColumn} />}
        density={<DensityMenu density={prefs.density} onChange={setDensity} />}
        action={
          roles.canWrite ? (
            <Button size="sm" className="h-8" onClick={() => nav({ to: "/inventory/new" })}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> New stock item
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
          icon={<Warehouse className="h-6 w-6" />}
          title="No stock items yet"
          message="Add a stock item to start tracking inventory."
          action={
            roles.canWrite ? (
              <Button onClick={() => nav({ to: "/inventory/new" })}>
                <Plus className="mr-2 h-4 w-4" /> New stock item
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
                {!isHidden("code") && <TableHead>Code</TableHead>}
                {!isHidden("product") && <TableHead>Product</TableHead>}
                {!isHidden("location") && <TableHead>Location</TableHead>}
                {!isHidden("unit") && <TableHead>Unit</TableHead>}
                {!isHidden("onHand") && <TableHead className="text-right">On hand</TableHead>}
                {!isHidden("reorder") && <TableHead className="text-right">Reorder</TableHead>}
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((r) => (
                <TableRow key={r.id}>
                  {!isHidden("code") && (
                    <TableCell className="font-mono text-xs">
                      <Link to="/inventory/$id" params={{ id: r.id }} className="text-primary hover:underline">
                        {r.stock_code}
                      </Link>
                    </TableCell>
                  )}
                  {!isHidden("product") && <TableCell>{r.product?.name ?? "—"}</TableCell>}
                  {!isHidden("location") && <TableCell>{r.location ?? "—"}</TableCell>}
                  {!isHidden("unit") && <TableCell>{r.unit ?? "—"}</TableCell>}
                  {!isHidden("onHand") && <TableCell className="text-right tabular-nums">{r.quantity_on_hand}</TableCell>}
                  {!isHidden("reorder") && <TableCell className="text-right tabular-nums">{r.reorder_level}</TableCell>}
                  <TableCell>
                    <RowActions
                      onEdit={() => nav({ to: "/inventory/$id/edit", params: { id: r.id } })}
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
        title="Delete stock item?"
        description={toDelete ? `${toDelete.stock_code} will be removed.` : ""}
        busy={del.isPending}
        onConfirm={() => toDelete && del.mutate(toDelete.id)}
      />
    </div>
  );
}

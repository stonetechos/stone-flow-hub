import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus, Warehouse, ExternalLink, Boxes } from "lucide-react";
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
  const { t } = useTranslation();
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
      { key: "code", label: t("inventory.fields.code", "Code"), required: true },
      { key: "product", label: t("inventory.fields.product", "Product") },
      { key: "location", label: t("inventory.fields.location", "Location") },
      { key: "unit", label: t("inventory.fields.unit", "Unit") },
      { key: "onHand", label: t("inventory.fields.onHand", "On hand") },
      { key: "reorder", label: t("inventory.fields.reorder", "Reorder") },
    ],
    [t],
  );

  const query = useQuery({
    queryKey: qk.inventory.list(dq),
    queryFn: () => listInventory(dq),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    placeholderData: (previousData) => previousData,
  });
  useEffect(() => setPage(1), [dq]);

  const del = useMutation({
    mutationFn: (id: string) => deleteInventoryItem(id),
    onSuccess: () => {
      toast.success(t("inventory.itemDeleted", "Stock item deleted"));
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
      <PageHeader
        title={t("inventory.title", "Inventory")}
        subtitle={t("inventory.subtitle", "Track stock positions across locations.")}
      />

      <DataToolbar
        count={rows.length}
        search={q}
        onSearchChange={commitSearch}
        searchPlaceholder={t("inventory.searchPlaceholder", "Search stock code, location…")}
        columns={<ColumnsMenu columns={columnDefs} isHidden={isHidden} onToggle={toggleColumn} />}
        density={<DensityMenu density={prefs.density} onChange={setDensity} />}
        action={
          roles.canWrite ? (
            <Button size="sm" className="h-8" onClick={() => nav({ to: "/inventory/new" })}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />{" "}
              {t("inventory.newStockItem", "New stock item")}
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
          title={t("inventory.noStockItemsYet", "No stock items yet")}
          message={t("inventory.emptyMessage", "Add a stock item to start tracking inventory.")}
          action={
            roles.canWrite ? (
              <Button onClick={() => nav({ to: "/inventory/new" })}>
                <Plus className="mr-2 h-4 w-4" /> {t("inventory.newStockItem", "New stock item")}
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
          {/* Mobile Cards View (< sm) */}
          <div className="sm:hidden divide-y divide-border/60">
            {pageRows.map((r) => {
              const isLowStock =
                r.reorder_level != null && Number(r.quantity_on_hand) <= Number(r.reorder_level);

              return (
                <div key={r.id} className="p-3.5 space-y-2.5 bg-card/50">
                  {/* Top Bar: Code & Actions */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Link
                        to="/inventory/$id"
                        params={{ id: r.id }}
                        className="font-mono text-xs font-bold text-primary hover:underline"
                      >
                        {r.stock_code}
                      </Link>
                      {isLowStock && (
                        <span className="inline-flex items-center rounded bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold text-rose-800 border border-rose-200">
                          Low Stock
                        </span>
                      )}
                    </div>
                    <RowActions
                      onEdit={() => nav({ to: "/inventory/$id/edit", params: { id: r.id } })}
                      onDelete={() => setToDelete(r)}
                    />
                  </div>

                  {/* Product & Location */}
                  <div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                      <span>{r.product?.name ?? "Unnamed Product"}</span>
                    </div>
                    {r.location && (
                      <div className="text-muted-foreground flex items-center gap-1 text-[11px] mt-0.5">
                        <Warehouse className="h-3 w-3 shrink-0" />
                        <span>{r.location}</span>
                      </div>
                    )}
                  </div>

                  {/* Stock Quantities & Details */}
                  <div className="flex items-center justify-between pt-1 border-t border-border/50 text-xs">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[10px] text-muted-foreground">On hand:</span>
                      <span className="font-bold text-sm text-foreground">
                        {r.quantity_on_hand} {r.unit ?? ""}
                      </span>
                      {r.reorder_level != null && (
                        <span className="text-[10px] text-muted-foreground">
                          (Reorder: {r.reorder_level})
                        </span>
                      )}
                    </div>

                    <Link
                      to="/inventory/$id"
                      params={{ id: r.id }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      <span>View</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (>= sm) */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  {!isHidden("code") && <TableHead>{t("inventory.fields.code", "Code")}</TableHead>}
                  {!isHidden("product") && (
                    <TableHead>{t("inventory.fields.product", "Product")}</TableHead>
                  )}
                  {!isHidden("location") && (
                    <TableHead>{t("inventory.fields.location", "Location")}</TableHead>
                  )}
                  {!isHidden("unit") && <TableHead>{t("inventory.fields.unit", "Unit")}</TableHead>}
                  {!isHidden("onHand") && (
                    <TableHead className="text-right">
                      {t("inventory.fields.onHand", "On hand")}
                    </TableHead>
                  )}
                  {!isHidden("reorder") && (
                    <TableHead className="text-right">
                      {t("inventory.fields.reorder", "Reorder")}
                    </TableHead>
                  )}
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((r) => (
                  <TableRow key={r.id}>
                    {!isHidden("code") && (
                      <TableCell className="font-mono text-xs">
                        <Link
                          to="/inventory/$id"
                          params={{ id: r.id }}
                          className="text-primary hover:underline"
                        >
                          {r.stock_code}
                        </Link>
                      </TableCell>
                    )}
                    {!isHidden("product") && <TableCell>{r.product?.name ?? "—"}</TableCell>}
                    {!isHidden("location") && <TableCell>{r.location ?? "—"}</TableCell>}
                    {!isHidden("unit") && <TableCell>{r.unit ?? "—"}</TableCell>}
                    {!isHidden("onHand") && (
                      <TableCell className="text-right tabular-nums">
                        {r.quantity_on_hand}
                      </TableCell>
                    )}
                    {!isHidden("reorder") && (
                      <TableCell className="text-right tabular-nums">{r.reorder_level}</TableCell>
                    )}
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
          </div>
        </DataTableShell>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={t("inventory.deleteTitle", "Delete stock item?")}
        description={
          toDelete
            ? t("inventory.deleteDescription", "{{code}} will be removed.", {
                code: toDelete.stock_code,
              })
            : ""
        }
        busy={del.isPending}
        onConfirm={() => toDelete && del.mutate(toDelete.id)}
      />
    </div>
  );
}

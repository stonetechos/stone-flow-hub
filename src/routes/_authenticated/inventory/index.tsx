import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Warehouse } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { deleteInventoryItem, listInventory, type InventoryListItem } from "@/lib/inventory/api";

export const Route = createFileRoute("/_authenticated/inventory/")({
  ssr: false,
  component: InventoryPage,
});

function InventoryPage() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 250);
  const [toDelete, setToDelete] = useState<InventoryListItem | null>(null);

  const query = useQuery({ queryKey: qk.inventory.list(dq), queryFn: () => listInventory(dq) });
  const del = useMutation({
    mutationFn: (id: string) => deleteInventoryItem(id),
    onSuccess: () => {
      toast.success("Stock item deleted");
      qc.invalidateQueries({ queryKey: qk.inventory.all });
      setToDelete(null);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle="Track stock positions across locations."
        actions={
          <Button onClick={() => nav({ to: "/inventory/new" })}>
            <Plus className="mr-2 h-4 w-4" /> New stock item
          </Button>
        }
      />

      <div className="mb-3 flex items-center gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search stock code, location…"
          className="max-w-md"
        />
      </div>

      {query.isLoading ? (
        <SkeletonTable rows={6} columns={5} />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : (query.data ?? []).length === 0 ? (
        <EmptyState
          icon={<Warehouse className="h-6 w-6" />}
          title="No stock items yet"
          message="Add a stock item to start tracking inventory."
          action={
            <Button onClick={() => nav({ to: "/inventory/new" })}>
              <Plus className="mr-2 h-4 w-4" /> New stock item
            </Button>
          }
        />
      ) : (
        <div className="rounded-md border border-border bg-card shadow-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">On hand</TableHead>
                <TableHead className="text-right">Reorder</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data!.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">
                    <Link
                      to="/inventory/$id"
                      params={{ id: r.id }}
                      className="text-primary hover:underline"
                    >
                      {r.stock_code}
                    </Link>
                  </TableCell>
                  <TableCell>{r.product?.name ?? "—"}</TableCell>
                  <TableCell>{r.location ?? "—"}</TableCell>
                  <TableCell>{r.unit ?? "—"}</TableCell>
                  <TableCell className="text-right">{r.quantity_on_hand}</TableCell>
                  <TableCell className="text-right">{r.reorder_level}</TableCell>
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

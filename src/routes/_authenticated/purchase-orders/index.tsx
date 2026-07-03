import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import {
  deletePurchaseOrder,
  listPurchaseOrders,
  type PurchaseOrderListItem,
} from "@/lib/purchase-orders/api";
import { PURCHASE_ORDER_STATUSES } from "@/lib/purchase-orders/schema";

export const Route = createFileRoute("/_authenticated/purchase-orders/")({
  ssr: false,
  component: PurchaseOrdersPage,
});

function PurchaseOrdersPage() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 250);
  const [status, setStatus] = useState<string>("");
  const [toDelete, setToDelete] = useState<PurchaseOrderListItem | null>(null);

  const query = useQuery({
    queryKey: qk.purchaseOrders.list(dq, status),
    queryFn: () => listPurchaseOrders(dq, status),
  });
  const del = useMutation({
    mutationFn: (id: string) => deletePurchaseOrder(id),
    onSuccess: () => {
      toast.success("PO deleted");
      qc.invalidateQueries({ queryKey: qk.purchaseOrders.all });
      setToDelete(null);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        subtitle="Procurement orders raised to vendors."
        actions={
          <Button onClick={() => nav({ to: "/purchase-orders/new" })}>
            <Plus className="mr-2 h-4 w-4" /> New PO
          </Button>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search PO no…"
          className="max-w-md"
        />
        <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {PURCHASE_ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {query.isLoading ? (
        <SkeletonTable rows={6} columns={5} />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : (query.data ?? []).length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck className="h-6 w-6" />}
          title="No purchase orders yet"
          message="Raise a PO to your vendors."
          action={
            <Button onClick={() => nav({ to: "/purchase-orders/new" })}>
              <Plus className="mr-2 h-4 w-4" /> New PO
            </Button>
          }
        />
      ) : (
        <div className="rounded-md border border-border bg-card shadow-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No.</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data!.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">
                    <Link
                      to="/purchase-orders/$id"
                      params={{ id: r.id }}
                      className="text-primary hover:underline"
                    >
                      {r.po_no}
                    </Link>
                  </TableCell>
                  <TableCell>{r.vendor?.company_name ?? "—"}</TableCell>
                  <TableCell>{r.project?.name ?? "—"}</TableCell>
                  <TableCell>{r.order_date}</TableCell>
                  <TableCell>{r.expected_date ?? "—"}</TableCell>
                  <TableCell>
                    <StatusPill status={r.status} />
                  </TableCell>
                  <TableCell>
                    <RowActions
                      onEdit={() => nav({ to: "/purchase-orders/$id/edit", params: { id: r.id } })}
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
        title="Delete purchase order?"
        description={toDelete ? `${toDelete.po_no} will be removed.` : ""}
        busy={del.isPending}
        onConfirm={() => toDelete && del.mutate(toDelete.id)}
      />
    </div>
  );
}

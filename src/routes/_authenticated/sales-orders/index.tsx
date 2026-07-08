import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ShoppingCart } from "lucide-react";
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
import { SafeDeleteDialog } from "@/components/mdm/SafeDeleteDialog";
import { StatusPill } from "@/components/entity/StatusPill";
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

  const query = useQuery({
    queryKey: qk.salesOrders.list(dq, status),
    queryFn: () => listSalesOrders(dq, status),
  });


  const del = useMutation({
    mutationFn: (id: string) => deleteSalesOrder(id),
    onSuccess: () => {
      toast.success("Sales order deleted");
      invalidateSalesOrder(qc);
      setToDelete(null);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  return (
    <div>
      <PageHeader
        title="Sales Orders"
        subtitle="Confirmed orders converted from customer quotations."
        actions={
          <Button onClick={() => nav({ to: "/sales-orders/new" })}>
            <Plus className="mr-2 h-4 w-4" /> New sales order
          </Button>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by SO no…"
          className="max-w-md"
        />
        <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
          <SelectTrigger className="w-44">
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
      </div>

      {query.isLoading ? (
        <SkeletonTable rows={6} columns={5} />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : (query.data ?? []).length === 0 ? (
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
        <div className="rounded-md border border-border bg-card shadow-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No.</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Quote</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data!.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">
                    <Link
                      to="/sales-orders/$id"
                      params={{ id: r.id }}
                      className="text-primary hover:underline"
                    >
                      {r.so_no}
                    </Link>
                  </TableCell>
                  <TableCell>{r.customer?.name ?? "—"}</TableCell>
                  <TableCell>{r.project?.name ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{r.quote?.quote_no ?? "—"}</TableCell>
                  <TableCell>{r.order_date}</TableCell>
                  <TableCell>
                    <StatusPill status={r.status} />
                  </TableCell>
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
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete sales order?"
        description={toDelete ? `${toDelete.so_no} will be removed.` : ""}
        busy={del.isPending}
        onConfirm={() => toDelete && del.mutate(toDelete.id)}
      />
    </div>
  );
}

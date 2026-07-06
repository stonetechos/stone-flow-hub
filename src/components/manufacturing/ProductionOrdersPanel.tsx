/**
 * Sales Order detail — Production panel.
 * Lists production orders created from this SO, and exposes the
 * "Send to Manufacturing" one-click automation.
 */
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Factory, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/layout/States";
import { Can } from "@/hooks/use-roles";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import {
  listProductionOrdersForSalesOrder,
  sendSalesOrderToManufacturing,
} from "@/lib/manufacturing/api";
import { invalidateProductionOrder } from "@/lib/query-invalidation";
import { StatusPill } from "@/components/entity/StatusPill";

export function ProductionOrdersPanel({ salesOrderId }: { salesOrderId: string }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: qk.productionOrders.bySalesOrder(salesOrderId),
    queryFn: () => listProductionOrdersForSalesOrder(salesOrderId),
  });

  const sendMut = useMutation({
    mutationFn: () => sendSalesOrderToManufacturing(salesOrderId),
    onSuccess: (rows) => {
      toast.success(`${rows.length} production order${rows.length === 1 ? "" : "s"} created`);
      invalidateProductionOrder(qc, undefined, salesOrderId);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const rows = q.data ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Manufacturing</CardTitle>
        <Can anyRole={["admin", "sales_manager", "sales", "purchase"]}>
          <Button
            size="sm"
            onClick={() => sendMut.mutate()}
            disabled={sendMut.isPending}
            title="Create a production order for every product line on the linked quote"
          >
            {sendMut.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Factory className="mr-2 h-4 w-4" />
            )}
            Send to Manufacturing
          </Button>
        </Can>
      </CardHeader>
      <CardContent>
        {q.isLoading ? (
          <p className="py-2 text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Factory className="h-5 w-5" />}
            title="No production orders yet"
            message="Click Send to Manufacturing to auto-create orders for every product line."
          />
        ) : (
          <ul className="divide-y">
            {rows.map((po) => (
              <li key={po.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <Link
                    to="/manufacturing/$id"
                    params={{ id: po.id }}
                    className="flex items-center gap-1 font-mono text-xs font-semibold text-primary hover:underline"
                  >
                    {po.mfg_no} <ExternalLink className="h-3 w-3" />
                  </Link>
                  <p className="truncate text-sm">{po.products?.name ?? "Product"}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">
                    {po.quantity} {po.unit}
                  </Badge>
                  <StatusPill status={po.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

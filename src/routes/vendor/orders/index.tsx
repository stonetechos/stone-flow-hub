/** Vendor orders — confirmed POs assigned to this vendor. */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingBlock, ErrorBlock, EmptyState } from "@/components/layout/States";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppError, mapDbError, toUserMessage } from "@/lib/errors";
import type { DbTable } from "@/lib/types";

type PoRow = DbTable<"purchase_orders">;

async function listOrders(): Promise<PoRow[]> {
  const { data, error } = await supabase
    .from("purchase_orders")
    .select("*")
    .order("order_date", { ascending: false, nullsFirst: false })
    .limit(200);
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export const Route = createFileRoute("/vendor/orders/")({
  component: OrdersList,
});

function OrdersList() {
  const q = useQuery({ queryKey: ["vendor", "orders"], queryFn: listOrders, staleTime: 30_000 });
  if (q.isLoading) return <LoadingBlock />;
  if (q.error) return <ErrorBlock message={toUserMessage(q.error)} onRetry={() => q.refetch()} />;
  const rows = q.data ?? [];
  return (
    <div>
      <PageHeader title="Orders" subtitle="Purchase orders confirmed by Stone Tech" />
      {rows.length === 0 ? (
        <EmptyState title="No orders yet" message="Approved quotes will show up here." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((po) => (
            <Card key={po.id} className="shadow-1">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 font-mono text-sm">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    {po.po_no}
                  </span>
                  <Badge variant="outline">{po.status}</Badge>
                </div>
                <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                  {po.order_date && <div>Ordered {po.order_date}</div>}
                  {po.expected_date && <div>Expected {po.expected_date}</div>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

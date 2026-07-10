import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { qk } from "@/lib/query-keys";
import { getSalesOrderDeliveryStatus } from "@/lib/dispatch/api";
import { DeliveryChallanListPanel } from "./DeliveryChallanListPanel";

export function SalesOrderDeliveryPanel({ salesOrderId }: { salesOrderId: string }) {
  const q = useQuery({
    queryKey: qk.dispatch.deliveryStatus(salesOrderId),
    queryFn: () => getSalesOrderDeliveryStatus(salesOrderId),
  });
  const s = q.data;
  const pct =
    s && s.totalOrdered > 0 ? Math.min(100, (s.totalDelivered / s.totalOrdered) * 100) : 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm">Delivery progress</CardTitle>
            {s && (
              <div className="mt-1 text-xs text-muted-foreground">
                {s.challanCount} challan(s) · Delivered {s.totalDelivered} / {s.totalOrdered} ·
                Remaining {s.totalRemaining}
              </div>
            )}
          </div>
          <Link to="/dispatch/new" search={{ so: salesOrderId }}>
            <Button size="sm">
              <Truck className="mr-2 h-4 w-4" /> New delivery challan
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={pct} />
          {q.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !s || s.lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No line items on this sales order to track.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Ordered</TableHead>
                    <TableHead className="text-right">Delivered</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead>Unit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {s.lines.map((l) => (
                    <TableRow key={l.sales_order_item_id}>
                      <TableCell>
                        <div className="font-medium">{l.product_name}</div>
                        {l.description !== l.product_name && (
                          <div className="text-xs text-muted-foreground">{l.description}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{l.ordered}</TableCell>
                      <TableCell className="text-right">{l.delivered}</TableCell>
                      <TableCell className="text-right font-medium">{l.remaining}</TableCell>
                      <TableCell>{l.unit ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <DeliveryChallanListPanel salesOrderId={salesOrderId} />
    </div>
  );
}

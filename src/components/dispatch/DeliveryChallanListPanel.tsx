import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusPill } from "@/components/entity/StatusPill";
import { qk } from "@/lib/query-keys";
import {
  listDispatchesBySalesOrder,
  listDispatchesByCustomer,
  listDispatchesByProject,
  type DispatchListItem,
} from "@/lib/dispatch/api";

type Props =
  | { salesOrderId: string; customerId?: never; projectId?: never; title?: string }
  | { customerId: string; salesOrderId?: never; projectId?: never; title?: string }
  | { projectId: string; salesOrderId?: never; customerId?: never; title?: string };

export function DeliveryChallanListPanel(props: Props) {
  const title = props.title ?? "Delivery challans";
  const query = useQuery({
    queryKey: props.salesOrderId
      ? qk.dispatch.bySalesOrder(props.salesOrderId)
      : props.customerId
        ? qk.dispatch.byCustomer(props.customerId)
        : qk.dispatch.byProject(props.projectId!),
    queryFn: () =>
      props.salesOrderId
        ? listDispatchesBySalesOrder(props.salesOrderId)
        : props.customerId
          ? listDispatchesByCustomer(props.customerId)
          : listDispatchesByProject(props.projectId!),
  });

  const rows: DispatchListItem[] = query.data ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">{title}</CardTitle>
        <span className="text-xs text-muted-foreground">{rows.length} challan(s)</span>
      </CardHeader>
      <CardContent className="p-0">
        {query.isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Truck className="h-4 w-4" /> No delivery challans yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Challan #</TableHead>
                <TableHead>Date</TableHead>
                {!props.salesOrderId && <TableHead>Sales Order</TableHead>}
                <TableHead>Vehicle</TableHead>
                <TableHead>LR #</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">
                    <Link
                      to="/dispatch/$id"
                      params={{ id: r.id }}
                      className="text-primary hover:underline"
                    >
                      {r.dispatch_no}
                    </Link>
                  </TableCell>
                  <TableCell>{r.dispatch_date}</TableCell>
                  {!props.salesOrderId && (
                    <TableCell className="font-mono text-xs">
                      {r.sales_order?.so_no ?? "—"}
                    </TableCell>
                  )}
                  <TableCell>{r.vehicle_no ?? "—"}</TableCell>
                  <TableCell>{r.lr_no ?? "—"}</TableCell>
                  <TableCell>
                    <StatusPill status={r.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

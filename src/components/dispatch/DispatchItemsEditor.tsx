import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
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
import { qk } from "@/lib/query-keys";
import { listSalesOrderItems } from "@/lib/sales-orders/api";
import { getSalesOrderDeliveryStatus } from "@/lib/dispatch/api";
import type { DispatchItemInput } from "@/lib/dispatch/schema";

/**
 * Editor for delivery-challan line items. If a sales order is selected,
 * we pre-fill the grid from its line items and show ordered / already-delivered
 * / remaining. Quantity defaults to the remaining amount.
 */
export function DispatchItemsEditor({
  salesOrderId,
  value,
  onChange,
  excludeDispatchId,
}: {
  salesOrderId: string | null | undefined;
  value: DispatchItemInput[];
  onChange: (rows: DispatchItemInput[]) => void;
  /** When editing, exclude this challan's own quantities from the "delivered" total */
  excludeDispatchId?: string;
}) {
  const soItems = useQuery({
    queryKey: qk.salesOrders.items(salesOrderId ?? "none"),
    queryFn: () => listSalesOrderItems(salesOrderId!),
    enabled: !!salesOrderId,
  });
  const status = useQuery({
    queryKey: qk.dispatch.deliveryStatus(salesOrderId ?? "none"),
    queryFn: () => getSalesOrderDeliveryStatus(salesOrderId!),
    enabled: !!salesOrderId,
  });

  // If the SO changed and we have no rows yet, seed from SO items.
  useEffect(() => {
    if (!salesOrderId || !soItems.data || !status.data) return;
    if (value.length > 0) return;
    const alreadyDelivered = new Map(
      status.data.lines.map((l) => [l.sales_order_item_id, l.delivered]),
    );
    const seeded: DispatchItemInput[] = soItems.data.map((it, idx) => {
      const ordered = Number(it.quantity);
      const del = alreadyDelivered.get(it.id) ?? 0;
      const remaining = Math.max(0, ordered - del);
      return {
        sales_order_item_id: it.id,
        product_id: it.product_id,
        product_name: it.product_name ?? it.description,
        description: it.description,
        unit: it.unit,
        quantity: remaining,
        sort_order: idx,
      };
    });
    onChange(seeded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salesOrderId, soItems.data, status.data]);

  const update = (idx: number, patch: Partial<DispatchItemInput>) => {
    onChange(value.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };
  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx));
  const addBlank = () =>
    onChange([
      ...value,
      {
        sales_order_item_id: null,
        product_id: null,
        product_name: "",
        description: "",
        unit: "",
        quantity: 0,
        sort_order: value.length,
      },
    ]);

  const deliveredMap = new Map((status.data?.lines ?? []).map((l) => [l.sales_order_item_id, l]));

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Ordered</TableHead>
              <TableHead className="text-right">Already delivered</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
              <TableHead className="text-right">This challan</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {value.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="p-4 text-center text-sm text-muted-foreground">
                  {salesOrderId
                    ? "Pick a sales order first — items will be pre-filled."
                    : "No line items added yet."}
                </TableCell>
              </TableRow>
            ) : (
              value.map((r, idx) => {
                const s = r.sales_order_item_id
                  ? deliveredMap.get(r.sales_order_item_id)
                  : undefined;
                // If editing an existing challan, subtract its own qty from delivered
                const own = excludeDispatchId ? Number(r.quantity) : 0;
                const delivered = s ? Math.max(0, s.delivered - own) : 0;
                const ordered = s?.ordered ?? 0;
                const remaining = s ? Math.max(0, ordered - delivered) : Number(r.quantity);
                return (
                  <TableRow key={idx}>
                    <TableCell className="align-top">
                      <div className="font-medium">
                        <Input
                          value={r.product_name ?? ""}
                          onChange={(e) => update(idx, { product_name: e.target.value })}
                          placeholder="Product"
                        />
                      </div>
                      <Input
                        className="mt-1"
                        value={r.description}
                        onChange={(e) => update(idx, { description: e.target.value })}
                        placeholder="Description"
                      />
                    </TableCell>
                    <TableCell className="text-right align-top text-sm">
                      {s ? ordered : "—"}
                    </TableCell>
                    <TableCell className="text-right align-top text-sm">
                      {s ? delivered : "—"}
                    </TableCell>
                    <TableCell className="text-right align-top text-sm font-medium">
                      {s ? remaining : "—"}
                    </TableCell>
                    <TableCell className="align-top">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={Number(r.quantity)}
                        onChange={(e) => update(idx, { quantity: Number(e.target.value) })}
                        className="text-right"
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <Input
                        value={r.unit ?? ""}
                        onChange={(e) => update(idx, { unit: e.target.value })}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(idx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={addBlank}>
          <Plus className="mr-2 h-4 w-4" /> Add line
        </Button>
      </div>
    </div>
  );
}

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, CheckCircle2, Package, Plus, Trash2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
import { getSalesOrderDeliveryStatus, getQuoteDeliveryStatus } from "@/lib/dispatch/api";
import type { DispatchItemInput } from "@/lib/dispatch/schema";

import { CatalogProductSelect } from "@/components/quotes/CatalogProductSelect";

function isInstallationOrLabour(text?: string | null): boolean {
  if (!text) return false;
  const s = text.toLowerCase();
  return (
    s.includes("install") ||
    s.includes("labour") ||
    s.includes("labor") ||
    s.includes("fitting") ||
    s.includes("fixing") ||
    s.includes("handover") ||
    s.includes("work completion") ||
    s.includes("service")
  );
}

/**
 * Editor for delivery-challan line items. If a sales order or quotation is selected,
 * we pre-fill the grid from its line items and show ordered / already-delivered
 * / remaining. Only items selected (quantity > 0) are saved on the challan.
 */
export function DispatchItemsEditor({
  salesOrderId,
  quoteId,
  value,
  onChange,
  excludeDispatchId,
}: {
  salesOrderId?: string | null;
  quoteId?: string | null;
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
  const soStatus = useQuery({
    queryKey: qk.dispatch.deliveryStatus(salesOrderId ?? "none"),
    queryFn: () => getSalesOrderDeliveryStatus(salesOrderId!),
    enabled: !!salesOrderId,
  });

  const quoteStatus = useQuery({
    queryKey: ["dispatch", "quote-delivery-status", quoteId ?? "none", excludeDispatchId ?? "none"],
    queryFn: () => getQuoteDeliveryStatus(quoteId!, excludeDispatchId),
    enabled: !!quoteId && !salesOrderId,
  });

  const activeStatus = salesOrderId ? soStatus.data : quoteStatus.data;

  // If the SO changed and we have no rows yet, seed from SO items.
  useEffect(() => {
    if (!salesOrderId || !soItems.data || !soStatus.data) return;
    if (value.length > 0) return;
    const alreadyDelivered = new Map(
      soStatus.data.lines.map((l) => [l.sales_order_item_id, l.delivered]),
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
  }, [salesOrderId, soItems.data, soStatus.data]);

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
        unit: "sqft",
        quantity: 1,
        sort_order: value.length,
      },
    ]);

  const deliveredMap = new Map((activeStatus?.lines ?? []).map((l) => [l.sales_order_item_id, l]));
  const deliveredByName = new Map(
    (activeStatus?.lines ?? []).map((l) => [
      (l.product_name || l.description || "").trim().toLowerCase(),
      l,
    ]),
  );

  const getStatusLine = (r: DispatchItemInput) => {
    if (r.sales_order_item_id && deliveredMap.has(r.sales_order_item_id)) {
      return deliveredMap.get(r.sales_order_item_id);
    }
    const nameKey = (r.product_name || r.description || "").trim().toLowerCase();
    return deliveredByName.get(nameKey);
  };

  const handleSelectAllRemaining = () => {
    const updated = value.map((r) => {
      const s = getStatusLine(r);
      const rem = s ? Math.max(0, s.ordered - s.delivered) : Number(r.quantity) || 1;
      return { ...r, quantity: rem > 0 ? rem : 0 };
    });
    onChange(updated);
  };

  const handleSelectMaterialsOnly = () => {
    const updated = value.map((r) => {
      const isWork = isInstallationOrLabour(r.product_name || r.description);
      if (isWork) return { ...r, quantity: 0 };
      const s = getStatusLine(r);
      const rem = s ? Math.max(0, s.ordered - s.delivered) : Number(r.quantity) || 1;
      return { ...r, quantity: rem > 0 ? rem : 1 };
    });
    onChange(updated);
  };

  const handleSelectWorkOnly = () => {
    const updated = value.map((r) => {
      const isWork = isInstallationOrLabour(r.product_name || r.description);
      if (!isWork) return { ...r, quantity: 0 };
      const s = getStatusLine(r);
      const rem = s ? Math.max(0, s.ordered - s.delivered) : Number(r.quantity) || 1;
      return { ...r, quantity: rem > 0 ? rem : 1 };
    });
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {(salesOrderId || quoteId) && activeStatus?.lines && activeStatus.lines.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/30 p-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Quick Selection:</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs bg-card"
              onClick={handleSelectAllRemaining}
            >
              <Check className="mr-1 h-3 w-3" /> All Remaining
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs border-amber-500/40 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20 bg-card"
              onClick={handleSelectMaterialsOnly}
              title="Include stone, adhesives, sealers, carting; exclude installation labour"
            >
              <Package className="mr-1 h-3 w-3 text-amber-600 dark:text-amber-400" />
              Materials &amp; Sealers Only
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs border-teal-500/40 text-teal-800 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/20 bg-card"
              onClick={handleSelectWorkOnly}
              title="Include installation labour & handover; exclude physical materials"
            >
              <Wrench className="mr-1 h-3 w-3 text-teal-600 dark:text-teal-400" />
              Installation &amp; Handover Only
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            Items with <strong>0 qty</strong> are excluded from this challan.
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">Include</TableHead>
              <TableHead className="min-w-[240px]">Item / Product</TableHead>
              <TableHead className="text-right">Ordered</TableHead>
              <TableHead className="text-right">Already delivered</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
              <TableHead className="text-right min-w-[110px]">This challan qty</TableHead>
              <TableHead className="min-w-[80px]">Unit</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {value.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="p-4 text-center text-sm text-muted-foreground">
                  {salesOrderId || quoteId
                    ? "No items in this delivery challan. Click “Add line” or pick an order."
                    : "No line items added yet. Click “Add line” to add products."}
                </TableCell>
              </TableRow>
            ) : (
              value.map((r, idx) => {
                const s = getStatusLine(r);
                const own = excludeDispatchId ? Number(r.quantity) : 0;
                const delivered = s ? Math.max(0, s.delivered - own) : 0;
                const ordered = s?.ordered ?? 0;
                const remaining = s ? Math.max(0, ordered - delivered) : Number(r.quantity);
                const isIncluded = Number(r.quantity) > 0;

                return (
                  <TableRow
                    key={idx}
                    className={cn(
                      "transition-colors",
                      !isIncluded && "opacity-50 bg-muted/20 hover:opacity-80",
                    )}
                  >
                    <TableCell className="align-middle text-center">
                      <Checkbox
                        checked={isIncluded}
                        onCheckedChange={(checked) => {
                          update(idx, {
                            quantity: checked ? (remaining > 0 ? remaining : 1) : 0,
                          });
                        }}
                        aria-label="Include line item in this challan"
                      />
                    </TableCell>
                    <TableCell className="align-top space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <CatalogProductSelect
                            value={r.product_name || r.description}
                            onChange={(val) =>
                              update(idx, {
                                product_name: val,
                                description: r.description || val,
                              })
                            }
                            onSelectCatalogItem={(cat) => {
                              update(idx, {
                                product_name: cat.name,
                                description: cat.name,
                                unit: cat.defaultUnit,
                              });
                            }}
                            placeholder="Select stone, adhesive or sealer…"
                          />
                        </div>
                        {!isIncluded && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] shrink-0 font-normal text-muted-foreground"
                          >
                            Excluded
                          </Badge>
                        )}
                      </div>
                      <Input
                        value={r.description}
                        onChange={(e) => update(idx, { description: e.target.value })}
                        placeholder="Description / dimensions / finish details"
                        className="text-xs h-8"
                      />
                    </TableCell>
                    <TableCell className="text-right align-top text-sm">
                      {s ? ordered : "—"}
                    </TableCell>
                    <TableCell className="text-right align-top text-sm">
                      {s ? delivered : "—"}
                    </TableCell>
                    <TableCell className="text-right align-top text-sm font-medium">
                      {s ? (
                        <span
                          className={
                            remaining > 0 ? "text-primary font-semibold" : "text-muted-foreground"
                          }
                        >
                          {remaining}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={r.quantity === 0 ? "" : r.quantity}
                        placeholder="0"
                        onChange={(e) => update(idx, { quantity: Number(e.target.value || 0) })}
                        className="text-right font-mono"
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remove item"
                        onClick={() => remove(idx)}
                      >
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

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
import type { PurchaseTransportItemInput } from "@/lib/purchase-transportation/schema";

/**
 * Shipment-manifest line editor for Purchase Transportation. Unlike
 * DispatchItemsEditor, this does NOT pre-fill from a PO or show an
 * ordered/remaining column — Purchase Orders have no line-item table to
 * seed from (see the migration's header comment). This is a free-entry
 * manifest of what travelled on this trip.
 */
export function PurchaseTransportItemsEditor({
  value,
  onChange,
}: {
  value: PurchaseTransportItemInput[];
  onChange: (rows: PurchaseTransportItemInput[]) => void;
}) {
  const update = (idx: number, patch: Partial<PurchaseTransportItemInput>) => {
    onChange(value.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };
  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx));
  const addBlank = () =>
    onChange([
      ...value,
      {
        product_id: null,
        product_name: "",
        description: "",
        unit: "",
        quantity: 0,
        sort_order: value.length,
      },
    ]);

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {value.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="p-4 text-center text-sm text-muted-foreground">
                  No line items added yet.
                </TableCell>
              </TableRow>
            ) : (
              value.map((r, idx) => (
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
              ))
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

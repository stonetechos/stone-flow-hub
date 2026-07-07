import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, Layers, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingBlock, ErrorBlock, EmptyState } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { EntityPicker } from "@/components/forms/EntityPicker";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import {
  createManualMovement,
  listMovements,
  MOVEMENT_TYPES,
  type MovementCreateInput,
} from "@/lib/inventory/movements";
import { invalidateInventoryMovements } from "@/lib/query-invalidation";

export const Route = createFileRoute("/_authenticated/inventory/movements")({
  ssr: false,
  component: MovementsPage,
});

function MovementsPage() {
  const qc = useQueryClient();
  const [productId, setProductId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: qk.inventoryMovements.list(productId),
    queryFn: () => listMovements({ productId }),
  });

  const [form, setForm] = useState<MovementCreateInput>({
    inventory_item_id: null,
    product_id: null,
    movement_type: "adjustment",
    direction: "in",
    quantity: 0,
    unit: "sqft",
    from_location: null,
    to_location: null,
    ref_no: null,
    notes: null,
  });
  const set = <K extends keyof MovementCreateInput>(k: K, v: MovementCreateInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const mut = useMutation({
    mutationFn: createManualMovement,
    onSuccess: () => {
      toast.success("Movement posted");
      invalidateInventoryMovements(qc);
      setForm((f) => ({ ...f, quantity: 0, notes: null, ref_no: null }));
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  return (
    <div>
      <PageHeader
        title="Inventory Movements"
        subtitle="Full audit trail of every stock movement — receipt, consumption, transfer, adjustment, return, dispatch."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-sm">Movement ledger</CardTitle>
              <div className="w-56">
                <EntityPicker
                  type="product"
                  value={productId}
                  onChange={(v) => setProductId(v)}
                  placeholder="Filter product"
                />
              </div>
            </CardHeader>
            <CardContent>
              {query.isLoading ? (
                <LoadingBlock />
              ) : query.error ? (
                <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
              ) : (query.data ?? []).length === 0 ? (
                <EmptyState
                  icon={<Layers className="h-6 w-6" />}
                  title="No movements yet"
                  message="Movements will appear here as material is received, consumed, transferred or dispatched."
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead>Ref</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {query.data!.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="text-xs">
                            {new Date(m.moved_at).toLocaleString()}
                          </TableCell>
                          <TableCell className="capitalize text-xs">
                            <Badge variant="secondary" className="gap-1">
                              {m.direction === "in" ? (
                                <ArrowDownLeft className="h-3 w-3" />
                              ) : (
                                <ArrowUpRight className="h-3 w-3" />
                              )}
                              {m.movement_type.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {m.product ? `${m.product.name}` : "—"}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {m.direction === "in" ? "+" : "-"}
                            {Number(m.quantity)} {m.unit ?? ""}
                          </TableCell>
                          <TableCell className="text-xs">{m.ref_no ?? "—"}</TableCell>
                          <TableCell className="text-xs">{m.notes ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Manual movement</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                mut.mutate(form);
              }}
            >
              <label className="text-xs text-muted-foreground">Product</label>
              <EntityPicker
                type="product"
                value={form.product_id ?? null}
                onChange={(v) => set("product_id", v)}
              />
              <label className="text-xs text-muted-foreground">Type</label>
              <Select
                value={form.movement_type}
                onValueChange={(v) =>
                  set("movement_type", v as MovementCreateInput["movement_type"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MOVEMENT_TYPES.filter((t) => t !== "purchase_receipt").map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">
                      {t.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <label className="text-xs text-muted-foreground">Direction</label>
              <Select
                value={form.direction}
                onValueChange={(v) => set("direction", v as "in" | "out")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">In</SelectItem>
                  <SelectItem value="out">Out</SelectItem>
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Qty</label>
                  <Input
                    type="number"
                    step="0.001"
                    value={form.quantity || ""}
                    onChange={(e) => set("quantity", Number(e.target.value || 0))}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Unit</label>
                  <Input
                    value={form.unit ?? ""}
                    onChange={(e) => set("unit", e.target.value || null)}
                  />
                </div>
              </div>
              <label className="text-xs text-muted-foreground">Reference #</label>
              <Input
                value={form.ref_no ?? ""}
                onChange={(e) => set("ref_no", e.target.value || null)}
              />
              <label className="text-xs text-muted-foreground">Notes</label>
              <Textarea
                rows={2}
                value={form.notes ?? ""}
                onChange={(e) => set("notes", e.target.value || null)}
              />
              <Button type="submit" disabled={mut.isPending || form.quantity <= 0} className="w-full">
                <Plus className="mr-2 h-4 w-4" /> Post movement
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

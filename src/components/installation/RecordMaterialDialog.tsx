/** Record a material movement for an installation. */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, PackagePlus } from "lucide-react";
import { EntityPicker } from "@/components/forms/EntityPicker";
import {
  recordInstallationMaterial,
  MATERIAL_KINDS,
  type MaterialKind,
} from "@/lib/installation/materials";
import { invalidateInstallation } from "@/lib/query-invalidation";
import { toUserMessage } from "@/lib/errors";

const LABELS: Record<MaterialKind, string> = {
  dispatched: "Dispatched",
  received: "Received on site",
  installed: "Installed",
  damaged: "Damaged",
  returned: "Returned to store",
};

export function RecordMaterialDialog({ installationId }: { installationId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<MaterialKind>("received");
  const [productId, setProductId] = useState<string | null>(null);
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");

  const mut = useMutation({
    mutationFn: () =>
      recordInstallationMaterial({
        installation_id: installationId,
        product_id: productId,
        kind,
        qty: Number(qty),
        unit: unit || null,
        description: description || null,
        notes: notes || null,
      }),
    onSuccess: () => {
      toast.success("Material recorded");
      invalidateInstallation(qc, installationId);
      setOpen(false);
      setQty("");
      setNotes("");
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <PackagePlus className="mr-1 h-4 w-4" /> Record material
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record installation material</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Movement</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as MaterialKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MATERIAL_KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Product</Label>
            <EntityPicker
              type="product"
              value={productId}
              onChange={(id) => setProductId(id)}
              placeholder="Select product (optional)"
              allowCreate
            />
          </div>
          <div className="space-y-1">
            <Label>Description (if no product)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 20mm Galaxy slab"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Quantity</Label>
              <Input
                type="number"
                step="0.001"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Unit</Label>
              <Input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="sqft / nos"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !qty || Number(qty) <= 0}>
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

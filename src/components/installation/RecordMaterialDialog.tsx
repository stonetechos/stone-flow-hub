/** Record a material movement for an installation. */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { QuickForm } from "@/components/forms/QuickForm";
import { Field } from "@/components/forms/Field";
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
        <QuickForm
          onSubmit={(e) => {
            e.preventDefault();
            if (!qty || Number(qty) <= 0) return;
            mut.mutate();
          }}
          busy={mut.isPending}
        >
          <QuickForm.QuickFill>
            <Field label="Movement">
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
            </Field>
            <Field label="Product">
              <EntityPicker
                type="product"
                value={productId}
                onChange={(id) => setProductId(id)}
                placeholder="Select product (optional)"
                allowCreate
              />
            </Field>
            <Field label="Quantity">
              <Input
                type="number"
                step="0.001"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </Field>
            <Field label="Unit">
              <Input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="sqft / nos"
              />
            </Field>
          </QuickForm.QuickFill>

          <QuickForm.MoreDetails>
            <Field label="Description (if no product)" className="md:col-span-2">
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. 20mm Galaxy slab"
              />
            </Field>
            <Field label="Notes" className="md:col-span-2">
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </QuickForm.MoreDetails>

          <QuickForm.Actions>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mut.isPending || !qty || Number(qty) <= 0}>
              {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
            </Button>
          </QuickForm.Actions>
        </QuickForm>
      </DialogContent>
    </Dialog>
  );
}

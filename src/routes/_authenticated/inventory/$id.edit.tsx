import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorBlock, LoadingBlock } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QuickForm } from "@/components/forms/QuickForm";
import { Field } from "@/components/forms/Field";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { getInventoryItem, updateInventoryItem } from "@/lib/inventory/api";
import type { InventoryCreateInput } from "@/lib/inventory/schema";
import { listProducts } from "@/lib/products/api";

export const Route = createFileRoute("/_authenticated/inventory/$id/edit")({
  ssr: false,
  component: EditInventoryPage,
});

function EditInventoryPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const query = useQuery({ queryKey: qk.inventory.byId(id), queryFn: () => getInventoryItem(id) });
  const products = useQuery({ queryKey: qk.products.list(""), queryFn: () => listProducts() });

  const [form, setForm] = useState<InventoryCreateInput | null>(null);
  useEffect(() => {
    if (query.data) {
      const r = query.data;
      setForm({
        product_id: r.product_id, location: r.location, unit: r.unit,
        quantity_on_hand: Number(r.quantity_on_hand ?? 0),
        reorder_level: Number(r.reorder_level ?? 0),
        notes: r.notes,
      });
    }
  }, [query.data]);

  const mut = useMutation({
    mutationFn: (input: InventoryCreateInput) => updateInventoryItem(id, input),
    onSuccess: () => {
      toast.success("Stock item updated");
      qc.invalidateQueries({ queryKey: qk.inventory.all });
      nav({ to: "/inventory/$id", params: { id } });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  if (query.isLoading || !form) return <LoadingBlock />;
  if (query.error) return <ErrorBlock message={toUserMessage(query.error)} />;

  const set = <K extends keyof InventoryCreateInput>(k: K, v: InventoryCreateInput[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  return (
    <div>
      <PageHeader title={`Edit ${query.data?.stock_code ?? ""}`} />
      <QuickForm onSubmit={(e) => { e.preventDefault(); mut.mutate(form); }} busy={mut.isPending}>
        <QuickForm.QuickFill>
          <Field label="Product">
            <Select value={form.product_id ?? ""} onValueChange={(v) => set("product_id", v || null)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(products.data ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Location">
            <Input value={form.location ?? ""} onChange={(e) => set("location", e.target.value || null)} />
          </Field>
        </QuickForm.QuickFill>
        <QuickForm.MoreDetails>
          <Field label="Unit">
            <Input value={form.unit ?? ""} onChange={(e) => set("unit", e.target.value || null)} />
          </Field>
          <Field label="On hand">
            <Input type="number" min={0} value={form.quantity_on_hand} onChange={(e) => set("quantity_on_hand", Number(e.target.value))} />
          </Field>
          <Field label="Reorder level">
            <Input type="number" min={0} value={form.reorder_level} onChange={(e) => set("reorder_level", Number(e.target.value))} />
          </Field>
        </QuickForm.MoreDetails>
        <QuickForm.Advanced>
          <Field label="Notes" className="md:col-span-2">
            <Textarea rows={3} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value || null)} />
          </Field>
        </QuickForm.Advanced>
        <QuickForm.Actions>
          <Button type="button" variant="ghost" onClick={() => nav({ to: "/inventory/$id", params: { id } })}>Cancel</Button>
          <Button type="submit" disabled={mut.isPending}>
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
          </Button>
        </QuickForm.Actions>
      </QuickForm>
    </div>
  );
}

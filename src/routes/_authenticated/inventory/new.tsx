import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
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
import { QuickForm } from "@/components/forms/QuickForm";
import { Field } from "@/components/forms/Field";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { createInventoryItem } from "@/lib/inventory/api";
import type { InventoryCreateInput } from "@/lib/inventory/schema";
import { listProducts } from "@/lib/products/api";

export const Route = createFileRoute("/_authenticated/inventory/new")({
  ssr: false,
  component: NewInventoryPage,
});

function NewInventoryPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const products = useQuery({ queryKey: qk.products.list(""), queryFn: () => listProducts() });

  const [form, setForm] = useState<InventoryCreateInput>({
    product_id: null,
    location: null,
    unit: null,
    quantity_on_hand: 0,
    reorder_level: 0,
    notes: null,
  });
  const set = <K extends keyof InventoryCreateInput>(k: K, v: InventoryCreateInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const mut = useMutation({
    mutationFn: createInventoryItem,
    onSuccess: (row) => {
      toast.success(t("inventory.itemCreated", "Stock {{code}} created", { code: row.stock_code }));
      nav({ to: "/inventory/$id", params: { id: row.id } });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  return (
    <div>
      <PageHeader
        title={t("inventory.newTitle", "New stock item")}
        subtitle={t("inventory.newSubtitle", "Add a product-location stock line.")}
      />
      <QuickForm
        onSubmit={(e) => {
          e.preventDefault();
          mut.mutate(form);
        }}
        busy={mut.isPending}
      >
        <QuickForm.QuickFill>
          <Field label={t("inventory.fields.product", "Product")}>
            <Select
              value={form.product_id ?? ""}
              onValueChange={(v) => set("product_id", v || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("inventory.selectProduct", "Select product")} />
              </SelectTrigger>
              <SelectContent>
                {(products.data ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("inventory.fields.location", "Location")}>
            <Input
              value={form.location ?? ""}
              onChange={(e) => set("location", e.target.value || null)}
              placeholder={t("inventory.locationPlaceholder", "Warehouse / Bay")}
            />
          </Field>
        </QuickForm.QuickFill>

        <QuickForm.MoreDetails>
          <Field label={t("inventory.fields.unit", "Unit")}>
            <Input
              value={form.unit ?? ""}
              onChange={(e) => set("unit", e.target.value || null)}
              placeholder={t("inventory.unitPlaceholder", "sqft, slab…")}
            />
          </Field>
          <Field label={t("inventory.fields.onHand", "On hand")}>
            <Input
              type="number"
              min={0}
              value={form.quantity_on_hand}
              onChange={(e) => set("quantity_on_hand", Number(e.target.value))}
            />
          </Field>
          <Field label={t("inventory.fields.reorderLevel", "Reorder level")}>
            <Input
              type="number"
              min={0}
              value={form.reorder_level}
              onChange={(e) => set("reorder_level", Number(e.target.value))}
            />
          </Field>
        </QuickForm.MoreDetails>

        <QuickForm.Advanced>
          <Field label={t("inventory.fields.notes", "Notes")} className="md:col-span-2">
            <Textarea
              rows={3}
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value || null)}
            />
          </Field>
        </QuickForm.Advanced>

        <QuickForm.Actions>
          <Button type="button" variant="ghost" onClick={() => nav({ to: "/inventory" })}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button type="submit" disabled={mut.isPending}>
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{" "}
            {t("common.create", "Create")}
          </Button>
        </QuickForm.Actions>
      </QuickForm>
    </div>
  );
}

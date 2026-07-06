import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
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
import { createPurchaseOrder } from "@/lib/purchase-orders/api";
import {
  PURCHASE_ORDER_STATUSES,
  type PurchaseOrderCreateInput,
} from "@/lib/purchase-orders/schema";
import { listVendorsForPicker } from "@/lib/vendors/api";
import { listProjectsForPicker } from "@/lib/projects/api";

const search = z.object({
  project: z.string().uuid().optional(),
  vendor: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated/purchase-orders/new")({
  ssr: false,
  validateSearch: (s) => search.parse(s),
  component: NewPurchaseOrderPage,
});

function today() {
  return new Date().toISOString().slice(0, 10);
}

function NewPurchaseOrderPage() {
  const nav = useNavigate();
  const params = Route.useSearch();
  const vendors = useQuery({ queryKey: qk.vendors.list(""), queryFn: () => listVendorsForPicker() });
  const projects = useQuery({ queryKey: qk.projects.list(""), queryFn: listProjectsForPicker });

  const [form, setForm] = useState<PurchaseOrderCreateInput>({
    vendor_id: params.vendor ?? null,
    project_id: params.project ?? null,
    status: "draft",
    order_date: today(),
    expected_date: null,
    notes: null,
  });
  const set = <K extends keyof PurchaseOrderCreateInput>(k: K, v: PurchaseOrderCreateInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const mut = useMutation({
    mutationFn: createPurchaseOrder,
    onSuccess: (row) => {
      toast.success(`PO ${row.po_no} created`);
      nav({ to: "/purchase-orders/$id", params: { id: row.id } });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  return (
    <div>
      <PageHeader title="New purchase order" subtitle="Raise a procurement order to a vendor." />
      <QuickForm
        onSubmit={(e) => {
          e.preventDefault();
          mut.mutate(form);
        }}
        busy={mut.isPending}
      >
        <QuickForm.QuickFill>
          <Field label="Vendor" required>
            <Select value={form.vendor_id ?? ""} onValueChange={(v) => set("vendor_id", v || null)}>
              <SelectTrigger>
                <SelectValue placeholder="Select vendor" />
              </SelectTrigger>
              <SelectContent>
                {(vendors.data ?? []).map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Order date" required>
            <Input
              type="date"
              value={form.order_date}
              onChange={(e) => set("order_date", e.target.value)}
              required
            />
          </Field>
        </QuickForm.QuickFill>

        <QuickForm.MoreDetails>
          <Field label="Project">
            <Select
              value={form.project_id ?? ""}
              onValueChange={(v) => set("project_id", v || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                {(projects.data ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select
              value={form.status}
              onValueChange={(v) => set("status", v as PurchaseOrderCreateInput["status"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PURCHASE_ORDER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Expected date">
            <Input
              type="date"
              value={form.expected_date ?? ""}
              onChange={(e) => set("expected_date", e.target.value || null)}
            />
          </Field>
        </QuickForm.MoreDetails>

        <QuickForm.Advanced>
          <Field label="Notes" className="md:col-span-2">
            <Textarea
              rows={3}
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value || null)}
            />
          </Field>
        </QuickForm.Advanced>

        <QuickForm.Actions>
          <Button type="button" variant="ghost" onClick={() => nav({ to: "/purchase-orders" })}>
            Cancel
          </Button>
          <Button type="submit" disabled={mut.isPending}>
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create
          </Button>
        </QuickForm.Actions>
      </QuickForm>
    </div>
  );
}

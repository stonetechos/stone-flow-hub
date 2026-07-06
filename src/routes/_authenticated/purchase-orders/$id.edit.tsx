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
import { getPurchaseOrder, updatePurchaseOrder } from "@/lib/purchase-orders/api";
import {
  PURCHASE_ORDER_STATUSES,
  type PurchaseOrderCreateInput,
} from "@/lib/purchase-orders/schema";
import { listVendorsForPicker } from "@/lib/vendors/api";
import { listProjectsForPicker } from "@/lib/projects/api";

export const Route = createFileRoute("/_authenticated/purchase-orders/$id/edit")({
  ssr: false,
  component: EditPurchaseOrderPage,
});

function EditPurchaseOrderPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: qk.purchaseOrders.byId(id),
    queryFn: () => getPurchaseOrder(id),
  });
  const vendors = useQuery({ queryKey: qk.vendors.list(""), queryFn: () => listVendorsForPicker() });
  const projects = useQuery({ queryKey: qk.projects.list(""), queryFn: listProjectsForPicker });

  const [form, setForm] = useState<PurchaseOrderCreateInput | null>(null);
  useEffect(() => {
    if (query.data) {
      const r = query.data;
      setForm({
        vendor_id: r.vendor_id,
        project_id: r.project_id,
        status: r.status,
        order_date: r.order_date,
        expected_date: r.expected_date,
        notes: r.notes,
      });
    }
  }, [query.data]);

  const mut = useMutation({
    mutationFn: (input: PurchaseOrderCreateInput) => updatePurchaseOrder(id, input),
    onSuccess: () => {
      toast.success("Purchase order updated");
      qc.invalidateQueries({ queryKey: qk.purchaseOrders.all });
      nav({ to: "/purchase-orders/$id", params: { id } });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  if (query.isLoading || !form) return <LoadingBlock />;
  if (query.error) return <ErrorBlock message={toUserMessage(query.error)} />;

  const set = <K extends keyof PurchaseOrderCreateInput>(k: K, v: PurchaseOrderCreateInput[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  return (
    <div>
      <PageHeader title={`Edit ${query.data?.po_no ?? ""}`} />
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
                <SelectValue />
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
                <SelectValue />
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
          <Button
            type="button"
            variant="ghost"
            onClick={() => nav({ to: "/purchase-orders/$id", params: { id } })}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={mut.isPending}>
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
          </Button>
        </QuickForm.Actions>
      </QuickForm>
    </div>
  );
}

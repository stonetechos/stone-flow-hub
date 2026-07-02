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
import { getDispatch, updateDispatch } from "@/lib/dispatch/api";
import { DISPATCH_STATUSES, type DispatchCreateInput } from "@/lib/dispatch/schema";
import { listSalesOrdersForPicker } from "@/lib/sales-orders/api";

export const Route = createFileRoute("/_authenticated/dispatch/$id/edit")({
  ssr: false,
  component: EditDispatchPage,
});

function EditDispatchPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const query = useQuery({ queryKey: qk.dispatch.byId(id), queryFn: () => getDispatch(id) });
  const orders = useQuery({ queryKey: qk.salesOrders.list("", ""), queryFn: listSalesOrdersForPicker });

  const [form, setForm] = useState<DispatchCreateInput | null>(null);
  useEffect(() => {
    if (query.data) {
      const r = query.data;
      setForm({
        sales_order_id: r.sales_order_id, status: r.status,
        dispatch_date: r.dispatch_date, carrier: r.carrier, tracking_no: r.tracking_no, notes: r.notes,
      });
    }
  }, [query.data]);

  const mut = useMutation({
    mutationFn: (input: DispatchCreateInput) => updateDispatch(id, input),
    onSuccess: () => {
      toast.success("Dispatch updated");
      qc.invalidateQueries({ queryKey: qk.dispatch.all });
      nav({ to: "/dispatch/$id", params: { id } });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  if (query.isLoading || !form) return <LoadingBlock />;
  if (query.error) return <ErrorBlock message={toUserMessage(query.error)} />;

  const set = <K extends keyof DispatchCreateInput>(k: K, v: DispatchCreateInput[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  return (
    <div>
      <PageHeader title={`Edit ${query.data?.dispatch_no ?? ""}`} />
      <QuickForm onSubmit={(e) => { e.preventDefault(); mut.mutate(form); }} busy={mut.isPending}>
        <QuickForm.QuickFill>
          <Field label="Sales order">
            <Select value={form.sales_order_id ?? ""} onValueChange={(v) => set("sales_order_id", v || null)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(orders.data ?? []).map((o) => <SelectItem key={o.id} value={o.id}>{o.so_no}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Dispatch date" required>
            <Input type="date" value={form.dispatch_date} onChange={(e) => set("dispatch_date", e.target.value)} required />
          </Field>
        </QuickForm.QuickFill>
        <QuickForm.MoreDetails>
          <Field label="Status">
            <Select value={form.status} onValueChange={(v) => set("status", v as DispatchCreateInput["status"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DISPATCH_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Carrier">
            <Input value={form.carrier ?? ""} onChange={(e) => set("carrier", e.target.value || null)} />
          </Field>
          <Field label="Tracking #">
            <Input value={form.tracking_no ?? ""} onChange={(e) => set("tracking_no", e.target.value || null)} />
          </Field>
        </QuickForm.MoreDetails>
        <QuickForm.Advanced>
          <Field label="Notes" className="md:col-span-2">
            <Textarea rows={3} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value || null)} />
          </Field>
        </QuickForm.Advanced>
        <QuickForm.Actions>
          <Button type="button" variant="ghost" onClick={() => nav({ to: "/dispatch/$id", params: { id } })}>Cancel</Button>
          <Button type="submit" disabled={mut.isPending}>
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
          </Button>
        </QuickForm.Actions>
      </QuickForm>
    </div>
  );
}

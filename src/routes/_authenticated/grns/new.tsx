import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { QuickForm } from "@/components/forms/QuickForm";
import { Field } from "@/components/forms/Field";
import { EntityPicker } from "@/components/forms/EntityPicker";
import { toUserMessage } from "@/lib/errors";
import { invalidateGrn } from "@/lib/query-invalidation";
import { createGrn } from "@/lib/grns/api";
import type { GrnCreateInput } from "@/lib/grns/schema";

const search = z.object({
  po: z.string().uuid().optional(),
  vendor: z.string().uuid().optional(),
  project: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated/grns/new")({
  ssr: false,
  validateSearch: (s) => search.parse(s),
  component: NewGrnPage,
});

function today() {
  return new Date().toISOString().slice(0, 10);
}

function NewGrnPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const params = Route.useSearch();

  const [form, setForm] = useState<GrnCreateInput>({
    purchase_order_id: params.po ?? null,
    vendor_id: params.vendor ?? "",
    project_id: params.project ?? null,
    received_date: today(),
    vehicle_no: null,
    driver_name: null,
    driver_phone: null,
    delivery_challan_no: null,
    status: "received",
    overall_acceptance: "pending",
    notes: null,
  });
  const set = <K extends keyof GrnCreateInput>(k: K, v: GrnCreateInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const mut = useMutation({
    mutationFn: createGrn,
    onSuccess: (row) => {
      toast.success(`GRN ${row.grn_no} created`);
      invalidateGrn(qc, row.id);
      nav({ to: "/grns/$id", params: { id: row.id } });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  return (
    <div>
      <PageHeader title="New GRN" subtitle="Receive material against a purchase order." />
      <QuickForm
        onSubmit={(e) => {
          e.preventDefault();
          mut.mutate(form);
        }}
        busy={mut.isPending}
      >
        <QuickForm.QuickFill>
          <Field label="Vendor" required>
            <EntityPicker
              type="vendor"
              value={form.vendor_id || null}
              onChange={(v) => set("vendor_id", v ?? "")}
            />
          </Field>
          <Field label="Received date" required>
            <Input
              type="date"
              value={form.received_date}
              onChange={(e) => set("received_date", e.target.value)}
              required
            />
          </Field>
          <Field label="Delivery challan #">
            <Input
              value={form.delivery_challan_no ?? ""}
              onChange={(e) => set("delivery_challan_no", e.target.value || null)}
            />
          </Field>
          <Field label="Vehicle #">
            <Input
              value={form.vehicle_no ?? ""}
              onChange={(e) => set("vehicle_no", e.target.value || null)}
            />
          </Field>
        </QuickForm.QuickFill>

        <QuickForm.MoreDetails>
          <Field label="Project">
            <EntityPicker
              type="project"
              value={form.project_id ?? null}
              onChange={(v) => set("project_id", v)}
            />
          </Field>
          <Field label="Driver name">
            <Input
              value={form.driver_name ?? ""}
              onChange={(e) => set("driver_name", e.target.value || null)}
            />
          </Field>
          <Field label="Driver phone">
            <Input
              value={form.driver_phone ?? ""}
              onChange={(e) => set("driver_phone", e.target.value || null)}
            />
          </Field>
          <Field label="Notes">
            <Textarea
              rows={3}
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value || null)}
            />
          </Field>
        </QuickForm.MoreDetails>
      </QuickForm>
    </div>
  );
}

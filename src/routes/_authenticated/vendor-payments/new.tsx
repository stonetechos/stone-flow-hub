import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "@/components/layout/PageHeader";
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
import { EntityPicker } from "@/components/forms/EntityPicker";
import { toUserMessage } from "@/lib/errors";
import { invalidateVendorPayment } from "@/lib/query-invalidation";
import { createVendorPayment } from "@/lib/vendor-payments/api";
import {
  VENDOR_PAYMENT_METHODS,
  VENDOR_PAYMENT_TYPES,
  type VendorPaymentCreateInput,
} from "@/lib/vendor-payments/schema";

const search = z.object({
  vendor: z.string().uuid().optional(),
  po: z.string().uuid().optional(),
  grn: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated/vendor-payments/new")({
  ssr: false,
  validateSearch: (s) => search.parse(s),
  component: NewVendorPaymentPage,
});

function today() {
  return new Date().toISOString().slice(0, 10);
}

function NewVendorPaymentPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const params = Route.useSearch();
  const [form, setForm] = useState<VendorPaymentCreateInput>({
    vendor_id: params.vendor ?? "",
    purchase_order_id: params.po ?? null,
    grn_id: params.grn ?? null,
    project_id: null,
    payment_type: "part",
    amount: 0,
    currency_code: "INR",
    method: "bank_transfer",
    reference_no: null,
    paid_at: today(),
    notes: null,
  });
  const set = <K extends keyof VendorPaymentCreateInput>(k: K, v: VendorPaymentCreateInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const mut = useMutation({
    mutationFn: createVendorPayment,
    onSuccess: (row) => {
      toast.success(`Payment ${row.payment_no} recorded`);
      invalidateVendorPayment(qc, row.vendor_id);
      nav({ to: "/vendor-payments" });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  return (
    <div>
      <PageHeader title="Record vendor payment" subtitle="Posts to the vendor ledger automatically." />
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
          <Field label="Payment type" required>
            <Select
              value={form.payment_type}
              onValueChange={(v) => set("payment_type", v as VendorPaymentCreateInput["payment_type"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VENDOR_PAYMENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">
                    {t.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Amount (₹)" required>
            <Input
              type="number"
              step="0.01"
              value={form.amount || ""}
              onChange={(e) => set("amount", Number(e.target.value || 0))}
              required
            />
          </Field>
          <Field label="Paid on" required>
            <Input
              type="date"
              value={form.paid_at}
              onChange={(e) => set("paid_at", e.target.value)}
              required
            />
          </Field>
        </QuickForm.QuickFill>

        <QuickForm.MoreDetails>
          <Field label="Method">
            <Select
              value={form.method ?? "bank_transfer"}
              onValueChange={(v) =>
                set("method", v as VendorPaymentCreateInput["method"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VENDOR_PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m} className="capitalize">
                    {m.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Reference #">
            <Input
              value={form.reference_no ?? ""}
              onChange={(e) => set("reference_no", e.target.value || null)}
            />
          </Field>
          <Field label="Project">
            <EntityPicker
              type="project"
              value={form.project_id ?? null}
              onChange={(v) => set("project_id", v)}
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

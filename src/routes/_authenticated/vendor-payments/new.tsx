import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const mut = useMutation({
    mutationFn: createVendorPayment,
    onSuccess: (row) => {
      toast.success(`Payment ${row.payment_no} recorded`);
      invalidateVendorPayment(qc, row.vendor_id, row.id);
      nav({ to: "/vendor-payments/$id", params: { id: row.id } });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!form.vendor_id) {
      errors.vendor_id = "Please select a team partner";
    }
    if (!form.amount || form.amount <= 0) {
      errors.amount = "Please enter an amount greater than 0";
    }
    if (!form.paid_at) {
      errors.paid_at = "Payment date is required";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      const firstError = Object.values(errors)[0];
      toast.error(firstError);
      return;
    }
    setFormErrors({});
    mut.mutate(form);
  };

  return (
    <div>
      <PageHeader title="Record team payment" subtitle="Posts to the team ledger automatically." />
      <QuickForm onSubmit={handleSubmit} busy={mut.isPending}>
        <QuickForm.QuickFill>
          <Field label="Team Partner" required error={formErrors.vendor_id}>
            <EntityPicker
              type="vendor"
              value={form.vendor_id || null}
              onChange={(v) => {
                set("vendor_id", v ?? "");
                if (v && formErrors.vendor_id) {
                  setFormErrors((prev) => ({ ...prev, vendor_id: "" }));
                }
              }}
            />
          </Field>
          <Field label="Payment type" required>
            <Select
              value={form.payment_type}
              onValueChange={(v) =>
                set("payment_type", v as VendorPaymentCreateInput["payment_type"])
              }
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
          <Field label="Amount (₹)" required error={formErrors.amount}>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={form.amount || ""}
              onChange={(e) => {
                set("amount", Number(e.target.value || 0));
                if (formErrors.amount) {
                  setFormErrors((prev) => ({ ...prev, amount: "" }));
                }
              }}
              required
            />
          </Field>
          <Field label="Paid on" required error={formErrors.paid_at}>
            <Input
              type="date"
              value={form.paid_at}
              onChange={(e) => {
                set("paid_at", e.target.value);
                if (formErrors.paid_at) {
                  setFormErrors((prev) => ({ ...prev, paid_at: "" }));
                }
              }}
              required
            />
          </Field>
        </QuickForm.QuickFill>

        <QuickForm.MoreDetails>
          <Field label="Method">
            <Select
              value={form.method ?? "bank_transfer"}
              onValueChange={(v) => set("method", v as VendorPaymentCreateInput["method"])}
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
          <Field label="Purchase order">
            <EntityPicker
              type="purchase_order"
              value={form.purchase_order_id ?? null}
              onChange={(v) => set("purchase_order_id", v)}
              filter={{ vendorId: form.vendor_id || null }}
              allowCreate={false}
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

        <QuickForm.Actions>
          <Button type="button" variant="ghost" onClick={() => nav({ to: "/vendor-payments" })}>
            Cancel
          </Button>
          <Button type="submit" disabled={mut.isPending}>
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Record payment
          </Button>
        </QuickForm.Actions>
      </QuickForm>
    </div>
  );
}

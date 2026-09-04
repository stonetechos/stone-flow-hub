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
import { invalidatePurchaseInvoice } from "@/lib/query-invalidation";
import { createPurchaseInvoice } from "@/lib/purchase-invoices/api";
import {
  PURCHASE_INVOICE_STATUSES,
  type PurchaseInvoiceCreateInput,
} from "@/lib/purchase-invoices/schema";

const search = z.object({
  vendor: z.string().uuid().optional(),
  po: z.string().uuid().optional(),
  project: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated/purchase-invoices/new")({
  ssr: false,
  validateSearch: (s) => search.parse(s),
  component: NewPurchaseInvoicePage,
});

function today() {
  return new Date().toISOString().slice(0, 10);
}

function NewPurchaseInvoicePage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const params = Route.useSearch();

  const [form, setForm] = useState<PurchaseInvoiceCreateInput>({
    vendor_id: params.vendor ?? "",
    purchase_order_id: params.po ?? null,
    project_id: params.project ?? null,
    vendor_invoice_no: null,
    status: "recorded",
    invoice_date: today(),
    due_date: null,
    subtotal: 0,
    tax_amount: 0,
    other_charges: 0,
    total_amount: 0,
    currency_code: "INR",
    notes: null,
  });
  const set = <K extends keyof PurchaseInvoiceCreateInput>(
    k: K,
    v: PurchaseInvoiceCreateInput[K],
  ) => setForm((f) => ({ ...f, [k]: v }));

  const mut = useMutation({
    mutationFn: createPurchaseInvoice,
    onSuccess: (row) => {
      toast.success(`${row.invoice_no} recorded`);
      invalidatePurchaseInvoice(qc, row.id, row.vendor_id);
      nav({ to: "/purchase-invoices/$id", params: { id: row.id } });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  return (
    <div>
      <PageHeader
        title="Record a purchase invoice"
        subtitle="Log a vendor's bill against a purchase order — attach the invoice image or file below once saved."
      />
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
          <Field label="Vendor's invoice #">
            <Input
              value={form.vendor_invoice_no ?? ""}
              onChange={(e) => set("vendor_invoice_no", e.target.value || null)}
              placeholder="As printed on the vendor's bill"
            />
          </Field>
          <Field label="Invoice date" required>
            <Input
              type="date"
              value={form.invoice_date}
              onChange={(e) => set("invoice_date", e.target.value)}
              required
            />
          </Field>
          <Field label="Total amount (₹)" required>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.total_amount || ""}
              onChange={(e) => set("total_amount", Number(e.target.value || 0))}
              required
            />
          </Field>
        </QuickForm.QuickFill>

        <QuickForm.MoreDetails>
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
          <Field label="Due date">
            <Input
              type="date"
              value={form.due_date ?? ""}
              onChange={(e) => set("due_date", e.target.value || null)}
            />
          </Field>
          <Field label="Status">
            <Select
              value={form.status}
              onValueChange={(v) => set("status", v as PurchaseInvoiceCreateInput["status"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PURCHASE_INVOICE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Subtotal (₹)">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.subtotal || ""}
              onChange={(e) => set("subtotal", Number(e.target.value || 0))}
            />
          </Field>
          <Field label="Tax (₹)">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.tax_amount || ""}
              onChange={(e) => set("tax_amount", Number(e.target.value || 0))}
            />
          </Field>
          <Field label="Other charges (₹)">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.other_charges || ""}
              onChange={(e) => set("other_charges", Number(e.target.value || 0))}
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
          <Button type="button" variant="ghost" onClick={() => nav({ to: "/purchase-invoices" })}>
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

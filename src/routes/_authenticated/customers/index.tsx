import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, LoadingBlock } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { QuickForm } from "@/components/forms/QuickForm";
import { Field } from "@/components/forms/Field";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { createCustomer, listCustomers } from "@/lib/customers/api";
import { CUSTOMER_TYPES, customerCreateSchema, type CustomerCreateInput } from "@/lib/customers/schema";

export const Route = createFileRoute("/_authenticated/customers/")({
  ssr: false,
  component: CustomersPage,
});

function CustomersPage() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const query = useQuery({
    queryKey: qk.customers.list(q),
    queryFn: () => listCustomers(q),
  });

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Master list of everyone you sell to."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New customer
          </Button>
        }
      />

      <div className="mb-3 flex items-center gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, code, phone, city…"
          className="max-w-md"
        />
      </div>

      {query.isLoading ? (
        <LoadingBlock />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : (query.data ?? []).length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="No customers yet"
          message="Add your first customer — only name and mobile are required."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> New customer
            </Button>
          }
        />
      ) : (
        <div className="rounded-md border border-border bg-card shadow-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>City</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data!.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.customer_code}</TableCell>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {c.customer_type.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>{c.primary_phone ?? "—"}</TableCell>
                  <TableCell>{c.city ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateCustomerDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function CreateCustomerDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<CustomerCreateInput>({
    name: "",
    mobile: "",
    email: null,
    city: null,
    customer_type: "individual",
    whatsapp: null,
    billing_address: null,
    state: null,
    pincode: null,
    gst_number: null,
    notes: null,
  });

  const mutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: (row) => {
      toast.success(`Customer ${row.customer_code} created`);
      qc.invalidateQueries({ queryKey: qk.customers.all });
      qc.invalidateQueries({ queryKey: qk.dashboard });
      onOpenChange(false);
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = customerCreateSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues.map((i) => i.message).join(" • "));
      return;
    }
    mutation.mutate(parsed.data);
  }

  const set = <K extends keyof CustomerCreateInput>(k: K, v: CustomerCreateInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New customer</DialogTitle>
        </DialogHeader>
        <QuickForm onSubmit={onSubmit} busy={mutation.isPending}>
          <QuickForm.QuickFill>
            <Field label="Customer name" required htmlFor="cust-name">
              <Input id="cust-name" value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </Field>
            <Field label="Mobile" required htmlFor="cust-mobile" hint="10 digits, +91 optional">
              <Input id="cust-mobile" value={form.mobile} onChange={(e) => set("mobile", e.target.value)} required />
            </Field>
          </QuickForm.QuickFill>

          <QuickForm.MoreDetails>
            <Field label="Email" htmlFor="cust-email">
              <Input id="cust-email" type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label="City" htmlFor="cust-city">
              <Input id="cust-city" value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} />
            </Field>
            <Field label="Type">
              <Select value={form.customer_type} onValueChange={(v) => set("customer_type", v as CustomerCreateInput["customer_type"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CUSTOMER_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="WhatsApp" htmlFor="cust-wa">
              <Input id="cust-wa" value={form.whatsapp ?? ""} onChange={(e) => set("whatsapp", e.target.value)} />
            </Field>
          </QuickForm.MoreDetails>

          <QuickForm.Advanced>
            <Field label="Billing address" className="md:col-span-2">
              <Textarea rows={2} value={form.billing_address ?? ""} onChange={(e) => set("billing_address", e.target.value)} />
            </Field>
            <Field label="State"><Input value={form.state ?? ""} onChange={(e) => set("state", e.target.value)} /></Field>
            <Field label="Pincode"><Input value={form.pincode ?? ""} onChange={(e) => set("pincode", e.target.value)} /></Field>
            <Field label="GST number"><Input value={form.gst_number ?? ""} onChange={(e) => set("gst_number", e.target.value)} /></Field>
            <Field label="Notes" className="md:col-span-2">
              <Textarea rows={2} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
            </Field>
          </QuickForm.Advanced>

          <QuickForm.Actions>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create
            </Button>
          </QuickForm.Actions>
        </QuickForm>
      </DialogContent>
    </Dialog>
  );
}

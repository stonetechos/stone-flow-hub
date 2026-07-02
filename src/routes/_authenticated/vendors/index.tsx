import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, Factory, ExternalLink } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, LoadingBlock } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { QuickForm } from "@/components/forms/QuickForm";
import { Field } from "@/components/forms/Field";
import { RowActions } from "@/components/data/RowActions";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import {
  createVendor,
  deleteVendor,
  getPrimaryContact,
  listVendors,
  updateVendor,
  type VendorRow,
} from "@/lib/vendors/api";
import { vendorCreateSchema, type VendorCreateInput } from "@/lib/vendors/schema";

export const Route = createFileRoute("/_authenticated/vendors/")({
  ssr: false,
  component: VendorsPage,
});

function VendorsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<VendorRow | null>(null);
  const [toDelete, setToDelete] = useState<VendorRow | null>(null);

  const query = useQuery({ queryKey: qk.vendors.list(q), queryFn: () => listVendors(q) });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteVendor(id),
    onSuccess: () => {
      toast.success("Vendor deleted");
      qc.invalidateQueries({ queryKey: qk.vendors.all });
      setToDelete(null);
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  return (
    <div>
      <PageHeader
        title="Vendors"
        subtitle="Suppliers you send RFQs to."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> New vendor
          </Button>
        }
      />
      <div className="mb-3 flex items-center gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by company, code, city…"
          className="max-w-md"
        />
      </div>

      {query.isLoading ? (
        <LoadingBlock />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : (query.data ?? []).length === 0 ? (
        <EmptyState
          icon={<Factory className="h-6 w-6" />}
          title="No vendors yet"
          message="Add your first vendor to start sending RFQs."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> New vendor
            </Button>
          }
        />
      ) : (
        <div className="rounded-md border border-border bg-card shadow-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>City</TableHead>
                <TableHead>GST</TableHead>
                <TableHead>Payment terms</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data!.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono text-xs">
                    <Link
                      to="/vendors/$vendorId"
                      params={{ vendorId: v.id }}
                      className="hover:underline"
                    >
                      {v.vendor_code}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link
                      to="/vendors/$vendorId"
                      params={{ vendorId: v.id }}
                      className="hover:underline"
                    >
                      {v.company_name}
                    </Link>
                  </TableCell>
                  <TableCell>{v.city ?? "—"}</TableCell>
                  <TableCell>{v.gst_number ?? "—"}</TableCell>
                  <TableCell>{v.payment_terms ?? "—"}</TableCell>
                  <TableCell>
                    <RowActions
                      extra={
                        <DropdownMenuItem asChild>
                          <Link to="/vendors/$vendorId" params={{ vendorId: v.id }}>
                            <ExternalLink className="mr-2 h-4 w-4" /> Open
                          </Link>
                        </DropdownMenuItem>
                      }
                      onEdit={() => {
                        setEditing(v);
                        setFormOpen(true);
                      }}
                      onDelete={() => setToDelete(v)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <VendorFormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete vendor?"
        description={
          toDelete
            ? `${toDelete.company_name} (${toDelete.vendor_code}) will be permanently removed.`
            : ""
        }
        busy={delMut.isPending}
        onConfirm={() => toDelete && delMut.mutate(toDelete.id)}
      />
    </div>
  );
}

function emptyForm(): VendorCreateInput {
  return {
    company_name: "",
    contact_name: "",
    mobile: "",
    email: null,
    city: null,
    address: null,
    state: null,
    pincode: null,
    gst_number: null,
    payment_terms: null,
    notes: null,
  };
}

function VendorFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: VendorRow | null;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<VendorCreateInput>(emptyForm);

  // Load primary contact for edit mode
  const contactQuery = useQuery({
    queryKey: ["vendor", editing?.id, "primary-contact"],
    queryFn: () => getPrimaryContact(editing!.id),
    enabled: !!(open && editing),
  });

  useEffect(() => {
    if (!open) return;
    if (!editing) {
      setForm(emptyForm());
      return;
    }
    setForm({
      company_name: editing.company_name,
      contact_name: contactQuery.data?.name ?? "",
      mobile: contactQuery.data?.phone ?? "",
      email: contactQuery.data?.email ?? null,
      city: editing.city,
      address: editing.address,
      state: editing.state,
      pincode: editing.pincode,
      gst_number: editing.gst_number,
      payment_terms: editing.payment_terms,
      notes: editing.notes,
    });
  }, [open, editing, contactQuery.data]);

  const mutation = useMutation({
    mutationFn: (input: VendorCreateInput) =>
      editing ? updateVendor(editing.id, input) : createVendor(input),
    onSuccess: (row) => {
      toast.success(editing ? "Vendor updated" : `Vendor ${row.vendor_code} created`);
      qc.invalidateQueries({ queryKey: qk.vendors.all });
      onOpenChange(false);
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = vendorCreateSchema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues.map((i) => i.message).join(" • "));
    mutation.mutate(parsed.data);
  }
  const set = <K extends keyof VendorCreateInput>(k: K, v: VendorCreateInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${editing.company_name}` : "New vendor"}</DialogTitle>
        </DialogHeader>
        <QuickForm onSubmit={onSubmit} busy={mutation.isPending}>
          <QuickForm.QuickFill>
            <Field label="Vendor company" required>
              <Input
                value={form.company_name}
                onChange={(e) => set("company_name", e.target.value)}
                required
              />
            </Field>
            <Field label="Contact person" required>
              <Input
                value={form.contact_name}
                onChange={(e) => set("contact_name", e.target.value)}
                required
              />
            </Field>
            <Field label="Mobile" required>
              <Input value={form.mobile} onChange={(e) => set("mobile", e.target.value)} required />
            </Field>
            <Field label="City">
              <Input value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} />
            </Field>
          </QuickForm.QuickFill>

          <QuickForm.MoreDetails>
            <Field label="Email">
              <Input
                type="email"
                value={form.email ?? ""}
                onChange={(e) => set("email", e.target.value)}
              />
            </Field>
            <Field label="GST number">
              <Input
                value={form.gst_number ?? ""}
                onChange={(e) => set("gst_number", e.target.value)}
              />
            </Field>
            <Field label="Payment terms">
              <Input
                value={form.payment_terms ?? ""}
                onChange={(e) => set("payment_terms", e.target.value)}
              />
            </Field>
            <Field label="State">
              <Input value={form.state ?? ""} onChange={(e) => set("state", e.target.value)} />
            </Field>
          </QuickForm.MoreDetails>

          <QuickForm.Advanced>
            <Field label="Address" className="md:col-span-2">
              <Textarea
                rows={2}
                value={form.address ?? ""}
                onChange={(e) => set("address", e.target.value)}
              />
            </Field>
            <Field label="Pincode">
              <Input value={form.pincode ?? ""} onChange={(e) => set("pincode", e.target.value)} />
            </Field>
            <Field label="Notes" className="md:col-span-2">
              <Textarea
                rows={2}
                value={form.notes ?? ""}
                onChange={(e) => set("notes", e.target.value)}
              />
            </Field>
          </QuickForm.Advanced>

          <QuickForm.Actions>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Save" : "Create"}
            </Button>
          </QuickForm.Actions>
        </QuickForm>
      </DialogContent>
    </Dialog>
  );
}

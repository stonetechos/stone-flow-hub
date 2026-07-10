import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, Users, ExternalLink } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { QuickForm } from "@/components/forms/QuickForm";
import { Field } from "@/components/forms/Field";
import { RowActions } from "@/components/data/RowActions";
import { SafeDeleteDialog } from "@/components/mdm/SafeDeleteDialog";
import { LifecycleMenuItems } from "@/components/mdm/LifecycleMenu";
import { LifecycleBadge } from "@/components/mdm/LifecycleBadge";
import { DataToolbar } from "@/components/data/DataToolbar";
import { DataTableShell } from "@/components/data/DataTableShell";
import { TablePagination } from "@/components/data/Pagination";
import { ColumnsMenu, type ColumnDef } from "@/components/data/ColumnsMenu";
import { DensityMenu } from "@/components/data/DensityMenu";
import { useTablePrefs } from "@/hooks/use-table-prefs";
import type { LifecycleStatus } from "@/lib/mdm/lifecycle";
import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { qk } from "@/lib/query-keys";
import { invalidateCustomer, seedPickerCache } from "@/lib/query-invalidation";
import { toUserMessage } from "@/lib/errors";
import {
  createCustomer,
  deleteCustomer,
  listCustomers,
  updateCustomer,
  type CustomerRow,
} from "@/lib/customers/api";
import {
  CUSTOMER_TYPES,
  customerCreateSchema,
  type CustomerCreateInput,
} from "@/lib/customers/schema";

export const Route = createFileRoute("/_authenticated/customers/")({
  ssr: false,
  component: CustomersPage,
  validateSearch: (s: Record<string, unknown>): { edit?: string } =>
    typeof s.edit === "string" ? { edit: s.edit } : {},
});

function CustomersPage() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const { edit } = Route.useSearch();
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 250);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerRow | null>(null);
  const [toDelete, setToDelete] = useState<CustomerRow | null>(null);

  const query = useQuery({ queryKey: qk.customers.list(dq), queryFn: () => listCustomers(dq) });

  useEffect(() => {
    if (!edit) return;
    const row = (query.data ?? []).find((r) => r.id === edit);
    if (row) {
      setEditing(row);
      setFormOpen(true);
      nav({ to: "/customers", search: {}, replace: true });
    }
  }, [edit, query.data, nav]);

  const delMut = useMutation({
    mutationFn: (id: string) => deleteCustomer(id),
    onSuccess: () => {
      toast.success("Customer deleted");
      invalidateCustomer(qc);
      setToDelete(null);
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Master list of everyone you sell to."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
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
        <SkeletonTable rows={6} columns={6} />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : (query.data ?? []).length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="No customers yet"
          message="Add your first customer — only name and mobile are required."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
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
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data!.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">
                    <Link
                      to="/customers/$customerId"
                      params={{ customerId: c.id }}
                      className="hover:underline"
                    >
                      {c.customer_code}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Link
                        to="/customers/$customerId"
                        params={{ customerId: c.id }}
                        className="hover:underline"
                      >
                        {c.name}
                      </Link>
                      <LifecycleBadge
                        status={
                          (c as unknown as { lifecycle_status?: LifecycleStatus })
                            .lifecycle_status
                        }
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {c.customer_type.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>{c.primary_phone ?? "—"}</TableCell>
                  <TableCell>{c.city ?? "—"}</TableCell>
                  <TableCell>
                    <RowActions
                      extra={
                        <>
                          <DropdownMenuItem asChild>
                            <Link to="/customers/$customerId" params={{ customerId: c.id }}>
                              <ExternalLink className="mr-2 h-4 w-4" /> Open
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <LifecycleMenuItems
                            entityType="customer"
                            entityId={c.id}
                            currentStatus={
                              ((c as unknown as { lifecycle_status?: LifecycleStatus })
                                .lifecycle_status ??
                                (c.is_active ? "active" : "inactive")) as LifecycleStatus
                            }
                            allowPurge={false}
                          />
                        </>
                      }
                      onEdit={() => {
                        setEditing(c);
                        setFormOpen(true);
                      }}
                      onDelete={() => setToDelete(c)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CustomerFormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} />
      <SafeDeleteDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        entityType="customer"
        entityId={toDelete?.id ?? null}
        entityLabel={
          toDelete ? `${toDelete.name} (${toDelete.customer_code})` : ""
        }
        busy={delMut.isPending}
        onConfirmDelete={() => toDelete && delMut.mutate(toDelete.id)}
      />
    </div>
  );
}

function emptyForm(): CustomerCreateInput {
  return {
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
  };
}

function fromRow(c: CustomerRow): CustomerCreateInput {
  return {
    name: c.name,
    mobile: c.primary_phone ?? "",
    email: c.primary_email,
    city: c.city,
    customer_type: c.customer_type,
    whatsapp: c.whatsapp,
    billing_address: c.billing_address,
    state: c.state,
    pincode: c.pincode,
    gst_number: c.gst_number,
    notes: c.notes,
  };
}

function CustomerFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: CustomerRow | null;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<CustomerCreateInput>(emptyForm);

  useEffect(() => {
    if (open) setForm(editing ? fromRow(editing) : emptyForm());
  }, [open, editing]);

  const mutation = useMutation({
    mutationFn: (input: CustomerCreateInput) =>
      editing ? updateCustomer(editing.id, input) : createCustomer(input),
    onSuccess: (row) => {
      toast.success(editing ? "Customer updated" : `Customer ${row.customer_code} created`);
      if (!editing) seedPickerCache(qc, "customer", row);
      invalidateCustomer(qc, row.id);
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
          <DialogTitle>{editing ? `Edit ${editing.name}` : "New customer"}</DialogTitle>
        </DialogHeader>
        <QuickForm onSubmit={onSubmit} busy={mutation.isPending}>
          <QuickForm.QuickFill>
            <Field label="Customer name" required>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </Field>
            <Field label="Mobile" required hint="10 digits, +91 optional">
              <Input value={form.mobile} onChange={(e) => set("mobile", e.target.value)} required />
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
            <Field label="City">
              <Input value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} />
            </Field>
            <Field label="Type">
              <Select
                value={form.customer_type}
                onValueChange={(v) =>
                  set("customer_type", v as CustomerCreateInput["customer_type"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOMER_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="WhatsApp">
              <Input
                value={form.whatsapp ?? ""}
                onChange={(e) => set("whatsapp", e.target.value)}
              />
            </Field>
          </QuickForm.MoreDetails>

          <QuickForm.Advanced>
            <Field label="Billing address" className="md:col-span-2">
              <Textarea
                rows={2}
                value={form.billing_address ?? ""}
                onChange={(e) => set("billing_address", e.target.value)}
              />
            </Field>
            <Field label="State">
              <Input value={form.state ?? ""} onChange={(e) => set("state", e.target.value)} />
            </Field>
            <Field label="Pincode">
              <Input value={form.pincode ?? ""} onChange={(e) => set("pincode", e.target.value)} />
            </Field>
            <Field label="GST number">
              <Input
                value={form.gst_number ?? ""}
                onChange={(e) => set("gst_number", e.target.value)}
              />
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

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, Users, ExternalLink } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PhoneInput,
  EmailInput,
  PincodeInput,
  GstInput,
} from "@/components/forms/inputs/SmartInputs";
import { confirmCloseIfDirty } from "@/hooks/use-unsaved-changes";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { QuickForm } from "@/components/forms/QuickForm";
import { Field } from "@/components/forms/Field";
import { RowActions } from "@/components/data/RowActions";
import { SafeDeleteDialog } from "@/components/mdm/SafeDeleteDialog";
import { LifecycleMenuItems } from "@/components/mdm/LifecycleMenu";
import { DataToolbar } from "@/components/data/DataToolbar";
import { DataTableShell } from "@/components/data/DataTableShell";
import { TablePagination } from "@/components/data/Pagination";
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
  SPACE_TYPES,
  MATERIAL_OPTIONS,
  customerCreateSchema,
  type CustomerCreateInput,
} from "@/lib/customers/schema";
import type { DbEnum } from "@/lib/types";

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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { prefs, setDensity } = useTablePrefs("customers");

  const query = useQuery({ queryKey: qk.customers.list(dq), queryFn: () => listCustomers(dq) });

  useEffect(() => {
    setPage(1);
  }, [dq]);

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

  const rows = query.data ?? [];
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <div>
      <PageHeader title="Customers" subtitle="Master list of everyone you sell to." />

      <DataToolbar
        count={rows.length}
        search={q}
        onSearchChange={setQ}
        searchPlaceholder="Search by name, phone, city…"
        density={<DensityMenu density={prefs.density} onChange={setDensity} />}
        action={
          <Button size="sm" className="h-8" onClick={openCreate}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> New customer
          </Button>
        }
      />

      {query.isLoading ? (
        <SkeletonTable rows={6} columns={2} />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="No customers yet"
          message="Add your first customer — only name and mobile are required."
          action={
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> New customer
            </Button>
          }
        />
      ) : (
        <DataTableShell
          density={prefs.density}
          footer={
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={rows.length}
              onPageChange={setPage}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
            />
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Sr. No.</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((c, i) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    <Link
                      to="/customers/$customerId"
                      params={{ customerId: c.id }}
                      className="hover:underline"
                    >
                      {(page - 1) * pageSize + i + 1}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link
                      to="/customers/$customerId"
                      params={{ customerId: c.id }}
                      className="hover:underline"
                    >
                      {c.name}
                    </Link>
                  </TableCell>
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
        </DataTableShell>
      )}

      <CustomerFormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} />
      <SafeDeleteDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        entityType="customer"
        entityId={toDelete?.id ?? null}
        entityLabel={toDelete ? toDelete.name : ""}
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
    customer_type: "walk_in",
    referred_by: null,
    site_address: null,
    space_type: null,
    material_interests: [],
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
    customer_type: c.customer_type as CustomerCreateInput["customer_type"],
    referred_by: c.referred_by,
    site_address: c.site_address,
    space_type: c.space_type as CustomerCreateInput["space_type"],
    material_interests: (c.material_interests ?? []) as CustomerCreateInput["material_interests"],
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
  const [baseline, setBaseline] = useState<string>(() => JSON.stringify(emptyForm()));
  const dirty = JSON.stringify(form) !== baseline;

  useEffect(() => {
    if (!open) return;
    const next = editing ? fromRow(editing) : emptyForm();
    setForm(next);
    setBaseline(JSON.stringify(next));
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

  const toggleMaterial = (value: DbEnum<"material_interest">, checked: boolean) =>
    setForm((f) => {
      const current = f.material_interests ?? [];
      const next = checked ? [...current, value] : current.filter((v) => v !== value);
      return { ...f, material_interests: next };
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && mutation.isPending) return;
        if (confirmCloseIfDirty(o, dirty)) onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${editing.name}` : "New customer"}</DialogTitle>
        </DialogHeader>
        <QuickForm onSubmit={onSubmit} busy={mutation.isPending} dirty={dirty}>
          <QuickForm.QuickFill>
            <Field label="Name" required>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </Field>
            <Field label="Type of Customer" required>
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

            {form.customer_type === "reference" && (
              <Field label="Referred by" required className="md:col-span-2">
                <Input
                  value={form.referred_by ?? ""}
                  onChange={(e) => set("referred_by", e.target.value)}
                  placeholder="Name of the person who referred them"
                />
              </Field>
            )}

            <Field label="Phone Number" required hint="10 digits, +91 optional">
              <PhoneInput value={form.mobile} onChange={(v) => set("mobile", v)} required />
            </Field>
            <Field label="Site's Area/Address">
              <Input
                value={form.site_address ?? ""}
                onChange={(e) => set("site_address", e.target.value)}
              />
            </Field>

            <Field label="Type of space" className="md:col-span-2">
              <Select
                value={form.space_type ?? undefined}
                onValueChange={(v) => set("space_type", v as CustomerCreateInput["space_type"])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {SPACE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Product of Interest" hint="Select all that apply" className="md:col-span-2">
              <div className="grid max-h-48 grid-cols-1 gap-x-4 gap-y-2 overflow-y-auto rounded-md border border-border p-3 sm:grid-cols-2">
                {MATERIAL_OPTIONS.map((m) => {
                  const checked = (form.material_interests ?? []).includes(m.value);
                  return (
                    <label
                      key={m.value}
                      className="flex items-center gap-2 text-sm text-foreground"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => toggleMaterial(m.value, v === true)}
                      />
                      {m.label}
                    </label>
                  );
                })}
              </div>
            </Field>

            <Field label="Notes" className="md:col-span-2">
              <Textarea
                rows={2}
                value={form.notes ?? ""}
                onChange={(e) => set("notes", e.target.value)}
              />
            </Field>
          </QuickForm.QuickFill>

          <QuickForm.MoreDetails>
            <Field label="Email">
              <EmailInput value={form.email ?? ""} onChange={(v) => set("email", v)} />
            </Field>
            <Field label="City">
              <Input value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} />
            </Field>
            <Field label="WhatsApp">
              <PhoneInput value={form.whatsapp ?? ""} onChange={(v) => set("whatsapp", v)} />
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
              <PincodeInput value={form.pincode ?? ""} onChange={(v) => set("pincode", v)} />
            </Field>
            <Field label="GST number">
              <GstInput value={form.gst_number ?? ""} onChange={(v) => set("gst_number", v)} />
            </Field>
          </QuickForm.Advanced>

          <QuickForm.Actions>
            <Button
              type="button"
              variant="ghost"
              disabled={mutation.isPending}
              onClick={() => confirmCloseIfDirty(false, dirty) && onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </QuickForm.Actions>
        </QuickForm>
      </DialogContent>
    </Dialog>
  );
}

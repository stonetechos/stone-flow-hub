import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, Factory, ExternalLink } from "lucide-react";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { QuickForm } from "@/components/forms/QuickForm";
import { Field } from "@/components/forms/Field";
import { RowActions } from "@/components/data/RowActions";
import { SafeDeleteDialog } from "@/components/mdm/SafeDeleteDialog";
import { LifecycleBadge } from "@/components/mdm/LifecycleBadge";
import { LifecycleMenuItems } from "@/components/mdm/LifecycleMenu";
import { DataToolbar } from "@/components/data/DataToolbar";
import { DataTableShell } from "@/components/data/DataTableShell";
import { TablePagination } from "@/components/data/Pagination";
import { ColumnsMenu, type ColumnDef } from "@/components/data/ColumnsMenu";
import { DensityMenu } from "@/components/data/DensityMenu";
import { useTablePrefs } from "@/hooks/use-table-prefs";
import type { LifecycleStatus } from "@/lib/mdm/lifecycle";
import { qk } from "@/lib/query-keys";
import { invalidateVendor, seedPickerCache } from "@/lib/query-invalidation";
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
  validateSearch: (s: Record<string, unknown>): { edit?: string } =>
    typeof s.edit === "string" ? { edit: s.edit } : {},
});

function VendorsPage() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const { edit } = Route.useSearch();
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 250);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<VendorRow | null>(null);
  const [toDelete, setToDelete] = useState<VendorRow | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { prefs, setDensity, toggleColumn, isHidden } = useTablePrefs("vendors");

  const columnDefs: ColumnDef[] = useMemo(
    () => [
      { key: "code", label: "Code", required: true },
      { key: "company", label: "Company", required: true },
      { key: "city", label: "City" },
      { key: "gst", label: "GST" },
      { key: "terms", label: "Payment terms" },
      { key: "status", label: "Status" },
    ],
    [],
  );

  const query = useQuery({ queryKey: qk.vendors.list(dq), queryFn: () => listVendors(dq) });
  useEffect(() => setPage(1), [dq]);

  useEffect(() => {
    if (!edit) return;
    const row = (query.data ?? []).find((r) => r.id === edit);
    if (row) {
      setEditing(row);
      setFormOpen(true);
      nav({ to: "/vendors", search: {}, replace: true });
    }
  }, [edit, query.data, nav]);

  const delMut = useMutation({
    mutationFn: (id: string) => deleteVendor(id),
    onSuccess: () => {
      toast.success("Vendor deleted");
      invalidateVendor(qc);
      setToDelete(null);
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const rows = query.data ?? [];
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const openCreate = () => { setEditing(null); setFormOpen(true); };

  return (
    <div>
      <PageHeader title="Vendors" subtitle="Suppliers you send RFQs to." />

      <DataToolbar
        count={rows.length}
        search={q}
        onSearchChange={setQ}
        searchPlaceholder="Search by company, code, city…"
        columns={<ColumnsMenu columns={columnDefs} isHidden={isHidden} onToggle={toggleColumn} />}
        density={<DensityMenu density={prefs.density} onChange={setDensity} />}
        action={
          <Button size="sm" className="h-8" onClick={openCreate}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> New vendor
          </Button>
        }
      />

      {query.isLoading ? (
        <SkeletonTable rows={6} columns={6} />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Factory className="h-6 w-6" />}
          title="No vendors yet"
          message="Add your first vendor to start sending RFQs."
          action={
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> New vendor
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
              onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
            />
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                {!isHidden("code") && <TableHead>Code</TableHead>}
                {!isHidden("company") && <TableHead>Company</TableHead>}
                {!isHidden("city") && <TableHead>City</TableHead>}
                {!isHidden("gst") && <TableHead>GST</TableHead>}
                {!isHidden("terms") && <TableHead>Payment terms</TableHead>}
                {!isHidden("status") && <TableHead>Status</TableHead>}
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((v) => {
                const status = ((v as unknown as { lifecycle_status?: LifecycleStatus })
                  .lifecycle_status ?? (v.is_active ? "active" : "inactive")) as LifecycleStatus;
                return (
                  <TableRow key={v.id}>
                    {!isHidden("code") && (
                      <TableCell className="font-mono text-xs">
                        <Link to="/vendors/$vendorId" params={{ vendorId: v.id }} className="hover:underline">
                          {v.vendor_code}
                        </Link>
                      </TableCell>
                    )}
                    {!isHidden("company") && (
                      <TableCell className="font-medium">
                        <Link to="/vendors/$vendorId" params={{ vendorId: v.id }} className="hover:underline">
                          {v.company_name}
                        </Link>
                      </TableCell>
                    )}
                    {!isHidden("city") && <TableCell>{v.city ?? "—"}</TableCell>}
                    {!isHidden("gst") && <TableCell>{v.gst_number ?? "—"}</TableCell>}
                    {!isHidden("terms") && <TableCell>{v.payment_terms ?? "—"}</TableCell>}
                    {!isHidden("status") && <TableCell><LifecycleBadge status={status} /></TableCell>}
                    <TableCell>
                      <RowActions
                        extra={
                          <>
                            <DropdownMenuItem asChild>
                              <Link to="/vendors/$vendorId" params={{ vendorId: v.id }}>
                                <ExternalLink className="mr-2 h-4 w-4" /> Open
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <LifecycleMenuItems entityType="vendor" entityId={v.id} currentStatus={status} />
                          </>
                        }
                        onEdit={() => { setEditing(v); setFormOpen(true); }}
                        onDelete={() => setToDelete(v)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DataTableShell>
      )}

      <VendorFormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} />
      <SafeDeleteDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        entityType="vendor"
        entityId={toDelete?.id ?? null}
        entityLabel={toDelete ? `${toDelete.company_name} (${toDelete.vendor_code})` : ""}
        busy={delMut.isPending}
        onConfirmDelete={() => toDelete && delMut.mutate(toDelete.id)}
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
      if (!editing) seedPickerCache(qc, "vendor", row);
      invalidateVendor(qc, row.id);
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

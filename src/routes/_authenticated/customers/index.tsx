import { useTranslation } from "react-i18next";
import { dispatchSystemNotification } from "@/lib/notifications/systemNotifications.functions";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, Users, ExternalLink, Phone, MessageSquare } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

import { toast } from "sonner";
import { CustomerResponseStatusSelect } from "@/components/customers/CustomerResponseStatusSelect";
import {
  CUSTOMER_RESPONSE_STATUS_CONFIG,
  getCustomerResponseStatus,
  type CustomerResponseStatus,
} from "@/lib/customers/crm-status";
import { cn } from "@/lib/utils";
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
  getCustomerTypeLabel,
  getCustomerTypeBadgeTone,
  type CustomerCreateInput,
} from "@/lib/customers/schema";
import { hydrateMaterialInterests } from "@/lib/customers/material-interests";
import type { DbEnum } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/customers/")({
  ssr: false,
  component: CustomersPage,
  validateSearch: (s: Record<string, unknown>): { edit?: string } =>
    typeof s.edit === "string" ? { edit: s.edit } : {},
});

function CustomersPage() {
  const { t } = useTranslation();
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
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { prefs, setDensity } = useTablePrefs("customers");

  const query = useQuery({
    queryKey: qk.customers.list(dq),
    queryFn: () => listCustomers(dq),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    import("@/integrations/supabase/client").then(({ supabase }) => {
      const sub = supabase
        .channel("public:customers:list")
        .on("postgres_changes", { event: "*", schema: "public", table: "customers" }, () => {
          void qc.invalidateQueries({ queryKey: qk.customers.all });
        })
        .subscribe();
      return () => {
        supabase.removeChannel(sub);
      };
    });
  }, [qc]);

  useEffect(() => {
    setPage(1);
  }, [dq, statusFilter, typeFilter]);

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

  const rows = useMemo(() => {
    let list = query.data ?? [];
    if (statusFilter !== "all") {
      list = list.filter((c) => getCustomerResponseStatus(c) === statusFilter);
    }
    if (typeFilter !== "all") {
      list = list.filter((c) => c.customer_type === typeFilter);
    }
    return list;
  }, [query.data, statusFilter, typeFilter]);
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <div>
      <PageHeader
        title={t("customers.title", "Customers")}
        subtitle={t("customers.subtitle", "Master list of everyone you sell to.")}
      />

      <DataToolbar
        count={rows.length}
        search={q}
        onSearchChange={setQ}
        searchPlaceholder={t("customers.searchPlaceholder", "Search by name, phone, city…")}
        filters={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-40 text-xs bg-white">
                <SelectValue placeholder="Response status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {(Object.keys(CUSTOMER_RESPONSE_STATUS_CONFIG) as CustomerResponseStatus[]).map(
                  (key) => {
                    const cfg = CUSTOMER_RESPONSE_STATUS_CONFIG[key];
                    return (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-1.5">
                          <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", cfg.dotColor)} />
                          <span>{cfg.shortLabel}</span>
                        </span>
                      </SelectItem>
                    );
                  },
                )}
              </SelectContent>
            </Select>

            <Select
              value={typeFilter}
              onValueChange={(v) => {
                setTypeFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-36 text-xs bg-white">
                <SelectValue placeholder="All customer types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All customer types</SelectItem>
                {CUSTOMER_TYPES.map((tItem) => (
                  <SelectItem key={tItem.value} value={tItem.value}>
                    {tItem.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
        density={<DensityMenu density={prefs.density} onChange={setDensity} />}
        action={
          <Button size="sm" className="h-8" onClick={openCreate}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> {t("customers.newCustomer", "New customer")}
          </Button>
        }
      />

      {query.isLoading ? (
        <SkeletonTable rows={6} columns={5} />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="No customers yet"
          message="Add your first customer — only name and mobile are required."
          action={
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> {t("customers.newCustomer", "New customer")}
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
                <TableHead className="w-16">{t("common.srNo", "Sr. No.")}</TableHead>
                <TableHead>{t("common.name", "Name")}</TableHead>
                <TableHead className="w-40">Customer Type</TableHead>
                <TableHead className="w-52">CRM · Response Status</TableHead>
                <TableHead className="w-48">Contact</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((c, i) => {
                const phone =
                  c.primary_phone || (c as unknown as { mobile?: string | null }).mobile || "";
                const cleanPhone = phone.replace(/[^0-9]/g, "");
                return (
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
                        className="hover:underline flex flex-col gap-0.5"
                      >
                        <span>{c.name}</span>
                        {(() => {
                          const rowAny = c as unknown as {
                            company_name?: string | null;
                            contact_person?: string | null;
                          };
                          const badges = [
                            rowAny.company_name ? `Firm: ${rowAny.company_name}` : null,
                            rowAny.contact_person ? `Contact: ${rowAny.contact_person}` : null,
                            c.customer_code,
                          ].filter(Boolean);
                          return badges.length > 0 ? (
                            <span className="font-mono text-xs font-normal text-muted-foreground">
                              {badges.join(" · ")}
                            </span>
                          ) : null;
                        })()}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-wide whitespace-nowrap",
                          getCustomerTypeBadgeTone(c.customer_type),
                        )}
                      >
                        {getCustomerTypeLabel(c.customer_type)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <CustomerResponseStatusSelect
                        customerId={c.id}
                        customerName={c.name}
                        isActive={c.is_active}
                        workflowState={c.workflow_state}
                        externalRef={c.external_ref}
                      />
                    </TableCell>
                    <TableCell>
                      {phone ? (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <a
                            href={`tel:${phone}`}
                            title={`Call ${phone}`}
                            className="inline-flex items-center gap-1 text-slate-700 hover:text-primary font-mono transition-colors"
                          >
                            <Phone className="h-3 w-3 text-emerald-600" />
                            <span>{phone}</span>
                          </a>
                          {cleanPhone && (
                            <a
                              href={`https://wa.me/${cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Chat on WhatsApp"
                              className="p-1 rounded hover:bg-emerald-50 text-emerald-600 transition-colors"
                            >
                              <MessageSquare className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No phone</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <RowActions
                        extra={
                          <>
                            <DropdownMenuItem asChild>
                              <Link to="/customers/$customerId" params={{ customerId: c.id }}>
                                <ExternalLink className="mr-2 h-4 w-4" /> {t("common.open", "Open")}
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
                );
              })}
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
    contact_person: null,
    company_name: null,
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
  const rowAny = c as unknown as { contact_person?: string | null; company_name?: string | null };
  return {
    name: c.name,
    contact_person: rowAny.contact_person ?? null,
    company_name: rowAny.company_name ?? null,
    mobile: c.primary_phone ?? "",
    email: c.primary_email,
    city: c.city,
    customer_type: c.customer_type as CustomerCreateInput["customer_type"],
    referred_by: c.referred_by,
    site_address: c.site_address,
    space_type: c.space_type as CustomerCreateInput["space_type"],
    material_interests: hydrateMaterialInterests(
      c.material_interests as CustomerCreateInput["material_interests"],
      c.notes,
    ),
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
  const { t } = useTranslation();
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
      if (!editing) {
        seedPickerCache(qc, "customer", row);
        void dispatchSystemNotification({
          scope: "broadcast",
          tier: "info",
          title: "New Customer Added",
          body: `A new customer entry has been made: ${row.name} (${row.customer_code})`,
          entityType: "customer",
          entityId: row.id,
          linkPath: `/customers/${row.id}`,
        });
      }
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
          <DialogTitle>
            {editing ? `Edit ${editing.name}` : t("customers.newCustomer", "New customer")}
          </DialogTitle>
        </DialogHeader>
        <QuickForm onSubmit={onSubmit} busy={mutation.isPending} dirty={dirty}>
          <QuickForm.QuickFill>
            <Field label={t("common.name", "Name")} required>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Ramesh Patel or ABC Enterprises"
                required
              />
            </Field>
            <Field
              label={t("customers.contactPerson", "Contact Person's Name")}
              hint={t("customers.contactPersonHint", "Key person or representative")}
            >
              <Input
                value={form.contact_person ?? ""}
                onChange={(e) => set("contact_person", e.target.value)}
                placeholder="e.g. Ramesh Patel"
              />
            </Field>
            <Field
              label={t("customers.companyName", "Firm / Company Name")}
              hint={t("customers.companyNameHint", "Business or enterprise name")}
            >
              <Input
                value={form.company_name ?? ""}
                onChange={(e) => set("company_name", e.target.value)}
                placeholder="e.g. ABC Developers LLP"
              />
            </Field>
            <Field label={t("customers.customerType", "Type of Customer")} required>
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
                  {CUSTOMER_TYPES.map((tItem) => (
                    <SelectItem key={tItem.value} value={tItem.value}>
                      {t(`customer.type.${tItem.value}`, t(tItem.label, tItem.label))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {form.customer_type === "reference" && (
              <Field
                label={t("customers.referredBy", "Referred by")}
                required
                className="md:col-span-2"
              >
                <Input
                  value={form.referred_by ?? ""}
                  onChange={(e) => set("referred_by", e.target.value)}
                  placeholder={t(
                    "customers.referredByPlaceholder",
                    "Name of the person who referred them",
                  )}
                />
              </Field>
            )}

            <Field
              label={t("customers.phoneNumber", "Phone Number")}
              hint={t("customers.phoneHint", "10 digits, +91 optional")}
            >
              <PhoneInput
                value={form.mobile ?? ""}
                onChange={(v) => {
                  set("mobile", v);
                  // If whatsapp is currently matching or unset, keep it synced
                  if (!form.whatsapp || form.whatsapp === form.mobile) {
                    set("whatsapp", v);
                  }
                }}
              />
            </Field>
            <Field
              label={t("customers.whatsapp", "WhatsApp")}
              hint={
                form.mobile
                  ? t("customers.whatsappHintMobile", "Dropdown defaults to Phone Number")
                  : t("customers.whatsappHintDigits", "10 digits")
              }
            >
              <div className="space-y-1.5">
                {form.mobile ? (
                  <Select
                    value={
                      form.whatsapp === form.mobile
                        ? "same_as_phone"
                        : form.whatsapp
                          ? "custom"
                          : "same_as_phone"
                    }
                    onValueChange={(val) => {
                      if (val === "same_as_phone") {
                        set("whatsapp", form.mobile);
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs bg-muted/30">
                      <SelectValue
                        placeholder={t("customers.selectWhatsapp", "Select WhatsApp...")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="same_as_phone">
                        {t("customers.sameAsPhone", "Same as Phone")} ({form.mobile})
                      </SelectItem>
                      <SelectItem value="custom">
                        {t("customers.differentNumber", "Enter Different Number")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : null}
                <PhoneInput
                  value={form.whatsapp ?? ""}
                  onChange={(v) => set("whatsapp", v)}
                  placeholder={t("customers.whatsappNumber", "WhatsApp number")}
                />
              </div>
            </Field>
            <Field
              label={t("customers.siteAddress", "Site's Area/Address")}
              className="md:col-span-2"
            >
              <Input
                value={form.site_address ?? ""}
                onChange={(e) => set("site_address", e.target.value)}
              />
            </Field>

            <Field label={t("customers.spaceType", "Type of space")} className="md:col-span-2">
              <Select
                value={form.space_type ?? undefined}
                onValueChange={(v) => set("space_type", v as CustomerCreateInput["space_type"])}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("common.select", "Select…")} />
                </SelectTrigger>
                <SelectContent>
                  {SPACE_TYPES.map((sItem) => (
                    <SelectItem key={sItem.value} value={sItem.value}>
                      {t(`space.${sItem.value}`, t(sItem.label, sItem.label))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field
              label={t("customers.materialsOfInterest", "Product of Interest")}
              hint={t("common.selectAllThatApply", "Select all that apply")}
              className="md:col-span-2"
            >
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
                      {t(`materials.${m.value}`, t(m.label, m.label))}
                    </label>
                  );
                })}
              </div>
            </Field>

            <Field label={t("common.notes", "Notes")} className="md:col-span-2">
              <Textarea
                rows={2}
                value={form.notes ?? ""}
                onChange={(e) => set("notes", e.target.value)}
              />
            </Field>
          </QuickForm.QuickFill>

          <QuickForm.MoreDetails>
            <Field label={t("common.email", "Email")}>
              <EmailInput value={form.email ?? ""} onChange={(v) => set("email", v)} />
            </Field>
            <Field label={t("common.city", "City")}>
              <Input value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} />
            </Field>
          </QuickForm.MoreDetails>

          <QuickForm.Advanced>
            <Field
              label={t("customers.billingAddress", "Billing address")}
              className="md:col-span-2"
            >
              <Textarea
                rows={2}
                value={form.billing_address ?? ""}
                onChange={(e) => set("billing_address", e.target.value)}
              />
            </Field>
            <Field label={t("common.state", "State")}>
              <Input value={form.state ?? ""} onChange={(e) => set("state", e.target.value)} />
            </Field>
            <Field label={t("common.pincode", "Pincode")}>
              <PincodeInput value={form.pincode ?? ""} onChange={(v) => set("pincode", v)} />
            </Field>
            <Field label={t("customers.gstNumber", "GST number")}>
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
              {t("common.cancel", "Cancel")}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("common.save", "Save")}
            </Button>
          </QuickForm.Actions>
        </QuickForm>
      </DialogContent>
    </Dialog>
  );
}

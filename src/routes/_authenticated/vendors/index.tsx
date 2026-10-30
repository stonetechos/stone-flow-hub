import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Loader2,
  Factory,
  ExternalLink,
  Check,
  Sparkles,
  Users2,
  Table as TableIcon,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

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
  extractVendorMetadata,
  getVendorPhone,
  getVendorContactName,
  type VendorRow,
} from "@/lib/vendors/api";
import {
  vendorCreateSchema,
  VENDOR_WORK_TYPES,
  VENDOR_PRODUCT_OPTIONS,
  type VendorCreateInput,
} from "@/lib/vendors/schema";
import {
  PARTNER_CATEGORIES,
  detectVendorPartnerCategory,
  listWorkAndSupplyDirectory,
  type AssociatedPartnerCategory,
} from "@/lib/partners/directory";
import { WorkAndSupplyDirectoryView } from "@/components/partners/WorkAndSupplyDirectoryView";

export const Route = createFileRoute("/_authenticated/vendors/")({
  ssr: false,
  component: VendorsPage,
  validateSearch: (
    s: Record<string, unknown>,
  ): {
    edit?: string;
    create?: boolean;
    view?: "directory" | "table";
    category?: string;
  } => ({
    edit: typeof s.edit === "string" ? s.edit : undefined,
    create: s.create === true || s.create === "true" ? true : undefined,
    view: s.view === "directory" || s.view === "table" ? s.view : undefined,
    category: typeof s.category === "string" ? s.category : undefined,
  }),
});

function VendorsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const nav = useNavigate();
  const { edit, create, view, category } = Route.useSearch();
  const activeView = view === "table" ? "table" : "directory";

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
      { key: "code", label: t("vendors.columns.code", "Code"), required: true },
      { key: "category", label: t("vendors.columns.category", "Category") },
      { key: "company", label: t("vendors.columns.company", "Company / Partner"), required: true },
      { key: "phone", label: t("common.phone", "Phone") },
      { key: "contact", label: t("common.contactPerson", "Contact Person") },
      { key: "city", label: t("vendors.columns.city", "City") },
      { key: "gst", label: t("vendors.columns.gst", "GST") },
      { key: "terms", label: t("vendors.columns.terms", "Payment terms") },
      { key: "status", label: t("common.status", "Status") },
    ],
    [t],
  );

  // Table view query (vendors only)
  const vendorsQuery = useQuery({
    queryKey: qk.vendors.list(dq),
    queryFn: () => listVendors(dq),
  });

  // Directory view query (all associated people across suppliers, artwork, installation, chemicals, transport)
  const directoryQuery = useQuery({
    queryKey: ["work-and-supply-directory", dq],
    queryFn: () => listWorkAndSupplyDirectory(dq),
  });

  useEffect(() => setPage(1), [dq]);

  useEffect(() => {
    if (!edit) return;
    const row = (vendorsQuery.data ?? []).find((r) => r.id === edit);
    if (row) {
      setEditing(row);
      setFormOpen(true);
      nav({ to: "/vendors", search: { view: activeView }, replace: true });
    }
  }, [edit, vendorsQuery.data, nav, activeView]);

  useEffect(() => {
    if (create) {
      setEditing(null);
      setFormOpen(true);
      nav({ to: "/vendors", search: { view: activeView }, replace: true });
    }
  }, [create, nav, activeView]);

  const delMut = useMutation({
    mutationFn: (id: string) => deleteVendor(id),
    onSuccess: () => {
      toast.success("Partner removed");
      invalidateVendor(qc);
      qc.invalidateQueries({ queryKey: ["work-and-supply-directory"] });
      setToDelete(null);
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const rows = vendorsQuery.data ?? [];
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Top Header & View Switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title={
            activeView === "directory"
              ? t("vendors.directoryTitle", "Work & Supply Directory")
              : t("vendors.title", "Supplying Partners")
          }
          subtitle={
            activeView === "directory"
              ? t(
                  "vendors.directorySubtitle",
                  "Unified directory of people and partners associated with Stone Tech for work and supply.",
                )
              : t(
                  "vendors.subtitle",
                  "Our quarry, processing, fabrication, and material supplying partners.",
                )
          }
        />

        {/* View Mode Switcher Pills */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center rounded-lg border border-border/80 bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => nav({ to: "/vendors", search: { view: "directory" } })}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                activeView === "directory"
                  ? "bg-background text-foreground shadow-xs ring-1 ring-border/50"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users2 className="h-3.5 w-3.5 text-primary" />
              <span>{t("vendors.views.directory", "Directory Cards")}</span>
            </button>
            <button
              type="button"
              onClick={() => nav({ to: "/vendors", search: { view: "table" } })}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                activeView === "table"
                  ? "bg-background text-foreground shadow-xs ring-1 ring-border/50"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TableIcon className="h-3.5 w-3.5 text-primary" />
              <span>{t("vendors.views.table", "Suppliers Table")}</span>
            </button>
          </div>

          <Button size="sm" onClick={openCreate} className="h-8 shadow-xs">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {t("vendors.actions.newPartner", "Add Partner")}
          </Button>
        </div>
      </div>

      {/* Directory Cards View */}
      {activeView === "directory" ? (
        <WorkAndSupplyDirectoryView
          people={directoryQuery.data ?? []}
          isLoading={directoryQuery.isLoading}
          onAddPartner={openCreate}
          defaultCategory={
            category && category in PARTNER_CATEGORIES
              ? (category as AssociatedPartnerCategory)
              : "all"
          }
        />
      ) : (
        /* Classic Structured Table View */
        <div className="space-y-4">
          <DataToolbar
            count={rows.length}
            search={q}
            onSearchChange={setQ}
            searchPlaceholder={t(
              "vendors.searchPlaceholder",
              "Search by company, phone, contact person, code, city…",
            )}
            columns={
              <ColumnsMenu columns={columnDefs} isHidden={isHidden} onToggle={toggleColumn} />
            }
            density={<DensityMenu density={prefs.density} onChange={setDensity} />}
            action={
              <Button size="sm" className="h-8" onClick={openCreate}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />{" "}
                {t("vendors.actions.newVendor", "Add supplying partner")}
              </Button>
            }
          />

          {vendorsQuery.isLoading ? (
            <SkeletonTable rows={6} columns={7} />
          ) : vendorsQuery.error ? (
            <ErrorBlock
              message={toUserMessage(vendorsQuery.error)}
              onRetry={() => vendorsQuery.refetch()}
            />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<Factory className="h-6 w-6" />}
              title={t("vendors.empty.title", "No supplying partners yet")}
              message={t(
                "vendors.empty.message",
                "Add your first supplying partner to start sending RFQs and purchase orders.",
              )}
              action={
                <Button onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" />{" "}
                  {t("vendors.actions.newVendor", "Add supplying partner")}
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
                    {!isHidden("code") && (
                      <TableHead>{t("vendors.columns.code", "Code")}</TableHead>
                    )}
                    {!isHidden("category") && (
                      <TableHead>{t("vendors.columns.category", "Partner Role")}</TableHead>
                    )}
                    {!isHidden("company") && (
                      <TableHead>{t("vendors.columns.company", "Company / Partner")}</TableHead>
                    )}
                    {!isHidden("phone") && <TableHead>{t("common.phone", "Phone")}</TableHead>}
                    {!isHidden("contact") && (
                      <TableHead>{t("common.contactPerson", "Contact")}</TableHead>
                    )}
                    {!isHidden("city") && (
                      <TableHead>{t("vendors.columns.city", "City")}</TableHead>
                    )}
                    {!isHidden("gst") && <TableHead>{t("vendors.columns.gst", "GST")}</TableHead>}
                    {!isHidden("terms") && (
                      <TableHead>{t("vendors.columns.terms", "Payment terms")}</TableHead>
                    )}
                    {!isHidden("status") && <TableHead>{t("common.status", "Status")}</TableHead>}
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((v) => {
                    const status = ((v as unknown as { lifecycle_status?: LifecycleStatus })
                      .lifecycle_status ??
                      (v.is_active ? "active" : "inactive")) as LifecycleStatus;
                    const meta = extractVendorMetadata(v);
                    const catKey = meta.partner_category || detectVendorPartnerCategory(v);
                    const catConfig =
                      catKey in PARTNER_CATEGORIES
                        ? PARTNER_CATEGORIES[catKey as AssociatedPartnerCategory]
                        : PARTNER_CATEGORIES.supplying_partner;

                    return (
                      <TableRow key={v.id}>
                        {!isHidden("code") && (
                          <TableCell className="font-mono text-xs">
                            <Link
                              to="/vendors/$vendorId"
                              params={{ vendorId: v.id }}
                              className="hover:underline"
                            >
                              {v.vendor_code}
                            </Link>
                          </TableCell>
                        )}
                        {!isHidden("category") && (
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`gap-1 px-2 py-0.5 text-[11px] font-medium border ${catConfig.badgeTone}`}
                            >
                              <span className="text-xs">{catConfig.icon}</span>
                              <span>{catConfig.singular}</span>
                            </Badge>
                          </TableCell>
                        )}
                        {!isHidden("company") && (
                          <TableCell className="font-medium">
                            <div className="flex flex-col gap-1">
                              <Link
                                to="/vendors/$vendorId"
                                params={{ vendorId: v.id }}
                                className="hover:underline font-medium text-foreground"
                              >
                                {v.company_name}
                              </Link>
                              {(meta.work_types.length > 0 || meta.products_dealt.length > 0) && (
                                <div className="flex flex-wrap items-center gap-1">
                                  {meta.work_types.map((wt) => {
                                    const item = VENDOR_WORK_TYPES.find((w) => w.value === wt);
                                    return (
                                      <Badge
                                        key={wt}
                                        variant="secondary"
                                        className="px-1.5 py-0 text-[10px] font-normal"
                                      >
                                        {item?.label ?? wt}
                                      </Badge>
                                    );
                                  })}
                                  {meta.products_dealt.length > 0 && (
                                    <span className="text-[10px] text-muted-foreground">
                                      {meta.products_dealt.length} product
                                      {meta.products_dealt.length === 1 ? "" : "s"}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </TableCell>
                        )}
                        {!isHidden("phone") &&
                          (() => {
                            const phone =
                              (v.mobile_number && v.mobile_number.trim()) || getVendorPhone(v);
                            return (
                              <TableCell className="font-mono text-xs text-muted-foreground">
                                {phone ? (
                                  <a
                                    href={`tel:${phone}`}
                                    className="hover:underline hover:text-foreground"
                                  >
                                    {phone}
                                  </a>
                                ) : (
                                  "—"
                                )}
                              </TableCell>
                            );
                          })()}
                        {!isHidden("contact") &&
                          (() => {
                            const contactPerson =
                              (v.contact_person && v.contact_person.trim()) ||
                              getVendorContactName(v);
                            return (
                              <TableCell className="text-xs text-muted-foreground">
                                {contactPerson || "—"}
                              </TableCell>
                            );
                          })()}
                        {!isHidden("city") && <TableCell>{v.city ?? "—"}</TableCell>}
                        {!isHidden("gst") && <TableCell>{v.gst_number ?? "—"}</TableCell>}
                        {!isHidden("terms") && <TableCell>{v.payment_terms ?? "—"}</TableCell>}
                        {!isHidden("status") && (
                          <TableCell>
                            <LifecycleBadge status={status} />
                          </TableCell>
                        )}
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
                                <LifecycleMenuItems
                                  entityType="vendor"
                                  entityId={v.id}
                                  currentStatus={status}
                                />
                              </>
                            }
                            onEdit={() => {
                              setEditing(v);
                              setFormOpen(true);
                            }}
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
        </div>
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
    partner_category: "supplying_partner",
    products_dealt: [],
    work_types: [],
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
  const [baseline, setBaseline] = useState<string>(() => JSON.stringify(emptyForm()));
  const dirty = JSON.stringify(form) !== baseline;

  // Load primary contact for edit mode
  const contactQuery = useQuery({
    queryKey: ["vendor", editing?.id, "primary-contact"],
    queryFn: () => getPrimaryContact(editing!.id),
    enabled: !!(open && editing),
  });

  useEffect(() => {
    if (!open) return;
    if (!editing) {
      const blank = emptyForm();
      setForm(blank);
      setBaseline(JSON.stringify(blank));
      return;
    }
    const meta = extractVendorMetadata(editing);
    const primary =
      contactQuery.data ??
      editing.vendor_contacts?.find((c) => c.is_primary) ??
      editing.vendor_contacts?.[0];
    const next: VendorCreateInput = {
      company_name: editing.company_name,
      contact_name: primary?.name ?? editing.contact_person ?? "",
      mobile: primary?.phone ?? editing.mobile_number ?? "",
      partner_category: meta.partner_category ?? detectVendorPartnerCategory(editing),
      products_dealt: meta.products_dealt,
      work_types: meta.work_types,
      email: primary?.email ?? editing.email ?? null,
      city: editing.city,
      address: editing.address,
      state: editing.state,
      pincode: editing.pincode,
      gst_number: editing.gst_number,
      payment_terms: editing.payment_terms,
      notes: editing.notes,
    };
    setForm(next);
    setBaseline(JSON.stringify(next));
  }, [open, editing, contactQuery.data]);

  const mutation = useMutation({
    mutationFn: (input: VendorCreateInput) =>
      editing ? updateVendor(editing.id, input) : createVendor(input),
    onSuccess: (row) => {
      toast.success(editing ? "Partner updated" : `Partner ${row.vendor_code} added`);
      if (!editing) seedPickerCache(qc, "vendor", row);
      invalidateVendor(qc, row.id);
      qc.invalidateQueries({ queryKey: ["work-and-supply-directory"] });
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
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && mutation.isPending) return;
        if (confirmCloseIfDirty(o, dirty)) onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? `Edit Partner: ${editing.company_name}` : "Add Work & Supply Partner"}
          </DialogTitle>
        </DialogHeader>
        <QuickForm onSubmit={onSubmit} busy={mutation.isPending} dirty={dirty}>
          <QuickForm.QuickFill>
            {/* Partner Association Category Selector */}
            <div className="md:col-span-2 space-y-2 rounded-lg border border-border/80 bg-muted/20 p-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Partner Association Category
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {Object.values(PARTNER_CATEGORIES).map((cat) => {
                  const active = (form.partner_category || "supplying_partner") === cat.key;
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => set("partner_category", cat.key)}
                      className={`flex flex-col items-start rounded-lg border p-2 text-left transition-all ${
                        active
                          ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/40 shadow-xs"
                          : "border-border bg-background text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 w-full">
                        <span className="text-base">{cat.icon}</span>
                        <span className="font-medium text-xs text-foreground truncate">
                          {cat.singular}
                        </span>
                        {active && (
                          <CheckCircle2 className="h-3 w-3 ml-auto text-primary shrink-0" />
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                        {cat.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Field label="Company / Workshop name" required>
              <Input
                value={form.company_name}
                onChange={(e) => set("company_name", e.target.value)}
                placeholder="e.g. Makrana Marble House, Sompura Art Studio"
                required
              />
            </Field>
            <Field label="Contact person" required>
              <Input
                value={form.contact_name}
                onChange={(e) => set("contact_name", e.target.value)}
                placeholder="e.g. Ramesh Bhai"
                required
              />
            </Field>
            <Field label="Mobile / WhatsApp" required>
              <PhoneInput value={form.mobile} onChange={(v) => set("mobile", v)} required />
            </Field>
            <Field label="City / Location">
              <Input
                value={form.city ?? ""}
                onChange={(e) => set("city", e.target.value)}
                placeholder="e.g. Udaipur, Makrana, Kishangarh, Ahmedabad"
              />
            </Field>

            {/* Specialized Work & Capabilities */}
            <div className="md:col-span-2 space-y-2 rounded-lg border border-border/80 bg-muted/20 p-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> Specialized Work & Capabilities
                </label>
                <span className="text-[11px] text-muted-foreground">
                  Handcrafter, CNC, Artwork, Installation
                </span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {VENDOR_WORK_TYPES.map((wt) => {
                  const active = form.work_types.includes(wt.value);
                  return (
                    <button
                      key={wt.value}
                      type="button"
                      onClick={() => {
                        const next = active
                          ? form.work_types.filter((w) => w !== wt.value)
                          : [...form.work_types, wt.value];
                        set("work_types", next);
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                        active
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {active && <Check className="h-3 w-3" />}
                      {wt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Products Dealt In */}
            <div className="md:col-span-2 space-y-2 rounded-lg border border-border/80 bg-muted/20 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    Products Dealt In ({form.products_dealt.length} selected)
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Stone types, art forms, or chemical specialties
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px]"
                    onClick={() =>
                      set(
                        "products_dealt",
                        VENDOR_PRODUCT_OPTIONS.map((m) => m.value),
                      )
                    }
                  >
                    Select all
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px]"
                    onClick={() => set("products_dealt", [])}
                  >
                    Clear
                  </Button>
                </div>
              </div>
              <div className="grid max-h-48 grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2 rounded border border-border/50 bg-background/50 p-2">
                {VENDOR_PRODUCT_OPTIONS.map((mat) => {
                  const checked = form.products_dealt.includes(mat.value);
                  return (
                    <label
                      key={mat.value}
                      className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs transition-colors ${
                        checked
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      }`}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(c) => {
                          const next = c
                            ? [...form.products_dealt, mat.value]
                            : form.products_dealt.filter((x) => x !== mat.value);
                          set("products_dealt", next);
                        }}
                      />
                      <span className="truncate">{mat.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </QuickForm.QuickFill>

          <QuickForm.MoreDetails>
            <Field label="Email">
              <EmailInput value={form.email ?? ""} onChange={(v) => set("email", v)} />
            </Field>
            <Field label="GST number">
              <GstInput value={form.gst_number ?? ""} onChange={(v) => set("gst_number", v)} />
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
              <PincodeInput value={form.pincode ?? ""} onChange={(v) => set("pincode", v)} />
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
              {editing ? "Save Changes" : "Add Partner"}
            </Button>
          </QuickForm.Actions>
        </QuickForm>
      </DialogContent>
    </Dialog>
  );
}

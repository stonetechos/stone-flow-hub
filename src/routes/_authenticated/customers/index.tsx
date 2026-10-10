import { useTranslation } from "react-i18next";
import { dispatchSystemNotification } from "@/lib/notifications/systemNotifications.functions";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Loader2,
  Users,
  ExternalLink,
  Phone,
  MessageSquare,
  Workflow,
  Building2,
  User,
  Sparkles,
} from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { StoreVoiceAssistantTab } from "@/components/customers/StoreVoiceAssistantTab";
import type { ParsedVoiceCustomer } from "@/lib/customers/voice-parser";

import { CustomerResponseStatusSelect } from "@/components/customers/CustomerResponseStatusSelect";
import { CustomerPaymentStatusSelect } from "@/components/customers/CustomerPaymentStatusSelect";
import { CustomerOrderPipeline } from "@/components/customers/CustomerOrderPipeline";
import {
  CUSTOMER_RESPONSE_STATUS_CONFIG,
  getCustomerResponseStatus,
  type CustomerResponseStatus,
} from "@/lib/customers/crm-status";
import {
  CUSTOMER_PAYMENT_STATUS_CONFIG,
  getCustomerPaymentStatus,
  type CustomerPaymentStatus,
} from "@/lib/customers/payment-status";
import { listCustomerLedgerSummaries } from "@/lib/customer-ledger/api";
import { CreditCard } from "lucide-react";
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
import { normalizeCustomerRow } from "@/lib/customers/normalize";
import type { DbEnum } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/customers/")({
  ssr: false,
  component: CustomersPage,
  validateSearch: (s: Record<string, unknown>): { edit?: string; tab?: string } => ({
    edit: typeof s.edit === "string" ? s.edit : undefined,
    tab: typeof s.tab === "string" ? s.tab : undefined,
  }),
});

function CustomersPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const nav = useNavigate();
  const { edit, tab: urlTab } = Route.useSearch();
  const [activeTab, setActiveTab] = useState<"directory" | "pipeline">(
    urlTab === "pipeline" ? "pipeline" : "directory",
  );
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 250);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerRow | null>(null);
  const [voiceData, setVoiceData] = useState<ParsedVoiceCustomer | null>(null);
  const [toDelete, setToDelete] = useState<CustomerRow | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");

  useEffect(() => {
    if (urlTab === "pipeline" || urlTab === "directory") {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  const { prefs, setDensity } = useTablePrefs("customers");

  const query = useQuery({
    queryKey: qk.customers.list(dq),
    queryFn: () => listCustomers(dq),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });

  const ledgerQuery = useQuery({
    queryKey: ["customer-ledger-summaries"],
    queryFn: () => listCustomerLedgerSummaries(),
    staleTime: 30_000,
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
  }, [dq, statusFilter, typeFilter, paymentFilter]);

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
    if (paymentFilter !== "all") {
      list = list.filter(
        (c) => getCustomerPaymentStatus(c, ledgerQuery.data?.get(c.id)) === paymentFilter,
      );
    }
    return list;
  }, [query.data, statusFilter, typeFilter, paymentFilter, ledgerQuery.data]);

  const paymentCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: (query.data ?? []).length,
      payment_pending: 0,
      part_payment_received: 0,
      full_payment_received: 0,
      payment_received: 0,
    };
    for (const c of query.data ?? []) {
      const st = getCustomerPaymentStatus(c, ledgerQuery.data?.get(c.id));
      if (st in counts) {
        counts[st] = (counts[st] ?? 0) + 1;
      }
    }
    return counts;
  }, [query.data, ledgerQuery.data]);

  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  const openCreate = () => {
    setEditing(null);
    setVoiceData(null);
    setFormOpen(true);
  };

  return (
    <div>
      <PageHeader
        title={t("customers.title", "Customers")}
        subtitle={t(
          "customers.subtitle",
          "Master list of everyone you sell to and active order delivery commitments.",
        )}
      />

      {/* One-Tap Store Voice Assistant — Metallic Tab with Pulsating Turquoise Aura */}
      <div className="mb-4">
        <StoreVoiceAssistantTab
          onCustomerExtracted={(parsed) => {
            setVoiceData(parsed);
            setEditing(null);
            setFormOpen(true);
          }}
        />
      </div>

      {/* Dual View Tabs: All Customers directory vs. Order Pipeline */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 mb-4">
        <div className="inline-flex items-center rounded-lg bg-slate-100 p-1 text-slate-600">
          <button
            type="button"
            onClick={() => {
              setActiveTab("directory");
              nav({ to: "/customers", search: { tab: "directory" }, replace: true });
            }}
            className={cn(
              "flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all",
              activeTab === "directory"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900",
            )}
          >
            <Users className="h-3.5 w-3.5 text-slate-700" />
            <span>{t("customers.allCustomers", "All Customers")}</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                activeTab === "directory"
                  ? "bg-slate-100 text-slate-800"
                  : "bg-slate-200/70 text-slate-600",
              )}
            >
              {rows.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("pipeline");
              nav({ to: "/customers", search: { tab: "pipeline" }, replace: true });
            }}
            className={cn(
              "flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all",
              activeTab === "pipeline"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900",
            )}
          >
            <Workflow className="h-3.5 w-3.5 text-indigo-600" />
            <span>Order Pipeline</span>
            <span className="rounded-full bg-indigo-50 border border-indigo-200/60 px-1.5 py-0.2 text-[10px] font-bold text-indigo-700">
              Vendor & Customer Deadlines
            </span>
          </button>
        </div>

        {activeTab === "directory" && (
          <Button size="sm" className="h-8" onClick={openCreate}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> {t("customers.newCustomer", "New customer")}
          </Button>
        )}
      </div>

      {activeTab === "pipeline" ? (
        <CustomerOrderPipeline />
      ) : (
        <>
          {/* Quick Payment Status Sub-Tabs / Filter Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-3">
            <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1 shrink-0">
              <CreditCard className="h-3.5 w-3.5 text-slate-400" />
              <span>Payment Status:</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setPaymentFilter("all");
                setPage(1);
              }}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-all border shrink-0",
                paymentFilter === "all"
                  ? "bg-slate-900 text-white border-slate-900 shadow-2xs font-semibold"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50",
              )}
            >
              All ({paymentCounts.all})
            </button>
            <button
              type="button"
              onClick={() => {
                setPaymentFilter("payment_pending");
                setPage(1);
              }}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-all border shrink-0 flex items-center gap-1.5",
                paymentFilter === "payment_pending"
                  ? "bg-rose-700 text-white border-rose-700 shadow-2xs font-semibold"
                  : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100",
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              Payment Pending ({paymentCounts.payment_pending})
            </button>
            <button
              type="button"
              onClick={() => {
                setPaymentFilter("part_payment_received");
                setPage(1);
              }}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-all border shrink-0 flex items-center gap-1.5",
                paymentFilter === "part_payment_received"
                  ? "bg-amber-700 text-white border-amber-700 shadow-2xs font-semibold"
                  : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Part Payment Received ({paymentCounts.part_payment_received})
            </button>
            <button
              type="button"
              onClick={() => {
                setPaymentFilter("full_payment_received");
                setPage(1);
              }}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-all border shrink-0 flex items-center gap-1.5",
                paymentFilter === "full_payment_received"
                  ? "bg-emerald-700 text-white border-emerald-700 shadow-2xs font-semibold"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Full Payment Received ({paymentCounts.full_payment_received})
            </button>
            <button
              type="button"
              onClick={() => {
                setPaymentFilter("payment_received");
                setPage(1);
              }}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-all border shrink-0 flex items-center gap-1.5",
                paymentFilter === "payment_received"
                  ? "bg-sky-700 text-white border-sky-700 shadow-2xs font-semibold"
                  : "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100",
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
              Advance / Rcvd ({paymentCounts.payment_received})
            </button>
          </div>

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
                              <span
                                className={cn("h-1.5 w-1.5 rounded-full shrink-0", cfg.dotColor)}
                              />
                              <span>{cfg.shortLabel}</span>
                            </span>
                          </SelectItem>
                        );
                      },
                    )}
                  </SelectContent>
                </Select>

                <Select
                  value={paymentFilter}
                  onValueChange={(v) => {
                    setPaymentFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-44 text-xs bg-white">
                    <SelectValue placeholder="Payment status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All payment statuses</SelectItem>
                    {(Object.keys(CUSTOMER_PAYMENT_STATUS_CONFIG) as CustomerPaymentStatus[]).map(
                      (key) => {
                        const cfg = CUSTOMER_PAYMENT_STATUS_CONFIG[key];
                        return (
                          <SelectItem key={key} value={key}>
                            <span className="flex items-center gap-1.5">
                              <span
                                className={cn("h-1.5 w-1.5 rounded-full shrink-0", cfg.dotColor)}
                              />
                              <span>{cfg.label}</span>
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
                    <TableHead className="w-52">Payment Status</TableHead>
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
                            className="hover:underline flex flex-col gap-1 py-1"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-900">{c.name}</span>
                              {c.customer_code && (
                                <span className="font-mono text-[11px] text-muted-foreground">
                                  ({c.customer_code})
                                </span>
                              )}
                            </div>
                            {(() => {
                              const norm = normalizeCustomerRow(c);
                              return (
                                <div className="flex flex-wrap items-center gap-1.5 text-xs font-normal">
                                  {norm.contact_person && (
                                    <span className="inline-flex items-center gap-1 rounded bg-teal-50 text-teal-800 border border-teal-200/70 px-1.5 py-0.5 text-[11px] font-medium">
                                      <User className="h-3 w-3 text-teal-600 shrink-0" />
                                      <span>
                                        Contact:{" "}
                                        <strong className="font-semibold text-teal-900">
                                          {norm.contact_person}
                                        </strong>
                                      </span>
                                    </span>
                                  )}
                                  {norm.company_name && norm.company_name !== c.name && (
                                    <span className="inline-flex items-center gap-1 rounded bg-slate-100 text-slate-700 px-1.5 py-0.5 text-[11px] font-medium">
                                      <Building2 className="h-3 w-3 text-slate-500 shrink-0" />
                                      <span>Firm: {norm.company_name}</span>
                                    </span>
                                  )}
                                </div>
                              );
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
                          <CustomerPaymentStatusSelect
                            customerId={c.id}
                            customerName={c.name}
                            workflowState={c.workflow_state}
                            ledgerSummary={ledgerQuery.data?.get(c.id)}
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
                                    <ExternalLink className="mr-2 h-4 w-4" />{" "}
                                    {t("common.open", "Open")}
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
        </>
      )}

      <CustomerFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setVoiceData(null);
        }}
        editing={editing}
        voiceExtractedData={voiceData}
        onClearVoiceExtracted={() => setVoiceData(null)}
      />
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
  const norm = normalizeCustomerRow(c);
  return {
    name: norm.name,
    contact_person: norm.contact_person ?? null,
    company_name: norm.company_name ?? null,
    mobile: norm.primary_phone ?? "",
    email: norm.primary_email,
    city: norm.city,
    customer_type: norm.customer_type as CustomerCreateInput["customer_type"],
    referred_by: norm.referred_by,
    site_address: norm.site_address,
    space_type: norm.space_type as CustomerCreateInput["space_type"],
    material_interests: hydrateMaterialInterests(
      norm.material_interests as CustomerCreateInput["material_interests"],
      norm.notes,
    ),
    whatsapp: norm.whatsapp,
    billing_address: norm.billing_address,
    state: norm.state,
    pincode: norm.pincode,
    gst_number: norm.gst_number,
    notes: norm.notes,
  };
}

type NameReflectionMode = "smart" | "firm" | "contact" | "combined" | "custom";

function computeReflectedName(
  mode: NameReflectionMode,
  contact: string | null | undefined,
  firm: string | null | undefined,
  currentCustomName: string,
): string {
  const c = (contact ?? "").trim();
  const f = (firm ?? "").trim();
  switch (mode) {
    case "smart":
      return f || c || currentCustomName;
    case "firm":
      return f || currentCustomName;
    case "contact":
      return c || currentCustomName;
    case "combined":
      if (f && c) return `${f} · ${c}`;
      return f || c || currentCustomName;
    case "custom":
      return currentCustomName;
  }
}

function CustomerFormDialog({
  open,
  onOpenChange,
  editing,
  voiceExtractedData,
  onClearVoiceExtracted,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: CustomerRow | null;
  voiceExtractedData?: ParsedVoiceCustomer | null;
  onClearVoiceExtracted?: () => void;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [form, setForm] = useState<CustomerCreateInput>(emptyForm);
  const [baseline, setBaseline] = useState<string>(() => JSON.stringify(emptyForm()));
  const [nameReflectionMode, setNameReflectionMode] = useState<NameReflectionMode>("smart");
  const dirty = JSON.stringify(form) !== baseline;

  useEffect(() => {
    if (!open) return;
    if (editing) {
      const next = fromRow(editing);
      setForm(next);
      setBaseline(JSON.stringify(next));

      const f = (next.company_name ?? "").trim();
      const c = (next.contact_person ?? "").trim();
      const n = (next.name ?? "").trim();
      if (f && n === f) {
        setNameReflectionMode("firm");
      } else if (c && n === c) {
        setNameReflectionMode("contact");
      } else if (f && c && n === `${f} · ${c}`) {
        setNameReflectionMode("combined");
      } else {
        setNameReflectionMode("smart");
      }
    } else if (voiceExtractedData) {
      const next: CustomerCreateInput = {
        ...emptyForm(),
        contact_person: voiceExtractedData.contact_person,
        company_name: voiceExtractedData.company_name,
        name: voiceExtractedData.name,
        mobile: voiceExtractedData.mobile ?? "",
        whatsapp: voiceExtractedData.mobile ?? "",
        email: voiceExtractedData.email,
        city: voiceExtractedData.city,
        customer_type:
          (voiceExtractedData.customer_type as CustomerCreateInput["customer_type"]) || "walk_in",
        material_interests:
          (voiceExtractedData.material_interests as CustomerCreateInput["material_interests"]) ||
          [],
        notes: voiceExtractedData.notes,
      };
      setForm(next);
      setBaseline(JSON.stringify(emptyForm()));
      setNameReflectionMode(voiceExtractedData.recommendedReflectionMode);
    } else {
      const next = emptyForm();
      setForm(next);
      setBaseline(JSON.stringify(next));
      setNameReflectionMode("smart");
    }
  }, [open, editing, voiceExtractedData]);

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

  const handleContactChange = (val: string) => {
    setForm((prev) => {
      const updated = { ...prev, contact_person: val };
      if (nameReflectionMode !== "custom") {
        updated.name = computeReflectedName(nameReflectionMode, val, prev.company_name, prev.name);
      }
      return updated;
    });
  };

  const handleFirmChange = (val: string) => {
    setForm((prev) => {
      const updated = { ...prev, company_name: val };
      if (nameReflectionMode !== "custom") {
        updated.name = computeReflectedName(
          nameReflectionMode,
          prev.contact_person,
          val,
          prev.name,
        );
      }
      return updated;
    });
  };

  const handleReflectionModeChange = (mode: NameReflectionMode) => {
    setNameReflectionMode(mode);
    if (mode !== "custom") {
      const computed = computeReflectedName(
        mode,
        form.contact_person,
        form.company_name,
        form.name,
      );
      if (computed) {
        set("name", computed);
      }
    }
  };

  const handleInDialogVoice = (parsed: ParsedVoiceCustomer) => {
    setForm((prev) => ({
      ...prev,
      contact_person: parsed.contact_person ?? prev.contact_person,
      company_name: parsed.company_name ?? prev.company_name,
      name: parsed.name || prev.name,
      mobile: parsed.mobile || prev.mobile,
      whatsapp: parsed.mobile || prev.whatsapp,
      email: parsed.email || prev.email,
      city: parsed.city || prev.city,
      customer_type:
        (parsed.customer_type as CustomerCreateInput["customer_type"]) || prev.customer_type,
      material_interests:
        parsed.material_interests.length > 0
          ? (parsed.material_interests as CustomerCreateInput["material_interests"])
          : prev.material_interests,
      notes: parsed.notes
        ? prev.notes
          ? `${prev.notes}\n${parsed.notes}`
          : parsed.notes
        : prev.notes,
    }));
    if (parsed.recommendedReflectionMode) {
      setNameReflectionMode(parsed.recommendedReflectionMode);
    }
  };

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

        {/* In-dialog One-Tap Store Voice Assistant option */}
        {!editing && (
          <StoreVoiceAssistantTab
            compact
            className="my-1"
            onCustomerExtracted={handleInDialogVoice}
          />
        )}

        {/* If voice data was populated, show noticeable banner asking employee to review & edit before saving */}
        {voiceExtractedData && (
          <div className="rounded-lg border border-teal-200/90 bg-gradient-to-r from-teal-50 via-cyan-50 to-emerald-50 p-3 text-xs text-teal-950 flex items-start gap-2.5 shadow-xs">
            <Sparkles className="h-4 w-4 text-teal-600 shrink-0 mt-0.5 animate-pulse" />
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-teal-900">
                  ✨ Voice Data Auto-Filled — Review &amp; Edit Before Saving
                </span>
                {onClearVoiceExtracted && (
                  <button
                    type="button"
                    onClick={onClearVoiceExtracted}
                    className="text-[11px] text-teal-700 hover:text-teal-900 underline font-medium cursor-pointer"
                  >
                    Clear Voice Data
                  </button>
                )}
              </div>
              <p className="text-[11px] text-teal-850/90 leading-relaxed">
                Spoken details have been populated below. Please review the contact person, firm
                name, phone number, and product interests. Make any edits before saving.
              </p>
              {voiceExtractedData.rawTranscript && (
                <div className="mt-1 text-[10px] text-teal-800/80 italic line-clamp-2 bg-white/70 rounded px-2 py-1 border border-teal-100">
                  &ldquo;{voiceExtractedData.rawTranscript}&rdquo;
                </div>
              )}
            </div>
          </div>
        )}
        <QuickForm onSubmit={onSubmit} busy={mutation.isPending} dirty={dirty}>
          <QuickForm.QuickFill>
            {/* 1. Contact Person's Name: representative & point of communication */}
            <Field
              label={t("customers.contactPerson", "1. Contact Person's Name (Representative)")}
              hint={t("customers.contactPersonHint", "Point of communication for supply")}
            >
              <Input
                value={form.contact_person ?? ""}
                onChange={(e) => handleContactChange(e.target.value)}
                placeholder="e.g. Ramesh Patel"
                autoFocus={!editing}
              />
            </Field>

            {/* 2. Firm / Company Name */}
            <Field
              label={t("customers.companyName", "2. Firm / Company Name")}
              hint={t("customers.companyNameHint", "Business or organization name")}
            >
              <Input
                value={form.company_name ?? ""}
                onChange={(e) => handleFirmChange(e.target.value)}
                placeholder="e.g. ABC Developers LLP"
              />
            </Field>

            {/* 3. Dropdown for Name Reflection + Reflected Name in compiled list */}
            <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <span>Reflect in Customer List As</span>
                    <span className="text-[11px] font-normal text-slate-500">
                      (Dropdown selector)
                    </span>
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Choose how this customer is titled in the compiled dashboard directory
                  </p>
                </div>
                <Select
                  value={nameReflectionMode}
                  onValueChange={(v) => handleReflectionModeChange(v as NameReflectionMode)}
                >
                  <SelectTrigger className="h-8 w-full sm:w-64 text-xs bg-white font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="smart">Smart (Firm if present, else Contact)</SelectItem>
                    <SelectItem value="firm">Firm / Company Name</SelectItem>
                    <SelectItem value="contact">Contact Person's Name</SelectItem>
                    <SelectItem value="combined">Both (Firm · Contact Person)</SelectItem>
                    <SelectItem value="custom">Custom / Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Field
                label={t("common.name", "Reflected Customer Name")}
                hint="Titled name shown on quotes, orders, and dashboard list"
                required
              >
                <Input
                  value={form.name}
                  onChange={(e) => {
                    setNameReflectionMode("custom");
                    set("name", e.target.value);
                  }}
                  placeholder="e.g. ABC Developers LLP or Ramesh Patel"
                  required
                />
              </Field>
            </div>
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

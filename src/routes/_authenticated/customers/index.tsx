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
  FolderPlus,
  FileText,
  ShoppingCart,
  Trash2,
  UserCheck,
  UserX,
  Pencil,
} from "lucide-react";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { StoreVoiceAssistantTab } from "@/components/customers/StoreVoiceAssistantTab";
import { PhonebookPickerButton } from "@/components/customers/PhonebookPickerButton";
import type { ParsedVoiceCustomer } from "@/lib/customers/voice-parser";

import { CustomerResponseStatusSelect } from "@/components/customers/CustomerResponseStatusSelect";
import { CustomerAssigneeSelect } from "@/components/customers/CustomerAssigneeSelect";
import { CustomerPaymentStatusSelect } from "@/components/customers/CustomerPaymentStatusSelect";
import { CustomerOrderPipeline } from "@/components/customers/CustomerOrderPipeline";
import {
  CUSTOMER_RESPONSE_STATUS_CONFIG,
  buildCustomerFollowupWhatsappMessage,
  getCustomerPaymentReminderInfo,
  getCustomerResponseStatus,
  getCustomerSalesperson,
  getCustomerResponseStatusLabel,
  getCustomerFollowupStats,
  formatRelativeContactTime,
  type CustomerResponseStatus,
} from "@/lib/customers/crm-status";
import { transliterateName } from "@/lib/i18n/transliterate";
import { buildWhatsappUrl } from "@/lib/whatsapp";
import {
  CUSTOMER_PAYMENT_STATUS_CONFIG,
  getCustomerPaymentStatus,
  extractCustomerSerialNumber,
  compareCustomersForDirectory,
  getCustomerPaymentStatusLabel,
  type CustomerPaymentStatus,
} from "@/lib/customers/payment-status";
import { listOrderPipeline } from "@/lib/customers/order-pipeline";
import { listCustomerLedgerSummaries } from "@/lib/customer-ledger/api";
import { CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { formatDate, toIndicDigits } from "@/lib/format";
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
import { qk } from "@/lib/query-keys";
import { invalidateCustomer, seedPickerCache } from "@/lib/query-invalidation";
import { toUserMessage } from "@/lib/errors";
import {
  createCustomer,
  deleteCustomer,
  getCustomerContacts,
  listCustomers,
  updateCustomer,
  updateCustomerCrmStatus,
  updateCustomerSalesperson,
  logCustomerContact,
  type CustomerRow,
} from "@/lib/customers/api";
import { type CustomerSalespersonKey } from "@/lib/customers/crm-status";
import {
  CUSTOMER_TYPES,
  SPACE_TYPES,
  MATERIAL_OPTIONS,
  customerCreateSchema,
  getCustomerTypeLabel,
  getCustomerTypeBadgeTone,
  getEffectiveCustomerType,
  type CustomerCreateInput,
  type CustomerContactInput,
} from "@/lib/customers/schema";
import { hydrateMaterialInterests } from "@/lib/customers/material-interests";
import { normalizeCustomerRow } from "@/lib/customers/normalize";
import type { DbEnum } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/customers/")({
  ssr: false,
  component: CustomersPage,
  validateSearch: (
    s: Record<string, unknown>,
  ): { edit?: string; tab?: string; create?: boolean } => ({
    edit: typeof s.edit === "string" ? s.edit : undefined,
    tab: typeof s.tab === "string" ? s.tab : undefined,
    create: s.create === true || s.create === "true" ? true : undefined,
  }),
});

function CustomersPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const nav = useNavigate();
  const { edit, tab: urlTab, create } = Route.useSearch();
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
  const [salespersonFilter, setSalespersonFilter] = useState<string>("all");

  useEffect(() => {
    if (urlTab === "pipeline" || urlTab === "directory") {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  const { prefs, setDensity } = useTablePrefs("customers");

  const query = useQuery({
    queryKey: qk.customers.list(dq),
    queryFn: () => listCustomers(dq),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });

  const ledgerQuery = useQuery({
    queryKey: ["customer-ledger-summaries"],
    queryFn: () => listCustomerLedgerSummaries(),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });

  const pipelineQuery = useQuery({
    queryKey: ["customer-order-pipeline"],
    queryFn: () => listOrderPipeline(),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });

  const customerOrderMap = useMemo(() => {
    const map = new Map<
      string,
      {
        nearestDeadline: string | null;
        activeOrderCount: number;
        completedOrderCount: number;
        hasCompletedOrder: boolean;
        recentOrderDate: string | null;
        urgentOrderNo: string | null;
        health: string | null;
      }
    >();

    for (const item of pipelineQuery.data ?? []) {
      if (!item.customerId) continue;
      const isCompleted =
        item.health === "completed" ||
        ["received", "completed", "delivered", "closed", "dispatched"].includes(
          (item.status || "").toLowerCase(),
        );

      const existing = map.get(item.customerId);
      const deadline = isCompleted ? null : item.customerDeadline || item.vendorDeadline;
      const orderDate = item.orderDate;

      if (!existing) {
        map.set(item.customerId, {
          nearestDeadline: deadline ?? null,
          activeOrderCount: isCompleted ? 0 : 1,
          completedOrderCount: isCompleted ? 1 : 0,
          hasCompletedOrder: isCompleted,
          recentOrderDate: orderDate ?? null,
          urgentOrderNo: isCompleted ? null : item.orderNo,
          health: isCompleted ? "completed" : item.health,
        });
      } else {
        if (isCompleted) {
          existing.completedOrderCount += 1;
          existing.hasCompletedOrder = true;
        } else {
          existing.activeOrderCount += 1;
        }
        if (orderDate && (!existing.recentOrderDate || orderDate > existing.recentOrderDate)) {
          existing.recentOrderDate = orderDate;
        }
        if (deadline) {
          if (!existing.nearestDeadline || deadline < existing.nearestDeadline) {
            existing.nearestDeadline = deadline;
            existing.urgentOrderNo = item.orderNo;
            existing.health = item.health;
          }
        }
      }
    }
    return map;
  }, [pipelineQuery.data]);

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
  }, [dq, statusFilter, typeFilter, paymentFilter, salespersonFilter]);

  useEffect(() => {
    if (!edit) return;
    const row = (query.data ?? []).find((r) => r.id === edit);
    if (row) {
      setEditing(row);
      setFormOpen(true);
      nav({ to: "/customers", search: {}, replace: true });
    }
  }, [edit, query.data, nav]);

  useEffect(() => {
    if (create) {
      setEditing(null);
      setFormOpen(true);
      nav({ to: "/customers", search: {}, replace: true });
    }
  }, [create, nav]);

  const delMut = useMutation({
    mutationFn: (id: string) => deleteCustomer(id),
    onSuccess: () => {
      toast.success("Customer deleted");
      invalidateCustomer(qc);
      setToDelete(null);
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  // Track the most recently contacted customer to give visual recognition upon returning to list
  const [lastContacted, setLastContacted] = useState<{
    customerId: string;
    channel: "whatsapp" | "call";
    timestamp: number;
  } | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = sessionStorage.getItem("stos_last_contacted_customer");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const logContactMutation = useMutation({
    mutationFn: (vars: { customerId: string; channel: "whatsapp" | "call"; notes?: string }) =>
      logCustomerContact(vars),
    onSuccess: (data, vars) => {
      const info = { customerId: vars.customerId, channel: vars.channel, timestamp: Date.now() };
      setLastContacted(info);
      try {
        sessionStorage.setItem("stos_last_contacted_customer", JSON.stringify(info));
      } catch (err) {
        console.debug("[customers] sessionStorage write skipped:", err);
      }
      toast.success(
        vars.channel === "whatsapp"
          ? t("customers.whatsappLogged", "WhatsApp follow-up logged")
          : t("customers.callLogged", "Phone call logged"),
      );
      void qc.invalidateQueries({ queryKey: qk.customers.all });
      void qc.invalidateQueries({ queryKey: qk.customers.byId(vars.customerId) });
      void qc.invalidateQueries({ queryKey: ["hub", "customer", vars.customerId] });
      void qc.invalidateQueries({ queryKey: ["customer-pending-followups", vars.customerId] });
      void qc.invalidateQueries({ queryKey: ["customer-followups-history", vars.customerId] });
      void qc.invalidateQueries({ queryKey: ["followups"] });
    },
  });

  const markDormantMutation = useMutation({
    mutationFn: (customerId: string) =>
      updateCustomerCrmStatus({
        customerId,
        response_status: "dormant",
        is_active: false,
        call_note: "Marked dormant due to lack of response after multiple follow-ups",
      }),
    onSuccess: (updated) => {
      toast.success(`${updated.name} marked as Dormant · Unresponsive`);
      void qc.invalidateQueries({ queryKey: qk.customers.all });
      void qc.invalidateQueries({ queryKey: qk.customers.byId(updated.id) });
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const reactivateMutation = useMutation({
    mutationFn: (customerId: string) =>
      updateCustomerCrmStatus({
        customerId,
        response_status: "active_responsive",
        is_active: true,
      }),
    onSuccess: (updated) => {
      toast.success(`${updated.name} reactivated`);
      void qc.invalidateQueries({ queryKey: qk.customers.all });
      void qc.invalidateQueries({ queryKey: qk.customers.byId(updated.id) });
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  function hasCustomerPlacedOrder(
    c: CustomerRow,
    orderInfo?: { activeOrderCount: number; hasCompletedOrder?: boolean } | null,
  ): boolean {
    if ((orderInfo?.activeOrderCount ?? 0) > 0 || (orderInfo?.hasCompletedOrder ?? false))
      return true;
    const crmStatus = getCustomerResponseStatus(c);
    return (
      crmStatus === "order_placed" ||
      crmStatus === "installation_team_working" ||
      crmStatus === "artwork_team_working" ||
      crmStatus === "order_completed" ||
      crmStatus === "order_cancelled_delay" ||
      crmStatus === "order_cancelled_change_of_plans"
    );
  }

  const rows = useMemo(() => {
    let list = query.data ?? [];
    if (statusFilter === "unresponsive_2plus") {
      list = list.filter((c) => getCustomerFollowupStats(c).isUnresponsive);
    } else if (statusFilter !== "all") {
      list = list.filter((c) => getCustomerResponseStatus(c) === statusFilter);
    }
    if (typeFilter !== "all") {
      list = list.filter((c) => getEffectiveCustomerType(c) === typeFilter);
    }
    if (salespersonFilter !== "all") {
      list = list.filter((c) => {
        const sp = getCustomerSalesperson(c);
        if (salespersonFilter === "unassigned") return !sp;
        return sp === salespersonFilter;
      });
    }
    if (paymentFilter !== "all") {
      if (paymentFilter === "promised_flagged") {
        list = list.filter((c) => {
          const pay = getCustomerPaymentReminderInfo(c);
          return pay.hasReminder && pay.isFlaggedActive;
        });
      } else {
        list = list.filter((c) => {
          const orderInfo = customerOrderMap.get(c.id);
          if (!hasCustomerPlacedOrder(c, orderInfo)) return false;
          const ledgerSummary = ledgerQuery.data?.get(c.id);
          return getCustomerPaymentStatus(c, ledgerSummary) === paymentFilter;
        });
      }
    }
    return [...list].sort((a, b) =>
      compareCustomersForDirectory(a, b, {
        getOrderInfo: (id) => customerOrderMap.get(id),
        getLedgerSummary: (id) => ledgerQuery.data?.get(id),
      }),
    );
  }, [
    query.data,
    statusFilter,
    typeFilter,
    salespersonFilter,
    paymentFilter,
    ledgerQuery.data,
    customerOrderMap,
  ]);

  const unresponsiveCount = useMemo(() => {
    return (query.data ?? []).filter(
      (c) =>
        getCustomerFollowupStats(c).isUnresponsive && getCustomerResponseStatus(c) !== "dormant",
    ).length;
  }, [query.data]);

  const dormantCount = useMemo(() => {
    return (query.data ?? []).filter((c) => getCustomerResponseStatus(c) === "dormant").length;
  }, [query.data]);

  const paymentCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: (query.data ?? []).length,
      promised_flagged: 0,
      no_dues: 0,
      payment_pending: 0,
      part_payment_received: 0,
      full_payment_received: 0,
      payment_received: 0,
    };
    for (const c of query.data ?? []) {
      const pay = getCustomerPaymentReminderInfo(c);
      if (pay.hasReminder && pay.isFlaggedActive) {
        counts.promised_flagged = (counts.promised_flagged ?? 0) + 1;
      }
      const orderInfo = customerOrderMap.get(c.id);
      if (!hasCustomerPlacedOrder(c, orderInfo)) continue;
      const ledgerSummary = ledgerQuery.data?.get(c.id);
      const st = getCustomerPaymentStatus(c, ledgerSummary);
      if (st in counts) {
        counts[st] = (counts[st] ?? 0) + 1;
      }
    }
    return counts;
  }, [query.data, ledgerQuery.data, customerOrderMap]);

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
        className="mb-3"
        actions={
          <div className="flex items-center gap-2.5">
            <StoreVoiceAssistantTab
              compact
              onCustomerExtracted={(parsed) => {
                setVoiceData(parsed);
                setEditing(null);
                setFormOpen(true);
              }}
            />
            <Button size="sm" className="h-8 shadow-xs" onClick={openCreate}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> {t("customers.newCustomer", "New customer")}
            </Button>
          </div>
        }
      />

      {/* Dual View Tabs: All Customers directory vs. Order Pipeline */}
      <div className="flex items-center justify-between gap-3 border-b border-border-subtle pb-2.5 mb-3.5">
        <div className="inline-flex items-center rounded-lg bg-slate-100/90 p-1 text-slate-600">
          <button
            type="button"
            onClick={() => {
              setActiveTab("directory");
              nav({ to: "/customers", search: { tab: "directory" }, replace: true });
            }}
            className={cn(
              "flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer",
              activeTab === "directory"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900",
            )}
          >
            <Users className="h-3.5 w-3.5 text-slate-700" />
            <span>{t("customers.allCustomers", "All Customers")}</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                activeTab === "directory"
                  ? "bg-slate-100 text-slate-900"
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
              "flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer",
              activeTab === "pipeline"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900",
            )}
          >
            <Workflow className="h-3.5 w-3.5 text-indigo-600" />
            <span>{t("customers.orderPipeline", "Order Pipeline")}</span>
            <span className="rounded-full bg-indigo-50 border border-indigo-200/60 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
              {t("customers.deadlinesBadge", "Vendor & Customer Deadlines")}
            </span>
          </button>
        </div>
      </div>

      {activeTab === "pipeline" ? (
        <CustomerOrderPipeline />
      ) : (
        <>
          {/* Quick Payment Status Sub-Tabs / Filter Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1 shrink-0">
              <CreditCard className="h-3 w-3 text-slate-400" />
              <span>{t("customers.paymentStatus", "Payment Status")}:</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setPaymentFilter("all");
                setPage(1);
              }}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-full transition-all shrink-0 cursor-pointer",
                paymentFilter === "all"
                  ? "bg-slate-900 text-white shadow-2xs font-semibold"
                  : "bg-slate-100/90 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900",
              )}
            >
              {t("common.all", "All")}{" "}
              <span className="ml-0.5 opacity-75 tabular-nums">({paymentCounts.all})</span>
            </button>
            {paymentCounts.promised_flagged > 0 && (
              <button
                type="button"
                onClick={() => {
                  setPaymentFilter("promised_flagged");
                  setPage(1);
                }}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-full transition-all shrink-0 flex items-center gap-1.5 cursor-pointer",
                  paymentFilter === "promised_flagged"
                    ? "bg-amber-800 text-white shadow-2xs font-semibold"
                    : "bg-amber-50 text-amber-900 hover:bg-amber-100/90 border border-amber-300",
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                💰 {t("customers.payment.promisedFlagged", "Payment Due (Flagged)")}{" "}
                <span className="opacity-75 tabular-nums">({paymentCounts.promised_flagged})</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setPaymentFilter("no_dues");
                setPage(1);
              }}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-full transition-all shrink-0 flex items-center gap-1.5 cursor-pointer",
                paymentFilter === "no_dues"
                  ? "bg-slate-800 text-white shadow-2xs font-semibold"
                  : "bg-slate-100/90 text-slate-700 hover:bg-slate-200/80",
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              {t("customers.payment.noDues", "No Dues")}{" "}
              <span className="opacity-75 tabular-nums">({paymentCounts.no_dues})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPaymentFilter("payment_pending");
                setPage(1);
              }}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-full transition-all shrink-0 flex items-center gap-1.5 cursor-pointer",
                paymentFilter === "payment_pending"
                  ? "bg-rose-700 text-white shadow-2xs font-semibold"
                  : "bg-rose-50 text-rose-700 hover:bg-rose-100/80 border border-rose-200/60",
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              {t("customers.payment.paymentPending", "Payment Pending")}{" "}
              <span className="opacity-75 tabular-nums">({paymentCounts.payment_pending})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPaymentFilter("part_payment_received");
                setPage(1);
              }}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-full transition-all shrink-0 flex items-center gap-1.5 cursor-pointer",
                paymentFilter === "part_payment_received"
                  ? "bg-amber-700 text-white shadow-2xs font-semibold"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100/80 border border-amber-200/60",
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              {t("customers.payment.partPaymentReceived", "Part Payment Received")}{" "}
              <span className="opacity-75 tabular-nums">
                ({paymentCounts.part_payment_received})
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPaymentFilter("full_payment_received");
                setPage(1);
              }}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-full transition-all shrink-0 flex items-center gap-1.5 cursor-pointer",
                paymentFilter === "full_payment_received"
                  ? "bg-emerald-700 text-white shadow-2xs font-semibold"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80 border border-emerald-200/60",
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {t("customers.payment.fullPaymentReceived", "Full Payment Received")}{" "}
              <span className="opacity-75 tabular-nums">
                ({paymentCounts.full_payment_received})
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPaymentFilter("payment_received");
                setPage(1);
              }}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-full transition-all shrink-0 flex items-center gap-1.5 cursor-pointer",
                paymentFilter === "payment_received"
                  ? "bg-sky-700 text-white shadow-2xs font-semibold"
                  : "bg-sky-50 text-sky-700 hover:bg-sky-100/80 border border-sky-200/60",
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
              {t("customers.payment.advanceRcvd", "Advance / Rcvd")}{" "}
              <span className="opacity-75 tabular-nums">({paymentCounts.payment_received})</span>
            </button>

            {/* Quick CRM Follow-up Triage Chips */}
            {unresponsiveCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter((curr) =>
                    curr === "unresponsive_2plus" ? "all" : "unresponsive_2plus",
                  );
                  setPage(1);
                }}
                className={cn(
                  "px-2.5 py-1 text-xs font-semibold rounded-full transition-all shrink-0 flex items-center gap-1.5 cursor-pointer border ml-auto sm:ml-2",
                  statusFilter === "unresponsive_2plus"
                    ? "bg-rose-700 text-white shadow-2xs border-rose-800"
                    : "bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100/90",
                )}
                title="Filter customers who haven't responded to 2 or more follow-ups"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                <span>⚠️ {t("customers.filter.unresponsiveChip", "Unresponsive (2+)")}</span>
                <span className="rounded-full bg-rose-200/90 px-1 py-0 text-[10px] text-rose-900 font-bold">
                  {toIndicDigits(unresponsiveCount, i18n.language)}
                </span>
              </button>
            )}
            {dormantCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter((curr) => (curr === "dormant" ? "all" : "dormant"));
                  setPage(1);
                }}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-full transition-all shrink-0 flex items-center gap-1.5 cursor-pointer border",
                  statusFilter === "dormant"
                    ? "bg-slate-800 text-white shadow-2xs border-slate-900 font-semibold"
                    : "bg-slate-100 text-slate-700 border-slate-300/80 hover:bg-slate-200",
                )}
                title="Filter dormant customers"
              >
                <UserX className="h-3 w-3 text-slate-500" />
                <span>{t("crm.status.dormant", "Dormant")}</span>
                <span className="opacity-75 tabular-nums">
                  ({toIndicDigits(dormantCount, i18n.language)})
                </span>
              </button>
            )}
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
                    <SelectValue
                      placeholder={t("customers.filter.responseStatus", "Response status")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t("customers.filter.allStatuses", "All statuses")}
                    </SelectItem>
                    <SelectItem value="unresponsive_2plus">
                      <span className="flex items-center gap-1.5 text-rose-700 font-semibold">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0 animate-pulse" />
                        <span>
                          ⚠️{" "}
                          {t("customers.filter.unresponsive2plus", "Unresponsive (2+ follow-ups)")}
                        </span>
                        {unresponsiveCount > 0 && (
                          <span className="rounded-full bg-rose-100 px-1.5 py-0.2 text-[10px] text-rose-900 font-bold">
                            {toIndicDigits(unresponsiveCount, i18n.language)}
                          </span>
                        )}
                      </span>
                    </SelectItem>
                    {(Object.keys(CUSTOMER_RESPONSE_STATUS_CONFIG) as CustomerResponseStatus[]).map(
                      (key) => {
                        const cfg = CUSTOMER_RESPONSE_STATUS_CONFIG[key];
                        return (
                          <SelectItem key={key} value={key}>
                            <span className="flex items-center gap-1.5">
                              <span
                                className={cn("h-1.5 w-1.5 rounded-full shrink-0", cfg.dotColor)}
                              />
                              <span>
                                {getCustomerResponseStatusLabel(key, i18n.language, true)}
                              </span>
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
                    <SelectValue
                      placeholder={t("customers.filter.allCustomerTypes", "All customer types")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t("customers.filter.allCustomerTypes", "All customer types")}
                    </SelectItem>
                    {CUSTOMER_TYPES.map((tItem) => (
                      <SelectItem key={tItem.value} value={tItem.value}>
                        {getCustomerTypeLabel(tItem.value, i18n.language)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={salespersonFilter}
                  onValueChange={(v) => {
                    setSalespersonFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-40 text-xs bg-white">
                    <SelectValue placeholder={t("customers.filter.assignedTo", "Assigned to")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t("customers.filter.allAssignees", "All assignees")}
                    </SelectItem>
                    <SelectItem value="vijay">
                      👤 {transliterateName("Vijay Dave", i18n.language)}
                    </SelectItem>
                    <SelectItem value="rishi">
                      👤 {transliterateName("Rishi Rai", i18n.language)}
                    </SelectItem>
                    <SelectItem value="raman">
                      👤 {transliterateName("Raman Pupneja", i18n.language)}
                    </SelectItem>
                    <SelectItem value="unassigned">
                      {t("customers.filter.unassigned", "Unassigned")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            }
            density={<DensityMenu density={prefs.density} onChange={setDensity} />}
          />

          {query.isLoading ? (
            <SkeletonTable rows={6} columns={8} />
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
              {/* Mobile Responsive Cards View (< sm) */}
              <div className="sm:hidden divide-y divide-border/60">
                {pageRows.map((c, i) => {
                  const norm = normalizeCustomerRow(c);
                  const isLastContacted = lastContacted?.customerId === c.id;
                  const phone =
                    c.primary_phone || (c as unknown as { mobile?: string | null }).mobile || "";
                  const waPhone = c.whatsapp || phone;
                  const cleanPhone = phone.replace(/[^0-9]/g, "");
                  const cleanWaPhone = waPhone.replace(/[^0-9]/g, "");
                  const serial = extractCustomerSerialNumber(c.customer_code);
                  const orderInfo = customerOrderMap.get(c.id);
                  const waFollowupText = buildCustomerFollowupWhatsappMessage({
                    customerName: c.name,
                    contactPerson: norm.contact_person,
                    companyName: norm.company_name,
                    salesperson: getCustomerSalesperson(c),
                    orderNo: orderInfo?.urgentOrderNo,
                  });
                  const waUrl = buildWhatsappUrl(cleanWaPhone, waFollowupText, "wa.me");

                  const handleContactLog = (channel: "whatsapp" | "call") => {
                    const info = {
                      customerId: c.id,
                      channel,
                      timestamp: Date.now(),
                    };
                    setLastContacted(info);
                    try {
                      sessionStorage.setItem("stos_last_contacted_customer", JSON.stringify(info));
                    } catch (err) {
                      console.debug("[customers] sessionStorage write skipped:", err);
                    }
                    logContactMutation.mutate({ customerId: c.id, channel });
                  };

                  const effType = getEffectiveCustomerType(c);

                  return (
                    <div
                      key={c.id}
                      className={cn(
                        "p-3.5 space-y-2.5 bg-card hover:bg-muted/30 transition-colors",
                        isLastContacted &&
                          "bg-emerald-50/80 border-l-4 border-l-emerald-600 ring-1 ring-inset ring-emerald-300/80 shadow-2xs",
                      )}
                    >
                      {/* Header Row: Serial + Name + Actions */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 font-mono text-[11px] font-bold text-slate-700">
                            {toIndicDigits(
                              serial !== null ? serial : rows.length - ((page - 1) * pageSize + i),
                              i18n.language,
                            )}
                          </span>
                          <div className="min-w-0">
                            <Link
                              to="/customers/$customerId"
                              params={{ customerId: c.id }}
                              className="font-semibold text-sm text-foreground hover:underline truncate block"
                            >
                              {transliterateName(c.name, i18n.language)}
                            </Link>
                            {c.customer_code && (
                              <span className="font-mono text-[10px] text-muted-foreground">
                                {toIndicDigits(c.customer_code, i18n.language)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <RowActions
                            canEdit={true}
                            extra={
                              <>
                                <DropdownMenuItem asChild>
                                  <Link to="/enquiries" search={{ new: "1", customer: c.id }}>
                                    <FileText className="mr-2 h-4 w-4 text-emerald-600" /> New
                                    Enquiry
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link to="/quotes" search={{ new: "1", customer: c.id }}>
                                    <FileText className="mr-2 h-4 w-4 text-indigo-600" /> New Quote
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
                        </div>
                      </div>

                      {/* Firm / Contact / Type Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wide whitespace-nowrap",
                            getCustomerTypeBadgeTone(effType),
                          )}
                        >
                          {getCustomerTypeLabel(effType, i18n.language)}
                        </span>
                        {norm.contact_person && (
                          <span className="inline-flex items-center gap-1 rounded bg-teal-50 text-teal-800 border border-teal-200/70 px-1.5 py-0.5 text-[10px] font-medium truncate max-w-[200px]">
                            <User className="h-3 w-3 text-teal-600 shrink-0" />
                            <span className="truncate">
                              {transliterateName(norm.contact_person, i18n.language)}
                            </span>
                          </span>
                        )}
                        {norm.company_name && norm.company_name !== c.name && (
                          <span className="inline-flex items-center gap-1 rounded bg-slate-100 text-slate-700 px-1.5 py-0.5 text-[10px] font-medium truncate max-w-[200px]">
                            <Building2 className="h-3 w-3 text-slate-500 shrink-0" />
                            <span className="truncate">
                              {transliterateName(norm.company_name, i18n.language)}
                            </span>
                          </span>
                        )}
                      </div>

                      {/* Deadline info if active */}
                      {orderInfo?.nearestDeadline &&
                        getCustomerResponseStatus(c) !== "order_completed" &&
                        getCustomerResponseStatus(c) !== "order_cancelled_delay" &&
                        getCustomerResponseStatus(c) !== "order_cancelled_change_of_plans" &&
                        orderInfo.health !== "completed" && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold border",
                                orderInfo.health === "overdue"
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : orderInfo.health === "tight_buffer"
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-emerald-50 text-emerald-700 border-emerald-200",
                              )}
                            >
                              ⏳ Due: {formatDate(orderInfo.nearestDeadline, i18n.language)}
                            </span>
                          </div>
                        )}

                      {/* Selects: CRM Status & Assignee & Payment */}
                      <div className="grid grid-cols-1 gap-2 pt-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-medium text-muted-foreground shrink-0">
                            CRM:
                          </span>
                          <div className="w-52 max-w-full">
                            <CustomerResponseStatusSelect
                              customerId={c.id}
                              customerName={c.name}
                              contactPerson={
                                c.contact_person ||
                                ((c.external_ref as Record<string, unknown> | null)
                                  ?.contact_person as string | undefined)
                              }
                              phone={c.primary_phone || c.whatsapp}
                              whatsapp={c.whatsapp || c.primary_phone}
                              companyName={c.company_name}
                              isActive={c.is_active}
                              workflowState={c.workflow_state}
                              externalRef={c.external_ref}
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-medium text-muted-foreground shrink-0">
                            Assigned:
                          </span>
                          <div className="w-52 max-w-full">
                            <CustomerAssigneeSelect
                              customerId={c.id}
                              customerName={c.name}
                              workflowState={c.workflow_state}
                              externalRef={c.external_ref}
                            />
                          </div>
                        </div>
                        {hasCustomerPlacedOrder(c, orderInfo) && (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-medium text-muted-foreground shrink-0">
                              Payment:
                            </span>
                            <div className="w-52 max-w-full">
                              <CustomerPaymentStatusSelect
                                customerId={c.id}
                                customerName={c.name}
                                workflowState={c.workflow_state}
                                externalRef={c.external_ref}
                                ledgerSummary={ledgerQuery.data?.get(c.id)}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Bottom Action Bar: Call, WhatsApp, View */}
                      <div className="flex items-center justify-between pt-2 border-t border-border/60">
                        <div className="flex items-center gap-1.5">
                          {cleanPhone ? (
                            <a
                              href={`tel:${cleanPhone}`}
                              onClick={() => handleContactLog("call")}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors"
                            >
                              <Phone className="h-3 w-3 text-slate-600" />
                              <span>Call</span>
                            </a>
                          ) : null}
                          {cleanWaPhone ? (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => handleContactLog("whatsapp")}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors"
                            >
                              <MessageSquare className="h-3 w-3 text-emerald-600" />
                              <span>WhatsApp</span>
                            </a>
                          ) : null}
                        </div>
                        <Link
                          to="/customers/$customerId"
                          params={{ customerId: c.id }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        >
                          <span>Hub</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View (>= sm) */}
              <div className="hidden sm:block">
                <Table className="w-full table-fixed min-w-[1020px] table-sticky-head">
                  <TableHeader sticky className="bg-white/95 backdrop-blur-xs">
                    <TableRow>
                      <TableHead className="w-12 text-center px-1">
                        {t("common.srNo", "Sr. No.")}
                      </TableHead>
                      <TableHead className="min-w-[180px] px-2">
                        {t("common.name", "Name")}
                      </TableHead>
                      <TableHead className="w-22 whitespace-nowrap px-1.5">
                        {t("common.createdDate", "Created")}
                      </TableHead>
                      <TableHead className="w-26 whitespace-nowrap px-1.5">
                        {t("customers.table.type", "Type")}
                      </TableHead>
                      <TableHead className="min-w-[190px] whitespace-nowrap px-1.5">
                        {t("customers.table.crmStatus", "CRM Status & Updates")}
                      </TableHead>
                      <TableHead className="w-32 whitespace-nowrap px-1.5 overflow-hidden">
                        {t("customers.table.assignedTo", "Assigned To")}
                      </TableHead>
                      <TableHead className="w-34 whitespace-nowrap px-1.5 overflow-hidden">
                        {t("customers.table.paymentStatus", "Payment Status")}
                      </TableHead>
                      <TableHead className="w-44 whitespace-nowrap px-1.5">
                        {t("customers.table.contact", "Contact")}
                      </TableHead>
                      <TableHead className="w-10 text-right px-1" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageRows.map((c, i) => {
                      const norm = normalizeCustomerRow(c);
                      const stats = getCustomerFollowupStats(c);
                      const isLastContacted = lastContacted?.customerId === c.id;
                      const phone =
                        c.primary_phone ||
                        (c as unknown as { mobile?: string | null }).mobile ||
                        "";
                      const waPhone = c.whatsapp || phone;
                      const cleanPhone = phone.replace(/[^0-9]/g, "");
                      const cleanWaPhone = waPhone.replace(/[^0-9]/g, "");
                      const serial = extractCustomerSerialNumber(c.customer_code);
                      const orderInfo = customerOrderMap.get(c.id);
                      const waFollowupText = buildCustomerFollowupWhatsappMessage({
                        customerName: c.name,
                        contactPerson: norm.contact_person,
                        companyName: norm.company_name,
                        salesperson: getCustomerSalesperson(c),
                        orderNo: orderInfo?.urgentOrderNo,
                      });
                      const waUrl = buildWhatsappUrl(cleanWaPhone, waFollowupText, "wa.me");

                      const handleContactLog = (channel: "whatsapp" | "call") => {
                        const info = {
                          customerId: c.id,
                          channel,
                          timestamp: Date.now(),
                        };
                        setLastContacted(info);
                        try {
                          sessionStorage.setItem(
                            "stos_last_contacted_customer",
                            JSON.stringify(info),
                          );
                        } catch (err) {
                          console.debug("[customers] sessionStorage write skipped:", err);
                        }
                        logContactMutation.mutate({ customerId: c.id, channel });
                      };

                      return (
                        <TableRow
                          key={c.id}
                          className={cn(
                            "transition-colors",
                            isLastContacted &&
                              "bg-emerald-50/85 hover:bg-emerald-100/80 border-l-4 border-l-emerald-600 ring-1 ring-inset ring-emerald-300/80 shadow-2xs",
                          )}
                        >
                          <TableCell className="w-12 text-center font-mono text-xs text-muted-foreground px-1">
                            <Link
                              to="/customers/$customerId"
                              params={{ customerId: c.id }}
                              className="hover:underline font-semibold text-slate-700"
                            >
                              {toIndicDigits(
                                serial !== null
                                  ? serial
                                  : rows.length - ((page - 1) * pageSize + i),
                                i18n.language,
                              )}
                            </Link>
                          </TableCell>
                          <TableCell className="min-w-[180px] font-medium px-2">
                            <Link
                              to="/customers/$customerId"
                              params={{ customerId: c.id }}
                              className="hover:underline flex flex-col gap-0.5 py-0.5"
                            >
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-semibold text-slate-900 truncate">
                                  {transliterateName(c.name, i18n.language)}
                                </span>
                                {c.customer_code && (
                                  <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                                    ({toIndicDigits(c.customer_code, i18n.language)})
                                  </span>
                                )}
                                {isLastContacted && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs shrink-0 animate-in fade-in">
                                    {lastContacted.channel === "whatsapp"
                                      ? t("customers.justMessagedBadge", "Just Messaged")
                                      : t("customers.justCalledBadge", "Just Called")}
                                  </span>
                                )}
                                {orderInfo?.nearestDeadline &&
                                  getCustomerResponseStatus(c) !== "order_completed" &&
                                  getCustomerResponseStatus(c) !== "order_cancelled_delay" &&
                                  getCustomerResponseStatus(c) !==
                                    "order_cancelled_change_of_plans" &&
                                  orderInfo.health !== "completed" && (
                                    <span
                                      className={cn(
                                        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold border shrink-0",
                                        orderInfo.health === "overdue"
                                          ? "bg-rose-50 text-rose-700 border-rose-200"
                                          : orderInfo.health === "tight_buffer"
                                            ? "bg-amber-50 text-amber-700 border-amber-200"
                                            : "bg-emerald-50 text-emerald-700 border-emerald-200",
                                      )}
                                      title={`Order #${orderInfo.urgentOrderNo ?? ""}`}
                                    >
                                      ⏳ {t("common.due", "Due")}:{" "}
                                      {formatDate(orderInfo.nearestDeadline, i18n.language)}
                                    </span>
                                  )}
                                {(() => {
                                  const payReminder = getCustomerPaymentReminderInfo(c);
                                  if (!payReminder.hasReminder || !payReminder.isFlaggedActive)
                                    return null;
                                  return (
                                    <span
                                      className={cn(
                                        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold border shrink-0",
                                        payReminder.urgency === "overdue"
                                          ? "bg-rose-100 text-rose-800 border-rose-300 animate-pulse"
                                          : payReminder.urgency === "due_today"
                                            ? "bg-amber-100 text-amber-900 border-amber-400 font-bold animate-pulse"
                                            : "bg-amber-50 text-amber-900 border-amber-300 font-semibold",
                                      )}
                                      title={`Payment Promised Date: ${payReminder.promisedDate ? formatDate(payReminder.promisedDate) : ""}`}
                                    >
                                      💰 {payReminder.badgeLabel}
                                    </span>
                                  );
                                })()}
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 text-xs font-normal">
                                {norm.contact_person && (
                                  <span className="inline-flex items-center gap-1 rounded bg-teal-50 text-teal-800 border border-teal-200/70 px-1.5 py-0.5 text-[11px] font-medium truncate max-w-full">
                                    <User className="h-3 w-3 text-teal-600 shrink-0" />
                                    <span className="truncate">
                                      {t("customers.contactPrefix", "Contact")}:{" "}
                                      <strong className="font-semibold text-teal-900">
                                        {transliterateName(norm.contact_person, i18n.language)}
                                      </strong>
                                    </span>
                                  </span>
                                )}
                                {norm.company_name && norm.company_name !== c.name && (
                                  <span className="inline-flex items-center gap-1 rounded bg-slate-100 text-slate-700 px-1.5 py-0.5 text-[11px] font-medium truncate max-w-full">
                                    <Building2 className="h-3 w-3 text-slate-500 shrink-0" />
                                    <span className="truncate">
                                      {t("customers.firmPrefix", "Firm")}:{" "}
                                      {transliterateName(norm.company_name, i18n.language)}
                                    </span>
                                  </span>
                                )}
                              </div>
                            </Link>
                          </TableCell>
                          <TableCell className="w-22 text-xs text-muted-foreground whitespace-nowrap px-1.5">
                            {c.created_at ? formatDate(c.created_at, i18n.language) : "—"}
                          </TableCell>
                          <TableCell className="w-26 whitespace-nowrap px-1.5">
                            {(() => {
                              const effType = getEffectiveCustomerType(c);
                              return (
                                <span
                                  className={cn(
                                    "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-wide whitespace-nowrap",
                                    getCustomerTypeBadgeTone(effType),
                                  )}
                                >
                                  {getCustomerTypeLabel(effType, i18n.language)}
                                </span>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="min-w-[190px] px-1.5 align-middle">
                            <div className="flex flex-col items-start gap-1">
                              <CustomerResponseStatusSelect
                                customerId={c.id}
                                customerName={c.name}
                                contactPerson={
                                  c.contact_person ||
                                  ((c.external_ref as Record<string, unknown> | null)
                                    ?.contact_person as string | undefined)
                                }
                                phone={c.primary_phone || c.whatsapp}
                                whatsapp={c.whatsapp || c.primary_phone}
                                companyName={c.company_name}
                                isActive={c.is_active}
                                workflowState={c.workflow_state}
                                externalRef={c.external_ref}
                              />
                              {stats.isUnresponsive &&
                                getCustomerResponseStatus(c) !== "dormant" && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markDormantMutation.mutate(c.id);
                                    }}
                                    disabled={markDormantMutation.isPending}
                                    className="inline-flex items-center gap-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300/80 px-1.5 py-0.5 text-[10px] font-semibold transition-colors cursor-pointer shadow-2xs touch-manipulation"
                                    title={`Unresponsive after ${toIndicDigits(stats.totalFollowups, i18n.language)} follow-ups. Click to mark Dormant.`}
                                  >
                                    <UserX className="h-3 w-3 text-rose-600 shrink-0" />
                                    <span>{t("crm.markDormant", "Mark Dormant")}</span>
                                    <span className="rounded-full bg-rose-200/90 px-1 py-0 text-[9px] font-bold text-rose-900">
                                      {toIndicDigits(stats.totalFollowups, i18n.language)}
                                    </span>
                                  </button>
                                )}
                            </div>
                          </TableCell>
                          <TableCell className="w-32 whitespace-nowrap px-1.5 overflow-hidden">
                            <CustomerAssigneeSelect
                              customerId={c.id}
                              customerName={c.name}
                              workflowState={c.workflow_state}
                              externalRef={c.external_ref}
                            />
                          </TableCell>
                          <TableCell className="w-34 whitespace-nowrap px-1.5 overflow-hidden">
                            {(() => {
                              if (!hasCustomerPlacedOrder(c, orderInfo)) {
                                return (
                                  <span
                                    className="text-slate-400 font-mono text-xs pl-2"
                                    title="No orders placed"
                                  >
                                    —
                                  </span>
                                );
                              }
                              const ledger = ledgerQuery.data?.get(c.id);
                              return (
                                <CustomerPaymentStatusSelect
                                  customerId={c.id}
                                  customerName={c.name}
                                  workflowState={c.workflow_state}
                                  externalRef={c.external_ref}
                                  ledgerSummary={ledger}
                                />
                              );
                            })()}
                          </TableCell>
                          <TableCell className="w-44 whitespace-nowrap px-1.5 align-middle">
                            {phone ? (
                              <div className="flex flex-col gap-1 py-0.5">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <a
                                    href={`tel:${phone}`}
                                    onClick={() => handleContactLog("call")}
                                    title={`Call ${phone} (auto-registers call follow-up)`}
                                    className="inline-flex items-center gap-1 text-slate-700 hover:text-primary font-mono transition-colors font-medium"
                                  >
                                    <Phone className="h-3 w-3 text-emerald-600 shrink-0" />
                                    <span className="truncate">
                                      {toIndicDigits(phone, i18n.language)}
                                    </span>
                                  </a>
                                  {(cleanWaPhone || cleanPhone) && (
                                    <a
                                      href={waUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={() => handleContactLog("whatsapp")}
                                      title={`Send follow-up on WhatsApp to ${norm.contact_person || c.name} (auto-registers WhatsApp follow-up)`}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 text-[10.5px] font-medium transition-colors shrink-0 shadow-2xs"
                                    >
                                      <MessageSquare className="h-3 w-3 text-emerald-600" />
                                      <span className="hidden sm:inline">WhatsApp</span>
                                    </a>
                                  )}
                                </div>

                                {/* Follow-up count and relative time */}
                                <div className="flex items-center gap-1 text-[10px]">
                                  {stats.totalFollowups > 0 ? (
                                    <span
                                      className={cn(
                                        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 border text-[10px]",
                                        isLastContacted
                                          ? "bg-emerald-100/90 border-emerald-300 text-emerald-950 font-bold"
                                          : "bg-slate-50 border-slate-200/90 text-slate-600",
                                      )}
                                      title={`${toIndicDigits(stats.whatsappCount, i18n.language)} WhatsApp · ${toIndicDigits(stats.callCount, i18n.language)} Call(s). Last: ${stats.lastContactedAt ? formatDate(stats.lastContactedAt, i18n.language) : "Never"}`}
                                    >
                                      <span className="font-semibold text-slate-800">
                                        {toIndicDigits(stats.totalFollowups, i18n.language)} flw-up
                                        {stats.totalFollowups > 1 ? "s" : ""}
                                      </span>
                                      <span className="text-slate-300">·</span>
                                      <span className="text-muted-foreground whitespace-nowrap">
                                        {formatRelativeContactTime(
                                          stats.lastContactedAt,
                                          i18n.language,
                                        )}
                                      </span>
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic">
                                      {t("customers.noFollowupsYet", "No follow-ups yet")}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">
                                {t("customers.noPhone", "No phone")}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="w-10 text-right px-1">
                            <RowActions
                              extra={
                                <>
                                  <DropdownMenuItem asChild>
                                    <Link to="/customers/$customerId" params={{ customerId: c.id }}>
                                      <ExternalLink className="mr-2 h-4 w-4" />{" "}
                                      {t("common.open", "Open")}
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link to="/projects" search={{ new: "1", customer: c.id }}>
                                      <FolderPlus className="mr-2 h-4 w-4 text-indigo-600" /> Add
                                      Next Project
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link to="/quotes" search={{ new: "1", customer: c.id }}>
                                      <FileText className="mr-2 h-4 w-4 text-emerald-600" /> New
                                      Quote
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link to="/sales-orders/new" search={{ customer: c.id }}>
                                      <ShoppingCart className="mr-2 h-4 w-4 text-amber-600" /> New
                                      Sales Order
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {getCustomerResponseStatus(c) !== "dormant" ? (
                                    <DropdownMenuItem
                                      onClick={() => markDormantMutation.mutate(c.id)}
                                    >
                                      <UserX className="mr-2 h-4 w-4 text-rose-600" />
                                      {t("crm.markDormant", "Mark Dormant (Unresponsive)")}
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      onClick={() => reactivateMutation.mutate(c.id)}
                                    >
                                      <UserCheck className="mr-2 h-4 w-4 text-emerald-600" />
                                      {t("crm.reactivateAccount", "Reactivate Account")}
                                    </DropdownMenuItem>
                                  )}
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
              </div>
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
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [form, setForm] = useState<CustomerCreateInput>(emptyForm);
  const [contacts, setContacts] = useState<CustomerContactInput[]>([]);
  const [baseline, setBaseline] = useState<string>(() =>
    JSON.stringify({ form: emptyForm(), contacts: [] }),
  );
  const [nameReflectionMode, setNameReflectionMode] = useState<NameReflectionMode>("smart");
  const [selectedSalesperson, setSelectedSalesperson] = useState<CustomerSalespersonKey | null>(
    null,
  );
  const dirty = JSON.stringify({ form, contacts }) !== baseline;

  useEffect(() => {
    if (!open) return;
    if (editing) {
      const next = fromRow(editing);
      setForm(next);
      setBaseline(JSON.stringify({ form: next, contacts: [] }));
      getCustomerContacts(editing.id)
        .then((saved) => {
          const mapped: CustomerContactInput[] = saved.map((c) => ({
            id: c.id,
            name: c.name,
            phone: c.phone ?? "",
            designation: c.designation ?? "other",
            email: c.email ?? "",
            is_primary: c.is_primary,
          }));
          setContacts(mapped);
          setBaseline(JSON.stringify({ form: next, contacts: mapped }));
        })
        .catch(() => setContacts([]));

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
      setContacts([]);
      setBaseline(JSON.stringify({ form: next, contacts: [] }));
      setNameReflectionMode(voiceExtractedData.recommendedReflectionMode);
    } else {
      const next = emptyForm();
      setForm(next);
      setContacts([]);
      setBaseline(JSON.stringify({ form: next, contacts: [] }));
      setNameReflectionMode("smart");
    }
    setSelectedSalesperson(null);
  }, [open, editing, voiceExtractedData]);

  const addEmptyContact = () => {
    setContacts((prev) => [...prev, { name: "", phone: "", designation: "Site Engineer" }]);
  };

  const updateContact = (idx: number, patch: Partial<CustomerContactInput>) => {
    setContacts((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };

  const removeContact = (idx: number) => {
    setContacts((prev) => prev.filter((_, i) => i !== idx));
  };

  const mutation = useMutation({
    mutationFn: (input: CustomerCreateInput) =>
      editing ? updateCustomer(editing.id, input) : createCustomer(input),
    onSuccess: (row) => {
      toast.success(editing ? "Customer updated" : `Customer ${row.customer_code} created`);
      if (!editing) {
        if (selectedSalesperson) {
          void updateCustomerSalesperson({
            customerId: row.id,
            salesperson: selectedSalesperson,
          });
        }
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
      void qc.invalidateQueries({ queryKey: ["hub", "customer", row.id, "contacts"] });
      onOpenChange(false);
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = customerCreateSchema.safeParse({ ...form, contacts });
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

  const toggleMaterial = (value: string, checked: boolean) =>
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
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pr-8">
          <DialogTitle>
            {editing ? `Edit ${editing.name}` : t("customers.newCustomer", "New customer")}
          </DialogTitle>
          {!editing && (
            <div className="flex items-center gap-2">
              <PhonebookPickerButton
                size="xs"
                onContactSelected={(contact) => {
                  if (contact.name) {
                    handleContactChange(contact.name);
                  }
                  if (contact.mobile) {
                    set("mobile", contact.mobile);
                    set("whatsapp", contact.mobile);
                  }
                  if (contact.email) {
                    set("email", contact.email);
                  }
                }}
              />
              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                Voice fill:
              </span>
              <StoreVoiceAssistantTab compact onCustomerExtracted={handleInDialogVoice} />
            </div>
          )}
        </DialogHeader>

        {/* If voice data was populated, show noticeable banner asking employee to review & edit before saving */}
        {voiceExtractedData && (
          <div className="rounded-lg border border-teal-200/90 bg-gradient-to-r from-teal-50 via-cyan-50 to-emerald-50 p-3 text-xs text-teal-950 flex items-start gap-2.5 shadow-xs">
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-teal-900">
                  {t(
                    "customers.voiceDataAutoFilled",
                    "Voice Data Auto-Filled — Review & Edit Before Saving",
                  )}
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
                autoComplete="off"
                name="stos_contact_person_manual"
                id="stos_contact_person_field"
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
                autoComplete="off"
                name="stos_company_name_manual"
                id="stos_company_name_field"
              />
            </Field>

            {/* 3. Reflected Customer Name + Title Format Selector */}
            <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <span>{t("common.name", "Customer Name (Directory & Invoices)")}</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    {t(
                      "customers.reflectedNameHint",
                      "Titled name shown on quotes, orders, and dashboard list",
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                  <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
                    {t("customers.format", "Format:")}
                  </span>
                  <Select
                    value={nameReflectionMode}
                    onValueChange={(v) => handleReflectionModeChange(v as NameReflectionMode)}
                  >
                    <SelectTrigger className="h-7 w-auto min-w-[190px] text-xs bg-white font-medium border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="smart">
                        {t("customers.reflectionSmart", "Smart (Firm if present, else Contact)")}
                      </SelectItem>
                      <SelectItem value="firm">
                        {t("customers.reflectionFirm", "Firm / Company Name")}
                      </SelectItem>
                      <SelectItem value="contact">
                        {t("customers.reflectionContact", "Contact Person's Name")}
                      </SelectItem>
                      <SelectItem value="combined">
                        {t("customers.reflectionBoth", "Both (Firm · Contact Person)")}
                      </SelectItem>
                      <SelectItem value="custom">
                        {t("customers.reflectionCustom", "Custom / Manual")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Input
                value={form.name}
                onChange={(e) => {
                  setNameReflectionMode("custom");
                  set("name", e.target.value);
                }}
                placeholder="e.g. ABC Developers LLP or Ramesh Patel"
                required
                autoComplete="off"
                name="stos_reflected_name_manual"
                id="stos_reflected_name_field"
              />
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

            {editing ? (
              <div className="md:col-span-2 rounded-lg border border-cyan-200 bg-cyan-50/60 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <label className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-cyan-700" />
                    <span>Assigned Salesperson</span>
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Assign this customer account to Rishi or Raman
                  </p>
                </div>
                <CustomerAssigneeSelect
                  customerId={editing.id}
                  customerName={editing.name}
                  workflowState={editing.workflow_state}
                  externalRef={editing.external_ref}
                  size="default"
                  variant="button"
                />
              </div>
            ) : (
              <div className="md:col-span-2 rounded-lg border border-teal-200 bg-teal-50/60 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <label className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-teal-700" />
                    <span>Assigned Salesperson</span>
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Assign this customer account to Rishi or Raman
                  </p>
                </div>
                <Select
                  value={selectedSalesperson ?? "unassigned"}
                  onValueChange={(val) =>
                    setSelectedSalesperson(
                      val === "unassigned" ? null : (val as CustomerSalespersonKey),
                    )
                  }
                >
                  <SelectTrigger className="h-8 w-48 text-xs bg-white">
                    <SelectValue placeholder="Select salesperson" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    <SelectItem value="rishi">
                      👤 {transliterateName("Rishi Rai", i18n.language)}
                    </SelectItem>
                    <SelectItem value="raman">
                      👤 {transliterateName("Raman Pupneja", i18n.language)}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

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
              hint={t("customers.phoneHint", "Select country code & enter mobile number")}
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
                  ? t("customers.whatsappHintMobile", "Defaults to Phone Number")
                  : t("customers.whatsappHintDigits", "10 digits or +country code")
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
                {(!form.mobile || (form.whatsapp && form.whatsapp !== form.mobile)) && (
                  <PhoneInput
                    value={form.whatsapp ?? ""}
                    onChange={(v) => set("whatsapp", v)}
                    placeholder={t("customers.whatsappNumber", "WhatsApp number (+country code)")}
                  />
                )}
              </div>
            </Field>

            {/* Multiple Contacts section with "+ Add a contact" */}
            <div className="md:col-span-2 rounded-lg border border-slate-200/90 bg-slate-50/70 p-3.5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    <span>{t("customers.additionalContacts", "Additional Contacts")}</span>
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    {t(
                      "customers.additionalContactsHint",
                      "Add multiple contacts with name, phone number, and designation manually",
                    )}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addEmptyContact}
                  className="h-8 text-xs font-medium bg-white hover:bg-slate-100"
                >
                  <Plus className="mr-1 h-3.5 w-3.5 text-primary" />{" "}
                  {t("customers.addContactBtn", "+ Add a contact")}
                </Button>
              </div>

              {contacts.length === 0 ? (
                <div className="text-center py-2.5 text-xs text-muted-foreground border border-dashed rounded-md bg-white/70">
                  {t(
                    "customers.noContactsYet",
                    "No additional contacts yet. Click + Add a contact to add site engineers, architects, managers, etc.",
                  )}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {contacts.map((contact, idx) => (
                    <div
                      key={contact.id ?? `contact-${idx}`}
                      className="grid grid-cols-12 gap-2.5 items-center bg-white p-2.5 rounded-md border border-slate-200 shadow-xs"
                    >
                      <div className="col-span-12 sm:col-span-4">
                        <label className="text-[10px] font-medium text-muted-foreground mb-1 block">
                          {t("customers.contactNameLabel", "Contact Name *")}
                        </label>
                        <Input
                          placeholder="e.g. Vikram Sharma"
                          value={contact.name}
                          onChange={(e) => updateContact(idx, { name: e.target.value })}
                          className="h-8 text-xs"
                          required
                        />
                      </div>
                      <div className="col-span-12 sm:col-span-4">
                        <label className="text-[10px] font-medium text-muted-foreground mb-1 block">
                          {t("common.phone", "Phone Number")}
                        </label>
                        <PhoneInput
                          placeholder={t(
                            "customers.contactPhonePlaceholder",
                            "Phone / Mobile (+country code)",
                          )}
                          value={contact.phone ?? ""}
                          onChange={(v) => updateContact(idx, { phone: v })}
                        />
                      </div>
                      <div className="col-span-10 sm:col-span-3">
                        <label className="text-[10px] font-medium text-muted-foreground mb-1 block">
                          {t("common.designation", "Designation")}
                        </label>
                        <Input
                          placeholder="e.g. Site Engineer"
                          value={contact.designation ?? ""}
                          onChange={(e) => updateContact(idx, { designation: e.target.value })}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1 flex items-end justify-end pt-3 sm:pt-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeContact(idx)}
                          title="Remove contact"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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

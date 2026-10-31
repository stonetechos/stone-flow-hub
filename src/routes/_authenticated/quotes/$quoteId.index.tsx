import { dispatchSystemNotification } from "@/lib/notifications/systemNotifications.functions";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useDetailHotkeys } from "@/hooks/use-detail-hotkeys";
import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader2,
  ArrowRightCircle,
  Pencil,
  Trash2,
  ShoppingCart,
  Share2,
  FolderOpen,
  History,
  UserCheck,
  Copy,
  CheckCircle2,
  Truck,
  Send,
  MessageCircle,
  Image as ImageIcon,
  Eye,
  Sparkles,
  Boxes,
  Building2,
  PackageCheck,
  AlertTriangle,
  ShieldCheck,
  FileText,
} from "lucide-react";

import { QuoteTermsManager } from "@/components/quotes/QuoteTermsManager";
import {
  generateQuoteTerms,
  detectDealScopeFromItems,
  detectClientProvidedSlabFromItems,
  ADVANCE_PAYMENT_THRESHOLD_INR,
  type DealScope,
} from "@/lib/quotes/terms";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  resolveAllQuoteImages,
  getLineItemImage,
  getQuoteGalleryImages,
} from "@/lib/quotes/quote-images";

import { TransferOwnershipDialog } from "@/components/ownership/TransferOwnershipDialog";
import { ReassignCustomerDialog } from "@/components/quotes/ReassignCustomerDialog";
import { QuoteSendRfqDialog } from "@/components/rfqs/QuoteSendRfqDialog";
import { AssignQuoteVendorDialog } from "@/components/quotes/AssignQuoteVendorDialog";
import { CustomerAssigneeSelect } from "@/components/customers/CustomerAssigneeSelect";
import { parseQuoteVendorAssignment } from "@/lib/quotes/vendor-assignment";
import { useRoles } from "@/hooks/use-roles";
import { DetailActionBar } from "@/components/entity/DetailActionBar";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EntityInsightPanel } from "@/components/insights/EntityInsightPanel";
import { GuidedNextStep } from "@/components/guided-workflow/GuidedNextStep";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { DocumentToolbar } from "@/components/documents/DocumentToolbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import { AttachmentsPanel, NotesPanel, TimelinePanel } from "@/components/entity/DetailPanels";
import { ScheduleFollowupPanel } from "@/components/followups/ScheduleFollowupPanel";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import {
  convertQuoteToInvoice,
  convertQuoteToSalesOrder,
  deleteQuote,
  getEstimateForQuote,
  getQuote,
  getQuoteItems,
  getSalesOrderForQuote,
  reviseQuote,
  setQuoteStatus,
  updateQuote,
} from "@/lib/quotes/api";
import { formatInr } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getQuoteSaleMode, getQuoteHybridSplit, SALE_MODE_CONFIG } from "@/lib/quotes/sale-mode";
import type { DbTable } from "@/lib/types";
import { invalidateQuote, invalidateInvoice, invalidateSalesOrder } from "@/lib/query-invalidation";
import { getDispatchesForQuotes, listDispatchItems } from "@/lib/dispatch/api";
import { compareQuoteAndDispatchItems, type ProductVarianceItem } from "@/lib/dispatch/variance";

type QuoteStatus = DbTable<"quotes">["status"];

export const Route = createFileRoute("/_authenticated/quotes/$quoteId/")({
  ssr: false,
  component: QuoteDetailPage,
});

function QuoteDetailPage() {
  const { quoteId } = Route.useParams();
  const qc = useQueryClient();
  const nav = useNavigate();
  useDetailHotkeys({ onBack: () => nav({ to: "/quotes" }) });
  const [confirmDel, setConfirmDel] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [rfqOpen, setRfqOpen] = useState(false);
  const [assignVendorOpen, setAssignVendorOpen] = useState(false);
  const roles = useRoles();
  const canReassign = roles.isAdmin || roles.isSalesManager;

  const q = useQuery({ queryKey: qk.quotes.byId(quoteId), queryFn: () => getQuote(quoteId) });
  const items = useQuery({
    queryKey: qk.quotes.items(quoteId),
    queryFn: () => getQuoteItems(quoteId),
  });
  const linkedSo = useQuery({
    queryKey: ["quotes", "linkedSalesOrder", quoteId],
    queryFn: () => getSalesOrderForQuote(quoteId),
    enabled: Boolean(q.data),
  });
  const sourceEstimateId = q.data?.estimate_id ?? null;
  const sourceEstimate = useQuery({
    queryKey: ["quotes", "sourceEstimate", sourceEstimateId ?? ""],
    queryFn: () => (sourceEstimateId ? getEstimateForQuote(sourceEstimateId) : null),
    enabled: !!sourceEstimateId,
  });

  const linkedDispatches = useQuery({
    queryKey: ["quotes", quoteId, "dispatches"],
    queryFn: async () => {
      const map = await getDispatchesForQuotes([quoteId]);
      return map[quoteId] ?? [];
    },
    enabled: Boolean(q.data),
  });
  const quoteDispatches = linkedDispatches.data ?? [];
  const primaryDispatch = quoteDispatches[0] ?? null;

  const dispatchItemsQ = useQuery({
    queryKey: ["dispatch", primaryDispatch?.id, "items"],
    queryFn: () => (primaryDispatch ? listDispatchItems(primaryDispatch.id) : []),
    enabled: !!primaryDispatch?.id,
  });

  const varianceReport = useMemo(() => {
    if (!items.data || !dispatchItemsQ.data || dispatchItemsQ.data.length === 0) return null;
    return compareQuoteAndDispatchItems(items.data, dispatchItemsQ.data);
  }, [items.data, dispatchItemsQ.data]);

  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [termsDialogOpen, setTermsDialogOpen] = useState(false);
  const [editingTerms, setEditingTerms] = useState("");
  const [editingScope, setEditingScope] = useState<DealScope>("supply_only");

  const detectedScope: DealScope = useMemo(() => {
    if (q.data?.category === "supply_and_installation") return "supply_and_installation";
    return detectDealScopeFromItems(items.data ?? []);
  }, [q.data?.category, items.data]);

  const updateTermsMut = useMutation({
    mutationFn: (newTerms: string) => updateQuote(quoteId, { terms: newTerms }),
    onSuccess: () => {
      toast.success("Quotation terms updated");
      invalidateQuote(qc, quoteId);
      setTermsDialogOpen(false);
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const openTermsDialog = () => {
    setEditingScope(detectedScope);
    setEditingTerms(q.data?.terms && q.data.terms.trim() ? q.data.terms.trim() : "");
    setTermsDialogOpen(true);
  };

  const quoteImages = useQuery({
    queryKey: ["quotes", "images", quoteId],
    queryFn: () => resolveAllQuoteImages(q.data, items.data ?? []),
    enabled: Boolean(q.data && items.data),
  });

  const statusMut = useMutation({
    mutationFn: (s: QuoteStatus) => setQuoteStatus(quoteId, s),
    onSuccess: (_, s) => {
      toast.success("Status updated");
      if (s === "accepted") {
        void dispatchSystemNotification({
          scope: "broadcast",
          tier: "important",
          title: "Quotation Approved",
          body: `A quotation has been approved: ${q.data?.quote_no ?? "Quotation"} for ${q.data?.customer?.name ?? "Customer"}.`,
          entityType: "quote",
          entityId: quoteId,
          linkPath: `/quotes/${quoteId}`,
        });
      }
      invalidateQuote(qc, quoteId);
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const convertMut = useMutation({
    mutationFn: () => convertQuoteToInvoice({ quote_id: quoteId }),
    onSuccess: (inv) => {
      toast.success(`Invoice ${inv.invoice_no} created`);
      invalidateQuote(qc, quoteId);
      invalidateInvoice(qc);
      nav({ to: "/invoices/$invoiceId", params: { invoiceId: inv.id } });
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const delMut = useMutation({
    mutationFn: () => deleteQuote(quoteId),
    onSuccess: () => {
      toast.success("Quote deleted");
      qc.invalidateQueries({ queryKey: qk.quotes.all });
      nav({ to: "/quotes" });
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const reviseMut = useMutation({
    mutationFn: () => reviseQuote(quoteId),
    onSuccess: (rev) => {
      toast.success(`Revision ${rev.quote_no} created as draft`);
      qc.invalidateQueries({ queryKey: qk.quotes.all });
      nav({ to: "/quotes/$quoteId/edit", params: { quoteId: rev.id } });
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const soMut = useMutation({
    mutationFn: () => convertQuoteToSalesOrder(quoteId),
    onSuccess: (so) => {
      toast.success(`Sales order ${so.so_no} created`);
      invalidateSalesOrder(qc, so.id);
      qc.invalidateQueries({ queryKey: ["quotes", "linkedSalesOrder", quoteId] });
      nav({ to: "/sales-orders/$id", params: { id: so.id } });
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  if (q.isLoading) return <LoadingBlock />;
  if (q.error) return <ErrorBlock message={toUserMessage(q.error)} onRetry={() => q.refetch()} />;
  if (!q.data) return <ErrorBlock message="Quote not found." />;

  const quote = q.data;
  const canConvert = quote.status === "accepted";
  const isDraft = quote.status === "draft";
  const isAccepted = quote.status === "accepted";
  const saleMode = getQuoteSaleMode(quote);
  const hybridSplit = getQuoteHybridSplit(quote);
  const assignment = parseQuoteVendorAssignment(quote, linkedSo.data);

  return (
    <div>
      <div className="mb-2">
        <Link
          to="/quotes"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Back to quotes
        </Link>
      </div>

      <PageHeader
        title={quote.quote_no}
        subtitle={
          <div className="flex items-center gap-2 flex-wrap">
            <span>{`${quote.project?.name ?? "—"} • ${quote.customer?.name ?? "—"}`}</span>
            {quote.customer?.id && (
              <CustomerAssigneeSelect
                customerId={quote.customer.id}
                customerName={quote.customer.name}
                workflowState={quote.customer.workflow_state}
                externalRef={(quote.customer as { external_ref?: unknown })?.external_ref}
                size="sm"
              />
            )}
            {saleMode !== "invoiced" && (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                  SALE_MODE_CONFIG[saleMode].badgeTone,
                )}
              >
                <span
                  className={cn("h-1.5 w-1.5 rounded-full", SALE_MODE_CONFIG[saleMode].dotColor)}
                />
                {SALE_MODE_CONFIG[saleMode].label}
              </span>
            )}
            {assignment.fulfilmentType === "in_stock" ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                <Boxes className="h-3 w-3 text-emerald-600" /> Live Stock (
                {assignment.stockLocation || "Main Yard"})
              </span>
            ) : assignment.isAssigned ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-800 border border-cyan-300 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800">
                <Building2 className="h-3 w-3 text-cyan-600" /> Vendor: {assignment.vendorName}
              </span>
            ) : null}
          </div>
        }
        actions={
          <DetailActionBar
            pin={{ entityType: "quote", entityId: quoteId, label: quote.quote_no }}
            primary={
              <>
                <Button
                  size="sm"
                  variant={isDraft ? "default" : "outline"}
                  onClick={() => nav({ to: "/quotes/$quoteId/edit", params: { quoteId } })}
                >
                  <Pencil className="mr-1.5 h-4 w-4" /> Edit
                </Button>

                {!isAccepted && (
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                    onClick={() => statusMut.mutate("accepted")}
                    disabled={statusMut.isPending}
                  >
                    {statusMut.isPending ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    )}
                    Approve
                  </Button>
                )}

                {isAccepted && (
                  <Button
                    size="sm"
                    className={
                      primaryDispatch
                        ? "border-emerald-600/60 text-emerald-800 bg-emerald-50/60 hover:bg-emerald-100 dark:border-emerald-700/60 dark:text-emerald-300 shadow-xs"
                        : saleMode === "cash"
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                          : "bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                    }
                    variant={primaryDispatch ? "outline" : "default"}
                    onClick={() => {
                      if (primaryDispatch) {
                        nav({ to: "/dispatch/$id", params: { id: primaryDispatch.id } });
                      } else {
                        nav({
                          to: "/dispatch/new",
                          search: {
                            quote: quoteId,
                            customer: quote.customer_id,
                            ...(linkedSo.data ? { so: linkedSo.data.id } : {}),
                          },
                        });
                      }
                    }}
                    title={
                      primaryDispatch
                        ? `View Delivery Challan ${primaryDispatch.dispatch_no}`
                        : saleMode === "cash"
                          ? "Issue Delivery Challan for cash transaction (no tax invoice)"
                          : "Raise Delivery Challan before generating tax invoice"
                    }
                  >
                    <Truck className="mr-1.5 h-4 w-4" />
                    <span className="hidden sm:inline">
                      {primaryDispatch
                        ? `Challan (${primaryDispatch.dispatch_no})`
                        : saleMode === "cash"
                          ? "Issue Delivery Challan"
                          : "Raise Delivery Challan"}
                    </span>
                    <span className="sm:hidden">
                      {primaryDispatch ? primaryDispatch.dispatch_no : "Challan"}
                    </span>
                  </Button>
                )}

                {/* Secondary buttons visible inline on md+ screens, accessible in ⋮ on mobile */}
                <Button
                  size="sm"
                  variant="outline"
                  className={cn(
                    "hidden md:inline-flex font-medium shadow-xs",
                    assignment.isAssigned
                      ? assignment.fulfilmentType === "in_stock"
                        ? "border-emerald-300 text-emerald-800 bg-emerald-50/60 hover:bg-emerald-100 dark:border-emerald-700/60 dark:text-emerald-300"
                        : "border-cyan-300 text-cyan-800 bg-cyan-50/60 hover:bg-cyan-100 dark:border-cyan-700/60 dark:text-cyan-300"
                      : "border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300",
                  )}
                  onClick={() => setAssignVendorOpen(true)}
                  title="Assign order fulfilment to Live Stock on-hand or Outsource to Vendor"
                >
                  {assignment.fulfilmentType === "in_stock" ? (
                    <>
                      <Boxes className="mr-1.5 h-4 w-4 text-emerald-600" />
                      Live Stock (Yard)
                    </>
                  ) : assignment.isAssigned ? (
                    <>
                      <Building2 className="mr-1.5 h-4 w-4 text-cyan-600" />
                      {assignment.vendorName}
                    </>
                  ) : (
                    <>
                      <Boxes className="mr-1.5 h-4 w-4 text-emerald-600" />
                      Assign Live Stock / Partner
                    </>
                  )}
                </Button>

                <Button
                  size="sm"
                  className="hidden lg:inline-flex bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
                  onClick={() => setRfqOpen(true)}
                  title="Send WhatsApp RFQ to category partners with product images & assign order"
                >
                  <MessageCircle className="mr-1.5 h-4 w-4" />
                  WhatsApp RFQ
                </Button>

                {isAccepted && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="hidden lg:inline-flex"
                    onClick={() => reviseMut.mutate()}
                    disabled={reviseMut.isPending}
                  >
                    {reviseMut.isPending ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <Copy className="mr-1.5 h-4 w-4" />
                    )}
                    Revision
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  className="hidden md:inline-flex"
                  onClick={() => soMut.mutate()}
                  disabled={soMut.isPending}
                  title={
                    linkedSo.data
                      ? `Already linked to ${linkedSo.data.so_no}`
                      : "Create a sales order from this quote"
                  }
                >
                  {soMut.isPending ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <ShoppingCart className="mr-1.5 h-4 w-4" />
                  )}
                  {linkedSo.data ? "Sales Order" : "Convert to SO"}
                </Button>

                {saleMode !== "cash" && (
                  <Button
                    size="sm"
                    className={cn(
                      "hidden md:inline-flex font-medium shadow-xs",
                      primaryDispatch
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300",
                    )}
                    variant={primaryDispatch ? "default" : "outline"}
                    onClick={() => convertMut.mutate()}
                    disabled={!canConvert || convertMut.isPending}
                    title={
                      primaryDispatch
                        ? `Generate Tax Invoice for Challan ${primaryDispatch.dispatch_no}`
                        : "Generate Tax Invoice (Delivery challan recommended first)"
                    }
                  >
                    {convertMut.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                    <ArrowRightCircle className="mr-1.5 h-4 w-4" />
                    {primaryDispatch ? "Convert to Invoice" : "Convert to Invoice"}
                  </Button>
                )}

                <DocumentToolbar entity="quote" entityId={quoteId} />
              </>
            }
            overflow={[
              ...(!isAccepted
                ? [
                    {
                      label: "Approve Quote",
                      icon: <CheckCircle2 className="h-4 w-4 text-blue-600" />,
                      onSelect: () => statusMut.mutate("accepted"),
                    },
                  ]
                : []),
              {
                label: assignment.isAssigned
                  ? `Partner: ${assignment.vendorName}`
                  : "Assign Live Stock / Partner",
                icon: <Boxes className="h-4 w-4 text-emerald-600" />,
                onSelect: () => setAssignVendorOpen(true),
              },
              {
                label: "WhatsApp RFQ to Partners",
                icon: <MessageCircle className="h-4 w-4 text-emerald-600" />,
                onSelect: () => setRfqOpen(true),
              },
              {
                label: linkedSo.data ? "Open sales order" : "Convert to Sales Order",
                icon: <ShoppingCart className="h-4 w-4" />,
                onSelect: () => soMut.mutate(),
              },
              ...(saleMode !== "cash" && canConvert
                ? [
                    {
                      label: "Convert to invoice",
                      icon: <ArrowRightCircle className="h-4 w-4 text-primary" />,
                      onSelect: () => convertMut.mutate(),
                    },
                  ]
                : []),
              ...(isAccepted
                ? [
                    {
                      label: saleMode === "cash" ? "Issue Delivery Challan" : "Delivery Challan",
                      icon: <Truck className="h-4 w-4 text-amber-600" />,
                      onSelect: () =>
                        nav({
                          to: "/dispatch/new",
                          search: {
                            quote: quoteId,
                            customer: quote.customer_id,
                            ...(linkedSo.data ? { so: linkedSo.data.id } : {}),
                          },
                        }),
                    },
                    {
                      label: "Create revision",
                      icon: <Copy className="h-4 w-4" />,
                      onSelect: () => reviseMut.mutate(),
                    },
                  ]
                : []),
              {
                label: "Share link",
                icon: <Share2 className="h-4 w-4" />,
                onSelect: async () => {
                  await navigator.clipboard.writeText(window.location.href);
                  toast.success("Quote link copied to clipboard");
                },
                separatorBefore: true,
              },
              {
                label: "Documents",
                icon: <FolderOpen className="h-4 w-4" />,
                onSelect: () =>
                  document
                    .getElementById("quote-documents")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" }),
              },
              {
                label: "Timeline",
                icon: <History className="h-4 w-4" />,
                onSelect: () =>
                  document
                    .getElementById("quote-timeline")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" }),
              },
              ...(canReassign
                ? [
                    {
                      label: "Change customer",
                      icon: <UserCheck className="h-4 w-4" />,
                      onSelect: () => setReassignOpen(true),
                      separatorBefore: true,
                    },
                    {
                      label: "Transfer ownership (wizard)",
                      icon: <UserCheck className="h-4 w-4" />,
                      onSelect: () => setTransferOpen(true),
                    },
                  ]
                : []),
              {
                label: "Delete quote",
                icon: <Trash2 className="h-4 w-4" />,
                onSelect: () => setConfirmDel(true),
                destructive: true,
                separatorBefore: true,
              },
            ]}
          />
        }
      />

      <EntityInsightPanel entityType="quote" entityId={quoteId} />

      <GuidedNextStep
        entity="quote"
        entityId={quoteId}
        ctx={{ customer_id: quote.customer_id, project_id: quote.project_id, quote_id: quoteId }}
      />

      {/* Material Discrepancy Alert Banner */}
      {varianceReport?.hasVariance && primaryDispatch && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/40 p-4 text-xs text-amber-950 dark:text-amber-200 shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <div className="font-bold text-sm flex items-center justify-between flex-wrap gap-2">
                <span>⚠️ Delivery Challan Product Discrepancy Flagged</span>
                <Link
                  to="/dispatch/$id"
                  params={{ id: primaryDispatch.id }}
                  className="font-mono font-semibold text-primary hover:underline text-xs flex items-center gap-1"
                >
                  <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                  View Challan #{primaryDispatch.dispatch_no} →
                </Link>
              </div>
              <p className="text-muted-foreground">
                The line items dispatched on Delivery Challan{" "}
                <strong>{primaryDispatch.dispatch_no}</strong> differ from this Quotation
                specification ({varianceReport.summaryText}). Super admins have been flagged on the
                dashboard.
              </p>
              <div className="space-y-1 pt-1">
                {varianceReport.variances.map((v: ProductVarianceItem, i: number) => (
                  <div key={i} className="flex items-center gap-1.5 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-600 shrink-0" />
                    <span>{v.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-4 md:col-span-2">
          <Card className="shadow-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm">Line items</CardTitle>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => nav({ to: "/quotes/$quoteId/edit", params: { quoteId } })}
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit items
              </Button>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              {/* Mobile Responsive Line Items Card View (< sm) */}
              <div className="sm:hidden space-y-3">
                {(items.data ?? []).map((it) => {
                  const img = getLineItemImage(it, quoteImages.data ?? new Map());
                  const linePreTax = Number(it.quantity ?? 0) * Number(it.unit_price ?? 0);
                  const itemNotes = (it as { notes?: string | null }).notes;
                  return (
                    <div
                      key={it.id}
                      className="rounded-lg border border-border bg-card p-3 shadow-2xs space-y-2.5"
                    >
                      <div className="flex items-start gap-2.5">
                        {img ? (
                          <button
                            type="button"
                            onClick={() => setPreviewImage({ url: img, title: it.description })}
                            className="group relative h-13 w-13 shrink-0 overflow-hidden rounded-md border border-border bg-muted/40 shadow-xs cursor-pointer"
                            title="Click to view full photo"
                          >
                            <img
                              src={img}
                              alt={it.description}
                              className="h-full w-full object-cover"
                            />
                            <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white">
                              <Eye className="h-3.5 w-3.5" />
                            </span>
                          </button>
                        ) : (
                          <div
                            className="flex h-13 w-13 shrink-0 items-center justify-center rounded-md border border-dashed border-border/80 bg-muted/20 text-muted-foreground/30"
                            title="No photo attached"
                          >
                            <ImageIcon className="h-4 w-4" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-xs sm:text-sm text-foreground leading-snug">
                            {it.description}
                          </h4>
                          {itemNotes && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                              {itemNotes}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            {(it as unknown as { hsn_sac?: string | null }).hsn_sac && (
                              <span className="font-mono text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                                HSN: {(it as unknown as { hsn_sac?: string | null }).hsn_sac}
                              </span>
                            )}
                            {it.unit && (
                              <span className="text-[10px] text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                Unit: {it.unit}
                              </span>
                            )}
                            {img && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-primary">
                                <Sparkles className="h-2.5 w-2.5" /> Photo
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Financial Numbers Bar */}
                      <div className="grid grid-cols-3 gap-2 bg-muted/30 p-2 rounded-md text-xs border border-border/60">
                        <div>
                          <span className="text-[10px] uppercase text-muted-foreground block font-medium">
                            Qty
                          </span>
                          <span className="font-semibold text-foreground">
                            {it.quantity} {it.unit ?? ""}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-muted-foreground block font-medium">
                            Rate
                          </span>
                          <span className="font-semibold text-foreground">
                            {formatInr(it.unit_price)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] uppercase text-muted-foreground block font-medium">
                            Amount {it.tax_pct ? `(${it.tax_pct}% GST)` : ""}
                          </span>
                          <span className="font-bold text-primary">{formatInr(linePreTax)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop / Tablet Table View (>= sm) */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14 text-center">Photo</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>HSN</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Tax %</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(items.data ?? []).map((it) => {
                      const img = getLineItemImage(it, quoteImages.data ?? new Map());
                      const linePreTax = Number(it.quantity ?? 0) * Number(it.unit_price ?? 0);
                      const itemNotes = (it as { notes?: string | null }).notes;
                      return (
                        <TableRow key={it.id}>
                          <TableCell className="p-2 text-center align-middle">
                            {img ? (
                              <button
                                type="button"
                                onClick={() => setPreviewImage({ url: img, title: it.description })}
                                className="group relative inline-block h-11 w-11 overflow-hidden rounded-md border border-border bg-muted/40 shadow-xs hover:border-primary transition cursor-pointer"
                                title="Click to view full photo"
                              >
                                <img
                                  src={img}
                                  alt={it.description}
                                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-110"
                                />
                                <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-white">
                                  <Eye className="h-3.5 w-3.5" />
                                </span>
                              </button>
                            ) : (
                              <div
                                className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-dashed border-border/80 bg-muted/20 text-muted-foreground/30"
                                title="No photo attached"
                              >
                                <ImageIcon className="h-4 w-4" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span>{it.description}</span>
                              {itemNotes && (
                                <span className="text-xs text-muted-foreground font-normal mt-0.5 whitespace-pre-wrap">
                                  {itemNotes}
                                </span>
                              )}
                              {img && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-normal text-primary/80">
                                  <Sparkles className="h-2.5 w-2.5" /> Visual attached
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {(it as unknown as { hsn_sac?: string | null }).hsn_sac || "—"}
                          </TableCell>
                          <TableCell className="text-right">{it.quantity}</TableCell>
                          <TableCell>{it.unit ?? "—"}</TableCell>
                          <TableCell className="text-right">{formatInr(it.unit_price)}</TableCell>
                          <TableCell className="text-right">{it.tax_pct}%</TableCell>
                          <TableCell className="text-right">{formatInr(linePreTax)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Responsive Quote Totals Card */}
              <div className="mt-4 rounded-lg bg-muted/30 border border-border/70 p-3.5 space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Subtotal:</span>
                  <span className="font-medium text-foreground">{formatInr(quote.subtotal)}</span>
                </div>
                {saleMode === "cash" ? (
                  <div className="flex justify-between items-center text-xs text-emerald-700 font-medium">
                    <span>GST (Cash Deal · Challan Only):</span>
                    <span className="font-semibold">0% (₹0)</span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>GST Tax:</span>
                    <span className="font-medium text-foreground">
                      {formatInr(quote.tax_amount)}
                    </span>
                  </div>
                )}
                <div className="border-t border-border pt-2 flex justify-between items-center text-sm sm:text-base font-bold text-foreground">
                  <span>Total Quotation:</span>
                  <span className="text-primary font-black">{formatInr(quote.total)}</span>
                </div>
                {saleMode === "hybrid" && (
                  <div className="text-xs text-purple-700 bg-purple-50 px-2.5 py-1.5 rounded-md border border-purple-200 mt-2">
                    <span className="font-semibold">Hybrid Deal Split:</span> Cash{" "}
                    {formatInr(hybridSplit.cashAmount ?? 0)} · Invoiced{" "}
                    {formatInr(hybridSplit.invoicedAmount ?? 0)}
                  </div>
                )}
              </div>

              {quoteImages.data && quoteImages.data.size > 0 && (
                <div className="mt-6 border-t border-border pt-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <ImageIcon className="h-3.5 w-3.5 text-primary" /> Product Visuals & Material
                      Samples ({getQuoteGalleryImages(items.data ?? [], quoteImages.data).length})
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {getQuoteGalleryImages(items.data ?? [], quoteImages.data).map((gImg) => (
                      <div
                        key={gImg.id}
                        onClick={() => setPreviewImage({ url: gImg.url, title: gImg.label })}
                        className="group relative cursor-pointer overflow-hidden rounded-lg border border-border bg-card shadow-xs transition hover:border-primary/50 hover:shadow-md"
                      >
                        <div className="aspect-square w-full overflow-hidden bg-muted/20">
                          <img
                            src={gImg.url}
                            alt={gImg.label}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                        <div className="p-2">
                          <p className="truncate text-xs font-medium text-foreground group-hover:text-primary">
                            {gImg.label}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{gImg.source}</p>
                        </div>
                        <div className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100">
                          <Eye className="h-3 w-3" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Terms & Conditions Card */}
          <Card className="shadow-1 border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <CardTitle className="text-sm">Terms &amp; Conditions</CardTitle>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-300 text-[10px] font-semibold gap-1"
                >
                  <Sparkles className="h-3 w-3 text-emerald-600" />
                  100% Advance: 5% Discount
                </Badge>
                {Number(quote.total) > 0 && Number(quote.total) < ADVANCE_PAYMENT_THRESHOLD_INR && (
                  <Badge
                    variant="outline"
                    className="bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/30 dark:text-amber-300 text-[10px]"
                  >
                    &lt; ₹50k: 100% Advance
                  </Badge>
                )}
                <Badge variant="outline" className="text-[10px]">
                  {detectedScope === "supply_and_installation"
                    ? "Supply + Installation"
                    : "Supply Only"}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={openTermsDialog}
                >
                  <Pencil className="mr-1 h-3 w-3" /> Edit Terms
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="mb-3 flex items-center justify-between rounded-md border border-dashed border-emerald-500/70 bg-emerald-50/60 dark:bg-emerald-950/20 px-3 py-2 text-xs text-emerald-900 dark:text-emerald-200">
                <div className="flex items-center gap-2">
                  <span className="text-sm">✨</span>
                  <div>
                    <span className="font-semibold">Special Payment Incentive: </span>
                    <span>
                      Premake 100% payment to avail 5% discount + free certified Shree Yantra worth
                      ₹14,999 on stone product orders &gt; ₹1 Lakh*.
                    </span>
                  </div>
                </div>
                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase shrink-0">
                  5% Off
                </Badge>
              </div>

              {quote.terms && quote.terms.trim() ? (
                <div className="rounded-md border border-border/70 bg-muted/20 p-3 text-xs font-mono leading-relaxed whitespace-pre-line text-slate-800 dark:text-slate-200">
                  {quote.terms}
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 p-3 text-xs text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold">Standard Terms Active: </span>
                    <span>
                      No custom terms stored. The polished standard{" "}
                      {detectedScope === "supply_and_installation"
                        ? "Supply + Installation"
                        : "Supply"}{" "}
                      terms are dynamically attached to PDF exports and WhatsApp messages.
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs shrink-0 bg-white dark:bg-slate-900"
                    onClick={openTermsDialog}
                  >
                    Affix / Customize Terms
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-1">
          <CardHeader>
            <CardTitle className="text-sm">Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Badge variant="outline" className="capitalize">
              {quote.status}
            </Badge>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Change status</label>
              <Select
                value={quote.status}
                onValueChange={(v) => statusMut.mutate(v as QuoteStatus)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              {!canConvert && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Mark as <span className="font-medium">Accepted</span> to{" "}
                  {saleMode === "cash" ? "issue delivery challans." : "convert into an invoice."}
                </p>
              )}
            </div>
            <div className="border-t border-border pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">
                  Order Fulfilment
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-xs text-primary hover:underline"
                  onClick={() => setAssignVendorOpen(true)}
                >
                  {assignment.isAssigned ? "Change Vendor" : "Assign Vendor"}
                </Button>
              </div>
              <div>
                {assignment.fulfilmentType === "stock_lifted" || assignment.isOrderCompleted ? (
                  <div className="rounded-md bg-emerald-50/80 border border-emerald-200/80 p-2.5 text-xs text-emerald-900 dark:bg-emerald-950/20 dark:border-emerald-900/40">
                    <p className="font-semibold flex items-center gap-1.5 text-emerald-950 dark:text-emerald-100">
                      <PackageCheck className="h-4 w-4 text-emerald-600" /> Material Lifted from
                      Stock
                    </p>
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-1">
                      Status:{" "}
                      <span className="font-medium">
                        {assignment.isOrderCompleted
                          ? "Order Completed · No RFQ Needed"
                          : "Lifted from Stock · No RFQ Needed"}
                      </span>
                    </p>
                    {assignment.stockLocation && (
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                        Location: <span className="font-medium">{assignment.stockLocation}</span>
                      </p>
                    )}
                  </div>
                ) : assignment.fulfilmentType === "in_stock" ? (
                  <div className="rounded-md bg-emerald-50/80 border border-emerald-200/80 p-2.5 text-xs text-emerald-950 dark:bg-emerald-950/20 dark:border-emerald-900/40">
                    <p className="font-semibold flex items-center gap-1.5 text-emerald-950 dark:text-emerald-100">
                      <Boxes className="h-4 w-4 text-emerald-600" /> Fulfilled from Live Stock
                      (In-House Yard)
                    </p>
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-1">
                      Godown / Yard:{" "}
                      <span className="font-medium">
                        {assignment.stockLocation || "Main Yard / Slab Storage"}
                      </span>
                    </p>
                  </div>
                ) : assignment.isAssigned ? (
                  <div className="rounded-md bg-cyan-50/80 border border-cyan-200/80 p-2.5 text-xs text-cyan-950 dark:bg-cyan-950/20 dark:border-cyan-900/40">
                    <p className="font-semibold flex items-center gap-1.5 text-cyan-950 dark:text-cyan-100">
                      <Building2 className="h-4 w-4 text-cyan-600" /> Vendor Assigned
                    </p>
                    <p className="text-[11px] text-cyan-800 dark:text-cyan-300 mt-0.5 font-medium">
                      {assignment.vendorName}
                    </p>
                    {assignment.promisedDeliveryDate && (
                      <p className="text-[10px] text-cyan-700 dark:text-cyan-400 mt-0.5">
                        Promised Delivery: {assignment.promisedDeliveryDate.slice(0, 10)}
                      </p>
                    )}
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs border-dashed text-slate-700 hover:text-slate-900 hover:bg-slate-50 justify-start"
                    onClick={() => setAssignVendorOpen(true)}
                  >
                    <Boxes className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />+ Assign Vendor or Live
                    Stock
                  </Button>
                )}
              </div>
            </div>
            <div className="border-t border-border pt-3">
              <Button
                size="sm"
                variant="outline"
                className="w-full text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 border-emerald-300 dark:border-emerald-700/60 dark:text-emerald-400 font-medium"
                onClick={() => setRfqOpen(true)}
              >
                <MessageCircle className="mr-1.5 h-4 w-4 text-emerald-600" />
                WhatsApp RFQ to Vendors (Optional)
              </Button>
            </div>
            {quote.status === "sent" && (
              <div className="border-t border-border pt-3">
                <label className="text-xs font-medium text-muted-foreground">
                  Approval pending — follow up
                </label>
                <div className="mt-1.5">
                  <ScheduleFollowupPanel entityType="quote" entityId={quoteId} />
                </div>
              </div>
            )}
            {(sourceEstimate.data || linkedSo.data || quoteDispatches.length > 0) && (
              <div className="space-y-1.5 border-t border-border pt-3 text-xs">
                {sourceEstimate.data && (
                  <div className="text-muted-foreground">
                    Created from Estimate{" "}
                    <Link
                      to="/estimates/$estimateId"
                      params={{ estimateId: sourceEstimate.data.id }}
                      className="text-primary hover:underline"
                    >
                      {sourceEstimate.data.estimate_no}
                    </Link>
                  </div>
                )}
                {linkedSo.data && (
                  <div className="text-muted-foreground">
                    Converted to Sales Order{" "}
                    <Link
                      to="/sales-orders/$id"
                      params={{ id: linkedSo.data.id }}
                      className="text-primary hover:underline"
                    >
                      {linkedSo.data.so_no}
                    </Link>
                  </div>
                )}
                {quoteDispatches.length > 0 && (
                  <div className="text-muted-foreground flex items-center gap-1.5 flex-wrap">
                    <span>Delivery Challan:</span>
                    {quoteDispatches.map((d) => (
                      <Link
                        key={d.id}
                        to="/dispatch/$id"
                        params={{ id: d.id }}
                        className="font-mono font-semibold text-primary hover:underline inline-flex items-center gap-1"
                      >
                        <Truck className="h-3 w-3 text-muted-foreground" />
                        {d.dispatch_no}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="border-t border-border pt-3 text-xs text-muted-foreground">
              <div>Valid until: {quote.valid_until ?? "—"}</div>
              {quote.notes && <div className="mt-2 whitespace-pre-line">{quote.notes}</div>}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <NotesPanel
          table="quotes"
          id={quoteId}
          value={quote.notes ?? null}
          invalidateKey={qk.quotes.byId(quoteId)}
        />
        <div id="quote-documents">
          <AttachmentsPanel entityType="quote" entityId={quoteId} />
        </div>
        <div id="quote-timeline">
          <TimelinePanel entityType="quote" entityId={quoteId} />
        </div>
      </div>

      <ConfirmDialog
        open={confirmDel}
        onOpenChange={setConfirmDel}
        title="Delete quote?"
        description={`${quote.quote_no} will be removed.`}
        busy={delMut.isPending}
        onConfirm={() => delMut.mutate()}
      />

      {/* Terms & Conditions Dialog */}
      <Dialog open={termsDialogOpen} onOpenChange={setTermsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Edit Terms &amp; Conditions — {quote.quote_no}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <QuoteTermsManager
              terms={editingTerms}
              onChangeTerms={setEditingTerms}
              dealScope={editingScope}
              onChangeDealScope={setEditingScope}
              totalAmount={Number(quote.total) || 0}
              clientProvidedSlab={detectClientProvidedSlabFromItems(
                items.data,
                quote.wall_estimate,
              )}
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setTermsDialogOpen(false)}
              disabled={updateTermsMut.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => updateTermsMut.mutate(editingTerms)}
              disabled={updateTermsMut.isPending}
            >
              {updateTermsMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Terms
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {canReassign && (
        <ReassignCustomerDialog
          open={reassignOpen}
          onOpenChange={setReassignOpen}
          quoteId={quoteId}
          quoteNo={quote.quote_no}
          currentCustomerId={quote.customer_id}
        />
      )}

      {canReassign && quote.customer_id && (
        <TransferOwnershipDialog
          open={transferOpen}
          onOpenChange={setTransferOpen}
          sourceType="quote"
          sourceId={quoteId}
          sourceLabel={quote.quote_no}
          fromCustomerId={quote.customer_id}
        />
      )}

      <AssignQuoteVendorDialog
        open={assignVendorOpen}
        onOpenChange={setAssignVendorOpen}
        quoteId={quoteId}
        quoteNo={quote.quote_no}
        currentFulfilmentType={assignment.fulfilmentType}
        currentStockLocation={assignment.stockLocation}
        currentVendorId={assignment.vendorId}
        currentVendorName={assignment.vendorName}
        currentPromisedDate={assignment.promisedDeliveryDate}
        onSuccess={() => {
          invalidateQuote(qc, quoteId);
        }}
      />

      <QuoteSendRfqDialog
        open={rfqOpen}
        onOpenChange={setRfqOpen}
        quoteId={quoteId}
        quoteNo={quote.quote_no}
        customerName={quote.customer?.name}
        items={(items.data ?? []).map((it) => ({
          id: it.id,
          product_id: it.product_id,
          product_name: it.description,
          description: it.description,
          quantity: it.quantity,
          uom: it.unit,
        }))}
        enquiryId={quote.enquiry_id}
        projectId={quote.project_id}
        customerId={quote.customer_id}
      />

      <Dialog open={Boolean(previewImage)} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-3xl p-4">
          <DialogHeader>
            <DialogTitle className="truncate text-base font-semibold">
              {previewImage?.title || "Product Visual"}
            </DialogTitle>
          </DialogHeader>
          {previewImage?.url && (
            <div className="flex items-center justify-center overflow-hidden rounded-lg bg-black/5 p-2">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[75vh] w-auto max-w-full rounded-md object-contain shadow-md"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

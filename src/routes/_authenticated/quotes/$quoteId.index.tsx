import { dispatchSystemNotification } from "@/lib/notifications/systemNotifications.functions";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useDetailHotkeys } from "@/hooks/use-detail-hotkeys";
import { useState } from "react";
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
} from "lucide-react";

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
} from "@/lib/quotes/api";
import { formatInr } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getQuoteSaleMode, getQuoteHybridSplit, SALE_MODE_CONFIG } from "@/lib/quotes/sale-mode";
import type { DbTable } from "@/lib/types";
import { invalidateQuote, invalidateInvoice, invalidateSalesOrder } from "@/lib/query-invalidation";

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
  });
  const sourceEstimateId = q.data?.estimate_id ?? null;
  const sourceEstimate = useQuery({
    queryKey: ["quotes", "sourceEstimate", sourceEstimateId ?? ""],
    queryFn: () => (sourceEstimateId ? getEstimateForQuote(sourceEstimateId) : null),
    enabled: !!sourceEstimateId,
  });

  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

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
            {assignment.fulfilmentType === "in_stock" ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                <Boxes className="h-3 w-3 text-blue-600" /> In-House Stock (
                {assignment.stockLocation || "Main Warehouse"})
              </span>
            ) : assignment.isAssigned ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                <Building2 className="h-3 w-3 text-emerald-600" /> Vendor: {assignment.vendorName}
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
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className={cn(
                    "font-medium shadow-xs",
                    assignment.isAssigned
                      ? assignment.fulfilmentType === "in_stock"
                        ? "border-blue-300 text-blue-700 bg-blue-50/60 hover:bg-blue-100 dark:border-blue-700/60 dark:text-blue-300"
                        : "border-emerald-300 text-emerald-700 bg-emerald-50/60 hover:bg-emerald-100 dark:border-emerald-700/60 dark:text-emerald-300"
                      : "border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300",
                  )}
                  onClick={() => setAssignVendorOpen(true)}
                  title="Assign order fulfilment to In-House Stock or Outsource to Vendor"
                >
                  {assignment.fulfilmentType === "in_stock" ? (
                    <>
                      <PackageCheck className="mr-1.5 h-4 w-4 text-blue-600" />
                      In-House Stock
                    </>
                  ) : assignment.isAssigned ? (
                    <>
                      <Building2 className="mr-1.5 h-4 w-4 text-emerald-600" />
                      {assignment.vendorName}
                    </>
                  ) : (
                    <>
                      <Boxes className="mr-1.5 h-4 w-4 text-slate-600" />
                      Assign Stock / Vendor
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
                  onClick={() => setRfqOpen(true)}
                  title="Send WhatsApp RFQ to category vendors with product images & assign order"
                >
                  <MessageCircle className="mr-1.5 h-4 w-4" />
                  WhatsApp RFQ to Vendors
                </Button>
                {!isAccepted && (
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                    onClick={() => statusMut.mutate("accepted")}
                    disabled={statusMut.isPending}
                  >
                    {statusMut.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    Approve Quote
                  </Button>
                )}
                {isAccepted && (
                  <>
                    <Button
                      size="sm"
                      className={
                        saleMode === "cash"
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                          : "border-amber-600/50 text-amber-800 hover:bg-amber-50 dark:border-amber-500/50 dark:text-amber-300 dark:hover:bg-amber-950/40"
                      }
                      variant={saleMode === "cash" ? "default" : "outline"}
                      onClick={() =>
                        nav({
                          to: "/dispatch/new",
                          search: {
                            quote: quoteId,
                            customer: quote.customer_id,
                            ...(linkedSo.data ? { so: linkedSo.data.id } : {}),
                          },
                        })
                      }
                      title={
                        saleMode === "cash"
                          ? "Issue Delivery Challan for cash transaction (no tax invoice)"
                          : "Issue Delivery Challan"
                      }
                    >
                      <Truck className="mr-2 h-4 w-4" />
                      {saleMode === "cash" ? "Issue Delivery Challan" : "Delivery Challan"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => reviseMut.mutate()}
                      disabled={reviseMut.isPending}
                    >
                      {reviseMut.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Copy className="mr-2 h-4 w-4" />
                      )}
                      Create revision
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => soMut.mutate()}
                  disabled={soMut.isPending}
                  title={
                    linkedSo.data
                      ? `Already linked to ${linkedSo.data.so_no}`
                      : "Create a sales order from this quote"
                  }
                >
                  {soMut.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ShoppingCart className="mr-2 h-4 w-4" />
                  )}
                  {linkedSo.data ? "Open sales order" : "Convert to Sales Order"}
                </Button>
                {saleMode !== "cash" && (
                  <Button
                    size="sm"
                    onClick={() => convertMut.mutate()}
                    disabled={!canConvert || convertMut.isPending}
                    title="Generate Tax Invoice"
                  >
                    {convertMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <ArrowRightCircle className="mr-2 h-4 w-4" /> Convert to invoice
                  </Button>
                )}
                <DocumentToolbar entity="quote" entityId={quoteId} />
              </>
            }
            overflow={[
              {
                label: "Share link",
                icon: <Share2 className="h-4 w-4" />,
                onSelect: async () => {
                  await navigator.clipboard.writeText(window.location.href);
                },
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

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-1 md:col-span-2">
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
          <CardContent>
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
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(items.data ?? []).map((it) => {
                  const img = getLineItemImage(it, quoteImages.data ?? new Map());
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
                      <TableCell className="text-right">{formatInr(it.line_total)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="mt-4 flex flex-col items-end gap-1 text-sm">
              <div>
                Subtotal: <span className="font-medium">{formatInr(quote.subtotal)}</span>
              </div>
              {saleMode === "cash" ? (
                <div className="text-xs text-emerald-700 font-medium">
                  GST (Cash Sale · No Tax): <span className="font-semibold">0% (₹0)</span>
                </div>
              ) : (
                <div>
                  Tax: <span className="font-medium">{formatInr(quote.tax_amount)}</span>
                </div>
              )}
              <div className="text-base font-semibold">Total: {formatInr(quote.total)}</div>
              {saleMode === "hybrid" && (
                <div className="text-xs text-purple-700 bg-purple-50 px-2 py-1 rounded border border-purple-200 mt-1">
                  Hybrid Split: Cash {formatInr(hybridSplit.cashAmount ?? 0)} · Invoiced{" "}
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
                  {assignment.isAssigned ? "Change" : "Assign"}
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
                  <div className="rounded-md bg-blue-50/80 border border-blue-200/80 p-2.5 text-xs text-blue-900 dark:bg-blue-950/20 dark:border-blue-900/40">
                    <p className="font-semibold flex items-center gap-1.5 text-blue-950 dark:text-blue-100">
                      <PackageCheck className="h-4 w-4 text-blue-600" /> Fulfilled from In-House
                      Stock
                    </p>
                    <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-1">
                      Godown:{" "}
                      <span className="font-medium">
                        {assignment.stockLocation || "Main Warehouse / Yard Stock"}
                      </span>
                    </p>
                  </div>
                ) : assignment.isAssigned ? (
                  <div className="rounded-md bg-emerald-50/80 border border-emerald-200/80 p-2.5 text-xs text-emerald-900 dark:bg-emerald-950/20 dark:border-emerald-900/40">
                    <p className="font-semibold flex items-center gap-1.5 text-emerald-950 dark:text-emerald-100">
                      <Building2 className="h-4 w-4 text-emerald-600" /> Vendor Assigned
                    </p>
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5 font-medium">
                      {assignment.vendorName}
                    </p>
                    {assignment.promisedDeliveryDate && (
                      <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">
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
                    <Boxes className="mr-1.5 h-3.5 w-3.5 text-slate-500" />+ Assign Stock or Vendor
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
            {(sourceEstimate.data || linkedSo.data) && (
              <div className="space-y-1 border-t border-border pt-3 text-xs">
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

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useDetailHotkeys } from "@/hooks/use-detail-hotkeys";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader2,
  ExternalLink,
  Link as LinkIcon,
  Ban,
  Plus,
  Pencil,
  Trash2,
  Share2,
  FolderOpen,
  History,
  ShieldAlert,
  Truck,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import { AttachmentsPanel, NotesPanel, TimelinePanel } from "@/components/entity/DetailPanels";
import { DetailActionBar } from "@/components/entity/DetailActionBar";
import { deleteInvoice } from "@/lib/invoices/api";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EntityInsightPanel } from "@/components/insights/EntityInsightPanel";
import { GuidedNextStep } from "@/components/guided-workflow/GuidedNextStep";
import { RecordWriteOffDialog } from "@/components/write-offs/RecordWriteOffDialog";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { DocumentToolbar } from "@/components/documents/DocumentToolbar";
import { EWayBillDialog } from "@/components/invoices/EWayBillDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Field } from "@/components/forms/Field";
import { QuickForm } from "@/components/forms/QuickForm";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import {
  getInvoice,
  getInvoiceItems,
  getInvoicePaymentLinks,
  getInvoicePayments,
  recordManualPayment,
  setInvoiceStatus,
} from "@/lib/invoices/api";
import { formatInr } from "@/lib/format";
import type { RecordPaymentInput } from "@/lib/invoices/schema";
import type { DbTable } from "@/lib/types";
import { createRazorpayLink, cancelRazorpayLink } from "@/lib/payments/razorpay.functions";
import { invalidateInvoice, invalidatePayment } from "@/lib/query-invalidation";

type InvoiceStatus = DbTable<"invoices">["status"];

export const Route = createFileRoute("/_authenticated/invoices/$invoiceId/")({
  ssr: false,
  component: InvoiceDetailPage,
});

function InvoiceDetailPage() {
  const { invoiceId } = Route.useParams();
  const qc = useQueryClient();
  const nav = useNavigate();
  useDetailHotkeys({ onBack: () => nav({ to: "/invoices" }) });
  const [payOpen, setPayOpen] = useState(false);
  const [writeOffOpen, setWriteOffOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [ewbOpen, setEwbOpen] = useState(false);

  const inv = useQuery({
    queryKey: qk.invoices.byId(invoiceId),
    queryFn: () => getInvoice(invoiceId),
  });
  const items = useQuery({
    queryKey: qk.invoices.items(invoiceId),
    queryFn: () => getInvoiceItems(invoiceId),
  });
  const payments = useQuery({
    queryKey: qk.invoices.payments(invoiceId),
    queryFn: () => getInvoicePayments(invoiceId),
  });
  const links = useQuery({
    queryKey: qk.invoices.links(invoiceId),
    queryFn: () => getInvoicePaymentLinks(invoiceId),
  });
  const dispatches = useQuery({
    queryKey: ["invoices", invoiceId, "dispatches", inv.data?.customer_id],
    queryFn: async () => {
      if (!inv.data?.customer_id) return [];
      const { data, error } = await supabase
        .from("dispatches")
        .select(
          "id, dispatch_no, dispatch_date, status, carrier, vehicle_no, driver_name, driver_phone, lr_no, tracking_no, notes, remarks",
        )
        .eq("customer_id", inv.data.customer_id)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false });
      if (error) return [];
      return data ?? [];
    },
    enabled: !!inv.data?.customer_id,
  });

  const invalidateAll = () => {
    invalidateInvoice(qc, invoiceId);
  };

  const statusMut = useMutation({
    mutationFn: (s: InvoiceStatus) =>
      setInvoiceStatus({
        invoice_id: invoiceId,
        status: s as "draft" | "issued" | "sent" | "cancelled" | "overdue",
      }),
    onSuccess: () => {
      toast.success("Status updated");
      invalidateAll();
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const linkMut = useMutation({
    mutationFn: () => createRazorpayLink({ data: { invoice_id: invoiceId } }),
    onSuccess: (r) => {
      toast.success("Payment link created");
      invalidateAll();
      if (r?.short_url) window.open(r.short_url, "_blank", "noopener");
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => cancelRazorpayLink({ data: { payment_link_id: id } }),
    onSuccess: () => {
      toast.success("Link cancelled");
      invalidateAll();
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const delMut = useMutation({
    mutationFn: () => deleteInvoice(invoiceId),
    onSuccess: (res) => {
      if (res?.action === "voided") {
        toast.info(res.message, { duration: 6000 });
        invalidateAll();
      } else {
        toast.success(res?.message || "Invoice deleted");
        invalidateInvoice(qc);
        nav({ to: "/invoices" });
      }
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  if (inv.isLoading) return <LoadingBlock />;
  if (inv.error)
    return <ErrorBlock message={toUserMessage(inv.error)} onRetry={() => inv.refetch()} />;
  if (!inv.data) return <ErrorBlock message="Invoice not found." />;

  const invoice = inv.data;
  const activeLink = (links.data ?? []).find((l) => l.status === "created");
  const balance = Number(invoice.balance_due ?? 0);

  const matchingDispatches = dispatches.data ?? [];
  const hasInvoiceDispatchFields = Boolean(
    invoice.dispatch_date ||
    invoice.vehicle_no ||
    invoice.truck_no ||
    invoice.lr_no ||
    invoice.eway_bill_no ||
    invoice.transporter,
  );
  const hasExistingDispatch = matchingDispatches.length > 0 || hasInvoiceDispatchFields;

  return (
    <div>
      <div className="mb-2">
        <Link
          to="/invoices"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Back to invoices
        </Link>
      </div>

      <PageHeader
        title={invoice.invoice_no}
        subtitle={`${invoice.customer?.name ?? "—"} • ${invoice.project?.name ?? "—"}`}
        actions={
          <DetailActionBar
            pin={{ entityType: "invoice", entityId: invoiceId, label: invoice.invoice_no }}
            primary={
              <>
                <Button
                  size="sm"
                  onClick={() => nav({ to: "/invoices/$invoiceId/edit", params: { invoiceId } })}
                >
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Button>
                <Button size="sm" onClick={() => setPayOpen(true)} disabled={balance <= 0}>
                  <Plus className="mr-2 h-4 w-4" /> Record payment
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-900/60 dark:text-red-300"
                  onClick={() => setWriteOffOpen(true)}
                  disabled={balance <= 0}
                >
                  <ShieldAlert className="mr-1.5 h-4 w-4" /> Write-off
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 font-medium border-slate-300 dark:border-slate-700"
                  onClick={() => setEwbOpen(true)}
                >
                  <Truck className="h-4 w-4 text-primary" />
                  {invoice.eway_bill_no ? "E-Way Bill" : "Generate E-Way Bill"}
                </Button>
                <DocumentToolbar entity="invoice" entityId={invoiceId} />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    const url = window.location.href;
                    const nav = navigator as Navigator & {
                      share?: (data: ShareData) => Promise<void>;
                    };
                    if (nav.share) {
                      try {
                        await nav.share({ title: invoice.invoice_no, url });
                      } catch {
                        /* cancelled */
                      }
                    } else {
                      await navigator.clipboard.writeText(url);
                      toast.success("Link copied");
                    }
                  }}
                >
                  <Share2 className="mr-2 h-4 w-4" /> Share
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => linkMut.mutate()}
                  disabled={linkMut.isPending || balance <= 0 || !!activeLink}
                  title={activeLink ? "A link is already active" : undefined}
                >
                  {linkMut.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LinkIcon className="mr-2 h-4 w-4" />
                  )}
                  Razorpay link
                </Button>
              </>
            }
            overflow={[
              {
                label: "Documents",
                icon: <FolderOpen className="h-4 w-4" />,
                onSelect: () =>
                  document
                    .getElementById("invoice-documents")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" }),
              },
              {
                label: "Timeline",
                icon: <History className="h-4 w-4" />,
                onSelect: () =>
                  document
                    .getElementById("invoice-timeline")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" }),
              },
              ...(hasExistingDispatch && matchingDispatches[0]?.id
                ? [
                    {
                      label: `View Challan ${matchingDispatches[0].dispatch_no}`,
                      icon: <Truck className="h-4 w-4" />,
                      onSelect: () =>
                        nav({
                          to: "/dispatch/$id",
                          params: { id: matchingDispatches[0].id },
                        }),
                    },
                  ]
                : [
                    {
                      label: "Create Delivery Challan",
                      icon: <Truck className="h-4 w-4" />,
                      onSelect: () =>
                        nav({
                          to: "/dispatch/new",
                          search: {
                            customer: invoice.customer_id,
                            invoice: invoice.id,
                          },
                        }),
                    },
                  ]),
              {
                label: "Delete invoice",
                icon: <Trash2 className="h-4 w-4" />,
                onSelect: () => setConfirmDel(true),
                destructive: true,
                separatorBefore: true,
              },
            ]}
          />
        }
      />

      {/* Void Invoice Alert & Reuse CTA */}
      {(invoice.status === "void" || invoice.status === "cancelled") && (
        <div className="mb-4 rounded-xl border border-rose-300 bg-rose-50/70 p-4 dark:border-rose-900/60 dark:bg-rose-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <Ban className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-rose-950 dark:text-rose-200 text-sm">
                  This Invoice is VOID
                </span>
                <Badge variant="destructive" className="font-mono text-xs">
                  {invoice.invoice_no}
                </Badge>
              </div>
              <p className="text-xs text-rose-800 dark:text-rose-300 mt-0.5">
                Preserved in your system to prevent tax audit sequence gaps. You can reuse this
                number to bill any accepted quotation.
              </p>
            </div>
          </div>
          <Button
            asChild
            size="sm"
            className="bg-rose-700 hover:bg-rose-800 text-white shrink-0 shadow-xs"
          >
            <Link to="/invoices/new" search={{ reuseInvoiceId: invoice.id }}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Reuse {invoice.invoice_no}
            </Link>
          </Button>
        </div>
      )}

      <EntityInsightPanel entityType="invoice" entityId={invoiceId} />

      <GuidedNextStep
        entity="invoice"
        entityId={invoiceId}
        ctx={{
          invoice_id: invoiceId,
          customer_id: invoice.customer_id,
          project_id: invoice.project_id,
          has_dispatch: hasExistingDispatch,
          balance_due: balance,
        }}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-1 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Line items</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {/* Mobile Responsive Line Items Card View (< sm) */}
            <div className="sm:hidden space-y-3">
              {(items.data ?? []).map((it) => {
                const linePreTax = Number(it.quantity ?? 0) * Number(it.unit_price ?? 0);
                const itemNotes = (it as { notes?: string | null }).notes;
                return (
                  <div
                    key={it.id}
                    className="rounded-lg border border-border bg-card p-3 shadow-2xs space-y-2.5"
                  >
                    <div>
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
                    const linePreTax = Number(it.quantity ?? 0) * Number(it.unit_price ?? 0);
                    const itemNotes = (it as { notes?: string | null }).notes;
                    return (
                      <TableRow key={it.id}>
                        <TableCell className="font-medium">
                          <div>{it.description}</div>
                          {itemNotes && (
                            <div className="text-xs text-muted-foreground font-normal mt-0.5 whitespace-pre-wrap">
                              {itemNotes}
                            </div>
                          )}
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

            {/* Responsive Invoice Totals Card */}
            <div className="mt-4 rounded-lg bg-muted/30 border border-border/70 p-3.5 space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Subtotal:</span>
                <span className="font-medium text-foreground">{formatInr(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>GST Tax:</span>
                <span className="font-medium text-foreground">{formatInr(invoice.tax_amount)}</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Total Invoice Value:</span>
                <span className="font-bold text-foreground">{formatInr(invoice.total)}</span>
              </div>
              <div className="flex justify-between items-center text-emerald-700 font-medium">
                <span>Amount Paid:</span>
                <span className="font-semibold">{formatInr(invoice.amount_paid)}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between items-center text-sm sm:text-base font-bold text-foreground">
                <span>Balance Due:</span>
                <span
                  className={
                    invoice.balance_due > 0
                      ? "text-amber-600 font-black"
                      : "text-emerald-600 font-black"
                  }
                >
                  {formatInr(invoice.balance_due)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="shadow-1">
            <CardHeader>
              <CardTitle className="text-sm">Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Invoice Date:</span>
                <span className="font-medium text-foreground">{invoice.issue_date || "—"}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Due Date:</span>
                <span className="font-medium text-foreground">{invoice.due_date || "—"}</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="outline" className="capitalize">
                  {invoice.status === "sent" ? "Issued / Sent" : invoice.status.replace(/_/g, " ")}
                </Badge>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Change status</label>
                <Select
                  value={invoice.status}
                  onValueChange={(v) => statusMut.mutate(v as InvoiceStatus)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Issued / Sent</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-2 text-xs text-muted-foreground">
                  Paid/partially_paid are set automatically as payments are recorded.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Delivery & Dispatch Challan Details Card */}
          {hasExistingDispatch ? (
            <Card className="shadow-1 border-primary/20 bg-primary/[0.02]">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-semibold">Delivery Challan</CardTitle>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-emerald-300 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 capitalize text-[11px]"
                  >
                    <CheckCircle2 className="mr-1 h-3 w-3 inline" />
                    {matchingDispatches[0]?.status
                      ? matchingDispatches[0].status.replace("_", " ")
                      : "Dispatched"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-1 space-y-2 text-xs">
                {matchingDispatches.length > 0 ? (
                  matchingDispatches.map((d) => (
                    <div
                      key={d.id}
                      className="rounded-md border border-border/80 bg-background/90 p-2.5 space-y-1.5 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <Link
                          to="/dispatch/$id"
                          params={{ id: d.id }}
                          className="font-mono font-semibold text-primary hover:underline flex items-center gap-1"
                        >
                          {d.dispatch_no} <ExternalLink className="h-3 w-3" />
                        </Link>
                        <span className="text-muted-foreground font-medium">{d.dispatch_date}</span>
                      </div>
                      {(d.vehicle_no || d.carrier || d.driver_name) && (
                        <div className="text-muted-foreground space-y-0.5 pt-0.5 border-t border-border/40">
                          {d.vehicle_no && (
                            <div>
                              Vehicle:{" "}
                              <span className="font-mono text-foreground font-medium">
                                {d.vehicle_no}
                              </span>
                            </div>
                          )}
                          {d.carrier && (
                            <div>
                              Carrier: <span className="text-foreground">{d.carrier}</span>
                            </div>
                          )}
                          {d.driver_name && (
                            <div>
                              Driver: <span className="text-foreground">{d.driver_name}</span>
                            </div>
                          )}
                          {d.lr_no && (
                            <div>
                              LR No: <span className="font-mono text-foreground">{d.lr_no}</span>
                            </div>
                          )}
                        </div>
                      )}
                      {d.notes && (
                        <div className="text-muted-foreground italic text-[11px] pt-0.5">
                          {d.notes}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="rounded-md border border-border/80 bg-background/90 p-2.5 space-y-1 text-muted-foreground shadow-sm">
                    <div className="font-medium text-foreground">
                      Dispatched directly on invoice
                    </div>
                    {invoice.dispatch_date && (
                      <div>
                        Date: <span className="text-foreground">{invoice.dispatch_date}</span>
                      </div>
                    )}
                    {(invoice.vehicle_no || invoice.truck_no) && (
                      <div>
                        Vehicle:{" "}
                        <span className="font-mono text-foreground font-medium">
                          {invoice.vehicle_no || invoice.truck_no}
                        </span>
                      </div>
                    )}
                    {invoice.transporter && (
                      <div>
                        Transporter: <span className="text-foreground">{invoice.transporter}</span>
                      </div>
                    )}
                    {invoice.lr_no && (
                      <div>
                        LR No: <span className="font-mono text-foreground">{invoice.lr_no}</span>
                      </div>
                    )}
                    {invoice.eway_bill_no && (
                      <div>
                        E-Way Bill:{" "}
                        <span className="font-mono text-foreground">{invoice.eway_bill_no}</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-1 border-dashed">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm font-semibold">Delivery Challan</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-muted-foreground text-[11px]">
                    Pending
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-1 space-y-2 text-xs">
                <p className="text-muted-foreground">
                  No delivery challan or dispatch document recorded yet.
                </p>
                <Button asChild variant="outline" size="sm" className="w-full gap-1 h-8 text-xs">
                  <Link
                    to="/dispatch/new"
                    search={{ customer: invoice.customer_id, invoice: invoice.id }}
                  >
                    <Plus className="h-3 w-3" /> Create Delivery Challan
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* GST E-Way Bill Card */}
          <Card className="shadow-1">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">GST E-Way Bill</CardTitle>
                </div>
                {invoice.eway_bill_no ? (
                  <Badge className="bg-emerald-600 text-white text-[10px] gap-1">
                    <CheckCircle2 className="h-3 w-3" /> ATTACHED
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px]",
                      Number(invoice.total || 0) > 50000
                        ? "border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/30"
                        : "text-muted-foreground",
                    )}
                  >
                    {Number(invoice.total || 0) > 50000
                      ? "Mandatory (> ₹50k)"
                      : "Optional (< ₹50k)"}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-2 text-xs">
              {invoice.eway_bill_no ? (
                <div className="space-y-2">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-2.5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                    <div className="text-[10px] text-muted-foreground font-medium">
                      E-Way Bill Number
                    </div>
                    <div className="font-mono text-sm font-black text-emerald-800 dark:text-emerald-300">
                      {invoice.eway_bill_no}
                    </div>
                    {invoice.vehicle_no && (
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Vehicle:{" "}
                        <span className="font-mono font-medium text-foreground">
                          {invoice.vehicle_no}
                        </span>
                        {invoice.transporter && ` • ${invoice.transporter}`}
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-8 text-xs gap-1.5 font-semibold"
                    onClick={() => setEwbOpen(true)}
                  >
                    View &amp; Print EWB Slip
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Generate an official E-Way Bill or download the NIC upload JSON for transport
                    and tax compliance.
                  </p>
                  <Button
                    size="sm"
                    className="w-full h-8 text-xs gap-1.5 font-semibold"
                    onClick={() => setEwbOpen(true)}
                  >
                    <Truck className="h-3.5 w-3.5" /> Create E-Way Bill
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-1 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {(payments.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.data!.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.payment_no}</TableCell>
                      <TableCell>{new Date(p.paid_at).toLocaleDateString("en-IN")}</TableCell>
                      <TableCell className="capitalize">{p.method.replace("_", " ")}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.reference_no ?? p.razorpay_payment_id ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatInr(p.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-1">
          <CardHeader>
            <CardTitle className="text-sm">Payment links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(links.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No links yet.</p>
            ) : (
              (links.data ?? []).map((l) => (
                <div key={l.id} className="rounded-sm border border-border p-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono">{l.link_no}</span>
                    <Badge variant="outline" className="capitalize">
                      {l.status}
                    </Badge>
                  </div>
                  <div className="mt-1">{formatInr(l.amount)}</div>
                  {l.short_url && (
                    <a
                      href={l.short_url}
                      target="_blank"
                      rel="noopener"
                      className="mt-1 inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      Open link <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {l.status === "created" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-1 h-7 w-full"
                      onClick={() => cancelMut.mutate(l.id)}
                      disabled={cancelMut.isPending}
                    >
                      <Ban className="mr-1 h-3 w-3" /> Cancel
                    </Button>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <NotesPanel
          table="invoices"
          id={invoiceId}
          value={invoice.notes ?? null}
          invalidateKey={qk.invoices.byId(invoiceId)}
        />
        <div id="invoice-documents">
          <AttachmentsPanel entityType="invoice" entityId={invoiceId} />
        </div>
        <div id="invoice-timeline">
          <TimelinePanel entityType="invoice" entityId={invoiceId} />
        </div>
      </div>

      <RecordPaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        invoiceId={invoiceId}
        maxAmount={balance}
      />

      <RecordWriteOffDialog
        open={writeOffOpen}
        onOpenChange={setWriteOffOpen}
        customerId={invoice.customer_id}
        customerName={invoice.customer?.name}
        invoiceId={invoice.id}
        invoiceNo={invoice.invoice_no}
        defaultAmount={balance > 0 ? balance : undefined}
      />

      <ConfirmDialog
        open={confirmDel}
        onOpenChange={setConfirmDel}
        title="Delete invoice?"
        description={`${invoice.invoice_no} will be removed.`}
        busy={delMut.isPending}
        onConfirm={() => delMut.mutate()}
      />

      <EWayBillDialog
        open={ewbOpen}
        onOpenChange={setEwbOpen}
        invoice={invoice}
        items={items.data ?? []}
      />
    </div>
  );
}

function RecordPaymentDialog({
  open,
  onOpenChange,
  invoiceId,
  maxAmount,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  invoiceId: string;
  maxAmount: number;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<RecordPaymentInput>({
    invoice_id: invoiceId,
    amount: maxAmount,
    method: "bank_transfer",
    paid_at: null,
    reference_no: null,
    notes: null,
  });

  const mutation = useMutation({
    mutationFn: recordManualPayment,
    onSuccess: () => {
      toast.success("Payment recorded");
      invalidatePayment(qc, undefined, invoiceId);
      onOpenChange(false);
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const set = <K extends keyof RecordPaymentInput>(k: K, v: RecordPaymentInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
        </DialogHeader>
        <QuickForm
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate(form);
          }}
          busy={mutation.isPending}
        >
          <QuickForm.QuickFill>
            <Field label="Amount (INR)" required hint={`Balance: ${formatInr(maxAmount)}`}>
              <Input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => set("amount", Number(e.target.value))}
                required
              />
            </Field>
            <Field label="Method" required>
              <Select
                value={form.method}
                onValueChange={(v) => set("method", v as RecordPaymentInput["method"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                  <SelectItem value="upi_manual">UPI (manual)</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </QuickForm.QuickFill>

          <QuickForm.MoreDetails>
            <Field label="Paid on">
              <Input
                type="date"
                value={form.paid_at ?? ""}
                onChange={(e) => set("paid_at", e.target.value || null)}
              />
            </Field>
            <Field label="Reference no.">
              <Input
                value={form.reference_no ?? ""}
                onChange={(e) => set("reference_no", e.target.value || null)}
              />
            </Field>
            <Field label="Notes" className="md:col-span-2">
              <Textarea
                rows={2}
                value={form.notes ?? ""}
                onChange={(e) => set("notes", e.target.value || null)}
              />
            </Field>
          </QuickForm.MoreDetails>

          <QuickForm.Actions>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
            </Button>
          </QuickForm.Actions>
        </QuickForm>
      </DialogContent>
    </Dialog>
  );
}

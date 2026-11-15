import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { lookupStonemanOrder, requestStonemanOrderPin } from "@/lib/agents/agents.functions";
import type { CustomerSafeOrderDetails } from "@/lib/agents/stoneman/service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Package,
  Calendar,
  Clock,
  Truck,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Phone,
  MessageSquare,
  ArrowRight,
  Loader2,
  Layers,
  FileText,
  Download,
  Receipt,
  Printer,
  FileSpreadsheet,
  Building2,
  KeyRound,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors";
import { formatInr, toIndicDigits } from "@/lib/format";
import { buildWhatsappAppUrl } from "@/lib/whatsapp";
import { transliterateName } from "@/lib/i18n/transliterate";

export const Route = createFileRoute("/track/$orderNo")({
  ssr: false,
  validateSearch: (
    s: Record<string, unknown>,
  ): { phone?: string; pin?: string; token?: string } => ({
    phone: typeof s.phone === "string" ? s.phone : undefined,
    pin: typeof s.pin === "string" ? s.pin : undefined,
    token: typeof s.token === "string" ? s.token : undefined,
  }),
  component: OrderTrackingPage,
});

function OrderTrackingPage() {
  const { orderNo } = Route.useParams();
  const search = Route.useSearch();
  const { i18n } = useTranslation();

  // 6-digit tracking token auth (from query ?token= or orderNo parameter if it's 6 digits)
  const [tokenAuth, setTokenAuth] = useState<string | null>(() => {
    if (search.token && /^\d{6}$/.test(search.token)) return search.token;
    if (/^\d{6}$/.test(orderNo)) return orderNo;
    return null;
  });

  const [inputToken, setInputToken] = useState("");
  const [inputPhone, setInputPhone] = useState(search.phone ?? "");
  const [inputPin, setInputPin] = useState(search.pin ?? "");
  const [pinRequested, setPinRequested] = useState(Boolean(search.pin));
  const [isRequestingPin, setIsRequestingPin] = useState(false);
  const [selectedChallan, setSelectedChallan] = useState<{
    dispatchNo: string;
    dispatchDate: string;
    status: string;
    carrier?: string | null;
    vehicleNo?: string | null;
    items?: Array<{ description: string; quantity: number; unit: string }>;
  } | null>(null);

  // Phone + PIN fallback
  const [activeCredentials, setActiveCredentials] = useState<{
    phone: string;
    pin: string;
  } | null>(search.phone && search.pin ? { phone: search.phone, pin: search.pin } : null);

  const trackingQuery = useQuery({
    queryKey: [
      "order-tracking",
      orderNo,
      activeCredentials?.phone,
      activeCredentials?.pin,
      tokenAuth,
    ],
    queryFn: async (): Promise<CustomerSafeOrderDetails> => {
      if (tokenAuth) {
        return lookupStonemanOrder({
          data: {
            orderNo,
            token: tokenAuth,
          },
        });
      }
      if (!activeCredentials) {
        throw new Error("6-digit tracking token or phone and PIN are required");
      }
      return lookupStonemanOrder({
        data: {
          orderNo,
          phone: activeCredentials.phone,
          verificationCode: activeCredentials.pin,
        },
      });
    },
    enabled: Boolean(tokenAuth || (activeCredentials?.phone && activeCredentials?.pin)),
    retry: false,
  });

  const handleVerifyToken = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputToken.replace(/\D+/g, "");
    if (clean.length !== 6) {
      toast.error("Please enter a valid 6-digit numeric token");
      return;
    }
    setTokenAuth(clean);
  };

  const handleRequestPin = async () => {
    const cleanPhone = inputPhone.replace(/\D+/g, "");
    if (cleanPhone.length < 10) {
      toast.error("Please enter a valid 10-digit registered phone number");
      return;
    }

    try {
      setIsRequestingPin(true);
      const res = await requestStonemanOrderPin({
        data: { orderNo, phone: cleanPhone },
      });
      setInputPin(res.pin);
      setPinRequested(true);
      toast.success(res.message);
    } catch (err) {
      toast.error(toUserMessage(err));
    } finally {
      setIsRequestingPin(false);
    }
  };

  const handleVerifyPhonePin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = inputPhone.replace(/\D+/g, "");
    const cleanPin = inputPin.trim();

    if (cleanPhone.length < 10) {
      toast.error("Please enter a valid 10-digit registered phone number");
      return;
    }
    if (!cleanPin) {
      toast.error("Please enter the 6-digit verification PIN");
      return;
    }

    setActiveCredentials({ phone: cleanPhone, pin: cleanPin });
  };

  // Official Stone Tech WhatsApp: +91 77420 90866
  const supportWhatsappUrl = buildWhatsappAppUrl(
    "917742090866",
    `Namaste Stone Tech, I would like to enquire about my stone order ${orderNo}.`,
  );

  const order = trackingQuery.data;
  const isVerified = Boolean(order && !trackingQuery.isError);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/60 dark:from-slate-950 dark:to-slate-900 text-foreground py-8 px-4 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold shadow-sm">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Stone Tech OS · Live Order &amp; Document Tracking
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                Order #{order?.orderNo ?? orderNo}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={supportWhatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors font-medium dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200"
            >
              <MessageSquare className="h-3.5 w-3.5 text-emerald-600 fill-current" />
              WhatsApp: +91 77420 90866
            </a>
          </div>
        </div>

        {/* Verification Card (shown if not yet verified or error) */}
        {!isVerified ? (
          <Card className="border-border shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2 text-primary font-medium text-sm">
                <ShieldCheck className="h-4 w-4" />
                Customer Order Verification
              </div>
              <CardTitle className="text-xl">Track Your Natural Stone Order</CardTitle>
              <CardDescription>
                Enter your 6-digit Tracking Token sent to your WhatsApp upon quotation approval, or
                verify via your registered mobile number.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Option 1: 6-Digit Token */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <KeyRound className="h-4 w-4 text-primary" />
                  Have your 6-digit WhatsApp Tracking Token?
                </div>
                <p className="text-xs text-muted-foreground">
                  Instant access to live order progress, delivery challans, invoices, and ledger
                  statements.
                </p>
                <form onSubmit={handleVerifyToken} className="flex gap-2">
                  <Input
                    type="text"
                    value={inputToken}
                    onChange={(e) => setInputToken(e.target.value)}
                    placeholder="Enter 6-digit token (e.g. 583921)"
                    maxLength={6}
                    className="font-mono text-sm tracking-widest text-center max-w-[220px] bg-background"
                  />
                  <Button
                    type="submit"
                    disabled={
                      trackingQuery.isLoading || inputToken.replace(/\D+/g, "").length !== 6
                    }
                    className="gap-1.5"
                  >
                    {trackingQuery.isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Track
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </form>
              </div>

              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <span className="relative bg-card px-2 text-[11px] font-medium uppercase text-muted-foreground">
                  Or verify with registered phone
                </span>
              </div>

              {/* Option 2: Phone + PIN */}
              <form onSubmit={handleVerifyPhonePin} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Registered Mobile Number
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="tel"
                      value={inputPhone}
                      onChange={(e) => setInputPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="font-mono text-sm"
                      maxLength={14}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleRequestPin}
                      disabled={isRequestingPin || inputPhone.replace(/\D+/g, "").length < 10}
                      className="shrink-0"
                    >
                      {isRequestingPin && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Get PIN
                    </Button>
                  </div>
                </div>

                {pinRequested && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">
                      6-Digit Security Verification PIN
                    </label>
                    <Input
                      type="text"
                      value={inputPin}
                      onChange={(e) => setInputPin(e.target.value)}
                      placeholder="6-digit PIN"
                      className="font-mono text-sm tracking-widest text-center max-w-[200px]"
                      maxLength={6}
                    />
                  </div>
                )}

                {trackingQuery.isError && (
                  <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{toUserMessage(trackingQuery.error)}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={trackingQuery.isLoading || !inputPin.trim()}
                  className="w-full"
                >
                  {trackingQuery.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify with Phone &amp; PIN
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : trackingQuery.isLoading ? (
          <Card className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
            <p className="text-sm font-medium">Retrieving latest stone fabrication milestones…</p>
          </Card>
        ) : order ? (
          <div className="space-y-6">
            {/* Customer & Token Identification Header */}
            {order.customerName && (
              <div className="rounded-xl border border-border/80 bg-background/90 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Client Name
                  </div>
                  <div className="text-base font-bold text-foreground">
                    {transliterateName(order.customerName, i18n.language)}
                  </div>
                </div>
                {order.trackingToken && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Permanent Token:</span>
                    <Badge
                      variant="outline"
                      className="font-mono text-xs px-2 py-0.5 font-bold bg-muted/50"
                    >
                      {order.trackingToken}
                    </Badge>
                  </div>
                )}
              </div>
            )}

            {/* Delay Sensing / Status Banner Card */}
            <Card
              className={`border overflow-hidden ${
                order.isCompleted
                  ? "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-800"
                  : order.isDelayed
                    ? "border-amber-300 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-800"
                    : "border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800"
              }`}
            >
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Current Status
                      </span>
                      <Badge
                        variant={
                          order.isCompleted
                            ? "default"
                            : order.isDelayed
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {order.isCompleted
                          ? "Delivered & Complete"
                          : order.isDelayed
                            ? `Schedule Coordinated · ${order.delayDays ?? 0}d`
                            : "On Schedule"}
                      </Badge>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                      {order.statusText}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {order.whatsBeenDone ||
                        "Material allocation, sizing, and quality checks in progress."}
                    </p>
                  </div>

                  <div className="rounded-xl bg-background/80 border p-4 sm:text-right shrink-0">
                    <div className="text-xs text-muted-foreground font-medium flex items-center gap-1 sm:justify-end">
                      <Calendar className="h-3.5 w-3.5" /> Promised Delivery Date
                    </div>
                    <div className="text-base font-bold font-mono mt-0.5">
                      {order.estimatedDeliveryDate ?? "Under Scheduling"}
                    </div>
                    <div className="text-xs font-medium mt-1">
                      {order.isCompleted ? (
                        <span className="text-emerald-600 flex items-center gap-1 sm:justify-end">
                          <CheckCircle2 className="h-3 w-3" /> Successfully Delivered
                        </span>
                      ) : order.isDelayed ? (
                        <span className="text-amber-600 flex items-center gap-1 sm:justify-end">
                          <AlertTriangle className="h-3 w-3" /> Refining finish precision
                        </span>
                      ) : (
                        <span className="text-emerald-600 flex items-center gap-1 sm:justify-end">
                          <CheckCircle2 className="h-3 w-3" /> Expected on time
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Visual Milestones Timeline ("What's been done yet") */}
            <Card className="border-border shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      Order Milestones &amp; Progress
                    </CardTitle>
                    <CardDescription>
                      Live fabrication and fulfillment milestones for order {order.orderNo}.
                    </CardDescription>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    Booked on: {order.orderDate}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2 sm:before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                  {(order.milestones ?? []).map((m, idx) => {
                    const isDone = m.status === "completed";
                    const isCurrent = m.status === "current";

                    return (
                      <div key={m.key} className="relative group">
                        {/* Step Icon Indicator */}
                        <div
                          className={`absolute -left-6 sm:-left-8 top-0.5 flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                            isDone
                              ? "bg-emerald-600 text-white shadow-sm"
                              : isCurrent
                                ? "bg-primary text-primary-foreground ring-4 ring-primary/20 animate-pulse"
                                : "bg-muted text-muted-foreground border border-border"
                          }`}
                        >
                          {isDone ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <span>{idx + 1}</span>
                          )}
                        </div>

                        {/* Step Details */}
                        <div className="pl-3 sm:pl-4">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`font-semibold text-sm ${
                                isCurrent
                                  ? "text-primary"
                                  : isDone
                                    ? "text-foreground"
                                    : "text-muted-foreground"
                              }`}
                            >
                              {m.label}
                            </span>
                            {m.completedAt && (
                              <span className="text-[11px] font-mono text-muted-foreground">
                                {m.completedAt}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                            {m.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Delivery Challans & Transit Records */}
            {order.dispatches && order.dispatches.length > 0 && (
              <Card className="border-border shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Truck className="h-4 w-4 text-primary" />
                        Delivery Challans &amp; Transit Records
                      </CardTitle>
                      <CardDescription>
                        Consignments dispatched from Stone Tech atelier. Click any challan to view
                        and print.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="divide-y divide-border">
                    {order.dispatches.map((d) => (
                      <div
                        key={d.dispatchNo}
                        className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="font-semibold text-sm font-mono text-foreground flex items-center gap-2">
                            {d.dispatchNo}
                            <Badge variant="outline" className="capitalize text-[10px]">
                              {d.status.replace(/_/g, " ")}
                            </Badge>
                          </div>
                          <div className="text-muted-foreground mt-0.5">
                            Dispatched on: {d.dispatchDate}
                            {d.carrier && ` · Carrier: ${d.carrier}`}
                            {d.vehicleNo && ` · Vehicle: ${d.vehicleNo}`}
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1.5 shrink-0"
                          onClick={() => setSelectedChallan(d)}
                        >
                          <FileText className="h-3.5 w-3.5 text-primary" />
                          View Delivery Challan
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Lifetime Customer Statement & Ledger Card */}
            {order.ledgerStatement && (
              <Card className="border-border shadow-sm print:border-none print:shadow-none">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-primary" />
                        Customer Account Statement &amp; Ledger
                      </CardTitle>
                      <CardDescription>
                        Complete financial summary, invoices, and payments on record.
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.print()}
                      className="h-8 text-xs gap-1.5 shrink-0 print:hidden"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Print Statement
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Summary Metric Strip */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
                      <div className="text-[11px] font-medium text-muted-foreground uppercase">
                        Total Invoiced
                      </div>
                      <div className="text-lg font-bold font-mono text-foreground mt-0.5">
                        {formatInr(order.ledgerStatement.totalBilled)}
                      </div>
                    </div>
                    <div className="rounded-xl border border-emerald-300/40 bg-emerald-50/30 dark:bg-emerald-950/20 p-3">
                      <div className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300 uppercase">
                        Total Paid
                      </div>
                      <div className="text-lg font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-0.5">
                        {formatInr(order.ledgerStatement.totalPaid)}
                      </div>
                    </div>
                    <div className="rounded-xl border border-amber-300/40 bg-amber-50/30 dark:bg-amber-950/20 p-3">
                      <div className="text-[11px] font-medium text-amber-800 dark:text-amber-300 uppercase">
                        Balance Outstanding
                      </div>
                      <div className="text-lg font-bold font-mono text-amber-700 dark:text-amber-400 mt-0.5">
                        {formatInr(order.ledgerStatement.balanceDue)}
                      </div>
                    </div>
                  </div>

                  {/* Invoices List */}
                  {order.ledgerStatement.invoices.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Invoices ({order.ledgerStatement.invoices.length})
                      </div>
                      <div className="rounded-lg border border-border/70 overflow-hidden divide-y divide-border/60 text-xs">
                        {order.ledgerStatement.invoices.map((inv) => (
                          <div
                            key={inv.id}
                            className="p-2.5 flex items-center justify-between gap-3"
                          >
                            <div>
                              <div className="font-semibold font-mono text-foreground">
                                {inv.invoiceNo}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                Date: {inv.date}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-mono font-bold">{formatInr(inv.amount)}</div>
                              <Badge variant="outline" className="text-[10px] capitalize">
                                {inv.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Receipts List */}
                  {order.ledgerStatement.receipts.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Payment Receipts ({order.ledgerStatement.receipts.length})
                      </div>
                      <div className="rounded-lg border border-border/70 overflow-hidden divide-y divide-border/60 text-xs">
                        {order.ledgerStatement.receipts.map((rcpt) => (
                          <div
                            key={rcpt.id}
                            className="p-2.5 flex items-center justify-between gap-3"
                          >
                            <div>
                              <div className="font-semibold font-mono text-foreground">
                                {rcpt.receiptNo}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                Date: {rcpt.date} · Method: {rcpt.method}
                              </div>
                            </div>
                            <div className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              +{formatInr(rcpt.amount)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Items Summary */}
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  Order Material Summary
                </CardTitle>
                <CardDescription>
                  Natural stone specifications allocated for this order.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-border/60">
                  {order.itemsSummary.map((item, idx) => (
                    <div
                      key={idx}
                      className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4 text-xs"
                    >
                      <div className="font-medium text-foreground">{item.itemDescription}</div>
                      <div className="font-mono text-muted-foreground font-semibold shrink-0">
                        {item.quantity} {item.unit}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Advisory Notice */}
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-xs text-muted-foreground flex items-start gap-3">
              <div>
                <span className="font-semibold text-foreground">Packaging &amp; Unloading: </span>
                {order.notice}
              </div>
            </div>
          </div>
        ) : null}

        {/* Delivery Challan Modal */}
        <Dialog
          open={Boolean(selectedChallan)}
          onOpenChange={(open) => !open && setSelectedChallan(null)}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <DialogTitle className="text-lg font-bold font-mono">
                    Delivery Challan #{selectedChallan?.dispatchNo}
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Stone Tech Architectural Stone Atelier
                  </DialogDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.print()}
                  className="gap-1.5 h-8 text-xs"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print Challan
                </Button>
              </div>
            </DialogHeader>

            {selectedChallan && (
              <div className="space-y-4 text-xs py-2">
                <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/30 p-3">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Dispatch Date</span>
                    <span className="font-medium">{selectedChallan.dispatchDate}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">
                      Consignment Status
                    </span>
                    <Badge variant="outline" className="capitalize text-[10px] mt-0.5">
                      {selectedChallan.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">
                      Transporter / Carrier
                    </span>
                    <span className="font-medium">
                      {selectedChallan.carrier || "Stone Tech Direct Logistics"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Vehicle Number</span>
                    <span className="font-medium font-mono">
                      {selectedChallan.vehicleNo || "N/A"}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="font-semibold text-sm mb-2">Material / Consignment Items</div>
                  <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
                    <div className="bg-muted/40 p-2 font-medium flex justify-between">
                      <span>Stone Description</span>
                      <span>Quantity</span>
                    </div>
                    {selectedChallan.items && selectedChallan.items.length > 0 ? (
                      selectedChallan.items.map((it, idx) => (
                        <div key={idx} className="p-2 flex justify-between">
                          <span>{it.description}</span>
                          <span className="font-mono font-bold">
                            {it.quantity} {it.unit}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-center text-muted-foreground">
                        Consolidated consignment dispatched as per order scope.
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t pt-3 flex justify-between items-end text-muted-foreground text-[11px]">
                  <div>
                    <div>Dispatched from: Stone Tech Atelier, Ahmedabad</div>
                    <div>Support: +91 77420 90866 · info@stonetech.in</div>
                  </div>
                  <div className="text-right">
                    <div className="h-8 border-b border-muted-foreground/40 w-32 mb-1" />
                    <span>Authorized Signatory</span>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pt-4 border-t border-border/60">
          Stone Tech OS · Engineered for Architectural Precision &amp; Natural Stone Excellence
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { lookupStonemanOrder, requestStonemanOrderPin } from "@/lib/agents/agents.functions";
import type { CustomerSafeOrderDetails } from "@/lib/agents/stoneman/service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors";
import { buildWhatsappAppUrl } from "@/lib/whatsapp";

export const Route = createFileRoute("/track/$orderNo")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { phone?: string; pin?: string } => ({
    phone: typeof s.phone === "string" ? s.phone : undefined,
    pin: typeof s.pin === "string" ? s.pin : undefined,
  }),
  component: OrderTrackingPage,
});

function OrderTrackingPage() {
  const { orderNo } = Route.useParams();
  const search = Route.useSearch();

  const [inputPhone, setInputPhone] = useState(search.phone ?? "");
  const [inputPin, setInputPin] = useState(search.pin ?? "");
  const [pinRequested, setPinRequested] = useState(Boolean(search.pin));
  const [isRequestingPin, setIsRequestingPin] = useState(false);

  // Auto-verify if phone and PIN were passed in query parameters
  const [activeCredentials, setActiveCredentials] = useState<{
    phone: string;
    pin: string;
  } | null>(search.phone && search.pin ? { phone: search.phone, pin: search.pin } : null);

  const trackingQuery = useQuery({
    queryKey: ["order-tracking", orderNo, activeCredentials?.phone, activeCredentials?.pin],
    queryFn: async (): Promise<CustomerSafeOrderDetails> => {
      if (!activeCredentials) {
        throw new Error("Phone and verification PIN are required");
      }
      return lookupStonemanOrder({
        data: {
          orderNo,
          phone: activeCredentials.phone,
          verificationCode: activeCredentials.pin,
        },
      });
    },
    enabled: Boolean(activeCredentials?.phone && activeCredentials?.pin),
    retry: false,
  });

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

  const handleVerify = (e: React.FormEvent) => {
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

  const supportWhatsappUrl = buildWhatsappAppUrl(
    "919876543210",
    `Namaste Stone Tech, I would like to enquire about my stone order ${orderNo}.`,
  );

  const order = trackingQuery.data;

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
                Stone Tech OS · Live Order Tracking
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Order #{orderNo}</h1>
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
              WhatsApp Support
            </a>
          </div>
        </div>

        {/* Verification Card (shown if not yet verified or error) */}
        {!activeCredentials || trackingQuery.isError ? (
          <Card className="border-border shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2 text-primary font-medium text-sm">
                <ShieldCheck className="h-4 w-4" />
                Customer Identity Verification
              </div>
              <CardTitle className="text-xl">Track Your Natural Stone Order</CardTitle>
              <CardDescription>
                To safeguard order details, please enter the registered 10-digit mobile number
                provided during order booking.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerify} className="space-y-4">
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
                  Verify & Track Order
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
                      Order Milestones & Progress
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

            {/* Dispatches / Delivery Challans (if any) */}
            {order.dispatches && order.dispatches.length > 0 && (
              <Card className="border-border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Truck className="h-4 w-4 text-primary" />
                    Delivery Challans & Transit Records
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="divide-y divide-border">
                    {order.dispatches.map((d) => (
                      <div
                        key={d.dispatchNo}
                        className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <div className="font-semibold text-sm font-mono text-foreground">
                            {d.dispatchNo}
                          </div>
                          <div className="text-muted-foreground mt-0.5">
                            Dispatched on: {d.dispatchDate}
                            {d.carrier && ` · Carrier: ${d.carrier}`}
                            {d.vehicleNo && ` · Vehicle: ${d.vehicleNo}`}
                          </div>
                        </div>
                        <Badge variant="outline" className="capitalize w-fit">
                          {d.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    ))}
                  </div>
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
              <Sparkles className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-foreground">Packaging & Unloading: </span>
                {order.notice}
              </div>
            </div>
          </div>
        ) : null}

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pt-4 border-t border-border/60">
          Stone Tech OS · Engineered for Architectural Precision & Natural Stone Excellence
        </div>
      </div>
    </div>
  );
}

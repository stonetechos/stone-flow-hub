/**
 * StoneMan Customer Assistant Public Modal / Floating Console.
 *
 * Provides customer-safe interaction on public pages with the exact same
 * visual design as the internal StoneMan Copilot window:
 * 1. StoneMan mascot sitting on top holding the console screen.
 * 2. Halo glow and dark glassmorphic bezel styling.
 * 3. Screen top notch with STONEMAN SCREEN indicator.
 * 4. Fixed consistent dimensions across ALL tabs (never changes size).
 * 5. Stone knowledge base, verified order tracking, and complaints.
 */
import { useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Sparkles,
  Search,
  ShieldCheck,
  CheckCircle2,
  Phone,
  MessageSquare,
  HelpCircle,
  Truck,
  Loader2,
  Lock,
  X,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { STONEMAN_PUBLIC_FAQS, type CustomerSafeOrderDetails } from "@/lib/agents/stoneman/service";
import {
  lookupStonemanOrder,
  requestStonemanOrderPin,
  submitStonemanComplaint,
} from "@/lib/agents/agents.functions";

interface StonemanCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StonemanCustomerDialog({ open, onOpenChange }: StonemanCustomerDialogProps) {
  const [activeTab, setActiveTab] = useState<"faqs" | "track" | "complaint">("faqs");
  const [isWideScreen, setIsWideScreen] = useState(false);

  // Track order state
  const [orderNo, setOrderNo] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [pinSent, setPinSent] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [orderDetails, setOrderDetails] = useState<CustomerSafeOrderDetails | null>(null);

  // Complaint state
  const [complaintName, setComplaintName] = useState("");
  const [complaintPhone, setComplaintPhone] = useState("");
  const [complaintOrderNo, setComplaintOrderNo] = useState("");
  const [complaintText, setComplaintText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<{
    ticketId: string;
    acknowledgementMessage: string;
  } | null>(null);

  // FAQ search
  const [faqSearch, setFaqSearch] = useState("");

  const filteredFaqs = STONEMAN_PUBLIC_FAQS.filter(
    (f) =>
      f.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
      f.answer.toLowerCase().includes(faqSearch.toLowerCase()),
  );

  const [isRequestingPin, setIsRequestingPin] = useState(false);

  const handleRequestPin = async () => {
    if (!orderNo.trim()) {
      toast.error("Please enter your Order Reference (e.g. SO-2026-0042).");
      return;
    }
    const clean = phone.replace(/\D+/g, "");
    if (!clean || clean.length < 10) {
      toast.error("Please enter your 10-digit registered phone number.");
      return;
    }

    setIsRequestingPin(true);
    try {
      const res = await requestStonemanOrderPin({
        data: {
          orderNo: orderNo.trim(),
          phone: phone.trim(),
        },
      });
      setPinSent(true);
      setPin(res.pin);
      toast.success(res.message);
    } catch (err) {
      toast.error(toUserMessage(err));
    } finally {
      setIsRequestingPin(false);
    }
  };

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNo.trim() || !phone.trim()) {
      toast.error("Please provide both order reference and registered phone number.");
      return;
    }
    if (!pin.trim()) {
      toast.error("Please enter your 6-digit security PIN to verify identity.");
      return;
    }

    setIsLookingUp(true);
    setOrderDetails(null);
    try {
      const res = await lookupStonemanOrder({
        data: {
          orderNo: orderNo.trim(),
          phone: phone.trim(),
          verificationCode: pin.trim(),
        },
      });
      setOrderDetails(res);
      toast.success("Order status verified successfully.");
    } catch (err) {
      toast.error(toUserMessage(err));
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintName.trim()) {
      toast.error("Please enter your name.");
      return;
    }
    if (!complaintPhone.trim() || complaintPhone.replace(/\D+/g, "").length < 10) {
      toast.error("Please enter a valid 10-digit phone number.");
      return;
    }
    if (!complaintText.trim() || complaintText.trim().length < 5) {
      toast.error("Please describe your concern in at least a few words.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitStonemanComplaint({
        data: {
          customerName: complaintName.trim(),
          phone: complaintPhone.trim(),
          orderNo: complaintOrderNo.trim() || undefined,
          complaintDetails: complaintText.trim(),
        },
      });
      setSubmittedTicket(res);
      toast.success(`Complaint registered! Reference #${res.ticketId}`);
    } catch (err) {
      toast.error(toUserMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetComplaintForm = () => {
    setSubmittedTicket(null);
    setComplaintName("");
    setComplaintPhone("");
    setComplaintOrderNo("");
    setComplaintText("");
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity duration-300 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed z-50 flex flex-col items-center justify-end overflow-visible focus:outline-none transition-all duration-300",
            isWideScreen
              ? "inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 bottom-3 sm:bottom-4 w-full sm:w-[760px] md:w-[840px] max-w-[calc(100vw-24px)] h-[min(90dvh,800px)]"
              : "right-2 sm:right-6 md:right-8 bottom-3 sm:bottom-4 w-full sm:w-[480px] md:w-[520px] max-w-[calc(100vw-16px)] h-[min(90dvh,760px)]",
          )}
        >
          <DialogPrimitive.Title className="sr-only">
            StoneMan Customer Assistant Screen
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Interactive AI Console held by StoneMan Mascot
          </DialogPrimitive.Description>

          {/* StoneMan Mascot Sitting on Top & Holding the Screen */}
          <div className="relative z-20 flex w-full justify-center select-none pointer-events-none -mb-5 sm:-mb-6 shrink-0">
            {/* Stone Energy Aura Glow */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-48 h-20 rounded-full bg-teal-500/25 blur-2xl -z-10 animate-pulse" />
            <img
              src="/stoneman-peeking-top.png"
              alt="StoneMan Mascot"
              className="h-24 sm:h-32 md:h-36 w-auto max-w-full object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.65)] select-none pointer-events-none"
              draggable={false}
            />
          </div>

          {/* Stone Body Hugging the Window from the Back */}
          <div className="pointer-events-none absolute -inset-1.5 sm:-inset-2.5 top-14 bottom-2 -z-10 rounded-[28px] sm:rounded-[36px] bg-gradient-to-b from-slate-700/50 via-slate-850/40 to-slate-900/60 border border-slate-700/50 shadow-2xl backdrop-blur-xs" />
          <div className="pointer-events-none absolute -inset-3 sm:-inset-5 top-12 bottom-0 -z-20 rounded-[36px] bg-teal-500/10 blur-2xl" />

          {/* The Big Screen Console Frame - Strict constant dimensions */}
          <div className="relative z-10 flex flex-1 min-h-0 w-full flex-col overflow-hidden rounded-2xl sm:rounded-3xl border-2 sm:border-[3px] border-slate-700/80 bg-slate-950/95 shadow-[0_25px_80px_rgba(0,0,0,0.7)] backdrop-blur-2xl ring-1 ring-teal-500/30 text-slate-100">
            {/* Screen Top Bezel Grip Notch (held by StoneMan's hands) */}
            <div className="flex h-7 w-full items-center justify-center bg-slate-900/90 border-b border-slate-800/80 px-4 select-none shrink-0">
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-[9px] font-mono tracking-widest text-teal-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-teal-500" />
                </span>
                STONEMAN SCREEN
              </div>
            </div>

            {/* Console Header */}
            <div className="flex items-center justify-between border-b border-slate-800/90 bg-slate-900/70 px-3.5 sm:px-4 py-2.5 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#083b43] to-teal-500 p-0.5 shadow-md">
                  <img
                    src="/stoneman-avatar.png"
                    alt="StoneMan AI"
                    className="h-full w-full rounded-[10px] object-cover"
                  />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-display text-sm font-bold tracking-tight text-white">
                      StoneMan AI
                    </span>
                    <span className="text-[10px] font-semibold text-teal-400 uppercase tracking-wide">
                      • LIVE
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Product Knowledge, Milestones & Care
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Badge
                  variant="outline"
                  className="text-[10px] uppercase font-mono tracking-wider border-teal-500/30 bg-teal-950/40 text-teal-300 hidden sm:inline-flex"
                >
                  Mascot Hub
                </Badge>

                {/* Wide screen toggle */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-800 hidden sm:inline-flex"
                  onClick={() => setIsWideScreen((v) => !v)}
                  title={isWideScreen ? "Dock to Side" : "Expand Big Screen"}
                >
                  {isWideScreen ? (
                    <Minimize2 className="h-3.5 w-3.5" />
                  ) : (
                    <Maximize2 className="h-3.5 w-3.5" />
                  )}
                </Button>

                {/* Close button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                  onClick={() => onOpenChange(false)}
                  title="Close Screen"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Content Tabs Header */}
            <div className="px-3.5 sm:px-4 py-2 border-b border-slate-800/80 bg-slate-900/60 shrink-0">
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as typeof activeTab)}
                className="w-full"
              >
                <TabsList className="h-8 w-full bg-slate-950/80 border border-slate-800 p-0.5 grid grid-cols-3">
                  <TabsTrigger
                    value="faqs"
                    className="h-7 text-xs font-semibold data-[state=active]:bg-teal-600 data-[state=active]:text-white text-slate-400 gap-1.5 cursor-pointer"
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                    <span>Knowledge</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="track"
                    className="h-7 text-xs font-semibold data-[state=active]:bg-teal-600 data-[state=active]:text-white text-slate-400 gap-1.5 cursor-pointer"
                  >
                    <Truck className="h-3.5 w-3.5" />
                    <span>Track Order</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="complaint"
                    className="h-7 text-xs font-semibold data-[state=active]:bg-teal-600 data-[state=active]:text-white text-slate-400 gap-1.5 cursor-pointer"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>Support</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Scrollable Tab Body - Always fills remaining vertical space, NEVER resizes */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* TAB 1: FAQS */}
              {activeTab === "faqs" && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search stone varieties, finishes, cutting process…"
                      value={faqSearch}
                      onChange={(e) => setFaqSearch(e.target.value)}
                      className="pl-9 text-xs h-9 bg-slate-900/90 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-teal-500"
                    />
                  </div>

                  <div className="space-y-2.5 pt-1">
                    {filteredFaqs.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 text-xs">
                        No matching answers found. Feel free to contact our support team.
                      </div>
                    ) : (
                      filteredFaqs.map((faq, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-900/60 space-y-1.5 hover:border-slate-700 transition-colors"
                        >
                          <h4 className="text-xs font-bold text-slate-100 flex items-start gap-1.5">
                            <span className="text-teal-400 font-mono font-bold">Q:</span>
                            <span>{faq.question}</span>
                          </h4>
                          <p className="text-xs text-slate-300 pl-4 leading-relaxed">
                            {faq.answer}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Human escalation */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <span>Need tailored assistance?</span>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs font-semibold gap-1.5 text-teal-300 border-teal-500/40 bg-teal-950/30 hover:bg-teal-900/40 hover:text-white"
                    >
                      <a
                        href="https://api.whatsapp.com/send?phone=917742090866&text=Hi%20StoneMan,%20I%20would%20like%20to%20speak%20with%20a%20human%20stone%20expert."
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Phone className="h-3 w-3" />
                        <span>Chat With Expert</span>
                      </a>
                    </Button>
                  </div>
                </div>
              )}

              {/* TAB 2: TRACK ORDER (OTP / PIN SECURED) */}
              {activeTab === "track" && (
                <div className="space-y-4">
                  <div className="rounded-xl bg-teal-950/40 border border-teal-500/30 p-3.5 text-xs text-teal-200 flex items-start gap-2.5">
                    <ShieldCheck className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-semibold text-teal-300">Secure Order Verification</p>
                      <p className="text-teal-200/80 text-[11px] leading-relaxed">
                        To safeguard client privacy, order milestones are protected by registered
                        phone and security PIN verification.
                      </p>
                    </div>
                  </div>

                  {!orderDetails ? (
                    <form onSubmit={handleTrackOrder} className="space-y-3.5">
                      <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                          Order or Invoice Reference #
                        </label>
                        <Input
                          placeholder="e.g. SO-2026-0042 or INV-0018"
                          value={orderNo}
                          onChange={(e) => setOrderNo(e.target.value)}
                          className="text-xs h-9 uppercase bg-slate-900/90 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-teal-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                          Registered 10-Digit Mobile Number
                        </label>
                        <Input
                          placeholder="e.g. 9876543210"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="text-xs h-9 bg-slate-900/90 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-teal-500"
                          maxLength={15}
                          required
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-slate-300">
                            Security Verification PIN
                          </label>
                          <button
                            type="button"
                            onClick={handleRequestPin}
                            disabled={isRequestingPin}
                            className="text-[11px] font-semibold text-teal-400 hover:text-teal-300 hover:underline cursor-pointer disabled:opacity-50"
                          >
                            {isRequestingPin
                              ? "Sending PIN…"
                              : pinSent
                                ? "Re-send PIN"
                                : "Get Verification PIN"}
                          </button>
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                          <Input
                            type="password"
                            placeholder="Enter 6-digit security PIN"
                            value={pin}
                            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            className="pl-9 text-xs h-9 font-mono tracking-widest bg-slate-900/90 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-teal-500"
                            maxLength={6}
                            required
                          />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          A matching phone number alone cannot view data. Security verification PIN
                          confirms order ownership.
                        </p>
                      </div>

                      <Button
                        type="submit"
                        disabled={isLookingUp}
                        className="w-full h-9.5 text-xs font-semibold gap-1.5 bg-teal-600 hover:bg-teal-500 text-white cursor-pointer shadow-md"
                      >
                        {isLookingUp ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ShieldCheck className="h-3.5 w-3.5" />
                        )}
                        <span>Verify & View Milestones</span>
                      </Button>
                    </form>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/80 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                          <div>
                            <span className="text-[10px] uppercase font-mono text-teal-400 block">
                              Verified Order
                            </span>
                            <h4 className="text-sm font-bold text-white">{orderDetails.orderNo}</h4>
                          </div>
                          <Badge
                            className={
                              orderDetails.isCompleted
                                ? "bg-teal-500/20 text-teal-300 border-teal-500/40 text-xs"
                                : "bg-amber-500/20 text-amber-300 border-amber-500/40 text-xs"
                            }
                          >
                            {orderDetails.statusText}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-slate-400 text-[11px]">Order Date:</span>
                            <p className="font-medium text-slate-200">{orderDetails.orderDate}</p>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[11px]">Estimated Delivery:</span>
                            <p className="font-medium text-slate-200">
                              {orderDetails.estimatedDeliveryDate || "In Schedule Coordination"}
                            </p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-800">
                          <span className="text-slate-400 text-[11px] font-semibold block mb-1.5">
                            Items Summary:
                          </span>
                          <div className="space-y-1">
                            {orderDetails.itemsSummary.map((it, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60"
                              >
                                <span className="text-slate-200 font-medium">
                                  {it.itemDescription}
                                </span>
                                <span className="text-teal-400 font-mono text-[11px]">
                                  {it.quantity} {it.unit}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <p className="text-[11px] text-teal-300/90 bg-teal-950/40 p-2.5 rounded-lg border border-teal-500/20 italic">
                          {orderDetails.notice}
                        </p>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setOrderDetails(null);
                          setPin("");
                        }}
                        className="w-full text-xs h-8 border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800 cursor-pointer"
                      >
                        Check Another Order
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: HELP & COMPLAINTS */}
              {activeTab === "complaint" && (
                <div className="space-y-3">
                  {!submittedTicket ? (
                    <form onSubmit={handleSubmitComplaint} className="space-y-3.5">
                      <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                          Full Name
                        </label>
                        <Input
                          placeholder="e.g. Ramesh Sharma"
                          value={complaintName}
                          onChange={(e) => setComplaintName(e.target.value)}
                          className="text-xs h-9 bg-slate-900/90 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-teal-500"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs font-semibold text-slate-300 block mb-1">
                            Contact Mobile #
                          </label>
                          <Input
                            placeholder="10 digits"
                            value={complaintPhone}
                            onChange={(e) => setComplaintPhone(e.target.value)}
                            className="text-xs h-9 bg-slate-900/90 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-teal-500"
                            maxLength={15}
                            required
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-300 block mb-1">
                            Order / Quote Ref (Optional)
                          </label>
                          <Input
                            placeholder="e.g. SO-0042"
                            value={complaintOrderNo}
                            onChange={(e) => setComplaintOrderNo(e.target.value)}
                            className="text-xs h-9 uppercase bg-slate-900/90 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-teal-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                          How Can We Help? (Details of concern or inquiry)
                        </label>
                        <Textarea
                          rows={4}
                          placeholder="Describe what occurred, sizing or delivery questions, or site feedback…"
                          value={complaintText}
                          onChange={(e) => setComplaintText(e.target.value)}
                          className="text-xs bg-slate-900/90 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-teal-500"
                          required
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full h-9.5 text-xs font-semibold gap-1.5 bg-teal-600 hover:bg-teal-500 text-white cursor-pointer shadow-md"
                      >
                        {isSubmitting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        <span>Submit & Get Tracking Reference</span>
                      </Button>
                    </form>
                  ) : (
                    <div className="text-center py-6 space-y-4">
                      <div className="h-14 w-14 rounded-2xl bg-teal-500/20 border border-teal-500/40 text-teal-400 flex items-center justify-center mx-auto shadow-inner">
                        <CheckCircle2 className="h-7 w-7" />
                      </div>
                      <div>
                        <span className="text-[11px] font-mono uppercase text-teal-400 block tracking-wider">
                          Registered Ticket Reference
                        </span>
                        <h3 className="text-xl font-mono font-bold text-white mt-1">
                          {submittedTicket.ticketId}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                        {submittedTicket.acknowledgementMessage}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={resetComplaintForm}
                        className="h-8 text-xs border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800 cursor-pointer"
                      >
                        Submit Another Inquiry
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

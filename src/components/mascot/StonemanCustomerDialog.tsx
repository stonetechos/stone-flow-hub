/**
 * StoneMan Customer Assistant Public Modal / Drawer.
 *
 * Provides customer-safe interaction on public pages:
 * 1. Product, finish, and process knowledge base.
 * 2. Secure order status lookup (requires phone + order verification).
 * 3. Complaint and service request registration with reference ticket.
 * 4. Direct human escalation via WhatsApp.
 */
import { useState } from "react";
import {
  Sparkles,
  Search,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Phone,
  MessageSquare,
  HelpCircle,
  Truck,
  FileText,
  Loader2,
  ExternalLink,
  ChevronRight,
  Lock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px] p-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center p-1 shadow-inner">
              <img
                src="/stoneman-avatar.png"
                alt="StoneMan Mascot"
                className="h-full w-full object-contain drop-shadow"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              <Sparkles className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-bold text-white tracking-wide">
                  StoneMan Assistant
                </DialogTitle>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-mono">
                  Official Mascot
                </Badge>
              </div>
              <DialogDescription className="text-xs text-slate-300 mt-0.5">
                Product Knowledge, Order Milestones & Customer Care
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="border-b px-4 bg-slate-50/50">
            <TabsList className="bg-transparent h-11 w-full justify-start gap-4 p-0">
              <TabsTrigger
                value="faqs"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none text-xs font-semibold px-2"
              >
                <HelpCircle className="h-3.5 w-3.5 mr-1.5" />
                Stone Knowledge
              </TabsTrigger>
              <TabsTrigger
                value="track"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none text-xs font-semibold px-2"
              >
                <Truck className="h-3.5 w-3.5 mr-1.5" />
                Track Order
              </TabsTrigger>
              <TabsTrigger
                value="complaint"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none text-xs font-semibold px-2"
              >
                <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                Help & Complaints
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* TAB 1: FAQS */}
            <TabsContent value="faqs" className="mt-0 space-y-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search stone varieties, finishes, cutting process…"
                  value={faqSearch}
                  onChange={(e) => setFaqSearch(e.target.value)}
                  className="pl-9 text-xs h-9"
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
                      className="p-3.5 rounded-lg border bg-white shadow-2xs space-y-1.5 hover:border-slate-300 transition-colors"
                    >
                      <h4 className="text-xs font-bold text-slate-900 flex items-start gap-1.5">
                        <span className="text-emerald-600 font-mono font-bold">Q:</span>
                        <span>{faq.question}</span>
                      </h4>
                      <p className="text-xs text-slate-600 pl-4 leading-relaxed">{faq.answer}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Human escalation */}
              <div className="pt-2 border-t flex items-center justify-between text-xs text-slate-500">
                <span>Need tailored architectural assistance?</span>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-semibold gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                >
                  <a
                    href="https://api.whatsapp.com/send?phone=917742090866&text=Hi%20StoneMan,%20I%20would%20like%20to%20speak%20with%20a%20human%20stone%20expert."
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Phone className="h-3 w-3" />
                    <span>Chat With Human Expert</span>
                  </a>
                </Button>
              </div>
            </TabsContent>

            {/* TAB 2: TRACK ORDER (OTP / PIN SECURED) */}
            <TabsContent value="track" className="mt-0 space-y-4">
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900 flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold">Secure Order Verification</p>
                  <p className="text-emerald-800 text-[11px] leading-relaxed">
                    To safeguard client privacy, order milestones are protected by registered phone
                    and security PIN verification.
                  </p>
                </div>
              </div>

              {!orderDetails ? (
                <form onSubmit={handleTrackOrder} className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Order or Invoice Reference #
                    </label>
                    <Input
                      placeholder="e.g. SO-2026-0042 or INV-0018"
                      value={orderNo}
                      onChange={(e) => setOrderNo(e.target.value)}
                      className="text-xs h-9 uppercase"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Registered 10-Digit Mobile Number
                    </label>
                    <Input
                      placeholder="e.g. 9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="text-xs h-9"
                      maxLength={15}
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700">
                        Security Verification PIN
                      </label>
                      <button
                        type="button"
                        onClick={handleRequestPin}
                        className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                      >
                        {pinSent ? "Re-send PIN" : "Get Verification PIN"}
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        type="password"
                        placeholder="Enter 6-digit security PIN"
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="pl-9 text-xs h-9 font-mono tracking-widest"
                        maxLength={6}
                        required
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      A matching phone number alone cannot view data. Security verification PIN
                      confirms order ownership.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLookingUp}
                    className="w-full h-9 text-xs font-semibold gap-1.5"
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
                  <div className="p-4 rounded-lg border bg-white shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b pb-2.5">
                      <div>
                        <span className="text-[10px] uppercase font-mono text-slate-400 block">
                          Verified Order
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">{orderDetails.orderNo}</h4>
                      </div>
                      <Badge
                        variant={orderDetails.isCompleted ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {orderDetails.statusText}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 text-[11px]">Order Date:</span>
                        <p className="font-medium text-slate-800">{orderDetails.orderDate}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[11px]">Estimated Delivery:</span>
                        <p className="font-medium text-slate-800">
                          {orderDetails.estimatedDeliveryDate || "In Schedule Coordination"}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t">
                      <span className="text-slate-500 text-[11px] font-semibold block mb-1.5">
                        Items Summary:
                      </span>
                      <div className="space-y-1">
                        {orderDetails.itemsSummary.map((it, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-50"
                          >
                            <span className="text-slate-700 font-medium">{it.itemDescription}</span>
                            <span className="text-slate-500 font-mono text-[11px]">
                              {it.quantity} {it.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded border border-slate-100 italic">
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
                    className="w-full text-xs h-8"
                  >
                    Check Another Order
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* TAB 3: HELP & COMPLAINTS */}
            <TabsContent value="complaint" className="mt-0 space-y-3">
              {!submittedTicket ? (
                <form onSubmit={handleSubmitComplaint} className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Full Name
                    </label>
                    <Input
                      placeholder="e.g. Ramesh Sharma"
                      value={complaintName}
                      onChange={(e) => setComplaintName(e.target.value)}
                      className="text-xs h-9"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Contact Mobile #
                      </label>
                      <Input
                        placeholder="10 digits"
                        value={complaintPhone}
                        onChange={(e) => setComplaintPhone(e.target.value)}
                        className="text-xs h-9"
                        maxLength={15}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Order / Quote Ref (Optional)
                      </label>
                      <Input
                        placeholder="e.g. SO-0042"
                        value={complaintOrderNo}
                        onChange={(e) => setComplaintOrderNo(e.target.value)}
                        className="text-xs h-9 uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      How Can We Help? (Details of concern or inquiry)
                    </label>
                    <Textarea
                      rows={3}
                      placeholder="Describe what occurred, sizing or delivery questions, or site feedback…"
                      value={complaintText}
                      onChange={(e) => setComplaintText(e.target.value)}
                      className="text-xs"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-9 text-xs font-semibold gap-1.5"
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
                <div className="text-center py-4 space-y-3">
                  <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-mono uppercase text-slate-400">
                      Registered Ticket Reference
                    </span>
                    <h3 className="text-lg font-black text-slate-900">
                      {submittedTicket.ticketId}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                    {submittedTicket.acknowledgementMessage}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetComplaintForm}
                    className="h-8 text-xs"
                  >
                    Submit Another Inquiry
                  </Button>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

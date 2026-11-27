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
import { useState, useEffect, useMemo } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
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
  AlertCircle,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Layers,
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
  submitStonemanProcurementRequest,
} from "@/lib/agents/agents.functions";
import { searchStonemanCatalog, type UnifiedCatalogItem } from "@/lib/catalog/stoneman-catalog-ai";

interface StonemanCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "faqs" | "track" | "complaint";
}

export function StonemanCustomerDialog({
  open,
  onOpenChange,
  defaultTab,
}: StonemanCustomerDialogProps) {
  const [activeTab, setActiveTab] = useState<"faqs" | "track" | "complaint">("faqs");

  useEffect(() => {
    if (open && defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [open, defaultTab]);
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

  // Discontinued / Custom procurement intake state
  const [isIntakeOpen, setIsIntakeOpen] = useState(false);
  const [intakeProduct, setIntakeProduct] = useState("");
  const [intakeName, setIntakeName] = useState("");
  const [intakePhone, setIntakePhone] = useState("");
  const [intakeCity, setIntakeCity] = useState("");
  const [intakeQuantity, setIntakeQuantity] = useState("");
  const [intakeNotes, setIntakeNotes] = useState("");
  const [isIntakeSubmitting, setIsIntakeSubmitting] = useState(false);
  const [intakeSuccess, setIntakeSuccess] = useState<{
    enquiryNo: string;
    message: string;
  } | null>(null);

  // Real-time Catalogue Analysis & Discontinued Product Search
  const [faqSearch, setFaqSearch] = useState("");

  const catalogSearchResult = useMemo(() => {
    return searchStonemanCatalog(faqSearch);
  }, [faqSearch]);

  const filteredFaqs = STONEMAN_PUBLIC_FAQS.filter(
    (f) =>
      !faqSearch.trim() ||
      f.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
      f.answer.toLowerCase().includes(faqSearch.toLowerCase()) ||
      f.category.toLowerCase().includes(faqSearch.toLowerCase()),
  );

  const handleSubmitProcurement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intakeName.trim()) {
      toast.error("Please enter your name.");
      return;
    }
    const cleanP = intakePhone.replace(/\D+/g, "");
    if (!cleanP || cleanP.length < 10) {
      toast.error("Please enter a valid 10-digit WhatsApp number.");
      return;
    }
    if (!intakeCity.trim()) {
      toast.error("Please enter your project city / location.");
      return;
    }
    if (!intakeQuantity.trim()) {
      toast.error("Please specify required area or quantity (e.g. 250 sqft).");
      return;
    }

    setIsIntakeSubmitting(true);
    try {
      const res = await submitStonemanProcurementRequest({
        data: {
          customerName: intakeName.trim(),
          phone: cleanP,
          city: intakeCity.trim(),
          quantitySqft: intakeQuantity.trim(),
          productName: intakeProduct.trim() || "Discontinued/Custom Stone Request",
          specificRequirements: intakeNotes.trim(),
        },
      });
      setIntakeSuccess({
        enquiryNo: res.enquiryNo,
        message: res.message,
      });
      toast.success(`Request logged in CRM as #${res.enquiryNo}!`);
    } catch (err) {
      toast.error(toUserMessage(err));
    } finally {
      setIsIntakeSubmitting(false);
    }
  };

  const resetIntakeForm = () => {
    setIntakeSuccess(null);
    setIsIntakeOpen(false);
    setIntakeProduct("");
    setIntakeName("");
    setIntakePhone("");
    setIntakeCity("");
    setIntakeQuantity("");
    setIntakeNotes("");
  };

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
            <picture>
              <source srcSet="/stoneman-peeking-top.webp" type="image/webp" />
              <img
                src="/stoneman-peeking-top.png"
                alt="StoneMan Mascot"
                className="h-24 sm:h-32 md:h-36 w-auto max-w-full object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.65)] select-none pointer-events-none"
                draggable={false}
              />
            </picture>
          </div>

          {/* Stone Body Hugging the Window from the Back */}
          <div className="pointer-events-none absolute -inset-1.5 sm:-inset-2.5 top-14 bottom-2 -z-10 rounded-[28px] sm:rounded-[36px] bg-gradient-to-b from-slate-700/50 via-slate-850/40 to-slate-900/60 border border-slate-700/50 shadow-2xl backdrop-blur-xs" />
          <div className="pointer-events-none absolute -inset-3 sm:-inset-5 top-12 bottom-0 -z-20 rounded-[36px] bg-teal-500/10 blur-2xl" />

          {/* The Big Screen Console Frame - Strict constant dimensions */}
          <div className="relative z-10 flex flex-1 min-h-0 w-full flex-col overflow-hidden rounded-2xl sm:rounded-3xl border-2 sm:border-[3px] border-slate-700/80 bg-slate-950/95 shadow-[0_25px_80px_rgba(0,0,0,0.7)] backdrop-blur-2xl ring-1 ring-teal-500/30 text-slate-100">
            {/* Console Header - Centered directly beneath StoneMan */}
            <div className="relative flex flex-col items-center justify-center border-b border-slate-800/90 bg-slate-900/80 pt-5 sm:pt-6 pb-3 px-12 sm:px-14 text-center select-none shrink-0">
              <div className="flex flex-col items-center gap-1 max-w-[90%]">
                <span className="font-display text-base sm:text-lg font-bold tracking-tight text-white drop-shadow-xs">
                  StoneMan
                </span>
                <span className="text-[11px] sm:text-xs text-slate-300/90 font-medium leading-relaxed">
                  Your personal assistant for knowledge on stone &amp; our AI-run workflow pipeline.
                </span>
              </div>

              {/* Top-Right Window Controls */}
              <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3.5 flex items-center gap-1 select-auto">
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
              {/* TAB 1: LIVE CATALOGUE KNOWLEDGE & DISCONTINUED PRODUCTS */}
              {activeTab === "faqs" && (
                <div className="space-y-3.5">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search 550+ stones, finishes, cladding codes, or ask a question…"
                      value={faqSearch}
                      onChange={(e) => {
                        setFaqSearch(e.target.value);
                        if (isIntakeOpen && !intakeSuccess) {
                          setIsIntakeOpen(false);
                        }
                      }}
                      className="pl-9 pr-8 text-xs h-9 bg-slate-900/90 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-teal-500"
                    />
                    {faqSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setFaqSearch("");
                          resetIntakeForm();
                        }}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* 1. SUCCESS VIEW: Special Procurement CRM Entry Created */}
                  {intakeSuccess && (
                    <div className="rounded-xl border border-teal-500/40 bg-teal-950/40 p-4 space-y-3 animate-in fade-in-50 duration-200">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-teal-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">
                              CRM Request #{intakeSuccess.enquiryNo} Created!
                            </span>
                            <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/40 text-[9px]">
                              ADMIN NOTIFIED
                            </Badge>
                          </div>
                          <p className="text-xs text-teal-100/90 leading-relaxed">
                            {intakeSuccess.message}
                          </p>
                          <p className="text-[11px] text-teal-300/80 pt-1">
                            📱 An instant Android curtain notification has been delivered to our
                            superadmins' mobile phones.
                          </p>
                        </div>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={resetIntakeForm}
                        className="w-full text-xs font-semibold text-teal-300 border-teal-500/40 bg-teal-900/20 hover:bg-teal-900/40"
                      >
                        Ask Another Question or Search Stones
                      </Button>
                    </div>
                  )}

                  {/* 2. CONVERSATIONAL INTAKE: Create Request to Admin for Discontinued/Custom Stone */}
                  {isIntakeOpen && !intakeSuccess && (
                    <form
                      onSubmit={handleSubmitProcurement}
                      className="rounded-xl border border-amber-500/40 bg-slate-900/90 p-4 space-y-3.5 animate-in fade-in-50 duration-200"
                    >
                      <div className="flex items-start justify-between border-b border-slate-800 pb-2.5">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="h-4 w-4 text-amber-400" />
                            <h4 className="text-xs font-bold text-white">
                              Special Admin Procurement Intake
                            </h4>
                          </div>
                          <p className="text-[11px] text-slate-300 mt-0.5">
                            StoneMan will take your details and create a CRM entry directly for
                            admin sourcing.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setIsIntakeOpen(false)}
                          className="h-6 w-6 text-slate-400 hover:text-white"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <div className="space-y-2.5">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                            Requested Product / Stone Variety
                          </label>
                          <Input
                            value={intakeProduct}
                            onChange={(e) => setIntakeProduct(e.target.value)}
                            placeholder="e.g. PU Decorative Faux Stone or Old Quarry Seam Sandstone"
                            className="text-xs h-8.5 bg-slate-950 border-slate-800 text-slate-100 focus-visible:ring-amber-500"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                              Your Name
                            </label>
                            <Input
                              value={intakeName}
                              onChange={(e) => setIntakeName(e.target.value)}
                              placeholder="e.g. Rajesh Sharma"
                              className="text-xs h-8.5 bg-slate-950 border-slate-800 text-slate-100 focus-visible:ring-amber-500"
                              required
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                              10-Digit WhatsApp Number
                            </label>
                            <Input
                              value={intakePhone}
                              onChange={(e) => setIntakePhone(e.target.value)}
                              placeholder="e.g. 9876543210"
                              className="text-xs h-8.5 bg-slate-950 border-slate-800 text-slate-100 focus-visible:ring-amber-500"
                              maxLength={15}
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                              Project City / Location
                            </label>
                            <Input
                              value={intakeCity}
                              onChange={(e) => setIntakeCity(e.target.value)}
                              placeholder="e.g. Ahmedabad, Mumbai, Jaipur"
                              className="text-xs h-8.5 bg-slate-950 border-slate-800 text-slate-100 focus-visible:ring-amber-500"
                              required
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                              Estimated Quantity / Area (Sq Ft)
                            </label>
                            <Input
                              value={intakeQuantity}
                              onChange={(e) => setIntakeQuantity(e.target.value)}
                              placeholder="e.g. 350 sqft"
                              className="text-xs h-8.5 bg-slate-950 border-slate-800 text-slate-100 focus-visible:ring-amber-500"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                            Specific Requirements or Alternative Tolerance
                          </label>
                          <Textarea
                            value={intakeNotes}
                            onChange={(e) => setIntakeNotes(e.target.value)}
                            placeholder="Tell us if you need this exact batch only, or if high-end natural stone alternatives can be considered…"
                            className="text-xs min-h-[50px] bg-slate-950 border-slate-800 text-slate-100 focus-visible:ring-amber-500"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          type="submit"
                          disabled={isIntakeSubmitting}
                          className="flex-1 h-9 text-xs font-bold gap-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 cursor-pointer shadow-md"
                        >
                          {isIntakeSubmitting ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              <span>Creating CRM Entry…</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3.5 w-3.5" />
                              <span>Submit Request to Admin & Create CRM Lead</span>
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsIntakeOpen(false)}
                          className="h-9 text-xs text-slate-400 hover:text-white"
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  )}

                  {/* 3. DISCONTINUED PRODUCT NOTICE (Triggered when user searches for a removed/discontinued product) */}
                  {!isIntakeOpen && !intakeSuccess && catalogSearchResult.isDiscontinuedMatch && (
                    <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-4 space-y-3 animate-in fade-in-50 duration-200">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant="outline"
                              className="text-[10px] uppercase font-mono tracking-wider border-amber-500/40 bg-amber-950/60 text-amber-300"
                            >
                              Discontinued / Removed Product
                            </Badge>
                            {catalogSearchResult.discontinuedItem?.id && (
                              <span className="text-[10px] text-amber-300/70 font-mono">
                                #{catalogSearchResult.discontinuedItem.id}
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs font-bold text-amber-100">
                            {catalogSearchResult.discontinuedItem?.name || faqSearch}
                          </h4>
                          <p className="text-xs text-amber-200/95 leading-relaxed font-medium">
                            {catalogSearchResult.discontinuedMessage}
                          </p>
                        </div>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setIntakeProduct(catalogSearchResult.discontinuedItem?.name || faqSearch);
                          setIsIntakeOpen(true);
                        }}
                        className="w-full h-8.5 text-xs font-bold gap-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-md cursor-pointer"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>I Need This Only — Create Request to Admin</span>
                      </Button>
                    </div>
                  )}

                  {/* 4. ACTIVE CATALOGUE PRODUCT MATCHES (Real-time analysis from 550+ catalogue items) */}
                  {!isIntakeOpen &&
                    !intakeSuccess &&
                    faqSearch.trim() &&
                    catalogSearchResult.matches.length > 0 && (
                      <div className="space-y-3">
                        {catalogSearchResult.suggestedAnswer && (
                          <div className="p-3 rounded-xl border border-teal-500/30 bg-teal-950/30 text-xs text-teal-200 leading-relaxed flex items-start gap-2.5">
                            <Sparkles className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-semibold text-teal-300">Catalogue Analysis</p>
                              <p className="text-teal-200/90 text-[11px] mt-0.5">
                                {catalogSearchResult.suggestedAnswer}
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <h4 className="text-[11px] uppercase tracking-wider font-mono text-slate-400 font-semibold flex items-center justify-between">
                            <span>
                              Matching Catalogue Products ({catalogSearchResult.matches.length})
                            </span>
                            <span className="text-teal-400 text-[10px]">Real-Time Synced</span>
                          </h4>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {catalogSearchResult.matches.slice(0, 6).map((item) => (
                              <div
                                key={item.id}
                                className="p-3 rounded-xl border border-slate-800 bg-slate-900/70 hover:border-teal-500/40 transition-colors flex flex-col justify-between space-y-2"
                              >
                                <div className="flex gap-2.5">
                                  <div className="h-14 w-14 shrink-0 rounded-lg overflow-hidden bg-slate-950 border border-slate-800">
                                    <img
                                      src={item.image}
                                      alt={item.name}
                                      className="h-full w-full object-cover"
                                      loading="lazy"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src =
                                          "/branding/stone-tech-og-banner.png";
                                      }}
                                    />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[9px] font-mono text-teal-400 font-bold">
                                        {item.id}
                                      </span>
                                      <span className="text-[9px] text-slate-400 truncate">
                                        • {item.stoneType}
                                      </span>
                                    </div>
                                    <h5 className="text-xs font-bold text-slate-100 truncate mt-0.5">
                                      {item.name}
                                    </h5>
                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                      Thickness: {item.thickness}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-800/60 text-[10px]">
                                  <span className="text-slate-400 truncate max-w-[130px]">
                                    {item.applications[0] || "Wall Cladding"}
                                  </span>
                                  <a
                                    href={`https://api.whatsapp.com/send?phone=917742090866&text=Hi%20Stone%20Tech,%20I%20am%20inquiring%20about%20${encodeURIComponent(
                                      item.name,
                                    )}%20(${item.id})%20seen%20on%20StoneMan.`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-0.5"
                                  >
                                    <span>Ask Specs</span>
                                    <ExternalLink className="h-2.5 w-2.5" />
                                  </a>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                  {/* 5. DEFAULT VIEW: Category Suggestion Chips & Special Request Banner */}
                  {!faqSearch.trim() && !isIntakeOpen && !intakeSuccess && (
                    <div className="space-y-3">
                      {/* Category Quick Chips */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {[
                          "Indian Granites",
                          "Italian Marbles",
                          "Stone Wall Cladding",
                          "Stone Veneer",
                          "Glass Bricks",
                          "Clay & Pebbles",
                        ].map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setFaqSearch(cat)}
                            className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-900 border border-slate-800 hover:border-teal-500/50 hover:bg-slate-850 text-slate-300 transition-colors cursor-pointer"
                          >
                            {cat}
                          </button>
                        ))}
                      </div>

                      {/* Special Procurement Intake Banner */}
                      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <Layers className="h-4 w-4 text-amber-400 shrink-0" />
                          <span className="text-slate-300 text-[11px]">
                            Looking for a discontinued stone or custom quarry piece?
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIntakeProduct("");
                            setIsIntakeOpen(true);
                          }}
                          className="shrink-0 text-amber-400 hover:text-amber-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <span>Request Admin</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 6. VERIFIED FAQS LIST */}
                  {!isIntakeOpen && (
                    <div className="space-y-2.5 pt-1">
                      {filteredFaqs.length > 0 && (
                        <h4 className="text-[11px] uppercase tracking-wider font-mono text-slate-400 font-semibold">
                          Knowledge & Technical Standards
                        </h4>
                      )}

                      {filteredFaqs.length === 0 &&
                      catalogSearchResult.matches.length === 0 &&
                      !catalogSearchResult.isDiscontinuedMatch ? (
                        <div className="text-center py-8 text-slate-400 text-xs space-y-2">
                          <p>No direct match found in active catalogues.</p>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setIntakeProduct(faqSearch);
                              setIsIntakeOpen(true);
                            }}
                            className="text-xs font-semibold text-amber-400 border-amber-500/40 bg-amber-950/20 hover:bg-amber-900/30"
                          >
                            <Sparkles className="h-3.5 w-3.5 mr-1" />
                            <span>Request This Product to Admin</span>
                          </Button>
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
                  )}

                  {/* Human Escalation Link */}
                  {!isIntakeOpen && (
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                      <span>Need bespoke assistance?</span>
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
                  )}
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

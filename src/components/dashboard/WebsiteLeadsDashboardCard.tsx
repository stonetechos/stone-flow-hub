/**
 * Dedicated Dashboard Card for stonetech.in Website Inquiries & CRM Leads.
 *
 * Provides executive and sales staff with real-time visibility into visitor
 * inquiries coming from www.stonetech.in, including:
 * - Live KPI pipeline metrics (Total, New, In Discussion, Won)
 * - Recent lead submissions with direct 1-click WhatsApp messaging
 * - Selected stone materials, city, and required timeline countdown
 * - Direct deep-link into CRM Enquiry detail view (/enquiries/$enquiryId)
 */
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Globe,
  MessageCircle,
  Calendar,
  MapPin,
  Package,
  Clock,
  Copy,
  Check,
  ArrowRight,
  Flame,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface WebLead {
  id: string;
  enquiry_no: string;
  stage: string;
  priority: string;
  requirement: string | null;
  required_delivery_date: string | null;
  notes: string | null;
  created_at: string;
  external_ref: {
    client_whatsapp?: string;
    client_city?: string;
    selected_products?: string[];
    photos?: string[];
    [key: string]: unknown;
  } | null;
  customer: {
    id: string;
    name: string;
    customer_code: string;
    primary_phone: string | null;
    whatsapp: string | null;
    city: string | null;
  } | null;
}

const STAGE_CONFIG: Record<string, { label: string; tone: string }> = {
  new_lead: { label: "New Lead", tone: "bg-cyan-50 text-cyan-800 border-cyan-200" },
  contacted: { label: "Contacted", tone: "bg-teal-50 text-teal-800 border-teal-200" },
  site_visit_scheduled: {
    label: "Site Visit",
    tone: "bg-indigo-50 text-indigo-800 border-indigo-200",
  },
  quote_sent: { label: "Quote Shared", tone: "bg-amber-50 text-amber-800 border-amber-200" },
  negotiation: { label: "Negotiating", tone: "bg-purple-50 text-purple-800 border-purple-200" },
  won: { label: "Order Won", tone: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  lost: { label: "Closed", tone: "bg-slate-100 text-slate-700 border-slate-200" },
  cancelled: { label: "Cancelled", tone: "bg-rose-50 text-rose-700 border-rose-200" },
};

export function WebsiteLeadsDashboardCard() {
  const { t } = useTranslation();
  const [copiedLink, setCopiedLink] = useState(false);

  const { data: leads = [], isLoading } = useQuery<WebLead[]>({
    queryKey: ["website-leads-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enquiries")
        .select(
          `id, enquiry_no, stage, priority, requirement, required_delivery_date, notes, external_ref, created_at,
           customer:customers!enquiries_customer_id_fkey(id, name, customer_code, primary_phone, whatsapp, city)`,
        )
        .or("source.ilike.%web%,source.ilike.%stonetech%,notes.ilike.%whatsapp%")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data ?? []) as unknown as WebLead[];
    },
    staleTime: 30_000,
  });

  // Calculate high-level pipeline KPIs
  const totalCount = leads.length;
  const newCount = leads.filter((l) => l.stage === "new_lead").length;
  const inDiscussionCount = leads.filter((l) =>
    ["contacted", "site_visit_scheduled", "quote_sent", "negotiation"].includes(l.stage),
  ).length;
  const wonCount = leads.filter((l) => l.stage === "won").length;

  // Handle link copy
  const handleCopyLink = () => {
    navigator.clipboard.writeText("https://www.stonetech.in");
    setCopiedLink(true);
    toast.success("Public website URL copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="card-3d-milky overflow-hidden border border-teal-800/20 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-gradient-to-r from-cyan-950/[0.04] via-transparent to-transparent px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-700 text-white shadow-md shadow-cyan-700/25">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-base font-bold tracking-tight text-engraved-title sm:text-lg">
                Visitor Inquiries &amp; CRM Leads
              </h3>
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-600" />
              </span>
            </div>
            <p className="font-mono text-xs font-semibold text-engraved-kicker">
              {t("crm.leadsSubtitle")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="engraved-well h-8 gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-slate-700 hover:border-cyan-400"
            title="Copy public website link"
          >
            {copiedLink ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-slate-500" />
            )}
            <span>{copiedLink ? "Copied" : "Copy Website Link"}</span>
          </Button>

          <Button
            asChild
            size="sm"
            className="h-8 gap-1.5 rounded-lg bg-cyan-700 px-3 text-xs font-bold text-white shadow-xs hover:bg-cyan-800"
          >
            <Link to="/enquiries">
              <span>{t("crm.viewFull")}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 gap-2 border-b border-slate-200/80 bg-slate-50/50 p-3 sm:grid-cols-4 sm:gap-3 sm:p-4">
        <div className="engraved-well flex flex-col rounded-xl p-3">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Total Web Leads
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-display text-2xl font-black tabular-nums text-engraved-blue-lg sm:text-3xl">
              {totalCount}
            </span>
            <span className="text-[11px] font-medium text-slate-500">{t("crm.inquiries")}</span>
          </div>
        </div>

        <div className="engraved-well flex flex-col rounded-xl p-3 border-cyan-200/80 bg-cyan-50/30">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-800">
              New Uncontacted
            </span>
            {newCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-600 px-1.5 py-0.5 text-[9px] font-bold text-white animate-pulse">
                <Flame className="h-2.5 w-2.5" /> Action Req
              </span>
            )}
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-display text-2xl font-black tabular-nums text-cyan-800 sm:text-3xl">
              {newCount}
            </span>
            <span className="text-[11px] font-medium text-cyan-700">{t("crm.awaitingReply")}</span>
          </div>
        </div>

        <div className="engraved-well flex flex-col rounded-xl p-3">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
            In Discussion / Quoting
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-display text-2xl font-black tabular-nums text-engraved-blue-lg sm:text-3xl">
              {inDiscussionCount}
            </span>
            <span className="text-[11px] font-medium text-slate-500">{t("crm.active")}</span>
          </div>
        </div>

        <div className="engraved-well flex flex-col rounded-xl p-3">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-800">
            Orders Won
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-display text-2xl font-black tabular-nums text-emerald-700 sm:text-3xl">
              {wonCount}
            </span>
            <span className="text-[11px] font-medium text-emerald-600">{t("crm.converted")}</span>
          </div>
        </div>
      </div>

      {/* Leads List / Table */}
      <div className="p-3 sm:p-5">
        {isLoading ? (
          <div className="space-y-3 py-6">
            <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 border border-cyan-200">
              <Globe className="h-6 w-6" />
            </div>
            <h4 className="mt-3 font-display text-base font-bold text-slate-800">
              No Website Leads Yet
            </h4>
            <p className="mt-1 max-w-md text-xs text-slate-500">
              Share your landing page link{" "}
              <code className="font-mono text-cyan-800 font-semibold">www.stonetech.in</code> with
              customers, on Instagram, or via WhatsApp. Submissions will instantly stream into this
              box and your CRM pipeline.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="mt-4 gap-2 border-cyan-300 text-cyan-800 hover:bg-cyan-50"
            >
              <Copy className="h-3.5 w-3.5" />
              {t("crm.copyLink")}
            </Button>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1 pb-1">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {t("crm.recentInquiries", { count: leads.slice(0, 5).length, total: leads.length })}
              </span>
              <span className="text-xs text-slate-500">{t("crm.whatsappAvailable")}</span>
            </div>

            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200/80 bg-white shadow-xs">
              {leads.slice(0, 6).map((lead) => {
                const ext = lead.external_ref || {};
                const customerName = lead.customer?.name || t("crm.prospectiveClient");
                const rawPhone =
                  ext.client_whatsapp ||
                  lead.customer?.whatsapp ||
                  lead.customer?.primary_phone ||
                  "";
                const cleanDigits = rawPhone.replace(/\D/g, "");
                const waLink = cleanDigits
                  ? `https://wa.me/${cleanDigits}?text=${encodeURIComponent(
                      `Hello ${customerName}! Thank you for your inquiry ${lead.enquiry_no} at Stone Tech. We are reviewing your stone requirements.`,
                    )}`
                  : null;

                const city = ext.client_city || lead.customer?.city || "Location not stated";
                const products = Array.isArray(ext.selected_products) ? ext.selected_products : [];
                const photoCount = Array.isArray(ext.photos) ? ext.photos.length : 0;
                const stageInfo = STAGE_CONFIG[lead.stage] || {
                  label: lead.stage,
                  tone: "bg-slate-100 text-slate-800 border-slate-200",
                };

                // Date urgency
                let dateBadge = null;
                if (lead.required_delivery_date) {
                  const reqTime = new Date(lead.required_delivery_date).getTime();
                  const diffDays = Math.ceil((reqTime - Date.now()) / (1000 * 60 * 60 * 24));
                  if (diffDays <= 7 && diffDays >= 0) {
                    dateBadge = (
                      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <Clock className="h-2.5 w-2.5" /> {t("crm.urgent", { days: diffDays })}
                      </span>
                    );
                  } else if (diffDays < 0) {
                    dateBadge = (
                      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        {t("crm.pastDate")}
                      </span>
                    );
                  } else {
                    dateBadge = (
                      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-700">
                        {t("crm.neededIn", { days: diffDays })}
                      </span>
                    );
                  }
                }

                return (
                  <div
                    key={lead.id}
                    className="flex flex-col gap-3 p-3.5 transition-colors hover:bg-cyan-50/20 sm:flex-row sm:items-center sm:justify-between"
                  >
                    {/* Left: Customer & Inquiry Details */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to="/enquiries/$enquiryId"
                          params={{ enquiryId: lead.id }}
                          className="font-mono text-xs font-bold text-cyan-800 hover:underline"
                        >
                          {lead.enquiry_no}
                        </Link>
                        <span className="font-display text-sm font-bold text-slate-900">
                          {customerName}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] font-semibold", stageInfo.tone)}
                        >
                          {stageInfo.label}
                        </Badge>
                        {dateBadge}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          {city}
                        </span>

                        {lead.required_delivery_date && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            {t("crm.target", { date: new Date(lead.required_delivery_date).toLocaleDateString() })}
                          </span>
                        )}

                        {photoCount > 0 && (
                          <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                            {t("crm.photos", { count: photoCount })}
                          </span>
                        )}
                      </div>

                      {/* Products chosen */}
                      {products.length > 0 && (
                        <div className="mt-1 flex flex-wrap items-center gap-1 pt-0.5">
                          {products.map((p: string, idx: number) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-0.5 rounded-md border border-cyan-200/80 bg-cyan-50/60 px-2 py-0.5 text-[10px] font-medium text-cyan-900"
                            >
                              <Package className="h-2.5 w-2.5 text-cyan-700" />
                              {p}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right: Direct Actions */}
                    <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                      {waLink ? (
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-emerald-700"
                        >
                          <MessageCircle className="h-3.5 w-3.5 fill-current" />
                          <span>{t("crm.whatsapp")}</span>
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">{t("crm.noWhatsapp")}</span>
                      )}

                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 rounded-lg border-slate-200 text-xs font-semibold hover:border-cyan-400 hover:text-cyan-800"
                      >
                        <Link to="/enquiries/$enquiryId" params={{ enquiryId: lead.id }}>
                          <span>{t("crm.details")}</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

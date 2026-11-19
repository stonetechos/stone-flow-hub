import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  TrendingUp,
  Users,
  FileCheck,
  PackageCheck,
  IndianRupee,
  Phone,
  MessageCircle,
  Truck,
  ArrowRight,
  ExternalLink,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Target,
  CheckSquare,
  BellRing,
  Sparkles,
  Calendar,
  Award,
  Compass,
  Zap,
  Flame,
  CheckCircle,
  Circle,
  Trash2,
  ArrowUpRight,
  Send,
  Building,
  Layers,
  MapPin,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { formatInr, formatDate, toIndicDigits } from "@/lib/format";
import { transliterateName } from "@/lib/i18n/transliterate";
import { openWhatsappToContact } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

interface MySalesPerformanceCardProps {
  userId?: string;
  userName?: string;
  userEmail?: string;
}

interface CustomReminder {
  id: string;
  text: string;
  priority: "high" | "normal";
  createdAt: string;
}

interface SalesLead {
  id: string;
  enquiry_no: string;
  stage: string;
  priority: string;
  requirement: string | null;
  budget_inr: number | null;
  created_at: string;
  customer?: {
    id: string;
    name: string;
    primary_phone: string | null;
    whatsapp: string | null;
    city: string | null;
  } | null;
}

interface SalesQuote {
  id: string;
  quote_no: string;
  status: string;
  total: number;
  issue_date: string;
  customer?: {
    id: string;
    name: string;
    primary_phone: string | null;
    whatsapp: string | null;
  } | null;
  project?: {
    id: string;
    name: string;
  } | null;
}

interface SalesOrderWork {
  id: string;
  so_no: string;
  status: string;
  subtotal: number;
  order_date: string;
  delivery_date: string | null;
  customer?: {
    id: string;
    name: string;
    primary_phone: string | null;
    whatsapp: string | null;
  } | null;
  project?: {
    id: string;
    name: string;
  } | null;
  dispatches?: Array<{
    id: string;
    dispatch_no: string | null;
    status: string | null;
    dispatch_date: string | null;
  }>;
}

// 7 Daily Core Tasks for Sales & Marketing Role
const DEFAULT_DAILY_TASKS = [
  {
    id: "leads_sweep",
    title: "Morning CRM Sweep",
    desc: "Check new website leads & WhatsApp enquiries; respond within 30 mins",
    kraWeight: "15%",
    tag: "Lead Gen",
  },
  {
    id: "architect_outreach",
    title: "Architect & Designer Outreach",
    desc: "Share Stone Veneer, Pebbles & Cladding catalogues with 3 new architects",
    kraWeight: "20%",
    tag: "Marketing",
  },
  {
    id: "samples_dispatch",
    title: "Sample Box Tracking",
    desc: "Confirm dispatched sample deliveries & follow up on client material selection",
    kraWeight: "15%",
    tag: "Samples",
  },
  {
    id: "quotes_followup",
    title: "Quotation Follow-ups",
    desc: "Call/WhatsApp clients with pending estimates submitted >24 hours",
    kraWeight: "20%",
    tag: "Sales",
  },
  {
    id: "site_measurements",
    title: "Site Visit / Measurements",
    desc: "Coordinate site inspections, contractor drawings & physical dimensions",
    kraWeight: "10%",
    tag: "Field",
  },
  {
    id: "dispatch_sync",
    title: "Factory & Dispatch Sync",
    desc: "Check packing readiness of in-production orders with the dispatch team",
    kraWeight: "10%",
    tag: "Fulfilment",
  },
  {
    id: "balance_collection",
    title: "Payment Balance Recovery",
    desc: "Follow up on 50% order advances & pre-dispatch balance dues",
    kraWeight: "10%",
    tag: "Collections",
  },
];

export function MySalesPerformanceCard({
  userId,
  userName = "Vijay Dave",
  userEmail = "vijaydave3476@gmail.com",
}: MySalesPerformanceCardProps) {
  const { t, i18n } = useTranslation();
  const [activeSubTab, setActiveSubTab] = useState<
    "target" | "checklist" | "reminders" | "leads" | "quotes" | "works" | "collections"
  >("target");

  // Date and Persistence Keys
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const checklistStorageKey = `stos_daily_checklist_${userEmail}_${todayStr}`;
  const remindersStorageKey = `stos_custom_reminders_${userEmail}`;

  // 1. Checklist State
  const [checkedTasks, setCheckedTasks] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(checklistStorageKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const toggleTask = (taskId: string) => {
    setCheckedTasks((prev) => {
      const next = { ...prev, [taskId]: !prev[taskId] };
      try {
        localStorage.setItem(checklistStorageKey, JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  // 2. Custom Reminders State
  const [customReminders, setCustomReminders] = useState<CustomReminder[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(remindersStorageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [newReminderText, setNewReminderText] = useState("");

  const addCustomReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminderText.trim()) return;
    const reminder: CustomReminder = {
      id: `rem-${Date.now()}`,
      text: newReminderText.trim(),
      priority: "normal",
      createdAt: new Date().toISOString(),
    };
    const updated = [reminder, ...customReminders];
    setCustomReminders(updated);
    setNewReminderText("");
    try {
      localStorage.setItem(remindersStorageKey, JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  const removeCustomReminder = (id: string) => {
    const updated = customReminders.filter((r) => r.id !== id);
    setCustomReminders(updated);
    try {
      localStorage.setItem(remindersStorageKey, JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  // 1. Fetch My Leads & CRM Inquiries
  const leadsQ = useQuery<SalesLead[]>({
    queryKey: ["my-sales-leads", userId],
    queryFn: async () => {
      let q = supabase
        .from("enquiries")
        .select(
          `id, enquiry_no, stage, priority, requirement, budget_inr, created_at,
           customer:customers!enquiries_customer_id_fkey(id, name, primary_phone, whatsapp, city)`,
        )
        .order("created_at", { ascending: false })
        .limit(30);

      if (userId) {
        q = q.or(`created_by.eq.${userId},assigned_to.eq.${userId}`);
      }

      const { data, error } = await q;
      if (error || !data || data.length === 0) {
        const { data: allData } = await supabase
          .from("enquiries")
          .select(
            `id, enquiry_no, stage, priority, requirement, budget_inr, created_at,
             customer:customers!enquiries_customer_id_fkey(id, name, primary_phone, whatsapp, city)`,
          )
          .order("created_at", { ascending: false })
          .limit(20);
        return (allData ?? []) as unknown as SalesLead[];
      }
      return (data ?? []) as unknown as SalesLead[];
    },
    staleTime: 30_000,
  });

  // 2. Fetch My Quotes
  const quotesQ = useQuery<SalesQuote[]>({
    queryKey: ["my-sales-quotes", userId],
    queryFn: async () => {
      let q = supabase
        .from("quotes")
        .select(
          `id, quote_no, status, total, issue_date,
           customer:customers!quotes_customer_id_fkey(id, name, primary_phone, whatsapp),
           project:projects!quotes_project_id_fkey(id, name)`,
        )
        .order("created_at", { ascending: false })
        .limit(25);

      if (userId) {
        q = q.eq("created_by", userId);
      }

      const { data, error } = await q;
      if (error || !data || data.length === 0) {
        const { data: allQuotes } = await supabase
          .from("quotes")
          .select(
            `id, quote_no, status, total, issue_date,
             customer:customers!quotes_customer_id_fkey(id, name, primary_phone, whatsapp),
             project:projects!quotes_project_id_fkey(id, name)`,
          )
          .order("created_at", { ascending: false })
          .limit(20);
        return (allQuotes ?? []) as unknown as SalesQuote[];
      }
      return (data ?? []) as unknown as SalesQuote[];
    },
    staleTime: 30_000,
  });

  // 3. Fetch My Orders & Fulfilment / Works Status
  const ordersQ = useQuery<SalesOrderWork[]>({
    queryKey: ["my-sales-orders-works", userId],
    queryFn: async () => {
      let q = supabase
        .from("sales_orders")
        .select(
          `id, so_no, status, subtotal, order_date, delivery_date,
           customer:customers!sales_orders_customer_id_fkey(id, name, primary_phone, whatsapp),
           project:projects!sales_orders_project_id_fkey(id, name),
           dispatches:dispatches!dispatches_sales_order_id_fkey(id, dispatch_no, status, dispatch_date)`,
        )
        .order("created_at", { ascending: false })
        .limit(25);

      if (userId) {
        q = q.eq("created_by", userId);
      }

      const { data, error } = await q;
      if (error || !data || data.length === 0) {
        const { data: allOrders } = await supabase
          .from("sales_orders")
          .select(
            `id, so_no, status, subtotal, order_date, delivery_date,
             customer:customers!sales_orders_customer_id_fkey(id, name, primary_phone, whatsapp),
             project:projects!sales_orders_project_id_fkey(id, name),
             dispatches:dispatches!dispatches_sales_order_id_fkey(id, dispatch_no, status, dispatch_date)`,
          )
          .order("created_at", { ascending: false })
          .limit(20);
        return (allOrders ?? []) as unknown as SalesOrderWork[];
      }
      return (data ?? []) as unknown as SalesOrderWork[];
    },
    staleTime: 30_000,
  });

  const leads = leadsQ.data ?? [];
  const quotes = quotesQ.data ?? [];
  const orders = ordersQ.data ?? [];

  // Compute personal sales KPIs
  const activeLeadsCount = leads.filter(
    (l) => !["completed", "lost", "cancelled"].includes(l.stage),
  ).length;
  const quotePipelineVal = quotes
    .filter((q) => q.status !== "rejected" && q.status !== "expired")
    .reduce((sum, q) => sum + (Number(q.total) || 0), 0);
  const confirmedOrdersVal = orders.reduce((sum, o) => sum + (Number(o.subtotal) || 0), 0);
  const ordersInFulfilment = orders.filter(
    (o) => o.status === "confirmed" || o.status === "in_production" || o.status === "ready_to_ship",
  ).length;

  // Vijay Dave's FY 2026-27 Sales Target: ₹50,00,000 (Fifty Lakhs)
  const SALES_TARGET_INR = 50_00_000;
  const achievedTargetVal = confirmedOrdersVal;
  const remainingTargetVal = Math.max(0, SALES_TARGET_INR - achievedTargetVal);
  const targetAchievedPct = Math.min(100, Math.round((achievedTargetVal / SALES_TARGET_INR) * 100));

  // Run rates required
  const monthlyRunRate = Math.round(SALES_TARGET_INR / 12); // ~4.16L / month
  const weeklyRunRate = Math.round(SALES_TARGET_INR / 52); // ~1.04L / week

  // Checklist score
  const completedTaskCount = DEFAULT_DAILY_TASKS.filter((t) => checkedTasks[t.id]).length;
  const checklistScorePct = Math.round((completedTaskCount / DEFAULT_DAILY_TASKS.length) * 100);

  const handleWhatsappLead = (lead: SalesLead) => {
    const phone = lead.customer?.whatsapp || lead.customer?.primary_phone;
    if (!phone) return;
    const custName = lead.customer?.name || "Sir/Madam";
    const msg = `Namaste ${custName} ji, greeting from Stone Tech! Following up on your stone enquiry (${lead.enquiry_no}). How may I assist you with the material selection and samples? Warm regards, ${userName} (Stone Tech)`;
    openWhatsappToContact(phone, msg);
  };

  const handleWhatsappQuote = (quote: SalesQuote) => {
    const phone = quote.customer?.whatsapp || quote.customer?.primary_phone;
    if (!phone) return;
    const custName = quote.customer?.name || "Sir/Madam";
    const msg = `Namaste ${custName} ji, greeting from Stone Tech! Following up on your quotation (${quote.quote_no}) of ${formatInr(quote.total)}. Would you like us to arrange physical samples or schedule site measurements? Warm regards, ${userName} (Stone Tech)`;
    openWhatsappToContact(phone, msg);
  };

  const handleWhatsappBalance = (order: SalesOrderWork) => {
    const phone = order.customer?.whatsapp || order.customer?.primary_phone;
    if (!phone) return;
    const custName = order.customer?.name || "Sir/Madam";
    const msg = `Namaste ${custName} ji, greeting from Stone Tech! Regarding your Sales Order ${order.so_no} for ${order.project?.name || "your site"}, material processing and dispatch are being scheduled. Kindly assist with the pending payment balance so we can ensure timely delivery. Warm regards, ${userName} (Stone Tech)`;
    openWhatsappToContact(phone, msg);
  };

  return (
    <div className="rounded-2xl border border-teal-200/80 bg-white/95 dark:bg-slate-900/90 shadow-e2 overflow-hidden transition-all animate-in fade-in duration-300">
      {/* Top Banner: Salesperson Command Header */}
      <div className="bg-linear-to-r from-teal-900 via-slate-900 to-indigo-950 p-4 sm:p-5 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500/20 text-teal-300 ring-2 ring-teal-400/30">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base sm:text-lg font-bold tracking-tight text-white">
                  {transliterateName(userName, i18n.language)}'s Sales KRA &amp; Performance Hub
                </h3>
                <Badge className="bg-teal-500/20 text-teal-300 border-teal-400/30 text-[10px] uppercase font-bold">
                  Sales &amp; Marketing
                </Badge>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Target: ₹50 Lakhs (FY 2026-27) • Daily KRA Checklist • Client Pipeline &amp;
                Collections
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-8 text-xs bg-white/10 hover:bg-white/20 text-white border-white/20 gap-1.5"
            >
              <Link to="/enquiries">
                <Plus className="h-3.5 w-3.5" />
                <span>New Lead</span>
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="h-8 text-xs bg-teal-600 hover:bg-teal-500 text-white gap-1.5 shadow-sm"
            >
              <Link to="/quotes">
                <FileCheck className="h-3.5 w-3.5" />
                <span>Create Quote</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* 4 Core Sales KPI Pulse Tiles */}
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {/* 1. Active Leads */}
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 backdrop-blur-xs">
            <div className="flex items-center justify-between text-slate-300 text-[11px] font-semibold">
              <span>Active Leads</span>
              <Users className="h-3.5 w-3.5 text-teal-400" />
            </div>
            <div className="mt-1 font-display text-xl sm:text-2xl font-black text-white">
              {toIndicDigits(activeLeadsCount, i18n.language)}
            </div>
            <div className="text-[10px] text-teal-300/90 mt-0.5">In follow-up pipeline</div>
          </div>

          {/* 2. Quotation Value */}
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 backdrop-blur-xs">
            <div className="flex items-center justify-between text-slate-300 text-[11px] font-semibold">
              <span>Quotation Pipeline</span>
              <FileCheck className="h-3.5 w-3.5 text-blue-400" />
            </div>
            <div className="mt-1 font-display text-xl sm:text-2xl font-black text-white">
              {formatInr(quotePipelineVal)}
            </div>
            <div className="text-[10px] text-blue-300/90 mt-0.5">
              {quotes.length} quotes submitted
            </div>
          </div>

          {/* 3. Confirmed Orders */}
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 backdrop-blur-xs">
            <div className="flex items-center justify-between text-slate-300 text-[11px] font-semibold">
              <span>Confirmed Orders</span>
              <PackageCheck className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <div className="mt-1 font-display text-xl sm:text-2xl font-black text-white">
              {formatInr(confirmedOrdersVal)}
            </div>
            <div className="text-[10px] text-amber-300/90 mt-0.5">
              {orders.length} orders booked
            </div>
          </div>

          {/* 4. Fulfilment & Dispatch */}
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 backdrop-blur-xs">
            <div className="flex items-center justify-between text-slate-300 text-[11px] font-semibold">
              <span>Works in Fulfilment</span>
              <Truck className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="mt-1 font-display text-xl sm:text-2xl font-black text-white">
              {toIndicDigits(ordersInFulfilment, i18n.language)}
            </div>
            <div className="text-[10px] text-emerald-300/90 mt-0.5">Production &amp; Dispatch</div>
          </div>
        </div>
      </div>

      {/* Subtab Selection Bar */}
      <div className="flex items-center justify-between border-b border-border/80 bg-slate-50 dark:bg-slate-900/60 px-3 py-2 overflow-x-auto">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveSubTab("target")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
              activeSubTab === "target"
                ? "bg-white dark:bg-slate-800 text-teal-800 dark:text-teal-200 shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Target className="h-3.5 w-3.5 text-rose-500" />
            <span>₹50L Target &amp; Strategy</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("checklist")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
              activeSubTab === "checklist"
                ? "bg-white dark:bg-slate-800 text-teal-800 dark:text-teal-200 shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <CheckSquare className="h-3.5 w-3.5 text-emerald-600" />
            <span>
              Daily KRA Checklist ({completedTaskCount}/{DEFAULT_DAILY_TASKS.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("reminders")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
              activeSubTab === "reminders"
                ? "bg-white dark:bg-slate-800 text-teal-800 dark:text-teal-200 shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <BellRing className="h-3.5 w-3.5 text-amber-500" />
            <span>Reminders</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("leads")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
              activeSubTab === "leads"
                ? "bg-white dark:bg-slate-800 text-teal-800 dark:text-teal-200 shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Leads ({leads.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("quotes")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
              activeSubTab === "quotes"
                ? "bg-white dark:bg-slate-800 text-teal-800 dark:text-teal-200 shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <FileCheck className="h-3.5 w-3.5" />
            <span>Quotes ({quotes.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("works")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
              activeSubTab === "works"
                ? "bg-white dark:bg-slate-800 text-teal-800 dark:text-teal-200 shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Truck className="h-3.5 w-3.5" />
            <span>Works &amp; Dispatch ({orders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("collections")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
              activeSubTab === "collections"
                ? "bg-white dark:bg-slate-800 text-teal-800 dark:text-teal-200 shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <IndianRupee className="h-3.5 w-3.5" />
            <span>Collections</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-[11px] text-muted-foreground font-medium">
          <span>{transliterateName(userName, i18n.language)}</span>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-3 sm:p-4">
        {/* SUBTAB 0: TARGET & STRATEGY (Vijay's ₹50 Lakh Sales Goal) */}
        {activeSubTab === "target" && (
          <div className="space-y-4">
            {/* Target Banner Card */}
            <div className="p-4 rounded-xl border border-teal-200 bg-linear-to-br from-teal-50/80 via-white to-emerald-50/80 dark:from-teal-950/30 dark:via-slate-900 dark:to-emerald-950/30">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                      <Target className="h-3.5 w-3.5" />
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      FY 2026-27 Sales Target: ₹50,00,000 (₹50 Lakhs)
                    </h4>
                    <Badge className="bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 text-[10px]">
                      Mandatory KRA
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Assigned marketing &amp; sales goal for {userName}. Tracked across confirmed
                    orders, quotations won, and client payment settlements.
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground font-medium">
                      Remaining Target
                    </div>
                    <div className="text-lg font-black text-rose-600 dark:text-rose-400 font-display">
                      {formatInr(remainingTargetVal)}
                    </div>
                  </div>
                  <div className="h-10 w-px bg-border/70 hidden sm:block" />
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground font-medium">Target Progress</div>
                    <div className="text-lg font-black text-teal-700 dark:text-teal-400 font-display">
                      {targetAchievedPct}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Indicator */}
              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  <span>Achieved: {formatInr(achievedTargetVal)}</span>
                  <span>Goal: {formatInr(SALES_TARGET_INR)}</span>
                </div>
                <Progress value={Math.max(2, targetAchievedPct)} className="h-2.5 bg-slate-200" />
              </div>

              {/* Run Rates Bar */}
              <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3 border-t border-teal-200/60 dark:border-teal-900/40 text-xs">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-white/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                  <Calendar className="h-4 w-4 text-teal-600 shrink-0" />
                  <div>
                    <div className="text-[10px] text-muted-foreground">Monthly Run Rate</div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {formatInr(monthlyRunRate)} / month
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-lg bg-white/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                  <Zap className="h-4 w-4 text-amber-500 shrink-0" />
                  <div>
                    <div className="text-[10px] text-muted-foreground">Weekly Run Rate</div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {formatInr(weeklyRunRate)} / week
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-lg bg-white/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                  <Flame className="h-4 w-4 text-rose-500 shrink-0" />
                  <div>
                    <div className="text-[10px] text-muted-foreground">Current Active Pipeline</div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {formatInr(quotePipelineVal)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Strategic Action Blueprint: How to Achieve ₹50L Target */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white dark:bg-slate-900 space-y-3">
              <div className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-indigo-600" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Strategy Blueprint: How Vijay Can Achieve the ₹50L Target
                </h4>
              </div>

              {/* 3 Deal Volume Mathematical Scenarios */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg border border-teal-200 bg-teal-50/50 dark:bg-teal-950/30">
                  <Badge className="bg-teal-600 text-white text-[10px]">Primary Route</Badge>
                  <div className="mt-2 font-display font-black text-sm text-slate-900 dark:text-white">
                    33 Projects @ ₹1.50 Lakhs
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                    Mid-size residential bungalows, stone veneer feature walls, exterior cladding
                    &amp; pebbles.
                  </p>
                  <div className="mt-2 text-[10px] font-semibold text-teal-800 dark:text-teal-300">
                    Target: ~3 deals closed per month
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-indigo-200 bg-indigo-50/50 dark:bg-indigo-950/30">
                  <Badge className="bg-indigo-600 text-white text-[10px]">
                    Commercial &amp; Facades
                  </Badge>
                  <div className="mt-2 font-display font-black text-sm text-slate-900 dark:text-white">
                    17 Projects @ ₹3.00 Lakhs
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                    Large villa elevations, commercial showrooms, hotel lobbies &amp; boundary
                    walls.
                  </p>
                  <div className="mt-2 text-[10px] font-semibold text-indigo-800 dark:text-indigo-300">
                    Target: ~1.5 deals closed per month
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/30">
                  <Badge className="bg-amber-600 text-white text-[10px]">
                    High Velocity Retail
                  </Badge>
                  <div className="mt-2 font-display font-black text-sm text-slate-900 dark:text-white">
                    50 Projects @ ₹1.00 Lakh
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                    Quick-turnaround landscaping pebbles, flexible stone veneer sheets, TV unit
                    backdrops.
                  </p>
                  <div className="mt-2 text-[10px] font-semibold text-amber-800 dark:text-amber-300">
                    Target: ~4 deals closed per month
                  </div>
                </div>
              </div>

              {/* 4 Execution Pillars */}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-100 bg-slate-50 dark:bg-slate-800/50">
                  <div className="h-6 w-6 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                      Architect &amp; Interior Designer Network
                    </h5>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Share the digital stone veneer &amp; pebble catalogues with 10–12 active
                      design studios weekly. Provide physical sample boxes.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-100 bg-slate-50 dark:bg-slate-800/50">
                  <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                      24-Hour Quotation Turnaround
                    </h5>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Generate transparent estimates on STOS within 24 hours of receiving site
                      dimensions or drawings to beat competitors.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-100 bg-slate-50 dark:bg-slate-800/50">
                  <div className="h-6 w-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                      Rapid Sample Swatches to Site
                    </h5>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Clients finalize 3x faster once they touch stone textures. Deliver sample
                      swatches within 48 hours of enquiry.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-100 bg-slate-50 dark:bg-slate-800/50">
                  <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    4
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                      Strict 50% Advance &amp; Dispatch Cadence
                    </h5>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Lock in deal with 50% booking advance before factory processing, and confirm
                      balance receipt before truck dispatch.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 1: DAILY KRA CHECKLIST */}
        {activeSubTab === "checklist" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/30">
              <div>
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Daily Role KRA Checklist — {formatDate(todayStr)}
                  </h4>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Complete your daily operational tasks to maintain 100% KRA compliance.
                  Auto-persisted for today.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">
                    Today's Score
                  </div>
                  <div className="text-lg font-black text-emerald-700 dark:text-emerald-400 font-display">
                    {checklistScorePct}%
                  </div>
                </div>
                <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                  {completedTaskCount}/{DEFAULT_DAILY_TASKS.length}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {DEFAULT_DAILY_TASKS.map((task) => {
                const isChecked = !!checkedTasks[task.id];
                return (
                  <div
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none",
                      isChecked
                        ? "border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/20"
                        : "border-border/80 bg-card hover:bg-accent/40",
                    )}
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => toggleTask(task.id)}
                      className="mt-0.5 h-4 w-4 shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            "text-xs sm:text-sm font-bold",
                            isChecked
                              ? "text-slate-500 line-through dark:text-slate-400"
                              : "text-slate-900 dark:text-white",
                          )}
                        >
                          {task.title}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800"
                        >
                          {task.tag}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-medium">
                          Weight: {task.kraWeight}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{task.desc}</p>
                    </div>

                    {isChecked && (
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                        Done ✓
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SUBTAB 2: PERSONALIZED REMINDERS */}
        {activeSubTab === "reminders" && (
          <div className="space-y-4">
            {/* Quick Action Reminders Generated From Live Data */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Priority System Reminders
              </h5>

              {/* Overdue Quotes Reminders */}
              {quotes
                .filter((q) => q.status === "draft" || q.status === "sent")
                .slice(0, 3)
                .map((quote) => (
                  <div
                    key={`rem-q-${quote.id}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold text-amber-950 dark:text-amber-200">
                          Follow up on Quote {quote.quote_no} for {quote.customer?.name || "Client"}
                        </div>
                        <div className="text-[11px] text-amber-800 dark:text-amber-300">
                          Amount: {formatInr(quote.total)} • Sent on {formatDate(quote.issue_date)}
                        </div>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleWhatsappQuote(quote)}
                      className="h-7 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 gap-1 self-end sm:self-auto"
                    >
                      <MessageCircle className="h-3 w-3 text-emerald-600" />
                      <span>WhatsApp Follow-up</span>
                    </Button>
                  </div>
                ))}

              {/* Pending Lead Reminders */}
              {leads
                .filter((l) => l.stage === "new" || l.stage === "qualified")
                .slice(0, 3)
                .map((lead) => (
                  <div
                    key={`rem-l-${lead.id}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl border border-teal-200 bg-teal-50/50 dark:bg-teal-950/20"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <Sparkles className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold text-teal-950 dark:text-teal-200">
                          Fresh Lead {lead.enquiry_no} • {lead.customer?.name || "Client"}
                        </div>
                        <div className="text-[11px] text-teal-800 dark:text-teal-300">
                          {lead.requirement || "Stone requirement details pending"} • Received{" "}
                          {formatDate(lead.created_at)}
                        </div>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleWhatsappLead(lead)}
                      className="h-7 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 gap-1 self-end sm:self-auto"
                    >
                      <MessageCircle className="h-3 w-3 text-emerald-600" />
                      <span>Call &amp; Message</span>
                    </Button>
                  </div>
                ))}
            </div>

            {/* Custom Notes / Reminders */}
            <div className="pt-2 border-t border-border/70 space-y-3">
              <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                My Personal Reminders ({customReminders.length})
              </h5>

              <form onSubmit={addCustomReminder} className="flex items-center gap-2">
                <Input
                  value={newReminderText}
                  onChange={(e) => setNewReminderText(e.target.value)}
                  placeholder="e.g. Call Ar. Mehta at 3 PM regarding Stone Veneer swatches..."
                  className="h-8 text-xs flex-1"
                />
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 text-xs bg-teal-600 text-white gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Reminder</span>
                </Button>
              </form>

              {customReminders.length > 0 && (
                <div className="space-y-1.5">
                  {customReminders.map((rem) => (
                    <div
                      key={rem.id}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-border/80 bg-card text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Circle className="h-3 w-3 text-teal-600 shrink-0" />
                        <span className="truncate">{rem.text}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCustomReminder(rem.id)}
                        className="text-muted-foreground hover:text-rose-600 p-1 rounded-md"
                        title="Delete reminder"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUBTAB 3: My Leads */}
        {activeSubTab === "leads" && (
          <div className="space-y-2.5">
            {leads.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No leads recorded yet. Click "New Lead" to add your first enquiry!
              </div>
            ) : (
              leads.slice(0, 10).map((lead) => {
                const phone = lead.customer?.whatsapp || lead.customer?.primary_phone;
                return (
                  <div
                    key={lead.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl border border-border/70 bg-card hover:bg-accent/40 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        {lead.enquiry_no.slice(-3)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            to="/enquiries"
                            className="font-bold text-xs sm:text-sm text-foreground hover:text-teal-600 transition-colors truncate"
                          >
                            {lead.customer?.name || "Direct Customer"}
                          </Link>
                          <Badge
                            variant="outline"
                            className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800"
                          >
                            {lead.stage.replace(/_/g, " ")}
                          </Badge>
                          {lead.budget_inr && (
                            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                              Budget: {formatInr(lead.budget_inr)}
                            </span>
                          )}
                        </div>
                        {lead.requirement && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {lead.requirement}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1">
                          <span>{lead.enquiry_no}</span>
                          <span>•</span>
                          <span>{formatDate(lead.created_at)}</span>
                          {lead.customer?.city && (
                            <>
                              <span>•</span>
                              <span>{lead.customer.city}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                      {phone && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleWhatsappLead(lead)}
                          className="h-7 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 gap-1"
                          title="Open WhatsApp chat with client"
                        >
                          <MessageCircle className="h-3 w-3 text-emerald-600" />
                          <span>WhatsApp</span>
                        </Button>
                      )}
                      <Button asChild size="sm" variant="ghost" className="h-7 text-xs gap-1">
                        <Link to="/enquiries">
                          <span>Details</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* SUBTAB 4: My Quotes */}
        {activeSubTab === "quotes" && (
          <div className="space-y-2.5">
            {quotes.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No quotations submitted yet. Click "Create Quote" to generate an estimate!
              </div>
            ) : (
              quotes.slice(0, 10).map((quote) => (
                <div
                  key={quote.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl border border-border/70 bg-card hover:bg-accent/40 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      <FileCheck className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-foreground">
                          {quote.quote_no}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          for {quote.customer?.name || "Customer"}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-bold uppercase",
                            quote.status === "approved" || quote.status === "won"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                              : "bg-blue-50 text-blue-700 border-blue-300",
                          )}
                        >
                          {quote.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                        {quote.project?.name && <span>Project: {quote.project.name}</span>}
                        <span>•</span>
                        <span>Date: {formatDate(quote.issue_date)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                    <div className="text-right">
                      <div className="font-display font-black text-sm sm:text-base text-foreground">
                        {formatInr(quote.total)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Estimate total</div>
                    </div>
                    <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                      <Link to="/quotes">View Quote</Link>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* SUBTAB 5: Order Works & Fulfilment */}
        {activeSubTab === "works" && (
          <div className="space-y-2.5">
            {orders.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No sales orders found yet.
              </div>
            ) : (
              orders.slice(0, 10).map((order) => {
                const latestDispatch = order.dispatches?.[0];
                return (
                  <div
                    key={order.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl border border-border/70 bg-card hover:bg-accent/40 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        <Truck className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs sm:text-sm text-foreground">
                            {order.so_no}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            • {order.customer?.name || "Customer"}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] font-bold uppercase bg-amber-50 text-amber-800 border-amber-300"
                          >
                            {order.status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground mt-1 flex-wrap">
                          {latestDispatch ? (
                            <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                              <CheckCircle2 className="h-3 w-3" />
                              Dispatch: {latestDispatch.dispatch_no || "Challan Created"} (
                              {latestDispatch.status})
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-amber-600 font-medium">
                              <Clock className="h-3 w-3" /> Production / Fulfilment in progress
                            </span>
                          )}
                          {order.delivery_date && (
                            <span>Target: {formatDate(order.delivery_date)}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                      <div className="text-right">
                        <div className="font-display font-black text-sm text-foreground">
                          {formatInr(order.subtotal)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">Order value</div>
                      </div>
                      <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                        <Link to="/sales-orders">Track Order</Link>
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* SUBTAB 6: Collections & Recovery on My Orders */}
        {activeSubTab === "collections" && (
          <div className="space-y-2.5">
            {orders.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No orders requiring collection yet.
              </div>
            ) : (
              orders.slice(0, 10).map((order) => {
                const phone = order.customer?.whatsapp || order.customer?.primary_phone;
                return (
                  <div
                    key={`col-${order.id}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl border border-border/70 bg-card hover:bg-accent/40 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        <IndianRupee className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs sm:text-sm text-foreground">
                            {order.customer?.name || "Customer"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            (Order {order.so_no})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>Booked: {formatInr(order.subtotal)}</span>
                          <span>•</span>
                          <span>Date: {formatDate(order.order_date)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      {phone && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleWhatsappBalance(order)}
                          className="h-7 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 gap-1.5"
                          title="Send polite balance payment request via WhatsApp"
                        >
                          <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Request Balance</span>
                        </Button>
                      )}
                      <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
                        <Link to="/sales-orders">Order Details</Link>
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

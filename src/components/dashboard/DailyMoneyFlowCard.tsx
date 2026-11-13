import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
  TrendingUp,
  TrendingDown,
  Wallet,
  Banknote,
  Building2,
  User,
  ExternalLink,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { formatInr, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { qk } from "@/lib/query-keys";
import { useRoles } from "@/hooks/use-roles";
import { listPaymentRegister } from "@/lib/payments/crud";
import { listVendorPayments } from "@/lib/vendor-payments/api";
import { listInstallationLedger } from "@/lib/installation-ledger/api";
import { listInstallationAgencies } from "@/lib/installation-agencies/api";
import {
  buildDailyMoneyFlowData,
  getTodayString,
  type DailyMoneyFlowTransaction,
} from "@/lib/dashboard/daily-money-flow";
import {
  formatPaymentMethodDisplay,
  getPaymentAccountCategory,
  getPaymentMethodBadgeClass,
} from "@/lib/payments/method-display";

const MONEY_FLOW_TEXTS = {
  en: {
    heading: "Daily Money Flow & Transaction Radar",
    subheading:
      "Track how much capital arrived from customers versus disbursements to vendors and contractors today.",
    moneyFlowHub: "Money Flow Hub",
    recent7Days: "Recent 7-Day Velocity (Click any day to inspect)",
    viewingToday: "Viewing: Today",
    viewingDate: "Viewing:",
    jumpToday: "Jump to Today",
    moneyIn: "Money In (Received)",
    moneyOut: "Money Out (Disbursed)",
    netCashFlow: "Net Cash Flow",
    receiptsOnDay: "receipts on this day",
    receiptOnDay: "receipt on this day",
    disbursementsOnDay: "disbursements",
    disbursementOnDay: "disbursement",
    addReceipt: "Add Receipt",
    addPayment: "Add Payment",
    customerCollections: "Customer collections",
    vendorsContractors: "Vendors & Contractors",
    inflowMinusOutflow: "Inflow minus Outflow",
    capitalSurplus: "Capital Surplus",
    netOutflow: "Net Outflow",
    allTransactions: "All Transactions",
    searchPlaceholder: "Search party, UTR, doc #...",
    noTransactionsFor: "No transactions recorded for",
    noTransactionsDesc:
      "There were no receipts or disbursements recorded on this day. You can record payments using the shortcuts below.",
    recordReceipt: "Record Customer Receipt",
    recordPayment: "Record Vendor Payment",
    thFlow: "Flow",
    thParty: "Party Name",
    thDoc: "Doc #",
    thMethod: "Channel / Method",
    thRef: "Reference / UTR",
    thAmount: "Amount",
    thDetails: "Details",
    btnView: "View",
    mtdNet: "Month-to-Date Net:",
    mtdIn: "MTD In:",
    mtdOut: "MTD Out:",
    customerPayments: "Customer Payments →",
    vendorPayments: "Vendor Payments →",
    fullMoneyFlowHub: "Full Money Flow Hub →",
  },
  hi: {
    heading: "दैनिक धन प्रवाह एवं लेन-देन रडार",
    subheading:
      "आज ग्राहकों से प्राप्त पूंजी बनाम विक्रेताओं और ठेकेदारों को किए गए भुगतानों को ट्रैक करें।",
    moneyFlowHub: "मनी फ्लो हब",
    recent7Days: "पिछले 7 दिनों की गति (निरीक्षण के लिए किसी भी दिन पर क्लिक करें)",
    viewingToday: "देख रहे हैं: आज",
    viewingDate: "देख रहे हैं:",
    jumpToday: "आज पर जाएं",
    moneyIn: "प्राप्त राशि (आवक)",
    moneyOut: "भुगतान राशि (जावक)",
    netCashFlow: "शुद्ध नकदी प्रवाह",
    receiptsOnDay: "रसीदें इस दिन",
    receiptOnDay: "रसीद इस दिन",
    disbursementsOnDay: "भुगतान",
    disbursementOnDay: "भुगतान",
    addReceipt: "रसीद जोड़ें",
    addPayment: "भुगतान जोड़ें",
    customerCollections: "ग्राहक वसूली",
    vendorsContractors: "विक्रेता व ठेकेदार",
    inflowMinusOutflow: "आवक घटा जावक",
    capitalSurplus: "पूंजी अधिशेष",
    netOutflow: "शुद्ध बहिर्वाह",
    allTransactions: "सभी लेन-देन",
    searchPlaceholder: "पार्टी, UTR, दस्तावेज़ संख्या खोजें...",
    noTransactionsFor: "इस तारीख के लिए कोई लेन-देन दर्ज नहीं:",
    noTransactionsDesc:
      "इस दिन कोई रसीद या भुगतान दर्ज नहीं किया गया। आप नीचे दिए गए शॉर्टकट का उपयोग करके भुगतान दर्ज कर सकते हैं।",
    recordReceipt: "ग्राहक रसीद दर्ज करें",
    recordPayment: "विक्रेता भुगतान दर्ज करें",
    thFlow: "प्रवाह",
    thParty: "पार्टी का नाम",
    thDoc: "दस्तावेज़ #",
    thMethod: "माध्यम / विधि",
    thRef: "संदर्भ / UTR",
    thAmount: "राशि",
    thDetails: "विवरण",
    btnView: "देखें",
    mtdNet: "माह-दर-तारीख शुद्ध:",
    mtdIn: "माह आवक:",
    mtdOut: "माह जावक:",
    customerPayments: "ग्राहक भुगतान →",
    vendorPayments: "विक्रेता भुगतान →",
    fullMoneyFlowHub: "पूर्ण मनी फ्लो हब →",
  },
  gu: {
    heading: "દૈનિક નાણાકીય પ્રવાહ અને વ્યવહાર રડાર",
    subheading:
      "આજે ગ્રાહકો તરફથી આવેલી મૂડી વિરુદ્ધ સપ્લાયર્સ અને કોન્ટ્રાક્ટરોને કરેલી ચુકવણી ટ્રૅક કરો.",
    moneyFlowHub: "મની ફ્લો હબ",
    recent7Days: "છેલ્લા 7 દિવસની ઝડપ (તપાસવા માટે કોઈપણ દિવસ પર ક્લિક કરો)",
    viewingToday: "જોઈ રહ્યા છીએ: આજે",
    viewingDate: "જોઈ રહ્યા છીએ:",
    jumpToday: "આજ પર જાઓ",
    moneyIn: "આવેલા નાણાં (આવક)",
    moneyOut: "ચૂકવેલા નાણાં (જાવક)",
    netCashFlow: "ચોખ્ખો રોકડ પ્રવાહ",
    receiptsOnDay: "રસીદો આ દિવસે",
    receiptOnDay: "રસીદ આ દિવસે",
    disbursementsOnDay: "ચુકવણીઓ",
    disbursementOnDay: "ચુકવણી",
    addReceipt: "રસીદ ઉમેરો",
    addPayment: "ચુકવણી ઉમેરો",
    customerCollections: "ગ્રાહક વસૂલાત",
    vendorsContractors: "સપ્લાયર્સ અને કોન્ટ્રાક્ટર્સ",
    inflowMinusOutflow: "આવક બાદ જાવક",
    capitalSurplus: "મૂડી સરપ્લસ",
    netOutflow: "ચોખ્ખી જાવક",
    allTransactions: "બધા વ્યવહારો",
    searchPlaceholder: "પાર્ટી, UTR, દસ્તાવેજ નં. શોધો...",
    noTransactionsFor: "આ તારીખ માટે કોઈ વ્યવહાર નોંધાયેલ નથી:",
    noTransactionsDesc:
      "આ દિવસે કોઈ રસીદ કે ચુકવણી નોંધાઈ નથી. તમે નીચેના શૉર્ટકટ્સનો ઉપયોગ કરીને ચુકવણી નોંધી શકો છો.",
    recordReceipt: "ગ્રાહક રસીદ નોંધો",
    recordPayment: "સપ્લાયર ચુકવણી નોંધો",
    thFlow: "પ્રવાહ",
    thParty: "પાર્ટીનું નામ",
    thDoc: "દસ્તાવેજ #",
    thMethod: "માધ્યમ / રીત",
    thRef: "સંદર્ભ / UTR",
    thAmount: "રકમ",
    thDetails: "વિગતો",
    btnView: "જુઓ",
    mtdNet: "મહિના-દર-તારીખ ચોખ્ખું:",
    mtdIn: "મહિનાની આવક:",
    mtdOut: "મહિનાની જાવક:",
    customerPayments: "ગ્રાહક ચુકવણી →",
    vendorPayments: "સપ્લાયર ચુકવણી →",
    fullMoneyFlowHub: "સંપૂર્ણ મની ફ્લો હબ →",
  },
};

export function DailyMoneyFlowCard() {
  const { i18n } = useTranslation();
  const lang = (i18n.language?.substring(0, 2) || "en") as "en" | "hi" | "gu";
  const txt = MONEY_FLOW_TEXTS[lang] || MONEY_FLOW_TEXTS.en;
  const roles = useRoles();

  // Selected date state (defaults to today)
  const todayStr = useMemo(() => getTodayString(), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Only fetch and display for Admins & Super Admins who manage financial flows
  const isAuthorized = roles.isAdmin || roles.isSuperAdmin;

  // Filter tabs and search query
  const [filterTab, setFilterTab] = useState<"all" | "in" | "out">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // 1. Customer Receipts & Payments (Money In)
  const customerPaymentsQ = useQuery({
    queryKey: qk.paymentRegister.list(""),
    queryFn: () => listPaymentRegister("").catch(() => []),
    enabled: isAuthorized && roles.isReady,
    staleTime: 60_000,
  });

  // 2. Vendor Payments (Money Out)
  const vendorPaymentsQ = useQuery({
    queryKey: qk.vendorPayments.all,
    queryFn: () => listVendorPayments().catch(() => []),
    enabled: isAuthorized && roles.isReady,
    staleTime: 60_000,
  });

  // 3. Agency Payments (Money Out)
  const agencyLedgerQ = useQuery({
    queryKey: qk.installationLedger.all(),
    queryFn: () => listInstallationLedger().catch(() => []),
    enabled: isAuthorized && roles.isReady,
    staleTime: 60_000,
  });

  // 4. Agencies List (for party names)
  const agenciesQ = useQuery({
    queryKey: ["installationAgencies", "list"],
    queryFn: () => listInstallationAgencies().catch(() => []),
    enabled: isAuthorized && roles.isReady,
    staleTime: 120_000,
  });

  const agencyNames = useMemo(() => {
    const map: Record<string, string> = {};
    if (agenciesQ.data) {
      for (const agy of agenciesQ.data) {
        map[agy.id] = agy.name;
      }
    }
    return map;
  }, [agenciesQ.data]);

  // Aggregate and process daily money flow data
  const summary = useMemo(() => {
    return buildDailyMoneyFlowData({
      customerPayments: customerPaymentsQ.data,
      vendorPayments: vendorPaymentsQ.data,
      agencyLedger: agencyLedgerQ.data,
      agencyNames,
      selectedDate,
      trendDaysCount: 7,
    });
  }, [customerPaymentsQ.data, vendorPaymentsQ.data, agencyLedgerQ.data, agencyNames, selectedDate]);

  // Filter transactions for table view
  const displayedTransactions = useMemo(() => {
    let list: DailyMoneyFlowTransaction[] = [];
    if (filterTab === "all") {
      list = summary.transactions;
    } else if (filterTab === "in") {
      list = summary.inflowTransactions;
    } else {
      list = summary.outflowTransactions;
    }

    if (!searchQuery.trim()) return list;

    const query = searchQuery.toLowerCase().trim();
    return list.filter((item) => {
      const party = (item.partyName || "").toLowerCase();
      const doc = (item.docNo || "").toLowerCase();
      const ref = (item.referenceNo || "").toLowerCase();
      const note = (item.notes || "").toLowerCase();
      const meth = (item.method || "").toLowerCase();
      return (
        party.includes(query) ||
        doc.includes(query) ||
        ref.includes(query) ||
        note.includes(query) ||
        meth.includes(query)
      );
    });
  }, [summary, filterTab, searchQuery]);

  // Date navigation handlers
  const handlePrevDay = () => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() - 1);
    const prevStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate(),
    ).padStart(2, "0")}`;
    setSelectedDate(prevStr);
  };

  const handleNextDay = () => {
    if (selectedDate >= todayStr) return;
    const [y, m, d] = selectedDate.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + 1);
    const nextStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate(),
    ).padStart(2, "0")}`;
    setSelectedDate(nextStr);
  };

  const handleJumpToday = () => {
    setSelectedDate(todayStr);
  };

  if (!isAuthorized && roles.isReady) {
    return null;
  }

  const isLoading =
    customerPaymentsQ.isLoading || vendorPaymentsQ.isLoading || agencyLedgerQ.isLoading;

  // Flow ratio calculation
  const totalVolume = summary.totalInflow + summary.totalOutflow;
  const inflowPercent =
    totalVolume > 0 ? Math.round((summary.totalInflow / totalVolume) * 100) : 50;
  const outflowPercent = totalVolume > 0 ? 100 - inflowPercent : 50;

  return (
    <div className="card-3d-milky p-4 sm:p-6 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-sm space-y-5 w-full max-w-full overflow-hidden">
      {/* 1. Header with Title & Date Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-xs">
              <ArrowLeftRight className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-foreground">
                {txt.heading}
              </h2>
              <p className="text-xs text-muted-foreground">{txt.subheading}</p>
            </div>
          </div>
        </div>

        {/* Date Selector Navigation Toolbar */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-xl bg-background/80 p-0.5 shadow-2xs">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={handlePrevDay}
              title="Previous Day"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center px-2 gap-1.5 font-mono text-xs font-semibold text-foreground">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="date"
                value={selectedDate}
                max={todayStr}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                className="bg-transparent border-none text-xs font-semibold text-foreground focus:outline-hidden cursor-pointer"
              />
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={handleNextDay}
              disabled={selectedDate >= todayStr}
              title="Next Day"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {!summary.isToday && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1 border-purple-200 text-purple-700 dark:border-purple-800 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/30"
              onClick={handleJumpToday}
            >
              <RotateCcw className="h-3 w-3" />
              {txt.jumpToday}
            </Button>
          )}

          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
          >
            <Link to="/money-flow">
              <span>{txt.moneyFlowHub}</span>
              <ExternalLink className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. Interactive 7-Day Day Selector Strip */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground px-1">
          <span>{txt.recent7Days}</span>
          <span className="font-mono text-[10px]">
            {summary.isToday ? txt.viewingToday : `${txt.viewingDate} ${formatDate(selectedDate)}`}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {summary.recentDays.map((day) => {
            const isSelected = day.isSelected;
            const hasActivity = day.inflow > 0 || day.outflow > 0;
            return (
              <button
                key={day.date}
                type="button"
                onClick={() => setSelectedDate(day.date)}
                className={cn(
                  "flex flex-col text-left p-2.5 rounded-xl border transition-all text-xs relative overflow-hidden",
                  isSelected
                    ? "border-purple-500 bg-purple-50/70 dark:bg-purple-950/40 shadow-xs ring-2 ring-purple-500/20"
                    : "border-slate-200/80 dark:border-slate-800/80 bg-background/50 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-muted/30",
                )}
              >
                {day.isToday && (
                  <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-purple-600 animate-pulse" />
                )}
                <div className="flex items-center justify-between font-semibold text-foreground text-[11px]">
                  <span>{day.dayLabel}</span>
                  <span className="text-[10px] text-muted-foreground uppercase font-mono">
                    {day.weekday}
                  </span>
                </div>

                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <ArrowDownLeft className="h-3 w-3" /> In
                    </span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                      {day.inflow > 0 ? `₹${(day.inflow / 1000).toFixed(0)}k` : "—"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <ArrowUpRight className="h-3 w-3" /> Out
                    </span>
                    <span className="font-semibold text-amber-700 dark:text-amber-300">
                      {day.outflow > 0 ? `₹${(day.outflow / 1000).toFixed(0)}k` : "—"}
                    </span>
                  </div>
                </div>

                {hasActivity && (
                  <div
                    className={cn(
                      "mt-1.5 pt-1 border-t text-[10px] font-mono flex items-center justify-between",
                      day.net >= 0
                        ? "text-emerald-700 dark:text-emerald-400 border-emerald-200/50"
                        : "text-amber-700 dark:text-amber-400 border-amber-200/50",
                    )}
                  >
                    <span>Net:</span>
                    <span className="font-bold">
                      {day.net >= 0 ? "+" : ""}
                      {formatInr(day.net)}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Three Core Daily KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {/* Money In Card */}
        <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent relative overflow-hidden">
          <CardContent className="p-4 sm:p-5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                  <ArrowDownLeft className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    {txt.moneyIn}
                  </span>
                  <div className="text-xs text-muted-foreground">
                    {summary.inflowCount}{" "}
                    {summary.inflowCount === 1 ? txt.receiptOnDay : txt.receiptsOnDay}
                  </div>
                </div>
              </div>
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-[11px] text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100/50"
              >
                <Link to="/receipts/new">
                  <Plus className="h-3 w-3 mr-1" /> {txt.addReceipt}
                </Link>
              </Button>
            </div>

            <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-emerald-800 dark:text-emerald-200 pt-1">
              {formatInr(summary.totalInflow)}
            </div>

            <div className="text-[11px] text-emerald-900/80 dark:text-emerald-300/80 flex items-center justify-between pt-1">
              <span>{txt.customerCollections}</span>
              <span className="font-medium">
                {totalVolume > 0 ? `${inflowPercent}% of volume` : "No volume"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Money Out Card */}
        <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent relative overflow-hidden">
          <CardContent className="p-4 sm:p-5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                  <ArrowUpRight className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    {txt.moneyOut}
                  </span>
                  <div className="text-xs text-muted-foreground">
                    {summary.outflowCount}{" "}
                    {summary.outflowCount === 1 ? txt.disbursementOnDay : txt.disbursementsOnDay}
                  </div>
                </div>
              </div>
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-[11px] text-amber-700 hover:text-amber-800 hover:bg-amber-100/50"
              >
                <Link to="/vendor-payments/new">
                  <Plus className="h-3 w-3 mr-1" /> {txt.addPayment}
                </Link>
              </Button>
            </div>

            <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-amber-800 dark:text-amber-200 pt-1">
              {formatInr(summary.totalOutflow)}
            </div>

            <div className="text-[11px] text-amber-900/80 dark:text-amber-300/80 flex items-center justify-between pt-1">
              <span>{txt.vendorsContractors}</span>
              <span className="font-medium">
                {totalVolume > 0 ? `${outflowPercent}% of volume` : "No volume"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Net Flow Balance Card */}
        <Card
          className={cn(
            "relative overflow-hidden transition-all",
            summary.netCashFlow >= 0
              ? "border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-transparent"
              : "border-rose-500/30 bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent",
          )}
        >
          <CardContent className="p-4 sm:p-5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "p-2 rounded-lg",
                    summary.netCashFlow >= 0
                      ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400",
                  )}
                >
                  {summary.netCashFlow >= 0 ? (
                    <TrendingUp className="h-5 w-5" />
                  ) : (
                    <TrendingDown className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                    {txt.netCashFlow}
                  </span>
                  <div className="text-xs text-muted-foreground">{txt.inflowMinusOutflow}</div>
                </div>
              </div>
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px] font-semibold px-2 py-0.5",
                  summary.netCashFlow >= 0
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                    : "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300",
                )}
              >
                {summary.netCashFlow >= 0 ? txt.capitalSurplus : txt.netOutflow}
              </Badge>
            </div>

            <div
              className={cn(
                "text-2xl sm:text-3xl font-extrabold font-mono tracking-tight pt-1",
                summary.netCashFlow >= 0
                  ? "text-purple-900 dark:text-purple-200"
                  : "text-rose-700 dark:text-rose-300",
              )}
            >
              {summary.netCashFlow >= 0 ? "+" : ""}
              {formatInr(summary.netCashFlow)}
            </div>

            {/* Visual ratio bar */}
            <div className="space-y-1 pt-1">
              <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
                <div
                  style={{ width: `${inflowPercent}%` }}
                  className="h-full bg-emerald-500 transition-all duration-300"
                  title={`Inflow: ${inflowPercent}%`}
                />
                <div
                  style={{ width: `${outflowPercent}%` }}
                  className="h-full bg-amber-500 transition-all duration-300"
                  title={`Outflow: ${outflowPercent}%`}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                <span>In: {formatInr(summary.totalInflow)}</span>
                <span>Out: {formatInr(summary.totalOutflow)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Interactive Transaction List for Selected Day */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Filter Tabs */}
          <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-xl p-1 bg-muted/30">
            <button
              type="button"
              onClick={() => setFilterTab("all")}
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded-lg transition-all",
                filterTab === "all"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {txt.allTransactions} ({summary.totalCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("in")}
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1",
                filterTab === "in"
                  ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 shadow-2xs"
                  : "text-muted-foreground hover:text-emerald-700",
              )}
            >
              <ArrowDownLeft className="h-3 w-3" />
              {txt.moneyIn} ({summary.inflowCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("out")}
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1",
                filterTab === "out"
                  ? "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 shadow-2xs"
                  : "text-muted-foreground hover:text-amber-700",
              )}
            >
              <ArrowUpRight className="h-3 w-3" />
              {txt.moneyOut} ({summary.outflowCount})
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={txt.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-background/80"
            />
          </div>
        </div>

        {/* Transactions Table */}
        {isLoading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            Loading daily transactions...
          </div>
        ) : displayedTransactions.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-background/50 space-y-2">
            <div className="mx-auto w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-muted-foreground">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="font-semibold text-sm text-foreground">
              {txt.noTransactionsFor} {formatDate(selectedDate)}
            </div>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {txt.noTransactionsDesc}
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                <Link to="/receipts/new">
                  <Plus className="mr-1 h-3 w-3" /> {txt.recordReceipt}
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                <Link to="/vendor-payments/new">
                  <Plus className="mr-1 h-3 w-3" /> {txt.recordPayment}
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">{txt.thFlow}</th>
                    <th className="py-2.5 px-3">{txt.thParty}</th>
                    <th className="py-2.5 px-3">{txt.thDoc}</th>
                    <th className="py-2.5 px-3">{txt.thMethod}</th>
                    <th className="py-2.5 px-3">{txt.thRef}</th>
                    <th className="py-2.5 px-3 text-right">{txt.thAmount}</th>
                    <th className="py-2.5 px-3 text-right">{txt.thDetails}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {displayedTransactions.map((tx) => {
                    const isInflow = tx.type === "in";
                    return (
                      <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                        {/* Flow Type */}
                        <td className="py-2.5 px-3">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold text-[10px]",
                              isInflow
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
                            )}
                          >
                            {isInflow ? (
                              <ArrowDownLeft className="h-3 w-3" />
                            ) : (
                              <ArrowUpRight className="h-3 w-3" />
                            )}
                            {isInflow ? txt.moneyIn : txt.moneyOut}
                          </span>
                        </td>

                        {/* Party Name */}
                        <td className="py-2.5 px-3">
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground text-xs">
                              {tx.partyName}
                            </span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              {tx.partyType === "Customer" && <User className="h-2.5 w-2.5" />}
                              {tx.partyType === "Vendor" && <Building2 className="h-2.5 w-2.5" />}
                              {tx.partyType === "Agency" && <Banknote className="h-2.5 w-2.5" />}
                              {tx.partyType}
                            </span>
                          </div>
                        </td>

                        {/* Doc Number */}
                        <td className="py-2.5 px-3 font-mono text-[11px] font-medium text-muted-foreground">
                          {tx.docNo}
                        </td>

                        {/* Payment Mode */}
                        <td className="py-2.5 px-3">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-medium font-sans border",
                              getPaymentMethodBadgeClass(
                                getPaymentAccountCategory({
                                  method: tx.method,
                                  account_used: tx.accountUsed,
                                  bank_name: tx.bankName,
                                  notes: tx.notes,
                                }),
                              ),
                            )}
                          >
                            {formatPaymentMethodDisplay({
                              method: tx.method,
                              account_used: tx.accountUsed,
                              bank_name: tx.bankName,
                              notes: tx.notes,
                            })}
                          </Badge>
                        </td>

                        {/* Reference / UTR */}
                        <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">
                          {tx.referenceNo || "—"}
                        </td>

                        {/* Amount */}
                        <td className="py-2.5 px-3 text-right">
                          <span
                            className={cn(
                              "font-mono font-bold text-xs sm:text-sm tabular-nums",
                              isInflow
                                ? "text-emerald-700 dark:text-emerald-300"
                                : "text-amber-700 dark:text-amber-300",
                            )}
                          >
                            {isInflow ? "+" : "-"} {formatInr(tx.amount)}
                          </span>
                        </td>

                        {/* Detail Link */}
                        <td className="py-2.5 px-3 text-right">
                          <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
                            <Link to={tx.detailUrl}>
                              <span>{txt.btnView}</span>
                              <ExternalLink className="ml-1 h-3 w-3" />
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 5. Footer Summary Strip */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-2">
        <div className="flex items-center gap-3">
          <span>
            {txt.mtdNet}{" "}
            <strong className={summary.mtdNet >= 0 ? "text-emerald-600" : "text-rose-600"}>
              {summary.mtdNet >= 0 ? "+" : ""}
              {formatInr(summary.mtdNet)}
            </strong>
          </span>
          <span className="hidden sm:inline text-slate-300 dark:text-slate-700">|</span>
          <span className="hidden sm:inline">
            {txt.mtdIn} <strong className="text-foreground">{formatInr(summary.mtdInflow)}</strong>
          </span>
          <span className="hidden sm:inline text-slate-300 dark:text-slate-700">|</span>
          <span className="hidden sm:inline">
            {txt.mtdOut}{" "}
            <strong className="text-foreground">{formatInr(summary.mtdOutflow)}</strong>
          </span>
        </div>

        <div className="flex items-center gap-3 font-medium">
          <Link
            to="/payments"
            search={{ tab: "customer" }}
            className="hover:text-foreground hover:underline"
          >
            {txt.customerPayments}
          </Link>
          <Link to="/vendor-payments" className="hover:text-foreground hover:underline">
            {txt.vendorPayments}
          </Link>
          <Link
            to="/money-flow"
            className="text-purple-600 dark:text-purple-400 font-bold hover:underline"
          >
            {txt.fullMoneyFlowHub}
          </Link>
        </div>
      </div>
    </div>
  );
}

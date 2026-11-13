import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ShieldAlert,
  Plus,
  ArrowUpRight,
  Sparkles,
  TrendingDown,
  FileText,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatInr, formatDate } from "@/lib/format";
import { useRoles } from "@/hooks/use-roles";
import {
  getWriteOffSummary,
  listWriteOffs,
  WRITE_OFF_REASONS,
  type WriteOffReason,
} from "@/lib/write-offs/api";
import { RecordWriteOffDialog } from "@/components/write-offs/RecordWriteOffDialog";

const WRITE_OFF_TEXTS = {
  en: {
    title: "SuperAdmin Audit: Customer Write-Offs & Concessions",
    subtitle:
      "Track and audit every rupee written off due to quality complaints, delivery delays, transit damage, or settlements.",
    recordBtn: "Record Write-Off / Concession",
    totalAmount: "Total Amount Written Off",
    acrossIncidents: "Across {{count}} authorized write-off incidents",
    thisMonth: "Written Off This Month",
    billingCycle: "Current financial billing cycle",
    today: "Written Off Today",
    dailyAdjustment: "Immediate daily financial adjustments",
    breakdownReason: "Breakdown by Commercial Reason:",
    recentRecords: "Recent Concession & Write-Off Records",
    viewLedgers: "View Customer Ledgers",
    noEntries:
      "No write-off entries recorded yet. Customer balances will show write-off adjustments here once entered.",
    thDate: "Date",
    thCustomer: "Customer",
    thReason: "Reason",
    thRemarks: "Remarks / Note",
    thWrittenOff: "Written Off",
    thLedger: "Ledger",
    reasons: {
      round_off: "Round-Off Difference",
      quality_complaint: "Quality Complaint / Damage",
      commercial_discount: "Commercial Settlement / Discount",
      bad_debt: "Bad Debt / Unrecoverable",
      transit_damage: "Transit Damage",
      other: "Other / Special Concession",
    } as Record<string, string>,
  },
  hi: {
    title: "सुपरएडमिन ऑडिट: ग्राहक राइट-ऑफ़ एवं रियायतें",
    subtitle:
      "गुणवत्ता शिकायतों, डिलीवरी में देरी, पारगमन क्षति या समझौतों के कारण बट्टे खाते में डाली गई प्रत्येक राशि का ऑडिट करें।",
    recordBtn: "राइट-ऑफ़ / रियायत दर्ज करें",
    totalAmount: "कुल बट्टे खाते डाली गई राशि",
    acrossIncidents: "{{count}} अधिकृत राइट-ऑफ़ घटनाओं में",
    thisMonth: "इस महीने बट्टे खाते डाली गई राशि",
    billingCycle: "वर्तमान वित्तीय बिलिंग चक्र",
    today: "आज बट्टे खाते डाली गई राशि",
    dailyAdjustment: "तत्काल दैनिक वित्तीय समायोजन",
    breakdownReason: "व्यावसायिक कारणों के अनुसार विवरण:",
    recentRecords: "हालिया रियायत एवं राइट-ऑफ़ रिकॉर्ड्स",
    viewLedgers: "ग्राहक बहीखाता देखें",
    noEntries:
      "अभी तक कोई राइट-ऑफ़ प्रविष्टि दर्ज नहीं की गई है। दर्ज होने के बाद ग्राहकों के बहीखाता समायोजन यहां दिखाई देंगे।",
    thDate: "तारीख",
    thCustomer: "ग्राहक",
    thReason: "कारण",
    thRemarks: "टिप्पणी / विवरण",
    thWrittenOff: "बट्टे खाते राशि",
    thLedger: "बहीखाता",
    reasons: {
      round_off: "राउंड-ऑफ अंतर",
      quality_complaint: "गुणवत्ता शिकायत / क्षति",
      commercial_discount: "व्यावसायिक समझौता / छूट",
      bad_debt: "डूबंत ऋण / अप्राप्य",
      transit_damage: "पारगमन में क्षति",
      other: "अन्य / विशेष रियायत",
    } as Record<string, string>,
  },
  gu: {
    title: "સુપરએડમિન ઓડિટ: ગ્રાહક રાઇટ-ઓફ અને છૂટછાટ",
    subtitle:
      "ગુણવત્તાની ફરિયાદો, ડિલિવરી વિલંબ, પરિવહન નુકસાન અથવા સમાધાનને લીધે માંડી વાળેલ દરેક રૂપિયાનું ઓડિટ કરો.",
    recordBtn: "રાઇટ-ઓફ / છૂટછાટ નોંધો",
    totalAmount: "કુલ માંડી વાળેલ રકમ",
    acrossIncidents: "{{count}} અધિકૃત રાઇટ-ઓફ ઘટનાઓમાં",
    thisMonth: "આ મહિને માંડી વાળેલ રકમ",
    billingCycle: "વર્તમાન નાણાકીય બિલિંગ ચક્ર",
    today: "આજે માંડી વાળેલ રકમ",
    dailyAdjustment: "તાત્કાલિક દૈનિક નાણાકીય ગોઠવણો",
    breakdownReason: "વ્યાપારી કારણો અનુસાર વિભાજન:",
    recentRecords: "તાજેતરના છૂટછાટ અને રાઇટ-ઓફ રેકોર્ડ્સ",
    viewLedgers: "ગ્રાહક લેજર જુઓ",
    noEntries:
      "હજુ સુધી કોઈ રાઇટ-ઓફ એન્ટ્રી નોંધાઈ નથી. નોંધાયા પછી ગ્રાહક લેજર એડજસ્ટમેન્ટ અહીં દેખાશે.",
    thDate: "તારીખ",
    thCustomer: "ગ્રાહક",
    thReason: "કારણ",
    thRemarks: "નોંધ / વિગત",
    thWrittenOff: "માંડી વાળેલ",
    thLedger: "લેજર",
    reasons: {
      round_off: "રાઉન્ડ-ઓફ તફાવત",
      quality_complaint: "ગુણવત્તા ફરિયાદ / નુકસાન",
      commercial_discount: "વેપારી સમાધાન / વળતર",
      bad_debt: "ઘાલખાધ / વસૂલ ન થઈ શકે તેવું",
      transit_damage: "ટ્રાન્સપોર્ટ નુકસાન",
      other: "અન્ય / વિશેષ છૂટ",
    } as Record<string, string>,
  },
};

export function SuperAdminWriteOffsCard() {
  const { i18n } = useTranslation();
  const lang = (i18n.language?.substring(0, 2) || "en") as "en" | "hi" | "gu";
  const txt = WRITE_OFF_TEXTS[lang] || WRITE_OFF_TEXTS.en;
  const getReasonLabel = (reason: string | null | undefined, defaultLabel: string) =>
    (reason && txt.reasons[reason]) || defaultLabel;
  const localizeRemarks = (remarks: string | null | undefined) => {
    if (!remarks) return "—";
    if (lang === "hi") {
      if (remarks.startsWith("Adjusted with payment receipt ")) {
        return (
          remarks.replace("Adjusted with payment receipt ", "भुगतान रसीद ") + " के साथ समायोजित"
        );
      }
    }
    if (lang === "gu") {
      if (remarks.startsWith("Adjusted with payment receipt ")) {
        return remarks.replace("Adjusted with payment receipt ", "ચૂકવણી રસીદ ") + " સાથે સમાયોજિત";
      }
    }
    return remarks;
  };
  const roles = useRoles();
  const [writeOffModalOpen, setWriteOffModalOpen] = useState(false);

  // SuperAdmin and Admin executive visibility only
  const isAuthorized = roles.isAdmin || roles.isSuperAdmin;

  const summaryQ = useQuery({
    queryKey: ["write-offs", "summary"],
    queryFn: getWriteOffSummary,
    enabled: isAuthorized && roles.isReady,
    staleTime: 60_000,
  });

  const recentListQ = useQuery({
    queryKey: ["write-offs", "recent"],
    queryFn: () => listWriteOffs({ limit: 6 }),
    enabled: isAuthorized && roles.isReady,
    staleTime: 60_000,
  });

  if (!isAuthorized) {
    return null;
  }

  const summary = summaryQ.data;
  const recentRows = recentListQ.data ?? [];

  return (
    <>
      <Card className="shadow-2 border-red-200/70 bg-gradient-to-b from-white to-red-50/20 dark:border-red-950/60 dark:from-slate-900 dark:to-slate-950 overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-red-100/80 dark:border-red-950/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-700 shadow-xs dark:bg-red-950/80 dark:text-red-300 ring-1 ring-red-400/30">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                  {txt.title}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{txt.subtitle}</p>
              </div>
            </div>

            <Button
              size="sm"
              variant="destructive"
              className="gap-1.5 shadow-xs font-semibold self-start sm:self-auto"
              onClick={() => setWriteOffModalOpen(true)}
            >
              <Plus className="h-4 w-4" />
              {txt.recordBtn}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* Top KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-red-200/80 bg-white/80 p-3.5 shadow-xs dark:border-red-900/50 dark:bg-slate-900/70">
              <div className="text-xs font-medium text-muted-foreground">{txt.totalAmount}</div>
              <div className="mt-1 text-2xl font-black tracking-tight text-red-600 dark:text-red-400 font-mono">
                {formatInr(summary?.totalAmount ?? 0)}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                {txt.acrossIncidents.replace("{{count}}", String(summary?.count ?? 0))}
              </div>
            </div>

            <div className="rounded-xl border border-amber-200/80 bg-white/80 p-3.5 shadow-xs dark:border-amber-900/50 dark:bg-slate-900/70">
              <div className="text-xs font-medium text-muted-foreground">{txt.thisMonth}</div>
              <div className="mt-1 text-2xl font-black tracking-tight text-amber-600 dark:text-amber-400 font-mono">
                {formatInr(summary?.thisMonthAmount ?? 0)}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">{txt.billingCycle}</div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white/80 p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900/70">
              <div className="text-xs font-medium text-muted-foreground">{txt.today}</div>
              <div className="mt-1 text-2xl font-black tracking-tight text-slate-800 dark:text-slate-100 font-mono">
                {formatInr(summary?.todayAmount ?? 0)}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">{txt.dailyAdjustment}</div>
            </div>
          </div>

          {/* Reason Breakdown Pills */}
          {summary?.byReason && Object.keys(summary.byReason).length > 0 && (
            <div className="rounded-xl border bg-slate-50/70 p-3 dark:bg-slate-900/40 space-y-1.5">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {txt.breakdownReason}
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(summary.byReason).map(([reasonKey, data]) => {
                  const meta =
                    WRITE_OFF_REASONS[reasonKey as WriteOffReason] || WRITE_OFF_REASONS.other;
                  return (
                    <div
                      key={reasonKey}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-2.5 py-1 text-xs shadow-2xs dark:border-slate-800 dark:bg-slate-800"
                    >
                      <span>{meta.icon}</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {getReasonLabel(reasonKey, meta.label)}:
                      </span>
                      <span className="font-mono font-bold text-red-600 dark:text-red-400">
                        {formatInr(data.amount)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">({data.count})</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Write-Offs Table */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b dark:bg-slate-800/60">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {txt.recentRecords}
              </span>
              <Link
                to="/ledger"
                className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
              >
                {txt.viewLedgers} <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>

            {recentRows.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">{txt.noEntries}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-24">{txt.thDate}</TableHead>
                    <TableHead>{txt.thCustomer}</TableHead>
                    <TableHead>{txt.thReason}</TableHead>
                    <TableHead>{txt.thRemarks}</TableHead>
                    <TableHead className="text-right">{txt.thWrittenOff}</TableHead>
                    <TableHead className="w-20 text-right">{txt.thLedger}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentRows.map((row) => {
                    const reasonMeta =
                      WRITE_OFF_REASONS[row.reason as WriteOffReason] || WRITE_OFF_REASONS.other;
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {formatDate(row.issued_at)}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                            {row.customer_name ?? "Customer"}
                          </div>
                          {row.customer_code && (
                            <div className="font-mono text-[10px] text-muted-foreground">
                              {row.customer_code}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-semibold gap-1 ${reasonMeta.badgeClass}`}
                          >
                            <span>{reasonMeta.icon}</span>
                            <span>{getReasonLabel(row.reason, reasonMeta.label)}</span>
                          </Badge>
                          {row.invoice_no && (
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              Inv: {row.invoice_no}
                            </div>
                          )}
                        </TableCell>
                        <TableCell
                          className="text-xs text-muted-foreground max-w-[240px] truncate"
                          title={localizeRemarks(row.remarks)}
                        >
                          {localizeRemarks(row.remarks)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-red-600 dark:text-red-400">
                          {formatInr(row.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" asChild>
                            <Link to="/ledger/$customerId" params={{ customerId: row.customer_id }}>
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      <RecordWriteOffDialog open={writeOffModalOpen} onOpenChange={setWriteOffModalOpen} />
    </>
  );
}

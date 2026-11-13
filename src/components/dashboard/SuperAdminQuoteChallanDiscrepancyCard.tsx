import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ShieldAlert,
  ArrowUpRight,
  Truck,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Package,
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
import { useRoles } from "@/hooks/use-roles";
import { listQuoteChallanDiscrepancies } from "@/lib/dispatch/api";
import { cn } from "@/lib/utils";

const DISCREPANCY_TEXTS = {
  en: {
    title: "Quotation vs Delivery Challan Product Audit",
    flaggedVariances: "Flagged Variance",
    flaggedVariancesPlural: "Flagged Variances",
    matched100: "100% Matched",
    subtitleDiscrepancies:
      "Dispatched delivery challan line items differ from approved quotation specifications. Requires executive oversight.",
    subtitleMatched:
      "All active delivery challans match approved quotation specifications. Zero material leakage or unapproved substitutions.",
    allDispatches: "All Dispatches",
    loading: "Auditing active quotation & delivery challan line items…",
    alignmentTitle: "Quotation & Delivery Challan Alignment:",
    alignmentDesc:
      "Every dispatch aligns exactly with its customer quotation. Both cash deals (challan-only) and invoiced deals match verified yard quantities.",
    thChallan: "Delivery Challan",
    thQuote: "Quotation",
    thCustomer: "Customer",
    thDealType: "Deal Type",
    thDiscrepancies: "Discrepancies Detected",
    thAction: "Action",
    cashChallanOnly: "Cash Deal (Challan Only)",
    invoicedDeal: "Invoiced Deal",
    reviewChallan: "Review Challan",
  },
  hi: {
    title: "कोटेशन बनाम डिलीवरी चालान उत्पाद ऑडिट",
    flaggedVariances: "चिह्नित अंतर",
    flaggedVariancesPlural: "चिह्नित अंतर",
    matched100: "100% मिलान",
    subtitleDiscrepancies:
      "डिस्पैच किए गए डिलीवरी चालान के आइटम स्वीकृत कोटेशन विनिर्देशों से भिन्न हैं। कार्यकारी निगरानी की आवश्यकता है।",
    subtitleMatched:
      "सभी सक्रिय डिलीवरी चालान स्वीकृत कोटेशन विनिर्देशों से मेल खाते हैं। शून्य सामग्री रिसाव या अनधिकृत प्रतिस्थापन।",
    allDispatches: "सभी डिस्पैच",
    loading: "सक्रिय कोटेशन एवं डिलीवरी चालान आइटमों का ऑडिट हो रहा है…",
    alignmentTitle: "कोटेशन एवं डिलीवरी चालान संरेखण:",
    alignmentDesc:
      "प्रत्येक डिस्पैच अपने ग्राहक कोटेशन के बिल्कुल अनुरूप है। नकद सौदे (केवल-चालान) और इनवॉइस सौदे दोनों सत्यापित यार्ड मात्रा से मेल खाते हैं।",
    thChallan: "डिलीवरी चालान",
    thQuote: "कोटेशन",
    thCustomer: "ग्राहक",
    thDealType: "सौदा प्रकार",
    thDiscrepancies: "पाए गए अंतर",
    thAction: "कार्रवाई",
    cashChallanOnly: "नकद सौदा (केवल चालान)",
    invoicedDeal: "इनवॉइस सौदा",
    reviewChallan: "चालान समीक्षा",
  },
  gu: {
    title: "ક્વોટેશન વિરુદ્ધ ડિલિવરી ચલણ પ્રોડક્ટ ઓડિટ",
    flaggedVariances: "નોંધાયેલ તફાવત",
    flaggedVariancesPlural: "નોંધાયેલ તફાવતો",
    matched100: "100% મેળ ખાધું",
    subtitleDiscrepancies:
      "ડિસ્પેચ કરેલ ડિલિવરી ચલણની વસ્તુઓ માન્ય ક્વોટેશન વિગતોથી અલગ છે. એક્ઝિક્યુટિવ દેખરેખ જરૂરી છે.",
    subtitleMatched:
      "તમામ સક્રિય ડિલિવરી ચલણ માન્ય ક્વોટેશન વિશિષ્ટતાઓ સાથે મેળ ખાય છે. શૂન્ય મટિરિયલ લિકેજ અથવા અનધિકૃત ફેરફાર.",
    allDispatches: "તમામ ડિસ્પેચ",
    loading: "સક્રિય ક્વોટેશન અને ડિલિવરી ચલણ આઇટમ્સનું ઓડિટ થઈ રહ્યું છે…",
    alignmentTitle: "ક્વોટેશન અને ડિલિવરી ચલણ સંરેખણ:",
    alignmentDesc:
      "દરેક ડિસ્પેચ તેના ગ્રાહક ક્વોટેશન સાથે બરાબર મેળ ખાય છે. રોકડ સોદા (માત્ર-ચલણ) અને ઇન્વોઇસ સોદા બંને ચકાસાયેલ યાર્ડ જથ્થા સાથે મેળ ખાય છે.",
    thChallan: "ડિલિવરી ચલણ",
    thQuote: "ક્વોટેશન",
    thCustomer: "ગ્રાહક",
    thDealType: "ડીલ પ્રકાર",
    thDiscrepancies: "તફાવતો મળ્યા",
    thAction: "પગલાં",
    cashChallanOnly: "રોકડ સોદો (માત્ર ચલણ)",
    invoicedDeal: "ઇન્વોઇસ સોદો",
    reviewChallan: "ચલણ તપાસો",
  },
};

export function SuperAdminQuoteChallanDiscrepancyCard() {
  const roles = useRoles();
  const { i18n } = useTranslation();
  const lang = (i18n.language?.substring(0, 2) || "en") as "en" | "hi" | "gu";
  const t = DISCREPANCY_TEXTS[lang] || DISCREPANCY_TEXTS.en;

  // SuperAdmin and Admin executive visibility only
  const isAuthorized = roles.isAdmin || roles.isSuperAdmin;

  const discrepanciesQ = useQuery({
    queryKey: ["dispatch", "discrepancies"],
    queryFn: listQuoteChallanDiscrepancies,
    enabled: isAuthorized && roles.isReady,
    staleTime: 45_000,
  });

  if (!isAuthorized) {
    return null;
  }

  const items = discrepanciesQ.data ?? [];
  const hasDiscrepancies = items.length > 0;

  return (
    <Card
      className={cn(
        "shadow-2 overflow-hidden transition-all",
        hasDiscrepancies
          ? "border-amber-300/80 bg-gradient-to-b from-white to-amber-50/25 dark:border-amber-950/60 dark:from-slate-900 dark:to-slate-950"
          : "border-emerald-200/60 bg-gradient-to-b from-white to-emerald-50/15 dark:border-emerald-950/40 dark:from-slate-900 dark:to-slate-950",
      )}
    >
      <CardHeader className="p-4 sm:p-5 border-b border-border/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "p-2 rounded-xl border shadow-xs shrink-0",
                hasDiscrepancies
                  ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900/60"
                  : "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900/60",
              )}
            >
              {hasDiscrepancies ? (
                <ShieldAlert className="h-5 w-5" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base sm:text-lg font-bold tracking-tight">
                  {t.title}
                </CardTitle>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] font-mono font-bold uppercase tracking-wider",
                    hasDiscrepancies
                      ? "border-amber-500 bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 animate-pulse"
                      : "border-emerald-500 bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
                  )}
                >
                  {hasDiscrepancies
                    ? `${items.length} ${items.length > 1 ? t.flaggedVariancesPlural : t.flaggedVariances}`
                    : t.matched100}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {hasDiscrepancies ? t.subtitleDiscrepancies : t.subtitleMatched}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button variant="outline" size="sm" asChild className="h-8 text-xs font-semibold">
              <Link to="/dispatch">
                <Truck className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                {t.allDispatches}
                <ArrowUpRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5">
        {discrepanciesQ.isLoading ? (
          <div className="py-6 text-center text-xs text-muted-foreground">{t.loading}</div>
        ) : !hasDiscrepancies ? (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-emerald-200/80 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20 text-xs text-emerald-900 dark:text-emerald-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <div>
              <span className="font-semibold">{t.alignmentTitle} </span>
              {t.alignmentDesc}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-lg border border-border/80">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 text-xs">
                    <TableHead className="font-semibold">{t.thChallan}</TableHead>
                    <TableHead className="font-semibold">{t.thQuote}</TableHead>
                    <TableHead className="font-semibold">{t.thCustomer}</TableHead>
                    <TableHead className="font-semibold">{t.thDealType}</TableHead>
                    <TableHead className="font-semibold min-w-[280px]">
                      {t.thDiscrepancies}
                    </TableHead>
                    <TableHead className="text-right">{t.thAction}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((row) => (
                    <TableRow
                      key={row.dispatchId}
                      className="hover:bg-amber-50/30 dark:hover:bg-amber-950/10"
                    >
                      <TableCell className="font-mono text-xs font-bold">
                        <Link
                          to="/dispatch/$id"
                          params={{ id: row.dispatchId }}
                          className="text-primary hover:underline flex items-center gap-1.5"
                        >
                          <Truck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          {row.dispatchNo}
                        </Link>
                        <span className="text-[10px] text-muted-foreground font-sans font-normal block">
                          {row.dispatchDate}
                        </span>
                      </TableCell>

                      <TableCell className="font-mono text-xs">
                        <Link
                          to="/quotes/$quoteId"
                          params={{ quoteId: row.quoteId }}
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                          {row.quoteNo}
                        </Link>
                      </TableCell>

                      <TableCell className="text-xs font-medium">{row.customerName}</TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-semibold",
                            row.dealType === "cash"
                              ? "border-emerald-400 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "border-blue-400 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
                          )}
                        >
                          {row.dealType === "cash" ? t.cashChallanOnly : t.invoicedDeal}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-xs">
                        <div className="space-y-1 py-1">
                          {row.report.variances.map((v, idx) => (
                            <div
                              key={idx}
                              className={cn(
                                "flex items-start gap-1.5 rounded p-1.5 text-[11px] leading-tight",
                                v.severity === "critical"
                                  ? "bg-rose-50 border border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-rose-200"
                                  : "bg-amber-50 border border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-900/50 dark:text-amber-200",
                              )}
                            >
                              <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold">{v.productName}: </span>
                                <span>{v.message}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            asChild
                            className="h-7 text-xs px-2.5"
                          >
                            <Link to="/dispatch/$id" params={{ id: row.dispatchId }}>
                              {t.reviewChallan}
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

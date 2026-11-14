import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  TrendingUp,
  ArrowRight,
  Sparkles,
  Users,
  Building2,
  Wallet,
  Coins,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getCompanyProfitabilityAndTargets,
  type CompanyProfitabilityOverview,
} from "@/lib/executive/salesperson-profitability";
import { formatInr } from "@/lib/format";
import { transliterateName } from "@/lib/i18n/transliterate";
import { cn } from "@/lib/utils";

const PROFIT_TEXTS = {
  en: {
    heading: "₹50 Lakh Cumulative Profit Target",
    subheading: "Realized net profit from customer collections vs. ₹50L company profit goal",
    leaderboard: "Full 50L Leaderboard",
    profitDiary: "Profit Diary",
    realizedOfTarget: "realized of ₹50,00,000 target",
    achieved: "Achieved",
    gap: "Gap",
    moneyCollected: "Money Collected",
    directCosts: "Direct Project Costs",
    overallMargin: "Overall Margin",
    closedProjects: "Closed Projects",
    projects: "projects",
    target: "Target",
    target25Lakhs: "₹25 Lakhs",
    goal: "Goal",
    profitEarned: "Profit Earned",
    cashCollected: "Cash Collected",
  },
  hi: {
    heading: "₹50 लाख संचयी लाभ लक्ष्य",
    subheading: "कंपनी के ₹50 लाख लाभ लक्ष्य के मुकाबले ग्राहक वसूली से प्राप्त शुद्ध लाभ",
    leaderboard: "पूर्ण 50L लीडरबोर्ड",
    profitDiary: "प्रॉफ़िट डायरी",
    realizedOfTarget: "₹50,00,000 लक्ष्य में से प्राप्त",
    achieved: "प्राप्त",
    gap: "शेष अंतर",
    moneyCollected: "एकत्रित राशि",
    directCosts: "प्रत्यक्ष प्रोजेक्ट लागत",
    overallMargin: "समग्र मार्जिन",
    closedProjects: "पूर्ण प्रोजेक्ट्स",
    projects: "प्रोजेक्ट्स",
    target: "लक्ष्य",
    target25Lakhs: "₹25 लाख",
    goal: "लक्ष्य",
    profitEarned: "अर्जित लाभ",
    cashCollected: "प्राप्त नकदी",
  },
  gu: {
    heading: "₹50 લાખ સંચિત નફા લક્ષ્ય",
    subheading: "કંપનીના ₹50L નફા લક્ષ્ય સામે ગ્રાહક વસૂલાતમાંથી મેળવેલ ચોખ્ખો નફો",
    leaderboard: "સંપૂર્ણ 50L લીડરબોર્ડ",
    profitDiary: "પ્રોફિટ ડાયરી",
    realizedOfTarget: "₹50,00,000 લક્ષ્યમાંથી પ્રાપ્ત",
    achieved: "પ્રાપ્ત",
    gap: "બાકી તફાવત",
    moneyCollected: "એકત્રિત નાણાં",
    directCosts: "પ્રત્યક્ષ પ્રોજેક્ટ ખર્ચ",
    overallMargin: "એકંદર માર્જિન",
    closedProjects: "પૂર્ણ પ્રોજેક્ટ્સ",
    projects: "પ્રોજેક્ટ્સ",
    target: "લક્ષ્ય",
    target25Lakhs: "₹25 લાખ",
    goal: "ધ્યેય",
    profitEarned: "મેળવેલ નફો",
    cashCollected: "રોકડ વસૂલાત",
  },
};

export function localizeCoachingSuggestion(text: string, lang: string): string {
  if (!text || lang === "en") return text;

  // Pattern 1: Congratulations
  const mCongrat =
    /🎉\s*Congratulations!\s*Target of ₹([\d.]+) Lakhs achieved with ₹([\d,]+) surplus profit!\s*Keep up the momentum on high-margin natural stone orders\./i.exec(
      text,
    );
  if (mCongrat) {
    const [_, targetLakh, surplus] = mCongrat;
    if (lang === "hi") {
      return `🎉 बधाई! ₹${surplus} अधिशेष लाभ के साथ ₹${targetLakh} लाख का लक्ष्य पूरा हुआ! उच्च-मार्जिन वाले प्राकृतिक स्टोन ऑर्डर्स पर गति बनाए रखें।`;
    }
    if (lang === "gu") {
      return `🎉 અભિનંદન! ₹${surplus} સરપ્લસ નફા સાથે ₹${targetLakh} લાખનો ટાર્ગેટ હાંસલ થયો! ઉચ્ચ-માર્જિન નેચરલ સ્ટોન ઓર્ડર્સ પર ગતિ જાળવી રાખો.`;
    }
  }

  // Pattern 2: Based on your average profit
  // "💡 Based on your average profit of ₹80,672 per deal: To bridge the remaining ₹4,83,190 gap to your ₹25L target, you need approximately 6 more closed client deals (~1 deals/week) amounting to 4,832 sq.ft (~805 sq.ft/week). Focus on following up your 1 pending quotes."
  const mCoach =
    /Based on your average profit of (₹[\d,]+) per deal:\s*To bridge the remaining (₹[\d,]+) gap to your (₹[\d.]+L) target,\s*you need approximately (\d+) more closed client deals\s*\(~(\d+) deals\/week\)\s*amounting to ([\d,]+)\s*sq\.ft\s*\(~([\d,]+)\s*sq\.ft\/week\)\.\s*Focus on following up your (\d+) pending quotes\./i.exec(
      text,
    );
  if (mCoach) {
    const [_, avgProfit, gap, target, dealsNeeded, weeklyDeals, totalSqft, weeklySqft, quotes] =
      mCoach;
    if (lang === "hi") {
      const locTarget = target.replace(/L$/i, " लाख");
      return `प्रति सौदा आपके औसत लाभ ${avgProfit} के आधार पर: आपके ${locTarget} लक्ष्य के शेष ${gap} अंतर को पाटने के लिए, आपको लगभग ${dealsNeeded} और सौदे क्लोज़ करने की आवश्यकता है (~${weeklyDeals} डील/सप्ताह) जो कुल ${totalSqft} वर्गफ़ुट (~${weeklySqft} वर्गफ़ुट/सप्ताह) होगी। अपने ${quotes} लंबित कोटेशन पर फ़ॉलो-अप पर ध्यान दें।`;
    }
    if (lang === "gu") {
      const locTarget = target.replace(/L$/i, " લાખ");
      return `ડીલ દીઠ તમારા સરેરાશ નફા ${avgProfit} ના આધારે: તમારા ${locTarget} લક્ષ્યાંકના બાકી ${gap} તફાવતને પહોંચી વળવા માટે, તમારે આશરે ${dealsNeeded} વધુ ક્લાયન્ટ ડીલ્સ (~${weeklyDeals} ડીલ/અઠવાડિયે) ક્લોઝ કરવાની જરૂર છે જે કુલ ${totalSqft} ચોરસ ફૂટ (~${weeklySqft} ચોરસ ફૂટ/અઠવાડિયે) થાય છે. તમારા ${quotes} પેન્ડિંગ ક્વોટેશન પર ફોલો-અપ પર ધ્યાન આપો.`;
    }
  }

  return text;
}

export function ProfitTargetDashboardCard() {
  const { i18n } = useTranslation();
  const lang = (i18n.language?.substring(0, 2) || "en") as "en" | "hi" | "gu";
  const t = PROFIT_TEXTS[lang] || PROFIT_TEXTS.en;

  const q = useQuery({
    queryKey: ["salesperson-profitability"],
    queryFn: () => getCompanyProfitabilityAndTargets(),
    staleTime: 30_000,
  });

  if (q.isLoading) {
    return (
      <Card className="border border-border/80 shadow-xs">
        <CardContent className="p-4 sm:p-5 space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (q.error || !q.data) return null;

  const data: CompanyProfitabilityOverview = q.data;
  const rishi = data.salespeople.find((s) => s.key === "rishi");
  const raman = data.salespeople.find((s) => s.key === "raman");

  const progressPct = Math.round(data.overallTargetProgressPct);

  return (
    <Card className="border-2 border-emerald-500/20 bg-linear-to-br from-emerald-50/40 via-card to-amber-50/30 dark:from-emerald-950/20 dark:via-card dark:to-amber-950/15 shadow-sm overflow-hidden">
      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground tracking-tight">{t.heading}</h3>
              <p className="text-xs text-muted-foreground">{t.subheading}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-8 text-xs font-semibold gap-1.5 border-emerald-500/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
            >
              <Link to="/dashboards/profitability">
                {t.leaderboard}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant="ghost"
              className="h-8 text-xs font-semibold gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <Link to="/projects">
                <Building2 className="h-3.5 w-3.5 text-amber-600" />
                {t.profitDiary}
              </Link>
            </Button>
          </div>
        </div>

        {/* Progress Bar & KPI Rollup */}
        <div className="rounded-xl border border-emerald-500/20 bg-card/80 p-3.5 space-y-2.5 backdrop-blur-xs">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 text-sm">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400 tabular-nums">
                {formatInr(data.totalNetProfit)}
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                {t.realizedOfTarget}
              </span>
            </div>
            <div className="text-xs font-bold text-muted-foreground">
              {progressPct}% {t.achieved} · {t.gap}:{" "}
              <span className="text-rose-600 dark:text-rose-400 font-bold tabular-nums">
                {formatInr(data.overallTargetGap)}
              </span>
            </div>
          </div>

          <Progress value={progressPct} className="h-2.5 bg-emerald-100 dark:bg-emerald-950/40" />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
            <div className="border-r border-border/50 pr-2">
              <span className="text-muted-foreground block text-[11px]">{t.moneyCollected}</span>
              <span className="font-bold text-foreground tabular-nums">
                {formatInr(data.totalMoneyCollected)}
              </span>
            </div>
            <div className="border-r border-border/50 pr-2">
              <span className="text-muted-foreground block text-[11px]">{t.directCosts}</span>
              <span className="font-bold text-foreground tabular-nums">
                {formatInr(data.totalCosts)}
              </span>
            </div>
            <div className="border-r border-border/50 pr-2">
              <span className="text-muted-foreground block text-[11px]">{t.overallMargin}</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                {data.overallMarginPct.toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">{t.closedProjects}</span>
              <span className="font-bold text-foreground tabular-nums">
                {data.totalDeals} {t.projects}
              </span>
            </div>
          </div>
        </div>

        {/* Side-by-Side Salesperson Mini Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
          {/* Rishi Rai */}
          {rishi && (
            <div className="rounded-xl border border-cyan-500/25 bg-card/60 p-3 space-y-2 hover:border-cyan-500/40 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-600 text-white font-black text-xs">
                    R
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">
                      {transliterateName("Rishi Rai", lang)}
                    </h4>
                    <p className="text-[10px] text-muted-foreground">
                      {t.target}: {t.target25Lakhs}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-cyan-100 text-cyan-900 dark:bg-cyan-950/60 dark:text-cyan-200 font-bold text-[10px]"
                >
                  {Math.round(rishi.targetProgressPct)}% {t.goal}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground block">{t.profitEarned}</span>
                  <span className="font-bold text-cyan-700 dark:text-cyan-300 tabular-nums">
                    {formatInr(rishi.netProfit)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">{t.cashCollected}</span>
                  <span className="font-bold text-foreground tabular-nums">
                    {formatInr(rishi.moneyCollected)}
                  </span>
                </div>
              </div>

              {rishi.coachingSuggestion && (
                <div className="text-[11px] text-muted-foreground bg-muted/40 rounded-lg p-2 flex items-start gap-1.5 leading-snug">
                  <Sparkles className="h-3.5 w-3.5 text-cyan-600 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">
                    {localizeCoachingSuggestion(rishi.coachingSuggestion, lang)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Raman Pupneja */}
          {raman && (
            <div className="rounded-xl border border-amber-500/25 bg-card/60 p-3 space-y-2 hover:border-amber-500/40 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-600 text-white font-black text-xs">
                    RP
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">
                      {transliterateName("Raman Pupneja", lang)}
                    </h4>
                    <p className="text-[10px] text-muted-foreground">
                      {t.target}: {t.target25Lakhs}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 font-bold text-[10px]"
                >
                  {Math.round(raman.targetProgressPct)}% {t.goal}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground block">{t.profitEarned}</span>
                  <span className="font-bold text-amber-700 dark:text-amber-300 tabular-nums">
                    {formatInr(raman.netProfit)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">{t.cashCollected}</span>
                  <span className="font-bold text-foreground tabular-nums">
                    {formatInr(raman.moneyCollected)}
                  </span>
                </div>
              </div>

              {raman.coachingSuggestion && (
                <div className="text-[11px] text-muted-foreground bg-muted/40 rounded-lg p-2 flex items-start gap-1.5 leading-snug">
                  <Sparkles className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">
                    {localizeCoachingSuggestion(raman.coachingSuggestion, lang)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

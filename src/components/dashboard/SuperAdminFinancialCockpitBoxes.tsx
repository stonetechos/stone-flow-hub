import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Scale,
  AlertTriangle,
  FileSpreadsheet,
  Banknote,
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Info,
  ExternalLink,
  FileText,
  Receipt,
  Plus,
  Building2,
  Truck,
  Wallet,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  Percent,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatInr, formatMoneyCompact, toIndicDigits } from "@/lib/format";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  getSuperAdminFinanceReport,
  getCachedSuperAdminFinanceReport,
  computeTotalMismatch,
  generateFinancialAiSuggestions,
  CANONICAL_HSN_VENDOR_SPECS,
  HSN4_CANONICAL_NAMES,
  SFT_SAVINGS_ANNUAL_LIMIT_INR,
  type SuperAdminFinanceReport,
  type HsnGroupSummary,
  type FinancialAiSuggestion,
} from "@/lib/dashboard/superadmin-finance";
import { useActiveTheme } from "@/components/global/ThemeSwitcher";
import { THEME_GAUGE_PALETTES } from "./StatutoryHealthGauge";

const CANONICAL_HSN_CODES = ["6802", "2516", "3214", "3824", "9954", "9965"];

const COCKPIT_TEXTS = {
  en: {
    mismatchTitle: "Sales & Purchase Invoicing Mismatch",
    unbackedSales: "unbacked sales (missing purchase invoices)",
    stockBuffer: "inward bills ahead of sales (stock buffer)",
    fullyEquated: "sales and purchases fully equated",
    billedOutward: "Billed Outward (Sales)",
    unitsBilled: "units billed",
    inwardCovered: "Inward Covered (Purchases)",
    unitsCovered: "units covered",
    hsnNeeded: "needed",
    clickInspectMismatch: "Click to inspect itemized HSN deficit & required vendor bills",

    headroomTitle: "Remaining Personal Savings / UPI Headroom",
    left: "Left",
    combinedLimit: "combined before ₹20L statutory limit",
    ramanUpi: "Raman Personal UPI",
    rishiUpi: "Rishi Personal UPI",
    aiRecommendation: "Financial Analytical AI Recommendation",
    openAiStrategy: "Open AI Financial Strategy & Direct Offsets",

    ledgerTitle: "4-Digit HSN Purchase vs. Sales Invoicing Ledger",
    ledgerDesc:
      "Benchmark: Equating inward purchases and outward sales strictly by the first 4 numbers of the HSN code. Identifies required supplier purchase invoices.",
    totalBilledOutward: "Total Billed Outward",
    unitsSold: "units sold",
    totalInwardCovered: "Total Inward Covered",
    unitsPurchased: "units purchased",
    netMismatchAmt: "Net Mismatch Amount",
    deficitUnbacked: "Deficit unbacked",
    inwardBuffer: "Inward buffer",
    deficitCategories: "Deficit HSN Categories",
    of: "of",
    requirePurchaseBills: "require purchase bills",
    itemizedBreakdown: "Itemized 4-Digit HSN Breakdown & Required Vendor Bills:",
    clickAddPurchaseHint: 'Click "+ Add Purchase Bill" to record invoices against any HSN deficit',
    colHsnCategory: "HSN & Category",
    colSoldOutward: "Sold Outward",
    colPurchasedInward: "Purchased Inward",
    colBalanceStatus: "Balance Status",
    colSuggestedAction: "Suggested Action",
    allCategories: "All HSN Categories",
    deficitsOnly: "Deficits Only",
    addPurchaseBill: "Add Purchase Bill",
    covered: "Covered",
    deficitNeeded: "Deficit",
    balanced: "Balanced",
    benchmarkNote:
      "Benchmark rule: To eliminate tax scrutiny risks, outward billing under an HSN must be backed by inward purchases under the same HSN.",

    advisorTitle: "Financial Analytical AI Advisor — Cash Routing & SFT Protection",
    advisorDesc:
      "Automated intelligence guarding personal accounts under Income Tax Section 285BA / Rule 114E (₹10 Lakh statutory annual limit).",
    combinedHeadroom: "Combined Remaining Headroom",
    simulateOffset: "Direct Customer-to-Agency/Vendor Offset Simulator",
    offsetDesc:
      "When a customer opts for a cash settlement, instruct them to pay directly to an external Quarry, Transporter, or Adhesive Agency bank account on Stone Tech's behalf. Zero rupees enter your personal savings accounts, preserving your statutory headroom.",
    customerCashAmt: "Customer Cash Deal Amount",
    ifDepositedPersonally: "If Deposited Personally (UPI)",
    burnsLimit: "Directly burns personal ₹10L limit",
    withDirectOffset: "With Direct Vendor Offset",
    savesHeadroom: "Saves headroom!",
    strategicAiRecs: "Strategic AI Recommendations Generated for Stone Tech:",
    partnerAuditTitle: "Current Partner Savings Inflow Velocity (FY 2026–27):",
    ramanSavings: "Raman Personal Savings",
    rishiSavings: "Rishi Personal Savings",
    remainingHeadroom: "Remaining headroom:",
    used: "used",
  },
  hi: {
    mismatchTitle: "बिक्री एवं खरीद इनवॉइसिंग बेमेल",
    unbackedSales: "असमर्थित बिक्री (खरीद इनवॉइस गायब है)",
    stockBuffer: "बिक्री से आगे आवक बिल (स्टॉक बफर)",
    fullyEquated: "बिक्री और खरीद पूरी तरह संतुलित",
    billedOutward: "जावक बिलिंग (बिक्री)",
    unitsBilled: "यूनिट बिल किए गए",
    inwardCovered: "आवक कवर्ड (खरीद)",
    unitsCovered: "यूनिट कवर किए गए",
    hsnNeeded: "आवश्यक",
    clickInspectMismatch: "आइटमवार HSN घाटा और आवश्यक विक्रेता बिल देखने के लिए क्लिक करें",

    headroomTitle: "शेष व्यक्तिगत बचत / UPI हेडरूम",
    left: "शेष",
    combinedLimit: "संयुक्त रूप से ₹20 लाख की वैधानिक सीमा से पहले",
    ramanUpi: "रमन पर्सनल UPI",
    rishiUpi: "ऋषि पर्सनल UPI",
    aiRecommendation: "वित्तीय विश्लेषणात्मक AI अनुशंसा",
    openAiStrategy: "AI वित्तीय रणनीति और प्रत्यक्ष ऑफसेट खोलें",

    ledgerTitle: "4-अंकीय HSN खरीद बनाम बिक्री इनवॉइसिंग बहीखाता",
    ledgerDesc:
      "मानक: HSN कोड के पहले 4 अंकों के आधार पर आवक खरीद और जावक बिक्री की समानता। आवश्यक आपूर्तिकर्ता खरीद बिलों की पहचान करता है।",
    totalBilledOutward: "कुल जावक बिलिंग",
    unitsSold: "यूनिट बेचे गए",
    totalInwardCovered: "कुल आवक कवर्ड",
    unitsPurchased: "यूनिट खरीदे गए",
    netMismatchAmt: "शुद्ध बेमेल राशि",
    deficitUnbacked: "असमर्थित घाटा",
    inwardBuffer: "आवक स्टॉक बफर",
    deficitCategories: "घाटे वाली HSN श्रेणियां",
    of: "में से",
    requirePurchaseBills: "खरीद बिल आवश्यक हैं",
    itemizedBreakdown: "आइटमवार 4-अंकीय HSN विवरण और आवश्यक विक्रेता बिल:",
    clickAddPurchaseHint:
      'किसी भी HSN घाटे के खिलाफ इनवॉइस दर्ज करने के लिए "+ खरीद बिल जोड़ें" पर क्लिक करें',
    colHsnCategory: "HSN और श्रेणी",
    colSoldOutward: "जावक बिक्री",
    colPurchasedInward: "आवक खरीद",
    colBalanceStatus: "संतुलन स्थिति",
    colSuggestedAction: "सुझाई गई कार्रवाई",
    allCategories: "सभी HSN श्रेणियां",
    deficitsOnly: "केवल घाटा",
    addPurchaseBill: "खरीद बिल जोड़ें",
    covered: "कवर्ड",
    deficitNeeded: "घाटा",
    balanced: "संतुलित",
    benchmarkNote:
      "मानक नियम: टैक्स जांच के जोखिम से बचने के लिए, किसी HSN के तहत जावक बिक्री उसी HSN के तहत आवक खरीद द्वारा समर्थित होनी चाहिए।",

    advisorTitle: "वित्तीय विश्लेषणात्मक AI सलाहकार — कैश रूटिंग और SFT सुरक्षा",
    advisorDesc:
      "आयकर धारा 285BA / नियम 114E (₹10 लाख वैधानिक वार्षिक सीमा) के तहत व्यक्तिगत खातों की सुरक्षा करने वाली स्वचालित प्रणाली।",
    combinedHeadroom: "संयुक्त शेष हेडरूम",
    simulateOffset: "सीधे ग्राहक-से-एजेंसी/विक्रेता ऑफसेट सिम्युलेटर",
    offsetDesc:
      "जब कोई ग्राहक नकद निपटान का विकल्प चुनता है, तो उसे स्टोन टेक की ओर से सीधे बाहरी खदान, ट्रांसपोर्टर या चिपकने वाली एजेंसी के बैंक खाते में भुगतान करने का निर्देश दें। आपके व्यक्तिगत बचत खातों में शून्य रुपये प्रवेश करते हैं।",
    customerCashAmt: "ग्राहक नकद सौदा राशि",
    ifDepositedPersonally: "यदि व्यक्तिगत रूप से जमा किया जाए (UPI)",
    burnsLimit: "सीधे व्यक्तिगत ₹10 लाख सीमा को समाप्त करता है",
    withDirectOffset: "प्रत्यक्ष विक्रेता ऑफसेट के साथ",
    savesHeadroom: "हेडरूम सुरक्षित करता है!",
    strategicAiRecs: "स्टोन टेक के लिए उत्पन्न रणनीतिक AI सिफारिशें:",
    partnerAuditTitle: "वर्तमान भागीदार बचत आवक वेग (वित्त वर्ष 2026–27):",
    ramanSavings: "रमन व्यक्तिगत बचत",
    rishiSavings: "ऋषि व्यक्तिगत बचत",
    remainingHeadroom: "शेष हेडरूम:",
    used: "प्रयुक्त",
  },
  gu: {
    mismatchTitle: "સેલ્સ & પર્ચેસ ઇન્વૉઇસિંગ તફાવત",
    unbackedSales: "અસમર્થિત વેચાણ (ખરીદી ઇન્વૉઇસ ખૂટે છે)",
    stockBuffer: "વેચાણ કરતાં વધુ ખરીદી બિલ (સ્ટોક બફર)",
    fullyEquated: "વેચાણ અને ખરીદી સંપૂર્ણ સંતુલિત",
    billedOutward: "આઉટવર્ડ બિલિંગ (વેચાણ)",
    unitsBilled: "યુનિટ્સ બિલ થયેલ",
    inwardCovered: "ઇન્વર્ડ કવર્ડ (ખરીદી)",
    unitsCovered: "યુનિટ્સ કવર થયેલ",
    hsnNeeded: "જરૂરી",
    clickInspectMismatch: "વિગતવાર HSN તફાવત અને જરૂરી વેન્ડર બિલ જોવા ક્લિક કરો",

    headroomTitle: "બાકી પર્સનલ સેવિંગ્સ / UPI હેડરૂમ",
    left: "બાકી",
    combinedLimit: "સંયુક્ત રીતે ₹૨૦ લાખની કાનૂની મર્યાદા પહેલાં",
    ramanUpi: "રમન પર્સનલ UPI",
    rishiUpi: "ઋષિ પર્સનલ UPI",
    aiRecommendation: "નાણાકીય વિશ્લેષણાત્મક AI ભલામણ",
    openAiStrategy: "AI નાણાકીય વ્યૂહરચના અને ડાયરેક્ટ ઑફસેટ્સ ખોલો",

    ledgerTitle: "૪-અંક HSN ખરીદી સામે વેચાણ ઇન્વૉઇસિંગ ખાતાવહી",
    ledgerDesc:
      "બેન્ચમાર્ક: HSN કોડના પ્રથમ ૪ અંકોના આધારે ઇન્વર્ડ ખરીદી અને આઉટવર્ડ વેચાણની સમાનતા. જરૂરી સપ્લાયર ખરીદી બિલ ઓળખે છે.",
    totalBilledOutward: "કુલ આઉટવર્ડ બિલિંગ",
    unitsSold: "યુનિટ્સ વેચાયા",
    totalInwardCovered: "કુલ ઇન્વર્ડ કવર્ડ",
    unitsPurchased: "યુનિટ્સ ખરીદ્યા",
    netMismatchAmt: "ચોખ્ખી તફાવત રકમ",
    deficitUnbacked: "અસમર્થિત તફાવત",
    inwardBuffer: "ઇન્વર્ડ સ્ટોક બફર",
    deficitCategories: "તફાવત વાળી HSN કેટેગરીઝ",
    of: "માંથી",
    requirePurchaseBills: "ખરીદી બિલની જરૂર છે",
    itemizedBreakdown: "વિગતવાર ૪-અંક HSN વિશ્લેષણ અને જરૂરી વેન્ડર બિલ:",
    clickAddPurchaseHint: 'કોઈપણ HSN તફાવત સામે ઇન્વૉઇસ નોંધવા "+ ખરીદી બિલ ઉમેરો" પર ક્લિક કરો',
    colHsnCategory: "HSN અને કેટેગરી",
    colSoldOutward: "આઉટવર્ડ વેચાણ",
    colPurchasedInward: "ઇન્વર્ડ ખરીદી",
    colBalanceStatus: "બેલેન્સ સ્થિતિ",
    colSuggestedAction: "સૂચવેલ પગલાં",
    allCategories: "બધી HSN કેટેગરીઝ",
    deficitsOnly: "માત્ર તફાવત વાળા",
    addPurchaseBill: "ખરીદી બિલ ઉમેરો",
    covered: "કવર થયેલ",
    deficitNeeded: "તફાવત",
    balanced: "સંતુલિત",
    benchmarkNote:
      "બેન્ચમાર્ક નિયમ: ટેક્સ તપાસના જોખમને ટાળવા માટે, ચોક્કસ HSN હેઠળનું આઉટવર્ડ વેચાણ તે જ HSN હેઠળની ઇન્વર્ડ ખરીદી દ્વારા સમર્થિત હોવું જોઈએ.",

    advisorTitle: "નાણાકીય વિશ્લેષણાત્મક AI સલાહકાર — કેશ રાઉટિંગ અને SFT સુરક્ષા",
    advisorDesc:
      "ઇન્કમ ટેક્સ કલમ 285BA / નિયમ 114E (₹૧૦ લાખ કાનૂની વાર્ષિક મર્યાદા) હેઠળ અંગત ખાતાઓની રક્ષા કરતી સ્વચાલિત સિસ્ટમ.",
    combinedHeadroom: "સંયુક્ત બાકી હેડરૂમ",
    simulateOffset: "સીધા ગ્રાહક-થી-એજન્સી/વેન્ડર ઑફસેટ સિમ્યુલેટર",
    offsetDesc:
      "જ્યારે ગ્રાહક રોકડ ચુકવણી પસંદ કરે, ત્યારે સ્ટોન ટેક વતી સીધા બહારની ક્વોરી, ટ્રાન્સપોર્ટર અથવા એડહેસિવ એજન્સીના બેંક ખાતામાં ચૂકવણી કરવા સૂચના આપો. તમારા અંગત બચત ખાતામાં શૂન્ય રૂપિયા જમા થાય છે.",
    customerCashAmt: "ગ્રાહક રોકડ ડીલ રકમ",
    ifDepositedPersonally: "જો વ્યક્તિગત રીતે જમા કરવામાં આવે (UPI)",
    burnsLimit: "સીધી વ્યક્તિગત ₹૧૦ લાખની મર્યાદા ઘટાડે છે",
    withDirectOffset: "ડાયરેક્ટ વેન્ડર ઑફસેટ સાથે",
    savesHeadroom: "હેડરૂમ સુરક્ષિત કરે છે!",
    strategicAiRecs: "સ્ટોન ટેક માટે જનરેટ કરેલ વ્યૂહાત્મક AI ભલામણો:",
    partnerAuditTitle: "હાલનો પાર્ટનર બચત આવક વેગ (FY ૨૦૨૬–૨૭):",
    ramanSavings: "રમન અંગત બચત",
    rishiSavings: "ઋષિ અંગત બચત",
    remainingHeadroom: "બાકી હેડરૂમ:",
    used: "વપરાયેલ",
  },
};

function localizeAiSuggestionText(
  suggestion: FinancialAiSuggestion | undefined,
  lang: "en" | "hi" | "gu",
): { title: string; summary: string; details: string; actionLabel: string } {
  if (!suggestion) {
    return {
      title: "",
      summary:
        lang === "gu"
          ? "પર્સનલ સેવિંગ્સ એકાઉન્ટને અસર ન થાય તે માટે ગ્રાહકની રોકડ ચૂકવણી સીધી ક્વોરી અથવા ટ્રાન્સપોર્ટ એજન્સી ખાતામાં જમા કરાવો."
          : lang === "hi"
            ? "व्यक्तिगत बचत खातों पर असर से बचने के लिए ग्राहक के नकद भुगतान को सीधे खदान या परिवहन एजेंसी खातों में भेजें।"
            : "Direct customer cash payments to quarry or transport agency accounts to avoid hitting personal savings accounts.",
      details: "",
      actionLabel: "",
    };
  }

  if (lang === "en") {
    return {
      title: suggestion.title,
      summary: suggestion.summary,
      details: suggestion.details,
      actionLabel: suggestion.actionLabel,
    };
  }

  if (suggestion.type === "direct_agency_offset") {
    if (lang === "gu") {
      return {
        title: "ગ્રાહકની રોકડ સીધી ક્વોરી / ટ્રાન્સપોર્ટર તરફ વાળો",
        summary:
          "રોકડ ડીલ પસંદ કરતા ગ્રાહકોને સ્ટોન ટેકની બાકી ચૂકવણી સામે સીધા ક્વોરી અથવા ટ્રાન્સપોર્ટ એજન્સીના ખાતામાં ચૂકવણી કરવા સૂચના આપો. આનાથી પર્સનલ સેવિંગ્સ ખાતાનો ઉપયોગ સંપૂર્ણપણે બચી જશે.",
        details:
          "ઇન્કમ ટેક્સ નિયમ 114E (SFT-004) હેઠળ વ્યક્તિગત બચત ખાતાઓમાં વાર્ષિક ₹૧૦ લાખથી વધુની રોકડ/ક્રેડિટ પર નજર રાખવામાં આવે છે. જ્યારે ગ્રાહક આપણા વતી ટ્રાન્સપોર્ટર અથવા ક્વોરી સપ્લાયરને સીધા ચૂકવે છે, ત્યારે વ્યક્તિગત ખાતામાં ₹૦ જમા થાય છે, જેનાથી ₹૧.૫ લાખનું કાનૂની હેડરૂમ બચે છે અને વેન્ડરની જવાબદારી તાત્કાલિક પતી જાય છે.",
        actionLabel: "ડાયરેક્ટ એજન્સી ઑફસેટ નોંધો",
      };
    }
    return {
      title: "ग्राहक का नकद सीधे खदान / ट्रांसपोर्टर को भेजें",
      summary:
        "नकद सौदों का विकल्प चुनने वाले ग्राहकों को स्टोन टेक की देनदारी के बदले सीधे खदान या परिवहन एजेंसी खातों में भुगतान करने का निर्देश दें। यह व्यक्तिगत बचत खातों को पूरी तरह से बायपास करता है।",
      details:
        "आयकर नियम 114E (SFT-004) के तहत व्यक्तिगत बचत खातों में वार्षिक ₹10 लाख से अधिक की नकदी/जमा पर नजर रखी जाती है। जब कोई ग्राहक हमारी ओर से ट्रांसपोर्टर या सप्लायर को सीधे भुगतान करता है, तो व्यक्तिगत खातों में ₹0 आता है, जिससे वैधानिक हेडरूम सुरक्षित रहता है।",
      actionLabel: "प्रत्यक्ष एजेंसी ऑफसेट दर्ज करें",
    };
  }

  if (suggestion.type === "partner_rebalance") {
    if (lang === "gu") {
      return {
        title: toIndicDigits(
          suggestion.title
            .replace("Switch Inbound UPI QR to", "ઇનબાઉન્ડ UPI QR બદલો")
            .replace(
              "Maintain Equalized Personal UPI Rotation",
              "બંને પાર્ટનર્સ વચ્ચે સમાન UPI રોટેશન જાળવો",
            ),
          lang,
        ),
        summary: toIndicDigits(
          suggestion.summary
            .replace(/left/g, "બાકી")
            .replace(/limit/g, "મર્યાદા")
            .replace(/headroom/g, "હેડરૂમ"),
          lang,
        ),
        details: toIndicDigits(suggestion.details, lang),
        actionLabel: toIndicDigits(suggestion.actionLabel, lang),
      };
    }
    return {
      title: toIndicDigits(
        suggestion.title
          .replace("Switch Inbound UPI QR to", "इनबाउंड UPI QR बदलें")
          .replace(
            "Maintain Equalized Personal UPI Rotation",
            "दोनों भागीदारों के बीच समान UPI रोटेशन बनाए रखें",
          ),
        lang,
      ),
      summary: toIndicDigits(
        suggestion.summary
          .replace(/left/g, "शेष")
          .replace(/limit/g, "सीमा")
          .replace(/headroom/g, "हेडरूम"),
        lang,
      ),
      details: toIndicDigits(suggestion.details, lang),
      actionLabel: toIndicDigits(suggestion.actionLabel, lang),
    };
  }

  if (suggestion.type === "current_account_route") {
    if (lang === "gu") {
      return {
        title: "₹૧.૫L થી વધુના ટ્રાન્ઝેક્શન કંપની કરન્ટ એકાઉન્ટ તરફ વાળો",
        summary:
          "₹૧,૫૦,૦૦૦ થી વધુના ઓર્ડર માટે સત્તાવાર GST ટેક્સ ઇન્વૉઇસ બનાવો અને બેંક ઑફ બરોડા કંપની કરન્ટ એકાઉન્ટમાં RTGS સ્વીકારો (કોઈ વ્યક્તિગત SFT મર્યાદા નથી).",
        details:
          "કોર્પોરેટ કરન્ટ એકાઉન્ટમાં કોઈ વ્યક્તિગત SFT મર્યાદા હોતી નથી અને તે ભવિષ્યની ક્રેડિટ લાઇન માટે કંપનીનું સત્તાવાર બેંકિંગ ટર્નઓવર વધારે છે.",
        actionLabel: "GST ક્વોટ / બિલ બનાવો",
      };
    }
    return {
      title: "₹1.5L से अधिक के लेन-देन कंपनी चालू खाते में भेजें",
      summary:
        "₹1,50,000 से अधिक के ऑर्डर के लिए आधिकारिक GST टैक्स इनवॉइस जारी करें और बैंक ऑफ बड़ौदा कंपनी चालू खाते में RTGS स्वीकार करें (शून्य व्यक्तिगत SFT सीमा)।",
      details:
        "कॉर्पोरेट चालू खातों में कोई व्यक्तिगत SFT सीमा नहीं होती है और यह भविष्य की क्रेडिट सुविधाओं के लिए कंपनी के बैंकिंग टर्नओवर को बढ़ाता है।",
      actionLabel: "GST कोट / बिल बनाएं",
    };
  }

  return {
    title: suggestion.title,
    summary: suggestion.summary,
    details: suggestion.details,
    actionLabel: suggestion.actionLabel,
  };
}

interface SuperAdminFinancialCockpitBoxesProps {
  className?: string;
}

export function SuperAdminFinancialCockpitBoxes({
  className,
}: SuperAdminFinancialCockpitBoxesProps) {
  const { i18n } = useTranslation();
  const lang = (i18n.language?.substring(0, 2) || "en") as "en" | "hi" | "gu";
  const t = COCKPIT_TEXTS[lang] || COCKPIT_TEXTS.en;

  const activeThemeId = useActiveTheme();
  const palette = THEME_GAUGE_PALETTES[activeThemeId] || THEME_GAUGE_PALETTES["st-og"];
  const navigate = useNavigate();

  const [isMismatchModalOpen, setIsMismatchModalOpen] = useState(false);
  const [isAiStrategyModalOpen, setIsAiStrategyModalOpen] = useState(false);
  const [selectedHsnFilter, setSelectedHsnFilter] = useState<string | "all">("all");
  const [simOffsetAmount, setSimOffsetAmount] = useState<number>(120000);

  const [initialData] = useState<SuperAdminFinanceReport | undefined>(() =>
    getCachedSuperAdminFinanceReport(),
  );

  const query = useQuery<SuperAdminFinanceReport>({
    queryKey: ["superadmin-finance-report"],
    queryFn: () => getSuperAdminFinanceReport(),
    initialData,
    staleTime: 60_000,
  });

  const report = query.data;
  const isDataReady = Boolean(report);
  const isLoading = query.isLoading && !isDataReady;

  // Merge canonical HSN categories with live DB summary to guarantee all 6 key HSNs exist
  const completeHsnSummary = useMemo<HsnGroupSummary[]>(() => {
    const map = new Map<string, HsnGroupSummary>();
    for (const h of report?.hsnSummary ?? []) {
      map.set(h.hsn4, h);
    }

    const result: HsnGroupSummary[] = [];
    for (const code of CANONICAL_HSN_CODES) {
      const existing = map.get(code);
      if (existing) {
        result.push(existing);
      } else {
        const meta = HSN4_CANONICAL_NAMES[code];
        result.push({
          hsn4: code,
          categoryName: meta?.name || `HSN ${code}`,
          soldQty: 0,
          soldValue: 0,
          purchasedQty: 0,
          purchasedValue: 0,
          deficitQty: 0,
          deficitValue: 0,
          unit: meta?.defaultUnit || "units",
          status: "balanced",
        });
      }
    }

    // Append any extra non-canonical HSN codes that may have been parsed
    for (const h of report?.hsnSummary ?? []) {
      if (!CANONICAL_HSN_CODES.includes(h.hsn4)) {
        result.push(h);
      }
    }

    return result;
  }, [report?.hsnSummary]);

  // Compute Total Sales vs Purchase Mismatch
  const mismatch = useMemo(() => {
    return computeTotalMismatch(completeHsnSummary);
  }, [completeHsnSummary]);

  // Personal accounts & SFT headroom
  const raman = report?.personalAccounts?.find((a) => a.accountKey === "raman");
  const rishi = report?.personalAccounts?.find((a) => a.accountKey === "rishi");

  const ramanHeadroom = raman?.headroomInr ?? 10_00_000;
  const rishiHeadroom = rishi?.headroomInr ?? 10_00_000;
  const minHeadroom = Math.min(ramanHeadroom, rishiHeadroom);
  const totalHeadroom = ramanHeadroom + rishiHeadroom;
  const ramanUsage = raman?.usagePercentage ?? 0;
  const rishiUsage = rishi?.usagePercentage ?? 0;

  // Financial Analytical AI suggestions
  const aiSuggestions = useMemo(() => {
    return generateFinancialAiSuggestions(report?.personalAccounts ?? [], report?.cashAnalytics);
  }, [report?.personalAccounts, report?.cashAnalytics]);

  const topOffsetSuggestion = aiSuggestions.find((s) => s.type === "direct_agency_offset");

  return (
    <div className={cn("w-full max-w-full min-w-0 select-none", className)}>
      {/* TWO PROMINENT EXECUTIVE BOXES GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 w-full">
        {/* ========================================================================= */}
        {/* BOX 1: SALES VS PURCHASE INVOICING MISMATCH                               */}
        {/* ========================================================================= */}
        <div
          onClick={() => setIsMismatchModalOpen(true)}
          style={{
            background: palette.cardBgGradient,
            boxShadow:
              "0 14px 28px -8px rgba(0,0,0,0.1), 0 4px 10px -2px rgba(0,0,0,0.05), inset 0 1.5px 0 rgba(255,255,255,0.9), inset 0 -2px 0 rgba(0,0,0,0.08)",
          }}
          className={cn(
            "group relative rounded-2xl border-t-2 border-l border-r border-b-3 p-4 sm:p-5 transition-all duration-200 cursor-pointer",
            "hover:-translate-y-1 hover:shadow-xl active:translate-y-0.5",
            palette.cardBorder,
            "border-t-white/95 dark:border-t-white/20 border-b-black/15 dark:border-b-black/50",
            !isDataReady
              ? "ring-1 ring-border/50"
              : mismatch.isDeficit
                ? "ring-2 ring-rose-500/25 dark:ring-rose-500/35"
                : "ring-1 ring-emerald-500/20",
          )}
        >
          {/* Big Amount & Mismatch State */}
          <div>
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              {t.mismatchTitle}
            </div>

            {!isDataReady ? (
              <div className="mt-1 space-y-1.5 py-1">
                <div className="h-8 sm:h-9 w-40 bg-slate-200/80 dark:bg-slate-700/80 rounded-md animate-pulse" />
                <div className="h-4 w-56 bg-slate-200/60 dark:bg-slate-700/60 rounded animate-pulse" />
              </div>
            ) : (
              <div className="mt-1 flex items-baseline gap-2 flex-wrap">
                <span
                  className={cn(
                    "font-display text-2xl sm:text-3xl font-black tabular-nums tracking-tight drop-shadow-2xs",
                    mismatch.isDeficit
                      ? "text-[#015474]"
                      : mismatch.netMismatchValue < 0
                        ? "text-[#006788]"
                        : "text-foreground",
                  )}
                >
                  {toIndicDigits(mismatch.formattedMismatch, lang)}
                </span>

                <span className="text-xs font-semibold text-muted-foreground">
                  {mismatch.isDeficit
                    ? t.unbackedSales
                    : mismatch.netMismatchValue < 0
                      ? t.stockBuffer
                      : t.fullyEquated}
                </span>
              </div>
            )}

            {/* Inward vs Outward Metric Breakdown */}
            <div className="mt-3 grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-card/80 border border-border/60 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  {t.billedOutward}
                </span>
                {!isDataReady ? (
                  <div className="space-y-1 mt-1">
                    <div className="h-4 w-20 bg-slate-200/80 dark:bg-slate-700/80 rounded animate-pulse" />
                    <div className="h-3 w-16 bg-slate-200/60 dark:bg-slate-700/60 rounded animate-pulse" />
                  </div>
                ) : (
                  <>
                    <span className="font-mono font-black text-foreground">
                      {toIndicDigits(formatInr(mismatch.totalSoldValue), lang)}
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      {toIndicDigits(mismatch.totalSoldQty.toLocaleString("en-IN"), lang)}{" "}
                      {t.unitsBilled}
                    </span>
                  </>
                )}
              </div>
              <div className="border-l border-border/60 pl-2.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  {t.inwardCovered}
                </span>
                {!isDataReady ? (
                  <div className="space-y-1 mt-1">
                    <div className="h-4 w-20 bg-slate-200/80 dark:bg-slate-700/80 rounded animate-pulse" />
                    <div className="h-3 w-16 bg-slate-200/60 dark:bg-slate-700/60 rounded animate-pulse" />
                  </div>
                ) : (
                  <>
                    <span className="font-mono font-black text-foreground">
                      {toIndicDigits(formatInr(mismatch.totalPurchasedValue), lang)}
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      {toIndicDigits(mismatch.totalPurchasedQty.toLocaleString("en-IN"), lang)}{" "}
                      {t.unitsCovered}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Canonical HSN Ticker preview */}
            <div className="mt-3 flex items-center gap-1.5 flex-wrap">
              {!isDataReady
                ? [1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-5 w-20 bg-slate-200/60 dark:bg-slate-700/60 rounded-md animate-pulse"
                    />
                  ))
                : completeHsnSummary.slice(0, 4).map((h) => {
                    const isDef = h.status === "deficit" || h.soldQty > h.purchasedQty;
                    return (
                      <span
                        key={h.hsn4}
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border",
                          isDef
                            ? "bg-[#e0f1f5] text-[#015474] border-[#c9d1d4]"
                            : "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800",
                        )}
                      >
                        <span>HSN {toIndicDigits(h.hsn4, lang)}</span>
                        <span className="font-mono font-normal">
                          {isDef
                            ? `+${toIndicDigits(h.deficitQty, lang)} ${h.unit} ${t.hsnNeeded}`
                            : "✓"}
                        </span>
                      </span>
                    );
                  })}
            </div>

            {/* Click to inspect footer */}
            <div className="mt-3.5 pt-2.5 border-t border-border/60 flex items-center justify-between text-xs font-bold text-primary group-hover:text-primary/90">
              <span className="flex items-center gap-1">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>{t.clickInspectMismatch}</span>
              </span>
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BOX 2: PERSONAL SAVINGS & UPI SFT HEADROOM (AI ADVISOR)                   */}
        {/* ========================================================================= */}
        <div
          onClick={() => setIsAiStrategyModalOpen(true)}
          style={{
            background: palette.cardBgGradient,
            boxShadow:
              "0 14px 28px -8px rgba(0,0,0,0.1), 0 4px 10px -2px rgba(0,0,0,0.05), inset 0 1.5px 0 rgba(255,255,255,0.9), inset 0 -2px 0 rgba(0,0,0,0.08)",
          }}
          className={cn(
            "group relative rounded-2xl border-t-2 border-l border-r border-b-3 p-4 sm:p-5 transition-all duration-200 cursor-pointer",
            "hover:-translate-y-1 hover:shadow-xl active:translate-y-0.5",
            palette.cardBorder,
            "border-t-white/95 dark:border-t-white/20 border-b-black/15 dark:border-b-black/50",
            !isDataReady
              ? "ring-1 ring-border/50"
              : minHeadroom < 250000
                ? "ring-2 ring-[#006788]/25"
                : "ring-1 ring-primary/20",
          )}
        >
          {/* Big Amount: Headroom Left */}
          <div>
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              {t.headroomTitle}
            </div>

            {!isDataReady ? (
              <div className="mt-1 space-y-1.5 py-1">
                <div className="h-8 sm:h-9 w-44 bg-slate-200/80 dark:bg-slate-700/80 rounded-md animate-pulse" />
                <div className="h-4 w-52 bg-slate-200/60 dark:bg-slate-700/60 rounded animate-pulse" />
              </div>
            ) : (
              <div className="mt-1 flex items-baseline gap-2 flex-wrap">
                <span className="font-display text-2xl sm:text-3xl font-black tabular-nums tracking-tight text-[#015474] drop-shadow-2xs">
                  {toIndicDigits(formatInr(totalHeadroom), lang)} {t.left}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">
                  {t.combinedLimit}
                </span>
              </div>
            )}

            {/* Partner Split Progress */}
            <div className="mt-3 space-y-2 p-2.5 rounded-xl bg-card/80 border border-border/60 text-xs">
              {!isDataReady ? (
                <div className="space-y-2.5 py-0.5">
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <div className="h-3 w-28 bg-slate-200/80 dark:bg-slate-700/80 rounded animate-pulse" />
                      <div className="h-3 w-32 bg-slate-200/60 dark:bg-slate-700/60 rounded animate-pulse" />
                    </div>
                    <div className="h-1.5 w-full bg-slate-200/60 dark:bg-slate-700/60 rounded animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <div className="h-3 w-28 bg-slate-200/80 dark:bg-slate-700/80 rounded animate-pulse" />
                      <div className="h-3 w-32 bg-slate-200/60 dark:bg-slate-700/60 rounded animate-pulse" />
                    </div>
                    <div className="h-1.5 w-full bg-slate-200/60 dark:bg-slate-700/60 rounded animate-pulse" />
                  </div>
                </div>
              ) : (
                <>
                  {/* Raman */}
                  <div>
                    <div className="flex items-center justify-between font-semibold text-[11px]">
                      <span className="text-foreground">{t.ramanUpi}</span>
                      <span className="font-mono tabular-nums text-muted-foreground">
                        {toIndicDigits(formatInr(raman?.cumulativeInflowsInr ?? 0), lang)} /{" "}
                        {toIndicDigits("₹10L", lang)} (
                        {raman?.headroomInr
                          ? `${toIndicDigits(formatInr(raman.headroomInr), lang)} ${t.left}`
                          : `${toIndicDigits("₹10L", lang)} ${t.left}`}
                        )
                      </span>
                    </div>
                    <Progress
                      value={ramanUsage}
                      className="h-1.5 mt-1 bg-slate-200 dark:bg-slate-800"
                    />
                  </div>

                  {/* Rishi */}
                  <div>
                    <div className="flex items-center justify-between font-semibold text-[11px]">
                      <span className="text-foreground">{t.rishiUpi}</span>
                      <span className="font-mono tabular-nums text-muted-foreground">
                        {toIndicDigits(formatInr(rishi?.cumulativeInflowsInr ?? 0), lang)} /{" "}
                        {toIndicDigits("₹10L", lang)} (
                        {rishi?.headroomInr
                          ? `${toIndicDigits(formatInr(rishi.headroomInr), lang)} ${t.left}`
                          : `${toIndicDigits("₹10L", lang)} ${t.left}`}
                        )
                      </span>
                    </div>
                    <Progress
                      value={rishiUsage}
                      className="h-1.5 mt-1 bg-slate-200 dark:bg-slate-800"
                    />
                  </div>
                </>
              )}
            </div>

            {/* FINANCIAL ANALYTICAL AI ADVISOR INSIGHT (EMBEDDED) */}
            <div className="mt-3 p-2.5 rounded-xl bg-gradient-to-r from-cyan-500/10 via-emerald-500/10 to-transparent border border-cyan-500/30 text-xs">
              <div className="flex items-center gap-1.5 text-cyan-800 dark:text-cyan-300 font-extrabold text-[11px]">
                <Sparkles className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>{t.aiRecommendation}</span>
              </div>
              {!isDataReady ? (
                <div className="h-3 w-4/5 bg-slate-200/60 dark:bg-slate-700/60 rounded animate-pulse mt-1.5" />
              ) : (
                <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                  {localizeAiSuggestionText(topOffsetSuggestion, lang).summary}
                </p>
              )}
            </div>

            {/* Click to inspect footer */}
            <div className="mt-3.5 pt-2.5 border-t border-border/60 flex items-center justify-between text-xs font-bold text-primary group-hover:text-primary/90">
              <span className="flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                <span>{t.openAiStrategy}</span>
              </span>
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DIALOG 1: ITEMIZED HSN PURCHASE VS SALES MISMATCH LEDGER                  */}
      {/* ========================================================================= */}
      <Dialog open={isMismatchModalOpen} onOpenChange={setIsMismatchModalOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div
                style={{ background: palette.activePillBg }}
                className="p-2 rounded-xl text-white shrink-0"
              >
                <Scale className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="font-display text-lg sm:text-xl font-black">
                  {t.ledgerTitle}
                </DialogTitle>
                <DialogDescription className="text-xs">{t.ledgerDesc}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Executive Rollup Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-muted/50 border border-border/60">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                {t.totalBilledOutward}
              </span>
              <span className="font-mono font-black text-foreground text-sm sm:text-base">
                {toIndicDigits(formatInr(mismatch.totalSoldValue), lang)}
              </span>
              <span className="text-[10px] text-muted-foreground block">
                {toIndicDigits(mismatch.totalSoldQty.toLocaleString("en-IN"), lang)} {t.unitsSold}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                {t.totalInwardCovered}
              </span>
              <span className="font-mono font-black text-foreground text-sm sm:text-base">
                {toIndicDigits(formatInr(mismatch.totalPurchasedValue), lang)}
              </span>
              <span className="text-[10px] text-muted-foreground block">
                {toIndicDigits(mismatch.totalPurchasedQty.toLocaleString("en-IN"), lang)}{" "}
                {t.unitsPurchased}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                {t.netMismatchAmt}
              </span>
              <span
                className={cn(
                  "font-mono font-black text-sm sm:text-base",
                  mismatch.isDeficit ? "text-[#015474]" : "text-[#006788]",
                )}
              >
                {toIndicDigits(mismatch.formattedMismatch, lang)}
              </span>
              <span className="text-[10px] text-muted-foreground block">
                {mismatch.isDeficit ? t.deficitUnbacked : t.inwardBuffer}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                {t.deficitCategories}
              </span>
              <span className="font-mono font-black text-foreground text-sm sm:text-base">
                {toIndicDigits(mismatch.deficitCategoriesCount, lang)} {t.of}{" "}
                {toIndicDigits(completeHsnSummary.length, lang)}
              </span>
              <span className="text-[10px] text-muted-foreground block">
                {t.requirePurchaseBills}
              </span>
            </div>
          </div>

          {/* Itemized HSN Table */}
          <div className="space-y-3 mt-2">
            <div className="text-xs font-bold text-foreground flex items-center justify-between">
              <span>{t.itemizedBreakdown}</span>
              <span className="text-[11px] text-muted-foreground font-normal">
                {t.clickAddPurchaseHint}
              </span>
            </div>

            <div className="rounded-xl border border-border/80 overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/60 text-[11px]">
                  <TableRow>
                    <TableHead className="font-black">HSN (4-Digit) &amp; Product</TableHead>
                    <TableHead className="text-right font-black">Billed Outward</TableHead>
                    <TableHead className="text-right font-black">Inward Covered</TableHead>
                    <TableHead className="text-right font-black">Mismatch Qty</TableHead>
                    <TableHead className="text-right font-black">Required Bill ₹</TableHead>
                    <TableHead className="font-black">Whose Purchase Invoice?</TableHead>
                    <TableHead className="text-center font-black">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs divide-y divide-border/60">
                  {completeHsnSummary.map((item) => {
                    const spec = CANONICAL_HSN_VENDOR_SPECS[item.hsn4];
                    const isDef = item.status === "deficit" || item.soldQty > item.purchasedQty;
                    const diffQty = Math.max(0, item.soldQty - item.purchasedQty);
                    const avgRate =
                      item.soldQty > 0 ? item.soldValue / item.soldQty : spec?.unitRate || 250;
                    const requiredValue =
                      item.deficitValue > 0
                        ? item.deficitValue
                        : Math.round(diffQty * (spec?.unitRate || avgRate));

                    return (
                      <TableRow key={item.hsn4} className={cn(isDef ? "bg-[#e0f1f5]/50" : "")}>
                        {/* HSN & Name */}
                        <TableCell className="font-semibold py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-black text-primary text-xs">
                              {item.hsn4}
                            </span>
                            {isDef && (
                              <span className="h-1.5 w-1.5 rounded-full bg-[#006788] animate-pulse" />
                            )}
                          </div>
                          <div className="text-[11px] text-foreground font-medium">
                            {item.categoryName}
                          </div>
                          <div className="text-[10px] text-muted-foreground">Base: {item.unit}</div>
                        </TableCell>

                        {/* Sold Outward */}
                        <TableCell className="text-right py-3">
                          <div className="font-mono font-bold text-foreground">
                            {item.soldQty.toLocaleString("en-IN")} {item.unit}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {formatInr(item.soldValue)}
                          </div>
                        </TableCell>

                        {/* Purchased Inward */}
                        <TableCell className="text-right py-3">
                          <div className="font-mono font-bold text-foreground">
                            {item.purchasedQty.toLocaleString("en-IN")} {item.unit}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {formatInr(item.purchasedValue)}
                          </div>
                        </TableCell>

                        {/* Mismatch Quantity */}
                        <TableCell className="text-right py-3">
                          {isDef ? (
                            <span className="font-mono font-black text-[#015474]">
                              +{diffQty.toLocaleString("en-IN")} {item.unit}
                            </span>
                          ) : (
                            <span className="font-mono text-[#006788] font-semibold">Balanced</span>
                          )}
                        </TableCell>

                        {/* Required Purchase Bill Value */}
                        <TableCell className="text-right py-3">
                          {isDef && requiredValue > 0 ? (
                            <div className="font-mono font-black text-[#015474]">
                              {formatInr(requiredValue)}
                            </div>
                          ) : (
                            <span className="font-mono text-muted-foreground">₹0</span>
                          )}
                        </TableCell>

                        {/* Recommended Vendor / Supplier */}
                        <TableCell className="py-3 max-w-[240px]">
                          <div className="text-[11px] font-bold text-foreground">
                            {spec?.vendorType || "Product Supplier / Quarry"}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                            {spec?.suggestedVendors.slice(0, 2).join(", ") ||
                              "Verified Trade Vendor"}
                          </div>
                          <div className="text-[9.5px] text-muted-foreground/80 italic mt-0.5">
                            {spec?.statutoryAdvice}
                          </div>
                        </TableCell>

                        {/* Action */}
                        <TableCell className="text-center py-3">
                          <Link
                            to="/purchase-invoices/new"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs shrink-0 whitespace-nowrap cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Add Bill</span>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Dialog Footer Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/70 mt-2">
            <div className="text-xs text-muted-foreground">
              Directly recording purchase invoices updates the live statutory radar in real time.
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsMismatchModalOpen(false);
                  navigate({ to: "/purchase-invoices" });
                }}
                className="text-xs font-bold"
              >
                <FileText className="h-3.5 w-3.5 mr-1" />
                View All Purchase Invoices
              </Button>
              <Button
                size="sm"
                onClick={() => setIsMismatchModalOpen(false)}
                className="text-xs font-bold"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 2: FINANCIAL ANALYTICAL AI ADVISOR & DIRECT OFFSETS                */}
      {/* ========================================================================= */}
      <Dialog open={isAiStrategyModalOpen} onOpenChange={setIsAiStrategyModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div
                style={{ background: palette.activePillBg }}
                className="p-2 rounded-xl text-white shrink-0"
              >
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="font-display text-lg sm:text-xl font-black">
                  {t.advisorTitle}
                </DialogTitle>
                <DialogDescription className="text-xs">{t.advisorDesc}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Interactive Direct Agency Offset Simulator */}
          <div className="p-4 rounded-xl bg-[#e0f1f5]/60 border border-[#c9d1d4] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-white text-[#015474]">
                  <Banknote className="h-4 w-4" />
                </span>
                <span className="text-xs font-black uppercase text-foreground">
                  {t.simulateOffset}
                </span>
              </div>
              <Badge className="bg-[#006788] text-white text-[10px] font-bold">
                100% Tax Compliant
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">{t.offsetDesc}</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="p-2.5 rounded-lg bg-card/90 border border-border/60">
                <span className="text-[10px] text-muted-foreground font-bold uppercase block">
                  {t.customerCashAmt}
                </span>
                <div className="mt-1 font-mono font-black text-base text-foreground">
                  {toIndicDigits(formatInr(simOffsetAmount), lang)}
                </div>
                <div className="flex gap-1.5 mt-2">
                  {[50000, 120000, 250000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setSimOffsetAmount(amt)}
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-bold border cursor-pointer",
                        simOffsetAmount === amt
                          ? "bg-primary text-white border-primary"
                          : "bg-muted text-muted-foreground border-border",
                      )}
                    >
                      ₹{toIndicDigits(formatMoneyCompact(amt), lang)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-card/90 border border-border/60">
                <span className="text-[10px] text-muted-foreground font-bold uppercase block">
                  {t.ifDepositedPersonally}
                </span>
                <div className="mt-1 font-mono font-black text-base text-[#015474]">
                  -{toIndicDigits(formatInr(simOffsetAmount), lang)}
                </div>
                <span className="text-[10px] text-[#015474] block mt-1 font-medium">
                  {t.burnsLimit}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-card/90 border border-[#c9d1d4] bg-[#e0f1f5]/30">
                <span className="text-[10px] text-[#015474] font-bold uppercase block">
                  {t.withDirectOffset}
                </span>
                <div className="mt-1 font-mono font-black text-base text-[#006788]">
                  {toIndicDigits("₹0", lang)} Impact
                </div>
                <span className="text-[10px] text-[#015474] block mt-1 font-medium">
                  {toIndicDigits(formatInr(simOffsetAmount), lang)} {t.savesHeadroom}
                </span>
              </div>
            </div>
          </div>

          {/* AI Strategic Action Recommendations List */}
          <div className="space-y-3 mt-2">
            <div className="text-xs font-bold text-foreground">{t.strategicAiRecs}</div>

            <div className="space-y-2.5">
              {aiSuggestions.map((sug) => {
                const loc = localizeAiSuggestionText(sug, lang);
                return (
                  <div
                    key={sug.id}
                    className="p-3.5 rounded-xl border border-border/80 bg-card hover:bg-muted/40 transition-colors space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-xs font-black text-foreground">
                          {loc.title || sug.title}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9.5px] font-bold uppercase",
                          sug.priority === "critical"
                            ? "bg-[#e0f1f5] text-[#015474] border-[#c9d1d4]"
                            : sug.priority === "high"
                              ? "bg-[#e0f1f5] text-[#00597b] border-[#c9d1d4]"
                              : "bg-[#e0f1f5] text-[#006788] border-[#c9d1d4]",
                        )}
                      >
                        {sug.priority}
                      </Badge>
                    </div>
                    <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                      {loc.details || sug.details}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Partner Savings Account Audit */}
          <div className="p-3.5 rounded-xl bg-muted/50 border border-border/60 text-xs space-y-2">
            <span className="font-bold text-foreground block">{t.partnerAuditTitle}</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-2.5 rounded-lg bg-card border border-border/60">
                <div className="flex justify-between font-bold">
                  <span>{t.ramanSavings}</span>
                  <span className="font-mono">
                    {toIndicDigits(formatInr(raman?.cumulativeInflowsInr ?? 0), lang)}
                  </span>
                </div>
                <div className="text-[10.5px] text-muted-foreground mt-1">
                  {t.remainingHeadroom}{" "}
                  <strong className="text-foreground">
                    {toIndicDigits(formatInr(ramanHeadroom), lang)}
                  </strong>{" "}
                  ({toIndicDigits(ramanUsage, lang)}% {t.used})
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-card border border-border/60">
                <div className="flex justify-between font-bold">
                  <span>{t.rishiSavings}</span>
                  <span className="font-mono">
                    {toIndicDigits(formatInr(rishi?.cumulativeInflowsInr ?? 0), lang)}
                  </span>
                </div>
                <div className="text-[10.5px] text-muted-foreground mt-1">
                  {t.remainingHeadroom}{" "}
                  <strong className="text-foreground">
                    {toIndicDigits(formatInr(rishiHeadroom), lang)}
                  </strong>{" "}
                  ({toIndicDigits(rishiUsage, lang)}% {t.used})
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/70 mt-2">
            <div className="text-xs text-muted-foreground">
              Always use direct vendor payment slips or agency bank transfer receipts for audit
              defense.
            </div>

            <Button
              size="sm"
              onClick={() => setIsAiStrategyModalOpen(false)}
              className="text-xs font-bold"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

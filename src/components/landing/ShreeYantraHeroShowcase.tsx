import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, Check, ShieldCheck, Eye, Flame, ArrowRight, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { ShreeYantraDialog } from "./ShreeYantraDialog";

const SHREE_YANTRA_TEXTS = {
  en: {
    privilegeUnlocked: "✓ PRIVILEGE UNLOCKED",
    titlePrefix: "Get a Certified Sacred 3D Shree Yantra",
    titleHighlight: "Worth ₹14,999",
    titleSuffix: "With Your Order",
    premakeSubtitle:
      "Pre-make 100% payment to avail 5% discount + unlock this handcrafted divine blessing!",
    description:
      "At Stone Tech, we believe timeless stone craftsmanship and sacred geometry share the same eternal soul. To honor patrons creating extraordinary homes, villas, and mandirs, we present this certified 3D multi-layered Shree Yantra as an auspicious gift on stone product orders of ₹1 Lakh and above.",
    sacred3D: "Sacred 3D Geometry",
    tapToZoom: "Tap to zoom",
    doublePrivilege: "Double Celebration Privilege:",
    privilege1: "Flat 5% Instant Advance Payment Discount",
    privilege2Title: "FREE Certified 3D Shree Yantra (Worth ₹14,999)",
    privilege2Subtitle: "Gifted on stone product purchases exceeding ₹1,00,000 (₹1 Lakh+)",
    claimedButton: "5% Off + Free Shree Yantra Claimed",
    claimButton: "Claim 5% Discount + Free Shree Yantra",
    thresholdNote: "Shree Yantra unlocked on ordered stone product value > ₹1,00,000 (₹1 Lakh+)",
    readMore: "Read more — Sacred geometry specs, craftsmanship & terms",
    showLess: "Show less offer details",
    pillar1Title: "🕉️ Sacred Form",
    pillar1Desc: "9 interlocking triangles creating 43 sub-triangles for spiritual resonance.",
    pillar2Title: "🪵 Layered Wood",
    pillar2Desc: "Precision CNC relief in seasoned natural hardwood with multi-tier depth.",
    pillar3Title: "📜 Certified",
    pillar3Desc: "Includes official authenticity certificate and luxury gift packaging.",
    termsTitle: "* Terms & Conditions:",
    termsDesc:
      "The complimentary certified Shree Yantra (worth ₹14,999) is applicable on stone product purchase value exceeding ₹1,00,000 (excludes site installation labour and chemical/adhesive charges). 5% prepayment discount is applied upon quotation approval with 100% advance payment.",
    inspectButton: "Inspect Sacred Geometry Details (High-Res 3D)",
    showLessBtn: "Show less ▴",
    bothRegistered:
      "🎉 Both privileges are registered! Complete the estimate form on the right to lock in your quotation.",
  },
  hi: {
    privilegeUnlocked: "✓ विशेषाधिकार अनलॉक",
    titlePrefix: "ऑर्डर के साथ प्रमाणित पवित्र 3D श्री यंत्र प्राप्त करें",
    titleHighlight: "मूल्य ₹14,999",
    titleSuffix: "",
    premakeSubtitle:
      "5% तत्काल छूट पाने और इस हस्तनिर्मित दिव्य आशीर्वाद को प्राप्त करने हेतु 100% अग्रिम भुगतान करें!",
    description:
      "स्टोन टेक में, हमारा विश्वास है कि प्राकृतिक पत्थर की कालातीत कारीगरी और पवित्र ज्यामिति एक ही आत्मा साझा करते हैं। असाधारण घरों, विला और मंदिरों का निर्माण करने वाले संरक्षकों के सम्मान में, हम ₹1 लाख और उससे अधिक के पत्थर उत्पादों के ऑर्डर पर यह प्रमाणित 3D बहुस्तरीय श्री यंत्र शुभ उपहार के रूप में भेंट करते हैं।",
    sacred3D: "पवित्र 3D ज्यामिति",
    tapToZoom: "बड़ा करके देखें",
    doublePrivilege: "दोहरा उत्सव विशेषाधिकार:",
    privilege1: "सपाट 5% तत्काल अग्रिम भुगतान छूट",
    privilege2Title: "मुफ़्त प्रमाणित 3D श्री यंत्र (मूल्य ₹14,999)",
    privilege2Subtitle: "₹1,00,000 (₹1 लाख+) से अधिक की स्टोन प्रोडक्ट खरीद पर उपहार स्वरूप",
    claimedButton: "5% छूट + मुफ़्त श्री यंत्र अनलॉक किया गया ✓",
    claimButton: "5% छूट + मुफ़्त श्री यंत्र प्राप्त करें",
    thresholdNote: "श्री यंत्र ₹1,00,000 (₹1 लाख+) मूल्य के स्टोन ऑर्डर पर अनलॉक होता है",
    readMore: "अधिक पढ़ें — पवित्र ज्यामिति विवरण, कारीगरी एवं शर्तें",
    showLess: "ऑफ़र विवरण कम करें",
    pillar1Title: "🕉️ पवित्र रूप",
    pillar1Desc: "आध्यात्मिक ऊर्जा के लिए 9 परस्पर जुड़े त्रिकोण जो 43 उप-त्रिकोण बनाते हैं।",
    pillar2Title: "🪵 स्तरित काष्ठ",
    pillar2Desc: "परिशुद्ध सीएनसी नक्काशी, प्राकृतिक कठोर लकड़ी में बहुस्तरीय गहराई के साथ।",
    pillar3Title: "📜 प्रमाणित",
    pillar3Desc: "आधिकारिक प्रामाणिकता प्रमाणपत्र और लक्जरी उपहार पैकेजिंग शामिल है।",
    termsTitle: "* नियम एवं शर्तें:",
    termsDesc:
      "मानार्थ प्रमाणित श्री यंत्र (मूल्य ₹14,999) ₹1,00,000 से अधिक के पत्थर उत्पाद खरीद मूल्य पर लागू है (साइट इंस्टॉलेशन लेबर और केमिकल/चिपकने वाले शुल्क शामिल नहीं हैं)। 100% अग्रिम भुगतान के साथ कोटेशन अनुमोदन पर 5% पूर्व-भुगतान छूट लागू होती है।",
    inspectButton: "पवित्र ज्यामिति विवरण देखें (उच्च-रिज़ॉल्यूशन 3D)",
    showLessBtn: "कम दिखाएं ▴",
    bothRegistered:
      "🎉 दोनों विशेषाधिकार पंजीकृत हैं! अपना कोटेशन सुरक्षित करने के लिए दाईं ओर का अनुमान फॉर्म पूरा करें।",
  },
  gu: {
    privilegeUnlocked: "✓ વિશેષાધિકાર અનલૉક",
    titlePrefix: "ઓર્ડર સાથે પ્રમાણિત પવિત્ર 3D શ્રી યંત્ર મેળવો",
    titleHighlight: "મૂલ્ય ₹14,999",
    titleSuffix: "",
    premakeSubtitle:
      "5% ઇન્સ્ટન્ટ ડિસ્કાઉન્ટ મેળવવા અને આ હસ્તનિર્મિત દિવ્ય આશીર્વાદ અનલૉક કરવા 100% એડવાન્સ ચુકવણી કરો!",
    description:
      "સ્ટોન ટેક ખાતે, અમે માનીએ છીએ કે કાલાતીત પથ્થર કારીગરી અને પવિત્ર ભૂમિતિ એક જ શાશ્વત આત્મા ધરાવે છે. અસાધારણ ઘરો, વિલા અને મંદિરો બનાવતા મહાનુભાવોના સન્માનમાં, અમે ₹1 લાખ કે તેથી વધુના સ્ટોન પ્રોડક્ટ્સના ઓર્ડર પર આ સર્ટિફાઇડ 3D મલ્ટી-લેયર્ડ શ્રી યંત્ર શુભ ભેટ તરીકે અર્પણ કરીએ છીએ.",
    sacred3D: "પવિત્ર 3D ભૂમિતિ",
    tapToZoom: "મોટું જોવા ટેપ કરો",
    doublePrivilege: "ડબલ સેલિબ્રેશન લાભ:",
    privilege1: "ફ્લેટ 5% તાત્કાલિક એડવાન્સ પેમેન્ટ ડિસ્કાઉન્ટ",
    privilege2Title: "મફત સર્ટિફાઇડ 3D શ્રી યંત્ર (મૂલ્ય ₹14,999)",
    privilege2Subtitle: "₹1,00,000 (₹1 લાખ+) થી વધુની સ્ટોન પ્રોડક્ટ ખરીદી પર ભેટ",
    claimedButton: "5% ડિસ્કાઉન્ટ + મફત શ્રી યંત્ર નોંધાયું ✓",
    claimButton: "5% ડિસ્કાઉન્ટ + મફત શ્રી યંત્ર મેળવો",
    thresholdNote: "શ્રી યંત્ર ₹1,00,000 (₹1 લાખ+) મૂલ્યના ઓર્ડર પર અનલૉક થાય છે",
    readMore: "વધુ વાંચો — પવિત્ર ભૂમિતિ વિગતો, કારીગરી અને શરતો",
    showLess: "ઓફર વિગતો ઓછી કરો",
    pillar1Title: "🕉️ પવિત્ર સ્વરૂપ",
    pillar1Desc: "આધ્યાત્મિક ઊર્જા માટે 9 પરસ્પર જોડાયેલા ત્રિકોણ જે 43 ઉપ-ત્રિકોણ બનાવે છે.",
    pillar2Title: "🪵 લાકડાનું સ્તરીકરણ",
    pillar2Desc: "કુદરતી મજબૂત લાકડામાં મલ્ટી-લેયર ઊંડાણ સાથે ચોક્કસ CNC કોતરણી.",
    pillar3Title: "📜 પ્રમાણિત",
    pillar3Desc: "સત્તાવાર અધિકૃતતા પ્રમાણપત્ર અને લક્ઝરી ગિફ્ટ પેકેજિંગ શામેલ છે.",
    termsTitle: "* નિયમો અને શરતો:",
    termsDesc:
      "મફત સર્ટિફાઇડ શ્રી યંત્ર (મૂલ્ય ₹14,999) ₹1,00,000 થી વધુની સ્ટોન પ્રોડક્ટ ખરીદી પર લાગુ થાય છે (સાઇટ ઇન્સ્ટોલેશન મજૂરી અને કેમિકલ ચાર્જ શામેલ નથી). 100% એડવાન્સ પેમેન્ટ સાથે ક્વોટેશન મંજૂરી પર 5% પ્રિ-પેમેન્ટ ડિસ્કાઉન્ટ લાગુ થાય છે.",
    inspectButton: "પવિત્ર ભૂમિતિ વિગતો જુઓ (હાઇ-રિઝોલ્યુશન 3D)",
    showLessBtn: "ઓછું જુઓ ▴",
    bothRegistered:
      "🎉 બંને લાભો નોંધાયા છે! તમારું ક્વોટેશન નિશ્ચિત કરવા માટે જમણી બાજુનું ફોર્મ ભરો.",
  },
};

export interface ShreeYantraHeroShowcaseProps {
  isClaimed: boolean;
  onToggleClaim: () => void;
  className?: string;
  lang?: "en" | "hi" | "gu";
}

export function ShreeYantraHeroShowcase({
  isClaimed,
  onToggleClaim,
  className,
  lang: propLang,
}: ShreeYantraHeroShowcaseProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { i18n } = useTranslation();
  const lang = propLang || ((i18n.language?.substring(0, 2) || "en") as "en" | "hi" | "gu");
  const t = SHREE_YANTRA_TEXTS[lang] || SHREE_YANTRA_TEXTS.en;

  return (
    <>
      <div
        className={cn(
          "relative rounded-2xl border-2 transition-all duration-300 p-4 sm:p-5 shadow-lg overflow-hidden group",
          isClaimed
            ? "border-emerald-500 bg-gradient-to-br from-emerald-500/10 via-amber-500/5 to-teal-500/10 dark:from-emerald-950/40 dark:via-stone-900/90 dark:to-teal-950/40 ring-2 ring-emerald-500/40"
            : "border-amber-400/80 bg-gradient-to-br from-amber-500/10 via-stone-50/70 to-emerald-500/10 dark:from-amber-950/30 dark:via-stone-900/90 dark:to-emerald-950/30 hover:border-amber-500 ring-1 ring-amber-400/30",
          className,
        )}
      >
        {/* Ambient warm golden glow in background */}
        <div className="absolute top-0 right-0 w-60 h-60 bg-gradient-to-br from-amber-400/20 via-amber-500/10 to-transparent rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-emerald-400/15 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-3.5">
          {isClaimed && (
            <div className="flex justify-end">
              <Badge className="bg-emerald-600 text-white font-extrabold text-[10px] sm:text-[11px] px-2.5 py-0.5 tracking-wider animate-in fade-in shadow-xs">
                {t.privilegeUnlocked}
              </Badge>
            </div>
          )}

          {/* 1. Headline & Subtitle */}
          <div className="space-y-1.5 text-left">
            <h3 className="text-lg sm:text-xl lg:text-[22px] font-serif font-bold text-foreground tracking-tight leading-snug">
              {t.titlePrefix}{" "}
              <span className="text-amber-600 dark:text-amber-400 underline decoration-amber-400/60 underline-offset-4">
                {t.titleHighlight}
              </span>{" "}
              {t.titleSuffix}
            </h3>

            <p className="font-cursive text-base sm:text-lg text-emerald-700 dark:text-emerald-400 font-bold">
              {t.premakeSubtitle}
            </p>

            <p className="text-xs text-muted-foreground leading-relaxed">{t.description}</p>
          </div>

          {/* 2. Compact Core Section: Artwork Photo + Dual Benefits + Primary Action */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 sm:gap-4 items-center">
            {/* Left: Masterpiece Artwork Frame */}
            <div className="sm:col-span-5 flex flex-col items-center justify-center">
              <div
                onClick={() => setModalOpen(true)}
                className="group/img relative rounded-xl overflow-hidden border-2 border-amber-400/80 bg-stone-950 shadow-md hover:shadow-amber-500/30 hover:border-amber-400 transition-all duration-300 cursor-pointer w-full max-w-[190px] aspect-square flex items-center justify-center"
                title={t.tapToZoom}
              >
                <img
                  src="/images/shree-yantra.jpg"
                  alt="Certified Handcrafted 3D Sacred Shree Yantra Showcase"
                  className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500"
                  loading="eager"
                />

                {/* Bottom Inspection Plaque */}
                <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-stone-950/95 via-stone-950/80 to-transparent flex items-center justify-between text-[10px] text-amber-200">
                  <span className="font-bold flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-amber-400" />
                    {t.sacred3D}
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-amber-300 font-semibold group-hover/img:underline">
                    <Eye className="h-2.5 w-2.5" />
                    {t.tapToZoom}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Privilege Highlights & Claim Button */}
            <div className="sm:col-span-7 flex flex-col justify-between space-y-2.5">
              <div className="p-3 rounded-xl border border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-amber-500/5 to-teal-500/10 dark:from-emerald-950/40 dark:via-stone-900/80 dark:to-teal-950/40 space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  <Flame className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                  {t.doublePrivilege}
                </div>

                <div className="space-y-1.5 text-left">
                  <div className="flex items-center gap-2 bg-white/80 dark:bg-stone-900/80 p-2 rounded-lg border border-emerald-500/20 shadow-2xs">
                    <div className="h-5 w-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 font-black text-[10px]">
                      1
                    </div>
                    <span className="text-xs font-bold text-foreground">{t.privilege1}</span>
                  </div>

                  <div className="flex items-start gap-2 bg-white/80 dark:bg-stone-900/80 p-2 rounded-lg border border-amber-500/20 shadow-2xs">
                    <div className="h-5 w-5 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center shrink-0 font-black text-[10px] mt-0.5">
                      2
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-bold text-foreground">{t.privilege2Title}</span>
                      <span className="text-[10.5px] font-semibold text-amber-800 dark:text-amber-300 leading-tight mt-0.5">
                        {t.privilege2Subtitle}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Primary Claim Action Button */}
              <Button
                type="button"
                onClick={onToggleClaim}
                className={cn(
                  "w-full font-bold text-xs h-10 px-4 gap-1.5 shadow-md cursor-pointer transition-all",
                  isClaimed
                    ? "bg-emerald-700 hover:bg-emerald-800 text-white"
                    : "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white hover:scale-[1.01]",
                )}
              >
                {isClaimed ? (
                  <>
                    <Check className="h-4 w-4 stroke-[3]" />
                    <span>{t.claimedButton}</span>
                  </>
                ) : (
                  <>
                    <Gift className="h-4 w-4" />
                    <span>{t.claimButton}</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </>
                )}
              </Button>

              {/* Value Threshold Note */}
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-[11px] text-muted-foreground font-medium pt-0.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>{t.thresholdNote}</span>
              </div>
            </div>
          </div>

          {/* 3. "Read More" Tab / Toggle Bar */}
          <div className="pt-0.5">
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-xl border border-amber-400/50 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-bold text-amber-900 dark:text-amber-200 transition-all cursor-pointer shadow-2xs group"
              aria-expanded={isExpanded}
            >
              <span>{isExpanded ? t.showLess : t.readMore}</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-amber-700 dark:text-amber-400 transition-transform duration-200 group-hover:translate-y-0.5",
                  isExpanded && "rotate-180 group-hover:-translate-y-0.5",
                )}
              />
            </button>
          </div>

          {/* 4. Expandable Detailed Section */}
          {isExpanded && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-3 pt-1 border-t border-amber-400/30">
              {/* Three Craftsmanship Pillars */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="p-2 sm:p-2.5 rounded-lg border border-border/80 bg-background/80 space-y-0.5 text-left">
                  <div className="text-amber-600 dark:text-amber-400 font-bold text-[11px] uppercase tracking-wide flex items-center gap-1">
                    {t.pillar1Title}
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-tight">
                    {t.pillar1Desc}
                  </p>
                </div>

                <div className="p-2 sm:p-2.5 rounded-lg border border-border/80 bg-background/80 space-y-0.5 text-left">
                  <div className="text-amber-600 dark:text-amber-400 font-bold text-[11px] uppercase tracking-wide flex items-center gap-1">
                    {t.pillar2Title}
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-tight">
                    {t.pillar2Desc}
                  </p>
                </div>

                <div className="p-2 sm:p-2.5 rounded-lg border border-border/80 bg-background/80 space-y-0.5 text-left">
                  <div className="text-amber-600 dark:text-amber-400 font-bold text-[11px] uppercase tracking-wide flex items-center gap-1">
                    {t.pillar3Title}
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-tight">
                    {t.pillar3Desc}
                  </p>
                </div>
              </div>

              {/* Detailed Terms & Conditions Footnote Box */}
              <div className="p-2.5 sm:p-3 rounded-lg bg-muted/60 border border-border text-[11px] text-muted-foreground text-left space-y-0.5">
                <span className="font-bold text-foreground block">{t.termsTitle}</span>
                <p className="leading-relaxed">{t.termsDesc}</p>
              </div>

              {/* Inspect Button & Close Toggle */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-0.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(true)}
                  className="w-full sm:flex-1 font-semibold text-xs h-9 px-4 border-amber-400/60 hover:bg-amber-500/10 text-stone-800 dark:text-amber-200 cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5 mr-1.5 text-amber-600 dark:text-amber-400" />
                  <span>{t.inspectButton}</span>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsExpanded(false)}
                  className="w-full sm:w-auto text-xs text-muted-foreground hover:text-foreground h-9"
                >
                  {t.showLessBtn}
                </Button>
              </div>
            </div>
          )}

          {isClaimed && (
            <p className="font-cursive text-emerald-700 dark:text-emerald-300 text-sm font-bold pt-0.5 animate-in fade-in duration-200 text-left">
              {t.bothRegistered}
            </p>
          )}
        </div>
      </div>

      {/* Lightbox / Details Modal */}
      <ShreeYantraDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        onClaimOffer={() => {
          if (!isClaimed) onToggleClaim();
        }}
        isClaimed={isClaimed}
      />
    </>
  );
}

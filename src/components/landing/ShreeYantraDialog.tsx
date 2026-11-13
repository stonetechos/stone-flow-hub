import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check, Gift, ShieldCheck, Flame, ExternalLink, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const DIALOG_TEXTS = {
  en: {
    celebrationBadge: "Special Celebration Privilege",
    giftBadge: "Complimentary Gift · Worth ₹14,999",
    claimedBadge: "✓ PRIVILEGE CLAIMED",
    title: "Certified Handcrafted 3D Sacred Shree Yantra",
    subtitle:
      "An auspicious architectural masterpiece designed to invite prosperity and positive energy into your home, villa, or mandir.",
    mrpFree: "MRP ₹14,999 · FREE",
    certifiedGeometry: "Certified Sacred Geometry",
    clickToReset: "Click to reset",
    clickToZoom: "Click to zoom",
    caption: "✨ Handcrafted multi-layered natural hardwood with sacred central bindu",
    privilegeBoxTitle: "Your 2 Exclusive Prepayment Privileges:",
    privilege1Title: "Flat 5% Instant Cash Discount",
    privilege1Desc:
      "Pre-make 100% advance payment upon quotation confirmation to lock in a direct 5% deduction on your entire order.",
    privilege2Title: "FREE Certified Shree Yantra (Worth ₹14,999)",
    privilege2Desc:
      "Delivered safely with your stone order with every purchase exceeding ₹1 Lakh (Product amount)*.",
    craftsmanshipTitle: "Masterpiece Craftsmanship Details",
    craftsmanship1Title: "Authentic Maha Meru Geometry:",
    craftsmanship1Desc:
      "9 interlocking primary triangles forming 43 sub-triangles and sacred lotus petals.",
    craftsmanship2Title: "Layered Hardwood Relief:",
    craftsmanship2Desc:
      "High-precision CNC carving in seasoned natural wood, hand-finished with warm teak patina.",
    craftsmanship3Title: "Certified & Consecrated:",
    craftsmanship3Desc:
      "Includes Certificate of Sacred Geometry Authenticity and protective luxury packaging.",
    termsTitle: "* Terms & Conditions:",
    termsDesc:
      "The complimentary Shree Yantra (worth ₹14,999) is applicable on stone product purchase value exceeding ₹1,00,000 (excludes site installation and chemical/adhesive charges). Prepayment discount applies when 100% advance payment is completed upon quotation approval.",
    claimBtn: "Claim 5% Discount + Free Shree Yantra",
    claimedBtn: "Privilege Already Claimed",
    closeBtn: "Close",
  },
  hi: {
    celebrationBadge: "विशेष उत्सव विशेषाधिकार",
    giftBadge: "मानार्थ उपहार · मूल्य ₹14,999",
    claimedBadge: "✓ विशेषाधिकार अनलॉक",
    title: "प्रमाणित हस्तनिर्मित 3D पवित्र श्री यंत्र",
    subtitle:
      "आपके घर, विला या मंदिर में समृद्धि और सकारात्मक ऊर्जा को आमंत्रित करने के लिए तैयार की गई एक शुभ वास्तुशिल्प कृति।",
    mrpFree: "मूल्य ₹14,999 · मुफ़्त",
    certifiedGeometry: "प्रमाणित पवित्र ज्यामिति",
    clickToReset: "रीसेट करने हेतु क्लिक करें",
    clickToZoom: "ज़ूम करने हेतु क्लिक करें",
    caption: "✨ पवित्र केंद्रीय बिंदु के साथ हस्तनिर्मित बहुस्तरीय प्राकृतिक दृढ़ काष्ठ",
    privilegeBoxTitle: "आपके 2 विशेष अग्रिम भुगतान विशेषाधिकार:",
    privilege1Title: "सपाट 5% तत्काल नकद छूट",
    privilege1Desc:
      "अपने पूरे ऑर्डर पर सीधी 5% छूट सुरक्षित करने के लिए कोटेशन की पुष्टि पर 100% अग्रिम भुगतान करें।",
    privilege2Title: "मुफ़्त प्रमाणित श्री यंत्र (मूल्य ₹14,999)",
    privilege2Desc:
      "₹1 लाख (उत्पाद राशि)* से अधिक की प्रत्येक पत्थर खरीद पर आपके ऑर्डर के साथ सुरक्षित रूप से वितरित।",
    craftsmanshipTitle: "उत्कृष्ट कारीगरी विवरण",
    craftsmanship1Title: "प्रामाणिक महा मेरु ज्यामिति:",
    craftsmanship1Desc:
      "9 परस्पर जुड़े प्राथमिक त्रिकोण जो 43 उप-त्रिकोण और पवित्र कमल की पंखुड़ियां बनाते हैं।",
    craftsmanship2Title: "स्तरित दृढ़ काष्ठ नक्काशी:",
    craftsmanship2Desc:
      "प्राकृतिक परिपक्व लकड़ी में उच्च परिशुद्धता सीएनसी नक्काशी, गर्म टीक पेटिना के साथ हस्तनिर्मित फिनिश।",
    craftsmanship3Title: "प्रमाणित एवं प्रतिष्ठित:",
    craftsmanship3Desc:
      "पवित्र ज्यामिति प्रामाणिकता का प्रमाणपत्र और सुरक्षात्मक लक्जरी उपहार पैकेजिंग शामिल है।",
    termsTitle: "* नियम एवं शर्तें:",
    termsDesc:
      "मानार्थ श्री यंत्र (मूल्य ₹14,999) ₹1,00,000 से अधिक के पत्थर उत्पाद खरीद मूल्य पर लागू है (साइट स्थापना और रासायनिक/चिपकने वाले शुल्क शामिल नहीं हैं)। कोटेशन अनुमोदन पर 100% अग्रिम भुगतान पूरा होने पर पूर्व-भुगतान छूट लागू होती है।",
    claimBtn: "5% छूट + मुफ़्त श्री यंत्र प्राप्त करें",
    claimedBtn: "विशेषाधिकार पहले से पंजीकृत है",
    closeBtn: "बंद करें",
  },
  gu: {
    celebrationBadge: "વિશેષ ઉત્સવ લાભ",
    giftBadge: "વિશેષ ભેટ · મૂલ્ય ₹14,999",
    claimedBadge: "✓ વિશેષાધિકાર અનલૉક",
    title: "સર્ટિફાઇડ હસ્તનિર્મિત 3D પવિત્ર શ્રી યંત્ર",
    subtitle:
      "તમારા ઘર, વિલા અથવા મંદિરમાં સમૃદ્ધિ અને સકારાત્મક ઊર્જા લાવવા માટે રચાયેલ એક શુભ સ્થાપત્ય કૃતિ.",
    mrpFree: "મૂલ્ય ₹14,999 · મફત",
    certifiedGeometry: "પ્રમાણિત પવિત્ર ભૂમિતિ",
    clickToReset: "રીસેટ કરવા ક્લિક કરો",
    clickToZoom: "મોટું કરવા ક્લિક કરો",
    caption: "✨ પવિત્ર કેન્દ્રીય બિંદુ સાથે હસ્તનિર્મિત મલ્ટી-લેયર કુદરતી લાકડું",
    privilegeBoxTitle: "તમારા 2 વિશિષ્ટ એડવાન્સ પેમેન્ટ લાભો:",
    privilege1Title: "ફ્લેટ 5% તાત્કાલિક કેશ ડિસ્કાઉન્ટ",
    privilege1Desc:
      "તમારા સમગ્ર ઓર્ડર પર સીધું 5% ડિસ્કાઉન્ટ નિશ્ચિત કરવા ક્વોટેશન મંજૂરી પર 100% એડવાન્સ પેમેન્ટ કરો.",
    privilege2Title: "મફત સર્ટિફાઇડ શ્રી યંત્ર (મૂલ્ય ₹14,999)",
    privilege2Desc:
      "₹1 લાખથી વધુની કોઈપણ સ્ટોન પ્રોડક્ટ ખરીદી પર તમારા ઓર્ડર સાથે સુરક્ષિત રીતે ડિલિવર કરવામાં આવશે*.",
    craftsmanshipTitle: "ઉત્કૃષ્ટ કારીગરી વિગતો",
    craftsmanship1Title: "અધિકૃત મહા મેરુ ભૂમિતિ:",
    craftsmanship1Desc:
      "9 પરસ્પર જોડાયેલા ત્રિકોણ જે 43 ઉપ-ત્રિકોણ અને પવિત્ર કમળની પાંખડીઓ બનાવે છે.",
    craftsmanship2Title: "લેયર્ડ હાર્ડવુડ કોતરણી:",
    craftsmanship2Desc:
      "મજબૂત કુદરતી લાકડામાં હાઇ-પ્રિસિઝન CNC કોતરણી, ઉત્કૃષ્ટ સાગવુડ ફિનિશિંગ સાથે.",
    craftsmanship3Title: "પ્રમાણિત અને પ્રતિષ્ઠિત:",
    craftsmanship3Desc:
      "પવિત્ર ભૂમિતિ અધિકૃતતાનું પ્રમાણપત્ર અને સુરક્ષિત લક્ઝરી ગિફ્ટ પેકેજિંગ સામેલ છે.",
    termsTitle: "* નિયમો અને શરતો:",
    termsDesc:
      "મફત શ્રી યંત્ર (મૂલ્ય ₹14,999) ₹1,00,000 થી વધુની સ્ટોન પ્રોડક્ટ ખરીદી પર લાગુ પડે છે (સાઇટ ઇન્સ્ટોલેશન અને કેમિકલ ચાર્જ શામેલ નથી). ક્વોટેશન મંજૂરી પર 100% એડવાન્સ પેમેન્ટ પૂર્ણ થવા પર પ્રિ-પેમેન્ટ ડિસ્કાઉન્ટ લાગુ થાય છે.",
    claimBtn: "5% ડિસ્કાઉન્ટ + મફત શ્રી યંત્ર મેળવો",
    claimedBtn: "લાભ પહેલેથી જ નોંધાયેલ છે",
    closeBtn: "બંધ કરો",
  },
};

export interface ShreeYantraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClaimOffer?: () => void;
  isClaimed?: boolean;
}

export function ShreeYantraDialog({
  open,
  onOpenChange,
  onClaimOffer,
  isClaimed = false,
}: ShreeYantraDialogProps) {
  const [imageZoomed, setImageZoomed] = useState(false);
  const { i18n } = useTranslation();
  const lang = (i18n.language?.substring(0, 2) || "en") as "en" | "hi" | "gu";
  const t = DIALOG_TEXTS[lang] || DIALOG_TEXTS.en;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-background border-amber-500/40 shadow-2xl rounded-2xl max-h-[92vh] flex flex-col">
        {/* Top Gold Foil Bar */}
        <div className="h-2 w-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 shrink-0" />

        <div className="overflow-y-auto p-4 sm:p-6 space-y-6">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-black uppercase text-[11px] tracking-wider px-2.5 py-0.5 shadow-xs border border-amber-400/50">
                <Sparkles className="h-3 w-3 mr-1 fill-stone-950 inline" />
                {t.celebrationBadge}
              </Badge>
              <Badge
                variant="outline"
                className="border-emerald-500/50 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 font-bold text-[11px] px-2.5 py-0.5"
              >
                <Gift className="h-3 w-3 mr-1 inline" />
                {t.giftBadge}
              </Badge>
              {isClaimed && (
                <Badge className="bg-emerald-600 text-white font-bold text-[11px] px-2.5 py-0.5 animate-in fade-in">
                  {t.claimedBadge}
                </Badge>
              )}
            </div>

            <DialogTitle className="text-xl sm:text-2xl font-serif font-bold text-foreground tracking-tight leading-snug">
              {t.title}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {t.subtitle}
            </DialogDescription>
          </DialogHeader>

          {/* Main 2-Column Content */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 items-start">
            {/* Left: High-Res Photo Showcase */}
            <div className="md:col-span-6 space-y-2">
              <div
                onClick={() => setImageZoomed(!imageZoomed)}
                className="group relative rounded-xl overflow-hidden border-2 border-amber-400/50 bg-stone-950 shadow-lg cursor-zoom-in transition-all duration-300 hover:border-amber-400 hover:shadow-amber-500/20"
              >
                <img
                  src="/images/shree-yantra.jpg"
                  alt={t.title}
                  className={cn(
                    "w-full h-auto object-cover transition-transform duration-500",
                    imageZoomed ? "scale-125" : "group-hover:scale-105",
                  )}
                  loading="eager"
                />
                <div className="absolute top-2.5 right-2.5">
                  <Badge className="bg-amber-500/95 text-stone-950 font-extrabold text-[10px] tracking-wide shadow-md backdrop-blur-xs">
                    {t.mrpFree}
                  </Badge>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-stone-950/90 via-stone-950/50 to-transparent flex items-center justify-between text-[11px] text-amber-200">
                  <span className="font-semibold flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
                    {t.certifiedGeometry}
                  </span>
                  <span className="text-[10px] opacity-90 underline underline-offset-2">
                    {imageZoomed ? t.clickToReset : t.clickToZoom}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground text-center font-cursive text-emerald-700 dark:text-emerald-400 text-sm">
                {t.caption}
              </p>
            </div>

            {/* Right: Specifications & Double Privilege Details */}
            <div className="md:col-span-6 space-y-4">
              {/* Double Privilege Summary Box */}
              <div className="p-3.5 rounded-xl border border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-amber-500/5 to-teal-500/10 dark:from-emerald-950/40 dark:via-stone-900/60 dark:to-teal-950/40 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                  <Flame className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                  {t.privilegeBoxTitle}
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <div className="h-5 w-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 font-bold text-[10px] mt-0.5">
                      1
                    </div>
                    <div>
                      <span className="font-bold text-foreground">{t.privilege1Title}</span>
                      <p className="text-muted-foreground text-[11px]">{t.privilege1Desc}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <div className="h-5 w-5 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center shrink-0 font-bold text-[10px] mt-0.5">
                      2
                    </div>
                    <div>
                      <span className="font-bold text-foreground">{t.privilege2Title}</span>
                      <p className="text-muted-foreground text-[11px]">{t.privilege2Desc}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Artwork Highlights */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t.craftsmanshipTitle}
                </h4>
                <ul className="text-xs space-y-1.5 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-foreground">{t.craftsmanship1Title}</strong>{" "}
                      {t.craftsmanship1Desc}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-foreground">{t.craftsmanship2Title}</strong>{" "}
                      {t.craftsmanship2Desc}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-foreground">{t.craftsmanship3Title}</strong>{" "}
                      {t.craftsmanship3Desc}
                    </span>
                  </li>
                </ul>
              </div>

              {/* Asterisk Terms & Conditions */}
              <div className="p-2.5 rounded-lg bg-muted/60 border border-border text-[11px] text-muted-foreground space-y-1">
                <span className="font-bold text-foreground block">{t.termsTitle}</span>
                <p className="leading-relaxed">{t.termsDesc}</p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    if (onClaimOffer) onClaimOffer();
                    onOpenChange(false);
                  }}
                  className={cn(
                    "w-full font-bold text-xs h-10 px-5 gap-2 shadow-md transition-all cursor-pointer",
                    isClaimed
                      ? "bg-emerald-700 hover:bg-emerald-800 text-white"
                      : "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white hover:scale-[1.02]",
                  )}
                >
                  {isClaimed ? (
                    <>
                      <Check className="h-4 w-4 stroke-[3]" />
                      <span>{t.claimedBtn}</span>
                    </>
                  ) : (
                    <>
                      <Gift className="h-4 w-4" />
                      <span>{t.claimBtn}</span>
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="w-full sm:w-auto text-xs h-10 px-4 cursor-pointer"
                >
                  {t.closeBtn}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

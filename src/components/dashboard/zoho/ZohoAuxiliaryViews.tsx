import { Bell, Sparkles, BookOpen, Phone, CheckCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAnnouncements } from "./announcements-state";

const AUX_TEXTS = {
  en: {
    announcementsHeading: "System & Company Announcements",
    unread: "unread",
    allRead: "All Read",
    markAllAsRead: "Mark All as Read",
    markedAllSuccess: "All announcements marked as read",
    markedOneSuccess: "Marked announcement as read",
    markAsRead: "Mark as read",
    helpHeading: "Stone Tech OS Support & Help Centre",
    helpSubheading: "Guides, documentation, and technical support for STOS enterprise operations.",
    manualTitle: "User Manual",
    manualDesc:
      "Complete walkthrough of sales quotations, purchase orders, dispatch workflows, and inventory tracking.",
    shortcutsTitle: "Shortcuts & Search",
    shortcutsDescPart1: "Press ",
    shortcutsDescPart2: " anywhere to quickly search customers, invoices, and stone varieties.",
    supportTitle: "Support Desk",
    supportDesc:
      "Direct access to Vedora Vision technical team for custom reports, data migration, and assistance.",
  },
  hi: {
    announcementsHeading: "सिस्टम एवं कंपनी घोषणाएं",
    unread: "अपठित",
    allRead: "सभी पढ़े गए",
    markAllAsRead: "सभी को पढ़ा हुआ चिह्नित करें",
    markedAllSuccess: "सभी घोषणाएं पढ़ी हुई चिह्नित की गईं",
    markedOneSuccess: "घोषणा को पढ़ा हुआ चिह्नित किया गया",
    markAsRead: "पढ़ा हुआ चिह्नित करें",
    helpHeading: "स्टोन टेक ओएस सहायता एवं समर्थन केंद्र",
    helpSubheading: "स्टॉस उद्यम संचालन के लिए मार्गदर्शिकाएं, दस्तावेज़ीकरण और तकनीकी सहायता।",
    manualTitle: "उपयोगकर्ता नियमावली",
    manualDesc:
      "बिक्री कोटेशन, खरीद आदेश, डिस्पैच वर्कफ़्लो और इन्वेंट्री ट्रैकिंग का संपूर्ण वॉकथ्रू।",
    shortcutsTitle: "शॉर्टकट और खोज",
    shortcutsDescPart1: "ग्राहकों, चालानों और पत्थरों की किस्मों को तुरंत खोजने के लिए कहीं भी ",
    shortcutsDescPart2: " दबाएं।",
    supportTitle: "सपोर्ट डेस्क",
    supportDesc:
      "कस्टम रिपोर्ट, डेटा माइग्रेशन और सहायता के लिए वेदोरा विजन तकनीकी टीम से सीधा संपर्क।",
  },
  gu: {
    announcementsHeading: "સિસ્ટમ અને કંપની જાહેરાતો",
    unread: "ન વંચાયેલ",
    allRead: "બધા વંચાયેલ",
    markAllAsRead: "બધા વંચાયેલા તરીકે ચિહ્નિત કરો",
    markedAllSuccess: "બધી જાહેરાતો વંચાયેલી તરીકે ચિહ્નિત કરવામાં આવી",
    markedOneSuccess: "જાહેરાત વંચાયેલ તરીકે ચિહ્નિત કરી",
    markAsRead: "વંચાયેલ તરીકે ચિહ્નિત કરો",
    helpHeading: "સ્ટોન ટેક ઓએસ સહાય અને સપોર્ટ કેન્દ્ર",
    helpSubheading: "સ્ટૉસ એન્ટરપ્રાઇઝ કામગીરી માટે માર્ગદર્શિકાઓ, દસ્તાવેજીકરણ અને તકનીકી સપોર્ટ.",
    manualTitle: "વપરાશકર્તા માર્ગદર્શિકા",
    manualDesc:
      "વેચાણ ક્વોટેશન, ખરીદ ઓર્ડર, ડિસ્પેચ વર્કફ્લો અને ઇન્વેન્ટરી ટ્રેકિંગનું સંપૂર્ણ માર્ગદર્શન.",
    shortcutsTitle: "શૉર્ટકટ્સ અને શોધ",
    shortcutsDescPart1: "ગ્રાહકો, ઇન્વૉઇસ અને પથ્થરની જાતો ઝડપથી શોધવા માટે ગમે ત્યાં ",
    shortcutsDescPart2: " દબાવો.",
    supportTitle: "સપોર્ટ ડેસ્ક",
    supportDesc:
      "કસ્ટમ રિપોર્ટ્સ, ડેટા સ્થળાંતર અને સહાય માટે વેદોરા વિઝન ટેકનિકલ ટીમનો સીધો સંપર્ક.",
  },
};

const LOCALIZED_ANNOUNCEMENT_CONTENT: Record<
  string,
  {
    hi: { title: string; category: string; body: string; date: string };
    gu: { title: string; category: string; body: string; date: string };
  }
> = {
  "ann-01": {
    hi: {
      title: "कार्यकारी एवं वित्तीय संचालन डैशबोर्ड लाइव",
      category: "सिस्टम अपडेट",
      body: "कार्यकारी डैशबोर्ड को वास्तविक समय में प्राप्य, देय, मासिक नकदी प्रवाह, और उपार्जित बनाम नकद बिक्री व व्यय ट्रैकिंग सहित पूर्ण वित्तीय और परिचालन दृश्यता प्रदान करने के लिए अपडेट किया गया है।",
      date: "09 सित 2026",
    },
    gu: {
      title: "કાર્યકારી અને નાણાકીય કામગીરી ડેશબોર્ડ લાઇવ",
      category: "સિસ્ટમ અપડેટ",
      body: "કાર્યકારી ડેશબોર્ડને રીઅલ-ટાઇમમાં મળવાપાત્ર, ચૂકવવાપાત્ર, માસિક રોકડ પ્રવાહ અને વેચાણ-ખર્ચ ટ્રેકિંગ સહિત સંપૂર્ણ નાણાકીય અને ઓપરેશનલ પારદર્શિતા પ્રદાન કરવા માટે અપડેટ કરવામાં આવ્યું છે.",
      date: "09 સપ્ટે 2026",
    },
  },
  "ann-02": {
    hi: {
      title: "एचआर संचालन एवं पेरोल माइग्रेशन पूर्ण",
      category: "संचालन",
      body: "एचआर संचालन और कार्यबल बुद्धिमत्ता को 4 सुसंगत हबों में विलय कर दिया गया है: कर्मचारी, उपस्थिति एवं अवकाश, पेरोल, और कार्यबल बुद्धिमत्ता।",
      date: "09 सित 2026",
    },
    gu: {
      title: "એચઆર કામગીરી અને પગારપત્રક સ્થળાંતર પૂર્ણ",
      category: "કામગીરી",
      body: "એચઆર કામગીરી અને કર્મચારી ઇન્ટેલિજન્સને 4 એકીકૃત હબમાં મર્જ કરવામાં આવ્યા છે: કર્મચારીઓ, હાજરી અને રજા, પેરોલ અને વર્કફોર્સ ઇન્ટેલિજન્સ.",
      date: "09 સપ્ટે 2026",
    },
  },
  "ann-03": {
    hi: {
      title: "जीएसटी ई-वे बिल एवं डिस्पैच प्रोटोकॉल",
      category: "अनुपालन",
      body: "₹50,000 से अधिक के सभी बाह्य स्टोन डिस्पैच में वाहन गेट क्लीयरेंस से पहले मान्य ई-वे बिल नंबर और वाहन पंजीकरण शामिल होना अनिवार्य है।",
      date: "01 सित 2026",
    },
    gu: {
      title: "જીએસટી ઈ-વે બિલ અને ડિસ્પેચ પ્રોટોકોલ",
      category: "પાલન",
      body: "₹50,000થી વધુના તમામ આઉટવર્ડ સ્ટોન ડિસ્પેચમાં વાહન ગેટ ક્લિયરન્સ પહેલાં માન્ય ઈ-વે બિલ નંબર અને વાહન નોંધણી શામેલ હોવી ફરજિયાત છે.",
      date: "01 સપ્ટે 2026",
    },
  },
};

export function AnnouncementsView() {
  const { announcements, unreadCount, markAsRead, markAllAsRead } = useAnnouncements();
  const { i18n } = useTranslation();
  const lang = (i18n.language?.substring(0, 2) || "en") as "en" | "hi" | "gu";
  const t = AUX_TEXTS[lang] || AUX_TEXTS.en;

  const handleMarkAll = () => {
    markAllAsRead();
    toast.success(t.markedAllSuccess);
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <span>{t.announcementsHeading}</span>
          {unreadCount > 0 && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
              {unreadCount} {t.unread}
            </span>
          )}
        </h2>
        <Button
          variant="outline"
          size="sm"
          className="text-xs gap-1.5"
          onClick={handleMarkAll}
          disabled={unreadCount === 0}
        >
          <CheckCheck className="h-3.5 w-3.5 text-muted-foreground" />
          {unreadCount === 0 ? t.allRead : t.markAllAsRead}
        </Button>
      </div>

      <div className="space-y-3">
        {announcements.map((item) => {
          const loc =
            (lang === "hi" || lang === "gu") && LOCALIZED_ANNOUNCEMENT_CONTENT[item.id]
              ? LOCALIZED_ANNOUNCEMENT_CONTENT[item.id][lang]
              : null;
          const displayCategory = loc?.category || item.category;
          const displayTitle = loc?.title || item.title;
          const displayBody = loc?.body || item.body;
          const displayDate = loc?.date || item.date;

          return (
            <Card
              key={item.id}
              onClick={() => {
                if (item.unread) {
                  markAsRead(item.id);
                  toast.info(t.markedOneSuccess);
                }
              }}
              className={cn(
                "border border-border/80 shadow-xs transition-all",
                item.unread
                  ? "bg-cyan-50/20 dark:bg-cyan-950/10 border-cyan-200/80 ring-1 ring-cyan-500/20 cursor-pointer"
                  : "opacity-90",
              )}
            >
              <CardHeader className="p-5 pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {displayCategory}
                    </span>
                    {item.unread && (
                      <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" title="Unread" />
                    )}
                    <CardTitle className="text-sm font-semibold text-foreground">
                      {displayTitle}
                    </CardTitle>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{displayDate}</span>
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-1 text-xs text-muted-foreground leading-relaxed flex items-center justify-between gap-3">
                <span>{displayBody}</span>
                {item.unread && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsRead(item.id);
                      toast.info(t.markedOneSuccess);
                    }}
                    className="shrink-0 text-[11px] font-semibold text-cyan-700 hover:text-cyan-900 hover:underline dark:text-cyan-400"
                  >
                    {t.markAsRead}
                  </button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export function HelpView() {
  const { i18n } = useTranslation();
  const lang = (i18n.language?.substring(0, 2) || "en") as "en" | "hi" | "gu";
  const t = AUX_TEXTS[lang] || AUX_TEXTS.en;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <span>{t.helpHeading}</span>
        </h2>
        <p className="text-xs text-muted-foreground mt-1">{t.helpSubheading}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border border-border/80 p-4 space-y-2">
          <div className="h-8 w-8 rounded-md bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 flex items-center justify-center">
            <BookOpen className="h-4 w-4" />
          </div>
          <h3 className="font-semibold text-sm text-foreground">{t.manualTitle}</h3>
          <p className="text-xs text-muted-foreground">{t.manualDesc}</p>
        </Card>

        <Card className="border border-border/80 p-4 space-y-2">
          <div className="h-8 w-8 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Sparkles className="h-4 w-4" />
          </div>
          <h3 className="font-semibold text-sm text-foreground">{t.shortcutsTitle}</h3>
          <p className="text-xs text-muted-foreground">
            {t.shortcutsDescPart1}
            <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">Cmd + K</kbd>
            {t.shortcutsDescPart2}
          </p>
        </Card>

        <Card className="border border-border/80 p-4 space-y-2">
          <div className="h-8 w-8 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Phone className="h-4 w-4" />
          </div>
          <h3 className="font-semibold text-sm text-foreground">{t.supportTitle}</h3>
          <p className="text-xs text-muted-foreground">{t.supportDesc}</p>
        </Card>
      </div>
    </div>
  );
}

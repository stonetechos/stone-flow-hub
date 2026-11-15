/**
 * STOS — Notification centre.
 *
 * Was presentation-only against `MOCK_NOTIFICATIONS` (see git history for
 * that version). Now backed by `public.notifications` via
 * `src/lib/notifications/centre.ts`, with realtime INSERT updates and
 * durable read-state. Groups notifications into Unread / Today / Yesterday
 * / All tabs, same UX as before. Renders each row with tier styling
 * (`TIER_TONE`) so Critical is visually distinct from Info/Important,
 * matching Goal 3's "urgent notifications use different styling"
 * requirement — the centre is also where a Critical toast's content
 * survives after it auto-dismisses (see `src/lib/notifications/toast.ts`).
 *
 * Degrades to a normal empty state (not an error) if
 * `supabase/migrations/20260728120000_in_app_notifications_centre.sql`
 * hasn't been applied yet — see centre.ts's `isMissingTableError` handling.
 *
 * VIE foundation sprint (2026-07-28): a new row landing here now also fires
 * a live toast via the Desktop notification channel
 * (`lib/notifications/channels/`), not just a silent list refresh — closing
 * a gap the prior sprint left (a realtime INSERT only ever refreshed the
 * bell's popover; a user not looking at the bell had no way to notice a
 * new notification as it happened). Uses `dispatchToChannels()` rather
 * than calling `notifyToast()` directly so Android/Push automatically join
 * in the moment those channels go from stub to real — no change needed
 * here when that happens.
 */
import { useEffect, useMemo, useState } from "react";
import { Bell, Check, Inbox, Volume2, Smartphone, BellRing } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
  type CentreNotification,
} from "@/lib/notifications/centre";
import { dispatchToChannels } from "@/lib/notifications/channels/dispatch";
import {
  enableAndTestAlerts,
  isSoundAlertEnabled,
  isVibrationAlertEnabled,
} from "@/lib/notifications/sound";
import { TIER_TONE } from "@/lib/notifications/tiers";
import { toneDot } from "@/lib/ui/tones";
import { qk } from "@/lib/query-keys";
import { formatRelative, toIndicDigits } from "@/lib/format";
import { transliterateName } from "@/lib/i18n/transliterate";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const NOTIF_TEXTS = {
  en: {
    heading: "Notifications",
    unread: "unread",
    markAllRead: "Mark all read",
    phoneLaptopAlerts: "Phone & Laptop Alerts",
    testAlert: "Test Alert",
    testAlertTitle: "Click to test notification chime and vibration",
    activeToast: "Alert chime, vibration and push notifications are active!",
    playedToast: "Alert chime and vibration played!",
    allCaughtUp: "You’re all caught up.",
    critical: "Critical",
    realtime: "Realtime",
    activityFeed: "Activity feed",
    tabAll: "All",
    tabUnread: "Unread",
    tabToday: "Today",
    tabYesterday: "Yesterday",
  },
  hi: {
    heading: "सूचनाएं",
    unread: "अपठित",
    markAllRead: "सभी पढ़ी चिह्नित करें",
    phoneLaptopAlerts: "फ़ोन एवं लैपटॉप अलर्ट",
    testAlert: "अलर्ट जांचें",
    testAlertTitle: "सूचना ध्वनि और कंपन का परीक्षण करने के लिए क्लिक करें",
    activeToast: "अलर्ट ध्वनि, कंपन और पुश सूचनाएं सक्रिय हैं!",
    playedToast: "अलर्ट ध्वनि और कंपन चलाया गया!",
    allCaughtUp: "आपकी सभी सूचनाएं देखी जा चुकी हैं।",
    critical: "अति आवश्यक",
    realtime: "रीयल-टाइम",
    activityFeed: "गतिविधि फ़ीड",
    tabAll: "सभी",
    tabUnread: "अपठित",
    tabToday: "आज",
    tabYesterday: "कल",
  },
  gu: {
    heading: "સૂચનાઓ",
    unread: "ન વંચાયેલ",
    markAllRead: "બધી વંચાયેલી ચિહ્નિત કરો",
    phoneLaptopAlerts: "ફોન અને લેપટોપ એલર્ટ્સ",
    testAlert: "એલર્ટ ચકાસો",
    testAlertTitle: "સૂચના રિંગ અને વાઇબ્રેશન ચકાસવા ક્લિક કરો",
    activeToast: "એલર્ટ રિંગ, વાઇબ્રેશન અને પુશ સૂચનાઓ સક્રિય છે!",
    playedToast: "એલર્ટ રિંગ અને વાઇબ્રેશન વગાડવામાં આવ્યા!",
    allCaughtUp: "તમે બધી સૂચનાઓ જોઈ લીધી છે.",
    critical: "અતિ મહત્વનું",
    realtime: "રિયલ-ટાઇમ",
    activityFeed: "પ્રવૃત્તિ ફીડ",
    tabAll: "બધા",
    tabUnread: "ન વંચાયેલ",
    tabToday: "આજે",
    tabYesterday: "ગઈકાલે",
  },
};

const NOTIF_EXACT_TITLES: Record<string, { hi: string; gu: string }> = {
  "New Customer Added": { hi: "नया ग्राहक जोड़ा गया", gu: "નવા ગ્રાહક ઉમેર્યા" },
  "Quotation Approved": { hi: "कोटेशन स्वीकृत", gu: "ક્વોટેશન મંજૂર" },
  "Quotation Sent": { hi: "कोटेशन भेजा गया", gu: "ક્વોટેશન મોકલવામાં આવ્યું" },
  "New Quotation Floated": { hi: "नया कोटेशन जारी किया गया", gu: "નવું ક્વોટેશન જનરેટ થયું" },
  "Vendor Quote Received": {
    hi: "सप्लायर कोटेशन प्राप्त हुआ",
    gu: "સપ્લાયર ક્વોટેશન પ્રાપ્ત થયું",
  },
  "Material Dispatched": { hi: "सामग्री रवाना की गई", gu: "માલ રવાના કરવામાં આવ્યો" },
  "Payment Received": { hi: "भुगतान प्राप्त हुआ", gu: "ચુકવણી પ્રાપ્ત થઈ" },
  "Project Completed": { hi: "परियोजना संपन्न हुई", gu: "પ્રોજેક્ટ પૂર્ણ થયો" },
  "Liability Payment Recorded": { hi: "देनदारी भुगतान दर्ज", gu: "દેવું ચૂકવણી નોંધાઈ" },
  "New Liability Account Added": {
    hi: "नया देनदारी खाता जोड़ा गया",
    gu: "નવું દેવું ખાતું ઉમેરાયું",
  },
  "New Website Lead": { hi: "वेबसाइट से नई लीड", gu: "વેબસાઇટ પરથી નવી લીડ" },
  "Your account was reactivated": {
    hi: "आपका खाता पुनः सक्रिय किया गया",
    gu: "તમારું ખાતું ફરીથી સક્રિય કરવામાં આવ્યું",
  },
  "Your account was deactivated": {
    hi: "आपका खाता निष्क्रिय किया गया",
    gu: "તમારું ખાતું નિષ્ક્રિય કરવામાં આવ્યું",
  },
  "Your password was reset": {
    hi: "आपका पासवर्ड रीसेट किया गया",
    gu: "તમારો પાસવર્ડ રીસેટ કરવામાં આવ્યો",
  },
  "Upcoming site visit": { hi: "आगामी साइट निरीक्षण", gu: "આગામી સાઇટ મુલાકાત" },
};

const PAYMENT_METHODS_I18N: Record<string, { hi: string; gu: string }> = {
  cash: { hi: "नकद", gu: "રોકડ" },
  "stone tech upi": { hi: "स्टोन टेक UPI", gu: "સ્ટોન ટેક UPI" },
  "current account bob": { hi: "बैंक ऑफ बड़ौदा चालू खाता", gu: "બેંક ઓફ બરોડા ચાલુ ખાતું" },
  "stone tech bob current a/c": { hi: "बैंक ऑफ बड़ौदा चालू खाता", gu: "બેંક ઓફ બરોડા ચાલુ ખાતું" },
  "bob current": { hi: "बैंक ऑफ बड़ौदा चालू खाता", gu: "બેંક ઓફ બરોડા ચાલુ ખાતું" },
  "personal upi - raman": { hi: "व्यक्तिगत UPI - रमन", gu: "વ્યક્તિગત UPI - રમન" },
  "personal upi - rishi": { hi: "व्यक्तिगत UPI - ऋषि", gu: "વ્યક્તિગત UPI - ઋષિ" },
  "personal upi": { hi: "व्यक्तिगत UPI", gu: "વ્યક્તિગત UPI" },
  upi: { hi: "UPI", gu: "UPI" },
  "bank transfer": { hi: "बैंक ट्रांसफर", gu: "બેંક ટ્રાન્સફર" },
  neft: { hi: "NEFT", gu: "NEFT" },
  rtgs: { hi: "RTGS", gu: "RTGS" },
  imps: { hi: "IMPS", gu: "IMPS" },
  cheque: { hi: "चेक", gu: "ચેક" },
  card: { hi: "कार्ड", gu: "કાર્ડ" },
};

export function localizeNotificationText(text: string, lang?: string): string {
  if (!text || !lang || lang === "en") return text;
  const isHi = lang.startsWith("hi");
  const isGu = lang.startsWith("gu");
  if (!isHi && !isGu) return text;

  const str = text.trim();

  // 1. Exact Title Matches
  if (NOTIF_EXACT_TITLES[str]) {
    return isHi ? NOTIF_EXACT_TITLES[str].hi : NOTIF_EXACT_TITLES[str].gu;
  }

  // 1b. Prefixed titles (e.g. "[Admin] ...", "🚩 Red Flag: ...")
  if (/^\[Admin\]\s*/i.test(str)) {
    const inner = str.replace(/^\[Admin\]\s*/i, "");
    const locInner = localizeNotificationText(inner, lang);
    return isHi ? `[प्रशासक] ${locInner}` : `[એડમિન] ${locInner}`;
  }
  if (/^🚩\s*Red Flag:\s*(.*)$/i.test(str)) {
    const rest = str.replace(/^🚩\s*Red Flag:\s*/i, "");
    return isHi ? `🚩 रेड फ्लैग: ${rest}` : `🚩 રેડ ફ્લેગ: ${rest}`;
  }

  // 2. Growth Advisory Title:
  // "On track to miss/hit the ₹50,00,000 annual net-margin goal..."
  const goalTitleMatch = str.match(
    /^On track to (miss|hit) the\s+(.*?)\s+annual net-margin goal(\.{2,3}|…)?$/i,
  );
  if (goalTitleMatch) {
    const isMiss = goalTitleMatch[1].toLowerCase() === "miss";
    const goalAmt = goalTitleMatch[2].trim();
    const dots = goalTitleMatch[3] ? "..." : "";
    return toIndicDigits(
      isMiss
        ? isHi
          ? `${goalAmt} वार्षिक शुद्ध-मार्जिन लक्ष्य से पीछे रहने की चेतावनी${dots}`
          : `${goalAmt} વાર્ષિક નેટ-માર્જિન લક્ષ્યાંક ચૂકી જવાની ચેતવણી${dots}`
        : isHi
          ? `${goalAmt} वार्षिक शुद्ध-मार्जिन लक्ष्य प्राप्त करने की सही राह पर${dots}`
          : `${goalAmt} વાર્ષિક નેટ-માર્જિન લક્ષ્યાંક પ્રાપ્ત કરવાના સાચા માર્ગ પર${dots}`,
      lang,
    );
  }

  // Margins below target title:
  const marginTitleMatch = str.match(
    /^Margins are at\s+([\d.]+)%\s*—\s*below the\s+([\d.]+)%\s*target$/i,
  );
  if (marginTitleMatch) {
    const cur = marginTitleMatch[1];
    const tgt = marginTitleMatch[2];
    return toIndicDigits(
      isHi
        ? `मार्जिन ${cur}% पर हैं — लक्ष्य ${tgt}% से कम`
        : `માર્જિન ${cur}% પર છે — લક્ષ્યાંક ${tgt}% કરતાં ઓછું`,
      lang,
    );
  }

  // 3. Customer entry body:
  // "A new customer entry has been made: Siraj Bhai (CUS-000067)."
  const custEntryMatch = str.match(/^A new customer entry has been made:\s*(.*?)\s*\((.*?)\)\.?$/i);
  if (custEntryMatch) {
    const rawName = custEntryMatch[1].trim();
    const code = custEntryMatch[2].trim();
    const name = transliterateName(rawName, lang);
    return toIndicDigits(
      isHi
        ? `नया ग्राहक दर्ज किया गया: ${name} (${code})`
        : `નવા ગ્રાહક નોંધાયા: ${name} (${code})`,
      lang,
    );
  }

  // 4. Growth Advisory Body:
  // "Effective net profit (after netting off ₹61,600 in monthly liabilities and ₹0 in this month's business expenses) is ₹2,46,324 against the ₹50,00,000 annual goal. ..."
  const profitBodyMatch = str.match(
    /^Effective net profit\s*(?:\(after netting off\s*(.*?)\s*in monthly liabilities and\s*(.*?)\s*in this month['’]s business expenses\))?\s*is\s*(.*?)\s*against the\s*(.*?)\s*annual goal\.?\s*(.*)$/i,
  );
  if (profitBodyMatch) {
    const liab = profitBodyMatch[1]?.trim();
    const exp = profitBodyMatch[2]?.trim();
    const profit = profitBodyMatch[3]?.trim();
    const goal = profitBodyMatch[4]?.trim();
    const rest = profitBodyMatch[5]?.trim() || "";

    const deductionPartHi =
      liab && exp
        ? `(मासिक देनदारियों ${liab} और इस माह के व्यावसायिक खर्च ${exp} घटाने के बाद) `
        : "";
    const deductionPartGu =
      liab && exp ? `(માસિક દેવાં ${liab} અને આ મહિનાના બિઝનેસ ખર્ચ ${exp} બાદ કર્યા પછી) ` : "";

    const mainHi = `प्रभावी शुद्ध लाभ ${deductionPartHi}${goal} के वार्षिक लक्ष्य के मुकाबले ${profit} है।`;
    const mainGu = `અસરકારક નેટ નફો ${deductionPartGu}${goal} ના વાર્ષિક લક્ષ્યાંક સામે ${profit} છે.`;

    if (!rest) return toIndicDigits(isHi ? mainHi : mainGu, lang);

    const gapMatch = rest.match(
      /To close the gap,\s*either raise prices by roughly\s*([\d.]+)%,\s*or bring in about\s*(\d+)\s*more customer(?:s)?\s*of\s*(.*?)\+\s*each in the next (\d+)\s*days\./i,
    );
    if (gapMatch) {
      const pricePct = gapMatch[1];
      const count = gapMatch[2];
      const avgDeal = gapMatch[3];
      const days = gapMatch[4];
      const gapHi = ` अंतर पाटने के लिए, या तो कीमतें लगभग ${pricePct}% बढ़ाएं, या अगले ${days} दिनों में ${avgDeal}+ के लगभग ${count} और ग्राहक लाएं।`;
      const gapGu = ` અંતર પૂરવા માટે, ક્યાં તો કિંમતો આશરે ${pricePct}% વધારો, અથવા આગામી ${days} દિવસોમાં ${avgDeal}+ ના આશરે ${count} વધુ ગ્રાહકો લાવો.`;
      return toIndicDigits(isHi ? mainHi + gapHi : mainGu + gapGu, lang);
    }

    return toIndicDigits(isHi ? mainHi : mainGu, lang);
  }

  // 5. Payment Received Body:
  // "Received ₹50,000 in Cash from Siraj Bhai against INV-000007."
  const paymentMatch = str.match(
    /^Received\s+(₹[\d,]+|\d+)\s+in\s+(.*?)(?:\s+from\s+(.*?))?(?:\s+against\s+(.*?))?\.?$/i,
  );
  if (paymentMatch) {
    const amt = paymentMatch[1];
    const rawMethod = paymentMatch[2].trim();
    const methodLower = rawMethod.toLowerCase();
    const method = PAYMENT_METHODS_I18N[methodLower]
      ? isHi
        ? PAYMENT_METHODS_I18N[methodLower].hi
        : PAYMENT_METHODS_I18N[methodLower].gu
      : rawMethod;
    const from = paymentMatch[3] ? transliterateName(paymentMatch[3].trim(), lang) : null;
    const against = paymentMatch[4]?.trim();
    const fromPartHi = from ? ` ${from} से` : "";
    const fromPartGu = from ? ` ${from} તરફથી` : "";
    const againstPartHi = against ? ` (${against} के एवज में)` : "";
    const againstPartGu = against ? ` (${against} સામે)` : "";
    return toIndicDigits(
      isHi
        ? `${amt} भुगतान प्राप्त हुआ (${method})${fromPartHi}${againstPartHi}।`
        : `${amt} ચુકવણી પ્રાપ્ત થઈ (${method})${fromPartGu}${againstPartGu}.`,
      lang,
    );
  }

  // 6. Material Dispatched Body:
  // "The material has been dispatched: DSP-000008 via Gopal Bhai for Nagesh Rabari."
  const dispatchMatch = str.match(
    /^The material has been dispatched:\s*(.*?)(?:\s+via\s+(.*?))?(?:\s+for\s+(.*?))?\.?$/i,
  );
  if (dispatchMatch) {
    const dspNo = dispatchMatch[1]?.trim();
    const carrier = dispatchMatch[2] ? transliterateName(dispatchMatch[2].trim(), lang) : null;
    const target = dispatchMatch[3] ? transliterateName(dispatchMatch[3].trim(), lang) : null;
    const viaPartHi = carrier ? ` वाहन: ${carrier}` : "";
    const viaPartGu = carrier ? ` વાહન: ${carrier}` : "";
    const forPartHi = target ? ` (${target} हेतु)` : "";
    const forPartGu = target ? ` (${target} માટે)` : "";
    return toIndicDigits(
      isHi
        ? `सामग्री रवाना की गई: ${dspNo}${viaPartHi}${forPartHi}।`
        : `માલ રવાના કરવામાં આવ્યો: ${dspNo}${viaPartGu}${forPartGu}.`,
      lang,
    );
  }

  // 7. Quotation Approved Body:
  // "A quotation has been approved: QUO-000025 for Mehul Panchal (₹2,50,000)."
  const quoteAppMatch = str.match(
    /^A quotation has been approved:\s*(.*?)(?:\s+for\s+(.*?))?(?:\s+\((₹[\d,]+)\))?\.?$/i,
  );
  if (quoteAppMatch) {
    const qNo = quoteAppMatch[1]?.trim();
    const cust = quoteAppMatch[2] ? transliterateName(quoteAppMatch[2].trim(), lang) : null;
    const amt = quoteAppMatch[3]?.trim();
    const custPartHi = cust ? ` ग्राहक: ${cust}` : "";
    const custPartGu = cust ? ` ગ્રાહક: ${cust}` : "";
    const amtPart = amt ? ` (${amt})` : "";
    return toIndicDigits(
      isHi
        ? `कोटेशन स्वीकृत हुआ: ${qNo}${custPartHi}${amtPart}।`
        : `ક્વોટેશન મંજૂર થયું: ${qNo}${custPartGu}${amtPart}.`,
      lang,
    );
  }

  // 8. Project Completed Body:
  // "Project "Villa Cladding" for Siraj Bhai has been completed. Check the updated sales ledger and notify customer."
  const projCompMatch = str.match(
    /^Project\s*["“](.*?)["”](?:\s+for\s+(.*?))?\s+has been completed\.\s*(.*)$/i,
  );
  if (projCompMatch) {
    const pName = projCompMatch[1]?.trim();
    const cust = projCompMatch[2] ? transliterateName(projCompMatch[2].trim(), lang) : null;
    const forHi = cust ? ` (${cust})` : "";
    const forGu = cust ? ` (${cust})` : "";
    return toIndicDigits(
      isHi
        ? `परियोजना "${pName}"${forHi} पूर्ण हुई। बिक्री लेजर की जांच करें एवं ग्राहक को सूचित करें।`
        : `પ્રોજેક્ટ "${pName}"${forGu} પૂર્ણ થયો. સેલ્સ લેજર તપાસો અને ગ્રાહકને જાણ કરો.`,
      lang,
    );
  }

  // 9. Liability Payment Recorded Body:
  // "₹25,000 paid for Office Rent for November 2026 via BOB Current."
  const liabPayMatch = str.match(
    /^(₹[\d,]+|\d+)\s+paid for\s+(.*?)(?:\s+for\s+(.*?))?\s+via\s+(.*?)\.?$/i,
  );
  if (liabPayMatch) {
    const amt = liabPayMatch[1];
    const liabName = liabPayMatch[2]?.trim();
    const month = liabPayMatch[3]?.trim();
    const mode = liabPayMatch[4]?.trim();
    const monthPartHi = month ? ` (${month})` : "";
    const monthPartGu = month ? ` (${month})` : "";
    return toIndicDigits(
      isHi
        ? `${liabName}${monthPartHi} हेतु ${amt} का भुगतान ${mode} द्वारा दर्ज किया गया।`
        : `${liabName}${monthPartGu} માટે ${amt} ની ચુકવણી ${mode} મારફતે નોંધાઈ.`,
      lang,
    );
  }

  // 10. System Audit Activity pattern:
  // "System created — receipts created"
  const auditMatch = str.match(
    /^System\s+(updated|created|deleted)\s*—\s*(.*?)\s+(updated|created|deleted)$/i,
  );
  if (auditMatch) {
    const action = auditMatch[1].toLowerCase();
    const subject = auditMatch[2].toLowerCase();
    const actHi = action === "created" ? "निर्मित" : action === "updated" ? "अपडेट" : "हटाया गया";
    const actGu = action === "created" ? "નિર્મિત" : action === "updated" ? "અપડેટ" : "કાઢી નાખેલ";
    const subjMap: Record<string, { hi: string; gu: string }> = {
      receipts: { hi: "रसीदें", gu: "રસીદો" },
      customers: { hi: "ग्राहक", gu: "ગ્રાહકો" },
      quotes: { hi: "कोटेशन", gu: "ક્વોટેશન" },
      orders: { hi: "बिक्री आदेश", gu: "વેચાણ ઓર્ડર" },
      payments: { hi: "भुगतान", gu: "ચુકવણી" },
      invoices: { hi: "चालान", gu: "ઇન્વૉઇસ" },
      dispatches: { hi: "डिस्पैच", gu: "ડિસ્પેચ" },
      liabilities: { hi: "देनदारियां", gu: "દેવાં" },
      leads: { hi: "लीड्स", gu: "લીડ્સ" },
    };
    const s = subjMap[subject];
    if (s) {
      return isHi ? `सिस्टम ${actHi} — ${s.hi} ${actHi}` : `સિસ્ટમ ${actGu} — ${s.gu} ${actGu}`;
    }
  }

  // 11. Generic phrase-level fallback
  let out = str;
  if (isHi) {
    out = out
      .replace(/Receipt\s+([A-Za-z0-9-]+)\s+created/gi, "रसीद $1 दर्ज की गई")
      .replace(/Receipt\s+created/gi, "रसीद दर्ज की गई")
      .replace(/Quote\s+([A-Za-z0-9-]+)\s+approved/gi, "कोटेशन $1 स्वीकृत")
      .replace(/Invoice\s+([A-Za-z0-9-]+)\s+created/gi, "चालान $1 बनाया गया")
      .replace(/Invoice\s+([A-Za-z0-9-]+)\s+generated/gi, "चालान $1 जारी किया गया")
      .replace(/Customer\s+([A-Za-z0-9-]+)\s+created/gi, "नया ग्राहक $1 बनाया गया")
      .replace(/Order\s+([A-Za-z0-9-]+)\s+created/gi, "बिक्री आदेश $1 बनाया गया")
      .replace(/Payment\s+received/gi, "भुगतान प्राप्त हुआ")
      .replace(/Delivery\s+deadline/gi, "डिलीवरी समयसीमा")
      .replace(/Red Flag/gi, "रेड फ्लैग")
      .replace(/Assign Live Stock \/ Partner/gi, "लाइव स्टॉक / पार्टनर सौंपें")
      .replace(/awaiting response/gi, "उत्तर की प्रतीक्षा")
      .replace(/follow-up/gi, "फ़ॉलो-अप")
      .replace(/due today/gi, "आज देय")
      .replace(/overdue/gi, "अतिदेय")
      .replace(
        /An administrator restored your access to STOS\./gi,
        "प्रशासक ने STOS में आपकी पहुंच बहाल कर दी है।",
      )
      .replace(
        /An administrator deactivated your account\. Contact an admin if this is unexpected\./gi,
        "प्रशासक ने आपका खाता निष्क्रिय कर दिया है।",
      )
      .replace(
        /An administrator reset your password\. You'll be asked to set a new one at next sign-in\./gi,
        "प्रशासक ने आपका पासवर्ड रीसेट कर दिया है। अगले साइन-इन पर आपको नया पासवर्ड सेट करना होगा।",
      );
  } else if (isGu) {
    out = out
      .replace(/Receipt\s+([A-Za-z0-9-]+)\s+created/gi, "રસીદ $1 નોંધવામાં આવી")
      .replace(/Receipt\s+created/gi, "રસીદ નોંધવામાં આવી")
      .replace(/Quote\s+([A-Za-z0-9-]+)\s+approved/gi, "ક્વોટેશન $1 મંજૂર થયું")
      .replace(/Invoice\s+([A-Za-z0-9-]+)\s+created/gi, "ઇન્વૉઇસ $1 બનાવવામાં આવ્યું")
      .replace(/Invoice\s+([A-Za-z0-9-]+)\s+generated/gi, "ઇન્વૉઇસ $1 જનરેટ થયું")
      .replace(/Customer\s+([A-Za-z0-9-]+)\s+created/gi, "નવા ગ્રાહક $1 બનાવ્યા")
      .replace(/Order\s+([A-Za-z0-9-]+)\s+created/gi, "વેચાણ ઓર્ડર $1 બનાવવામાં આવ્યો")
      .replace(/Payment\s+received/gi, "ચુકવણી પ્રાપ્ત થઈ")
      .replace(/Delivery\s+deadline/gi, "ડિલિવરી સમયમર્યાદા")
      .replace(/Red Flag/gi, "રેડ ફ્લેગ")
      .replace(/Assign Live Stock \/ Partner/gi, "લાઇવ સ્ટોક / પાર્ટનર સોંપો")
      .replace(/awaiting response/gi, "પ્રતિસાદની રાહ")
      .replace(/follow-up/gi, "ફોલો-અપ")
      .replace(/due today/gi, "આજે બાકી")
      .replace(/overdue/gi, "મુદતવીતી")
      .replace(
        /An administrator restored your access to STOS\./gi,
        "એડમિનિસ્ટ્રેટરે STOS માં તમારો પ્રવેશ પુનઃસ્થાપિત કર્યો છે.",
      )
      .replace(
        /An administrator deactivated your account\. Contact an admin if this is unexpected\./gi,
        "એડમિનિસ્ટ્રેટરે તમારું એકાઉન્ટ નિષ્ક્રિય કર્યું છે.",
      )
      .replace(
        /An administrator reset your password\. You'll be asked to set a new one at next sign-in\./gi,
        "એડમિનિસ્ટ્રેટરે તમારો પાસવર્ડ રીસેટ કર્યો છે. આગલા સાઇન-ઇન પર નવો પાસવર્ડ સેટ કરવો પડશે.",
      );
  }

  return toIndicDigits(out, lang);
}

type BucketKey = "all" | "unread" | "today" | "yesterday";

function startOfDay(d: Date): number {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c.getTime();
}

function bucketFor(n: CentreNotification, now: Date): "today" | "yesterday" | "earlier" {
  const t = new Date(n.createdAt).getTime();
  const today = startOfDay(now);
  const yest = today - 86_400_000;
  if (t >= today) return "today";
  if (t >= yest) return "yesterday";
  return "earlier";
}

export function NotificationsBell() {
  const qc = useQueryClient();
  const { i18n } = useTranslation();
  const lang = (i18n.language?.substring(0, 2) || "en") as "en" | "hi" | "gu";
  const t = NOTIF_TEXTS[lang] || NOTIF_TEXTS.en;

  const { data: items = [] } = useQuery({
    queryKey: qk.notifications.all,
    queryFn: () => listNotifications(),
    // Realtime pushes new rows in via invalidation below; this keeps the
    // popover reasonably fresh even if a realtime event is missed (e.g.
    // the tab was backgrounded when it fired).
    refetchInterval: 60_000,
  });

  useEffect(() => {
    return subscribeToNotifications((n) => {
      void qc.invalidateQueries({ queryKey: qk.notifications.all });
      void dispatchToChannels({
        tier: n.tier,
        title: n.title,
        body: n.body,
        linkPath: n.linkPath,
        entityType: n.entityType,
        entityId: n.entityId,
      });
    });
  }, [qc]);

  const [tab, setTab] = useState<BucketKey>("all");

  // Cheap enough to compute per render — a memo keyed on `items` just to
  // "refresh now() when data refreshes" isn't buying anything real here
  const unreadItems = useMemo(() => items.filter((i) => !i.readAt), [items]);
  const unread = unreadItems.length;

  const filtered = useMemo(() => {
    switch (tab) {
      case "unread":
        return unreadItems;
      case "today": {
        const now = new Date();
        return items.filter((i) => bucketFor(i, now) === "today");
      }
      case "yesterday": {
        const now = new Date();
        return items.filter((i) => bucketFor(i, now) === "yesterday");
      }
      default:
        return items;
    }
  }, [items, unreadItems, tab]);

  const markAll = (): void => {
    const ids = unreadItems.map((i) => i.id);
    // Optimistic: flip local cache immediately, reconcile on the next
    // fetch/realtime event rather than waiting on a round trip.
    qc.setQueryData<CentreNotification[]>(qk.notifications.all, (prev) =>
      (prev ?? []).map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })),
    );
    void markAllNotificationsRead(ids);
  };

  const markOne = (id: string): void => {
    qc.setQueryData<CentreNotification[]>(qk.notifications.all, (prev) =>
      (prev ?? []).map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
    );
    void markNotificationRead(id);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8"
          aria-label={`${t.heading}${unread > 0 ? ` (${unread} ${t.unread})` : ""}`}
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span
              aria-hidden
              className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary ring-2 ring-card"
            />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[380px] overflow-hidden p-0 border-border-default shadow-e3"
      >
        {/* Solid Dark Turquoise header */}
        <div className="material-sapphire relative">
          <div className="relative z-10 flex items-center justify-between px-3.5 py-3">
            <div className="flex items-center gap-2">
              <Inbox className="h-3.5 w-3.5 text-sidebar-foreground/90" aria-hidden />
              <span className="font-display text-[13px] font-bold tracking-tight text-white">
                {t.heading}
              </span>
              {unread > 0 && (
                <span className="rounded-full bg-white/20 px-1.5 py-px font-mono text-[10px] font-bold text-white shadow-xs">
                  {unread}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={markAll}
              disabled={unread === 0}
              className={cn(
                "flex items-center gap-1 rounded-sm px-1.5 py-1 text-[11px]",
                "text-sidebar-foreground/80 transition-colors",
                "hover:bg-white/10 hover:text-white",
                "disabled:opacity-40 disabled:hover:bg-transparent",
              )}
            >
              <Check className="h-3 w-3" aria-hidden />
              {t.markAllRead}
            </button>
          </div>
        </div>

        {/* Device Alert Bar (Sound Chime, Vibration & OS Push) */}
        <div className="bg-slate-900 border-b border-slate-800 px-3 py-1.5 flex items-center justify-between text-[11px] text-slate-300">
          <div className="flex items-center gap-1.5">
            <Volume2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <Smartphone className="h-3.5 w-3.5 text-sidebar-ring shrink-0" />
            <span className="font-semibold text-xs text-slate-200">{t.phoneLaptopAlerts}</span>
          </div>
          <button
            type="button"
            onClick={async () => {
              const res = await enableAndTestAlerts();
              if (res.permission === "granted") {
                toast.success(t.activeToast);
              } else {
                toast.success(t.playedToast);
              }
            }}
            className="flex items-center gap-1 text-[10px] font-bold text-sidebar-ring hover:text-white bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded cursor-pointer transition-colors"
            title={t.testAlertTitle}
          >
            <BellRing className="h-3 w-3" />
            <span>{t.testAlert}</span>
          </button>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as BucketKey)}>
          <TabsList className="h-9 w-full justify-start gap-0 rounded-none border-b border-border-subtle bg-surface-panel px-1">
            {[
              { id: "all", label: t.tabAll },
              { id: "unread", label: t.tabUnread },
              { id: "today", label: t.tabToday },
              { id: "yesterday", label: t.tabYesterday },
            ].map((tb) => (
              <TabsTrigger
                key={tb.id}
                value={tb.id}
                className="h-8 rounded-sm px-2.5 text-[11px] data-[state=active]:bg-transparent data-[state=active]:text-text-primary data-[state=active]:shadow-none"
              >
                {tb.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={tab} className="m-0">
            <div className="max-h-[420px] overflow-y-auto bg-surface-card">
              {filtered.length === 0 ? (
                <div className="px-3 py-12 text-center text-[13px] text-text-muted">
                  {t.allCaughtUp}
                </div>
              ) : (
                filtered.map((n) => (
                  <Link
                    key={n.id}
                    to={n.linkPath ?? "/dashboard"}
                    className="block border-b border-border-subtle px-3.5 py-3 transition-colors hover:bg-surface-card-hover"
                    onClick={() => markOne(n.id)}
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        aria-hidden
                        className={cn(
                          "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                          !n.readAt ? toneDot(TIER_TONE[n.tier]) : "bg-transparent",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-1.5">
                            {n.tier === "critical" && (
                              <span
                                className={cn(
                                  "shrink-0 rounded-sm px-1 py-px font-mono text-[9px] font-semibold uppercase tracking-wider",
                                  "bg-status-danger-bg text-status-danger-fg",
                                )}
                              >
                                {t.critical}
                              </span>
                            )}
                            <div className="truncate text-[13px] font-medium text-text-primary">
                              {localizeNotificationText(n.title, lang)}
                            </div>
                          </div>
                          <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-text-muted">
                            {formatRelative(n.createdAt, lang)}
                          </span>
                        </div>
                        {n.body && (
                          <div className="line-clamp-2 text-[12px] text-text-secondary">
                            {localizeNotificationText(n.body, lang)}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between border-t border-border-subtle bg-surface-panel px-3 py-2 text-[11px] text-text-muted">
          <span className="font-mono uppercase tracking-wider">{t.realtime}</span>
          <Link to="/activity" className="text-text-link hover:underline">
            {t.activityFeed}
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

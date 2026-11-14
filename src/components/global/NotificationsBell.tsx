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
import { formatRelative } from "@/lib/format";
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

export function localizeNotificationText(text: string, lang?: string): string {
  if (!text || !lang || lang === "en") return text;

  let out = text;
  out = transliterateName(out, lang);

  if (lang === "hi") {
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
      .replace(/awaiting response/gi, "उत्तर की प्रतीक्षा");
  } else if (lang === "gu") {
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
      .replace(/awaiting response/gi, "પ્રતિસાદની રાહ");
  }

  return out;
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
              <Inbox className="h-3.5 w-3.5 text-cyan-100" aria-hidden />
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
                "text-cyan-100 transition-colors",
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
            <Smartphone className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
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
            className="flex items-center gap-1 text-[10px] font-bold text-cyan-300 hover:text-white bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded cursor-pointer transition-colors"
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

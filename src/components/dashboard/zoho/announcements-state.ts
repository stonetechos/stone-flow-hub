import { useEffect, useState } from "react";

export interface AnnouncementItem {
  id: string;
  title: string;
  date: string;
  category: string;
  body: string;
}

export const ANNOUNCEMENTS: AnnouncementItem[] = [
  {
    id: "ann-01",
    title: "Executive & Financial Operations Dashboard Live",
    date: "09 Sep 2026",
    category: "System Update",
    body: "The executive dashboard has been updated to provide full financial & operational visibility, including real-time Receivables, Payables, Monthly Cash Flow, and Accrual vs Cash sales & expense tracking.",
  },
  {
    id: "ann-02",
    title: "HR Operations & Payroll Migration Complete",
    date: "09 Sep 2026",
    category: "Operations",
    body: "HR Operations and Workforce Intelligence have been merged into 4 cohesive hubs: Employees, Attendance & Leave, Payroll, and Workforce Intelligence.",
  },
  {
    id: "ann-03",
    title: "GST E-Way Bill & Dispatch Protocol",
    date: "01 Sep 2026",
    category: "Compliance",
    body: "All outward stone dispatches exceeding ₹50,000 must include the validated E-Way Bill number and vehicle registration before vehicle gate clearance.",
  },
];

const STORAGE_KEY = "stos_read_announcements";
const ANNOUNCEMENT_EVENT = "stos_announcements_changed";

export function getReadAnnouncementIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function markAnnouncementAsRead(id: string): void {
  if (typeof window === "undefined") return;
  const current = getReadAnnouncementIds();
  current.add(id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(current)));
  window.dispatchEvent(new CustomEvent(ANNOUNCEMENT_EVENT));
}

export function markAllAnnouncementsAsRead(): void {
  if (typeof window === "undefined") return;
  const allIds = ANNOUNCEMENTS.map((a) => a.id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allIds));
  window.dispatchEvent(new CustomEvent(ANNOUNCEMENT_EVENT));
}

export function useAnnouncements() {
  const [readIds, setReadIds] = useState<Set<string>>(() => getReadAnnouncementIds());

  useEffect(() => {
    const handler = () => {
      setReadIds(getReadAnnouncementIds());
    };
    window.addEventListener(ANNOUNCEMENT_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(ANNOUNCEMENT_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const unreadCount = ANNOUNCEMENTS.filter((a) => !readIds.has(a.id)).length;
  const hasUnread = unreadCount > 0;

  return {
    announcements: ANNOUNCEMENTS.map((a) => ({
      ...a,
      unread: !readIds.has(a.id),
    })),
    unreadCount,
    hasUnread,
    markAsRead: markAnnouncementAsRead,
    markAllAsRead: markAllAnnouncementsAsRead,
  };
}

/** Recent items — localStorage based, per user context. */
const KEY = "st.recent";
const MAX = 20;

export interface RecentItem {
  entityType: string;
  entityId: string;
  label: string;
  href: string;
  at: number;
}

function read(): RecentItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as RecentItem[]) : [];
  } catch {
    return [];
  }
}

function write(items: RecentItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX)));
    window.dispatchEvent(new CustomEvent("st.recent.updated"));
  } catch {
    // ignore quota errors
  }
}

export function pushRecent(item: Omit<RecentItem, "at">): void {
  const items = read().filter((i) => !(i.entityType === item.entityType && i.entityId === item.entityId));
  items.unshift({ ...item, at: Date.now() });
  write(items);
}

export function listRecent(): RecentItem[] {
  return read();
}

export function clearRecent(): void {
  write([]);
}

export function subscribeRecent(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (): void => cb();
  window.addEventListener("st.recent.updated", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("st.recent.updated", handler);
    window.removeEventListener("storage", handler);
  };
}

/**
 * Per-user navigation preferences and recently-used modules.
 * Stored in localStorage under a user-scoped key so preferences never leak
 * across accounts and admins cannot alter other users' sidebars.
 *
 * Deliberately client-only: this is a pure UI personalization layer.
 */
import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  NAV_GROUPS,
  NAV_ITEMS,
  NAV_ITEMS_BY_ID,
  findNavItemForPath,
  type NavGroupId,
  type NavItemDef,
} from "./config";

const PREFS_KEY = (uid: string): string => `st.navPrefs.${uid}`;
const RECENT_KEY = (uid: string): string => `st.navRecent.${uid}`;
const RECENT_MAX = 5;

export interface NavPreferences {
  version: 1;
  /** Ordered list of module ids that always appear at the very top. */
  starred: string[];
  /** Module ids the user has hidden. */
  hidden: string[];
  /** Order of groups top-to-bottom. */
  groupOrder: NavGroupId[];
  /** Explicit per-group order of module ids (starred items excluded). */
  itemOrderByGroup: Partial<Record<NavGroupId, string[]>>;
  /** Groups whose bodies are currently collapsed. */
  collapsedGroups: NavGroupId[];
}

export function defaultPreferences(): NavPreferences {
  return {
    version: 1,
    starred: [],
    hidden: [],
    groupOrder: NAV_GROUPS.map((g) => g.id),
    itemOrderByGroup: {},
    collapsedGroups: [],
  };
}

function normalize(p: Partial<NavPreferences> | null | undefined): NavPreferences {
  const base = defaultPreferences();
  if (!p) return base;
  const known = new Set(NAV_ITEMS.map((i) => i.id));
  const knownGroups = new Set(NAV_GROUPS.map((g) => g.id));
  return {
    version: 1,
    starred: (p.starred ?? []).filter((id) => known.has(id)),
    hidden: (p.hidden ?? []).filter((id) => known.has(id)),
    groupOrder: [
      ...(p.groupOrder ?? []).filter((g): g is NavGroupId => knownGroups.has(g as NavGroupId)),
      ...base.groupOrder.filter((g) => !(p.groupOrder ?? []).includes(g)),
    ],
    itemOrderByGroup: Object.fromEntries(
      Object.entries(p.itemOrderByGroup ?? {}).map(([g, ids]) => [
        g,
        (ids ?? []).filter((id) => known.has(id)),
      ]),
    ) as Partial<Record<NavGroupId, string[]>>,
    collapsedGroups: (p.collapsedGroups ?? []).filter((g): g is NavGroupId =>
      knownGroups.has(g as NavGroupId),
    ),
  };
}

// ---------------- storage helpers ----------------

function readPrefs(uid: string | null): NavPreferences {
  if (typeof window === "undefined" || !uid) return defaultPreferences();
  try {
    const raw = window.localStorage.getItem(PREFS_KEY(uid));
    return normalize(raw ? (JSON.parse(raw) as Partial<NavPreferences>) : null);
  } catch {
    return defaultPreferences();
  }
}

function writePrefs(uid: string | null, prefs: NavPreferences): void {
  if (typeof window === "undefined" || !uid) return;
  try {
    window.localStorage.setItem(PREFS_KEY(uid), JSON.stringify(prefs));
    window.dispatchEvent(new CustomEvent("st.navPrefs.updated"));
  } catch {
    // ignore quota errors
  }
}

function readRecent(uid: string | null): string[] {
  if (typeof window === "undefined" || !uid) return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY(uid));
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as string[]).filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeRecent(uid: string | null, ids: string[]): void {
  if (typeof window === "undefined" || !uid) return;
  try {
    window.localStorage.setItem(RECENT_KEY(uid), JSON.stringify(ids.slice(0, RECENT_MAX)));
    window.dispatchEvent(new CustomEvent("st.navRecent.updated"));
  } catch {
    // ignore quota errors
  }
}

// ---------------- current user ----------------

let cachedUid: string | null = null;
const uidListeners = new Set<() => void>();

function subscribeUid(cb: () => void): () => void {
  uidListeners.add(cb);
  return () => uidListeners.delete(cb);
}

function ensureUidSubscription(): void {
  if (typeof window === "undefined") return;
  if ((ensureUidSubscription as unknown as { _started?: boolean })._started) return;
  (ensureUidSubscription as unknown as { _started?: boolean })._started = true;

  void supabase.auth.getUser().then(({ data }) => {
    cachedUid = data.user?.id ?? null;
    uidListeners.forEach((cb) => cb());
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    cachedUid = session?.user?.id ?? null;
    uidListeners.forEach((cb) => cb());
  });
}

// ---------------- React hooks ----------------

export function useCurrentUserId(): string | null {
  useEffect(ensureUidSubscription, []);
  return useSyncExternalStore(
    (cb) => subscribeUid(cb),
    () => cachedUid,
    () => null,
  );
}

function subscribePrefs(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (): void => cb();
  window.addEventListener("st.navPrefs.updated", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("st.navPrefs.updated", handler);
    window.removeEventListener("storage", handler);
  };
}

export function useNavPreferences(): {
  prefs: NavPreferences;
  update: (patch: (p: NavPreferences) => NavPreferences) => void;
  reset: () => void;
  replace: (p: NavPreferences) => void;
  ready: boolean;
} {
  const uid = useCurrentUserId();
  const prefs = useSyncExternalStore(
    subscribePrefs,
    () => (uid ? readPrefs(uid) : defaultPreferences()),
    () => defaultPreferences(),
  );

  return {
    prefs,
    ready: !!uid,
    update: (patch) => writePrefs(uid, normalize(patch(prefs))),
    replace: (p) => writePrefs(uid, normalize(p)),
    reset: () => writePrefs(uid, defaultPreferences()),
  };
}

function subscribeRecent(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (): void => cb();
  window.addEventListener("st.navRecent.updated", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("st.navRecent.updated", handler);
    window.removeEventListener("storage", handler);
  };
}

export function useRecentNav(): string[] {
  const uid = useCurrentUserId();
  return useSyncExternalStore(
    subscribeRecent,
    () => (uid ? readRecent(uid) : []),
    () => [],
  );
}

export function trackNavVisit(pathname: string): void {
  const uid = cachedUid;
  if (!uid) return;
  const match = findNavItemForPath(pathname);
  if (!match) return;
  const existing = readRecent(uid).filter((id) => id !== match.id);
  writeRecent(uid, [match.id, ...existing]);
}

// ---------------- derived views ----------------

export interface ResolvedNavGroup {
  id: NavGroupId;
  label: string;
  items: NavItemDef[];
}

export interface ResolvedNav {
  starred: NavItemDef[];
  groups: ResolvedNavGroup[];
  hidden: NavItemDef[];
}

/**
 * Resolve the user's preferences against the current NAV_ITEMS catalog.
 * New modules added later automatically appear in their default group at the
 * end. Admin-only items are filtered out for non-admins.
 */
export function resolveNav(prefs: NavPreferences, isAdmin: boolean): ResolvedNav {
  const visibleItems = NAV_ITEMS.filter((i) => (i.adminOnly ? isAdmin : true));
  const hiddenSet = new Set(prefs.hidden);

  const starred = prefs.starred
    .map((id) => NAV_ITEMS_BY_ID[id])
    .filter((i): i is NavItemDef => !!i && (i.adminOnly ? isAdmin : true) && !hiddenSet.has(i.id));

  const starredSet = new Set(starred.map((i) => i.id));

  const groups: ResolvedNavGroup[] = prefs.groupOrder
    .filter((gid) => {
      const def = NAV_GROUPS.find((g) => g.id === gid);
      return def && (def.adminOnly ? isAdmin : true);
    })
    .map((gid) => {
      const def = NAV_GROUPS.find((g) => g.id === gid);
      const catalog = visibleItems.filter((i) => i.group === gid);
      const explicit = prefs.itemOrderByGroup[gid] ?? [];
      const ordered: NavItemDef[] = [];
      for (const id of explicit) {
        const item = catalog.find((i) => i.id === id);
        if (item) ordered.push(item);
      }
      for (const item of catalog) {
        if (!ordered.some((i) => i.id === item.id)) ordered.push(item);
      }
      return {
        id: gid,
        label: def?.label ?? gid,
        items: ordered.filter((i) => !starredSet.has(i.id) && !hiddenSet.has(i.id)),
      };
    });

  const hidden = NAV_ITEMS.filter(
    (i) => hiddenSet.has(i.id) && (i.adminOnly ? isAdmin : true),
  );

  return { starred, groups, hidden };
}

/** Global command-palette search. Cmd/Ctrl+K opens. */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { qk } from "@/lib/query-keys";
import { globalSearch, type SearchGroupKey, type SearchHit } from "@/lib/search/api";
import { listRecent, subscribeRecent } from "@/lib/recent/store";
import { Clock, Compass } from "lucide-react";
import { resolveNav, useNavPreferences, useRecentNav } from "@/lib/nav/preferences";
import { NAV_ITEMS_BY_ID } from "@/lib/nav/config";

const GROUP_ORDER: ReadonlyArray<SearchGroupKey> = [
  "customers",
  "projects",
  "vendors",
  "products",
  "enquiries",
  "quotes",
  "salesOrders",
  "purchaseOrders",
  "inventory",
  "invoices",
  "payments",
  "dispatch",
];

export function GlobalSearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const [recent, setRecent] = useState(listRecent());
  const { prefs } = useNavPreferences();
  const recentNavIds = useRecentNav();

  useEffect(() => subscribeRecent(() => setRecent(listRecent())), []);

  // Ordered nav items following the user's own sidebar order (pinned first,
  // then each visible group). Admin-only items are safe to include as
  // matches only if the user actually has access — the visited route would
  // otherwise be blocked, so this mirrors the sidebar (admin ignored here).
  const orderedNav = useMemo(() => {
    const resolved = resolveNav(prefs, false);
    const list = [...resolved.starred, ...resolved.groups.flatMap((g) => g.items)];
    return list;
  }, [prefs]);

  const navMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 1) return [];
    return orderedNav.filter((i) => i.label.toLowerCase().includes(q)).slice(0, 8);
  }, [query, orderedNav]);

  const { data, isFetching } = useQuery({
    queryKey: qk.search.global(query),
    queryFn: () => globalSearch(query),
    enabled: open && query.trim().length >= 2,
    staleTime: 15_000,
  });

  const grouped = new Map<SearchGroupKey, SearchHit[]>();
  for (const h of data ?? []) {
    const arr = grouped.get(h.group) ?? [];
    arr.push(h);
    grouped.set(h.group, arr);
  }

  const recentNavItems = recentNavIds
    .map((id) => NAV_ITEMS_BY_ID[id])
    .filter((i) => !!i)
    .slice(0, 5);

  const go = (href: string): void => {
    onOpenChange(false);
    setQuery("");
    void navigate({ to: href });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search customers, projects, quotes, invoices, payments…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-[70vh]">
        {query.trim().length < 2 ? (
          <>
            {recentNavItems.length > 0 && (
              <CommandGroup heading="Recently used">
                {recentNavItems.map((item) => (
                  <CommandItem
                    key={`nav-recent-${item.id}`}
                    value={`nav-recent-${item.label}`}
                    onSelect={() => go(item.to)}
                  >
                    <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{item.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {recent.length === 0 && recentNavItems.length === 0 ? (
              <CommandEmpty>Start typing to search across all modules.</CommandEmpty>
            ) : recent.length > 0 ? (
              <>
                {recentNavItems.length > 0 && <CommandSeparator />}
                <CommandGroup heading="Recently viewed">
                  {recent.slice(0, 8).map((r) => (
                    <CommandItem
                      key={`${r.entityType}:${r.entityId}`}
                      value={`recent-${r.label}`}
                      onSelect={() => go(r.href)}
                    >
                      <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{r.label}</span>
                      <span className="ml-auto text-[11px] text-muted-foreground capitalize">
                        {r.entityType}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            ) : null}
          </>
        ) : (
          <>
            {navMatches.length > 0 && (
              <CommandGroup heading="Navigation">
                {navMatches.map((item) => (
                  <CommandItem
                    key={`nav-${item.id}`}
                    value={`nav-${item.label}`}
                    onSelect={() => go(item.to)}
                  >
                    <Compass className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{item.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {isFetching && (
              <div className="px-3 py-2 text-xs text-muted-foreground">Searching…</div>
            )}
            {!isFetching && navMatches.length === 0 && (data?.length ?? 0) === 0 && (
              <CommandEmpty>No matches.</CommandEmpty>
            )}
            {GROUP_ORDER.map((g) => {
              const items = grouped.get(g);
              if (!items || items.length === 0) return null;
              return (
                <div key={g}>
                  <CommandSeparator />
                  <CommandGroup heading={items[0].groupLabel}>
                    {items.map((h) => (
                      <CommandItem
                        key={`${g}:${h.id}`}
                        value={`${g}-${h.label}-${h.id}`}
                        onSelect={() => go(h.href)}
                      >
                        <span className="truncate">{h.label}</span>
                        {h.sublabel && (
                          <span className="ml-auto truncate text-[11px] text-muted-foreground">
                            {h.sublabel}
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </div>
              );
            })}
          </>
        )}
      </CommandList>
      <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-background px-1 py-px font-mono">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-background px-1 py-px font-mono">↵</kbd>
            open
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-background px-1 py-px font-mono">esc</kbd>
            close
          </span>
        </div>
        <span className="hidden sm:inline">Stone Tech OS · Command</span>
      </div>
    </CommandDialog>
  );
}

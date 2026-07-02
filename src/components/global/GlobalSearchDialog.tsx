/** Global command-palette search. Cmd/Ctrl+K opens. */
import { useEffect, useState } from "react";
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
import { Clock } from "lucide-react";

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

  useEffect(() => subscribeRecent(() => setRecent(listRecent())), []);

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

  const go = (href: string): void => {
    onOpenChange(false);
    setQuery("");
    void navigate({ to: href });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search customers, projects, enquiries, invoices…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {query.trim().length < 2 ? (
          <>
            {recent.length === 0 ? (
              <CommandEmpty>Start typing to search across all modules.</CommandEmpty>
            ) : (
              <CommandGroup heading="Recent">
                {recent.slice(0, 8).map((r) => (
                  <CommandItem
                    key={`${r.entityType}:${r.entityId}`}
                    value={`recent-${r.label}`}
                    onSelect={() => go(r.href)}
                  >
                    <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{r.label}</span>
                    <span className="ml-auto text-xs text-muted-foreground capitalize">
                      {r.entityType}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </>
        ) : (
          <>
            {isFetching && (
              <div className="px-3 py-2 text-xs text-muted-foreground">Searching…</div>
            )}
            {!isFetching && (data?.length ?? 0) === 0 && <CommandEmpty>No matches.</CommandEmpty>}
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
                          <span className="ml-auto truncate text-xs text-muted-foreground">
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
    </CommandDialog>
  );
}

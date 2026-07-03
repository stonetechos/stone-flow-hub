/** Email-style RFQ inbox. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useMemo, useState } from "react";
import { Search, Circle, AlertCircle, CheckCircle2, FileEdit, Inbox } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { listVendorInbox, applyFilter, type InboxFilter } from "@/lib/vendor-portal/rfq";
import { toUserMessage } from "@/lib/errors";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const searchSchema = z.object({
  filter: fallback(z.enum(["all", "new", "draft", "submitted", "overdue"]), "all").default("all"),
  q: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/vendor/rfqs/")({
  validateSearch: zodValidator(searchSchema),
  component: RfqInbox,
});

const FILTERS: { key: InboxFilter; label: string; icon: typeof Circle }[] = [
  { key: "all", label: "All", icon: Inbox },
  { key: "new", label: "New", icon: Circle },
  { key: "draft", label: "Draft", icon: FileEdit },
  { key: "submitted", label: "Submitted", icon: CheckCircle2 },
  { key: "overdue", label: "Overdue", icon: AlertCircle },
];

function RfqInbox() {
  const { filter, q: qParam } = Route.useSearch();
  const [searchInput, setSearchInput] = useState(qParam);
  const debounced = useDebouncedValue(searchInput, 250);

  const list = useQuery({
    queryKey: ["vendor", "inbox"],
    queryFn: listVendorInbox,
    staleTime: 30_000,
  });

  const filtered = useMemo(
    () => (list.data ? applyFilter(list.data, filter, debounced) : []),
    [list.data, filter, debounced],
  );

  if (list.isLoading) return <LoadingBlock />;
  if (list.error)
    return <ErrorBlock message={toUserMessage(list.error)} onRetry={() => list.refetch()} />;

  const counts = list.data ?? [];
  const stats = {
    all: counts.length,
    new: counts.filter((i) => i.unread).length,
    draft: counts.filter((i) => i.hasDraft).length,
    submitted: counts.filter((i) => i.submitted).length,
    overdue: counts.filter((i) => i.overdue).length,
  };

  return (
    <div>
      <PageHeader title="RFQ Inbox" subtitle="Quotes requested by Stone Tech" />

      <div className="sticky top-0 z-20 -mx-3 mb-3 border-b border-border bg-background/95 px-3 py-2 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search RFQ or project…"
              className="pl-8"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              const count = stats[f.key];
              return (
                <Link
                  key={f.key}
                  from="/vendor/rfqs"
                  search={(prev) => ({ ...prev, filter: f.key })}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  <f.icon className="h-3 w-3" />
                  {f.label}
                  <span
                    className={cn(
                      "ml-0.5 rounded-full px-1.5 text-[10px]",
                      active ? "bg-primary/20" : "bg-muted",
                    )}
                  >
                    {count}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No RFQs match this view.
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border bg-card">
          {filtered.map((it) => (
            <li key={it.request.id}>
              <Link
                to="/vendor/rfqs/$rfqId"
                params={{ rfqId: it.request.id }}
                className={cn(
                  "flex items-start gap-3 px-3 py-3 hover:bg-muted/40 sm:items-center",
                  it.unread && "bg-primary/[0.04]",
                )}
              >
                <span
                  className={cn(
                    "mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full sm:mt-0",
                    it.unread ? "bg-primary" : "bg-transparent",
                  )}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "truncate font-medium",
                        it.unread ? "text-foreground" : "text-foreground/80",
                      )}
                    >
                      {it.projectName ?? "Untitled project"}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {it.rfq.rfq_no}
                    </span>
                    {it.overdue && (
                      <Badge variant="destructive" className="text-[10px]">
                        Overdue
                      </Badge>
                    )}
                    {it.hasDraft && !it.submitted && (
                      <Badge variant="outline" className="text-[10px]">
                        Draft
                      </Badge>
                    )}
                    {it.submitted && (
                      <Badge variant="secondary" className="text-[10px]">
                        Submitted
                      </Badge>
                    )}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {it.itemCount} {it.itemCount === 1 ? "item" : "items"}
                    {it.rfq.due_date && <> · due {it.rfq.due_date}</>}
                    {it.request.sent_at && (
                      <> · {formatDistanceToNow(new Date(it.request.sent_at))} ago</>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

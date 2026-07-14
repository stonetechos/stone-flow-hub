import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingBlock, ErrorBlock, EmptyState } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import {
  EVENT_COLORS,
  EVENT_LABELS,
  listProcurementCalendar,
  type ProcurementEventType,
} from "@/lib/procurement/calendar";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboards/procurement-calendar")({
  ssr: false,
  component: ProcurementCalendarPage,
});

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

function ProcurementCalendarPage() {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [filter, setFilter] = useState<ProcurementEventType | "all">("all");

  const from = new Date(cursor);
  const to = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);

  const query = useQuery({
    queryKey: qk.procurementCalendar(iso(from), iso(to)),
    queryFn: () => listProcurementCalendar({ from: iso(from), to: iso(to) }),
  });

  const events = useMemo(
    () =>
      (query.data ?? []).filter((e) => filter === "all" || e.event_type === filter),
    [query.data, filter],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, typeof events>();
    for (const e of events) {
      const arr = map.get(e.event_date) ?? [];
      arr.push(e);
      map.set(e.event_date, arr);
    }
    return map;
  }, [events]);

  const grid = useMemo(() => {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const firstDow = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    const cells: Array<{ date: Date | null }> = [];
    for (let i = 0; i < firstDow; i++) cells.push({ date: null });
    for (let d = 1; d <= days; d++) cells.push({ date: new Date(y, m, d) });
    while (cells.length % 7 !== 0) cells.push({ date: null });
    return cells;
  }, [cursor]);

  const monthLabel = cursor.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const types: (ProcurementEventType | "all")[] = [
    "all",
    "followup",
    "vendor_commitment",
    "customer_commitment",
    "material_arrival",
    "vendor_payment",
    "customer_payment",
    "dispatch",
  ];

  return (
    <div>
      <PageHeader
        title="Procurement Calendar"
        subtitle="Unified view: follow-ups, vendor & customer commitments, material arrivals, payments and dispatch."
      />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() =>
            setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
          }
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-40 text-center text-sm font-medium">{monthLabel}</div>
        <Button
          variant="outline"
          size="icon"
          onClick={() =>
            setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
          }
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="ml-2 flex flex-wrap gap-1">
          {types.map((t) => (
            <Button
              key={t}
              size="sm"
              variant={filter === t ? "default" : "outline"}
              className="h-7 px-2 text-xs capitalize"
              onClick={() => setFilter(t)}
            >
              {t === "all" ? "All" : EVENT_LABELS[t]}
            </Button>
          ))}
        </div>
      </div>

      {query.isLoading ? (
        <LoadingBlock />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <CalendarClock className="h-4 w-4" />
              {events.length} events this month
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Mobile: horizontally scrolls within this wrapper instead of
             * squeezing 7 columns into the viewport or overflowing the page. */}
            <div className="overflow-x-auto">
            <div className="grid min-w-[560px] grid-cols-7 gap-1 text-xs">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="p-1 text-center font-medium text-muted-foreground">
                  {d}
                </div>
              ))}
              {grid.map((c, i) => {
                if (!c.date) return <div key={i} className="min-h-24" />;
                const key = iso(c.date);
                const evs = byDay.get(key) ?? [];
                return (
                  <div
                    key={i}
                    className={cn(
                      "min-h-24 rounded-md border border-border p-1",
                      c.date.toDateString() === new Date().toDateString() &&
                        "border-primary bg-primary/5",
                    )}
                  >
                    <div className="text-[11px] font-medium text-muted-foreground">
                      {c.date.getDate()}
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {evs.slice(0, 4).map((e) => (
                        <div
                          key={`${e.event_type}-${e.id}`}
                          className={cn(
                            "truncate rounded px-1 py-0.5 text-[10px]",
                            EVENT_COLORS[e.event_type],
                          )}
                          title={`${EVENT_LABELS[e.event_type]}: ${e.title}`}
                        >
                          {e.title}
                        </div>
                      ))}
                      {evs.length > 4 && (
                        <div className="text-[10px] text-muted-foreground">
                          +{evs.length - 4} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            </div>

            {events.length === 0 && (
              <EmptyState
                icon={<CalendarClock className="h-6 w-6" />}
                title="Nothing scheduled"
                message="No procurement events this month."
              />
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {(
                [
                  "followup",
                  "vendor_commitment",
                  "customer_commitment",
                  "material_arrival",
                  "vendor_payment",
                  "customer_payment",
                  "dispatch",
                ] as ProcurementEventType[]
              ).map((t) => (
                <Badge key={t} variant="outline" className={cn("border-0", EVENT_COLORS[t])}>
                  {EVENT_LABELS[t]}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

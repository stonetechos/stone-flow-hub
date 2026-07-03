import { createFileRoute, Link } from "@tanstack/react-router";
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
import { listFollowups } from "@/lib/followups/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/calendar")({
  ssr: false,
  component: CalendarPage,
});

function CalendarPage() {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const query = useQuery({
    queryKey: [...qk.followups.all, "calendar"] as const,
    queryFn: () => listFollowups("all"),
  });

  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const grid = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ date: Date | null }> = [];
    for (let i = 0; i < firstDow; i++) cells.push({ date: null });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(year, month, d) });
    while (cells.length % 7 !== 0) cells.push({ date: null });
    return cells;
  }, [cursor]);

  const byDay = useMemo(() => {
    const map = new Map<
      string,
      typeof query.data extends undefined ? never : NonNullable<typeof query.data>
    >();
    for (const f of query.data ?? []) {
      const key = new Date(f.scheduled_at).toDateString();
      const arr = (map.get(key) ?? []) as NonNullable<typeof query.data>;
      arr.push(f);
      map.set(key, arr);
    }
    return map;
  }, [query.data]);

  const today = new Date().toDateString();

  return (
    <div>
      <PageHeader
        title="Calendar"
        subtitle="Scheduled follow-ups and events across your projects."
        actions={
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous month"
              onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-40 text-center text-sm font-medium">{monthLabel}</div>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next month"
              onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="ml-2"
              onClick={() => {
                const d = new Date();
                d.setDate(1);
                d.setHours(0, 0, 0, 0);
                setCursor(d);
              }}
            >
              Today
            </Button>
          </div>
        }
      />

      {query.isLoading ? (
        <LoadingBlock />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : (
        <Card className="shadow-1">
          <CardHeader>
            <CardTitle className="text-sm">{monthLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-px rounded-sm border border-border bg-border text-sm">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div
                  key={d}
                  className="bg-muted px-2 py-1 text-xs font-medium text-muted-foreground"
                >
                  {d}
                </div>
              ))}
              {grid.map((cell, i) => {
                const key = cell.date?.toDateString();
                const items = key ? (byDay.get(key) ?? []) : [];
                const isToday = key === today;
                return (
                  <div
                    key={i}
                    className={cn("min-h-24 bg-card p-1.5", !cell.date && "bg-muted/40")}
                  >
                    {cell.date && (
                      <>
                        <div
                          className={cn(
                            "mb-1 text-xs font-medium",
                            isToday &&
                              "inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground",
                          )}
                        >
                          {cell.date.getDate()}
                        </div>
                        <div className="space-y-0.5">
                          {items.slice(0, 3).map((f) => (
                            <Link
                              key={f.id}
                              to="/enquiries/$enquiryId"
                              params={{ enquiryId: f.enquiry_id ?? "" }}
                              className="block truncate rounded-sm bg-primary/10 px-1.5 py-0.5 text-[11px] text-primary hover:bg-primary/20"
                              title={f.notes ?? f.channel}
                            >
                              {new Date(f.scheduled_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}{" "}
                              {f.notes ?? f.channel}
                            </Link>
                          ))}
                          {items.length > 3 && (
                            <div className="text-[11px] text-muted-foreground">
                              +{items.length - 3} more
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mt-4 shadow-1">
        <CardHeader>
          <CardTitle className="text-sm">Upcoming follow-ups</CardTitle>
        </CardHeader>
        <CardContent>
          {(query.data ?? [])
            .filter((f) => new Date(f.scheduled_at) >= new Date() && f.status === "pending")
            .slice(0, 10).length === 0 ? (
            <EmptyState
              icon={<CalendarClock className="h-6 w-6" />}
              title="Nothing scheduled"
              message="Create follow-ups from an enquiry to see them here."
            />
          ) : (
            <ul className="divide-y divide-border">
              {(query.data ?? [])
                .filter((f) => new Date(f.scheduled_at) >= new Date() && f.status === "pending")
                .slice(0, 10)
                .map((f) => (
                  <li key={f.id} className="flex items-center justify-between py-2 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{f.notes ?? f.channel}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(f.scheduled_at).toLocaleString()} •{" "}
                        {f.enquiry?.project?.name ?? "—"}
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {f.status}
                    </Badge>
                  </li>
                ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

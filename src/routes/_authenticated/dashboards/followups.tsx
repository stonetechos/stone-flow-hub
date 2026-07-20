/** Follow-up Dashboard — buckets + lists. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, AlertTriangle, Clock, Star, Ban } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { getFollowupBuckets } from "@/lib/lead-analytics/api";
import { listFollowups } from "@/lib/followups/api";
import { toUserMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboards/followups")({
  ssr: false,
  component: FollowupsDashboard,
});

function FollowupsDashboard() {
  const buckets = useQuery({
    queryKey: ["lead-analytics", "followup-buckets"],
    queryFn: getFollowupBuckets,
    staleTime: 30_000,
  });
  const today = useQuery({
    queryKey: ["followups", "scope", "today"],
    queryFn: () => listFollowups("today"),
  });
  const pending = useQuery({
    queryKey: ["followups", "scope", "pending"],
    queryFn: () => listFollowups("pending"),
  });

  if (buckets.isLoading || !buckets.data)
    return (
      <>
        <PageHeader title="Follow-up Dashboard" />
        <LoadingBlock />
      </>
    );
  if (buckets.error)
    return (
      <>
        <PageHeader title="Follow-up Dashboard" />
        <ErrorBlock message={toUserMessage(buckets.error)} onRetry={() => buckets.refetch()} />
      </>
    );
  const b = buckets.data!;
  const todayIso = new Date();
  todayIso.setHours(0, 0, 0, 0);
  const overdueList = (pending.data ?? [])
    .filter((f) => new Date(f.scheduled_at) < todayIso)
    .slice(0, 10);

  return (
    <div>
      <PageHeader
        title="Follow-up Dashboard"
        subtitle="What needs to happen today, what's slipping, what's coming up."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Bucket
          label="Today"
          value={b.today}
          icon={<CalendarClock className="h-4 w-4" />}
          tone="info"
          to="/followups"
          search={{ scope: "today" }}
        />
        <Bucket
          label="Overdue"
          value={b.overdue}
          icon={<AlertTriangle className="h-4 w-4" />}
          tone="danger"
          to="/followups"
          search={{ scope: "pending" }}
        />
        <Bucket
          label="Upcoming (7d)"
          value={b.upcoming7}
          icon={<Clock className="h-4 w-4" />}
          tone="muted"
          to="/followups"
        />
        <Bucket
          label="High Priority"
          value={b.highPriority}
          icon={<Star className="h-4 w-4" />}
          tone="warn"
          to="/enquiries"
        />
        <Bucket
          label="No Follow-up"
          value={b.noFollowup}
          icon={<Ban className="h-4 w-4" />}
          tone="muted"
          to="/enquiries"
        />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <ListCard
          title="Today's follow-ups"
          items={today.data ?? []}
          emptyText="Nothing scheduled today."
        />
        <ListCard title="Overdue" items={overdueList} emptyText="Nothing overdue — great job." />
      </div>
    </div>
  );
}

type Tone = "info" | "danger" | "warn" | "muted";
function tclass(t: Tone) {
  return t === "danger"
    ? "border-destructive/40 bg-destructive/5"
    : t === "warn"
      ? "border-warning/40 bg-warning/5"
      : t === "info"
        ? "border-primary/25 bg-primary/5"
        : "border-border bg-card";
}
function Bucket({
  label,
  value,
  icon,
  tone,
  to,
  search,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: Tone;
  to: string;
  search?: Record<string, string>;
}) {
  return (
    <Link to={to} search={search as never} className="block">
      <div
        className={cn(
          "rounded-lg border px-3 py-3 transition-shadow hover:shadow-md",
          tclass(tone),
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
          <span className="text-primary">{icon}</span>
        </div>
        <div className="mt-0.5 font-display text-3xl font-bold">{value}</div>
      </div>
    </Link>
  );
}

function ListCard({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: Awaited<ReturnType<typeof listFollowups>>;
  emptyText: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <ul className="max-h-[340px] space-y-1 overflow-y-auto pr-1">
            {items.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">
                    {f.enquiry?.customer?.name ?? "—"} ·{" "}
                    <span className="font-mono text-xs text-muted-foreground">
                      {f.enquiry?.enquiry_no ?? "—"}
                    </span>
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {new Date(f.scheduled_at).toLocaleString("en-IN", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}{" "}
                    · {f.channel.replace("_", " ")}
                  </div>
                </div>
                <Link to="/followups" className="text-xs text-primary hover:underline">
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

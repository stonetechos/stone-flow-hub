import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, Sparkles, Send, RefreshCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingBlock } from "@/components/layout/States";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  listPaymentDashboard,
  generateRemindersNow,
  type PaymentScheduleDashboardRow,
} from "@/lib/customer-payments/schedule";
import { rankCollectionPriorities, summariseInflow } from "@/lib/customer-payments/collection";
import { formatInr } from "@/lib/format";
import { toUserMessage } from "@/lib/errors";

export const Route = createFileRoute("/_authenticated/dashboards/collections")({
  ssr: false,
  component: CollectionsDashboard,
});

const RISK_TONE: Record<string, string> = {
  critical: "bg-destructive/10 text-destructive",
  high: "bg-amber-500/10 text-amber-700",
  medium: "bg-teal-500/10 text-teal-700",
  low: "bg-muted text-foreground",
};

function CollectionsDashboard() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["customer-payments", "dashboard"],
    queryFn: listPaymentDashboard,
    staleTime: 30_000,
  });

  const remindMut = useMutation({
    mutationFn: generateRemindersNow,
    onSuccess: (n) => {
      toast.success(`Queued ${n} reminder${n === 1 ? "" : "s"}`);
      qc.invalidateQueries({ queryKey: ["customer-payments"] });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  if (q.isLoading) return <LoadingBlock />;
  const rows = q.data ?? [];
  const priorities = rankCollectionPriorities(rows);
  const inflow = summariseInflow(priorities);

  const byBucket = (b: PaymentScheduleDashboardRow["bucket"]) => rows.filter((r) => r.bucket === b);
  const overdueRows = byBucket("overdue");
  const todayRows = byBucket("due_today");
  const weekRows = byBucket("due_week");
  const upcomingRows = byBucket("upcoming");

  return (
    <div>
      <PageHeader
        title="Customer Payment Dashboard"
        subtitle="Collections priority, cash flow forecast, and reminder automation."
        actions={
          <Button size="sm" onClick={() => remindMut.mutate()} disabled={remindMut.isPending}>
            {remindMut.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="mr-2 h-4 w-4" />
            )}
            Run reminder cycle
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Due today"
          value={inflow.today}
          tone="text-amber-700"
          count={todayRows.length}
        />
        <Stat
          label="Due this week"
          value={inflow.week}
          tone="text-teal-700"
          count={todayRows.length + weekRows.length}
        />
        <Stat
          label="Overdue"
          value={inflow.overdue}
          tone="text-destructive"
          count={overdueRows.length}
        />
        <Stat label="Upcoming" value={inflow.upcoming} count={upcomingRows.length} />
      </div>

      <Card className="mt-4 shadow-1">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> AI Collection Priority
          </CardTitle>
        </CardHeader>
        <CardContent>
          {priorities.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No outstanding milestones. You are up to date.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Milestone</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Recommended action</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {priorities.slice(0, 20).map((p, idx) => (
                  <TableRow key={p.row.id}>
                    <TableCell className="font-mono text-xs">{idx + 1}</TableCell>
                    <TableCell className="text-sm">
                      <Link
                        to="/customers/$customerId"
                        params={{ customerId: p.row.customer_id }}
                        className="hover:underline"
                      >
                        <div className="font-medium">{p.row.customer_name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.row.project_name ?? ""}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">
                      #{p.row.milestone_no} · {p.row.label}
                    </TableCell>
                    <TableCell className="text-sm">
                      {p.row.due_date ?? "—"}
                      <div className="text-[11px] text-muted-foreground">
                        {p.row.days_to_due != null &&
                          (p.row.days_to_due < 0
                            ? `${Math.abs(p.row.days_to_due)} d late`
                            : `in ${p.row.days_to_due} d`)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{formatInr(p.row.balance_due)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`capitalize ${RISK_TONE[p.risk]}`}>
                        {p.risk}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{p.strategy}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {p.reason.join(" · ")}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        to="/customers/$customerId"
                        params={{ customerId: p.row.customer_id }}
                        search={{ tab: "payments" }}
                      >
                        <Button size="sm" variant="ghost">
                          <Send className="mr-1 h-3 w-3" /> Open
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <BucketList
          title="Overdue"
          icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
          rows={overdueRows}
        />
        <BucketList
          title="Due this week"
          icon={<CalendarClock className="h-4 w-4 text-teal-700" />}
          rows={[...todayRows, ...weekRows]}
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  count,
}: {
  label: string;
  value: number;
  tone?: string;
  count: number;
}) {
  return (
    <Card className="shadow-1">
      <CardContent className="p-3">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={`text-xl font-semibold ${tone ?? ""}`}>{formatInr(value)}</div>
        <div className="text-[11px] text-muted-foreground">
          {count} milestone{count === 1 ? "" : "s"}
        </div>
      </CardContent>
    </Card>
  );
}

function BucketList({
  title,
  icon,
  rows,
}: {
  title: string;
  icon: React.ReactNode;
  rows: PaymentScheduleDashboardRow[];
}) {
  return (
    <Card className="shadow-1">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          {icon} {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing here.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between text-sm border-b border-border/50 pb-1"
              >
                <div>
                  <Link
                    to="/customers/$customerId"
                    params={{ customerId: r.customer_id }}
                    className="font-medium hover:underline"
                  >
                    {r.customer_name}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {r.project_name} · {r.label}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{formatInr(r.balance_due)}</div>
                  <div className="text-[11px] text-muted-foreground">{r.due_date}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * BusinessTimeline — Phase G.10 shared timeline UI.
 *
 * One rendering component for `TimelineEvent[]`, generalized from
 * `vendors/$vendorId.timeline.tsx`'s original EventCard/kindIcon pattern
 * (same vertical rail, icon-in-circle, Card-per-event look) so every
 * consumer — Customer, Project, Vendor, and the generic per-entity
 * fallback in DetailPanels.tsx — renders history identically. Per Task 5:
 * chronological, filterable by kind, collapsible past a threshold so a
 * busy customer/project doesn't dump 100 rows on screen at once, and
 * never invents anything — it only ever renders events it was given.
 */
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  Boxes,
  CheckSquare,
  ClipboardList,
  FileText,
  History,
  PackageCheck,
  Send,
  ShoppingCart,
  Truck,
  Wallet,
  Wrench,
} from "lucide-react";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatInr } from "@/lib/format";
import { toUserMessage } from "@/lib/errors";
import type { TimelineEvent, TimelineEventKind } from "@/lib/timeline/types";

const KIND_LABELS: Record<TimelineEventKind, string> = {
  activity: "Activity",
  enquiry: "Enquiries",
  quote: "Quotations",
  sales_order: "Sales Orders",
  purchase_order: "Purchase Orders",
  invoice: "Invoices",
  receipt: "Payments",
  dispatch: "Dispatch",
  installation: "Installation",
  task: "Tasks",
  followup: "Follow-ups",
  rfq_sent: "RFQs",
  vendor_quote: "Vendor Quotes",
  ledger: "Ledger",
};

function kindIcon(kind: TimelineEventKind) {
  switch (kind) {
    case "enquiry":
      return <ClipboardList className="h-3 w-3" />;
    case "quote":
      return <FileText className="h-3 w-3" />;
    case "sales_order":
      return <ShoppingCart className="h-3 w-3" />;
    case "purchase_order":
      return <ShoppingCart className="h-3 w-3" />;
    case "invoice":
      return <FileText className="h-3 w-3" />;
    case "receipt":
      return <Wallet className="h-3 w-3" />;
    case "dispatch":
      return <Truck className="h-3 w-3" />;
    case "installation":
      return <Wrench className="h-3 w-3" />;
    case "task":
      return <CheckSquare className="h-3 w-3" />;
    case "followup":
      return <History className="h-3 w-3" />;
    case "rfq_sent":
      return <Send className="h-3 w-3" />;
    case "vendor_quote":
      return <FileText className="h-3 w-3" />;
    case "ledger":
      return <Boxes className="h-3 w-3" />;
    case "activity":
    default:
      return <Activity className="h-3 w-3" />;
  }
}

function EventCard({ ev }: { ev: TimelineEvent }) {
  const icon = kindIcon(ev.kind);
  const at = new Date(ev.at);
  const isDanger = ev.severity === "danger";
  const isWarning = ev.severity === "warning";
  return (
    <li className="relative">
      <span
        className={cn(
          "absolute -left-[34px] mt-1 grid h-6 w-6 place-items-center rounded-full border bg-background text-muted-foreground",
          isDanger && "border-destructive/50 text-destructive",
          isWarning && "border-amber-500/50 text-amber-600",
          !isDanger && !isWarning && "border-border",
        )}
      >
        {icon}
      </span>
      <Card className={cn("shadow-1", isDanger && "border-destructive/30")}>
        <CardContent className="flex flex-col gap-1 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">
              {ev.route ? (
                <Link to={ev.route} className="hover:underline">
                  {ev.title}
                </Link>
              ) : (
                ev.title
              )}
            </span>
            {ev.status && <Badge variant="outline">{ev.status}</Badge>}
            {isWarning && (
              <Badge variant="outline" className="gap-1 border-amber-500/50 text-amber-600">
                <AlertTriangle className="h-3 w-3" /> Attention
              </Badge>
            )}
            {ev.amount != null && ev.amount !== 0 && (
              <Badge variant="secondary" className="tabular-nums">
                {formatInr(ev.amount)}
              </Badge>
            )}
          </div>
          {ev.detail && <p className="text-sm text-muted-foreground">{ev.detail}</p>}
          <p className="text-xs text-muted-foreground">{at.toLocaleString()}</p>
        </CardContent>
      </Card>
    </li>
  );
}

export function BusinessTimeline({
  events,
  isLoading,
  error,
  onRetry,
  pageSize = 15,
  emptyTitle = "No activity yet",
  emptyMessage = "Nothing has happened here yet — this view fills in automatically as work happens.",
}: {
  events: TimelineEvent[] | undefined;
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  pageSize?: number;
  emptyTitle?: string;
  emptyMessage?: string;
}) {
  const [kindFilter, setKindFilter] = useState<TimelineEventKind | "all">("all");
  const [visible, setVisible] = useState(pageSize);

  const kindsPresent = useMemo(() => {
    const set = new Set<TimelineEventKind>();
    for (const e of events ?? []) set.add(e.kind);
    return Array.from(set).sort((a, b) => KIND_LABELS[a].localeCompare(KIND_LABELS[b]));
  }, [events]);

  const filtered = useMemo(() => {
    const all = events ?? [];
    return kindFilter === "all" ? all : all.filter((e) => e.kind === kindFilter);
  }, [events, kindFilter]);

  if (isLoading) return <SkeletonTable rows={6} columns={2} />;
  if (error) return <ErrorBlock message={toUserMessage(error)} onRetry={onRetry} />;
  if ((events ?? []).length === 0) {
    return (
      <EmptyState
        icon={<History className="h-6 w-6" />}
        title={emptyTitle}
        message={emptyMessage}
      />
    );
  }

  const shown = filtered.slice(0, visible);
  const hasMore = filtered.length > shown.length;

  return (
    <div className="space-y-4">
      {kindsPresent.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <Button
            size="sm"
            variant={kindFilter === "all" ? "secondary" : "ghost"}
            className="h-7 px-2.5 text-xs"
            onClick={() => {
              setKindFilter("all");
              setVisible(pageSize);
            }}
          >
            All
          </Button>
          {kindsPresent.map((k) => (
            <Button
              key={k}
              size="sm"
              variant={kindFilter === k ? "secondary" : "ghost"}
              className="h-7 px-2.5 text-xs"
              onClick={() => {
                setKindFilter(k);
                setVisible(pageSize);
              }}
            >
              {KIND_LABELS[k]}
            </Button>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <p className="text-xs text-muted-foreground">No events of this type.</p>
      ) : (
        <ol className="relative ml-3 space-y-4 border-l border-border pl-6">
          {shown.map((ev) => (
            <EventCard key={ev.id} ev={ev} />
          ))}
        </ol>
      )}

      {hasMore && (
        <div className="pl-6">
          <Button variant="outline" size="sm" onClick={() => setVisible((v) => v + pageSize)}>
            Show more ({filtered.length - shown.length} more)
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Next follow-up chip / card. Clicking it opens the follow-up in the
 * Follow-ups module. Shows "Overdue" prominently when past scheduled time.
 */
import { Link } from "@tanstack/react-router";
import { CalendarClock, AlertOctagon, User } from "lucide-react";
import type { EnquirySignal } from "@/lib/lead-stage/signals";

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  return { date, time };
}

export function NextFollowupChip({
  next,
  assigneeName,
  compact = false,
}: {
  next: EnquirySignal["next_followup"];
  assigneeName?: string | null;
  compact?: boolean;
}) {
  if (!next) {
    if (compact) return <span className="text-xs text-muted-foreground">—</span>;
    return (
      <div className="rounded-md border border-dashed border-border px-2 py-1.5 text-xs text-muted-foreground">
        No follow-up scheduled
      </div>
    );
  }
  const overdue = new Date(next.scheduled_at).getTime() < Date.now();
  const { date, time } = fmtDateTime(next.scheduled_at);
  const cls = overdue
    ? "border-destructive/40 bg-destructive/10 text-destructive"
    : "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10";
  const Icon = overdue ? AlertOctagon : CalendarClock;

  return (
    <Link
      to="/followups/$id"
      params={{ id: next.id }}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] ${cls}`}
      title={overdue ? "Overdue follow-up — click to open" : "Next follow-up — click to open"}
    >
      <Icon className="h-3 w-3" />
      {overdue ? <span className="font-semibold">Overdue</span> : null}
      <span>{date} · {time}</span>
      {!compact && assigneeName ? (
        <span className="inline-flex items-center gap-0.5 text-muted-foreground">
          <User className="h-3 w-3" /> {assigneeName}
        </span>
      ) : null}
    </Link>
  );
}

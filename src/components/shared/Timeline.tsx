/**
 * Timeline — chronological list primitive. Used by activity feeds, comment
 * threads, entity histories and dashboard "Recent activity" cards. Renders
 * a left rail with dots + hairline connector; consumers own the item body.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TimelineItem {
  id: string;
  /** Small icon or letter shown in the rail dot. */
  marker?: ReactNode;
  /** Colour tone for the dot. */
  tone?: "default" | "muted" | "positive" | "warning" | "danger" | "info";
  title: ReactNode;
  meta?: ReactNode;
  body?: ReactNode;
  actions?: ReactNode;
}

const TONE = {
  default: "bg-foreground/70",
  muted: "bg-muted-foreground/50",
  positive: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-destructive",
  info: "bg-sky-500",
} as const;

export function Timeline({
  items,
  empty = "Nothing to show yet.",
  className,
}: {
  items: TimelineItem[];
  empty?: ReactNode;
  className?: string;
}) {
  if (items.length === 0) {
    return <p className="py-6 text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <ol className={cn("relative space-y-4", className)}>
      <span
        aria-hidden
        className="absolute left-[7px] top-2 bottom-2 w-px bg-border"
      />
      {items.map((it) => (
        <li key={it.id} className="relative flex gap-3 pl-6">
          <span
            aria-hidden
            className={cn(
              "absolute left-0 top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full ring-2 ring-background",
              TONE[it.tone ?? "default"],
            )}
          >
            {it.marker ? (
              <span className="text-[9px] font-semibold leading-none text-background">
                {it.marker}
              </span>
            ) : null}
          </span>
          <div className="flex-1 space-y-0.5">
            <div className="flex items-baseline justify-between gap-3">
              <div className="text-sm text-foreground">{it.title}</div>
              {it.meta && (
                <div className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {it.meta}
                </div>
              )}
            </div>
            {it.body && <div className="text-sm text-muted-foreground">{it.body}</div>}
            {it.actions && <div className="pt-1">{it.actions}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}

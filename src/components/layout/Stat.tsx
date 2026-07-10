import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

/**
 * Stat — compact, typographic KPI.
 *
 * A borderless label + big number pattern. No tiles, no colored blocks.
 * Optional `hint` (delta or context) and optional `to` to make the whole
 * stat click through to a source view.
 */
export type StatTone = "default" | "primary" | "success" | "warning" | "danger" | "info";

const toneClass: Record<StatTone, string> = {
  default: "text-foreground",
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning-foreground",
  danger: "text-destructive",
  info: "text-info",
};

export function Stat({
  label,
  value,
  hint,
  icon,
  tone = "default",
  to,
  search,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: StatTone;
  to?: string;
  search?: Record<string, string>;
  className?: string;
}) {
  const body = (
    <div className={cn("group flex flex-col gap-1", className)}>
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {icon && <span className="opacity-70">{icon}</span>}
        <span className="truncate">{label}</span>
      </div>
      <div
        className={cn(
          "font-display text-[26px] font-semibold leading-none tracking-tight tabular-nums",
          toneClass[tone],
        )}
      >
        {value}
      </div>
      {hint && (
        <div className="text-xs text-muted-foreground">{hint}</div>
      )}
    </div>
  );
  if (to) {
    return (
      <Link
        to={to}
        search={search as never}
        className="block rounded-md p-1 -m-1 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {body}
      </Link>
    );
  }
  return body;
}

/** Row of stats separated by hairline vertical dividers on wider viewports. */
export function StatRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-6",
        "sm:divide-x sm:divide-border sm:[&>*]:pl-6 sm:[&>*:first-child]:pl-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

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
  const isDefaultTone = tone === "default" || tone === "primary";
  const body = (
    <div
      className={cn(
        "card-3d-milky group flex flex-col gap-1.5 p-4 shadow-2xs transition-transform hover:-translate-y-0.5",
        className,
      )}
    >
      <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-engraved-kicker">
        {icon && <span className="opacity-80 text-cyan-700">{icon}</span>}
        <span className="truncate">{label}</span>
      </div>
      <div
        className={cn(
          "font-display text-[26px] font-black leading-none tracking-tight tabular-nums",
          isDefaultTone ? "text-engraved-blue-lg" : toneClass[tone],
        )}
      >
        {value}
      </div>
      {hint && <div className="text-xs font-medium text-slate-500">{hint}</div>}
    </div>
  );
  if (to) {
    return (
      <Link
        to={to}
        search={search as never}
        className="block rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2"
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

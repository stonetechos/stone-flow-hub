import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * PageHeader — the primary page title area.
 *
 * Typographic hero. No card, no divider, no shadow. Establishes hierarchy
 * with a large display heading, a muted subtitle, and right-aligned
 * actions. Renders responsively — actions wrap under the title on
 * narrow viewports.
 */
export function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  className,
}: {
  title: string;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:flex sm:flex-wrap sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-engraved-kicker">
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-2xl font-black tracking-tight text-engraved-title sm:text-[28px] truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 truncate text-xs sm:text-sm font-medium text-slate-500">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>}
    </div>
  );
}

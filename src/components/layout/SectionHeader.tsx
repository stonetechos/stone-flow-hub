import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * SectionHeader — typographic section heading, no card wrapper.
 *
 * Establishes hierarchy through weight and spacing rather than boxes.
 * Optional `eyebrow` (uppercase micro-label), `description` (muted
 * subline), and right-aligned `actions`.
 */
export function SectionHeader({
  title,
  eyebrow,
  description,
  actions,
  className,
  as: Tag = "h2",
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  as?: "h2" | "h3";
}) {
  return (
    <div className={cn("mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {eyebrow}
          </div>
        )}
        <Tag
          className={cn(
            "font-display font-semibold tracking-tight text-foreground",
            Tag === "h2" ? "text-base" : "text-sm",
          )}
        >
          {title}
        </Tag>
        {description && (
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>}
    </div>
  );
}

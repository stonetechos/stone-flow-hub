/**
 * ActionChip — pill-shaped compact action button. Used for quick-action
 * shortcuts on dashboards and detail pages, and as a lightweight alternative
 * to <Button variant="outline" size="sm"> when several actions cluster.
 */
import { Link, type LinkProps } from "@tanstack/react-router";
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

const BASE =
  "inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none";

type ChipContent = { icon?: ReactNode; children: ReactNode };

export function ActionChip({
  icon,
  children,
  className,
  ...rest
}: ChipContent & ComponentPropsWithoutRef<"button"> & { className?: string }) {
  return (
    <button type="button" className={cn(BASE, className)} {...rest}>
      {icon}
      {children}
    </button>
  );
}

/** Anchor variant — for external links only. Use ActionChipLink for router nav. */
export function ActionChipAnchor({
  icon,
  children,
  className,
  ...rest
}: ChipContent & ComponentPropsWithoutRef<"a"> & { className?: string }) {
  return (
    <a className={cn(BASE, className)} {...rest}>
      {icon}
      {children}
    </a>
  );
}

/** Router-link variant. Pass Link props (to / params / search). */
export function ActionChipLink({
  icon,
  children,
  className,
  ...rest
}: ChipContent & LinkProps & { className?: string }) {
  const As = Link as unknown as ElementType;
  return (
    <As className={cn(BASE, className)} {...rest}>
      {icon}
      {children}
    </As>
  );
}

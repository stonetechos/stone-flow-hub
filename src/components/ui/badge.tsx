import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Stone Tech OS badge — Phase D.
 *
 * Soft, tinted pill by default — never a saturated block. Status variants
 * read from the semantic `--status-*` token trio (fg / bg / border) so
 * every theme (Quarry, Foundry, Executive, Atelier) recolours in step.
 *
 *  - `default`     mint-tinted (matches primary hue)
 *  - `secondary`   neutral panel
 *  - `outline`     hairline, transparent (for meta)
 *  - `success | warning | info | destructive`   status trio
 *  - `solid`       filled primary (rare — for counters / notification dots)
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--intent-focus-ring)] focus-visible:ring-offset-1 [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[oklch(from_var(--intent-primary)_l_c_h_/_0.12)] text-[var(--intent-primary-active)]",
        secondary: "border-border-subtle bg-surface-panel text-foreground/80",
        destructive: "border-status-danger-border bg-status-danger-bg text-status-danger-fg",
        success: "border-status-success-border bg-status-success-bg text-status-success-fg",
        warning: "border-status-warning-border bg-status-warning-bg text-status-warning-fg",
        info: "border-status-info-border bg-status-info-bg text-status-info-fg",
        outline: "border-border-default bg-transparent text-muted-foreground",
        solid: "border-transparent bg-primary text-primary-foreground",
      },
      size: {
        default: "px-2 py-0.5 text-[11px]",
        sm: "px-1.5 py-0 text-[10px]",
        lg: "px-2.5 py-1 text-xs",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { Badge, badgeVariants };

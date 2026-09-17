import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * STOS card — Phase D.
 *
 * Quiet by default: hairline border on the card surface, zero shadow.
 * Variants let modules opt in to more prominent grouping without
 * reaching for ad-hoc classNames:
 *
 *  - `default`     hairline + card surface
 *  - `subtle`      panel surface, no border (for inline groupings)
 *  - `elevated`    e2 shadow (dialogs / popovers already handle this
 *                  themselves — use here only for standalone cards)
 *  - `interactive` hairline + hover lift (border strengthens on hover)
 */
const cardVariants = cva("text-card-foreground", {
  variants: {
    variant: {
      default: "card-3d-milky",
      subtle: "rounded-xl bg-surface-panel",
      elevated: "card-3d-milky shadow-e2",
      interactive:
        "card-3d-milky cursor-pointer transition-[border-color,box-shadow,transform] duration-[var(--duration-base)] ease-[var(--ease-out)] hover:border-cyan-400 hover:shadow-e2 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--intent-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div ref={ref} className={cn(cardVariants({ variant }), className)} {...props} />
  ),
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col space-y-1.5 px-5 pt-4 pb-3 border-b border-cyan-50/60",
        className,
      )}
      {...props}
    />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "font-display text-[16px] font-bold leading-none tracking-tight text-engraved-title",
        className,
      )}
      {...props}
    />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-xs font-medium text-slate-500", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("px-5 py-4", className)} {...props} />
  ),
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center border-t border-cyan-50/60 px-5 py-3", className)}
      {...props}
    />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants };

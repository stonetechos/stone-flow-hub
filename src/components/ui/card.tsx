import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Stone Tech OS card — Phase D.
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
const cardVariants = cva("rounded-lg text-card-foreground", {
  variants: {
    variant: {
      default: "border border-border bg-card",
      subtle: "bg-surface-panel",
      elevated: "border border-border-subtle bg-card shadow-e2",
      interactive:
        "border border-border bg-card cursor-pointer transition-[border-color,box-shadow] duration-[var(--duration-base)] ease-[var(--ease-out)] hover:border-border-strong hover:shadow-e2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--intent-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
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
    <div ref={ref} className={cn("flex flex-col space-y-1 px-5 pt-4 pb-3", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "font-display text-[15px] font-semibold leading-none tracking-tight text-foreground",
        className,
      )}
      {...props}
    />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("px-5 pb-4 pt-0", className)} {...props} />
  ),
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center border-t border-border-subtle px-5 py-3", className)}
      {...props}
    />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants };

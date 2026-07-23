import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * STOS button — Phase D refinement.
 *
 * Rules
 *  - `default` (mint) is the ONE primary action per screen.
 *  - `soft` and `subtle` are the promoted secondary tiers — they read as
 *    interactive without stealing hierarchy from the primary.
 *  - `outline` / `ghost` stay for the very quiet cases (toolbars, filters).
 *  - Elevation is a hairline border, never a shadow. The only shadow
 *    a button ever earns is the focus ring.
 *  - Focus ring uses `--intent-focus-ring` (mint) at 2px with a 2px
 *    offset — visible on every surface, both themes.
 *  - Icon-only buttons keep a 36–40px hit target; primary CTAs on mobile
 *    should pair with `min-h-11` (44px) at the call site.
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap select-none",
    "rounded-md text-sm font-medium leading-none cursor-pointer",
    "transition-[background-color,border-color,color,box-shadow,transform]",
    "duration-[var(--duration-fast)] ease-[var(--ease-out)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--intent-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed",
    "active:translate-y-px",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-[var(--intent-primary-hover)] active:bg-[var(--intent-primary-active)]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-border-default bg-transparent text-foreground hover:bg-[var(--intent-ghost-hover)] hover:border-border-strong",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        soft: "bg-[oklch(from_var(--intent-primary)_l_c_h_/_0.12)] text-[var(--intent-primary-active)] hover:bg-[oklch(from_var(--intent-primary)_l_c_h_/_0.18)]",
        subtle: "bg-surface-panel text-foreground hover:bg-[var(--intent-ghost-hover)]",
        ghost: "text-foreground hover:bg-[var(--intent-ghost-hover)]",
        link: "text-[var(--text-link)] underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        default: "h-[34px] px-3.5 py-1.5",
        xs: "h-7 rounded px-2 text-[11px] gap-1.5 [&_svg]:size-3.5",
        sm: "h-[30px] rounded-md px-3 text-xs",
        lg: "h-[38px] rounded-md px-6",
        xl: "h-11 rounded-md px-7 text-[15px]",
        icon: "h-[34px] w-[34px]",
        "icon-sm": "h-8 w-8 rounded-md [&_svg]:size-3.5",
        "icon-lg": "h-11 w-11 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

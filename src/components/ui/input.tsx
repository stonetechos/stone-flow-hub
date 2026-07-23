import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * STOS input — Phase D.
 *
 * Hairline on card surface, hover strengthens the border, focus paints a
 * 2px mint ring using --intent-focus-ring so it lives on top of any
 * background (light, dark, hero panels). Placeholder uses --text-muted.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-border-default bg-surface-card px-3 py-1.5 text-sm text-foreground",
          "transition-[border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out)]",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-muted-foreground/80",
          "hover:border-border-strong",
          "focus-visible:outline-none focus-visible:border-[var(--intent-focus-ring)] focus-visible:ring-2 focus-visible:ring-[var(--intent-focus-ring)]/25",
          "aria-invalid:border-status-danger-border aria-invalid:focus-visible:border-status-danger-border aria-invalid:focus-visible:ring-status-danger-border/30",
          "disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-surface-disabled",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };

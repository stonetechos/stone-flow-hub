import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[72px] w-full rounded-md border border-border-default bg-surface-card px-3 py-2 text-sm text-foreground",
          "transition-[border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out)]",
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
Textarea.displayName = "Textarea";

export { Textarea };

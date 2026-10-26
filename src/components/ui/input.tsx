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
  ({ className, type, onFocus, onMouseUp, onChange, ...props }, ref) => {
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      const isNumeric =
        type === "number" || props.inputMode === "numeric" || props.inputMode === "decimal";
      if (isNumeric) {
        if (e.currentTarget.value === "0") {
          try {
            e.currentTarget.select();
          } catch {
            /* ignore */
          }
        } else {
          try {
            const len = e.currentTarget.value.length;
            e.currentTarget.setSelectionRange(len, len);
          } catch {
            /* ignore */
          }
        }
      }
      onFocus?.(e);
    };

    const handleMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
      const isNumeric =
        type === "number" || props.inputMode === "numeric" || props.inputMode === "decimal";
      if (isNumeric && e.currentTarget.value === "0") {
        if (e.currentTarget.selectionStart === 0 && e.currentTarget.selectionEnd === 0) {
          try {
            e.currentTarget.select();
          } catch {
            /* ignore */
          }
        }
      }
      onMouseUp?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const isNumeric =
        type === "number" || props.inputMode === "numeric" || props.inputMode === "decimal";
      if (isNumeric && typeof e.target.value === "string") {
        // Strip unwanted leading zero(s) before other digits (e.g. "05" -> "5", "05000" -> "5000", "0300" -> "300")
        // but preserve "0", "0.", "0.5", etc.
        const cleaned = e.target.value.replace(/^(-?)0+(?=\d)/, "$1");
        if (cleaned !== e.target.value) {
          e.target.value = cleaned;
        }
      }
      onChange?.(e);
    };

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
        onFocus={handleFocus}
        onMouseUp={handleMouseUp}
        onChange={handleChange}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };

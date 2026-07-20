/**
 * ModeCard — segmented card used to choose an entry mode in a create form
 * (e.g. Payments/new: "Against invoice" vs "On account"). Renders as a
 * radio-group of cards with title, description and optional icon; keeps
 * selection state, keyboard navigation and focus ring consistent.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ModeOption<V extends string> {
  value: V;
  title: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export function ModeCards<V extends string>({
  options,
  value,
  onChange,
  columns = 2,
  className,
  label,
}: {
  options: ModeOption<V>[];
  value: V;
  onChange: (v: V) => void;
  columns?: 1 | 2 | 3 | 4;
  label?: string;
  className?: string;
}) {
  const cols =
    columns === 1
      ? "sm:grid-cols-1"
      : columns === 2
        ? "sm:grid-cols-2"
        : columns === 3
          ? "sm:grid-cols-3"
          : "sm:grid-cols-4";
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("grid grid-cols-1 gap-3", cols, className)}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={opt.disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              "group flex items-start gap-3 rounded-md border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "border-foreground bg-muted/40"
                : "border-border/70 hover:border-foreground/40 hover:bg-muted/20",
              opt.disabled && "cursor-not-allowed opacity-60",
            )}
          >
            {opt.icon && (
              <span
                className={cn(
                  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border",
                  active
                    ? "border-foreground/60 bg-background"
                    : "border-border/60 bg-muted/40 text-muted-foreground",
                )}
              >
                {opt.icon}
              </span>
            )}
            <div className="flex-1 space-y-1">
              <div className="font-display text-sm font-semibold tracking-tight text-foreground">
                {opt.title}
              </div>
              {opt.description && (
                <div className="text-xs text-muted-foreground">{opt.description}</div>
              )}
            </div>
            <span
              aria-hidden
              className={cn(
                "mt-1 h-3.5 w-3.5 shrink-0 rounded-full border",
                active ? "border-foreground bg-foreground" : "border-border",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

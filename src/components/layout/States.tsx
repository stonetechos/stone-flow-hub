import type { ReactNode } from "react";
import { Loader2, Inbox, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Shared loading / empty / error / skeleton primitives.
 *
 * Visual language: hairline borders, quiet muted tones, no heavy shadows
 * or colored blocks. Use these instead of ad-hoc <div>s so every screen
 * loads and empties the same way.
 */

export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground"
    >
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      <span className="text-xs">{label}</span>
    </div>
  );
}

/** A single skeleton row — use inside lists and feeds. */
export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 py-2", className)} aria-hidden>
      <Skeleton className="h-4 w-4 rounded-full" />
      <Skeleton className="h-3.5 flex-1 max-w-[40%]" />
      <Skeleton className="h-3.5 w-16" />
    </div>
  );
}

/** A single skeleton card — use for KPI / summary tiles. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border border-border bg-card p-4", className)} aria-hidden>
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-3 h-6 w-24" />
      <Skeleton className="mt-3 h-3 w-32" />
    </div>
  );
}

/** Skeleton table for list-page perceived performance. */
export function SkeletonTable({
  rows = 6,
  columns = 5,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label="Loading data"
      className={cn("overflow-hidden rounded-lg border border-border bg-card", className)}
    >
      <div
        className="grid gap-3 border-b border-border px-4 py-3"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-20" />
        ))}
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="grid gap-3 px-4 py-3"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton key={c} className={cn("h-3.5", c === 0 ? "w-32" : "w-20")} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton card grid for dashboards and detail pages. */
export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  message,
  action,
  icon,
  className,
}: {
  title: string;
  message?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 px-6 py-16 text-center",
        className,
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-muted/40 text-muted-foreground">
        {icon ?? <Inbox className="h-5 w-5" aria-hidden />}
      </div>
      <div className="space-y-1">
        <h3 className="font-display text-[15px] font-semibold text-foreground">{title}</h3>
        {message && (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">{message}</p>
        )}
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/25 bg-destructive/5 px-6 py-10 text-center"
    >
      <AlertCircle className="h-5 w-5 text-destructive" aria-hidden />
      <p className="max-w-md text-sm text-destructive">{message}</p>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

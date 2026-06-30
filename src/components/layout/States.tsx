import type { ReactNode } from "react";
import { Loader2, Inbox, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({
  title,
  message,
  action,
  icon,
}: {
  title: string;
  message?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border bg-card/50 py-12 text-center">
      <div className="rounded-full bg-muted p-3 text-muted-foreground">
        {icon ?? <Inbox className="h-6 w-6" />}
      </div>
      <div>
        <h3 className="font-display text-base font-semibold text-foreground">{title}</h3>
        {message && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{message}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorBlock({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 py-10 text-center">
      <AlertCircle className="h-6 w-6 text-destructive" />
      <p className="max-w-md text-sm text-destructive">{message}</p>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

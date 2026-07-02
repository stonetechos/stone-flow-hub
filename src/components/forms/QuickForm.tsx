/**
 * <QuickForm> — Progressive Disclosure primitive.
 * Renders three zones:
 *   1. ⭐ Quick Fill (always visible — essentials)
 *   2. More Details (collapsed by default)
 *   3. Advanced (collapsed by default)
 * Used by every "create / edit" form to keep first-time UX under 30–60 seconds.
 */
import { useState, type ReactNode } from "react";
import { ChevronDown, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuickForm({
  onSubmit,
  children,
  busy,
}: {
  onSubmit: (e: React.FormEvent) => void;
  children: ReactNode;
  busy?: boolean;
}) {
  return (
    <form onSubmit={onSubmit} aria-busy={busy} className="space-y-4">
      {children}
    </form>
  );
}

QuickForm.QuickFill = function QuickFill({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-md border border-border bg-card p-4 shadow-1">
      <header className="mb-3 flex items-center gap-2">
        <Star className="h-4 w-4 fill-warning text-warning" aria-hidden />
        <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-foreground">
          Quick Fill
        </h3>
        <span className="text-xs text-muted-foreground">— essentials only</span>
      </header>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
};

function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-md border border-border bg-card shadow-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="grid gap-4 border-t border-border p-4 md:grid-cols-2">{children}</div>
      )}
    </section>
  );
}

QuickForm.MoreDetails = function MoreDetails({ children }: { children: ReactNode }) {
  return <CollapsibleSection title="More details">{children}</CollapsibleSection>;
};

QuickForm.Advanced = function Advanced({ children }: { children: ReactNode }) {
  return <CollapsibleSection title="Advanced">{children}</CollapsibleSection>;
};

QuickForm.Actions = function Actions({ children }: { children: ReactNode }) {
  return <div className="flex items-center justify-end gap-2 pt-2">{children}</div>;
};

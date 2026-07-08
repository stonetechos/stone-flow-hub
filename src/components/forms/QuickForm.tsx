/**
 * <QuickForm> — Progressive Disclosure primitive.
 * Renders three zones:
 *   1. ⭐ Quick Fill (always visible — essentials)
 *   2. More Details (collapsed by default)
 *   3. Advanced (collapsed by default)
 * Used by every "create / edit" form to keep first-time UX under 30–60 seconds.
 */
import { Children, isValidElement, useEffect, useRef, useState, type ReactNode } from "react";
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
  // Split off the Actions slot so it can stick to the dialog footer while the
  // rest of the form scrolls independently. Without this the entire form is a
  // single non-scrolling block inside DialogContent's `flex-col overflow-hidden`
  // shell, which is why long forms (e.g. New Enquiry) were clipped on Safari.
  const items = Children.toArray(children);
  const actions = items.find((c) => isValidElement(c) && c.type === QuickForm.Actions);
  const body = items.filter((c) => c !== actions);
  return (
    <form
      onSubmit={onSubmit}
      aria-busy={busy}
      className="flex h-full min-h-0 flex-1 flex-col gap-4"
    >
      <div className="-mx-6 min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 [-webkit-overflow-scrolling:touch]">
        {body}
      </div>
      {actions}
    </form>
  );
}

QuickForm.QuickFill = function QuickFill({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    // Auto-focus the first enabled, focusable input inside the Quick Fill zone
    // so users can start typing immediately when a create dialog opens.
    const root = ref.current;
    if (!root) return;
    const el = root.querySelector<HTMLElement>(
      "input:not([type=hidden]):not([disabled]), textarea:not([disabled]), [role=combobox]:not([disabled])",
    );
    // Defer to after Radix Dialog focus-trap runs its initial focus.
    const t = window.setTimeout(() => el?.focus(), 60);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <section className="rounded-md border border-border bg-card p-4 shadow-1">
      <header className="mb-3 flex items-center gap-2">
        <Star className="h-4 w-4 fill-warning text-warning" aria-hidden />
        <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-foreground">
          Quick Fill
        </h3>
        <span className="text-xs text-muted-foreground">— essentials only</span>
      </header>
      <div ref={ref} className="grid gap-4 md:grid-cols-2">
        {children}
      </div>
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

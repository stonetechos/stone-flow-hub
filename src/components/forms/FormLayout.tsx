/**
 * Stone Tech OS — Form Layout primitives (Phase 5, UI v0.8)
 *
 * Full-page create/edit experience. Typography-first, minimal borders,
 * predictable rhythm. Every major form composes:
 *
 *   <FormLayout onSubmit={...} busy={mut.isPending}>
 *     <FormSection title="Customer information" description="…">
 *       <FormGrid>
 *         <Field …>
 *         <Field …>
 *       </FormGrid>
 *     </FormSection>
 *     …
 *     <FormActions
 *       primary={<Button type="submit">Save</Button>}
 *       secondary={<Button variant="ghost" type="button">Cancel</Button>}
 *     />
 *   </FormLayout>
 *
 * The action bar is rendered as a sticky footer pinned to the bottom of the
 * viewport so Save is always in reach, even on long forms. Business logic,
 * validation and mutation wiring live in the parent — this file only owns
 * layout, spacing and visual rhythm.
 */
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import type { FormEvent, ReactNode } from "react";

/* -------------------------------------------------------------------- */
/* Root form                                                             */
/* -------------------------------------------------------------------- */

export function FormLayout({
  onSubmit,
  busy,
  children,
  className,
}: {
  onSubmit?: (e: FormEvent) => void;
  busy?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <form
      onSubmit={onSubmit}
      aria-busy={busy || undefined}
      // pb leaves room for the sticky FormActions footer so the last field
      // is never covered; the safe-area term keeps that clearance intact
      // on devices with a bottom gesture bar (the footer itself grows by
      // the same inset — see FormActions below — so this buffer must grow
      // with it rather than being capped by max()).
      className={cn("space-y-10 pb-[calc(7rem+env(safe-area-inset-bottom))]", className)}
      noValidate
    >
      {children}
    </form>
  );
}

/* -------------------------------------------------------------------- */
/* Section                                                               */
/* -------------------------------------------------------------------- */

export function FormSection({
  title,
  description,
  aside,
  children,
  className,
}: {
  title: string;
  description?: string;
  /** Right-aligned slot on the section header — e.g. an "Add line" button. */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("scroll-mt-24", className)}>
      <header className="mb-4 flex items-start justify-between gap-4 border-b border-border/60 pb-3">
        <div>
          <h2 className="font-display text-[15px] font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </header>
      <div>{children}</div>
    </section>
  );
}

/* -------------------------------------------------------------------- */
/* Grid                                                                  */
/* -------------------------------------------------------------------- */

export function FormGrid({
  columns = 2,
  children,
  className,
}: {
  /** 1 | 2 | 3 columns at md+. Defaults to 2. */
  columns?: 1 | 2 | 3;
  children: ReactNode;
  className?: string;
}) {
  const cols =
    columns === 1 ? "md:grid-cols-1" : columns === 3 ? "md:grid-cols-3" : "md:grid-cols-2";
  return <div className={cn("grid grid-cols-1 gap-x-6 gap-y-5", cols, className)}>{children}</div>;
}

/* -------------------------------------------------------------------- */
/* Sticky action bar                                                     */
/* -------------------------------------------------------------------- */

export function FormActions({
  primary,
  secondary,
  extra,
  hint,
  busy,
  className,
}: {
  /** Primary submit button — always right-aligned, always visible. */
  primary: ReactNode;
  /** Cancel or dismiss action — left of primary. */
  secondary?: ReactNode;
  /** Contextual actions (e.g. Save & new, Delete). Rendered on the far left. */
  extra?: ReactNode;
  /** Optional inline hint / validation summary rendered between extras and buttons. */
  hint?: ReactNode;
  busy?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-background/95 backdrop-blur",
        "supports-[backdrop-filter]:bg-background/80",
        "pb-[env(safe-area-inset-bottom)]",
        className,
      )}
      role="group"
      aria-label="Form actions"
    >
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-6 md:pl-[var(--stos-shell-inset,0px)]">
        <div className="flex items-center gap-2">{extra}</div>
        <div className="flex-1 truncate text-xs text-muted-foreground">
          {busy ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving…
            </span>
          ) : (
            hint
          )}
        </div>
        <div className="flex items-center gap-2">
          {secondary}
          {primary}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- */
/* Summary rail — reusable read-only "totals" panel                     */
/* -------------------------------------------------------------------- */

export function FormSummary({
  title = "Summary",
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <aside className={cn("rounded-md border border-border/60 bg-muted/20 p-4", className)}>
      <h3 className="mb-3 font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <dl className="space-y-1.5 text-sm">{children}</dl>
    </aside>
  );
}

export function FormSummaryRow({
  label,
  value,
  emphasis,
  tone,
}: {
  label: string;
  value: ReactNode;
  emphasis?: boolean;
  tone?: "default" | "muted" | "positive" | "warning";
}) {
  const toneClass =
    tone === "positive"
      ? "text-status-success-fg"
      : tone === "warning"
        ? "text-status-warning-fg"
        : tone === "muted"
          ? "text-muted-foreground"
          : "text-foreground";
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("tabular-nums", emphasis ? "text-sm font-semibold" : "text-sm", toneClass)}>
        {value}
      </dd>
    </div>
  );
}

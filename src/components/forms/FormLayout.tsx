/**
 * STOS — Form Layout primitives (Phase 5, UI v0.8)
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
import type { FormEvent, ReactNode, RefObject } from "react";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";

/* -------------------------------------------------------------------- */
/* Root form                                                             */
/* -------------------------------------------------------------------- */

export function FormLayout({
  onSubmit,
  busy,
  dirty,
  children,
  className,
  formRef,
}: {
  onSubmit?: (e: FormEvent) => void;
  busy?: boolean;
  /** When true, warns before a browser refresh / tab close discards edits. */
  dirty?: boolean;
  children: ReactNode;
  className?: string;
  /** Optional ref forwarded to the underlying <form> element. */
  formRef?: RefObject<HTMLFormElement | null>;
}) {
  useUnsavedChanges(Boolean(dirty) && !busy);
  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      aria-busy={busy || undefined}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !busy) {
          e.preventDefault();
          e.currentTarget.requestSubmit();
        }
      }}
      className={cn("space-y-8", className)}
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
    <section className={cn("card-3d-milky scroll-mt-24 p-5 sm:p-7 shadow-xs", className)}>
      <header className="mb-5 flex items-start justify-between gap-4 border-b border-blue-50/70 pb-3.5">
        <div>
          <h2 className="font-display text-[16px] font-bold tracking-tight text-engraved-title">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-xs font-medium text-slate-500">{description}</p>
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
        "sticky bottom-0 z-40 -mx-2.5 sm:-mx-4 md:-mx-8 border-t border-border/80 bg-background/98 backdrop-blur shadow-lg",
        "supports-[backdrop-filter]:bg-background/90",
        "py-2.5 pb-[max(0.6rem,env(safe-area-inset-bottom))]",
        className,
      )}
      role="group"
      aria-label="Form actions"
    >
      <div className="mx-auto flex h-11 max-w-[1400px] items-center gap-2 sm:gap-3 px-3 sm:px-6">
        <div className="flex items-center gap-2">{extra}</div>
        <div className="flex-1 min-w-0 text-xs text-muted-foreground line-clamp-2 sm:line-clamp-1">
          {busy ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving…
            </span>
          ) : (
            hint
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
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

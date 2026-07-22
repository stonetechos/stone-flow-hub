/**
 * Sprint AI-1 — Copilot ↔ VIE Integration.
 *
 * Renders one `vie_actions` row as a chat bubble, purely as a function of
 * its `status`: the confirmation card for "awaiting_confirmation", the
 * clarification/draft-completion card for "draft", and the terminal outcome
 * for "applied" / "failed" / "rejected". This file is display only — it
 * reads `plan.params` / `plan_blockers` / `status` exactly as returned by
 * `understandAndStage()` / `confirmVieAction()` / `completeDraftAction()`
 * and calls back into the two confirm/complete callbacks the parent wires
 * to those same functions. No resolution, execution, or policy logic lives
 * here — that stays entirely in `src/lib/vie/**`, untouched by this sprint.
 */
import { useState } from "react";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, XCircle, HelpCircle, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { DbTable } from "@/lib/types";

export type VieActionRow = DbTable<"vie_actions">;

/** `linked_record_type` -> route, matching the handlers under
 *  `src/lib/vie/actions/*.ts` (which return "customer" | "enquiry" |
 *  "followup" | "quote") to the existing detail routes those same records
 *  already have. Display-only convenience for linking a just-created
 *  record from an outcome card — not a new resolution path; nl-search's
 *  own `resolve.ts` remains the source of truth for search-result hrefs. */
const RECORD_ROUTES: Record<string, string> = {
  customer: "/customers/$id",
  enquiry: "/enquiries/$id",
  followup: "/followups/$id",
  quote: "/quotes/$id",
};

function recordHref(type: string | null, id: string | null): string | undefined {
  if (!type || !id) return undefined;
  const pattern = RECORD_ROUTES[type];
  return pattern ? pattern.replace("$id", id) : undefined;
}

function humanizeKey(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Renders `plan.params` generically — primitives as label/value rows,
 *  arrays of objects (e.g. a quotation's line items) as a compact nested
 *  list, anything else as its string form. Deliberately generic rather than
 *  a per-intent layout, so this never drifts out of sync with whatever the
 *  Planner actually puts in `params` for a given or future intent. */
function ParamsPreview({ params }: { params: Record<string, unknown> }) {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return null;
  return (
    <dl className="space-y-1.5 text-xs">
      {entries.map(([key, value]) => (
        <div key={key} className="flex flex-col gap-0.5">
          <dt className="font-medium uppercase tracking-wide text-muted-foreground">
            {humanizeKey(key)}
          </dt>
          <dd className="text-foreground">
            {value === null || value === "" ? (
              <span className="italic text-muted-foreground">not set</span>
            ) : Array.isArray(value) ? (
              value.length === 0 ? (
                <span className="italic text-muted-foreground">none</span>
              ) : (
                <div className="space-y-1 rounded border border-border bg-background p-1.5">
                  {value.map((item, i) => (
                    <div key={i} className="border-b border-border/60 pb-1 last:border-0 last:pb-0">
                      {isPlainObject(item) ? <ParamsPreview params={item} /> : String(item)}
                    </div>
                  ))}
                </div>
              )
            ) : isPlainObject(value) ? (
              <ParamsPreview params={value} />
            ) : (
              String(value)
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

type Tone = "default" | "success" | "danger" | "warning" | "muted";

const TONE_CLASS: Record<Tone, string> = {
  default: "border-border bg-muted/30",
  success: "border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30",
  danger: "border-destructive/30 bg-destructive/5",
  warning: "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30",
  muted: "border-border bg-muted/20",
};

function ActionShell({
  tone,
  icon,
  children,
}: {
  tone: Tone;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={cn("max-w-full rounded-lg border px-3 py-2 text-sm", TONE_CLASS[tone])}>
      <div className="flex items-start gap-1.5">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

export function VieActionMessage({
  row,
  onConfirm,
  onCompleteDraft,
  confirmPending,
  completePending,
}: {
  row: VieActionRow;
  onConfirm: (actionId: string) => void;
  onCompleteDraft: (actionId: string, patch: Record<string, unknown>) => void;
  confirmPending: boolean;
  completePending: boolean;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) {
    return (
      <p className="text-xs italic text-muted-foreground">Dismissed — &quot;{row.raw_text}&quot;</p>
    );
  }

  const plan = row.plan as { params?: Record<string, unknown> } | null;
  const params = plan?.params ?? {};

  if (row.status === "rejected") {
    return (
      <ActionShell tone="muted" icon={<HelpCircle className="h-3.5 w-3.5" />}>
        <p>{row.error_message ?? "I can't act on that yet."}</p>
      </ActionShell>
    );
  }

  if (row.status === "failed") {
    return (
      <ActionShell tone="danger" icon={<XCircle className="h-3.5 w-3.5 text-destructive" />}>
        <p className="font-medium">Couldn&apos;t complete this.</p>
        <p className="mt-1 text-muted-foreground">{row.error_message ?? "Unknown error."}</p>
      </ActionShell>
    );
  }

  if (row.status === "applied") {
    const href = recordHref(row.linked_record_type, row.linked_record_id);
    return (
      <ActionShell tone="success" icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}>
        <p className="font-medium">
          Done — {humanizeKey(row.intent)}
          {row.linked_record_type ? ` (${row.linked_record_type})` : ""}
        </p>
        {href && (
          <Link
            to={href as never}
            className="mt-1 inline-flex items-center gap-1 text-primary hover:underline"
          >
            View record <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </ActionShell>
    );
  }

  if (row.status === "awaiting_confirmation") {
    return (
      <ActionShell tone="default" icon={<HelpCircle className="h-3.5 w-3.5" />}>
        <p className="mb-1.5 font-medium">Review before I do this — {humanizeKey(row.intent)}</p>
        <p className="mb-2 text-xs text-muted-foreground">&quot;{row.canonical_text}&quot;</p>
        <ParamsPreview params={params} />
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={() => onConfirm(row.id)} disabled={confirmPending}>
            {confirmPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} Confirm
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
            Dismiss
          </Button>
        </div>
      </ActionShell>
    );
  }

  if (row.status === "draft") {
    return (
      <DraftCard
        row={row}
        params={params}
        onCompleteDraft={onCompleteDraft}
        completePending={completePending}
        onDismiss={() => setDismissed(true)}
      />
    );
  }

  // "pending" / "planned" / "confirmed" / "executing" — transitional
  // statuses that shouldn't normally reach the client (understandAndStage
  // resolves AUTO plans to a terminal status before returning, and
  // confirm/completeDraft return an ExecuteActionResult, not a row in one
  // of these states). Rendered defensively rather than silently dropped.
  return (
    <ActionShell tone="muted" icon={<Loader2 className="h-3.5 w-3.5 animate-spin" />}>
      <p>Working on it… ({row.status})</p>
    </ActionShell>
  );
}

function DraftCard({
  row,
  params,
  onCompleteDraft,
  completePending,
  onDismiss,
}: {
  row: VieActionRow;
  params: Record<string, unknown>;
  onCompleteDraft: (actionId: string, patch: Record<string, unknown>) => void;
  completePending: boolean;
  onDismiss: () => void;
}) {
  // Only primitive top-level fields are editable inline — plan_blockers is
  // still an untyped string[] today (VIE Phase 2's own Milestone 5 would
  // structure it with resolved candidates; not implemented, and out of
  // scope for this UI-only sprint), so there's no reliable way to know
  // which specific field a given blocker refers to, or to offer a picker
  // for an ambiguous match. Complex fields (e.g. a quotation's line items)
  // stay read-only here — editing them is a manual-form job for now.
  const editableKeys = Object.keys(params).filter((k) => {
    const v = params[k];
    return v === null || v === undefined || typeof v === "string" || typeof v === "number";
  });
  const [edits, setEdits] = useState<Record<string, string>>({});
  const blockers = Array.isArray(row.plan_blockers) ? (row.plan_blockers as unknown[]) : [];

  function submit() {
    const patch: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(edits)) {
      if (raw.trim() === "") continue;
      const original = params[key];
      patch[key] = typeof original === "number" ? Number(raw) : raw;
    }
    if (Object.keys(patch).length === 0) return;
    onCompleteDraft(row.id, patch);
  }

  return (
    <ActionShell tone="warning" icon={<HelpCircle className="h-3.5 w-3.5 text-amber-600" />}>
      <p className="mb-1.5 font-medium">Needs a bit more — {humanizeKey(row.intent)}</p>
      <p className="mb-2 text-xs text-muted-foreground">&quot;{row.canonical_text}&quot;</p>
      {blockers.length > 0 && (
        <ul className="mb-2 list-disc space-y-0.5 pl-4 text-xs text-amber-800 dark:text-amber-400">
          {blockers.map((b, i) => (
            <li key={i}>{String(b)}</li>
          ))}
        </ul>
      )}
      <ParamsPreview params={params} />
      {editableKeys.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-border pt-2">
          <p className="text-xs font-medium text-muted-foreground">Fill in what&apos;s missing:</p>
          {editableKeys.map((key) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs">{humanizeKey(key)}</Label>
              <Input
                className="h-8 text-xs"
                value={edits[key] ?? ""}
                placeholder={params[key] == null ? "" : String(params[key])}
                onChange={(e) => setEdits((s) => ({ ...s, [key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={submit} disabled={completePending}>
          {completePending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} Complete
          &amp; execute
        </Button>
        <Button size="sm" variant="ghost" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
    </ActionShell>
  );
}

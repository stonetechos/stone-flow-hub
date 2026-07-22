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
 *
 * Sprint AI-1.5 — Structured Planner & Intelligent Clarification: the
 * "draft" card below now renders `plan_blockers` as real controls (radio
 * lists, a searchable candidate list, number/date/text inputs) driven
 * purely by each blocker's structured `type`, instead of a flat bullet
 * list of English sentences with a generic top-level-field patch form
 * underneath. This file still performs zero resolution/reasoning — it only
 * ever inspects `blocker.type` to pick a control and `blocker.field` to
 * know where a chosen value belongs in the eventual patch; it never parses
 * `blocker.message`. See docs/VIE-Structured-Blockers.md for the full
 * rendering contract this implements.
 */
import { useState } from "react";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, XCircle, HelpCircle, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { DbTable } from "@/lib/types";
import type { PlannerBlocker } from "@/lib/vie/types";

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

function isPlannerBlocker(v: unknown): v is PlannerBlocker {
  return (
    isPlainObject(v) &&
    typeof v.id === "string" &&
    typeof v.type === "string" &&
    typeof v.message === "string" &&
    typeof v.field === "string"
  );
}

/** `plan_blockers` is the generated `Json` column type at rest — this
 *  narrows it back to `PlannerBlocker[]` the same lightweight way `plan` is
 *  cast below, with one added safety net: any element that doesn't look
 *  like a structured PlannerBlocker (e.g. a legacy plain string, from a
 *  `vie_actions` row staged before Sprint AI-1.5 shipped) is dropped rather
 *  than crashing the render. There is no DB migration backfilling old rows
 *  — `draft` rows are short-lived (an employee completes or dismisses them,
 *  they aren't kept around as a historical record the way `applied`/
 *  `failed` rows are), so defending against the old shape here is enough. */
function parseBlockers(value: unknown): PlannerBlocker[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isPlannerBlocker);
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

/** A blocker's `candidates` list, rendered as a picker. Covers every
 *  `*_selection` blocker type generically (customer_selection,
 *  vendor_selection, project_selection, product_selection, stone_selection,
 *  colour_selection, finish_selection, thickness_selection) rather than one
 *  component per type — per the sprint's own "keep it generic and reusable"
 *  allowance. A short list renders as radio buttons (matches the sprint's
 *  own customer_selection/vendor_selection examples); once a list is long
 *  enough that scanning it stops being the fastest way to find one entry,
 *  it renders as a searchable filter list instead (matches the sprint's own
 *  project_selection/stone_selection "searchable" examples). Zero
 *  candidates (e.g. resolveCustomer's "no existing customer matches…"
 *  blocker) means there's nothing to pick — resolving that case is a
 *  manual-form job on the record's own page, same as the pre-Sprint-AI-1.5
 *  card already deferred complex fields to. */
function CandidatePicker({
  blocker,
  value,
  onChange,
}: {
  blocker: PlannerBlocker;
  value: string;
  onChange: (value: string) => void;
}) {
  const candidates = blocker.candidates ?? [];

  if (candidates.length === 0) {
    return (
      <p className="text-xs italic text-muted-foreground">
        No matches — resolve this from the regular {humanizeKey(blocker.field)} page, then dismiss
        this draft.
      </p>
    );
  }

  const SHORT_LIST_MAX = 6;
  if (candidates.length <= SHORT_LIST_MAX) {
    return (
      <RadioGroup value={value} onValueChange={onChange} className="gap-1.5">
        {candidates.map((c) => (
          <div key={c.id} className="flex items-center gap-2">
            <RadioGroupItem value={c.id} id={`${blocker.id}-${c.id}`} className="h-3.5 w-3.5" />
            <Label htmlFor={`${blocker.id}-${c.id}`} className="cursor-pointer text-xs font-normal">
              {c.label}
              {c.subtitle && <span className="text-muted-foreground"> ({c.subtitle})</span>}
            </Label>
          </div>
        ))}
      </RadioGroup>
    );
  }

  return (
    <Command className="rounded border border-border">
      <CommandInput placeholder="Search…" className="h-8 text-xs" />
      <CommandList>
        <CommandEmpty className="py-2 text-xs">No match.</CommandEmpty>
        {candidates.map((c) => (
          <CommandItem
            key={c.id}
            value={`${c.label} ${c.subtitle ?? ""}`}
            onSelect={() => onChange(c.id)}
            className={cn("text-xs", value === c.id && "bg-accent text-accent-foreground")}
          >
            {c.label}
            {c.subtitle && <span className="ml-1 text-muted-foreground">({c.subtitle})</span>}
          </CommandItem>
        ))}
      </CommandList>
    </Command>
  );
}

/** `confirmation_required` is informational, not a value to fill in — a
 *  human just needs to see it before deciding whether to proceed (e.g.
 *  resolveCustomerDuplicate.ts's "a customer with this phone number already
 *  exists" blocker) — so unlike every other blocker type, it renders no
 *  input and contributes nothing to the completion patch. */
function ConfirmationNotice({ blocker }: { blocker: PlannerBlocker }) {
  const candidate = blocker.candidates?.[0];
  return (
    <div className="rounded border border-amber-300 bg-amber-100/60 px-2 py-1.5 text-xs dark:border-amber-900 dark:bg-amber-950/40">
      <p>{blocker.message}</p>
      {candidate && <p className="mt-0.5 font-medium">{candidate.label}</p>}
    </div>
  );
}

/** Dispatches purely on `blocker.type` to pick a control — never parses
 *  `blocker.message`. This is the entire rendering contract Sprint AI-1.5
 *  requires: the Planner decides WHAT is missing and how it can be
 *  resolved (via `type`/`candidates`), this file only decides HOW to draw
 *  it. See docs/VIE-Structured-Blockers.md. */
function BlockerField({
  blocker,
  value,
  onChange,
}: {
  blocker: PlannerBlocker;
  value: string;
  onChange: (value: string) => void;
}) {
  switch (blocker.type) {
    case "quantity_required":
    case "unit_price_required":
    case "number_required":
      return (
        <Input
          type="number"
          className="h-8 text-xs"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "delivery_date_required":
    case "date_required":
      return (
        <Input
          type="date"
          className="h-8 text-xs"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "text_required":
      return (
        <Input
          className="h-8 text-xs"
          value={value}
          placeholder={typeof blocker.currentValue === "string" ? blocker.currentValue : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "confirmation_required":
      return <ConfirmationNotice blocker={blocker} />;
    // customer_selection / vendor_selection / project_selection /
    // product_selection / stone_selection / colour_selection /
    // finish_selection / thickness_selection, and any future *_selection
    // type this switch doesn't need to know by name — see CandidatePicker's
    // own header comment for why one generic control covers all of them.
    default:
      return <CandidatePicker blocker={blocker} value={value} onChange={onChange} />;
  }
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
  const blockers = parseBlockers(row.plan_blockers);
  // Keyed by blocker.id (always unique within a plan), not blocker.field —
  // two blockers could in principle share a field, and id is guaranteed
  // collision-free where field is only guaranteed collision-free today.
  const [blockerEdits, setBlockerEdits] = useState<Record<string, string>>({});

  function submit() {
    const patch: Record<string, unknown> = {};
    for (const b of blockers) {
      const raw = blockerEdits[b.id];
      if (b.type === "confirmation_required" || raw === undefined || raw.trim() === "") continue;
      if (
        b.type === "quantity_required" ||
        b.type === "unit_price_required" ||
        b.type === "number_required"
      ) {
        const n = Number(raw);
        if (!Number.isNaN(n)) patch[b.field] = n;
        continue;
      }
      if (b.type === "delivery_date_required" || b.type === "date_required") {
        const d = new Date(raw);
        patch[b.field] = Number.isNaN(d.getTime()) ? raw : d.toISOString();
        continue;
      }
      // text_required, and every *_selection type (the picked candidate's
      // id, or hand-typed replacement text) — passed straight through.
      patch[b.field] = raw;
    }
    if (Object.keys(patch).length === 0) return;
    onCompleteDraft(row.id, patch);
  }

  return (
    <ActionShell tone="warning" icon={<HelpCircle className="h-3.5 w-3.5 text-amber-600" />}>
      <p className="mb-1.5 font-medium">Needs a bit more — {humanizeKey(row.intent)}</p>
      <p className="mb-2 text-xs text-muted-foreground">&quot;{row.canonical_text}&quot;</p>
      <ParamsPreview params={params} />
      {blockers.length > 0 && (
        <div className="mt-3 space-y-3 border-t border-border pt-2">
          <p className="text-xs font-medium text-muted-foreground">Fill in what&apos;s missing:</p>
          {blockers.map((b) => (
            <div key={b.id} className="space-y-1">
              {b.type !== "confirmation_required" && (
                <Label className="text-xs">{humanizeKey(b.field)}</Label>
              )}
              <p className="text-xs text-amber-800 dark:text-amber-400">{b.message}</p>
              <BlockerField
                blocker={b}
                value={blockerEdits[b.id] ?? ""}
                onChange={(v) => setBlockerEdits((s) => ({ ...s, [b.id]: v }))}
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

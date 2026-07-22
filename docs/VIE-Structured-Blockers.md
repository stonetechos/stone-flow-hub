# VIE Structured Planner Blockers

**Sprint:** AI-1.5 — Structured Planner & Intelligent Clarification
**Status:** Shipped
**Scope:** `src/lib/vie/types.ts`, `src/lib/vie/planner/**`, `src/lib/vie/vie.functions.ts` (one line), `src/components/copilot/VieActionCard.tsx`

This document describes the `PlannerBlocker` model introduced in Sprint AI-1.5: what it replaces, its lifecycle from resolver to UI, the rendering contract the Copilot panel implements against it, and how a future intent should add new blockers. It complements — and does not replace — ADR-0001 (VIE Phase 1 architecture) and the VIE-Phase2/VIE-CreateQuotation review docs already in the project, which cover the Understand → Plan → Execute pipeline this sprint builds on top of, unchanged.

## 1. What changed, and what didn't

Before this sprint, `VieExecutionPlan.blockers` was `string[]` — a human-readable sentence per unresolved prerequisite, e.g. `"No customer name was extracted from the utterance."` or `"Ramesh" matches 2 customers: Ramesh Patel (CUST-0001), Ramesh Shah (CUST-0002).`. That was enough for a completion-report bullet point or a flat list in the old Copilot draft card, but it gave the UI nothing to build a real control from — rendering a radio list of candidate customers, a date picker, or a number input from an English sentence means parsing prose, which is exactly the "UI performs AI reasoning" anti-pattern this sprint exists to remove.

`PlannerBlocker` (`src/lib/vie/types.ts`) replaces the string with a small object that carries the same information a human already had (`message`, kept verbatim) plus the structure a renderer needs to pick the right control without parsing anything:

```ts
export interface PlannerBlocker {
  id: string;
  type: PlannerBlockerType;
  message: string;
  field: string;
  required: boolean;
  currentValue?: unknown;
  candidates?: PlannerBlockerCandidate[];
}
```

What is **unchanged**:

- The Understand layer, Workflow Engine, Action Registry, execution policies, server function signatures, AI provider, authentication/authorization, and audit logging.
- The one rule that decides whether a plan can auto-execute: `resolveEffectiveMode()` (`planner/index.ts`) still only ever asks `blockers.length > 0` to force `"draft"`. A configured `"auto"` policy still requires confidence to clear its threshold; `"confirm"`/`"draft"` policies are still a ceiling never upgraded by confidence. Only the element type of the array changed — the downgrade logic did not.
- The `vie_actions` table schema. `plan_blockers` is still the same `Json` column; only the JS-side shape written into it changed (see §4).
- Every existing intent's actual resolution behavior (which name matches which customer, when a project is ambiguous, when a mobile number is invalid, ...). No resolver's decision of *whether* to block changed — only *what it hands back* when it does.

## 2. The blocker model

### `PlannerBlockerType`

A closed, generic set (`PLANNER_BLOCKER_TYPES` in `types.ts`) covering every kind of unresolved prerequisite a `planX()` function can produce:

| Type | Meaning | Current producer(s) |
|---|---|---|
| `customer_selection` | Ambiguous or unmatched customer name | `resolveCustomer.ts`, `resolveFollowupTarget.ts` |
| `vendor_selection` | Ambiguous or unmatched vendor | none yet — reserved for a future vendor-facing intent |
| `project_selection` | Ambiguous, unmatched, or altogether missing project | `resolveProject.ts` |
| `product_selection` | Ambiguous/unmatched product | none — `resolveProduct.ts` deliberately never blocks (see §5) |
| `stone_selection`, `colour_selection`, `finish_selection`, `thickness_selection` | Reserved for future stone-attribute resolvers | none yet |
| `quantity_required` | A line item's quantity wasn't extracted | `planCreateQuotation` |
| `unit_price_required` | A line item's unit price wasn't extracted | `planCreateQuotation` |
| `delivery_date_required` | Reserved — no current producer | none yet |
| `date_required` | A relative date phrase didn't resolve | `planNoteFollowup` |
| `text_required` | A required free-text field is missing/invalid | `resolveCustomer.ts` (no name), `resolveFollowupTarget.ts` (no target), `planCreateCustomer` (name/mobile) |
| `number_required` | Reserved, generic — no current producer | none yet |
| `confirmation_required` | Not a missing value — a fact the human must see before proceeding | `resolveCustomerDuplicate.ts` |

Types with no current producer (`vendor_selection`, `delivery_date_required`, `number_required`, the stone-attribute types) are included because the sprint's own model named them explicitly as real future cases and the type is free to declare. Adding the producer later needs **no UI change** — the renderer (§3) already treats every `*_selection` type identically, and the scalar-input types by shared behavior, not by name.

### Fields

- **`id`** — stable within one plan. Every current producer reuses `field` itself as `id` (see below), since fields are already unique per blocker within a single plan.
- **`message`** — the exact human-readable sentence a pre-Sprint-AI-1.5 string blocker would have carried. Anything that only ever displays text (a log line, a future non-UI consumer) loses no information by ignoring `type` entirely.
- **`field`** — a dot-path into `VieExecutionPlan.params` naming what this blocker resolves: `"customer_id"`, `"mobile"`, `"scheduled_at"`, or an index-qualified path like `"items.0.quantity"` for a per-line-item field.
- **`required`** — always `true` today. Every blocker any current Planner function produces is a hard requirement; the field exists so a future intent can record an advisory, non-blocking note without revisiting the model, not because soft blockers exist yet.
- **`currentValue`** — the raw extracted value that failed to resolve uniquely (e.g. the searched name), when there is one. Omitted, never fabricated as `null`, when nothing was extracted at all.
- **`candidates`** — present only on `*_selection` and `confirmation_required` blockers: the resolver's own real match list, already fetched (capped generously at 20 per resolver — see §5), never a second lookup performed by the UI.

## 3. Lifecycle: resolver → Planner → `vie_actions` → UI

1. **A resolver decides a blocker is needed.** Resolvers (`resolveCustomer.ts`, `resolveProject.ts`, `resolveFollowupTarget.ts`, `resolveCustomerDuplicate.ts`) build the `PlannerBlocker` object themselves, at the exact point they already have the real candidate list in scope — never reconstructed later from formatted text. A `planX()` function that constructs a blocker inline (a missing name, date, quantity, or unit price) does the same, directly.
2. **`planX()` aggregates blockers into `VieExecutionPlan.blockers`.** No transformation happens here — `if (x.blocker) blockers.push(x.blocker)` for resolver-sourced blockers; a small number of Planner-authored blockers are pushed directly with the same shape.
3. **`resolveEffectiveMode()` downgrades to `"draft"`** whenever `blockers.length > 0`, exactly as before this sprint.
4. **`understandAndStage()` persists the plan.** `vie.functions.ts` writes `plan_blockers: plan ? toJson(plan.blockers) : null` — the same `toJson()` round-trip `plan` itself already used, now also applied to `blockers` because `PlannerBlocker.currentValue?: unknown` is not directly assignable to the generated `Json` column type the way the old `string[]` was.
5. **The Copilot UI reads the row and renders it.** `VieActionCard.tsx`'s `DraftCard` narrows `row.plan_blockers` (untyped `Json` at rest) back to `PlannerBlocker[]` via a small runtime guard (`parseBlockers`/`isPlannerBlocker`) — any element that doesn't structurally look like a `PlannerBlocker` (e.g. a legacy plain string from a row staged before this sprint) is dropped rather than crashing the render. There is no DB migration backfilling old rows; `draft` rows are short-lived, so this defensive filter is enough.
6. **The employee fills in / picks a value per blocker.** Each edit is kept in local component state keyed by `blocker.id`.
7. **On "Complete & execute", the UI builds a patch** keyed by `blocker.field`, coercing per `blocker.type` (numbers for `quantity_required`/`unit_price_required`/`number_required`, an ISO date string for `date_required`/`delivery_date_required`, otherwise the raw string — either hand-typed text or a picked candidate's `id`). `confirmation_required` blockers contribute nothing to the patch (see §3.1). The patch is sent to `completeDraftAction`, which is unmodified: it still merges `{ ...planParams, ...patch }` (a shallow spread) before invoking the same Action Registry handler every other execution path uses.

### 3.1 Why `confirmation_required` never appears in a patch

Unlike every other blocker type, `confirmation_required` isn't a missing value to fill in — it's a fact the human needs to see (e.g. "a customer with this phone number already exists: Ramesh Patel (CUST-0042)") before deciding whether to proceed at all. The UI renders it as a read-only notice with the matched record shown for reference, and it is explicitly excluded when the completion patch is built. This matches its pre-Sprint-AI-1.5 behavior of simply being shown as text — only the presentation changed.

### 3.2 A known, documented gap: dot-path fields and the patch merge

`completeDraftAction`'s patch is still a flat `Record<string, unknown>`, merged into `params` with a shallow spread (`{ ...planParams, ...patch }`) inside `executeAction` (`workflowEngine.ts`, unmodified). For a top-level field (`customer_id`, `project_id`, `mobile`, `name`, `scheduled_at`, `entity_id`) this works exactly as it did before. For a per-line-item blocker on `create_quotation` (`field: "items.0.quantity"`), the UI still renders a Number input and still produces a patch keyed by that literal dot-path string — but a shallow spread does not rewrite a nested `items` array from a dotted key, so completing a line-item blocker from the Copilot panel today does not yet correct the specific item; it would require re-stating the whole `items` array as the patch's `items` key instead. This is a pre-existing Workflow Engine constraint this sprint was explicitly scoped not to touch ("Do NOT redesign... Workflow Engine... Server Functions"), documented here as a known limitation rather than silently worked around — the same "pin today's actual behavior, flag it" discipline the existing Planner test suite already applies to two other known gaps (see `planner/index.test.ts`'s "KNOWN DEFECT"/"KNOWN GAP" tests).

## 4. Rendering contract (Copilot UI)

`VieActionCard.tsx`'s `BlockerField` component is the single place that turns a `PlannerBlocker` into a control. It switches **only on `blocker.type`** — it never inspects or parses `blocker.message`:

| `blocker.type` | Control |
|---|---|
| `quantity_required`, `unit_price_required`, `number_required` | Number input |
| `delivery_date_required`, `date_required` | Date input (native `<input type="date">`, converted to an ISO timestamp on submit) |
| `text_required` | Text input, pre-filled with `currentValue` as a placeholder when present |
| `confirmation_required` | Read-only notice card — the message plus the sole candidate (if any), no input |
| everything else (every `*_selection` type) | `CandidatePicker` — see below |

`CandidatePicker` is one generic component covering `customer_selection`, `vendor_selection`, `project_selection`, `product_selection`, `stone_selection`, `colour_selection`, `finish_selection`, and `thickness_selection` (and any future `*_selection` type, via the `default` branch of the switch above) rather than one component per type, per the sprint's own "keep it generic and reusable" allowance:

- **Zero candidates** (e.g. "no existing customer matches…") — there is nothing to pick. Rendered as a short note pointing the employee at the record's own manual page instead of a misleading free-text field (a field like `customer_id` expects a real UUID; a hand-typed name there would only fail at execution time).
- **1–6 candidates** — a radio list (matches the sprint's own `customer_selection`/`vendor_selection` "Radio list" examples).
- **More than 6 candidates** — a searchable filter list built on the existing `Command`/`CommandInput`/`CommandItem` components already used elsewhere in the app (`GlobalSearchDialog`), never a live re-query — the full candidate set the resolver already fetched is filtered client-side (matches the sprint's own `project_selection`/`stone_selection` "Searchable selector/dropdown" examples).

This threshold is a display heuristic, not new resolution logic — the resolvers already cap `candidates` at 20 (see §5); the UI just decides how to lay out however many came back.

## 5. How future intents add blockers

1. **Reuse an existing `PlannerBlockerType`** if the new prerequisite fits one (most `*_selection`/`*_required` cases will). Only add a new member to `PLANNER_BLOCKER_TYPES` (`types.ts`) for a genuinely new *kind* of unresolved prerequisite — never overload an existing type to mean two different things, since the UI's dispatch is purely type-driven.
2. **Build the `PlannerBlocker` object where the real data already is.** If a resolver already fetches the candidate list to decide whether a match is ambiguous, construct the blocker there (see `resolveCustomer.ts`, `resolveProject.ts`) — never reconstruct it later in `planner/index.ts` from a resolver's return value, and never truncate a candidate list for prose-readability the way the old string blockers did (a rendered list has no such limit; cap generously — the existing resolvers use 20 — purely to bound a pathological search term, not to shorten a sentence).
3. **Set `field` to the exact `params` key (or dot-path) the resolved value belongs at**, so `completeDraftAction`'s patch can be merged in directly for a top-level field. For a nested field, see §3.2's documented gap before assuming a patch alone will fix it.
4. **Push the blocker into the `planX()` function's `blockers: PlannerBlocker[]` array** the same way every existing intent does — `resolveEffectiveMode()` needs no changes; it already treats any non-empty array as forcing `"draft"`.
5. **The UI needs no changes** if the new blocker reuses an existing type. If it's a genuinely new type not covered by the existing switch in `BlockerField`, add one case — a single `switch` arm — rather than a new per-intent component.

## 6. Testing

Every resolver test file (`resolveCustomer.test.ts`, `resolveCustomerDuplicate.test.ts`, `resolveFollowupTarget.test.ts`, `resolveProject.test.ts`) and the Planner integration suite (`planner/index.test.ts`, `resolveEffectiveMode.test.ts`) assert against the structured `PlannerBlocker` shape rather than a plain string. The old "more than 5 matches → ellipsis" / "exactly 5 matches → no ellipsis" prose-truncation tests (`resolveCustomer.test.ts`, `resolveProject.test.ts`) are gone — that limit no longer exists under this design — replaced with a test of the 20-candidate cap instead. `resolveProduct.ts`/`resolveProduct.test.ts` needed no changes: that resolver has no `blocker` field at all, by design, and this sprint doesn't change that.

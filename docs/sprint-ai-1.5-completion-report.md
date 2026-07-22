# Sprint AI-1.5 Completion Report — Structured Planner & Intelligent Clarification

**Date:** 2026-07-22
**Branch:** `feature/vie-quotation`
**Scope:** Upgrade `VieExecutionPlan.blockers` from `string[]` to structured `PlannerBlocker[]`, and make the Copilot draft card render real controls per blocker, driven purely by `blocker.type` — never by parsing English text.

This sprint builds directly on Sprint AI-1 (Copilot ↔ VIE Integration). It does not redesign the Understand → Plan → Execute pipeline, the Workflow Engine, the Action Registry, execution policies, server function signatures, the AI provider, authentication/authorization, audit logging, or existing business logic — all unchanged, as required.

## 1. Architecture summary

Before this sprint, a blocked plan carried its unresolved prerequisites as an array of pre-formatted English sentences (`plan_blockers: string[]`). The Copilot draft card could only display them as a bullet list and fall back to a generic "edit any primitive top-level param" form — it had no reliable way to know which specific field a given sentence referred to, or to offer a picker for an ambiguous match, without parsing prose.

`PlannerBlocker` (`src/lib/vie/types.ts`) replaces the string with a small structured object — `{ id, type, message, field, required, currentValue?, candidates? }` — built at the exact point in each resolver (or `planX()` function) where the real data already exists, rather than reconstructed downstream from formatted text. The one rule that decides whether a plan can auto-execute — `resolveEffectiveMode()`'s `blockers.length > 0 → "draft"` — is byte-for-byte unchanged; only what each element of that array *is* changed, not whether one exists or what it does once it does.

The Copilot draft card (`VieActionCard.tsx`) now dispatches purely on `blocker.type` to pick a control: a radio list or searchable filter list for every `*_selection` type, a number input for `quantity_required`/`unit_price_required`/`number_required`, a date input for `date_required`/`delivery_date_required`, a text input for `text_required`, and a read-only notice for `confirmation_required`. It never inspects `blocker.message` to decide what to render — `message` is still shown verbatim as the human-readable explanation alongside whichever control renders.

Full design rationale, the complete type reference, the resolver → UI lifecycle, and how a future intent should add new blockers are documented in `docs/VIE-Structured-Blockers.md`.

## 2. Files modified

**Blocker model:**
- `src/lib/vie/types.ts` — added `PLANNER_BLOCKER_TYPES`, `PlannerBlockerType`, `PlannerBlockerCandidate`, `PlannerBlocker`; changed `VieExecutionPlan.blockers` from `string[]` to `PlannerBlocker[]`.

**Resolvers (build the structured blocker where the real candidate data already exists):**
- `src/lib/vie/planner/resolveCustomer.ts`
- `src/lib/vie/planner/resolveCustomerDuplicate.ts`
- `src/lib/vie/planner/resolveFollowupTarget.ts`
- `src/lib/vie/planner/resolveProject.ts`

**Planner aggregation (inline blockers converted; resolver-sourced blockers needed no change since resolvers now hand back the structured shape directly):**
- `src/lib/vie/planner/index.ts` — `resolveEffectiveMode()`'s signature, and every `planX()` function's inline blockers (missing customer/date/name/mobile/quantity/unit-price).

**Serialization (one line):**
- `src/lib/vie/vie.functions.ts` — `plan_blockers` now goes through the same `toJson()` round-trip `plan` already used, since `PlannerBlocker.currentValue?: unknown` isn't directly `Json`-assignable the way the old `string[]` was.

**UI rendering:**
- `src/components/copilot/VieActionCard.tsx` — `DraftCard` now renders structured controls per blocker (`BlockerField`, `CandidatePicker`, `ConfirmationNotice`), replacing the old generic top-level-field edit form and raw bullet list.

**Tests (rewritten to assert the structured shape, preserving each test's original intent):**
- `src/lib/vie/planner/resolveCustomer.test.ts`
- `src/lib/vie/planner/resolveCustomerDuplicate.test.ts`
- `src/lib/vie/planner/resolveFollowupTarget.test.ts`
- `src/lib/vie/planner/resolveProject.test.ts` (the old 5-item-truncation/ellipsis tests, which pinned behavior the new design no longer has, were replaced with a 20-candidate-cap test)
- `src/lib/vie/planner/resolveEffectiveMode.test.ts` (fixtures retyped; the function's own logic assertions are unchanged)
- `src/lib/vie/planner/index.test.ts`

**Documentation (new):**
- `docs/VIE-Structured-Blockers.md`
- `docs/sprint-ai-1.5-completion-report.md` (this file)

**Not touched**, confirmed via `git diff --stat`: `understand.ts`, `workflowEngine.ts`, `actions/registry.ts`, any `actions/*.ts` handler, `policy.ts`, any Supabase migration, `Copilot.tsx`, and `resolveProduct.ts`/`resolveProduct.test.ts` (that resolver has no `blocker` field at all, by design — unchanged).

## 3. Blocker model

```ts
export const PLANNER_BLOCKER_TYPES = [
  "customer_selection", "vendor_selection", "project_selection", "product_selection",
  "stone_selection", "colour_selection", "finish_selection", "thickness_selection",
  "quantity_required", "unit_price_required", "delivery_date_required", "date_required",
  "text_required", "number_required", "confirmation_required",
] as const;
export type PlannerBlockerType = (typeof PLANNER_BLOCKER_TYPES)[number];

export interface PlannerBlockerCandidate {
  id: string;
  label: string;
  subtitle?: string;
}

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

This is the user-suggested model, essentially unchanged — `required` is documented as always `true` today (no soft-blocker concept exists in the execution engine, so the field exists for forward-compatibility only), and `vendor_selection` is included with no current producer (VIE has no vendor-facing intent yet), matching the sprint's own instruction to keep the model "generic and reusable." See `docs/VIE-Structured-Blockers.md` §2 for the full per-type producer table.

Every existing intent now returns structured blockers where it previously returned strings, per the sprint's own mapping:

| Old string blocker | New `PlannerBlocker.type` |
|---|---|
| Customer ambiguous / not found | `customer_selection` |
| Project ambiguous / none exists | `project_selection` |
| Customer name missing | `text_required` |
| Mobile missing/invalid | `text_required` |
| Duplicate mobile match | `confirmation_required` |
| Follow-up target unresolved | `customer_selection` / `text_required` |
| Follow-up date not extracted | `date_required` |
| Line-item quantity missing | `quantity_required` |
| Line-item unit price missing | `unit_price_required` |

## 4. UI rendering changes

`VieActionCard.tsx`'s `DraftCard` no longer derives its edit form from a generic "which top-level params are primitives" heuristic. It now renders one row per `PlannerBlocker`, with the control chosen purely by `blocker.type`:

- **`quantity_required` / `unit_price_required` / `number_required`** → number input.
- **`delivery_date_required` / `date_required`** → native date input, converted to an ISO timestamp when building the completion patch.
- **`text_required`** → text input, pre-filled with `currentValue` as a placeholder when one was extracted.
- **`confirmation_required`** → a read-only notice (the message plus the matched record, if any) — contributes nothing to the patch, since there's nothing to fill in, only to acknowledge.
- **Every `*_selection` type** → a single generic `CandidatePicker`: a radio list for ≤6 candidates, a searchable filter list (built on the app's existing `Command` components) for more, or a short "resolve this manually" note when there are zero candidates to pick from.

On submit, the UI builds `completeDraftAction`'s `patch` keyed by each filled-in blocker's `field`, coerced per `type` (number, ISO date string, or raw string). This is a pure rendering change — `completeDraftAction`, `executeAction`, and every Action Registry handler are untouched.

## 5. Test results

```
bun test v1.3.13
 316 pass
 0 fail
 665 expect() calls
Ran 316 tests across 22 files.
```

All existing intents' behavior is pinned exactly as before (including the two pre-existing "KNOWN DEFECT"/"KNOWN GAP" tests in `planner/index.test.ts`, preserved with their original intent, retyped only). The two obsolete prose-truncation tests (5-item-with-ellipsis, in `resolveCustomer.test.ts` and `resolveProject.test.ts`) were replaced with 20-candidate-cap tests, since that truncation behavior no longer exists under the new design — net test count is essentially unchanged.

## 6. Build status

- `npm run typecheck` — clean.
- `npm run typecheck:tests` — clean.
- `npx eslint` on every touched file — clean (two Prettier formatting issues were auto-fixed via `--fix`; no logic changes).
- `bun test` — 316/316 passing.
- `npm run build` — succeeded.

## 7. Remaining limitations

- **Dot-path blocker fields and the patch merge.** `completeDraftAction`'s patch is still a flat object, shallow-merged into `params` by the unmodified Workflow Engine (`{ ...planParams, ...patch }`). A per-line-item blocker on `create_quotation` (e.g. `field: "items.0.quantity"`) renders a proper number input, but a dotted key doesn't rewrite a nested `items` array via a shallow spread — completing that specific blocker from the Copilot panel today doesn't yet patch just that one item. This is a pre-existing Workflow Engine constraint, explicitly out of scope for this sprint ("Do NOT redesign... Workflow Engine"), and is documented in `docs/VIE-Structured-Blockers.md` §3.2 rather than silently worked around.
- **Legacy rows.** Any `vie_actions` row staged before this sprint shipped would have a plain-string `plan_blockers` array at rest. The UI defends against this with a runtime shape check (`parseBlockers`) that drops anything that doesn't structurally look like a `PlannerBlocker` rather than crashing — but such a row's blockers simply won't render, since there's no DB migration backfilling old rows (draft rows are short-lived by nature, so this is judged sufficient rather than adding a migration this sprint didn't ask for).
- **Date input is a native `<input type="date">`**, not the app's existing `Calendar`/`Popover` combo (which isn't wired into any form elsewhere in the codebase yet). This keeps the sprint's footprint minimal; swapping in the richer calendar popover later is a small, isolated follow-up.
- **No blocker producer yet for several declared types** — `vendor_selection`, `delivery_date_required`, `number_required`, and the stone-attribute selection types (`stone_selection`, `colour_selection`, `finish_selection`, `thickness_selection`) have no current resolver producing them (VIE has no vendor/stone-attribute-resolving intent yet). The UI renders them correctly the moment a future intent starts producing them — no UI change will be needed, only a new resolver.
- **No "required: false" concept exists anywhere yet** — the field is declared for forward compatibility only, per the sprint's own instruction; nothing in this sprint introduces soft/advisory blockers.

Per the sprint's explicit instruction, this work is frozen here. AI-2 (or any further sprint) will not begin without new, explicit instruction.

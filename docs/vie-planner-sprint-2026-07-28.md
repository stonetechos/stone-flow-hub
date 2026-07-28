# VIE Planner Sprint — Final Report

**Date:** 2026-07-28
**Branch:** `feature/production-hardening-sprint` (continuing the same local branch as the two prior sprints this session — no instruction to start a new one)
**Scope:** Planner only, per the brief. No Voice AI, no WhatsApp AI — both explicitly excluded. The Workflow Engine is untouched; nothing in this sprint executes an action or writes to the database.

This sprint follows the approved VIE Foundation sprint (Event Bus, Business Intent Model, Universal Entity Resolver, Notification Architecture, Mobile Safe Area — see `vie-foundation-sprint-2026-07-28.md`). It builds the first real consumer of the Business Intent Model: a Planner that turns a `BusinessIntent` into a reviewable, deterministic execution plan.

## What was built

**File:** `src/lib/vie/planner/fromBusinessIntent.ts` (+ `fromBusinessIntent.test.ts`, 29 tests)
**Also modified:** `src/lib/vie/types.ts` — additively, new types only, nothing existing changed.

`planFromBusinessIntent(intent: BusinessIntent, context?): Promise<BusinessIntentExecutionPlan>` is a second, parallel entry point alongside the existing `planAction()` (`planner/index.ts`), which turns a single, LLM-classified `VieUnderstanding` into one `VieExecutionPlan`. This new Planner is different in the way the brief asked for: it accepts the newer, source-independent `BusinessIntent` (foundation sprint) — a multi-section bag of whatever a capture actually contained, with no upstream classification telling it which single action to plan. Deciding *which* of VIE's four known actions (`create_customer`, `log_enquiry`, `create_quotation`, `note_followup`) a `BusinessIntent` implies — and how many, since it can genuinely imply more than one at once — is this Planner's own new responsibility, on top of everything `planAction()` already does (validate, resolve, detect missing information).

### The five brief requirements, and where each lives

- **Accept a BusinessIntent.** `planFromBusinessIntent()`'s sole required argument.
- **Validate completeness.** `businessIntentSchema.safeParse()` at the door (a structurally invalid `BusinessIntent` returns a degenerate, all-zero plan rather than throwing — see "Never mutates" below), then each candidate action's own real per-intent Zod schema (`createCustomerEntitiesSchema` etc., unchanged, reused from `types.ts`) against its mapped `Partial<X>` entities.
- **Detect missing information.** `PlannerBlocker` — the exact same closed type (`types.ts`) `planner/index.ts`'s resolvers already produce, reused verbatim, not reinvented. Every blocker-producing check this sprint's action builders run mirrors its `planner/index.ts` sibling's own logic (missing name, invalid mobile, missing quantity/unit price, missing follow-up date, ...).
- **Generate PlannerBlockers.** Same point — nothing new needed here, the existing type and existing resolver functions (`resolveCustomer`, `resolveProduct`, `resolveCustomerDuplicate`, `resolveProject`, `resolveFollowupTarget`) already produce them; this file calls those, unmodified.
- **Produce a deterministic Execution Plan.** `BusinessIntentExecutionPlan` (new type, `types.ts`) — see below for its shape and why it differs from `VieExecutionPlan`.

### Why a new plan shape, not a reuse of `VieExecutionPlan`

`VieExecutionPlan` was built for exactly one action per plan (one classified intent in, one operation out) and carries an execution-mode decision (`mode`/`effectiveMode`) because that pipeline can auto-execute via a configured policy. Neither fits here:

- **One `BusinessIntent` can imply several actions.** A single capture like "new customer Ramesh Patel, wants a granite countertop quote, follow up with him Thursday" implies THREE actions: create the customer, log the demand, schedule the follow-up — and the second and third can't run until the first has (they need a `customer_id` that doesn't exist yet). `VieExecutionPlan.operation` is singular; it has no way to express this.
- **No execution-mode field at all.** Per the brief, this Planner "returns a reviewable plan only" — auto-execution policy is explicitly out of scope. Wiring any of these plans to the Workflow Engine is a distinct, future decision this sprint does not make.

`BusinessIntentExecutionPlan` (`types.ts`):

```ts
interface BusinessIntentExecutionPlan {
  actions: PlannedAction[];
  dependencies: PlannedActionDependency[];
  validationErrors: PlanValidationError[];
  suggestedQuestions: PlannerSuggestedQuestion[];
  confidence: number;
  estimatedImpact: PlannerEstimatedImpact[];
  unhandledSections: string[];
}

interface PlannedAction {
  id: string;                    // "action-1", "action-2", ... — deterministic build order
  operation: VieIntent;
  params: Record<string, unknown>;  // SAME key names as VieExecutionPlan.params for this operation
  blockers: PlannerBlocker[];
  dependsOn: string[];           // derived from `dependencies`, never independently set
  confidence: number;
}
```

Every `PlannedAction.params` key name is chosen to exactly match what the same operation's existing action handler (`actions/logEnquiry.ts`, `actions/createCustomer.ts`, `actions/createQuotation.ts`, `actions/noteFollowup.ts`) and `VieExecutionPlan.params` already use — so a future Workflow Engine wiring of this plan shape needs no param translation layer, only a decision about whether/when to call it.

### Deciding which actions apply (the genuinely new part)

Deterministic, from which `BusinessIntent` sections are populated — no LLM call anywhere in this file:

- `customer` has any field set, no existing customer resolves uniquely by name, and the name isn't ambiguously matching several existing customers -> propose `create_customer`. Telling "no match" apart from "ambiguous match" reuses a distinction the existing entity-resolution framework already encodes in the blocker's own shape (`candidates: []` for zero matches vs. a populated `candidates` array for an ambiguous one) — no new search logic was written to make this call.
- `products` non-empty -> propose `create_quotation`. `products` empty but `requirements.summary` present -> propose `log_enquiry`. **Never both** for the same intent — a quotation's own `requirements` mapping already folds free-text requirements into its notes, so a second, separate enquiry would just duplicate the same conversation.
- `followups` non-empty -> propose `note_followup`, from the first entry only (the same limitation `toNoteFollowupEntities()` itself already documents from the foundation sprint).
- `intent.actions` (the Business Intent Model's own soft, free-text "what does the source think happened" field) is deliberately **not** used to drive this decision — deciding what to do is this Planner's job, not something a capture source's own guess should short-circuit. If populated, it shows up in `unhandledSections` rather than being silently trusted or silently dropped.

### Dependencies

The one concept `VieExecutionPlan` never needed. When a `create_customer` action is proposed (the customer doesn't exist yet) and another action in the same plan also needs that customer, a dependency edge is recorded: `{ actionId, dependsOnActionId, reason }`. The demand action (`log_enquiry`/`create_quotation`) always qualifies whenever a `create_customer` action exists in the plan, since both share the exact same customer resolution. `note_followup` resolves its target independently (it also checks caller-supplied page context, a broader concept than "which customer") — it only gets the dependency edge when its own resolution also came back empty, checked directly off its built params rather than threaded through as a separate flag. Each action's own `dependsOn` array is a derived projection of this same graph, not an independent source of truth.

A dependency is never itself a blocker — it's about sequence, not missing information. An action can have a dependency and zero blockers (fully specified, just has to wait its turn), or blockers and no dependency (independently incomplete), or — the common case when a customer is being created alongside — both at once: right now the action genuinely has no `customer_id` (blocker), and the reviewer can see why (dependency).

### Validation errors vs. blockers

Kept as two distinct lists, matching how a UI would render them differently ("please provide X" vs. "the X you gave us doesn't look right"). A `PlannerBlocker` is missing or ambiguous information a human needs to supply or choose. A `PlanValidationError` is malformed data that was present but invalid — the mapped `Partial<X>` entities failing their own real Zod schema. In practice this list is almost always empty: the `BusinessIntent` section schemas' own field constraints (enums, positive-number checks) already mirror the target entity schemas' by design, so this is defense in depth against the two drifting apart in the future, or a genuinely malformed capture (e.g. a negative quantity) reaching this far — not the common path.

### Suggested questions

Deterministic and table-driven — every `PlannerBlockerType` (the existing closed set in `types.ts`) maps to exactly one question template (`BLOCKER_QUESTION_TEMPLATES`). A `customer_selection`/`project_selection` blocker with real candidates lists them by name in the question; a `confirmation_required` blocker reuses its own `message` verbatim rather than rewording it. Never LLM-generated.

### Confidence

Deterministic arithmetic only. A missing source confidence (not every capture source can produce one) defaults to a neutral 0.5 — not fabricated certainty, not an automatic penalty. Each action's confidence is that base, discounted by its own blocker count (−0.2 each) and validation-error count (−0.25 each), clamped to `[0, 1]`. Plan-level confidence is the minimum across all actions (a plan is only as confident as its least-confident action) — or, when there are zero actions, 1 if nothing was wrong (a legitimate "nothing to propose" outcome) or 0 if the `BusinessIntent` itself failed structural validation.

### Estimated impact

Deterministic, arithmetic-only summaries of what executing each action would actually do — never an LLM guess at consequences. A quotation's estimated total is computed the same way `planLogEnquiry()`'s `budget_inr` already is (`quantity * rate`, summed across line items where both are known) — application code always computes, never the model.

### `unhandledSections`

Computed generically, not a hardcoded per-action list: after building every proposed action, any top-level `BusinessIntent` section that had content but wasn't read by any action's params is named here. Today this always includes `measurements`/`tasks`/`documents`/`intent.actions` when populated (no VIE action handler reads any of them yet — a real, stated gap, not a silent one), and conditionally `budget`/`timeline` when `create_quotation` (not `log_enquiry`) was the chosen path, since `quoteCreateSchema` has no single budget/timeline field the way `logEnquiryEntitiesSchema` does.

## Never mutates the database, never calls an ERP action

Verified, not just claimed:

- This file imports only the five existing, read-only resolvers (`resolveCustomer`, `resolveCustomerDuplicate`, `resolveProduct`, `resolveProject`, `resolveFollowupTarget`) plus the pure mapping functions and schemas from `businessIntent.ts`/`types.ts`. It does not import `actions/registry.ts`, `workflowEngine.ts`, or any `create*`/`update*`/`delete*` function from any `api.ts`.
- A structurally invalid `BusinessIntent` returns a degenerate, all-zero plan (`invalidIntentPlan()`) rather than throwing — the same "surface the problem, never crash" discipline `notify.server.ts` and the Universal Entity Resolver already follow for their own failure modes.
- A dedicated test (`"never calls any mutating customer/product/project function"`) asserts `createCustomer`/`updateCustomer`/`deleteCustomer`/`createProject` are never invoked across a plan that exercises every action type.

## A quirk found and fixed while porting logic from `planner/index.ts`

`planLogEnquiry()` (the existing, unmodified `planner/index.ts`) builds a `requirement` string from quantity/material/rate, falling back to `understanding.canonicalText` when none of those were extracted — except its `material` variable itself falls back to the literal string `"material"` when no product resolved, which is always truthy, so the array it's checked against is never actually empty and the `canonicalText` fallback can never fire. Harmless in that pipeline today (a `VieUnderstanding` always has something to fall back through), but this sprint's equivalent code path (`buildLogEnquiryAction()`) does the same computation for a `BusinessIntent`, where the fallback mattering is a realistic case (a capture with a requirements summary but no product mention at all). Fixed in the new file only — `material` is left `undefined` instead of defaulting to a placeholder word, so a requirements-only capture correctly produces its own requirements text as the enquiry's requirement, not the word "material". `planner/index.ts` itself is untouched; this is not a regression fix to existing, shipped behavior, just a decision not to carry a latent no-op forward into new code. Caught by this sprint's own test suite, not by inspection.

## Files changed

- `src/lib/vie/types.ts` — additive only: `PlanValidationError`, `PlannerSuggestedQuestion`, `PlannerEstimatedImpact`, `PlannedActionDependency`, `PlannedAction`, `BusinessIntentExecutionPlan`. Nothing existing modified.
- `src/lib/vie/planner/fromBusinessIntent.ts` — new, 851 lines including extensive header/inline documentation of the design decisions above.
- `src/lib/vie/planner/fromBusinessIntent.test.ts` — new, 29 tests.

No other file touched. `planner/index.ts`, `workflowEngine.ts`, `actions/registry.ts`, and every existing resolver are byte-for-byte unchanged.

## Tests executed

```
npx tsc --noEmit  → clean, 0 errors
npx eslint <changed files> → 0 errors, 0 warnings
bun test           → 405 pass, 0 fail, 838 expect() calls, across 29 files
```

29 new tests in `fromBusinessIntent.test.ts`, covering: zero-section intents, structural-validation failure, the never-mutates guarantee, existing/no-match/ambiguous customer resolution, the create_quotation-vs-log_enquiry exclusivity rule (including the "neither -> nothing proposed" case), per-line-item quotation blockers, note_followup with and without a pending customer-creation dependency, deterministic sequential action ids, plan determinism (same input -> identical output), `unhandledSections` for both the always-unhandled sections and the conditional budget/timeline case, every suggested-question template exercised at least once, every action type's estimated-impact summary, and the confidence formula (per-action penalty, plan-level minimum, neutral default). Reuses the shared `testSupport/moduleMocks.ts` mocks throughout — no new `mock.module()` registration was needed, since every underlying lookup this file makes was already covered there from prior sprints.

## Deliberately not done this sprint (Planner-only scope)

- No Voice AI, no WhatsApp AI — both explicitly excluded by the brief. No source adapter work of any kind; this sprint consumes `BusinessIntent` values, it doesn't produce them.
- No Workflow Engine wiring — `planFromBusinessIntent()` is called by nothing yet (no route, no server function, no Copilot integration). "Workflow Engine remains responsible for execution" per the brief; nothing here calls it.
- No multi-follow-up fan-out — a `BusinessIntent` with several `followups` entries still only plans one `note_followup` action, from the first entry (matching `toNoteFollowupEntities()`'s own existing scope). A stated limitation for a future iteration, not silently handled.
- No re-planning after a dependency resolves — this Planner produces one static snapshot. If a reviewer approves and executes the `create_customer` action from a plan, nothing here re-runs `planFromBusinessIntent()` to pick up the now-real `customer_id` for the dependent actions; that would be Workflow Engine/orchestration work, out of scope.

## Push authorization

Per the brief: **commit locally only.** This sprint's commit sits on top of the two prior sprints' unpushed commits on `feature/production-hardening-sprint`. Nothing has been pushed to `origin`.

**Stopping here after the Planner, per the brief's explicit instruction.**

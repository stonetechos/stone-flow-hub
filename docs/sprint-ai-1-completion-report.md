# Sprint AI-1 — Copilot ↔ VIE Integration

**Status: implementation complete, freezing per sprint instructions.**
This sprint turned the existing Copilot chat panel into a real front end for the existing Vedora
Intelligence Engine (VIE). VIE's Understand → Plan → Execute pipeline — `understand.ts`,
`planner/`, `workflowEngine.ts`, `actions/*`, `policy.ts`, `types.ts` — was not touched, read, or
redesigned in any way beyond being read to learn its exact contracts; every requested behavior was
built by calling `understandAndStage()`, `confirmVieAction()`, and `completeDraftAction()` exactly
as those three server functions already exist, and rendering exactly what they return.

## 1. Architecture summary

**Before this sprint**, two AI-facing surfaces coexisted with no relationship to each other:
`src/components/copilot/Copilot.tsx` was a chat panel that only ever called `nlSearch` (read-only,
deterministic data lookups) and `askCopilot` (free-form Q&A, explicitly cannot write or access the
database); `src/lib/vie/vie.functions.ts`'s three server functions were fully built, tested, and
staff-gated, but had zero call sites anywhere in the UI — VIE was completely headless.

**This sprint added an explicit "Ask" / "Do" toggle** to the Copilot panel (a `Tabs` control, not
an automatic router) rather than trying to guess from a message whether it's a question or an
action:

- **"Ask" mode is completely unchanged** — same `nlSearch`/`askCopilot` calls, same behavior, same
  code paths, byte-for-byte as before this sprint except for two small filter updates needed so a
  new message kind doesn't leak into chat history/bookmarks (see § 2).
- **"Do" mode is new.** Every submission calls `understandAndStage()` with a fresh
  client-generated `requestId` (the idempotency key the function already requires), the raw text,
  and the same page-context passthrough (`entityType`/`entityId`) `nlSearch` already sends. The
  returned `vie_actions` row is appended to the chat thread as a new message kind and rendered
  purely as a function of its `status`:

  | `status` | Rendered as |
  |---|---|
  | `awaiting_confirmation` | A confirmation card — intent, the AI's canonical reading of the utterance, every field in `plan.params`, and a **Confirm** button that calls `confirmVieAction({ actionId })` |
  | `draft` | A clarification card — the blockers VIE's Planner reported, the plan so far, and inline fields for whatever's still unresolved; **Complete & execute** calls `completeDraftAction({ actionId, patch })` with only the fields the user actually filled in |
  | `applied` | A success card, with a link to the record that was actually created (via `linked_record_type`/`linked_record_id`) |
  | `failed` / `rejected` | The real `error_message` VIE/the Workflow Engine recorded, verbatim |

  A local-only **Dismiss** button is also offered on the confirmation and draft cards — this never
  calls any server function (there is no cancel/reject endpoint in VIE today, and adding one would
  be new business logic, out of scope — see § 5); it only hides the card from the local chat view.

This is the entire integration. No new AI provider, no new server functions, no new database
tables or columns, no changes to VIE's intents, resolvers, execution policy, or Action Registry.

## 2. Files modified

**New:**
- `src/components/copilot/VieActionCard.tsx` — the `vie_actions` row renderer described in § 1:
  `VieActionMessage` (status dispatch), `DraftCard` (blocker + inline patch form), `ParamsPreview`
  (a generic `plan.params` renderer — labeled key/value rows, arrays of objects as a nested list —
  deliberately generic rather than a bespoke layout per intent, so it never drifts out of sync with
  whatever the Planner puts in `params` for a current or future intent), and a small
  `linked_record_type → route` map for outcome-card links. Display-only; no writes, no resolution
  logic.

**Modified:**
- `src/components/copilot/Copilot.tsx` — added the `mode` state and `Tabs` toggle; added the
  `stageAction`/`confirmAction`/`completeDraft` mutations wrapping the three VIE server functions;
  added the `vie-action` message kind and its rendering branch; updated the `send` mutation's chat
  history filter and `bookmarkLast()` to also exclude the new message kind (both previously only
  excluded `"nl-results"`); added mode-conditional header copy, placeholder text, and empty-state
  suggestion chips. Every existing "Ask"-mode code path (`nlSearchMutation`, `send`, the insights
  panel, bookmarks, the keyboard shortcut) is unchanged.

**Not touched, anywhere in this sprint:** `src/lib/vie/**` (VIE core, Planner, Workflow Engine,
Action Registry, all four intent handlers, execution policy), `src/lib/ai/copilot.functions.ts`,
`src/lib/ai/nl-search.functions.ts`, any Supabase migration, any RLS policy, `src/lib/errors.ts`,
`src/hooks/use-roles.tsx`. Confirmed by `git diff --stat`: two files changed, both under
`src/components/copilot/`.

## 3. Build status

**Green.**
- `npm run typecheck` — clean.
- `npm run typecheck:tests` — clean.
- `eslint`, scoped to both touched files — two Prettier formatting issues introduced by this
  sprint's own edits (a wrapped ternary, an object-literal line-break), both auto-fixed with
  `eslint --fix`; clean afterward.
- `npm run build` — succeeds. The build output now includes `vie.functions` as its own bundled SSR
  chunk (it previously had no reason to be pulled into the client-reachable graph at all, since
  nothing called it) — concrete confirmation that the wiring is real, not just type-correct.

## 4. Test status

`bun test` — **317 pass, 0 fail**, unchanged from before this sprint. No new automated tests were
added for the new UI: this codebase has no component-testing infrastructure today (no
`@testing-library` dependency, no existing `.test.tsx` files anywhere — every existing test is a
pure-logic `.test.ts` file), and standing one up would be new tooling/architecture, out of scope
for a "build only the missing UI layer" sprint. VIE's own extensive test suite (types, planner,
resolvers, the four action handlers, the registry) already covers everything this sprint calls
into and was not touched, so it continues to pass unmodified. This is flagged as a real gap in § 5,
not swept aside.

## 5. Remaining limitations

- **No automated test coverage for the new UI** (§ 4) — manual verification only (typecheck, lint,
  build, and a read-through of the rendering logic against every `VieActionStatus`). Worth a
  follow-up once/if this codebase adopts component testing generally — not a good reason to
  introduce that tooling unilaterally inside this sprint.
- **Draft completion is a generic key/value form, not a real disambiguation UI.** `plan_blockers`
  is still an untyped `string[]` today — VIE Phase 2's own review scoped structuring it (with
  actual candidate lists, e.g. "which of these two Rameshes?") as Milestone 5, not implemented.
  Without that structure, this sprint's draft card can show the blocker *text* and offer a plain
  text/number field for whichever top-level `plan.params` keys are null — it cannot offer a picker
  for an ambiguous customer match, because the candidate IDs that would populate one aren't in the
  data it has access to. Complex fields (e.g. a quotation's line items) are shown read-only in the
  draft card for the same reason — there's no generic, safe way to let free text edit a nested
  array of typed objects without guessing at structure.
- **No cancel/reject action.** VIE has no "reject a staged action" server function — only
  `understandAndStage` (which can itself produce a `rejected` row for an unsupported intent),
  `confirmVieAction`, and `completeDraftAction`. A user who doesn't want to proceed with an
  `awaiting_confirmation` or `draft` card can only **Dismiss** it locally (hides it from view,
  changes nothing server-side) or simply not act on it — the row stays in that status in
  `vie_actions` indefinitely. Adding a real cancel endpoint would be new business logic and was
  correctly out of this sprint's scope.
- **`create_quotation`'s line-item extraction is exactly as complete as VIE already made it** — per
  the Planner's own code (`planner/index.ts`'s `planCreateQuotation`), a missing quantity or unit
  price is a blocker that forces `draft`, same as every other intent; this sprint didn't change
  that behavior and the generic draft card surfaces it the same way it surfaces any other intent's
  blockers.
- **"Ask" and "Do" are a manual toggle, not an automatic router.** A message typed in the wrong mode
  gets the wrong treatment (e.g., "how do I log a follow-up?" typed in "Do" mode would be sent to
  `understandAndStage()` and likely come back `rejected` or low-confidence, rather than answered as
  a how-to question). This was a deliberate choice (§ 1) to avoid adding a new intent-routing layer
  between two independent LLM systems that don't share a decision boundary today — flagged here as
  a real UX tradeoff, not an oversight.
- **Confidence/language/canonical-text are shown, but only as plain text on the confirmation
  card** — no dedicated badge styling or explanation of what a given confidence number means to a
  non-technical user. Cosmetic, not functional.

## 6. Freeze

Per the sprint's instruction, stopping here. No Sprint AI-2 work has been started or scoped beyond
what's already listed above as a limitation.

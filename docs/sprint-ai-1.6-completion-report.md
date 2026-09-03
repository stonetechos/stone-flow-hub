# Sprint AI-1.6 Completion Report — Generic Entity Resolution Framework

**Date:** 2026-07-22
**Branch:** `feature/vie-quotation`
**Scope:** Factor the shared search/ambiguity-detection/blocker-building logic every Planner resolver independently reimplemented into a single reusable framework (`entityResolution.ts`), and refactor the five existing resolvers into thin adapters over it — with existing behavior, including every generated `PlannerBlocker`, unchanged.

This sprint extends Sprint AI-1.5's structured blocker model with no changes to that model itself. It does not redesign Understand, the Planner's own `planX()` orchestration (`planner/index.ts`), the Workflow Engine, the Action Registry, execution policies, authentication/authorization, audit logging, or the Copilot UI — all unchanged, as required.

## 1. Architecture summary

Before this sprint, `resolveCustomer.ts`, `resolveProject.ts`, `resolveFollowupTarget.ts`, and `resolveCustomerDuplicate.ts` each independently implemented: run a search, classify the result as empty/one/ambiguous, and build a `PlannerBlocker` accordingly — with `resolveCustomer.ts` and `resolveFollowupTarget.ts`'s zero-match/multi-match blocker code in particular near-identical, differing only in field names and message text. `resolveProduct.ts` shared the same classification shape but deliberately never builds a blocker.

`src/lib/vie/planner/entityResolution.ts` (new) factors the shared shape into three primitives — classification (`classifyMatches`/`searchAndClassify`), and blocker assembly for each of the three shapes any resolver needs (`missingPrerequisiteBlocker`/`requiredInputBlocker` for a missing precondition, `selectionBlocker`/`resolveEntityByQuery` for an ambiguous/empty search result, `confirmationBlocker` for a single-match warning). Each of the five existing resolvers now calls into these primitives, supplying only what's genuinely entity-specific: the search function, candidate label/subtitle, message text, and (for `resolveProject.ts`) its own business-specific candidate-narrowing step, which stays entirely in that resolver rather than being absorbed into the framework.

This is a pure refactor. Every resolver's exported function signature and return shape (`CustomerResolution`, `ProjectResolution`, `FollowupTargetResolution`, `CustomerDuplicateResolution`, `ProductResolution`) is unchanged, and every `PlannerBlocker` any of them produces is byte-for-byte identical to before this sprint — confirmed by running all five resolvers' existing test files completely unmodified (see §5). Full design detail, the exact contract each helper implements, and the extension guide for future entity types live in `docs/VIE-Entity-Resolution-Framework.md`.

## 2. Files modified

**Framework (new):**
- `src/lib/vie/planner/entityResolution.ts`

**Resolvers (refactored into thin adapters; no exported-shape or behavior change):**
- `src/lib/vie/planner/resolveCustomer.ts`
- `src/lib/vie/planner/resolveFollowupTarget.ts`
- `src/lib/vie/planner/resolveProject.ts`
- `src/lib/vie/planner/resolveCustomerDuplicate.ts`
- `src/lib/vie/planner/resolveProduct.ts`

**Documentation (new):**
- `docs/VIE-Entity-Resolution-Framework.md`
- `docs/sprint-ai-1.6-completion-report.md` (this file)

**Not touched**, confirmed via `git diff --stat`: `planner/index.ts`, `understand.ts`, `workflowEngine.ts`, `actions/registry.ts`, any `actions/*.ts` handler, `policy.ts`, any Supabase migration, `Copilot.tsx`, `VieActionCard.tsx`, `types.ts`, and — notably — every resolver's own `*.test.ts` file (`resolveCustomer.test.ts`, `resolveCustomerDuplicate.test.ts`, `resolveFollowupTarget.test.ts`, `resolveProject.test.ts`, `resolveProduct.test.ts`), plus `resolveEffectiveMode.test.ts` and `planner/index.test.ts`.

## 3. Framework overview

Three blocker shapes, each with its own builder:

- **Missing prerequisite** (`missingPrerequisiteBlocker` / `requiredInputBlocker`) — nothing was even available to search with. No candidates, no `currentValue`.
- **Selection** (`selectionBlocker` / `resolveEntityByQuery`) — a search ran and returned zero or multiple matches. Built from an already-classified `MatchOutcome`, so a resolver that pre-filters its own candidates (see `resolveProject.ts` below) can still hand the post-filter result to this helper.
- **Confirmation** (`confirmationBlocker`) — a search found exactly one match, but it's a warning to surface rather than a pick-one prompt. Built from a single record, not an outcome.

Plus one shared classification primitive (`classifyMatches` / `searchAndClassify`) that every resolver uses, including `resolveProduct.ts` — which uses only this, never a blocker builder, since it's deliberately never a blocker.

Two declared-but-unused extension points satisfy the sprint's "fuzzy match / candidate ranking / confidence metadata" framework responsibilities without changing any current resolver's behavior: an optional `rank` hook on the search-and-classify path, and an optional `confidence` field on the framework's own candidate-building type (`RankedCandidate`), not on the `PlannerBlockerCandidate` wire shape itself. No current resolver sets either — every current entity's matching is still whatever ILIKE-based partial search its underlying `api.ts` function already did, unchanged.

## 4. Resolver migration summary

| Resolver | Framework helpers used | Business-specific logic retained |
|---|---|---|
| `resolveCustomer.ts` | `requiredInputBlocker`, `resolveEntityByQuery` | `listCustomers` search wiring, untrimmed-message/trimmed-search split |
| `resolveFollowupTarget.ts` | `requiredInputBlocker`, `resolveEntityByQuery` | Caller-supplied-context short-circuit |
| `resolveProject.ts` | `missingPrerequisiteBlocker`, `classifyMatches`, `selectionBlocker` | `projectTextHint` candidate narrowing, `who`-phrase message construction |
| `resolveCustomerDuplicate.ts` | `confirmationBlocker` | `findCustomerByPhone` lookup |
| `resolveProduct.ts` | `classifyMatches` only | Never blocks — the one resolver using only the classification primitive |

`Customer`, `Project`, `Follow-up Target`, `Customer Duplicate`, and `Product` — every entity type the sprint named for refactoring — are covered. `Vendor`, `Stone`, `Colour`, `Finish`, `Thickness`, `Sales Executive`, and `Site` have no resolver yet (none did before this sprint either); `docs/VIE-Entity-Resolution-Framework.md` §6 documents exactly which framework shape each would use once its `api.ts` lookup exists.

## 5. Test results

All five refactored resolvers' test files, plus `resolveEffectiveMode.test.ts` and `planner/index.test.ts`, were run **completely unmodified** against the refactored code:

```
bun test v1.3.13
 316 pass
 0 fail
 665 expect() calls
Ran 316 tests across 22 files.
```

Zero test changes were needed — the strongest available confirmation that "existing behaviour must remain identical" and "the generated PlannerBlockers should remain identical" both hold, since these tests were written to pin the pre-refactor behavior exactly.

## 6. Build status

- `npm run typecheck` — clean.
- `npm run typecheck:tests` — clean.
- `npx eslint` on every touched/new file — clean (two Prettier formatting issues in `entityResolution.ts` were auto-fixed via `--fix`; no logic changes).
- `bun test` — 316/316 passing, no test files modified.
- `npm run build` — succeeded.

## 7. Remaining limitations

- **No new entity types were actually added.** The sprint's "future-ready support for" list (Vendor, Stone, Colour, Finish, Thickness, Sales Executive, Site) describes entities the framework is *shaped* to support once each has its own `api.ts` lookup and (where needed) a `PlannerBlockerType` — none of those lookups exist yet, so no new resolver was written this sprint. This matches the sprint's own framing ("future-ready support for," not "implement").
- **No genuine fuzzy matching or candidate ranking exists yet.** The `rank` hook and `RankedCandidate.confidence` field are real extension points, but every current resolver still delegates entirely to its underlying `api.ts` function's existing `ILIKE`-based partial search — changing that was explicitly out of scope ("existing behaviour must remain identical").
- **The untrimmed-message/trimmed-search-call split in `resolveCustomer.ts`/`resolveFollowupTarget.ts`** (documented in `docs/VIE-Entity-Resolution-Framework.md` §5) is preserved exactly but is a slightly awkward wart inherited from before this sprint — a future cleanup could normalize this once a test explicitly covers the whitespace-in-message case, if that's ever judged worth a deliberate behavior change (it wasn't in scope here).
- **`resolveProject.ts`'s hint-narrowing step still lives entirely in that resolver**, not as a framework primitive — it's the only resolver with this shape today, so generalizing it into the framework would be speculative rather than reusable; documented as the concrete example future narrowing-style resolvers should follow, not abstracted further.

Per the sprint's explicit instruction, this work is frozen here. AI-2 (or any further sprint) will not begin without new, explicit instruction.

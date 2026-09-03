# VIE Generic Entity Resolution Framework

**Sprint:** AI-1.6 — Generic Entity Resolution Framework
**Status:** Shipped
**Scope:** `src/lib/vie/planner/entityResolution.ts` (new), and the five existing resolver files it refactors: `resolveCustomer.ts`, `resolveProject.ts`, `resolveFollowupTarget.ts`, `resolveCustomerDuplicate.ts`, `resolveProduct.ts`.

This document describes the generic Entity Resolution Framework introduced in Sprint AI-1.6: why it exists, what it owns versus what stays resolver-specific, the exact contract each helper implements, and how a future entity type (vendor, stone, colour, finish, thickness, sales executive, site) should be added. It complements — and does not replace — `docs/VIE-Structured-Blockers.md` (Sprint AI-1.5), which defines the `PlannerBlocker` shape this framework builds; that document's model and rendering contract are unchanged by this sprint.

## 1. Why this sprint exists

Before this sprint, every Planner resolver under `src/lib/vie/planner/` independently reimplemented the same shape of logic: run a search, decide whether the result was empty / exactly one / ambiguous, and — for every resolver except `resolveProduct.ts` — build a `PlannerBlocker` when it wasn't a single confident match. `resolveCustomer.ts` and `resolveFollowupTarget.ts` in particular had near-identical zero-match/multi-match blocker-building code, differing only in field names, message text, and candidate shape.

This sprint factors that shared shape out into `entityResolution.ts` once, so each resolver only has to specify what's genuinely entity-specific: how to search, how to label a match, and what its blocker's `type`/`field`/message text are. This is explicitly a **refactor, not a behavior change** — every resolver's exported function signature and return shape is unchanged, and every `PlannerBlocker` any of them produces is byte-for-byte identical to before this sprint. All five resolvers' existing `*.test.ts` files are unmodified and still pass unchanged against the refactored implementations (see §6).

## 2. What the framework owns vs. what stays resolver-specific

| Framework (`entityResolution.ts`) | Resolver-specific (each `resolve*.ts`) |
|---|---|
| Classifying a candidate list as none/one/many | The actual search call (which `api.ts` function) |
| Candidate-list construction and the 20-item cap | Display label / subtitle per record type |
| `PlannerBlocker` assembly for all three blocker shapes | Blocker message text and `type`/`field` |
| The "no input at all" precondition blocker | Business-specific narrowing (e.g. a project-text hint) |

This split matches the sprint's own instruction: *"Individual resolvers should only specify: entity type, database lookup, display label, subtitle, search fields, business-specific validation."*

## 3. The framework's contract

### 3.1 Classification — `MatchOutcome<TRecord>`, `classifyMatches()`, `searchAndClassify()`

```ts
export type MatchOutcome<TRecord> =
  | { kind: "none" }
  | { kind: "one"; record: TRecord }
  | { kind: "many"; records: TRecord[] };

export function classifyMatches<TRecord>(records: TRecord[]): MatchOutcome<TRecord>;

export async function searchAndClassify<TRecord>(
  query: string,
  search: (query: string) => Promise<TRecord[]>,
  rank?: (records: TRecord[]) => TRecord[],
): Promise<MatchOutcome<TRecord>>;
```

`classifyMatches()` is the one primitive every resolver uses, including `resolveProduct.ts` — which uses **only** this, never the blocker-building helpers below, since it is deliberately never a blocker (an unresolved product falls back to raw text, not a clarification prompt). `searchAndClassify()` adds the search call itself for the common case of "search by a raw query, then classify" with no pre-filtering step.

`resolveProject.ts` calls `classifyMatches()` directly rather than `searchAndClassify()`, because it needs to run its own business-specific narrowing (the `projectTextHint` step — see §4) on the fetched candidate list *before* classification, something a single combined search-and-classify call couldn't accommodate without absorbing that narrowing into the framework itself. Keeping narrowing in the resolver and classification in the framework is exactly the intended seam.

### 3.2 Blocker assembly — three shapes

Every blocker any current resolver produces fits one of three shapes:

**Missing prerequisite** — nothing was even available to search with (no customer name extracted, no `customer_id` to look a project up against). No search ran, so there are no candidates and no `currentValue`.

```ts
export function missingPrerequisiteBlocker(config: {
  id: string; type: PlannerBlockerType; field: string; message: string;
}): PlannerBlocker;

/** Convenience wrapper defaulting `type` to "text_required" — the common
 *  case for a missing raw-text field. */
export function requiredInputBlocker(config: {
  id: string; field: string; message: string; type?: PlannerBlockerType;
}): PlannerBlocker;
```

**Selection** — a search ran and the result was empty or ambiguous. Built from an already-classified outcome (not from a raw query), so a resolver that pre-filters its own candidates can still hand the *post-filter* outcome to this helper.

```ts
export function selectionBlocker<TRecord>(
  outcome: { kind: "none" } | { kind: "many"; records: TRecord[] },
  config: {
    id: string; type: PlannerBlockerType; field: string;
    toCandidate: (record: TRecord) => RankedCandidate;
    noMatchMessage: string;
    multipleMatchesMessage: (count: number) => string;
    currentValue?: unknown;
    maxCandidates?: number; // default 20 (DEFAULT_MAX_CANDIDATES)
  },
): PlannerBlocker;

/** End-to-end convenience: search by a raw text query, then build a
 *  selection blocker if the result isn't a single match. Covers
 *  resolveCustomer.ts and resolveFollowupTarget.ts's name-lookup branch. */
export async function resolveEntityByQuery<TRecord>(
  query: string,
  config: { id, field?, type, search, toCandidate, noMatchMessage, multipleMatchesMessage, maxCandidates?, rank? },
): Promise<{ record: TRecord | null; blocker: PlannerBlocker | null }>;
```

**Confirmation** — a search found exactly one match, but it's a warning rather than a pick-one prompt (there's nothing ambiguous; the employee just needs to see it before deciding whether to proceed). Built from a single already-resolved record, not an outcome.

```ts
export function confirmationBlocker<TRecord>(
  record: TRecord,
  config: {
    id: string; field: string; message: string;
    toCandidate: (record: TRecord) => RankedCandidate;
    currentValue?: unknown;
  },
): PlannerBlocker;
```

### 3.3 Extension points that exist but nothing uses yet

The sprint's framework-responsibilities list names "fuzzy match," "candidate ranking," and "confidence metadata" explicitly. Every current resolver delegates matching entirely to an existing `api.ts` list function's own `ILIKE`-based partial search — no resolver today does client-side fuzzy scoring or ranking, and changing that was explicitly out of scope ("existing behaviour must remain identical," "the generated PlannerBlockers should remain identical"). Two extension points exist for a *future* entity that does need this, without requiring a framework change when it arrives:

- **`rank?: (records: TRecord[]) => TRecord[]`** on `searchAndClassify()`/`resolveEntityByQuery()` — reorders/scores the result set before classification. Every current caller omits it, which is exactly why today's candidate ordering is unchanged.
- **`RankedCandidate`** — `PlannerBlockerCandidate & { confidence?: number }` — the type every `toCandidate` callback returns. No current resolver sets `confidence`; it's declared on the framework's own candidate-building input type, not on `PlannerBlockerCandidate` itself (the wire shape persisted to `vie_actions.plan_blockers` and read by the Copilot UI), so adding it here required zero changes to `types.ts`, `vie.functions.ts`, or `VieActionCard.tsx`.

## 4. Resolver migration summary

| Resolver | Framework helpers used | What stayed resolver-specific |
|---|---|---|
| `resolveCustomer.ts` | `requiredInputBlocker`, `resolveEntityByQuery` | The `listCustomers` search call and its untrimmed-message/trimmed-search-call split (see §5), candidate label/subtitle (`name`/`customer_code`) |
| `resolveFollowupTarget.ts` | `requiredInputBlocker`, `resolveEntityByQuery` | The caller-supplied-context short-circuit (nothing to search for at all), same trim split as above |
| `resolveProject.ts` | `missingPrerequisiteBlocker`, `classifyMatches`, `selectionBlocker` | The `projectTextHint` narrowing step, the `who` (customer-label-or-generic-phrase) message construction |
| `resolveCustomerDuplicate.ts` | `confirmationBlocker` | The `findCustomerByPhone` lookup and the decision to check at all |
| `resolveProduct.ts` | `classifyMatches` only | Never builds a blocker — deliberately the one resolver that only uses the framework's classification primitive |

Every resolver's own file-header comment documents exactly this split for that resolver, so a reader doesn't need this document open to understand which parts are generic and which are that resolver's own responsibility.

## 5. A subtlety the refactor preserved deliberately

`resolveCustomer.ts` and `resolveFollowupTarget.ts` both call `listCustomers()` with a **trimmed** name, but interpolate the **untrimmed, raw** name into the blocker's `message`/`currentValue`. This was true before Sprint AI-1.6 and remains true after: `resolveEntityByQuery()` doesn't trim its `query` argument on a caller's behalf, so both resolvers pass the framework the raw value directly and wrap only the `search` callback with a `.trim()`:

```ts
const { record, blocker } = await resolveEntityByQuery(name, {
  // ...
  search: (query) => listCustomers(query.trim()),
  noMatchMessage: (q) => `No existing customer matches "${q}".`, // q is the RAW name
  // ...
});
```

No current test exercises a name with leading/trailing whitespace through the ambiguous-match path, so this distinction wasn't test-visible either way — it was preserved anyway, since "existing behaviour must remain identical" is a stronger requirement than "existing tests must pass."

## 6. How future entities are added

The sprint names eight future-ready entity types with no resolver yet: Vendor, Stone, Colour, Finish, Thickness, Sales Executive, Site. Adding one, once its own `api.ts` list function and any AI-1.5 `PlannerBlockerType` member exist (see `docs/VIE-Structured-Blockers.md` §6 for how a new blocker type itself is added), is now:

1. **If it's a straightforward "search by text, resolve to one or blocker" entity** (the `resolveCustomer.ts` shape) — write a resolver file that calls `resolveEntityByQuery()` directly, supplying only the search function, `toCandidate`, and message builders. No new framework code needed.
2. **If it needs its own narrowing/validation step first** (the `resolveProject.ts` shape) — fetch candidates, run the resolver-specific narrowing, then call `classifyMatches()` + `selectionBlocker()` on the (possibly narrowed) result.
3. **If a match is a warning rather than a pick-one prompt** (the `resolveCustomerDuplicate.ts` shape) — run the lookup, then call `confirmationBlocker()` on the single match.
4. **If it should never block** (the `resolveProduct.ts` shape) — call `classifyMatches()` on the search result and only ever consume the `"one"` case; never call any blocker-building helper.

In every case, the new resolver plugs into `planner/index.ts`'s existing `planX()` functions exactly the way the five current resolvers already do (`if (x.blocker) blockers.push(x.blocker)`) — this sprint made no changes there, and none are needed for a new resolver either.

## 7. Testing

`resolveCustomer.test.ts`, `resolveCustomerDuplicate.test.ts`, `resolveFollowupTarget.test.ts`, `resolveProject.test.ts`, `resolveProduct.test.ts`, `resolveEffectiveMode.test.ts`, and `planner/index.test.ts` are all **unmodified** by this sprint. All 316 existing tests pass unchanged against the refactored resolvers, which is the strongest available confirmation that this sprint's "existing behaviour must remain identical" requirement holds — the tests were written to pin the pre-refactor behavior exactly, and none needed a single assertion changed.

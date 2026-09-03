/**
 * Generic Entity Resolution Framework (Sprint AI-1.6).
 *
 * Every existing Planner resolver (resolveCustomer.ts, resolveProject.ts,
 * resolveFollowupTarget.ts, resolveCustomerDuplicate.ts, resolveProduct.ts)
 * independently reimplemented the same shape of logic: search for
 * candidate records, decide whether the result set is empty / exactly one /
 * ambiguous, and — for every resolver except resolveProduct.ts — build a
 * PlannerBlocker when it isn't a single confident match. This file factors
 * that shape out once, so a resolver only has to specify what's genuinely
 * entity-specific: how to search, how to label a record, and what its
 * blocker's `type`/`field` are — not how "zero/one/many" turns into a
 * result.
 *
 * This is a pure refactor (Sprint AI-1.6's own instruction: "existing
 * behaviour must remain identical"). Every existing resolver's exported
 * function signature and return shape is unchanged, and every PlannerBlocker
 * any of them produces is byte-for-byte identical to before this file
 * existed — each resolver's own file documents its adapter wiring, and
 * every resolver's *.test.ts file is unmodified by this sprint, still
 * pinning the exact same behavior. Nothing in planner/index.ts, the
 * Workflow Engine, the Action Registry, or the Copilot UI changed to make
 * this possible — this framework is used exclusively by the five resolver
 * files listed above.
 *
 * Framework responsibilities vs. what stays resolver-specific:
 *   - Entity lookup, ambiguity detection, candidate-list construction,
 *     candidate limits, and PlannerBlocker assembly: HERE, once.
 *   - The actual search (which api.ts function, what "exact" or "fuzzy"
 *     means for a given entity), the display label/subtitle, and any
 *     business-specific narrowing (e.g. resolveProject.ts's projectTextHint
 *     step): stays in each resolver, passed into this framework as plain
 *     functions/config rather than reimplemented.
 *
 * "Fuzzy match" / "candidate ranking" / "confidence metadata": every current
 * resolver delegates matching entirely to an existing api.ts list
 * function's own ILIKE-based partial search, unchanged by this sprint — no
 * resolver today does client-side fuzzy scoring or ranking. The `rank` hook
 * on resolveEntityByQuery() and the optional `confidence` field on
 * EntityCandidate exist as extension points a *future* entity (e.g. one
 * needing genuine fuzzy matching) can use without a framework change; every
 * current caller omits both, which is exactly why today's behavior and
 * candidate ordering are unchanged.
 */
import type { PlannerBlocker, PlannerBlockerCandidate, PlannerBlockerType } from "../types";

/** Every existing resolver's own MAX_CANDIDATES constant was 20 — centralized
 *  here as the framework default, still overridable per entity type via
 *  `maxCandidates` on the configs below. Purely a bound against a
 *  pathological search term handing the UI an unbounded list (see
 *  VIE-Structured-Blockers.md §2); not a prose-readability limit — a
 *  rendered candidate list has no such limit the way a formatted sentence
 *  did before Sprint AI-1.5. */
export const DEFAULT_MAX_CANDIDATES = 20;

// ---------------------------------------------------------------------------
// Classification: turning a candidate record list into "none" / "one" /
// "many". This is the one piece of logic every current resolver shares,
// including resolveProduct.ts — which uses ONLY this (never the
// blocker-building helpers below), since it is deliberately never a blocker
// (see resolveProduct.ts's own header comment, unchanged this sprint).
// ---------------------------------------------------------------------------

export type MatchOutcome<TRecord> =
  | { kind: "none" }
  | { kind: "one"; record: TRecord }
  | { kind: "many"; records: TRecord[] };

/** Classifies an already-fetched candidate list. Used directly by resolvers
 *  that do their own business-specific filtering before deciding ambiguity
 *  — resolveProject.ts's `projectTextHint` narrowing is the one example
 *  today (see that file): it fetches the full candidate set, optionally
 *  narrows it, and only then classifies the (possibly narrowed) result. */
export function classifyMatches<TRecord>(records: TRecord[]): MatchOutcome<TRecord> {
  if (records.length === 0) return { kind: "none" };
  if (records.length === 1) return { kind: "one", record: records[0] };
  return { kind: "many", records };
}

/** Runs `search(query)` and classifies the result — the common case for a
 *  resolver with no pre-filtering step of its own (resolveCustomer.ts,
 *  resolveFollowupTarget.ts, resolveProduct.ts). `rank`, if supplied, lets a
 *  future resolver reorder/score the result set before classification; see
 *  this file's header comment for why every current caller omits it. */
export async function searchAndClassify<TRecord>(
  query: string,
  search: (query: string) => Promise<TRecord[]>,
  rank?: (records: TRecord[]) => TRecord[],
): Promise<MatchOutcome<TRecord>> {
  const matches = await search(query);
  return classifyMatches(rank ? rank(matches) : matches);
}

// ---------------------------------------------------------------------------
// Blocker assembly. Three shapes cover every blocker any current resolver
// produces: a missing-prerequisite blocker (nothing to search with yet), a
// selection blocker (search ran, result was zero or multiple), and a
// confirmation blocker (search ran, found exactly one, but it's a warning
// rather than something to pick between — resolveCustomerDuplicate.ts's
// only case).
// ---------------------------------------------------------------------------

/** A resolver's own optional `confidence` metadata per candidate — not
 *  populated by any current resolver (see this file's header comment).
 *  Declared on the framework's own candidate-building input type, not on
 *  `PlannerBlockerCandidate` itself (the wire shape stored on the row and
 *  read by the Copilot UI), so adding it here required no changes to
 *  types.ts, vie.functions.ts, or VieActionCard.tsx. */
export interface RankedCandidate extends PlannerBlockerCandidate {
  confidence?: number;
}

export interface MissingPrerequisiteConfig {
  id: string;
  type: PlannerBlockerType;
  field: string;
  message: string;
}

/** The simplest blocker shape: nothing was even extracted/available to
 *  search with (a missing customer name, a missing customer_id to look a
 *  project up against, ...). No search ever ran, so there are no
 *  candidates and no currentValue. */
export function missingPrerequisiteBlocker(config: MissingPrerequisiteConfig): PlannerBlocker {
  return {
    id: config.id,
    type: config.type,
    message: config.message,
    field: config.field,
    required: true,
  };
}

/** Convenience wrapper over missingPrerequisiteBlocker() for the common
 *  `text_required` case (a raw text field, e.g. a customer/target name,
 *  wasn't extracted at all) — every current resolver that hits this case
 *  uses `text_required`, so it's the default rather than a required
 *  argument. */
export function requiredInputBlocker(config: {
  id: string;
  field: string;
  message: string;
  type?: PlannerBlockerType;
}): PlannerBlocker {
  return missingPrerequisiteBlocker({
    id: config.id,
    type: config.type ?? "text_required",
    field: config.field,
    message: config.message,
  });
}

export interface SelectionBlockerConfig<TRecord> {
  id: string;
  type: PlannerBlockerType;
  field: string;
  toCandidate: (record: TRecord) => RankedCandidate;
  noMatchMessage: string;
  multipleMatchesMessage: (count: number) => string;
  /** Shown back to the UI as the value that failed to resolve uniquely
   *  (e.g. the searched name) — omitted entirely (never fabricated as
   *  `null`/`undefined`) when this resolution isn't driven by a single raw
   *  query value. resolveProject.ts resolves from an already-known
   *  customer_id, not free text typed by the employee, so it never sets
   *  this — matching its pre-Sprint-AI-1.6 blockers, which never carried a
   *  currentValue either. */
  currentValue?: unknown;
  maxCandidates?: number;
}

/** Builds the ambiguity PlannerBlocker every `*_selection` resolver needs,
 *  from an already-classified "none" or "many" outcome — the same
 *  zero-match / multi-match blocker resolveCustomer.ts, resolveProject.ts,
 *  and resolveFollowupTarget.ts each built independently before this
 *  sprint, now built once. Takes an outcome rather than running the search
 *  itself so resolvers that pre-filter their own candidates (resolveProject
 *  .ts's hint narrowing) can still reuse this for the blocker-assembly step
 *  after their own business-specific step runs. */
export function selectionBlocker<TRecord>(
  outcome: { kind: "none" } | { kind: "many"; records: TRecord[] },
  config: SelectionBlockerConfig<TRecord>,
): PlannerBlocker {
  const maxCandidates = config.maxCandidates ?? DEFAULT_MAX_CANDIDATES;
  const base: PlannerBlocker = {
    id: config.id,
    type: config.type,
    field: config.field,
    required: true,
    message:
      outcome.kind === "none"
        ? config.noMatchMessage
        : config.multipleMatchesMessage(outcome.records.length),
    candidates:
      outcome.kind === "none"
        ? []
        : outcome.records.slice(0, maxCandidates).map(config.toCandidate),
  };
  return config.currentValue !== undefined ? { ...base, currentValue: config.currentValue } : base;
}

export interface EntityLookupConfig<TRecord> {
  /** Used as both the resulting blocker's `id` and, unless `field` is given
   *  separately, its `field` too — every current resolver uses the same
   *  value for both. */
  id: string;
  field?: string;
  type: PlannerBlockerType;
  search: (query: string) => Promise<TRecord[]>;
  toCandidate: (record: TRecord) => RankedCandidate;
  noMatchMessage: (query: string) => string;
  multipleMatchesMessage: (query: string, count: number) => string;
  maxCandidates?: number;
  rank?: (records: TRecord[]) => TRecord[];
}

export interface EntityLookupResult<TRecord> {
  record: TRecord | null;
  blocker: PlannerBlocker | null;
}

/** The end-to-end "search by a raw text query, resolve to exactly one
 *  record or a selection blocker" case — resolveCustomer.ts and
 *  resolveFollowupTarget.ts's name-lookup branch both reduce to exactly
 *  this. Combines searchAndClassify() + selectionBlocker() with the query
 *  itself carried through as `currentValue`, since a text-query lookup
 *  always has one. */
export async function resolveEntityByQuery<TRecord>(
  query: string,
  config: EntityLookupConfig<TRecord>,
): Promise<EntityLookupResult<TRecord>> {
  const field = config.field ?? config.id;
  const outcome = await searchAndClassify(query, config.search, config.rank);
  if (outcome.kind === "one") return { record: outcome.record, blocker: null };

  const blocker = selectionBlocker(outcome, {
    id: config.id,
    type: config.type,
    field,
    toCandidate: config.toCandidate,
    noMatchMessage: config.noMatchMessage(query),
    multipleMatchesMessage: (count) => config.multipleMatchesMessage(query, count),
    currentValue: query,
    maxCandidates: config.maxCandidates,
  });
  return { record: null, blocker };
}

export interface ConfirmationBlockerConfig<TRecord> {
  id: string;
  field: string;
  message: string;
  toCandidate: (record: TRecord) => RankedCandidate;
  currentValue?: unknown;
}

/** `confirmation_required` is the one blocker shape that isn't "pick one of
 *  these" — it's "here's a fact, decide whether to proceed" — so unlike
 *  selectionBlocker(), it's built from a single already-resolved record,
 *  not an outcome. resolveCustomerDuplicate.ts's duplicate-phone match is
 *  the one current caller. */
export function confirmationBlocker<TRecord>(
  record: TRecord,
  config: ConfirmationBlockerConfig<TRecord>,
): PlannerBlocker {
  const base: PlannerBlocker = {
    id: config.id,
    type: "confirmation_required",
    message: config.message,
    field: config.field,
    required: true,
    candidates: [config.toCandidate(record)],
  };
  return config.currentValue !== undefined ? { ...base, currentValue: config.currentValue } : base;
}

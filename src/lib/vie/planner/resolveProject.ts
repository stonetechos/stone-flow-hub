/**
 * Planner resolver — an already-resolved customer_id -> a single existing
 * project to quote against.
 *
 * Read-only (calls the SAME listProjectsByCustomer() the manual project
 * picker already uses, via projects/api.ts). Never creates a project.
 *
 * Unlike resolveCustomer.ts (raw utterance text -> existing customer_id),
 * this resolver's input is NOT extracted text — it's the *output* of a
 * prior resolveCustomer() call. A project belongs to a customer (a foreign
 * key), so there is nothing to look up until a customer_id already exists.
 * See VIE-CreateQuotation-Architecture-Review.md §2/§4 for why project
 * resolution is composed strictly AFTER customer resolution succeeds,
 * never independently or in parallel with it — the Planner is expected to
 * call resolveCustomer() first and only call this resolver if that
 * succeeds, skipping it entirely otherwise (mirroring the existing
 * short-circuit planCreateCustomer already uses when an invalid mobile
 * number means resolveCustomerDuplicate() is never called).
 *
 * This file does not enforce that composition itself — planner/index.ts is
 * not modified in this milestone (Milestone 1 of create_quotation is
 * resolveProject() only, see the Architecture Review's recommended
 * implementation order). It only defends against being called without a
 * customer_id, the same way every other resolver in this directory defends
 * against its own missing input (resolveCustomer.ts against a missing
 * name, resolveCustomerDuplicate.ts against a missing mobile,
 * resolveProduct.ts against missing text).
 *
 * listProjectsByCustomer() (projects/api.ts) delegates to
 * listProjectsForPicker({ customerId }), which filters to `is_active`
 * projects only. That is inherited behavior from reusing the existing
 * module API, not a new decision made by this resolver: an
 * archived/inactive project is treated the same as "no project" here.
 *
 * `blocker` is now a structured `PlannerBlocker` (types.ts),
 * same discipline as resolveCustomer.ts/resolveFollowupTarget.ts.
 *
 * The zero/one/many classification and both blocker shapes
 * (the "no customer_id at all" precondition blocker, and the ambiguous/
 * empty selection blocker) now go through entityResolution.ts's generic
 * helpers. The `projectTextHint` narrowing step (below) stays here
 * unchanged — it's business-specific to how a quotation's extracted
 * projectText disambiguates a candidate set, exactly the kind of
 * resolver-owned logic the framework is designed to sit underneath rather
 * than absorb. Behavior (including the exact byte-for-byte PlannerBlocker
 * shape) is unchanged — resolveProject.test.ts is unmodified by this
 * sprint and still passes against this file.
 */
import { listProjectsByCustomer } from "@/lib/projects/api";
import type { PlannerBlocker } from "../types";
import { classifyMatches, missingPrerequisiteBlocker, selectionBlocker } from "./entityResolution";

export interface ProjectResolution {
  projectId: string | null;
  projectLabel: string | null;
  blocker: PlannerBlocker | null;
}

/** @param customerId The already-resolved customer_id to find a project
 *   for (typically resolveCustomer()'s own `customerId` output — see the
 *   file header for why this resolver never takes raw utterance text).
 * @param customerLabel Optional, purely for a friendlier blocker message
 *   (typically resolveCustomer()'s own `customerLabel` output). When
 *   omitted, blocker text falls back to a generic "This customer" phrase
 *   rather than a name.
 * @param projectTextHint Optional, VIE Phase 3 Milestone 6
 *   (VIE-CreateQuotation-Midpoint-Review.md §2/§7/§8): the raw `projectText`
 *   extracted from the utterance, e.g. "the Shah Villa project". When the
 *   customer has more than one project, this narrows the candidate set
 *   before applying the ordinary 0/1/many-match discipline below — per
 *   VIE-CreateQuotation-UX-Contract.md §4's own anticipation of "an
 *   explicit project reference" as a legitimate resolution path. The hint
 *   is used ONLY when it narrows unambiguously to exactly one candidate
 *   (a case-insensitive substring match against each candidate's `name`,
 *   in either direction); a hint that matches zero or more than one
 *   candidate is not confident enough to act on and is silently ignored —
 *   resolution then falls back to the full, unfiltered candidate set,
 *   producing the exact same outcome as if no hint had been supplied at
 *   all. This is deliberately conservative: a hint can only ever turn a
 *   blocker into a resolution, never turn a resolution into a wrong guess.
 */
export async function resolveProject(
  customerId: string | undefined,
  customerLabel?: string | null,
  projectTextHint?: string,
): Promise<ProjectResolution> {
  if (!customerId || !customerId.trim()) {
    return {
      projectId: null,
      projectLabel: null,
      blocker: missingPrerequisiteBlocker({
        id: "project_id",
        type: "project_selection",
        field: "project_id",
        message: "No resolved customer to look up a project for.",
      }),
    };
  }

  const who = customerLabel ? `"${customerLabel}"` : "This customer";
  const matches = await listProjectsByCustomer(customerId.trim());

  const hint = projectTextHint?.trim().toLowerCase();
  let candidates = matches;
  if (hint) {
    const narrowed = matches.filter((m) => {
      const name = m.name.toLowerCase();
      return name.includes(hint) || hint.includes(name);
    });
    // Only act on the hint when it's unambiguous on its own — anything
    // else (no match, or still multiple matches) falls back to the full
    // candidate set below, unchanged from pre-Milestone-6 behavior.
    if (narrowed.length === 1) {
      candidates = narrowed;
    }
  }

  const outcome = classifyMatches(candidates);
  if (outcome.kind === "one") {
    return { projectId: outcome.record.id, projectLabel: outcome.record.name, blocker: null };
  }

  return {
    projectId: null,
    projectLabel: null,
    blocker: selectionBlocker(outcome, {
      id: "project_id",
      type: "project_selection",
      field: "project_id",
      toCandidate: (m) => ({ id: m.id, label: m.name, subtitle: m.project_code }),
      noMatchMessage: `${who} has no existing project to quote against.`,
      multipleMatchesMessage: (count) => `${who} has ${count} projects — choose one.`,
    }),
  };
}

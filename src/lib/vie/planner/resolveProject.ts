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
 * Sprint AI-1.5: `blocker` is now a structured `PlannerBlocker` (types.ts),
 * same discipline as resolveCustomer.ts/resolveFollowupTarget.ts.
 */
import { listProjectsByCustomer } from "@/lib/projects/api";
import type { PlannerBlocker } from "../types";

export interface ProjectResolution {
  projectId: string | null;
  projectLabel: string | null;
  blocker: PlannerBlocker | null;
}

/** Same generous, non-prose-truncated cap as resolveCustomer.ts. */
const MAX_CANDIDATES = 20;

/**
 * @param customerId The already-resolved customer_id to find a project
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
      blocker: {
        id: "project_id",
        type: "project_selection",
        message: "No resolved customer to look up a project for.",
        field: "project_id",
        required: true,
      },
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

  if (candidates.length === 0) {
    return {
      projectId: null,
      projectLabel: null,
      blocker: {
        id: "project_id",
        type: "project_selection",
        message: `${who} has no existing project to quote against.`,
        field: "project_id",
        required: true,
        candidates: [],
      },
    };
  }

  if (candidates.length > 1) {
    return {
      projectId: null,
      projectLabel: null,
      blocker: {
        id: "project_id",
        type: "project_selection",
        message: `${who} has ${candidates.length} projects — choose one.`,
        field: "project_id",
        required: true,
        candidates: candidates.slice(0, MAX_CANDIDATES).map((m) => ({
          id: m.id,
          label: m.name,
          subtitle: m.project_code,
        })),
      },
    };
  }

  return {
    projectId: candidates[0].id,
    projectLabel: candidates[0].name,
    blocker: null,
  };
}

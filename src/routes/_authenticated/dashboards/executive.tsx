/**
 * Executive Dashboard — retired as a standalone surface, Phase G.8.6
 * Task 1 (Workflow Consolidation & Single Source of Truth).
 *
 * Duplicated the same KPI cockpit as `/dashboard` and the (now-retired)
 * Command Centre / Control Centre. `/dashboard` (Executive Brief) is now
 * the one canonical landing page. Route kept registered — not deleted —
 * so an existing bookmark still lands somewhere correct.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboards/executive")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
  component: () => null,
});

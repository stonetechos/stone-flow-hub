/**
 * Executive Command Centre — retired as a standalone surface, Phase G.8.6
 * Task 1 (Workflow Consolidation & Single Source of Truth).
 *
 * The G.8.5 audit found four separate pages all claiming to be "the
 * owner's primary view" (this one, /dashboard, control-centre, executive),
 * each duplicating KPI cards with no single source of truth. `/dashboard`
 * (Executive Brief) is now the one canonical landing page. This route is
 * kept registered — not deleted — purely so any existing bookmark or
 * deep-link still lands somewhere correct instead of 404ing.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboards/command-center")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
  component: () => null,
});

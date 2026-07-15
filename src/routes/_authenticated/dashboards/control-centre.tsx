/**
 * Business Control Centre — retired as a standalone surface, Phase G.8.6
 * Task 1 (Workflow Consolidation & Single Source of Truth).
 *
 * This page's own KPI cards duplicated `/dashboard`; its "links to every
 * other dashboard" role is already served by `/dashboards` (Role
 * Dashboards, the canonical navigation hub — see
 * src/routes/_authenticated/dashboards/index.tsx). `/dashboard` (Executive
 * Brief) is now the one canonical landing page. Route kept registered —
 * not deleted — so an existing bookmark still lands somewhere correct.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboards/control-centre")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
  component: () => null,
});

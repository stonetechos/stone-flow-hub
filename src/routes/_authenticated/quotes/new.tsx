import { createFileRoute, Navigate } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Compatibility shim — the create surface lives on `/quotes` behind
 * `?new=1`. Forward any project / enquiry context the caller passed
 * (Guided Workflow, deep links, dashboards) so the picker on the list
 * page opens pre-scoped instead of blank.
 */
const search = z.object({
  project: z.string().uuid().optional(),
  enquiry: z.string().uuid().optional(),
  customer: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated/quotes/new")({
  ssr: false,
  validateSearch: (s) => search.parse(s),
  component: NewQuoteShim,
});

function NewQuoteShim() {
  const s = Route.useSearch();
  const forwarded: Record<string, string> = { new: "1" };
  if (s.project) forwarded.project = s.project;
  if (s.enquiry) forwarded.enquiry = s.enquiry;
  return <Navigate to="/quotes" search={forwarded as never} replace />;
}

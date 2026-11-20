import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Route alias: /quotations -> /quotes
 * Redirects anyone navigating to /quotations directly to canonical ERP /quotes.
 */
export const Route = createFileRoute("/quotations")({
  beforeLoad: () => {
    throw redirect({ to: "/quotes" });
  },
  component: () => null,
});

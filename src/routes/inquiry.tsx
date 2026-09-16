import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Public Inquiry route alias — redirects to canonical root '/' lead generation page.
 */
export const Route = createFileRoute("/inquiry")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: () => null,
});

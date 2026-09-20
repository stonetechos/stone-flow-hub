/**
 * /backend — index redirect to site-settings.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/backend/")({
  beforeLoad: () => {
    throw redirect({ to: "/backend/site-settings" });
  },
});

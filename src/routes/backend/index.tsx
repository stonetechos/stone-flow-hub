/**
 * /backend — index redirect to site-settings.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = createFileRoute("/backend/" as any)({
  beforeLoad: () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    throw redirect({ to: "/backend/site-settings" as any });
  },
});

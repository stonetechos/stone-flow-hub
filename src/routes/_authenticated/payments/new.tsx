/**
 * Redirects legacy /payments/new to /receipts/new.
 * Receipts is the canonical entry point for recording customer collections.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/payments/new")({
  beforeLoad: () => {
    throw redirect({ to: "/receipts/new" });
  },
  component: () => null,
});

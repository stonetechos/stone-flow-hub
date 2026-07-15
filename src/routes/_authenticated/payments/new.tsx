/**
 * Standalone "New Payment" form — retired, Phase G.8.6 Task 2 (Workflow
 * Consolidation & Single Source of Truth).
 *
 * G.9A.2 already made Receipts the source of truth for recording incoming
 * money (multi-invoice allocation, TDS/bank-charge netting, feeds
 * `customer_ledger` directly) and made the Payments page read from the
 * unified `payment_register` view. This route was the one remaining loose
 * end: a second live "recording incoming money" form that competed with
 * Receipts instead of deferring to it. Per the roadmap's permanent
 * principle — one place where a business event is created, one source of
 * truth, many places to view it — this now redirects to /receipts/new.
 *
 * Every in-app entry point (QuickCreateMenu, the Payments page's "New"
 * buttons, the dashboard quick-actions dock) was repointed straight at
 * /receipts/new in this same commit; this redirect exists only to catch
 * bookmarks/typed URLs. `/payments/$id` remains untouched and still shows
 * legacy `payments`-table rows read-only.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/payments/new")({
  beforeLoad: () => {
    throw redirect({ to: "/receipts/new" });
  },
  component: () => null,
});

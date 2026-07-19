# CI Lint Debt (pre-existing, not caused by recent changes)

**Date found:** 2026-07-18
**Found while:** fixing the CI `tsc --noEmit` failure (commit `36e04cd7`).

## What this is

After the typecheck fix, GitHub Actions CI will proceed past `tsc --noEmit`
to the `Lint (eslint)` step for the first time — that step never ran
successfully before because `Typecheck` always failed first. Running
`npx prettier --check "src/**/*.{ts,tsx}"` directly against the current,
untouched `main` branch shows **315 files** with formatting that no longer
matches the project's own `.prettierrc` (the same rule the `prettier/prettier`
ESLint rule enforces). This means the `Lint` step will fail in CI once
`Typecheck` passes.

This is unrelated to the `bun.lock` fix or the `@tanstack/router-core`
typecheck fix. None of the 315 files were touched by either of those
changes — this formatting drift predates both and has been accumulating
in the codebase for a while, simply never surfaced because CI never
got far enough to run the linter until now.

## Root cause

Code was written/edited without running `prettier --write` (or an editor
integration that formats on save) consistently, so a large number of files
drifted out of sync with the committed `.prettierrc` (`printWidth: 100`,
`semi: true`, `singleQuote: false`). This is a process/tooling gap, not a
logic bug.

## Options going forward (your call)

1. **Auto-format the 315 files** with `prettier --write`, scoped to exactly
   what ESLint lints (not `docs/`, not root config/markdown files — those
   aren't in ESLint's lint target and reformatting them would be
   unnecessary scope creep). This is a whitespace/style-only change with
   no logic impact, verified safe by re-running `tsc --noEmit` and
   `npm run build` afterward. Best done as its own, clearly-labeled commit
   separate from any logic change, so the diff is easy to skim and revert
   if needed.
2. **Add a `pre-commit`/`lint-staged` hook** (or a CI check that only lints
   changed files) so new commits don't add to the debt, while deciding
   separately when/whether to do the one-time bulk reformat.
3. **Relax the `prettier/prettier` ESLint rule** — not recommended per your
   "no suppression" standard from the CI-fix work, but documenting the
   option: this stops CI from failing on style without actually fixing
   the formatting, and quietly lowers the bar for what CI enforces.

## Full file list (315)

```
src/components/copilot/BusinessInsightsCard.tsx
src/components/copilot/Copilot.tsx
src/components/dashboard/ChartCards.tsx
src/components/dashboard/HealthCard.tsx
src/components/dashboard/KpiTile.tsx
src/components/dashboard/WorkforceSummaryWidget.tsx
src/components/data/DataToolbar.tsx
src/components/data/FiltersPanel.tsx
src/components/data/Pagination.tsx
src/components/debug/ViewportDebugPanel.tsx
src/components/dispatch/DispatchItemsEditor.tsx
src/components/enquiry/LeadScoreBadge.tsx
src/components/enquiry/NextBestAction.tsx
src/components/enquiry/NextFollowupChip.tsx
src/components/entity/StatusPill.tsx
src/components/entity/TaskDialog.tsx
src/components/entity/TasksPanel.tsx
src/components/forms/EntityPicker.tsx
src/components/forms/FormLayout.tsx
src/components/forms/QuickCreateDialog.tsx
src/components/global/DemoBadge.tsx
src/components/global/GlobalSearchDialog.tsx
src/components/global/NotificationsBell.tsx
src/components/global/ThemeSwitcher.tsx
src/components/guided-workflow/GuidedNextStep.tsx
src/components/installation/DailyProgressDialog.tsx
src/components/installation/RecordMaterialDialog.tsx
src/components/installation/SalesOrderInstallationPanel.tsx
src/components/installation/SignoffDialog.tsx
src/components/installation/SiteAiPanel.tsx
src/components/layout/AppShell.tsx
src/components/layout/PageHeader.tsx
src/components/layout/PageTransition.tsx
src/components/layout/SectionHeader.tsx
src/components/layout/Stat.tsx
src/components/layout/States.tsx
src/components/manufacturing/InstallationTracker.tsx
src/components/manufacturing/ManufacturingStats.tsx
src/components/manufacturing/QcChecklist.tsx
src/components/masters/BulkImportDialog.tsx
src/components/masters/MasterListPage.tsx
src/components/mdm/LifecycleBadge.tsx
src/components/mdm/LifecycleMenu.tsx
src/components/mdm/SafeDeleteDialog.tsx
src/components/ownership/TransferOwnershipDialog.tsx
src/components/procurement/CreatePoFromQuoteDialog.tsx
src/components/procurement/ProcurementIntelligencePanel.tsx
src/components/projects/ProjectFinancials.tsx
src/components/quotes/ReassignCustomerDialog.tsx
src/components/rfqs/CustomerRequirementAttachments.tsx
src/components/rfqs/RfqVendorRecommendations.tsx
src/components/settings/CompanyProfileTab.tsx
src/components/settings/NavigationPreferences.tsx
src/components/shared/CollapsibleSection.tsx
src/components/shared/LineItemsEditor.tsx
src/components/shared/MiniTable.tsx
src/components/shared/ModeCard.tsx
src/components/shared/Timeline.tsx
src/components/timeline/BusinessTimeline.tsx
src/components/ui/alert.tsx
src/components/ui/badge.tsx
src/components/ui/button.tsx
src/components/ui/card.tsx
src/components/ui/dialog.tsx
src/components/ui/progress.tsx
src/components/ui/separator.tsx
src/components/ui/sheet.tsx
src/components/ui/table.tsx
src/components/ui/tabs.tsx
src/components/vendor-portal/VendorShell.tsx
src/components/vendors/CapabilityMatrix.tsx
src/components/vendors/VendorCategoryPicker.tsx
src/components/vendors/VendorHealthBadge.tsx
src/components/vendors/VendorScorecard.tsx
src/hooks/use-detail-hotkeys.ts
src/hooks/use-install-prompt.ts
src/hooks/use-table-prefs.ts
src/integrations/supabase/types.ts
src/lib/activity/api.ts
src/lib/admin/users.functions.ts
src/lib/admin/users.ts
src/lib/ai/copilot.functions.ts
src/lib/ai/gateway.server.ts
src/lib/ai/nl-search/resolve.ts
src/lib/ai/require-staff.ts
src/lib/ai/services.ts
src/lib/branding/index.ts
src/lib/company/api.ts
src/lib/company/hooks.ts
src/lib/constants.ts
src/lib/csv/parse.ts
src/lib/customer-ledger/api.ts
src/lib/customer-timeline/api.ts
src/lib/dashboard/api.ts
src/lib/diagnostics/toast-diagnostics.ts
src/lib/dispatch/api.ts
src/lib/email-templates/email-change.tsx
src/lib/email-templates/invite.tsx
src/lib/email-templates/magic-link.tsx
src/lib/email-templates/reauthentication.tsx
src/lib/email-templates/recovery.tsx
src/lib/email-templates/signup.tsx
src/lib/enquiries/api.ts
src/lib/errors.ts
src/lib/estimates/api.ts
src/lib/executive/brief.functions.ts
src/lib/executive/customer-intel.ts
src/lib/executive/forecast.ts
src/lib/executive/kpis.ts
src/lib/executive/profitability.ts
src/lib/executive/timeseries.ts
src/lib/executive/vendor-intel.ts
src/lib/grns/api.ts
src/lib/grns/schema.ts
src/lib/guided-workflow/downstream.ts
src/lib/hubs/api.ts
src/lib/insights/executive/actions.ts
src/lib/insights/executive/headline.ts
src/lib/insights/executive/metrics.ts
src/lib/insights/executive/sections.ts
src/lib/insights/hooks.ts
src/lib/insights/providers/customer/customerDataQuality.ts
src/lib/insights/providers/customer/customerHealth.ts
src/lib/insights/providers/customer/customerHygiene.ts
src/lib/insights/providers/customer/customerLifetimeValue.ts
src/lib/insights/providers/customer/index.ts
src/lib/insights/providers/customer/repeatBusiness.ts
src/lib/insights/providers/finance/collectionPriority.ts
src/lib/insights/providers/finance/index.ts
src/lib/insights/providers/finance/marginWatch.ts
src/lib/insights/providers/finance/paymentScheduleAdherence.ts
src/lib/insights/providers/finance/vendorPaymentQueue.ts
src/lib/insights/providers/operations/dispatchRisk.ts
src/lib/insights/providers/operations/index.ts
src/lib/insights/providers/operations/installationDelay.ts
src/lib/insights/providers/operations/inventoryShortage.ts
src/lib/insights/providers/operations/productionBottleneck.ts
src/lib/insights/providers/operations/vendorDeliveryRisk.ts
src/lib/insights/providers/sales/followUpRecommendation.ts
src/lib/insights/providers/sales/index.ts
src/lib/insights/providers/sales/lostOpportunity.ts
src/lib/insights/providers/sales/quoteAgeing.ts
src/lib/insights/quality/dedupe.ts
src/lib/insights/quality/merge.ts
src/lib/insights/quality/priority.ts
src/lib/insights/shared/operationalRiskCounts.ts
src/lib/insights/state/hooks.ts
src/lib/installation/api.ts
src/lib/installation/materials.ts
src/lib/installation/orders.ts
src/lib/installation/progress.ts
src/lib/installation/site-ai.functions.ts
src/lib/installation/teams.ts
src/lib/intelligence/actions.ts
src/lib/intelligence/business-health.ts
src/lib/intelligence/enquiry-context.ts
src/lib/intelligence/predict/baselines.ts
src/lib/intelligence/predict/sales-adapter.ts
src/lib/intelligence/predict/sales.test.ts
src/lib/intelligence/predict/sales.ts
src/lib/intelligence/predict/score.ts
src/lib/intelligence/predict/thresholds.ts
src/lib/intelligence/predict/types.ts
src/lib/intelligence/risk.ts
src/lib/intelligence/score.ts
src/lib/inventory/movements.ts
src/lib/lead-analytics/api.ts
src/lib/lead-stage/health.ts
src/lib/lead-stage/signals.ts
src/lib/lineage/api.ts
src/lib/masters/api.ts
src/lib/masters/config.ts
src/lib/mdm/lifecycle.ts
src/lib/milestones/api.ts
src/lib/nav/config.ts
src/lib/nav/preferences.ts
src/lib/notifications/dispatch.functions.ts
src/lib/notifications/dispatch.server.ts
src/lib/notifications/document-context.ts
src/lib/notifications/providers/registry.ts
src/lib/notifications/providers/types.ts
src/lib/payment-links/api.ts
src/lib/pdf/generator.ts
src/lib/procurement/ai-health.functions.ts
src/lib/procurement/calendar.ts
src/lib/procurement/commitment.ts
src/lib/procurement/followups.ts
src/lib/procurement/intelligence.ts
src/lib/purchase-orders/api.ts
src/lib/pwa/register-service-worker.ts
src/lib/pwa/sync-queue.ts
src/lib/qc/api.ts
src/lib/query-invalidation.ts
src/lib/query-keys.ts
src/lib/quotes/api.ts
src/lib/quotes/comparison.ts
src/lib/receipts/api.ts
src/lib/reports/api.ts
src/lib/rfqs/recommendations.ts
src/lib/search/api.ts
src/lib/timeline/api.ts
src/lib/ui/tones.ts
src/lib/vendor-payments/api.ts
src/lib/vendor-portal/quote.ts
src/lib/vendor-portal/rfq.ts
src/lib/vendors/api.ts
src/lib/vendors/health.ts
src/lib/vendors/ledger.ts
src/lib/vendors/timeline.ts
src/lib/workforce/api.ts
src/lib/workforce/owner-intel.ts
src/lib/workforce/schema.ts
src/lib/workforce/scoring.ts
src/lib/workforce/types.ts
src/routes/__root.tsx
src/routes/_authenticated/activity.tsx
src/routes/_authenticated/admin/users.tsx
src/routes/_authenticated/calendar.tsx
src/routes/_authenticated/communication.tsx
src/routes/_authenticated/customers/$customerId.timeline.tsx
src/routes/_authenticated/customers/$customerId.tsx
src/routes/_authenticated/customers/index.tsx
src/routes/_authenticated/dashboard.tsx
src/routes/_authenticated/dashboards/analytics.tsx
src/routes/_authenticated/dashboards/business-health.tsx
src/routes/_authenticated/dashboards/business-intelligence.tsx
src/routes/_authenticated/dashboards/customer-intelligence.tsx
src/routes/_authenticated/dashboards/daily-action.tsx
src/routes/_authenticated/dashboards/followups.tsx
src/routes/_authenticated/dashboards/forecast.tsx
src/routes/_authenticated/dashboards/index.tsx
src/routes/_authenticated/dashboards/installation.tsx
src/routes/_authenticated/dashboards/lead-analytics.tsx
src/routes/_authenticated/dashboards/lead-executive.tsx
src/routes/_authenticated/dashboards/lead-health.tsx
src/routes/_authenticated/dashboards/management.tsx
src/routes/_authenticated/dashboards/procurement-calendar.tsx
src/routes/_authenticated/dashboards/procurement.tsx
src/routes/_authenticated/dashboards/production.tsx
src/routes/_authenticated/dashboards/profitability.tsx
src/routes/_authenticated/dashboards/purchase.tsx
src/routes/_authenticated/dashboards/revenue-crm.tsx
src/routes/_authenticated/dashboards/sales-funnel.tsx
src/routes/_authenticated/dashboards/sales.tsx
src/routes/_authenticated/dashboards/smart-notifications.tsx
src/routes/_authenticated/dashboards/team-performance.tsx
src/routes/_authenticated/dashboards/vendor-intelligence.tsx
src/routes/_authenticated/dispatch/$id.edit.tsx
src/routes/_authenticated/dispatch/$id.print.tsx
src/routes/_authenticated/dispatch/index.tsx
src/routes/_authenticated/dispatch/new.tsx
src/routes/_authenticated/enquiries/$enquiryId.tsx
src/routes/_authenticated/enquiries/index.tsx
src/routes/_authenticated/estimates/index.tsx
src/routes/_authenticated/estimates/new.tsx
src/routes/_authenticated/followups/$id.tsx
src/routes/_authenticated/followups/index.tsx
src/routes/_authenticated/grns/$id.tsx
src/routes/_authenticated/grns/index.tsx
src/routes/_authenticated/installation-teams/index.tsx
src/routes/_authenticated/installations/$id.tsx
src/routes/_authenticated/installations/index.tsx
src/routes/_authenticated/inventory/index.tsx
src/routes/_authenticated/inventory/movements.tsx
src/routes/_authenticated/inventory/slabs.tsx
src/routes/_authenticated/invoices/$invoiceId.tsx
src/routes/_authenticated/invoices/index.tsx
src/routes/_authenticated/ledger/$customerId.tsx
src/routes/_authenticated/manufacturing/$id.tsx
src/routes/_authenticated/manufacturing/index.tsx
src/routes/_authenticated/masters/index.tsx
src/routes/_authenticated/masters/qc-templates.tsx
src/routes/_authenticated/message-templates.tsx
src/routes/_authenticated/messages/index.tsx
src/routes/_authenticated/notification-settings.tsx
src/routes/_authenticated/payments/index.tsx
src/routes/_authenticated/products/configure.tsx
src/routes/_authenticated/products/index.tsx
src/routes/_authenticated/projects/$projectId.tsx
src/routes/_authenticated/projects/index.tsx
src/routes/_authenticated/purchase-orders/index.tsx
src/routes/_authenticated/quotes/$quoteId.edit.tsx
src/routes/_authenticated/receipts/index.tsx
src/routes/_authenticated/receipts/new.tsx
src/routes/_authenticated/reports.tsx
src/routes/_authenticated/rfqs/$rfqId.tsx
src/routes/_authenticated/rfqs/index.tsx
src/routes/_authenticated/route.tsx
src/routes/_authenticated/sales-orders/$id.edit.tsx
src/routes/_authenticated/sales-orders/index.tsx
src/routes/_authenticated/settings.tsx
src/routes/_authenticated/vendor-payments/index.tsx
src/routes/_authenticated/vendor-payments/new.tsx
src/routes/_authenticated/vendors/$vendorId.ledger.tsx
src/routes/_authenticated/vendors/index.tsx
src/routes/_authenticated/workforce-intelligence/capacities/index.tsx
src/routes/_authenticated/workforce-intelligence/employees/$id.tsx
src/routes/_authenticated/workforce-intelligence/employees/index.tsx
src/routes/_authenticated/workforce-intelligence/employees/new.tsx
src/routes/_authenticated/workforce-intelligence/owner/index.tsx
src/routes/_authenticated/workforce-intelligence/performance/index.tsx
src/routes/_authenticated/workforce-intelligence/roles/$id.tsx
src/routes/_authenticated/workforce-intelligence/roles/index.tsx
src/routes/api/public/hooks/daily-digest.ts
src/routes/api/public/hooks/whatsapp.ts
src/routes/api/public/hooks/workforce-daily.ts
src/routes/auth.tsx
src/routes/lovable/email/auth/preview.ts
src/routes/lovable/email/auth/webhook.ts
src/routes/lovable/email/queue/process.ts
src/routes/pay.$linkId.tsx
src/routes/vendor/dashboard.tsx
src/routes/vendor/rfqs/$rfqId.tsx
src/routes/vendor/rfqs/index.tsx
src/routes/vendor/route.tsx
```

/**
 * InstallationDelayProvider — flags site installation orders that are
 * overdue, not started, stalled, or approaching their scheduled date
 * without a team assigned.
 *
 * Reads: `listInstallations()` (existing bulk fetch — status, planned/
 * actual dates, progress_pct, team_id) and `listProgress(installationId)`
 * (existing per-installation daily site report fetch), called only for the
 * bounded subset of installations that are currently `in_progress` — the
 * same "bounded per-entity fetch over an existing single-entity API"
 * pattern Phase G.3's VendorPaymentQueueProvider used for vendor ledgers,
 * since no bulk "all installation progress reports" endpoint exists.
 */
import { listInstallations } from "@/lib/installation/orders";
import { listProgress } from "@/lib/installation/progress";
import type { Insight, InsightProvider } from "@/lib/insights/types";
import { daysSince, daysUntil } from "@/lib/insights/shared/dates";
import { computePriority } from "@/lib/insights/shared/priority";
import { INSTALLATION_DELAY_THRESHOLDS as THRESHOLDS } from "./thresholds";

export const INSTALLATION_DELAY_PROVIDER_ID = "operations.installation-delay";

const OPEN_STATUSES = new Set(["planned", "scheduled", "in_progress", "on_hold"]);

export const InstallationDelayProvider: InsightProvider = {
  id: INSTALLATION_DELAY_PROVIDER_ID,
  label: "Installation delay",
  fetch: async () => {
    const installations = await listInstallations();
    const nowDate = new Date();
    const now = nowDate.toISOString();
    const insights: Insight[] = [];

    const inProgress = installations.filter((i) => i.status === "in_progress");
    const progressByInstallation = new Map<string, string | null>();
    if (inProgress.length > 0) {
      const reports = await Promise.all(
        inProgress.map((i) =>
          listProgress(i.id)
            .then((rows) => rows[0]?.report_date ?? null)
            .catch(() => null),
        ),
      );
      inProgress.forEach((i, idx) => progressByInstallation.set(i.id, reports[idx]));
    }

    for (const inst of installations) {
      if (!OPEN_STATUSES.has(inst.status)) continue;
      const label = inst.installation_no ?? inst.site_address ?? inst.id;
      const customerPart = inst.customer ? ` for ${inst.customer.name}` : "";

      // Overdue: planned_end_date has passed and it's not finished.
      if (inst.planned_end_date) {
        const daysTo = daysUntil(inst.planned_end_date, nowDate);
        if (daysTo < 0) {
          const overdueDays = -daysTo;
          insights.push({
            id: `${INSTALLATION_DELAY_PROVIDER_ID}:overdue:${inst.id}`,
            source: INSTALLATION_DELAY_PROVIDER_ID,
            module: "Operations",
            kind: "risk",
            tone: "danger",
            confidence: 1,
            title: `Installation ${label} is overdue — ${overdueDays}d`,
            why: `Installation ${label}${customerPart} was scheduled to finish by ${inst.planned_end_date} and is still "${inst.status}" ${overdueDays} day${overdueDays === 1 ? "" : "s"} later (${inst.progress_pct}% complete).`,
            action: { label: "Open installation", href: `/installations/${inst.id}` },
            entity: { type: "installation", id: inst.id, label },
            priority: computePriority({ urgencyDays: overdueDays }),
            generatedAt: now,
          });
        }
      }

      // Not started: planned_start_date has passed with no actual_start_date.
      if (
        (inst.status === "planned" || inst.status === "scheduled") &&
        inst.planned_start_date &&
        !inst.actual_start_date
      ) {
        const daysTo = daysUntil(inst.planned_start_date, nowDate);
        if (daysTo < 0) {
          const lateDays = -daysTo;
          insights.push({
            id: `${INSTALLATION_DELAY_PROVIDER_ID}:not-started:${inst.id}`,
            source: INSTALLATION_DELAY_PROVIDER_ID,
            module: "Operations",
            kind: "risk",
            tone: "danger",
            confidence: 1,
            title: `Installation ${label} hasn't started — ${lateDays}d late`,
            why: `Installation ${label}${customerPart} was planned to start ${inst.planned_start_date} and has no recorded start date ${lateDays} day${lateDays === 1 ? "" : "s"} later.`,
            action: { label: "Open installation", href: `/installations/${inst.id}` },
            entity: { type: "installation", id: inst.id, label },
            priority: computePriority({ urgencyDays: lateDays }),
            generatedAt: now,
          });
        }
      }

      // Stalled: in_progress, started a while ago, no recent site report.
      if (inst.status === "in_progress" && inst.actual_start_date) {
        const sinceStart = daysSince(inst.actual_start_date, nowDate);
        const lastReport = progressByInstallation.get(inst.id) ?? null;
        const daysSinceReport = lastReport ? daysSince(lastReport, nowDate) : sinceStart;
        if (
          sinceStart >= THRESHOLDS.stalledNoReportDays &&
          daysSinceReport >= THRESHOLDS.stalledNoReportDays
        ) {
          insights.push({
            id: `${INSTALLATION_DELAY_PROVIDER_ID}:stalled:${inst.id}`,
            source: INSTALLATION_DELAY_PROVIDER_ID,
            module: "Operations",
            kind: "warning",
            tone: "warning",
            confidence: lastReport ? 1 : 0.85,
            title: `Installation ${label} looks stalled`,
            why: lastReport
              ? `Installation ${label}${customerPart} started ${inst.actual_start_date} (${inst.progress_pct}% complete) but its last site progress report was ${daysSinceReport} days ago.`
              : `Installation ${label}${customerPart} started ${inst.actual_start_date} (${sinceStart} days ago, ${inst.progress_pct}% complete) with no site progress reports logged yet.`,
            action: { label: "Open installation", href: `/installations/${inst.id}` },
            entity: { type: "installation", id: inst.id, label },
            priority: computePriority({ urgencyDays: daysSinceReport }),
            generatedAt: now,
          });
        }
      }

      // Nearing scheduled start without a team assigned yet.
      if (inst.status === "planned" && inst.planned_start_date && !inst.team_id) {
        const daysTo = daysUntil(inst.planned_start_date, nowDate);
        if (daysTo >= 0 && daysTo <= THRESHOLDS.nearingWithoutPrepDays) {
          insights.push({
            id: `${INSTALLATION_DELAY_PROVIDER_ID}:nearing-unprepared:${inst.id}`,
            source: INSTALLATION_DELAY_PROVIDER_ID,
            module: "Operations",
            kind: "warning",
            tone: "warning",
            confidence: 1,
            title: `Installation ${label} starts in ${daysTo}d — no team assigned`,
            why: `Installation ${label}${customerPart} is planned to start ${inst.planned_start_date} (${daysTo} day${daysTo === 1 ? "" : "s"} away) but has no installation team assigned yet.`,
            action: { label: "Open installation", href: `/installations/${inst.id}` },
            entity: { type: "installation", id: inst.id, label },
            priority: computePriority({ urgencyDays: THRESHOLDS.nearingWithoutPrepDays - daysTo }),
            generatedAt: now,
          });
        }
      }
    }

    return insights;
  },
};

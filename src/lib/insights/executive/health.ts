/**
 * health.ts — deterministic Executive Health classification from counts
 * alone (critical / warning / healthy / total). Used both for the brief's
 * overall health (fed the global summary) and for each section's health
 * (fed that module's own counts) — the same function, no duplicated
 * scoring between the two call sites.
 *
 * No AI, no per-insight inspection — purely a function of how many
 * insights fall into each tone bucket, matching the phase rule "based
 * only on processed Insight summary."
 */
import type { ExecutiveHealth, HealthCounts } from "./types";

/** 5+ critical insights, or critical insights making up 25%+ of the
 *  total, tips the whole picture into "Critical" regardless of anything
 *  else. Below that, even a single critical insight is enough to say
 *  "Watch" rather than "Stable" — critical items don't average away. */
const CRITICAL_COUNT_MAJOR = 5;
const CRITICAL_RATIO_MAJOR = 0.25;
/** 50%+ warnings (with zero critical) is enough on its own to warrant
 *  "Watch" rather than "Stable". */
const WATCH_WARNING_RATIO = 0.5;

export function computeHealth(counts: HealthCounts): ExecutiveHealth {
  const { critical, warning, healthy, total } = counts;

  if (total === 0) {
    return {
      level: "Excellent",
      reason: "No open insights.",
      criticalCount: 0,
      warningCount: 0,
      healthyCount: 0,
    };
  }

  const criticalRatio = critical / total;
  const warningRatio = warning / total;

  let level: ExecutiveHealth["level"];
  let reason: string;

  if (critical >= CRITICAL_COUNT_MAJOR || criticalRatio >= CRITICAL_RATIO_MAJOR) {
    level = "Critical";
    reason = `${critical} critical insight${critical === 1 ? "" : "s"} open — ${Math.round(criticalRatio * 100)}% of ${total}.`;
  } else if (critical > 0 || warningRatio >= WATCH_WARNING_RATIO) {
    level = "Watch";
    reason = `${critical} critical and ${warning} warning insight${warning === 1 ? "" : "s"} open.`;
  } else if (warning > 0) {
    level = "Stable";
    reason = `${warning} warning insight${warning === 1 ? "" : "s"} open, nothing critical.`;
  } else if (healthy > 0) {
    level = "Healthy";
    reason = `${healthy} informational insight${healthy === 1 ? "" : "s"} only — nothing critical or warning.`;
  } else {
    level = "Excellent";
    reason = "No open insights.";
  }

  return { level, reason, criticalCount: critical, warningCount: warning, healthyCount: healthy };
}

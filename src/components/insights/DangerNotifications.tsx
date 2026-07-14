/**
 * DangerNotifications — Phase G.7 UI integration.
 *
 * Surfaces a toast for the highest-confidence danger-toned insights only,
 * reusing the existing `sonner` toast primitive already used throughout
 * this app (Copilot.tsx, AppShell.tsx, and most mutation handlers) rather
 * than building a new notification system.
 *
 * "Maximum once per session per insight.id": ids already shown are kept
 * in `sessionStorage` only — no database writes, and a brand new browser
 * session (not just a page refresh) will see them again if still open.
 * Renderless — mount once (see AppShell.tsx, alongside `<Copilot />`).
 */
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useExecutiveInsights } from "@/hooks/useExecutiveInsights";
import { resolveTone } from "@/lib/ui/tones";

const SESSION_KEY = "insights:notified";
/** confidence is 0..1 (see lib/insights/shared/priority.ts's
 *  computeConfidence) — 0.9+ means the rule fired on a fully direct
 *  signal, not a weakened fallback one. */
const HIGH_CONFIDENCE_MIN = 0.9;

function readNotified(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function writeNotified(ids: Set<string>): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify([...ids]));
  } catch {
    // sessionStorage unavailable (private browsing, etc.) — degrade silently.
  }
}

export function DangerNotifications() {
  const { processedInsights } = useExecutiveInsights();
  const notifiedRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (notifiedRef.current === null) notifiedRef.current = readNotified();
    const notified = notifiedRef.current;
    let changed = false;

    for (const insight of processedInsights) {
      if (resolveTone(insight.tone) !== "danger") continue;
      if (insight.confidence < HIGH_CONFIDENCE_MIN) continue;
      if (notified.has(insight.id)) continue;

      notified.add(insight.id);
      changed = true;
      toast.error(insight.title, { description: insight.why, duration: 10_000 });
    }

    if (changed) writeNotified(notified);
  }, [processedInsights]);

  return null;
}

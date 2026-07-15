/**
 * DangerNotifications — Phase G.7 UI integration; lifecycle-aware as of
 * Phase G.8.6 Task 3.
 *
 * Surfaces a toast for the highest-confidence danger-toned insights only,
 * reusing the existing `sonner` toast primitive already used throughout
 * this app (Copilot.tsx, AppShell.tsx, and most mutation handlers) rather
 * than building a new notification system.
 *
 * Previously (Phase G.7): "maximum once per session per insight.id" was
 * tracked in `sessionStorage` only — private to this browser tab's
 * session, invisible to Copilot/EntityInsightPanel/any other surface, and
 * reset on every new session even for an insight the user had already
 * acted on. That was exactly the fragmentation the G.8.5 audit named
 * ("Danger Notifications" as one of five independent alert sources).
 *
 * Now: toasts only fire for insights whose *shared* lifecycle status is
 * still "new" (never seen anywhere — Copilot, EntityInsightPanel, or a
 * prior toast), and showing the toast immediately marks it "seen" in the
 * same `insight_states` table every other surface reads. Dismissing an
 * insight in Copilot or on a customer page also means it will never toast
 * here again, and vice versa.
 */
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useExecutiveInsights } from "@/hooks/useExecutiveInsights";
import { useInsightLifecycle } from "@/lib/insights/state/hooks";
import { resolveTone } from "@/lib/ui/tones";

/** confidence is 0..1 (see lib/insights/shared/priority.ts's
 *  computeConfidence) — 0.9+ means the rule fired on a fully direct
 *  signal, not a weakened fallback one. */
const HIGH_CONFIDENCE_MIN = 0.9;

export function DangerNotifications() {
  const { processedInsights } = useExecutiveInsights();
  const { withLifecycle, setStatus } = useInsightLifecycle(processedInsights);
  const toastedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const insight of withLifecycle) {
      if (resolveTone(insight.tone) !== "danger") continue;
      if (insight.confidence < HIGH_CONFIDENCE_MIN) continue;
      if (insight.lifecycleStatus !== "new") continue;

      const key = `${insight.source}:${insight.id}`;
      // Guards against the same insight toasting twice within one mount
      // while the "seen" write is still in flight (react-query hasn't
      // refetched insight_states yet).
      if (toastedRef.current.has(key)) continue;
      toastedRef.current.add(key);

      toast.error(insight.title, { description: insight.why, duration: 10_000 });
      setStatus(insight, "seen");
    }
  }, [withLifecycle, setStatus]);

  return null;
}

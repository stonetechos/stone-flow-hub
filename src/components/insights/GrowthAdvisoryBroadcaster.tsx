/**
 * GrowthAdvisoryBroadcaster — posts the org-wide margin/pricing/
 * sales-target advisory to the shared notification centre, at most once
 * per calendar day, so every user sees the same statement (Rishi: "It
 * should be across all the users").
 *
 * Renders nothing — mounted once in AppShell alongside DangerNotifications,
 * which follows the same "no UI, just an effect" shape. The advisory
 * ALSO already appears on dashboards via GrowthAdvisoryProvider (the
 * Finance Insights pack, already live through useExecutiveInsights()) —
 * this component only handles the separate "broadcast a notification-
 * centre row" half of the request, which needs a privileged write
 * (see growthAdvisory.functions.ts).
 *
 * No cron/scheduled-job infrastructure exists in this app (no
 * supabase/functions, no pg_cron) — this repo's notification writes are
 * all triggered by something a user's browser does. So "once a day" is
 * enforced by: check the notification centre for today's broadcast
 * (hasTodaysBroadcast) before posting, not by any server-side schedule.
 * In practice this means the advisory posts the first time any user opens
 * the app on a given day, whenever that happens to be — not at a fixed
 * clock time.
 */
import { useEffect, useRef } from "react";
import {
  computeGrowthAdvisory,
  formatGrowthAdvisoryBody,
  formatGrowthAdvisoryTitle,
} from "@/lib/executive/growthAdvisory";
import { hasTodaysBroadcast } from "@/lib/notifications/centre";
import { postGrowthAdvisoryBroadcast } from "@/lib/executive/growthAdvisory.functions";

export function GrowthAdvisoryBroadcaster() {
  const postedRef = useRef(false);

  useEffect(() => {
    if (postedRef.current) return;
    let cancelled = false;

    // Defer check by 4s so initial page navigation and core data queries get full priority
    const timer = setTimeout(async () => {
      try {
        const already = await hasTodaysBroadcast("growth_advisory");
        if (already || cancelled || postedRef.current) return;

        // Only compute the advisory if today's broadcast hasn't been posted yet
        const data = await computeGrowthAdvisory();
        if (!data || cancelled || postedRef.current) return;

        postedRef.current = true;
        await postGrowthAdvisoryBroadcast({
          data: {
            title: formatGrowthAdvisoryTitle(data),
            body: formatGrowthAdvisoryBody(data),
          },
        });
      } catch {
        postedRef.current = false;
      }
    }, 4000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return null;
}

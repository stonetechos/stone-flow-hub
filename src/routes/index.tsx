import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getSupabaseConfigStatus } from "@/lib/env/config-status";

/** Root entry — bounces to the dashboard or the auth page. */
export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    // `/` is the first URL almost everyone hits, so it needs the same two
    // guards `/auth` has. Without the config check, touching `supabase`
    // while the env vars are missing throws before this function reaches
    // its first `await`, and the router surfaces a bare error instead of
    // the configuration screen the root route is waiting to render. And
    // without the timeout, `getSession()` — which can trigger a token
    // refresh against an unreachable Supabase host, behind a lock that
    // serialises every other auth call — leaves this `ssr: false` route
    // pending with nothing on screen. Treating a stalled check as
    // "signed out" costs an already-authenticated user one extra hop
    // through `/auth`, which immediately bounces them onward.
    if (!getSupabaseConfigStatus().ok) return;
    const session = await Promise.race([
      supabase.auth.getSession().then(({ data }) => data.session),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
    ]);
    throw redirect({ to: session ? "/dashboard" : "/auth" });
  },
  component: () => null,
});

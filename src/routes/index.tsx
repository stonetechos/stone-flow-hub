import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/** Root entry — bounces to the dashboard or the auth page. */
export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    throw redirect({ to: data.session ? "/dashboard" : "/auth" });
  },
  component: () => null,
});

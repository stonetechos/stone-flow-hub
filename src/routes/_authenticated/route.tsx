import {
  CatchBoundary,
  createFileRoute,
  Outlet,
  redirect,
  useRouter,
} from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorBlock } from "@/components/layout/States";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import { classifyFailure } from "@/lib/errors";
import { getSupabaseConfigStatus } from "@/lib/env/config-status";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  // `ssr: false` means the server renders nothing for this
  // route (and everything nested under it) and TanStack Start defers to a
  // client-only render — by design, and not itself the bug. The actual
  // defect was a timing race: `beforeLoad`'s auth check (and its redirect
  // to /auth when signed out) can resolve before React finishes committing
  // its first hydration pass, since nothing forces the router to hold that
  // initial pass open. `pendingMinMs` uses TanStack Router's own built-in
  // mechanism (see `setMatchForcePending` in `@tanstack/router-core`'s
  // ssr-client hydrate()) to force this match to stay in its pending state
  // for a minimum window, guaranteeing hydration fully commits before the
  // resolved (redirected-or-not) content swaps in. No auth/SSR/TanStack
  // behavior changes — this only closes the race window.
  pendingMinMs: 300,
  beforeLoad: async () => {
    // When Supabase isn't configured, the root route
    // (`__root.tsx`) renders the global configuration screen instead of
    // this route's `<Outlet/>` regardless of what beforeLoad returns here —
    // so the only requirement in this branch is "don't throw". Touching
    // `supabase` while misconfigured would throw before this function even
    // reaches its first `await`, which previously surfaced as a generic
    // router error instead of the configuration screen.
    if (!getSupabaseConfigStatus().ok) return { user: null };
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth", search: { flow: "signin" } });

    // A temporary password (Part 5) or an admin-driven
    // reset (Part 6) both set `force_password_change` — checked here so it
    // applies no matter which authenticated route the user lands on first,
    // and the dashboard is unreachable until they set their own password.
    const { data: profile } = await supabase
      .from("profiles")
      .select("force_password_change")
      .eq("id", data.user.id)
      .maybeSingle();
    if (profile?.force_password_change) {
      throw redirect({ to: "/auth", search: { flow: "force-change" } });
    }

    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

/**
 * Phase G.8.9 Task A4: a route-level `CatchBoundary` around `<Outlet />`
 * only, deliberately placed INSIDE `AppShell` rather than around it. If a
 * child route throws (e.g. an unguarded `query.data!` hitting a transient
 * undefined-data render), only the content area is replaced — the sidebar,
 * top bar and navigation stay mounted and usable, so the user can navigate
 * to a different page or retry without a full reload. `getResetKey` ties
 * the boundary to the current pathname so navigating away automatically
 * clears the error state for the next page.
 */
function AuthenticatedLayout() {
  const router = useRouter();
  const pathname = router.state.location.pathname;

  return (
    <AppShell>
      <CatchBoundary
        getResetKey={() => pathname}
        onCatch={(error) =>
          reportLovableError(error, {
            boundary: "authenticated_route_catch_boundary",
            category: classifyFailure(error),
          })
        }
        errorComponent={RouteErrorFallback}
      >
        <Outlet />
      </CatchBoundary>
    </AppShell>
  );
}

function RouteErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="p-4">
      <ErrorBlock
        message="This page ran into a problem loading its data. The rest of STOS is still available — use the sidebar to navigate, or retry this page."
        onRetry={() => {
          router.invalidate();
          reset();
        }}
      />
      {import.meta.env.DEV && (
        <pre className="mt-3 max-w-full overflow-auto rounded-md border border-destructive/25 bg-destructive/5 p-3 text-xs text-destructive">
          {error.message}
        </pre>
      )}
    </div>
  );
}

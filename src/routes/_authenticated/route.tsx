import { CatchBoundary, createFileRoute, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorBlock } from "@/components/layout/States";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import { classifyFailure } from "@/lib/errors";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth", search: { flow: "signin" } });
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
        message="This page ran into a problem loading its data. The rest of Stone Tech OS is still available — use the sidebar to navigate, or retry this page."
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

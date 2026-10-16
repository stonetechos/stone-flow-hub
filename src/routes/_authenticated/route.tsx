import {
  CatchBoundary,
  createFileRoute,
  Outlet,
  redirect,
  useRouter,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorBlock, LoadingBlock } from "@/components/layout/States";
import { classifyFailure } from "@/lib/errors";
import { getSupabaseConfigStatus } from "@/lib/env/config-status";
import { beginManagedSignOut } from "@/lib/auth/managed-sign-out";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { isChunkLoadError, recoverFromChunkError } from "@/lib/router/chunk-recovery";
import { toast } from "sonner";

// In-memory verification cache: once verified for this browser session, subsequent internal route/tab
// transitions resolve in 0ms without performing blocking network roundtrips to Supabase auth & profiles.
let cachedUserAuth: {
  userId: string;
  verifiedAt: number;
} | null = null;
const VERIFY_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  pendingMinMs: 0,
  beforeLoad: async () => {
    // When Supabase isn't configured, the root route
    // (`__root.tsx`) renders the global configuration screen instead of
    // this route's `<Outlet/>` regardless of what beforeLoad returns here —
    // so the only requirement in this branch is "don't throw". Touching
    // `supabase` while misconfigured would throw before this function even
    // reaches its first `await`, which previously surfaced as a generic
    // router error instead of the configuration screen.
    if (!getSupabaseConfigStatus().ok) return { user: null };

    // Verify session locally first (instant, non-blocking from storage)
    const { data: sessionData } = await supabase.auth
      .getSession()
      .catch(() => ({ data: { session: null } }));
    const session = sessionData?.session;

    if (!session?.user) {
      cachedUserAuth = null;
      throw redirect({ to: "/auth", search: { flow: "signin" } });
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at ?? 0;
    const isExpired = expiresAt > 0 && expiresAt <= now;

    // Fast-path for smooth operation: if the session token is unexpired and we already verified this user
    // in this session within the TTL, return immediately (0ms). Internal tab transitions become instantaneous!
    if (
      !isExpired &&
      cachedUserAuth &&
      cachedUserAuth.userId === session.user.id &&
      Date.now() - cachedUserAuth.verifiedAt < VERIFY_TTL_MS
    ) {
      return { user: session.user };
    }

    let activeUser = session.user;

    if (isExpired) {
      // Attempt token refresh if local session timestamp is past expiration
      const { data: refreshed, error: refreshErr } = await supabase.auth
        .refreshSession()
        .catch((err) => ({
          data: { session: null },
          error: err as Error,
        }));
      if (refreshErr || !refreshed?.session?.user) {
        beginManagedSignOut();
        try {
          await supabase.auth.signOut({ scope: "local" });
        } catch (signOutError) {
          console.warn(
            "[auth] local sign-out failed while clearing an expired session",
            signOutError,
          );
        }
        throw redirect({ to: "/auth", search: { flow: "expired" } });
      }
      activeUser = refreshed.session.user;
    } else {
      // Token is currently unexpired. Perform server verification with a generous timeout.
      const getUserWithTimeout = async () => {
        try {
          const timeoutPromise = new Promise<{ data: { user: null }; error: Error }>((resolve) =>
            setTimeout(
              () => resolve({ data: { user: null }, error: new Error("Auth timeout") }),
              5000,
            ),
          );
          const fetchPromise = supabase.auth
            .getUser()
            .catch((err) => ({ data: { user: null }, error: err as Error }));
          return await Promise.race([fetchPromise, timeoutPromise]);
        } catch (err) {
          return { data: { user: null }, error: err as Error };
        }
      };

      const { data: userData, error: userError } = await getUserWithTimeout();
      if (userData?.user) {
        activeUser = userData.user;
      } else if (userError) {
        const errMsg = userError.message?.toLowerCase() || "";
        const isAuthRejection =
          (userError as { status?: number })?.status === 401 ||
          errMsg.includes("invalid claim") ||
          errMsg.includes("invalid token") ||
          errMsg.includes("token is expired");

        if (isAuthRejection) {
          const { data: refreshed, error: refreshErr } = await supabase.auth
            .refreshSession()
            .catch((err) => ({ data: { session: null }, error: err as Error }));
          if (refreshErr || !refreshed?.session?.user) {
            beginManagedSignOut();
            try {
              await supabase.auth.signOut({ scope: "local" });
            } catch (signOutError) {
              console.warn(
                "[auth] local sign-out failed while clearing a revoked session",
                signOutError,
              );
            }
            throw redirect({ to: "/auth", search: { flow: "expired" } });
          }
          activeUser = refreshed.session.user;
        } else {
          // Timeout, network blip, or slow mobile connectivity: do NOT sign out!
          console.warn("[auth] Network verify slow/unreachable; keeping valid local session.");
        }
      }
    }

    // A temporary password (Part 5) or an admin-driven
    // reset (Part 6) both set `force_password_change` — checked here so it
    // applies no matter which authenticated route the user lands on first,
    // and the dashboard is unreachable until they set their own password.
    try {
      const profilePromise = supabase
        .from("profiles")
        .select("force_password_change")
        .eq("id", activeUser.id)
        .maybeSingle();
      const profileTimeout = new Promise<{ data: null }>((resolve) =>
        setTimeout(() => resolve({ data: null }), 2000),
      );
      const { data: profile } = await Promise.race([profilePromise, profileTimeout]);
      if (profile?.force_password_change) {
        throw redirect({ to: "/auth", search: { flow: "force-change" } });
      }
    } catch (e) {
      if ((e as { to?: string })?.to) throw e;
    }

    cachedUserAuth = {
      userId: activeUser.id,
      verifiedAt: Date.now(),
    };

    return { user: activeUser };
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
let hasSyncedOrgData = false;

function AuthenticatedLayout() {
  const router = useRouter();
  const pathname = router.state.location.pathname;
  const routeContext = Route.useRouteContext();
  const { isReady, user } = useAuthReady();
  const activeUser = routeContext?.user || user;

  useEffect(() => {
    // Only redirect if auth resolution is complete AND neither routeContext nor useAuthReady has a user
    if (isReady && !activeUser) {
      if (typeof window !== "undefined") {
        window.location.replace("/auth?flow=signin");
      }
    } else if (activeUser && !hasSyncedOrgData) {
      hasSyncedOrgData = true;
      import("@/lib/admin/users.functions")
        .then(({ syncOrganizationDataServerFn }) => {
          void syncOrganizationDataServerFn().catch(() => {});
        })
        .catch(() => {});
    }
  }, [isReady, activeUser]);

  if (!activeUser && !isReady) {
    return <LoadingBlock />;
  }

  return (
    <AppShell>
      <CatchBoundary
        getResetKey={() => pathname}
        onCatch={(error) => {
          console.error("Authenticated layout error:", error);
        }}
        errorComponent={RouteErrorFallback}
      >
        <Outlet />
      </CatchBoundary>
    </AppShell>
  );
}

function RouteErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const { t } = useTranslation();
  const isChunkError = isChunkLoadError(error);

  useEffect(() => {
    if (isChunkError) {
      const recovered = recoverFromChunkError();
      if (recovered) {
        toast.info("A new STOS update was published. Refreshing...", { duration: 3000 });
      }
    }
  }, [isChunkError]);

  console.error("[RouteErrorFallback] Caught unhandled route render failure:", error);
  return (
    <div className="p-4 space-y-3">
      <ErrorBlock
        message={
          isChunkError
            ? "A newer version of STOS was just published. Please refresh the page to load the latest release."
            : t(
                "errors.routeFailure",
                "This page ran into a problem loading its data. The rest of STOS is still available — use the sidebar to navigate, or retry this page.",
              )
        }
        onRetry={() => {
          if (isChunkError) {
            recoverFromChunkError(true);
            return;
          }
          router.invalidate();
          reset();
        }}
      />
      {error?.message && (
        <div className="mx-auto max-w-2xl rounded-md border border-destructive/25 bg-destructive/5 p-3 text-xs text-destructive">
          <p className="font-semibold mb-1">{t("errors.diagnostics", "Error diagnostics:")}</p>
          <pre className="whitespace-pre-wrap break-words font-mono">{error.message}</pre>
        </div>
      )}
    </div>
  );
}

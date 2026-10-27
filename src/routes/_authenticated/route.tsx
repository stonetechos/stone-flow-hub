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

    // Verify session locally first (instant, non-blocking from storage, guarded with 2s safety timeout)
    const sessionPromise = supabase.auth.getSession().catch(() => ({ data: { session: null } }));
    const sessionTimeout = new Promise<{ data: { session: null } }>((resolve) =>
      setTimeout(() => resolve({ data: { session: null } }), 2000),
    );
    const { data: sessionData } = await Promise.race([sessionPromise, sessionTimeout]);
    const session = sessionData?.session;

    if (!session?.user) {
      cachedUserAuth = null;
      throw redirect({ to: "/auth", search: { flow: "signin" } });
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at ?? 0;
    const isExpired = expiresAt > 0 && expiresAt <= now;

    // Fast-path: check in-memory cache or sessionStorage
    const isSessionVerified = (uid: string) => {
      if (
        cachedUserAuth &&
        cachedUserAuth.userId === uid &&
        Date.now() - cachedUserAuth.verifiedAt < VERIFY_TTL_MS
      ) {
        return true;
      }
      try {
        if (typeof window !== "undefined" && window.sessionStorage) {
          const stored = window.sessionStorage.getItem(`stos_auth_verified_${uid}`);
          if (stored) {
            const time = Number(stored);
            if (time && Date.now() - time < VERIFY_TTL_MS) {
              cachedUserAuth = { userId: uid, verifiedAt: time };
              return true;
            }
          }
        }
      } catch {
        // ignore storage error
      }
      return false;
    };

    if (!isExpired && isSessionVerified(session.user.id)) {
      return { user: session.user };
    }

    let activeUser = session.user;

    if (isExpired) {
      // Attempt token refresh if local session timestamp is past expiration (guarded with 3s timeout)
      const refreshPromise = supabase.auth.refreshSession().catch((err) => ({
        data: { session: null },
        error: err as Error,
      }));
      const refreshTimeout = new Promise<{ data: { session: null }; error: Error }>((resolve) =>
        setTimeout(
          () => resolve({ data: { session: null }, error: new Error("Auth refresh timeout") }),
          3000,
        ),
      );
      const { data: refreshed, error: refreshErr } = await Promise.race([
        refreshPromise,
        refreshTimeout,
      ]);
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
    }

    // Check account status: password change, deactivation, and termination in parallel
    try {
      const userEmail = activeUser.email?.trim().toLowerCase();
      const profilePromise = (async () => {
        try {
          const { data } = await supabase
            .from("profiles")
            .select("force_password_change, is_active")
            .eq("id", activeUser.id)
            .maybeSingle();
          return data;
        } catch {
          return null;
        }
      })();

      const empPromise = (async () => {
        try {
          const { data } = await supabase
            .from("employees")
            .select("id, employment_status")
            .or(`user_id.eq.${activeUser.id}${userEmail ? `,email.ilike.${userEmail}` : ""}`)
            .in("employment_status", ["terminated", "resigned"])
            .maybeSingle();
          return data;
        } catch {
          return null;
        }
      })();

      const timeoutPromise = new Promise<{ profile: null; terminatedEmp: null }>((resolve) =>
        setTimeout(() => resolve({ profile: null, terminatedEmp: null }), 1500),
      );

      const [profile, terminatedEmp] = await Promise.race([
        Promise.all([profilePromise, empPromise]),
        timeoutPromise.then((t) => [t.profile, t.terminatedEmp] as const),
      ]);

      if (profile && profile.is_active === false) {
        beginManagedSignOut();
        try {
          await supabase.auth.signOut({ scope: "local" });
        } catch {
          // ignore signout error
        }
        throw redirect({ to: "/auth", search: { flow: "deactivated" } });
      }

      if (profile?.force_password_change) {
        throw redirect({ to: "/auth", search: { flow: "force-change" } });
      }

      if (terminatedEmp) {
        beginManagedSignOut();
        try {
          await supabase.auth.signOut({ scope: "local" });
        } catch {
          // ignore signout error
        }
        throw redirect({ to: "/auth", search: { flow: "terminated" } });
      }
    } catch (e) {
      if ((e as { to?: string })?.to) throw e;
    }

    cachedUserAuth = {
      userId: activeUser.id,
      verifiedAt: Date.now(),
    };
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        window.sessionStorage.setItem(`stos_auth_verified_${activeUser.id}`, String(Date.now()));
      }
    } catch {
      // ignore storage error
    }

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

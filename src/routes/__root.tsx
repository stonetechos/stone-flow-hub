import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { classifyFailure } from "../lib/errors";
import { installToastDiagnostics } from "@/lib/diagnostics/toast-diagnostics";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { StoneGrainFilter } from "@/components/stone/StoneGrainFilter";
import { ViewportDebugPanel } from "@/components/debug/ViewportDebugPanel";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component", category: classifyFailure(error) });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. Try again, or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content" },
      { title: "Stone Tech OS" },
      {
        name: "description",
        content: "ERP for the natural stone industry — leads, projects, vendors, RFQs.",
      },
      { name: "author", content: "Stone Tech OS" },
      { property: "og:title", content: "Stone Tech OS" },
      { property: "og:description", content: "ERP for the natural stone industry — leads, projects, vendors, RFQs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Stone Tech OS" },
      { name: "twitter:description", content: "ERP for the natural stone industry — leads, projects, vendors, RFQs." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/0071bcea-b836-4adf-b66a-25bd10d454dc" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/0071bcea-b836-4adf-b66a-25bd10d454dc" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Roboto+Slab:wght@500;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    void installToastDiagnostics();
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        // Phase G.8.9 root-cause fix: clearing the query cache in place
        // (queryClient.clear()) synchronously drops every mounted query's
        // `data` to undefined for one render before a refetch can start.
        // Many screens only guard on `isLoading`/`error` before asserting
        // `query.data!`, so that transient render was throwing straight
        // through to the root error boundary instead of the intended
        // redirect. When we're about to hard-navigate away anyway, the
        // in-memory cache is moot the instant the page unloads — so do the
        // navigation first and skip the doomed re-render entirely. Only
        // mutate the cache in place when we're NOT navigating (i.e.
        // already on /auth, so nothing will unmount the tree for us).
        const onAuthPage =
          typeof window !== "undefined" && window.location.pathname.startsWith("/auth");
        if (!onAuthPage && typeof window !== "undefined") {
          window.location.replace("/auth");
          return;
        }
        void queryClient.cancelQueries();
        queryClient.clear();
        router.invalidate();
        return;
      }
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        router.invalidate();
        queryClient.invalidateQueries();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <StoneGrainFilter />
      <Outlet />
      <Toaster richColors position="top-right" />
      {import.meta.env.DEV ? <ViewportDebugPanel /> : null}
    </QueryClientProvider>
  );
}

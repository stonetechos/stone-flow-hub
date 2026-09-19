/**
 * /backend — auth guard layout for the Stone Tech backend panel.
 *
 * Checks Supabase session on every navigation. If the visitor is not signed
 * in they are redirected to /auth. No ERP AppShell is rendered here — the
 * backend panel has its own minimal chrome.
 */
import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getSupabaseConfigStatus } from "@/lib/env/config-status";
import { Link } from "@tanstack/react-router";
import { LogOut, LayoutGrid, Settings2, Globe } from "lucide-react";
import { AppMark } from "@/components/brand/AppMark";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { beginManagedSignOut } from "@/lib/auth/managed-sign-out";
import { useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = createFileRoute("/backend" as any)({
  ssr: false,
  beforeLoad: async () => {
    if (!getSupabaseConfigStatus().ok) return { user: null };

    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth", search: { flow: "signin" } });
    }
    return { user: data.user };
  },
  component: BackendLayout,
  errorComponent: BackendErrorPage,
  notFoundComponent: BackendNotFound,
});

/* -------------------------------------------------------------------------- */
/* Sidebar nav items                                                            */
/* -------------------------------------------------------------------------- */
const NAV_ITEMS = [
  {
    to: "/backend/site-settings",
    label: "Site Settings",
    Icon: Settings2,
  },
] as const;

/* -------------------------------------------------------------------------- */
/* Layout                                                                       */
/* -------------------------------------------------------------------------- */
function BackendLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function handleSignOut() {
    beginManagedSignOut();
    await supabase.auth.signOut();
    toast.success("Signed out");
    window.location.replace("/auth?flow=signin");
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="w-56 shrink-0 flex flex-col border-r border-border bg-muted/30">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-border">
          <AppMark size={28} className="h-7 w-7" />
          <div>
            <p className="text-xs font-bold leading-tight">Stone Tech</p>
            <p className="text-[10px] text-muted-foreground leading-tight">Backend Panel</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-0.5 px-2">
          <p className="px-2 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            Content
          </p>
          {NAV_ITEMS.map(({ to, label, Icon }) => {
            const active = pathname.startsWith(to);
            return (
              <Link
                key={to}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                to={to as any}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className="px-2 pb-4 space-y-1 border-t border-border pt-4">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Globe className="h-4 w-4 shrink-0" />
            View Live Site
          </a>
          <a
            href="/dashboard"
            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <LayoutGrid className="h-4 w-4 shrink-0" />
            Back to STOS
          </a>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2.5 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

function BackendErrorPage() {
  return (
    <div className="p-10 text-center text-sm text-destructive">
      Something went wrong loading this page. Please refresh or go back.
    </div>
  );
}

function BackendNotFound() {
  return (
    <div className="p-10 text-center text-sm text-muted-foreground">
      Page not found in the backend panel.
    </div>
  );
}

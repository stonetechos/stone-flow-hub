/** Vendor portal shell — sidebar + top bar, mobile-friendly. */
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Inbox, Package, User, LogOut, Menu } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import stosAppIcon from "@/assets/stos-app-icon.png.asset.json";

const NAV = [
  { to: "/vendor/dashboard", label: "Today", icon: LayoutDashboard },
  { to: "/vendor/rfqs", label: "RFQs", icon: Inbox },
  { to: "/vendor/orders", label: "Orders", icon: Package },
  { to: "/vendor/profile", label: "Profile", icon: User },
] as const;

export function VendorShell({
  companyName,
  children,
}: {
  companyName: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    await navigate({ to: "/auth", replace: true, search: { flow: "signin" } });
  }

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 border-r border-border bg-card md:flex md:flex-col">
        <div className="border-b border-border px-4 py-4">
          <div className="flex items-center gap-2 font-display text-sm font-bold tracking-tight">
            <img src={stosAppIcon.url} alt="STOS" width={22} height={22} className="h-[22px] w-[22px] rounded" />
            <span><span className="text-primary">STOS</span> Vendor</span>
          </div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">{companyName}</div>
          <div className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">By Vedora Vision</div>
        </div>
        <nav className="flex-1 space-y-1 p-2">
          {NAV.map((n) => {
            const active = path === n.to || path.startsWith(n.to + "/");
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile top bar + drawer */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card px-3 py-2 md:hidden">
          <button
            aria-label="Open menu"
            className="rounded-md p-2 hover:bg-muted"
            onClick={() => setMobileOpen((v) => !v)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="truncate font-display text-sm font-bold">
            <span className="text-primary">STOS</span> Vendor
          </div>
          <Button variant="ghost" size="icon" aria-label="Sign out" onClick={signOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </header>
        {mobileOpen && (
          <nav className="border-b border-border bg-card p-2 md:hidden">
            {NAV.map((n) => {
              const active = path === n.to || path.startsWith(n.to + "/");
              const Icon = n.icon;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                    active ? "bg-primary/10 text-primary" : "hover:bg-muted/60",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {n.label}
                </Link>
              );
            })}
          </nav>
        )}
        <main className="min-w-0 flex-1 px-3 py-4 sm:px-6 sm:py-6">{children}</main>
      </div>
    </div>
  );
}

import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Building2,
  Factory,
  PackageSearch,
  ClipboardList,
  CalendarClock,
  FileText,
  Receipt,
  LogOut,
  Search,
  Gem,
  ShoppingCart,
  Truck,
  Warehouse,
  ClipboardCheck,
  Wallet,
  Calendar,
  BarChart3,
  Settings,
  Activity,
  CheckSquare,
  FolderOpen,
  Star,
  ShieldCheck,
  Menu,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { GlobalSearchDialog } from "@/components/global/GlobalSearchDialog";
import { QuickCreateMenu } from "@/components/global/QuickCreateMenu";
import { NotificationsBell } from "@/components/global/NotificationsBell";
import { Breadcrumbs } from "@/components/global/Breadcrumbs";

const NAV: ReadonlyArray<{ to: string; label: string; icon: typeof LayoutDashboard }> = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/enquiries", label: "Enquiries", icon: ClipboardList },
  { to: "/followups", label: "Follow-ups", icon: CalendarClock },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/quotes", label: "Quotations", icon: FileText },
  { to: "/sales-orders", label: "Sales Orders", icon: ShoppingCart },
  { to: "/purchase-orders", label: "Purchase Orders", icon: ClipboardCheck },
  { to: "/inventory", label: "Inventory", icon: Warehouse },
  { to: "/dispatch", label: "Dispatch", icon: Truck },
  { to: "/invoices", label: "Invoices", icon: Receipt },
  { to: "/payments", label: "Payments", icon: Wallet },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/projects", label: "Projects", icon: Building2 },
  { to: "/vendors", label: "Vendors", icon: Factory },
  { to: "/products", label: "Products", icon: PackageSearch },
  { to: "/documents", label: "Documents", icon: FolderOpen },
  { to: "/activity", label: "Activity", icon: Activity },
  { to: "/favorites", label: "Favorites", icon: Star },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

const ADMIN_NAV: ReadonlyArray<{ to: string; label: string; icon: typeof LayoutDashboard }> = [
  { to: "/admin/users", label: "Users & Roles", icon: ShieldCheck },
];

function NavList({
  path,
  onNavigate,
  isAdmin,
}: {
  path: string;
  onNavigate?: () => void;
  isAdmin: boolean;
}) {
  const items = isAdmin ? [...NAV, ...ADMIN_NAV] : NAV;
  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto p-2" aria-label="Primary">
      {items.map((item) => {
        const active = path === item.to || path.startsWith(`${item.to}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-sm px-3 py-2 text-sm outline-none transition-colors",
              "focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data: sess } = await supabase.auth.getUser();
      const uid = sess.user?.id;
      if (!uid) return;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .eq("role", "admin")
        .maybeSingle();
      if (!cancelled) setIsAdmin(!!data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable ||
          target.getAttribute("role") === "combobox");
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
        return;
      }
      if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.key === "/") {
          e.preventDefault();
          setSearchOpen(true);
          return;
        }
        if (e.key.toLowerCase() === "c") {
          e.preventDefault();
          setCreateOpen((v) => !v);
          return;
        }
        if (e.key === "?") {
          e.preventDefault();
          toast("Shortcuts", {
            description: "⌘/Ctrl+K or / — search · C — create menu · ? — this help",
          });
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  async function onSignOut() {
    try {
      await supabase.auth.signOut();
    } finally {
      toast.success("Signed out");
      // Root-level onAuthStateChange handles cache teardown + redirect.
      await navigate({ to: "/auth", replace: true });
    }
  }

  return (
    <div className="flex min-h-dvh bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-sm focus:bg-primary focus:px-3 focus:py-1.5 focus:text-sm focus:text-primary-foreground"
      >
        Skip to main content
      </a>

      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
          <Gem className="h-5 w-5 text-sidebar-primary" aria-hidden />
          <span className="font-display text-lg font-semibold">
            Stone Tech <span className="text-sidebar-primary">OS</span>
          </span>
        </div>
        <NavList path={path} isAdmin={isAdmin} />
        <div className="border-t border-sidebar-border p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSignOut}
            className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="mr-2 h-4 w-4" aria-hidden />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-border bg-card px-3 shadow-1 sm:gap-3 sm:px-4">
          {/* Mobile nav trigger */}
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="flex w-64 flex-col bg-sidebar p-0 text-sidebar-foreground"
            >
              <SheetHeader className="h-14 flex-row items-center gap-2 border-b border-sidebar-border px-4 py-0 space-y-0">
                <Gem className="h-5 w-5 text-sidebar-primary" aria-hidden />
                <SheetTitle className="font-display text-lg font-semibold text-sidebar-foreground">
                  Stone Tech <span className="text-sidebar-primary">OS</span>
                </SheetTitle>
              </SheetHeader>
              <NavList path={path} isAdmin={isAdmin} onNavigate={() => setMobileNavOpen(false)} />
              <div className="border-t border-sidebar-border p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSignOut}
                  className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <LogOut className="mr-2 h-4 w-4" aria-hidden />
                  Sign out
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2 md:hidden">
            <Gem className="h-5 w-5 text-primary" aria-hidden />
            <span className="font-display font-semibold">Stone Tech OS</span>
          </div>

          <div className="ml-auto flex flex-1 items-center md:ml-0">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className={cn(
                "group relative hidden h-9 w-full max-w-md items-center gap-2 rounded-sm border border-input bg-background pl-8 pr-3 text-left text-sm text-muted-foreground",
                "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex",
              )}
              aria-label="Open global search"
            >
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2"
                aria-hidden
              />
              <span className="truncate">Search customers, projects, enquiries…</span>
              <kbd className="ml-auto hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
                ⌘K
              </kbd>
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden"
              onClick={() => setSearchOpen(true)}
              aria-label="Open global search"
            >
              <Search className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <QuickCreateMenu open={createOpen} onOpenChange={setCreateOpen} />
            <NotificationsBell />
          </div>
        </header>

        <div className="border-b border-border bg-muted/30 px-4 py-2 md:px-6">
          <Breadcrumbs />
        </div>

        <main id="main-content" className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>

      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}

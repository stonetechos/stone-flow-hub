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
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { GlobalSearchDialog } from "@/components/global/GlobalSearchDialog";
import { QuickCreateMenu } from "@/components/global/QuickCreateMenu";
import { NotificationsBell } from "@/components/global/NotificationsBell";
import { Breadcrumbs } from "@/components/global/Breadcrumbs";

const NAV: ReadonlyArray<{ to: string; label: string; icon: typeof LayoutDashboard }> = [
  { to: "/dashboard",        label: "Dashboard",       icon: LayoutDashboard },
  { to: "/enquiries",        label: "Enquiries",       icon: ClipboardList },
  { to: "/followups",        label: "Follow-ups",      icon: CalendarClock },
  { to: "/tasks",            label: "Tasks",           icon: CheckSquare },
  { to: "/calendar",         label: "Calendar",        icon: Calendar },
  { to: "/quotes",           label: "Quotations",      icon: FileText },
  { to: "/sales-orders",     label: "Sales Orders",    icon: ShoppingCart },
  { to: "/purchase-orders",  label: "Purchase Orders", icon: ClipboardCheck },
  { to: "/inventory",        label: "Inventory",       icon: Warehouse },
  { to: "/dispatch",         label: "Dispatch",        icon: Truck },
  { to: "/invoices",         label: "Invoices",        icon: Receipt },
  { to: "/payments",         label: "Payments",        icon: Wallet },
  { to: "/customers",        label: "Customers",       icon: Users },
  { to: "/projects",         label: "Projects",        icon: Building2 },
  { to: "/vendors",          label: "Vendors",         icon: Factory },
  { to: "/products",         label: "Products",        icon: PackageSearch },
  { to: "/documents",        label: "Documents",       icon: FolderOpen },
  { to: "/activity",         label: "Activity",        icon: Activity },
  { to: "/favorites",        label: "Favorites",       icon: Star },
  { to: "/reports",          label: "Reports",         icon: BarChart3 },
  { to: "/settings",         label: "Settings",        icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  async function onSignOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    await navigate({ to: "/auth" });
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
          <Gem className="h-5 w-5 text-sidebar-primary" />
          <span className="font-display text-lg font-semibold">
            Stone Tech <span className="text-sidebar-primary">OS</span>
          </span>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {NAV.map((item) => {
            const active = path === item.to || path.startsWith(`${item.to}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSignOut}
            className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-card px-4 shadow-1">
          <div className="flex items-center gap-2 md:hidden">
            <Gem className="h-5 w-5 text-primary" />
            <span className="font-display font-semibold">Stone Tech OS</span>
          </div>
          <div className="flex flex-1 items-center">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="group relative flex h-9 w-full max-w-md items-center gap-2 rounded-sm border border-input bg-background pl-8 pr-3 text-left text-sm text-muted-foreground hover:text-foreground"
              aria-label="Open global search"
            >
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" />
              <span className="truncate">Search customers, projects, enquiries…</span>
              <kbd className="ml-auto hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">⌘K</kbd>
            </button>
          </div>
          <div className="flex items-center gap-1">
            <QuickCreateMenu />
            <NotificationsBell />
          </div>
        </header>

        <div className="border-b border-border bg-muted/30 px-4 py-2 md:px-6">
          <Breadcrumbs />
        </div>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>

      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}

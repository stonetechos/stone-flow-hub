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
} from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const NAV: ReadonlyArray<{ to: string; label: string; icon: typeof LayoutDashboard }> = [
  { to: "/dashboard",        label: "Dashboard",       icon: LayoutDashboard },
  { to: "/enquiries",        label: "Enquiries",       icon: ClipboardList },
  { to: "/followups",        label: "Follow-ups",      icon: CalendarClock },
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
  { to: "/reports",          label: "Reports",         icon: BarChart3 },
  { to: "/settings",         label: "Settings",        icon: Settings },
];



export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

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
        <nav className="flex-1 space-y-0.5 p-2">
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
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                aria-label="Search"
                placeholder="Search customers, projects, enquiries…"
                className="h-9 w-full rounded-sm border border-input bg-background pl-8 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LogOut,
  Search,
  Gem,
  Menu,
  Star,
  ChevronDown,
  History,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { GlobalSearchDialog } from "@/components/global/GlobalSearchDialog";
import { QuickCreateMenu } from "@/components/global/QuickCreateMenu";
import { NotificationsBell } from "@/components/global/NotificationsBell";
import { Breadcrumbs } from "@/components/global/Breadcrumbs";
import { Copilot } from "@/components/copilot/Copilot";
import { DemoProvider } from "@/lib/demo/context";
import { DemoBadge, DemoBanner } from "@/components/global/DemoBadge";
import {
  resolveNav,
  trackNavVisit,
  useNavPreferences,
  useRecentNav,
} from "@/lib/nav/preferences";
import { NAV_ITEMS_BY_ID } from "@/lib/nav/config";

function NavLinkRow({
  to,
  label,
  Icon,
  active,
  onNavigate,
  starred,
  onToggleStar,
}: {
  to: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onNavigate?: () => void;
  starred: boolean;
  onToggleStar: () => void;
}) {
  return (
    <div className="group relative flex items-center">
      <Link
        to={to}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex flex-1 items-center gap-3 rounded-sm py-2 pl-3 pr-8 text-sm outline-none transition-colors",
          "focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar",
          active
            ? "bg-sidebar-primary text-sidebar-primary-foreground"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        )}
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        <span className="truncate">{label}</span>
      </Link>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleStar();
        }}
        aria-label={starred ? `Unpin ${label}` : `Pin ${label}`}
        aria-pressed={starred}
        className={cn(
          "absolute right-1 rounded-sm p-1 text-sidebar-foreground/40 hover:text-sidebar-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sidebar-ring",
          starred ? "opacity-100 text-amber-400" : "opacity-0 group-hover:opacity-100",
        )}
      >
        <Star className={cn("h-3.5 w-3.5", starred && "fill-current")} aria-hidden />
      </button>
    </div>
  );
}

function NavList({
  path,
  onNavigate,
  isAdmin,
}: {
  path: string;
  onNavigate?: () => void;
  isAdmin: boolean;
}) {
  const { prefs, update } = useNavPreferences();
  const recent = useRecentNav();
  const resolved = useMemo(() => resolveNav(prefs, isAdmin), [prefs, isAdmin]);

  const isActive = (to: string): boolean => path === to || path.startsWith(`${to}/`);
  const collapsedSet = new Set(prefs.collapsedGroups);

  const toggleStar = (id: string): void =>
    update((p) => {
      const starred = p.starred.includes(id)
        ? p.starred.filter((s) => s !== id)
        : [...p.starred, id];
      return { ...p, starred };
    });

  const toggleGroup = (gid: (typeof prefs.collapsedGroups)[number]): void =>
    update((p) => ({
      ...p,
      collapsedGroups: p.collapsedGroups.includes(gid)
        ? p.collapsedGroups.filter((g) => g !== gid)
        : [...p.collapsedGroups, gid],
    }));

  const recentItems = recent
    .map((id) => NAV_ITEMS_BY_ID[id])
    .filter((i) => i && (i.adminOnly ? isAdmin : true))
    .filter((i) => !prefs.hidden.includes(i.id))
    .slice(0, 5);

  return (
    <nav className="flex-1 space-y-2 overflow-y-auto p-2" aria-label="Primary">
      {recentItems.length > 0 && (
        <section aria-labelledby="nav-recent">
          <h4
            id="nav-recent"
            className="mb-1 flex items-center gap-1.5 px-2 pt-1 text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/50"
          >
            <History className="h-3 w-3" aria-hidden />
            Recently used
          </h4>
          <div className="space-y-0.5">
            {recentItems.map((item) => (
              <Link
                key={`recent-${item.id}`}
                to={item.to}
                onClick={onNavigate}
                className="flex items-center gap-3 rounded-sm px-3 py-1.5 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <item.icon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                <span className="truncate">{item.label}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {resolved.starred.length > 0 && (
        <section aria-labelledby="nav-pinned">
          <h4
            id="nav-pinned"
            className="mb-1 flex items-center gap-1.5 px-2 pt-1 text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/50"
          >
            <Star className="h-3 w-3" aria-hidden />
            Pinned
          </h4>
          <div className="space-y-0.5">
            {resolved.starred.map((item) => (
              <NavLinkRow
                key={item.id}
                to={item.to}
                label={item.label}
                Icon={item.icon}
                active={isActive(item.to)}
                onNavigate={onNavigate}
                starred
                onToggleStar={() => toggleStar(item.id)}
              />
            ))}
          </div>
        </section>
      )}

      {resolved.groups.map((group) => {
        if (group.items.length === 0) return null;
        const collapsed = collapsedSet.has(group.id);
        return (
          <section key={group.id} aria-labelledby={`nav-group-${group.id}`}>
            <button
              type="button"
              id={`nav-group-${group.id}`}
              onClick={() => toggleGroup(group.id)}
              aria-expanded={!collapsed}
              className="mb-0.5 flex w-full items-center justify-between rounded-sm px-2 pt-1 text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/50 hover:text-sidebar-foreground/80"
            >
              <span>{group.label}</span>
              <ChevronDown
                className={cn(
                  "h-3 w-3 transition-transform",
                  collapsed && "-rotate-90",
                )}
                aria-hidden
              />
            </button>
            {!collapsed && (
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLinkRow
                    key={item.id}
                    to={item.to}
                    label={item.label}
                    Icon={item.icon}
                    active={isActive(item.to)}
                    onNavigate={onNavigate}
                    starred={false}
                    onToggleStar={() => toggleStar(item.id)}
                  />
                ))}
              </div>
            )}
          </section>
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

  // Track visits for the "Recently used" strip.
  useEffect(() => {
    trackNavVisit(path);
  }, [path]);

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
    <DemoProvider>
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
          <div className="flex items-center gap-1 sm:gap-2">
            <DemoBadge />
            <QuickCreateMenu open={createOpen} onOpenChange={setCreateOpen} />
            <NotificationsBell />
          </div>
        </header>

        <DemoBanner />

        <div className="border-b border-border bg-muted/30 px-4 py-2 md:px-6">
          <Breadcrumbs />
        </div>

        <main id="main-content" className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>

      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <Copilot />
    </div>
    </DemoProvider>
  );
}

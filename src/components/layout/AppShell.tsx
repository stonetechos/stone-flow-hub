import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LogOut,
  Search,
  Gem,
  Menu,
  Star,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  History,
  User as UserIcon,
  Settings as SettingsIcon,
  Sparkles,
  Keyboard,
  Shield,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { GlobalSearchDialog } from "@/components/global/GlobalSearchDialog";
import { QuickCreateMenu } from "@/components/global/QuickCreateMenu";
import { NotificationsBell } from "@/components/global/NotificationsBell";
import { ThemeSwitcher } from "@/components/global/ThemeSwitcher";
import { Breadcrumbs } from "@/components/global/Breadcrumbs";
import { PageTransition } from "@/components/layout/PageTransition";
import { Copilot } from "@/components/copilot/Copilot";
import { DemoProvider } from "@/lib/demo/context";
import { DemoBadge, DemoBanner } from "@/components/global/DemoBadge";
import {
  resolveNav,
  trackNavVisit,
  useCurrentUserId,
  useNavPreferences,
  useRecentNav,
} from "@/lib/nav/preferences";
import { NAV_ITEMS_BY_ID } from "@/lib/nav/config";


/* --------------------------------------------------------------------- */
/* Sidebar collapsed state (per user, persisted in localStorage)          */
/* --------------------------------------------------------------------- */
const COLLAPSE_KEY = (uid: string | null): string =>
  uid ? `st.sidebar.collapsed.${uid}` : "st.sidebar.collapsed";

function useSidebarCollapsed(uid: string | null): [boolean, (v: boolean) => void] {
  const [collapsed, setCollapsed] = useState(false);
  // Read after mount to avoid SSR hydration mismatch.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(COLLAPSE_KEY(uid));
      if (raw != null) setCollapsed(raw === "1");
    } catch {
      /* ignore */
    }
  }, [uid]);
  const set = (v: boolean): void => {
    setCollapsed(v);
    try {
      window.localStorage.setItem(COLLAPSE_KEY(uid), v ? "1" : "0");
    } catch {
      /* ignore */
    }
  };
  return [collapsed, set];
}

/* --------------------------------------------------------------------- */
/* Nav row                                                                */
/* --------------------------------------------------------------------- */
function NavLinkRow({
  to,
  label,
  Icon,
  active,
  collapsed,
  onNavigate,
  starred,
  onToggleStar,
}: {
  to: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  collapsed?: boolean;
  onNavigate?: () => void;
  starred: boolean;
  onToggleStar: () => void;
}) {
  const link = (
    <Link
      to={to}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex flex-1 items-center gap-3 rounded-md py-1.5 pr-8 text-[13px] outline-none",
        "transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        collapsed ? "justify-center pl-2 pr-2" : "pl-3",
        active
          ? "bg-sidebar-accent/60 text-sidebar-accent-foreground font-medium"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
      )}
    >
      {/* Restrained left accent instead of full pill */}
      <span
        aria-hidden
        className={cn(
          "absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r-full bg-sidebar-primary transition-opacity duration-150",
          active ? "opacity-100" : "opacity-0",
        )}
      />
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-opacity",
          active ? "opacity-90" : "opacity-60",
        )}
        aria-hidden
      />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );

  return (
    <div className="group relative flex items-center">
      {collapsed ? (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>{link}</TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              {label}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        link
      )}
      {!collapsed && (
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
            "absolute right-1 rounded-sm p-1 text-sidebar-foreground/40 hover:text-sidebar-foreground",
            "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sidebar-ring",
            starred ? "opacity-100 text-amber-400" : "opacity-0 group-hover:opacity-100",
          )}
        >
          <Star className={cn("h-3 w-3", starred && "fill-current")} aria-hidden />
        </button>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------- */
/* Nav list                                                               */
/* --------------------------------------------------------------------- */
function NavList({
  path,
  onNavigate,
  isAdmin,
  collapsed,
}: {
  path: string;
  onNavigate?: () => void;
  isAdmin: boolean;
  collapsed?: boolean;
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
    <nav
      className={cn(
        "flex-1 overflow-y-auto overflow-x-hidden",
        collapsed ? "px-1.5 py-2 space-y-1" : "px-2 py-2 space-y-3",
      )}
      aria-label="Primary"
    >
      {!collapsed && recentItems.length > 0 && (
        <section aria-labelledby="nav-recent">
          <h4
            id="nav-recent"
            className="mb-1 flex items-center gap-1.5 px-2 pt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-sidebar-foreground/40"
          >
            <History className="h-3 w-3" aria-hidden />
            Recent
          </h4>
          <div className="space-y-px">
            {recentItems.map((item) => (
              <Link
                key={`recent-${item.id}`}
                to={item.to}
                onClick={onNavigate}
                className="flex items-center gap-3 rounded-md px-3 py-1.5 text-[13px] text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
              >
                <item.icon className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
                <span className="truncate">{item.label}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {resolved.starred.length > 0 && (
        <section aria-labelledby="nav-pinned">
          {!collapsed && (
            <h4
              id="nav-pinned"
              className="mb-1 flex items-center gap-1.5 px-2 pt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-sidebar-foreground/40"
            >
              <Star className="h-3 w-3" aria-hidden />
              Pinned
            </h4>
          )}
          <div className="space-y-px">
            {resolved.starred.map((item) => (
              <NavLinkRow
                key={item.id}
                to={item.to}
                label={item.label}
                Icon={item.icon}
                active={isActive(item.to)}
                collapsed={collapsed}
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
        const groupCollapsed = collapsedSet.has(group.id);
        return (
          <section key={group.id} aria-labelledby={`nav-group-${group.id}`}>
            {!collapsed && (
              <button
                type="button"
                id={`nav-group-${group.id}`}
                onClick={() => toggleGroup(group.id)}
                aria-expanded={!groupCollapsed}
                className="mb-1 flex w-full items-center justify-between rounded-sm px-2 pt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-sidebar-foreground/40 hover:text-sidebar-foreground/70"
              >
                <span>{group.label}</span>
                <ChevronDown
                  className={cn(
                    "h-3 w-3 transition-transform duration-150",
                    groupCollapsed && "-rotate-90",
                  )}
                  aria-hidden
                />
              </button>
            )}
            {(collapsed || !groupCollapsed) && (
              <div className="space-y-px">
                {group.items.map((item) => (
                  <NavLinkRow
                    key={item.id}
                    to={item.to}
                    label={item.label}
                    Icon={item.icon}
                    active={isActive(item.to)}
                    collapsed={collapsed}
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

/* --------------------------------------------------------------------- */
/* User menu (avatar dropdown)                                            */
/* --------------------------------------------------------------------- */
function UserMenu({
  onSignOut,
  onOpenShortcuts,
  isAdmin,
}: {
  onSignOut: () => void;
  onOpenShortcuts: () => void;
  isAdmin: boolean;
}) {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>("");
  const [lastLogin, setLastLogin] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      setEmail(data.user?.email ?? "");
      setLastLogin(data.user?.last_sign_in_at ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const initials =
    (email || "?")
      .split("@")[0]
      .split(/[._\-\s]+/)
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  const lastLoginLabel = lastLogin
    ? new Date(lastLogin).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full p-0"
          aria-label="Open user menu"
        >
          <Avatar className="h-8 w-8 border border-border-default">
            <AvatarFallback className="bg-surface-panel text-[11px] font-medium text-text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-72 overflow-hidden p-0 border-border-default shadow-e3"
      >
        {/* Basalt header with identity */}
        <div className="material-basalt stone-grain relative">
          <div className="relative z-10 flex items-start gap-3 px-3.5 py-3.5">
            <Avatar className="h-10 w-10 border border-white/10 shadow-e2">
              <AvatarFallback className="bg-surface-nav text-[13px] font-medium text-text-inverse">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-[13px] font-medium text-text-inverse">
                {email || "Account"}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-sm px-1.5 py-px font-mono text-[10px] uppercase tracking-wider",
                    isAdmin
                      ? "bg-mint-500/20 text-mint-200"
                      : "bg-white/8 text-text-inverse-muted",
                  )}
                >
                  {isAdmin ? <Shield className="h-2.5 w-2.5" aria-hidden /> : null}
                  {isAdmin ? "Admin" : "Member"}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-text-inverse-muted">
                  Stone Tech OS
                </span>
              </div>
            </div>
          </div>
          <div className="relative z-10 border-t border-white/8 px-3.5 py-1.5">
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-text-inverse-muted">
              <span>Last login</span>
              <span>{lastLoginLabel}</span>
            </div>
          </div>
        </div>

        <div className="bg-surface-card py-1">
          <DropdownMenuItem onClick={() => void navigate({ to: "/settings" })}>
            <UserIcon className="mr-2 h-4 w-4" aria-hidden />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void navigate({ to: "/settings" })}>
            <SettingsIcon className="mr-2 h-4 w-4" aria-hidden />
            Preferences
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              onOpenShortcuts();
            }}
          >
            <Keyboard className="mr-2 h-4 w-4" aria-hidden />
            Keyboard shortcuts
            <kbd className="ml-auto rounded border border-border-subtle bg-surface-panel px-1.5 py-0.5 font-mono text-[10px] text-text-muted">
              ?
            </kbd>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={onSignOut}
            className="text-intent-destructive focus:text-intent-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" aria-hidden />
            Sign out
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


/* --------------------------------------------------------------------- */
/* AppShell                                                               */
/* --------------------------------------------------------------------- */
export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const uid = useCurrentUserId();
  const [searchOpen, setSearchOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [collapsed, setCollapsed] = useSidebarCollapsed(uid);

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
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setCollapsed(!collapsed);
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
            description:
              "⌘/Ctrl+K — search · ⌘/Ctrl+B — toggle sidebar · C — create · / — search · ? — help",
          });
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [collapsed, setCollapsed]);

  async function onSignOut() {
    try {
      await supabase.auth.signOut();
    } finally {
      toast.success("Signed out");
      await navigate({ to: "/auth", replace: true });
    }
  }

  const sidebarWidth = collapsed ? "w-[56px]" : "w-[232px]";

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
        <aside
          className={cn(
            "hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex",
            "transition-[width] duration-200 ease-out",
            sidebarWidth,
          )}
          data-collapsed={collapsed}
        >
          <div
            className={cn(
              "flex h-12 items-center gap-2 border-b border-sidebar-border",
              collapsed ? "justify-center px-0" : "px-4",
            )}
          >
            <Gem className="h-4 w-4 shrink-0 text-sidebar-primary" aria-hidden />
            {!collapsed && (
              <span className="font-display text-[15px] font-semibold tracking-tight">
                Stone Tech <span className="text-sidebar-primary">OS</span>
              </span>
            )}
          </div>
          <NavList path={path} isAdmin={isAdmin} collapsed={collapsed} />
          <div
            className={cn(
              "flex items-center border-t border-sidebar-border p-1.5",
              collapsed ? "justify-center" : "justify-end",
            )}
          >
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setCollapsed(!collapsed)}
                    className="rounded-md p-1.5 text-sidebar-foreground/50 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    aria-pressed={collapsed}
                  >
                    {collapsed ? (
                      <ChevronsRight className="h-4 w-4" aria-hidden />
                    ) : (
                      <ChevronsLeft className="h-4 w-4" aria-hidden />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  {collapsed ? "Expand" : "Collapse"}
                  <span className="ml-1 opacity-60">⌘B</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </aside>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Topbar (48px) */}
          <header className="sticky top-0 z-10 flex h-12 items-center gap-2 border-b border-border bg-card/95 px-2 backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:px-3">
            {/* Mobile nav trigger */}
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 md:hidden"
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="flex w-64 flex-col bg-sidebar p-0 text-sidebar-foreground"
              >
                <SheetHeader className="h-12 flex-row items-center gap-2 border-b border-sidebar-border px-4 py-0 space-y-0">
                  <Gem className="h-4 w-4 text-sidebar-primary" aria-hidden />
                  <SheetTitle className="font-display text-[15px] font-semibold text-sidebar-foreground">
                    Stone Tech <span className="text-sidebar-primary">OS</span>
                  </SheetTitle>
                </SheetHeader>
                <NavList
                  path={path}
                  isAdmin={isAdmin}
                  onNavigate={() => setMobileNavOpen(false)}
                />
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2 md:hidden">
              <Gem className="h-4 w-4 text-primary" aria-hidden />
              <span className="font-display text-sm font-semibold">Stone Tech OS</span>
            </div>

            {/* Search — the visual focus of the topbar */}
            <div className="ml-auto flex flex-1 items-center md:ml-0">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className={cn(
                  "group relative hidden h-8 w-full max-w-md items-center gap-2 rounded-md border border-input bg-background pl-8 pr-2 text-left text-[13px] text-muted-foreground",
                  "transition-colors hover:border-ring/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex",
                )}
                aria-label="Open global search"
              >
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
                  aria-hidden
                />
                <span className="truncate">Search or jump to…</span>
                <kbd className="ml-auto hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
                  ⌘K
                </kbd>
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:hidden"
                onClick={() => setSearchOpen(true)}
                aria-label="Open global search"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-0.5 sm:gap-1">
              <DemoBadge />
              <QuickCreateMenu open={createOpen} onOpenChange={setCreateOpen} />
              <NotificationsBell />
              <div className="ml-1">
                <UserMenu onSignOut={onSignOut} />
              </div>
            </div>
          </header>

          <DemoBanner />

          <main id="main-content" className="flex-1 px-4 py-5 md:px-8 md:py-6">
            {children}
          </main>
        </div>

        <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
        <Copilot />
      </div>
    </DemoProvider>
  );
}

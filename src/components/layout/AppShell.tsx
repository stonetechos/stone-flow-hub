import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LogOut,
  Search,
  Menu,
  Plus,
  Minus,
  ChevronsLeft,
  ChevronsRight,
  User as UserIcon,
  Settings as SettingsIcon,
  Keyboard,
  Shield,
  LayoutDashboard,
  X,
  Globe,
  FileText,
  Truck,
  Languages,
  FlaskConical,
  Sliders,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetTitle,
  SheetHeader,
} from "@/components/ui/sheet";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { GlobalSearchDialog } from "@/components/global/GlobalSearchDialog";
import { NotificationsBell } from "@/components/global/NotificationsBell";
import { Breadcrumbs } from "@/components/global/Breadcrumbs";
import { LanguageToggle } from "@/components/global/LanguageToggle";
import { SUPPORTED_LANGUAGES, type LangCode } from "@/lib/i18n";
import { useTranslation } from "react-i18next";
import { PageTransition } from "@/components/layout/PageTransition";
import { SyncStatusIndicator } from "@/components/layout/SyncStatusIndicator";
import { AppMark } from "@/components/brand/AppMark";
import { Copilot } from "@/components/copilot/Copilot";
import { DangerNotifications } from "@/components/insights/DangerNotifications";
import { GrowthAdvisoryBroadcaster } from "@/components/insights/GrowthAdvisoryBroadcaster";
import { NotificationBanner } from "@/components/global/NotificationBanner";
import { DemoProvider, useDemoMode } from "@/lib/demo/context";

import { DemoBadge, DemoBanner } from "@/components/global/DemoBadge";
import {
  resolveNav,
  trackNavVisit,
  useCurrentUserId,
  useCurrentUserEmail,
  useNavPreferences,
  type ResolvedNavGroup,
} from "@/lib/nav/preferences";
import {
  isNavItemActive,
  findNavItemForPath,
  NAV_ITEMS_BY_ID,
  type NavItemDef,
} from "@/lib/nav/config";
import { useRoles, type AppRole } from "@/hooks/use-roles";
import {
  useCustomNavRenames,
  useSidebarWidth,
  MIN_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
} from "@/lib/nav/custom-renames";
import { ThemeSwitcher, useActiveTheme, THEMES } from "@/components/global/ThemeSwitcher";
import { CustomizeNavigationDialog } from "@/components/navigation/CustomizeNavigationDialog";

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
  isChild = false,
}: {
  to: string;
  label: string;
  Icon?: React.ComponentType<{ className?: string }>;
  active: boolean;
  collapsed?: boolean;
  onNavigate?: () => void;
  isChild?: boolean;
}) {
  const link = (
    <Link
      to={to}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex flex-1 items-center gap-2.5 rounded-lg outline-none",
        "transition-all duration-150 focus-visible:ring-2 focus-visible:ring-white/40",
        collapsed
          ? "justify-center p-2"
          : isChild
            ? "py-1.5 px-2.5 text-[12.5px]"
            : "py-2 px-3 text-[13px]",
        active
          ? "bg-cyan-600 text-white font-semibold shadow-xs"
          : "text-cyan-100/80 hover:bg-white/12 hover:text-white font-medium",
      )}
    >
      {/* Luminous left accent indicator */}
      <span
        aria-hidden
        className={cn(
          "absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-cyan-300 shadow-[0_0_8px_rgba(103,232,249,0.9)] transition-opacity duration-150",
          active ? "opacity-100" : "opacity-0",
        )}
      />
      {Icon && (
        <Icon
          className={cn(
            "shrink-0 transition-all",
            isChild ? "h-3.5 w-3.5 opacity-80" : "h-4 w-4",
            active
              ? "text-white opacity-100 drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]"
              : "text-cyan-200/80 group-hover:text-white group-hover:opacity-100",
          )}
          aria-hidden
        />
      )}
      {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
    </Link>
  );

  return (
    <div className="group relative flex items-center">
      {collapsed ? (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>{link}</TooltipTrigger>
            <TooltipContent
              side="right"
              className="border-cyan-800 bg-cyan-950 text-xs text-white shadow-lg"
            >
              {label}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        link
      )}
    </div>
  );
}

/* --------------------------------------------------------------------- */
/* Nav Group Accordion Item (Zoho Books Style)                            */
/* --------------------------------------------------------------------- */
function NavGroupRow({
  group,
  isOpen,
  onToggle,
  hasActiveChild,
  isDirectActive,
  collapsed,
  onNavigate,
  checkActive,
  getLabel,
}: {
  group: ResolvedNavGroup;
  isOpen: boolean;
  onToggle: () => void;
  hasActiveChild: boolean;
  isDirectActive: boolean;
  collapsed?: boolean;
  onNavigate?: () => void;
  checkActive: (item: NavItemDef) => boolean;
  getLabel: (id: string, fallback: string) => string;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const GroupIcon = group.icon;
  const groupLabel = getLabel(group.id, t(`nav.groups.${group.id}`, group.label));

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => {
                if (group.to) {
                  void navigate({ to: group.to });
                  onNavigate?.();
                } else if (group.items[0]) {
                  void navigate({ to: group.items[0].to });
                  onNavigate?.();
                }
              }}
              aria-label={groupLabel}
              className={cn(
                "relative flex h-9 w-9 items-center justify-center rounded-lg transition-all mx-auto",
                hasActiveChild || isDirectActive
                  ? "bg-white/20 text-white border border-white/25 shadow-xs"
                  : "text-cyan-100/80 hover:bg-white/12 hover:text-white",
              )}
            >
              <GroupIcon className="h-4 w-4" aria-hidden />
              {hasActiveChild && (
                <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_4px_rgba(103,232,249,0.9)]" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            className="border-cyan-800 bg-cyan-950 p-2 text-xs text-white shadow-xl min-w-[170px]"
          >
            <div className="font-semibold text-cyan-200 border-b border-cyan-800/80 pb-1 mb-1.5 flex items-center justify-between">
              <span>{groupLabel}</span>
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = checkActive(item);
                return (
                  <Link
                    key={item.id}
                    to={item.to}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2 rounded px-2 py-1 text-[11.5px] transition-colors",
                      active
                        ? "bg-white/20 text-white font-semibold shadow-xs"
                        : "text-cyan-100/80 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    <item.icon className="h-3 w-3 shrink-0 opacity-80" />
                    <span className="truncate">
                      {getLabel(item.id, t(`nav.items.${item.id}`, item.label))}
                    </span>
                  </Link>
                );
              })}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const handleGroupClick = () => {
    if (group.items.length > 0) {
      onToggle();
    } else if (group.to) {
      void navigate({ to: group.to });
      onNavigate?.();
    }
  };

  const isStandaloneActive = isDirectActive && !hasActiveChild;

  return (
    <div className="space-y-0.5">
      <div
        className={cn(
          "group relative flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-[13px] font-semibold transition-all duration-150 cursor-pointer select-none",
          isStandaloneActive
            ? "text-white bg-cyan-600 shadow-xs"
            : hasActiveChild
              ? "text-white bg-white/15 shadow-xs border border-white/20 backdrop-blur-xs"
              : "text-cyan-100/85 hover:bg-white/10 hover:text-white",
        )}
        onClick={handleGroupClick}
        role={group.items.length > 0 ? "button" : undefined}
        aria-expanded={group.items.length > 0 ? isOpen : undefined}
      >
        {/* Luminous left accent indicator for active group */}
        {(hasActiveChild || isDirectActive) && (
          <span
            aria-hidden
            className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-cyan-300 shadow-[0_0_8px_rgba(103,232,249,0.9)]"
          />
        )}

        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <GroupIcon
            className={cn(
              "h-4 w-4 shrink-0 transition-colors",
              isStandaloneActive || hasActiveChild
                ? "text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]"
                : "text-cyan-200/80 group-hover:text-white",
            )}
            aria-hidden
          />
          <span className="truncate">{groupLabel}</span>
        </div>

        <div className="flex items-center justify-center shrink-0 ml-1">
          {group.items.length > 0 &&
            (isOpen ? (
              <Minus
                className="h-3.5 w-3.5 text-cyan-200/80 group-hover:text-white transition-colors"
                aria-hidden
              />
            ) : (
              <Plus
                className="h-3.5 w-3.5 text-cyan-200/80 group-hover:text-white transition-colors"
                aria-hidden
              />
            ))}
        </div>
      </div>

      {/* Accordion Child items */}
      {isOpen && group.items.length > 0 && (
        <div className="ml-3.5 border-l border-white/15 pl-1.5 space-y-0.5 py-0.5 my-0.5">
          {group.items.map((item) => (
            <NavLinkRow
              key={item.id}
              to={item.to}
              label={getLabel(item.id, t(`nav.items.${item.id}`, item.label))}
              Icon={item.icon}
              active={checkActive(item)}
              collapsed={collapsed}
              onNavigate={onNavigate}
              isChild
            />
          ))}
        </div>
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
  isSuperAdmin,
  userRoles = [],
  collapsed,
  scrollable = true,
}: {
  path: string;
  onNavigate?: () => void;
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  userRoles?: readonly AppRole[];
  collapsed?: boolean;
  scrollable?: boolean;
}) {
  const { t } = useTranslation();
  const { getLabel } = useCustomNavRenames();
  const { prefs } = useNavPreferences();
  const userEmail = useCurrentUserEmail();
  const resolved = useMemo(
    () => resolveNav(prefs, isAdmin, isSuperAdmin ?? false, userRoles, userEmail ?? undefined),
    [prefs, isAdmin, isSuperAdmin, userRoles, userEmail],
  );

  const checkActive = (item: NavItemDef): boolean => isNavItemActive(item, path);

  const activeGroupId = useMemo(() => {
    const activeItem = findNavItemForPath(path);
    return activeItem?.group ?? "overview";
  }, [path]);

  // Smart Accordion: keep active group open and overview open by default, toggle others
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    [activeGroupId]: true,
    overview: true,
  });

  useEffect(() => {
    if (activeGroupId) {
      setOpenGroups((prev) => ({
        ...prev,
        [activeGroupId]: true,
      }));
    }
  }, [activeGroupId]);

  const toggleGroupOpen = (gid: string): void => {
    setOpenGroups((prev) => {
      const isCurrentlyOpen = prev[gid] ?? (gid === activeGroupId || gid === "overview");
      return {
        ...prev,
        [gid]: !isCurrentlyOpen,
      };
    });
  };

  return (
    <nav
      className={cn(
        "flex-1",
        scrollable ? "overflow-y-auto overflow-x-hidden" : "overflow-visible",
        collapsed ? "px-1.5 py-2 space-y-1.5" : "px-2 py-2 space-y-1.5",
      )}
      aria-label="Primary"
    >
      {/* Primary Zoho-Style Accordion Groups */}
      {resolved.groups.map((group) => {
        if (group.items.length === 0 && group.id !== "overview" && !group.to) return null;
        const isOpen =
          openGroups[group.id] ?? (group.id === activeGroupId || group.id === "overview");
        const hasActiveChild = group.items.some((item) => checkActive(item));
        const cleanPath = path.split("?")[0];
        const cleanGroupTo = group.to?.split("?")[0];
        const isDirectActive = cleanGroupTo
          ? cleanPath === cleanGroupTo ||
            (cleanGroupTo !== "/" && cleanPath.startsWith(`${cleanGroupTo}/`))
          : false;

        return (
          <NavGroupRow
            key={group.id}
            group={group}
            isOpen={isOpen}
            onToggle={() => toggleGroupOpen(group.id)}
            hasActiveChild={hasActiveChild}
            isDirectActive={isDirectActive}
            collapsed={collapsed}
            onNavigate={onNavigate}
            checkActive={checkActive}
            getLabel={getLabel}
          />
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
  onOpenCustomizeNav,
  isAdmin,
  isSuperAdmin,
}: {
  onSignOut: () => void;
  onOpenShortcuts: () => void;
  onOpenCustomizeNav?: () => void;
  isAdmin: boolean;
  isSuperAdmin?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const { isDemo, setMode } = useDemoMode();
  const currentLang = (i18n.language?.substring(0, 2) || "en") as LangCode;
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
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?";

  const lastLoginLabel = lastLogin
    ? new Date(lastLogin).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : t("user.firstSession", "First session");

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
        {/* Solid Dark Turquoise header with identity */}
        <div className="material-sapphire relative">
          <div className="relative z-10 flex items-start gap-3 px-3.5 py-3.5">
            <Avatar className="h-10 w-10 border border-white/25 shadow-md">
              <AvatarFallback className="bg-cyan-900 text-[13px] font-bold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-[13px] font-bold text-white">
                {email || "Account"}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-sm px-1.5 py-px font-mono text-[10px] uppercase tracking-wider",
                    isSuperAdmin
                      ? "bg-white/20 text-white border border-white/40 font-bold"
                      : isAdmin
                        ? "bg-cyan-400/20 text-cyan-200 border border-cyan-400/30 font-semibold"
                        : "bg-white/10 text-cyan-100",
                  )}
                >
                  {isSuperAdmin || isAdmin ? <Shield className="h-2.5 w-2.5" aria-hidden /> : null}
                  {isSuperAdmin
                    ? t("user.role.superAdmin", "Super Admin")
                    : isAdmin
                      ? t("user.role.admin", "Admin")
                      : t("user.role.member", "Member")}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-200">
                  STOS
                </span>
              </div>
            </div>
          </div>
          <div className="relative z-10 border-t border-white/12 px-3.5 py-1.5">
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-cyan-200/80">
              <span>{t("user.lastLogin", "Last login")}</span>
              <span>{lastLoginLabel}</span>
            </div>
          </div>
        </div>

        <div className="bg-surface-card py-1">
          <DropdownMenuItem onClick={() => void navigate({ to: "/settings" })}>
            <UserIcon className="mr-2 h-4 w-4" aria-hidden />
            {t("user.profile", "Profile")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void navigate({ to: "/settings" })}>
            <SettingsIcon className="mr-2 h-4 w-4" aria-hidden />
            {t("user.preferences", "Preferences")}
          </DropdownMenuItem>
          {onOpenCustomizeNav && (
            <DropdownMenuItem onClick={onOpenCustomizeNav}>
              <Sliders className="mr-2 h-4 w-4" aria-hidden />
              {t("user.customizeNav", "Customize Tabs & Width")}
            </DropdownMenuItem>
          )}
          {isAdmin && (
            <DropdownMenuItem onSelect={() => void setMode(!isDemo)}>
              <FlaskConical
                className="mr-2 h-4 w-4 text-amber-600 dark:text-amber-400"
                aria-hidden
              />
              {isDemo
                ? t("common.liveMode", "Switch to Live Mode")
                : t("common.demoMode", "Demo Mode")}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              onOpenShortcuts();
            }}
          >
            <Keyboard className="mr-2 h-4 w-4" aria-hidden />
            {t("user.keyboardShortcuts", "Keyboard shortcuts")}
            <kbd className="ml-auto rounded border border-border-subtle bg-surface-panel px-1.5 py-0.5 font-mono text-[10px] text-text-muted">
              ?
            </kbd>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {/* Quick Language switcher */}
          <div className="px-2.5 py-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-text-muted mb-1.5">
              <Languages className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>{t("common.language", "Language / भाषा")}</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    void i18n.changeLanguage(lang.code);
                    try {
                      localStorage.setItem("stos-lang", lang.code);
                      document.documentElement.lang = lang.code;
                    } catch {
                      /* ignore */
                    }
                  }}
                  className={cn(
                    "py-1 px-1.5 rounded text-[11px] font-bold text-center transition-all border",
                    currentLang === lang.code
                      ? "bg-cyan-700 text-white border-cyan-700 shadow-xs"
                      : "bg-surface-panel text-text-primary border-border-default hover:bg-surface-elevated",
                  )}
                >
                  {lang.nativeLabel}
                </button>
              ))}
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={onSignOut}
            className="text-intent-destructive focus:text-intent-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" aria-hidden />
            {t("user.signOut", "Sign out")}
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
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.language?.substring(0, 2) || "en") as LangCode;
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isFormRoute = /\/(new|edit)(\/|$)/.test(path);
  const navigate = useNavigate();
  const uid = useCurrentUserId();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // Sprint 1.7.1, Part 6/7 — useRoles() is the single client-side source of
  const roles = useRoles();
  const isAdmin = roles.isAdmin || roles.roles.length === 0;
  const [collapsed, setCollapsed] = useSidebarCollapsed(uid);
  const activeThemeId = useActiveTheme();
  const currentTheme = THEMES.find((t) => t.id === activeThemeId) ?? THEMES[0];
  const { width: sidebarWidthPx, updateWidth: setSidebarWidth, resetWidth } = useSidebarWidth();
  const [customizeNavOpen, setCustomizeNavOpen] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (collapsed) return;
      e.preventDefault();
      setIsResizing(true);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const startX = e.clientX;
      const startWidth = sidebarWidthPx;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX;
        const newWidth = Math.max(
          MIN_SIDEBAR_WIDTH,
          Math.min(MAX_SIDEBAR_WIDTH, Math.round(startWidth + delta)),
        );
        setSidebarWidth(newWidth);
      };

      const onMouseUp = () => {
        setIsResizing(false);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [collapsed, sidebarWidthPx, setSidebarWidth],
  );

  useEffect(() => {
    trackNavVisit(path);
  }, [path]);

  const openShortcuts = useCallback((): void => {
    toast(t("shortcuts.title", "Keyboard shortcuts"), {
      description: t(
        "shortcuts.description",
        "⌘/Ctrl+K — search · ⌘/Ctrl+B — toggle sidebar · / — search · ? — help",
      ),
    });
  }, [t]);

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
        if (e.key === "?") {
          e.preventDefault();
          openShortcuts();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [collapsed, setCollapsed, openShortcuts]);

  async function onSignOut() {
    try {
      await supabase.auth.signOut();
    } finally {
      toast.success("Signed out");
      await navigate({ to: "/auth", replace: true, search: { flow: "signin" } });
    }
  }

  const showBreadcrumbs = path !== "/" && path !== "/dashboard";

  return (
    <DemoProvider>
      <div className="flex h-screen supports-[height:100dvh]:h-dvh overflow-hidden bg-surface-base">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-sm focus:bg-primary focus:px-3 focus:py-1.5 focus:text-sm focus:text-primary-foreground"
        >
          Skip to main content
        </a>

        {/*
          Enterprise layout (Phase G.11 Section 1): the shell itself is
          locked to the viewport (h-dvh + overflow-hidden) so there is no
          page-level scroll. The sidebar and the <main> content pane below
          are each an independent overflow-y-auto region — scrolling one
          never moves the other, and the header/breadcrumb/demo banner
          stay put as shrink-0 chrome instead of relying on sticky
          positioning against a scrolling ancestor.

          Sprint R0: h-dvh alone has no fallback. A browser/webview that
          doesn't recognize the dvh unit drops the whole `height` value
          (invalid, not partially applied), leaving this container with no
          explicit height at all — overflow-hidden then has nothing to
          clip, <main>'s min-h-0/overflow-y-auto lose their bounding
          height, and the entire shell (header, breadcrumb rail, demo
          banner, any fixed-position footer painted inside <main>) falls
          back to one continuous page-level scroll instead of staying
          pinned chrome around an independently-scrolling content pane —
          this is the mechanism behind the reported "footer/banner merged
          with page content" bug. h-screen (100vh, universally supported)
          is now the base value, with supports-[height:100dvh]:h-dvh
          layered on top only where the browser actually understands the
          unit — same @supports progressive-enhancement idiom already used
          for backdrop-filter on the header below and in FormActions.
        */}

        {/* Desktop sidebar — Solid Dark Turquoise with live resizable width */}
        <aside
          className={cn(
            "material-sapphire relative",
            "hidden shrink-0 flex-col border-r border-teal-950/60 text-white md:flex",
            "pt-[env(safe-area-inset-top)]",
            isResizing ? "transition-none select-none" : "transition-[width] duration-200 ease-out",
          )}
          style={{ width: collapsed ? 56 : sidebarWidthPx }}
          data-collapsed={collapsed}
        >
          {/* Draggable right-edge resizer handle */}
          {!collapsed && (
            <div
              onMouseDown={handleMouseDown}
              onDoubleClick={resetWidth}
              title="Drag to resize sidebar width · Double-click to reset (270px)"
              className="group absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400/50 active:bg-cyan-400 transition-colors z-30"
              aria-label="Resize sidebar"
              role="separator"
              aria-orientation="vertical"
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-l-full bg-cyan-300/30 group-hover:bg-cyan-300 transition-colors" />
            </div>
          )}

          <div
            className={cn(
              "relative z-10 flex h-14 shrink-0 items-center gap-2.5 border-b border-white/12",
              collapsed ? "justify-center px-0" : "px-4",
            )}
          >
            <AppMark
              size={28}
              className="h-7 w-7 shrink-0 rounded-md shadow-md shadow-teal-950/40 ring-1 ring-white/25"
            />
            {!collapsed && (
              <div className="flex min-w-0 flex-col justify-center leading-tight">
                <span className="font-display text-[15px] font-bold tracking-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
                  {t("brand.name", "STOS")}
                </span>
                <span className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-200 font-semibold">
                  {t("brand.byline", "By Vedora Vision")}
                </span>
              </div>
            )}
          </div>

          <div className="relative z-10 flex min-h-0 flex-1 flex-col">
            <NavList
              path={path}
              isAdmin={isAdmin}
              isSuperAdmin={roles.isSuperAdmin}
              userRoles={roles.roles}
              collapsed={collapsed}
            />
          </div>

          <div
            className={cn(
              "relative z-10 flex items-center border-t border-white/12 p-1.5",
              collapsed ? "justify-center" : "justify-between",
            )}
          >
            {!collapsed && (
              <div className="flex items-center gap-1.5 pl-1.5">
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setCustomizeNavOpen(true)}
                        className="flex items-center gap-1 px-1.5 py-1 rounded text-[10.5px] font-medium text-cyan-200/90 hover:bg-white/12 hover:text-white transition-colors"
                        aria-label="Customize tabs & sidebar width"
                      >
                        <Sliders className="h-3.5 w-3.5" />
                        <span>Customize</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="border-cyan-800 bg-cyan-950 text-xs text-white shadow-lg"
                    >
                      Rename tabs &amp; adjust sidebar width
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-200/60 font-semibold">
                  {currentTheme.label} · {sidebarWidthPx}px
                </span>
              </div>
            )}
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setCollapsed(!collapsed)}
                    className="rounded-md p-1.5 text-cyan-200/80 hover:bg-white/12 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
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
                <TooltipContent
                  side="right"
                  className="border-cyan-800 bg-cyan-950 text-xs text-white shadow-lg"
                >
                  {collapsed ? "Expand" : "Collapse"}
                  <span className="ml-1 opacity-60">⌘B</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </aside>

        {/* Main column: bounded to the viewport row height (min-h-0) so
            <main> below is the only scrolling region; header/breadcrumb/
            demo banner are plain shrink-0 flow items instead of sticky. */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* Topbar (48px) — fixed chrome, no longer sticky-against-scroll */}
          <header className="z-20 flex min-h-[calc(3rem+env(safe-area-inset-top,0px))] pt-[env(safe-area-inset-top,0px)] shrink-0 items-center gap-2 border-b border-border-subtle bg-surface-header/90 px-2 backdrop-blur supports-[backdrop-filter]:bg-surface-header/75 sm:px-3">
            {/* Mobile nav trigger */}
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-text-primary hover:bg-surface-panel md:hidden"
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>

              {/* Use raw Radix DialogPrimitive.Content (via SheetPortal + SheetOverlay)
                  instead of SheetContent so the dark turquoise background is not
                  overridden by SheetContent's CVA base-class bg-[var(--surface-elevated)].
                  The animation data-attributes mirror the SheetContent left-side variant. */}
              <SheetPortal>
                <SheetOverlay />
                <DialogPrimitive.Content
                  data-nav-drawer="true"
                  className={cn(
                    // Layout & sizing
                    "fixed z-50 inset-y-0 left-0 flex flex-col",
                    "h-screen supports-[height:100dvh]:h-dvh w-64",
                    // Safe-area insets
                    "pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)]",
                    // Animation (mirrors SheetContent left variant)
                    "transition ease-[var(--ease-out)]",
                    "data-[state=closed]:duration-[var(--duration-base)] data-[state=open]:duration-[var(--duration-slow)]",
                    "data-[state=open]:animate-in data-[state=closed]:animate-out",
                    "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
                    "text-white border-r-0 material-sapphire",
                  )}
                >
                  {/* Close button — white on teal */}
                  <DialogPrimitive.Close
                    aria-label="Close navigation"
                    className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-md text-white/60 transition-colors hover:bg-white/15 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                  >
                    <X className="h-4 w-4" aria-hidden />
                    <span className="sr-only">Close</span>
                  </DialogPrimitive.Close>

                  <SheetHeader className="relative z-10 h-14 flex-row items-center gap-2.5 border-b border-white/12 px-4 py-0 space-y-0">
                    <AppMark
                      size={28}
                      className="h-7 w-7 shrink-0 rounded-md ring-1 ring-white/25 shadow-md shadow-teal-950/40"
                    />
                    <SheetTitle className="font-display text-[15px] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
                      {t("brand.name", "STOS")}
                    </SheetTitle>
                  </SheetHeader>

                  <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto">
                    <NavList
                      path={path}
                      isAdmin={isAdmin}
                      isSuperAdmin={roles.isSuperAdmin}
                      userRoles={roles.roles}
                      onNavigate={() => setMobileNavOpen(false)}
                      scrollable={false}
                    />
                  </div>

                  {/* Mobile Drawer Language Switcher Bar */}
                  <div className="relative z-10 border-t border-white/12 p-3 bg-black/20 shrink-0">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-200/90 mb-2">
                      <Languages className="h-3.5 w-3.5" />
                      <span>{t("common.language", "Language / भाषा")}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => {
                            void i18n.changeLanguage(lang.code);
                            try {
                              localStorage.setItem("stos-lang", lang.code);
                              document.documentElement.lang = lang.code;
                            } catch {
                              /* ignore */
                            }
                            setMobileNavOpen(false);
                          }}
                          className={cn(
                            "py-1.5 px-2 rounded-lg text-xs font-bold text-center transition-all border",
                            currentLang === lang.code
                              ? "bg-white text-cyan-950 border-white shadow-sm"
                              : "bg-white/10 text-white border-white/20 hover:bg-white/20",
                          )}
                        >
                          {lang.nativeLabel}
                        </button>
                      ))}
                    </div>
                  </div>
                </DialogPrimitive.Content>
              </SheetPortal>
            </Sheet>

            <div className="flex items-center gap-1.5 md:hidden">
              <AppMark size={22} className="h-5.5 w-5.5 rounded" />
              <span className="font-display text-sm font-bold tracking-tight text-text-primary">
                {t("brand.name", "STOS")}
              </span>
            </div>

            {/* Search — the visual focus of the topbar. min-w-0 lets this
                flex-1 region shrink to make room for the icon cluster below
                on narrow phones instead of forcing the header to overflow
                horizontally. */}
            <div className="ml-auto flex min-w-0 flex-1 items-center md:ml-0">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className={cn(
                  "group relative hidden h-8 w-full max-w-md items-center gap-2 rounded-md",
                  "border border-border-default bg-surface-card pl-8 pr-2 text-left text-[13px] text-text-muted",
                  "transition-colors hover:border-intent-primary/40 hover:text-text-primary",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-intent-focus-ring sm:flex",
                )}
                aria-label={t("header.openSearch", "Open global search (Ctrl+K)")}
              >
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate">
                  {t("header.searchPlaceholder", "Search customers, projects, invoices…")}
                </span>
                <kbd className="ml-auto hidden rounded border border-border-subtle bg-surface-panel px-1.5 py-0.5 font-mono text-[10px] text-text-muted sm:inline">
                  ⌘K
                </kbd>
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 sm:hidden"
                onClick={() => setSearchOpen(true)}
                aria-label={t("header.openSearch", "Open global search")}
              >
                <Search className="h-4.5 w-4.5" />
              </Button>
            </div>

            {/* shrink-0: priority topbar controls. Secondary indicators
                (DemoBadge, SyncStatus) collapse to sm+ screens to preserve
                mobile header spacing while LanguageToggle remains visible across all screens. */}
            <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
              <div className="hidden sm:inline-flex">
                <DemoBadge />
              </div>

              <div className="hidden sm:inline-flex">
                <SyncStatusIndicator />
              </div>
              <div className="inline-flex items-center">
                <ThemeSwitcher />
              </div>
              <div className="inline-flex items-center">
                <LanguageToggle />
              </div>
              <NotificationsBell />
              <div className="ml-0.5 sm:ml-1">
                <UserMenu
                  onSignOut={onSignOut}
                  onOpenShortcuts={openShortcuts}
                  onOpenCustomizeNav={() => setCustomizeNavOpen(true)}
                  isAdmin={isAdmin}
                  isSuperAdmin={roles.isSuperAdmin}
                />
              </div>
            </div>
          </header>

          {/* Breadcrumb rail — quiet, single line under the topbar */}
          {showBreadcrumbs && (
            <div className="z-10 hidden shrink-0 border-b border-border-subtle bg-surface-base/85 px-4 py-1.5 backdrop-blur md:flex md:px-8">
              <Breadcrumbs />
            </div>
          )}

          <DemoBanner />

          <main
            id="main-content"
            className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full paper-texture px-2.5 sm:px-4 md:px-8 pt-2.5 sm:pt-5 md:pt-6 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          >
            {/* Single consistent content container (Sprint 1.1): every
                route previously decided its own width ad hoc, or didn't
                constrain it at all, so content could stretch full-bleed on
                an ultrawide monitor. --stos-content-max-width (styles.css)
                is the same 1400px ceiling FormActions' footer already used,
                centralized here as one token instead of a second hardcoded
                number. */}
            <div className="mx-auto w-full max-w-[var(--stos-content-max-width)] min-w-0">
              <PageTransition>{children}</PageTransition>
            </div>
          </main>

          {/* Mobile Bottom Navigation Bar — calibrated for one-thumb ergonomics and safe area insets */}
          {!isFormRoute && (
            <nav
              aria-label="Mobile navigation"
              className="fixed bottom-0 inset-x-0 z-30 flex h-[calc(3.5rem+env(safe-area-inset-bottom,0px))] items-center justify-around border-t border-border-subtle bg-surface-header/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur supports-[backdrop-filter]:bg-surface-header/80 md:hidden shadow-lg"
            >
              <Link
                to="/dashboard"
                className={cn(
                  "flex flex-1 flex-col items-center justify-center py-1 text-[11px] font-medium transition-colors",
                  path === "/" || path === "/dashboard" || path.startsWith("/dashboard/")
                    ? "text-intent-primary font-bold"
                    : "text-text-muted hover:text-text-primary",
                )}
              >
                <LayoutDashboard className="h-5 w-5 mb-0.5" />
                <span>Dashboard</span>
              </Link>
              <Link
                to="/enquiries"
                className={cn(
                  "flex flex-1 flex-col items-center justify-center py-1 text-[11px] font-medium transition-colors",
                  path.startsWith("/enquiries")
                    ? "text-intent-primary font-bold"
                    : "text-text-muted hover:text-text-primary",
                )}
              >
                <Globe className="h-5 w-5 mb-0.5" />
                <span>Leads</span>
              </Link>
              <Link
                to="/quotes"
                className={cn(
                  "flex flex-1 flex-col items-center justify-center py-1 text-[11px] font-medium transition-colors",
                  path.startsWith("/quotes")
                    ? "text-intent-primary font-bold"
                    : "text-text-muted hover:text-text-primary",
                )}
              >
                <FileText className="h-5 w-5 mb-0.5" />
                <span>Quotes</span>
              </Link>
              <Link
                to="/dispatch"
                className={cn(
                  "flex flex-1 flex-col items-center justify-center py-1 text-[11px] font-medium transition-colors",
                  path.startsWith("/dispatch")
                    ? "text-intent-primary font-bold"
                    : "text-text-muted hover:text-text-primary",
                )}
              >
                <Truck className="h-5 w-5 mb-0.5" />
                <span>Dispatch</span>
              </Link>
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                className="flex flex-1 flex-col items-center justify-center py-1 text-[11px] font-medium text-text-muted hover:text-text-primary transition-colors"
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5 mb-0.5" />
                <span>Menu</span>
              </button>
            </nav>
          )}
        </div>

        <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
        <CustomizeNavigationDialog open={customizeNavOpen} onOpenChange={setCustomizeNavOpen} />
        <Copilot />
        <DangerNotifications />
        <GrowthAdvisoryBroadcaster />
        <NotificationBanner />
      </div>
    </DemoProvider>
  );
}

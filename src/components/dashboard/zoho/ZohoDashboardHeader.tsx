import {
  ChevronDown,
  RefreshCw,
  HelpCircle,
  CheckCircle2,
  Megaphone,
  Gauge,
  ShieldAlert,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAnnouncements } from "./announcements-state";

export type DashboardViewTab = "operations" | "financial_radar" | "announcements" | "help";

export function ZohoDashboardHeader({
  activeTab,
  onTabChange,
  onRefresh,
  isRefreshing,
  showRadarTab = false,
}: {
  activeTab: DashboardViewTab;
  onTabChange: (tab: DashboardViewTab) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  showRadarTab?: boolean;
}) {
  const { t } = useTranslation();
  const { hasUnread } = useAnnouncements();
  return (
    <div className="card-3d-milky mb-4 sm:mb-6 p-3 sm:px-6 sm:py-5 w-full max-w-full overflow-hidden">
      {/* Top row: Company name + actions */}
      <div className="flex items-center justify-between gap-3 pb-3 sm:pb-4 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          {/* Stone Tech Official Logo */}
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-white/95 p-1 shadow-md shadow-primary/10 border border-border/80 ring-1 ring-primary/20">
            <img
              src="/branding/stone-tech-logo.png"
              alt="Stone Tech"
              className="h-full w-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="font-display text-base sm:text-xl font-black tracking-tight text-engraved-title">
                {t("brand.companyName", "STONE TECH")}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="engraved-well h-8 sm:h-9 gap-1.5 rounded-xl px-2.5 sm:px-3 text-xs font-bold text-engraved-blue shadow-xs transition-all hover:scale-[1.02] hover:border-primary/60"
            title={t("common.refresh", "Refresh")}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin text-primary")} />
            <span>
              {isRefreshing
                ? t("common.refreshing", "Refreshing...")
                : t("common.refresh", "Refresh")}
            </span>
          </Button>
        </div>
      </div>

      {/* Tabs Row — 3D Engraved Recessed Pill Bar */}
      <div className="engraved-well flex items-center gap-1 sm:gap-1.5 overflow-x-auto rounded-xl p-1 sm:p-1.5 text-xs sm:text-sm max-w-full">
        <button
          type="button"
          onClick={() => onTabChange("operations")}
          className={cn(
            "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 sm:px-3.5 py-1.5 font-bold transition-all shrink-0",
            activeTab === "operations"
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/30 border-t border-white/30"
              : "text-slate-600 hover:bg-white hover:text-primary",
          )}
        >
          <Gauge className="h-4 w-4" />
          <span>{t("dashboard.zoho.operationsTab", "Operations Cockpit")}</span>
        </button>

        {showRadarTab && (
          <button
            type="button"
            onClick={() => onTabChange("financial_radar")}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 sm:px-3.5 py-1.5 font-bold transition-all shrink-0 cursor-pointer",
              activeTab === "financial_radar"
                ? "bg-purple-700 text-white shadow-md shadow-purple-900/30 border-t border-white/30"
                : "text-purple-900 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40",
            )}
          >
            <ShieldAlert className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span>{t("dashboard.zoho.radarTab", "HSN & Financial Radar")}</span>
            <span className="rounded-full bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-100 px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider">
              Super Admin
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => onTabChange("announcements")}
          className={cn(
            "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 sm:px-3.5 py-1.5 font-bold transition-all shrink-0",
            activeTab === "announcements"
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/30 border-t border-white/30"
              : "text-slate-600 hover:bg-white hover:text-primary",
          )}
        >
          <Megaphone className="h-4 w-4" />
          <span>{t("dashboard.zoho.announcementsTab", "Announcements")}</span>
          {hasUnread && <span className="h-1.5 w-1.5 rounded-full bg-sidebar-ring" />}
        </button>

        <button
          type="button"
          onClick={() => onTabChange("help")}
          className={cn(
            "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 sm:px-3.5 py-1.5 font-bold transition-all shrink-0",
            activeTab === "help"
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/30 border-t border-white/30"
              : "text-slate-600 hover:bg-white hover:text-primary",
          )}
        >
          <HelpCircle className="h-4 w-4" />
          <span>{t("dashboard.zoho.helpTab", "Help")}</span>
        </button>
      </div>
    </div>
  );
}

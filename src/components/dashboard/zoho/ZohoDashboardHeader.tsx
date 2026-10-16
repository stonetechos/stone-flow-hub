import { ChevronDown, RefreshCw, HelpCircle, CheckCircle2, Megaphone, Gauge } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DashboardViewTab = "operations" | "announcements" | "help";

export function ZohoDashboardHeader({
  activeTab,
  onTabChange,
  onRefresh,
  isRefreshing,
}: {
  activeTab: DashboardViewTab;
  onTabChange: (tab: DashboardViewTab) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="card-3d-milky mb-4 sm:mb-6 p-3 sm:px-6 sm:py-5 w-full max-w-full overflow-hidden">
      {/* Top row: Company name + actions */}
      <div className="flex items-center justify-between gap-3 pb-3 sm:pb-4 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          {/* Stone Tech Official Logo */}
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-white/95 p-1 shadow-md shadow-cyan-950/20 border border-cyan-200/60 ring-1 ring-cyan-500/20">
            <img
              src="/branding/stone-tech-icon.png"
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
            <p className="font-mono text-[11px] sm:text-xs font-semibold text-engraved-kicker truncate">
              {t("dashboard.zoho.hubSubtitle", "Executive & Operational Hub")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="engraved-well h-8 sm:h-9 gap-1.5 rounded-xl px-2.5 sm:px-3 text-xs font-bold text-engraved-blue shadow-xs transition-all hover:scale-[1.02] hover:border-cyan-400"
            title={t("common.refresh", "Refresh")}
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin text-cyan-600")}
            />
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
              ? "bg-gradient-to-r from-cyan-800 to-cyan-700 text-white shadow-md shadow-cyan-800/35 border-t border-white/40"
              : "text-slate-600 hover:bg-white hover:text-cyan-800",
          )}
        >
          <Gauge className="h-4 w-4" />
          <span>{t("dashboard.zoho.operationsTab", "Operations Cockpit")}</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange("announcements")}
          className={cn(
            "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 sm:px-3.5 py-1.5 font-bold transition-all shrink-0",
            activeTab === "announcements"
              ? "bg-gradient-to-r from-cyan-800 to-cyan-700 text-white shadow-md shadow-cyan-800/35 border-t border-white/40"
              : "text-slate-600 hover:bg-white hover:text-cyan-800",
          )}
        >
          <Megaphone className="h-4 w-4" />
          <span>{t("dashboard.zoho.announcementsTab", "Announcements")}</span>
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
        </button>

        <button
          type="button"
          onClick={() => onTabChange("help")}
          className={cn(
            "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 sm:px-3.5 py-1.5 font-bold transition-all shrink-0",
            activeTab === "help"
              ? "bg-gradient-to-r from-cyan-800 to-cyan-700 text-white shadow-md shadow-cyan-800/35 border-t border-white/40"
              : "text-slate-600 hover:bg-white hover:text-cyan-800",
          )}
        >
          <HelpCircle className="h-4 w-4" />
          <span>{t("dashboard.zoho.helpTab", "Help")}</span>
        </button>
      </div>
    </div>
  );
}

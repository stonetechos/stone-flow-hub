import { ChevronDown, RefreshCw, HelpCircle, CheckCircle2, Megaphone, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DashboardViewTab = "financial" | "operations" | "announcements" | "help";

export function ZohoDashboardHeader({
  activeTab,
  onTabChange,
  onRefresh,
  isRefreshing,
  canViewFinancial = true,
}: {
  activeTab: DashboardViewTab;
  onTabChange: (tab: DashboardViewTab) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  canViewFinancial?: boolean;
}) {
  return (
    <div className="card-3d-milky mb-6 p-4 sm:px-6 sm:py-5">
      {/* Top row: Company name + actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4">
        <div className="flex items-center gap-3">
          {/* Stone Tech Logo glyph in rich sapphire blue */}
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-500 text-white shadow-md shadow-blue-500/30 border border-blue-400/40">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-lg font-black tracking-tight text-engraved-title sm:text-xl">
                STONE TECH
              </span>
              <span className="engraved-well-glow rounded-full px-2.5 py-0.5 font-mono text-[10px] font-black tracking-wide uppercase text-engraved-blue">
                Live ERP
              </span>
            </div>
            <p className="font-mono text-xs font-semibold text-engraved-kicker">
              Executive &amp; Operational Hub
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="engraved-well h-9 gap-2 rounded-xl px-3 text-xs font-bold text-engraved-blue shadow-xs transition-all hover:scale-[1.02] hover:border-blue-400"
            title="Refresh dashboard data"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin text-blue-600")}
            />
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </Button>
        </div>
      </div>

      {/* Tabs Row — 3D Engraved Recessed Pill Bar */}
      <div className="engraved-well flex items-center gap-1.5 overflow-x-auto rounded-xl p-1.5 text-xs sm:text-sm">
        {canViewFinancial && (
          <button
            type="button"
            onClick={() => onTabChange("financial")}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-1.5 font-bold transition-all",
              activeTab === "financial"
                ? "bg-gradient-to-r from-blue-700 to-blue-600 text-white shadow-md shadow-blue-600/35 border-t border-white/40"
                : "text-slate-600 hover:bg-white hover:text-blue-700",
            )}
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Financial Dashboard</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => onTabChange("operations")}
          className={cn(
            "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-1.5 font-bold transition-all",
            activeTab === "operations"
              ? "bg-gradient-to-r from-blue-700 to-blue-600 text-white shadow-md shadow-blue-600/35 border-t border-white/40"
              : "text-slate-600 hover:bg-white hover:text-blue-700",
          )}
        >
          <Gauge className="h-4 w-4" />
          <span>Operations Cockpit</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange("announcements")}
          className={cn(
            "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-1.5 font-bold transition-all",
            activeTab === "announcements"
              ? "bg-gradient-to-r from-blue-700 to-blue-600 text-white shadow-md shadow-blue-600/35 border-t border-white/40"
              : "text-slate-600 hover:bg-white hover:text-blue-700",
          )}
        >
          <Megaphone className="h-4 w-4" />
          <span>Announcements</span>
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
        </button>

        <button
          type="button"
          onClick={() => onTabChange("help")}
          className={cn(
            "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-1.5 font-bold transition-all",
            activeTab === "help"
              ? "bg-gradient-to-r from-blue-700 to-blue-600 text-white shadow-md shadow-blue-600/35 border-t border-white/40"
              : "text-slate-600 hover:bg-white hover:text-blue-700",
          )}
        >
          <HelpCircle className="h-4 w-4" />
          <span>Help</span>
        </button>
      </div>
    </div>
  );
}

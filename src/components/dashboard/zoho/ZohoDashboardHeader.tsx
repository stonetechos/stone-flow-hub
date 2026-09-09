import {
  ChevronDown,
  RefreshCw,
  Bell,
  HelpCircle,
  CheckCircle2,
  Megaphone,
  Gauge,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DashboardViewTab = "financial" | "operations" | "announcements" | "help";

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
  return (
    <div className="border-b border-border bg-card px-4 sm:px-6 pt-4 pb-0 mb-6">
      {/* Top row: Company name + actions */}
      <div className="flex items-center justify-between gap-4 pb-3">
        <div className="flex items-center gap-2">
          {/* Stone Tech Logo glyph */}
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-foreground">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          <button
            type="button"
            className="flex items-center gap-1.5 text-lg font-bold tracking-tight text-foreground hover:opacity-80 transition-opacity"
          >
            <span>STONE TECH</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            title="Refresh dashboard data"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin text-primary")} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground relative"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500" />
          </Button>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex items-center gap-6 overflow-x-auto text-sm font-medium">
        <button
          type="button"
          onClick={() => onTabChange("financial")}
          className={cn(
            "flex items-center gap-1.5 pb-2.5 border-b-2 transition-colors whitespace-nowrap",
            activeTab === "financial"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <CheckCircle2
            className={cn(
              "h-4 w-4",
              activeTab === "financial" ? "text-primary" : "text-muted-foreground",
            )}
          />
          <span>Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange("operations")}
          className={cn(
            "flex items-center gap-1.5 pb-2.5 border-b-2 transition-colors whitespace-nowrap",
            activeTab === "operations"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <Gauge className="h-4 w-4" />
          <span>Operations Cockpit</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange("announcements")}
          className={cn(
            "flex items-center gap-1.5 pb-2.5 border-b-2 transition-colors whitespace-nowrap relative",
            activeTab === "announcements"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <Megaphone className="h-4 w-4" />
          <span>Announcements</span>
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        </button>

        <button
          type="button"
          onClick={() => onTabChange("help")}
          className={cn(
            "flex items-center gap-1.5 pb-2.5 border-b-2 transition-colors whitespace-nowrap",
            activeTab === "help"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <HelpCircle className="h-4 w-4" />
          <span>Help</span>
        </button>
      </div>
    </div>
  );
}

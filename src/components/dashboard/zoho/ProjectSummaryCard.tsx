import { FolderKanban, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type ProjectSummaryData, formatInrFull } from "@/lib/dashboard/zoho-api";

export function ProjectSummaryCard({
  summary,
  isLoading,
}: {
  summary?: ProjectSummaryData;
  isLoading?: boolean;
}) {
  const total = summary?.totalProjects ?? 0;
  const active = summary?.activeProjects ?? 0;
  const completed = summary?.completedProjects ?? 0;
  const budget = summary?.totalBudget ?? 0;

  return (
    <Card className="border border-border/80 shadow-xs bg-card flex flex-col justify-between">
      <CardHeader className="p-6 pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <span className="p-1 rounded-full border border-border bg-muted text-foreground inline-flex">
              <FolderKanban className="h-3.5 w-3.5" />
            </span>
            <span>Project Summary</span>
          </CardTitle>

          <Link
            to="/projects"
            className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
          >
            <span>View All</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>

      <CardContent className="p-6 pt-3 space-y-4">
        {isLoading ? (
          <div className="h-44 flex items-center justify-center text-xs text-muted-foreground">
            Loading Projects summary…
          </div>
        ) : (
          <>
            {/* Grid of Key Project Numbers */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <div className="text-2xl font-bold text-foreground tabular-nums">{active}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Active Projects</div>
              </div>

              <div className="rounded-md border border-border bg-muted/30 p-3">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {completed}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">Completed</div>
              </div>

              <div className="rounded-md border border-border bg-muted/30 p-3">
                <div className="text-2xl font-bold text-foreground tabular-nums">{total}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Total Logged</div>
              </div>
            </div>

            {/* Total Budget Row */}
            <div className="rounded-md bg-muted/40 p-3 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Combined Active Project Budget:</span>
              <span className="font-bold text-foreground tabular-nums">
                {formatInrFull(budget)}
              </span>
            </div>

            <div className="text-[11px] text-muted-foreground">
              Tracks stone supply, fabrication progress, architectural approvals, and site
              deliveries.
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

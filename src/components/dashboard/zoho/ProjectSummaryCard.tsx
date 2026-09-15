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
    <Card className="flex flex-col justify-between rounded-2xl border border-blue-100/80 bg-white/95 shadow-[0_4px_20px_rgba(30,58,138,0.04)] backdrop-blur-xs transition-all duration-300 hover:border-blue-200 hover:shadow-[0_8px_30px_rgba(30,58,138,0.08)]">
      <CardHeader className="p-6 pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2.5 text-sm font-bold text-slate-900">
            <span className="inline-flex rounded-xl border border-blue-100 bg-blue-50 p-2 text-blue-600 shadow-xs">
              <FolderKanban className="h-4 w-4" />
            </span>
            <span>Project Portfolio</span>
          </CardTitle>

          <Link
            to="/projects"
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 transition-colors hover:text-blue-800"
          >
            <span>View All Projects</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-6 pt-3">
        {isLoading ? (
          <div className="flex h-44 items-center justify-center text-xs text-slate-400">
            Loading Projects summary…
          </div>
        ) : (
          <>
            {/* Grid of Key Project Numbers in Blue / Milky Styling */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5">
                <div className="font-display text-2xl font-black text-blue-700 tabular-nums sm:text-3xl">
                  {active}
                </div>
                <div className="mt-1 text-xs font-semibold text-blue-800">Active Sites</div>
              </div>

              <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-3.5">
                <div className="font-display text-2xl font-black text-sky-700 tabular-nums sm:text-3xl">
                  {completed}
                </div>
                <div className="mt-1 text-xs font-semibold text-sky-800">Completed</div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                <div className="font-display text-2xl font-black text-slate-800 tabular-nums sm:text-3xl">
                  {total}
                </div>
                <div className="mt-1 text-xs font-semibold text-slate-600">Total Logged</div>
              </div>
            </div>

            {/* Total Budget Box */}
            <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/80 to-indigo-50/60 p-3.5 text-xs">
              <span className="font-medium text-slate-600">Combined Project Budget:</span>
              <span className="font-display text-sm font-black text-blue-900 tabular-nums sm:text-base">
                {formatInrFull(budget)}
              </span>
            </div>

            <div className="text-[11px] text-slate-500">
              Tracks stone supply, architectural dry-lays, fabrication milestones, and on-site
              handover.
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

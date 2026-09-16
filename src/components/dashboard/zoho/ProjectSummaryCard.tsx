import { FolderKanban, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
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
    <div className="card-3d-milky flex flex-col justify-between p-6">
      <div className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-sm font-bold">
            <span className="inline-flex rounded-xl border border-blue-200 bg-blue-50 p-2 text-blue-600 shadow-xs">
              <FolderKanban className="h-4 w-4" />
            </span>
            <span className="font-display text-base font-black text-engraved-title">
              Project Portfolio
            </span>
          </div>

          <Link
            to="/projects"
            className="flex items-center gap-1 text-xs font-bold text-engraved-blue transition-colors hover:scale-105"
          >
            <span>View All Projects</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      <div className="space-y-4 pt-3">
        {isLoading ? (
          <div className="flex h-44 items-center justify-center text-xs text-slate-400">
            Loading Projects summary…
          </div>
        ) : (
          <>
            {/* Grid of Key Project Numbers in 3D Engraved Wells */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="engraved-well-glow rounded-xl p-3.5">
                <div className="font-display text-2xl font-black text-engraved-blue-lg tabular-nums sm:text-3xl">
                  {active}
                </div>
                <div className="mt-1 font-mono text-xs font-bold uppercase text-engraved-kicker">
                  Active Sites
                </div>
              </div>

              <div className="engraved-well rounded-xl p-3.5">
                <div className="font-display text-2xl font-black text-indigo-700 tabular-nums sm:text-3xl">
                  {completed}
                </div>
                <div className="mt-1 font-mono text-xs font-bold uppercase text-indigo-700">
                  Completed
                </div>
              </div>

              <div className="engraved-well rounded-xl p-3.5">
                <div className="font-display text-2xl font-black text-slate-800 tabular-nums sm:text-3xl">
                  {total}
                </div>
                <div className="mt-1 font-mono text-xs font-bold uppercase text-slate-500">
                  Total Logged
                </div>
              </div>
            </div>

            {/* Total Budget Box in Glowing Recessed Well */}
            <div className="engraved-well-glow flex items-center justify-between rounded-xl p-3.5 text-xs">
              <span className="font-mono text-xs font-bold uppercase text-slate-600">
                Combined Project Budget:
              </span>
              <span className="font-display text-sm font-black text-engraved-blue-lg tabular-nums sm:text-base">
                {formatInrFull(budget)}
              </span>
            </div>

            <div className="text-[11px] text-slate-500 italic">
              Tracks stone supply, architectural dry-lays, fabrication milestones, and on-site
              handover.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

import { FolderKanban, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { type ProjectSummaryData, formatInrFull } from "@/lib/dashboard/zoho-api";

export function ProjectSummaryCard({
  summary,
  isLoading,
}: {
  summary?: ProjectSummaryData;
  isLoading?: boolean;
}) {
  const { t } = useTranslation();
  const total = summary?.totalProjects ?? 0;
  const active = summary?.activeProjects ?? 0;
  const completed = summary?.completedProjects ?? 0;
  const budget = summary?.totalBudget ?? 0;

  return (
    <div className="card-3d-milky flex flex-col justify-between p-6">
      <div className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-sm font-bold">
            <span className="inline-flex rounded-xl border border-cyan-200 bg-cyan-50 p-2 text-cyan-700 shadow-xs">
              <FolderKanban className="h-4 w-4" />
            </span>
            <span className="font-display text-base font-black text-engraved-title">
              {t("dashboard.zoho.projectPortfolio", "Project Portfolio")}
            </span>
          </div>

          <Link
            to="/projects"
            className="flex items-center gap-1 text-xs font-bold text-engraved-blue transition-colors hover:scale-105"
          >
            <span>{t("dashboard.zoho.viewAllProjects", "View All Projects")}</span>
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
                  {t("dashboard.zoho.activeSites", "Active Sites")}
                </div>
              </div>

              <div className="engraved-well rounded-xl p-3.5">
                <div className="font-display text-2xl font-black text-indigo-700 tabular-nums sm:text-3xl">
                  {completed}
                </div>
                <div className="mt-1 font-mono text-xs font-bold uppercase text-indigo-700">
                  {t("dashboard.zoho.completed", "Completed")}
                </div>
              </div>

              <div className="engraved-well rounded-xl p-3.5">
                <div className="font-display text-2xl font-black text-slate-800 tabular-nums sm:text-3xl">
                  {total}
                </div>
                <div className="mt-1 font-mono text-xs font-bold uppercase text-slate-500">
                  {t("dashboard.zoho.totalLogged", "Total Logged")}
                </div>
              </div>
            </div>

            {/* Total Budget Box in Glowing Recessed Well */}
            <div className="engraved-well-glow flex items-center justify-between rounded-xl p-3.5 text-xs">
              <span className="font-mono text-xs font-bold uppercase text-slate-600">
                {t("dashboard.zoho.combinedProjectBudget", "Combined Project Budget:")}
              </span>
              <span className="font-display text-sm font-black text-engraved-blue-lg tabular-nums sm:text-base">
                {formatInrFull(budget)}
              </span>
            </div>

            <div className="text-[11px] text-slate-500 italic">
              {t(
                "dashboard.zoho.projectPortfolioDesc",
                "Tracks stone supply, architectural dry-lays, fabrication milestones, and on-site handover.",
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

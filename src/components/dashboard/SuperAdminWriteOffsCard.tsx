import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ShieldAlert,
  Plus,
  ArrowUpRight,
  Sparkles,
  TrendingDown,
  FileText,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatInr, formatDate } from "@/lib/format";
import { useRoles } from "@/hooks/use-roles";
import {
  getWriteOffSummary,
  listWriteOffs,
  WRITE_OFF_REASONS,
  type WriteOffReason,
} from "@/lib/write-offs/api";
import { RecordWriteOffDialog } from "@/components/write-offs/RecordWriteOffDialog";

export function SuperAdminWriteOffsCard() {
  const { t } = useTranslation();
  const roles = useRoles();
  const [writeOffModalOpen, setWriteOffModalOpen] = useState(false);

  // SuperAdmin and Admin executive visibility only
  const isAuthorized = roles.isAdmin || roles.isSuperAdmin;

  const summaryQ = useQuery({
    queryKey: ["write-offs", "summary"],
    queryFn: getWriteOffSummary,
    enabled: isAuthorized && roles.isReady,
    staleTime: 60_000,
  });

  const recentListQ = useQuery({
    queryKey: ["write-offs", "recent"],
    queryFn: () => listWriteOffs({ limit: 6 }),
    enabled: isAuthorized && roles.isReady,
    staleTime: 60_000,
  });

  if (!isAuthorized) {
    return null;
  }

  const summary = summaryQ.data;
  const recentRows = recentListQ.data ?? [];

  return (
    <>
      <Card className="shadow-2 border-red-200/70 bg-gradient-to-b from-white to-red-50/20 dark:border-red-950/60 dark:from-slate-900 dark:to-slate-950 overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-red-100/80 dark:border-red-950/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-700 shadow-xs dark:bg-red-950/80 dark:text-red-300 ring-1 ring-red-400/30">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                    SuperAdmin Audit: Customer Write-Offs & Concessions
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className="border-red-300 text-red-700 bg-red-50 text-[10px] uppercase font-bold"
                  >
                    Executive Radar
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Track and audit every rupee written off due to quality complaints, delivery
                  delays, transit damage, or settlements.
                </p>
              </div>
            </div>

            <Button
              size="sm"
              variant="destructive"
              className="gap-1.5 shadow-xs font-semibold self-start sm:self-auto"
              onClick={() => setWriteOffModalOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Record Write-Off / Concession
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* Top KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-red-200/80 bg-white/80 p-3.5 shadow-xs dark:border-red-900/50 dark:bg-slate-900/70">
              <div className="text-xs font-medium text-muted-foreground">
                Total Amount Written Off
              </div>
              <div className="mt-1 text-2xl font-black tracking-tight text-red-600 dark:text-red-400 font-mono">
                {formatInr(summary?.totalAmount ?? 0)}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                Across {summary?.count ?? 0} authorized write-off incidents
              </div>
            </div>

            <div className="rounded-xl border border-amber-200/80 bg-white/80 p-3.5 shadow-xs dark:border-amber-900/50 dark:bg-slate-900/70">
              <div className="text-xs font-medium text-muted-foreground">
                Written Off This Month
              </div>
              <div className="mt-1 text-2xl font-black tracking-tight text-amber-600 dark:text-amber-400 font-mono">
                {formatInr(summary?.thisMonthAmount ?? 0)}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                Current financial billing cycle
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white/80 p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900/70">
              <div className="text-xs font-medium text-muted-foreground">Written Off Today</div>
              <div className="mt-1 text-2xl font-black tracking-tight text-slate-800 dark:text-slate-100 font-mono">
                {formatInr(summary?.todayAmount ?? 0)}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                Immediate daily financial adjustments
              </div>
            </div>
          </div>

          {/* Reason Breakdown Pills */}
          {summary?.byReason && Object.keys(summary.byReason).length > 0 && (
            <div className="rounded-xl border bg-slate-50/70 p-3 dark:bg-slate-900/40 space-y-1.5">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Breakdown by Commercial Reason:
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(summary.byReason).map(([reasonKey, data]) => {
                  const meta =
                    WRITE_OFF_REASONS[reasonKey as WriteOffReason] || WRITE_OFF_REASONS.other;
                  return (
                    <div
                      key={reasonKey}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-2.5 py-1 text-xs shadow-2xs dark:border-slate-800 dark:bg-slate-800"
                    >
                      <span>{meta.icon}</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {meta.label}:
                      </span>
                      <span className="font-mono font-bold text-red-600 dark:text-red-400">
                        {formatInr(data.amount)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">({data.count})</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Write-Offs Table */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b dark:bg-slate-800/60">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Recent Concession &amp; Write-Off Records
              </span>
              <Link
                to="/ledger"
                className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
              >
                View Customer Ledgers <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>

            {recentRows.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No write-off entries recorded yet. Customer balances will show write-off adjustments
                here once entered.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-24">Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Remarks / Note</TableHead>
                    <TableHead className="text-right">Written Off</TableHead>
                    <TableHead className="w-20 text-right">Ledger</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentRows.map((row) => {
                    const reasonMeta =
                      WRITE_OFF_REASONS[row.reason as WriteOffReason] || WRITE_OFF_REASONS.other;
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {formatDate(row.issued_at)}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                            {row.customer_name ?? "Customer"}
                          </div>
                          {row.customer_code && (
                            <div className="font-mono text-[10px] text-muted-foreground">
                              {row.customer_code}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-semibold gap-1 ${reasonMeta.badgeClass}`}
                          >
                            <span>{reasonMeta.icon}</span>
                            <span>{reasonMeta.label}</span>
                          </Badge>
                          {row.invoice_no && (
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              Inv: {row.invoice_no}
                            </div>
                          )}
                        </TableCell>
                        <TableCell
                          className="text-xs text-muted-foreground max-w-[240px] truncate"
                          title={row.remarks || ""}
                        >
                          {row.remarks || "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-red-600 dark:text-red-400">
                          {formatInr(row.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" asChild>
                            <Link to="/ledger/$customerId" params={{ customerId: row.customer_id }}>
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      <RecordWriteOffDialog open={writeOffModalOpen} onOpenChange={setWriteOffModalOpen} />
    </>
  );
}

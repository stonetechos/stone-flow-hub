import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldAlert,
  ArrowUpRight,
  Truck,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Package,
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
import { useRoles } from "@/hooks/use-roles";
import { listQuoteChallanDiscrepancies } from "@/lib/dispatch/api";
import { cn } from "@/lib/utils";

export function SuperAdminQuoteChallanDiscrepancyCard() {
  const roles = useRoles();

  // SuperAdmin and Admin executive visibility only
  const isAuthorized = roles.isAdmin || roles.isSuperAdmin;

  const discrepanciesQ = useQuery({
    queryKey: ["dispatch", "discrepancies"],
    queryFn: listQuoteChallanDiscrepancies,
    enabled: isAuthorized && roles.isReady,
    staleTime: 45_000,
  });

  if (!isAuthorized) {
    return null;
  }

  const items = discrepanciesQ.data ?? [];
  const hasDiscrepancies = items.length > 0;

  return (
    <Card
      className={cn(
        "shadow-2 overflow-hidden transition-all",
        hasDiscrepancies
          ? "border-amber-300/80 bg-gradient-to-b from-white to-amber-50/25 dark:border-amber-950/60 dark:from-slate-900 dark:to-slate-950"
          : "border-emerald-200/60 bg-gradient-to-b from-white to-emerald-50/15 dark:border-emerald-950/40 dark:from-slate-900 dark:to-slate-950",
      )}
    >
      <CardHeader className="p-4 sm:p-5 border-b border-border/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "p-2 rounded-xl border shadow-xs shrink-0",
                hasDiscrepancies
                  ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900/60"
                  : "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900/60",
              )}
            >
              {hasDiscrepancies ? (
                <ShieldAlert className="h-5 w-5" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base sm:text-lg font-bold tracking-tight">
                  Quotation vs Delivery Challan Product Audit
                </CardTitle>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] font-mono font-bold uppercase tracking-wider",
                    hasDiscrepancies
                      ? "border-amber-500 bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 animate-pulse"
                      : "border-emerald-500 bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
                  )}
                >
                  {hasDiscrepancies
                    ? `${items.length} Flagged Variance${items.length > 1 ? "s" : ""}`
                    : "100% Matched"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {hasDiscrepancies
                  ? "Dispatched delivery challan line items differ from approved quotation specifications. Requires executive oversight."
                  : "All active delivery challans match approved quotation specifications. Zero material leakage or unapproved substitutions."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button variant="outline" size="sm" asChild className="h-8 text-xs font-semibold">
              <Link to="/dispatch">
                <Truck className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                All Dispatches
                <ArrowUpRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5">
        {discrepanciesQ.isLoading ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            Auditing active quotation & delivery challan line items…
          </div>
        ) : !hasDiscrepancies ? (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-emerald-200/80 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20 text-xs text-emerald-900 dark:text-emerald-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <div>
              <span className="font-semibold">Quotation & Delivery Challan Alignment:</span> Every
              dispatch aligns exactly with its customer quotation. Both cash deals (challan-only)
              and invoiced deals match verified yard quantities.
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-lg border border-border/80">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 text-xs">
                    <TableHead className="font-semibold">Delivery Challan</TableHead>
                    <TableHead className="font-semibold">Quotation</TableHead>
                    <TableHead className="font-semibold">Customer</TableHead>
                    <TableHead className="font-semibold">Deal Type</TableHead>
                    <TableHead className="font-semibold min-w-[280px]">
                      Discrepancies Detected
                    </TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((row) => (
                    <TableRow
                      key={row.dispatchId}
                      className="hover:bg-amber-50/30 dark:hover:bg-amber-950/10"
                    >
                      <TableCell className="font-mono text-xs font-bold">
                        <Link
                          to="/dispatch/$id"
                          params={{ id: row.dispatchId }}
                          className="text-primary hover:underline flex items-center gap-1.5"
                        >
                          <Truck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          {row.dispatchNo}
                        </Link>
                        <span className="text-[10px] text-muted-foreground font-sans font-normal block">
                          {row.dispatchDate}
                        </span>
                      </TableCell>

                      <TableCell className="font-mono text-xs">
                        <Link
                          to="/quotes/$quoteId"
                          params={{ quoteId: row.quoteId }}
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                          {row.quoteNo}
                        </Link>
                      </TableCell>

                      <TableCell className="text-xs font-medium">{row.customerName}</TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-semibold",
                            row.dealType === "cash"
                              ? "border-emerald-400 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "border-blue-400 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
                          )}
                        >
                          {row.dealType === "cash" ? "Cash Deal (Challan Only)" : "Invoiced Deal"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-xs">
                        <div className="space-y-1 py-1">
                          {row.report.variances.map((v, idx) => (
                            <div
                              key={idx}
                              className={cn(
                                "flex items-start gap-1.5 rounded p-1.5 text-[11px] leading-tight",
                                v.severity === "critical"
                                  ? "bg-rose-50 border border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-rose-200"
                                  : "bg-amber-50 border border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-900/50 dark:text-amber-200",
                              )}
                            >
                              <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold">{v.productName}: </span>
                                <span>{v.message}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            asChild
                            className="h-7 text-xs px-2.5"
                          >
                            <Link to="/dispatch/$id" params={{ id: row.dispatchId }}>
                              Review Challan
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

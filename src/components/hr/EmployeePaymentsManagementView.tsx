import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Banknote,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  MessageSquare,
  Plus,
  Search,
  Users,
  Wallet,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SkeletonTable, ErrorBlock, EmptyState } from "@/components/layout/States";
import {
  currentMonthStr,
  formatMonthLabel,
  listCompanySalaryBalances,
  type EmployeeSalaryMonthBalance,
  type EmployeePayment,
} from "@/lib/hr/employee-payments";
import { formatInr } from "@/lib/format";
import { toUserMessage } from "@/lib/errors";
import { RecordEmployeePaymentDialog } from "./RecordEmployeePaymentDialog";
import { EmployeeSalaryBalanceDrawer } from "./EmployeeSalaryBalanceDrawer";
import { openWhatsappToContact } from "@/lib/whatsapp";
import { generateEmployeePaymentWhatsAppMessage } from "@/lib/hr/employee-payments";

interface Props {
  initialEmployeeId?: string;
  embedded?: boolean;
}

export function EmployeePaymentsManagementView({ initialEmployeeId, embedded = false }: Props) {
  const currentMonth = currentMonthStr();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("balances");

  // Dialog & Drawer state
  const [recordOpen, setRecordOpen] = useState(false);
  const [selectedEmpForPayment, setSelectedEmpForPayment] = useState<string | undefined>(
    initialEmployeeId,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeDrawerBalance, setActiveDrawerBalance] = useState<EmployeeSalaryMonthBalance | null>(
    null,
  );

  // Generate selectable months (last 6 months and next 2 months)
  const monthOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    const now = new Date();
    for (let offset = -5; offset <= 2; offset++) {
      const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      options.push({ value: val, label: formatMonthLabel(val) });
    }
    return options.reverse();
  }, []);

  const summaryQ = useQuery({
    queryKey: ["hr", "salary-balances", selectedMonth],
    queryFn: () => listCompanySalaryBalances(selectedMonth),
  });

  const balances = summaryQ.data?.balances ?? [];

  // Flatten payments from all balances for the transactions tab
  const allPayments = useMemo(() => {
    const list: (EmployeePayment & { employeeName: string; employeeCode: string | null })[] = [];
    for (const b of balances) {
      for (const p of b.payments) {
        list.push({
          ...p,
          employeeName: b.employeeName,
          employeeCode: b.employeeCode,
        });
      }
    }
    return list.sort(
      (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime(),
    );
  }, [balances]);

  // Filter balances
  const filteredBalances = useMemo(() => {
    return balances.filter((b) => {
      const matchesSearch =
        !searchQuery ||
        b.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.employeeCode && b.employeeCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (b.department && b.department.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchesStatus = true;
      if (statusFilter === "pending") {
        matchesStatus = b.remainingSalaryDue > 0;
      } else if (statusFilter === "paid") {
        matchesStatus = b.status === "fully_paid" || b.status === "advance_excess";
      } else if (statusFilter === "partially_paid") {
        matchesStatus = b.status === "partially_paid";
      }

      return matchesSearch && matchesStatus;
    });
  }, [balances, searchQuery, statusFilter]);

  function handleRecordForEmployee(empId?: string) {
    setSelectedEmpForPayment(empId);
    setRecordOpen(true);
  }

  function handleOpenDrawer(b: EmployeeSalaryMonthBalance) {
    setActiveDrawerBalance(b);
    setDrawerOpen(true);
  }

  function handleWhatsAppQuick(b: EmployeeSalaryMonthBalance) {
    if (!b.phone) return;
    const msg = generateEmployeePaymentWhatsAppMessage({
      employeeName: b.employeeName,
      amount: b.totalIntermediatePaid,
      paymentType: "advance",
      paymentMethod: "Stone Tech Payroll & Advance",
      paymentDate: new Date().toISOString().slice(0, 10),
      payrollMonth: selectedMonth,
      totalPaidThisMonth: b.totalIntermediatePaid,
      remainingSalaryDue: b.remainingSalaryDue,
      notes: "Month-to-date salary & intermediate advances statement",
    });
    openWhatsappToContact(b.phone, msg);
  }

  return (
    <div className="space-y-6">
      {/* Top Header / Month Selector Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold text-muted-foreground">Cycle Month:</span>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px] h-9 font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => handleRecordForEmployee()} className="gap-1.5 shadow-sm">
            <Plus className="h-4 w-4" />
            Record Payment / Advance
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {summaryQ.isLoading ? (
        <SkeletonTable />
      ) : summaryQ.isError ? (
        <ErrorBlock message={toUserMessage(summaryQ.error)} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="shadow-sm">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                  <span>Monthly Salary Pool</span>
                  <Wallet className="h-4 w-4 text-blue-500" />
                </div>
                <div className="text-2xl font-bold tabular-nums">
                  {formatInr(summaryQ.data?.totalMonthlySalaryLiability ?? 0)}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Across {summaryQ.data?.totalActiveEmployees ?? 0} active employees
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-amber-200/80 bg-amber-50/20 dark:bg-amber-950/10 dark:border-amber-900/40">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 font-medium">
                  <span>Intermediate Paid</span>
                  <Banknote className="h-4 w-4 text-amber-600" />
                </div>
                <div className="text-2xl font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                  {formatInr(summaryQ.data?.totalIntermediatePaymentsPaid ?? 0)}
                </div>
                <div className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
                  Advances &amp; mid-month part-payments
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-emerald-200/80 bg-emerald-50/20 dark:bg-emerald-950/10 dark:border-emerald-900/40">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                  <span>Salary Due After Month Ends</span>
                  <Clock className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {formatInr(summaryQ.data?.totalSalaryRemainingToPay ?? 0)}
                </div>
                <div className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                  Balance liability for {formatMonthLabel(selectedMonth)}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                  <span>Staff Settlement Status</span>
                  <Users className="h-4 w-4 text-indigo-500" />
                </div>
                <div className="text-2xl font-bold tabular-nums">
                  {summaryQ.data?.employeesPendingCount ?? 0}{" "}
                  <span className="text-sm font-normal text-muted-foreground">pending due</span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {summaryQ.data?.employeesFullyPaidCount ?? 0} fully settled / cleared
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Account Breakdown Chips */}
          {summaryQ.data && Object.keys(summaryQ.data.byPaymentMethod).length > 0 && (
            <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg border bg-muted/30 text-xs">
              <span className="font-semibold text-muted-foreground">Disbursed by Account:</span>
              {Object.entries(summaryQ.data.byPaymentMethod).map(([account, amt]) => (
                <Badge
                  key={account}
                  variant="outline"
                  className="bg-background text-xs py-1 px-2.5 font-medium"
                >
                  <span className="text-muted-foreground mr-1.5">{account}:</span>
                  <strong className="text-foreground">{formatInr(amt)}</strong>
                </Badge>
              ))}
            </div>
          )}

          {/* Tabbed View: Balances vs Transaction Ledger */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-2">
              <TabsList className="bg-muted/60">
                <TabsTrigger value="balances" className="text-xs">
                  Salary Balances &amp; Month-End Due ({balances.length})
                </TabsTrigger>
                <TabsTrigger value="transactions" className="text-xs">
                  Payment Ledger ({allPayments.length})
                </TabsTrigger>
              </TabsList>

              {activeTab === "balances" && (
                <div className="flex items-center gap-2">
                  <div className="relative w-48 sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search employee..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-8 text-xs"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Staff</SelectItem>
                      <SelectItem value="pending">Balance Due</SelectItem>
                      <SelectItem value="partially_paid">Partially Paid</SelectItem>
                      <SelectItem value="paid">Fully Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* TAB 1: Salary Balances Table */}
            <TabsContent value="balances" className="mt-4">
              {filteredBalances.length === 0 ? (
                <EmptyState
                  title="No employee records found"
                  message="No employees match your search criteria or filter for this month."
                />
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>Employee</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead className="text-right">Base Net Salary</TableHead>
                        <TableHead className="text-right">Intermediate Paid</TableHead>
                        <TableHead className="text-right">Salary Due After Month Ends</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBalances.map((b) => (
                        <TableRow key={b.employeeId} className="hover:bg-muted/20">
                          <TableCell>
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                              {b.employeeName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {b.employeeCode || "No code"}
                              {b.phone ? ` • ${b.phone}` : ""}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {b.department || "—"}
                          </TableCell>
                          <TableCell className="text-right font-medium text-xs tabular-nums">
                            {formatInr(b.estimatedNetSalary)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-xs font-semibold text-amber-700 dark:text-amber-400">
                            {b.totalIntermediatePaid > 0 ? (
                              <button
                                onClick={() => handleOpenDrawer(b)}
                                className="underline decoration-dotted hover:text-amber-800"
                              >
                                {formatInr(b.totalIntermediatePaid)}
                              </button>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            <span
                              className={
                                b.remainingSalaryDue > 0
                                  ? "font-bold text-sm text-emerald-700 dark:text-emerald-400"
                                  : "text-muted-foreground text-xs"
                              }
                            >
                              {b.remainingSalaryDue > 0
                                ? formatInr(b.remainingSalaryDue)
                                : b.advanceExcess > 0
                                  ? `₹0 (Surplus ${formatInr(b.advanceExcess)})`
                                  : "₹0 (Cleared)"}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {b.status === "pending_full" && (
                              <Badge
                                variant="outline"
                                className="text-[11px] text-muted-foreground"
                              >
                                Pending Full
                              </Badge>
                            )}
                            {b.status === "partially_paid" && (
                              <Badge
                                variant="secondary"
                                className="text-[11px] bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300"
                              >
                                Partially Paid
                              </Badge>
                            )}
                            {b.status === "fully_paid" && (
                              <Badge variant="default" className="text-[11px] bg-emerald-600">
                                Fully Paid
                              </Badge>
                            )}
                            {b.status === "advance_excess" && (
                              <Badge
                                variant="secondary"
                                className="text-[11px] bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300"
                              >
                                Advance Surplus
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1"
                                onClick={() => handleRecordForEmployee(b.employeeId)}
                              >
                                <Plus className="h-3 w-3" /> Pay
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs gap-1"
                                onClick={() => handleOpenDrawer(b)}
                              >
                                Ledger <ArrowRight className="h-3 w-3" />
                              </Button>
                              {b.phone && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                  onClick={() => handleWhatsAppQuick(b)}
                                  title="Send voucher statement on WhatsApp"
                                >
                                  <MessageSquare className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* TAB 2: Payment Transaction History */}
            <TabsContent value="transactions" className="mt-4">
              {allPayments.length === 0 ? (
                <EmptyState
                  title="No payments recorded"
                  message={`No intermediate payments or advances have been entered for ${formatMonthLabel(selectedMonth)}.`}
                  action={
                    <Button size="sm" onClick={() => handleRecordForEmployee()} className="gap-1.5">
                      <Plus className="h-4 w-4" />
                      Record Payment
                    </Button>
                  }
                />
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>Date</TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Method / Account</TableHead>
                        <TableHead>Ref / Notes</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allPayments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-xs font-medium whitespace-nowrap">
                            {p.payment_date}
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-xs text-foreground block">
                              {p.employeeName}
                            </span>
                            {p.employeeCode && (
                              <span className="text-[11px] text-muted-foreground">
                                {p.employeeCode}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {p.payment_type.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {p.account_name || p.payment_method}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                            {p.reference_no ? `${p.reference_no} • ` : ""}
                            {p.notes || "—"}
                          </TableCell>
                          <TableCell className="text-right font-bold text-xs tabular-nums text-foreground">
                            {formatInr(p.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Record Payment Dialog */}
      <RecordEmployeePaymentDialog
        open={recordOpen}
        onOpenChange={setRecordOpen}
        defaultEmployeeId={selectedEmpForPayment}
        defaultMonth={selectedMonth}
      />

      {/* Employee Details Drawer */}
      <EmployeeSalaryBalanceDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        balance={activeDrawerBalance}
        payrollMonth={selectedMonth}
        onRecordNewPayment={(empId) => handleRecordForEmployee(empId)}
      />
    </div>
  );
}

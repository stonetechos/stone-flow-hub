/**
 * Stone Tech OS — Four-Agent AI Suite Control Centre.
 *
 * Provides executive visibility, draft preview, and explicit human approval
 * for Sales Follow-up, Purchase Follow-up, Accounting, and StoneMan Mascot.
 */

import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  Bot,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Send,
  MessageSquare,
  FileText,
  Building2,
  DollarSign,
  ShieldAlert,
  Search,
  ExternalLink,
  Edit3,
  Copy,
  Check,
  Package,
  Calendar,
  Settings,
  History,
  Play,
  Activity,
  CheckCheck,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { EmptyState, LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { cn } from "@/lib/utils";
import { toUserMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { AGENT_DEFINITIONS } from "@/lib/agents/config";
import type { AgentId, AgentTaskItem, AgentTaskPriority } from "@/lib/agents/types";
import {
  getAgentSuiteOverview,
  listAgentTasks,
  runAgentScan,
  approveAgentAction,
  rejectAgentAction,
  updateAgentDraft,
  executeApprovedAction,
  getAgentSchedulerOverview,
  updateAgentSchedulerSettings,
  triggerAllScheduledScans,
} from "@/lib/agents/agents.functions";
import type {
  AgentSchedulerStatus,
  AgentScanRecord,
  AgentSchedulerConfigUpdate,
} from "@/lib/agents/scheduler";
import { StonemanMascot } from "@/components/mascot/StonemanMascot";

export const Route = createFileRoute("/_authenticated/agent-centre")({
  component: AgentCentrePage,
});

function AgentCentrePage() {
  const qc = useQueryClient();
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingTask, setEditingTask] = useState<AgentTaskItem | null>(null);
  const [editedText, setEditedText] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const overviewQuery = useQuery({
    queryKey: ["agent-suite-overview"],
    queryFn: () => getAgentSuiteOverview(),
    refetchInterval: 20_000,
  });

  const tasksQuery = useQuery({
    queryKey: ["agent-tasks", selectedAgent, statusFilter],
    queryFn: () =>
      listAgentTasks({
        data: {
          agentId: selectedAgent === "all" ? undefined : (selectedAgent as AgentId),
          status: statusFilter,
        },
      }),
    refetchInterval: 15_000,
  });

  const scanMutation = useMutation({
    mutationFn: (agentId: AgentId) => runAgentScan({ data: { agentId } }),
    onSuccess: (res, agentId) => {
      toast.success(
        `Scanned ${res.scanned} records (${res.newTasksCount} new recommendation drafts staged)`,
      );
      void qc.invalidateQueries({ queryKey: ["agent-suite-overview"] });
      void qc.invalidateQueries({ queryKey: ["agent-tasks"] });
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const approveMutation = useMutation({
    mutationFn: (taskId: string) => approveAgentAction({ data: { taskId } }),
    onSuccess: (updated) => {
      toast.success(`Action approved! Click dispatch to trigger via WhatsApp or integration.`);
      void qc.invalidateQueries({ queryKey: ["agent-suite-overview"] });
      void qc.invalidateQueries({ queryKey: ["agent-tasks"] });
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const rejectMutation = useMutation({
    mutationFn: (taskId: string) => rejectAgentAction({ data: { taskId } }),
    onSuccess: () => {
      toast.info("Task recommendation rejected.");
      void qc.invalidateQueries({ queryKey: ["agent-suite-overview"] });
      void qc.invalidateQueries({ queryKey: ["agent-tasks"] });
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const editDraftMutation = useMutation({
    mutationFn: () =>
      updateAgentDraft({
        data: {
          taskId: editingTask!.id,
          messageText: editedText,
        },
      }),
    onSuccess: () => {
      toast.success("Draft updated! Reset to awaiting approval for security verification.");
      setEditingTask(null);
      void qc.invalidateQueries({ queryKey: ["agent-suite-overview"] });
      void qc.invalidateQueries({ queryKey: ["agent-tasks"] });
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const executeMutation = useMutation({
    mutationFn: (taskId: string) => executeApprovedAction({ data: { taskId } }),
    onSuccess: (res: {
      task: AgentTaskItem;
      dispatch: { actionUrl?: string; copyableText: string; message: string };
    }) => {
      const { dispatch } = res;
      if (dispatch.actionUrl) {
        window.open(dispatch.actionUrl, "_blank", "noopener,noreferrer");
        toast.success(dispatch.message);
      } else {
        toast.success("Action marked as executed.");
      }
      void qc.invalidateQueries({ queryKey: ["agent-suite-overview"] });
      void qc.invalidateQueries({ queryKey: ["agent-tasks"] });
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);

  const schedulerQuery = useQuery({
    queryKey: ["agent-scheduler-overview"],
    queryFn: () => getAgentSchedulerOverview(),
    refetchInterval: 15_000,
  });

  const [tempConfig, setTempConfig] = useState({
    globalEnabled: true,
    salesEnabled: true,
    salesInterval: 60,
    purchaseEnabled: true,
    purchaseInterval: 60,
    accountingEnabled: true,
    accountingInterval: 120,
  });

  const openSettings = () => {
    const cfg = schedulerQuery.data?.config;
    if (cfg) {
      setTempConfig({
        globalEnabled: cfg.globalEnabled,
        salesEnabled: cfg.agents.sales_followup.enabled,
        salesInterval: cfg.agents.sales_followup.intervalMinutes,
        purchaseEnabled: cfg.agents.purchase_followup.enabled,
        purchaseInterval: cfg.agents.purchase_followup.intervalMinutes,
        accountingEnabled: cfg.agents.accounting.enabled,
        accountingInterval: cfg.agents.accounting.intervalMinutes,
      });
    }
    setShowSettingsDialog(true);
  };

  const updateSchedulerMutation = useMutation({
    mutationFn: (updates: AgentSchedulerConfigUpdate) =>
      updateAgentSchedulerSettings({ data: updates }),
    onSuccess: () => {
      toast.success("Background scheduler configuration updated successfully!");
      setShowSettingsDialog(false);
      void qc.invalidateQueries({ queryKey: ["agent-scheduler-overview"] });
      void qc.invalidateQueries({ queryKey: ["agent-suite-overview"] });
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const runAllAutomationMutation = useMutation({
    mutationFn: () => triggerAllScheduledScans(),
    onSuccess: (res) => {
      toast.success(
        `Automated scan finished: ${res.summary.scannedCount} records checked (${res.summary.newTasksCount} new drafts staged).`,
      );
      void qc.invalidateQueries({ queryKey: ["agent-scheduler-overview"] });
      void qc.invalidateQueries({ queryKey: ["agent-suite-overview"] });
      void qc.invalidateQueries({ queryKey: ["agent-tasks"] });
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Draft copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleScanAll = async () => {
    try {
      await Promise.all([
        runAgentScan({ data: { agentId: "sales_followup" } }),
        runAgentScan({ data: { agentId: "purchase_followup" } }),
        runAgentScan({ data: { agentId: "accounting" } }),
        runAgentScan({ data: { agentId: "stoneman_customer" } }),
      ]);
      toast.success(
        "Completed full ERP scan across Sales, Purchase, Accounting, and StoneMan Desk.",
      );
      void qc.invalidateQueries({ queryKey: ["agent-suite-overview"] });
      void qc.invalidateQueries({ queryKey: ["agent-scheduler-overview"] });
      void qc.invalidateQueries({ queryKey: ["agent-tasks"] });
    } catch (e) {
      toast.error(toUserMessage(e));
    }
  };

  const tasks: AgentTaskItem[] = (tasksQuery.data as AgentTaskItem[]) ?? [];
  const overview = overviewQuery.data;
  const scheduler = schedulerQuery.data;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Agent Centre — AI Suite"
        subtitle="Independent AI workflows for Sales Follow-up, Procurement, Accounting Audit, and StoneMan Mascot with strict Zero-Outbound human approval."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={openSettings} className="gap-1.5">
              <Settings className="h-4 w-4" />
              <span>Schedule Cadence</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistoryDialog(true)}
              className="gap-1.5"
            >
              <History className="h-4 w-4" />
              <span>Scan History</span>
            </Button>
            <Button
              size="sm"
              onClick={() => runAllAutomationMutation.mutate()}
              disabled={runAllAutomationMutation.isPending || scheduler?.isLocked}
              className="gap-1.5 bg-primary text-primary-foreground"
            >
              <Play
                className={cn("h-4 w-4", runAllAutomationMutation.isPending && "animate-spin")}
              />
              <span>Run Automation Now</span>
            </Button>
          </div>
        }
      />

      {/* Background Automation Status Bar */}
      <Card className="border-primary/20 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white shadow-md overflow-hidden">
        <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              <span className="font-semibold text-sm tracking-wide text-white">
                Background Automation Status
              </span>
              {!scheduler?.config.globalEnabled && (
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] font-mono px-2 py-0.5">
                  Paused
                </Badge>
              )}
              {scheduler?.isLocked && (
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40 text-[10px] animate-pulse">
                  Scanning in progress…
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Periodic background scanning runs via authenticated cron endpoint
              (`/api/public/hooks/agent-suite-scheduler`) or staff triggers. All draft
              recommendations require explicit human dispatch.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-3 shrink-0">
            {/* Sales cadence chip */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-md px-3 py-1.5 text-xs flex flex-col">
              <span className="text-[10px] text-teal-400 font-semibold uppercase tracking-wider">
                Sales Agent
              </span>
              <span className="text-slate-200">
                {scheduler?.agents.sales_followup.enabled
                  ? `Every ${scheduler.agents.sales_followup.intervalMinutes}m`
                  : "Disabled"}
              </span>
            </div>

            {/* Purchase cadence chip */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-md px-3 py-1.5 text-xs flex flex-col">
              <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">
                Purchase Agent
              </span>
              <span className="text-slate-200">
                {scheduler?.agents.purchase_followup.enabled
                  ? `Every ${scheduler.agents.purchase_followup.intervalMinutes}m`
                  : "Disabled"}
              </span>
            </div>

            {/* Accounting cadence chip */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-md px-3 py-1.5 text-xs flex flex-col">
              <span className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">
                Accounting Agent
              </span>
              <span className="text-slate-200">
                {scheduler?.agents.accounting.enabled
                  ? `Every ${scheduler.agents.accounting.intervalMinutes}m (Review-Only)`
                  : "Disabled"}
              </span>
            </div>

            {/* StoneMan event-driven chip */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-md px-3 py-1.5 text-xs flex flex-col">
              <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
                StoneMan Mascot
              </span>
              <span className="text-slate-200">Event-Driven (Web)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Cards for the 4 Agents */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sales Follow-up */}
        <Card className="border-teal-200/70 bg-gradient-to-br from-teal-50/40 via-white to-slate-50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-lg bg-teal-100 text-teal-800">
                <MessageSquare className="h-5 w-5" />
              </span>
            </div>
            <CardTitle className="text-sm font-semibold text-slate-900 mt-2">
              Sales Follow-up Agent
            </CardTitle>
            <CardDescription className="text-xs">
              Stale quotes, enquiries & follow-ups
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold text-teal-900">
                {overview?.agents.sales_followup.pendingCount ?? 0}
              </span>
              <span className="text-xs text-muted-foreground">Pending Review</span>
            </div>
            <div className="mt-3 pt-2 border-t flex justify-between items-center text-xs">
              <span className="text-slate-500">Zero-outbound draft</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-teal-700 hover:text-teal-900 p-0"
                onClick={() => scanMutation.mutate("sales_followup")}
                disabled={scanMutation.isPending}
              >
                Scan Now →
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Purchase Follow-up */}
        <Card className="border-amber-200/70 bg-gradient-to-br from-amber-50/40 via-white to-slate-50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-lg bg-amber-100 text-amber-800">
                <Package className="h-5 w-5" />
              </span>
            </div>
            <CardTitle className="text-sm font-semibold text-slate-900 mt-2">
              Purchase Follow-up Agent
            </CardTitle>
            <CardDescription className="text-xs">
              PO confirmations & delivery due dates
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold text-amber-900">
                {overview?.agents.purchase_followup.pendingCount ?? 0}
              </span>
              <span className="text-xs text-muted-foreground">Pending Review</span>
            </div>
            <div className="mt-3 pt-2 border-t flex justify-between items-center text-xs">
              <span className="text-slate-500">Vendor commercial safe</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-amber-700 hover:text-amber-900 p-0"
                onClick={() => scanMutation.mutate("purchase_followup")}
                disabled={scanMutation.isPending}
              >
                Scan Now →
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Accounting Agent */}
        <Card className="border-indigo-200/70 bg-gradient-to-br from-indigo-50/40 via-white to-slate-50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-lg bg-indigo-100 text-indigo-800">
                <DollarSign className="h-5 w-5" />
              </span>
              <Badge variant="outline" className="text-indigo-700 border-indigo-300 bg-indigo-50">
                Review Only
              </Badge>
            </div>
            <CardTitle className="text-sm font-semibold text-slate-900 mt-2">
              Accounting Agent
            </CardTitle>
            <CardDescription className="text-xs">
              Receivables audit & reconciliation
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold text-indigo-900">
                {overview?.agents.accounting.pendingCount ?? 0}
              </span>
              <span className="text-xs text-muted-foreground">Exceptions</span>
            </div>
            <div className="mt-3 pt-2 border-t flex justify-between items-center text-xs">
              <span className="text-slate-500">No autonomous posting</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-indigo-700 hover:text-indigo-900 p-0"
                onClick={() => scanMutation.mutate("accounting")}
                disabled={scanMutation.isPending}
              >
                Scan Now →
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* StoneMan Mascot Desk */}
        <Card className="border-emerald-200/70 bg-gradient-to-br from-emerald-50/40 via-white to-slate-50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="h-8 w-8 rounded-full overflow-hidden border border-emerald-400">
                <img
                  src="/stoneman-avatar.png"
                  alt="StoneMan"
                  className="h-full w-full object-cover"
                />
              </span>
              <Badge
                variant="outline"
                className="text-emerald-700 border-emerald-300 bg-emerald-50"
              >
                Mascot Active
              </Badge>
            </div>
            <CardTitle className="text-sm font-semibold text-slate-900 mt-2">
              StoneMan Customer Assistant
            </CardTitle>
            <CardDescription className="text-xs">
              Website inquiries & verified tracking
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold text-emerald-900">
                {overview?.agents.stoneman_customer.pendingCount ?? 0}
              </span>
              <span className="text-xs text-muted-foreground">Active Desk</span>
            </div>
            <div className="mt-3 pt-2 border-t flex justify-between items-center text-xs">
              <span className="text-slate-500">Customer safe & verified</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-emerald-700 hover:text-emerald-900 p-0"
                onClick={() => scanMutation.mutate("stoneman_customer")}
                disabled={scanMutation.isPending}
              >
                Check Desk →
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs & Task List */}
      <div className="bg-white rounded-xl border shadow-2xs p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
          <Tabs value={selectedAgent} onValueChange={setSelectedAgent} className="w-full sm:w-auto">
            <TabsList className="bg-slate-100 p-1 w-full sm:w-auto">
              <TabsTrigger value="all" className="text-xs">
                All Agents ({overview?.totalPendingApproval ?? 0})
              </TabsTrigger>
              <TabsTrigger value="sales_followup" className="text-xs">
                Sales Follow-up ({overview?.agents.sales_followup.pendingCount ?? 0})
              </TabsTrigger>
              <TabsTrigger value="purchase_followup" className="text-xs">
                Purchase Follow-up ({overview?.agents.purchase_followup.pendingCount ?? 0})
              </TabsTrigger>
              <TabsTrigger value="accounting" className="text-xs">
                Accounting Review ({overview?.agents.accounting.pendingCount ?? 0})
              </TabsTrigger>
              <TabsTrigger value="stoneman_customer" className="text-xs">
                StoneMan Desk ({overview?.agents.stoneman_customer.pendingCount ?? 0})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs rounded-md border border-slate-200 px-2.5 py-1.5 bg-white text-slate-700"
            >
              <option value="all">All Statuses</option>
              <option value="awaiting_approval">Awaiting Approval</option>
              <option value="approved">Approved</option>
              <option value="executed">Executed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Task Cards */}
        {tasksQuery.isLoading ? (
          <LoadingBlock label="Loading agent recommendations..." />
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={<Sparkles className="h-8 w-8 text-slate-400" />}
            title={
              selectedAgent === "purchase_followup"
                ? "No pending purchase follow-ups"
                : selectedAgent === "sales_followup"
                  ? "No pending sales follow-ups"
                  : selectedAgent === "accounting"
                    ? "No pending accounting exceptions"
                    : selectedAgent === "stoneman_customer"
                      ? "StoneMan Customer Desk is all clear"
                      : "No pending tasks or recommendations"
            }
            message={
              selectedAgent === "purchase_followup"
                ? "Audit purchase orders for draft PO reviews, unacknowledged vendor orders, approaching delivery deadlines, or delayed shipments."
                : selectedAgent === "sales_followup"
                  ? "Audit quotations sent >3 days ago, open client enquiries, or scheduled follow-ups."
                  : selectedAgent === "accounting"
                    ? "Audit overdue customer receivables and unallocated ledger receipts."
                    : selectedAgent === "stoneman_customer"
                      ? "StoneMan is online 24/7 assisting website visitors. Customer complaints, delivery queries, and verification requests appear here for staff action."
                      : "Click 'Run Scan Now' to audit quotations, purchase orders, deliveries, and ledger balances across the ERP."
            }
            action={
              <Button
                size="sm"
                onClick={() => {
                  if (selectedAgent === "all") {
                    void handleScanAll();
                  } else {
                    scanMutation.mutate(selectedAgent as AgentId);
                  }
                }}
                disabled={scanMutation.isPending}
              >
                <RefreshCw
                  className={cn("mr-1.5 h-3.5 w-3.5", scanMutation.isPending && "animate-spin")}
                />
                {selectedAgent === "purchase_followup"
                  ? "Run Purchase Scan Now"
                  : selectedAgent === "sales_followup"
                    ? "Run Sales Scan Now"
                    : selectedAgent === "accounting"
                      ? "Run Accounting Audit Now"
                      : selectedAgent === "stoneman_customer"
                        ? "Check Customer Desk Now"
                        : "Run Scan Now"}
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const def = AGENT_DEFINITIONS[task.agentId];
              const isApproved = task.status === "approved";
              const isAwaiting = task.status === "awaiting_approval";
              const isExecuted = task.status === "executed";
              const isRejected = task.status === "rejected";

              return (
                <div
                  key={task.id}
                  className={cn(
                    "rounded-lg border p-4 transition-all space-y-3 bg-white",
                    task.priority === "urgent" && "border-rose-200/80 bg-rose-50/20",
                    task.priority === "high" && "border-amber-200/80 bg-amber-50/15",
                    isExecuted && "opacity-75 bg-slate-50/60",
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={cn("text-xs font-medium border", def.badgeTone)}>
                        {def.name}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] uppercase font-semibold",
                          task.priority === "urgent" && "bg-rose-100 text-rose-800 border-rose-300",
                          task.priority === "high" &&
                            "bg-amber-100 text-amber-800 border-amber-300",
                          task.priority === "medium" && "bg-sky-100 text-sky-800 border-sky-300",
                          task.priority === "low" && "bg-slate-100 text-slate-700 border-slate-300",
                        )}
                      >
                        {task.priority}
                      </Badge>
                      <Badge
                        className={cn(
                          "text-[11px] font-medium border",
                          isAwaiting && "bg-amber-50 text-amber-800 border-amber-200",
                          isApproved && "bg-emerald-50 text-emerald-800 border-emerald-200",
                          isExecuted && "bg-slate-100 text-slate-700 border-slate-300",
                          isRejected && "bg-rose-50 text-rose-700 border-rose-200",
                        )}
                      >
                        {isAwaiting && "⏳ Awaiting Human Approval"}
                        {isApproved && "✓ Approved (Ready to Dispatch)"}
                        {isExecuted && "✓ Executed"}
                        {isRejected && "✕ Rejected"}
                      </Badge>
                    </div>

                    <span className="text-xs text-muted-foreground font-mono">
                      {formatDate(task.createdAt)}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">{task.title}</h4>
                    <p className="text-xs text-slate-600 mt-1">{task.draft.reason}</p>
                  </div>

                  {/* Proposed Draft Preview */}
                  <div className="rounded-md bg-slate-50 border p-3 text-xs space-y-2">
                    <div className="flex items-center justify-between text-muted-foreground font-medium">
                      <span>
                        Channel:{" "}
                        <strong className="text-slate-900 uppercase">
                          {task.draft.channel.replace("_", " ")}
                        </strong>{" "}
                        · Recipient:{" "}
                        <strong className="text-slate-900">{task.draft.recipientName}</strong>
                        {task.draft.recipientContact && ` (${task.draft.recipientContact})`}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[11px] gap-1"
                        onClick={() => handleCopy(task.draft.messageText, task.id)}
                      >
                        {copiedId === task.id ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-600" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" /> Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="font-mono text-slate-800 whitespace-pre-wrap bg-white p-2.5 rounded border border-slate-200/80 leading-relaxed">
                      {task.draft.messageText}
                    </p>
                  </div>

                  {/* Controls / Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t">
                    <div className="text-[11px] text-muted-foreground">
                      Ref:{" "}
                      <span className="font-mono font-medium text-slate-800">
                        {task.draft.referenceEntity.title || task.draft.referenceEntity.code}
                      </span>
                      {task.approvedBy && " · Approved by authorized staff"}
                    </div>

                    <div className="flex items-center gap-2">
                      {isAwaiting && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => {
                              setEditingTask(task);
                              setEditedText(task.draft.messageText);
                            }}
                          >
                            <Edit3 className="mr-1 h-3 w-3" /> Edit Draft
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs text-rose-700 hover:bg-rose-50 border-rose-200"
                            onClick={() => rejectMutation.mutate(task.id)}
                            disabled={rejectMutation.isPending}
                          >
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => approveMutation.mutate(task.id)}
                            disabled={approveMutation.isPending}
                          >
                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Approve Action
                          </Button>
                        </>
                      )}

                      {isApproved && (
                        <>
                          {task.agentId === "accounting" ? (
                            <Button
                              size="sm"
                              className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                              onClick={() => executeMutation.mutate(task.id)}
                              disabled={executeMutation.isPending}
                            >
                              Mark Exception Reviewed
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => executeMutation.mutate(task.id)}
                              disabled={executeMutation.isPending}
                            >
                              <Send className="mr-1.5 h-3.5 w-3.5" />
                              {task.draft.channel === "whatsapp"
                                ? "Open in WhatsApp to Send"
                                : "Dispatch Approved Action"}
                            </Button>
                          )}
                        </>
                      )}

                      {isExecuted && (
                        <span className="text-xs text-emerald-700 font-medium inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Handed off for human dispatch
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Draft Dialog */}
      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Draft Message</DialogTitle>
            <DialogDescription>
              Editing this draft will automatically invalidate previous approvals and require
              re-approval before execution to ensure strict security.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Textarea
              rows={6}
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="text-xs font-mono"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditingTask(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => editDraftMutation.mutate()}
              disabled={editDraftMutation.isPending || !editedText.trim()}
            >
              Save & Stage for Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Cadence Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              <span>Background Automation Cadence</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure autonomous scanning intervals. StoneMan Mascot is strictly event-driven and
              exempt from background jobs.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Global toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg border bg-slate-50/70">
              <div className="space-y-0.5">
                <span className="font-semibold text-slate-900 block">Master Automation Switch</span>
                <span className="text-muted-foreground text-[11px]">
                  Enables scheduled cron execution across internal agents
                </span>
              </div>
              <Switch
                checked={tempConfig.globalEnabled}
                onCheckedChange={(checked) =>
                  setTempConfig((prev) => ({ ...prev, globalEnabled: checked }))
                }
              />
            </div>

            {/* Sales Follow-up */}
            <div className="p-3 rounded-lg border space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-teal-800">Sales Follow-up Agent</span>
                <Switch
                  checked={tempConfig.salesEnabled}
                  onCheckedChange={(checked) =>
                    setTempConfig((prev) => ({ ...prev, salesEnabled: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-3 text-muted-foreground pt-1">
                <span>Scan Interval (minutes):</span>
                <Input
                  type="number"
                  min={10}
                  max={1440}
                  value={tempConfig.salesInterval}
                  onChange={(e) =>
                    setTempConfig((prev) => ({
                      ...prev,
                      salesInterval: Math.max(10, Number(e.target.value) || 60),
                    }))
                  }
                  className="w-24 h-8 text-xs text-right font-mono"
                  disabled={!tempConfig.salesEnabled}
                />
              </div>
            </div>

            {/* Purchase Follow-up */}
            <div className="p-3 rounded-lg border space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-amber-800">Purchase Follow-up Agent</span>
                <Switch
                  checked={tempConfig.purchaseEnabled}
                  onCheckedChange={(checked) =>
                    setTempConfig((prev) => ({ ...prev, purchaseEnabled: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-3 text-muted-foreground pt-1">
                <span>Scan Interval (minutes):</span>
                <Input
                  type="number"
                  min={10}
                  max={1440}
                  value={tempConfig.purchaseInterval}
                  onChange={(e) =>
                    setTempConfig((prev) => ({
                      ...prev,
                      purchaseInterval: Math.max(10, Number(e.target.value) || 60),
                    }))
                  }
                  className="w-24 h-8 text-xs text-right font-mono"
                  disabled={!tempConfig.purchaseEnabled}
                />
              </div>
            </div>

            {/* Accounting Agent */}
            <div className="p-3 rounded-lg border space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-blue-800">Accounting Agent (Review-Only)</span>
                <Switch
                  checked={tempConfig.accountingEnabled}
                  onCheckedChange={(checked) =>
                    setTempConfig((prev) => ({ ...prev, accountingEnabled: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-3 text-muted-foreground pt-1">
                <span>Scan Interval (minutes):</span>
                <Input
                  type="number"
                  min={15}
                  max={1440}
                  value={tempConfig.accountingInterval}
                  onChange={(e) =>
                    setTempConfig((prev) => ({
                      ...prev,
                      accountingInterval: Math.max(15, Number(e.target.value) || 120),
                    }))
                  }
                  className="w-24 h-8 text-xs text-right font-mono"
                  disabled={!tempConfig.accountingEnabled}
                />
              </div>
            </div>

            <div className="rounded bg-amber-50 border border-amber-200 p-2.5 text-[11px] text-amber-900 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                <strong>Zero-Outbound Rule Enforced:</strong> Scheduled agents stage drafts and
                recommendations only. Outbound messages are never sent autonomously.
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowSettingsDialog(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() =>
                updateSchedulerMutation.mutate({
                  globalEnabled: tempConfig.globalEnabled,
                  agents: {
                    sales_followup: {
                      enabled: tempConfig.salesEnabled,
                      intervalMinutes: tempConfig.salesInterval,
                    },
                    purchase_followup: {
                      enabled: tempConfig.purchaseEnabled,
                      intervalMinutes: tempConfig.purchaseInterval,
                    },
                    accounting: {
                      enabled: tempConfig.accountingEnabled,
                      intervalMinutes: tempConfig.accountingInterval,
                    },
                  },
                })
              }
              disabled={updateSchedulerMutation.isPending}
            >
              Save Cadence Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Execution History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <span>Background Automation Execution History</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Audit log of recent automated and manual agent scans.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1">
            {!scheduler?.recentHistory || scheduler.recentHistory.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No background execution records logged yet. Run an automated scan to begin tracking.
              </div>
            ) : (
              scheduler.recentHistory.map((rec) => (
                <div
                  key={rec.scanId}
                  className="p-3 rounded-lg border text-xs bg-slate-50/50 flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "capitalize text-[10px] font-mono",
                          rec.status === "success" &&
                            "bg-emerald-50 text-emerald-700 border-emerald-300",
                          rec.status === "failed" && "bg-rose-50 text-rose-700 border-rose-300",
                          rec.status === "skipped" && "bg-amber-50 text-amber-700 border-amber-300",
                        )}
                      >
                        {rec.status}
                      </Badge>
                      <span className="font-semibold text-slate-800">
                        {rec.agentId.replace("_", " ").toUpperCase()}
                      </span>
                      <span className="text-[11px] text-muted-foreground capitalize">
                        via {rec.triggeredBy}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {formatDate(rec.startedAt)} ({rec.durationMs}ms)
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-600">
                    <span>
                      Scanned Records: <strong>{rec.scannedCount}</strong> · Staged Drafts:{" "}
                      <strong>{rec.newTasksCount}</strong>
                    </span>
                    {rec.nextScheduledRunAt && (
                      <span className="text-muted-foreground">
                        Next Run: {formatDate(rec.nextScheduledRunAt)}
                      </span>
                    )}
                  </div>

                  {rec.errorMessage && (
                    <p className="text-[11px] text-rose-600 bg-rose-50 p-2 rounded border border-rose-200 font-mono">
                      {rec.errorMessage}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button size="sm" onClick={() => setShowHistoryDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

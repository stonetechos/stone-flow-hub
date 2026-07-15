import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  FileText,
  ShoppingCart,
  Package,
  Truck,
  Receipt,
  Pencil,
  FolderOpen,
  History,
  ClipboardList,
  Send,
  CalendarClock,
  UserPlus,
  Upload,
  StickyNote,
  BadgeCheck,
  Wallet,
  Users,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { useRoles } from "@/hooks/use-roles";
import { TransferOwnershipDialog } from "@/components/ownership/TransferOwnershipDialog";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { GuidedNextStep } from "@/components/guided-workflow/GuidedNextStep";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { getProject } from "@/lib/projects/api";
import { hub } from "@/lib/hubs/api";
import { RelatedList, InfoGrid, PlaceholderTab } from "@/components/entity/RelatedList";
import { NotesPanel, AttachmentsPanel } from "@/components/entity/DetailPanels";
import { BusinessTimeline } from "@/components/timeline/BusinessTimeline";
import { useProjectTimeline } from "@/lib/timeline/hooks";
import { DetailActionBar } from "@/components/entity/DetailActionBar";
import { LEAD_STAGE_LABEL } from "@/lib/constants";
import { formatInr } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ProjectFinancials } from "@/components/projects/ProjectFinancials";

export const Route = createFileRoute("/_authenticated/projects/$projectId")({
  ssr: false,
  component: ProjectHub,
});

function ProjectHub() {
  const { projectId } = Route.useParams();
  const [tab, setTab] = useState("overview");
  const roles = useRoles();
  const canTransfer = roles.isAdmin || roles.isSalesManager;
  const [transferOpen, setTransferOpen] = useState(false);
  const q = useQuery({
    queryKey: qk.projects.byId(projectId),
    queryFn: () => getProject(projectId),
  });
  if (q.isLoading) return <LoadingBlock />;
  if (q.error) return <ErrorBlock message={toUserMessage(q.error)} onRetry={() => q.refetch()} />;
  if (!q.data) return <ErrorBlock message="Project not found." />;
  const p = q.data;

  return (
    <div>
      <div className="mb-2 flex items-center gap-3">
        <Link
          to="/projects"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Back to projects
        </Link>
        {p.customer && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            <Link
              to="/customers/$customerId"
              params={{ customerId: p.customer.id }}
              className="hover:text-foreground"
            >
              {p.customer.name}
            </Link>
          </span>
        )}
      </div>
      <PageHeader
        title={p.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs">{p.project_code}</span>
            <Badge variant="outline">{LEAD_STAGE_LABEL[p.stage]}</Badge>
            <Badge variant="secondary" className="capitalize">
              {p.project_type}
            </Badge>
            {p.city && <span className="text-xs text-muted-foreground">· {p.city}</span>}
          </span>
        }
        actions={
          <DetailActionBar
            pin={{ entityType: "project", entityId: projectId, label: p.name }}
            primary={
              <>
                <Link to="/enquiries">
                  <Button size="sm">
                    <ClipboardList className="mr-2 h-4 w-4" /> New enquiry
                  </Button>
                </Link>
                <Link to="/followups">
                  <Button variant="outline" size="sm">
                    <CalendarClock className="mr-2 h-4 w-4" /> New follow-up
                  </Button>
                </Link>
                <Link to="/quotes" search={{ new: "1", project: p.id }}>
                  <Button variant="outline" size="sm">
                    <FileText className="mr-2 h-4 w-4" /> New quote
                  </Button>
                </Link>
                <Button variant="outline" size="sm" onClick={() => setTab("files")}>
                  <Upload className="mr-2 h-4 w-4" /> Upload files
                </Button>
                <Link to="/projects" search={{ edit: projectId }}>
                  <Button variant="ghost" size="sm">
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </Button>
                </Link>
              </>
            }
            overflow={[
              {
                label: "Add notes",
                icon: <StickyNote className="h-4 w-4" />,
                onSelect: () => setTab("notes"),
              },
              {
                label: "View timeline",
                icon: <History className="h-4 w-4" />,
                onSelect: () => setTab("timeline"),
              },
              {
                label: "Documents",
                icon: <FolderOpen className="h-4 w-4" />,
                onSelect: () => setTab("documents"),
              },
              {
                label: "New vendor",
                icon: <UserPlus className="h-4 w-4" />,
                href: "/vendors",
                separatorBefore: true,
              },
              {
                label: "New sales order",
                icon: <ShoppingCart className="h-4 w-4" />,
                href: `/sales-orders/new?project=${p.id}${p.customer ? `&customer=${p.customer.id}` : ""}`,
              },
              {
                label: "New purchase order",
                icon: <Package className="h-4 w-4" />,
                href: `/purchase-orders/new?project=${p.id}`,
              },
              {
                label: "New dispatch",
                icon: <Truck className="h-4 w-4" />,
                href: "/dispatch/new",
              },
              {
                label: "New invoice",
                icon: <Receipt className="h-4 w-4" />,
                href: "/invoices/new",
              },
              ...(canTransfer && p.customer_id
                ? [
                    {
                      label: "Transfer ownership",
                      icon: <UserCheck className="h-4 w-4" />,
                      onSelect: () => setTransferOpen(true),
                      separatorBefore: true,
                    },
                  ]
                : []),
            ]}
          />
        }
      />

      <GuidedNextStep
        entity="project"
        entityId={projectId}
        ctx={{ customer_id: p.customer_id, project_id: projectId }}
      />

      {canTransfer && p.customer_id && (
        <TransferOwnershipDialog
          open={transferOpen}
          onOpenChange={setTransferOpen}
          sourceType="project"
          sourceId={projectId}
          sourceLabel={p.name}
          fromCustomerId={p.customer_id}
        />
      )}


      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="enquiries">Enquiries</TabsTrigger>
          <TabsTrigger value="rfqs">RFQs & Quotes</TabsTrigger>
          <TabsTrigger value="followups">Follow-ups</TabsTrigger>
          <TabsTrigger value="visits">Site Visits</TabsTrigger>
          <TabsTrigger value="quotes">Quotations</TabsTrigger>
          <TabsTrigger value="sales">Sales Orders</TabsTrigger>
          <TabsTrigger value="po">Purchase Orders</TabsTrigger>
          <TabsTrigger value="dispatch">Dispatch</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <ProjectFinancials projectId={projectId} />
          <ProjectOverview
            projectId={projectId}
            project={p}
            onJumpToTab={(t) => setTab(t)}
          />
        </TabsContent>

        <TabsContent value="enquiries" className="mt-4">
          <RelatedList
            title="Enquiries"
            queryKey={["hub", "project", projectId, "enquiries"]}
            queryFn={() => hub.projectEnquiries(projectId)}
            linkFor={(r) => ({ to: "/enquiries/$enquiryId", params: { enquiryId: r.id } })}
            columns={[
              {
                header: "No.",
                cell: (r) => <span className="font-mono text-xs">{r.enquiry_no}</span>,
              },
              { header: "Stage", cell: (r) => <Badge variant="outline">{r.stage}</Badge> },
              { header: "Priority", cell: (r) => r.priority },
              { header: "Created", cell: (r) => new Date(r.created_at).toLocaleDateString() },
            ]}
          />
        </TabsContent>

        <TabsContent value="rfqs" className="mt-4">
          <RfqsAndQuotesPanel projectId={projectId} />
        </TabsContent>

        <TabsContent value="followups" className="mt-4">
          <RelatedList
            title="Follow-ups"
            queryKey={["hub", "project", projectId, "followups"]}
            queryFn={() => hub.projectFollowups(projectId)}
            columns={[
              {
                header: "When",
                cell: (r) => new Date(r.scheduled_at).toLocaleString(),
              },
              { header: "Channel", cell: (r) => r.channel },
              { header: "Status", cell: (r) => <Badge variant="outline">{r.status}</Badge> },
              {
                header: "Notes",
                cell: (r) => (
                  <span className="line-clamp-1 max-w-[280px] text-xs text-muted-foreground">
                    {r.notes ?? "—"}
                  </span>
                ),
              },
            ]}
          />
        </TabsContent>

        <TabsContent value="visits" className="mt-4">
          <RelatedList
            title="Site Visits"
            queryKey={["hub", "project", projectId, "visits"]}
            queryFn={() => hub.projectSiteVisits(projectId)}
            columns={[
              {
                header: "Scheduled",
                cell: (r) =>
                  r.scheduled_at ? new Date(r.scheduled_at).toLocaleString() : "—",
              },
              {
                header: "Conducted",
                cell: (r) =>
                  r.conducted_at ? new Date(r.conducted_at).toLocaleString() : "—",
              },
              { header: "Status", cell: (r) => <Badge variant="outline">{r.status}</Badge> },
              {
                header: "Summary",
                cell: (r) => (
                  <span className="line-clamp-1 max-w-[320px] text-xs text-muted-foreground">
                    {r.summary ?? "—"}
                  </span>
                ),
              },
            ]}

          />
        </TabsContent>

        <TabsContent value="quotes" className="mt-4">
          <RelatedList
            title="Quotations"
            queryKey={qk.quotes.byProject(projectId)}
            queryFn={() => hub.projectQuotes(projectId)}
            linkFor={(r) => ({ to: "/quotes/$quoteId", params: { quoteId: r.id } })}
            columns={[
              {
                header: "No.",
                cell: (r) => <span className="font-mono text-xs">{r.quote_no}</span>,
              },
              { header: "Status", cell: (r) => <Badge variant="outline">{r.status}</Badge> },
              { header: "Total", cell: (r) => formatInr(r.total) },
            ]}
          />
        </TabsContent>

        <TabsContent value="sales" className="mt-4">
          <RelatedList
            title="Sales Orders"
            queryKey={["hub", "project", projectId, "sales"]}
            queryFn={() => hub.projectSalesOrders(projectId)}
            linkFor={(r) => ({ to: "/sales-orders/$id", params: { id: r.id } })}
            columns={[
              { header: "No.", cell: (r) => <span className="font-mono text-xs">{r.so_no}</span> },
              { header: "Status", cell: (r) => <Badge variant="outline">{r.status}</Badge> },
              { header: "Order date", cell: (r) => r.order_date ?? "—" },
            ]}
          />
        </TabsContent>

        <TabsContent value="po" className="mt-4">
          <RelatedList
            title="Purchase Orders"
            queryKey={["hub", "project", projectId, "po"]}
            queryFn={() => hub.projectPurchaseOrders(projectId)}
            linkFor={(r) => ({ to: "/purchase-orders/$id", params: { id: r.id } })}
            columns={[
              { header: "No.", cell: (r) => <span className="font-mono text-xs">{r.po_no}</span> },
              { header: "Status", cell: (r) => <Badge variant="outline">{r.status}</Badge> },
              { header: "Order date", cell: (r) => r.order_date ?? "—" },
            ]}
          />
        </TabsContent>

        <TabsContent value="dispatch" className="mt-4">
          <RelatedList
            title="Dispatches"
            queryKey={["hub", "project", projectId, "dispatch"]}
            queryFn={() => hub.projectDispatches(projectId)}
            linkFor={(r) => ({ to: "/dispatch/$id", params: { id: r.id } })}
            columns={[
              {
                header: "No.",
                cell: (r) => <span className="font-mono text-xs">{r.dispatch_no}</span>,
              },
              { header: "Sales order", cell: (r) => r.sales_order?.so_no ?? "—" },
              { header: "Status", cell: (r) => <Badge variant="outline">{r.status}</Badge> },
              { header: "Date", cell: (r) => r.dispatch_date ?? "—" },
            ]}
          />
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <RelatedList
            title="Invoices"
            queryKey={qk.invoices.byProject(projectId)}
            queryFn={() => hub.projectInvoices(projectId)}
            linkFor={(r) => ({ to: "/invoices/$invoiceId", params: { invoiceId: r.id } })}
            columns={[
              {
                header: "No.",
                cell: (r) => <span className="font-mono text-xs">{r.invoice_no}</span>,
              },
              { header: "Status", cell: (r) => <Badge variant="outline">{r.status}</Badge> },
              { header: "Total", cell: (r) => formatInr(r.total) },
              { header: "Balance", cell: (r) => formatInr(r.balance_due) },
            ]}
          />
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <RelatedList
            title="Payments"
            queryKey={["hub", "project", projectId, "payments"]}
            queryFn={() => hub.projectPayments(projectId)}
            columns={[
              {
                header: "No.",
                cell: (r) => <span className="font-mono text-xs">{r.payment_no}</span>,
              },
              { header: "Invoice", cell: (r) => r.invoice?.invoice_no ?? "—" },
              { header: "Amount", cell: (r) => formatInr(r.amount) },
              { header: "Method", cell: (r) => r.method },
            ]}
          />
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <AttachmentsPanel entityType="project_document" entityId={projectId} />
        </TabsContent>
        <TabsContent value="timeline" className="mt-4">
          <ProjectTimelineTab projectId={projectId} />
        </TabsContent>
        <TabsContent value="notes" className="mt-4">
          <NotesPanel
            table="projects"
            id={projectId}
            value={p.notes}
            invalidateKey={qk.projects.byId(projectId)}
          />
        </TabsContent>
        <TabsContent value="files" className="mt-4">
          <AttachmentsPanel entityType="project" entityId={projectId} />
        </TabsContent>
        <TabsContent value="photos" className="mt-4">
          <AttachmentsPanel entityType="project_photo" entityId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Phase G.10 — full Business Timeline for this project: enquiries,
 *  quotations, sales orders, purchase orders, invoices, dispatches,
 *  installations, follow-ups, completed tasks and the project's own
 *  activity log, unioned and sorted chronologically by the shared
 *  lib/timeline engine. Answers "summarize this project's history"
 *  directly on the project page itself. */
function ProjectTimelineTab({ projectId }: { projectId: string }) {
  const timelineQ = useProjectTimeline(projectId);
  return (
    <BusinessTimeline
      events={timelineQ.data}
      isLoading={timelineQ.isLoading}
      error={timelineQ.error}
      onRetry={() => timelineQ.refetch()}
      emptyTitle="No history yet"
      emptyMessage="Enquiries, quotations, orders, purchase orders, invoices and follow-ups for this project will appear here as they happen."
    />
  );
}

function ProjectOverview({
  projectId,
  project,
  onJumpToTab,
}: {
  projectId: string;
  project: NonNullable<Awaited<ReturnType<typeof getProject>>>;
  onJumpToTab: (tab: string) => void;
}) {
  const summary = useQuery({
    queryKey: ["hub", "project", projectId, "summary"],
    queryFn: () => hub.projectSummary(projectId),
  });

  const s = summary.data;
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Left: quick facts + counts */}
      <Card className="shadow-1 md:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Project at a glance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <InfoGrid
            items={[
              { label: "Customer", value: project.customer?.name ?? "—" },
              { label: "Type", value: project.project_type },
              { label: "City", value: project.city },
              { label: "State", value: project.state },
              { label: "Expected value", value: formatInr(project.expected_value_inr) },
              { label: "Expected start", value: project.expected_start_date },
              { label: "Expected completion", value: project.expected_completion_date },
              { label: "Site address", value: project.site_address },
            ]}
          />

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <MiniStat
              label="Enquiries"
              value={s?.counts.enquiries ?? "—"}
              icon={<ClipboardList className="h-3.5 w-3.5" />}
              onClick={() => onJumpToTab("enquiries")}
            />
            <MiniStat
              label="Quotes"
              value={s?.counts.quotes ?? "—"}
              icon={<FileText className="h-3.5 w-3.5" />}
              onClick={() => onJumpToTab("quotes")}
            />
            <MiniStat
              label="POs"
              value={s?.counts.purchaseOrders ?? "—"}
              icon={<Package className="h-3.5 w-3.5" />}
              onClick={() => onJumpToTab("po")}
            />
            <MiniStat
              label="Dispatches"
              value={s?.counts.dispatches ?? "—"}
              icon={<Truck className="h-3.5 w-3.5" />}
              onClick={() => onJumpToTab("dispatch")}
            />
            <MiniStat
              label="Invoices"
              value={s?.counts.invoices ?? "—"}
              icon={<Receipt className="h-3.5 w-3.5" />}
              onClick={() => onJumpToTab("invoices")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Right column: financial + next follow-up + approved vendors */}
      <div className="space-y-4">
        <Card className="shadow-1">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Wallet className="h-4 w-4 text-primary" /> Financial summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 pt-0 text-sm">
            <Line label="Invoiced" value={formatInr(s?.financials.invoiced ?? 0)} />
            <Line label="Collected" value={formatInr(s?.financials.collected ?? 0)} tone="ok" />
            <Line
              label="Outstanding"
              value={formatInr(s?.financials.outstanding ?? 0)}
              tone={s && s.financials.outstanding > 0 ? "warn" : "muted"}
            />
          </CardContent>
        </Card>

        <Card className="shadow-1">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CalendarClock className="h-4 w-4 text-primary" /> Next follow-up
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm">
            {s?.nextFollowup ? (
              <div>
                <div className="font-medium">
                  {new Date(s.nextFollowup.scheduled_at).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </div>
                <div className="text-xs text-muted-foreground">
                  {s.nextFollowup.channel} ·{" "}
                  <span className="font-mono">
                    {s.nextFollowup.enquiry?.enquiry_no ?? "—"}
                  </span>
                </div>
                {s.nextFollowup.notes && (
                  <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {s.nextFollowup.notes}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No pending follow-ups.</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-1">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <BadgeCheck className="h-4 w-4 text-success" /> Approved vendors
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm">
            {(s?.approvedVendors ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No vendors approved yet. Compare quotes on the RFQs & Quotes tab.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {s!.approvedVendors.map((v) => (
                  <li key={v.quoteId} className="flex items-center justify-between text-sm">
                    <div className="min-w-0">
                      {v.vendor ? (
                        <Link
                          to="/vendors/$vendorId"
                          params={{ vendorId: v.vendor.id }}
                          className="block truncate font-medium text-primary hover:underline"
                        >
                          {v.vendor.company_name}
                        </Link>
                      ) : (
                        <span className="block truncate">Vendor</span>
                      )}
                      {v.rfq && (
                        <span className="ml-2 font-mono text-xs text-muted-foreground">
                          {v.rfq.rfq_no}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-semibold tabular-nums">
                      {formatInr(v.totalInr)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RfqsAndQuotesPanel({ projectId }: { projectId: string }) {
  const q = useQuery({
    queryKey: ["hub", "project", projectId, "rfqs"],
    queryFn: () => hub.projectRfqs(projectId),
  });
  if (q.isLoading) return <LoadingBlock />;
  if (q.error) return <ErrorBlock message={toUserMessage(q.error)} onRetry={() => q.refetch()} />;
  const rows = q.data ?? [];
  if (rows.length === 0) {
    return (
      <PlaceholderTab message="No RFQs raised yet. Open any enquiry on this project and send an RFQ." />
    );
  }
  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const submitted = r.vendor_requests.filter((vr) =>
          vr.vendor_quotes.some((vq) => !!vq.submitted_at),
        ).length;
        const approved = r.vendor_requests.filter((vr) =>
          vr.vendor_quotes.some((vq) => vq.is_approved),
        ).length;
        return (
          <Card key={r.id} className="shadow-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="min-w-0">
                <CardTitle className="text-sm">
                  <span className="font-mono">{r.rfq_no}</span>
                  <Badge variant="outline" className="ml-2 text-[10px] capitalize">
                    {r.status}
                  </Badge>
                </CardTitle>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {r.vendor_requests.length} vendor{r.vendor_requests.length === 1 ? "" : "s"} ·{" "}
                  {submitted} submitted · {approved} approved
                  {r.due_date ? ` · due ${r.due_date}` : ""}
                </div>
              </div>
              <Link to="/rfqs/$rfqId" params={{ rfqId: r.id }}>
                <Button size="sm" variant="outline">
                  <Sparkles className="mr-2 h-3.5 w-3.5" /> Compare quotes
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="grid gap-1 sm:grid-cols-2">
                {r.vendor_requests.map((vr) => {
                  const q = vr.vendor_quotes.find((x) => !!x.submitted_at) ?? vr.vendor_quotes[0];
                  const state = q?.is_approved
                    ? "approved"
                    : q?.rejected_at
                      ? "rejected"
                      : q?.submitted_at
                        ? "submitted"
                        : "pending";
                  return (
                    <li
                      key={vr.id}
                      className="flex items-center justify-between rounded-md border border-border/60 bg-card px-2 py-1.5 text-sm"
                    >
                      <div className="min-w-0">
                        {vr.vendor ? (
                          <Link
                            to="/vendors/$vendorId"
                            params={{ vendorId: vr.vendor.id }}
                            className="block truncate font-medium hover:text-primary"
                          >
                            {vr.vendor.company_name}
                          </Link>
                        ) : (
                          "Vendor"
                        )}
                        <div className="text-[11px] text-muted-foreground">
                          {q?.total_inr != null ? `₹${formatInr(q.total_inr)}` : "—"}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] capitalize",
                          state === "approved" && "border-success text-success",
                          state === "rejected" && "border-destructive/60 text-destructive",
                          state === "submitted" && "border-primary/60 text-primary",
                        )}
                      >
                        {state}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon,
  onClick,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-border bg-card px-2 py-2 text-left transition-shadow hover:shadow-2"
    >
      <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-0.5 font-display text-lg font-bold text-foreground">{value}</div>
    </button>
  );
}

function Line({
  label,
  value,
  tone = "muted",
}: {
  label: string;
  value: string;
  tone?: "muted" | "ok" | "warn";
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-semibold tabular-nums",
          tone === "ok" && "text-success",
          tone === "warn" && "text-warning",
        )}
      >
        {value}
      </span>
    </div>
  );
}

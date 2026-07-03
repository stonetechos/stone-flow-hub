import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileText, ShoppingCart, Package, Truck, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { getProject } from "@/lib/projects/api";
import { hub } from "@/lib/hubs/api";
import { RelatedList, InfoGrid, PlaceholderTab } from "@/components/entity/RelatedList";
import { NotesPanel, AttachmentsPanel, TimelinePanel } from "@/components/entity/DetailPanels";
import { LEAD_STAGE_LABEL } from "@/lib/constants";
import { formatInr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/projects/$projectId")({
  ssr: false,
  component: ProjectHub,
});

function ProjectHub() {
  const { projectId } = Route.useParams();
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
      <div className="mb-2">
        <Link
          to="/projects"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Back to projects
        </Link>
      </div>
      <PageHeader
        title={p.name}
        subtitle={
          <span className="flex items-center gap-2">
            <span className="font-mono text-xs">{p.project_code}</span>
            <Badge variant="outline">{LEAD_STAGE_LABEL[p.stage]}</Badge>
            <Badge variant="secondary" className="capitalize">
              {p.project_type}
            </Badge>
          </span>
        }
      />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="customer">Customer</TabsTrigger>
          <TabsTrigger value="enquiries">Enquiries</TabsTrigger>
          <TabsTrigger value="quotes">Quotations</TabsTrigger>
          <TabsTrigger value="sales">Sales Orders</TabsTrigger>
          <TabsTrigger value="po">Purchase Orders</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="dispatch">Dispatch</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="status">Status</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card className="shadow-1">
            <CardHeader>
              <CardTitle className="text-sm">Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <InfoGrid
                items={[
                  { label: "Name", value: p.name },
                  { label: "Code", value: <span className="font-mono">{p.project_code}</span> },
                  { label: "Type", value: p.project_type },
                  { label: "Stage", value: LEAD_STAGE_LABEL[p.stage] },
                  { label: "City", value: p.city },
                  { label: "State", value: p.state },
                  { label: "Site address", value: p.site_address },
                  { label: "Expected value", value: formatInr(p.expected_value_inr) },
                  { label: "Expected start", value: p.expected_start_date },
                  { label: "Expected completion", value: p.expected_completion_date },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customer" className="mt-4">
          <Card className="shadow-1">
            <CardHeader>
              <CardTitle className="text-sm">Customer</CardTitle>
            </CardHeader>
            <CardContent>
              {p.customer ? (
                <div className="flex flex-col gap-2">
                  <Link
                    to="/customers/$customerId"
                    params={{ customerId: p.customer.id }}
                    className="text-primary hover:underline"
                  >
                    {p.customer.name}{" "}
                    <span className="ml-2 font-mono text-xs text-muted-foreground">
                      {p.customer.customer_code}
                    </span>
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No customer linked.</p>
              )}
            </CardContent>
          </Card>
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

        <TabsContent value="inventory" className="mt-4">
          <PlaceholderTab message="Inventory is tracked per product. Open a product hub to view stock movements linked to this project." />
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
          <TimelinePanel entityType="project" entityId={projectId} />
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
        <TabsContent value="status" className="mt-4">
          <Card className="shadow-1">
            <CardHeader>
              <CardTitle className="text-sm">Project Status</CardTitle>
            </CardHeader>
            <CardContent>
              <InfoGrid
                items={[
                  {
                    label: "Stage",
                    value: <Badge variant="outline">{LEAD_STAGE_LABEL[p.stage]}</Badge>,
                  },
                  {
                    label: "Workflow",
                    value: p.workflow_state ? JSON.stringify(p.workflow_state) : "—",
                  },
                  { label: "Active", value: p.is_active ? "Yes" : "No" },
                  { label: "Created", value: new Date(p.created_at).toLocaleString() },
                  { label: "Updated", value: new Date(p.updated_at).toLocaleString() },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

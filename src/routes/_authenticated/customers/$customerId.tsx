import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  Users,
  ClipboardList,
  FolderPlus,
  Pencil,
  FileText,
  Phone,
  MessageCircle,
  Mail,
  FolderOpen,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { getCustomer } from "@/lib/customers/api";
import { hub } from "@/lib/hubs/api";
import { RelatedList, InfoGrid, PlaceholderTab } from "@/components/entity/RelatedList";
import { NotesPanel, AttachmentsPanel, TimelinePanel } from "@/components/entity/DetailPanels";
import { DetailActionBar } from "@/components/entity/DetailActionBar";
import { formatInr } from "@/lib/format";
import { CustomerPaymentCentre } from "@/components/customer-payments/CustomerPaymentCentre";

export const Route = createFileRoute("/_authenticated/customers/$customerId")({
  ssr: false,
  component: CustomerHub,
});

function CustomerHub() {
  const { customerId } = Route.useParams();
  const [tab, setTab] = useState("overview");
  const q = useQuery({
    queryKey: qk.customers.byId(customerId),
    queryFn: () => getCustomer(customerId),
  });
  const stats = useQuery({
    queryKey: ["hub", "customer", customerId, "stats"],
    queryFn: () => hub.customerStats(customerId),
  });

  if (q.isLoading) return <LoadingBlock />;
  if (q.error) return <ErrorBlock message={toUserMessage(q.error)} onRetry={() => q.refetch()} />;
  if (!q.data) return <ErrorBlock message="Customer not found." />;
  const c = q.data;

  const phone = c.primary_phone ?? "";
  const wa = c.whatsapp ?? c.primary_phone ?? "";
  const email = c.primary_email ?? "";
  const waDigits = wa.replace(/[^0-9]/g, "");

  return (
    <div>
      <div className="mb-2">
        <Link
          to="/customers"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Back to customers
        </Link>
      </div>
      <PageHeader
        title={c.name}
        subtitle={
          <span className="flex items-center gap-2">
            <span className="font-mono text-xs">{c.customer_code}</span>
            <Badge variant="secondary" className="capitalize">
              {c.customer_type.replace("_", " ")}
            </Badge>
          </span>
        }
        actions={
          <DetailActionBar
            pin={{ entityType: "customer", entityId: customerId, label: c.name }}
            primary={
              <>
                <Link to="/customers" search={{ edit: customerId }}>
                  <Button size="sm">
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </Button>
                </Link>
                <Link to="/enquiries">
                  <Button variant="outline" size="sm">
                    <ClipboardList className="mr-2 h-4 w-4" /> New enquiry
                  </Button>
                </Link>
                <Link to="/projects">
                  <Button variant="outline" size="sm">
                    <FolderPlus className="mr-2 h-4 w-4" /> New project
                  </Button>
                </Link>
                <Link to="/quotes" search={{ new: "1" }}>
                  <Button variant="outline" size="sm">
                    <FileText className="mr-2 h-4 w-4" /> New quote
                  </Button>
                </Link>
              </>
            }
            overflow={[
              ...(phone
                ? [
                    {
                      label: `Call ${phone}`,
                      icon: <Phone className="h-4 w-4" />,
                      href: `tel:${phone}`,
                    },
                  ]
                : []),
              ...(waDigits
                ? [
                    {
                      label: "WhatsApp",
                      icon: <MessageCircle className="h-4 w-4" />,
                      href: `https://wa.me/${waDigits}`,
                    },
                  ]
                : []),
              ...(email
                ? [{ label: "Email", icon: <Mail className="h-4 w-4" />, href: `mailto:${email}` }]
                : []),
              {
                label: "Documents",
                icon: <FolderOpen className="h-4 w-4" />,
                onSelect: () => setTab("documents"),
                separatorBefore: true,
              },
              {
                label: "Timeline",
                icon: <History className="h-4 w-4" />,
                onSelect: () => setTab("timeline"),
              },
            ]}
          />
        }
      />

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="enquiries">Enquiries</TabsTrigger>
          <TabsTrigger value="quotes">Quotations</TabsTrigger>
          <TabsTrigger value="sales">Sales Orders</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="attachments">Attachments</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="addresses">Addresses</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card className="shadow-1">
            <CardHeader>
              <CardTitle className="text-sm">Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <InfoGrid
                items={[
                  { label: "Name", value: c.name },
                  { label: "Code", value: <span className="font-mono">{c.customer_code}</span> },
                  { label: "Type", value: c.customer_type },
                  { label: "Mobile", value: c.primary_phone },
                  { label: "Email", value: c.primary_email },
                  { label: "WhatsApp", value: c.whatsapp },
                  { label: "City", value: c.city },
                  { label: "State", value: c.state },
                  { label: "GST", value: c.gst_number },
                  { label: "Source", value: c.source },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="mt-4">
          <RelatedList
            title="Projects"
            queryKey={qk.projects.byCustomer(customerId)}
            queryFn={() => hub.customerProjects(customerId)}
            linkFor={(r) => ({ to: "/projects/$projectId", params: { projectId: r.id } })}
            columns={[
              {
                header: "Code",
                cell: (r) => <span className="font-mono text-xs">{r.project_code}</span>,
              },
              { header: "Name", cell: (r) => r.name },
              { header: "City", cell: (r) => r.city ?? "—" },
              {
                header: "Type",
                cell: (r) => (
                  <Badge variant="secondary" className="capitalize">
                    {r.project_type}
                  </Badge>
                ),
              },
            ]}
          />
        </TabsContent>

        <TabsContent value="enquiries" className="mt-4">
          <RelatedList
            title="Enquiries"
            queryKey={["hub", "customer", customerId, "enquiries"]}
            queryFn={() => hub.customerEnquiries(customerId)}
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
            queryKey={["hub", "customer", customerId, "quotes"]}
            queryFn={() => hub.customerQuotes(customerId)}
            linkFor={(r) => ({ to: "/quotes/$quoteId", params: { quoteId: r.id } })}
            columns={[
              {
                header: "No.",
                cell: (r) => <span className="font-mono text-xs">{r.quote_no}</span>,
              },
              { header: "Status", cell: (r) => <Badge variant="outline">{r.status}</Badge> },
              { header: "Total", cell: (r) => formatInr(r.total) },
              {
                header: "Date",
                cell: (r) => r.issue_date ?? new Date(r.created_at).toLocaleDateString(),
              },
            ]}
          />
        </TabsContent>

        <TabsContent value="sales" className="mt-4">
          <RelatedList
            title="Sales Orders"
            queryKey={["hub", "customer", customerId, "sales_orders"]}
            queryFn={() => hub.customerSalesOrders(customerId)}
            linkFor={(r) => ({ to: "/sales-orders/$id", params: { id: r.id } })}
            columns={[
              { header: "No.", cell: (r) => <span className="font-mono text-xs">{r.so_no}</span> },
              { header: "Status", cell: (r) => <Badge variant="outline">{r.status}</Badge> },
              { header: "Order date", cell: (r) => r.order_date ?? "—" },
              { header: "Delivery", cell: (r) => r.delivery_date ?? "—" },
            ]}
          />
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <RelatedList
            title="Invoices"
            queryKey={["hub", "customer", customerId, "invoices"]}
            queryFn={() => hub.customerInvoices(customerId)}
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

        <TabsContent value="payments" className="mt-4 space-y-4">
          <CustomerPaymentCentre
            customerId={customerId}
            defaultTo={{ email: c.primary_email, whatsapp: c.whatsapp ?? c.primary_phone }}
          />
          <RelatedList
            title="Receipts &amp; payments"
            queryKey={["hub", "customer", customerId, "payments"]}
            queryFn={() => hub.customerPayments(customerId)}
            columns={[
              {
                header: "No.",
                cell: (r) => <span className="font-mono text-xs">{r.payment_no}</span>,
              },
              { header: "Invoice", cell: (r) => r.invoice?.invoice_no ?? "—" },
              { header: "Amount", cell: (r) => formatInr(r.amount) },
              { header: "Method", cell: (r) => r.method },
              { header: "Paid at", cell: (r) => new Date(r.paid_at).toLocaleString() },
            ]}
          />
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <AttachmentsPanel entityType="customer_document" entityId={customerId} />
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <TimelinePanel entityType="customer" entityId={customerId} />
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <NotesPanel
            table="customers"
            id={customerId}
            value={c.notes}
            invalidateKey={qk.customers.byId(customerId)}
          />
        </TabsContent>

        <TabsContent value="attachments" className="mt-4">
          <AttachmentsPanel entityType="customer" entityId={customerId} />
        </TabsContent>

        <TabsContent value="contacts" className="mt-4">
          <RelatedList
            title="Contacts"
            queryKey={["hub", "customer", customerId, "contacts"]}
            queryFn={() => hub.customerContacts(customerId)}
            emptyMessage="No contacts recorded."
            columns={[
              { header: "Name", cell: (r) => r.name },
              { header: "Designation", cell: (r) => r.designation ?? "—" },
              { header: "Phone", cell: (r) => r.phone ?? "—" },
              { header: "Email", cell: (r) => r.email ?? "—" },
              {
                header: "Primary",
                cell: (r) => (r.is_primary ? <Badge variant="secondary">Primary</Badge> : "—"),
              },
            ]}
          />
        </TabsContent>

        <TabsContent value="addresses" className="mt-4">
          <Card className="shadow-1">
            <CardHeader>
              <CardTitle className="text-sm">Addresses</CardTitle>
            </CardHeader>
            <CardContent>
              <InfoGrid
                items={[
                  { label: "Billing address", value: c.billing_address ?? "—" },
                  { label: "City", value: c.city },
                  { label: "State", value: c.state },
                  { label: "Pincode", value: c.pincode },
                  { label: "Country", value: c.country },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="mt-4">
          {stats.isLoading ? (
            <LoadingBlock />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Projects", value: stats.data?.projects ?? 0 },
                { label: "Enquiries", value: stats.data?.enquiries ?? 0 },
                { label: "Quotations", value: stats.data?.quotes ?? 0 },
                { label: "Invoices", value: stats.data?.invoices ?? 0 },
              ].map((s) => (
                <Card key={s.label} className="shadow-1">
                  <CardContent className="py-4">
                    <div className="text-xs uppercase text-muted-foreground">{s.label}</div>
                    <div className="mt-1 text-2xl font-semibold">{s.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {stats.isError && <PlaceholderTab message="Stats unavailable" />}
      <span className="hidden">
        <Users />
      </span>
    </div>
  );
}

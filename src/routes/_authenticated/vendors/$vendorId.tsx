import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  Pencil,
  Package,
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
import { getVendor, getPrimaryContact } from "@/lib/vendors/api";
import { hub } from "@/lib/hubs/api";
import { RelatedList, InfoGrid, PlaceholderTab } from "@/components/entity/RelatedList";
import { NotesPanel, AttachmentsPanel, TimelinePanel } from "@/components/entity/DetailPanels";
import { DetailActionBar } from "@/components/entity/DetailActionBar";

export const Route = createFileRoute("/_authenticated/vendors/$vendorId")({
  ssr: false,
  component: VendorHub,
});

function VendorHub() {
  const { vendorId } = Route.useParams();
  const [tab, setTab] = useState("overview");
  const q = useQuery({ queryKey: qk.vendors.byId(vendorId), queryFn: () => getVendor(vendorId) });
  const contact = useQuery({
    queryKey: ["vendor", vendorId, "primaryContact"],
    queryFn: () => getPrimaryContact(vendorId),
  });
  if (q.isLoading) return <LoadingBlock />;
  if (q.error) return <ErrorBlock message={toUserMessage(q.error)} onRetry={() => q.refetch()} />;
  if (!q.data) return <ErrorBlock message="Vendor not found." />;
  const v = q.data;

  const phone = contact.data?.phone ?? "";
  const email = contact.data?.email ?? "";
  const waDigits = phone.replace(/[^0-9]/g, "");

  return (
    <div>
      <div className="mb-2">
        <Link
          to="/vendors"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Back to vendors
        </Link>
      </div>
      <PageHeader
        title={v.company_name}
        subtitle={
          <span className="flex items-center gap-2">
            <span className="font-mono text-xs">{v.vendor_code}</span>
            {v.city && <Badge variant="secondary">{v.city}</Badge>}
          </span>
        }
        actions={
          <DetailActionBar
            pin={{ entityType: "vendor", entityId: vendorId, label: v.company_name }}
            primary={
              <>
                <Link to="/vendors" search={{ edit: vendorId }}>
                  <Button size="sm">
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </Button>
                </Link>
                <Link to="/purchase-orders/new" search={{ vendor: vendorId }}>
                  <Button variant="outline" size="sm">
                    <Package className="mr-2 h-4 w-4" /> New PO
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
          <TabsTrigger value="po">Purchase Orders</TabsTrigger>
          <TabsTrigger value="products">Products Supplied</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="attachments">Attachments</TabsTrigger>
          <TabsTrigger value="contacts">Contact Persons</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card className="shadow-1">
            <CardHeader>
              <CardTitle className="text-sm">Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <InfoGrid
                items={[
                  { label: "Company", value: v.company_name },
                  { label: "Code", value: <span className="font-mono">{v.vendor_code}</span> },
                  { label: "City", value: v.city },
                  { label: "State", value: v.state },
                  { label: "Address", value: v.address },
                  { label: "GST", value: v.gst_number },
                  { label: "PAN", value: v.pan },
                  { label: "Payment terms", value: v.payment_terms },
                  { label: "Lead time (days)", value: v.lead_time_days },
                  { label: "Rating", value: v.rating },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="po" className="mt-4">
          <RelatedList
            title="Purchase Orders"
            queryKey={["hub", "vendor", vendorId, "po"]}
            queryFn={() => hub.vendorPurchaseOrders(vendorId)}
            linkFor={(r) => ({ to: "/purchase-orders/$id", params: { id: r.id } })}
            columns={[
              { header: "No.", cell: (r) => <span className="font-mono text-xs">{r.po_no}</span> },
              { header: "Status", cell: (r) => <Badge variant="outline">{r.status}</Badge> },
              { header: "Order date", cell: (r) => r.order_date ?? "—" },
              { header: "Expected", cell: (r) => r.expected_date ?? "—" },
            ]}
          />
        </TabsContent>

        <TabsContent value="products" className="mt-4">
          <RelatedList
            title="Products Supplied"
            queryKey={["hub", "vendor", vendorId, "products"]}
            queryFn={async () =>
              (await hub.vendorProducts(vendorId)).map((r) => ({ ...r, id: r.product_id }))
            }
            linkFor={(r) =>
              r.product ? { to: "/products/$productId", params: { productId: r.product.id } } : null
            }
            columns={[
              { header: "Product", cell: (r) => r.product?.name ?? "—" },
              {
                header: "Code",
                cell: (r) => (
                  <span className="font-mono text-xs">{r.product?.product_code ?? "—"}</span>
                ),
              },
              { header: "Stone", cell: (r) => r.product?.stone_type ?? "—" },
              { header: "Unit", cell: (r) => r.product?.default_unit ?? "—" },
            ]}
          />
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <PlaceholderTab message="Vendor bills will appear here once vendor invoicing is enabled." />
        </TabsContent>
        <TabsContent value="payments" className="mt-4">
          <PlaceholderTab message="Vendor payments will appear here once vendor payouts are enabled." />
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <AttachmentsPanel entityType="vendor_document" entityId={vendorId} />
        </TabsContent>
        <TabsContent value="timeline" className="mt-4">
          <TimelinePanel entityType="vendor" entityId={vendorId} />
        </TabsContent>
        <TabsContent value="notes" className="mt-4">
          <NotesPanel
            table="vendors"
            id={vendorId}
            value={v.notes}
            invalidateKey={qk.vendors.byId(vendorId)}
          />
        </TabsContent>
        <TabsContent value="attachments" className="mt-4">
          <AttachmentsPanel entityType="vendor" entityId={vendorId} />
        </TabsContent>

        <TabsContent value="contacts" className="mt-4">
          <RelatedList
            title="Contact Persons"
            queryKey={["hub", "vendor", vendorId, "contacts"]}
            queryFn={() => hub.vendorContacts(vendorId)}
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
      </Tabs>
    </div>
  );
}

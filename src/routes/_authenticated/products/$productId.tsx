import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Pencil, FolderOpen, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { getProduct } from "@/lib/products/api";
import { hub } from "@/lib/hubs/api";
import { RelatedList, InfoGrid, PlaceholderTab } from "@/components/entity/RelatedList";
import { NotesPanel, AttachmentsPanel, TimelinePanel } from "@/components/entity/DetailPanels";
import { DetailActionBar } from "@/components/entity/DetailActionBar";
import { formatInr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/products/$productId")({
  ssr: false,
  component: ProductHub,
});

function ProductHub() {
  const { productId } = Route.useParams();
  const [tab, setTab] = useState("overview");
  const q = useQuery({
    queryKey: ["products", "byId", productId],
    queryFn: () => getProduct(productId),
  });
  if (q.isLoading) return <LoadingBlock />;
  if (q.error) return <ErrorBlock message={toUserMessage(q.error)} onRetry={() => q.refetch()} />;
  if (!q.data) return <ErrorBlock message="Product not found." />;
  const p = q.data;

  return (
    <div>
      <div className="mb-2">
        <Link
          to="/products"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Back to products
        </Link>
      </div>
      <PageHeader
        title={p.name}
        subtitle={
          <span className="flex items-center gap-2">
            <span className="font-mono text-xs">{p.product_code}</span>
            <Badge variant="secondary" className="capitalize">
              {p.stone_type}
            </Badge>
          </span>
        }
        actions={
          <DetailActionBar
            pin={{ entityType: "product", entityId: productId, label: p.name }}
            primary={
              <Link to="/products" search={{ edit: productId }}>
                <Button size="sm">
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Button>
              </Link>
            }
            overflow={[
              {
                label: "Documents",
                icon: <FolderOpen className="h-4 w-4" />,
                onSelect: () => setTab("documents"),
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
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="purchase">Purchase History</TabsTrigger>
          <TabsTrigger value="sales">Sales History</TabsTrigger>
          <TabsTrigger value="projects">Projects Used In</TabsTrigger>
          <TabsTrigger value="quotes">Quotations</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="specs">Specifications</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
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
                  { label: "Code", value: <span className="font-mono">{p.product_code}</span> },
                  { label: "Stone type", value: p.stone_type },
                  { label: "Finish", value: p.finish },
                  { label: "Default unit", value: p.default_unit },
                  { label: "Thickness (mm)", value: p.thickness_mm },
                  { label: "Origin", value: p.origin_country },
                  { label: "HSN", value: p.hsn_code },
                ]}
              />
              {p.description && (
                <p className="mt-3 text-sm text-muted-foreground">{p.description}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="mt-4">
          <RelatedList
            title="Inventory"
            queryKey={["hub", "product", productId, "inventory"]}
            queryFn={() => hub.productInventory(productId)}
            linkFor={(r) => ({ to: "/inventory/$id", params: { id: r.id } })}
            columns={[
              {
                header: "Stock code",
                cell: (r) => <span className="font-mono text-xs">{r.stock_code}</span>,
              },
              { header: "Location", cell: (r) => r.location ?? "—" },
              { header: "On hand", cell: (r) => `${r.quantity_on_hand} ${r.unit}` },
              { header: "Reorder", cell: (r) => r.reorder_level ?? "—" },
            ]}
          />
        </TabsContent>

        <TabsContent value="purchase" className="mt-4">
          <PlaceholderTab message="Purchase-order line items will appear here once PO items are captured." />
        </TabsContent>

        <TabsContent value="sales" className="mt-4">
          <RelatedList
            title="Sales History (Invoiced lines)"
            queryKey={["hub", "product", productId, "sales"]}
            queryFn={async () =>
              (await hub.productInvoiceItems(productId)).map((r) => ({ ...r, id: r.id }))
            }
            linkFor={(r) =>
              r.invoice ? { to: "/invoices/$invoiceId", params: { invoiceId: r.invoice.id } } : null
            }
            columns={[
              {
                header: "Invoice",
                cell: (r) => (
                  <span className="font-mono text-xs">{r.invoice?.invoice_no ?? "—"}</span>
                ),
              },
              { header: "Qty", cell: (r) => `${r.quantity} ${r.unit}` },
              { header: "Line total", cell: (r) => formatInr(r.line_total) },
              {
                header: "Status",
                cell: (r) => <Badge variant="outline">{r.invoice?.status ?? "—"}</Badge>,
              },
            ]}
          />
        </TabsContent>

        <TabsContent value="projects" className="mt-4">
          <RelatedList
            title="Projects Used In"
            queryKey={["hub", "product", productId, "projects"]}
            queryFn={() => hub.productProjectsUsedIn(productId)}
            linkFor={(r) => ({ to: "/projects/$projectId", params: { projectId: r.id } })}
            columns={[
              {
                header: "Code",
                cell: (r) => <span className="font-mono text-xs">{r.project_code}</span>,
              },
              { header: "Name", cell: (r) => r.name },
              { header: "City", cell: (r) => r.city ?? "—" },
            ]}
          />
        </TabsContent>

        <TabsContent value="quotes" className="mt-4">
          <RelatedList
            title="Quotations"
            queryKey={["hub", "product", productId, "quotes"]}
            queryFn={() => hub.productQuoteItems(productId)}
            linkFor={(r) =>
              r.quote ? { to: "/quotes/$quoteId", params: { quoteId: r.quote.id } } : null
            }
            columns={[
              {
                header: "Quote",
                cell: (r) => <span className="font-mono text-xs">{r.quote?.quote_no ?? "—"}</span>,
              },
              { header: "Qty", cell: (r) => `${r.quantity} ${r.unit}` },
              { header: "Line total", cell: (r) => formatInr(r.line_total) },
              {
                header: "Status",
                cell: (r) => <Badge variant="outline">{r.quote?.status ?? "—"}</Badge>,
              },
            ]}
          />
        </TabsContent>

        <TabsContent value="photos" className="mt-4">
          <AttachmentsPanel entityType="product_photo" entityId={productId} />
        </TabsContent>
        <TabsContent value="documents" className="mt-4">
          <AttachmentsPanel entityType="product_document" entityId={productId} />
        </TabsContent>

        <TabsContent value="specs" className="mt-4">
          <Card className="shadow-1">
            <CardHeader>
              <CardTitle className="text-sm">Specifications</CardTitle>
            </CardHeader>
            <CardContent>
              <InfoGrid
                items={[
                  { label: "Stone type", value: p.stone_type },
                  { label: "Finish", value: p.finish },
                  { label: "Thickness (mm)", value: p.thickness_mm },
                  { label: "Origin country", value: p.origin_country },
                  { label: "HSN code", value: p.hsn_code },
                  { label: "Default unit", value: p.default_unit },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <NotesPanel
            table="products"
            id={productId}
            value={p.description}
            invalidateKey={["products", "byId", productId]}
            column="description"
            title="Notes / Description"
          />
        </TabsContent>
        <TabsContent value="timeline" className="mt-4">
          <TimelinePanel entityType="product" entityId={productId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

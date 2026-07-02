import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { qk } from "@/lib/query-keys";
import { listDocuments } from "@/lib/documents/api";
import { formatRelative } from "@/lib/format";
import { FileText } from "lucide-react";

const GROUPS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "customer", label: "Customer" },
  { value: "project", label: "Project" },
  { value: "vendor", label: "Vendor" },
  { value: "quote", label: "Quotation" },
  { value: "invoice", label: "Invoice" },
  { value: "purchase_order", label: "Purchase Order" },
  { value: "dispatch", label: "Dispatch" },
];

export const Route = createFileRoute("/_authenticated/documents")({
  ssr: false,
  component: DocumentsPage,
});

function DocumentsPage() {
  const [q, setQ] = useState("");
  const [entityType, setEntityType] = useState("");
  const [folder, setFolder] = useState("");

  const filters = useMemo(() => ({
    q: q.trim() || null,
    entityType: entityType || null,
    folder: folder || null,
  }), [q, entityType, folder]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: qk.documents.all(filters as unknown as Record<string, string | null>),
    queryFn: () => listDocuments(filters),
  });

  const grouped = useMemo(() => {
    const m = new Map<string, typeof rows>();
    rows.forEach((r) => {
      const key = r.entity_type ?? "other";
      const list = m.get(key) ?? [];
      list.push(r);
      m.set(key, list);
    });
    return Array.from(m.entries());
  }, [rows]);

  return (
    <div className="space-y-4">
      <PageHeader title="Documents" subtitle="Every uploaded file across the ERP, searchable and grouped." />

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-4">
          <div className="space-y-1 md:col-span-2">
            <Label className="text-xs">Search</Label>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="File name…" className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Entity</Label>
            <Select value={entityType || "all"} onValueChange={(v) => setEntityType(v === "all" ? "" : v)}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All entities</SelectItem>
                {GROUPS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Folder</Label>
            <Select value={folder || "all"} onValueChange={(v) => setFolder(v === "all" ? "" : v)}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All folders</SelectItem>
                <SelectItem value="quotation">Quotation</SelectItem>
                <SelectItem value="invoice">Invoice</SelectItem>
                <SelectItem value="purchase_order">Purchase Order</SelectItem>
                <SelectItem value="delivery_challan">Delivery Challan</SelectItem>
                <SelectItem value="drawing">Drawing</SelectItem>
                <SelectItem value="site_image">Site Image</SelectItem>
                <SelectItem value="sample_photo">Sample Photo</SelectItem>
                <SelectItem value="product_image">Product Image</SelectItem>
                <SelectItem value="transport_document">Transport Document</SelectItem>
                <SelectItem value="boq">BOQ</SelectItem>
                <SelectItem value="reference">Reference</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="p-6 text-sm text-muted-foreground">Loading…</div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">No documents match your filters.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(([type, list]) => (
            <Card key={type}>
              <CardContent className="p-0">
                <div className="flex items-center justify-between border-b border-border px-4 py-2">
                  <div className="text-sm font-semibold capitalize">{type.replace(/_/g, " ")}</div>
                  <Badge variant="secondary" className="text-xs">{list.length}</Badge>
                </div>
                <ul className="divide-y divide-border">
                  {list.map((r) => (
                    <li key={r.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate">{r.file_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.folder ?? "—"} • {formatRelative(r.uploaded_at)}
                        </div>
                      </div>
                      {r.entity_id ? (
                        <Link to="/activity" className="text-xs text-primary hover:underline">
                          open
                        </Link>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

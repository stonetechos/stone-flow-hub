import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpDown, Download } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EntityPicker } from "@/components/forms/EntityPicker";
import { qk } from "@/lib/query-keys";
import { listGlobalActivity, type ActivityRow } from "@/lib/activity/api";
import { formatRelative } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

const MODULES: ReadonlyArray<{ value: string; label: string }> = [
  { value: "customer", label: "Customer" },
  { value: "project", label: "Project" },
  { value: "vendor", label: "Vendor" },
  { value: "product", label: "Product" },
  { value: "enquiry", label: "Enquiry" },
  { value: "quote", label: "Quote" },
  { value: "sales_order", label: "Sales order" },
  { value: "purchase_order", label: "Purchase order" },
  { value: "inventory_item", label: "Inventory" },
  { value: "invoice", label: "Invoice" },
  { value: "payment", label: "Payment" },
  { value: "receipt", label: "Receipt" },
  { value: "dispatch", label: "Dispatch" },
  { value: "installation", label: "Installation" },
  { value: "followup", label: "Follow-up" },
  { value: "task", label: "Task" },
];

/** Map internal entity_type -> app route + label. Used to build clickable links. */
const ENTITY_ROUTES: Record<string, { to: string; label: string }> = {
  customer: { to: "/customers/$customerId", label: "Customer" },
  project: { to: "/projects/$projectId", label: "Project" },
  enquiry: { to: "/enquiries/$enquiryId", label: "Enquiry" },
  quote: { to: "/quotes", label: "Quote" },
  sales_order: { to: "/sales-orders", label: "Sales order" },
  purchase_order: { to: "/purchase-orders", label: "Purchase order" },
  invoice: { to: "/invoices", label: "Invoice" },
  payment: { to: "/payments", label: "Payment" },
  receipt: { to: "/receipts/$receiptId", label: "Receipt" },
  dispatch: { to: "/dispatch/$id", label: "Dispatch" },
  installation: { to: "/installations/$id", label: "Installation" },
  followup: { to: "/followups/$id", label: "Follow-up" },
  vendor: { to: "/vendors", label: "Vendor" },
  product: { to: "/products/$productId", label: "Product" },
};

export const Route = createFileRoute("/_authenticated/activity")({
  ssr: false,
  component: ActivityPage,
});

const PAGE_SIZE = 25;

function ActivityPage() {
  const qc = useQueryClient();
  const [module, setModule] = useState<string>("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortDesc, setSortDesc] = useState(true);
  const [page, setPage] = useState(1);

  const filters = useMemo(
    () => ({
      entityType: module || null,
      entityId: module === "customer" ? customerId : customerId || null,
      projectId: projectId || null,
      actorId: null,
      fromDate: fromDate ? new Date(fromDate).toISOString() : null,
      toDate: toDate ? new Date(toDate + "T23:59:59").toISOString() : null,
      limit: 500,
    }),
    [module, customerId, projectId, fromDate, toDate],
  );

  const { data: rows = [], isLoading } = useQuery({
    queryKey: qk.activity.global(filters as unknown as Record<string, string | null>),
    queryFn: () => listGlobalActivity(filters),
  });

  useEffect(() => {
    const channel = supabase
      .channel("activity_log_feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_log" }, () => {
        qc.invalidateQueries({ queryKey: ["activity"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  // ---- Batched name lookups: actors, projects, customers, enquiries.
  const actorIds = useMemo(
    () => Array.from(new Set(rows.map((r) => r.actor_id).filter(Boolean))) as string[],
    [rows],
  );
  const projectIds = useMemo(
    () => Array.from(new Set(rows.map((r) => r.project_id).filter(Boolean))) as string[],
    [rows],
  );
  const customerEntityIds = useMemo(
    () =>
      Array.from(new Set(rows.filter((r) => r.entity_type === "customer").map((r) => r.entity_id))),
    [rows],
  );
  const enquiryEntityIds = useMemo(
    () =>
      Array.from(new Set(rows.filter((r) => r.entity_type === "enquiry").map((r) => r.entity_id))),
    [rows],
  );
  const actors = useQuery({
    queryKey: ["activity", "actors", actorIds.sort().join(",")],
    enabled: actorIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", actorIds);
      const m = new Map<string, string>();
      for (const p of data ?? []) m.set(p.id, p.full_name || p.email || p.id.slice(0, 8));
      return m;
    },
  });
  const projects = useQuery({
    queryKey: ["activity", "projects", projectIds.sort().join(",")],
    enabled: projectIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, name").in("id", projectIds);
      const m = new Map<string, string>();
      for (const p of data ?? []) m.set(p.id, p.name);
      return m;
    },
  });
  const customers = useQuery({
    queryKey: ["activity", "customers", customerEntityIds.sort().join(",")],
    enabled: customerEntityIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("customers")
        .select("id, name")
        .in("id", customerEntityIds);
      const m = new Map<string, string>();
      for (const c of data ?? []) m.set(c.id, c.name);
      return m;
    },
  });
  const enquiries = useQuery({
    queryKey: ["activity", "enquiries", enquiryEntityIds.sort().join(",")],
    enabled: enquiryEntityIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("enquiries")
        .select("id, enquiry_no, customer:customers!enquiries_customer_id_fkey(name)")
        .in("id", enquiryEntityIds);
      const m = new Map<string, { no: string; customer: string | null }>();
      for (const e of (data ?? []) as Array<{
        id: string;
        enquiry_no: string;
        customer: { name: string } | null;
      }>) {
        m.set(e.id, { no: e.enquiry_no, customer: e.customer?.name ?? null });
      }
      return m;
    },
  });

  // Client-side text search.
  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    const list = q
      ? rows.filter((r) => {
          const hay = [r.summary, r.entity_type, r.field_name, r.action]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return hay.includes(q);
        })
      : rows;
    const sorted = [...list].sort((a, b) =>
      sortDesc
        ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        : new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    return sorted;
  }, [rows, q, sortDesc]);

  useEffect(() => setPage(1), [module, customerId, projectId, fromDate, toDate, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function entityLabel(r: ActivityRow): string {
    if (r.entity_type === "customer") return customers.data?.get(r.entity_id) ?? "Customer";
    if (r.entity_type === "enquiry") {
      const e = enquiries.data?.get(r.entity_id);
      if (!e) return "Enquiry";
      return e.customer ? `${e.customer} · ${e.no}` : e.no;
    }
    if (r.entity_type === "project") return projects.data?.get(r.entity_id) ?? "Project";
    return ENTITY_ROUTES[r.entity_type]?.label ?? r.entity_type.replace(/_/g, " ");
  }

  function entityLink(r: ActivityRow): { to: string; params?: Record<string, string> } | null {
    const route = ENTITY_ROUTES[r.entity_type];
    if (!route) return null;
    if (route.to.includes("$")) {
      // Extract param name (single segment).
      const paramMatch = route.to.match(/\$(\w+)/);
      if (paramMatch) return { to: route.to, params: { [paramMatch[1]]: r.entity_id } };
    }
    return { to: route.to };
  }

  function exportCsv() {
    const header = [
      "timestamp",
      "user",
      "module",
      "action",
      "entity",
      "project",
      "field",
      "previous",
      "new",
      "summary",
    ].join(",");
    const escape = (v: unknown) => {
      const s = v == null ? "" : typeof v === "string" ? v : JSON.stringify(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const lines = filtered.map((r) =>
      [
        new Date(r.created_at).toISOString(),
        r.actor_id ? (actors.data?.get(r.actor_id) ?? "") : "",
        r.entity_type,
        r.action,
        entityLabel(r),
        r.project_id ? (projects.data?.get(r.project_id) ?? "") : "",
        r.field_name ?? "",
        r.old_value,
        r.new_value,
        r.summary ?? "",
      ]
        .map(escape)
        .join(","),
    );
    const blob = new Blob([header + "\n" + lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Activity"
        subtitle="Real-time audit log across every module. Updates automatically."
      />

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-6">
          <div className="space-y-1 md:col-span-2">
            <Label className="text-xs">Search</Label>
            <Input
              className="h-9 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search summary, field, action…"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Module</Label>
            <Select value={module || "all"} onValueChange={(v) => setModule(v === "all" ? "" : v)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All modules</SelectItem>
                {MODULES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Customer</Label>
            <EntityPicker
              type="customer"
              value={customerId}
              onChange={setCustomerId}
              placeholder="Any customer"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Project</Label>
            <EntityPicker
              type="project"
              value={projectId}
              onChange={setProjectId}
              placeholder="Any project"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              className="h-9 text-xs"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              className="h-9 text-xs"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <div className="col-span-full flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              {filtered.length} entr{filtered.length === 1 ? "y" : "ies"} · page {currentPage} of{" "}
              {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => setSortDesc((s) => !s)}
              >
                <ArrowUpDown className="mr-1 h-3 w-3" />{" "}
                {sortDesc ? "Newest first" : "Oldest first"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                onClick={exportCsv}
                disabled={filtered.length === 0}
              >
                <Download className="mr-1 h-3 w-3" /> Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : paged.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No activity for these filters.</div>
          ) : (
            <ul className="divide-y divide-border">
              {paged.map((r) => {
                const actorName = r.actor_id ? actors.data?.get(r.actor_id) : null;
                const projectName = r.project_id ? projects.data?.get(r.project_id) : null;
                const link = entityLink(r);
                const label = entityLabel(r);
                const hasDiff = r.old_value != null || r.new_value != null;
                return (
                  <li key={r.id} className="flex items-start gap-3 px-4 py-3">
                    <Badge variant="secondary" className="mt-0.5 shrink-0 text-[10px] capitalize">
                      {r.action.replace(/_/g, " ")}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm">
                        {r.summary ?? `${r.entity_type.replace(/_/g, " ")} updated`}
                      </div>
                      <div className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                        <span className="capitalize">{r.entity_type.replace(/_/g, " ")}</span>
                        <span>·</span>
                        {link ? (
                          <Link
                            to={link.to}
                            params={link.params as never}
                            className="text-primary hover:underline"
                          >
                            {label}
                          </Link>
                        ) : (
                          <span>{label}</span>
                        )}
                        {r.field_name && (
                          <>
                            <span>·</span>
                            <span>{r.field_name}</span>
                          </>
                        )}
                        {projectName && (
                          <>
                            <span>·</span>
                            <span>{projectName}</span>
                          </>
                        )}
                        {actorName && (
                          <>
                            <span>·</span>
                            <span>by {actorName}</span>
                          </>
                        )}
                      </div>
                      {hasDiff && r.field_name && (
                        <div className="mt-1 text-xs">
                          <span className="rounded bg-destructive/10 px-1.5 py-0.5 font-mono text-destructive">
                            {formatValue(r.old_value)}
                          </span>
                          <span className="mx-1 text-muted-foreground">→</span>
                          <span className="rounded bg-success/10 px-1.5 py-0.5 font-mono text-success-foreground">
                            {formatValue(r.new_value)}
                          </span>
                        </div>
                      )}
                    </div>
                    <span
                      className="shrink-0 text-xs text-muted-foreground"
                      title={new Date(r.created_at).toLocaleString()}
                    >
                      {formatRelative(r.created_at)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage(1)}
            disabled={currentPage === 1}
          >
            « First
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            ‹ Prev
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next ›
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            Last »
          </Button>
        </div>
      )}
    </div>
  );
}

function formatValue(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "string") return v.length > 60 ? v.slice(0, 60) + "…" : v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    const s = JSON.stringify(v);
    return s.length > 60 ? s.slice(0, 60) + "…" : s;
  } catch {
    return "—";
  }
}

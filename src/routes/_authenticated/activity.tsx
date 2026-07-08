import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EntityPicker } from "@/components/forms/EntityPicker";
import { qk } from "@/lib/query-keys";
import { listGlobalActivity } from "@/lib/activity/api";
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

export const Route = createFileRoute("/_authenticated/activity")({
  ssr: false,
  component: ActivityPage,
});

function ActivityPage() {
  const qc = useQueryClient();
  const [module, setModule] = useState<string>("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filters = useMemo(
    () => ({
      entityType: module || null,
      // customer picker filters activity FOR the customer entity or where that customer id shows up
      entityId: module === "customer" ? customerId : customerId || null,
      projectId: projectId || null,
      actorId: null,
      fromDate: fromDate ? new Date(fromDate).toISOString() : null,
      toDate: toDate ? new Date(toDate + "T23:59:59").toISOString() : null,
    }),
    [module, customerId, projectId, fromDate, toDate],
  );

  const { data: rows = [], isLoading } = useQuery({
    queryKey: qk.activity.global(filters as unknown as Record<string, string | null>),
    queryFn: () => listGlobalActivity(filters),
  });

  // ---- Realtime auto-refresh: any new activity_log row invalidates the feed.
  useEffect(() => {
    const channel = supabase
      .channel("activity_log_feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_log" },
        () => {
          qc.invalidateQueries({ queryKey: ["activity"] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  // ---- Batched name lookup: fetch profile display names for all distinct actors,
  // and project names for all distinct project_ids, in a single round-trip each.
  const actorIds = useMemo(
    () => Array.from(new Set(rows.map((r) => r.actor_id).filter(Boolean))) as string[],
    [rows],
  );
  const projectIds = useMemo(
    () => Array.from(new Set(rows.map((r) => r.project_id).filter(Boolean))) as string[],
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
      for (const p of data ?? [])
        m.set(p.id, p.full_name || p.email || p.id.slice(0, 8));
      return m;
    },
  });
  const projects = useQuery({
    queryKey: ["activity", "projects", projectIds.sort().join(",")],
    enabled: projectIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, name")
        .in("id", projectIds);
      const m = new Map<string, string>();
      for (const p of data ?? []) m.set(p.id, p.name);
      return m;
    },
  });

  // Client-side text search over the enriched summary/entity_type/field_name.
  const q = search.trim().toLowerCase();
  const filtered = q
    ? rows.filter((r) => {
        const hay = [r.summary, r.entity_type, r.field_name, r.action]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
    : rows;

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
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No activity for these filters.</div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((r) => {
                const actorName = r.actor_id ? actors.data?.get(r.actor_id) : null;
                const projectName = r.project_id ? projects.data?.get(r.project_id) : null;
                return (
                  <li key={r.id} className="flex items-start gap-3 px-4 py-3">
                    <Badge variant="secondary" className="mt-0.5 shrink-0 text-[10px] capitalize">
                      {r.action.replace(/_/g, " ")}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm">
                        {r.summary ?? `${r.entity_type} updated`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span className="capitalize">{r.entity_type.replace(/_/g, " ")}</span>
                        {r.field_name ? ` • ${r.field_name}` : ""}
                        {projectName ? ` • ${projectName}` : ""}
                        {actorName ? ` • by ${actorName}` : ""}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatRelative(r.created_at)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

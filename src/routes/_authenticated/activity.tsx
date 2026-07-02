import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { qk } from "@/lib/query-keys";
import { listGlobalActivity } from "@/lib/activity/api";
import { formatRelative } from "@/lib/format";

const MODULES: ReadonlyArray<string> = [
  "customer","project","vendor","product","enquiry","quote","sales_order",
  "purchase_order","inventory_item","invoice","payment","dispatch","followup","task",
];

export const Route = createFileRoute("/_authenticated/activity")({
  ssr: false,
  component: ActivityPage,
});

function ActivityPage() {
  const [module, setModule] = useState<string>("");
  const [customerId, setCustomerId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [actorId, setActorId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filters = useMemo(() => ({
    entityType: module || null,
    entityId: customerId.trim() || null,
    projectId: projectId.trim() || null,
    actorId: actorId.trim() || null,
    fromDate: fromDate ? new Date(fromDate).toISOString() : null,
    toDate: toDate ? new Date(toDate + "T23:59:59").toISOString() : null,
  }), [module, customerId, projectId, actorId, fromDate, toDate]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: qk.activity.global(filters as unknown as Record<string, string | null>),
    queryFn: () => listGlobalActivity(filters),
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Activity" subtitle="Everything that happened across every module." />

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-6">
          <div className="space-y-1">
            <Label className="text-xs">Module</Label>
            <Select value={module || "all"} onValueChange={(v) => setModule(v === "all" ? "" : v)}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All modules</SelectItem>
                {MODULES.map((m) => <SelectItem key={m} value={m}>{m.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label className="text-xs">Customer ID</Label><Input className="h-9 text-xs" value={customerId} onChange={(e) => setCustomerId(e.target.value)} placeholder="uuid" /></div>
          <div className="space-y-1"><Label className="text-xs">Project ID</Label><Input className="h-9 text-xs" value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="uuid" /></div>
          <div className="space-y-1"><Label className="text-xs">User ID</Label><Input className="h-9 text-xs" value={actorId} onChange={(e) => setActorId(e.target.value)} placeholder="uuid" /></div>
          <div className="space-y-1"><Label className="text-xs">From</Label><Input type="date" className="h-9 text-xs" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">To</Label><Input type="date" className="h-9 text-xs" value={toDate} onChange={(e) => setToDate(e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No activity for these filters.</div>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((r) => (
                <li key={r.id} className="flex items-start gap-3 px-4 py-3">
                  <Badge variant="secondary" className="mt-0.5 shrink-0 text-[10px] capitalize">{r.action}</Badge>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{r.summary ?? `${r.entity_type} updated`}</div>
                    <div className="text-xs text-muted-foreground">
                      <span className="capitalize">{r.entity_type.replace(/_/g, " ")}</span>
                      {r.field_name ? ` • ${r.field_name}` : ""}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatRelative(r.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

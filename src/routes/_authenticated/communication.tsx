import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { RefreshCw, Play, Filter, X } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useRoles } from "@/hooks/use-roles";
import { supabase } from "@/integrations/supabase/client";
import { toUserMessage } from "@/lib/errors";
import { dispatchQueueNow } from "@/lib/notifications/dispatch.functions";
import { retryMessage, cancelMessage } from "@/lib/notifications/queue";


export const Route = createFileRoute("/_authenticated/communication")({
  ssr: false,
  component: CommunicationCentre,
});

type Row = {
  id: string;
  message_no: string | null;
  channel: string;
  status: string;
  to_address: string;
  subject: string | null;
  related_type: string | null;
  related_id: string | null;
  attempts: number;
  last_error: string | null;
  provider_message_id: string | null;
  created_at: string;
  sent_at: string | null;
};

const STATUSES = ["queued", "sending", "retrying", "sent", "failed", "cancelled"] as const;
const CHANNELS = ["email", "whatsapp", "sms"] as const;
const RELATED = [
  "customer",
  "vendor",
  "project",
  "estimate",
  "quote",
  "invoice",
  "reminder",
] as const;

function statusVariant(s: string): "default" | "outline" | "destructive" | "secondary" {
  if (s === "sent") return "default";
  if (s === "failed") return "destructive";
  if (s === "cancelled") return "outline";
  return "secondary";
}

function CommunicationCentre() {
  const qc = useQueryClient();
  const { isAdmin } = useRoles();
  const [channel, setChannel] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [related, setRelated] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Search is part of the query key, so an un-debounced value fired one
  // network round trip per keystroke.
  const debouncedSearch = useDebouncedValue(search, 250);

  const filtersActive =
    channel !== "all" || status !== "all" || related !== "all" || !!search || !!from || !!to;
  const clearFilters = (): void => {
    setChannel("all");
    setStatus("all");
    setRelated("all");
    setSearch("");
    setFrom("");
    setTo("");
  };

  const key = useMemo(
    () =>
      [
        "messages",
        "centre",
        { channel, status, related, search: debouncedSearch, from, to },
      ] as const,
    [channel, status, related, debouncedSearch, from, to],
  );

  const query = useQuery({
    queryKey: key,
    queryFn: async (): Promise<Row[]> => {
      let q = supabase
        .from("message_queue")
        .select(
          "id,message_no,channel,status,to_address,subject,related_type,related_id,attempts,last_error,provider_message_id,created_at,sent_at",
        )
        .order("created_at", { ascending: false })
        .limit(500);
      if (channel !== "all") q = q.eq("channel", channel);
      if (status !== "all") q = q.eq("status", status);
      if (related !== "all") q = q.eq("related_type", related);
      if (from) q = q.gte("created_at", new Date(from).toISOString());
      if (to) q = q.lte("created_at", new Date(to + "T23:59:59").toISOString());
      if (debouncedSearch) {
        const s = debouncedSearch.replace(/[%_]/g, "");
        q = q.or(`message_no.ilike.%${s}%,to_address.ilike.%${s}%,subject.ilike.%${s}%`);
      }
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as Row[];
    },
    staleTime: 15_000,
  });

  const dispatchFn = useServerFn(dispatchQueueNow);
  const dispatch = useMutation({
    mutationFn: () => dispatchFn({ data: { batchSize: 25 } }),
    onSuccess: (r) => {
      toast.success(`Dispatched ${r.attempted} · ${r.sent} sent · ${r.failed} failed`);
      void query.refetch();
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const retry = useMutation({
    mutationFn: (id: string) => retryMessage(id),
    onSuccess: () => {
      toast.success("Re-queued");
      void qc.invalidateQueries({ queryKey: ["messages"] });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });
  const cancel = useMutation({
    mutationFn: (id: string) => cancelMessage(id),
    onSuccess: () => {
      toast.success("Cancelled");
      void qc.invalidateQueries({ queryKey: ["messages"] });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });
  // Per-row busy id so a second click can't fire the same mutation twice.
  const busyId =
    (retry.isPending ? retry.variables : undefined) ??
    (cancel.isPending ? cancel.variables : undefined);


  const rows = useMemo(() => query.data ?? [], [query.data]);
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of rows) m[r.status] = (m[r.status] ?? 0) + 1;
    return m;
  }, [rows]);

  return (
    <div>
      <PageHeader
        title="Communication Centre"
        subtitle="Every outbound email, WhatsApp and SMS with delivery status and retry history."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/notification-settings">Provider settings</Link>
            </Button>
            {/* `dispatchQueueNow` is admin-gated server-side; without this
                the button was offered to every staff user and failed with a
                permission error. */}
            {isAdmin && (
              <Button size="sm" onClick={() => dispatch.mutate()} disabled={dispatch.isPending}>
                <Play className="mr-2 h-4 w-4" /> Run dispatcher now
              </Button>
            )}

          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Badge key={s} variant={statusVariant(s)}>
            {s}: {counts[s] ?? 0}
          </Badge>
        ))}
      </div>

      <Card className="shadow-1 mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Filter className="h-4 w-4" /> Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-6">
          <div className="space-y-1">
            <Label className="text-xs">Channel</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {CHANNELS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Related entity</Label>
            <Select value={related} onValueChange={setRelated}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {RELATED.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Search</Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="No, address, subject"
            />
          </div>
          {filtersActive && (
            <div className="md:col-span-6">
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-1.5 h-3.5 w-3.5" /> Clear filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-1">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm">{rows.length} messages</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {query.isLoading ? (
            <div className="p-4">
              <SkeletonTable rows={6} columns={8} />
            </div>
          ) : query.error ? (
            <div className="p-4">
              <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
            </div>
          ) : (

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Subject / Entity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">
                    {r.message_no ?? r.id.slice(0, 8)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{r.channel}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate" title={r.to_address}>
                    {r.to_address}
                  </TableCell>
                  <TableCell className="max-w-[280px] truncate" title={r.subject ?? ""}>
                    {r.subject ?? <span className="text-muted-foreground">—</span>}
                    {r.related_type && (
                      <span className="ml-2 text-xs text-muted-foreground">({r.related_type})</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                    {r.last_error && (
                      <div
                        className="mt-1 text-xs text-destructive truncate max-w-[220px]"
                        title={r.last_error}
                      >
                        {r.last_error}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{r.attempts}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-right">
                    {(r.status === "failed" || r.status === "cancelled") && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busyId === r.id}
                        onClick={() => retry.mutate(r.id)}
                      >
                        Retry
                      </Button>
                    )}
                    {/* `cancelMessage()` only transitions queued/failed rows,
                        so offering Cancel on a `retrying` row showed a
                        "Cancelled" toast for a no-op update. */}
                    {(r.status === "queued" || r.status === "failed") && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busyId === r.id}
                        onClick={() => cancel.mutate(r.id)}
                      >
                        Cancel
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    {filtersActive
                      ? "No messages match the filters."
                      : "No messages have been sent yet."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          )}
        </CardContent>

      </Card>
    </div>
  );
}

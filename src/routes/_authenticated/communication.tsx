import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  RefreshCw,
  Play,
  Filter,
  X,
  MessageCircle,
  CheckCheck,
  Eye,
  AlertCircle,
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useRoles } from "@/hooks/use-roles";
import { supabase } from "@/integrations/supabase/client";
import { toUserMessage } from "@/lib/errors";
import { dispatchQueueNow } from "@/lib/notifications/dispatch.functions";
import {
  retryMessage,
  cancelMessage,
  markMessageSent,
  markAllWhatsappSent,
} from "@/lib/notifications/queue";
import { openWhatsappToContact } from "@/lib/whatsapp";
import { useTranslation } from "react-i18next";

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
  body: string | null;
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
  "receipt",
  "reminder",
] as const;

function statusVariant(s: string): "default" | "outline" | "destructive" | "secondary" {
  if (s === "sent") return "default";
  if (s === "failed") return "destructive";
  if (s === "cancelled") return "outline";
  return "secondary";
}

function CommunicationCentre() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { isAdmin } = useRoles();
  const [channel, setChannel] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [related, setRelated] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [viewingMessage, setViewingMessage] = useState<Row | null>(null);

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
          "id,message_no,channel,status,to_address,subject,body,related_type,related_id,attempts,last_error,provider_message_id,created_at,sent_at",
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
    mutationFn: () => dispatchFn({ data: { batchSize: 25, force: true } }),
    onSuccess: (r) => {
      toast.success(`Dispatched ${r.attempted} · ${r.sent} sent · ${r.failed} failed`);
      void query.refetch();
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const markSent = useMutation({
    mutationFn: (id: string) => markMessageSent(id),
    onSuccess: () => {
      toast.success("Marked as sent");
      void qc.invalidateQueries({ queryKey: ["messages"] });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const markAllWhatsapp = useMutation({
    mutationFn: () => markAllWhatsappSent(),
    onSuccess: (count) => {
      toast.success(`Marked ${count} WhatsApp message(s) as sent`);
      void qc.invalidateQueries({ queryKey: ["messages"] });
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

  const handleOpenWhatsapp = (row: Row) => {
    if (!row.to_address) {
      toast.error("No phone number specified for this message");
      return;
    }
    openWhatsappToContact(row.to_address, row.body ?? "");
    markSent.mutate(row.id);
    toast.success(`Opening WhatsApp for ${row.to_address} — marked as sent`);
  };

  const busyId =
    (retry.isPending ? retry.variables : undefined) ??
    (cancel.isPending ? cancel.variables : undefined) ??
    (markSent.isPending ? markSent.variables : undefined);

  const rows = useMemo(() => query.data ?? [], [query.data]);
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of rows) m[r.status] = (m[r.status] ?? 0) + 1;
    return m;
  }, [rows]);

  const hasPendingWhatsapp = useMemo(
    () =>
      rows.some(
        (r) =>
          r.channel === "whatsapp" &&
          (r.status === "retrying" || r.status === "failed" || r.status === "queued"),
      ),
    [rows],
  );

  return (
    <div>
      <PageHeader
        title={t("communication.title", "Communication Centre")}
        subtitle={t(
          "communication.subtitle",
          "Every outbound email, WhatsApp and SMS with delivery status and retry history.",
        )}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/notification-settings">
                {t("communication.providerSettings", "Provider settings")}
              </Link>
            </Button>
            {hasPendingWhatsapp && (
              <Button
                variant="outline"
                size="sm"
                className="border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                onClick={() => markAllWhatsapp.mutate()}
                disabled={markAllWhatsapp.isPending}
              >
                <CheckCheck className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Mark all WhatsApp as sent
              </Button>
            )}
            {isAdmin && (
              <Button size="sm" onClick={() => dispatch.mutate()} disabled={dispatch.isPending}>
                <Play className="mr-2 h-4 w-4" />{" "}
                {t("communication.runDispatcher", "Run dispatcher now")}
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

      {hasPendingWhatsapp && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-950 dark:text-emerald-200">
          <div className="flex items-center gap-2.5">
            <MessageCircle className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <span className="font-semibold">Direct WhatsApp Dispatch:</span> Messages can be sent
              directly from your WhatsApp account without requiring Meta Cloud API tokens. Click{" "}
              <span className="font-medium underline">Open in WhatsApp</span> on any row below to
              open that customer&apos;s chat with the matter pre-filled, or click{" "}
              <span className="font-medium underline">Mark all WhatsApp as sent</span>.
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 border-emerald-600/40 bg-background text-emerald-700 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
            onClick={() => markAllWhatsapp.mutate()}
            disabled={markAllWhatsapp.isPending}
          >
            <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
            Clear / Mark all sent
          </Button>
        </div>
      )}

      <Card className="shadow-1 mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Filter className="h-4 w-4" /> {t("common.filters", "Filters")}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-6">
          <div className="space-y-1">
            <Label className="text-xs">{t("communication.channel", "Channel")}</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all", "All")}</SelectItem>
                {CHANNELS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("common.status", "Status")}</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all", "All")}</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("communication.relatedEntity", "Related entity")}</Label>
            <Select value={related} onValueChange={setRelated}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all", "All")}</SelectItem>
                {RELATED.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("common.from", "From")}</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("common.to", "To")}</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("common.search", "Search")}</Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("communication.searchPlaceholder", "No, address, subject")}
            />
          </div>
          {filtersActive && (
            <div className="md:col-span-6">
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-1.5 h-3.5 w-3.5" /> {t("common.clearFilters", "Clear filters")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-1">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm">
            {rows.length} {t("communication.messages", "messages")}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />
            {t("common.refresh", "Refresh")}
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
                  <TableHead>{t("common.no", "No")}</TableHead>
                  <TableHead>{t("communication.columns.channel", "Channel")}</TableHead>
                  <TableHead>{t("communication.columns.to", "To")}</TableHead>
                  <TableHead>
                    {t("communication.columns.subjectEntity", "Subject / Entity")}
                  </TableHead>
                  <TableHead>{t("common.status", "Status")}</TableHead>
                  <TableHead>{t("communication.columns.attempts", "Attempts")}</TableHead>
                  <TableHead>{t("communication.columns.created", "Created")}</TableHead>
                  <TableHead className="text-right">{t("common.actions", "Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">
                      {r.message_no ?? r.id.slice(0, 8)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          r.channel === "whatsapp"
                            ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
                            : ""
                        }
                      >
                        {r.channel}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate" title={r.to_address}>
                      {r.to_address}
                    </TableCell>
                    <TableCell className="max-w-[280px] truncate" title={r.subject ?? ""}>
                      {r.subject ?? <span className="text-muted-foreground">—</span>}
                      {r.related_type && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({r.related_type})
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                      {r.last_error && (
                        <div
                          className="mt-1 max-w-[220px] truncate text-xs text-destructive"
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
                      <div className="flex items-center justify-end gap-1.5">
                        {r.channel === "whatsapp" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 border-emerald-500/50 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                            title="Open in WhatsApp and mark as sent"
                            disabled={busyId === r.id}
                            onClick={() => handleOpenWhatsapp(r)}
                          >
                            <MessageCircle className="mr-1.5 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            Open in WhatsApp
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-muted-foreground hover:text-foreground"
                          title="View message text"
                          onClick={() => setViewingMessage(r)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {r.channel === "whatsapp" && r.status !== "sent" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-xs text-muted-foreground hover:text-emerald-600"
                            disabled={busyId === r.id}
                            title="Mark as Sent"
                            onClick={() => markSent.mutate(r.id)}
                          >
                            Mark sent
                          </Button>
                        )}
                        {(r.status === "failed" ||
                          r.status === "cancelled" ||
                          r.status === "retrying") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-xs"
                            disabled={busyId === r.id}
                            onClick={() => retry.mutate(r.id)}
                          >
                            {t("common.retry", "Retry")}
                          </Button>
                        )}
                        {(r.status === "queued" ||
                          r.status === "retrying" ||
                          r.status === "failed") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive"
                            disabled={busyId === r.id}
                            onClick={() => cancel.mutate(r.id)}
                          >
                            {t("common.cancel", "Cancel")}
                          </Button>
                        )}
                      </div>
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
                        ? t("communication.noMatches", "No messages match the filters.")
                        : t("communication.noMessages", "No messages have been sent yet.")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Message Content Viewer Modal */}
      <Dialog open={!!viewingMessage} onOpenChange={(open) => !open && setViewingMessage(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>
                {viewingMessage?.message_no ?? viewingMessage?.id.slice(0, 8)} —{" "}
                {viewingMessage?.channel}
              </span>
              {viewingMessage && (
                <Badge variant={statusVariant(viewingMessage.status)}>
                  {viewingMessage.status}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              To: <span className="font-mono text-foreground">{viewingMessage?.to_address}</span>
              {viewingMessage?.subject && (
                <span className="block mt-1">Subject: {viewingMessage.subject}</span>
              )}
            </DialogDescription>
          </DialogHeader>

          {viewingMessage?.last_error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Last error:</span> {viewingMessage.last_error}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Message matter</Label>
            <div className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-3 font-mono text-xs leading-relaxed text-foreground select-all">
              {viewingMessage?.body || "(empty body)"}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setViewingMessage(null)}>
              Close
            </Button>
            {viewingMessage?.channel === "whatsapp" && (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => {
                  if (viewingMessage) handleOpenWhatsapp(viewingMessage);
                  setViewingMessage(null);
                }}
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Open in WhatsApp
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

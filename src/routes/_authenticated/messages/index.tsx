import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { listMessages, retryMessage, cancelMessage } from "@/lib/notifications/queue";
import { formatRelative } from "@/lib/format";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateMessage } from "@/lib/query-invalidation";

export const Route = createFileRoute("/_authenticated/messages/")({
  ssr: false,
  component: MessagesQueuePage,
});

const STATUS_COLOR: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  queued: "secondary",
  sending: "secondary",
  sent: "default",
  failed: "destructive",
  cancelled: "outline",
};

function MessagesQueuePage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [channel, setChannel] = useState<string>("");
  const query = useQuery({
    queryKey: qk.messages.list(q, channel),
    queryFn: () => listMessages(q, (channel || undefined) as "email" | "whatsapp" | "sms" | undefined),
  });
  const rows = query.data ?? [];

  const retry = useMutation({
    mutationFn: (id: string) => retryMessage(id),
    onSuccess: (_d, id) => { toast.success("Requeued"); invalidateMessage(qc, id); query.refetch(); },
    onError: (e) => toast.error(toUserMessage(e)),
  });
  const cancel = useMutation({
    mutationFn: (id: string) => cancelMessage(id),
    onSuccess: (_d, id) => { toast.success("Cancelled"); invalidateMessage(qc, id); query.refetch(); },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  return (
    <div>
      <PageHeader
        title="Notification Queue"
        subtitle="Every outbound email, WhatsApp and SMS message with delivery status and retry controls."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/notification-settings">Configure providers</Link>
          </Button>
        }
      />

      <div className="mb-3 flex items-center gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search #, recipient, subject…" className="max-w-sm" />
        <Select value={channel || "all"} onValueChange={(v) => setChannel(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All channels" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All channels</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs text-muted-foreground">{rows.length} shown</span>
      </div>

      {query.isLoading ? (
        <SkeletonTable />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : rows.length === 0 ? (
        <Card className="shadow-1"><CardContent className="p-6">
          <EmptyState icon={<Send className="h-6 w-6" />} title="Queue is empty" message="Messages sent from Estimates, Receipts, Invoices etc. will appear here." />
        </CardContent></Card>
      ) : (
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Message #</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-xs">{m.message_no}</TableCell>
                  <TableCell><Badge variant="outline" className="uppercase">{m.channel}</Badge></TableCell>
                  <TableCell className="text-sm">{m.to_address}</TableCell>
                  <TableCell className="text-sm truncate max-w-[240px]">{m.subject ?? "—"}</TableCell>
                  <TableCell><Badge variant={STATUS_COLOR[m.status] ?? "outline"}>{m.status}</Badge></TableCell>
                  <TableCell className="text-sm">{m.attempts}/{m.max_attempts}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatRelative(m.created_at)}</TableCell>
                  <TableCell className="text-right">
                    {m.status === "failed" && (
                      <Button variant="outline" size="sm" onClick={() => retry.mutate(m.id)}>Retry</Button>
                    )}
                    {(m.status === "queued" || m.status === "failed") && (
                      <Button variant="ghost" size="sm" className="ml-1" onClick={() => cancel.mutate(m.id)}>Cancel</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

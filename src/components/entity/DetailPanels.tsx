/** Reusable Notes / Attachments / Timeline panels for entity detail pages. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Loader2, Paperclip, Trash2, Download, MessageSquare, History } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toUserMessage } from "@/lib/errors";
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import {
  deleteAttachment,
  listAttachments,
  signedUrl,
  uploadAttachment,
  type FileRow,
} from "@/lib/attachments/api";
import { useEntityTimeline } from "@/lib/timeline/hooks";
import { BusinessTimeline } from "@/components/timeline/BusinessTimeline";

export function NotesPanel({
  table,
  id,
  value,
  invalidateKey,
  column = "notes",
  title = "Notes",
}: {
  table: string;
  id: string;
  value: string | null;
  invalidateKey: readonly unknown[];
  column?: string;
  title?: string;
}) {
  const qc = useQueryClient();
  const [text, setText] = useState(value ?? "");
  const mut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from(table as never)
        .update({ [column]: text } as never)
        .eq("id", id);
      if (error) throw new AppError(mapDbError(error));
    },
    onSuccess: () => {
      toast.success(`${title} saved`);
      qc.invalidateQueries({ queryKey: invalidateKey });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} />
        <div className="flex justify-end">
          <Button size="sm" onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            Save notes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function AttachmentsPanel({
  entityType,
  entityId,
}: {
  entityType: string;
  entityId: string;
}) {
  const qc = useQueryClient();
  const key = ["attachments", entityType, entityId] as const;
  const query = useQuery({ queryKey: key, queryFn: () => listAttachments(entityType, entityId) });
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = useMutation({
    mutationFn: (f: File) => uploadAttachment({ entityType, entityId, file: f }),
    onSuccess: () => {
      toast.success("File uploaded");
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const del = useMutation({
    mutationFn: (row: FileRow) => deleteAttachment(row),
    onSuccess: () => {
      toast.success("File removed");
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  async function open(row: FileRow) {
    try {
      const url = await signedUrl(row);
      window.open(url, "_blank", "noopener");
    } catch (e) {
      toast.error(toUserMessage(e));
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm">Attachments</CardTitle>
        </div>
        <>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload.mutate(f);
              e.target.value = "";
            }}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={upload.isPending}
          >
            {upload.isPending ? (
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            ) : (
              <Paperclip className="mr-2 h-3 w-3" />
            )}
            Upload
          </Button>
        </>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : (query.data ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground">No attachments yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {query.data!.map((f) => (
              <li key={f.id} className="flex items-center justify-between py-2 text-sm">
                <span className="truncate">{f.file_name}</span>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    aria-label={`Download ${f.file_name}`}
                    onClick={() => open(f)}
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    aria-label={`Delete ${f.file_name}`}
                    onClick={() => del.mutate(f)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/** Generic single-entity Timeline tab — reused by every document detail
 *  page (payments, vendors, products, installations, enquiries,
 *  purchase-orders, dispatch, invoices, quotes, grns, sales-orders,
 *  inventory). Phase G.10: now backed by the shared Business Timeline
 *  engine (lib/timeline/api.ts's getEntityTimeline, the single factored-out
 *  implementation of this exact query) and the shared BusinessTimeline UI,
 *  instead of an inline ad-hoc activity_log query. Customer and Project
 *  pages use the richer useCustomerTimeline()/useProjectTimeline() +
 *  BusinessTimeline directly (see their own route files) since those
 *  scopes have many more event sources than a single entity_type/entity_id
 *  pair. */
export function TimelinePanel({ entityType, entityId }: { entityType: string; entityId: string }) {
  const query = useEntityTimeline(entityType, entityId);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        <History className="h-4 w-4 text-muted-foreground" />
        <CardTitle className="text-sm">Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <BusinessTimeline
          events={query.data}
          isLoading={query.isLoading}
          error={query.error}
          onRetry={() => query.refetch()}
          pageSize={10}
          emptyTitle="No activity yet"
          emptyMessage="No activity recorded yet."
        />
      </CardContent>
    </Card>
  );
}

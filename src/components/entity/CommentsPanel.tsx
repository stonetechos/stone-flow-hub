/** Threaded comments panel for any entity. */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { qk } from "@/lib/query-keys";
import { createComment, deleteComment, listComments, type CommentRow } from "@/lib/comments/api";
import { toUserMessage } from "@/lib/errors";
import { formatRelative } from "@/lib/format";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

interface Props {
  entityType: string;
  entityId: string;
}

export function CommentsPanel({ entityType, entityId }: Props) {
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const { data: comments = [] } = useQuery({
    queryKey: qk.comments.byEntity(entityType, entityId),
    queryFn: () => listComments(entityType, entityId),
    enabled: !!entityId,
  });

  const create = useMutation({
    mutationFn: () =>
      createComment({ entity_type: entityType, entity_id: entityId, body, parent_id: replyTo }),
    onSuccess: () => {
      setBody("");
      setReplyTo(null);
      void qc.invalidateQueries({ queryKey: qk.comments.byEntity(entityType, entityId) });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteComment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.comments.byEntity(entityType, entityId) }),
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const roots = comments.filter((c) => !c.parent_id);
  const childrenOf = (id: string): CommentRow[] => comments.filter((c) => c.parent_id === id);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Comments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={replyTo ? "Write a reply…" : "Add a comment…"}
            rows={2}
          />
          <div className="flex items-center justify-end gap-2">
            {replyTo && (
              <Button variant="ghost" size="sm" onClick={() => setReplyTo(null)}>
                Cancel reply
              </Button>
            )}
            <Button
              size="sm"
              disabled={!body.trim() || create.isPending}
              onClick={() => create.mutate()}
            >
              Post
            </Button>
          </div>
        </div>

        {roots.length === 0 ? (
          <div className="rounded-sm border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            No comments yet. Start the discussion.
          </div>
        ) : (
          <ul className="space-y-3">
            {roots.map((c) => (
              <li key={c.id} className="rounded-sm border border-border p-2">
                <CommentNode c={c} onReply={setReplyTo} onDelete={(id) => del.mutate(id)} />
                {childrenOf(c.id).length > 0 && (
                  <ul className="ml-4 mt-2 space-y-2 border-l border-border pl-3">
                    {childrenOf(c.id).map((child) => (
                      <li key={child.id}>
                        <CommentNode
                          c={child}
                          onReply={setReplyTo}
                          onDelete={(id) => del.mutate(id)}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function CommentNode({
  c,
  onReply,
  onDelete,
}: {
  c: CommentRow;
  onReply: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatRelative(c.created_at)}</span>
        <div className="flex items-center gap-2">
          <button className="hover:text-foreground" onClick={() => onReply(c.id)}>
            Reply
          </button>
          <button
            className="hover:text-destructive"
            onClick={() => onDelete(c.id)}
            aria-label="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="whitespace-pre-wrap text-sm">{c.body}</div>
    </div>
  );
}

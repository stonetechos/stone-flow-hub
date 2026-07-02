/** EntityTags — attach/detach reusable tags on any supported entity. */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, X } from "lucide-react";
import {
  attachTag,
  createTag,
  detachTag,
  listAllTags,
  listEntityTags,
  type TaggableType,
} from "@/lib/tags/api";
import { toUserMessage } from "@/lib/errors";
import { toast } from "sonner";
import { qk } from "@/lib/query-keys";

interface Props {
  entityType: TaggableType;
  entityId: string;
}

export function EntityTags({ entityType, entityId }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const entityKey = ["entity-tags", entityType, entityId] as const;
  const { data: current = [] } = useQuery({
    queryKey: entityKey,
    queryFn: () => listEntityTags(entityType, entityId),
    enabled: !!entityId,
  });
  const { data: all = [] } = useQuery({ queryKey: qk.tags, queryFn: listAllTags });

  const attach = useMutation({
    mutationFn: (tagId: string) => attachTag(entityType, entityId, tagId),
    onSuccess: () => qc.invalidateQueries({ queryKey: entityKey }),
    onError: (e) => toast.error(toUserMessage(e)),
  });
  const detach = useMutation({
    mutationFn: (tagId: string) => detachTag(entityType, entityId, tagId),
    onSuccess: () => qc.invalidateQueries({ queryKey: entityKey }),
    onError: (e) => toast.error(toUserMessage(e)),
  });
  const create = useMutation({
    mutationFn: () => createTag(newName.trim()),
    onSuccess: async (t) => {
      setNewName("");
      await qc.invalidateQueries({ queryKey: qk.tags });
      attach.mutate(t.id);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const activeIds = new Set(current.map((t) => t.id));
  const suggestions = all.filter((t) => !activeIds.has(t.id));

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {current.map((t) => (
        <Badge
          key={t.id}
          variant="secondary"
          className="gap-1"
          style={{ backgroundColor: `${t.color}22`, color: t.color }}
        >
          {t.name}
          <button
            aria-label="Remove tag"
            onClick={() => detach.mutate(t.id)}
            className="opacity-70 hover:opacity-100"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-xs">
            <Plus className="h-3 w-3" /> Tag
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-2">
          <div className="space-y-2">
            <div className="flex gap-1">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="New tag…"
                className="h-8 text-xs"
              />
              <Button
                size="sm"
                className="h-8"
                disabled={!newName.trim() || create.isPending}
                onClick={() => create.mutate()}
              >
                Add
              </Button>
            </div>
            <div className="max-h-40 overflow-y-auto">
              {suggestions.length === 0 ? (
                <div className="px-1 py-2 text-xs text-muted-foreground">
                  No more tags. Create one above.
                </div>
              ) : (
                suggestions.map((t) => (
                  <button
                    key={t.id}
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left text-xs hover:bg-muted"
                    onClick={() => attach.mutate(t.id)}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: t.color }} />
                    {t.name}
                  </button>
                ))
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

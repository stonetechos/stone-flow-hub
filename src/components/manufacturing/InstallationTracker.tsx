/**
 * Per-piece installation tracker. Lists production_pieces for a production
 * order with quick status updates across the installation lifecycle.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Package2, Plus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  listPiecesForOrder, createPiece, updatePieceStatus, deletePiece,
  INSTALLATION_LABEL, INSTALLATION_STATUSES, type InstallationStatus,
} from "@/lib/installation/api";
import { toUserMessage } from "@/lib/errors";

const STATUS_TONE: Record<InstallationStatus, "default" | "secondary" | "outline" | "destructive"> = {
  ready: "outline",
  packed: "secondary",
  loaded: "secondary",
  dispatched: "default",
  delivered: "default",
  installed: "default",
  damaged: "destructive",
  replacement_required: "destructive",
  replaced: "secondary",
  returned: "destructive",
};

export function InstallationTracker({ orderId, projectId }: { orderId: string; projectId?: string | null }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["pieces", orderId], queryFn: () => listPiecesForOrder(orderId) });

  const [pieceNo, setPieceNo] = useState("");
  const [room, setRoom] = useState("");
  const [wall, setWall] = useState("");

  const add = useMutation({
    mutationFn: () => createPiece({
      production_order_id: orderId,
      project_id: projectId ?? null,
      piece_no: pieceNo.trim(),
      bundle_no: null, crate_no: null,
      room: room.trim() || null,
      elevation: null,
      wall: wall.trim() || null,
      drawing_ref: null, revision: null,
      install_sequence: null,
      status: "ready",
      notes: null,
    }),
    onSuccess: () => {
      toast.success("Piece added");
      setPieceNo(""); setRoom(""); setWall("");
      qc.invalidateQueries({ queryKey: ["pieces", orderId] });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: InstallationStatus }) => updatePieceStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pieces", orderId] }),
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deletePiece(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pieces", orderId] }),
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const rows = q.data ?? [];
  const counts = rows.reduce<Record<string, number>>((acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc; }, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Package2 className="h-4 w-4 text-primary" /> Installation Tracking
          <span className="ml-2 text-xs text-muted-foreground">
            {rows.length} piece{rows.length === 1 ? "" : "s"}
            {counts.installed ? ` · ${counts.installed} installed` : ""}
            {counts.damaged ? ` · ${counts.damaged} damaged` : ""}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <Input placeholder="Piece #" value={pieceNo} onChange={(e) => setPieceNo(e.target.value)} />
          <Input placeholder="Room" value={room} onChange={(e) => setRoom(e.target.value)} />
          <Input placeholder="Wall" value={wall} onChange={(e) => setWall(e.target.value)} />
          <Button size="sm" onClick={() => add.mutate()} disabled={!pieceNo.trim() || add.isPending}>
            {add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="mr-1 h-4 w-4" />Add</>}
          </Button>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pieces yet — add the first piece above.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {rows.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">{p.piece_no}</span>
                    <Badge variant={STATUS_TONE[p.status]}>{INSTALLATION_LABEL[p.status]}</Badge>
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {[p.room, p.elevation, p.wall].filter(Boolean).join(" · ") || "—"}
                    {p.bundle_no ? ` · bundle ${p.bundle_no}` : ""}
                    {p.crate_no ? ` · crate ${p.crate_no}` : ""}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Select value={p.status} onValueChange={(v) => setStatus.mutate({ id: p.id, status: v as InstallationStatus })}>
                    <SelectTrigger className="h-7 w-40 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {INSTALLATION_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{INSTALLATION_LABEL[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="icon" variant="ghost" onClick={() => remove.mutate(p.id)} title="Delete">
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
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

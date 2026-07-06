/**
 * Per-stage QC checklist. Seeds items from a template on first use, then
 * lets the inspector mark outcomes and add remarks.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ClipboardCheck, ShieldCheck, ShieldAlert, ShieldQuestion, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  listStageResults, listQcTemplates, seedResultsFromTemplate, updateResult,
  type QcOutcome,
} from "@/lib/qc/api";
import { toUserMessage } from "@/lib/errors";

const OUTCOMES: { value: QcOutcome; label: string }[] = [
  { value: "not_checked", label: "Not checked" },
  { value: "pass", label: "Pass" },
  { value: "fail", label: "Fail" },
  { value: "rework", label: "Rework" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export function QcChecklist({ stageId }: { stageId: string }) {
  const qc = useQueryClient();
  const [templateId, setTemplateId] = useState<string>("");

  const results = useQuery({
    queryKey: ["qc_results", stageId],
    queryFn: () => listStageResults(stageId),
  });
  const templates = useQuery({ queryKey: ["qc_templates"], queryFn: () => listQcTemplates(true) });

  const seed = useMutation({
    mutationFn: () => seedResultsFromTemplate(stageId, templateId),
    onSuccess: () => { toast.success("Checklist added"); qc.invalidateQueries({ queryKey: ["qc_results", stageId] }); },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateResult>[1] }) => updateResult(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["qc_results", stageId] }),
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const rows = results.data ?? [];
  const passed = rows.filter((r) => r.outcome === "pass" || r.outcome === "approved").length;
  const failed = rows.filter((r) => r.outcome === "fail" || r.outcome === "rejected").length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ClipboardCheck className="h-4 w-4 text-primary" /> Quality Control
          {rows.length > 0 && (
            <span className="ml-2 flex items-center gap-1 text-xs">
              <Badge variant="default" className="bg-emerald-600">{passed} pass</Badge>
              {failed > 0 && <Badge variant="destructive">{failed} fail</Badge>}
              <Badge variant="outline">{rows.length} items</Badge>
            </span>
          )}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Select value={templateId} onValueChange={setTemplateId}>
            <SelectTrigger className="h-8 w-48 text-xs"><SelectValue placeholder="Add checklist…" /></SelectTrigger>
            <SelectContent>
              {(templates.data ?? []).map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" disabled={!templateId || seed.isPending} onClick={() => seed.mutate()}>
            {seed.isPending && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />} Add
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No QC items yet — pick a template above to seed the checklist.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => {
              const Icon =
                r.outcome === "pass" || r.outcome === "approved" ? ShieldCheck :
                r.outcome === "fail" || r.outcome === "rejected" ? ShieldAlert :
                ShieldQuestion;
              const tone =
                r.outcome === "pass" || r.outcome === "approved" ? "text-emerald-600" :
                r.outcome === "fail" || r.outcome === "rejected" ? "text-destructive" :
                r.outcome === "rework" ? "text-amber-600" : "text-muted-foreground";
              return (
                <li key={r.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Icon className={`h-4 w-4 ${tone}`} />
                      <span className="font-medium">{r.label}</span>
                    </div>
                    <Select
                      value={r.outcome}
                      onValueChange={(v) => update.mutate({ id: r.id, patch: { outcome: v as QcOutcome } })}
                    >
                      <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {OUTCOMES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Textarea
                    className="mt-2 text-xs"
                    placeholder="Inspector remarks…"
                    defaultValue={r.remarks ?? ""}
                    onBlur={(e) => {
                      if ((e.target.value || null) !== r.remarks) {
                        update.mutate({ id: r.id, patch: { remarks: e.target.value || null } });
                      }
                    }}
                    rows={1}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

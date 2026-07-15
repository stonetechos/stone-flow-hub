/**
 * QC Templates master — reusable checklists per stone-industry inspection
 * category. The list uses the shared MasterListPage; drilling in shows the
 * items editor.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LoadingBlock } from "@/components/layout/States";
import { MasterListPage } from "@/components/masters/MasterListPage";
import type { MasterConfig } from "@/lib/masters/config";
import { toUserMessage } from "@/lib/errors";

const CONFIG: MasterConfig = {
  table: "qc_templates" as never,
  route: "qc-templates",
  title: "QC Templates",
  singular: "QC Template",
  description:
    "Reusable checklists by inspection category — surface, dimension, thickness, edge, colour, crack, packing, dispatch.",
  extraFields: [
    { key: "category", label: "Category", type: "text", required: true, placeholder: "surface / dimension / thickness / edge / colour / crack / packing / dispatch" },
  ],
  extraColumns: [{ key: "category", label: "Category" }],
};

export const Route = createFileRoute("/_authenticated/masters/qc-templates")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({ template: (s.template as string) || undefined }),
  component: QcTemplatesPage,
});

function QcTemplatesPage() {
  const { template } = Route.useSearch();
  if (template) return <TemplateItemsEditor templateId={template} />;
  return (
    <div>
      <MasterListPage config={CONFIG} />
      <p className="mt-4 text-xs text-muted-foreground">
        Tip: open a template in the URL as <code>?template=&lt;id&gt;</code> to manage its checklist items,
        or use the shortcut on the manufacturing detail page.
      </p>
    </div>
  );
}

function TemplateItemsEditor({ templateId }: { templateId: string }) {
  const qc = useQueryClient();
  const [label, setLabel] = useState("");

  const tpl = useQuery({
    queryKey: ["qc_template", templateId],
    queryFn: async () => {
      const { data, error } = await supabase.from("qc_templates" as never).select("*").eq("id", templateId).maybeSingle();
      if (error) throw error;
      return data as { id: string; name: string; category: string } | null;
    },
  });
  const items = useQuery({
    queryKey: ["qc_template_items", templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("qc_template_items" as never)
        .select("*")
        .eq("template_id", templateId)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as unknown as Array<{ id: string; label: string; sort_order: number }>;
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("qc_template_items" as never).insert({
        template_id: templateId, label: label.trim(), sort_order: (items.data?.length ?? 0) * 10 + 10,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => { setLabel(""); qc.invalidateQueries({ queryKey: ["qc_template_items", templateId] }); },
    onError: (e) => toast.error(toUserMessage(e)),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("qc_template_items" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["qc_template_items", templateId] }),
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const list = useMemo(() => items.data ?? [], [items.data]);

  if (tpl.isLoading) return <LoadingBlock />;

  return (
    <div>
      <div className="mb-2">
        <Link to="/masters/qc-templates" search={{ template: undefined }} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> All templates
        </Link>
      </div>
      <PageHeader title={tpl.data?.name ?? "Template"} subtitle={tpl.data?.category ? `Category · ${tpl.data.category}` : undefined} />
      <Card>
        <CardHeader><CardTitle className="text-sm">Checklist items</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="New checklist item…" value={label} onChange={(e) => setLabel(e.target.value)} />
            <Button onClick={() => add.mutate()} disabled={!label.trim() || add.isPending}>
              {add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="mr-1 h-4 w-4" />Add</>}
            </Button>
          </div>
          <ul className="divide-y rounded-md border">
            {list.length === 0 ? (
              <li className="p-4 text-sm text-muted-foreground">No items yet.</li>
            ) : list.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <span>{i.label}</span>
                <Button size="icon" variant="ghost" onClick={() => remove.mutate(i.id)} title="Remove">
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

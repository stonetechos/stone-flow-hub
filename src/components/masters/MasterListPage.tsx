/**
 * Shared master-data CRUD page. Drives all 12 stone-industry master routes
 * from a single MasterConfig — one component, zero duplicated CRUD logic.
 */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, Layers, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Tabs, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { RowActions } from "@/components/data/RowActions";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import { DataToolbar } from "@/components/data/DataToolbar";
import { DataTableShell } from "@/components/data/DataTableShell";
import { ColumnsMenu, type ColumnDef } from "@/components/data/ColumnsMenu";
import { DensityMenu } from "@/components/data/DensityMenu";
import { useTablePrefs } from "@/hooks/use-table-prefs";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useRoles, Can } from "@/hooks/use-roles";
import { toUserMessage } from "@/lib/errors";
import type { MasterConfig, MasterField } from "@/lib/masters/config";
import { COMMON_FIELDS, COMMON_TRAILING_FIELDS } from "@/lib/masters/config";
import { BulkImportDialog } from "@/components/masters/BulkImportDialog";

type Row = { id: string; code: string; name: string; is_active: boolean; sort_order: number } & Record<string, unknown>;

export function MasterListPage({ config }: { config: MasterConfig }) {
  const qc = useQueryClient();
  const roles = useRoles();
  const [tab, setTab] = useState<"active" | "inactive">("active");
  const [query, setQuery] = useState("");
  const q = useDebouncedValue(query, 200);
  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [importing, setImporting] = useState(false);

  const queryKey = [config.table, "list", tab, q] as const;
  const list = useQuery({
    queryKey,
    queryFn: async () => {
      let qb = supabase
        .from(config.table)
        .select("*")
        .eq("is_active", tab === "active")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true })
        .limit(500);
      if (q.trim()) qb = qb.or(`name.ilike.%${q}%,code.ilike.%${q}%`);
      const { data, error } = await qb;
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: [config.table] });
    qc.invalidateQueries({ queryKey: ["search"] });
  };

  const save = useMutation({
    mutationFn: async (payload: Record<string, unknown> & { id?: string }) => {
      const { id, ...rest } = payload;
      // Generic master writes — schema is validated by DB constraints.
      const tbl = supabase.from(config.table) as unknown as {
        update: (v: Record<string, unknown>) => { eq: (c: string, id: string) => Promise<{ error: unknown }> };
        insert: (v: Record<string, unknown>) => Promise<{ error: unknown }>;
      };
      if (id) {
        const { error } = await tbl.update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await tbl.insert(rest);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(`${config.singular} saved`);
      setEditing(null);
      setCreating(false);
      invalidateAll();
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const toggleActive = useMutation({
    mutationFn: async (row: Row) => {
      const { error } = await supabase
        .from(config.table)
        .update({ is_active: !row.is_active })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Updated");
      invalidateAll();
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const del = useMutation({
    mutationFn: async (row: Row) => {
      const { error } = await supabase.from(config.table).delete().eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${config.singular} deleted`);
      setDeleteTarget(null);
      invalidateAll();
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const fields = useMemo<MasterField[]>(
    () => [...COMMON_FIELDS, ...config.extraFields, ...COMMON_TRAILING_FIELDS],
    [config],
  );

  const { prefs, setDensity, toggleColumn, isHidden } = useTablePrefs(
    `masters:${config.table}`,
  );

  const columnDefs: ColumnDef[] = useMemo(
    () => [
      { key: "code", label: "Code", required: true },
      { key: "name", label: "Name", required: true },
      ...config.extraColumns.map((c) => ({ key: c.key, label: c.label })),
      { key: "sort_order", label: "Sort" },
      { key: "is_active", label: "Status" },
    ],
    [config],
  );

  return (
    <div>
      <PageHeader
        title={config.title}
        subtitle={config.description}
      />

      <DataToolbar
        count={list.data?.length}
        search={query}
        onSearchChange={setQuery}
        searchPlaceholder={`Search ${config.title.toLowerCase()}…`}
        primaryFilter={
          <Tabs value={tab} onValueChange={(v) => setTab(v as "active" | "inactive")}>
            <TabsList className="h-8">
              <TabsTrigger value="active" className="h-6 text-xs">Active</TabsTrigger>
              <TabsTrigger value="inactive" className="h-6 text-xs">Inactive</TabsTrigger>
            </TabsList>
          </Tabs>
        }
        columns={
          <ColumnsMenu columns={columnDefs} isHidden={isHidden} onToggle={toggleColumn} />
        }
        density={<DensityMenu density={prefs.density} onChange={setDensity} />}
        action={
          <Can anyRole={["admin", "sales_manager"]}>
            <div className="flex items-center gap-1.5">
              <Button size="sm" variant="outline" className="h-8" onClick={() => setImporting(true)}>
                <Upload className="mr-1.5 h-3.5 w-3.5" /> Import
              </Button>
              <Button size="sm" className="h-8" onClick={() => setCreating(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> New {config.singular}
              </Button>
            </div>
          </Can>
        }
      />

      {list.isLoading ? (
        <SkeletonTable />
      ) : list.isError ? (
        <ErrorBlock message={toUserMessage(list.error)} onRetry={() => void list.refetch()} />
      ) : !list.data?.length ? (
        <EmptyState
          icon={<Layers className="h-6 w-6" />}
          title={`No ${config.title.toLowerCase()}`}
          message={
            roles.hasAnyRole(["admin", "sales_manager"])
              ? `Create the first ${config.singular.toLowerCase()} to get started.`
              : "Ask an admin to add records."
          }
        />
      ) : (
        <DataTableShell density={prefs.density}>
          <Table>
            <TableHeader>
              <TableRow>
                {!isHidden("code") && <TableHead className="w-[140px]">Code</TableHead>}
                {!isHidden("name") && <TableHead>Name</TableHead>}
                {config.extraColumns.map((c) =>
                  isHidden(c.key) ? null : (
                    <TableHead key={c.key}>{c.label}</TableHead>
                  ),
                )}
                {!isHidden("sort_order") && <TableHead className="w-[100px]">Sort</TableHead>}
                {!isHidden("is_active") && <TableHead className="w-[100px]">Status</TableHead>}
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.data.map((row) => (
                <TableRow key={row.id}>
                  {!isHidden("code") && (
                    <TableCell className="font-mono text-xs">{row.code}</TableCell>
                  )}
                  {!isHidden("name") && (
                    <TableCell className="font-medium">{row.name}</TableCell>
                  )}
                  {config.extraColumns.map((c) =>
                    isHidden(c.key) ? null : (
                      <TableCell key={c.key} className="text-sm text-muted-foreground">
                        {formatCell(row[c.key])}
                      </TableCell>
                    ),
                  )}
                  {!isHidden("sort_order") && (
                    <TableCell className="text-sm text-muted-foreground">
                      {row.sort_order}
                    </TableCell>
                  )}
                  {!isHidden("is_active") && (
                    <TableCell>
                      <Badge variant={row.is_active ? "default" : "secondary"}>
                        {row.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  )}
                  <TableCell>
                    <RowActions
                      onEdit={() => setEditing(row)}
                      onDelete={
                        roles.hasAnyRole(["admin", "sales_manager"])
                          ? () => setDeleteTarget(row)
                          : undefined
                      }
                      extra={
                        roles.hasAnyRole(["admin", "sales_manager"]) ? (
                          <DropdownMenuItem onSelect={() => toggleActive.mutate(row)}>
                            Mark {row.is_active ? "inactive" : "active"}
                          </DropdownMenuItem>
                        ) : null
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
      )}


      <MasterFormDialog
        open={creating || !!editing}
        onOpenChange={(v) => {
          if (!v) {
            setCreating(false);
            setEditing(null);
          }
        }}
        config={config}
        fields={fields}
        initial={editing}
        submitting={save.isPending}
        onSubmit={(values) => save.mutate(editing ? { ...values, id: editing.id } : values)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title={`Delete ${config.singular.toLowerCase()}?`}
        description={`"${deleteTarget?.name ?? ""}" will be removed. This cannot be undone.`}
        confirmLabel="Delete"
        busy={del.isPending}
        onConfirm={() => { if (deleteTarget) del.mutate(deleteTarget); }}
      />

      <BulkImportDialog
        open={importing}
        onOpenChange={setImporting}
        table={config.table}
        templateName={config.route}
        columns={[
          { key: "code", label: "Code", required: true },
          { key: "name", label: "Name", required: true },
          ...config.extraFields.map((f) => ({ key: f.key, label: f.label, type: f.type as "text" | "number" | "boolean" | undefined, required: f.required })),
          { key: "sort_order", label: "Sort order", type: "number" as const },
          { key: "notes", label: "Notes" },
        ]}
        onDone={() => invalidateAll()}
      />
    </div>
  );
}

function formatCell(v: unknown): string {
  if (v == null || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (Array.isArray(v)) return v.join(", ") || "—";
  return String(v);
}

function MasterFormDialog({
  open, onOpenChange, config, fields, initial, submitting, onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  config: MasterConfig;
  fields: MasterField[];
  initial: Row | null;
  submitting: boolean;
  onSubmit: (values: Record<string, unknown>) => void;
}) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [active, setActive] = useState(true);

  // Reset when opened.
  useEffect(() => {
    if (open) {
      const seed: Record<string, unknown> = {};
      for (const f of fields) seed[f.key] = initial?.[f.key] ?? (f.type === "number" ? "" : "");
      setValues(seed);
      setActive(initial?.is_active ?? true);
    }
  }, [open, initial, fields]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {initial ? `Edit ${config.singular}` : `New ${config.singular}`}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const payload: Record<string, unknown> = { is_active: active };
            for (const f of fields) {
              const v = values[f.key];
              if (f.type === "number") {
                if (v === "" || v == null) {
                  if (f.required) return toast.error(`${f.label} required`);
                  payload[f.key] = null;
                } else payload[f.key] = Number(v);
              } else {
                if (f.required && !String(v ?? "").trim()) return toast.error(`${f.label} required`);
                payload[f.key] = v === "" ? null : v;
              }
            }
            onSubmit(payload);
          }}
          className="space-y-3"
        >
          {fields.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label>{f.label}{f.required && <span className="text-destructive"> *</span>}</Label>
              {f.type === "textarea" ? (
                <Textarea
                  value={String(values[f.key] ?? "")}
                  onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  rows={2}
                />
              ) : (
                <Input
                  type={f.type === "number" ? "number" : "text"}
                  value={String(values[f.key] ?? "")}
                  onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  step="any"
                />
              )}
              {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
            </div>
          ))}
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label>Active</Label>
              <p className="text-xs text-muted-foreground">Inactive records are hidden from pickers.</p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

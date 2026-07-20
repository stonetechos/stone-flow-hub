/**
 * Generic CSV bulk-import dialog. Any master or entity table can plug in by
 * providing an allow-list of columns. Rows are validated against the columns
 * before write; the result is written in a single insert and logged to
 * `bulk_imports` for audit.
 */
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Upload, FileText, Download, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { parseCsv, toCsv, downloadCsv } from "@/lib/csv/parse";
import { toUserMessage } from "@/lib/errors";

export type BulkColumn = {
  key: string;
  label: string;
  type?: "text" | "number" | "boolean";
  required?: boolean;
};

export function BulkImportDialog({
  open,
  onOpenChange,
  table,
  columns,
  templateName,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  table: string;
  columns: BulkColumn[];
  templateName: string;
  onDone?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [filename, setFilename] = useState<string>("");

  const headers = useMemo(() => columns.map((c) => c.key), [columns]);

  function reset() {
    setRows([]);
    setErrors([]);
    setFilename("");
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleFile(file: File) {
    setFilename(file.name);
    const r = new FileReader();
    r.onload = () => {
      const { headers: hdrs, rows: parsed } = parseCsv(String(r.result ?? ""));
      const missing = columns.filter((c) => c.required && !hdrs.includes(c.key)).map((c) => c.key);
      if (missing.length) {
        setErrors([`Missing required columns: ${missing.join(", ")}`]);
        setRows([]);
        return;
      }
      const errs: string[] = [];
      const clean: Record<string, unknown>[] = [];
      parsed.forEach((rec, idx) => {
        const row: Record<string, unknown> = {};
        for (const c of columns) {
          const raw = rec[c.key];
          if (raw == null || raw === "") {
            if (c.required) errs.push(`Row ${idx + 2}: ${c.key} is required`);
            continue;
          }
          if (c.type === "number") {
            const n = Number(raw);
            if (Number.isNaN(n)) {
              errs.push(`Row ${idx + 2}: ${c.key} not a number`);
              continue;
            }
            row[c.key] = n;
          } else if (c.type === "boolean") {
            row[c.key] = /^(1|true|yes|y|active)$/i.test(String(raw));
          } else {
            row[c.key] = String(raw);
          }
        }
        clean.push(row);
      });
      setRows(clean);
      setErrors(errs);
    };
    r.readAsText(file);
  }

  async function importNow() {
    setBusy(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from(table as any) as any).insert(rows);
      if (error) throw error;
      // Audit — best-effort, non-blocking.
      await supabase.from("bulk_imports" as never).insert({
        target_table: table,
        filename,
        row_count: rows.length,
        success_count: rows.length,
        error_count: errors.length,
        errors: errors,
      } as never);
      toast.success(`Imported ${rows.length} rows`);
      onDone?.();
      reset();
      onOpenChange(false);
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function downloadTemplate() {
    const sample: Record<string, unknown> = {};
    for (const c of columns) sample[c.key] = "";
    downloadCsv(`${templateName}.csv`, toCsv(headers, [sample]));
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk import · {templateName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={downloadTemplate}>
              <Download className="mr-1.5 h-4 w-4" /> Download CSV template
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <Button size="sm" onClick={() => inputRef.current?.click()}>
              <Upload className="mr-1.5 h-4 w-4" /> Choose CSV
            </Button>
            {filename && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <FileText className="h-3 w-3" /> {filename}
              </span>
            )}
          </div>

          <div className="rounded-md border bg-muted/30 p-3 text-xs">
            <p className="mb-1 font-medium">Columns</p>
            <div className="flex flex-wrap gap-1">
              {columns.map((c) => (
                <Badge
                  key={c.key}
                  variant={c.required ? "default" : "outline"}
                  className="font-mono"
                >
                  {c.key}
                  {c.required ? " *" : ""}
                </Badge>
              ))}
            </div>
          </div>

          {errors.length > 0 && (
            <div className="max-h-32 overflow-auto rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
              <div className="mb-1 flex items-center gap-1 font-medium">
                <AlertTriangle className="h-3 w-3" /> {errors.length} validation issue(s)
              </div>
              <ul className="list-disc pl-4">
                {errors.slice(0, 20).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          {rows.length > 0 && (
            <div className="rounded-md border p-3 text-sm">
              Ready to import <strong>{rows.length}</strong> row{rows.length === 1 ? "" : "s"}.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={importNow} disabled={busy || rows.length === 0}>
            {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

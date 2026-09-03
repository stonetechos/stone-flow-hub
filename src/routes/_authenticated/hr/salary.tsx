/**
 * Salary structures — the CTC package behind every payslip. This screen owns
 * three related things: the component master, the per-employee structure
 * builder, and the statutory settings the payroll engine reads.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import {
  deleteSalaryComponent,
  getPayrollSettings,
  listSalaryComponents,
  listSalaryStructures,
  savePayrollSettings,
  saveSalaryStructure,
  upsertSalaryComponent,
} from "@/lib/hr/payroll-api";
import {
  buildStructureFromCtc,
  grossFromLines,
  type SalaryComponentDef,
} from "@/lib/hr/payroll-engine";
import { listEmployees } from "@/lib/workforce/api";
import { formatInr } from "@/lib/format";
import { toUserMessage } from "@/lib/errors";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/hr/salary")({
  head: () => ({
    meta: [
      { title: "Salary Structures — Human Resources" },
      {
        name: "description",
        content: "CTC packages, salary components and statutory payroll settings.",
      },
    ],
  }),
  component: SalaryPage,
});

const CALC_LABEL: Record<string, string> = {
  fixed: "Fixed amount",
  percent_of_basic: "% of basic",
  percent_of_ctc: "% of CTC",
  balance: "Balance of CTC",
};

interface ComponentDraft {
  name: string;
  kind: "earning" | "deduction";
  calc_type: "fixed" | "percent_of_basic" | "percent_of_ctc" | "balance";
  value: string;
  is_taxable: boolean;
  pf_applicable: boolean;
  esi_applicable: boolean;
}

const EMPTY_COMPONENT: ComponentDraft = {
  name: "",
  kind: "earning",
  calc_type: "fixed",
  value: "0",
  is_taxable: true,
  pf_applicable: false,
  esi_applicable: true,
};

function SalaryPage() {
  const qc = useQueryClient();
  const roles = useRoles();
  const canWrite = roles.hasAnyRole(["admin", "hr"]);

  const [draft, setDraft] = useState<ComponentDraft>(EMPTY_COMPONENT);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [ctc, setCtc] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 10));

  const components = useQuery({
    queryKey: ["hr", "salary-components"],
    queryFn: listSalaryComponents,
  });
  const structures = useQuery({
    queryKey: ["hr", "salary-structures"],
    queryFn: () => listSalaryStructures(),
  });
  const employees = useQuery({
    queryKey: ["wf", "employees", "list", ""],
    queryFn: () => listEmployees(""),
  });
  const settings = useQuery({ queryKey: ["hr", "payroll-settings"], queryFn: getPayrollSettings });

  const employeeName = useMemo(
    () => new Map((employees.data ?? []).map((e) => [e.id, e.full_name])),
    [employees.data],
  );

  const previewLines = useMemo(() => {
    const amount = Number(ctc);
    if (!Number.isFinite(amount) || amount <= 0) return [];
    const defs: SalaryComponentDef[] = (components.data ?? [])
      .filter((c) => c.is_active)
      .map((c) => ({
        id: c.id,
        name: c.name,
        kind: c.kind as "earning" | "deduction",
        calc_type: c.calc_type as SalaryComponentDef["calc_type"],
        value: Number(c.value),
        is_taxable: c.is_taxable,
        pf_applicable: c.pf_applicable,
        esi_applicable: c.esi_applicable,
        sort_order: c.sort_order,
      }));
    return buildStructureFromCtc(amount, defs);
  }, [ctc, components.data]);

  const addComponent = useMutation({
    mutationFn: () =>
      upsertSalaryComponent({
        name: draft.name,
        kind: draft.kind,
        calc_type: draft.calc_type,
        value: Number(draft.value || 0),
        is_taxable: draft.is_taxable,
        pf_applicable: draft.pf_applicable,
        esi_applicable: draft.esi_applicable,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr", "salary-components"] });
      setDraft(EMPTY_COMPONENT);
      toast.success("Component saved");
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const removeComponent = useMutation({
    mutationFn: (id: string) => deleteSalaryComponent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr", "salary-components"] });
      setPendingDelete(null);
      toast.success("Component removed");
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const saveStructure = useMutation({
    mutationFn: () =>
      saveSalaryStructure({
        employee_id: employeeId,
        effective_from: effectiveFrom,
        ctc_annual: Number(ctc || 0),
        lines: previewLines,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr", "salary-structures"] });
      setCtc("");
      setEmployeeId("");
      toast.success("Salary structure saved");
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const saveSettings = useMutation({
    mutationFn: (patch: Parameters<typeof savePayrollSettings>[0]) => savePayrollSettings(patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr", "payroll-settings"] });
      toast.success("Payroll settings updated");
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  return (
    <>
      <PageHeader
        title="Salary structures"
        subtitle="Define components once, then expand a CTC into a monthly package per employee."
        eyebrow="Human Resources"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ---------------- Component master ---------------- */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Salary components</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {canWrite ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="component-name">Name</Label>
                  <Input
                    id="component-name"
                    value={draft.name}
                    placeholder="Basic, HRA, Special allowance…"
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select
                    value={draft.kind}
                    onValueChange={(v) =>
                      setDraft((d) => ({ ...d, kind: v as "earning" | "deduction" }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="earning">Earning</SelectItem>
                      <SelectItem value="deduction">Deduction</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Calculation</Label>
                  <Select
                    value={draft.calc_type}
                    onValueChange={(v) =>
                      setDraft((d) => ({ ...d, calc_type: v as ComponentDraft["calc_type"] }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CALC_LABEL).map(([k, label]) => (
                        <SelectItem key={k} value={k}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="component-value">Value</Label>
                  <Input
                    id="component-value"
                    inputMode="decimal"
                    value={draft.value}
                    disabled={draft.calc_type === "balance"}
                    onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value }))}
                  />
                </div>
                <div className="flex items-end gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={draft.pf_applicable}
                      onCheckedChange={(v) => setDraft((d) => ({ ...d, pf_applicable: v }))}
                    />
                    PF
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={draft.is_taxable}
                      onCheckedChange={(v) => setDraft((d) => ({ ...d, is_taxable: v }))}
                    />
                    Taxable
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <Button
                    onClick={() => addComponent.mutate()}
                    disabled={addComponent.isPending || !draft.name.trim()}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {addComponent.isPending ? "Saving…" : "Add component"}
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="min-w-0 overflow-x-auto">
              {components.isLoading ? (
                <SkeletonTable />
              ) : components.isError ? (
                <ErrorBlock message={toUserMessage(components.error)} />
              ) : (components.data ?? []).length === 0 ? (
                <EmptyState
                  title="No components yet"
                  message="Add Basic, HRA and a balance component to start building CTC packages."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Component</TableHead>
                      <TableHead>Calculation</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(components.data ?? []).map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">
                          {c.name}
                          <Badge variant="outline" className="ml-2">
                            {c.kind === "earning" ? "Earning" : "Deduction"}
                          </Badge>
                        </TableCell>
                        <TableCell>{CALC_LABEL[c.calc_type] ?? c.calc_type}</TableCell>
                        <TableCell className="text-right">
                          {c.calc_type === "fixed"
                            ? formatInr(Number(c.value))
                            : c.calc_type === "balance"
                              ? "—"
                              : `${Number(c.value)}%`}
                        </TableCell>
                        <TableCell className="text-right">
                          {canWrite ? (
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label={`Remove ${c.name}`}
                              onClick={() => setPendingDelete(c.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ---------------- Structure builder ---------------- */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assign a package</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {canWrite ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>Employee</Label>
                  <Select value={employeeId} onValueChange={setEmployeeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {(employees.data ?? []).map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="ctc">Annual CTC</Label>
                  <Input
                    id="ctc"
                    inputMode="numeric"
                    value={ctc}
                    placeholder="600000"
                    onChange={(e) => setCtc(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="effective-from">Effective from</Label>
                  <Input
                    id="effective-from"
                    type="date"
                    value={effectiveFrom}
                    onChange={(e) => setEffectiveFrom(e.target.value)}
                  />
                </div>
              </div>
            ) : null}

            {previewLines.length > 0 ? (
              <div className="space-y-2">
                <div className="divide-border divide-y rounded-md border text-sm">
                  {previewLines.map((l) => (
                    <div key={l.label} className="flex justify-between px-3 py-1.5">
                      <span>{l.label}</span>
                      <span className="tabular-nums">{formatInr(l.monthly_amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between px-3 py-1.5 font-medium">
                    <span>Monthly gross</span>
                    <span className="tabular-nums">{formatInr(grossFromLines(previewLines))}</span>
                  </div>
                </div>
                {canWrite ? (
                  <Button
                    onClick={() => saveStructure.mutate()}
                    disabled={saveStructure.isPending || !employeeId}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {saveStructure.isPending ? "Saving…" : "Save structure"}
                  </Button>
                ) : null}
              </div>
            ) : null}

            <div className="min-w-0 overflow-x-auto">
              {structures.isLoading ? (
                <SkeletonTable />
              ) : (structures.data ?? []).length === 0 ? (
                <EmptyState
                  title="No salary structures"
                  message="Assign a CTC package so payroll can generate payslips for this employee."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Effective</TableHead>
                      <TableHead className="text-right">Annual CTC</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(structures.data ?? []).map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">
                          {employeeName.get(s.employee_id) ?? "—"}
                        </TableCell>
                        <TableCell>{s.effective_from}</TableCell>
                        <TableCell className="text-right">
                          {formatInr(Number(s.ctc_annual))}
                        </TableCell>
                        <TableCell>
                          <Badge variant={s.status === "active" ? "default" : "outline"}>
                            {s.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ---------------- Statutory settings ---------------- */}
      {canWrite && settings.data ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Statutory settings</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                { key: "pf_employee_pct", label: "PF employee %" },
                { key: "pf_employer_pct", label: "PF employer %" },
                { key: "pf_wage_ceiling", label: "PF wage ceiling" },
                { key: "esi_employee_pct", label: "ESI employee %" },
                { key: "esi_employer_pct", label: "ESI employer %" },
                { key: "esi_wage_ceiling", label: "ESI wage ceiling" },
                { key: "standard_deduction", label: "Standard deduction" },
                { key: "overtime_multiplier", label: "Overtime multiplier" },
              ] as const
            ).map(({ key, label }) => (
              <div key={key}>
                <Label htmlFor={key}>{label}</Label>
                <Input
                  id={key}
                  inputMode="decimal"
                  defaultValue={String(settings.data[key])}
                  onBlur={(e) => {
                    const value = Number(e.target.value);
                    if (Number.isFinite(value) && value !== settings.data[key])
                      saveSettings.mutate({ [key]: value });
                  }}
                />
              </div>
            ))}
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={settings.data.tds_enabled}
                  onCheckedChange={(v) => saveSettings.mutate({ tds_enabled: v })}
                />
                Deduct TDS
              </label>
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={settings.data.pf_limit_to_ceiling}
                  onCheckedChange={(v) => saveSettings.mutate({ pf_limit_to_ceiling: v })}
                />
                Cap PF at ceiling
              </label>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title="Remove this salary component?"
        description="Existing structures keep their saved lines; only new packages are affected."
        tone="danger"
        confirmLabel="Remove"
        busy={removeComponent.isPending}
        onConfirm={() => pendingDelete && removeComponent.mutate(pendingDelete)}
      />
    </>
  );
}

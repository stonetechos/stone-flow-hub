/**
 * Salary structures — the CTC package behind every payslip. This screen owns
 * three related things: the component master, the per-employee structure
 * builder, and the statutory settings the payroll engine reads.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { transliterateName } from "@/lib/i18n/transliterate";
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
  component: SalaryView,
});

const CALC_LABEL_KEYS: Record<string, string> = {
  fixed: "payroll.salary.components.calcTypes.fixed",
  percent_of_basic: "payroll.salary.components.calcTypes.percent_of_basic",
  percent_of_ctc: "payroll.salary.components.calcTypes.percent_of_ctc",
  balance: "payroll.salary.components.calcTypes.balance",
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

export function SalaryView() {
  const { t, i18n } = useTranslation();
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
    () =>
      new Map(
        (employees.data ?? []).map((e) => [e.id, transliterateName(e.full_name, i18n.language)]),
      ),
    [employees.data, i18n.language],
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
      toast.success(t("payroll.salary.toasts.componentAdded"));
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const removeComponent = useMutation({
    mutationFn: (id: string) => deleteSalaryComponent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr", "salary-components"] });
      setPendingDelete(null);
      toast.success(t("payroll.salary.toasts.componentRemoved"));
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
      toast.success(t("payroll.salary.toasts.structureSaved"));
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const saveSettings = useMutation({
    mutationFn: (patch: Parameters<typeof savePayrollSettings>[0]) => savePayrollSettings(patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr", "payroll-settings"] });
      toast.success(t("payroll.salary.toasts.settingsUpdated"));
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  return (
    <>
      <PageHeader
        title={t("payroll.salary.title")}
        subtitle={t("payroll.salary.subtitle")}
        eyebrow={t("payroll.salary.eyebrow")}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ---------------- Component master ---------------- */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("payroll.salary.components.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {canWrite ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="component-name">{t("payroll.salary.components.name")}</Label>
                  <Input
                    id="component-name"
                    value={draft.name}
                    placeholder={t("payroll.salary.components.namePlaceholder")}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>{t("payroll.salary.components.type")}</Label>
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
                      <SelectItem value="earning">
                        {t("payroll.salary.components.earning")}
                      </SelectItem>
                      <SelectItem value="deduction">
                        {t("payroll.salary.components.deduction")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("payroll.salary.components.calculation")}</Label>
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
                      {Object.entries(CALC_LABEL_KEYS).map(([k, labelKey]) => (
                        <SelectItem key={k} value={k}>
                          {t(labelKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="component-value">{t("payroll.salary.components.value")}</Label>
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
                    {t("payroll.salary.components.pf")}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={draft.is_taxable}
                      onCheckedChange={(v) => setDraft((d) => ({ ...d, is_taxable: v }))}
                    />
                    {t("payroll.salary.components.taxable")}
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <Button
                    onClick={() => addComponent.mutate()}
                    disabled={addComponent.isPending || !draft.name.trim()}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {addComponent.isPending
                      ? t("payroll.salary.components.saving")
                      : t("payroll.salary.components.addComponent")}
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
                  title={t("payroll.salary.components.empty.noComponents")}
                  message={t("payroll.salary.components.empty.noComponentsDesc")}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("payroll.salary.components.table.component")}</TableHead>
                      <TableHead>{t("payroll.salary.components.table.calculation")}</TableHead>
                      <TableHead className="text-right">
                        {t("payroll.salary.components.table.value")}
                      </TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(components.data ?? []).map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">
                          {c.name}
                          <Badge variant="outline" className="ml-2">
                            {c.kind === "earning"
                              ? t("payroll.salary.components.earning")
                              : t("payroll.salary.components.deduction")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {CALC_LABEL_KEYS[c.calc_type]
                            ? t(CALC_LABEL_KEYS[c.calc_type])
                            : c.calc_type}
                        </TableCell>
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
            <CardTitle className="text-base">{t("payroll.salary.packages.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {canWrite ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>{t("payroll.salary.packages.employee")}</Label>
                  <Select value={employeeId} onValueChange={setEmployeeId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("payroll.salary.packages.selectEmployee")} />
                    </SelectTrigger>
                    <SelectContent>
                      {(employees.data ?? []).map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {transliterateName(e.full_name, i18n.language)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="ctc">{t("payroll.salary.packages.annualCtc")}</Label>
                  <Input
                    id="ctc"
                    inputMode="numeric"
                    value={ctc}
                    placeholder="600000"
                    onChange={(e) => setCtc(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="effective-from">
                    {t("payroll.salary.packages.effectiveFrom")}
                  </Label>
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
                    <span>{t("payroll.salary.packages.monthlyGross")}</span>
                    <span className="tabular-nums">{formatInr(grossFromLines(previewLines))}</span>
                  </div>
                </div>
                {canWrite ? (
                  <Button
                    onClick={() => saveStructure.mutate()}
                    disabled={saveStructure.isPending || !employeeId}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {saveStructure.isPending
                      ? t("payroll.salary.packages.saving")
                      : t("payroll.salary.packages.saveStructure")}
                  </Button>
                ) : null}
              </div>
            ) : null}

            <div className="min-w-0 overflow-x-auto">
              {structures.isLoading ? (
                <SkeletonTable />
              ) : (structures.data ?? []).length === 0 ? (
                <EmptyState
                  title={t("payroll.salary.packages.empty.noStructures")}
                  message={t("payroll.salary.packages.empty.noStructuresDesc")}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("payroll.salary.packages.table.employee")}</TableHead>
                      <TableHead>{t("payroll.salary.packages.table.effective")}</TableHead>
                      <TableHead className="text-right">
                        {t("payroll.salary.packages.table.annualCtc")}
                      </TableHead>
                      <TableHead>{t("payroll.salary.packages.table.status")}</TableHead>
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
            <CardTitle className="text-base">{t("payroll.salary.statutory.title")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                { key: "pf_employee_pct", labelKey: "payroll.salary.statutory.pfEmployeePct" },
                { key: "pf_employer_pct", labelKey: "payroll.salary.statutory.pfEmployerPct" },
                { key: "pf_wage_ceiling", labelKey: "payroll.salary.statutory.pfWageCeiling" },
                { key: "esi_employee_pct", labelKey: "payroll.salary.statutory.esiEmployeePct" },
                { key: "esi_employer_pct", labelKey: "payroll.salary.statutory.esiEmployerPct" },
                { key: "esi_wage_ceiling", labelKey: "payroll.salary.statutory.esiWageCeiling" },
                {
                  key: "standard_deduction",
                  labelKey: "payroll.salary.statutory.standardDeduction",
                },
                {
                  key: "overtime_multiplier",
                  labelKey: "payroll.salary.statutory.overtimeMultiplier",
                },
              ] as const
            ).map(({ key, labelKey }) => (
              <div key={key}>
                <Label htmlFor={key}>{t(labelKey)}</Label>
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
                {t("payroll.salary.statutory.deductTds")}
              </label>
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={settings.data.pf_limit_to_ceiling}
                  onCheckedChange={(v) => saveSettings.mutate({ pf_limit_to_ceiling: v })}
                />
                {t("payroll.salary.statutory.capPfCeiling")}
              </label>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title={t("payroll.salary.dialog.removeTitle")}
        description={t("payroll.salary.dialog.removeDesc")}
        tone="danger"
        confirmLabel={t("payroll.salary.dialog.remove")}
        busy={removeComponent.isPending}
        onConfirm={() => pendingDelete && removeComponent.mutate(pendingDelete)}
      />
    </>
  );
}

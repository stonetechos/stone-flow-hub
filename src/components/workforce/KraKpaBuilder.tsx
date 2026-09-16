import { Plus, Trash2, Target, Award, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EmployeeKra, EmployeeKpa } from "@/lib/workforce/schema";

interface KraKpaBuilderProps {
  kras: EmployeeKra[];
  onKrasChange: (kras: EmployeeKra[]) => void;
  kpas: EmployeeKpa[];
  onKpasChange: (kpas: EmployeeKpa[]) => void;
  disabled?: boolean;
}

const PRESET_KRAS = {
  sales: [
    {
      title: "Monthly Order Booking Target",
      weightage: 40,
      target_period: "monthly" as const,
      description: "Achieve assigned monthly gross sales and quota.",
    },
    {
      title: "Enquiry-to-Quotation Conversion",
      weightage: 30,
      target_period: "monthly" as const,
      description: "Turn warm enquiries into accepted quotes within 48h.",
    },
    {
      title: "Customer Payment & Advance Collection",
      weightage: 30,
      target_period: "monthly" as const,
      description: "Collect client advances and balance payments on schedule.",
    },
  ],
  operations: [
    {
      title: "Order Dispatch & Timeliness SLA",
      weightage: 40,
      target_period: "weekly" as const,
      description: "Ensure orders are packaged and dispatched as per promised dates.",
    },
    {
      title: "Procurement & Vendor Coordination",
      weightage: 30,
      target_period: "monthly" as const,
      description: "Ensure raw blocks and slabs are ordered and received without stockouts.",
    },
    {
      title: "Inventory Accuracy & Stock Auditing",
      weightage: 30,
      target_period: "monthly" as const,
      description: "Maintain physical vs system stock discrepancy below 1%.",
    },
  ],
  production: [
    {
      title: "Fabrication & Edge Profiling Quality",
      weightage: 40,
      target_period: "daily" as const,
      description: "Zero defects and accurate tolerances on cuts and mitres.",
    },
    {
      title: "Material Yield & Wastage Control",
      weightage: 30,
      target_period: "monthly" as const,
      description: "Optimize gang-saw and CNC slab nesting to minimize offcuts.",
    },
    {
      title: "Site Installation Supervision",
      weightage: 30,
      target_period: "weekly" as const,
      description: "Ensure on-site dry lays, epoxy joints, and client sign-offs.",
    },
  ],
};

const PRESET_KPAS = {
  sales: [
    { title: "Daily Client Follow-ups", metric: "Minimum 20 customer calls/visits daily" },
    { title: "Quote Turnaround Time", metric: "Generate estimates within 3 hours of request" },
    { title: "Sample Handover", metric: "Submit stone sample kits within 24 hours" },
  ],
  operations: [
    { title: "Purchase Order Issuance", metric: "Issue PO within 4 hours of requisition" },
    { title: "Dispatch Note & LR Upload", metric: "100% same-day LR and e-way bill upload" },
    { title: "Vendor Bill Verification", metric: "Clear inward material verification in 24h" },
  ],
};

export function KraKpaBuilder({
  kras,
  onKrasChange,
  kpas,
  onKpasChange,
  disabled,
}: KraKpaBuilderProps) {
  // KRA Handlers
  const addKra = () => {
    onKrasChange([
      ...kras,
      {
        title: "",
        weightage: 25,
        target_period: "monthly",
        description: "",
      },
    ]);
  };

  const updateKra = (index: number, patch: Partial<EmployeeKra>) => {
    const updated = [...kras];
    updated[index] = { ...updated[index], ...patch };
    onKrasChange(updated);
  };

  const removeKra = (index: number) => {
    onKrasChange(kras.filter((_, i) => i !== index));
  };

  const applyKraPreset = (presetKey: keyof typeof PRESET_KRAS) => {
    const preset = PRESET_KRAS[presetKey];
    onKrasChange(preset);
  };

  // KPA Handlers
  const addKpa = () => {
    onKpasChange([...kpas, { title: "", metric: "" }]);
  };

  const updateKpa = (index: number, patch: Partial<EmployeeKpa>) => {
    const updated = [...kpas];
    updated[index] = { ...updated[index], ...patch };
    onKpasChange(updated);
  };

  const removeKpa = (index: number) => {
    onKpasChange(kpas.filter((_, i) => i !== index));
  };

  const applyKpaPreset = (presetKey: keyof typeof PRESET_KPAS) => {
    const preset = PRESET_KPAS[presetKey];
    onKpasChange(preset);
  };

  const totalWeight = kras.reduce((acc, k) => acc + (Number(k.weightage) || 0), 0);

  return (
    <div className="space-y-8">
      {/* ----------------- KRAs Section ----------------- */}
      <div className="rounded-xl border border-blue-200/80 bg-gradient-to-b from-blue-50/40 to-transparent p-4 sm:p-5 dark:border-blue-900/40 dark:from-blue-950/20">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
              <Target className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold tracking-tight text-foreground">
                  Key Result Areas (KRAs)
                </h4>
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-bold ${
                    totalWeight === 100
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                  }`}
                >
                  Total: {totalWeight}% {totalWeight === 100 ? "✓" : "(Target: 100%)"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Define the high-level business goals and accountable outcomes expected of this
                employee.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!disabled && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addKra}
                className="gap-1.5 text-xs bg-background hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 dark:hover:bg-blue-950"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add KRA</span>
              </Button>
            )}
          </div>
        </div>

        {/* Quick Presets */}
        {!disabled && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="flex items-center gap-1 font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">
              <Sparkles className="h-3 w-3 text-blue-600" />
              Quick Presets:
            </span>
            <button
              type="button"
              onClick={() => applyKraPreset("sales")}
              className="rounded-md border border-blue-200 bg-white px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-300 transition-colors"
            >
              Sales Role KRAs
            </button>
            <button
              type="button"
              onClick={() => applyKraPreset("operations")}
              className="rounded-md border border-blue-200 bg-white px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-300 transition-colors"
            >
              Operations / Admin KRAs
            </button>
            <button
              type="button"
              onClick={() => applyKraPreset("production")}
              className="rounded-md border border-blue-200 bg-white px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-300 transition-colors"
            >
              Production &amp; Site KRAs
            </button>
          </div>
        )}

        {/* KRA Items List */}
        <div className="mt-4 space-y-3">
          {kras.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
              No KRAs added yet. Click &ldquo;Add KRA&rdquo; or pick a preset above to configure.
            </div>
          ) : (
            kras.map((kra, index) => (
              <div
                key={index}
                className="rounded-lg border border-border/80 bg-background/90 p-3 shadow-xs space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-800 text-xs font-bold dark:bg-blue-950 dark:text-blue-300">
                    {index + 1}
                  </span>
                  <div className="flex-1 w-full">
                    <Input
                      value={kra.title}
                      onChange={(e) => updateKra(index, { title: e.target.value })}
                      disabled={disabled}
                      placeholder="KRA Title (e.g. Sales Target, Quality Inspection, On-time Dispatch)..."
                      className="text-sm font-semibold h-9"
                    />
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="flex items-center gap-1.5 w-32 shrink-0">
                      <span className="text-xs text-muted-foreground font-medium">Weight:</span>
                      <div className="relative flex-1">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={kra.weightage ?? ""}
                          onChange={(e) =>
                            updateKra(index, { weightage: Number(e.target.value) || 0 })
                          }
                          disabled={disabled}
                          className="h-9 pr-6 text-xs font-mono font-bold"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">
                          %
                        </span>
                      </div>
                    </div>

                    <div className="w-28 shrink-0">
                      <Select
                        value={kra.target_period ?? "monthly"}
                        onValueChange={(val) =>
                          updateKra(index, {
                            target_period: val as NonNullable<EmployeeKra["target_period"]>,
                          })
                        }
                        disabled={disabled}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {!disabled && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeKra(index)}
                        className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                        title="Remove KRA"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="pl-0 sm:pl-8">
                  <Input
                    value={kra.description ?? ""}
                    onChange={(e) => updateKra(index, { description: e.target.value })}
                    disabled={disabled}
                    placeholder="Specific success criteria, measurable target or notes..."
                    className="text-xs h-8 text-muted-foreground"
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ----------------- KPAs Section ----------------- */}
      <div className="rounded-xl border border-indigo-200/80 bg-gradient-to-b from-indigo-50/30 to-transparent p-4 sm:p-5 dark:border-indigo-900/40 dark:from-indigo-950/20">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
              <Award className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold tracking-tight text-foreground">
                Key Performance Areas &amp; Activities (KPAs)
              </h4>
              <p className="text-xs text-muted-foreground">
                Quantifiable day-to-day indicators and operational activities required to fulfill
                the KRAs.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!disabled && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addKpa}
                className="gap-1.5 text-xs bg-background hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 dark:hover:bg-indigo-950"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add KPA</span>
              </Button>
            )}
          </div>
        </div>

        {/* Quick Presets */}
        {!disabled && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="flex items-center gap-1 font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">
              <Sparkles className="h-3 w-3 text-indigo-600" />
              Quick Presets:
            </span>
            <button
              type="button"
              onClick={() => applyKpaPreset("sales")}
              className="rounded-md border border-indigo-200 bg-white px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-300 transition-colors"
            >
              Sales Performance KPAs
            </button>
            <button
              type="button"
              onClick={() => applyKpaPreset("operations")}
              className="rounded-md border border-indigo-200 bg-white px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-300 transition-colors"
            >
              Operations &amp; Dispatch KPAs
            </button>
          </div>
        )}

        {/* KPA Items List */}
        <div className="mt-4 space-y-3">
          {kpas.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
              No KPAs added yet. Click &ldquo;Add KPA&rdquo; to define key performance benchmarks.
            </div>
          ) : (
            kpas.map((kpa, index) => (
              <div
                key={index}
                className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 rounded-lg border border-border/80 bg-background/90 p-3 shadow-xs"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold dark:bg-indigo-950 dark:text-indigo-300">
                  {index + 1}
                </span>
                <div className="flex-1 w-full">
                  <Input
                    value={kpa.title}
                    onChange={(e) => updateKpa(index, { title: e.target.value })}
                    disabled={disabled}
                    placeholder="Performance Area / Activity (e.g. Daily Client Calls, Sample Delivery)..."
                    className="text-sm font-medium h-9"
                  />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-1/2">
                  <Input
                    value={kpa.metric ?? ""}
                    onChange={(e) => updateKpa(index, { metric: e.target.value })}
                    disabled={disabled}
                    placeholder="Target Metric (e.g. 20 calls/day, 100% on time)..."
                    className="text-xs h-9"
                  />
                  {!disabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeKpa(index)}
                      className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                      title="Remove KPA"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

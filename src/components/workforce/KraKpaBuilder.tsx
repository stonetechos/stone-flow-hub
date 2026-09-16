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
  managing_director: [
    {
      title: "Strategic Growth & Revenue Quota",
      weightage: 30,
      target_period: "monthly" as const,
      description: "Drive overall enterprise growth and monthly revenue quota.",
    },
    {
      title: "Luxury Architect & Builder Relationships",
      weightage: 25,
      target_period: "monthly" as const,
      description: "Direct relationship management with top architectural firms.",
    },
    {
      title: "Quarry Sourcing & Vendor Agreements",
      weightage: 25,
      target_period: "quarterly" as const,
      description: "Secure direct quarry raw block contracts and competitive terms.",
    },
    {
      title: "Profitability & Cash Flow Governance",
      weightage: 20,
      target_period: "monthly" as const,
      description: "Maintain gross profit margins and timely collections.",
    },
  ],
  sales_head: [
    {
      title: "Sales Team Revenue Target",
      weightage: 40,
      target_period: "monthly" as const,
      description: "Achieve overall team sales targets and quota fulfillment.",
    },
    {
      title: "Quotation Closure & Conversion Rate",
      weightage: 30,
      target_period: "weekly" as const,
      description: "Review estimates and drive high-value quotation conversions within 48h.",
    },
    {
      title: "Sales Team Mentorship & Site Inspections",
      weightage: 30,
      target_period: "weekly" as const,
      description: "Lead on-site joint meetings with field sales executives.",
    },
  ],
  field_sales_exec: [
    {
      title: "Architect & Builder Site Visits",
      weightage: 40,
      target_period: "weekly" as const,
      description: "Conduct minimum 15 architect/builder visits per week.",
    },
    {
      title: "Site Measurements & Dry Lay Coordination",
      weightage: 30,
      target_period: "weekly" as const,
      description: "Ensure exact on-site dimensions and stone dry-lay sign-offs.",
    },
    {
      title: "New Project Lead Inception",
      weightage: 30,
      target_period: "monthly" as const,
      description: "Generate warm inquiries for marble, granite, and quartz projects.",
    },
  ],
  office_sales_exec: [
    {
      title: "Showroom Walkthrough Conversion",
      weightage: 40,
      target_period: "monthly" as const,
      description: "Convert showroom walk-in visitors into confirmed quotations.",
    },
    {
      title: "Fast Estimate & Sample Turnaround",
      weightage: 30,
      target_period: "daily" as const,
      description: "Deliver priced estimates and stone swatch kits within 3 hours.",
    },
    {
      title: "Booking Advance & Balance Collection",
      weightage: 30,
      target_period: "weekly" as const,
      description: "Collect order booking advances and dispatch balance payments.",
    },
  ],
  data_entry_exec: [
    {
      title: "ERP Quotation & Sales Order Entry Speed",
      weightage: 40,
      target_period: "daily" as const,
      description: "Log quotations, sales orders, and challans within 1 hour.",
    },
    {
      title: "ERP Data & Invoicing Zero-Defect Accuracy",
      weightage: 35,
      target_period: "daily" as const,
      description: "Zero errors in billing dimensions, item rates, and GST taxes.",
    },
    {
      title: "Delivery Challan & LR Archival",
      weightage: 25,
      target_period: "daily" as const,
      description: "Upload signed delivery challans and lorry receipts same day.",
    },
  ],
  office_admin: [
    {
      title: "Showroom & Sample Gallery Presentation",
      weightage: 35,
      target_period: "daily" as const,
      description: "Maintain display slabs, lighting, and sample kit availability.",
    },
    {
      title: "Front Desk & Visitor Coordination",
      weightage: 35,
      target_period: "daily" as const,
      description: "Welcome guests and coordinate instant sales executive handover.",
    },
    {
      title: "Office Facilities & Administrative Support",
      weightage: 30,
      target_period: "weekly" as const,
      description: "Oversee courier logs, office supplies, and administrative tasks.",
    },
  ],
  operations_head: [
    {
      title: "Production Scheduling & Output Delivery",
      weightage: 35,
      target_period: "daily" as const,
      description:
        "Ensure scheduled fabrication jobs and CNC quotas are met daily without bottlenecks.",
    },
    {
      title: "Quality Control & Zero-Defect Inspection",
      weightage: 35,
      target_period: "daily" as const,
      description:
        "Audit slab edge polishing, dimension accuracy, and packing to achieve < 1% rejection rate.",
    },
    {
      title: "Site Installation & Logistics SLA",
      weightage: 30,
      target_period: "weekly" as const,
      description:
        "Manage dispatch fleet, crane offloading, and site installer teams for 100% on-time handover.",
    },
  ],
  customer_care: [
    {
      title: "Client Enquiry & Ticket Response",
      weightage: 40,
      target_period: "daily" as const,
      description: "Respond to all customer calls, inquiries, and complaints within 15 minutes.",
    },
    {
      title: "Post-Installation Satisfaction & Reviews",
      weightage: 35,
      target_period: "weekly" as const,
      description:
        "Follow up with clients 48h post-installation and collect customer satisfaction feedback.",
    },
    {
      title: "Service Issue Resolution & Retention",
      weightage: 25,
      target_period: "monthly" as const,
      description:
        "Resolve warranty and service claims promptly to maintain > 95% client satisfaction.",
    },
  ],
  housekeeping: [
    {
      title: "Showroom & Display Cleanliness",
      weightage: 45,
      target_period: "daily" as const,
      description:
        "Keep display stone slabs, sample stands, glass panels, and desks spotlessly clean.",
    },
    {
      title: "Office & Restroom Hygiene",
      weightage: 35,
      target_period: "daily" as const,
      description:
        "Conduct scheduled sanitization of office restrooms, pantry, and common corridors.",
    },
    {
      title: "Safe Waste Disposal & Maintenance",
      weightage: 20,
      target_period: "daily" as const,
      description:
        "Proper sorting and disposal of packaging scrap, broken samples, and waste materials.",
    },
  ],
};

const PRESET_KPAS = {
  managing_director: [
    { title: "Quarterly Strategy Review", metric: "1 executive board review per quarter" },
    { title: "Key VIP Architect Meetings", metric: "Minimum 4 architect meetings monthly" },
    { title: "Cash Flow Audit", metric: "Weekly review of receivables and liabilities" },
  ],
  sales_head: [
    { title: "Daily Pipeline Review", metric: "Daily morning sync on open high-value quotes" },
    { title: "High-Ticket Closures", metric: "Close minimum ₹25L+ revenue weekly" },
    { title: "Lead Response SLA", metric: "Enquiry contacted within 2 hours" },
  ],
  field_sales_exec: [
    { title: "Daily Architect Visits", metric: "Minimum 3 architectural visits per day" },
    { title: "Site Measurement Reports", metric: "100% same-day measurement upload" },
    { title: "Sample Kit Distribution", metric: "Hand over minimum 10 sample kits weekly" },
  ],
  office_sales_exec: [
    { title: "Showroom Consultations", metric: "Log all showroom visits in ERP within 1 hour" },
    { title: "Estimate Turnaround", metric: "Issue quote within 3 hours of request" },
    { title: "Payment Follow-up Calls", metric: "Minimum 25 payment follow-ups daily" },
  ],
  data_entry_exec: [
    { title: "Same-Day Entry SLA", metric: "100% orders logged on day of receipt" },
    { title: "Error Rate", metric: "< 0.5% rate/tax discrepancy rate" },
    { title: "E-Way Bill & LR Upload", metric: "100% uploaded before vehicle departure" },
  ],
  office_admin: [
    { title: "Morning Showroom Inspection", metric: "Inspection complete by 9:30 AM daily" },
    { title: "Sample Inventory Audit", metric: "Weekly stock reconciliation of sample boxes" },
    { title: "Courier Dispatch Tracking", metric: "100% same-day tracking shared with clients" },
  ],
  operations_head: [
    { title: "Daily Factory Throughput", metric: "Minimum 1,500 sq.ft daily fabrication output" },
    { title: "Zero-Defect Inspection", metric: "100% pre-dispatch quality sign-offs" },
    {
      title: "Installation Handover SLA",
      metric: "Complete installation within committed project delivery timeline",
    },
  ],
  customer_care: [
    { title: "First Response Time", metric: "< 15 minutes average enquiry callback" },
    { title: "Customer CSAT Score", metric: "> 4.8 / 5.0 client feedback score" },
    { title: "Open Ticket Resolution", metric: "98% issues resolved within 24 hours" },
  ],
  housekeeping: [
    { title: "Morning Readiness Audit", metric: "Showroom and desks fully prepped before 9:30 AM" },
    {
      title: "Hourly Inspection Checklist",
      metric: "100% checklist compliance for display and restrooms",
    },
    { title: "Zero Clutter Hazard", metric: "Zero obstructions or hazards in showroom aisles" },
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
                      ? "border border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                      : "border border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
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
              onClick={() => applyKraPreset("managing_director")}
              className="rounded-md border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-300 transition-colors shadow-2xs"
            >
              Managing Director
            </button>
            <button
              type="button"
              onClick={() => applyKraPreset("sales_head")}
              className="rounded-md border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-300 transition-colors shadow-2xs"
            >
              Sales Head
            </button>
            <button
              type="button"
              onClick={() => applyKraPreset("field_sales_exec")}
              className="rounded-md border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-300 transition-colors shadow-2xs"
            >
              Field Sales Exec
            </button>
            <button
              type="button"
              onClick={() => applyKraPreset("office_sales_exec")}
              className="rounded-md border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-300 transition-colors shadow-2xs"
            >
              Office Sales Exec
            </button>
            <button
              type="button"
              onClick={() => applyKraPreset("data_entry_exec")}
              className="rounded-md border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-300 transition-colors shadow-2xs"
            >
              Data Entry Exec
            </button>
            <button
              type="button"
              onClick={() => applyKraPreset("office_admin")}
              className="rounded-md border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-300 transition-colors shadow-2xs"
            >
              Office Admin
            </button>
            <button
              type="button"
              onClick={() => applyKraPreset("customer_care")}
              className="rounded-md border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-300 transition-colors shadow-2xs"
            >
              Customer Care
            </button>
            <button
              type="button"
              onClick={() => applyKraPreset("operations_head")}
              className="rounded-md border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-300 transition-colors shadow-2xs"
            >
              Operations Head
            </button>
            <button
              type="button"
              onClick={() => applyKraPreset("housekeeping")}
              className="rounded-md border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-300 transition-colors shadow-2xs"
            >
              Housekeeping
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
              onClick={() => applyKpaPreset("managing_director")}
              className="rounded-md border border-indigo-200 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-800 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-300 transition-colors shadow-2xs"
            >
              Managing Director
            </button>
            <button
              type="button"
              onClick={() => applyKpaPreset("sales_head")}
              className="rounded-md border border-indigo-200 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-800 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-300 transition-colors shadow-2xs"
            >
              Sales Head
            </button>
            <button
              type="button"
              onClick={() => applyKpaPreset("field_sales_exec")}
              className="rounded-md border border-indigo-200 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-800 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-300 transition-colors shadow-2xs"
            >
              Field Sales Exec
            </button>
            <button
              type="button"
              onClick={() => applyKpaPreset("office_sales_exec")}
              className="rounded-md border border-indigo-200 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-800 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-300 transition-colors shadow-2xs"
            >
              Office Sales Exec
            </button>
            <button
              type="button"
              onClick={() => applyKpaPreset("data_entry_exec")}
              className="rounded-md border border-indigo-200 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-800 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-300 transition-colors shadow-2xs"
            >
              Data Entry Exec
            </button>
            <button
              type="button"
              onClick={() => applyKpaPreset("office_admin")}
              className="rounded-md border border-indigo-200 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-800 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-300 transition-colors shadow-2xs"
            >
              Office Admin
            </button>
            <button
              type="button"
              onClick={() => applyKpaPreset("customer_care")}
              className="rounded-md border border-indigo-200 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-800 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-300 transition-colors shadow-2xs"
            >
              Customer Care
            </button>
            <button
              type="button"
              onClick={() => applyKpaPreset("operations_head")}
              className="rounded-md border border-indigo-200 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-800 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-300 transition-colors shadow-2xs"
            >
              Operations Head
            </button>
            <button
              type="button"
              onClick={() => applyKpaPreset("housekeeping")}
              className="rounded-md border border-indigo-200 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-800 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-300 transition-colors shadow-2xs"
            >
              Housekeeping
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

/**
 * Tax & Regime Optimizer Component.
 *
 * Provides employees and HR with:
 * 1. Side-by-side New vs. Old Tax Regime comparison with automatic winner badge.
 * 2. Form 12BB investment declaration inputs (HRA, 80C, 80D, 24b, NPS).
 * 3. Smart Advisory on Corporate NPS (80CCD(2)), EPF caps, and TDS smoothing.
 * 4. 1-click ITR-1 JSON export and Form 16 Part B Tax Computation Sheet download.
 */
import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Sparkles,
  Calculator,
  Download,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  ShieldCheck,
  FileText,
  ExternalLink,
  PiggyBank,
  Check,
  HelpCircle,
  Building,
  ArrowRight,
  Info,
  DollarSign,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { listEmployees } from "@/lib/workforce/api";
import { listSalaryStructures, getStructureLines } from "@/lib/hr/payroll-api";
import {
  compareTaxRegimes,
  generateSmartAdvisory,
  generateItr1PreFill,
  type TaxDeclarationsInput,
  type TaxRegime,
  STANDARD_DEDUCTION_NEW_REGIME,
  STANDARD_DEDUCTION_OLD_REGIME,
  MAX_80C_LIMIT,
} from "@/lib/hr/tax-engine";
import { formatInr } from "@/lib/format";
import { cn } from "@/lib/utils";

interface TaxRegimeOptimizerProps {
  initialEmployeeId?: string;
}

export function TaxRegimeOptimizer({ initialEmployeeId }: TaxRegimeOptimizerProps) {
  const { t } = useTranslation();
  const [selectedEmpId, setSelectedEmpId] = useState<string>(initialEmployeeId || "");
  const [selectedRegime, setSelectedRegime] = useState<TaxRegime>("new");

  // Fetch employees
  const employeesQ = useQuery({
    queryKey: ["workforce", "employees"],
    queryFn: () => listEmployees(),
  });

  const employees = employeesQ.data ?? [];

  // Default to first employee if none specified
  useEffect(() => {
    if (!selectedEmpId && employees.length > 0) {
      setSelectedEmpId(employees[0].id);
    }
  }, [employees, selectedEmpId]);

  // Fetch salary structure for chosen employee
  const structuresQ = useQuery({
    queryKey: ["hr", "salary-structures", selectedEmpId],
    queryFn: () => listSalaryStructures(selectedEmpId),
    enabled: Boolean(selectedEmpId),
  });

  const activeStructure = (structuresQ.data ?? []).find((s) => s.status === "active") ?? null;

  // Fetch structure lines (to extract basic, HRA, etc.)
  const linesQ = useQuery({
    queryKey: ["hr", "structure-lines", activeStructure?.id],
    queryFn: () => getStructureLines(activeStructure!.id),
    enabled: Boolean(activeStructure?.id),
  });

  const lines = linesQ.data ?? [];

  // Derive base figures
  const annualCtc = activeStructure ? Number(activeStructure.ctc_annual) : 600_000;
  const basicLine = lines.find((l) => /basic/i.test(l.label));
  const hraLine = lines.find((l) => /hra|house rent/i.test(l.label));
  const pfLine = lines.find((l) => /pf|provident/i.test(l.label));

  const basicAnnual = basicLine ? basicLine.monthly_amount * 12 : annualCtc * 0.4;
  const hraReceivedAnnual = hraLine ? hraLine.monthly_amount * 12 : basicAnnual * 0.4;
  const epfAnnual = pfLine ? pfLine.monthly_amount * 12 : basicAnnual * 0.12;

  // Interactive Form 12BB State (Loaded from localStorage if previously saved)
  const storageKey = `st.taxDecl.${selectedEmpId}.2024-25`;
  const [rentPaidMonthly, setRentPaidMonthly] = useState<number>(0);
  const [isMetroCity, setIsMetroCity] = useState<boolean>(true);
  const [additional80c, setAdditional80c] = useState<number>(0);
  const [healthInsuranceSelf, setHealthInsuranceSelf] = useState<number>(0);
  const [healthInsuranceParents, setHealthInsuranceParents] = useState<number>(0);
  const [homeLoanInterest, setHomeLoanInterest] = useState<number>(0);
  const [voluntaryNps, setVoluntaryNps] = useState<number>(0);
  const [employerNpsPct, setEmployerNpsPct] = useState<number>(0);
  const [otherDeductions, setOtherDeductions] = useState<number>(0);

  // Modal states
  const [isItrModalOpen, setIsItrModalOpen] = useState(false);
  const [isComputationModalOpen, setIsComputationModalOpen] = useState(false);

  // Load saved declarations from localStorage when employee changes
  useEffect(() => {
    if (!selectedEmpId) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.regime) setSelectedRegime(parsed.regime);
        if (parsed.rentPaidMonthly !== undefined) setRentPaidMonthly(parsed.rentPaidMonthly);
        if (parsed.isMetroCity !== undefined) setIsMetroCity(parsed.isMetroCity);
        if (parsed.additional80c !== undefined) setAdditional80c(parsed.additional80c);
        if (parsed.healthInsuranceSelf !== undefined)
          setHealthInsuranceSelf(parsed.healthInsuranceSelf);
        if (parsed.healthInsuranceParents !== undefined)
          setHealthInsuranceParents(parsed.healthInsuranceParents);
        if (parsed.homeLoanInterest !== undefined) setHomeLoanInterest(parsed.homeLoanInterest);
        if (parsed.voluntaryNps !== undefined) setVoluntaryNps(parsed.voluntaryNps);
        if (parsed.employerNpsPct !== undefined) setEmployerNpsPct(parsed.employerNpsPct);
        if (parsed.otherDeductions !== undefined) setOtherDeductions(parsed.otherDeductions);
      }
    } catch {
      /* ignore */
    }
  }, [selectedEmpId, storageKey]);

  // Handle Save Declaration
  const handleSaveDeclaration = () => {
    const payload = {
      regime: selectedRegime,
      rentPaidMonthly,
      isMetroCity,
      additional80c,
      healthInsuranceSelf,
      healthInsuranceParents,
      homeLoanInterest,
      voluntaryNps,
      employerNpsPct,
      otherDeductions,
      savedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
      toast.success(
        `Tax declarations and ${selectedRegime === "new" ? "New" : "Old"} Regime choice saved successfully!`,
      );
    } catch {
      toast.error("Failed to save tax declarations.");
    }
  };

  // Compile full input for calculation engine
  const calculationInput: TaxDeclarationsInput = useMemo(
    () => ({
      regime: selectedRegime,
      annualCtc,
      basicAnnual,
      hraReceivedAnnual,
      rentPaidMonthly,
      isMetroCity,
      epfAnnual,
      additional80c,
      healthInsuranceSelf80d: healthInsuranceSelf,
      healthInsuranceParents80d: healthInsuranceParents,
      homeLoanInterest24b: homeLoanInterest,
      voluntaryNps80ccd1b: voluntaryNps,
      employerNps80ccd2Percent: employerNpsPct,
      otherDeductions,
    }),
    [
      selectedRegime,
      annualCtc,
      basicAnnual,
      hraReceivedAnnual,
      rentPaidMonthly,
      isMetroCity,
      epfAnnual,
      additional80c,
      healthInsuranceSelf,
      healthInsuranceParents,
      homeLoanInterest,
      voluntaryNps,
      employerNpsPct,
      otherDeductions,
    ],
  );

  // Compute side-by-side comparison
  const comparison = useMemo(() => compareTaxRegimes(calculationInput), [calculationInput]);
  const advisory = useMemo(() => generateSmartAdvisory(calculationInput), [calculationInput]);

  const activeEmployee = employees.find((e) => e.id === selectedEmpId);
  const employeeName = activeEmployee?.full_name || "Employee";

  // ITR JSON generator
  const itrJson = useMemo(
    () => generateItr1PreFill(calculationInput, employeeName),
    [calculationInput, employeeName],
  );

  const handleDownloadItrJson = () => {
    const dataStr =
      "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(itrJson, null, 2));
    const dlAnchorElem = document.createElement("a");
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute(
      "download",
      `ITR1_PreFill_${employeeName.replace(/\s+/g, "_")}_FY2024-25.json`,
    );
    dlAnchorElem.click();
    toast.success("ITR-1 Pre-fill JSON downloaded! Ready for upload to incometax.gov.in");
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar with Employee Picker & Summary Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Calculator className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              Tax Regime Optimizer &amp; Filing Hub
            </h2>
            <Badge
              variant="outline"
              className="border-amber-500/40 text-amber-700 dark:text-amber-400 font-mono text-xs"
            >
              FY 2024–25 (AY 2025–26)
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Automatic New vs. Old Regime evaluation, Corporate NPS tax-sheltering, and instant ITR
            preparation.
          </p>
        </div>

        {/* Employee Switcher */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Label className="text-xs font-semibold shrink-0">Employee:</Label>
          <Select value={selectedEmpId} onValueChange={setSelectedEmpId}>
            <SelectTrigger className="w-full sm:w-[240px] h-9 text-xs">
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id} className="text-xs">
                  {emp.full_name} ({emp.employee_code || "Staff"})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 2. Recommendation Banner */}
      <div
        className={cn(
          "rounded-2xl p-4 sm:p-5 border shadow-sm transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4",
          comparison.recommendedRegime === "new"
            ? "border-emerald-300 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-200"
            : "border-blue-300 bg-blue-50/70 dark:border-blue-900/60 dark:bg-blue-950/20 text-blue-950 dark:text-blue-200",
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold shadow-xs",
              comparison.recommendedRegime === "new"
                ? "bg-emerald-600 text-white"
                : "bg-blue-600 text-white",
            )}
          >
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base">
                Recommended:{" "}
                {comparison.recommendedRegime === "new"
                  ? "New Tax Regime (Sec 115BAC)"
                  : "Old Tax Regime"}
              </span>
              <Badge
                className={cn(
                  "font-bold text-[11px]",
                  comparison.recommendedRegime === "new"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white",
                )}
              >
                Saves ₹{comparison.annualSavings.toLocaleString("en-IN")}/yr
              </Badge>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {comparison.verdictSummary}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0">
          <Button
            size="sm"
            onClick={() => {
              setSelectedRegime(comparison.recommendedRegime);
              toast.success(
                `Switched active selection to ${comparison.recommendedRegime === "new" ? "New" : "Old"} Regime.`,
              );
            }}
            className={cn(
              "text-xs font-bold gap-1.5 shadow-xs flex-1 md:flex-none",
              comparison.recommendedRegime === "new"
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white",
            )}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Apply Recommended ({comparison.recommendedRegime === "new" ? "New" : "Old"})
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsComputationModalOpen(true)}
            className="text-xs font-semibold gap-1.5 border-border"
          >
            <FileText className="h-3.5 w-3.5" />
            Tax Sheet
          </Button>
        </div>
      </div>

      {/* 3. Side-by-Side Comparison Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* NEW REGIME CARD */}
        <Card
          className={cn(
            "relative rounded-2xl overflow-hidden border transition-all shadow-sm",
            selectedRegime === "new"
              ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-card"
              : "border-border bg-card/60 opacity-95",
          )}
        >
          {selectedRegime === "new" && (
            <div className="bg-emerald-600 text-white text-[11px] font-bold px-3 py-1 flex items-center justify-between">
              <span>ACTIVE OPTED REGIME FOR PAYROLL TDS</span>
              <Check className="h-3.5 w-3.5 stroke-[3]" />
            </div>
          )}
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  New Tax Regime
                  <Badge
                    variant="outline"
                    className="text-[10px] uppercase font-bold tracking-wider"
                  >
                    Sec 115BAC (Default)
                  </Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Lower tax rates, zero paperwork, ₹75,000 standard deduction.
                </p>
              </div>
              <Button
                size="sm"
                variant={selectedRegime === "new" ? "default" : "outline"}
                onClick={() => setSelectedRegime("new")}
                className={cn(
                  "h-8 text-xs font-bold",
                  selectedRegime === "new" ? "bg-emerald-600 text-white hover:bg-emerald-700" : "",
                )}
              >
                {selectedRegime === "new" ? "Selected" : "Opt for New"}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-5 space-y-3.5 text-xs">
            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">Annual Gross CTC</span>
              <span className="font-bold tabular-nums">
                ₹{comparison.newRegime.grossSalary.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground flex items-center gap-1">
                Standard Deduction (Salaried)
              </span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                -₹{comparison.newRegime.standardDeduction.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground flex items-center gap-1">
                Employer NPS (Sec 80CCD(2))
                <Badge
                  variant="outline"
                  className="text-[9px] px-1 py-0 text-emerald-600 border-emerald-300"
                >
                  Allowed
                </Badge>
              </span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                -₹{comparison.newRegime.section80ccd2EmployerNps.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-border/40 font-bold bg-muted/30 px-2 rounded-lg">
              <span>Net Taxable Income</span>
              <span className="tabular-nums">
                ₹{comparison.newRegime.taxableIncome.toLocaleString("en-IN")}
              </span>
            </div>

            {/* Slab summary */}
            <div className="bg-muted/40 rounded-xl p-3 space-y-1.5 text-[11px]">
              <div className="text-muted-foreground font-semibold flex items-center justify-between">
                <span>Tax Breakdown by Slabs:</span>
                <span className="tabular-nums">
                  ₹{comparison.newRegime.taxBeforeRebate.toLocaleString("en-IN")}
                </span>
              </div>
              {comparison.newRegime.rebate87a > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Less: Section 87A Rebate</span>
                  <span>-₹{comparison.newRegime.rebate87a.toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>Add: 4% Health &amp; Education Cess</span>
                <span>₹{comparison.newRegime.cess.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Total Annual Tax & Monthly TDS */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/60 dark:bg-emerald-950/20 p-3.5 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  Total Annual Tax
                </div>
                <div className="text-xl font-extrabold text-foreground tabular-nums">
                  ₹{comparison.newRegime.totalAnnualTax.toLocaleString("en-IN")}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-semibold text-muted-foreground">Monthly TDS</div>
                <div className="text-sm font-bold text-foreground tabular-nums">
                  ₹{comparison.newRegime.monthlyTds.toLocaleString("en-IN")}/mo
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* OLD REGIME CARD */}
        <Card
          className={cn(
            "relative rounded-2xl overflow-hidden border transition-all shadow-sm",
            selectedRegime === "old"
              ? "border-blue-500 ring-2 ring-blue-500/20 bg-card"
              : "border-border bg-card/60 opacity-95",
          )}
        >
          {selectedRegime === "old" && (
            <div className="bg-blue-600 text-white text-[11px] font-bold px-3 py-1 flex items-center justify-between">
              <span>ACTIVE OPTED REGIME FOR PAYROLL TDS</span>
              <Check className="h-3.5 w-3.5 stroke-[3]" />
            </div>
          )}
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  Old Tax Regime
                  <Badge
                    variant="outline"
                    className="text-[10px] uppercase font-bold tracking-wider"
                  >
                    Chapter VI-A Eligible
                  </Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Allows 80C, 80D, HRA, Home Loan &amp; NPS deductions.
                </p>
              </div>
              <Button
                size="sm"
                variant={selectedRegime === "old" ? "default" : "outline"}
                onClick={() => setSelectedRegime("old")}
                className={cn(
                  "h-8 text-xs font-bold",
                  selectedRegime === "old" ? "bg-blue-600 text-white hover:bg-blue-700" : "",
                )}
              >
                {selectedRegime === "old" ? "Selected" : "Opt for Old"}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-5 space-y-3.5 text-xs">
            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">Annual Gross CTC</span>
              <span className="font-bold tabular-nums">
                ₹{comparison.oldRegime.grossSalary.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">Standard Deduction</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                -₹{comparison.oldRegime.standardDeduction.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">HRA Exemption (Sec 10(13A))</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                -₹{comparison.oldRegime.hraExemption.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">Chapter VI-A (80C, 80D, 24b, NPS)</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                -₹
                {(
                  comparison.oldRegime.section80c +
                  comparison.oldRegime.section80d +
                  comparison.oldRegime.section24b +
                  comparison.oldRegime.section80ccd1b +
                  comparison.oldRegime.section80ccd2EmployerNps +
                  comparison.oldRegime.otherDeductions
                ).toLocaleString("en-IN")}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-border/40 font-bold bg-muted/30 px-2 rounded-lg">
              <span>Net Taxable Income</span>
              <span className="tabular-nums">
                ₹{comparison.oldRegime.taxableIncome.toLocaleString("en-IN")}
              </span>
            </div>

            {/* Slab summary */}
            <div className="bg-muted/40 rounded-xl p-3 space-y-1.5 text-[11px]">
              <div className="text-muted-foreground font-semibold flex items-center justify-between">
                <span>Tax Breakdown by Slabs:</span>
                <span className="tabular-nums">
                  ₹{comparison.oldRegime.taxBeforeRebate.toLocaleString("en-IN")}
                </span>
              </div>
              {comparison.oldRegime.rebate87a > 0 && (
                <div className="flex justify-between text-blue-600 font-semibold">
                  <span>Less: Section 87A Rebate</span>
                  <span>-₹{comparison.oldRegime.rebate87a.toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>Add: 4% Health &amp; Education Cess</span>
                <span>₹{comparison.oldRegime.cess.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Total Annual Tax & Monthly TDS */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 dark:border-blue-900/60 dark:bg-blue-950/20 p-3.5 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">
                  Total Annual Tax
                </div>
                <div className="text-xl font-extrabold text-foreground tabular-nums">
                  ₹{comparison.oldRegime.totalAnnualTax.toLocaleString("en-IN")}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-semibold text-muted-foreground">Monthly TDS</div>
                <div className="text-sm font-bold text-foreground tabular-nums">
                  ₹{comparison.oldRegime.monthlyTds.toLocaleString("en-IN")}/mo
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Smart Advisory Cards (NPS, EPF, TDS) */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-600" />
          Smart Financial Advisory (NPS, EPF &amp; TDS Optimization)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Corporate NPS Card */}
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs text-amber-900 dark:text-amber-300">
                <PiggyBank className="h-4 w-4 text-amber-600" />
                <span>Corporate NPS (80CCD(2))</span>
              </div>
              <Badge
                variant="outline"
                className="text-[10px] border-amber-300 text-amber-700 dark:text-amber-400 font-bold"
              >
                Both Regimes
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {advisory.corporateNps.explanation}
            </p>
            <div className="pt-1 flex items-center justify-between border-t border-amber-200/60 dark:border-amber-900/60 text-xs">
              <span className="text-muted-foreground">Eligible Contribution:</span>
              <span className="font-bold text-foreground">
                Up to ₹{advisory.corporateNps.maxEligibleAnnual.toLocaleString("en-IN")}/yr (10%)
              </span>
            </div>
            {/* Quick toggle to simulate */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] font-semibold">Simulate 10% NPS:</span>
              <Switch
                checked={employerNpsPct === 10}
                onCheckedChange={(checked) => setEmployerNpsPct(checked ? 10 : 0)}
              />
            </div>
          </div>

          {/* EPF Advisory Card */}
          <div className="rounded-2xl border border-border bg-card p-4 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                <Building className="h-4 w-4 text-primary" />
                <span>Employees&apos; Provident Fund (EPF)</span>
              </div>
              <Badge variant="secondary" className="text-[10px] font-medium">
                Annual ₹{advisory.epf.currentAnnual.toLocaleString("en-IN")}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {advisory.epf.recommendation}
            </p>
            <div className="pt-1 border-t border-border/60 text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Info className="h-3 w-3 text-primary shrink-0" />
              <span>{advisory.epf.takeHomeImpactText}</span>
            </div>
          </div>

          {/* TDS Smoother Card */}
          <div className="rounded-2xl border border-border bg-card p-4 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Dynamic TDS Smoother</span>
              </div>
              <Badge
                variant="outline"
                className="text-[10px] border-emerald-300 text-emerald-700 dark:text-emerald-400 font-bold"
              >
                12 Months
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {advisory.tds.explanation}
            </p>
            <div className="pt-1 border-t border-border/60 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Optimal Monthly TDS:</span>
              <span className="font-extrabold text-foreground">
                ₹{advisory.tds.recommendedMonthlyTds.toLocaleString("en-IN")}/mo
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Form 12BB Declaration Inputs & Save Button */}
      <Card className="rounded-2xl border-border/80 shadow-xs">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-600" />
                Form 12BB — Employee Investment Declaration &amp; Rent Proofs
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Declare your planned or actual investments. Live adjustments automatically update
                your tax calculations.
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleSaveDeclaration}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1.5 shadow-xs"
            >
              <Check className="h-3.5 w-3.5" />
              Save Declarations
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Rent Paid */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Monthly House Rent Paid (₹)</Label>
              <Input
                type="number"
                min="0"
                value={rentPaidMonthly || ""}
                onChange={(e) => setRentPaidMonthly(Number(e.target.value) || 0)}
                placeholder="e.g. 20000"
                className="h-9 text-xs"
              />
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-muted-foreground">Metro City (50% HRA cap):</span>
                <Switch checked={isMetroCity} onCheckedChange={setIsMetroCity} />
              </div>
            </div>

            {/* Additional 80C */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Additional 80C (PPF, ELSS, LIC)</span>
                <span className="text-[10px] text-muted-foreground">Cap: ₹1.5L</span>
              </Label>
              <Input
                type="number"
                min="0"
                value={additional80c || ""}
                onChange={(e) => setAdditional80c(Number(e.target.value) || 0)}
                placeholder="e.g. 78000"
                className="h-9 text-xs"
              />
              <span className="text-[10px] text-muted-foreground block">
                Auto-includes Annual EPF: ₹{Math.round(epfAnnual).toLocaleString("en-IN")}
              </span>
            </div>

            {/* Medical Insurance (80D) - Self */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>80D Medical (Self &amp; Family)</span>
                <span className="text-[10px] text-muted-foreground">Cap: ₹25k</span>
              </Label>
              <Input
                type="number"
                min="0"
                value={healthInsuranceSelf || ""}
                onChange={(e) => setHealthInsuranceSelf(Number(e.target.value) || 0)}
                placeholder="e.g. 20000"
                className="h-9 text-xs"
              />
            </div>

            {/* Medical Insurance (80D) - Parents */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>80D Medical (Parents)</span>
                <span className="text-[10px] text-muted-foreground">Cap: ₹50k</span>
              </Label>
              <Input
                type="number"
                min="0"
                value={healthInsuranceParents || ""}
                onChange={(e) => setHealthInsuranceParents(Number(e.target.value) || 0)}
                placeholder="e.g. 35000"
                className="h-9 text-xs"
              />
            </div>

            {/* Home Loan Interest (24b) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Home Loan Interest (Sec 24b)</span>
                <span className="text-[10px] text-muted-foreground">Cap: ₹2 Lakh</span>
              </Label>
              <Input
                type="number"
                min="0"
                value={homeLoanInterest || ""}
                onChange={(e) => setHomeLoanInterest(Number(e.target.value) || 0)}
                placeholder="e.g. 150000"
                className="h-9 text-xs"
              />
            </div>

            {/* Voluntary NPS (80CCD(1B)) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Voluntary NPS (Sec 80CCD(1B))</span>
                <span className="text-[10px] text-muted-foreground">Cap: ₹50k</span>
              </Label>
              <Input
                type="number"
                min="0"
                value={voluntaryNps || ""}
                onChange={(e) => setVoluntaryNps(Number(e.target.value) || 0)}
                placeholder="e.g. 50000"
                className="h-9 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 6. In-Portal Tax Filing & Form 16 Actions */}
      <div className="rounded-2xl border border-border/80 bg-gradient-to-r from-stone-900 via-stone-850 to-stone-950 p-5 sm:p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Download className="h-4 w-4 text-amber-400" />
              File Your Income Tax Return (ITR-1 Sahaj) From The Portal
            </h3>
          </div>
          <p className="text-xs text-stone-300 max-w-2xl leading-relaxed">
            Generate your official pre-filled ITR-1 JSON file or print your Form 16 Part B Tax
            Computation Sheet for instant 1-click filing on the Income Tax Department portal
            (incometax.gov.in).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <Button
            size="sm"
            onClick={handleDownloadItrJson}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1.5 shadow-md flex-1 md:flex-none"
          >
            <Download className="h-3.5 w-3.5" />
            Download ITR-1 JSON
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsItrModalOpen(true)}
            className="border-stone-700 bg-stone-800 hover:bg-stone-700 text-white font-semibold text-xs gap-1.5 flex-1 md:flex-none"
          >
            <ExternalLink className="h-3.5 w-3.5 text-amber-400" />
            e-Filing Guide
          </Button>
        </div>
      </div>

      {/* DIALOG 1: e-Filing Instructions */}
      <Dialog open={isItrModalOpen} onOpenChange={setIsItrModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <ExternalLink className="h-4 w-4 text-amber-600" />
              How to File Tax in 3 Steps Using Your Downloaded JSON
            </DialogTitle>
            <DialogDescription className="text-xs">
              Direct e-filing workflow on the Government of India Income Tax Portal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            <div className="flex items-start gap-3 p-3 rounded-xl border border-border bg-muted/40">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-600 text-white font-bold text-xs">
                1
              </span>
              <div>
                <div className="font-bold text-foreground">Download Your Pre-filled JSON</div>
                <div className="text-muted-foreground mt-0.5">
                  Click the &ldquo;Download ITR-1 JSON&rdquo; button above. It pre-packages your
                  gross salary, standard deduction, selected regime (
                  {selectedRegime === "new" ? "New" : "Old"}), and tax deductions.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl border border-border bg-muted/40">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-600 text-white font-bold text-xs">
                2
              </span>
              <div>
                <div className="font-bold text-foreground">Log in to incometax.gov.in</div>
                <div className="text-muted-foreground mt-0.5">
                  Log in using your PAN and password. Navigate to{" "}
                  <strong>e-File → Income Tax Returns → File Income Tax Return</strong>.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl border border-border bg-muted/40">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-600 text-white font-bold text-xs">
                3
              </span>
              <div>
                <div className="font-bold text-foreground">
                  Upload JSON &amp; Verify via Aadhaar OTP
                </div>
                <div className="text-muted-foreground mt-0.5">
                  Select filing mode <strong>&ldquo;Upload JSON&rdquo;</strong>, attach the
                  downloaded file, preview your return, and e-verify with your Aadhaar OTP. Your
                  return is submitted immediately!
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open("https://www.incometax.gov.in", "_blank")}
                className="gap-1.5 text-xs font-semibold"
              >
                <span>Open incometax.gov.in</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                onClick={handleDownloadItrJson}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
              >
                Download JSON Now
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: Detailed Tax Computation Sheet (Form 16 Part B view) */}
      <Dialog open={isComputationModalOpen} onOpenChange={setIsComputationModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <FileText className="h-4 w-4 text-primary" />
              Tax Computation Sheet &amp; Form 16 Part B Summary
            </DialogTitle>
            <DialogDescription className="text-xs">
              Employee: {employeeName} | Selected Regime:{" "}
              {selectedRegime === "new" ? "New (115BAC)" : "Old"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs pt-2">
            <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-2">
              <div className="flex justify-between font-bold border-b border-border/60 pb-1.5 text-sm">
                <span>1. Gross Salary (under section 17(1))</span>
                <span className="tabular-nums">
                  ₹{comparison.newRegime.grossSalary.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Less: Standard Deduction u/s 16(ia)</span>
                <span className="tabular-nums">
                  -₹
                  {(selectedRegime === "new"
                    ? STANDARD_DEDUCTION_NEW_REGIME
                    : STANDARD_DEDUCTION_OLD_REGIME
                  ).toLocaleString("en-IN")}
                </span>
              </div>
              {selectedRegime === "old" && comparison.oldRegime.hraExemption > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Less: HRA Exemption u/s 10(13A)</span>
                  <span className="tabular-nums">
                    -₹{comparison.oldRegime.hraExemption.toLocaleString("en-IN")}
                  </span>
                </div>
              )}
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-2">
              <div className="font-bold border-b border-border/60 pb-1.5 text-sm">
                <span>2. Chapter VI-A Deductions</span>
              </div>
              {selectedRegime === "new" ? (
                <>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Employer NPS (Sec 80CCD(2))</span>
                    <span className="tabular-nums">
                      -₹{comparison.newRegime.section80ccd2EmployerNps.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground italic">
                    Note: Other Chapter VI-A deductions are not allowable under Section 115BAC.
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Section 80C (EPF, PPF, ELSS, Life Insurance)</span>
                    <span className="tabular-nums">
                      -₹{comparison.oldRegime.section80c.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Section 80D (Health Insurance)</span>
                    <span className="tabular-nums">
                      -₹{comparison.oldRegime.section80d.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Section 24(b) (Home Loan Interest)</span>
                    <span className="tabular-nums">
                      -₹{comparison.oldRegime.section24b.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Section 80CCD(1B) (Voluntary NPS)</span>
                    <span className="tabular-nums">
                      -₹{comparison.oldRegime.section80ccd1b.toLocaleString("en-IN")}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-primary/5 space-y-2">
              <div className="flex justify-between font-bold text-sm">
                <span>3. Net Taxable Income</span>
                <span className="tabular-nums">
                  ₹
                  {(selectedRegime === "new"
                    ? comparison.newRegime.taxableIncome
                    : comparison.oldRegime.taxableIncome
                  ).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax on Taxable Income</span>
                <span className="tabular-nums">
                  ₹
                  {(selectedRegime === "new"
                    ? comparison.newRegime.taxBeforeRebate
                    : comparison.oldRegime.taxBeforeRebate
                  ).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Less: Section 87A Rebate</span>
                <span className="tabular-nums">
                  -₹
                  {(selectedRegime === "new"
                    ? comparison.newRegime.rebate87a
                    : comparison.oldRegime.rebate87a
                  ).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Add: 4% Health &amp; Education Cess</span>
                <span className="tabular-nums">
                  ₹
                  {(selectedRegime === "new"
                    ? comparison.newRegime.cess
                    : comparison.oldRegime.cess
                  ).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between font-black text-base border-t border-border/80 pt-2 text-foreground">
                <span>Total Tax Payable</span>
                <span className="tabular-nums">
                  ₹
                  {(selectedRegime === "new"
                    ? comparison.newRegime.totalAnnualTax
                    : comparison.oldRegime.totalAnnualTax
                  ).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="gap-1.5 text-xs font-semibold"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Sheet</span>
              </Button>
              <Button
                size="sm"
                onClick={handleDownloadItrJson}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export ITR-1 JSON</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Estimate Studio — Stone Murals Calculator
 *
 * Implements the Stone Murals pricing and sizing scenario for natural-stone murals:
 * 1) Wall Size (Width x Height, customizable units).
 * 2) Slab Size Available & Thickness (defaults to 50 mm Sandstone @ Rs 550 / sq ft),
 *    with automatic slab requirement calculation (grid layout & area coverage).
 * 3) CNC Job Work prices:
 *    - Engraving / Dipping: uptil 6 mm (Rs 450/sqft), uptil 12 mm (Rs 650/sqft)
 *    - Embossing Work: uptil 10 mm (Rs 850/sqft), uptil 30 mm (Rs 1050/sqft)
 * 4) Rubbing: Rs 25 / sq ft.
 * 5) Polishing work (Optional): Rs 300 / sq ft.
 * 6) Installation Labour: Rs 200 / sq ft.
 * 7) Adhesives: fetched directly from Wall Stone Cladding catalog.
 * 8) Touch Up Work: Rs 200 / sq ft.
 * 9) Carting: As per location, input when carting agency quotes.
 *
 * Emits QuoteItemInput[] and EstimateMuralWorksheet upward to Quotations,
 * and provides 1-click WhatsApp message and PDF generation.
 */

import { useEffect, useMemo, useState } from "react";
import {
  FileDown,
  ImagePlus,
  Loader2,
  MessageCircle,
  Sparkles,
  Truck,
  Layers,
  Wrench,
  CheckCircle2,
  X,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatInr } from "@/lib/format";
import {
  LENGTH_UNITS,
  LENGTH_UNIT_LABELS,
  type LengthUnit,
  wallSqft,
  ceilWhole,
  ADHESIVE_CATALOG,
  MURAL_CNC_OPTIONS,
  DEFAULT_MURAL_THICKNESS_MM,
  DEFAULT_MURAL_STONE_TYPE,
  DEFAULT_MURAL_RUBBING_RATE,
  DEFAULT_MURAL_POLISHING_RATE,
  DEFAULT_MURAL_INSTALLATION_LABOUR_RATE,
  DEFAULT_MURAL_TOUCH_UP_RATE,
  getDefaultSlabPrice,
  calculateMuralSlabs,
} from "@/lib/quotes/estimateCatalog";
import type { EstimateMuralWorksheet } from "@/lib/quotes/estimateSchema";
import { getProject } from "@/lib/projects/api";
import { getCustomer } from "@/lib/customers/api";
import {
  buildMuralEstimateWhatsappMessage,
  printEstimatePdf,
  openWhatsappWithMessage,
} from "@/lib/quotes/estimateWhatsappPdf";
import type { QuoteCategory, QuoteItemInput } from "@/lib/quotes/schema";

export interface StoneMuralResult {
  items: QuoteItemInput[];
  worksheet: EstimateMuralWorksheet;
  totalWallSqft: number;
  total: number;
}

const COMMON_STONE_TYPES = [
  "Sandstone",
  "Mint Sandstone",
  "Teakwood Sandstone",
  "Rainbow Sandstone",
  "Dholpur Beige Sandstone",
  "Red Mandana Stone",
  "Gwalior Mint Stone",
  "White Marble",
  "Black Granite",
  "Limestone",
  "Other Natural Stone",
];

export function StoneMuralCalculator({
  projectId,
  category,
  onCategoryChange,
  onResult,
  onTransferToManual,
}: {
  projectId: string | null;
  category?: QuoteCategory | "";
  onCategoryChange?: (cat: QuoteCategory) => void;
  onResult: (result: StoneMuralResult | null) => void;
  onTransferToManual?: () => void;
}) {
  const [unit, setUnit] = useState<LengthUnit>("ft");

  const [includeInstallation, setIncludeInstallation] = useState<boolean>(() => {
    return category !== "supply_only";
  });

  useEffect(() => {
    if (category === "supply_only") {
      setIncludeInstallation(false);
    } else if (category === "supply_and_installation" || category === "material_and_labour") {
      setIncludeInstallation(true);
    }
  }, [category]);

  // 1) Wall Size
  const [wallHeight, setWallHeight] = useState<string>("");
  const [wallLength, setWallLength] = useState<string>("");

  // 2) Slab Size & Thickness
  const [slabHeight, setSlabHeight] = useState<string>("");
  const [slabLength, setSlabLength] = useState<string>("");
  const [slabThickness, setSlabThickness] = useState<string>(String(DEFAULT_MURAL_THICKNESS_MM));
  const [stoneType, setStoneType] = useState<string>(DEFAULT_MURAL_STONE_TYPE);
  const [customStoneType, setCustomStoneType] = useState<string>("");
  const [slabPrice, setSlabPrice] = useState<string>(
    String(getDefaultSlabPrice(DEFAULT_MURAL_STONE_TYPE, DEFAULT_MURAL_THICKNESS_MM)),
  );
  const [slabsOverride, setSlabsOverride] = useState<string>("");

  // 3) CNC Job Work
  const [cncKey, setCncKey] = useState<string>("");
  const [cncCustomRate, setCncCustomRate] = useState<string>("");

  // 4) Rubbing
  const [rubbingEnabled, setRubbingEnabled] = useState<boolean>(true);
  const [rubbingRate, setRubbingRate] = useState<string>(String(DEFAULT_MURAL_RUBBING_RATE));

  // 5) Polishing (Optional)
  const [polishingEnabled, setPolishingEnabled] = useState<boolean>(false);
  const [polishingRate, setPolishingRate] = useState<string>(String(DEFAULT_MURAL_POLISHING_RATE));

  // 6) Installation Labour
  const [labourRate, setLabourRate] = useState<string>(
    String(DEFAULT_MURAL_INSTALLATION_LABOUR_RATE),
  );

  // 7) Adhesives (fetched from Wall Stone Cladding catalog)
  const [selectedAdhesiveKey, setSelectedAdhesiveKey] = useState<string>(
    ADHESIVE_CATALOG[0]?.key ?? "standard_cement_white",
  );
  const [adhesiveCustomPrice, setAdhesiveCustomPrice] = useState<string>("");

  // 8) Touch Up Work
  const [touchUpEnabled, setTouchUpEnabled] = useState<boolean>(true);
  const [touchUpRate, setTouchUpRate] = useState<string>(String(DEFAULT_MURAL_TOUCH_UP_RATE));

  // 9) Carting / Freight
  const [cartingLocation, setCartingLocation] = useState<string>("");
  const [cartingAmount, setCartingAmount] = useState<string>("");

  // Design visual
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [timeToComplete, setTimeToComplete] = useState<string>("");

  // WhatsApp / PDF header prefill
  const [greetingName, setGreetingName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [preparerName, setPreparerName] = useState("");
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState("");
  const [validityDays, setValidityDays] = useState("15");
  const [sending, setSending] = useState(false);

  // When stone type or thickness changes, adjust default slab price if user hasn't explicitly customized
  const effectiveStoneType = stoneType === "Other Natural Stone" ? customStoneType : stoneType;
  useEffect(() => {
    const thk = Number(slabThickness) || 0;
    const def = getDefaultSlabPrice(effectiveStoneType, thk);
    setSlabPrice(String(def));
  }, [effectiveStoneType, slabThickness]);

  // Project prefill for customer greeting & phone
  useEffect(() => {
    let cancelled = false;
    if (!projectId) {
      setGreetingName("");
      setCustomerMobile("");
      return;
    }
    getProject(projectId)
      .then((project) => {
        if (cancelled || !project) return;
        return getCustomer(project.customer_id).then((customer) => {
          if (cancelled || !customer) return;
          setGreetingName(customer.name ?? "");
          setCustomerMobile(customer.primary_phone ?? "");
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // Calculations
  const wallH = Number(wallHeight) || 0;
  const wallL = Number(wallLength) || 0;
  const slabH = Number(slabHeight) || 0;
  const slabL = Number(slabLength) || 0;
  const slabThk = Number(slabThickness) || 50;
  const userOverrideCount = slabsOverride !== "" ? Number(slabsOverride) : null;

  const slabCalc = useMemo(() => {
    return calculateMuralSlabs({
      wallHeight: wallH,
      wallLength: wallL,
      slabHeight: slabH,
      slabLength: slabL,
      unit,
      slabsCountOverride: userOverrideCount,
    });
  }, [wallH, wallL, slabH, slabL, unit, userOverrideCount]);

  const wallAreaSqft = slabCalc.wallSqft;
  const slabAreaSqft = slabCalc.slabSqft;
  const slabsCount = slabCalc.slabsRequired;
  const totalSlabSqft = slabCalc.totalSlabSqft;

  // 2) Stone Slabs Cost
  const ratePerSlabSqft = Number(slabPrice) || 0;
  const stoneSlabsAmount = totalSlabSqft * ratePerSlabSqft;

  // 3) CNC Job Work Cost
  const selectedCnc = MURAL_CNC_OPTIONS.find((c) => c.key === cncKey);
  const cncRate =
    cncKey === "custom"
      ? Number(cncCustomRate) || 0
      : selectedCnc
        ? selectedCnc.defaultRatePerSqft
        : 0;
  const cncAmount = wallAreaSqft * cncRate;

  // 4) Rubbing Cost
  const rubRate = Number(rubbingRate) || 0;
  const rubbingAmount = rubbingEnabled ? wallAreaSqft * rubRate : 0;

  // 5) Polishing Cost
  const polRate = Number(polishingRate) || 0;
  const polishingAmount = polishingEnabled ? wallAreaSqft * polRate : 0;

  // 6) Installation Labour Cost
  const instRate = Number(labourRate) || 0;
  const labourAmount = wallAreaSqft * instRate;

  // 7) Adhesives (fetched from Wall Stone Cladding catalog)
  const activeAdhesiveCatalog =
    ADHESIVE_CATALOG.find((a) => a.key === selectedAdhesiveKey) || ADHESIVE_CATALOG[0];
  const adhesiveUnits =
    wallAreaSqft > 0 && activeAdhesiveCatalog
      ? ceilWhole(wallAreaSqft / activeAdhesiveCatalog.coverageSqftPerUnit)
      : 0;
  const adhesiveUnitPrice =
    adhesiveCustomPrice !== ""
      ? Number(adhesiveCustomPrice) || 0
      : activeAdhesiveCatalog?.defaultPricePerUnit || 0;
  const adhesivesAmount = adhesiveUnits * adhesiveUnitPrice;

  // 8) Touch Up Work Cost
  const touchRate = Number(touchUpRate) || 0;
  const touchUpAmount = touchUpEnabled ? wallAreaSqft * touchRate : 0;

  // 9) Carting Cost
  const cartingNum = Number(cartingAmount) || 0;

  const effectiveLabourAmount = includeInstallation ? labourAmount : 0;
  const effectiveAdhesivesAmount = includeInstallation ? adhesivesAmount : 0;

  // Totals
  const subtotal =
    stoneSlabsAmount +
    cncAmount +
    rubbingAmount +
    polishingAmount +
    effectiveLabourAmount +
    effectiveAdhesivesAmount +
    touchUpAmount +
    cartingNum;
  const total = subtotal;

  // Worksheet representation
  const worksheet: EstimateMuralWorksheet = useMemo(() => {
    return {
      version: 1,
      scenario: "stone_mural",
      unit,
      wall: {
        height: wallH,
        length: wallL,
        sqft: wallAreaSqft,
      },
      slab: {
        height: slabH,
        length: slabL,
        sqft: slabAreaSqft,
        thicknessMm: slabThk,
        stoneType: effectiveStoneType,
        slabsRequired: slabsCount,
        gridCols: slabCalc.slabsGrid.cols,
        gridRows: slabCalc.slabsGrid.rows,
        totalSlabSqft,
        pricePerSqft: ratePerSlabSqft,
        amount: stoneSlabsAmount,
      },
      cnc: {
        selectedKey: cncKey,
        label: selectedCnc ? selectedCnc.label : "Custom CNC Work",
        ratePerSqft: cncRate,
        amount: cncAmount,
      },
      rubbing: {
        enabled: rubbingEnabled,
        ratePerSqft: rubRate,
        amount: rubbingAmount,
      },
      polishing: {
        enabled: polishingEnabled,
        ratePerSqft: polRate,
        amount: polishingAmount,
      },
      installationLabour: {
        ratePerSqft: includeInstallation ? instRate : 0,
        amount: effectiveLabourAmount,
      },
      adhesives:
        includeInstallation && activeAdhesiveCatalog
          ? [
              {
                key: activeAdhesiveCatalog.key,
                label: activeAdhesiveCatalog.label,
                units: adhesiveUnits,
                unitLabel: activeAdhesiveCatalog.unit,
                pricePerUnit: adhesiveUnitPrice,
                amount: effectiveAdhesivesAmount,
              },
            ]
          : [],
      adhesivesAmount: effectiveAdhesivesAmount,
      touchUp: {
        enabled: touchUpEnabled,
        ratePerSqft: touchRate,
        amount: touchUpAmount,
      },
      carting: {
        location: cartingLocation.trim() || undefined,
        amount: cartingNum,
      },
      timeToComplete: timeToComplete.trim() || undefined,
      imageDataUrl: imageDataUrl || undefined,
      subtotal,
      total,
    };
  }, [
    unit,
    wallH,
    wallL,
    wallAreaSqft,
    slabH,
    slabL,
    slabAreaSqft,
    slabThk,
    effectiveStoneType,
    slabsCount,
    slabCalc.slabsGrid.cols,
    slabCalc.slabsGrid.rows,
    totalSlabSqft,
    ratePerSlabSqft,
    stoneSlabsAmount,
    cncKey,
    selectedCnc,
    cncRate,
    cncAmount,
    rubbingEnabled,
    rubRate,
    rubbingAmount,
    polishingEnabled,
    polRate,
    polishingAmount,
    instRate,
    effectiveLabourAmount,
    activeAdhesiveCatalog,
    adhesiveUnits,
    adhesiveUnitPrice,
    effectiveAdhesivesAmount,
    includeInstallation,
    touchUpEnabled,
    touchRate,
    touchUpAmount,
    cartingLocation,
    cartingNum,
    timeToComplete,
    imageDataUrl,
    subtotal,
    total,
  ]);

  // Convert to QuoteItemInput[] for Quotation creation
  const items: QuoteItemInput[] = useMemo(() => {
    if (wallAreaSqft <= 0) return [];
    const out: QuoteItemInput[] = [];

    // 1. Stone Slabs
    if (stoneSlabsAmount > 0) {
      out.push({
        product_id: null,
        description: `Stone Mural Slabs — ${effectiveStoneType} (${slabThk}mm) [${slabsCount} slab(s) of ${slabL}x${slabH}${unit}]`,
        quantity: totalSlabSqft,
        unit: "sqft",
        unit_price: ratePerSlabSqft,
        tax_pct: 0,
        fulfilment: null,
        image_url: imageDataUrl || null,
      });
    }

    // 2. CNC Job Work
    if (cncAmount > 0) {
      const cncLabel = selectedCnc ? selectedCnc.label : "Custom CNC Job Work";
      out.push({
        product_id: null,
        description: `CNC Job Work — ${cncLabel}`,
        quantity: wallAreaSqft,
        unit: "sqft",
        unit_price: cncRate,
        tax_pct: 0,
        fulfilment: null,
      });
    }

    // 3. Rubbing
    if (rubbingAmount > 0) {
      out.push({
        product_id: null,
        description: "Surface Rubbing Work",
        quantity: wallAreaSqft,
        unit: "sqft",
        unit_price: rubRate,
        tax_pct: 0,
        fulfilment: null,
      });
    }

    // 4. Polishing (Optional)
    if (polishingAmount > 0) {
      out.push({
        product_id: null,
        description: "Mural Surface Polishing Work",
        quantity: wallAreaSqft,
        unit: "sqft",
        unit_price: polRate,
        tax_pct: 0,
        fulfilment: null,
      });
    }

    // 5. Installation Labour
    if (includeInstallation && effectiveLabourAmount > 0) {
      out.push({
        product_id: null,
        description: "Stone Mural Installation Labour",
        quantity: wallAreaSqft,
        unit: "sqft",
        unit_price: instRate,
        tax_pct: 0,
        fulfilment: null,
      });
    }

    // 6. Adhesives
    if (includeInstallation && effectiveAdhesivesAmount > 0 && activeAdhesiveCatalog) {
      out.push({
        product_id: null,
        description: `Adhesive — ${activeAdhesiveCatalog.label}`,
        quantity: adhesiveUnits,
        unit: activeAdhesiveCatalog.unit,
        unit_price: adhesiveUnitPrice,
        tax_pct: 0,
        fulfilment: null,
      });
    }

    // 7. Touch Up Work
    if (touchUpAmount > 0) {
      out.push({
        product_id: null,
        description: "Mural On-Site Touch Up & Finishing Work",
        quantity: wallAreaSqft,
        unit: "sqft",
        unit_price: touchRate,
        tax_pct: 0,
        fulfilment: null,
      });
    }

    // 8. Carting / Freight
    if (cartingNum > 0) {
      out.push({
        product_id: null,
        description: `Carting & Transportation${cartingLocation.trim() ? ` (${cartingLocation.trim()})` : ""}`,
        quantity: 1,
        unit: "lot",
        unit_price: cartingNum,
        tax_pct: 0,
        hsn_sac: "9965",
        fulfilment: null,
      });
    }

    return out;
  }, [
    wallAreaSqft,
    stoneSlabsAmount,
    effectiveStoneType,
    slabThk,
    slabsCount,
    slabL,
    slabH,
    unit,
    totalSlabSqft,
    ratePerSlabSqft,
    imageDataUrl,
    cncAmount,
    selectedCnc,
    cncRate,
    rubbingAmount,
    rubRate,
    polishingAmount,
    polRate,
    effectiveLabourAmount,
    instRate,
    effectiveAdhesivesAmount,
    activeAdhesiveCatalog,
    adhesiveUnits,
    adhesiveUnitPrice,
    includeInstallation,
    touchUpAmount,
    touchRate,
    cartingNum,
    cartingLocation,
  ]);

  // Propagate to parent quote dialog
  useEffect(() => {
    if (items.length === 0 || wallAreaSqft <= 0) {
      onResult(null);
    } else {
      onResult({
        items,
        worksheet,
        totalWallSqft: wallAreaSqft,
        total,
      });
    }
  }, [items, worksheet, wallAreaSqft, total, onResult]);

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function handleGenerateAndSend() {
    if (wallAreaSqft <= 0 || slabsCount <= 0) {
      toast.error("Please enter valid wall and slab dimensions first");
      return;
    }
    if (!cncKey) {
      toast.error("Please select a CNC job work option (engraving or embossing)");
      return;
    }
    if (!customerMobile.trim()) {
      toast.error(
        "No mobile number on file for this customer — enter customer mobile number below or add one on the customer record",
      );
      return;
    }
    setSending(true);
    try {
      const wallSizeSummary = `${wallH}${unit} x ${wallL}${unit}`;
      const slabDetails = `${slabL}${unit} x ${slabH}${unit} (${slabThk}mm ${effectiveStoneType})`;
      const cncWorkSummary = selectedCnc
        ? `${selectedCnc.label} @ ${formatInr(cncRate)}/sq ft`
        : `Custom CNC Work @ ${formatInr(cncRate)}/sq ft`;
      const adhesivesSummary = activeAdhesiveCatalog
        ? `${adhesiveUnits} ${activeAdhesiveCatalog.unit}(s) ${activeAdhesiveCatalog.label}`
        : "Standard stone adhesive";

      const message = buildMuralEstimateWhatsappMessage(
        {
          greetingName: greetingName.trim() || "there",
          wallSizeSummary,
          wallSqft: wallAreaSqft,
          slabDetails,
          slabsCount,
          totalSlabSqft,
          slabAmount: stoneSlabsAmount,
          slabPricePerSqft: ratePerSlabSqft,
          cncWorkSummary,
          cncAmount,
          rubbingAmount,
          polishingAmount,
          installationLabourAmount: labourAmount,
          adhesivesAmount,
          adhesivesSummary,
          touchUpAmount,
          cartingAmount: cartingNum,
          cartingLocation: cartingLocation.trim() || undefined,
          totalEstimate: total,
          estimatedDeliveryDate: estimatedDeliveryDate.trim() || undefined,
          validityDays: validityDays.trim() || undefined,
          preparerName: preparerName.trim(),
        },
        "Stone Tech, Ahmedabad",
      );

      const photos = imageDataUrl ? [imageDataUrl] : [];
      await printEstimatePdf(message, photos);
      openWhatsappWithMessage(customerMobile, message);
      toast.success(
        "Estimate opened for Print/Save-as-PDF, and WhatsApp opened with message ready — attach the PDF and send.",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate estimate");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Intro badge */}
      <div className="flex items-center justify-between rounded-md border border-primary/20 bg-primary/[0.03] p-3 text-xs text-foreground">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-medium text-foreground">Stone Murals Estimation Studio</span>
          <span className="text-muted-foreground">
            — complete architectural stone mural costing & slab optimization.
          </span>
        </div>
        <Badge variant="outline" className="border-primary/30 text-primary font-mono text-[11px]">
          CNC Carving & Inlay
        </Badge>
      </div>

      {/* Grid: Dimensions & Slabs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Wall Size */}
        <Card className="shadow-sm border-border">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold">1) Wall Size (Mural Area)</CardTitle>
              </div>
              <Select value={unit} onValueChange={(v) => setUnit(v as LengthUnit)}>
                <SelectTrigger className="h-7 w-28 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LENGTH_UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {LENGTH_UNIT_LABELS[u]} ({u})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Wall Height ({unit})
                </label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={wallHeight}
                  onChange={(e) => setWallHeight(e.target.value)}
                  className="mt-1 h-8 text-sm"
                  placeholder="e.g. 10"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Wall Length / Width ({unit})
                </label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={wallLength}
                  onChange={(e) => setWallLength(e.target.value)}
                  className="mt-1 h-8 text-sm"
                  placeholder="e.g. 12"
                />
              </div>
            </div>
            <div className="rounded-md bg-muted/40 p-2.5 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Calculated Wall Area:</span>
              <span className="font-mono font-semibold text-foreground text-sm">
                {wallAreaSqft > 0 ? `${wallAreaSqft.toFixed(2)} sq ft` : "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Slab Size Available & Thickness */}
        <Card className="shadow-sm border-border">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold">
                  2) Slab Size & Thickness Calculation
                </CardTitle>
              </div>
              <Badge variant="outline" className="text-[11px] font-mono">
                {slabsCount > 0 ? `${slabsCount} Slabs Required` : "— Slabs Required"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Slab Length ({unit})
                </label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={slabLength}
                  onChange={(e) => setSlabLength(e.target.value)}
                  className="mt-1 h-8 text-sm"
                  placeholder="e.g. 6"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Slab Height ({unit})
                </label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={slabHeight}
                  onChange={(e) => setSlabHeight(e.target.value)}
                  className="mt-1 h-8 text-sm"
                  placeholder="e.g. 4"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Thickness (mm)</label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min="1"
                  value={slabThickness}
                  onChange={(e) => setSlabThickness(e.target.value)}
                  className="mt-1 h-8 text-sm font-mono"
                  placeholder="50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Stone Type</label>
                <Select value={stoneType} onValueChange={setStoneType}>
                  <SelectTrigger className="mt-1 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_STONE_TYPES.map((st) => (
                      <SelectItem key={st} value={st}>
                        {st}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {stoneType === "Other Natural Stone" && (
                  <Input
                    value={customStoneType}
                    onChange={(e) => setCustomStoneType(e.target.value)}
                    placeholder="Enter custom stone name…"
                    className="mt-1.5 h-8 text-xs"
                  />
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                  <span>Price (₹/sq ft)</span>
                  {slabThk === 50 && effectiveStoneType.toLowerCase().includes("sandstone") && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                      Default 50mm Sandstone
                    </span>
                  )}
                </label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={slabPrice}
                  onChange={(e) => setSlabPrice(e.target.value)}
                  className="mt-1 h-8 text-sm font-mono font-medium"
                  placeholder="550"
                />
              </div>
            </div>

            {/* Calculated slabs details & manual override */}
            <div className="rounded-md border border-border/80 bg-muted/20 p-2.5 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Single Slab Area:</span>
                <span className="font-mono text-foreground font-medium">
                  {slabAreaSqft > 0 ? `${slabAreaSqft.toFixed(2)} sq ft` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Grid Layout Optimization:</span>
                <span className="font-mono text-foreground">
                  {slabCalc.slabsGrid.cols > 0 && slabCalc.slabsGrid.rows > 0
                    ? `${slabCalc.slabsGrid.cols} cols × ${slabCalc.slabsGrid.rows} rows = ${slabCalc.slabsGrid.total} slabs`
                    : "Enter wall & slab dimensions"}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-border/60">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-foreground">Total Slabs Required:</span>
                  <Input
                    type="number"
                    min="1"
                    placeholder={
                      slabCalc.slabsGrid.total > 0 ? String(slabCalc.slabsGrid.total) : "—"
                    }
                    value={slabsOverride}
                    onChange={(e) => setSlabsOverride(e.target.value)}
                    className="h-6 w-16 text-center text-xs font-mono"
                    title="Override slabs count if cutting wastage requires an extra slab"
                  />
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-foreground">
                    {slabsCount > 0
                      ? `${totalSlabSqft} sq ft = ${formatInr(stoneSlabsAmount)}`
                      : "—"}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3) CNC Job Work Prices */}
      <Card className="shadow-sm border-border">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold">3) CNC Job Work Pricing</CardTitle>
            </div>
            <div className="font-mono text-xs font-semibold text-primary">
              {cncKey && cncAmount > 0
                ? `${formatInr(cncAmount)} (${formatInr(cncRate)}/sq ft)`
                : cncKey
                  ? `${formatInr(cncRate)}/sq ft`
                  : "Select carving option"}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {MURAL_CNC_OPTIONS.map((opt) => {
              const isSelected = cncKey === opt.key;
              return (
                <div
                  key={opt.key}
                  onClick={() => setCncKey(opt.key)}
                  className={`cursor-pointer rounded-md border p-3 transition-colors flex items-center justify-between ${
                    isSelected
                      ? "border-primary bg-primary/[0.04] ring-1 ring-primary"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                        isSelected ? "border-primary bg-primary" : "border-muted-foreground/40"
                      }`}
                    >
                      {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground">{opt.label}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {opt.category === "engraving_dipping"
                          ? "Engraving / Dipping Work"
                          : "Embossing High-Relief Work"}
                      </div>
                    </div>
                  </div>
                  <Badge variant={isSelected ? "default" : "outline"} className="font-mono text-xs">
                    ₹{opt.defaultRatePerSqft} / sq ft
                  </Badge>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <div
              onClick={() => setCncKey("custom")}
              className={`cursor-pointer text-xs flex items-center gap-1.5 ${
                cncKey === "custom" ? "font-semibold text-primary" : "text-muted-foreground"
              }`}
            >
              <div
                className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center ${
                  cncKey === "custom" ? "border-primary bg-primary" : "border-muted-foreground/40"
                }`}
              >
                {cncKey === "custom" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
              </div>
              Custom CNC Rate:
            </div>
            {cncKey === "custom" && (
              <Input
                type="number"
                min="0"
                value={cncCustomRate}
                onChange={(e) => setCncCustomRate(e.target.value)}
                placeholder="Rate in ₹ / sq ft"
                className="h-7 w-36 text-xs font-mono"
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Finishing & Site Labour Breakdown (Rubbing, Polishing, Labour, Touch Up) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 4 & 5: Surface Finishing (Rubbing & Polishing) */}
        <Card className="shadow-sm border-border">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold">
              4 & 5) Finishing (Rubbing & Optional Polishing)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3">
            {/* Rubbing */}
            <div className="flex items-center justify-between rounded-md border border-border p-2.5">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="mural-rubbing"
                  checked={rubbingEnabled}
                  onCheckedChange={(c) => setRubbingEnabled(!!c)}
                />
                <label
                  htmlFor="mural-rubbing"
                  className="cursor-pointer text-xs font-medium text-foreground"
                >
                  Rubbing Work (Default ₹25/sq ft)
                </label>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-muted-foreground">₹</span>
                  <Input
                    type="number"
                    min="0"
                    value={rubbingRate}
                    onChange={(e) => setRubbingRate(e.target.value)}
                    disabled={!rubbingEnabled}
                    className="h-7 w-16 text-right text-xs font-mono"
                  />
                  <span className="text-[11px] text-muted-foreground">/sqft</span>
                </div>
                <div className="font-mono text-xs font-semibold w-20 text-right text-foreground">
                  {rubbingAmount > 0 ? formatInr(rubbingAmount) : "—"}
                </div>
              </div>
            </div>

            {/* Polishing Work (Optional) */}
            <div
              className={`flex items-center justify-between rounded-md border p-2.5 transition-colors ${
                polishingEnabled ? "border-primary/40 bg-primary/[0.02]" : "border-border"
              }`}
            >
              <div className="flex items-center gap-2">
                <Checkbox
                  id="mural-polishing"
                  checked={polishingEnabled}
                  onCheckedChange={(c) => setPolishingEnabled(!!c)}
                />
                <div>
                  <label
                    htmlFor="mural-polishing"
                    className="cursor-pointer text-xs font-medium text-foreground flex items-center gap-1.5"
                  >
                    Polishing Work{" "}
                    <Badge variant="outline" className="text-[10px] py-0 px-1">
                      Optional
                    </Badge>
                  </label>
                  <p className="text-[10px] text-muted-foreground">
                    Mirror / high-gloss hand or machine polishing
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-muted-foreground">₹</span>
                  <Input
                    type="number"
                    min="0"
                    value={polishingRate}
                    onChange={(e) => setPolishingRate(e.target.value)}
                    disabled={!polishingEnabled}
                    className="h-7 w-16 text-right text-xs font-mono"
                  />
                  <span className="text-[11px] text-muted-foreground">/sqft</span>
                </div>
                <div className="font-mono text-xs font-semibold w-20 text-right text-foreground">
                  {polishingAmount > 0 ? formatInr(polishingAmount) : "—"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 6 & 7: Site Labour & Touch Up */}
        <Card className="shadow-sm border-border">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold">6 & 7) Labour & Touch Up Work</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3">
            {/* Installation Labour */}
            <div className="flex items-center justify-between rounded-md border border-border p-2.5">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="mural-installation"
                  checked={includeInstallation}
                  onCheckedChange={(c) => {
                    const checked = !!c;
                    setIncludeInstallation(checked);
                    if (!checked && category !== "supply_only") {
                      onCategoryChange?.("supply_only");
                    } else if (checked && category === "supply_only") {
                      onCategoryChange?.("supply_and_installation");
                    }
                  }}
                />
                <div>
                  <label
                    htmlFor="mural-installation"
                    className="cursor-pointer text-xs font-medium text-foreground flex items-center gap-1.5"
                  >
                    <span>Installation Labour (Default ₹200/sq ft)</span>
                    {!includeInstallation && (
                      <span className="text-[10px] text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 px-1.5 py-0.5 rounded border border-amber-200">
                        Excluded (Supply Only)
                      </span>
                    )}
                  </label>
                  <p className="text-[10px] text-muted-foreground">
                    Stone mural anchoring, alignment, and fixing
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-muted-foreground">₹</span>
                  <Input
                    type="number"
                    min="0"
                    disabled={!includeInstallation}
                    value={labourRate}
                    onChange={(e) => setLabourRate(e.target.value)}
                    className="h-7 w-16 text-right text-xs font-mono"
                  />
                  <span className="text-[11px] text-muted-foreground">/sqft</span>
                </div>
                <div className="font-mono text-xs font-semibold w-20 text-right text-foreground">
                  {effectiveLabourAmount > 0 ? formatInr(effectiveLabourAmount) : "—"}
                </div>
              </div>
            </div>

            {/* Touch Up Work */}
            <div className="flex items-center justify-between rounded-md border border-border p-2.5">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="mural-touchup"
                  checked={touchUpEnabled}
                  onCheckedChange={(c) => setTouchUpEnabled(!!c)}
                />
                <div>
                  <label
                    htmlFor="mural-touchup"
                    className="cursor-pointer text-xs font-medium text-foreground"
                  >
                    Touch Up Work (Default ₹200/sq ft)
                  </label>
                  <p className="text-[10px] text-muted-foreground">
                    Carving refinement, edge blending, and joint cleanup
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-muted-foreground">₹</span>
                  <Input
                    type="number"
                    min="0"
                    value={touchUpRate}
                    onChange={(e) => setTouchUpRate(e.target.value)}
                    disabled={!touchUpEnabled}
                    className="h-7 w-16 text-right text-xs font-mono"
                  />
                  <span className="text-[11px] text-muted-foreground">/sqft</span>
                </div>
                <div className="font-mono text-xs font-semibold w-20 text-right text-foreground">
                  {touchUpAmount > 0 ? formatInr(touchUpAmount) : "—"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 6) Adhesives & 8) Carting */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Adhesives Card */}
        <Card className="shadow-sm border-border">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                6) Adhesives (Fetched from Cladding Studio)
              </CardTitle>
              <span className="font-mono text-xs font-semibold text-foreground">
                {effectiveAdhesivesAmount > 0
                  ? formatInr(effectiveAdhesivesAmount)
                  : includeInstallation
                    ? "—"
                    : "₹0 (Excluded)"}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Select Stone Adhesive Formulation
              </label>
              <Select value={selectedAdhesiveKey} onValueChange={setSelectedAdhesiveKey}>
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADHESIVE_CATALOG.map((adh) => (
                    <SelectItem key={adh.key} value={adh.key}>
                      {adh.label} (₹{adh.defaultPricePerUnit}/{adh.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md bg-muted/30 p-2.5 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Coverage per unit:</span>
                <span className="font-mono text-foreground">
                  {activeAdhesiveCatalog?.coverageSqftPerUnit} sq ft / {activeAdhesiveCatalog?.unit}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Quantity calculated:</span>
                <span className="font-mono font-medium text-foreground">
                  {adhesiveUnits > 0 ? `${adhesiveUnits} ${activeAdhesiveCatalog?.unit}(s)` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-border/60">
                <span className="text-muted-foreground">Price per unit:</span>
                <div className="flex items-center gap-1">
                  <span className="text-[11px]">₹</span>
                  <Input
                    type="number"
                    min="0"
                    placeholder={String(activeAdhesiveCatalog?.defaultPricePerUnit || 0)}
                    value={adhesiveCustomPrice}
                    onChange={(e) => setAdhesiveCustomPrice(e.target.value)}
                    className="h-6 w-20 text-right text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Carting / Transportation Card */}
        <Card className="shadow-sm border-border">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold">
                  8) Carting / Freight (As per Location)
                </CardTitle>
              </div>
              <span className="font-mono text-xs font-semibold text-foreground">
                {cartingNum > 0 ? formatInr(cartingNum) : "On Actuals"}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Delivery Location / Site Address
              </label>
              <Input
                value={cartingLocation}
                onChange={(e) => setCartingLocation(e.target.value)}
                placeholder="e.g. Ahmedabad to Mumbai Site, Local Delivery…"
                className="mt-1 h-8 text-xs"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                Added as and when customer asks and carting agency confirms rates.
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Carting Amount (₹ Lump Sum)
              </label>
              <Input
                type="number"
                min="0"
                value={cartingAmount}
                onChange={(e) => setCartingAmount(e.target.value)}
                placeholder="Enter ₹ amount quoted by transporter"
                className="mt-1 h-8 text-sm font-mono"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Design Reference Attachment */}
      <Card className="shadow-sm border-border">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">
              Mural Design Reference / Visual Artwork
            </CardTitle>
            {imageDataUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setImageDataUrl(null)}
                className="h-7 text-xs text-destructive"
              >
                <X className="h-3 w-3 mr-1" /> Remove Photo
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-1">
          {imageDataUrl ? (
            <div className="flex items-center gap-4">
              <img
                src={imageDataUrl}
                alt="Mural design preview"
                className="h-24 w-32 object-cover rounded-md border border-border shadow-sm"
              />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Design reference attached.</p>
                <p>This image will appear on the WhatsApp estimate and printed proposal PDF.</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer rounded-md border border-dashed border-border px-3 py-2 text-xs font-medium hover:bg-muted/40 transition-colors">
                <ImagePlus className="h-4 w-4 text-muted-foreground" />
                <span>Upload Design Drawing / Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
              <span className="text-[11px] text-muted-foreground">
                Optional: attach 2D/3D CAD render or carving sketch for customer preview.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generated Quote Items Preview & Direct Transfer to Manual */}
      <div className="rounded-lg border border-border bg-slate-50/80 dark:bg-slate-900/60 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Quote Line Items Preview</span>
              <span className="text-xs font-normal text-muted-foreground">
                ({items.length} {items.length === 1 ? "item" : "items"})
              </span>
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              These line items will be created in the quotation. You can customize them directly in
              the line items editor before saving.
            </p>
          </div>
          {onTransferToManual && items.length > 0 && (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={onTransferToManual}
              className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer shadow-sm"
              title="Switch to Manual line items mode with these items prefilled for full custom editing"
            >
              <FileText className="mr-1.5 h-3.5 w-3.5" />
              Customize in Line Items &rarr;
            </Button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="text-xs text-muted-foreground py-2 text-center">
            Enter wall dimensions and select CNC work above to generate quote line items.
          </div>
        ) : (
          <div className="divide-y divide-border/50 text-xs">
            {items.map((it, idx) => {
              const lineTotal = (Number(it.quantity) || 0) * (Number(it.unit_price) || 0);
              return (
                <div key={idx} className="py-2 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {idx + 1}. {it.description}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Qty:{" "}
                      <span className="font-medium text-foreground">
                        {it.quantity} {it.unit}
                      </span>{" "}
                      &times; Rate:{" "}
                      <span className="font-medium text-foreground">
                        {formatInr(Number(it.unit_price) || 0)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                    {formatInr(lineTotal)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="border-t pt-2.5 flex items-center justify-between text-xs font-semibold">
          <span>Estimate Total ({items.length} items)</span>
          <span className="text-base font-bold text-slate-900 dark:text-slate-100 tabular-nums">
            {formatInr(total)}
          </span>
        </div>
      </div>

      {/* Comprehensive Total & WhatsApp/PDF Bar */}
      <Card className="shadow-sm border-primary/30 bg-primary/[0.02]">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border/80 pb-3">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Stone Mural Estimate Total
              </div>
              <div className="text-2xl font-bold font-mono text-primary">
                {wallAreaSqft > 0 ? formatInr(total) : "₹0"}
              </div>
              <div className="text-xs text-muted-foreground">
                {wallAreaSqft > 0
                  ? `Wall coverage: ${wallAreaSqft.toFixed(1)} sq ft • Stone slabs: ${totalSlabSqft} sq ft (${slabsCount} slabs)`
                  : "Enter wall dimensions and slab sizes above to compute estimate."}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerateAndSend}
                disabled={sending || wallAreaSqft <= 0 || !cncKey}
                className="gap-1.5 h-9"
              >
                {sending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileDown className="h-3.5 w-3.5" />
                )}
                Save / Print PDF
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleGenerateAndSend}
                disabled={sending || wallAreaSqft <= 0 || !cncKey}
                className="gap-1.5 h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {sending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <MessageCircle className="h-3.5 w-3.5" />
                )}
                WhatsApp Estimate
              </Button>
            </div>
          </div>

          {/* Quick WhatsApp prefill row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
            <div>
              <label className="text-[11px] text-muted-foreground">Customer Name</label>
              <Input
                value={greetingName}
                onChange={(e) => setGreetingName(e.target.value)}
                placeholder="Customer Name"
                className="mt-0.5 h-7 text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">Customer Phone (WhatsApp)</label>
              <Input
                value={customerMobile}
                onChange={(e) => setCustomerMobile(e.target.value)}
                placeholder="+91 98765 43210"
                className="mt-0.5 h-7 text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">Lead Time</label>
              <Input
                value={timeToComplete}
                onChange={(e) => setTimeToComplete(e.target.value)}
                placeholder="e.g. 15 to 20 working days"
                className="mt-0.5 h-7 text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">Prepared By</label>
              <Input
                value={preparerName}
                onChange={(e) => setPreparerName(e.target.value)}
                placeholder="Your Name / Stone Tech"
                className="mt-0.5 h-7 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

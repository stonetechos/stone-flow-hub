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
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { compressImageToDataUrl } from "@/lib/images/compress";
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
  DEFAULT_MURAL_PASTING_RATE,
  DEFAULT_MURAL_OVERLAY_THICKNESS_MM,
  DEFAULT_MURAL_OVERLAY_STONE_PRICE,
  COMMON_OVERLAY_STONE_TYPES,
  type StoneSourcing,
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

  // Mural Scene & Artwork Subject Description
  const [sceneDescription, setSceneDescription] = useState<string>("");

  // 1) Wall Size
  const [wallHeight, setWallHeight] = useState<string>("");
  const [wallLength, setWallLength] = useState<string>("");

  // 2) Base Stone Slab Size & Thickness
  const [baseStoneSourcing, setBaseStoneSourcing] = useState<StoneSourcing>("stone_tech");
  const [slabHeight, setSlabHeight] = useState<string>("");
  const [slabLength, setSlabLength] = useState<string>("");
  const [slabThickness, setSlabThickness] = useState<string>(String(DEFAULT_MURAL_THICKNESS_MM));
  const [stoneType, setStoneType] = useState<string>(DEFAULT_MURAL_STONE_TYPE);
  const [customStoneType, setCustomStoneType] = useState<string>("");
  const [slabPrice, setSlabPrice] = useState<string>(
    String(getDefaultSlabPrice(DEFAULT_MURAL_STONE_TYPE, DEFAULT_MURAL_THICKNESS_MM)),
  );
  const [slabsOverride, setSlabsOverride] = useState<string>("");

  // 3) Checklist: Works on Base Stone
  const [cncEnabled, setCncEnabled] = useState<boolean>(true);
  const [cncKey, setCncKey] = useState<string>("engraving_6mm");
  const [cncCustomRate, setCncCustomRate] = useState<string>("");

  const [polishingEnabled, setPolishingEnabled] = useState<boolean>(false);
  const [polishingRate, setPolishingRate] = useState<string>(String(DEFAULT_MURAL_POLISHING_RATE));

  const [rubbingEnabled, setRubbingEnabled] = useState<boolean>(true);
  const [rubbingRate, setRubbingRate] = useState<string>(String(DEFAULT_MURAL_RUBBING_RATE));

  // 4) Stone Pasting Work (Lump sum always!) & Optional Overlay
  const [pastingEnabled, setPastingEnabled] = useState<boolean>(false);
  const [pastingLumpSum, setPastingLumpSum] = useState<string>("");

  const [overlayEnabled, setOverlayEnabled] = useState<boolean>(false);
  const [overlaySourcing, setOverlaySourcing] = useState<StoneSourcing>("stone_tech");
  const [overlayStoneType, setOverlayStoneType] = useState<string>("White Marble");
  const [customOverlayStoneType, setCustomOverlayStoneType] = useState<string>("");
  const [overlayThickness, setOverlayThickness] = useState<string>(
    String(DEFAULT_MURAL_OVERLAY_THICKNESS_MM),
  );
  const [overlayLength, setOverlayLength] = useState<string>("");
  const [overlayHeight, setOverlayHeight] = useState<string>("");
  const [overlayCustomSqft, setOverlayCustomSqft] = useState<string>("");
  const [overlayStonePrice, setOverlayStonePrice] = useState<string>(
    String(DEFAULT_MURAL_OVERLAY_STONE_PRICE),
  );
  const [overlayCncEnabled, setOverlayCncEnabled] = useState<boolean>(false);
  const [overlayCncKey, setOverlayCncKey] = useState<string>("engraving_6mm");
  const [overlayCncCustomRate, setOverlayCncCustomRate] = useState<string>("");

  // 7) Installation Labour
  const [labourRate, setLabourRate] = useState<string>(
    String(DEFAULT_MURAL_INSTALLATION_LABOUR_RATE),
  );

  // 8) Adhesives (fetched from Wall Stone Cladding catalog)
  const [selectedAdhesiveKey, setSelectedAdhesiveKey] = useState<string>(
    ADHESIVE_CATALOG[0]?.key ?? "standard_cement_white",
  );
  const [adhesiveCustomPrice, setAdhesiveCustomPrice] = useState<string>("");
  const [adhesiveCustomUnits, setAdhesiveCustomUnits] = useState<string | null>(null);

  // 9) Touch Up Work
  const [touchUpEnabled, setTouchUpEnabled] = useState<boolean>(true);
  const [touchUpRate, setTouchUpRate] = useState<string>(String(DEFAULT_MURAL_TOUCH_UP_RATE));

  // 10) Carting / Freight
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
  const effectiveOverlayStoneType =
    overlayStoneType === "Other Natural Stone" ? customOverlayStoneType : overlayStoneType;

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

  // CRITICAL FIX: If slab dimensions were entered, use calculated total slab sqft & count.
  // If slab dimensions are left blank, automatically default to the entire wall area so Base Stone is NEVER missing!
  const hasSpecificSlabs = slabAreaSqft > 0 && slabCalc.totalSlabSqft > 0;
  const totalSlabSqft = hasSpecificSlabs ? slabCalc.totalSlabSqft : wallAreaSqft;
  const slabsCount = hasSpecificSlabs ? slabCalc.slabsRequired : wallAreaSqft > 0 ? 1 : 0;

  // 2) Base Stone Slabs Cost
  const ratePerSlabSqft = Number(slabPrice) || 0;
  const stoneSlabsAmount = baseStoneSourcing === "stone_tech" ? totalSlabSqft * ratePerSlabSqft : 0;

  // 3) Checklist: Works on Base Stone
  const selectedCnc = MURAL_CNC_OPTIONS.find((c) => c.key === cncKey);
  const cncRate =
    cncKey === "custom"
      ? Number(cncCustomRate) || 0
      : selectedCnc
        ? selectedCnc.defaultRatePerSqft
        : 0;
  const cncAmount = cncEnabled && cncKey && wallAreaSqft > 0 ? wallAreaSqft * cncRate : 0;
  const cncWorkSummary = cncEnabled
    ? selectedCnc
      ? `${selectedCnc.label} @ ${formatInr(cncRate)}/sq ft`
      : `Custom CNC Work @ ${formatInr(cncRate)}/sq ft`
    : "None";

  // Polishing on Base Stone ("we will mention the price for that")
  const polRate = Number(polishingRate) || 0;
  const polishingAmount = polishingEnabled && wallAreaSqft > 0 ? wallAreaSqft * polRate : 0;

  // Rubbing on Base Stone
  const rubRate = Number(rubbingRate) || 0;
  const rubbingAmount = rubbingEnabled && wallAreaSqft > 0 ? wallAreaSqft * rubRate : 0;

  // 4) Stone Pasting Work (Lump Sum Always) & Optional Overlay
  const pastingLumpSumNum = Number(pastingLumpSum) || 0;
  const isPastingActive = pastingEnabled || pastingLumpSumNum > 0;
  const pastingAmount = isPastingActive ? pastingLumpSumNum : 0;

  const overlayL = Number(overlayLength) || 0;
  const overlayH = Number(overlayHeight) || 0;
  const calculatedOverlaySqft = wallSqft(overlayH, overlayL, unit);
  const effectiveOverlaySqft =
    overlayCustomSqft !== "" && !isNaN(Number(overlayCustomSqft))
      ? Math.max(0, Number(overlayCustomSqft))
      : calculatedOverlaySqft;

  const overlayRatePerSqft = Number(overlayStonePrice) || 0;
  const overlayStoneAmount =
    overlayEnabled && overlaySourcing === "stone_tech"
      ? effectiveOverlaySqft * overlayRatePerSqft
      : 0;

  const selectedOverlayCnc = MURAL_CNC_OPTIONS.find((c) => c.key === overlayCncKey);
  const overlayCncRate =
    overlayCncKey === "custom"
      ? Number(overlayCncCustomRate) || 0
      : selectedOverlayCnc
        ? selectedOverlayCnc.defaultRatePerSqft
        : 0;
  const overlayCncAmount =
    overlayEnabled && overlayCncEnabled ? effectiveOverlaySqft * overlayCncRate : 0;
  const overlayCncLabel = selectedOverlayCnc ? selectedOverlayCnc.label : "Custom Overlay CNC Work";

  const totalOverlayCost = overlayStoneAmount + overlayCncAmount + pastingAmount;

  // 7) Installation Labour Cost
  const instRate = Number(labourRate) || 0;
  const labourAmount = wallAreaSqft * instRate;

  // 8) Adhesives (fetched from Wall Stone Cladding catalog)
  const activeAdhesiveCatalog =
    ADHESIVE_CATALOG.find((a) => a.key === selectedAdhesiveKey) || ADHESIVE_CATALOG[0];
  const autoAdhesiveUnits =
    wallAreaSqft > 0 && activeAdhesiveCatalog
      ? ceilWhole(wallAreaSqft / activeAdhesiveCatalog.coverageSqftPerUnit)
      : 0;
  const adhesiveUnits =
    adhesiveCustomUnits !== null &&
    adhesiveCustomUnits !== "" &&
    !isNaN(Number(adhesiveCustomUnits))
      ? Math.max(0, Number(adhesiveCustomUnits))
      : autoAdhesiveUnits;
  const adhesiveUnitPrice =
    adhesiveCustomPrice !== ""
      ? Number(adhesiveCustomPrice) || 0
      : activeAdhesiveCatalog?.defaultPricePerUnit || 0;
  const adhesivesAmount = adhesiveUnits * adhesiveUnitPrice;

  // 9) Touch Up Work Cost
  const touchRate = Number(touchUpRate) || 0;
  const touchUpAmount = touchUpEnabled ? wallAreaSqft * touchRate : 0;

  // 10) Carting Cost
  const cartingNum = Number(cartingAmount) || 0;

  const effectiveLabourAmount = includeInstallation ? labourAmount : 0;
  const effectiveAdhesivesAmount = includeInstallation ? adhesivesAmount : 0;

  // Totals
  const subtotal =
    stoneSlabsAmount +
    cncAmount +
    (overlayEnabled ? totalOverlayCost : 0) +
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
      baseStoneSourcing,
      clientProvidedSlab: baseStoneSourcing === "client_provided",
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
        sourcing: baseStoneSourcing,
        slabsRequired: slabsCount,
        gridCols: slabCalc.slabsGrid.cols,
        gridRows: slabCalc.slabsGrid.rows,
        totalSlabSqft,
        pricePerSqft: baseStoneSourcing === "stone_tech" ? ratePerSlabSqft : 0,
        amount: stoneSlabsAmount,
      },
      cnc: {
        enabled: cncEnabled,
        selectedKey: cncKey,
        label: cncEnabled ? cncWorkSummary : "None",
        ratePerSqft: cncEnabled ? cncRate : 0,
        amount: cncAmount,
      },
      pasting: isPastingActive
        ? {
            enabled: true,
            amount: pastingAmount,
          }
        : undefined,
      overlay: overlayEnabled
        ? {
            enabled: true,
            stoneType: effectiveOverlayStoneType,
            thicknessMm: Number(overlayThickness) || 20,
            sourcing: overlaySourcing,
            sqft: effectiveOverlaySqft,
            length: overlayL > 0 ? overlayL : undefined,
            height: overlayH > 0 ? overlayH : undefined,
            stonePricePerSqft: overlaySourcing === "stone_tech" ? overlayRatePerSqft : 0,
            stoneAmount: overlayStoneAmount,
            cncKey: overlayCncEnabled ? overlayCncKey : undefined,
            cncLabel: overlayCncEnabled ? overlayCncLabel : undefined,
            cncRatePerSqft: overlayCncEnabled ? overlayCncRate : undefined,
            cncAmount: overlayCncAmount,
            pastingRatePerSqft: 0,
            pastingAmount,
            totalAmount: totalOverlayCost,
          }
        : undefined,
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
      sceneDescription: sceneDescription.trim() || undefined,
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
    baseStoneSourcing,
    slabsCount,
    slabCalc.slabsGrid.cols,
    slabCalc.slabsGrid.rows,
    totalSlabSqft,
    ratePerSlabSqft,
    stoneSlabsAmount,
    cncEnabled,
    cncKey,
    cncRate,
    cncAmount,
    cncWorkSummary,
    isPastingActive,
    pastingAmount,
    overlayEnabled,
    effectiveOverlayStoneType,
    overlayThickness,
    overlaySourcing,
    effectiveOverlaySqft,
    overlayL,
    overlayH,
    overlayRatePerSqft,
    overlayStoneAmount,
    overlayCncEnabled,
    overlayCncKey,
    overlayCncLabel,
    overlayCncRate,
    overlayCncAmount,
    totalOverlayCost,
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
    sceneDescription,
    timeToComplete,
    imageDataUrl,
    subtotal,
    total,
  ]);

  // Convert to QuoteItemInput[] for Quotation creation
  const items: QuoteItemInput[] = useMemo(() => {
    if (wallAreaSqft <= 0) return [];
    const out: QuoteItemInput[] = [];

    // 1. Base Stone Slabs
    if (baseStoneSourcing === "stone_tech") {
      if (stoneSlabsAmount > 0) {
        const desc = hasSpecificSlabs
          ? `Base Stone Slabs — ${effectiveStoneType} (${slabThk}mm) [${slabsCount} slab(s) of ${slabL}x${slabH}${unit}]`
          : `Base Stone Slabs — ${effectiveStoneType} (${slabThk}mm) [${totalSlabSqft.toFixed(1)} sq ft coverage]`;
        out.push({
          product_id: null,
          description: desc,
          quantity: Math.round(totalSlabSqft * 100) / 100,
          unit: "sqft",
          unit_price: ratePerSlabSqft,
          tax_pct: 0,
          fulfilment: null,
          image_url: imageDataUrl || null,
        });
      }
    } else {
      const desc = hasSpecificSlabs
        ? `Base Stone Slabs — Provided by Client (${effectiveStoneType} ${slabThk}mm) [${slabsCount} slab(s) of ${slabL}x${slabH}${unit}, Client Scope]`
        : `Base Stone Slabs — Provided by Client (${effectiveStoneType} ${slabThk}mm) [${totalSlabSqft.toFixed(1)} sq ft, Client Scope]`;
      out.push({
        product_id: null,
        description: desc,
        quantity: Math.round(totalSlabSqft * 100) / 100,
        unit: "sqft",
        unit_price: 0,
        tax_pct: 0,
        fulfilment: null,
        image_url: imageDataUrl || null,
      });
    }

    // 2. Base Stone CNC Job Work
    if (cncEnabled && cncAmount > 0) {
      const cncLabel = selectedCnc ? selectedCnc.label : "Custom CNC Job Work";
      out.push({
        product_id: null,
        description: `Base Stone CNC Carving — ${cncLabel}`,
        quantity: Math.round(wallAreaSqft * 100) / 100,
        unit: "sqft",
        unit_price: cncRate,
        tax_pct: 0,
        fulfilment: null,
      });
    }

    // 3. Base Stone Polishing Work (Optional)
    if (polishingEnabled && polishingAmount > 0) {
      out.push({
        product_id: null,
        description: "Base Stone Polishing Work — Mirror / High-Gloss Machine Polishing",
        quantity: Math.round(wallAreaSqft * 100) / 100,
        unit: "sqft",
        unit_price: polRate,
        tax_pct: 0,
        fulfilment: null,
      });
    }

    // 4. Base Stone Rubbing Work
    if (rubbingEnabled && rubbingAmount > 0) {
      out.push({
        product_id: null,
        description: "Base Stone Surface Rubbing Work",
        quantity: Math.round(wallAreaSqft * 100) / 100,
        unit: "sqft",
        unit_price: rubRate,
        tax_pct: 0,
        fulfilment: null,
      });
    }

    // 5. Stone Pasting Work (Lump sum always!)
    if (isPastingActive && pastingAmount > 0) {
      out.push({
        product_id: null,
        description: "Stone Pasting Work — Specialized Epoxy Chemical & Artisan Bonding (Lump Sum)",
        quantity: 1,
        unit: "job",
        unit_price: pastingAmount,
        tax_pct: 0,
        fulfilment: null,
      });
    }

    // 6. Overlay Stone Piece & Carving (if enabled)
    if (overlayEnabled && effectiveOverlaySqft > 0) {
      if (overlaySourcing === "stone_tech") {
        if (overlayStoneAmount > 0) {
          out.push({
            product_id: null,
            description: `Overlay Stone Piece — ${effectiveOverlayStoneType} (${overlayThickness}mm) [${effectiveOverlaySqft.toFixed(1)} sq ft]`,
            quantity: Math.round(effectiveOverlaySqft * 10) / 10,
            unit: "sqft",
            unit_price: overlayRatePerSqft,
            tax_pct: 0,
            fulfilment: null,
          });
        }
      } else {
        out.push({
          product_id: null,
          description: `Overlay Stone Piece — Provided by Client (${effectiveOverlayStoneType} ${overlayThickness}mm) [${effectiveOverlaySqft.toFixed(1)} sq ft, Client Scope]`,
          quantity: Math.round(effectiveOverlaySqft * 10) / 10,
          unit: "sqft",
          unit_price: 0,
          tax_pct: 0,
          fulfilment: null,
        });
      }

      if (overlayCncEnabled && overlayCncAmount > 0) {
        out.push({
          product_id: null,
          description: `Overlay Stone CNC Carving — ${overlayCncLabel} (${effectiveOverlaySqft.toFixed(1)} sq ft)`,
          quantity: Math.round(effectiveOverlaySqft * 10) / 10,
          unit: "sqft",
          unit_price: overlayCncRate,
          tax_pct: 0,
          fulfilment: null,
        });
      }
    }

    // 7. Installation Labour
    if (includeInstallation && effectiveLabourAmount > 0) {
      out.push({
        product_id: null,
        description: "Stone Mural Installation Labour",
        quantity: Math.round(wallAreaSqft * 100) / 100,
        unit: "sqft",
        unit_price: instRate,
        tax_pct: 0,
        fulfilment: null,
      });
    }

    // 8. Adhesives
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

    // 9. Touch Up Work
    if (touchUpAmount > 0) {
      out.push({
        product_id: null,
        description: "Mural On-Site Touch Up & Finishing Work",
        quantity: Math.round(wallAreaSqft * 100) / 100,
        unit: "sqft",
        unit_price: touchRate,
        tax_pct: 0,
        fulfilment: null,
      });
    }

    // 10. Carting / Freight
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
    baseStoneSourcing,
    stoneSlabsAmount,
    effectiveStoneType,
    slabThk,
    slabsCount,
    hasSpecificSlabs,
    slabL,
    slabH,
    unit,
    totalSlabSqft,
    ratePerSlabSqft,
    imageDataUrl,
    selectedCnc,
    cncEnabled,
    cncAmount,
    cncRate,
    polishingEnabled,
    polishingAmount,
    polRate,
    rubbingEnabled,
    rubbingAmount,
    rubRate,
    isPastingActive,
    pastingAmount,
    overlayEnabled,
    effectiveOverlaySqft,
    overlaySourcing,
    overlayStoneAmount,
    effectiveOverlayStoneType,
    overlayThickness,
    overlayRatePerSqft,
    overlayCncEnabled,
    overlayCncAmount,
    overlayCncLabel,
    overlayCncRate,
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

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageToDataUrl(file, 1000, 0.75);
      setImageDataUrl(dataUrl);
    } catch {
      const reader = new FileReader();
      reader.onload = () => setImageDataUrl(String(reader.result));
      reader.readAsDataURL(file);
    }
  }

  async function handleGenerateAndSend() {
    if (wallAreaSqft <= 0 || slabsCount <= 0) {
      toast.error("Please enter valid wall dimensions first");
      return;
    }
    if (cncEnabled && !cncKey) {
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
      const slabDetails = hasSpecificSlabs
        ? `${slabL}${unit} x ${slabH}${unit} (${slabThk}mm ${effectiveStoneType})`
        : `${slabThk}mm ${effectiveStoneType} (${totalSlabSqft.toFixed(1)} sq ft coverage)`;
      const cncWorkSummary = cncEnabled
        ? selectedCnc
          ? `${selectedCnc.label} @ ${formatInr(cncRate)}/sq ft`
          : `Custom CNC Work @ ${formatInr(cncRate)}/sq ft`
        : "None";
      const adhesivesSummary = activeAdhesiveCatalog
        ? `${adhesiveUnits} ${activeAdhesiveCatalog.unit}(s) ${activeAdhesiveCatalog.label}`
        : "Standard stone adhesive";

      const message = buildMuralEstimateWhatsappMessage(
        {
          greetingName: greetingName.trim() || "there",
          sceneDescription: sceneDescription.trim() || undefined,
          wallSizeSummary,
          wallSqft: wallAreaSqft,
          slabDetails,
          baseStoneSourcing,
          slabsCount,
          totalSlabSqft,
          slabAmount: stoneSlabsAmount,
          slabPricePerSqft: ratePerSlabSqft,
          cncWorkSummary,
          cncAmount,
          polishingAmount,
          rubbingAmount,
          pastingAmount,
          overlayDetails:
            overlayEnabled && effectiveOverlaySqft > 0
              ? {
                  stoneType: effectiveOverlayStoneType,
                  thicknessMm: Number(overlayThickness) || 20,
                  sourcing: overlaySourcing,
                  sqft: effectiveOverlaySqft,
                  stoneAmount: overlayStoneAmount,
                  stonePricePerSqft: overlayRatePerSqft,
                  cncAmount: overlayCncAmount,
                  cncSummary: overlayCncEnabled
                    ? `${overlayCncLabel} @ ${formatInr(overlayCncRate)}/sq ft`
                    : undefined,
                  pastingAmount,
                  totalAmount: totalOverlayCost,
                }
              : undefined,
          installationLabourAmount: effectiveLabourAmount,
          adhesivesAmount: effectiveAdhesivesAmount,
          adhesivesSummary,
          touchUpAmount,
          cartingAmount: cartingNum,
          cartingLocation: cartingLocation.trim() || undefined,
          totalEstimate: total,
          estimatedDeliveryDate: estimatedDeliveryDate.trim() || undefined,
          deliveryTimelineDays: timeToComplete.trim() || undefined,
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

      {/* Mural Scene Description Card */}
      <Card className="shadow-sm border-border">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold">
                Mural Scene & Artwork Details (What the scene is about)
              </CardTitle>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Saved in estimate & proposal for site & factory reference
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2 space-y-2.5">
          <Textarea
            value={sceneDescription}
            onChange={(e) => setSceneDescription(e.target.value)}
            rows={3}
            placeholder="Describe what the mural depicts and the scope of work (e.g. Lord Ganesha in meditation under Banyan tree; 3D high-relief floral frame; base stone pocketed with contrasting white marble overlay piece pasted with epoxy. Sourced: Base slab by client, marble overlay by Stone Tech)..."
            className="text-xs resize-y"
          />
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[10px] text-muted-foreground font-medium mr-1">
              Quick Suggestions:
            </span>
            {[
              "Lord Ganesha in Meditation",
              "7 Running Horses (Vastu)",
              "Tree of Life & Birds",
              "Mandir Sanctum Deity",
              "Abstract Geometric Relief",
              "Base Engraved + Marble Overlay Inlay",
              "Base Stone Provided by Client",
            ].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => {
                  if (chip === "Base Stone Provided by Client") {
                    setBaseStoneSourcing("client_provided");
                  }
                  setSceneDescription((prev) => {
                    const trimmed = prev.trim();
                    if (!trimmed) return chip;
                    if (trimmed.includes(chip)) return prev;
                    return `${trimmed}; ${chip}`;
                  });
                }}
                className="text-[10px] px-2 py-0.5 rounded-full border border-border/80 bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                + {chip}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

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
                  2) Base Stone Slab Size & Sourcing
                </CardTitle>
              </div>
              <Badge variant="outline" className="text-[11px] font-mono">
                {slabsCount > 0 ? `${slabsCount} Slabs Required` : "— Slabs Required"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3">
            {/* Base Stone Sourcing Selector */}
            <div className="rounded-md border border-border/80 bg-muted/15 p-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-foreground">Base Stone Sourcing</span>
                <Badge
                  variant={baseStoneSourcing === "stone_tech" ? "default" : "outline"}
                  className={`text-[10px] ${
                    baseStoneSourcing === "client_provided"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold"
                      : ""
                  }`}
                >
                  {baseStoneSourcing === "stone_tech"
                    ? "Procured by Stone Tech"
                    : "Client-Supplied Slab (CNC Work Only)"}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBaseStoneSourcing("stone_tech")}
                  className={`text-xs py-2 px-2.5 rounded-md font-medium border text-left cursor-pointer transition-all ${
                    baseStoneSourcing === "stone_tech"
                      ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary shadow-2xs"
                      : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <div className="font-semibold text-xs">Procured by Stone Tech</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    We supply base stone slab
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setBaseStoneSourcing("client_provided")}
                  className={`text-xs py-2 px-2.5 rounded-md font-medium border text-left cursor-pointer transition-all ${
                    baseStoneSourcing === "client_provided"
                      ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-semibold ring-1 ring-emerald-600 shadow-2xs"
                      : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <div className="font-semibold text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                    <span>Provided by Client</span>
                    <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-1 rounded font-bold">
                      ₹0 Slab
                    </span>
                  </div>
                  <div className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                    Client supplies slab (CNC job work only)
                  </div>
                </button>
              </div>

              {/* Informational banner when Client supplies slab */}
              {baseStoneSourcing === "client_provided" && (
                <div className="rounded-md border border-emerald-300/80 bg-emerald-50/90 dark:bg-emerald-950/30 p-2.5 text-xs text-emerald-950 dark:text-emerald-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-800 dark:text-emerald-300">
                    <ShieldAlert className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
                    <span>Client-Supplied Slab Mode — CNC Job Work Only</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-emerald-900/90 dark:text-emerald-300/90">
                    Base stone slab material is supplied by the client (₹0 stone charge). Only CNC
                    carving job work and selected finishing services will be billed.
                  </p>
                  <p className="text-[10px] font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                    <span>🛡️</span>
                    <span>
                      Priority Breakage Disclaimer #1 (Waiver for natural stone brittleness/cracking
                      during CNC job work or transport) will be automatically affixed to quotation
                      terms.
                    </span>
                  </p>
                </div>
              )}
            </div>

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
                  {baseStoneSourcing === "client_provided" ? (
                    <span className="text-[10px] text-emerald-600 font-semibold">
                      Client Scope (₹0)
                    </span>
                  ) : (
                    slabThk === 50 &&
                    effectiveStoneType.toLowerCase().includes("sandstone") && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        Default 50mm Sandstone
                      </span>
                    )
                  )}
                </label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  disabled={baseStoneSourcing === "client_provided"}
                  value={baseStoneSourcing === "client_provided" ? "0" : slabPrice}
                  onChange={(e) => setSlabPrice(e.target.value)}
                  className={`mt-1 h-8 text-sm font-mono font-medium ${
                    baseStoneSourcing === "client_provided" ? "opacity-60 bg-muted/50" : ""
                  }`}
                  placeholder={baseStoneSourcing === "client_provided" ? "0" : "550"}
                />
              </div>
            </div>

            {/* Calculated slabs details & manual override */}
            <div className="rounded-md border border-border/80 bg-muted/20 p-2.5 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Single Slab Area:</span>
                <span className="font-mono text-foreground font-medium">
                  {slabAreaSqft > 0
                    ? `${slabAreaSqft.toFixed(2)} sq ft`
                    : wallAreaSqft > 0
                      ? `${wallAreaSqft.toFixed(2)} sq ft (Direct wall coverage)`
                      : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Grid Layout Optimization:</span>
                <span className="font-mono text-foreground">
                  {hasSpecificSlabs
                    ? `${slabCalc.slabsGrid.cols} cols × ${slabCalc.slabsGrid.rows} rows = ${slabCalc.slabsGrid.total} slabs`
                    : wallAreaSqft > 0
                      ? "Direct wall area used (Slab dimensions optional)"
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
                      hasSpecificSlabs
                        ? String(slabCalc.slabsGrid.total)
                        : wallAreaSqft > 0
                          ? "1"
                          : "—"
                    }
                    value={slabsOverride}
                    onChange={(e) => setSlabsOverride(e.target.value)}
                    className="h-6 w-16 text-center text-xs font-mono"
                    title="Override slabs count if cutting wastage requires an extra slab"
                  />
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-foreground">
                    {totalSlabSqft > 0
                      ? baseStoneSourcing === "stone_tech"
                        ? `${totalSlabSqft.toFixed(1)} sq ft = ${formatInr(stoneSlabsAmount)}`
                        : `${totalSlabSqft.toFixed(1)} sq ft = ₹0 (Client Scope)`
                      : "—"}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3) Base Stone Works & Finishing Checklist */}
      <Card className="shadow-sm border-border">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold">
                3) Base Stone Works & Finishing Checklist
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-[11px] font-mono">
              {formatInr(cncAmount + polishingAmount + rubbingAmount)} Total Base Works
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Checklist of operations to perform on the base stone: CNC carving, surface polishing,
            and surface rubbing.
          </p>
        </CardHeader>
        <CardContent className="p-4 pt-2 space-y-3.5">
          {/* Checklist Item 1: CNC Work on Base Stone */}
          <div
            className={`rounded-md border p-3 transition-colors ${
              cncEnabled ? "border-primary/40 bg-primary/[0.015]" : "border-border"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="mural-base-cnc-toggle"
                  checked={cncEnabled}
                  onCheckedChange={(c) => setCncEnabled(!!c)}
                />
                <label
                  htmlFor="mural-base-cnc-toggle"
                  className="cursor-pointer text-xs font-semibold text-foreground flex items-center gap-1.5"
                >
                  <span>CNC Work on Base Stone</span>
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                    Carving & Dipping
                  </Badge>
                </label>
              </div>
              <div className="font-mono text-xs font-semibold text-primary">
                {cncEnabled && cncAmount > 0
                  ? `${formatInr(cncAmount)} (${formatInr(cncRate)}/sq ft)`
                  : cncEnabled
                    ? `${formatInr(cncRate)}/sq ft`
                    : "Excluded (₹0)"}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground ml-6 mt-0.5">
              Precision CNC V-groove engraving, 2.5D dipping, or 3D relief embossing into the base
              slab.
            </p>

            {cncEnabled && (
              <div className="mt-3 pt-2.5 border-t border-border/60 space-y-2.5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {MURAL_CNC_OPTIONS.map((opt) => {
                    const isSelected = cncKey === opt.key;
                    return (
                      <div
                        key={opt.key}
                        onClick={() => setCncKey(opt.key)}
                        className={`cursor-pointer rounded-md border p-2.5 transition-colors flex items-center justify-between ${
                          isSelected
                            ? "border-primary bg-primary/[0.04] ring-1 ring-primary"
                            : "border-border hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? "border-primary bg-primary"
                                : "border-muted-foreground/40"
                            }`}
                          >
                            {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-foreground">{opt.label}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {opt.category === "engraving_dipping"
                                ? "Engraving / Dipping Work"
                                : "Embossing High-Relief Work"}
                            </div>
                          </div>
                        </div>
                        <Badge
                          variant={isSelected ? "default" : "outline"}
                          className="font-mono text-[11px]"
                        >
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
                        cncKey === "custom"
                          ? "border-primary bg-primary"
                          : "border-muted-foreground/40"
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
              </div>
            )}
          </div>

          {/* Checklist Item 2: Polishing on Base Stone */}
          <div
            className={`rounded-md border p-3 transition-colors ${
              polishingEnabled ? "border-primary/40 bg-primary/[0.015]" : "border-border"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="mural-base-polishing-toggle"
                  checked={polishingEnabled}
                  onCheckedChange={(c) => setPolishingEnabled(!!c)}
                />
                <div>
                  <label
                    htmlFor="mural-base-polishing-toggle"
                    className="cursor-pointer text-xs font-semibold text-foreground flex items-center gap-1.5"
                  >
                    <span>Polishing Option for Base Stone</span>
                    <Badge variant="outline" className="text-[10px] py-0 px-1">
                      Optional
                    </Badge>
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    High-gloss mirror, honed, or lapato polishing on the base stone surface.
                  </p>
                </div>
              </div>
              <div className="font-mono text-xs font-semibold text-primary">
                {polishingEnabled && polishingAmount > 0
                  ? `${formatInr(polishingAmount)} (${formatInr(polRate)}/sq ft)`
                  : polishingEnabled
                    ? `${formatInr(polRate)}/sq ft`
                    : "Excluded (₹0)"}
              </div>
            </div>

            {polishingEnabled && (
              <div className="mt-2.5 pt-2 border-t border-border/60 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Mention Polishing Price / Rate:
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">₹</span>
                    <Input
                      type="number"
                      min="0"
                      value={polishingRate}
                      onChange={(e) => setPolishingRate(e.target.value)}
                      className="h-7 w-20 text-right text-xs font-mono font-medium"
                    />
                    <span className="text-xs text-muted-foreground">/ sq ft</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">(Default ₹300)</span>
                </div>
                <div className="font-mono text-xs font-bold text-foreground">
                  {wallAreaSqft > 0
                    ? `${wallAreaSqft.toFixed(1)} sq ft = ${formatInr(polishingAmount)}`
                    : "—"}
                </div>
              </div>
            )}
          </div>

          {/* Checklist Item 3: Surface Rubbing on Base Stone */}
          <div
            className={`rounded-md border p-3 transition-colors ${
              rubbingEnabled ? "border-primary/40 bg-primary/[0.015]" : "border-border"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="mural-base-rubbing-toggle"
                  checked={rubbingEnabled}
                  onCheckedChange={(c) => setRubbingEnabled(!!c)}
                />
                <div>
                  <label
                    htmlFor="mural-base-rubbing-toggle"
                    className="cursor-pointer text-xs font-semibold text-foreground flex items-center gap-1.5"
                  >
                    <span>Base Stone Surface Rubbing Work</span>
                    <Badge variant="outline" className="text-[10px] py-0 px-1">
                      Standard
                    </Badge>
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Initial face calibration, leveling, and rubbing before carving or fixing.
                  </p>
                </div>
              </div>
              <div className="font-mono text-xs font-semibold text-primary">
                {rubbingEnabled && rubbingAmount > 0
                  ? `${formatInr(rubbingAmount)} (${formatInr(rubRate)}/sq ft)`
                  : rubbingEnabled
                    ? `${formatInr(rubRate)}/sq ft`
                    : "Excluded (₹0)"}
              </div>
            </div>

            {rubbingEnabled && (
              <div className="mt-2.5 pt-2 border-t border-border/60 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Surface Rubbing Rate:</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">₹</span>
                    <Input
                      type="number"
                      min="0"
                      value={rubbingRate}
                      onChange={(e) => setRubbingRate(e.target.value)}
                      className="h-7 w-20 text-right text-xs font-mono font-medium"
                    />
                    <span className="text-xs text-muted-foreground">/ sq ft</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">(Default ₹25)</span>
                </div>
                <div className="font-mono text-xs font-bold text-foreground">
                  {wallAreaSqft > 0
                    ? `${wallAreaSqft.toFixed(1)} sq ft = ${formatInr(rubbingAmount)}`
                    : "—"}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 4) Stone Pasting Work & Overlay / Inlay (Optional) */}
      <Card
        className={`shadow-sm transition-all border-border ${
          isPastingActive || overlayEnabled ? "border-amber-500/40 bg-amber-500/[0.015]" : ""
        }`}
      >
        <CardHeader className="p-4 pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <CardTitle className="text-sm font-semibold">
                4) Stone Pasting Work & Overlay / Inlay (Optional)
              </CardTitle>
            </div>
            <Badge
              variant="outline"
              className="text-[11px] font-mono border-amber-500/40 text-amber-800 dark:text-amber-300"
            >
              {formatInr(totalOverlayCost)} Total Pasting & Overlay
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Dedicated lump sum pricing box for stone pasting work (always lump sum), plus optional
            overlay marble/granite piece procurement.
          </p>
        </CardHeader>

        <CardContent className="p-4 pt-2 space-y-4">
          {/* DEDICATED BOX FOR "STONE PASTING WORK" PRICE (ITS A LUMPSOME AMOUNT ALWAYS) */}
          <div className="rounded-md border-2 border-amber-500/50 bg-amber-500/[0.06] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="mural-stone-pasting-toggle"
                  checked={isPastingActive}
                  onCheckedChange={(c) => {
                    const checked = !!c;
                    setPastingEnabled(checked);
                    if (!checked) setPastingLumpSum("");
                  }}
                />
                <div>
                  <label
                    htmlFor="mural-stone-pasting-toggle"
                    className="cursor-pointer text-xs font-bold text-foreground flex items-center gap-1.5"
                  >
                    <span>Stone Pasting Work</span>
                    <Badge
                      variant="default"
                      className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] py-0 px-2 font-semibold"
                    >
                      Lump Sum Amount Always
                    </Badge>
                  </label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Master artisan bonding charges & specialized epoxy chemical for pasting and
                    fixing worked stone pieces onto the base stone.
                  </p>
                </div>
              </div>
              <div className="font-mono text-sm font-bold text-amber-700 dark:text-amber-400">
                {formatInr(pastingAmount)}
              </div>
            </div>

            <div className="pt-2 border-t border-amber-500/20 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-foreground shrink-0">
                  Stone Pasting Price (₹ Lump Sum):
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                    ₹
                  </span>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 5000"
                    value={pastingLumpSum}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPastingLumpSum(val);
                      if (val && !pastingEnabled) setPastingEnabled(true);
                    }}
                    className="h-8 pl-6 pr-3 w-36 text-sm font-mono font-bold bg-background text-foreground"
                  />
                </div>
                {pastingLumpSum && (
                  <button
                    type="button"
                    onClick={() => {
                      setPastingLumpSum("");
                      setPastingEnabled(false);
                    }}
                    className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer underline"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground font-medium">
                {pastingAmount > 0
                  ? `Pasting charge of ${formatInr(pastingAmount)} (Lump Sum) will be added to quotation.`
                  : "Enter the lump sum stone pasting amount here."}
              </div>
            </div>
          </div>

          {/* SUBSECTION: OVERLAY / INLAY WORKED STONE PIECE (OPTIONAL) */}
          <div
            className={`rounded-md border p-3 space-y-3 transition-colors ${
              overlayEnabled ? "border-primary/40 bg-muted/15" : "border-border"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="mural-overlay-material-toggle"
                  checked={overlayEnabled}
                  onCheckedChange={(c) => setOverlayEnabled(!!c)}
                />
                <label
                  htmlFor="mural-overlay-material-toggle"
                  className="cursor-pointer text-xs font-semibold text-foreground flex items-center gap-1.5"
                >
                  <span>Additional Overlay / Inlay Stone Piece & Carving</span>
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                    Optional 2-Layer Carving
                  </Badge>
                </label>
              </div>
              {overlayEnabled && (
                <span className="font-mono text-xs font-semibold text-primary">
                  {formatInr(overlayStoneAmount + overlayCncAmount)}
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground ml-6">
              For 2-layer relief murals where a contrasting carved stone (e.g. Makrana white marble
              deity or inlay motif) is pasted into CNC-cut pockets on the base stone.
            </p>

            {overlayEnabled && (
              <div className="space-y-3 pt-2 border-t border-border/60">
                {/* Overlay Stone Sourcing */}
                <div className="rounded-md border border-border/80 bg-background p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">
                      Overlay Stone Sourcing / Procurement
                    </span>
                    <Badge
                      variant={overlaySourcing === "stone_tech" ? "default" : "outline"}
                      className="text-[10px]"
                    >
                      {overlaySourcing === "stone_tech"
                        ? "Procured by Stone Tech"
                        : "Client-Provided Overlay Stone"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setOverlaySourcing("stone_tech")}
                      className={`text-xs py-1.5 px-2.5 rounded-md font-medium border text-left cursor-pointer transition-all ${
                        overlaySourcing === "stone_tech"
                          ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary"
                          : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                      }`}
                    >
                      <div className="font-semibold text-xs">Procured by Stone Tech</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        We supply the overlay stone piece
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOverlaySourcing("client_provided")}
                      className={`text-xs py-1.5 px-2.5 rounded-md font-medium border text-left cursor-pointer transition-all ${
                        overlaySourcing === "client_provided"
                          ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-semibold ring-1 ring-emerald-600"
                          : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                      }`}
                    >
                      <div className="font-semibold text-xs">Provided by Client</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        Client supplies overlay piece (₹0 stone cost)
                      </div>
                    </button>
                  </div>
                </div>

                {/* Overlay Stone Specifications */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Overlay Stone Type
                    </label>
                    <Select value={overlayStoneType} onValueChange={setOverlayStoneType}>
                      <SelectTrigger className="mt-1 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COMMON_OVERLAY_STONE_TYPES.map((st) => (
                          <SelectItem key={st} value={st}>
                            {st}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {overlayStoneType === "Other Natural Stone" && (
                      <Input
                        value={customOverlayStoneType}
                        onChange={(e) => setCustomOverlayStoneType(e.target.value)}
                        placeholder="Enter custom overlay stone name…"
                        className="mt-1.5 h-8 text-xs"
                      />
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Thickness (mm)
                    </label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="1"
                      value={overlayThickness}
                      onChange={(e) => setOverlayThickness(e.target.value)}
                      className="mt-1 h-8 text-sm font-mono"
                      placeholder="20"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                      <span>Overlay Stone Price (₹/sq ft)</span>
                      {overlaySourcing === "client_provided" && (
                        <span className="text-[10px] text-emerald-600 font-semibold">
                          Client Scope
                        </span>
                      )}
                    </label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      disabled={overlaySourcing === "client_provided"}
                      value={overlaySourcing === "client_provided" ? "0" : overlayStonePrice}
                      onChange={(e) => setOverlayStonePrice(e.target.value)}
                      className={`mt-1 h-8 text-sm font-mono font-medium ${
                        overlaySourcing === "client_provided" ? "opacity-60 bg-muted/50" : ""
                      }`}
                      placeholder={overlaySourcing === "client_provided" ? "0" : "450"}
                    />
                  </div>
                </div>

                {/* Overlay Piece Dimensions & Area Coverage */}
                <div className="rounded-md border border-border/80 bg-background p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      Overlay Piece Dimensions & Coverage
                    </span>
                    <span className="font-mono text-xs font-bold text-foreground">
                      {effectiveOverlaySqft > 0 ? `${effectiveOverlaySqft.toFixed(2)} sq ft` : "—"}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[11px] text-muted-foreground">
                        Overlay Length ({unit})
                      </label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        value={overlayLength}
                        onChange={(e) => {
                          setOverlayLength(e.target.value);
                          if (overlayCustomSqft) setOverlayCustomSqft("");
                        }}
                        className="mt-0.5 h-7 text-xs"
                        placeholder="e.g. 4"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground">
                        Overlay Height ({unit})
                      </label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        value={overlayHeight}
                        onChange={(e) => {
                          setOverlayHeight(e.target.value);
                          if (overlayCustomSqft) setOverlayCustomSqft("");
                        }}
                        className="mt-0.5 h-7 text-xs"
                        placeholder="e.g. 3"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground flex items-center justify-between">
                        <span>Or Direct Area (sq ft)</span>
                        {overlayCustomSqft && (
                          <span className="text-[9px] text-blue-600 font-semibold">
                            Custom Sqft
                          </span>
                        )}
                      </label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        value={overlayCustomSqft}
                        onChange={(e) => setOverlayCustomSqft(e.target.value)}
                        className="mt-0.5 h-7 text-xs font-mono font-medium"
                        placeholder={
                          calculatedOverlaySqft > 0 ? calculatedOverlaySqft.toFixed(2) : "e.g. 15"
                        }
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-border/60 text-xs">
                    <span className="text-muted-foreground">Overlay Stone Material Subtotal:</span>
                    <span className="font-mono font-semibold text-foreground">
                      {overlaySourcing === "stone_tech"
                        ? formatInr(overlayStoneAmount)
                        : "₹0 (Provided by Client)"}
                    </span>
                  </div>
                </div>

                {/* Overlay Piece Additional CNC Carving Work (Optional) */}
                <div className="rounded-md border border-border p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="overlay-cnc-toggle"
                        checked={overlayCncEnabled}
                        onCheckedChange={(c) => setOverlayCncEnabled(!!c)}
                      />
                      <label
                        htmlFor="overlay-cnc-toggle"
                        className="cursor-pointer text-xs font-semibold text-foreground"
                      >
                        Additional CNC Carving on Overlay Piece
                      </label>
                    </div>
                    {overlayCncEnabled && (
                      <span className="font-mono text-xs font-semibold text-foreground">
                        {formatInr(overlayCncAmount)}
                      </span>
                    )}
                  </div>

                  {overlayCncEnabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-border/60">
                      <div>
                        <label className="text-[11px] text-muted-foreground">
                          Select Carving Style
                        </label>
                        <Select value={overlayCncKey} onValueChange={setOverlayCncKey}>
                          <SelectTrigger className="mt-0.5 h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MURAL_CNC_OPTIONS.map((opt) => (
                              <SelectItem key={opt.key} value={opt.key}>
                                {opt.label} (₹{opt.defaultRatePerSqft}/sq ft)
                              </SelectItem>
                            ))}
                            <SelectItem value="custom">Custom Carving Rate</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-[11px] text-muted-foreground">
                          Carving Rate (₹/sq ft)
                        </label>
                        {overlayCncKey === "custom" ? (
                          <Input
                            type="number"
                            min="0"
                            value={overlayCncCustomRate}
                            onChange={(e) => setOverlayCncCustomRate(e.target.value)}
                            placeholder="Rate in ₹ / sq ft"
                            className="mt-0.5 h-7 text-xs font-mono"
                          />
                        ) : (
                          <div className="mt-0.5 h-7 flex items-center text-xs font-mono font-medium text-foreground">
                            ₹{overlayCncRate} / sq ft
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 5) Site Labour & Touch Up Work */}
      <Card className="shadow-sm border-border">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold">
            5) Installation Labour & Touch Up Work
          </CardTitle>
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

      {/* 6) Adhesives & 7) Carting */}
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
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <span>Quantity ({activeAdhesiveCatalog?.unit || "bag"}s):</span>
                  {adhesiveCustomUnits !== null && (
                    <button
                      type="button"
                      onClick={() => setAdhesiveCustomUnits(null)}
                      className="text-[10px] text-blue-600 hover:underline cursor-pointer"
                      title="Reset to calculated units"
                    >
                      Auto ({autoAdhesiveUnits})
                    </button>
                  )}
                </span>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min="0"
                    placeholder={String(autoAdhesiveUnits)}
                    value={
                      adhesiveCustomUnits !== null
                        ? adhesiveCustomUnits
                        : autoAdhesiveUnits > 0
                          ? String(autoAdhesiveUnits)
                          : ""
                    }
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setAdhesiveCustomUnits(e.target.value)}
                    className="h-6 w-20 text-right text-xs font-mono"
                  />
                  <span className="text-muted-foreground text-xs">
                    {activeAdhesiveCatalog?.unit}(s)
                  </span>
                </div>
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
                  7) Carting / Freight (As per Location)
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

        {sceneDescription.trim() && (
          <div className="rounded-md border border-primary/20 bg-primary/[0.03] p-2.5 text-xs text-foreground flex items-start gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-primary">Artwork Scene & Scope: </span>
              <span className="text-muted-foreground">{sceneDescription}</span>
            </div>
          </div>
        )}

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
                    <div className="font-semibold text-slate-800 dark:text-slate-200 truncate flex items-center gap-1.5">
                      <span className="truncate">
                        {idx + 1}. {it.description}
                      </span>
                      {Number(it.unit_price) === 0 &&
                        it.description.toLowerCase().includes("client") && (
                          <Badge
                            variant="outline"
                            className="text-[10px] shrink-0 bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold"
                          >
                            Client Scope
                          </Badge>
                        )}
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
                  ? `Wall coverage: ${wallAreaSqft.toFixed(1)} sq ft • Base slabs: ${totalSlabSqft} sq ft (${slabsCount} slabs) [${baseStoneSourcing === "client_provided" ? "Client Provided" : "Stone Tech Supply"}]${overlayEnabled && effectiveOverlaySqft > 0 ? ` • Overlay: ${effectiveOverlaySqft.toFixed(1)} sq ft (${effectiveOverlayStoneType})` : ""}`
                  : "Enter wall dimensions and slab sizes above to compute estimate."}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerateAndSend}
                disabled={sending || wallAreaSqft <= 0 || (cncEnabled && !cncKey)}
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
                disabled={sending || wallAreaSqft <= 0 || (cncEnabled && !cncKey)}
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

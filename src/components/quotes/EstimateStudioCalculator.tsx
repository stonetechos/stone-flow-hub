/**
 * Estimate Studio — wall-cladding calculator, integrated directly into the
 * Quotations "New quote" form (per explicit product decision — this does
 * NOT live in the separate, generic "Estimation Studio" module).
 *
 * Scope: natural-stone wall cladding only, for this first pass. Pebbles,
 * boulders, murals, and other product categories are explicitly deferred
 * to future work (per the user's own framing) and are not handled here.
 *
 * This component owns the entire calculator worksheet (walls, per-wall
 * products, installation cost breakdown, discount, time-to-complete) and
 * reports two things upward via `onResult`:
 *  - `items`: a ready-to-submit QuoteItemInput[] for the existing
 *    createQuote() write path (so Quotations, Sales Orders, Invoices all
 *    keep working unchanged downstream).
 *  - `worksheet`: the full calculator state, persisted as-is onto
 *    `quotes.wall_estimate` for later reload / PDF regeneration.
 *
 * Known, deliberate gap: this schema has no discount field anywhere (the
 * same gap the VIE create_quotation design docs already found and
 * accepted for the exact same reason — see project engineering docs). A
 * 7.5%-over-500-sqft discount is reflected in the WhatsApp/PDF "Total
 * Estimate" line and appended to the quote's notes, but the underlying
 * quote_items — and therefore the Quotations module's own stored total —
 * reflect the pre-discount subtotal. This is stated explicitly in the UI.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  ImagePlus,
  FileDown,
  MessageCircle,
  Loader2,
  X,
  Truck,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/forms/Field";
import { formatInr } from "@/lib/format";
import { MATERIAL_OPTIONS } from "@/lib/customers/schema";
import {
  LENGTH_UNITS,
  LENGTH_UNIT_LABELS,
  type LengthUnit,
  wallSqft,
  materialQuantityToOrder,
  ceilWhole,
  ADHESIVE_CATALOG,
  SEALER_CATALOG,
  DEFAULT_SEALER_APPLICATION_RATE_PER_SQFT,
  DISCOUNT_SQFT_THRESHOLD,
  DISCOUNT_PCT,
  isCrazyPatternProduct,
  calculateAdhesiveUnits,
} from "@/lib/quotes/estimateCatalog";
import type {
  EstimateWorksheet,
  EstimateWall,
  EstimateProduct,
  EstimateAdhesiveLine,
  EstimateSealer,
} from "@/lib/quotes/estimateSchema";
import { getProject } from "@/lib/projects/api";
import { getCustomer } from "@/lib/customers/api";
import {
  buildEstimateWhatsappMessage,
  printEstimatePdf,
  openWhatsappWithMessage,
} from "@/lib/quotes/estimateWhatsappPdf";
import type { QuoteCategory, QuoteItemInput } from "@/lib/quotes/schema";

function rid(): string {
  return Math.random().toString(36).slice(2);
}

type WallForm = {
  id: string;
  name: string;
  height: string;
  length: string;
  sqftOverride?: string | null;
};
type ProductForm = {
  id: string;
  wallId: string;
  materialCategory: string;
  productName: string;
  priceUnit: "sqft" | "unit";
  pricePerUnit: string;
  wastagePct: string; // e.g. "5"
  manualQty: string; // used only when priceUnit === "unit"
  qtyOverride?: string | null; // allow direct manual override of sqft quantity to order!
  imageDataUrl: string | null;
};
type AdhesiveForm = {
  key: string;
  selected: boolean;
  pricePerUnit: string;
  unitsOverride?: string | null;
};
type OtherAdhesiveForm = {
  enabled: boolean;
  name: string;
  units: string;
  unitLabel: string;
  pricePerUnit: string;
};

export interface EstimateStudioResult {
  items: QuoteItemInput[];
  worksheet: EstimateWorksheet;
  totalWallSqft: number;
  total: number;
}

export function EstimateStudioCalculator({
  projectId,
  category,
  onCategoryChange,
  onResult,
  onTransferToManual,
}: {
  projectId: string | null;
  category?: QuoteCategory | "";
  onCategoryChange?: (cat: QuoteCategory) => void;
  onResult: (result: EstimateStudioResult | null) => void;
  onTransferToManual?: () => void;
}) {
  const [unit, setUnit] = useState<LengthUnit>("in");
  const [walls, setWalls] = useState<WallForm[]>([
    { id: rid(), name: "Wall 1", height: "", length: "" },
  ]);
  const [products, setProducts] = useState<ProductForm[]>([]);
  const [includeInstallation, setIncludeInstallation] = useState<boolean>(() => {
    return category !== "supply_only";
  });

  // Sync includeInstallation if category prop changes from parent
  useEffect(() => {
    if (category === "supply_only") {
      setIncludeInstallation(false);
    } else if (category === "supply_and_installation" || category === "material_and_labour") {
      setIncludeInstallation(true);
    }
  }, [category]);

  const [labourRate, setLabourRate] = useState("80");
  const [labourSqftOverride, setLabourSqftOverride] = useState<string | null>(null);
  const [labourAmountOverride, setLabourAmountOverride] = useState<string | null>(null);
  const [adhesives, setAdhesives] = useState<AdhesiveForm[]>(
    ADHESIVE_CATALOG.map((a) => ({
      key: a.key,
      selected: false,
      pricePerUnit: String(a.defaultPricePerUnit),
      unitsOverride: null,
    })),
  );
  const [otherAdhesive, setOtherAdhesive] = useState<OtherAdhesiveForm>({
    enabled: false,
    name: "",
    units: "",
    unitLabel: "bag",
    pricePerUnit: "",
  });
  const [sealerKey, setSealerKey] = useState<string>("none");
  const [sealerPrice, setSealerPrice] = useState<string>("2500");
  const [sealerBottlesOverride, setSealerBottlesOverride] = useState<string | null>(null);
  const [sealerAppRate, setSealerAppRate] = useState(
    String(DEFAULT_SEALER_APPLICATION_RATE_PER_SQFT),
  );
  const [discountApply, setDiscountApply] = useState(false);
  const [timeToComplete, setTimeToComplete] = useState("");

  // 6) Local Carting / Transportation (Optional)
  const [cartingEnabled, setCartingEnabled] = useState(false);
  const [cartingAmount, setCartingAmount] = useState("1500");
  const [cartingLocation, setCartingLocation] = useState("");

  // WhatsApp / PDF send fields
  const [greetingName, setGreetingName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [preparerName, setPreparerName] = useState("");
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState("");
  const [validityDays, setValidityDays] = useState("15");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (sealerKey !== "none") {
      const cat = SEALER_CATALOG.find((s) => s.key === sealerKey);
      if (cat) setSealerPrice(String(cat.defaultPricePerLtr));
    }
  }, [sealerKey]);

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
      .catch(() => {
        /* best-effort prefill only */
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  function addWall() {
    setWalls((prev) => [
      ...prev,
      { id: rid(), name: `Wall ${prev.length + 1}`, height: "", length: "" },
    ]);
  }
  function removeWall(id: string) {
    setWalls((prev) => (prev.length === 1 ? prev : prev.filter((w) => w.id !== id)));
    setProducts((prev) => prev.filter((p) => p.wallId !== id));
  }
  function updateWall(id: string, patch: Partial<WallForm>) {
    setWalls((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  }

  function addProduct() {
    if (walls.length === 0) return;
    setProducts((prev) => [
      ...prev,
      {
        id: rid(),
        wallId: walls[0].id,
        materialCategory: MATERIAL_OPTIONS[0]?.value ?? "",
        productName: "",
        priceUnit: "sqft",
        pricePerUnit: "",
        wastagePct: "5",
        manualQty: "",
        imageDataUrl: null,
      },
    ]);
  }
  function removeProduct(id: string) {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }
  function updateProduct(id: string, patch: Partial<ProductForm>) {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }
  function onProductImage(id: string, file: File | null) {
    if (!file) {
      updateProduct(id, { imageDataUrl: null });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateProduct(id, { imageDataUrl: String(reader.result) });
    reader.readAsDataURL(file);
  }

  // ---- Derived calculations ----------------------------------------------

  const wallsComputed: EstimateWall[] = useMemo(
    () =>
      walls.map((w) => {
        const autoSqft = wallSqft(Number(w.height) || 0, Number(w.length) || 0, unit);
        const sqft =
          w.sqftOverride !== undefined &&
          w.sqftOverride !== null &&
          w.sqftOverride !== "" &&
          !isNaN(Number(w.sqftOverride))
            ? Math.max(0, Number(w.sqftOverride))
            : autoSqft;
        return {
          id: w.id,
          name: w.name.trim() || "Wall",
          height: Number(w.height) || 0,
          length: Number(w.length) || 0,
          unit,
          sqft,
        };
      }),
    [walls, unit],
  );

  const totalWallSqft = useMemo(
    () => wallsComputed.reduce((sum, w) => sum + w.sqft, 0),
    [wallsComputed],
  );

  const productsComputed: EstimateProduct[] = useMemo(
    () =>
      products.map((p) => {
        const wall = wallsComputed.find((w) => w.id === p.wallId);
        const price = Number(p.pricePerUnit) || 0;
        const wastage =
          p.wastagePct !== "" && !isNaN(Number(p.wastagePct)) ? Number(p.wastagePct) : 5;
        const autoQty = materialQuantityToOrder(wall?.sqft ?? 0, wastage);
        const qty =
          p.priceUnit === "sqft"
            ? p.qtyOverride !== undefined &&
              p.qtyOverride !== null &&
              p.qtyOverride !== "" &&
              !isNaN(Number(p.qtyOverride))
              ? Math.max(0, Number(p.qtyOverride))
              : autoQty
            : Number(p.manualQty) || 0;
        return {
          id: p.id,
          wallId: p.wallId,
          materialCategory: p.materialCategory,
          productName: p.productName.trim(),
          priceUnit: p.priceUnit,
          pricePerUnit: price,
          wastagePct: wastage,
          quantityToOrder: qty,
          amount: qty * price,
          imageDataUrl: p.imageDataUrl,
        };
      }),
    [products, wallsComputed],
  );

  const materialAmount = useMemo(
    () => productsComputed.reduce((sum, p) => sum + p.amount, 0),
    [productsComputed],
  );

  const effectiveLabourSqft = useMemo(() => {
    return labourSqftOverride !== null &&
      labourSqftOverride !== "" &&
      !isNaN(Number(labourSqftOverride))
      ? Math.max(0, Number(labourSqftOverride))
      : totalWallSqft;
  }, [labourSqftOverride, totalWallSqft]);

  const autoLabourAmount = useMemo(
    () => (Number(labourRate) || 0) * effectiveLabourSqft,
    [labourRate, effectiveLabourSqft],
  );

  const labourAmount = useMemo(() => {
    if (
      labourAmountOverride !== null &&
      labourAmountOverride !== "" &&
      !isNaN(Number(labourAmountOverride))
    ) {
      return Math.max(0, Number(labourAmountOverride));
    }
    return autoLabourAmount;
  }, [labourAmountOverride, autoLabourAmount]);

  const wallBreakdown = useMemo(() => {
    let crazySqft = 0;
    let standardSqft = 0;

    const crazyWallIds = new Set(
      productsComputed
        .filter((p) => isCrazyPatternProduct(p.materialCategory, p.productName))
        .map((p) => p.wallId),
    );

    for (const w of wallsComputed) {
      if (crazyWallIds.has(w.id)) {
        crazySqft += w.sqft;
      } else {
        standardSqft += w.sqft;
      }
    }

    // Fallback: if any product in the quote is crazy pattern but wasn't mapped to a wall,
    // or if only one wall exists and is crazy, treat total area as crazy
    const hasCrazyProduct = productsComputed.some((p) =>
      isCrazyPatternProduct(p.materialCategory, p.productName),
    );
    if (hasCrazyProduct && crazySqft === 0 && totalWallSqft > 0) {
      crazySqft = totalWallSqft;
      standardSqft = 0;
    }

    return {
      crazySqft,
      standardSqft,
      hasCrazyPattern: crazySqft > 0 || hasCrazyProduct,
    };
  }, [wallsComputed, productsComputed, totalWallSqft]);

  const adhesiveLines: EstimateAdhesiveLine[] = useMemo(() => {
    const lines: EstimateAdhesiveLine[] = [];
    for (const a of adhesives) {
      if (!a.selected) continue;
      const cat = ADHESIVE_CATALOG.find((c) => c.key === a.key);
      if (!cat) continue;
      const autoUnits = calculateAdhesiveUnits(cat, wallBreakdown);
      const units =
        a.unitsOverride !== undefined &&
        a.unitsOverride !== null &&
        a.unitsOverride !== "" &&
        !isNaN(Number(a.unitsOverride))
          ? Math.max(0, Number(a.unitsOverride))
          : autoUnits;
      const price = Number(a.pricePerUnit) || 0;
      lines.push({
        key: a.key,
        label: cat.label,
        units,
        unitLabel: cat.unit,
        pricePerUnit: price,
        amount: units * price,
      });
    }
    if (otherAdhesive.enabled && otherAdhesive.name.trim()) {
      const units = Number(otherAdhesive.units) || 0;
      const price = Number(otherAdhesive.pricePerUnit) || 0;
      lines.push({
        key: "other",
        label: otherAdhesive.name.trim(),
        customName: otherAdhesive.name.trim(),
        units,
        unitLabel: otherAdhesive.unitLabel || "bag",
        pricePerUnit: price,
        amount: units * price,
      });
    }
    return lines;
  }, [adhesives, otherAdhesive, wallBreakdown]);

  const adhesivesAmount = useMemo(
    () => adhesiveLines.reduce((sum, l) => sum + l.amount, 0),
    [adhesiveLines],
  );

  const sealerComputed: EstimateSealer | null = useMemo(() => {
    if (sealerKey === "none") return null;
    const cat = SEALER_CATALOG.find((s) => s.key === sealerKey);
    if (!cat) return null;
    const autoBottles = ceilWhole(totalWallSqft / cat.coverageSqftPerLtr);
    const bottles =
      sealerBottlesOverride !== null &&
      sealerBottlesOverride !== "" &&
      !isNaN(Number(sealerBottlesOverride))
        ? Math.max(0, Number(sealerBottlesOverride))
        : autoBottles;
    const price = Number(sealerPrice) || 0;
    return { key: cat.key, label: cat.label, bottles, pricePerLtr: price, amount: bottles * price };
  }, [sealerKey, sealerPrice, totalWallSqft, sealerBottlesOverride]);

  const sealerLabourAmount = useMemo(
    () => (sealerKey !== "none" ? (Number(sealerAppRate) || 0) * totalWallSqft : 0),
    [sealerKey, sealerAppRate, totalWallSqft],
  );

  const cartingNum = cartingEnabled ? Number(cartingAmount) || 0 : 0;

  // If includeInstallation is disabled (e.g. Supply Only deal), installation amounts are 0
  const effectiveLabourAmount = includeInstallation ? labourAmount : 0;
  const effectiveAdhesivesAmount = includeInstallation ? adhesivesAmount : 0;
  const effectiveSealerAmount = includeInstallation ? (sealerComputed?.amount ?? 0) : 0;
  const effectiveSealerLabourAmount = includeInstallation ? sealerLabourAmount : 0;
  const effectiveInstallationAmount =
    effectiveLabourAmount +
    effectiveAdhesivesAmount +
    effectiveSealerAmount +
    effectiveSealerLabourAmount;

  const effectiveMaterialAmount = category === "installation_only" ? 0 : materialAmount;

  const subtotal = effectiveMaterialAmount + effectiveInstallationAmount + cartingNum;
  const discountEligible = totalWallSqft > DISCOUNT_SQFT_THRESHOLD;
  const discountAmount = discountApply && discountEligible ? (subtotal * DISCOUNT_PCT) / 100 : 0;
  const total = subtotal - discountAmount;

  const worksheet: EstimateWorksheet = useMemo(
    () => ({
      version: 1,
      unit,
      walls: wallsComputed,
      products: productsComputed.map((p) => ({ ...p, imageDataUrl: p.imageDataUrl || undefined })),
      installation: {
        labour: {
          ratePerSqft: includeInstallation ? Number(labourRate) || 0 : 0,
          amount: effectiveLabourAmount,
        },
        adhesives: includeInstallation ? adhesiveLines : [],
        sealer: includeInstallation ? sealerComputed : null,
        sealerLabour: {
          ratePerSqft: includeInstallation ? Number(sealerAppRate) || 0 : 0,
          amount: effectiveSealerLabourAmount,
        },
      },
      carting:
        cartingNum > 0
          ? {
              amount: cartingNum,
              location: cartingLocation.trim() || undefined,
            }
          : undefined,
      discount: {
        applied: discountApply,
        eligible: discountEligible,
        pct: DISCOUNT_PCT,
        amount: discountAmount,
      },
      timeToComplete: timeToComplete || undefined,
      totalWallSqft,
      materialAmount: effectiveMaterialAmount,
      installationAmount: effectiveInstallationAmount,
      subtotal,
      total,
    }),
    [
      unit,
      wallsComputed,
      productsComputed,
      includeInstallation,
      labourRate,
      effectiveLabourAmount,
      adhesiveLines,
      sealerComputed,
      sealerAppRate,
      effectiveSealerLabourAmount,
      discountApply,
      discountEligible,
      discountAmount,
      cartingNum,
      cartingLocation,
      timeToComplete,
      totalWallSqft,
      effectiveMaterialAmount,
      effectiveInstallationAmount,
      subtotal,
      total,
    ],
  );

  const items: QuoteItemInput[] = useMemo(() => {
    const out: QuoteItemInput[] = [];
    if (category !== "installation_only") {
      for (const p of productsComputed) {
        if (!p.productName || p.amount <= 0) continue;
        const materialLabel =
          MATERIAL_OPTIONS.find((m) => m.value === p.materialCategory)?.label ?? p.materialCategory;
        const wallName = wallsComputed.find((w) => w.id === p.wallId)?.name ?? "";
        out.push({
          product_id: null,
          description: `${materialLabel} — ${p.productName}${wallName ? ` (${wallName})` : ""}`,
          quantity: p.quantityToOrder,
          unit: p.priceUnit === "sqft" ? "sqft" : "unit",
          unit_price: p.pricePerUnit,
          tax_pct: 0,
          fulfilment: null,
          image_url: p.imageDataUrl || null,
        });
      }
    }
    if (includeInstallation && effectiveLabourAmount > 0) {
      out.push({
        product_id: null,
        description: "Installation Labour",
        quantity: effectiveLabourSqft,
        unit: "sqft",
        unit_price: Number(labourRate) || 0,
        tax_pct: 0,
        fulfilment: null,
      });
    }
    if (includeInstallation) {
      for (const l of adhesiveLines) {
        if (l.units <= 0) continue;
        out.push({
          product_id: null,
          description: l.customName ? `Adhesive — ${l.customName}` : `Adhesive — ${l.label}`,
          quantity: l.units,
          unit: l.unitLabel,
          unit_price: l.pricePerUnit,
          tax_pct: 0,
          fulfilment: null,
        });
      }
    }
    if (includeInstallation && sealerComputed && sealerComputed.bottles > 0) {
      out.push({
        product_id: null,
        description: `Sealer Chemical — ${sealerComputed.label}`,
        quantity: sealerComputed.bottles,
        unit: "ltr",
        unit_price: sealerComputed.pricePerLtr,
        tax_pct: 0,
        fulfilment: null,
      });
    }
    if (includeInstallation && effectiveSealerLabourAmount > 0) {
      out.push({
        product_id: null,
        description: "Sealer Application Labour",
        quantity: totalWallSqft,
        unit: "sqft",
        unit_price: Number(sealerAppRate) || 0,
        tax_pct: 0,
        fulfilment: null,
      });
    }
    if (cartingNum > 0) {
      out.push({
        product_id: null,
        description: `Local Carting & Transportation${cartingLocation.trim() ? ` (${cartingLocation.trim()})` : ""}`,
        quantity: 1,
        unit: "trip",
        unit_price: cartingNum,
        tax_pct: 0,
        hsn_sac: "9965",
        fulfilment: null,
      });
    }
    return out;
  }, [
    category,
    productsComputed,
    wallsComputed,
    includeInstallation,
    effectiveLabourAmount,
    effectiveLabourSqft,
    labourRate,
    adhesiveLines,
    sealerComputed,
    effectiveSealerLabourAmount,
    sealerAppRate,
    cartingNum,
    cartingLocation,
    totalWallSqft,
  ]);

  useEffect(() => {
    if (items.length === 0) {
      onResult(null);
    } else {
      onResult({ items, worksheet, totalWallSqft, total });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, worksheet]);

  function wallLabel(w: WallForm) {
    return w.name.trim() || "Wall";
  }

  async function handleGenerateAndSend() {
    if (items.length === 0) {
      toast.error("Add at least one wall and product first");
      return;
    }
    if (!customerMobile.trim()) {
      toast.error(
        "No mobile number on file for this customer — add one on the customer record first",
      );
      return;
    }
    setSending(true);
    try {
      const materialSummary = productsComputed
        .filter((p) => p.productName)
        .map((p) => {
          const materialLabel =
            MATERIAL_OPTIONS.find((m) => m.value === p.materialCategory)?.label ??
            p.materialCategory;
          const wallName = wallsComputed.find((w) => w.id === p.wallId)?.name ?? "";
          return `${materialLabel} - ${p.productName}${wallName ? ` (${wallName})` : ""}`;
        })
        .join("; ");
      const materialToOrderSummary = productsComputed
        .filter((p) => p.productName)
        .map((p) => {
          const wallName = wallsComputed.find((w) => w.id === p.wallId)?.name ?? "";
          const wastageNote =
            p.priceUnit === "sqft" ? ` (incl. ${p.wastagePct ?? 5}% wastage)` : "";
          return `${p.quantityToOrder} ${p.priceUnit === "sqft" ? "sqft" : "unit(s)"}${wastageNote}${wallName ? ` (${wallName})` : ""}`;
        })
        .join("; ");
      const wallSizeSummary = wallsComputed
        .map(
          (w) => `${w.name}: ${w.height}${unit} x ${w.length}${unit} (${w.sqft.toFixed(1)} sqft)`,
        )
        .join("; ");

      const adhesivesSummary = adhesiveLines
        .filter((l) => l.units > 0)
        .map(
          (l) => `${l.units} ${l.unitLabel}${l.units === 1 ? "" : "s"} ${l.customName || l.label}`,
        )
        .join(", ");

      const message = buildEstimateWhatsappMessage(
        {
          greetingName: greetingName.trim() || "there",
          wallSizeSummary: wallSizeSummary || "—",
          materialSummary: materialSummary || "—",
          materialToOrderSummary: materialToOrderSummary || "—",
          materialAmount: effectiveMaterialAmount,
          installationLabourAmount: effectiveLabourAmount,
          adhesivesAmount: effectiveAdhesivesAmount,
          adhesivesSummary: includeInstallation && adhesivesSummary ? adhesivesSummary : undefined,
          sealerAmount: effectiveSealerAmount,
          sealerApplicationAmount: effectiveSealerLabourAmount,
          cartingAmount: cartingNum > 0 ? cartingNum : undefined,
          cartingLocation: cartingLocation.trim() || undefined,
          totalEstimate: total,
          estimatedDeliveryDate: estimatedDeliveryDate || undefined,
          deliveryTimelineDays: estimatedDeliveryDate || undefined,
          validityDays: validityDays || undefined,
          preparerName,
        },
        "Stone Tech, Ahmedabad",
      );

      const photos = productsComputed.map((p) => p.imageDataUrl).filter((u): u is string => !!u);
      await printEstimatePdf(message, photos);
      openWhatsappWithMessage(customerMobile, message);
      toast.success(
        "Estimate opened for Print/Save-as-PDF, and WhatsApp opened with the message ready — attach the saved PDF there and hit send.",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate the estimate");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-sm border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        Wall cladding only, for now — pebbles, boulders, murals and other categories come later.
        Discount has no field on quotations yet, so it's reflected in the WhatsApp/PDF total and
        quote notes, not in this quote's own stored total below.
      </div>

      {/* Wall size (coverage area) */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium">Wall size (coverage area)</label>
          <div className="flex items-center gap-2">
            <Select value={unit} onValueChange={(v) => setUnit(v as LengthUnit)}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LENGTH_UNITS.map((u) => (
                  <SelectItem key={u} value={u}>
                    {LENGTH_UNIT_LABELS[u]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="ghost" size="sm" onClick={addWall}>
              <Plus className="mr-1 h-3 w-3" /> Add wall
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          {walls.map((w, idx) => {
            const sqft = wallSqft(Number(w.height) || 0, Number(w.length) || 0, unit);
            return (
              <div
                key={w.id}
                className="grid grid-cols-12 items-end gap-2 rounded-sm border border-border bg-background p-3"
              >
                <LineField label="Wall name" className="col-span-12 md:col-span-4">
                  <Input
                    value={w.name}
                    placeholder={`Wall ${idx + 1}`}
                    onChange={(e) => updateWall(w.id, { name: e.target.value })}
                  />
                </LineField>
                <LineField label={`Height (${unit})`} className="col-span-6 md:col-span-2">
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={w.height}
                    onChange={(e) => updateWall(w.id, { height: e.target.value })}
                  />
                </LineField>
                <LineField label={`Length (${unit})`} className="col-span-6 md:col-span-2">
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={w.length}
                    onChange={(e) => updateWall(w.id, { length: e.target.value })}
                  />
                </LineField>
                <LineField
                  label={
                    <div className="flex items-center justify-between">
                      <span>Sq ft</span>
                      {w.sqftOverride !== null && w.sqftOverride !== undefined && (
                        <button
                          type="button"
                          onClick={() => updateWall(w.id, { sqftOverride: null })}
                          className="text-[10px] text-blue-600 hover:underline cursor-pointer"
                          title="Reset to calculated (Height x Length)"
                        >
                          Auto (
                          {wallSqft(Number(w.height) || 0, Number(w.length) || 0, unit).toFixed(1)})
                        </button>
                      )}
                    </div>
                  }
                  className="col-span-8 md:col-span-3"
                >
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={
                      w.sqftOverride !== undefined && w.sqftOverride !== null
                        ? w.sqftOverride
                        : sqft > 0
                          ? sqft.toFixed(2)
                          : ""
                    }
                    placeholder={sqft > 0 ? sqft.toFixed(2) : "0"}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => updateWall(w.id, { sqftOverride: e.target.value })}
                  />
                </LineField>
                <div className="col-span-4 md:col-span-1 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove wall"
                    disabled={walls.length === 1}
                    onClick={() => removeWall(w.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-2 text-right text-xs text-muted-foreground">
          Total wall area:{" "}
          <span className="font-medium text-foreground">{totalWallSqft.toFixed(2)} sqft</span>
        </div>
      </div>

      {/* Product registration */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium">Products</label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addProduct}
            disabled={walls.length === 0}
          >
            <Plus className="mr-1 h-3 w-3" /> Add product
          </Button>
        </div>
        <div className="space-y-3">
          {products.map((p) => {
            const computed = productsComputed.find((c) => c.id === p.id);
            const wall = wallsComputed.find((w) => w.id === p.wallId);
            return (
              <div
                key={p.id}
                className="space-y-2 rounded-sm border border-border bg-background p-3"
              >
                <div className="grid grid-cols-12 gap-2">
                  <LineField label="Wall" className="col-span-6 md:col-span-2">
                    <Select
                      value={p.wallId}
                      onValueChange={(v) => updateProduct(p.id, { wallId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {walls.map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {wallLabel(w)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </LineField>
                  <LineField label="Material" className="col-span-6 md:col-span-3">
                    <Select
                      value={p.materialCategory}
                      onValueChange={(v) => updateProduct(p.id, { materialCategory: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MATERIAL_OPTIONS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </LineField>
                  <LineField label="Specific product" className="col-span-12 md:col-span-4">
                    <Input
                      placeholder='e.g. Mint Sandstone RF-SB 2"/1"'
                      value={p.productName}
                      onChange={(e) => updateProduct(p.id, { productName: e.target.value })}
                    />
                  </LineField>
                  <div className="col-span-12 md:col-span-3 flex items-end justify-end gap-1">
                    <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-sm border border-border px-3 text-xs text-muted-foreground hover:bg-muted/50">
                      <ImagePlus className="h-3.5 w-3.5" />
                      {p.imageDataUrl ? "Change photo" : "Add photo"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => onProductImage(p.id, e.target.files?.[0] ?? null)}
                      />
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Remove product"
                      onClick={() => removeProduct(p.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-12 gap-2">
                  <LineField
                    label="Price basis"
                    className={
                      p.priceUnit === "sqft"
                        ? "col-span-6 md:col-span-2"
                        : "col-span-6 md:col-span-3"
                    }
                  >
                    <Select
                      value={p.priceUnit}
                      onValueChange={(v) =>
                        updateProduct(p.id, { priceUnit: v as "sqft" | "unit" })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sqft">Per sq ft</SelectItem>
                        <SelectItem value="unit">Per unit</SelectItem>
                      </SelectContent>
                    </Select>
                  </LineField>
                  <LineField
                    label="Price (₹)"
                    className={
                      p.priceUnit === "sqft"
                        ? "col-span-6 md:col-span-2"
                        : "col-span-6 md:col-span-3"
                    }
                  >
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      value={p.pricePerUnit}
                      onChange={(e) => updateProduct(p.id, { pricePerUnit: e.target.value })}
                    />
                  </LineField>
                  {p.priceUnit === "unit" && (
                    <LineField label="Quantity (units)" className="col-span-6 md:col-span-3">
                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        value={p.manualQty}
                        onChange={(e) => updateProduct(p.id, { manualQty: e.target.value })}
                      />
                    </LineField>
                  )}
                  {p.priceUnit === "sqft" && (
                    <>
                      <LineField label="Wastage (%)" className="col-span-6 md:col-span-2">
                        <Input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          max="100"
                          step="1"
                          value={p.wastagePct}
                          placeholder="5"
                          onChange={(e) => updateProduct(p.id, { wastagePct: e.target.value })}
                        />
                      </LineField>
                      <LineField
                        label={
                          <div className="flex items-center justify-between">
                            <span>Qty to order (sqft)</span>
                            {p.qtyOverride !== null && p.qtyOverride !== undefined && (
                              <button
                                type="button"
                                onClick={() => updateProduct(p.id, { qtyOverride: null })}
                                className="text-[10px] text-blue-600 hover:underline cursor-pointer"
                                title="Reset to auto-calculated wall area + wastage"
                              >
                                Auto (
                                {materialQuantityToOrder(
                                  wall?.sqft ?? 0,
                                  p.wastagePct !== "" && !isNaN(Number(p.wastagePct))
                                    ? Number(p.wastagePct)
                                    : 5,
                                )}
                                )
                              </button>
                            )}
                          </div>
                        }
                        className="col-span-6 md:col-span-3"
                      >
                        <Input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="any"
                          value={
                            p.qtyOverride !== undefined && p.qtyOverride !== null
                              ? p.qtyOverride
                              : computed?.quantityToOrder
                                ? String(computed.quantityToOrder)
                                : ""
                          }
                          placeholder={
                            computed?.quantityToOrder ? String(computed.quantityToOrder) : "0"
                          }
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => updateProduct(p.id, { qtyOverride: e.target.value })}
                        />
                      </LineField>
                    </>
                  )}
                  <LineField
                    label="Amount"
                    className={
                      p.priceUnit === "sqft"
                        ? "col-span-12 md:col-span-3"
                        : "col-span-6 md:col-span-3"
                    }
                  >
                    <div className="flex h-9 items-center rounded-sm border border-border bg-muted/30 px-3 text-sm font-semibold tabular-nums">
                      {formatInr(computed?.amount ?? 0)}
                    </div>
                  </LineField>
                  {p.imageDataUrl && (
                    <div className="col-span-12 flex items-center gap-2">
                      <img
                        src={p.imageDataUrl}
                        alt="Product"
                        className="h-14 w-14 rounded-sm border border-border object-cover"
                      />
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => onProductImage(p.id, null)}
                      >
                        <X className="mr-1 inline h-3 w-3" />
                        Remove photo
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {products.length === 0 && (
            <div className="rounded-sm border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              No products yet — add one above.
            </div>
          )}
        </div>
        <div className="mt-2 text-right text-sm">
          Material total: <span className="font-semibold">{formatInr(materialAmount)}</span>
        </div>
      </div>

      {/* Installation */}
      <div className="space-y-4 rounded-sm border border-border bg-background p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="enable-installation"
              checked={includeInstallation}
              onCheckedChange={(v) => {
                const checked = !!v;
                setIncludeInstallation(checked);
                if (!checked && category !== "supply_only") {
                  onCategoryChange?.("supply_only");
                } else if (checked && category === "supply_only") {
                  onCategoryChange?.("supply_and_installation");
                }
              }}
            />
            <label
              htmlFor="enable-installation"
              className="text-sm font-semibold cursor-pointer flex items-center gap-2"
            >
              <span>Installation (Labour &amp; Materials)</span>
              {!includeInstallation && (
                <span className="text-[11px] font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                  Excluded (Supply Only)
                </span>
              )}
              {includeInstallation && (
                <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                  Included in Quote
                </span>
              )}
            </label>
          </div>
          <div className="text-sm font-semibold">
            {includeInstallation ? (
              <span>Installation total: {formatInr(effectiveInstallationAmount)}</span>
            ) : (
              <span className="text-muted-foreground font-normal">₹0 (Excluded)</span>
            )}
          </div>
        </div>

        {!includeInstallation ? (
          <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 rounded-md border border-amber-200 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-3">
            <span>
              Deal Scope is set to <strong>Supply Only</strong>. Installation Labour, Adhesives, and
              Sealer Application are excluded from the quote.
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIncludeInstallation(true);
                onCategoryChange?.("supply_and_installation");
              }}
              className="h-7 text-xs border-amber-300 bg-white dark:bg-slate-900 hover:bg-amber-100 shrink-0 cursor-pointer"
            >
              Include Installation
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-12 items-end gap-2">
              <LineField
                label="Labour Charges — rate (₹/sqft)"
                className="col-span-6 md:col-span-3"
              >
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={labourRate}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setLabourRate(e.target.value)}
                />
              </LineField>
              <LineField
                label={
                  <div className="flex items-center justify-between">
                    <span>Labour Area (sqft)</span>
                    {labourSqftOverride !== null && (
                      <button
                        type="button"
                        onClick={() => setLabourSqftOverride(null)}
                        className="text-[10px] text-blue-600 hover:underline cursor-pointer"
                        title="Reset to calculated total wall sq ft"
                      >
                        Auto ({totalWallSqft.toFixed(1)})
                      </button>
                    )}
                  </div>
                }
                className="col-span-6 md:col-span-3"
              >
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={
                    labourSqftOverride !== null
                      ? labourSqftOverride
                      : totalWallSqft > 0
                        ? totalWallSqft.toFixed(2)
                        : ""
                  }
                  placeholder={totalWallSqft > 0 ? totalWallSqft.toFixed(2) : "0"}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setLabourSqftOverride(e.target.value)}
                />
              </LineField>
              <LineField
                label={
                  <div className="flex items-center justify-between">
                    <span>Labour amount (₹)</span>
                    {labourAmountOverride !== null && (
                      <button
                        type="button"
                        onClick={() => setLabourAmountOverride(null)}
                        className="text-[10px] text-blue-600 hover:underline cursor-pointer"
                        title="Reset to calculated rate × sq ft"
                      >
                        Auto ({formatInr(autoLabourAmount)})
                      </button>
                    )}
                  </div>
                }
                className="col-span-12 md:col-span-3"
              >
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={
                    labourAmountOverride !== null
                      ? labourAmountOverride
                      : autoLabourAmount > 0
                        ? String(Math.round(autoLabourAmount))
                        : ""
                  }
                  placeholder={autoLabourAmount > 0 ? String(Math.round(autoLabourAmount)) : "0"}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setLabourAmountOverride(e.target.value)}
                />
              </LineField>
            </div>

            <div>
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Adhesives (select all that apply)
                </span>
                {wallBreakdown.hasCrazyPattern && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    ⚡ Crazy Pattern stone: 1 bag covers 15 sq ft (standard: 25 sq ft)
                  </span>
                )}
              </div>
              <div className="space-y-1.5">
                {ADHESIVE_CATALOG.map((cat) => {
                  const a = adhesives.find((x) => x.key === cat.key)!;
                  const line = adhesiveLines.find((l) => l.key === cat.key);
                  const autoUnits = calculateAdhesiveUnits(cat, wallBreakdown);
                  const isOverridden = a.unitsOverride !== null && a.unitsOverride !== undefined;
                  return (
                    <div
                      key={cat.key}
                      className="grid grid-cols-12 items-center gap-2 rounded-sm border border-border/60 px-2 py-1.5"
                    >
                      <div className="col-span-12 md:col-span-5 flex items-center gap-2">
                        <Checkbox
                          checked={a.selected}
                          onCheckedChange={(v) =>
                            setAdhesives((prev) =>
                              prev.map((x) =>
                                x.key === cat.key
                                  ? {
                                      ...x,
                                      selected: !!v,
                                      unitsOverride: v ? x.unitsOverride : null,
                                    }
                                  : x,
                              ),
                            )
                          }
                        />
                        <span className="text-sm">
                          {cat.label}{" "}
                          {cat.needsPriceConfirmation && (
                            <span className="text-[10px] text-amber-600">(confirm price)</span>
                          )}
                        </span>
                      </div>
                      <LineField
                        label={`Price / ${cat.unit} (₹)`}
                        className="col-span-6 md:col-span-3"
                      >
                        <Input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          disabled={!a.selected}
                          value={a.pricePerUnit}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) =>
                            setAdhesives((prev) =>
                              prev.map((x) =>
                                x.key === cat.key ? { ...x, pricePerUnit: e.target.value } : x,
                              ),
                            )
                          }
                        />
                      </LineField>
                      <LineField
                        label={
                          <div className="flex items-center justify-between gap-1">
                            <span>{cat.unit}s (Qty)</span>
                            {isOverridden && (
                              <button
                                type="button"
                                onClick={() =>
                                  setAdhesives((prev) =>
                                    prev.map((x) =>
                                      x.key === cat.key ? { ...x, unitsOverride: null } : x,
                                    ),
                                  )
                                }
                                className="text-[10px] text-blue-600 hover:underline cursor-pointer font-medium"
                                title={`Reset to auto-calculated ${autoUnits} ${cat.unit}s`}
                              >
                                Auto ({autoUnits})
                              </button>
                            )}
                          </div>
                        }
                        className="col-span-3 md:col-span-2"
                      >
                        <Input
                          type="number"
                          min="0"
                          disabled={!a.selected}
                          value={
                            isOverridden
                              ? (a.unitsOverride ?? "")
                              : a.selected && autoUnits > 0
                                ? String(autoUnits)
                                : ""
                          }
                          placeholder={a.selected && autoUnits > 0 ? String(autoUnits) : "0"}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) =>
                            setAdhesives((prev) =>
                              prev.map((x) =>
                                x.key === cat.key ? { ...x, unitsOverride: e.target.value } : x,
                              ),
                            )
                          }
                          className="h-9 font-mono"
                        />
                      </LineField>
                      <LineField label="Amount" className="col-span-3 md:col-span-2">
                        <div className="flex h-9 items-center rounded-sm border border-border bg-muted/30 px-2 text-sm font-medium tabular-nums">
                          {a.selected ? formatInr(line?.amount ?? 0) : "—"}
                        </div>
                      </LineField>
                    </div>
                  );
                })}
                <div className="grid grid-cols-12 items-center gap-2 rounded-sm border border-border/60 px-2 py-1.5">
                  <div className="col-span-12 md:col-span-5 flex items-center gap-2">
                    <Checkbox
                      checked={otherAdhesive.enabled}
                      onCheckedChange={(v) =>
                        setOtherAdhesive((prev) => ({ ...prev, enabled: !!v }))
                      }
                    />
                    <Input
                      placeholder="Other adhesive — name"
                      className="h-8"
                      disabled={!otherAdhesive.enabled}
                      value={otherAdhesive.name}
                      onChange={(e) =>
                        setOtherAdhesive((prev) => ({ ...prev, name: e.target.value }))
                      }
                    />
                  </div>
                  <LineField label="Unit" className="col-span-3 md:col-span-1">
                    <Input
                      className="h-8"
                      disabled={!otherAdhesive.enabled}
                      value={otherAdhesive.unitLabel}
                      onChange={(e) =>
                        setOtherAdhesive((prev) => ({ ...prev, unitLabel: e.target.value }))
                      }
                    />
                  </LineField>
                  <LineField label="Qty" className="col-span-3 md:col-span-2">
                    <Input
                      className="h-8"
                      type="number"
                      min="0"
                      disabled={!otherAdhesive.enabled}
                      value={otherAdhesive.units}
                      onChange={(e) =>
                        setOtherAdhesive((prev) => ({ ...prev, units: e.target.value }))
                      }
                    />
                  </LineField>
                  <LineField label="Price (₹)" className="col-span-6 md:col-span-2">
                    <Input
                      className="h-8"
                      type="number"
                      min="0"
                      disabled={!otherAdhesive.enabled}
                      value={otherAdhesive.pricePerUnit}
                      onChange={(e) =>
                        setOtherAdhesive((prev) => ({ ...prev, pricePerUnit: e.target.value }))
                      }
                    />
                  </LineField>
                  <LineField label="Amount" className="col-span-6 md:col-span-2">
                    <div className="flex h-8 items-center rounded-sm border border-border bg-muted/30 px-2 text-sm font-medium tabular-nums">
                      {otherAdhesive.enabled
                        ? formatInr(
                            (Number(otherAdhesive.units) || 0) *
                              (Number(otherAdhesive.pricePerUnit) || 0),
                          )
                        : "—"}
                    </div>
                  </LineField>
                </div>
              </div>
              <div className="mt-1.5 text-right text-xs text-muted-foreground">
                Adhesives total:{" "}
                <span className="font-medium text-foreground">{formatInr(adhesivesAmount)}</span>
              </div>
            </div>

            <div className="grid grid-cols-12 items-end gap-2">
              <LineField label="Sealer Chemical" className="col-span-12 md:col-span-4">
                <Select value={sealerKey} onValueChange={setSealerKey}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {SEALER_CATALOG.map((s) => (
                      <SelectItem key={s.key} value={s.key}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </LineField>
              <LineField label="Price / ltr (₹)" className="col-span-4 md:col-span-2">
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  disabled={sealerKey === "none"}
                  value={sealerPrice}
                  onChange={(e) => setSealerPrice(e.target.value)}
                />
              </LineField>
              <LineField
                label={
                  <div className="flex items-center justify-between">
                    <span>Bottles</span>
                    {sealerBottlesOverride !== null && (
                      <button
                        type="button"
                        onClick={() => setSealerBottlesOverride(null)}
                        className="text-[10px] text-blue-600 hover:underline cursor-pointer"
                        title="Reset to calculated bottles"
                      >
                        Auto (
                        {sealerKey !== "none"
                          ? ceilWhole(
                              totalWallSqft /
                                (SEALER_CATALOG.find((s) => s.key === sealerKey)
                                  ?.coverageSqftPerLtr ?? 1),
                            )
                          : 0}
                        )
                      </button>
                    )}
                  </div>
                }
                className="col-span-4 md:col-span-2"
              >
                <Input
                  type="number"
                  min="0"
                  disabled={sealerKey === "none"}
                  value={
                    sealerBottlesOverride !== null
                      ? sealerBottlesOverride
                      : sealerKey !== "none" && sealerComputed?.bottles
                        ? String(sealerComputed.bottles)
                        : ""
                  }
                  placeholder={
                    sealerKey !== "none" && sealerComputed?.bottles
                      ? String(sealerComputed.bottles)
                      : "0"
                  }
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setSealerBottlesOverride(e.target.value)}
                  className="h-9"
                />
              </LineField>
              <LineField label="Amount" className="col-span-4 md:col-span-2">
                <div className="flex h-9 items-center rounded-sm border border-border bg-muted/30 px-2 text-sm font-medium tabular-nums">
                  {sealerKey !== "none" ? formatInr(sealerComputed?.amount ?? 0) : "—"}
                </div>
              </LineField>
            </div>

            <div className="grid grid-cols-12 items-end gap-2">
              <LineField
                label="Sealer Application — rate (₹/sqft)"
                className="col-span-6 md:col-span-3"
              >
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={sealerAppRate}
                  onChange={(e) => setSealerAppRate(e.target.value)}
                />
              </LineField>
              <LineField label="Sealer application amount" className="col-span-6 md:col-span-3">
                <div className="flex h-9 items-center rounded-sm border border-border bg-muted/30 px-3 text-sm font-medium tabular-nums">
                  {sealerKey !== "none" ? formatInr(sealerLabourAmount) : "—"}
                </div>
              </LineField>
            </div>

            <div className="text-right text-sm">
              Installation total:{" "}
              <span className="font-semibold">{formatInr(effectiveInstallationAmount)}</span>
            </div>
          </>
        )}
      </div>

      {/* Optional Local Carting / Transportation */}
      <div className="space-y-3 rounded-sm border border-border bg-background p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              id="enable-carting"
              checked={cartingEnabled}
              onCheckedChange={(v) => setCartingEnabled(!!v)}
            />
            <label
              htmlFor="enable-carting"
              className="text-sm font-medium cursor-pointer flex items-center gap-1.5"
            >
              <Truck className="h-4 w-4 text-amber-600" />
              <span>Local Carting &amp; Transportation (Optional)</span>
            </label>
          </div>
          {cartingNum > 0 && (
            <span className="text-xs font-semibold text-emerald-700">+{formatInr(cartingNum)}</span>
          )}
        </div>

        {cartingEnabled && (
          <div className="grid grid-cols-12 gap-3 pt-2 border-t border-border/50">
            <LineField label="Carting Amount (₹ Lump Sum)" className="col-span-12 md:col-span-4">
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                placeholder="1500"
                value={cartingAmount}
                onChange={(e) => setCartingAmount(e.target.value)}
              />
            </LineField>
            <LineField
              label="Site Location / Route (Optional)"
              className="col-span-12 md:col-span-8"
            >
              <Input
                placeholder="e.g. Delivery via tempo to customer site"
                value={cartingLocation}
                onChange={(e) => setCartingLocation(e.target.value)}
              />
            </LineField>
          </div>
        )}
      </div>

      {/* Discount */}
      <div className="flex flex-wrap items-center gap-3 rounded-sm border border-border bg-background p-3">
        <Checkbox checked={discountApply} onCheckedChange={(v) => setDiscountApply(!!v)} />
        <span className="text-sm">
          Apply 7.5% discount if total wall area exceeds {DISCOUNT_SQFT_THRESHOLD} sqft
        </span>
        <span className="text-xs text-muted-foreground">
          {discountApply
            ? discountEligible
              ? `Eligible (${totalWallSqft.toFixed(0)} sqft) — ${formatInr(discountAmount)} off`
              : `Not eligible yet — only ${totalWallSqft.toFixed(0)} sqft`
            : "Skipped"}
        </span>
      </div>

      {/* Time to complete */}
      <Field label="Time to complete" hint="Entered manually — not calculated">
        <Input
          value={timeToComplete}
          onChange={(e) => setTimeToComplete(e.target.value)}
          placeholder="e.g. 7–10 working days"
        />
      </Field>

      {/* Totals */}
      <div className="ml-auto max-w-xs space-y-1 rounded-sm border border-border bg-muted/20 p-3 text-sm">
        <div className="flex justify-between">
          <span>Material</span>
          <span className="tabular-nums">{formatInr(effectiveMaterialAmount)}</span>
        </div>
        <div className="flex justify-between">
          <span>Installation</span>
          <span className="tabular-nums">
            {includeInstallation ? formatInr(effectiveInstallationAmount) : "₹0 (Excluded)"}
          </span>
        </div>
        <div className="flex justify-between border-t border-border pt-1">
          <span>Subtotal</span>
          <span className="tabular-nums">{formatInr(subtotal)}</span>
        </div>
        {discountApply && discountEligible && (
          <div className="flex justify-between text-emerald-700">
            <span>Discount ({DISCOUNT_PCT}%)</span>
            <span className="tabular-nums">-{formatInr(discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-border pt-1 font-semibold">
          <span>Total Estimate</span>
          <span className="tabular-nums">{formatInr(total)}</span>
        </div>
      </div>

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
              These line items will be created in the quotation. You can change values above, or
              customize them line-by-line.
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
            Enter wall dimensions and product details above to generate quote line items.
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
          <span>Quote Subtotal ({items.length} items)</span>
          <span className="text-base font-bold text-slate-900 dark:text-slate-100 tabular-nums">
            {formatInr(subtotal)}
          </span>
        </div>
      </div>

      {/* WhatsApp / PDF */}
      <div className="space-y-3 rounded-sm border border-border bg-background p-4">
        <label className="text-sm font-medium">Send estimate</label>
        <div className="grid grid-cols-12 gap-2">
          <LineField label="Greeting name" className="col-span-6 md:col-span-3">
            <Input
              value={greetingName}
              onChange={(e) => setGreetingName(e.target.value)}
              placeholder="Mr./Ms. Sharma"
            />
          </LineField>
          <LineField label="Customer WhatsApp number" className="col-span-6 md:col-span-3">
            <Input
              value={customerMobile}
              onChange={(e) => setCustomerMobile(e.target.value)}
              placeholder="10-digit mobile"
            />
          </LineField>
          <LineField label="Your name" className="col-span-6 md:col-span-2">
            <Input value={preparerName} onChange={(e) => setPreparerName(e.target.value)} />
          </LineField>
          <LineField label="Estimated delivery date" className="col-span-6 md:col-span-2">
            <Input
              value={estimatedDeliveryDate}
              onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
              placeholder="e.g. 15th June"
            />
          </LineField>
          <LineField label="Valid for (days)" className="col-span-6 md:col-span-2">
            <Input
              type="number"
              min="0"
              value={validityDays}
              onChange={(e) => setValidityDays(e.target.value)}
            />
          </LineField>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleGenerateAndSend}
          disabled={sending || items.length === 0}
        >
          {sending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="mr-2 h-4 w-4" />
          )}
          Generate PDF &amp; open WhatsApp
        </Button>
        <p className="text-xs text-muted-foreground">
          <MessageCircle className="mr-1 inline h-3 w-3" />
          Opens a print tab (use "Save as PDF") and a WhatsApp chat with the message pre-filled —
          attach the saved PDF yourself and hit send. No WhatsApp Business API is connected, so
          nothing sends automatically.
        </p>
      </div>
    </div>
  );
}

function LineField({
  label,
  className,
  children,
}: {
  label: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

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
import { Plus, Trash2, ImagePlus, FileDown, MessageCircle, Loader2, X } from "lucide-react";
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
import type { QuoteItemInput } from "@/lib/quotes/schema";

function rid(): string {
  return Math.random().toString(36).slice(2);
}

type WallForm = { id: string; name: string; height: string; length: string };
type ProductForm = {
  id: string;
  wallId: string;
  materialCategory: string;
  productName: string;
  priceUnit: "sqft" | "unit";
  pricePerUnit: string;
  manualQty: string; // used only when priceUnit === "unit"
  imageDataUrl: string | null;
};
type AdhesiveForm = { key: string; selected: boolean; pricePerUnit: string };
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
  onResult,
}: {
  projectId: string | null;
  onResult: (result: EstimateStudioResult | null) => void;
}) {
  const [unit, setUnit] = useState<LengthUnit>("in");
  const [walls, setWalls] = useState<WallForm[]>([
    { id: rid(), name: "Wall 1", height: "", length: "" },
  ]);
  const [products, setProducts] = useState<ProductForm[]>([]);
  const [labourRate, setLabourRate] = useState("80");
  const [adhesives, setAdhesives] = useState<AdhesiveForm[]>(
    ADHESIVE_CATALOG.map((a) => ({
      key: a.key,
      selected: false,
      pricePerUnit: String(a.defaultPricePerUnit),
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
  const [sealerPrice, setSealerPrice] = useState<string>("");
  const [sealerAppRate, setSealerAppRate] = useState(
    String(DEFAULT_SEALER_APPLICATION_RATE_PER_SQFT),
  );
  const [discountApply, setDiscountApply] = useState(false);
  const [timeToComplete, setTimeToComplete] = useState("");

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
          setCustomerMobile(
            customer.primary_phone ?? "",
          );
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
      walls.map((w) => ({
        id: w.id,
        name: w.name.trim() || "Wall",
        height: Number(w.height) || 0,
        length: Number(w.length) || 0,
        unit,
        sqft: wallSqft(Number(w.height) || 0, Number(w.length) || 0, unit),
      })),
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
        const qty =
          p.priceUnit === "sqft"
            ? materialQuantityToOrder(wall?.sqft ?? 0)
            : Number(p.manualQty) || 0;
        return {
          id: p.id,
          wallId: p.wallId,
          materialCategory: p.materialCategory,
          productName: p.productName.trim(),
          priceUnit: p.priceUnit,
          pricePerUnit: price,
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

  const labourAmount = useMemo(
    () => (Number(labourRate) || 0) * totalWallSqft,
    [labourRate, totalWallSqft],
  );

  const adhesiveLines: EstimateAdhesiveLine[] = useMemo(() => {
    const lines: EstimateAdhesiveLine[] = [];
    for (const a of adhesives) {
      if (!a.selected) continue;
      const cat = ADHESIVE_CATALOG.find((c) => c.key === a.key);
      if (!cat) continue;
      const units = ceilWhole(totalWallSqft / cat.coverageSqftPerUnit);
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
  }, [adhesives, otherAdhesive, totalWallSqft]);

  const adhesivesAmount = useMemo(
    () => adhesiveLines.reduce((sum, l) => sum + l.amount, 0),
    [adhesiveLines],
  );

  const sealerComputed: EstimateSealer | null = useMemo(() => {
    if (sealerKey === "none") return null;
    const cat = SEALER_CATALOG.find((s) => s.key === sealerKey);
    if (!cat) return null;
    const bottles = ceilWhole(totalWallSqft / cat.coverageSqftPerLtr);
    const price = Number(sealerPrice) || 0;
    return { key: cat.key, label: cat.label, bottles, pricePerLtr: price, amount: bottles * price };
  }, [sealerKey, sealerPrice, totalWallSqft]);

  const sealerLabourAmount = useMemo(
    () => (Number(sealerAppRate) || 0) * totalWallSqft,
    [sealerAppRate, totalWallSqft],
  );

  const installationAmount =
    labourAmount + adhesivesAmount + (sealerComputed?.amount ?? 0) + sealerLabourAmount;
  const subtotal = materialAmount + installationAmount;
  const discountEligible = totalWallSqft > DISCOUNT_SQFT_THRESHOLD;
  const discountAmount = discountApply && discountEligible ? (subtotal * DISCOUNT_PCT) / 100 : 0;
  const total = subtotal - discountAmount;

  const worksheet: EstimateWorksheet = useMemo(
    () => ({
      version: 1,
      unit,
      walls: wallsComputed,
      products: productsComputed.map((p) => ({ ...p, imageDataUrl: undefined })),
      installation: {
        labour: { ratePerSqft: Number(labourRate) || 0, amount: labourAmount },
        adhesives: adhesiveLines,
        sealer: sealerComputed,
        sealerLabour: { ratePerSqft: Number(sealerAppRate) || 0, amount: sealerLabourAmount },
      },
      discount: {
        applied: discountApply,
        eligible: discountEligible,
        pct: DISCOUNT_PCT,
        amount: discountAmount,
      },
      timeToComplete: timeToComplete || undefined,
      totalWallSqft,
      materialAmount,
      installationAmount,
      subtotal,
      total,
    }),
    [
      unit,
      wallsComputed,
      productsComputed,
      labourRate,
      labourAmount,
      adhesiveLines,
      sealerComputed,
      sealerAppRate,
      sealerLabourAmount,
      discountApply,
      discountEligible,
      discountAmount,
      timeToComplete,
      totalWallSqft,
      materialAmount,
      installationAmount,
      subtotal,
      total,
    ],
  );

  const items: QuoteItemInput[] = useMemo(() => {
    const out: QuoteItemInput[] = [];
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
      });
    }
    if (labourAmount > 0) {
      out.push({
        product_id: null,
        description: "Installation Labour",
        quantity: totalWallSqft,
        unit: "sqft",
        unit_price: Number(labourRate) || 0,
        tax_pct: 0,
        fulfilment: null,
      });
    }
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
    if (sealerComputed && sealerComputed.bottles > 0) {
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
    if (sealerLabourAmount > 0) {
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
    return out;
  }, [
    productsComputed,
    wallsComputed,
    labourAmount,
    labourRate,
    adhesiveLines,
    sealerComputed,
    sealerLabourAmount,
    sealerAppRate,
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
          return `${p.quantityToOrder} ${p.priceUnit === "sqft" ? "sqft" : "unit(s)"}${wallName ? ` (${wallName})` : ""}`;
        })
        .join("; ");
      const wallSizeSummary = wallsComputed
        .map(
          (w) => `${w.name}: ${w.height}${unit} x ${w.length}${unit} (${w.sqft.toFixed(1)} sqft)`,
        )
        .join("; ");

      const message = buildEstimateWhatsappMessage(
        {
          greetingName: greetingName.trim() || "there",
          wallSizeSummary: wallSizeSummary || "—",
          materialSummary: materialSummary || "—",
          materialToOrderSummary: materialToOrderSummary || "—",
          materialAmount,
          installationLabourAmount: labourAmount,
          adhesivesAmount,
          sealerAmount: sealerComputed?.amount ?? 0,
          sealerApplicationAmount: sealerLabourAmount,
          totalEstimate: total,
          estimatedDeliveryDate: estimatedDeliveryDate || undefined,
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
                <LineField label="Sq ft" className="col-span-8 md:col-span-3">
                  <div className="flex h-9 items-center rounded-sm border border-border bg-muted/30 px-3 text-sm font-medium tabular-nums">
                    {sqft > 0 ? sqft.toFixed(2) : "—"}
                  </div>
                </LineField>
                <div className="col-span-4 md:col-span-1 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
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
                      onClick={() => removeProduct(p.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-12 gap-2">
                  <LineField label="Price basis" className="col-span-6 md:col-span-2">
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
                  <LineField label="Price (₹)" className="col-span-6 md:col-span-2">
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      value={p.pricePerUnit}
                      onChange={(e) => updateProduct(p.id, { pricePerUnit: e.target.value })}
                    />
                  </LineField>
                  {p.priceUnit === "unit" && (
                    <LineField label="Quantity (units)" className="col-span-6 md:col-span-2">
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
                    <LineField
                      label="Qty to order (auto, +10%)"
                      className="col-span-6 md:col-span-3"
                    >
                      <div className="flex h-9 items-center rounded-sm border border-border bg-muted/30 px-3 text-sm font-medium tabular-nums">
                        {(computed?.quantityToOrder ?? 0).toFixed(0)} sqft
                      </div>
                    </LineField>
                  )}
                  <LineField label="Amount" className="col-span-6 md:col-span-3">
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
        <label className="text-sm font-medium">Installation</label>

        <div className="grid grid-cols-12 items-end gap-2">
          <LineField label="Labour Charges — rate (₹/sqft)" className="col-span-6 md:col-span-3">
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              value={labourRate}
              onChange={(e) => setLabourRate(e.target.value)}
            />
          </LineField>
          <LineField label="Labour amount" className="col-span-6 md:col-span-3">
            <div className="flex h-9 items-center rounded-sm border border-border bg-muted/30 px-3 text-sm font-medium tabular-nums">
              {formatInr(labourAmount)}
            </div>
          </LineField>
        </div>

        <div>
          <div className="mb-1.5 text-xs font-medium text-muted-foreground">
            Adhesives (select all that apply)
          </div>
          <div className="space-y-1.5">
            {ADHESIVE_CATALOG.map((cat) => {
              const a = adhesives.find((x) => x.key === cat.key)!;
              const line = adhesiveLines.find((l) => l.key === cat.key);
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
                          prev.map((x) => (x.key === cat.key ? { ...x, selected: !!v } : x)),
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
                  <LineField label={`Price / ${cat.unit} (₹)`} className="col-span-6 md:col-span-3">
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      disabled={!a.selected}
                      value={a.pricePerUnit}
                      onChange={(e) =>
                        setAdhesives((prev) =>
                          prev.map((x) =>
                            x.key === cat.key ? { ...x, pricePerUnit: e.target.value } : x,
                          ),
                        )
                      }
                    />
                  </LineField>
                  <LineField label={`${cat.unit}s (auto)`} className="col-span-3 md:col-span-2">
                    <div className="flex h-9 items-center rounded-sm border border-border bg-muted/30 px-2 text-sm tabular-nums">
                      {a.selected ? (line?.units ?? 0) : "—"}
                    </div>
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
                  onCheckedChange={(v) => setOtherAdhesive((prev) => ({ ...prev, enabled: !!v }))}
                />
                <Input
                  placeholder="Other adhesive — name"
                  className="h-8"
                  disabled={!otherAdhesive.enabled}
                  value={otherAdhesive.name}
                  onChange={(e) => setOtherAdhesive((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <LineField label="Unit" className="col-span-3 md:col-span-2">
                <Input
                  className="h-8"
                  disabled={!otherAdhesive.enabled}
                  value={otherAdhesive.unitLabel}
                  onChange={(e) =>
                    setOtherAdhesive((prev) => ({ ...prev, unitLabel: e.target.value }))
                  }
                />
              </LineField>
              <LineField label="Qty" className="col-span-3 md:col-span-1">
                <Input
                  className="h-8"
                  type="number"
                  min="0"
                  disabled={!otherAdhesive.enabled}
                  value={otherAdhesive.units}
                  onChange={(e) => setOtherAdhesive((prev) => ({ ...prev, units: e.target.value }))}
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
          <LineField label="Bottles (auto)" className="col-span-4 md:col-span-2">
            <div className="flex h-9 items-center rounded-sm border border-border bg-muted/30 px-2 text-sm tabular-nums">
              {sealerKey !== "none" ? (sealerComputed?.bottles ?? 0) : "—"}
            </div>
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
              {formatInr(sealerLabourAmount)}
            </div>
          </LineField>
        </div>

        <div className="text-right text-sm">
          Installation total: <span className="font-semibold">{formatInr(installationAmount)}</span>
        </div>
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
          <span className="tabular-nums">{formatInr(materialAmount)}</span>
        </div>
        <div className="flex justify-between">
          <span>Installation</span>
          <span className="tabular-nums">{formatInr(installationAmount)}</span>
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
  label: string;
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

import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  Check,
  Ruler,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sparkles,
  PackageCheck,
  ShieldCheck,
  Wrench,
  Hammer,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type LengthUnit,
  LENGTH_UNITS,
  LENGTH_UNIT_LABELS,
  wallSqft,
  ceilWhole,
} from "@/lib/quotes/estimateCatalog";
import {
  type EstimateWall,
  type EstimateProduct,
  type EstimateWorksheet,
} from "@/lib/quotes/estimateSchema";
import {
  addQuoteItem,
  getQuoteItems,
  deleteQuoteItem,
  updateQuoteItem,
  reorderQuoteItems,
  updateQuote,
  type QuoteItemRow,
} from "@/lib/quotes/api";
import {
  sortQuoteItemsCategorically,
  calculateConsumableUpdates,
  categorizeQuoteItem,
  QUOTE_ITEM_CATEGORY_LABELS,
  QUOTE_ITEM_CATEGORY_BADGE_CLASSES,
} from "@/lib/quotes/quoteCategories";
import { CatalogProductSelect } from "@/components/quotes/CatalogProductSelect";
import { type CatalogItem } from "@/lib/quotes/catalog";
import { invalidateQuote } from "@/lib/query-invalidation";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { formatInr } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface QuoteWallDetailsEditorProps {
  quoteId: string;
  wallEstimate: unknown;
  existingItems: QuoteItemRow[];
  saleMode?: string;
  defaultFulfilment?: string | null;
}

export function QuoteWallDetailsEditor({
  quoteId,
  wallEstimate,
  existingItems,
  saleMode = "invoiced",
  defaultFulfilment,
}: QuoteWallDetailsEditorProps) {
  const qc = useQueryClient();
  const [collapsed, setCollapsed] = useState(false);
  const [addWallOpen, setAddWallOpen] = useState(false);
  const [editingWall, setEditingWall] = useState<EstimateWall | null>(null);

  // Parse existing worksheet
  const worksheet = useMemo<EstimateWorksheet>(() => {
    if (wallEstimate && typeof wallEstimate === "object") {
      const we = wallEstimate as Record<string, unknown>;
      const walls: EstimateWall[] = Array.isArray(we.walls) ? (we.walls as EstimateWall[]) : [];
      const products: EstimateProduct[] = Array.isArray(we.products)
        ? (we.products as EstimateProduct[])
        : [];
      return {
        version: 1,
        unit: (we.unit as LengthUnit) || "ft",
        walls,
        products,
        installation: (we.installation as EstimateWorksheet["installation"]) || {
          labour: { ratePerSqft: 0, amount: 0 },
          adhesives: [],
          sealer: null,
          sealerLabour: { ratePerSqft: 0, amount: 0 },
        },
        discount: (we.discount as EstimateWorksheet["discount"]) || {
          applied: false,
          eligible: false,
          pct: 0,
          amount: 0,
        },
        totalWallSqft: Number(we.totalWallSqft) || walls.reduce((sum, w) => sum + (w.sqft || 0), 0),
        materialAmount: Number(we.materialAmount) || 0,
        installationAmount: Number(we.installationAmount) || 0,
        subtotal: Number(we.subtotal) || 0,
        total: Number(we.total) || 0,
      };
    }
    return {
      version: 1,
      unit: "ft",
      walls: [],
      products: [],
      installation: {
        labour: { ratePerSqft: 0, amount: 0 },
        adhesives: [],
        sealer: null,
        sealerLabour: { ratePerSqft: 0, amount: 0 },
      },
      discount: { applied: false, eligible: false, pct: 0, amount: 0 },
      totalWallSqft: 0,
      materialAmount: 0,
      installationAmount: 0,
      subtotal: 0,
      total: 0,
    };
  }, [wallEstimate]);

  const walls = worksheet.walls;
  const products = worksheet.products;

  // Total sqft across all walls
  const totalArea = useMemo(() => {
    return Math.round(walls.reduce((acc, w) => acc + (Number(w.sqft) || 0), 0) * 100) / 100;
  }, [walls]);

  // Live calculation of consumable and installation updates based on current walls
  const liveConsumables = useMemo(() => {
    return calculateConsumableUpdates(walls, products, existingItems, worksheet);
  }, [walls, products, existingItems, worksheet]);

  // Check which consumables exist in the current quote items
  const hasLabourItem = useMemo(
    () => existingItems.some((it) => categorizeQuoteItem(it) === "installation_labour"),
    [existingItems],
  );
  const hasAdhesiveItem = useMemo(
    () => existingItems.some((it) => categorizeQuoteItem(it) === "adhesive"),
    [existingItems],
  );
  const hasSealerItem = useMemo(
    () => existingItems.some((it) => categorizeQuoteItem(it) === "sealer"),
    [existingItems],
  );
  const hasSealerLabourItem = useMemo(
    () => existingItems.some((it) => categorizeQuoteItem(it) === "sealer_labour"),
    [existingItems],
  );

  // Form state for adding a new wall
  const [newWallName, setNewWallName] = useState("");
  const [newWallUnit, setNewWallUnit] = useState<LengthUnit>("ft");
  const [newWallHeight, setNewWallHeight] = useState("");
  const [newWallLength, setNewWallLength] = useState("");
  const [newWallSqftOverride, setNewWallSqftOverride] = useState("");
  const [selectedCatalogProduct, setSelectedCatalogProduct] = useState<CatalogItem | null>(null);
  const [productRate, setProductRate] = useState("");
  const [wastagePct, setWastagePct] = useState("5");

  // Calculated area in sq.ft
  const calcNewWallSqft = useMemo(() => {
    const h = Number(newWallHeight) || 0;
    const l = Number(newWallLength) || 0;
    if (newWallSqftOverride && !isNaN(Number(newWallSqftOverride))) {
      return Number(newWallSqftOverride);
    }
    return wallSqft(h, l, newWallUnit);
  }, [newWallHeight, newWallLength, newWallUnit, newWallSqftOverride]);

  // Calculated quantity with wastage
  const calcQtyToOrder = useMemo(() => {
    const waste = Number(wastagePct) || 0;
    const gross = calcNewWallSqft * (1 + waste / 100);
    return ceilWhole(gross);
  }, [calcNewWallSqft, wastagePct]);

  // Open modal with prefilled defaults
  const handleOpenAddWall = () => {
    const nextIdx = walls.length + 1;
    setNewWallName(`Wall ${nextIdx}`);
    setNewWallUnit(worksheet.unit || "ft");
    setNewWallHeight("10");
    setNewWallLength("12");
    setNewWallSqftOverride("");
    setSelectedCatalogProduct(null);
    setProductRate("");
    setWastagePct("5");
    setAddWallOpen(true);
  };

  // Helper to sync and invalidate
  const invalidateAll = () => {
    invalidateQuote(qc, quoteId);
    qc.invalidateQueries({ queryKey: qk.quotes.items(quoteId) });
  };

  // Add Wall Mutation
  const addWallMut = useMutation({
    mutationFn: async () => {
      const finalSqft = Math.round(calcNewWallSqft * 100) / 100;
      if (finalSqft <= 0) {
        throw new Error("Wall area must be greater than 0 sq.ft");
      }
      if (!newWallName.trim()) {
        throw new Error("Wall name is required");
      }

      const wallId = `wall_${Date.now()}`;
      const newWall: EstimateWall = {
        id: wallId,
        name: newWallName.trim(),
        height: Number(newWallHeight) || 0,
        length: Number(newWallLength) || 0,
        unit: newWallUnit,
        sqft: finalSqft,
      };

      const updatedWalls = [...walls, newWall];
      const updatedProducts = [...products];

      // If stone product selected, build product and quote line item
      let insertedLineItemId: string | null = null;
      if (selectedCatalogProduct) {
        const rate = Number(productRate) || selectedCatalogProduct.defaultPrice || 0;
        const qty = calcQtyToOrder > 0 ? calcQtyToOrder : finalSqft;
        const prodId = `prod_${Date.now()}`;

        const newProd: EstimateProduct = {
          id: prodId,
          wallId,
          materialCategory: "stone_wall_cladding",
          productName: selectedCatalogProduct.name,
          priceUnit: "sqft",
          pricePerUnit: rate,
          wastagePct: Number(wastagePct) || 5,
          quantityToOrder: qty,
          amount: qty * rate,
          imageDataUrl: selectedCatalogProduct.image || null,
        };
        updatedProducts.push(newProd);

        // Add quote item to database
        const desc = `${selectedCatalogProduct.name} (${newWall.name})`;
        const codeText = selectedCatalogProduct.code
          ? `Catalog Code: ${selectedCatalogProduct.code}`
          : "";
        const dimText = `Wall: ${newWall.name} · ${newWall.height}×${newWall.length} ${newWall.unit} (${finalSqft} sq.ft) · Wastage: ${wastagePct}%`;
        const combinedNotes = codeText ? `${dimText}\n${codeText}` : dimText;

        const newItem = await addQuoteItem(quoteId, {
          description: desc,
          quantity: qty,
          unit: "sq.ft",
          unit_price: rate,
          tax_pct: saleMode === "cash" ? 0 : 0,
          hsn_sac: selectedCatalogProduct.hsnCode || "68022190",
          notes: combinedNotes,
          fulfilment: defaultFulfilment,
        });

        insertedLineItemId = newItem.id;
      }

      // Fetch fresh items including the newly inserted item
      const currentItems = await getQuoteItems(quoteId);

      // Recalculate all consumables and installation quantities (labour, chemicals, PU, sealers)
      const consumableUpdates = calculateConsumableUpdates(
        updatedWalls,
        updatedProducts,
        currentItems,
        worksheet,
      );

      // Apply patches to existing quote items (e.g. increase labour sqft, adhesive bags, PU buckets, sealers)
      for (const patch of consumableUpdates.itemPatches) {
        if (patch.id !== insertedLineItemId) {
          await updateQuoteItem(patch.id, { quantity: patch.newQuantity });
        }
      }

      // Save updated worksheet to quotes.wall_estimate
      await updateQuote(quoteId, {
        wall_estimate: consumableUpdates.updatedWorksheet as unknown as Record<string, unknown>,
      });

      // Refetch items to get updated quantities and sort categorically
      const finalItems = await getQuoteItems(quoteId);
      const sortedItems = sortQuoteItemsCategorically(finalItems);
      await reorderQuoteItems(sortedItems.map((it) => it.id));

      return {
        wallName: newWall.name,
        hasProduct: Boolean(insertedLineItemId),
        newLabour: consumableUpdates.summary.labourSqft,
        newBags: consumableUpdates.summary.cementAdhesiveBags,
        newBottles: consumableUpdates.summary.sealerBottles,
        patchesApplied: consumableUpdates.itemPatches.length,
      };
    },
    onSuccess: ({ wallName, hasProduct, newLabour, newBags, patchesApplied }) => {
      invalidateAll();
      setAddWallOpen(false);
      if (hasProduct) {
        toast.success(
          `${wallName} added! Stone product placed at top, and updated labour (${newLabour} sq.ft) & adhesives (${newBags} bags).`,
        );
      } else {
        toast.success(
          `${wallName} added! Recalculated labour (${newLabour} sq.ft) & adhesives (${newBags} bags).`,
        );
      }
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  // Edit Wall Mutation (updates wall dimensions, linked products, and recalculates consumables)
  const editWallMut = useMutation({
    mutationFn: async (updatedWall: EstimateWall) => {
      const updatedWalls = walls.map((w) => (w.id === updatedWall.id ? updatedWall : w));
      const currentItems = await getQuoteItems(quoteId);

      const consumableUpdates = calculateConsumableUpdates(
        updatedWalls,
        products,
        currentItems,
        worksheet,
      );

      // Apply patches (e.g. decreasing or increasing product qty, labour, adhesive bags, PU buckets, sealers)
      for (const patch of consumableUpdates.itemPatches) {
        await updateQuoteItem(patch.id, { quantity: patch.newQuantity });
      }

      // Save updated worksheet
      await updateQuote(quoteId, {
        wall_estimate: consumableUpdates.updatedWorksheet as unknown as Record<string, unknown>,
      });

      // Re-sort categorically
      const finalItems = await getQuoteItems(quoteId);
      const sorted = sortQuoteItemsCategorically(finalItems);
      await reorderQuoteItems(sorted.map((it) => it.id));

      return {
        wallName: updatedWall.name,
        totalSqft: consumableUpdates.totalWallSqft,
        newBags: consumableUpdates.summary.cementAdhesiveBags,
        newBottles: consumableUpdates.summary.sealerBottles,
        patchesCount: consumableUpdates.itemPatches.length,
      };
    },
    onSuccess: ({ wallName, totalSqft, newBags, patchesCount }) => {
      invalidateAll();
      setEditingWall(null);
      toast.success(
        `${wallName} updated! Total area: ${totalSqft} sq.ft. Adjusted ${patchesCount} item(s) (Labour: ${totalSqft} sq.ft, Adhesives: ${newBags} bags).`,
      );
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  // Delete Wall Mutation
  const deleteWallMut = useMutation({
    mutationFn: async (wallId: string) => {
      const wallToDelete = walls.find((w) => w.id === wallId);
      const updatedWalls = walls.filter((w) => w.id !== wallId);
      const updatedProducts = products.filter((p) => p.wallId !== wallId);

      // Check if any quote item matches this wall specifically
      const currentItems = await getQuoteItems(quoteId);
      if (wallToDelete) {
        const wn = wallToDelete.name.toLowerCase();
        const itemToDelete = currentItems.find((it) => {
          const d = (it.description || "").toLowerCase();
          const n = (it.notes || "").toLowerCase();
          return d.includes(`(${wn})`) || n.includes(`wall: ${wn}`);
        });
        if (itemToDelete) {
          await deleteQuoteItem(itemToDelete.id);
        }
      }

      const remainingItems = await getQuoteItems(quoteId);
      const consumableUpdates = calculateConsumableUpdates(
        updatedWalls,
        updatedProducts,
        remainingItems,
        worksheet,
      );

      // Apply patches to scale down remaining labour and consumables
      for (const patch of consumableUpdates.itemPatches) {
        await updateQuoteItem(patch.id, { quantity: patch.newQuantity });
      }

      await updateQuote(quoteId, {
        wall_estimate: consumableUpdates.updatedWorksheet as unknown as Record<string, unknown>,
      });

      const finalItems = await getQuoteItems(quoteId);
      const sorted = sortQuoteItemsCategorically(finalItems);
      await reorderQuoteItems(sorted.map((it) => it.id));

      return {
        wallName: wallToDelete?.name || "Wall",
        remainingSqft: consumableUpdates.totalWallSqft,
        newBags: consumableUpdates.summary.cementAdhesiveBags,
      };
    },
    onSuccess: ({ wallName, remainingSqft, newBags }) => {
      invalidateAll();
      toast.success(
        `${wallName} removed. Adjusted remaining labour (${remainingSqft} sq.ft) & adhesives (${newBags} bags).`,
      );
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  // Sync / Recalculate Quantities Mutation
  const syncEstimatorMut = useMutation({
    mutationFn: async () => {
      const currentItems = await getQuoteItems(quoteId);
      const consumableUpdates = calculateConsumableUpdates(
        walls,
        products,
        currentItems,
        worksheet,
      );

      for (const patch of consumableUpdates.itemPatches) {
        await updateQuoteItem(patch.id, { quantity: patch.newQuantity });
      }

      await updateQuote(quoteId, {
        wall_estimate: consumableUpdates.updatedWorksheet as unknown as Record<string, unknown>,
      });

      const finalItems = await getQuoteItems(quoteId);
      const sorted = sortQuoteItemsCategorically(finalItems);
      await reorderQuoteItems(sorted.map((it) => it.id));

      return {
        count: consumableUpdates.itemPatches.length,
        summary: consumableUpdates.summary,
      };
    },
    onSuccess: ({ count, summary }) => {
      invalidateAll();
      toast.success(
        `Synced & organized! Updated ${count} items: Labour (${summary.labourSqft} sq.ft), Adhesives (${summary.cementAdhesiveBags} bags), Sealer (${summary.sealerBottles} btl).`,
      );
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  // Add Missing Installation & Consumables Lines Mutation
  const addMissingConsumablesMut = useMutation({
    mutationFn: async () => {
      const currentItems = await getQuoteItems(quoteId);
      const updates = calculateConsumableUpdates(walls, products, currentItems, worksheet);

      // 1. Add Labour if missing
      if (!hasLabourItem && updates.summary.labourSqft > 0) {
        await addQuoteItem(quoteId, {
          description: "Installation Labour",
          quantity: updates.summary.labourSqft,
          unit: "sq.ft",
          unit_price: 80,
          tax_pct: saleMode === "cash" ? 0 : 0,
          hsn_sac: "9954",
          notes: "Installation, alignment, scaffolding, and mortar/adhesive fixing",
          fulfilment: defaultFulfilment,
        });
      }

      // 2. Add Cementitious Adhesive if missing
      if (!hasAdhesiveItem && updates.summary.cementAdhesiveBags > 0) {
        await addQuoteItem(quoteId, {
          description: "Adhesive — Standard Cementitious Stone Adhesive Grey",
          quantity: updates.summary.cementAdhesiveBags,
          unit: "bag",
          unit_price: 800,
          tax_pct: saleMode === "cash" ? 0 : 0,
          hsn_sac: "3506",
          notes: "Polymer-modified cementitious tile & stone adhesive (25 sq.ft coverage/bag)",
          fulfilment: defaultFulfilment,
        });
      }

      // 3. Add Sealer Chemical if missing
      if (!hasSealerItem && updates.summary.sealerBottles > 0) {
        await addQuoteItem(quoteId, {
          description: "Sealer Chemical — Water Based Water Repellent",
          quantity: updates.summary.sealerBottles,
          unit: "ltr",
          unit_price: 1700,
          tax_pct: saleMode === "cash" ? 0 : 0,
          hsn_sac: "3208",
          notes: "Silicone deep-penetrating water repellent sealer (550 sq.ft coverage/ltr)",
          fulfilment: defaultFulfilment,
        });
      }

      // 4. Add Sealer Labour if missing
      if (!hasSealerLabourItem && updates.summary.sealerLabourSqft > 0) {
        await addQuoteItem(quoteId, {
          description: "Sealer Application Labour",
          quantity: updates.summary.sealerLabourSqft,
          unit: "sq.ft",
          unit_price: 10,
          tax_pct: saleMode === "cash" ? 0 : 0,
          hsn_sac: "9954",
          notes: "Surface dust cleaning, dry wipe, and dual-coat sealer application",
          fulfilment: defaultFulfilment,
        });
      }

      // Re-fetch all and sort categorically
      const finalItems = await getQuoteItems(quoteId);
      const sorted = sortQuoteItemsCategorically(finalItems);
      await reorderQuoteItems(sorted.map((it) => it.id));
    },
    onSuccess: () => {
      invalidateAll();
      toast.success(
        "Added installation labour, adhesives, and sealers in standard category order!",
      );
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  return (
    <>
      <Card className="mb-4 shadow-1 border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3 px-4 bg-slate-50/70 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-teal-50 border border-teal-200 text-teal-800">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-xs sm:text-sm font-semibold flex items-center gap-2">
                <span>Wall Details & Estimator</span>
                <Badge
                  variant="outline"
                  className="text-[10px] font-normal border-teal-200 bg-teal-50 text-teal-900"
                >
                  {walls.length} {walls.length === 1 ? "Wall" : "Walls"} Defined
                </Badge>
                {totalArea > 0 && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200"
                  >
                    Total: {totalArea.toFixed(1)} sq.ft
                  </Badge>
                )}
              </CardTitle>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                Auto-calculates product sq.ft, installation labour, adhesives & sealer chemicals.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenAddWall}
              className="h-8 border-teal-300 bg-teal-50 text-teal-900 hover:bg-teal-100 hover:text-teal-950 text-xs font-semibold cursor-pointer shadow-2xs"
            >
              <Plus className="mr-1 h-3.5 w-3.5 text-teal-700" />
              Add New Wall
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCollapsed((v) => !v)}
              className="h-8 w-8 p-0 text-muted-foreground"
              title={collapsed ? "Expand wall details" : "Collapse wall details"}
            >
              {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>

        {!collapsed && (
          <CardContent className="p-3 sm:p-4 space-y-4">
            {walls.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center rounded-lg border border-dashed border-border bg-muted/10">
                <Ruler className="h-8 w-8 text-muted-foreground/60 mb-2" />
                <h4 className="text-xs sm:text-sm font-semibold text-foreground">
                  No walls defined yet
                </h4>
                <p className="text-xs text-muted-foreground max-w-md mt-1 mb-3">
                  Add Wall 1, Wall 2, etc. to calculate precise surface areas and automatically
                  determine stone cladding, chemical bags, and installation labour.
                </p>
                <Button
                  size="sm"
                  onClick={handleOpenAddWall}
                  className="h-8 text-xs bg-teal-700 hover:bg-teal-800 text-white"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> + Add Wall 1
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {walls.map((w, idx) => {
                  const assignedProduct = products.find((p) => p.wallId === w.id);
                  return (
                    <div
                      key={w.id}
                      className="rounded-lg border border-border/80 bg-white p-3 shadow-2xs flex flex-col justify-between hover:border-teal-300 transition-all"
                    >
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b border-border/40">
                          <div className="flex items-center gap-1.5">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-100 text-teal-900 text-[10px] font-bold">
                              {idx + 1}
                            </span>
                            <span className="font-semibold text-xs text-foreground truncate">
                              {w.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => setEditingWall(w)}
                              title="Edit wall dimensions (increases/decreases quantities)"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => {
                                if (confirm(`Remove ${w.name}?`)) {
                                  deleteWallMut.mutate(w.id);
                                }
                              }}
                              disabled={deleteWallMut.isPending}
                              title="Delete wall"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded bg-slate-50 p-2 border border-slate-100">
                            <span className="text-[10px] uppercase text-muted-foreground block font-medium">
                              Dimensions
                            </span>
                            <span className="font-semibold text-slate-800">
                              {w.height} × {w.length} {w.unit}
                            </span>
                          </div>
                          <div className="rounded bg-teal-50/60 p-2 border border-teal-100">
                            <span className="text-[10px] uppercase text-teal-800 block font-medium">
                              Surface Area
                            </span>
                            <span className="font-bold text-teal-900 text-xs">
                              {Number(w.sqft).toFixed(1)} sq.ft
                            </span>
                          </div>
                        </div>

                        {assignedProduct && (
                          <div className="mt-2.5 pt-2 border-t border-border/40 text-[11px]">
                            <span className="text-[10px] uppercase text-muted-foreground block font-medium">
                              Cladding Product
                            </span>
                            <span className="font-medium text-foreground line-clamp-1">
                              {assignedProduct.productName}
                            </span>
                            <div className="flex items-center justify-between text-muted-foreground text-[10px] mt-0.5">
                              <span>Qty: {assignedProduct.quantityToOrder} sq.ft</span>
                              <span className="font-semibold text-emerald-700">
                                ₹{assignedProduct.pricePerUnit}/sq.ft
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Estimator Consumables & Live Quantities Breakdown */}
            {totalArea > 0 && (
              <div className="rounded-lg border border-teal-100 bg-teal-50/40 p-3 sm:p-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-teal-200/50">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-teal-700 shrink-0" />
                    <div>
                      <span className="text-xs font-semibold text-teal-950 block">
                        Estimator Consumables & Required Materials Breakdown
                      </span>
                      <span className="text-[11px] text-teal-800/80 block">
                        Based on {totalArea} sq.ft total wall surface across {walls.length} wall(s).
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => syncEstimatorMut.mutate()}
                      disabled={syncEstimatorMut.isPending}
                      className="h-7.5 border-teal-300 bg-white text-teal-900 hover:bg-teal-50 text-xs font-medium cursor-pointer shadow-2xs"
                      title="Sync all proposed quantities to quote items and re-club categories"
                    >
                      {syncEstimatorMut.isPending ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5 text-teal-700" />
                      )}
                      Sync & Recalculate Quantities
                    </Button>

                    {(!hasLabourItem || !hasAdhesiveItem || !hasSealerItem) && (
                      <Button
                        size="sm"
                        onClick={() => addMissingConsumablesMut.mutate()}
                        disabled={addMissingConsumablesMut.isPending}
                        className="h-7.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium cursor-pointer shadow-2xs"
                        title="Add missing installation labour, adhesives, and sealer lines to quote"
                      >
                        {addMissingConsumablesMut.isPending ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Plus className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        + Add Missing Consumables
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2.5 text-xs">
                  {/* Installation Labour */}
                  <div className="rounded bg-white p-2.5 border border-teal-100 shadow-2xs">
                    <div className="flex items-center justify-between text-muted-foreground text-[10px] uppercase font-semibold mb-1">
                      <span className="flex items-center gap-1">
                        <Hammer className="h-3 w-3 text-blue-600" /> Labour
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] px-1 py-0",
                          hasLabourItem
                            ? "bg-blue-50 text-blue-800 border-blue-200"
                            : "bg-amber-50 text-amber-800 border-amber-200",
                        )}
                      >
                        {hasLabourItem ? "In Quote" : "Not In Quote"}
                      </Badge>
                    </div>
                    <span className="text-sm font-bold text-slate-800 block">
                      {liveConsumables.summary.labourSqft} sq.ft
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Full surface cladding fixing
                    </span>
                  </div>

                  {/* Adhesives & Chemicals */}
                  <div className="rounded bg-white p-2.5 border border-teal-100 shadow-2xs">
                    <div className="flex items-center justify-between text-muted-foreground text-[10px] uppercase font-semibold mb-1">
                      <span className="flex items-center gap-1">
                        <Wrench className="h-3 w-3 text-amber-600" /> Adhesives
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] px-1 py-0",
                          hasAdhesiveItem
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : "bg-slate-100 text-slate-700 border-slate-200",
                        )}
                      >
                        {hasAdhesiveItem ? "In Quote" : "Not In Quote"}
                      </Badge>
                    </div>
                    <span className="text-sm font-bold text-slate-800 block">
                      {liveConsumables.summary.cementAdhesiveBags} Bags
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      25 sq.ft/bag (or PU: {liveConsumables.summary.puAdhesiveBuckets} buckets)
                    </span>
                  </div>

                  {/* Sealer Chemical */}
                  <div className="rounded bg-white p-2.5 border border-teal-100 shadow-2xs">
                    <div className="flex items-center justify-between text-muted-foreground text-[10px] uppercase font-semibold mb-1">
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3 text-purple-600" /> Sealer
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] px-1 py-0",
                          hasSealerItem
                            ? "bg-purple-50 text-purple-800 border-purple-200"
                            : "bg-slate-100 text-slate-700 border-slate-200",
                        )}
                      >
                        {hasSealerItem ? "In Quote" : "Not In Quote"}
                      </Badge>
                    </div>
                    <span className="text-sm font-bold text-slate-800 block">
                      {liveConsumables.summary.sealerBottles} Bottle(s)
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      550 sq.ft coverage/ltr
                    </span>
                  </div>

                  {/* Sealer Labour */}
                  <div className="rounded bg-white p-2.5 border border-teal-100 shadow-2xs">
                    <div className="flex items-center justify-between text-muted-foreground text-[10px] uppercase font-semibold mb-1">
                      <span className="flex items-center gap-1">
                        <PackageCheck className="h-3 w-3 text-indigo-600" /> Sealer Labour
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] px-1 py-0",
                          hasSealerLabourItem
                            ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                            : "bg-slate-100 text-slate-700 border-slate-200",
                        )}
                      >
                        {hasSealerLabourItem ? "In Quote" : "Not In Quote"}
                      </Badge>
                    </div>
                    <span className="text-sm font-bold text-slate-800 block">
                      {liveConsumables.summary.sealerLabourSqft} sq.ft
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Dual-coat sealer wiping
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Add New Wall Dialog */}
      <Dialog open={addWallOpen} onOpenChange={setAddWallOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Layers className="h-5 w-5 text-teal-700" />
              Add New Wall & Cladding Line
            </DialogTitle>
            <DialogDescription className="text-xs">
              Enter wall measurements. The stone product will be clubbed at the top with other
              products, and installation labour, adhesive bags, and sealers will automatically
              update.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Wall Details */}
            <div className="grid grid-cols-12 gap-3 items-end">
              <div className="col-span-12 sm:col-span-6">
                <label className="text-xs font-medium text-foreground block mb-1">
                  Wall Name <span className="text-destructive">*</span>
                </label>
                <Input
                  value={newWallName}
                  onChange={(e) => setNewWallName(e.target.value)}
                  placeholder="e.g. Wall 3, Front Porch Facade"
                  className="h-8.5 text-xs"
                />
              </div>

              <div className="col-span-12 sm:col-span-6">
                <label className="text-xs font-medium text-foreground block mb-1">
                  Measurement Unit
                </label>
                <Select value={newWallUnit} onValueChange={(v) => setNewWallUnit(v as LengthUnit)}>
                  <SelectTrigger className="h-8.5 text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LENGTH_UNITS.map((u) => (
                      <SelectItem key={u} value={u} className="text-xs">
                        {LENGTH_UNIT_LABELS[u]} ({u})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-6">
                <label className="text-xs font-medium text-foreground block mb-1">
                  Height ({newWallUnit})
                </label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  value={newWallHeight}
                  onChange={(e) => setNewWallHeight(e.target.value)}
                  placeholder="10"
                  className="h-8.5 text-xs"
                />
              </div>

              <div className="col-span-6">
                <label className="text-xs font-medium text-foreground block mb-1">
                  Length ({newWallUnit})
                </label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  value={newWallLength}
                  onChange={(e) => setNewWallLength(e.target.value)}
                  placeholder="12"
                  className="h-8.5 text-xs"
                />
              </div>
            </div>

            {/* Calculated Area Highlight */}
            <div className="p-2.5 rounded-md bg-teal-50 border border-teal-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-teal-900 block font-medium">
                  Calculated Wall Area:
                </span>
                <span className="text-sm font-bold text-teal-950">
                  {calcNewWallSqft.toFixed(2)} sq.ft
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-teal-800 block">
                  {newWallHeight || 0} {newWallUnit} × {newWallLength || 0} {newWallUnit}
                </span>
                <span className="text-[10px] text-teal-700 italic">Auto-calculated</span>
              </div>
            </div>

            {/* Stone Product Selection */}
            <div className="pt-2 border-t border-border space-y-3">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Stone Cladding Product{" "}
                  <span className="text-muted-foreground font-normal">
                    (Search by 080, 80, name)
                  </span>
                </label>
                <CatalogProductSelect
                  value={selectedCatalogProduct?.name || ""}
                  onChange={(val) => {
                    if (!val) setSelectedCatalogProduct(null);
                  }}
                  onSelectCatalogItem={(prod) => {
                    setSelectedCatalogProduct(prod);
                    if (prod.defaultPrice) {
                      setProductRate(String(prod.defaultPrice));
                    }
                  }}
                  placeholder="Search code (e.g. 080, 80) or stone name…"
                />
              </div>

              {selectedCatalogProduct && (
                <div className="grid grid-cols-12 gap-3 items-end p-2.5 rounded-md bg-slate-50 border border-slate-200">
                  <div className="col-span-4">
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                      Wastage %
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="50"
                      value={wastagePct}
                      onChange={(e) => setWastagePct(e.target.value)}
                      className="h-8 text-xs bg-white"
                    />
                  </div>
                  <div className="col-span-4">
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                      Quantity (sq.ft)
                    </label>
                    <Input
                      type="number"
                      readOnly
                      value={calcQtyToOrder}
                      className="h-8 text-xs bg-slate-100 font-semibold"
                    />
                  </div>
                  <div className="col-span-4">
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                      Rate (₹/sq.ft)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={productRate}
                      onChange={(e) => setProductRate(e.target.value)}
                      placeholder="165"
                      className="h-8 text-xs bg-white font-semibold"
                    />
                  </div>
                  <div className="col-span-12 flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                    <span className="text-muted-foreground">Estimated Line Total:</span>
                    <span className="font-bold text-emerald-700">
                      {formatInr(calcQtyToOrder * (Number(productRate) || 0))}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Insertion Placement Notice */}
            <div className="p-2.5 rounded-md bg-blue-50/70 border border-blue-200 flex items-center gap-2 text-blue-900 text-[11px]">
              <AlertCircle className="h-4 w-4 text-blue-700 shrink-0" />
              <span>
                <strong>Categorical Hierarchy:</strong> Stone products are grouped at the top,
                followed by installation labour, adhesives/chemicals, sealers, and carting.
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAddWallOpen(false)}
              disabled={addWallMut.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => addWallMut.mutate()}
              disabled={addWallMut.isPending || calcNewWallSqft <= 0}
              className="bg-teal-700 hover:bg-teal-800 text-white"
            >
              {addWallMut.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Adding Wall & Updating Consumables…
                </>
              ) : (
                <>
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                  Add Wall & Recalculate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Wall Dimensions Dialog */}
      {editingWall && (
        <Dialog open={!!editingWall} onOpenChange={(o) => !o && setEditingWall(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm font-semibold">
                Edit {editingWall.name} Dimensions
              </DialogTitle>
              <DialogDescription className="text-xs">
                Decreasing or increasing wall dimensions will automatically adjust product
                quantities, installation labour, adhesives bags, and sealers.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs">
              <div>
                <label className="text-xs font-medium block mb-1">Wall Name</label>
                <Input
                  value={editingWall.name}
                  onChange={(e) => setEditingWall({ ...editingWall, name: e.target.value })}
                  className="h-8.5 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium block mb-1">
                    Height ({editingWall.unit})
                  </label>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    value={editingWall.height}
                    onChange={(e) => {
                      const h = Number(e.target.value) || 0;
                      const sq = wallSqft(h, editingWall.length, editingWall.unit);
                      setEditingWall({
                        ...editingWall,
                        height: h,
                        sqft: Math.round(sq * 100) / 100,
                      });
                    }}
                    className="h-8.5 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">
                    Length ({editingWall.unit})
                  </label>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    value={editingWall.length}
                    onChange={(e) => {
                      const l = Number(e.target.value) || 0;
                      const sq = wallSqft(editingWall.height, l, editingWall.unit);
                      setEditingWall({
                        ...editingWall,
                        length: l,
                        sqft: Math.round(sq * 100) / 100,
                      });
                    }}
                    className="h-8.5 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Surface Area (sq.ft)</label>
                <Input
                  type="number"
                  step="any"
                  value={editingWall.sqft}
                  onChange={(e) =>
                    setEditingWall({ ...editingWall, sqft: Number(e.target.value) || 0 })
                  }
                  className="h-8.5 text-xs font-semibold"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditingWall(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => editWallMut.mutate(editingWall)}
                disabled={editWallMut.isPending}
                className="bg-teal-700 hover:bg-teal-800 text-white"
              >
                {editWallMut.isPending ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : null}
                Save & Adjust Quantities
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

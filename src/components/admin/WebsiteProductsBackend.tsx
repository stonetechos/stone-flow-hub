import { useState, useMemo } from "react";
import {
  PackagePlus,
  Search,
  Filter,
  Sparkles,
  Edit2,
  Trash2,
  RefreshCw,
  Tag,
  DollarSign,
  Layers,
  CheckCircle2,
  ExternalLink,
  UploadCloud,
  Eye,
  AlertCircle,
  ShieldCheck,
  GripVertical,
  ArrowUpDown,
  RotateCcw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useWebsiteCatalog, type CatalogProduct } from "@/lib/catalog/catalog-store";
import { STONE_TYPES, PRODUCT_UNITS } from "@/lib/products/schema";
import { useRoles } from "@/hooks/use-roles";

export function WebsiteProductsBackend() {
  const roles = useRoles();
  const isSuperAdmin = roles.isSuperAdmin;

  const {
    products,
    categories,
    isSyncing,
    getProductPrice,
    updateProduct,
    addProduct,
    deleteProduct,
    reorderProducts,
    resetOrder,
  } = useWebsiteCatalog();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStoneType, setSelectedStoneType] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Drag and drop state
  const [draggedProductId, setDraggedProductId] = useState<string | null>(null);
  const [dragOverProductId, setDragOverProductId] = useState<string | null>(null);

  // Modals state
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CatalogProduct | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states for Create / Edit
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formNewCategory, setFormNewCategory] = useState("");
  const [formStoneType, setFormStoneType] = useState("Natural Marble");
  const [formThickness, setFormThickness] = useState("20-30mm");
  const [formUnit, setFormUnit] = useState("sq.ft");
  const [formPrice, setFormPrice] = useState("550");
  const [formMrp, setFormMrp] = useState("680");
  const [formBadge, setFormBadge] = useState("Quarry Direct");
  const [formLeadTime, setFormLeadTime] = useState("Ready to Ship");
  const [formImage, setFormImage] = useState("");
  const [formDescription, setFormDescription] = useState("");

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory !== "all" && p.category !== selectedCategory) return false;
      if (selectedStoneType !== "all" && p.stoneType !== selectedStoneType) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.stoneType.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [products, selectedCategory, selectedStoneType, search]);

  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, page, pageSize]);

  // Open Create Dialog
  const handleOpenCreate = () => {
    setFormName("");
    setFormCategory(categories[0] || "Wall Cladding Panel");
    setFormNewCategory("");
    setFormStoneType("Natural Marble");
    setFormThickness("20-35mm variable relief");
    setFormUnit("sq.ft");
    setFormPrice("550");
    setFormMrp("690");
    setFormBadge("Quarry Direct");
    setFormLeadTime("In Stock - Ready to Ship");
    setFormImage("");
    setFormDescription("");
    setCreateOpen(true);
  };

  // Open Edit Dialog
  const handleOpenEdit = (p: CatalogProduct) => {
    const priceInfo = getProductPrice(p);
    setEditTarget(p);
    setFormName(p.name);
    setFormCategory(p.category);
    setFormNewCategory("");
    setFormStoneType(p.stoneType);
    setFormThickness(p.thickness || "20-30mm");
    setFormUnit(priceInfo.unit || "sq.ft");
    setFormPrice(String(priceInfo.price));
    setFormMrp(String(priceInfo.mrp || Math.round(priceInfo.price * 1.25)));
    setFormBadge(priceInfo.badge || "Quarry Direct");
    setFormLeadTime(priceInfo.leadTime || "Ready to Ship");
    setFormImage(p.image || "");
    setFormDescription(p.notes || `${p.name} - ${p.stoneType}`);
  };

  // Submit Create
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Please enter a product name");
      return;
    }
    const finalCategory = formCategory === "new" ? formNewCategory.trim() : formCategory;
    if (!finalCategory) {
      toast.error("Please specify a category");
      return;
    }

    setIsSubmitting(true);
    try {
      const priceNum = parseFloat(formPrice) || 450;
      const mrpNum = parseFloat(formMrp) || Math.round(priceNum * 1.25);

      await addProduct({
        name: formName.trim(),
        category: finalCategory,
        stoneType: formStoneType,
        thickness: formThickness,
        standardSizes: "300x300mm / 600x300mm / Custom Modules",
        image: formImage.trim() || "/branding/stone-tech-logo.png",
        slug: formName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        applications: ["Exterior Elevation Facade", "Interior Feature Wall"],
        finishes: ["Natural Cleft", "Honed", "Bush-hammered"],
        price: priceNum,
        currency: "₹",
        unit: formUnit,
        mrp: mrpNum,
        badge: formBadge.trim(),
        leadTime: formLeadTime.trim(),
        notes: formDescription.trim(),
      });

      toast.success(
        `Added "${formName}" to website catalogue & synced with ERP products database!`,
      );
      setCreateOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Error saving product: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    if (!formName.trim()) {
      toast.error("Product name cannot be empty");
      return;
    }

    setIsSubmitting(true);
    try {
      const priceNum = parseFloat(formPrice) || 450;
      const mrpNum = parseFloat(formMrp) || Math.round(priceNum * 1.25);

      await updateProduct(editTarget.id, {
        name: formName.trim(),
        category: formCategory === "new" ? formNewCategory.trim() : formCategory,
        stoneType: formStoneType,
        thickness: formThickness,
        image: formImage.trim() || editTarget.image,
        price: priceNum,
        unit: formUnit,
        mrp: mrpNum,
        badge: formBadge.trim(),
        leadTime: formLeadTime.trim(),
        notes: formDescription.trim(),
      });

      toast.success(
        `Updated "${formName}" (${editTarget.id}) — synchronized with website and ERP quotes/inventory!`,
      );
      setEditTarget(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Update failed: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle local image file upload -> Data URL
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file is too large (max 5MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setFormImage(reader.result);
        toast.success("Image uploaded successfully!");
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <Card className="border-cyan-800/40 bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 text-white shadow-md">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <span>Website Product Catalogue &amp; Central Price Synchronizer</span>
                  <Badge className="bg-cyan-500/30 text-cyan-200 border-cyan-400/40 text-[10px]">
                    Software-Wide Live Sync
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-cyan-100/70">
                  Manage all products displayed on stonetech.in. When you edit a product name,
                  price, or specs here, the change automatically propagates to Quotes, Estimates,
                  Sales Orders, and Stock Inventory!
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isSuperAdmin && (
                <Button
                  onClick={handleOpenCreate}
                  size="sm"
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  <PackagePlus className="mr-1.5 h-3.5 w-3.5" />
                  Upload New Product
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/40 p-3 rounded-xl border border-border">
        <div className="relative flex-1 w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by product name, code, stone..."
            className="pl-9 h-9 text-xs bg-background"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Reset Order Button if custom ordering applied */}
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              if (
                window.confirm(
                  "Reset product order back to the default catalog benchmark sequence?",
                )
              ) {
                await resetOrder();
                toast.success("Product order reset to standard catalog sequence");
              }
            }}
            className="h-9 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            title="Reset drag-and-drop order to default sequence"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Reset Order</span>
          </Button>

          {/* Category Dropdown */}
          <Select
            value={selectedCategory}
            onValueChange={(v) => {
              setSelectedCategory(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-9 w-44 text-xs bg-background">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All Categories ({products.length})
              </SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c} className="text-xs">
                  {c} ({products.filter((p) => p.category === c).length})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Stone Type Dropdown */}
          <Select
            value={selectedStoneType}
            onValueChange={(v) => {
              setSelectedStoneType(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-9 w-40 text-xs bg-background">
              <SelectValue placeholder="All Stone Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All Geologies
              </SelectItem>
              {Array.from(new Set(products.map((p) => p.stoneType))).map((st) => (
                <SelectItem key={st} value={st} className="text-xs">
                  {st}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Products Table */}
      <Card className="overflow-hidden border-border/80 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/70 text-muted-foreground font-semibold border-b border-border">
              <tr>
                {isSuperAdmin && (
                  <th
                    className="py-2.5 px-2 w-8 text-center"
                    title="Drag and drop to arrange sequence"
                  ></th>
                )}
                <th className="py-2.5 px-3 w-14">Image</th>
                <th className="py-2.5 px-3">Product Name &amp; Code</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Stone Type</th>
                <th className="py-2.5 px-3">Selling Price</th>
                <th className="py-2.5 px-3">MRP</th>
                <th className="py-2.5 px-3">Commercial Badge</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={isSuperAdmin ? 9 : 8}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No products found matching the search criteria.
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((p, idx) => {
                  const priceInfo = getProductPrice(p);
                  const isBeingDragged = draggedProductId === p.id;
                  const isOver = dragOverProductId === p.id;

                  return (
                    <tr
                      key={p.id}
                      draggable={isSuperAdmin}
                      onDragStart={(e) => {
                        if (!isSuperAdmin) return;
                        setDraggedProductId(p.id);
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", p.id);
                      }}
                      onDragOver={(e) => {
                        if (!isSuperAdmin || !draggedProductId) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        if (dragOverProductId !== p.id) {
                          setDragOverProductId(p.id);
                        }
                      }}
                      onDragLeave={() => {
                        if (dragOverProductId === p.id) {
                          setDragOverProductId(null);
                        }
                      }}
                      onDrop={async (e) => {
                        e.preventDefault();
                        if (!isSuperAdmin || !draggedProductId) return;
                        const sourceId = draggedProductId;
                        const targetId = p.id;
                        setDraggedProductId(null);
                        setDragOverProductId(null);

                        if (sourceId !== targetId) {
                          await reorderProducts(sourceId, targetId);
                          toast.success(`Moved product position successfully`);
                        }
                      }}
                      onDragEnd={() => {
                        setDraggedProductId(null);
                        setDragOverProductId(null);
                      }}
                      className={`hover:bg-muted/30 transition-colors ${
                        isBeingDragged ? "opacity-40 bg-muted/50" : ""
                      } ${
                        isOver
                          ? "border-t-2 border-t-cyan-500 bg-cyan-50/20 dark:bg-cyan-950/20 shadow-xs"
                          : ""
                      }`}
                    >
                      {isSuperAdmin && (
                        <td className="py-2 px-1 text-center align-middle cursor-grab active:cursor-grabbing text-muted-foreground hover:text-cyan-600">
                          <div
                            className="flex items-center justify-center h-full"
                            title="Click & hold to drag up or down"
                          >
                            <GripVertical className="h-4 w-4" />
                          </div>
                        </td>
                      )}
                      <td className="py-2 px-3">
                        <div className="relative h-10 w-14 rounded overflow-hidden border border-border bg-stone-900 shrink-0">
                          <img
                            src={p.image}
                            alt={p.name}
                            className="h-full w-full object-cover pointer-events-none"
                            loading="lazy"
                          />
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-semibold text-foreground">{p.name}</div>
                        <div className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400">
                          {p.id}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <Badge variant="outline" className="text-[10px] bg-background">
                          {p.category}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">{p.stoneType}</td>
                      <td className="py-2 px-3">
                        <span className="font-bold text-foreground">
                          {priceInfo.currency} {priceInfo.price}
                        </span>
                        <span className="text-[10px] text-muted-foreground ml-1">
                          /{priceInfo.unit}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">
                        {priceInfo.mrp ? (
                          <span className="line-through">
                            {priceInfo.currency} {priceInfo.mrp}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <Badge className="bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-200 text-[10px] px-1.5">
                          {priceInfo.badge || "Standard"}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isSuperAdmin ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEdit(p)}
                                className="h-7 px-2 text-xs text-cyan-600 hover:bg-cyan-50"
                              >
                                <Edit2 className="h-3.5 w-3.5 mr-1" />
                                Edit
                              </Button>
                              {p.isCustomUploaded && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        `Remove "${p.name}" from the live website catalogue?`,
                                      )
                                    ) {
                                      deleteProduct(p.id);
                                      toast.success(`Removed "${p.name}" from catalogue`);
                                    }
                                  }}
                                  className="h-7 px-2 text-xs text-rose-500 hover:bg-rose-50"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </>
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic px-2">
                              View only
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-muted/20 text-xs">
          <div className="text-muted-foreground">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredProducts.length)}{" "}
            of {filteredProducts.length} products
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="h-7 px-2 text-xs"
            >
              Previous
            </Button>
            <span className="px-2 font-medium">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="h-7 px-2 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* CREATE PRODUCT MODAL */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-600">
                <PackagePlus className="h-5 w-5" />
                Upload &amp; Publish New Website Product
              </DialogTitle>
              <DialogDescription>
                Add a new stone product to the live website catalogue. It will be immediately
                available on stonetech.in and automatically seeded into ERP quotes &amp; orders.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold">Product Name *</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Makrana White &amp; Brass Inlay Strip Mosaic"
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Category *</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c} className="text-xs">
                        {c}
                      </SelectItem>
                    ))}
                    <SelectItem value="new" className="text-xs font-bold text-cyan-600">
                      + Add New Category...
                    </SelectItem>
                  </SelectContent>
                </Select>
                {formCategory === "new" && (
                  <Input
                    value={formNewCategory}
                    onChange={(e) => setFormNewCategory(e.target.value)}
                    placeholder="Enter new category name..."
                    className="h-8 text-xs mt-1"
                    required
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Stone Geology / Type</Label>
                <Input
                  value={formStoneType}
                  onChange={(e) => setFormStoneType(e.target.value)}
                  placeholder="e.g. Natural Marble, Quartzite, Sandstone"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Selling Price (₹) *</Label>
                <Input
                  type="number"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  placeholder="550"
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Strike-through MRP (₹)</Label>
                <Input
                  type="number"
                  value={formMrp}
                  onChange={(e) => setFormMrp(e.target.value)}
                  placeholder="690"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Billing Unit</Label>
                <Select value={formUnit} onValueChange={setFormUnit}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sq.ft">per sq.ft</SelectItem>
                    <SelectItem value="sq.m">per sq.m</SelectItem>
                    <SelectItem value="tile">per tile</SelectItem>
                    <SelectItem value="piece">per piece</SelectItem>
                    <SelectItem value="box">per box</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Relief / Thickness</Label>
                <Input
                  value={formThickness}
                  onChange={(e) => setFormThickness(e.target.value)}
                  placeholder="e.g. 20-35mm variable relief"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Commercial Badge Tag</Label>
                <Input
                  value={formBadge}
                  onChange={(e) => setFormBadge(e.target.value)}
                  placeholder="e.g. Quarry Direct, Best Seller"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Dispatch Lead Time</Label>
                <Input
                  value={formLeadTime}
                  onChange={(e) => setFormLeadTime(e.target.value)}
                  placeholder="e.g. Ready to Ship, 7-10 Days"
                  className="h-9 text-xs"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold">Product Photo / Image</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="h-9 text-xs flex-1 file:text-xs file:bg-muted"
                  />
                  <span className="text-xs text-muted-foreground">or URL:</span>
                  <Input
                    value={formImage}
                    onChange={(e) => setFormImage(e.target.value)}
                    placeholder="/images/catalog/... or https://"
                    className="h-9 text-xs flex-1"
                  />
                </div>
                {formImage && (
                  <div className="mt-2 h-20 w-32 rounded border overflow-hidden bg-stone-900">
                    <img src={formImage} alt="Preview" className="h-full w-full object-cover" />
                  </div>
                )}
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold">Description / Architectural Notes</Label>
                <Textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Specifications, surface finishes, packaging notes..."
                  rows={2}
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
              >
                {isSubmitting ? "Publishing & Syncing..." : "Publish & Sync Everywhere"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT PRODUCT MODAL */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
          {editTarget && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="flex items-center gap-2 text-cyan-600">
                    <Edit2 className="h-4 w-4" />
                    Edit Website Product &amp; Sync Software-Wide
                  </DialogTitle>
                  <Badge variant="outline" className="font-mono text-xs">
                    {editTarget.id}
                  </Badge>
                </div>
                <DialogDescription>
                  Updating name or price here will automatically update the product on the website
                  and synchronize with Quotes, Estimates, and Inventory across the entire software.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-xs font-semibold">Product Name *</Label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Category</Label>
                  <Select value={formCategory} onValueChange={setFormCategory}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c} value={c} className="text-xs">
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Stone Geology / Type</Label>
                  <Input
                    value={formStoneType}
                    onChange={(e) => setFormStoneType(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Selling Price (₹) *</Label>
                  <Input
                    type="number"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    required
                    className="h-9 text-xs font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Strike-through MRP (₹)</Label>
                  <Input
                    type="number"
                    value={formMrp}
                    onChange={(e) => setFormMrp(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Billing Unit</Label>
                  <Select value={formUnit} onValueChange={setFormUnit}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sq.ft">per sq.ft</SelectItem>
                      <SelectItem value="sq.m">per sq.m</SelectItem>
                      <SelectItem value="tile">per tile</SelectItem>
                      <SelectItem value="piece">per piece</SelectItem>
                      <SelectItem value="box">per box</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Commercial Badge Tag</Label>
                  <Input
                    value={formBadge}
                    onChange={(e) => setFormBadge(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-xs font-semibold">Image URL / Path</Label>
                  <Input
                    value={formImage}
                    onChange={(e) => setFormImage(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-xs font-semibold">Notes / Packaging Details</Label>
                  <Textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    rows={2}
                    className="text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditTarget(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
                >
                  {isSubmitting ? "Saving & Syncing..." : "Save & Sync Everywhere"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

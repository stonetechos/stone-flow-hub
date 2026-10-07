/**
 * /backend/site-settings — edit landing page content without touching code.
 *
 * Editable sections:
 *  1. Google Rating — the number shown on star pills site-wide
 *  2. Customer Reviews — the carousel in the Contact section
 *  3. Estimate Card — heading and sub-text of the estimate form card
 */
import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Star,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Settings2,
  MessageSquare,
  CreditCard,
  Loader2,
  Layers,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useSiteSettings, useUpsertSiteSetting } from "@/lib/site-settings/use-site-settings";
import type {
  SiteReview,
  CladdingProductItem,
  CladdingWallApplication,
} from "@/lib/site-settings/types";
import { SITE_SETTINGS_DEFAULTS } from "@/lib/site-settings/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = createFileRoute("/backend/site-settings")({
  component: SiteSettingsPage,
  errorComponent: () => (
    <div className="p-10 text-sm text-destructive">Failed to load site settings.</div>
  ),
  notFoundComponent: () => (
    <div className="p-10 text-sm text-muted-foreground">Page not found.</div>
  ),
});

/* -------------------------------------------------------------------------- */
/* Star preview                                                                 */
/* -------------------------------------------------------------------------- */
function StarRow({ rating, size = 4 }: { rating: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-${size} w-${size} ${
            n <= Math.round(rating)
              ? "fill-amber-500 text-amber-500"
              : "fill-muted text-muted-foreground"
          }`}
        />
      ))}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                         */
/* -------------------------------------------------------------------------- */
function SiteSettingsPage() {
  const { data: settings, isLoading } = useSiteSettings();
  const upsert = useUpsertSiteSetting();

  /* ── Local state — mirrors DB values so changes feel instant ─────────── */
  const [rating, setRating] = useState("");
  const [reviews, setReviews] = useState<SiteReview[]>([]);
  const [estimateHeading, setEstimateHeading] = useState("");
  const [estimateSubtext, setEstimateSubtext] = useState("");
  const [claddingProducts, setCladdingProducts] = useState<CladdingProductItem[]>([]);

  /* Sync from DB once loaded */
  useEffect(() => {
    if (!settings) return;
    setRating(settings.google_rating);
    setReviews(settings.reviews);
    setEstimateHeading(settings.estimate_card_heading);
    setEstimateSubtext(settings.estimate_card_subtext);
    setCladdingProducts(settings.cladding_products || SITE_SETTINGS_DEFAULTS.cladding_products);
  }, [settings]);

  /* ── Helpers ─────────────────────────────────────────────────────────── */
  async function save(key: string, value: unknown, label: string) {
    try {
      await upsert.mutateAsync({ key, value });
      toast.success(`${label} saved successfully.`);
    } catch (err) {
      toast.error(
        `Failed to save ${label}: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  }

  function updateReview(index: number, field: keyof SiteReview, value: string | number) {
    setReviews((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  function addReview() {
    setReviews((prev) => [...prev, { quote: "", author: "", role: "", rating: 5 }]);
  }

  function removeReview(index: number) {
    setReviews((prev) => prev.filter((_, i) => i !== index));
  }

  function updateCladdingProduct(index: number, field: keyof CladdingProductItem, value: unknown) {
    setCladdingProducts((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  }

  function addCladdingProduct() {
    setCladdingProducts((prev) => [
      ...prev,
      {
        id: `clad-${Date.now()}`,
        name: "New Cladding Product",
        category: "Natural Sandstone Cladding",
        tagline: "High-relief natural stone wall cladding",
        materialImage: "",
        wallImages: [],
        suitableWalls: ["Exterior Elevation", "TV Accent Wall"],
      },
    ]);
  }

  function removeCladdingProduct(index: number) {
    setCladdingProducts((prev) => prev.filter((_, i) => i !== index));
  }

  function addWallImageToProduct(productIndex: number) {
    setCladdingProducts((prev) =>
      prev.map((p, i) => {
        if (i !== productIndex) return p;
        const newWall: CladdingWallApplication = {
          url: "",
          title: "Installed Wall Application",
          spaceType: "Living Room Feature Wall",
          description: "",
        };
        return {
          ...p,
          wallImages: [...(p.wallImages || []), newWall],
        };
      }),
    );
  }

  function updateWallImage(
    productIndex: number,
    wallIndex: number,
    field: keyof CladdingWallApplication,
    value: string,
  ) {
    setCladdingProducts((prev) =>
      prev.map((p, i) => {
        if (i !== productIndex) return p;
        const walls = [...(p.wallImages || [])];
        walls[wallIndex] = { ...walls[wallIndex], [field]: value };
        return { ...p, wallImages: walls };
      }),
    );
  }

  function removeWallImage(productIndex: number, wallIndex: number) {
    setCladdingProducts((prev) =>
      prev.map((p, i) => {
        if (i !== productIndex) return p;
        return {
          ...p,
          wallImages: (p.wallImages || []).filter((_, wi) => wi !== wallIndex),
        };
      }),
    );
  }

  function handleImageUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    onUrlReady: (dataUrl: string) => void,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image must be smaller than 8MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) onUrlReady(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  /* ── Loading skeleton ─────────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground gap-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading settings…
      </div>
    );
  }

  const parsedRating = parseFloat(rating);
  const ratingValid = !isNaN(parsedRating) && parsedRating >= 1 && parsedRating <= 5;

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-10">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 text-primary mb-1">
          <Settings2 className="h-5 w-5" />
          <h1 className="text-xl font-bold">Site Settings</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Edit landing page content. Changes go live instantly — no deployment needed.
        </p>
      </div>

      <Separator />

      {/* ──────────────────────────────────────────────────────────────────
          SECTION 1: Google Rating
      ─────────────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-base">Google Rating</CardTitle>
          </div>
          <CardDescription>
            Shown on the homepage star pill and inside the estimate form.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="rating">Rating (1.0 – 5.0)</Label>
              <Input
                id="rating"
                type="number"
                step="0.1"
                min={1}
                max={5}
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                className="max-w-[120px]"
              />
            </div>
            {ratingValid && (
              <div className="flex items-center gap-2 pb-1 text-sm text-muted-foreground">
                <StarRow rating={parsedRating} />
                <span className="font-semibold text-foreground">{parsedRating.toFixed(1)}</span>
              </div>
            )}
          </div>
          {!ratingValid && rating !== "" && (
            <p className="text-xs text-destructive">Enter a number between 1.0 and 5.0.</p>
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={!ratingValid || upsert.isPending}
              onClick={() => save("google_rating", rating, "Google Rating")}
            >
              {upsert.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Save className="h-3.5 w-3.5 mr-1.5" />
              )}
              Save Rating
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRating(SITE_SETTINGS_DEFAULTS.google_rating)}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Reset to default
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ──────────────────────────────────────────────────────────────────
          SECTION 2: Customer Reviews
      ─────────────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-blue-500" />
            <CardTitle className="text-base">Customer Reviews</CardTitle>
          </div>
          <CardDescription>
            The review carousel shown in the "How to Reach Us" section. You can add, edit or remove
            reviews.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {reviews.map((review, index) => (
            <div key={index} className="rounded-lg border border-border p-4 space-y-3 relative">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Review {index + 1}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => removeReview(index)}
                  title="Remove review"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="space-y-1.5">
                <Label>Review text</Label>
                <Textarea
                  rows={3}
                  value={review.quote}
                  onChange={(e) => updateReview(index, "quote", e.target.value)}
                  placeholder="What the customer said…"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Author name</Label>
                  <Input
                    value={review.author}
                    onChange={(e) => updateReview(index, "author", e.target.value)}
                    placeholder="e.g. Ar. Mihir Patel"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Role / Title</Label>
                  <Input
                    value={review.role}
                    onChange={(e) => updateReview(index, "role", e.target.value)}
                    placeholder="e.g. Principal Architect, Ahmedabad"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Star rating</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    step={1}
                    value={review.rating}
                    onChange={(e) => updateReview(index, "rating", parseInt(e.target.value, 10))}
                    className="w-20"
                  />
                  <StarRow rating={review.rating} />
                </div>
              </div>
            </div>
          ))}

          <Button variant="outline" size="sm" onClick={addReview} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add Review
          </Button>

          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              disabled={upsert.isPending}
              onClick={() => save("reviews", reviews, "Reviews")}
            >
              {upsert.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Save className="h-3.5 w-3.5 mr-1.5" />
              )}
              Save Reviews
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReviews(SITE_SETTINGS_DEFAULTS.reviews)}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Reset to defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ──────────────────────────────────────────────────────────────────
          SECTION 3: Estimate Card
      ─────────────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-emerald-500" />
            <CardTitle className="text-base">Estimate Card</CardTitle>
          </div>
          <CardDescription>
            The heading and description line inside the "Request for Estimate" form card.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="estimate-heading">Card Heading</Label>
            <Input
              id="estimate-heading"
              value={estimateHeading}
              onChange={(e) => setEstimateHeading(e.target.value)}
              placeholder="Request for Estimate"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="estimate-subtext">Sub-text</Label>
            <Input
              id="estimate-subtext"
              value={estimateSubtext}
              onChange={(e) => setEstimateSubtext(e.target.value)}
              placeholder="Get a personalised stone estimate…"
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={upsert.isPending || !estimateHeading.trim()}
              onClick={async () => {
                await save("estimate_card_heading", estimateHeading, "Estimate Heading");
                await save("estimate_card_subtext", estimateSubtext, "Estimate Sub-text");
              }}
            >
              {upsert.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Save className="h-3.5 w-3.5 mr-1.5" />
              )}
              Save Estimate Card
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEstimateHeading(SITE_SETTINGS_DEFAULTS.estimate_card_heading);
                setEstimateSubtext(SITE_SETTINGS_DEFAULTS.estimate_card_subtext);
              }}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ──────────────────────────────────────────────────────────────────
          SECTION 4: Wall Cladding Products & Wall Showcase
      ─────────────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">
                Wall Cladding Products &amp; Installations
              </CardTitle>
            </div>
            <Button size="sm" variant="outline" onClick={addCladdingProduct} className="text-xs">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Cladding Product
            </Button>
          </div>
          <CardDescription>
            Manage the cladding products shown on the homepage. Each item has a primary material
            photo (clickable on stonetech.in) that opens photos of real walls where it can be
            installed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {claddingProducts.map((prod, pIdx) => (
            <div
              key={prod.id || pIdx}
              className="rounded-xl border border-border p-5 space-y-4 bg-muted/10 relative"
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">
                    #{pIdx + 1} {prod.name || "Untitled Cladding"}
                  </span>
                  <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    {prod.category}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                  onClick={() => removeCladdingProduct(pIdx)}
                  title="Remove cladding product"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Product Name</Label>
                  <Input
                    value={prod.name}
                    onChange={(e) => updateCladdingProduct(pIdx, "name", e.target.value)}
                    placeholder="e.g. Red Indian Sandstone Butch Finish"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Input
                    value={prod.category}
                    onChange={(e) => updateCladdingProduct(pIdx, "category", e.target.value)}
                    placeholder="e.g. Natural Sandstone Cladding"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Tagline / Architectural Summary</Label>
                <Input
                  value={prod.tagline}
                  onChange={(e) => updateCladdingProduct(pIdx, "tagline", e.target.value)}
                  placeholder="e.g. Rugged butch finish natural surface creating dramatic architectural shadows"
                />
              </div>

              {/* Material Sample Image URL / Upload */}
              <div className="space-y-2 rounded-lg border border-border/80 bg-background p-3.5">
                <Label className="text-xs font-semibold flex items-center justify-between">
                  <span>Cladding Material Photo (Clickable Sample)</span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    URL or Upload
                  </span>
                </Label>
                <div className="flex gap-2 items-center">
                  <Input
                    value={prod.materialImage}
                    onChange={(e) => updateCladdingProduct(pIdx, "materialImage", e.target.value)}
                    placeholder="https://... or upload image"
                    className="text-xs"
                  />
                  <label className="cursor-pointer">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="text-xs shrink-0 pointer-events-none"
                    >
                      <span>
                        <Upload className="h-3.5 w-3.5 mr-1" /> Upload
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleImageUpload(e, (url) =>
                          updateCladdingProduct(pIdx, "materialImage", url),
                        )
                      }
                    />
                  </label>
                </div>
                {prod.materialImage && (
                  <div className="mt-2 h-24 w-36 rounded-md overflow-hidden border border-border">
                    <img
                      src={prod.materialImage}
                      alt="Sample"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
              </div>

              {/* Wall Installation Photos */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground">
                    Installed Wall Photos (Shown when customer clicks this cladding)
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => addWallImageToProduct(pIdx)}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add Wall Photo
                  </Button>
                </div>

                {(!prod.wallImages || prod.wallImages.length === 0) && (
                  <p className="text-xs text-muted-foreground italic">
                    No wall installation photos added yet. Click &quot;Add Wall Photo&quot; above.
                  </p>
                )}

                <div className="space-y-3">
                  {(prod.wallImages || []).map((wall, wIdx) => (
                    <div
                      key={wIdx}
                      className="rounded-lg border border-border/80 bg-background p-3 space-y-2 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          Wall Photo #{wIdx + 1}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                          onClick={() => removeWallImage(pIdx, wIdx)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[11px]">Wall Title</Label>
                          <Input
                            value={wall.title}
                            onChange={(e) => updateWallImage(pIdx, wIdx, "title", e.target.value)}
                            placeholder="e.g. Luxury Bungalow Elevation Facade"
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px]">Space / Room Type</Label>
                          <Input
                            value={wall.spaceType}
                            onChange={(e) =>
                              updateWallImage(pIdx, wIdx, "spaceType", e.target.value)
                            }
                            placeholder="e.g. Exterior Elevation, TV Accent Wall"
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 items-center">
                        <Input
                          value={wall.url}
                          onChange={(e) => updateWallImage(pIdx, wIdx, "url", e.target.value)}
                          placeholder="Image URL or upload"
                          className="h-8 text-xs"
                        />
                        <label className="cursor-pointer shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="h-8 text-xs pointer-events-none"
                          >
                            <span>
                              <Upload className="h-3 w-3 mr-1" /> Upload
                            </span>
                          </Button>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) =>
                              handleImageUpload(e, (url) => updateWallImage(pIdx, wIdx, "url", url))
                            }
                          />
                        </label>
                      </div>

                      {wall.url && (
                        <div className="h-20 w-32 rounded overflow-hidden border border-border">
                          <img
                            src={wall.url}
                            alt={wall.title}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              disabled={upsert.isPending}
              onClick={async () => {
                await save("cladding_products", claddingProducts, "Cladding Products");
              }}
            >
              {upsert.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Save className="h-3.5 w-3.5 mr-1.5" />
              )}
              Save Cladding Products
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCladdingProducts(SITE_SETTINGS_DEFAULTS.cladding_products);
              }}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Reset to Defaults
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

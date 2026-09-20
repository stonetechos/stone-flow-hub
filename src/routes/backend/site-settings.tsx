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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useSiteSettings, useUpsertSiteSetting } from "@/lib/site-settings/use-site-settings";
import type { SiteReview } from "@/lib/site-settings/types";
import { SITE_SETTINGS_DEFAULTS } from "@/lib/site-settings/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = createFileRoute("/backend/site-settings" as any)({
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

  /* Sync from DB once loaded */
  useEffect(() => {
    if (!settings) return;
    setRating(settings.google_rating);
    setReviews(settings.reviews);
    setEstimateHeading(settings.estimate_card_heading);
    setEstimateSubtext(settings.estimate_card_subtext);
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
    </div>
  );
}

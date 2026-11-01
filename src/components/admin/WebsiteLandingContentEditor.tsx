import { useState, useEffect } from "react";
import {
  Save,
  RotateCcw,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Globe,
  Layers,
  Phone,
  HelpCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useWebsiteContent, type WebsiteLandingContent } from "@/lib/cms/landing-content-store";

export function WebsiteLandingContentEditor() {
  const { content, isSaving, updateContent, resetToDefaults } = useWebsiteContent();

  const [form, setForm] = useState<WebsiteLandingContent>(content);

  useEffect(() => {
    setForm(content);
  }, [content]);

  const handleChange = <K extends keyof WebsiteLandingContent>(
    key: K,
    val: WebsiteLandingContent[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateContent(form);
    toast.success("Website landing page content updated live on stonetech.in!");
  };

  const handleReset = async () => {
    if (
      window.confirm(
        "Are you sure you want to reset all website landing page texts to default benchmarks?",
      )
    ) {
      await resetToDefaults();
      toast.success("Reset website content to benchmark copy");
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Top Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <h2 className="text-base font-bold text-foreground">
              Public Website CMS: Landing Page Matter &amp; Copy
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Modify any headline, paragraph, guarantee, metric or address on stonetech.in. Updates
            sync instantly.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="text-xs h-9"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Reset Defaults
          </Button>

          <Button
            type="submit"
            disabled={isSaving}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-9 font-semibold gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{isSaving ? "Saving Live..." : "Save Live Changes"}</span>
          </Button>

          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline px-2"
          >
            <span>View Website</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* 1. HERO SECTION MATTER */}
      <Card className="rounded-2xl border-border shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Globe className="h-4 w-4" />
            </div>
            <CardTitle className="text-sm font-bold">
              Hero Section Matter &amp; Key Metrics
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            The prime opening statement seen by luxury architects, interior designers, and villa
            owners.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Headline Part 1</Label>
              <Input
                value={form.heroTitlePart1}
                onChange={(e) => handleChange("heroTitlePart1", e.target.value)}
                className="text-xs h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Headline Highlight (Gradient Accent)</Label>
              <Input
                value={form.heroTitleHighlight}
                onChange={(e) => handleChange("heroTitleHighlight", e.target.value)}
                className="text-xs h-9 font-bold"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Hero Narrative Paragraph</Label>
            <Textarea
              rows={3}
              value={form.heroDescription}
              onChange={(e) => handleChange("heroDescription", e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="space-y-1 p-2.5 rounded-xl border bg-muted/20">
              <Label className="text-[11px] text-muted-foreground">Metric 1: Clients</Label>
              <Input
                value={form.heroCustomersServed}
                onChange={(e) => handleChange("heroCustomersServed", e.target.value)}
                className="text-xs h-8 font-bold"
              />
            </div>
            <div className="space-y-1 p-2.5 rounded-xl border bg-muted/20">
              <Label className="text-[11px] text-muted-foreground">Metric 2: Warranty</Label>
              <Input
                value={form.heroWarranty}
                onChange={(e) => handleChange("heroWarranty", e.target.value)}
                className="text-xs h-8 font-bold"
              />
            </div>
            <div className="space-y-1 p-2.5 rounded-xl border bg-muted/20">
              <Label className="text-[11px] text-muted-foreground">Metric 3: Pricing Badge</Label>
              <Input
                value={form.heroPricingBadge}
                onChange={(e) => handleChange("heroPricingBadge", e.target.value)}
                className="text-xs h-8 font-bold"
              />
            </div>
            <div className="space-y-1 p-2.5 rounded-xl border bg-muted/20">
              <Label className="text-[11px] text-muted-foreground">Metric 4: Google Rating</Label>
              <Input
                value={form.heroGoogleRating}
                onChange={(e) => handleChange("heroGoogleRating", e.target.value)}
                className="text-xs h-8 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            <div className="space-y-1">
              <Label className="text-[11px]">Benefit Pill 1</Label>
              <Input
                value={form.heroBenefit1}
                onChange={(e) => handleChange("heroBenefit1", e.target.value)}
                className="text-xs h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Benefit Pill 2</Label>
              <Input
                value={form.heroBenefit2}
                onChange={(e) => handleChange("heroBenefit2", e.target.value)}
                className="text-xs h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Benefit Pill 3</Label>
              <Input
                value={form.heroBenefit3}
                onChange={(e) => handleChange("heroBenefit3", e.target.value)}
                className="text-xs h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Benefit Pill 4</Label>
              <Input
                value={form.heroBenefit4}
                onChange={(e) => handleChange("heroBenefit4", e.target.value)}
                className="text-xs h-8"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. SHOWCASE TABS & SECTION HEADERS */}
      <Card className="rounded-2xl border-border shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <Layers className="h-4 w-4" />
            </div>
            <CardTitle className="text-sm font-bold">Showcase Section &amp; Tab Titles</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Controls the interactive product catalogue tab and live installations feed titles.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Showcase Section Title</Label>
              <Input
                value={form.showcaseSectionTitle}
                onChange={(e) => handleChange("showcaseSectionTitle", e.target.value)}
                className="text-xs h-9 font-semibold"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tab 1 Label (Product Catalogue)</Label>
              <Input
                value={form.productsTabTitle}
                onChange={(e) => handleChange("productsTabTitle", e.target.value)}
                className="text-xs h-9"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Showcase Subtitle Description</Label>
              <Textarea
                rows={2}
                value={form.showcaseSectionSubtitle}
                onChange={(e) => handleChange("showcaseSectionSubtitle", e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tab 2 Label (Live Executed Works)</Label>
              <Input
                value={form.installationsTabTitle}
                onChange={(e) => handleChange("installationsTabTitle", e.target.value)}
                className="text-xs h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. WHY US: THE 4 PILLARS */}
      <Card className="rounded-2xl border-border shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <CardTitle className="text-sm font-bold">Why Stone Tech (The 4 Pillars)</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Core reasons why architects and construction clients select Stone Tech Atelier over
            traders.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="space-y-1.5">
            <Label className="text-xs">Why Us Section Header</Label>
            <Input
              value={form.whyUsSectionTitle}
              onChange={(e) => handleChange("whyUsSectionTitle", e.target.value)}
              className="text-xs h-9 font-semibold"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="p-3 rounded-xl border bg-card space-y-2">
              <Label className="text-xs font-bold text-primary">Pillar 1</Label>
              <Input
                value={form.pillar1Title}
                onChange={(e) => handleChange("pillar1Title", e.target.value)}
                placeholder="Title"
                className="text-xs h-8 font-semibold"
              />
              <Textarea
                rows={2}
                value={form.pillar1Desc}
                onChange={(e) => handleChange("pillar1Desc", e.target.value)}
                placeholder="Description"
                className="text-xs"
              />
            </div>

            <div className="p-3 rounded-xl border bg-card space-y-2">
              <Label className="text-xs font-bold text-primary">Pillar 2</Label>
              <Input
                value={form.pillar2Title}
                onChange={(e) => handleChange("pillar2Title", e.target.value)}
                placeholder="Title"
                className="text-xs h-8 font-semibold"
              />
              <Textarea
                rows={2}
                value={form.pillar2Desc}
                onChange={(e) => handleChange("pillar2Desc", e.target.value)}
                placeholder="Description"
                className="text-xs"
              />
            </div>

            <div className="p-3 rounded-xl border bg-card space-y-2">
              <Label className="text-xs font-bold text-primary">Pillar 3</Label>
              <Input
                value={form.pillar3Title}
                onChange={(e) => handleChange("pillar3Title", e.target.value)}
                placeholder="Title"
                className="text-xs h-8 font-semibold"
              />
              <Textarea
                rows={2}
                value={form.pillar3Desc}
                onChange={(e) => handleChange("pillar3Desc", e.target.value)}
                placeholder="Description"
                className="text-xs"
              />
            </div>

            <div className="p-3 rounded-xl border bg-card space-y-2">
              <Label className="text-xs font-bold text-primary">Pillar 4</Label>
              <Input
                value={form.pillar4Title}
                onChange={(e) => handleChange("pillar4Title", e.target.value)}
                placeholder="Title"
                className="text-xs h-8 font-semibold"
              />
              <Textarea
                rows={2}
                value={form.pillar4Desc}
                onChange={(e) => handleChange("pillar4Desc", e.target.value)}
                placeholder="Description"
                className="text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. CONTACT CENTER & ATELIER LOCATIONS */}
      <Card className="rounded-2xl border-border shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Phone className="h-4 w-4" />
            </div>
            <CardTitle className="text-sm font-bold">
              Contact Center, Direct WhatsApp &amp; Quarry Locations
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Official numbers and factory addresses displayed across the footer, quotation softcopy,
            and enquiry popups.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Primary WhatsApp Line</Label>
              <Input
                value={form.contactPhone1}
                onChange={(e) => handleChange("contactPhone1", e.target.value)}
                className="text-xs h-9 font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Secondary Phone</Label>
              <Input
                value={form.contactPhone2}
                onChange={(e) => handleChange("contactPhone2", e.target.value)}
                className="text-xs h-9 font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Official Email Address</Label>
              <Input
                value={form.contactEmail}
                onChange={(e) => handleChange("contactEmail", e.target.value)}
                className="text-xs h-9 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Jaipur Studio &amp; Fabrication Hub</Label>
              <Input
                value={form.contactAddressJaipur}
                onChange={(e) => handleChange("contactAddressJaipur", e.target.value)}
                className="text-xs h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Makrana Marble Quarry Location</Label>
              <Input
                value={form.contactAddressMakrana}
                onChange={(e) => handleChange("contactAddressMakrana", e.target.value)}
                className="text-xs h-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Operating Studio Hours</Label>
            <Input
              value={form.contactHours}
              onChange={(e) => handleChange("contactHours", e.target.value)}
              className="text-xs h-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Floating Save Actions Bar */}
      <div className="sticky bottom-4 z-20 flex items-center justify-between p-3.5 rounded-2xl bg-card/95 backdrop-blur-md border border-border shadow-xl">
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>Super Admin Mode: Changes save to cloud and immediately parse to stonetech.in</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-xs h-9"
          >
            Reset
          </Button>

          <Button
            type="submit"
            disabled={isSaving}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-9 font-semibold gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{isSaving ? "Saving Live..." : "Save Live Changes"}</span>
          </Button>
        </div>
      </div>
    </form>
  );
}

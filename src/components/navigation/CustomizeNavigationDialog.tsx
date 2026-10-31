import { useState, useMemo } from "react";
import { Sliders, Type, Search, RotateCcw, Check, PanelLeft, X, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  useCustomNavRenames,
  useSidebarWidth,
  DEFAULT_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
} from "@/lib/nav/custom-renames";
import { NAV_GROUPS, NAV_ITEMS, type NavGroupId } from "@/lib/nav/config";

interface CustomizeNavigationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WIDTH_PRESETS = [
  { label: "Compact", width: 230, desc: "Minimal space" },
  { label: "Standard", width: 270, desc: "Balanced (Default)" },
  { label: "Wide", width: 310, desc: "Fits longer names" },
  { label: "Extra Wide", width: 360, desc: "Maximum readability" },
];

export function CustomizeNavigationDialog({ open, onOpenChange }: CustomizeNavigationDialogProps) {
  const { t } = useTranslation();
  const { renames, rename, resetAll } = useCustomNavRenames();
  const { width, updateWidth, resetWidth } = useSidebarWidth();
  const [activeTab, setActiveTab] = useState<"tabs" | "width">("tabs");
  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");

  // Local draft for tab renames to allow editing
  const [draftRenames, setDraftRenames] = useState<Record<string, string>>({});

  const filteredItems = useMemo(() => {
    return NAV_ITEMS.filter((item) => {
      if (selectedGroup !== "all" && item.group !== selectedGroup) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const defaultLabel = t(`nav.items.${item.id}`, item.label).toLowerCase();
      const customLabel = (renames[item.id] || "").toLowerCase();
      const groupLabel = (NAV_GROUPS.find((g) => g.id === item.group)?.label || "").toLowerCase();
      return defaultLabel.includes(q) || customLabel.includes(q) || groupLabel.includes(q);
    });
  }, [selectedGroup, search, renames, t]);

  const filteredGroups = useMemo(() => {
    if (selectedGroup !== "all") return [];
    if (!search.trim()) return NAV_GROUPS;
    const q = search.toLowerCase();
    return NAV_GROUPS.filter((g) => {
      const defaultLabel = t(`nav.groups.${g.id}`, g.label).toLowerCase();
      const customLabel = (renames[g.id] || "").toLowerCase();
      return defaultLabel.includes(q) || customLabel.includes(q);
    });
  }, [selectedGroup, search, renames, t]);

  const handleItemRenameChange = (id: string, val: string) => {
    setDraftRenames((prev) => ({ ...prev, [id]: val }));
    rename(id, val);
  };

  const handleGroupRenameChange = (id: string, val: string) => {
    setDraftRenames((prev) => ({ ...prev, [id]: val }));
    rename(id, val);
  };

  const handleResetItem = (id: string) => {
    rename(id, null);
    setDraftRenames((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    toast.success("Reset to original name");
  };

  const handleResetAll = () => {
    if (
      window.confirm(
        "Are you sure you want to reset all customized tab names back to factory defaults?",
      )
    ) {
      resetAll();
      setDraftRenames({});
      toast.success("All tab names restored to defaults");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl border-border/80">
        <DialogHeader className="p-4 pb-3 border-b border-border/60 bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <PanelLeft className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Customize Sidebar &amp; Tabs
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Personalize tab names and manually adjust sidebar width in real time
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "tabs" | "width")}
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="px-4 pt-2.5 pb-2 border-b border-border/50 bg-background/95">
            <TabsList className="grid w-full grid-cols-2 h-9">
              <TabsTrigger value="tabs" className="text-xs font-semibold gap-1.5">
                <Type className="h-3.5 w-3.5" />
                <span>Rename Tabs ({NAV_ITEMS.length} modules)</span>
              </TabsTrigger>
              <TabsTrigger value="width" className="text-xs font-semibold gap-1.5">
                <Sliders className="h-3.5 w-3.5" />
                <span>Sidebar Width ({width}px)</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB 1: RENAME TABS */}
          <TabsContent value="tabs" className="flex-1 flex flex-col min-h-0 m-0 p-0">
            {/* Search & Filter Bar */}
            <div className="p-3 border-b border-border/40 bg-muted/20 flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search tabs, e.g. 'Partners', 'Ledger', 'Quotes'…"
                  className="h-8 pl-8 text-xs bg-background"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="h-8 px-2.5 text-xs font-medium bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Modules &amp; Groups</option>
                {NAV_GROUPS.map((g) => (
                  <option key={g.id} value={g.id}>
                    Group: {t(`nav.groups.${g.id}`, g.label)}
                  </option>
                ))}
              </select>

              {Object.keys(renames).length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetAll}
                  className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                  title="Reset all tab names back to defaults"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset All ({Object.keys(renames).length})
                </Button>
              )}
            </div>

            {/* List of Editable Tabs */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {/* Group section Headers if present */}
              {filteredGroups.length > 0 && (
                <div className="mb-3 space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                    Sidebar Section Groups
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {filteredGroups.map((g) => {
                      const defaultLabel = t(`nav.groups.${g.id}`, g.label);
                      const currentVal = renames[g.id] ?? "";
                      const hasCustom = Boolean(renames[g.id]);
                      const GIcon = g.icon;

                      return (
                        <div
                          key={`group-${g.id}`}
                          className="flex items-center gap-2 p-2 rounded-lg border border-border/70 bg-card hover:border-primary/40 transition-colors"
                        >
                          <GIcon className="h-4 w-4 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                Section: {defaultLabel}
                              </span>
                              {hasCustom && (
                                <Badge
                                  variant="secondary"
                                  className="text-[9px] px-1 py-0 h-4 bg-primary/10 text-primary font-semibold"
                                >
                                  Customized
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Input
                                value={currentVal}
                                onChange={(e) => handleGroupRenameChange(g.id, e.target.value)}
                                placeholder={defaultLabel}
                                className="h-7 text-xs font-semibold"
                              />
                              {hasCustom && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleResetItem(g.id)}
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                                  title="Reset to default group name"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Individual Tabs */}
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1 mt-3">
                Navigation Tabs &amp; Modules
              </div>
              <div className="space-y-1.5">
                {filteredItems.map((item) => {
                  const defaultLabel = t(`nav.items.${item.id}`, item.label);
                  const currentVal = renames[item.id] ?? "";
                  const hasCustom = Boolean(renames[item.id]);
                  const parentGroup = NAV_GROUPS.find((g) => g.id === item.group);
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-2 rounded-lg border border-border/60 bg-card/60 hover:bg-card hover:border-border transition-colors"
                    >
                      <div className="h-8 w-8 rounded-md bg-muted/60 flex items-center justify-center shrink-0 text-muted-foreground">
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-medium text-muted-foreground truncate">
                            Default:{" "}
                            <span className="font-semibold text-foreground">{defaultLabel}</span>
                          </span>
                          {parentGroup && (
                            <span className="text-[10px] text-muted-foreground/80 bg-muted px-1.5 py-0.2 rounded">
                              in {t(`nav.groups.${parentGroup.id}`, parentGroup.label)}
                            </span>
                          )}
                          {hasCustom && (
                            <Badge
                              variant="secondary"
                              className="text-[9px] px-1 py-0 h-4 bg-primary/10 text-primary font-semibold ml-auto"
                            >
                              Renamed
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Input
                            value={currentVal}
                            onChange={(e) => handleItemRenameChange(item.id, e.target.value)}
                            placeholder={defaultLabel}
                            className="h-7 text-xs bg-background"
                          />
                          {hasCustom && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleResetItem(item.id)}
                              className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                              title="Reset tab name to original"
                            >
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredItems.length === 0 && (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    No navigation items found matching "{search}".
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: SIDEBAR WIDTH */}
          <TabsContent value="width" className="p-6 space-y-6 m-0">
            <div>
              <Label className="text-sm font-semibold text-foreground flex items-center justify-between mb-2">
                <span>Manual Sidebar Width Adjustment</span>
                <span className="text-base font-mono font-bold text-primary">{width} px</span>
              </Label>
              <p className="text-xs text-muted-foreground mb-4">
                Drag the slider or click a preset below. You can also drag the right edge of the
                sidebar directly in the live software anytime!
              </p>

              {/* Range Slider */}
              <div className="space-y-2">
                <input
                  type="range"
                  min={MIN_SIDEBAR_WIDTH}
                  max={MAX_SIDEBAR_WIDTH}
                  step={2}
                  value={width}
                  onChange={(e) => updateWidth(Number(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
                  <span>{MIN_SIDEBAR_WIDTH}px (Compact)</span>
                  <span>{DEFAULT_SIDEBAR_WIDTH}px (Default)</span>
                  <span>{MAX_SIDEBAR_WIDTH}px (Maximum)</span>
                </div>
              </div>
            </div>

            {/* Presets */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2.5">
                Quick Size Presets
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {WIDTH_PRESETS.map((p) => {
                  const isCurrent = Math.abs(width - p.width) <= 4;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => updateWidth(p.width)}
                      className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                        isCurrent
                          ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                          : "border-border/80 bg-card hover:bg-muted/40 hover:border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-foreground">{p.label}</span>
                        {isCurrent && <Check className="h-3.5 w-3.5 text-primary" />}
                      </div>
                      <div className="text-[13px] font-mono font-bold text-primary">
                        {p.width} px
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{p.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Helper tips */}
            <div className="p-3.5 rounded-lg border border-primary/20 bg-primary/5 text-xs text-muted-foreground space-y-1.5">
              <div className="font-semibold text-primary flex items-center gap-1.5">
                <PanelLeft className="h-3.5 w-3.5" />
                <span>Live Drag Resizing Tip:</span>
              </div>
              <p>
                Hover your mouse cursor over the <strong>right border</strong> of the sidebar in the
                app. A resize cursor will appear — click and drag to dynamically resize the sidebar
                to your desired width on the fly! Double-click the edge to reset to standard
                (270px).
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="p-3 border-t border-border/60 bg-muted/20 flex items-center justify-between sm:justify-between">
          <span className="text-[11px] text-muted-foreground">
            Changes apply instantly and save automatically.
          </span>
          <Button
            type="button"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs font-semibold px-4"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

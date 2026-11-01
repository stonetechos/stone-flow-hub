import { useState, useMemo } from "react";
import {
  Menu,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Sliders,
  Type,
  ShieldCheck,
  Check,
  PanelLeft,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useCustomNavRenames, useSidebarWidth } from "@/lib/nav/custom-renames";
import { NAV_GROUPS, NAV_ITEMS } from "@/lib/nav/config";

export function SidebarTabsBackend() {
  const { renames, rename, saveAll, resetAll, getLabel } = useCustomNavRenames();
  const { width, updateWidth, resetWidth } = useSidebarWidth();
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Group items by their section
  const sections = useMemo(() => {
    return NAV_GROUPS.map((group) => {
      const groupCustom = drafts[group.id] ?? renames[group.id] ?? "";
      const items = NAV_ITEMS.filter((item) => item.group === group.id).map((item) => ({
        ...item,
        customLabel: drafts[item.id] ?? renames[item.id] ?? "",
      }));

      return {
        ...group,
        customLabel: groupCustom,
        items,
      };
    }).filter((section) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const matchSection =
        section.label.toLowerCase().includes(q) || section.customLabel.toLowerCase().includes(q);
      const matchItem = section.items.some(
        (i) => i.label.toLowerCase().includes(q) || i.customLabel.toLowerCase().includes(q),
      );
      return matchSection || matchItem;
    });
  }, [drafts, renames, search]);

  const totalCustomized = useMemo(() => {
    return Object.keys(renames).filter((k) => renames[k] && renames[k].trim()).length;
  }, [renames]);

  const handleDraftChange = (id: string, value: string) => {
    setDrafts((prev) => ({ ...prev, [id]: value }));
  };

  const handleSaveItem = (id: string, fallback: string) => {
    const val = drafts[id] !== undefined ? drafts[id] : renames[id];
    rename(id, val || null);
    toast.success(`Tab name updated: "${val || fallback}"`);
  };

  const handleResetItem = (id: string, defaultName: string) => {
    rename(id, null);
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    toast.success(`Reset "${defaultName}" to default name`);
  };

  const handleSaveAll = () => {
    setIsSaving(true);
    try {
      const merged = { ...renames, ...drafts };
      // Clean empty keys
      for (const k of Object.keys(merged)) {
        if (!merged[k] || !merged[k].trim()) {
          delete merged[k];
        }
      }
      saveAll(merged);
      setDrafts({});
      toast.success("All sidebar tab renames saved to ERP database!");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetAll = () => {
    if (
      window.confirm("Are you sure you want to reset all sidebar tabs back to factory defaults?")
    ) {
      resetAll();
      setDrafts({});
      toast.success("All sidebar tab names reset to factory defaults");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <Card className="border-cyan-800/40 bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 text-white shadow-md">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                <Sliders className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <span>Sidebar Toolbar Tabs &amp; Navigation Renamer</span>
                  <Badge className="bg-cyan-500/30 text-cyan-200 border-cyan-400/40 text-[10px]">
                    Database Synced
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-cyan-100/70">
                  Customise the names of any sidebar module, category, or tab. Changes are saved to
                  the central ERP database and apply software-wide.
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {totalCustomized > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetAll}
                  className="h-8 text-xs text-rose-300 border-rose-500/30 hover:bg-rose-950/40 bg-transparent"
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Reset All ({totalCustomized})
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleSaveAll}
                disabled={isSaving}
                className="h-8 text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
              >
                <Save className="mr-1.5 h-3.5 w-3.5" />
                Save All Changes
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tabs or sections to rename..."
            className="pl-9 h-9 text-xs sm:text-sm bg-background"
          />
        </div>
        <div className="text-xs text-muted-foreground">
          {totalCustomized > 0 ? (
            <span className="text-cyan-600 font-semibold">{totalCustomized} tabs customized</span>
          ) : (
            <span>All tabs using factory defaults</span>
          )}
        </div>
      </div>

      {/* Sections and Items List */}
      <div className="space-y-6">
        {sections.map((section) => {
          const SectionIcon = section.icon;
          const sectionCurrent =
            drafts[section.id] !== undefined ? drafts[section.id] : renames[section.id] || "";
          const isSectionCustom = !!renames[section.id];

          return (
            <Card key={section.id} className="overflow-hidden border-border/80 shadow-xs">
              <div className="bg-muted/50 px-4 py-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <SectionIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Section:
                      </span>
                      <span className="text-sm font-semibold text-foreground">{section.label}</span>
                      {isSectionCustom && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300"
                        >
                          Renamed
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section Header Rename Input */}
                <div className="flex items-center gap-2">
                  <Input
                    value={sectionCurrent}
                    onChange={(e) => handleDraftChange(section.id, e.target.value)}
                    placeholder={`Rename "${section.label}" section...`}
                    className="h-8 w-60 text-xs bg-background"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleSaveItem(section.id, section.label)}
                    className="h-8 px-2 text-xs text-cyan-600 hover:bg-cyan-50"
                    title="Save this section name"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  {isSectionCustom && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleResetItem(section.id, section.label)}
                      className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                      title="Reset section name"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Child Tabs Table */}
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {section.items.map((item) => {
                    const ItemIcon = item.icon;
                    const itemCurrent =
                      drafts[item.id] !== undefined ? drafts[item.id] : renames[item.id] || "";
                    const isItemCustom = !!renames[item.id];

                    return (
                      <div
                        key={item.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground">
                            <ItemIcon className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-foreground">
                                {item.label}
                              </span>
                              <span className="text-[10px] font-mono text-muted-foreground">
                                ({item.to})
                              </span>
                              {isItemCustom && (
                                <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 text-[9px] px-1.5 py-0">
                                  Custom
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Inline Rename Controls */}
                        <div className="flex items-center gap-2 sm:shrink-0">
                          <Input
                            value={itemCurrent}
                            onChange={(e) => handleDraftChange(item.id, e.target.value)}
                            placeholder={`Rename to... (Default: ${item.label})`}
                            className="h-7 w-56 text-xs bg-background"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSaveItem(item.id, item.label)}
                            className="h-7 px-2 text-xs text-cyan-600 hover:bg-cyan-50"
                            title="Apply name"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          {isItemCustom && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleResetItem(item.id, item.label)}
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                              title="Reset to default name"
                            >
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

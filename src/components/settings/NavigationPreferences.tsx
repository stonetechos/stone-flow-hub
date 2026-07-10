/**
 * Navigation preferences editor. Lets each user reorder the primary
 * sidebar, pin/hide modules, collapse groups, and export/import/reset the
 * whole configuration. Storage is per-user localStorage — no cross-user
 * side effects, no schema changes.
 */
import { useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Download,
  Eye,
  EyeOff,
  GripVertical,
  RefreshCw,
  Star,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  NAV_GROUPS,
  NAV_ITEMS,
  NAV_ITEMS_BY_ID,
  type NavGroupId,
  type NavItemDef,
} from "@/lib/nav/config";
import {
  defaultPreferences,
  resolveNav,
  useNavPreferences,
  type NavPreferences,
} from "@/lib/nav/preferences";

interface DragPayload {
  itemId: string;
  from: "starred" | NavGroupId;
}

export function NavigationPreferences({ isAdmin }: { isAdmin: boolean }) {
  const { prefs, update, replace, reset } = useNavPreferences();
  const [drag, setDrag] = useState<DragPayload | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const resolved = useMemo(() => resolveNav(prefs, isAdmin), [prefs, isAdmin]);
  const collapsedSet = new Set(prefs.collapsedGroups);

  const toggleStar = (id: string): void =>
    update((p) => ({
      ...p,
      starred: p.starred.includes(id) ? p.starred.filter((s) => s !== id) : [...p.starred, id],
    }));

  const toggleHidden = (id: string): void =>
    update((p) => ({
      ...p,
      hidden: p.hidden.includes(id) ? p.hidden.filter((h) => h !== id) : [...p.hidden, id],
      starred: p.hidden.includes(id) ? p.starred : p.starred.filter((s) => s !== id),
    }));

  const toggleCollapse = (gid: NavGroupId): void =>
    update((p) => ({
      ...p,
      collapsedGroups: p.collapsedGroups.includes(gid)
        ? p.collapsedGroups.filter((g) => g !== gid)
        : [...p.collapsedGroups, gid],
    }));

  const moveItem = (payload: DragPayload, target: { to: "starred" | NavGroupId; beforeId?: string }): void => {
    if (payload.from === target.to && !target.beforeId) return;
    update((p) => {
      const starred = [...p.starred];
      const perGroup: Record<NavGroupId, string[]> = {} as Record<NavGroupId, string[]>;
      const effectiveGroup = (itemId: string): NavGroupId => {
        const def = NAV_ITEMS_BY_ID[itemId];
        return p.itemGroupOverrides[itemId] ?? def?.group ?? "others";
      };
      for (const g of NAV_GROUPS) {
        const explicit = p.itemOrderByGroup[g.id] ?? [];
        const catalog = NAV_ITEMS.filter((i) => effectiveGroup(i.id) === g.id).map((i) => i.id);
        perGroup[g.id] = [
          ...explicit.filter((id) => catalog.includes(id)),
          ...catalog.filter((id) => !explicit.includes(id)),
        ];
      }

      if (payload.from === "starred") {
        const idx = starred.indexOf(payload.itemId);
        if (idx >= 0) starred.splice(idx, 1);
      } else {
        const list = perGroup[payload.from];
        const idx = list.indexOf(payload.itemId);
        if (idx >= 0) list.splice(idx, 1);
      }

      const insertInto = (arr: string[]): void => {
        if (target.beforeId) {
          const idx = arr.indexOf(target.beforeId);
          if (idx >= 0) {
            arr.splice(idx, 0, payload.itemId);
            return;
          }
        }
        arr.push(payload.itemId);
      };

      const overrides = { ...p.itemGroupOverrides };
      if (target.to === "starred") {
        insertInto(starred);
      } else {
        insertInto(perGroup[target.to]);
        const def = NAV_ITEMS_BY_ID[payload.itemId];
        if (def && def.group !== target.to) overrides[payload.itemId] = target.to;
        else delete overrides[payload.itemId];
      }

      return {
        ...p,
        starred,
        itemOrderByGroup: perGroup,
        itemGroupOverrides: overrides,
      };
    });
  };

  const moveGroup = (gid: NavGroupId, beforeGid?: NavGroupId): void => {
    update((p) => {
      const order = p.groupOrder.filter((g) => g !== gid);
      if (beforeGid) {
        const idx = order.indexOf(beforeGid);
        order.splice(idx >= 0 ? idx : order.length, 0, gid);
      } else {
        order.push(gid);
      }
      return { ...p, groupOrder: order };
    });
  };

  const onExport = (): void => {
    const blob = new Blob([JSON.stringify(prefs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "navigation-preferences.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Preferences exported");
  };

  const onImportFile = async (file: File): Promise<void> => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<NavPreferences>;
      replace({ ...defaultPreferences(), ...parsed, version: 1 });
      toast.success("Preferences imported");
    } catch {
      toast.error("Could not read that file");
    }
  };

  const onReset = (): void => {
    reset();
    toast.success("Navigation reset to defaults");
  };

  // ---------------- drag-and-drop handlers ----------------

  const onRowDragStart = (payload: DragPayload) => (e: React.DragEvent) => {
    setDrag(payload);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", payload.itemId);
  };
  const onRowDragOver = (e: React.DragEvent): void => {
    if (drag) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    }
  };
  const onRowDrop = (target: { to: "starred" | NavGroupId; beforeId?: string }) => (e: React.DragEvent) => {
    e.preventDefault();
    if (drag) moveItem(drag, target);
    setDrag(null);
  };

  const renderItemRow = (item: NavItemDef, container: "starred" | NavGroupId, starred: boolean) => (
    <li
      key={`${container}-${item.id}`}
      draggable
      onDragStart={onRowDragStart({ itemId: item.id, from: container })}
      onDragOver={onRowDragOver}
      onDrop={onRowDrop({ to: container, beforeId: item.id })}
      className="flex items-center gap-2 rounded-sm border border-border/50 bg-card px-2 py-1.5 text-sm shadow-sm hover:border-border"
    >
      <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" aria-hidden />
      <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="flex-1 truncate">{item.label}</span>
      <button
        type="button"
        onClick={() => toggleStar(item.id)}
        aria-label={starred ? `Unpin ${item.label}` : `Pin ${item.label}`}
        aria-pressed={starred}
        className={cn(
          "rounded-sm p-1 hover:bg-muted",
          starred ? "text-amber-500" : "text-muted-foreground",
        )}
      >
        <Star className={cn("h-3.5 w-3.5", starred && "fill-current")} aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => toggleHidden(item.id)}
        aria-label={`Hide ${item.label}`}
        className="rounded-sm p-1 text-muted-foreground hover:bg-muted"
      >
        <EyeOff className="h-3.5 w-3.5" aria-hidden />
      </button>
    </li>
  );

  return (
    <Card className="shadow-1">
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-sm">Navigation</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Drag to reorder. Star to pin at the top. Hide the modules you never use.
            Preferences are saved only for you.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={onExport}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> Export
          </Button>
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="mr-1.5 h-3.5 w-3.5" /> Import
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onImportFile(file);
              e.target.value = "";
            }}
          />
          <Button size="sm" variant="outline" onClick={onReset}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Reset
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pinned */}
        <section>
          <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Star className="h-3 w-3" /> Pinned
          </h4>
          <ul
            className="min-h-[2.5rem] space-y-1 rounded-sm border border-dashed border-border/60 p-2"
            onDragOver={onRowDragOver}
            onDrop={onRowDrop({ to: "starred" })}
            aria-label="Pinned drop zone"
          >
            {resolved.starred.length === 0 ? (
              <li className="px-1 py-1 text-xs text-muted-foreground">
                Drag modules here — or click the star — to pin them at the top of your sidebar.
              </li>
            ) : (
              resolved.starred.map((item) => renderItemRow(item, "starred", true))
            )}
          </ul>
        </section>

        <Separator />

        {/* Groups */}
        {resolved.groups.map((group) => {
          const collapsed = collapsedSet.has(group.id);
          return (
            <section
              key={group.id}
              onDragOver={(e) => {
                if (drag && drag.from !== group.id) e.preventDefault();
              }}
              onDrop={(e) => {
                if (drag && drag.from !== group.id) {
                  e.preventDefault();
                  moveItem(drag, { to: group.id });
                  setDrag(null);
                }
              }}
            >
              <div
                className="mb-2 flex items-center gap-2"
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/group", group.id)}
                onDragOver={(e) => {
                  if (e.dataTransfer.types.includes("text/group")) e.preventDefault();
                }}
                onDrop={(e) => {
                  const gid = e.dataTransfer.getData("text/group") as NavGroupId;
                  if (gid && gid !== group.id) {
                    e.preventDefault();
                    moveGroup(gid, group.id);
                  }
                }}
              >
                <GripVertical className="h-3.5 w-3.5 cursor-grab text-muted-foreground" aria-hidden />
                <button
                  type="button"
                  onClick={() => toggleCollapse(group.id)}
                  aria-expanded={!collapsed}
                  className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  <ChevronDown
                    className={cn("h-3 w-3 transition-transform", collapsed && "-rotate-90")}
                    aria-hidden
                  />
                  {group.label}
                </button>
                <span className="text-[10px] text-muted-foreground">
                  ({group.items.length})
                </span>
              </div>
              {!collapsed && (
                <ul className="ml-2 space-y-1">
                  {group.items.length === 0 ? (
                    <li className="px-1 py-1 text-xs text-muted-foreground">
                      Empty. Drag modules here.
                    </li>
                  ) : (
                    group.items.map((item) => renderItemRow(item, group.id, false))
                  )}
                </ul>
              )}
            </section>
          );
        })}

        {/* Hidden */}
        {resolved.hidden.length > 0 && (
          <>
            <Separator />
            <section>
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <EyeOff className="h-3 w-3" /> Hidden
              </h4>
              <ul className="space-y-1">
                {resolved.hidden.map((item) => (
                  <li
                    key={`hidden-${item.id}`}
                    className="flex items-center gap-2 rounded-sm border border-border/50 bg-muted/30 px-2 py-1.5 text-sm"
                  >
                    <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="flex-1 truncate text-muted-foreground">{item.label}</span>
                    <button
                      type="button"
                      onClick={() => toggleHidden(item.id)}
                      className="rounded-sm p-1 text-muted-foreground hover:bg-background hover:text-foreground"
                      aria-label={`Show ${item.label}`}
                    >
                      <Eye className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}

        {/* Sanity fallback if all items got hidden */}
        {resolved.starred.length === 0 &&
          resolved.groups.every((g) => g.items.length === 0) && (
            <p className="text-xs text-muted-foreground">
              You've hidden every module. Click{" "}
              <button type="button" onClick={onReset} className="underline">
                Reset
              </button>{" "}
              to bring the default navigation back — or reveal individual modules from the Hidden list above.
            </p>
          )}

        <input type="hidden" data-nav-items-count={NAV_ITEMS_BY_ID ? NAV_ITEMS.length : 0} />
      </CardContent>
    </Card>
  );
}

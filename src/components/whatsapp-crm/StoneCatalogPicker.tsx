import { useState, useMemo } from "react";
import { Search, FileText, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import catalogItems from "@/data/wall-cladding-catalog.json";

interface StoneCatalogPickerProps {
  onInsertText: (text: string) => void;
  onAttachCatalogPdf: (
    type?: "stone" | "glass_bricks" | "hollow_glass_bricks" | "stone_veneer",
  ) => void;
}

export function StoneCatalogPicker({ onInsertText, onAttachCatalogPdf }: StoneCatalogPickerProps) {
  const [search, setSearch] = useState("");
  const [selectedStone, setSelectedStone] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return catalogItems.slice(0, 15);
    const q = search.toLowerCase();
    return catalogItems
      .filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.stoneType?.toLowerCase().includes(q) ||
          item.code?.toLowerCase().includes(q) ||
          item.finishes?.some((f: string) => f.toLowerCase().includes(q)),
      )
      .slice(0, 20);
  }, [search]);

  const handleSelectStone = (item: (typeof catalogItems)[0]) => {
    const finishes = Array.isArray(item.finishes)
      ? item.finishes.slice(0, 3).join(", ")
      : "Natural";
    const sizes = item.standardSizes || "Standard & Bespoke CNC Sizes";
    const textToInsert = `*Stone Tech — ${item.name}*\n• Stone: ${item.stoneType || "Natural Stone"}\n• Finishes: ${finishes}\n• Available Sizes: ${sizes}\n• Thickness: ${item.thickness || "20-30mm"}\n📄 View in catalog: https://stonetech.in/wall-cladding-catalog#${item.slug}`;

    onInsertText(textToInsert);
    setSelectedStone(item.id);
    setTimeout(() => setSelectedStone(null), 1500);
  };

  return (
    <div className="flex flex-col gap-3 p-3 bg-card border rounded-lg shadow-sm text-xs">
      <div className="flex items-center justify-between gap-2 border-b pb-2">
        <div className="flex items-center gap-1.5 font-semibold text-foreground">
          <span>Stone Product Master</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px] gap-1 text-[#015474] border-[#c9d1d4] hover:bg-[#e0f1f5]"
            >
              <FileText className="h-3.5 w-3.5" />
              Attach Catalog PDF
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-68">
            <DropdownMenuItem onClick={() => onAttachCatalogPdf("stone")}>
              <div className="flex flex-col">
                <span className="font-medium text-xs">🏛️ Natural Stone Catalog (71p)</span>
                <span className="text-[10px] text-muted-foreground">
                  Wall claddings, CNC & natural stone
                </span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAttachCatalogPdf("stone_veneer")}>
              <div className="flex flex-col">
                <span className="font-medium text-xs">🌿 Flexible Stone Veneer 2026 (106p)</span>
                <span className="text-[10px] text-muted-foreground">
                  98 Patterns · Slate, Sandstone, Marble & Limestone
                </span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAttachCatalogPdf("glass_bricks")}>
              <div className="flex flex-col">
                <span className="font-medium text-xs">💎 Solid Glass Bricks 2026 (34p)</span>
                <span className="text-[10px] text-muted-foreground">
                  Crystal solid glass brick series
                </span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAttachCatalogPdf("hollow_glass_bricks")}>
              <div className="flex flex-col">
                <span className="font-medium text-xs">🧱 Hollow Glass Bricks 2026 (49p)</span>
                <span className="text-[10px] text-muted-foreground">
                  Clear & In-Color · VetroKwik™ system
                </span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search natural stone (e.g. Gwalior Mint, Agra Red, Teakwood)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 pl-8 text-xs bg-muted/40"
        />
      </div>

      <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-2 rounded-md border bg-background/50 hover:bg-accent/40 transition-colors gap-2"
          >
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={item.image}
                alt={item.name}
                className="w-10 h-10 rounded object-cover border shrink-0 bg-muted"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">{item.name}</p>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                  <Badge variant="outline" className="px-1 py-0 text-[9px] font-normal">
                    {item.stoneType || "Natural Stone"}
                  </Badge>
                  <span>{item.thickness || "20-30mm"}</span>
                </div>
              </div>
            </div>

            <Button
              size="sm"
              variant={selectedStone === item.id ? "default" : "secondary"}
              className="h-7 text-[11px] shrink-0"
              onClick={() => handleSelectStone(item)}
            >
              {selectedStone === item.id ? (
                <>
                  <Check className="h-3 w-3 mr-1" /> Added
                </>
              ) : (
                "Insert Spec"
              )}
            </Button>
          </div>
        ))}

        {filteredItems.length === 0 && (
          <p className="text-center text-muted-foreground py-4 text-[11px]">
            No stone matching "{search}".
          </p>
        )}
      </div>
    </div>
  );
}

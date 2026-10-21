import { useState } from "react";
import { Check, ChevronsUpDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  MASTER_PRODUCT_CATALOG,
  STONE_PRODUCTS_CATALOG,
  ADHESIVES_CATALOG,
  SEALERS_CATALOG,
  SERVICES_CATALOG,
  CARTING_CATALOG,
  type CatalogItem,
} from "@/lib/quotes/catalog";

interface CatalogProductSelectProps {
  value: string;
  onChange: (value: string) => void;
  onSelectCatalogItem?: (item: CatalogItem) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CatalogProductSelect({
  value,
  onChange,
  onSelectCatalogItem,
  placeholder = "Select or enter product…",
  className,
  disabled = false,
}: CatalogProductSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const handleSelect = (item: CatalogItem) => {
    onChange(item.name);
    if (onSelectCatalogItem) {
      onSelectCatalogItem(item);
    }
    setOpen(false);
  };

  const handleCustomInput = (customValue: string) => {
    onChange(customValue);
    setOpen(false);
  };

  return (
    <Popover modal={true} open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal text-left h-9 px-3 bg-white text-xs truncate",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[320px] sm:w-[380px] p-0 shadow-lg"
        align="start"
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <Command>
          <CommandInput
            placeholder="Search stone, adhesive, or sealer…"
            value={search}
            onValueChange={setSearch}
            className="text-xs"
          />
          <CommandList className="max-h-[300px] overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y">
            <CommandEmpty>
              <div className="p-2 text-center text-xs">
                <p className="text-muted-foreground mb-2">No catalog match found</p>
                {search && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-7 text-xs w-full"
                    onClick={() => handleCustomInput(search)}
                  >
                    Use &ldquo;{search}&rdquo;
                  </Button>
                )}
              </div>
            </CommandEmpty>

            <CommandGroup heading="Stone Products & Claddings">
              {STONE_PRODUCTS_CATALOG.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.name}
                  onSelect={() => handleSelect(item)}
                  className="text-xs flex items-center justify-between cursor-pointer"
                >
                  <span className="font-medium">{item.name}</span>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className="rounded bg-slate-100 px-1 py-0.2">{item.defaultUnit}</span>
                    {value === item.name && <Check className="h-3.5 w-3.5 text-primary" />}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandGroup heading="Adhesives">
              {ADHESIVES_CATALOG.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.name}
                  onSelect={() => handleSelect(item)}
                  className="text-xs flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <span className="font-medium">{item.name}</span>
                    {item.defaultPrice && (
                      <span className="ml-1 text-[11px] text-emerald-700">
                        (₹{item.defaultPrice}/{item.defaultUnit})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className="rounded bg-amber-50 text-amber-800 border border-amber-200 px-1 py-0.2">
                      Adhesive
                    </span>
                    {value === item.name && <Check className="h-3.5 w-3.5 text-primary" />}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandGroup heading="Sealers & Repellents">
              {SEALERS_CATALOG.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.name}
                  onSelect={() => handleSelect(item)}
                  className="text-xs flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <span className="font-medium">{item.name}</span>
                    {item.defaultPrice && (
                      <span className="ml-1 text-[11px] text-emerald-700">
                        (₹{item.defaultPrice}/{item.defaultUnit})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className="rounded bg-sky-50 text-sky-800 border border-sky-200 px-1 py-0.2">
                      Sealer
                    </span>
                    {value === item.name && <Check className="h-3.5 w-3.5 text-primary" />}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandGroup heading="Installation & Application Labour">
              {SERVICES_CATALOG.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.name}
                  onSelect={() => handleSelect(item)}
                  className="text-xs flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <span className="font-medium">{item.name}</span>
                    {item.defaultPrice && (
                      <span className="ml-1 text-[11px] text-emerald-700">
                        (₹{item.defaultPrice}/{item.defaultUnit})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className="rounded bg-indigo-50 text-indigo-800 border border-indigo-200 px-1 py-0.2">
                      Labour
                    </span>
                    {value === item.name && <Check className="h-3.5 w-3.5 text-primary" />}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandGroup heading="Transportation & Local Carting">
              {CARTING_CATALOG.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.name}
                  onSelect={() => handleSelect(item)}
                  className="text-xs flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <span className="font-medium">{item.name}</span>
                    {item.defaultPrice ? (
                      <span className="ml-1 text-[11px] text-emerald-700">
                        (₹{item.defaultPrice}/{item.defaultUnit})
                      </span>
                    ) : (
                      <span className="ml-1 text-[11px] text-muted-foreground">(As quoted)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className="rounded bg-amber-50 text-amber-800 border border-amber-200 px-1 py-0.2">
                      Carting
                    </span>
                    {value === item.name && <Check className="h-3.5 w-3.5 text-primary" />}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

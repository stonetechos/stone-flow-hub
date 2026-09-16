import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, X, Star, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { Designation } from "@/lib/workforce/types";

interface DesignationMultiSelectProps {
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  designations: Designation[];
  disabled?: boolean;
  placeholder?: string;
}

export function DesignationMultiSelect({
  selectedIds = [],
  onChange,
  designations = [],
  disabled = false,
  placeholder = "Select designations…",
}: DesignationMultiSelectProps) {
  const [open, setOpen] = useState(false);

  // Map for fast designation lookup
  const designationMap = useMemo(() => {
    const map = new Map<string, Designation>();
    designations.forEach((d) => map.set(d.id, d));
    return map;
  }, [designations]);

  // Selected designation objects in order
  const selectedDesignations = useMemo(() => {
    return selectedIds.map((id) => designationMap.get(id)).filter(Boolean) as Designation[];
  }, [selectedIds, designationMap]);

  const toggleDesignation = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((item) => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const removeDesignation = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    onChange(selectedIds.filter((item) => item !== id));
  };

  const setAsPrimary = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!selectedIds.includes(id)) return;
    const remaining = selectedIds.filter((item) => item !== id);
    onChange([id, ...remaining]);
  };

  return (
    <div className="space-y-2.5">
      {/* Popover trigger button */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between font-normal text-left h-auto min-h-10 py-2 px-3 border-input hover:bg-muted/40"
          >
            <div className="flex items-center gap-2 flex-wrap flex-1 pr-2">
              <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
              {selectedDesignations.length === 0 ? (
                <span className="text-muted-foreground text-sm">{placeholder}</span>
              ) : (
                <span className="text-sm font-medium text-foreground">
                  {selectedDesignations.length === 1
                    ? selectedDesignations[0].name
                    : `${selectedDesignations.length} designations selected`}
                </span>
              )}
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground opacity-70" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[320px] sm:w-[400px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search designation..." className="h-9" />
            <div className="flex items-center justify-between border-b px-3 py-1.5 text-xs text-muted-foreground bg-muted/30">
              <span>{selectedIds.length} selected</span>
              <div className="flex items-center gap-2">
                {selectedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onChange([])}
                    className="text-muted-foreground hover:text-destructive text-xs transition-colors"
                  >
                    Clear all
                  </button>
                )}
                {selectedIds.length < designations.length && (
                  <button
                    type="button"
                    onClick={() => onChange(designations.map((d) => d.id))}
                    className="text-primary hover:underline text-xs transition-colors"
                  >
                    Select all
                  </button>
                )}
              </div>
            </div>
            <CommandList className="max-h-64">
              <CommandEmpty>No designation found.</CommandEmpty>
              <CommandGroup heading="Available Designations">
                {designations.map((d) => {
                  const isSelected = selectedIds.includes(d.id);
                  const isPrimary = selectedIds[0] === d.id;
                  return (
                    <CommandItem
                      key={d.id}
                      value={`${d.name} ${d.code}`}
                      onSelect={() => toggleDesignation(d.id)}
                      className="flex items-center justify-between cursor-pointer py-2 px-3"
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                        <div
                          className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors",
                            isSelected
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-muted-foreground/40 opacity-70",
                          )}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className={cn("text-sm truncate", isSelected && "font-medium")}>
                            {d.name}
                          </span>
                          {d.purpose && (
                            <span className="text-[11px] text-muted-foreground truncate">
                              {d.purpose}
                            </span>
                          )}
                        </div>
                      </div>

                      {isSelected && isPrimary && (
                        <Badge
                          variant="secondary"
                          className="shrink-0 text-[10px] bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300"
                        >
                          Primary
                        </Badge>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected Designation Badges with Primary indicator and Remove buttons */}
      {selectedDesignations.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg border border-border/70 bg-muted/20">
          {selectedDesignations.map((d, index) => {
            const isPrimary = index === 0;
            return (
              <Badge
                key={d.id}
                variant={isPrimary ? "default" : "secondary"}
                className={cn(
                  "gap-1.5 pl-2.5 pr-1.5 py-1 text-xs transition-colors",
                  isPrimary
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800",
                )}
              >
                <span className="font-medium">{d.name}</span>
                {isPrimary ? (
                  <span
                    className="flex items-center gap-0.5 text-[10px] bg-primary-foreground/20 px-1 py-0.5 rounded font-semibold"
                    title="Primary designation used for permissions and reports"
                  >
                    <Star className="h-2.5 w-2.5 fill-current" />
                    Primary
                  </span>
                ) : (
                  !disabled && (
                    <button
                      type="button"
                      onClick={(e) => setAsPrimary(d.id, e)}
                      title="Set as primary designation"
                      className="text-[10px] opacity-70 hover:opacity-100 underline hover:text-blue-700 transition-opacity ml-0.5"
                    >
                      Make primary
                    </button>
                  )
                )}
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => removeDesignation(d.id, e)}
                    className="rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/20 transition-colors ml-0.5"
                    aria-label={`Remove ${d.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}

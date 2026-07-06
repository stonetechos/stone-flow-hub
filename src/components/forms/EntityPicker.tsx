/**
 * <EntityPicker> — Shared SmartSearch picker for customer/project/vendor/product.
 *
 * Replaces bespoke <Select> + list-all-rows pickers with a debounced search,
 * keyboard nav, and inline "+ Create new" that opens <QuickCreateDialog>.
 *
 * Contract:
 *   <EntityPicker
 *     type="customer"
 *     value={id ?? null}
 *     onChange={(id, row) => setId(id)}
 *     filter={{ customerId }}    // project only
 *     allowCreate
 *     placeholder="Select customer"
 *   />
 *
 * Newly-created rows are surfaced everywhere via query-invalidation helpers,
 * so no page refresh is required.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, ChevronsUpDown, Loader2, Plus, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { qk } from "@/lib/query-keys";
import { listCustomers, getCustomer } from "@/lib/customers/api";
import { listVendorsForPicker, getVendor } from "@/lib/vendors/api";
import { listProjectsForPicker, getProject } from "@/lib/projects/api";
import { listProducts, getProduct } from "@/lib/products/api";
import {
  listStoneTypes,
  getStoneType,
  listSurfaceFinishes,
  getSurfaceFinish,
  listEdgeFinishes,
  getEdgeFinish,
  listProductFamilies,
  getProductFamily,
} from "@/lib/masters/api";
import { QuickCreateDialog } from "./QuickCreateDialog";

export type EntityType =
  | "customer"
  | "project"
  | "vendor"
  | "product"
  | "stone_type"
  | "surface_finish"
  | "edge_finish"
  | "product_family";

export interface EntityPickerFilter {
  /** Project-only: constrain projects to a given customer. */
  customerId?: string | null;
}

export interface EntityRow {
  id: string;
  label: string;
  sublabel?: string | null;
}

interface EntityPickerProps {
  type: EntityType;
  value: string | null | undefined;
  onChange: (id: string | null, row?: EntityRow) => void;
  filter?: EntityPickerFilter;
  allowCreate?: boolean;
  allowClear?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  /** Optional pre-fill for the QuickCreate form (e.g. customer_id on New Project). */
  createDefaults?: Record<string, unknown>;
}

/** Debounce a value by ms. */
function useDebounced<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return v;
}

function toRow(type: EntityType, r: any): EntityRow {
  switch (type) {
    case "customer":
      return { id: r.id, label: r.name, sublabel: [r.customer_code, r.primary_phone, r.city].filter(Boolean).join(" · ") };
    case "vendor":
      return { id: r.id, label: r.company_name, sublabel: [r.vendor_code, r.city].filter(Boolean).join(" · ") };
    case "project":
      return { id: r.id, label: r.name, sublabel: [r.project_code, r.customer?.name, r.city].filter(Boolean).join(" · ") };
    case "product":
      return { id: r.id, label: r.name, sublabel: [r.product_code, r.stone_type, r.finish].filter(Boolean).join(" · ") };
    case "stone_type":
      return { id: r.id, label: r.name, sublabel: [r.code, r.mohs_hardness ? `Mohs ${r.mohs_hardness}` : null].filter(Boolean).join(" · ") };
    case "surface_finish":
      return { id: r.id, label: r.name, sublabel: [r.code, r.anti_slip ? "anti-slip" : null].filter(Boolean).join(" · ") };
    case "edge_finish":
      return { id: r.id, label: r.name, sublabel: [r.code, r.machine_required ? "machine" : "hand"].filter(Boolean).join(" · ") };
    case "product_family":
      return { id: r.id, label: r.name, sublabel: [r.code, r.default_uom].filter(Boolean).join(" · ") };
  }
}


const LABEL: Record<EntityType, { singular: string; placeholder: string }> = {
  customer: { singular: "customer", placeholder: "Select customer" },
  vendor: { singular: "vendor", placeholder: "Select vendor" },
  project: { singular: "project", placeholder: "Select project" },
  product: { singular: "product", placeholder: "Select product" },
  stone_type: { singular: "stone type", placeholder: "Select stone" },
  surface_finish: { singular: "surface finish", placeholder: "Select finish" },
  edge_finish: { singular: "edge finish", placeholder: "Select edge" },
  product_family: { singular: "product family", placeholder: "Select family" },
};

export function EntityPicker({
  type,
  value,
  onChange,
  filter,
  allowCreate = true,
  allowClear = true,
  disabled,
  placeholder,
  className,
  createDefaults,
}: EntityPickerProps) {
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query, 250);

  const listQuery = useQuery({
    queryKey: pickerKey(type, debounced, filter),
    queryFn: () => fetchList(type, debounced, filter),
    enabled: open,
    staleTime: 30_000,
  });

  // Resolve the label for the currently-selected value even when it's not in the list.
  const selectedQuery = useQuery({
    queryKey: byIdKey(type, value ?? ""),
    queryFn: () => fetchById(type, value!),
    enabled: !!value,
    staleTime: 60_000,
  });

  const rows: EntityRow[] = useMemo(
    () => (listQuery.data ?? []).map((r) => toRow(type, r)),
    [listQuery.data, type],
  );

  const selectedRow: EntityRow | null = useMemo(() => {
    if (!value) return null;
    if (selectedQuery.data) return toRow(type, selectedQuery.data);
    const found = rows.find((r) => r.id === value);
    return found ?? { id: value, label: "…", sublabel: null };
  }, [value, selectedQuery.data, rows, type]);

  const triggerLabel: ReactNode = selectedRow ? (
    <span className="flex flex-col items-start truncate text-left">
      <span className="truncate">{selectedRow.label}</span>
      {selectedRow.sublabel ? (
        <span className="truncate text-xs text-muted-foreground">{selectedRow.sublabel}</span>
      ) : null}
    </span>
  ) : (
    <span className="text-muted-foreground">{placeholder ?? LABEL[type].placeholder}</span>
  );

  return (
    <>
      <div className={cn("relative", className)}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={disabled}
              className={cn(
                "w-full justify-between font-normal",
                selectedRow ? "h-auto min-h-10 py-2" : "",
              )}
            >
              {triggerLabel}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder={`Search ${LABEL[type].singular}…`}
                value={query}
                onValueChange={setQuery}
              />
              <CommandList>
                {listQuery.isLoading ? (
                  <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                  </div>
                ) : (
                  <CommandEmpty>No {LABEL[type].singular}s found.</CommandEmpty>
                )}
                {rows.length > 0 && (
                  <CommandGroup>
                    {rows.map((r) => (
                      <CommandItem
                        key={r.id}
                        value={r.id}
                        onSelect={() => {
                          onChange(r.id, r);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            r.id === value ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <span className="flex flex-col">
                          <span>{r.label}</span>
                          {r.sublabel ? (
                            <span className="text-xs text-muted-foreground">{r.sublabel}</span>
                          ) : null}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {allowCreate && (
                  <>
                    <CommandSeparator />
                    <CommandGroup>
                      <CommandItem
                        value="__create__"
                        onSelect={() => {
                          setOpen(false);
                          setCreateOpen(true);
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create new {LABEL[type].singular}
                        {query.trim() ? ` “${query.trim()}”` : ""}
                      </CommandItem>
                    </CommandGroup>
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {allowClear && value && !disabled ? (
          <button
            type="button"
            aria-label="Clear selection"
            onClick={() => onChange(null)}
            className="absolute right-9 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      {allowCreate ? (
        <QuickCreateDialog
          type={type}
          open={createOpen}
          onOpenChange={setCreateOpen}
          initialName={query.trim() || undefined}
          defaults={createDefaults}
          onCreated={(row) => {
            const r = toRow(type, row);
            onChange(r.id, r);
            setQuery("");
          }}
        />
      ) : null}
    </>
  );
}

function pickerKey(type: EntityType, q: string, filter?: EntityPickerFilter) {
  switch (type) {
    case "customer":
      return qk.customers.picker(q);
    case "vendor":
      return qk.vendors.picker(q);
    case "project":
      return qk.projects.picker(q, filter?.customerId ?? null);
    case "product":
      return qk.products.picker(q);
  }
}

function byIdKey(type: EntityType, id: string) {
  switch (type) {
    case "customer":
      return qk.customers.byId(id);
    case "vendor":
      return qk.vendors.byId(id);
    case "project":
      return qk.projects.byId(id);
    case "product":
      return ["products", "byId", id] as const;
  }
}

async function fetchList(type: EntityType, q: string, filter?: EntityPickerFilter) {
  switch (type) {
    case "customer":
      return listCustomers(q);
    case "vendor":
      return listVendorsForPicker(q);
    case "project":
      return listProjectsForPicker({ query: q, customerId: filter?.customerId ?? undefined });
    case "product":
      return listProducts(q);
  }
}

async function fetchById(type: EntityType, id: string) {
  switch (type) {
    case "customer":
      return getCustomer(id);
    case "vendor":
      return getVendor(id);
    case "project":
      return getProject(id);
    case "product":
      return getProduct(id);
  }
}

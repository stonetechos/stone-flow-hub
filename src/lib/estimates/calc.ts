/**
 * Estimation Studio — pure calculation engine.
 * Consumed both client-side (live preview) and mirrored server-side by the
 * `recalc_estimate_totals` trigger in the database. Keep these two in sync.
 */
import type { CostComponentKind, EstimateItemCategoryKey } from "./templates";

export interface CalcItem {
  category: EstimateItemCategoryKey;
  quantity: number;
  unit_price: number;
  tax_pct: number;
}

export interface CalcComponent {
  kind: CostComponentKind;
  quantity: number;
  unit_price: number;
}

export interface CalcInput {
  items: CalcItem[];
  components: CalcComponent[];
  margin_pct: number;
  gst_pct: number;
}

export interface CalcResult {
  material_cost: number;
  manufacturing_cost: number;
  installation_cost: number;
  other_cost: number;
  adhesives_cost: number;
  chemicals_cost: number;
  sealer_cost: number;
  packing_cost: number;
  freight_cost: number;
  components_other_cost: number;
  subtotal: number;
  margin_amount: number;
  gst_amount: number;
  total: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function calcLineTotal(item: CalcItem): number {
  return round2(item.quantity * item.unit_price * (1 + item.tax_pct / 100));
}

export function calcComponentAmount(c: CalcComponent): number {
  return round2(c.quantity * c.unit_price);
}

export function calcEstimate(input: CalcInput): CalcResult {
  const buckets = {
    material: 0,
    manufacturing: 0,
    installation: 0,
    consumable: 0,
    other: 0,
  } as Record<EstimateItemCategoryKey, number>;

  for (const it of input.items) {
    buckets[it.category] += calcLineTotal(it);
  }

  const comps: Record<CostComponentKind, number> = {
    adhesives: 0,
    chemicals: 0,
    sealer: 0,
    packing: 0,
    freight: 0,
    other: 0,
  };
  for (const c of input.components) {
    comps[c.kind] += calcComponentAmount(c);
  }

  const other_items = buckets.consumable + buckets.other;
  const subtotal = round2(
    buckets.material +
      buckets.manufacturing +
      buckets.installation +
      other_items +
      comps.adhesives +
      comps.chemicals +
      comps.sealer +
      comps.packing +
      comps.freight +
      comps.other,
  );
  const margin_amount = round2((subtotal * input.margin_pct) / 100);
  const gst_amount = round2(((subtotal + margin_amount) * input.gst_pct) / 100);
  const total = round2(subtotal + margin_amount + gst_amount);

  return {
    material_cost: round2(buckets.material),
    manufacturing_cost: round2(buckets.manufacturing),
    installation_cost: round2(buckets.installation),
    other_cost: round2(other_items),
    adhesives_cost: comps.adhesives,
    chemicals_cost: comps.chemicals,
    sealer_cost: comps.sealer,
    packing_cost: comps.packing,
    freight_cost: comps.freight,
    components_other_cost: comps.other,
    subtotal,
    margin_amount,
    gst_amount,
    total,
  };
}

/**
 * Quote Comparison — pure matching/diff logic.
 *
 * Kept separate from the UI so the line-item matching and
 * difference-detection rules are unit-testable without rendering
 * anything. Line items are matched across quotes by `product_id` when
 * a line has one, falling back to a normalized (trimmed,
 * lower-cased, whitespace-collapsed) match on `description` — the
 * create/edit quote forms don't have a product picker wired up, so
 * `product_id` is frequently null in practice and description is the
 * only field guaranteed to carry real data.
 */
import type { QuoteItemRow, QuoteListItem } from "./api";

export interface ComparedQuote {
  quote: QuoteListItem;
  items: QuoteItemRow[];
}

export interface LineItemValue {
  quantity: number;
  unit: string | null;
  unitPrice: number;
  lineTotal: number;
}

export interface ComparisonLineItem {
  key: string;
  label: string;
  /** One entry per quote, in the same order as the quotes array passed in; null = no matching line on that quote. */
  values: Array<LineItemValue | null>;
}

export function normalizeDescription(desc: string): string {
  return desc.trim().toLowerCase().replace(/\s+/g, " ");
}

export function lineItemKey(item: Pick<QuoteItemRow, "product_id" | "description">): string {
  return item.product_id ? `p:${item.product_id}` : `d:${normalizeDescription(item.description)}`;
}

/**
 * Aligns line items from 2-4 quotes into comparison rows, preserving
 * first-appearance order across the quotes. `productNameById` is used
 * to label a product-linked row by the product's real name instead of
 * whatever free-text description happened to be typed for it.
 */
export function buildLineItemComparison(
  quotes: ComparedQuote[],
  productNameById: Map<string, string>,
): ComparisonLineItem[] {
  const order: string[] = [];
  const labelByKey = new Map<string, string>();
  const valuesByKey = new Map<string, Map<string, LineItemValue>>();

  for (const { quote, items } of quotes) {
    for (const it of items) {
      const key = lineItemKey(it);
      if (!valuesByKey.has(key)) {
        valuesByKey.set(key, new Map());
        order.push(key);
        labelByKey.set(
          key,
          it.product_id ? (productNameById.get(it.product_id) ?? it.description) : it.description,
        );
      }
      valuesByKey.get(key)!.set(quote.id, {
        quantity: Number(it.quantity ?? 0),
        unit: it.unit,
        unitPrice: Number(it.unit_price ?? 0),
        lineTotal: Number(it.line_total ?? 0),
      });
    }
  }

  return order.map((key) => ({
    key,
    label: labelByKey.get(key) ?? "Unknown item",
    values: quotes.map(({ quote }) => valuesByKey.get(key)!.get(quote.id) ?? null),
  }));
}

/**
 * True when 2+ non-null values are present and at least one differs
 * from the others (compared via JSON string equality after applying
 * `selector`). Used to decide whether a comparison row/cell should be
 * flagged as a difference. A single present value (or zero) is never
 * "different" — there's nothing to differ from.
 */
export function valuesDiffer<T>(
  values: Array<T | null | undefined>,
  selector: (v: T) => unknown = (v) => v,
): boolean {
  const present = values.filter((v): v is T => v !== null && v !== undefined).map(selector);
  if (present.length < 2) return false;
  const first = JSON.stringify(present[0]);
  return present.some((v) => JSON.stringify(v) !== first);
}

/**
 * Quote Comparison Dialog.
 *
 * Side-by-side comparison of 2-4 quotes selected from the Quotes list.
 * Reuses the project's standard Table and Dialog components rather
 * than introducing anything new — matched line items are computed by
 * the pure logic in `lib/quotes/compareUtils.ts`, and every number
 * shown is read directly from `quotes`/`quote_items`/`products`, never
 * inferred. Differing values are highlighted against the first
 * selected quote so a reviewer can see at a glance what changed.
 */
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { toUserMessage } from "@/lib/errors";
import { formatInr } from "@/lib/format";
import { getQuote, getQuoteItems, type QuoteListItem } from "@/lib/quotes/api";
import { getProductsByIds } from "@/lib/products/api";
import {
  buildLineItemComparison,
  valuesDiffer,
  type ComparedQuote,
} from "@/lib/quotes/compareUtils";
import { cn } from "@/lib/utils";

async function loadComparisonData(quoteIds: string[]): Promise<ComparedQuote[]> {
  const results = await Promise.all(
    quoteIds.map(async (id) => {
      const quote = await getQuote(id);
      if (!quote) return null;
      const items = await getQuoteItems(id);
      return { quote, items };
    }),
  );
  const found = results.filter((r): r is ComparedQuote => r !== null);
  // Preserve the order the caller selected them in, not whatever order the fetches resolved.
  return quoteIds
    .map((id) => found.find((r) => r.quote.id === id))
    .filter((r): r is ComparedQuote => r !== undefined);
}

export function QuoteComparisonDialog({
  quoteIds,
  onOpenChange,
}: {
  quoteIds: string[];
  onOpenChange: (open: boolean) => void;
}) {
  const open = quoteIds.length >= 2 && quoteIds.length <= 4;

  const q = useQuery({
    queryKey: ["quotes", "compare", ...quoteIds],
    queryFn: () => loadComparisonData(quoteIds),
    enabled: open,
  });

  const productIds = Array.from(
    new Set(
      (q.data ?? []).flatMap(({ items }) =>
        items.map((it) => it.product_id).filter((id): id is string => !!id),
      ),
    ),
  );
  const products = useQuery({
    queryKey: ["products", "by-ids", ...productIds],
    queryFn: () => getProductsByIds(productIds),
    enabled: open && productIds.length > 0,
  });
  const productNameById = new Map((products.data ?? []).map((p) => [p.id, p.name]));

  const lineItems =
    q.data && (!productIds.length || products.data)
      ? buildLineItemComparison(q.data, productNameById)
      : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compare {quoteIds.length} quotes</DialogTitle>
        </DialogHeader>

        {q.isLoading ? (
          <LoadingBlock />
        ) : q.error ? (
          <ErrorBlock message={toUserMessage(q.error)} onRetry={() => q.refetch()} />
        ) : q.data && q.data.length >= 2 ? (
          <div className="space-y-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Quote</TableHead>
                  {q.data.map(({ quote }) => (
                    <TableHead key={quote.id}>
                      <span className="font-mono text-xs text-primary">{quote.quote_no}</span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <HeaderRow
                  label="Customer"
                  quotes={q.data}
                  selector={(quote) => quote.customer?.name ?? "—"}
                  render={(quote) => quote.customer?.name ?? "—"}
                />
                <HeaderRow
                  label="Project"
                  quotes={q.data}
                  selector={(quote) => quote.project?.name ?? "—"}
                  render={(quote) => quote.project?.name ?? "—"}
                />
                <HeaderRow
                  label="Status"
                  quotes={q.data}
                  selector={(quote) => quote.status}
                  render={(quote) => (
                    <Badge variant="outline" className="capitalize">
                      {quote.status}
                    </Badge>
                  )}
                />
                <HeaderRow
                  label="Date"
                  quotes={q.data}
                  selector={(quote) => quote.issue_date}
                  render={(quote) => quote.issue_date}
                />
                <HeaderRow
                  label="Total"
                  quotes={q.data}
                  selector={(quote) => quote.total}
                  render={(quote) => formatInr(quote.total)}
                  bold
                />
              </TableBody>
            </Table>

            <div>
              <div className="mb-1.5 text-xs font-medium uppercase text-muted-foreground">
                Line items
              </div>
              {lineItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No line items on any selected quote.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      {q.data.map(({ quote }) => (
                        <TableHead key={quote.id} className="text-right">
                          {quote.quote_no}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((li) => {
                      const qtyDiffers = valuesDiffer(li.values, (v) => v.quantity);
                      const unitDiffers = valuesDiffer(li.values, (v) => v.unit);
                      const priceDiffers = valuesDiffer(li.values, (v) => v.unitPrice);
                      const totalDiffers = valuesDiffer(li.values, (v) => v.lineTotal);
                      const presenceDiffers =
                        li.values.some((v) => v === null) && li.values.some((v) => v !== null);
                      return (
                        <TableRow key={li.key}>
                          <TableCell>{li.label}</TableCell>
                          {li.values.map((v, i) => (
                            <TableCell key={i} className="text-right tabular-nums">
                              {v ? (
                                <div
                                  className={cn(
                                    "space-y-0.5",
                                    (qtyDiffers || unitDiffers || priceDiffers || totalDiffers) &&
                                      "rounded-sm bg-warning/10 px-1.5 py-1",
                                  )}
                                >
                                  <div className={cn(qtyDiffers && "font-semibold text-warning")}>
                                    {v.quantity} {v.unit ?? ""}
                                  </div>
                                  <div
                                    className={cn(
                                      "text-xs text-muted-foreground",
                                      priceDiffers && "font-semibold text-warning",
                                    )}
                                  >
                                    @ {formatInr(v.unitPrice)}
                                  </div>
                                  <div className={cn(totalDiffers && "font-semibold text-warning")}>
                                    {formatInr(v.lineTotal)}
                                  </div>
                                </div>
                              ) : (
                                <span
                                  className={cn(
                                    "text-xs italic text-muted-foreground",
                                    presenceDiffers && "rounded-sm bg-warning/10 px-1.5 py-1",
                                  )}
                                >
                                  not on this quote
                                </span>
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Highlighted cells differ from at least one other selected quote.
            </p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function HeaderRow({
  label,
  quotes,
  selector,
  render,
  bold,
}: {
  label: string;
  quotes: ComparedQuote[];
  selector: (quote: QuoteListItem) => unknown;
  render: (quote: QuoteListItem) => React.ReactNode;
  bold?: boolean;
}) {
  const differs = valuesDiffer(
    quotes.map(({ quote }) => quote),
    selector,
  );
  return (
    <TableRow>
      <TableCell className="text-xs text-muted-foreground">{label}</TableCell>
      {quotes.map(({ quote }) => (
        <TableCell
          key={quote.id}
          className={cn(
            bold && "font-semibold",
            differs && "rounded-sm bg-warning/10 font-semibold text-warning",
          )}
        >
          {render(quote)}
        </TableCell>
      ))}
    </TableRow>
  );
}

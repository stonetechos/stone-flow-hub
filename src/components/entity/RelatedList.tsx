/** Generic related-records list used inside entity Hub tabs. */
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { LinkProps } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toUserMessage } from "@/lib/errors";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";

export interface RelatedColumn<T> {
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
}

export function RelatedList<T extends { id: string }>({
  title,
  queryKey,
  queryFn,
  columns,
  linkFor,
  emptyMessage = "Nothing here yet.",
}: {
  title: string;
  queryKey: readonly unknown[];
  queryFn: () => Promise<T[]>;
  columns: RelatedColumn<T>[];
  linkFor?: (row: T) => LinkProps | null;
  emptyMessage?: string;
}) {
  const q = useQuery({ queryKey, queryFn });

  return (
    <Card className="shadow-1">
      <CardHeader><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent>
        {q.isLoading ? (
          <LoadingBlock />
        ) : q.error ? (
          <ErrorBlock message={toUserMessage(q.error)} onRetry={() => q.refetch()} />
        ) : (q.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((c) => <TableHead key={c.header} className={c.className}>{c.header}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {q.data!.map((row) => {
                  const link = linkFor?.(row);
                  return (
                    <TableRow key={row.id}>
                      {columns.map((c, i) => (
                        <TableCell key={c.header} className={c.className}>
                          {i === 0 && link ? (
                            <Link {...link} className="text-primary underline-offset-2 hover:underline">
                              {c.cell(row)}
                            </Link>
                          ) : c.cell(row)}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PlaceholderTab({ message }: { message: string }) {
  return (
    <Card className="shadow-1">
      <CardContent className="py-8 text-center text-sm text-muted-foreground">
        {message}
      </CardContent>
    </Card>
  );
}

export function InfoGrid({ items }: { items: Array<{ label: string; value: React.ReactNode }> }) {
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      {items.map((it) => (
        <div key={it.label}>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">{it.label}</dt>
          <dd className="mt-0.5">{it.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

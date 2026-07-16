/**
 * Slab Register — hierarchical tree view of raw stone inventory.
 * Groups inventory_items by Block → Lot → Slab so the workshop can see
 * exactly which blocks are still available, which lots are open, and
 * which slabs are on hand or already consumed.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, ChevronDown, Layers, Boxes, Slice, Warehouse } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { cn } from "@/lib/utils";
import { toUserMessage } from "@/lib/errors";

export const Route = createFileRoute("/_authenticated/inventory/slabs")({
  ssr: false,
  component: SlabRegisterPage,
});

type Slab = {
  id: string;
  stock_code: string;
  block_no: string | null;
  lot_no: string | null;
  slab_no: string | null;
  size_length_mm: number | null;
  size_width_mm: number | null;
  thickness_mm: number | null;
  quantity_on_hand: number;
  unit: string | null;
  location: string | null;
  origin_country: string | null;
  arrival_date: string | null;
  products: { id: string; name: string; product_code: string } | null;
};

function SlabRegisterPage() {
  const [search, setSearch] = useState("");
  const q = useQuery({
    queryKey: ["inventory", "slabs"],
    queryFn: async (): Promise<Slab[]> => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select(
          "id, stock_code, block_no, lot_no, slab_no, size_length_mm, size_width_mm, thickness_mm, quantity_on_hand, unit, location, origin_country, arrival_date, products(id,name,product_code)",
        )
        .order("block_no", { ascending: true, nullsFirst: false })
        .order("lot_no", { ascending: true, nullsFirst: false })
        .order("slab_no", { ascending: true, nullsFirst: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as unknown as Slab[];
    },
  });

  const tree = useMemo(() => buildTree(q.data ?? [], search.trim().toLowerCase()), [q.data, search]);

  return (
    <div>
      <PageHeader
        title="Slab Register"
        subtitle="Block → Lot → Slab hierarchy for the raw stone yard."
        actions={
          <Input
            placeholder="Search block / lot / slab / stone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
        }
      />

      {q.isLoading ? (
        <SkeletonTable />
      ) : q.isError ? (
        <ErrorBlock message={toUserMessage(q.error)} onRetry={() => void q.refetch()} />
      ) : tree.length === 0 ? (
        <EmptyState
          icon={<Warehouse className="h-6 w-6" />}
          title="No slabs recorded yet"
          message="Slabs added under Inventory with Block / Lot / Slab numbers will appear here."
        />
      ) : (
        <Card className="p-3">
          <ul className="space-y-1">
            {tree.map((b) => (
              <BlockNode key={b.key} node={b} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

type Node<T> = { key: string; label: string; count: number; qty: number; children: T[] };
type LotNode = Node<Slab> & { label: string };
type BlockNodeT = Node<LotNode>;

function buildTree(rows: Slab[], q: string): BlockNodeT[] {
  const filtered = q
    ? rows.filter((r) =>
        [r.block_no, r.lot_no, r.slab_no, r.stock_code, r.products?.name, r.origin_country]
          .filter(Boolean)
          .some((v) => (v as string).toLowerCase().includes(q)),
      )
    : rows;

  const blocks = new Map<string, Map<string, Slab[]>>();
  for (const r of filtered) {
    const b = r.block_no ?? "(no block)";
    const l = r.lot_no ?? "(no lot)";
    if (!blocks.has(b)) blocks.set(b, new Map());
    const lots = blocks.get(b)!;
    if (!lots.has(l)) lots.set(l, []);
    lots.get(l)!.push(r);
  }

  const result: BlockNodeT[] = [];
  for (const [bLabel, lots] of blocks) {
    const lotNodes: LotNode[] = [];
    let bQty = 0;
    let bCount = 0;
    for (const [lLabel, slabs] of lots) {
      const qty = slabs.reduce((a, s) => a + Number(s.quantity_on_hand || 0), 0);
      bQty += qty;
      bCount += slabs.length;
      lotNodes.push({
        key: `${bLabel}::${lLabel}`,
        label: lLabel,
        count: slabs.length,
        qty,
        children: slabs,
      });
    }
    result.push({ key: bLabel, label: bLabel, count: bCount, qty: bQty, children: lotNodes });
  }
  return result.sort((a, b) => a.label.localeCompare(b.label));
}

function BlockNode({ node }: { node: BlockNodeT }) {
  const [open, setOpen] = useState(true);
  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((x) => !x)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        <Layers className="h-4 w-4 shrink-0 text-primary" />
        <span className="min-w-0 flex-1 truncate font-display font-semibold">
          Block {node.label}
        </span>
        <Badge variant="secondary" className="ml-auto shrink-0">
          {node.children.length} lots · {node.count} slabs · {node.qty.toFixed(1)}
        </Badge>
      </button>
      {open && (
        <ul className="ml-6 mt-1 space-y-1 border-l pl-3">
          {node.children.map((l) => (
            <LotNodeView key={l.key} node={l} />
          ))}
        </ul>
      )}
    </li>
  );
}

function LotNodeView({ node }: { node: LotNode }) {
  const [open, setOpen] = useState(false);
  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((x) => !x)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition-colors hover:bg-accent"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        <Boxes className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate font-medium">Lot {node.label}</span>
        <Badge variant="outline" className="ml-auto shrink-0">
          {node.count} slabs · {node.qty.toFixed(1)}
        </Badge>
      </button>
      {open && (
        <ul className="ml-6 mt-1 space-y-0.5 border-l pl-3 text-sm">
          {node.children.map((s) => (
            <li key={s.id}>
              <Link
                to="/inventory/$id"
                params={{ id: s.id }}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1 transition-colors",
                  "hover:bg-accent hover:text-foreground",
                  s.quantity_on_hand <= 0 && "opacity-60",
                )}
              >
                <Slice className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="shrink-0 font-mono text-xs">{s.slab_no ?? s.stock_code}</span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                  {s.products?.name ?? "—"}
                  {s.size_length_mm && s.size_width_mm
                    ? ` · ${s.size_length_mm}×${s.size_width_mm}${s.thickness_mm ? `×${s.thickness_mm}` : ""}mm`
                    : ""}
                  {s.location ? ` · ${s.location}` : ""}
                </span>
                <span className="ml-auto shrink-0 text-xs tabular-nums">
                  {Number(s.quantity_on_hand).toFixed(1)} {s.unit ?? ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, PackageSearch, ExternalLink } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QuickForm } from "@/components/forms/QuickForm";
import { Field } from "@/components/forms/Field";
import { RowActions } from "@/components/data/RowActions";
import { SafeDeleteDialog } from "@/components/mdm/SafeDeleteDialog";
import { DataToolbar } from "@/components/data/DataToolbar";
import { DataTableShell } from "@/components/data/DataTableShell";
import { TablePagination } from "@/components/data/Pagination";
import { ColumnsMenu, type ColumnDef } from "@/components/data/ColumnsMenu";
import { DensityMenu } from "@/components/data/DensityMenu";
import { useTablePrefs } from "@/hooks/use-table-prefs";
import { qk } from "@/lib/query-keys";
import { invalidateProduct, seedPickerCache } from "@/lib/query-invalidation";
import { toUserMessage } from "@/lib/errors";
import {
  createProduct,
  deleteProduct,
  listProducts,
  listProductCategories,
  updateProduct,
  type ProductRow,
} from "@/lib/products/api";
import {
  PRODUCT_UNITS,
  STONE_TYPES,
  STONE_FINISHES,
  productCreateSchema,
  type ProductCreateInput,
} from "@/lib/products/schema";

export const Route = createFileRoute("/_authenticated/products/")({
  ssr: false,
  component: ProductsPage,
  validateSearch: (s: Record<string, unknown>): { edit?: string } =>
    typeof s.edit === "string" ? { edit: s.edit } : {},
});

function ProductsPage() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const { edit } = Route.useSearch();
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 250);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [toDelete, setToDelete] = useState<ProductRow | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { prefs, setDensity, toggleColumn, isHidden } = useTablePrefs("products");

  const columnDefs: ColumnDef[] = useMemo(
    () => [
      { key: "code", label: "Code", required: true },
      { key: "name", label: "Name", required: true },
      { key: "stone", label: "Stone" },
      { key: "finish", label: "Finish" },
      { key: "unit", label: "Unit" },
      { key: "thickness", label: "Thickness (mm)" },
    ],
    [],
  );

  const query = useQuery({ queryKey: qk.products.list(dq), queryFn: () => listProducts(dq) });
  useEffect(() => setPage(1), [dq]);

  useEffect(() => {
    if (!edit) return;
    const row = (query.data ?? []).find((r) => r.id === edit);
    if (row) {
      setEditing(row);
      setFormOpen(true);
      nav({ to: "/products", search: {}, replace: true });
    }
  }, [edit, query.data, nav]);

  const delMut = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      toast.success("Product deleted");
      invalidateProduct(qc);
      setToDelete(null);
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const rows = query.data ?? [];
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <div>
      <PageHeader title="Products" subtitle="Your natural-stone catalogue." />

      <DataToolbar
        count={rows.length}
        search={q}
        onSearchChange={setQ}
        searchPlaceholder="Search by name or code…"
        columns={<ColumnsMenu columns={columnDefs} isHidden={isHidden} onToggle={toggleColumn} />}
        density={<DensityMenu density={prefs.density} onChange={setDensity} />}
        extra={
          <Button asChild variant="outline" size="sm" className="h-8">
            <Link to="/products/configure">Configure</Link>
          </Button>
        }
        action={
          <Button size="sm" className="h-8" onClick={openCreate}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> New product
          </Button>
        }
      />

      {query.isLoading ? (
        <SkeletonTable rows={6} columns={6} />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<PackageSearch className="h-6 w-6" />}
          title="No products yet"
          message="Add stones you deal with to reuse them in enquiries and RFQs."
          action={
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> New product
            </Button>
          }
        />
      ) : (
        <DataTableShell
          density={prefs.density}
          footer={
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={rows.length}
              onPageChange={setPage}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
            />
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                {!isHidden("code") && <TableHead>Code</TableHead>}
                {!isHidden("name") && <TableHead>Name</TableHead>}
                {!isHidden("stone") && <TableHead>Stone</TableHead>}
                {!isHidden("finish") && <TableHead>Finish</TableHead>}
                {!isHidden("unit") && <TableHead>Unit</TableHead>}
                {!isHidden("thickness") && <TableHead>Thickness (mm)</TableHead>}
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((p) => (
                <TableRow key={p.id}>
                  {!isHidden("code") && (
                    <TableCell className="font-mono text-xs">
                      <Link
                        to="/products/$productId"
                        params={{ productId: p.id }}
                        className="hover:underline"
                      >
                        {p.product_code}
                      </Link>
                    </TableCell>
                  )}
                  {!isHidden("name") && (
                    <TableCell className="font-medium">
                      <Link
                        to="/products/$productId"
                        params={{ productId: p.id }}
                        className="hover:underline"
                      >
                        {p.name}
                      </Link>
                    </TableCell>
                  )}
                  {!isHidden("stone") && (
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {p.stone_type ?? "—"}
                      </Badge>
                    </TableCell>
                  )}
                  {!isHidden("finish") && (
                    <TableCell className="capitalize">
                      {p.finish?.replace("_", " ") ?? "—"}
                    </TableCell>
                  )}
                  {!isHidden("unit") && <TableCell>{p.default_unit}</TableCell>}
                  {!isHidden("thickness") && <TableCell>{p.thickness_mm ?? "—"}</TableCell>}
                  <TableCell>
                    <RowActions
                      extra={
                        <DropdownMenuItem asChild>
                          <Link to="/products/$productId" params={{ productId: p.id }}>
                            <ExternalLink className="mr-2 h-4 w-4" /> Open
                          </Link>
                        </DropdownMenuItem>
                      }
                      onEdit={() => {
                        setEditing(p);
                        setFormOpen(true);
                      }}
                      onDelete={() => setToDelete(p)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
      )}

      <ProductFormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} />
      <SafeDeleteDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        entityType="product"
        entityId={toDelete?.id ?? null}
        entityLabel={toDelete ? `${toDelete.name} (${toDelete.product_code})` : ""}
        busy={delMut.isPending}
        onConfirmDelete={() => toDelete && delMut.mutate(toDelete.id)}
      />
    </div>
  );
}

function emptyForm(): ProductCreateInput {
  return {
    name: "",
    stone_type: "marble",
    default_unit: "sqft",
    finish: null,
    category_id: null,
    thickness_mm: null,
    origin_country: null,
    hsn_code: null,
    description: null,
  };
}
function fromRow(p: ProductRow): ProductCreateInput {
  return {
    name: p.name,
    stone_type: p.stone_type ?? "marble",
    default_unit: p.default_unit,
    finish: p.finish,
    category_id: p.category_id,
    thickness_mm: p.thickness_mm,
    origin_country: p.origin_country,
    hsn_code: p.hsn_code,
    description: p.description,
  };
}

function ProductFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: ProductRow | null;
}) {
  const qc = useQueryClient();
  const cats = useQuery({ queryKey: qk.productCategories, queryFn: listProductCategories });
  const [form, setForm] = useState<ProductCreateInput>(emptyForm);

  useEffect(() => {
    if (open) setForm(editing ? fromRow(editing) : emptyForm());
  }, [open, editing]);

  const mutation = useMutation({
    mutationFn: (input: ProductCreateInput) =>
      editing ? updateProduct(editing.id, input) : createProduct(input),
    onSuccess: (row) => {
      toast.success(editing ? "Product updated" : `Product ${row.product_code} created`);
      if (!editing) seedPickerCache(qc, "product", row);
      invalidateProduct(qc, row.id);
      onOpenChange(false);
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = productCreateSchema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues.map((i) => i.message).join(" • "));
    mutation.mutate(parsed.data);
  }
  const set = <K extends keyof ProductCreateInput>(k: K, v: ProductCreateInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${editing.name}` : "New product"}</DialogTitle>
        </DialogHeader>
        <QuickForm onSubmit={onSubmit} busy={mutation.isPending}>
          <QuickForm.QuickFill>
            <Field label="Product name" required>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </Field>
            <Field label="Stone type" required>
              <Select
                value={form.stone_type}
                onValueChange={(v) => set("stone_type", v as ProductCreateInput["stone_type"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STONE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </QuickForm.QuickFill>

          <QuickForm.MoreDetails>
            <Field label="Unit">
              <Select
                value={form.default_unit}
                onValueChange={(v) => set("default_unit", v as ProductCreateInput["default_unit"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_UNITS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Finish">
              <Select
                value={form.finish ?? "none"}
                onValueChange={(v) =>
                  set("finish", v === "none" ? null : (v as ProductCreateInput["finish"]))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {STONE_FINISHES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Category">
              <Select
                value={form.category_id ?? "none"}
                onValueChange={(v) => set("category_id", v === "none" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {(cats.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Thickness (mm)">
              <Input
                type="number"
                value={form.thickness_mm ?? ""}
                onChange={(e) =>
                  set("thickness_mm", e.target.value === "" ? null : Number(e.target.value))
                }
              />
            </Field>
          </QuickForm.MoreDetails>

          <QuickForm.Advanced>
            <Field label="Origin country">
              <Input
                value={form.origin_country ?? ""}
                onChange={(e) => set("origin_country", e.target.value)}
              />
            </Field>
            <Field label="HSN code">
              <Input
                value={form.hsn_code ?? ""}
                onChange={(e) => set("hsn_code", e.target.value)}
              />
            </Field>
            <Field label="Description" className="md:col-span-2">
              <Textarea
                rows={2}
                value={form.description ?? ""}
                onChange={(e) => set("description", e.target.value)}
              />
            </Field>
          </QuickForm.Advanced>

          <QuickForm.Actions>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Save" : "Create"}
            </Button>
          </QuickForm.Actions>
        </QuickForm>
      </DialogContent>
    </Dialog>
  );
}

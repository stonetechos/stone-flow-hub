import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
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

  const query = useQuery({ queryKey: qk.products.list(dq), queryFn: () => listProducts(dq) });

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

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="Your natural-stone catalogue."
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/products/configure">Configure</Link>
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> New product
            </Button>
          </div>
        }
      />
      <div className="mb-3 flex items-center gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or code…"
          className="max-w-md"
        />
      </div>

      {query.isLoading ? (
        <SkeletonTable rows={6} columns={5} />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : (query.data ?? []).length === 0 ? (
        <EmptyState
          icon={<PackageSearch className="h-6 w-6" />}
          title="No products yet"
          message="Add stones you deal with to reuse them in enquiries and RFQs."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> New product
            </Button>
          }
        />
      ) : (
        <div className="rounded-md border border-border bg-card shadow-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Stone</TableHead>
                <TableHead>Finish</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Thickness (mm)</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data!.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">
                    <Link
                      to="/products/$productId"
                      params={{ productId: p.id }}
                      className="hover:underline"
                    >
                      {p.product_code}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link
                      to="/products/$productId"
                      params={{ productId: p.id }}
                      className="hover:underline"
                    >
                      {p.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {p.stone_type ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize">{p.finish?.replace("_", " ") ?? "—"}</TableCell>
                  <TableCell>{p.default_unit}</TableCell>
                  <TableCell>{p.thickness_mm ?? "—"}</TableCell>
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
        </div>
      )}

      <ProductFormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete product?"
        description={
          toDelete ? `${toDelete.name} (${toDelete.product_code}) will be permanently removed.` : ""
        }
        busy={delMut.isPending}
        onConfirm={() => toDelete && delMut.mutate(toDelete.id)}
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

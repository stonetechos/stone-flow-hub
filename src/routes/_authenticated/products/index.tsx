import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, PackageSearch } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, LoadingBlock } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QuickForm } from "@/components/forms/QuickForm";
import { Field } from "@/components/forms/Field";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { createProduct, listProducts, listProductCategories } from "@/lib/products/api";
import {
  PRODUCT_UNITS, STONE_TYPES, STONE_FINISHES,
  productCreateSchema, type ProductCreateInput,
} from "@/lib/products/schema";

export const Route = createFileRoute("/_authenticated/products/")({
  ssr: false,
  component: ProductsPage,
});

function ProductsPage() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const query = useQuery({ queryKey: qk.products.list(q), queryFn: () => listProducts(q) });

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="Your natural-stone catalogue."
        actions={<Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> New product</Button>}
      />
      <div className="mb-3 flex items-center gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or code…" className="max-w-md" />
      </div>

      {query.isLoading ? (
        <LoadingBlock />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : (query.data ?? []).length === 0 ? (
        <EmptyState
          icon={<PackageSearch className="h-6 w-6" />}
          title="No products yet"
          message="Add stones you deal with to reuse them in enquiries and RFQs."
          action={<Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> New product</Button>}
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data!.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.product_code}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell><Badge variant="secondary" className="capitalize">{p.stone_type ?? "—"}</Badge></TableCell>
                  <TableCell className="capitalize">{p.finish?.replace("_", " ") ?? "—"}</TableCell>
                  <TableCell>{p.default_unit}</TableCell>
                  <TableCell>{p.thickness_mm ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateProductDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function CreateProductDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const cats = useQuery({ queryKey: qk.productCategories, queryFn: listProductCategories });
  const [form, setForm] = useState<ProductCreateInput>({
    name: "",
    stone_type: "marble",
    default_unit: "sqft",
    finish: null,
    category_id: null,
    thickness_mm: null,
    origin_country: null,
    hsn_code: null,
    description: null,
  });

  const mutation = useMutation({
    mutationFn: createProduct,
    onSuccess: (row) => {
      toast.success(`Product ${row.product_code} created`);
      qc.invalidateQueries({ queryKey: qk.products.all });
      onOpenChange(false);
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = productCreateSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues.map((i) => i.message).join(" • "));
      return;
    }
    mutation.mutate(parsed.data);
  }

  const set = <K extends keyof ProductCreateInput>(k: K, v: ProductCreateInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>New product</DialogTitle></DialogHeader>
        <QuickForm onSubmit={onSubmit} busy={mutation.isPending}>
          <QuickForm.QuickFill>
            <Field label="Product name" required>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </Field>
            <Field label="Stone type" required>
              <Select value={form.stone_type} onValueChange={(v) => set("stone_type", v as ProductCreateInput["stone_type"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STONE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </QuickForm.QuickFill>

          <QuickForm.MoreDetails>
            <Field label="Unit">
              <Select value={form.default_unit} onValueChange={(v) => set("default_unit", v as ProductCreateInput["default_unit"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRODUCT_UNITS.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Finish">
              <Select value={form.finish ?? "none"} onValueChange={(v) => set("finish", v === "none" ? null : (v as ProductCreateInput["finish"]))}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {STONE_FINISHES.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Category">
              <Select value={form.category_id ?? "none"} onValueChange={(v) => set("category_id", v === "none" ? null : v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {(cats.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Thickness (mm)">
              <Input type="number" value={form.thickness_mm ?? ""} onChange={(e) => set("thickness_mm", e.target.value === "" ? null : Number(e.target.value))} />
            </Field>
          </QuickForm.MoreDetails>

          <QuickForm.Advanced>
            <Field label="Origin country"><Input value={form.origin_country ?? ""} onChange={(e) => set("origin_country", e.target.value)} /></Field>
            <Field label="HSN code"><Input value={form.hsn_code ?? ""} onChange={(e) => set("hsn_code", e.target.value)} /></Field>
            <Field label="Description" className="md:col-span-2">
              <Textarea rows={2} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
            </Field>
          </QuickForm.Advanced>

          <QuickForm.Actions>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create
            </Button>
          </QuickForm.Actions>
        </QuickForm>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Product Configurator — family-driven wizard that assembles a product from
 * masters (stone/colour/finish/edge/thickness/…) and derives the code +
 * description + technical spec so no field is typed twice.
 *
 * Insert paths through the standard products API; the DB assigns PRD-####.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Wand2, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EntityPicker } from "@/components/forms/EntityPicker";
import { invalidateProduct, seedPickerCache } from "@/lib/query-invalidation";
import { toUserMessage } from "@/lib/errors";

export const Route = createFileRoute("/_authenticated/products/configure")({
  component: ProductConfigurator,
});

type MasterOpt = { id: string; name: string; code: string };

function ProductConfigurator() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [familyId, setFamilyId] = useState<string | null>(null);
  const [stoneId, setStoneId] = useState<string | null>(null);
  const [colourId, setColourId] = useState<string | null>(null);
  const [surfaceId, setSurfaceId] = useState<string | null>(null);
  const [edgeId, setEdgeId] = useState<string | null>(null);
  const [thicknessId, setThicknessId] = useState<string | null>(null);
  const [originId, setOriginId] = useState<string | null>(null);
  const [gradeId, setGradeId] = useState<string | null>(null);
  const [packagingId, setPackagingId] = useState<string | null>(null);
  const [uomId, setUomId] = useState<string | null>(null);
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [notes, setNotes] = useState("");

  // Pull tiny master lists to render text derivations (name/code).
  const families = useMasterList("product_families");
  const stones = useMasterList("stone_types");
  const colours = useMasterList("stone_colours");
  const surfaces = useMasterList("surface_finishes");
  const edges = useMasterList("edge_finishes");
  const thicknesses = useMasterList("thicknesses", "mm");
  const origins = useMasterList("stone_origins");
  const grades = useMasterList("quality_grades");
  const packaging = useMasterList("packaging_types");
  const uoms = useMasterList("uoms", "symbol");

  const derived = useMemo(() => {
    const parts: string[] = [];
    const family = families.data?.find((m) => m.id === familyId);
    const stone = stones.data?.find((m) => m.id === stoneId);
    const colour = colours.data?.find((m) => m.id === colourId);
    const surface = surfaces.data?.find((m) => m.id === surfaceId);
    const edge = edges.data?.find((m) => m.id === edgeId);
    const thickness = thicknesses.data?.find((m) => m.id === thicknessId);
    const grade = grades.data?.find((m) => m.id === gradeId);
    if (colour) parts.push(colour.name);
    if (stone) parts.push(stone.name);
    if (family) parts.push(family.name);
    if (surface) parts.push(surface.name);
    if (edge) parts.push(`${edge.name} edge`);
    if (thickness) parts.push(`${(thickness as MasterOpt & { mm?: number }).mm ?? thickness.name}mm`);
    if (length && width) parts.push(`${length}×${width}mm`);
    if (grade) parts.push(`Grade ${grade.name}`);

    const name = parts.slice(0, 5).join(" ") || "Configured product";
    const description = parts.join(" · ");
    const codeParts = [family?.code, stone?.code, colour?.code, surface?.code, thickness && `T${(thickness as MasterOpt & { mm?: number }).mm ?? ""}`]
      .filter(Boolean)
      .map((s) => String(s).toUpperCase());
    const suggestedCode = codeParts.join("-");
    // Deterministic canonical hash of the full configuration.
    const hashInput = [familyId, stoneId, colourId, surfaceId, edgeId, thicknessId, originId, gradeId, packagingId, uomId, length, width].join("|");
    const config_hash = simpleHash(hashInput);
    return { name, description, suggestedCode, config_hash };
  }, [
    families.data, stones.data, colours.data, surfaces.data, edges.data,
    thicknesses.data, grades.data, familyId, stoneId, colourId, surfaceId,
    edgeId, thicknessId, originId, gradeId, packagingId, uomId, length, width,
  ]);

  const create = useMutation({
    mutationFn: async () => {
      const family = families.data?.find((f) => f.id === familyId);
      const hsn = heuristicHsn(family?.name);
      const gst = heuristicGst(hsn.hsn);
      const capabilityMap: Record<string, string[]> = {
        cnc: ["cnc"],
        artwork: ["cnc"],
        inlay: ["inlay", "brass_inlay"],
        waterjet: ["waterjet"],
        veneer: ["veneer"],
        mural: ["cnc", "waterjet"],
        mosaic: ["mosaic"],
      };
      const fname = (family?.name ?? "").toLowerCase();
      const required = Object.entries(capabilityMap).flatMap(([k, v]) => (fname.includes(k) ? v : []));
      const payload = {
        name: derived.name,
        commercial_name: derived.name,
        technical_description: derived.description,
        description: derived.description,
        auto_description: derived.description,
        config_hash: derived.config_hash,
        config_json: {
          familyId, stoneId, colourId, surfaceId, edgeId, thicknessId, originId,
          gradeId, packagingId, uomId, length: length || null, width: width || null, notes: notes || null,
        },
        family_id: familyId,
        stone_type_id: stoneId,
        colour_id: colourId,
        surface_finish_id: surfaceId,
        edge_finish_id: edgeId,
        thickness_id: thicknessId,
        origin_id: originId,
        quality_grade_id: gradeId,
        packaging_type_id: packagingId,
        uom_id: uomId,
        is_custom: true,
        hsn_code: hsn.hsn,
        gst_pct: gst.gst_pct,
        estimated_mfg_days: fname.includes("artwork") || fname.includes("mural") ? 14 : fname.includes("mosaic") ? 7 : 5,
        waste_pct: fname.includes("inlay") || fname.includes("artwork") ? 15 : 5,
        required_capabilities: required,
        is_active: true,
      };
      const { data, error } = await (supabase.from("products") as unknown as {
        insert: (v: Record<string, unknown>) => { select: (c: string) => { single: () => Promise<{ data: { id: string; name: string; product_code: string } | null; error: unknown }> } };
      }).insert(payload).select("id,name,product_code").single();
      if (error) throw error;
      return data!;
    },
    onSuccess: (row) => {
      toast.success(`Product ${row.product_code} created`);
      seedPickerCache(qc, "product", row);
      invalidateProduct(qc, row.id);
      navigate({ to: `/products/${row.id}` as string });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const ready = familyId && stoneId && (thicknessId || families.data?.find((f) => f.id === familyId)?.code?.match(/MURAL|ARTWORK|SCULPTURE/i));

  return (
    <div>
      <PageHeader
        title="Configure Product"
        subtitle="Every attribute drawn from masters — code, description, and technical spec are generated for you."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Section title="1. Family">
            <EntityPicker type="product_family" value={familyId} onChange={setFamilyId} />
          </Section>
          <Section title="2. Material">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Stone Type" required>
                <EntityPicker type="stone_type" value={stoneId} onChange={setStoneId} />
              </Field>
              <Field label="Colour">
                <MasterSelect list={colours.data ?? []} value={colourId} onChange={setColourId} placeholder="Select colour" />
              </Field>
              <Field label="Origin">
                <MasterSelect list={origins.data ?? []} value={originId} onChange={setOriginId} placeholder="Select origin" />
              </Field>
              <Field label="Quality Grade">
                <MasterSelect list={grades.data ?? []} value={gradeId} onChange={setGradeId} placeholder="Select grade" />
              </Field>
            </div>
          </Section>
          <Section title="3. Finish">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Surface Finish">
                <EntityPicker type="surface_finish" value={surfaceId} onChange={setSurfaceId} />
              </Field>
              <Field label="Edge Finish">
                <EntityPicker type="edge_finish" value={edgeId} onChange={setEdgeId} />
              </Field>
            </div>
          </Section>
          <Section title="4. Dimensions">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Thickness">
                <MasterSelect list={thicknesses.data ?? []} value={thicknessId} onChange={setThicknessId} placeholder="Select thickness"
                  labelFn={(o) => `${o.name} · T${(o as MasterOpt & { mm?: number }).mm ?? ""}mm`} />
              </Field>
              <Field label="Length (mm)">
                <Input type="number" value={length} onChange={(e) => setLength(e.target.value)} />
              </Field>
              <Field label="Width (mm)">
                <Input type="number" value={width} onChange={(e) => setWidth(e.target.value)} />
              </Field>
            </div>
          </Section>
          <Section title="5. Packaging & Unit">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Packaging">
                <MasterSelect list={packaging.data ?? []} value={packagingId} onChange={setPackagingId} placeholder="Select packaging" />
              </Field>
              <Field label="Unit of Measurement">
                <MasterSelect list={uoms.data ?? []} value={uomId} onChange={setUomId} placeholder="Select UoM" />
              </Field>
            </div>
          </Section>
          <Section title="6. Notes">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              placeholder="Any customer-specific instructions, drawings or references…" />
          </Section>
        </div>

        <div className="space-y-4">
          <Card className="sticky top-4 p-4">
            <h3 className="mb-3 font-display text-base font-semibold flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-primary" /> Preview
            </h3>
            <dl className="space-y-2 text-sm">
              <PreviewRow label="Code" value={derived.suggestedCode || "—"} mono />
              <PreviewRow label="Name" value={derived.name} />
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Description</dt>
                <dd className="mt-1 text-sm">{derived.description || "—"}</dd>
              </div>
              <div className="flex flex-wrap gap-1 pt-2">
                <Badge variant="secondary">HSN 6802</Badge>
                <Badge variant="secondary">GST 18%</Badge>
              </div>
            </dl>
            <div className="mt-4 flex flex-col gap-2">
              <Button
                disabled={!ready || create.isPending}
                onClick={() => create.mutate()}
                className="w-full"
              >
                {create.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
                Create Product
              </Button>
              {!ready && (
                <p className="text-xs text-muted-foreground">
                  Select a family, stone type, and thickness (or artwork) to continue.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {children}
    </Card>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
    </div>
  );
}

function PreviewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={mono ? "truncate font-mono text-xs font-semibold" : "truncate font-medium"}>
        {value}
      </dd>
    </div>
  );
}

function MasterSelect({
  list, value, onChange, placeholder, labelFn,
}: {
  list: MasterOpt[];
  value: string | null;
  onChange: (v: string | null) => void;
  placeholder?: string;
  labelFn?: (o: MasterOpt) => string;
}) {
  return (
    <select
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">{placeholder ?? "Select…"}</option>
      {list.map((o) => (
        <option key={o.id} value={o.id}>{labelFn ? labelFn(o) : o.name}</option>
      ))}
    </select>
  );
}

function useMasterList(table: string, extraCol?: string) {
  const cols = extraCol ? `id, name, code, ${extraCol}` : "id, name, code";
  return useQuery({
    queryKey: [table, "picker", ""],
    queryFn: async () => {
      const { data, error } = await (supabase.from(table as never) as unknown as {
        select: (c: string) => { eq: (a: string, b: unknown) => { order: (c: string) => Promise<{ data: MasterOpt[] | null; error: unknown }> } };
      }).select(cols).eq("is_active", true).order("sort_order");
      if (error) throw error;
      return (data ?? []) as MasterOpt[];
    },
    staleTime: 60_000,
  });
}

function simpleHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0).toString(16).padStart(8, "0");
}

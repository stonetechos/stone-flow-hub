import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EntityPicker } from "@/components/forms/EntityPicker";
import { createEstimate } from "@/lib/estimates/api";
import { toUserMessage } from "@/lib/errors";
import { invalidateEstimate } from "@/lib/query-invalidation";
import {
  ESTIMATE_TEMPLATES,
  PAYMENT_SCHEDULE_PRESETS,
  COST_COMPONENT_LABEL,
  ITEM_CATEGORY_LABEL,
  type CostComponentKind,
  type EstimateItemCategoryKey,
  type EstimateTemplateKey,
  type PaymentScheduleKind,
} from "@/lib/estimates/templates";
import { calcEstimate } from "@/lib/estimates/calc";
import { formatInr } from "@/lib/format";
import type {
  EstimateItemInput,
  EstimateComponentInput,
  PaymentScheduleRow,
} from "@/lib/estimates/schema";

const search = z.object({
  template: z
    .enum(["material_supply", "material_install", "custom_articles", "custom_manufacturing"])
    .default("material_supply"),
  project: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated/estimates/new")({
  ssr: false,
  validateSearch: (s) => search.parse(s),
  component: NewEstimatePage,
});

interface RowState extends EstimateItemInput {
  _id: string;
}
interface CompState extends EstimateComponentInput {
  _id: string;
}

function uid() {
  return Math.random().toString(36).slice(2);
}

function NewEstimatePage() {
  const { template, project } = Route.useSearch();
  const nav = useNavigate();
  const qc = useQueryClient();
  const cfg = ESTIMATE_TEMPLATES[template as EstimateTemplateKey];

  const [projectId, setProjectId] = useState<string | null>(project ?? null);
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [marginPct, setMarginPct] = useState(15);
  const [gstPct, setGstPct] = useState(18);
  const [scheduleKind, setScheduleKind] = useState<PaymentScheduleKind>("custom");
  const [schedule, setSchedule] = useState<PaymentScheduleRow[]>(
    PAYMENT_SCHEDULE_PRESETS.custom.rows.map((r) => ({ ...r })),
  );

  const [items, setItems] = useState<RowState[]>(
    cfg.itemCategories.map((cat) => ({
      _id: uid(),
      category: cat,
      description: "",
      quantity: 1,
      unit: cat === "material" ? "sqft" : cat === "installation" ? "sqft" : "nos",
      unit_price: 0,
      tax_pct: 0,
    })),
  );
  const [components, setComponents] = useState<CompState[]>(
    cfg.costComponents.slice(0, 3).map((k) => ({
      _id: uid(),
      kind: k,
      label: COST_COMPONENT_LABEL[k],
      quantity: 1,
      unit: "lot",
      unit_price: 0,
    })),
  );

  const totals = useMemo(
    () =>
      calcEstimate({
        items: items.map((i) => ({
          category: i.category,
          quantity: Number(i.quantity) || 0,
          unit_price: Number(i.unit_price) || 0,
          tax_pct: Number(i.tax_pct) || 0,
        })),
        components: components.map((c) => ({
          kind: c.kind,
          quantity: Number(c.quantity) || 0,
          unit_price: Number(c.unit_price) || 0,
        })),
        margin_pct: Number(marginPct) || 0,
        gst_pct: Number(gstPct) || 0,
      }),
    [items, components, marginPct, gstPct],
  );

  const applySchedule = (kind: PaymentScheduleKind) => {
    setScheduleKind(kind);
    setSchedule(PAYMENT_SCHEDULE_PRESETS[kind].rows.map((r) => ({ ...r })));
  };

  const scheduleSum = schedule.reduce((a, b) => a + Number(b.pct || 0), 0);

  const mut = useMutation({
    mutationFn: () =>
      createEstimate({
        template: template as EstimateTemplateKey,
        project_id: projectId!,
        valid_until: validUntil || null,
        notes: notes || null,
        terms: terms || null,
        margin_pct: marginPct,
        gst_pct: gstPct,
        payment_schedule_kind: scheduleKind,
        items: items
          .filter((i) => i.description.trim().length > 0)
          .map((i) => ({
            category: i.category,
            product_id: i.product_id ?? null,
            description: i.description,
            quantity: i.quantity,
            unit: i.unit,
            unit_price: i.unit_price,
            tax_pct: i.tax_pct,
          })),
        components: components
          .filter((c) => Number(c.unit_price) > 0 || Number(c.quantity) > 0)
          .map((c) => ({
            kind: c.kind,
            label: c.label ?? null,
            quantity: c.quantity,
            unit: c.unit,
            unit_price: c.unit_price,
          })),
        schedule: schedule.map((s) => ({
          label: s.label,
          pct: s.pct,
          due_offset_days: s.due_offset_days,
        })),
      }),
    onSuccess: (est) => {
      toast.success(`Estimate ${est.estimate_no} created`);
      invalidateEstimate(qc, est.id);
      nav({ to: "/estimates/$estimateId", params: { estimateId: est.id } });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const canSubmit =
    !!projectId &&
    items.some((i) => i.description.trim().length > 0) &&
    Math.abs(scheduleSum - 100) < 0.01;

  return (
    <div>
      <div className="mb-2">
        <Link
          to="/estimates"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Back to estimates
        </Link>
      </div>
      <PageHeader
        title={`New ${cfg.label} Estimate`}
        subtitle={cfg.tagline}
        actions={
          <Button size="sm" disabled={!canSubmit || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save estimate
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-4 md:col-span-2">
          <Card className="shadow-1">
            <CardHeader>
              <CardTitle className="text-sm">Header</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Project</Label>
                <EntityPicker
                  type="project"
                  value={projectId}
                  onChange={(id) => setProjectId(id)}
                  allowCreate
                  placeholder="Pick project"
                />
              </div>
              <div>
                <Label htmlFor="vu">Valid until</Label>
                <Input
                  id="vu"
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-1">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Line items</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setItems((rows) => [
                    ...rows,
                    {
                      _id: uid(),
                      category: cfg.itemCategories[0],
                      description: "",
                      quantity: 1,
                      unit: "sqft",
                      unit_price: 0,
                      tax_pct: 0,
                    },
                  ])
                }
              >
                <Plus className="mr-1 h-3 w-3" /> Add line
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {items.map((row, idx) => (
                <div
                  key={row._id}
                  className="grid grid-cols-12 gap-2 rounded-md border border-border p-2"
                >
                  <Select
                    value={row.category}
                    onValueChange={(v) =>
                      setItems((rs) =>
                        rs.map((r, i) =>
                          i === idx ? { ...r, category: v as EstimateItemCategoryKey } : r,
                        ),
                      )
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {cfg.itemCategories.map((c) => (
                        <SelectItem key={c} value={c}>
                          {ITEM_CATEGORY_LABEL[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="col-span-4"
                    placeholder="Description"
                    value={row.description}
                    onChange={(e) =>
                      setItems((rs) =>
                        rs.map((r, i) => (i === idx ? { ...r, description: e.target.value } : r)),
                      )
                    }
                  />
                  <Input
                    className="col-span-1"
                    type="number"
                    min={0}
                    step="0.01"
                    value={row.quantity}
                    onChange={(e) =>
                      setItems((rs) =>
                        rs.map((r, i) =>
                          i === idx ? { ...r, quantity: Number(e.target.value) } : r,
                        ),
                      )
                    }
                  />
                  <Input
                    className="col-span-1"
                    placeholder="unit"
                    value={row.unit ?? ""}
                    onChange={(e) =>
                      setItems((rs) =>
                        rs.map((r, i) => (i === idx ? { ...r, unit: e.target.value } : r)),
                      )
                    }
                  />
                  <Input
                    className="col-span-2"
                    type="number"
                    step="0.01"
                    placeholder="Rate"
                    value={row.unit_price}
                    onChange={(e) =>
                      setItems((rs) =>
                        rs.map((r, i) =>
                          i === idx ? { ...r, unit_price: Number(e.target.value) } : r,
                        ),
                      )
                    }
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="col-span-1"
                    onClick={() => setItems((rs) => rs.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {cfg.costComponents.length > 0 && (
            <Card className="shadow-1">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Cost components</CardTitle>
                <Select
                  onValueChange={(k) =>
                    setComponents((cs) => [
                      ...cs,
                      {
                        _id: uid(),
                        kind: k as CostComponentKind,
                        label: COST_COMPONENT_LABEL[k as CostComponentKind],
                        quantity: 1,
                        unit: "lot",
                        unit_price: 0,
                      },
                    ])
                  }
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Add component" />
                  </SelectTrigger>
                  <SelectContent>
                    {cfg.costComponents.map((k) => (
                      <SelectItem key={k} value={k}>
                        {COST_COMPONENT_LABEL[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="space-y-2">
                {components.map((c, idx) => (
                  <div
                    key={c._id}
                    className="grid grid-cols-12 gap-2 rounded-md border border-border p-2"
                  >
                    <div className="col-span-3 text-sm font-medium">
                      {COST_COMPONENT_LABEL[c.kind]}
                    </div>
                    <Input
                      className="col-span-4"
                      placeholder="Label / note"
                      value={c.label ?? ""}
                      onChange={(e) =>
                        setComponents((cs) =>
                          cs.map((r, i) => (i === idx ? { ...r, label: e.target.value } : r)),
                        )
                      }
                    />
                    <Input
                      className="col-span-1"
                      type="number"
                      value={c.quantity}
                      onChange={(e) =>
                        setComponents((cs) =>
                          cs.map((r, i) =>
                            i === idx ? { ...r, quantity: Number(e.target.value) } : r,
                          ),
                        )
                      }
                    />
                    <Input
                      className="col-span-1"
                      placeholder="unit"
                      value={c.unit ?? ""}
                      onChange={(e) =>
                        setComponents((cs) =>
                          cs.map((r, i) => (i === idx ? { ...r, unit: e.target.value } : r)),
                        )
                      }
                    />
                    <Input
                      className="col-span-2"
                      type="number"
                      step="0.01"
                      placeholder="Amount"
                      value={c.unit_price}
                      onChange={(e) =>
                        setComponents((cs) =>
                          cs.map((r, i) =>
                            i === idx ? { ...r, unit_price: Number(e.target.value) } : r,
                          ),
                        )
                      }
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="col-span-1"
                      onClick={() => setComponents((cs) => cs.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card className="shadow-1">
            <CardHeader>
              <CardTitle className="text-sm">Payment schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2">
                {(Object.keys(PAYMENT_SCHEDULE_PRESETS) as PaymentScheduleKind[]).map((k) => (
                  <Button
                    key={k}
                    size="sm"
                    variant={scheduleKind === k ? "default" : "outline"}
                    onClick={() => applySchedule(k)}
                  >
                    {PAYMENT_SCHEDULE_PRESETS[k].label}
                  </Button>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setSchedule((s) => [
                      ...s,
                      { label: `Milestone ${s.length + 1}`, pct: 0, due_offset_days: 0 },
                    ])
                  }
                >
                  <Plus className="mr-1 h-3 w-3" /> Row
                </Button>
              </div>
              {schedule.map((row, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2">
                  <Input
                    className="col-span-6"
                    value={row.label}
                    onChange={(e) =>
                      setSchedule((s) =>
                        s.map((r, i) => (i === idx ? { ...r, label: e.target.value } : r)),
                      )
                    }
                  />
                  <Input
                    className="col-span-2"
                    type="number"
                    value={row.pct}
                    onChange={(e) =>
                      setSchedule((s) =>
                        s.map((r, i) => (i === idx ? { ...r, pct: Number(e.target.value) } : r)),
                      )
                    }
                  />
                  <Input
                    className="col-span-3"
                    type="number"
                    value={row.due_offset_days}
                    onChange={(e) =>
                      setSchedule((s) =>
                        s.map((r, i) =>
                          i === idx ? { ...r, due_offset_days: Number(e.target.value) } : r,
                        ),
                      )
                    }
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="col-span-1"
                    onClick={() => setSchedule((s) => s.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div
                className={`text-xs ${
                  Math.abs(scheduleSum - 100) < 0.01 ? "text-muted-foreground" : "text-destructive"
                }`}
              >
                Total: {scheduleSum}% (must equal 100%)
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-1">
            <CardHeader>
              <CardTitle className="text-sm">Notes &amp; terms</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Textarea
                placeholder="Internal / customer-facing notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <Textarea
                placeholder="Terms &amp; conditions"
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
              />
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-1 md:sticky md:top-4 md:h-fit">
          <CardHeader>
            <CardTitle className="text-sm">Live estimate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Row label="Material" v={totals.material_cost} />
            <Row label="Manufacturing" v={totals.manufacturing_cost} />
            <Row label="Installation" v={totals.installation_cost} />
            <Row label="Adhesives" v={totals.adhesives_cost} />
            <Row label="Chemicals" v={totals.chemicals_cost} />
            <Row label="Sealer" v={totals.sealer_cost} />
            <Row label="Packing" v={totals.packing_cost} />
            <Row label="Freight" v={totals.freight_cost} />
            <Row label="Other" v={totals.other_cost + totals.components_other_cost} />
            <div className="my-2 border-t border-border" />
            <Row label="Subtotal" v={totals.subtotal} strong />
            <div className="mt-2 flex items-center gap-2">
              <Label className="w-24 text-xs">Margin %</Label>
              <Input
                type="number"
                className="h-8"
                value={marginPct}
                onChange={(e) => setMarginPct(Number(e.target.value))}
              />
            </div>
            <Row label={`Margin (${marginPct}%)`} v={totals.margin_amount} />
            <div className="mt-2 flex items-center gap-2">
              <Label className="w-24 text-xs">GST %</Label>
              <Input
                type="number"
                className="h-8"
                value={gstPct}
                onChange={(e) => setGstPct(Number(e.target.value))}
              />
            </div>
            <Row label={`GST (${gstPct}%)`} v={totals.gst_amount} />
            <div className="my-2 border-t border-border" />
            <Row label="Total" v={totals.total} strong big />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({
  label,
  v,
  strong,
  big,
}: {
  label: string;
  v: number;
  strong?: boolean;
  big?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between ${strong ? "font-semibold" : ""} ${big ? "text-base" : ""}`}
    >
      <span className="text-muted-foreground">{label}</span>
      <span>{formatInr(v)}</span>
    </div>
  );
}

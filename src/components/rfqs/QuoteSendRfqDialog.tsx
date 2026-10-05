import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send, Sparkles, Check, MapPin, Loader2, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { QuickForm } from "@/components/forms/QuickForm";
import { Field } from "@/components/forms/Field";
import { supabase } from "@/integrations/supabase/client";
import { listVendorsForPicker, extractVendorMetadata, type VendorRow } from "@/lib/vendors/api";
import { VENDOR_WORK_TYPES } from "@/lib/vendors/schema";
import { MATERIAL_OPTIONS } from "@/lib/customers/schema";
import { sendRfq } from "@/lib/enquiries/api";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";

export interface QuoteSendRfqDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId: string;
  quoteNo: string;
  customerName?: string;
  items: Array<{
    id?: string;
    product_name?: string | null;
    description?: string | null;
    product_id?: string | null;
    quantity?: number;
    uom?: string | null;
  }>;
  enquiryId?: string | null;
  projectId: string;
  customerId: string;
}

export function QuoteSendRfqDialog({
  open,
  onOpenChange,
  quoteId,
  quoteNo,
  customerName,
  items,
  enquiryId,
  projectId,
  customerId,
}: QuoteSendRfqDialogProps) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState("");

  const vendors = useQuery({
    queryKey: qk.vendors.list(""),
    queryFn: () => listVendorsForPicker(),
    enabled: open,
  });

  // Extract keywords / products of interest from quote items
  const quoteProductKeywords = useMemo(() => {
    const set = new Set<string>();
    items.forEach((it) => {
      const text = `${it.product_name ?? ""} ${it.description ?? ""}`.toLowerCase();
      MATERIAL_OPTIONS.forEach((m) => {
        const words = m.label.toLowerCase().split(/\s+/);
        if (words.some((w) => w.length > 3 && text.includes(w))) {
          set.add(m.value);
        }
      });
      // also check for specialized work types in items
      if (text.includes("cnc")) set.add("cnc_works");
      if (text.includes("polish")) set.add("polishing_work");
      if (text.includes("handcraft") || text.includes("carv")) set.add("handcrafter");
      if (text.includes("art") || text.includes("mural") || text.includes("inlay"))
        set.add("artwork");
    });
    return Array.from(set);
  }, [items]);

  // Rank vendors: vendors matching products dealt in or work types come first
  const scoredVendors = useMemo(() => {
    const list = vendors.data ?? [];
    return list
      .map((v) => {
        const meta = extractVendorMetadata(v);
        const matchedProducts = meta.products_dealt.filter((p) => quoteProductKeywords.includes(p));
        const matchedWorkTypes = meta.work_types.filter((w) => quoteProductKeywords.includes(w));
        const matchScore = matchedProducts.length * 2 + matchedWorkTypes.length;
        return {
          vendor: v,
          meta,
          matchedProducts,
          matchedWorkTypes,
          isMatch: matchScore > 0,
        };
      })
      .sort((a, b) => {
        if (a.isMatch && !b.isMatch) return -1;
        if (!a.isMatch && b.isMatch) return 1;
        return a.vendor.company_name.localeCompare(b.vendor.company_name);
      });
  }, [vendors.data, quoteProductKeywords]);

  const matchedVendorIds = useMemo(() => {
    return scoredVendors.filter((s) => s.isMatch).map((s) => s.vendor.id);
  }, [scoredVendors]);

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectAllMatched = () => {
    if (matchedVendorIds.length > 0) {
      setSelected(Array.from(new Set([...selected, ...matchedVendorIds])));
    } else {
      setSelected(scoredVendors.slice(0, 5).map((s) => s.vendor.id));
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (selected.length === 0) throw new Error("Please select at least one vendor");
      if (!dueDate) throw new Error("Please select a due date");

      let targetEnquiryId = enquiryId;

      // If quote doesn't have an enquiry linked, create one with items so send_rfq RPC succeeds
      if (!targetEnquiryId) {
        const { data: enq, error: enqErr } = await supabase
          .from("enquiries")
          .insert({
            enquiry_no: "",
            customer_id: customerId,
            project_id: projectId,
            requirement: `Approved Quotation #${quoteNo} products sourcing`,
            stage: "customer_quotation_sent",
            notes: `Auto-generated for Vendor RFQ from approved Quote #${quoteNo}`,
          })
          .select("id")
          .single();
        if (enqErr) throw enqErr;
        targetEnquiryId = enq.id;

        // Insert enquiry items
        if (items.length > 0) {
          const enqItems = items.map((it, idx) => ({
            enquiry_id: enq.id,
            product_id: it.product_id ?? null,
            product_name_snapshot: it.product_name ?? it.description ?? "Stone product",
            quantity: Number(it.quantity) || 1,
            unit: (it.uom === "sqm" ||
            it.uom === "piece" ||
            it.uom === "slab" ||
            it.uom === "linear_ft" ||
            it.uom === "linear_m" ||
            it.uom === "cbm"
              ? it.uom
              : "sqft") as "sqft" | "sqm" | "piece" | "slab" | "linear_ft" | "linear_m" | "cbm",
            sort_order: idx + 1,
          }));
          const { error: itemsErr } = await supabase.from("enquiry_items").insert(enqItems);
          if (itemsErr) throw itemsErr;
        }

        // Link back to quote
        await supabase.from("quotes").update({ enquiry_id: enq.id }).eq("id", quoteId);
      }

      // Send RFQ
      return await sendRfq({
        enquiry_id: targetEnquiryId,
        vendor_ids: selected,
        due_date: dueDate,
        notes: notes
          ? `[Quote #${quoteNo}] ${notes}`
          : `Products requested for approved Quote #${quoteNo}`,
      });
    },
    onSuccess: () => {
      toast.success(
        `RFQ sent to ${selected.length} vendor${selected.length === 1 ? "" : "s"} for Quote #${quoteNo}`,
      );
      qc.invalidateQueries({ queryKey: qk.rfqs.all });
      qc.invalidateQueries({ queryKey: qk.quotes.byId(quoteId) });
      onOpenChange(false);
      setSelected([]);
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" /> Send RFQ to Vendors
          </DialogTitle>
          <DialogDescription>
            Send RFQs directly to vendors matching the product selection in approved Quote #
            {quoteNo}
            {customerName ? ` (${customerName})` : ""}.
          </DialogDescription>
        </DialogHeader>

        {/* Quote items summary */}
        <div className="rounded-lg border border-border/70 bg-muted/30 p-3 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Products in this Quote ({items.length}
            )
          </div>
          <div className="flex flex-wrap gap-1.5">
            {items.map((it, idx) => (
              <Badge key={idx} variant="outline" className="text-xs font-normal bg-background">
                {it.product_name || it.description || `Item #${idx + 1}`} ({it.quantity ?? 1}{" "}
                {it.uom || "sqft"})
              </Badge>
            ))}
          </div>
        </div>

        <QuickForm
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          busy={mutation.isPending}
        >
          <QuickForm.QuickFill>
            <Field label="Response due date" required>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </Field>

            <Field
              label="Select Vendors"
              required
              hint={`${selected.length} selected`}
              className="md:col-span-2"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">
                  Vendors dealing in these products & work types are highlighted first
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={selectAllMatched}
                  >
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-primary" />
                    Select Matched ({matchedVendorIds.length})
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setSelected([])}
                  >
                    Clear
                  </Button>
                </div>
              </div>

              <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-md border border-border p-2">
                {vendors.isLoading ? (
                  <p className="p-3 text-sm text-muted-foreground">Loading vendors…</p>
                ) : scoredVendors.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">
                    No vendors configured. Add vendors under Purchase &gt; Vendors.
                  </p>
                ) : (
                  scoredVendors.map(
                    ({ vendor: v, meta, matchedProducts, matchedWorkTypes, isMatch }) => {
                      const isChecked = selected.includes(v.id);
                      return (
                        <label
                          key={v.id}
                          className={`flex cursor-pointer items-start gap-2.5 rounded-md p-2 text-sm transition-colors border ${
                            isChecked
                              ? "border-primary/40 bg-primary/5"
                              : isMatch
                                ? "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10"
                                : "border-transparent hover:bg-muted/50"
                          }`}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggle(v.id)}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-foreground">{v.company_name}</span>
                              <span className="font-mono text-[11px] text-muted-foreground">
                                {v.vendor_code}
                              </span>
                              {v.city && (
                                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <MapPin className="h-3 w-3" /> {v.city}
                                </span>
                              )}
                              {isMatch && (
                                <Badge
                                  variant="default"
                                  className="bg-emerald-600 hover:bg-emerald-700 text-[10px] py-0 px-1.5"
                                >
                                  Matched Product
                                </Badge>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-1 mt-1">
                              {meta.work_types.map((wt) => {
                                const item = VENDOR_WORK_TYPES.find((w) => w.value === wt);
                                return (
                                  <Badge
                                    key={wt}
                                    variant="secondary"
                                    className="text-[10px] py-0 px-1.5 font-normal"
                                  >
                                    {item?.label ?? wt}
                                  </Badge>
                                );
                              })}
                              {matchedProducts.length > 0 && (
                                <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium">
                                  Deals in:{" "}
                                  {matchedProducts
                                    .map((p) => {
                                      const mat = MATERIAL_OPTIONS.find((m) => m.value === p);
                                      return mat?.label ?? p;
                                    })
                                    .join(", ")}
                                </span>
                              )}
                            </div>
                          </div>
                        </label>
                      );
                    },
                  )
                )}
              </div>
            </Field>
          </QuickForm.QuickFill>

          <QuickForm.MoreDetails>
            <Field label="RFQ Notes for Vendors" className="md:col-span-2">
              <Textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Specific instructions, delivery location requirements, quality expectations…"
              />
            </Field>
          </QuickForm.MoreDetails>

          <QuickForm.Actions>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending || selected.length === 0}>
              {mutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send RFQ ({selected.length})
            </Button>
          </QuickForm.Actions>
        </QuickForm>
      </DialogContent>
    </Dialog>
  );
}

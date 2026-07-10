import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader2,
  Trash2,
  ArrowRightCircle,
  MessageCircle,
  Mail,
  FileText,
  History,
  CheckCircle2,
} from "lucide-react";

import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorBlock, LoadingBlock } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { invalidateEstimate, invalidateQuote } from "@/lib/query-invalidation";
import {
  convertEstimateToQuote,
  deleteEstimate,
  getEstimate,
  getEstimateComponents,
  getEstimateDocuments,
  getEstimateItems,
  getEstimateSchedule,
  saveEstimateDocument,
  setEstimateStatus,
} from "@/lib/estimates/api";
import { getQuoteForEstimate } from "@/lib/quotes/api";
import { renderEmailHtml, renderWhatsappText } from "@/lib/estimates/render";
import { COST_COMPONENT_LABEL, ESTIMATE_TEMPLATES } from "@/lib/estimates/templates";
import { formatInr } from "@/lib/format";
import { ApproveEstimateDialog } from "@/components/customer-payments/ApproveEstimateDialog";
import type { DbTable } from "@/lib/types";

type EstStatus = DbTable<"estimates">["status"];

export const Route = createFileRoute("/_authenticated/estimates/$estimateId")({
  ssr: false,
  component: EstimateDetailPage,
});

function EstimateDetailPage() {
  const { estimateId } = Route.useParams();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [confirmDel, setConfirmDel] = useState(false);
  const [sendChan, setSendChan] = useState<null | "whatsapp" | "email">(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [draftSubject, setDraftSubject] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [draftHtml, setDraftHtml] = useState("");

  const est = useQuery({
    queryKey: qk.estimates.byId(estimateId),
    queryFn: () => getEstimate(estimateId),
  });
  const items = useQuery({
    queryKey: qk.estimates.items(estimateId),
    queryFn: () => getEstimateItems(estimateId),
  });
  const comps = useQuery({
    queryKey: qk.estimates.components(estimateId),
    queryFn: () => getEstimateComponents(estimateId),
  });
  const sched = useQuery({
    queryKey: qk.estimates.schedule(estimateId),
    queryFn: () => getEstimateSchedule(estimateId),
  });
  const docs = useQuery({
    queryKey: qk.estimates.documents(estimateId),
    queryFn: () => getEstimateDocuments(estimateId),
  });
  const linkedQuote = useQuery({
    queryKey: ["estimates", "linkedQuote", estimateId],
    queryFn: () => getQuoteForEstimate(estimateId),
  });

  const statusMut = useMutation({
    mutationFn: (s: EstStatus) => setEstimateStatus(estimateId, s),
    onSuccess: () => {
      toast.success("Status updated");
      invalidateEstimate(qc, estimateId);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const convertMut = useMutation({
    mutationFn: () => convertEstimateToQuote(estimateId),
    onSuccess: (quote) => {
      toast.success(`Quote ${quote.quote_no} created`);
      invalidateEstimate(qc, estimateId);
      invalidateQuote(qc);
      qc.invalidateQueries({ queryKey: ["estimates", "linkedQuote", estimateId] });
      nav({ to: "/quotes/$quoteId", params: { quoteId: quote.id } });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const saveDocMut = useMutation({
    mutationFn: () =>
      saveEstimateDocument({
        estimate_id: estimateId,
        kind: sendChan === "whatsapp" ? "whatsapp_text" : "email_html",
        subject: draftSubject || null,
        body_text: sendChan === "whatsapp" ? draftBody : null,
        body_html: sendChan === "email" ? draftHtml : null,
      }),
    onSuccess: () => {
      toast.success("Message saved to history");
      invalidateEstimate(qc, estimateId);
      setSendChan(null);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const delMut = useMutation({
    mutationFn: () => deleteEstimate(estimateId),
    onSuccess: () => {
      toast.success("Estimate deleted");
      invalidateEstimate(qc);
      nav({ to: "/estimates" });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  if (est.isLoading) return <LoadingBlock />;
  if (est.error)
    return <ErrorBlock message={toUserMessage(est.error)} onRetry={() => est.refetch()} />;
  if (!est.data) return <ErrorBlock message="Estimate not found." />;

  const estimate = est.data;
  const converted = linkedQuote.data ?? null;
  const tpl = ESTIMATE_TEMPLATES[estimate.template];

  const openSend = (chan: "whatsapp" | "email") => {
    setSendChan(chan);
    const ctx = {
      estimate,
      items: items.data ?? [],
      schedule: sched.data ?? [],
    };
    if (chan === "whatsapp") {
      setDraftBody(renderWhatsappText(ctx));
      setDraftSubject("");
      setDraftHtml("");
    } else {
      const { subject, html } = renderEmailHtml(ctx);
      setDraftSubject(subject);
      setDraftHtml(html);
      setDraftBody("");
    }
  };

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
        title={estimate.estimate_no}
        subtitle={`${tpl.label} • ${estimate.project?.name ?? "—"} • ${estimate.customer?.name ?? "—"}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => openSend("whatsapp")}>
              <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
            </Button>
            <Button size="sm" variant="outline" onClick={() => openSend("email")}>
              <Mail className="mr-2 h-4 w-4" /> Email
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <FileText className="mr-2 h-4 w-4" /> Print PDF
            </Button>
            {estimate.status !== "accepted" && estimate.status !== "converted" && (
              <Button size="sm" variant="secondary" onClick={() => setApproveOpen(true)}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Approve &amp; create schedule
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => convertMut.mutate()}
              disabled={!canConvert || convertMut.isPending}
            >
              {convertMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <ArrowRightCircle className="mr-2 h-4 w-4" /> Convert to Quote
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setConfirmDel(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-4 md:col-span-2">
          <Card className="shadow-1">
            <CardHeader>
              <CardTitle className="text-sm">Line items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Line total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(items.data ?? []).map((it) => (
                    <TableRow key={it.id}>
                      <TableCell className="capitalize">{it.category}</TableCell>
                      <TableCell className="font-medium">{it.description}</TableCell>
                      <TableCell className="text-right">{it.quantity}</TableCell>
                      <TableCell>{it.unit ?? "—"}</TableCell>
                      <TableCell className="text-right">{formatInr(it.unit_price)}</TableCell>
                      <TableCell className="text-right">{formatInr(it.line_total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {(comps.data ?? []).length > 0 && (
            <Card className="shadow-1">
              <CardHeader>
                <CardTitle className="text-sm">Cost components</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kind</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(comps.data ?? []).map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          {COST_COMPONENT_LABEL[c.kind as keyof typeof COST_COMPONENT_LABEL] ??
                            c.kind}
                        </TableCell>
                        <TableCell>{c.label ?? "—"}</TableCell>
                        <TableCell className="text-right">{formatInr(c.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {(sched.data ?? []).length > 0 && (
            <Card className="shadow-1">
              <CardHeader>
                <CardTitle className="text-sm">Payment schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Milestone</TableHead>
                      <TableHead className="text-right">%</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Due after</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(sched.data ?? []).map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>{s.label}</TableCell>
                        <TableCell className="text-right">{s.pct}%</TableCell>
                        <TableCell className="text-right">{formatInr(s.amount)}</TableCell>
                        <TableCell className="text-right">{s.due_offset_days} d</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-1">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="h-4 w-4" /> Message &amp; document history
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(docs.data ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No messages generated yet. Use WhatsApp / Email above.
                </p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {(docs.data ?? []).map((d) => (
                    <li
                      key={d.id}
                      className="flex items-center justify-between border-b border-border/50 py-1"
                    >
                      <span className="capitalize">
                        {d.kind.replace(/_/g, " ")} v{d.version}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(d.created_at).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="shadow-1">
            <CardHeader>
              <CardTitle className="text-sm">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge variant="outline" className="capitalize">
                {estimate.status}
              </Badge>
              <div>
                <Label className="text-xs">Change status</Label>
                <Select
                  value={estimate.status}
                  onValueChange={(v) => statusMut.mutate(v as EstStatus)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                {!canConvert && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Mark as <span className="font-medium">Accepted</span> to convert into a quote.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-1">
            <CardHeader>
              <CardTitle className="text-sm">Cost breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <SumRow k="Material" v={estimate.material_cost} />
              <SumRow k="Manufacturing" v={estimate.manufacturing_cost} />
              <SumRow k="Installation" v={estimate.installation_cost} />
              <SumRow k="Adhesives" v={estimate.adhesives_cost} />
              <SumRow k="Chemicals" v={estimate.chemicals_cost} />
              <SumRow k="Sealer" v={estimate.sealer_cost} />
              <SumRow k="Packing" v={estimate.packing_cost} />
              <SumRow k="Freight" v={estimate.freight_cost} />
              <SumRow k="Other" v={estimate.other_cost} />
              <div className="my-2 border-t border-border" />
              <SumRow k="Subtotal" v={estimate.subtotal} strong />
              <SumRow k={`Margin (${estimate.margin_pct}%)`} v={estimate.margin_amount} />
              <SumRow k={`GST (${estimate.gst_pct}%)`} v={estimate.gst_amount} />
              <div className="my-2 border-t border-border" />
              <SumRow k="Total" v={estimate.total} strong big />
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={sendChan !== null} onOpenChange={(o) => (o ? null : setSendChan(null))}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {sendChan === "whatsapp" ? "WhatsApp message" : "Email"} — edit before sending
            </DialogTitle>
          </DialogHeader>
          {sendChan === "email" && (
            <div>
              <Label>Subject</Label>
              <Input value={draftSubject} onChange={(e) => setDraftSubject(e.target.value)} />
            </div>
          )}
          <div className="mt-2">
            <Label>{sendChan === "whatsapp" ? "Message" : "HTML body"}</Label>
            <Textarea
              rows={16}
              value={sendChan === "whatsapp" ? draftBody : draftHtml}
              onChange={(e) =>
                sendChan === "whatsapp"
                  ? setDraftBody(e.target.value)
                  : setDraftHtml(e.target.value)
              }
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Delivery integration (WhatsApp Business Cloud / Resend) ships in Phase 3. For now, the
              message is saved to history and ready to send.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendChan(null)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                await navigator.clipboard.writeText(
                  sendChan === "whatsapp" ? draftBody : draftHtml,
                );
                toast.success("Copied to clipboard");
              }}
            >
              Copy
            </Button>
            <Button onClick={() => saveDocMut.mutate()} disabled={saveDocMut.isPending}>
              {saveDocMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save to history
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDel}
        onOpenChange={setConfirmDel}
        title="Delete estimate?"
        description={`${estimate.estimate_no} will be removed.`}
        busy={delMut.isPending}
        onConfirm={() => delMut.mutate()}
      />

      <ApproveEstimateDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        estimateId={estimateId}
        estimateTotal={Number(estimate.total ?? 0)}
        template={estimate.template}
        currentSchedule={(sched.data ?? []).map((s) => ({
          label: s.label,
          pct: Number(s.pct),
          due_offset_days: Number(s.due_offset_days),
        }))}
        onApproved={() => {
          if (estimate.customer_id) {
            nav({ to: "/customers/$customerId", params: { customerId: estimate.customer_id } });
          }
        }}
      />
    </div>
  );
}

function SumRow({
  k,
  v,
  strong,
  big,
}: {
  k: string;
  v: number | string | null;
  strong?: boolean;
  big?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between ${strong ? "font-semibold" : ""} ${big ? "text-base" : ""}`}
    >
      <span className="text-muted-foreground">{k}</span>
      <span>{formatInr(v ?? 0)}</span>
    </div>
  );
}

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, Mail, MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PaymentScheduleDashboardRow } from "@/lib/customer-payments/schedule";
import {
  getOrgPaymentSettings,
  renderPaymentRequestEmail,
  renderPaymentRequestWhatsApp,
  sendPaymentRequest,
} from "@/lib/customer-payments/request";
import { toUserMessage } from "@/lib/errors";

export interface PaymentRequestDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  row: PaymentScheduleDashboardRow;
  defaultTo?: { email?: string | null; whatsapp?: string | null };
}

export function PaymentRequestDialog(props: PaymentRequestDialogProps) {
  const { open, onOpenChange, row, defaultTo } = props;
  const [channel, setChannel] = useState<"whatsapp" | "email">("whatsapp");
  const [waTo, setWaTo] = useState(defaultTo?.whatsapp ?? "");
  const [emailTo, setEmailTo] = useState(defaultTo?.email ?? "");
  const [busy, setBusy] = useState(false);

  const orgQ = useQuery({
    queryKey: ["org-payment-settings"],
    queryFn: getOrgPaymentSettings,
    enabled: open,
  });

  const preview = useMemo(() => {
    const org = orgQ.data ?? { brand_name: "Stone Tech" };
    const ctx = { row, org };
    if (channel === "whatsapp")
      return { subject: "", body: renderPaymentRequestWhatsApp(ctx), html: "" };
    const { subject, html } = renderPaymentRequestEmail(ctx);
    return { subject, body: "", html };
  }, [channel, row, orgQ.data]);

  const [waBody, setWaBody] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [html, setHtml] = useState<string>("");

  useMemo(() => {
    if (channel === "whatsapp") setWaBody(preview.body);
    else {
      setSubject(preview.subject);
      setHtml(preview.html);
    }
  }, [preview, channel]);

  async function send() {
    try {
      setBusy(true);
      const to = channel === "whatsapp" ? waTo : emailTo;
      if (!to.trim()) throw new Error("Recipient required");
      await sendPaymentRequest({
        ctx: { row, org: orgQ.data ?? {} },
        channel,
        to,
      });
      toast.success("Payment request queued");
      onOpenChange(false);
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    const text = channel === "whatsapp" ? waBody : `Subject: ${subject}\n\n${html}`;
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Send payment request</DialogTitle>
        </DialogHeader>
        <Tabs value={channel} onValueChange={(v) => setChannel(v as "whatsapp" | "email")}>
          <TabsList>
            <TabsTrigger value="whatsapp">
              <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="mr-2 h-4 w-4" /> Email
            </TabsTrigger>
          </TabsList>

          <TabsContent value="whatsapp" className="space-y-3">
            <div>
              <Label>WhatsApp number</Label>
              <Input value={waTo} onChange={(e) => setWaTo(e.target.value)} placeholder="+91…" />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea rows={14} value={waBody} onChange={(e) => setWaBody(e.target.value)} />
            </div>
          </TabsContent>

          <TabsContent value="email" className="space-y-3">
            <div>
              <Label>To</Label>
              <Input
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="customer@example.com"
              />
            </div>
            <div>
              <Label>Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div>
              <Label>HTML body</Label>
              <Textarea rows={12} value={html} onChange={(e) => setHtml(e.target.value)} />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={copy}>
            <Copy className="mr-2 h-4 w-4" /> Copy
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={send} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Queue &amp; Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Plus, Save } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { listMessageTemplates, upsertMessageTemplate } from "@/lib/notifications/templates-api";
import { extractPlaceholders } from "@/lib/notifications/templates";
import { invalidateMessageTemplate } from "@/lib/query-invalidation";

export const Route = createFileRoute("/_authenticated/message-templates")({
  ssr: false,
  component: TemplatesPage,
});

function TemplatesPage() {
  const query = useQuery({
    queryKey: qk.messageTemplates.all,
    queryFn: () => listMessageTemplates(),
  });

  return (
    <div>
      <PageHeader
        title="Message Templates"
        subtitle="Reusable Email / WhatsApp / SMS templates for Estimates, Receipts, Invoices and more. Placeholders like {{customer_name}} are replaced at send time."
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/notification-settings"><ArrowLeft className="mr-2 h-4 w-4" /> Providers</Link>
            </Button>
            <EditTemplateDialog trigger={<Button size="sm"><Plus className="mr-2 h-4 w-4" /> New template</Button>} />
          </div>
        }
      />

      {query.isLoading ? (
        <LoadingBlock />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} />
      ) : (
        <Card className="shadow-1">
          <CardHeader><CardTitle className="text-sm">All templates</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Edit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(query.data ?? []).map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">{t.code}</TableCell>
                    <TableCell>{t.name}</TableCell>
                    <TableCell><Badge variant="outline" className="uppercase">{t.channel}</Badge></TableCell>
                    <TableCell className="text-sm">{t.category}</TableCell>
                    <TableCell>
                      <Badge variant={t.is_active ? "default" : "outline"}>{t.is_active ? "Yes" : "No"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <EditTemplateDialog
                        template={{ ...t, channel: t.channel as "email" | "whatsapp" | "sms" }}
                        trigger={<Button variant="ghost" size="sm">Edit</Button>}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EditTemplateDialog({
  template,
  trigger,
}: {
  template?: { code: string; name: string; channel: "email" | "whatsapp" | "sms"; category: string; subject: string | null; body: string; is_active: boolean };
  trigger: React.ReactNode;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState(template?.code ?? "");
  const [name, setName] = useState(template?.name ?? "");
  const [channel, setChannel] = useState<"email" | "whatsapp" | "sms">(template?.channel ?? "email");
  const [category, setCategory] = useState(template?.category ?? "general");
  const [subject, setSubject] = useState(template?.subject ?? "");
  const [body, setBody] = useState(template?.body ?? "");
  const [active, setActive] = useState<boolean>(template?.is_active ?? true);

  const save = useMutation({
    mutationFn: () =>
      upsertMessageTemplate({
        code, name, channel, category,
        subject: channel === "email" ? subject : null,
        body, variables: extractPlaceholders(body + " " + (subject ?? "")),
        is_active: active,
      }),
    onSuccess: () => {
      toast.success("Template saved");
      invalidateMessageTemplate(qc, code);
      setOpen(false);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{template ? "Edit template" : "New template"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Code *</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} disabled={!!template} placeholder="e.g. estimate.email.v2" />
          </div>
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Channel *</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v as typeof channel)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. estimate / receipt / invoice" />
          </div>
          {channel === "email" && (
            <div className="space-y-1.5 md:col-span-2">
              <Label>Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
          )}
          <div className="space-y-1.5 md:col-span-2">
            <Label>Body *</Label>
            <Textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              Placeholders: {extractPlaceholders(body + " " + subject).map((v) => `{{${v}}}`).join(", ") || "—"}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setActive(!active)}>{active ? "Deactivate" : "Activate"}</Button>
          <Button onClick={() => save.mutate()} disabled={!code || !name || !body || save.isPending}>
            <Save className="mr-2 h-4 w-4" /> Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

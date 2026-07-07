import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Save, ArrowLeft, CheckCircle2, XCircle, Loader2, Send, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { getAppSetting, upsertAppSetting } from "@/lib/app-settings/api";
import { invalidateAppSetting } from "@/lib/query-invalidation";
import { checkProviderStatus, sendTestMessage } from "@/lib/notifications/dispatch.functions";

export const Route = createFileRoute("/_authenticated/notification-settings")({
  ssr: false,
  component: NotificationSettingsPage,
});

function NotificationSettingsPage() {
  return (
    <div>
      <PageHeader
        title="Communication"
        subtitle="Configure email, WhatsApp and SMS providers, and switch the global TEST/LIVE mode."
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link to="/settings"><ArrowLeft className="mr-2 h-4 w-4" /> Settings</Link>
          </Button>
        }
      />

      <div className="grid gap-4">
        <ModeCard />
        <EmailProviderCard />
        <WhatsAppProviderCard />
        <SmsProviderCard />
        <TemplatesLink />
      </div>
    </div>
  );
}

function TemplatesLink() {
  return (
    <Card className="shadow-1">
      <CardHeader><CardTitle className="text-sm">Message templates</CardTitle></CardHeader>
      <CardContent className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Edit WhatsApp / Email templates used by Estimates, Receipts, Invoices and reminders.
        </p>
        <Button asChild variant="outline"><Link to="/message-templates">Manage templates</Link></Button>
      </CardContent>
    </Card>
  );
}

// ---------------- TEST / LIVE mode ----------------
type ModeCfg = { mode?: "test" | "live"; test_email?: string; test_phone?: string };
function ModeCard() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: qk.appSettings.byKey("communication.mode"),
    queryFn: () => getAppSetting<ModeCfg>("communication.mode"),
  });
  const [cfg, setCfg] = useState<ModeCfg>({ mode: "test" });
  useEffect(() => { if (query.data) setCfg(query.data); }, [query.data]);
  const save = useMutation({
    mutationFn: () => upsertAppSetting("communication.mode", cfg as unknown as Record<string, unknown>),
    onSuccess: () => { toast.success("Communication mode saved"); invalidateAppSetting(qc, "communication.mode"); },
    onError: (e) => toast.error(toUserMessage(e)),
  });
  const isTest = cfg.mode !== "live";
  return (
    <Card className={isTest ? "shadow-1 border-amber-500/40" : "shadow-1 border-emerald-500/40"}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ShieldAlert className={isTest ? "h-4 w-4 text-amber-500" : "h-4 w-4 text-emerald-500"} />
          Global mode
        </CardTitle>
        <Badge variant={isTest ? "outline" : "default"}>{isTest ? "TEST" : "LIVE"}</Badge>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <div className="text-sm font-medium">Send real messages to customers</div>
            <div className="text-xs text-muted-foreground">
              {isTest
                ? "All outbound email/WhatsApp are redirected to the test recipient below — customers receive nothing."
                : "Messages go to the actual recipient. Templates and scheduled reminders are LIVE."}
            </div>
          </div>
          <Switch
            checked={!isTest}
            onCheckedChange={(v) => setCfg({ ...cfg, mode: v ? "live" : "test" })}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Test recipient email</Label>
            <Input value={cfg.test_email ?? ""} onChange={(e) => setCfg({ ...cfg, test_email: e.target.value })} placeholder="admin@yourdomain.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Test recipient phone (WhatsApp)</Label>
            <Input value={cfg.test_phone ?? ""} onChange={(e) => setCfg({ ...cfg, test_phone: e.target.value })} placeholder="+91XXXXXXXXXX" />
          </div>
        </div>
        <div>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            <Save className="mr-2 h-4 w-4" /> Save mode
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------- Email provider ----------------
type EmailCfg = {
  provider?: string;
  from_name?: string;
  from_email?: string;
  reply_to?: string;
  api_key_secret_name?: string;
};
function EmailProviderCard() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: qk.appSettings.byKey("notifications.email"),
    queryFn: () => getAppSetting<EmailCfg>("notifications.email"),
  });
  const [cfg, setCfg] = useState<EmailCfg>({ provider: "resend" });
  useEffect(() => { if (query.data) setCfg(query.data); }, [query.data]);

  const save = useMutation({
    mutationFn: () => upsertAppSetting("notifications.email", cfg as unknown as Record<string, unknown>),
    onSuccess: () => { toast.success("Email provider saved"); invalidateAppSetting(qc, "notifications.email"); status.refetch(); },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const checkFn = useServerFn(checkProviderStatus);
  const status = useQuery({
    queryKey: ["provider-status", "email"],
    queryFn: () => checkFn({ data: { channel: "email" } }),
    staleTime: 30_000,
    enabled: !!cfg.from_email,
  });

  const testFn = useServerFn(sendTestMessage);
  const test = useMutation({
    mutationFn: () => testFn({ data: { channel: "email" } }),
    onSuccess: (r) => r.ok ? toast.success(`Email sent (id ${r.providerMessageId ?? "n/a"})`) : toast.error(r.error ?? "Test failed"),
    onError: (e) => toast.error(toUserMessage(e)),
  });

  return (
    <Card className="shadow-1">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Email</CardTitle>
        <ProviderStatusBadge query={status} />
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Provider</Label>
          <Select value={cfg.provider ?? "resend"} onValueChange={(v) => setCfg({ ...cfg, provider: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="resend">Resend (default)</SelectItem>
              <SelectItem value="smtp">SMTP</SelectItem>
              <SelectItem value="sendgrid">SendGrid</SelectItem>
              <SelectItem value="ses">Amazon SES</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>API key secret name</Label>
          <Input value={cfg.api_key_secret_name ?? ""} onChange={(e) => setCfg({ ...cfg, api_key_secret_name: e.target.value })} placeholder="RESEND_API_KEY" />
        </div>
        <div className="space-y-1.5">
          <Label>Sender name</Label>
          <Input value={cfg.from_name ?? ""} onChange={(e) => setCfg({ ...cfg, from_name: e.target.value })} placeholder="Stone Tech" />
        </div>
        <div className="space-y-1.5">
          <Label>Sender email</Label>
          <Input value={cfg.from_email ?? ""} onChange={(e) => setCfg({ ...cfg, from_email: e.target.value })} placeholder="noreply@yourdomain.com" />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>Reply-To email</Label>
          <Input value={cfg.reply_to ?? ""} onChange={(e) => setCfg({ ...cfg, reply_to: e.target.value })} placeholder="sales@yourdomain.com" />
        </div>
        <div className="md:col-span-2 flex flex-wrap gap-2">
          <Button onClick={() => save.mutate()} disabled={save.isPending}><Save className="mr-2 h-4 w-4" /> Save</Button>
          <Button variant="outline" onClick={() => test.mutate()} disabled={test.isPending}>
            {test.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Send test email
          </Button>
          <Button variant="ghost" onClick={() => status.refetch()}>Re-check connection</Button>
        </div>
        <p className="md:col-span-2 text-xs text-muted-foreground">
          Store the actual API key as a project secret (default name <code>RESEND_API_KEY</code>). The dispatcher reads it server-side; the key never leaves the backend.
        </p>
      </CardContent>
    </Card>
  );
}

// ---------------- WhatsApp provider ----------------
type WaCfg = {
  provider?: string;
  phone_number_id?: string;
  business_account_id?: string;
  verify_token?: string;
  access_token_secret_name?: string;
};
function WhatsAppProviderCard() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: qk.appSettings.byKey("notifications.whatsapp"),
    queryFn: () => getAppSetting<WaCfg>("notifications.whatsapp"),
  });
  const [cfg, setCfg] = useState<WaCfg>({ provider: "meta_cloud" });
  useEffect(() => { if (query.data) setCfg(query.data); }, [query.data]);
  const save = useMutation({
    mutationFn: () => upsertAppSetting("notifications.whatsapp", cfg as unknown as Record<string, unknown>),
    onSuccess: () => { toast.success("WhatsApp provider saved"); invalidateAppSetting(qc, "notifications.whatsapp"); status.refetch(); },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const checkFn = useServerFn(checkProviderStatus);
  const status = useQuery({
    queryKey: ["provider-status", "whatsapp"],
    queryFn: () => checkFn({ data: { channel: "whatsapp" } }),
    staleTime: 30_000,
    enabled: !!cfg.phone_number_id,
  });

  const testFn = useServerFn(sendTestMessage);
  const test = useMutation({
    mutationFn: () => testFn({ data: { channel: "whatsapp" } }),
    onSuccess: (r) => r.ok ? toast.success(`WhatsApp sent (id ${r.providerMessageId ?? "n/a"})`) : toast.error(r.error ?? "Test failed"),
    onError: (e) => toast.error(toUserMessage(e)),
  });

  return (
    <Card className="shadow-1">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">WhatsApp</CardTitle>
        <ProviderStatusBadge query={status} />
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Provider</Label>
          <Select value={cfg.provider ?? "meta_cloud"} onValueChange={(v) => setCfg({ ...cfg, provider: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="meta_cloud">Meta WhatsApp Business Cloud (recommended)</SelectItem>
              <SelectItem value="twilio_whatsapp">Twilio WhatsApp</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Phone Number ID</Label>
          <Input value={cfg.phone_number_id ?? ""} onChange={(e) => setCfg({ ...cfg, phone_number_id: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Business Account ID</Label>
          <Input value={cfg.business_account_id ?? ""} onChange={(e) => setCfg({ ...cfg, business_account_id: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Webhook Verify Token</Label>
          <Input value={cfg.verify_token ?? ""} onChange={(e) => setCfg({ ...cfg, verify_token: e.target.value })} />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>Permanent access token secret name</Label>
          <Input value={cfg.access_token_secret_name ?? ""} onChange={(e) => setCfg({ ...cfg, access_token_secret_name: e.target.value })} placeholder="WHATSAPP_ACCESS_TOKEN" />
        </div>
        <div className="md:col-span-2 flex flex-wrap gap-2">
          <Button onClick={() => save.mutate()} disabled={save.isPending}><Save className="mr-2 h-4 w-4" /> Save</Button>
          <Button variant="outline" onClick={() => test.mutate()} disabled={test.isPending}>
            {test.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Send test WhatsApp
          </Button>
          <Button variant="ghost" onClick={() => status.refetch()}>Re-check connection</Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------- SMS provider (unchanged) ----------------
type SmsCfg = { provider?: string; api_key_secret_name?: string; from?: string };
function SmsProviderCard() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: qk.appSettings.byKey("notifications.sms"),
    queryFn: () => getAppSetting<SmsCfg>("notifications.sms"),
  });
  const [cfg, setCfg] = useState<SmsCfg>({});
  useEffect(() => { if (query.data) setCfg(query.data); }, [query.data]);
  const save = useMutation({
    mutationFn: () => upsertAppSetting("notifications.sms", cfg as unknown as Record<string, unknown>),
    onSuccess: () => { toast.success("SMS provider saved"); invalidateAppSetting(qc, "notifications.sms"); },
    onError: (e) => toast.error(toUserMessage(e)),
  });
  return (
    <Card className="shadow-1">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">SMS</CardTitle>
        <Badge variant="outline">{cfg.provider || "not set"}</Badge>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Provider</Label>
          <Select value={cfg.provider ?? ""} onValueChange={(v) => setCfg({ ...cfg, provider: v })}>
            <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="twilio">Twilio</SelectItem>
              <SelectItem value="msg91">MSG91</SelectItem>
              <SelectItem value="textlocal">TextLocal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>API key secret name</Label>
          <Input value={cfg.api_key_secret_name ?? ""} onChange={(e) => setCfg({ ...cfg, api_key_secret_name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>From / Sender ID</Label>
          <Input value={cfg.from ?? ""} onChange={(e) => setCfg({ ...cfg, from: e.target.value })} />
        </div>
        <div className="md:col-span-2">
          <Button onClick={() => save.mutate()} disabled={save.isPending}><Save className="mr-2 h-4 w-4" /> Save</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ProviderStatusBadge({ query }: { query: { data?: { ok: boolean; reason?: string }; isFetching: boolean; isError: boolean } }) {
  if (query.isFetching) return <Badge variant="outline"><Loader2 className="mr-1 h-3 w-3 animate-spin" /> checking</Badge>;
  if (query.isError) return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" /> error</Badge>;
  if (!query.data) return <Badge variant="outline">not configured</Badge>;
  if (query.data.ok) return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30"><CheckCircle2 className="mr-1 h-3 w-3" /> connected</Badge>;
  const reason = query.data.reason ?? "";
  const invalid = /invalid|401|403/i.test(reason);
  return (
    <Badge variant={invalid ? "destructive" : "outline"}>
      <XCircle className="mr-1 h-3 w-3" /> {invalid ? "invalid key" : "disconnected"}
    </Badge>
  );
}

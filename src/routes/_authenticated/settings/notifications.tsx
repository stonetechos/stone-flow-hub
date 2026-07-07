import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { getAppSetting, upsertAppSetting } from "@/lib/app-settings/api";
import { invalidateAppSetting } from "@/lib/query-invalidation";

export const Route = createFileRoute("/_authenticated/settings/notifications")({
  ssr: false,
  component: NotificationSettingsPage,
});

function NotificationSettingsPage() {
  return (
    <div>
      <PageHeader
        title="Notification Providers"
        subtitle="Configure email, WhatsApp and SMS providers. All values are stored securely and hot-swappable."
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link to="/settings"><ArrowLeft className="mr-2 h-4 w-4" /> Settings</Link>
          </Button>
        }
      />

      <div className="grid gap-4">
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
      <CardHeader>
        <CardTitle className="text-sm">Message templates</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Edit the WhatsApp / Email templates used by Estimates, Receipts, Invoices and more.
        </p>
        <Button asChild variant="outline"><Link to="/settings/message-templates">Manage templates</Link></Button>
      </CardContent>
    </Card>
  );
}

type EmailCfg = { provider?: string; from_name?: string; from_email?: string; api_key_secret_name?: string };
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
    onSuccess: () => { toast.success("Email provider saved"); invalidateAppSetting(qc, "notifications.email"); },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  return (
    <Card className="shadow-1">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Email</CardTitle>
        <Badge variant="outline">{cfg.provider ?? "—"}</Badge>
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
          <Input value={cfg.api_key_secret_name ?? ""} onChange={(e) => setCfg({ ...cfg, api_key_secret_name: e.target.value })} placeholder="e.g. RESEND_API_KEY" />
        </div>
        <div className="space-y-1.5">
          <Label>From name</Label>
          <Input value={cfg.from_name ?? ""} onChange={(e) => setCfg({ ...cfg, from_name: e.target.value })} placeholder="Stone Tech OS" />
        </div>
        <div className="space-y-1.5">
          <Label>From email</Label>
          <Input value={cfg.from_email ?? ""} onChange={(e) => setCfg({ ...cfg, from_email: e.target.value })} placeholder="noreply@yourdomain.com" />
        </div>
        <div className="md:col-span-2">
          <Button onClick={() => save.mutate()} disabled={save.isPending}><Save className="mr-2 h-4 w-4" /> Save</Button>
          <p className="mt-2 text-xs text-muted-foreground">
            The actual API key must be stored as a project secret with the name above. The runtime queue dispatcher reads it server-side.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

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
    onSuccess: () => { toast.success("WhatsApp provider saved"); invalidateAppSetting(qc, "notifications.whatsapp"); },
    onError: (e) => toast.error(toUserMessage(e)),
  });
  return (
    <Card className="shadow-1">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">WhatsApp</CardTitle>
        <Badge variant="outline">{cfg.provider ?? "—"}</Badge>
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
          <Label>Verify Token (webhook)</Label>
          <Input value={cfg.verify_token ?? ""} onChange={(e) => setCfg({ ...cfg, verify_token: e.target.value })} />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>Access token secret name</Label>
          <Input value={cfg.access_token_secret_name ?? ""} onChange={(e) => setCfg({ ...cfg, access_token_secret_name: e.target.value })} placeholder="e.g. WHATSAPP_ACCESS_TOKEN" />
        </div>
        <div className="md:col-span-2">
          <Button onClick={() => save.mutate()} disabled={save.isPending}><Save className="mr-2 h-4 w-4" /> Save</Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Store the access token as a project secret. You can also plug in a different provider later without touching code.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

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

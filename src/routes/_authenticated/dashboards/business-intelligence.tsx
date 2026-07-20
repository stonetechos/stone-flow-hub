/** AI Business Intelligence — daily / weekly / monthly brief with WhatsApp/Email send. */
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Sparkles, Loader2, Send, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateBusinessBrief } from "@/lib/executive/brief.functions";
import { supabase } from "@/integrations/supabase/client";
import { toUserMessage } from "@/lib/errors";

export const Route = createFileRoute("/_authenticated/dashboards/business-intelligence")({
  ssr: false,
  component: BusinessIntel,
});

const SCOPES: Array<{ id: "daily" | "weekly" | "monthly"; label: string }> = [
  { id: "daily", label: "Daily Business Brief" },
  { id: "weekly", label: "Weekly Management Report" },
  { id: "monthly", label: "Monthly Performance Report" },
];

function BusinessIntel() {
  const [scope, setScope] = useState<"daily" | "weekly" | "monthly">("daily");
  const [dest, setDest] = useState({ email: "", whatsapp: "" });
  const fn = useServerFn(generateBusinessBrief);
  const brief = useMutation({
    mutationFn: (s: "daily" | "weekly" | "monthly") => fn({ data: { scope: s } }),
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const send = useMutation({
    mutationFn: async ({ channel, to }: { channel: "email" | "whatsapp"; to: string }) => {
      if (!brief.data?.brief) throw new Error("Generate a brief first.");
      const subject = SCOPES.find((s) => s.id === scope)!.label;
      const { error } = await supabase.from("message_queue").insert({
        channel,
        to_address: to,
        subject,
        body: brief.data.brief,
        status: "pending",
        related_type: "business_brief",
      } as never);
      if (error) throw error;
    },
    onSuccess: (_d, v) => toast.success(`Queued for ${v.channel}`),
    onError: (e) => toast.error(toUserMessage(e)),
  });

  return (
    <div>
      <PageHeader
        title="AI Business Intelligence"
        subtitle="Auto-generated brief with sales, risks and recommended actions — every number is sourced live."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {SCOPES.map((s) => (
          <Button
            key={s.id}
            variant={scope === s.id ? "default" : "outline"}
            onClick={() => setScope(s.id)}
            size="sm"
          >
            {s.label}
          </Button>
        ))}
        <Button className="ml-auto" onClick={() => brief.mutate(scope)} disabled={brief.isPending}>
          {brief.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          Generate brief
        </Button>
        {brief.data && (
          <Button variant="outline" onClick={() => brief.mutate(scope)} disabled={brief.isPending}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {SCOPES.find((s) => s.id === scope)!.label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!brief.data && !brief.isPending && (
            <div className="text-sm text-muted-foreground">
              Click "Generate brief" to produce an AI-authored summary from your live data.
            </div>
          )}
          {brief.isPending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Analyzing data…
            </div>
          )}
          {brief.data && (
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
              {brief.data.brief}
            </div>
          )}
        </CardContent>
      </Card>

      {brief.data && (
        <Card className="mt-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Send brief</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="flex gap-2">
              <Input
                placeholder="owner@company.com"
                value={dest.email}
                onChange={(e) => setDest({ ...dest, email: e.target.value })}
              />
              <Button
                variant="outline"
                onClick={() => dest.email && send.mutate({ channel: "email", to: dest.email })}
                disabled={!dest.email || send.isPending}
              >
                <Send className="h-4 w-4 mr-1" /> Email
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="+91XXXXXXXXXX"
                value={dest.whatsapp}
                onChange={(e) => setDest({ ...dest, whatsapp: e.target.value })}
              />
              <Button
                variant="outline"
                onClick={() =>
                  dest.whatsapp && send.mutate({ channel: "whatsapp", to: dest.whatsapp })
                }
                disabled={!dest.whatsapp || send.isPending}
              >
                <Send className="h-4 w-4 mr-1" /> WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

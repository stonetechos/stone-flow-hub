import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Key, CheckCircle2, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAiStatus, saveAiApiKey } from "@/lib/ai/copilot.functions";
import { toUserMessage } from "@/lib/errors";

export function AiSettingsCard({ isAdmin }: { isAdmin: boolean }) {
  const qc = useQueryClient();
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  const statusQ = useQuery({
    queryKey: ["ai", "status"],
    queryFn: () => getAiStatus(),
    staleTime: 60_000,
  });

  const saveMut = useMutation({
    mutationFn: (key: string) => saveAiApiKey({ data: { key } }),
    onSuccess: () => {
      toast.success("AI API Key saved successfully! Live AI assistant active.");
      qc.invalidateQueries({ queryKey: ["ai", "status"] });
      setApiKey("");
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const isConfigured = statusQ.data?.isConfigured;

  return (
    <Card className="shadow-1">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-teal-600" />
          <CardTitle className="text-sm">Stoneman AI &amp; Copilot Engine</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          {isConfigured ? (
            <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-300 text-xs font-semibold"
            >
              ✓ Live AI ({statusQ.data?.provider || "Active"})
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="bg-cyan-50 text-cyan-800 border-cyan-300 dark:bg-cyan-950/30 dark:text-cyan-300 text-xs"
            >
              Database Search Mode (Offline Safe)
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        <p className="text-muted-foreground leading-relaxed">
          Stoneman AI provides zero-downtime, direct database searching for records across quotes,
          invoices, customers, dispatches, and sales orders (for example:{" "}
          <em>&quot;quotation of Mehulbhai&quot;</em> or <em>&quot;invoices for Dinesh&quot;</em>).
          To enable conversational AI and how-to guidance, configure your OpenRouter or Google
          Gemini API key below.
        </p>

        {isAdmin && (
          <div className="space-y-3 rounded-lg border border-border/80 bg-muted/20 p-3.5">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5 text-primary" />
              Configure AI API Key (OpenRouter or Google Gemini)
            </Label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    isConfigured
                      ? "•••••••••••••••••••••••• (Key Active — enter new key to update)"
                      : "Enter OpenRouter (sk-or-...) or Gemini (AIza...) API Key"
                  }
                  className="h-8 text-xs font-mono pr-8"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              <Button
                size="sm"
                onClick={() => saveMut.mutate(apiKey.trim())}
                disabled={!apiKey.trim() || saveMut.isPending}
                className="h-8 text-xs gap-1.5 cursor-pointer shrink-0"
              >
                {saveMut.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                Save API Key
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Stored securely in database site settings. Automatically detected whether you provide
              an OpenRouter key (<code className="text-primary font-mono">sk-or-...</code>) or
              Google Gemini API key (<code className="text-primary font-mono">AIza...</code>).
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** AI Site Assistant panel — calls analyzeInstallationSite server fn. */
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { analyzeInstallationSite } from "@/lib/installation/site-ai.functions";
import { toUserMessage } from "@/lib/errors";

type Result = Awaited<ReturnType<typeof analyzeInstallationSite>>;

export function SiteAiPanel({ installationId }: { installationId: string }) {
  const analyze = useServerFn(analyzeInstallationSite);
  const [result, setResult] = useState<Result | null>(null);
  const mut = useMutation({
    mutationFn: () => analyze({ data: { installation_id: installationId } }),
    onSuccess: (r) => setResult(r),
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const ai = result?.ai as
    | {
        scores?: Record<string, number>;
        summary?: string;
        recommendations?: Array<{ category: string; action: string; explanation: string }>;
      }
    | undefined;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-primary" /> AI Site Assistant
        </CardTitle>
        <Button size="sm" onClick={() => mut.mutate()} disabled={mut.isPending}>
          {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {result ? "Re-analyse" : "Analyse"}
        </Button>
      </CardHeader>
      <CardContent className="text-sm">
        {!result && !mut.isPending && (
          <p className="text-muted-foreground">
            Analyse delay risk, labour productivity, material consumption, progress and customer satisfaction.
          </p>
        )}
        {ai?.scores && (
          <div className="mb-3 grid grid-cols-2 gap-2">
            {Object.entries(ai.scores).map(([k, v]) => (
              <div key={k} className="rounded-md border p-2">
                <div className="text-xs text-muted-foreground capitalize">{k.replaceAll("_", " ")}</div>
                <div className="text-lg font-medium">{Number(v)}<span className="text-xs text-muted-foreground">/100</span></div>
              </div>
            ))}
          </div>
        )}
        {ai?.summary && <p className="mb-3 whitespace-pre-wrap">{ai.summary}</p>}
        {ai?.recommendations && ai.recommendations.length > 0 && (
          <ul className="space-y-2">
            {ai.recommendations.map((r, i) => (
              <li key={i} className="rounded-md border p-2">
                <div className="text-xs uppercase tracking-wide text-primary">{r.category}</div>
                <div className="font-medium">{r.action}</div>
                <div className="text-xs text-muted-foreground">{r.explanation}</div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

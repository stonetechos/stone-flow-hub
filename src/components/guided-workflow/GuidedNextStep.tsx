/**
 * Guided Workflow Assistant — presentational card.
 *
 * Renders a soft, dismissable suggestion pointing at the next lifecycle step
 * for the current entity (Customer → Enquiry → Project → Quote → SO →
 * Invoice → Receipt → Installation). Rules:
 *
 *  • Purely additive UI — never mutates data, never changes stage, never
 *    bypasses permissions. The Continue button is a router `<Link>` to the
 *    normal create surface where the user's existing permissions apply.
 *  • When `hasNext` is not supplied, the card auto-probes the DB (HEAD count,
 *    cached 60 s) and hides itself if the downstream artefact already
 *    exists — no per-page wiring required.
 *  • Callers may still pass `hasNext` explicitly to override the probe.
 *  • Detail-page hotkey `n` (Continue) fires the primary CTA when the card
 *    is visible and the user isn't typing.
 *  • "Skip for now" persists per-entity in localStorage. Because the skip key
 *    contains the source entity's UUID, opening the next entity's own detail
 *    page later shows a fresh recommendation for that new entity.
 */
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Compass, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useGuidedSkip } from "@/hooks/use-guided-skip";
import { useGuidedEnabled } from "@/hooks/use-guided-enabled";
import { useHotkey } from "@/hooks/use-hotkey";
import { nextGuidedStep, type GuidedContext, type GuidedEntity } from "@/lib/guided-workflow/steps";
import { downstreamQueryKey, probeDownstream } from "@/lib/guided-workflow/downstream";

interface Props {
  entity: GuidedEntity;
  entityId: string;
  ctx?: GuidedContext;
  /**
   * Optional explicit override. When `undefined` (the common case) the card
   * probes the DB itself. Set to `true` when the caller already knows the
   * downstream artefact exists (avoids a redundant query). Set to `false`
   * to force the banner even if a downstream row exists (rare).
   */
  hasNext?: boolean;
  reasonOverride?: string;
}

export function GuidedNextStep({ entity, entityId, ctx, hasNext, reasonOverride }: Props) {
  const [enabled] = useGuidedEnabled();
  const step = nextGuidedStep(entity, entityId, ctx);
  const { skipped, skip } = useGuidedSkip(step?.skipKey);
  const nav = useNavigate();

  // Only probe when we actually might show the card — cheap, but no reason
  // to hit the DB on disabled/skipped/already-known cases.
  const probeEnabled = !!step && !!enabled && !skipped && hasNext === undefined;

  const probe = useQuery({
    queryKey: downstreamQueryKey(entity, entityId),
    queryFn: () => probeDownstream(entity, entityId),
    enabled: probeEnabled,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });

  const downstreamExists = hasNext !== undefined ? hasNext : probe.data === true;

  const visible = !!step && !!enabled && !skipped && !downstreamExists && !probe.isLoading;

  // Bind `n` → Continue while the banner is visible. Guarded by the hook's
  // own typing-target check so it never fires inside inputs/dialogs.
  useHotkey(
    "n",
    () => {
      if (!step) return;
      nav({ to: step.href as never, search: step.search as never });
    },
    visible,
  );

  if (!visible || !step) return null;

  return (
    <Card className="border-primary/30 bg-primary/[0.04] shadow-1">
      <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 rounded-md bg-primary/10 p-1.5 text-primary">
            <Compass className="h-4 w-4" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="text-sm font-semibold leading-tight">{step.title}</div>
            <div className="text-xs text-muted-foreground">
              {reasonOverride ?? step.description}
            </div>
            <div className="text-[11px] text-muted-foreground/80">
              Suggestion only — nothing happens automatically. Press{" "}
              <kbd className="rounded border border-border bg-muted px-1 py-px font-mono text-[10px]">
                N
              </kbd>{" "}
              to continue.
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
          <Button variant="ghost" size="sm" onClick={skip}>
            <X className="mr-1 h-3.5 w-3.5" /> Skip for now
          </Button>
          <Button asChild size="sm">
            <Link to={step.href as never} search={step.search as never}>
              {step.ctaLabel} <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

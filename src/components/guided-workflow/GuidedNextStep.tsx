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
 *  • `hasNext` (optional) auto-hides the assistant when the downstream
 *    artefact already exists (e.g. a quote already has a sales order).
 *  • "Skip for now" persists per-entity in localStorage. Because the skip key
 *    contains the source entity's UUID, opening the next entity's own detail
 *    page later shows a fresh recommendation for that new entity.
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight, Compass, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useGuidedSkip } from "@/hooks/use-guided-skip";
import { nextGuidedStep, type GuidedEntity } from "@/lib/guided-workflow/steps";

interface Props {
  /** The entity the user is currently viewing. */
  entity: GuidedEntity;
  /** Its stable UUID. */
  entityId: string;
  /**
   * Set to `true` when the downstream artefact already exists (e.g. this
   * quote already has a linked sales order). The card renders nothing.
   */
  hasNext?: boolean;
  /** Optional override text if the caller wants a more specific reason. */
  reasonOverride?: string;
}

export function GuidedNextStep({ entity, entityId, hasNext, reasonOverride }: Props) {
  const step = nextGuidedStep(entity, entityId);
  const { skipped, skip } = useGuidedSkip(step?.skipKey);

  if (!step || hasNext || skipped) return null;

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
              Suggestion only — nothing happens automatically.
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
          <Button variant="ghost" size="sm" onClick={skip}>
            <X className="mr-1 h-3.5 w-3.5" /> Skip for now
          </Button>
          <Button asChild size="sm">
            <Link to={step.href}>
              {step.ctaLabel} <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

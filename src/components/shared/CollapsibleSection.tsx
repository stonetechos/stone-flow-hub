/**
 * CollapsibleSection — shared collapsible group used across dashboards,
 * settings and forms. Wraps shadcn Collapsible with the Stone Tech OS
 * section header treatment: typographic title, muted description, optional
 * right-aligned aside, hairline underline when open.
 */
import type { ReactNode } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function CollapsibleSection({
  title,
  description,
  aside,
  defaultOpen,
  open,
  onOpenChange,
  children,
  className,
}: {
  title: string;
  description?: string;
  aside?: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      open={open}
      onOpenChange={onOpenChange}
      className={cn("group/section", className)}
    >
      <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-3">
        <CollapsibleTrigger className="group flex flex-1 items-start gap-2 text-left">
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
          <div className="flex-1">
            <h3 className="font-display text-[15px] font-semibold tracking-tight text-foreground">
              {title}
            </h3>
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
        </CollapsibleTrigger>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
      <CollapsibleContent className="pt-4">{children}</CollapsibleContent>
    </Collapsible>
  );
}

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Stone Tech OS alert — Phase D.
 *
 * Status-tinted panels driven by the shared `--status-*` token trio, so
 * every theme recolours in step. Icons pick up the fg token automatically.
 */
const alertVariants = cva(
  "relative w-full rounded-md border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-3.5 [&>svg]:h-4 [&>svg]:w-4 [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "border-border-subtle bg-surface-panel text-foreground [&>svg]:text-muted-foreground",
        info: "border-status-info-border bg-status-info-bg text-status-info-fg [&>svg]:text-status-info-fg",
        success: "border-status-success-border bg-status-success-bg text-status-success-fg [&>svg]:text-status-success-fg",
        warning: "border-status-warning-border bg-status-warning-bg text-status-warning-fg [&>svg]:text-status-warning-fg",
        destructive:
          "border-status-danger-border bg-status-danger-bg text-status-danger-fg [&>svg]:text-status-danger-fg",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5
      ref={ref}
      className={cn("mb-1 font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  ),
);
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("text-sm opacity-90 [&_p]:leading-relaxed", className)} {...props} />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription, alertVariants };

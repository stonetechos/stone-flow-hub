"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-[var(--surface-scrim)] backdrop-blur-[3px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  /**
   * When true, children render directly inside the dialog with no auto
   * scroll wrapper. Reserve for consumers (e.g. CommandDialog) that manage
   * their own scroll surface end-to-end.
   */
  noAutoScroll?: boolean;
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, noAutoScroll = false, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // Position + sizing — mobile-first, uses dvh so the virtual keyboard
        // shrinks the container instead of clipping it. Outer container never
        // scrolls; the inner wrapper below handles it.
        "fixed left-[50%] top-[50%] z-50 flex translate-x-[-50%] translate-y-[-50%] flex-col",
        "w-[calc(100vw-1rem)] max-w-lg sm:w-full",
        "max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-4rem)]",
        "overflow-hidden rounded-lg border border-border-subtle bg-[var(--surface-elevated)] shadow-e3",
        noAutoScroll ? "" : "p-6",
        "duration-[var(--duration-base)] ease-[var(--ease-out)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        className,
      )}
      {...props}
    >
      {noAutoScroll ? (
        children
      ) : (
        <div
          className={cn(
            // Internal scroll region — used by every standard dialog so
            // long forms scroll without clipping fields or action rows.
            "-m-6 flex min-h-0 flex-1 flex-col gap-4 overlay-scroll p-6",
            // iOS safe-area at the bottom so action rows stay reachable.
            "pb-[max(1.5rem,env(safe-area-inset-bottom))]",
          )}
        >
          {children}
        </div>
      )}
      <DialogPrimitive.Close
        aria-label="Close dialog"
        className="absolute right-3 top-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground cursor-pointer transition-colors hover:bg-[var(--intent-ghost-hover)] hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--intent-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-elevated)] disabled:pointer-events-none"
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex shrink-0 flex-col space-y-1.5 pr-8 text-center sm:text-left", className)}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

/**
 * DialogBody — passthrough kept for backwards compat. The DialogContent
 * scroll wrapper handles overflow globally, so this just marks the flexible
 * middle region.
 */
const DialogBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("min-h-0 flex-1", className)} {...props} />
);
DialogBody.displayName = "DialogBody";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "mt-auto flex shrink-0 flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2 sm:space-x-0",
      className,
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("font-display text-lg font-semibold leading-tight tracking-tight text-foreground", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};

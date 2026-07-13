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

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // Position + sizing — mobile-first, uses dvh so the virtual keyboard
        // shrinks the container instead of clipping it.
        "fixed left-[50%] top-[50%] z-50 flex translate-x-[-50%] translate-y-[-50%] flex-col gap-4",
        "w-[calc(100vw-1rem)] max-w-lg sm:w-full",
        "max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-4rem)]",
        // Global overlay scroll strategy — every dialog scrolls internally.
        "overlay-scroll",
        // Skin
        "rounded-lg border border-border-subtle bg-[var(--surface-elevated)] p-6 shadow-e3",
        // iOS safe-area at the bottom so action rows stay reachable.
        "pb-[max(1.5rem,env(safe-area-inset-bottom))]",
        // Motion
        "duration-[var(--duration-base)] ease-[var(--ease-out)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        className,
      )}
      {...props}
    >
      {children}
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
    className={cn(
      // Sticky so titles stay visible while long forms scroll.
      "sticky top-0 z-10 -mx-6 -mt-6 flex shrink-0 flex-col space-y-1.5 border-b border-border-subtle bg-[var(--surface-elevated)] px-6 pb-3 pt-6 text-center sm:text-left",
      className,
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

/**
 * DialogBody — kept as a passthrough for backwards compat. The outer
 * DialogContent now owns scrolling globally, so DialogBody just provides
 * consistent padding + a min-height floor.
 */
const DialogBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("min-h-0 flex-1", className)} {...props} />
);
DialogBody.displayName = "DialogBody";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      // Sticky action row — Save / Cancel always reachable, even mid-scroll.
      "sticky bottom-[calc(-1*max(1.5rem,env(safe-area-inset-bottom)))] z-10 -mx-6 -mb-[max(1.5rem,env(safe-area-inset-bottom))] mt-2 flex shrink-0 flex-col-reverse gap-2 border-t border-border-subtle bg-[var(--surface-elevated)] px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:flex-row sm:justify-end sm:gap-2 sm:space-x-0",
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

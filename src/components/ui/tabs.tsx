import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

/**
 * STOS tabs.
 *
 * Underline style, not a pill background — quieter, more editorial. The
 * list is a bottom hairline; the active trigger paints a 2px accent bar
 * flush with that hairline.
 */
const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      // Phase G.11, Section 5: several detail pages register 10-15 tabs —
      // more than fits at any viewport width, including desktop. tabstrip-scroll
      // (styles.css) makes the strip horizontally scrollable with hidden
      // scrollbar chrome instead of silently overflowing the container.
      "relative flex h-10 items-center gap-1 border-b border-border text-muted-foreground w-full tabstrip-scroll",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "relative inline-flex h-10 shrink-0 items-center justify-center whitespace-nowrap px-3.5 text-xs sm:text-sm font-semibold cursor-pointer transition-all",
      "text-slate-600 hover:text-blue-700",
      "focus-visible:outline-none focus-visible:text-blue-700",
      "disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed",
      "data-[state=active]:text-blue-700 data-[state=active]:font-bold",
      "after:absolute after:inset-x-2 after:-bottom-px after:h-[2.5px] after:rounded-full after:bg-blue-600 after:shadow-[0_0_8px_rgba(37,99,235,0.7)] after:opacity-0 after:transition-opacity",
      "data-[state=active]:after:opacity-100",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("mt-4 focus-visible:outline-none", className)}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };

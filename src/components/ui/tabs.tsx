import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { useTranslation } from "react-i18next";
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
>(({ className, ...props }, ref) => {
  const isWrap = Boolean(className && className.includes("flex-wrap"));
  const innerRef = React.useRef<HTMLDivElement | null>(null);

  // Chrome on desktop does not convert vertical wheel to horizontal scroll by default.
  // Add a listener so users can scroll long tab strips with normal mouse wheels.
  React.useEffect(() => {
    const el = innerRef.current;
    if (!el || isWrap) return;

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && el.scrollWidth > el.clientWidth) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [isWrap]);

  return (
    <TabsPrimitive.List
      ref={(node) => {
        innerRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }}
      className={cn(
        "relative flex items-center gap-1 border-b border-border text-muted-foreground w-full",
        isWrap ? "h-auto flex-wrap overflow-visible" : "h-10 tabstrip-scroll scroll-smooth",
        className,
      )}
      {...props}
    />
  );
});
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, children, onClick, ...props }, ref) => {
  const { t } = useTranslation();
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);

  const translateNode = (node: React.ReactNode): React.ReactNode => {
    if (typeof node === "string") {
      const trimmed = node.trim();
      if (!trimmed) return node;
      const translated = t(
        `tab.${trimmed}`,
        t(`nav.items.${trimmed.toLowerCase()}`, t(`field.${trimmed}`, t(trimmed, trimmed))),
      );
      if (translated !== trimmed) {
        return node.replace(trimmed, translated);
      }
      return node;
    }
    if (
      React.isValidElement(node) &&
      node.props &&
      (node.props as Record<string, unknown>).children
    ) {
      return React.cloneElement(
        node as React.ReactElement<{ children?: React.ReactNode }>,
        undefined,
        React.Children.map((node.props as { children?: React.ReactNode }).children, translateNode),
      );
    }
    return node;
  };

  const translatedChildren = React.Children.map(children, translateNode);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    triggerRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
    onClick?.(e);
  };

  return (
    <TabsPrimitive.Trigger
      ref={(node) => {
        triggerRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node;
      }}
      onClick={handleClick}
      className={cn(
        "relative inline-flex h-10 shrink-0 items-center justify-center whitespace-nowrap px-3.5 text-xs sm:text-sm font-semibold cursor-pointer transition-all",
        "text-slate-600 hover:text-cyan-800",
        "focus-visible:outline-none focus-visible:text-cyan-800",
        "disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed",
        "data-[state=active]:text-cyan-800 data-[state=active]:font-bold",
        "after:absolute after:inset-x-2 after:-bottom-px after:h-[2.5px] after:rounded-full after:bg-cyan-700 after:shadow-[0_0_8px_rgba(14,116,144,0.7)] after:opacity-0 after:transition-opacity",
        "data-[state=active]:after:opacity-100",
        className,
      )}
      {...props}
    >
      {translatedChildren}
    </TabsPrimitive.Trigger>
  );
});
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

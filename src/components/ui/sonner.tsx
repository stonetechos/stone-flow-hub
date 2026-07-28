import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

// Default toast position is top-right (__root.tsx) — on an edge-to-edge
// Android WebView the un-offset default would render under the status bar.
// `max(1rem, env(...))` keeps the existing 1rem gap on desktop/iOS (where
// the inset is 0) and grows only on devices that actually report a cutout.
const SAFE_AREA_OFFSET = {
  top: "max(1rem, env(safe-area-inset-top))",
  right: "max(1rem, env(safe-area-inset-right))",
  bottom: "max(1rem, env(safe-area-inset-bottom))",
  left: "max(1rem, env(safe-area-inset-left))",
};

const Toaster = ({ offset, ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      offset={offset ?? SAFE_AREA_OFFSET}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };

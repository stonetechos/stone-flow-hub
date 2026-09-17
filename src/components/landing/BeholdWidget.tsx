import { useEffect, useRef } from "react";
import { BEHOLD_FEED_ID } from "@/lib/instagram/feed";

interface BeholdWidgetProps {
  feedId?: string;
  className?: string;
}

export function BeholdWidget({ feedId = BEHOLD_FEED_ID, className }: BeholdWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Load Behold widget script once
    const win = window as unknown as { __bhldScript?: boolean };
    if (!win.__bhldScript) {
      win.__bhldScript = true;
      const script = document.createElement("script");
      script.type = "module";
      script.src = "https://w.behold.so/widget.js";
      document.head.appendChild(script);
    }

    // Ensure the custom element is attached inside the container
    const container = containerRef.current;
    if (container && !container.querySelector("behold-widget")) {
      const widget = document.createElement("behold-widget");
      widget.setAttribute("feed-id", feedId);
      container.appendChild(widget);
    }
  }, [feedId]);

  return (
    <div
      ref={containerRef}
      className={className ?? "w-full min-h-[320px] rounded-2xl overflow-hidden"}
    />
  );
}

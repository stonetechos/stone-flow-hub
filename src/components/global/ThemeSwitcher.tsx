/**
 * STOS — Theme switcher.
 *
 * Applies one of the four STDL themes as a class on the <html> element
 * and persists the choice per browser. Presentation only — no business
 * logic and no impact on routing or Supabase.
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type ThemeId = "st-og" | "st-bw" | "st-pop" | "st-pastel";

export const THEMES: ReadonlyArray<{
  id: ThemeId;
  label: string;
  description: string;
  swatch: string;
  dark: boolean;
}> = [
  {
    id: "st-og",
    label: "ST OG",
    description: "Original Stone Tech Atelier (Quarry Deep Teal)",
    swatch: "linear-gradient(135deg, #083b43 0%, #0d9488 50%, #22d3ee 100%)",
    dark: false,
  },
  {
    id: "st-bw",
    label: "ST BW",
    description: "Black & White (Architectural Monochrome Luxury)",
    swatch: "linear-gradient(135deg, #000000 0%, #333333 50%, #ffffff 100%)",
    dark: false,
  },
  {
    id: "st-pop",
    label: "ST POP",
    description: "Multicolors (Electric Pop & Vibrant Colors)",
    swatch: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 33%, #06b6d4 66%, #facc15 100%)",
    dark: false,
  },
  {
    id: "st-pastel",
    label: "ST Pastel",
    description: "Pastel Colored (Soft Eucalyptus Sage, Blush & Cream)",
    swatch: "linear-gradient(135deg, #283e39 0%, #99f6e4 33%, #fbcfe8 66%, #fed7aa 100%)",
    dark: false,
  },
];

const STORAGE_KEY = "st.stdl.theme";
const ALL_THEME_CLASSES = [
  "theme-st-og",
  "theme-st-bw",
  "theme-st-pop",
  "theme-st-pastel",
  "theme-monochrome",
  "theme-batman",
  "theme-pink",
  "theme-pop",
  "dark",
];

export function applyTheme(id: ThemeId): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  ALL_THEME_CLASSES.forEach((cls) => root.classList.remove(cls));
  root.classList.add(`theme-${id}`);
  const dark = THEMES.find((t) => t.id === id)?.dark ?? false;
  if (dark) root.classList.add("dark");
}

export function readInitialTheme(): ThemeId {
  if (typeof window === "undefined") return "st-og";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      if (raw === "monochrome" || raw === "batman") return "st-bw";
      if (raw === "pop") return "st-pop";
      if (raw === "pink") return "st-pastel";
      if (THEMES.some((t) => t.id === raw)) return raw as ThemeId;
    }
  } catch {
    /* ignore */
  }
  return "st-og";
}

export function useActiveTheme(): ThemeId {
  const [theme, setTheme] = useState<ThemeId>(readInitialTheme);

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<ThemeId>;
      if (customEvent.detail && THEMES.some((t) => t.id === customEvent.detail)) {
        setTheme(customEvent.detail);
      } else {
        setTheme(readInitialTheme());
      }
    };
    window.addEventListener("st:theme-changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("st:theme-changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  return theme;
}

export function ThemeSwitcher({ className }: { className?: string }) {
  const { t } = useTranslation();
  const theme = useActiveTheme();

  // Hydrate from storage and apply on mount
  useEffect(() => {
    const initial = readInitialTheme();
    applyTheme(initial);
  }, []);

  const select = (id: ThemeId): void => {
    applyTheme(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
      window.dispatchEvent(new CustomEvent("st:theme-changed", { detail: id }));
    } catch {
      /* ignore */
    }
  };

  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0];
  const currentLabel = current.label;

  return (
    <DropdownMenu>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8 rounded-md transition-colors", className)}
                aria-label={`Theme: ${currentLabel}. Click to switch theme.`}
              >
                <span
                  aria-hidden
                  className="h-4 w-4 rounded-full border border-border-default shadow-xs ring-1 ring-border/50"
                  style={{ background: current.swatch }}
                />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Theme · {currentLabel}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DropdownMenuContent align="end" className="w-64 p-1 shadow-xl border-border">
        <DropdownMenuLabel className="flex items-center gap-2 px-2 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          <Palette className="h-3 w-3 text-primary" aria-hidden />
          Select Theme
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {THEMES.map((themeItem) => {
          const active = themeItem.id === theme;
          const label = t(`theme.items.${themeItem.id}.label`, themeItem.label);
          const desc = t(`theme.items.${themeItem.id}.desc`, themeItem.description);
          return (
            <DropdownMenuItem
              key={themeItem.id}
              onSelect={(e) => {
                e.preventDefault();
                select(themeItem.id);
              }}
              className={cn(
                "flex items-start gap-3 rounded-sm px-2 py-2 focus:bg-accent",
                active && "bg-accent/60",
              )}
            >
              <span
                aria-hidden
                className="mt-0.5 h-8 w-8 shrink-0 rounded-md border border-border-default shadow-e1"
                style={{ background: themeItem.swatch }}
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-foreground">{label}</span>
                  {active && <Check className="h-3.5 w-3.5 text-primary" aria-hidden />}
                </span>
                <span className="truncate text-[11px] text-muted-foreground">{desc}</span>
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

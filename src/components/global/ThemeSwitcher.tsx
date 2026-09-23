/**
 * STOS — Theme switcher.
 *
 * Applies one of the four STDL themes as a class on the <html> element
 * and persists the choice per browser. Presentation only — no business
 * logic and no impact on routing or Supabase.
 */
import { useEffect, useState } from "react";
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

type ThemeId = "monochrome" | "batman" | "pink" | "pop";

const THEMES: ReadonlyArray<{
  id: ThemeId;
  label: string;
  description: string;
  swatch: string;
  dark: boolean;
}> = [
  {
    id: "monochrome",
    label: "Monochrome",
    description: "White, grey, and black",
    swatch: "linear-gradient(135deg, #ffffff 0%, #a3a3a3 55%, #171717 100%)",
    dark: false,
  },
  {
    id: "batman",
    label: "Batman",
    description: "Dark knight theme",
    swatch: "linear-gradient(135deg, #09090b 0%, #27272a 55%, #fde047 100%)",
    dark: true,
  },
  {
    id: "pink",
    label: "Soft Pink",
    description: "Girly soft pink surfaces",
    swatch: "linear-gradient(135deg, #fdf2f8 0%, #fbcfe8 55%, #ec4899 100%)",
    dark: false,
  },
  {
    id: "pop",
    label: "Pop Colored",
    description: "Vibrant and punchy",
    swatch: "linear-gradient(135deg, #fcd34d 0%, #3b82f6 55%, #ef4444 100%)",
    dark: false,
  },
];

const STORAGE_KEY = "st.stdl.theme";
const THEME_CLASSES = THEMES.map((t) => `theme-${t.id}` as const);

function applyTheme(id: ThemeId): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  THEME_CLASSES.forEach((cls) => root.classList.remove(cls));
  root.classList.remove("dark");
  root.classList.add(`theme-${id}`);
  const dark = THEMES.find((t) => t.id === id)?.dark ?? false;
  if (dark) root.classList.add("dark");
}

function readInitialTheme(): ThemeId {
  if (typeof window === "undefined") return "monochrome";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw && THEMES.some((t) => t.id === raw)) return raw as ThemeId;
  } catch {
    /* ignore */
  }
  return "monochrome";
}

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<ThemeId>("monochrome");

  // Hydrate from storage and apply, avoiding SSR mismatch.
  useEffect(() => {
    const initial = readInitialTheme();
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const select = (id: ThemeId): void => {
    setTheme(id);
    applyTheme(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  };

  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  return (
    <DropdownMenu>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label={`Theme: ${current.label}. Change theme`}
              >
                <span
                  aria-hidden
                  className="h-4 w-4 rounded-full border border-border-default shadow-e1"
                  style={{ background: current.swatch }}
                />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Theme · {current.label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DropdownMenuContent align="end" className="w-64 p-1">
        <DropdownMenuLabel className="flex items-center gap-2 px-2 py-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          <Palette className="h-3 w-3" aria-hidden />
          Stone theme
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {THEMES.map((t) => {
          const active = t.id === theme;
          return (
            <DropdownMenuItem
              key={t.id}
              onSelect={(e) => {
                e.preventDefault();
                select(t.id);
              }}
              className={cn(
                "flex items-start gap-3 rounded-sm px-2 py-2 focus:bg-accent",
                active && "bg-accent/60",
              )}
            >
              <span
                aria-hidden
                className="mt-0.5 h-8 w-8 shrink-0 rounded-md border border-border-default shadow-e1"
                style={{ background: t.swatch }}
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-foreground">{t.label}</span>
                  {active && <Check className="h-3.5 w-3.5 text-primary" aria-hidden />}
                </span>
                <span className="truncate text-[11px] text-muted-foreground">{t.description}</span>
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

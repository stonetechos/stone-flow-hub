import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function LanguageToggle({ className }: { className?: string }) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith("hi") ? "hi" : "en";

  const toggleLanguage = () => {
    const nextLang = currentLang === "en" ? "hi" : "en";
    void i18n.changeLanguage(nextLang);
    try {
      localStorage.setItem("stos-lang", nextLang);
      document.documentElement.lang = nextLang;
    } catch {
      /* ignore */
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            className={cn(
              "h-8 px-2 text-xs font-semibold text-text-muted hover:text-text-primary hover:bg-surface-panel gap-1.5 transition-colors",
              className,
            )}
            aria-label={`Switch language. Current: ${currentLang === "en" ? "English" : "Hindi"}`}
          >
            <Languages className="h-3.5 w-3.5 shrink-0 text-cyan-600 dark:text-cyan-400" />
            <span className="font-medium tracking-wide">
              {currentLang === "en" ? (
                <span>
                  <span className="font-bold text-text-primary">EN</span>
                  <span className="text-text-muted/50 mx-0.5">/</span>
                  <span className="text-text-muted/80 text-[11px]">हिं</span>
                </span>
              ) : (
                <span>
                  <span className="font-bold text-cyan-600 dark:text-cyan-400">हिन्दी</span>
                  <span className="text-text-muted/50 mx-0.5">/</span>
                  <span className="text-text-muted/80 text-[11px]">EN</span>
                </span>
              )}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {currentLang === "en" ? "Switch to हिन्दी" : "Switch to English"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

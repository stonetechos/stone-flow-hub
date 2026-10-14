import { Languages, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { SUPPORTED_LANGUAGES, type LangCode } from "@/lib/i18n";

export function LanguageToggle({ className }: { className?: string }) {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language?.substring(0, 2) || "en") as LangCode;

  const handleLanguageChange = (code: string) => {
    void i18n.changeLanguage(code);
    try {
      localStorage.setItem("stos-lang", code);
      document.documentElement.lang = code;
    } catch {
      /* ignore */
    }
  };

  const activeLangDef =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentLang) || SUPPORTED_LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 px-1.5 sm:px-2 text-xs font-semibold text-text-muted hover:text-text-primary hover:bg-surface-panel gap-1 transition-colors",
            className,
          )}
          aria-label={`Switch language. Current: ${activeLangDef.label}`}
        >
          <Languages className="h-4 w-4 shrink-0 text-cyan-600 dark:text-cyan-400" />
          <span className="font-bold text-text-primary text-[11px] sm:text-xs tracking-tight">
            {activeLangDef.short}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[150px] z-50">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            className="flex items-center justify-between cursor-pointer py-2 text-xs font-medium"
            onSelect={() => handleLanguageChange(lang.code)}
          >
            <div className="flex flex-col">
              <span className="font-semibold text-foreground">{lang.nativeLabel}</span>
              <span className="text-[10px] text-muted-foreground">{lang.label}</span>
            </div>
            {currentLang === lang.code && (
              <Check className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

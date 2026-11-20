/**
 * DownloadCataloguesDropdown.tsx
 *
 * Dedicated Top-Right Control above the Product Catalog box.
 * Allows users to select which catalogue to download (Wall Cladding, Stone Veneer,
 * Glass Bricks, Clay Veneers, Stone Pebbles, Executed Works) and choose their preferred
 * language with Tiranga / Indian Flag themed buttons (English Saffron, Hindi White, Gujarati Green).
 */

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  BookOpen,
  ChevronDown,
  Download,
  Layers,
  Sparkles,
  Gem,
  Compass,
  CircleDot,
  Camera,
  MessageCircle,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface DownloadCataloguesDropdownProps {
  className?: string;
  align?: "start" | "center" | "end";
}

function getTirangaLangBtnClass(btnLang: "en" | "hi" | "gu", activeLang: string) {
  const isActive = activeLang === btnLang;
  if (btnLang === "en") {
    return cn(
      "flex-1 text-center py-1.5 px-2 text-[11px] font-bold rounded-md transition-all cursor-pointer border",
      "bg-[#FF9933] hover:bg-[#F28500] text-white border-[#E68524] shadow-xs",
      isActive
        ? "ring-2 ring-amber-500 ring-offset-1 font-extrabold shadow-sm scale-[1.02]"
        : "opacity-95 hover:opacity-100",
    );
  }
  if (btnLang === "hi") {
    return cn(
      "flex-1 text-center py-1.5 px-2 text-[11px] font-bold rounded-md transition-all cursor-pointer border",
      "bg-white dark:bg-stone-100 hover:bg-stone-50 text-slate-950 border-slate-300 dark:border-slate-400 shadow-xs",
      isActive
        ? "ring-2 ring-slate-500 ring-offset-1 font-extrabold shadow-sm scale-[1.02]"
        : "opacity-95 hover:opacity-100",
    );
  }
  // gu (Indian Green)
  return cn(
    "flex-1 text-center py-1.5 px-2 text-[11px] font-bold rounded-md transition-all cursor-pointer border",
    "bg-[#138808] hover:bg-[#0E6C06] text-white border-[#0E6C06] shadow-xs",
    isActive
      ? "ring-2 ring-emerald-500 ring-offset-1 font-extrabold shadow-sm scale-[1.02]"
      : "opacity-95 hover:opacity-100",
  );
}

export function DownloadCataloguesDropdown({
  className,
  align = "end",
}: DownloadCataloguesDropdownProps) {
  const { i18n } = useTranslation();
  const rawLang = (i18n.language?.substring(0, 2) || "en") as string;
  const lang: "en" | "hi" | "gu" = rawLang === "hi" ? "hi" : rawLang === "gu" ? "gu" : "en";

  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const checkHash = () => {
      const h = window.location.hash.toLowerCase();
      const s = window.location.search.toLowerCase();
      if (
        h === "#catalogues" ||
        h === "#download-catalogues" ||
        h === "#catalogue" ||
        h === "#pdf-catalogues" ||
        s.includes("catalog")
      ) {
        setIsOpen(true);
      }
    };
    checkHash();
    window.addEventListener("hashchange", checkHash);
    return () => window.removeEventListener("hashchange", checkHash);
  }, []);

  const shareUrl = "https://stonetech.in/?catalogues=2026#catalogues";

  const getShareText = () => {
    if (lang === "gu") {
      return (
        "નમસ્તે! સ્ટોન ટેકના તમામ વાસ્તુશિલ્પીય પ્રાકૃતિક પાષાણ કેટલોગ્સ (વોલ ક્લેડિંગ, સ્ટોન વિનિયર, ગ્લાસ બ્રિક્સ, ક્લે વિનિયર, સ્ટોન પેબલ્સ અને પ્રોજેક્ટ્સ) ઓનલાઇન જોવા અને PDF ડાઉનલોડ કરવા માટે અહીં ક્લિક કરો:\n👉 " +
        shareUrl
      );
    }
    if (lang === "hi") {
      return (
        "नमस्ते! स्टोन टेक के सभी वास्तुशिल्पीय प्राकृतिक पाषाण कैटलॉग (वॉल क्लैडिंग, स्टोन विनियर, ग्लास ब्रिक्स, क्ले विनियर, स्टोन पेबल्स एवं प्रोजेक्ट्स) ऑनलाइन देखने एवं PDF डाउनलोड करने हेतु यहाँ क्लिक करें:\n👉 " +
        shareUrl
      );
    }
    return (
      "Namaste! Explore & Download Stone Tech's Architectural Natural Stone Catalogues (Wall Cladding, Ultra-Thin Stone Veneer, Glass Bricks, Flexible Clay Veneers, Stone Pebbles & Executed Projects):\n👉 " +
      shareUrl
    );
  };

  const handleShareWhatsapp = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(getShareText())}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success(
        lang === "gu"
          ? "વોટ્સએપ કેટલોગ લિંક કૉપિ થઈ ગઈ!"
          : lang === "hi"
            ? "व्हाट्सएप कैटलॉग लिंक कॉपी हो गया!"
            : "WhatsApp catalogue share link copied to clipboard!",
      );
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.info(shareUrl);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* WhatsApp Share Link Button */}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleShareWhatsapp}
        className="h-9 px-2.5 sm:px-3 text-xs font-bold text-emerald-800 dark:text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/10 hover:border-emerald-500 gap-1.5 cursor-pointer shadow-xs rounded-xl bg-card/90 backdrop-blur-xs transition-all"
        title={
          lang === "gu"
            ? "વોટ્સએપ પર કેટલોગ લિંક શેર કરો"
            : lang === "hi"
              ? "व्हाट्सएप पर कैटलॉग लिंक शेयर करें"
              : "Share catalogue download link on WhatsApp"
        }
      >
        <MessageCircle className="h-4 w-4 text-[#25D366] fill-[#25D366]/20 shrink-0" />
        <span className="hidden sm:inline">
          {lang === "gu" ? "વોટ્સએપ લિંક" : lang === "hi" ? "व्हाट्सएप लिंक" : "WhatsApp Link"}
        </span>
        <span className="sm:hidden">
          {lang === "gu" ? "શેર" : lang === "hi" ? "शेयर" : "Share"}
        </span>
      </Button>

      {/* Main Download PDF Dropdown */}
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen} modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className={cn(
              "h-9 px-3 text-xs font-bold text-emerald-800 dark:text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/10 hover:border-emerald-500 gap-2 cursor-pointer shadow-xs rounded-xl bg-card/90 backdrop-blur-xs transition-all",
              className,
            )}
            title="Download verified architectural catalogues (PDF)"
          >
            <BookOpen className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="tracking-tight">
              {lang === "gu"
                ? "કેટલોગ ડાઉનલોડ (PDF)"
                : lang === "hi"
                  ? "कैटलॉग डाउनलोड (PDF)"
                  : "Download Catalogues (PDF)"}
            </span>
            {/* Subtle Indian Flag Tri-Color Accent Dots */}
            <span className="flex items-center gap-0.5 ml-0.5" aria-hidden="true">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FF9933]" />
              <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-stone-200" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#138808]" />
            </span>
            <ChevronDown className="h-3.5 w-3.5 opacity-60 ml-0.5" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align={align}
          collisionPadding={16}
          sideOffset={8}
          className="w-[340px] sm:w-[420px] overflow-y-auto p-3 space-y-2.5 z-50 rounded-2xl shadow-2xl border-border/80 overscroll-contain touch-pan-y [scrollbar-width:thin] [scrollbar-color:rgba(156,163,175,0.4)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50 [&::-webkit-scrollbar-thumb]:rounded-full"
          style={{
            maxHeight:
              "min(480px, calc(100vh - 160px), calc(var(--radix-dropdown-menu-content-available-height, 480px) - 20px))",
          }}
        >
          {/* WhatsApp Direct Share Banner */}
          <div className="rounded-xl border border-emerald-500/40 bg-linear-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/5 p-2.5 flex items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#25D366] text-white shrink-0 shadow-2xs">
                <MessageCircle className="h-4 w-4 fill-white" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-foreground truncate">
                  {lang === "gu"
                    ? "વોટ્સએપ પર કેટલોગ લિંક શેર કરો"
                    : lang === "hi"
                      ? "व्हाट्सएप पर कैटलॉग लिंक शेयर करें"
                      : "Share Catalogues on WhatsApp"}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">
                  stonetech.in/#catalogues
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleCopyLink}
                className="h-7 px-2 text-[11px] font-semibold gap-1 rounded-lg border-border hover:bg-background/80"
                title="Copy shareable link"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copy</span>
                  </>
                )}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleShareWhatsapp}
                className="h-7 px-2.5 text-[11px] font-bold gap-1 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-lg shadow-xs"
                title="Send via WhatsApp"
              >
                <MessageCircle className="h-3 w-3 fill-white" />
                <span>WhatsApp</span>
              </Button>
            </div>
          </div>
          <div className="space-y-0.5 px-1 pt-0.5">
            <DropdownMenuLabel className="p-0 text-xs font-bold text-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                {lang === "gu"
                  ? "વાસ્તુશિલ્પીય કેટલોગ્સ (PDF · ૬ સંગ્રહ)"
                  : lang === "hi"
                    ? "वास्तुशिल्पीय कैटलॉग (PDF · ६ संग्रह)"
                    : "Architectural Catalogues (PDF · 6 Collections)"}
              </span>
              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                <span>↓</span>
                <span>
                  {lang === "gu"
                    ? "સ્ક્રોલ કરો"
                    : lang === "hi"
                      ? "स्क्रॉल करें"
                      : "Scroll to view all"}
                </span>
              </span>
            </DropdownMenuLabel>
            <p className="text-[11px] text-muted-foreground">
              {lang === "gu"
                ? "સંગ્રહ પસંદ કરો અને ડાઉનલોડ કરવા માટે અંગ્રેજી, હિન્દી અથવા ગુજરાતી પર ક્લિક કરો"
                : lang === "hi"
                  ? "संग्रह चुनें और डाउनलोड करने हेतु अंग्रेज़ी, हिंदी अथवा गुजराती पर क्लिक करें"
                  : "Choose a collection and click English, Hindi, or Gujarati to download"}
            </p>
          </div>

          <DropdownMenuSeparator />

          {/* 1. Natural Stone Cladding Catalogue */}
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                {lang === "gu"
                  ? "કુદરતી પથ્થર દીવાલ ક્લેડિંગ (૭૧ પાન)"
                  : lang === "hi"
                    ? "प्राकृतिक पत्थर दीवार क्लैडिंग (७१ पृष्ठ)"
                    : "Natural Stone Cladding (71 Pgs)"}
              </span>
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
              >
                {lang === "gu" ? "૨૭૫ પેટર્ન્સ" : lang === "hi" ? "२७५ पैटर्न्स" : "275 Patterns"}
              </Badge>
            </div>

            <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground pt-0.5">
              <span className="flex items-center gap-1">
                <Download className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                <span>
                  {lang === "gu"
                    ? "સંપૂર્ણ ક્લેડિંગ કેટલોગ"
                    : lang === "hi"
                      ? "संपूर्ण क्लैडिंग कैटलॉग"
                      : "Complete Cladding Catalogue"}
                </span>
              </span>
              <span className="text-[10px] font-mono font-semibold text-foreground/80">
                14.2 MB
              </span>
            </div>

            <div className="flex items-center gap-1.5 pt-0.5">
              <a
                href="/catalogues/StoneTech_NaturalStone_WallCl_Options_English.pdf"
                download="StoneTech_NaturalStone_WallCl_Options_English.pdf"
                className={getTirangaLangBtnClass("en", lang)}
              >
                English
              </a>
              <a
                href="/catalogues/StoneTech_NaturalStone_WallCl_Options_Hindi.pdf"
                download="StoneTech_NaturalStone_WallCl_Options_Hindi.pdf"
                className={getTirangaLangBtnClass("hi", lang)}
              >
                हिंदी
              </a>
              <a
                href="/catalogues/StoneTech_NaturalStone_WallCl_Options_Gujarati.pdf"
                download="StoneTech_NaturalStone_WallCl_Options_Gujarati.pdf"
                className={getTirangaLangBtnClass("gu", lang)}
              >
                ગુજરાતી
              </a>
            </div>
          </div>

          {/* 2. Ultra-Thin Stone Veneer Catalogue */}
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                {lang === "gu"
                  ? "અત્યંત પાતળી કુદરતી સ્ટોન વિનિયર (૧૦૬ પાન)"
                  : lang === "hi"
                    ? "अत्यंत पतली लचीली स्टोन विनियर (१०६ पृष्ठ)"
                    : "Ultra-Thin Stone Veneer (106 Pgs)"}
              </span>
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4 border-amber-500/40 text-amber-700 dark:text-amber-300"
              >
                {lang === "gu" ? "૯૮ જાતો" : lang === "hi" ? "९८ किस्में" : "98 Varieties"}
              </Badge>
            </div>

            <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground pt-0.5">
              <span className="flex items-center gap-1">
                <Download className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                <span>
                  {lang === "gu"
                    ? "સ્લેટ, માર્બલ, સેન્ડસ્ટોન"
                    : lang === "hi"
                      ? "स्लेट, मार्बल, सैंडस्टोन"
                      : "Slate, Marble, Sandstone"}
                </span>
              </span>
              <span className="text-[10px] font-mono font-semibold text-foreground/80">
                15.0 MB
              </span>
            </div>

            <div className="flex items-center gap-1.5 pt-0.5">
              <a
                href="/catalogues/StoneTech_Stone_Veneer_Catalogue_English.pdf"
                download="StoneTech_Stone_Veneer_Catalogue_English.pdf"
                className={getTirangaLangBtnClass("en", lang)}
              >
                English
              </a>
              <a
                href="/catalogues/StoneTech_Stone_Veneer_Catalogue_Hindi.pdf"
                download="StoneTech_Stone_Veneer_Catalogue_Hindi.pdf"
                className={getTirangaLangBtnClass("hi", lang)}
              >
                हिंदी
              </a>
              <a
                href="/catalogues/StoneTech_Stone_Veneer_Catalogue_Gujarati.pdf"
                download="StoneTech_Stone_Veneer_Catalogue_Gujarati.pdf"
                className={getTirangaLangBtnClass("gu", lang)}
              >
                ગુજરાતી
              </a>
            </div>
          </div>

          {/* 3. Architectural Glass Bricks Catalogue */}
          <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                <Gem className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                {lang === "gu"
                  ? "વાસ્તુશિલ્પીય કાચની ઈંટો (૬૭ ડિઝાઇન્સ)"
                  : lang === "hi"
                    ? "वास्तुशिल्पीय कांच की ईंटें (६७ डिज़ाइन्स)"
                    : "Architectural Glass Bricks (67 Designs)"}
              </span>
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4 border-sky-500/40 text-sky-700 dark:text-sky-300"
              >
                {lang === "gu" ? "૬૭ ડિઝાઇન્સ" : lang === "hi" ? "६७ डिज़ाइन्स" : "67 Designs"}
              </Badge>
            </div>

            {/* Solid Bricks sub-row */}
            <div className="space-y-1 pt-0.5 border-t border-sky-500/15">
              <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Download className="h-3 w-3 text-sky-600 dark:text-sky-400" />
                  <span>
                    {lang === "gu"
                      ? "નક્કર કાચની ઈંટો (૩૪ પાન)"
                      : lang === "hi"
                        ? "ठोस कांच की ईंटें (३४ पृष्ठ)"
                        : "Solid Glass Bricks (34 Pgs)"}
                  </span>
                </span>
                <span className="text-[10px] font-mono font-semibold text-foreground/80">
                  9.0 MB
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <a
                  href="/catalogues/StoneTech_Solid_Glass_Bricks_Catalogue_English.pdf"
                  download="StoneTech_Solid_Glass_Bricks_Catalogue_English.pdf"
                  className={getTirangaLangBtnClass("en", lang)}
                >
                  English
                </a>
                <a
                  href="/catalogues/StoneTech_Solid_Glass_Bricks_Catalogue_Hindi.pdf"
                  download="StoneTech_Solid_Glass_Bricks_Catalogue_Hindi.pdf"
                  className={getTirangaLangBtnClass("hi", lang)}
                >
                  हिंदी
                </a>
                <a
                  href="/catalogues/StoneTech_Solid_Glass_Bricks_Catalogue_Gujarati.pdf"
                  download="StoneTech_Solid_Glass_Bricks_Catalogue_Gujarati.pdf"
                  className={getTirangaLangBtnClass("gu", lang)}
                >
                  ગુજરાતી
                </a>
              </div>
            </div>

            {/* Hollow Bricks sub-row */}
            <div className="space-y-1 pt-1 border-t border-sky-500/15">
              <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Download className="h-3 w-3 text-sky-600 dark:text-sky-400" />
                  <span>
                    {lang === "gu"
                      ? "પોલી કાચની ઈંટો (૪૯ પાન)"
                      : lang === "hi"
                        ? "खोखली कांच की ईंटें (४९ पृष्ठ)"
                        : "Hollow Glass Bricks (49 Pgs)"}
                  </span>
                </span>
                <span className="text-[10px] font-mono font-semibold text-foreground/80">
                  4.5 MB
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <a
                  href="/catalogues/StoneTech_Glass_Bricks_Catalogue_English.pdf"
                  download="StoneTech_Glass_Bricks_Catalogue_English.pdf"
                  className={getTirangaLangBtnClass("en", lang)}
                >
                  English
                </a>
                <a
                  href="/catalogues/StoneTech_Glass_Bricks_Catalogue_Hindi.pdf"
                  download="StoneTech_Glass_Bricks_Catalogue_Hindi.pdf"
                  className={getTirangaLangBtnClass("hi", lang)}
                >
                  हिंदी
                </a>
                <a
                  href="/catalogues/StoneTech_Glass_Bricks_Catalogue_Gujarati.pdf"
                  download="StoneTech_Glass_Bricks_Catalogue_Gujarati.pdf"
                  className={getTirangaLangBtnClass("gu", lang)}
                >
                  ગુજરાતી
                </a>
              </div>
            </div>
          </div>

          {/* 4. Flexible Clay Veneers Catalogue */}
          <div className="rounded-xl border border-orange-500/25 bg-orange-500/5 p-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                <Compass className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                {lang === "gu"
                  ? "લચીલી ક્લે વિનિયર્સ (૩૭ પાન)"
                  : lang === "hi"
                    ? "लचीली क्ले विनियर्स (३७ पृष्ठ)"
                    : "Flexible Clay Veneers (37 Pgs)"}
              </span>
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4 border-orange-500/40 text-orange-700 dark:text-orange-300"
              >
                {lang === "gu" ? "૪૦ ટેક્સચર્સ" : lang === "hi" ? "४० टेक्सचर्स" : "40 Textures"}
              </Badge>
            </div>

            <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground pt-0.5">
              <span className="flex items-center gap-1">
                <Download className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                <span>
                  {lang === "gu"
                    ? "3D ટેક્સચર્સ અને મોડિફાઇડ ક્લે"
                    : lang === "hi"
                      ? "3D टेक्सचर्स एवं मॉडिफाइड क्ले"
                      : "3D Textures & Modified Clay"}
                </span>
              </span>
              <span className="text-[10px] font-mono font-semibold text-foreground/80">
                11.2 MB
              </span>
            </div>

            <div className="flex items-center gap-1.5 pt-0.5">
              <a
                href="/catalogues/StoneTech_Flexible_Clay_Veneers_Catalogue_English.pdf"
                download="StoneTech_Flexible_Clay_Veneers_Catalogue_English.pdf"
                className={getTirangaLangBtnClass("en", lang)}
              >
                English
              </a>
              <a
                href="/catalogues/StoneTech_Flexible_Clay_Veneers_Catalogue_Hindi.pdf"
                download="StoneTech_Flexible_Clay_Veneers_Catalogue_Hindi.pdf"
                className={getTirangaLangBtnClass("hi", lang)}
              >
                हिंदी
              </a>
              <a
                href="/catalogues/StoneTech_Flexible_Clay_Veneers_Catalogue_Gujarati.pdf"
                download="StoneTech_Flexible_Clay_Veneers_Catalogue_Gujarati.pdf"
                className={getTirangaLangBtnClass("gu", lang)}
              >
                ગુજરાતી
              </a>
            </div>
          </div>

          {/* 5. Natural Stone Pebbles Catalogue */}
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                <CircleDot className="h-3.5 w-3.5 text-amber-500" />
                {lang === "gu"
                  ? "પાષાણ કાંકરા અને અર્ધ-કિંમતી સંગ્રહ (૨૩ પાન)"
                  : lang === "hi"
                    ? "पाषाण कंकड़ (पेबल्स) एवं अर्ध-कीमती संग्रह (२३ पृष्ठ)"
                    : "Stone Pebbles & Aggregates (23 Pgs)"}
              </span>
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4 border-amber-500/40 text-amber-700 dark:text-amber-300"
              >
                {lang === "gu" ? "૭૫ જાતો" : lang === "hi" ? "७५ किस्में" : "75 Varieties"}
              </Badge>
            </div>

            <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground pt-0.5">
              <span className="flex items-center gap-1">
                <Download className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                <span>
                  {lang === "gu"
                    ? "રોઝ ક્વાર્ટ્ઝ, ઓનિક્સ, રિવર બ્લેક"
                    : lang === "hi"
                      ? "रोज़ क्वार्ट्ज़, ओनिक्स, रिवर ब्लैक"
                      : "Rose Quartz, Onyx, River Black"}
                </span>
              </span>
              <span className="text-[10px] font-mono font-semibold text-foreground/80">
                16.2 MB
              </span>
            </div>

            <div className="flex items-center gap-1.5 pt-0.5">
              <a
                href="/catalogues/StoneTech_Stone_Pebbles_Catalogue_English.pdf"
                download="StoneTech_Stone_Pebbles_Catalogue_English.pdf"
                className={getTirangaLangBtnClass("en", lang)}
              >
                English
              </a>
              <a
                href="/catalogues/StoneTech_Stone_Pebbles_Catalogue_Hindi.pdf"
                download="StoneTech_Stone_Pebbles_Catalogue_Hindi.pdf"
                className={getTirangaLangBtnClass("hi", lang)}
              >
                हिंदी
              </a>
              <a
                href="/catalogues/StoneTech_Stone_Pebbles_Catalogue_Gujarati.pdf"
                download="StoneTech_Stone_Pebbles_Catalogue_Gujarati.pdf"
                className={getTirangaLangBtnClass("gu", lang)}
              >
                ગુજરાતી
              </a>
            </div>
          </div>

          {/* 6. Executed Works & Architectural Portfolio */}
          <div className="rounded-xl border border-teal-500/25 bg-teal-500/5 p-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                <Camera className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                {lang === "gu"
                  ? "અમારા કાર્યો અને પોર્ટફોલિયો (PDF)"
                  : lang === "hi"
                    ? "हमारे कार्य एवं पोर्टफोलियो (PDF)"
                    : "Few of Our Works Portfolio (PDF)"}
              </span>
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4 border-teal-500/40 text-teal-700 dark:text-teal-300"
              >
                {lang === "gu"
                  ? "૫૫ પ્રોજેક્ટ્સ"
                  : lang === "hi"
                    ? "५५ प्रोजेक्ट्स"
                    : "55 Projects"}
              </Badge>
            </div>

            <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground pt-0.5">
              <span className="flex items-center gap-1">
                <Download className="h-3 w-3 text-teal-600 dark:text-teal-400" />
                <span>
                  {lang === "gu"
                    ? "વાસ્તુશિલ્પીય ઇન્સ્ટોલેશન્સ અને ફોટોગ્રાફ્સ"
                    : lang === "hi"
                      ? "वास्तुशिल्पीय इंस्टॉलेशंस एवं फोटोग्राफ्स"
                      : "Architectural Installations & Photos"}
                </span>
              </span>
              <span className="text-[10px] font-mono font-semibold text-foreground/80">
                14.2 MB
              </span>
            </div>

            <div className="flex items-center gap-1.5 pt-0.5">
              <a
                href="/catalogues/StoneTech_NaturalStone_WallCl_Options_English.pdf"
                download="StoneTech_Portfolio_English.pdf"
                className={getTirangaLangBtnClass("en", lang)}
              >
                English
              </a>
              <a
                href="/catalogues/StoneTech_NaturalStone_WallCl_Options_Hindi.pdf"
                download="StoneTech_Portfolio_Hindi.pdf"
                className={getTirangaLangBtnClass("hi", lang)}
              >
                हिंदी
              </a>
              <a
                href="/catalogues/StoneTech_NaturalStone_WallCl_Options_Gujarati.pdf"
                download="StoneTech_Portfolio_Gujarati.pdf"
                className={getTirangaLangBtnClass("gu", lang)}
              >
                ગુજરાતી
              </a>
            </div>
          </div>

          {/* End of Catalogues Footer indicator */}
          <div className="pt-1.5 pb-0.5 text-center text-[10px] font-medium text-muted-foreground/80 flex items-center justify-center gap-1 border-t border-border/40">
            <Check className="h-3 w-3 text-emerald-500" />
            <span>
              {lang === "gu"
                ? "તમામ ૬ વાસ્તુશિલ્પીય કેટલોગ્સ ઉપલબ્ધ છે"
                : lang === "hi"
                  ? "सभी ६ वास्तुशिल्पीय कैटलॉग उपलब्ध हैं"
                  : "All 6 Architectural Catalogues Listed"}
            </span>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/**
 * i18n initialisation for Stone Tech OS.
 *
 * - Default language: English
 * - Supported: English ("en"), Hindi ("hi"), Gujarati ("gu")
 * - Persistence: localStorage key "stos-lang"
 * - Font: Noto Sans Devanagari & Gujarati are loaded in __root.tsx
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import hi from "./locales/hi.json";
import gu from "./locales/gu.json";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", nativeLabel: "English", short: "EN" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी", short: "हिं" },
  { code: "gu", label: "Gujarati", nativeLabel: "ગુજરાતી", short: "ગુ" },
] as const;

export type LangCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      gu: { translation: gu },
    },
    // Detection order: localStorage → browser preference → fallback
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "stos-lang",
      caches: ["localStorage"],
    },
    fallbackLng: "en",
    supportedLngs: ["en", "hi", "gu"],
    interpolation: {
      // React already handles XSS
      escapeValue: false,
    },
  });

export default i18n;

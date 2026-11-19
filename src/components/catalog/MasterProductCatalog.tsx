/**
 * MasterProductCatalog.tsx
 *
 * Unified Architectural Product Showcase & Multi-Collection Catalogue for Stone Tech Atelier.
 * Directly integrates all product divisions into a single unified display with tab navigation:
 *   1. Natural Stone Cladding & Architectural Mosaics (275 Patterns)
 *   2. Ultra-Thin Flexible Stone Veneers (98 Varieties)
 *   3. Architectural Solid & Hollow Glass Bricks (67 Designs)
 *   4. Flexible Clay Veneers & 3D Architectural Textures (40 Patterns)
 *   5. Natural Stone Pebbles & Semi-Precious Aggregates (75 Varieties)
 *   6. Live Installed Works & Architectural Portfolio (44 Executed Projects)
 *
 * Each tab dynamically provides:
 *   - Tab switcher directly inside the card header
 *   - Category / Collection dropdown matching that product family
 *   - Secondary facet dropdown (Geology / Finish / Profile / Project Location)
 *   - Instant debounced search bar
 *   - Complete 5-Catalogue Master PDF download menu (including Stone Pebbles 2026)
 *   - Quick filter collection pills with exact live item counts
 *   - Responsive 3-to-4-column product grid with 1-click estimation request
 *   - Architectural Lightbox Modal with full technical specifications
 */

import { useState, useMemo, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Layers,
  Sparkles,
  Gem,
  Compass,
  CircleDot,
  Camera,
  Search,
  Download,
  BookOpen,
  FileDown,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Eye,
  ShieldCheck,
  Check,
  Share2,
  ExternalLink,
  RotateCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { toIndicDigits } from "@/lib/format";

// Static JSON catalogs
import rawCladdingData from "@/data/wall-cladding-catalog.json";
import rawVeneerData from "@/data/stone-veneer-catalog.json";
import rawGlassData from "@/data/glass-bricks-catalog.json";
import rawClayData from "@/data/flexible-clay-catalog.json";
import rawPebblesData from "@/data/stone-pebbles-catalog.json";
import rawInstallsData from "@/data/installed-works-gallery.json";
import { CATALOG_ITEMS_BY_CODE } from "@/lib/i18n/catalogue-items-i18n";
import { StoneGalleryFeed } from "@/components/landing/StoneGalleryFeed";

export type ProductTab =
  | "cladding"
  | "stone-veneer"
  | "glass-bricks"
  | "clay-veneers"
  | "pebbles"
  | "installations";

export interface CatalogItemSpec {
  label: string;
  val: string;
}

export interface CatalogItem {
  id: string;
  code: string;
  name: string;
  category: string;
  subCategory: string;
  image: string;
  sceneImage?: string;
  price: number | null;
  unit: string | null;
  sizes: string;
  details: string;
  desc: string;
  specs: CatalogItemSpec[];
  externalLink?: string | null;
}

const LOCALIZED_CATALOG_STRINGS: Record<string, { hi: string; gu: string }> = {
  // Divisions & Top Tabs
  "Natural Stone Cladding": { hi: "प्राकृतिक स्टोन क्लैडिंग", gu: "કુદરતી સ્ટોન ક્લેડિંગ" },
  "Stone Veneer": { hi: "स्टोन विनियर", gu: "સ્ટોન વિનિયર" },
  "Glass Bricks": { hi: "कांच की ईंटें", gu: "કાચની ઈંટો" },
  "Clay Veneers": { hi: "फ्लेक्सिबल क्ले विनियर्स", gu: "ક્લે વિનિયર્સ" },
  "Stone Pebbles": { hi: "स्टोन पेबल्स एवं कंकड़", gu: "સ્ટોન પેબલ્સ" },
  "A few of more works": { hi: "हमारे कुछ और कार्य", gu: "અમારા કેટલાક વધુ કાર્યો" },
  "Live Installed Works": { hi: "हमारे कुछ और कार्य", gu: "અમારા કેટલાક વધુ કાર્યો" },

  // Categories & Series
  "Hollow Glass Bricks": { hi: "खोखली कांच की ईंटें", gu: "પોલી કાચની ઈંટો" },
  "Solid Glass Bricks": { hi: "ठोस कांच की ईंटें", gu: "નક્કર કાચની ઈંટો" },
  "Semi-Precious Agates": { hi: "अर्ध-कीमती अगेट", gu: "અર્ધ-કિંમતી અગેટ" },
  "Landscape & River": { hi: "लैंडस्केप एवं नदी कंकड़", gu: "લેન્ડસ્કેપ અને નદીના કાંકરા" },
  "Landscape & River Pebbles": { hi: "लैंडस्केप एवं नदी कंकड़", gu: "લેન્ડસ્કેપ અને નદીના કાંકરા" },
  "Decorative & Specialty": { hi: "सजावटी एवं विशिष्ट कंकड़", gu: "સુશોભન અને વિશિષ્ટ કાંકરા" },
  "Jumbo & Flat Pebbles": { hi: "जंबो एवं फ्लैट पेबल्स", gu: "જમ્બો અને ફ્લેટ કાંકરા" },
  "Mini Pebbles & Chips": { hi: "मिनी पेबल्स एवं चिप्स", gu: "મિની કાંકરા અને ચિપ્સ" },
  "Onyx Pebbles": { hi: "गोमेद (ओनिक्स) पेबल्स", gu: "ગોમેદ (ઓનિક્સ) કાંકરા" },
  "Architectural 3D Textures": {
    hi: "वास्तुशिल्पीय ३D टेक्सचर्स",
    gu: "વાસ્તુશિલ્પીય ૩D ટેક્સચર્સ",
  },
  "Punch Traventino Series": { hi: "पंच ट्रावरटाइन स्लैब्स", gu: "પંચ ટ્રાવર્ટાઇન સ્લેબ્સ" },
  "Punch Slat Series": { hi: "पंच स्लेट स्लैब्स", gu: "પંચ સ્લેટ સ્લેબ્સ" },
  "Stone Wall Cladding": { hi: "प्राकृतिक पाषाण क्लैडिंग", gu: "પ્રાકૃતિક પાષાણ ક્લેડિંગ" },
  "Stone Wall Mural Artwork": {
    hi: "पाषाण भित्ति शिल्प (म्यूरल)",
    gu: "પાષાણ દિવાલ મ્યુરલ કલાકૃતિઓ",
  },
  "Horizontal Strip & Ledgestone Panels": {
    hi: "हॉरिजॉन्टल स्ट्रिप एवं लेजस्टोन पैनल्स",
    gu: "હોરિઝોન્ટલ સ્ટ્રીપ અને લેજસ્ટોન પેનલ્સ",
  },
  "Stone Inlay": { hi: "स्टोन इनले (पाषाण पच्चीकारी)", gu: "સ્ટોન ઇનલે (પથ્થર પચ્ચીકારી)" },
  "Natural Stone Veneer": { hi: "प्राकृतिक स्टोन विनियर", gu: "કુદરતી સ્ટોન વિનિયર" },
  "Clay Veneer": { hi: "फ्लेक्सिबल क्ले विनियर", gu: "ફ્લેક્સિબલ ક્લે વિનિયર" },
  "Executed Works": { hi: "स्थापित कार्य", gu: "સ્થાપિત કાર્યો" },
  "Executed Project": { hi: "पूर्ण प्रोजेक्ट", gu: "સંપૂર્ણ પ્રોજેક્ટ" },

  // Pebbles Items & Minerals
  "Rose Quartz": { hi: "रोज़ क्वार्ट्ज़ (गुलाबी स्फटिक)", gu: "રોઝ ક્વાર્ટ્ઝ (ગુલાબી સ્ફટિક)" },
  "Crystal Quartz": { hi: "क्रिस्टल क्वार्ट्ज़ (स्फटिक)", gu: "ક્રિસ્ટલ ક્વાર્ટ્ઝ (સ્ફટિક)" },
  "African Amethyst": { hi: "अफ्रीकी अगेथिस्ट (जामुनिया)", gu: "આફ્રિકન અમેથિસ્ટ (જાંબલી સ્ફટિક)" },
  "Red Carnelian": { hi: "लाल कार्नेलियन (रक्तमणि)", gu: "લાલ કાર્નેલિયન (રક્તમણિ)" },
  "Lapis Lazuli": { hi: "लापिस लाजुली (लाजवर्त)", gu: "લાપિસ લાજુલી (લાજવર્ત)" },
  "Tiger Stone": { hi: "टाइगर स्टोन (गोमेद)", gu: "ટાઇગર સ્ટોન (ગોમેદ)" },
  Labradorite: { hi: "लैब्राडोराइट", gu: "લેબ્રાડોરાઇટ" },
  "White Rainbow": { hi: "सफेद इंद्रधनुषी पेबल्स", gu: "સફેદ મેઘધનુષી કાંકરા" },
  "Black Onyx": { hi: "काला गोमेद (ओनिक्स)", gu: "કાળો ગોમેદ (ઓનિક્સ)" },
  "Green Onyx": { hi: "हरा गोमेद (ओनिक्स)", gu: "લીલો ગોમેદ (ઓનિક્સ)" },
  "River Black": {
    hi: "रिवर ब्लैक (प्राकृतिक काली नदी कंकड़)",
    gu: "રિવર બ્લેક (કાળા નદી કાંકરા)",
  },
  "Snow White": { hi: "स्नो व्हाइट (हिम श्वेत कंकड़)", gu: "સ્નો વ્હાઇટ (બરફ જેવા સફેદ કાંકરા)" },
  "Golden Yellow": { hi: "गोल्डन यलो (सुनहरे कंकड़)", gu: "ગોલ્ડન યલો (સોનેરી કાંકરા)" },
  "Pure Hydrothermal Crystal Quartz": {
    hi: "शुद्ध हाइड्रोथर्मल क्रिस्टल क्वार्ट्ज़",
    gu: "શુદ્ધ હાઇડ્રોથર્મલ ક્રિસ્ટલ ક્વાર્ટ્ઝ",
  },
  "Natural Crystalline Rose Quartz": {
    hi: "प्राकृतिक क्रिस्टलीय रोज़ क्वार्ट्ज़",
    gu: "કુદરતી ક્રિસ્ટલાઇન રોઝ ક્વાર્ટ્ઝ",
  },
  "Natural Violet Crystalline Amethyst": {
    hi: "प्राकृतिक जामुनी अगेथिस्ट",
    gu: "કુદરતી જાંબલી ક્રિસ્ટલાઇન અમેથિસ્ટ",
  },
  "Cryptocrystalline Carnelian Chalcedony": {
    hi: "क्रिप्टोक्रिस्टलाइन कार्नेलियन",
    gu: "ક્રિપ્ટોક્રિસ્ટલાઇન કાર્નેલિયન",
  },
  "Natural Metamorphic Lapis Lazuli": {
    hi: "प्राकृतिक रूपांतरित लापिस लाजुली",
    gu: "કુદરતી રૂપાંતરિત લાપિસ લાજુલી",
  },
  "Crocidolite Quartz (Tiger Eye)": {
    hi: "क्रोकिडोलाइट क्वार्ट्ज़ (टाइगर आई)",
    gu: "ક્રોસિડોલાઇટ ક્વાર્ટ્ઝ (ટાઇગર આઇ)",
  },
  "Crocidolite Quartz": {
    hi: "क्रोकिडोलाइट क्वार्ट्ज़ (टाइगर आई)",
    gu: "ક્રોસિડોલાઇટ ક્વાર્ટ્ઝ (ટાઇગર આઇ)",
  },
  "Feldspathic Plagioclase": {
    hi: "फेल्डस्पैथिक प्लैगियोक्लेज़",
    gu: "ફેલ્ડસ્પેથિક પ્લેજિયોક્લેઝ",
  },
  "Natural Opalescent Silica": { hi: "प्राकृतिक ओपलेसेंट सिलिका", gu: "કુદરતી ઓપલેસેન્ટ સિલિકા" },

  // Glass Bricks Items & Refractions
  Seaview: { hi: "सागरीय तरंग सीव्यू", gu: "દરિયાઈ મોજાં સીવ્યૂ" },
  Sahara: { hi: "सहारा मरुस्थलीय डिज़ाइन", gu: "સહારા રણ ડિઝાઈન" },
  "New Wave": { hi: "नई लहर", gu: "નવી લહેર" },
  Bubbles: { hi: "जल बुलबुले बबल्स", gu: "પરપોટા બબલ્સ ડિઝાઈન" },
  Diamond: { hi: "हीरा कट डायमंड", gu: "હીરા કટ ડાયમંડ" },
  "Direct Clear": {
    hi: "सटीक पारदर्शी",
    gu: "સંપૂર્ણ પારદર્શક",
  },
  Misty: { hi: "मिस्टी धुंधला पारभासी", gu: "મિસ્ટી ઝાંખું પારદર્શક" },
  Quadra: { hi: "क्वाड्रा चौकोर ग्रिड", gu: "ક્વાડ્રા ચોરસ ગ્રીડ" },
  Mosaic: { hi: "मोज़ेक घन बुनाई", gu: "મોઝેઇક ઘન વણાટ" },
  "Cross Reed": { hi: "क्रॉस रीड दोहरी धारी", gu: "ક્રોસ રીડ બેવડી ધારી" },
  "Clear Pattern": { hi: "पारदर्शी पैटर्न", gu: "પારદર્શક પેટર્ન" },
  Satin: { hi: "सैटिन फ्रॉस्टेड", gu: "સેટિન ફ્રોસ્ટેડ" },
  "Amber Tinted": { hi: "पीताभ एम्बर टिंटेड", gu: "સોનેરી અંબર ટિન્ટેડ" },
  "Cobalt Blue": { hi: "गहरा कोबाल्ट नीला", gu: "ઘેરો કોબાલ્ટ વાદળી" },
  "Emerald Green": { hi: "पन्ना हरा", gu: "પન્ના લીલો" },
  "Smoky Bronze": { hi: "धूमिल कांस्य", gu: "કાંસ્ય રંગ" },
  "Crystal Series": { hi: "क्रिस्टल सीरीज़", gu: "ક્રિસ્ટલ સિરીઝ" },
  "Linear Wave": { hi: "रेखीय तरंग", gu: "રેખીય તરંગ" },
  Arctic: { hi: "आर्कटिक हिम बनावट", gu: "આર્કટિક હિમ બનાવટ" },

  // Flexible Clay Veneers
  "Fluted Texture": { hi: "नालीदार फ्लूटेड टेक्सचर", gu: "ખાંચાવાળું ફ્લુટેડ ટેક્સચર" },
  "Hammerstone Texture": {
    hi: "हैमर्ड पाषाण टेक्सचर",
    gu: "હેમર્ડ પાષાણ ટેક્સચર",
  },
  "Ripple Texture": { hi: "तरंगित रिपल टेक्सचर", gu: "તરંગિત રિપલ ટેક્સચર" },
  "Weave Texture": { hi: "बुनाई वीव टेक्सचर", gu: "વણાટ વીવ ટેક્સચર" },
  "Linear Fluted Profile · 15mm Pitch": {
    hi: "लीनियर फ्लूटेड प्रोफाइल · १५ मिमी पिच",
    gu: "લીનિયર ફ્લુટેડ પ્રોફાઇલ · ૧૫ મીમી પિચ",
  },
  "Fine Bush-Hammered Relief": { hi: "फाइन बुश-हैमर्ड रिलीफ", gu: "ફાઇન બુશ-હેમર્ડ રિલીફ" },
  "Kinetic Wave Undulation": { hi: "काइनेटिक वेव तरंग", gu: "કાઇનેટિક વેવ મોજાં" },
  "Interlocking Woven Basket Grid": {
    hi: "इंटरलॉकिंग वोवेन बास्केट ग्रिड",
    gu: "ઇન્ટરલોકિંગ વણેલી બાસ્કેટ ગ્રીડ",
  },
  "Punch Traventino": { hi: "पंच ट्रैवर्टिनो", gu: "પંચ ટ્રેવર્ટીનો" },
  "Punch Slat": { hi: "पंच स्लेट", gu: "પંચ સ્લેટ" },
  Traventino: { hi: "ट्रावरटाइन", gu: "ટ્રાવર્ટાઇન" },
  "Split Face": { hi: "स्प्लिट फेस", gu: "સ્પ્લિટ ફેસ" },
  "Chiseled Stone": { hi: "छैनी तराशा पत्थर", gu: "ટાંકણે ઘડેલો પથ્થર" },
  "Linear Groove": { hi: "लीनियर ग्रूव्ज", gu: "લીનિયર ગ્રૂવ્સ" },
  "Fluted Texture Architectural Installation": {
    hi: "फ्लूटेड टेक्सचर वास्तुशिल्पीय स्थापना",
    gu: "ફ્લુટેડ ટેક્સચર વાસ્તુશિલ્પીય સ્થાપન",
  },
  "Hammerstone Texture Architectural Installation": {
    hi: "हैमर्ड पाषाण वास्तुशिल्पीय स्थापना",
    gu: "હેમર્ડ પાષાણ વાસ્તુશિલ્પીય સ્થાપન",
  },
  "Ripple Texture Architectural Installation": {
    hi: "रिपल टेक्सचर वास्तुशिल्पीय स्थापना",
    gu: "રિપલ ટેક્સચર વાસ્તુશિલ્પીય સ્થાપન",
  },
  "Weave Texture Architectural Installation": {
    hi: "वीव टेक्सचर वास्तुशिल्पीय स्थापना",
    gu: "વીવ ટેક્સચર વાસ્તુશિલ્પીય સ્થાપન",
  },
  "Live Executed": { hi: "लाइव स्थापित", gu: "લાઇવ સ્થાપિત" },

  // Units
  "sq.ft": { hi: "वर्ग फुट", gu: "ચોરસ ફૂટ" },
  pc: { hi: "नग", gu: "નંગ" },
  kg: { hi: "किग्रा", gu: "કિગ્રા" },
};

function localizeCatalogTerm(term: string | null | undefined, lang: "en" | "hi" | "gu"): string {
  if (!term) return "";
  if (lang === "en") return term;
  if (LOCALIZED_CATALOG_STRINGS[term]) {
    return lang === "gu" ? LOCALIZED_CATALOG_STRINGS[term].gu : LOCALIZED_CATALOG_STRINGS[term].hi;
  }
  const lower = term.toLowerCase();
  for (const [k, v] of Object.entries(LOCALIZED_CATALOG_STRINGS)) {
    if (k.toLowerCase() === lower) {
      return lang === "gu" ? v.gu : v.hi;
    }
  }
  return term;
}

export interface MasterProductCatalogProps {
  activeTab?: ProductTab;
  onTabChange?: (tab: ProductTab) => void;
  onSelectProduct?: (productDescription: string) => void;
  className?: string;
  showAdminBanner?: boolean;
}

export function MasterProductCatalog({
  activeTab: externalActiveTab,
  onTabChange,
  onSelectProduct,
  className = "",
  showAdminBanner = false,
}: MasterProductCatalogProps) {
  const { i18n } = useTranslation();
  const lang = (i18n.language?.substring(0, 2) || "en") as "en" | "hi" | "gu";

  // Internal tab state if uncontrolled
  const [internalTab, setInternalTab] = useState<ProductTab>("cladding");
  const currentTab = externalActiveTab || internalTab;

  const handleTabChange = (tab: ProductTab) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalTab(tab);
    }
    // Reset filters on tab switch
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedSubFilter("all");
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  };

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSubFilter, setSelectedSubFilter] = useState("all");
  const [lightboxItem, setLightboxItem] = useState<CatalogItem | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Normalize data collections
  const currentDataset: CatalogItem[] = useMemo(() => {
    const getLoc = (
      entry: { hi: string; gu: string } | undefined,
      currentLang: "en" | "hi" | "gu",
    ): string | undefined => {
      if (currentLang === "en" || !entry) return undefined;
      return entry[currentLang];
    };

    switch (currentTab) {
      case "stone-veneer":
        return (rawVeneerData as Array<Record<string, unknown>>).map((v) => {
          const code = String(v.code);
          const loc = lang !== "en" ? CATALOG_ITEMS_BY_CODE[code] : undefined;
          return {
            id: code,
            code: code,
            name: getLoc(loc?.name, lang) || localizeCatalogTerm(String(v.name), lang),
            category:
              getLoc(loc?.category, lang) ||
              localizeCatalogTerm(String(v.series || "Natural Stone Veneer"), lang),
            subCategory: localizeCatalogTerm(
              v.translucent ? "Translucent (Backlit)" : "Natural Cleft",
              lang,
            ),
            image: String(v.slabImage || v.image || ""),
            price: typeof v.price === "number" ? v.price : 195,
            unit: String(v.unit || "sq.ft"),
            sizes: toIndicDigits(String(v.standardSizes || "1220 × 610 mm"), lang),
            details:
              getLoc(loc?.details, lang) ||
              localizeCatalogTerm(
                v.stoneType ? `Natural ${v.stoneType}` : String(v.series || ""),
                lang,
              ),
            desc: String(
              v.desc || "Ultra-thin flexible natural stone veneer sheet with fiberglass backing.",
            ),
            specs: [
              {
                label: "Dimensions",
                val: toIndicDigits(String(v.standardSizes || "1220 × 610 mm"), lang),
              },
              {
                label: "Thickness",
                val: toIndicDigits(String(v.thickness || "1.5 – 2.0 mm"), lang),
              },
              { label: "Weight", val: toIndicDigits(String(v.weight || "1.5 kg / sheet"), lang) },
              { label: "Backing", val: "Fiberglass & Polyester Resin" },
            ],
          };
        });
      case "glass-bricks":
        return (rawGlassData as Array<Record<string, unknown>>).map((g) => {
          const code = String(g.code);
          const loc = lang !== "en" ? CATALOG_ITEMS_BY_CODE[code] : undefined;
          return {
            id: code,
            code: code,
            name: getLoc(loc?.name, lang) || localizeCatalogTerm(String(g.name), lang),
            category:
              getLoc(loc?.category, lang) ||
              localizeCatalogTerm(String(g.series || "Glass Bricks"), lang),
            subCategory: localizeCatalogTerm(String(g.pattern || "Clear Pattern"), lang),
            image: String(g.image || ""),
            price: typeof g.price === "number" ? g.price : 420,
            unit: String(g.unit || "pc"),
            sizes: toIndicDigits(String(g.dimensions || "190 × 190 × 80 mm"), lang),
            details:
              getLoc(loc?.details, lang) ||
              localizeCatalogTerm(String(g.finish || g.series || ""), lang),
            desc: String(
              g.desc ||
                "Architectural optical-grade glass brick with precision geometric refraction.",
            ),
            specs: [
              {
                label: "Dimensions",
                val: toIndicDigits(String(g.dimensions || "190 × 190 × 80 mm"), lang),
              },
              { label: "Weight", val: toIndicDigits(String(g.weight || "2.3 kg / pc"), lang) },
              {
                label: "Fire Resistance",
                val: toIndicDigits(String(g.fireRating || "60 – 90 Minutes"), lang),
              },
              { label: "Sound Insulation", val: "Rw 40 dB" },
            ],
          };
        });
      case "clay-veneers":
        return (rawClayData as Array<Record<string, unknown>>).map((c) => {
          const code = String(c.code);
          const loc = lang !== "en" ? CATALOG_ITEMS_BY_CODE[code] : undefined;
          return {
            id: code,
            code: code,
            name: getLoc(loc?.name, lang) || localizeCatalogTerm(String(c.rawName || c.name), lang),
            category:
              getLoc(loc?.category, lang) ||
              localizeCatalogTerm(String(c.series || "Clay Veneer"), lang),
            subCategory: localizeCatalogTerm(String(c.profile || "3D Relief"), lang),
            image: String(c.image || ""),
            sceneImage: c.sceneImage ? String(c.sceneImage) : undefined,
            price: typeof c.price === "number" ? c.price : 220,
            unit: String(c.unit || "sq.ft"),
            sizes: toIndicDigits(String(c.standardSizes || "1200 × 2400 mm"), lang),
            details:
              getLoc(loc?.details, lang) ||
              localizeCatalogTerm(String(c.profile || c.series || ""), lang),
            desc: String(
              c.desc ||
                "Flexible modified mineral clay architectural veneer for curved and exterior elevations.",
            ),
            specs: [
              {
                label: "Dimensions",
                val: toIndicDigits(String(c.standardSizes || "1200 × 2400 mm"), lang),
              },
              {
                label: "Thickness",
                val: toIndicDigits(String(c.thickness || "2.5 – 3.5 mm"), lang),
              },
              { label: "Weight", val: toIndicDigits(String(c.weight || "3.8 kg / m²"), lang) },
              { label: "Fire Rating", val: String(c.fire || "Class A Non-Combustible") },
            ],
          };
        });
      case "pebbles":
        return (rawPebblesData as Array<Record<string, unknown>>).map((p) => {
          const code = String(p.code);
          const loc = lang !== "en" ? CATALOG_ITEMS_BY_CODE[code] : undefined;
          return {
            id: code,
            code: code,
            name: getLoc(loc?.name, lang) || localizeCatalogTerm(String(p.name), lang),
            category:
              getLoc(loc?.category, lang) ||
              localizeCatalogTerm(String(p.category || "Stone Pebbles"), lang),
            subCategory: localizeCatalogTerm(String(p.finish || "Natural"), lang),
            image: String(p.image || ""),
            price: typeof p.price === "number" ? p.price : 38,
            unit: String(p.unit || "kg"),
            sizes: toIndicDigits(String(p.sizes || "20-40 mm"), lang),
            details:
              getLoc(loc?.details, lang) || localizeCatalogTerm(String(p.mineral || ""), lang),
            desc: String(
              p.desc ||
                "Curated architectural stone pebbles and semi-precious decorative aggregates.",
            ),
            specs: [
              { label: "Available Sizes", val: toIndicDigits(String(p.sizes || ""), lang) },
              {
                label: "Mineral Family",
                val:
                  getLoc(loc?.details, lang) || localizeCatalogTerm(String(p.mineral || ""), lang),
              },
              { label: "Color Tone", val: String(p.color || "") },
              { label: "Hardness", val: String(p.hardness || "") },
              { label: "Packaging", val: String(p.packaging || "") },
            ],
          };
        });
      case "installations":
        return (rawInstallsData as Array<Record<string, unknown>>).map((ins) => ({
          id: String(ins.id),
          code: String(ins.productCode || ins.id),
          name: localizeCatalogTerm(String(ins.title || ""), lang),
          category: localizeCatalogTerm(
            String(ins.categoryLabel || ins.category || "Executed Works"),
            lang,
          ),
          subCategory: localizeCatalogTerm(String(ins.location || "Executed Project"), lang),
          image: String(ins.image || ""),
          price: null,
          unit: null,
          sizes: String(ins.specs || "Custom On-Site Architecture"),
          details: localizeCatalogTerm(String(ins.stoneType || ins.location || ""), lang),
          desc: String(
            ins.description ||
              "Live verified installation by Stone Tech Atelier engineering teams.",
          ),
          specs: [
            { label: "Project Site", val: String(ins.location || "") },
            { label: "Material Specified", val: String(ins.stoneType || "") },
            { label: "Architecture Specs", val: String(ins.specs || "") },
          ],
          externalLink: ins.instagramUrl ? String(ins.instagramUrl) : null,
        }));
      case "cladding":
      default:
        return (rawCladdingData as Array<Record<string, unknown>>).map((c) => {
          const imgs = Array.isArray(c.images) ? (c.images as string[]) : [];
          const code = String(c.code || c.id);
          const loc = lang !== "en" ? CATALOG_ITEMS_BY_CODE[code] : undefined;
          return {
            id: String(c.id),
            code: code,
            name: getLoc(loc?.name, lang) || localizeCatalogTerm(String(c.name || ""), lang),
            category:
              getLoc(loc?.category, lang) ||
              localizeCatalogTerm(String(c.category || "Stone Wall Cladding"), lang),
            subCategory:
              getLoc(loc?.details, lang) ||
              localizeCatalogTerm(String(c.stoneType || "Sandstone"), lang),
            image: String(imgs[0] || c.image || ""),
            price: typeof c.price === "number" ? c.price : 240,
            unit: "sq.ft",
            sizes: toIndicDigits("600 × 300 mm / Modular", lang),
            details:
              getLoc(loc?.details, lang) ||
              localizeCatalogTerm(String(c.stoneType || "Natural Stone"), lang),
            desc: String(
              c.description ||
                "Precision CNC architectural natural stone wall cladding relief panel.",
            ),
            specs: [
              {
                label: "Stone Type",
                val:
                  getLoc(loc?.details, lang) ||
                  localizeCatalogTerm(String(c.stoneType || "Natural Stone"), lang),
              },
              {
                label: "Category",
                val:
                  getLoc(loc?.category, lang) ||
                  localizeCatalogTerm(String(c.category || ""), lang),
              },
              { label: "Surface Finish", val: String(c.finish || "CNC Carved / Natural Cleft") },
            ],
          };
        });
    }
  }, [currentTab, lang]);

  // Derive dynamic Category options (Dropdown 1) with counts
  const categoryOptions = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of currentDataset) {
      if (item.category) {
        map.set(item.category, (map.get(item.category) || 0) + 1);
      }
    }
    return Array.from(map.entries()).map(([cat, count]) => ({
      key: cat,
      label: `${localizeCatalogTerm(cat, lang)} (${toIndicDigits(String(count), lang)})`,
      count,
    }));
  }, [currentDataset, lang]);

  // Derive dynamic Secondary options (Dropdown 2: Geology / Finish / Profile) with counts
  const subFilterOptions = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of currentDataset) {
      if (item.subCategory) {
        map.set(item.subCategory, (map.get(item.subCategory) || 0) + 1);
      }
    }
    return Array.from(map.entries()).map(([sub, count]) => ({
      key: sub,
      label: `${localizeCatalogTerm(sub, lang)} (${toIndicDigits(String(count), lang)})`,
      count,
    }));
  }, [currentDataset, lang]);

  // Filter items based on active criteria
  const filteredItems = useMemo(() => {
    return currentDataset.filter((item) => {
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }
      if (selectedSubFilter !== "all" && item.subCategory !== selectedSubFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.code.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          (item.subCategory && item.subCategory.toLowerCase().includes(q)) ||
          (item.details && item.details.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [currentDataset, selectedCategory, selectedSubFilter, searchQuery]);

  // Reset scroll position when filter criteria changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [currentTab, selectedCategory, selectedSubFilter, searchQuery]);

  const scrollToContainerTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const displayedItems = filteredItems;

  const handleSelectProductClick = (item: CatalogItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLightboxItem(null);
    const desc = `${item.name} (${item.code}) - ${item.category} [${item.sizes || "Standard"}] ${
      item.price ? `@ ₹${item.price}/${item.unit}` : ""
    }`;
    if (onSelectProduct) {
      onSelectProduct(desc);
    } else {
      toast.success(`Selected ${item.name} for quotation estimation`);
    }
  };

  const handleShare = (item: CatalogItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/#${currentTab}-${item.code.toLowerCase()}`;
    const text = `Check out ${item.name} (${item.code}) from Stone Tech Atelier: ${url}`;
    if (navigator.share) {
      navigator.share({ title: item.name, text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Link copied to clipboard!");
    }
  };

  // Heading texts & dropdown placeholders per tab
  const tabMetadata = {
    cladding: {
      title:
        lang === "gu"
          ? "કુદરતી પાષાણ દીવાલ ક્લેડિંગ અને વાસ્તુશિલ્પીય મોઝેક"
          : lang === "hi"
            ? "प्राकृतिक पाषाण दीवार क्लैडिंग एवं वास्तुशिल्पीय मोज़ेक"
            : "NATURAL STONE WALL CLADDING & ARCHITECTURAL MOSAICS",
      countLabel: lang === "gu" ? "પેટર્ન્સ" : lang === "hi" ? "पैटर्न्स" : "Patterns",
      dropdown1Placeholder:
        lang === "gu" ? "બધા સંગ્રહ" : lang === "hi" ? "सभी संग्रह" : "All Collections",
      dropdown2Placeholder:
        lang === "gu" ? "બધા પથ્થર" : lang === "hi" ? "सभी पत्थर" : "All Stones",
      searchPlaceholder:
        lang === "gu"
          ? "૨૭૫ ક્લેડિંગ પેટર્ન્સ શોધો..."
          : lang === "hi"
            ? "२७५ क्लैडिंग पैटर्न्स खोजें..."
            : "Search 275 cladding patterns...",
    },
    "stone-veneer": {
      title:
        lang === "gu"
          ? "અત્યંત પાતળી કુદરતી સ્ટોન વિનિયર"
          : lang === "hi"
            ? "अत्यंत पतली प्राकृतिक स्टोन विनियर"
            : "ULTRA-THIN FLEXIBLE NATURAL STONE VENEERS",
      countLabel: lang === "gu" ? "જાતો" : lang === "hi" ? "किस्में" : "Varieties",
      dropdown1Placeholder:
        lang === "gu" ? "બધા સંગ્રહ" : lang === "hi" ? "सभी संग्रह" : "All Collections",
      dropdown2Placeholder:
        lang === "gu" ? "બધા ફિનિશ" : lang === "hi" ? "सभी फिनिश" : "All Finishes",
      searchPlaceholder:
        lang === "gu"
          ? "૯૮ સ્ટોન વિનિયર્સ શોધો..."
          : lang === "hi"
            ? "९८ स्टोन विनियर्स खोजें..."
            : "Search 98 stone veneers, slate, marble...",
    },
    "glass-bricks": {
      title:
        lang === "gu"
          ? "વાસ્તુશિલ્પીય નક્કર અને પોલી કાચની ઈંટો"
          : lang === "hi"
            ? "वास्तुशिल्पीय ठोस एवं खोखली कांच की ईंटें"
            : "ARCHITECTURAL SOLID & HOLLOW GLASS BRICKS",
      countLabel: lang === "gu" ? "ડિઝાઇન્સ" : lang === "hi" ? "डिज़ाइन्स" : "Designs",
      dropdown1Placeholder:
        lang === "gu" ? "બધા પ્રકાર" : lang === "hi" ? "सभी प्रकार" : "All Types",
      dropdown2Placeholder:
        lang === "gu" ? "બધી પ્રોફાઇલ્સ" : lang === "hi" ? "सभी प्रोफाइल्स" : "All Profiles",
      searchPlaceholder:
        lang === "gu"
          ? "૬૭ કાચની ઈંટો, વેવ, બબલ શોધો..."
          : lang === "hi"
            ? "६७ कांच की ईंटें, वेव, बबल खोजें..."
            : "Search 67 glass bricks, wave, bubble, tinted...",
    },
    "clay-veneers": {
      title:
        lang === "gu"
          ? "અત્યંત પાતળી લચીલી ક્લે વિનિયર્સ અને 3D વાસ્તુશિલ્પીય ટેક્સચર્સ"
          : lang === "hi"
            ? "अत्यंत पतली लचीली क्ले विनियर एवं 3D वास्तुशिल्पीय टेक्सचर्स"
            : "FLEXIBLE CLAY VENEERS & 3D ARCHITECTURAL TEXTURES",
      countLabel: lang === "gu" ? "ટેક્સચર્સ" : lang === "hi" ? "टेक्सचर्स" : "Textures",
      dropdown1Placeholder:
        lang === "gu" ? "બધા સંગ્રહ" : lang === "hi" ? "सभी संग्रह" : "All Collections",
      dropdown2Placeholder:
        lang === "gu" ? "બધી પ્રોફાઇલ્સ" : lang === "hi" ? "सभी प्रोफाइल्स" : "All Profiles",
      searchPlaceholder:
        lang === "gu"
          ? "૪૦ લચીલી ક્લે ટેક્સચર્સ શોધો..."
          : lang === "hi"
            ? "४० लचीली क्ले टेक्सचर्स खोजें..."
            : "Search 40 flexible clay textures, fluted, travertino...",
    },
    pebbles: {
      title:
        lang === "gu"
          ? "વાસ્તુશિલ્પીય કુદરતી પાષાણ કાંકરા અને અર્ધ-કિંમતી સંગ્રહ"
          : lang === "hi"
            ? "वास्तुशिल्पीय प्राकृतिक पाषाण कंकड़ (पेबल्स) एवं अर्ध-कीमती संग्रह"
            : "NATURAL STONE PEBBLES & SEMI-PRECIOUS AGGREGATES",
      countLabel: lang === "gu" ? "જાતો" : lang === "hi" ? "किस्में" : "Varieties",
      dropdown1Placeholder:
        lang === "gu" ? "બધા સંગ્રહ" : lang === "hi" ? "सभी संग्रह" : "All Collections",
      dropdown2Placeholder:
        lang === "gu" ? "બધા ફિનિશ" : lang === "hi" ? "सभी फिनिश" : "All Finishes",
      searchPlaceholder:
        lang === "gu"
          ? "૭૫ પાષાણ કાંકરા, રોઝ ક્વાર્ટ્ઝ, ઓનિક્સ શોધો..."
          : lang === "hi"
            ? "७५ पाषाण कंकड़, रोज़ क्वार्ट्ज़, ओनिक्स खोजें..."
            : "Search 75 stone pebbles, rose quartz, onyx, river black...",
    },
    installations: {
      title:
        lang === "gu"
          ? "અમારા કેટલાક વધુ કાર્યો"
          : lang === "hi"
            ? "हमारे कुछ और कार्य"
            : "A FEW OF MORE WORKS",
      countLabel: lang === "gu" ? "પ્રોજેક્ટ્સ" : lang === "hi" ? "प्रोजेक्ट्स" : "Projects",
      dropdown1Placeholder:
        lang === "gu" ? "બધી શ્રેણીઓ" : lang === "hi" ? "सभी श्रेणियां" : "All Categories",
      dropdown2Placeholder:
        lang === "gu" ? "બધા સ્થળો" : lang === "hi" ? "सभी स्थान" : "All Locations",
      searchPlaceholder:
        lang === "gu"
          ? "સ્થાપિત કાર્યો, વિલા, હોટેલ્સ શોધો..."
          : lang === "hi"
            ? "स्थापित कार्य, विला, होटल्स खोजें..."
            : "Search executed projects, villas, hotels, temples...",
    },
  }[currentTab];

  const isHi = lang.startsWith("hi");
  const isGu = lang.startsWith("gu");
  const activeLangCode: "en" | "hi" | "gu" = isHi ? "hi" : isGu ? "gu" : "en";

  const activeTabPdf = useMemo(() => {
    switch (currentTab) {
      case "stone-veneer":
        return {
          label:
            lang === "gu"
              ? "વિનિયર (106 Pgs)"
              : lang === "hi"
                ? "विनियर (106 Pgs)"
                : "Stone Veneer (106 Pgs)",
          url: isHi
            ? "/catalogues/StoneTech_Stone_Veneer_Catalogue_Hindi.pdf"
            : isGu
              ? "/catalogues/StoneTech_Stone_Veneer_Catalogue_Gujarati.pdf"
              : "/catalogues/StoneTech_Stone_Veneer_Catalogue_2026.pdf",
          filename: isHi
            ? "StoneTech_Stone_Veneer_Catalogue_Hindi.pdf"
            : isGu
              ? "StoneTech_Stone_Veneer_Catalogue_Gujarati.pdf"
              : "StoneTech_Stone_Veneer_Catalogue_2026.pdf",
        };
      case "glass-bricks":
        return {
          label:
            lang === "gu"
              ? "ગ્લાસ બ્રિક્સ (67 ડિઝાઇન્સ)"
              : lang === "hi"
                ? "ग्लास ब्रिक्स (67 डिज़ाइन्स)"
                : "Glass Bricks (67 Designs)",
          url: isHi
            ? "/catalogues/StoneTech_Solid_Glass_Bricks_Catalogue_Hindi.pdf"
            : isGu
              ? "/catalogues/StoneTech_Solid_Glass_Bricks_Catalogue_Gujarati.pdf"
              : "/catalogues/StoneTech_Solid_Glass_Bricks_Catalogue_English.pdf",
          filename: isHi
            ? "StoneTech_Solid_Glass_Bricks_Catalogue_Hindi.pdf"
            : isGu
              ? "StoneTech_Solid_Glass_Bricks_Catalogue_Gujarati.pdf"
              : "StoneTech_Solid_Glass_Bricks_Catalogue_English.pdf",
        };
      case "clay-veneers":
        return {
          label:
            lang === "gu"
              ? "ક્લે વિનિયર્સ (37 Pgs)"
              : lang === "hi"
                ? "क्ले विनियर्स (37 Pgs)"
                : "Clay Veneers (37 Pgs)",
          url: isHi
            ? "/catalogues/StoneTech_Flexible_Clay_Veneers_Catalogue_Hindi.pdf"
            : isGu
              ? "/catalogues/StoneTech_Flexible_Clay_Veneers_Catalogue_Gujarati.pdf"
              : "/catalogues/StoneTech_Flexible_Clay_Veneers_Catalogue_English.pdf",
          filename: isHi
            ? "StoneTech_Flexible_Clay_Veneers_Catalogue_Hindi.pdf"
            : isGu
              ? "StoneTech_Flexible_Clay_Veneers_Catalogue_Gujarati.pdf"
              : "StoneTech_Flexible_Clay_Veneers_Catalogue_English.pdf",
        };
      case "pebbles":
        return {
          label:
            lang === "gu"
              ? "સ્ટોન પેબલ્સ (23 Pgs)"
              : lang === "hi"
                ? "स्टोन पेबल्स (23 Pgs)"
                : "Stone Pebbles (23 Pgs)",
          url: isHi
            ? "/catalogues/StoneTech_Stone_Pebbles_Catalogue_Hindi.pdf"
            : isGu
              ? "/catalogues/StoneTech_Stone_Pebbles_Catalogue_Gujarati.pdf"
              : "/catalogues/StoneTech_Stone_Pebbles_Catalogue_English.pdf",
          filename: isHi
            ? "StoneTech_Stone_Pebbles_Catalogue_Hindi.pdf"
            : isGu
              ? "StoneTech_Stone_Pebbles_Catalogue_Gujarati.pdf"
              : "StoneTech_Stone_Pebbles_Catalogue_English.pdf",
        };
      case "cladding":
      default:
        return {
          label:
            lang === "gu"
              ? "વોલ ક્લેડિંગ (71 Pgs)"
              : lang === "hi"
                ? "वॉल क्लैडिंग (71 Pgs)"
                : "Wall Cladding (71 Pgs)",
          url: isHi
            ? "/catalogues/StoneTech_NaturalStone_WallCl_Options_Hindi.pdf"
            : isGu
              ? "/catalogues/StoneTech_NaturalStone_WallCl_Options_Gujarati.pdf"
              : "/catalogues/StoneTech_NaturalStone_WallCl_Options_English.pdf",
          filename: isHi
            ? "StoneTech_NaturalStone_WallCl_Options_Hindi.pdf"
            : isGu
              ? "StoneTech_NaturalStone_WallCl_Options_Gujarati.pdf"
              : "StoneTech_NaturalStone_WallCl_Options_English.pdf",
        };
    }
  }, [currentTab, isHi, isGu, lang]);

  return (
    <div
      className={cn(
        "rounded-3xl border border-border/80 bg-card/80 backdrop-blur-xs p-4 sm:p-6 shadow-md space-y-4",
        className,
      )}
    >
      {/* 1. MASTER PRODUCT DIVISION TABS STRIP (DIRECTLY IN THE CARD DISPLAY) */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-muted/80 border border-border/60 overflow-x-auto scrollbar-none [touch-action:pan-x]">
        <button
          type="button"
          onClick={() => handleTabChange("cladding")}
          className={cn(
            "flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer",
            currentTab === "cladding"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Layers className="h-4 w-4" />
          <span>
            {lang === "gu"
              ? "કુદરતી પાષાણ ક્લેડિંગ (૨૭૫)"
              : lang === "hi"
                ? "प्राकृतिक पाषाण क्लैडिंग (२७५)"
                : "Natural Stone Cladding (275)"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("stone-veneer")}
          className={cn(
            "flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer",
            currentTab === "stone-veneer"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span>
            {lang === "gu"
              ? "અત્યંત પાતળી સ્ટોન વિનિયર (૯૮)"
              : lang === "hi"
                ? "अत्यंत पतली स्टोन विनियर (९८)"
                : "Stone Veneer (98)"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("glass-bricks")}
          className={cn(
            "flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer",
            currentTab === "glass-bricks"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Gem className="h-4 w-4 text-cyan-500" />
          <span>
            {lang === "gu"
              ? "કાચની ઈંટો (૬૭)"
              : lang === "hi"
                ? "कांच की ईंटें (६७)"
                : "Glass Bricks (67)"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("clay-veneers")}
          className={cn(
            "flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer",
            currentTab === "clay-veneers"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Compass className="h-4 w-4 text-orange-500" />
          <span>
            {lang === "gu"
              ? "અત્યંત પાતળી લચીલી ક્લે વિનિયર્સ (૪૦)"
              : lang === "hi"
                ? "अत्यंत पतली लचीली क्ले विनियर्स (४०)"
                : "Clay Veneers (40)"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("pebbles")}
          className={cn(
            "flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer",
            currentTab === "pebbles"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <CircleDot className="h-4 w-4 text-amber-500" />
          <span>
            {lang === "gu"
              ? "પાષાણ કાંકરા (૭૫)"
              : lang === "hi"
                ? "पाषाण कंकड़ (पेबल्स) (७५)"
                : "Stone Pebbles (75)"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("installations")}
          className={cn(
            "flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer",
            currentTab === "installations"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Camera className="h-4 w-4 text-emerald-500" />
          <span>
            {lang === "gu"
              ? "અમારા કેટલાક વધુ કાર્યો"
              : lang === "hi"
                ? "हमारे कुछ और कार्य"
                : "A few of more works"}
          </span>
        </button>
      </div>

      {/* 1b. LIVE INSTAGRAM FEED OVER "A FEW OF MORE WORKS" (WHEN INSTALLATIONS ACTIVE) */}
      {currentTab === "installations" && (
        <div className="pt-1 pb-3 animate-in fade-in duration-300">
          <StoneGalleryFeed onSelectProduct={onSelectProduct} />
        </div>
      )}

      {/* 2. DYNAMIC CONTROLS ROW: TITLE, 2 ADAPTIVE DROPDOWNS, SEARCH & 5-PDF MENU */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1 border-t border-border/40">
        {/* Title with live pulsating beacon */}
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
            {tabMetadata.title}
          </span>
          <span className="text-[11px] text-muted-foreground font-semibold">
            ({filteredItems.length} {tabMetadata.countLabel})
          </span>
        </div>

        {/* Set of Dropdowns & Controls */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Dropdown 1: Category / Collection */}
          <Select
            value={selectedCategory}
            onValueChange={(val) => {
              setSelectedCategory(val);
            }}
          >
            <SelectTrigger className="h-8 text-xs bg-background/90 w-[150px] sm:w-[170px]">
              <SelectValue placeholder={tabMetadata.dropdown1Placeholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                {tabMetadata.dropdown1Placeholder} (
                {toIndicDigits(String(currentDataset.length), lang)})
              </SelectItem>
              {categoryOptions.map((opt) => (
                <SelectItem key={opt.key} value={opt.key} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Dropdown 2: Sub-filter (Geology / Finish / Profile) */}
          <Select
            value={selectedSubFilter}
            onValueChange={(val) => {
              setSelectedSubFilter(val);
            }}
          >
            <SelectTrigger className="h-8 text-xs bg-background/90 w-[130px] sm:w-[150px] hidden sm:flex">
              <SelectValue placeholder={tabMetadata.dropdown2Placeholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                {tabMetadata.dropdown2Placeholder}
              </SelectItem>
              {subFilterOptions.map((opt) => (
                <SelectItem key={opt.key} value={opt.key} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Search Input */}
          <div className="relative flex-1 sm:w-44 md:w-52">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder={tabMetadata.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
              }}
              className="pl-8 h-8 text-xs bg-background/90"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Quick 1-Click Active Language PDF Download */}
          <a
            href={activeTabPdf.url}
            download={activeTabPdf.filename}
            className="inline-flex"
            title={`Download ${activeTabPdf.label} (${activeLangCode.toUpperCase()})`}
          >
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2.5 text-xs text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 gap-1.5 cursor-pointer font-semibold shrink-0"
            >
              <Download className="h-3.5 w-3.5 text-amber-500" />
              <span className="hidden md:inline font-medium">{activeTabPdf.label}</span>
              <span className="md:hidden font-medium">PDF</span>
              <Badge
                variant="secondary"
                className="text-[9px] px-1 py-0 h-3.5 uppercase font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300"
              >
                {activeLangCode}
              </Badge>
            </Button>
          </a>

          {/* Catalogues (PDF) Comprehensive Library Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2.5 text-xs text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 gap-1.5 cursor-pointer font-semibold shrink-0"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {lang === "gu"
                    ? "કેટલોગ ડાઉનલોડ (PDF)"
                    : lang === "hi"
                      ? "कैटलॉग डाउनलोड (PDF)"
                      : "Catalogues (PDF)"}
                </span>
                <span className="sm:hidden">PDF</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[330px] sm:w-[380px] p-2.5 space-y-2.5">
              <DropdownMenuLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {lang === "gu"
                  ? "સ્ટોન ટેક એટેલિયર ૨૦૨૬ વાસ્તુશિલ્પીય કેટલોગ્સ"
                  : lang === "hi"
                    ? "स्टोन टेक एटेलियर २०२६ वास्तुशिल्पीय कैटलॉग"
                    : "Stone Tech Atelier 2026 Architectural Catalogues"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {/* 1. Natural Stone Cladding Catalogue */}
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-emerald-600" />
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
                    {lang === "gu"
                      ? "૨૭૫ પેટર્ન્સ"
                      : lang === "hi"
                        ? "२७५ पैटर्न्स"
                        : "275 Patterns"}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <a
                    href="/catalogues/StoneTech_NaturalStone_WallCl_Options_English.pdf"
                    download="StoneTech_NaturalStone_WallCl_Options_English.pdf"
                    className={cn(
                      "flex-1 text-center py-1 px-1.5 text-[11px] font-medium rounded border transition-colors",
                      activeLangCode === "en"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-background/80 hover:bg-accent border-border text-foreground",
                    )}
                  >
                    English
                  </a>
                  <a
                    href="/catalogues/StoneTech_NaturalStone_WallCl_Options_Hindi.pdf"
                    download="StoneTech_NaturalStone_WallCl_Options_Hindi.pdf"
                    className={cn(
                      "flex-1 text-center py-1 px-1.5 text-[11px] font-medium rounded border transition-colors",
                      activeLangCode === "hi"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-background/80 hover:bg-accent border-border text-foreground",
                    )}
                  >
                    हिंदी
                  </a>
                  <a
                    href="/catalogues/StoneTech_NaturalStone_WallCl_Options_Gujarati.pdf"
                    download="StoneTech_NaturalStone_WallCl_Options_Gujarati.pdf"
                    className={cn(
                      "flex-1 text-center py-1 px-1.5 text-[11px] font-medium rounded border transition-colors",
                      activeLangCode === "gu"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-background/80 hover:bg-accent border-border text-foreground",
                    )}
                  >
                    ગુજરાતી
                  </a>
                </div>
              </div>

              {/* 2. Stone Veneer Catalogue */}
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                    {lang === "gu"
                      ? "અત્યંત પાતળી કુદરતી સ્ટોન વિનિયર (૧૦૬ પાન)"
                      : lang === "hi"
                        ? "अत्यंत पतली प्राकृतिक स्टोन विनियर (१०६ पृष्ठ)"
                        : "Ultra-Thin Stone Veneer (106 Pgs)"}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-4 border-amber-500/40 text-amber-700 dark:text-amber-300"
                  >
                    {lang === "gu" ? "૯૮ જાતો" : lang === "hi" ? "९૮ किस्में" : "98 Varieties"}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <a
                    href="/catalogues/StoneTech_Stone_Veneer_Catalogue_English.pdf"
                    download="StoneTech_Stone_Veneer_Catalogue_English.pdf"
                    className={cn(
                      "flex-1 text-center py-1 px-1.5 text-[11px] font-medium rounded border transition-colors",
                      activeLangCode === "en"
                        ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                        : "bg-background/80 hover:bg-accent border-border text-foreground",
                    )}
                  >
                    English
                  </a>
                  <a
                    href="/catalogues/StoneTech_Stone_Veneer_Catalogue_Hindi.pdf"
                    download="StoneTech_Stone_Veneer_Catalogue_Hindi.pdf"
                    className={cn(
                      "flex-1 text-center py-1 px-1.5 text-[11px] font-medium rounded border transition-colors",
                      activeLangCode === "hi"
                        ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                        : "bg-background/80 hover:bg-accent border-border text-foreground",
                    )}
                  >
                    हिंदी
                  </a>
                  <a
                    href="/catalogues/StoneTech_Stone_Veneer_Catalogue_Gujarati.pdf"
                    download="StoneTech_Stone_Veneer_Catalogue_Gujarati.pdf"
                    className={cn(
                      "flex-1 text-center py-1 px-1.5 text-[11px] font-medium rounded border transition-colors",
                      activeLangCode === "gu"
                        ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                        : "bg-background/80 hover:bg-accent border-border text-foreground",
                    )}
                  >
                    ગુજરાતી
                  </a>
                </div>
              </div>

              {/* 3. Glass Bricks Catalogues */}
              <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                    <Gem className="h-3.5 w-3.5 text-sky-600" />
                    {lang === "gu"
                      ? "વાસ્તુશિલ્પીય નક્કર અને પોલી કાચની ઈંટો (૬૭ ડિઝાઇન્સ)"
                      : lang === "hi"
                        ? "वास्तुशिल्पीय ठोस एवं खोखली कांच की ईंटें (६७ डिज़ाइन)"
                        : "Architectural Glass Bricks (67 Designs)"}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-4 border-sky-500/40 text-sky-700 dark:text-sky-300"
                  >
                    {lang === "gu" ? "૬૭ ડિઝાઇન્સ" : lang === "hi" ? "६७ डिज़ाइन" : "67 Designs"}
                  </Badge>
                </div>

                {/* Solid Glass Bricks */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Download className="h-3 w-3 text-sky-600" />
                      {lang === "gu"
                        ? "નક્કર કાચની ઈંટો (૩૪ પાન)"
                        : lang === "hi"
                          ? "ठोस कांच की ईंटें (३४ पृष्ठ)"
                          : "Solid Glass Bricks (34 Pgs)"}
                    </span>
                    <span className="text-[10px] font-mono">9.0 MB</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <a
                      href="/catalogues/StoneTech_Solid_Glass_Bricks_Catalogue_English.pdf"
                      download="StoneTech_Solid_Glass_Bricks_Catalogue_English.pdf"
                      className={cn(
                        "flex-1 text-center py-1 px-1.5 text-[11px] font-medium rounded border transition-colors",
                        activeLangCode === "en"
                          ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                          : "bg-background/80 hover:bg-accent border-border text-foreground",
                      )}
                    >
                      English
                    </a>
                    <a
                      href="/catalogues/StoneTech_Solid_Glass_Bricks_Catalogue_Hindi.pdf"
                      download="StoneTech_Solid_Glass_Bricks_Catalogue_Hindi.pdf"
                      className={cn(
                        "flex-1 text-center py-1 px-1.5 text-[11px] font-medium rounded border transition-colors",
                        activeLangCode === "hi"
                          ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                          : "bg-background/80 hover:bg-accent border-border text-foreground",
                      )}
                    >
                      हिंदी
                    </a>
                    <a
                      href="/catalogues/StoneTech_Solid_Glass_Bricks_Catalogue_Gujarati.pdf"
                      download="StoneTech_Solid_Glass_Bricks_Catalogue_Gujarati.pdf"
                      className={cn(
                        "flex-1 text-center py-1 px-1.5 text-[11px] font-medium rounded border transition-colors",
                        activeLangCode === "gu"
                          ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                          : "bg-background/80 hover:bg-accent border-border text-foreground",
                      )}
                    >
                      ગુજરાતી
                    </a>
                  </div>
                </div>

                {/* Hollow Glass Bricks */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Download className="h-3 w-3 text-sky-600" />
                      {lang === "gu"
                        ? "પોલી કાચની ઈંટો (૪૯ પાન)"
                        : lang === "hi"
                          ? "खोखली कांच की ईंटें (४९ पृष्ठ)"
                          : "Hollow Glass Bricks (49 Pgs)"}
                    </span>
                    <span className="text-[10px] font-mono">4.5 MB</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <a
                      href="/catalogues/StoneTech_Glass_Bricks_Catalogue_English.pdf"
                      download="StoneTech_Glass_Bricks_Catalogue_English.pdf"
                      className={cn(
                        "flex-1 text-center py-1 px-1.5 text-[11px] font-medium rounded border transition-colors",
                        activeLangCode === "en"
                          ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                          : "bg-background/80 hover:bg-accent border-border text-foreground",
                      )}
                    >
                      English
                    </a>
                    <a
                      href="/catalogues/StoneTech_Glass_Bricks_Catalogue_Hindi.pdf"
                      download="StoneTech_Glass_Bricks_Catalogue_Hindi.pdf"
                      className={cn(
                        "flex-1 text-center py-1 px-1.5 text-[11px] font-medium rounded border transition-colors",
                        activeLangCode === "hi"
                          ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                          : "bg-background/80 hover:bg-accent border-border text-foreground",
                      )}
                    >
                      हिंदी
                    </a>
                    <a
                      href="/catalogues/StoneTech_Glass_Bricks_Catalogue_Gujarati.pdf"
                      download="StoneTech_Glass_Bricks_Catalogue_Gujarati.pdf"
                      className={cn(
                        "flex-1 text-center py-1 px-1.5 text-[11px] font-medium rounded border transition-colors",
                        activeLangCode === "gu"
                          ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                          : "bg-background/80 hover:bg-accent border-border text-foreground",
                      )}
                    >
                      ગુજરાતી
                    </a>
                  </div>
                </div>
              </div>

              {/* 4. Flexible Clay Veneers Catalogue */}
              <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                    <Compass className="h-3.5 w-3.5 text-orange-600" />
                    {lang === "gu"
                      ? "અત્યંત પાતળી લચીલી ક્લે વિનિયર્સ (૩૭ પાન)"
                      : lang === "hi"
                        ? "अत्यंत पतली लचीली क्ले विनियर्स (३७ पृष्ठ)"
                        : "Flexible Clay Veneers (37 Pgs)"}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-4 border-orange-500/40 text-orange-700 dark:text-orange-300"
                  >
                    {lang === "gu"
                      ? "૪૦ ટેક્સચર્સ"
                      : lang === "hi"
                        ? "४० टेक्सचर्स"
                        : "40 Textures"}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <a
                    href="/catalogues/StoneTech_Flexible_Clay_Veneers_Catalogue_English.pdf"
                    download="StoneTech_Flexible_Clay_Veneers_Catalogue_English.pdf"
                    className={cn(
                      "flex-1 text-center py-1 px-1.5 text-[11px] font-medium rounded border transition-colors",
                      activeLangCode === "en"
                        ? "bg-orange-600 text-white border-orange-600 shadow-xs"
                        : "bg-background/80 hover:bg-accent border-border text-foreground",
                    )}
                  >
                    English
                  </a>
                  <a
                    href="/catalogues/StoneTech_Flexible_Clay_Veneers_Catalogue_Hindi.pdf"
                    download="StoneTech_Flexible_Clay_Veneers_Catalogue_Hindi.pdf"
                    className={cn(
                      "flex-1 text-center py-1 px-1.5 text-[11px] font-medium rounded border transition-colors",
                      activeLangCode === "hi"
                        ? "bg-orange-600 text-white border-orange-600 shadow-xs"
                        : "bg-background/80 hover:bg-accent border-border text-foreground",
                    )}
                  >
                    हिंदी
                  </a>
                  <a
                    href="/catalogues/StoneTech_Flexible_Clay_Veneers_Catalogue_Gujarati.pdf"
                    download="StoneTech_Flexible_Clay_Veneers_Catalogue_Gujarati.pdf"
                    className={cn(
                      "flex-1 text-center py-1 px-1.5 text-[11px] font-medium rounded border transition-colors",
                      activeLangCode === "gu"
                        ? "bg-orange-600 text-white border-orange-600 shadow-xs"
                        : "bg-background/80 hover:bg-accent border-border text-foreground",
                    )}
                  >
                    ગુજરાતી
                  </a>
                </div>
              </div>

              {/* 5. Natural Stone Pebbles Catalogue */}
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                    <CircleDot className="h-3.5 w-3.5 text-amber-500" />
                    {lang === "gu"
                      ? "વાસ્તુશિલ્પીય કુદરતી પાષાણ કાંકરા અને અર્ધ-કિંમતી સંગ્રહ (૨૩ પાન)"
                      : lang === "hi"
                        ? "वास्तुशिल्पीय प्राकृतिक पाषाण कंकड़ (पेबल्स) एवं अर्ध-कीमती संग्रह (२३ पृष्ठ)"
                        : "Stone Pebbles & Aggregates (23 Pgs)"}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-4 border-amber-500/40 text-amber-700 dark:text-amber-300"
                  >
                    {lang === "gu" ? "૭૫ જાતો" : lang === "hi" ? "૭૫ किस्में" : "75 Varieties"}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <a
                    href="/catalogues/StoneTech_Stone_Pebbles_Catalogue_English.pdf"
                    download="StoneTech_Stone_Pebbles_Catalogue_English.pdf"
                    className={cn(
                      "flex-1 text-center py-1 px-1.5 text-[11px] font-medium rounded border transition-colors",
                      activeLangCode === "en"
                        ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                        : "bg-background/80 hover:bg-accent border-border text-foreground",
                    )}
                  >
                    English
                  </a>
                  <a
                    href="/catalogues/StoneTech_Stone_Pebbles_Catalogue_Hindi.pdf"
                    download="StoneTech_Stone_Pebbles_Catalogue_Hindi.pdf"
                    className={cn(
                      "flex-1 text-center py-1 px-1.5 text-[11px] font-medium rounded border transition-colors",
                      activeLangCode === "hi"
                        ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                        : "bg-background/80 hover:bg-accent border-border text-foreground",
                    )}
                  >
                    हिंदी
                  </a>
                  <a
                    href="/catalogues/StoneTech_Stone_Pebbles_Catalogue_Gujarati.pdf"
                    download="StoneTech_Stone_Pebbles_Catalogue_Gujarati.pdf"
                    className={cn(
                      "flex-1 text-center py-1 px-1.5 text-[11px] font-medium rounded border transition-colors",
                      activeLangCode === "gu"
                        ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                        : "bg-background/80 hover:bg-accent border-border text-foreground",
                    )}
                  >
                    ગુજરાતી
                  </a>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 3. QUICK COLLECTION PILLS WITH LIVE COUNTS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none [touch-action:pan-x]">
        <button
          type="button"
          onClick={() => {
            setSelectedCategory("all");
          }}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
            selectedCategory === "all"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40",
          )}
        >
          {lang === "gu"
            ? `બધી ${tabMetadata.countLabel} (${toIndicDigits(String(currentDataset.length), lang)})`
            : lang === "hi"
              ? `सभी ${tabMetadata.countLabel} (${toIndicDigits(String(currentDataset.length), lang)})`
              : `All ${tabMetadata.countLabel} (${currentDataset.length})`}
        </button>
        {categoryOptions.map((cat) => (
          <button
            key={cat.key}
            type="button"
            onClick={() => {
              setSelectedCategory(cat.key);
            }}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
              selectedCategory === cat.key
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40",
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 4. SQUEEZED 9-ITEM BOX VIEWPORT WITH SMOOTH IN-BOX SCROLLING */}
      {displayedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border bg-card/40">
          <Layers className="h-10 w-10 text-muted-foreground/60 mb-3" />
          <p className="text-sm font-semibold text-foreground">No matching products found</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
              setSelectedSubFilter("all");
            }}
            className="mt-3 text-xs cursor-pointer"
          >
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* 2-Row 8-Product Catalog Box with Smooth In-Box Scroll */}
          <div
            ref={scrollContainerRef}
            aria-label="Architectural Products 8-Item Frame"
            className={cn(
              "relative w-full rounded-2xl border border-border/80 bg-card/40 p-2 sm:p-3 shadow-inner",
              "h-[530px] sm:h-[560px] md:h-[620px] lg:h-[700px] xl:h-[780px]",
              "overflow-y-auto overscroll-y-auto",
              "[scrollbar-width:thin] scrollbar-thumb-muted-foreground/30 hover:scrollbar-thumb-muted-foreground/60",
              "[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-muted/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50",
            )}
            style={{ overscrollBehaviorY: "auto" }}
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
              {displayedItems.map((item) => (
                <div
                  key={item.code}
                  onClick={() => setLightboxItem(item)}
                  className="group relative flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card hover:border-amber-500/60 hover:shadow-md transition-all duration-200 cursor-pointer"
                >
                  {/* Squeezed Product Image Frame */}
                  <div className="relative aspect-square w-full overflow-hidden bg-neutral-100 dark:bg-neutral-900">
                    <img
                      src={item.image}
                      alt={item.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />

                    {/* Top badges */}
                    <div className="absolute top-2 left-2 flex items-center gap-1 z-10">
                      <span className="rounded-md bg-amber-500 px-1.5 py-0.5 text-[9px] font-extrabold text-slate-950 tracking-wider shadow-xs">
                        {item.code}
                      </span>
                      <span className="rounded-md bg-slate-950/85 backdrop-blur-xs px-1.5 py-0.5 text-[8.5px] font-semibold text-cyan-300 border border-cyan-500/30 line-clamp-1 max-w-[110px]">
                        {item.category}
                      </span>
                    </div>

                    {/* Quick Share */}
                    <button
                      type="button"
                      onClick={(e) => handleShare(item, e)}
                      className="absolute top-2 right-2 rounded-full bg-slate-950/70 backdrop-blur-xs p-1 text-slate-300 hover:text-white transition-opacity z-10 cursor-pointer opacity-70 group-hover:opacity-100"
                      title="Share"
                    >
                      <Share2 className="h-3 w-3" />
                    </button>

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-2.5 z-10">
                      <p className="text-[10px] text-amber-300 font-medium line-clamp-1 mb-0.5">
                        {item.details}
                      </p>
                      <div className="flex items-center justify-between text-[11px]">
                        {item.price ? (
                          <span className="text-white font-bold">
                            ₹{toIndicDigits(String(item.price), lang)}/
                            {item.unit ? localizeCatalogTerm(item.unit, lang) : ""}
                          </span>
                        ) : (
                          <span className="text-white font-bold">
                            {lang === "gu"
                              ? "ચકાસાયેલ પોર્ટફોલિયો"
                              : lang === "hi"
                                ? "सत्यापित पोर्टफोलियो"
                                : "Verified Portfolio"}
                          </span>
                        )}
                        <span className="flex items-center gap-0.5 text-[10px] text-amber-400 font-semibold">
                          <Eye className="h-3 w-3" />{" "}
                          {lang === "gu" ? "વિગતો" : lang === "hi" ? "विवरण" : "Details"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Squeezed Product Info */}
                  <div className="p-2 sm:p-2.5 flex flex-col flex-1 justify-between gap-1.5">
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-foreground group-hover:text-amber-500 transition-colors line-clamp-1">
                        {item.name}
                      </h3>
                      <p className="text-[10px] sm:text-[11px] text-amber-600 dark:text-amber-400 font-medium line-clamp-1">
                        {item.details}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground line-clamp-1">
                        <span className="font-semibold">
                          {lang === "gu" ? "માપ:" : lang === "hi" ? "साइज़:" : "Size:"}
                        </span>{" "}
                        {item.sizes}
                      </p>
                    </div>

                    <div className="pt-1.5 border-t border-border/40 flex items-center justify-between gap-1">
                      {item.price ? (
                        <div>
                          <span className="text-xs font-bold text-foreground">
                            ₹{toIndicDigits(String(item.price), lang)}
                          </span>
                          <span className="text-[9px] text-muted-foreground">
                            /{item.unit ? localizeCatalogTerm(item.unit, lang) : ""}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          {lang === "gu"
                            ? "લાઇવ સ્થાપિત"
                            : lang === "hi"
                              ? "लाइव स्थापित"
                              : "Live Executed"}
                        </span>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={(e) => handleSelectProductClick(item, e)}
                        className="h-6 text-[10px] px-2 border-amber-500/40 hover:bg-amber-500 hover:text-slate-950 cursor-pointer font-semibold shrink-0"
                      >
                        {lang === "gu"
                          ? "અંદાજ મેળવો"
                          : lang === "hi"
                            ? "अनुमान प्राप्त करें"
                            : "Estimate"}
                        <ArrowRight className="h-2.5 w-2.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Crisp Action & Navigation Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-3 py-2 rounded-xl border border-border/60 bg-muted/20 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="font-semibold text-foreground">
                {lang === "gu"
                  ? `${toIndicDigits(String(filteredItems.length), lang)} ${tabMetadata.countLabel} દર્શાવી રહ્યાં છીએ`
                  : lang === "hi"
                    ? `${toIndicDigits(String(filteredItems.length), lang)} ${tabMetadata.countLabel} प्रदर्शित`
                    : `Showing ${filteredItems.length} ${tabMetadata.countLabel}`}
              </span>
              <span className="hidden md:inline text-[11px]">·</span>
              <span className="hidden md:inline text-[11px]">
                {lang === "gu"
                  ? "૨ હરોળનું ફ્રેમ (૮ દૃશ્યમાન) · બધા જોવા માટે સ્ક્રોલ કરો"
                  : lang === "hi"
                    ? "२ पंक्तियों का फ्रेम (८ दृश्यमान) · सभी देखने के लिए स्क्रॉल करें"
                    : "2-Row Frame (8 visible) · Scroll box to explore all"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={scrollToContainerTop}
                className="h-7 px-2.5 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                title="Scroll to Top of Catalog"
              >
                <ChevronUp className="h-3.5 w-3.5 mr-1" />
                {lang === "gu" ? "ટોચ પર જાઓ" : lang === "hi" ? "शीर्ष पर जाएं" : "Top"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const footer = document.querySelector("footer");
                  if (footer) {
                    footer.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                className="h-7 px-2.5 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                title="Scroll past catalog to Footer"
              >
                <ChevronDown className="h-3.5 w-3.5 mr-1" />
                {lang === "gu" ? "પેજ ફૂટર" : lang === "hi" ? "पेज फ़ुटर" : "Page Footer"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ARCHITECTURAL LIGHTBOX MODAL */}
      <Dialog
        open={Boolean(lightboxItem)}
        onOpenChange={(open) => {
          if (!open) setLightboxItem(null);
        }}
      >
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-card border-border/80 sm:rounded-2xl">
          {lightboxItem && (
            <div className="flex flex-col md:flex-row">
              <div className="relative aspect-square md:w-1/2 w-full bg-slate-950 flex items-center justify-center overflow-hidden">
                <img
                  src={lightboxItem.image}
                  alt={lightboxItem.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 flex gap-1.5 z-10">
                  <span className="rounded-md bg-amber-500 px-2.5 py-1 text-xs font-extrabold text-slate-950 tracking-wider shadow-md">
                    {lightboxItem.code}
                  </span>
                  <span className="rounded-md bg-slate-950/80 backdrop-blur-xs px-2.5 py-1 text-xs font-semibold text-cyan-300 border border-cyan-500/30">
                    {lightboxItem.category}
                  </span>
                </div>
              </div>

              <div className="p-5 md:p-6 md:w-1/2 flex flex-col justify-between space-y-4 overflow-y-auto max-h-[80vh]">
                <div>
                  <DialogHeader className="p-0 text-left">
                    <DialogTitle className="text-xl font-bold text-foreground">
                      {lightboxItem.name}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                      {lightboxItem.details}
                    </DialogDescription>
                  </DialogHeader>

                  <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                    {lightboxItem.desc}
                  </p>

                  {lightboxItem.specs && (
                    <div className="mt-4 space-y-1.5 border-t border-border/40 pt-3 text-xs">
                      {lightboxItem.specs.map((sp: CatalogItemSpec, i: number) => (
                        <div
                          key={i}
                          className="flex justify-between py-1 border-b border-border/20"
                        >
                          <span className="text-muted-foreground">
                            {localizeCatalogTerm(sp.label, lang)}:
                          </span>
                          <span className="font-semibold text-foreground text-right">{sp.val}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-border/60 space-y-3">
                  {lightboxItem.price ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs text-muted-foreground block">
                          {lang === "gu"
                            ? "ડાયરેક્ટ ફેક્ટરી દર"
                            : lang === "hi"
                              ? "डायरेक्ट फैक्ट्री दर"
                              : "Direct Factory Benchmark"}
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-foreground">
                            ₹{toIndicDigits(String(lightboxItem.price), lang)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            /{lightboxItem.unit ? localizeCatalogTerm(lightboxItem.unit, lang) : ""}
                          </span>
                        </div>
                      </div>
                      <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-1 text-[10px] font-bold">
                        {lang === "gu"
                          ? "ડિસ્પેચ માટે તૈયાર"
                          : lang === "hi"
                            ? "डिस्पैच हेतु तैयार"
                            : "Ready to Ship"}
                      </span>
                    </div>
                  ) : null}

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={() => handleSelectProductClick(lightboxItem)}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs h-10 cursor-pointer shadow-md"
                    >
                      {lang === "gu"
                        ? "આ ઉત્પાદન માટે અંદાજ મેળવો"
                        : lang === "hi"
                          ? "इस उत्पाद के लिए कोटेशन अनुरोध करें"
                          : "Request Estimation for this Product"}
                      <ArrowRight className="h-4 w-4 ml-1.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={(e) => handleShare(lightboxItem, e)}
                      className="h-10 px-3 cursor-pointer"
                      title="Share link"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

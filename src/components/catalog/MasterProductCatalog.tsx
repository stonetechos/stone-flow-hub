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
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  Layers,
  Sparkles,
  Gem,
  Compass,
  CircleDot,
  Camera,
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
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  "Few of Our Works": { hi: "हमारे कुछ कार्य", gu: "અમારા કેટલાક કાર્યો" },
  "few of our works": { hi: "हमारे कुछ कार्य", gu: "અમારા કેટલાક કાર્યો" },
  "A few of more works": { hi: "हमारे कुछ और कार्य", gu: "અમારા કેટલાક વધુ કાર્યો" },
  "Live Installed Works": { hi: "हमारे कुछ और कार्य", gu: "અમારા કેટલાક વધુ કાર્યો" },

  // Categories & Series
  "Hollow Glass Bricks": { hi: "खोखली कांच की ईंटें", gu: "પોલી કાચની ઈંટો" },
  "Solid Glass Bricks": { hi: "ठोस कांच की ईंटें", gu: "નક્કર કાચની ઈંટો" },
  "Semi-Precious Agates": { hi: "अर्ध-कीमती अगेट संग्रह", gu: "અર્ધ-કિંમતી અગેટ સંગ્રહ" },
  "Landscape & River": { hi: "लैंडस्केप एवं नदी कंकड़", gu: "લેન્ડસ્કેપ અને નદીના કાંકરા" },
  "Landscape & River Pebbles": { hi: "लैंडस्केप एवं नदी कंकड़", gu: "લેન્ડસ્કેપ અને નદીના કાંકરા" },
  "Decorative & Specialty": { hi: "सजावटी एवं विशिष्ट कंकड़", gu: "સુશોભન અને વિશિષ્ટ કાંકરા" },
  "Jumbo & Flat Pebbles": { hi: "जंबो एवं फ्लैट पेबल्स", gu: "જમ્બો અને ફ્લેટ કાંકરા" },
  "Mini Pebbles & Chips": { hi: "मिनी पेबल्स एवं चिप्स", gu: "મિની કાંકરા અને ચિપ્સ" },
  "Onyx Pebbles": { hi: "गोमेद (ओनिक्स) पेबल्स", gu: "ગોમેદ (ઓનિક્સ) કાંકરા" },

  // Stone Veneer Collections & Materials
  "Slate Stone Collection": { hi: "स्लेट स्टोन संग्रह", gu: "સ્લેટ સ્ટોન સંગ્રહ" },
  "Sandstone Collection": { hi: "सैंडस्टोन संग्रह", gu: "સેન્ડસ્ટોન સંગ્રહ" },
  "Marble Stone Collection": { hi: "मार्बल स्टोन संग्रह", gu: "માર્બલ સ્ટોન સંગ્રહ" },
  "Limestone Collection": { hi: "लाइमस्टोन संग्रह", gu: "લાઇમસ્ટોન સંગ્રહ" },
  Slate: { hi: "स्लेट पाषाण", gu: "સ્લેટ પથ્થર" },
  Sandstone: { hi: "सैंडस्टोन (बलुआ पत्थर)", gu: "સેન્ડસ્ટોન (રેતીયો પથ્થર)" },
  Marble: { hi: "संगमरमर (मार्बल)", gu: "સંગેમરમર (માર્બલ)" },
  Limestone: { hi: "चूना पत्थर (लाइमस्टोन)", gu: "ચૂનાનો પથ્થર (લાઇમસ્ટોન)" },
  "Natural Slate": { hi: "प्राकृतिक स्लेट पाषाण", gu: "કુદરતી સ્લેટ પથ્થર" },
  "Natural Sandstone": { hi: "प्राकृतिक बलुआ पत्थर", gu: "કુદરતી રેતીયો પથ્થર" },
  "Natural Marble": { hi: "प्राकृतिक संगमरमर", gu: "કુદરતી સંગેમરમર" },
  "Natural Limestone": { hi: "प्राकृतिक चूना पत्थर", gu: "કુદરતી ચૂનાનો પથ્થર" },
  "Natural Stone": { hi: "प्राकृतिक पाषाण", gu: "કુદરતી પથ્થર" },
  "Translucent (Backlit)": { hi: "पारभासी (बैकलिट)", gu: "પારભાસી (બેકલિટ)" },
  "Natural Cleft": { hi: "प्राकृतिक तराशा पाषाण", gu: "કુદરતી પથ્થર" },

  // Glass Bricks Series & Collections
  "Clear Architectural Series": {
    hi: "पारदर्शी वास्तुशिल्पीय श्रृंखला",
    gu: "પારદર્શક વાસ્તુશિલ્પીય શ્રેણી",
  },
  "Optical Clear Crystal Series": {
    hi: "ऑप्टिकल पारदर्शी क्रिस्टल श्रृंखला",
    gu: "ઓપ્ટિકલ પારદર્શક ક્રિસ્ટલ શ્રેણી",
  },
  "In-Color & Translucent Tinted Series": {
    hi: "रंगीन एवं पारभासी टिंटेड श्रृंखला",
    gu: "રંગીન અને પારભાસી ટિન્ટેડ શ્રેણી",
  },
  "Vibrant Translucent Tinted Series": {
    hi: "वाइब्रेंट पारभासी टिंटेड श्रृंखला",
    gu: "વાઇબ્રન્ટ પારભાસી ટિન્ટેડ શ્રેણી",
  },
  "Cloudy Nebula Artisanal Series": {
    hi: "क्लाउडी नेबुला कलात्मक श्रृंखला",
    gu: "ક્લાઉડી નેબ્યુલા કલાત્મક શ્રેણી",
  },

  // Flexible Clay Veneers
  "Architectural 3D Textures": {
    hi: "वास्तुशिल्पीय ३D टेक्सचर्स",
    gu: "વાસ્તુશિલ્પીય ૩D ટેક્સચર્સ",
  },
  "Punch Traventino Series": { hi: "पंच ट्रैवर्टिनो श्रृंखला", gu: "પંચ ટ્રેવર્ટીનો શ્રેણી" },
  "Punch Slat Series": { hi: "पंच स्लेट श्रृंखला", gu: "પંચ સ્લેટ શ્રેણી" },
  "Stone Wall Cladding": {
    hi: "प्राकृतिक पाषाण दीवार क्लैडिंग",
    gu: "કુદરતી પાષાણ દીવાલ ક્લેડિંગ",
  },
  "Stone Wall Mural Artwork": {
    hi: "पाषाण भित्ति शिल्प (म्यूरल)",
    gu: "પાષાણ દિવાલ મ્યુરલ કલાકૃતિઓ",
  },
  "Horizontal Strip & Ledgestone Panels": {
    hi: "हॉरिजॉन्टल स्ट्रिप एवं लेजस्टोन पैनल्स",
    gu: "હોરિઝોન્ટલ સ્ટ્રીપ અને લેજસ્ટોન પેનલ્સ",
  },
  "Stone Inlay": { hi: "पाषाण पच्चीकारी (स्टोन इनले)", gu: "પથ્થર પચ્ચીકારી (સ્ટોન ઇનલે)" },
  "Natural Stone Veneer": { hi: "प्राकृतिक स्टोन विनियर", gu: "કુદરતી સ્ટોન વિનિયર" },
  "Clay Veneer": { hi: "फ्लेक्सिबल क्ले विनियर", gu: "ફ્લેક્સિબલ ક્લે વિનિયર" },
  "Executed Works": { hi: "स्थापित कार्य", gu: "સ્થાપિત કાર્યો" },
  "Executed Project": { hi: "पूर्ण प्रोजेक्ट", gu: "સંપૂર્ણ પ્રોજેક્ટ" },

  // Portfolio Executed Works Categories & Locations
  "Ultra-Thin Stone Veneer": { hi: "अत्यंत पतली स्टोन विनियर", gu: "અત્યંત પાતળી સ્ટોન વિનિયર" },
  "Architectural Glass Bricks": {
    hi: "वास्तुशिल्पीय कांच की ईंटें",
    gu: "વાસ્તુશિલ્પીય કાચની ઈંટો",
  },
  "Flexible Clay Veneers": { hi: "लचीली क्ले विनियर्स", gu: "લચીલી ક્લે વિનિયર્સ" },
  "Indiranagar, Bangalore": { hi: "इंदिरानगर, बेंगलुरु", gu: "ઇન્દિરાનગર, બેંગલુરુ" },
  "Jubilee Hills, Hyderabad": { hi: "जुबली हिल्स, हैदराबाद", gu: "જ્યુબિલી હિલ્સ, હૈદરાબાદ" },
  "Jaipur, Rajasthan": { hi: "जयपुर, राजस्थान", gu: "જયપુર, રાજસ્થાન" },
  "Worli Sea Face, Mumbai": { hi: "वर्ली सी फेस, मुंबई", gu: "વરલી સી ફેસ, મુંબઈ" },
  "Aerocity, New Delhi": { hi: "एरोसिटी, नई दिल्ली", gu: "એરોસિટી, નવી દિલ્હી" },
  "Alibaug Private Villa": { hi: "अलीबाग प्राइवेट विला", gu: "અલીબાગ પ્રાઇવેટ વિલા" },
  "Boat Club Road, Pune": { hi: "बोट क्लब रोड, पुणे", gu: "બોટ ક્લબ રોડ, પુણે" },
  "Ahmedabad / Surat, Gujarat": { hi: "अहमदाबाद / सूरत, गुजरात", gu: "અમદાવાદ / સુરત, ગુજરાત" },
  "Mumbai / Bangalore Luxury Commercial": {
    hi: "मुंबई / बेंगलुरु लग्जरी प्रोजेक्ट",
    gu: "મુંબઈ / બેંગલુરુ લક્ઝરી પ્રોજેક્ટ",
  },
  "BKC, Mumbai": { hi: "बीकेसी, मुंबई", gu: "બીકેસી, મુંબઈ" },

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

  // Controlled/Uncontrolled active tab with instant optimistic local state
  const [selectedTab, setSelectedTab] = useState<ProductTab>(externalActiveTab || "cladding");

  useEffect(() => {
    if (externalActiveTab && externalActiveTab !== selectedTab) {
      setSelectedTab(externalActiveTab);
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    }
  }, [externalActiveTab, selectedTab]);

  const currentTab = selectedTab;

  const handleTabChange = (tab: ProductTab) => {
    setSelectedTab(tab);
    onTabChange?.(tab);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  };

  const [lightboxItem, setLightboxItem] = useState<CatalogItem | null>(null);
  const [hoveredZoomItem, setHoveredZoomItem] = useState<CatalogItem | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleMouseEnter = (item: CatalogItem) => {
    // Only trigger hover zoom on fine pointer devices (mouse/trackpad), not mobile touchscreens
    if (
      typeof window !== "undefined" &&
      window.matchMedia &&
      !window.matchMedia("(hover: hover) and (pointer: fine)").matches
    ) {
      return;
    }
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    // 200ms intentional hover dwell time to avoid accidental triggers while moving or scrolling past
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredZoomItem(item);
    }, 200);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHoveredZoomItem(null);
  };

  // Only listen to window scroll/wheel when a zoom overlay is ACTUALLY OPEN so we can close it
  // This guarantees ZERO window scroll listeners during normal 120fps webpage scrolling!
  useEffect(() => {
    if (!hoveredZoomItem) return;
    const closeOnScroll = () => {
      setHoveredZoomItem(null);
    };
    window.addEventListener("scroll", closeOnScroll, { passive: true, once: true });
    window.addEventListener("wheel", closeOnScroll, { passive: true, once: true });
    return () => {
      window.removeEventListener("scroll", closeOnScroll);
      window.removeEventListener("wheel", closeOnScroll);
    };
  }, [hoveredZoomItem]);

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
          const collection = String(v.collection || v.series || "Slate Stone Collection");
          const stoneType = String(v.stoneType || "Natural Stone");
          return {
            id: code,
            code: code,
            name: getLoc(loc?.name, lang) || localizeCatalogTerm(String(v.name), lang),
            category: getLoc(loc?.category, lang) || localizeCatalogTerm(collection, lang),
            subCategory: getLoc(loc?.details, lang) || localizeCatalogTerm(stoneType, lang),
            image: String(v.slabImage || v.image || ""),
            sceneImage: v.sceneImage ? String(v.sceneImage) : undefined,
            price: typeof v.price === "number" ? v.price : 195,
            unit: String(v.unit || "sq.ft"),
            sizes: toIndicDigits(String(v.standardSizes || "1220 × 2440 mm"), lang),
            details:
              getLoc(loc?.details, lang) ||
              localizeCatalogTerm(v.stoneType ? `Natural ${v.stoneType}` : collection, lang),
            desc: String(
              v.desc || "Ultra-thin flexible natural stone veneer sheet with fiberglass backing.",
            ),
            specs: [
              {
                label: "Collection",
                val: localizeCatalogTerm(collection, lang),
              },
              {
                label: "Stone Type",
                val: localizeCatalogTerm(stoneType, lang),
              },
              {
                label: "Dimensions",
                val: toIndicDigits(String(v.standardSizes || "1220 × 2440 mm"), lang),
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
          const series = String(g.series || "Hollow Glass Bricks");
          const collection = String(g.collection || g.type || "Clear Architectural Series");
          return {
            id: code,
            code: code,
            name: getLoc(loc?.name, lang) || localizeCatalogTerm(String(g.name), lang),
            category: getLoc(loc?.category, lang) || localizeCatalogTerm(series, lang),
            subCategory: localizeCatalogTerm(collection, lang),
            image: String(g.image || ""),
            sceneImage: g.sceneImage ? String(g.sceneImage) : undefined,
            price: typeof g.price === "number" ? g.price : 420,
            unit: String(g.unit || "pc"),
            sizes: toIndicDigits(
              String(g.dimensions || g.standardSizes || "190 × 190 × 80 mm"),
              lang,
            ),
            details:
              getLoc(loc?.details, lang) ||
              localizeCatalogTerm(String(g.finish || collection || series), lang),
            desc: String(
              g.desc ||
                "Architectural optical-grade glass brick with precision geometric refraction.",
            ),
            specs: [
              {
                label: "Series",
                val: localizeCatalogTerm(series, lang),
              },
              {
                label: "Collection",
                val: localizeCatalogTerm(collection, lang),
              },
              {
                label: "Dimensions",
                val: toIndicDigits(
                  String(g.dimensions || g.standardSizes || "190 × 190 × 80 mm"),
                  lang,
                ),
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
          const series = String(c.series || "Architectural 3D Textures");
          const profile = String(c.profile || "3D Relief");
          return {
            id: code,
            code: code,
            name: getLoc(loc?.name, lang) || localizeCatalogTerm(String(c.rawName || c.name), lang),
            category: getLoc(loc?.category, lang) || localizeCatalogTerm(series, lang),
            subCategory: localizeCatalogTerm(profile, lang),
            image: String(c.image || ""),
            sceneImage: c.sceneImage ? String(c.sceneImage) : undefined,
            price: typeof c.price === "number" ? c.price : 220,
            unit: String(c.unit || "sq.ft"),
            sizes: toIndicDigits(String(c.standardSizes || "1200 × 2400 mm"), lang),
            details:
              getLoc(loc?.details, lang) || localizeCatalogTerm(String(c.profile || series), lang),
            desc: String(
              c.desc ||
                "Flexible modified mineral clay architectural veneer for curved and exterior elevations.",
            ),
            specs: [
              {
                label: "Series",
                val: localizeCatalogTerm(series, lang),
              },
              {
                label: "Profile",
                val: localizeCatalogTerm(profile, lang),
              },
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
          const category = String(p.category || "Semi-Precious Agates");
          const finish = String(p.finish || "Natural");
          return {
            id: code,
            code: code,
            name: getLoc(loc?.name, lang) || localizeCatalogTerm(String(p.name), lang),
            category: getLoc(loc?.category, lang) || localizeCatalogTerm(category, lang),
            subCategory: localizeCatalogTerm(finish, lang),
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
              { label: "Category", val: localizeCatalogTerm(category, lang) },
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
        return (rawInstallsData as Array<Record<string, unknown>>).map((ins) => {
          const cat = String(ins.categoryLabel || ins.category || "Ultra-Thin Stone Veneer");
          const loc = String(ins.location || "Executed Project");
          return {
            id: String(ins.id),
            code: String(ins.productCode || ins.id),
            name: localizeCatalogTerm(String(ins.title || ""), lang),
            category: localizeCatalogTerm(cat, lang),
            subCategory: localizeCatalogTerm(loc, lang),
            image: String(ins.image || ""),
            price: null,
            unit: null,
            sizes: String(ins.specs || "Custom On-Site Architecture"),
            details: localizeCatalogTerm(String(ins.stoneType || loc), lang),
            desc: String(
              ins.description ||
                "Live verified installation by Stone Tech Atelier engineering teams.",
            ),
            specs: [
              { label: "Project Site", val: localizeCatalogTerm(loc, lang) },
              {
                label: "Material Specified",
                val: localizeCatalogTerm(String(ins.stoneType || ""), lang),
              },
              { label: "Architecture Specs", val: String(ins.specs || "") },
            ],
            externalLink: ins.instagramUrl ? String(ins.instagramUrl) : null,
          };
        });
      case "cladding":
      default:
        return (rawCladdingData as Array<Record<string, unknown>>).map((c) => {
          const imgs = Array.isArray(c.images) ? (c.images as string[]) : [];
          const code = String(c.code || c.id);
          const loc = lang !== "en" ? CATALOG_ITEMS_BY_CODE[code] : undefined;
          const codeName = toIndicDigits(code, lang);
          return {
            id: String(c.id),
            code: code,
            name: codeName, // Exclusively display sequential code name for Natural Stone Cladding
            category:
              getLoc(loc?.category, lang) ||
              localizeCatalogTerm(String(c.category || "Stone Wall Cladding"), lang),
            subCategory:
              getLoc(loc?.details, lang) ||
              localizeCatalogTerm(String(c.stoneType || "Sandstone"), lang),
            image: String(imgs[0] || c.image || ""),
            price: typeof c.price === "number" ? c.price : 240,
            unit: "sq.ft",
            sizes: "",
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

  // Progressive rendering for 120fps smooth scrolling: initial 24 items + auto-batching on scroll
  const BATCH_SIZE = 24;
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset scroll position and visible count when active tab changes
  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [currentTab]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const container = scrollContainerRef.current;
    if (!sentinel || !container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting) {
          setVisibleCount((prev) => {
            if (prev >= currentDataset.length) return prev;
            return Math.min(prev + BATCH_SIZE, currentDataset.length);
          });
        }
      },
      {
        root: container,
        rootMargin: "400px 0px",
        threshold: 0,
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [currentDataset.length, currentTab]);

  const displayedItems = useMemo(() => {
    return currentDataset.slice(0, visibleCount);
  }, [currentDataset, visibleCount]);
  const filteredItems = currentDataset;

  const scrollToContainerTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSelectProductClick = (item: CatalogItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLightboxItem(null);
    const label = currentTab === "cladding" ? item.code : item.name;
    const desc =
      currentTab === "cladding"
        ? `Wall Cladding: ${item.code} - ${item.category}`.trim()
        : `${item.name} (${item.code}) - ${item.category} [${item.sizes || "Standard"}]`.trim();
    if (onSelectProduct) {
      onSelectProduct(desc);
    } else {
      toast.success(`Selected ${label} for quotation estimation`);
    }
  };

  const handleShare = (item: CatalogItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/#${currentTab}-${item.code.toLowerCase()}`;
    const text =
      currentTab === "cladding"
        ? `Check out ${item.code} from Stone Tech Atelier: ${url}`
        : `Check out ${item.name} (${item.code}) from Stone Tech Atelier: ${url}`;
    if (navigator.share) {
      navigator.share({ title: item.name, text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Link copied to clipboard!");
    }
  };

  // Count label metadata per tab for the bottom status bar
  const tabMetadata = {
    cladding: {
      countLabel: lang === "gu" ? "પેટર્ન્સ" : lang === "hi" ? "पैटर्न्स" : "Patterns",
    },
    "stone-veneer": {
      countLabel: lang === "gu" ? "જાતો" : lang === "hi" ? "किस्में" : "Varieties",
    },
    "glass-bricks": {
      countLabel: lang === "gu" ? "ડિઝાઇન્સ" : lang === "hi" ? "डिज़ाइन्स" : "Designs",
    },
    "clay-veneers": {
      countLabel: lang === "gu" ? "ટેક્સચર્સ" : lang === "hi" ? "टेक्सचर्स" : "Textures",
    },
    pebbles: {
      countLabel: lang === "gu" ? "જાતો" : lang === "hi" ? "किस्में" : "Varieties",
    },
    installations: {
      countLabel: lang === "gu" ? "પ્રોજેક્ટ્સ" : lang === "hi" ? "प्रोजेक्ट्स" : "Projects",
    },
  }[currentTab];

  return (
    <div
      className={cn(
        "rounded-3xl border border-border/80 bg-card/80 backdrop-blur-xs p-4 sm:p-6 shadow-md space-y-4",
        className,
      )}
    >
      {/* 1. MASTER PRODUCT DIVISION TABS STRIP (DIRECTLY IN THE CARD DISPLAY) */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-muted/80 border border-border/60 overflow-x-auto scrollbar-none touch-pan-x [-webkit-overflow-scrolling:touch]">
        <button
          type="button"
          onClick={() => handleTabChange("cladding")}
          className={cn(
            "shrink-0 flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer",
            currentTab === "cladding"
              ? "bg-[#015474] text-white shadow-xs"
              : "text-[#015474]/75 dark:text-[#67e8f9]/75 hover:text-[#015474] dark:hover:text-[#67e8f9]",
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
            "shrink-0 flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer",
            currentTab === "stone-veneer"
              ? "bg-[#015474] text-white shadow-xs"
              : "text-[#015474]/75 dark:text-[#67e8f9]/75 hover:text-[#015474] dark:hover:text-[#67e8f9]",
          )}
        >
          <Sparkles className="h-4 w-4 text-[#006788] dark:text-[#38bdf8]" />
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
            "shrink-0 flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer",
            currentTab === "glass-bricks"
              ? "bg-[#015474] text-white shadow-xs"
              : "text-[#015474]/75 dark:text-[#67e8f9]/75 hover:text-[#015474] dark:hover:text-[#67e8f9]",
          )}
        >
          <Gem className="h-4 w-4 text-[#006788] dark:text-[#38bdf8]" />
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
            "shrink-0 flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer",
            currentTab === "clay-veneers"
              ? "bg-[#015474] text-white shadow-xs"
              : "text-[#015474]/75 dark:text-[#67e8f9]/75 hover:text-[#015474] dark:hover:text-[#67e8f9]",
          )}
        >
          <Compass className="h-4 w-4 text-[#006788] dark:text-[#38bdf8]" />
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
            "shrink-0 flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer",
            currentTab === "pebbles"
              ? "bg-[#015474] text-white shadow-xs"
              : "text-[#015474]/75 dark:text-[#67e8f9]/75 hover:text-[#015474] dark:hover:text-[#67e8f9]",
          )}
        >
          <CircleDot className="h-4 w-4 text-[#006788] dark:text-[#38bdf8]" />
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
            "shrink-0 relative flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 whitespace-nowrap cursor-pointer border overflow-hidden",
            "animate-works-glow",
            currentTab === "installations"
              ? "bg-gradient-to-r from-[#006788] via-[#015474] to-[#006788] text-white border-[#006788] shadow-[0_0_20px_rgba(1,84,116,0.35)]"
              : "bg-gradient-to-r from-[#006788]/15 via-[#015474]/20 to-[#006788]/15 border-[#006788]/40 text-[#015474] dark:text-[#67e8f9] hover:text-[#004863] dark:hover:text-white",
          )}
        >
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#006788] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#006788]" />
          </span>
          <Camera className="h-4 w-4 text-[#006788] dark:text-[#38bdf8] shrink-0" />
          <span className="tracking-wide">
            {lang === "gu"
              ? "અમારા કેટલાક કાર્યો"
              : lang === "hi"
                ? "हमारे कुछ कार्य"
                : "Few of Our Works"}
          </span>
        </button>
      </div>

      {/* 1b. LIVE INSTAGRAM FEED OVER "FEW OF OUR WORKS" (WHEN INSTALLATIONS ACTIVE) */}
      {currentTab === "installations" && (
        <div className="pt-1 pb-3 animate-in fade-in duration-300">
          <StoneGalleryFeed onSelectProduct={onSelectProduct} />
        </div>
      )}

      {/* 2. SQUEEZED PRODUCT GRID VIEWPORT WITH SMOOTH IN-BOX SCROLLING */}
      {currentTab !== "installations" &&
        (displayedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border bg-card/40">
            <Layers className="h-10 w-10 text-muted-foreground/60 mb-3" />
            <p className="text-sm font-semibold text-foreground">No matching products found</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {/* 2-Row 8-Product Catalog Box with Smooth In-Box Scroll */}
            <div
              ref={scrollContainerRef}
              aria-label="Architectural Products 8-Item Frame"
              className={cn(
                "relative w-full rounded-2xl border border-border/80 bg-card/40 p-2 sm:p-3",
                "h-[480px] sm:h-[540px] md:h-[600px] lg:h-[700px] xl:h-[780px]",
                "overflow-y-auto overscroll-y-auto transform-gpu",
                "[scrollbar-width:thin] scrollbar-thumb-muted-foreground/30 hover:scrollbar-thumb-muted-foreground/60",
                "[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-muted/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50",
              )}
              style={{ overscrollBehaviorY: "auto" }}
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4 gap-2.5 sm:gap-3.5 pb-4">
                {displayedItems.map((item) => (
                  <div
                    key={item.code}
                    onClick={() => {
                      setHoveredZoomItem(null);
                      setLightboxItem(item);
                    }}
                    onMouseEnter={() => handleMouseEnter(item)}
                    onMouseLeave={handleMouseLeave}
                    className="group relative flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card hover:border-amber-500/60 transition-colors duration-150 cursor-pointer"
                  >
                    {/* Architectural Product Image Frame — Matching PDF photo-box presentation */}
                    <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-[#f8fafc] dark:bg-stone-900/60 border border-slate-100 dark:border-slate-800 flex items-center justify-center p-2">
                      <img
                        src={item.image}
                        alt={item.name}
                        width={300}
                        height={300}
                        loading="eager"
                        decoding="async"
                        className="max-h-[92%] max-w-[92%] w-auto h-auto object-contain select-none pointer-events-none"
                      />

                      {/* Quick Share */}
                      <button
                        type="button"
                        onClick={(e) => handleShare(item, e)}
                        className="absolute top-2 right-2 rounded-full bg-slate-950/80 p-1 text-slate-300 hover:text-white transition-opacity z-10 cursor-pointer opacity-70 group-hover:opacity-100"
                        title="Share"
                      >
                        <Share2 className="h-3 w-3" />
                      </button>
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
                        {currentTab !== "cladding" && item.sizes ? (
                          <p className="mt-0.5 text-[10px] text-muted-foreground line-clamp-1">
                            <span className="font-semibold">
                              {lang === "gu" ? "માપ:" : lang === "hi" ? "साइज़:" : "Size:"}
                            </span>{" "}
                            {item.sizes}
                          </p>
                        ) : null}
                      </div>

                      <div className="pt-1.5 border-t border-border/40 flex items-center justify-between gap-1">
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          {lang === "gu"
                            ? "વિનંતી પર ભાવ"
                            : lang === "hi"
                              ? "अनुरोध पर मूल्य"
                              : "Price on Request"}
                        </span>
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
              <div
                ref={sentinelRef}
                className="h-6 w-full pointer-events-none"
                aria-hidden="true"
              />
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
        ))}

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
              <div className="relative aspect-square md:w-1/2 w-full bg-[#f8fafc] dark:bg-slate-950 flex items-center justify-center p-4 overflow-hidden border-b md:border-b-0 md:border-r border-border/60">
                <img
                  src={lightboxItem.image}
                  alt={lightboxItem.name}
                  className="max-h-[92%] max-w-[92%] w-auto h-auto object-contain drop-shadow-md transition-transform duration-500 hover:scale-105"
                />
              </div>

              <div className="p-5 md:p-6 md:w-1/2 flex flex-col justify-between space-y-4 overflow-y-auto max-h-[80vh]">
                <div>
                  <DialogHeader className="p-0 text-left">
                    <DialogTitle className="text-xl font-bold text-foreground">
                      {currentTab === "cladding" ? lightboxItem.code : lightboxItem.name}
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
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-muted-foreground block">
                        {lang === "gu"
                          ? "વાસ્તુશિલ્પીય ભાવ પરામર્શ"
                          : lang === "hi"
                            ? "वास्तुशिल्पीय मूल्य परामर्श"
                            : "Architectural Pricing"}
                      </span>
                      <span className="text-base font-bold text-foreground">
                        {lang === "gu"
                          ? "પ્રોજેક્ટ વિનંતી પર ઉપલબ્ધ"
                          : lang === "hi"
                            ? "प्रोजेक्ट अनुरोध पर उपलब्ध"
                            : "Price on Project Request"}
                      </span>
                    </div>
                    <span className="rounded-full bg-[#e0f1f5] text-[#015474] dark:bg-[#015474]/40 dark:text-[#67e8f9] border border-[#c9d1d4] dark:border-[#00597b] px-2.5 py-1 text-[10px] font-bold">
                      {lang === "gu"
                        ? "મોકલવા માટે તૈયાર"
                        : lang === "hi"
                          ? "भेजने के लिए तैयार"
                          : "Ready to Ship"}
                    </span>
                  </div>

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

      {/* FULL SCREEN HOVER ZOOM PREVIEW (DISAPPEARS AUTOMATICALLY ON MOUSE LEAVE) */}
      {hoveredZoomItem &&
        isMounted &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            aria-hidden="true"
            className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center p-3 sm:p-6 md:p-8 bg-slate-950/92 transition-opacity duration-200 animate-in fade-in"
          >
            <div className="relative max-w-4xl max-h-[92vh] w-auto h-auto flex flex-col items-center justify-between rounded-2xl border-2 border-amber-500/60 bg-gradient-to-b from-slate-900/95 via-slate-950/98 to-slate-950/95 shadow-[0_25px_70px_rgba(0,0,0,0.9)] p-4 sm:p-6 overflow-hidden transform-gpu">
              {/* Header inside Zoom Box */}
              <div className="w-full flex items-center justify-end gap-3 pb-3 border-b border-amber-500/20">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30">
                  <Maximize2 className="h-3 w-3 text-amber-400 animate-pulse" />
                  <span>
                    {lang === "gu"
                      ? "પૂર્ણ સ્ક્રીન પ્રીવ્યૂ · માઉસ દૂર કરો બંધ કરવા"
                      : lang === "hi"
                        ? "पूर्ण स्क्रीन पूर्वावलोकन · बंद करने हेतु माउस हटाएं"
                        : "Full Screen Preview · Hover off to close"}
                  </span>
                </div>
              </div>

              {/* Main Full-Scale Image */}
              <div className="relative flex items-center justify-center my-3 max-h-[68vh] max-w-[80vw] overflow-hidden rounded-xl bg-slate-950/50 p-2 sm:p-4 border border-white/5">
                <img
                  src={hoveredZoomItem.image}
                  alt={hoveredZoomItem.name}
                  className="max-h-[64vh] max-w-[76vw] w-auto h-auto object-contain drop-shadow-[0_20px_45px_rgba(0,0,0,0.9)] select-none transition-transform duration-300 animate-in zoom-in-95"
                />
              </div>

              {/* Footer inside Zoom Box */}
              <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-border/40 text-xs">
                <div className="text-center sm:text-left">
                  <p className="font-bold text-white text-sm line-clamp-1">
                    {currentTab === "cladding" ? hoveredZoomItem.code : hoveredZoomItem.name}
                  </p>
                  <p className="text-amber-400 font-medium text-xs">
                    {currentTab === "cladding"
                      ? hoveredZoomItem.details
                      : `${hoveredZoomItem.details}${hoveredZoomItem.sizes ? ` · ${hoveredZoomItem.sizes}` : ""}`}
                  </p>
                </div>
                <p className="text-[11px] text-muted-foreground italic">
                  {lang === "gu"
                    ? "વિગતવાર સ્પેક્સ માટે કાર્ડ પર ક્લિક કરો"
                    : lang === "hi"
                      ? "विस्तृत विनिर्देश हेतु कार्ड पर क्लिक करें"
                      : "Click card for full specifications & estimate"}
                </p>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

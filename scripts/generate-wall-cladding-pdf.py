#!/usr/bin/env python3
"""
scripts/generate-wall-cladding-pdf.py

Syncs product order and rotations directly from the live CMS (Supabase / site-settings),
updates local catalog JSON & default catalog order, and compiles high-end luxury
architectural catalog PDFs in English, Hindi, and Gujarati:
  - public/catalogues/StoneTech_NaturalStone_WallCl_Options_English.pdf
  - public/catalogues/StoneTech_NaturalStone_WallCl_Options_Hindi.pdf
  - public/catalogues/StoneTech_NaturalStone_WallCl_Options_Gujarati.pdf
  - public/catalogues/StoneTech_NaturalStone_WallCl_Options_26-27.pdf (English mirror)
  - public/catalogues/stos-wall-cladding-catalogue-2026.pdf (English mirror)

Features:
  - Multilingual Typography: Native Kohinoor Devanagari (Hindi), Kohinoor Gujarati (Gujarati),
    and Optima / Avenir Next (English), rendered via headless Chrome for 100% authentic
    complex Indic text shaping (zero broken matras/conjuncts) and sharp vector output.
  - Strict CMS Order & Dynamic Sequential Codes: ST-WC-001 through ST-WC-275+.
  - Live Rotations: Automatically applies custom 90°/180°/270° rotations configured in CMS.
  - Balanced Card Frame: Maximizes photo display area (~80% of card) without awkward gaps.
  - WhatsApp Safe: Optimized to stay strictly under 25 MiB.
"""

import json
import math
import os
import re
import shutil
import subprocess
import time
import urllib.request
from PIL import Image

PAGE_WIDTH_MM = 210
PAGE_HEIGHT_MM = 297

CHAPTER_CONFIG = [
    {
        "name": "3D Pyramid & Faceted Origami Relief",
        "short": "3D PYRAMID & FACETED ORIGAMI",
        "desc": "High-relief faceted origami, 3D pyramids, isometric blocks & geometric prisms",
    },
    {
        "name": "Crazy China, Slender Needle Strips & Natural Flagstone",
        "short": "CRAZY CHINA & SLENDER STRIP MOSAICS",
        "desc": "Dense thin needle strips, random polygonal flagstone & rustic multi-tone slate strips",
    },
    {
        "name": "Staggered Multi-Level Plank & Strip Ledgestone",
        "short": "STAGGERED PLANKS & STRIP LEDGESTONE",
        "desc": "Stepped interlocking Z-ledgers, staggered rockface planks & deep cleft split-face stone",
    },
    {
        "name": "Chevron, Herringbone & Diagonal Fluted Parquet",
        "short": "CHEVRON & DIAGONAL PARQUET",
        "desc": "4-quadrant diamond chevrons, diagonal grooved fluting & interlocking parquet tiles",
    },
    {
        "name": "Modular Ashlar, Mondrian Grid & Beveled Blocks",
        "short": "MODULAR ASHLAR & BEVELED BLOCKS",
        "desc": "Multi-size ashlar blocks, chamfered grid joints, chiseled pillow borders & pinwheels",
    },
    {
        "name": "Fluid Waves, Dune Ripples & Kinetic Scoops",
        "short": "FLUID WAVES & KINETIC RIPPLES",
        "desc": "Continuous CNC water-wave ripples, flowing river dunes & kinetic concave scoops",
    },
    {
        "name": "Circular Motifs, Sunburst Chakras & Pebble Mosaics",
        "short": "CIRCULAR MOTIFS & PEBBLE MOSAICS",
        "desc": "Circular sunburst chakras, floral medallions, spiral vortexes & coin pebble sheets",
    },
    {
        "name": "Architectural Relief Murals, Royal Jharokha & Carved Flora",
        "short": "ARCHITECTURAL MURALS & CARVED FLORA",
        "desc": "Traditional haveli jharokha arches, carved lotus/rose blooms, kalpavriksha & sacred murals",
    },
]

CHAPTER_TRANSLATIONS = {
    "en": {
        "3D Pyramid & Faceted Origami Relief": "3D PYRAMID & FACETED ORIGAMI",
        "Crazy China, Slender Needle Strips & Natural Flagstone": "CRAZY CHINA & SLENDER STRIPS",
        "Staggered Multi-Level Plank & Strip Ledgestone": "STAGGERED PLANKS & LEDGESTONE",
        "Chevron, Herringbone & Diagonal Fluted Parquet": "CHEVRON & DIAGONAL PARQUET",
        "Modular Ashlar, Mondrian Grid & Beveled Blocks": "MODULAR ASHLAR & BLOCKS",
        "Fluid Waves, Dune Ripples & Kinetic Scoops": "FLUID WAVES & KINETIC RIPPLES",
        "Circular Motifs, Sunburst Chakras & Pebble Mosaics": "CIRCULAR MOTIFS & PEBBLES",
        "Architectural Relief Murals, Royal Jharokha & Carved Flora": "ARCHITECTURAL MURALS & FLORA",
    },
    "hi": {
        "3D Pyramid & Faceted Origami Relief": "३D पिरामिड एवं ओरिगेमी",
        "Crazy China, Slender Needle Strips & Natural Flagstone": "क्रेज़ी चाइना एवं स्प्लेंडर स्ट्रिप्स",
        "Staggered Multi-Level Plank & Strip Ledgestone": "मल्टी-लेवल प्लैंक एवं लेजस्टोन",
        "Chevron, Herringbone & Diagonal Fluted Parquet": "शेवरॉन एवं डायगोनल परकेट",
        "Modular Ashlar, Mondrian Grid & Beveled Blocks": "मॉड्यूलर ऐशलर एवं बेवेल्ड ब्लॉक्स",
        "Fluid Waves, Dune Ripples & Kinetic Scoops": "फ्लुइड वेव्स एवं रिपल्स",
        "Circular Motifs, Sunburst Chakras & Pebble Mosaics": "सर्कुलर मोटिफ्स एवं पेबल मोज़ेक",
        "Architectural Relief Murals, Royal Jharokha & Carved Flora": "आर्किटेक्चरल म्यूरल्स एवं झरोखा",
    },
    "gu": {
        "3D Pyramid & Faceted Origami Relief": "૩D પિરામિડ અને ઓરિગેમી",
        "Crazy China, Slender Needle Strips & Natural Flagstone": "ક્રેઝી ચાઇના અને સ્લેન્ડર સ્ટ્રિપ્સ",
        "Staggered Multi-Level Plank & Strip Ledgestone": "મલ્ટી-લેવલ પ્લેન્ક અને લેજસ્ટોન",
        "Chevron, Herringbone & Diagonal Fluted Parquet": "શેવરોન અને ડાયગોનલ પરકેટ",
        "Modular Ashlar, Mondrian Grid & Beveled Blocks": "મોડ્યુલર એશલર અને બેવેલ્ડ બ્લોક્સ",
        "Fluid Waves, Dune Ripples & Kinetic Scoops": "ફ્લુઇડ વેવ્ઝ અને રિપલ્સ",
        "Circular Motifs, Sunburst Chakras & Pebble Mosaics": "સર્ક્યુલર મોટીફ્સ અને પેબલ મોઝેઇક",
        "Architectural Relief Murals, Royal Jharokha & Carved Flora": "આર્કિટેક્ચરલ મ્યુરલ્સ અને ઝરૂખો",
    },
}

def to_indic(val, lang="en"):
    s = str(val)
    if lang == "hi":
        return s.translate(str.maketrans("0123456789", "०१२३४५६७८९"))
    elif lang == "gu":
        return s.translate(str.maketrans("0123456789", "૦૧૨૩૪૫૬૭૮૯"))
    return s

PDF_I18N = {
    "en": {
        "font_family": "-apple-system, BlinkMacSystemFont, 'Avenir Next', Optima, 'Segoe UI', Roboto, sans-serif",
        "brand_title": "STONE TECH ATELIER",
        "brand_subtitle": "ARCHITECTURAL STONE FABRICATORS & CRAFTSMEN",
        "cover_title": "NATURAL STONE WALL CLADDING",
        "cover_title2": "PRODUCTS OPTIONS",
        "cover_year": "2026 – 2027 COLLECTION",
        "cover_tagline1": "Curated Portfolio of {count} Precision-Fabricated Surfaces & 3D Architectural Textures",
        "cover_tagline2": "Quarry-Direct Natural Sandstone, Marble, Slate, Granite & Basalt Claddings",
        "box_title": "ARCHITECTURAL EXCELLENCE & FABRICATION CAPABILITIES",
        "pillars": [
            ("01.", "PRECISION CNC & ARTISANAL CRAFTSMANSHIP", "Advanced multi-axis CNC surface profiling, diamond fluting, and traditional Rajasthani stone hand-chiseling."),
            ("02.", "AUTHENTIC QUARRY-DIRECT GEOLOGY", "Direct sourcing from certified quarries across Rajasthan and Gujarat: Mint Sandstone, Teakwood, Agra Red, Dholpur, and Marbles."),
            ("03.", "FULL PRE-DISPATCH DRY-LAY APPROVAL", "Every order undergoes a complete pre-dispatch dry-lay mockup with high-resolution photo and video approval prior to packing."),
            ("04.", "HEAVY-DUTY SEAWORTHY EXPORT CRATING", "ISPM-15 heat-treated fumigated wooden crates with EPE foam interleaving and corner protectors for damage-free transit."),
        ],
        "exp_title": "STONE TECH EXPERIENCE CENTER · AHMEDABAD",
        "exp_addr": "E-02, Ground Floor, SG Business Hub, Vasant Nagar, Gota, Ahmedabad, Gujarat 380060",
        "exp_contact": "Direct WhatsApp Lines: +91 77420 90866 / +91 97844 52998",
        "exp_email": "Email: info@stonetech.in · Website: www.stonetech.in",
        "cover_meta": "Softcopy Edition · StoneTech_NaturalStone_WallCl_Options_English.pdf",

        "header_brand": "STONE TECH ATELIER",
        "header_sub": "·  WALL CLADDING OPTIONS 2026-27",
        "header_badge_default": "ARCHITECTURAL COLLECTION",
        "footer_addr": "Experience Center: E-02, SG Business Hub, Gota, Ahmedabad · WhatsApp: +91 77420 90866 / +91 97844 52998 · www.stonetech.in",
        "page_x_of_y": "Page {page} of {total}",

        "card_code_label": "CODE:",
        "card_inquire_label": "Inquire: ",
        "card_phone": "+91 77420 90866",

        "back_title": "STONE TECH ATELIER",
        "back_sub": "ARCHITECTURAL STONE CLADDING & BESPOKE FABRICATION",
        "order_heading": "HOW TO PLACE AN ORDER / SAMPLE REQUEST",
        "order_steps": [
            "1. Note Product Code: Simply share the ST-WC-XXX code shown on any catalog page.",
            "2. Send Elevation Details: Forward required elevation area (sq.ft), CAD, or site photos.",
            "3. Dry-Lay Approval: Full pre-dispatch dry-lay mockup photos shared prior to crating.",
            "4. Logistics & Delivery: Direct insured transport to site across India or seaworthy container crating for export.",
        ],
        "pack_heading": "EXPORT PACKAGING & QUALITY ASSURANCE",
        "pack_bullets": [
            "• Fumigated Wooden Crates: ISPM-15 heat-treated solid pine / hardwood export crates.",
            "• Shock Absorption: Polyethylene foam interleaving between carved stone faces.",
            "• Edge Protection: Heavy-duty plastic corner guards and reinforced steel banding.",
            "• Moisture Defense: VCI waterproof barrier and shrink-wrapped pallet cover.",
            "• Calibration: Thickness calibrated within +/- 1.5mm; squareness verified with precision calipers.",
        ],
        "visit_heading": "VISIT OUR EXPERIENCE CENTER & STUDIO",
        "visit_brand": "STONE TECH EXPERIENCE CENTER",
        "studio_hours": "Studio Hours: Monday – Saturday, 10:00 AM – 7:30 PM · Port of Export Dispatch: Mundra / JNPT",
        "copyright": "© 2026 Stone Tech OS / Stone Tech Atelier. All Rights Reserved.",
    },
    "hi": {
        "font_family": "-apple-system, BlinkMacSystemFont, 'Kohinoor Devanagari', 'Noto Sans Devanagari', 'Mangal', sans-serif",
        "brand_title": "स्टोन टेक अटेलियर",
        "brand_subtitle": "आर्किटेक्चरल स्टोन फैब्रिकेटर्स एवं शिल्पी",
        "cover_title": "प्राकृतिक पत्थर वॉल क्लैडिंग",
        "cover_title2": "उत्पाद विकल्प एवं डिज़ाइन्स",
        "cover_year": "२०२६ – २०२७ संग्रह",
        "cover_tagline1": "{count} सटीक-निर्मित सतहों और ३D आर्किटेक्चरल टेक्सचर्स का विशेष संग्रह",
        "cover_tagline2": "सीधी खदान से प्राकृतिक बलुआ पत्थर, संगमरमर, स्लेट, ग्रेनाइट और बेसाल्ट क्लैडिंग",
        "box_title": "आर्किटेक्चरल उत्कृष्टता एवं निर्माण क्षमताएं",
        "pillars": [
            ("०१.", "सटीक सीएनसी एवं पारंपरिक शिल्पकला", "उन्नत मल्टी-एक्सिस सीएनसी सरफेस प्रोफाइलिंग, डायमंड फ्लूटिंग एवं पारंपरिक राजस्थानी हाथ की नक्काशी।"),
            ("०२.", "प्रमाणित सीधी खदान भूविज्ञान", "राजस्थान और गुजरात की प्रमाणित खदानों से सीधी आपूर्ति: मिंट सैंडस्टोन, टीकवुड, आगरा रेड, धौलपुर और मार्बल।"),
            ("०३.", "डिस्पैच पूर्व संपूर्ण ड्राई-ले अनुमोदन", "पैकिंग से पूर्व प्रत्येक ऑर्डर का उच्च-रिज़ॉल्यूशन फोटो एवं वीडियो अनुमोदन के साथ संपूर्ण ड्राई-ले मॉकअप।"),
            ("०४.", "हेवी-ड्यूटी सुरक्षित निर्यात क्रेटिंग", "सुरक्षित पारगमन हेतु EPE फोम और कॉर्नर प्रोटेक्टर युक्त ISPM-15 हीट-ट्रीटेड लकड़ी के मजबूत क्रेट।"),
        ],
        "exp_title": "स्टोन टेक एक्सपीरियंस सेंटर · अहमदाबाद",
        "exp_addr": "ई-०२, ग्राउंड फ्लोर, एसजी बिजनेस हब, वसंत नगर, गोता, अहमदाबाद, गुजरात ३८००६०",
        "exp_contact": "सीधी व्हाट्सएप हेल्पलाइन: +९१ ७७४२० ९०८६६ / +९१ ९७८४४ ५२९९८",
        "exp_email": "ईमेल: info@stonetech.in · वेबसाइट: www.stonetech.in",
        "cover_meta": "सॉफ्टकॉपी संस्करण · StoneTech_NaturalStone_WallCl_Options_Hindi.pdf",

        "header_brand": "स्टोन टेक अटेलियर",
        "header_sub": "·  वॉल क्लैडिंग विकल्प २०२६-२७",
        "header_badge_default": "आर्किटेक्चरल संग्रह",
        "footer_addr": "एक्सपीरियंस सेंटर: ई-०२, एसजी बिजनेस हब, गोता, अहमदाबाद · व्हाट्सएप: +९१ ७७४२० ९०८६६ · www.stonetech.in",
        "page_x_of_y": "पेज {page} / {total}",

        "card_code_label": "कोड:",
        "card_inquire_label": "पूछताछ: ",
        "card_phone": "+९१ ७७४२० ९०८६६",

        "back_title": "स्टोन टेक अटेलियर",
        "back_sub": "आर्किटेक्चरल स्टोन क्लैडिंग एवं कस्टम निर्माण",
        "order_heading": "ऑर्डर / सैंपल अनुरोध प्रक्रिया",
        "order_steps": [
            "१. प्रोडक्ट कोड नोट करें: कैटलॉग पेज पर दर्शाया गया ST-WC-XXX कोड हमें साझा करें।",
            "२. एलिवेशन विवरण भेजें: आवश्यक क्षेत्रफल (वर्ग फुट), सीएडी (CAD) ड्रॉइंग या साइट फोटो साझा करें।",
            "३. ड्राई-ले अनुमोदन: क्रेटिंग व डिस्पैच से पूर्व संपूर्ण ड्राई-ले मॉकअप फोटो/वीडियो साझा किए जाते हैं।",
            "४. सुरक्षित डिलीवरी: संपूर्ण भारत में साइट तक सीधी बीमित डिलीवरी अथवा विदेशी निर्यात हेतु सी-वर्दी क्रेटिंग।",
        ],
        "pack_heading": "निर्यात पैकेजिंग एवं गुणवत्ता आश्वासन",
        "pack_bullets": [
            "• धूमीकृत लकड़ी के क्रेट: ISPM-15 हीट-ट्रीटेड ठोस पाइन / हार्डवुड निर्यात क्रेट।",
            "• शॉक अवशोषण: नक्काशीदार पत्थर की सतहों के बीच पॉलीइथाइलीन फोम इंटरलीविंग।",
            "• किनारों की सुरक्षा: हेवी-ड्यूटी प्लास्टिक कॉर्नर गार्ड्स एवं मजबूत स्टील स्ट्रैपिंग।",
            "• नमी से सुरक्षा: VCI वाटरप्रूफ बैरियर एवं श्रिंक-रैप्ड पैलेट कवरिंग।",
            "• परिशुद्ध कैलिब्रेशन: मोटाई ±1.5mm तक कैलिब्रेटेड; प्रिसिजन कैलिपर्स द्वारा गुनिया सत्यापन।",
        ],
        "visit_heading": "हमारे एक्सपीरियंस सेंटर एवं स्टूडियो पधारें",
        "visit_brand": "स्टोन टेक एक्सपीरियंस सेंटर",
        "studio_hours": "स्टूडियो समय: सोमवार – शनिवार, प्रातः १०:०० बजे से सायं ७:३० बजे तक · निर्यात बंदरगाह: मुंद्रा / जेएनपीटी",
        "copyright": "© २०२६ स्टोन टेक ओएस / स्टोन टेक अटेलियर. सर्वाधिकार सुरक्षित.",
    },
    "gu": {
        "font_family": "-apple-system, BlinkMacSystemFont, 'Kohinoor Gujarati', 'Noto Sans Gujarati', 'Shruti', sans-serif",
        "brand_title": "સ્ટોન ટેક એટેલિયર",
        "brand_subtitle": "આર્કિટેક્ચરલ સ્ટોન ફેબ્રિકેટર્સ અને કારીગરો",
        "cover_title": "કુદરતી પથ્થર વોલ ક્લેડિંગ",
        "cover_title2": "ઉત્પાદન વિકલ્પો અને ડિઝાઇન્સ",
        "cover_year": "૨૦૨૬ – ૨૦૨૭ સંગ્રહ",
        "cover_tagline1": "{count} સચોટ-નિર્મિત સપાટીઓ અને ૩D આર્કિટેક્ચરલ ટેક્સચર્સનો વિશેષ સંગ્રહ",
        "cover_tagline2": "સીધા ક્વોરીમાંથી કુદરતી સેન્ડસ્ટોન, માર્બલ, સ્લેટ, ગ્રેનાઈટ અને બેસાલ્ટ ક્લેડિંગ",
        "box_title": "આર્કિટેક્ચરલ શ્રેષ્ઠતા અને ઉત્પાદન ક્ષમતાઓ",
        "pillars": [
            ("૦૧.", "સચોટ CNC અને પરંપરાગત કારીગરી", "અદ્યતન મલ્ટી-એક્સિસ CNC સરફેસ પ્રોફાઇલિંગ, ડાયમંડ ફ્લુટિંગ અને પરંપરાગત રાજસ્થાની હાથેથી નકશીકામ."),
            ("૦૨.", "પ્રમાણિત સીધા ક્વોરી સ્ત્રોત", "રાજસ્થાન અને ગુજરાતની પ્રમાણિત ક્વોરીમાંથી સીધો પુરવઠો: મિન્ટ સેન્ડસ્ટોન, ટીકવુડ, આગ્રા રેડ, ધોળપુર અને માર્બલ."),
            ("૦૩.", "ડિસ્પેચ પહેલાં સંપૂર્ણ ડ્રાય-લે મંજૂરી", "પેકિંગ પહેલાં દરેક ઓર્ડરનું ઉચ્ચ-રિઝોલ્યુશન ફોટો અને વિડિયો મંજૂરી સાથે સંપૂર્ણ ડ્રાય-લે મોકઅપ."),
            ("૦૪.", "હેવી-ડ્યુટી સુરક્ષિત નિકાસ ક્રેટીંગ", "સુરક્ષિત પરિવહન માટે EPE ફોમ અને કોર્નર પ્રોટેક્ટર સાથે ISPM-15 હીટ-ટ્રીટેડ લાકડાના મજબૂત ક્રેટ."),
        ],
        "exp_title": "સ્ટોન ટેક એક્સપિરિયન્સ સેન્ટર · અમદાવાદ",
        "exp_addr": "ઇ-૦૨, ગ્રાઉન્ડ ફ્લોર, એસજી બિઝનેસ હબ, વસંત નગર, ગોતા, અમદાવાદ, ગુજરાત ૩૮૦૦૬૦",
        "exp_contact": "સીધી વ્હોટ્સએપ હેલ્પલાઇન: +૯૧ ૭૭૪૨૦ ૯૦૮૬૬ / +૯૧ ૯૭૮૪૪ ૫૨૯૯૮",
        "exp_email": "ઇમેઇલ: info@stonetech.in · વેબસાઇટ: www.stonetech.in",
        "cover_meta": "સોફ્ટકોપી આવૃત્તિ · StoneTech_NaturalStone_WallCl_Options_Gujarati.pdf",

        "header_brand": "સ્ટોન ટેક એટેલિયર",
        "header_sub": "·  વોલ ક્લેડિંગ વિકલ્પો ૨૦૨૬-૨૭",
        "header_badge_default": "આર્કિટેક્ચરલ સંગ્રહ",
        "footer_addr": "એક્સપિરિયન્સ સેન્ટર: ઇ-૦૨, એસજી બિઝનેસ હબ, ગોતા, અમદાવાદ · વ્હોટ્સએપ: +૯૧ ૭૭૪૨૦ ૯૦૮૬૬ · www.stonetech.in",
        "page_x_of_y": "પેજ {page} / {total}",

        "card_code_label": "કોડ:",
        "card_inquire_label": "પૂછપરછ: ",
        "card_phone": "+૯૧ ૭૭૪૨૦ ૯૦૮૬૬",

        "back_title": "સ્ટોન ટેક એટેલિયર",
        "back_sub": "આર્કિટેક્ચરલ સ્ટોન ક્લેડિંગ અને બેસ્પોક ફેબ્રિકેશન",
        "order_heading": "ઓર્ડર / સેમ્પલ પૂછપરછ પ્રક્રિયા",
        "order_steps": [
            "૧. પ્રોડક્ટ કોડ નોંધો: કેટલોગ પેજ પર દર્શાવેલ ST-WC-XXX કોડ અમને મોકલો.",
            "૨. એલિવેશન વિગતો મોકલો: જરૂરી એરિયા (ચોરસ ફૂટ), CAD ડ્રોઇંગ અથવા સાઇટ ફોટો મોકલો.",
            "૩. ડ્રાય-લે મંજૂરી: ક્રેટિંગ અને ડિસ્પેચ પહેલાં સંપૂર્ણ ડ્રાય-લે મોકઅપ ફોટા/વિડિયો મોકલવામાં આવે છે.",
            "૪. સુરક્ષિત ડિલિવરી: સમગ્ર ભારતમાં સાઇટ સુધી સીધું વીમાકૃત ટ્રાન્સપોર્ટ અથવા નિકાસ માટે સી-વર્ધી કન્ટેનર ક્રેટિંગ.",
        ],
        "pack_heading": "નિકાસ પેકેજિંગ અને ગુણવત્તા ખાતરી",
        "pack_bullets": [
            "• ફ્યુમિગેટેડ લાકડાના ક્રેટ: ISPM-15 હીટ-ટ્રીટેડ સોલિડ પાઇન / હાર્ડવુડ નિકાસ ક્રેટ.",
            "• શોક એબ્સોર્પ્શન: કોતરણીવાળી પથ્થરની સપાટીઓ વચ્ચે પોલિઇથિલિન ફોમ લેયરિંગ.",
            "• કિનારીઓની સુરક્ષા: હેવી-ડ્યુટી પ્લાસ્ટિક કોર્નર ગાર્ડ્સ અને મજબૂત સ્ટીલ સ્ટ્રેપિંગ.",
            "• ભેજ સામે રક્ષણ: VCI વોટરપ્રૂફ બેરિયર અને શ્રિંક-રેપ્ડ પેલેટ કવરિંગ.",
            "• સચોટ કેલિબ્રેશન: જાડાઈ ±1.5mm સુધી કેલિબ્રેટેડ; પ્રિસિઝન કેલિપર્સ દ્વારા ખૂણા ચકાસણી.",
        ],
        "visit_heading": "અમારા એક્સપિરિયન્સ સેન્ટર અને સ્ટુડિયોની મુલાકાત લો",
        "visit_brand": "સ્ટોન ટેક એક્સપિરિયન્સ સેન્ટર",
        "studio_hours": "સ્ટુડિયો સમય: સોમવાર – શનિવાર, સવારે ૧૦:૦૦ થી સાંજે ૭:૩૦ વાગ્યા સુધી · નિકાસ બંદર: મુન્દ્રા / JNPT",
        "copyright": "© ૨૦૨૬ સ્ટોન ટેક ઓએસ / સ્ટોન ટેક એટેલિયર. સર્વાધિકાર સુરક્ષિત.",
    },
}

def get_chapter(item):
    pid = item.get("id", "")
    name = (item.get("name") or "").lower()

    if pid in ["ST-WC-262", "ST-WC-263", "ST-WC-264", "ST-WC-265", "ST-WC-243", "ST-WC-164", "ST-WC-195", "ST-WC-049", "ST-WC-046", "ST-WC-070"]:
        return "Chevron, Herringbone & Diagonal Fluted Parquet"
    if any(k in name for k in ["chevron", "parquet", "herringbone", "diagonal combed", "diagonal micro-fluted"]):
        return "Chevron, Herringbone & Diagonal Fluted Parquet"

    if pid in [
        "ST-WC-001", "ST-WC-002", "ST-WC-003", "ST-WC-004", "ST-WC-005", "ST-WC-006", "ST-WC-011", "ST-WC-012", 
        "ST-WC-013", "ST-WC-069", "ST-WC-075", "ST-WC-076", "ST-WC-137", "ST-WC-157", "ST-WC-172", "ST-WC-196",
        "ST-WC-249", "ST-WC-256", "ST-WC-266", "ST-WC-267", "ST-WC-275", "ST-WC-281", "ST-WC-282"
    ]:
        return "3D Pyramid & Faceted Origami Relief"
    if any(k in name for k in ["origami", "pyramid", "faceted", "isometric", "prism", "starburst", "pitched mosaic", "four-point faceted"]):
        return "3D Pyramid & Faceted Origami Relief"

    if pid in [
        "ST-WC-007", "ST-WC-008", "ST-WC-014", "ST-WC-066", "ST-WC-067", "ST-WC-068", "ST-WC-071", "ST-WC-120",
        "ST-WC-132", "ST-WC-203", "ST-WC-204", "ST-WC-209", "ST-WC-210", "ST-WC-219", "ST-WC-222", "ST-WC-232",
        "ST-WC-233", "ST-WC-237", "ST-WC-245", "ST-WC-251", "ST-WC-253", "ST-WC-271"
    ]:
        return "Circular Motifs, Sunburst Chakras & Pebble Mosaics"
    if any(k in name for k in ["sunburst", "chakra", "rosette", "spiral", "vortex", "pebble", "circular", "radial fan", "quatrefoil", "kolam rangoli", "quarter-circle", "quarter circle"]):
        return "Circular Motifs, Sunburst Chakras & Pebble Mosaics"

    if pid in [
        "ST-WC-145", "ST-WC-152", "ST-WC-173", "ST-WC-179", "ST-WC-182", "ST-WC-201", "ST-WC-215", "ST-WC-220",
        "ST-WC-234", "ST-WC-235", "ST-WC-241", "ST-WC-255", "ST-WC-260"
    ]:
        return "Fluid Waves, Dune Ripples & Kinetic Scoops"
    if any(k in name for k in ["river wave", "water-wave", "concave scoop", "kinetic fluted", "ripple", "fluted reed", "reeded", "sawn ripple"]):
        return "Fluid Waves, Dune Ripples & Kinetic Scoops"

    if pid in [
        "ST-WC-023", "ST-WC-030", "ST-WC-031", "ST-WC-033", "ST-WC-035", "ST-WC-036", "ST-WC-037", "ST-WC-038",
        "ST-WC-054", "ST-WC-059", "ST-WC-133", "ST-WC-134", "ST-WC-148", "ST-WC-151", "ST-WC-183", "ST-WC-188",
        "ST-WC-190", "ST-WC-193", "ST-WC-194", "ST-WC-202", "ST-WC-205", "ST-WC-206", "ST-WC-207", "ST-WC-208",
        "ST-WC-218", "ST-WC-221", "ST-WC-223", "ST-WC-224", "ST-WC-225", "ST-WC-226", "ST-WC-227", "ST-WC-231",
        "ST-WC-236", "ST-WC-240", "ST-WC-242", "ST-WC-244", "ST-WC-246", "ST-WC-247", "ST-WC-248", "ST-WC-250",
        "ST-WC-252", "ST-WC-254", "ST-WC-257", "ST-WC-259", "ST-WC-261"
    ]:
        return "Architectural Relief Murals, Royal Jharokha & Carved Flora"
    if any(k in name for k in ["mural", "jharokha", "buddha", "lotus", "rose bloom", "rose blossom", "monstera", "kalpavriksha", "acanthus", "palmette", "tulip", "hieroglyph", "haveli", "shankh", "arabesque", "pisces", "nautilus", "butterfly", "palm leaf", "fern", "tree of life"]):
        return "Architectural Relief Murals, Royal Jharokha & Carved Flora"

    if pid in [
        "ST-WC-053", "ST-WC-081", "ST-WC-103", "ST-WC-104", "ST-WC-105", "ST-WC-106", "ST-WC-107", "ST-WC-108",
        "ST-WC-109", "ST-WC-121", "ST-WC-122", "ST-WC-123", "ST-WC-125", "ST-WC-127", "ST-WC-131", "ST-WC-135",
        "ST-WC-136", "ST-WC-142", "ST-WC-143", "ST-WC-150", "ST-WC-158", "ST-WC-161", "ST-WC-162", "ST-WC-163",
        "ST-WC-238", "ST-WC-258", "ST-WC-272", "ST-WC-274", "ST-WC-277", "ST-WC-280"
    ]:
        return "Crazy China, Slender Needle Strips & Natural Flagstone"
    if any(k in name for k in ["crazy", "needle", "micro-linear", "polygonal", "flagstone", "fieldstone", "slim strip", "slim ledger", "slim linear", "timber rustic"]):
        return "Crazy China, Slender Needle Strips & Natural Flagstone"

    if pid in [
        "ST-WC-055", "ST-WC-078", "ST-WC-141", "ST-WC-144", "ST-WC-146", "ST-WC-153", "ST-WC-154", "ST-WC-155",
        "ST-WC-156", "ST-WC-159", "ST-WC-160", "ST-WC-169", "ST-WC-177", "ST-WC-181", "ST-WC-268", "ST-WC-273", "ST-WC-284"
    ]:
        return "Staggered Multi-Level Plank & Strip Ledgestone"
    if any(k in name for k in ["staggered", "plank", "split-face ledger", "splitface ledger", "cleft ledger", "stacked ledger", "rockface plank", "splitface brick"]):
        return "Staggered Multi-Level Plank & Strip Ledgestone"

    return "Modular Ashlar, Mondrian Grid & Beveled Blocks"


def get_chrome_executable():
    for env_var in ["CHROME_BIN", "GOOGLE_CHROME_BIN", "PUPPETEER_EXECUTABLE_PATH"]:
        val = os.environ.get(env_var)
        if val and os.path.exists(val):
            return val
    
    candidates = [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
        "/usr/bin/google-chrome",
        "/usr/bin/google-chrome-stable",
        "/usr/bin/chromium-browser",
        "/usr/bin/chromium",
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    
    for name in ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"]:
        w = shutil.which(name)
        if w:
            return w
    return None


def build_catalog_order_and_items():
    print("Reading src/data/wall-cladding-catalog.json...")
    with open("src/data/wall-cladding-catalog.json", "r") as f:
        local_items = json.load(f)
    local_map = {item["id"]: dict(item) for item in local_items}
    print(f"Loaded {len(local_items)} local items.")

    print("Fetching live CMS order & rotations from Supabase site-settings...")
    try:
        req = urllib.request.Request(
            "https://stonetech.in/api/public/site-settings",
            headers={"User-Agent": "Mozilla/5.0"},
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            site_data = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"Warning: Could not fetch remote site-settings ({e}); using local data.")
        site_data = {}

    order = site_data.get("website_catalog_order", [])
    custom_items = site_data.get("website_catalog_items", [])
    deleted_ids = set(site_data.get("website_deleted_product_ids", []))

    for c in custom_items:
        cid = c.get("id")
        if cid in local_map:
            local_map[cid].update({k: v for k, v in c.items() if v is not None})
        else:
            local_map[cid] = dict(c)

    sorted_items = []
    seen = set()
    for pid in order:
        if pid in local_map and pid not in seen and pid not in deleted_ids:
            sorted_items.append(local_map[pid])
            seen.add(pid)

    for pid, item in local_map.items():
        if pid not in seen and pid not in deleted_ids:
            sorted_items.append(item)
            seen.add(pid)

    reordered_catalog = []
    all_order_ids = []
    chapter_counts = {cfg["name"]: 0 for cfg in CHAPTER_CONFIG}

    for idx, item in enumerate(sorted_items):
        seq_idx = idx + 1
        seq_code = f"ST-WC-{seq_idx:03d}"
        item_copy = dict(item)
        item_copy["index"] = seq_idx
        item_copy["code"] = seq_code
        ch_name = get_chapter(item_copy)
        item_copy["patternCategory"] = ch_name
        chapter_counts[ch_name] = chapter_counts.get(ch_name, 0) + 1
        reordered_catalog.append(item_copy)
        all_order_ids.append(item["id"])

    print(f"Saving {len(reordered_catalog)} sequentially ordered items to catalog JSON...")
    with open("src/data/wall-cladding-catalog.json", "w") as f:
        json.dump(reordered_catalog, f, indent=2)

    types_path = "src/lib/site-settings/types.ts"
    with open(types_path, "r") as f:
        types_content = f.read()

    order_str = "export const DEFAULT_WEBSITE_CATALOG_ORDER: string[] = [\n"
    for pid in all_order_ids:
        order_str += f'  "{pid}",\n'
    order_str += "];"

    pattern = r"export const DEFAULT_WEBSITE_CATALOG_ORDER: string\[\] = \[[\s\S]*?\];"
    new_types_content = re.sub(pattern, order_str, types_content)
    with open(types_path, "w") as f:
        f.write(new_types_content)

    return reordered_catalog


def preload_thumbnails(catalog, thumb_dir="/tmp/catalog_thumbs"):
    print("Pre-rendering & caching rotated product thumbnails...")
    os.makedirs(thumb_dir, exist_ok=True)
    count = 0
    for item in catalog:
        code = item.get("code") or item["id"]
        out_path = os.path.join(thumb_dir, f"{code}.jpg")
        photo_path = "public" + item.get("image", "")
        if os.path.exists(photo_path):
            try:
                with Image.open(photo_path) as pimg:
                    if pimg.mode != "RGB":
                        pimg = pimg.convert("RGB")
                    rot = item.get("rotation", 0) % 360
                    if rot == 90:
                        pimg = pimg.transpose(Image.Transpose.ROTATE_270)
                    elif rot == 180:
                        pimg = pimg.transpose(Image.Transpose.ROTATE_180)
                    elif rot == 270:
                        pimg = pimg.transpose(Image.Transpose.ROTATE_90)

                    pimg.thumbnail((580, 580), Image.Resampling.LANCZOS)
                    pimg.save(out_path, quality=75, optimize=True)
                    count += 1
            except Exception:
                pass
    print(f"Preloaded {count} thumbnails to {thumb_dir}.")


def generate_html_document(lang, catalog, logo_path, thumb_dir):
    t = PDF_I18N.get(lang, PDF_I18N["en"])
    font_fam = t["font_family"]

    chunks = [catalog[i : i + 4] for i in range(0, len(catalog), 4)]
    total_pages = 1 + len(chunks) + 1

    cat_count_str = to_indic(len(catalog), lang)
    tag1_text = t["cover_tagline1"].format(count=cat_count_str)

    repo_dir = os.path.abspath(".")
    hi_font_path = os.path.join(repo_dir, "scripts/fonts/NotoSansDevanagari-Regular.ttf")
    gu_font_path = os.path.join(repo_dir, "scripts/fonts/NotoSansGujarati-Regular.ttf")

    html_parts = []
    html_parts.append(f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
@page {{ size: 210mm 297mm; margin: 0; }}
* {{ box-sizing: border-box; }}
@font-face {{
  font-family: 'CatalogHindiFont';
  src: url('file://{hi_font_path}');
}}
@font-face {{
  font-family: 'CatalogGujaratiFont';
  src: url('file://{gu_font_path}');
}}
body {{ margin: 0; font-family: {font_fam}, 'CatalogHindiFont', 'CatalogGujaratiFont'; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
.page {{
  width: 210mm;
  height: 297mm;
  max-height: 297mm;
  page-break-after: always;
  page-break-inside: avoid;
  break-inside: avoid;
  position: relative;
  box-sizing: border-box;
  overflow: hidden;
}}

/* Cover */
.cover {{ background: #0f172a; color: white; padding: 10mm; display: flex; flex-direction: column; justify-content: space-between; }}
.cover-border {{ border: 2px solid #d97706; height: 100%; position: relative; padding: 8mm 12mm; display: flex; flex-direction: column; justify-content: space-between; text-align: center; }}
.inner-border {{ position: absolute; inset: 2mm; border: 1px solid #f59e0b; pointer-events: none; }}
.medallion {{ width: 35mm; height: 30mm; background: white; border: 2px solid #d97706; border-radius: 6mm; margin: 0 auto; display: flex; align-items: center; justify-content: center; padding: 3mm; }}
.medallion img {{ max-width: 100%; max-height: 100%; object-fit: contain; }}
.brand {{ color: #f59e0b; font-size: 20pt; font-weight: 700; margin-top: 3mm; letter-spacing: 0.5px; }}
.sub {{ color: #94a3b8; font-size: 9pt; letter-spacing: 0.5px; margin-top: 1mm; }}
.line {{ width: 80mm; height: 1.5px; background: #d97706; margin: 2.5mm auto; }}
.title1 {{ font-size: 24pt; font-weight: 800; color: #ffffff; margin-top: 2mm; }}
.title2 {{ font-size: 20pt; font-weight: 700; color: #fbbf24; margin-top: 1mm; }}
.year {{ font-size: 14pt; font-weight: 700; color: #67e8f9; margin-top: 2mm; }}
.tag1 {{ font-size: 9.5pt; color: #f1f5f9; margin-top: 3mm; font-weight: 500; }}
.tag2 {{ font-size: 8pt; color: #94a3b8; margin-top: 1mm; }}

.cap-box {{ background: #1e293b; border: 1.5px solid #334155; border-radius: 4px; padding: 4mm 6mm; text-align: left; margin-top: 3mm; }}
.cap-title {{ color: #fbbf24; font-size: 9pt; font-weight: 700; text-align: center; }}
.cap-line {{ width: 60mm; height: 1px; background: #d97706; margin: 2mm auto 3mm auto; }}
.pillar-row {{ display: flex; gap: 8px; margin-bottom: 2mm; }}
.p-num {{ color: #fbbf24; font-weight: 700; font-size: 8.5pt; min-width: 6mm; }}
.p-head {{ color: #f1f5f9; font-weight: 700; font-size: 8pt; }}
.p-desc {{ color: #94a3b8; font-size: 7pt; margin-top: 0.5mm; }}

.exp-box {{ margin-top: 2mm; border-top: 1.5px solid #d97706; padding-top: 3mm; }}
.exp-title {{ color: #fbbf24; font-size: 12pt; font-weight: 700; }}
.exp-addr {{ color: #ffffff; font-size: 8pt; margin-top: 1mm; }}
.exp-contact {{ color: #67e8f9; font-size: 9pt; font-weight: 700; margin-top: 1mm; }}
.exp-email {{ color: #cbd5e1; font-size: 7.5pt; margin-top: 1mm; }}
.exp-meta {{ color: #64748b; font-size: 6.5pt; margin-top: 1.5mm; }}

/* Product Pages */
.prod-page {{
  padding: 6mm 10mm 5mm 10mm;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-sizing: border-box;
  overflow: hidden;
  page-break-inside: avoid;
  break-inside: avoid;
}}
.header {{
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 1.5mm;
  height: 8mm;
  flex-shrink: 0;
  box-sizing: border-box;
}}
.header-left {{
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 9.5pt;
  color: #0f172a;
}}
.header-left img {{
  height: 16px;
}}
.header-badge {{
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  color: #0e7490;
  font-size: 7.5pt;
  font-weight: 700;
  padding: 1.5px 6px;
  border-radius: 4px;
}}
.grid {{
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 129mm 129mm;
  gap: 5mm;
  height: 263mm;
  max-height: 263mm;
  padding: 2mm 0;
  box-sizing: border-box;
  overflow: hidden;
  flex: none;
}}
.card {{
  height: 129mm;
  max-height: 129mm;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 2mm;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  background: #fff;
  box-sizing: border-box;
  overflow: hidden;
}}
.photo-box {{
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  border-radius: 6px;
  height: 118mm;
  max-height: 118mm;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-sizing: border-box;
}}
.photo-box img {{
  max-width: 95%;
  max-height: 95%;
  width: auto;
  height: auto;
  object-fit: contain;
}}
.code-tag {{
  position: absolute;
  top: 3.5mm;
  left: 3.5mm;
  background: #0f172a;
  color: #fbbf24;
  font-size: 7.5pt;
  font-weight: 700;
  padding: 1.5px 5px;
  border-radius: 3px;
}}
.card-footer {{
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #e2e8f0;
  padding-top: 1mm;
  margin-top: 1mm;
  height: 5mm;
  max-height: 5mm;
  font-size: 7.5pt;
  flex-shrink: 0;
  box-sizing: border-box;
}}
.card-footer .code {{
  font-weight: 700;
  color: #0f172a;
}}
.card-footer .phone {{
  font-weight: 700;
  color: #0d9488;
}}
.footer {{
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #e2e8f0;
  padding-top: 1.5mm;
  height: 5mm;
  font-size: 7pt;
  color: #64748b;
  flex-shrink: 0;
  box-sizing: border-box;
}}

/* Back Cover */
.back {{ background: #0f172a; color: white; padding: 10mm; display: flex; flex-direction: column; justify-content: space-between; }}
.back-box {{ background: #1e293b; border: 1.5px solid #334155; border-radius: 6px; padding: 4mm 6mm; text-align: left; margin-bottom: 3mm; }}
.back-heading {{ color: #fbbf24; font-size: 9.5pt; font-weight: 700; margin-bottom: 2mm; }}
.back-item {{ color: #f1f5f9; font-size: 7.5pt; margin-bottom: 1.5mm; }}
</style>
</head>
<body>
""")

    # 1. Cover
    pillar_htmls = []
    for num, p_title, p_desc in t["pillars"]:
        pillar_htmls.append(f"""
        <div class="pillar-row">
          <div class="p-num">{num}</div>
          <div>
            <div class="p-head">{p_title}</div>
            <div class="p-desc">{p_desc}</div>
          </div>
        </div>
        """)

    html_parts.append(f"""
<div class="page cover">
  <div class="cover-border">
    <div class="inner-border"></div>
    <div>
      <div class="medallion"><img src="file://{logo_path}"></div>
      <div class="brand">{t['brand_title']}</div>
      <div class="sub">{t['brand_subtitle']}</div>
      <div class="line"></div>
      <div class="title1">{t['cover_title']}</div>
      <div class="title2">{t['cover_title2']}</div>
      <div class="year">{t['cover_year']}</div>
      <div class="tag1">{tag1_text}</div>
      <div class="tag2">{t['cover_tagline2']}</div>
    </div>
    
    <div class="cap-box">
      <div class="cap-title">{t['box_title']}</div>
      <div class="cap-line"></div>
      {''.join(pillar_htmls)}
    </div>
    
    <div class="exp-box">
      <div class="exp-title">{t['exp_title']}</div>
      <div class="exp-addr">{t['exp_addr']}</div>
      <div class="exp-contact">{t['exp_contact']}</div>
      <div class="exp-email">{t['exp_email']}</div>
      <div class="exp-meta">{t['cover_meta']}</div>
    </div>
  </div>
</div>
""")

    # 2. Product Pages
    for p_idx, chunk in enumerate(chunks):
        p_num = p_idx + 2
        raw_cat = chunk[0].get("patternCategory", "")
        ch_badge = CHAPTER_TRANSLATIONS.get(lang, {}).get(raw_cat) or t["header_badge_default"]
        cards_html = []
        for item in chunk:
            code = item.get("code") or item["id"]
            t_img = os.path.join(thumb_dir, f"{code}.jpg")
            cards_html.append(f"""
            <div class="card">
              <div class="photo-box"><img src="file://{t_img}"></div>
              <div class="code-tag">{code}</div>
              <div class="card-footer">
                <span class="code">{t['card_code_label']} {code}</span>
                <span class="phone">{t['card_inquire_label']}{t['card_phone']}</span>
              </div>
            </div>
            """)
        cards_joined = "".join(cards_html)
        p_str = t["page_x_of_y"].format(page=to_indic(p_num, lang), total=to_indic(total_pages, lang))
        html_parts.append(f"""
        <div class="page prod-page">
          <div class="header">
            <div class="header-left">
              <img src="file://{logo_path}">
              <span>{t['header_brand']} &middot; <span style="color:#64748b;font-weight:400;">{t['header_sub']}</span></span>
            </div>
            <div class="header-badge">{ch_badge}</div>
          </div>
          <div class="grid">
            {cards_joined}
          </div>
          <div class="footer">
            <span>{t['footer_addr']}</span>
            <span style="font-weight:700;">{p_str}</span>
          </div>
        </div>
        """)

    # 3. Back Cover
    step_items = "".join([f'<div class="back-item">{s}</div>' for s in t["order_steps"]])
    pack_items = "".join([f'<div class="back-item">{p}</div>' for p in t["pack_bullets"]])

    html_parts.append(f"""
<div class="page back">
  <div class="cover-border">
    <div class="inner-border"></div>
    <div>
      <div class="medallion"><img src="file://{logo_path}"></div>
      <div class="brand">{t['back_title']}</div>
      <div class="sub">{t['back_sub']}</div>
      <div class="line"></div>
    </div>
    
    <div class="back-box" style="margin-top:2mm;">
      <div class="back-heading">{t['order_heading']}</div>
      {step_items}
    </div>
    
    <div class="back-box">
      <div class="back-heading">{t['pack_heading']}</div>
      {pack_items}
    </div>
    
    <div class="exp-box">
      <div class="exp-title">{t['visit_heading']}</div>
      <div class="exp-addr" style="font-weight:700;font-size:9pt;margin-top:1.5mm;">{t['visit_brand']}</div>
      <div class="exp-addr">{t['exp_addr']}</div>
      <div class="exp-contact">{t['exp_contact']}</div>
      <div class="exp-email">{t['exp_email']}</div>
      <div class="exp-email" style="color:#94a3b8;">{t['studio_hours']}</div>
      <div class="exp-meta" style="color:#94a3b8;margin-top:2mm;">{t['copyright']}</div>
    </div>
  </div>
</div>
</body>
</html>
""")

    return "".join(html_parts)


def compile_pdf_with_chrome(chrome_path, html_content, output_path):
    temp_html = f"/tmp/catalog_{int(time.time() * 1000)}.html"
    with open(temp_html, "w", encoding="utf-8") as f:
        f.write(html_content)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    cmd = [
        chrome_path,
        "--headless",
        "--disable-gpu",
        "--allow-file-access-from-files",
        "--enable-local-file-accesses",
        f"--print-to-pdf={output_path}",
        "--print-to-pdf-no-header",
        temp_html
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if os.path.exists(temp_html):
        os.remove(temp_html)

    size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"SUCCESS: Generated {output_path} ({size_mb:.2f} MB)")


def main():
    catalog = build_catalog_order_and_items()
    repo_dir = os.path.abspath(".")
    logo_path = os.path.join(repo_dir, "public/branding/stone-tech-logo-transparent.png")
    thumb_dir = "/tmp/catalog_thumbs"
    preload_thumbnails(catalog, thumb_dir)

    chrome_bin = get_chrome_executable()
    if not chrome_bin:
        raise RuntimeError("Google Chrome / Chromium not found. Required for authentic multilingual text shaping.")

    print(f"Using Chrome binary: {chrome_bin}")
    output_dir = "public/catalogues"
    os.makedirs(output_dir, exist_ok=True)

    # 1. English
    print("\n--- Compiling English Architectural Catalog PDF ---")
    en_html = generate_html_document("en", catalog, logo_path, thumb_dir)
    en_path = os.path.join(output_dir, "StoneTech_NaturalStone_WallCl_Options_English.pdf")
    compile_pdf_with_chrome(chrome_bin, en_html, en_path)

    # Mirrors for backwards compatibility
    p26 = os.path.join(output_dir, "StoneTech_NaturalStone_WallCl_Options_26-27.pdf")
    shutil.copyfile(en_path, p26)
    p_legacy = os.path.join(output_dir, "stos-wall-cladding-catalogue-2026.pdf")
    shutil.copyfile(en_path, p_legacy)
    print(f"Mirrored English PDF to {p26} and {p_legacy}")

    # 2. Hindi
    print("\n--- Compiling Hindi Architectural Catalog PDF ---")
    hi_html = generate_html_document("hi", catalog, logo_path, thumb_dir)
    hi_path = os.path.join(output_dir, "StoneTech_NaturalStone_WallCl_Options_Hindi.pdf")
    compile_pdf_with_chrome(chrome_bin, hi_html, hi_path)

    # 3. Gujarati
    print("\n--- Compiling Gujarati Architectural Catalog PDF ---")
    gu_html = generate_html_document("gu", catalog, logo_path, thumb_dir)
    gu_path = os.path.join(output_dir, "StoneTech_NaturalStone_WallCl_Options_Gujarati.pdf")
    compile_pdf_with_chrome(chrome_bin, gu_html, gu_path)

    print("\n=======================================================")
    print("ALL THREE CATALOG PDFS GENERATED WITH AUTHENTIC INDIC")
    print("TYPOGRAPHY, LOCALIZED CODES, NUMERALS, AND HEADINGS!")
    print("=======================================================")


if __name__ == "__main__":
    main()

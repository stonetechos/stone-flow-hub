"""
scripts/catalogue_translations.py

Shared multilingual translation dictionaries and font embedding helpers for:
  - Ultra-Thin Stone Veneer
  - Flexible Clay Veneers (3D Textures, Punch Traventino, Punch Slat)
  - Stone Pebbles & Semi-Precious Aggregates
  - Architectural Glass Bricks (Solid & Hollow)

Ensures 100% authentic Kohinoor / Noto Sans typography in English, Hindi, and Gujarati
with zero tofu glyphs, zero broken Indic conjuncts, and native Devanagari/Gujarati numerals.
"""

import os
import base64

REPO_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
FONTS_DIR = os.path.join(REPO_DIR, "scripts/fonts")

# Read font bytes once at module load
with open(os.path.join(FONTS_DIR, "NotoSansDevanagari-Regular.ttf"), "rb") as f:
    HI_REG_B64 = base64.b64encode(f.read()).decode("utf-8")
with open(os.path.join(FONTS_DIR, "NotoSansDevanagari-Bold.ttf"), "rb") as f:
    HI_BOLD_B64 = base64.b64encode(f.read()).decode("utf-8")
with open(os.path.join(FONTS_DIR, "NotoSansGujarati-Regular.ttf"), "rb") as f:
    GU_REG_B64 = base64.b64encode(f.read()).decode("utf-8")
with open(os.path.join(FONTS_DIR, "NotoSansGujarati-Bold.ttf"), "rb") as f:
    GU_BOLD_B64 = base64.b64encode(f.read()).decode("utf-8")


def get_fonts_css(lang="en"):
    if lang == "hi":
        return f"""
@font-face {{
  font-family: 'CatalogHindiFont';
  src: url('data:font/ttf;base64,{HI_REG_B64}') format('truetype');
  font-weight: 400;
  font-style: normal;
}}
@font-face {{
  font-family: 'CatalogHindiFont';
  src: url('data:font/ttf;base64,{HI_BOLD_B64}') format('truetype');
  font-weight: 700;
  font-style: normal;
}}
body {{
  font-family: 'CatalogHindiFont', 'Kohinoor Devanagari', -apple-system, sans-serif !important;
}}
"""
    elif lang == "gu":
        return f"""
@font-face {{
  font-family: 'CatalogGujaratiFont';
  src: url('data:font/ttf;base64,{GU_REG_B64}') format('truetype');
  font-weight: 400;
  font-style: normal;
}}
@font-face {{
  font-family: 'CatalogGujaratiFont';
  src: url('data:font/ttf;base64,{GU_BOLD_B64}') format('truetype');
  font-weight: 700;
  font-style: normal;
}}
body {{
  font-family: 'CatalogGujaratiFont', 'Kohinoor Gujarati', -apple-system, sans-serif !important;
}}
"""
    return """
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
}
"""


def to_indic(num_str, lang="en"):
    if lang == "hi":
        hi_trans = str.maketrans("0123456789", "०१२३४५६७८९")
        return str(num_str).translate(hi_trans)
    elif lang == "gu":
        gu_trans = str.maketrans("0123456789", "૦૧૨૩૪૫૬૭૮૯")
        return str(num_str).translate(gu_trans)
    return str(num_str)


def localize_dimensions(text, lang="en"):
    if lang == "en":
        return text
    s = str(text)
    if lang == "hi":
        s = (s.replace("mm", "मिमी")
               .replace("cm", "सेमी")
               .replace("sq.ft", "वर्ग फीट")
               .replace("ft", "फीट")
               .replace("kg / m²", "किग्रा / वर्ग मीटर")
               .replace("kg/m²", "किग्रा / वर्ग मीटर")
               .replace("kg / pc", "किग्रा / पीस")
               .replace("kg", "किग्रा")
               .replace("carton", "कार्टन")
               .replace("pcs", "पीस")
               .replace("pc", "पीस"))
        return to_indic(s, "hi")
    elif lang == "gu":
        s = (s.replace("mm", "મીમી")
               .replace("cm", "સેમી")
               .replace("sq.ft", "ચોરસ ફૂટ")
               .replace("ft", "ફૂટ")
               .replace("kg / m²", "કિગ્રા / ચોરસ મીટર")
               .replace("kg/m²", "કિગ્રા / ચોરસ મીટર")
               .replace("kg / pc", "કિગ્રા / પીસ")
               .replace("kg", "કિગ્રા")
               .replace("carton", "કાર્ટન")
               .replace("pcs", "પીસ")
               .replace("pc", "પીસ"))
        return to_indic(s, "gu")
    return s


# Common Brand / Footer / Header Translations
COMMON_I18N = {
    "brand_name": {
        "en": "STONE TECH ATELIER",
        "hi": "स्टोन टेक एटेलियर",
        "gu": "સ્ટોન ટેક એટેલિયર"
    },
    "page_x_of_y": {
        "en": lambda p, tot, lang: f"PAGE {p} OF {tot}",
        "hi": lambda p, tot, lang: f"पृष्ठ {to_indic(p, 'hi')} / {to_indic(tot, 'hi')}",
        "gu": lambda p, tot, lang: f"પાનું {to_indic(p, 'gu')} / {to_indic(tot, 'gu')}",
    },
    "factory_direct": {
        "en": "FACTORY DIRECT ORDERS: +91 77420 90866 / +91 97844 52998 · WWW.STONETECH.IN",
        "hi": "फैक्ट्री डायरेक्ट ऑर्डर्स: +91 77420 90866 / +91 97844 52998 · WWW.STONETECH.IN",
        "gu": "ફેક્ટરી ડાયરેક્ટ ઓર્ડર્સ: +91 77420 90866 / +91 97844 52998 · WWW.STONETECH.IN",
    },
    "footer_spec": {
        "en": "STONE TECH ATELIER · ARCHITECTURAL SPECIFICATION CATALOGUE 2026-2027",
        "hi": "स्टोन टेक एटेलियर · आर्किटेक्चरल स्पेसिफिकेशन कैटलॉग २०२६-२०२७",
        "gu": "સ્ટોન ટેક એટેલિયર · આર્કિટેક્ચરલ સ્પેસિફિકેશન કેટલોગ ૨૦૨૬-૨૦૨૭",
    },
    "experience_center_title": {
        "en": "VISIT OUR EXPERIENCE CENTER & ARCHITECTURAL STUDIOS",
        "hi": "हमारे एक्सपीरियंस सेंटर एवं आर्किटेक्चरल स्टूडियो पर पधारें",
        "gu": "અમારા એક્સપિરિયન્સ સેન્ટર અને આર્કિટેક્ચરલ સ્ટુડિયોની મુલાકાત લો",
    },
    "experience_center_address": {
        "en": "E-02, Ground Floor, SG Business Hub, Vasant Nagar, Gota, Ahmedabad, Gujarat 380060",
        "hi": "ई-०२, ग्राउंड फ्लोर, एसजी बिजनेस हब, वसंत नगर, गोटा, अहमदाबाद, गुजरात ३८००६०",
        "gu": "ઇ-૦૨, ગ્રાઉન્ડ ફ્લોર, એસજી બિઝનેસ હબ, વસંત નગર, ગોટા, અમદાવાદ, ગુજરાત ૩૮૦૦૬૦",
    },
}

# -----------------------------------------------------------------------------
# 1. FLEXIBLE CLAY VENEERS TRANSLATIONS
# -----------------------------------------------------------------------------
CLAY_TEXTURE_NAMES = {
    "Fluted Texture": {"hi": "फ्लूटेड टेक्सचर", "gu": "ફ્લુટેડ ટેક્સચર"},
    "Hammerstone Texture": {"hi": "हैमरस्टोन टेक्सचर", "gu": "હેમરસ્ટોન ટેક્સચર"},
    "Ripple Texture": {"hi": "रिपल टेक्सचर", "gu": "રિપલ ટેક્સચર"},
    "Weave Texture": {"hi": "वीव टेक्सचर", "gu": "વીવ ટેક્સચર"},
    "Cube Texture": {"hi": "क्यूब टेक्सचर", "gu": "ક્યુબ ટેક્સચર"},
    "Romastone Texture": {"hi": "रोमास्टोन टेक्सचर", "gu": "રોમાસ્ટોન ટેક્સચર"},
    "Linea Texture": {"hi": "लीनिया टेक्सचर", "gu": "લીનિયા ટેક્સચર"},
    "Mosaic Texture": {"hi": "मोज़ेक टेक्सचर", "gu": "મોઝેક ટેક્સચર"},
    "Riverstone Texture": {"hi": "रिवरस्टोन टेक्सचर", "gu": "રિવરસ્ટોન ટેક્સચર"},
    "Horizon Texture": {"hi": "होराइजन टेक्सचर", "gu": "હોરાઇઝન ટેક્સચર"},
    "Cemento Texture": {"hi": "सीमेंटो टेक्सचर", "gu": "સિમેન્ટો ટેક્સચર"},
    "Travertino Texture": {"hi": "ट्रावेरटिनो टेक्सचर", "gu": "ટ્રાવર્ટિનો ટેક્સચર"},
    "Moonstone Texture": {"hi": "मूनस्टोन टेक्सचर", "gu": "મૂનસ્ટોન ટેક્સચર"},
    "Ledgestone Texture": {"hi": "लेजस्टोन टेक्सचर", "gu": "લેજસ્ટોન ટેક્સચર"},
    "Earthstone Texture": {"hi": "अर्थस्टोन टेक्सचर", "gu": "અર્થસ્ટોન ટેક્સચર"},
    "Checkered Texture": {"hi": "चेकर्ड टेक्सचर", "gu": "ચેકર્ડ ટેક્સચર"},
    "Carved Texture": {"hi": "काव्ड टेक्सचर", "gu": "કાર્વ્ડ ટેક્સચર"},
    "Slate Texture": {"hi": "स्लेट टेक्सचर", "gu": "સ્લેટ ટેક્સચર"},
}

CLAY_PROFILES = {
    "Linear Fluted Profile · 15mm Pitch": {
        "hi": "लीनियर फ्लूटेड प्रोफाइल · १५ मिमी पिच",
        "gu": "લીનિયર ફ્લુટેડ પ્રોફાઇલ · ૧૫ મીમી પિચ"
    },
    "Fine Bush-Hammered Relief": {
        "hi": "फाइन बुश-हैमर्ड रिलीफ",
        "gu": "ફાઇન બુશ-હેમર્ડ રિલીફ"
    },
    "Kinetic Wave Undulation": {
        "hi": "काइनेटिक वेव रिपल्स",
        "gu": "કાઇનેટિક વેવ રિપલ્સ"
    },
    "Interlocking Woven Basket Grid": {
        "hi": "इंटरलॉकिंग वोवन बास्केट ग्रिड",
        "gu": "ઇન્ટરલોકિંગ વુવન બાસ્કેટ ગ્રિડ"
    },
    "Faceted 3D Geometric Relief": {
        "hi": "फेसेटेड 3D ज्योमेट्रिक रिलीफ",
        "gu": "ફેસેટેડ 3D જ્યોમેટ્રિક રિલીફ"
    },
    "Antiqued Italian Ashlar Masonry": {
        "hi": "एंटीक्ड इटैलियन ऐशलर मेसोनरी",
        "gu": "એન્ટિક્ડ ઇટાલિયન એશલર મેસોનરી"
    },
    "Continuous Micro-Linear Grooves": {
        "hi": "कंटीन्यूअस माइक्रो-लीनियर ग्रूव्स",
        "gu": "કન્ટીન્યુઅસ માઇક્રો-લીનિયર ગ્રૂવ્સ"
    },
    "Modular Split-Face Square Grid": {
        "hi": "मॉड्यूलर स्प्लिट-फेस स्क्वायर ग्रिड",
        "gu": "મોડ્યુલર સ્પ્લિટ-ફેસ સ્ક્વેર ગ્રિડ"
    },
    "Naturally Weathered Stone Cleft": {
        "hi": "नेचुरली वेदरड स्टोन क्लेफ्ट",
        "gu": "નેચરલી વેધર્ડ સ્ટોન ક્લેફ્ટ"
    },
    "Fine Continuous Horizontal Grain": {
        "hi": "फाइन हॉरिजॉन्टल ग्रेन",
        "gu": "ફાઇન હોરિઝોન્ટલ ગ્રેન"
    },
    "Fair-Faced Architectural Concrete": {
        "hi": "फेयर-फेस्ड आर्किटेक्चरल कंक्रीट",
        "gu": "ફેર-ફેસ્ડ આર્કિટેક્ચરલ કોંક્રિટ"
    },
    "Classic Vein-Cut Porous Relief": {
        "hi": "क्लासिक वेन-कट पोरस रिलीफ",
        "gu": "ક્લાસિક વેઇન-કટ પોરસ રિલીફ"
    },
    "Craggy Volcanic Rock Relief": {
        "hi": "क्रैगी वोल्केनिक रॉक रिलीफ",
        "gu": "ક્રેગી વોલ્કેનિક રોક રિલીફ"
    },
    "Stacked Dimensional Ledger Stone": {
        "hi": "स्टैक्ड डायमेंशनल लेजर स्टोन",
        "gu": "સ્ટેક્ડ ડાઇમેન્શનલ લેજર સ્ટોન"
    },
    "Coarse Sedimentary Earth Grain": {
        "hi": "कोर्स सेडिमेंटरी अर्थ ग्रेन",
        "gu": "કોર્સ સેડિમેન્ટરી અર્થ ગ્રેન"
    },
    "Pillowed 3D Grid Masonry": {
        "hi": "पिलोव्ड 3D ग्रिड मेसोनरी",
        "gu": "પિલોવ્ડ 3D ગ્રિડ મેસોનરી"
    },
    "Hand-Tooled Artisanal Chisel Marks": {
        "hi": "हैंड-टूल्ड आर्टीसनल चिज़ल मार्क्स",
        "gu": "હેન્ડ-ટૂલ્ડ આર્ટિસનલ છીણી માર્ક્સ"
    },
    "Natural Mountain Slate Cleavage": {
        "hi": "नेचुरल माउंटेन स्लेट क्लीवेज",
        "gu": "નેચરલ માઉન્ટેન સ્લેટ ક્લીવેજ"
    },
}

CLAY_COLORS = {
    "White": {"hi": "व्हाइट", "gu": "વ્હાઇટ"},
    "Sandy Beige": {"hi": "सैंडी बेज", "gu": "સેન્ડી બેજ"},
    "Light Cool Grey": {"hi": "लाइट कूल ग्रे", "gu": "લાઇટ કૂલ ગ્રે"},
    "Muted Olive": {"hi": "म्यूटेड ऑलिव", "gu": "મ્યુટેડ ઓલિવ"},
    "Terracotta": {"hi": "टेराकोटा", "gu": "ટેરાકોટા"},
    "Medium Charcoal Grey": {"hi": "चारकोल ग्रे", "gu": "ચારકોલ ગ્રે"},
    "Deep Chocolate Brown": {"hi": "चॉकलेट ब्राउन", "gu": "ચોકલેટ બ્રાઉન"},
    "Dark Espresso": {"hi": "डार्क एस्प्रेसो", "gu": "ડાર્ક એસ્પ્રેસો"},
    "Black": {"hi": "ब्लैक", "gu": "બ્લેક"},
}

# -----------------------------------------------------------------------------
# 2. STONE PEBBLES TRANSLATIONS
# -----------------------------------------------------------------------------
PEBBLE_CATEGORIES = {
    "Semi-Precious Agates": {"hi": "सेमी-प्रेशियस एगेट्स", "gu": "સેમી-પ્રેશિયસ એગેટ્સ"},
    "Natural River Pebbles": {"hi": "नेचुरल रिवर पेबल्स", "gu": "નેચરલ રિવર પેબલ્સ"},
    "Polished Architectural": {"hi": "पॉलिश्ड आर्किटेक्चरल पेबल्स", "gu": "પોલિશ્ડ આર્કિટેક્ચરલ પેબલ્સ"},
    "Exotic Landscaping": {"hi": "एग्जॉटिक लैंडस्केपिंग पेबल्स", "gu": "એક્ઝોટિક લેન્ડસ્કેપિંગ પેબલ્સ"},
    "Mineral Aggregates": {"hi": "मिनरल एग्रीगेट्स", "gu": "મિનરલ એગ્રીગેટ્સ"},
    "Semi-Precious Agate": {"hi": "सेमी-प्रेशियस एगेट", "gu": "સેમી-પ્રેશિયસ એગેટ"},
    "Natural Polished": {"hi": "नेचुरल पॉलिश्ड", "gu": "નેચરલ પોલિશ્ડ"},
}

PEBBLE_NAMES = {
    "Rose Quartz": {"hi": "रोज़ क्वार्ट्ज", "gu": "રોઝ ક્વાર્ટ્ઝ"},
    "Crystal Quartz": {"hi": "क्रिस्टल क्वार्ट्ज", "gu": "ક્રિસ્ટલ ક્વાર્ટ્ઝ"},
    "African Amethyst": {"hi": "अफ्रीकन एमेथिस्ट", "gu": "આફ્રિકન એમેથિસ્ટ"},
    "Red Carnelian": {"hi": "रेड कार्नेलियन", "gu": "રેડ કાર્નેલિયન"},
    "Lapis Lazuli": {"hi": "लापिस लाजुली", "gu": "લાપિસ લાઝુલી"},
    "Black Obsidian": {"hi": "ब्लैक ओब्सीडियन", "gu": "બ્લેક ઓબ્સિડિયન"},
    "Green Jade": {"hi": "ग्रीन जेड", "gu": "ગ્રીન જેડ"},
    "Yellow Aventurine": {"hi": "येलो एवेंच्यूरिन", "gu": "યલો એવેન્ચ્યુરિન"},
    "Tiger Eye": {"hi": "टाइगर आई", "gu": "ટાઇગર આઇ"},
    "White Marble Pebbles": {"hi": "व्हाइट मार्बल पेबल्स", "gu": "વ્હાઇટ માર્બલ પેબલ્સ"},
    "Black River Pebbles": {"hi": "ब्लैक रिवर पेबल्स", "gu": "બ્લેક રિવર પેબલ્સ"},
    "Red Jasper": {"hi": "रेड जैस्पर", "gu": "રેડ જાસ્પર"},
    "Sodalite Blue": {"hi": "सोडालाइट ब्लू", "gu": "સોડાલાઇટ બ્લૂ"},
    "Green Aventurine": {"hi": "ग्रीन एवेंच्यूरिन", "gu": "ગ્રીન એવેન્ચ્યુરિન"},
    "Grey River Pebbles": {"hi": "ग्रे रिवर पेबल्स", "gu": "ગ્રે રિવર પેબલ્સ"},
    "Snow White Pebbles": {"hi": "स्नो व्हाइट पेबल्स", "gu": "સ્નો વ્હાઇટ પેબલ્સ"},
    "Multi Agate Pebbles": {"hi": "मल्टी एगेट पेबल्स", "gu": "મલ્ટી એગેટ પેબલ્સ"},
    "Golden River Pebbles": {"hi": "गोल्डन रिवर पेबल्स", "gu": "ગોલ્ડન રિવર પેબલ્સ"},
    "Onyx Mixed Pebbles": {"hi": "गोमेद (गोमेद) पेबल्स", "gu": "ગોમેદ પેબલ્સ"},
    "Polished Black Jade": {"hi": "पॉलिश्ड ब्लैक जेड", "gu": "પોલિશ્ડ બ્લેક જેડ"},
    "Chakra Rainbow Stone": {"hi": "चक्र रेनबो स्टोन", "gu": "ચક્ર રેનબો સ્ટોન"},
}

# -----------------------------------------------------------------------------
# 3. GLASS BRICKS TRANSLATIONS
# -----------------------------------------------------------------------------
GLASS_SERIES = {
    "Clear Architectural Series": {"hi": "क्लियर आर्किटेक्चरल सीरीज", "gu": "ક્લિયર આર્કિટેક્ચરલ સિરીઝ"},
    "Optical Clear Crystal Series": {"hi": "ऑप्टिकल क्लियर क्रिस्टल सीरीज", "gu": "ઓપ્ટિકલ ક્લિયર ક્રિસ્ટલ સિરીઝ"},
    "In-Color & Tinted Series": {"hi": "इन-कलर एवं टिंटेड सीरीज", "gu": "ઇન-કલર અને ટિન્ટેડ સિરીઝ"},
    "Solar Control Metallized Series": {"hi": "सोलर कंट्रोल मेटलाइज्ड सीरीज", "gu": "સોલર કંટ્રોલ મેટલાઇઝ્ડ સિરીઝ"},
}

GLASS_NAMES = {
    "Seaview": {"hi": "सीव्यू (वेव पैटर्न)", "gu": "સીવ્યૂ (વેવ પેટર્ન)"},
    "Sahara": {"hi": "सहारा (सैंड रिपल)", "gu": "સહારા (સેન્ડ રિપલ)"},
    "Quadra": {"hi": "क्वाड्रा (क्रॉस ग्रिड)", "gu": "ક્વાડ્રા (ક્રોસ ગ્રિડ)"},
    "Cloud": {"hi": "क्लाउड (सॉफ्ट डिफ्यूजन)", "gu": "ક્લાઉડ (સોફ્ટ ડિફ્યુઝન)"},
    "Diamond": {"hi": "डायमंड (प्रिज्म रिफ्रैक्शन)", "gu": "ડાયમંડ (પ્રિઝ્મ રિફ્રેક્શન)"},
    "Directo": {"hi": "डायरेक्टो (लीनियर स्ट्रिएशन)", "gu": "ડાયરેક્ટો (લીનિયર સ્ટ્રિએશન)"},
    "Super Clear": {"hi": "सुपर क्लियर सॉलिड क्रिस्टल", "gu": "સુપર ક્લિયર સોલિડ ક્રિસ્ટલ"},
    "Clear Rock Finish": {"hi": "क्लियर रॉक फिनिश सॉलिड", "gu": "ક્લિયર રોક ફિનિશ સોલિડ"},
    "Bubble Clear": {"hi": "बबल क्लियर सॉलिड क्रिस्टल", "gu": "બબલ ક્લિયર સોલિડ ક્રિસ્ટલ"},
    "Frosted Satin": {"hi": "फ्रॉस्टेड सैटिन क्रिस्टल", "gu": "ફ્રોસ્ટેડ સેટિન ક્રિસ્ટલ"},
}

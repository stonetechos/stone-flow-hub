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
    "Fluted Texture": {"hi": "फ्लूटेड टेक्सचर (समानांतर धारियां)", "gu": "ફ્લુટેડ ટેક્સચર"},
    "Hammerstone Texture": {"hi": "हैमरस्टोन टेक्सचर (हथौड़ी नक्काशी)", "gu": "હેમરસ્ટોન ટેક્સચર"},
    "Ripple Texture": {"hi": "रिपल टेक्सचर (जल तरंग)", "gu": "રીપલ ટેક્સચર (તરંગ)"},
    "Weave Texture": {"hi": "वीव टेक्सचर (बुनाई बास्केट ग्रिड)", "gu": "વીવ ટેક્સચર"},
    "Cube Texture": {"hi": "क्यूब टेक्सचर (घनाकार 3D)", "gu": "ક્યુબ ટેક્સચર"},
    "Romastone Texture": {"hi": "रोमास्टोन टेक्सचर (रोमन पाषाण)", "gu": "રોમાસ્ટોન ટેક્સચર"},
    "Linea Texture": {"hi": "लीनिया टेक्सचर (सूक्ष्म रेखाएं)", "gu": "લીનિયા ટેક્સચર"},
    "Mosaic Texture": {"hi": "मोज़ेक टेक्सचर (कलात्मक टाइलें)", "gu": "મોઝેઇક ટેક્સચર"},
    "Riverstone Texture": {"hi": "रिवरस्टोन टेक्सचर (नदी पाषाण)", "gu": "રિવરસ્ટોન ટેક્સચર"},
    "Horizon Texture": {"hi": "होराइजन टेक्सचर (क्षितिज तरंग)", "gu": "હોરાઇઝન ટેક્સચર"},
    "Cemento Texture": {"hi": "सीमेंटो टेक्सचर (कंक्रीट फिनिश)", "gu": "સિમેન્ટો ટેક્સચર"},
    "Travertino Texture": {"hi": "ट्रैवर्टीन टेक्सचर (छिद्रयुक्त पाषाण)", "gu": "ટ્રાવર્ટિનો ટેક્સચર"},
    "Moonstone Texture": {"hi": "मूनस्टोन टेक्सचर (चंद्र पाषाण)", "gu": "મૂનસ્ટોન ટેક્સચર"},
    "Ledgestone Texture": {"hi": "लेजस्टोन टेक्सचर (परतदार पाषाण)", "gu": "લેજસ્ટોન ટેક્સચર"},
    "Earthstone Texture": {"hi": "अर्थस्टोन टेक्सचर (प्राकृतिक मृत्तिका)", "gu": "અર્થસ્ટોન ટેક્સચર"},
    "Checkered Texture": {"hi": "चेकर्ड टेक्सचर (शतरंज ग्रिड)", "gu": "ચેકર્ડ ટેક્સચર"},
    "Carved Texture": {"hi": "काव्ड टेक्सचर (हस्तशिल्प नक्काशी)", "gu": "કાર્વ્ડ ટેક્સચર"},
    "Slate Texture": {"hi": "स्लेट टेक्सचर (पहाड़ी स्लेट)", "gu": "સ્લેટ ટેક્સચર"},
}

CLAY_PROFILES = {
    "Linear Fluted Profile · 15mm Pitch": {
        "hi": "समानांतर फ्लूटेड प्रोफाइल · १५ मिमी पिच",
        "gu": "લીનિયર ફ્લુટેડ પ્રોફાઇલ · ૧૫ મીમી પિચ",
    },
    "Fine Bush-Hammered Relief": {
        "hi": "बारीक बुश-हैमर्ड पाषाण नक्काशी",
        "gu": "ઝીણી બુશ-હેમર્ડ રિલીફ",
    },
    "Kinetic Wave Undulation": {
        "hi": "काइनेटिक जल तरंग रिलीफ",
        "gu": "કાઇનેટિક મોજાં રિલીફ",
    },
    "Interlocking Woven Basket Grid": {
        "hi": "इंटरलॉकिंग बुनाई बास्केट ग्रिड",
        "gu": "ઇન્ટરલોકિંગ વુવન બાસ્કેટ ગ્રિડ",
    },
    "Faceted 3D Geometric Relief": {
        "hi": "३D ज्यामितीय फलकीय नक्काशी",
        "gu": "૩D ભૂમિતિ રિલીફ",
    },
    "Antiqued Italian Ashlar Masonry": {
        "hi": "विंटेज इटैलियन ऐशलर चिनाई",
        "gu": "વિન્ટેજ ઇટાલિયન એશલર ચણતર",
    },
    "Continuous Micro-Linear Grooves": {
        "hi": "सतत सूक्ष्म रेखीय खांचे (ग्रूव्स)",
        "gu": "કન્ટીન્યુઅસ માઇક્રો-લીનિયર ગ્રૂવ્સ",
    },
    "Modular Split-Face Square Grid": {
        "hi": "मॉड्यूलर स्प्लिट-फेस वर्गाकार ग्रिड",
        "gu": "મોડ્યુલર સ્પ્લિટ-ફેસ ચોરસ ગ્રિડ",
    },
    "Naturally Weathered Stone Cleft": {
        "hi": "प्राकृतिक वेदरड पाषाण दरार",
        "gu": "કુદરતી વેધર્ડ સ્ટોન ક્લેફ્ટ",
    },
    "Fine Continuous Horizontal Grain": {
        "hi": "बारीक क्षैतिज पाषाण रेशा",
        "gu": "ઝીણું આડું પાષાણ રેખાંકન",
    },
    "Fair-Faced Architectural Concrete": {
        "hi": "वास्तुकला फेयर-फेस्ड कंक्रीट फिनिश",
        "gu": "આર્કિટેક્ચરલ ફેર-ફેસ્ડ કોંક્રિટ",
    },
    "Classic Vein-Cut Porous Relief": {
        "hi": "क्लासिक वेन-कट छिद्रयुक्त रिलीफ",
        "gu": "ક્લાસિક વેઇન-કટ પોરસ રિલીફ",
    },
    "Craggy Volcanic Rock Relief": {
        "hi": "ज्वालामुखी चट्टान नक्काशी",
        "gu": "જ્વાળામુખી ખડક રિલીફ",
    },
    "Stacked Dimensional Ledger Stone": {
        "hi": "त्रि-आयामी स्टैक्ड लेजर स्टोन",
        "gu": "સ્ટેક્ડ લેજર સ્ટોન",
    },
    "Coarse Sedimentary Earth Grain": {
        "hi": "प्राकृतिक तलछटी मृत्तिका रेशा",
        "gu": "કુદરતી અર્થ ગ્રેન",
    },
    "Pillowed 3D Grid Masonry": {
        "hi": "पिलोव्ड ३D ग्रिड चिनाई",
        "gu": "પિલોવ્ડ ૩D ગ્રિડ ચણતર",
    },
    "Hand-Tooled Artisanal Chisel Marks": {
        "hi": "कारीगर हस्तशिल्प छेनी नक्काशी",
        "gu": "કારીગર હસ્તશિલ્પ છીણી માર્ક્સ",
    },
    "Natural Mountain Slate Cleavage": {
        "hi": "प्राकृतिक पर्वतीय स्लेट दरार",
        "gu": "કુદરતી પર્વતીય સ્લેટ ક્લેફ્ટ",
    },
}

CLAY_COLORS = {
    "White": {"hi": "श्वेत (व्हाइट)", "gu": "સફેદ"},
    "Sandy Beige": {"hi": "सैंडी बेज", "gu": "સેન્ડી બેજ"},
    "Light Cool Grey": {"hi": "हल्का स्लेटी (कूल ग्रे)", "gu": "આછો ભૂરો (ગ્રે)"},
    "Muted Olive": {"hi": "जैतूनी (ऑलिव)", "gu": "ઓલિવ"},
    "Terracotta": {"hi": "टेराकोटा (मिट्टी का लाल रंग)", "gu": "ટેરાકોટા"},
    "Medium Charcoal Grey": {"hi": "मध्यम चारकोल स्लेटी", "gu": "ચારકોલ ગ્રે"},
    "Deep Chocolate Brown": {"hi": "गहरा चॉकलेट भूरा", "gu": "ચોકલેટ બ્રાઉન"},
    "Dark Espresso": {"hi": "गहरा एस्प्रेसो", "gu": "ડાર્ક એસ્પ્રેસો"},
    "Black": {"hi": "गहरा काला (ब्लैक)", "gu": "કાળો"},
}

# -----------------------------------------------------------------------------
# 2. STONE PEBBLES TRANSLATIONS
# -----------------------------------------------------------------------------
PEBBLE_CATEGORIES = {
    "Semi-Precious Agates": {"hi": "अर्ध-कीमती अगेट पाषाण", "gu": "અર્ધ-કિંમતી અગેટ પથ્થર"},
    "Natural River Pebbles": {"hi": "प्राकृतिक नदी के कंकड़", "gu": "કુદરતી નદીના કાંકરા"},
    "Polished Architectural": {"hi": "पॉलिश्ड वास्तुकला कंकड़", "gu": "પોલિશ્ડ આર્કિટેક્ચરલ કાંકરા"},
    "Exotic Landscaping": {"hi": "विशिष्ट लैंडस्केप कंकड़", "gu": "વિશિષ્ટ લેન્ડસ્કેપિંગ કાંકરા"},
    "Mineral Aggregates": {"hi": "खनिज एग्रीगेट्स", "gu": "ખનિજ એગ્રીગેટ્સ"},
    "Semi-Precious Agate": {"hi": "अर्ध-कीमती अगेट", "gu": "અર્ધ-કિંમતી અગેટ"},
    "Natural Polished": {"hi": "प्राकृतिक पॉलिश्ड", "gu": "કુદરતી પોલિશ્ડ"},
}

PEBBLE_NAMES = {
    "Rose Quartz": {"hi": "रोज़ क्वार्ट्ज (गुलाबी स्फटिक)", "gu": "રોઝ ક્વાર્ટ્ઝ (ગુલાબી સ્ફટિક)"},
    "Crystal Quartz": {"hi": "क्रिस्टल क्वार्ट्ज (पारदर्शी स्फटिक)", "gu": "ક્રિસ્ટલ ક્વાર્ટ્ઝ (પારદર્શક સ્ફટિક)"},
    "African Amethyst": {"hi": "अफ्रीकन एमेथिस्ट (जामुनिया स्फटिक)", "gu": "આફ્રિકન એમેથિસ્ટ (જાંબુડિયો સ્ફટિક)"},
    "Red Carnelian": {"hi": "लाल कार्नेलियन (अकीक पाषाण)", "gu": "લાલ કાર્નેલિયન (અકીક પથ્થર)"},
    "Lapis Lazuli": {"hi": "लापिस लाजुली (लाजवर्द पाषाण)", "gu": "લાપિસ લાઝુલી (લાજવર્દ)"},
    "Black Obsidian": {"hi": "ब्लैक ओब्सीडियन (ज्वालामुखी पाषाण)", "gu": "બ્લેક ઓબ્સિડિયન"},
    "Green Jade": {"hi": "ग्रीन जेड (हरिताश्म पाषाण)", "gu": "ગ્રીન જેડ (હરિતાશ્મ)"},
    "Yellow Aventurine": {"hi": "पीला एवेंच्यूरिन स्फटिक", "gu": "પીળો એવેન્ચ્યુરિન"},
    "Tiger Eye": {"hi": "टाइगर आई (बाघ-नेत्र स्फटिक)", "gu": "ટાઇગર આઇ (વાઘ-આંખ સ્ફટિક)"},
    "White Marble Pebbles": {"hi": "सफेद संगमरमर कंकड़", "gu": "સફેદ માર્બલ કાંકરા"},
    "Black River Pebbles": {"hi": "काले नदी कंकड़ (रिवर पेबल्स)", "gu": "કાળા નદીના કાંકરા"},
    "Red Jasper": {"hi": "लाल जैस्पर पाषाण", "gu": "લાલ જાસ્પર પથ્થર"},
    "Sodalite Blue": {"hi": "सोडालाइट नीला पाषाण", "gu": "સોડાલાઇટ વાદળી"},
    "Green Aventurine": {"hi": "हरा एवेंच्यूरिन स्फटिक", "gu": "લીલો એવેન્ચ્યુરિન"},
    "Grey River Pebbles": {"hi": "स्लेटी नदी कंकड़", "gu": "ભૂરા નદીના કાંકરા"},
    "Snow White Pebbles": {"hi": "हिम-श्वेत (स्नो व्हाइट) कंकड़", "gu": "બરફ જેવા સફેદ કાંકરા"},
    "Multi Agate Pebbles": {"hi": "बहुरंगी अगेट कंकड़", "gu": "બહુરંગી અગેટ કાંકરા"},
    "Golden River Pebbles": {"hi": "सुनहरे नदी कंकड़", "gu": "સોનેરી નદીના કાંકરા"},
    "Onyx Mixed Pebbles": {"hi": "मिश्रित गोमेद (ओनिक्स) कंकड़", "gu": "મિશ્ર ગોમેદ કાંકરા"},
    "Polished Black Jade": {"hi": "पॉलिश्ड ब्लैक जेड (काला हरिताश्म)", "gu": "પોલિશ્ડ બ્લેક જેડ"},
    "Chakra Rainbow Stone": {"hi": "चक्र रेनबो इंद्रधनुषी पाषाण", "gu": "ચક્ર રેનબો પથ્થર"},
}

# -----------------------------------------------------------------------------
# 3. GLASS BRICKS TRANSLATIONS (LITERAL KAANCH / KHOKHLI / THOS / EENTEIN)
# -----------------------------------------------------------------------------
GLASS_SERIES = {
    "Clear Architectural Series": {
        "hi": "पारदर्शी वास्तुकला कांच श्रृंखला",
        "gu": "પારદર્શક આર્કિટેક્ચરલ કાચ શ્રેણી",
    },
    "Optical Clear Crystal Series": {
        "hi": "ऑप्टिकल पारदर्शी ठोस कांच श्रृंखला",
        "gu": "ઓપ્ટિકલ ક્રિસ્ટલ નક્કર કાચ શ્રેણી",
    },
    "In-Color & Tinted Series": {
        "hi": "रंगीन एवं टिंटेड कांच श्रृंखला",
        "gu": "રંગીન અને ટિન્ટેડ કાચ શ્રેણી",
    },
    "Solar Control Metallized Series": {
        "hi": "सौर-नियंत्रण धातुयुक्त कांच श्रृंखला",
        "gu": "સોલર-કંટ્રોલ મેટલાઇઝ્ડ કાચ શ્રેણી",
    },
}

GLASS_NAMES = {
    "Seaview": {"hi": "सी-व्यू (सागरीय लहर कांच की ईंट)", "gu": "સી-વ્યૂ (સમુદ્રી મોજું કાચની ઈંટ)"},
    "Sahara": {"hi": "सहारा (मरुस्थलीय तरंग कांच की ईंट)", "gu": "સહારા (રણ તરંગ કાચની ઈંટ)"},
    "Quadra": {"hi": "क्वाड्रा (क्रॉस ग्रिड कांच की ईंट)", "gu": "ક્વાડ્રા (ક્રોસ ગ્રિડ કાચની ઈંટ)"},
    "Cloud": {"hi": "क्लाउड (मृदु विसारक कांच की ईंट)", "gu": "ક્લાઉડ (વાદળછાયો કાચની ઈંટ)"},
    "Diamond": {"hi": "हीरक / डायमंड (प्रिज्म परावर्तक कांच)", "gu": "હીરા કટ (પ્રિઝ્મ રિફ્રેક્શન કાચ)"},
    "Directo": {"hi": "डायरेक्टो (रेखीय पट्टियां कांच की ईंट)", "gu": "ડાયરેક્ટો (રેખીય પટ્ટા કાચની ઈંટ)"},
    "Super Clear": {"hi": "सुपर क्लियर पारदर्शी ठोस कांच की ईंट", "gu": "સુપર ક્લિયર પારદર્શક નક્કર કાચની ઈંટ"},
    "Clear Rock Finish": {"hi": "रॉक फिनिश ठोस कांच की ईंट", "gu": "રોક ફિનિશ નક્કર કાચની ઈંટ"},
    "Bubble Clear": {"hi": "बबल क्रिस्टल ठोस कांच की ईंट", "gu": "પરપોટા ક્રિસ્ટલ નક્કર કાચની ઈંટ"},
    "Frosted Satin": {"hi": "फ्रॉस्टेड सैटिन ठोस कांच की ईंट", "gu": "ફ્રોસ્ટેડ સેટિન નક્કર કાચની ઈંટ"},
}

#!/usr/bin/env python3
"""
scripts/compile-stone-pebbles-multilingual.py

Compiles the Stone Tech Natural Stone Pebbles & Semi-Precious Aggregates Catalogue (2026-2027)
into three luxury vector editions:
  - English:  public/catalogues/StoneTech_Stone_Pebbles_Catalogue_English.pdf
              (and public/catalogues/StoneTech_Stone_Pebbles_Catalogue_2026.pdf)
  - Hindi:    public/catalogues/StoneTech_Stone_Pebbles_Catalogue_Hindi.pdf
  - Gujarati: public/catalogues/StoneTech_Stone_Pebbles_Catalogue_Gujarati.pdf

Features:
  - Base64 TrueType fonts (NotoSansDevanagari, NotoSansGujarati) for zero tofu glyphs.
  - Authentic Devanagari numerals (०–९) and Gujarati numerals (૦–૯).
  - High-definition pebble photography in uniform 1:1 frames with text removed.
  - Headless Chrome compilation, target < 20 MiB per edition.
"""

import os
import sys
import time
import subprocess
import shutil

REPO_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.append(os.path.join(REPO_DIR, "scripts"))

from full_catalogue_data import PEBBLE_ITEMS_I18N
from catalogue_translations import (
    get_fonts_css,
    to_indic,
    localize_dimensions,
    PEBBLE_CATEGORIES,
    PEBBLE_NAMES,
    COMMON_I18N,
)

import importlib
sp = importlib.import_module("generate-stone-pebbles-catalogue")

ASSETS_DIR = sp.ASSETS_DIR
BRANDING_DIR = sp.BRANDING_DIR
EMBLEM_PATH = sp.EMBLEM_PATH
PEBBLES = sp.PEBBLES


def get_chrome_executable():
    paths = [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
        shutil.which("google-chrome"),
        shutil.which("chromium"),
        shutil.which("chrome"),
    ]
    for p in paths:
        if p and os.path.exists(p):
            return p
    return None


def generate_css(lang="en"):
    base_css = sp.generate_css()
    font_block = get_fonts_css(lang)
    return font_block + "\n" + base_css


def generate_html(lang="en"):
    total_products = len(PEBBLES)
    items_per_page = 4
    num_product_pages = (total_products + items_per_page - 1) // items_per_page  # 19 pages
    total_pages = 1 + 1 + num_product_pages + 1 + 1  # 23 pages

    doc_title = (
        "Stone Tech Atelier — Stone Pebbles & Semi-Precious Aggregates Catalogue (2026-2027)"
        if lang == "en"
        else "स्टोन टेक एटेलियर — स्टोन पेबल्स एवं सेमी-प्रेशियस एग्रीगेट्स कैटलॉग (२०२६-२०२७)"
        if lang == "hi"
        else "સ્ટોન ટેક એટેલિયર — સ્ટોન પેબલ્સ અને સેમી-પ્રેશિયસ એગ્રીગેટ્સ કેટલોગ (૨૦૨૬-૨૦૨૭)"
    )

    parts = []
    parts.append("<!DOCTYPE html>")
    parts.append(f"<html lang='{lang}'>")
    parts.append("<head>")
    parts.append("<meta charset='utf-8'>")
    parts.append(f"<title>{doc_title}</title>")
    parts.append("<style>")
    parts.append(generate_css(lang))
    parts.append("</style>")
    parts.append("</head>")
    parts.append("<body>")

    # =========================================================================
    # PAGE 1: LUXURY COVER
    # =========================================================================
    emblem_src = f"file://{EMBLEM_PATH}" if os.path.exists(EMBLEM_PATH) else ""

    c_title = (
        "NATURAL STONE PEBBLES<br><span>&amp; SEMI-PRECIOUS AGGREGATES</span>"
        if lang == "en"
        else "प्राकृतिक पत्थर के कंकड़ (पेबल्स)<br><span>एवं अर्ध-कीमती पाषाण संग्रह</span>"
        if lang == "hi"
        else "કુદરતી પથ્થરના કાંકરા (પેબલ્સ)<br><span>અને અર્ધ-કિંમતી પથ્થર સંગ્રહ</span>"
    )
    c_sub = (
        "Curated Natural River Stones, Crystalline Onyx Pebbles, Exotic Agate Aggregates, Monumental Jumbo Boulders, Flat Stepping Discs &amp; Precision Architectural Micro-Chips"
        if lang == "en"
        else "प्राकृतिक नदी के कंकड़, क्रिस्टलीय गोमेद (ओनिक्स) पेबल्स, दुर्लभ अगेट पाषाण, विशाल जंबो बोल्डर्स, चपटे पाषाण डिस्क एवं सूक्ष्म वास्तुकला चिप्स"
        if lang == "hi"
        else "કુદરતી નદીના કાંકરા, સ્ફટિકીય ગોમેદ (ઓનિક્સ) પેબલ્સ, અર્ધ-કિંમતી અગેટ પથ્થરો, વિશાળ જમ્બો બોલ્ડર્સ અને આર્કિટેક્ચરલ માઇક્રો-ચિપ્સ"
    )
    pill1 = f"{to_indic(75, lang)} Curated Varieties" if lang == "en" else f"{to_indic(75, lang)} क्यूरेटेड किस्में" if lang == "hi" else f"{to_indic(75, lang)} ક્યુરેટેડ વેરાઇટીઝ"
    pill2 = "Micro-Chips to 180mm Boulders" if lang == "en" else f"माइक्रो-चिप्स से {to_indic(180, lang)} मिमी बोल्डर्स" if lang == "hi" else f"માઇક્રો-ચિપ્સથી {to_indic(180, lang)} મીમી બોલ્ડર્સ"
    pill3 = "100% Natural Minerals" if lang == "en" else f"{to_indic(100, lang)}% प्राकृतिक खनिज" if lang == "hi" else f"{to_indic(100, lang)}% કુદરતી ખનિજ"
    pill4 = "Global Export Standards" if lang == "en" else "वैश्विक निर्यात मानक" if lang == "hi" else "વૈશ્વિક નિકાસ ધોરણો"

    cover_brand = "STONE TECH ATELIER" if lang == "en" else "स्टोन टेक एटेलियर" if lang == "hi" else "સ્ટોન ટેક એટેલિયર"
    cover_subbrand = "Architectural Stone &amp; Semi-Precious Aggregates · Master 2026 Edition" if lang == "en" else "वास्तुशिल्पीय पाषाण एवं अर्ध-कीमती खनिज संग्रह · मास्टर २०२६ संस्करण" if lang == "hi" else "વાસ્તુશિલ્પીય પાષાણ અને અર્ધ-કિંમતી ખનિજ સંગ્રહ · માસ્ટર ૨૦૨૬ આવૃત્તિ"
    c_corp = "STONE TECH PRIVATE LIMITED · SPECIFICATION CATALOGUE 2026-2027" if lang == "en" else "स्टोन टेक प्राइवेट लिमिटेड · वास्तुशिल्पीय विनिर्देश कैटलॉग २०२६-२०२७" if lang == "hi" else "સ્ટોન ટેક પ્રાઇવેટ લિમિટેડ · વાસ્તુશિલ્પીય વિશિષ્ટતા કેટલોગ ૨૦૨૬-૨૦૨૭"
    c_enq = "AHMEDABAD EXPERIENCE CENTER · DIRECT FACTORY ENQUIRIES: +91 97844 52998 / +91 77420 90866" if lang == "en" else "अहमदाबाद एक्सपीरियंस सेंटर · प्रत्यक्ष फैक्टरी पूछताछ: +91 97844 52998 / +91 77420 90866" if lang == "hi" else "અમદાવાદ એક્સપિરિયન્સ સેન્ટર · સીધી ફેક્ટરી પૂછપરછ: +91 97844 52998 / +91 77420 90866"
    c_exp = "WWW.STONETECH.IN · MUNDRA &amp; JNPT EXPORTS" if lang == "en" else "WWW.STONETECH.IN · मुंद्रा एवं जेएनपीटी बंदरगाह निर्यात" if lang == "hi" else "WWW.STONETECH.IN · મુન્દ્રા અને જેએનપીટી બંદરો નિકાસ"

    parts.append(f"""
<div class="page cover-page">
  <div class="cover-border">
    <div class="cover-inner-border"></div>

    <div class="cover-header">
      <div class="cover-medallion">
        <img src="{emblem_src}" alt="Stone Tech Emblem">
      </div>
      <div class="cover-brand">{cover_brand}</div>
      <div class="cover-subbrand">{cover_subbrand}</div>
    </div>

    <div class="cover-body">
      <div class="cover-title">
        {c_title}
      </div>
      <div class="cover-subtitle">
        {c_sub}
      </div>
      <div class="cover-pills">
        <div class="cover-pill">{pill1}</div>
        <div class="cover-pill">{pill2}</div>
        <div class="cover-pill">{pill3}</div>
        <div class="cover-pill">{pill4}</div>
      </div>
    </div>

    <div class="cover-footer">
      <div>
        <strong>{c_corp}</strong><br>
        {c_enq}
      </div>
      <div>
        {COMMON_I18N['page_x_of_y'][lang](1, total_pages, lang)}
      </div>
      <div>
        {c_exp}
      </div>
    </div>
  </div>
</div>
""")

    # =========================================================================
    # PAGE 2: MATERIALITY & SPECIFICATION OVERVIEW
    # =========================================================================
    current_page = 2

    prod_contact_footer = (
        "WWW.STONETECH.IN · DIRECT FACTORY ENQUIRIES: +91 97844 52998 / +91 77420 90866"
        if lang == "en"
        else "WWW.STONETECH.IN · प्रत्यक्ष फैक्टरी पूछताछ: +91 97844 52998 / +91 77420 90866"
        if lang == "hi"
        else "WWW.STONETECH.IN · સીધી ફેક્ટરી પૂછપરછ: +91 97844 52998 / +91 77420 90866"
    )

    if lang == "hi":
        p2_bar_brand = "स्टोन टेक एटेलियर"
        p2_bar_cat = "वास्तुशिल्पीय समीक्षा"
        p2_bar_right = "भूवैज्ञानिक वर्गीकरण एवं वास्तुशिल्पीय अनुप्रयोग"
        p2_c1_title = "भूवैज्ञानिक वर्गीकरण एवं खनिज विज्ञान"
        p2_c1_body = "स्टोन टेक एटेलियर भारतीय उपमहाद्वीप एवं अंतरराष्ट्रीय खदानों से निकाले गए प्राकृतिक पाषाण कंकड़ (पेबल्स) एवं खनिज एग्रीगेट्स का उत्कृष्ट संग्रह प्रस्तुत करता है।<br><br><strong>१. क्रिस्टलीय क्वार्ट्ज़ एवं अकीक (कैलसीडोनी):</strong> रोज़ क्वार्ट्ज़, क्रिस्टल क्वार्ट्ज़, ग्रीन एवेंच्यूरिन एवं कार्नेलियन जो मोह्स कठोरता ७.० और उच्च पारभासकता प्रदान करते हैं।<br><br><strong>२. माइक्रोक्रिस्टलाइन गोमेद (ओनिक्स) एवं एरागोनाइट:</strong> प्राकृतिक धारीदार कैल्साइट परतों से प्राप्त। प्रकाश के नीचे पारभासी चमक, इनडोर रिफ्लेक्टिंग ट्रे एवं स्पा के लिए आदर्श।<br><br><strong>३. ज्वालामुखीय बेसाल्ट एवं ग्रेनाइट:</strong> उच्च घनत्व वाला आग्नेय पाषाण (कठोरता ६.०–६.५) जिसे शीशे जैसी चमक या मखमली मैट फिनिश में तराशा गया है। अत्यधिक भार-सहनशील।<br><br><strong>४. रूपांतरित कैल्साइट एवं संगमरमर:</strong> मकराना, जैसलमेर एवं कोटा पाषाण की कोणीय चिप्स जो पारगम्य ड्राइववे, फ्रेंच ड्रेन एवं टेराज़ो फर्श हेतु सर्वथा उपयुक्त हैं।"
        p2_c2_title = "साइज़ स्पेक्ट्रम एवं ग्रेडिंग मानक"
        p2_c2_intro = "प्रत्येक बैच का यांत्रिक वाइब्रो-स्क्रीनिंग और हस्त-निरीक्षण किया जाता है ताकि आकार की एकरूपता सुनिश्चित रहे।"
        p2_th_tier = "ग्रेडिंग स्तर"
        p2_th_size = "नाममात्र साइज़"
        p2_th_use = "मुख्य वास्तुशिल्पीय उपयोग"
        p2_t1_tier = "नैनो एवं माइक्रो-चिप्स"
        p2_t1_use = "रेज़िन टेराज़ो मैट्रिक्स, वेनेशियन प्लास्टर, बोनसाई ट्रे"
        p2_t2_tier = "मिनी कंकड़ एवं चिप्स"
        p2_t2_use = "रेज़िन-बाउंड पैदल मार्ग, ज़ेन गार्डन, प्लांटर टॉपिंग"
        p2_t3_tier = "मानक नदी कंकड़ (रिवर पेबल्स)"
        p2_t3_use = "जल प्रपात, स्विमिंग पूल कोपिंग, आंगन बॉर्डर्स"
        p2_t4_tier = "बड़े लैंडस्केप पाषाण"
        p2_t4_use = "शुष्क नदी तल, जल प्रपात, बायो-स्वेल्स, ट्री ग्रैट्स"
        p2_t5_tier = "जंबो बोल्डर्स एवं चपटे पाषाण"
        p2_t5_use = "केंद्रबिंदु बोल्डर, नंगे पैर चलने के पथ, स्टेपिंग स्टोन्स"
        p2_fin_head = "सतह फिनिश विकल्प:"
        p2_fin_1 = "• टंबल्ड उच्च चमक: बहु-चरणीय डायमंड टम्बलिंग से प्राप्त शीशे जैसी चमकदार फिनिश।"
        p2_fin_2 = "• प्राकृतिक नदी तल मैट: बिना किसी रासायनिक सीलर के रेशमी चिकना स्पर्श।"
        p2_fin_3 = "• कोणीय क्रश्ड चिप्स: सटीक जॉ-क्रश्ड चिप्स जो उत्कृष्ट इंटरलॉकिंग प्रदान करते हैं।"
        p2_c3_title = "प्रमुख वास्तुशिल्पीय अनुप्रयोग क्षेत्र"
        p2_c3_body = "<strong>• समकालीन ज़ेन एवं जापानी उद्यान:</strong> एलिगेंट ब्लैक और व्हाइट ड्यू का उच्च-कंट्रास्ट संयोजन ध्यानपूर्ण शांति और शाश्वत सौंदर्य निर्मित करता है।<br><br><strong>• लक्जरी पूल बॉर्डर्स एवं बीच एंट्री:</strong> गोल टंबल्ड कंकड़ नंगे पैर चलने पर आरामदायक प्राकृतिक एक्यूप्रेशर और गीली स्थिति में भी फिसलन-रोधी सुरक्षा देते हैं।<br><br><strong>• जल प्रपात एवं वाटर फीचर्स:</strong> पॉलिश्ड अकीक बहते पानी के नीचे अपने बहुमूल्य रत्न जैसे रंगों को और अधिक निखारते हैं और काई नहीं जमने देते।<br><br><strong>• पारगम्य पेविंग एवं पर्यावरण-अनुकूल ड्राइववे:</strong> यांत्रिक रूप से इंटरलॉक होने वाले पाषाण भारी वाहन भार सहते हुए वर्षा जल को भूजल में समाहित करते हैं।"
    elif lang == "gu":
        p2_bar_brand = "સ્ટોન ટેક એટેલિયર"
        p2_bar_cat = "વાસ્તુશિલ્પીય ઝાંખી"
        p2_bar_right = "ભૂસ્તરશાસ્ત્રીય વર્ગીકરણ અને વાસ્તુશિલ્પીય ઉપયોગ"
        p2_c1_title = "ભૂસ્તરશાસ્ત્રીય વર્ગીકરણ અને ખનિજ વિજ્ઞાન"
        p2_c1_body = "સ્ટોન ટેક એટેલિયર ભારતીય ઉપમહાદ્વીપ અને આંતરરાષ્ટ્રીય ખાણોમાંથી મેળવેલ કુદરતી પથ્થરના કાંકરા (પેબલ્સ) અને ખનિજ એગ્રીગેટ્સનો અદ્ભુત સંગ્રહ પ્રદાન કરે છે.<br><br><strong>૧. ક્રિસ્ટલાઇન ક્વાર્ટ્ઝ અને અકીક (કેલ્સેડોની):</strong> રોઝ ક્વાર્ટ્ઝ, ક્રિસ્ટલ ક્વાર્ટ્ઝ, ગ્રીન એવેન્ચ્યુરિન અને કાર્નેલિયન જે મોહ્સ કઠિનતા ૭.૦ અને ઉચ્ચ પારભાસકતા પ્રદાન કરે છે.<br><br><strong>૨. માઇક્રોક્રિસ્ટલાઇન ગોમેદ (ઓનિક્સ) અને એરાગોનાઇટ:</strong> કુદરતી પટ્ટાવાળા કેલ્સાઇટ સ્તરોમાંથી મેળવેલ. પ્રકાશ હેઠળ પારભાસી ચમક, ઇન્ટિરિયર ટ્રે અને સ્પા માટે આદર્શ.<br><br><strong>૩. જ્વાળામુખી બેસાલ્ટ અને ગ્રેનાઇટ:</strong> ઉચ્ચ ઘનતા ધરાવતો પથ્થર જેને અરીસા જેવી ચમક કે મખમલી મેટ ફિનિશમાં કંડારવામાં આવેલ છે. ભારે ભાર-વહન ક્ષમતા.<br><br><strong>૪. રૂપાંતરિત કેલ્સાઇટ અને આરસપહાણ:</strong> મકરાણા, જેસલમેર અને કોટા પથ્થરની ચિપ્સ જે પારગમ્ય ડ્રાઇવવે અને ટેરાઝો ફ્લોરિંગ માટે ઉત્તમ છે."
        p2_c2_title = "સાઇઝ સ્પેક્ટ્રમ અને ગ્રેડિંગ ધોરણો"
        p2_c2_intro = "દરેક બેચનું વાઇબ્રો-સ્ક્રીનિંગ અને હાથ વડે નિરીક્ષણ કરવામાં આવે છે જેથી કદની એકરૂપતા જળવાઈ રહે."
        p2_th_tier = "ગ્રેડિંગ સ્તર"
        p2_th_size = "સાઇઝ"
        p2_th_use = "મુખ્ય વાસ્તુશિલ્પીય ઉપયોગ"
        p2_t1_tier = "નેનો અને માઇક્રો-ચિપ્સ"
        p2_t1_use = "રેઝિન ટેરાઝો, વેનેશિયન પ્લાસ્ટર, બોન્સાઇ ટ્રે"
        p2_t2_tier = "મિની કાંકરા અને ચિપ્સ"
        p2_t2_use = "રેઝિન પગદંડી, ઝેન ગાર્ડન, પ્લાન્ટર ટોપિંગ"
        p2_t3_tier = "સામાન્ય નદીના કાંકરા (રિવર પેબલ્સ)"
        p2_t3_use = "જળ પ્રપાત, સ્વિમિંગ પૂલ બોર્ડર, આંગણાની કિનારી"
        p2_t4_tier = "મોટા લેન્ડસ્કેપ પથ્થરો"
        p2_t4_use = "શુષ્ક નદી તળ, જળ પ્રપાત, ટ્રી ગ્રીડ્સ"
        p2_t5_tier = "જમ્બો બોલ્ડર્સ અને સપાટ પથ્થર"
        p2_t5_use = "કેન્દ્રબિંદુ બોલ્ડર્સ, પગદંડી, સ્ટેપિંગ સ્ટોન"
        p2_fin_head = "સપાટી ફિનિશ વિકલ્પો:"
        p2_fin_1 = "• ટમ્બલ્ડ ઉચ્ચ ચમક: ડાયમંડ ટમ્બલિંગ વડે કાચ જેવી ચળકાટવાળી ફિનિશ."
        p2_fin_2 = "• કુદરતી નદી તળ મેટ: કોઈપણ કેમિકલ સીલર વગર રેશમી કુદરતી સ્પર્શ."
        p2_fin_3 = "• ખૂણાવાળી ક્રશ્ડ ચિપ્સ: ચોક્કસ ક્રશ્ડ ચિપ્સ જે ઉત્તમ ઇન્ટરલોકિંગ આપે છે."
        p2_c3_title = "મુખ્ય વાસ્તુશિલ્પીય એપ્લિકેશન ક્ષેત્રો"
        p2_c3_body = "<strong>• સમકાલીન ઝેન અને જાપાની બગીચાઓ:</strong> એલિગન્ટ બ્લેક અને વ્હાઇટ ડ્યૂનું કોન્ટ્રાસ્ટ સંયોજન ધ્યાનપૂર્ણ શાંતિ અને શાશ્વત સુંદરતા બનાવે છે.<br><br><strong>• લક્ઝરી પૂલ બોર્ડર્સ અને બીચ એન્ટ્રી:</strong> ગોળાકાર કાંકરા ઉઘાડા પગે ચાલવા માટે આરામદાયક એક્યુપ્રેશર અને ભીની સ્થિતિમાં પણ લપસણ-મુક્ત સુરક્ષા આપે છે.<br><br><strong>• જળ પ્રપાત અને ફુવારા:</strong> પોલિશ્ડ અકીક વહેતા પાણી નીચે રત્ન જેવો ચમકે છે અને લીલ જામવા દેતો નથી.<br><br><strong>• પારગમ્ય પેવિંગ અને ઇકો-ડ્રાઇવવે:</strong> ઇન્ટરલોકિંગ પથ્થરો ભારે વાહનોનું વજન સહન કરીને વરસાદી પાણીને જમીનમાં ઉતારે છે."
    else:
        p2_bar_brand = "STONE TECH ATELIER"
        p2_bar_cat = "ARCHITECTURAL OVERVIEW"
        p2_bar_right = "GEOLOGICAL CLASSIFICATION &amp; APPLICATION SPECTRUM"
        p2_c1_title = "GEOLOGICAL CLASSIFICATION &amp; MINERALOGY"
        p2_c1_body = "Stone Tech Atelier curates pure mineralogical aggregates extracted from pristine riverbeds, quartz veins, and deep geological formations across the Indian subcontinent and international quarries.<br><br><strong>1. Crystalline Quartz &amp; Chalcedony:</strong> Rose Quartz, Crystal Quartz, Green Aventurine, and Carnelian deliver exceptional Mohs hardness (7.0) and high translucence for luxury water bodies and backlit features.<br><br><strong>2. Microcrystalline Onyx &amp; Aragonite:</strong> Sourced from multi-toned banded calcite strata. Translucent under ambient illumination, ideal for interior reflecting trays, spa sanctuaries, and boutique foyers.<br><br><strong>3. Volcanic Basalt &amp; Granite:</strong> High-density igneous stone (Mohs 6.0–6.5) tumbled to piano-gloss obsidian or natural matte velvet. Extreme resistance to vehicular load, freeze-thaw cycles, and acid rain.<br><br><strong>4. Metamorphic Calcite &amp; Marble:</strong> Makrana, Jaisalmer, and Kota crushed chips engineered for high-compaction permeable driveways, French drains, and terrazzo matrixes."
        p2_c2_title = "SIZING SPECTRUM &amp; GRADING STANDARDS"
        p2_c2_intro = "Every batch undergoes mechanical vibro-screening and hand optical sorting to ensure strict size consistency and defect elimination."
        p2_th_tier = "Grading Tier"
        p2_th_size = "Nominal Size"
        p2_th_use = "Primary Architectural Use"
        p2_t1_tier = "Nano &amp; Micro-Chips"
        p2_t1_use = "Resin terrazzo matrix, Venetian plaster, bonsai top"
        p2_t2_tier = "Mini Pebbles &amp; Chips"
        p2_t2_use = "Resin-bound footpaths, raked zen gardens, planter dressing"
        p2_t3_tier = "Standard River Pebbles"
        p2_t3_use = "Water rills, swimming pool copings, courtyard margins"
        p2_t4_tier = "Large Landscape Stones"
        p2_t4_use = "Dry riverbeds, water cascades, bioswales, tree grates"
        p2_t5_tier = "Jumbo Boulders &amp; Flat"
        p2_t5_use = "Focal boulders, barefoot paths, stepping stone cairns"
        p2_fin_head = "Surface Finishes:"
        p2_fin_1 = "• <em>Tumbled High-Luster:</em> Multi-stage diamond tumbling producing glossy glass-like sheen."
        p2_fin_2 = "• <em>Natural Riverbed Matte:</em> Silky smooth tactile touch without synthetic sealers."
        p2_fin_3 = "• <em>Angular Crushed:</em> Precision jaw-crushed chips with sharp faceted compaction."
        p2_c3_title = "CORE APPLICATION DOMAINS"
        p2_c3_body = "<strong>• Contemporary Zen &amp; Japanese Gardens:</strong> High-contrast pairings of Elegant Black with White Dew create meditative stillness and timeless negative space.<br><br><strong>• Luxury Pool Surrounds &amp; Beach Entries:</strong> Tumbled round stones provide soothing barefoot comfort, natural reflexology, and high slip resistance wet or dry.<br><br><strong>• Water Features &amp; Cascades:</strong> Polished agates intensify their vivid jewel tones under flowing water, reflecting submerged lighting without algae accumulation.<br><br><strong>• Permeable Paving &amp; Eco-Driveways:</strong> Mechanically interlocking angular chips provide heavy load stability while enabling rapid rainwater infiltration and groundwater replenishment."

    parts.append(f"""
<div class="page">
  <div class="prod-header-bar">
    <div class="prod-header-left">
      <span class="prod-brand-mini">{p2_bar_brand}</span>
      <span class="prod-cat-badge">{p2_bar_cat}</span>
    </div>
    <div class="prod-header-right">{p2_bar_right}</div>
  </div>

  <div class="overview-grid">
    <div class="overview-card">
      <div class="overview-title">{p2_c1_title}</div>
      <div class="overview-body">
        {p2_c1_body}
      </div>
    </div>

    <div class="overview-card">
      <div class="overview-title">{p2_c2_title}</div>
      <div class="overview-body">
        {p2_c2_intro}
        <table class="grading-table">
          <thead>
            <tr>
              <th>{p2_th_tier}</th>
              <th>{p2_th_size}</th>
              <th>{p2_th_use}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>{p2_t1_tier}</strong></td>
              <td>{localize_dimensions('0.5 – 5 mm', lang)}</td>
              <td>{p2_t1_use}</td>
            </tr>
            <tr>
              <td><strong>{p2_t2_tier}</strong></td>
              <td>{localize_dimensions('5 – 15 mm', lang)}</td>
              <td>{p2_t2_use}</td>
            </tr>
            <tr>
              <td><strong>{p2_t3_tier}</strong></td>
              <td>{localize_dimensions('15 – 35 mm', lang)}</td>
              <td>{p2_t3_use}</td>
            </tr>
            <tr>
              <td><strong>{p2_t4_tier}</strong></td>
              <td>{localize_dimensions('35 – 70 mm', lang)}</td>
              <td>{p2_t4_use}</td>
            </tr>
            <tr>
              <td><strong>{p2_t5_tier}</strong></td>
              <td>{localize_dimensions('80 – 180 mm', lang)}</td>
              <td>{p2_t5_use}</td>
            </tr>
          </tbody>
        </table>
        <br>
        <strong>{p2_fin_head}</strong><br>
        {p2_fin_1}<br>
        {p2_fin_2}<br>
        {p2_fin_3}
      </div>
    </div>

    <div class="overview-card">
      <div class="overview-title">{p2_c3_title}</div>
      <div class="overview-body">
        {p2_c3_body}
      </div>
    </div>
  </div>

  <div class="prod-footer-bar">
    <span>{p2_bar_brand} · {c_title.replace('<br><span>', ' - ').replace('</span>', '')}</span>
    <span>{COMMON_I18N['page_x_of_y'][lang](2, total_pages, lang)}</span>
    <span>{prod_contact_footer}</span>
  </div>
</div>
""")

    # =========================================================================
    # PAGES 3 - 21: 75 PRODUCTS (4 per page)
    # =========================================================================
    for p_idx in range(num_product_pages):
        current_page += 1
        start_idx = p_idx * items_per_page
        end_idx = min(start_idx + items_per_page, total_products)
        page_items = PEBBLES[start_idx:end_idx]

        if lang == "hi":
            prod_brand_mini = "स्टोन टेक एटेलियर"
            prod_cat_badge = "वास्तुशिल्पीय संग्रह"
            prod_header_right = f"पृष्ठ {to_indic(p_idx + 1, lang)} / {to_indic(num_product_pages, lang)} · उत्पाद क्रमांक #{to_indic(start_idx + 1, lang)}–#{to_indic(end_idx, lang)}"
            prod_contact_footer = "WWW.STONETECH.IN · प्रत्यक्ष फैक्टरी पूछताछ: +91 97844 52998 / +91 77420 90866"
        elif lang == "gu":
            prod_brand_mini = "સ્ટોન ટેક એટેલિયર"
            prod_cat_badge = "વાસ્તુશિલ્પીય સંગ્રહ"
            prod_header_right = f"પૃષ્ઠ {to_indic(p_idx + 1, lang)} / {to_indic(num_product_pages, lang)} · ઉત્પાદન ક્રમાંક #{to_indic(start_idx + 1, lang)}–#{to_indic(end_idx, lang)}"
            prod_contact_footer = "WWW.STONETECH.IN · સીધી ફેક્ટરી પૂછપરછ: +91 97844 52998 / +91 77420 90866"
        else:
            prod_brand_mini = "STONE TECH ATELIER"
            prod_cat_badge = "ARCHITECTURAL COLLECTION"
            prod_header_right = f"PAGE {p_idx + 1} OF {num_product_pages} · PRODUCTS #{start_idx + 1}–#{end_idx}"
            prod_contact_footer = "WWW.STONETECH.IN · DIRECT FACTORY ENQUIRIES: +91 97844 52998 / +91 77420 90866"

        parts.append(f"""
<div class="page">
  <div class="prod-header-bar">
    <div class="prod-header-left">
      <span class="prod-brand-mini">{prod_brand_mini}</span>
      <span class="prod-cat-badge">{prod_cat_badge}</span>
    </div>
    <div class="prod-header-right">{prod_header_right}</div>
  </div>

  <div class="product-grid">
""")

        for item in page_items:
            item_id = item["id"]
            img_rel_path = f"file://{os.path.join(ASSETS_DIR, f'pebble_{item_id:03d}.jpg')}"

            p_code = item["code"]
            p_info = PEBBLE_ITEMS_I18N.get(p_code, {})
            p_name = item["name"]

            if lang == "hi":
                display_name = p_info.get("name_hi", p_name)
                local_cat = p_info.get("cat_hi", item["category"])
                item_finish = p_info.get("finish_hi", item["finish"])
                item_mineral = p_info.get("mineral_hi", item["mineral"])
                item_color = p_info.get("color_hi", item["color"])
                item_use = p_info.get("use_hi", item["use"])
                item_desc = p_info.get("desc_hi", item["desc"])
            elif lang == "gu":
                display_name = p_info.get("name_gu", p_name)
                local_cat = p_info.get("cat_gu", item["category"])
                item_finish = p_info.get("finish_gu", item["finish"])
                item_mineral = p_info.get("mineral_gu", item["mineral"])
                item_color = p_info.get("color_gu", item["color"])
                item_use = p_info.get("use_gu", item["use"])
                item_desc = p_info.get("desc_gu", item["desc"])
            else:
                display_name = p_name
                local_cat = item["category"]
                item_finish = item["finish"]
                item_mineral = item["mineral"]
                item_color = item["color"]
                item_use = item["use"]
                item_desc = item["desc"]

            label_size = "Sizes" if lang == "en" else "साइज" if lang == "hi" else "સાઇઝ"
            label_mineral = "Mineral" if lang == "en" else "खनिज" if lang == "hi" else "ખનિજ"
            label_color = "Color Tone" if lang == "en" else "रंग" if lang == "hi" else "રંગ"
            label_app = "Application" if lang == "en" else "उपयोग" if lang == "hi" else "ઉપયોગ"

            parts.append(f"""
    <div class="product-card">
      <div class="product-img-box">
        <img src="{img_rel_path}" alt="{p_name}">
      </div>
      <div class="product-info">
        <div class="product-meta-row">
          <span class="prod-code-badge">{item['code']}</span>
          <span class="prod-cat-pill">{local_cat}</span>
        </div>
        <div class="product-name">{display_name}</div>
        <div class="product-finish">{item_finish}</div>
        <div class="product-spec-line"><strong>{label_size}:</strong> {localize_dimensions(item['sizes'], lang)}</div>
        <div class="product-spec-line"><strong>{label_mineral}:</strong> {item_mineral}</div>
        <div class="product-spec-line"><strong>{label_color}:</strong> {item_color}</div>
        <div class="product-spec-line"><strong>{label_app}:</strong> {item_use}</div>
        <div class="product-desc">{item_desc}</div>
      </div>
    </div>
""")

        # If on the last page and fewer than 4 items, add feature card
        if len(page_items) < 4:
            if lang == "hi":
                f_title = "कस्टम ग्रेडेशन एवं रंग पैलेट"
                f_desc = """स्टोन टेक एटेलियर बड़े पैमाने की वास्तुशिल्पीय परियोजनाओं, लक्जरी रिसॉर्ट्स और सार्वजनिक परिसरों हेतु कस्टम साइज़िंग, टम्बल कैलिब्रेशन और खनिज मिश्रण उपलब्ध कराता है।<br><br>
        <strong>प्रोजेक्ट ऑर्डर पर उपलब्ध:</strong><br>
        • विशेष मेश छलनी साइज़िंग (०.२ मिमी रेत से २५० मिमी बोल्डर्स तक)<br>
        • विशेष पैनटोन / RAL रंग मिलान एवं पॉली-एग्रीगेट मिश्रण<br>
        • प्रमाणित यूवी बाइंडर्स के साथ रेज़िन एग्रीगेट किट<br>
        • बहु-चरणीय परियोजनाओं हेतु समर्पित खदान बैच लॉट प्रमाणन"""
            elif lang == "gu":
                f_title = "કસ્ટમ ગ્રેડેશન અને રંગ પેલેટ"
                f_desc = """સ્ટોન ટેક એટેલિયર મોટા પાયાના વાસ્તુશિલ્પીય પ્રોજેક્ટ્સ, લક્ઝરી રિસોર્ટ્સ અને જાહેર સ્થળો માટે કસ્ટમ સાઇઝિંગ, ટમ્બલ કેલિબ્રેશન અને ખનિજ મિશ્રણ પ્રદાન કરે છે.<br><br>
        <strong>પ્રોજેક્ટ ઓર્ડર પર ઉપલબ્ધ:</strong><br>
        • કસ્ટમ ચાળણી સાઇઝિંગ (૦.૨ મીમી રેતીથી ૨૫૦ મીમી બોલ્ડર્સ સુધી)<br>
        • ખાસ પેન્ટોન / RAL કલર મેચિંગ અને પોલી-એગ્રીગેટ મિશ્રણ<br>
        • પ્રમાણિત યુવી બાઈન્ડર્સ સાથે રેઝિન એગ્રીગેટ કિટ્સ<br>
        • બહુ-તબક્કાવાર પ્રોજેક્ટ્સ માટે સમર્પિત ક્વોરી બેચ પ્રમાણપત્ર"""
            else:
                f_title = "CUSTOM GRADATIONS &amp; PALETTES"
                f_desc = """Stone Tech Atelier offers bespoke sizing, mechanical tumble calibration, and custom mineral blends for large-scale architectural projects, luxury resorts, and civic plazas.<br><br>
        <strong>Available on Project Order:</strong><br>
        • Custom mesh sieve sizing (from 0.2mm sand to 250mm boulders)<br>
        • Tailored Pantone / RAL color matching &amp; poly-aggregate blends<br>
        • Ready-to-use pre-blended resin aggregate kits with certified UV binders<br>
        • Dedicated quarry batch lot certification for multi-phase hospitality builds"""

            parts.append(f"""
    <div class="feature-spec-card">
      <div class="feature-spec-title">{f_title}</div>
      <div class="feature-spec-desc">
        {f_desc}
      </div>
    </div>
""")

        footer_brand = "STONE TECH ATELIER · NATURAL STONE PEBBLES &amp; SEMI-PRECIOUS AGGREGATES" if lang == "en" else "स्टोन टेक एटेलियर · प्राकृतिक पाषाण कंकड़ (पेबल्स) एवं अर्ध-कीमती खनिज संग्रह" if lang == "hi" else "સ્ટોન ટેક એટેલિયર · કુદરતી પથ્થરના કાંકરા (પેબલ્સ) અને અર્ધ-કિંમતી ખનિજ સંગ્રહ"
        parts.append(f"""
  </div>

  <div class="prod-footer-bar">
    <span>{footer_brand}</span>
    <span>{COMMON_I18N['page_x_of_y'][lang](current_page, total_pages, lang)}</span>
    <span>{prod_contact_footer}</span>
  </div>
</div>
""")

    # =========================================================================
    # PAGE 22: TECHNICAL DATA & AREA COVERAGE GUIDE
    # =========================================================================
    current_page += 1
    if lang == "hi":
        p22_head_badge = "इंजीनियरिंग डेटा"
        p22_head_right = "कवरेज कैलकुलेटर एवं इंस्टॉलेशन विनिर्देश"
        p22_t1_title = "क्षेत्र कवरेज एवं मात्रा आकलन मैट्रिक्स"
        p22_t1_intro = "आवश्यक कंकड़ (पेबल्स) की मात्रा एग्रीगेट के आकार और वांछित परत की गहराई पर निर्भर करती है। जमीन को पूर्णतः ढकने के लिए, परत की गहराई कंकड़ के अधिकतम व्यास की कम से कम १.५ से २ गुना होनी चाहिए।"
        p22_th_grade = "कंकड़ ग्रेड"
        p22_th_depth = "परत की गहराई"
        p22_th_cov = "१०० किग्रा में कवरेज"
        p22_th_wt = "प्रति वर्ग मीटर भार"
        p22_g1 = "माइक्रो चिप्स (३–८ मिमी)"
        p22_g2 = "मिनी कंकड़ (१०–२५ मिमी)"
        p22_g3 = "मध्यम नदी कंकड़ (२५–५० मिमी)"
        p22_g4 = "बड़े लैंडस्केप पाषाण (४०–७० मिमी)"
        p22_g5 = "जंबो बोल्डर्स (८०–१२० मिमी)"
        p22_t1_formula = "<strong>सूत्र:</strong> <em>क्षेत्रफल (वर्ग मीटर) × गहराई (मीटर) × घनत्व (~१६५० किग्रा/घन मीटर) = कुल मीट्रिक टन</em><br><em>नोट: समतलीकरण और विषम सतह हेतु ५–८% अतिरिक्त सामग्री जोड़ें।</em>"
        p22_t2_title = "स्थापना एवं रखरखाव के सर्वोत्तम मानक"
        p22_t2_body = """<strong>१. सब-बेस की तैयारी:</strong><br>
        भूमि को निर्धारित गहराई तक खोदें। उप-मिट्टी को ९५% मानक स्तर तक समतल करें। जमीन धंसने से रोकने हेतु ५० मिमी कॉम्पैक्टेड बेस परत बिछाएं।<br><br>
        <strong>२. उच्च-प्रदर्शन जियोटेक्सटाइल झिल्ली:</strong><br>
        हमेशा भारी-भरकम नॉन-वोवेन पॉलीप्रोपाइलीन जियोटेक्सटाइल कपड़ा (न्यूनतम १२० जीएसएम) लगाएं। यह खरपतवार रोकता है और कंकड़ों को मिट्टी में धंसने से बचाता है तथा वर्षा जल की निकासी सुनिश्चित करता है।<br><br>
        <strong>३. परिधि किनारा (एजिंग):</strong><br>
        बगीचे की सभी सीमाओं पर एल्युमिनियम या प्राकृतिक ग्रेनाइट कर्ब लगाएं ताकि कंकड़ लॉन या रास्तों पर न बिखरें।<br><br>
        <strong>४. सफाई एवं रखरखाव:</strong><br>
        धूल हटाने हेतु समय-समय पर पानी के मध्यम दबाव वाले जेट स्प्रे (अधिकतम ६० बार) से धोएं। पतझड़ में पत्तियां हटाने हेतु हल्के ब्लोअर का उपयोग करें।"""
    elif lang == "gu":
        p22_head_badge = "એન્જિનિયરિંગ ડેટા"
        p22_head_right = "કવરેજ કેલ્ક્યુલેટર અને ઇન્સ્ટોલેશન વિશિષ્ટતાઓ"
        p22_t1_title = "વિસ્તાર કવરેજ અને જથ્થા આકલન મેટ્રિક્સ"
        p22_t1_intro = "જરૂરી કાંકરાનો જથ્થો એગ્રીગેટના કદ અને ઇચ્છિત ઊંડાઈ પર આધાર રાખે છે. જમીનને સંપૂર્ણ ઢાંકવા માટે, સ્તરની ઊંડાઈ કાંકરાના મહત્તમ વ્યાસ કરતા ઓછામાં ઓછી ૧.૫ થી ૨ ગણી હોવી જોઈએ."
        p22_th_grade = "કાંકરા ગ્રેડ"
        p22_th_depth = "સ્તરની ઊંડાઈ"
        p22_th_cov = "૧૦૦ કિગ્રામાં કવરેજ"
        p22_th_wt = "પ્રતિ ચોરસ મીટર વજન"
        p22_g1 = "માઇક્રો ચિપ્સ (૩–૮ મીમી)"
        p22_g2 = "મિની કાંકરા (૧૦–૨૫ મીમી)"
        p22_g3 = "મધ્યમ નદી કાંકરા (૨૫–૫૦ મીમી)"
        p22_g4 = "મોટા લેન્ડસ્કેપ પથ્થરો (૪૦–૭૦ મીમી)"
        p22_g5 = "જમ્બો બોલ્ડર્સ (૮૦–૧૨૦ મીમી)"
        p22_t1_formula = "<strong>સૂત્ર:</strong> <em>ક્ષેત્રફળ (ચોરસ મીટર) × ઊંડાઈ (મીટર) × ઘનતા (~૧૬૫૦ કિગ્રા/ઘન મીટર) = કુલ મેટ્રિક ટન</em><br><em>નોંધ: સમતલીકરણ માટે ૫–૮% વધારાની સામગ્રી ઉમેરો.</em>"
        p22_t2_title = "સ્થાપન અને જાળવણીના ઉત્કૃષ્ટ ધોરણો"
        p22_t2_body = """<strong>૧. સબ-બેઝની તૈયારી:</strong><br>
        જમીનને નિયત ઊંડાઈ સુધી ખોદો. માટીને ૯૫% સમતલ કરો. જમીન બેસી ન જાય તે માટે ૫૦ મીમી કોમ્પેક્ટેડ બેઝ સ્તર પાથરો.<br><br>
        <strong>૨. ઉચ્ચ-ગુણવત્તાવાળું જીઓટેક્સટાઇલ કાપડ:</strong><br>
        હંમેશા હેવી-ડ્યુટી પોલીપ્રોપીલીન જીઓટેક્સટાઇલ ફેબ્રિક (ન્યૂનતમ ૧૨૦ જીએસએમ) પાથરો. તે નીંદણ અટકાવે છે અને કાંકરાને માટીમાં ડૂબવા દેતું નથી તથા પાણીનો નિકાલ કરે છે.<br><br>
        <strong>૩. કિનારી (એજિંગ):</strong><br>
        બગીચાની કિનારીઓ પર એલ્યુમિનિયમ અથવા ગ્રેનાઇટ કર્બ લગાવો જેથી કાંકરા બહાર વિખેરાઈ ન જાય.<br><br>
        <strong>૪. સફાઈ અને જાળવણી:</strong><br>
        ધૂળ દૂર કરવા માટે સમય-સમય પર સામાન્ય દબાણવાળા પાણીના સ્પ્રેથી ધોઈ લો."""
    else:
        p22_head_badge = "ENGINEERING DATA"
        p22_head_right = "COVERAGE CALCULATOR &amp; INSTALLATION SPECIFICATIONS"
        p22_t1_title = "AREA COVERAGE &amp; QUANTITY ESTIMATION MATRIX"
        p22_t1_intro = "The required pebble quantity depends on the aggregate nominal size and desired layer depth. For optimal ground concealment without soil peek-through, layer depth must equal at least 1.5 to 2 times the maximum pebble diameter."
        p22_th_grade = "Pebble Grade"
        p22_th_depth = "Layer Depth"
        p22_th_cov = "Coverage per 100 kg"
        p22_th_wt = "Weight per m²"
        p22_g1 = "Micro Chips (3–8mm)"
        p22_g2 = "Mini Pebbles (10–25mm)"
        p22_g3 = "Medium River (25–50mm)"
        p22_g4 = "Large Stones (40–70mm)"
        p22_g5 = "Jumbo Boulders (80–120mm)"
        p22_t1_formula = "<strong>Formula:</strong> <em>Area (m²) × Depth (m) × Bulk Density (~1650 kg/m³) = Total Metric Tonnes</em><br><em>Note: Add 5–8% allowance for compaction settling and irregular bedding topography.</em>"
        p22_t2_title = "INSTALLATION &amp; MAINTENANCE BEST PRACTICES"
        p22_t2_body = """<strong>1. Sub-Base Preparation:</strong><br>
        Excavate ground to designated depth. Compact the native subsoil to 95% Standard Proctor density. Lay a 50mm compacted aggregate road-base layer to prevent soft-ground subsidence.<br><br>
        <strong>2. High-Performance Geotextile Membrane:</strong><br>
        Always install heavy-duty non-woven needle-punched polypropylene geotextile fabric (min. 120 gsm). Overlap seams by at least 150mm. This prevents weeds from penetrating and stops stone pebbles from sinking into the subsoil while allowing rapid rainwater drainage.<br><br>
        <strong>3. Perimeter Edging:</strong><br>
        Install rigid aluminum, corten steel, or natural granite curb restraints along all garden margins. Edge restraints must match the finished pebble grade height to eliminate stone scatter onto lawns and walkways.<br><br>
        <strong>4. Cleaning &amp; Seasonal Upkeep:</strong><br>
        Rinse periodically with garden hose or medium-pressure jet spray (max 60 bar) to clear airborne dust and organic debris. For autumn leaf removal, use an electric leaf blower on low throttle held at a shallow angle."""

    parts.append(f"""
<div class="page">
  <div class="prod-header-bar">
    <div class="prod-header-left">
      <span class="prod-brand-mini">{p2_bar_brand}</span>
      <span class="prod-cat-badge">{p22_head_badge}</span>
    </div>
    <div class="prod-header-right">{p22_head_right}</div>
  </div>

  <div class="tech-grid">
    <div class="tech-card">
      <div class="tech-title">{p22_t1_title}</div>
      <div class="overview-body">
        {p22_t1_intro}
        <table class="grading-table" style="margin-top: 3mm;">
          <thead>
            <tr>
              <th>{p22_th_grade}</th>
              <th>{p22_th_depth}</th>
              <th>{p22_th_cov}</th>
              <th>{p22_th_wt}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>{p22_g1}</strong></td>
              <td>{localize_dimensions('15 mm', lang)}</td>
              <td>~ {to_indic('4.0', lang)} m² ({to_indic('43', lang)} sq.ft)</td>
              <td>~ {localize_dimensions('25 kg / m²', lang)}</td>
            </tr>
            <tr>
              <td><strong>{p22_g2}</strong></td>
              <td>{localize_dimensions('30 mm', lang)}</td>
              <td>~ {to_indic('2.2', lang)} m² ({to_indic('24', lang)} sq.ft)</td>
              <td>~ {localize_dimensions('45 kg / m²', lang)}</td>
            </tr>
            <tr>
              <td><strong>{p22_g3}</strong></td>
              <td>{localize_dimensions('50 mm', lang)}</td>
              <td>~ {to_indic('1.3', lang)} m² ({to_indic('14', lang)} sq.ft)</td>
              <td>~ {localize_dimensions('75 kg / m²', lang)}</td>
            </tr>
            <tr>
              <td><strong>{p22_g4}</strong></td>
              <td>{localize_dimensions('75 mm', lang)}</td>
              <td>~ {to_indic('0.9', lang)} m² ({to_indic('10', lang)} sq.ft)</td>
              <td>~ {localize_dimensions('110 kg / m²', lang)}</td>
            </tr>
            <tr>
              <td><strong>{p22_g5}</strong></td>
              <td>{localize_dimensions('120 mm', lang)}</td>
              <td>~ {to_indic('0.5', lang)} m² ({to_indic('5.5', lang)} sq.ft)</td>
              <td>~ {localize_dimensions('180 kg / m²', lang)}</td>
            </tr>
          </tbody>
        </table>
        <br>
        {p22_t1_formula}
      </div>
    </div>

    <div class="tech-card">
      <div class="tech-title">{p22_t2_title}</div>
      <div class="overview-body">
        {p22_t2_body}
      </div>
    </div>
  </div>

  <div class="prod-footer-bar">
    <span>{footer_brand}</span>
    <span>{COMMON_I18N['page_x_of_y'][lang](current_page, total_pages, lang)}</span>
    <span>{prod_contact_footer}</span>
  </div>
</div>
""")

    # =========================================================================
        # =========================================================================
    # PAGE 23: BACK COVER
    # =========================================================================
    current_page += 1
    studio_title = COMMON_I18N["experience_center_title"][lang]
    studio_addr = COMMON_I18N["experience_center_address"][lang]

    if lang == "hi":
        b_brand = "स्टोन टेक एटेलियर"
        b_sub = "वास्तुशिल्पीय पाषाण कंकड़, अकीक एवं अर्ध-कीमती खनिज संग्रह"
        b_c2_title = "वैश्विक निर्यात लॉजिस्टिक्स एवं सुरक्षित पैकेजिंग"
        b_c2_body = """<strong>थोक पैकेजिंग विकल्प:</strong><br>
• २५ किग्रा यूवी-प्रतिरोधी पॉली-बुने हुए बैग<br>
• १.० मीट्रिक टन हेवी-ड्यूटी जंबो बल्क बैग लिफ्टिंग लूप्स के साथ<br>
• ISPM-15 प्रमाणित हीट-ट्रीटेड लकड़ी के निर्यात पैलेट<br><br>
<strong>प्राथमिक समुद्री बंदरगाह:</strong><br>
• मुंद्रा पोर्ट (गुजरात) · हजीरा पोर्ट · जेएनपीटी (मुंबई)<br>
<strong>प्रमाणित गुणवत्ता:</strong> ISO 9001:2015 · CE मार्किंग · पर्यावरण-अनुकूल"""
        b_disc = "प्राकृतिक पाषाण कंकड़, अर्ध-कीमती खनिज एवं वास्तुशिल्पीय एग्रीगेट्स के प्रत्यक्ष निर्माता एवं निर्यातक।<br>सर्वाधिकार सुरक्षित © २०२६-२०२७ स्टोन टेक प्राइवेट लिमिटेड। प्राकृतिक भूवैज्ञानिक विशेषताओं के अनुसार रंगों में भिन्नता संभव है।"
    elif lang == "gu":
        b_brand = "સ્ટોન ટેક એટેલિયર"
        b_sub = "વાસ્તુશિલ્પીય પથ્થરના કાંકરા, અકીક અને અર્ધ-કિંમતી ખનિજ સંગ્રહ"
        b_c2_title = "વૈશ્વિક નિકાસ લોજિસ્ટિક્સ અને પેકેજિંગ"
        b_c2_body = """<strong>જથ્થાબંધ પેકેજિંગ વિકલ્પો:</strong><br>
• ૨૫ કિગ્રા યુવી-પ્રતિરોધક મજબૂત થેલીઓ<br>
• ૧.૦ મેટ્રિક ટન જમ્બો બલ્ક બેગ લિફ્ટિંગ લૂપ્સ સાથે<br>
• ISPM-15 પ્રમાણિત લાકડાના નિકાસ પેલેટ્સ<br><br>
<strong>પ્રાથમિક દરિયાઈ બંદરો:</strong><br>
• મુન્દ્રા પોર્ટ (ગુજરાત) · હઝીરા પોર્ટ · જેએનપીટી (મુંબઈ)<br>
<strong>પ્રમાણિત ગુણવત્તા:</strong> ISO 9001:2015 · CE માર્કિંગ · પર્યાવરણ-અનુકૂળ"""
        b_disc = "કુદરતી પથ્થર કાંકરા, અર્ધ-કિંમતી ખનિજો અને વાસ્તુશિલ્પીય એગ્રીગેટ્સના સીધા ઉત્પાદક અને નિકાસકાર.<br>સર્વાધિકાર સુરક્ષિત © ૨૦૨૬-૨૦૨૭ સ્ટોન ટેક પ્રાઇવેટ લિમિટેડ."
    else:
        b_brand = "STONE TECH ATELIER"
        b_sub = "Architectural Stone Pebbles, Agates &amp; Semi-Precious Aggregates"
        b_c2_title = "GLOBAL EXPORT LOGISTICS &amp; PALLETIZING"
        b_c2_body = """<strong>Bulk Packaging Options:</strong><br>
• 25 kg multi-wall poly-woven bags with UV resistance<br>
• 1.0 MT heavy-duty polypropylene bulk bags with lifting loops<br>
• ISPM-15 certified heat-treated solid timber export pallets<br><br>
<strong>Primary Maritime Gateway Ports:</strong><br>
• Mundra Port (Gujarat) · Hazira Port · JNPT (Mumbai)<br>
<strong>Certified Quality:</strong> ISO 9001:2015 · CE Marking · Non-Toxic"""
        b_disc = "Direct Manufacturer &amp; Exporter of Natural Stone Pebbles, Semi-Precious Minerals &amp; Architectural Aggregates.<br>All rights reserved © 2026-2027 Stone Tech Private Limited. Specifications subject to natural mineral geological variations."

    parts.append(f"""
<div class="page back-page">
  <div class="back-border">
    <div class="cover-inner-border"></div>

    <div class="back-header">
      <div class="cover-medallion" style="margin-bottom: 2mm;">
        <img src="{emblem_src}" alt="Stone Tech Emblem">
      </div>
      <div class="cover-brand" style="font-size: 20pt;">{b_brand}</div>
      <div class="cover-subbrand">{b_sub}</div>
    </div>

    <div class="studio-grid">
      <div class="studio-card">
        <div class="studio-card-title">{studio_title}</div>
        <strong>STONE TECH PRIVATE LIMITED</strong><br>
        {studio_addr}<br><br>
        <strong>Direct WhatsApp &amp; Sales Hotline:</strong> +91 97844 52998 / +91 77420 90866<br>
        <strong>Email:</strong> info@stonetech.in · sales@stonetech.in<br>
        <strong>Official Website:</strong> www.stonetech.in<br>
        <em>Atelier Hours: Monday – Saturday, 10:00 AM – 7:30 PM IST</em>
      </div>

      <div class="studio-card">
        <div class="studio-card-title">{b_c2_title}</div>
        {b_c2_body}
      </div>
    </div>

    <div style="text-align: center; font-size: 7.5pt; color: #94a3b8; border-top: 0.3mm solid #334155; padding-top: 2.5mm;">
      {b_disc}
    </div>
  </div>

  <div class="prod-footer-bar">
    <span>{b_brand} · {c_title.replace('<br><span>', ' - ').replace('</span>', '')}</span>
    <span>{COMMON_I18N['page_x_of_y'][lang](current_page, total_pages, lang)}</span>
    <span>{prod_contact_footer}</span>
  </div>
</div>
""")

    parts.append("</body>")
    parts.append("</html>")
    return "\n".join(parts)


def build_pdf(lang="en"):
    print(f"--- Compiling Stone Pebbles PDF [{lang.upper()}] ---")
    out_name = (
        "StoneTech_Stone_Pebbles_Catalogue_English.pdf" if lang == "en"
        else "StoneTech_Stone_Pebbles_Catalogue_Hindi.pdf" if lang == "hi"
        else "StoneTech_Stone_Pebbles_Catalogue_Gujarati.pdf"
    )
    out_path = os.path.join(REPO_DIR, "public/catalogues", out_name)
    html_content = generate_html(lang)
    html_file = f"/tmp/stone_pebbles_{lang}.html"
    with open(html_file, "w", encoding="utf-8") as f:
        f.write(html_content)

    chrome_bin = get_chrome_executable()
    if not chrome_bin:
        print("ERROR: Chrome binary not found!")
        sys.exit(1)

    t0 = time.time()
    cmd = [
        chrome_bin,
        "--headless=new",
        "--disable-gpu",
        "--no-pdf-header-footer",
        "--print-to-pdf-no-header",
        f"--print-to-pdf={out_path}",
        html_file,
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"Error compiling {lang}:", res.stderr)
        sys.exit(1)

    dur = time.time() - t0
    size_mb = os.path.getsize(out_path) / (1024 * 1024)
    print(f"[{lang.upper()}] compiled in {dur:.2f}s -> {out_name} ({size_mb:.2f} MiB)")

    if lang == "en":
        master_2026 = os.path.join(REPO_DIR, "public/catalogues/StoneTech_Stone_Pebbles_Catalogue_2026.pdf")
        shutil.copyfile(out_path, master_2026)
        print("Mirrored to master default: StoneTech_Stone_Pebbles_Catalogue_2026.pdf")

    # Mirror all generated PDFs to ~/Downloads/ for local inspection
    dl_dir = os.path.expanduser("~/Downloads")
    if os.path.exists(dl_dir):
        shutil.copyfile(out_path, os.path.join(dl_dir, out_name))
        if lang == "en":
            shutil.copyfile(out_path, os.path.join(dl_dir, "StoneTech_Stone_Pebbles_Catalogue_2026.pdf"))
        print(f"Mirrored {out_name} to ~/Downloads/")

    return out_path


def main():
    langs = sys.argv[1:] if len(sys.argv) > 1 else ["en", "hi", "gu"]
    for l in langs:
        build_pdf(l)


if __name__ == "__main__":
    main()

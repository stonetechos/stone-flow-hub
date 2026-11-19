#!/usr/bin/env python3
"""
scripts/compile-glass-bricks-multilingual.py

Compiles Architectural Glass Bricks Catalogues into three authentic multilingual editions:
  - Hollow Glass Bricks (खोखली कांच की ईंटें / પોલી કાચની ઈંટો):
      public/catalogues/StoneTech_Glass_Bricks_Catalogue_English.pdf
      public/catalogues/StoneTech_Glass_Bricks_Catalogue_Hindi.pdf
      public/catalogues/StoneTech_Glass_Bricks_Catalogue_Gujarati.pdf
      (with StoneTech_Glass_Bricks_Catalogue_2026.pdf as master default)
  - Solid Glass Bricks (ठोस कांच की ईंटें / નક્કર કાચની ઈંટો):
      public/catalogues/StoneTech_Solid_Glass_Bricks_Catalogue_English.pdf
      public/catalogues/StoneTech_Solid_Glass_Bricks_Catalogue_Hindi.pdf
      public/catalogues/StoneTech_Solid_Glass_Bricks_Catalogue_Gujarati.pdf
      (with StoneTech_Solid_Glass_Bricks_Catalogue_2026.pdf as master default)
"""

import os
import sys
import time
import subprocess
import shutil

REPO_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.append(os.path.join(REPO_DIR, "scripts"))

from catalogue_translations import (
    get_fonts_css,
    to_indic,
    localize_dimensions,
    GLASS_SERIES,
    GLASS_NAMES,
    COMMON_I18N,
)

import importlib
hgb = importlib.import_module("generate-hollow-glass-bricks-catalogue")
sgb = importlib.import_module("generate-solid-glass-bricks-catalogue")


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


def get_hollow_translations(lang):
    if lang == "hi":
        return {
            "title": "वास्तुशिल्पीय खोखली कांच की ईंटें",
            "subtitle": "प्रकाश पारगमन, ऊष्मारोधी एवं ध्वनि-नियंत्रण कांच श्रृंखला",
            "edition": "२०२६ – २०२७ मास्टर विनिर्देश कैटलॉग",
            "tagline1": "द्वि-कक्षीय आंशिक वैक्यूम सीलबंद कांच के ब्लॉक्स · ४०–४२ dB ध्वनिरोधक ढाल · U-मान ~१.५ W/m²K",
            "tagline2": "सागरीय लहर, रिब्ड, प्रिज्म एवं रंगीन पारभासी वास्तुकला कांच प्रणालियां",
            "division": "खोखली कांच की ईंटें डिवीजन",
            "p1_num": "०१. ऊष्मारोधी कोर",
            "p1_head": "वैक्यूम इन्सुलेशन",
            "p1_body": "ऊर्जा-कुशल इमारतों के लिए १.५ W/m²K तक U-मान प्रदान करने वाला दोहरे-कक्षीय वैक्यूम ग्लास कोर।",
            "p2_num": "०२. ध्वनिरोधक ढाल",
            "p2_head": "४०–४२ dB ध्वनि नियंत्रण",
            "p2_body": "हवाई ध्वनि तरंगों को अवशोषित करने वाली इंजीनियर्ड ध्वनिरोधक प्रणाली जो गोपनीयता सुनिश्चित करती है।",
            "p3_num": "०३. मॉड्यूलर ग्रिड",
            "p3_head": "ड्राय-स्टैक असेंबली",
            "p3_body": "बिना सीमेंट गारे के सटीक पीवीसी स्पेसर ग्रिड और हाई-स्ट्रेंथ सिलिकॉन बॉन्डिंग से त्वरित स्थापना।",
            "p4_num": "०४. उच्च सामर्थ्य",
            "p4_head": "> ७.५ N/mm² दबाव सामर्थ्य",
            "p4_body": "भट्ठी में तपाया गया बोरोसिलिकेट कांच जो ASTM C935 व EN 1051 सुरक्षा मानकों के सर्वथा अनुरूप है।",
            "about_badge": "उत्कृष्ट विनिर्माण",
            "about_title": "पारदर्शी प्रकाश और सुदृढ़ पाषाण का संगम",
            "about_text": "स्टोन टेक एटेलियर खोखले कांच के ब्लॉक्स का निर्माण करता है जो अत्यधिक संरचनात्मक मजबूती के साथ प्राकृतिक प्रकाश का प्रसार करते हैं।<br><br>८००°C से अधिक तापमान पर दो तप्त बोरोसिलिकेट कांच के अर्द्ध-भागों को आंशिक वैक्यूम में जोड़कर निर्मित किया जाता है। यह सीलबंद वैक्यूम आंतरिक नमी को रोकता है और ४२ dB तक ध्वनि को नियंत्रित करता है।<br><br>ऊंचे कर्टेन वॉल से लेकर घुमावदार पार्टीशन और लग्जरी स्नानघरों तक, ये कांच की ईंटें दृश्य गोपनीयता बनाए रखते हुए दिन के उजाले को भवन के केंद्र तक पहुंचाती हैं।",
            "about_feat1_title": "EN 1051 एवं ASTM C935 प्रमाणित",
            "about_feat1_desc": "सटीक माप, सतही थर्मल शॉक प्रतिरोध और ७.५ N/mm² से अधिक दबाव सहने की क्षमता से प्रमाणित।",
            "about_feat2_title": "अग्नि सुरक्षा एवं विकिरण ढाल",
            "about_feat2_desc": "३० से ६० मिनट तक अग्नि रोधन (क्लास E / EW30), आग की लपटों और धुएं के प्रसार को प्रभावी रूप से रोकता है।",
            "label_size": "आकार",
            "label_weight": "वज़न",
            "label_sound": "ध्वनिरोधन",
            "label_fire": "अग्नि रोधन",
            "label_pack": "पैकिंग",
            "label_trans": "प्रकाश पारगम्यता",
            "label_uval": "ऊष्मारोधक U-मान",
            "type_desc": "वास्तुशिल्पीय खोखली कांच की ईंट",
        }
    elif lang == "gu":
        return {
            "title": "વાસ્તુશિલ્પીય પોલી કાચની ઈંટો",
            "subtitle": "પ્રકાશ સંચરણ, ઉષ્મારોધક અને ધ્વનિ-નિયંત્રણ કાચ શ્રેણી",
            "edition": "૨૦૨૬ – ૨૦૨૭ માસ્ટર સ્પેસિફિકેશન કેટલોગ",
            "tagline1": "ડબલ-કેવિટી આંશિક વેક્યુમ સીલબંધ કાચના બ્લોક્સ · ૪૦–૪૨ dB અવાજ નિયંત્રણ · U-વેલ્યુ ~૧.૫ W/m²K",
            "tagline2": "સમુદ્રી તરંગ, રિબ્ડ, પ્રિઝ્મેટિક અને રંગીન કાચની પ્રીમિયમ વાસ્તુશિલ્પીય સિસ્ટમ્સ",
            "division": "પોલી કાચની ઈંટો ડિવિઝન",
            "p1_num": "૦૧. ઉષ્મારોધક કોર",
            "p1_head": "વેક્યુમ ઇન્સ્યુલેશન",
            "p1_body": "ઊર્જા-કાર્યક્ષમ ઇમારતો માટે ૧.૫ W/m²K સુધી U-વેલ્યુ પ્રદાન કરતો વેક્યુમ કાચ કોર.",
            "p2_num": "૦૨. અવાજ નિયંત્રણ",
            "p2_head": "૪૦–૪૨ dB સાઉન્ડ શિલ્ડ",
            "p2_body": "હવાઈ અવાજના તરંગોને શોષી લેતી સાઉન્ડ-પ્રૂફ સિસ્ટમ જે ગોપનીયતા સુનિશ્ચિત કરે છે.",
            "p3_num": "૦૩. મોડ્યુલર ગ્રિડ",
            "p3_head": "ડ્રાય-સ્ટેક એસેમ્બલી",
            "p3_body": "સિમેન્ટ વિના ચોક્કસ પીવીસી સ્પેસર ગ્રિડ અને હાઇ-ટેન્સાઇલ સિલિકોન બોન્ડિંગથી ઝડપી ફિટિંગ.",
            "p4_num": "૦૪. ઉચ્ચ ક્ષમતા",
            "p4_head": "> ૭.૫ N/mm² દબાણ ક્ષમતા",
            "p4_body": "ભઠ્ઠીમાં તપાવેલ બોરોસિલિકેટ કાચ જે ASTM C935 અને EN 1051 સુરક્ષા ધોરણોને અનુરૂપ છે.",
            "about_badge": "ઉત્કૃષ્ટ ઉત્પાદન",
            "about_title": "પારદર્શક પ્રકાશ અને માળખાકીય મજબૂતીનો સંગમ",
            "about_text": "સ્ટોન ટેક એટેલિયર પોલી કાચની ઈંટોનું ઉત્પાદન કરે છે જે અત્યંત માળખાકીય ટકાઉપણા સાથે કુદરતી પ્રકાશનો ફેલાવો કરે છે.<br><br>૮૦૦°C થી વધુ તાપમાને બે ગરમ બોરોસિલિકેટ કાચના ભાગોને આંશિક વેક્યુમમાં જોડીને બનાવવામાં આવે છે. આ સીલબંધ વેક્યુમ ભેજ અટકાવે છે અને ૪૨ dB સુધી અવાજ રોકે છે.<br><br>ઊંચી પડદા દીવાલોથી લઈને ગોળાકાર પાર્ટીશન અને લક્ઝરી બાથરૂમ સુધી, આ કાચની ઈંટો અંગત ગોપનીયતા જાળવીને દિવસના અજવાળાને મકાનની અંદર સુધી પહોંચાડે છે.",
            "about_feat1_title": "EN 1051 અને ASTM C935 પ્રમાણિત",
            "about_feat1_desc": "ચોક્કસ માપ, સપાટી થર્મલ શોક પ્રતિકાર અને ૭.૫ N/mm² થી વધુ દબાણ ક્ષમતા સાથે ચકાસાયેલ.",
            "about_feat2_title": "અગ્નિ સુરક્ષા કવચ",
            "about_feat2_desc": "૩૦ થી ૬૦ મિનિટ સુધી અગ્નિ પ્રતિકાર (ક્લાસ E / EW30), આગની જ્વાળાઓ ફેલાતી રોકે છે.",
            "label_size": "માપ",
            "label_weight": "વજન",
            "label_sound": "અવાજ રોધક",
            "label_fire": "અગ્નિ પ્રતિકાર",
            "label_pack": "પેકિંગ",
            "label_trans": "પ્રકાશ પારગમ્યતા",
            "label_uval": "ઉષ્મારોધક U-વેલ્યુ",
            "type_desc": "વાસ્તુશિલ્પીય પોલી કાચની ઈંટ",
        }
    return {
        "title": "ARCHITECTURAL HOLLOW GLASS BRICKS",
        "subtitle": "LIGHT TRANSMISSION & THERMAL ACOUSTIC SERIES",
        "edition": "2026 – 2027 MASTER SPECIFICATION CATALOGUE",
        "tagline1": "Dual-Cavity Partial Vacuum Sealed Glass Blocks · 40–42 dB Acoustic Shield · U-Value ~1.5 W/m²K",
        "tagline2": "Precision Wave, Reeded, Prismatic & Monolithic Translucent Tinted Systems for Luxury Architecture",
        "division": "HOLLOW GLASS BRICKS DIVISION",
        "p1_num": "01. THERMAL CORE",
        "p1_head": "VACUUM INSULATION",
        "p1_body": "Hermetically fused dual-cavity partial vacuum core achieving U-values down to 1.5 W/m²K for energy-efficient facades.",
        "p2_num": "02. SOUND SHIELD",
        "p2_head": "40–42 dB ATTENUATION",
        "p2_body": "Engineered acoustic barrier absorbing high and low frequency airborne sound for executive privacy and wellness.",
        "p3_num": "03. MODULAR GRID",
        "p3_head": "VETROKWIK™ DRY-STACK",
        "p3_body": "Fast, mortar-free dry assembly utilizing precision PVC structural grid spacers and high-tensile silicone bead bonding.",
        "p4_num": "04. HIGH STRENGTH",
        "p4_head": "> 7.5 N/mm² COMPRESSIVE",
        "p4_body": "Kiln-cast borosilicate glass compliant with ASTM C935 & EN 1051 structural and Class E/EW30 fire safety criteria.",
        "about_badge": "MANUFACTURING EXCELLENCE",
        "about_title": "Luminous Transparency Meets Structural Permanence",
        "about_text": "Stone Tech Atelier manufactures architectural hollow glass blocks engineered to harmonize extreme structural durability with atmospheric ambient illumination.<br><br>Produced by fusing two separately pressed hot borosilicate glass half-shells under partial vacuum, each block contains an internal cavity sealed at over 800°C. This hermetic partial vacuum chamber yields exceptional thermal resistance, preventing internal condensation while dampening airborne sound waves up to 42 dB.<br><br>From soaring multi-level curtain walls to curvilinear partition screens and radiant luxury bathrooms, Stone Tech hollow glass blocks bring daylight deep into building cores while ensuring total visual privacy.",
        "about_feat1_title": "EN 1051 & ASTM C935 CERTIFIED",
        "about_feat1_desc": "Fully tested for dimensional tolerances, surface thermal shock resistance (ΔT ≥ 30 K), and compressive strength exceeding 7.5 N/mm².",
        "about_feat2_title": "FIRE SAFETY & RADIANT SHIELD",
        "about_feat2_desc": "Achieves up to 30 to 60 minutes structural fire integrity (Class E / EW30), restricting flame spread and toxic gas transmission.",
        "label_size": "Dimensions",
        "label_weight": "Weight",
        "label_sound": "Sound Shield",
        "label_fire": "Fire Rating",
        "label_pack": "Packaging",
        "label_trans": "Light Transmittance",
        "label_uval": "Thermal U-Value",
        "type_desc": "Architectural Hollow Glass Brick",
    }


def generate_hollow_html(lang="en"):
    total_pages = 47
    css = get_fonts_css(lang) + "\n" + hgb.generate_css()
    parts = []
    T = get_hollow_translations(lang)

    brand_text = "STONE TECH ATELIER" if lang == "en" else "स्टोन टेक एटेलियर" if lang == "hi" else "સ્ટોન ટેક એટેલિયર"
    doc_title = f"Stone Tech Atelier — {T['title']} {T['edition']}"

    parts.append(f"""<!DOCTYPE html>
<html lang='{lang}'>
<head>
<meta charset="utf-8">
<title>{doc_title}</title>
<style>
{css}
</style>
</head>
<body>
""")

    # PAGE 1: COVER
    parts.append(f"""
<div class="page cover-page">
  <div class="cover-border">
    <div class="cover-inner-border"></div>
    
    <div class="cover-header">
      <div class="cover-medallion">
        <img src="file://{hgb.EMBLEM_PATH}">
      </div>
      <div class="cover-brand">{brand_text}</div>
      <div class="cover-atelier">{T['division']} · {"SYSTEM ENGINEERED IN INDIA" if lang == "en" else "भारत में सिस्टम इंजीनियर्ड" if lang == "hi" else "ભારતમાં સિસ્ટમ એન્જિનિયર્ડ"}</div>
      <div class="cover-line"></div>
    </div>
    
    <div class="cover-title-group">
      <div class="cover-title1">{T['title']}</div>
      <div class="cover-title2">{T['subtitle']}</div>
      <div class="cover-edition">{T['edition']}</div>
      <div class="cover-tagline1">{T['tagline1']}</div>
      <div class="cover-tagline2">{T['tagline2']}</div>
    </div>
    
    <div class="cover-pillars">
      <div class="cover-pillar-card">
        <div class="pillar-num">{T['p1_num']}</div>
        <div class="pillar-head">{T['p1_head']}</div>
        <div class="pillar-body">{T['p1_body']}</div>
      </div>
      <div class="cover-pillar-card">
        <div class="pillar-num">{T['p2_num']}</div>
        <div class="pillar-head">{T['p2_head']}</div>
        <div class="pillar-body">{T['p2_body']}</div>
      </div>
      <div class="cover-pillar-card">
        <div class="pillar-num">{T['p3_num']}</div>
        <div class="pillar-head">{T['p3_head']}</div>
        <div class="pillar-body">{T['p3_body']}</div>
      </div>
      <div class="cover-pillar-card">
        <div class="pillar-num">{T['p4_num']}</div>
        <div class="pillar-head">{T['p4_head']}</div>
        <div class="pillar-body">{T['p4_body']}</div>
      </div>
    </div>
    
    <div class="cover-footer">
      <div>FACTORY & ATELIER: <strong>STONE TECH PRIVATE LIMITED</strong> · AHMEDABAD, GUJARAT, INDIA</div>
      <div>DIRECT SALES & ARCHITECTURAL ORDERS: <strong>+91 97844 52998 / +91 77420 90866</strong> · <strong>WWW.STONETECH.IN</strong></div>
      <div>DISPATCH: <strong>MUNDRA / JNPT PORTS</strong></div>
    </div>
  </div>
</div>
""")

    # PAGE 2: ABOUT
    about_img = os.path.join(hgb.ASSETS_DIR, "about_photo.jpg")
    parts.append(f"""
<div class="page about-page">
  <div class="about-border">
    <div class="cover-inner-border"></div>
    <div class="prod-header" style="border-bottom:1px solid #334155;padding-bottom:1.5mm;">
      <div class="prod-header-left">
        <img src="file://{hgb.EMBLEM_PATH}" class="prod-emblem">
        <div class="prod-brand-lockup">
          <span class="prod-brand-name" style="color:#ffffff;">STONE TECH ATELIER</span>
          <span class="prod-division-tag" style="background:#1e293b;border-color:#334155;color:#38bdf8;">{T['division']}</span>
        </div>
      </div>
      <div class="prod-header-right" style="color:#94a3b8;">
        DIRECT FACTORY ORDERS: <strong style="color:#fbbf24;">+91 97844 52998 / +91 77420 90866</strong> · <strong style="color:#38bdf8;">WWW.STONETECH.IN</strong>
      </div>
    </div>

    <div class="about-grid">
      <div class="about-left">
        <div class="about-badge">{T['about_badge']}</div>
        <div class="about-title">{T['about_title']}</div>
        <div class="about-text">
          {T['about_text']}
        </div>
        <div class="about-feats">
          <div class="about-feat-item">
            <div class="about-feat-title">{T['about_feat1_title']}</div>
            <div class="about-feat-desc">{T['about_feat1_desc']}</div>
          </div>
          <div class="about-feat-item">
            <div class="about-feat-title">{T['about_feat2_title']}</div>
            <div class="about-feat-desc">{T['about_feat2_desc']}</div>
          </div>
        </div>
      </div>

      <div class="about-photo-card">
        <img src="file://{about_img}">
      </div>
    </div>

    <div class="prod-footer" style="border-color:#334155;color:#94a3b8;">
      <div class="prod-footer-brand"><strong>STONE TECH ATELIER</strong> · ARCHITECTURAL SPECIFICATION CATALOGUE 2026-2027</div>
      <div class="prod-footer-page" style="color:#fbbf24;">{COMMON_I18N['page_x_of_y'][lang](2, total_pages, lang)}</div>
      <div class="prod-footer-addr">AHMEDABAD EXPERIENCE CENTER · DIRECT ENQUIRIES: +91 97844 52998 / +91 77420 90866</div>
    </div>
  </div>
</div>
""")

    # PAGES 3+: PRODUCTS (38 products)
    curr_page = 2
    for p in hgb.PRODUCTS:
        curr_page += 1
        img_path = os.path.join(hgb.ASSETS_DIR, p["img"])

        p_name = p["name"]
        local_name = GLASS_NAMES.get(p_name, {}).get(lang, p_name) if lang != "en" else p_name
        p_col = p["collection"]
        local_col = GLASS_SERIES.get(p_col, {}).get(lang, p_col) if lang != "en" else p_col

        parts.append(f"""
<div class="page prod-page">
  <div class="prod-header">
    <div class="prod-header-left">
      <img src="file://{hgb.EMBLEM_PATH}" class="prod-emblem">
      <div class="prod-brand-lockup">
        <span class="prod-brand-name">STONE TECH ATELIER</span>
        <span class="prod-division-tag">{T['division']}</span>
      </div>
    </div>
    <div class="prod-header-right">
      TECHNICAL ASSISTANCE: <strong>+91 97844 52998 / +91 77420 90866</strong> · <strong>WWW.STONETECH.IN</strong>
    </div>
  </div>

  <div class="prod-body">
    <div class="prod-img-box">
      <img src="file://{img_path}" class="prod-img">
      <div class="prod-img-badge">
        <div class="badge-dot"></div>
        {local_col}
      </div>
    </div>

    <div class="prod-spec-panel">
      <div class="spec-header-row">
        <div class="spec-title-left">
          <div class="spec-prod-name">{local_name}</div>
          <div class="spec-prod-type">{T['type_desc']}</div>
        </div>
        <div class="spec-prod-code">{p['code']}</div>
      </div>

      <div class="spec-grid">
        <div class="spec-box">
          <div class="spec-box-label">{T['label_size']}</div>
          <div class="spec-box-val">{localize_dimensions(p['size'], lang)}</div>
        </div>
        <div class="spec-box">
          <div class="spec-box-label">{T['label_weight']}</div>
          <div class="spec-box-val">{localize_dimensions(p['weight'], lang)}</div>
        </div>
        <div class="spec-box">
          <div class="spec-box-label">{T['label_pack']}</div>
          <div class="spec-box-val">{localize_dimensions(p['packing'], lang)}</div>
        </div>
        <div class="spec-box">
          <div class="spec-box-label">{T['label_trans']}</div>
          <div class="spec-box-val">{to_indic(p['light_trans'], lang)}</div>
        </div>
        <div class="spec-box">
          <div class="spec-box-label">{T['label_sound']}</div>
          <div class="spec-box-val">{to_indic(p['sound'], lang)}</div>
        </div>
        <div class="spec-box">
          <div class="spec-box-label">{T['label_uval']}</div>
          <div class="spec-box-val">{to_indic(p['u_value'], lang)}</div>
        </div>
        <div class="spec-box">
          <div class="spec-box-label">{T['label_fire']}</div>
          <div class="spec-box-val">{to_indic(p['fire'], lang)}</div>
        </div>
      </div>

      <div class="spec-desc-row">
        {p['desc']}
      </div>
    </div>
  </div>

  <div class="prod-footer">
    <div class="prod-footer-brand"><strong>STONE TECH ATELIER</strong> · ARCHITECTURAL SPECIFICATION CATALOGUE 2026-2027</div>
    <div class="prod-footer-page">{COMMON_I18N['page_x_of_y'][lang](curr_page, total_pages, lang)}</div>
    <div class="prod-footer-addr">AHMEDABAD EXPERIENCE CENTER · DIRECT ENQUIRIES: +91 97844 52998 / +91 77420 90866</div>
  </div>
</div>
""")

    # BACK COVER
    curr_page += 1
    studio_title = COMMON_I18N["experience_center_title"][lang]
    studio_addr = COMMON_I18N["experience_center_address"][lang]
    parts.append(f"""
<div class="page back-page">
  <div class="back-border">
    <div class="cover-inner-border"></div>
    <div class="prod-header" style="border-bottom:1px solid #334155;padding-bottom:1.5mm;">
      <div class="prod-header-left">
        <img src="file://{hgb.EMBLEM_PATH}" class="prod-emblem">
        <div class="prod-brand-lockup">
          <span class="prod-brand-name" style="color:#ffffff;">STONE TECH ATELIER</span>
          <span class="prod-division-tag" style="background:#1e293b;border-color:#334155;color:#38bdf8;">{T['division']}</span>
        </div>
      </div>
      <div class="prod-header-right" style="color:#94a3b8;">
        TECHNICAL SPECIFICATIONS &amp; ENGINEERING ADVISORY
      </div>
    </div>

    <div style="margin:2mm 0;flex:1;">
      <div style="font-size:12pt;font-weight:800;color:#fbbf24;margin-bottom:1.5mm;">{studio_title}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4mm;font-size:7pt;color:#cbd5e1;line-height:1.45;">
        <div style="background:#1e293b;border:1px solid #334155;border-radius:2mm;padding:3mm;">
          <strong style="color:#ffffff;">STONE TECH ATELIER · EXPERIENCE CENTER</strong><br>
          {studio_addr}<br>
          <strong>Hotline:</strong> +91 97844 52998 / +91 77420 90866<br>
          <strong>Email:</strong> info@stonetech.in · <strong>Website:</strong> www.stonetech.in
        </div>
        <div style="background:#1e293b;border:1px solid #334155;border-radius:2mm;padding:3mm;">
          <strong style="color:#ffffff;">GLOBAL EXPORT PACKAGING</strong><br>
          Heavy-duty multi-wall corrugated cartons with styrofoam separator inserts and shrink-wrapped pallet encasement.<br>
          <strong>Primary Ports:</strong> Mundra Port / Hazira / JNPT Mumbai.<br>
          All rights reserved © 2026-2027 Stone Tech Private Limited.
        </div>
      </div>
    </div>

    <div class="prod-footer" style="border-color:#334155;color:#94a3b8;">
      <div class="prod-footer-brand"><strong>{brand_text}</strong> · {"ARCHITECTURAL SPECIFICATION CATALOGUE 2026-2027" if lang == "en" else "वास्तुशिल्पीय विनिर्देश कैटलॉग २०२६-२०२७" if lang == "hi" else "વાસ્તુશિલ્પીય વિશિષ્ટતા કેટલોગ ૨૦૨૬-૨૦૨૭"}</div>
      <div class="prod-footer-page" style="color:#fbbf24;">{COMMON_I18N['page_x_of_y'][lang](curr_page, total_pages, lang)}</div>
      <div class="prod-footer-addr">{"AHMEDABAD EXPERIENCE CENTER · DIRECT ENQUIRIES: +91 97844 52998 / +91 77420 90866" if lang == "en" else "अहमदाबाद एक्सपीरियंस सेंटर · प्रत्यक्ष फैक्टरी पूछताछ: +91 97844 52998 / +91 77420 90866" if lang == "hi" else "અમદાવાદ એક્સપિરિયન્સ સેન્ટર · સીધી ફેક્ટરી પૂછપરછ: +91 97844 52998 / +91 77420 90866"}</div>
    </div>
  </div>
</div>
""")

    parts.append("</body>\n</html>\n")
    return "".join(parts)


def build_hollow_pdf(lang="en"):
    print(f"--- Compiling Hollow Glass Bricks PDF [{lang.upper()}] ---")
    out_name = (
        "StoneTech_Glass_Bricks_Catalogue_English.pdf" if lang == "en"
        else "StoneTech_Glass_Bricks_Catalogue_Hindi.pdf" if lang == "hi"
        else "StoneTech_Glass_Bricks_Catalogue_Gujarati.pdf"
    )
    out_path = os.path.join(REPO_DIR, "public/catalogues", out_name)
    html_content = generate_hollow_html(lang)
    html_file = f"/tmp/hollow_glass_{lang}.html"
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
        print(f"Error compiling hollow {lang}:", res.stderr)
        sys.exit(1)

    dur = time.time() - t0
    size_mb = os.path.getsize(out_path) / (1024 * 1024)
    print(f"Hollow [{lang.upper()}] compiled in {dur:.2f}s -> {out_name} ({size_mb:.2f} MiB)")

    if lang == "en":
        master_2026 = os.path.join(REPO_DIR, "public/catalogues/StoneTech_Glass_Bricks_Catalogue_2026.pdf")
        shutil.copyfile(out_path, master_2026)
        print("Mirrored to master default: StoneTech_Glass_Bricks_Catalogue_2026.pdf")
        user_dl_master = os.path.expanduser("~/Downloads/StoneTech_Glass_Bricks_Catalogue_2026.pdf")
        try:
            shutil.copyfile(out_path, user_dl_master)
        except Exception:
            pass

    user_dl = os.path.expanduser(f"~/Downloads/{out_name}")
    try:
        shutil.copyfile(out_path, user_dl)
        print(f"Mirrored to user downloads: {user_dl}")
    except Exception as e:
        print(f"Warning mirroring to downloads: {e}")

    return out_path


def build_solid_pdf(lang="en"):
    print(f"--- Compiling Solid Glass Bricks PDF [{lang.upper()}] ---")
    out_name = (
        "StoneTech_Solid_Glass_Bricks_Catalogue_English.pdf" if lang == "en"
        else "StoneTech_Solid_Glass_Bricks_Catalogue_Hindi.pdf" if lang == "hi"
        else "StoneTech_Solid_Glass_Bricks_Catalogue_Gujarati.pdf"
    )
    out_path = os.path.join(REPO_DIR, "public/catalogues", out_name)
    base_html = sgb.generate_html()

    font_block = f"<style>{get_fonts_css(lang)}</style>"
    html_content = base_html.replace("<head>", f"<head>\n{font_block}")

    # Comprehensive semantic translation for Solid Glass Bricks
    if lang == "hi":
        html_content = html_content.replace(
            "ARCHITECTURAL SOLID GLASS BRICKS",
            "वास्तुशिल्पीय ठोस कांच की ईंटें"
        ).replace(
            "OPTICAL CLARITY & HIGH LOAD-BEARING SERIES",
            "ऑप्टिकल शुद्धता, उच्च दबाव क्षमता एवं अग्नि-प्रतिरोधी ठोस कांच श्रृंखला"
        ).replace(
            "SOLID GLASS BRICKS DIVISION",
            "ठोस कांच की ईंटें डिवीजन"
        ).replace(
            "Optical Clear Crystal Series",
            "ऑप्टिकल पारदर्शी ठोस कांच श्रृंखला"
        ).replace(
            "In-Color & Tinted Series",
            "रंगीन एवं टिंटेड कांच श्रृंखला"
        ).replace(
            "Solar Control Metallized Series",
            "सौर-नियंत्रण धातुयुक्त कांच श्रृंखला"
        ).replace(
            "> 100 N/mm² COMPRESSIVE",
            "> १०० N/mm² दबाव सामर्थ्य"
        ).replace(
            "100% Solid Crystal Glass Blocks",
            "१००% ठोस क्रिस्टल कांच ब्लॉक्स"
        ).replace(
            "Super Clear",
            "सुपर क्लियर ठोस कांच की ईंट"
        ).replace(
            "Clear Rock Finish",
            "रॉक फिनिश ठोस कांच की ईंट"
        ).replace(
            "Bubble Clear",
            "बबल क्रिस्टल ठोस कांच की ईंट"
        ).replace(
            "Frosted Satin",
            "फ्रॉस्टेड सैटिन ठोस कांच की ईंट"
        ).replace(
            "> 150 MPa Load",
            "> १५० MPa दबाव भार"
        ).replace(
            "Dimensions",
            "आकार / माप"
        ).replace(
            "Weight",
            "वज़न"
        ).replace(
            "Packing",
            "पैकिंग"
        ).replace(
            "Light Trans",
            "प्रकाश पारगम्यता"
        ).replace(
            "Compressive",
            "दबाव सामर्थ्य"
        ).replace(
            "Refractive",
            "अपवर्तनांक"
        ).replace(
            "Joint",
            "जोड़ / बॉन्ड"
        )
    elif lang == "gu":
        html_content = html_content.replace(
            "ARCHITECTURAL SOLID GLASS BRICKS",
            "વાસ્તુશિલ્પીય નક્કર કાચની ઈંટો"
        ).replace(
            "OPTICAL CLARITY & HIGH LOAD-BEARING SERIES",
            "ઓપ્ટિકલ શુદ્ધતા, ઉચ્ચ દબાણ ક્ષમતા અને અગ્નિ-પ્રતિરોધક નક્કર કાચ શ્રેણી"
        ).replace(
            "SOLID GLASS BRICKS DIVISION",
            "નક્કર કાચની ઈંટો ડિવિઝન"
        ).replace(
            "Optical Clear Crystal Series",
            "ઓપ્ટિકલ ક્રિસ્ટલ નક્કર કાચ શ્રેણી"
        ).replace(
            "In-Color & Tinted Series",
            "રંગીન અને ટિન્ટેડ કાચ શ્રેણી"
        ).replace(
            "Solar Control Metallized Series",
            "સોલર-કંટ્રોલ મેટલાઇઝ્ડ કાચ શ્રેણી"
        ).replace(
            "> 100 N/mm² COMPRESSIVE",
            "> ૧૦૦ N/mm² દબાણ ક્ષમતા"
        ).replace(
            "100% Solid Crystal Glass Blocks",
            "૧૦૦% નક્કર ક્રિસ્ટલ કાચ બ્લોક્સ"
        ).replace(
            "Super Clear",
            "સુપર ક્લિયર નક્કર કાચની ઈંટ"
        ).replace(
            "Clear Rock Finish",
            "રોક ફિનિશ નક્કર કાચની ઈંટ"
        ).replace(
            "Bubble Clear",
            "બબલ ક્રિસ્ટલ નક્કર કાચની ઈંટ"
        ).replace(
            "Frosted Satin",
            "ફ્રોસ્ટેડ સેટિન નક્કર કાચની ઈંટ"
        ).replace(
            "> 150 MPa Load",
            "> ૧૫૦ MPa દબાણ ક્ષમતા"
        ).replace(
            "Dimensions",
            "માપ / કદ"
        ).replace(
            "Weight",
            "વજન"
        ).replace(
            "Packing",
            "પેકિંગ"
        ).replace(
            "Light Trans",
            "પ્રકાશ પારગમ્યતા"
        ).replace(
            "Compressive",
            "દબાણ ક્ષમતા"
        ).replace(
            "Refractive",
            "વક્રીભવનાંક"
        ).replace(
            "Joint",
            "જોડાણ / જોઈન્ટ"
        )

    # Correct phone numbers
    html_content = html_content.replace("+91 97844 52118", "+91 97844 52998")
    html_content = html_content.replace("+919784452118", "+91 97844 52998")
    html_content = html_content.replace("+91 97844 52998 / +91 77420 90866", "+91 97844 52998 / +91 77420 90866")
    html_content = html_content.replace("+91 97844 52998 / +91 77420 90866", "+91 97844 52998 / +91 77420 90866")
    if lang == "hi":
        html_content = html_content.replace("DIRECT FACTORY ENQUIRIES", "प्रत्यक्ष फैक्टरी पूछताछ")
        html_content = html_content.replace("DIRECT ENQUIRIES", "प्रत्यक्ष पूछताछ")
        html_content = html_content.replace("FACTORY DIRECT ORDERS", "प्रत्यक्ष फैक्टरी ऑर्डर")
    elif lang == "gu":
        html_content = html_content.replace("DIRECT FACTORY ENQUIRIES", "સીધી ફેક્ટરી પૂછપરછ")
        html_content = html_content.replace("DIRECT ENQUIRIES", "સીધી પૂછપરછ")
        html_content = html_content.replace("FACTORY DIRECT ORDERS", "સીધા ફેક્ટરી ઓર્ડર")

    html_file = f"/tmp/solid_glass_{lang}.html"
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
        print(f"Error compiling solid {lang}:", res.stderr)
        sys.exit(1)

    dur = time.time() - t0
    size_mb = os.path.getsize(out_path) / (1024 * 1024)
    print(f"Solid [{lang.upper()}] compiled in {dur:.2f}s -> {out_name} ({size_mb:.2f} MiB)")

    if lang == "en":
        master_2026 = os.path.join(REPO_DIR, "public/catalogues/StoneTech_Solid_Glass_Bricks_Catalogue_2026.pdf")
        shutil.copyfile(out_path, master_2026)
        print("Mirrored to master default: StoneTech_Solid_Glass_Bricks_Catalogue_2026.pdf")
        user_dl_master = os.path.expanduser("~/Downloads/StoneTech_Solid_Glass_Bricks_Catalogue_2026.pdf")
        try:
            shutil.copyfile(out_path, user_dl_master)
        except Exception:
            pass

    user_dl = os.path.expanduser(f"~/Downloads/{out_name}")
    try:
        shutil.copyfile(out_path, user_dl)
        print(f"Mirrored to user downloads: {user_dl}")
    except Exception as e:
        print(f"Warning mirroring to downloads: {e}")

    return out_path


def main():
    langs = sys.argv[1:] if len(sys.argv) > 1 else ["en", "hi", "gu"]
    for l in langs:
        build_hollow_pdf(l)
        build_solid_pdf(l)


if __name__ == "__main__":
    main()

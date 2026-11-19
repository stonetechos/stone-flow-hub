#!/usr/bin/env python3
"""
scripts/compile-flexible-clay-multilingual.py

Compiles the Stone Tech Flexible Clay Veneers Catalogue (2026-2027)
into three luxury vector editions:
  - English:  public/catalogues/StoneTech_Flexible_Clay_Veneers_Catalogue_English.pdf
              (and public/catalogues/StoneTech_Flexible_Clay_Veneers_Catalogue_2026.pdf)
  - Hindi:    public/catalogues/StoneTech_Flexible_Clay_Veneers_Catalogue_Hindi.pdf
  - Gujarati: public/catalogues/StoneTech_Flexible_Clay_Veneers_Catalogue_Gujarati.pdf

Features:
  - Base64 TrueType fonts (NotoSansDevanagari, NotoSansGujarati) for zero tofu glyphs.
  - Authentic Devanagari numerals (०–९) and Gujarati numerals (૦–૯).
  - High-definition facade scenes, macro swatches, and installation guide.
  - Headless Chrome compilation, target < 20 MiB per edition.
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
    CLAY_TEXTURE_NAMES,
    CLAY_PROFILES,
    CLAY_COLORS,
    COMMON_I18N,
)

import importlib
fc = importlib.import_module("generate-flexible-clay-catalogue")

ASSETS_DIR = fc.ASSETS_DIR
BRANDING_DIR = fc.BRANDING_DIR
EMBLEM_PATH = fc.EMBLEM_PATH
TEXTURES = fc.TEXTURES
PUNCH_TRAVENTINO = fc.PUNCH_TRAVENTINO
PUNCH_SLAT = fc.PUNCH_SLAT
COLORS = fc.COLORS


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
    base_css = fc.generate_css()
    font_block = get_fonts_css(lang)
    return font_block + "\n" + base_css


def generate_html(lang="en"):
    total_pages = 37
    css = generate_css(lang)
    parts = []

    doc_title = (
        "Stone Tech Atelier — Architectural Flexible Clay Veneers Master Catalogue 2026-2027"
        if lang == "en"
        else "स्टोन टेक एटेलियर — आर्किटेक्चरल फ्लेक्सिबल क्ले विनियर्स मास्टर कैटलॉग २०२६-२०२७"
        if lang == "hi"
        else "સ્ટોન ટેક એટેલિયર — આર્કિટેક્ચરલ ફ્લેક્સિબલ ક્લે વિનિયર્સ માસ્ટર કેટલોગ ૨૦૨૬-૨૦૨૭"
    )

    parts.append(f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>{doc_title}</title>
<style>
{css}
</style>
</head>
<body>
""")

    # -------------------------------------------------------------------------
    # PAGE 1: LUXURY FRONT COVER
    # -------------------------------------------------------------------------
    cover_title1 = (
        "ARCHITECTURAL FLEXIBLE CLAY VENEERS" if lang == "en"
        else "फ्लेक्सिबल क्ले विनियर्स (लचीली मृत्तिका शीट्स)" if lang == "hi"
        else "આર્કિટેક્ચરલ ફ્લેક્સિબલ ક્લે વિનિયર્સ (લચીલી માટી શીટ્સ)"
    )
    cover_title2 = (
        "MODIFIED CLAY MATERIAL (MCM) · ULTRA-THIN BENDING STONE SERIES" if lang == "en"
        else "संशोधित क्ले सामग्री (MCM) · अल्ट्रा-थिन बेंडिंग स्टोन श्रृंखला" if lang == "hi"
        else "મોડિફાઇડ ક્લે મટિરિયલ (MCM) · અલ્ટ્રા-થિન બેન્ડિંગ સ્ટોન શ્રેણી"
    )
    cover_edition = (
        "2026 – 2027 MASTER SPECIFICATION CATALOGUE" if lang == "en"
        else "२०२६ – २०२७ मास्टर स्पेसिफिकेशन कैटलॉग" if lang == "hi"
        else "૨૦૨૬ – ૨૦૨૭ માસ્ટર સ્પેસિફિકેશન કેટલોગ"
    )
    cover_tagline1 = (
        "Nature, Engineered — Crafted from real mineral stone, these ultra-thin, flexible sheets retain the richness of authentic natural textures while bending seamlessly where traditional stone cannot." if lang == "en"
        else "प्रकृति एवं इंजीनियरिंग का संगम — वास्तविक खनिज पत्थर से निर्मित, ये अल्ट्रा-थिन फ्लेक्सिबल शीट्स प्राकृतिक टेक्सचर की गहराई को बनाए रखते हुए वहां भी मुड़ जाती हैं जहां पारंपरिक पत्थर नहीं लग सकता।" if lang == "hi"
        else "કુદરત અને એન્જિનિયરિંગનો સમન્વય — વાસ્તવિક ખનિજ પથ્થરમાંથી બનાવેલી, આ અલ્ટ્રા-થિન ફ્લેક્સિબલ શીટ્સ કુદરતી ટેક્સચરની સુંદરતા જાળવીને ત્યાં પણ વળી જાય છે જ્યાં પરંપરાગત પથ્થર લગાવી શકાતો નથી."
    )
    cover_tagline2 = (
        "Redefining Facades with Flexible Sheets · 18 Textures · 10 Punch Traventino Slabs · 12 Punch Slat Slabs" if lang == "en"
        else "फ्लेक्सिबल शीट्स के साथ फसाड्स का नया स्वरूप · १८ टेक्सचर्स · १० पंच ट्रावेरटिनो · १२ पंच स्लेट" if lang == "hi"
        else "ફ્લેક્સિબલ શીટ્સ સાથે ફસાદ્સનું નવું સ્વરૂપ · ૧૮ ટેક્સચર્સ · ૧૦ પંચ ટ્રાવર્ટિનો · ૧૨ પંચ સ્લેટ"
    )

    pillar1_head = "2.5–3.5 MM / ~3.8 KG/M²" if lang == "en" else "२.५–३.५ मिमी / ~३.८ किग्रा/वर्ग मीटर" if lang == "hi" else "૨.૫–૩.૫ મીમી / ~૩.૮ કિગ્રા/ચોરસ મીટર"
    pillar2_head = "RADIUS R ≥ 200 MM" if lang == "en" else "रेडियस R ≥ २०० मिमी" if lang == "hi" else "રેડિયસ R ≥ ૨૦૦ મીમી"
    pillar3_head = "CLASS A FIREPROOF / <2% H₂O" if lang == "en" else "क्लास A फायरप्रूफ / <२% जल अवशोषण" if lang == "hi" else "ક્લાસ A ફાયરપ્રૂફ / <૨% પાણી શોષણ"
    pillar4_head = "ZERO CEMENT / LOW CARBON" if lang == "en" else "शून्य सीमेंट / लो कार्बन कोर" if lang == "hi" else "શૂન્ય સિમેન્ટ / લો કાર્બન કોર"

    pillar1_num = "01. ULTRA LIGHTWEIGHT" if lang == "en" else "०१. अल्ट्रा लाइटवेट" if lang == "hi" else "૦૧. અલ્ટ્રા લાઇટવેઇટ"
    pillar2_num = "02. 360° FLEXIBILITY" if lang == "en" else "०२. ३६०° फ्लेक्सिबिलिटी" if lang == "hi" else "૦૨. ૩૬૦° ફ્લેક્સિબિલિટી"
    pillar3_num = "03. ALL-WEATHER LIFE" if lang == "en" else "०३. ऑल-वेदर लाइफ" if lang == "hi" else "૦૩. ઓલ-વેધર લાઇફ"
    pillar4_num = "04. ECO MINERAL CORE" if lang == "en" else "०४. ईको मिनरल कोर" if lang == "hi" else "૦૪. ઇકો મિનરલ કોર"

    parts.append(f"""
<div class="page cover-page">
  <div class="cover-border">
    <div class="cover-inner-border"></div>
    
    <div class="cover-header">
      <div class="cover-medallion">
        <img src="file://{EMBLEM_PATH}">
      </div>
      <div class="cover-brand">STONE TECH ATELIER</div>
      <div class="cover-atelier">ARCHITECTURAL FLEXIBLE CLAY VENEER DIVISION · ARCHITECTURAL INNOVATION</div>
      <div class="cover-line"></div>
    </div>
    
    <div class="cover-title-group">
      <div class="cover-title1">{cover_title1}</div>
      <div class="cover-title2">{cover_title2}</div>
      <div class="cover-edition">{cover_edition}</div>
      <div class="cover-tagline1">{cover_tagline1}</div>
      <div class="cover-tagline2">{cover_tagline2}</div>
    </div>
    
    <div class="cover-pillars">
      <div class="cover-pillar-card">
        <div class="pillar-num">{pillar1_num}</div>
        <div class="pillar-head">{pillar1_head}</div>
        <div class="pillar-body">Reduces structural dead-weight by over 80% compared to traditional 20mm masonry, eliminating high-rise anchor systems.</div>
      </div>
      <div class="cover-pillar-card">
        <div class="pillar-num">{pillar2_num}</div>
        <div class="pillar-head">{pillar2_head}</div>
        <div class="pillar-body">Seamlessly wraps circular columns, organic arches, curved perimeter walls, and sharp 90° corners without cracking.</div>
      </div>
      <div class="cover-pillar-card">
        <div class="pillar-num">{pillar3_num}</div>
        <div class="pillar-head">{pillar3_head}</div>
        <div class="pillar-body">Non-combustible mineral matrix resistant to intense UV radiation, heavy rainfall, freeze-thaw cycles, and thermal shock.</div>
      </div>
      <div class="cover-pillar-card">
        <div class="pillar-num">{pillar4_num}</div>
        <div class="pillar-head">{pillar4_head}</div>
        <div class="pillar-body">Crafted from inorganic natural mineral powder and modified clay, zero toxic VOC emissions, fully recyclable.</div>
      </div>
    </div>
    
    <div class="cover-footer">
      <div>FACTORY & ATELIER: <strong>STONE TECH PRIVATE LIMITED</strong> · AHMEDABAD, GUJARAT, INDIA</div>
      <div>DIRECT ARCHITECTURAL ORDERS & EXPORT: <strong>+91 77420 90866 / +91 97844 52998</strong> · <strong>WWW.STONETECH.IN</strong></div>
      <div>DISPATCH TERMINALS: <strong>MUNDRA / HAZIRA / JNPT PORTS</strong> · CONTAINERIZED EXPORT WOODEN CRATING</div>
    </div>
  </div>
</div>
""")

    # -------------------------------------------------------------------------
    # PAGE 2: PHILOSOPHY & BENDING HERO
    # -------------------------------------------------------------------------
    hero_img = os.path.join(ASSETS_DIR, "hero_bending_facade.jpg")
    p2_head = (
        "Redefining Facades with Flexible Sheets" if lang == "en"
        else "फ्लेक्सिबल शीट्स के साथ फसाड्स का नया स्वरूप" if lang == "hi"
        else "ફ્લેક્સિબલ શીટ્સ સાથે ફસાદ્સનું નવું સ્વરૂપ"
    )
    p2_callout_title = (
        "A MATERIAL THAT EXPANDS DESIGN" if lang == "en"
        else "डिजाइन की संभावनाओं को विस्तार देने वाला मटीरियल" if lang == "hi"
        else "ડિઝાઇનની શક્યતાઓને વિસ્તૃત કરતું મટિરિયલ"
    )

    parts.append(f"""
<div class="page" style="padding:0;">
  <div class="prod-header">
    <div class="prod-header-left">
      <img src="file://{EMBLEM_PATH}" class="prod-emblem">
      <div class="prod-brand-lockup">
        <span class="prod-brand-name">STONE TECH ATELIER</span>
        <span class="prod-division-tag">FLEXIBLE CLAY VENEERS DIVISION</span>
        <span style="font-size:6.5pt;background:#fef3c7;border:1px solid #fde68a;color:#b45309;padding:0.6mm 2mm;border-radius:1mm;font-weight:700;">MATERIAL PHILOSOPHY</span>
      </div>
    </div>
    <div class="prod-header-right">
      FACTORY DIRECT ORDERS: <strong>+91 77420 90866 / +91 97844 52998</strong> · <strong>WWW.STONETECH.IN</strong>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:120mm 157mm;gap:6mm;padding:6mm 10mm 10mm;height:calc(210mm - 22mm);">
    <div style="display:flex;flex-direction:column;gap:3.5mm;height:100%;text-align:left;">
      <div>
        <div style="font-size:8.5pt;font-weight:800;color:#f59e0b;letter-spacing:1.5px;margin-bottom:1.5mm;text-transform:uppercase;">NATURE, ENGINEERED</div>
        <div style="font-size:18pt;font-weight:900;color:#ffffff;line-height:1.2;margin-bottom:3mm;letter-spacing:-0.3px;">{p2_head}</div>
        <div style="font-size:8.5pt;color:#e2e8f0;line-height:1.6;margin-bottom:3mm;text-align:left;word-break:keep-all;">
          Crafted from real mineral stone, these ultra-thin, flexible sheets retain the richness of natural textures while unlocking unprecedented architectural freedom.
        </div>
        <div style="font-size:8pt;color:#94a3b8;line-height:1.6;margin-bottom:3.5mm;text-align:left;word-break:keep-all;">
          It bends and integrates seamlessly where traditional stone cannot. From flat exterior planes to organic columns, undulating canopies, and double-height curves, this is stone designed for boundless creativity.
        </div>
        <div style="background:#1e293b;border:0.4mm solid #334155;border-left:1.5mm solid #d97706;border-radius:2mm;padding:3.5mm 4mm;margin-bottom:2mm;">
          <div style="font-size:7.5pt;font-weight:800;color:#f59e0b;margin-bottom:1.5mm;letter-spacing:0.8px;">{p2_callout_title}</div>
          <div style="font-size:7.2pt;color:#cbd5e1;line-height:1.55;text-align:left;word-break:keep-all;">
            Traditional masonry imposes severe structural dead-weight, requiring expensive heavy steel brackets and complex structural substructures. Stone Tech Flexible Clay Veneers weigh under 4 kg/m², bonding directly with polymer adhesive onto concrete, plaster, cement boards, and curved substrates.
          </div>
        </div>
      </div>

      <div style="background:#0f172a;border:0.4mm solid #334155;border-radius:2mm;padding:3mm 3.5mm;margin-top:auto;">
        <div style="font-size:7pt;font-weight:800;color:#67e8f9;letter-spacing:1px;margin-bottom:2mm;">KEY MATERIAL ADVANTAGES</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:2mm;font-size:6.8pt;color:#cbd5e1;line-height:1.45;">
          <div>• <strong>Zero Chipping:</strong> Highly ductile</div>
          <div>• <strong>Easy Cutting:</strong> Utility blade / saw</div>
          <div>• <strong>Class A Fire:</strong> Non-combustible</div>
          <div>• <strong>Freeze-Thaw:</strong> 100+ cycles tested</div>
          <div>• <strong>Waterproof:</strong> &lt; 2.0% absorption</div>
          <div>• <strong>Fast Layout:</strong> Direct wall adhesion</div>
        </div>
      </div>
    </div>

    <div style="border:0.4mm solid #334155;border-radius:2.5mm;overflow:hidden;background:#020617;position:relative;">
      <img src="file://{hero_img}" style="width:100%;height:100%;object-fit:cover;">
      <div style="position:absolute;bottom:3mm;left:3mm;right:3mm;background:rgba(15,23,42,0.88);border:0.3mm solid #d97706;border-radius:1.5mm;padding:2mm 3mm;font-size:7pt;color:#e2e8f0;line-height:1.45;text-align:left;">
        <strong style="color:#fbbf24;">Dynamic 360° Cold Bending:</strong> Multi-tonal flexible sheets wrapping curved architectural columns and facade contours with zero thermal preheating.
      </div>
    </div>
  </div>

  <div class="prod-footer-bar">
    <span>STONE TECH ATELIER · ARCHITECTURAL SPECIFICATION CATALOGUE 2026-2027</span>
    <span>{COMMON_I18N['page_x_of_y'][lang](2, total_pages, lang)}</span>
    <span>WWW.STONETECH.IN · DIRECT FACTORY ENQUIRIES: +91 77420 90866 / +91 97844 52998</span>
  </div>
</div>
""")

    # -------------------------------------------------------------------------
    # PAGE 3: 9-COLOR ARCHITECTURAL PALETTE SPREAD
    # -------------------------------------------------------------------------
    p3_title = (
        "9 Signature Architectural Colors" if lang == "en"
        else f"{to_indic(9, lang)} सिग्नेचर आर्किटेक्चरल कलर्स" if lang == "hi"
        else f"{to_indic(9, lang)} સિગ્નેચર આર્કિટેક્ચરલ કલર્સ"
    )
    parts.append(f"""
<div class="page" style="padding:0;">
  <div class="prod-header">
    <div class="prod-header-left">
      <img src="file://{EMBLEM_PATH}" class="prod-emblem">
      <div class="prod-brand-lockup">
        <span class="prod-brand-name">STONE TECH ATELIER</span>
        <span class="prod-division-tag">FLEXIBLE CLAY VENEERS DIVISION</span>
        <span style="font-size:6.5pt;background:#fef3c7;border:1px solid #fde68a;color:#b45309;padding:0.6mm 2mm;border-radius:1mm;font-weight:700;">COLOR SYSTEM</span>
      </div>
    </div>
    <div class="prod-header-right">
      FACTORY DIRECT ORDERS: <strong>+91 77420 90866 / +91 97844 52998</strong> · <strong>WWW.STONETECH.IN</strong>
    </div>
  </div>

  <div style="padding:5mm 10mm 10mm;height:calc(210mm - 22mm);display:flex;flex-direction:column;justify-content:space-between;text-align:left;">
    <div style="border-bottom:0.4mm solid #334155;padding-bottom:2.5mm;">
      <div style="font-size:8pt;font-weight:800;color:#f59e0b;letter-spacing:1px;text-transform:uppercase;">CURATED EARTH TONALITIES</div>
      <div style="font-size:16pt;font-weight:900;color:#ffffff;margin:1mm 0;letter-spacing:-0.2px;">{p3_title}</div>
      <div style="font-size:7.5pt;color:#94a3b8;line-height:1.55;text-align:left;word-break:keep-all;">
        Every texture profile in our 3D series is precision-crafted across 9 elemental mineral shades, formulated using inorganic natural pigments with 2000+ hour UV colorfastness.
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:4mm;margin:3mm 0;">
""")
    for c in COLORS:
        c_name = CLAY_COLORS.get(c['name'], {}).get(lang, c['name']) if lang != "en" else c['name']
        parts.append(f"""
      <div style="background:#1e293b;border:0.4mm solid #334155;border-radius:2mm;padding:3mm;display:flex;align-items:center;gap:3mm;">
        <div style="width:14mm;height:14mm;border-radius:2mm;background:{c['hex']};border:0.5mm solid {c['border']};flex-shrink:0;"></div>
        <div>
          <div style="font-size:9.5pt;font-weight:800;color:#ffffff;">{c_name}</div>
          <div style="font-size:6.5pt;color:#94a3b8;margin-top:0.5mm;">Available across all 18 Textures</div>
          <div style="font-size:6.2pt;color:#67e8f9;margin-top:0.5mm;">UV Resistant · {localize_dimensions('1200×2400 mm', lang)}</div>
        </div>
      </div>
""")

    parts.append(f"""
    </div>

    <div style="background:#0b1120;border:0.4mm solid #334155;border-radius:2mm;padding:2.5mm 4mm;display:flex;justify-content:space-between;align-items:center;font-size:7pt;color:#cbd5e1;">
      <div><strong style="color:#fbbf24;">Standard Sizing:</strong> {localize_dimensions('1200 × 2400 mm', lang)} Large Format Sheet · Custom lengths available.</div>
      <div><strong style="color:#67e8f9;">Thickness Profile:</strong> {localize_dimensions('2.5 mm – 3.5 mm', lang)} · Weight: ~{localize_dimensions('3.8 kg/m²', lang)}</div>
    </div>
  </div>

  <div class="prod-footer-bar">
    <span>STONE TECH ATELIER · ARCHITECTURAL SPECIFICATION CATALOGUE 2026-2027</span>
    <span>{COMMON_I18N['page_x_of_y'][lang](3, total_pages, lang)}</span>
    <span>WWW.STONETECH.IN · DIRECT FACTORY ENQUIRIES: +91 77420 90866 / +91 97844 52998</span>
  </div>
</div>
""")

    # -------------------------------------------------------------------------
    # PAGE 4: COLLECTION I DIVIDER — ARCHITECTURAL 3D TEXTURES
    # -------------------------------------------------------------------------
    c1_title = (
        "ARCHITECTURAL 3D TEXTURES" if lang == "en"
        else "आर्किटेक्चरल 3D टेक्सचर्स" if lang == "hi"
        else "આર્કિટેક્ચરલ 3D ટેક્સચર્સ"
    )
    c1_badge = f"COLLECTION {to_indic('01', lang)}" if lang != "en" else "COLLECTION 01"
    parts.append(f"""
<div class="page divider-page">
  <div class="divider-border">
    <div class="cover-inner-border"></div>
    <div class="divider-badge">{c1_badge}</div>
    <div class="divider-title">{c1_title}</div>
    <div class="divider-sub">{to_indic(18, lang)} DISTINCT DIMENSIONAL SURFACES · {to_indic(9, lang)} COLORWAYS</div>
    <div class="divider-desc">
      A curated portfolio of dimensional wall surfaces engineered for high-impact facades, curved architectural features, and luxury interiors. From linear fluting and wave ripples to chiseled masonry and raw concrete relief, each profile expands modern building design.
    </div>
    <div class="divider-specs">
      <div class="divider-spec-chip">STANDARD DIMENSIONS: <strong>{localize_dimensions('1200 × 2400 MM', lang)}</strong></div>
      <div class="divider-spec-chip">THICKNESS: <strong>{localize_dimensions('2.5 – 3.5 MM', lang)}</strong></div>
      <div class="divider-spec-chip">WEIGHT: <strong>~{localize_dimensions('3.8 KG / M²', lang)}</strong></div>
      <div class="divider-spec-chip">BENDING: <strong>R ≥ {to_indic(200, lang)} MM</strong></div>
    </div>
  </div>
  <div class="prod-footer-bar">
    <span>STONE TECH ATELIER · ARCHITECTURAL SPECIFICATION CATALOGUE 2026-2027</span>
    <span>{COMMON_I18N['page_x_of_y'][lang](4, total_pages, lang)}</span>
    <span>WWW.STONETECH.IN · DIRECT FACTORY ENQUIRIES: +91 77420 90866 / +91 97844 52998</span>
  </div>
</div>
""")

    # -------------------------------------------------------------------------
    # PAGES 5 - 22: 18 ARCHITECTURAL 3D TEXTURE SPREADS
    # -------------------------------------------------------------------------
    for i, tex in enumerate(TEXTURES):
        page_num = 5 + i
        scene_path = os.path.join(ASSETS_DIR, f"{tex['slug']}_scene.jpg")
        swatch_path = os.path.join(ASSETS_DIR, f"{tex['slug']}_swatch.jpg")

        tex_name = tex["name"]
        local_name = CLAY_TEXTURE_NAMES.get(tex_name, {}).get(lang, tex_name) if lang != "en" else tex_name
        display_name = f"{local_name} ({tex_name})" if lang != "en" else tex_name

        tex_prof = tex["profile"]
        display_prof = CLAY_PROFILES.get(tex_prof, {}).get(lang, tex_prof) if lang != "en" else tex_prof

        label_size = "Dimensions" if lang == "en" else "साइज" if lang == "hi" else "સાઇઝ"
        label_thick = "Thickness" if lang == "en" else "मोटाई" if lang == "hi" else "જાડાઈ"
        label_weight = "Weight" if lang == "en" else "वजन" if lang == "hi" else "વજન"
        label_bending = "Bending" if lang == "en" else "लचीलापन (बेंडिंग)" if lang == "hi" else "લવચીકતા (બેન્ડિંગ)"
        label_fire = "Fire Rating" if lang == "en" else "फायर रेटिंग" if lang == "hi" else "ફાયર રેટિંગ"
        label_app = "Application" if lang == "en" else "उपयोग" if lang == "hi" else "ઉપયોગ"

        parts.append(f"""
<div class="page" style="padding:0;">
  <div class="prod-header">
    <div class="prod-header-left">
      <img src="file://{EMBLEM_PATH}" class="prod-emblem">
      <div class="prod-brand-lockup">
        <span class="prod-brand-name">STONE TECH ATELIER</span>
        <span class="prod-division-tag">FLEXIBLE CLAY VENEERS</span>
        <span style="font-size:6.5pt;background:#fef3c7;border:1px solid #fde68a;color:#b45309;padding:0.6mm 2mm;border-radius:1mm;font-weight:700;">COLLECTION 01 · 3D TEXTURE</span>
      </div>
    </div>
    <div class="prod-header-right">
      FACTORY DIRECT ORDERS: <strong>+91 77420 90866 / +91 97844 52998</strong> · <strong>WWW.STONETECH.IN</strong>
    </div>
  </div>

  <div class="texture-grid">
    <div class="scene-frame">
      <img src="file://{scene_path}" class="scene-img">
      <div class="scene-badge">ARCHITECTURAL APPLICATION · {tex['name'].upper()}</div>
    </div>

    <div class="texture-sidebar">
      <div class="texture-title-box">
        <div class="texture-code-row">
          <span class="texture-code">{tex['code']}</span>
          <span class="texture-pill">{to_indic(9, lang)} COLORS AVAILABLE</span>
        </div>
        <div class="texture-name">{display_name}</div>
        <div class="texture-profile">{display_prof}</div>
      </div>

      <div class="swatch-frame">
        <img src="file://{swatch_path}" class="swatch-img">
        <div class="swatch-tag">MACRO TEXTURE SWATCH</div>
      </div>

      <div class="texture-specs-box">
        <div class="spec-grid-2x2">
          <div class="spec-item">
            <span class="spec-label">{label_size}</span>
            <span class="spec-val">{localize_dimensions(tex['size'], lang)}</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">{label_thick}</span>
            <span class="spec-val">{localize_dimensions(tex['thick'], lang)}</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">{label_weight}</span>
            <span class="spec-val">{localize_dimensions(tex['weight'], lang)}</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">{label_bending}</span>
            <span class="spec-val">{localize_dimensions(tex['bending'], lang)}</span>
          </div>
        </div>

        <div class="spec-row-full">
          <span class="spec-label">{label_fire}</span>
          <span class="spec-val">{tex['fire']}</span>
        </div>

        <div class="spec-row-full">
          <span class="spec-label">{label_app}</span>
          <span class="spec-val">Curved Facades, Exterior Elevations, Column Wraps & Interior Features</span>
        </div>
      </div>

      <div class="texture-desc-box">
        {tex['desc']}
      </div>
    </div>
  </div>

  <div class="prod-footer-bar">
    <span>STONE TECH ATELIER · ARCHITECTURAL SPECIFICATION CATALOGUE 2026-2027</span>
    <span>{COMMON_I18N['page_x_of_y'][lang](page_num, total_pages, lang)}</span>
    <span>WWW.STONETECH.IN · DIRECT FACTORY ENQUIRIES: +91 77420 90866 / +91 97844 52998</span>
  </div>
</div>
""")

    # -------------------------------------------------------------------------
    # PAGE 23: COLLECTION II DIVIDER — PUNCH TRAVENTINO SLABS
    # -------------------------------------------------------------------------
    c2_title = (
        "PUNCH TRAVENTINO SLABS" if lang == "en"
        else "पंच ट्रावेरटिनो स्लैब्स" if lang == "hi"
        else "પંચ ટ્રાવર્ટિનો સ્લેબ્સ"
    )
    c2_badge = f"COLLECTION {to_indic('02', lang)}" if lang != "en" else "COLLECTION 02"
    parts.append(f"""
<div class="page divider-page">
  <div class="divider-border">
    <div class="cover-inner-border"></div>
    <div class="divider-badge">{c2_badge}</div>
    <div class="divider-title">{c2_title}</div>
    <div class="divider-sub">{to_indic(10, lang)} SIGNATURE TRAVERTINE SLAB SELECTIONS · TS 201 TO TS 220</div>
    <div class="divider-desc">
      Engineered linear vein-cut and cavity-pitted natural travertine slabs offering authentic sedimentary character without structural weight. Formulated for luxury residential facades, reception pavilions, and high-traffic public commercial buildings.
    </div>
    <div class="divider-specs">
      <div class="divider-spec-chip">MULTIPLE SIZES: <strong>600×1200 / 1200×2400 MM</strong></div>
      <div class="divider-spec-chip">FLEXIBILITY: <strong>R ≥ {to_indic(200, lang)} MM</strong></div>
      <div class="divider-spec-chip">WATERPROOF: <strong>&lt; {to_indic('2.0', lang)}% ABSORPTION</strong></div>
      <div class="divider-spec-chip">FIRE SAFETY: <strong>CLASS A</strong></div>
    </div>
  </div>
  <div class="prod-footer-bar">
    <span>STONE TECH ATELIER · ARCHITECTURAL SPECIFICATION CATALOGUE 2026-2027</span>
    <span>{COMMON_I18N['page_x_of_y'][lang](23, total_pages, lang)}</span>
    <span>WWW.STONETECH.IN · DIRECT FACTORY ENQUIRIES: +91 77420 90866 / +91 97844 52998</span>
  </div>
</div>
""")

    # -------------------------------------------------------------------------
    # PAGES 24 - 28: 10 PUNCH TRAVENTINO SLABS (2 per page)
    # -------------------------------------------------------------------------
    for i in range(0, len(PUNCH_TRAVENTINO), 2):
        page_num = 24 + (i // 2)
        s1 = PUNCH_TRAVENTINO[i]
        s2 = PUNCH_TRAVENTINO[i+1]
        img1_path = os.path.join(ASSETS_DIR, f"{s1['slug']}.jpg")
        img2_path = os.path.join(ASSETS_DIR, f"{s2['slug']}.jpg")

        parts.append(f"""
<div class="page" style="padding:0;">
  <div class="prod-header">
    <div class="prod-header-left">
      <img src="file://{EMBLEM_PATH}" class="prod-emblem">
      <div class="prod-brand-lockup">
        <span class="prod-brand-name">STONE TECH ATELIER</span>
        <span class="prod-division-tag">FLEXIBLE CLAY VENEERS</span>
        <span style="font-size:6.5pt;background:#fef3c7;border:1px solid #fde68a;color:#b45309;padding:0.6mm 2mm;border-radius:1mm;font-weight:700;">COLLECTION 02 · PUNCH TRAVENTINO</span>
      </div>
    </div>
    <div class="prod-header-right">
      FACTORY DIRECT ORDERS: <strong>+91 77420 90866 / +91 97844 52998</strong> · <strong>WWW.STONETECH.IN</strong>
    </div>
  </div>

  <div class="slabs-dual-grid">
    <div class="slab-card">
      <div class="slab-frame">
        <img src="file://{img1_path}" class="slab-img">
      </div>
      <div class="slab-info">
        <div class="slab-head">
          <div class="slab-code">{s1['code']}</div>
          <div class="slab-name">{s1['name']}</div>
          <div class="slab-tone">{s1['tone']}</div>
        </div>
        <div class="slab-sizes-box">
          <div class="slab-sizes-title">Available Sizing Profiles</div>
          <div class="slab-size-chips">
            <div class="slab-size-chip">{localize_dimensions('600 × 1200 mm', lang)}</div>
            <div class="slab-size-chip">{localize_dimensions('600 × 1500 mm', lang)}</div>
            <div class="slab-size-chip">{localize_dimensions('1200 × 2400 mm', lang)}</div>
            <div class="slab-size-chip">{localize_dimensions('1200 × 3000 mm', lang)}</div>
          </div>
        </div>
        <div class="slab-badges-list">
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Ultra Lightweight (~{localize_dimensions('4.0 kg/m²', lang)})</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Highly Flexible (R ≥ {to_indic(200, lang)} mm)</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Durable & Long Lasting Life</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Water & Weather Resistant</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Easy to Cut & Fast Install</div>
        </div>
        <div class="slab-desc-box">
          {s1['desc']}
        </div>
      </div>
    </div>

    <div class="slab-card">
      <div class="slab-frame">
        <img src="file://{img2_path}" class="slab-img">
      </div>
      <div class="slab-info">
        <div class="slab-head">
          <div class="slab-code">{s2['code']}</div>
          <div class="slab-name">{s2['name']}</div>
          <div class="slab-tone">{s2['tone']}</div>
        </div>
        <div class="slab-sizes-box">
          <div class="slab-sizes-title">Available Sizing Profiles</div>
          <div class="slab-size-chips">
            <div class="slab-size-chip">{localize_dimensions('600 × 1200 mm', lang)}</div>
            <div class="slab-size-chip">{localize_dimensions('600 × 1500 mm', lang)}</div>
            <div class="slab-size-chip">{localize_dimensions('1200 × 2400 mm', lang)}</div>
            <div class="slab-size-chip">{localize_dimensions('1200 × 3000 mm', lang)}</div>
          </div>
        </div>
        <div class="slab-badges-list">
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Ultra Lightweight (~{localize_dimensions('4.0 kg/m²', lang)})</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Highly Flexible (R ≥ {to_indic(200, lang)} mm)</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Durable & Long Lasting Life</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Water & Weather Resistant</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Easy to Cut & Fast Install</div>
        </div>
        <div class="slab-desc-box">
          {s2['desc']}
        </div>
      </div>
    </div>
  </div>

  <div class="prod-footer-bar">
    <span>STONE TECH ATELIER · ARCHITECTURAL SPECIFICATION CATALOGUE 2026-2027</span>
    <span>{COMMON_I18N['page_x_of_y'][lang](page_num, total_pages, lang)}</span>
    <span>WWW.STONETECH.IN · DIRECT FACTORY ENQUIRIES: +91 77420 90866 / +91 97844 52998</span>
  </div>
</div>
""")

    # -------------------------------------------------------------------------
    # PAGE 29: COLLECTION III DIVIDER — PUNCH SLAT SLABS
    # -------------------------------------------------------------------------
    c3_title = (
        "PUNCH SLAT SLABS" if lang == "en"
        else "पंच स्लेट स्लैब्स" if lang == "hi"
        else "પંચ સ્લેટ સ્લેબ્સ"
    )
    c3_badge = f"COLLECTION {to_indic('03', lang)}" if lang != "en" else "COLLECTION 03"
    parts.append(f"""
<div class="page divider-page">
  <div class="divider-border">
    <div class="cover-inner-border"></div>
    <div class="divider-badge">{c3_badge}</div>
    <div class="divider-title">{c3_title}</div>
    <div class="divider-sub">{to_indic(12, lang)} ARCHITECTURAL CLEFT SLAT SLABS · SK 103 TO SK 119</div>
    <div class="divider-desc">
      Linear natural mountain cleft split-face slate formations delivering rich geological contrast, delicate cleavage bedding planes, and earth-toned mineral striations. Engineered for contemporary facades, boundary walls, and luxury landscape features.
    </div>
    <div class="divider-specs">
      <div class="divider-spec-chip">MULTIPLE SIZES: <strong>600×1200 / 1200×2400 MM</strong></div>
      <div class="divider-spec-chip">FLEXIBILITY: <strong>R ≥ {to_indic(200, lang)} MM</strong></div>
      <div class="divider-spec-chip">WATERPROOF: <strong>&lt; {to_indic('2.0', lang)}% ABSORPTION</strong></div>
      <div class="divider-spec-chip">FIRE SAFETY: <strong>CLASS A</strong></div>
    </div>
  </div>
  <div class="prod-footer-bar">
    <span>STONE TECH ATELIER · ARCHITECTURAL SPECIFICATION CATALOGUE 2026-2027</span>
    <span>{COMMON_I18N['page_x_of_y'][lang](29, total_pages, lang)}</span>
    <span>WWW.STONETECH.IN · DIRECT FACTORY ENQUIRIES: +91 77420 90866 / +91 97844 52998</span>
  </div>
</div>
""")

    # -------------------------------------------------------------------------
    # PAGES 30 - 35: 12 PUNCH SLAT SLABS (2 per page)
    # -------------------------------------------------------------------------
    for i in range(0, len(PUNCH_SLAT), 2):
        page_num = 30 + (i // 2)
        s1 = PUNCH_SLAT[i]
        s2 = PUNCH_SLAT[i+1]
        img1_path = os.path.join(ASSETS_DIR, f"{s1['slug']}.jpg")
        img2_path = os.path.join(ASSETS_DIR, f"{s2['slug']}.jpg")

        parts.append(f"""
<div class="page" style="padding:0;">
  <div class="prod-header">
    <div class="prod-header-left">
      <img src="file://{EMBLEM_PATH}" class="prod-emblem">
      <div class="prod-brand-lockup">
        <span class="prod-brand-name">STONE TECH ATELIER</span>
        <span class="prod-division-tag">FLEXIBLE CLAY VENEERS</span>
        <span style="font-size:6.5pt;background:#fef3c7;border:1px solid #fde68a;color:#b45309;padding:0.6mm 2mm;border-radius:1mm;font-weight:700;">COLLECTION 03 · PUNCH SLAT</span>
      </div>
    </div>
    <div class="prod-header-right">
      FACTORY DIRECT ORDERS: <strong>+91 77420 90866 / +91 97844 52998</strong> · <strong>WWW.STONETECH.IN</strong>
    </div>
  </div>

  <div class="slabs-dual-grid">
    <div class="slab-card">
      <div class="slab-frame">
        <img src="file://{img1_path}" class="slab-img">
      </div>
      <div class="slab-info">
        <div class="slab-head">
          <div class="slab-code">{s1['code']}</div>
          <div class="slab-name">{s1['name']}</div>
          <div class="slab-tone">{s1['tone']}</div>
        </div>
        <div class="slab-sizes-box">
          <div class="slab-sizes-title">Available Sizing Profiles</div>
          <div class="slab-size-chips">
            <div class="slab-size-chip">{localize_dimensions('600 × 1200 mm', lang)}</div>
            <div class="slab-size-chip">{localize_dimensions('600 × 1500 mm', lang)}</div>
            <div class="slab-size-chip">{localize_dimensions('1200 × 2400 mm', lang)}</div>
            <div class="slab-size-chip">{localize_dimensions('1200 × 3000 mm', lang)}</div>
          </div>
        </div>
        <div class="slab-badges-list">
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Ultra Lightweight (~{localize_dimensions('4.0 kg/m²', lang)})</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Highly Flexible (R ≥ {to_indic(200, lang)} mm)</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Durable & Long Lasting Life</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Water & Weather Resistant</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Easy to Cut & Fast Install</div>
        </div>
        <div class="slab-desc-box">
          {s1['desc']}
        </div>
      </div>
    </div>

    <div class="slab-card">
      <div class="slab-frame">
        <img src="file://{img2_path}" class="slab-img">
      </div>
      <div class="slab-info">
        <div class="slab-head">
          <div class="slab-code">{s2['code']}</div>
          <div class="slab-name">{s2['name']}</div>
          <div class="slab-tone">{s2['tone']}</div>
        </div>
        <div class="slab-sizes-box">
          <div class="slab-sizes-title">Available Sizing Profiles</div>
          <div class="slab-size-chips">
            <div class="slab-size-chip">{localize_dimensions('600 × 1200 mm', lang)}</div>
            <div class="slab-size-chip">{localize_dimensions('600 × 1500 mm', lang)}</div>
            <div class="slab-size-chip">{localize_dimensions('1200 × 2400 mm', lang)}</div>
            <div class="slab-size-chip">{localize_dimensions('1200 × 3000 mm', lang)}</div>
          </div>
        </div>
        <div class="slab-badges-list">
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Ultra Lightweight (~{localize_dimensions('4.0 kg/m²', lang)})</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Highly Flexible (R ≥ {to_indic(200, lang)} mm)</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Durable & Long Lasting Life</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Water & Weather Resistant</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Easy to Cut & Fast Install</div>
        </div>
        <div class="slab-desc-box">
          {s2['desc']}
        </div>
      </div>
    </div>
  </div>

  <div class="prod-footer-bar">
    <span>STONE TECH ATELIER · ARCHITECTURAL SPECIFICATION CATALOGUE 2026-2027</span>
    <span>{COMMON_I18N['page_x_of_y'][lang](page_num, total_pages, lang)}</span>
    <span>WWW.STONETECH.IN · DIRECT FACTORY ENQUIRIES: +91 77420 90866 / +91 97844 52998</span>
  </div>
</div>
""")

    # -------------------------------------------------------------------------
    # PAGE 36: INSTALLATION ENGINEERING GUIDE
    # -------------------------------------------------------------------------
    guide_title = (
        "Architectural Installation Field Guide" if lang == "en"
        else "आर्किटेक्चरल इंस्टॉलेशन फील्ड गाइड" if lang == "hi"
        else "આર્કિટેક્ચરલ ઇન્સ્ટોલેશન ફીલ્ડ ગાઇડ"
    )
    s1_title = "SUBSTRATE PREPARATION" if lang == "en" else "सब्सट्रेट की तैयारी" if lang == "hi" else "સબસ્ટ્રેટની તૈયારી"
    s2_title = "ADHESIVE NOTCH TROWELING" if lang == "en" else "एडहेसिव नॉच ट्रोवेलिंग" if lang == "hi" else "એડહેસિવ નોચ ટ્રોવેલિંગ"
    s3_title = "SHEET POSITIONING & BENDING" if lang == "en" else "शीट पोजिशनिंग एवं बेंडिंग" if lang == "hi" else "શીટ પોઝિશનિંગ અને બેન્ડિંગ"
    s4_title = "RUBBER ROLLER COMPACTION" if lang == "en" else "रबर रोलर कॉम्पेक्शन" if lang == "hi" else "રબર રોલર કોમ્પેક્શન"
    s5_title = "SEAM JOINTING & GROUTING" if lang == "en" else "सीम जॉइंटिंग एवं ग्राउटिंग" if lang == "hi" else "સીમ જોઈન્ટિંગ અને ગ્રાઉટિંગ"
    s6_title = "EDGE TRIMMING & SEALING" if lang == "en" else "एज ट्रिमिंग एवं सीलिंग" if lang == "hi" else "એજ ટ્રીમિંગ અને સીલિંગ"

    parts.append(f"""
<div class="page" style="padding:0;">
  <div class="prod-header">
    <div class="prod-header-left">
      <img src="file://{EMBLEM_PATH}" class="prod-emblem">
      <div class="prod-brand-lockup">
        <span class="prod-brand-name">STONE TECH ATELIER</span>
        <span class="prod-division-tag">FLEXIBLE CLAY VENEERS</span>
        <span style="font-size:6.5pt;background:#fef3c7;border:1px solid #fde68a;color:#b45309;padding:0.6mm 2mm;border-radius:1mm;font-weight:700;">FIELD PROTOCOL</span>
      </div>
    </div>
    <div class="prod-header-right">
      TECHNICAL ASSISTANCE: <strong>+91 77420 90866 / +91 97844 52998</strong> · <strong>WWW.STONETECH.IN</strong>
    </div>
  </div>

  <div class="install-page">
    <div class="install-header-box">
      <div class="install-subtitle">OFFICIAL SITE WORKFLOW</div>
      <div class="install-title">{guide_title}</div>
    </div>

    <div class="install-grid">
      <div class="install-step-card">
        <div class="step-num">STEP {to_indic('01', lang)}</div>
        <div class="step-head">{s1_title}</div>
        <div class="step-desc">
          Ensure substrate (concrete, sand-cement plaster, AAC blocks, calcium silicate board, or plywood) is structurally sound, clean, flat (±2mm over 2m), free of dust, grease, and curing compounds.
        </div>
      </div>

      <div class="install-step-card">
        <div class="step-num">STEP {to_indic('02', lang)}</div>
        <div class="step-head">{s2_title}</div>
        <div class="step-desc">
          Apply high-performance polymer-modified cementitious tile adhesive (C2TE S1/S2 grade) or polyurethane structural adhesive using a 4mm to 6mm square notch trowel.
        </div>
      </div>

      <div class="install-step-card">
        <div class="step-num">STEP {to_indic('03', lang)}</div>
        <div class="step-head">{s3_title}</div>
        <div class="step-desc">
          Align flexible veneer sheet starting from top or bottom guidelines. For curved columns or radius walls (R ≥ 200 mm), wrap smoothly around the contour with gentle uniform tension.
        </div>
      </div>

      <div class="install-step-card">
        <div class="step-num">STEP {to_indic('04', lang)}</div>
        <div class="step-head">{s4_title}</div>
        <div class="step-desc">
          Press firmly using a wide rubber roller across the entire sheet surface, rolling from center outward to expel trapped air and ensure 100% adhesive transfer without hollow pockets.
        </div>
      </div>

      <div class="install-step-card">
        <div class="step-num">STEP {to_indic('05', lang)}</div>
        <div class="step-head">{s5_title}</div>
        <div class="step-desc">
          Sheets can be installed with hairline tight butt-joints or architectural open joints (2mm – 5mm). For exterior facades, seal joints with matching color UV-stable polyurethane sealant.
        </div>
      </div>

      <div class="install-step-card">
        <div class="step-num">STEP {to_indic('06', lang)}</div>
        <div class="step-head">{s6_title}</div>
        <div class="step-desc">
          Cut easily on-site using a heavy-duty utility knife, oscillating cutter, or fine-tooth circular saw. Wipe clean with a damp sponge. Apply breathable silane impregnator for exterior facades.
        </div>
      </div>
    </div>

    <div class="install-notes-box">
      <strong>CRITICAL ENGINEERING NOTE:</strong> Flexible Clay Veneers require zero mechanical anchor pins, drilled bolts, or heavy aluminum substructures for heights up to 24 meters, provided structural substrate adhesion exceeds 1.0 N/mm². Always verify adhesive compatibility on specialized substrates.
    </div>
  </div>

  <div class="prod-footer-bar">
    <span>STONE TECH ATELIER · ARCHITECTURAL SPECIFICATION CATALOGUE 2026-2027</span>
    <span>{COMMON_I18N['page_x_of_y'][lang](36, total_pages, lang)}</span>
    <span>WWW.STONETECH.IN · DIRECT FACTORY ENQUIRIES: +91 77420 90866 / +91 97844 52998</span>
  </div>
</div>
""")

    # -------------------------------------------------------------------------
    # PAGE 37: SPECIFICATION MATRIX & BACK COVER
    # -------------------------------------------------------------------------
    matrix_title = (
        "ARCHITECTURAL PERFORMANCE & COMPLIANCE MATRIX" if lang == "en"
        else "आर्किटेक्चरल परफॉर्मेंस एवं कंप्लायंस मैट्रिक्स" if lang == "hi"
        else "આર્કિટેક્ચરલ પરફોર્મન્સ અને કમ્પ્લાયન્સ મેટ્રિક્સ"
    )
    studio_title = COMMON_I18N["experience_center_title"][lang]
    studio_addr = COMMON_I18N["experience_center_address"][lang]

    parts.append(f"""
<div class="page" style="padding:0;">
  <div class="prod-header">
    <div class="prod-header-left">
      <img src="file://{EMBLEM_PATH}" class="prod-emblem">
      <div class="prod-brand-lockup">
        <span class="prod-brand-name">STONE TECH ATELIER</span>
        <span class="prod-division-tag">FLEXIBLE CLAY VENEERS</span>
        <span style="font-size:6.5pt;background:#fef3c7;border:1px solid #fde68a;color:#b45309;padding:0.6mm 2mm;border-radius:1mm;font-weight:700;">SPECIFICATION MATRIX</span>
      </div>
    </div>
    <div class="prod-header-right">
      TECHNICAL ASSISTANCE: <strong>+91 77420 90866 / +91 97844 52998</strong> · <strong>WWW.STONETECH.IN</strong>
    </div>
  </div>

  <div class="matrix-page">
    <div class="matrix-header-box">
      <div class="matrix-subtitle">LABORATORY CERTIFIED TEST DATA</div>
      <div class="matrix-title">{matrix_title}</div>
    </div>

    <div class="matrix-table-wrap">
      <table class="matrix-table">
        <thead>
          <tr>
            <th style="width:26%;">Physical &amp; Mechanical Property</th>
            <th style="width:22%;">International Standard</th>
            <th style="width:26%;">Measured Value</th>
            <th style="width:26%;">Architectural Advantage</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Areal Mass / Unit Weight</strong></td>
            <td>ASTM C373 / ISO 10545-3</td>
            <td class="val-strong">{localize_dimensions('3.50 – 4.50 kg / m²', lang)}</td>
            <td>Over 80% lighter than natural 20mm granite / sandstone slabs</td>
          </tr>
          <tr>
            <td><strong>Fire Safety Rating</strong></td>
            <td>EN 13501-1 / ASTM E84</td>
            <td class="val-strong">Class A (Flame Spread: 0 · Smoke: &lt; 5)</td>
            <td>Non-combustible; certified for high-rise facades and public lobbies</td>
          </tr>
          <tr>
            <td><strong>Water Absorption</strong></td>
            <td>ASTM C97 / ISO 10545-3</td>
            <td class="val-strong">&lt; {to_indic('2.0', lang)}% (Hydrophobic impermeable)</td>
            <td>Resistant to rain penetration, efflorescence, and moisture stains</td>
          </tr>
          <tr>
            <td><strong>Tensile Bond Strength</strong></td>
            <td>EN 12004 / ASTM C482</td>
            <td class="val-strong">&gt; {to_indic('1.20', lang)} N / mm²</td>
            <td>High shear adhesion preventing delamination under wind suction</td>
          </tr>
          <tr>
            <td><strong>Freeze-Thaw Durability</strong></td>
            <td>EN 1344 / ASTM C666</td>
            <td class="val-strong">{to_indic(100, lang)} Cycles (-20°C to +20°C) without cracking</td>
            <td>Suitable for harsh cold climates, alpine, and desert thermal swings</td>
          </tr>
          <tr>
            <td><strong>Bending Elasticity Radius</strong></td>
            <td>Mandrel Flexibility Test</td>
            <td class="val-strong">R ≥ {to_indic(200, lang)} mm (Cold bending)</td>
            <td>Enables seamless wrapping of round columns, vaults, and arches</td>
          </tr>
          <tr>
            <td><strong>UV &amp; Weathering</strong></td>
            <td>ASTM G154 (Xenon Arc 2000 hrs)</td>
            <td class="val-strong">ΔE* &lt; {to_indic('1.5', lang)} (Zero fading)</td>
            <td>Preserves vibrant color consistency under intense exterior sunlight</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="studio-grid">
      <div class="studio-card">
        <div class="studio-card-title">{studio_title}</div>
        <div class="studio-card-body">
          <strong>STONE TECH ATELIER · EXPERIENCE CENTER</strong><br>
          {studio_addr}<br>
          <strong>Direct WhatsApp &amp; Sales Hotline:</strong> +91 77420 90866 / +91 97844 52998<br>
          <strong>Email:</strong> info@stonetech.in · <strong>Website:</strong> www.stonetech.in<br>
          <em>Studio Hours: Monday – Saturday, 10:00 AM – 7:30 PM</em>
        </div>
      </div>

      <div class="studio-card">
        <div class="studio-card-title">GLOBAL EXPORT PACKAGING &amp; QUALITY ASSURANCE</div>
        <div class="studio-card-body">
          <strong>Export-Standard Protective Packaging:</strong> ISPM-15 heat-treated solid pine/plywood timber crates with EPE foam interleaving and corner edge protectors.<br>
          <strong>Moisture Protection:</strong> Hermetically sealed VCI waterproof barrier and shrink-wrapped pallet encasement.<br>
          <strong>Primary Export Ports:</strong> Mundra Port / Hazira / JNPT Mumbai.<br>
          <strong>Direct Invoicing &amp; Supply:</strong> Stone Tech Private Limited. All rights reserved © 2026-2027.
        </div>
      </div>
    </div>
  </div>

  <div class="prod-footer-bar">
    <span>STONE TECH ATELIER · ARCHITECTURAL SPECIFICATION CATALOGUE 2026-2027</span>
    <span>{COMMON_I18N['page_x_of_y'][lang](total_pages, total_pages, lang)}</span>
    <span>WWW.STONETECH.IN · DIRECT FACTORY ENQUIRIES: +91 77420 90866 / +91 97844 52998</span>
  </div>
</div>
""")

    parts.append("</body>\n</html>\n")
    return "".join(parts)


def build_pdf(lang="en"):
    print(f"--- Compiling Flexible Clay Veneers PDF [{lang.upper()}] ---")
    out_name = (
        "StoneTech_Flexible_Clay_Veneers_Catalogue_English.pdf" if lang == "en"
        else "StoneTech_Flexible_Clay_Veneers_Catalogue_Hindi.pdf" if lang == "hi"
        else "StoneTech_Flexible_Clay_Veneers_Catalogue_Gujarati.pdf"
    )
    out_path = os.path.join(REPO_DIR, "public/catalogues", out_name)
    html_content = generate_html(lang)
    html_file = f"/tmp/flexible_clay_{lang}.html"
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
        master_2026 = os.path.join(REPO_DIR, "public/catalogues/StoneTech_Flexible_Clay_Veneers_Catalogue_2026.pdf")
        shutil.copyfile(out_path, master_2026)
        print(f"Mirrored to master default: StoneTech_Flexible_Clay_Veneers_Catalogue_2026.pdf")

    return out_path


def main():
    langs = sys.argv[1:] if len(sys.argv) > 1 else ["en", "hi", "gu"]
    for l in langs:
        build_pdf(l)


if __name__ == "__main__":
    main()

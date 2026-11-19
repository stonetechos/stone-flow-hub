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
        else "नेचुरल स्टोन पेबल्स<br><span>एवं सेमी-प्रेशियस एग्रीगेट्स</span>"
        if lang == "hi"
        else "નેચરલ સ્ટોન પેબલ્સ<br><span>અને સેમી-પ્રેશિયસ એગ્રીગેટ્સ</span>"
    )
    c_sub = (
        "Curated Natural River Stones, Crystalline Onyx Pebbles, Exotic Agate Aggregates, Monumental Jumbo Boulders, Flat Stepping Discs &amp; Precision Architectural Micro-Chips"
        if lang == "en"
        else "क्यूरेटेड नेचुरल रिवर स्टोन्स, क्रिस्टलीय गोमेद पेबल्स, एग्जॉटिक एगेट एग्रीगेट्स, जंबो बोल्डर्स एवं आर्किटेक्चरल माइक्रो-चिप्स"
        if lang == "hi"
        else "ક્યુરેટેડ નેચરલ રિવર સ્ટોન્સ, સ્ફટિકીય ગોમેદ પેબલ્સ, એક્ઝોટિક એગેટ એગ્રીગેટ્સ, જમ્બો બોલ્ડર્સ અને આર્કિટેક્ચરલ માઇક્રો-ચિપ્સ"
    )
    pill1 = f"{to_indic(75, lang)} Curated Varieties" if lang == "en" else f"{to_indic(75, lang)} क्यूरेटेड किस्में" if lang == "hi" else f"{to_indic(75, lang)} ક્યુરેટેડ વેરાઇટીઝ"
    pill2 = "Micro-Chips to 180mm Boulders" if lang == "en" else f"माइक्रो-चिप्स से {to_indic(180, lang)} मिमी बोल्डर्स" if lang == "hi" else f"માઇક્રો-ચિપ્સથી {to_indic(180, lang)} મીમી બોલ્ડર્સ"
    pill3 = "100% Natural Minerals" if lang == "en" else f"{to_indic(100, lang)}% प्राकृतिक खनिज" if lang == "hi" else f"{to_indic(100, lang)}% કુદરતી ખનિજ"
    pill4 = "Global Export Standards" if lang == "en" else "वैश्विक निर्यात मानक" if lang == "hi" else "વૈશ્વિક નિકાસ ધોરણો"

    parts.append(f"""
<div class="page cover-page">
  <div class="cover-border">
    <div class="cover-inner-border"></div>

    <div class="cover-header">
      <div class="cover-medallion">
        <img src="{emblem_src}" alt="Stone Tech Emblem">
      </div>
      <div class="cover-brand">STONE TECH ATELIER</div>
      <div class="cover-subbrand">Architectural Stone &amp; Semi-Precious Aggregates · Master 2026 Edition</div>
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
        <strong>STONE TECH PRIVATE LIMITED</strong> · SPECIFICATION CATALOGUE 2026-2027<br>
        AHMEDABAD EXPERIENCE CENTER · DIRECT FACTORY ENQUIRIES: +91 77420 90866 / +91 97844 52998
      </div>
      <div>
        {COMMON_I18N['page_x_of_y'][lang](1, total_pages, lang)}
      </div>
      <div>
        WWW.STONETECH.IN · MUNDRA &amp; JNPT EXPORTS
      </div>
    </div>
  </div>
</div>
""")

    # =========================================================================
    # PAGE 2: MATERIALITY & SPECIFICATION OVERVIEW
    # =========================================================================
    current_page = 2
    parts.append(f"""
<div class="page">
  <div class="prod-header-bar">
    <div class="prod-header-left">
      <span class="prod-brand-mini">STONE TECH ATELIER</span>
      <span class="prod-cat-badge">ARCHITECTURAL OVERVIEW</span>
    </div>
    <div class="prod-header-right">GEOLOGICAL CLASSIFICATION &amp; APPLICATION SPECTRUM</div>
  </div>

  <div class="overview-grid">
    <div class="overview-card">
      <div class="overview-title">GEOLOGICAL CLASSIFICATION &amp; MINERALOGY</div>
      <div class="overview-body">
        Stone Tech Atelier curates pure mineralogical aggregates extracted from pristine riverbeds, quartz veins, and deep geological formations across the Indian subcontinent and international quarries.<br><br>
        <strong>1. Crystalline Quartz &amp; Chalcedony:</strong> Rose Quartz, Crystal Quartz, Green Aventurine, and Carnelian deliver exceptional Mohs hardness (7.0) and high translucence for luxury water bodies and backlit features.<br><br>
        <strong>2. Microcrystalline Onyx &amp; Aragonite:</strong> Sourced from multi-toned banded calcite strata. Translucent under ambient illumination, ideal for interior reflecting trays, spa sanctuaries, and boutique foyers.<br><br>
        <strong>3. Volcanic Basalt &amp; Granite:</strong> High-density igneous stone (Mohs 6.0–6.5) tumbled to piano-gloss obsidian or natural matte velvet. Extreme resistance to vehicular load, freeze-thaw cycles, and acid rain.<br><br>
        <strong>4. Metamorphic Calcite &amp; Marble:</strong> Makrana, Jaisalmer, and Kota crushed chips engineered for high-compaction permeable driveways, French drains, and terrazzo matrixes.
      </div>
    </div>

    <div class="overview-card">
      <div class="overview-title">SIZING SPECTRUM &amp; GRADING STANDARDS</div>
      <div class="overview-body">
        Every batch undergoes mechanical vibro-screening and hand optical sorting to ensure strict size consistency and defect elimination.
        <table class="grading-table">
          <thead>
            <tr>
              <th>Grading Tier</th>
              <th>Nominal Size</th>
              <th>Primary Architectural Use</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Nano &amp; Micro-Chips</strong></td>
              <td>{localize_dimensions('0.5 – 5 mm', lang)}</td>
              <td>Resin terrazzo matrix, Venetian plaster, bonsai top</td>
            </tr>
            <tr>
              <td><strong>Mini Pebbles &amp; Chips</strong></td>
              <td>{localize_dimensions('5 – 15 mm', lang)}</td>
              <td>Resin-bound footpaths, raked zen gardens, planter dressing</td>
            </tr>
            <tr>
              <td><strong>Standard River Pebbles</strong></td>
              <td>{localize_dimensions('15 – 35 mm', lang)}</td>
              <td>Water rills, swimming pool copings, courtyard margins</td>
            </tr>
            <tr>
              <td><strong>Large Landscape Stones</strong></td>
              <td>{localize_dimensions('35 – 70 mm', lang)}</td>
              <td>Dry riverbeds, water cascades, bioswales, tree grates</td>
            </tr>
            <tr>
              <td><strong>Jumbo Boulders &amp; Flat</strong></td>
              <td>{localize_dimensions('80 – 180 mm', lang)}</td>
              <td>Focal boulders, barefoot paths, stepping stone cairns</td>
            </tr>
          </tbody>
        </table>
        <br>
        <strong>Surface Finishes:</strong><br>
        • <em>Tumbled High-Luster:</em> Multi-stage diamond tumbling producing glossy glass-like sheen.<br>
        • <em>Natural Riverbed Matte:</em> Silky smooth tactile touch without synthetic sealers.<br>
        • <em>Angular Crushed:</em> Precision jaw-crushed chips with sharp faceted compaction.
      </div>
    </div>

    <div class="overview-card">
      <div class="overview-title">CORE APPLICATION DOMAINS</div>
      <div class="overview-body">
        <strong>• Contemporary Zen &amp; Japanese Gardens:</strong> High-contrast pairings of Elegant Black with White Dew create meditative stillness and timeless negative space.<br><br>
        <strong>• Luxury Pool Surrounds &amp; Beach Entries:</strong> Tumbled round stones provide soothing barefoot comfort, natural reflexology, and high slip resistance wet or dry.<br><br>
        <strong>• Water Features &amp; Cascades:</strong> Polished agates intensify their vivid jewel tones under flowing water, reflecting submerged lighting without algae accumulation.<br><br>
        <strong>• Permeable Paving &amp; Eco-Driveways:</strong> Mechanically interlocking angular chips provide heavy load stability while enabling rapid rainwater infiltration and groundwater replenishment.
      </div>
    </div>
  </div>

  <div class="prod-footer-bar">
    <span>STONE TECH ATELIER · NATURAL STONE PEBBLES &amp; SEMI-PRECIOUS AGGREGATES</span>
    <span>{COMMON_I18N['page_x_of_y'][lang](2, total_pages, lang)}</span>
    <span>WWW.STONETECH.IN · DIRECT FACTORY ENQUIRIES: +91 77420 90866 / +91 97844 52998</span>
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

        parts.append(f"""
<div class="page">
  <div class="prod-header-bar">
    <div class="prod-header-left">
      <span class="prod-brand-mini">STONE TECH ATELIER</span>
      <span class="prod-cat-badge">ARCHITECTURAL COLLECTION</span>
    </div>
    <div class="prod-header-right">PAGE {to_indic(p_idx + 1, lang)} OF {to_indic(num_product_pages, lang)} · PRODUCTS #{to_indic(start_idx + 1, lang)}–#{to_indic(end_idx, lang)}</div>
  </div>

  <div class="product-grid">
""")

        for item in page_items:
            item_id = item["id"]
            img_rel_path = f"file://{os.path.join(ASSETS_DIR, f'pebble_{item_id:03d}.jpg')}"

            p_name = item["name"]
            local_name = PEBBLE_NAMES.get(p_name, {}).get(lang, p_name) if lang != "en" else p_name
            display_name = f"{local_name} ({p_name})" if lang != "en" and local_name != p_name else p_name

            p_cat = item["category"]
            local_cat = PEBBLE_CATEGORIES.get(p_cat, {}).get(lang, p_cat) if lang != "en" else p_cat

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
        <div class="product-finish">{item['finish']}</div>
        <div class="product-spec-line"><strong>{label_size}:</strong> {localize_dimensions(item['sizes'], lang)}</div>
        <div class="product-spec-line"><strong>{label_mineral}:</strong> {item['mineral']}</div>
        <div class="product-spec-line"><strong>{label_color}:</strong> {item['color']}</div>
        <div class="product-spec-line"><strong>{label_app}:</strong> {item['use']}</div>
        <div class="product-desc">{item['desc']}</div>
      </div>
    </div>
""")

        # If on the last page and fewer than 4 items, add feature card
        if len(page_items) < 4:
            parts.append("""
    <div class="feature-spec-card">
      <div class="feature-spec-title">CUSTOM GRADATIONS &amp; PALETTES</div>
      <div class="feature-spec-desc">
        Stone Tech Atelier offers bespoke sizing, mechanical tumble calibration, and custom mineral blends for large-scale architectural projects, luxury resorts, and civic plazas.<br><br>
        <strong>Available on Project Order:</strong><br>
        • Custom mesh sieve sizing (from 0.2mm sand to 250mm boulders)<br>
        • Tailored Pantone / RAL color matching &amp; poly-aggregate blends<br>
        • Ready-to-use pre-blended resin aggregate kits with certified UV binders<br>
        • Dedicated quarry batch lot certification for multi-phase hospitality builds
      </div>
    </div>
""")

        parts.append(f"""
  </div>

  <div class="prod-footer-bar">
    <span>STONE TECH ATELIER · NATURAL STONE PEBBLES &amp; SEMI-PRECIOUS AGGREGATES</span>
    <span>{COMMON_I18N['page_x_of_y'][lang](current_page, total_pages, lang)}</span>
    <span>WWW.STONETECH.IN · DIRECT FACTORY ENQUIRIES: +91 77420 90866 / +91 97844 52998</span>
  </div>
</div>
""")

    # =========================================================================
    # PAGE 22: TECHNICAL DATA & AREA COVERAGE GUIDE
    # =========================================================================
    current_page += 1
    parts.append(f"""
<div class="page">
  <div class="prod-header-bar">
    <div class="prod-header-left">
      <span class="prod-brand-mini">STONE TECH ATELIER</span>
      <span class="prod-cat-badge">ENGINEERING DATA</span>
    </div>
    <div class="prod-header-right">COVERAGE CALCULATOR &amp; INSTALLATION SPECIFICATIONS</div>
  </div>

  <div class="tech-grid">
    <div class="tech-card">
      <div class="tech-title">AREA COVERAGE &amp; QUANTITY ESTIMATION MATRIX</div>
      <div class="overview-body">
        The required pebble quantity depends on the aggregate nominal size and desired layer depth. For optimal ground concealment without soil peek-through, layer depth must equal at least 1.5 to 2 times the maximum pebble diameter.
        <table class="grading-table" style="margin-top: 3mm;">
          <thead>
            <tr>
              <th>Pebble Grade</th>
              <th>Layer Depth</th>
              <th>Coverage per 100 kg</th>
              <th>Weight per m²</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Micro Chips (3–8mm)</strong></td>
              <td>{localize_dimensions('15 mm', lang)}</td>
              <td>~ {to_indic('4.0', lang)} m² ({to_indic('43', lang)} sq.ft)</td>
              <td>~ {localize_dimensions('25 kg / m²', lang)}</td>
            </tr>
            <tr>
              <td><strong>Mini Pebbles (10–25mm)</strong></td>
              <td>{localize_dimensions('30 mm', lang)}</td>
              <td>~ {to_indic('2.2', lang)} m² ({to_indic('24', lang)} sq.ft)</td>
              <td>~ {localize_dimensions('45 kg / m²', lang)}</td>
            </tr>
            <tr>
              <td><strong>Medium River (25–50mm)</strong></td>
              <td>{localize_dimensions('50 mm', lang)}</td>
              <td>~ {to_indic('1.3', lang)} m² ({to_indic('14', lang)} sq.ft)</td>
              <td>~ {localize_dimensions('75 kg / m²', lang)}</td>
            </tr>
            <tr>
              <td><strong>Large Stones (40–70mm)</strong></td>
              <td>{localize_dimensions('75 mm', lang)}</td>
              <td>~ {to_indic('0.9', lang)} m² ({to_indic('10', lang)} sq.ft)</td>
              <td>~ {localize_dimensions('110 kg / m²', lang)}</td>
            </tr>
            <tr>
              <td><strong>Jumbo Boulders (80–120mm)</strong></td>
              <td>{localize_dimensions('120 mm', lang)}</td>
              <td>~ {to_indic('0.5', lang)} m² ({to_indic('5.5', lang)} sq.ft)</td>
              <td>~ {localize_dimensions('180 kg / m²', lang)}</td>
            </tr>
          </tbody>
        </table>
        <br>
        <strong>Formula:</strong> <em>Area (m²) × Depth (m) × Bulk Density (~1650 kg/m³) = Total Metric Tonnes</em><br>
        <em>Note: Add 5–8% allowance for compaction settling and irregular bedding topography.</em>
      </div>
    </div>

    <div class="tech-card">
      <div class="tech-title">INSTALLATION &amp; MAINTENANCE BEST PRACTICES</div>
      <div class="overview-body">
        <strong>1. Sub-Base Preparation:</strong><br>
        Excavate ground to designated depth. Compact the native subsoil to 95% Standard Proctor density. Lay a 50mm compacted aggregate road-base layer to prevent soft-ground subsidence.<br><br>
        <strong>2. High-Performance Geotextile Membrane:</strong><br>
        Always install heavy-duty non-woven needle-punched polypropylene geotextile fabric (min. 120 gsm). Overlap seams by at least 150mm. This prevents weeds from penetrating and stops stone pebbles from sinking into the subsoil while allowing rapid rainwater drainage.<br><br>
        <strong>3. Perimeter Edging:</strong><br>
        Install rigid aluminum, corten steel, or natural granite curb restraints along all garden margins. Edge restraints must match the finished pebble grade height to eliminate stone scatter onto lawns and walkways.<br><br>
        <strong>4. Cleaning &amp; Seasonal Upkeep:</strong><br>
        Rinse periodically with garden hose or medium-pressure jet spray (max 60 bar) to clear airborne dust and organic debris. For autumn leaf removal, use an electric leaf blower on low throttle held at a shallow angle.
      </div>
    </div>
  </div>

  <div class="prod-footer-bar">
    <span>STONE TECH ATELIER · NATURAL STONE PEBBLES &amp; SEMI-PRECIOUS AGGREGATES</span>
    <span>{COMMON_I18N['page_x_of_y'][lang](current_page, total_pages, lang)}</span>
    <span>WWW.STONETECH.IN · DIRECT FACTORY ENQUIRIES: +91 77420 90866 / +91 97844 52998</span>
  </div>
</div>
""")

    # =========================================================================
    # PAGE 23: BACK COVER
    # =========================================================================
    current_page += 1
    studio_title = COMMON_I18N["experience_center_title"][lang]
    studio_addr = COMMON_I18N["experience_center_address"][lang]

    parts.append(f"""
<div class="page back-page">
  <div class="back-border">
    <div class="cover-inner-border"></div>

    <div class="back-header">
      <div class="cover-medallion" style="margin-bottom: 2mm;">
        <img src="{emblem_src}" alt="Stone Tech Emblem">
      </div>
      <div class="cover-brand" style="font-size: 20pt;">STONE TECH ATELIER</div>
      <div class="cover-subbrand">Architectural Stone Pebbles, Agates &amp; Semi-Precious Aggregates</div>
    </div>

    <div class="studio-grid">
      <div class="studio-card">
        <div class="studio-card-title">{studio_title}</div>
        <strong>STONE TECH PRIVATE LIMITED</strong><br>
        {studio_addr}<br><br>
        <strong>Direct WhatsApp &amp; Sales Hotline:</strong> +91 77420 90866 / +91 97844 52998<br>
        <strong>Email:</strong> info@stonetech.in · sales@stonetech.in<br>
        <strong>Official Website:</strong> www.stonetech.in<br>
        <em>Atelier Hours: Monday – Saturday, 10:00 AM – 7:30 PM IST</em>
      </div>

      <div class="studio-card">
        <div class="studio-card-title">GLOBAL EXPORT LOGISTICS &amp; PALLETIZING</div>
        <strong>Bulk Packaging Options:</strong><br>
        • 25 kg multi-wall poly-woven bags with UV resistance<br>
        • 1.0 MT heavy-duty polypropylene bulk bags with lifting loops<br>
        • ISPM-15 certified heat-treated solid timber export pallets<br><br>
        <strong>Primary Maritime Gateway Ports:</strong><br>
        • Mundra Port (Gujarat) · Hazira Port · JNPT (Mumbai)<br>
        <strong>Certified Quality:</strong> ISO 9001:2015 · CE Marking · Non-Toxic
      </div>
    </div>

    <div style="text-align: center; font-size: 7.5pt; color: #94a3b8; border-top: 0.3mm solid #334155; padding-top: 2.5mm;">
      Direct Manufacturer &amp; Exporter of Natural Stone Pebbles, Semi-Precious Minerals &amp; Architectural Aggregates.<br>
      All rights reserved © 2026-2027 Stone Tech Private Limited. Specifications subject to natural mineral geological variations.
    </div>
  </div>

  <div class="prod-footer-bar">
    <span>STONE TECH ATELIER · ARCHITECTURAL SPECIFICATION CATALOGUE 2026-2027</span>
    <span>{COMMON_I18N['page_x_of_y'][lang](current_page, total_pages, lang)}</span>
    <span>WWW.STONETECH.IN · DIRECT FACTORY ENQUIRIES: +91 77420 90866 / +91 97844 52998</span>
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

    return out_path


def main():
    langs = sys.argv[1:] if len(sys.argv) > 1 else ["en", "hi", "gu"]
    for l in langs:
        build_pdf(l)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
scripts/compile-glass-bricks-multilingual.py

Compiles Architectural Glass Bricks Catalogues into three multilingual editions:
  - Hollow Glass Bricks:
      public/catalogues/StoneTech_Glass_Bricks_Catalogue_English.pdf
      public/catalogues/StoneTech_Glass_Bricks_Catalogue_Hindi.pdf
      public/catalogues/StoneTech_Glass_Bricks_Catalogue_Gujarati.pdf
      (with StoneTech_Glass_Bricks_Catalogue_2026.pdf as master default)
  - Solid Glass Bricks:
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


def generate_hollow_html(lang="en"):
    total_pages = 47
    css = get_fonts_css(lang) + "\n" + hgb.generate_css()
    parts = []

    doc_title = (
        "Stone Tech Atelier — Architectural Hollow Glass Bricks Catalogue 2026-2027"
        if lang == "en"
        else "स्टोन टेक एटेलियर — आर्किटेक्चरल हॉलो ग्लास ब्रिक्स कैटलॉग २०२६-२०२७"
        if lang == "hi"
        else "સ્ટોન ટેક એટેલિયર — આર્કિટેક્ચરલ હોલો ગ્લાસ બ્રિક્સ કેટલોગ ૨૦૨૬-૨૦૨૭"
    )

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
    c_title = (
        "ARCHITECTURAL HOLLOW GLASS BRICKS" if lang == "en"
        else "आर्किटेक्चरल हॉलो ग्लास ब्रिक्स" if lang == "hi"
        else "આર્કિટેક્ચરલ હોલો ગ્લાસ બ્રિક્સ"
    )
    c_sub = (
        "LIGHT TRANSMISSION & THERMAL ACOUSTIC SERIES" if lang == "en"
        else "प्रकाश संचरण एवं थर्मल ध्वनिक सीरीज" if lang == "hi"
        else "પ્રકાશ સંચરણ અને થર્મલ એકોસ્ટિક સિરીઝ"
    )
    c_edition = (
        "2026 – 2027 MASTER SPECIFICATION CATALOGUE" if lang == "en"
        else "२०२६ – २०२७ मास्टर स्पेसिफिकेशन कैटलॉग" if lang == "hi"
        else "૨૦૨૬ – ૨૦૨૭ માસ્ટર સ્પેસિફિકેશન કેટલોગ"
    )

    parts.append(f"""
<div class="page cover-page">
  <div class="cover-border">
    <div class="cover-inner-border"></div>
    
    <div class="cover-header">
      <div class="cover-medallion">
        <img src="file://{hgb.EMBLEM_PATH}">
      </div>
      <div class="cover-brand">STONE TECH ATELIER</div>
      <div class="cover-atelier">ARCHITECTURAL HOLLOW GLASS BRICK DIVISION · SYSTEM ENGINEERED IN INDIA</div>
      <div class="cover-line"></div>
    </div>
    
    <div class="cover-title-group">
      <div class="cover-title1">{c_title}</div>
      <div class="cover-title2">{c_sub}</div>
      <div class="cover-edition">{c_edition}</div>
      <div class="cover-tagline1">Dual-Cavity Partial Vacuum Sealed Glass Blocks · 40–42 dB Acoustic Shield · U-Value ~1.5 W/m²K</div>
      <div class="cover-tagline2">Precision Wave, Reeded, Prismatic & Monolithic Translucent Tinted Systems for Luxury Architecture</div>
    </div>
    
    <div class="cover-pillars">
      <div class="cover-pillar-card">
        <div class="pillar-num">01. THERMAL CORE</div>
        <div class="pillar-head">VACUUM INSULATION</div>
        <div class="pillar-body">Hermetically fused dual-cavity partial vacuum core achieving U-values down to 1.5 W/m²K for energy-efficient facades.</div>
      </div>
      <div class="cover-pillar-card">
        <div class="pillar-num">02. SOUND SHIELD</div>
        <div class="pillar-head">40–42 dB ATTENUATION</div>
        <div class="pillar-body">Engineered acoustic barrier absorbing high and low frequency airborne sound for executive privacy and wellness.</div>
      </div>
      <div class="cover-pillar-card">
        <div class="pillar-num">03. MODULAR GRID</div>
        <div class="pillar-head">VETROKWIK™ DRY-STACK</div>
        <div class="pillar-body">Fast, mortar-free dry assembly utilizing precision PVC structural grid spacers and high-tensile silicone bead bonding.</div>
      </div>
      <div class="cover-pillar-card">
        <div class="pillar-num">04. HIGH STRENGTH</div>
        <div class="pillar-head">> 7.5 N/mm² COMPRESSIVE</div>
        <div class="pillar-body">Kiln-cast borosilicate glass compliant with ASTM C935 & EN 1051 structural and Class E/EW30 fire safety criteria.</div>
      </div>
    </div>
    
    <div class="cover-footer">
      <div>FACTORY & ATELIER: <strong>STONE TECH PRIVATE LIMITED</strong> · AHMEDABAD, GUJARAT, INDIA</div>
      <div>DIRECT SALES & ARCHITECTURAL ORDERS: <strong>+91 77420 90866 / +91 97844 52998</strong> · <strong>WWW.STONETECH.IN</strong></div>
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
          <span class="prod-division-tag" style="background:#1e293b;border-color:#334155;color:#38bdf8;">HOLLOW GLASS BRICKS DIVISION</span>
        </div>
      </div>
      <div class="prod-header-right" style="color:#94a3b8;">
        DIRECT FACTORY ORDERS: <strong style="color:#fbbf24;">+91 77420 90866 / +91 97844 52998</strong> · <strong style="color:#38bdf8;">WWW.STONETECH.IN</strong>
      </div>
    </div>

    <div class="about-grid">
      <div class="about-left">
        <div class="about-badge">MANUFACTURING EXCELLENCE</div>
        <div class="about-title">Luminous Transparency Meets Structural Permanence</div>
        <div class="about-text">
          Stone Tech Atelier manufactures architectural hollow glass blocks engineered to harmonize extreme structural durability with atmospheric ambient illumination.<br><br>
          Produced by fusing two separately pressed hot borosilicate glass half-shells under partial vacuum, each block contains an internal cavity sealed at over 800°C. This hermetic partial vacuum chamber yields exceptional thermal resistance, preventing internal condensation while dampening airborne sound waves up to 42 dB.<br><br>
          From soaring multi-level curtain walls to curvilinear partition screens and radiant luxury bathrooms, Stone Tech hollow glass blocks bring daylight deep into building cores while ensuring total visual privacy.
        </div>
        <div class="about-feats">
          <div class="about-feat-item">
            <div class="about-feat-title">EN 1051 &amp; ASTM C935 CERTIFIED</div>
            <div class="about-feat-desc">Fully tested for dimensional tolerances, surface thermal shock resistance (&Delta;T &ge; 30 K), and compressive strength exceeding 7.5 N/mm².</div>
          </div>
          <div class="about-feat-item">
            <div class="about-feat-title">FIRE SAFETY &amp; RADIANT SHIELD</div>
            <div class="about-feat-desc">Achieves up to 30 to 60 minutes structural fire integrity (Class E / EW30), restricting flame spread and toxic gas transmission.</div>
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
      <div class="prod-footer-addr">AHMEDABAD EXPERIENCE CENTER · DIRECT ENQUIRIES: +91 77420 90866 / +91 97844 52998</div>
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

        label_size = "Dimensions" if lang == "en" else "साइज" if lang == "hi" else "સાઇઝ"
        label_weight = "Weight" if lang == "en" else "वजन" if lang == "hi" else "વજન"
        label_sound = "Sound" if lang == "en" else "ध्वनि" if lang == "hi" else "ધ્વનિ"
        label_fire = "Fire" if lang == "en" else "अग्नि" if lang == "hi" else "અગ્નિ"
        label_pack = "Packing" if lang == "en" else "पैकिंग" if lang == "hi" else "પેકિંગ"

        parts.append(f"""
<div class="page prod-page">
  <div class="prod-header">
    <div class="prod-header-left">
      <img src="file://{hgb.EMBLEM_PATH}" class="prod-emblem">
      <div class="prod-brand-lockup">
        <span class="prod-brand-name">STONE TECH ATELIER</span>
        <span class="prod-division-tag">HOLLOW GLASS BRICKS</span>
      </div>
    </div>
    <div class="prod-header-right">
      TECHNICAL ASSISTANCE: <strong>+91 77420 90866 / +91 97844 52998</strong> · <strong>WWW.STONETECH.IN</strong>
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
          <div class="spec-prod-type">{p['type']}</div>
        </div>
        <div class="spec-prod-code">{p['code']}</div>
      </div>

      <div class="spec-grid">
        <div class="spec-box">
          <div class="spec-box-label">{label_size}</div>
          <div class="spec-box-val">{localize_dimensions(p['size'], lang)}</div>
        </div>
        <div class="spec-box">
          <div class="spec-box-label">{label_weight}</div>
          <div class="spec-box-val">{localize_dimensions(p['weight'], lang)}</div>
        </div>
        <div class="spec-box">
          <div class="spec-box-label">{label_pack}</div>
          <div class="spec-box-val">{localize_dimensions(p['packing'], lang)}</div>
        </div>
        <div class="spec-box">
          <div class="spec-box-label">Transmittance</div>
          <div class="spec-box-val">{p['light_trans']}</div>
        </div>
        <div class="spec-box">
          <div class="spec-box-label">{label_sound}</div>
          <div class="spec-box-val">{p['sound']}</div>
        </div>
        <div class="spec-box">
          <div class="spec-box-label">U-Value</div>
          <div class="spec-box-val">{p['u_value']}</div>
        </div>
        <div class="spec-box">
          <div class="spec-box-label">{label_fire}</div>
          <div class="spec-box-val">{p['fire']}</div>
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
    <div class="prod-footer-addr">AHMEDABAD EXPERIENCE CENTER · DIRECT ENQUIRIES: +91 77420 90866 / +91 97844 52998</div>
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
          <span class="prod-division-tag" style="background:#1e293b;border-color:#334155;color:#38bdf8;">HOLLOW GLASS BRICKS</span>
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
          <strong>Hotline:</strong> +91 77420 90866 / +91 97844 52998<br>
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
      <div class="prod-footer-brand"><strong>STONE TECH ATELIER</strong> · ARCHITECTURAL SPECIFICATION CATALOGUE 2026-2027</div>
      <div class="prod-footer-page" style="color:#fbbf24;">{COMMON_I18N['page_x_of_y'][lang](curr_page, total_pages, lang)}</div>
      <div class="prod-footer-addr">AHMEDABAD EXPERIENCE CENTER · DIRECT ENQUIRIES: +91 77420 90866 / +91 97844 52998</div>
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

    return out_path


def build_solid_pdf(lang="en"):
    print(f"--- Compiling Solid Glass Bricks PDF [{lang.upper()}] ---")
    out_name = (
        "StoneTech_Solid_Glass_Bricks_Catalogue_English.pdf" if lang == "en"
        else "StoneTech_Solid_Glass_Bricks_Catalogue_Hindi.pdf" if lang == "hi"
        else "StoneTech_Solid_Glass_Bricks_Catalogue_Gujarati.pdf"
    )
    out_path = os.path.join(REPO_DIR, "public/catalogues", out_name)
    # Generate solid glass HTML
    base_html = sgb.generate_html()
    # Inject font CSS and language attributes
    font_block = f"<style>{get_fonts_css(lang)}</style>"
    html_content = base_html.replace("<head>", f"<head>\n{font_block}")

    # Localize page numbers and labels if Indic
    if lang != "en":
        html_content = html_content.replace("+91 97844 52118", "+91 97844 52998")
        html_content = html_content.replace("+919784452118", "+91 97844 52998")

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

    return out_path


def main():
    langs = sys.argv[1:] if len(sys.argv) > 1 else ["en", "hi", "gu"]
    for l in langs:
        build_hollow_pdf(l)
        build_solid_pdf(l)


if __name__ == "__main__":
    main()

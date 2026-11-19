#!/usr/bin/env python3
"""
Stone Tech Atelier — Architectural Flexible Clay Veneers Catalogue Generator (2026-2027)
Strictly adheres to Stone Tech Atelier Luxury Architectural Design System (Landscape A4: 297mm x 210mm).
Unifies all user-uploaded source materials:
  - 18 Architectural 3D Textures (with High-Definition Facade Scenes & Swatches)
  - 10 Punch Traventino Slabs (TS 201 - TS 220)
  - 12 Punch Slat Slabs (SK 103 - SK 119)
  - 9-Color System Palette
  - Step-by-Step Installation Field Guide
  - Comprehensive Engineering Performance Matrix & Back Cover

Compiles via Headless Google Chrome with zero raster bloat (target < 20 MiB).
"""

import os
import sys
import time
import subprocess
import shutil

REPO_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ASSETS_DIR = os.path.join(REPO_DIR, "public/catalogues/flexible-clay-assets")
BRANDING_DIR = os.path.join(REPO_DIR, "public/branding")
OUTPUT_PDF = os.path.join(REPO_DIR, "public/catalogues/StoneTech_Flexible_Clay_Veneers_Catalogue_2026.pdf")
DOWNLOADS_PDF = os.path.expanduser("~/Downloads/StoneTech_Flexible_Clay_Veneers_Catalogue_2026.pdf")

EMBLEM_PATH = os.path.join(BRANDING_DIR, "stone-tech-emblem-hq.png")
BADGE_PATH = os.path.join(BRANDING_DIR, "stone-tech-manufacturer-badge.png")

# 18 Architectural 3D Textures
TEXTURES = [
    {
        "code": "ST-FCV-001",
        "name": "Fluted Texture",
        "slug": "fluted",
        "profile": "Linear Fluted Profile · 15mm Pitch",
        "size": "1200 × 2400 mm",
        "thick": "2.5 – 3.5 mm",
        "weight": "3.8 kg / m²",
        "bending": "R ≥ 200 mm",
        "fire": "Class A Non-Combustible",
        "desc": "Precision architectural fluted vertical grooves engineered to create striking rhythmic shadow play across residential villas, commercial podiums, and interior accent walls."
    },
    {
        "code": "ST-FCV-002",
        "name": "Hammerstone Texture",
        "slug": "hammerstone",
        "profile": "Fine Bush-Hammered Relief",
        "size": "1200 × 2400 mm",
        "thick": "2.5 – 3.5 mm",
        "weight": "3.8 kg / m²",
        "bending": "R ≥ 200 mm",
        "fire": "Class A Non-Combustible",
        "desc": "Finely pitted bush-hammered stone surface with organic micro-relief, replicating hand-chiseled masonry while remaining ultra-flexible and featherlight."
    },
    {
        "code": "ST-FCV-003",
        "name": "Ripple Texture",
        "slug": "ripple",
        "profile": "Kinetic Wave Undulation",
        "size": "1200 × 2400 mm",
        "thick": "2.5 – 3.5 mm",
        "weight": "3.8 kg / m²",
        "bending": "R ≥ 200 mm",
        "fire": "Class A Non-Combustible",
        "desc": "Flowing kinetic water-wave ripples designed for curvilinear facades and double-height lobbies, bending smoothly around circular columns and dramatic arches."
    },
    {
        "code": "ST-FCV-004",
        "name": "Weave Texture",
        "slug": "weave",
        "profile": "Interlocking Woven Basket Grid",
        "size": "1200 × 2400 mm",
        "thick": "2.5 – 3.5 mm",
        "weight": "3.8 kg / m²",
        "bending": "R ≥ 200 mm",
        "fire": "Class A Non-Combustible",
        "desc": "Tactile interwoven artisanal relief combining structural geometric precision with warm textile warmth, perfectly suited for luxury feature walls and hospitality spaces."
    },
    {
        "code": "ST-FCV-005",
        "name": "Cube Texture",
        "slug": "cube",
        "profile": "Faceted 3D Geometric Relief",
        "size": "1200 × 2400 mm",
        "thick": "2.5 – 3.5 mm",
        "weight": "3.8 kg / m²",
        "bending": "R ≥ 200 mm",
        "fire": "Class A Non-Combustible",
        "desc": "Modern geometric low-relief faceted blocks creating bold chiaroscuro contrast and architectural dynamism under ambient exterior sunlight."
    },
    {
        "code": "ST-FCV-006",
        "name": "Romastone Texture",
        "slug": "romastone",
        "profile": "Antiqued Italian Ashlar Masonry",
        "size": "1200 × 2400 mm",
        "thick": "2.5 – 3.5 mm",
        "weight": "3.8 kg / m²",
        "bending": "R ≥ 200 mm",
        "fire": "Class A Non-Combustible",
        "desc": "Evoking classical Roman chiseled stone block facades, delivering centuries-old architectural gravitas with 21st-century ultra-thin flexibility."
    },
    {
        "code": "ST-FCV-007",
        "name": "Linea Texture",
        "slug": "linea",
        "profile": "Continuous Micro-Linear Grooves",
        "size": "1200 × 2400 mm",
        "thick": "2.5 – 3.5 mm",
        "weight": "3.8 kg / m²",
        "bending": "R ≥ 200 mm",
        "fire": "Class A Non-Combustible",
        "desc": "Refined continuous vertical micro-linear striations providing sleek, modern verticality for expansive outdoor terraces, landscape walls, and facade claddings."
    },
    {
        "code": "ST-FCV-008",
        "name": "Mosaic Texture",
        "slug": "mosaic",
        "profile": "Modular Split-Face Square Grid",
        "size": "1200 × 2400 mm",
        "thick": "2.5 – 3.5 mm",
        "weight": "3.8 kg / m²",
        "bending": "R ≥ 200 mm",
        "fire": "Class A Non-Combustible",
        "desc": "Precision square modular split-face tiles arranged in seamless continuous sheets, eliminating tedious individual tile laying while retaining authentic stone variety."
    },
    {
        "code": "ST-FCV-009",
        "name": "Riverstone Texture",
        "slug": "riverstone",
        "profile": "Naturally Weathered Stone Cleft",
        "size": "1200 × 2400 mm",
        "thick": "2.5 – 3.5 mm",
        "weight": "3.8 kg / m²",
        "bending": "R ≥ 200 mm",
        "fire": "Class A Non-Combustible",
        "desc": "Smooth, matte riverbed-eroded stone grain providing organic tranquility and subtle textural interest for contemporary minimalist villas."
    },
    {
        "code": "ST-FCV-010",
        "name": "Horizon Texture",
        "slug": "horizon",
        "profile": "Fine Continuous Horizontal Grain",
        "size": "1200 × 2400 mm",
        "thick": "2.5 – 3.5 mm",
        "weight": "3.8 kg / m²",
        "bending": "R ≥ 200 mm",
        "fire": "Class A Non-Combustible",
        "desc": "Extending architectural sightlines with delicate horizontal striations, visually broadening elevations and creating calm, disciplined exterior volumes."
    },
    {
        "code": "ST-FCV-011",
        "name": "Cemento Texture",
        "slug": "cemento",
        "profile": "Fair-Faced Architectural Concrete",
        "size": "1200 × 2400 mm",
        "thick": "2.5 – 3.5 mm",
        "weight": "3.8 kg / m²",
        "bending": "R ≥ 200 mm",
        "fire": "Class A Non-Combustible",
        "desc": "Industrial raw formwork concrete texture that flexes around curved organic walls, allowing brutalist architectural aesthetics without heavy pre-cast panels."
    },
    {
        "code": "ST-FCV-012",
        "name": "Travertino Texture",
        "slug": "travertino",
        "profile": "Classic Vein-Cut Porous Relief",
        "size": "1200 × 2400 mm",
        "thick": "2.5 – 3.5 mm",
        "weight": "3.8 kg / m²",
        "bending": "R ≥ 200 mm",
        "fire": "Class A Non-Combustible",
        "desc": "Timeless Mediterranean porous travertine cavities and linear bedding planes, offering warm classical luxury for courtyard walls and reception facades."
    },
    {
        "code": "ST-FCV-013",
        "name": "Moonstone Texture",
        "slug": "moonstone",
        "profile": "Craggy Volcanic Rock Relief",
        "size": "1200 × 2400 mm",
        "thick": "2.5 – 3.5 mm",
        "weight": "3.8 kg / m²",
        "bending": "R ≥ 200 mm",
        "fire": "Class A Non-Combustible",
        "desc": "Deep, craggy volcanic rock craters and tactile stone clefts, ideal for dramatic high-contrast modern architecture and statement entrance portals."
    },
    {
        "code": "ST-FCV-014",
        "name": "Ledgestone Texture",
        "slug": "ledgestone",
        "profile": "Stacked Dimensional Ledger Stone",
        "size": "1200 × 2400 mm",
        "thick": "2.5 – 3.5 mm",
        "weight": "3.8 kg / m²",
        "bending": "R ≥ 200 mm",
        "fire": "Class A Non-Combustible",
        "desc": "Intricate stacked stone strips delivering heavy dimensional masonry appearance with zero structural footing reinforcement requirements."
    },
    {
        "code": "ST-FCV-015",
        "name": "Earthstone Texture",
        "slug": "earthstone",
        "profile": "Coarse Sedimentary Earth Grain",
        "size": "1200 × 2400 mm",
        "thick": "2.5 – 3.5 mm",
        "weight": "3.8 kg / m²",
        "bending": "R ≥ 200 mm",
        "fire": "Class A Non-Combustible",
        "desc": "Coarse natural sedimentary mineral texture grounding commercial pavilions, restaurants, and outdoor living environments in earthy authenticity."
    },
    {
        "code": "ST-FCV-016",
        "name": "Checkered Texture",
        "slug": "checkered",
        "profile": "Pillowed 3D Grid Masonry",
        "size": "1200 × 2400 mm",
        "thick": "2.5 – 3.5 mm",
        "weight": "3.8 kg / m²",
        "bending": "R ≥ 200 mm",
        "fire": "Class A Non-Combustible",
        "desc": "Subtly pillowed dimensional checkerboard grid introducing sculptural depth and modern geometric balance to residential exterior walls."
    },
    {
        "code": "ST-FCV-017",
        "name": "Carved Texture",
        "slug": "carved",
        "profile": "Hand-Tooled Artisanal Chisel Marks",
        "size": "1200 × 2400 mm",
        "thick": "2.5 – 3.5 mm",
        "weight": "3.8 kg / m²",
        "bending": "R ≥ 200 mm",
        "fire": "Class A Non-Combustible",
        "desc": "Artisanal vertical chisel strokes reflecting bespoke stone craftsmanship, chosen by master architects for flagship luxury retail showrooms."
    },
    {
        "code": "ST-FCV-018",
        "name": "Slate Texture",
        "slug": "slate",
        "profile": "Natural Mountain Slate Cleavage",
        "size": "1200 × 2400 mm",
        "thick": "2.5 – 3.5 mm",
        "weight": "3.8 kg / m²",
        "bending": "R ≥ 200 mm",
        "fire": "Class A Non-Combustible",
        "desc": "Fine laminar mountain slate clefts displaying organic layered cleavage surfaces for sophisticated urban street-corner buildings and multi-story retail facades."
    }
]

# 10 Punch Traventino Slabs (TS 201 - TS 220)
PUNCH_TRAVENTINO = [
    {"code": "ST-FPT-201", "name": "TS 201", "slug": "ts201", "tone": "Warm Beige Vein Travertine", "desc": "Golden beige linear sedimentary travertine grain with subtle porous fissures."},
    {"code": "ST-FPT-202", "name": "TS 202", "slug": "ts202", "tone": "Cool Grey Architectural Travertine", "desc": "Contemporary silvery-grey vein-cut travertine providing cool architectural elegance."},
    {"code": "ST-FPT-205", "name": "TS 205", "slug": "ts205", "tone": "Golden Sand Punch Travertine", "desc": "Luminous honey-toned travertine with rich organic warmth and depth."},
    {"code": "ST-FPT-206G", "name": "TS 206 Grey", "slug": "ts206_grey", "tone": "Silver Ash Punch Travertine", "desc": "Minimalist ash-grey travertine with soft vertical grain for urban residential projects."},
    {"code": "ST-FPT-206", "name": "TS 206", "slug": "ts206", "tone": "Crema Delicate Punch Travertine", "desc": "Soft creamy ivory travertine with delicate longitudinal veining."},
    {"code": "ST-FPT-211", "name": "TS 211", "slug": "ts211", "tone": "Classic Roman Punch Travertine", "desc": "Historical Italian Roman travertine texture featuring authentic cavity depressions."},
    {"code": "ST-FPT-212", "name": "TS 212", "slug": "ts212", "tone": "Titanium Grey Punch Travertine", "desc": "Urban slate-toned travertine grain pairing seamlessly with glass and steel framing."},
    {"code": "ST-FPT-213", "name": "TS 213", "slug": "ts213", "tone": "Dark Basalt Punch Travertine", "desc": "Dramatic charcoal-tinted volcanic travertine offering deep architectural contrast."},
    {"code": "ST-FPT-219", "name": "TS 219", "slug": "ts219", "tone": "Swirl Cloud Punch Travertine", "desc": "Dynamic fluid cloudy travertine currents with painterly organic motion."},
    {"code": "ST-FPT-220", "name": "TS 220", "slug": "ts220", "tone": "Earthy Canyon Punch Travertine", "desc": "Earthy canyon sedimentary swirls and warm amber minerals for bold natural statements."}
]

# 12 Punch Slat Slabs (SK 103 - SK 119)
PUNCH_SLAT = [
    {"code": "ST-FPS-103", "name": "SK 103", "slug": "sk103", "tone": "Warm Sandstone Slat", "desc": "Golden sandstone cleft grain with natural diagonal stratification."},
    {"code": "ST-FPS-103G", "name": "SK 103 Grey", "slug": "sk103_grey", "tone": "Silver Cleft Slat", "desc": "Crisp cool silver-grey cleft slate with fine geological striations."},
    {"code": "ST-FPS-106", "name": "SK 106", "slug": "sk106", "tone": "Crema Limestone Slat", "desc": "Warm cream limestone patina with soft cloud-like mineral clusters."},
    {"code": "ST-FPS-108", "name": "SK 108", "slug": "sk108", "tone": "Industrial Slate Grey", "desc": "Deep industrial charcoal slate finish with subtle metallic sheen."},
    {"code": "ST-FPS-109", "name": "SK 109", "slug": "sk109", "tone": "Rust Autumn Quartzite", "desc": "Rich oxidized autumn rust minerals intermingled with dark earth slate."},
    {"code": "ST-FPS-110", "name": "SK 110", "slug": "sk110", "tone": "Sunlit Ochre Slat", "desc": "Vibrant sun-kissed ochre tones reflecting Mediterranean cliff formations."},
    {"code": "ST-FPS-111", "name": "SK 111", "slug": "sk111", "tone": "Alabaster Earth Slat", "desc": "Subtle earth-toned alabaster with creamy textural undertones."},
    {"code": "ST-FPS-112", "name": "SK 112", "slug": "sk112", "tone": "Mocha Earth Slat", "desc": "Warm mocha-tinted sedimentary rock surface with balanced earth tones."},
    {"code": "ST-FPS-114", "name": "SK 114", "slug": "sk114", "tone": "Ivory Grain Slat", "desc": "Delicate fine-grained ivory stone with linear cleavage fractures."},
    {"code": "ST-FPS-115", "name": "SK 115", "slug": "sk115", "tone": "Desert Rosé Slat", "desc": "Warm desert sand and blush rose minerals capturing sunset light."},
    {"code": "ST-FPS-117", "name": "SK 117", "slug": "sk117", "tone": "Pearl Travertine Slat", "desc": "Soft pearl beige travertine cross-grain with gentle texture."},
    {"code": "ST-FPS-119", "name": "SK 119", "slug": "sk119", "tone": "Nordic Mist Concrete", "desc": "Minimalist light mist-grey architectural surface with micro-cement feel."}
]

# 9 Signature Architectural Colors
COLORS = [
    {"name": "White", "hex": "#f8fafc", "border": "#cbd5e1"},
    {"name": "Sandy Beige", "hex": "#d4b996", "border": "#b89a74"},
    {"name": "Light Cool Grey", "hex": "#cbd5e1", "border": "#94a3b8"},
    {"name": "Muted Olive", "hex": "#8c8a66", "border": "#6e6d4c"},
    {"name": "Terracotta", "hex": "#b45309", "border": "#92400e"},
    {"name": "Medium Charcoal Grey", "hex": "#475569", "border": "#334155"},
    {"name": "Deep Chocolate Brown", "hex": "#3e2723", "border": "#271410"},
    {"name": "Dark Espresso", "hex": "#212121", "border": "#000000"},
    {"name": "Black", "hex": "#0f172a", "border": "#000000"}
]


def generate_css():
    return """
@page {
  size: 297mm 210mm;
  margin: 0;
}
* {
  box-sizing: border-box;
  -webkit-font-smoothing: antialiased;
}
body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: #0f172a;
  color: #f8fafc;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.page {
  width: 297mm;
  height: 210mm;
  page-break-after: always;
  position: relative;
  overflow: hidden;
  background: #0f172a;
}

/* -------------------------------------------------------------------------
   COVER PAGE
------------------------------------------------------------------------- */
.cover-page {
  background: #0f172a;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 10mm 12mm;
}
.cover-border {
  width: 100%;
  height: 100%;
  border: 1.5mm solid #d97706;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 8mm 12mm;
}
.cover-inner-border {
  position: absolute;
  top: 1.5mm;
  left: 1.5mm;
  right: 1.5mm;
  bottom: 1.5mm;
  border: 0.4mm solid #f59e0b;
  pointer-events: none;
}
.cover-header {
  text-align: center;
  position: relative;
  z-index: 2;
}
.cover-medallion {
  width: 22mm;
  height: 22mm;
  margin: 0 auto 3mm;
  background: #ffffff;
  border: 1mm solid #f59e0b;
  border-radius: 4mm;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5mm;
}
.cover-medallion img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.cover-brand {
  font-size: 24pt;
  font-weight: 800;
  letter-spacing: 2px;
  color: #f59e0b;
  margin-bottom: 1mm;
}
.cover-atelier {
  font-size: 8.5pt;
  font-weight: 700;
  letter-spacing: 3px;
  color: #94a3b8;
}
.cover-line {
  width: 60mm;
  height: 0.5mm;
  background: linear-gradient(90deg, transparent, #f59e0b, transparent);
  margin: 3mm auto 0;
}
.cover-title-group {
  text-align: center;
  margin: 2mm 0;
  z-index: 2;
}
.cover-title1 {
  font-size: 25pt;
  font-weight: 900;
  color: #ffffff;
  letter-spacing: 1.5px;
  margin-bottom: 2mm;
}
.cover-title2 {
  font-size: 13.5pt;
  font-weight: 700;
  color: #fbbf24;
  letter-spacing: 1px;
  margin-bottom: 2mm;
}
.cover-edition {
  display: inline-block;
  background: #1e293b;
  border: 0.5mm solid #d97706;
  color: #67e8f9;
  font-size: 8pt;
  font-weight: 800;
  letter-spacing: 2px;
  padding: 1mm 5mm;
  border-radius: 2mm;
  margin-bottom: 2.5mm;
}
.cover-tagline1 {
  font-size: 9.5pt;
  font-weight: 500;
  color: #e2e8f0;
  max-width: 210mm;
  margin: 0 auto 1.5mm;
  line-height: 1.35;
}
.cover-tagline2 {
  font-size: 8pt;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.5px;
}
.cover-pillars {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 3.5mm;
  margin: 2mm 0;
  z-index: 2;
}
.cover-pillar-card {
  background: rgba(30, 41, 59, 0.95);
  border: 0.4mm solid #334155;
  border-top: 1.2mm solid #f59e0b;
  border-radius: 2mm;
  padding: 2.5mm 3mm;
  text-align: left;
}
.pillar-num {
  font-size: 6.5pt;
  font-weight: 800;
  color: #f59e0b;
  letter-spacing: 1px;
}
.pillar-head {
  font-size: 7.5pt;
  font-weight: 800;
  color: #ffffff;
  margin: 0.8mm 0;
  letter-spacing: 0.3px;
}
.pillar-body {
  font-size: 6.2pt;
  color: #cbd5e1;
  line-height: 1.35;
}
.cover-footer {
  text-align: center;
  font-size: 7pt;
  color: #94a3b8;
  line-height: 1.45;
  border-top: 0.3mm solid #334155;
  padding-top: 2.5mm;
  z-index: 2;
}
.cover-footer strong {
  color: #fbbf24;
}

/* -------------------------------------------------------------------------
   HEADER & FOOTER (PAGES 2+)
------------------------------------------------------------------------- */
.prod-header {
  height: 14mm;
  border-bottom: 0.4mm solid #334155;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10mm;
  background: #0f172a;
}
.prod-header-left {
  display: flex;
  align-items: center;
  gap: 3mm;
}
.prod-emblem {
  width: 9mm;
  height: 9mm;
  background: #fff;
  border: 0.4mm solid #f59e0b;
  border-radius: 1.5mm;
  padding: 0.8mm;
  object-fit: contain;
}
.prod-brand-lockup {
  display: flex;
  align-items: center;
  gap: 2mm;
}
.prod-brand-name {
  font-size: 10pt;
  font-weight: 800;
  color: #f59e0b;
  letter-spacing: 0.8px;
}
.prod-division-tag {
  font-size: 7pt;
  font-weight: 700;
  color: #94a3b8;
  letter-spacing: 1.5px;
  border-left: 0.4mm solid #475569;
  padding-left: 2mm;
}
.prod-header-right {
  font-size: 7pt;
  color: #cbd5e1;
  letter-spacing: 0.5px;
}
.prod-header-right strong {
  color: #fbbf24;
}

.prod-footer-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 8mm;
  border-top: 0.3mm solid #334155;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10mm;
  font-size: 6.5pt;
  color: #64748b;
  background: #0b1120;
}
.prod-footer-bar strong {
  color: #94a3b8;
}

/* -------------------------------------------------------------------------
   COLLECTION DIVIDER PAGES
------------------------------------------------------------------------- */
.divider-page {
  padding: 10mm 12mm;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.divider-border {
  width: 100%;
  height: 100%;
  border: 1mm solid #d97706;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 15mm;
  text-align: center;
  background: radial-gradient(circle at center, #1e293b 0%, #0f172a 100%);
}
.divider-badge {
  background: #1e293b;
  border: 0.5mm solid #f59e0b;
  color: #fbbf24;
  font-size: 8pt;
  font-weight: 800;
  letter-spacing: 2.5px;
  padding: 1.5mm 6mm;
  border-radius: 2mm;
  margin-bottom: 4mm;
}
.divider-title {
  font-size: 26pt;
  font-weight: 900;
  color: #ffffff;
  letter-spacing: 1.5px;
  margin-bottom: 2mm;
}
.divider-sub {
  font-size: 12pt;
  font-weight: 600;
  color: #67e8f9;
  letter-spacing: 1px;
  margin-bottom: 6mm;
}
.divider-desc {
  font-size: 9pt;
  color: #cbd5e1;
  max-width: 190mm;
  line-height: 1.5;
  margin-bottom: 8mm;
}
.divider-specs {
  display: flex;
  gap: 5mm;
}
.divider-spec-chip {
  background: #0f172a;
  border: 0.3mm solid #334155;
  border-radius: 2mm;
  padding: 2mm 4mm;
  font-size: 7.5pt;
  color: #f8fafc;
}
.divider-spec-chip strong {
  color: #f59e0b;
}

/* -------------------------------------------------------------------------
   TEXTURE PRODUCT SPREAD (PAGE 5 - 22)
------------------------------------------------------------------------- */
.texture-grid {
  display: grid;
  grid-template-columns: 172mm 105mm;
  gap: 5mm;
  padding: 5mm 10mm 12mm;
  height: calc(210mm - 22mm);
}
.scene-frame {
  height: 100%;
  border: 0.4mm solid #334155;
  border-radius: 2.5mm;
  overflow: hidden;
  background: #020617;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.scene-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.scene-badge {
  position: absolute;
  top: 3mm;
  left: 3mm;
  background: rgba(15, 23, 42, 0.85);
  border: 0.3mm solid #d97706;
  border-radius: 1.5mm;
  padding: 1mm 2.5mm;
  font-size: 6.5pt;
  font-weight: 700;
  color: #fbbf24;
  letter-spacing: 0.5px;
}
.texture-sidebar {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
}
.texture-title-box {
  background: #1e293b;
  border: 0.4mm solid #334155;
  border-left: 1.5mm solid #f59e0b;
  border-radius: 2mm;
  padding: 3mm 4mm;
}
.texture-code-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1mm;
}
.texture-code {
  font-size: 8pt;
  font-weight: 800;
  color: #67e8f9;
  letter-spacing: 1px;
}
.texture-pill {
  font-size: 6pt;
  font-weight: 700;
  background: #0f172a;
  border: 0.3mm solid #475569;
  color: #f59e0b;
  padding: 0.5mm 2mm;
  border-radius: 1mm;
}
.texture-name {
  font-size: 14pt;
  font-weight: 900;
  color: #ffffff;
  letter-spacing: 0.5px;
}
.texture-profile {
  font-size: 7.5pt;
  font-weight: 600;
  color: #94a3b8;
  margin-top: 0.5mm;
}

.swatch-frame {
  height: 60mm;
  border: 0.4mm solid #334155;
  border-radius: 2mm;
  overflow: hidden;
  background: #020617;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 2mm 0;
}
.swatch-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.swatch-tag {
  position: absolute;
  bottom: 2mm;
  right: 2mm;
  background: rgba(15, 23, 42, 0.85);
  border: 0.3mm solid #475569;
  color: #cbd5e1;
  font-size: 6pt;
  font-weight: 700;
  padding: 0.6mm 2mm;
  border-radius: 1mm;
}

.texture-specs-box {
  background: #1e293b;
  border: 0.4mm solid #334155;
  border-radius: 2mm;
  padding: 2.5mm 3.5mm;
}
.spec-grid-2x2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2mm;
  margin-bottom: 2mm;
}
.spec-chip {
  background: #0f172a;
  border: 0.3mm solid #334155;
  border-radius: 1.5mm;
  padding: 1.5mm 2mm;
}
.spec-label {
  font-size: 5.5pt;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.spec-value {
  font-size: 7.5pt;
  font-weight: 800;
  color: #ffffff;
  margin-top: 0.3mm;
}

.colors-ribbon {
  background: #0f172a;
  border: 0.3mm solid #334155;
  border-radius: 1.5mm;
  padding: 1.5mm 2.5mm;
  margin-bottom: 2mm;
}
.colors-ribbon-title {
  font-size: 5.5pt;
  font-weight: 700;
  color: #fbbf24;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  margin-bottom: 1.2mm;
}
.colors-swatch-row {
  display: flex;
  gap: 1.5mm;
}
.color-circle {
  width: 5mm;
  height: 5mm;
  border-radius: 50%;
  border: 0.4mm solid #475569;
}

.texture-desc-box {
  font-size: 6.5pt;
  color: #cbd5e1;
  line-height: 1.35;
  background: #0f172a;
  border: 0.3mm solid #334155;
  border-radius: 1.5mm;
  padding: 2mm 2.5mm;
}

/* -------------------------------------------------------------------------
   DUAL-SLAB SHOWCASE (TRAVENTINO & SLAT)
------------------------------------------------------------------------- */
.dual-slab-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8mm;
  padding: 5mm 12mm 12mm;
  height: calc(210mm - 22mm);
}
.slab-card {
  background: #1e293b;
  border: 0.4mm solid #334155;
  border-radius: 2.5mm;
  padding: 3mm;
  display: grid;
  grid-template-columns: 46mm 1fr;
  gap: 4mm;
  height: 100%;
}
.slab-frame {
  height: 100%;
  background: #0b1120;
  border: 0.3mm solid #475569;
  border-radius: 1.5mm;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.slab-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.slab-info {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
}
.slab-head {
  border-bottom: 0.3mm solid #334155;
  padding-bottom: 2mm;
}
.slab-code {
  font-size: 8.5pt;
  font-weight: 800;
  color: #67e8f9;
  letter-spacing: 0.5px;
}
.slab-name {
  font-size: 13pt;
  font-weight: 900;
  color: #ffffff;
  margin: 0.5mm 0;
}
.slab-tone {
  font-size: 7.5pt;
  font-weight: 700;
  color: #fbbf24;
}
.slab-sizes-box {
  background: #0f172a;
  border: 0.3mm solid #334155;
  border-radius: 1.5mm;
  padding: 2mm;
}
.slab-sizes-title {
  font-size: 5.5pt;
  font-weight: 800;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 1mm;
}
.slab-size-chips {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.2mm;
}
.slab-size-chip {
  background: #1e293b;
  border: 0.2mm solid #475569;
  border-radius: 1mm;
  padding: 1mm;
  font-size: 6.2pt;
  font-weight: 700;
  color: #e2e8f0;
  text-align: center;
}
.slab-badges-list {
  display: flex;
  flex-direction: column;
  gap: 1mm;
}
.slab-badge-item {
  display: flex;
  align-items: center;
  gap: 2mm;
  background: #0f172a;
  border: 0.2mm solid #334155;
  border-radius: 1mm;
  padding: 1mm 2mm;
  font-size: 6.2pt;
  font-weight: 700;
  color: #cbd5e1;
}
.slab-badge-dot {
  width: 2mm;
  height: 2mm;
  background: #f59e0b;
  border-radius: 50%;
}
.slab-desc-box {
  font-size: 6.5pt;
  color: #94a3b8;
  line-height: 1.35;
  border-top: 0.3mm solid #334155;
  padding-top: 1.5mm;
}

/* -------------------------------------------------------------------------
   INSTALLATION GUIDE (PAGE 36)
------------------------------------------------------------------------- */
.install-page {
  padding: 5mm 12mm 12mm;
  height: calc(210mm - 22mm);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.install-header-box {
  border-bottom: 0.4mm solid #334155;
  padding-bottom: 2mm;
}
.install-title {
  font-size: 16pt;
  font-weight: 900;
  color: #ffffff;
  letter-spacing: 0.5px;
}
.install-subtitle {
  font-size: 8pt;
  font-weight: 600;
  color: #fbbf24;
}
.install-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 3.5mm;
  margin: 3mm 0;
}
.install-step-card {
  background: #1e293b;
  border: 0.4mm solid #334155;
  border-top: 1.2mm solid #d97706;
  border-radius: 2mm;
  padding: 3mm;
}
.step-num {
  font-size: 7pt;
  font-weight: 800;
  color: #f59e0b;
  letter-spacing: 1px;
}
.step-head {
  font-size: 8.5pt;
  font-weight: 800;
  color: #ffffff;
  margin: 1mm 0 1.5mm;
}
.step-desc {
  font-size: 6.8pt;
  color: #cbd5e1;
  line-height: 1.4;
}
.install-notes-box {
  background: #0b1120;
  border: 0.3mm solid #d97706;
  border-radius: 2mm;
  padding: 2.5mm 4mm;
  font-size: 7pt;
  color: #cbd5e1;
  line-height: 1.4;
}
.install-notes-box strong {
  color: #f59e0b;
}

/* -------------------------------------------------------------------------
   SPECIFICATION MATRIX & BACK COVER (PAGE 37)
------------------------------------------------------------------------- */
.back-cover-page {
  padding: 6mm 12mm 12mm;
  height: calc(210mm - 22mm);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.matrix-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 6.8pt;
  background: #1e293b;
  border-radius: 2mm;
  overflow: hidden;
  border: 0.4mm solid #334155;
}
.matrix-table th {
  background: #0f172a;
  color: #f59e0b;
  font-weight: 800;
  text-align: left;
  padding: 2mm 3mm;
  border-bottom: 0.4mm solid #475569;
  letter-spacing: 0.5px;
}
.matrix-table td {
  padding: 1.8mm 3mm;
  border-bottom: 0.2mm solid #334155;
  color: #e2e8f0;
}
.matrix-table tr:last-child td {
  border-bottom: none;
}
.matrix-table tr:nth-child(even) td {
  background: rgba(15, 23, 42, 0.4);
}
.matrix-table td.val-strong {
  font-weight: 700;
  color: #67e8f9;
}

.studio-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5mm;
  margin-top: 3mm;
}
.studio-card {
  background: #1e293b;
  border: 0.4mm solid #334155;
  border-radius: 2mm;
  padding: 3.5mm 4mm;
}
.studio-card-title {
  font-size: 8pt;
  font-weight: 800;
  color: #fbbf24;
  letter-spacing: 0.8px;
  margin-bottom: 1.5mm;
}
.studio-card-body {
  font-size: 7pt;
  color: #cbd5e1;
  line-height: 1.45;
}
.studio-card-body strong {
  color: #ffffff;
}
"""


def generate_html():
    total_pages = 37
    css = generate_css()
    parts = []

    parts.append(f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Stone Tech Atelier — Architectural Flexible Clay Veneers Master Catalogue 2026-2027</title>
<style>
{css}
</style>
</head>
<body>
""")

    # -------------------------------------------------------------------------
    # PAGE 1: LUXURY FRONT COVER
    # -------------------------------------------------------------------------
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
      <div class="cover-title1">ARCHITECTURAL FLEXIBLE CLAY VENEERS</div>
      <div class="cover-title2">MODIFIED CLAY MATERIAL (MCM) · ULTRA-THIN BENDING STONE SERIES</div>
      <div class="cover-edition">2026 – 2027 MASTER SPECIFICATION CATALOGUE</div>
      <div class="cover-tagline1">Nature, Engineered — Crafted from real mineral stone, these ultra-thin, flexible sheets retain the richness of authentic natural textures while bending seamlessly where traditional stone cannot.</div>
      <div class="cover-tagline2">Redefining Facades with Flexible Sheets · 18 Textures · 10 Punch Traventino Slabs · 12 Punch Slat Slabs</div>
    </div>
    
    <div class="cover-pillars">
      <div class="cover-pillar-card">
        <div class="pillar-num">01. ULTRA LIGHTWEIGHT</div>
        <div class="pillar-head">2.5–3.5 MM / ~3.8 KG/M²</div>
        <div class="pillar-body">Reduces structural dead-weight by over 80% compared to traditional 20mm masonry, eliminating high-rise anchor systems.</div>
      </div>
      <div class="cover-pillar-card">
        <div class="pillar-num">02. 360° FLEXIBILITY</div>
        <div class="pillar-head">RADIUS R ≥ 200 MM</div>
        <div class="pillar-body">Seamlessly wraps circular columns, organic arches, curved perimeter walls, and sharp 90° corners without cracking.</div>
      </div>
      <div class="cover-pillar-card">
        <div class="pillar-num">03. ALL-WEATHER LIFE</div>
        <div class="pillar-head">CLASS A FIREPROOF / &lt;2% H₂O</div>
        <div class="pillar-body">Non-combustible mineral matrix resistant to intense UV radiation, heavy rainfall, freeze-thaw cycles, and thermal shock.</div>
      </div>
      <div class="cover-pillar-card">
        <div class="pillar-num">04. ECO MINERAL CORE</div>
        <div class="pillar-head">ZERO CEMENT / LOW CARBON</div>
        <div class="pillar-body">Crafted from inorganic natural mineral powder and modified clay, zero toxic VOC emissions, fully recyclable.</div>
      </div>
    </div>
    
    <div class="cover-footer">
      <div>FACTORY & ATELIER: <strong>STONE TECH PRIVATE LIMITED</strong> · AHMEDABAD, GUJARAT, INDIA</div>
      <div>DIRECT ARCHITECTURAL ORDERS & EXPORT: <strong>+91 77420 90866</strong> · <strong>WWW.STONETECH.IN</strong></div>
      <div>DISPATCH TERMINALS: <strong>MUNDRA / HAZIRA / JNPT PORTS</strong> · CONTAINERIZED EXPORT WOODEN CRATING</div>
    </div>
  </div>
</div>
""")

    # -------------------------------------------------------------------------
    # PAGE 2: PHILOSOPHY & BENDING ARCHITECTURAL HERO
    # -------------------------------------------------------------------------
    hero_img = os.path.join(ASSETS_DIR, "hero_bending_facade.jpg")
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
      FACTORY DIRECT ORDERS: <strong>+91 77420 90866</strong> · <strong>WWW.STONETECH.IN</strong>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:120mm 157mm;gap:6mm;padding:6mm 10mm 12mm;height:calc(210mm - 22mm);">
    <div style="display:flex;flex-direction:column;justify-content:space-between;height:100%;">
      <div>
        <div style="font-size:9pt;font-weight:800;color:#f59e0b;letter-spacing:1.5px;margin-bottom:1mm;">NATURE, ENGINEERED</div>
        <div style="font-size:20pt;font-weight:900;color:#ffffff;line-height:1.15;margin-bottom:3mm;">Redefining Facades with Flexible Sheets</div>
        <div style="font-size:8.5pt;color:#cbd5e1;line-height:1.5;margin-bottom:4mm;">
          Crafted from real mineral stone, these ultra-thin, flexible sheets retain the richness of natural textures while unlocking unprecedented architectural freedom.
        </div>
        <div style="font-size:8pt;color:#94a3b8;line-height:1.5;margin-bottom:4mm;">
          It bends and integrates seamlessly where traditional stone cannot. From flat exterior planes to organic columns, undulating canopies, and double-height curves, this is stone designed for boundless creativity.
        </div>
        <div style="background:#1e293b;border:0.4mm solid #334155;border-left:1.5mm solid #d97706;border-radius:2mm;padding:3mm;margin-bottom:4mm;">
          <div style="font-size:7.5pt;font-weight:800;color:#f59e0b;margin-bottom:1mm;">A MATERIAL THAT EXPANDS DESIGN</div>
          <div style="font-size:7pt;color:#cbd5e1;line-height:1.4;">
            Traditional masonry imposes severe structural dead-weight, requiring expensive heavy steel brackets and complex structural substructures. Stone Tech Flexible Clay Veneers weigh under 4 kg/m², bonding directly with polymer adhesive onto concrete, plaster, cement boards, and curved substrates.
          </div>
        </div>
      </div>

      <div style="background:#0f172a;border:0.4mm solid #334155;border-radius:2mm;padding:3mm;">
        <div style="font-size:7pt;font-weight:800;color:#67e8f9;letter-spacing:1px;margin-bottom:2mm;">KEY MATERIAL ADVANTAGES</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:2mm;font-size:6.8pt;color:#cbd5e1;">
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
      <div style="position:absolute;bottom:3mm;left:3mm;right:3mm;background:rgba(15,23,42,0.88);border:0.3mm solid #d97706;border-radius:1.5mm;padding:2mm 3mm;font-size:7pt;color:#e2e8f0;">
        <strong style="color:#fbbf24;">Dynamic 360° Cold Bending:</strong> Multi-tonal flexible sheets wrapping curved architectural columns and facade contours with zero thermal preheating.
      </div>
    </div>
  </div>

  <div class="prod-footer-bar">
    <span>STONE TECH ATELIER · ARCHITECTURAL SPECIFICATION CATALOGUE 2026-2027</span>
    <span>PAGE 2 OF {total_pages}</span>
    <span>WWW.STONETECH.IN · DIRECT FACTORY ENQUIRIES: +91 77420 90866</span>
  </div>
</div>
""")

    # -------------------------------------------------------------------------
    # PAGE 3: 9-COLOR ARCHITECTURAL PALETTE SPREAD
    # -------------------------------------------------------------------------
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
      FACTORY DIRECT ORDERS: <strong>+91 77420 90866</strong> · <strong>WWW.STONETECH.IN</strong>
    </div>
  </div>

  <div style="padding:5mm 10mm 12mm;height:calc(210mm - 22mm);display:flex;flex-direction:column;justify-content:space-between;">
    <div style="border-bottom:0.4mm solid #334155;padding-bottom:2mm;">
      <div style="font-size:8pt;font-weight:800;color:#f59e0b;letter-spacing:1px;">CURATED EARTH TONALITIES</div>
      <div style="font-size:16pt;font-weight:900;color:#ffffff;margin:0.5mm 0;">9 Signature Architectural Colors</div>
      <div style="font-size:7.5pt;color:#94a3b8;">
        Every texture profile in our 3D series is precision-crafted across 9 elemental mineral shades, formulated using inorganic natural pigments with 2000+ hour UV colorfastness.
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:4mm;margin:3mm 0;">
""")
    for c in COLORS:
        parts.append(f"""
      <div style="background:#1e293b;border:0.4mm solid #334155;border-radius:2mm;padding:3mm;display:flex;align-items:center;gap:3mm;">
        <div style="width:14mm;height:14mm;border-radius:2mm;background:{c['hex']};border:0.5mm solid {c['border']};flex-shrink:0;"></div>
        <div>
          <div style="font-size:9.5pt;font-weight:800;color:#ffffff;">{c['name']}</div>
          <div style="font-size:6.5pt;color:#94a3b8;margin-top:0.5mm;">Available across all 18 Textures</div>
          <div style="font-size:6.2pt;color:#67e8f9;margin-top:0.5mm;">UV Resistant · 1200×2400 mm</div>
        </div>
      </div>
""")

    parts.append(f"""
    </div>

    <div style="background:#0b1120;border:0.4mm solid #334155;border-radius:2mm;padding:2.5mm 4mm;display:flex;justify-content:space-between;align-items:center;font-size:7pt;color:#cbd5e1;">
      <div><strong style="color:#fbbf24;">Standard Sizing:</strong> 1200 × 2400 mm Large Format Sheet · Custom architectural lengths up to 3000 mm available upon factory request.</div>
      <div><strong style="color:#67e8f9;">Thickness Profile:</strong> 2.5 mm – 3.5 mm · Weight: ~3.8 kg/m²</div>
    </div>
  </div>

  <div class="prod-footer-bar">
    <span>STONE TECH ATELIER · ARCHITECTURAL SPECIFICATION CATALOGUE 2026-2027</span>
    <span>PAGE 3 OF {total_pages}</span>
    <span>WWW.STONETECH.IN · DIRECT FACTORY ENQUIRIES: +91 77420 90866</span>
  </div>
</div>
""")

    # -------------------------------------------------------------------------
    # PAGE 4: COLLECTION I DIVIDER — ARCHITECTURAL 3D TEXTURES
    # -------------------------------------------------------------------------
    parts.append(f"""
<div class="page divider-page">
  <div class="divider-border">
    <div class="cover-inner-border"></div>
    <div class="divider-badge">COLLECTION 01</div>
    <div class="divider-title">ARCHITECTURAL 3D TEXTURES</div>
    <div class="divider-sub">18 DISTINCT DIMENSIONAL SURFACES · 9 COLORWAYS</div>
    <div class="divider-desc">
      A curated portfolio of dimensional wall surfaces engineered for high-impact facades, curved architectural features, and luxury interiors. From linear fluting and wave ripples to chiseled masonry and raw concrete relief, each profile expands modern building design.
    </div>
    <div class="divider-specs">
      <div class="divider-spec-chip">STANDARD DIMENSIONS: <strong>1200 × 2400 MM</strong></div>
      <div class="divider-spec-chip">THICKNESS: <strong>2.5 – 3.5 MM</strong></div>
      <div class="divider-spec-chip">WEIGHT: <strong>~3.8 KG / M²</strong></div>
      <div class="divider-spec-chip">BENDING: <strong>R ≥ 200 MM</strong></div>
    </div>
  </div>
  <div class="prod-footer-bar">
    <span>STONE TECH ATELIER · ARCHITECTURAL SPECIFICATION CATALOGUE 2026-2027</span>
    <span>PAGE 4 OF {total_pages}</span>
    <span>WWW.STONETECH.IN · DIRECT FACTORY ENQUIRIES: +91 77420 90866</span>
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
      FACTORY DIRECT ORDERS: <strong>+91 77420 90866</strong> · <strong>WWW.STONETECH.IN</strong>
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
          <span class="texture-pill">9 COLORS AVAILABLE</span>
        </div>
        <div class="texture-name">{tex['name']}</div>
        <div class="texture-profile">{tex['profile']}</div>
      </div>

      <div class="swatch-frame">
        <img src="file://{swatch_path}" class="swatch-img">
        <div class="swatch-tag">MACRO TEXTURE SWATCH</div>
      </div>

      <div class="texture-specs-box">
        <div class="spec-grid-2x2">
          <div class="spec-chip">
            <div class="spec-label">Sheet Size</div>
            <div class="spec-value">{tex['size']}</div>
          </div>
          <div class="spec-chip">
            <div class="spec-label">Thickness</div>
            <div class="spec-value">{tex['thick']}</div>
          </div>
          <div class="spec-chip">
            <div class="spec-label">Unit Weight</div>
            <div class="spec-value">{tex['weight']}</div>
          </div>
          <div class="spec-chip">
            <div class="spec-label">Min Bending</div>
            <div class="spec-value">{tex['bending']}</div>
          </div>
        </div>

        <div class="colors-ribbon">
          <div class="colors-ribbon-title">Available Color Palette (9 Signature Tones)</div>
          <div class="colors-swatch-row">
            <div class="color-circle" style="background:#f8fafc;" title="White"></div>
            <div class="color-circle" style="background:#d4b996;" title="Sandy Beige"></div>
            <div class="color-circle" style="background:#cbd5e1;" title="Light Cool Grey"></div>
            <div class="color-circle" style="background:#8c8a66;" title="Muted Olive"></div>
            <div class="color-circle" style="background:#b45309;" title="Terracotta"></div>
            <div class="color-circle" style="background:#475569;" title="Medium Charcoal Grey"></div>
            <div class="color-circle" style="background:#3e2723;" title="Deep Chocolate Brown"></div>
            <div class="color-circle" style="background:#212121;" title="Dark Espresso"></div>
            <div class="color-circle" style="background:#0f172a;" title="Black"></div>
          </div>
        </div>

        <div class="texture-desc-box">
          {tex['desc']}
        </div>
      </div>
    </div>
  </div>

  <div class="prod-footer-bar">
    <span>STONE TECH ATELIER · ARCHITECTURAL SPECIFICATION CATALOGUE 2026-2027</span>
    <span>PAGE {page_num} OF {total_pages}</span>
    <span>WWW.STONETECH.IN · DIRECT FACTORY ENQUIRIES: +91 77420 90866</span>
  </div>
</div>
""")

    # -------------------------------------------------------------------------
    # PAGE 23: COLLECTION II DIVIDER — PUNCH TRAVENTINO SERIES
    # -------------------------------------------------------------------------
    parts.append(f"""
<div class="page divider-page">
  <div class="divider-border">
    <div class="cover-inner-border"></div>
    <div class="divider-badge">COLLECTION 02</div>
    <div class="divider-title">PUNCH TRAVENTINO SERIES</div>
    <div class="divider-sub">10 LARGE-FORMAT VEIN-CUT TRAVERTINE SLABS · 4 SIZING PROFILES</div>
    <div class="divider-desc">
      Authentic Italian travertine longitudinal veining, porous cavities, and rich mineral strata captured on ultra-thin flexible sheets. Offering effortless cold bending around columns, curved foyers, and high-rise exterior cladding without structural dead-load penalties.
    </div>
    <div class="divider-specs">
      <div class="divider-spec-chip">AVAILABLE SIZES: <strong>600×1200 · 600×1500 · 1200×2400 · 1200×3000 MM</strong></div>
      <div class="divider-spec-chip">THICKNESS: <strong>2.5 – 3.2 MM</strong></div>
      <div class="divider-spec-chip">WEIGHT: <strong>~4.0 KG / M²</strong></div>
      <div class="divider-spec-chip">SERIES: <strong>TS 201 – TS 220</strong></div>
    </div>
  </div>
  <div class="prod-footer-bar">
    <span>STONE TECH ATELIER · ARCHITECTURAL SPECIFICATION CATALOGUE 2026-2027</span>
    <span>PAGE 23 OF {total_pages}</span>
    <span>WWW.STONETECH.IN · DIRECT FACTORY ENQUIRIES: +91 77420 90866</span>
  </div>
</div>
""")

    # -------------------------------------------------------------------------
    # PAGES 24 - 28: PUNCH TRAVENTINO DUAL-SLAB SHOWCASES (5 PAGES, 10 SLABS)
    # -------------------------------------------------------------------------
    for pair_idx in range(5):
        page_num = 24 + pair_idx
        s1 = PUNCH_TRAVENTINO[pair_idx * 2]
        s2 = PUNCH_TRAVENTINO[pair_idx * 2 + 1]

        img1_path = os.path.join(ASSETS_DIR, f"pt_{s1['slug']}.jpg")
        img2_path = os.path.join(ASSETS_DIR, f"pt_{s2['slug']}.jpg")

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
      FACTORY DIRECT ORDERS: <strong>+91 77420 90866</strong> · <strong>WWW.STONETECH.IN</strong>
    </div>
  </div>

  <div class="dual-slab-grid">
    <!-- SLAB 1 -->
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
            <div class="slab-size-chip">600 × 1200 mm</div>
            <div class="slab-size-chip">600 × 1500 mm</div>
            <div class="slab-size-chip">1200 × 2400 mm</div>
            <div class="slab-size-chip">1200 × 3000 mm</div>
          </div>
        </div>
        <div class="slab-badges-list">
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Ultra Lightweight (~4.0 kg/m²)</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Highly Flexible (R ≥ 200 mm)</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Durable & Long Lasting Life</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Water & Weather Resistant</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Easy to Cut & Fast Install</div>
        </div>
        <div class="slab-desc-box">
          {s1['desc']}
        </div>
      </div>
    </div>

    <!-- SLAB 2 -->
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
            <div class="slab-size-chip">600 × 1200 mm</div>
            <div class="slab-size-chip">600 × 1500 mm</div>
            <div class="slab-size-chip">1200 × 2400 mm</div>
            <div class="slab-size-chip">1200 × 3000 mm</div>
          </div>
        </div>
        <div class="slab-badges-list">
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Ultra Lightweight (~4.0 kg/m²)</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Highly Flexible (R ≥ 200 mm)</div>
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
    <span>PAGE {page_num} OF {total_pages}</span>
    <span>WWW.STONETECH.IN · DIRECT FACTORY ENQUIRIES: +91 77420 90866</span>
  </div>
</div>
""")

    # -------------------------------------------------------------------------
    # PAGE 29: COLLECTION III DIVIDER — PUNCH SLAT SERIES
    # -------------------------------------------------------------------------
    parts.append(f"""
<div class="page divider-page">
  <div class="divider-border">
    <div class="cover-inner-border"></div>
    <div class="divider-badge">COLLECTION 03</div>
    <div class="divider-title">PUNCH SLAT SERIES</div>
    <div class="divider-sub">12 NATURAL CLEFT SLATE & QUARTZITE SLABS · 4 SIZING PROFILES</div>
    <div class="divider-desc">
      Capturing the rich cleavage, raw split-face topography, and elemental mineral hues of metamorphic slate and quartzites. Featherlight flexible sheets designed for modern residential facades, feature walls, landscape enclosures, and seamless column wrapping.
    </div>
    <div class="divider-specs">
      <div class="divider-spec-chip">AVAILABLE SIZES: <strong>600×1200 · 600×1500 · 1200×2400 · 1200×3000 MM</strong></div>
      <div class="divider-spec-chip">THICKNESS: <strong>2.5 – 3.2 MM</strong></div>
      <div class="divider-spec-chip">WEIGHT: <strong>~4.0 KG / M²</strong></div>
      <div class="divider-spec-chip">SERIES: <strong>SK 103 – SK 119</strong></div>
    </div>
  </div>
  <div class="prod-footer-bar">
    <span>STONE TECH ATELIER · ARCHITECTURAL SPECIFICATION CATALOGUE 2026-2027</span>
    <span>PAGE 29 OF {total_pages}</span>
    <span>WWW.STONETECH.IN · DIRECT FACTORY ENQUIRIES: +91 77420 90866</span>
  </div>
</div>
""")

    # -------------------------------------------------------------------------
    # PAGES 30 - 35: PUNCH SLAT DUAL-SLAB SHOWCASES (6 PAGES, 12 SLABS)
    # -------------------------------------------------------------------------
    for pair_idx in range(6):
        page_num = 30 + pair_idx
        s1 = PUNCH_SLAT[pair_idx * 2]
        s2 = PUNCH_SLAT[pair_idx * 2 + 1]

        img1_path = os.path.join(ASSETS_DIR, f"ps_{s1['slug']}.jpg")
        img2_path = os.path.join(ASSETS_DIR, f"ps_{s2['slug']}.jpg")

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
      FACTORY DIRECT ORDERS: <strong>+91 77420 90866</strong> · <strong>WWW.STONETECH.IN</strong>
    </div>
  </div>

  <div class="dual-slab-grid">
    <!-- SLAB 1 -->
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
            <div class="slab-size-chip">600 × 1200 mm</div>
            <div class="slab-size-chip">600 × 1500 mm</div>
            <div class="slab-size-chip">1200 × 2400 mm</div>
            <div class="slab-size-chip">1200 × 3000 mm</div>
          </div>
        </div>
        <div class="slab-badges-list">
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Ultra Lightweight (~4.0 kg/m²)</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Highly Flexible (R ≥ 200 mm)</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Durable & Long Lasting Life</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Water & Weather Resistant</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Easy to Cut & Fast Install</div>
        </div>
        <div class="slab-desc-box">
          {s1['desc']}
        </div>
      </div>
    </div>

    <!-- SLAB 2 -->
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
            <div class="slab-size-chip">600 × 1200 mm</div>
            <div class="slab-size-chip">600 × 1500 mm</div>
            <div class="slab-size-chip">1200 × 2400 mm</div>
            <div class="slab-size-chip">1200 × 3000 mm</div>
          </div>
        </div>
        <div class="slab-badges-list">
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Ultra Lightweight (~4.0 kg/m²)</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Highly Flexible (R ≥ 200 mm)</div>
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
    <span>PAGE {page_num} OF {total_pages}</span>
    <span>WWW.STONETECH.IN · DIRECT FACTORY ENQUIRIES: +91 77420 90866</span>
  </div>
</div>
""")

    # -------------------------------------------------------------------------
    # PAGE 36: INSTALLATION ENGINEERING GUIDE
    # -------------------------------------------------------------------------
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
      TECHNICAL ASSISTANCE: <strong>+91 77420 90866</strong> · <strong>WWW.STONETECH.IN</strong>
    </div>
  </div>

  <div class="install-page">
    <div class="install-header-box">
      <div class="install-subtitle">OFFICIAL SITE WORKFLOW</div>
      <div class="install-title">Architectural Installation Field Guide</div>
    </div>

    <div class="install-grid">
      <div class="install-step-card">
        <div class="step-num">STEP 01</div>
        <div class="step-head">SUBSTRATE PREPARATION</div>
        <div class="step-desc">
          Ensure substrate (concrete, sand-cement plaster, AAC blocks, calcium silicate board, or plywood) is structurally sound, clean, flat (±2mm over 2m), free of dust, grease, and curing compounds. Apply bonding primer if required.
        </div>
      </div>

      <div class="install-step-card">
        <div class="step-num">STEP 02</div>
        <div class="step-head">ADHESIVE NOTCH TROWELING</div>
        <div class="step-desc">
          Apply high-performance polymer-modified cementitious tile adhesive (C2TE S1/S2 grade) or polyurethane structural adhesive using a 4mm to 6mm square notch trowel. Back-butter the sheet for exterior applications to achieve 100% full bed coverage.
        </div>
      </div>

      <div class="install-step-card">
        <div class="step-num">STEP 03</div>
        <div class="step-head">SHEET POSITIONING &amp; BENDING</div>
        <div class="step-desc">
          Align flexible veneer sheet starting from top or bottom guidelines. For curved columns or radius walls (R ≥ 200 mm), wrap smoothly around the contour with gentle uniform tension. No hot air gun or thermal pre-heating needed.
        </div>
      </div>

      <div class="install-step-card">
        <div class="step-num">STEP 04</div>
        <div class="step-head">RUBBER ROLLER COMPACTION</div>
        <div class="step-desc">
          Press firmly using a wide rubber roller across the entire sheet surface, rolling from center outward to expel trapped air and ensure 100% adhesive transfer and mechanical keying without hollow pockets.
        </div>
      </div>

      <div class="install-step-card">
        <div class="step-num">STEP 05</div>
        <div class="step-head">SEAM JOINTING &amp; GROUTING</div>
        <div class="step-desc">
          Sheets can be installed with hairline tight butt-joints or architectural open joints (2mm – 5mm). For exterior facades, seal joints with matching color UV-stable polyurethane or neutral-cure silicone sealant.
        </div>
      </div>

      <div class="install-step-card">
        <div class="step-num">STEP 06</div>
        <div class="step-head">EDGE TRIMMING &amp; SEALING</div>
        <div class="step-desc">
          Cut easily on-site using a heavy-duty utility knife, oscillating cutter, or fine-tooth circular saw. Wipe clean with a damp sponge. For exterior facades subject to extreme pollution, apply breathable silane/siloxane impregnator.
        </div>
      </div>
    </div>

    <div class="install-notes-box">
      <strong>CRITICAL ENGINEERING NOTE:</strong> Flexible Clay Veneers require zero mechanical anchor pins, drilled bolts, or heavy aluminum substructures for heights up to 24 meters, provided structural substrate adhesion exceeds 1.0 N/mm². Always verify adhesive compatibility on specialized substrates.
    </div>
  </div>

  <div class="prod-footer-bar">
    <span>STONE TECH ATELIER · ARCHITECTURAL SPECIFICATION CATALOGUE 2026-2027</span>
    <span>PAGE 36 OF {total_pages}</span>
    <span>WWW.STONETECH.IN · DIRECT FACTORY ENQUIRIES: +91 77420 90866</span>
  </div>
</div>
""")

    # -------------------------------------------------------------------------
    # PAGE 37: SPECIFICATION MATRIX & BACK COVER
    # -------------------------------------------------------------------------
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
      EXPERIENCE CENTER: <strong>AHMEDABAD, GUJARAT</strong> · <strong>WWW.STONETECH.IN</strong>
    </div>
  </div>

  <div class="back-cover-page">
    <div>
      <div style="font-size:8pt;font-weight:800;color:#f59e0b;letter-spacing:1px;margin-bottom:1mm;">TECHNICAL VALIDATION</div>
      <div style="font-size:15pt;font-weight:900;color:#ffffff;margin-bottom:3mm;">Engineering Performance Matrix</div>
      
      <table class="matrix-table">
        <thead>
          <tr>
            <th>Property / Performance Criterion</th>
            <th>Standard Test Method</th>
            <th>Performance Value / Certified Result</th>
            <th>Significance in Architecture</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Product Classification</strong></td>
            <td>ISO 14021 / ASTM Standards</td>
            <td class="val-strong">Modified Clay Material (MCM) Flexible Mineral Veneer</td>
            <td>Inorganic composite with natural stone feel and flexible core</td>
          </tr>
          <tr>
            <td><strong>Standard Sheet Dimensions</strong></td>
            <td>Dimensional Verification</td>
            <td class="val-strong">1200 × 2400 mm · (Optional: 600×1200, 600×1500, 1200×3000 mm)</td>
            <td>Large-format seamless coverage reducing facade joint count</td>
          </tr>
          <tr>
            <td><strong>Thickness Profile</strong></td>
            <td>Calibrated Digital Micrometer</td>
            <td class="val-strong">2.5 mm – 3.5 mm (± 0.2 mm)</td>
            <td>Ultra-thin lightweight profile preserving internal room dimensions</td>
          </tr>
          <tr>
            <td><strong>Areal Mass / Unit Weight</strong></td>
            <td>ASTM C373 / ISO 10545-3</td>
            <td class="val-strong">3.50 – 4.50 kg / m²</td>
            <td>Over 80% lighter than natural 20mm granite / sandstone slabs</td>
          </tr>
          <tr>
            <td><strong>Fire Safety Rating</strong></td>
            <td>EN 13501-1 / ASTM E84</td>
            <td class="val-strong">Class A (Flame Spread: 0 · Smoke Developed: &lt; 5)</td>
            <td>Non-combustible; certified for high-rise facades and public lobbies</td>
          </tr>
          <tr>
            <td><strong>Water Absorption</strong></td>
            <td>ASTM C97 / ISO 10545-3</td>
            <td class="val-strong">&lt; 2.0% (Hydrophobic impermeable surface)</td>
            <td>Resistant to rain penetration, efflorescence, and moisture stains</td>
          </tr>
          <tr>
            <td><strong>Tensile Bond Strength</strong></td>
            <td>EN 12004 / ASTM C482</td>
            <td class="val-strong">&gt; 1.20 N / mm² (Substrate cohesive failure)</td>
            <td>High shear adhesion preventing delamination under wind suction</td>
          </tr>
          <tr>
            <td><strong>Freeze-Thaw Durability</strong></td>
            <td>EN 1344 / ASTM C666</td>
            <td class="val-strong">100 Cycles (-20°C to +20°C) without cracking/flaking</td>
            <td>Suitable for harsh cold climates, alpine, and desert thermal swings</td>
          </tr>
          <tr>
            <td><strong>Bending Elasticity Radius</strong></td>
            <td>Mandrel Flexibility Test</td>
            <td class="val-strong">R ≥ 200 mm (Cold bending without heating)</td>
            <td>Enables seamless wrapping of round columns, vaults, and arches</td>
          </tr>
          <tr>
            <td><strong>UV &amp; Artificial Weathering</strong></td>
            <td>ASTM G154 (Xenon Arc 2000 hrs)</td>
            <td class="val-strong">ΔE* &lt; 1.5 (Zero perceptible color fading or chalking)</td>
            <td>Preserves vibrant color consistency under intense exterior sunlight</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="studio-grid">
      <div class="studio-card">
        <div class="studio-card-title">VISIT OUR EXPERIENCE CENTER &amp; ARCHITECTURAL STUDIOS</div>
        <div class="studio-card-body">
          <strong>STONE TECH ATELIER · EXPERIENCE CENTER</strong><br>
          E-02, Ground Floor, SG Business Hub, Vasant Nagar, Gota, Ahmedabad, Gujarat 380060<br>
          <strong>Direct WhatsApp &amp; Sales Hotline:</strong> +91 77420 90866 / +91 97844 52118<br>
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
    <span>PAGE {total_pages} OF {total_pages}</span>
    <span>WWW.STONETECH.IN · DIRECT FACTORY ENQUIRIES: +91 77420 90866</span>
  </div>
</div>
""")

    parts.append("""
</body>
</html>
""")

    return "".join(parts)


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


def main():
    print("=================================================================")
    print("STONE TECH ATELIER — FLEXIBLE CLAY VENEERS MASTER CATALOGUE BUILD")
    print("=================================================================")
    
    html = generate_html()
    html_file = "/tmp/flexible_clay_catalogue.html"
    with open(html_file, "w") as f:
        f.write(html)
    print(f"Generated HTML specification ({len(html)} bytes) at {html_file}")

    chrome_bin = get_chrome_executable()
    if not chrome_bin:
        print("ERROR: Google Chrome executable not found!")
        sys.exit(1)

    print(f"Compiling PDF via Headless Google Chrome ({chrome_bin})...")
    start_t = time.time()
    cmd = [
        chrome_bin,
        "--headless=new",
        "--disable-gpu",
        "--no-pdf-header-footer",
        "--print-to-pdf-no-header",
        f"--print-to-pdf={OUTPUT_PDF}",
        html_file,
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print("Chrome error:", res.stderr)
        sys.exit(1)

    duration = time.time() - start_t
    size_mb = os.path.getsize(OUTPUT_PDF) / (1024 * 1024)
    print(f"PDF successfully compiled in {duration:.2f}s!")
    print(f"File Size: {size_mb:.2f} MiB at {OUTPUT_PDF}")

    # Mirror to Downloads folder
    shutil.copyfile(OUTPUT_PDF, DOWNLOADS_PDF)
    print(f"Mirrored to user Downloads: {DOWNLOADS_PDF}")

    if size_mb > 24.0:
        print(f"WARNING: File size exceeds Cloudflare 25 MiB asset limit! Current: {size_mb:.2f} MiB")
        sys.exit(1)
    else:
        print("File size is strictly within Cloudflare asset limit (< 24 MiB)!")


if __name__ == "__main__":
    main()

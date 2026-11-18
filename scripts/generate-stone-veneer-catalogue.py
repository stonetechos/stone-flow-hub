#!/usr/bin/env python3
"""
scripts/generate-stone-veneer-catalogue.py

Extracts, cleans, re-crops, and compiles the unified luxury
Stone Tech Stone Veneer Architectural Catalogue 2026:
  - public/catalogues/StoneTech_Stone_Veneer_Catalogue_2026.pdf

Features:
  - Combines Part 1 (52 pages) and Part 2 (52 pages).
  - Isolates and cleanly crops 98 stone slab patterns across 4 architectural families:
      * Slate Stone Patterns (51 items: ST-SV-001 to ST-SV-051)
      * Sandstone Patterns (8 items: ST-SV-052 to ST-SV-059)
      * Marble Patterns (36 items: ST-SV-060 to ST-SV-095)
      * Limestone Patterns (3 items: ST-SV-096 to ST-SV-098)
  - Eliminates warehouse frames, metal racks, workers' hands, and fake wooden floor planks.
  - Presents slabs floating gracefully on crisp architectural plates with soft drop-shadows.
  - Deep architectural slate (#0f172a), warm amber/gold (#d97706, #f59e0b) accents.
  - High-res Stone Tech Atelier branding, direct factory contacts (+91 77420 90866), web portal.
  - Includes:
      * Master Luxury Cover
      * About Stone Tech Flexible Stone Veneer & Material Science
      * 4 3D Architectural Section Dividers (Office, Atrium, Reception, Living Room)
      * 98 Individual Product Pages with Model Codes & Standard Dimensions
      * Reference Portfolio & Installation Methodology
      * Comprehensive Technical Engineering Matrix & Back Cover
"""

import os
import shutil
import subprocess
import time
import zlib
from PIL import Image

REPO_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
PDF1_PATH = "/Users/stonetech/.gemini/antigravity/brain/692e0f8b-c231-4893-8608-267244e2257f/.user_uploaded/media_1795014454390_9c545ffd.pdf"
PDF2_PATH = "/Users/stonetech/.gemini/antigravity/brain/692e0f8b-c231-4893-8608-267244e2257f/.user_uploaded/media_1795014454414_af69b3f8.pdf"
ASSET_DIR = os.path.join(REPO_DIR, "public/catalogues/stone-veneer-assets")
OUTPUT_PDF = os.path.join(REPO_DIR, "public/catalogues/StoneTech_Stone_Veneer_Catalogue_2026.pdf")
EMBLEM_PATH = os.path.join(REPO_DIR, "public/branding/stone-tech-emblem-hq.png")
BADGE_PATH = os.path.join(REPO_DIR, "public/branding/stone-tech-manufacturer-badge.png")

# Product metadata catalog: exactly 98 items across 4 sections
PRODUCTS = [
    # --- SECTION 1: SLATE STONE PATTERNS (Part 1, p3 to p52 + Part 2, p1) ---
    {"sec": "Slate Stone Veneer", "name": "S. White", "pat": "Pattern 01", "file": "part1_p03.jpg"},
    {"sec": "Slate Stone Veneer", "name": "S. White", "pat": "Pattern 02", "file": "part1_p04.jpg"},
    {"sec": "Slate Stone Veneer", "name": "S. White", "pat": "Pattern 03", "file": "part1_p05.jpg"},
    {"sec": "Slate Stone Veneer", "name": "S. White", "pat": "Pattern 04", "file": "part1_p06.jpg"},
    {"sec": "Slate Stone Veneer", "name": "Indian Autumn", "pat": "Pattern 01", "file": "part1_p07.jpg"},
    {"sec": "Slate Stone Veneer", "name": "Indian Autumn", "pat": "Pattern 02", "file": "part1_p08.jpg"},
    {"sec": "Slate Stone Veneer", "name": "Indian Autumn", "pat": "Pattern 03", "file": "part1_p09.jpg"},
    {"sec": "Slate Stone Veneer", "name": "Indian Autumn", "pat": "Pattern 04", "file": "part1_p10.jpg"},
    {"sec": "Slate Stone Veneer", "name": "Indian Autumn", "pat": "Pattern 05", "file": "part1_p11.jpg"},
    {"sec": "Slate Stone Veneer", "name": "Indian Autumn", "pat": "Pattern 06", "file": "part1_p12.jpg"},
    {"sec": "Slate Stone Veneer", "name": "Indian Autumn", "pat": "Pattern 07", "file": "part1_p13.jpg"},
    {"sec": "Slate Stone Veneer", "name": "Tan Brown", "pat": "Pattern 01", "file": "part1_p14.jpg"},
    {"sec": "Slate Stone Veneer", "name": "Tan Brown", "pat": "Pattern 02", "file": "part1_p15.jpg"},
    {"sec": "Slate Stone Veneer", "name": "Tan Brown", "pat": "Pattern 03", "file": "part1_p16.jpg"},
    {"sec": "Slate Stone Veneer", "name": "Tan Brown", "pat": "Pattern 04", "file": "part1_p17.jpg"},
    {"sec": "Slate Stone Veneer", "name": "Autumn Rustic", "pat": "Pattern 01", "file": "part1_p18.jpg"},
    {"sec": "Slate Stone Veneer", "name": "Autumn Rustic", "pat": "Pattern 02", "file": "part1_p19.jpg"},
    {"sec": "Slate Stone Veneer", "name": "Autumn Rustic", "pat": "Pattern 03", "file": "part1_p20.jpg"},
    {"sec": "Slate Stone Veneer", "name": "Autumn Rustic", "pat": "Pattern 04", "file": "part1_p21.jpg"},
    {"sec": "Slate Stone Veneer", "name": "Black Gold", "pat": "Select Pattern", "file": "part1_p22.jpg"},
    {"sec": "Slate Stone Veneer", "name": "Black Red", "pat": "Select Pattern", "file": "part1_p23.jpg"},
    {"sec": "Slate Stone Veneer", "name": "Zeera Green", "pat": "Pattern 01", "file": "part1_p24.jpg"},
    {"sec": "Slate Stone Veneer", "name": "Zeera Green", "pat": "Pattern 02", "file": "part1_p25.jpg"},
    {"sec": "Slate Stone Veneer", "name": "Zeera Green", "pat": "Pattern 03", "file": "part1_p26.jpg"},
    {"sec": "Slate Stone Veneer", "name": "Autumn Black", "pat": "Pattern 01", "file": "part1_p27.jpg"},
    {"sec": "Slate Stone Veneer", "name": "Autumn Black", "pat": "Pattern 02", "file": "part1_p28.jpg"},
    {"sec": "Slate Stone Veneer", "name": "Forest Fire", "pat": "Pattern 01", "file": "part1_p29.jpg"},
    {"sec": "Slate Stone Veneer", "name": "Forest Fire", "pat": "Pattern 02", "file": "part1_p30.jpg"},
    {"sec": "Slate Stone Veneer", "name": "Forest Fire", "pat": "Pattern 03", "file": "part1_p31.jpg"},
    {"sec": "Slate Stone Veneer", "name": "Forest Fire", "pat": "Pattern 04", "file": "part1_p32.jpg"},
    {"sec": "Slate Stone Veneer", "name": "Forest Fire", "pat": "Pattern 05", "file": "part1_p33.jpg"},
    {"sec": "Slate Stone Veneer", "name": "Forest Fire", "pat": "Pattern 06", "file": "part1_p34.jpg"},
    {"sec": "Slate Stone Veneer", "name": "Golden Slate", "pat": "Pattern 01", "file": "part1_p35.jpg"},
    {"sec": "Slate Stone Veneer", "name": "Golden Slate", "pat": "Pattern 02", "file": "part1_p36.jpg"},
    {"sec": "Slate Stone Veneer", "name": "Deoli Green", "pat": "Select Pattern", "file": "part1_p37.jpg"},
    {"sec": "Slate Stone Veneer", "name": "Multi Pink", "pat": "Select Pattern", "file": "part1_p38.jpg"},
    {"sec": "Slate Stone Veneer", "name": "Copper Slate", "pat": "Pattern 01", "file": "part1_p39.jpg"},
    {"sec": "Slate Stone Veneer", "name": "Copper Slate", "pat": "Pattern 02", "file": "part1_p40.jpg"},
    {"sec": "Slate Stone Veneer", "name": "Copper Slate", "pat": "Pattern 03", "file": "part1_p41.jpg"},
    {"sec": "Slate Stone Veneer", "name": "Silver Galaxy", "pat": "Select Pattern", "file": "part1_p42.jpg"},
    {"sec": "Slate Stone Veneer", "name": "Ocean Green", "pat": "Select Pattern", "file": "part1_p43.jpg"},
    {"sec": "Slate Stone Veneer", "name": "Silver Grey", "pat": "Pattern 01", "file": "part1_p44.jpg"},
    {"sec": "Slate Stone Veneer", "name": "Silver Grey", "pat": "Pattern 02", "file": "part1_p45.jpg"},
    {"sec": "Slate Stone Veneer", "name": "South Grey", "pat": "Select Pattern", "file": "part1_p46.jpg"},
    {"sec": "Slate Stone Veneer", "name": "Ocean Black", "pat": "Pattern 01", "file": "part1_p47.jpg"},
    {"sec": "Slate Stone Veneer", "name": "Ocean Black", "pat": "Pattern 02", "file": "part1_p48.jpg"},
    {"sec": "Slate Stone Veneer", "name": "Ocean Black", "pat": "Pattern 03", "file": "part1_p49.jpg"},
    {"sec": "Slate Stone Veneer", "name": "California Gold", "pat": "Select Pattern", "file": "part1_p50.jpg"},
    {"sec": "Slate Stone Veneer", "name": "Silver Shine Gold", "pat": "Select Pattern", "file": "part1_p51.jpg"},
    {"sec": "Slate Stone Veneer", "name": "Silver Shine", "pat": "Pattern 01", "file": "part1_p52.jpg"},
    {"sec": "Slate Stone Veneer", "name": "Silver Shine", "pat": "Pattern 02", "file": "part2_p01.jpg"},

    # --- SECTION 2: SANDSTONE PATTERNS (Part 2, p3 to p10) ---
    {"sec": "Sandstone Veneer", "name": "Mint White", "pat": "Natural Grain", "file": "part2_p03.jpg"},
    {"sec": "Sandstone Veneer", "name": "Mint Beige", "pat": "Natural Grain", "file": "part2_p04.jpg"},
    {"sec": "Sandstone Veneer", "name": "Terra Red", "pat": "Pattern 01", "file": "part2_p05.jpg"},
    {"sec": "Sandstone Veneer", "name": "Terra Red", "pat": "Pattern 02", "file": "part2_p06.jpg"},
    {"sec": "Sandstone Veneer", "name": "Teakwood Sandstone", "pat": "Pattern 01", "file": "part2_p07.jpg"},
    {"sec": "Sandstone Veneer", "name": "Mint Sunrise", "pat": "Natural Grain", "file": "part2_p08.jpg"},
    {"sec": "Sandstone Veneer", "name": "Rainbow Sandstone", "pat": "Pattern 01", "file": "part2_p09.jpg"},
    {"sec": "Sandstone Veneer", "name": "Rainbow Sandstone", "pat": "Pattern 02", "file": "part2_p10.jpg"},

    # --- SECTION 3: MARBLE PATTERNS (Part 2, p12 to p47) ---
    {"sec": "Marble Stone Veneer", "name": "Panda White", "pat": "Pattern 01", "file": "part2_p12.jpg"},
    {"sec": "Marble Stone Veneer", "name": "Panda White", "pat": "Pattern 02", "file": "part2_p13.jpg"},
    {"sec": "Marble Stone Veneer", "name": "Panda White", "pat": "Pattern 03", "file": "part2_p14.jpg"},
    {"sec": "Marble Stone Veneer", "name": "Smokey Grey Marble", "pat": "Select Vein", "file": "part2_p15.jpg"},
    {"sec": "Marble Stone Veneer", "name": "Himalaya White Marble", "pat": "Select Vein", "file": "part2_p16.jpg"},
    {"sec": "Marble Stone Veneer", "name": "Marina Green Marble", "pat": "Select Vein", "file": "part2_p17.jpg"},
    {"sec": "Marble Stone Veneer", "name": "Antiq White Marble", "pat": "Select Vein", "file": "part2_p18.jpg"},
    {"sec": "Marble Stone Veneer", "name": "Black Shimmer", "pat": "Pattern 01", "file": "part2_p19.jpg"},
    {"sec": "Marble Stone Veneer", "name": "Black Shimmer", "pat": "Pattern 02", "file": "part2_p20.jpg"},
    {"sec": "Marble Stone Veneer", "name": "Silvia Beige Marble", "pat": "Select Vein", "file": "part2_p21.jpg"},
    {"sec": "Marble Stone Veneer", "name": "Monsoon Black Marble", "pat": "Select Vein", "file": "part2_p22.jpg"},
    {"sec": "Marble Stone Veneer", "name": "Rainforest Green Marble", "pat": "Tree Vein", "file": "part2_p23.jpg"},
    {"sec": "Marble Stone Veneer", "name": "Rainforest Gold Marble", "pat": "Tree Vein", "file": "part2_p24.jpg"},
    {"sec": "Marble Stone Veneer", "name": "Rainforest Brown Marble", "pat": "Tree Vein", "file": "part2_p25.jpg"},
    {"sec": "Marble Stone Veneer", "name": "Fire Red Marble", "pat": "Select Vein", "file": "part2_p26.jpg"},
    {"sec": "Marble Stone Veneer", "name": "Vintage Shine Marble", "pat": "Select Vein", "file": "part2_p27.jpg"},
    {"sec": "Marble Stone Veneer", "name": "Vintage Shine Dark", "pat": "Select Vein", "file": "part2_p28.jpg"},
    {"sec": "Marble Stone Veneer", "name": "Eroding Sea Marble", "pat": "Select Vein", "file": "part2_p29.jpg"},
    {"sec": "Marble Stone Veneer", "name": "Arctic Storm", "pat": "Pattern 01", "file": "part2_p30.jpg"},
    {"sec": "Marble Stone Veneer", "name": "Arctic Storm", "pat": "Pattern 02", "file": "part2_p31.jpg"},
    {"sec": "Marble Stone Veneer", "name": "Arctic Storm", "pat": "Pattern 03", "file": "part2_p32.jpg"},
    {"sec": "Marble Stone Veneer", "name": "Fantasy White Marble", "pat": "Select Vein", "file": "part2_p33.jpg"},
    {"sec": "Marble Stone Veneer", "name": "Atlantic White Marble", "pat": "Select Vein", "file": "part2_p34.jpg"},
    {"sec": "Marble Stone Veneer", "name": "Cloudy White", "pat": "Pattern 01", "file": "part2_p35.jpg"},
    {"sec": "Marble Stone Veneer", "name": "Cloudy White", "pat": "Pattern 02", "file": "part2_p36.jpg"},
    {"sec": "Marble Stone Veneer", "name": "Sea White", "pat": "Pattern 01", "file": "part2_p37.jpg"},
    {"sec": "Marble Stone Veneer", "name": "Sea White", "pat": "Pattern 02", "file": "part2_p38.jpg"},
    {"sec": "Marble Stone Veneer", "name": "Sea Black Marble", "pat": "Select Vein", "file": "part2_p39.jpg"},
    {"sec": "Marble Stone Veneer", "name": "Petra Black Marble", "pat": "Select Vein", "file": "part2_p40.jpg"},
    {"sec": "Marble Stone Veneer", "name": "Snow Dunes", "pat": "Pattern 01", "file": "part2_p41.jpg"},
    {"sec": "Marble Stone Veneer", "name": "Snow Dunes", "pat": "Pattern 02", "file": "part2_p42.jpg"},
    {"sec": "Marble Stone Veneer", "name": "Snow Dunes", "pat": "Pattern 03", "file": "part2_p43.jpg"},
    {"sec": "Marble Stone Veneer", "name": "Snow Dunes Dark", "pat": "Select Vein", "file": "part2_p44.jpg"},
    {"sec": "Marble Stone Veneer", "name": "Thainos Green Marble", "pat": "Select Vein", "file": "part2_p45.jpg"},
    {"sec": "Marble Stone Veneer", "name": "Sparkling Yellow", "pat": "Crystal Vein", "file": "part2_p46.jpg"},
    {"sec": "Marble Stone Veneer", "name": "Sparkling White", "pat": "Crystal Vein", "file": "part2_p47.jpg"},

    # --- SECTION 4: LIMESTONE PATTERNS (Part 2, p49 to p51) ---
    {"sec": "Limestone Veneer", "name": "Grey Limestone", "pat": "Monolithic Texture", "file": "part2_p49.jpg"},
    {"sec": "Limestone Veneer", "name": "Pink Limestone", "pat": "Monolithic Texture", "file": "part2_p50.jpg"},
    {"sec": "Limestone Veneer", "name": "Green Limestone", "pat": "Monolithic Texture", "file": "part2_p51.jpg"},
]

def ensure_assets():
    os.makedirs(ASSET_DIR, exist_ok=True)
    raw_dir = "/tmp/veneer_extracted"
    if not os.path.exists(raw_dir) or len(os.listdir(raw_dir)) < 100:
        raise RuntimeError(f"Raw extracted images missing in {raw_dir}. Please run extraction first.")

    print(f"Processing and cropping 98 slabs into {ASSET_DIR}...")
    for idx, item in enumerate(PRODUCTS):
        src_path = os.path.join(raw_dir, item["file"])
        out_path = os.path.join(ASSET_DIR, f"slab_{idx+1:03d}_{item['file']}")
        
        im = Image.open(src_path)
        w, h = im.size
        
        # 1. Detect max Y of text in top 320px
        text_y_max = 0
        for y in range(0, 320, 5):
            dark = [x for x in range(int(w*0.1), int(w*0.9), 10) if all(c < 75 for c in im.getpixel((x, y)))]
            if len(dark) >= 3:
                text_y_max = max(text_y_max, y)
                
        # 2. Detect wood floor start at bottom
        floor_y_min = 920
        for y in range(860, 960, 5):
            row = [im.getpixel((x, y)) for x in range(int(w*0.25), int(w*0.75), 15)]
            avg = (sum(p[0] for p in row)//len(row), sum(p[1] for p in row)//len(row), sum(p[2] for p in row)//len(row))
            if avg[0] > avg[1] + 25 and avg[1] > avg[2] + 12 and avg[0] > 95:
                floor_y_min = min(floor_y_min, y)
                break
                
        # 3. Detect left and right edges of slab in middle band
        left_edges = []
        right_edges = []
        for y in range(450, 650, 20):
            row = [im.getpixel((x, y)) for x in range(w)]
            non_white = [x for x, p in enumerate(row) if (p[0] < 235 or p[1] < 235 or p[2] < 235)]
            if len(non_white) > 200:
                left_edges.append(min(non_white))
                right_edges.append(max(non_white))
                
        if not left_edges:
            min_x, max_x = int(w * 0.12), int(w * 0.88)
        else:
            left_edges.sort()
            right_edges.sort()
            min_x = left_edges[len(left_edges) // 4]
            max_x = right_edges[len(right_edges) * 3 // 4]
            
        top_y = max(text_y_max + 20, 315)
        mid_x = (min_x + max_x) // 2
        for y in range(top_y, 420):
            p = im.getpixel((mid_x, y))
            if p[0] < 235 or p[1] < 235 or p[2] < 235:
                top_y = max(top_y, y)
                break
                
        bot_y = min(floor_y_min - 10, 915)
        
        crop_x1 = max(0, min_x + 6)
        crop_x2 = min(w, max_x - 6)
        crop_y1 = max(0, top_y + 4)
        crop_y2 = min(h, bot_y)
        
        cropped = im.crop((crop_x1, crop_y1, crop_x2, crop_y2))
        cropped.save(out_path, "JPEG", quality=92, optimize=True)
        item["cropped_asset"] = out_path

    # Crop and save section divider renders
    dividers = [
        ("render_slate.jpg", "part1_p02.jpg"),
        ("render_sandstone.jpg", "part2_p02.jpg"),
        ("render_marble.jpg", "part2_p11.jpg"),
        ("render_limestone.jpg", "part2_p48.jpg"),
        ("render_portfolio.jpg", "part2_p52.jpg"),
    ]
    for out_name, src_name in dividers:
        im = Image.open(os.path.join(raw_dir, src_name))
        cropped = im.crop((0, 100, im.width, 970))
        cropped.save(os.path.join(ASSET_DIR, out_name), "JPEG", quality=92, optimize=True)
        print(f"Saved divider render: {out_name}")

def build_html():
    total_pages = 106
    curr_page = 1

    html_parts = []
    html_parts.append(f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
@page {{
  size: 297mm 210mm;
  margin: 0;
}}
* {{
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}}
body {{
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: #ffffff;
  color: #0f172a;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}}
.page {{
  width: 297mm;
  height: 210mm;
  max-height: 210mm;
  page-break-after: always;
  page-break-inside: avoid;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
}}

/* ================= COVER PAGE ================= */
.cover-page {{
  background: #0f172a;
  color: #ffffff;
  padding: 10mm 14mm;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}}
.cover-border {{
  border: 2px solid #d97706;
  height: 100%;
  position: relative;
  padding: 8mm 14mm;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  text-align: center;
}}
.cover-inner-border {{
  position: absolute;
  inset: 2.5mm;
  border: 1px solid #f59e0b;
  pointer-events: none;
}}
.cover-header {{
  display: flex;
  flex-direction: column;
  align-items: center;
}}
.cover-medallion {{
  width: 30mm;
  height: 30mm;
  background: #ffffff;
  border: 2.5px solid #d97706;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2.5mm;
  box-shadow: 0 4px 15px rgba(0,0,0,0.4);
}}
.cover-medallion img {{
  width: 100%;
  height: 100%;
  object-fit: contain;
}}
.cover-brand {{
  color: #f59e0b;
  font-size: 19pt;
  font-weight: 800;
  margin-top: 3.5mm;
  letter-spacing: 2.5px;
}}
.cover-atelier {{
  color: #94a3b8;
  font-size: 8.5pt;
  font-weight: 600;
  letter-spacing: 1.5px;
  margin-top: 1mm;
}}
.cover-line {{
  width: 90mm;
  height: 2px;
  background: linear-gradient(90deg, transparent, #d97706, #fbbf24, #d97706, transparent);
  margin: 3mm auto 0 auto;
}}
.cover-title-group {{
  margin: 2mm 0;
}}
.cover-title1 {{
  font-size: 26pt;
  font-weight: 900;
  color: #ffffff;
  letter-spacing: 0.5px;
  line-height: 1.15;
  text-transform: uppercase;
}}
.cover-title2 {{
  font-size: 20pt;
  font-weight: 800;
  color: #fbbf24;
  letter-spacing: 1.5px;
  margin-top: 1.5mm;
  text-transform: uppercase;
}}
.cover-edition {{
  display: inline-block;
  background: rgba(217, 119, 6, 0.2);
  border: 1px solid #f59e0b;
  color: #fef3c7;
  padding: 1.2mm 6mm;
  border-radius: 3mm;
  font-size: 8.5pt;
  font-weight: 700;
  letter-spacing: 2px;
  margin-top: 3.5mm;
}}
.cover-pills {{
  display: flex;
  justify-content: center;
  gap: 4mm;
  margin-top: 4mm;
}}
.cover-pill {{
  background: #1e293b;
  border: 1px solid #334155;
  padding: 1.8mm 4.5mm;
  border-radius: 2mm;
  font-size: 7.5pt;
  font-weight: 600;
  color: #cbd5e1;
}}
.cover-pill strong {{
  color: #38bdf8;
}}
.cover-footer {{
  border-top: 1px solid rgba(245, 158, 11, 0.35);
  padding-top: 3mm;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 7.2pt;
  color: #94a3b8;
}}
.cover-footer-left {{
  text-align: left;
  line-height: 1.4;
}}
.cover-footer-left strong {{
  color: #ffffff;
}}
.cover-footer-center {{
  text-align: center;
  font-weight: 700;
  color: #fbbf24;
  letter-spacing: 1px;
}}
.cover-footer-right {{
  text-align: right;
  line-height: 1.4;
}}

/* ================= ABOUT / MATERIAL SCIENCE PAGE ================= */
.about-page {{
  padding: 10mm 14mm 8mm 14mm;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}}
.about-grid {{
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7mm;
  margin-top: 4mm;
}}
.about-card {{
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 2.5mm;
  padding: 5mm;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
}}
.about-card-title {{
  font-size: 11pt;
  font-weight: 800;
  color: #0f172a;
  border-left: 3.5px solid #d97706;
  padding-left: 3mm;
  margin-bottom: 3mm;
}}
.about-text {{
  font-size: 8pt;
  line-height: 1.55;
  color: #475569;
  margin-bottom: 3mm;
}}
.about-feat-list {{
  list-style: none;
}}
.about-feat-item {{
  font-size: 7.6pt;
  line-height: 1.45;
  color: #334155;
  margin-bottom: 2mm;
  display: flex;
  align-items: flex-start;
  gap: 2mm;
}}
.about-feat-bullet {{
  color: #d97706;
  font-weight: 900;
  font-size: 8pt;
}}

/* ================= SECTION DIVIDER PAGE ================= */
.divider-page {{
  background: #0f172a;
  color: #ffffff;
  padding: 10mm 14mm;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}}
.divider-render-frame {{
  width: 100%;
  height: 130mm;
  background: #1e293b;
  border: 1.5px solid #d97706;
  border-radius: 2.5mm;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}}
.divider-render-img {{
  width: 100%;
  height: 100%;
  object-fit: cover;
}}
.divider-banner {{
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(245, 158, 11, 0.4);
  border-radius: 2mm;
  padding: 4mm 6mm;
  margin-top: 3.5mm;
}}
.divider-tag {{
  color: #fbbf24;
  font-size: 8.5pt;
  font-weight: 800;
  letter-spacing: 2px;
}}
.divider-title {{
  color: #ffffff;
  font-size: 18pt;
  font-weight: 900;
  letter-spacing: 0.5px;
}}
.divider-desc {{
  color: #94a3b8;
  font-size: 8pt;
  margin-top: 1mm;
}}
.divider-meta {{
  text-align: right;
  font-size: 7.5pt;
  color: #cbd5e1;
  line-height: 1.4;
}}
.divider-meta strong {{
  color: #fbbf24;
}}

/* ================= PRODUCT DISPLAY PAGE ================= */
.product-page {{
  padding: 8mm 14mm 7mm 14mm;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}}
.prod-header {{
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1.5px solid #e2e8f0;
  padding-bottom: 2mm;
}}
.prod-header-left {{
  display: flex;
  align-items: center;
  gap: 3mm;
}}
.prod-emblem {{
  width: 7.5mm;
  height: 7.5mm;
  object-fit: contain;
}}
.prod-brand-lockup {{
  display: flex;
  align-items: center;
  gap: 2.5mm;
}}
.prod-brand-name {{
  font-size: 8.5pt;
  font-weight: 800;
  letter-spacing: 1.2px;
  color: #0f172a;
}}
.prod-division-tag {{
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  color: #0369a1;
  font-size: 6.5pt;
  font-weight: 700;
  padding: 0.8mm 2.2mm;
  border-radius: 1mm;
  letter-spacing: 0.5px;
}}
.prod-header-right {{
  font-size: 7.2pt;
  color: #64748b;
  letter-spacing: 0.3px;
}}
.prod-header-right strong {{
  color: #0f172a;
}}
.prod-slab-stage {{
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3mm 0;
}}
.prod-slab-frame {{
  width: 262mm;
  height: 126mm;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 2mm;
  box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.08);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}}
.prod-slab-img {{
  width: 100%;
  height: 100%;
  object-fit: fill;
  display: block;
}}
.prod-info-panel {{
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 2mm;
  padding: 3mm 5mm;
}}
.prod-info-left {{
  display: flex;
  flex-direction: column;
  gap: 0.8mm;
}}
.prod-family-badge {{
  display: inline-block;
  background: #0f172a;
  color: #f59e0b;
  font-size: 6.5pt;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: 0.8mm 2.5mm;
  border-radius: 1mm;
  align-self: flex-start;
}}
.prod-name-title {{
  font-size: 13.5pt;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.2px;
}}
.prod-code-line {{
  font-size: 7.8pt;
  font-weight: 700;
  color: #d97706;
  letter-spacing: 1px;
}}
.prod-info-right {{
  display: grid;
  grid-template-columns: auto auto;
  gap: 1.5mm 7mm;
  font-size: 7.2pt;
  color: #475569;
}}
.prod-spec-item strong {{
  color: #0f172a;
  font-weight: 700;
}}
.prod-footer {{
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid #e2e8f0;
  padding-top: 1.8mm;
  margin-top: 1.8mm;
  font-size: 6.5pt;
  color: #94a3b8;
  letter-spacing: 0.3px;
}}
.prod-footer-center {{
  color: #64748b;
  font-weight: 600;
}}

/* ================= SPECIFICATION MATRIX & BACK COVER ================= */
.matrix-page {{
  padding: 10mm 14mm 8mm 14mm;
  background: #0f172a;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}}
.matrix-header {{
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1.5px solid #d97706;
  padding-bottom: 2.5mm;
}}
.matrix-table {{
  width: 100%;
  border-collapse: collapse;
  margin-top: 3.5mm;
  font-size: 7.5pt;
}}
.matrix-table th {{
  background: #1e293b;
  color: #fbbf24;
  text-align: left;
  padding: 2.2mm 3.5mm;
  border: 1px solid #334155;
  font-weight: 700;
  letter-spacing: 0.5px;
}}
.matrix-table td {{
  padding: 2.2mm 3.5mm;
  border: 1px solid #334155;
  color: #cbd5e1;
}}
.matrix-table tr:nth-child(even) td {{
  background: rgba(30, 41, 59, 0.4);
}}
.matrix-table td strong {{
  color: #ffffff;
}}
.back-contact-card {{
  background: #1e293b;
  border: 1.5px solid #d97706;
  border-radius: 2.5mm;
  padding: 4mm 6mm;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 3mm;
}}
.back-contact-left {{
  display: flex;
  align-items: center;
  gap: 5mm;
}}
.back-badge-img {{
  width: 22mm;
  height: 26mm;
  object-fit: contain;
}}
.back-contact-details {{
  line-height: 1.45;
  font-size: 7.8pt;
  color: #cbd5e1;
}}
.back-contact-details h3 {{
  color: #fbbf24;
  font-size: 11pt;
  font-weight: 800;
  letter-spacing: 1px;
  margin-bottom: 1mm;
}}
.back-contact-right {{
  text-align: right;
  line-height: 1.45;
  font-size: 7.8pt;
  color: #94a3b8;
}}
.back-contact-right strong {{
  color: #38bdf8;
}}
</style>
</head>
<body>
""")

    # 1. FRONT COVER (Page 1)
    html_parts.append(f"""
<div class="page cover-page">
  <div class="cover-border">
    <div class="cover-inner-border"></div>
    <div class="cover-header">
      <div class="cover-medallion">
        <img src="file://{EMBLEM_PATH}">
      </div>
      <div class="cover-brand">STONE TECH ATELIER</div>
      <div class="cover-atelier">ARCHITECTURAL NATURAL STONE & CLADDING DIVISION · ESTD 2018</div>
      <div class="cover-line"></div>
    </div>

    <div class="cover-title-group">
      <div class="cover-title1">ULTRA-THIN FLEXIBLE NATURAL STONE VENEER</div>
      <div class="cover-title2">ARCHITECTURAL MASTER COLLECTION</div>
      <div class="cover-edition">EDITION 2026 – 2027 · COMPREHENSIVE ARCHITECTURAL CATALOGUE</div>
      <div class="cover-pills">
        <div class="cover-pill">SURFACE: <strong>100% Genuine Natural Stone</strong></div>
        <div class="cover-pill">BACKING: <strong>Fiberglass & Polymer Resin</strong></div>
        <div class="cover-pill">WEIGHT: <strong>~1.50 kg / m² (Ultra-Light)</strong></div>
        <div class="cover-pill">SIZES: <strong>1220×2440 · 1220×2800 · 1220×3050 mm</strong></div>
      </div>
    </div>

    <div class="cover-footer">
      <div class="cover-footer-left">
        <strong>HEADQUARTERS & ATELIER:</strong> Gota, Ahmedabad, Gujarat, India<br>
        <strong>DIRECT EXPORT DISPATCH:</strong> Mundra Port & JNPT Port, India
      </div>
      <div class="cover-footer-center">
        MANUFACTURER DIRECT SPECIFICATION · VERIFIED CATALOGUE<br>
        WHATSAPP CRM: +91 77420 90866
      </div>
      <div class="cover-footer-right">
        <strong>WEB:</strong> www.stonetech.in<br>
        <strong>EMAIL:</strong> info@stonetech.in
      </div>
    </div>
  </div>
</div>
""")
    curr_page += 1

    # 2. ABOUT & MATERIAL SCIENCE (Page 2)
    html_parts.append(f"""
<div class="page about-page">
  <div class="prod-header">
    <div class="prod-header-left">
      <img src="file://{EMBLEM_PATH}" class="prod-emblem">
      <div class="prod-brand-lockup">
        <div class="prod-brand-name">STONE TECH ATELIER</div>
        <div class="prod-division-tag">MATERIAL SCIENCE & ARCHITECTURAL ENGINEERING</div>
      </div>
    </div>
    <div class="prod-header-right">ARCHITECTURAL SPECIFICATION GUIDE · <strong>PAGE 02 OF {total_pages}</strong></div>
  </div>

  <div class="about-grid">
    <div class="about-card">
      <div class="about-card-title">WHAT IS ULTRA-THIN STONE VENEER?</div>
      <div class="about-text">
        Stone Tech Flexible Stone Veneer is a revolutionary architectural material composed of a genuine 100% natural split-stone top face (slate, quartzite, sandstone, or marble) permanently bonded to a high-tensile fiberglass mesh impregnated with thermosetting polyester resin.
      </div>
      <div class="about-text">
        Through high-precision German peel-layer technology, micro-thin layers measuring between 1.5 mm to 2.0 mm are harvested directly from genuine geological blocks, preserving the organic clefts, crystalline veins, and tactile authenticity of traditional stone while reducing dead load by over 97%.
      </div>
      <ul class="about-feat-list">
        <li class="about-feat-item"><span class="about-feat-bullet">◆</span> <strong>Real Natural Stone:</strong> Zero artificial printing or cast recreations. Every sheet is unique geological art.</li>
        <li class="about-feat-item"><span class="about-feat-bullet">◆</span> <strong>Aerospace Substrate:</strong> High-performance woven fiberglass fabric ensures incredible tensile strength and dimensional stability.</li>
        <li class="about-feat-item"><span class="about-feat-bullet">◆</span> <strong>Extreme Thermal Range:</strong> Tested and certified from -40°C to +90°C without warping or delamination.</li>
      </ul>
    </div>

    <div class="about-card">
      <div class="about-card-title">ARCHITECTURAL ADVANTAGES & CAPABILITIES</div>
      <ul class="about-feat-list">
        <li class="about-feat-item"><span class="about-feat-bullet">◆</span> <strong>Ultra-Lightweight (~1.5 kg/m²):</strong> Eliminates heavy structural masonry framing, crane hoisting, and floor load reinforcement. Ideal for high-rise towers and elevator cabins.</li>
        <li class="about-feat-item"><span class="about-feat-bullet">◆</span> <strong>Cold Bend Flexibility:</strong> Conforms smoothly to curved architectural walls, round pillars, convex columns, and arches with bend radii down to 20 cm.</li>
        <li class="about-feat-item"><span class="about-feat-bullet">◆</span> <strong>Continuous Floor-to-Ceiling Slabs:</strong> Standard formats up to 1220 × 3050 mm (4×10 ft) allow seamless vertical panels without visible horizontal grout lines.</li>
        <li class="about-feat-item"><span class="about-feat-bullet">◆</span> <strong>Universal Substrate Bonding:</strong> Direct adhesion onto plywood, MDF, drywall, concrete, cement board, and metal frames with polyurethane (PU) or MS polymer adhesives.</li>
        <li class="about-feat-item"><span class="about-feat-bullet">◆</span> <strong>Water & Weather Resilient:</strong> Suitable for wet interior spaces, executive shower enclosures, exterior ventilated facades, and retail portals.</li>
      </ul>
    </div>
  </div>

  <div class="prod-footer">
    <div>STONE TECH ATELIER · ARCHITECTURAL STONE FABRICATION</div>
    <div class="prod-footer-center">EXPERIENCE CENTER: GOTA, AHMEDABAD · SEAPORT DISPATCH: MUNDRA & JNPT</div>
    <div>WWW.STONETECH.IN · +91 77420 90866</div>
  </div>
</div>
""")
    curr_page += 1

    # SECTION 1: SLATE STONE PATTERNS
    # Divider (Page 3)
    render_slate = os.path.join(ASSET_DIR, "render_slate.jpg")
    html_parts.append(f"""
<div class="page divider-page">
  <div class="divider-render-frame">
    <img src="file://{render_slate}" class="divider-render-img">
  </div>
  <div class="divider-banner">
    <div>
      <div class="divider-tag">COLLECTION 01 · 51 ARCHITECTURAL PATTERNS</div>
      <div class="divider-title">SLATE STONE VENEER PATTERNS</div>
      <div class="divider-desc">Natural cleft textures, organic mica sheen, and earthy mineral luster across 51 distinct patterns.</div>
    </div>
    <div class="divider-meta">
      FORMATS: <strong>1220×2440 · 1220×2800 · 1220×3050 mm</strong><br>
      THICKNESS: <strong>1.5 – 2.0 mm (Ultra-Thin Flexible)</strong><br>
      CODE SERIES: <strong>ST-SV-001 TO ST-SV-051</strong>
    </div>
  </div>
</div>
""")
    curr_page += 1

    # Section 1 Products (ST-SV-001 to ST-SV-051)
    slate_prods = PRODUCTS[0:51]
    for idx, p in enumerate(slate_prods):
        code_str = f"ST-SV-{idx+1:03d}"
        asset_file = os.path.join(ASSET_DIR, f"slab_{idx+1:03d}_{p['file']}")
        html_parts.append(f"""
<div class="page product-page">
  <div class="prod-header">
    <div class="prod-header-left">
      <img src="file://{EMBLEM_PATH}" class="prod-emblem">
      <div class="prod-brand-lockup">
        <div class="prod-brand-name">STONE TECH ATELIER</div>
        <div class="prod-division-tag">ULTRA-THIN NATURAL STONE VENEER</div>
      </div>
    </div>
    <div class="prod-header-right">FACTORY DIRECT: <strong>+91 77420 90866</strong> · WWW.STONETECH.IN</div>
  </div>

  <div class="prod-slab-stage">
    <div class="prod-slab-frame">
      <img src="file://{asset_file}" class="prod-slab-img">
    </div>
  </div>

  <div class="prod-info-panel">
    <div class="prod-info-left">
      <div class="prod-family-badge">Slate Stone Collection</div>
      <div class="prod-name-title">{p['name']} · {p['pat']}</div>
      <div class="prod-code-line">ITEM CODE: {code_str}</div>
    </div>
    <div class="prod-info-right">
      <div class="prod-spec-item">Standard Dimensions: <strong>1220×2440 · 1220×2800 · 1220×3050 mm</strong></div>
      <div class="prod-spec-item">Sheet Weight: <strong>~1.50 kg / m² (~4.5 kg / sheet)</strong></div>
      <div class="prod-spec-item">Total Thickness: <strong>1.5 – 2.0 mm (Flexible)</strong></div>
      <div class="prod-spec-item">Primary Uses: <strong>Curved Walls, Facades, Furniture, Doors</strong></div>
      <div class="prod-spec-item">Substrate Backing: <strong>Fiberglass & Thermosetting Resin</strong></div>
      <div class="prod-spec-item">Adhesion Method: <strong>PU / MS Polymer Direct Bond</strong></div>
    </div>
  </div>

  <div class="prod-footer">
    <div>STONE TECH ATELIER · ARCHITECTURAL STONE FABRICATION</div>
    <div class="prod-footer-center">EXPERIENCE CENTER: GOTA, AHMEDABAD · SEAPORT DISPATCH: MUNDRA & JNPT</div>
    <div>PAGE {curr_page:02d} OF {total_pages}</div>
  </div>
</div>
""")
        curr_page += 1

    # SECTION 2: SANDSTONE PATTERNS
    # Divider (Page 55)
    render_sandstone = os.path.join(ASSET_DIR, "render_sandstone.jpg")
    html_parts.append(f"""
<div class="page divider-page">
  <div class="divider-render-frame">
    <img src="file://{render_sandstone}" class="divider-render-img">
  </div>
  <div class="divider-banner">
    <div>
      <div class="divider-tag">COLLECTION 02 · 8 ARCHITECTURAL PATTERNS</div>
      <div class="divider-title">SANDSTONE VENEER PATTERNS</div>
      <div class="divider-desc">Warm granular striations, desert warmth, and tactile sedimentary grain across 8 master patterns.</div>
    </div>
    <div class="divider-meta">
      FORMATS: <strong>1220×2440 · 1220×2800 · 1220×3050 mm</strong><br>
      THICKNESS: <strong>1.5 – 2.0 mm (Ultra-Thin Flexible)</strong><br>
      CODE SERIES: <strong>ST-SV-052 TO ST-SV-059</strong>
    </div>
  </div>
</div>
""")
    curr_page += 1

    # Section 2 Products (ST-SV-052 to ST-SV-059)
    sandstone_prods = PRODUCTS[51:59]
    for idx, p in enumerate(sandstone_prods):
        global_idx = 51 + idx
        code_str = f"ST-SV-{global_idx+1:03d}"
        asset_file = os.path.join(ASSET_DIR, f"slab_{global_idx+1:03d}_{p['file']}")
        html_parts.append(f"""
<div class="page product-page">
  <div class="prod-header">
    <div class="prod-header-left">
      <img src="file://{EMBLEM_PATH}" class="prod-emblem">
      <div class="prod-brand-lockup">
        <div class="prod-brand-name">STONE TECH ATELIER</div>
        <div class="prod-division-tag">ULTRA-THIN NATURAL STONE VENEER</div>
      </div>
    </div>
    <div class="prod-header-right">FACTORY DIRECT: <strong>+91 77420 90866</strong> · WWW.STONETECH.IN</div>
  </div>

  <div class="prod-slab-stage">
    <div class="prod-slab-frame">
      <img src="file://{asset_file}" class="prod-slab-img">
    </div>
  </div>

  <div class="prod-info-panel">
    <div class="prod-info-left">
      <div class="prod-family-badge">Sandstone Collection</div>
      <div class="prod-name-title">{p['name']} · {p['pat']}</div>
      <div class="prod-code-line">ITEM CODE: {code_str}</div>
    </div>
    <div class="prod-info-right">
      <div class="prod-spec-item">Standard Dimensions: <strong>1220×2440 · 1220×2800 · 1220×3050 mm</strong></div>
      <div class="prod-spec-item">Sheet Weight: <strong>~1.50 kg / m² (~4.5 kg / sheet)</strong></div>
      <div class="prod-spec-item">Total Thickness: <strong>1.5 – 2.0 mm (Flexible)</strong></div>
      <div class="prod-spec-item">Primary Uses: <strong>Curved Walls, Facades, Furniture, Doors</strong></div>
      <div class="prod-spec-item">Substrate Backing: <strong>Fiberglass & Thermosetting Resin</strong></div>
      <div class="prod-spec-item">Adhesion Method: <strong>PU / MS Polymer Direct Bond</strong></div>
    </div>
  </div>

  <div class="prod-footer">
    <div>STONE TECH ATELIER · ARCHITECTURAL STONE FABRICATION</div>
    <div class="prod-footer-center">EXPERIENCE CENTER: GOTA, AHMEDABAD · SEAPORT DISPATCH: MUNDRA & JNPT</div>
    <div>PAGE {curr_page:02d} OF {total_pages}</div>
  </div>
</div>
""")
        curr_page += 1

    # SECTION 3: MARBLE PATTERNS
    # Divider (Page 64)
    render_marble = os.path.join(ASSET_DIR, "render_marble.jpg")
    html_parts.append(f"""
<div class="page divider-page">
  <div class="divider-render-frame">
    <img src="file://{render_marble}" class="divider-render-img">
  </div>
  <div class="divider-banner">
    <div>
      <div class="divider-tag">COLLECTION 03 · 36 ARCHITECTURAL PATTERNS</div>
      <div class="divider-title">MARBLE STONE VENEER PATTERNS</div>
      <div class="divider-desc">Dramatic organic veining, crystalline depth, and bookmatch elegance across 36 bespoke patterns.</div>
    </div>
    <div class="divider-meta">
      FORMATS: <strong>1220×2440 · 1220×2800 · 1220×3050 mm</strong><br>
      THICKNESS: <strong>1.5 – 2.0 mm (Ultra-Thin Flexible)</strong><br>
      CODE SERIES: <strong>ST-SV-060 TO ST-SV-095</strong>
    </div>
  </div>
</div>
""")
    curr_page += 1

    # Section 3 Products (ST-SV-060 to ST-SV-095)
    marble_prods = PRODUCTS[59:95]
    for idx, p in enumerate(marble_prods):
        global_idx = 59 + idx
        code_str = f"ST-SV-{global_idx+1:03d}"
        asset_file = os.path.join(ASSET_DIR, f"slab_{global_idx+1:03d}_{p['file']}")
        html_parts.append(f"""
<div class="page product-page">
  <div class="prod-header">
    <div class="prod-header-left">
      <img src="file://{EMBLEM_PATH}" class="prod-emblem">
      <div class="prod-brand-lockup">
        <div class="prod-brand-name">STONE TECH ATELIER</div>
        <div class="prod-division-tag">ULTRA-THIN NATURAL STONE VENEER</div>
      </div>
    </div>
    <div class="prod-header-right">FACTORY DIRECT: <strong>+91 77420 90866</strong> · WWW.STONETECH.IN</div>
  </div>

  <div class="prod-slab-stage">
    <div class="prod-slab-frame">
      <img src="file://{asset_file}" class="prod-slab-img">
    </div>
  </div>

  <div class="prod-info-panel">
    <div class="prod-info-left">
      <div class="prod-family-badge">Marble Stone Collection</div>
      <div class="prod-name-title">{p['name']} · {p['pat']}</div>
      <div class="prod-code-line">ITEM CODE: {code_str}</div>
    </div>
    <div class="prod-info-right">
      <div class="prod-spec-item">Standard Dimensions: <strong>1220×2440 · 1220×2800 · 1220×3050 mm</strong></div>
      <div class="prod-spec-item">Sheet Weight: <strong>~1.50 kg / m² (~4.5 kg / sheet)</strong></div>
      <div class="prod-spec-item">Total Thickness: <strong>1.5 – 2.0 mm (Flexible)</strong></div>
      <div class="prod-spec-item">Primary Uses: <strong>Curved Walls, Facades, Furniture, Doors</strong></div>
      <div class="prod-spec-item">Substrate Backing: <strong>Fiberglass & Thermosetting Resin</strong></div>
      <div class="prod-spec-item">Adhesion Method: <strong>PU / MS Polymer Direct Bond</strong></div>
    </div>
  </div>

  <div class="prod-footer">
    <div>STONE TECH ATELIER · ARCHITECTURAL STONE FABRICATION</div>
    <div class="prod-footer-center">EXPERIENCE CENTER: GOTA, AHMEDABAD · SEAPORT DISPATCH: MUNDRA & JNPT</div>
    <div>PAGE {curr_page:02d} OF {total_pages}</div>
  </div>
</div>
""")
        curr_page += 1

    # SECTION 4: LIMESTONE PATTERNS
    # Divider (Page 101)
    render_limestone = os.path.join(ASSET_DIR, "render_limestone.jpg")
    html_parts.append(f"""
<div class="page divider-page">
  <div class="divider-render-frame">
    <img src="file://{render_limestone}" class="divider-render-img">
  </div>
  <div class="divider-banner">
    <div>
      <div class="divider-tag">COLLECTION 04 · 3 ARCHITECTURAL PATTERNS</div>
      <div class="divider-title">LIMESTONE VENEER PATTERNS</div>
      <div class="divider-desc">Monolithic architectural serenity, subtle organic fossils, and uniform acoustic-grade textures.</div>
    </div>
    <div class="divider-meta">
      FORMATS: <strong>1220×2440 · 1220×2800 · 1220×3050 mm</strong><br>
      THICKNESS: <strong>1.5 – 2.0 mm (Ultra-Thin Flexible)</strong><br>
      CODE SERIES: <strong>ST-SV-096 TO ST-SV-098</strong>
    </div>
  </div>
</div>
""")
    curr_page += 1

    # Section 4 Products (ST-SV-096 to ST-SV-098)
    limestone_prods = PRODUCTS[95:98]
    for idx, p in enumerate(limestone_prods):
        global_idx = 95 + idx
        code_str = f"ST-SV-{global_idx+1:03d}"
        asset_file = os.path.join(ASSET_DIR, f"slab_{global_idx+1:03d}_{p['file']}")
        html_parts.append(f"""
<div class="page product-page">
  <div class="prod-header">
    <div class="prod-header-left">
      <img src="file://{EMBLEM_PATH}" class="prod-emblem">
      <div class="prod-brand-lockup">
        <div class="prod-brand-name">STONE TECH ATELIER</div>
        <div class="prod-division-tag">ULTRA-THIN NATURAL STONE VENEER</div>
      </div>
    </div>
    <div class="prod-header-right">FACTORY DIRECT: <strong>+91 77420 90866</strong> · WWW.STONETECH.IN</div>
  </div>

  <div class="prod-slab-stage">
    <div class="prod-slab-frame">
      <img src="file://{asset_file}" class="prod-slab-img">
    </div>
  </div>

  <div class="prod-info-panel">
    <div class="prod-info-left">
      <div class="prod-family-badge">Limestone Collection</div>
      <div class="prod-name-title">{p['name']} · {p['pat']}</div>
      <div class="prod-code-line">ITEM CODE: {code_str}</div>
    </div>
    <div class="prod-info-right">
      <div class="prod-spec-item">Standard Dimensions: <strong>1220×2440 · 1220×2800 · 1220×3050 mm</strong></div>
      <div class="prod-spec-item">Sheet Weight: <strong>~1.50 kg / m² (~4.5 kg / sheet)</strong></div>
      <div class="prod-spec-item">Total Thickness: <strong>1.5 – 2.0 mm (Flexible)</strong></div>
      <div class="prod-spec-item">Primary Uses: <strong>Curved Walls, Facades, Furniture, Doors</strong></div>
      <div class="prod-spec-item">Substrate Backing: <strong>Fiberglass & Thermosetting Resin</strong></div>
      <div class="prod-spec-item">Adhesion Method: <strong>PU / MS Polymer Direct Bond</strong></div>
    </div>
  </div>

  <div class="prod-footer">
    <div>STONE TECH ATELIER · ARCHITECTURAL STONE FABRICATION</div>
    <div class="prod-footer-center">EXPERIENCE CENTER: GOTA, AHMEDABAD · SEAPORT DISPATCH: MUNDRA & JNPT</div>
    <div>PAGE {curr_page:02d} OF {total_pages}</div>
  </div>
</div>
""")
        curr_page += 1

    # ARCHITECTURAL PORTFOLIO & INSTALLATION GUIDE (Page 105)
    render_portfolio = os.path.join(ASSET_DIR, "render_portfolio.jpg")
    html_parts.append(f"""
<div class="page about-page">
  <div class="prod-header">
    <div class="prod-header-left">
      <img src="file://{EMBLEM_PATH}" class="prod-emblem">
      <div class="prod-brand-lockup">
        <div class="prod-brand-name">STONE TECH ATELIER</div>
        <div class="prod-division-tag">INSTALLATION PROTOCOL & FIELD GUIDE</div>
      </div>
    </div>
    <div class="prod-header-right">ARCHITECTURAL SPECIFICATION GUIDE · <strong>PAGE {curr_page:02d} OF {total_pages}</strong></div>
  </div>

  <div style="display: flex; gap: 6mm; margin-top: 3.5mm; flex: 1;">
    <div style="flex: 1.1; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 2mm; overflow: hidden; box-shadow: 0 4px 12px rgba(15,23,42,0.06); display: flex; flex-direction: column;">
      <div style="padding: 3mm 4mm; background: #0f172a; color: #fbbf24; font-size: 8.5pt; font-weight: 800; letter-spacing: 1px;">ARCHITECTURAL INSTALLATION METHODOLOGY</div>
      <div style="padding: 4mm 5mm; font-size: 7.5pt; line-height: 1.5; color: #334155;">
        <p style="margin-bottom: 2.5mm;"><strong>1. Substrate Inspection:</strong> Ensure the mounting surface (drywall, exterior plywood, fiber cement board, or plaster) is structurally sound, level, dry, and dust-free.</p>
        <p style="margin-bottom: 2.5mm;"><strong>2. Precision Sizing:</strong> Measure and score the sheet from either face using a circular saw equipped with a continuous-rim diamond blade or fine-toothed jigsaw. Handheld heavy-duty shears may be used for curved trimming.</p>
        <p style="margin-bottom: 2.5mm;"><strong>3. Adhesive Application:</strong> Apply a high-grab, moisture-curing polyurethane (PU) or MS Polymer hybrid adhesive across the backing using a 3 mm V-notched trowel for 100% coverage.</p>
        <p style="margin-bottom: 2.5mm;"><strong>4. Placement & Air Evacuation:</strong> Position the sheet firmly against the wall. Using a hand-held rubber laminate roller, press evenly from the center outwards to expel trapped air and ensure complete mechanical bonding.</p>
        <p><strong>5. Protective Impregnation:</strong> Once cured (24 hours), apply Stone Tech Deep-Penetrating Natural Stone Sealer to protect against moisture, oils, and environmental weathering.</p>
      </div>
    </div>

    <div style="flex: 1; border: 1px solid #cbd5e1; border-radius: 2mm; overflow: hidden; box-shadow: 0 4px 12px rgba(15,23,42,0.06); display: flex; flex-direction: column;">
      <img src="file://{render_portfolio}" style="width: 100%; height: 100%; object-fit: cover;">
    </div>
  </div>

  <div class="prod-footer">
    <div>STONE TECH ATELIER · ARCHITECTURAL STONE FABRICATION</div>
    <div class="prod-footer-center">EXPERIENCE CENTER: GOTA, AHMEDABAD · SEAPORT DISPATCH: MUNDRA & JNPT</div>
    <div>WWW.STONETECH.IN · +91 77420 90866</div>
  </div>
</div>
""")
    curr_page += 1

    # COMPREHENSIVE ENGINEERING SPECIFICATIONS & BACK COVER (Page 106)
    html_parts.append(f"""
<div class="page matrix-page">
  <div class="matrix-header">
    <div>
      <div style="color: #fbbf24; font-size: 8.5pt; font-weight: 800; letter-spacing: 2px;">TECHNICAL ENGINEERING MASTER SPECIFICATION</div>
      <div style="color: #ffffff; font-size: 15pt; font-weight: 900; margin-top: 1mm;">PHYSICAL, MECHANICAL & CHEMICAL PERFORMANCE MATRIX</div>
    </div>
    <div style="text-align: right; font-size: 7.5pt; color: #94a3b8;">
      STANDARDS: <strong>ASTM / EN 12057 COMPLIANT</strong><br>
      VERIFIED: <strong>EDITION 2026 – 2027</strong>
    </div>
  </div>

  <table class="matrix-table">
    <thead>
      <tr>
        <th style="width: 28%;">ENGINEERING PARAMETER</th>
        <th style="width: 36%;">SPECIFIED VALUE / RANGE</th>
        <th style="width: 36%;">TEST METHOD / ARCHITECTURAL IMPACT</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Total Composite Thickness</strong></td>
        <td>1.50 mm to 2.00 mm (±0.2 mm tolerance)</td>
        <td>Direct peel layer + fiberglass reinforced backing</td>
      </tr>
      <tr>
        <td><strong>Areal Mass / Density</strong></td>
        <td>1.45 to 1.65 kg / m² (~4.5 kg per 1220×2440 mm sheet)</td>
        <td>97% structural dead-weight reduction vs 20mm granite</td>
      </tr>
      <tr>
        <td><strong>Standard Production Sizes</strong></td>
        <td>1220×2440 mm · 1220×2800 mm · 1220×3050 mm</td>
        <td>Custom cut-to-order architectural panels available</td>
      </tr>
      <tr>
        <td><strong>Minimum Cold Bending Radius</strong></td>
        <td>~200 mm (cold) / down to ~50 mm (hot-air thermo-bend)</td>
        <td>Allows seamless wrapping around columns and barrel arches</td>
      </tr>
      <tr>
        <td><strong>Operating Temperature Stability</strong></td>
        <td>-40°C to +90°C continuous service</td>
        <td>Zero thermal creep, delamination, or cracking</td>
      </tr>
      <tr>
        <td><strong>Fire Reaction Classification</strong></td>
        <td>Class B1 / Euroclass B-s1, d0 flame retardant resin</td>
        <td>Self-extinguishing polymer matrix formulation</td>
      </tr>
      <tr>
        <td><strong>Moisture Absorption Substrate</strong></td>
        <td>&lt; 0.20% water absorption on resin backing</td>
        <td>Completely impervious resin backing layer</td>
      </tr>
      <tr>
        <td><strong>Standard Export Packaging</strong></td>
        <td>50 sheets per fumigated ISPM-15 export wooden crate</td>
        <td>Interleaved with protective PE foam sheets</td>
      </tr>
    </tbody>
  </table>

  <div class="back-contact-card">
    <div class="back-contact-left">
      <img src="file://{BADGE_PATH}" class="back-badge-img">
      <div class="back-contact-details">
        <h3>STONE TECH ATELIER</h3>
        <div>Architectural Natural Stone & Ultra-Thin Veneer Manufacturing Division</div>
        <div><strong>Atelier & Experience Center:</strong> Gota, Ahmedabad, Gujarat — 382481, India</div>
        <div><strong>Direct Factory Desk:</strong> +91 77420 90866 · <strong>Official Portal:</strong> www.stonetech.in</div>
      </div>
    </div>
    <div class="back-contact-right">
      <div>DIRECT CONTAINER SEAPORT DISPATCH:</div>
      <div><strong>Mundra Port (INMUN) & JNPT Port (INNSA)</strong></div>
      <div style="margin-top: 1.5mm;">Instant WhatsApp CRM Quotations & Project Inquiries:</div>
      <div style="color: #fbbf24; font-size: 9pt; font-weight: 800;">+91 77420 90866</div>
    </div>
  </div>

  <div style="display: flex; justify-content: space-between; border-top: 1px solid rgba(217, 119, 6, 0.4); padding-top: 2mm; font-size: 6.8pt; color: #94a3b8;">
    <div>STONE TECH ATELIER · ARCHITECTURAL STONE FABRICATION DIVISION</div>
    <div>WWW.STONETECH.IN · ALL RIGHTS RESERVED © 2026</div>
    <div>PAGE 106 OF 106 · FINAL PAGE</div>
  </div>
</div>
""")

    html_parts.append("""
</body>
</html>
""")
    return "".join(html_parts)

def compile_pdf(html_content, output_path):
    temp_html = f"/tmp/stone_veneer_{int(time.time() * 1000)}.html"
    with open(temp_html, "w", encoding="utf-8") as f:
        f.write(html_content)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    chrome_bin = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    cmd = [
        chrome_bin,
        "--headless",
        "--disable-gpu",
        "--allow-file-access-from-files",
        "--enable-local-file-accesses",
        f"--print-to-pdf={output_path}",
        temp_html
    ]
    print(f"Compiling PDF with headless Chrome to: {output_path}...")
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"Chrome PDF generation failed: {res.stderr}")
    print(f"Successfully generated {output_path} (Size: {os.path.getsize(output_path):,} bytes)")

def main():
    print("=== Stone Tech Stone Veneer Architectural Catalogue 2026 Generator ===")
    ensure_assets()
    print("Building HTML document (106 pages)...")
    html = build_html()
    compile_pdf(html, OUTPUT_PDF)
    print("\n==================================================================")
    print("STONE TECH STONE VENEER ARCHITECTURAL CATALOGUE 2026 COMPLETE!")
    print(f"Output File: {OUTPUT_PDF}")
    print("==================================================================")

if __name__ == "__main__":
    main()

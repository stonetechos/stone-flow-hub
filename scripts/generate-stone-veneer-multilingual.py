#!/usr/bin/env python3
"""
scripts/generate-stone-veneer-multilingual.py

Compiles the unified luxury Stone Tech Stone Veneer Architectural Master Catalogue 2026
in three languages:
  - English:  public/catalogues/StoneTech_Stone_Veneer_Catalogue_2026.pdf (and StoneTech_Stone_Veneer_Catalogue_English.pdf)
  - Hindi:    public/catalogues/StoneTech_Stone_Veneer_Catalogue_Hindi.pdf
  - Gujarati: public/catalogues/StoneTech_Stone_Veneer_Catalogue_Gujarati.pdf

Features:
  - Embedded Base64 TrueType fonts (NotoSansDevanagari, NotoSansGujarati) for 100% vector Indic typography.
  - Zero tofu glyphs (□□□□), zero clipping or layout glitches.
  - Page 57 custom bounding box crop (310, 375, 1445, 905) for flush stone without bend or MS pipe exposure.
  - Optimized file size (<18 MiB each) safely within Cloudflare Worker 25 MiB asset boundaries.
"""

import os
import sys
import shutil
import subprocess
import time
import base64
from PIL import Image, ImageEnhance

REPO_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
FONTS_DIR = os.path.join(REPO_DIR, "scripts/fonts")
ASSET_DIR = os.path.join(REPO_DIR, "public/catalogues/stone-veneer-assets")
CATALOG_DIR = os.path.join(REPO_DIR, "public/catalogues")
EMBLEM_PATH = os.path.join(REPO_DIR, "public/branding/stone-tech-emblem-hq.png")
BADGE_PATH = os.path.join(REPO_DIR, "public/branding/stone-tech-manufacturer-badge.png")

# Base64 encode fonts for 100% self-contained rendering
with open(os.path.join(FONTS_DIR, "NotoSansDevanagari-Regular.ttf"), "rb") as f:
    HI_REG_B64 = base64.b64encode(f.read()).decode("utf-8")
with open(os.path.join(FONTS_DIR, "NotoSansDevanagari-Bold.ttf"), "rb") as f:
    HI_BOLD_B64 = base64.b64encode(f.read()).decode("utf-8")
with open(os.path.join(FONTS_DIR, "NotoSansGujarati-Regular.ttf"), "rb") as f:
    GU_REG_B64 = base64.b64encode(f.read()).decode("utf-8")
with open(os.path.join(FONTS_DIR, "NotoSansGujarati-Bold.ttf"), "rb") as f:
    GU_BOLD_B64 = base64.b64encode(f.read()).decode("utf-8")

PRODUCTS = [
    # COLLECTION 01: SLATE STONE VENEER (51 items: ST-SV-001 to ST-SV-051)
    {"src": "part1_page03.jpg", "sec": "Slate Stone Collection", "name": "S. White", "pat": "Pattern 01", "sizes": "1220 × 2440 mm (4×8 ft)"},
    {"src": "part1_page04.jpg", "sec": "Slate Stone Collection", "name": "S. White", "pat": "Pattern 02", "sizes": "1220 × 2440 mm (4×8 ft)"},
    {"src": "part1_page05.jpg", "sec": "Slate Stone Collection", "name": "S. White", "pat": "Pattern 03", "sizes": "1220 × 2440 mm (4×8 ft)"},
    {"src": "part1_page06.jpg", "sec": "Slate Stone Collection", "name": "S. White", "pat": "Pattern 04", "sizes": "1220 × 2440 mm · 1220 × 2800 mm · 1220 × 3050 mm"},
    {"src": "part1_page07.jpg", "sec": "Slate Stone Collection", "name": "Indian Autumn", "pat": "Pattern 01", "sizes": "1220 × 2440 mm (4×8 ft)"},
    {"src": "part1_page08.jpg", "sec": "Slate Stone Collection", "name": "Indian Autumn", "pat": "Pattern 02", "sizes": "1220 × 2440 mm (4×8 ft)"},
    {"src": "part1_page09.jpg", "sec": "Slate Stone Collection", "name": "Indian Autumn", "pat": "Pattern 03", "sizes": "1220 × 2440 mm · 1220 × 2800 mm · 1220 × 3050 mm"},
    {"src": "part1_page10.jpg", "sec": "Slate Stone Collection", "name": "Indian Autumn", "pat": "Pattern 04", "sizes": "1220 × 2440 mm (4×8 ft)"},
    {"src": "part1_page11.jpg", "sec": "Slate Stone Collection", "name": "Indian Autumn", "pat": "Pattern 05", "sizes": "1220 × 2440 mm (4×8 ft)"},
    {"src": "part1_page12.jpg", "sec": "Slate Stone Collection", "name": "Indian Autumn", "pat": "Pattern 06", "sizes": "1220 × 2440 mm (4×8 ft)"},
    {"src": "part1_page13.jpg", "sec": "Slate Stone Collection", "name": "Indian Autumn", "pat": "Pattern 07", "sizes": "1220 × 2440 mm · 1220 × 2800 mm · 1220 × 3050 mm"},
    {"src": "part1_page14.jpg", "sec": "Slate Stone Collection", "name": "Tan Brown", "pat": "Pattern 01", "sizes": "1220 × 2440 mm (4×8 ft)"},
    {"src": "part1_page15.jpg", "sec": "Slate Stone Collection", "name": "Tan Brown", "pat": "Pattern 02", "sizes": "1220 × 2440 mm (4×8 ft)"},
    {"src": "part1_page16.jpg", "sec": "Slate Stone Collection", "name": "Tan Brown", "pat": "Pattern 03", "sizes": "1220 × 2440 mm · 1220 × 2800 mm · 1220 × 3050 mm"},
    {"src": "part1_page17.jpg", "sec": "Slate Stone Collection", "name": "Tan Brown", "pat": "Pattern 04", "sizes": "1220 × 2440 mm · 1220 × 2800 mm · 1220 × 3050 mm"},
    {"src": "part1_page18.jpg", "sec": "Slate Stone Collection", "name": "Autumn Rustic", "pat": "Pattern 01", "sizes": "1220 × 2440 mm · 1220 × 2800 mm"},
    {"src": "part1_page19.jpg", "sec": "Slate Stone Collection", "name": "Autumn Rustic", "pat": "Pattern 02", "sizes": "1220 × 2440 mm (4×8 ft)"},
    {"src": "part1_page20.jpg", "sec": "Slate Stone Collection", "name": "Autumn Rustic", "pat": "Pattern 03", "sizes": "1220 × 2440 mm · 1220 × 2800 mm · 1220 × 3050 mm"},
    {"src": "part1_page21.jpg", "sec": "Slate Stone Collection", "name": "Autumn Rustic", "pat": "Pattern 04", "sizes": "1220 × 2440 mm · 1220 × 2800 mm · 1220 × 3050 mm"},
    {"src": "part1_page22.jpg", "sec": "Slate Stone Collection", "name": "Black Gold", "pat": "Select Texture", "sizes": "1220 × 2440 mm · 1220 × 2800 mm · 1220 × 3050 mm"},
    {"src": "part1_page23.jpg", "sec": "Slate Stone Collection", "name": "Black Red", "pat": "Select Texture", "sizes": "1220 × 2440 mm · 1220 × 2800 mm · 1220 × 3050 mm"},
    {"src": "part1_page24.jpg", "sec": "Slate Stone Collection", "name": "Zeera Green", "pat": "Pattern 01", "sizes": "1220 × 2440 mm · 1220 × 2800 mm"},
    {"src": "part1_page25.jpg", "sec": "Slate Stone Collection", "name": "Zeera Green", "pat": "Pattern 02", "sizes": "1220 × 2440 mm · 1220 × 2800 mm"},
    {"src": "part1_page26.jpg", "sec": "Slate Stone Collection", "name": "Zeera Green", "pat": "Pattern 03", "sizes": "1220 × 2440 mm · 1220 × 2800 mm"},
    {"src": "part1_page27.jpg", "sec": "Slate Stone Collection", "name": "Autumn Black", "pat": "Pattern 01", "sizes": "1220 × 2440 mm · 1220 × 2800 mm · 1220 × 3050 mm"},
    {"src": "part1_page28.jpg", "sec": "Slate Stone Collection", "name": "Autumn Black", "pat": "Pattern 02", "sizes": "1220 × 2440 mm · 1220 × 2800 mm · 1220 × 3050 mm"},
    {"src": "part1_page29.jpg", "sec": "Slate Stone Collection", "name": "Forest Fire", "pat": "Pattern 01", "sizes": "1220 × 2440 mm (4×8 ft)"},
    {"src": "part1_page30.jpg", "sec": "Slate Stone Collection", "name": "Forest Fire", "pat": "Pattern 02", "sizes": "1220 × 2440 mm (4×8 ft)"},
    {"src": "part1_page31.jpg", "sec": "Slate Stone Collection", "name": "Forest Fire", "pat": "Pattern 03", "sizes": "1220 × 2440 mm (4×8 ft)"},
    {"src": "part1_page32.jpg", "sec": "Slate Stone Collection", "name": "Forest Fire", "pat": "Pattern 04", "sizes": "1220 × 2440 mm · 1220 × 2800 mm"},
    {"src": "part1_page33.jpg", "sec": "Slate Stone Collection", "name": "Forest Fire", "pat": "Pattern 05", "sizes": "1220 × 2440 mm · 1220 × 2800 mm"},
    {"src": "part1_page34.jpg", "sec": "Slate Stone Collection", "name": "Forest Fire", "pat": "Pattern 06", "sizes": "1220 × 2440 mm (4×8 ft)"},
    {"src": "part1_page35.jpg", "sec": "Slate Stone Collection", "name": "Golden", "pat": "Pattern 01", "sizes": "1220 × 2440 mm (4×8 ft)"},
    {"src": "part1_page36.jpg", "sec": "Slate Stone Collection", "name": "Golden", "pat": "Pattern 02", "sizes": "1220 × 2440 mm (4×8 ft)"},
    {"src": "part1_page37.jpg", "sec": "Slate Stone Collection", "name": "Deoli Green", "pat": "Select Texture", "sizes": "1220 × 2440 mm · 1220 × 2800 mm · 1220 × 3050 mm"},
    {"src": "part1_page38.jpg", "sec": "Slate Stone Collection", "name": "Multi Pink", "pat": "Select Texture", "sizes": "1220 × 2440 mm · 1220 × 2800 mm · 1220 × 3050 mm"},
    {"src": "part1_page39.jpg", "sec": "Slate Stone Collection", "name": "Copper", "pat": "Pattern 01", "sizes": "1220 × 2440 mm · 1220 × 2800 mm · 1220 × 3050 mm"},
    {"src": "part1_page40.jpg", "sec": "Slate Stone Collection", "name": "Copper", "pat": "Pattern 02", "sizes": "1220 × 2440 mm (4×8 ft)"},
    {"src": "part1_page41.jpg", "sec": "Slate Stone Collection", "name": "Copper", "pat": "Pattern 03", "sizes": "1220 × 2440 mm · 1220 × 2800 mm · 1220 × 3050 mm"},
    {"src": "part1_page42.jpg", "sec": "Slate Stone Collection", "name": "Silver Galaxy", "pat": "Select Texture", "sizes": "1220 × 2440 mm · 1220 × 2800 mm · 1220 × 3050 mm"},
    {"src": "part1_page43.jpg", "sec": "Slate Stone Collection", "name": "Ocean Green", "pat": "Select Texture", "sizes": "1220 × 2440 mm (4×8 ft)"},
    {"src": "part1_page44.jpg", "sec": "Slate Stone Collection", "name": "Silver Grey", "pat": "Pattern 01", "sizes": "1220 × 2440 mm · 1220 × 2800 mm · 1220 × 3050 mm"},
    {"src": "part1_page45.jpg", "sec": "Slate Stone Collection", "name": "Silver Grey", "pat": "Pattern 02", "sizes": "1220 × 2440 mm · 1220 × 2800 mm · 1220 × 3050 mm"},
    {"src": "part1_page46.jpg", "sec": "Slate Stone Collection", "name": "South Grey", "pat": "Select Texture", "sizes": "1220 × 2440 mm · 1220 × 2800 mm · 1220 × 3050 mm"},
    {"src": "part1_page47.jpg", "sec": "Slate Stone Collection", "name": "Ocean Black", "pat": "Pattern 01", "sizes": "1220 × 2440 mm · 1220 × 2800 mm · 1220 × 3050 mm"},
    {"src": "part1_page48.jpg", "sec": "Slate Stone Collection", "name": "Ocean Black", "pat": "Pattern 02", "sizes": "1220 × 2440 mm · 1220 × 2800 mm"},
    {"src": "part1_page49.jpg", "sec": "Slate Stone Collection", "name": "Ocean Black", "pat": "Pattern 03", "sizes": "1220 × 2440 mm (4×8 ft)"},
    {"src": "part1_page50.jpg", "sec": "Slate Stone Collection", "name": "California Gold", "pat": "Select Texture", "sizes": "1220 × 2440 mm (4×8 ft)"},
    {"src": "part1_page51.jpg", "sec": "Slate Stone Collection", "name": "Silver Shine Gold", "pat": "Select Texture", "sizes": "1220 × 2440 mm (4×8 ft)"},
    {"src": "part1_page52.jpg", "sec": "Slate Stone Collection", "name": "Silver Shine", "pat": "Pattern 01", "sizes": "1220 × 2440 mm · 1220 × 2800 mm · 1220 × 3050 mm"},
    {"src": "part2_page01.jpg", "sec": "Slate Stone Collection", "name": "Silver Shine", "pat": "Pattern 02", "sizes": "1220 × 2440 mm · 1220 × 2800 mm · 1220 × 3050 mm"},

    # COLLECTION 02: SANDSTONE VENEER (8 items: ST-SV-052 to ST-SV-059)
    {"src": "part2_page03.jpg", "sec": "Sandstone Collection", "name": "Mint White", "pat": "Select Texture", "sizes": "1220 × 2440 mm · 1220 × 2800 mm · 1220 × 3050 mm"},
    {"src": "part2_page04.jpg", "sec": "Sandstone Collection", "name": "Mint Beige", "pat": "Select Texture", "sizes": "1220 × 2440 mm · 1220 × 2800 mm · 1220 × 3050 mm"},
    {"src": "part2_page05.jpg", "sec": "Sandstone Collection", "name": "Terra Red", "pat": "Pattern 01", "sizes": "1220 × 2440 mm (4×8 ft)"},
    {"src": "part2_page06.jpg", "sec": "Sandstone Collection", "name": "Terra Red", "pat": "Pattern 02", "sizes": "1220 × 2440 mm (4×8 ft)"},
    {"src": "part2_page07.jpg", "sec": "Sandstone Collection", "name": "Teakwood", "pat": "Pattern 01", "sizes": "1220 × 2440 mm · 1220 × 2800 mm"},
    {"src": "part2_page08.jpg", "sec": "Sandstone Collection", "name": "Mint Sunrise", "pat": "Select Texture", "sizes": "1220 × 2440 mm · 1220 × 2800 mm · 1220 × 3050 mm"},
    {"src": "part2_page09.jpg", "sec": "Sandstone Collection", "name": "Rainbow", "pat": "Pattern 01", "sizes": "1220 × 2440 mm · 1220 × 2800 mm · 1220 × 3050 mm"},
    {"src": "part2_page10.jpg", "sec": "Sandstone Collection", "name": "Rainbow", "pat": "Pattern 02", "sizes": "1220 × 2440 mm · 1220 × 2800 mm · 1220 × 3050 mm"},

    # COLLECTION 03: MARBLE STONE VENEER (36 items: ST-SV-060 to ST-SV-095)
    {"src": "part2_page12.jpg", "sec": "Marble Stone Collection", "name": "Panda White", "pat": "Pattern 01", "sizes": "1220 × 2440 mm (4×8 ft)"},
    {"src": "part2_page13.jpg", "sec": "Marble Stone Collection", "name": "Panda White", "pat": "Pattern 02", "sizes": "1220 × 2440 mm · 1220 × 2800 mm · 1220 × 3050 mm"},
    {"src": "part2_page14.jpg", "sec": "Marble Stone Collection", "name": "Panda White", "pat": "Pattern 03", "sizes": "1220 × 2440 mm (4×8 ft)"},
    {"src": "part2_page15.jpg", "sec": "Marble Stone Collection", "name": "Smokey Grey", "pat": "Select Texture", "sizes": "1220 × 2440 mm · 1220 × 2800 mm · 1220 × 3050 mm"},
    {"src": "part2_page16.jpg", "sec": "Marble Stone Collection", "name": "Himalaya White", "pat": "Select Texture", "sizes": "1220 × 2440 mm · 1220 × 2800 mm · 1220 × 3050 mm"},
    {"src": "part2_page17.jpg", "sec": "Marble Stone Collection", "name": "Marina Green", "pat": "Select Texture", "sizes": "1220 × 2440 mm · 1220 × 2800 mm · 1220 × 3050 mm"},
    {"src": "part2_page18.jpg", "sec": "Marble Stone Collection", "name": "Antiq White", "pat": "Select Texture", "sizes": "1220 × 2440 mm · 1220 × 2800 mm · 1220 × 3050 mm"},
    {"src": "part2_page19.jpg", "sec": "Marble Stone Collection", "name": "Black Shimmer", "pat": "Pattern 01", "sizes": "1220 × 2440 mm · 1220 × 2800 mm · 1220 × 3050 mm"},
    {"src": "part2_page20.jpg", "sec": "Marble Stone Collection", "name": "Black Shimmer", "pat": "Pattern 02", "sizes": "1220 × 2440 mm · 1220 × 2800 mm · 1220 × 3050 mm"},
    {"src": "part2_page21.jpg", "sec": "Marble Stone Collection", "name": "Silvia Beige", "pat": "Select Texture", "sizes": "1220 × 2440 mm (4×8 ft)"},
    {"src": "part2_page22.jpg", "sec": "Marble Stone Collection", "name": "Monsoon Black", "pat": "Select Texture", "sizes": "1220 × 2440 mm (4×8 ft)"},
    {"src": "part2_page23.jpg", "sec": "Marble Stone Collection", "name": "Rainforest Green", "pat": "Select Texture", "sizes": "1220 × 2440 mm · 1220 × 2800 mm · 1220 × 3050 mm"},
    {"src": "part2_page24.jpg", "sec": "Marble Stone Collection", "name": "Rainforest Gold", "pat": "Select Texture", "sizes": "1220 × 2440 mm · 1220 × 2800 mm · 1220 × 3050 mm"},
    {"src": "part2_page25.jpg", "sec": "Marble Stone Collection", "name": "Rainforest Brown", "pat": "Select Texture", "sizes": "1220 × 2440 mm · 1220 × 2800 mm · 1220 × 3050 mm"},
    {"src": "part2_page26.jpg", "sec": "Marble Stone Collection", "name": "Fire Red", "pat": "Select Texture", "sizes": "1220 × 2440 mm (4×8 ft)"},
    {"src": "part2_page27.jpg", "sec": "Marble Stone Collection", "name": "Vintage Shine Dark", "pat": "Select Texture", "sizes": "1220 × 2440 mm · 1220 × 2800 mm · 1220 × 3050 mm"},
    {"src": "part2_page28.jpg", "sec": "Marble Stone Collection", "name": "Vintage Shine", "pat": "Select Texture", "sizes": "1220 × 2440 mm · 1220 × 2800 mm · 1220 × 3050 mm"},
    {"src": "part2_page29.jpg", "sec": "Marble Stone Collection", "name": "Eroding Sea", "pat": "Select Texture", "sizes": "1220 × 2440 mm (4×8 ft)"},
    {"src": "part2_page30.jpg", "sec": "Marble Stone Collection", "name": "Arctic Storm", "pat": "Pattern 01", "sizes": "1220 × 2440 mm · 1220 × 2800 mm · 1220 × 3050 mm"},
    {"src": "part2_page31.jpg", "sec": "Marble Stone Collection", "name": "Arctic Storm", "pat": "Pattern 02", "sizes": "1220 × 2440 mm · 1220 × 2800 mm · 1220 × 3050 mm"},
    {"src": "part2_page32.jpg", "sec": "Marble Stone Collection", "name": "Arctic Storm", "pat": "Pattern 03", "sizes": "1220 × 2440 mm (4×8 ft)"},
    {"src": "part2_page33.jpg", "sec": "Marble Stone Collection", "name": "Fantasy White", "pat": "Select Texture", "sizes": "1220 × 2440 mm (4×8 ft)"},
    {"src": "part2_page34.jpg", "sec": "Marble Stone Collection", "name": "Atlantic White", "pat": "Select Texture", "sizes": "1220 × 2440 mm · 1220 × 2800 mm · 1220 × 3050 mm"},
    {"src": "part2_page35.jpg", "sec": "Marble Stone Collection", "name": "Cloudy White", "pat": "Pattern 01", "sizes": "1220 × 2440 mm (4×8 ft)"},
    {"src": "part2_page36.jpg", "sec": "Marble Stone Collection", "name": "Cloudy White", "pat": "Pattern 02", "sizes": "1220 × 2440 mm (4×8 ft)"},
    {"src": "part2_page37.jpg", "sec": "Marble Stone Collection", "name": "Sea White", "pat": "Pattern 01", "sizes": "1220 × 2440 mm (4×8 ft)"},
    {"src": "part2_page38.jpg", "sec": "Marble Stone Collection", "name": "Sea White", "pat": "Pattern 02", "sizes": "1220 × 2440 mm (4×8 ft)"},
    {"src": "part2_page39.jpg", "sec": "Marble Stone Collection", "name": "Sea Black", "pat": "Select Texture", "sizes": "1220 × 2440 mm (4×8 ft)"},
    {"src": "part2_page40.jpg", "sec": "Marble Stone Collection", "name": "Petra Black", "pat": "Select Texture", "sizes": "1220 × 2440 mm (4×8 ft)"},
    {"src": "part2_page41.jpg", "sec": "Marble Stone Collection", "name": "Snow Dunes", "pat": "Pattern 01", "sizes": "1220 × 2440 mm (4×8 ft)"},
    {"src": "part2_page42.jpg", "sec": "Marble Stone Collection", "name": "Snow Dunes", "pat": "Pattern 02", "sizes": "1220 × 2440 mm (4×8 ft)"},
    {"src": "part2_page43.jpg", "sec": "Marble Stone Collection", "name": "Snow Dunes", "pat": "Pattern 03", "sizes": "1220 × 2440 mm (4×8 ft)"},
    {"src": "part2_page44.jpg", "sec": "Marble Stone Collection", "name": "Snow Dunes Dark", "pat": "Select Texture", "sizes": "1220 × 2440 mm (4×8 ft)"},
    {"src": "part2_page45.jpg", "sec": "Marble Stone Collection", "name": "Thainos Green", "pat": "Select Texture", "sizes": "1220 × 2440 mm · 1220 × 2800 mm · 1220 × 3050 mm"},
    {"src": "part2_page46.jpg", "sec": "Marble Stone Collection", "name": "Sparkling Yellow", "pat": "Select Texture", "sizes": "1220 × 2440 mm · 1220 × 2800 mm · 1220 × 3050 mm"},
    {"src": "part2_page47.jpg", "sec": "Marble Stone Collection", "name": "Sparkling White", "pat": "Select Texture", "sizes": "1220 × 2440 mm · 1220 × 2800 mm · 1220 × 3050 mm"},

    # COLLECTION 04: LIMESTONE VENEER (3 items: ST-SV-096 to ST-SV-098)
    {"src": "part2_page49.jpg", "sec": "Limestone Collection", "name": "Grey Limestone", "pat": "Monolithic Texture", "sizes": "1220 × 2440 mm (4×8 ft)"},
    {"src": "part2_page50.jpg", "sec": "Limestone Collection", "name": "Pink Limestone", "pat": "Monolithic Texture", "sizes": "1220 × 2440 mm (4×8 ft)"},
    {"src": "part2_page51.jpg", "sec": "Limestone Collection", "name": "Green Limestone", "pat": "Monolithic Texture", "sizes": "1220 × 2440 mm (4×8 ft)"},
]

NAMES_TRANSLATION = {
    "S. White": {"hi": "एस. व्हाइट", "gu": "એસ. વ્હાઇટ"},
    "Indian Autumn": {"hi": "इंडियन ऑटम", "gu": "ઇન્ડિયન ઓટમ"},
    "Tan Brown": {"hi": "टैन ब्राउन", "gu": "ટેન બ્રાઉન"},
    "Autumn Rustic": {"hi": "ऑटम रस्टिक", "gu": "ઓટમ રસ્ટિક"},
    "Black Gold": {"hi": "ब्लैक गोल्ड", "gu": "બ્લેક ગોલ્ડ"},
    "Black Red": {"hi": "ब्लैक रेड", "gu": "બ્લેક રેડ"},
    "Zeera Green": {"hi": "जीरा ग्रीन", "gu": "જીરા ગ્રીન"},
    "Autumn Black": {"hi": "ऑटम ब्लैक", "gu": "ઓટમ બ્લેક"},
    "Forest Fire": {"hi": "फॉरेस्ट फायर", "gu": "ફોરેસ્ટ ફાયર"},
    "Golden": {"hi": "गोल्डन", "gu": "ગોલ્ડન"},
    "Deoli Green": {"hi": "देवली ग्रीन", "gu": "દેવલી ગ્રીન"},
    "Multi Pink": {"hi": "मल्टी पिंक", "gu": "મલ્ટી પિંક"},
    "Copper": {"hi": "कॉपर", "gu": "કોપર"},
    "Silver Galaxy": {"hi": "सिल्वर गैलेक्सी", "gu": "સિલ્વર ગેલેક્સી"},
    "Ocean Green": {"hi": "ओशन ग्रीन", "gu": "ઓશન ગ્રીન"},
    "Silver Grey": {"hi": "सिल्वर ग्रे", "gu": "સિલ્વર ગ્રે"},
    "South Grey": {"hi": "साउथ ग्रे", "gu": "સાઉથ ગ્રે"},
    "Ocean Black": {"hi": "ओशन ब्लैक", "gu": "ઓશન બ્લેક"},
    "California Gold": {"hi": "कैलिफोर्निया गोल्ड", "gu": "કેલિફોર્નિયા ગોલ્ડ"},
    "Silver Shine Gold": {"hi": "सिल्वर शाइन गोल्ड", "gu": "સિલ્વર શાઇન ગોલ્ડ"},
    "Silver Shine": {"hi": "सिल्वर शाइन", "gu": "સિલ્વર શાઇન"},
    "Mint White": {"hi": "मिंट व्हाइट", "gu": "મિન્ટ વ્હાઇટ"},
    "Mint Beige": {"hi": "मिंट बेज", "gu": "મિન્ટ બેજ"},
    "Terra Red": {"hi": "टेरा रेड", "gu": "ટેરા રેડ"},
    "Teakwood": {"hi": "टीकवुड", "gu": "ટીકવૂડ"},
    "Mint Sunrise": {"hi": "मिंट सनराइज", "gu": "મિન્ટ સનરાઇઝ"},
    "Rainbow": {"hi": "रेनबो", "gu": "રેનબો"},
    "Panda White": {"hi": "पांडा व्हाइट", "gu": "પાંડા વ્હાઇટ"},
    "Smokey Grey": {"hi": "स्मोकी ग्रे", "gu": "સ્મોકી ગ્રે"},
    "Himalaya White": {"hi": "हिमालय व्हाइट", "gu": "હિમાલય વ્હાઇટ"},
    "Marina Green": {"hi": "मरीना ग्रीन", "gu": "મરિના ગ્રીન"},
    "Antiq White": {"hi": "एंटीक व्हाइट", "gu": "એન્ટિક વ્હાઇટ"},
    "Black Shimmer": {"hi": "ब्लैक शिमर", "gu": "બ્લેક શિમર"},
    "Silvia Beige": {"hi": "सिल्विया बेज", "gu": "સિલ્વિયા બેજ"},
    "Monsoon Black": {"hi": "मानसून ब्लैक", "gu": "મોન્સૂન બ્લેક"},
    "Rainforest Green": {"hi": "रेनफॉरेस्ट ग्रीन", "gu": "રેનફોરેસ્ટ ગ્રીન"},
    "Rainforest Gold": {"hi": "रेनफॉरेस्ट गोल्ड", "gu": "રેનફોરેસ્ટ ગોલ્ડ"},
    "Rainforest Brown": {"hi": "रेनफॉरेस्ट ब्राउन", "gu": "રેનફોરેસ્ટ બ્રાઉન"},
    "Fire Red": {"hi": "फायर रेड", "gu": "ફાયર રેડ"},
    "Vintage Shine Dark": {"hi": "विंटेज शाइन डार्क", "gu": "વિન્ટેજ શાઇન ડાર્ક"},
    "Vintage Shine": {"hi": "विंटेज शाइन", "gu": "વિન્ટેજ શાઇન"},
    "Eroding Sea": {"hi": "इरोडिंग सी", "gu": "ઇરોડિંગ સી"},
    "Arctic Storm": {"hi": "आर्कटिक स्टॉर्म", "gu": "આર્કટિક સ્ટોર્મ"},
    "Fantasy White": {"hi": "फैंटेसी व्हाइट", "gu": "ફેન્ટસી વ્હાઇટ"},
    "Atlantic White": {"hi": "अटलांटिक व्हाइट", "gu": "એટલાન્ટિક વ્હાઇટ"},
    "Cloudy White": {"hi": "क्लाउडी व्हाइट", "gu": "ક્લાઉડી વ્હાઇટ"},
    "Sea White": {"hi": "सी व्हाइट", "gu": "સી વ્હાઇટ"},
    "Sea Black": {"hi": "सी ब्लैक", "gu": "સી બ્લેક"},
    "Petra Black": {"hi": "पेट्रा ब्लैक", "gu": "પેટ્રા બ્લેક"},
    "Snow Dunes": {"hi": "स्नो ड्यून्स", "gu": "સ્નો ડ્યુન્સ"},
    "Snow Dunes Dark": {"hi": "स्नो ड्यून्स डार्क", "gu": "સ્નો ડ્યુન્સ ડાર્ક"},
    "Thainos Green": {"hi": "थाइनोस ग्रीन", "gu": "થાઇનોસ ગ્રીન"},
    "Sparkling Yellow": {"hi": "स्पार्कलिंग येलो", "gu": "સ્પાર્કલિંગ યલો"},
    "Sparkling White": {"hi": "स्पार्कलिंग व्हाइट", "gu": "સ્પાર્કલિંગ વ્હાઇટ"},
    "Grey Limestone": {"hi": "ग्रे लाइमस्टोन", "gu": "ગ્રે લાઇમસ્ટોન"},
    "Pink Limestone": {"hi": "पिंक लाइमस्टोन", "gu": "પિંક લાઇમસ્ટોન"},
    "Green Limestone": {"hi": "ग्रीन लाइमस्टोन", "gu": "ગ્રીન લાઇમસ્ટોન"},
}

SECTIONS_TRANSLATION = {
    "Slate Stone Collection": {
        "en": "SLATE STONE COLLECTION",
        "hi": "स्लेट स्टोन संग्रह",
        "gu": "સ્લેટ સ્ટોન સંગ્રહ"
    },
    "Sandstone Collection": {
        "en": "SANDSTONE COLLECTION",
        "hi": "सैंडस्टोन संग्रह",
        "gu": "સેન્ડસ્ટોન સંગ્રહ"
    },
    "Marble Stone Collection": {
        "en": "MARBLE STONE COLLECTION",
        "hi": "मार्बल स्टोन संग्रह",
        "gu": "માર્બલ સ્ટોન સંગ્રહ"
    },
    "Limestone Collection": {
        "en": "LIMESTONE COLLECTION",
        "hi": "लाइमस्टोन संग्रह",
        "gu": "લાઇમસ્ટોન સંગ્રહ"
    },
}

PAT_TRANSLATION = {
    "Select Texture": {"hi": "विशिष्ट टेक्सचर", "gu": "પસંદગીય ટેક્સચર"},
    "Monolithic Texture": {"hi": "मोनोलिथिक टेक्सचर", "gu": "મોનોલિથિક ટેક્સચર"},
}

def to_indic(num_str, lang):
    if lang == "hi":
        hi_digits = str.maketrans("0123456789", "०१२३४५६७८९")
        return str(num_str).translate(hi_digits)
    elif lang == "gu":
        gu_digits = str.maketrans("0123456789", "૦૧૨૩૪૫૬૭૮૯")
        return str(num_str).translate(gu_digits)
    return str(num_str)

def localize_sizes(sizes_str, lang):
    if lang == "en":
        return sizes_str
    s = sizes_str
    if lang == "hi":
        s = s.replace("mm", "मिमी").replace("ft", "फीट")
        return to_indic(s, "hi")
    elif lang == "gu":
        s = s.replace("mm", "મીમી").replace("ft", "ફૂટ")
        return to_indic(s, "gu")
    return s

def get_product_title(item, lang):
    name = item["name"]
    pat = item["pat"]
    if lang == "en":
        return f"{name} · {pat}"
    
    local_name = NAMES_TRANSLATION.get(name, {}).get(lang, name)
    if "Pattern " in pat:
        pat_num = pat.replace("Pattern ", "")
        local_pat = f"पैटर्न {to_indic(pat_num, lang)}" if lang == "hi" else f"પેટર્ન {to_indic(pat_num, lang)}"
    else:
        local_pat = PAT_TRANSLATION.get(pat, {}).get(lang, pat)
    
    if lang == "hi":
        return f"{local_name} · {local_pat}"
    elif lang == "gu":
        return f"{local_name} · {local_pat}"
    return f"{name} · {pat}"

def build_html_for_lang(lang="en"):
    total_pages = 106
    curr_page = 1

    # Font setup
    if lang == "hi":
        font_family = "'CatalogHindiFont', 'Noto Sans Devanagari', -apple-system, sans-serif"
        fonts_css = f"""
@font-face {{
  font-family: 'CatalogHindiFont';
  src: url('data:font/ttf;base64,{HI_REG_B64}') format('truetype');
  font-weight: 100;
  font-style: normal;
}}
@font-face {{
  font-family: 'CatalogHindiFont';
  src: url('data:font/ttf;base64,{HI_REG_B64}') format('truetype');
  font-weight: 200;
  font-style: normal;
}}
@font-face {{
  font-family: 'CatalogHindiFont';
  src: url('data:font/ttf;base64,{HI_REG_B64}') format('truetype');
  font-weight: 300;
  font-style: normal;
}}
@font-face {{
  font-family: 'CatalogHindiFont';
  src: url('data:font/ttf;base64,{HI_REG_B64}') format('truetype');
  font-weight: 400;
  font-style: normal;
}}
@font-face {{
  font-family: 'CatalogHindiFont';
  src: url('data:font/ttf;base64,{HI_REG_B64}') format('truetype');
  font-weight: 500;
  font-style: normal;
}}
@font-face {{
  font-family: 'CatalogHindiFont';
  src: url('data:font/ttf;base64,{HI_REG_B64}') format('truetype');
  font-weight: normal;
  font-style: normal;
}}
@font-face {{
  font-family: 'CatalogHindiFont';
  src: url('data:font/ttf;base64,{HI_BOLD_B64}') format('truetype');
  font-weight: 600;
  font-style: normal;
}}
@font-face {{
  font-family: 'CatalogHindiFont';
  src: url('data:font/ttf;base64,{HI_BOLD_B64}') format('truetype');
  font-weight: 700;
  font-style: normal;
}}
@font-face {{
  font-family: 'CatalogHindiFont';
  src: url('data:font/ttf;base64,{HI_BOLD_B64}') format('truetype');
  font-weight: 800;
  font-style: normal;
}}
@font-face {{
  font-family: 'CatalogHindiFont';
  src: url('data:font/ttf;base64,{HI_BOLD_B64}') format('truetype');
  font-weight: 900;
  font-style: normal;
}}
@font-face {{
  font-family: 'CatalogHindiFont';
  src: url('data:font/ttf;base64,{HI_BOLD_B64}') format('truetype');
  font-weight: bold;
  font-style: normal;
}}
"""
    elif lang == "gu":
        font_family = "'CatalogGujaratiFont', 'Noto Sans Gujarati', -apple-system, sans-serif"
        fonts_css = f"""
@font-face {{
  font-family: 'CatalogGujaratiFont';
  src: url('data:font/ttf;base64,{GU_REG_B64}') format('truetype');
  font-weight: 100;
  font-style: normal;
}}
@font-face {{
  font-family: 'CatalogGujaratiFont';
  src: url('data:font/ttf;base64,{GU_REG_B64}') format('truetype');
  font-weight: 200;
  font-style: normal;
}}
@font-face {{
  font-family: 'CatalogGujaratiFont';
  src: url('data:font/ttf;base64,{GU_REG_B64}') format('truetype');
  font-weight: 300;
  font-style: normal;
}}
@font-face {{
  font-family: 'CatalogGujaratiFont';
  src: url('data:font/ttf;base64,{GU_REG_B64}') format('truetype');
  font-weight: 400;
  font-style: normal;
}}
@font-face {{
  font-family: 'CatalogGujaratiFont';
  src: url('data:font/ttf;base64,{GU_REG_B64}') format('truetype');
  font-weight: 500;
  font-style: normal;
}}
@font-face {{
  font-family: 'CatalogGujaratiFont';
  src: url('data:font/ttf;base64,{GU_REG_B64}') format('truetype');
  font-weight: normal;
  font-style: normal;
}}
@font-face {{
  font-family: 'CatalogGujaratiFont';
  src: url('data:font/ttf;base64,{GU_BOLD_B64}') format('truetype');
  font-weight: 600;
  font-style: normal;
}}
@font-face {{
  font-family: 'CatalogGujaratiFont';
  src: url('data:font/ttf;base64,{GU_BOLD_B64}') format('truetype');
  font-weight: 700;
  font-style: normal;
}}
@font-face {{
  font-family: 'CatalogGujaratiFont';
  src: url('data:font/ttf;base64,{GU_BOLD_B64}') format('truetype');
  font-weight: 800;
  font-style: normal;
}}
@font-face {{
  font-family: 'CatalogGujaratiFont';
  src: url('data:font/ttf;base64,{GU_BOLD_B64}') format('truetype');
  font-weight: 900;
  font-style: normal;
}}
@font-face {{
  font-family: 'CatalogGujaratiFont';
  src: url('data:font/ttf;base64,{GU_BOLD_B64}') format('truetype');
  font-weight: bold;
  font-style: normal;
}}
"""
    else:
        font_family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
        fonts_css = ""

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
{fonts_css}
body {{
  margin: 0;
  font-family: {font_family};
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

/* COVER PAGE */
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
  width: 28mm;
  height: 28mm;
  background: #ffffff;
  border: 2.5px solid #d97706;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2.5mm;
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
  letter-spacing: 2px;
}}
.cover-atelier {{
  color: #94a3b8;
  font-size: 8.5pt;
  font-weight: 600;
  letter-spacing: 1.2px;
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
  font-size: 24pt;
  font-weight: 900;
  color: #ffffff;
  letter-spacing: 0.5px;
  line-height: 1.2;
}}
.cover-title2 {{
  font-size: 19pt;
  font-weight: 800;
  color: #fbbf24;
  letter-spacing: 1.2px;
  margin-top: 2mm;
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
  letter-spacing: 1.5px;
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

/* ABOUT / MATERIAL SCIENCE PAGE */
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
  gap: 6mm;
  margin-top: 3mm;
  flex: 1;
}}
.about-card {{
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 2.5mm;
  padding: 5mm 6mm;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 3mm;
  text-align: left;
}}
.about-card-title {{
  font-size: 10.5pt;
  font-weight: 800;
  color: #0f172a;
  border-bottom: 2px solid #d97706;
  padding-bottom: 2mm;
  margin-bottom: 1mm;
  letter-spacing: 0.5px;
  text-align: left;
}}
.about-text {{
  font-size: 7.6pt;
  line-height: 1.6;
  color: #334155;
  margin-bottom: 2mm;
  text-align: left;
  word-break: normal;
  overflow-wrap: break-word;
}}
.about-feat-list {{
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2.5mm;
  margin-top: 1mm;
}}
.about-feat-item {{
  display: flex;
  align-items: flex-start;
  gap: 2mm;
  font-size: 7.4pt;
  line-height: 1.5;
  color: #334155;
  text-align: left;
  word-break: normal;
  overflow-wrap: break-word;
}}
.about-feat-bullet {{
  color: #d97706;
  font-weight: 800;
  flex-shrink: 0;
  margin-top: 0.3mm;
}}

/* DIVIDER PAGES */
.divider-page {{
  padding: 10mm 14mm 8mm 14mm;
  background: #0f172a;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}}
.divider-render-frame {{
  width: 100%;
  height: 140mm;
  border: 1px solid #334155;
  border-radius: 2mm;
  overflow: hidden;
  background: #020617;
}}
.divider-render-img {{
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  display: block;
}}
.divider-banner {{
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1.5px solid #d97706;
  padding-top: 3.5mm;
  margin-top: 3mm;
}}
.divider-tag {{
  color: #fbbf24;
  font-size: 8pt;
  font-weight: 800;
  letter-spacing: 1.5px;
  text-align: left;
}}
.divider-title {{
  color: #ffffff;
  font-size: 18pt;
  font-weight: 900;
  letter-spacing: 0.5px;
  text-align: left;
  margin-top: 0.5mm;
}}
.divider-desc {{
  color: #94a3b8;
  font-size: 8pt;
  margin-top: 1.5mm;
  text-align: left;
  line-height: 1.45;
}}
.divider-meta {{
  text-align: right;
  font-size: 7.5pt;
  color: #cbd5e1;
  line-height: 1.6;
  white-space: nowrap;
}}
.divider-meta strong {{
  color: #fbbf24;
}}

/* PRODUCT PAGE */
.product-page {{
  padding: 7mm 14mm 6mm 14mm;
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
  padding-bottom: 1.8mm;
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
  padding: 2.5mm 0;
  min-height: 0;
}}
.prod-slab-card {{
  width: 260mm;
  height: 119mm;
  background: #0f172a;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}}
.prod-slab-img {{
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  display: block;
}}
.prod-info-panel {{
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 2mm;
  padding: 2.8mm 5mm;
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
  font-size: 13pt;
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

/* MATRIX & BACK COVER */
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
    if lang == "hi":
        c_brand = "स्टोन टेक अटेलियर"
        c_sub = "वास्तुशिल्पीय प्राकृतिक पाषाण एवं विनियर डिवीजन · स्थापना २०१८"
        c_t1 = "अत्यंत पतली लचीली प्राकृतिक स्टोन विनियर"
        c_t2 = "वास्तुशिल्पीय मुख्य संग्रह"
        c_ed = "संस्करण २०२६ – २०२७ · संयुक्त मास्टर कैटलॉग (भाग १ एवं २)"
        c_p1 = "सतह: <strong>१००% असली प्राकृतिक पत्थर</strong>"
        c_p2 = "आधार: <strong>फाइबरग्लास एवं पॉलीमर रेजिन</strong>"
        c_p3 = "वजन: <strong>~१.५० किग्रा / वर्गमीटर (अत्यंत हल्की)</strong>"
        c_p4 = "संग्रह: <strong>स्लेट · सैंडस्टोन · मार्बल · लाइमस्टोन</strong>"
        c_fl = "<strong>मुख्यालय एवं अटेलियर:</strong> गोता, अहमदाबाद, गुजरात, भारत<br><strong>सीधा निर्यात डिस्पैच:</strong> मुंद्रा पोर्ट एवं जेएनपीटी पोर्ट, भारत"
        c_fc = "निर्माता प्रत्यक्ष वास्तुशिल्पीय विनिर्देश<br>व्हाट्सएप हेल्पलाइन: +९१ ९७८४४ ५२९९८ / +९१ ७७४२० ९०८६६"
    elif lang == "gu":
        c_brand = "સ્ટોન ટેક એટેલિયર"
        c_sub = "વાસ્તુશિલ્પીય કુદરતી પથ્થર અને વિનિયર ડિવિઝન · સ્થાપના ૨૦૧૮"
        c_t1 = "અત્યંત પાતળી લચીલી કુદરતી સ્ટોન વિનિયર"
        c_t2 = "વાસ્તુશિલ્પીય મુખ્ય સંગ્રહ"
        c_ed = "આવૃત્તિ ૨૦૨૬ – ૨૦૨૭ · સંયુક્ત માસ્ટર કેટલોગ (ભાગ ૧ અને ૨)"
        c_p1 = "સપાટી: <strong>૧૦૦% અસલી કુદરતી પથ્થર</strong>"
        c_p2 = "આધાર: <strong>ફાઇબરગ્લાસ અને પોલિમર રેઝિન</strong>"
        c_p3 = "વજન: <strong>~૧.૫૦ કિગ્રા / ચોરસ મીટર (અત્યંત હલકી)</strong>"
        c_p4 = "સંગ્રહ: <strong>સ્લેટ · સેન્ડસ્ટોન · માર્બલ · લાઇમસ્ટોન</strong>"
        c_fl = "<strong>મુખ્યાલય અને એટેલિયર:</strong> ગોતા, અમદાવાદ, ગુજરાત, ભારત<br><strong>સીધું નિકાસ ડિસ્પેચ:</strong> મુંદ્રા પોર્ટ અને JNPT પોર્ટ, ભારત"
        c_fc = "ઉત્પાદક તરફથી સીધા વાસ્તુશિલ્પીય વિશિષ્ટતાઓ<br>વ્હોટ્સએપ હેલ્પલાઇન: +૯૧ ૭૭૪૨૦ ૯૦૮૬૬ / +૯૧ ૯૭૮૪૪ ૫૨૯૯૮"
    else:
        c_brand = "STONE TECH ATELIER"
        c_sub = "ARCHITECTURAL NATURAL STONE & CLADDING DIVISION · ESTD 2018"
        c_t1 = "ULTRA-THIN FLEXIBLE NATURAL STONE VENEER"
        c_t2 = "ARCHITECTURAL MASTER COLLECTION"
        c_ed = "EDITION 2026 – 2027 · COMBINED MASTER CATALOGUE (PARTS 1 & 2)"
        c_p1 = "SURFACE: <strong>100% Genuine Natural Stone</strong>"
        c_p2 = "BACKING: <strong>Fiberglass & Polymer Resin</strong>"
        c_p3 = "WEIGHT: <strong>~1.50 kg / m² (Ultra-Light)</strong>"
        c_p4 = "COLLECTIONS: <strong>Slate · Sandstone · Marble · Limestone</strong>"
        c_fl = "<strong>HEADQUARTERS & ATELIER:</strong> Gota, Ahmedabad, Gujarat, India<br><strong>DIRECT EXPORT DISPATCH:</strong> Mundra Port & JNPT Port, India"
        c_fc = "MANUFACTURER DIRECT ARCHITECTURAL SPECIFICATION<br>WHATSAPP CRM: +91 97844 52998 / +91 77420 90866"

    html_parts.append(f"""
<div class="page cover-page">
  <div class="cover-border">
    <div class="cover-inner-border"></div>
    <div class="cover-header">
      <div class="cover-medallion">
        <img src="file://{EMBLEM_PATH}">
      </div>
      <div class="cover-brand">{c_brand}</div>
      <div class="cover-atelier">{c_sub}</div>
      <div class="cover-line"></div>
    </div>

    <div class="cover-title-group">
      <div class="cover-title1">{c_t1}</div>
      <div class="cover-title2">{c_t2}</div>
      <div class="cover-edition">{c_ed}</div>
      <div class="cover-pills">
        <div class="cover-pill">{c_p1}</div>
        <div class="cover-pill">{c_p2}</div>
        <div class="cover-pill">{c_p3}</div>
        <div class="cover-pill">{c_p4}</div>
      </div>
    </div>

    <div class="cover-footer">
      <div class="cover-footer-left">{c_fl}</div>
      <div class="cover-footer-center">{c_fc}</div>
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
    if lang == "hi":
        ab_div = "पदार्थ विज्ञान एवं वास्तुशिल्पीय इंजीनियरिंग"
        ab_t1 = "अत्यंत पतली स्टोन विनियर क्या है?"
        ab_p1 = "स्टोन टेक लचीली स्टोन विनियर एक क्रांतिकारी वास्तुशिल्पीय सामग्री है जो असली १००% प्राकृतिक स्प्लिट-स्टोन की ऊपरी परत (स्लेट, क्वार्टजाइट, सैंडस्टोन या मार्बल) को उच्च-तन्यता वाले फाइबरग्लास जाल और थर्मोसेटिंग पॉलीएस्टर रेजिन के साथ स्थायी रूप से जोड़कर बनाई जाती है।"
        ab_p2 = "जर्मन हाई-प्रिसिजन पील तकनीक द्वारा असली भूगर्भीय ब्लॉकों से १.५ मिमी से २.० मिमी की सूक्ष्म परतें निकाली जाती हैं, जो पत्थर की प्राकृतिक बनावट, चमक और बनावटी सौंदर्य को पूरी तरह सुरक्षित रखते हुए पारंपरिक स्लैब की तुलना में भार में ९७% से अधिक कमी लाती हैं।"
        ab_l1 = "<strong>असली प्राकृतिक पत्थर:</strong> कोई कृत्रिम प्रिंटिंग या कास्टिंग नहीं। प्रत्येक शीट अनूठी प्राकृतिक भूगर्भीय कलाकृति है।"
        ab_l2 = "<strong>एयरोस्पेस सबस्ट्रेट:</strong> उच्च-प्रदर्शन बुना हुआ फाइबरग्लास कपड़ा असाधारण तन्यता शक्ति और आयामी स्थिरता सुनिश्चित करता है।"
        ab_l3 = "<strong>अत्यधिक तापमान सहनशीलता:</strong> -४०°C से +९०°C तक बिना किसी मुड़ाव या परत उखड़े परीक्षित एवं प्रमाणित।"
        ab_t2 = "वास्तुशिल्पीय लाभ एवं विशेषताएं"
        ab_a1 = "<strong>अत्यंत हल्की (~१.५ किग्रा/वर्गमीटर):</strong> भारी स्ट्रक्चरल मेसनरी फ्रेमिंग और क्रेन की आवश्यकता समाप्त। गगनचुंबी इमारतों और लिफ्ट केबिनों के लिए सर्वथा उपयुक्त।"
        ab_a2 = "<strong>कोल्ड बेंड लचीलापन:</strong> घुमावदार दीवारों, गोल खंभों, स्तंभों और मेहराबों पर २० सेमी त्रिज्या तक आसानी से मोड़ा जा सकता है।"
        ab_a3 = "<strong>सतत फ्लोर-टू-सीलिंग स्लैब:</strong> १२२० × ३०५० मिमी (४×१० फीट) तक के मानक प्रारूप बिना किसी क्षैतिज ग्राउट जोड़ के निर्बाध पैनलिंग प्रदान करते हैं।"
        ab_a4 = "<strong>सार्वभौमिक बॉन्डिंग:</strong> प्लाईवुड, एमडीएफ, ड्राईवॉल, कंक्रीट, सीमेंट बोर्ड और मेटल फ्रेम पर पॉलीयूरेथेन (PU) या MS पॉलीमर से सीधा चिपकाव।"
        ab_a5 = "<strong>जल एवं मौसम प्रतिरोधी:</strong> गीले इनडोर स्थानों, एग्जीक्यूटिव शावर, बाहरी वेंटिलेटेड फसाड और रीटेल शोरूम के लिए पूर्णतः अनुकूल।"
        ab_hdr = f"वास्तुशिल्पीय विनिर्देश गाइड · <strong>पेज {to_indic('02', lang)} / {to_indic(total_pages, lang)}</strong>"
        foot_mid = "एक्सपीरियंस सेंटर: गोता, अहमदाबाद · बंदरगाह डिस्पैच: मुंद्रा एवं जेएनपीटी"
    elif lang == "gu":
        ab_div = "મટીરીયલ સાયન્સ અને વાસ્તુશિલ્પીય એન્જિનિયરિંગ"
        ab_t1 = "અત્યંત પાતળી સ્ટોન વિનિયર શું છે?"
        ab_p1 = "સ્ટોન ટેક લચીલી સ્ટોન વિનિયર એ એક ક્રાંતિકારી વાસ્તુશિલ્પીય સામગ્રી છે જે અસલી ૧૦૦% કુદરતી સ્પ્લિટ-સ્ટોનની ટોચની સપાટી (સ્લેટ, ક્વાર્ટઝાઇટ, સેન્ડસ્ટોન અથવા માર્બલ) ને ઉચ્ચ-તન્યતા ફાઇબરગ્લાસ જાળી અને થર્મોસેટિંગ પોલિએસ્ટર રેઝિન સાથે કાયમ માટે જોડીને બનાવવામાં આવે છે."
        ab_p2 = "જર્મન હાઇ-પ્રિસિઝન પીલ પદ્ધતિ દ્વારા અસલી કુદરતી બ્લોક્સમાંથી ૧.૫ મીમી થી ૨.૦ મીમીના અતિ-પાતળા સ્તરો કાઢવામાં આવે છે, જે પથ્થરની કુદરતી રચના, ચમક અને સુંદરતાને સંપૂર્ણપણે સાચવી રાખે છે અને વજનમાં ૯૭% થી વધુ ઘટાડો કરે છે."
        ab_l1 = "<strong>અસલી કુદરતી પથ્થર:</strong> કોઈ આર્ટિફિશિયલ પ્રિન્ટિંગ કે કાસ્ટિંગ નથી. દરેક શીટ કુદરતની અજોડ કલાકૃતિ છે."
        ab_l2 = "<strong>એરોસ્પેસ સબસ્ટ્રેટ:</strong> ઉચ્ચ-ગુણવત્તાવાળું વણેલું ફાઇબરગ્લાસ કાપડ મજબૂત તન્યતા શક્તિ અને સ્થિરતા આપે છે."
        ab_l3 = "<strong>તીવ્ર તાપમાન સહનશીલતા:</strong> -૪૦°C થી +૯૦°C સુધી કોઈપણ વળાંક કે ઉખડ્યા વિના પ્રમાણિત."
        ab_t2 = "વાસ્તુશિલ્પીય ફાયદા અને ક્ષમતાઓ"
        ab_a1 = "<strong>અત્યંત હલકી (~૧.૫ કિગ્રા/ચોરસ મીટર):</strong> ભારે સ્ટ્રક્ચરલ ફ્રેમિંગ અને ક્રેઇનની જરૂરિયાત પૂરી. ઊંચી ઇમારતો અને લિફ્ટ કેબિન માટે ઉત્તમ."
        ab_a2 = "<strong>કોલ્ડ બેન્ડ લવચીકતા:</strong> ગોળાકાર થાંભલાઓ, વળાંકવાળી દીવાલો અને કમાનો પર ૨૦ સેમી સુધી સરળતાથી વાળી શકાય છે."
        ab_a3 = "<strong>સળંગ ફ્લોર-ટુ-સીલિંગ સ્લેબ:</strong> ૧૨૨૦ × ૩૦૫૦ મીમી (૪×૧૦ ફૂટ) સુધીના સ્લેબ કોઈપણ આડા સાંધા વગર સળંગ ફિનિશ આપે છે."
        ab_a4 = "<strong>સાર્વત્રિક જોડાણ:</strong> પ્લાયવૂડ, MDF, ડ્રાયવોલ, કોંક્રિટ, સિમેન્ટ બોર્ડ અને મેટલ ફ્રેમ પર PU અથવા MS પોલિમરથી સીધું ચોંટાડી શકાય છે."
        ab_a5 = "<strong>પાણી અને વાતાવરણ પ્રતિરોધક:</strong> બાથરૂમ, શાવર, બહારના વેટિલેટેડ ફેસાડ અને શોરૂમ માટે સંપૂર્ણ સુસંગત."
        ab_hdr = f"વાસ્તુશિલ્પીય સ્પેસિફિકેશન ગાઇડ · <strong>પેજ {to_indic('02', lang)} / {to_indic(total_pages, lang)}</strong>"
        foot_mid = "એક્સપિરિયન્સ સેન્ટર: ગોતા, અમદાવાદ · પોર્ટ ડિસ્પેચ: મુંદ્રા અને JNPT"
    else:
        ab_div = "MATERIAL SCIENCE & ARCHITECTURAL ENGINEERING"
        ab_t1 = "WHAT IS ULTRA-THIN STONE VENEER?"
        ab_p1 = "Stone Tech Flexible Stone Veneer is a revolutionary architectural material composed of a genuine 100% natural split-stone top face (slate, quartzite, sandstone, or marble) permanently bonded to a high-tensile fiberglass mesh impregnated with thermosetting polyester resin."
        ab_p2 = "Through high-precision German peel-layer technology, micro-thin layers measuring between 1.5 mm to 2.0 mm are harvested directly from genuine geological blocks, preserving the organic clefts, crystalline veins, and tactile authenticity of traditional stone while reducing dead load by over 97%."
        ab_l1 = "<strong>Real Natural Stone:</strong> Zero artificial printing or cast recreations. Every sheet is unique geological art."
        ab_l2 = "<strong>Aerospace Substrate:</strong> High-performance woven fiberglass fabric ensures incredible tensile strength and dimensional stability."
        ab_l3 = "<strong>Extreme Thermal Range:</strong> Tested and certified from -40°C to +90°C without warping or delamination."
        ab_t2 = "ARCHITECTURAL ADVANTAGES & CAPABILITIES"
        ab_a1 = "<strong>Ultra-Lightweight (~1.5 kg/m²):</strong> Eliminates heavy structural masonry framing, crane hoisting, and floor load reinforcement. Ideal for high-rise towers and elevator cabins."
        ab_a2 = "<strong>Cold Bend Flexibility:</strong> Conforms smoothly to curved architectural walls, round pillars, convex columns, and arches with bend radii down to 20 cm."
        ab_a3 = "<strong>Continuous Floor-to-Ceiling Slabs:</strong> Standard formats up to 1220 × 3050 mm (4×10 ft) allow seamless vertical panels without visible horizontal grout lines."
        ab_a4 = "<strong>Universal Substrate Bonding:</strong> Direct adhesion onto plywood, MDF, drywall, concrete, cement board, and metal frames with polyurethane (PU) or MS polymer adhesives."
        ab_a5 = "<strong>Water & Weather Resilient:</strong> Suitable for wet interior spaces, executive shower enclosures, exterior ventilated facades, and retail portals."
        ab_hdr = f"ARCHITECTURAL SPECIFICATION GUIDE · <strong>PAGE 02 OF {total_pages}</strong>"
        foot_mid = "EXPERIENCE CENTER: GOTA, AHMEDABAD · SEAPORT DISPATCH: MUNDRA & JNPT"

    if lang == "hi":
        foot_brand = f"{c_brand} · वास्तुशिल्पीय पाषाण विनिर्माण"
        foot_contact = "WWW.STONETECH.IN · +९१ ९७८४४ ५२९९८ / +९१ ७७४२० ९०८६६"
    elif lang == "gu":
        foot_brand = f"{c_brand} · વાસ્તુશિલ્પીય પાષાણ વિનિર્માણ"
        foot_contact = "WWW.STONETECH.IN · +૯૧ ૭૭૪૨૦ ૯૦૮૬૬ / +૯૧ ૯૭૮૪૪ ૫૨૯૯૮"
    else:
        foot_brand = f"{c_brand} · ARCHITECTURAL STONE FABRICATION"
        foot_contact = "WWW.STONETECH.IN · +91 97844 52998 / +91 77420 90866"

    html_parts.append(f"""
<div class="page about-page">
  <div class="prod-header">
    <div class="prod-header-left">
      <img src="file://{EMBLEM_PATH}" class="prod-emblem">
      <div class="prod-brand-lockup">
        <div class="prod-brand-name">{c_brand}</div>
        <div class="prod-division-tag">{ab_div}</div>
      </div>
    </div>
    <div class="prod-header-right">{ab_hdr}</div>
  </div>

  <div class="about-grid">
    <div class="about-card">
      <div class="about-card-title">{ab_t1}</div>
      <div class="about-text">{ab_p1}</div>
      <div class="about-text">{ab_p2}</div>
      <ul class="about-feat-list">
        <li class="about-feat-item"><span class="about-feat-bullet">◆</span> {ab_l1}</li>
        <li class="about-feat-item"><span class="about-feat-bullet">◆</span> {ab_l2}</li>
        <li class="about-feat-item"><span class="about-feat-bullet">◆</span> {ab_l3}</li>
      </ul>
    </div>

    <div class="about-card">
      <div class="about-card-title">{ab_t2}</div>
      <ul class="about-feat-list">
        <li class="about-feat-item"><span class="about-feat-bullet">◆</span> {ab_a1}</li>
        <li class="about-feat-item"><span class="about-feat-bullet">◆</span> {ab_a2}</li>
        <li class="about-feat-item"><span class="about-feat-bullet">◆</span> {ab_a3}</li>
        <li class="about-feat-item"><span class="about-feat-bullet">◆</span> {ab_a4}</li>
        <li class="about-feat-item"><span class="about-feat-bullet">◆</span> {ab_a5}</li>
      </ul>
    </div>
  </div>

  <div class="prod-footer">
    <div>{foot_brand}</div>
    <div class="prod-footer-center">{foot_mid}</div>
    <div>{foot_contact}</div>
  </div>
</div>
""")
    curr_page += 1

    # 4 SECTIONS / COLLECTIONS
    sections_meta = [
        {
            "num": "01",
            "count": 51,
            "render": "render_slate.jpg",
            "en_title": "SLATE STONE VENEER PATTERNS",
            "hi_title": "स्लेट स्टोन विनियर पैटर्न्स",
            "gu_title": "સ્લેટ સ્ટોન વિનિયર પેટર્ન",
            "en_desc": "Natural cleft textures, organic mica sheen, and rich earthy depth across 51 unique architectural patterns.",
            "hi_desc": "प्राकृतिक क्लेफ्ट टेक्सचर्स, मखमली चमक और ५१ अनूठे वास्तुशिल्पीय पैटर्न्स में समृद्ध प्राकृतिक गहराई।",
            "gu_desc": "કુદરતી ટેક્સચર, મનોહર ચમક અને ૫૧ અનોખી વાસ્તુશિલ્પીય પેટર્નમાં કુદરતી ભવ્યતા.",
            "code_range": "ST-SV-001 TO ST-SV-051",
            "code_range_hi": "ST-SV-001 से ST-SV-051",
            "code_range_gu": "ST-SV-001 થી ST-SV-051",
            "prods": PRODUCTS[0:51],
            "start_idx": 0,
        },
        {
            "num": "02",
            "count": 8,
            "render": "render_sandstone.jpg",
            "en_title": "SANDSTONE VENEER PATTERNS",
            "hi_title": "सैंडस्टोन विनियर पैटर्न्स",
            "gu_title": "સેન્ડસ્ટોન વિનિયર પેટર્ન",
            "en_desc": "Warm granular striations, desert warmth, and tactile sedimentary grain across 8 master patterns.",
            "hi_desc": "रेतीली गर्माहट, मखमली बनावट और ८ मास्टर पैटर्न्स में प्राकृतिक अवसादी परतें।",
            "gu_desc": "રેતાળ હૂંફ, નરમ સ્પર્શ અને ૮ માસ્ટર પેટર્નમાં કુદરતી રચના.",
            "code_range": "ST-SV-052 TO ST-SV-059",
            "code_range_hi": "ST-SV-052 से ST-SV-059",
            "code_range_gu": "ST-SV-052 થી ST-SV-059",
            "prods": PRODUCTS[51:59],
            "start_idx": 51,
        },
        {
            "num": "03",
            "count": 36,
            "render": "render_marble.jpg",
            "en_title": "MARBLE STONE VENEER PATTERNS",
            "hi_title": "मार्बल स्टोन विनियर पैटर्न्स",
            "gu_title": "માર્બલ સ્ટોન વિનિયર પેટર્ન",
            "en_desc": "Dramatic veining, crystalline depth, and refined polish across 36 prestigious natural marble selections.",
            "hi_desc": "शानदार शिराएं, पॉलिश फिनिश और ३६ शानदार पैटर्न्स में लक्जरी मार्बल सौंदर्य।",
            "gu_desc": "આકર્ષક નસો, લક્ઝરી ફિનિશ અને ૩૬ સુંદર પેટર્નમાં ભવ્ય માર્બલ સુંદરતા.",
            "code_range": "ST-SV-060 TO ST-SV-095",
            "code_range_hi": "ST-SV-060 से ST-SV-095",
            "code_range_gu": "ST-SV-060 થી ST-SV-095",
            "prods": PRODUCTS[59:95],
            "start_idx": 59,
        },
        {
            "num": "04",
            "count": 3,
            "render": "render_limestone.jpg",
            "en_title": "LIMESTONE VENEER PATTERNS",
            "hi_title": "लाइमस्टोन विनियर पैटर्न्स",
            "gu_title": "લાઇમસ્ટોન વિનિયર પેટર્ન",
            "en_desc": "Subtle bioclast textures, serene monochromatic earthen tones, and organic fossil depth across 3 patterns.",
            "hi_desc": "शांत भूगर्भीय टोन, सूक्ष्म खनिज क्रिस्टल और ३ प्राकृतिक मोनोक्रोमैटिक पैटर्न्स।",
            "gu_desc": "શાંત ભૂગર્ભીય ટોન, સૂક્ષ્મ સ્ફટિકો અને ૩ કુદરતી મોનોક્રોમેટિક પેટર્ન.",
            "code_range": "ST-SV-096 TO ST-SV-098",
            "code_range_hi": "ST-SV-096 से ST-SV-098",
            "code_range_gu": "ST-SV-096 થી ST-SV-098",
            "prods": PRODUCTS[95:98],
            "start_idx": 95,
        },
    ]

    for sec in sections_meta:
        # Divider Page
        render_path = os.path.join(ASSET_DIR, sec["render"])
        if lang == "hi":
            d_tag = f"संग्रह {to_indic(sec['num'], lang)} · {to_indic(sec['count'], lang)} वास्तुशिल्पीय पैटर्न्स"
            d_title = sec["hi_title"]
            d_desc = sec["hi_desc"]
            d_meta = f"फॉर्मेट: <strong>१२२०×२४४० · १२२०×२८०० · १२२०×३०५० मिमी</strong><br>मोटाई: <strong>१.५ – २.० मिमी (अत्यंत पतली लचीली)</strong><br>कोड श्रृंखला: <strong>{sec['code_range_hi']}</strong>"
        elif lang == "gu":
            d_tag = f"સંગ્રહ {to_indic(sec['num'], lang)} · {to_indic(sec['count'], lang)} વાસ્તુશિલ્પીય પેટર્ન"
            d_title = sec["gu_title"]
            d_desc = sec["gu_desc"]
            d_meta = f"સાઇઝ: <strong>૧૨૨૦×૨૪૪૦ · ૧૨૨૦×૨૮૦૦ · ૧૨૨૦×૩૦૫૦ મીમી</strong><br>જાડાઈ: <strong>૧.૫ – ૨.૦ મીમી (અત્યંત પાતળી લચીલી)</strong><br>કોડ શ્રેણી: <strong>{sec['code_range_gu']}</strong>"
        else:
            d_tag = f"COLLECTION {sec['num']} · {sec['count']} ARCHITECTURAL PATTERNS"
            d_title = sec["en_title"]
            d_desc = sec["en_desc"]
            d_meta = f"FORMATS: <strong>1220×2440 · 1220×2800 · 1220×3050 mm</strong><br>THICKNESS: <strong>1.5 – 2.0 mm (Ultra-Thin Flexible)</strong><br>CODE SERIES: <strong>{sec['code_range']}</strong>"

        html_parts.append(f"""
<div class="page divider-page">
  <div class="divider-render-frame">
    <img src="file://{render_path}" class="divider-render-img">
  </div>
  <div class="divider-banner">
    <div>
      <div class="divider-tag">{d_tag}</div>
      <div class="divider-title">{d_title}</div>
      <div class="divider-desc">{d_desc}</div>
    </div>
    <div class="divider-meta">{d_meta}</div>
  </div>
</div>
""")
        curr_page += 1

        # Product Pages
        for idx, p in enumerate(sec["prods"]):
            global_idx = sec["start_idx"] + idx
            code_str = f"ST-SV-{global_idx+1:03d}"
            asset_file = os.path.join(ASSET_DIR, f"slab_{global_idx+1:03d}_{p['src']}")
            p_title = get_product_title(p, lang)
            p_badge = SECTIONS_TRANSLATION.get(p["sec"], {}).get(lang, p["sec"])

            if lang == "hi":
                p_div_tag = "अत्यंत पतली प्राकृतिक स्टोन विनियर"
                p_direct = "प्रत्यक्ष फैक्टरी पूछताछ: <strong>+९१ ९७८४४ ५२९९८ / +९१ ७७४२० ९०८६६</strong> · WWW.STONETECH.IN"
                p_code_lbl = f"आइटम कोड: {code_str}"
                s_dim = f"मानक आयाम: <strong>{localize_sizes(p['sizes'], lang)}</strong>"
                s_wt = "शीट का वजन: <strong>~१.५० किग्रा / वर्गमीटर (~४.५ किग्रा / शीट)</strong>"
                s_thk = "कुल मोटाई: <strong>१.५ – २.० मिमी (अत्यंत पतली लचीली)</strong>"
                s_use = "मुख्य उपयोग: <strong>घुमावदार दीवारें, फसाड, फर्नीचर, दरवाजे</strong>"
                s_sub = "आधार संरचना: <strong>फाइबरग्लास एवं थर्मोसेटिंग रेजिन</strong>"
                s_adh = "चिपकाने की विधि: <strong>पॉलीयूरेथेन (PU) / MS पॉलीमर डायरेक्ट बॉन्ड</strong>"
                p_pg = f"पेज {to_indic(f'{curr_page:02d}', lang)} / {to_indic(total_pages, lang)}"
            elif lang == "gu":
                p_div_tag = "અત્યંત પાતળી કુદરતી સ્ટોન વિનિયર"
                p_direct = "સીધી ફેક્ટરી પૂછપરછ: <strong>+૯૧ ૭૭૪૨૦ ૯૦૮૬૬ / +૯૧ ૯૭૮૪૪ ૫૨૯૯૮</strong> · WWW.STONETECH.IN"
                p_code_lbl = f"આઇટમ કોડ: {code_str}"
                s_dim = f"પ્રમાણભૂત પરિમાણો: <strong>{localize_sizes(p['sizes'], lang)}</strong>"
                s_wt = "શીટનું વજન: <strong>~૧.૫૦ કિગ્રા / ચોરસ મીટર (~૪.૫ કિગ્રા / શીટ)</strong>"
                s_thk = "કુલ જાડાઈ: <strong>૧.૫ – ૨.૦ મીમી (અત્યંત પાતળી લચીલી)</strong>"
                s_use = "મુખ્ય ઉપયોગો: <strong>વળાંકવાળી દીવાલો, ફેસાડ, ફર્નિચર, દરવાજા</strong>"
                s_sub = "આધાર સામગ્રી: <strong>ફાઇબરગ્લાસ અને થર્મોસેટિંગ રેઝિન</strong>"
                s_adh = "ચોંટાડવાની રીત: <strong>પોલીયુરેથીન (PU) / MS પોલિમર ડાયરેક્ટ બોન્ડ</strong>"
                p_pg = f"પેજ {to_indic(f'{curr_page:02d}', lang)} / {to_indic(total_pages, lang)}"
            else:
                p_div_tag = "ULTRA-THIN NATURAL STONE VENEER"
                p_direct = "DIRECT FACTORY ENQUIRIES: <strong>+91 97844 52998 / +91 77420 90866</strong> · WWW.STONETECH.IN"
                p_code_lbl = f"ITEM CODE: {code_str}"
                s_dim = f"Standard Dimensions: <strong>{p['sizes']}</strong>"
                s_wt = "Sheet Weight: <strong>~1.50 kg / m² (~4.5 kg / sheet)</strong>"
                s_thk = "Total Thickness: <strong>1.5 – 2.0 mm (Ultra-Thin Flexible)</strong>"
                s_use = "Primary Uses: <strong>Curved Walls, Facades, Furniture, Doors</strong>"
                s_sub = "Substrate Backing: <strong>Fiberglass & Thermosetting Resin</strong>"
                s_adh = "Adhesion Method: <strong>PU / MS Polymer Direct Bond</strong>"
                p_pg = f"PAGE {curr_page:02d} OF {total_pages}"

            foot_brand = f"{c_brand} · वास्तुशिल्पीय पाषाण विनिर्माण" if lang == "hi" else (f"{c_brand} · વાસ્તુશિલ્પીય પાષાણ વિનિર્માણ" if lang == "gu" else f"{c_brand} · ARCHITECTURAL STONE FABRICATION")

            html_parts.append(f"""
<div class="page product-page">
  <div class="prod-header">
    <div class="prod-header-left">
      <img src="file://{EMBLEM_PATH}" class="prod-emblem">
      <div class="prod-brand-lockup">
        <div class="prod-brand-name">{c_brand}</div>
        <div class="prod-division-tag">{p_div_tag}</div>
      </div>
    </div>
    <div class="prod-header-right">{p_direct}</div>
  </div>

  <div class="prod-slab-stage">
    <div class="prod-slab-card">
      <img src="file://{asset_file}" class="prod-slab-img">
    </div>
  </div>

  <div class="prod-info-panel">
    <div class="prod-info-left">
      <div class="prod-family-badge">{p_badge}</div>
      <div class="prod-name-title">{p_title}</div>
      <div class="prod-code-line">{p_code_lbl}</div>
    </div>
    <div class="prod-info-right">
      <div class="prod-spec-item">{s_dim}</div>
      <div class="prod-spec-item">{s_wt}</div>
      <div class="prod-spec-item">{s_thk}</div>
      <div class="prod-spec-item">{s_use}</div>
      <div class="prod-spec-item">{s_sub}</div>
      <div class="prod-spec-item">{s_adh}</div>
    </div>
  </div>

  <div class="prod-footer">
    <div>{foot_brand}</div>
    <div class="prod-footer-center">{foot_mid}</div>
    <div>{p_pg}</div>
  </div>
</div>
""")
            curr_page += 1

    # ARCHITECTURAL PORTFOLIO & INSTALLATION GUIDE (Page 105)
    render_portfolio = os.path.join(ASSET_DIR, "render_portfolio.jpg")
    if lang == "hi":
        inst_div = "स्थापना प्रोटोकॉल एवं फील्ड गाइड"
        inst_hdr = f"वास्तुशिल्पीय विनिर्देश गाइड · <strong>पेज {to_indic('105', lang)} / {to_indic(total_pages, lang)}</strong>"
        inst_box_title = "वास्तुशिल्पीय स्थापना पद्धति"
        inst_s1 = "<strong>१. सबस्ट्रेट निरीक्षण:</strong> सुनिश्चित करें कि सतह (प्लाईवुड, ड्राईवॉल, सीमेंट बोर्ड अथवा प्लास्टर) संरचनात्मक रूप से मजबूत, समतल, सूखी और धूल-मुक्त है।"
        inst_s2 = "<strong>२. सटीक कटिंग:</strong> डायमंड ब्लेड सर्कुलर सॉ अथवा महीन दांतों वाली जिगसॉ से शीट को सटीक माप में काटें। वक्राकार कटिंग हेतु हेवी-ड्यूटी शीयर्स का उपयोग करें।"
        inst_s3 = "<strong>३. एडहेसिव अनुप्रयोग:</strong> ३ मिमी V-नॉच ट्रोवेल द्वारा शीट के पिछले हिस्से पर नमी-रोधी पॉलीयूरेथेन (PU) अथवा MS पॉलीमर चिपकने वाला पदार्थ समान रूप से लगाएं।"
        inst_s4 = "<strong>४. प्लेसमेंट एवं एयर निष्कासन:</strong> शीट को दीवार पर मजबूती से रखें। रबर रोलर से केंद्र से बाहर की ओर समान दबाव देते हुए फंसी हुई हवा निकालें ताकि पूर्ण जुड़ाव हो।"
        inst_s5 = "<strong>५. सुरक्षात्मक सीलिंग:</strong> २४ घंटे के बाद, नमी, दाग और मौसम से सुरक्षा हेतु स्टोन टेक डीप-पेनेट्रेटिंग नेचुरल स्टोन सीलर का प्रयोग करें।"
    elif lang == "gu":
        inst_div = "સ્થાપન પ્રોટોકોલ અને ફિલ્ડ માર્ગદર્શિકા"
        inst_hdr = f"વાસ્તુશિલ્પીય વિનિર્દેશ માર્ગદર્શિકા · <strong>પેજ {to_indic('105', lang)} / {to_indic(total_pages, lang)}</strong>"
        inst_box_title = "વાસ્તુશિલ્પીય સ્થાપન પદ્ધતિ"
        inst_s1 = "<strong>૧. સપાટીની ચકાસણી:</strong> ખાતરી કરો કે લગાવવાની સપાટી (પ્લાયવૂડ, ડ્રાયવોલ, સિમેન્ટ બોર્ડ કે પ્લાસ્ટર) મજબૂત, સપાટ, સૂકી અને ધૂળ-મુક્ત છે."
        inst_s2 = "<strong>૨. ચોક્કસ માપ અને કટિંગ:</strong> ડાયમંડ બ્લેડ સર્ક્યુલર સો અથવા ઝીણા દાંતાવાળી જીગ્સો વડે શીટને માપ મુજબ કાપો. વળાંકવાળા કટિંગ માટે હેવી-ડ્યુટી શિયર્સ વાપરો."
        inst_s3 = "<strong>૩. એડહેસિવ લગાવવું:</strong> ૩ મીમી V-નોચ ટ્રોવેલ વડે શીટની પાછળ વોટરપ્રૂફ પોલીયુરેથીન (PU) અથવા MS પોલિમર ગુંદર સમાનરૂપે લગાવો."
        inst_s4 = "<strong>૪. ગોઠવણી અને હવા કાઢવી:</strong> શીટને દીવાલ પર બરાબર મૂકો. રબર રોલર વડે કેન્દ્રથી બહાર તરફ દબાવીને અંદરની હવા બહાર કાઢી મજબૂત બોન્ડિંગ કરો."
        inst_s5 = "<strong>૫. રક્ષણાત્મક સીલિંગ:</strong> ૨૪ કલાક પછી, ભેજ અને ડાઘ સામે રક્ષણ મેળવવા સ્ટોન ટેક ડીપ-પેનેટ્રેટિંગ નેચરલ સ્ટોન સીલર લગાવો."
    else:
        inst_div = "INSTALLATION PROTOCOL & FIELD GUIDE"
        inst_hdr = f"ARCHITECTURAL SPECIFICATION GUIDE · <strong>PAGE 105 OF {total_pages}</strong>"
        inst_box_title = "ARCHITECTURAL INSTALLATION METHODOLOGY"
        inst_s1 = "<strong>1. Substrate Inspection:</strong> Ensure the mounting surface (drywall, exterior plywood, fiber cement board, or plaster) is structurally sound, level, dry, and dust-free."
        inst_s2 = "<strong>2. Precision Sizing:</strong> Measure and score the sheet from either face using a circular saw equipped with a continuous-rim diamond blade or fine-toothed jigsaw. Handheld heavy-duty shears may be used for curved trimming."
        inst_s3 = "<strong>3. Adhesive Application:</strong> Apply a high-grab, moisture-curing polyurethane (PU) or MS Polymer hybrid adhesive across the backing using a 3 mm V-notched trowel for 100% coverage."
        inst_s4 = "<strong>4. Placement & Air Evacuation:</strong> Position the sheet firmly against the wall. Using a hand-held rubber laminate roller, press evenly from the center outwards to expel trapped air and ensure complete mechanical bonding."
        inst_s5 = "<strong>5. Protective Impregnation:</strong> Once cured (24 hours), apply Stone Tech Deep-Penetrating Natural Stone Sealer to protect against moisture, oils, and environmental weathering."

    html_parts.append(f"""
<div class="page about-page">
  <div class="prod-header">
    <div class="prod-header-left">
      <img src="file://{EMBLEM_PATH}" class="prod-emblem">
      <div class="prod-brand-lockup">
        <div class="prod-brand-name">{c_brand}</div>
        <div class="prod-division-tag">{inst_div}</div>
      </div>
    </div>
    <div class="prod-header-right">{inst_hdr}</div>
  </div>

  <div style="display: flex; gap: 6mm; margin-top: 3.5mm; flex: 1;">
    <div style="flex: 1.1; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 2mm; overflow: hidden; display: flex; flex-direction: column;">
      <div style="padding: 3mm 4mm; background: #0f172a; color: #fbbf24; font-size: 8.5pt; font-weight: 800; letter-spacing: 1px;">{inst_box_title}</div>
      <div style="padding: 4mm 5mm; font-size: 7.5pt; line-height: 1.5; color: #334155;">
        <p style="margin-bottom: 2.5mm;">{inst_s1}</p>
        <p style="margin-bottom: 2.5mm;">{inst_s2}</p>
        <p style="margin-bottom: 2.5mm;">{inst_s3}</p>
        <p style="margin-bottom: 2.5mm;">{inst_s4}</p>
        <p>{inst_s5}</p>
      </div>
    </div>

    <div style="flex: 1; border: 1px solid #cbd5e1; border-radius: 2mm; overflow: hidden; display: flex; flex-direction: column;">
      <img src="file://{render_portfolio}" style="width: 100%; height: 100%; object-fit: cover;">
    </div>
  </div>

  <div class="prod-footer">
    <div>{foot_brand}</div>
    <div class="prod-footer-center">{foot_mid}</div>
    <div>{foot_contact}</div>
  </div>
</div>
""")
    curr_page += 1

    # COMPREHENSIVE ENGINEERING SPECIFICATIONS & BACK COVER (Page 106)
    if lang == "hi":
        m_t1 = "तकनीकी इंजीनियरिंग मास्टर विनिर्देश"
        m_t2 = "भौतिक, यांत्रिक एवं रासायनिक प्रदर्शन मैट्रिक्स"
        m_th1 = "इंजीनियरिंग पैरामीटर"
        m_th2 = "विनिर्दिष्ट मान / सीमा"
        m_th3 = "परीक्षण विधि / वास्तुशिल्पीय प्रभाव"
        m_std = "मानक: <strong>ASTM / EN १२०५७ प्रमाणित</strong><br>सत्यापित: <strong>संस्करण २०२६ – २०२७</strong>"
        m_r1 = ("कुल कंपोजिट मोटाई", "१.५० मिमी से २.०० मिमी (±०.२ मिमी टॉलरेंस)", "डायरेक्ट पील लेयर + फाइबरग्लास प्रबलित आधार")
        m_r2 = ("द्रव्यमान / घनत्व", "१.४५ से १.६५ किग्रा / वर्गमीटर (~४.५ किग्रा प्रति शीट)", "२० मिमी ग्रेनाइट की तुलना में ९७% कम भार")
        m_r3 = ("मानक उत्पादन आकार", "१२२०×२४४० मिमी · १२२०×२८०० मिमी · १२२०×३०५० मिमी", "कस्टम कटिंग आकार भी उपलब्ध")
        m_r4 = ("न्यूनतम कोल्ड बेंडिंग त्रिज्या", "~२०० मिमी (सामान्य) / ~५० मिमी (हॉट-एयर थर्मो-बेंड)", "खंभों एवं मेहराबों पर आसान कवरेज")
        m_r5 = ("कार्यशील तापमान स्थिरता", "-४०°C से +९०°C निरंतर सेवा", "शून्य थर्मल विरूपण अथवा दरारें")
        m_r6 = ("अग्नि प्रतिक्रिया वर्गीकरण", "क्लास B1 / यूरोक्लास B-s1, d0 फ्लेम रिटार्डेंट", "स्वयं-शामक पॉलीमर मैट्रिक्स फार्मूलेशन")
        m_r7 = ("नमी अवशोषण क्षमता", "रेजिन बैक पर < ०.२०% जल अवशोषण", "पूर्णतः जल-अभेद्य रेजिन परत")
        m_r8 = ("मानक निर्यात पैकेजिंग", "प्रति ISPM-15 धूमीकृत लकड़ी के क्रेट में ५० शीट्स", "सुरक्षात्मक PE फोम शीट के साथ पैक")
        b_dept = "वास्तुशिल्पीय प्राकृतिक पाषाण एवं अत्यंत पतली विनियर निर्माण डिवीजन"
        b_exp_center = "<strong>एक्सपीरियंस सेंटर:</strong> ई-०२, ग्राउंड फ्लोर, एसजी बिजनेस हब, गोता, अहमदाबाद, गुजरात — ३८००६०, भारत"
        b_direct_desk = "<strong>सीधी फैक्ट्री डेस्क:</strong> +९१ ९७८४४ ५२९९८ / +९१ ७७४२० ९०८६६ · <strong>आधिकारिक वेबसाइट:</strong> www.stonetech.in"
        b_port = "सीधा कंटेनर सीपोर्ट डिस्पैच:<br><strong>मुंद्रा पोर्ट (INMUN) एवं जेएनपीटी पोर्ट (INNSA)</strong>"
        b_wa = "त्वरित व्हाट्सएप सीआरएम कोटेशन एवं पूछताछ:"
        b_foot_phone = "+९१ ९७८४४ ५२९९८ / +९१ ७७४२० ९०८६६"
        b_foot_left = f"{c_brand} · वास्तुशिल्पीय पाषाण निर्माण डिवीजन"
        b_foot_mid = "WWW.STONETECH.IN · सर्वाधिकार सुरक्षित © २०२६"
        b_fin = f"पेज {to_indic('106', lang)} / {to_indic('106', lang)} · अंतिम पृष्ठ"
    elif lang == "gu":
        m_t1 = "ટેકનિકલ એન્જિનિયરિંગ માસ્ટર સ્પેસિફિકેશન"
        m_t2 = "ભૌતિક, યાંત્રિક અને રાસાયણિક પ્રદર્શન મેટ્રિક્સ"
        m_th1 = "એન્જિનિયરિંગ પેરામીટર"
        m_th2 = "નિયત મૂલ્ય / શ્રેણી"
        m_th3 = "પરીક્ષણ પદ્ધતિ / વાસ્તુશિલ્પીય પ્રભાવ"
        m_std = "ધોરણો: <strong>ASTM / EN ૧૨૦૫૭ સુસંગત</strong><br>પ્રમાણિત: <strong>આવૃત્તિ ૨૦૨૬ – ૨૦૨૭</strong>"
        m_r1 = ("કુલ જાડાઈ", "૧.૫૦ મીમી થી ૨.૦૦ મીમી (±૦.૨ મીમી સહિષ્ણુતા)", "ડાયરેક્ટ પીલ સ્તર + ફાઇબરગ્લાસ આધાર")
        m_r2 = ("ચોરસ મીટર દીઠ વજન", "૧.૪૫ થી ૧.૬૫ કિગ્રા / ચો.મી. (~૪.૫ કિગ્રા પ્રતિ શીટ)", "૨૦ મીમી ગ્રેનાઈટ કરતા ૯૭% હળવું")
        m_r3 = ("પ્રમાણભૂત ઉત્પાદન સાઇઝ", "૧૨૨૦×૨૪૪૦ મીમી · ૧૨૨૦×૨૮૦૦ મીમી · ૧૨૨૦×૩૦૫૦ મીમી", "કસ્ટમ કટિંગ સાઇઝ પણ ઉપલબ્ધ")
        m_r4 = ("ન્યૂનતમ કોલ્ડ બેન્ડિંગ ત્રિજ્યા", "~૨૦૦ મીમી (સામાન્ય) / ~૫૦ મીમી (હોટ-એર બેન્ડિંગ)", "થાંભલાઓ અને કમાનો પર સરળ ફિટિંગ")
        m_r5 = ("ઓપરેટિંગ તાપમાન સ્થિરતા", "-૪૦°C થી +૯૦°C સતત ક્ષમતા", "કોઈપણ ક્રેક કે વિકૃતિ વિના")
        m_r6 = ("અગ્નિ પ્રતિક્રિયા વર્ગીકરણ", "ક્લાસ B1 / યુરોક્લાસ B-s1, d0 ફ્લેમ રિટાર્ડન્ટ", "સેલ્ફ-એક્સટિંગ્વિશિંગ પોલિમર રેઝિન")
        m_r7 = ("ભેજ શોષણ ક્ષમતા", "રેઝિન બેકિંગ પર < ૦.૨૦% જળ શોષણ", "સંપૂર્ણપણે અભેદ્ય રેઝિન સ્તર")
        m_r8 = ("પ્રમાણભૂત નિકાસ પેકેજિંગ", "ISPM-15 હીટ-ટ્રીટેડ લાકડાના ક્રેટ દીઠ ૫૦ શીટ્સ", "રક્ષણાત્મક PE ફોમ શીટ સાથે પેક")
        b_dept = "વાસ્તુશિલ્પીય કુદરતી પથ્થર અને અત્યંત પાતળી વિનિયર ઉત્પાદન ડિવિઝન"
        b_exp_center = "<strong>એક્સપિરિયન્સ સેન્ટર:</strong> E-02, ગ્રાઉન્ડ ફ્લોર, SG બિઝનેસ હબ, ગોતા, અમદાવાદ, ગુજરાત — 380060, ભારત"
        b_direct_desk = "<strong>સીધી ફેક્ટરી ડેસ્ક:</strong> +૯૧ ૭૭૪૨૦ ૯૦૮૬૬ / +૯૧ ૯૭૮૪૪ ૫૨૯૯૮ · <strong>સત્તાવાર વેબસાઇટ:</strong> www.stonetech.in"
        b_port = "સીધું કન્ટેનર સીપોર્ટ ડિસ્પેચ:<br><strong>મુંદ્રા પોર્ટ (INMUN) અને JNPT પોર્ટ (INNSA)</strong>"
        b_wa = "ત્વરિત વ્હોટ્સએપ CRM ક્વોટેશન અને પૂછપરછ:"
        b_foot_phone = "+૯૧ ૭૭૪૨૦ ૯૦૮૬૬ / +૯૧ ૯૭૮૪૪ ૫૨૯૯૮"
        b_foot_left = f"{c_brand} · વાસ્તુશિલ્પીય પથ્થર નિર્માણ ડિવિઝન"
        b_foot_mid = "WWW.STONETECH.IN · સર્વાધિકાર સુરક્ષિત © ૨૦૨૬"
        b_fin = f"પેજ {to_indic('106', lang)} / {to_indic('106', lang)} · અંતિમ પૃષ્ઠ"
    else:
        m_t1 = "TECHNICAL ENGINEERING MASTER SPECIFICATION"
        m_t2 = "PHYSICAL, MECHANICAL & CHEMICAL PERFORMANCE MATRIX"
        m_th1 = "ENGINEERING PARAMETER"
        m_th2 = "SPECIFIED VALUE / RANGE"
        m_th3 = "TEST METHOD / ARCHITECTURAL IMPACT"
        m_std = "STANDARDS: <strong>ASTM / EN 12057 COMPLIANT</strong><br>VERIFIED: <strong>EDITION 2026 – 2027</strong>"
        m_r1 = ("Total Composite Thickness", "1.50 mm to 2.00 mm (±0.2 mm tolerance)", "Direct peel layer + fiberglass reinforced backing")
        m_r2 = ("Areal Mass / Density", "1.45 to 1.65 kg / m² (~4.5 kg per 1220×2440 mm sheet)", "97% structural dead-weight reduction vs 20mm granite")
        m_r3 = ("Standard Production Sizes", "1220×2440 mm · 1220×2800 mm · 1220×3050 mm", "Custom cut-to-order architectural panels available")
        m_r4 = ("Minimum Cold Bending Radius", "~200 mm (cold) / down to ~50 mm (hot-air thermo-bend)", "Allows seamless wrapping around columns and barrel arches")
        m_r5 = ("Operating Temperature Stability", "-40°C to +90°C continuous service", "Zero thermal creep, delamination, or cracking")
        m_r6 = ("Fire Reaction Classification", "Class B1 / Euroclass B-s1, d0 flame retardant resin", "Self-extinguishing polymer matrix formulation")
        m_r7 = ("Moisture Absorption Substrate", "< 0.20% water absorption on resin backing", "Completely impervious resin backing layer")
        m_r8 = ("Standard Export Packaging", "50 sheets per fumigated ISPM-15 export wooden crate", "Interleaved with protective PE foam sheets")
        b_dept = "Architectural Natural Stone & Ultra-Thin Veneer Manufacturing Division"
        b_exp_center = "<strong>Experience Center:</strong> E-02, Ground Floor, SG Business Hub, Gota, Ahmedabad, Gujarat — 380060, India"
        b_direct_desk = "<strong>Direct Factory Desk:</strong> +91 97844 52998 / +91 77420 90866 · <strong>Official Portal:</strong> www.stonetech.in"
        b_port = "DIRECT CONTAINER SEAPORT DISPATCH:<br><strong>Mundra Port (INMUN) & JNPT Port (INNSA)</strong>"
        b_wa = "Instant WhatsApp CRM Quotations & Project Inquiries:"
        b_foot_phone = "+91 97844 52998 / +91 77420 90866"
        b_foot_left = f"{c_brand} · ARCHITECTURAL STONE FABRICATION DIVISION"
        b_foot_mid = "WWW.STONETECH.IN · ALL RIGHTS RESERVED © 2026"
        b_fin = "PAGE 106 OF 106 · FINAL PAGE"

    html_parts.append(f"""
<div class="page matrix-page">
  <div class="matrix-header">
    <div>
      <div style="color: #fbbf24; font-size: 8.5pt; font-weight: 800; letter-spacing: 2px;">{m_t1}</div>
      <div style="color: #ffffff; font-size: 15pt; font-weight: 900; margin-top: 1mm;">{m_t2}</div>
    </div>
    <div style="text-align: right; font-size: 7.5pt; color: #94a3b8; line-height: 1.5;">
      {m_std}
    </div>
  </div>

  <table class="matrix-table">
    <thead>
      <tr>
        <th style="width: 28%;">{m_th1}</th>
        <th style="width: 36%;">{m_th2}</th>
        <th style="width: 36%;">{m_th3}</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>{m_r1[0]}</strong></td>
        <td>{m_r1[1]}</td>
        <td>{m_r1[2]}</td>
      </tr>
      <tr>
        <td><strong>{m_r2[0]}</strong></td>
        <td>{m_r2[1]}</td>
        <td>{m_r2[2]}</td>
      </tr>
      <tr>
        <td><strong>{m_r3[0]}</strong></td>
        <td>{m_r3[1]}</td>
        <td>{m_r3[2]}</td>
      </tr>
      <tr>
        <td><strong>{m_r4[0]}</strong></td>
        <td>{m_r4[1]}</td>
        <td>{m_r4[2]}</td>
      </tr>
      <tr>
        <td><strong>{m_r5[0]}</strong></td>
        <td>{m_r5[1]}</td>
        <td>{m_r5[2]}</td>
      </tr>
      <tr>
        <td><strong>{m_r6[0]}</strong></td>
        <td>{m_r6[1]}</td>
        <td>{m_r6[2]}</td>
      </tr>
      <tr>
        <td><strong>{m_r7[0]}</strong></td>
        <td>{m_r7[1]}</td>
        <td>{m_r7[2]}</td>
      </tr>
      <tr>
        <td><strong>{m_r8[0]}</strong></td>
        <td>{m_r8[1]}</td>
        <td>{m_r8[2]}</td>
      </tr>
    </tbody>
  </table>

  <div class="back-contact-card">
    <div class="back-contact-left">
      <img src="file://{BADGE_PATH}" class="back-badge-img">
      <div class="back-contact-details">
        <h3>{c_brand}</h3>
        <div>{b_dept}</div>
        <div>{b_exp_center}</div>
        <div>{b_direct_desk}</div>
      </div>
    </div>
    <div class="back-contact-right">
      <div>{b_port}</div>
      <div style="margin-top: 1.5mm;">{b_wa}</div>
      <div style="color: #fbbf24; font-size: 8.5pt; font-weight: 800;">{b_foot_phone}</div>
    </div>
  </div>

  <div style="display: flex; justify-content: space-between; border-top: 1px solid rgba(217, 119, 6, 0.4); padding-top: 2mm; font-size: 6.8pt; color: #94a3b8;">
    <div>{b_foot_left}</div>
    <div>{b_foot_mid}</div>
    <div>{b_fin}</div>
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
    target_lang = sys.argv[1] if len(sys.argv) > 1 else "all"
    langs = ["en", "hi", "gu"] if target_lang == "all" else [target_lang]

    for l in langs:
        print(f"\n=======================================================")
        print(f"GENERATING STONE VENEER CATALOGUE: {l.upper()}")
        print(f"=======================================================")
        html = build_html_for_lang(l)
        if l == "en":
            out_pdf = os.path.join(CATALOG_DIR, "StoneTech_Stone_Veneer_Catalogue_2026.pdf")
            compile_pdf(html, out_pdf)
            en_alias = os.path.join(CATALOG_DIR, "StoneTech_Stone_Veneer_Catalogue_English.pdf")
            shutil.copyfile(out_pdf, en_alias)
            print(f"Mirrored English PDF to {en_alias}")
        elif l == "hi":
            out_pdf = os.path.join(CATALOG_DIR, "StoneTech_Stone_Veneer_Catalogue_Hindi.pdf")
            compile_pdf(html, out_pdf)
        elif l == "gu":
            out_pdf = os.path.join(CATALOG_DIR, "StoneTech_Stone_Veneer_Catalogue_Gujarati.pdf")
            compile_pdf(html, out_pdf)

        dl_dir = os.path.expanduser("~/Downloads")
        if os.path.exists(dl_dir):
            base_fname = os.path.basename(out_pdf)
            shutil.copyfile(out_pdf, os.path.join(dl_dir, base_fname))
            if l == "en":
                shutil.copyfile(out_pdf, os.path.join(dl_dir, "StoneTech_Stone_Veneer_Catalogue_English.pdf"))
            print(f"Mirrored {base_fname} to ~/Downloads/")

    print("\n=======================================================")
    print("ALL REQUESTED STONE VENEER CATALOGUES GENERATED!")
    print("=======================================================")

if __name__ == "__main__":
    main()

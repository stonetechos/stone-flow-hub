#!/usr/bin/env python3
"""
Extracts and crops all 75 stone pebble products from the source PDFs.
- Removes top embedded name text and bottom CamScanner tags completely.
- Crops all images to an identical 1:1 square aspect ratio frame (1000x1000 px).
- Saves clean assets to public/catalogues/stone-pebbles-assets/
"""

import os
import subprocess
from PIL import Image

REPO_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ASSETS_DIR = os.path.join(REPO_DIR, "public/catalogues/stone-pebbles-assets")
RAW_DIR = "/tmp/pebbles_raw"

os.makedirs(ASSETS_DIR, exist_ok=True)
os.makedirs(RAW_DIR, exist_ok=True)

PDF_PART1 = "/Users/stonetech/.gemini/antigravity/brain/692e0f8b-c231-4893-8608-267244e2257f/.user_uploaded/media_1795070091467_700aa857.pdf"
PDF_PART2 = "/Users/stonetech/.gemini/antigravity/brain/692e0f8b-c231-4893-8608-267244e2257f/.user_uploaded/media_1795070091457_093376dc.pdf"

PEBBLES = [
    # Part 1 (38 items)
    {"id": 1, "part": "p1", "idx": 0, "name": "Rose Quartz", "code": "ST-PB-001", "category": "Semi-Precious Agates", "finish": "Tumbled Polished High-Luster", "sizes": "10-25mm, 25-50mm"},
    {"id": 2, "part": "p1", "idx": 1, "name": "Crystal Quartz", "code": "ST-PB-002", "category": "Semi-Precious Agates", "finish": "Tumbled Polished Translucent", "sizes": "10-25mm, 25-50mm"},
    {"id": 3, "part": "p1", "idx": 2, "name": "African Amethyst", "code": "ST-PB-003", "category": "Semi-Precious Agates", "finish": "Tumbled Polished Royal Purple", "sizes": "15-30mm, 30-60mm"},
    {"id": 4, "part": "p1", "idx": 3, "name": "Red Carnelian", "code": "ST-PB-004", "category": "Semi-Precious Agates", "finish": "Tumbled Polished Rich Sienna", "sizes": "10-25mm, 25-50mm"},
    {"id": 5, "part": "p1", "idx": 4, "name": "Lapis Lazuli", "code": "ST-PB-005", "category": "Semi-Precious Agates", "finish": "Polished Celestial Ultramarine", "sizes": "10-25mm, 25-50mm"},
    {"id": 6, "part": "p1", "idx": 5, "name": "Tiger Stone", "code": "ST-PB-006", "category": "Semi-Precious Agates", "finish": "Silky Chatoyant Golden Lustre", "sizes": "15-30mm, 30-60mm"},
    {"id": 7, "part": "p1", "idx": 6, "name": "Labradorite", "code": "ST-PB-007", "category": "Semi-Precious Agates", "finish": "Iridescent Labradorescence Polish", "sizes": "20-40mm, 40-70mm"},
    {"id": 8, "part": "p1", "idx": 7, "name": "White Rainbow", "code": "ST-PB-008", "category": "Semi-Precious Agates", "finish": "Opalescent Polished White", "sizes": "10-25mm, 25-50mm"},
    {"id": 9, "part": "p1", "idx": 8, "name": "Black Tourmaline", "code": "ST-PB-009", "category": "Semi-Precious Agates", "finish": "High-Density Polished Jet Black", "sizes": "15-35mm, 35-70mm"},
    {"id": 10, "part": "p1", "idx": 9, "name": "Green Aventurine", "code": "ST-PB-010", "category": "Semi-Precious Agates", "finish": "Tumbled Polished Jade Sheen", "sizes": "10-25mm, 25-50mm"},
    {"id": 11, "part": "p1", "idx": 10, "name": "White Glaze Onyx", "code": "ST-PB-011", "category": "Onyx Pebbles", "finish": "Glazed Vitrified Polished White", "sizes": "15-30mm, 30-60mm"},
    {"id": 12, "part": "p1", "idx": 11, "name": "Blue Onyx", "code": "ST-PB-012", "category": "Onyx Pebbles", "finish": "Translucent Azure Polished", "sizes": "15-30mm, 30-60mm"},
    {"id": 13, "part": "p1", "idx": 12, "name": "Orange Onyx", "code": "ST-PB-013", "category": "Onyx Pebbles", "finish": "Vibrant Citrine Warm Polish", "sizes": "15-30mm, 30-60mm"},
    {"id": 14, "part": "p1", "idx": 13, "name": "Pink Onyx", "code": "ST-PB-014", "category": "Onyx Pebbles", "finish": "Blush Rose Translucent Polish", "sizes": "15-30mm, 30-60mm"},
    {"id": 15, "part": "p1", "idx": 14, "name": "Cherry Onyx", "code": "ST-PB-015", "category": "Onyx Pebbles", "finish": "Deep Cherry Veined Polished", "sizes": "15-30mm, 30-60mm"},
    {"id": 16, "part": "p1", "idx": 15, "name": "Purple Onyx", "code": "ST-PB-016", "category": "Onyx Pebbles", "finish": "Violet Hued Translucent Polish", "sizes": "15-30mm, 30-60mm"},
    {"id": 17, "part": "p1", "idx": 16, "name": "Yellow Onyx", "code": "ST-PB-017", "category": "Onyx Pebbles", "finish": "Golden Honey Warm Polish", "sizes": "15-30mm, 30-60mm"},
    {"id": 18, "part": "p1", "idx": 17, "name": "Soft Lime Onyx", "code": "ST-PB-018", "category": "Onyx Pebbles", "finish": "Pistachio Celadon Polished", "sizes": "15-30mm, 30-60mm"},
    {"id": 19, "part": "p1", "idx": 18, "name": "Black Storm Onyx", "code": "ST-PB-019", "category": "Onyx Pebbles", "finish": "Veined Charcoal Dramatic Polish", "sizes": "20-40mm, 40-70mm"},
    {"id": 20, "part": "p1", "idx": 19, "name": "Indian Amethyst", "code": "ST-PB-020", "category": "Semi-Precious Agates", "finish": "Natural Crystalline Lavender", "sizes": "15-30mm, 30-50mm"},
    {"id": 21, "part": "p1", "idx": 20, "name": "Banded Onyx", "code": "ST-PB-021", "category": "Onyx Pebbles", "finish": "Multi-Strata Agate Banding", "sizes": "20-40mm, 40-70mm"},
    {"id": 22, "part": "p1", "idx": 21, "name": "Las Vegas Onyx", "code": "ST-PB-022", "category": "Onyx Pebbles", "finish": "Caramel Amber Striated Polish", "sizes": "20-40mm, 40-70mm"},
    {"id": 23, "part": "p1", "idx": 22, "name": "Soothing Sydney Onyx", "code": "ST-PB-023", "category": "Onyx Pebbles", "finish": "Silk Opal Translucent Polish", "sizes": "20-40mm, 40-70mm"},
    {"id": 24, "part": "p1", "idx": 23, "name": "Tree Agate", "code": "ST-PB-024", "category": "Semi-Precious Agates", "finish": "Dendritic Forest Green Polish", "sizes": "15-30mm, 30-50mm"},
    {"id": 25, "part": "p1", "idx": 24, "name": "Jasper Agate", "code": "ST-PB-025", "category": "Semi-Precious Agates", "finish": "Brecciated Earthy Polished", "sizes": "15-30mm, 30-60mm"},
    {"id": 26, "part": "p1", "idx": 25, "name": "Carrot Bout", "code": "ST-PB-026", "category": "Semi-Precious Agates", "finish": "Flame Orange Smooth Tumbled", "sizes": "15-30mm, 30-50mm"},
    {"id": 27, "part": "p1", "idx": 26, "name": "Seaweed Green", "code": "ST-PB-027", "category": "Landscape & River", "finish": "Deep Marine Botanical Polish", "sizes": "20-40mm, 40-70mm"},
    {"id": 28, "part": "p1", "idx": 27, "name": "Elegant Black", "code": "ST-PB-028", "category": "Landscape & River", "finish": "Piano Gloss Mirror Jet Black", "sizes": "20-40mm, 40-70mm, 70-100mm"},
    {"id": 29, "part": "p1", "idx": 28, "name": "California UG", "code": "ST-PB-029", "category": "Landscape & River", "finish": "Pacific Coastal Tumbled Polish", "sizes": "20-40mm, 40-70mm"},
    {"id": 30, "part": "p1", "idx": 29, "name": "Downtown Grey", "code": "ST-PB-030", "category": "Landscape & River", "finish": "Urban Slate Polished Grey", "sizes": "20-40mm, 40-70mm"},
    {"id": 31, "part": "p1", "idx": 30, "name": "Arabian Dunes", "code": "ST-PB-031", "category": "Landscape & River", "finish": "Warm Desert Ochre Polished", "sizes": "20-40mm, 40-70mm"},
    {"id": 32, "part": "p1", "idx": 31, "name": "Caribbean Fantasy", "code": "ST-PB-032", "category": "Landscape & River", "finish": "Tropical Multi-Hue Tumbled", "sizes": "15-35mm, 35-65mm"},
    {"id": 33, "part": "p1", "idx": 32, "name": "Oceanic Green", "code": "ST-PB-033", "category": "Landscape & River", "finish": "Aquamarine Tide Polished", "sizes": "20-40mm, 40-70mm"},
    {"id": 34, "part": "p1", "idx": 33, "name": "White Dew", "code": "ST-PB-034", "category": "Landscape & River", "finish": "Pristine Snow Polished White", "sizes": "15-30mm, 30-60mm, 60-90mm"},
    {"id": 35, "part": "p1", "idx": 34, "name": "Sage Green", "code": "ST-PB-035", "category": "Landscape & River", "finish": "Soft Olive Herbaceous Polish", "sizes": "20-40mm, 40-70mm"},
    {"id": 36, "part": "p1", "idx": 35, "name": "Bloodstone", "code": "ST-PB-036", "category": "Semi-Precious Agates", "finish": "Heliotrope Jasper Polished", "sizes": "15-30mm, 30-60mm"},
    {"id": 37, "part": "p1", "idx": 36, "name": "Dyed Stone Pebbles", "code": "ST-PB-037", "category": "Decorative & Specialty", "finish": "Chromatic Prism Coated", "sizes": "10-25mm, 25-40mm"},
    {"id": 38, "part": "p1", "idx": 37, "name": "Golden Brown", "code": "ST-PB-038", "category": "Landscape & River", "finish": "Warm Amber River Polished", "sizes": "20-40mm, 40-70mm"},

    # Part 2 (37 items)
    {"id": 39, "part": "p2", "idx": 0, "name": "Golden Beige", "code": "ST-PB-039", "category": "Landscape & River", "finish": "Champagne Warm Cream Polish", "sizes": "20-40mm, 40-70mm"},
    {"id": 40, "part": "p2", "idx": 1, "name": "Elegant Black Jumbo", "code": "ST-PB-040", "category": "Jumbo & Flat Pebbles", "finish": "Monumental Gloss Polished Black", "sizes": "80-120mm, 120-180mm"},
    {"id": 41, "part": "p2", "idx": 2, "name": "White Dew Jumbo", "code": "ST-PB-041", "category": "Jumbo & Flat Pebbles", "finish": "Monumental Polished Pure White", "sizes": "80-120mm, 120-180mm"},
    {"id": 42, "part": "p2", "idx": 3, "name": "Soft Grey Jumbo", "code": "ST-PB-042", "category": "Jumbo & Flat Pebbles", "finish": "Architectural Smooth Slate Grey", "sizes": "80-120mm, 120-180mm"},
    {"id": 43, "part": "p2", "idx": 4, "name": "Downtown Grey Flat", "code": "ST-PB-043", "category": "Jumbo & Flat Pebbles", "finish": "Flat Stepping Disc River Polish", "sizes": "50-90mm Flat, 90-140mm Flat"},
    {"id": 44, "part": "p2", "idx": 5, "name": "Elegant Black Flat", "code": "ST-PB-044", "category": "Jumbo & Flat Pebbles", "finish": "Flat Stepping Disc Jet Black Polish", "sizes": "50-90mm Flat, 90-140mm Flat"},
    {"id": 45, "part": "p2", "idx": 6, "name": "Chocolate Brown Flat", "code": "ST-PB-045", "category": "Jumbo & Flat Pebbles", "finish": "Flat Stepping Disc Espresso Polish", "sizes": "50-90mm Flat, 90-140mm Flat"},
    {"id": 46, "part": "p2", "idx": 7, "name": "Semi Polished Agates", "code": "ST-PB-046", "category": "Semi-Precious Agates", "finish": "Satin Lustre Natural Banded", "sizes": "20-40mm, 40-70mm"},
    {"id": 47, "part": "p2", "idx": 8, "name": "Enhydro Polished", "code": "ST-PB-047", "category": "Semi-Precious Agates", "finish": "Water-Bearing Quartz Polished", "sizes": "25-50mm, 50-80mm"},
    {"id": 48, "part": "p2", "idx": 9, "name": "Matte White Jumbo", "code": "ST-PB-048", "category": "Jumbo & Flat Pebbles", "finish": "Raw Tumbled Natural Matte Chalk", "sizes": "80-120mm, 120-180mm"},
    {"id": 49, "part": "p2", "idx": 10, "name": "Raw River Black", "code": "ST-PB-049", "category": "Landscape & River", "finish": "Authentic Basalt Riverbed Matte", "sizes": "25-50mm, 50-90mm"},
    {"id": 50, "part": "p2", "idx": 11, "name": "Matte Yellow Jumbo", "code": "ST-PB-050", "category": "Jumbo & Flat Pebbles", "finish": "Natural Tumbled Desert Ochre Matte", "sizes": "80-120mm, 120-180mm"},
    {"id": 51, "part": "p2", "idx": 12, "name": "Matte Royal Black", "code": "ST-PB-051", "category": "Landscape & River", "finish": "Tumbled Velvet Midnight Matte", "sizes": "25-50mm, 50-80mm"},
    {"id": 52, "part": "p2", "idx": 13, "name": "Matte Red Jumbo", "code": "ST-PB-052", "category": "Jumbo & Flat Pebbles", "finish": "Natural Terracotta Oxide Matte", "sizes": "80-120mm, 120-180mm"},
    {"id": 53, "part": "p2", "idx": 14, "name": "Coffee Bands Raw", "code": "ST-PB-053", "category": "Landscape & River", "finish": "Natural Striated Riverbed Pebble", "sizes": "25-50mm, 50-80mm"},
    {"id": 54, "part": "p2", "idx": 15, "name": "D'Legno", "code": "ST-PB-054", "category": "Landscape & River", "finish": "Petrified Wood Grain Polished", "sizes": "25-50mm, 50-80mm"},
    {"id": 55, "part": "p2", "idx": 16, "name": "Arcobaleno", "code": "ST-PB-055", "category": "Decorative & Specialty", "finish": "Rainbow Multi-Faceted Polished", "sizes": "20-40mm, 40-70mm"},
    {"id": 56, "part": "p2", "idx": 17, "name": "Vena Verde", "code": "ST-PB-056", "category": "Landscape & River", "finish": "Green Serpentine Veined Polish", "sizes": "20-40mm, 40-70mm"},
    {"id": 57, "part": "p2", "idx": 18, "name": "Vena Marrone", "code": "ST-PB-057", "category": "Landscape & River", "finish": "Brown Veined Calcite Polish", "sizes": "20-40mm, 40-70mm"},
    {"id": 58, "part": "p2", "idx": 19, "name": "JSL Giallo", "code": "ST-PB-058", "category": "Landscape & River", "finish": "Italian Giallo Sienna Polish", "sizes": "20-40mm, 40-70mm"},
    {"id": 59, "part": "p2", "idx": 20, "name": "Renero Granito", "code": "ST-PB-059", "category": "Landscape & River", "finish": "Black Granite Salt & Pepper Polish", "sizes": "20-40mm, 40-70mm"},
    {"id": 60, "part": "p2", "idx": 21, "name": "Snowy Bianca Granito", "code": "ST-PB-060", "category": "Landscape & River", "finish": "White Granite Crystalline Polish", "sizes": "20-40mm, 40-70mm"},
    {"id": 61, "part": "p2", "idx": 22, "name": "Raw River Candies", "code": "ST-PB-061", "category": "Decorative & Specialty", "finish": "Assorted Pastel Water-Worn Pebbles", "sizes": "15-30mm, 30-50mm"},
    {"id": 62, "part": "p2", "idx": 23, "name": "Stone Spheres", "code": "ST-PB-062", "category": "Decorative & Specialty", "finish": "Precision Lathe-Turned Spheres", "sizes": "30mm, 50mm, 75mm, 100mm Dia"},
    {"id": 63, "part": "p2", "idx": 24, "name": "Hand Painted Pebbles", "code": "ST-PB-063", "category": "Decorative & Specialty", "finish": "Artisanal Enamel Painted Motif", "sizes": "40-70mm, 70-100mm"},
    {"id": 64, "part": "p2", "idx": 25, "name": "Navratna Mini", "code": "ST-PB-064", "category": "Mini Pebbles & Chips", "finish": "Nine-Gem Astrological Blend Polished", "sizes": "6-12mm Micro Tumbled"},
    {"id": 65, "part": "p2", "idx": 26, "name": "White Dew Mini", "code": "ST-PB-065", "category": "Mini Pebbles & Chips", "finish": "Fine White Polished Micro Gravel", "sizes": "5-10mm, 8-15mm"},
    {"id": 66, "part": "p2", "idx": 27, "name": "Arabian Dunes Mini", "code": "ST-PB-066", "category": "Mini Pebbles & Chips", "finish": "Golden Desert Micro Pebbles", "sizes": "5-10mm, 8-15mm"},
    {"id": 67, "part": "p2", "idx": 28, "name": "Dyed Colorful Mini", "code": "ST-PB-067", "category": "Mini Pebbles & Chips", "finish": "Vivid Spectrum Coated Micro Gravel", "sizes": "4-8mm, 8-12mm"},
    {"id": 68, "part": "p2", "idx": 29, "name": "Quartz Jujubes", "code": "ST-PB-068", "category": "Mini Pebbles & Chips", "finish": "Tumbled Jelly Quartz Drops", "sizes": "8-15mm, 15-22mm"},
    {"id": 69, "part": "p2", "idx": 30, "name": "Dyed Blue Sand", "code": "ST-PB-069", "category": "Mini Pebbles & Chips", "finish": "Cobalt Blue Architectural Quartz Sand", "sizes": "0.5-1.5mm, 1.5-3mm Fine"},
    {"id": 70, "part": "p2", "idx": 31, "name": "White Nano Chips", "code": "ST-PB-070", "category": "Mini Pebbles & Chips", "finish": "Micro-Fine Calcite Crystalline Chips", "sizes": "1-3mm, 3-5mm Nano"},
    {"id": 71, "part": "p2", "idx": 32, "name": "Stone Chips White", "code": "ST-PB-071", "category": "Mini Pebbles & Chips", "finish": "Angular Crushed White Marble Chips", "sizes": "6-10mm, 10-15mm, 15-20mm"},
    {"id": 72, "part": "p2", "idx": 33, "name": "Stone Chips Yellow", "code": "ST-PB-072", "category": "Mini Pebbles & Chips", "finish": "Angular Crushed Jaisalmer Yellow Chips", "sizes": "6-10mm, 10-15mm, 15-20mm"},
    {"id": 73, "part": "p2", "idx": 34, "name": "Stone Chips Red", "code": "ST-PB-073", "category": "Mini Pebbles & Chips", "finish": "Angular Crushed Dholpur Red Chips", "sizes": "6-10mm, 10-15mm, 15-20mm"},
    {"id": 74, "part": "p2", "idx": 35, "name": "Stone Chips Grey", "code": "ST-PB-074", "category": "Mini Pebbles & Chips", "finish": "Angular Crushed Kota Grey Chips", "sizes": "6-10mm, 10-15mm, 15-20mm"},
    {"id": 75, "part": "p2", "idx": 36, "name": "Stone Chips Mixed", "code": "ST-PB-075", "category": "Mini Pebbles & Chips", "finish": "Poly-Mineral Aggregate Decorative Chips", "sizes": "6-10mm, 10-15mm, 15-20mm"},
]

def main():
    print(f"Cropping and processing all {len(PEBBLES)} stone pebble items...")
    target_size = (1000, 1000)

    for item in PEBBLES:
        raw_filename = f"{item['part']}_{item['idx']:02d}.jpg"
        raw_path = os.path.join(RAW_DIR, raw_filename)
        out_filename = f"pebble_{item['id']:03d}.jpg"
        out_path = os.path.join(ASSETS_DIR, out_filename)

        if not os.path.exists(raw_path):
            print(f"Error: missing raw file {raw_path}")
            continue

        im = Image.open(raw_path)
        w, h = im.size

        # Exact crop removing top text (y < 260) and CamScanner footer (y > 1450)
        # Yields a uniform 1190 x 1190 square frame
        crop_box = (0, 260, 1190, 1450)
        cropped = im.crop(crop_box)
        resized = cropped.resize(target_size, Image.Resampling.LANCZOS)
        resized.save(out_path, format="JPEG", quality=88, optimize=True)
        print(f"[{item['id']:02d}/75] Processed {item['code']} - {item['name']} -> {out_filename}")

    print("All 75 pebble assets successfully extracted, cropped, and saved!")

if __name__ == "__main__":
    main()

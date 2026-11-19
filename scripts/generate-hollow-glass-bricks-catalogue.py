#!/usr/bin/env python3
"""
Stone Tech Atelier — Architectural Hollow Glass Bricks Catalogue Generator (2026-2027)
Strictly adheres to Stone Tech Atelier Luxury Architectural Design System (Landscape A4: 297mm x 210mm).
Eliminates all competitor watermarks, inverted headers, blank pages, and misalignments.
Compiles via Headless Google Chrome with zero tofu boxes and ultra-crisp optics.
"""

import os
import sys
import time
import subprocess
import shutil

REPO_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ASSETS_DIR = os.path.join(REPO_DIR, "public/catalogues/hollow-glass-assets")
BRANDING_DIR = os.path.join(REPO_DIR, "public/branding")
OUTPUT_PDF = os.path.join(REPO_DIR, "public/catalogues/StoneTech_Glass_Bricks_Catalogue_2026.pdf")
DOWNLOADS_PDF = os.path.expanduser("~/Downloads/StoneTech_Glass_Bricks_Catalogue_2026.pdf")

EMBLEM_PATH = os.path.join(BRANDING_DIR, "stone-tech-emblem-hq.png")
BADGE_PATH = os.path.join(BRANDING_DIR, "stone-tech-manufacturer-badge.png")

# 38 Hollow Glass Brick Products (23 Clear + 15 In-Color & Translucent Tinted)
PRODUCTS = [
    # Collection I: Clear Architectural Series (Pages 4 - 26)
    {
        "code": "ST-HGB-001",
        "name": "Seaview",
        "collection": "Clear Architectural Series",
        "type": "Clear Double-Cavity Acoustic Thermal Glass Brick",
        "size": "190 × 190 × 80 mm",
        "weight": "2.30 kg / pc",
        "packing": "6 pcs / carton · 13.8 kg",
        "light_trans": "78% Ambient Diffusion",
        "sound": "42 dB Certified Attenuation",
        "u_value": "1.50 W/m²K",
        "fire": "Class E / EW30 (EN 13501)",
        "compressive": "> 7.5 N/mm²",
        "img": "hollow_p6_brick.jpg",
        "desc": "Signature undulating ocean wave pattern engineered to refract dynamic natural sunlight while providing complete visual obscuration and privacy for luxury interiors."
    },
    {
        "code": "ST-HGB-002",
        "name": "Sahara",
        "collection": "Clear Architectural Series",
        "type": "Clear Double-Cavity Acoustic Thermal Glass Brick",
        "size": "190 × 190 × 80 mm",
        "weight": "2.30 kg / pc",
        "packing": "6 pcs / carton · 13.8 kg",
        "light_trans": "75% Soft Glow Diffusion",
        "sound": "42 dB Certified Attenuation",
        "u_value": "1.50 W/m²K",
        "fire": "Class E / EW30 (EN 13501)",
        "compressive": "> 7.5 N/mm²",
        "img": "hollow_p7_brick.jpg",
        "desc": "Micro-stippled desert sand crystalline texture dispersing harsh direct light into a warm, uniform, shadowless architectural illumination suitable for executive offices."
    },
    {
        "code": "ST-HGB-003",
        "name": "New Wavy",
        "collection": "Clear Architectural Series",
        "type": "Clear Double-Cavity Acoustic Thermal Glass Brick",
        "size": "190 × 190 × 80 mm",
        "weight": "2.30 kg / pc",
        "packing": "6 pcs / carton · 13.8 kg",
        "light_trans": "80% Fluid Transparency",
        "sound": "41 dB Certified Attenuation",
        "u_value": "1.52 W/m²K",
        "fire": "Class E / EW30 (EN 13501)",
        "compressive": "> 7.5 N/mm²",
        "img": "hollow_p8_brick.jpg",
        "desc": "Subtle low-frequency harmonic surface ripples generating kinetic optical highlights as viewers traverse the space, maximizing daylight harvesting."
    },
    {
        "code": "ST-HGB-004",
        "name": "Bubbles",
        "collection": "Clear Architectural Series",
        "type": "Clear Double-Cavity Acoustic Thermal Glass Brick",
        "size": "190 × 190 × 80 mm",
        "weight": "2.30 kg / pc",
        "packing": "6 pcs / carton · 13.8 kg",
        "light_trans": "79% Prismatic Diffusion",
        "sound": "41 dB Certified Attenuation",
        "u_value": "1.52 W/m²K",
        "fire": "Class E / EW30 (EN 13501)",
        "compressive": "> 7.5 N/mm²",
        "img": "hollow_p9_brick.jpg",
        "desc": "Effervescent micro-bubble relief patterns molded within the interior cavity face, creating playful multi-directional light sparks and optical depth."
    },
    {
        "code": "ST-HGB-005",
        "name": "Checkers",
        "collection": "Clear Architectural Series",
        "type": "Clear Double-Cavity Acoustic Thermal Glass Brick",
        "size": "190 × 190 × 80 mm",
        "weight": "2.35 kg / pc",
        "packing": "6 pcs / carton · 14.1 kg",
        "light_trans": "76% Directional Refraction",
        "sound": "42 dB Certified Attenuation",
        "u_value": "1.50 W/m²K",
        "fire": "Class E / EW30 (EN 13501)",
        "compressive": "> 8.0 N/mm²",
        "img": "hollow_p10_brick.jpg",
        "desc": "Orthogonal alternating checkered prisms refracting incident sunlight into precise cross-directional geometric beams for modern architectural façades."
    },
    {
        "code": "ST-HGB-006",
        "name": "Clear Mist",
        "collection": "Clear Architectural Series",
        "type": "Clear Double-Cavity Acoustic Thermal Glass Brick",
        "size": "190 × 190 × 80 mm",
        "weight": "2.30 kg / pc",
        "packing": "6 pcs / carton · 13.8 kg",
        "light_trans": "72% Matte Satin Glow",
        "sound": "42 dB Certified Attenuation",
        "u_value": "1.48 W/m²K",
        "fire": "Class E / EW30 (EN 13501)",
        "compressive": "> 7.5 N/mm²",
        "img": "hollow_p11_brick.jpg",
        "desc": "Satin acid-etched frosted crystalline face providing exceptional privacy obscuration while infusing rooms with soft, homogeneous, glare-free daylight."
    },
    {
        "code": "ST-HGB-007",
        "name": "Crystal Broadline",
        "collection": "Clear Architectural Series",
        "type": "Clear Double-Cavity Acoustic Thermal Glass Brick",
        "size": "190 × 190 × 80 mm",
        "weight": "2.32 kg / pc",
        "packing": "6 pcs / carton · 13.9 kg",
        "light_trans": "81% Linear Projection",
        "sound": "41 dB Certified Attenuation",
        "u_value": "1.50 W/m²K",
        "fire": "Class E / EW30 (EN 13501)",
        "compressive": "> 7.8 N/mm²",
        "img": "hollow_p12_brick.jpg",
        "desc": "Bold vertical architectural fluting drawing elongated shadows and accentuating ceiling height in modern minimalist reception walls and partitions."
    },
    {
        "code": "ST-HGB-008",
        "name": "Lattice",
        "collection": "Clear Architectural Series",
        "type": "Clear Double-Cavity Acoustic Thermal Glass Brick",
        "size": "190 × 190 × 80 mm",
        "weight": "2.30 kg / pc",
        "packing": "6 pcs / carton · 13.8 kg",
        "light_trans": "77% Cross-Diffusion",
        "sound": "42 dB Certified Attenuation",
        "u_value": "1.50 W/m²K",
        "fire": "Class E / EW30 (EN 13501)",
        "compressive": "> 7.5 N/mm²",
        "img": "hollow_p13_brick.jpg",
        "desc": "Diagonal cross-hatched diamond micro-lattice geometry casting intricate woven shadow art across adjacent floors and walls."
    },
    {
        "code": "ST-HGB-009",
        "name": "Line Lite",
        "collection": "Clear Architectural Series",
        "type": "Clear Double-Cavity Acoustic Thermal Glass Brick",
        "size": "190 × 190 × 80 mm",
        "weight": "2.30 kg / pc",
        "packing": "6 pcs / carton · 13.8 kg",
        "light_trans": "82% Reeded Guidance",
        "sound": "41 dB Certified Attenuation",
        "u_value": "1.52 W/m²K",
        "fire": "Class E / EW30 (EN 13501)",
        "compressive": "> 7.5 N/mm²",
        "img": "hollow_p14_brick.jpg",
        "desc": "Ultra-slender parallel reeded micro-flutes guiding daylight with refined precision, creating a contemporary linear aesthetic for luxury residences."
    },
    {
        "code": "ST-HGB-010",
        "name": "Coral Tree",
        "collection": "Clear Architectural Series",
        "type": "Clear Double-Cavity Acoustic Thermal Glass Brick",
        "size": "190 × 190 × 80 mm",
        "weight": "2.35 kg / pc",
        "packing": "6 pcs / carton · 14.1 kg",
        "light_trans": "76% Organic Diffusion",
        "sound": "42 dB Certified Attenuation",
        "u_value": "1.50 W/m²K",
        "fire": "Class E / EW30 (EN 13501)",
        "compressive": "> 7.6 N/mm²",
        "img": "hollow_p15_brick.jpg",
        "desc": "Sculptural organic branching motifs inspired by natural deep-sea coral reefs, adding an artisanal bespoke character to architectural screens."
    },
    {
        "code": "ST-HGB-011",
        "name": "Crystal Mist",
        "collection": "Clear Architectural Series",
        "type": "Clear Double-Cavity Acoustic Thermal Glass Brick",
        "size": "190 × 190 × 80 mm",
        "weight": "2.30 kg / pc",
        "packing": "6 pcs / carton · 13.8 kg",
        "light_trans": "70% Full Obscurity",
        "sound": "43 dB High Attenuation",
        "u_value": "1.47 W/m²K",
        "fire": "Class E / EW30 (EN 13501)",
        "compressive": "> 7.8 N/mm²",
        "img": "hollow_p16_brick.jpg",
        "desc": "Ultra-dense crystalline frosted texture offering maximum privacy rating without sacrificing luminous lux transmission for luxury master baths."
    },
    {
        "code": "ST-HGB-012",
        "name": "Ice Rock",
        "collection": "Clear Architectural Series",
        "type": "Clear Double-Cavity Acoustic Thermal Glass Brick",
        "size": "190 × 190 × 80 mm",
        "weight": "2.35 kg / pc",
        "packing": "6 pcs / carton · 14.1 kg",
        "light_trans": "78% Glacial Sparkle",
        "sound": "42 dB Certified Attenuation",
        "u_value": "1.50 W/m²K",
        "fire": "Class E / EW30 (EN 13501)",
        "compressive": "> 8.2 N/mm²",
        "img": "hollow_p17_brick.jpg",
        "desc": "Chiseled glacial fracture relief breaking light into shimmering crystal facets, mimicking the dramatic geological beauty of carved alpine ice."
    },
    {
        "code": "ST-HGB-013",
        "name": "Spider",
        "collection": "Clear Architectural Series",
        "type": "Clear Double-Cavity Acoustic Thermal Glass Brick",
        "size": "190 × 190 × 80 mm",
        "weight": "2.32 kg / pc",
        "packing": "6 pcs / carton · 13.9 kg",
        "light_trans": "77% Radial Prism",
        "sound": "42 dB Certified Attenuation",
        "u_value": "1.50 W/m²K",
        "fire": "Class E / EW30 (EN 13501)",
        "compressive": "> 7.7 N/mm²",
        "img": "hollow_p18_brick.jpg",
        "desc": "Geometric radial web prism converging incident rays toward focal vertices, establishing a futuristic kaleidoscopic optical impact."
    },
    {
        "code": "ST-HGB-014",
        "name": "Hearts",
        "collection": "Clear Architectural Series",
        "type": "Clear Double-Cavity Acoustic Thermal Glass Brick",
        "size": "190 × 190 × 80 mm",
        "weight": "2.30 kg / pc",
        "packing": "6 pcs / carton · 13.8 kg",
        "light_trans": "78% Decorative Relief",
        "sound": "41 dB Certified Attenuation",
        "u_value": "1.52 W/m²K",
        "fire": "Class E / EW30 (EN 13501)",
        "compressive": "> 7.5 N/mm²",
        "img": "hollow_p19_brick.jpg",
        "desc": "Symmetric embossed heart relief quadrants engineered for boutique hospitality, spa sanctuaries, and bespoke residential partition highlights."
    },
    {
        "code": "ST-HGB-015",
        "name": "Bricks",
        "collection": "Clear Architectural Series",
        "type": "Clear Double-Cavity Acoustic Thermal Glass Brick",
        "size": "190 × 190 × 80 mm",
        "weight": "2.34 kg / pc",
        "packing": "6 pcs / carton · 14.0 kg",
        "light_trans": "77% Masonry Prism",
        "sound": "42 dB Certified Attenuation",
        "u_value": "1.50 W/m²K",
        "fire": "Class E / EW30 (EN 13501)",
        "compressive": "> 7.9 N/mm²",
        "img": "hollow_p20_brick.jpg",
        "desc": "Subdivided Flemish brick-bond face seamlessly integrating classic masonry rhythm with luminous glass transparency."
    },
    {
        "code": "ST-HGB-016",
        "name": "City View",
        "collection": "Clear Architectural Series",
        "type": "Clear Double-Cavity Acoustic Thermal Glass Brick",
        "size": "190 × 190 × 80 mm",
        "weight": "2.30 kg / pc",
        "packing": "6 pcs / carton · 13.8 kg",
        "light_trans": "79% Skyline Refraction",
        "sound": "42 dB Certified Attenuation",
        "u_value": "1.50 W/m²K",
        "fire": "Class E / EW30 (EN 13501)",
        "compressive": "> 7.6 N/mm²",
        "img": "hollow_p21_brick.jpg",
        "desc": "Staggered block towers evoking high-rise architectural silhouettes, ideal for contemporary urban corporate headquarters."
    },
    {
        "code": "ST-HGB-017",
        "name": "Petra",
        "collection": "Clear Architectural Series",
        "type": "Clear Double-Cavity Acoustic Thermal Glass Brick",
        "size": "190 × 190 × 80 mm",
        "weight": "2.35 kg / pc",
        "packing": "6 pcs / carton · 14.1 kg",
        "light_trans": "75% Carved Relief",
        "sound": "42 dB Certified Attenuation",
        "u_value": "1.50 W/m²K",
        "fire": "Class E / EW30 (EN 13501)",
        "compressive": "> 8.1 N/mm²",
        "img": "hollow_p22_brick.jpg",
        "desc": "Monumental chiseled stone relief inspired by the rock-cut facades of Petra, combining timeless historical weight with luminous glass."
    },
    {
        "code": "ST-HGB-018",
        "name": "Seaview Compact",
        "collection": "Clear Architectural Series",
        "type": "Compact Double-Cavity Acoustic Thermal Glass Brick",
        "size": "145 × 145 × 80 mm",
        "weight": "1.50 kg / pc",
        "packing": "10 pcs / carton · 15.0 kg",
        "light_trans": "79% Tight Wave Diffusion",
        "sound": "40 dB Certified Attenuation",
        "u_value": "1.60 W/m²K",
        "fire": "Class E / EW30 (EN 13501)",
        "compressive": "> 8.5 N/mm²",
        "img": "hollow_p23_brick.jpg",
        "desc": "Precision compact 145mm wave block tailored for tight-radius curved screens, perimeter bands, and slender bathroom partition walls."
    },
    {
        "code": "ST-HGB-019",
        "name": "Wave Compact",
        "collection": "Clear Architectural Series",
        "type": "Compact Double-Cavity Acoustic Thermal Glass Brick",
        "size": "145 × 145 × 80 mm",
        "weight": "1.50 kg / pc",
        "packing": "10 pcs / carton · 15.0 kg",
        "light_trans": "80% Fluid Rhythm",
        "sound": "40 dB Certified Attenuation",
        "u_value": "1.60 W/m²K",
        "fire": "Class E / EW30 (EN 13501)",
        "compressive": "> 8.5 N/mm²",
        "img": "hollow_p24_brick.jpg",
        "desc": "Compact water-ripple modular block enabling tight joint alignments and creative geometric mosaic bands within standard masonry walls."
    },
    {
        "code": "ST-HGB-020",
        "name": "Wave Mini",
        "collection": "Clear Architectural Series",
        "type": "Miniature Double-Cavity Glass Brick",
        "size": "115 × 115 × 80 mm",
        "weight": "1.05 kg / pc",
        "packing": "16 pcs / carton · 16.8 kg",
        "light_trans": "81% Concentrated Wave",
        "sound": "39 dB Certified Attenuation",
        "u_value": "1.65 W/m²K",
        "fire": "Class E / EW30 (EN 13501)",
        "compressive": "> 9.0 N/mm²",
        "img": "hollow_p25_brick.jpg",
        "desc": "Ultra-compact 115mm micro-brick engineered for tight circular columns, curved bar fronts, and delicate backlit architectural niches."
    },
    {
        "code": "ST-HGB-021",
        "name": "Clarity Grand",
        "collection": "Clear Architectural Series",
        "type": "Grand Format Acoustic Thermal Glass Block",
        "size": "240 × 240 × 80 mm",
        "weight": "3.85 kg / pc",
        "packing": "10 pcs / carton · 38.5 kg",
        "light_trans": "83% Monumental Clarity",
        "sound": "43 dB High Attenuation",
        "u_value": "1.45 W/m²K",
        "fire": "Class E / EW30 (EN 13501)",
        "compressive": "> 7.2 N/mm²",
        "img": "hollow_p26_brick.jpg",
        "desc": "Large-format 240mm architectural block minimizing joint frequency and delivering sweeping, monumental expanses of light."
    },
    {
        "code": "ST-HGB-022",
        "name": "Ice Terminal Block",
        "collection": "Clear Architectural Series",
        "type": "Bullnose End-Cap Acoustic Glass Block",
        "size": "190 × 90 × 80 mm",
        "weight": "1.65 kg / pc",
        "packing": "10 pcs / carton · 16.5 kg",
        "light_trans": "78% Finished Bullnose",
        "sound": "40 dB Certified Attenuation",
        "u_value": "1.55 W/m²K",
        "fire": "Class E / EW30 (EN 13501)",
        "compressive": "> 8.0 N/mm²",
        "img": "hollow_p27_brick.jpg",
        "desc": "Precision rounded bullnose terminal block providing a pristine factory-finished boundary edge for freestanding glass walls and walk-in showers."
    },
    {
        "code": "ST-HGB-023",
        "name": "Wave Terminal Block",
        "collection": "Clear Architectural Series",
        "type": "Bullnose End-Cap Acoustic Glass Block",
        "size": "190 × 90 × 80 mm",
        "weight": "1.65 kg / pc",
        "packing": "10 pcs / carton · 16.5 kg",
        "light_trans": "80% Wave Finished Edge",
        "sound": "40 dB Certified Attenuation",
        "u_value": "1.55 W/m²K",
        "fire": "Class E / EW30 (EN 13501)",
        "compressive": "> 8.0 N/mm²",
        "img": "hollow_p28_brick.jpg",
        "desc": "Wave-textured bullnose terminal block offering seamless continuity along the open vertical edge of frameless room dividers."
    },

    # Collection II: In-Color & Translucent Tinted Series (Pages 28 - 42)
    {
        "code": "ST-HGB-024",
        "name": "Blue IC",
        "collection": "In-Color & Translucent Tinted Series",
        "type": "Inner-Glazed Coloured Thermal Glass Brick",
        "size": "190 × 190 × 80 mm",
        "weight": "2.30 kg / pc",
        "packing": "6 pcs / carton · 13.8 kg",
        "light_trans": "54% Sapphire Illumination",
        "sound": "42 dB Certified Attenuation",
        "u_value": "1.50 W/m²K",
        "fire": "Class E / EW30 (EN 13501)",
        "compressive": "> 7.5 N/mm²",
        "img": "hollow_p30_brick.jpg",
        "desc": "Precision inner-cavity sapphire blue glaze casting rich nautical azure light rays across wellness spas, feature walls, and luxury pools."
    },
    {
        "code": "ST-HGB-025",
        "name": "Brown IC",
        "collection": "In-Color & Translucent Tinted Series",
        "type": "Inner-Glazed Coloured Thermal Glass Brick",
        "size": "190 × 190 × 80 mm",
        "weight": "2.30 kg / pc",
        "packing": "6 pcs / carton · 13.8 kg",
        "light_trans": "50% Warm Amber Glow",
        "sound": "42 dB Certified Attenuation",
        "u_value": "1.50 W/m²K",
        "fire": "Class E / EW30 (EN 13501)",
        "compressive": "> 7.5 N/mm²",
        "img": "hollow_p31_brick.jpg",
        "desc": "Warm cognac amber inner glaze harmonizing effortlessly with rich walnut wood, bronze trim, and warm architectural stone palettes."
    },
    {
        "code": "ST-HGB-026",
        "name": "Green IC",
        "collection": "In-Color & Translucent Tinted Series",
        "type": "Inner-Glazed Coloured Thermal Glass Brick",
        "size": "190 × 190 × 80 mm",
        "weight": "2.30 kg / pc",
        "packing": "6 pcs / carton · 13.8 kg",
        "light_trans": "56% Emerald Radiance",
        "sound": "42 dB Certified Attenuation",
        "u_value": "1.50 W/m²K",
        "fire": "Class E / EW30 (EN 13501)",
        "compressive": "> 7.5 N/mm²",
        "img": "hollow_p32_brick.jpg",
        "desc": "Vibrant emerald green inner glaze designed for biophilic interior gardens, courtyard light wells, and natural sanctuary feature screens."
    },
    {
        "code": "ST-HGB-027",
        "name": "Orange IC",
        "collection": "In-Color & Translucent Tinted Series",
        "type": "Inner-Glazed Coloured Thermal Glass Brick",
        "size": "190 × 190 × 80 mm",
        "weight": "2.30 kg / pc",
        "packing": "6 pcs / carton · 13.8 kg",
        "light_trans": "58% Sunset Luminescence",
        "sound": "42 dB Certified Attenuation",
        "u_value": "1.50 W/m²K",
        "fire": "Class E / EW30 (EN 13501)",
        "compressive": "> 7.5 N/mm²",
        "img": "hollow_p33_brick.jpg",
        "desc": "Radiant amber sunset inner glaze energizing hospitality lounges, modern restaurant bars, and signature corporate entrances."
    },
    {
        "code": "ST-HGB-028",
        "name": "Red IC",
        "collection": "In-Color & Translucent Tinted Series",
        "type": "Inner-Glazed Coloured Thermal Glass Brick",
        "size": "190 × 190 × 80 mm",
        "weight": "2.30 kg / pc",
        "packing": "6 pcs / carton · 13.8 kg",
        "light_trans": "42% Crimson Dramatic Glow",
        "sound": "42 dB Certified Attenuation",
        "u_value": "1.50 W/m²K",
        "fire": "Class E / EW30 (EN 13501)",
        "compressive": "> 7.5 N/mm²",
        "img": "hollow_p34_brick.jpg",
        "desc": "Bold crimson ruby inner core glaze creating powerful artistic statements and high-impact theatrical backdrop partitions."
    },
    {
        "code": "ST-HGB-029",
        "name": "Pink IC",
        "collection": "In-Color & Translucent Tinted Series",
        "type": "Inner-Glazed Coloured Thermal Glass Brick",
        "size": "190 × 190 × 80 mm",
        "weight": "2.30 kg / pc",
        "packing": "6 pcs / carton · 13.8 kg",
        "light_trans": "62% Soft Rose Tint",
        "sound": "42 dB Certified Attenuation",
        "u_value": "1.50 W/m²K",
        "fire": "Class E / EW30 (EN 13501)",
        "compressive": "> 7.5 N/mm²",
        "img": "hollow_p35_brick.jpg",
        "desc": "Delicate rose quartz inner tint bathing interior spaces in gentle, flattering romantic illumination for luxury boutiques and powder rooms."
    },
    {
        "code": "ST-HGB-030",
        "name": "Turquoise IC",
        "collection": "In-Color & Translucent Tinted Series",
        "type": "Inner-Glazed Coloured Thermal Glass Brick",
        "size": "190 × 190 × 80 mm",
        "weight": "2.30 kg / pc",
        "packing": "6 pcs / carton · 13.8 kg",
        "light_trans": "58% Cyan Lagoon Shimmer",
        "sound": "42 dB Certified Attenuation",
        "u_value": "1.50 W/m²K",
        "fire": "Class E / EW30 (EN 13501)",
        "compressive": "> 7.5 N/mm²",
        "img": "hollow_p36_brick.jpg",
        "desc": "Crystalline cyan turquoise inner tint evoking serene tropical lagoon reflections, perfectly tailored for seaside villas and spa pavilions."
    },
    {
        "code": "ST-HGB-031",
        "name": "Yellow IC",
        "collection": "In-Color & Translucent Tinted Series",
        "type": "Inner-Glazed Coloured Thermal Glass Brick",
        "size": "190 × 190 × 80 mm",
        "weight": "2.30 kg / pc",
        "packing": "6 pcs / carton · 13.8 kg",
        "light_trans": "68% Golden Sunlight",
        "sound": "42 dB Certified Attenuation",
        "u_value": "1.50 W/m²K",
        "fire": "Class E / EW30 (EN 13501)",
        "compressive": "> 7.5 N/mm²",
        "img": "hollow_p37_brick.jpg",
        "desc": "Bright sunny canary yellow inner glaze injecting uplifting warmth and bright illumination into naturally shaded northern rooms."
    },
    {
        "code": "ST-HGB-032",
        "name": "Purple IC",
        "collection": "In-Color & Translucent Tinted Series",
        "type": "Inner-Glazed Coloured Thermal Glass Brick",
        "size": "190 × 190 × 80 mm",
        "weight": "2.30 kg / pc",
        "packing": "6 pcs / carton · 13.8 kg",
        "light_trans": "48% Royal Amethyst Glow",
        "sound": "42 dB Certified Attenuation",
        "u_value": "1.50 W/m²K",
        "fire": "Class E / EW30 (EN 13501)",
        "compressive": "> 7.5 N/mm²",
        "img": "hollow_p38_brick.jpg",
        "desc": "Regal amethyst purple inner glaze bringing an aura of royal luxury and sophisticated mystique to private clubs and lounges."
    },
    {
        "code": "ST-HGB-033",
        "name": "Light Blue Translucent",
        "collection": "In-Color & Translucent Tinted Series",
        "type": "Body-Tinted Through-Colour Glass Brick",
        "size": "190 × 190 × 80 mm",
        "weight": "2.30 kg / pc",
        "packing": "6 pcs / carton · 13.8 kg",
        "light_trans": "65% Sky Blue Translucence",
        "sound": "42 dB Certified Attenuation",
        "u_value": "1.50 W/m²K",
        "fire": "Class E / EW30 (EN 13501)",
        "compressive": "> 7.5 N/mm²",
        "img": "hollow_p39_brick.jpg",
        "desc": "Homogeneous molten batch body-tinted sky blue glass casting authentic crystalline cyan rays with flawless color consistency throughout."
    },
    {
        "code": "ST-HGB-034",
        "name": "Dark Blue Translucent",
        "collection": "In-Color & Translucent Tinted Series",
        "type": "Body-Tinted Through-Colour Glass Brick",
        "size": "190 × 190 × 80 mm",
        "weight": "2.32 kg / pc",
        "packing": "6 pcs / carton · 13.9 kg",
        "light_trans": "45% Deep Cobalt Atmosphere",
        "sound": "42 dB Certified Attenuation",
        "u_value": "1.50 W/m²K",
        "fire": "Class E / EW30 (EN 13501)",
        "compressive": "> 7.7 N/mm²",
        "img": "hollow_p40_brick.jpg",
        "desc": "Deep cobalt body glass delivering rich dramatic contrast and striking evening illumination when integrated with edge LED lighting."
    },
    {
        "code": "ST-HGB-035",
        "name": "Bronze Translucent",
        "collection": "In-Color & Translucent Tinted Series",
        "type": "Body-Tinted Through-Colour Glass Brick",
        "size": "190 × 190 × 80 mm",
        "weight": "2.30 kg / pc",
        "packing": "6 pcs / carton · 13.8 kg",
        "light_trans": "52% Solar Glare Reduction",
        "sound": "42 dB Certified Attenuation",
        "u_value": "1.49 W/m²K",
        "fire": "Class E / EW30 (EN 13501)",
        "compressive": "> 7.6 N/mm²",
        "img": "hollow_p41_brick.jpg",
        "desc": "Sophisticated smoky bronze body tint offering effective solar thermal protection and subtle glare control for exterior curtain walls."
    },
    {
        "code": "ST-HGB-036",
        "name": "Light Green Translucent",
        "collection": "In-Color & Translucent Tinted Series",
        "type": "Body-Tinted Through-Colour Glass Brick",
        "size": "190 × 190 × 80 mm",
        "weight": "2.30 kg / pc",
        "packing": "6 pcs / carton · 13.8 kg",
        "light_trans": "66% Seafoam Green Tint",
        "sound": "42 dB Certified Attenuation",
        "u_value": "1.50 W/m²K",
        "fire": "Class E / EW30 (EN 13501)",
        "compressive": "> 7.5 N/mm²",
        "img": "hollow_p42_brick.jpg",
        "desc": "Soft seafoam jade body-tinted glass creating a calming oasis feel while filtering intense external daylight into soothing green hues."
    },
    {
        "code": "ST-HGB-037",
        "name": "Grey Translucent",
        "collection": "In-Color & Translucent Tinted Series",
        "type": "Body-Tinted Through-Colour Glass Brick",
        "size": "190 × 190 × 80 mm",
        "weight": "2.30 kg / pc",
        "packing": "6 pcs / carton · 13.8 kg",
        "light_trans": "48% Neutral Architectural Grey",
        "sound": "42 dB Certified Attenuation",
        "u_value": "1.50 W/m²K",
        "fire": "Class E / EW30 (EN 13501)",
        "compressive": "> 7.6 N/mm²",
        "img": "hollow_p43_brick.jpg",
        "desc": "Neutral graphite charcoal body glass matching blackened steel frameworks, exposed concrete walls, and industrial-chic interiors."
    },
    {
        "code": "ST-HGB-038",
        "name": "Light Pink Translucent",
        "collection": "In-Color & Translucent Tinted Series",
        "type": "Body-Tinted Through-Colour Glass Brick",
        "size": "190 × 190 × 80 mm",
        "weight": "2.30 kg / pc",
        "packing": "6 pcs / carton · 13.8 kg",
        "light_trans": "64% Pastel Rose Diffusion",
        "sound": "42 dB Certified Attenuation",
        "u_value": "1.50 W/m²K",
        "fire": "Class E / EW30 (EN 13501)",
        "compressive": "> 7.5 N/mm²",
        "img": "hollow_p44_brick.jpg",
        "desc": "Warm translucent pastel rose glass imbuing architectural corridors and vanity niches with warm, flattering, skin-tone friendly ambient light."
    }
]


def generate_css():
    return """
@page {
  size: 297mm 210mm;
  margin: 0;
}
* {
  box-sizing: border-box;
}
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  background: #ffffff;
  color: #0f172a;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.page {
  width: 297mm;
  height: 210mm;
  max-height: 210mm;
  page-break-after: always;
  page-break-inside: avoid;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
}

/* COVER PAGE */
.cover-page {
  background: #0f172a;
  color: #ffffff;
  padding: 10mm 14mm;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.cover-border {
  border: 2px solid #d97706;
  height: 100%;
  position: relative;
  padding: 8mm 14mm;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  text-align: center;
}
.cover-inner-border {
  position: absolute;
  inset: 2.5mm;
  border: 1px solid #f59e0b;
  pointer-events: none;
}
.cover-header {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.cover-medallion {
  width: 26mm;
  height: 26mm;
  background: #ffffff;
  border: 2.5px solid #d97706;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2.5mm;
  box-shadow: 0 4px 14px rgba(0,0,0,0.4);
}
.cover-medallion img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.cover-brand {
  color: #f59e0b;
  font-size: 18pt;
  font-weight: 800;
  margin-top: 3mm;
  letter-spacing: 2px;
}
.cover-atelier {
  color: #94a3b8;
  font-size: 8pt;
  font-weight: 600;
  letter-spacing: 1.2px;
  margin-top: 1mm;
}
.cover-line {
  width: 90mm;
  height: 2px;
  background: linear-gradient(90deg, transparent, #d97706, #fbbf24, #d97706, transparent);
  margin: 2.5mm auto 0 auto;
}
.cover-title-group {
  margin: 1.5mm 0;
}
.cover-title1 {
  font-size: 23pt;
  font-weight: 900;
  color: #ffffff;
  letter-spacing: 0.8px;
  line-height: 1.2;
}
.cover-title2 {
  font-size: 17pt;
  font-weight: 800;
  color: #fbbf24;
  letter-spacing: 1.5px;
  margin-top: 1.5mm;
}
.cover-edition {
  display: inline-block;
  background: rgba(217, 119, 6, 0.2);
  border: 1px solid #f59e0b;
  color: #fef3c7;
  padding: 1.2mm 6mm;
  border-radius: 3mm;
  font-size: 8pt;
  font-weight: 700;
  letter-spacing: 1.5px;
  margin-top: 2.5mm;
}
.cover-tagline1 {
  font-size: 8.5pt;
  color: #cbd5e1;
  margin-top: 2.5mm;
  font-weight: 500;
}
.cover-tagline2 {
  font-size: 7.5pt;
  color: #94a3b8;
  margin-top: 1mm;
}

.cover-pillars {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 3mm;
  margin: 2mm 0;
  text-align: left;
}
.cover-pillar-card {
  background: rgba(30, 41, 59, 0.7);
  border: 1px solid #334155;
  border-radius: 2mm;
  padding: 2.5mm 3.2mm;
}
.pillar-num {
  color: #fbbf24;
  font-size: 7pt;
  font-weight: 800;
  letter-spacing: 0.5px;
}
.pillar-head {
  color: #ffffff;
  font-size: 7.2pt;
  font-weight: 700;
  margin-top: 0.8mm;
  letter-spacing: 0.3px;
}
.pillar-body {
  color: #94a3b8;
  font-size: 6.2pt;
  line-height: 1.35;
  margin-top: 0.8mm;
}
.cover-footer {
  border-top: 1px solid #334155;
  padding-top: 2mm;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 6.8pt;
  color: #94a3b8;
}
.cover-footer strong {
  color: #f59e0b;
}

/* ABOUT PAGE */
.about-page {
  padding: 8mm 14mm;
  background: #0f172a;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.about-border {
  border: 1.5px solid #d97706;
  height: 100%;
  position: relative;
  padding: 6mm 10mm;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.about-grid {
  display: grid;
  grid-template-columns: 105mm 1fr;
  gap: 8mm;
  align-items: center;
  flex: 1;
}
.about-photo-frame {
  width: 100%;
  height: 145mm;
  border: 1.5px solid #f59e0b;
  border-radius: 3mm;
  overflow: hidden;
  box-shadow: 0 10px 25px rgba(0,0,0,0.5);
  background: #1e293b;
}
.about-photo-frame img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.about-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.about-tag {
  color: #f59e0b;
  font-size: 7.5pt;
  font-weight: 800;
  letter-spacing: 1.5px;
  text-transform: uppercase;
}
.about-title {
  font-size: 18pt;
  font-weight: 800;
  color: #ffffff;
  margin-top: 1mm;
  line-height: 1.25;
}
.about-desc {
  font-size: 7.8pt;
  color: #cbd5e1;
  line-height: 1.5;
  margin-top: 2.5mm;
}
.about-features {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3mm;
  margin-top: 4mm;
}
.feat-item {
  background: #1e293b;
  border-left: 2.5px solid #f59e0b;
  padding: 2.5mm 3mm;
  border-radius: 0 1.5mm 1.5mm 0;
}
.feat-title {
  color: #fbbf24;
  font-size: 7.5pt;
  font-weight: 700;
}
.feat-desc {
  color: #94a3b8;
  font-size: 6.6pt;
  margin-top: 0.8mm;
  line-height: 1.35;
}

/* SECTION DIVIDER */
.divider-page {
  background: #0f172a;
  color: #ffffff;
  padding: 10mm 14mm;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.divider-border {
  border: 2px solid #d97706;
  height: 100%;
  position: relative;
  padding: 12mm 16mm;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
}
.divider-series-tag {
  background: rgba(217, 119, 6, 0.2);
  border: 1px solid #f59e0b;
  color: #fef3c7;
  padding: 1.5mm 6mm;
  border-radius: 2mm;
  font-size: 8pt;
  font-weight: 800;
  letter-spacing: 2px;
  text-transform: uppercase;
}
.divider-title {
  font-size: 24pt;
  font-weight: 900;
  color: #ffffff;
  margin-top: 4mm;
  letter-spacing: 1px;
}
.divider-sub {
  font-size: 13pt;
  font-weight: 700;
  color: #fbbf24;
  margin-top: 2mm;
  letter-spacing: 1px;
}
.divider-desc {
  max-width: 170mm;
  font-size: 8.5pt;
  color: #94a3b8;
  line-height: 1.6;
  margin-top: 4mm;
}

/* PRODUCT PAGE */
.product-page {
  padding: 6mm 12mm 5mm 12mm;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.prod-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1.5px solid #e2e8f0;
  padding-bottom: 1.5mm;
}
.prod-header-left {
  display: flex;
  align-items: center;
  gap: 3mm;
}
.prod-emblem {
  width: 7.5mm;
  height: 7.5mm;
  object-fit: contain;
}
.prod-brand-lockup {
  display: flex;
  align-items: center;
  gap: 2mm;
}
.prod-brand-name {
  font-size: 8.5pt;
  font-weight: 800;
  letter-spacing: 1px;
  color: #0f172a;
}
.prod-division-tag {
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  color: #0284c7;
  font-size: 6.5pt;
  font-weight: 700;
  padding: 0.6mm 2mm;
  border-radius: 1mm;
  letter-spacing: 0.4px;
}
.prod-header-right {
  font-size: 7pt;
  color: #64748b;
  letter-spacing: 0.3px;
}
.prod-header-right strong {
  color: #0f172a;
}

/* STAGE CARD */
.prod-stage-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6mm;
  padding: 3mm 0;
  min-height: 0;
}
.prod-pedestal-card { flex: 1; height: 125mm; background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 3mm; overflow: hidden; position: relative; display: flex; align-items: center; justify-content: center; }

.prod-brick-img { max-width: 86%; max-height: 88%; object-fit: contain; position: relative; z-index: 2; }

.stage-badge-left, .stage-badge-right {
  position: absolute;
  display: flex;
  flex-direction: column;
  gap: 2mm;
  z-index: 3;
}
.stage-badge-left {
  top: 4mm;
  left: 4mm;
}
.stage-badge-right {
  top: 4mm;
  right: 4mm;
}
.badge-pill {
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(217, 119, 6, 0.6);
  
  color: #fef3c7;
  padding: 1.2mm 3mm;
  border-radius: 1.5mm;
  font-size: 6.5pt;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 1.5mm;
}
.badge-dot {
  width: 2mm;
  height: 2mm;
  border-radius: 50%;
  background: #f59e0b;
}

/* SPEC PANEL */
.prod-spec-panel {
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 2mm;
  padding: 2.5mm 4mm;
  display: flex;
  flex-direction: column;
  gap: 1.8mm;
}
.spec-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 1.2mm;
}
.spec-title-left {
  display: flex;
  align-items: baseline;
  gap: 2.5mm;
}
.spec-prod-name {
  font-size: 11pt;
  font-weight: 800;
  color: #0f172a;
}
.spec-prod-type {
  font-size: 7.2pt;
  color: #64748b;
  font-weight: 600;
}
.spec-prod-code {
  background: #0f172a;
  color: #fbbf24;
  font-size: 7.5pt;
  font-weight: 800;
  padding: 0.8mm 3mm;
  border-radius: 1mm;
  letter-spacing: 0.8px;
}
.spec-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2mm;
}
.spec-box {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 1mm;
  padding: 1.2mm 2mm;
}
.spec-box-label {
  font-size: 5.5pt;
  text-transform: uppercase;
  color: #64748b;
  font-weight: 700;
  letter-spacing: 0.3px;
}
.spec-box-val {
  font-size: 6.8pt;
  font-weight: 700;
  color: #0f172a;
  margin-top: 0.5mm;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.spec-desc-row {
  font-size: 6.5pt;
  color: #475569;
  line-height: 1.35;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 1mm;
  padding: 1.2mm 2.5mm;
}

/* FOOTER */
.prod-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #e2e8f0;
  padding-top: 1.5mm;
  font-size: 6.5pt;
  color: #64748b;
}
.prod-footer-brand strong {
  color: #0f172a;
}
.prod-footer-addr {
  letter-spacing: 0.3px;
}
.prod-footer-page {
  font-weight: 700;
  color: #0f172a;
}

/* INSTALLATION GUIDE */
.install-page {
  padding: 8mm 12mm;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.install-grid {
  display: grid;
  grid-template-columns: 95mm 1fr;
  gap: 6mm;
  align-items: center;
  flex: 1;
}
.install-photo-card {
  width: 100%;
  height: 155mm;
  border: 1px solid #cbd5e1;
  border-radius: 2mm;
  overflow: hidden;
  background: #0f172a;
}
.install-photo-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.install-steps-wrap {
  display: flex;
  flex-direction: column;
  gap: 2mm;
}
.install-step-item {
  display: flex;
  gap: 2.5mm;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 1.5mm;
  padding: 1.8mm 2.5mm;
}
.step-num {
  width: 5mm;
  height: 5mm;
  background: #0f172a;
  color: #fbbf24;
  border-radius: 50%;
  font-size: 6.5pt;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.step-content {
  display: flex;
  flex-direction: column;
}
.step-title {
  font-size: 7.2pt;
  font-weight: 700;
  color: #0f172a;
}
.step-body {
  font-size: 6.2pt;
  color: #475569;
  line-height: 1.3;
  margin-top: 0.4mm;
}

/* GALLERY SPREAD */
.gallery-page {
  padding: 8mm 12mm;
  background: #0f172a;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.gallery-card {
  width: 100%;
  height: 165mm;
  border: 1.5px solid #d97706;
  border-radius: 2mm;
  overflow: hidden;
  position: relative;
  box-shadow: 0 10px 30px rgba(0,0,0,0.6);
}
.gallery-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.gallery-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(0deg, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.7) 60%, transparent 100%);
  padding: 4mm 8mm;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}
.gallery-caption-title {
  color: #ffffff;
  font-size: 11pt;
  font-weight: 800;
}
.gallery-caption-desc {
  color: #cbd5e1;
  font-size: 7pt;
  margin-top: 0.8mm;
}
.gallery-loc-tag {
  background: rgba(217, 119, 6, 0.3);
  border: 1px solid #f59e0b;
  color: #fef3c7;
  padding: 1mm 3mm;
  border-radius: 1mm;
  font-size: 6.5pt;
  font-weight: 700;
}

/* BACK COVER */
.back-page {
  background: #0f172a;
  color: #ffffff;
  padding: 10mm 14mm;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.back-border {
  border: 2px solid #d97706;
  height: 100%;
  position: relative;
  padding: 6mm 10mm;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.matrix-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 6.5pt;
  margin-top: 2mm;
}
.matrix-table th {
  background: #1e293b;
  color: #fbbf24;
  padding: 1.8mm 2mm;
  text-align: left;
  border: 1px solid #334155;
  font-weight: 700;
}
.matrix-table td {
  padding: 1.5mm 2mm;
  border: 1px solid #334155;
  color: #cbd5e1;
}
.matrix-table tr:nth-child(even) td {
  background: rgba(30, 41, 59, 0.5);
}
"""


def generate_html():
    total_pages = 47
    css = generate_css()
    parts = []
    
    parts.append(f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Stone Tech Atelier — Architectural Hollow Glass Bricks Catalogue 2026-2027</title>
<style>
{css}
</style>
</head>
<body>
""")

    # ----------------------------------------------------
    # PAGE 1: COVER
    # ----------------------------------------------------
    parts.append(f"""
<div class="page cover-page">
  <div class="cover-border">
    <div class="cover-inner-border"></div>
    
    <div class="cover-header">
      <div class="cover-medallion">
        <img src="file://{EMBLEM_PATH}">
      </div>
      <div class="cover-brand">STONE TECH ATELIER</div>
      <div class="cover-atelier">ARCHITECTURAL HOLLOW GLASS BRICK DIVISION · SYSTEM ENGINEERED IN INDIA</div>
      <div class="cover-line"></div>
    </div>
    
    <div class="cover-title-group">
      <div class="cover-title1">ARCHITECTURAL HOLLOW GLASS BRICKS</div>
      <div class="cover-title2">LIGHT TRANSMISSION & THERMAL ACOUSTIC SERIES</div>
      <div class="cover-edition">2026 – 2027 MASTER SPECIFICATION CATALOGUE</div>
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
      <div>DIRECT SALES & ARCHITECTURAL ORDERS: <strong>+91 77420 90866</strong> · <strong>WWW.STONETECH.IN</strong></div>
      <div>DISPATCH: <strong>MUNDRA / JNPT PORTS</strong></div>
    </div>
  </div>
</div>
""")

    # ----------------------------------------------------
    # PAGE 2: ABOUT DIVISION
    # ----------------------------------------------------
    about_img = os.path.join(ASSETS_DIR, "about_photo.jpg")
    parts.append(f"""
<div class="page about-page">
  <div class="about-border">
    <div class="cover-inner-border"></div>
    <div class="prod-header" style="border-bottom:1px solid #334155;padding-bottom:1.5mm;">
      <div class="prod-header-left">
        <img src="file://{EMBLEM_PATH}" class="prod-emblem">
        <div class="prod-brand-lockup">
          <span class="prod-brand-name" style="color:#ffffff;">STONE TECH ATELIER</span>
          <span class="prod-division-tag" style="background:#1e293b;border-color:#334155;color:#38bdf8;">HOLLOW GLASS BRICKS DIVISION</span>
        </div>
      </div>
      <div class="prod-header-right" style="color:#94a3b8;">
        FACTORY DIRECT ORDERS: <strong style="color:#fbbf24;">+91 77420 90866</strong> · <strong style="color:#ffffff;">WWW.STONETECH.IN</strong>
      </div>
    </div>
    
    <div class="about-grid">
      <div class="about-photo-frame">
        <img src="file://{about_img}">
      </div>
      <div class="about-content">
        <div class="about-tag">ARCHITECTURAL INNOVATION · LIGHT & THERMAL CONTROL</div>
        <div class="about-title">ENGINEERING LIGHT, PRIVACY & STRUCTURAL ELEGANCE</div>
        <div class="about-desc">
          Stone Tech Atelier is a premier Indian architectural manufacturer and engineering specialist delivering world-class glass masonry solutions. Our Hollow Glass Brick series redefines modern interior and exterior envelope design by fusing optical transparency with structural fortitude and unmatched thermal-acoustic performance.
          <br><br>
          Manufactured through precision thermal fusion of two kiln-cast glass halves, every block encapsulates a permanent partial vacuum hermetic core. This sealed chamber delivers thermal insulation comparable to double-glazed facade systems while attenuating airborne noise up to 42 dB.
        </div>
        
        <div class="about-features">
          <div class="feat-item">
            <div class="feat-title">Hermetic Vacuum Welding</div>
            <div class="feat-desc">Two high-purity glass shells welded at 800°C under negative pressure, creating a sealed insulating cavity that resists internal condensation.</div>
          </div>
          <div class="feat-item">
            <div class="feat-title">VetroKwik™ Modular System</div>
            <div class="feat-desc">Proprietary interlocking PVC spacer rails and structural silicone matrix allowing rapid mortarless dry-stack installation.</div>
          </div>
          <div class="feat-item">
            <div class="feat-title">EN 1051 & ASTM C935 Compliance</div>
            <div class="feat-desc">Rigorously batch-tested for compressive load (>7.5 N/mm²), thermal shock resistance, and Class E/EW30 fire integrity.</div>
          </div>
          <div class="feat-item">
            <div class="feat-title">Direct Atelier Support</div>
            <div class="feat-desc">Direct technical CAD detailing, structural engineering calculations, and door-to-door insured transit across India and overseas.</div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="prod-footer" style="border-top:1px solid #334155;color:#94a3b8;">
      <div class="prod-footer-brand"><strong style="color:#ffffff;">STONE TECH ATELIER</strong> · ARCHITECTURAL SPECIFICATIONS 2026-27</div>
      <div class="prod-footer-addr">EXPERIENCE CENTER: E-02, SG BUSINESS HUB, GOTA, AHMEDABAD · WHATSAPP: +91 77420 90866</div>
      <div class="prod-footer-page" style="color:#fbbf24;">Page 2 / {total_pages}</div>
    </div>
  </div>
</div>
""")

    # ----------------------------------------------------
    # PAGE 3: COLLECTION I DIVIDER — CLEAR ARCHITECTURAL SERIES
    # ----------------------------------------------------
    parts.append(f"""
<div class="page divider-page">
  <div class="divider-border">
    <div class="cover-inner-border"></div>
    <div class="divider-series-tag">COLLECTION I · 23 MASTER PATTERNS</div>
    <div class="divider-title">CLEAR ARCHITECTURAL HOLLOW GLASS BRICKS</div>
    <div class="divider-sub">WAVE, REEDED, CHECKERED, PRISMATIC & END-CAP TERMINALS</div>
    <div class="divider-desc">
      A curated collection of precision-cast clear glass blocks engineered for maximum daylight harvesting, visual privacy obscuration, and architectural acoustic insulation. Available in standard 190×190×80mm, compact 145×145×80mm, mini 115×115×80mm, grand 240×240×80mm formats, plus finished bullnose end-cap terminal units.
    </div>
  </div>
</div>
""")

    # ----------------------------------------------------
    # PAGES 4 - 26: 23 CLEAR PRODUCTS
    # ----------------------------------------------------
    current_page = 4
    for prod in PRODUCTS[:23]:
        img_path = os.path.join(ASSETS_DIR, prod["img"])
        parts.append(f"""
<div class="page product-page">
  <div class="prod-header">
    <div class="prod-header-left">
      <img src="file://{EMBLEM_PATH}" class="prod-emblem">
      <div class="prod-brand-lockup">
        <span class="prod-brand-name">STONE TECH ATELIER</span>
        <span class="prod-division-tag">HOLLOW GLASS BRICKS</span>
        <span style="font-size:6.5pt;background:#fef3c7;border:1px solid #fde68a;color:#b45309;padding:0.6mm 2mm;border-radius:1mm;font-weight:700;">{prod['collection']}</span>
      </div>
    </div>
    <div class="prod-header-right">
      FACTORY DIRECT ORDERS: <strong>+91 77420 90866</strong> · <strong>WWW.STONETECH.IN</strong>
    </div>
  </div>
  
  <div class="prod-stage-container">
    <div class="prod-pedestal-card">
      <div class="stage-badge-left">
        <div class="badge-pill"><div class="badge-dot"></div> {prod['sound']}</div>
        <div class="badge-pill"><div class="badge-dot"></div> Thermal U ≈ {prod['u_value']}</div>
      </div>
      <div class="stage-badge-right">
        <div class="badge-pill"><div class="badge-dot"></div> Strength: {prod['compressive']}</div>
        <div class="badge-pill"><div class="badge-dot"></div> VetroKwik™ Dry-Interlock</div>
      </div>
      <img src="file://{img_path}" class="prod-brick-img">
    </div>
  </div>
  
  <div class="prod-spec-panel">
    <div class="spec-header-row">
      <div class="spec-title-left">
        <span class="spec-prod-name">{prod['name']}</span>
        <span class="spec-prod-type">{prod['type']}</span>
      </div>
      <div class="spec-prod-code">{prod['code']}</div>
    </div>
    
    <div class="spec-grid">
      <div class="spec-box">
        <div class="spec-box-label">Dimensions</div>
        <div class="spec-box-val">{prod['size']}</div>
      </div>
      <div class="spec-box">
        <div class="spec-box-label">Unit Weight</div>
        <div class="spec-box-val">{prod['weight']}</div>
      </div>
      <div class="spec-box">
        <div class="spec-box-label">Packaging</div>
        <div class="spec-box-val">{prod['packing']}</div>
      </div>
      <div class="spec-box">
        <div class="spec-box-label">Light Trans.</div>
        <div class="spec-box-val">{prod['light_trans']}</div>
      </div>
      <div class="spec-box">
        <div class="spec-box-label">Acoustic Shield</div>
        <div class="spec-box-val">{prod['sound']}</div>
      </div>
      <div class="spec-box">
        <div class="spec-box-label">Fire Rating</div>
        <div class="spec-box-val">{prod['fire']}</div>
      </div>
      <div class="spec-box">
        <div class="spec-box-label">Dry-Grid System</div>
        <div class="spec-box-val">VetroKwik™ / 10mm</div>
      </div>
    </div>
    
    <div class="spec-desc-row">
      <strong>Architectural Application:</strong> {prod['desc']}
    </div>
  </div>
  
  <div class="prod-footer">
    <div class="prod-footer-brand"><strong>STONE TECH ATELIER</strong> · ARCHITECTURAL HOLLOW GLASS BRICK DIVISION</div>
    <div class="prod-footer-addr">AHMEDABAD EXPERIENCE CENTER · DIRECT WHATSAPP: +91 77420 90866 · INFO@STONETECH.IN</div>
    <div class="prod-footer-page">Page {current_page} / {total_pages}</div>
  </div>
</div>
""")
        current_page += 1

    # ----------------------------------------------------
    # PAGE 27: COLLECTION II DIVIDER — IN-COLOR & TRANSLUCENT TINTED SERIES
    # ----------------------------------------------------
    parts.append(f"""
<div class="page divider-page">
  <div class="divider-border">
    <div class="cover-inner-border"></div>
    <div class="divider-series-tag">COLLECTION II · 15 ARTISANAL COLORS</div>
    <div class="divider-title">IN-COLOR & TRANSLUCENT TINTED HOLLOW GLASS BRICKS</div>
    <div class="divider-sub">INNER-CORE GLAZED TINTS & MONOLITHIC BODY-COLOURED GLASS</div>
    <div class="divider-desc">
      Engineered for vibrant architectural feature walls, hospitality lounge dividers, and dramatic accent lighting. Featuring Inner-Color (IC) glazed hermetic cores that emit rich jewel tones, alongside through-body translucent tinted blocks crafted from homogeneous molten colored glass.
    </div>
  </div>
</div>
""")
    current_page += 1

    # ----------------------------------------------------
    # PAGES 28 - 42: 15 IN-COLOR & TINTED PRODUCTS
    # ----------------------------------------------------
    for prod in PRODUCTS[23:]:
        img_path = os.path.join(ASSETS_DIR, prod["img"])
        parts.append(f"""
<div class="page product-page">
  <div class="prod-header">
    <div class="prod-header-left">
      <img src="file://{EMBLEM_PATH}" class="prod-emblem">
      <div class="prod-brand-lockup">
        <span class="prod-brand-name">STONE TECH ATELIER</span>
        <span class="prod-division-tag">HOLLOW GLASS BRICKS</span>
        <span style="font-size:6.5pt;background:#dbeafe;border:1px solid #bfdbfe;color:#1d4ed8;padding:0.6mm 2mm;border-radius:1mm;font-weight:700;">{prod['collection']}</span>
      </div>
    </div>
    <div class="prod-header-right">
      FACTORY DIRECT ORDERS: <strong>+91 77420 90866</strong> · <strong>WWW.STONETECH.IN</strong>
    </div>
  </div>
  
  <div class="prod-stage-container">
    <div class="prod-pedestal-card">
      <div class="stage-badge-left">
        <div class="badge-pill"><div class="badge-dot"></div> {prod['sound']}</div>
        <div class="badge-pill"><div class="badge-dot"></div> Thermal U ≈ {prod['u_value']}</div>
      </div>
      <div class="stage-badge-right">
        <div class="badge-pill"><div class="badge-dot"></div> Strength: {prod['compressive']}</div>
        <div class="badge-pill"><div class="badge-dot"></div> VetroKwik™ Dry-Interlock</div>
      </div>
      <img src="file://{img_path}" class="prod-brick-img">
    </div>
  </div>
  
  <div class="prod-spec-panel">
    <div class="spec-header-row">
      <div class="spec-title-left">
        <span class="spec-prod-name">{prod['name']}</span>
        <span class="spec-prod-type">{prod['type']}</span>
      </div>
      <div class="spec-prod-code">{prod['code']}</div>
    </div>
    
    <div class="spec-grid">
      <div class="spec-box">
        <div class="spec-box-label">Dimensions</div>
        <div class="spec-box-val">{prod['size']}</div>
      </div>
      <div class="spec-box">
        <div class="spec-box-label">Unit Weight</div>
        <div class="spec-box-val">{prod['weight']}</div>
      </div>
      <div class="spec-box">
        <div class="spec-box-label">Packaging</div>
        <div class="spec-box-val">{prod['packing']}</div>
      </div>
      <div class="spec-box">
        <div class="spec-box-label">Light Trans.</div>
        <div class="spec-box-val">{prod['light_trans']}</div>
      </div>
      <div class="spec-box">
        <div class="spec-box-label">Acoustic Shield</div>
        <div class="spec-box-val">{prod['sound']}</div>
      </div>
      <div class="spec-box">
        <div class="spec-box-label">Fire Rating</div>
        <div class="spec-box-val">{prod['fire']}</div>
      </div>
      <div class="spec-box">
        <div class="spec-box-label">Dry-Grid System</div>
        <div class="spec-box-val">VetroKwik™ / 10mm</div>
      </div>
    </div>
    
    <div class="spec-desc-row">
      <strong>Architectural Application:</strong> {prod['desc']}
    </div>
  </div>
  
  <div class="prod-footer">
    <div class="prod-footer-brand"><strong>STONE TECH ATELIER</strong> · ARCHITECTURAL HOLLOW GLASS BRICK DIVISION</div>
    <div class="prod-footer-addr">AHMEDABAD EXPERIENCE CENTER · DIRECT WHATSAPP: +91 77420 90866 · INFO@STONETECH.IN</div>
    <div class="prod-footer-page">Page {current_page} / {total_pages}</div>
  </div>
</div>
""")
        current_page += 1

    # ----------------------------------------------------
    # PAGE 43: VETROKWIK™ MODULAR DRY-INTERLOCK INSTALLATION GUIDE
    # ----------------------------------------------------
    install_img = os.path.join(ASSETS_DIR, "install_photo.jpg")
    parts.append(f"""
<div class="page install-page">
  <div class="prod-header">
    <div class="prod-header-left">
      <img src="file://{EMBLEM_PATH}" class="prod-emblem">
      <div class="prod-brand-lockup">
        <span class="prod-brand-name">STONE TECH ATELIER</span>
        <span class="prod-division-tag">INSTALLATION ENGINEERING</span>
      </div>
    </div>
    <div class="prod-header-right">
      TECHNICAL HELPLINE: <strong>+91 77420 90866</strong> · <strong>WWW.STONETECH.IN</strong>
    </div>
  </div>
  
  <div class="install-grid">
    <div class="install-photo-card">
      <img src="file://{install_img}">
    </div>
    
    <div class="install-steps-wrap">
      <div style="font-size:13pt;font-weight:800;color:#0f172a;margin-bottom:1mm;">
        VETROKWIK™ MODULAR DRY-INTERLOCK SYSTEM
      </div>
      <div style="font-size:6.8pt;color:#64748b;margin-bottom:2mm;">
        Fast, mortar-free precision installation protocol utilizing engineering-grade PVC alignment profiles and high-modulus structural silicone beads.
      </div>
      
      <div class="install-step-item">
        <div class="step-num">1</div>
        <div class="step-content">
          <div class="step-title">Perimeter Base Channel Anchoring</div>
          <div class="step-body">Fasten extruded aluminum or PVC perimeter channels securely to floor and vertical walls using M6 anchor bolts at 300mm intervals. Apply elastomeric foam expansion tape along all perimeter joints.</div>
        </div>
      </div>
      
      <div class="install-step-item">
        <div class="step-num">2</div>
        <div class="step-content">
          <div class="step-title">Base Track Alignment & Spacers</div>
          <div class="step-body">Insert horizontal starter track into the base perimeter channel. Apply dual continuous 4mm beads of neutral-cure structural glass silicone along the bottom receiving surface.</div>
        </div>
      </div>
      
      <div class="install-step-item">
        <div class="step-num">3</div>
        <div class="step-content">
          <div class="step-title">First Course Setting & Vertical Spacers</div>
          <div class="step-body">Position the first glass block snugly against the end wall. Insert vertical VetroKwik™ interlocking cross spacers between blocks, ensuring uniform 10mm joint spacing and absolute plumbness.</div>
        </div>
      </div>
      
      <div class="install-step-item">
        <div class="step-num">4</div>
        <div class="step-content">
          <div class="step-title">Interlocking Horizontal Grid Rails</div>
          <div class="step-body">Lay horizontal interlocking PVC track profiles across each completed course. The track locks securely into the vertical spacers, distributing compressive load and ensuring plane flatness.</div>
        </div>
      </div>
      
      <div class="install-step-item">
        <div class="step-num">5</div>
        <div class="step-content">
          <div class="step-title">Stainless Steel Wall Tie Reinforcement</div>
          <div class="step-body">For partitions exceeding 1.5m in height, anchor stainless steel seismic wall tie straps (AISI 304) every third course into the structural jamb to guarantee extreme lateral shear stability.</div>
        </div>
      </div>
      
      <div class="install-step-item">
        <div class="step-num">6</div>
        <div class="step-content">
          <div class="step-title">Top Course & Expansion Clearance</div>
          <div class="step-body">Maintain a minimum 12mm expansion gap between the top glass course and the ceiling channel. Fill the gap with closed-cell polyurethane foam backer rod before sealing.</div>
        </div>
      </div>
      
      <div class="install-step-item">
        <div class="step-num">7</div>
        <div class="step-content">
          <div class="step-title">Micro-Silicone Joint Pointing & Clean-Down</div>
          <div class="step-body">After 24 hours of curing, fill the external joint recesses with color-matched antifungal silicone or specialized fine glass grout. Clean block faces with soft micro-fiber towels.</div>
        </div>
      </div>
    </div>
  </div>
  
  <div class="prod-footer">
    <div class="prod-footer-brand"><strong>STONE TECH ATELIER</strong> · TECHNICAL INSTALLATION MANUAL</div>
    <div class="prod-footer-addr">ENGINEERING SUPPORT: +91 77420 90866 · INFO@STONETECH.IN</div>
    <div class="prod-footer-page">Page 43 / {total_pages}</div>
  </div>
</div>
""")

    # ----------------------------------------------------
    # PAGES 44 - 46: 3 ARCHITECTURAL REFERENCE PORTFOLIO GALLERIES
    # ----------------------------------------------------
    galleries = [
        (44, "gallery_46.jpg", "LUXURY RESIDENTIAL ATRIUM & LIGHTWELL SCREEN", "Floor-to-ceiling curved glass brick wall casting diffused organic sunlight across a bespoke staircase sanctuary.", "AHMEDABAD PRIVATE RESIDENCE"),
        (45, "gallery_47.jpg", "EXECUTIVE CORPORATE SUITE & WELLNESS PARTITION", "Acoustic 42 dB privacy wall separating boardroom suites while maintaining open luminous sightlines.", "FINANCIAL DISTRICT HEADQUARTERS"),
        (46, "gallery_48.jpg", "BOUTIQUE HOSPITALITY LOUNGE & MOOD LIGHTING", "Illuminated glass brick feature bar facade with integrated warm ambient LEDs.", "LUXURY RESORT & SPA, GOA")
    ]
    for p_num, g_file, g_title, g_desc, g_loc in galleries:
        g_path = os.path.join(ASSETS_DIR, g_file)
        parts.append(f"""
<div class="page gallery-page">
  <div class="prod-header" style="border-bottom:1px solid #334155;padding-bottom:1.5mm;">
    <div class="prod-header-left">
      <img src="file://{EMBLEM_PATH}" class="prod-emblem">
      <div class="prod-brand-lockup">
        <span class="prod-brand-name" style="color:#ffffff;">STONE TECH ATELIER</span>
        <span class="prod-division-tag" style="background:#1e293b;border-color:#334155;color:#38bdf8;">ARCHITECTURAL PORTFOLIO</span>
      </div>
    </div>
    <div class="prod-header-right" style="color:#94a3b8;">
      PROJECT INQUIRIES: <strong style="color:#fbbf24;">+91 77420 90866</strong> · <strong style="color:#ffffff;">WWW.STONETECH.IN</strong>
    </div>
  </div>
  
  <div class="gallery-card">
    <img src="file://{g_path}" class="gallery-img">
    <div class="gallery-overlay">
      <div>
        <div class="gallery-caption-title">{g_title}</div>
        <div class="gallery-caption-desc">{g_desc}</div>
      </div>
      <div class="gallery-loc-tag">{g_loc}</div>
    </div>
  </div>
  
  <div class="prod-footer" style="border-top:1px solid #334155;color:#94a3b8;">
    <div class="prod-footer-brand"><strong style="color:#ffffff;">STONE TECH ATELIER</strong> · ARCHITECTURAL REFERENCE WORKS</div>
    <div class="prod-footer-addr">EXPERIENCE CENTER: E-02, SG BUSINESS HUB, GOTA, AHMEDABAD · WHATSAPP: +91 77420 90866</div>
    <div class="prod-footer-page" style="color:#fbbf24;">Page {p_num} / {total_pages}</div>
  </div>
</div>
""")

    # ----------------------------------------------------
    # PAGE 47: ENGINEERING MATRIX & BACK COVER
    # ----------------------------------------------------
    parts.append(f"""
<div class="page back-page">
  <div class="back-border">
    <div class="cover-inner-border"></div>
    
    <div class="prod-header" style="border-bottom:1px solid #334155;padding-bottom:1.5mm;">
      <div class="prod-header-left">
        <img src="file://{EMBLEM_PATH}" class="prod-emblem">
        <div class="prod-brand-lockup">
          <span class="prod-brand-name" style="color:#ffffff;">STONE TECH ATELIER</span>
          <span class="prod-division-tag" style="background:#1e293b;border-color:#334155;color:#38bdf8;">ENGINEERING MATRIX</span>
        </div>
      </div>
      <div class="prod-header-right" style="color:#94a3b8;">
        DIRECT FACTORY ORDERS: <strong style="color:#fbbf24;">+91 77420 90866</strong> · <strong style="color:#ffffff;">WWW.STONETECH.IN</strong>
      </div>
    </div>
    
    <div>
      <div style="font-size:11pt;font-weight:800;color:#fbbf24;margin-top:1.5mm;">
        ARCHITECTURAL HOLLOW GLASS BRICKS · TECHNICAL PERFORMANCE MATRIX
      </div>
      <div style="font-size:6.8pt;color:#94a3b8;margin-top:0.5mm;">
        Standard Testing Compliance: EN 1051-1, EN 1051-2, ASTM C935, DIN 18175 & ISO 9001:2015 Manufacturing Quality Standards.
      </div>
      
      <table class="matrix-table">
        <thead>
          <tr>
            <th>Technical Characteristic</th>
            <th>Standard Reference</th>
            <th>190×190×80mm Standard</th>
            <th>145×145×80mm Compact</th>
            <th>240×240×80mm Grand</th>
            <th>Architectural Impact</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Sound Insulation (Rw)</strong></td>
            <td>EN ISO 717-1</td>
            <td>40 – 42 dB</td>
            <td>39 – 41 dB</td>
            <td>42 – 43 dB</td>
            <td>Acoustic speech privacy for boardrooms & master suites</td>
          </tr>
          <tr>
            <td><strong>Thermal Transmittance (U-Value)</strong></td>
            <td>EN 673 / ISO 10292</td>
            <td>~ 1.50 W/m²K</td>
            <td>~ 1.60 W/m²K</td>
            <td>~ 1.45 W/m²K</td>
            <td>Energy conservation equivalent to high-performance double glazing</td>
          </tr>
          <tr>
            <td><strong>Compressive Failure Load</strong></td>
            <td>EN 1051-1</td>
            <td>> 7.5 N/mm² (Avg. 8.2)</td>
            <td>> 8.5 N/mm² (Avg. 9.1)</td>
            <td>> 7.2 N/mm² (Avg. 7.8)</td>
            <td>Rigid high load-bearing capacity for tall interior partitions</td>
          </tr>
          <tr>
            <td><strong>Fire Resistance Rating</strong></td>
            <td>EN 13501-2</td>
            <td>Class E 60 / EW 30</td>
            <td>Class E 60 / EW 30</td>
            <td>Class E 30 / EW 30</td>
            <td>Flame and smoke containment with radiation attenuation</td>
          </tr>
          <tr>
            <td><strong>Light Transmittance (Clear)</strong></td>
            <td>DIN 5036-3</td>
            <td>75% – 82%</td>
            <td>78% – 81%</td>
            <td>82% – 85%</td>
            <td>Maximizes natural ambient illumination with zero artificial glare</td>
          </tr>
          <tr>
            <td><strong>Thermal Shock Resistance</strong></td>
            <td>EN 1051-1</td>
            <td>ΔT ≥ 30°C (No failure)</td>
            <td>ΔT ≥ 30°C (No failure)</td>
            <td>ΔT ≥ 30°C (No failure)</td>
            <td>Resists sudden environmental temperature fluctuations</td>
          </tr>
          <tr>
            <td><strong>Carton Packaging & Palletizing</strong></td>
            <td>Export Standards</td>
            <td>6 pcs / ctn · 13.8 kg</td>
            <td>10 pcs / ctn · 15.0 kg</td>
            <td>10 pcs / ctn · 38.5 kg</td>
            <td>ISPM-15 fumigated palletizing for zero-breakage ocean shipping</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin-top:2mm;">
      <div style="background:#1e293b;border:1px solid #334155;border-radius:2mm;padding:2.5mm 3.5mm;">
        <div style="color:#fbbf24;font-size:7.5pt;font-weight:700;">ORDERING & SPECIFICATION PROTOCOL</div>
        <div style="font-size:6.3pt;color:#cbd5e1;line-height:1.4;margin-top:1mm;">
          1. <strong>Select Product Code:</strong> Reference codes (e.g. ST-HGB-001 Seaview, ST-HGB-030 Turquoise IC).<br>
          2. <strong>Elevation Review:</strong> Provide wall dimensions (Length × Height) for automated block count & PVC grid spacing calculation.<br>
          3. <strong>Complete System Delivery:</strong> Blocks, VetroKwik™ spacers, structural silicone, and perimeter channels bundled together.
        </div>
      </div>
      
      <div style="background:#1e293b;border:1px solid #334155;border-radius:2mm;padding:2.5mm 3.5mm;">
        <div style="color:#fbbf24;font-size:7.5pt;font-weight:700;">VISIT OUR ATELIER & EXPERIENCE CENTER</div>
        <div style="font-size:6.3pt;color:#cbd5e1;line-height:1.4;margin-top:1mm;">
          <strong>Ahmedabad Experience Center:</strong> E-02, Ground Floor, SG Business Hub, Vasant Nagar, Gota, Ahmedabad, Gujarat 380060.<br>
          <strong>Direct WhatsApp & Calls:</strong> +91 77420 90866 / +91 97844 52998<br>
          <strong>Global Dispatch Ports:</strong> Mundra Port / JNPT Port, India · Insured Door-to-Door Delivery Worldwide.
        </div>
      </div>
    </div>
    
    <div class="prod-footer" style="border-top:1px solid #334155;color:#94a3b8;padding-top:1.5mm;">
      <div>© 2026 STONE TECH ATELIER · HOLLOW GLASS BRICK DIVISION. ALL RIGHTS RESERVED.</div>
      <div>WWW.STONETECH.IN · INFO@STONETECH.IN</div>
      <div style="color:#fbbf24;">Page 47 / {total_pages}</div>
    </div>
  </div>
</div>
""")

    parts.append("</body>\n</html>")
    return "\n".join(parts)


def compile_pdf(html_content, output_path):
    temp_html = f"/tmp/hollow_glass_{int(time.time() * 1000)}.html"
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
    print(f"Compiling Hollow Glass Bricks PDF to: {output_path}...")
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print("Chrome error:", res.stderr)
        raise RuntimeError(f"Chrome PDF generation failed with code {res.returncode}")

    if os.path.exists(temp_html):
        os.remove(temp_html)

    size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"SUCCESS: Generated {output_path} ({size_mb:.2f} MB)")


def main():
    print("Generating Hollow Glass Bricks Catalogue HTML...")
    html_content = generate_html()
    compile_pdf(html_content, OUTPUT_PDF)
    
    # Mirror to ~/Downloads/
    shutil.copyfile(OUTPUT_PDF, DOWNLOADS_PDF)
    print(f"Mirrored catalogue to {DOWNLOADS_PDF}")


if __name__ == "__main__":
    main()

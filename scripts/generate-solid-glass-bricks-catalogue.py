#!/usr/bin/env python3
"""
Stone Tech Atelier — Architectural Solid Optical Glass Bricks Catalogue Generator (2026-2027)
Strictly adheres to Stone Tech Atelier Luxury Architectural Design System (Landscape A4: 297mm x 210mm).
Showcases 29 Master Products with Dual-Card Crystalline Showcase (Brick Close-Up + Live Executed Architectural Scene).
Compiles via Headless Google Chrome with zero tofu boxes and ultra-crisp optics under 24MB.
"""

import os
import sys
import time
import subprocess
import shutil

REPO_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ASSETS_DIR = os.path.join(REPO_DIR, "public/catalogues/solid-glass-assets")
BRANDING_DIR = os.path.join(REPO_DIR, "public/branding")
OUTPUT_PDF = os.path.join(REPO_DIR, "public/catalogues/StoneTech_Solid_Glass_Bricks_Catalogue_2026.pdf")
DOWNLOADS_PDF = os.path.expanduser("~/Downloads/StoneTech_Solid_Glass_Bricks_Catalogue_2026.pdf")

EMBLEM_PATH = os.path.join(BRANDING_DIR, "stone-tech-emblem-hq.png")
BADGE_PATH = os.path.join(BRANDING_DIR, "stone-tech-manufacturer-badge.png")

# 29 Solid Optical Glass Brick Products
PRODUCTS = [
    # Collection I: Optical Clear Crystal Series (8 products)
    {
        "code": "ST-SGB-001",
        "name": "Super Clear",
        "model": "JB-30",
        "collection": "Optical Clear Crystal Series",
        "type": "Optical Grade Solid Crystal Brick",
        "size": "200 × 100 × 50 mm",
        "weight": "2.50 kg / pc",
        "packing": "6 pcs / carton · 15.0 kg",
        "light_trans": "99.2% Pure Optical",
        "compressive": "> 150 MPa Load",
        "refractive": "nd = 1.52",
        "joint": "UV Structural / Clear Silicone",
        "brick_img": "solid_p4_brick.jpg",
        "scene_img": "solid_p4_scene.jpg",
        "desc": "Ultra-clear high-purity K9 optical borosilicate crystal glass annealed to eliminate internal birefringence, offering museum-grade transparency."
    },
    {
        "code": "ST-SGB-002",
        "name": "Clear Rock Finish",
        "model": "JB ROCK-30",
        "collection": "Optical Clear Crystal Series",
        "type": "Chiseled Rock-Face Solid Crystal Brick",
        "size": "200 × 100 × 50 mm",
        "weight": "2.50 kg / pc",
        "packing": "6 pcs / carton · 15.0 kg",
        "light_trans": "95.5% Prismatic Sparkle",
        "compressive": "> 150 MPa Load",
        "refractive": "nd = 1.52",
        "joint": "UV Structural / Clear Silicone",
        "brick_img": "solid_p5_brick.jpg",
        "scene_img": "solid_p5_scene.jpg",
        "desc": "Hand-chiseled raw mineral rock edges capturing and dispersing light into glistening crystal prismatic flares across luxury hospitality counters."
    },
    {
        "code": "ST-SGB-003",
        "name": "Clear Rock with Rebar Core",
        "model": "JB ROCK-30WH",
        "collection": "Optical Clear Crystal Series",
        "type": "Structural Through-Hole Crystal Brick",
        "size": "200 × 100 × 50 mm (Ø16mm Hole)",
        "weight": "2.45 kg / pc",
        "packing": "6 pcs / carton · 14.7 kg",
        "light_trans": "94.8% Structural Glass",
        "compressive": "> 160 MPa Reinforced",
        "refractive": "nd = 1.52",
        "joint": "Stainless Steel Rod + UV Resin",
        "brick_img": "solid_p6_brick.jpg",
        "scene_img": "solid_p6_scene.jpg",
        "desc": "Engineered with a centered Ø16mm vertical through-hole to receive continuous stainless steel tie-rods, enabling soaring earthquake-resistant glass masonry walls."
    },
    {
        "code": "ST-SGB-004",
        "name": "Clear Sandblast Frosted",
        "model": "JB-30BLT6",
        "collection": "Optical Clear Crystal Series",
        "type": "Acid-Etched Satin Solid Crystal Brick",
        "size": "200 × 100 × 50 mm",
        "weight": "2.50 kg / pc",
        "packing": "6 pcs / carton · 15.0 kg",
        "light_trans": "82.0% Velvet Glow",
        "compressive": "> 150 MPa Load",
        "refractive": "nd = 1.52",
        "joint": "UV Structural / Clear Silicone",
        "brick_img": "solid_p7_brick.jpg",
        "scene_img": "solid_p7_scene.jpg",
        "desc": "Micro-sandblasted velvety matte finish diffusing direct backlighting into a soft, monolithic luminous glow for high-end spa and boutique feature panels."
    },
    {
        "code": "ST-SGB-005",
        "name": "Super Clear Half Brick",
        "model": "JH-30 HALF",
        "collection": "Optical Clear Crystal Series",
        "type": "Half-Modular Solid Crystal Brick",
        "size": "100 × 100 × 50 mm",
        "weight": "1.25 kg / pc",
        "packing": "12 pcs / carton · 15.0 kg",
        "light_trans": "99.2% Pure Optical",
        "compressive": "> 150 MPa Load",
        "refractive": "nd = 1.52",
        "joint": "UV Structural / Clear Silicone",
        "brick_img": "solid_p8_brick.jpg",
        "scene_img": "solid_p8_scene.jpg",
        "desc": "Precision square half-brick designed for half-stagger running bond masonry, crisp 90-degree corner returns, and decorative border detailing."
    },
    {
        "code": "ST-SGB-006",
        "name": "Sandblast Half Brick",
        "model": "JH-30 BLT6-HALF",
        "collection": "Optical Clear Crystal Series",
        "type": "Half-Modular Frosted Crystal Brick",
        "size": "100 × 100 × 50 mm",
        "weight": "1.25 kg / pc",
        "packing": "12 pcs / carton · 15.0 kg",
        "light_trans": "82.0% Velvet Glow",
        "compressive": "> 150 MPa Load",
        "refractive": "nd = 1.52",
        "joint": "UV Structural / Clear Silicone",
        "brick_img": "solid_p9_brick.jpg",
        "scene_img": "solid_p9_scene.jpg",
        "desc": "Frosted half-unit enabling seamless pattern termination and alternating matte-polished checkerboard compositions."
    },
    {
        "code": "ST-SGB-007",
        "name": "Clear Rock Half Brick",
        "model": "JH ROCK-30 HALF",
        "collection": "Optical Clear Crystal Series",
        "type": "Half-Modular Chiseled Crystal Brick",
        "size": "100 × 100 × 50 mm",
        "weight": "1.25 kg / pc",
        "packing": "12 pcs / carton · 15.0 kg",
        "light_trans": "95.5% Prismatic Sparkle",
        "compressive": "> 150 MPa Load",
        "refractive": "nd = 1.52",
        "joint": "UV Structural / Clear Silicone",
        "brick_img": "solid_p10_brick.jpg",
        "scene_img": "solid_p10_scene.jpg",
        "desc": "Chiseled edge half-brick designed to terminate chiseled masonry courses with raw, organic geological beauty."
    },
    {
        "code": "ST-SGB-008",
        "name": "Moon White Circular Lens",
        "model": "M-101",
        "collection": "Optical Clear Crystal Series",
        "type": "Concave Optical Crystal Paver / Wall Block",
        "size": "150 × 150 × 60 mm",
        "weight": "3.20 kg / pc",
        "packing": "4 pcs / carton · 12.8 kg",
        "light_trans": "91.0% Concentrated Beam",
        "compressive": "> 180 MPa Ultra-High",
        "refractive": "nd = 1.53",
        "joint": "Precast Concrete / Steel Ring",
        "brick_img": "solid_p11_brick.jpg",
        "scene_img": "solid_p11_scene.jpg",
        "desc": "Heavyweight circular optical lens brick engineered for walk-on glass pavement floors, illuminated skylights, and monumental architectural portholes."
    },

    # Collection II: Vibrant Translucent Tinted & Rock Series (13 products)
    {
        "code": "ST-SGB-009",
        "name": "Midnight Black",
        "model": "JB-37",
        "collection": "Vibrant Translucent Tinted Series",
        "type": "Obsidian Crystal Solid Brick",
        "size": "200 × 100 × 50 mm",
        "weight": "2.50 kg / pc",
        "packing": "6 pcs / carton · 15.0 kg",
        "light_trans": "28.0% Obsidian Shadow",
        "compressive": "> 150 MPa Load",
        "refractive": "nd = 1.53",
        "joint": "UV Structural / Black Silicone",
        "brick_img": "solid_p12_brick.jpg",
        "scene_img": "solid_p12_scene.jpg",
        "desc": "Lustrous translucent obsidian crystal glass offering sleek high-contrast mystery and dramatic architectural mood lighting."
    },
    {
        "code": "ST-SGB-010",
        "name": "Ocean Blue",
        "model": "JB-32",
        "collection": "Vibrant Translucent Tinted Series",
        "type": "Through-Body Tinted Crystal Brick",
        "size": "200 × 100 × 50 mm",
        "weight": "2.50 kg / pc",
        "packing": "6 pcs / carton · 15.0 kg",
        "light_trans": "65.0% Marine Blue",
        "compressive": "> 150 MPa Load",
        "refractive": "nd = 1.52",
        "joint": "UV Structural / Clear Silicone",
        "brick_img": "solid_p13_brick.jpg",
        "scene_img": "solid_p13_scene.jpg",
        "desc": "Crystalline oceanic sapphire blue tint imbuing walls with luminous maritime tranquility, ideal for luxury aquatic spas and feature showers."
    },
    {
        "code": "ST-SGB-011",
        "name": "Tropical Green",
        "model": "JB-31",
        "collection": "Vibrant Translucent Tinted Series",
        "type": "Through-Body Tinted Crystal Brick",
        "size": "200 × 100 × 50 mm",
        "weight": "2.50 kg / pc",
        "packing": "6 pcs / carton · 15.0 kg",
        "light_trans": "68.0% Biophilic Emerald",
        "compressive": "> 150 MPa Load",
        "refractive": "nd = 1.52",
        "joint": "UV Structural / Clear Silicone",
        "brick_img": "solid_p14_brick.jpg",
        "scene_img": "solid_p14_scene.jpg",
        "desc": "Rich botanical emerald green glass fostering connection to nature, perfectly complementing living wall gardens and courtyard pavilions."
    },
    {
        "code": "ST-SGB-012",
        "name": "Aqua Green",
        "model": "JB-42",
        "collection": "Vibrant Translucent Tinted Series",
        "type": "Through-Body Tinted Crystal Brick",
        "size": "200 × 100 × 50 mm",
        "weight": "2.50 kg / pc",
        "packing": "6 pcs / carton · 15.0 kg",
        "light_trans": "72.0% Cyan Glacial",
        "compressive": "> 150 MPa Load",
        "refractive": "nd = 1.52",
        "joint": "UV Structural / Clear Silicone",
        "brick_img": "solid_p15_brick.jpg",
        "scene_img": "solid_p15_scene.jpg",
        "desc": "Crisp aquamarine cyan glass delivering crystalline freshness and light-bending luminosity across modern commercial atriums."
    },
    {
        "code": "ST-SGB-013",
        "name": "Lava Red",
        "model": "JB-46",
        "collection": "Vibrant Translucent Tinted Series",
        "type": "Through-Body Tinted Crystal Brick",
        "size": "200 × 100 × 50 mm",
        "weight": "2.50 kg / pc",
        "packing": "6 pcs / carton · 15.0 kg",
        "light_trans": "45.0% Ruby Luminescence",
        "compressive": "> 150 MPa Load",
        "refractive": "nd = 1.52",
        "joint": "UV Structural / Clear Silicone",
        "brick_img": "solid_p16_brick.jpg",
        "scene_img": "solid_p16_scene.jpg",
        "desc": "Intense ruby magma red glass creating captivating artistic accents and unforgettable focal elements in signature nightclub and restaurant interiors."
    },
    {
        "code": "ST-SGB-014",
        "name": "Honey Gold",
        "model": "JB-41",
        "collection": "Vibrant Translucent Tinted Series",
        "type": "Through-Body Tinted Crystal Brick",
        "size": "200 × 100 × 50 mm",
        "weight": "2.50 kg / pc",
        "packing": "6 pcs / carton · 15.0 kg",
        "light_trans": "74.0% Warm Amber Gold",
        "compressive": "> 150 MPa Load",
        "refractive": "nd = 1.52",
        "joint": "UV Structural / Clear Silicone",
        "brick_img": "solid_p17_brick.jpg",
        "scene_img": "solid_p17_scene.jpg",
        "desc": "Warm golden amber honey tint casting welcoming, lavish twilight illumination across executive tasting rooms and grand residence lobbies."
    },
    {
        "code": "ST-SGB-015",
        "name": "Clear Red",
        "model": "JB-45",
        "collection": "Vibrant Translucent Tinted Series",
        "type": "Through-Body Tinted Crystal Brick",
        "size": "200 × 100 × 50 mm",
        "weight": "2.50 kg / pc",
        "packing": "6 pcs / carton · 15.0 kg",
        "light_trans": "52.0% Vibrant Scarlet",
        "compressive": "> 150 MPa Load",
        "refractive": "nd = 1.52",
        "joint": "UV Structural / Clear Silicone",
        "brick_img": "solid_p18_brick.jpg",
        "scene_img": "solid_p18_scene.jpg",
        "desc": "Vivid scarlet red transparent crystal delivering pure saturated illumination without internal cloudiness or hazing."
    },
    {
        "code": "ST-SGB-016",
        "name": "Clear Orange",
        "model": "JB-47",
        "collection": "Vibrant Translucent Tinted Series",
        "type": "Through-Body Tinted Crystal Brick",
        "size": "200 × 100 × 50 mm",
        "weight": "2.50 kg / pc",
        "packing": "6 pcs / carton · 15.0 kg",
        "light_trans": "68.0% Sunset Tangerine",
        "compressive": "> 150 MPa Load",
        "refractive": "nd = 1.52",
        "joint": "UV Structural / Clear Silicone",
        "brick_img": "solid_p19_brick.jpg",
        "scene_img": "solid_p19_scene.jpg",
        "desc": "Luminous sunset tangerine glass infusing reception backdrops with warmth, vitality, and upbeat modern luxury."
    },
    {
        "code": "ST-SGB-017",
        "name": "Clear Yellow",
        "model": "JB-40",
        "collection": "Vibrant Translucent Tinted Series",
        "type": "Through-Body Tinted Crystal Brick",
        "size": "200 × 100 × 50 mm",
        "weight": "2.50 kg / pc",
        "packing": "6 pcs / carton · 15.0 kg",
        "light_trans": "82.0% Solar Ray",
        "compressive": "> 150 MPa Load",
        "refractive": "nd = 1.52",
        "joint": "UV Structural / Clear Silicone",
        "brick_img": "solid_p20_brick.jpg",
        "scene_img": "solid_p20_scene.jpg",
        "desc": "Brilliant citrine solar yellow glass capturing even minimal ambient light and projecting bright cheerful radiance across spaces."
    },
    {
        "code": "ST-SGB-018",
        "name": "Rock Orange Chiseled",
        "model": "JB ROCK-3047",
        "collection": "Vibrant Translucent Tinted Series",
        "type": "Chiseled Rock-Face Tinted Brick",
        "size": "200 × 100 × 50 mm",
        "weight": "2.50 kg / pc",
        "packing": "6 pcs / carton · 15.0 kg",
        "light_trans": "65.0% Chiseled Sunset",
        "compressive": "> 150 MPa Load",
        "refractive": "nd = 1.52",
        "joint": "UV Structural / Clear Silicone",
        "brick_img": "solid_p21_brick.jpg",
        "scene_img": "solid_p21_scene.jpg",
        "desc": "Rough-hewn chiseled perimeter facets combined with warm amber orange glass, mimicking ancient sunlit geological formations."
    },
    {
        "code": "ST-SGB-019",
        "name": "Rock Yellow Chiseled",
        "model": "JB ROCK-3040",
        "collection": "Vibrant Translucent Tinted Series",
        "type": "Chiseled Rock-Face Tinted Brick",
        "size": "200 × 100 × 50 mm",
        "weight": "2.50 kg / pc",
        "packing": "6 pcs / carton · 15.0 kg",
        "light_trans": "78.0% Chiseled Solar",
        "compressive": "> 150 MPa Load",
        "refractive": "nd = 1.52",
        "joint": "UV Structural / Clear Silicone",
        "brick_img": "solid_p22_brick.jpg",
        "scene_img": "solid_p22_scene.jpg",
        "desc": "Golden yellow chiseled crystal creating glittering golden highlight nodes when illuminated with directional perimeter downlights."
    },
    {
        "code": "ST-SGB-020",
        "name": "Rock Blue Chiseled",
        "model": "JB ROCK-3032",
        "collection": "Vibrant Translucent Tinted Series",
        "type": "Chiseled Rock-Face Tinted Brick",
        "size": "200 × 100 × 50 mm",
        "weight": "2.50 kg / pc",
        "packing": "6 pcs / carton · 15.0 kg",
        "light_trans": "62.0% Chiseled Cobalt",
        "compressive": "> 150 MPa Load",
        "refractive": "nd = 1.52",
        "joint": "UV Structural / Clear Silicone",
        "brick_img": "solid_p23_brick.jpg",
        "scene_img": "solid_p23_scene.jpg",
        "desc": "Cobalt sapphire chiseled brick delivering jewel-like mineral facets for high-impact wine cellar dividers and hotel reception counters."
    },
    {
        "code": "ST-SGB-021",
        "name": "Rock Red Chiseled",
        "model": "JB ROCK-3045",
        "collection": "Vibrant Translucent Tinted Series",
        "type": "Chiseled Rock-Face Tinted Brick",
        "size": "200 × 100 × 50 mm",
        "weight": "2.50 kg / pc",
        "packing": "6 pcs / carton · 15.0 kg",
        "light_trans": "44.0% Chiseled Garnet",
        "compressive": "> 150 MPa Load",
        "refractive": "nd = 1.52",
        "joint": "UV Structural / Clear Silicone",
        "brick_img": "solid_p24_brick.jpg",
        "scene_img": "solid_p24_scene.jpg",
        "desc": "Deep garnet red chiseled facets catching grazing light, evoking volcanic crystals and bringing intense luxury drama to feature panels."
    },

    # Collection III: Cloudy Nebula Artisanal Series (8 products)
    {
        "code": "ST-SGB-022",
        "name": "Cloudy Black Nebula",
        "model": "JB-07",
        "collection": "Cloudy Nebula Artisanal Series",
        "type": "Artisanal Swirl Solid Crystal Brick",
        "size": "200 × 100 × 50 mm",
        "weight": "2.50 kg / pc",
        "packing": "6 pcs / carton · 15.0 kg",
        "light_trans": "35.0% Smoky Nebula",
        "compressive": "> 150 MPa Load",
        "refractive": "nd = 1.52",
        "joint": "UV Structural / Clear Silicone",
        "brick_img": "solid_p25_brick.jpg",
        "scene_img": "solid_p25_scene.jpg",
        "desc": "Artisanal smoky charcoal veil patterns floating within clear optical crystal, each piece uniquely formed like interstellar space dust."
    },
    {
        "code": "ST-SGB-023",
        "name": "Cloudy White Nebula",
        "model": "JB-06",
        "collection": "Cloudy Nebula Artisanal Series",
        "type": "Artisanal Swirl Solid Crystal Brick",
        "size": "200 × 100 × 50 mm",
        "weight": "2.50 kg / pc",
        "packing": "6 pcs / carton · 15.0 kg",
        "light_trans": "60.0% Alabaster Swirl",
        "compressive": "> 150 MPa Load",
        "refractive": "nd = 1.52",
        "joint": "UV Structural / Clear Silicone",
        "brick_img": "solid_p26_brick.jpg",
        "scene_img": "solid_p26_scene.jpg",
        "desc": "Ethereal milky white cloud ribbons suspended within crystal, providing subtle privacy shielding and delicate sculptural elegance."
    },
    {
        "code": "ST-SGB-024",
        "name": "Cloudy Blue Nebula",
        "model": "JB-02",
        "collection": "Cloudy Nebula Artisanal Series",
        "type": "Artisanal Swirl Solid Crystal Brick",
        "size": "200 × 100 × 50 mm",
        "weight": "2.50 kg / pc",
        "packing": "6 pcs / carton · 15.0 kg",
        "light_trans": "58.0% Cyan Vapor",
        "compressive": "> 150 MPa Load",
        "refractive": "nd = 1.52",
        "joint": "UV Structural / Clear Silicone",
        "brick_img": "solid_p27_brick.jpg",
        "scene_img": "solid_p27_scene.jpg",
        "desc": "Fluid celestial blue cloud filaments frozen in molten crystal, evoking atmospheric cirrus clouds illuminated by high-altitude sunlight."
    },
    {
        "code": "ST-SGB-025",
        "name": "Cloudy Dark Blue Nebula",
        "model": "JB-60203",
        "collection": "Cloudy Nebula Artisanal Series",
        "type": "Artisanal Swirl Solid Crystal Brick",
        "size": "200 × 100 × 50 mm",
        "weight": "2.50 kg / pc",
        "packing": "6 pcs / carton · 15.0 kg",
        "light_trans": "42.0% Deep Galaxy",
        "compressive": "> 150 MPa Load",
        "refractive": "nd = 1.52",
        "joint": "UV Structural / Clear Silicone",
        "brick_img": "solid_p28_brick.jpg",
        "scene_img": "solid_p28_scene.jpg",
        "desc": "Deep midnight galaxy blue swirls suspended inside crystalline glass, bringing profound contemplative depth to luxury feature installations."
    },
    {
        "code": "ST-SGB-026",
        "name": "Cloudy Green Nebula",
        "model": "JB-01",
        "collection": "Cloudy Nebula Artisanal Series",
        "type": "Artisanal Swirl Solid Crystal Brick",
        "size": "200 × 100 × 50 mm",
        "weight": "2.50 kg / pc",
        "packing": "6 pcs / carton · 15.0 kg",
        "light_trans": "62.0% Jade Mist",
        "compressive": "> 150 MPa Load",
        "refractive": "nd = 1.52",
        "joint": "UV Structural / Clear Silicone",
        "brick_img": "solid_p29_brick.jpg",
        "scene_img": "solid_p29_scene.jpg",
        "desc": "Delicate jade green vapor trails dancing across optical glass, inspired by the ethereal beauty of mountain morning mists over evergreen forests."
    },
    {
        "code": "ST-SGB-027",
        "name": "Cloudy Red Nebula",
        "model": "JB-04",
        "collection": "Cloudy Nebula Artisanal Series",
        "type": "Artisanal Swirl Solid Crystal Brick",
        "size": "200 × 100 × 50 mm",
        "weight": "2.50 kg / pc",
        "packing": "6 pcs / carton · 15.0 kg",
        "light_trans": "48.0% Aurora Crimson",
        "compressive": "> 150 MPa Load",
        "refractive": "nd = 1.52",
        "joint": "UV Structural / Clear Silicone",
        "brick_img": "solid_p30_brick.jpg",
        "scene_img": "solid_p30_scene.jpg",
        "desc": "Swirling crimson aurora threads evoking glowing embers trapped in ice, creating dynamic movement and artistic focal warmth."
    },
    {
        "code": "ST-SGB-028",
        "name": "Cloudy Orange Nebula",
        "model": "JB-60304",
        "collection": "Cloudy Nebula Artisanal Series",
        "type": "Artisanal Swirl Solid Crystal Brick",
        "size": "200 × 100 × 50 mm",
        "weight": "2.50 kg / pc",
        "packing": "6 pcs / carton · 15.0 kg",
        "light_trans": "64.0% Solar Flare",
        "compressive": "> 150 MPa Load",
        "refractive": "nd = 1.52",
        "joint": "UV Structural / Clear Silicone",
        "brick_img": "solid_p31_brick.jpg",
        "scene_img": "solid_p31_scene.jpg",
        "desc": "Golden amber solar flare swirls dancing inside crystalline glass, bathing executive environments in rich artisanal sunset tones."
    },
    {
        "code": "ST-SGB-029",
        "name": "Cloudy Yellow Nebula",
        "model": "JB-03",
        "collection": "Cloudy Nebula Artisanal Series",
        "type": "Artisanal Swirl Solid Crystal Brick",
        "size": "200 × 100 × 50 mm",
        "weight": "2.50 kg / pc",
        "packing": "6 pcs / carton · 15.0 kg",
        "light_trans": "75.0% Sunburst Vapor",
        "compressive": "> 150 MPa Load",
        "refractive": "nd = 1.52",
        "joint": "UV Structural / Clear Silicone",
        "brick_img": "solid_p32_brick.jpg",
        "scene_img": "solid_p32_scene.jpg",
        "desc": "Vibrant lemon-citrine nebula clouds refracting incident rays with cheerful energy, providing luminous warmth to luxury living atriums."
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

/* PRODUCT PAGE — DUAL CARD SHOWCASE */
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

/* DUAL CARD STAGE */
.dual-stage-container {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5mm;
  padding: 3mm 0;
  min-height: 0;
}
.prod-brick-card { height: 125mm; background: #0f172a; border: 1px solid #cbd5e1; border-radius: 3mm; overflow: hidden; position: relative; }
.prod-scene-card {
  height: 125mm;
  background: #0f172a;
  border: 1px solid #cbd5e1;
  border-radius: 3mm;
  overflow: hidden;
  position: relative;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}
.prod-scene-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.prod-brick-img { width: 100%; height: 100%; object-fit: cover; object-position: center; display: block; }
.scene-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(0deg, rgba(15,23,42,0.92) 0%, rgba(15,23,42,0.5) 60%, transparent 100%);
  padding: 3mm 5mm;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  z-index: 2;
}
.scene-tag {
  color: #fef3c7;
  font-size: 6.5pt;
  font-weight: 700;
  letter-spacing: 0.5px;
}
.scene-sub {
  color: #cbd5e1;
  font-size: 5.8pt;
  margin-top: 0.4mm;
}

.stage-badge-top {
  position: absolute;
  top: 3.5mm;
  left: 3.5mm;
  display: flex;
  gap: 2mm;
  z-index: 3;
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
    total_pages = 36
    css = generate_css()
    parts = []
    
    parts.append(f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Stone Tech Atelier — Architectural Solid Optical Glass Bricks Catalogue 2026-2027</title>
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
      <div class="cover-atelier">ARCHITECTURAL SOLID GLASS BRICK DIVISION · SYSTEM ENGINEERED IN INDIA</div>
      <div class="cover-line"></div>
    </div>
    
    <div class="cover-title-group">
      <div class="cover-title1">SOLID OPTICAL GLASS BRICKS</div>
      <div class="cover-title2">CRYSTALLINE LUXURY ARCHITECTURAL COLLECTION</div>
      <div class="cover-edition">2026 – 2027 MASTER SPECIFICATION CATALOGUE</div>
      <div class="cover-tagline1">High-Purity Optical Crystal · Hand-Chiseled Rock Textures · Artisanal Nebula Series</div>
      <div class="cover-tagline2">Heavy Load-Bearing Solid Core (>150 MPa) · Structural Stainless Steel Rebar Interlock · Museum Grade</div>
    </div>
    
    <div class="cover-pillars">
      <div class="cover-pillar-card">
        <div class="pillar-num">01. OPTICAL PURITY</div>
        <div class="pillar-head">K9 BOROSILICATE CRYSTAL</div>
        <div class="pillar-body">Annealed under 48-hour slow cooling cycles to eliminate internal birefringence, bubbles, and thermal stress.</div>
      </div>
      <div class="cover-pillar-card">
        <div class="pillar-num">02. HIGH LOAD BEARING</div>
        <div class="pillar-head">> 150 MPa COMPRESSIVE</div>
        <div class="pillar-body">Solid monolithic core capable of supporting monumental multi-story structural partitions and balustrades.</div>
      </div>
      <div class="cover-pillar-card">
        <div class="pillar-num">03. REBAR READY</div>
        <div class="pillar-head">Ø16mm STRUCTURAL CORE</div>
        <div class="pillar-body">Precision vertical hole option for continuous stainless steel seismic post-tensioning and invisible mechanical anchoring.</div>
      </div>
      <div class="cover-pillar-card">
        <div class="pillar-num">04. BESPOKE TEXTURES</div>
        <div class="pillar-head">ROCK & NEBULA ARTISANAL</div>
        <div class="pillar-body">From hand-chiseled glacial rock edges to suspended cosmic smoke veils, each brick is an individual work of art.</div>
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
    # PAGE 2: ABOUT SOLID DIVISION
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
          <span class="prod-division-tag" style="background:#1e293b;border-color:#334155;color:#38bdf8;">SOLID GLASS BRICKS DIVISION</span>
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
        <div class="about-tag">CRYSTALLINE ARCHITECTURE · PURITY & STRUCTURAL FORTITUDE</div>
        <div class="about-title">MONOLITHIC SOLID CRYSTAL MASONRY</div>
        <div class="about-desc">
          Stone Tech Atelier pioneers the synthesis of optical glass science and luxury masonry architecture. Unlike standard glass blocks, our Solid Glass Bricks are formed from solid cast K9 optical-grade borosilicate crystal, delivering unmatched refractive brilliance, diamond-cut edges, and colossal compressive strength exceeding 150 MPa.
          <br><br>
          Every brick undergoes an extended precision annealing cycle to ensure absolute freedom from internal shear stresses, achieving 99.2% light transmittance. Through our bespoke through-hole rebar system and specialized UV-cure structural polymers, architects can realize soaring freestanding facades, illuminated bar counters, and suspended crystal bridges with zero visible frames.
        </div>
        
        <div class="about-features">
          <div class="feat-item">
            <div class="feat-title">Optical K9 Purity</div>
            <div class="feat-desc">Ultra-low iron glass batch formulation providing crystal-clear light refraction with zero greenish hue or chromatic distortion.</div>
          </div>
          <div class="feat-item">
            <div class="feat-title">Load-Bearing > 150 MPa</div>
            <div class="feat-desc">Engineered to support heavy architectural structural loads, far exceeding the compressive limits of natural granites and concretes.</div>
          </div>
          <div class="feat-item">
            <div class="feat-title">Invisible UV Bonding</div>
            <div class="feat-desc">High-tensile UV adhesive bonding creates seamless, crystal-clear mortarless joints with refractive index matching the glass.</div>
          </div>
          <div class="feat-item">
            <div class="feat-title">Global Ocean Crating</div>
            <div class="feat-desc">Custom-machined EPE dense foam inserts in ISPM-15 wooden export crates ensuring 100% damage-free delivery worldwide.</div>
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
    # PAGE 3: COLLECTION I DIVIDER — OPTICAL CLEAR CRYSTAL SERIES
    # ----------------------------------------------------
    parts.append(f"""
<div class="page divider-page">
  <div class="divider-border">
    <div class="cover-inner-border"></div>
    <div class="divider-series-tag">COLLECTION I · 8 MASTER DESIGNS</div>
    <div class="divider-title">OPTICAL CLEAR CRYSTAL SERIES</div>
    <div class="divider-sub">SUPER CLEAR, CHISELED ROCK, REBAR THROUGH-HOLE & CIRCULAR LENS</div>
    <div class="divider-desc">
      Pure optical brilliance engineered for architectural transparency and supreme load-bearing resilience. Featuring standard 200×100×50mm bricks, half-format modular units, chiseled rock profiles, seismic rebar core variants, and monumental 150mm circular lens blocks.
    </div>
  </div>
</div>
""")

    # ----------------------------------------------------
    # PAGES 4 - 11: 8 CLEAR PRODUCTS (DUAL CARD)
    # ----------------------------------------------------
    current_page = 4
    for prod in PRODUCTS[:8]:
        brick_p = os.path.join(ASSETS_DIR, prod["brick_img"])
        scene_p = os.path.join(ASSETS_DIR, prod["scene_img"])
        parts.append(f"""
<div class="page product-page">
  <div class="prod-header">
    <div class="prod-header-left">
      <img src="file://{EMBLEM_PATH}" class="prod-emblem">
      <div class="prod-brand-lockup">
        <span class="prod-brand-name">STONE TECH ATELIER</span>
        <span class="prod-division-tag">SOLID GLASS BRICKS</span>
        <span style="font-size:6.5pt;background:#fef3c7;border:1px solid #fde68a;color:#b45309;padding:0.6mm 2mm;border-radius:1mm;font-weight:700;">{prod['collection']}</span>
      </div>
    </div>
    <div class="prod-header-right">
      FACTORY DIRECT ORDERS: <strong>+91 77420 90866</strong> · <strong>WWW.STONETECH.IN</strong>
    </div>
  </div>
  
  <div class="dual-stage-container">
    <div class="prod-brick-card">
      <div class="stage-badge-top">
        <div class="badge-pill"><div class="badge-dot"></div> Compressive: {prod['compressive']}</div>
        <div class="badge-pill"><div class="badge-dot"></div> Optical: {prod['refractive']}</div>
      </div>
      <img src="file://{brick_p}" class="prod-brick-img">
    </div>
    
    <div class="prod-scene-card">
      <img src="file://{scene_p}" class="prod-scene-img">
      <div class="scene-overlay">
        <div>
          <div class="scene-tag">EXECUTED ARCHITECTURAL INSTALLATION</div>
          <div class="scene-sub">Stone Tech Atelier Reference · Luxury Commercial & Residential Application</div>
        </div>
        <div style="background:rgba(217,119,6,0.3);border:1px solid #f59e0b;color:#fef3c7;padding:0.8mm 2.2mm;border-radius:1mm;font-size:6pt;font-weight:700;">LIVE APPLICATION</div>
      </div>
    </div>
  </div>
  
  <div class="prod-spec-panel">
    <div class="spec-header-row">
      <div class="spec-title-left">
        <span class="spec-prod-name">{prod['name']}</span>
        <span class="spec-prod-type">{prod['type']} · Model: {prod['model']}</span>
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
        <div class="spec-box-label">Load Capacity</div>
        <div class="spec-box-val">{prod['compressive']}</div>
      </div>
      <div class="spec-box">
        <div class="spec-box-label">Refractive Index</div>
        <div class="spec-box-val">{prod['refractive']}</div>
      </div>
      <div class="spec-box">
        <div class="spec-box-label">Joint Method</div>
        <div class="spec-box-val">{prod['joint']}</div>
      </div>
    </div>
    
    <div class="spec-desc-row">
      <strong>Architectural Performance:</strong> {prod['desc']}
    </div>
  </div>
  
  <div class="prod-footer">
    <div class="prod-footer-brand"><strong>STONE TECH ATELIER</strong> · ARCHITECTURAL SOLID GLASS BRICK DIVISION</div>
    <div class="prod-footer-addr">AHMEDABAD EXPERIENCE CENTER · DIRECT WHATSAPP: +91 77420 90866 · INFO@STONETECH.IN</div>
    <div class="prod-footer-page">Page {current_page} / {total_pages}</div>
  </div>
</div>
""")
        current_page += 1

    # ----------------------------------------------------
    # PAGE 12: COLLECTION II DIVIDER — VIBRANT TRANSLUCENT TINTED & ROCK SERIES
    # ----------------------------------------------------
    parts.append(f"""
<div class="page divider-page">
  <div class="divider-border">
    <div class="cover-inner-border"></div>
    <div class="divider-series-tag">COLLECTION II · 13 RADIANT COLORS & ROCK TEXTURES</div>
    <div class="divider-title">VIBRANT TRANSLUCENT TINTED & CHISELED ROCK SERIES</div>
    <div class="divider-sub">DEEP JEWEL TONES, VOLCANIC REDS, SAPPHIRE BLUES & RAW ROCK FACETS</div>
    <div class="divider-desc">
      Formulated with through-body high-temperature metallic oxide color fusion, maintaining permanent UV-stable translucence that never fades. Available in diamond-polished smooth blocks and raw hand-chiseled rock edge variants that disperse light into radiant jewel sparks.
    </div>
  </div>
</div>
""")
    current_page += 1

    # ----------------------------------------------------
    # PAGES 13 - 25: 13 TINTED & ROCK PRODUCTS (DUAL CARD)
    # ----------------------------------------------------
    for prod in PRODUCTS[8:21]:
        brick_p = os.path.join(ASSETS_DIR, prod["brick_img"])
        scene_p = os.path.join(ASSETS_DIR, prod["scene_img"])
        parts.append(f"""
<div class="page product-page">
  <div class="prod-header">
    <div class="prod-header-left">
      <img src="file://{EMBLEM_PATH}" class="prod-emblem">
      <div class="prod-brand-lockup">
        <span class="prod-brand-name">STONE TECH ATELIER</span>
        <span class="prod-division-tag">SOLID GLASS BRICKS</span>
        <span style="font-size:6.5pt;background:#fee2e2;border:1px solid #fecaca;color:#b91c1c;padding:0.6mm 2mm;border-radius:1mm;font-weight:700;">{prod['collection']}</span>
      </div>
    </div>
    <div class="prod-header-right">
      FACTORY DIRECT ORDERS: <strong>+91 77420 90866</strong> · <strong>WWW.STONETECH.IN</strong>
    </div>
  </div>
  
  <div class="dual-stage-container">
    <div class="prod-brick-card">
      <div class="stage-badge-top">
        <div class="badge-pill"><div class="badge-dot"></div> Compressive: {prod['compressive']}</div>
        <div class="badge-pill"><div class="badge-dot"></div> Refractive: {prod['refractive']}</div>
      </div>
      <img src="file://{brick_p}" class="prod-brick-img">
    </div>
    
    <div class="prod-scene-card">
      <img src="file://{scene_p}" class="prod-scene-img">
      <div class="scene-overlay">
        <div>
          <div class="scene-tag">EXECUTED ARCHITECTURAL INSTALLATION</div>
          <div class="scene-sub">Stone Tech Atelier Reference · Luxury Commercial & Residential Application</div>
        </div>
        <div style="background:rgba(217,119,6,0.3);border:1px solid #f59e0b;color:#fef3c7;padding:0.8mm 2.2mm;border-radius:1mm;font-size:6pt;font-weight:700;">LIVE APPLICATION</div>
      </div>
    </div>
  </div>
  
  <div class="prod-spec-panel">
    <div class="spec-header-row">
      <div class="spec-title-left">
        <span class="spec-prod-name">{prod['name']}</span>
        <span class="spec-prod-type">{prod['type']} · Model: {prod['model']}</span>
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
        <div class="spec-box-label">Load Capacity</div>
        <div class="spec-box-val">{prod['compressive']}</div>
      </div>
      <div class="spec-box">
        <div class="spec-box-label">Refractive Index</div>
        <div class="spec-box-val">{prod['refractive']}</div>
      </div>
      <div class="spec-box">
        <div class="spec-box-label">Joint Method</div>
        <div class="spec-box-val">{prod['joint']}</div>
      </div>
    </div>
    
    <div class="spec-desc-row">
      <strong>Architectural Performance:</strong> {prod['desc']}
    </div>
  </div>
  
  <div class="prod-footer">
    <div class="prod-footer-brand"><strong>STONE TECH ATELIER</strong> · ARCHITECTURAL SOLID GLASS BRICK DIVISION</div>
    <div class="prod-footer-addr">AHMEDABAD EXPERIENCE CENTER · DIRECT WHATSAPP: +91 77420 90866 · INFO@STONETECH.IN</div>
    <div class="prod-footer-page">Page {current_page} / {total_pages}</div>
  </div>
</div>
""")
        current_page += 1

    # ----------------------------------------------------
    # PAGE 26: COLLECTION III DIVIDER — CLOUDY NEBULA ARTISANAL SERIES
    # ----------------------------------------------------
    parts.append(f"""
<div class="page divider-page">
  <div class="divider-border">
    <div class="cover-inner-border"></div>
    <div class="divider-series-tag">COLLECTION III · 8 ARTISANAL SWIRL EDITIONS</div>
    <div class="divider-title">CLOUDY NEBULA ARTISANAL SERIES</div>
    <div class="divider-sub">ORGANIC MINERAL SWIRLS, CELESTIAL CLOUD VEILS & TRANSLUCENT SMOKE</div>
    <div class="divider-desc">
      A collector-grade artisanal series where molten mineral color pigments are swirled into crystal glass during hand-poured casting. Each brick possesses an entirely one-of-a-kind internal nebula pattern, balancing privacy obscuration with ethereal celestial movement.
    </div>
  </div>
</div>
""")
    current_page += 1

    # ----------------------------------------------------
    # PAGES 27 - 34: 8 CLOUDY NEBULA PRODUCTS (DUAL CARD)
    # ----------------------------------------------------
    for prod in PRODUCTS[21:]:
        brick_p = os.path.join(ASSETS_DIR, prod["brick_img"])
        scene_p = os.path.join(ASSETS_DIR, prod["scene_img"])
        parts.append(f"""
<div class="page product-page">
  <div class="prod-header">
    <div class="prod-header-left">
      <img src="file://{EMBLEM_PATH}" class="prod-emblem">
      <div class="prod-brand-lockup">
        <span class="prod-brand-name">STONE TECH ATELIER</span>
        <span class="prod-division-tag">SOLID GLASS BRICKS</span>
        <span style="font-size:6.5pt;background:#e0e7ff;border:1px solid #c7d2fe;color:#3730a3;padding:0.6mm 2mm;border-radius:1mm;font-weight:700;">{prod['collection']}</span>
      </div>
    </div>
    <div class="prod-header-right">
      FACTORY DIRECT ORDERS: <strong>+91 77420 90866</strong> · <strong>WWW.STONETECH.IN</strong>
    </div>
  </div>
  
  <div class="dual-stage-container">
    <div class="prod-brick-card">
      <div class="stage-badge-top">
        <div class="badge-pill"><div class="badge-dot"></div> Compressive: {prod['compressive']}</div>
        <div class="badge-pill"><div class="badge-dot"></div> Refractive: {prod['refractive']}</div>
      </div>
      <img src="file://{brick_p}" class="prod-brick-img">
    </div>
    
    <div class="prod-scene-card">
      <img src="file://{scene_p}" class="prod-scene-img">
      <div class="scene-overlay">
        <div>
          <div class="scene-tag">EXECUTED ARCHITECTURAL INSTALLATION</div>
          <div class="scene-sub">Stone Tech Atelier Reference · Luxury Commercial & Residential Application</div>
        </div>
        <div style="background:rgba(217,119,6,0.3);border:1px solid #f59e0b;color:#fef3c7;padding:0.8mm 2.2mm;border-radius:1mm;font-size:6pt;font-weight:700;">LIVE APPLICATION</div>
      </div>
    </div>
  </div>
  
  <div class="prod-spec-panel">
    <div class="spec-header-row">
      <div class="spec-title-left">
        <span class="spec-prod-name">{prod['name']}</span>
        <span class="spec-prod-type">{prod['type']} · Model: {prod['model']}</span>
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
        <div class="spec-box-label">Load Capacity</div>
        <div class="spec-box-val">{prod['compressive']}</div>
      </div>
      <div class="spec-box">
        <div class="spec-box-label">Refractive Index</div>
        <div class="spec-box-val">{prod['refractive']}</div>
      </div>
      <div class="spec-box">
        <div class="spec-box-label">Joint Method</div>
        <div class="spec-box-val">{prod['joint']}</div>
      </div>
    </div>
    
    <div class="spec-desc-row">
      <strong>Architectural Performance:</strong> {prod['desc']}
    </div>
  </div>
  
  <div class="prod-footer">
    <div class="prod-footer-brand"><strong>STONE TECH ATELIER</strong> · ARCHITECTURAL SOLID GLASS BRICK DIVISION</div>
    <div class="prod-footer-addr">AHMEDABAD EXPERIENCE CENTER · DIRECT WHATSAPP: +91 77420 90866 · INFO@STONETECH.IN</div>
    <div class="prod-footer-page">Page {current_page} / {total_pages}</div>
  </div>
</div>
""")
        current_page += 1

    # ----------------------------------------------------
    # PAGE 35: SOLID CRYSTAL INSTALLATION ENGINEERING GUIDE
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
        SOLID OPTICAL CRYSTAL MASONRY & UV BONDING PROTOCOL
      </div>
      <div style="font-size:6.8pt;color:#64748b;margin-bottom:2mm;">
        Precision architectural installation methodology utilizing structural UV-curing acrylic adhesives and stainless steel through-rod reinforcement.
      </div>
      
      <div class="install-step-item">
        <div class="step-num">1</div>
        <div class="step-content">
          <div class="step-title">Precision Base Channel & Leveling Bed</div>
          <div class="step-body">Fasten heavy-gauge 3mm stainless steel or extruded aluminum U-channel onto the structural substrate using M8 high-shear anchors. Level base bed to within ±0.5mm tolerance over 5 meters.</div>
        </div>
      </div>
      
      <div class="install-step-item">
        <div class="step-num">2</div>
        <div class="step-content">
          <div class="step-title">Elastomeric Neoprene Cushioning Setting</div>
          <div class="step-body">Place continuous 2mm high-durometer clear EPDM or neoprene bearing pads along the channel bottom to prevent direct point contact between glass corners and metal frames.</div>
        </div>
      </div>
      
      <div class="install-step-item">
        <div class="step-num">3</div>
        <div class="step-content">
          <div class="step-title">Vertical Stainless Steel Rebar Dowels (Hole Series)</div>
          <div class="step-body">For ST-SGB-003 through-hole bricks, thread continuous AISI 316 stainless steel rods (Ø12mm or Ø14mm) into the base channel, extending through each brick column to lock the entire wall against lateral shear.</div>
        </div>
      </div>
      
      <div class="install-step-item">
        <div class="step-num">4</div>
        <div class="step-content">
          <div class="step-title">Optical Structural UV Adhesive Application</div>
          <div class="step-body">Dispense high-strength, optical-index matched (nd=1.52) UV-curing acrylic adhesive in dual micro-lines across bed joints. The adhesive creates an invisible bond stronger than the glass itself.</div>
        </div>
      </div>
      
      <div class="install-step-item">
        <div class="step-num">5</div>
        <div class="step-content">
          <div class="step-title">UV Lamp Irradiation & Instant Curing</div>
          <div class="step-body">Expose each joint to high-intensity 365nm UV LED lamps for 30–60 seconds to achieve immediate structural curing, eliminating joint sagging and allowing rapid continuous construction.</div>
        </div>
      </div>
      
      <div class="install-step-item">
        <div class="step-num">6</div>
        <div class="step-content">
          <div class="step-title">Seismic Top Channel Post-Tensioning</div>
          <div class="step-body">Install top restraining channel with integrated mechanical tensioning springs on the internal rebar rods to maintain continuous compressive pre-stress during building live movements.</div>
        </div>
      </div>
      
      <div class="install-step-item">
        <div class="step-num">7</div>
        <div class="step-content">
          <div class="step-title">Edge Micro-Polishing & Optical Sealing</div>
          <div class="step-body">Wipe joints with isopropyl alcohol to remove excess polymer. Seal perimeter perimeter gaps with ultra-clear low-modulus architectural silicone for water and air tightness.</div>
        </div>
      </div>
    </div>
  </div>
  
  <div class="prod-footer">
    <div class="prod-footer-brand"><strong>STONE TECH ATELIER</strong> · TECHNICAL INSTALLATION MANUAL</div>
    <div class="prod-footer-addr">ENGINEERING SUPPORT: +91 77420 90866 · INFO@STONETECH.IN</div>
    <div class="prod-footer-page">Page 35 / {total_pages}</div>
  </div>
</div>
""")

    # ----------------------------------------------------
    # PAGE 36: ENGINEERING MATRIX & BACK COVER
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
        ARCHITECTURAL SOLID OPTICAL GLASS BRICKS · TECHNICAL PERFORMANCE MATRIX
      </div>
      <div style="font-size:6.8pt;color:#94a3b8;margin-top:0.5mm;">
        Standard Testing Compliance: ASTM C158 (Flexural/Compressive), ASTM C1036 (Flat Glass Quality), DIN 52303 & ISO 9001:2015.
      </div>
      
      <table class="matrix-table">
        <thead>
          <tr>
            <th>Technical Characteristic</th>
            <th>Standard Reference</th>
            <th>200×100×50mm Standard Solid</th>
            <th>100×100×50mm Half Modular</th>
            <th>150×150×60mm Moon White Lens</th>
            <th>Architectural Impact</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Compressive Failure Strength</strong></td>
            <td>ASTM C158 / ISO 13000</td>
            <td>> 150 MPa (> 1500 kg/cm²)</td>
            <td>> 150 MPa (> 1500 kg/cm²)</td>
            <td>> 180 MPa (> 1800 kg/cm²)</td>
            <td>Extreme structural load bearing exceeding granite and concrete</td>
          </tr>
          <tr>
            <td><strong>Optical Refractive Index (nd)</strong></td>
            <td>Abbe Refractometry</td>
            <td>nd = 1.518 – 1.522</td>
            <td>nd = 1.518 – 1.522</td>
            <td>nd = 1.525 – 1.530</td>
            <td>Exceptional prism light dispersion and diamond-cut fire sparkle</td>
          </tr>
          <tr>
            <td><strong>Visible Light Transmission</strong></td>
            <td>DIN 5036-3</td>
            <td>99.2% (Clear Crystal)</td>
            <td>99.2% (Clear Crystal)</td>
            <td>91.0% (Concave Lens)</td>
            <td>Museum-grade clarity with zero greenish hue or chromatic shift</td>
          </tr>
          <tr>
            <td><strong>Density / Specific Gravity</strong></td>
            <td>ASTM C729</td>
            <td>2.50 g/cm³</td>
            <td>2.50 g/cm³</td>
            <td>2.52 g/cm³</td>
            <td>Heavy monolithic mass providing robust tactile solidity</td>
          </tr>
          <tr>
            <td><strong>Mohs Surface Hardness</strong></td>
            <td>EN 101</td>
            <td>6.5 – 7.0 Mohs</td>
            <td>6.5 – 7.0 Mohs</td>
            <td>7.0 Mohs</td>
            <td>Highly scratch-resistant diamond-polished optical face</td>
          </tr>
          <tr>
            <td><strong>Internal Stress Birefringence</strong></td>
            <td>Polarimetry Analysis</td>
            <td>< 10 nm/cm (Optical Grade)</td>
            <td>< 10 nm/cm (Optical Grade)</td>
            <td>< 12 nm/cm (Optical Grade)</td>
            <td>Precision 48-hr slow annealing prevents spontaneous shattering</td>
          </tr>
          <tr>
            <td><strong>Carton Packaging & Palletizing</strong></td>
            <td>Export Standards</td>
            <td>6 pcs / ctn · 15.0 kg</td>
            <td>12 pcs / ctn · 15.0 kg</td>
            <td>4 pcs / ctn · 12.8 kg</td>
            <td>Custom CNC foam inserts in ISPM-15 wooden ocean crates</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin-top:2mm;">
      <div style="background:#1e293b;border:1px solid #334155;border-radius:2mm;padding:2.5mm 3.5mm;">
        <div style="color:#fbbf24;font-size:7.5pt;font-weight:700;">SPECIFICATION & SAMPLE PROTOCOL</div>
        <div style="font-size:6.3pt;color:#cbd5e1;line-height:1.4;margin-top:1mm;">
          1. <strong>Product Code Selection:</strong> Specify codes (e.g. ST-SGB-001 Super Clear, ST-SGB-003 Rebar Core, ST-SGB-010 Ocean Blue).<br>
          2. <strong>CAD Detailing Review:</strong> Share wall elevation drawings for structural anchoring calculation and UV adhesive volume estimation.<br>
          3. <strong>Architect Sample Box:</strong> High-density presentation case containing polished crystal brick cuts dispatched to architects upon request.
        </div>
      </div>
      
      <div style="background:#1e293b;border:1px solid #334155;border-radius:2mm;padding:2.5mm 3.5mm;">
        <div style="color:#fbbf24;font-size:7.5pt;font-weight:700;">VISIT OUR ATELIER & EXPERIENCE CENTER</div>
        <div style="font-size:6.3pt;color:#cbd5e1;line-height:1.4;margin-top:1mm;">
          <strong>Ahmedabad Experience Center:</strong> E-02, Ground Floor, SG Business Hub, Vasant Nagar, Gota, Ahmedabad, Gujarat 380060.<br>
          <strong>Direct WhatsApp & Helpline:</strong> +91 77420 90866 / +91 97844 52998<br>
          <strong>Port of Dispatch:</strong> Mundra Port / JNPT Port, India · Fully Insured Door-to-Door Worldwide Logistics.
        </div>
      </div>
    </div>
    
    <div class="prod-footer" style="border-top:1px solid #334155;color:#94a3b8;padding-top:1.5mm;">
      <div>© 2026 STONE TECH ATELIER · SOLID GLASS BRICK DIVISION. ALL RIGHTS RESERVED.</div>
      <div>WWW.STONETECH.IN · INFO@STONETECH.IN</div>
      <div style="color:#fbbf24;">Page 36 / {total_pages}</div>
    </div>
  </div>
</div>
""")

    parts.append("</body>\n</html>")
    return "\n".join(parts)


def compile_pdf(html_content, output_path):
    temp_html = f"/tmp/solid_glass_{int(time.time() * 1000)}.html"
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
    print(f"Compiling Solid Glass Bricks PDF to: {output_path}...")
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print("Chrome error:", res.stderr)
        raise RuntimeError(f"Chrome PDF generation failed with code {res.returncode}")

    if os.path.exists(temp_html):
        os.remove(temp_html)

    size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"SUCCESS: Generated {output_path} ({size_mb:.2f} MB)")


def main():
    print("Generating Solid Glass Bricks Catalogue HTML...")
    html_content = generate_html()
    compile_pdf(html_content, OUTPUT_PDF)
    
    # Mirror to ~/Downloads/
    shutil.copyfile(OUTPUT_PDF, DOWNLOADS_PDF)
    print(f"Mirrored catalogue to {DOWNLOADS_PDF}")


if __name__ == "__main__":
    main()

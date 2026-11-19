#!/usr/bin/env python3
"""
Stone Tech Atelier — Natural Stone Pebbles & Semi-Precious Aggregates Catalogue Generator (2026-2027)
Strictly adheres to Stone Tech Atelier Luxury Architectural Design System (Landscape A4: 297mm x 210mm).
Unifies all 75 stone pebble items from source materials without any bridging description page.
Treats as 2026-2027 Master Edition (zero 2018 mentions).
All product images are uniform equal-sized 1:1 frames with all embedded text removed.
Product names and architectural specifications are displayed separately with precision typography.

Compiles via Headless Google Chrome (< 24 MiB).
"""

import os
import sys
import time
import subprocess
import shutil

REPO_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ASSETS_DIR = os.path.join(REPO_DIR, "public/catalogues/stone-pebbles-assets")
BRANDING_DIR = os.path.join(REPO_DIR, "public/branding")
OUTPUT_PDF = os.path.join(REPO_DIR, "public/catalogues/StoneTech_Stone_Pebbles_Catalogue_2026.pdf")
DOWNLOADS_PDF = os.path.expanduser("~/Downloads/StoneTech_Stone_Pebbles_Catalogue_2026.pdf")

EMBLEM_PATH = os.path.join(BRANDING_DIR, "stone-tech-emblem-hq.png")
BADGE_PATH = os.path.join(BRANDING_DIR, "stone-tech-manufacturer-badge.png")

# All 75 products with complete architectural specifications
PEBBLES = [
    # 1 - 38 (Part 1 source)
    {
        "id": 1, "code": "ST-PB-001", "name": "Rose Quartz",
        "category": "Semi-Precious Agates", "mineral": "Natural Crystalline Rose Quartz",
        "finish": "Tumbled Polished High-Luster", "sizes": "10-25mm · 25-50mm",
        "color": "Translucent Soft Blush Rose",
        "use": "Luxury Resin Terrazzo, Reflection Pools, Planter Topping, Spa Interiors",
        "desc": "Natural translucent rose crystalline quartz pebbles exhibiting warm blush tones and polished glass luster for high-end hospitality and serene residential spaces."
    },
    {
        "id": 2, "code": "ST-PB-002", "name": "Crystal Quartz",
        "category": "Semi-Precious Agates", "mineral": "Pure Hydrothermal Crystal Quartz",
        "finish": "Tumbled Polished Translucent", "sizes": "10-25mm · 25-50mm",
        "color": "Ice-Clear Translucent White",
        "use": "Backlit Water Cascades, Zen Glass Borders, Luxury Planters, Wellness Areas",
        "desc": "High-purity natural clear quartz stones that catch and refract ambient light, creating luminous crystalline accents around architectural water bodies."
    },
    {
        "id": 3, "code": "ST-PB-003", "name": "African Amethyst",
        "category": "Semi-Precious Agates", "mineral": "Natural Violet Crystalline Amethyst",
        "finish": "Tumbled Polished Royal Purple", "sizes": "15-30mm · 30-60mm",
        "color": "Deep Royal Violet to Lavender",
        "use": "Prestige Display Trays, Boutique Foyers, Water Bowls, Meditation Courtyards",
        "desc": "Select deep royal purple African amethyst nodules with natural crystalline zoning, delivering opulent jewel-toned highlights to bespoke interior landscape designs."
    },
    {
        "id": 4, "code": "ST-PB-004", "name": "Red Carnelian",
        "category": "Semi-Precious Agates", "mineral": "Cryptocrystalline Carnelian Chalcedony",
        "finish": "Tumbled Polished Rich Sienna", "sizes": "10-25mm · 25-50mm",
        "color": "Fiery Amber, Blood Orange & Sienna",
        "use": "Warm Terrazzo Inlays, Zen Dry Riverbeds, Bonsai Staging, Courtyard Accents",
        "desc": "Vibrant microcrystalline chalcedony stones radiating warm carnelian amber and terracotta hues, ideal for grounding spaces with natural warmth."
    },
    {
        "id": 5, "code": "ST-PB-005", "name": "Lapis Lazuli",
        "category": "Semi-Precious Agates", "mineral": "Natural Metamorphic Lapis Lazuli",
        "finish": "Polished Celestial Ultramarine", "sizes": "10-25mm · 25-50mm",
        "color": "Intense Deep Azure with Pyrite Specks",
        "use": "Exclusive Jewelry Counter Scapes, Water Basins, Luxury Villa Accent Inlays",
        "desc": "Historic deep celestial blue stone accented by subtle golden pyrite flecks, presenting an unmistakable aura of royalty and timeless antiquity."
    },
    {
        "id": 6, "code": "ST-PB-006", "name": "Tiger Stone",
        "category": "Semi-Precious Agates", "mineral": "Crocidolite Quartz (Tiger Eye)",
        "finish": "Silky Chatoyant Golden Lustre", "sizes": "15-30mm · 30-60mm",
        "color": "Chatoyant Golden Honey & Dark Mocha",
        "use": "Architectural Decorative Borders, Modern Zen Gardens, Luxury Centerpieces",
        "desc": "Distinctive chatoyant quartz aggregate displaying shifting golden-amber bands under light, adding captivating dynamic movement to static stone beds."
    },
    {
        "id": 7, "code": "ST-PB-007", "name": "Labradorite",
        "category": "Semi-Precious Agates", "mineral": "Feldspathic Plagioclase Labradorite",
        "finish": "Iridescent Labradorescence Polish", "sizes": "20-40mm · 40-70mm",
        "color": "Smoky Charcoal with Peacock Blue Sheen",
        "use": "Water Feature Substrates, Dramatic Accent Beds, Signature Entryway Troughs",
        "desc": "Mystical feldspar minerals producing optical interference labradorescence in vivid turquoise, peacock blue, and gold flashes when illuminated."
    },
    {
        "id": 8, "code": "ST-PB-008", "name": "White Rainbow",
        "category": "Semi-Precious Agates", "mineral": "Natural Opalescent Silica Pebble",
        "finish": "Opalescent Polished White", "sizes": "10-25mm · 25-50mm",
        "color": "Pristine White with Spectral Play",
        "use": "Minimalist Japanese Rock Gardens, Planter Tops, Clean Architectural Margins",
        "desc": "Ultra-clean opalescent white pebbles capturing delicate rainbow diffraction, providing an immaculate, tranquil ground plane for modern greenery."
    },
    {
        "id": 9, "code": "ST-PB-009", "name": "Black Tourmaline",
        "category": "Semi-Precious Agates", "mineral": "Natural Schorl Black Tourmaline",
        "finish": "High-Density Polished Jet Black", "sizes": "15-35mm · 35-70mm",
        "color": "Pitch Black Mirror Polish",
        "use": "High-Contrast Landscape Mulch, Perimeter Water Runways, Modern Villas",
        "desc": "High-density schorl tourmaline pebbles featuring mirror-like black surface sheen, renowned for grounding energy and bold architectural contrast against white walls."
    },
    {
        "id": 10, "code": "ST-PB-010", "name": "Green Aventurine",
        "category": "Semi-Precious Agates", "mineral": "Fuchsite-Bearing Quartzite",
        "finish": "Tumbled Polished Jade Sheen", "sizes": "10-25mm · 25-50mm",
        "color": "Translucent Forest & Jade Green",
        "use": "Botanical Planters, Living Wall Bases, Courtyard Streams, Zen Gardens",
        "desc": "Crystalline green quartz infused with microscopic mica platelets that shimmer gently, blending harmoniously with lush landscaping and outdoor flora."
    },
    {
        "id": 11, "code": "ST-PB-011", "name": "White Glaze Onyx",
        "category": "Onyx Pebbles", "mineral": "Microcrystalline Calcite Onyx",
        "finish": "Glazed Vitrified Polished White", "sizes": "15-30mm · 30-60mm",
        "color": "Vitrified Glaze Ivory & Pearl",
        "use": "Illuminated Water Features, Luxury Spa Baths, Reflective Garden Pools",
        "desc": "Silky glazed calcite onyx exhibiting delicate porcelain-like translucence that glows dramatically under underwater LED architectural illumination."
    },
    {
        "id": 12, "code": "ST-PB-012", "name": "Blue Onyx",
        "category": "Onyx Pebbles", "mineral": "Natural Banded Blue Calcite Onyx",
        "finish": "Translucent Azure Polished", "sizes": "15-30mm · 30-60mm",
        "color": "Sky Azure & Aquamarine Waves",
        "use": "Pool Decks, Indoor Water Rills, Fountain Basins, Sculptural Bases",
        "desc": "Rare natural azure calcite pebbles featuring undulating oceanic banding, infusing aquatic environments with calming Mediterranean serenity."
    },
    {
        "id": 13, "code": "ST-PB-013", "name": "Orange Onyx",
        "category": "Onyx Pebbles", "mineral": "Aragonite Calcite Onyx",
        "finish": "Vibrant Citrine Warm Polish", "sizes": "15-30mm · 30-60mm",
        "color": "Sunburst Tangerine & Honey Gold",
        "use": "Warm Accent Strips, Fireplace Surrounds, Courtyard Highlights, Planters",
        "desc": "Glowing tangerine aragonite stones displaying high natural translucence and fiery warm tones that evoke radiant desert sunsets."
    },
    {
        "id": 14, "code": "ST-PB-014", "name": "Pink Onyx",
        "category": "Onyx Pebbles", "mineral": "Sedimentary Translucent Rose Onyx",
        "finish": "Blush Rose Translucent Polish", "sizes": "15-30mm · 30-60mm",
        "color": "Pastel Peony & Soft Quartz Pink",
        "use": "Beauty Atelier Interiors, Boutique Hotel Lobbies, Wellness Sanctuaries",
        "desc": "Delicate rose-toned translucent onyx pebbles exuding feminine elegance, gentle softness, and warm light diffusion for luxury interior applications."
    },
    {
        "id": 15, "code": "ST-PB-015", "name": "Cherry Onyx",
        "category": "Onyx Pebbles", "mineral": "Banded Iron-Bearing Calcite Onyx",
        "finish": "Deep Cherry Veined Polished", "sizes": "15-30mm · 30-60mm",
        "color": "Rich Maroon, Ruby & Cream Veins",
        "use": "Dramatic Dry Riverbeds, Luxury Planter Borders, Executive Terrace Gardens",
        "desc": "Rich burgundy and cherry red banded pebbles with distinctive crystalline swirls that impart bold warmth and luxurious classical depth."
    },
    {
        "id": 16, "code": "ST-PB-016", "name": "Purple Onyx",
        "category": "Onyx Pebbles", "mineral": "Manganese Calcite Onyx",
        "finish": "Violet Hued Translucent Polish", "sizes": "15-30mm · 30-60mm",
        "color": "Lavender, Heather & Deep Violet",
        "use": "Courtyard Centerpieces, Decorative Bowls, Art Gallery Walkways",
        "desc": "Striking purple-toned onyx stones displaying concentric banding and subtle translucent depth, offering a regal color palette for distinctive landscapes."
    },
    {
        "id": 17, "code": "ST-PB-017", "name": "Yellow Onyx",
        "category": "Onyx Pebbles", "mineral": "Hydrated Iron Oxide Onyx",
        "finish": "Golden Honey Warm Polish", "sizes": "15-30mm · 30-60mm",
        "color": "Warm Buttercup, Amber & Honey",
        "use": "Landscape Walkways, Sunlight Reflectors, Resort Patios, Planters",
        "desc": "Lustrous honey-golden onyx pebbles that retain natural warmth even in shade, brightening landscape borders with continuous golden sunshine tones."
    },
    {
        "id": 18, "code": "ST-PB-018", "name": "Soft Lime Onyx",
        "category": "Onyx Pebbles", "mineral": "Silicate Lime Calcite Onyx",
        "finish": "Pistachio Celadon Polished", "sizes": "15-30mm · 30-60mm",
        "color": "Pastel Pistachio & Celadon Green",
        "use": "Japanese Zen Gardens, Tea Pavilions, Water Cascades, Modern Planters",
        "desc": "Gentle celadon and pistachio-tinted onyx pebbles evocative of fresh spring shoots, creating calming organic harmony alongside timber and bamboo."
    },
    {
        "id": 19, "code": "ST-PB-019", "name": "Black Storm Onyx",
        "category": "Onyx Pebbles", "mineral": "Bituminous Banded Calcite Onyx",
        "finish": "Veined Charcoal Dramatic Polish", "sizes": "20-40mm · 40-70mm",
        "color": "Stormy Charcoal with White Calcite Veins",
        "use": "High-Contrast Luxury Borders, Sculptural Podiums, Modern Pool Margins",
        "desc": "Dynamic black and smoke-grey banded onyx stones intersected by crisp white calcite veining, reminiscent of dramatic storm clouds."
    },
    {
        "id": 20, "code": "ST-PB-020", "name": "Indian Amethyst",
        "category": "Semi-Precious Agates", "mineral": "Deccan Trap Geode Amethyst",
        "finish": "Natural Crystalline Lavender", "sizes": "15-30mm · 30-50mm",
        "color": "Earthy Lilac to Deep Quartz Purple",
        "use": "Naturalistic Rock Gardens, Meditation Zones, Exotic Water Features",
        "desc": "Authentic Indian subcontinent amethyst aggregate showing genuine geode matrix texture and soft lilac crystalline faces for organic landscape design."
    },
    {
        "id": 21, "code": "ST-PB-021", "name": "Banded Onyx",
        "category": "Onyx Pebbles", "mineral": "Agate-Stratified Calcite Onyx",
        "finish": "Multi-Strata Agate Banding", "sizes": "20-40mm · 40-70mm",
        "color": "Multicolor Concentric Ribbons",
        "use": "Artisan Terrazzo Inlays, Dry Stream Cascades, Garden Feature Trays",
        "desc": "Museum-grade banded pebbles showcasing hypnotic multi-color concentric layers in ivory, mocha, ochre, and chocolate for discerning architectural details."
    },
    {
        "id": 22, "code": "ST-PB-022", "name": "Las Vegas Onyx",
        "category": "Onyx Pebbles", "mineral": "Golden-Brown Stratified Onyx",
        "finish": "Caramel Amber Striated Polish", "sizes": "20-40mm · 40-70mm",
        "color": "Caramel, Copper & Bronze Ribbons",
        "use": "Hospitality Atriums, Casino Lounges, Pool Deck Edges, Luxury Villas",
        "desc": "Opulent golden-bronze striated onyx stones radiating warm theatrical glamour, perfect for framing resort entrance walkways and water installations."
    },
    {
        "id": 23, "code": "ST-PB-023", "name": "Soothing Sydney Onyx",
        "category": "Onyx Pebbles", "mineral": "Silica-Infused Calcite Onyx",
        "finish": "Silk Opal Translucent Polish", "sizes": "20-40mm · 40-70mm",
        "color": "Cream, Champagne & Pale Amber",
        "use": "Coastal Villas, Minimalist Courtyards, Lighted Patios, Tree Basins",
        "desc": "Soft champagne and silk-opal tumbled pebbles reminiscent of tranquil coastal sandstone coves, delivering peaceful warmth underfoot."
    },
    {
        "id": 24, "code": "ST-PB-024", "name": "Tree Agate",
        "category": "Semi-Precious Agates", "mineral": "Dendritic White Quartz Agate",
        "finish": "Dendritic Forest Green Polish", "sizes": "15-30mm · 30-50mm",
        "color": "Milky White with Fern-Green Dendrites",
        "use": "Botanical Terrariums, Bonsai Bases, Luxury Garden Planters, Water Features",
        "desc": "Fascinating natural white agate bearing mossy fern-like green silicate dendrites that resemble miniature tree branches etched into pure quartz."
    },
    {
        "id": 25, "code": "ST-PB-025", "name": "Jasper Agate",
        "category": "Semi-Precious Agates", "mineral": "Brecciated Polychrome Jasper",
        "finish": "Brecciated Earthy Polished", "sizes": "15-30mm · 30-60mm",
        "color": "Brick Red, Mustard, Olive & Cream",
        "use": "Earth-Toned Terrazzo, Zen Dry Streams, Native Flora Beds, Stepping Borders",
        "desc": "Multi-colored brecciated jasper pebbles displaying rich geological mosaic patterns of deep terracotta, desert ochre, and warm slate."
    },
    {
        "id": 26, "code": "ST-PB-026", "name": "Carrot Bout",
        "category": "Semi-Precious Agates", "mineral": "High-Saturation Orange Chalcedony",
        "finish": "Flame Orange Smooth Tumbled", "sizes": "15-30mm · 30-50mm",
        "color": "Intense Carrot & Flame Orange",
        "use": "High-Impact Focal Borders, Modern Art Walkways, Exotic Planter Bases",
        "desc": "High-chroma orange tumbled chalcedony pebbles providing striking chromatic punch and joyful vibrancy across contemporary architectural landscapes."
    },
    {
        "id": 27, "code": "ST-PB-027", "name": "Seaweed Green",
        "category": "Landscape & River", "mineral": "Marine Serpentine River Stone",
        "finish": "Deep Marine Botanical Polish", "sizes": "20-40mm · 40-70mm",
        "color": "Deep Olive, Seaweed & Kelp Green",
        "use": "Submerged Pool Floors, Pond Edges, Tropical Courtyards, Waterfalls",
        "desc": "Smooth water-polished river pebbles exhibiting lush marine kelp and deep olive tones that deepen dramatically into lustrous emerald when wetted."
    },
    {
        "id": 28, "code": "ST-PB-028", "name": "Elegant Black",
        "category": "Landscape & River", "mineral": "High-Purity Natural Basalt",
        "finish": "Piano Gloss Mirror Jet Black", "sizes": "20-40mm · 40-70mm · 70-100mm",
        "color": "Deep Pitch Obsidian Black",
        "use": "Reflecting Pools, Contemporary Zen Gardens, High-End Planters, Driveways",
        "desc": "The architectural standard for modern minimalism: ultra-smooth piano-gloss polished jet black basalt pebbles that maintain flawless obsidian luster."
    },
    {
        "id": 29, "code": "ST-PB-029", "name": "California UG",
        "category": "Landscape & River", "mineral": "Pacific Coastal River Aggregate",
        "finish": "Pacific Coastal Tumbled Polish", "sizes": "20-40mm · 40-70mm",
        "color": "Smoky Quartz, Taupe & Driftwood",
        "use": "Coastal Estate Landscaping, Desert Modern Architecture, Driveway Borders",
        "desc": "Earthy Pacific coastal river stones featuring subtle driftwood taupe, smoky slate, and warm grey shades that pair seamlessly with desert native plantings."
    },
    {
        "id": 30, "code": "ST-PB-030", "name": "Downtown Grey",
        "category": "Landscape & River", "mineral": "Metamorphic Grey Quartzite",
        "finish": "Urban Slate Polished Grey", "sizes": "20-40mm · 40-70mm",
        "color": "Cool Architectural Slate Grey",
        "use": "Corporate Courtyards, Brutalist Concrete Accents, Terrace Borders",
        "desc": "Sleek, neutral architectural slate grey pebbles engineered to complement exposed concrete, steel, and architectural glass in urban developments."
    },
    {
        "id": 31, "code": "ST-PB-031", "name": "Arabian Dunes",
        "category": "Landscape & River", "mineral": "Sedimentary Desert Quartzite",
        "finish": "Warm Desert Ochre Polished", "sizes": "20-40mm · 40-70mm",
        "color": "Golden Sand, Ochre & Biscuit",
        "use": "Mediterranean Estates, Sand-Washed Patios, Dry Riverbeds, Tree Pits",
        "desc": "Warm desert sand pebbles reflecting golden sunlit dunes, infusing dry landscape schemes and succulent gardens with authentic desert elegance."
    },
    {
        "id": 32, "code": "ST-PB-032", "name": "Caribbean Fantasy",
        "category": "Landscape & River", "mineral": "Poly-Mineral Coastal Aggregate",
        "finish": "Tropical Multi-Hue Tumbled", "sizes": "15-35mm · 35-65mm",
        "color": "Pastel Turquoise, Coral & Sand Blend",
        "use": "Resort Lagoon Edges, Beach House Patios, Tropical Garden Pathways",
        "desc": "Joyful tumbled blend of marine-colored stones evoking pristine Caribbean coral sands, ideal for resort swimming lagoons and coastal boardwalks."
    },
    {
        "id": 33, "code": "ST-PB-033", "name": "Oceanic Green",
        "category": "Landscape & River", "mineral": "Glaucophane Greenschist Pebble",
        "finish": "Aquamarine Tide Polished", "sizes": "20-40mm · 40-70mm",
        "color": "Seafoam, Sage & Aquamarine",
        "use": "Fountains, Infinity Pool Perimeters, Zen Garden Streams, Spa Floors",
        "desc": "Cool seafoam and tide-pool green pebbles with smooth tumbled contours that create tranquil water reflections in architectural water installations."
    },
    {
        "id": 34, "code": "ST-PB-034", "name": "White Dew",
        "category": "Landscape & River", "mineral": "High-Purity Snow White Calcite",
        "finish": "Pristine Snow Polished White", "sizes": "15-30mm · 30-60mm · 60-90mm",
        "color": "Brilliant Snow White Gloss",
        "use": "Zen Raked Borders, Contrast Planter Topping, Walkways, Modern Villas",
        "desc": "Pristine high-calcium brilliant white pebbles providing radiant clean lines, maximum light reflection, and timeless classical distinction."
    },
    {
        "id": 35, "code": "ST-PB-035", "name": "Sage Green",
        "category": "Landscape & River", "mineral": "Hydrated Magnesium Silicate",
        "finish": "Soft Olive Herbaceous Polish", "sizes": "20-40mm · 40-70mm",
        "color": "Subtle Sage & Dried Eucalyptus",
        "use": "English Country Gardens, Herbal Walkways, Zen Dry Rivers, Courtyards",
        "desc": "Understated sage green river pebbles with gentle matte-to-polished luster that blend quietly into evergreen landscape designs without competing."
    },
    {
        "id": 36, "code": "ST-PB-036", "name": "Bloodstone",
        "category": "Semi-Precious Agates", "mineral": "Heliotrope Jasper-Chalcedony",
        "finish": "Heliotrope Jasper Polished", "sizes": "15-30mm · 30-60mm",
        "color": "Dark Forest Green with Red Jasper Specks",
        "use": "Collector Displays, Heritage Water Rills, Dramatic Bonsai Framing",
        "desc": "Rare heliotrope jasper stones boasting deep moss-green matrix flecked with bright red iron oxide inclusions, treasured since antiquity."
    },
    {
        "id": 37, "code": "ST-PB-037", "name": "Dyed Stone Pebbles",
        "category": "Decorative & Specialty", "mineral": "High-Absorption Quartz Base",
        "finish": "Chromatic Prism Coated", "sizes": "10-25mm · 25-40mm",
        "color": "Curated Vibrant Color Palette",
        "use": "Commercial Display Windows, Event Architecture, Theme Landscapes",
        "desc": "Artisan pigment-infused quartz pebbles available in custom RAL matched tones for branding installations, creative events, and accent displays."
    },
    {
        "id": 38, "code": "ST-PB-038", "name": "Golden Brown",
        "category": "Landscape & River", "mineral": "Ferruginous River Quartzite",
        "finish": "Warm Amber River Polished", "sizes": "20-40mm · 40-70mm",
        "color": "Warm Honey, Chestnut & Amber",
        "use": "Rustic Walkways, Traditional Courtyards, Water Cascades, Tree Bases",
        "desc": "Classic water-smoothed golden brown riverbed pebbles delivering natural rustic charm and comfortable walking surfaces for garden trails."
    },

    # 39 - 75 (Part 2 source - seamless continuation)
    {
        "id": 39, "code": "ST-PB-039", "name": "Golden Beige",
        "category": "Landscape & River", "mineral": "Fossiliferous Cream Calcite",
        "finish": "Champagne Warm Cream Polish", "sizes": "20-40mm · 40-70mm",
        "color": "Champagne Beige & Soft Cream",
        "use": "Limestone Patios, Pool Coping Accents, Villa Walkways, Interior Atriums",
        "desc": "Soft champagne beige pebbles with subtle crystalline luster, providing seamless visual harmony alongside travertine and crema marble paving."
    },
    {
        "id": 40, "code": "ST-PB-040", "name": "Elegant Black Jumbo",
        "category": "Jumbo & Flat Pebbles", "mineral": "Massive Basalt Volcanic Stone",
        "finish": "Monumental Gloss Polished Black", "sizes": "80-120mm · 120-180mm",
        "color": "Monumental Piano Jet Black",
        "use": "Statement Garden Boulders, Dry Creek Accents, Water Wall Basins",
        "desc": "Large-format architectural black basalt boulders tumbled and polished to perfection, creating majestic anchors for high-end landscape features."
    },
    {
        "id": 41, "code": "ST-PB-041", "name": "White Dew Jumbo",
        "category": "Jumbo & Flat Pebbles", "mineral": "Massive Crystalline Calcite",
        "finish": "Monumental Polished Pure White", "sizes": "80-120mm · 120-180mm",
        "color": "Sculptural Pure Alabaster White",
        "use": "Zen Focus Rocks, Pool Perimeter Islands, Architectural Swales",
        "desc": "Magnificent large-scale snow white boulders sculpted by water and diamond polish, standing out dramatically against dark mulch or green turf."
    },
    {
        "id": 42, "code": "ST-PB-042", "name": "Soft Grey Jumbo",
        "category": "Jumbo & Flat Pebbles", "mineral": "Dolomitic Grey River Boulder",
        "finish": "Architectural Smooth Slate Grey", "sizes": "80-120mm · 120-180mm",
        "color": "Neutral Dovetail & Flannel Grey",
        "use": "Rain Gardens, Bioswale Stabilizers, Large Planters, Public Plazas",
        "desc": "Substantial neutral grey river stones with velvety rounded edges, engineered to anchor commercial stormwater swales and modern courtyard beds."
    },
    {
        "id": 43, "code": "ST-PB-043", "name": "Downtown Grey Flat",
        "category": "Jumbo & Flat Pebbles", "mineral": "Foliated Slate-Quartzite Flat",
        "finish": "Flat Stepping Disc River Polish", "sizes": "50-90mm Flat · 90-140mm Flat",
        "color": "Smooth Architectural Graphite Flat",
        "use": "Zen Stacking Cairn Towers, Water Features, Low-Profile Groundcovers",
        "desc": "Naturally flattened disc pebbles shaped by millennia of glacial river currents, ideal for Japanese cairn stacking and smooth water rills."
    },
    {
        "id": 44, "code": "ST-PB-044", "name": "Elegant Black Flat",
        "category": "Jumbo & Flat Pebbles", "mineral": "Fine-Grained Basalt Stepping Stone",
        "finish": "Flat Stepping Disc Jet Black Polish", "sizes": "50-90mm Flat · 90-140mm Flat",
        "color": "Flat Jet Obsidian Mirror Disc",
        "use": "Reflecting Pool Floors, Barefoot Zen Pathways, Massage Walkways",
        "desc": "Ultra-flat polished black basalt stones offering exceptional tactile smoothness under barefoot walking paths in luxury wellness retreats."
    },
    {
        "id": 45, "code": "ST-PB-045", "name": "Chocolate Brown Flat",
        "category": "Jumbo & Flat Pebbles", "mineral": "Sedimentary Chocolate Siltstone",
        "finish": "Flat Stepping Disc Espresso Polish", "sizes": "50-90mm Flat · 90-140mm Flat",
        "color": "Rich Dark Espresso & Mocha Flat",
        "use": "Timber Deck Margins, Japanese Stepping Trails, Naturalistic Ponds",
        "desc": "Rich espresso-brown flat river discs that integrate naturally with weathered hardwood decking, bark mulch, and bronze garden sculptures."
    },
    {
        "id": 46, "code": "ST-PB-046", "name": "Semi Polished Agates",
        "category": "Semi-Precious Agates", "mineral": "Natural Fortification Agate",
        "finish": "Satin Lustre Natural Banded", "sizes": "20-40mm · 40-70mm",
        "color": "Earthy Agate Concentric Waves",
        "use": "Artisan Water Cascades, Luxury Display Trays, Tactile Accent Stones",
        "desc": "Authentic fortification agates tumbled to a smooth satin touch while preserving their raw geological crust and concentric chalcedony rings."
    },
    {
        "id": 47, "code": "ST-PB-047", "name": "Enhydro Polished",
        "category": "Semi-Precious Agates", "mineral": "Water-Enclosed Quartz Geode",
        "finish": "Water-Bearing Quartz Polished", "sizes": "25-50mm · 50-80mm",
        "color": "Translucent Smoky Quartz Matrix",
        "use": "Prestige Mineral Showcases, Executive Boardrooms, Collector Niches",
        "desc": "Rare geological wonder featuring prehistoric water droplets encapsulated inside crystalline quartz chambers, polished to reveal internal cavities."
    },
    {
        "id": 48, "code": "ST-PB-048", "name": "Matte White Jumbo",
        "category": "Jumbo & Flat Pebbles", "mineral": "Natural Dolomitic White Marble",
        "finish": "Raw Tumbled Natural Matte Chalk", "sizes": "80-120mm · 120-180mm",
        "color": "Chalky Natural Matte White",
        "use": "Dry Zen Rock Gardens, Mediterranean Olive Groves, Xeriscaping",
        "desc": "Unglazed raw tumbled white marble boulders with an organic matte chalk texture, providing non-glare sculptural highlights in bright sun."
    },
    {
        "id": 49, "code": "ST-PB-049", "name": "Raw River Black",
        "category": "Landscape & River", "mineral": "Unpolished Natural River Basalt",
        "finish": "Authentic Basalt Riverbed Matte", "sizes": "25-50mm · 50-90mm",
        "color": "Charcoal Grey (Matte) / Jet (Wet)",
        "use": "Dry Riverbeds, Natural Waterfalls, Eco-Swales, Rainwater Harvesting",
        "desc": "Pure raw riverbed basalt untouched by chemical polish, transitioning naturally from soft charcoal grey when dry to deep midnight black when wet."
    },
    {
        "id": 50, "code": "ST-PB-050", "name": "Matte Yellow Jumbo",
        "category": "Jumbo & Flat Pebbles", "mineral": "Jaisalmer Ochre Sandstone Boulder",
        "finish": "Natural Tumbled Desert Ochre Matte", "sizes": "80-120mm · 120-180mm",
        "color": "Golden Ochre & Sand Dune Matte",
        "use": "Heritage Landscape Restoration, Desert Xeriscaping, Courtyard Accents",
        "desc": "Substantial desert ochre boulders with velvety raw tumbled surface, capturing the historic warmth of ancient sandstone architecture."
    },
    {
        "id": 51, "code": "ST-PB-051", "name": "Matte Royal Black",
        "category": "Landscape & River", "mineral": "Dense Metamorphic Amphibolite",
        "finish": "Tumbled Velvet Midnight Matte", "sizes": "25-50mm · 50-80mm",
        "color": "Velvety Midnight Charcoal Matte",
        "use": "Contemporary Minimalist Patios, Shaded Zen Gardens, Planter Bases",
        "desc": "Dense matte black river stones offering a soft tactile feel without artificial gloss, providing dignified contrast against architectural foliage."
    },
    {
        "id": 52, "code": "ST-PB-052", "name": "Matte Red Jumbo",
        "category": "Jumbo & Flat Pebbles", "mineral": "Ferruginous Red Sandstone Boulder",
        "finish": "Natural Terracotta Oxide Matte", "sizes": "80-120mm · 120-180mm",
        "color": "Earthy Terracotta & Indian Red",
        "use": "Southwestern Landscape, Heritage Courtyards, Sculptural Borders",
        "desc": "Bold raw terracotta red boulders with rich iron-oxide pigmentation, creating powerful warm focal points across desert and Mediterranean gardens."
    },
    {
        "id": 53, "code": "ST-PB-053", "name": "Coffee Bands Raw",
        "category": "Landscape & River", "mineral": "Sedimentary Banded Sandstone",
        "finish": "Natural Striated Riverbed Pebble", "sizes": "25-50mm · 50-80mm",
        "color": "Coffee, Caramel & Cream Rings",
        "use": "Dry Stream Invert, Naturalistic Terraces, Bio-Retention Basins",
        "desc": "Unpolished riverbed pebbles exhibiting delicate concentric sedimentation rings in coffee and cream, preserving natural river journey traces."
    },
    {
        "id": 54, "code": "ST-PB-054", "name": "D'Legno",
        "category": "Landscape & River", "mineral": "Silicified Petrified Wood Pebble",
        "finish": "Petrified Wood Grain Polished", "sizes": "25-50mm · 50-80mm",
        "color": "Fossilized Walnut Grain & Cream",
        "use": "Organic Modern Architecture, Zen Gardens, Timber-Framed Terraces",
        "desc": "Fascinating mineralized wood pebbles displaying authentic tree rings and bark patterns fossilized into durable silica over millions of years."
    },
    {
        "id": 55, "code": "ST-PB-055", "name": "Arcobaleno",
        "category": "Decorative & Specialty", "mineral": "Polychromatic Striated Marble",
        "finish": "Rainbow Multi-Faceted Polished", "sizes": "20-40mm · 40-70mm",
        "color": "Prismatic Pink, Gold, Green & Grey",
        "use": "Designer Terrazzo Mixes, Courtyard Fountains, Italian Garden Accents",
        "desc": "Italian-inspired rainbow marble pebbles featuring swirling bands of rose, pistache, cream, and graphite, celebrating natural geological artistry."
    },
    {
        "id": 56, "code": "ST-PB-056", "name": "Vena Verde",
        "category": "Landscape & River", "mineral": "Serpentine-Veined Calcite",
        "finish": "Green Serpentine Veined Polish", "sizes": "20-40mm · 40-70mm",
        "color": "Emerald & Jade Veins in White Matrix",
        "use": "Luxury Water Rills, Planter Insets, Spa Walkways, Atrium Borders",
        "desc": "Crisp crystalline white pebbles crisscrossed with vibrant forest green serpentine veins, evoking Italian marble elegance in pebble scale."
    },
    {
        "id": 57, "code": "ST-PB-057", "name": "Vena Marrone",
        "category": "Landscape & River", "mineral": "Brown Brecciated Limestone",
        "finish": "Brown Veined Calcite Polish", "sizes": "20-40mm · 40-70mm",
        "color": "Warm Crema with Chocolate Veins",
        "use": "Travertine Patios, Warm Terrazzo Blends, Swimming Pool Coping Margins",
        "desc": "Warm cream calcite pebbles enriched with bold chocolate-brown spider veining, harmonizing effortlessly with earth-toned building envelopes."
    },
    {
        "id": 58, "code": "ST-PB-058", "name": "JSL Giallo",
        "category": "Landscape & River", "mineral": "Jaisalmer Marine Fossil Limestone",
        "finish": "Italian Giallo Sienna Polish", "sizes": "20-40mm · 40-70mm",
        "color": "Deep Golden Yellow & Ochre",
        "use": "Mediterranean Terraces, Classical Courtyards, Sunny Promenade Edges",
        "desc": "Lustrous golden yellow limestone pebbles from legendary Jaisalmer strata, polished to reveal microscopic marine fossil impressions."
    },
    {
        "id": 59, "code": "ST-PB-059", "name": "Renero Granito",
        "category": "Landscape & River", "mineral": "Porphyritic Black Granite",
        "finish": "Black Granite Salt & Pepper Polish", "sizes": "20-40mm · 40-70mm",
        "color": "Granite Charcoal with Quartz Flecks",
        "use": "Commercial Walkways, Driveways, Heavy-Traffic Borders, Plaza Tree Pits",
        "desc": "Durable igneous granite pebbles displaying signature salt-and-pepper crystalline structure, offering extreme weather and abrasion resistance."
    },
    {
        "id": 60, "code": "ST-PB-060", "name": "Snowy Bianca Granito",
        "category": "Landscape & River", "mineral": "Leucocratic White Granite",
        "finish": "White Granite Crystalline Polish", "sizes": "20-40mm · 40-70mm",
        "color": "Sparkling White with Feldspar Mica",
        "use": "Modern Driveways, Raked Walkways, Illuminated Pool Borders",
        "desc": "High-durability white granite aggregate glistening with silver muscovite mica flakes, combining crystalline beauty with vehicular load capacity."
    },
    {
        "id": 61, "code": "ST-PB-061", "name": "Raw River Candies",
        "category": "Decorative & Specialty", "mineral": "Multi-Mineral Tumbled Riverbed",
        "finish": "Assorted Pastel Water-Worn Pebbles", "sizes": "15-30mm · 30-50mm",
        "color": "Assorted Pastel Rose, Mint, Buff & Taupe",
        "use": "Play Spaces, Children's Garden Trails, Organic Water Rills, Planters",
        "desc": "Naturally water-sculpted pastel river pebbles in soft candy-like rounded shapes, presenting a friendly, welcoming texture for recreational spaces."
    },
    {
        "id": 62, "code": "ST-PB-062", "name": "Stone Spheres",
        "category": "Decorative & Specialty", "mineral": "Lathe-Turned Agate & Jasper",
        "finish": "Precision Lathe-Turned Spheres", "sizes": "30mm · 50mm · 75mm · 100mm Dia",
        "color": "Polychrome Planetary Orbit Spheres",
        "use": "Architectural Focal Points, Water Fountains, Reflecting Trays, Zen Art",
        "desc": "Masterpiece architectural stone spheres hand-turned from solid geological boulders, creating mesmerizing geometric focal points in modern courtyards."
    },
    {
        "id": 63, "code": "ST-PB-063", "name": "Hand Painted Pebbles",
        "category": "Decorative & Specialty", "mineral": "Smooth Tumbled River Basalt",
        "finish": "Artisanal Enamel Painted Motif", "sizes": "40-70mm · 70-100mm",
        "color": "Custom Hand-Painted Artistic Motifs",
        "use": "Boutique Hospitality, Children's Healing Gardens, Custom Signage Markers",
        "desc": "Artisan-embellished river stones hand-painted with weather-resistant enamels for storytelling pathways, meditation markers, and boutique decor."
    },
    {
        "id": 64, "code": "ST-PB-064", "name": "Navratna Mini",
        "category": "Mini Pebbles & Chips", "mineral": "Nine Sacred Astrological Minerals",
        "finish": "Nine-Gem Astrological Blend Polished", "sizes": "6-12mm Micro Tumbled",
        "color": "Nine-Color Gemstone Harmony",
        "use": "Vastu & Sacred Architecture, Meditation Walkways, Temple Courtyards",
        "desc": "Sacred blend of nine natural gemstone pebbles formulated according to classical architectural balance, bringing cosmic color harmony to sacred spaces."
    },
    {
        "id": 65, "code": "ST-PB-065", "name": "White Dew Mini",
        "category": "Mini Pebbles & Chips", "mineral": "High-Purity Calcite Micro-Pebble",
        "finish": "Fine White Polished Micro Gravel", "sizes": "5-10mm · 8-15mm",
        "color": "Micro Snow White High Luster",
        "use": "Resin-Bound Walkways, Japanese Sand Raking, Potted Plant Dressing",
        "desc": "Petite snow-white tumbled pebbles offering smooth micro-texture, ideal for raked miniature zen gardens and seamless resin-bound architectural walkways."
    },
    {
        "id": 66, "code": "ST-PB-066", "name": "Arabian Dunes Mini",
        "category": "Mini Pebbles & Chips", "mineral": "Desert Quartz Micro Gravel",
        "finish": "Golden Desert Micro Pebbles", "sizes": "5-10mm · 8-15mm",
        "color": "Golden Amber Sand Micro Grain",
        "use": "Permeable Tree Surrounds, Modern Resin Pavements, Terrarium Tops",
        "desc": "Warm golden micro-pebbles that lock tightly together to form durable, water-permeable paths while providing radiant desert warmth."
    },
    {
        "id": 67, "code": "ST-PB-067", "name": "Dyed Colorful Mini",
        "category": "Mini Pebbles & Chips", "mineral": "Color-Stable Quartz Micro Grain",
        "finish": "Vivid Spectrum Coated Micro Gravel", "sizes": "4-8mm · 8-12mm",
        "color": "Vivid Cyan, Crimson, Gold & Violet",
        "use": "Creative Logo Inlays, Exhibition Grounds, Kids Playground Safety Zones",
        "desc": "Micro-graded quartz coated in UV-stable architectural polymers for vibrant logos, graphic ground planes, and expressive civic landscapes."
    },
    {
        "id": 68, "code": "ST-PB-068", "name": "Quartz Jujubes",
        "category": "Mini Pebbles & Chips", "mineral": "Tumbled Translucent Agate Jujubes",
        "finish": "Tumbled Jelly Quartz Drops", "sizes": "8-15mm · 15-22mm",
        "color": "Amber, Honey & Plum Jelly Tones",
        "use": "Glass Planter Displays, Water Light Boxes, Tabletop Fire Features",
        "desc": "Translucent rounded agate drops resembling sweet jujube berries, catching candlelight and water ripples with radiant warmth."
    },
    {
        "id": 69, "code": "ST-PB-069", "name": "Dyed Blue Sand",
        "category": "Mini Pebbles & Chips", "mineral": "High-Silica Architectural Sand",
        "finish": "Cobalt Blue Architectural Quartz Sand", "sizes": "0.5-1.5mm · 1.5-3mm Fine",
        "color": "Vibrant Oceanic Cobalt Blue",
        "use": "Zen Sand Patterns, Dry Sea Illusions, Artistic Poured Resin Floors",
        "desc": "Ultra-fine silica sand permanently pigmented in rich cobalt blue, allowing landscape architects to create symbolic flowing water rivers in dry gardens."
    },
    {
        "id": 70, "code": "ST-PB-070", "name": "White Nano Chips",
        "category": "Mini Pebbles & Chips", "mineral": "Micro-Crystalline Calcite Chips",
        "finish": "Micro-Fine Calcite Crystalline Chips", "sizes": "1-3mm · 3-5mm Nano",
        "color": "Sparkling Sugar White Nano",
        "use": "High-End Terrazzo Matrices, Exposed Aggregate Plasters, Bonsai Soil",
        "desc": "Sub-millimeter angular calcite crystals engineered for fine Venetian terrazzo mortars and sparkling micro-cement architectural wall finishes."
    },
    {
        "id": 71, "code": "ST-PB-071", "name": "Stone Chips White",
        "category": "Mini Pebbles & Chips", "mineral": "Makrana Crushed White Marble",
        "finish": "Angular Crushed White Marble Chips", "sizes": "6-10mm · 10-15mm · 15-20mm",
        "color": "Sharp Angular Brilliant White",
        "use": "Permeable Driveways, French Drains, Flat Roof Ballast, Modern Pathways",
        "desc": "Clean angular crushed marble chips that interlock securely under foot traffic, preventing displacement while maintaining crisp white modern geometry."
    },
    {
        "id": 72, "code": "ST-PB-072", "name": "Stone Chips Yellow",
        "category": "Mini Pebbles & Chips", "mineral": "Crushed Jaisalmer Yellow Limestone",
        "finish": "Angular Crushed Jaisalmer Yellow Chips", "sizes": "6-10mm · 10-15mm · 15-20mm",
        "color": "Warm Golden Saffron Angular Chips",
        "use": "Traditional Pathways, Courtyard Drainage Margins, Planter Mulch",
        "desc": "Angular crushed golden limestone chips providing warm desert aesthetics, excellent load-bearing compaction, and natural weed suppression."
    },
    {
        "id": 73, "code": "ST-PB-073", "name": "Stone Chips Red",
        "category": "Mini Pebbles & Chips", "mineral": "Crushed Dholpur Red Sandstone",
        "finish": "Angular Crushed Dholpur Red Chips", "sizes": "6-10mm · 10-15mm · 15-20mm",
        "color": "Rust Red & Terracotta Angular",
        "use": "Earthy Garden Borders, Jogging Paths, Historic Building Environs",
        "desc": "Authentic Dholpur red stone chips delivering rich terracotta tones, high compressive strength, and natural grip for pedestrian garden walks."
    },
    {
        "id": 74, "code": "ST-PB-074", "name": "Stone Chips Grey",
        "category": "Mini Pebbles & Chips", "mineral": "Crushed Kota Blue-Grey Limestone",
        "finish": "Angular Crushed Kota Grey Chips", "sizes": "6-10mm · 10-15mm · 15-20mm",
        "color": "Cool Slate & Gunmetal Grey",
        "use": "Commercial Parking Perimeters, Industrial Landscapes, French Drains",
        "desc": "Heavy-duty angular Kota stone chips offering exceptional durability, neutral architectural grey tonality, and high hydraulic permeability."
    },
    {
        "id": 75, "code": "ST-PB-075", "name": "Stone Chips Mixed",
        "category": "Mini Pebbles & Chips", "mineral": "Poly-Mineral Aggregate Decorative Chips",
        "finish": "Poly-Mineral Aggregate Decorative Chips", "sizes": "6-10mm · 10-15mm · 15-20mm",
        "color": "Multi-Tonal Quartz, Slate & Calcite",
        "use": "Eco-Driveways, Permeable Groundcovers, General Landscape Drainage",
        "desc": "Balanced multi-mineral angular gravel combining quartz, basalt, and limestone chips for versatile, low-maintenance landscape coverage."
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
  -webkit-font-smoothing: antialiased;
}
body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: #090d16;
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
  background: #090d16;
}

/* -------------------------------------------------------------------------
   COVER PAGE
------------------------------------------------------------------------- */
.cover-page {
  background: radial-gradient(circle at 50% 30%, #17223b 0%, #090d16 80%);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 9mm 12mm;
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
  font-size: 23pt;
  font-weight: 800;
  letter-spacing: 3px;
  color: #f59e0b;
  margin-bottom: 1mm;
}
.cover-subbrand {
  font-size: 9pt;
  font-weight: 600;
  letter-spacing: 4px;
  color: #94a3b8;
  text-transform: uppercase;
}
.cover-body {
  text-align: center;
  margin: auto 0;
  position: relative;
  z-index: 2;
}
.cover-title {
  font-size: 26pt;
  font-weight: 800;
  line-height: 1.15;
  color: #ffffff;
  letter-spacing: 1.5px;
  margin-bottom: 3mm;
  text-transform: uppercase;
}
.cover-title span {
  color: #f59e0b;
}
.cover-subtitle {
  font-size: 11pt;
  font-weight: 400;
  line-height: 1.4;
  color: #cbd5e1;
  max-width: 230mm;
  margin: 0 auto 4mm;
}
.cover-pills {
  display: flex;
  justify-content: center;
  gap: 3mm;
  margin-top: 3mm;
}
.cover-pill {
  padding: 1.5mm 4mm;
  background: rgba(245, 158, 11, 0.15);
  border: 0.3mm solid #f59e0b;
  border-radius: 20mm;
  font-size: 8pt;
  font-weight: 600;
  letter-spacing: 1.5px;
  color: #fbbf24;
  text-transform: uppercase;
}
.cover-footer {
  border-top: 0.3mm solid #334155;
  padding-top: 3mm;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  font-size: 7.5pt;
  color: #94a3b8;
  letter-spacing: 1px;
}
.cover-footer strong {
  color: #f59e0b;
}

/* -------------------------------------------------------------------------
   RUNNING HEADER & FOOTER
------------------------------------------------------------------------- */
.prod-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 3.5mm 10mm 2.5mm;
  border-bottom: 0.4mm solid #d97706;
  background: #0f172a;
}
.prod-header-left {
  display: flex;
  align-items: center;
  gap: 3mm;
}
.prod-brand-mini {
  font-size: 9.5pt;
  font-weight: 800;
  letter-spacing: 1.5px;
  color: #f59e0b;
}
.prod-cat-badge {
  font-size: 7pt;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  background: #1e293b;
  color: #38bdf8;
  padding: 0.8mm 2.5mm;
  border-radius: 1mm;
  border: 0.2mm solid #0284c7;
}
.prod-header-right {
  font-size: 7pt;
  font-weight: 600;
  letter-spacing: 1.5px;
  color: #94a3b8;
  text-transform: uppercase;
}
.prod-footer-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2mm 10mm;
  border-top: 0.3mm solid #1e293b;
  background: #090d16;
  font-size: 6.8pt;
  color: #64748b;
  letter-spacing: 0.8px;
}

/* -------------------------------------------------------------------------
   PAGE 2: MATERIALITY & OVERVIEW
------------------------------------------------------------------------- */
.overview-grid {
  padding: 5mm 10mm;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4mm;
  height: calc(210mm - 20mm);
}
.overview-card {
  background: #0f172a;
  border: 0.3mm solid #334155;
  border-radius: 2mm;
  padding: 3.5mm 4.5mm;
  display: flex;
  flex-direction: column;
}
.overview-title {
  font-size: 9.5pt;
  font-weight: 800;
  letter-spacing: 1.2px;
  color: #f59e0b;
  text-transform: uppercase;
  margin-bottom: 2mm;
  border-bottom: 0.3mm solid #1e293b;
  padding-bottom: 1.5mm;
}
.overview-body {
  font-size: 7.2pt;
  line-height: 1.45;
  color: #cbd5e1;
}
.overview-body strong {
  color: #ffffff;
}
.grading-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 7pt;
  margin-top: 2mm;
}
.grading-table th {
  background: #1e293b;
  color: #f59e0b;
  padding: 1.2mm 2mm;
  text-align: left;
  font-weight: 700;
  border: 0.2mm solid #334155;
}
.grading-table td {
  padding: 1.2mm 2mm;
  border: 0.2mm solid #1e293b;
  color: #e2e8f0;
}

/* -------------------------------------------------------------------------
   PRODUCT SHOWCASE GRID (4 ITEMS PER PAGE)
------------------------------------------------------------------------- */
.product-grid {
  padding: 4mm 9mm;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 3.5mm;
  height: calc(210mm - 20mm);
}
.product-card {
  background: #0f172a;
  border: 0.3mm solid #334155;
  border-radius: 2mm;
  padding: 3mm 3.5mm;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 3.5mm;
  box-shadow: 0 2px 4px rgba(0,0,0,0.4);
}
.product-img-box {
  width: 68mm;
  height: 68mm;
  flex-shrink: 0;
  background: #020617;
  border: 0.4mm solid #d97706;
  border-radius: 1.5mm;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.product-img-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1.2mm;
  overflow: hidden;
}
.product-meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5mm;
}
.prod-code-badge {
  font-size: 7.2pt;
  font-weight: 800;
  letter-spacing: 1px;
  color: #090d16;
  background: #f59e0b;
  padding: 0.6mm 2.2mm;
  border-radius: 1mm;
}
.prod-cat-pill {
  font-size: 6.5pt;
  font-weight: 700;
  letter-spacing: 0.8px;
  color: #38bdf8;
  text-transform: uppercase;
}
.product-name {
  font-size: 11pt;
  font-weight: 800;
  letter-spacing: 0.8px;
  color: #ffffff;
  line-height: 1.15;
}
.product-finish {
  font-size: 7.2pt;
  font-weight: 600;
  color: #fbbf24;
  letter-spacing: 0.5px;
}
.product-spec-line {
  font-size: 6.8pt;
  color: #94a3b8;
  line-height: 1.35;
}
.product-spec-line strong {
  color: #e2e8f0;
}
.product-desc {
  font-size: 6.6pt;
  color: #cbd5e1;
  line-height: 1.35;
  margin-top: 0.8mm;
  border-top: 0.2mm solid #1e293b;
  padding-top: 1mm;
}

/* Feature card on last page */
.feature-spec-card {
  background: linear-gradient(135deg, #172554 0%, #0f172a 100%);
  border: 0.5mm solid #f59e0b;
  border-radius: 2mm;
  padding: 5mm;
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
  gap: 2mm;
}
.feature-spec-title {
  font-size: 11pt;
  font-weight: 800;
  letter-spacing: 1.5px;
  color: #f59e0b;
  text-transform: uppercase;
}
.feature-spec-desc {
  font-size: 7.5pt;
  color: #e2e8f0;
  line-height: 1.45;
}

/* -------------------------------------------------------------------------
   PAGE 22: TECHNICAL DATA & COVERAGE
------------------------------------------------------------------------- */
.tech-grid {
  padding: 5mm 10mm;
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 4mm;
  height: calc(210mm - 20mm);
}
.tech-card {
  background: #0f172a;
  border: 0.3mm solid #334155;
  border-radius: 2mm;
  padding: 3.5mm 4.5mm;
  display: flex;
  flex-direction: column;
}
.tech-title {
  font-size: 9pt;
  font-weight: 800;
  letter-spacing: 1px;
  color: #f59e0b;
  text-transform: uppercase;
  margin-bottom: 2mm;
  border-bottom: 0.3mm solid #1e293b;
  padding-bottom: 1.2mm;
}

/* -------------------------------------------------------------------------
   PAGE 23: BACK COVER
------------------------------------------------------------------------- */
.back-page {
  background: radial-gradient(circle at 50% 50%, #1e293b 0%, #090d16 80%);
  padding: 10mm 12mm;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.back-border {
  width: 100%;
  height: 100%;
  border: 1.5mm solid #d97706;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 8mm 12mm;
}
.back-header {
  text-align: center;
}
.studio-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5mm;
  margin: 3mm 0;
}
.studio-card {
  background: #0f172a;
  border: 0.3mm solid #334155;
  border-radius: 2mm;
  padding: 4mm 5mm;
  font-size: 7.5pt;
  line-height: 1.45;
  color: #cbd5e1;
}
.studio-card-title {
  font-size: 8.5pt;
  font-weight: 800;
  letter-spacing: 1px;
  color: #f59e0b;
  margin-bottom: 2mm;
  text-transform: uppercase;
}
"""


def generate_html():
    total_products = len(PEBBLES)
    items_per_page = 4
    num_product_pages = (total_products + items_per_page - 1) // items_per_page  # 19 pages
    # Total pages: 1 (cover) + 1 (overview) + 19 (products) + 1 (tech) + 1 (back) = 23 pages
    total_pages = 1 + 1 + num_product_pages + 1 + 1  # 23 pages

    parts = []
    parts.append("<!DOCTYPE html>")
    parts.append("<html lang='en'>")
    parts.append("<head>")
    parts.append("<meta charset='utf-8'>")
    parts.append("<title>Stone Tech Atelier — Stone Pebbles & Semi-Precious Aggregates Catalogue (2026-2027)</title>")
    parts.append("<style>")
    parts.append(generate_css())
    parts.append("</style>")
    parts.append("</head>")
    parts.append("<body>")

    # =========================================================================
    # PAGE 1: LUXURY COVER
    # =========================================================================
    emblem_src = f"file://{EMBLEM_PATH}" if os.path.exists(EMBLEM_PATH) else ""
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
        NATURAL STONE PEBBLES<br>
        <span>&amp; SEMI-PRECIOUS AGGREGATES</span>
      </div>
      <div class="cover-subtitle">
        Curated Natural River Stones, Crystalline Onyx Pebbles, Exotic Agate Aggregates, Monumental Jumbo Boulders, Flat Stepping Discs &amp; Precision Architectural Micro-Chips
      </div>
      <div class="cover-pills">
        <div class="cover-pill">75 Curated Varieties</div>
        <div class="cover-pill">Micro-Chips to 180mm Boulders</div>
        <div class="cover-pill">100% Natural Minerals</div>
        <div class="cover-pill">Global Export Standards</div>
      </div>
    </div>

    <div class="cover-footer">
      <div>
        <strong>STONE TECH PRIVATE LIMITED</strong> · SPECIFICATION CATALOGUE 2026-2027<br>
        AHMEDABAD EXPERIENCE CENTER · DIRECT FACTORY ENQUIRIES: +91 77420 90866
      </div>
      <div>
        PAGE 1 OF {total_pages}
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
              <td>0.5 – 5 mm</td>
              <td>Resin terrazzo matrix, Venetian plaster, bonsai top</td>
            </tr>
            <tr>
              <td><strong>Mini Pebbles &amp; Chips</strong></td>
              <td>5 – 15 mm</td>
              <td>Resin-bound footpaths, raked zen gardens, planter dressing</td>
            </tr>
            <tr>
              <td><strong>Standard River Pebbles</strong></td>
              <td>15 – 35 mm</td>
              <td>Water rills, swimming pool copings, courtyard margins</td>
            </tr>
            <tr>
              <td><strong>Large Landscape Stones</strong></td>
              <td>35 – 70 mm</td>
              <td>Dry riverbeds, water cascades, bioswales, tree grates</td>
            </tr>
            <tr>
              <td><strong>Jumbo Boulders &amp; Flat</strong></td>
              <td>80 – 180 mm</td>
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
        <strong>• Permeable Resin-Bound Pavements:</strong> Aliphatic polyurethane binders mixed with 6-12mm mini pebbles deliver high-strength, porous, puddle-free footpaths.<br><br>
        <strong>• Swimming Pools &amp; Reflecting Rills:</strong> Submerged pebbles enhance water refraction, creating aquatic shimmering gradients without fading under chlorine.<br><br>
        <strong>• Luxury Planter &amp; Tree Dressing:</strong> Prevents soil erosion, conserves substrate moisture, suppresses weeds, and elevates container plantings to museum quality.
      </div>
    </div>

    <div class="overview-card">
      <div class="overview-title">SUSTAINABILITY &amp; EXPORT QUALITY</div>
      <div class="overview-body">
        <strong>100% Non-Toxic &amp; Chemically Inert:</strong> Safe for sensitive aquatic life, koi ponds, organic herb gardens, and luxury interior living walls.<br><br>
        <strong>Colorfast Durability:</strong> Natural minerals resist fading under extreme tropical UV radiation and weathering, ensuring decade-long vibrancy.<br><br>
        <strong>Export Packaging Assurance:</strong> Packed in 25 kg poly-woven bags, 1.0 MT heavy-duty bulk bags, or export-grade heat-treated timber pallets with shrink-wrap moisture barriers.
      </div>
    </div>
  </div>

  <div class="prod-footer-bar">
    <span>STONE TECH ATELIER · ARCHITECTURAL SPECIFICATION CATALOGUE 2026-2027</span>
    <span>PAGE {current_page} OF {total_pages}</span>
    <span>WWW.STONETECH.IN · DIRECT FACTORY ENQUIRIES: +91 77420 90866</span>
  </div>
</div>
""")

    # =========================================================================
    # PAGES 3 to 21: 75 PRODUCTS (4 PER PAGE)
    # =========================================================================
    for page_idx in range(num_product_pages):
        current_page += 1
        start_idx = page_idx * items_per_page
        end_idx = min(start_idx + items_per_page, total_products)
        page_items = PEBBLES[start_idx:end_idx]

        # Get dominant category for header
        categories = list(dict.fromkeys(item["category"] for item in page_items))
        header_cat = " & ".join(categories)

        parts.append(f"""
<div class="page">
  <div class="prod-header-bar">
    <div class="prod-header-left">
      <span class="prod-brand-mini">STONE TECH ATELIER</span>
      <span class="prod-cat-badge">{header_cat}</span>
    </div>
    <div class="prod-header-right">ARCHITECTURAL SPECIFICATION · ITEMS {start_idx + 1} TO {end_idx} OF {total_products}</div>
  </div>

  <div class="product-grid">
""")

        for item in page_items:
            item_id = item["id"]
            img_rel_path = f"file://{os.path.join(ASSETS_DIR, f'pebble_{item_id:03d}.jpg')}"
            parts.append(f"""
    <div class="product-card">
      <div class="product-img-box">
        <img src="{img_rel_path}" alt="{item['name']}">
      </div>
      <div class="product-info">
        <div class="product-meta-row">
          <span class="prod-code-badge">{item['code']}</span>
          <span class="prod-cat-pill">{item['category']}</span>
        </div>
        <div class="product-name">{item['name']}</div>
        <div class="product-finish">{item['finish']}</div>
        <div class="product-spec-line"><strong>Sizes:</strong> {item['sizes']}</div>
        <div class="product-spec-line"><strong>Mineral:</strong> {item['mineral']}</div>
        <div class="product-spec-line"><strong>Color Tone:</strong> {item['color']}</div>
        <div class="product-spec-line"><strong>Application:</strong> {item['use']}</div>
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
    <span>PAGE {current_page} OF {total_pages}</span>
    <span>WWW.STONETECH.IN · DIRECT FACTORY ENQUIRIES: +91 77420 90866</span>
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
              <td>15 mm</td>
              <td>~ 4.0 m² (43 sq.ft)</td>
              <td>~ 25 kg / m²</td>
            </tr>
            <tr>
              <td><strong>Mini Pebbles (10–25mm)</strong></td>
              <td>30 mm</td>
              <td>~ 2.2 m² (24 sq.ft)</td>
              <td>~ 45 kg / m²</td>
            </tr>
            <tr>
              <td><strong>Medium River (25–50mm)</strong></td>
              <td>50 mm</td>
              <td>~ 1.3 m² (14 sq.ft)</td>
              <td>~ 75 kg / m²</td>
            </tr>
            <tr>
              <td><strong>Large Stones (40–70mm)</strong></td>
              <td>75 mm</td>
              <td>~ 0.9 m² (10 sq.ft)</td>
              <td>~ 110 kg / m²</td>
            </tr>
            <tr>
              <td><strong>Jumbo Boulders (80–120mm)</strong></td>
              <td>120 mm</td>
              <td>~ 0.5 m² (5.5 sq.ft)</td>
              <td>~ 180 kg / m²</td>
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
        • Excavate soil to required depth; compact soil base to 95% Proctor density.<br>
        • Install a commercial needle-punched non-woven geotextile membrane (minimum 120 gsm) to suppress weeds while allowing unhindered rain infiltration.<br><br>
        <strong>2. Edge Restraint Containment:</strong><br>
        • Install durable aluminium, steel, or stone edging 15mm above pebble grade to lock stones permanently into designed pathways and prevent lawn migration.<br><br>
        <strong>3. Water Feature &amp; Pond Installations:</strong><br>
        • Wash all stones with clean pressurized water prior to installation to remove natural quarry fine dust.<br>
        • Quartz, Agate, and Basalt are 100% pH-neutral and safe for delicate koi and aquatic plants.<br><br>
        <strong>4. Periodic Maintenance:</strong><br>
        • Rake periodically to maintain uniform surface distribution.<br>
        • Clean leaves with a gentle leaf blower or garden hose rinse once a season.
      </div>
    </div>
  </div>

  <div class="prod-footer-bar">
    <span>STONE TECH ATELIER · ARCHITECTURAL SPECIFICATION CATALOGUE 2026-2027</span>
    <span>PAGE {current_page} OF {total_pages}</span>
    <span>WWW.STONETECH.IN · DIRECT FACTORY ENQUIRIES: +91 77420 90866</span>
  </div>
</div>
""")

    # =========================================================================
    # PAGE 23: BACK COVER
    # =========================================================================
    current_page += 1
    badge_src = f"file://{BADGE_PATH}" if os.path.exists(BADGE_PATH) else ""
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
        <div class="studio-card-title">ATELIER EXPERIENCE CENTER &amp; HEADQUARTERS</div>
        <strong>STONE TECH PRIVATE LIMITED</strong><br>
        E-02, Ground Floor, SG Business Hub, Vasant Nagar, Gota, Ahmedabad, Gujarat 380060<br><br>
        <strong>Direct WhatsApp &amp; Sales Hotline:</strong> +91 77420 90866 / +91 97844 52118<br>
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
    <span>PAGE {current_page} OF {total_pages}</span>
    <span>WWW.STONETECH.IN · DIRECT FACTORY ENQUIRIES: +91 77420 90866</span>
  </div>
</div>
""")

    parts.append("</body>")
    parts.append("</html>")
    return "\n".join(parts)


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
    print("STONE TECH ATELIER — STONE PEBBLES MASTER CATALOGUE BUILD (2026)")
    print("=================================================================")

    html = generate_html()
    html_file = "/tmp/stone_pebbles_catalogue.html"
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

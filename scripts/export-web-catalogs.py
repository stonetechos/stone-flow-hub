import os
import json
import importlib.util

def load_mod(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

fcv = load_mod('fcv', 'scripts/generate-flexible-clay-catalogue.py')
sv = load_mod('sv', 'scripts/generate-stone-veneer-catalogue.py')
hgb = load_mod('hgb', 'scripts/generate-hollow-glass-bricks-catalogue.py')
sgb = load_mod('sgb', 'scripts/generate-solid-glass-bricks-catalogue.py')

os.makedirs('src/data', exist_ok=True)

# -------------------------------------------------------------
# 1. STONE VENEER CATALOG (98 products across 4 collections)
# -------------------------------------------------------------
stone_veneer_items = []
veneer_collection_renders = {
    'Slate Stone Collection': '/catalogues/stone-veneer-assets/render_slate.jpg',
    'Sandstone Collection': '/catalogues/stone-veneer-assets/render_sandstone.jpg',
    'Marble Stone Collection': '/catalogues/stone-veneer-assets/render_marble.jpg',
    'Limestone Collection': '/catalogues/stone-veneer-assets/render_limestone.jpg',
}

veneer_prices = {
    'Slate Stone Collection': 195,
    'Sandstone Collection': 225,
    'Marble Stone Collection': 280,
    'Limestone Collection': 210,
}

for idx, p in enumerate(sv.PRODUCTS):
    sec = p['sec']
    stone_type = sec.replace(' Stone Collection', '').replace(' Collection', '')
    src = p['src']
    slab_img = f"/catalogues/stone-veneer-assets/slab_{idx+1:03d}_{src}"
    code = f"ST-SV-{idx+1:03d}"
    slug = f"{p['name'].lower().replace(' ', '-').replace('.', '')}-{code.lower()}"
    
    item = {
        "id": code,
        "index": idx + 1,
        "code": code,
        "name": f"{p['name']} {stone_type} Veneer",
        "rawName": p['name'],
        "slug": slug,
        "collection": sec,
        "category": "Stone Veneer",
        "stoneType": stone_type,
        "pattern": p.get('pat', f"Pattern {idx+1:02d}"),
        "image": slab_img,
        "sceneImage": veneer_collection_renders.get(sec, '/catalogues/stone-veneer-assets/render_portfolio.jpg'),
        "standardSizes": p.get('sizes', '1220 × 2440 mm (4×8 ft) / 1220 × 610 mm (4×2 ft)'),
        "thickness": "1.5 – 2.0 mm ultra-thin",
        "weight": "1.5 kg / m² featherlight",
        "backing": "Fiberglass polyester resin & natural mineral backing",
        "bending": "Flexible, bends around curved columns & radius walls (R ≥ 150mm)",
        "fire": "Class A / ASTM Fire Rated Non-Flammable",
        "applications": [
            "Curved Columns & Arches",
            "Interior Luxury Accent Walls",
            "Exterior Elevation Facades",
            "Ceilings, Soffits & Elevator Lobbies",
            "Bespoke Furniture, Doors & Cabinet Skins",
            "Backlit Translucent Lighting Features"
        ],
        "finishes": [
            "100% Natural Cleft Stone",
            "Matte Honed",
            "Translucent (Backlit Compatible)"
        ],
        "price": veneer_prices.get(sec, 195),
        "unit": "sq.ft",
        "badge": "100% Natural Stone Sheet",
        "leadTime": "In Stock - Ready to Ship",
        "desc": f"Ultra-thin flexible {stone_type.lower()} sheet split from authentic quarry rock blocks, reinforced with fiberglass resin backing for effortless installation over walls, ceilings, and curved surfaces."
    }
    stone_veneer_items.append(item)

with open('src/data/stone-veneer-catalog.json', 'w') as f:
    json.dump(stone_veneer_items, f, indent=2)
print(f"Exported {len(stone_veneer_items)} stone veneer items.")

# -------------------------------------------------------------
# 2. GLASS BRICKS CATALOG (38 Hollow + 29 Solid = 67 products)
# -------------------------------------------------------------
glass_brick_items = []
g_idx = 1

# Hollow Glass Bricks
for p in hgb.PRODUCTS:
    code = p['code']
    img_path = f"/catalogues/hollow-glass-assets/{p['img']}"
    slug = f"{p['name'].lower().replace(' ', '-').replace('/', '-')}-{code.lower()}"
    item = {
        "id": code,
        "index": g_idx,
        "code": code,
        "name": p['name'],
        "slug": slug,
        "series": "Hollow Glass Bricks",
        "category": "Glass Bricks",
        "type": p.get('type', 'Hollow Glass Block'),
        "collection": p.get('collection', 'Architectural Hollow Series'),
        "image": img_path,
        "sceneImage": "/catalogues/hollow-glass-assets/gallery_46.jpg",
        "standardSizes": p.get('size', '190 × 190 × 80 mm'),
        "thickness": "80 mm Hollow Dual-Chamber",
        "weight": p.get('weight', '2.3 kg / pc'),
        "packing": p.get('packing', '6 pcs / ctn'),
        "lightTransmission": p.get('light_trans', '75% – 82% natural daylighting'),
        "soundInsulation": p.get('sound', 'Rw = 40 – 42 dB acoustic insulation'),
        "thermalInsulation": p.get('u_value', '1.5 – 1.8 W/m²K thermal efficiency'),
        "fireRating": p.get('fire', 'Class A / 60–90 min fire barrier'),
        "compressiveStrength": p.get('compressive', '≥ 6.0 – 8.0 MPa structural load'),
        "applications": [
            "Acoustic Interior Partitions",
            "Shower Enclosures & Bathrooms",
            "Daylighting Exterior Curtain Walls",
            "Commercial Lobbies & Entrance Facades",
            "Decorative Privacy Screens"
        ],
        "finishes": [
            "Clear Crystal Smooth",
            "Diffused Wave Pattern",
            "Frosted Acid-Etched",
            "Tinted Colored Glass"
        ],
        "price": 185,
        "unit": "pc",
        "badge": "Acoustic & Fire Rated Hollow Glass",
        "leadTime": "In Stock - Ready to Ship",
        "desc": p.get('desc', 'Engineered architectural hollow glass brick offering superior daylight transmission with 42dB acoustic isolation.')
    }
    glass_brick_items.append(item)
    g_idx += 1

# Solid Glass Bricks
for p in sgb.PRODUCTS:
    code = p['code']
    img_path = f"/catalogues/solid-glass-assets/{p['brick_img']}"
    scene_path = f"/catalogues/solid-glass-assets/{p['scene_img']}" if p.get('scene_img') else "/catalogues/solid-glass-assets/solid_p6_scene.jpg"
    slug = f"{p['name'].lower().replace(' ', '-').replace('/', '-')}-{code.lower()}"
    item = {
        "id": code,
        "index": g_idx,
        "code": code,
        "name": p['name'],
        "slug": slug,
        "series": "Solid Glass Bricks",
        "category": "Glass Bricks",
        "type": p.get('type', 'Solid Crystal Glass Brick'),
        "collection": p.get('collection', 'Solid Crystal Masonry Series'),
        "image": img_path,
        "sceneImage": scene_path,
        "standardSizes": p.get('size', '200 × 100 × 50 mm'),
        "thickness": "50 mm Monolithic Crystal Glass",
        "weight": p.get('weight', '2.5 – 3.2 kg / pc'),
        "packing": p.get('packing', '6 – 8 pcs / ctn'),
        "lightTransmission": p.get('light_trans', '85% – 90% ultra-clear optical transparency'),
        "soundInsulation": "Rw = 45 dB solid acoustic barrier",
        "thermalInsulation": "High thermal mass solid glass",
        "fireRating": "Class A Non-Combustible Monolithic Glass",
        "compressiveStrength": p.get('compressive', '≥ 12.0 – 15.0 MPa high load bearing'),
        "refractiveIndex": p.get('refractive', 'n = 1.52 optical crystal clarity'),
        "applications": [
            "Illuminated Bar Counters & Nightclub Facades",
            "Luxury Retail Boutique Partitions",
            "Structural Glass Masonry Walls",
            "High-End Hospitality Backdrops",
            "Illuminated Landscape Balustrades"
        ],
        "finishes": [
            "Ultra-Clear Optical Crystal",
            "Diamond Cut Faceted",
            "Linear Ribbed Refraction",
            "Frosted Translucent"
        ],
        "price": 295,
        "unit": "pc",
        "badge": "Monolithic Solid Crystal Glass",
        "leadTime": "In Stock - Ready to Ship",
        "desc": p.get('desc', 'Heavyweight solid crystal glass masonry brick delivering refractive optical brilliance and structural masonry strength.')
    }
    glass_brick_items.append(item)
    g_idx += 1

with open('src/data/glass-bricks-catalog.json', 'w') as f:
    json.dump(glass_brick_items, f, indent=2)
print(f"Exported {len(glass_brick_items)} glass brick items.")

# -------------------------------------------------------------
# 3. FLEXIBLE CLAY VENEERS CATALOG (18 Textures + 10 PT + 12 PS = 40)
# -------------------------------------------------------------
clay_items = []
c_idx = 1

# 18 Architectural 3D Textures
for t in fcv.TEXTURES:
    code = t['code']
    slug = t['slug']
    swatch_img = f"/catalogues/flexible-clay-assets/{slug}_swatch.jpg"
    scene_img = f"/catalogues/flexible-clay-assets/{slug}_scene.jpg"
    item = {
        "id": code,
        "index": c_idx,
        "code": code,
        "name": f"{t['name']} Flexible Clay Veneer",
        "rawName": t['name'],
        "slug": f"{slug}-{code.lower()}",
        "series": "Architectural 3D Textures",
        "category": "Flexible Clay Veneers",
        "profile": t.get('profile', '3D Architectural Relief'),
        "image": swatch_img,
        "sceneImage": scene_img,
        "standardSizes": t.get('size', '1200 × 2400 mm (8 × 4 ft)'),
        "thickness": t.get('thick', '2.5 – 3.5 mm'),
        "weight": t.get('weight', '3.8 kg / m² featherlight'),
        "bending": t.get('bending', 'Bending radius R ≥ 200 mm (wraps columns & arches)'),
        "fire": t.get('fire', 'Class A Non-Combustible'),
        "applications": [
            "Curvilinear Exterior Facades & Pillars",
            "Double-Height Hotel Lobbies & Feature Walls",
            "Residential Villa Accent Claddings",
            "Ceilings, Soffits & Curved Porticos",
            "Moisture-Resistant Bathrooms & Covered Terraces"
        ],
        "finishes": [
            "3D Architectural Relief",
            "Natural Matte Earth Tone",
            "Hydrophobic Weatherproof Coating"
        ],
        "price": 220,
        "unit": "sq.ft",
        "badge": "Class A Non-Combustible Eco-Clay",
        "leadTime": "In Stock - Ready to Ship",
        "desc": t.get('desc', 'Innovative ultra-thin flexible clay panel combining natural modified mineral powder with flexible polymers.')
    }
    clay_items.append(item)
    c_idx += 1

# 10 Punch Traventino Slabs
for pt in fcv.PUNCH_TRAVENTINO:
    code = pt['code']
    slug = pt['slug']
    img_path = f"/catalogues/flexible-clay-assets/pt_{slug}.jpg"
    item = {
        "id": code,
        "index": c_idx,
        "code": code,
        "name": f"Punch Traventino {pt['name']}",
        "rawName": f"Punch Traventino {pt['name']}",
        "slug": f"punch-traventino-{slug}-{code.lower()}",
        "series": "Punch Traventino Series",
        "category": "Flexible Clay Veneers",
        "profile": f"Porous Travertine Vein Cut · {pt['tone']}",
        "image": img_path,
        "sceneImage": "/catalogues/flexible-clay-assets/travertino_scene.jpg",
        "standardSizes": "600 × 1200 mm / 1200 × 2400 mm",
        "thickness": "2.8 – 3.5 mm",
        "weight": "3.8 kg / m² featherlight",
        "bending": "Bending radius R ≥ 200 mm",
        "fire": "Class A Non-Combustible",
        "applications": [
            "Exterior Elevation Facades",
            "Living Room & Foyer Accent Walls",
            "Curved Pillars & Reception Podiums",
            "Courtyard & Patio Cladding"
        ],
        "finishes": [
            "Natural Open-Pore Travertine",
            "Matte Mineral Clay",
            "Weatherproof Sealed"
        ],
        "price": 240,
        "unit": "sq.ft",
        "badge": "Punch Travertine Natural Mineral",
        "leadTime": "In Stock - Ready to Ship",
        "desc": pt.get('desc', 'Authentic travertine stone striations with open-pore cellular texture in a flexible, lightweight clay slab.')
    }
    clay_items.append(item)
    c_idx += 1

# 12 Punch Slat Slabs
for ps in fcv.PUNCH_SLAT:
    code = ps['code']
    slug = ps['slug']
    img_path = f"/catalogues/flexible-clay-assets/ps_{slug}.jpg"
    item = {
        "id": code,
        "index": c_idx,
        "code": code,
        "name": f"Punch Slat {ps['name']}",
        "rawName": f"Punch Slat {ps['name']}",
        "slug": f"punch-slat-{slug}-{code.lower()}",
        "series": "Punch Slat Series",
        "category": "Flexible Clay Veneers",
        "profile": f"Horizontal Stratified Slat · {ps['tone']}",
        "image": img_path,
        "sceneImage": "/catalogues/flexible-clay-assets/fluted_scene.jpg",
        "standardSizes": "600 × 1200 mm / 1200 × 2400 mm",
        "thickness": "2.8 – 3.5 mm",
        "weight": "3.8 kg / m² featherlight",
        "bending": "Bending radius R ≥ 200 mm",
        "fire": "Class A Non-Combustible",
        "applications": [
            "Linear Elevation Facades",
            "Modern Feature Walls",
            "Curved Column Claddings",
            "Terrace & Balcony Accents"
        ],
        "finishes": [
            "Stratified Linear Slat",
            "Matte Earth Tone",
            "Weatherproof Sealed"
        ],
        "price": 240,
        "unit": "sq.ft",
        "badge": "Punch Slat Linear Texture",
        "leadTime": "In Stock - Ready to Ship",
        "desc": ps.get('desc', 'Horizontal stratified slate stone linear relief combining structural strength with lightweight flexible installation.')
    }
    clay_items.append(item)
    c_idx += 1

with open('src/data/flexible-clay-catalog.json', 'w') as f:
    json.dump(clay_items, f, indent=2)
print(f"Exported {len(clay_items)} flexible clay items.")

# -------------------------------------------------------------
# 4. INSTALLED WORKS GALLERY (Authentic Projects Across All 4 Lines)
# -------------------------------------------------------------
installed_gallery = []

# Flexible Clay Installed Works (18 authentic architectural installation scenes)
for t in fcv.TEXTURES:
    slug = t['slug']
    installed_gallery.append({
        "id": f"inst-fcv-{slug}",
        "title": f"{t['name']} Architectural Installation",
        "category": "clay-veneers",
        "categoryLabel": "Flexible Clay Veneers",
        "productCode": t['code'],
        "productName": f"{t['name']} Flexible Clay Veneer",
        "image": f"/catalogues/flexible-clay-assets/{slug}_scene.jpg",
        "location": "Ahmedabad / Surat, Gujarat",
        "stoneType": "Modified Clay Mineral",
        "specs": f"{t.get('profile', '3D Architectural Relief')} · {t.get('size', '1200 × 2400 mm')}",
        "description": t.get('desc', '')
    })

# Solid Glass Bricks Installed Works (29 authentic architectural installations)
for p in sgb.PRODUCTS:
    if p.get('scene_img'):
        code = p['code']
        slug = f"{p['name'].lower().replace(' ', '-').replace('/', '-')}"
        installed_gallery.append({
            "id": f"inst-sgb-{code.lower()}",
            "title": f"{p['name']} Lighting Installation",
            "category": "glass-bricks",
            "categoryLabel": "Architectural Glass Bricks",
            "productCode": code,
            "productName": p['name'],
            "image": f"/catalogues/solid-glass-assets/{p['scene_img']}",
            "location": "Mumbai / Bangalore Luxury Commercial",
            "stoneType": "Solid Crystal Glass",
            "specs": f"{p.get('size', '200 × 100 × 50 mm')} · {p.get('refractive', 'n = 1.52 optical clarity')}",
            "description": p.get('desc', '')
        })

# Hollow Glass Bricks Installed Works
installed_gallery.append({
    "id": "inst-hgb-01",
    "title": "Acoustic Daylight Partition in High-End Office",
    "category": "glass-bricks",
    "categoryLabel": "Architectural Glass Bricks",
    "productCode": "ST-HGB-001",
    "productName": "Crystal Wave Clear Hollow Glass Brick",
    "image": "/catalogues/hollow-glass-assets/gallery_46.jpg",
    "location": "BKC, Mumbai",
    "stoneType": "Hollow Glass Block",
    "specs": "190 × 190 × 80 mm · 42 dB Acoustic Isolation",
    "description": "Floor-to-ceiling soundproof partition allowing 80% natural daylight to illuminate executive meeting spaces."
})
installed_gallery.append({
    "id": "inst-hgb-02",
    "title": "Exterior Daylighting Screen & Stairwell Facade",
    "category": "glass-bricks",
    "categoryLabel": "Architectural Glass Bricks",
    "productCode": "ST-HGB-006",
    "productName": "Frosted Mist Privacy Glass Brick",
    "image": "/catalogues/hollow-glass-assets/gallery_47.jpg",
    "location": "Jubilee Hills, Hyderabad",
    "stoneType": "Hollow Glass Block",
    "specs": "190 × 190 × 80 mm · Weatherproof Curtain Wall",
    "description": "Triple-glazed thermal glass brick screen insulating the villa interior while flooding the atrium with soft diffuse glow."
})
installed_gallery.append({
    "id": "inst-hgb-03",
    "title": "Illuminated Master Bathroom Privacy Screen",
    "category": "glass-bricks",
    "categoryLabel": "Architectural Glass Bricks",
    "productCode": "ST-HGB-012",
    "productName": "Nordic Frost Wave Glass Brick",
    "image": "/catalogues/hollow-glass-assets/gallery_48.jpg",
    "location": "Alibaug Private Villa",
    "stoneType": "Hollow Glass Block",
    "specs": "190 × 190 × 80 mm · 100% Moisture Proof",
    "description": "Curved walk-in shower partition wall offering elegant water privacy and crystal light refraction."
})

# Stone Veneer Installed Works
veneer_installs = [
    {
        "id": "inst-sv-01",
        "title": "Curved Slate Column Wrap in Grand Reception",
        "category": "stone-veneer",
        "categoryLabel": "Ultra-Thin Stone Veneer",
        "productCode": "ST-SV-001",
        "productName": "S. White Slate Stone Veneer",
        "image": "/catalogues/stone-veneer-assets/render_slate.jpg",
        "location": "Aerocity, New Delhi",
        "stoneType": "Slate Veneer",
        "specs": "1220 × 2440 mm · R=300mm Curved Radius",
        "description": "Seamless wrapping of structural circular concrete pillars with genuine flexible slate stone sheets."
    },
    {
        "id": "inst-sv-02",
        "title": "Backlit Translucent Sandstone Feature Wall",
        "category": "stone-veneer",
        "categoryLabel": "Ultra-Thin Stone Veneer",
        "productCode": "ST-SV-045",
        "productName": "Teakwood Sandstone Veneer",
        "image": "/catalogues/stone-veneer-assets/render_sandstone.jpg",
        "location": "Indiranagar, Bangalore",
        "stoneType": "Sandstone Veneer",
        "specs": "1220 × 2440 mm · LED Backlit Matrix",
        "description": "Translucent polyester-backed natural sandstone glowing warmly with organic woodgrain striations."
    },
    {
        "id": "inst-sv-03",
        "title": "Master Bedroom Bookmatched Marble Headboard",
        "category": "stone-veneer",
        "categoryLabel": "Ultra-Thin Stone Veneer",
        "productCode": "ST-SV-075",
        "productName": "Statuary White Marble Veneer",
        "image": "/catalogues/stone-veneer-assets/render_marble.jpg",
        "location": "Worli Sea Face, Mumbai",
        "stoneType": "Marble Veneer",
        "specs": "1220 × 2440 mm · Featherlight 1.5kg/m²",
        "description": "Ultra-lightweight real marble sheets installed effortlessly on drywall partitions without heavy structural framing."
    },
    {
        "id": "inst-sv-04",
        "title": "Exterior Weatherproof Limestone Villa Facade",
        "category": "stone-veneer",
        "categoryLabel": "Ultra-Thin Stone Veneer",
        "productCode": "ST-SV-090",
        "productName": "Kota Brown Limestone Veneer",
        "image": "/catalogues/stone-veneer-assets/render_limestone.jpg",
        "location": "Jaipur, Rajasthan",
        "stoneType": "Limestone Veneer",
        "specs": "1220 × 2440 mm · UV & Weather Sealed",
        "description": "Full exterior facade cladding in authentic natural limestone sheets, saving 80% on structural dead-load."
    },
    {
        "id": "inst-sv-05",
        "title": "Luxury Penthouse Double-Height Accent Wall",
        "category": "stone-veneer",
        "categoryLabel": "Ultra-Thin Stone Veneer",
        "productCode": "ST-SV-012",
        "productName": "Silver Shine Slate Veneer",
        "image": "/catalogues/stone-veneer-assets/render_portfolio.jpg",
        "location": "Boat Club Road, Pune",
        "stoneType": "Slate Veneer",
        "specs": "1220 × 2800 mm Jumbosize Slabs",
        "description": "Metallic mica-flecked natural slate veneer catching dramatic architectural downlighting in a modern penthouse."
    }
]
installed_gallery.extend(veneer_installs)

# Natural Stone Cladding Installed Works (Top installations)
cladding_installs = [
    {
        "id": "inst-wc-01",
        "title": "3D Origami Faceted Red Sandstone Facade",
        "category": "cladding",
        "categoryLabel": "Natural Stone Wall Cladding",
        "productCode": "ST-WC-006",
        "productName": "3D Origami Prism Agra Red Sandstone",
        "image": "/images/catalog/wall-cladding/cladding-14-3d-prism-origami-pink-sandstone.jpg",
        "location": "Science City, Ahmedabad",
        "stoneType": "Agra Red Sandstone",
        "specs": "600 × 300 mm Modular Panels · 35mm Variable Relief",
        "description": "Precision CNC carved faceted 3D pyramids generating dynamic shadow rhythms throughout the day."
    },
    {
        "id": "inst-wc-02",
        "title": "Splitface Ledgestone Elevation Wall",
        "category": "cladding",
        "categoryLabel": "Natural Stone Wall Cladding",
        "productCode": "ST-WC-001",
        "productName": "Natural Splitface Ledgestone Z-Panel",
        "image": "/images/catalog/wall-cladding/cladding-01-teakwood-sandstone-linear-splitface-mosaic.jpg",
        "location": "Banjara Hills, Hyderabad",
        "stoneType": "Teakwood Sandstone",
        "specs": "150 × 600 mm Interlocking Z-Panels",
        "description": "Seamless interlocking natural split ledgestone creating organic mountain stone texture on exterior elevations."
    },
    {
        "id": "inst-wc-03",
        "title": "Radial Sunburst CNC Carved Foyer Accent",
        "category": "cladding",
        "categoryLabel": "Natural Stone Wall Cladding",
        "productCode": "ST-WC-024",
        "productName": "Radial Sunburst Dholpur Beige Sandstone",
        "image": "/images/catalog/wall-cladding/cladding-24-radial-sunburst-carved-dholpur-beige-sandstone.jpg",
        "location": "Udaipur Heritage Residence",
        "stoneType": "Dholpur Beige Sandstone",
        "specs": "1200 × 1200 mm Carved Rosette Panel",
        "description": "Exquisite radial carved stone mural combining traditional Rajasthani craftsmanship with contemporary architectural elegance."
    }
]
installed_gallery.extend(cladding_installs)

with open('src/data/installed-works-gallery.json', 'w') as f:
    json.dump(installed_gallery, f, indent=2)
print(f"Exported {len(installed_gallery)} installed works items.")

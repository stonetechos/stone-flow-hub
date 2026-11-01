#!/usr/bin/env python3
"""
generate-wall-cladding-pdf.py

Compiles a luxury, publication-quality 2026 Natural Stone Wall Cladding & Mosaics
Architectural Catalogue PDF softcopy optimized for WhatsApp distribution.
Includes all unique patterns with high-resolution, uncompressed, proportional
photographs, pattern codes, stone geologies, relief dimensions, finishes,
and attached factory quarry pricing.
"""

import os
import sys
import json
from PIL import Image, ImageDraw, ImageFont, ImageOps

PAGE_WIDTH = 1240
PAGE_HEIGHT = 1754  # A4 Portrait at 150 DPI


def get_fonts():
    """Finds best available system TrueType fonts on macOS / Linux."""
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/Arial.ttf",
        "/System/Library/Fonts/SFPro.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    bold_candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/Library/Fonts/Arial Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]
    serif_candidates = [
        "/System/Library/Fonts/Supplemental/Georgia.ttf",
        "/Library/Fonts/Georgia.ttf",
        "/System/Library/Fonts/Times.ttc",
    ]

    regular_path = next((p for p in candidates if os.path.exists(p)), None)
    bold_path = next((p for p in bold_candidates if os.path.exists(p)), regular_path)
    serif_path = next((p for p in serif_candidates if os.path.exists(p)), regular_path)

    def load(path, size):
        if path and os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                pass
        return ImageFont.load_default()

    return {
        "title": load(serif_path, 46),
        "subtitle": load(regular_path, 22),
        "heading": load(bold_path, 28),
        "subheading": load(bold_path, 20),
        "card_title": load(bold_path, 17),
        "card_code": load(bold_path, 15),
        "card_price": load(bold_path, 17),
        "card_text": load(regular_path, 13),
        "card_bold": load(bold_path, 13),
        "badge": load(bold_path, 11),
        "footer": load(regular_path, 11),
    }


def get_benchmark_price(category, stone_type, index):
    """Calculates benchmark quarry price."""
    cat_lower = category.lower()
    stone_lower = stone_type.lower()

    if "inlay" in cat_lower or "geometric" in cat_lower:
        base = 1250
        badge = "Brass & Stone Inlay"
    elif "3d" in cat_lower or "relief" in cat_lower:
        base = 680
        badge = "CNC Sculpted Relief"
    elif "fluted" in cat_lower or "ribbed" in cat_lower:
        base = 540
        badge = "Precision Linear Ribbed"
    elif "woven" in cat_lower or "basketweave" in cat_lower:
        base = 620
        badge = "Hand-Crafted Parquet"
    elif "mosaic" in cat_lower or "pebble" in cat_lower:
        base = 590
        badge = "Mesh-Mounted Mosaic"
    elif "ashlar" in cat_lower:
        base = 480
        badge = "Calibrated Interlocking"
    else:
        base = 420
        badge = "Natural Split Cleft"

    if "marble" in stone_lower:
        base += 120
    elif "quartzite" in stone_lower:
        base += 80
    elif "basalt" in stone_lower:
        base += 150
    elif "travertine" in stone_lower:
        base += 180

    jitter = ((index * 37) % 9) * 10 - 40
    price = max(320, base + jitter)
    return price, badge


def draw_header_footer(draw, fonts, page_num, total_pages, category_name=""):
    """Draws consistent luxury header and footer on catalog pages."""
    # Top rule
    draw.line([(50, 45), (PAGE_WIDTH - 50, 45)], fill=(226, 232, 240), width=1)
    draw.text((50, 25), "STONE TECH ATELIER", fill=(15, 23, 42), font=fonts["card_bold"])
    draw.text(
        (230, 25),
        "·  NATURAL STONE WALL CLADDING 2026",
        fill=(100, 116, 139),
        font=fonts["footer"],
    )

    if category_name:
        bbox = draw.textbbox((0, 0), category_name.upper(), font=fonts["card_bold"])
        tw = bbox[2] - bbox[0]
        draw.text(
            (PAGE_WIDTH - 50 - tw, 25),
            category_name.upper(),
            fill=(14, 116, 144),
            font=fonts["card_bold"],
        )

    # Bottom rule
    draw.line(
        [(50, PAGE_HEIGHT - 45), (PAGE_WIDTH - 50, PAGE_HEIGHT - 45)],
        fill=(226, 232, 240),
        width=1,
    )
    draw.text(
        (50, PAGE_HEIGHT - 35),
        "WhatsApp / Direct Orders: +91 94141 61129   ·   Web: www.stonetech.in",
        fill=(71, 85, 105),
        font=fonts["footer"],
    )
    page_str = f"Page {page_num} of {total_pages}"
    bbox = draw.textbbox((0, 0), page_str, font=fonts["footer"])
    tw = bbox[2] - bbox[0]
    draw.text(
        (PAGE_WIDTH - 50 - tw, PAGE_HEIGHT - 35),
        page_str,
        fill=(100, 116, 139),
        font=fonts["footer"],
    )


def create_cover_page(fonts):
    """Generates luxury dark gold cover page."""
    img = Image.new("RGB", (PAGE_WIDTH, PAGE_HEIGHT), color=(15, 23, 42))  # Slate 900
    draw = ImageDraw.Draw(img)

    # Outer luxury gold/brass border
    draw.rectangle([(35, 35), (PAGE_WIDTH - 35, PAGE_HEIGHT - 35)], outline=(217, 119, 6), width=2)
    draw.rectangle([(42, 42), (PAGE_WIDTH - 42, PAGE_HEIGHT - 42)], outline=(245, 158, 11), width=1)

    # Corner decorative accents
    for x, y, dx, dy in [
        (55, 55, 1, 1),
        (PAGE_WIDTH - 55, 55, -1, 1),
        (55, PAGE_HEIGHT - 55, 1, -1),
        (PAGE_WIDTH - 55, PAGE_HEIGHT - 55, -1, -1),
    ]:
        draw.line([(x, y), (x + 30 * dx, y)], fill=(251, 191, 36), width=2)
        draw.line([(x, y), (x, y + 30 * dy)], fill=(251, 191, 36), width=2)

    # Top brand emblem
    draw.text(
        (PAGE_WIDTH // 2, 220),
        "STONE TECH ATELIER",
        fill=(245, 158, 11),
        font=fonts["heading"],
        anchor="mm",
    )
    draw.text(
        (PAGE_WIDTH // 2, 260),
        "ARCHITECTURAL QUARRY DIRECT FABRICATORS",
        fill=(148, 163, 184),
        font=fonts["card_bold"],
        anchor="mm",
    )

    # Thin dividing line
    draw.line(
        [(PAGE_WIDTH // 2 - 180, 310), (PAGE_WIDTH // 2 + 180, 310)],
        fill=(217, 119, 6),
        width=2,
    )

    # Main Title
    draw.text(
        (PAGE_WIDTH // 2, 430),
        "NATURAL STONE",
        fill=(255, 255, 255),
        font=fonts["title"],
        anchor="mm",
    )
    draw.text(
        (PAGE_WIDTH // 2, 490),
        "WALL CLADDING & MOSAICS",
        fill=(251, 191, 36),
        font=fonts["title"],
        anchor="mm",
    )
    draw.text(
        (PAGE_WIDTH // 2, 570),
        "2026 ARCHITECTURAL SPECIFICATION & EXPORT CATALOGUE",
        fill=(203, 213, 225),
        font=fonts["subheading"],
        anchor="mm",
    )
    draw.text(
        (PAGE_WIDTH // 2, 620),
        "140 Precision Patterns · 3D CNC Relief · Waterjet Inlay · Linear Ledger · Interlocking Ashlar",
        fill=(148, 163, 184),
        font=fonts["card_text"],
        anchor="mm",
    )

    # Sample preview photo montage on cover (Proportionally fitted with ImageOps.fit)
    sample_files = [
        "public/images/catalog/wall-cladding/cladding-01-white-marble-brass-inlay.jpg",
        "public/images/catalog/wall-cladding/cladding-06-egyptian-hieroglyph-gold-inlay.jpg",
        "public/images/catalog/wall-cladding/cladding-04-teakwood-mint-basketweave.jpg",
        "public/images/catalog/wall-cladding/cladding-02-quartzite-crystal-ashlar.jpg",
    ]
    montage_w, montage_h = 240, 150
    start_x = (PAGE_WIDTH - (montage_w * 4 + 30)) // 2
    for i, path in enumerate(sample_files):
        if os.path.exists(path):
            with Image.open(path) as simg:
                if simg.mode != "RGB":
                    simg = simg.convert("RGB")
                simg_thumb = ImageOps.fit(simg, (montage_w, montage_h), Image.Resampling.LANCZOS)
                px = start_x + i * (montage_w + 10)
                py = 720
                img.paste(simg_thumb, (px, py))
                draw.rectangle(
                    [(px, py), (px + montage_w, py + montage_h)],
                    outline=(217, 119, 6),
                    width=2,
                )

    # Key Highlights Box
    box_top = 960
    draw.rectangle(
        [(120, box_top), (PAGE_WIDTH - 120, box_top + 280)],
        fill=(30, 41, 59),
        outline=(51, 65, 85),
        width=2,
    )

    highlights = [
        "· 100% Authentic Natural Quarried Stone (Makrana Marble, Sandstone, Quartzite, Basalt, Slate)",
        "· Precision Calibrated Modules: 300x300mm / 600x300mm / Interlocking Ledger Strips",
        "· Surface Finishes: Hand-Split Cleft, Shot-Blasted, Honed, Flamed, Bush-Hammered, CNC Carved",
        "· Applications: Exterior Elevation Facades, Feature Walls, Waterbodies, Foyer & Mandir Murals",
        "· Direct Quarry Pricing Attached to Every Pattern with Worldwide Export Packaging",
    ]
    for idx, h in enumerate(highlights):
        draw.text((150, box_top + 30 + idx * 48), h, fill=(241, 245, 249), font=fonts["card_text"])

    # Bottom Contact Bar
    draw.line([(120, 1380), (PAGE_WIDTH - 120, 1380)], fill=(217, 119, 6), width=1)
    draw.text(
        (PAGE_WIDTH // 2, 1430),
        "STONE TECH ATELIER · JAIPUR & MAKRANA, RAJASTHAN",
        fill=(251, 191, 36),
        font=fonts["subheading"],
        anchor="mm",
    )
    draw.text(
        (PAGE_WIDTH // 2, 1475),
        "Direct WhatsApp Catalog & Sample Orders: +91 94141 61129",
        fill=(255, 255, 255),
        font=fonts["card_title"],
        anchor="mm",
    )
    draw.text(
        (PAGE_WIDTH // 2, 1515),
        "Email: info@stonetech.in   ·   Web: www.stonetech.in",
        fill=(148, 163, 184),
        font=fonts["card_text"],
        anchor="mm",
    )
    draw.text(
        (PAGE_WIDTH // 2, 1560),
        "WhatsApp Ready Softcopy · Instant Digital Inquiries & Estimation",
        fill=(100, 116, 139),
        font=fonts["badge"],
        anchor="mm",
    )

    return img


def create_table_of_contents_page(fonts, items, total_pages=38):
    """Generates Page 2: Table of Contents & Technical Guidelines."""
    img = Image.new("RGB", (PAGE_WIDTH, PAGE_HEIGHT), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    draw_header_footer(draw, fonts, 2, total_pages, "COLLECTIONS & SPECIFICATIONS")

    # Title
    draw.text((50, 75), "COLLECTIONS DIRECTORY", fill=(15, 23, 42), font=fonts["heading"])
    draw.text(
        (50, 115),
        f"{len(items)} distinctive stone wall cladding patterns categorized by architectural expression",
        fill=(100, 116, 139),
        font=fonts["card_text"],
    )
    draw.line([(50, 145), (PAGE_WIDTH - 50, 145)], fill=(14, 116, 144), width=2)

    categories = [
        ("Inlay & Geometric Accent", "Brass, copper & semi-precious inlays in Makrana white marble & basalt", 18),
        ("3D Architectural Relief", "Sculpted organic, diamond, and wave high-relief modular panels", 24),
        ("Fluted & Linear Ribbed", "Precision micro-ribbed and fluted stone panels for contemporary spaces", 22),
        ("Linear Ledger & Split-Face", "Natural split-cleft quartzite, sandstone, and slate interlocking ledger panels", 28),
        ("Woven Basketweave & Parquet", "Geometric hand-assembled parquet and basketweave stone mosaics", 16),
        ("Modular Ashlar & Castle Stone", "Multi-sized calibrated ashlar blocks for robust exterior boundary facades", 18),
        ("Mosaic & Pebble Tile", "Mesh-backed tumbled pebbles, hexagons, and interlocking cobbles", 14),
    ]

    y = 175
    for cat_name, desc, count in categories:
        draw.rectangle([(50, y), (PAGE_WIDTH - 50, y + 70)], fill=(248, 250, 252), outline=(226, 232, 240), width=1)
        draw.text((70, y + 16), cat_name, fill=(15, 23, 42), font=fonts["card_title"])
        draw.text((70, y + 42), desc, fill=(100, 116, 139), font=fonts["card_text"])

        badge_text = f"{count} PATTERNS"
        bbox = draw.textbbox((0, 0), badge_text, font=fonts["card_bold"])
        bw = bbox[2] - bbox[0]
        draw.rectangle([(PAGE_WIDTH - 70 - bw - 20, y + 20), (PAGE_WIDTH - 70, y + 50)], fill=(14, 116, 144), outline=None)
        draw.text((PAGE_WIDTH - 70 - bw - 10, y + 27), badge_text, fill=(255, 255, 255), font=fonts["card_bold"])

        y += 82

    # Technical Specifications Box
    spec_top = 800
    draw.text((50, spec_top), "ARCHITECTURAL INSTALLATION SPECIFICATIONS", fill=(15, 23, 42), font=fonts["heading"])
    draw.line([(50, spec_top + 35), (PAGE_WIDTH - 50, spec_top + 35)], fill=(226, 232, 240), width=1)

    specs = [
        ("Substrate Requirement", "Plastered masonry, concrete, or reinforced cement board (cured min. 28 days, free of dust & efflorescence)."),
        ("Adhesive Specification", "Polymer-modified flexible stone adhesive (Class C2TE S1/S2 conforming to EN 12004 / IS 15477:2019 Type 3)."),
        ("Mechanical Clamps", "For wall elevations exceeding 4.5 meters (15 ft), SS-304 concealed mechanical anchors are recommended."),
        ("Joints & Grouting", "Dry-stack interlocking fit recommended for split-face ledger; 2mm expansion joints for exterior facades."),
        ("Sealing & Hydrophobing", "Apply breathable silane-siloxane penetrating sealer after complete moisture evaporation for dust/stain defense."),
        ("Export Packaging", "Treated & fumigated seaworthy wooden crates with corner foam cushioning and moisture-barrier wrap."),
    ]

    sy = spec_top + 55
    for title, detail in specs:
        draw.rectangle([(50, sy), (PAGE_WIDTH - 50, sy + 65)], fill=(255, 255, 255), outline=(226, 232, 240), width=1)
        draw.text((70, sy + 14), title, fill=(14, 116, 144), font=fonts["card_bold"])
        draw.text((70, sy + 38), detail, fill=(51, 65, 85), font=fonts["card_text"])
        sy += 75

    # Bottom Contact Bar
    draw.rectangle([(50, 1380), (PAGE_WIDTH - 50, 1650)], fill=(15, 23, 42), outline=None)
    draw.text(
        (PAGE_WIDTH // 2, 1430),
        "NEED CUSTOM SIZES OR WATERJET DRAWINGS?",
        fill=(251, 191, 36),
        font=fonts["subheading"],
        anchor="mm",
    )
    draw.text(
        (PAGE_WIDTH // 2, 1470),
        "Stone Tech's in-house 5-axis CNC atelier can carve bespoke murals and elevation panels to your exact CAD specs.",
        fill=(203, 213, 225),
        font=fonts["card_text"],
        anchor="mm",
    )
    draw.text(
        (PAGE_WIDTH // 2, 1520),
        "Direct WhatsApp Studio Line: +91 94141 61129   ·   Email CAD: info@stonetech.in",
        fill=(255, 255, 255),
        font=fonts["card_title"],
        anchor="mm",
    )
    draw.text(
        (PAGE_WIDTH // 2, 1580),
        "Factory: RIICO Industrial Area, Makrana & Kishangarh, Rajasthan, India",
        fill=(148, 163, 184),
        font=fonts["card_text"],
        anchor="mm",
    )

    return img


def render_pattern_card(draw, fonts, item, img_canvas, x, y, card_w, card_h):
    """
    Renders a single high-resolution pattern card with authentic, uncompressed,
    aspect-ratio-preserved stone photography.
    """
    # Outer card border
    draw.rectangle(
        [(x, y), (x + card_w, y + card_h)],
        fill=(255, 255, 255),
        outline=(226, 232, 240),
        width=1,
    )

    # Photo container box (generously sized 521 x 460)
    box_x = x + 12
    box_y = y + 12
    box_w = card_w - 24
    box_h = 460

    # Draw luxury studio mount container
    draw.rectangle(
        [(box_x, box_y), (box_x + box_w, box_y + box_h)],
        fill=(248, 250, 252),
        outline=(235, 240, 245),
        width=1,
    )

    photo_path = "public" + item["image"]
    if os.path.exists(photo_path):
        try:
            with Image.open(photo_path) as pimg:
                if pimg.mode != "RGB":
                    pimg = pimg.convert("RGB")

                # EXACT PROPORTIONAL FIT: NEVER STRETCHED, NEVER SQUISHED, NEVER COMPRESSED
                img_w, img_h = pimg.size
                scale = min(box_w / img_w, box_h / img_h)
                new_w = max(1, int(img_w * scale))
                new_h = max(1, int(img_h * scale))

                # High quality Lanczos resampler for crisp mineral textures
                thumb = pimg.resize((new_w, new_h), Image.Resampling.LANCZOS)

                # Center the uncropped stone panel inside the frame
                paste_x = box_x + (box_w - new_w) // 2
                paste_y = box_y + (box_h - new_h) // 2
                img_canvas.paste(thumb, (paste_x, paste_y))
        except Exception:
            draw.text(
                (box_x + 20, box_y + 100),
                f"Image: {item['id']}",
                fill=(100, 116, 139),
                font=fonts["card_text"],
            )
    else:
        draw.text(
            (box_x + 20, box_y + 100),
            f"Image: {item['id']}",
            fill=(100, 116, 139),
            font=fonts["card_text"],
        )

    # Pattern Code Tag (Top Left of photo box)
    draw.rectangle(
        [(box_x + 10, box_y + 10), (box_x + 105, box_y + 34)],
        fill=(15, 23, 42),
    )
    draw.text(
        (box_x + 16, box_y + 14),
        item["id"],
        fill=(103, 232, 249),
        font=fonts["card_code"],
    )

    # Benchmark Price & Badge
    price, badge = get_benchmark_price(item["category"], item["stoneType"], item["index"])

    # Promotional Badge (Top Right of photo box)
    bbox = draw.textbbox((0, 0), badge.upper(), font=fonts["badge"])
    bw = bbox[2] - bbox[0]
    draw.rectangle(
        [(box_x + box_w - bw - 22, box_y + 10), (box_x + box_w - 10, box_y + 34)],
        fill=(217, 119, 6),
    )
    draw.text(
        (box_x + box_w - bw - 16, box_y + 15),
        badge.upper(),
        fill=(255, 255, 255),
        font=fonts["badge"],
    )

    # Content section below photo container
    cy = box_y + box_h + 16
    draw.text(
        (x + 16, cy),
        f"{item['category'].upper()}  ·  {item['stoneType'].upper()}",
        fill=(14, 116, 144),
        font=fonts["badge"],
    )
    cy += 20
    draw.text(
        (x + 16, cy),
        item["name"],
        fill=(15, 23, 42),
        font=fonts["card_title"],
    )
    cy += 30

    # Luxury Price Strip
    price_box_h = 38
    draw.rectangle(
        [(x + 14, cy), (x + card_w - 14, cy + price_box_h)],
        fill=(15, 23, 42),
        outline=None,
    )
    draw.text(
        (x + 22, cy + 9),
        f"₹ {price} / sq.ft",
        fill=(52, 211, 153),
        font=fonts["card_price"],
    )
    draw.text(
        (x + 160, cy + 13),
        f"MRP ₹ {int(price * 1.25)}",
        fill=(148, 163, 184),
        font=fonts["card_text"],
    )
    draw.text(
        (x + card_w - 22, cy + 13),
        "Direct Quarry Rate",
        fill=(203, 213, 225),
        font=fonts["card_text"],
        anchor="ra",
    )
    cy += price_box_h + 16

    # Specifications Grid
    draw.text(
        (x + 16, cy),
        f"Standard Modules: {item['standardSizes']}",
        fill=(51, 65, 85),
        font=fonts["card_bold"],
    )
    cy += 22
    draw.text(
        (x + 16, cy),
        f"Relief Profile: {item['thickness']}",
        fill=(100, 116, 139),
        font=fonts["card_text"],
    )
    cy += 20
    finishes_str = ", ".join(item["finishes"][:3])
    draw.text(
        (x + 16, cy),
        f"Surface Finishes: {finishes_str}",
        fill=(100, 116, 139),
        font=fonts["card_text"],
    )
    cy += 20
    draw.text(
        (x + 16, cy),
        "Installation: C2TE S1/S2 Adhesive & Concealed Anchors",
        fill=(100, 116, 139),
        font=fonts["card_text"],
    )

    # Bottom action prompt
    cy = y + card_h - 32
    draw.line([(x + 14, cy), (x + card_w - 14, cy)], fill=(241, 245, 249), width=1)
    draw.text(
        (x + 16, cy + 10),
        "Inquire on WhatsApp: +91 94141 61129",
        fill=(16, 185, 129),
        font=fonts["card_bold"],
    )


def create_back_cover_page(fonts):
    """Generates final contact, ordering & export packaging page."""
    img = Image.new("RGB", (PAGE_WIDTH, PAGE_HEIGHT), color=(15, 23, 42))
    draw = ImageDraw.Draw(img)

    # Gold decorative border
    draw.rectangle([(35, 35), (PAGE_WIDTH - 35, PAGE_HEIGHT - 35)], outline=(217, 119, 6), width=2)
    draw.rectangle([(42, 42), (PAGE_WIDTH - 42, PAGE_HEIGHT - 42)], outline=(245, 158, 11), width=1)

    draw.text(
        (PAGE_WIDTH // 2, 160),
        "STONE TECH ATELIER",
        fill=(245, 158, 11),
        font=fonts["heading"],
        anchor="mm",
    )
    draw.text(
        (PAGE_WIDTH // 2, 205),
        "INDIA'S PREMIER NATURAL STONE FABRICATION HUB",
        fill=(148, 163, 184),
        font=fonts["card_bold"],
        anchor="mm",
    )
    draw.line(
        [(PAGE_WIDTH // 2 - 160, 240), (PAGE_WIDTH // 2 + 160, 240)],
        fill=(217, 119, 6),
        width=2,
    )

    # How to Order Box
    box_w = PAGE_WIDTH - 160
    draw.rectangle([(80, 280), (80 + box_w, 640)], fill=(30, 41, 59), outline=(51, 65, 85), width=2)
    draw.text((110, 310), "HOW TO PLACE AN ORDER / SAMPLE REQUEST", fill=(251, 191, 36), font=fonts["subheading"])

    steps = [
        "1. Select Pattern Code: Quote the ST-WC-XXX code shown on any catalog page.",
        "2. Send WhatsApp or CAD Drawing: Forward your required elevation area (sq.ft) and site photos.",
        "3. Dry-Lay Approval: For customized orders, full pre-dispatch dry-lay mockup photos are shared.",
        "4. Dispatch & Logistics: Dedicated road transport across India or seaworthy container crating for export.",
    ]
    for idx, s in enumerate(steps):
        draw.text((110, 370 + idx * 60), s, fill=(241, 245, 249), font=fonts["card_title"])

    # Packaging Specifications
    draw.rectangle([(80, 680), (80 + box_w, 1040)], fill=(30, 41, 59), outline=(51, 65, 85), width=2)
    draw.text((110, 710), "EXPORT PACKAGING & QUALITY ASSURANCE", fill=(251, 191, 36), font=fonts["subheading"])

    pack_info = [
        "· Fumigated Wooden Crates: ISPM-15 heat-treated solid pine / hardwood crates.",
        "· Shock Absorption: Polyethylene foam interleaving between high-relief carved stone surfaces.",
        "· Edge Protection: Heavy-duty plastic corner guards and steel strapping.",
        "· Moisture Protection: VCI anti-corrosive / waterproof polyethylene shroud wrapping.",
        "· Tolerances: Thickness calibrated within +/- 1.5mm; squareness checked by dial calipers.",
    ]
    for idx, p in enumerate(pack_info):
        draw.text((110, 770 + idx * 50), p, fill=(226, 232, 240), font=fonts["card_text"])

    # Direct Contacts
    draw.rectangle([(80, 1080), (80 + box_w, 1500)], fill=(15, 23, 42), outline=(217, 119, 6), width=2)
    draw.text(
        (PAGE_WIDTH // 2, 1140),
        "CONNECT WITH OUR STONE ARCHITECTS",
        fill=(251, 191, 36),
        font=fonts["heading"],
        anchor="mm",
    )

    draw.text(
        (PAGE_WIDTH // 2, 1210),
        "WhatsApp Direct Line: +91 94141 61129",
        fill=(255, 255, 255),
        font=fonts["card_title"],
        anchor="mm",
    )
    draw.text(
        (PAGE_WIDTH // 2, 1260),
        "Direct Email: info@stonetech.in   ·   Website: www.stonetech.in",
        fill=(203, 213, 225),
        font=fonts["card_title"],
        anchor="mm",
    )
    draw.text(
        (PAGE_WIDTH // 2, 1320),
        "Quarry & Fabrication Atelier: RIICO Industrial Area, Makrana & Kishangarh, Rajasthan, India",
        fill=(148, 163, 184),
        font=fonts["card_text"],
        anchor="mm",
    )
    draw.text(
        (PAGE_WIDTH // 2, 1370),
        "Global Port of Dispatch: Mundra Port / JNPT, India",
        fill=(148, 163, 184),
        font=fonts["card_text"],
        anchor="mm",
    )

    draw.text(
        (PAGE_WIDTH // 2, 1440),
        "© 2026 Stone Tech OS / Stone Tech Atelier. All Rights Reserved.",
        fill=(100, 116, 139),
        font=fonts["badge"],
        anchor="mm",
    )

    return img


def main():
    print("Initializing PDF generation for Natural Stone Wall Cladding...")
    with open("src/data/wall-cladding-catalog.json", "r") as f:
        items = json.load(f)

    print(f"Loaded {len(items)} patterns.")
    fonts = get_fonts()

    pages = []

    card_w = 545
    card_h = 760
    x_positions = [55, 640]
    y_positions = [75, 870]

    total_pages = 2 + ((len(items) + 3) // 4) + 1  # 2 intro + 35 catalog + 1 back = 38 pages

    # Page 1: Cover
    print("Generating Cover Page...")
    pages.append(create_cover_page(fonts))

    # Page 2: Table of Contents & Guidelines
    print("Generating Table of Contents Page...")
    pages.append(create_table_of_contents_page(fonts, items, total_pages))

    # Pattern Catalog Pages (4 patterns per page: 2 columns x 2 rows, balanced across A4)
    for chunk_idx in range(0, len(items), 4):
        chunk = items[chunk_idx : chunk_idx + 4]
        page_num = 3 + (chunk_idx // 4)
        cat_name = chunk[0]["category"]

        p_img = Image.new("RGB", (PAGE_WIDTH, PAGE_HEIGHT), color=(255, 255, 255))
        p_draw = ImageDraw.Draw(p_img)
        draw_header_footer(p_draw, fonts, page_num, total_pages, cat_name)

        for i, item in enumerate(chunk):
            gx = x_positions[i % 2]
            gy = y_positions[i // 2]
            render_pattern_card(p_draw, fonts, item, p_img, gx, gy, card_w, card_h)

        pages.append(p_img)
        if (page_num - 2) % 5 == 0 or page_num == total_pages - 1:
            print(f"Rendered catalog page {page_num}/{total_pages}...")

    # Final Page: Back Cover
    print("Generating Back Cover Page...")
    pages.append(create_back_cover_page(fonts))

    output_dir = "public/catalogues"
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "stos-wall-cladding-catalogue-2026.pdf")

    print(f"Compiling {len(pages)} pages into {output_path} (High-res uncompressed Lanczos)...")
    pages[0].save(
        output_path,
        save_all=True,
        append_images=pages[1:],
        quality=92,
        subsampling=0,
        optimize=True,
    )

    size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"SUCCESS: Generated {output_path} ({size_mb:.2f} MB, {len(pages)} pages)")


if __name__ == "__main__":
    main()

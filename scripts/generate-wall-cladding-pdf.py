#!/usr/bin/env python3
"""
generate-wall-cladding-pdf.py

Compiles a luxury, publication-quality 2026 Natural Stone Wall Cladding & Mosaics
Catalog PDF from src/data/wall-cladding-catalog.json (182 patterns) with:
- High-impact brand cover page featuring the official Stone Tech logo (NO thumbnail panels)
- Stone Tech Experience Center address in Gota, Ahmedabad (NO factory address)
- Direct WhatsApp lines: +91 77420 90866 / +91 97844 52998
- Simplified product cards: large high-resolution photos with clean product coding (e.g. ST-WC-053)
- NO product names, NO size specs, NO adhesive specs, NO prices/rates
- NO collections directory and NO installation specifications page
- Back cover featuring How to Order, ISPM-15 export crating, and Experience Center details
- Compression tuned (quality=80, subsampling=1) to stay strictly under Cloudflare's 25 MiB asset limit.
"""

import json
import math
import os
from PIL import Image, ImageDraw, ImageFont

PAGE_WIDTH = 1240   # A4 at 150 DPI
PAGE_HEIGHT = 1754  # A4 at 150 DPI


def get_fonts():
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
        "title": load(serif_path, 48),
        "subtitle": load(regular_path, 22),
        "heading": load(bold_path, 28),
        "subheading": load(bold_path, 20),
        "card_title": load(bold_path, 18),
        "card_code": load(bold_path, 16),
        "card_text": load(regular_path, 13),
        "card_bold": load(bold_path, 14),
        "badge": load(bold_path, 12),
        "footer": load(regular_path, 12),
    }


def load_brand_assets():
    """Loads official Stone Tech brand logo and prepares scaled header icon."""
    logo_path = "public/branding/stone-tech-logo-transparent.png"
    if not os.path.exists(logo_path):
        logo_path = "public/branding/stone-tech-logo.png"

    logo = Image.open(logo_path)
    if logo.mode != "RGBA":
        logo = logo.convert("RGBA")

    bbox = logo.getbbox()
    if bbox:
        logo_cropped = logo.crop(bbox)
    else:
        logo_cropped = logo

    icon_h = 32
    scale = icon_h / logo_cropped.height
    icon_w = max(1, int(logo_cropped.width * scale))
    header_icon = logo_cropped.resize((icon_w, icon_h), Image.Resampling.LANCZOS)

    return logo_cropped, header_icon


def draw_header_footer(draw, fonts, page_num, total_pages, category_name="", header_icon=None, img_canvas=None):
    """Draws consistent luxury header and footer with brand logo on catalog pages."""
    # Top rule
    draw.line([(50, 48), (PAGE_WIDTH - 50, 48)], fill=(226, 232, 240), width=1)

    text_x = 50
    if header_icon and img_canvas:
        img_canvas.paste(header_icon, (50, 10), header_icon if header_icon.mode == "RGBA" else None)
        text_x = 50 + header_icon.width + 12

    draw.text((text_x, 24), "STONE TECH ATELIER", fill=(15, 23, 42), font=fonts["card_bold"])
    draw.text(
        (text_x + 165, 24),
        "·  NATURAL STONE WALL CLADDING 2026",
        fill=(100, 116, 139),
        font=fonts["footer"],
    )

    if category_name:
        bbox = draw.textbbox((0, 0), category_name.upper(), font=fonts["badge"])
        tw = bbox[2] - bbox[0]
        draw.text(
            (PAGE_WIDTH - 50 - tw, 24),
            category_name.upper(),
            fill=(14, 116, 144),
            font=fonts["badge"],
        )

    # Bottom rule
    draw.line(
        [(50, PAGE_HEIGHT - 48), (PAGE_WIDTH - 50, PAGE_HEIGHT - 48)],
        fill=(226, 232, 240),
        width=1,
    )
    draw.text(
        (50, PAGE_HEIGHT - 36),
        "Experience Center: E-02, SG Business Hub, Gota, Ahmedabad · WhatsApp: +91 77420 90866 / +91 97844 52998 · www.stonetech.in",
        fill=(71, 85, 105),
        font=fonts["footer"],
    )
    page_str = f"Page {page_num} of {total_pages}"
    bbox = draw.textbbox((0, 0), page_str, font=fonts["footer"])
    tw = bbox[2] - bbox[0]
    draw.text(
        (PAGE_WIDTH - 50 - tw, PAGE_HEIGHT - 36),
        page_str,
        fill=(100, 116, 139),
        font=fonts["footer"],
    )


def create_cover_page(fonts, logo_img, total_patterns=240):
    """
    Generates luxury dark gold cover page with prominent brand logo medallion.
    Completely clean: NO thumbnail pictures of panels, NO factory address.
    Features Stone Tech Experience Center in Ahmedabad and official contact numbers.
    """
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

    # Official Stone Tech Logo Medallion
    card_w, card_h = 200, 180
    card_x = (PAGE_WIDTH - card_w) // 2
    card_y = 110
    draw.rounded_rectangle(
        [(card_x, card_y), (card_x + card_w, card_y + card_h)],
        radius=24,
        fill=(255, 255, 255),
        outline=(217, 119, 6),
        width=2,
    )
    draw.rounded_rectangle(
        [(card_x + 4, card_y + 4), (card_x + card_w - 4, card_y + card_h - 4)],
        radius=20,
        outline=(245, 158, 11),
        width=1,
    )

    logo_thumb = logo_img.copy()
    logo_thumb.thumbnail((card_w - 32, card_h - 32), Image.Resampling.LANCZOS)
    img.paste(
        logo_thumb,
        (card_x + (card_w - logo_thumb.width) // 2, card_y + (card_h - logo_thumb.height) // 2),
        logo_thumb if logo_thumb.mode == "RGBA" else None,
    )

    # Brand Title
    draw.text(
        (PAGE_WIDTH // 2, 335),
        "STONE TECH ATELIER",
        fill=(245, 158, 11),
        font=fonts["heading"],
        anchor="mm",
    )
    draw.text(
        (PAGE_WIDTH // 2, 380),
        "ARCHITECTURAL STONE FABRICATORS",
        fill=(148, 163, 184),
        font=fonts["subheading"],
        anchor="mm",
    )

    # Dividing line
    draw.line(
        [(PAGE_WIDTH // 2 - 200, 420), (PAGE_WIDTH // 2 + 200, 420)],
        fill=(217, 119, 6),
        width=2,
    )

    # Main Catalog Title
    draw.text(
        (PAGE_WIDTH // 2, 495),
        "NATURAL STONE",
        fill=(255, 255, 255),
        font=fonts["title"],
        anchor="mm",
    )
    draw.text(
        (PAGE_WIDTH // 2, 565),
        "WALL CLADDING & MOSAICS",
        fill=(251, 191, 36),
        font=fonts["title"],
        anchor="mm",
    )
    draw.text(
        (PAGE_WIDTH // 2, 640),
        "2026 ARCHITECTURAL & EXPORT CATALOGUE",
        fill=(103, 232, 249),
        font=fonts["subheading"],
        anchor="mm",
    )
    draw.text(
        (PAGE_WIDTH // 2, 680),
        f"{total_patterns} DISTINCTIVE PRECISION PATTERNS",
        fill=(148, 163, 184),
        font=fonts["card_bold"],
        anchor="mm",
    )

    # Architectural Overview Box (Clean specifications without thumbnails)
    box_top = 740
    box_h = 360
    draw.rectangle(
        [(100, box_top), (PAGE_WIDTH - 100, box_top + box_h)],
        fill=(30, 41, 59),
        outline=(51, 65, 85),
        width=2,
    )
    draw.text(
        (PAGE_WIDTH // 2, box_top + 45),
        "ARCHITECTURAL SURFACE COLLECTION",
        fill=(251, 191, 36),
        font=fonts["subheading"],
        anchor="mm",
    )
    draw.line(
        [(PAGE_WIDTH // 2 - 160, box_top + 72), (PAGE_WIDTH // 2 + 160, box_top + 72)],
        fill=(217, 119, 6),
        width=1,
    )

    highlights = [
        f"· {total_patterns} Distinctive Natural Stone Wall Cladding & Mosaic Designs",
        "· 100% Authentic Quarried Marble, Sandstone, Quartzite, Slate & Basalt",
        "· Precision Calibrated Modular Tiles, 3D CNC Relief & Linear Ledgestone",
        "· Custom Cut-to-Size Fabrication to Match Architectural & Interior Drawings",
        "· Seaworthy ISPM-15 Heat-Treated Export Crating & Pan-India Studio Logistics",
    ]
    for idx, h in enumerate(highlights):
        draw.text((130, box_top + 105 + idx * 48), h, fill=(241, 245, 249), font=fonts["card_title"])

    # Experience Center Address & Direct Contacts (NO factory address)
    draw.line([(100, 1180), (PAGE_WIDTH - 100, 1180)], fill=(217, 119, 6), width=2)
    draw.text(
        (PAGE_WIDTH // 2, 1225),
        "STONE TECH EXPERIENCE CENTER · AHMEDABAD",
        fill=(251, 191, 36),
        font=fonts["heading"],
        anchor="mm",
    )
    draw.text(
        (PAGE_WIDTH // 2, 1280),
        "E-02, Ground Floor, SG Business Hub, Vasant Nagar, Gota, Ahmedabad, Gujarat 380060",
        fill=(255, 255, 255),
        font=fonts["card_title"],
        anchor="mm",
    )
    draw.text(
        (PAGE_WIDTH // 2, 1335),
        "Direct WhatsApp & Studio Inquiries: +91 77420 90866 / +91 97844 52998",
        fill=(103, 232, 249),
        font=fonts["subheading"],
        anchor="mm",
    )
    draw.text(
        (PAGE_WIDTH // 2, 1385),
        "Email: info@stonetech.in   ·   Web: www.stonetech.in",
        fill=(203, 213, 225),
        font=fonts["card_title"],
        anchor="mm",
    )
    draw.text(
        (PAGE_WIDTH // 2, 1450),
        "WhatsApp Ready Softcopy · Architectural Specification Edition",
        fill=(100, 116, 139),
        font=fonts["badge"],
        anchor="mm",
    )

    return img


def render_pattern_card(draw, fonts, item, img_canvas, x, y, card_w, card_h):
    """
    Renders simplified, high-impact pattern card:
    - Huge photo display (>85% of card area) with proportional Lanczos scaling
    - Prominent Product Code tag (e.g. ST-WC-053)
    - Clean footer with Product Code and WhatsApp Inquiry
    - NO product names, NO size specs, NO adhesives, NO prices/rates
    """
    # Card outer border
    draw.rounded_rectangle(
        [(x, y), (x + card_w, y + card_h)],
        radius=14,
        fill=(255, 255, 255),
        outline=(226, 232, 240),
        width=1,
    )

    # Photo Box dimensions: maximizes image visibility
    box_x = x + 12
    box_y = y + 12
    box_w = card_w - 24
    box_h = card_h - 85  # leaves 73px for simplified footer

    # Photo background
    draw.rounded_rectangle(
        [(box_x, box_y), (box_x + box_w, box_y + box_h)],
        radius=10,
        fill=(248, 250, 252),
        outline=(241, 245, 249),
        width=1,
    )

    photo_path = "public" + item["image"]
    if os.path.exists(photo_path):
        try:
            with Image.open(photo_path) as pimg:
                if pimg.mode != "RGB":
                    pimg = pimg.convert("RGB")

                # Apply lossless rotation from catalog metadata (0, 90, 180, 270)
                rotation = item.get("rotation", 0) % 360
                if rotation == 90:
                    pimg = pimg.transpose(Image.Transpose.ROTATE_270)
                elif rotation == 180:
                    pimg = pimg.transpose(Image.Transpose.ROTATE_180)
                elif rotation == 270:
                    pimg = pimg.transpose(Image.Transpose.ROTATE_90)

                # Exact proportional fit: never distorted, never squished
                img_w, img_h = pimg.size
                scale = min(box_w / img_w, box_h / img_h)
                new_w = max(1, int(img_w * scale))
                new_h = max(1, int(img_h * scale))

                thumb = pimg.resize((new_w, new_h), Image.Resampling.LANCZOS)
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

    # Prominent Pattern Code Tag (Top Left of photo box)
    code_text = item["id"]
    bbox = draw.textbbox((0, 0), code_text, font=fonts["card_code"])
    tag_w = (bbox[2] - bbox[0]) + 24
    draw.rounded_rectangle(
        [(box_x + 12, box_y + 12), (box_x + 12 + tag_w, box_y + 42)],
        radius=6,
        fill=(15, 23, 42),
    )
    draw.text(
        (box_x + 24, box_y + 19),
        code_text,
        fill=(103, 232, 249),
        font=fonts["card_code"],
    )

    # Simplified Footer Strip
    footer_line_y = y + card_h - 64
    draw.line([(x + 14, footer_line_y), (x + card_w - 14, footer_line_y)], fill=(241, 245, 249), width=1)

    text_y = y + card_h - 44
    draw.text(
        (x + 18, text_y),
        f"CODE: {item['id']}",
        fill=(15, 23, 42),
        font=fonts["card_title"],
    )

    draw.text(
        (x + card_w - 18, text_y + 2),
        "Inquire: +91 77420 90866",
        fill=(16, 185, 129),
        font=fonts["card_bold"],
        anchor="ra",
    )


def create_back_cover_page(fonts, logo_img):
    """
    Generates final contact, ordering & export packaging page.
    Features Stone Tech Experience Center in Ahmedabad and direct WhatsApp lines.
    Completely removes factory/quarry address as requested.
    """
    img = Image.new("RGB", (PAGE_WIDTH, PAGE_HEIGHT), color=(15, 23, 42))
    draw = ImageDraw.Draw(img)

    # Gold decorative border
    draw.rectangle([(35, 35), (PAGE_WIDTH - 35, PAGE_HEIGHT - 35)], outline=(217, 119, 6), width=2)
    draw.rectangle([(42, 42), (PAGE_WIDTH - 42, PAGE_HEIGHT - 42)], outline=(245, 158, 11), width=1)

    # Brand Logo Medallion
    card_w, card_h = 180, 160
    card_x = (PAGE_WIDTH - card_w) // 2
    card_y = 80
    draw.rounded_rectangle(
        [(card_x, card_y), (card_x + card_w, card_y + card_h)],
        radius=20,
        fill=(255, 255, 255),
        outline=(217, 119, 6),
        width=2,
    )
    draw.rounded_rectangle(
        [(card_x + 3, card_y + 3), (card_x + card_w - 3, card_y + card_h - 3)],
        radius=17,
        outline=(245, 158, 11),
        width=1,
    )

    logo_thumb = logo_img.copy()
    logo_thumb.thumbnail((card_w - 28, card_h - 28), Image.Resampling.LANCZOS)
    img.paste(
        logo_thumb,
        (card_x + (card_w - logo_thumb.width) // 2, card_y + (card_h - logo_thumb.height) // 2),
        logo_thumb if logo_thumb.mode == "RGBA" else None,
    )

    draw.text(
        (PAGE_WIDTH // 2, 280),
        "STONE TECH ATELIER",
        fill=(245, 158, 11),
        font=fonts["heading"],
        anchor="mm",
    )
    draw.text(
        (PAGE_WIDTH // 2, 320),
        "ARCHITECTURAL STONE CLADDING & BESPOKE FABRICATION",
        fill=(148, 163, 184),
        font=fonts["subheading"],
        anchor="mm",
    )
    draw.line(
        [(PAGE_WIDTH // 2 - 180, 350), (PAGE_WIDTH // 2 + 180, 350)],
        fill=(217, 119, 6),
        width=2,
    )

    # How to Order Box
    box_w = PAGE_WIDTH - 160
    draw.rectangle([(80, 380), (80 + box_w, 690)], fill=(30, 41, 59), outline=(51, 65, 85), width=2)
    draw.text((110, 410), "HOW TO PLACE AN ORDER / SAMPLE REQUEST", fill=(251, 191, 36), font=fonts["subheading"])

    steps = [
        "1. Note Product Code: Simply share the ST-WC-XXX code shown on any catalog page.",
        "2. Send Elevation Details: Forward required elevation area (sq.ft), CAD, or site photos.",
        "3. Dry-Lay Approval: For customized orders, full pre-dispatch dry-lay mockup photos are shared.",
        "4. Logistics & Delivery: Direct insured transport to site across India or seaworthy container crating for export.",
    ]
    for idx, s in enumerate(steps):
        draw.text((110, 465 + idx * 52), s, fill=(241, 245, 249), font=fonts["card_title"])

    # Packaging Specifications
    draw.rectangle([(80, 720), (80 + box_w, 1030)], fill=(30, 41, 59), outline=(51, 65, 85), width=2)
    draw.text((110, 750), "EXPORT PACKAGING & QUALITY ASSURANCE", fill=(251, 191, 36), font=fonts["subheading"])

    pack_info = [
        "· Fumigated Wooden Crates: ISPM-15 heat-treated solid pine / hardwood crates.",
        "· Shock Absorption: Polyethylene foam interleaving between high-relief carved stone surfaces.",
        "· Edge Protection: Heavy-duty plastic corner guards and reinforced steel strapping.",
        "· Moisture Defense: VCI waterproof barrier and polyethylene protective wrap.",
        "· Calibration: Thickness calibrated within +/- 1.5mm; squareness verified with precision calipers.",
    ]
    for idx, p in enumerate(pack_info):
        draw.text((110, 805 + idx * 42), p, fill=(226, 232, 240), font=fonts["card_text"])

    # Experience Center Address & Direct Contacts (NO factory address)
    draw.rectangle([(80, 1060), (80 + box_w, 1500)], fill=(15, 23, 42), outline=(217, 119, 6), width=2)
    draw.text(
        (PAGE_WIDTH // 2, 1115),
        "VISIT OUR EXPERIENCE CENTER & STUDIO",
        fill=(251, 191, 36),
        font=fonts["heading"],
        anchor="mm",
    )

    draw.text(
        (PAGE_WIDTH // 2, 1175),
        "STONE TECH EXPERIENCE CENTER",
        fill=(255, 255, 255),
        font=fonts["heading"],
        anchor="mm",
    )
    draw.text(
        (PAGE_WIDTH // 2, 1225),
        "E-02, Ground Floor, SG Business Hub, Vasant Nagar, Gota, Ahmedabad, Gujarat 380060",
        fill=(203, 213, 225),
        font=fonts["card_title"],
        anchor="mm",
    )
    draw.text(
        (PAGE_WIDTH // 2, 1285),
        "WhatsApp Direct Lines: +91 77420 90866 / +91 97844 52998",
        fill=(103, 232, 249),
        font=fonts["subheading"],
        anchor="mm",
    )
    draw.text(
        (PAGE_WIDTH // 2, 1335),
        "Direct Email: info@stonetech.in   ·   Website: www.stonetech.in",
        fill=(203, 213, 225),
        font=fonts["card_title"],
        anchor="mm",
    )
    draw.text(
        (PAGE_WIDTH // 2, 1385),
        "Studio Hours: Monday – Saturday, 10:00 AM – 7:30 PM",
        fill=(148, 163, 184),
        font=fonts["card_text"],
        anchor="mm",
    )
    draw.text(
        (PAGE_WIDTH // 2, 1425),
        "Port of Export Dispatch: Mundra Port / JNPT, India",
        fill=(148, 163, 184),
        font=fonts["card_text"],
        anchor="mm",
    )

    draw.text(
        (PAGE_WIDTH // 2, 1540),
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
    logo_img, header_icon = load_brand_assets()
    print("Loaded official Stone Tech branding assets.")

    pages = []

    card_w = 545
    card_h = 790
    x_positions = [55, 640]
    y_positions = [65, 885]

    catalog_pages_count = (len(items) + 3) // 4  # 46 pages for 182 items
    total_pages = 1 + catalog_pages_count + 1   # 1 Cover + 46 Catalog + 1 Back = 48 pages

    # Page 1: Cover
    print("Generating Cover Page with Official Logo (no thumbnail panels, no factory address)...")
    pages.append(create_cover_page(fonts, logo_img, len(items)))

    # Pattern Catalog Pages (Pages 2 to 47): 4 patterns per page (2 columns x 2 rows)
    for chunk_idx in range(0, len(items), 4):
        chunk = items[chunk_idx : chunk_idx + 4]
        page_num = 2 + (chunk_idx // 4)
        cat_name = chunk[0].get("category", "")

        p_img = Image.new("RGB", (PAGE_WIDTH, PAGE_HEIGHT), color=(255, 255, 255))
        p_draw = ImageDraw.Draw(p_img)
        draw_header_footer(p_draw, fonts, page_num, total_pages, cat_name, header_icon, p_img)

        for i, item in enumerate(chunk):
            gx = x_positions[i % 2]
            gy = y_positions[i // 2]
            render_pattern_card(p_draw, fonts, item, p_img, gx, gy, card_w, card_h)

        pages.append(p_img)
        if (page_num - 1) % 5 == 0 or page_num == total_pages - 1:
            print(f"Rendered catalog page {page_num}/{total_pages}...")

    # Final Page: Back Cover (Page 48)
    print("Generating Back Cover Page with Experience Center address...")
    pages.append(create_back_cover_page(fonts, logo_img))

    output_dir = "public/catalogues"
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "stos-wall-cladding-catalogue-2026.pdf")

    print(f"Compiling {len(pages)} pages into {output_path} (Optimized publication quality)...")
    pages[0].save(
        output_path,
        save_all=True,
        append_images=pages[1:],
        quality=80,
        subsampling=1,
        optimize=True,
    )

    size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"SUCCESS: Generated {output_path} ({size_mb:.2f} MB, {len(pages)} pages)")


if __name__ == "__main__":
    main()

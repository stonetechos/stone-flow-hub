#!/usr/bin/env python3
"""
scripts/reorder_and_generate.py

1. Categorizes all 284 natural stone wall cladding patterns into 8 architectural chapters
   based on stone placement geometry and visual pattern:
   - Chapter 1: 3D Pyramid & Faceted Origami Relief
   - Chapter 2: Crazy China, Slender Needle Strips & Natural Flagstone
   - Chapter 3: Staggered Multi-Level Plank & Strip Ledgestone
   - Chapter 4: Chevron, Herringbone & Diagonal Fluted Parquet
   - Chapter 5: Modular Ashlar, Mondrian Grid & Beveled Blocks
   - Chapter 6: Fluid Waves, Dune Ripples & Kinetic Scoops
   - Chapter 7: Circular Motifs, Sunburst Chakras & Pebble Mosaics
   - Chapter 8: Architectural Relief Murals, Royal Jharokha & Carved Flora

2. Orders src/data/wall-cladding-catalog.json by chapter and saves with sequential index.
3. Updates DEFAULT_WEBSITE_CATALOG_ORDER in src/lib/site-settings/types.ts.
4. Generates the publication PDF: public/catalogues/StoneTech_NaturalStone_WallCl_Options_26-27.pdf
   and mirrors to public/catalogues/stos-wall-cladding-catalogue-2026.pdf.
"""

import json
import math
import os
import re
from PIL import Image, ImageDraw, ImageFont

PAGE_WIDTH = 1240   # A4 at 150 DPI
PAGE_HEIGHT = 1754  # A4 at 150 DPI

CHAPTER_CONFIG = [
    {
        "name": "3D Pyramid & Faceted Origami Relief",
        "short": "3D PYRAMID & FACETED ORIGAMI",
        "desc": "High-relief faceted origami, 3D pyramids, isometric blocks & geometric prisms",
    },
    {
        "name": "Crazy China, Slender Needle Strips & Natural Flagstone",
        "short": "CRAZY CHINA & SLENDER STRIP MOSAICS",
        "desc": "Dense thin needle strips, random polygonal flagstone & rustic multi-tone slate strips",
    },
    {
        "name": "Staggered Multi-Level Plank & Strip Ledgestone",
        "short": "STAGGERED PLANKS & STRIP LEDGESTONE",
        "desc": "Stepped interlocking Z-ledgers, staggered rockface planks & deep cleft split-face stone",
    },
    {
        "name": "Chevron, Herringbone & Diagonal Fluted Parquet",
        "short": "CHEVRON & DIAGONAL PARQUET",
        "desc": "4-quadrant diamond chevrons, diagonal grooved fluting & interlocking parquet tiles",
    },
    {
        "name": "Modular Ashlar, Mondrian Grid & Beveled Blocks",
        "short": "MODULAR ASHLAR & BEVELED BLOCKS",
        "desc": "Multi-size ashlar blocks, chamfered grid joints, chiseled pillow borders & pinwheels",
    },
    {
        "name": "Fluid Waves, Dune Ripples & Kinetic Scoops",
        "short": "FLUID WAVES & KINETIC RIPPLES",
        "desc": "Continuous CNC water-wave ripples, flowing river dunes & kinetic concave scoops",
    },
    {
        "name": "Circular Motifs, Sunburst Chakras & Pebble Mosaics",
        "short": "CIRCULAR MOTIFS & PEBBLE MOSAICS",
        "desc": "Circular sunburst chakras, floral medallions, spiral vortexes & coin pebble sheets",
    },
    {
        "name": "Architectural Relief Murals, Royal Jharokha & Carved Flora",
        "short": "ARCHITECTURAL MURALS & CARVED FLORA",
        "desc": "Traditional haveli jharokha arches, carved lotus/rose blooms, kalpavriksha & sacred murals",
    },
]

def get_chapter(item):
    pid = item['id']
    name = item['name'].lower()

    # 1. Chevron, Herringbone & Diagonal Parquet
    if pid in ['ST-WC-262', 'ST-WC-263', 'ST-WC-264', 'ST-WC-265', 'ST-WC-243', 'ST-WC-164', 'ST-WC-195', 'ST-WC-049', 'ST-WC-046']:
        return "Chevron, Herringbone & Diagonal Fluted Parquet"
    if any(k in name for k in ['chevron', 'parquet', 'herringbone', 'diagonal combed', 'diagonal micro-fluted']):
        return "Chevron, Herringbone & Diagonal Fluted Parquet"

    # 2. 3D Pyramid & Faceted Origami Relief
    if pid in ['ST-WC-001', 'ST-WC-002', 'ST-WC-003', 'ST-WC-004', 'ST-WC-005', 'ST-WC-006', 'ST-WC-011', 'ST-WC-012', 
               'ST-WC-013', 'ST-WC-069', 'ST-WC-075', 'ST-WC-076', 'ST-WC-137', 'ST-WC-157', 'ST-WC-172', 'ST-WC-196',
               'ST-WC-249', 'ST-WC-256', 'ST-WC-266', 'ST-WC-267', 'ST-WC-275', 'ST-WC-281', 'ST-WC-282']:
        return "3D Pyramid & Faceted Origami Relief"
    if any(k in name for k in ['origami', 'pyramid', 'faceted', 'isometric', 'prism', 'starburst', 'pitched mosaic', 'four-point faceted']):
        return "3D Pyramid & Faceted Origami Relief"

    # 3. Circular Motifs, Sunburst Chakras & Pebble Mosaics
    if pid in ['ST-WC-007', 'ST-WC-008', 'ST-WC-014', 'ST-WC-066', 'ST-WC-067', 'ST-WC-068', 'ST-WC-071', 'ST-WC-120',
               'ST-WC-132', 'ST-WC-203', 'ST-WC-204', 'ST-WC-209', 'ST-WC-210', 'ST-WC-219', 'ST-WC-222', 'ST-WC-232',
               'ST-WC-233', 'ST-WC-237', 'ST-WC-245', 'ST-WC-251', 'ST-WC-253', 'ST-WC-271']:
        return "Circular Motifs, Sunburst Chakras & Pebble Mosaics"
    if any(k in name for k in ['sunburst', 'chakra', 'rosette', 'spiral', 'vortex', 'pebble', 'circular', 'radial fan', 'quatrefoil', 'kolam rangoli', 'quarter-circle', 'quarter circle']):
        return "Circular Motifs, Sunburst Chakras & Pebble Mosaics"

    # 4. Fluid Waves, Dune Ripples & Kinetic Scoops
    if pid in ['ST-WC-145', 'ST-WC-152', 'ST-WC-173', 'ST-WC-179', 'ST-WC-182', 'ST-WC-201', 'ST-WC-215', 'ST-WC-220',
               'ST-WC-234', 'ST-WC-235', 'ST-WC-241', 'ST-WC-255', 'ST-WC-260']:
        return "Fluid Waves, Dune Ripples & Kinetic Scoops"
    if any(k in name for k in ['river wave', 'water-wave', 'concave scoop', 'kinetic fluted', 'ripple', 'fluted reed', 'reeded', 'sawn ripple']):
        return "Fluid Waves, Dune Ripples & Kinetic Scoops"

    # 5. Architectural Relief Murals, Royal Jharokha & Carved Flora
    if pid in ['ST-WC-023', 'ST-WC-030', 'ST-WC-031', 'ST-WC-033', 'ST-WC-035', 'ST-WC-036', 'ST-WC-037', 'ST-WC-038',
               'ST-WC-054', 'ST-WC-059', 'ST-WC-133', 'ST-WC-134', 'ST-WC-148', 'ST-WC-151', 'ST-WC-183', 'ST-WC-188',
               'ST-WC-190', 'ST-WC-193', 'ST-WC-194', 'ST-WC-202', 'ST-WC-205', 'ST-WC-206', 'ST-WC-207', 'ST-WC-208',
               'ST-WC-218', 'ST-WC-221', 'ST-WC-223', 'ST-WC-224', 'ST-WC-225', 'ST-WC-226', 'ST-WC-227', 'ST-WC-231',
               'ST-WC-236', 'ST-WC-240', 'ST-WC-242', 'ST-WC-244', 'ST-WC-246', 'ST-WC-247', 'ST-WC-248', 'ST-WC-250',
               'ST-WC-252', 'ST-WC-254', 'ST-WC-257', 'ST-WC-259', 'ST-WC-261']:
        return "Architectural Relief Murals, Royal Jharokha & Carved Flora"
    if any(k in name for k in ['mural', 'jharokha', 'buddha', 'lotus', 'rose bloom', 'rose blossom', 'monstera', 'kalpavriksha', 'acanthus', 'palmette', 'tulip', 'hieroglyph', 'haveli', 'shankh', 'arabesque', 'pisces', 'nautilus', 'butterfly', 'palm leaf', 'fern', 'tree of life']):
        return "Architectural Relief Murals, Royal Jharokha & Carved Flora"

    # 6. Crazy China, Slender Needle Strips & Natural Flagstone
    if pid in ['ST-WC-053', 'ST-WC-081', 'ST-WC-103', 'ST-WC-104', 'ST-WC-105', 'ST-WC-106', 'ST-WC-107', 'ST-WC-108',
               'ST-WC-109', 'ST-WC-121', 'ST-WC-122', 'ST-WC-123', 'ST-WC-125', 'ST-WC-127', 'ST-WC-131', 'ST-WC-135',
               'ST-WC-136', 'ST-WC-142', 'ST-WC-143', 'ST-WC-150', 'ST-WC-158', 'ST-WC-161', 'ST-WC-162', 'ST-WC-163',
               'ST-WC-238', 'ST-WC-258', 'ST-WC-272', 'ST-WC-274', 'ST-WC-277', 'ST-WC-280']:
        return "Crazy China, Slender Needle Strips & Natural Flagstone"
    if any(k in name for k in ['crazy', 'needle', 'micro-linear', 'polygonal', 'flagstone', 'fieldstone', 'slim strip', 'slim ledger', 'slim linear', 'timber rustic']):
        return "Crazy China, Slender Needle Strips & Natural Flagstone"

    # 7. Staggered Multi-Level Plank & Strip Ledgestone
    if pid in ['ST-WC-055', 'ST-WC-078', 'ST-WC-141', 'ST-WC-144', 'ST-WC-146', 'ST-WC-153', 'ST-WC-154', 'ST-WC-155',
               'ST-WC-156', 'ST-WC-159', 'ST-WC-160', 'ST-WC-169', 'ST-WC-177', 'ST-WC-181', 'ST-WC-268', 'ST-WC-273', 'ST-WC-284']:
        return "Staggered Multi-Level Plank & Strip Ledgestone"
    if any(k in name for k in ['staggered', 'plank', 'split-face ledger', 'splitface ledger', 'cleft ledger', 'stacked ledger', 'rockface plank', 'splitface brick']):
        return "Staggered Multi-Level Plank & Strip Ledgestone"

    # 8. Modular Ashlar, Mondrian Grid & Beveled Blocks
    return "Modular Ashlar, Mondrian Grid & Beveled Blocks"


def get_fonts():
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/Arial.ttf",
        "/System/Library/Fonts/SFPro.ttf",
    ]
    bold_candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/Library/Fonts/Arial Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    serif_candidates = [
        "/System/Library/Fonts/Supplemental/Georgia.ttf",
        "/Library/Fonts/Georgia.ttf",
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
        "title": load(serif_path, 42),
        "subtitle": load(regular_path, 20),
        "heading": load(bold_path, 26),
        "subheading": load(bold_path, 18),
        "card_title": load(bold_path, 17),
        "card_code": load(bold_path, 15),
        "card_text": load(regular_path, 12),
        "card_bold": load(bold_path, 13),
        "badge": load(bold_path, 11),
        "footer": load(regular_path, 11),
        "chapter_num": load(bold_path, 13),
    }


def load_brand_assets():
    logo_path = "public/branding/stone-tech-logo-transparent.png"
    if not os.path.exists(logo_path):
        logo_path = "public/branding/stone-tech-logo.png"

    logo = Image.open(logo_path)
    if logo.mode != "RGBA":
        logo = logo.convert("RGBA")

    bbox = logo.getbbox()
    logo_cropped = logo.crop(bbox) if bbox else logo

    icon_h = 32
    scale = icon_h / logo_cropped.height
    icon_w = max(1, int(logo_cropped.width * scale))
    header_icon = logo_cropped.resize((icon_w, icon_h), Image.Resampling.LANCZOS)
    return logo_cropped, header_icon


def draw_header_footer(draw, fonts, page_num, total_pages, category_name="", header_icon=None, img_canvas=None):
    draw.line([(50, 48), (PAGE_WIDTH - 50, 48)], fill=(226, 232, 240), width=1)
    text_x = 50
    if header_icon and img_canvas:
        img_canvas.paste(header_icon, (50, 10), header_icon if header_icon.mode == "RGBA" else None)
        text_x = 50 + header_icon.width + 12

    draw.text((text_x, 24), "STONE TECH ATELIER", fill=(15, 23, 42), font=fonts["card_bold"])
    draw.text(
        (text_x + 165, 24),
        "·  WALL CLADDING OPTIONS 2026-27",
        fill=(100, 116, 139),
        font=fonts["footer"],
    )

    if category_name:
        badge_text = category_name.upper()
        bbox = draw.textbbox((0, 0), badge_text, font=fonts["badge"])
        tw = bbox[2] - bbox[0]
        bx = PAGE_WIDTH - 50 - tw - 16
        by = 16
        bw = tw + 16
        bh = 24
        draw.rounded_rectangle([(bx, by), (bx + bw, by + bh)], radius=4, fill=(241, 245, 249), outline=(203, 213, 225), width=1)
        draw.text((bx + 8, by + 5), badge_text, fill=(14, 116, 144), font=fonts["badge"])

    draw.line([(50, PAGE_HEIGHT - 48), (PAGE_WIDTH - 50, PAGE_HEIGHT - 48)], fill=(226, 232, 240), width=1)
    draw.text(
        (50, PAGE_HEIGHT - 36),
        "Experience Center: E-02, SG Business Hub, Gota, Ahmedabad · WhatsApp: +91 77420 90866 / +91 97844 52998 · www.stonetech.in",
        fill=(71, 85, 105),
        font=fonts["footer"],
    )
    page_str = f"Page {page_num} of {total_pages}"
    bbox = draw.textbbox((0, 0), page_str, font=fonts["footer"])
    tw = bbox[2] - bbox[0]
    draw.text((PAGE_WIDTH - 50 - tw, PAGE_HEIGHT - 36), page_str, fill=(100, 116, 139), font=fonts["footer"])


def create_cover_page(fonts, logo_img, chapter_counts, total_patterns=284):
    img = Image.new("RGB", (PAGE_WIDTH, PAGE_HEIGHT), color=(15, 23, 42))
    draw = ImageDraw.Draw(img)

    # Gold borders
    draw.rectangle([(35, 35), (PAGE_WIDTH - 35, PAGE_HEIGHT - 35)], outline=(217, 119, 6), width=2)
    draw.rectangle([(42, 42), (PAGE_WIDTH - 42, PAGE_HEIGHT - 42)], outline=(245, 158, 11), width=1)

    # Corner accents
    for x, y, dx, dy in [
        (55, 55, 1, 1),
        (PAGE_WIDTH - 55, 55, -1, 1),
        (55, PAGE_HEIGHT - 55, 1, -1),
        (PAGE_WIDTH - 55, PAGE_HEIGHT - 55, -1, -1),
    ]:
        draw.line([(x, y), (x + 30 * dx, y)], fill=(251, 191, 36), width=2)
        draw.line([(x, y), (x, y + 30 * dy)], fill=(251, 191, 36), width=2)

    # Logo Medallion
    card_w, card_h = 180, 160
    card_x = (PAGE_WIDTH - card_w) // 2
    card_y = 75
    draw.rounded_rectangle([(card_x, card_y), (card_x + card_w, card_y + card_h)], radius=20, fill=(255, 255, 255), outline=(217, 119, 6), width=2)
    logo_thumb = logo_img.copy()
    logo_thumb.thumbnail((card_w - 28, card_h - 28), Image.Resampling.LANCZOS)
    img.paste(logo_thumb, (card_x + (card_w - logo_thumb.width) // 2, card_y + (card_h - logo_thumb.height) // 2), logo_thumb if logo_thumb.mode == "RGBA" else None)

    # Brand Title
    draw.text((PAGE_WIDTH // 2, 275), "STONE TECH ATELIER", fill=(245, 158, 11), font=fonts["heading"], anchor="mm")
    draw.text((PAGE_WIDTH // 2, 310), "ARCHITECTURAL STONE FABRICATORS · AHMEDABAD", fill=(148, 163, 184), font=fonts["card_title"], anchor="mm")

    draw.line([(PAGE_WIDTH // 2 - 200, 340), (PAGE_WIDTH // 2 + 200, 340)], fill=(217, 119, 6), width=2)

    # Main Catalog Title
    draw.text((PAGE_WIDTH // 2, 400), "NATURAL STONE WALL CLADDING", fill=(255, 255, 255), font=fonts["title"], anchor="mm")
    draw.text((PAGE_WIDTH // 2, 455), "OPTIONS 2026-27", fill=(251, 191, 36), font=fonts["title"], anchor="mm")
    draw.text((PAGE_WIDTH // 2, 510), "CATEGORIZED BY ARCHITECTURAL PATTERN & STONE PLACEMENT", fill=(103, 232, 249), font=fonts["subheading"], anchor="mm")
    draw.text((PAGE_WIDTH // 2, 545), f"COMPREHENSIVE COLLECTION OF {total_patterns} PRECISION FABRICATED PATTERNS", fill=(148, 163, 184), font=fonts["card_bold"], anchor="mm")

    # Table of Architectural Chapters
    box_top = 585
    box_w = PAGE_WIDTH - 160
    box_h = 560
    draw.rectangle([(80, box_top), (80 + box_w, box_top + box_h)], fill=(30, 41, 59), outline=(51, 65, 85), width=2)
    draw.text((PAGE_WIDTH // 2, box_top + 35), "ARCHITECTURAL CHAPTERS & STONE PLACEMENTS", fill=(251, 191, 36), font=fonts["subheading"], anchor="mm")
    draw.line([(PAGE_WIDTH // 2 - 180, box_top + 58), (PAGE_WIDTH // 2 + 180, box_top + 58)], fill=(217, 119, 6), width=1)

    y_cur = box_top + 80
    for idx, ch in enumerate(CHAPTER_CONFIG):
        count = chapter_counts.get(ch["name"], 0)
        ch_num = f"0{idx+1}"
        draw.text((110, y_cur), f"CHAPTER {ch_num}:", fill=(251, 191, 36), font=fonts["card_bold"])
        draw.text((230, y_cur), ch["name"], fill=(241, 245, 249), font=fonts["card_bold"])
        count_str = f"({count} Patterns)"
        draw.text((80 + box_w - 30, y_cur), count_str, fill=(103, 232, 249), font=fonts["card_bold"], anchor="ra")
        draw.text((230, y_cur + 22), ch["desc"], fill=(148, 163, 184), font=fonts["card_text"])
        y_cur += 56

    # Experience Center Box
    draw.line([(80, 1190), (PAGE_WIDTH - 80, 1190)], fill=(217, 119, 6), width=2)
    draw.text((PAGE_WIDTH // 2, 1230), "STONE TECH EXPERIENCE CENTER · AHMEDABAD", fill=(251, 191, 36), font=fonts["heading"], anchor="mm")
    draw.text((PAGE_WIDTH // 2, 1280), "E-02, Ground Floor, SG Business Hub, Vasant Nagar, Gota, Ahmedabad, Gujarat 380060", fill=(255, 255, 255), font=fonts["card_title"], anchor="mm")
    draw.text((PAGE_WIDTH // 2, 1330), "Direct WhatsApp Lines: +91 77420 90866 / +91 97844 52998", fill=(103, 232, 249), font=fonts["subheading"], anchor="mm")
    draw.text((PAGE_WIDTH // 2, 1375), "Email: info@stonetech.in   ·   Web: www.stonetech.in", fill=(203, 213, 225), font=fonts["card_title"], anchor="mm")
    draw.text((PAGE_WIDTH // 2, 1435), "Softcopy Edition · StoneTech_NaturalStone_WallCl_Options_26-27.pdf", fill=(100, 116, 139), font=fonts["badge"], anchor="mm")

    return img


def render_pattern_card(draw, fonts, item, img_canvas, x, y, card_w, card_h):
    draw.rounded_rectangle([(x, y), (x + card_w, y + card_h)], radius=14, fill=(255, 255, 255), outline=(226, 232, 240), width=1)
    box_x = x + 12
    box_y = y + 12
    box_w = card_w - 24
    box_h = card_h - 85

    draw.rounded_rectangle([(box_x, box_y), (box_x + box_w, box_y + box_h)], radius=10, fill=(248, 250, 252), outline=(241, 245, 249), width=1)

    photo_path = "public" + item["image"]
    if os.path.exists(photo_path):
        try:
            with Image.open(photo_path) as pimg:
                if pimg.mode != "RGB":
                    pimg = pimg.convert("RGB")

                rotation = item.get("rotation", 0) % 360
                if rotation == 90:
                    pimg = pimg.transpose(Image.Transpose.ROTATE_270)
                elif rotation == 180:
                    pimg = pimg.transpose(Image.Transpose.ROTATE_180)
                elif rotation == 270:
                    pimg = pimg.transpose(Image.Transpose.ROTATE_90)

                img_w, img_h = pimg.size
                scale = min(box_w / img_w, box_h / img_h)
                new_w = max(1, int(img_w * scale))
                new_h = max(1, int(img_h * scale))

                thumb = pimg.resize((new_w, new_h), Image.Resampling.LANCZOS)
                paste_x = box_x + (box_w - new_w) // 2
                paste_y = box_y + (box_h - new_h) // 2
                img_canvas.paste(thumb, (paste_x, paste_y))
        except Exception:
            draw.text((box_x + 20, box_y + 100), f"Image: {item['id']}", fill=(100, 116, 139), font=fonts["card_text"])
    else:
        draw.text((box_x + 20, box_y + 100), f"Image: {item['id']}", fill=(100, 116, 139), font=fonts["card_text"])

    # Prominent Pattern Code Tag
    code_text = item.get("code") or item["id"]
    bbox = draw.textbbox((0, 0), code_text, font=fonts["card_code"])
    tag_w = (bbox[2] - bbox[0]) + 24
    draw.rounded_rectangle([(box_x + 12, box_y + 12), (box_x + 12 + tag_w, box_y + 42)], radius=6, fill=(15, 23, 42))
    draw.text((box_x + 24, box_y + 19), code_text, fill=(103, 232, 249), font=fonts["card_code"])

    # Footer Strip
    footer_line_y = y + card_h - 64
    draw.line([(x + 14, footer_line_y), (x + card_w - 14, footer_line_y)], fill=(241, 245, 249), width=1)
    text_y = y + card_h - 44
    draw.text((x + 18, text_y), f"CODE: {code_text}", fill=(15, 23, 42), font=fonts["card_title"])
    draw.text((x + card_w - 18, text_y + 2), "Inquire: +91 77420 90866", fill=(16, 185, 129), font=fonts["card_bold"], anchor="ra")


def create_back_cover_page(fonts, logo_img):
    img = Image.new("RGB", (PAGE_WIDTH, PAGE_HEIGHT), color=(15, 23, 42))
    draw = ImageDraw.Draw(img)

    draw.rectangle([(35, 35), (PAGE_WIDTH - 35, PAGE_HEIGHT - 35)], outline=(217, 119, 6), width=2)
    draw.rectangle([(42, 42), (PAGE_WIDTH - 42, PAGE_HEIGHT - 42)], outline=(245, 158, 11), width=1)

    card_w, card_h = 180, 160
    card_x = (PAGE_WIDTH - card_w) // 2
    card_y = 80
    draw.rounded_rectangle([(card_x, card_y), (card_x + card_w, card_y + card_h)], radius=20, fill=(255, 255, 255), outline=(217, 119, 6), width=2)
    logo_thumb = logo_img.copy()
    logo_thumb.thumbnail((card_w - 28, card_h - 28), Image.Resampling.LANCZOS)
    img.paste(logo_thumb, (card_x + (card_w - logo_thumb.width) // 2, card_y + (card_h - logo_thumb.height) // 2), logo_thumb if logo_thumb.mode == "RGBA" else None)

    draw.text((PAGE_WIDTH // 2, 280), "STONE TECH ATELIER", fill=(245, 158, 11), font=fonts["heading"], anchor="mm")
    draw.text((PAGE_WIDTH // 2, 320), "ARCHITECTURAL STONE CLADDING & BESPOKE FABRICATION", fill=(148, 163, 184), font=fonts["subheading"], anchor="mm")
    draw.line([(PAGE_WIDTH // 2 - 180, 350), (PAGE_WIDTH // 2 + 180, 350)], fill=(217, 119, 6), width=2)

    box_w = PAGE_WIDTH - 160
    draw.rectangle([(80, 380), (80 + box_w, 690)], fill=(30, 41, 59), outline=(51, 65, 85), width=2)
    draw.text((110, 410), "HOW TO PLACE AN ORDER / SAMPLE REQUEST", fill=(251, 191, 36), font=fonts["subheading"])

    steps = [
        "1. Note Product Code: Simply share the ST-WC-XXX code shown on any catalog page.",
        "2. Send Elevation Details: Forward required elevation area (sq.ft), CAD, or site photos.",
        "3. Dry-Lay Approval: Full pre-dispatch dry-lay mockup photos shared prior to crating.",
        "4. Logistics & Delivery: Direct insured transport to site across India or seaworthy container crating for export.",
    ]
    for idx, s in enumerate(steps):
        draw.text((110, 465 + idx * 52), s, fill=(241, 245, 249), font=fonts["card_title"])

    draw.rectangle([(80, 720), (80 + box_w, 1030)], fill=(30, 41, 59), outline=(51, 65, 85), width=2)
    draw.text((110, 750), "EXPORT PACKAGING & QUALITY ASSURANCE", fill=(251, 191, 36), font=fonts["subheading"])

    pack_info = [
        "· Fumigated Wooden Crates: ISPM-15 heat-treated solid pine / hardwood export crates.",
        "· Shock Absorption: Polyethylene foam interleaving between carved stone faces.",
        "· Edge Protection: Heavy-duty plastic corner guards and reinforced steel banding.",
        "· Moisture Defense: VCI waterproof barrier and shrink-wrapped pallet cover.",
        "· Calibration: Thickness calibrated within +/- 1.5mm; squareness verified with precision calipers.",
    ]
    for idx, p in enumerate(pack_info):
        draw.text((110, 805 + idx * 42), p, fill=(226, 232, 240), font=fonts["card_text"])

    draw.rectangle([(80, 1060), (80 + box_w, 1500)], fill=(15, 23, 42), outline=(217, 119, 6), width=2)
    draw.text((PAGE_WIDTH // 2, 1115), "VISIT OUR EXPERIENCE CENTER & STUDIO", fill=(251, 191, 36), font=fonts["heading"], anchor="mm")
    draw.text((PAGE_WIDTH // 2, 1175), "STONE TECH EXPERIENCE CENTER", fill=(255, 255, 255), font=fonts["heading"], anchor="mm")
    draw.text((PAGE_WIDTH // 2, 1225), "E-02, Ground Floor, SG Business Hub, Vasant Nagar, Gota, Ahmedabad, Gujarat 380060", fill=(203, 213, 225), font=fonts["card_title"], anchor="mm")
    draw.text((PAGE_WIDTH // 2, 1285), "WhatsApp Direct Lines: +91 77420 90866 / +91 97844 52998", fill=(103, 232, 249), font=fonts["subheading"], anchor="mm")
    draw.text((PAGE_WIDTH // 2, 1335), "Direct Email: info@stonetech.in   ·   Website: www.stonetech.in", fill=(203, 213, 225), font=fonts["card_title"], anchor="mm")
    draw.text((PAGE_WIDTH // 2, 1385), "Studio Hours: Monday – Saturday, 10:00 AM – 7:30 PM", fill=(148, 163, 184), font=fonts["card_text"], anchor="mm")
    draw.text((PAGE_WIDTH // 2, 1425), "Port of Export Dispatch: Mundra Port / JNPT, India", fill=(148, 163, 184), font=fonts["card_text"], anchor="mm")
    draw.text((PAGE_WIDTH // 2, 1540), "© 2026 Stone Tech OS / Stone Tech Atelier. All Rights Reserved.", fill=(100, 116, 139), font=fonts["badge"], anchor="mm")

    return img


def main():
    print("Step 1: Reading src/data/wall-cladding-catalog.json...")
    with open("src/data/wall-cladding-catalog.json", "r") as f:
        items = json.load(f)

    print(f"Loaded {len(items)} patterns.")

    # Group patterns by chapter
    by_chapter = {cfg["name"]: [] for cfg in CHAPTER_CONFIG}
    for item in items:
        ch = get_chapter(item)
        by_chapter[ch].append(item)

    # Sort items within each chapter for visual harmony
    sorted_items = []
    chapter_counts = {}
    for cfg in CHAPTER_CONFIG:
        ch_name = cfg["name"]
        ch_items = by_chapter[ch_name]
        chapter_counts[ch_name] = len(ch_items)
        sorted_items.extend(ch_items)
        print(f"  · {ch_name}: {len(ch_items)} patterns")

    # Renumber sequentially 1..284
    reordered_catalog = []
    new_order_ids = []
    for idx, item in enumerate(sorted_items):
        seq_idx = idx + 1
        item_copy = dict(item)
        item_copy["index"] = seq_idx
        # Keep patternCategory
        ch_name = get_chapter(item)
        item_copy["patternCategory"] = ch_name
        reordered_catalog.append(item_copy)
        new_order_ids.append(item["id"])

    # Save reordered JSON
    print("Step 2: Updating src/data/wall-cladding-catalog.json with intelligent chapter grouping...")
    with open("src/data/wall-cladding-catalog.json", "w") as f:
        json.dump(reordered_catalog, f, indent=2)

    # Update src/lib/site-settings/types.ts DEFAULT_WEBSITE_CATALOG_ORDER
    print("Step 3: Updating DEFAULT_WEBSITE_CATALOG_ORDER in src/lib/site-settings/types.ts...")
    types_path = "src/lib/site-settings/types.ts"
    with open(types_path, "r") as f:
        types_content = f.read()

    order_json = "export const DEFAULT_WEBSITE_CATALOG_ORDER: string[] = [\n"
    for pid in new_order_ids:
        order_json += f'  "{pid}",\n'
    order_json += "];"

    pattern = r"export const DEFAULT_WEBSITE_CATALOG_ORDER: string\[\] = \[[\s\S]*?\];"
    new_types_content = re.sub(pattern, order_json, types_content)
    with open(types_path, "w") as f:
        f.write(new_types_content)

    # Compile the PDF
    print("Step 4: Compiling StoneTech_NaturalStone_WallCl_Options_26-27.pdf...")
    fonts = get_fonts()
    logo_img, header_icon = load_brand_assets()

    card_w = 545
    card_h = 790
    x_positions = [55, 640]
    y_positions = [65, 885]

    # Calculate total pages: Cover + Chapter pages + Back Cover
    total_catalog_pages = 0
    chapter_page_chunks = []
    for cfg in CHAPTER_CONFIG:
        ch_name = cfg["name"]
        ch_short = cfg["short"]
        ch_items = by_chapter[ch_name]
        chunks = [ch_items[i : i + 4] for i in range(0, len(ch_items), 4)]
        chapter_page_chunks.append((ch_name, ch_short, chunks))
        total_catalog_pages += len(chunks)

    total_pages = 1 + total_catalog_pages + 1
    print(f"Total pages: {total_pages} (1 Cover + {total_catalog_pages} Catalog + 1 Back Cover)")

    pages = []
    # Cover Page
    print("Rendering Cover Page...")
    pages.append(create_cover_page(fonts, logo_img, chapter_counts, len(items)))

    # Catalog Pages
    current_page_num = 2
    for ch_name, ch_short, chunks in chapter_page_chunks:
        for chunk in chunks:
            p_img = Image.new("RGB", (PAGE_WIDTH, PAGE_HEIGHT), color=(255, 255, 255))
            p_draw = ImageDraw.Draw(p_img)
            draw_header_footer(p_draw, fonts, current_page_num, total_pages, ch_short, header_icon, p_img)

            for i, item in enumerate(chunk):
                gx = x_positions[i % 2]
                gy = y_positions[i // 2]
                render_pattern_card(p_draw, fonts, item, p_img, gx, gy, card_w, card_h)

            pages.append(p_img)
            current_page_num += 1

    # Back Cover Page
    print("Rendering Back Cover Page...")
    pages.append(create_back_cover_page(fonts, logo_img))

    output_dir = "public/catalogues"
    os.makedirs(output_dir, exist_ok=True)
    pdf_path_new = os.path.join(output_dir, "StoneTech_NaturalStone_WallCl_Options_26-27.pdf")
    pdf_path_legacy = os.path.join(output_dir, "stos-wall-cladding-catalogue-2026.pdf")

    print(f"Saving {len(pages)} pages to {pdf_path_new}...")
    pages[0].save(
        pdf_path_new,
        save_all=True,
        append_images=pages[1:],
        quality=78,
        subsampling=1,
        optimize=True,
    )
    size_mb = os.path.getsize(pdf_path_new) / (1024 * 1024)
    print(f"SUCCESS: Generated {pdf_path_new} ({size_mb:.2f} MB, {len(pages)} pages)")

    # Mirror to legacy path for backward compatibility
    import shutil
    shutil.copyfile(pdf_path_new, pdf_path_legacy)
    print(f"Mirrored copy to {pdf_path_legacy}")

if __name__ == "__main__":
    main()

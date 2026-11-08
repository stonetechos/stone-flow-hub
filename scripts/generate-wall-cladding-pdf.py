#!/usr/bin/env python3
"""
scripts/generate-wall-cladding-pdf.py

Syncs product order and rotations directly from the live CMS (Supabase / site-settings),
updates local catalog JSON & default catalog order, and compiles the high-end luxury
architectural catalog PDF:
  - public/catalogues/StoneTech_NaturalStone_WallCl_Options_26-27.pdf
  - public/catalogues/stos-wall-cladding-catalogue-2026.pdf

Features:
  - Strict CMS Order & Dynamic Sequential Codes: Starts with ST-WC-001, ST-WC-002, ..., ST-WC-284.
  - Live Rotations: Automatically applies custom 90°/180°/270° rotations configured in CMS.
  - Luxury Atelier Typography: Optima & Avenir Next with elegant hierarchy.
  - Balanced Card Frame: Maximizes photo display area (~80% of card) without awkward gaps.
  - Luxury Product Metadata: Product title, stone geology, standard calibration, studio inquiries.
  - WhatsApp Safe: Optimized to stay strictly under 25 MiB.
"""

import json
import math
import os
import re
import urllib.request
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
    pid = item.get("id", "")
    name = (item.get("name") or "").lower()

    # 1. Chevron, Herringbone & Diagonal Parquet
    if pid in ["ST-WC-262", "ST-WC-263", "ST-WC-264", "ST-WC-265", "ST-WC-243", "ST-WC-164", "ST-WC-195", "ST-WC-049", "ST-WC-046", "ST-WC-070"]:
        return "Chevron, Herringbone & Diagonal Fluted Parquet"
    if any(k in name for k in ["chevron", "parquet", "herringbone", "diagonal combed", "diagonal micro-fluted"]):
        return "Chevron, Herringbone & Diagonal Fluted Parquet"

    # 2. 3D Pyramid & Faceted Origami Relief
    if pid in [
        "ST-WC-001", "ST-WC-002", "ST-WC-003", "ST-WC-004", "ST-WC-005", "ST-WC-006", "ST-WC-011", "ST-WC-012", 
        "ST-WC-013", "ST-WC-069", "ST-WC-075", "ST-WC-076", "ST-WC-137", "ST-WC-157", "ST-WC-172", "ST-WC-196",
        "ST-WC-249", "ST-WC-256", "ST-WC-266", "ST-WC-267", "ST-WC-275", "ST-WC-281", "ST-WC-282"
    ]:
        return "3D Pyramid & Faceted Origami Relief"
    if any(k in name for k in ["origami", "pyramid", "faceted", "isometric", "prism", "starburst", "pitched mosaic", "four-point faceted"]):
        return "3D Pyramid & Faceted Origami Relief"

    # 3. Circular Motifs, Sunburst Chakras & Pebble Mosaics
    if pid in [
        "ST-WC-007", "ST-WC-008", "ST-WC-014", "ST-WC-066", "ST-WC-067", "ST-WC-068", "ST-WC-071", "ST-WC-120",
        "ST-WC-132", "ST-WC-203", "ST-WC-204", "ST-WC-209", "ST-WC-210", "ST-WC-219", "ST-WC-222", "ST-WC-232",
        "ST-WC-233", "ST-WC-237", "ST-WC-245", "ST-WC-251", "ST-WC-253", "ST-WC-271"
    ]:
        return "Circular Motifs, Sunburst Chakras & Pebble Mosaics"
    if any(k in name for k in ["sunburst", "chakra", "rosette", "spiral", "vortex", "pebble", "circular", "radial fan", "quatrefoil", "kolam rangoli", "quarter-circle", "quarter circle"]):
        return "Circular Motifs, Sunburst Chakras & Pebble Mosaics"

    # 4. Fluid Waves, Dune Ripples & Kinetic Scoops
    if pid in [
        "ST-WC-145", "ST-WC-152", "ST-WC-173", "ST-WC-179", "ST-WC-182", "ST-WC-201", "ST-WC-215", "ST-WC-220",
        "ST-WC-234", "ST-WC-235", "ST-WC-241", "ST-WC-255", "ST-WC-260"
    ]:
        return "Fluid Waves, Dune Ripples & Kinetic Scoops"
    if any(k in name for k in ["river wave", "water-wave", "concave scoop", "kinetic fluted", "ripple", "fluted reed", "reeded", "sawn ripple"]):
        return "Fluid Waves, Dune Ripples & Kinetic Scoops"

    # 5. Architectural Relief Murals, Royal Jharokha & Carved Flora
    if pid in [
        "ST-WC-023", "ST-WC-030", "ST-WC-031", "ST-WC-033", "ST-WC-035", "ST-WC-036", "ST-WC-037", "ST-WC-038",
        "ST-WC-054", "ST-WC-059", "ST-WC-133", "ST-WC-134", "ST-WC-148", "ST-WC-151", "ST-WC-183", "ST-WC-188",
        "ST-WC-190", "ST-WC-193", "ST-WC-194", "ST-WC-202", "ST-WC-205", "ST-WC-206", "ST-WC-207", "ST-WC-208",
        "ST-WC-218", "ST-WC-221", "ST-WC-223", "ST-WC-224", "ST-WC-225", "ST-WC-226", "ST-WC-227", "ST-WC-231",
        "ST-WC-236", "ST-WC-240", "ST-WC-242", "ST-WC-244", "ST-WC-246", "ST-WC-247", "ST-WC-248", "ST-WC-250",
        "ST-WC-252", "ST-WC-254", "ST-WC-257", "ST-WC-259", "ST-WC-261"
    ]:
        return "Architectural Relief Murals, Royal Jharokha & Carved Flora"
    if any(k in name for k in ["mural", "jharokha", "buddha", "lotus", "rose bloom", "rose blossom", "monstera", "kalpavriksha", "acanthus", "palmette", "tulip", "hieroglyph", "haveli", "shankh", "arabesque", "pisces", "nautilus", "butterfly", "palm leaf", "fern", "tree of life"]):
        return "Architectural Relief Murals, Royal Jharokha & Carved Flora"

    # 6. Crazy China, Slender Needle Strips & Natural Flagstone
    if pid in [
        "ST-WC-053", "ST-WC-081", "ST-WC-103", "ST-WC-104", "ST-WC-105", "ST-WC-106", "ST-WC-107", "ST-WC-108",
        "ST-WC-109", "ST-WC-121", "ST-WC-122", "ST-WC-123", "ST-WC-125", "ST-WC-127", "ST-WC-131", "ST-WC-135",
        "ST-WC-136", "ST-WC-142", "ST-WC-143", "ST-WC-150", "ST-WC-158", "ST-WC-161", "ST-WC-162", "ST-WC-163",
        "ST-WC-238", "ST-WC-258", "ST-WC-272", "ST-WC-274", "ST-WC-277", "ST-WC-280"
    ]:
        return "Crazy China, Slender Needle Strips & Natural Flagstone"
    if any(k in name for k in ["crazy", "needle", "micro-linear", "polygonal", "flagstone", "fieldstone", "slim strip", "slim ledger", "slim linear", "timber rustic"]):
        return "Crazy China, Slender Needle Strips & Natural Flagstone"

    # 7. Staggered Multi-Level Plank & Strip Ledgestone
    if pid in [
        "ST-WC-055", "ST-WC-078", "ST-WC-141", "ST-WC-144", "ST-WC-146", "ST-WC-153", "ST-WC-154", "ST-WC-155",
        "ST-WC-156", "ST-WC-159", "ST-WC-160", "ST-WC-169", "ST-WC-177", "ST-WC-181", "ST-WC-268", "ST-WC-273", "ST-WC-284"
    ]:
        return "Staggered Multi-Level Plank & Strip Ledgestone"
    if any(k in name for k in ["staggered", "plank", "split-face ledger", "splitface ledger", "cleft ledger", "stacked ledger", "rockface plank", "splitface brick"]):
        return "Staggered Multi-Level Plank & Strip Ledgestone"

    # 8. Modular Ashlar, Mondrian Grid & Beveled Blocks
    return "Modular Ashlar, Mondrian Grid & Beveled Blocks"


def get_luxury_fonts():
    avenir_path = "/System/Library/Fonts/Avenir Next.ttc"
    optima_path = "/System/Library/Fonts/Optima.ttc"
    bask_path = "/System/Library/Fonts/Supplemental/Baskerville.ttc"
    helv_path = "/System/Library/Fonts/HelveticaNeue.ttc"
    arial_path = "/System/Library/Fonts/Supplemental/Arial.ttf"

    def load(path, size, index=0):
        if path and os.path.exists(path):
            try:
                return ImageFont.truetype(path, size, index=index)
            except Exception:
                pass
        # Fallbacks
        for alt in [avenir_path, optima_path, bask_path, helv_path, arial_path]:
            if alt and os.path.exists(alt):
                try:
                    return ImageFont.truetype(alt, size, index=0)
                except Exception:
                    pass
        return ImageFont.load_default()

    return {
        # Cover Page
        "cover_brand": load(optima_path, 36, index=1),
        "cover_subtitle": load(avenir_path, 15, index=2),
        "cover_title": load(optima_path, 46, index=1),
        "cover_title2": load(optima_path, 42, index=1),
        "cover_year": load(avenir_path, 26, index=0),
        "cover_tagline1": load(avenir_path, 18, index=2),
        "cover_tagline2": load(avenir_path, 14, index=5),
        "cover_pillar_num": load(avenir_path, 14, index=0),
        "cover_pillar_title": load(avenir_path, 14, index=0),
        "cover_pillar_desc": load(avenir_path, 12, index=7),
        "cover_exp_title": load(optima_path, 26, index=1),
        "cover_exp_addr": load(avenir_path, 14, index=5),
        "cover_exp_contact": load(avenir_path, 17, index=0),
        "cover_meta": load(avenir_path, 11, index=7),

        # Page Header & Footer
        "header_brand": load(avenir_path, 14, index=0),
        "header_sub": load(avenir_path, 12, index=5),
        "header_badge": load(avenir_path, 11, index=0),
        "footer_text": load(avenir_path, 11, index=5),
        "footer_page": load(avenir_path, 11, index=2),

        # Product Card
        "card_code": load(avenir_path, 13, index=0),
        "card_footer_label": load(avenir_path, 12, index=5),
        "card_footer_code": load(avenir_path, 16, index=0),
        "card_footer_phone": load(avenir_path, 14, index=0),

        # Back Cover
        "back_title": load(optima_path, 30, index=1),
        "back_sub": load(avenir_path, 16, index=2),
        "back_heading": load(avenir_path, 17, index=0),
        "back_body": load(avenir_path, 13, index=7),
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

    draw.text((text_x, 23), "STONE TECH ATELIER", fill=(15, 23, 42), font=fonts["header_brand"])
    draw.text(
        (text_x + 168, 24),
        "·  WALL CLADDING OPTIONS 2026-27",
        fill=(100, 116, 139),
        font=fonts["header_sub"],
    )

    if category_name:
        badge_text = category_name.upper()
        bbox = draw.textbbox((0, 0), badge_text, font=fonts["header_badge"])
        tw = bbox[2] - bbox[0]
        bx = PAGE_WIDTH - 50 - tw - 16
        by = 16
        bw = tw + 16
        bh = 24
        draw.rounded_rectangle([(bx, by), (bx + bw, by + bh)], radius=4, fill=(241, 245, 249), outline=(203, 213, 225), width=1)
        draw.text((bx + 8, by + 5), badge_text, fill=(14, 116, 144), font=fonts["header_badge"])

    draw.line([(50, PAGE_HEIGHT - 48), (PAGE_WIDTH - 50, PAGE_HEIGHT - 48)], fill=(226, 232, 240), width=1)
    draw.text(
        (50, PAGE_HEIGHT - 36),
        "Experience Center: E-02, SG Business Hub, Gota, Ahmedabad · WhatsApp: +91 77420 90866 / +91 97844 52998 · www.stonetech.in",
        fill=(71, 85, 105),
        font=fonts["footer_text"],
    )
    page_str = f"Page {page_num} of {total_pages}"
    bbox = draw.textbbox((0, 0), page_str, font=fonts["footer_page"])
    tw = bbox[2] - bbox[0]
    draw.text((PAGE_WIDTH - 50 - tw, PAGE_HEIGHT - 36), page_str, fill=(100, 116, 139), font=fonts["footer_page"])


def create_cover_page(fonts, logo_img, total_patterns=284):
    img = Image.new("RGB", (PAGE_WIDTH, PAGE_HEIGHT), color=(15, 23, 42))
    draw = ImageDraw.Draw(img)

    # Gold borders
    draw.rectangle([(35, 35), (PAGE_WIDTH - 35, PAGE_HEIGHT - 35)], outline=(217, 119, 6), width=2)
    draw.rectangle([(44, 44), (PAGE_WIDTH - 44, PAGE_HEIGHT - 44)], outline=(245, 158, 11), width=1)

    # Corner accents
    for x, y, dx, dy in [
        (55, 55, 1, 1),
        (PAGE_WIDTH - 55, 55, -1, 1),
        (55, PAGE_HEIGHT - 55, 1, -1),
        (PAGE_WIDTH - 55, PAGE_HEIGHT - 55, -1, -1),
    ]:
        draw.line([(x, y), (x + 35 * dx, y)], fill=(251, 191, 36), width=2)
        draw.line([(x, y), (x, y + 35 * dy)], fill=(251, 191, 36), width=2)

    # Logo Medallion
    card_w, card_h = 180, 160
    card_x = (PAGE_WIDTH - card_w) // 2
    card_y = 75
    draw.rounded_rectangle([(card_x, card_y), (card_x + card_w, card_y + card_h)], radius=20, fill=(255, 255, 255), outline=(217, 119, 6), width=2)
    logo_thumb = logo_img.copy()
    logo_thumb.thumbnail((card_w - 28, card_h - 28), Image.Resampling.LANCZOS)
    img.paste(logo_thumb, (card_x + (card_w - logo_thumb.width) // 2, card_y + (card_h - logo_thumb.height) // 2), logo_thumb if logo_thumb.mode == "RGBA" else None)

    # Brand Title
    draw.text((PAGE_WIDTH // 2, 275), "STONE TECH ATELIER", fill=(245, 158, 11), font=fonts["cover_brand"], anchor="mm")
    draw.text((PAGE_WIDTH // 2, 315), "ARCHITECTURAL STONE FABRICATORS & CRAFTSMEN", fill=(148, 163, 184), font=fonts["cover_subtitle"], anchor="mm")
    draw.line([(PAGE_WIDTH // 2 - 200, 345), (PAGE_WIDTH // 2 + 200, 345)], fill=(217, 119, 6), width=2)

    # Major Heading (as explicitly requested: "Natural Stone Wall Cladding Products Options")
    draw.text((PAGE_WIDTH // 2, 415), "NATURAL STONE WALL CLADDING", fill=(255, 255, 255), font=fonts["cover_title"], anchor="mm")
    draw.text((PAGE_WIDTH // 2, 470), "PRODUCTS OPTIONS", fill=(251, 191, 36), font=fonts["cover_title2"], anchor="mm")
    draw.text((PAGE_WIDTH // 2, 525), "2026 – 2027 COLLECTION", fill=(103, 232, 249), font=fonts["cover_year"], anchor="mm")

    # Luxury Taglines
    draw.text((PAGE_WIDTH // 2, 590), f"Curated Portfolio of {total_patterns} Precision-Fabricated Surfaces & 3D Architectural Textures", fill=(241, 245, 249), font=fonts["cover_tagline1"], anchor="mm")
    draw.text((PAGE_WIDTH // 2, 625), "Quarry-Direct Natural Sandstone, Marble, Slate, Granite & Basalt Claddings", fill=(148, 163, 184), font=fonts["cover_tagline2"], anchor="mm")

    # Fabrication & Quality Assurance Capabilities Box
    box_top = 670
    box_w = PAGE_WIDTH - 180
    box_h = 475
    box_x = 90
    draw.rectangle([(box_x, box_top), (box_x + box_w, box_top + box_h)], fill=(30, 41, 59), outline=(51, 65, 85), width=2)
    draw.text((PAGE_WIDTH // 2, box_top + 38), "ARCHITECTURAL EXCELLENCE & FABRICATION CAPABILITIES", fill=(251, 191, 36), font=fonts["cover_subtitle"], anchor="mm")
    draw.line([(PAGE_WIDTH // 2 - 180, box_top + 60), (PAGE_WIDTH // 2 + 180, box_top + 60)], fill=(217, 119, 6), width=1)

    pillars = [
        ("01", "PRECISION CNC & ARTISANAL CRAFTSMANSHIP", "Advanced multi-axis CNC surface profiling, diamond fluting, and traditional Rajasthani stone hand-chiseling."),
        ("02", "AUTHENTIC QUARRY-DIRECT GEOLOGY", "Direct sourcing from certified quarries across Rajasthan and Gujarat: Mint Sandstone, Teakwood, Agra Red, Dholpur, and Marbles."),
        ("03", "FULL PRE-DISPATCH DRY-LAY APPROVAL", "Every order undergoes a complete pre-dispatch dry-lay mockup with high-resolution photo and video approval prior to packing."),
        ("04", "HEAVY-DUTY SEAWORTHY EXPORT CRATING", "ISPM-15 heat-treated fumigated wooden crates with EPE foam interleaving and corner protectors for damage-free transit.")
    ]

    y_p = box_top + 95
    for num, p_title, p_desc in pillars:
        draw.text((box_x + 35, y_p), f"{num}.", fill=(251, 191, 36), font=fonts["cover_pillar_num"])
        draw.text((box_x + 75, y_p), p_title, fill=(241, 245, 249), font=fonts["cover_pillar_title"])
        draw.text((box_x + 75, y_p + 24), p_desc, fill=(148, 163, 184), font=fonts["cover_pillar_desc"])
        y_p += 85

    # Experience Center Box
    draw.line([(90, 1180), (PAGE_WIDTH - 90, 1180)], fill=(217, 119, 6), width=2)
    draw.text((PAGE_WIDTH // 2, 1225), "STONE TECH EXPERIENCE CENTER · AHMEDABAD", fill=(251, 191, 36), font=fonts["cover_exp_title"], anchor="mm")
    draw.text((PAGE_WIDTH // 2, 1275), "E-02, Ground Floor, SG Business Hub, Vasant Nagar, Gota, Ahmedabad, Gujarat 380060", fill=(255, 255, 255), font=fonts["cover_exp_addr"], anchor="mm")
    draw.text((PAGE_WIDTH // 2, 1323), "Direct WhatsApp Lines: +91 77420 90866 / +91 97844 52998", fill=(103, 232, 249), font=fonts["cover_exp_contact"], anchor="mm")
    draw.text((PAGE_WIDTH // 2, 1368), "Email: info@stonetech.in   ·   Website: www.stonetech.in", fill=(203, 213, 225), font=fonts["cover_exp_addr"], anchor="mm")
    draw.text((PAGE_WIDTH // 2, 1425), "Softcopy Edition · StoneTech_NaturalStone_WallCl_Options_26-27.pdf", fill=(100, 116, 139), font=fonts["cover_meta"], anchor="mm")

    return img


def render_pattern_card(draw, fonts, item, img_canvas, x, y, card_w, card_h):
    # Outer luxury card container
    draw.rounded_rectangle(
        [(x, y), (x + card_w, y + card_h)],
        radius=12,
        fill=(255, 255, 255),
        outline=(226, 232, 240),
        width=1,
    )

    box_x = x + 12
    box_y = y + 12
    box_w = card_w - 24  # 521 px
    box_h = card_h - 76  # 714 px, gives maximum prominence to stone artwork

    draw.rounded_rectangle(
        [(box_x, box_y), (box_x + box_w, box_y + box_h)],
        radius=8,
        fill=(248, 250, 252),
        outline=(241, 245, 249),
        width=1,
    )

    photo_path = "public" + item.get("image", "")
    if os.path.exists(photo_path):
        try:
            with Image.open(photo_path) as pimg:
                if pimg.mode != "RGB":
                    pimg = pimg.convert("RGB")

                # Apply exact CMS rotation (90°, 180°, 270°)
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
            pass

    # Top-Left Code Tag Capsule over photo
    code_text = item.get("code") or item.get("id", "ST-WC-001")
    bbox = draw.textbbox((0, 0), code_text, font=fonts["card_code"])
    tag_w = (bbox[2] - bbox[0]) + 20
    tag_h = 26
    draw.rounded_rectangle(
        [(box_x + 12, box_y + 12), (box_x + 12 + tag_w, box_y + 12 + tag_h)],
        radius=5,
        fill=(15, 23, 42),
    )
    draw.text((box_x + 22, box_y + 16), code_text, fill=(251, 191, 36), font=fonts["card_code"])

    # Bottom Footer Strip: Minimal luxury with only code and inquiry line
    footer_y = y + card_h - 52
    draw.line([(box_x, footer_y), (box_x + box_w, footer_y)], fill=(226, 232, 240), width=1)

    # Left: CODE: ST-WC-XXX
    draw.text((box_x + 4, footer_y + 15), "CODE:", fill=(100, 116, 139), font=fonts["card_footer_label"])
    c_bbox = draw.textbbox((0, 0), "CODE:", font=fonts["card_footer_label"])
    c_w = c_bbox[2] - c_bbox[0]
    draw.text((box_x + 4 + c_w + 8, footer_y + 13), code_text, fill=(15, 23, 42), font=fonts["card_footer_code"])

    # Right: Inquire: +91 77420 90866
    inq_phone = "+91 77420 90866"
    p_bbox = draw.textbbox((0, 0), inq_phone, font=fonts["card_footer_phone"])
    p_w = p_bbox[2] - p_bbox[0]
    i_bbox = draw.textbbox((0, 0), "Inquire: ", font=fonts["card_footer_label"])
    i_w = i_bbox[2] - i_bbox[0]

    right_x = box_x + box_w - p_w
    draw.text((right_x, footer_y + 14), inq_phone, fill=(13, 148, 136), font=fonts["card_footer_phone"])
    draw.text((right_x - i_w, footer_y + 15), "Inquire: ", fill=(100, 116, 139), font=fonts["card_footer_label"])


def create_back_cover_page(fonts, logo_img):
    img = Image.new("RGB", (PAGE_WIDTH, PAGE_HEIGHT), color=(15, 23, 42))
    draw = ImageDraw.Draw(img)

    # Borders
    draw.rectangle([(35, 35), (PAGE_WIDTH - 35, PAGE_HEIGHT - 35)], outline=(217, 119, 6), width=2)
    draw.rectangle([(42, 42), (PAGE_WIDTH - 42, PAGE_HEIGHT - 42)], outline=(245, 158, 11), width=1)

    card_w, card_h = 180, 160
    card_x = (PAGE_WIDTH - card_w) // 2
    card_y = 80
    draw.rounded_rectangle([(card_x, card_y), (card_x + card_w, card_y + card_h)], radius=20, fill=(255, 255, 255), outline=(217, 119, 6), width=2)
    logo_thumb = logo_img.copy()
    logo_thumb.thumbnail((card_w - 28, card_h - 28), Image.Resampling.LANCZOS)
    img.paste(logo_thumb, (card_x + (card_w - logo_thumb.width) // 2, card_y + (card_h - logo_thumb.height) // 2), logo_thumb if logo_thumb.mode == "RGBA" else None)

    draw.text((PAGE_WIDTH // 2, 280), "STONE TECH ATELIER", fill=(245, 158, 11), font=fonts["back_title"], anchor="mm")
    draw.text((PAGE_WIDTH // 2, 320), "ARCHITECTURAL STONE CLADDING & BESPOKE FABRICATION", fill=(148, 163, 184), font=fonts["back_sub"], anchor="mm")
    draw.line([(PAGE_WIDTH // 2 - 180, 350), (PAGE_WIDTH // 2 + 180, 350)], fill=(217, 119, 6), width=2)

    box_w = PAGE_WIDTH - 160
    draw.rectangle([(80, 380), (80 + box_w, 690)], fill=(30, 41, 59), outline=(51, 65, 85), width=2)
    draw.text((110, 410), "HOW TO PLACE AN ORDER / SAMPLE REQUEST", fill=(251, 191, 36), font=fonts["back_heading"])

    steps = [
        "1. Note Product Code: Simply share the ST-WC-XXX code shown on any catalog page.",
        "2. Send Elevation Details: Forward required elevation area (sq.ft), CAD, or site photos.",
        "3. Dry-Lay Approval: Full pre-dispatch dry-lay mockup photos shared prior to crating.",
        "4. Logistics & Delivery: Direct insured transport to site across India or seaworthy container crating for export.",
    ]
    for idx, s in enumerate(steps):
        draw.text((110, 465 + idx * 52), s, fill=(241, 245, 249), font=fonts["back_body"])

    draw.rectangle([(80, 720), (80 + box_w, 1030)], fill=(30, 41, 59), outline=(51, 65, 85), width=2)
    draw.text((110, 750), "EXPORT PACKAGING & QUALITY ASSURANCE", fill=(251, 191, 36), font=fonts["back_heading"])

    pack_info = [
        "· Fumigated Wooden Crates: ISPM-15 heat-treated solid pine / hardwood export crates.",
        "· Shock Absorption: Polyethylene foam interleaving between carved stone faces.",
        "· Edge Protection: Heavy-duty plastic corner guards and reinforced steel banding.",
        "· Moisture Defense: VCI waterproof barrier and shrink-wrapped pallet cover.",
        "· Calibration: Thickness calibrated within +/- 1.5mm; squareness verified with precision calipers.",
    ]
    for idx, p in enumerate(pack_info):
        draw.text((110, 805 + idx * 42), p, fill=(226, 232, 240), font=fonts["back_body"])

    draw.rectangle([(80, 1060), (80 + box_w, 1500)], fill=(15, 23, 42), outline=(217, 119, 6), width=2)
    draw.text((PAGE_WIDTH // 2, 1115), "VISIT OUR EXPERIENCE CENTER & STUDIO", fill=(251, 191, 36), font=fonts["back_heading"], anchor="mm")
    draw.text((PAGE_WIDTH // 2, 1175), "STONE TECH EXPERIENCE CENTER", fill=(255, 255, 255), font=fonts["back_heading"], anchor="mm")
    draw.text((PAGE_WIDTH // 2, 1225), "E-02, Ground Floor, SG Business Hub, Vasant Nagar, Gota, Ahmedabad, Gujarat 380060", fill=(203, 213, 225), font=fonts["back_body"], anchor="mm")
    draw.text((PAGE_WIDTH // 2, 1285), "WhatsApp Direct Lines: +91 77420 90866 / +91 97844 52998", fill=(103, 232, 249), font=fonts["back_sub"], anchor="mm")
    draw.text((PAGE_WIDTH // 2, 1335), "Direct Email: info@stonetech.in   ·   Website: www.stonetech.in", fill=(203, 213, 225), font=fonts["back_body"], anchor="mm")
    draw.text((PAGE_WIDTH // 2, 1385), "Studio Hours: Monday – Saturday, 10:00 AM – 7:30 PM", fill=(148, 163, 184), font=fonts["back_body"], anchor="mm")
    draw.text((PAGE_WIDTH // 2, 1425), "Port of Export Dispatch: Mundra Port / JNPT, India", fill=(148, 163, 184), font=fonts["back_body"], anchor="mm")
    draw.text((PAGE_WIDTH // 2, 1540), "© 2026 Stone Tech OS / Stone Tech Atelier. All Rights Reserved.", fill=(100, 116, 139), font=fonts["cover_meta"], anchor="mm")

    return img


def main():
    print("Step 1: Reading src/data/wall-cladding-catalog.json...")
    with open("src/data/wall-cladding-catalog.json", "r") as f:
        local_items = json.load(f)
    local_map = {item["id"]: dict(item) for item in local_items}
    print(f"Loaded {len(local_items)} local items.")

    print("Step 2: Fetching live CMS order & rotations from Supabase site-settings...")
    try:
        req = urllib.request.Request(
            "https://stonetech.in/api/public/site-settings",
            headers={"User-Agent": "Mozilla/5.0"},
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            site_data = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"Warning: Could not fetch remote site-settings ({e}); using local data.")
        site_data = {}

    order = site_data.get("website_catalog_order", [])
    custom_items = site_data.get("website_catalog_items", [])
    deleted_ids = set(site_data.get("website_deleted_product_ids", []))

    print(f"Remote order length: {len(order)}, Custom edited items: {len(custom_items)}, Deleted items: {len(deleted_ids)}")

    # Merge custom overrides (rotations, custom titles, prices, etc.)
    for c in custom_items:
        cid = c.get("id")
        if cid in local_map:
            local_map[cid].update({k: v for k, v in c.items() if v is not None})
        else:
            local_map[cid] = dict(c)

    # Sort strictly according to the CMS custom order, skipping deleted products
    sorted_items = []
    seen = set()
    for pid in order:
        if pid in local_map and pid not in seen and pid not in deleted_ids:
            sorted_items.append(local_map[pid])
            seen.add(pid)

    # Append any remaining items not in custom order, skipping deleted items
    for pid, item in local_map.items():
        if pid not in seen and pid not in deleted_ids:
            sorted_items.append(item)
            seen.add(pid)

    # Re-assign sequential codes (1..284) to match CMS sequence exactly
    reordered_catalog = []
    all_order_ids = []
    chapter_counts = {cfg["name"]: 0 for cfg in CHAPTER_CONFIG}

    for idx, item in enumerate(sorted_items):
        seq_idx = idx + 1
        seq_code = f"ST-WC-{seq_idx:03d}"
        item_copy = dict(item)
        item_copy["index"] = seq_idx
        item_copy["code"] = seq_code
        ch_name = get_chapter(item_copy)
        item_copy["patternCategory"] = ch_name
        chapter_counts[ch_name] = chapter_counts.get(ch_name, 0) + 1
        reordered_catalog.append(item_copy)
        all_order_ids.append(item["id"])

    print(f"Step 3: Saving {len(reordered_catalog)} sequentially ordered items to catalog JSON...")
    with open("src/data/wall-cladding-catalog.json", "w") as f:
        json.dump(reordered_catalog, f, indent=2)

    # Update DEFAULT_WEBSITE_CATALOG_ORDER in types.ts
    print("Step 4: Updating DEFAULT_WEBSITE_CATALOG_ORDER in src/lib/site-settings/types.ts...")
    types_path = "src/lib/site-settings/types.ts"
    with open(types_path, "r") as f:
        types_content = f.read()

    order_str = "export const DEFAULT_WEBSITE_CATALOG_ORDER: string[] = [\n"
    for pid in all_order_ids:
        order_str += f'  "{pid}",\n'
    order_str += "];"

    pattern = r"export const DEFAULT_WEBSITE_CATALOG_ORDER: string\[\] = \[[\s\S]*?\];"
    new_types_content = re.sub(pattern, order_str, types_content)
    with open(types_path, "w") as f:
        f.write(new_types_content)

    # Step 5: Render Luxury Publication PDF
    print("Step 5: Compiling Luxury PDF with Optima & Avenir Next...")
    fonts = get_luxury_fonts()
    logo_img, header_icon = load_brand_assets()

    card_w = 545
    card_h = 790
    x_positions = [55, 640]
    y_positions = [65, 885]

    # Chunk into 4 items per page
    chunks = [reordered_catalog[i : i + 4] for i in range(0, len(reordered_catalog), 4)]
    total_catalog_pages = len(chunks)
    total_pages = 1 + total_catalog_pages + 1

    print(f"Total Pages: {total_pages} (1 Cover + {total_catalog_pages} Product Pages + 1 Back Cover)")

    pages = []
    # Cover Page
    print("Rendering Cover Page...")
    pages.append(create_cover_page(fonts, logo_img, len(reordered_catalog)))

    # Product Pages (4 items per page)
    for p_idx, chunk in enumerate(chunks):
        p_num = p_idx + 2
        p_img = Image.new("RGB", (PAGE_WIDTH, PAGE_HEIGHT), color=(255, 255, 255))
        p_draw = ImageDraw.Draw(p_img)

        draw_header_footer(p_draw, fonts, p_num, total_pages, "ARCHITECTURAL COLLECTION", header_icon, p_img)

        for i, item in enumerate(chunk):
            gx = x_positions[i % 2]
            gy = y_positions[i // 2]
            render_pattern_card(p_draw, fonts, item, p_img, gx, gy, card_w, card_h)

        pages.append(p_img)

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

    import shutil
    shutil.copyfile(pdf_path_new, pdf_path_legacy)
    print(f"Mirrored copy to {pdf_path_legacy}")

if __name__ == "__main__":
    main()

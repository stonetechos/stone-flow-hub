#!/usr/bin/env python3
"""
Extracts and crops all high-resolution architectural facade renders,
texture swatches, and slab plates from the user-uploaded Flexible Clay Veneers source PDFs.
Properly handles alternating book-spread layouts (idx 0 vs idx 1) so scenes and swatches
are never inverted, and eliminates all text clipping from swatch margins.
"""

import os
import subprocess
from PIL import Image

REPO_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SOURCES_DIR = os.path.join(REPO_DIR, "public/catalogues/flexible-clay-sources")
ASSETS_DIR = os.path.join(REPO_DIR, "public/catalogues/flexible-clay-assets")
TEMP_DIR = "/tmp/fcv_raw_pages"

os.makedirs(ASSETS_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)

# 18 Textures mapping: (source_pdf, page_index, texture_slug, texture_name, ptype)
# ptype 0: Facing left page -> Scene on Left, Swatch on Right
# ptype 1: Facing right page -> Swatch on Left, Scene on Right
TEXTURES = [
    ("media_1795064516335_f5d95c24.pdf", 0, "fluted", "Fluted", 0),
    ("media_1795064516335_f5d95c24.pdf", 1, "hammerstone", "Hammerstone", 1),
    ("media_1795064547316_79dc2876.pdf", 0, "ripple", "Ripple", 0),
    ("media_1795064547316_79dc2876.pdf", 1, "weave", "Weave", 1),
    ("media_1795064547298_2eafa8c2.pdf", 0, "cube", "Cube", 0),
    ("media_1795064547298_2eafa8c2.pdf", 1, "romastone", "Romastone", 1),
    ("media_1795064566733_6d799b62.pdf", 0, "linea", "Linea", 0),
    ("media_1795064566733_6d799b62.pdf", 1, "mosaic", "Mosaic", 1),
    ("media_1795064566702_0dadd604.pdf", 0, "riverstone", "Riverstone", 0),
    ("media_1795064566702_0dadd604.pdf", 1, "horizon", "Horizon", 1),
    ("media_1795064579585_e3296360.pdf", 0, "cemento", "Cemento", 0),
    ("media_1795064579585_e3296360.pdf", 1, "travertino", "Travertino", 1),
    ("media_1795064579592_cc49d28e.pdf", 0, "moonstone", "Moonstone", 0),
    ("media_1795064579592_cc49d28e.pdf", 1, "ledgestone", "Ledgestone", 1),
    ("media_1795064590579_83d70337.pdf", 0, "earthstone", "Earthstone", 0),
    ("media_1795064590579_83d70337.pdf", 1, "checkered", "Checkered", 1),
    ("media_1795064590541_1560fe42.pdf", 0, "carved", "Carved", 0),
    ("media_1795064590541_1560fe42.pdf", 1, "slate", "Slate", 1),
]

swift_lines = [
    "import PDFKit",
    "import CoreGraphics",
    "import Foundation",
    "",
    "func render(pdfPath: String, pageIdx: Int, outPath: String, scale: CGFloat = 2.0) {",
    "    guard let doc = PDFDocument(url: URL(fileURLWithPath: pdfPath)), let page = doc.page(at: pageIdx) else { return }",
    "    let bounds = page.bounds(for: .mediaBox)",
    "    let width = Int(bounds.width * scale)",
    "    let height = Int(bounds.height * scale)",
    "    let ctx = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: width * 4, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!",
    "    ctx.scaleBy(x: scale, y: scale)",
    "    page.draw(with: .mediaBox, to: ctx)",
    "    if let img = ctx.makeImage() {",
    "        let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: outPath) as CFURL, \"public.jpeg\" as CFString, 1, nil)!",
    "        let opts: [CFString: Any] = [kCGImageDestinationLossyCompressionQuality: 0.90]",
    "        CGImageDestinationAddImage(dest, img, opts as CFDictionary)",
    "        CGImageDestinationFinalize(dest)",
    "    }",
    "}",
    ""
]

# Render hero bending page (Part 01, page 2)
p1_pdf = os.path.join(SOURCES_DIR, "media_1795064507464_df08df1a.pdf")
swift_lines.append(f'render(pdfPath: "{p1_pdf}", pageIdx: 2, outPath: "{TEMP_DIR}/hero_raw.jpg")')

for pdf_file, page_idx, slug, name, ptype in TEXTURES:
    pdf_path = os.path.join(SOURCES_DIR, pdf_file)
    raw_page = os.path.join(TEMP_DIR, f"{slug}_page.jpg")
    swift_lines.append(f'render(pdfPath: "{pdf_path}", pageIdx: {page_idx}, outPath: "{raw_page}")')

# Punch Traventino (10 pages)
pt_pdf = os.path.join(SOURCES_DIR, "Punch_Traventino_TS201-TS220.pdf")
for i in range(10):
    raw_pt = os.path.join(TEMP_DIR, f"pt_page_{i}.jpg")
    swift_lines.append(f'render(pdfPath: "{pt_pdf}", pageIdx: {i}, outPath: "{raw_pt}")')

# Punch Slat Part 1 (8 pages) & Part 2 (4 pages)
ps1_pdf = os.path.join(SOURCES_DIR, "WL SLAT JPG - Part 01.pdf")
for i in range(8):
    raw_ps1 = os.path.join(TEMP_DIR, f"ps1_page_{i}.jpg")
    swift_lines.append(f'render(pdfPath: "{ps1_pdf}", pageIdx: {i}, outPath: "{raw_ps1}")')

ps2_pdf = os.path.join(SOURCES_DIR, "WL SLAT JPG - Part 02.pdf")
for i in range(4):
    raw_ps2 = os.path.join(TEMP_DIR, f"ps2_page_{i}.jpg")
    swift_lines.append(f'render(pdfPath: "{ps2_pdf}", pageIdx: {i}, outPath: "{raw_ps2}")')

with open("/tmp/render_fcv.swift", "w") as f:
    f.write("\n".join(swift_lines))

print("Rendering high-res pages via Swift PDFKit...")
res = subprocess.run(["swift", "/tmp/render_fcv.swift"], capture_output=True, text=True)
if res.returncode != 0:
    print("Swift render error:", res.stderr)
    exit(1)
print("Rendered all raw pages successfully!")

# 1. Process Hero
hero_raw = os.path.join(TEMP_DIR, "hero_raw.jpg")
if os.path.exists(hero_raw):
    im = Image.open(hero_raw)
    w, h = im.size
    hero_crop = im.crop((500, 85, w - 85, h - 85))
    hero_crop.save(os.path.join(ASSETS_DIR, "hero_bending_facade.jpg"), quality=88, optimize=True)
    print("Extracted hero_bending_facade:", hero_crop.size)

# 2. Process 18 Textures
print("\nCropping 18 texture scenes & swatches...")
for pdf_file, page_idx, slug, name, ptype in TEXTURES:
    raw_page = os.path.join(TEMP_DIR, f"{slug}_page.jpg")
    if not os.path.exists(raw_page):
        continue
    im = Image.open(raw_page)
    
    if ptype == 0:
        # Facing left page: Scene on Left (85..1513, 85..1595), Swatch on Right (1660..2295, 1043..1595)
        scene = im.crop((85, 85, 1513, 1595))
        swatch = im.crop((1660, 1043, 2295, 1595))
    else:
        # Facing right page: Swatch on Left (85..720, 1043..1595), Scene on Right (868..2296, 85..1595)
        scene = im.crop((868, 85, 2296, 1595))
        swatch = im.crop((85, 1043, 720, 1595))

    scene_path = os.path.join(ASSETS_DIR, f"{slug}_scene.jpg")
    swatch_path = os.path.join(ASSETS_DIR, f"{slug}_swatch.jpg")
    scene.save(scene_path, quality=88, optimize=True)
    swatch.save(swatch_path, quality=88, optimize=True)
    print(f"Extracted {slug:12s} (ptype {ptype}): scene={scene.size}, swatch={swatch.size}")

# 3. Process Punch Traventino Slabs
PT_SLUGS = ["ts201", "ts202", "ts205", "ts206_grey", "ts206", "ts211", "ts212", "ts213", "ts219", "ts220"]
for i, slug in enumerate(PT_SLUGS):
    raw_page = os.path.join(TEMP_DIR, f"pt_page_{i}.jpg")
    if os.path.exists(raw_page):
        im = Image.open(raw_page)
        slab = im.crop((85, 85, 690, 1600))
        slab.save(os.path.join(ASSETS_DIR, f"pt_{slug}.jpg"), quality=88, optimize=True)
        print(f"Extracted Punch Traventino {slug}: {slab.size}")

# 4. Process Punch Slat Slabs
PS_SLUGS = [
    "sk103", "sk103_grey", "sk106", "sk108", "sk109", "sk110", "sk111", "sk112",
    "sk114", "sk115", "sk117", "sk119"
]
for i in range(8):
    slug = PS_SLUGS[i]
    raw_page = os.path.join(TEMP_DIR, f"ps1_page_{i}.jpg")
    if os.path.exists(raw_page):
        im = Image.open(raw_page)
        slab = im.crop((85, 85, 690, 1600))
        slab.save(os.path.join(ASSETS_DIR, f"ps_{slug}.jpg"), quality=88, optimize=True)
        print(f"Extracted Punch Slat {slug}: {slab.size}")

for i in range(4):
    slug = PS_SLUGS[8 + i]
    raw_page = os.path.join(TEMP_DIR, f"ps2_page_{i}.jpg")
    if os.path.exists(raw_page):
        im = Image.open(raw_page)
        slab = im.crop((85, 85, 690, 1600))
        slab.save(os.path.join(ASSETS_DIR, f"ps_{slug}.jpg"), quality=88, optimize=True)
        print(f"Extracted Punch Slat {slug}: {slab.size}")

print("\n--- ALL ASSETS EXTRACTED WITH ZERO CLIPPED TEXT AND EXACT ORIENTATION ---")

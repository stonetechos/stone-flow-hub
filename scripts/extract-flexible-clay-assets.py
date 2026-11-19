#!/usr/bin/env python3
"""
Extracts and crops all high-resolution architectural facade renders,
texture swatches, and slab plates from the user-uploaded Flexible Clay Veneers source PDFs.
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

# 18 Textures mapping: (source_pdf, page_index, texture_slug, texture_name)
TEXTURES = [
    ("media_1795064516335_f5d95c24.pdf", 0, "fluted", "Fluted"),
    ("media_1795064516335_f5d95c24.pdf", 1, "hammerstone", "Hammerstone"),
    ("media_1795064547316_79dc2876.pdf", 0, "ripple", "Ripple"),
    ("media_1795064547316_79dc2876.pdf", 1, "weave", "Weave"),
    ("media_1795064547298_2eafa8c2.pdf", 0, "cube", "Cube"),
    ("media_1795064547298_2eafa8c2.pdf", 1, "romastone", "Romastone"),
    ("media_1795064566733_6d799b62.pdf", 0, "linea", "Linea"),
    ("media_1795064566733_6d799b62.pdf", 1, "mosaic", "Mosaic"),
    ("media_1795064566702_0dadd604.pdf", 0, "riverstone", "Riverstone"),
    ("media_1795064566702_0dadd604.pdf", 1, "horizon", "Horizon"),
    ("media_1795064579585_e3296360.pdf", 0, "cemento", "Cemento"),
    ("media_1795064579585_e3296360.pdf", 1, "travertino", "Travertino"),
    ("media_1795064579592_cc49d28e.pdf", 0, "moonstone", "Moonstone"),
    ("media_1795064579592_cc49d28e.pdf", 1, "ledgestone", "Ledgestone"),
    ("media_1795064590579_83d70337.pdf", 0, "earthstone", "Earthstone"),
    ("media_1795064590579_83d70337.pdf", 1, "checkered", "Checkered"),
    ("media_1795064590541_1560fe42.pdf", 0, "carved", "Carved"),
    ("media_1795064590541_1560fe42.pdf", 1, "slate", "Slate"),
]

# Write Swift script to render pages
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

for pdf_file, page_idx, slug, name in TEXTURES:
    pdf_path = os.path.join(SOURCES_DIR, pdf_file)
    raw_page = os.path.join(TEMP_DIR, f"{slug}_page.jpg")
    swift_lines.append(f'render(pdfPath: "{pdf_path}", pageIdx: {page_idx}, outPath: "{raw_page}")')

# Also render Punch Traventino (10 pages)
pt_pdf = os.path.join(SOURCES_DIR, "Punch_Traventino_TS201-TS220.pdf")
for i in range(10):
    raw_pt = os.path.join(TEMP_DIR, f"pt_page_{i}.jpg")
    swift_lines.append(f'render(pdfPath: "{pt_pdf}", pageIdx: {i}, outPath: "{raw_pt}")')

# Also render Punch Slat Part 1 (8 pages) & Part 2 (4 pages)
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

# Now crop scene and swatch for each of the 18 textures
print("\nCropping scenes, swatches, and slabs...")
for pdf_file, page_idx, slug, name in TEXTURES:
    raw_page = os.path.join(TEMP_DIR, f"{slug}_page.jpg")
    if not os.path.exists(raw_page):
        continue
    im = Image.open(raw_page)
    w, h = im.size

    scene_crop = im.crop((int(w * 0.035), int(h * 0.05), int(w * 0.635), int(h * 0.95)))
    scene_out = os.path.join(ASSETS_DIR, f"{slug}_scene.jpg")
    scene_crop.save(scene_out, quality=85, optimize=True)

    swatch_crop = im.crop((int(w * 0.69), int(h * 0.61), int(w * 0.96), int(h * 0.95)))
    swatch_out = os.path.join(ASSETS_DIR, f"{slug}_swatch.jpg")
    swatch_crop.save(swatch_out, quality=85, optimize=True)

    print(f"Extracted {slug}: scene={scene_crop.size}, swatch={swatch_crop.size}")

# Process Punch Traventino slabs
PT_SLUGS = ["ts201", "ts202", "ts205", "ts206_grey", "ts206", "ts211", "ts212", "ts213", "ts219", "ts220"]
for i, slug in enumerate(PT_SLUGS):
    raw_page = os.path.join(TEMP_DIR, f"pt_page_{i}.jpg")
    if os.path.exists(raw_page):
        im = Image.open(raw_page)
        w, h = im.size
        slab_crop = im.crop((int(w * 0.06), int(h * 0.05), int(w * 0.58), int(h * 0.95)))
        slab_out = os.path.join(ASSETS_DIR, f"pt_{slug}.jpg")
        slab_crop.save(slab_out, quality=85, optimize=True)
        print(f"Extracted Punch Traventino {slug}: {slab_crop.size}")

# Process Punch Slat slabs
PS_SLUGS = [
    "sk103", "sk103_grey", "sk106", "sk108", "sk109", "sk110", "sk111", "sk112",
    "sk114", "sk115", "sk117", "sk119"
]
for i in range(8):
    slug = PS_SLUGS[i]
    raw_page = os.path.join(TEMP_DIR, f"ps1_page_{i}.jpg")
    if os.path.exists(raw_page):
        im = Image.open(raw_page)
        w, h = im.size
        slab_crop = im.crop((int(w * 0.06), int(h * 0.05), int(w * 0.58), int(h * 0.95)))
        slab_out = os.path.join(ASSETS_DIR, f"ps_{slug}.jpg")
        slab_crop.save(slab_out, quality=85, optimize=True)
        print(f"Extracted Punch Slat {slug}: {slab_crop.size}")

for i in range(4):
    slug = PS_SLUGS[8 + i]
    raw_page = os.path.join(TEMP_DIR, f"ps2_page_{i}.jpg")
    if os.path.exists(raw_page):
        im = Image.open(raw_page)
        w, h = im.size
        slab_crop = im.crop((int(w * 0.06), int(h * 0.05), int(w * 0.58), int(h * 0.95)))
        slab_out = os.path.join(ASSETS_DIR, f"ps_{slug}.jpg")
        slab_crop.save(slab_out, quality=85, optimize=True)
        print(f"Extracted Punch Slat {slug}: {slab_crop.size}")

print("\n--- ALL ASSETS EXTRACTED AND OPTIMIZED IN", ASSETS_DIR, "---")

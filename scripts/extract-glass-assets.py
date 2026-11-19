#!/usr/bin/env python3
import os
import subprocess
from PIL import Image

REPO_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
HOLLOW_PDF = "/Users/stonetech/.gemini/antigravity/brain/692e0f8b-c231-4893-8608-267244e2257f/.user_uploaded/media_1795014091127_c5f42ec8.pdf"
SOLID_PDF = "/Users/stonetech/.gemini/antigravity/brain/692e0f8b-c231-4893-8608-267244e2257f/.user_uploaded/media_1795000347600_87730ac5.pdf"

HOLLOW_DIR = os.path.join(REPO_DIR, "public/catalogues/hollow-glass-assets")
SOLID_DIR = os.path.join(REPO_DIR, "public/catalogues/solid-glass-assets")

os.makedirs(HOLLOW_DIR, exist_ok=True)
os.makedirs(SOLID_DIR, exist_ok=True)

swift_render_script = """
import PDFKit
import Foundation

let args = CommandLine.arguments
guard args.count >= 4 else { exit(1) }
let pdfPath = args[1]
let pageIdx = Int(args[2])!
let outPath = args[3]
let scale: CGFloat = 2.0

let url = URL(fileURLWithPath: pdfPath)
guard let doc = PDFDocument(url: url), let page = doc.page(at: pageIdx) else {
    exit(1)
}
let pageRect = page.bounds(for: .mediaBox)
let scaledSize = NSSize(width: pageRect.width * scale, height: pageRect.height * scale)
let renderer = NSImage(size: scaledSize)
renderer.lockFocus()
if let ctx = NSGraphicsContext.current?.cgContext {
    ctx.scaleBy(x: scale, y: scale)
    ctx.setFillColor(NSColor.white.cgColor)
    ctx.fill(pageRect)
    page.draw(with: .mediaBox, to: ctx)
}
renderer.unlockFocus()
if let tiff = renderer.tiffRepresentation, let rep = NSBitmapImageRep(data: tiff), let png = rep.representation(using: .png, properties: [:]) {
    try? png.write(to: URL(fileURLWithPath: outPath))
}
"""

with open("/tmp/render_pdf_page.swift", "w") as f:
    f.write(swift_render_script)

print("Extracting Hollow Glass Bricks pages and crops...")
# Hollow Glass Bricks product pages: 6 to 44 (indices 5 to 43)
# Page 2: About photo (index 1)
# Page 45: Installation (index 44)
# Pages 46-48: Galleries (indices 45-47)

for p_num in range(6, 45):
    idx = p_num - 1
    tmp_page = f"/tmp/hollow_page_{p_num}.png"
    subprocess.run(["swift", "/tmp/render_pdf_page.swift", HOLLOW_PDF, str(idx), tmp_page], check=True)
    im = Image.open(tmp_page).convert("RGB")
    W, H = im.size
    
    # In 2.0 scale: W ~ 3072, H ~ 2304
    # The brick is located on the left side
    # Coordinates in 2x: x: 100 to 1600, y: 650 to 2150
    crop_x1 = int(W * 0.04)
    crop_y1 = int(H * 0.28)
    crop_x2 = int(W * 0.52)
    crop_y2 = int(H * 0.94)
    
    brick = im.crop((crop_x1, crop_y1, crop_x2, crop_y2))
    out_file = os.path.join(HOLLOW_DIR, f"hollow_p{p_num}_brick.jpg")
    brick.save(out_file, "JPEG", quality=85, optimize=True)
    os.remove(tmp_page)
    print(f"Hollow Page {p_num} -> {out_file} ({brick.size})")

# Extract Hollow gallery and install photos
for p_num in [2, 45, 46, 47, 48]:
    idx = p_num - 1
    tmp_page = f"/tmp/hollow_page_{p_num}.png"
    subprocess.run(["swift", "/tmp/render_pdf_page.swift", HOLLOW_PDF, str(idx), tmp_page], check=True)
    im = Image.open(tmp_page).convert("RGB")
    W, H = im.size
    
    if p_num == 2: # About photo on right
        crop = im.crop((int(W * 0.50), int(H * 0.18), int(W * 0.96), int(H * 0.86)))
        crop.save(os.path.join(HOLLOW_DIR, "about_photo.jpg"), "JPEG", quality=85)
    elif p_num == 45: # Installation photo on right
        crop = im.crop((int(W * 0.58), int(H * 0.24), int(W * 0.96), int(H * 0.80)))
        crop.save(os.path.join(HOLLOW_DIR, "install_photo.jpg"), "JPEG", quality=85)
    elif p_num in [46, 47, 48]: # Gallery spreads
        # Crop full visual content below header (y: 0.20 to 0.95)
        crop = im.crop((int(W * 0.04), int(H * 0.24), int(W * 0.96), int(H * 0.94)))
        crop.save(os.path.join(HOLLOW_DIR, f"gallery_{p_num}.jpg"), "JPEG", quality=85)
    os.remove(tmp_page)

print("\nExtracting Solid Glass Bricks pages and crops...")
# Solid Glass Bricks product pages: 4 to 32 (indices 3 to 31)
for p_num in range(4, 33):
    idx = p_num - 1
    tmp_page = f"/tmp/solid_page_{p_num}.png"
    subprocess.run(["swift", "/tmp/render_pdf_page.swift", SOLID_PDF, str(idx), tmp_page], check=True)
    im = Image.open(tmp_page).convert("RGB")
    W, H = im.size
    
    # In Solid Glass Bricks:
    # Left brick photo: x: 0.03 to 0.48, y: 0.40 to 0.92
    # Right installation scene: x: 0.52 to 0.97, y: 0.40 to 0.92
    brick_crop = im.crop((int(W * 0.03), int(H * 0.40), int(W * 0.48), int(H * 0.92)))
    scene_crop = im.crop((int(W * 0.52), int(H * 0.40), int(W * 0.97), int(H * 0.92)))
    
    b_out = os.path.join(SOLID_DIR, f"solid_p{p_num}_brick.jpg")
    s_out = os.path.join(SOLID_DIR, f"solid_p{p_num}_scene.jpg")
    
    brick_crop.save(b_out, "JPEG", quality=85, optimize=True)
    scene_crop.save(s_out, "JPEG", quality=85, optimize=True)
    os.remove(tmp_page)
    print(f"Solid Page {p_num} -> {b_out} & {s_out}")

# Solid installation and about photos
for p_num, name in [(2, "about_photo"), (33, "install_photo")]:
    idx = p_num - 1
    tmp_page = f"/tmp/solid_page_{p_num}.png"
    subprocess.run(["swift", "/tmp/render_pdf_page.swift", SOLID_PDF, str(idx), tmp_page], check=True)
    im = Image.open(tmp_page).convert("RGB")
    W, H = im.size
    if p_num == 2:
        crop = im.crop((int(W * 0.50), int(H * 0.18), int(W * 0.96), int(H * 0.86)))
        crop.save(os.path.join(SOLID_DIR, "about_photo.jpg"), "JPEG", quality=85)
    elif p_num == 33:
        crop = im.crop((int(W * 0.60), int(H * 0.22), int(W * 0.98), int(H * 0.86)))
        crop.save(os.path.join(SOLID_DIR, "install_photo.jpg"), "JPEG", quality=85)
    os.remove(tmp_page)

print("Extraction complete!")

#!/usr/bin/env python3
"""Stone Tech OS -- PWA icon generator (Phase G.10A).

Regenerates public/icons/*.png from scripts/pwa/icon-source.svg.
The source SVG reproduces the existing AppShell sidebar gem badge --
this script exists only so those PNGs can be reproduced deterministically
after a design tweak, not because the icon design changed.

Requires: pip install cairosvg pillow

Usage:
    python3 scripts/pwa/generate_icons.py
"""
import os
import subprocess
import sys

try:
    import cairosvg  # noqa: F401
except ImportError:
    print("Missing dependency: pip install cairosvg --break-system-packages", file=sys.stderr)
    sys.exit(1)

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, "scripts", "pwa", "icon-source.svg")
OUT_DIR = os.path.join(ROOT, "public", "icons")

# (filename, pixel size)
TARGETS = [
    ("icon-192.png", 192),
    ("icon-512.png", 512),
    ("apple-touch-icon.png", 180),
]


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    for filename, size in TARGETS:
        out_path = os.path.join(OUT_DIR, filename)
        subprocess.run(
            [
                sys.executable, "-m", "cairosvg", SRC,
                "-o", out_path,
                "--output-width", str(size),
                "--output-height", str(size),
            ],
            check=True,
        )
        # manifest icons must not carry an alpha channel per Play/PWA install
        # requirements -- flatten onto the same opaque tile background.
        img = Image.open(out_path)
        if img.mode != "RGB":
            img = img.convert("RGB")
            img.save(out_path)
        print(f"wrote {out_path} ({size}x{size})")


if __name__ == "__main__":
    main()

import os
import base64
import subprocess

def b64(path):
    ext = os.path.splitext(path)[1].lower().replace('.', '')
    mime = 'image/jpeg' if ext in ['jpg', 'jpeg'] else 'image/png'
    with open(path, 'rb') as f:
        return f"data:{mime};base64," + base64.b64encode(f.read()).decode('utf-8')

logo_b64 = b64('public/branding/stone-tech-logo-master.jpg')
img1_b64 = b64('public/images/catalog/wall-cladding/cladding-03-tri-tone-gold-black-white.jpg')
img2_b64 = b64('public/catalogues/stone-veneer-assets/slab_004_part1_page06.jpg')
img3_b64 = b64('public/catalogues/solid-glass-assets/solid_p10_brick.jpg')
img4_b64 = b64('public/catalogues/flexible-clay-assets/carved_scene.jpg')

html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
* {{
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}}
body {{
  width: 1200px;
  height: 630px;
  background-color: #0b1120;
  background-image: 
    radial-gradient(circle at 10% 20%, rgba(217, 119, 6, 0.18) 0%, transparent 40%),
    radial-gradient(circle at 90% 80%, rgba(13, 148, 136, 0.25) 0%, transparent 45%),
    linear-gradient(180deg, #0b1120 0%, #070d18 100%);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  display: flex;
  position: relative;
  overflow: hidden;
  color: #ffffff;
}}

/* Top gold-emerald-cyan hairline accent stripe */
.top-accent {{
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 5px;
  background: linear-gradient(90deg, #f59e0b 0%, #10b981 50%, #06b6d4 100%);
  box-shadow: 0 0 12px rgba(16, 185, 129, 0.5);
  z-index: 10;
}}

/* Left Floating Architectural Brand Card */
.left-card {{
  width: 370px;
  height: 540px;
  margin: 45px 0 45px 45px;
  background: #ffffff;
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 24px 20px 20px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.15);
  position: relative;
  z-index: 5;
}}

.logo-container {{
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding-top: 10px;
}}

.logo-img {{
  width: 300px;
  height: auto;
  object-fit: contain;
}}

.brand-details {{
  text-align: center;
  width: 100%;
  padding: 0 10px;
}}

.brand-divider {{
  width: 60px;
  height: 3px;
  background: linear-gradient(90deg, #d97706, #0d9488);
  margin: 0 auto 12px;
  border-radius: 2px;
}}

.brand-tagline {{
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: #0f766e;
  margin-bottom: 4px;
}}

.brand-sub {{
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  letter-spacing: 0.5px;
}}

.brand-location {{
  margin-top: 8px;
  font-size: 12px;
  font-weight: 700;
  color: #334155;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}}

.card-badge {{
  width: 100%;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 8px 12px;
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  color: #1e293b;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}}

.card-badge .stars {{
  color: #f59e0b;
  font-size: 13px;
}}

/* Right Content Showcase */
.right-content {{
  flex: 1;
  margin: 45px 45px 45px 35px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  z-index: 5;
}}

.header-section {{
  display: flex;
  flex-direction: column;
  gap: 8px;
}}

.top-pill {{
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(13, 148, 136, 0.15);
  border: 1px solid rgba(20, 184, 166, 0.4);
  padding: 6px 14px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #2dd4bf;
  text-transform: uppercase;
  width: fit-content;
}}

.main-title {{
  font-size: 33px;
  font-weight: 800;
  line-height: 1.15;
  color: #ffffff;
  letter-spacing: -0.5px;
}}

.main-title span {{
  background: linear-gradient(135deg, #38bdf8 0%, #34d399 50%, #fcd34d 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}}

.subtitle {{
  font-size: 14px;
  font-weight: 500;
  color: #94a3b8;
  line-height: 1.4;
}}

/* 2x2 Grid of Product Collections */
.grid-container {{
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 8px 0;
}}

.collection-card {{
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(30, 41, 59, 0.7);
  border: 1px solid rgba(51, 65, 85, 0.8);
  border-radius: 14px;
  padding: 10px 12px;
  backdrop-filter: blur(8px);
}}

.thumb {{
  width: 50px;
  height: 50px;
  border-radius: 10px;
  object-fit: cover;
  border: 1px solid rgba(255, 255, 255, 0.2);
  flex-shrink: 0;
}}

.card-info {{
  display: flex;
  flex-direction: column;
  overflow: hidden;
}}

.card-title {{
  font-size: 13px;
  font-weight: 700;
  color: #f8fafc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}}

.card-desc {{
  font-size: 11px;
  font-weight: 500;
  color: #38bdf8;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}}

/* Bottom CTA Banner */
.cta-banner {{
  background: linear-gradient(90deg, rgba(15, 23, 42, 0.9) 0%, rgba(13, 148, 136, 0.25) 100%);
  border: 1px solid rgba(20, 184, 166, 0.5);
  border-radius: 16px;
  padding: 12px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}}

.cta-left {{
  display: flex;
  flex-direction: column;
  gap: 4px;
}}

.lang-tags {{
  display: flex;
  align-items: center;
  gap: 6px;
}}

.tag-badge {{
  padding: 2px 7px;
  border-radius: 5px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
}}

.tag-en {{
  background: #ea580c;
  color: #ffffff;
}}

.tag-hi {{
  background: #ffffff;
  color: #0f172a;
  border: 1px solid #cbd5e1;
}}

.tag-gu {{
  background: #16a34a;
  color: #ffffff;
}}

.cta-tagline {{
  font-size: 12px;
  font-weight: 600;
  color: #e2e8f0;
}}

.cta-button {{
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #0d9488;
  border: 1px solid #14b8a6;
  color: #ffffff;
  padding: 8px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.3px;
  box-shadow: 0 4px 12px rgba(13, 148, 136, 0.4);
}}

</style>
</head>
<body>

<div class="top-accent"></div>

<!-- Left Card with Stone Tech Brand Logo -->
<div class="left-card">
  <div class="logo-container">
    <img src="{logo_b64}" class="logo-img" alt="STONE TECH Logo" />
  </div>
  
  <div class="brand-details">
    <div class="brand-divider"></div>
    <div class="brand-tagline">Architectural Stone Atelier</div>
    <div class="brand-sub">Quarry-Direct · Custom CNC &amp; Craftsmanship</div>
    <div class="brand-location">📍 Ahmedabad, Gujarat · India</div>
  </div>

  <div class="card-badge">
    <span class="stars">★★★★★</span> 4.9 · Verified Manufacturer &amp; Atelier
  </div>
</div>

<!-- Right Showcase Area -->
<div class="right-content">
  <div class="header-section">
    <div class="top-pill">
      🏛️ ARCHITECTURAL CATALOGUES &amp; SPECIFICATIONS · 2026-27
    </div>
    <h1 class="main-title">
      Architectural <span>Catalogues</span>
    </h1>
    <p class="subtitle">
      Explore &amp; download complete verified technical catalogues with specifications, sizes and high-resolution textures.
    </p>
  </div>

  <!-- 2x2 Grid with Stone Previews -->
  <div class="grid-container">
    <div class="collection-card">
      <img src="{img1_b64}" class="thumb" alt="Wall Cladding" />
      <div class="card-info">
        <div class="card-title">Natural Stone Wall Cladding</div>
        <div class="card-desc">275+ Modular &amp; 3D Origami Reliefs</div>
      </div>
    </div>

    <div class="collection-card">
      <img src="{img2_b64}" class="thumb" alt="Stone Veneer" />
      <div class="card-info">
        <div class="card-title">Ultra-Thin Stone Veneer</div>
        <div class="card-desc">98+ Natural Slate &amp; Sandstone Types</div>
      </div>
    </div>

    <div class="collection-card">
      <img src="{img3_b64}" class="thumb" alt="Glass Bricks" />
      <div class="card-info">
        <div class="card-title">Architectural Glass Bricks</div>
        <div class="card-desc">Solid Crystal &amp; Hollow Designer Blocks</div>
      </div>
    </div>

    <div class="collection-card">
      <img src="{img4_b64}" class="thumb" alt="Flexible Clay" />
      <div class="card-info">
        <div class="card-title">Clay Veneers &amp; Pebbles</div>
        <div class="card-desc">Lightweight Eco Finishes &amp; Landscaping</div>
      </div>
    </div>
  </div>

  <!-- Bottom CTA Banner -->
  <div class="cta-banner">
    <div class="cta-left">
      <div class="lang-tags">
        <span class="tag-badge tag-en">English</span>
        <span class="tag-badge tag-hi">हिंदी</span>
        <span class="tag-badge tag-gu">ગુજરાતી</span>
        <span style="font-size: 11px; color: #94a3b8; margin-left: 4px;">· 🇮🇳 Tri-Language PDFs</span>
      </div>
      <div class="cta-tagline">
        Instant Download on Website · No Sign-in Required
      </div>
    </div>

    <div class="cta-button">
      👉 stonetech.in/#catalogues
    </div>
  </div>
</div>

</body>
</html>
"""

os.makedirs('scripts/templates', exist_ok=True)
template_path = 'scripts/templates/stone-tech-og-banner.html'
with open(template_path, 'w') as f:
    f.write(html_content)

print("Saved HTML template.")

chrome_bin = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
output_png = "public/branding/stone-tech-og-banner.png"

cmd = [
    chrome_bin,
    "--headless",
    "--disable-gpu",
    "--window-size=1200,630",
    f"--screenshot={output_png}",
    "file://" + os.path.abspath(template_path)
]

print("Rendering with Google Chrome...")
subprocess.run(cmd, check=True)
print(f"Generated {output_png} successfully! Size: {os.path.getsize(output_png)} bytes")

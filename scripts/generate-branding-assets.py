import os
from PIL import Image, ImageDraw, ImageFont

SRC_LOGO = "/Users/stonetech/.gemini/antigravity/brain/692e0f8b-c231-4893-8608-267244e2257f/.user_uploaded/media_1793652700892_58c6689e.jpg"
logo_raw = Image.open(SRC_LOGO).convert("RGBA")

# 1. Create a clean square logo (512x512) with white background
square_512 = Image.new("RGBA", (512, 512), (255, 255, 255, 255))
# Calculate scale so logo fits nicely inside 512x512 with 24px padding
w, h = logo_raw.size
scale = min(464 / w, 464 / h)
new_w, new_h = int(w * scale), int(h * scale)
logo_resized = logo_raw.resize((new_w, new_h), Image.Resampling.LANCZOS)
pos_x = (512 - new_w) // 2
pos_y = (512 - new_h) // 2
square_512.paste(logo_resized, (pos_x, pos_y), logo_resized)

# Save icons and logos
square_512.convert("RGB").save("public/branding/stone-tech-logo.jpg", "JPEG", quality=95)
square_512.save("public/branding/stone-tech-logo.png", "PNG")
square_512.save("public/branding/stone-tech-icon.png", "PNG")
square_512.save("public/logo.png", "PNG")
square_512.convert("RGB").save("public/logo.jpg", "JPEG", quality=95)

# PWA icons
square_512.save("public/icons/icon-512.png", "PNG")
square_512.resize((192, 192), Image.Resampling.LANCZOS).save("public/icons/icon-192.png", "PNG")
square_512.resize((180, 180), Image.Resampling.LANCZOS).save("public/icons/apple-touch-icon.png", "PNG")
square_512.resize((64, 64), Image.Resampling.LANCZOS).save("public/favicon.png", "PNG")

print("Saved logo and PWA icons successfully.")

# 2. Generate 1200x630 OpenGraph social banner for WhatsApp & Facebook
og_w, og_h = 1200, 630
og = Image.new("RGB", (og_w, og_h), "#0f172a") # Dark luxury slate
draw = ImageDraw.Draw(og)

# Decorative subtle gradient/border
draw.rectangle([(0, 0), (og_w, 14)], fill="#0d9488") # Emerald top stripe
draw.rectangle([(0, og_h - 14), (og_w, og_h)], fill="#0d9488") # Emerald bottom stripe
draw.rounded_rectangle([(24, 28), (og_w - 24, og_h - 28)], radius=18, outline="#1e293b", width=2)

# Left White Card holding the Stone Tech Logo
card_w, card_h = 420, 520
left_card = Image.new("RGBA", (card_w, card_h), (255, 255, 255, 255))
logo_fit_scale = min(380 / w, 440 / h)
lw, lh = int(w * logo_fit_scale), int(h * logo_fit_scale)
lr = logo_raw.resize((lw, lh), Image.Resampling.LANCZOS)
left_card.paste(lr, ((card_w - lw) // 2, (card_h - lh) // 2), lr)
og.paste(left_card.convert("RGB"), (50, 55))

# Fonts
font_path = "/System/Library/Fonts/HelveticaNeue.ttc"
try:
    font_badge = ImageFont.truetype(font_path, 22, index=1)
    font_title = ImageFont.truetype(font_path, 44, index=1)
    font_role_title = ImageFont.truetype(font_path, 28, index=1)
    font_role_meta = ImageFont.truetype(font_path, 22, index=0)
    font_footer = ImageFont.truetype(font_path, 22, index=1)
except Exception:
    font_badge = ImageFont.load_default()
    font_title = ImageFont.load_default()
    font_role_title = ImageFont.load_default()
    font_role_meta = ImageFont.load_default()
    font_footer = ImageFont.load_default()

# Right side content
rx = 510

# Pill Badge
draw.rounded_rectangle([(rx, 65), (rx + 420, 105)], radius=12, fill="#042f2e", outline="#14b8a6", width=2)
draw.text((rx + 18, 73), "WE ARE HIRING · GOTA, AHMEDABAD", fill="#2dd4bf", font=font_badge)

# Headline
draw.text((rx, 125), "Careers at Stone Tech", fill="#ffffff", font=font_title)

# Card Role 1: Data Entry Executive
r1_y = 195
draw.rounded_rectangle([(rx, r1_y), (og_w - 55, r1_y + 130)], radius=14, fill="#1e293b", outline="#334155", width=1)
draw.text((rx + 20, r1_y + 15), "1. Data Entry Executive (ERP & CRM)", fill="#f8fafc", font=font_role_title)
draw.text((rx + 20, r1_y + 55), "Salary: ₹12,000 – ₹15,000 / month", fill="#34d399", font=font_role_meta)
draw.text((rx + 20, r1_y + 88), "Timing: (Mon-Sat) 10:00 AM – 7:30 PM · English & ChatGPT", fill="#94a3b8", font=font_role_meta)

# Card Role 2: Field Sales Executive
r2_y = 345
draw.rounded_rectangle([(rx, r2_y), (og_w - 55, r2_y + 130)], radius=14, fill="#1e293b", outline="#334155", width=1)
draw.text((rx + 20, r2_y + 15), "2. Field Sales Executive", fill="#f8fafc", font=font_role_title)
draw.text((rx + 20, r2_y + 55), "Salary: ₹15,000 – ₹18,000 / mo + Fuel + Incentives", fill="#34d399", font=font_role_meta)
draw.text((rx + 20, r2_y + 88), "Timing: (Mon-Sat) 10:00 AM – 7:30 PM · 2-Wheeler Mandatory", fill="#94a3b8", font=font_role_meta)

# Footer CTA
draw.rounded_rectangle([(rx, 495), (og_w - 55, 555)], radius=12, fill="#0d9488")
draw.text((rx + 24, 510), "👉 Apply Online: stonetech.in/careers", fill="#ffffff", font=font_footer)

og.save("public/branding/careers-og-banner.png", "PNG")
print("Saved public/branding/careers-og-banner.png successfully.")

# 3. Generate Vertical WhatsApp Status / Instagram Story Flyer (1080x1920)
story_w, story_h = 1080, 1920
story = Image.new("RGB", (story_w, story_h), "#090d16")
s_draw = ImageDraw.Draw(story)

# Accent borders
s_draw.rectangle([(0, 0), (story_w, 20)], fill="#0d9488")
s_draw.rectangle([(0, story_h - 20), (story_w, story_h)], fill="#0d9488")

# Top logo container
logo_box_w, logo_box_h = 880, 360
logo_box = Image.new("RGBA", (logo_box_w, logo_box_h), (255, 255, 255, 255))
s_scale = min(780 / w, 320 / h)
sw, sh = int(w * s_scale), int(h * s_scale)
sl = logo_raw.resize((sw, sh), Image.Resampling.LANCZOS)
logo_box.paste(sl, ((logo_box_w - sw) // 2, (logo_box_h - sh) // 2), sl)
story.paste(logo_box.convert("RGB"), (100, 70))

try:
    s_font_badge = ImageFont.truetype(font_path, 34, index=1)
    s_font_h1 = ImageFont.truetype(font_path, 64, index=1)
    s_font_sub = ImageFont.truetype(font_path, 36, index=0)
    s_font_rtitle = ImageFont.truetype(font_path, 42, index=1)
    s_font_rsal = ImageFont.truetype(font_path, 36, index=1)
    s_font_rbody = ImageFont.truetype(font_path, 30, index=0)
    s_font_cta = ImageFont.truetype(font_path, 40, index=1)
    s_font_cta_sub = ImageFont.truetype(font_path, 30, index=0)
except Exception:
    s_font_badge = ImageFont.load_default()
    s_font_h1 = ImageFont.load_default()
    s_font_sub = ImageFont.load_default()
    s_font_rtitle = ImageFont.load_default()
    s_font_rsal = ImageFont.load_default()
    s_font_rbody = ImageFont.load_default()
    s_font_cta = ImageFont.load_default()
    s_font_cta_sub = ImageFont.load_default()

# Hiring badge
s_draw.rounded_rectangle([(300, 465), (780, 525)], radius=18, fill="#042f2e", outline="#14b8a6", width=2)
s_draw.text((340, 477), "WE ARE HIRING!", fill="#2dd4bf", font=s_font_badge)

s_draw.text((100, 560), "Join Our Team at Stone Tech", fill="#ffffff", font=s_font_h1)
s_draw.text((100, 645), "📍 Location: SG Business Hub, Gota, Ahmedabad", fill="#cbd5e1", font=s_font_sub)

# Card 1: Data Entry Executive
c1_y = 730
s_draw.rounded_rectangle([(80, c1_y), (1000, c1_y + 380)], radius=24, fill="#131c2e", outline="#334155", width=2)
s_draw.text((120, c1_y + 30), "1️⃣ Data Entry Executive", fill="#ffffff", font=s_font_rtitle)
s_draw.text((120, c1_y + 90), "Salary: ₹12,000 – ₹15,000 / month", fill="#34d399", font=s_font_rsal)
s_draw.text((120, c1_y + 155), "• Role: Enter & maintain ERP/CRM data", fill="#e2e8f0", font=s_font_rbody)
s_draw.text((120, c1_y + 200), "• Coordinate with vendors, agencies & customers", fill="#e2e8f0", font=s_font_rbody)
s_draw.text((120, c1_y + 245), "• Skills: English writing, ChatGPT, Word/Excel/PDF editing", fill="#94a3b8", font=s_font_rbody)
s_draw.text((120, c1_y + 290), "• Timing: (Mon-Sat) 10:00 AM – 7:30 PM", fill="#94a3b8", font=s_font_rbody)

# Card 2: Field Sales Executive
c2_y = 1140
s_draw.rounded_rectangle([(80, c2_y), (1000, c2_y + 380)], radius=24, fill="#131c2e", outline="#334155", width=2)
s_draw.text((120, c2_y + 30), "2️⃣ Field Sales Executive", fill="#ffffff", font=s_font_rtitle)
s_draw.text((120, c2_y + 90), "Salary: ₹15,000 – ₹18,000 / mo + Fuel + Incentives", fill="#34d399", font=s_font_rsal)
s_draw.text((120, c2_y + 155), "• Role: Connect with Architects, Interior Designers & PMCs", fill="#e2e8f0", font=s_font_rbody)
s_draw.text((120, c2_y + 200), "• Visit construction sites & architectural offices", fill="#e2e8f0", font=s_font_rbody)
s_draw.text((120, c2_y + 245), "• Mandatory: Own Two-Wheeler & Valid Driving License", fill="#f59e0b", font=s_font_rbody)
s_draw.text((120, c2_y + 290), "• Timing: (Mon-Sat) 10:00 AM – 7:30 PM · Gujarati/Hindi/English", fill="#94a3b8", font=s_font_rbody)

# Bottom Call To Action Button Box
s_draw.rounded_rectangle([(80, 1550), (1000, 1720)], radius=24, fill="#0d9488")
s_draw.text((130, 1585), "👉 Tap / Click Link to Apply Online", fill="#ffffff", font=s_font_cta)
s_draw.text((130, 1645), "🌐 stonetech.in/careers  |  📱 WhatsApp: 7742090866", fill="#e6fffa", font=s_font_cta_sub)

s_draw.text((250, 1790), "Stone Tech Architectural Stone Atelier", fill="#64748b", font=s_font_rbody)

story.save("public/branding/hiring-story-flyer.png", "PNG")
print("Saved public/branding/hiring-story-flyer.png successfully.")

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/patch_flexible_clay_full.py
Patches compile-flexible-clay-multilingual.py with:
- Localized PUNCH_TRAVENTINO and PUNCH_SLAT cards (name, tone, desc, badges, sizing)
- Localized Page 36 Installation Guide
- Localized Page 37 Technical Matrix & Export Packaging
"""

import os

FILE_PATH = os.path.abspath("scripts/compile-flexible-clay-multilingual.py")

with open(FILE_PATH, "r", encoding="utf-8") as f:
    c = f.read()

# 1. Update Traventino loop (PAGES 24 - 28)
old_trav_loop = """    for i in range(0, len(PUNCH_TRAVENTINO), 2):
        page_num = 24 + (i // 2)
        s1 = PUNCH_TRAVENTINO[i]
        s2 = PUNCH_TRAVENTINO[i+1]
        img1_path = os.path.join(ASSETS_DIR, f"{s1['slug']}.jpg")
        img2_path = os.path.join(ASSETS_DIR, f"{s2['slug']}.jpg")

        parts.append(f\"\"\"
<div class="page" style="padding:0;">
  <div class="prod-header">
    <div class="prod-header-left">
      <img src="file://{EMBLEM_PATH}" class="prod-emblem">
      <div class="prod-brand-lockup">
        <span class="prod-brand-name">STONE TECH ATELIER</span>
        <span class="prod-division-tag">FLEXIBLE CLAY VENEERS</span>
        <span style="font-size:6.5pt;background:#fef3c7;border:1px solid #fde68a;color:#b45309;padding:0.6mm 2mm;border-radius:1mm;font-weight:700;">COLLECTION 02 · PUNCH TRAVENTINO</span>
      </div>
    </div>
    <div class="prod-header-right">
      FACTORY DIRECT ORDERS: <strong>+91 77420 90866 / +91 97844 52998</strong> · <strong>WWW.STONETECH.IN</strong>
    </div>
  </div>

  <div class="slabs-dual-grid">
    <div class="slab-card">
      <div class="slab-frame">
        <img src="file://{img1_path}" class="slab-img">
      </div>
      <div class="slab-info">
        <div class="slab-head">
          <div class="slab-code">{s1['code']}</div>
          <div class="slab-name">{s1['name']}</div>
          <div class="slab-tone">{s1['tone']}</div>
        </div>
        <div class="slab-sizes-box">
          <div class="slab-sizes-title">Available Sizing Profiles</div>
          <div class="slab-size-chips">
            <div class="slab-size-chip">{localize_dimensions('600 × 1200 mm', lang)}</div>
            <div class="slab-size-chip">{localize_dimensions('600 × 1500 mm', lang)}</div>
            <div class="slab-size-chip">{localize_dimensions('1200 × 2400 mm', lang)}</div>
            <div class="slab-size-chip">{localize_dimensions('1200 × 3000 mm', lang)}</div>
          </div>
        </div>
        <div class="slab-badges-list">
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Ultra Lightweight (~{localize_dimensions('4.0 kg/m²', lang)})</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Highly Flexible (R ≥ {to_indic(200, lang)} mm)</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Durable & Long Lasting Life</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Water & Weather Resistant</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Easy to Cut & Fast Install</div>
        </div>
        <div class="slab-desc-box">
          {s1['desc']}
        </div>
      </div>
    </div>

    <div class="slab-card">
      <div class="slab-frame">
        <img src="file://{img2_path}" class="slab-img">
      </div>
      <div class="slab-info">
        <div class="slab-head">
          <div class="slab-code">{s2['code']}</div>
          <div class="slab-name">{s2['name']}</div>
          <div class="slab-tone">{s2['tone']}</div>
        </div>
        <div class="slab-sizes-box">
          <div class="slab-sizes-title">Available Sizing Profiles</div>
          <div class="slab-size-chips">
            <div class="slab-size-chip">{localize_dimensions('600 × 1200 mm', lang)}</div>
            <div class="slab-size-chip">{localize_dimensions('600 × 1500 mm', lang)}</div>
            <div class="slab-size-chip">{localize_dimensions('1200 × 2400 mm', lang)}</div>
            <div class="slab-size-chip">{localize_dimensions('1200 × 3000 mm', lang)}</div>
          </div>
        </div>
        <div class="slab-badges-list">
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Ultra Lightweight (~{localize_dimensions('4.0 kg/m²', lang)})</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Highly Flexible (R ≥ {to_indic(200, lang)} mm)</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Durable & Long Lasting Life</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Water & Weather Resistant</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Easy to Cut & Fast Install</div>
        </div>
        <div class="slab-desc-box">
          {s2['desc']}
        </div>
      </div>
    </div>
  </div>"""

new_trav_loop = """    for i in range(0, len(PUNCH_TRAVENTINO), 2):
        page_num = 24 + (i // 2)
        s1 = PUNCH_TRAVENTINO[i]
        s2 = PUNCH_TRAVENTINO[i+1]
        img1_path = os.path.join(ASSETS_DIR, f"{s1['slug']}.jpg")
        img2_path = os.path.join(ASSETS_DIR, f"{s2['slug']}.jpg")

        loc1 = SLABS_I18N.get(s1['code'], {})
        loc2 = SLABS_I18N.get(s2['code'], {})
        name1 = loc1.get(f"name_{lang}", s1['name']) if lang != "en" else s1['name']
        tone1 = loc1.get(f"tone_{lang}", s1['tone']) if lang != "en" else s1['tone']
        desc1 = loc1.get(f"desc_{lang}", s1['desc']) if lang != "en" else s1['desc']
        name2 = loc2.get(f"name_{lang}", s2['name']) if lang != "en" else s2['name']
        tone2 = loc2.get(f"tone_{lang}", s2['tone']) if lang != "en" else s2['tone']
        desc2 = loc2.get(f"desc_{lang}", s2['desc']) if lang != "en" else s2['desc']

        sz_title = "उपलब्ध साइज़िंग प्रोफाइल्स" if lang == "hi" else ("ઉપલબ્ધ સાઇઝિંગ પ્રોફાઇલ્સ" if lang == "gu" else "Available Sizing Profiles")
        bdg_light = f"अत्यंत हल्की (~{localize_dimensions('4.0 kg/m²', lang)})" if lang == "hi" else (f"અત્યંત હળવી (~{localize_dimensions('4.0 kg/m²', lang)})" if lang == "gu" else f"Ultra Lightweight (~{localize_dimensions('4.0 kg/m²', lang)})")
        bdg_flex = f"अत्यधिक लचीली (R ≥ {to_indic(200, lang)} मिमी)" if lang == "hi" else (f"અત્યંત લચીલી (R ≥ {to_indic(200, lang)} મીમી)" if lang == "gu" else f"Highly Flexible (R ≥ {to_indic(200, lang)} mm)")
        bdg_dur = "दीर्घकालिक एवं टिकाऊ जीवन" if lang == "hi" else ("લાંબા આયુષ્યવાળી અને ટકાઉ" if lang == "gu" else "Durable & Long Lasting Life")
        bdg_water = "जल एवं मौसम प्रतिरोधी" if lang == "hi" else ("પાણી અને વાતાવરણ પ્રતિરોધક" if lang == "gu" else "Water & Weather Resistant")
        bdg_easy = "सहज कटाई एवं त्वरित स्थापना" if lang == "hi" else ("સરળ કટિંગ અને ઝડપી સ્થાપન" if lang == "gu" else "Easy to Cut & Fast Install")

        parts.append(f\"\"\"
<div class="page" style="padding:0;">
  <div class="prod-header">
    <div class="prod-header-left">
      <img src="file://{EMBLEM_PATH}" class="prod-emblem">
      <div class="prod-brand-lockup">
        <span class="prod-brand-name">STONE TECH ATELIER</span>
        <span class="prod-division-tag">{"फ्लेक्सिबल क्ले विनियर्स" if lang == "hi" else ("ફ્લેક્સિબલ ક્લે વિનિયર્સ" if lang == "gu" else "FLEXIBLE CLAY VENEERS")}</span>
        <span style="font-size:6.5pt;background:#fef3c7;border:1px solid #fde68a;color:#b45309;padding:0.6mm 2mm;border-radius:1mm;font-weight:700;">{"संग्रह ०२ · पंच ट्रावेरटिनो" if lang == "hi" else ("સંગ્રહ ૦૨ · પંચ ટ્રાવર્ટિનો" if lang == "gu" else "COLLECTION 02 · PUNCH TRAVENTINO")}</span>
      </div>
    </div>
    <div class="prod-header-right">
      {"फैक्ट्री सीधी पूछताछ:" if lang == "hi" else ("ફેક્ટરી સીધી પૂછપરછ:" if lang == "gu" else "FACTORY DIRECT ORDERS:")} <strong>+91 77420 90866 / +91 97844 52998</strong> · <strong>WWW.STONETECH.IN</strong>
    </div>
  </div>

  <div class="slabs-dual-grid">
    <div class="slab-card">
      <div class="slab-frame">
        <img src="file://{img1_path}" class="slab-img">
      </div>
      <div class="slab-info">
        <div class="slab-head">
          <div class="slab-code">{s1['code']}</div>
          <div class="slab-name">{name1}</div>
          <div class="slab-tone">{tone1}</div>
        </div>
        <div class="slab-sizes-box">
          <div class="slab-sizes-title">{sz_title}</div>
          <div class="slab-size-chips">
            <div class="slab-size-chip">{localize_dimensions('600 × 1200 mm', lang)}</div>
            <div class="slab-size-chip">{localize_dimensions('600 × 1500 mm', lang)}</div>
            <div class="slab-size-chip">{localize_dimensions('1200 × 2400 mm', lang)}</div>
            <div class="slab-size-chip">{localize_dimensions('1200 × 3000 mm', lang)}</div>
          </div>
        </div>
        <div class="slab-badges-list">
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> {bdg_light}</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> {bdg_flex}</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> {bdg_dur}</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> {bdg_water}</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> {bdg_easy}</div>
        </div>
        <div class="slab-desc-box">
          {desc1}
        </div>
      </div>
    </div>

    <div class="slab-card">
      <div class="slab-frame">
        <img src="file://{img2_path}" class="slab-img">
      </div>
      <div class="slab-info">
        <div class="slab-head">
          <div class="slab-code">{s2['code']}</div>
          <div class="slab-name">{name2}</div>
          <div class="slab-tone">{tone2}</div>
        </div>
        <div class="slab-sizes-box">
          <div class="slab-sizes-title">{sz_title}</div>
          <div class="slab-size-chips">
            <div class="slab-size-chip">{localize_dimensions('600 × 1200 mm', lang)}</div>
            <div class="slab-size-chip">{localize_dimensions('600 × 1500 mm', lang)}</div>
            <div class="slab-size-chip">{localize_dimensions('1200 × 2400 mm', lang)}</div>
            <div class="slab-size-chip">{localize_dimensions('1200 × 3000 mm', lang)}</div>
          </div>
        </div>
        <div class="slab-badges-list">
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> {bdg_light}</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> {bdg_flex}</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> {bdg_dur}</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> {bdg_water}</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> {bdg_easy}</div>
        </div>
        <div class="slab-desc-box">
          {desc2}
        </div>
      </div>
    </div>
  </div>"""

if old_trav_loop in c:
    c = c.replace(old_trav_loop, new_trav_loop)
    print("Replaced Traventino loop")
else:
    print("Traventino loop not found!")

# 2. Update Slat loop (PAGES 30 - 35)
old_slat_loop = """    for i in range(0, len(PUNCH_SLAT), 2):
        page_num = 30 + (i // 2)
        s1 = PUNCH_SLAT[i]
        s2 = PUNCH_SLAT[i+1]
        img1_path = os.path.join(ASSETS_DIR, f"{s1['slug']}.jpg")
        img2_path = os.path.join(ASSETS_DIR, f"{s2['slug']}.jpg")

        parts.append(f\"\"\"
<div class="page" style="padding:0;">
  <div class="prod-header">
    <div class="prod-header-left">
      <img src="file://{EMBLEM_PATH}" class="prod-emblem">
      <div class="prod-brand-lockup">
        <span class="prod-brand-name">STONE TECH ATELIER</span>
        <span class="prod-division-tag">FLEXIBLE CLAY VENEERS</span>
        <span style="font-size:6.5pt;background:#fef3c7;border:1px solid #fde68a;color:#b45309;padding:0.6mm 2mm;border-radius:1mm;font-weight:700;">COLLECTION 03 · PUNCH SLAT</span>
      </div>
    </div>
    <div class="prod-header-right">
      FACTORY DIRECT ORDERS: <strong>+91 77420 90866 / +91 97844 52998</strong> · <strong>WWW.STONETECH.IN</strong>
    </div>
  </div>

  <div class="slabs-dual-grid">
    <div class="slab-card">
      <div class="slab-frame">
        <img src="file://{img1_path}" class="slab-img">
      </div>
      <div class="slab-info">
        <div class="slab-head">
          <div class="slab-code">{s1['code']}</div>
          <div class="slab-name">{s1['name']}</div>
          <div class="slab-tone">{s1['tone']}</div>
        </div>
        <div class="slab-sizes-box">
          <div class="slab-sizes-title">Available Sizing Profiles</div>
          <div class="slab-size-chips">
            <div class="slab-size-chip">{localize_dimensions('600 × 1200 mm', lang)}</div>
            <div class="slab-size-chip">{localize_dimensions('600 × 1500 mm', lang)}</div>
            <div class="slab-size-chip">{localize_dimensions('1200 × 2400 mm', lang)}</div>
            <div class="slab-size-chip">{localize_dimensions('1200 × 3000 mm', lang)}</div>
          </div>
        </div>
        <div class="slab-badges-list">
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Ultra Lightweight (~{localize_dimensions('4.0 kg/m²', lang)})</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Highly Flexible (R ≥ {to_indic(200, lang)} mm)</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Durable & Long Lasting Life</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Water & Weather Resistant</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Easy to Cut & Fast Install</div>
        </div>
        <div class="slab-desc-box">
          {s1['desc']}
        </div>
      </div>
    </div>

    <div class="slab-card">
      <div class="slab-frame">
        <img src="file://{img2_path}" class="slab-img">
      </div>
      <div class="slab-info">
        <div class="slab-head">
          <div class="slab-code">{s2['code']}</div>
          <div class="slab-name">{s2['name']}</div>
          <div class="slab-tone">{s2['tone']}</div>
        </div>
        <div class="slab-sizes-box">
          <div class="slab-sizes-title">Available Sizing Profiles</div>
          <div class="slab-size-chips">
            <div class="slab-size-chip">{localize_dimensions('600 × 1200 mm', lang)}</div>
            <div class="slab-size-chip">{localize_dimensions('600 × 1500 mm', lang)}</div>
            <div class="slab-size-chip">{localize_dimensions('1200 × 2400 mm', lang)}</div>
            <div class="slab-size-chip">{localize_dimensions('1200 × 3000 mm', lang)}</div>
          </div>
        </div>
        <div class="slab-badges-list">
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Ultra Lightweight (~{localize_dimensions('4.0 kg/m²', lang)})</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Highly Flexible (R ≥ {to_indic(200, lang)} mm)</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Durable & Long Lasting Life</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Water & Weather Resistant</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> Easy to Cut & Fast Install</div>
        </div>
        <div class="slab-desc-box">
          {s2['desc']}
        </div>
      </div>
    </div>
  </div>"""

new_slat_loop = """    for i in range(0, len(PUNCH_SLAT), 2):
        page_num = 30 + (i // 2)
        s1 = PUNCH_SLAT[i]
        s2 = PUNCH_SLAT[i+1]
        img1_path = os.path.join(ASSETS_DIR, f"{s1['slug']}.jpg")
        img2_path = os.path.join(ASSETS_DIR, f"{s2['slug']}.jpg")

        loc1 = SLABS_I18N.get(s1['code'], {})
        loc2 = SLABS_I18N.get(s2['code'], {})
        name1 = loc1.get(f"name_{lang}", s1['name']) if lang != "en" else s1['name']
        tone1 = loc1.get(f"tone_{lang}", s1['tone']) if lang != "en" else s1['tone']
        desc1 = loc1.get(f"desc_{lang}", s1['desc']) if lang != "en" else s1['desc']
        name2 = loc2.get(f"name_{lang}", s2['name']) if lang != "en" else s2['name']
        tone2 = loc2.get(f"tone_{lang}", s2['tone']) if lang != "en" else s2['tone']
        desc2 = loc2.get(f"desc_{lang}", s2['desc']) if lang != "en" else s2['desc']

        sz_title = "उपलब्ध साइज़िंग प्रोफाइल्स" if lang == "hi" else ("ઉપલબ્ધ સાઇઝિંગ પ્રોફાઇલ્સ" if lang == "gu" else "Available Sizing Profiles")
        bdg_light = f"अत्यंत हल्की (~{localize_dimensions('4.0 kg/m²', lang)})" if lang == "hi" else (f"અત્યંત હળવી (~{localize_dimensions('4.0 kg/m²', lang)})" if lang == "gu" else f"Ultra Lightweight (~{localize_dimensions('4.0 kg/m²', lang)})")
        bdg_flex = f"अत्यधिक लचीली (R ≥ {to_indic(200, lang)} मिमी)" if lang == "hi" else (f"અત્યંત લચીલી (R ≥ {to_indic(200, lang)} મીમી)" if lang == "gu" else f"Highly Flexible (R ≥ {to_indic(200, lang)} mm)")
        bdg_dur = "दीर्घकालिक एवं टिकाऊ जीवन" if lang == "hi" else ("લાંબા આયુષ્યવાળી અને ટકાઉ" if lang == "gu" else "Durable & Long Lasting Life")
        bdg_water = "जल एवं मौसम प्रतिरोधी" if lang == "hi" else ("પાણી અને વાતાવરણ પ્રતિરોધક" if lang == "gu" else "Water & Weather Resistant")
        bdg_easy = "सहज कटाई एवं त्वरित स्थापना" if lang == "hi" else ("સરળ કટિંગ અને ઝડપી સ્થાપન" if lang == "gu" else "Easy to Cut & Fast Install")

        parts.append(f\"\"\"
<div class="page" style="padding:0;">
  <div class="prod-header">
    <div class="prod-header-left">
      <img src="file://{EMBLEM_PATH}" class="prod-emblem">
      <div class="prod-brand-lockup">
        <span class="prod-brand-name">STONE TECH ATELIER</span>
        <span class="prod-division-tag">{"फ्लेक्सिबल क्ले विनियर्स" if lang == "hi" else ("ફ્લેક્સિબલ ક્લે વિનિયર્સ" if lang == "gu" else "FLEXIBLE CLAY VENEERS")}</span>
        <span style="font-size:6.5pt;background:#fef3c7;border:1px solid #fde68a;color:#b45309;padding:0.6mm 2mm;border-radius:1mm;font-weight:700;">{"संग्रह ०३ · पंच स्लेट" if lang == "hi" else ("સંગ્રહ ૦૩ · પંચ સ્લેટ" if lang == "gu" else "COLLECTION 03 · PUNCH SLAT")}</span>
      </div>
    </div>
    <div class="prod-header-right">
      {"फैक्ट्री सीधी पूछताछ:" if lang == "hi" else ("ફેક્ટરી સીધી પૂછપરછ:" if lang == "gu" else "FACTORY DIRECT ORDERS:")} <strong>+91 77420 90866 / +91 97844 52998</strong> · <strong>WWW.STONETECH.IN</strong>
    </div>
  </div>

  <div class="slabs-dual-grid">
    <div class="slab-card">
      <div class="slab-frame">
        <img src="file://{img1_path}" class="slab-img">
      </div>
      <div class="slab-info">
        <div class="slab-head">
          <div class="slab-code">{s1['code']}</div>
          <div class="slab-name">{name1}</div>
          <div class="slab-tone">{tone1}</div>
        </div>
        <div class="slab-sizes-box">
          <div class="slab-sizes-title">{sz_title}</div>
          <div class="slab-size-chips">
            <div class="slab-size-chip">{localize_dimensions('600 × 1200 mm', lang)}</div>
            <div class="slab-size-chip">{localize_dimensions('600 × 1500 mm', lang)}</div>
            <div class="slab-size-chip">{localize_dimensions('1200 × 2400 mm', lang)}</div>
            <div class="slab-size-chip">{localize_dimensions('1200 × 3000 mm', lang)}</div>
          </div>
        </div>
        <div class="slab-badges-list">
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> {bdg_light}</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> {bdg_flex}</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> {bdg_dur}</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> {bdg_water}</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> {bdg_easy}</div>
        </div>
        <div class="slab-desc-box">
          {desc1}
        </div>
      </div>
    </div>

    <div class="slab-card">
      <div class="slab-frame">
        <img src="file://{img2_path}" class="slab-img">
      </div>
      <div class="slab-info">
        <div class="slab-head">
          <div class="slab-code">{s2['code']}</div>
          <div class="slab-name">{name2}</div>
          <div class="slab-tone">{tone2}</div>
        </div>
        <div class="slab-sizes-box">
          <div class="slab-sizes-title">{sz_title}</div>
          <div class="slab-size-chips">
            <div class="slab-size-chip">{localize_dimensions('600 × 1200 mm', lang)}</div>
            <div class="slab-size-chip">{localize_dimensions('600 × 1500 mm', lang)}</div>
            <div class="slab-size-chip">{localize_dimensions('1200 × 2400 mm', lang)}</div>
            <div class="slab-size-chip">{localize_dimensions('1200 × 3000 mm', lang)}</div>
          </div>
        </div>
        <div class="slab-badges-list">
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> {bdg_light}</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> {bdg_flex}</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> {bdg_dur}</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> {bdg_water}</div>
          <div class="slab-badge-item"><div class="slab-badge-dot"></div> {bdg_easy}</div>
        </div>
        <div class="slab-desc-box">
          {desc2}
        </div>
      </div>
    </div>
  </div>"""

if old_slat_loop in c:
    c = c.replace(old_slat_loop, new_slat_loop)
    print("Replaced Slat loop")
else:
    print("Slat loop not found!")

# 3. Update Page 36 (Installation Guide)
old_p36 = """    guide_title = (
        "Architectural Installation Field Guide" if lang == "en"
        else "आर्किटेक्चरल इंस्टॉलेशन फील्ड गाइड" if lang == "hi"
        else "આર્કિટેક્ચરલ ઇન્સ્ટોલેશન ફીલ્ડ ગાઇડ"
    )
    s1_title = "SUBSTRATE PREPARATION" if lang == "en" else "सब्सट्रेट की तैयारी" if lang == "hi" else "સબસ્ટ્રેટની તૈયારી"
    s2_title = "ADHESIVE NOTCH TROWELING" if lang == "en" else "एडहेसिव नॉच ट्रोवेलिंग" if lang == "hi" else "એડહેસિવ નોચ ટ્રોવેલિંગ"
    s3_title = "SHEET POSITIONING & BENDING" if lang == "en" else "शीट पोजिशनिंग एवं बेंडिंग" if lang == "hi" else "શીટ પોઝિશનિંગ અને બેન્ડિંગ"
    s4_title = "RUBBER ROLLER COMPACTION" if lang == "en" else "रबर रोलर कॉम्पेक्शन" if lang == "hi" else "રબર રોલર કોમ્પેક્શન"
    s5_title = "SEAM JOINTING & GROUTING" if lang == "en" else "सीम जॉइंटिंग एवं ग्राउटिंग" if lang == "hi" else "સીમ જોઈન્ટિંગ અને ગ્રાઉટિંગ"
    s6_title = "EDGE TRIMMING & SEALING" if lang == "en" else "एज ट्रिमिंग एवं सीलिंग" if lang == "hi" else "એજ ટ્રીમિંગ અને સીલિંગ"

    parts.append(f\"\"\"
<div class="page" style="padding:0;">
  <div class="prod-header">
    <div class="prod-header-left">
      <img src="file://{EMBLEM_PATH}" class="prod-emblem">
      <div class="prod-brand-lockup">
        <span class="prod-brand-name">STONE TECH ATELIER</span>
        <span class="prod-division-tag">FLEXIBLE CLAY VENEERS</span>
        <span style="font-size:6.5pt;background:#fef3c7;border:1px solid #fde68a;color:#b45309;padding:0.6mm 2mm;border-radius:1mm;font-weight:700;">FIELD PROTOCOL</span>
      </div>
    </div>
    <div class="prod-header-right">
      TECHNICAL ASSISTANCE: <strong>+91 77420 90866 / +91 97844 52998</strong> · <strong>WWW.STONETECH.IN</strong>
    </div>
  </div>

  <div class="install-page">
    <div class="install-header-box">
      <div class="install-subtitle">OFFICIAL SITE WORKFLOW</div>
      <div class="install-title">{guide_title}</div>
    </div>

    <div class="install-grid">
      <div class="install-step-card">
        <div class="step-num">STEP {to_indic('01', lang)}</div>
        <div class="step-head">{s1_title}</div>
        <div class="step-desc">
          Ensure substrate (concrete, sand-cement plaster, AAC blocks, calcium silicate board, or plywood) is structurally sound, clean, flat (±2mm over 2m), free of dust, grease, and curing compounds.
        </div>
      </div>

      <div class="install-step-card">
        <div class="step-num">STEP {to_indic('02', lang)}</div>
        <div class="step-head">{s2_title}</div>
        <div class="step-desc">
          Apply high-performance polymer-modified cementitious tile adhesive (C2TE S1/S2 grade) or polyurethane structural adhesive using a 4mm to 6mm square notch trowel.
        </div>
      </div>

      <div class="install-step-card">
        <div class="step-num">STEP {to_indic('03', lang)}</div>
        <div class="step-head">{s3_title}</div>
        <div class="step-desc">
          Align flexible veneer sheet starting from top or bottom guidelines. For curved columns or radius walls (R ≥ 200 mm), wrap smoothly around the contour with gentle uniform tension.
        </div>
      </div>

      <div class="install-step-card">
        <div class="step-num">STEP {to_indic('04', lang)}</div>
        <div class="step-head">{s4_title}</div>
        <div class="step-desc">
          Press firmly using a wide rubber roller across the entire sheet surface, rolling from center outward to expel trapped air and ensure 100% adhesive transfer without hollow pockets.
        </div>
      </div>

      <div class="install-step-card">
        <div class="step-num">STEP {to_indic('05', lang)}</div>
        <div class="step-head">{s5_title}</div>
        <div class="step-desc">
          Sheets can be installed with hairline tight butt-joints or architectural open joints (2mm – 5mm). For exterior facades, seal joints with matching color UV-stable polyurethane sealant.
        </div>
      </div>

      <div class="install-step-card">
        <div class="step-num">STEP {to_indic('06', lang)}</div>
        <div class="step-head">{s6_title}</div>
        <div class="step-desc">
          Cut easily on-site using a heavy-duty utility knife, oscillating cutter, or fine-tooth circular saw. Wipe clean with a damp sponge. Apply breathable silane impregnator for exterior facades.
        </div>
      </div>
    </div>

    <div class="install-notes-box">
      <strong>CRITICAL ENGINEERING NOTE:</strong> Flexible Clay Veneers require zero mechanical anchor pins, drilled bolts, or heavy aluminum substructures for heights up to 24 meters, provided structural substrate adhesion exceeds 1.0 N/mm². Always verify adhesive compatibility on specialized substrates.
    </div>
  </div>"""

new_p36 = """    guide_title = (
        "Architectural Installation Field Guide" if lang == "en"
        else "वास्तुशिल्पीय स्थापना फील्ड गाइड" if lang == "hi"
        else "વાસ્તુશિલ્પીય સ્થાપન ફીલ્ડ માર્ગદર્શિકા"
    )
    s1_title = "SUBSTRATE PREPARATION" if lang == "en" else "सब्सट्रेट की तैयारी" if lang == "hi" else "સબસ્ટ્રેટની તૈયારી"
    s2_title = "ADHESIVE NOTCH TROWELING" if lang == "en" else "एडहेसिव नॉच ट्रोवेलिंग" if lang == "hi" else "એડહેસિવ નોચ ટ્રોવેલિંગ"
    s3_title = "SHEET POSITIONING & BENDING" if lang == "en" else "शीट पोजिशनिंग एवं बेंडिंग" if lang == "hi" else "શીટ પોઝિશનિંગ અને બેન્ડિંગ"
    s4_title = "RUBBER ROLLER COMPACTION" if lang == "en" else "रबर रोलर कॉम्पेक्शन" if lang == "hi" else "રબર રોલર કોમ્પેક્શન"
    s5_title = "SEAM JOINTING & GROUTING" if lang == "en" else "सीम जॉइंटिंग एवं ग्राउटिंग" if lang == "hi" else "સીમ જોઈન્ટિંગ અને ગ્રાઉટિંગ"
    s6_title = "EDGE TRIMMING & SEALING" if lang == "en" else "एज ट्रिमिंग एवं सीलिंग" if lang == "hi" else "એજ ટ્રીમિંગ અને સીલિંગ"

    d1 = "सुनिश्चित करें कि सबस्ट्रेट (कंक्रीट, प्लास्टर, AAC ब्लॉक अथवा प्लाईवुड) समतल, स्वच्छ, सूखा और धूल-मुक्त है।" if lang == "hi" else ("ખાતરી કરો કે સબસ્ટ્રેટ (કોંક્રિટ, પ્લાસ્ટર, AAC બ્લોક કે પ્લાયવુડ) સપાટ, સ્વચ્છ, સૂકું અને ધૂળ-મુક્ત છે." if lang == "gu" else "Ensure substrate (concrete, sand-cement plaster, AAC blocks, calcium silicate board, or plywood) is structurally sound, clean, flat (±2mm over 2m), free of dust, grease, and curing compounds.")
    d2 = "४ से ६ मिमी स्क्वायर नॉच ट्रोवेल द्वारा C2TE S1/S2 ग्रेड पॉलिमर सीमेंट अथवा पॉलीयुरेथेन एडहेसिव समान रूप से लगाएं।" if lang == "hi" else ("૪ થી ૬ મીમી સ્ક્વેર નોચ ટ્રોવેલ વડે C2TE S1/S2 ગ્રેડ પોલિમર સિમેન્ટ અથવા પોલિયુરેથેન એડહેસિવ સમાનરૂપે લગાવો." if lang == "gu" else "Apply high-performance polymer-modified cementitious tile adhesive (C2TE S1/S2 grade) or polyurethane structural adhesive using a 4mm to 6mm square notch trowel.")
    d3 = "लचीली विनियर शीट को दिशा-निर्देश अनुसार संरेखित करें। घुमावदार खंभों (R ≥ २०० मिमी) पर समान तनाव के साथ सुचारू रूप से लपेटें।" if lang == "hi" else ("લચીલી વિનિયર શીટને દિશા-નિર્દેશ મુજબ ગોઠવો. ગોળાકાર થાંભલા (R ≥ ૨૦૦ મીમી) પર સમાન ખેંચાણ સાથે વીંટાળો." if lang == "gu" else "Align flexible veneer sheet starting from top or bottom guidelines. For curved columns or radius walls (R ≥ 200 mm), wrap smoothly around the contour with gentle uniform tension.")
    d4 = "चौड़े रबर रोलर द्वारा केंद्र से बाहर की ओर मजबूती से दबाते हुए फंसी हुई हवा निकालें ताकि १००% एडहेसिव जुड़ाव प्राप्त हो।" if lang == "hi" else ("પહોળા રબર રોલર વડે કેન્દ્રથી બહાર તરફ દબાવીને હવા બહાર કાઢો જેથી ૧૦૦% એડહેસિવ બોન્ડિંગ મળે." if lang == "gu" else "Press firmly using a wide rubber roller across the entire sheet surface, rolling from center outward to expel trapped air and ensure 100% adhesive transfer without hollow pockets.")
    d5 = "शीटों को बारीक बट-जॉइंट अथवा २ से ५ मिमी खुले जोड़ों के साथ लगाएं। बाहरी फ़साड हेतु यूवी-स्थिर पॉलीयुरेथेन सीलेंट से सील करें।" if lang == "hi" else ("શીટ્સને નજીકથી જોડીને અથવા ૨ થી ૫ મીમી ખુલ્લા સાંધા સાથે લગાવો. બહારના ફેસાડ માટે યુવી-સ્થિર સીલન્ટ વાપરો." if lang == "gu" else "Sheets can be installed with hairline tight butt-joints or architectural open joints (2mm – 5mm). For exterior facades, seal joints with matching color UV-stable polyurethane sealant.")
    d6 = "यूटिलिटी कटर अथवा बारीक दांतों वाली गोलाकार आरी से आसानी से काटें। बाहरी दीवारों हेतु साइलेन वाटरप्रूफिंग सीलर लगाएं।" if lang == "hi" else ("યુટિલિટી કટર અથવા કરવત વડે સરળતાથી કાપો. બહારની દીવાલો માટે સિલેન વોટરપ્રૂફિંગ સીલર લગાવો." if lang == "gu" else "Cut easily on-site using a heavy-duty utility knife, oscillating cutter, or fine-tooth circular saw. Wipe clean with a damp sponge. Apply breathable silane impregnator for exterior facades.")

    crit_note = "<strong>महत्वपूर्ण इंजीनियरिंग निर्देश:</strong> २४ मीटर तक की ऊंचाई हेतु लचीली क्ले विनियर को किसी यांत्रिक एंकर पिन या भारी एल्युमिनियम सबस्ट्रक्चर की आवश्यकता नहीं होती, बशर्ते सबस्ट्रेट आसंजन शक्ति १.० N/mm² से अधिक हो।" if lang == "hi" else ("<strong>મહત્વપૂર્ણ એન્જિનિયરિંગ નોંધ:</strong> ૨૪ મીટર સુધીની ઊંચાઈ માટે ફ્લેક્સિબલ ક્લે વિનિયરને કોઈ યાંત્રિક એન્કર પિન કે ભારે એલ્યુમિનિયમ ફ્રેમની જરૂર નથી, જો સબસ્ટ્રેટ પકડ શક્તિ ૧.૦ N/mm² થી વધુ હોય." if lang == "gu" else "<strong>CRITICAL ENGINEERING NOTE:</strong> Flexible Clay Veneers require zero mechanical anchor pins, drilled bolts, or heavy aluminum substructures for heights up to 24 meters, provided structural substrate adhesion exceeds 1.0 N/mm². Always verify adhesive compatibility on specialized substrates.")

    parts.append(f\"\"\"
<div class="page" style="padding:0;">
  <div class="prod-header">
    <div class="prod-header-left">
      <img src="file://{EMBLEM_PATH}" class="prod-emblem">
      <div class="prod-brand-lockup">
        <span class="prod-brand-name">STONE TECH ATELIER</span>
        <span class="prod-division-tag">{"फ्लेक्सिबल क्ले विनियर्स" if lang == "hi" else ("ફ્લેક્સિબલ ક્લે વિનિયર્સ" if lang == "gu" else "FLEXIBLE CLAY VENEERS")}</span>
        <span style="font-size:6.5pt;background:#fef3c7;border:1px solid #fde68a;color:#b45309;padding:0.6mm 2mm;border-radius:1mm;font-weight:700;">{"फील्ड प्रोटोकॉल" if lang == "hi" else ("ફિલ્ડ પ્રોટોકોલ" if lang == "gu" else "FIELD PROTOCOL")}</span>
      </div>
    </div>
    <div class="prod-header-right">
      {"तकनीकी सहायता:" if lang == "hi" else ("તકનીકી સહાય:" if lang == "gu" else "TECHNICAL ASSISTANCE:")} <strong>+91 77420 90866 / +91 97844 52998</strong> · <strong>WWW.STONETECH.IN</strong>
    </div>
  </div>

  <div class="install-page">
    <div class="install-header-box">
      <div class="install-subtitle">{"आधिकारिक साइट वर्कफ़्लो" if lang == "hi" else ("સત્તાવાર સાઇટ વર્કફ્લો" if lang == "gu" else "OFFICIAL SITE WORKFLOW")}</div>
      <div class="install-title">{guide_title}</div>
    </div>

    <div class="install-grid">
      <div class="install-step-card">
        <div class="step-num">STEP {to_indic('01', lang)}</div>
        <div class="step-head">{s1_title}</div>
        <div class="step-desc">
          {d1}
        </div>
      </div>

      <div class="install-step-card">
        <div class="step-num">STEP {to_indic('02', lang)}</div>
        <div class="step-head">{s2_title}</div>
        <div class="step-desc">
          {d2}
        </div>
      </div>

      <div class="install-step-card">
        <div class="step-num">STEP {to_indic('03', lang)}</div>
        <div class="step-head">{s3_title}</div>
        <div class="step-desc">
          {d3}
        </div>
      </div>

      <div class="install-step-card">
        <div class="step-num">STEP {to_indic('04', lang)}</div>
        <div class="step-head">{s4_title}</div>
        <div class="step-desc">
          {d4}
        </div>
      </div>

      <div class="install-step-card">
        <div class="step-num">STEP {to_indic('05', lang)}</div>
        <div class="step-head">{s5_title}</div>
        <div class="step-desc">
          {d5}
        </div>
      </div>

      <div class="install-step-card">
        <div class="step-num">STEP {to_indic('06', lang)}</div>
        <div class="step-head">{s6_title}</div>
        <div class="step-desc">
          {d6}
        </div>
      </div>
    </div>

    <div class="install-notes-box">
      {crit_note}
    </div>
  </div>"""

if old_p36 in c:
    c = c.replace(old_p36, new_p36)
    print("Replaced Page 36 Installation Guide")
else:
    print("Page 36 Installation Guide not found!")

# 4. Update Page 37 matrix title
old_matrix_title = """    matrix_title = (
        "ARCHITECTURAL PERFORMANCE & COMPLIANCE MATRIX" if lang == "en"
        else "आर्किटेक्चरल परफॉर्मेंस एवं कंप्लायंस मैट्रिक्स" if lang == "hi"
        else "આર્કિટેક્ચરલ પરફોર્મન્સ અને કમ્પ્લાયન્સ મેટ્રિક્સ"
    )"""

new_matrix_title = """    matrix_title = (
        "ARCHITECTURAL PERFORMANCE & COMPLIANCE MATRIX" if lang == "en"
        else "वास्तुशिल्पीय प्रदर्शन एवं अनुपालन मैट्रिक्स" if lang == "hi"
        else "વાસ્તુશિલ્પીય પ્રદર્શન અને અનુપાલન મેટ્રિક્સ"
    )"""

if old_matrix_title in c:
    c = c.replace(old_matrix_title, new_matrix_title)
    print("Replaced Matrix Title")

with open(FILE_PATH, "w", encoding="utf-8") as f:
    f.write(c)

print("Finished patching compile-flexible-clay-multilingual.py")

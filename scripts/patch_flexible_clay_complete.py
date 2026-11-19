# -*- coding: utf-8 -*-
"""Patch scripts/compile-flexible-clay-multilingual.py with pure Indic translations for all 18 3D textures,
dividers, headers, footers, phone numbers, and technical specifications."""

import os

FILE_PATH = os.path.abspath("scripts/compile-flexible-clay-multilingual.py")

with open(FILE_PATH, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Define TEXTURE_DESC_I18N dictionary to inject
texture_desc_dict = '''
TEXTURE_DESC_I18N = {
    "ST-FCV-001": {
        "desc_hi": "सटीक वास्तुशिल्पीय ऊर्ध्वाधर खांचे जो आवासीय विला, वाणिज्यिक पोडियम और आंतरिक दीवारों पर मनमोहक प्रकाश-छाया प्रभाव उत्पन्न करते हैं।",
        "desc_gu": "સચોટ વાસ્તુશિલ્પીય ઊભી ખાંચો જે રહેણાંક વિલા, વ્યાપારી પોડિયમ અને આંતરિક દિવાલો પર આકર્ષક પ્રકાશ-છાંયડો રચે છે.",
    },
    "ST-FCV-002": {
        "desc_hi": "सूक्ष्म बुश-हैमर्ड पाषाण सतह जो हस्त-निर्मित छेनी चिनाई की प्रामाणिक बनावट दर्शाती है, साथ ही अत्यंत लचीली और हल्की है।",
        "desc_gu": "ઝીણી બુશ-હેમર્ડ પાષાણ સપાટી જે હાથથી ઘડેલા પથ્થરની અધિકૃત રચના દર્શાવે છે, તેમજ અત્યંત લચીલી અને હળવી છે.",
    },
    "ST-FCV-003": {
        "desc_hi": "प्रवाही जल-तरंग रिलीफ जो घुमावदार अग्रभागों और डबल-हाइट लॉबी हेतु आदर्श है, और बिना किसी जोड़ के स्तंभों पर मुड़ जाती है।",
        "desc_gu": "પ્રવાહી જળ-તરંગ રિલીફ જે વળાંકવાળા ફેસાડ અને ડબલ-હાઇટ લોબી માટે શ્રેષ્ઠ છે, અને થાંભલાઓ પર સરળતાથી વળી જાય છે.",
    },
    "ST-FCV-004": {
        "desc_hi": "इंटरलॉकिंग बुनाई बास्केट ग्रिड जो समकालीन वास्तुशिल्प को स्पर्शनीय गहराई और सुरुचिपूर्ण बनावट प्रदान करती है।",
        "desc_gu": "ઇન્ટરલોકિંગ વણાયેલ બાસ્કેટ ગ્રિડ જે સમકાલીન વાસ્તુશિલ્પને સ્પર્શક્ષમ ઊંડાણ અને ભવ્ય રચના પ્રદાન કરે છે.",
    },
    "ST-FCV-005": {
        "desc_hi": "त्रि-आयामी घनाकार ज्यामिति जो दिन के बदलते सूर्य के प्रकाश के साथ गतिशील छाया और गहराई का प्रदर्शन करती है।",
        "desc_gu": "ત્રિ-પરિમાણીય સમઘન ભૂમિતિ જે દિવસના બદલાતા સૂર્યપ્રકાશ સાથે ગતિશીલ પડછાયાઓ અને ઊંડાણનું પ્રદર્શન કરે છે.",
    },
    "ST-FCV-006": {
        "desc_hi": "प्राचीन इटैलियन ऐशलर चिनाई से प्रेरित सतह जो ऐतिहासिक स्मारकीय भव्यता को आधुनिक हल्के रूप में प्रस्तुत करती है।",
        "desc_gu": "પ્રાચીન ઇટાલિયન એશલર ચણતરથી પ્રેરિત સપાટી જે ઐતિહાસિક ભવ્યતાને આધુનિક હળવા સ્વરૂપમાં રજૂ કરે છે.",
    },
    "ST-FCV-007": {
        "desc_hi": "सतत सूक्ष्म रेखीय खांचे जो दीवारों को दृश्य ऊंचाई और आधुनिक मिनिमलिस्ट सुरुचि प्रदान करते हैं।",
        "desc_gu": "સતત સૂક્ષ્મ રેખીય ખાંચો જે દિવાલોને દ્રશ્ય ઊંચાઈ અને આધુનિક મિનિમલિસ્ટ ભવ્યતા અર્પે છે.",
    },
    "ST-FCV-008": {
        "desc_hi": "मॉड्यूलर स्प्लिट-फेस वर्गाकार ग्रिड जो प्राकृतिक पाषाण खुरदरेपन और सममितीय व्यवस्था का संतुलन बनाती है।",
        "desc_gu": "મોડ્યુલર સ્પ્લિટ-ફેસ ચોરસ ગ્રિડ જે કુદરતી પથ્થરની ખરબચડી સપાટી અને સપ્રમાણ રચનાનું સંતુલન બનાવે છે.",
    },
    "ST-FCV-009": {
        "desc_hi": "प्राकृतिक नदी पाषाण जैसी चिकनी और जैविक सतह जो शांत, प्राकृतिक एवं ध्यानस्थ वातावरण का निर्माण करती है।",
        "desc_gu": "કુદરતી નદીના પથ્થર જેવી લીસી અને જૈવિક સપાટી જે શાંત, પ્રાકૃતિક અને ધ્યાનાકર્ષક વાતાવરણ સર્જે છે.",
    },
    "ST-FCV-010": {
        "desc_hi": "क्षितिज रेखा से प्रेरित क्षैतिज तरंगे जो विशाल अग्रभागों पर अनूठी भव्यता और विहंगम दृश्य प्रस्तुत करती हैं।",
        "desc_gu": "ક્ષિતિજ રેખાથી પ્રેરિત આડાં તરંગો જે વિશાળ ફેસાડ પર અનન્ય ભવ્યતા અને સુંદર દ્રશ્ય રજૂ કરે છે.",
    },
    "ST-FCV-011": {
        "desc_hi": "वास्तुशिल्पीय फेयर-फेस्ड कंक्रीट फिनिश जो आधुनिक क्रूरतावादी (ब्रूटलिस्ट) सौंदर्य को बिना भारी वजन के उपलब्ध कराती है।",
        "desc_gu": "વાસ્તુશિલ્પીય ફેર-ફેસ્ડ કોંક્રિટ ફિનિશ જે આધુનિક બ્રૂટલિસ્ટ સૌંદર્યને ભારે વજન વિના ઉપલબ્ધ કરાવે છે.",
    },
    "ST-FCV-012": {
        "desc_hi": "प्राकृतिक छिद्रयुक्त ट्रावरटाइन सतह जो रोमन वास्तुकला की कालजयी सुंदरता और विलासिता को जीवंत करती है।",
        "desc_gu": "કુદરતી છિદ્રાળુ ટ્રાવર્ટાઇન સપાટી જે રોમન વાસ્તુશિલ્પની અમર સુંદરતા અને વૈભવને જીવંત કરે છે.",
    },
    "ST-FCV-013": {
        "desc_hi": "चंद्रमा की सतह जैसी रहस्यमयी सूक्ष्म गड्ढों वाली बनावट जो विशिष्ट आंतरिक दीवारों पर दिव्य आकर्षण देती है।",
        "desc_gu": "ચંદ્રની સપાટી જેવી રહસ્યમય સૂક્ષ્મ ખાડાવાળી રચના જે વિશિષ્ટ આંતરિક દિવાલો પર દિવ્ય આકર્ષણ આપે છે.",
    },
    "ST-FCV-014": {
        "desc_hi": "त्रि-आयामी परतदार पाषाण रिलीफ जो पर्वतीय चट्टानों जैसी प्राकृतिक मजबूती और गहराई का अहसास कराती है।",
        "desc_gu": "ત્રિ-પરિમાણીય સ્તરવાળી પાષાણ રિલીફ જે પર્વતીય ખડકો જેવી કુદરતી મજબૂતી અને ઊંડાણનો અહેસાસ કરાવે છે.",
    },
    "ST-FCV-015": {
        "desc_hi": "प्राकृतिक तलछटी मृत्तिका रेशा जो पृथ्वी के प्राकृतिक रंगों और बनावट को सीधे दीवार पर स्थापित करता है।",
        "desc_gu": "કુદરતી અવસાદી માટીનો રેશા જે પૃથ્વીના કુદરતી રંગો અને રચનાને સીધા દિવાલ પર સ્થાપિત કરે છે.",
    },
    "ST-FCV-016": {
        "desc_hi": "शतरंज के बोर्ड जैसी सममितीय चौकोर नक्काशी जो कलात्मक विषमता और क्लासिक डिजाइन का बेहतरीन उदाहरण है।",
        "desc_gu": "શતરંજ બોર્ડ જેવી સપ્રમાણ ચોરસ નકશીકામ જે કલાત્મક કોન્ટ્રાસ્ટ અને ક્લાસિક ડિઝાઇનની ઉત્તમ મિસાલ છે.",
    },
    "ST-FCV-017": {
        "desc_hi": "कारीगर द्वारा हाथ से तराशी गई पाषाण नक्काशी जो पारंपरिक भारतीय शिल्पकला और आधुनिक विलासिता का संगम है।",
        "desc_gu": "કારીગર દ્વારા હાથથી કોતરેલી પાષાણ કલાકૃતિ જે પરંપરાગત ભારતીય શિલ્પકળા અને આધુનિક વૈભવનો સંગમ છે.",
    },
    "ST-FCV-018": {
        "desc_hi": "पर्वतीय स्लेट चट्टानों की प्राकृतिक दरारें और परतें जो दीवारों को देहाती और प्राकृतिक वातावरण प्रदान करती हैं।",
        "desc_gu": "પર્વતીય સ્લેટ ખડકોની કુદરતી તિરાડો અને સ્તરો જે દિવાલોને કુદરતી અને ભવ્ય વાતાવરણ પ્રદાન કરે છે.",
    },
}
'''

if "TEXTURE_DESC_I18N = {" not in content:
    idx = content.find("SLABS_I18N = {")
    content = content[:idx] + texture_desc_dict + "\n\n" + content[idx:]

# 2. Localize Page 4 Collection 01 Divider
old_page4_block = '''    c1_title = (
        "ARCHITECTURAL 3D TEXTURES" if lang == "en"
        else "आर्किटेक्चरल 3D टेक्सचर्स" if lang == "hi"
        else "આર્કિટેક્ચરલ 3D ટેક્સચર્સ"
    )
    c1_badge = f"COLLECTION {to_indic('01', lang)}" if lang != "en" else "COLLECTION 01"
    parts.append(f"""
<div class="page divider-page">
  <div class="divider-border">
    <div class="cover-inner-border"></div>
    <div class="divider-badge">{c1_badge}</div>
    <div class="divider-title">{c1_title}</div>
    <div class="divider-sub">{to_indic(18, lang)} DISTINCT DIMENSIONAL SURFACES · {to_indic(9, lang)} COLORWAYS</div>
    <div class="divider-desc">
      A curated portfolio of dimensional wall surfaces engineered for high-impact facades, curved architectural features, and luxury interiors. From linear fluting and wave ripples to chiseled masonry and raw concrete relief, each profile expands modern building design.
    </div>
    <div class="divider-specs">
      <div class="divider-spec-chip">STANDARD DIMENSIONS: <strong>{localize_dimensions('1200 × 2400 MM', lang)}</strong></div>
      <div class="divider-spec-chip">THICKNESS: <strong>{localize_dimensions('2.5 – 3.5 MM', lang)}</strong></div>
      <div class="divider-spec-chip">WEIGHT: <strong>~{localize_dimensions('3.8 KG / M²', lang)}</strong></div>'''

new_page4_block = '''    c1_title = (
        "ARCHITECTURAL 3D TEXTURES" if lang == "en"
        else "वास्तुशिल्पीय ३D टेक्सचर्स" if lang == "hi"
        else "વાસ્તુશિલ્પીય ૩D ટેક્સચર્સ"
    )
    c1_badge = f"COLLECTION {to_indic('01', lang)}" if lang == "en" else f"संग्रह {to_indic('01', lang)}" if lang == "hi" else f"સંગ્રહ {to_indic('01', lang)}"
    c1_sub = (
        f"{to_indic(18, lang)} DISTINCT DIMENSIONAL SURFACES · {to_indic(9, lang)} COLORWAYS" if lang == "en"
        else f"{to_indic(18, lang)} विशिष्ट त्रि-आयामी सतहें · {to_indic(9, lang)} रंग विकल्प" if lang == "hi"
        else f"{to_indic(18, lang)} વિશિષ્ટ ત્રિ-પરિમાણીય સપાટીઓ · {to_indic(9, lang)} રંગ વિકલ્પો"
    )
    c1_desc = (
        "A curated portfolio of dimensional wall surfaces engineered for high-impact facades, curved architectural features, and luxury interiors. From linear fluting and wave ripples to chiseled masonry and raw concrete relief, each profile expands modern building design." if lang == "en"
        else "प्रभावशाली बाहरी अग्रभागों, वक्र वास्तुशिल्पीय संरचनाओं और लक्जरी आंतरिक सज्जा हेतु विशेष रूप से निर्मित त्रि-आयामी भित्ति सतहों का उत्कृष्ट संग्रह। लीनियर फ्लूटिंग और लहरदार तरंगों से लेकर तराशी गई चिनाई और कच्चे कंक्रीट रिलीफ तक, प्रत्येक प्रोफाइल आधुनिक वास्तुकला को नया आयाम देती है।" if lang == "hi"
        else "પ્રભાવશાળી બાહ્ય ફેસાડ, વળાંકવાળી વાસ્તુશિલ્પીય રચનાઓ અને લક્ઝરી આંતરિક સજાવટ માટે ખાસ ઇજનેરી કરાયેલ ત્રિ-પરિમાણીય સપાટીઓનો ઉત્કૃષ્ટ સંગ્રહ. લીનિયર ફ્લૂટિંગ અને મોજાંની લહેરોથી માંડીને પથ્થરની ચણતર અને કોંક્રિટ રિલીફ સુધી, દરેક પ્રોફાઇલ આધુનિક વાસ્તુશિલ્પને નવો આયામ આપે છે."
    )
    c1_spec1 = "STANDARD DIMENSIONS: <strong>1200 × 2400 MM</strong>" if lang == "en" else f"मानक माप: <strong>{localize_dimensions('1200 × 2400 MM', lang)}</strong>" if lang == "hi" else f"પ્રમાણભૂત માપ: <strong>{localize_dimensions('1200 × 2400 MM', lang)}</strong>"
    c1_spec2 = "THICKNESS: <strong>2.5 – 3.5 MM</strong>" if lang == "en" else f"मोटाई: <strong>{localize_dimensions('2.5 – 3.5 MM', lang)}</strong>" if lang == "hi" else f"જાડાઈ: <strong>{localize_dimensions('2.5 – 3.5 MM', lang)}</strong>"
    c1_spec3 = "WEIGHT: <strong>~3.8 KG / M²</strong>" if lang == "en" else f"वजन: <strong>~{localize_dimensions('3.8 KG / M²', lang)}</strong>" if lang == "hi" else f"વજન: <strong>~{localize_dimensions('3.8 KG / M²', lang)}</strong>"

    parts.append(f"""
<div class="page divider-page">
  <div class="divider-border">
    <div class="cover-inner-border"></div>
    <div class="divider-badge">{c1_badge}</div>
    <div class="divider-title">{c1_title}</div>
    <div class="divider-sub">{c1_sub}</div>
    <div class="divider-desc">
      {c1_desc}
    </div>
    <div class="divider-specs">
      <div class="divider-spec-chip">{c1_spec1}</div>
      <div class="divider-spec-chip">{c1_spec2}</div>
      <div class="divider-spec-chip">{c1_spec3}</div>'''

content = content.replace(old_page4_block, new_page4_block)

# 3. Update the 18 3D texture pages rendering
old_tex_render = '''        tex_name = tex["name"]
        local_name = CLAY_TEXTURE_NAMES.get(tex_name, {}).get(lang, tex_name) if lang != "en" else tex_name
        display_name = local_name

        tex_prof = tex["profile"]
        display_prof = CLAY_PROFILES.get(tex_prof, {}).get(lang, tex_prof) if lang != "en" else tex_prof

        label_size = "Dimensions" if lang == "en" else "साइज" if lang == "hi" else "સાઇઝ"
        label_thick = "Thickness" if lang == "en" else "मोटाई" if lang == "hi" else "જાડાઈ"
        label_weight = "Weight" if lang == "en" else "वजन" if lang == "hi" else "વજન"
        label_bending = "Bending" if lang == "en" else "लचीलापन (बेंडिंग)" if lang == "hi" else "લવચીકતા (બેન્ડિંગ)"
        label_fire = "Fire Rating" if lang == "en" else "फायर रेटिंग" if lang == "hi" else "ફાયર રેટિંગ"
        label_app = "Application" if lang == "en" else "उपयोग" if lang == "hi" else "ઉપયોગ"
        scene_badge_text = "ARCHITECTURAL APPLICATION · " + tex['name'].upper() if lang == "en" else "वास्तुशिल्पीय अनुप्रयोग · " + local_name if lang == "hi" else "વાસ્તુશિલ્પીય ઉપયોગ · " + local_name
        colors_avail_text = "COLORS AVAILABLE" if lang == "en" else "रंग उपलब्ध" if lang == "hi" else "રંગો ઉપલબ્ધ"
        swatch_tag_text = "MACRO TEXTURE SWATCH" if lang == "en" else "मैक्रो टेक्सचर नमूना" if lang == "hi" else "મેક્રો ટેક્સચર નમૂનો"

        parts.append(f"""
<div class="page" style="padding:0;">
  <div class="prod-header">
    <div class="prod-header-left">
      <img src="file://{EMBLEM_PATH}" class="prod-emblem">
      <div class="prod-brand-lockup">
        <span class="prod-brand-name">STONE TECH ATELIER</span>
        <span class="prod-division-tag">FLEXIBLE CLAY VENEERS</span>
        <span style="font-size:6.5pt;background:#fef3c7;border:1px solid #fde68a;color:#b45309;padding:0.6mm 2mm;border-radius:1mm;font-weight:700;">COLLECTION 01 · 3D TEXTURE</span>
      </div>
    </div>
    <div class="prod-header-right">
      FACTORY DIRECT ORDERS: <strong>+91 77420 90866 / +91 97844 52998</strong> · <strong>WWW.STONETECH.IN</strong>
    </div>
  </div>

  <div class="texture-grid">
    <div class="scene-frame">
      <img src="file://{scene_path}" class="scene-img">
      <div class="scene-badge">{scene_badge_text}</div>
    </div>

    <div class="texture-sidebar">
      <div class="texture-title-box">
        <div class="texture-code-row">
          <span class="texture-code">{tex['code']}</span>
          <span class="texture-pill">{to_indic(9, lang)} {colors_avail_text}</span>
        </div>
        <div class="texture-name">{display_name}</div>
        <div class="texture-profile">{display_prof}</div>
      </div>

      <div class="swatch-frame">
        <img src="file://{swatch_path}" class="swatch-img">
        <div class="swatch-tag">{swatch_tag_text}</div>
      </div>

      <div class="texture-specs-box">
        <div class="spec-grid-2x2">
          <div class="spec-item">
            <span class="spec-label">{label_size}</span>
            <span class="spec-val">{localize_dimensions(tex['size'], lang)}</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">{label_thick}</span>
            <span class="spec-val">{localize_dimensions(tex['thick'], lang)}</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">{label_weight}</span>
            <span class="spec-val">{localize_dimensions(tex['weight'], lang)}</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">{label_bending}</span>
            <span class="spec-val">{localize_dimensions(tex['bending'], lang)}</span>
          </div>
        </div>

        <div class="spec-row-full">
          <span class="spec-label">{label_fire}</span>
          <span class="spec-val">{tex['fire']}</span>
        </div>

        <div class="spec-row-full">
          <span class="spec-label">{label_app}</span>
          <span class="spec-val">Curved Facades, Exterior Elevations, Column Wraps & Interior Features</span>
        </div>
      </div>

      <div class="texture-desc-box">
        {tex['desc']}
      </div>'''

new_tex_render = '''        tex_code = tex["code"]
        tex_name = tex["name"]
        local_name = CLAY_TEXTURE_NAMES.get(tex_name, {}).get(lang, tex_name) if lang != "en" else tex_name
        display_name = local_name

        tex_prof = tex["profile"]
        display_prof = CLAY_PROFILES.get(tex_prof, {}).get(lang, tex_prof) if lang != "en" else tex_prof

        label_size = "Dimensions" if lang == "en" else "साइज" if lang == "hi" else "સાઇઝ"
        label_thick = "Thickness" if lang == "en" else "मोटाई" if lang == "hi" else "જાડાઈ"
        label_weight = "Weight" if lang == "en" else "वजन" if lang == "hi" else "વજન"
        label_bending = "Bending" if lang == "en" else "लचीलापन (बेंडिंग)" if lang == "hi" else "લવચીકતા (બેન્ડિંગ)"
        label_fire = "Fire Rating" if lang == "en" else "अग्नि सुरक्षा" if lang == "hi" else "અગ્નિ સુરક્ષા"
        label_app = "Application" if lang == "en" else "उपयोग" if lang == "hi" else "ઉપયોગ"
        scene_badge_text = "ARCHITECTURAL APPLICATION · " + tex['name'].upper() if lang == "en" else "वास्तुशिल्पीय अनुप्रयोग · " + local_name if lang == "hi" else "વાસ્તુશિલ્પીય ઉપયોગ · " + local_name
        colors_avail_text = "COLORS AVAILABLE" if lang == "en" else "रंग उपलब्ध" if lang == "hi" else "રંગો ઉપલબ્ધ"
        swatch_tag_text = "MACRO TEXTURE SWATCH" if lang == "en" else "मैक्रो टेक्सचर नमूना" if lang == "hi" else "મેક્રો ટેક્સચર નમૂનો"

        brand_hdr = "STONE TECH ATELIER" if lang == "en" else "स्टोन टेक एटेलियर" if lang == "hi" else "સ્ટોન ટેક એટેલિયર"
        div_hdr = "FLEXIBLE CLAY VENEERS" if lang == "en" else "वास्तुशिल्पीय लचीली क्ले विनियर" if lang == "hi" else "વાસ્તુશિલ્પીય લચીલી ક્લે વિનિયર"
        coll_tag = "COLLECTION 01 · 3D TEXTURE" if lang == "en" else "संग्रह ०१ · वास्तुशिल्पीय ३D टेक्सचर्स" if lang == "hi" else "સંગ્રહ ૦૧ · વાસ્તુશિલ્પીય ૩D ટેક્સચર્સ"
        hdr_right = "FACTORY DIRECT ORDERS: <strong>+91 97844 52998 / +91 77420 90866</strong> · <strong>WWW.STONETECH.IN</strong>" if lang == "en" else "प्रत्यक्ष फैक्टरी पूछताछ: <strong>+91 97844 52998 / +91 77420 90866</strong> · <strong>WWW.STONETECH.IN</strong>" if lang == "hi" else "સીધી ફેક્ટરી પૂછપરછ: <strong>+91 97844 52998 / +91 77420 90866</strong> · <strong>WWW.STONETECH.IN</strong>"

        app_text = "Curved Facades, Exterior Elevations, Column Wraps & Interior Features" if lang == "en" else "वक्राकार अग्रभाग, बाहरी ऊंचाई (एलिवेशन), स्तंभ आवरण एवं आंतरिक सज्जा" if lang == "hi" else "વળાંકવાળા ફેસાડ, બાહ્ય એલિવેશન, થાંભલા આચ્છાદન અને આંતરિક સજાવટ"
        fire_val = tex['fire'] if lang == "en" else "क्लास A अग्निरोधी (गैर-दहनशील)" if lang == "hi" else "ક્લાસ A અગ્નિરોધક (અદહનશીલ)"

        t_desc_info = TEXTURE_DESC_I18N.get(tex_code, {})
        final_desc = tex['desc'] if lang == "en" else t_desc_info.get("desc_hi", tex['desc']) if lang == "hi" else t_desc_info.get("desc_gu", tex['desc'])

        parts.append(f"""
<div class="page" style="padding:0;">
  <div class="prod-header">
    <div class="prod-header-left">
      <img src="file://{EMBLEM_PATH}" class="prod-emblem">
      <div class="prod-brand-lockup">
        <span class="prod-brand-name">{brand_hdr}</span>
        <span class="prod-division-tag">{div_hdr}</span>
        <span style="font-size:6.5pt;background:#fef3c7;border:1px solid #fde68a;color:#b45309;padding:0.6mm 2mm;border-radius:1mm;font-weight:700;">{coll_tag}</span>
      </div>
    </div>
    <div class="prod-header-right">
      {hdr_right}
    </div>
  </div>

  <div class="texture-grid">
    <div class="scene-frame">
      <img src="file://{scene_path}" class="scene-img">
      <div class="scene-badge">{scene_badge_text}</div>
    </div>

    <div class="texture-sidebar">
      <div class="texture-title-box">
        <div class="texture-code-row">
          <span class="texture-code">{tex['code']}</span>
          <span class="texture-pill">{to_indic(9, lang)} {colors_avail_text}</span>
        </div>
        <div class="texture-name">{display_name}</div>
        <div class="texture-profile">{display_prof}</div>
      </div>

      <div class="swatch-frame">
        <img src="file://{swatch_path}" class="swatch-img">
        <div class="swatch-tag">{swatch_tag_text}</div>
      </div>

      <div class="texture-specs-box">
        <div class="spec-grid-2x2">
          <div class="spec-item">
            <span class="spec-label">{label_size}</span>
            <span class="spec-val">{localize_dimensions(tex['size'], lang)}</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">{label_thick}</span>
            <span class="spec-val">{localize_dimensions(tex['thick'], lang)}</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">{label_weight}</span>
            <span class="spec-val">{localize_dimensions(tex['weight'], lang)}</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">{label_bending}</span>
            <span class="spec-val">{localize_dimensions(tex['bending'], lang)}</span>
          </div>
        </div>

        <div class="spec-row-full">
          <span class="spec-label">{label_fire}</span>
          <span class="spec-val">{fire_val}</span>
        </div>

        <div class="spec-row-full">
          <span class="spec-label">{label_app}</span>
          <span class="spec-val">{app_text}</span>
        </div>
      </div>

      <div class="texture-desc-box">
        {final_desc}
      </div>'''

content = content.replace(old_tex_render, new_tex_render)

# 4. Replace footer bar and phone numbers globally
content = content.replace(
    "<span>STONE TECH ATELIER · ARCHITECTURAL SPECIFICATION CATALOGUE 2026-2027</span>",
    "<span>{footer_spec_bar}</span>"
)
content = content.replace(
    "<span>WWW.STONETECH.IN · DIRECT FACTORY ENQUIRIES: +91 77420 90866 / +91 97844 52998</span>",
    "<span>{contact_footer_text}</span>"
)
content = content.replace(
    "<span>WWW.STONETECH.IN · DIRECT FACTORY ENQUIRIES: +91 97844 52998 / +91 77420 90866</span>",
    "<span>{contact_footer_text}</span>"
)

# Also ensure footer_spec_bar and contact_footer_text are defined before page generation in generate_html:
if "contact_footer_text =" not in content:
    idx_def = content.find("def generate_html(lang=\"en\"):")
    insert_str = '''
    contact_footer_text = (
        "WWW.STONETECH.IN · DIRECT FACTORY ENQUIRIES: +91 97844 52998 / +91 77420 90866"
        if lang == "en"
        else "WWW.STONETECH.IN · प्रत्यक्ष फैक्टरी पूछताछ: +91 97844 52998 / +91 77420 90866"
        if lang == "hi"
        else "WWW.STONETECH.IN · સીધી ફેક્ટરી પૂછપરછ: +91 97844 52998 / +91 77420 90866"
    )
    footer_spec_bar = (
        "STONE TECH ATELIER · ARCHITECTURAL SPECIFICATION CATALOGUE 2026-2027"
        if lang == "en"
        else "स्टोन टेक एटेलियर · वास्तुशिल्पीय विनिर्देश कैटलॉग २०२६-२०२७"
        if lang == "hi"
        else "સ્ટોન ટેક એટેલિયર · વાસ્તુશિલ્પીય વિશિષ્ટતા કેટલોગ ૨૦૨૬-૨૦૨૭"
    )
'''
    insert_point = content.find("total_pages = 37", idx_def)
    content = content[:insert_point] + insert_str + "    " + content[insert_point:]

with open(FILE_PATH, "w", encoding="utf-8") as f:
    f.write(content)

print("Successfully patched scripts/compile-flexible-clay-multilingual.py!")

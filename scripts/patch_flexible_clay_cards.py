#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os

FILE_PATH = os.path.abspath("scripts/compile-flexible-clay-multilingual.py")

with open(FILE_PATH, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update Traventino divider (Page 23)
old_div2 = """    <div class="divider-sub">{to_indic(10, lang)} SIGNATURE TRAVERTINE SLAB SELECTIONS · TS 201 TO TS 220</div>
    <div class="divider-desc">
      Engineered linear vein-cut and cavity-pitted natural travertine slabs offering authentic sedimentary character without structural weight. Formulated for luxury residential facades, reception pavilions, and high-traffic public commercial buildings.
    </div>
    <div class="divider-specs">
      <div class="divider-spec-chip">MULTIPLE SIZES: <strong>600×1200 / 1200×2400 MM</strong></div>
      <div class="divider-spec-chip">FLEXIBILITY: <strong>R ≥ {to_indic(200, lang)} MM</strong></div>
      <div class="divider-spec-chip">WATERPROOF: <strong>&lt; {to_indic('2.0', lang)}% ABSORPTION</strong></div>
      <div class="divider-spec-chip">FIRE SAFETY: <strong>CLASS A</strong></div>
    </div>"""

new_div2 = """    <div class="divider-sub">{"१० विशिष्ट ट्रावरटाइन स्लैब चयन · TS 201 से TS 220" if lang == "hi" else ("૧૦ વિશિષ્ટ ટ્રાવર્ટાઇન સ્લેબ પસંદગી · TS 201 થી TS 220" if lang == "gu" else f"{to_indic(10, lang)} SIGNATURE TRAVERTINE SLAB SELECTIONS · TS 201 TO TS 220")}</div>
    <div class="divider-desc">
      {"इंजीनियर्ड लीनियर वेन-कट एवं सूक्ष्म छिद्रों से युक्त प्राकृतिक ट्रावरटाइन स्लैब्स जो बिना संरचनात्मक भार के प्रामाणिक अवसादी सौंदर्य प्रदान करते हैं। लक्जरी आवासीय अग्रभागों, रिसेप्शन और व्यावसायिक परिसरों हेतु निर्मित।" if lang == "hi" else ("એન્જિનિયર્ડ લિનિયર વેન-કટ અને છિદ્રાળુ કુદરતી ટ્રાવર્ટાઇન સ્લેબ્સ જે કોઈપણ માળખાકીય વજન વિના અધિકૃત કુદરતી ભવ્યતા આપે છે. લક્ઝરી રહેણાંક ફેસાડ, રિસેપ્શન અને જાહેર ઇમારતો માટે શ્રેષ્ઠ." if lang == "gu" else "Engineered linear vein-cut and cavity-pitted natural travertine slabs offering authentic sedimentary character without structural weight. Formulated for luxury residential facades, reception pavilions, and high-traffic public commercial buildings.")}
    </div>
    <div class="divider-specs">
      <div class="divider-spec-chip">{"विविध साइज़: <strong>६००×१२०० / १२००×२४०० मिमी</strong>" if lang == "hi" else ("વિવિધ સાઇઝ: <strong>૬૦૦×૧૨૦૦ / ૧૨૦૦×૨૪૦૦ મીમી</strong>" if lang == "gu" else "MULTIPLE SIZES: <strong>600×1200 / 1200×2400 MM</strong>")}</div>
      <div class="divider-spec-chip">{"लचीलापन: <strong>R ≥ २०० मिमी</strong>" if lang == "hi" else ("લચીલાપણું: <strong>R ≥ ૨૦૦ મીમી</strong>" if lang == "gu" else f"FLEXIBILITY: <strong>R ≥ {to_indic(200, lang)} MM</strong>")}</div>
      <div class="divider-spec-chip">{"जलरोधी: <strong>&lt; २.०% अवशोषण</strong>" if lang == "hi" else ("વોટરપ્રૂફ: <strong>&lt; ૨.૦% શોષણ</strong>" if lang == "gu" else f"WATERPROOF: <strong>&lt; {to_indic('2.0', lang)}% ABSORPTION</strong>")}</div>
      <div class="divider-spec-chip">{"अग्नि सुरक्षा: <strong>क्लास A</strong>" if lang == "hi" else ("અગ્નિ સુરક્ષા: <strong>ક્લાસ A</strong>" if lang == "gu" else "FIRE SAFETY: <strong>CLASS A</strong>")}</div>
    </div>"""

if old_div2 in content:
    content = content.replace(old_div2, new_div2)
    print("Replaced Divider 2")
else:
    print("Divider 2 not found!")

# 2. Update Slat divider (Page 29)
old_div3 = """    <div class="divider-sub">{to_indic(12, lang)} ARCHITECTURAL CLEFT SLAT SLABS · SK 103 TO SK 119</div>
    <div class="divider-desc">
      Linear natural mountain cleft split-face slate formations delivering rich geological contrast, delicate cleavage bedding planes, and earth-toned mineral striations. Engineered for contemporary facades, boundary walls, and luxury landscape features.
    </div>
    <div class="divider-specs">
      <div class="divider-spec-chip">MULTIPLE SIZES: <strong>600×1200 / 1200×2400 MM</strong></div>
      <div class="divider-spec-chip">FLEXIBILITY: <strong>R ≥ {to_indic(200, lang)} MM</strong></div>
      <div class="divider-spec-chip">WATERPROOF: <strong>&lt; {to_indic('2.0', lang)}% ABSORPTION</strong></div>
      <div class="divider-spec-chip">FIRE SAFETY: <strong>CLASS A</strong></div>
    </div>"""

new_div3 = """    <div class="divider-sub">{"१२ वास्तुशिल्पीय क्लेफ्ट स्लेट स्लैब्स · SK 103 से SK 119" if lang == "hi" else ("૧૨ વાસ્તુશિલ્પીય ક્લેફ્ટ સ્લેટ સ્લેબ્સ · SK 103 થી SK 119" if lang == "gu" else f"{to_indic(12, lang)} ARCHITECTURAL CLEFT SLAT SLABS · SK 103 TO SK 119")}</div>
    <div class="divider-desc">
      {"प्राकृतिक पर्वतीय क्लेफ्ट स्प्लिट-फेस स्लेट संरचनाएं जो समृद्ध भूवैज्ञानिक कंट्रास्ट, नाजुक संस्तरण तल और प्राकृतिक खनिज धारियां प्रस्तुत करती हैं। समकालीन अग्रभागों, चारदीवारी और लैंडस्केप हेतु उपयुक्त।" if lang == "hi" else ("કુદરતી પર્વતીય ક્લેફ્ટ સ્પ્લિટ-ફેસ સ્લેટ રચનાઓ જે સમૃદ્ધ ભૂસ્તરશાસ્ત્રીય કોન્ટ્રાસ્ટ અને અદભુત ખનિજ રેખાઓ રજૂ કરે છે. સમકાલીન ફેસાડ, બાઉન્ડ્રી વોલ અને લેન્ડસ્કેપ માટે ઉત્તમ." if lang == "gu" else "Linear natural mountain cleft split-face slate formations delivering rich geological contrast, delicate cleavage bedding planes, and earth-toned mineral striations. Engineered for contemporary facades, boundary walls, and luxury landscape features.")}
    </div>
    <div class="divider-specs">
      <div class="divider-spec-chip">{"विविध साइज़: <strong>६००×१२०० / १२००×२४०० मिमी</strong>" if lang == "hi" else ("વિવિધ સાઇઝ: <strong>૬૦૦×૧૨૦૦ / ૧૨૦૦×૨૪૦૦ મીમી</strong>" if lang == "gu" else "MULTIPLE SIZES: <strong>600×1200 / 1200×2400 MM</strong>")}</div>
      <div class="divider-spec-chip">{"लचीलापन: <strong>R ≥ २०० मिमी</strong>" if lang == "hi" else ("લચીલાપણું: <strong>R ≥ ૨૦૦ મીમી</strong>" if lang == "gu" else f"FLEXIBILITY: <strong>R ≥ {to_indic(200, lang)} MM</strong>")}</div>
      <div class="divider-spec-chip">{"जलरोधी: <strong>&lt; २.०% अवशोषण</strong>" if lang == "hi" else ("વોટરપ્રૂફ: <strong>&lt; ૨.૦% શોષણ</strong>" if lang == "gu" else f"WATERPROOF: <strong>&lt; {to_indic('2.0', lang)}% ABSORPTION</strong>")}</div>
      <div class="divider-spec-chip">{"अग्नि सुरक्षा: <strong>क्लास A</strong>" if lang == "hi" else ("અગ્નિ સુરક્ષા: <strong>ક્લાસ A</strong>" if lang == "gu" else "FIRE SAFETY: <strong>CLASS A</strong>")}</div>
    </div>"""

if old_div3 in content:
    content = content.replace(old_div3, new_div3)
    print("Replaced Divider 3")
else:
    print("Divider 3 not found!")

with open(FILE_PATH, "w", encoding="utf-8") as f:
    f.write(content)

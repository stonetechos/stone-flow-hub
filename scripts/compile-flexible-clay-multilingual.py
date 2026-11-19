#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/compile-flexible-clay-multilingual.py

Compiles the Stone Tech Flexible Clay Veneers Catalogue (2026-2027)
into three luxury vector editions:
  - English:  public/catalogues/StoneTech_Flexible_Clay_Veneers_Catalogue_English.pdf
              (and public/catalogues/StoneTech_Flexible_Clay_Veneers_Catalogue_2026.pdf)
  - Hindi:    public/catalogues/StoneTech_Flexible_Clay_Veneers_Catalogue_Hindi.pdf
  - Gujarati: public/catalogues/StoneTech_Flexible_Clay_Veneers_Catalogue_Gujarati.pdf

Features:
  - Base64 TrueType fonts (NotoSansDevanagari, NotoSansGujarati) for zero tofu glyphs.
  - Authentic Devanagari numerals (०–९) and Gujarati numerals (૦–૯).
  - High-definition facade scenes, macro swatches, and installation guide.
  - Headless Chrome compilation, target < 20 MiB per edition.
"""

import os
import sys
import time
import subprocess
import shutil

REPO_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.append(os.path.join(REPO_DIR, "scripts"))

from catalogue_translations import (
    get_fonts_css,
    to_indic,
    localize_dimensions,
    CLAY_TEXTURE_NAMES,
    CLAY_PROFILES,
    CLAY_COLORS,
    COMMON_I18N,
)

import importlib
fc = importlib.import_module("generate-flexible-clay-catalogue")

ASSETS_DIR = fc.ASSETS_DIR
BRANDING_DIR = fc.BRANDING_DIR
EMBLEM_PATH = fc.EMBLEM_PATH
TEXTURES = fc.TEXTURES
PUNCH_TRAVENTINO = fc.PUNCH_TRAVENTINO
PUNCH_SLAT = fc.PUNCH_SLAT
COLORS = fc.COLORS


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


SLABS_I18N = {
    "ST-FPT-201": {
        "name_hi": "TS 201",
        "name_gu": "TS 201",
        "tone_hi": "वॉर्म बेज वेन ट्रावरटाइन",
        "tone_gu": "વોર્મ બેજ વેન ટ્રાવર્ટાઇન",
        "desc_hi": "गोल्डन बेज लीनियर सेडिमेंटरी ट्रावरटाइन गठन, सूक्ष्म छिद्रों एवं प्राकृतिक शिराओं से युक्त।",
        "desc_gu": "ગોલ્ડન બેજ લિનિયર સેડિમેન્ટરી ટ્રાવર્ટાઇન રચના, સૂક્ષ્મ છિદ્રો અને કુદરતી નસો સાથે."
    },
    "ST-FPT-202": {
        "name_hi": "TS 202",
        "name_gu": "TS 202",
        "tone_hi": "कूल ग्रे वास्तुशिल्पीय ट्रावरटाइन",
        "tone_gu": "કૂલ ગ્રે વાસ્તુશિલ્પીય ટ્રાવર્ટાઇન",
        "desc_hi": "समकालीन रजत-धूसर वेन-कट ट्रावरटाइन जो परिष्कृत वास्तुशिल्पीय लालित्य प्रदान करता है।",
        "desc_gu": "સમકાલીન સિલ્વર-ગ્રે વેન-કટ ટ્રાવર્ટાઇન જે સુંદર વાસ્તુશિલ્પીય ભવ્યતા આપે છે."
    },
    "ST-FPT-205": {
        "name_hi": "TS 205",
        "name_gu": "TS 205",
        "tone_hi": "गोल्डन सैंड पंच ट्रावरटाइन",
        "tone_gu": "ગોલ્ડન સેન્ડ પંચ ટ્રાવર્ટાઇન",
        "desc_hi": "चमकदार शहद जैसे सुनहरे रंगों वाला ट्रावरटाइन जो समृद्ध प्राकृतिक गर्माहट और गहराई देता है।",
        "desc_gu": "ચમકદાર મધ જેવા સોનેરી રંગોવાળો ટ્રાવર્ટાઇન જે સમૃદ્ધ કુદરતી હૂંફ અને ઊંડાણ આપે છે."
    },
    "ST-FPT-206G": {
        "name_hi": "TS 206 ग्रे",
        "name_gu": "TS 206 ગ્રે",
        "tone_hi": "सिल्वर ऐश पंच ट्रावरटाइन",
        "tone_gu": "સિલ્વર એશ પંચ ટ્રાવર્ટાઇન",
        "desc_hi": "न्यूनतम ऐश-ग्रे ट्रावरटाइन कोमल ऊर्ध्वाधर रेशों के साथ, आधुनिक आवासीय प्रोजेक्ट्स हेतु आदर्श।",
        "desc_gu": "ન્યૂનતમ એશ-ગ્રે ટ્રાવર્ટાઇન નરમ ઊભી રેખાઓ સાથે, આધુનિક રહેણાંક પ્રોજેક્ટ્સ માટે ઉત્તમ."
    },
    "ST-FPT-206": {
        "name_hi": "TS 206",
        "name_gu": "TS 206",
        "tone_hi": "क्रेमा डेलिकेट पंच ट्रावरटाइन",
        "tone_gu": "ક્રેમા ડેલિકેટ પંચ ટ્રાવર્ટાઇન",
        "desc_hi": "मुलायम क्रीमी आइवरी ट्रावरटाइन नाजुक अनुदैर्ध्य शिराओं के साथ।",
        "desc_gu": "નરમ ક્રીમી આઇવરી ટ્રાવર્ટાઇન નાજુક કુદરતી રેખાઓ સાથે."
    },
    "ST-FPT-211": {
        "name_hi": "TS 211",
        "name_gu": "TS 211",
        "tone_hi": "क्लासिक रोमन पंच ट्रावरटाइन",
        "tone_gu": "ક્લાસિક રોમન પંચ ટ્રાવર્ટાઇન",
        "desc_hi": "ऐतिहासिक इतालवी रोमन ट्रावरटाइन टेक्सचर प्रामाणिक कैविटी गड्ढों के साथ।",
        "desc_gu": "ઐતિહાસિક ઇટાલિયન રોમન ટ્રાવર્ટાઇન ટેક્સચર અધિકૃત પોલાણ ખાડાઓ સાથે."
    },
    "ST-FPT-212": {
        "name_hi": "TS 212",
        "name_gu": "TS 212",
        "tone_hi": "टाइटेनियम ग्रे पंच ट्रावरटाइन",
        "tone_gu": "ટાઇટેનિયમ ગ્રે પંચ ટ્રાવર્ટાઇન",
        "desc_hi": "शहरी स्लेट-टोन्ड ट्रावरटाइन जो कांच और स्टील फ्रेमिंग के साथ पूरी तरह मेल खाता है।",
        "desc_gu": "શહેરી સ્લેટ-ટોન્ડ ટ્રાવર્ટાઇન જે કાચ અને સ્ટીલ ફ્રેમિંગ સાથે સુમેળ સાધે છે."
    },
    "ST-FPT-213": {
        "name_hi": "TS 213",
        "name_gu": "TS 213",
        "tone_hi": "डार्क बेसाल्ट पंच ट्रावरटाइन",
        "tone_gu": "ડાર્ક બેસાલ્ટ પંચ ટ્રાવર્ટાઇન",
        "desc_hi": "गहरे चारकोल-टिन्टेड ज्वालामुखी ट्रावरटाइन जो प्रभावशाली वास्तुशिल्पीय कंट्रास्ट प्रदान करता है।",
        "desc_gu": "ડાર્ક ચારકોલ-ટિન્ટેડ જ્વાળામુખી ટ્રાવર્ટાઇન જે પ્રભાવશાળી વાસ્તુશિલ્પીય કોન્ટ્રાસ્ટ આપે છે."
    },
    "ST-FPT-219": {
        "name_hi": "TS 219",
        "name_gu": "TS 219",
        "tone_hi": "स्वर्ल क्लाउड पंच ट्रावरटाइन",
        "tone_gu": "સ્વર્લ ક્લાઉડ પંચ ટ્રાવર્ટાઇન",
        "desc_hi": "तरल बादलों की भांति घूमती हुई ट्रावरटाइन धाराएं जो कलात्मक जैविक गतिशीलता प्रस्तुत करती हैं।",
        "desc_gu": "વાદળોની જેમ વહેતી ટ્રાવર્ટાઇન રચના જે કલાત્મક કુદરતી ગતિશીલતા રજૂ કરે છે."
    },
    "ST-FPT-220": {
        "name_hi": "TS 220",
        "name_gu": "TS 220",
        "tone_hi": "अर्थी कैनियन पंच ट्रावरटाइन",
        "tone_gu": "અર્થી કેનિયન પંચ ટ્રાવર્ટાઇન",
        "desc_hi": "प्राकृतिक कैनियन अवसादी घुमाव एवं गर्म अम्बर खनिज जो साहसिक प्राकृतिक सौंदर्य रचते हैं।",
        "desc_gu": "કુદરતી ખીણ અવસાદી વળાંકો અને ગરમ અંબર ખનિજો જે ભવ્ય કુદરતી સૌંદર્ય બનાવે છે."
    },
    "ST-FPS-103": {
        "name_hi": "SK 103",
        "name_gu": "SK 103",
        "tone_hi": "वॉर्म सैंडस्टोन स्लेट",
        "tone_gu": "વોર્મ સેન્ડસ્ટોન સ્લેટ",
        "desc_hi": "गोल्डन सैंडस्टोन क्लेफ्ट ग्रेन प्राकृतिक विकर्ण स्तरीकरण के साथ।",
        "desc_gu": "ગોલ્ડન સેન્ડસ્ટોન ક્લેફ્ટ ગ્રેન કુદરતી ત્રાંસા સ્તરો સાથે."
    },
    "ST-FPS-103G": {
        "name_hi": "SK 103 ग्रे",
        "name_gu": "SK 103 ગ્રે",
        "tone_hi": "सिल्वर क्लेफ्ट स्लेट",
        "tone_gu": "સિલ્વર ક્લેફ્ટ સ્લેટ",
        "desc_hi": "स्पष्ट शीतल रजत-धूसर क्लेफ्ट स्लेट बारीक भूवैज्ञानिक धारियों के साथ।",
        "desc_gu": "ચોખ્ખી સિલ્વર-ગ્રે ક્લેફ્ટ સ્લેટ ઝીણી ભૂસ્તરશાસ્ત્રીય રેખાઓ સાથે."
    },
    "ST-FPS-106": {
        "name_hi": "SK 106",
        "name_gu": "SK 106",
        "tone_hi": "क्रेमा लाइमस्टोन स्लेट",
        "tone_gu": "ક્રેમા લાઇમસ્ટોન સ્લેટ",
        "desc_hi": "गर्म क्रीम चूना पत्थर पेटिना कोमल बादल जैसे खनिज समूहों के साथ।",
        "desc_gu": "ગરમ ક્રીમ ચૂનાના પથ્થરની રચના નરમ વાદળ જેવા ખનિજ જૂથો સાથે."
    },
    "ST-FPS-108": {
        "name_hi": "SK 108",
        "name_gu": "SK 108",
        "tone_hi": "इंडस्ट्रियल स्लेट ग्रे",
        "tone_gu": "ઇન્ડસ્ટ્રિયલ સ્લેટ ગ્રે",
        "desc_hi": "गहरा औद्योगिक चारकोल स्लेट फिनिश सूक्ष्म धातु जैसी चमक के साथ।",
        "desc_gu": "ડાર્ક ઔદ્યોગિક ચારકોલ સ્લેટ ફિનિશ હળવી ધાતુ જેવી ચમક સાથે."
    },
    "ST-FPS-109": {
        "name_hi": "SK 109",
        "name_gu": "SK 109",
        "tone_hi": "रस्ट ऑटम क्वार्ट्जाइट",
        "tone_gu": "રસ્ટ ઑટમ ક્વાર્ટ્ઝાઇટ",
        "desc_hi": "ऑक्सीकृत शरदकालीन जंग खनिज गहरे भू-स्लेट के साथ मिश्रित।",
        "desc_gu": "ઑક્સિડાઇઝ્ડ પાનખર રસ્ટ ખનિજો ડાર્ક અર્થ સ્લેટ સાથે ભળેલા."
    },
    "ST-FPS-110": {
        "name_hi": "SK 110",
        "name_gu": "SK 110",
        "tone_hi": "सनलिट ओकर स्लेट",
        "tone_gu": "સનલિટ ઓકર સ્લેટ",
        "desc_hi": "धूप में चमकीले गेरुआ रंग जो भूमध्यसागरीय चट्टानों की छटा बिखेरते हैं।",
        "desc_gu": "સૂર્યપ્રકાશિત ગેરુ રંગો જે ભૂમધ્ય સમુદ્રની ભેખડોનું પ્રતિબિંબ પાડે છે."
    },
    "ST-FPS-111": {
        "name_hi": "SK 111",
        "name_gu": "SK 111",
        "tone_hi": "एलेबास्टर अर्थ स्लेट",
        "tone_gu": "અલાબાસ્ટર અર્થ સ્લેટ",
        "desc_hi": "सूक्ष्म अर्थ-टोन्ड एलेबास्टर क्रीमी टेक्सचर अंडरटोन्स के साथ।",
        "desc_gu": "સૂક્ષ્મ અર્થ-ટોન્ડ અલાબાસ્ટર ક્રીમી ટેક્ષ્ચર સાથે."
    },
    "ST-FPS-112": {
        "name_hi": "SK 112",
        "name_gu": "SK 112",
        "tone_hi": "मोचा अर्थ स्लेट",
        "tone_gu": "મોચા અર્થ સ્લેટ",
        "desc_hi": "गर्म मोचा-रंगीन अवसादी चट्टान सतह संतुलित मिट्टी के रंगों के साथ।",
        "desc_gu": "ગરમ મોચા રંગની અવસાદી ખડક સપાટી સંતુલિત માટીના રંગો સાથે."
    },
    "ST-FPS-114": {
        "name_hi": "SK 114",
        "name_gu": "SK 114",
        "tone_hi": "आइवरी ग्रेन स्लेट",
        "tone_gu": "આઇવરી ગ્રેન સ્લેટ",
        "desc_hi": "बारीक दानेदार हाथीदांत रंग का पत्थर लीनियर क्लीवेज फ्रैक्चर के साथ।",
        "desc_gu": "ઝીણા દાણાવાળો હાથીદાંત રંગનો પથ્થર સીધી રેખાઓ સાથે."
    },
    "ST-FPS-115": {
        "name_hi": "SK 115",
        "name_gu": "SK 115",
        "tone_hi": "डेजर्ट रोज़े स्लेट",
        "tone_gu": "ડેઝર્ટ રોઝે સ્લેટ",
        "desc_hi": "गर्म रेगिस्तानी रेत और गुलाबी खनिज जो सूर्यास्त के प्रकाश को संजोते हैं।",
        "desc_gu": "ગરમ રણની રેતી અને ગુલાબી ખનિજો જે સૂર્યાસ્તના પ્રકાશને પકડે છે."
    },
    "ST-FPS-117": {
        "name_hi": "SK 117",
        "name_gu": "SK 117",
        "tone_hi": "पर्ल ट्रावरटाइन स्लेट",
        "tone_gu": "પર્લ ટ્રાવર્ટાઇન સ્લેટ",
        "desc_hi": "मुलायम मोती जैसा बेज ट्रावरटाइन क्रॉस-ग्रेन कोमल टेक्सचर के साथ।",
        "desc_gu": "નરમ મોતી જેવો બેજ ટ્રાવર્ટાઇન ક્રોસ-ગ્રેન સુંદર ટેક્સચર સાથે."
    },
    "ST-FPS-119": {
        "name_hi": "SK 119",
        "name_gu": "SK 119",
        "tone_hi": "चारकोल वेन स्लेट",
        "tone_gu": "ચારકોલ વેન સ્લેટ",
        "desc_hi": "गहरी चारकोल स्लेट प्लेट्स सूक्ष्म क्वार्ट्ज शिराओं के साथ जो विशिष्ट वास्तुशिल्पीय गहराई देती हैं।",
        "desc_gu": "ડાર્ક ચારકોલ સ્લેટ પ્લેટ્સ સૂક્ષ્મ ક્વાર્ટ્ઝ રેખાઓ સાથે જે ઉત્કૃષ્ટ વાસ્તુશિલ્પીય ઊંડાણ આપે છે."
    }
}



def get_chrome_executable():
    paths = [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
        shutil.which("google-chrome"),
        shutil.which("chromium"),
        shutil.which("chrome"),
    ]
    for p in paths:
        if p and os.path.exists(p):
            return p
    return None


def generate_css(lang="en"):
    base_css = fc.generate_css()
    font_block = get_fonts_css(lang)
    return font_block + "\n" + base_css


def generate_html(lang="en"):
    
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
    total_pages = 37
    css = generate_css(lang)
    parts = []

    doc_title = (
        "Stone Tech Atelier — Architectural Flexible Clay Veneers Master Catalogue 2026-2027"
        if lang == "en"
        else "स्टोन टेक एटेलियर — आर्किटेक्चरल फ्लेक्सिबल क्ले विनियर्स मास्टर कैटलॉग २०२६-२०२७"
        if lang == "hi"
        else "સ્ટોન ટેક એટેલિયર — આર્કિટેક્ચરલ ફ્લેક્સિબલ ક્લે વિનિયર્સ માસ્ટર કેટલોગ ૨૦૨૬-૨૦૨૭"
    )

    parts.append(f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>{doc_title}</title>
<style>
{css}
</style>
</head>
<body>
""")

    # -------------------------------------------------------------------------
    # PAGE 1: LUXURY FRONT COVER
    # -------------------------------------------------------------------------
    cover_title1 = (
        "ARCHITECTURAL FLEXIBLE CLAY VENEERS" if lang == "en"
        else "अत्यंत पतली लचीली क्ले विनियर्स (वास्तुशिल्पीय शीट्स)" if lang == "hi"
        else "અત્યંત પાતળી લચીલી ક્લે વિનિયર્સ (વાસ્તુશિલ્પીય શીટ્સ)"
    )
    cover_title2 = (
        "MODIFIED CLAY MATERIAL (MCM) · ULTRA-THIN BENDING STONE SERIES" if lang == "en"
        else "संशोधित क्ले सामग्री (MCM) · अत्यंत पतली मुड़ने वाली पाषाण श्रृंखला" if lang == "hi"
        else "મોડિફાઇડ ક્લે મટિરિયલ (MCM) · અત્યંત પાતળી વળતી પથ્થર શ્રેણી"
    )
    cover_edition = (
        "2026 – 2027 MASTER SPECIFICATION CATALOGUE" if lang == "en"
        else "२०२६ – २०२७ मास्टर विनिर्देश कैटलॉग" if lang == "hi"
        else "૨૦૨૬ – ૨૦૨૭ માસ્ટર સ્પેસિફિકેશન કેટલોગ"
    )
    cover_tagline1 = (
        "Nature, Engineered — Crafted from real mineral stone, these ultra-thin, flexible sheets retain the richness of authentic natural textures while bending seamlessly where traditional stone cannot." if lang == "en"
        else "प्रकृति एवं वास्तुकला का संगम — वास्तविक खनिज पाषाण से निर्मित, ये अत्यंत पतली लचीली शीट्स प्राकृतिक टेक्सचर की गहराई को बनाए रखते हुए वहां भी मुड़ जाती हैं जहां पारंपरिक पत्थर नहीं लग सकता।" if lang == "hi"
        else "કુદરત અને વાસ્તુશિલ્પનો સમન્વય — વાસ્તવિક ખનિજ પથ્થરમાંથી બનેલી, આ અત્યંત પાતળી લચીલી શીટ્સ કુદરતી ટેક્સચરની સુંદરતા જાળવીને ત્યાં પણ વળી જાય છે જ્યાં પરંપરાગત પથ્થર લગાવી શકાતો નથી."
    )
    cover_tagline2 = (
        "Redefining Facades with Flexible Sheets · 18 Textures · 10 Punch Traventino Slabs · 12 Punch Slat Slabs" if lang == "en"
        else "अत्यंत पतली लचीली शीट्स के साथ फसाड्स का नया स्वरूप · १८ टेक्सचर्स · १० पंच ट्रावेरटिनो · १२ पंच स्लेट" if lang == "hi"
        else "અત્યંત પાતળી લચીલી શીટ્સ સાથે ફસાદ્સનું નવું સ્વરૂપ · ૧૮ ટેક્સચર્સ · ૧૦ પંચ ટ્રાવર્ટિનો · ૧૨ પંચ સ્લેટ"
    )

    pillar1_head = "2.5–3.5 MM / ~3.8 KG/M²" if lang == "en" else "२.५–३.५ मिमी / ~३.८ किग्रा/वर्ग मीटर" if lang == "hi" else "૨.૫–૩.૫ મીમી / ~૩.૮ કિગ્રા/ચોરસ મીટર"
    pillar2_head = "RADIUS R ≥ 200 MM" if lang == "en" else "रेडियस R ≥ २०० मिमी" if lang == "hi" else "રેડિયસ R ≥ ૨૦૦ મીમી"
    pillar3_head = "CLASS A FIREPROOF / <2% H₂O" if lang == "en" else "क्लास A फायरप्रूफ / <२% जल अवशोषण" if lang == "hi" else "ક્લાસ A ફાયરપ્રૂફ / <૨% પાણી શોષણ"
    pillar4_head = "ZERO CEMENT / LOW CARBON" if lang == "en" else "शून्य सीमेंट / लो कार्बन कोर" if lang == "hi" else "શૂન્ય સિમેન્ટ / લો કાર્બન કોર"

    pillar1_num = "01. ULTRA LIGHTWEIGHT" if lang == "en" else "०१. अत्यंत हल्का भार" if lang == "hi" else "૦૧. અત્યંત હળવું વજન"
    pillar2_num = "02. 360° FLEXIBILITY" if lang == "en" else "०२. ३६०° लचीलापन" if lang == "hi" else "૦૨. ૩૬૦° લચીલાપણું"
    pillar3_num = "03. ALL-WEATHER LIFE" if lang == "en" else "०३. सर्व-ऋतु दीर्घायु" if lang == "hi" else "૦૩. સર્વ-ઋતુ દીર્ઘાયુષ્ય"
    pillar4_num = "04. ECO MINERAL CORE" if lang == "en" else "०४. पर्यावरण-अनुकूल खनिज कोर" if lang == "hi" else "૦૪. પર્યાવરણ-અનુકૂળ ખનિજ કોર"

    pillar1_body = (
        "Reduces structural dead-weight by over 80% compared to traditional 20mm masonry, eliminating high-rise anchor systems." if lang == "en"
        else "पारंपरिक २० मिमी पत्थरों की तुलना में ८०% से अधिक मृत भार कम करता है, जिससे ऊंची इमारतों में भारी क्लैडिंग एंकर की आवश्यकता समाप्त हो जाती है।" if lang == "hi"
        else "પરંપરાગત ૨૦ મીમી પથ્થરોની તુલનામાં ૮૦% થી વધુ વજન ઘટાડે છે, જેથી ઊંચી ઇમારતોમાં ભારે એન્કરની જરૂર રહેતી નથી."
    )
    pillar2_body = (
        "Seamlessly wraps circular columns, organic arches, curved perimeter walls, and sharp 90° corners without cracking." if lang == "en"
        else "गोल खंभों, मेहराबों, घुमावदार परिधि दीवारों और तीखे ९०° कोनों पर बिना टूटे सहजता से मुड़ जाता है।" if lang == "hi"
        else "ગોળાકાર થાંભલાઓ, કમાનો, ગોળાઈવાળી દીવાલો અને ૯૦° ખૂણાઓ પર તૂટ્યા વિના સરળતાથી વળી જાય છે."
    )
    pillar3_body = (
        "Non-combustible mineral matrix resistant to intense UV radiation, heavy rainfall, freeze-thaw cycles, and thermal shock." if lang == "en"
        else "अज्वलनशील खनिज मैट्रिक्स जो तीव्र यूवी किरणों, भारी वर्षा, पाला और अत्यधिक तापमान परिवर्तन के प्रति पूर्णतः प्रतिरोधी है।" if lang == "hi"
        else "બિન-દહનશીલ ખનિજ મેટ્રિક્સ જે તીવ્ર યુવી કિરણો, ભારે વરસાદ અને તાપમાનના ફેરફારો સામે સંપૂર્ણ ટકાઉ છે."
    )
    pillar4_body = (
        "Crafted from inorganic natural mineral powder and modified clay, zero toxic VOC emissions, fully recyclable." if lang == "en"
        else "अकार्बनिक प्राकृतिक खनिज पाउडर और संशोधित मिट्टी से निर्मित, शून्य विषैले वीओसी उत्सर्जन, पूर्णतः पुनर्चक्रण योग्य।" if lang == "hi"
        else "કુદરતી ખનિજ પાવડર અને માટીમાંથી બનેલ, શૂન્ય હાનિકારક વાયુ ઉત્સર્જન, ૧૦૦% પર્યાવરણ-અનુકૂળ."
    )

    parts.append(f"""
<div class="page cover-page">
  <div class="cover-border">
    <div class="cover-inner-border"></div>
    
    <div class="cover-header">
      <div class="cover-medallion">
        <img src="file://{EMBLEM_PATH}">
      </div>
      <div class="cover-brand">STONE TECH ATELIER</div>
      <div class="cover-atelier">ARCHITECTURAL FLEXIBLE CLAY VENEER DIVISION · ARCHITECTURAL INNOVATION</div>
      <div class="cover-line"></div>
    </div>
    
    <div class="cover-title-group">
      <div class="cover-title1">{cover_title1}</div>
      <div class="cover-title2">{cover_title2}</div>
      <div class="cover-edition">{cover_edition}</div>
      <div class="cover-tagline1">{cover_tagline1}</div>
      <div class="cover-tagline2">{cover_tagline2}</div>
    </div>
    
    <div class="cover-pillars">
      <div class="cover-pillar-card">
        <div class="pillar-num">{pillar1_num}</div>
        <div class="pillar-head">{pillar1_head}</div>
        <div class="pillar-body">{pillar1_body}</div>
      </div>
      <div class="cover-pillar-card">
        <div class="pillar-num">{pillar2_num}</div>
        <div class="pillar-head">{pillar2_head}</div>
        <div class="pillar-body">{pillar2_body}</div>
      </div>
      <div class="cover-pillar-card">
        <div class="pillar-num">{pillar3_num}</div>
        <div class="pillar-head">{pillar3_head}</div>
        <div class="pillar-body">{pillar3_body}</div>
      </div>
      <div class="cover-pillar-card">
        <div class="pillar-num">{pillar4_num}</div>
        <div class="pillar-head">{pillar4_head}</div>
        <div class="pillar-body">{pillar4_body}</div>
      </div>
    </div>
    
    <div class="cover-footer">
      <div>{"फैक्टरी एवं एटेलियर: " if lang == "hi" else "ફેક્ટરી અને એટેલિયર: " if lang == "gu" else "FACTORY & ATELIER: "}<strong>{"स्टोन टेक प्राइवेट लिमिटेड" if lang == "hi" else "સ્ટોન ટેક પ્રાઇવેટ લિમિટેડ" if lang == "gu" else "STONE TECH PRIVATE LIMITED"}</strong> · {"अहमदाबाद, गुजरात, भारत" if lang == "hi" else "અમદાવાદ, ગુજરાત, ભારત" if lang == "gu" else "AHMEDABAD, GUJARAT, INDIA"}</div>
      <div>{"प्रत्यक्ष वास्तुशिल्पीय पूछताछ एवं निर्यात: " if lang == "hi" else "સીધી વાસ્તુશિલ્પીય પૂછપરછ અને નિકાસ: " if lang == "gu" else "DIRECT ARCHITECTURAL ORDERS & EXPORT: "}<strong>+91 97844 52998 / +91 77420 90866</strong> · <strong>WWW.STONETECH.IN</strong></div>
      <div>{"डिस्पैच टर्मिनल्स: " if lang == "hi" else "ડિસ્પેચ ટર્મિનલ્સ: " if lang == "gu" else "DISPATCH TERMINALS: "}<strong>{"मुंद्रा / हजीरा / जेएनपीटी बंदरगाह" if lang == "hi" else "મુન્દ્રા / હઝીરા / જેએનપીટી બંદરો" if lang == "gu" else "MUNDRA / HAZIRA / JNPT PORTS"}</strong> · {"कंटेनरीकृत निर्यात लकड़ी की क्रेटिंग" if lang == "hi" else "નિકાસ લાકડાના ક્રેટિંગ" if lang == "gu" else "CONTAINERIZED EXPORT WOODEN CRATING"}</div>
    </div>
  </div>
</div>
""")

    # -------------------------------------------------------------------------
    # PAGE 2: PHILOSOPHY & BENDING HERO
    # -------------------------------------------------------------------------
    hero_img = os.path.join(ASSETS_DIR, "hero_bending_facade.jpg")
    p2_head = (
        "Redefining Facades with Flexible Sheets" if lang == "en"
        else "फ्लेक्सिबल शीट्स के साथ फसाड्स का नया स्वरूप" if lang == "hi"
        else "ફ્લેક્સિબલ શીટ્સ સાથે ફસાદ્સનું નવું સ્વરૂપ"
    )
    p2_callout_title = (
        "A MATERIAL THAT EXPANDS DESIGN" if lang == "en"
        else "डिजाइन की संभावनाओं को विस्तार देने वाला मटीरियल" if lang == "hi"
        else "ડિઝાઇનની શક્યતાઓને વિસ્તૃત કરતું મટિરિયલ"
    )

    parts.append(f"""
<div class="page" style="padding:0;">
  <div class="prod-header">
    <div class="prod-header-left">
      <img src="file://{EMBLEM_PATH}" class="prod-emblem">
      <div class="prod-brand-lockup">
        <span class="prod-brand-name">STONE TECH ATELIER</span>
        <span class="prod-division-tag">FLEXIBLE CLAY VENEERS DIVISION</span>
        <span style="font-size:6.5pt;background:#fef3c7;border:1px solid #fde68a;color:#b45309;padding:0.6mm 2mm;border-radius:1mm;font-weight:700;">MATERIAL PHILOSOPHY</span>
      </div>
    </div>
    <div class="prod-header-right">
      FACTORY DIRECT ORDERS: <strong>+91 77420 90866 / +91 97844 52998</strong> · <strong>WWW.STONETECH.IN</strong>
    </div>
  </div>
""")

    if lang == "hi":
        p2_nat_eng = "प्रकृति एवं वास्तुकला का संगम"
        p2_body1 = "वास्तविक खनिज पाषाण से निर्मित, ये अत्यंत पतली लचीली शीट्स प्राकृतिक टेक्सचर की गहराई को संजोए रखते हुए अभूतपूर्व वास्तुशिल्पीय स्वतंत्रता प्रदान करती हैं।"
        p2_body2 = "यह वहां भी सुगमता से मुड़ जाती है जहां पारंपरिक पत्थर नहीं लग सकता। बाहरी समतल फसाड से लेकर घुमावदार खंभों, लहरदार कैनोपी और दोहरी ऊंचाई के वक्रों तक, यह असीम रचनात्मकता हेतु तैयार की गई सामग्री है।"
        p2_callout_body = "पारंपरिक मेसनरी भारी स्ट्रक्चरल लोड डालती है जिसके लिए महंगे भारी स्टील ब्रैकेट और जटिल सबस्ट्रक्चर की आवश्यकता होती है। स्टोन टेक लचीली क्ले विनियर्स का वजन ४ किग्रा/वर्ग मीटर से भी कम है, जो कंक्रीट, प्लास्टर, सीमेंट बोर्ड और घुमावदार सतहों पर सीधे चिपक जाती हैं।"
        p2_key_adv = "प्रमुख वास्तुशिल्पीय विशेषताएं"
        p2_adv_chips = "• <strong>शून्य टूटन:</strong> अत्यधिक लचीला"
        p2_adv_cut = "• <strong>आसान कटाई:</strong> यूटिलिटी ब्लेड / आरी"
        p2_adv_fire = "• <strong>क्लास A अग्नि सुरक्षा:</strong> अज्वलनशील"
        p2_adv_thaw = "• <strong>फ्रीज-थॉ प्रतिरोधी:</strong> १००+ चक्र परीक्षित"
        p2_adv_water = "• <strong>जलरोधी:</strong> < २.०% अवशोषण"
        p2_adv_fast = "• <strong>त्वरित स्थापना:</strong> सीधा दीवार चिपकाव"
        p2_bend_label = "डायनामिक ३६०° कोल्ड बेंडिंग:"
        p2_bend_text = "बिना किसी हीटिंग के घुमावदार वास्तुशिल्पीय खंभों और फसाड सतहों पर आसानी से मुड़ने वाली बहु-रंगीन लचीली शीट्स।"
        p3_subtitle = "क्यूरेटेड प्राकृतिक रंग छटाएं"
        p3_desc = "हमारी 3D सीरीज़ का प्रत्येक टेक्सचर प्रोफाइल ९ मौलिक खनिज शेड्स में तैयार किया गया है, जो २०००+ घंटे यूवी रंग स्थिरता वाले अकार्बनिक प्राकृतिक रंगों से निर्मित है।"
        footer_brand = "स्टोन टेक एटेलियर · अत्यंत पतली लचीली क्ले विनियर एवं 3D वास्तुशिल्पीय टेक्सचर्स"
    elif lang == "gu":
        p2_nat_eng = "કુદરત અને વાસ્તુશિલ્પનો સમન્વય"
        p2_body1 = "વાસ્તવિક ખનિજ પથ્થરમાંથી બનેલી, આ અત્યંત પાતળી લચીલી શીટ્સ કુદરતી ટેક્સચરની સુંદરતા જાળવીને અભૂતપૂર્વ વાસ્તુશિલ્પીય સ્વતંત્રતા આપે છે."
        p2_body2 = "પરંપરાગત પથ્થર જ્યાં ન લગાવી શકાય ત્યાં પણ આ સરળતાથી વળી જાય છે. બાહ્ય દીવાલોથી લઈને ગોળાકાર થાંભલાઓ અને વળાંકો સુધી સર્જનાત્મક ડિઝાઇન માટે આ ઉત્તમ છે."
        p2_callout_body = "પરંપરાગત ચણતર ભારે વજન લાદે છે જેના માટે મોંઘા સ્ટીલ બ્રેકેટ્સની જરૂર પડે છે. સ્ટોન ટેક લચીલી ક્લે વિનિયર્સનું વજન ૪ કિગ્રા/ચોરસ મીટરથી પણ ઓછું છે, જે કોંક્રિટ, પ્લાસ્ટર, સિમેન્ટ બોર્ડ અને વળાંકવાળી સપાટીઓ પર સીધું ચોંટી જાય છે."
        p2_key_adv = "મુખ્ય વાસ્તુશિલ્પીય વિશેષતાઓ"
        p2_adv_chips = "• <strong>શૂન્ય તૂટફૂટ:</strong> અત્યંત લચીલું"
        p2_adv_cut = "• <strong>સરળ કટિંગ:</strong> કટર / કરવત વડે"
        p2_adv_fire = "• <strong>ક્લાસ A અગ્નિ સુરક્ષા:</strong> અદહનશીલ"
        p2_adv_thaw = "• <strong>ફ્રીઝ-થો પ્રતિરોધક:</strong> ૧૦૦+ ચક્ર પ્રમાણિત"
        p2_adv_water = "• <strong>જળરોધક:</strong> < ૨.૦% શોષણ"
        p2_adv_fast = "• <strong>ઝડપી ઇન્સ્ટોલેશન:</strong> દીવાલ પર સીધું ચોંટાડો"
        p2_bend_label = "ડાયનામિક ૩૬૦° કોલ્ડ બેન્ડિંગ:"
        p2_bend_text = "હીટિંગ વગર ગોળાકાર વાસ્તુશિલ્પીય થાંભલાઓ અને ફેસાડ પર સરળતાથી વળી જતી લચીલી શીટ્સ."
        p3_subtitle = "કુદરતી પથ્થર રંગ છટાઓ"
        p3_desc = "અમારી 3D સિરીઝની દરેક ડિઝાઇન ૯ કુદરતી ખનિજ શેડ્સમાં તૈયાર કરવામાં આવી છે, જે ૨૦૦૦+ કલાક યુવી રંગ સ્થિરતા ધરાવે છે."
        footer_brand = "સ્ટોન ટેક એટેલિયર · અત્યંત પાતળી લચીલી ક્લે વિનિયર્સ અને 3D વાસ્તુશિલ્પીય ટેક્સચર્સ"
    else:
        p2_nat_eng = "NATURE, ENGINEERED"
        p2_body1 = "Crafted from real mineral stone, these ultra-thin, flexible sheets retain the richness of natural textures while unlocking unprecedented architectural freedom."
        p2_body2 = "It bends and integrates seamlessly where traditional stone cannot. From flat exterior planes to organic columns, undulating canopies, and double-height curves, this is stone designed for boundless creativity."
        p2_callout_body = "Traditional masonry imposes severe structural dead-weight, requiring expensive heavy steel brackets and complex structural substructures. Stone Tech Flexible Clay Veneers weigh under 4 kg/m², bonding directly with polymer adhesive onto concrete, plaster, cement boards, and curved substrates."
        p2_key_adv = "KEY MATERIAL ADVANTAGES"
        p2_adv_chips = "• <strong>Zero Chipping:</strong> Highly ductile"
        p2_adv_cut = "• <strong>Easy Cutting:</strong> Utility blade / saw"
        p2_adv_fire = "• <strong>Class A Fire:</strong> Non-combustible"
        p2_adv_thaw = "• <strong>Freeze-Thaw:</strong> 100+ cycles tested"
        p2_adv_water = "• <strong>Waterproof:</strong> &lt; 2.0% absorption"
        p2_adv_fast = "• <strong>Fast Layout:</strong> Direct wall adhesion"
        p2_bend_label = "Dynamic 360° Cold Bending:"
        p2_bend_text = "Multi-tonal flexible sheets wrapping curved architectural columns and facade contours with zero thermal preheating."
        p3_subtitle = "CURATED EARTH TONALITIES"
        p3_desc = "Every texture profile in our 3D series is precision-crafted across 9 elemental mineral shades, formulated using inorganic natural pigments with 2000+ hour UV colorfastness."
        footer_brand = "STONE TECH ATELIER · ARCHITECTURAL SPECIFICATION CATALOGUE 2026-2027"

    parts.append(f"""
  <div style="display:grid;grid-template-columns:120mm 157mm;gap:6mm;padding:6mm 10mm 10mm;height:calc(210mm - 22mm);">
    <div style="display:flex;flex-direction:column;gap:3.5mm;height:100%;text-align:left;">
      <div>
        <div style="font-size:8.5pt;font-weight:800;color:#f59e0b;letter-spacing:1.5px;margin-bottom:1.5mm;text-transform:uppercase;">{p2_nat_eng}</div>
        <div style="font-size:18pt;font-weight:900;color:#ffffff;line-height:1.2;margin-bottom:3mm;letter-spacing:-0.3px;">{p2_head}</div>
        <div style="font-size:8.5pt;color:#e2e8f0;line-height:1.6;margin-bottom:3mm;text-align:left;word-break:normal;">
          {p2_body1}
        </div>
        <div style="font-size:8pt;color:#94a3b8;line-height:1.6;margin-bottom:3.5mm;text-align:left;word-break:normal;">
          {p2_body2}
        </div>
        <div style="background:#1e293b;border:0.4mm solid #334155;border-left:1.5mm solid #d97706;border-radius:2mm;padding:3.5mm 4mm;margin-bottom:2mm;">
          <div style="font-size:7.5pt;font-weight:800;color:#f59e0b;margin-bottom:1.5mm;letter-spacing:0.8px;">{p2_callout_title}</div>
          <div style="font-size:7.2pt;color:#cbd5e1;line-height:1.55;text-align:left;word-break:normal;">
            {p2_callout_body}
          </div>
        </div>
      </div>

      <div style="background:#0f172a;border:0.4mm solid #334155;border-radius:2mm;padding:3mm 3.5mm;margin-top:auto;">
        <div style="font-size:7pt;font-weight:800;color:#67e8f9;letter-spacing:1px;margin-bottom:2mm;">{p2_key_adv}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:2mm;font-size:6.8pt;color:#cbd5e1;line-height:1.45;">
          <div>{p2_adv_chips}</div>
          <div>{p2_adv_cut}</div>
          <div>{p2_adv_fire}</div>
          <div>{p2_adv_thaw}</div>
          <div>{p2_adv_water}</div>
          <div>{p2_adv_fast}</div>
        </div>
      </div>
    </div>

    <div style="border:0.4mm solid #334155;border-radius:2.5mm;overflow:hidden;background:#020617;position:relative;">
      <img src="file://{hero_img}" style="width:100%;height:100%;object-fit:cover;">
      <div style="position:absolute;bottom:3mm;left:3mm;right:3mm;background:rgba(15,23,42,0.88);border:0.3mm solid #d97706;border-radius:1.5mm;padding:2mm 3mm;font-size:7pt;color:#e2e8f0;line-height:1.45;text-align:left;">
        <strong style="color:#fbbf24;">{p2_bend_label}</strong> {p2_bend_text}
      </div>
    </div>
  </div>

  <div class="prod-footer-bar">
    <span>{footer_brand}</span>
    <span>{COMMON_I18N['page_x_of_y'][lang](2, total_pages, lang)}</span>
    <span>{contact_footer_text}</span>
  </div>
</div>
""")

    # -------------------------------------------------------------------------
    # PAGE 3: 9-COLOR ARCHITECTURAL PALETTE SPREAD
    # -------------------------------------------------------------------------
    p3_title = (
        "9 Signature Architectural Colors" if lang == "en"
        else f"{to_indic(9, lang)} सिग्नेचर आर्किटेक्चरल कलर्स" if lang == "hi"
        else f"{to_indic(9, lang)} સિગ્નેચર આર્કિટેક્ચરલ કલર્સ"
    )
    parts.append(f"""
<div class="page" style="padding:0;">
  <div class="prod-header">
    <div class="prod-header-left">
      <img src="file://{EMBLEM_PATH}" class="prod-emblem">
      <div class="prod-brand-lockup">
        <span class="prod-brand-name">STONE TECH ATELIER</span>
        <span class="prod-division-tag">FLEXIBLE CLAY VENEERS DIVISION</span>
        <span style="font-size:6.5pt;background:#fef3c7;border:1px solid #fde68a;color:#b45309;padding:0.6mm 2mm;border-radius:1mm;font-weight:700;">COLOR SYSTEM</span>
      </div>
    </div>
    <div class="prod-header-right">
      FACTORY DIRECT ORDERS: <strong>+91 77420 90866 / +91 97844 52998</strong> · <strong>WWW.STONETECH.IN</strong>
    </div>
  </div>

  <div style="padding:5mm 10mm 10mm;height:calc(210mm - 22mm);display:flex;flex-direction:column;justify-content:space-between;text-align:left;">
    <div style="border-bottom:0.4mm solid #334155;padding-bottom:2.5mm;">
      <div style="font-size:8pt;font-weight:800;color:#f59e0b;letter-spacing:1px;text-transform:uppercase;">{p3_subtitle}</div>
      <div style="font-size:16pt;font-weight:900;color:#ffffff;margin:1mm 0;letter-spacing:-0.2px;">{p3_title}</div>
      <div style="font-size:7.5pt;color:#94a3b8;line-height:1.55;text-align:left;word-break:normal;">
        {p3_desc}
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:4mm;margin:3mm 0;">
""")
    for c in COLORS:
        c_name = CLAY_COLORS.get(c['name'], {}).get(lang, c['name']) if lang != "en" else c['name']
        parts.append(f"""
      <div style="background:#1e293b;border:0.4mm solid #334155;border-radius:2mm;padding:3mm;display:flex;align-items:center;gap:3mm;">
        <div style="width:14mm;height:14mm;border-radius:2mm;background:{c['hex']};border:0.5mm solid {c['border']};flex-shrink:0;"></div>
        <div>
          <div style="font-size:9.5pt;font-weight:800;color:#ffffff;">{c_name}</div>
          <div style="font-size:6.5pt;color:#94a3b8;margin-top:0.5mm;">Available across all 18 Textures</div>
          <div style="font-size:6.2pt;color:#67e8f9;margin-top:0.5mm;">UV Resistant · {localize_dimensions('1200×2400 mm', lang)}</div>
        </div>
      </div>
""")

    parts.append(f"""
    </div>

    <div style="background:#0b1120;border:0.4mm solid #334155;border-radius:2mm;padding:2.5mm 4mm;display:flex;justify-content:space-between;align-items:center;font-size:7pt;color:#cbd5e1;">
      <div><strong style="color:#fbbf24;">Standard Sizing:</strong> {localize_dimensions('1200 × 2400 mm', lang)} Large Format Sheet · Custom lengths available.</div>
      <div><strong style="color:#67e8f9;">Thickness Profile:</strong> {localize_dimensions('2.5 mm – 3.5 mm', lang)} · Weight: ~{localize_dimensions('3.8 kg/m²', lang)}</div>
    </div>
  </div>

  <div class="prod-footer-bar">
    <span>{footer_spec_bar}</span>
    <span>{COMMON_I18N['page_x_of_y'][lang](3, total_pages, lang)}</span>
    <span>{contact_footer_text}</span>
  </div>
</div>
""")

    # -------------------------------------------------------------------------
    # PAGE 4: COLLECTION I DIVIDER — ARCHITECTURAL 3D TEXTURES
    # -------------------------------------------------------------------------
    c1_title = (
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
      <div class="divider-spec-chip">{c1_spec3}</div>
      <div class="divider-spec-chip">BENDING: <strong>R ≥ {to_indic(200, lang)} MM</strong></div>
    </div>
  </div>
  <div class="prod-footer-bar">
    <span>{footer_spec_bar}</span>
    <span>{COMMON_I18N['page_x_of_y'][lang](4, total_pages, lang)}</span>
    <span>{contact_footer_text}</span>
  </div>
</div>
""")

    # -------------------------------------------------------------------------
    # PAGES 5 - 22: 18 ARCHITECTURAL 3D TEXTURE SPREADS
    # -------------------------------------------------------------------------
    for i, tex in enumerate(TEXTURES):
        page_num = 5 + i
        scene_path = os.path.join(ASSETS_DIR, f"{tex['slug']}_scene.jpg")
        swatch_path = os.path.join(ASSETS_DIR, f"{tex['slug']}_swatch.jpg")

        tex_code = tex["code"]
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
      </div>
    </div>
  </div>

  <div class="prod-footer-bar">
    <span>{footer_spec_bar}</span>
    <span>{COMMON_I18N['page_x_of_y'][lang](page_num, total_pages, lang)}</span>
    <span>{contact_footer_text}</span>
  </div>
</div>
""")

    # -------------------------------------------------------------------------
    # PAGE 23: COLLECTION II DIVIDER — PUNCH TRAVENTINO SLABS
    # -------------------------------------------------------------------------
    c2_title = (
        "PUNCH TRAVENTINO SLABS" if lang == "en"
        else "पंच ट्रावेरटिनो स्लैब्स" if lang == "hi"
        else "પંચ ટ્રાવર્ટિનો સ્લેબ્સ"
    )
    c2_badge = f"COLLECTION {to_indic('02', lang)}" if lang != "en" else "COLLECTION 02"
    parts.append(f"""
<div class="page divider-page">
  <div class="divider-border">
    <div class="cover-inner-border"></div>
    <div class="divider-badge">{c2_badge}</div>
    <div class="divider-title">{c2_title}</div>
    <div class="divider-sub">{"१० विशिष्ट ट्रावरटाइन स्लैब चयन · TS 201 से TS 220" if lang == "hi" else ("૧૦ વિશિષ્ટ ટ્રાવર્ટાઇન સ્લેબ પસંદગી · TS 201 થી TS 220" if lang == "gu" else f"{to_indic(10, lang)} SIGNATURE TRAVERTINE SLAB SELECTIONS · TS 201 TO TS 220")}</div>
    <div class="divider-desc">
      {"इंजीनियर्ड लीनियर वेन-कट एवं सूक्ष्म छिद्रों से युक्त प्राकृतिक ट्रावरटाइन स्लैब्स जो बिना संरचनात्मक भार के प्रामाणिक अवसादी सौंदर्य प्रदान करते हैं। लक्जरी आवासीय अग्रभागों, रिसेप्शन और व्यावसायिक परिसरों हेतु निर्मित।" if lang == "hi" else ("એન્જિનિયર્ડ લિનિયર વેન-કટ અને છિદ્રાળુ કુદરતી ટ્રાવર્ટાઇન સ્લેબ્સ જે કોઈપણ માળખાકીય વજન વિના અધિકૃત કુદરતી ભવ્યતા આપે છે. લક્ઝરી રહેણાંક ફેસાડ, રિસેપ્શન અને જાહેર ઇમારતો માટે શ્રેષ્ઠ." if lang == "gu" else "Engineered linear vein-cut and cavity-pitted natural travertine slabs offering authentic sedimentary character without structural weight. Formulated for luxury residential facades, reception pavilions, and high-traffic public commercial buildings.")}
    </div>
    <div class="divider-specs">
      <div class="divider-spec-chip">{"विविध साइज़: <strong>६००×१२०० / १२००×२४०० मिमी</strong>" if lang == "hi" else ("વિવિધ સાઇઝ: <strong>૬૦૦×૧૨૦૦ / ૧૨૦૦×૨૪૦૦ મીમી</strong>" if lang == "gu" else "MULTIPLE SIZES: <strong>600×1200 / 1200×2400 MM</strong>")}</div>
      <div class="divider-spec-chip">{"लचीलापन: <strong>R ≥ २०० मिमी</strong>" if lang == "hi" else ("લચીલાપણું: <strong>R ≥ ૨૦૦ મીમી</strong>" if lang == "gu" else f"FLEXIBILITY: <strong>R ≥ {to_indic(200, lang)} MM</strong>")}</div>
      <div class="divider-spec-chip">{"जलरोधी: <strong>&lt; २.०% अवशोषण</strong>" if lang == "hi" else ("વોટરપ્રૂફ: <strong>&lt; ૨.૦% શોષણ</strong>" if lang == "gu" else f"WATERPROOF: <strong>&lt; {to_indic('2.0', lang)}% ABSORPTION</strong>")}</div>
      <div class="divider-spec-chip">{"अग्नि सुरक्षा: <strong>क्लास A</strong>" if lang == "hi" else ("અગ્નિ સુરક્ષા: <strong>ક્લાસ A</strong>" if lang == "gu" else "FIRE SAFETY: <strong>CLASS A</strong>")}</div>
    </div>
  </div>
  <div class="prod-footer-bar">
    <span>{footer_spec_bar}</span>
    <span>{COMMON_I18N['page_x_of_y'][lang](23, total_pages, lang)}</span>
    <span>{contact_footer_text}</span>
  </div>
</div>
""")

    # -------------------------------------------------------------------------
    # PAGES 24 - 28: 10 PUNCH TRAVENTINO SLABS (2 per page)
    # -------------------------------------------------------------------------
    for i in range(0, len(PUNCH_TRAVENTINO), 2):
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

        parts.append(f"""
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
  </div>

  <div class="prod-footer-bar">
    <span>{footer_spec_bar}</span>
    <span>{COMMON_I18N['page_x_of_y'][lang](page_num, total_pages, lang)}</span>
    <span>{contact_footer_text}</span>
  </div>
</div>
""")

    # -------------------------------------------------------------------------
    # PAGE 29: COLLECTION III DIVIDER — PUNCH SLAT SLABS
    # -------------------------------------------------------------------------
    c3_title = (
        "PUNCH SLAT SLABS" if lang == "en"
        else "पंच स्लेट स्लैब्स" if lang == "hi"
        else "પંચ સ્લેટ સ્લેબ્સ"
    )
    c3_badge = f"COLLECTION {to_indic('03', lang)}" if lang != "en" else "COLLECTION 03"
    parts.append(f"""
<div class="page divider-page">
  <div class="divider-border">
    <div class="cover-inner-border"></div>
    <div class="divider-badge">{c3_badge}</div>
    <div class="divider-title">{c3_title}</div>
    <div class="divider-sub">{"१२ वास्तुशिल्पीय क्लेफ्ट स्लेट स्लैब्स · SK 103 से SK 119" if lang == "hi" else ("૧૨ વાસ્તુશિલ્પીય ક્લેફ્ટ સ્લેટ સ્લેબ્સ · SK 103 થી SK 119" if lang == "gu" else f"{to_indic(12, lang)} ARCHITECTURAL CLEFT SLAT SLABS · SK 103 TO SK 119")}</div>
    <div class="divider-desc">
      {"प्राकृतिक पर्वतीय क्लेफ्ट स्प्लिट-फेस स्लेट संरचनाएं जो समृद्ध भूवैज्ञानिक कंट्रास्ट, नाजुक संस्तरण तल और प्राकृतिक खनिज धारियां प्रस्तुत करती हैं। समकालीन अग्रभागों, चारदीवारी और लैंडस्केप हेतु उपयुक्त।" if lang == "hi" else ("કુદરતી પર્વતીય ક્લેફ્ટ સ્પ્લિટ-ફેસ સ્લેટ રચનાઓ જે સમૃદ્ધ ભૂસ્તરશાસ્ત્રીય કોન્ટ્રાસ્ટ અને અદભુત ખનિજ રેખાઓ રજૂ કરે છે. સમકાલીન ફેસાડ, બાઉન્ડ્રી વોલ અને લેન્ડસ્કેપ માટે ઉત્તમ." if lang == "gu" else "Linear natural mountain cleft split-face slate formations delivering rich geological contrast, delicate cleavage bedding planes, and earth-toned mineral striations. Engineered for contemporary facades, boundary walls, and luxury landscape features.")}
    </div>
    <div class="divider-specs">
      <div class="divider-spec-chip">{"विविध साइज़: <strong>६००×१२०० / १२००×२४०० मिमी</strong>" if lang == "hi" else ("વિવિધ સાઇઝ: <strong>૬૦૦×૧૨૦૦ / ૧૨૦૦×૨૪૦૦ મીમી</strong>" if lang == "gu" else "MULTIPLE SIZES: <strong>600×1200 / 1200×2400 MM</strong>")}</div>
      <div class="divider-spec-chip">{"लचीलापन: <strong>R ≥ २०० मिमी</strong>" if lang == "hi" else ("લચીલાપણું: <strong>R ≥ ૨૦૦ મીમી</strong>" if lang == "gu" else f"FLEXIBILITY: <strong>R ≥ {to_indic(200, lang)} MM</strong>")}</div>
      <div class="divider-spec-chip">{"जलरोधी: <strong>&lt; २.०% अवशोषण</strong>" if lang == "hi" else ("વોટરપ્રૂફ: <strong>&lt; ૨.૦% શોષણ</strong>" if lang == "gu" else f"WATERPROOF: <strong>&lt; {to_indic('2.0', lang)}% ABSORPTION</strong>")}</div>
      <div class="divider-spec-chip">{"अग्नि सुरक्षा: <strong>क्लास A</strong>" if lang == "hi" else ("અગ્નિ સુરક્ષા: <strong>ક્લાસ A</strong>" if lang == "gu" else "FIRE SAFETY: <strong>CLASS A</strong>")}</div>
    </div>
  </div>
  <div class="prod-footer-bar">
    <span>{footer_spec_bar}</span>
    <span>{COMMON_I18N['page_x_of_y'][lang](29, total_pages, lang)}</span>
    <span>{contact_footer_text}</span>
  </div>
</div>
""")

    # -------------------------------------------------------------------------
    # PAGES 30 - 35: 12 PUNCH SLAT SLABS (2 per page)
    # -------------------------------------------------------------------------
    for i in range(0, len(PUNCH_SLAT), 2):
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

        parts.append(f"""
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
  </div>

  <div class="prod-footer-bar">
    <span>{footer_spec_bar}</span>
    <span>{COMMON_I18N['page_x_of_y'][lang](page_num, total_pages, lang)}</span>
    <span>{contact_footer_text}</span>
  </div>
</div>
""")

    # -------------------------------------------------------------------------
    # PAGE 36: INSTALLATION ENGINEERING GUIDE
    # -------------------------------------------------------------------------
    guide_title = (
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

    parts.append(f"""
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
  </div>

  <div class="prod-footer-bar">
    <span>{footer_spec_bar}</span>
    <span>{COMMON_I18N['page_x_of_y'][lang](36, total_pages, lang)}</span>
    <span>{contact_footer_text}</span>
  </div>
</div>
""")

    # -------------------------------------------------------------------------
    # PAGE 37: SPECIFICATION MATRIX & BACK COVER
    # -------------------------------------------------------------------------
    matrix_title = (
        "ARCHITECTURAL PERFORMANCE & COMPLIANCE MATRIX" if lang == "en"
        else "वास्तुशिल्पीय प्रदर्शन एवं अनुपालन मैट्रिक्स" if lang == "hi"
        else "વાસ્તુશિલ્પીય પ્રદર્શન અને અનુપાલન મેટ્રિક્સ"
    )
    studio_title = COMMON_I18N["experience_center_title"][lang]
    studio_addr = COMMON_I18N["experience_center_address"][lang]

    parts.append(f"""
<div class="page" style="padding:0;">
  <div class="prod-header">
    <div class="prod-header-left">
      <img src="file://{EMBLEM_PATH}" class="prod-emblem">
      <div class="prod-brand-lockup">
        <span class="prod-brand-name">STONE TECH ATELIER</span>
        <span class="prod-division-tag">FLEXIBLE CLAY VENEERS</span>
        <span style="font-size:6.5pt;background:#fef3c7;border:1px solid #fde68a;color:#b45309;padding:0.6mm 2mm;border-radius:1mm;font-weight:700;">SPECIFICATION MATRIX</span>
      </div>
    </div>
    <div class="prod-header-right">
      TECHNICAL ASSISTANCE: <strong>+91 77420 90866 / +91 97844 52998</strong> · <strong>WWW.STONETECH.IN</strong>
    </div>
  </div>

  <div class="matrix-page">
    <div class="matrix-header-box">
      <div class="matrix-subtitle">LABORATORY CERTIFIED TEST DATA</div>
      <div class="matrix-title">{matrix_title}</div>
    </div>

    <div class="matrix-table-wrap">
      <table class="matrix-table">
        <thead>
          <tr>
            <th style="width:26%;">Physical &amp; Mechanical Property</th>
            <th style="width:22%;">International Standard</th>
            <th style="width:26%;">Measured Value</th>
            <th style="width:26%;">Architectural Advantage</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Areal Mass / Unit Weight</strong></td>
            <td>ASTM C373 / ISO 10545-3</td>
            <td class="val-strong">{localize_dimensions('3.50 – 4.50 kg / m²', lang)}</td>
            <td>Over 80% lighter than natural 20mm granite / sandstone slabs</td>
          </tr>
          <tr>
            <td><strong>Fire Safety Rating</strong></td>
            <td>EN 13501-1 / ASTM E84</td>
            <td class="val-strong">Class A (Flame Spread: 0 · Smoke: &lt; 5)</td>
            <td>Non-combustible; certified for high-rise facades and public lobbies</td>
          </tr>
          <tr>
            <td><strong>Water Absorption</strong></td>
            <td>ASTM C97 / ISO 10545-3</td>
            <td class="val-strong">&lt; {to_indic('2.0', lang)}% (Hydrophobic impermeable)</td>
            <td>Resistant to rain penetration, efflorescence, and moisture stains</td>
          </tr>
          <tr>
            <td><strong>Tensile Bond Strength</strong></td>
            <td>EN 12004 / ASTM C482</td>
            <td class="val-strong">&gt; {to_indic('1.20', lang)} N / mm²</td>
            <td>High shear adhesion preventing delamination under wind suction</td>
          </tr>
          <tr>
            <td><strong>Freeze-Thaw Durability</strong></td>
            <td>EN 1344 / ASTM C666</td>
            <td class="val-strong">{to_indic(100, lang)} Cycles (-20°C to +20°C) without cracking</td>
            <td>Suitable for harsh cold climates, alpine, and desert thermal swings</td>
          </tr>
          <tr>
            <td><strong>Bending Elasticity Radius</strong></td>
            <td>Mandrel Flexibility Test</td>
            <td class="val-strong">R ≥ {to_indic(200, lang)} mm (Cold bending)</td>
            <td>Enables seamless wrapping of round columns, vaults, and arches</td>
          </tr>
          <tr>
            <td><strong>UV &amp; Weathering</strong></td>
            <td>ASTM G154 (Xenon Arc 2000 hrs)</td>
            <td class="val-strong">ΔE* &lt; {to_indic('1.5', lang)} (Zero fading)</td>
            <td>Preserves vibrant color consistency under intense exterior sunlight</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="studio-grid">
      <div class="studio-card">
        <div class="studio-card-title">{studio_title}</div>
        <div class="studio-card-body">
          <strong>STONE TECH ATELIER · EXPERIENCE CENTER</strong><br>
          {studio_addr}<br>
          <strong>Direct WhatsApp &amp; Sales Hotline:</strong> +91 77420 90866 / +91 97844 52998<br>
          <strong>Email:</strong> info@stonetech.in · <strong>Website:</strong> www.stonetech.in<br>
          <em>Studio Hours: Monday – Saturday, 10:00 AM – 7:30 PM</em>
        </div>
      </div>

      <div class="studio-card">
        <div class="studio-card-title">GLOBAL EXPORT PACKAGING &amp; QUALITY ASSURANCE</div>
        <div class="studio-card-body">
          <strong>Export-Standard Protective Packaging:</strong> ISPM-15 heat-treated solid pine/plywood timber crates with EPE foam interleaving and corner edge protectors.<br>
          <strong>Moisture Protection:</strong> Hermetically sealed VCI waterproof barrier and shrink-wrapped pallet encasement.<br>
          <strong>Primary Export Ports:</strong> Mundra Port / Hazira / JNPT Mumbai.<br>
          <strong>Direct Invoicing &amp; Supply:</strong> Stone Tech Private Limited. All rights reserved © 2026-2027.
        </div>
      </div>
    </div>
  </div>

  <div class="prod-footer-bar">
    <span>{footer_spec_bar}</span>
    <span>{COMMON_I18N['page_x_of_y'][lang](total_pages, total_pages, lang)}</span>
    <span>{contact_footer_text}</span>
  </div>
</div>
""")

    parts.append("</body>\n</html>\n")
    return "".join(parts)


def build_pdf(lang="en"):
    print(f"--- Compiling Flexible Clay Veneers PDF [{lang.upper()}] ---")
    out_name = (
        "StoneTech_Flexible_Clay_Veneers_Catalogue_English.pdf" if lang == "en"
        else "StoneTech_Flexible_Clay_Veneers_Catalogue_Hindi.pdf" if lang == "hi"
        else "StoneTech_Flexible_Clay_Veneers_Catalogue_Gujarati.pdf"
    )
    out_path = os.path.join(REPO_DIR, "public/catalogues", out_name)
    html_content = generate_html(lang)
    html_file = f"/tmp/flexible_clay_{lang}.html"
    with open(html_file, "w", encoding="utf-8") as f:
        f.write(html_content)

    chrome_bin = get_chrome_executable()
    if not chrome_bin:
        print("ERROR: Chrome binary not found!")
        sys.exit(1)

    t0 = time.time()
    cmd = [
        chrome_bin,
        "--headless=new",
        "--disable-gpu",
        "--no-pdf-header-footer",
        "--print-to-pdf-no-header",
        f"--print-to-pdf={out_path}",
        html_file,
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"Error compiling {lang}:", res.stderr)
        sys.exit(1)

    dur = time.time() - t0
    size_mb = os.path.getsize(out_path) / (1024 * 1024)
    print(f"[{lang.upper()}] compiled in {dur:.2f}s -> {out_name} ({size_mb:.2f} MiB)")


    user_dl = os.path.expanduser(f"~/Downloads/{out_name}")
    try:
        shutil.copyfile(out_path, user_dl)
        print(f"Mirrored to user downloads: {user_dl}")
    except Exception as e:
        print(f"Warning mirroring to downloads: {e}")

    if lang == "en":
        master_2026 = os.path.join(REPO_DIR, "public/catalogues/StoneTech_Flexible_Clay_Veneers_Catalogue_2026.pdf")
        shutil.copyfile(out_path, master_2026)
        print(f"Mirrored to master default: StoneTech_Flexible_Clay_Veneers_Catalogue_2026.pdf")
        user_dl_master = os.path.expanduser("~/Downloads/StoneTech_Flexible_Clay_Veneers_Catalogue_2026.pdf")
        try:
            shutil.copyfile(out_path, user_dl_master)
        except Exception:
            pass

    return out_path



def main():
    langs = sys.argv[1:] if len(sys.argv) > 1 else ["en", "hi", "gu"]
    for l in langs:
        build_pdf(l)


if __name__ == "__main__":
    main()

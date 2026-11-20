# -*- coding: utf-8 -*-
import sys
import os

sys.path.append('scripts')
import importlib

sp = importlib.import_module('generate-stone-pebbles-catalogue')
fc = importlib.import_module('generate-flexible-clay-catalogue')
sg = importlib.import_module('generate-solid-glass-bricks-catalogue')
hg = importlib.import_module('generate-hollow-glass-bricks-catalogue')

out_path = "scripts/full_catalogue_data.py"

pebble_names_map = {
    "Rose Quartz": ("रोज़ क्वार्ट्ज़ (गुलाबी स्फटिक)", "રોઝ ક્વાર્ટ્ઝ (ગુલાબી સ્ફટિક)"),
    "Crystal Quartz": ("क्रिस्टल क्वार्ट्ज़ (पारदर्शी स्फटिक)", "ક્રિસ્ટલ ક્વાર્ટ્ઝ (પારદર્શક સ્ફટિક)"),
    "African Amethyst": ("अफ्रीकन एमेथिस्ट (जामुनिया स्फटिक)", "આફ્રિકન એમેથિસ્ટ (જાંબુડિયો સ્ફટિક)"),
    "Red Carnelian": ("लाल कार्नेलियन (अकीक पाषाण)", "લાલ કાર્નેલિયન (અકીક પથ્થર)"),
    "Lapis Lazuli": ("लापिस लाजुली (लाजवर्द पाषाण)", "લાપિસ લાઝુલી (લાજવર્દ પથ્થર)"),
    "Tiger Stone": ("टाइगर स्टोन (बाघ-नेत्र स्फटिक)", "ટાઇગર સ્ટોન (વાઘ-આંખ સ્ફટિક)"),
    "Labradorite": ("लैब्राडोराइट (इंद्रधनुषी पाषाण)", "લેબ્રાડોરાઇટ (મેઘધનુષી પથ્થર)"),
    "White Rainbow": ("सफेद इंद्रधनुषी पेबल (ओपल सिलिका)", "સફેદ મેઘધનુષી કાંકરા (ઓપલ સિલિકા)"),
    "Black Tourmaline": ("ब्लैक टूमलाइन (काला संरक्षक पाषाण)", "બ્લેક ટૂરમાલાઇન (કાળો સંરક્ષક પથ્થર)"),
    "Green Aventurine": ("ग्रीन एवेंच्यूरिन (हरिताश्म स्फटिक)", "ગ્રીન એવેન્ચ્યુરિન (લીલો સ્ફટિક)"),
    "White Glaze Onyx": ("व्हाइट ग्लेज़ ओनिक्स (धवल गोमेद)", "વ્હાઇટ ગ્લેઝ ઓનિક્સ (ધવલ ગોમેદ)"),
    "Blue Onyx": ("ब्लू ओनिक्स (नील गोमेद कंकड़)", "બ્લુ ઓનિક્સ (નીલ ગોમેદ કાંકરા)"),
    "Orange Onyx": ("ऑरेंज ओनिक्स (केसरिया गोमेद)", "ઓરેન્જ ઓનિક્સ (કેસરી ગોમેદ)"),
    "Pink Onyx": ("पिंक ओनिक्स (गुलाबी गोमेद)", "પિંક ઓનિક્સ (ગુલાબી ગોમેદ)"),
    "Cherry Onyx": ("चेरी ओनिक्स (गहन रक्ताभ गोमेद)", "ચેરી ઓનિક્સ (ઘેરો રક્ત ગોમેદ)"),
    "Purple Onyx": ("पर्पल ओनिक्स (बैंगनी गोमेद)", "પર્પલ ઓનિક્સ (જાંબલી ગોમેદ)"),
    "Yellow Onyx": ("येलो ओनिक्स (पीत गोमेद)", "યલો ઓનિક્સ (પીળો ગોમેદ)"),
    "Soft Lime Onyx": ("सॉफ्ट लाइम ओनिक्स (हल्का हरा गोमेद)", "સોફ્ટ લાઇમ ઓનિક્સ (આછો લીલો ગોમેદ)"),
    "Black Storm Onyx": ("ब्लैक स्टॉर्म ओनिक्स (धूमिल काला गोमेद)", "બ્લેક સ્ટોર્મ ઓનિક્સ (તોફાની કાળો ગોમેદ)"),
    "Indian Amethyst": ("इंडियन एमेथिस्ट (भारतीय जामुनिया)", "ઇન્ડિયન એમેથિસ્ટ (ભારતીય જાંબુડિયો)"),
    "Banded Onyx": ("बैंडेड ओनिक्स (प्राकृतिक धारीदार गोमेद)", "બેન્ડેડ ઓનિક્સ (કુદરતી પટ્ટાવાળો ગોમેદ)"),
    "Las Vegas Onyx": ("लास वेगास ओनिक्स (सुनहरा भूरा गोमेद)", "લાસ વેગાસ ઓનિક્સ (સોનેરી ભૂરો ગોમેદ)"),
    "Soothing Sydney Onyx": ("सिडनी ओनिक्स (शांत सिलिका गोमेद)", "સિડની ઓનિક્સ (શાંત સિલિકા ગોમેદ)"),
    "Tree Agate": ("ट्री अकीक (वृक्षाकार डेंड्रिटिक अगेट)", "ટ્રી અગેટ (વૃક્ષાકાર અકીક)"),
    "Jasper Agate": ("जैस्पर अकीक (चित्रमय पाषाण)", "જાસ્પર અગેટ (ચિત્રમય પથ્થર)"),
    "Carrot Bout": ("कैरट बाउट (गाजरी चालसेडोनी अकीक)", "ગાજરી અગેટ (કેલ્સેડોની)"),
    "Seaweed Green": ("सीवीड ग्रीन (समुद्री सर्पेन्टाइन कंकड़)", "સીવીડ ગ્રીન (સમુદ્રી સર્પેન્ટાઇન કાંકરા)"),
    "Elegant Black": ("एलिगेंट ब्लैक (उच्च-शुद्धता बेसाल्ट कंकड़)", "એલિગન્ટ બ્લેક (ઉચ્ચ-શુદ્ધતા બેસાલ્ટ કાંકરા)"),
    "California UG": ("कैलिफोर्निया यूजी (प्रशांत तटीय कंकड़)", "કેલિફોર્નિયા યુજી (પ્રશાંત તટીય કાંકરા)"),
    "Downtown Grey": ("डाउनटाउन ग्रे (रूपांतरित स्लेटी क्वार्ट्ज़ाइट)", "ડાઉનટાઉન ગ્રે (રૂપાંતરિત રાખોડી ક્વાર્ટ્ઝાઇટ)"),
    "Arabian Dunes": ("अरबियन ड्यून्स (रेगिस्तानी बलुआ कंकड़)", "અરેબિયન ડ્યૂન્સ (રેતીયા પથ્થરના કાંકરા)"),
    "Caribbean Fantasy": ("कैरेबियन फैंटेसी (बहुरंगी तटीय कंकड़)", "કેરેબિયન ફેન્ટસી (બહુરંગી કાંકરા)"),
    "Oceanic Green": ("ओशनिक ग्रीन (समुद्री हरित पाषाण)", "ઓશનિક ગ્રીન (સમુદ્રી લીલો પથ્થર)"),
    "White Dew": ("व्हाइट ड्यू (हिम-कण श्वेत कैल्साइट)", "વ્હાઇટ ડ્યૂ (બરફ જેવો સફેદ કેલ્સાઇટ)"),
    "Sage Green": ("सेज ग्रीन (ऋषि-हरित मैग्नीशियम सिलिकेट)", "સેજ ગ્રીન (લીલો પથ્થર)"),
    "Bloodstone": ("ब्लडस्टोन (रक्तमणि जैस्पर-कैलसीडोनी)", "બ્લડસ્ટોન (રક્તમણિ જાસ્પર)"),
    "Dyed Stone Pebbles": ("रंगीन वास्तुशिल्पीय कंकड़ (क्वार्ट्ज़ बेस)", "રંગીન વાસ્તુશિલ્પીય કાંકરા (ક્વાર્ટ્ઝ બેઝ)"),
    "Golden Brown": ("गोल्डन ब्राउन (सुनहरा भूरा नदी क्वार्ट्ज़ाइट)", "ગોલ્ડન બ્રાઉન (સોનેરી ભૂખરો ક્વાર્ટ્ઝાઇટ)"),
    "Golden Beige": ("गोल्डन बेज (क्रीम कैल्साइट कंकड़)", "ગોલ્ડન બેજ (ક્રીમ કેલ્સાઇટ કાંકરા)"),
    "Elegant Black Jumbo": ("एलिगेंट ब्लैक जंबो (विशाल बेसाल्ट बोल्डर)", "એલિગન્ટ બ્લેક જમ્બો (મોટો બેસાલ્ટ બોલ્ડર)"),
    "White Dew Jumbo": ("व्हाइट ड्यू जंबो (विशाल क्रिस्टलीय कैल्साइट)", "વ્હાઇટ ડ્યૂ જમ્બો (મોટો ક્રિસ્ટલાઇન કેલ્સાઇટ)"),
    "Soft Grey Jumbo": ("सॉफ्ट ग्रे जंबो (डोलोमाइट नदी बोल्डर)", "સોફ્ટ ગ્રે જમ્બો (રાખોડી નદી બોલ્ડર)"),
    "Downtown Grey Flat": ("डाउनटाउन ग्रे फ्लैट (चपटा स्टेपिंग स्लेट)", "ડાઉનટાઉન ગ્રે ફ્લેટ (સપાટ સ્ટેપિંગ સ્લેટ)"),
    "Elegant Black Flat": ("एलिगेंट ब्लैक फ्लैट (चपटा काला बेसाल्ट स्टेपिंग पाषाण)", "એલિગન્ટ બ્લેક ફ્લેટ (સપાટ કાળો બેસાલ્ટ)"),
    "Chocolate Brown Flat": ("चॉकलेट ब्राउन फ्लैट (चपटा भूरा सिल्टस्टोन)", "ચોકલેટ બ્રાઉન ફ્લેટ (સપાટ ભૂખરો પથ્થર)"),
    "Semi Polished Agates": ("सेमी-पॉलिश्ड प्राकृतिक अकीक (अगेट)", "સેમી-પોલિશ્ડ કુદરતી અગેટ"),
    "Enhydro Polished": ("एनहाइड्रो पॉलिश्ड (जल-गर्भित क्वार्ट्ज़)", "એનહાઇડ્રો પોલિશ્ડ (જળ-ગર્ભિત ક્વાર્ટ્ઝ)"),
    "Matte White Jumbo": ("मैट व्हाइट जंबो (प्राकृतिक सफेद संगमरमर)", "મેટ વ્હાઇટ જમ્બો (કુદરતી સફેદ આરસપહાણ)"),
    "Raw River Black": ("रॉ रिवर ब्लैक (प्राकृतिक अप्रकाशित नदी बेसाल्ट)", "રો રિવર બ્લેક (કુદરતી નદી બેસાલ્ટ)"),
    "Matte Yellow Jumbo": ("मैट येलो जंबो (जैसलमेर पीला बलुआ बोल्डर)", "મેટ યલો જમ્બો (જેસલમેર પીળો પથ્થર)"),
    "Matte Royal Black": ("मैट रॉयल ब्लैक (सघन एम्फीबोलाइट पाषाण)", "મેટ રોયલ બ્લેક (ઘન પથ્થર)"),
    "Matte Red Jumbo": ("मैट रेड जंबो (धौलपुर लाल बलुआ बोल्डर)", "મેટ રેડ જમ્બો (ધોલપુર લાલ રેતીયો પથ્થર)"),
    "Coffee Bands Raw": ("कॉफी बैंड्स (प्राकृतिक धारीदार बलुआ पत्थर)", "કોફી બેન્ડ્સ (કુદરતી પટ્ટાવાળો પથ્થર)"),
    "D'Legno": ("डी'लेग्नो (जीवाश्म काष्ठ पाषाण कंकड़)", "ડી'લેગ્નો (અશ્મિભૂત લાકડાનો પથ્થર)"),
    "Arcobaleno": ("अर्कोबालेनो (बहुरंगी धारीदार संगमरमर)", "અર્કોબાલેનો (બહુરંગી પટ્ટાવાળો આરસપહાણ)"),
    "Vena Verde": ("वेना वर्डे (हरी सर्पेन्टाइन नसों वाला कैल्साइट)", "વેના વર્ડે (લીલી નસોવાળો કેલ્સાઇટ)"),
    "Vena Marrone": ("वेना मैरोन (भूरी नसों वाला चूना पत्थर)", "વેના મેરોન (ભૂરી નસોવાળો ચૂના પથ્થર)"),
    "JSL Giallo": ("जैसलमेर गियालो (जीवाश्म पीला संगमरमर)", "જેસલમેર ગિયાલો (પીળો આરસપહાણ)"),
    "Renero Granito": ("रेनेरो ग्रेनाइटो (दानेदार काला ग्रेनाइट कंकड़)", "રેનેરો ગ્રેનાઇટો (કાળા ગ્રેનાઇટ કાંકરા)"),
    "Snowy Bianca Granito": ("स्नोई बियानका (श्वेत ल्यूकोक्रैटिक ग्रेनाइट)", "સ્નોઇ બિયાન્કા (સફેદ ગ્રેનાઇટ)"),
    "Raw River Candies": ("रॉ रिवर कैंडीज (बहुरंगी नदी कंकड़)", "રો રિવર કેન્ડીઝ (બહુરંગી નદી કાંકરા)"),
    "Stone Spheres": ("स्टोन स्फीयर्स (तराशे गए अकीक गोलाकार)", "સ્ટોન સ્ફીયર્સ (કંડારેલા અગેટ ગોળાકાર)"),
    "Hand Painted Pebbles": ("हस्त-चित्रित कलात्मक नदी कंकड़", "હસ્ત-ચિત્રિત કલાત્મક નદી કાંકરા"),
    "Navratna Mini": ("नवरत्न मिनी (नौ पवित्र ज्योतिषीय पाषाण रत्न)", "નવરત્ન મિની (નવ પવિત્ર જ્યોતિષીય રત્ન)"),
    "White Dew Mini": ("व्हाइट ड्यू मिनी (सूक्ष्म हिम कैल्साइट कंकड़)", "વ્હાઇટ ડ્યૂ મિની (સૂક્ષ્મ સફેદ કેલ્સાઇટ)"),
    "Arabian Dunes Mini": ("अरबियन ड्यून्स मिनी (सूक्ष्म रेगिस्तानी बजरी)", "અરેબિયન ડ્યૂન્સ મિની (સૂક્ષ્મ કાંકરા)"),
    "Dyed Colorful Mini": ("रंगीन मिनी कंकड़ (सजावटी रंगीन क्वार्ट्ज़ दाने)", "રંગીન મિની કાંકરા (સુશોભન રંગીન દાણા)"),
    "Quartz Jujubes": ("क्वार्ट्ज़ जुजुब्स (पारभासी अकीक बूंदें)", "ક્વાર્ટ્ઝ જુજુબ્સ (પારભાસી અગેટ ટીપાં)"),
    "Dyed Blue Sand": ("नीली वास्तुशिल्पीय सिलिका रेत", "વાદળી વાસ્તુશિલ્પીય સિલિકા રેતી"),
    "White Nano Chips": ("व्हाइट नैनो चिप्स (अति-सूक्ष्म कैल्साइट दाने)", "વ્હાઇટ નેનો ચિપ્સ (અતિ-સૂક્ષ્મ કેલ્સાઇટ દાણા)"),
    "Stone Chips White": ("मकराना सफेद संगमरमर चिप्स", "મકરાણા સફેદ આરસપહાણ ચિપ્સ"),
    "Stone Chips Yellow": ("जैसलमेर पीला चूना पत्थर चिप्स", "જેસલમેર પીળા પથ્થર ચિપ્સ"),
    "Stone Chips Red": ("धौलपुर लाल बलुआ पत्थर चिप्स", "ધોલપુર લાલ રેતીયા પથ્થર ચિપ્સ"),
    "Stone Chips Grey": ("कोटा स्लेटी चूना पत्थर चिप्स", "કોટા રાખોડી પથ્થર ચિપ્સ"),
    "Stone Chips Mixed": ("मिश्रित बहुरंगी पाषाण चिप्स", "મિશ્ર બહુરંગી પથ્થર ચિપ્સ")
}

cat_map = {
    "Semi-Precious Agates": ("अर्ध-कीमती अकीक एवं स्फटिक", "અર્ધ-કિંમતી અગેટ અને સ્ફટિક"),
    "Onyx Pebbles": ("गोमेद (ओनिक्स) पाषाण कंकड़", "ગોમેદ (ઓનિક્સ) પથ્થરના કાંકરા"),
    "Landscape & River": ("लैंडस्केप एवं प्राकृतिक नदी कंकड़", "લેન્ડસ્કેપ અને કુદરતી નદીના કાંકરા"),
    "Decorative & Specialty": ("सजावटी एवं विशिष्ट पाषाण कंकड़", "સુશોભન અને વિશિષ્ટ પથ્થરના કાંકરા"),
    "Jumbo & Flat Pebbles": ("जंबो एवं चपटे स्टेपिंग कंकड़", "જમ્બો અને સપાટ સ્ટેપિંગ કાંકરા"),
    "Mini Pebbles & Chips": ("मिनी कंकड़ एवं पाषाण चिप्स", "મિની કાંકરા અને પથ્થરની ચિપ્સ"),
}

with open(out_path, "w", encoding="utf-8") as f:
    f.write('''# -*- coding: utf-8 -*-
"""
scripts/full_catalogue_data.py
Complete multilingual dataset for all Stone Tech OS architectural catalogues.
"""

PEBBLE_ITEMS_I18N = {
''')

    for p in sp.PEBBLES:
        code = p["code"]
        name = p["name"]
        cat = p["category"]
        fin = p["finish"]
        minr = p["mineral"]
        col = p["color"]
        use = p["use"]
        desc = p["desc"]

        n_hi, n_gu = pebble_names_map.get(name, (f"{name} (पाषाण कंकड़)", f"{name} (કાંકરા)"))
        c_hi, c_gu = cat_map.get(cat, ("वास्तुशिल्पीय पाषाण कंकड़", "વાસ્તુશિલ્પીય પથ્થર કાંકરા"))

        # Pure finish translations
        fin_hi = (
            fin.replace("Tumbled Polished High-Luster", "टंबल्ड पॉलिश्ड उच्च-चमक")
            .replace("Tumbled Polished Translucent", "टंबल्ड पॉलिश्ड पारभासी")
            .replace("Tumbled Polished Royal Purple", "टंबल्ड पॉलिश्ड रॉयल पर्पल")
            .replace("Tumbled Polished Rich Sienna", "टंबल्ड पॉलिश्ड सिएना")
            .replace("Polished Celestial Ultramarine", "पॉलिश्ड स्वर्गीय अल्ट्रामरीन")
            .replace("Silky Chatoyant Golden Lustre", "रेशमी चमकीला सुनहरा पॉलिश")
            .replace("Iridescent Labradorescence Polish", "इंद्रधनुषी लैब्राडोरेसेंस पॉलिश")
            .replace("Opalescent Polished White", "ओपलेसेंट पॉलिश्ड श्वेत")
            .replace("Tumbled Velvet Midnight Matte", "टंबल्ड मखमली मिडनाइट मैट")
            .replace("Tumbled Polished Jade Sheen", "टंबल्ड पॉलिश्ड जेड शीन")
            .replace("Glazed Vitrified Polished White", "ग्लेज़्ड विट्रिफाइड पॉलिश्ड श्वेत")
            .replace("Translucent Azure Polished", "पारभासी अज़ूर पॉलिश")
            .replace("Flame Orange Smooth Tumbled", "फ्लेम ऑरेंज स्मूथ टंबल्ड")
            .replace("Blush Rose Translucent Polish", "ब्लश रोज़ पारभासी पॉलिश")
            .replace("Deep Cherry Veined Polished", "डीप चेरी वेन्ड पॉलिश्ड")
            .replace("Violet Hued Translucent Polish", "वायलेट पारभासी पॉलिश")
            .replace("Golden Honey Warm Polish", "गोल्डन हनी वार्म पॉलिश")
            .replace("Pistachio Celadon Polished", "पिस्ता सेलाडॉन पॉलिश")
            .replace("Veined Charcoal Dramatic Polish", "वेन्ड चारकोल ड्रामैटिक पॉलिश")
            .replace("Natural Crystalline Lavender", "प्राकृतिक क्रिस्टलीय लैवेंडर")
            .replace("Satin Lustre Natural Banded", "सैटिन चमक प्राकृतिक धारीदार")
            .replace("Warm Desert Ochre Polished", "गर्म मरुस्थलीय गेरुआ पॉलिश")
            .replace("Silk Opal Translucent Polish", "सिल्क ओपल पारभासी पॉलिश")
            .replace("Dendritic Forest Green Polish", "डेंड्रिटिक वन-हरित पॉलिश")
            .replace("Brecciated Earthy Polished", "ब्रेक्शियेटेड प्राकृतिक भूरा पॉलिश")
            .replace("Vibrant Citrine Warm Polish", "जीवंत सिट्रीन वार्म पॉलिश")
            .replace("Deep Marine Botanical Polish", "गहन समुद्री वनस्पति पॉलिश")
            .replace("Piano Gloss Mirror Jet Black", "दर्पण जैसी जेट ब्लैक उच्च चमक")
            .replace("Pacific Coastal Tumbled Polish", "प्रशांत तटीय टंबल्ड पॉलिश")
            .replace("Urban Slate Polished Grey", "शहरी स्लेट पॉलिश्ड ग्रे")
            .replace("Natural Tumbled Desert Ochre Matte", "प्राकृतिक टंबल्ड रेगिस्तानी गेरुआ मैट")
            .replace("Tropical Multi-Hue Tumbled", "उष्णकटिबंधीय बहुरंगी टंबल्ड")
            .replace("Aquamarine Tide Polished", "एक्वामरीन ज्वारभाटा पॉलिश")
            .replace("Pristine Snow Polished White", "धवल हिम-श्वेत पॉलिश्ड")
            .replace("Soft Olive Herbaceous Polish", "कोमल जैतून हरा पॉलिश")
            .replace("Heliotrope Jasper Polished", "हेलियोट्रोप जैस्पर पॉलिश")
            .replace("Chromatic Prism Coated", "प्रिज्म रंगीन लेपित")
            .replace("Caramel Amber Striated Polish", "कारमेल अम्बर धारीदार पॉलिश")
            .replace("Champagne Warm Cream Polish", "शैम्पेन वार्म क्रीम पॉलिश")
            .replace("Monumental Gloss Polished Black", "भव्य ग्लॉस पॉलिश्ड काला")
            .replace("Monumental Polished Pure White", "भव्य पॉलिश्ड शुद्ध सफेद")
            .replace("High-Density Polished Jet Black", "उच्च-घनत्व पॉलिश्ड जेट ब्लैक")
            .replace("Flat Stepping Disc Jet Black Polish", "सपाट स्टेपिंग डिस्क जेट ब्लैक पॉलिश")
            .replace("Flat Stepping Disc Espresso Polish", "सपाट स्टेपिंग डिस्क एस्प्रेसो पॉलिश")
            .replace("Flat Stepping Disc River Polish", "सपाट स्टेपिंग डिस्क नदी तल पॉलिश")
            .replace("Multi-Strata Agate Banding", "बहु-परतीय अकीक धारीदार")
            .replace("Water-Bearing Quartz Polished", "जल-युक्त स्फटिक पॉलिश")
            .replace("Raw Tumbled Natural Matte Chalk", "प्राकृतिक मैट चाक टंबल्ड")
            .replace("Authentic Basalt Riverbed Matte", "प्रामाणिक बेसाल्ट नदी तल मैट")
            .replace("Natural Terracotta Oxide Matte", "प्राकृतिक टेराकोटा ऑक्साइड मैट")
            .replace("Dense Metamorphic Amphibolite", "सघन रूपांतरित एम्फीबोलाइट")
            .replace("Ferruginous Red Sandstone Boulder", "लौह-युक्त लाल बलुआ पत्थर बोल्डर")
            .replace("Sedimentary Banded Sandstone", "अवसादी धारीदार बलुआ पत्थर")
            .replace("Petrified Wood Grain Polished", "जीवाश्म काष्ठ रेशेदार पॉलिश")
            .replace("Rainbow Multi-Faceted Polished", "इंद्रधनुषी बहु-फलकीय पॉलिश")
            .replace("Green Serpentine Veined Polish", "हरी सर्पेन्टाइन नसों वाला पॉलिश")
            .replace("Brown Veined Calcite Polish", "भूरी नसों वाला कैल्साइट पॉलिश")
            .replace("Italian Giallo Sienna Polish", "इटैलियन गियालो सिएना पॉलिश")
            .replace("Black Granite Salt & Pepper Polish", "काला ग्रेनाइट सॉल्ट एवं पेपर पॉलिश")
            .replace("White Granite Crystalline Polish", "श्वेत ग्रेनाइट क्रिस्टलीय पॉलिश")
            .replace("Assorted Pastel Water-Worn Pebbles", "मिश्रित पेस्टल नदी कंकड़")
            .replace("Precision Lathe-Turned Spheres", "सटीक खराद तराशे गोलाकार")
            .replace("Artisanal Enamel Painted Motif", "हस्तशिल्प एनामेल चित्रित रूपांकन")
            .replace("Nine-Gem Astrological Blend Polished", "नौ-रत्न ज्योतिषीय मिश्रण पॉलिश्ड")
            .replace("Micro-Fine Calcite Crystalline Chips", "सूक्ष्म कैल्साइट क्रिस्टलीय चिप्स")
            .replace("Golden Desert Micro Pebbles", "सुनहरे रेगिस्तानी सूक्ष्म कंकड़")
            .replace("Vivid Spectrum Coated Micro Gravel", "रंगीन स्पेक्ट्रम लेपित सूक्ष्म बजरी")
            .replace("Tumbled Jelly Quartz Drops", "टंबल्ड जेली स्फटिक बूंदें")
            .replace("Cobalt Blue Architectural Quartz Sand", "कोबाल्ट नीला वास्तुशिल्पीय क्वार्ट्ज़ रेत")
            .replace("Fine White Polished Micro Gravel", "महीन सफेद पॉलिश्ड सूक्ष्म बजरी")
            .replace("Angular Crushed White Marble Chips", "कोणीय क्रश्ड सफेद संगमरमर चिप्स")
            .replace("Angular Crushed Jaisalmer Yellow Chips", "कोणीय क्रश्ड जैसलमेर पीला चूना पत्थर चिप्स")
            .replace("Angular Crushed Dholpur Red Chips", "कोणीय क्रश्ड धौलपुर लाल बलुआ पत्थर चिप्स")
            .replace("Angular Crushed Kota Grey Chips", "कोणीय क्रश्ड कोटा स्लेटी पत्थर चिप्स")
            .replace("Poly-Mineral Aggregate Decorative Chips", "बहुरंगी खनिज सजावटी पाषाण चिप्स")
            .replace("Natural Striated Riverbed Pebble", "प्राकृतिक धारीदार नदी तल कंकड़")
            .replace("Warm Amber River Polished", "वार्म अम्बर नदी पॉलिश्ड")
            .replace("Architectural Smooth Slate Grey", "वास्तुशिल्पीय चिकना स्लेटी पाषाण")
        )

        min_hi = (
            minr.replace("Natural Crystalline Rose Quartz", "प्राकृतिक क्रिस्टलीय रोज़ क्वार्ट्ज़")
            .replace("Pure Hydrothermal Crystal Quartz", "शुद्ध हाइड्रोथर्मल क्रिस्टल क्वार्ट्ज़")
            .replace("Natural Violet Crystalline Amethyst", "प्राकृतिक जामुनी क्रिस्टलीय एमेथिस्ट")
            .replace("Cryptocrystalline Carnelian Chalcedony", "क्रिप्टोक्रिस्टलाइन कार्नेलियन कैलसीडोनी")
            .replace("Natural Metamorphic Lapis Lazuli", "प्राकृतिक रूपांतरित लाजवर्द पाषाण")
            .replace("Crocidolite Quartz (Tiger Eye)", "क्रोकिडोलाइट क्वार्ट्ज़ (टाइगर आई)")
            .replace("Feldspathic Plagioclase Labradorite", "फेल्डस्पैथिक प्लैगियोक्लेज़ लैब्राडोराइट")
            .replace("Natural Opalescent Silica Pebble", "प्राकृतिक ओपलेसेंट सिलिका कंकड़")
            .replace("Natural Schorl Black Tourmaline", "प्राकृतिक स्कोर्ल ब्लैक टूमलाइन")
            .replace("Fuchsite-Bearing Quartzite", "फ्यूचसाइट युक्त क्वार्ट्ज़ाइट")
            .replace("Microcrystalline Calcite Onyx", "सूक्ष्म-क्रिस्टलीय कैल्साइट ओनिक्स")
            .replace("Natural Banded Blue Calcite Onyx", "प्राकृतिक धारीदार नीला कैल्साइट ओनिक्स")
            .replace("Aragonite Calcite Onyx", "एरागोनाइट कैल्साइट ओनिक्स")
            .replace("Sedimentary Translucent Rose Onyx", "अवसादी पारभासी रोज़ ओनिक्स")
            .replace("Banded Iron-Bearing Calcite Onyx", "लौह-युक्त धारीदार कैल्साइट ओनिक्स")
            .replace("Manganese Calcite Onyx", "मैंगनीज युक्त कैल्साइट ओनिक्स")
            .replace("Hydrated Iron Oxide Onyx", "हाइड्रेटेड आयरन ऑक्साइड ओनिक्स")
            .replace("Silicate Lime Calcite Onyx", "सिलिकेट युक्त लाइम कैल्साइट ओनिक्स")
            .replace("Bituminous Banded Calcite Onyx", "बिटुमिनस धारीदार कैल्साइट ओनिक्स")
            .replace("Deccan Trap Geode Amethyst", "दक्कन ट्रैप जियोड एमेथिस्ट")
            .replace("Agate-Stratified Calcite Onyx", "अकीक-परतीय कैल्साइट ओनिक्स")
            .replace("Golden-Brown Stratified Onyx", "सुनहरा-भूरा परतीय ओनिक्स")
            .replace("Silica-Infused Calcite Onyx", "सिलिका युक्त कैल्साइट ओनिक्स")
            .replace("Dendritic White Quartz Agate", "डेंड्रिटिक सफेद क्वार्ट्ज़ अकीक")
            .replace("Brecciated Polychrome Jasper", "ब्रेक्शियेटेड बहुरंगी जैस्पर")
            .replace("High-Saturation Orange Chalcedony", "गाजरी नारंगी कैलसीडोनी")
            .replace("Marine Serpentine River Stone", "समुद्री सर्पेन्टाइन नदी पाषाण")
            .replace("High-Purity Natural Basalt", "उच्च-शुद्धता प्राकृतिक बेसाल्ट")
            .replace("Pacific Coastal River Aggregate", "प्रशांत तटीय नदी एग्रीगेट")
            .replace("Metamorphic Grey Quartzite", "रूपांतरित स्लेटी क्वार्ट्ज़ाइट")
            .replace("Sedimentary Desert Quartzite", "अवसादी रेगिस्तानी क्वार्ट्ज़ाइट")
            .replace("Poly-Mineral Coastal Aggregate", "बहुरंगी तटीय एग्रीगेट")
            .replace("Glaucophane Greenschist Pebble", "ग्लौकोफेन हरित कंकड़")
            .replace("High-Purity Snow White Calcite", "अति-शुद्ध हिम-श्वेत कैल्साइट")
            .replace("Hydrated Magnesium Silicate", "हाइड्रेटेड मैग्नीशियम सिलिकेट")
            .replace("Heliotrope Jasper-Chalcedony", "हेलियोट्रोप जैस्पर-कैलसीडोनी")
            .replace("High-Absorption Quartz Base", "उच्च-अवशोषण क्वार्ट्ज़ बेस")
            .replace("Ferruginous River Quartzite", "लौह-युक्त नदी क्वार्ट्ज़ाइट")
            .replace("Fossiliferous Cream Calcite", "जीवाश्म युक्त क्रीम कैल्साइट")
            .replace("Massive Basalt Volcanic Stone", "विशाल ज्वालामुखी बेसाल्ट पाषाण")
            .replace("Massive Crystalline Calcite", "विशाल क्रिस्टलीय कैल्साइट")
            .replace("Dolomitic Grey River Boulder", "डोलोमाइट स्लेटी नदी बोल्डर")
            .replace("Foliated Slate-Quartzite Flat", "परतदार स्लेट-क्वार्ट्ज़ाइट स्टेपिंग पाषाण")
            .replace("Fine-Grained Basalt Stepping Stone", "महीन दानेदार बेसाल्ट स्टेपिंग पाषाण")
            .replace("Sedimentary Chocolate Siltstone", "अवसादी चॉकलेट सिल्टस्टोन")
            .replace("Natural Fortification Agate", "प्राकृतिक फोर्टिफिकेशन अकीक (अगेट)")
            .replace("Water-Enclosed Quartz Geode", "जल-गर्भित क्वार्ट्ज़ जियोड (एनहाइड्रो)")
            .replace("Natural Dolomitic White Marble", "प्राकृतिक डोलोमाइट सफेद संगमरमर")
            .replace("Unpolished Natural River Basalt", "अपोलिश्ड प्राकृतिक नदी बेसाल्ट")
            .replace("Jaisalmer Ochre Sandstone Boulder", "जैसलमेर गेरुआ बलुआ पत्थर बोल्डर")
            .replace("Dense Metamorphic Amphibolite", "सघन रूपांतरित एम्फीबोलाइट पाषाण")
            .replace("Ferruginous Red Sandstone Boulder", "लौह-युक्त लाल बलुआ पत्थर बोल्डर")
            .replace("Sedimentary Banded Sandstone", "अवसादी धारीदार बलुआ पत्थर")
            .replace("Silicified Petrified Wood Pebble", "सिलिका युक्त जीवाश्म काष्ठ पाषाण कंकड़")
            .replace("Polychromatic Striated Marble", "बहुरंगी धारीदार संगमरमर")
            .replace("Serpentine-Veined Calcite", "सर्पेन्टाइन हरी नसों वाला कैल्साइट")
            .replace("Brown Brecciated Limestone", "भूरा चूना पत्थर (ब्रेक्शिया)")
            .replace("Jaisalmer Marine Fossil Limestone", "जैसलमेर समुद्री जीवाश्म चूना पत्थर")
            .replace("Porphyritic Black Granite", "पोर्फिरिटिक काला ग्रेनाइट")
            .replace("Leucocratic White Granite", "ल्यूकोक्रैटिक श्वेत ग्रेनाइट")
            .replace("Multi-Mineral Tumbled Riverbed", "बहुरंगी टंबल्ड नदी कंकड़")
            .replace("Lathe-Turned Agate & Jasper", "खराद तराशे अकीक एवं जैस्पर")
            .replace("Smooth Tumbled River Basalt", "चिकना टंबल्ड नदी बेसाल्ट")
            .replace("Nine Sacred Astrological Minerals", "नौ पवित्र ज्योतिषीय पाषाण रत्न (नवरत्न)")
            .replace("High-Purity Calcite Micro-Pebble", "अति-शुद्ध कैल्साइट सूक्ष्म कंकड़")
            .replace("Desert Quartz Micro Gravel", "रेगिस्तानी क्वार्ट्ज़ सूक्ष्म बजरी")
            .replace("Color-Stable Quartz Micro Grain", "स्थिर रंगीन क्वार्ट्ज़ सूक्ष्म दाने")
            .replace("Tumbled Translucent Agate Jujubes", "टंबल्ड पारभासी अकीक बूंदें")
            .replace("High-Silica Architectural Sand", "उच्च-सिलिका वास्तुशिल्पीय रेत")
            .replace("Micro-Crystalline Calcite Chips", "सूक्ष्म-क्रिस्टलीय कैल्साइट चिप्स")
            .replace("Pure Calcite Crushed White Marble", "अति-शुद्ध कैल्साइट क्रश्ड सफेद संगमरमर")
            .replace("Crushed Jaisalmer Yellow Limestone", "क्रश्ड जैसलमेर पीला चूना पत्थर")
            .replace("Crushed Dholpur Red Sandstone", "क्रश्ड धौलपुर लाल बलुआ पत्थर")
            .replace("Crushed Kota Blue-Grey Limestone", "क्रश्ड कोटा स्लेटी-नीला चूना पत्थर")
            .replace("Poly-Mineral Aggregate Decorative Chips", "बहुरंगी खनिज सजावटी पाषाण चिप्स")
        )

        col_hi = (
            col.replace("Translucent Soft Blush Rose", "पारभासी कोमल गुलाबी")
            .replace("Ice-Clear Translucent White", "हिम-स्वच्छ पारदर्शी श्वेत")
            .replace("Deep Royal Violet to Lavender", "गहरा शाही जामुनी से लैवेंडर")
            .replace("Fiery Amber, Blood Orange & Sienna", "अग्नि-अम्बर, रक्त-नारंगी एवं सिएना")
            .replace("Deep Celestial Ultramarine", "गहरा स्वर्गीय अल्ट्रामरीन नीला")
            .replace("Silky Golden Bronze", "रेशमी सुनहरा कांस्य")
            .replace("Labradorescent Peacock Blue", "लैब्राडोरेसेंट मोरपंखी नीला")
            .replace("Opalescent Milk White", "ओपलेसेंट दूधिया सफेद")
            .replace("Solid Obsidian Jet Black", "ठोस ओब्सीडियन गहरा काला")
            .replace("Shimmering Celadon Mint Green", "चमकदार सेलाडॉन मिंट हरा")
        )

        def to_gujarati_script(text):
            out = []
            for ch in text:
                cp = ord(ch)
                if 0x0901 <= cp <= 0x0963 or 0x0966 <= cp <= 0x096F:
                    out.append(chr(cp + 0x0180))
                else:
                    out.append(ch)
            res = "".join(out)
            return res.replace("જ઼", "ઝ").replace("ફ઼", "ફ").replace("ડ઼", "ડ").replace("ઢ઼", "ઢ")

        fin_gu = to_gujarati_script(fin_hi)
        min_gu = to_gujarati_script(min_hi)
        col_gu = to_gujarati_script(col_hi)

        d_hi = f"प्राकृतिक उच्च-गुणवत्ता वाले {n_hi} जो विशिष्ट वास्तुशिल्पीय एवं लैंडस्केप परियोजनाओं हेतु उत्कृष्ट सौंदर्य और स्थायित्व प्रदान करते हैं।"
        d_gu = f"કુદરતી ઉચ્ચ-ગુણવત્તાવાળા {n_gu} જે વિશિષ્ટ વાસ્તુશિલ્પીય અને લેન્ડસ્કેપ પ્રોજેક્ટ્સ માટે ઉત્કૃષ્ટ સૌંદર્ય અને ટકાઉપણું આપે છે."

        f.write(f'''    "{code}": {{
        "name_hi": "{n_hi}",
        "name_gu": "{n_gu}",
        "cat_hi": "{c_hi}",
        "cat_gu": "{c_gu}",
        "finish_hi": "{fin_hi}",
        "finish_gu": "{fin_gu}",
        "mineral_hi": "{min_hi}",
        "mineral_gu": "{min_gu}",
        "color_hi": "{col_hi}",
        "color_gu": "{col_gu}",
        "use_hi": "वास्तुशिल्पीय सजावट, लैंडस्केप एवं लक्जरी इंटीरियर्स",
        "use_gu": "વાસ્તુશિલ્પીય સુશોભન, લેન્ડસ્કેપ અને લક્ઝરી ઇન્ટિરિયર્સ",
        "desc_hi": "{d_hi}",
        "desc_gu": "{d_gu}"
    }},
''')

    f.write('''}\n''')

print("Created scripts/full_catalogue_data.py successfully!")

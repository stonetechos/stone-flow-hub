/**
 * Indic Name Transliteration Engine (English -> Gujarati & Hindi).
 * Supports both dictionary-guided high-accuracy Indian name lookup,
 * compound suffixes (-bhai, -ben, -kumar, -sinh, etc.), and a phonetic syllabic fallback.
 */

import { useTranslation } from "react-i18next";

const GUJARATI_DICT: Record<string, string> = {
  valmiki: "વાલ્મીકિ",
  gautam: "ગૌતમ",
  himant: "હિમંત",
  himmat: "હિંમત",
  solanki: "સોલંકી",
  patel: "પટેલ",
  shah: "શાહ",
  sharma: "શર્મા",
  mehta: "મહેતા",
  trivedi: "ત્રિવેદી",
  joshi: "જોશી",
  bhatt: "ભટ્ટ",
  vyas: "વ્યાસ",
  desai: "દેસાઈ",
  pandya: "પંડ્યા",
  choudhary: "ચૌધરી",
  yadav: "યાદવ",
  singh: "સિંહ",
  sinh: "સિંહ",
  kumar: "કુમાર",
  lal: "લાલ",
  ramesh: "રમેશ",
  suresh: "સુરેશ",
  mahesh: "મહેશ",
  paresh: "પરેશ",
  bharat: "ભારત",
  vijay: "વિજય",
  ajay: "અજય",
  sanjay: "સંજય",
  chintan: "ચિંતન",
  jignesh: "જીગ્નેશ",
  hardik: "હાર્દિક",
  pratik: "પ્રતિક",
  bhavesh: "ભાવેશ",
  dhaval: "ધવલ",
  chirag: "ચિરાગ",
  kamlesh: "કમલેશ",
  manoj: "મનોજ",
  ashok: "અશોક",
  naresh: "નરેશ",
  mukesh: "મુકેશ",
  rajesh: "રાજેશ",
  hitesh: "હિતેશ",
  parth: "પાર્થ",
  jay: "જય",
  amit: "અમિત",
  rahul: "રાહુલ",
  pooja: "પૂજા",
  neha: "નેહા",
  priya: "પ્રિયા",
  hetal: "હેતલ",
  geeta: "ગીતા",
  seema: "સીમા",
  anita: "અનીતા",
  kiran: "કિરણ",
  alok: "આલોક",
  rohit: "રોહિત",
  mohit: "મોહિત",
  sunil: "સુનીલ",
  anil: "અનિલ",
  praveen: "પ્રવીણ",
  prashant: "પ્રશાંત",
  vinod: "વિનોદ",
  dinesh: "દિનેશ",
  manish: "મનીષ",
  vikram: "વિક્રમ",
  kunal: "કુણાલ",
  sachin: "સચિન",
  deepak: "દીપક",
  tarun: "તરુણ",
  varun: "વરુણ",
  nilesh: "નિલેશ",
  vipul: "વિપુલ",
  sandip: "સંદીપ",
  sandeep: "સંદીપ",
  pankaj: "પંકજ",
  chetna: "ચેતના",
  bhavna: "ભાવના",
  rekha: "રેખા",
  smita: "સ્મિતા",
  sonal: "સોનલ",
  rupali: "રૂપાલી",
  sheetal: "શીતલ",
  meena: "મીના",
  urvashi: "ઉર્વશી",
};

const GUJARATI_SUFFIXES: Record<string, string> = {
  bhai: "ભાઈ",
  ben: "બેન",
  kumar: "કુમાર",
  lal: "લાલ",
  singh: "સિંહ",
  sinh: "સિંહ",
  prasad: "પ્રસાદ",
  das: "દાસ",
  chand: "ચંદ",
  kant: "કાંત",
  vati: "વતી",
  devi: "દેવી",
  shankar: "શંકર",
};

const HINDI_DICT: Record<string, string> = {
  valmiki: "वाल्मीकि",
  gautam: "गौतम",
  himant: "हिम्मत",
  himmat: "हिम्मत",
  solanki: "सोलंकी",
  patel: "पटेल",
  shah: "शाह",
  sharma: "शर्मा",
  mehta: "मेहता",
  trivedi: "त्रिवेदी",
  joshi: "जोशी",
  bhatt: "भट्ट",
  vyas: "व्यास",
  desai: "देसाई",
  pandya: "पंड्या",
  choudhary: "चौधरी",
  yadav: "यादव",
  singh: "सिंह",
  sinh: "सिंह",
  kumar: "कुमार",
  lal: "लाल",
  ramesh: "रमेश",
  suresh: "सुरेश",
  mahesh: "महेश",
  paresh: "परेश",
  bharat: "भारत",
  vijay: "विजय",
  ajay: "अजय",
  sanjay: "संजय",
  chintan: "चिंतन",
  jignesh: "जिग्नेश",
  hardik: "हार्दिक",
  pratik: "प्रतीक",
  bhavesh: "भावेश",
  dhaval: "धवल",
  chirag: "चिराग",
  kamlesh: "कमलेश",
  manoj: "मनोज",
  ashok: "अशोक",
  naresh: "नरेश",
  mukesh: "मुकेश",
  rajesh: "राजेश",
  hitesh: "हितेश",
  parth: "पार्थ",
  jay: "जय",
  amit: "अमित",
  rahul: "राहुल",
  pooja: "पूजा",
  neha: "नेहा",
  priya: "प्रिया",
  hetal: "हेतल",
  geeta: "गीता",
  seema: "सीमा",
  anita: "अनीता",
  kiran: "किरण",
  alok: "आलोक",
  rohit: "रोहित",
  mohit: "मोहित",
  sunil: "सुनील",
  anil: "अनिल",
  praveen: "प्रवीण",
  prashant: "प्रशांत",
  vinod: "विनोद",
  dinesh: "दिनेश",
  manish: "मनीष",
  vikram: "विक्रम",
  kunal: "कुणाल",
  sachin: "सचिन",
  deepak: "दीपक",
  tarun: "तरुण",
  varun: "वरुण",
  nilesh: "निलेश",
  vipul: "विपुल",
  sandip: "संदीप",
  sandeep: "संदीप",
  pankaj: "पंकज",
  chetna: "चेतना",
  bhavna: "भावना",
  rekha: "रेखा",
  smita: "स्मिता",
  sonal: "सोनल",
  rupali: "रूपाली",
  sheetal: "शीतल",
  meena: "मीना",
  urvashi: "उर्वशी",
};

const HINDI_SUFFIXES: Record<string, string> = {
  bhai: "भाई",
  ben: "बेन",
  kumar: "कुमार",
  lal: "लाल",
  singh: "सिंह",
  sinh: "सिंह",
  prasad: "प्रसाद",
  das: "दास",
  chand: "चंद",
  kant: "कांत",
  vati: "वती",
  devi: "देवी",
  shankar: "शंकर",
};

function transliteratePhoneticGu(word: string): string {
  const cMap: Record<string, string> = {
    ksh: "ક્ષ",
    gny: "જ્ઞ",
    gy: "જ્ઞ",
    chh: "છ",
    kh: "ખ",
    gh: "ઘ",
    ch: "ચ",
    jh: "ઝ",
    th: "થ",
    dh: "ધ",
    ph: "ફ",
    bh: "ભ",
    sh: "શ",
    zh: "ઝ",
    k: "ક",
    g: "ગ",
    j: "જ",
    t: "ત",
    d: "દ",
    n: "ન",
    p: "પ",
    f: "ફ",
    b: "બ",
    m: "મ",
    y: "ય",
    r: "ર",
    l: "લ",
    v: "વ",
    w: "વ",
    s: "સ",
    h: "હ",
  };
  const vMatra: Record<string, string> = {
    aa: "ા",
    a: "",
    ee: "ી",
    i: "િ",
    oo: "ૂ",
    u: "ુ",
    ai: "ૈ",
    au: "ૌ",
    ou: "ૌ",
    e: "ે",
    o: "ો",
  };
  const vInit: Record<string, string> = {
    aa: "આ",
    a: "અ",
    ee: "ઈ",
    i: "ઇ",
    oo: "ઊ",
    u: "ઉ",
    ai: "ઐ",
    au: "ઔ",
    ou: "ઔ",
    e: "એ",
    o: "ઓ",
  };

  let res = "";
  let i = 0;
  while (i < word.length) {
    if (i === 0 || word[i - 1] === " " || word[i - 1] === "-") {
      let vMatch: string | null = null;
      for (const v of ["aa", "ee", "oo", "ai", "au", "ou", "a", "i", "u", "e", "o"]) {
        if (word.startsWith(v, i)) {
          vMatch = v;
          break;
        }
      }
      if (vMatch) {
        res += vInit[vMatch];
        i += vMatch.length;
        continue;
      }
    }

    let cMatch: string | null = null;
    for (const c of [
      "ksh",
      "gny",
      "gy",
      "chh",
      "kh",
      "gh",
      "ch",
      "jh",
      "th",
      "dh",
      "ph",
      "bh",
      "sh",
      "zh",
      "k",
      "g",
      "j",
      "t",
      "d",
      "n",
      "p",
      "f",
      "b",
      "m",
      "y",
      "r",
      "l",
      "v",
      "w",
      "s",
      "h",
    ]) {
      if (word.startsWith(c, i)) {
        cMatch = c;
        break;
      }
    }

    if (cMatch) {
      const cChar = cMap[cMatch];
      i += cMatch.length;
      let vMatch: string | null = null;
      for (const v of ["aa", "ee", "oo", "ai", "au", "ou", "a", "i", "u", "e", "o"]) {
        if (word.startsWith(v, i)) {
          vMatch = v;
          break;
        }
      }
      if (vMatch) {
        res += cChar + vMatra[vMatch];
        i += vMatch.length;
      } else {
        if (i < word.length && /[a-z]/i.test(word[i])) {
          res += cChar + "્";
        } else {
          res += cChar;
        }
      }
    } else {
      res += word[i];
      i++;
    }
  }
  return res;
}

function transliteratePhoneticHi(word: string): string {
  const cMap: Record<string, string> = {
    ksh: "क्ष",
    gny: "ज्ञ",
    gy: "ज्ञ",
    chh: "छ",
    kh: "ख",
    gh: "घ",
    ch: "च",
    jh: "झ",
    th: "थ",
    dh: "ध",
    ph: "फ",
    bh: "भ",
    sh: "श",
    zh: "झ",
    k: "क",
    g: "ग",
    j: "ज",
    t: "त",
    d: "द",
    n: "न",
    p: "प",
    f: "फ",
    b: "ब",
    m: "म",
    y: "य",
    r: "र",
    l: "ल",
    v: "व",
    w: "व",
    s: "स",
    h: "ह",
  };
  const vMatra: Record<string, string> = {
    aa: "ा",
    a: "",
    ee: "ी",
    i: "ि",
    oo: "ू",
    u: "ु",
    ai: "ै",
    au: "ौ",
    ou: "ौ",
    e: "े",
    o: "ो",
  };
  const vInit: Record<string, string> = {
    aa: "आ",
    a: "अ",
    ee: "ई",
    i: "इ",
    oo: "ऊ",
    u: "उ",
    ai: "ऐ",
    au: "औ",
    ou: "औ",
    e: "ए",
    o: "ओ",
  };

  let res = "";
  let i = 0;
  while (i < word.length) {
    if (i === 0 || word[i - 1] === " " || word[i - 1] === "-") {
      let vMatch: string | null = null;
      for (const v of ["aa", "ee", "oo", "ai", "au", "ou", "a", "i", "u", "e", "o"]) {
        if (word.startsWith(v, i)) {
          vMatch = v;
          break;
        }
      }
      if (vMatch) {
        res += vInit[vMatch];
        i += vMatch.length;
        continue;
      }
    }

    let cMatch: string | null = null;
    for (const c of [
      "ksh",
      "gny",
      "gy",
      "chh",
      "kh",
      "gh",
      "ch",
      "jh",
      "th",
      "dh",
      "ph",
      "bh",
      "sh",
      "zh",
      "k",
      "g",
      "j",
      "t",
      "d",
      "n",
      "p",
      "f",
      "b",
      "m",
      "y",
      "r",
      "l",
      "v",
      "w",
      "s",
      "h",
    ]) {
      if (word.startsWith(c, i)) {
        cMatch = c;
        break;
      }
    }

    if (cMatch) {
      const cChar = cMap[cMatch];
      i += cMatch.length;
      let vMatch: string | null = null;
      for (const v of ["aa", "ee", "oo", "ai", "au", "ou", "a", "i", "u", "e", "o"]) {
        if (word.startsWith(v, i)) {
          vMatch = v;
          break;
        }
      }
      if (vMatch) {
        res += cChar + vMatra[vMatch];
        i += vMatch.length;
      } else {
        if (i < word.length && /[a-z]/i.test(word[i])) {
          res += cChar + "्";
        } else {
          res += cChar;
        }
      }
    } else {
      res += word[i];
      i++;
    }
  }
  return res;
}

function transliterateTokenGu(token: string): string {
  const clean = token.trim();
  if (!clean) return token;
  const lower = clean.toLowerCase();

  if (GUJARATI_DICT[lower]) return GUJARATI_DICT[lower];

  for (const sfx of Object.keys(GUJARATI_SUFFIXES)) {
    if (lower.endsWith(sfx) && lower.length > sfx.length) {
      const root = lower.slice(0, -sfx.length);
      const rootTrans = GUJARATI_DICT[root] || transliteratePhoneticGu(root);
      return rootTrans + GUJARATI_SUFFIXES[sfx];
    }
  }

  return transliteratePhoneticGu(lower);
}

function transliterateTokenHi(token: string): string {
  const clean = token.trim();
  if (!clean) return token;
  const lower = clean.toLowerCase();

  if (HINDI_DICT[lower]) return HINDI_DICT[lower];

  for (const sfx of Object.keys(HINDI_SUFFIXES)) {
    if (lower.endsWith(sfx) && lower.length > sfx.length) {
      const root = lower.slice(0, -sfx.length);
      const rootTrans = HINDI_DICT[root] || transliteratePhoneticHi(root);
      return rootTrans + HINDI_SUFFIXES[sfx];
    }
  }

  return transliteratePhoneticHi(lower);
}

/**
 * Transliterates an English name into Gujarati or Hindi script.
 * If the string already contains native characters, or if the target language is English,
 * it returns the original string unmodified.
 */
export function transliterateName(text?: string | null, lang: string = "gu"): string {
  if (!text) return "";
  const str = String(text);

  if (lang.startsWith("en")) return str;

  // Already Gujarati?
  if (lang.startsWith("gu") && /[\u0A80-\u0AFF]/.test(str)) {
    return str;
  }
  // Already Devanagari?
  if (lang.startsWith("hi") && /[\u0900-\u097F]/.test(str)) {
    return str;
  }

  // Preserve token structure (spaces, dots, hyphens)
  const tokens = str.split(/(\s+|[-.])/);
  const isHi = lang.startsWith("hi");

  return tokens
    .map((part) => {
      if (!part || /^\s+$/.test(part) || /^[-.]$/.test(part)) {
        return part;
      }
      return isHi ? transliterateTokenHi(part) : transliterateTokenGu(part);
    })
    .join("");
}

/**
 * React hook to get a bound transliterate function for the active UI language.
 */
export function useTransliterate() {
  const { i18n } = useTranslation();
  return (text?: string | null) => transliterateName(text, i18n.language);
}

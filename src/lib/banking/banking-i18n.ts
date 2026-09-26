/**
 * Localization helper for Bank accounts, institutions, and transaction descriptors.
 * Supports English (en), Hindi (hi), and Gujarati (gu).
 */

export interface LocalizedBankAccountInfo {
  name: string;
  bank_name: string;
  account_number: string;
  account_type: string;
  status_label: string;
}

const BANK_NAMES_MAP: Record<string, { hi: string; gu: string }> = {
  "bank of baroda": { hi: "बैंक ऑफ बड़ौदा", gu: "બેંક ઓફ બરોડા" },
  bob: { hi: "बैंक ऑफ बड़ौदा", gu: "બેંક ઓફ બરોડા" },
  "gpay / npci upi": { hi: "गूगल पे / एनपीसीआई यूपीआई", gu: "ગુગલ પે / એનપીસીઆઈ યુપીઆઈ" },
  gpay: { hi: "गूगल पे", gu: "ગુગલ પે" },
  "google pay": { hi: "गूगल पे", gu: "ગુગલ પે" },
  "cash on hand": { hi: "हाथ में नकद", gu: "હાથ પર રોકડ" },
  "petty cash": { hi: "दैनिक नकद खर्च", gu: "દૈનિક રોકડ ખર્ચ" },
  "state bank of india": { hi: "भारतीय स्टेट बैंक", gu: "સ્ટેટ બેંક ઓફ ઇન્ડિયા" },
  sbi: { hi: "भारतीय स्टेट बैंक", gu: "સ્ટેટ બેંક ઓફ ઇન્ડિયા" },
  "hdfc bank": { hi: "एचडीएफसी बैंक", gu: "એચડીએફસી બેંક" },
  hdfc: { hi: "एचडीएफसी बैंक", gu: "એચડીએફસી બેંક" },
  "icici bank": { hi: "आईसीआईसीआई बैंक", gu: "આઈસીઆઈસીઆઈ બેંક" },
  icici: { hi: "आईसीआईसीआई बैंक", gu: "આઈસીઆઈસીઆઈ બેંક" },
  "axis bank": { hi: "एक्सिस बैंक", gu: "એક્સિસ બેંક" },
  "kotak mahindra bank": { hi: "कोटक महिंद्रा बैंक", gu: "કોટક મહિન્દ્રા બેંક" },
  "punjab national bank": { hi: "पंजाब नेशनल बैंक", gu: "પંજાબ નેશનલ બેંક" },
  pnb: { hi: "पंजाब नेशनल बैंक", gu: "પંજાબ નેશનલ બેંક" },
};

const ACCOUNT_NAMES_MAP: Record<string, { hi: string; gu: string }> = {
  "bank of baroda current a/c": { hi: "बैंक ऑफ बड़ौदा चालू खाता", gu: "બેંક ઓફ બરોડા ચાલુ ખાતું" },
  "google pay upi (+91 7742090866)": {
    hi: "गूगल पे यूपीआई (+91 7742090866)",
    gu: "ગુગલ પે યુપીઆઈ (+91 7742090866)",
  },
  "petty cash & site float": { hi: "दैनिक खर्च व साइट नकद", gu: "દૈનિક ખર્ચ અને સાઇટ રોકડ" },
  "hdfc bank current a/c": { hi: "एचडीएफसी बैंक चालू खाता", gu: "એચડીએફસી બેંક ચાલુ ખાતું" },
  "sbi current a/c": { hi: "एसबीआई चालू खाता", gu: "એસબીઆઈ ચાલુ ખાતું" },
  "icici bank current a/c": { hi: "आईसीआईसीआई बैंक चालू खाता", gu: "આઈસીઆઈસીઆઈ બેંક ચાલુ ખાતું" },
};

const ACCOUNT_NUM_MAP: Record<string, { hi: string; gu: string }> = {
  "bob current a/c (mob: +91 7742090866)": {
    hi: "बैंक ऑफ बड़ौदा • बीओबी चालू खाता (मो: +91 7742090866)",
    gu: "બેંક ઓફ બરોડા • બીઓબી ચાલુ ખાતું (મો: +91 7742090866)",
  },
  "linked: +91 7742090866": {
    hi: "लिंक मोबाइल: +91 7742090866",
    gu: "લિંક મોબાઈલ: +91 7742090866",
  },
  "cash drawer": {
    hi: "गल्ला / नकद दराज",
    gu: "રોકડ ડ્રોઅર",
  },
};

const ACCOUNT_TYPE_MAP: Record<string, { hi: string; gu: string }> = {
  current: { hi: "चालू खाता", gu: "ચાલુ ખાતું" },
  savings: { hi: "बचत खाता", gu: "બચત ખાતું" },
  cash: { hi: "नकद", gu: "રોકડ" },
  clearing: { hi: "क्लीयरिंग", gu: "ક્લીયરિંગ" },
  upi: { hi: "यूपीआई", gu: "યુપીઆઈ" },
};

export function localizeBankAccount(
  acc: {
    name: string;
    bank_name?: string | null;
    account_number?: string | null;
    account_type?: string;
    is_active?: boolean;
  },
  lang?: string,
): LocalizedBankAccountInfo {
  const currentLang = (lang || "en").toLowerCase();
  const isHi = currentLang.startsWith("hi");
  const isGu = currentLang.startsWith("gu");

  if (!isHi && !isGu) {
    return {
      name: acc.name,
      bank_name: acc.bank_name || (acc.account_type ? acc.account_type.toUpperCase() : ""),
      account_number: acc.account_number || "",
      account_type: acc.account_type || "",
      status_label: acc.is_active ? "ACTIVE" : "ARCHIVED",
    };
  }

  const langKey: "hi" | "gu" = isHi ? "hi" : "gu";

  // 1. Localize name
  const nameLower = (acc.name || "").toLowerCase().trim();
  let localizedName = acc.name;
  if (ACCOUNT_NAMES_MAP[nameLower]) {
    localizedName = ACCOUNT_NAMES_MAP[nameLower][langKey];
  } else {
    localizedName = localizedName
      .replace(/bank of baroda/gi, isHi ? "बैंक ऑफ बड़ौदा" : "બેંક ઓફ બરોડા")
      .replace(/google pay/gi, isHi ? "गूगल पे" : "ગુગલ પે")
      .replace(/gpay/gi, isHi ? "जीपे" : "જીપે")
      .replace(/current a\/c/gi, isHi ? "चालू खाता" : "ચાલુ ખાતું")
      .replace(/savings a\/c/gi, isHi ? "बचत खाता" : "બચત ખાતું")
      .replace(
        /petty cash & site float/gi,
        isHi ? "दैनिक खर्च व साइट नकद" : "દૈનિક ખર્ચ અને સાઇટ રોકડ",
      )
      .replace(/petty cash/gi, isHi ? "दैनिक नकद" : "દૈનિક રોકડ");
  }

  // 2. Localize bank_name
  const bankLower = (acc.bank_name || "").toLowerCase().trim();
  let localizedBank = acc.bank_name || "";
  if (BANK_NAMES_MAP[bankLower]) {
    localizedBank = BANK_NAMES_MAP[bankLower][langKey];
  } else if (!localizedBank && acc.account_type) {
    localizedBank = ACCOUNT_TYPE_MAP[acc.account_type]?.[langKey] || acc.account_type.toUpperCase();
  } else {
    localizedBank = localizedBank
      .replace(/bank of baroda/gi, isHi ? "बैंक ऑफ बड़ौदा" : "બેંક ઓફ બરોડા")
      .replace(/npci/gi, isHi ? "एनपीसीआई" : "એનપીસીઆઈ")
      .replace(/gpay/gi, isHi ? "जीपे" : "જીપે")
      .replace(/upi/gi, isHi ? "यूपीआई" : "યુપીઆઈ")
      .replace(/cash on hand/gi, isHi ? "हाथ में नकद" : "હાથ પર રોકડ");
  }

  // 3. Localize account_number / details
  const accNumLower = (acc.account_number || "").toLowerCase().trim();
  let localizedAccNum = acc.account_number || "";
  if (ACCOUNT_NUM_MAP[accNumLower]) {
    localizedAccNum = ACCOUNT_NUM_MAP[accNumLower][langKey];
  } else {
    localizedAccNum = localizedAccNum
      .replace(/bob current a\/c/gi, isHi ? "बीओबी चालू खाता" : "બીઓબી ચાલુ ખાતું")
      .replace(/current a\/c/gi, isHi ? "चालू खाता" : "ચાલુ ખાતું")
      .replace(/mob:/gi, isHi ? "मो:" : "મો:")
      .replace(/linked:/gi, isHi ? "लिंक:" : "લિંક:")
      .replace(/cash drawer/gi, isHi ? "गल्ला / नकद दराज" : "રોકડ ડ્રોઅર");
  }

  // 4. Status label
  const statusLabel = acc.is_active ? (isHi ? "सक्रिय" : "સક્રિય") : isHi ? "संग्रहीत" : "સંગ્રહિત";

  return {
    name: localizedName,
    bank_name: localizedBank,
    account_number: localizedAccNum,
    account_type: ACCOUNT_TYPE_MAP[acc.account_type || ""]?.[langKey] || acc.account_type || "",
    status_label: statusLabel,
  };
}

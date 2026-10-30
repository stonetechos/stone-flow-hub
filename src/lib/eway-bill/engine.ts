import type { EWayBillDetails, EWayBillPartA, EWayBillPartB, EWayBillVehicleType } from "./types";
import type { InvoiceListItem, InvoiceItemRow } from "@/lib/invoices/api";

/**
 * Standard Stone Tech atelier dispatch origin defaults (Udaipur, Rajasthan).
 */
export const STONE_TECH_DISPATCH_ORIGIN = {
  gstin: "08AABCS9999Z1Z5",
  legalName: "Stone Tech Architectural Stone Atelier",
  address: "Plot 42-45, Sukher Industrial Area, NH-8",
  place: "Udaipur",
  pincode: "313001",
  stateCode: "08",
};

/**
 * Validates a 12-digit numeric E-Way Bill Number.
 */
export function isValidEWayBillNo(value: string | null | undefined): boolean {
  if (!value) return false;
  const cleaned = value.replace(/[\s-]/g, "");
  return /^\d{12}$/.test(cleaned);
}

/**
 * Normalizes vehicle number into standard Indian transport format: e.g. RJ27-GA-1234
 */
export function normalizeVehicleNo(raw: string | null | undefined): string {
  if (!raw) return "";
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cleaned.length >= 8) {
    // e.g. RJ27GA1234 -> RJ-27-GA-1234 or RJ27-GA-1234
    return cleaned.replace(/^([A-Z]{2})(\d{2})([A-Z]{1,2})(\d{4})$/, "$1$2-$3-$4");
  }
  return cleaned;
}

/**
 * Calculates E-Way Bill validity based on distance and cargo type per GST Law.
 * - Regular Cargo: 1 day per 200 km (or part thereof). Minimum 1 day.
 * - Over Dimensional Cargo (ODC): 1 day per 20 km (or part thereof). Minimum 1 day.
 */
export function calculateEWayBillValidity(
  distanceKm: number,
  vehicleType: EWayBillVehicleType = "R",
  baseDate = new Date(),
): { validUntil: string; daysValid: number } {
  const kmPerDay = vehicleType === "O" ? 20 : 200;
  const daysValid = Math.max(1, Math.ceil(Math.max(1, distanceKm) / kmPerDay));

  const validUntilDate = new Date(baseDate.getTime());
  validUntilDate.setDate(validUntilDate.getDate() + daysValid);
  // E-Way bills expire at 11:59:59 PM of the expiration day
  validUntilDate.setHours(23, 59, 59, 999);

  return {
    validUntil: validUntilDate.toISOString(),
    daysValid,
  };
}

/**
 * Generates an internal valid 12-digit E-Way Bill Number sequence.
 */
export function generateStosEWayBillNo(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const randomPart = Math.floor(10000000 + Math.random() * 90000000);
  return `${yy}${mm}${randomPart}`;
}

/**
 * Estimates distance in KM based on destination state or pincode if not provided.
 */
export function estimateDistanceKm(fromPincode = "313001", toStateCode?: string | null): number {
  if (!toStateCode || toStateCode === "08") return 50; // Intra-state Rajasthan
  if (toStateCode === "24") return 260; // Gujarat (Ahmedabad / Surat)
  if (toStateCode === "27") return 780; // Maharashtra (Mumbai / Pune)
  if (toStateCode === "07") return 660; // Delhi NCR
  if (toStateCode === "29") return 1650; // Karnataka (Bangalore)
  if (toStateCode === "33") return 2050; // Tamil Nadu (Chennai)
  if (toStateCode === "36") return 1350; // Telangana (Hyderabad)
  return 350; // Default inter-state average
}

/**
 * Builds the Part A data structure from an invoice and its items.
 */
export function buildEWayBillPartA(
  invoice: InvoiceListItem,
  items: InvoiceItemRow[],
  customerInfo?: {
    gstin?: string | null;
    address?: string | null;
    city?: string | null;
    pincode?: string | null;
    state?: string | null;
  },
): EWayBillPartA {
  const taxableAmount = items.reduce(
    (acc, it) => acc + Number(it.quantity || 0) * Number(it.unit_price || 0),
    0,
  );
  const totalTax = Number(invoice.tax_amount || 0);

  // If customer has separate GST or inter-state, distribute CGST/SGST vs IGST
  const isInterState =
    customerInfo?.gstin && !customerInfo.gstin.startsWith(STONE_TECH_DISPATCH_ORIGIN.stateCode);

  const cgstAmount = isInterState ? 0 : Math.round((totalTax / 2) * 100) / 100;
  const sgstAmount = isInterState ? 0 : Math.round((totalTax / 2) * 100) / 100;
  const igstAmount = isInterState ? totalTax : 0;

  const mainHsn = items.find((i) => i.hsn_sac)?.hsn_sac || "6802";

  // Destination state code from customer GSTIN or default
  const destGstin = customerInfo?.gstin?.trim() || "URP";
  const toStateCode = destGstin !== "URP" && destGstin.length >= 2 ? destGstin.slice(0, 2) : "08";

  return {
    fromGstin: STONE_TECH_DISPATCH_ORIGIN.gstin,
    fromLegalName: STONE_TECH_DISPATCH_ORIGIN.legalName,
    fromAddress1: STONE_TECH_DISPATCH_ORIGIN.address,
    fromPlace: STONE_TECH_DISPATCH_ORIGIN.place,
    fromPincode: STONE_TECH_DISPATCH_ORIGIN.pincode,
    fromStateCode: STONE_TECH_DISPATCH_ORIGIN.stateCode,

    toGstin: destGstin,
    toLegalName: invoice.customer?.name || "Cash Customer",
    toAddress1: customerInfo?.address || "Site / Project Address",
    toPlace: customerInfo?.city || "Site Delivery Location",
    toPincode: customerInfo?.pincode || "313001",
    toStateCode,

    docType: "INV",
    docNo: invoice.invoice_no,
    docDate: invoice.issue_date || new Date().toISOString().slice(0, 10),

    totalTaxableAmount: Math.round(taxableAmount * 100) / 100,
    cgstAmount,
    sgstAmount,
    igstAmount,
    cessAmount: 0,
    totalInvoiceValue: Number(invoice.total || taxableAmount + totalTax),
    mainHsnCode: mainHsn,
  };
}

/**
 * Generates official NIC E-Way Bill Bulk Upload JSON schema
 * compliant with `https://ewaybillgst.gov.in/` offline tool specifications.
 */
export function generateNicEwayBillJson(details: EWayBillDetails) {
  const { partA, partB } = details;
  const formattedDocDate = partA.docDate.split("-").reverse().join("/"); // DD/MM/YYYY

  return {
    version: "1.0.0421",
    billLists: [
      {
        userGstin: partA.fromGstin,
        supplyType: "O",
        subSupplyType: "1", // Supply
        docType: "INV",
        docNo: partA.docNo,
        docDate: formattedDocDate,
        transType: "1", // Regular

        // Consignor
        fromGstin: partA.fromGstin,
        fromTrdName: partA.fromLegalName,
        fromAddr1: partA.fromAddress1,
        fromPlace: partA.fromPlace,
        fromPincode: Number(partA.fromPincode),
        actFromStateCode: Number(partA.fromStateCode),
        fromStateCode: Number(partA.fromStateCode),

        // Consignee
        toGstin: partA.toGstin,
        toTrdName: partA.toLegalName,
        toAddr1: partA.toAddress1,
        toPlace: partA.toPlace,
        toPincode: Number(partA.toPincode),
        actToStateCode: Number(partA.toStateCode),
        toStateCode: Number(partA.toStateCode),

        // Values
        totalValue: partA.totalTaxableAmount,
        cgstValue: partA.cgstAmount,
        sgstValue: partA.sgstAmount,
        igstValue: partA.igstAmount,
        cessValue: partA.cessAmount,
        totInvValue: partA.totalInvoiceValue,

        // Transportation (Part B)
        transMode: partB.transportMode,
        transDistance: String(partB.approxDistanceKm),
        transporterName: partB.transporterName || "",
        transporterId: partB.transporterId || "",
        transDocNo: partB.transportDocNo || "",
        transDocDate: partB.transportDocDate
          ? partB.transportDocDate.split("-").reverse().join("/")
          : formattedDocDate,
        vehicleNo: partB.vehicleNo,
        vehicleType: partB.vehicleType,

        itemList: [
          {
            itemNo: 1,
            productName: "Natural Stone Works, Slabs & Fabrication",
            productDesc: "Architectural stone panels, slabs & fabrication",
            hsnCode: Number(partA.mainHsnCode.slice(0, 4) || 6802),
            quantity: 1,
            qtyUnit: "SQF",
            taxableAmount: partA.totalTaxableAmount,
            sgstRate: partA.sgstAmount > 0 ? 9 : 0,
            cgstRate: partA.cgstAmount > 0 ? 9 : 0,
            igstRate: partA.igstAmount > 0 ? 18 : 0,
            cessRate: 0,
          },
        ],
      },
    ],
  };
}

/**
 * GST E-Way Bill (Electronic Way Bill) Domain Types and Constants
 * Compliant with National Informatics Centre (NIC) GST E-Way Bill System specifications.
 */

export type EWayBillTransportMode = "1" | "2" | "3" | "4"; // 1=Road, 2=Rail, 3=Air, 4=Ship
export type EWayBillVehicleType = "R" | "O"; // R=Regular, O=Over Dimensional Cargo

export interface EWayBillPartA {
  fromGstin: string;
  fromLegalName: string;
  fromAddress1: string;
  fromPlace: string;
  fromPincode: string;
  fromStateCode: string;

  toGstin: string;
  toLegalName: string;
  toAddress1: string;
  toPlace: string;
  toPincode: string;
  toStateCode: string;

  docType: "INV" | "BIL" | "CHL";
  docNo: string;
  docDate: string; // YYYY-MM-DD

  totalTaxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  totalInvoiceValue: number;
  mainHsnCode: string;
}

export interface EWayBillPartB {
  transportMode: EWayBillTransportMode;
  approxDistanceKm: number;
  transporterId?: string | null;
  transporterName?: string | null;
  transportDocNo?: string | null; // LR / RR / Bilty No
  transportDocDate?: string | null;
  vehicleNo: string;
  vehicleType: EWayBillVehicleType;
}

export interface EWayBillDetails {
  ewayBillNo: string;
  ewayBillDate: string; // ISO timestamp
  validUntil: string; // ISO timestamp
  partA: EWayBillPartA;
  partB: EWayBillPartB;
  source: "portal_verified" | "stos_generated";
  status: "ACTIVE" | "CANCELLED" | "EXPIRED";
  notes?: string;
}

export interface EWayBillInput {
  invoiceId: string;
  ewayBillNo?: string;
  vehicleNo: string;
  transporterName?: string | null;
  transporterId?: string | null;
  lrNo?: string | null;
  lrDate?: string | null;
  distanceKm: number;
  transportMode?: EWayBillTransportMode;
  vehicleType?: EWayBillVehicleType;
  notes?: string | null;
  dispatchId?: string | null;
}

export const TRANSPORT_MODE_LABELS: Record<EWayBillTransportMode, string> = {
  "1": "Road (Truck / Trailer)",
  "2": "Rail",
  "3": "Air",
  "4": "Ship",
};

export const VEHICLE_TYPE_LABELS: Record<EWayBillVehicleType, string> = {
  R: "Regular Cargo",
  O: "Over Dimensional Cargo (ODC)",
};

/**
 * Standard GST State Code Lookup for Indian States & UTs.
 */
export const GST_STATE_CODES: Record<string, string> = {
  "08": "Rajasthan",
  "24": "Gujarat",
  "27": "Maharashtra",
  "07": "Delhi",
  "23": "Madhya Pradesh",
  "09": "Uttar Pradesh",
  "29": "Karnataka",
  "33": "Tamil Nadu",
  "36": "Telangana",
  "19": "West Bengal",
  "03": "Punjab",
  "06": "Haryana",
};

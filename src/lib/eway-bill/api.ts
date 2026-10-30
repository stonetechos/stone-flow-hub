import { getDb } from "@/integrations/supabase/server-context";
import { AppError, mapDbError } from "@/lib/errors";
import type { EWayBillDetails, EWayBillInput } from "./types";
import {
  buildEWayBillPartA,
  calculateEWayBillValidity,
  generateStosEWayBillNo,
  normalizeVehicleNo,
} from "./engine";
import { getInvoice, getInvoiceItems, type InvoiceListItem } from "@/lib/invoices/api";

/**
 * Saves and links an E-Way Bill to a Sales Invoice.
 */
export async function saveInvoiceEWayBill(input: EWayBillInput): Promise<EWayBillDetails> {
  const db = getDb();
  const invoice = await getInvoice(input.invoiceId);
  if (!invoice) throw new AppError("Invoice not found");

  const items = await getInvoiceItems(input.invoiceId);

  // Fetch customer details for GSTIN and address
  let customerGstin: string | null = null;
  let customerAddress: string | null = null;
  let customerCity: string | null = null;
  let customerPincode: string | null = null;
  let customerState: string | null = null;

  if (invoice.customer_id) {
    const { data: cust } = await db
      .from("customers")
      .select("gst_number, billing_address, city, state, pincode, external_ref")
      .eq("id", invoice.customer_id)
      .maybeSingle();

    if (cust) {
      customerGstin = cust.gst_number ?? null;
      customerAddress = cust.billing_address ?? null;
      customerCity = cust.city ?? null;
      customerPincode = cust.pincode ?? null;
      customerState = cust.state ?? null;
    }
  }

  // Construct Part A
  const partA = buildEWayBillPartA(invoice, items, {
    gstin: customerGstin,
    address: customerAddress,
    city: customerCity,
    pincode: customerPincode,
    state: customerState,
  });

  const cleanedVehicleNo = normalizeVehicleNo(input.vehicleNo);
  const ewayBillNo = input.ewayBillNo?.trim() || generateStosEWayBillNo();
  const now = new Date();
  const validity = calculateEWayBillValidity(input.distanceKm, input.vehicleType ?? "R", now);

  const details: EWayBillDetails = {
    ewayBillNo,
    ewayBillDate: now.toISOString(),
    validUntil: validity.validUntil,
    partA,
    partB: {
      transportMode: input.transportMode ?? "1",
      approxDistanceKm: input.distanceKm,
      transporterId: input.transporterId ?? null,
      transporterName: input.transporterName ?? null,
      transportDocNo: input.lrNo ?? null,
      transportDocDate: input.lrDate ?? now.toISOString().slice(0, 10),
      vehicleNo: cleanedVehicleNo,
      vehicleType: input.vehicleType ?? "R",
    },
    source: input.ewayBillNo?.trim() ? "portal_verified" : "stos_generated",
    status: "ACTIVE",
    notes: input.notes ?? undefined,
  };

  // Merge into invoice workflow_state
  const currentWf = (invoice.workflow_state as Record<string, unknown> | null) ?? {};
  const updatedWf = {
    ...currentWf,
    eway_bill_details: details,
  };

  const { error: updErr } = await db
    .from("invoices")
    .update({
      eway_bill_no: ewayBillNo,
      vehicle_no: cleanedVehicleNo,
      transporter: input.transporterName ?? null,
      lr_no: input.lrNo ?? null,
      dispatch_date: now.toISOString().slice(0, 10),
      workflow_state: updatedWf as never,
    })
    .eq("id", input.invoiceId);

  if (updErr) throw new AppError(mapDbError(updErr));

  // If a dispatch is linked or requested, sync vehicle and transport doc
  if (input.dispatchId) {
    await db
      .from("dispatches")
      .update({
        vehicle_no: cleanedVehicleNo,
        lr_no: input.lrNo ?? null,
        carrier: input.transporterName ?? null,
      })
      .eq("id", input.dispatchId);
  }

  return details;
}

/**
 * Removes or voids the E-Way Bill attached to an invoice.
 */
export async function clearInvoiceEWayBill(invoiceId: string): Promise<void> {
  const db = getDb();
  const { data: inv } = await db
    .from("invoices")
    .select("workflow_state")
    .eq("id", invoiceId)
    .single();

  const currentWf = (inv?.workflow_state as Record<string, unknown> | null) ?? {};
  const updatedWf = { ...currentWf };
  delete updatedWf.eway_bill_details;

  const { error } = await db
    .from("invoices")
    .update({
      eway_bill_no: null,
      workflow_state: updatedWf as never,
    })
    .eq("id", invoiceId);

  if (error) throw new AppError(mapDbError(error));
}

/**
 * Retrieves the parsed E-Way Bill details from an invoice row.
 */
export function getInvoiceEWayBillDetails(
  invoice: InvoiceListItem | null | undefined,
): EWayBillDetails | null {
  if (!invoice) return null;
  const wf = (invoice.workflow_state as Record<string, unknown> | null) ?? {};
  if (wf.eway_bill_details && typeof wf.eway_bill_details === "object") {
    return wf.eway_bill_details as EWayBillDetails;
  }
  // If invoice has eway_bill_no on the column but no full JSON yet
  if (invoice.eway_bill_no) {
    return {
      ewayBillNo: invoice.eway_bill_no,
      ewayBillDate: invoice.created_at || new Date().toISOString(),
      validUntil: invoice.created_at || new Date().toISOString(),
      partA: {
        fromGstin: "08AABCS9999Z1Z5",
        fromLegalName: "Stone Tech Architectural Stone Atelier",
        fromAddress1: "Sukher Industrial Area",
        fromPlace: "Udaipur",
        fromPincode: "313001",
        fromStateCode: "08",
        toGstin: "URP",
        toLegalName: invoice.customer?.name || "Customer",
        toAddress1: "Site Address",
        toPlace: "Delivery Site",
        toPincode: "313001",
        toStateCode: "08",
        docType: "INV",
        docNo: invoice.invoice_no,
        docDate: invoice.issue_date || "",
        totalTaxableAmount: Number(invoice.subtotal || invoice.total || 0),
        cgstAmount: Number(invoice.tax_amount ? invoice.tax_amount / 2 : 0),
        sgstAmount: Number(invoice.tax_amount ? invoice.tax_amount / 2 : 0),
        igstAmount: 0,
        cessAmount: 0,
        totalInvoiceValue: Number(invoice.total || 0),
        mainHsnCode: "6802",
      },
      partB: {
        transportMode: "1",
        approxDistanceKm: 50,
        transporterName: invoice.transporter,
        transportDocNo: invoice.lr_no,
        vehicleNo: invoice.vehicle_no || "RJ27-GA-1234",
        vehicleType: "R",
      },
      source: "portal_verified",
      status: "ACTIVE",
    };
  }
  return null;
}

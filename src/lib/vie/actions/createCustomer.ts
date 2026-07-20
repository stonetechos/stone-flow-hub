/**
 * Workflow Engine handler for "create_customer".
 *
 * Calls createCustomer() from lib/customers/api.ts — the EXACT SAME function
 * the existing manual "New Customer" form already calls, including its own
 * phone-based dedup check (a second line of defense behind the Planner's
 * resolveCustomerDuplicate). No parallel write path, no duplicated business
 * logic (ADR-0001 requirement 2). See VIE-CreateCustomer-UX-Contract.md for
 * the full behavioral contract this implements.
 */
import { createCustomer } from "@/lib/customers/api";
import { registerVieAction, type VieActionResult } from "./registry";

const VALID_CUSTOMER_TYPES = [
  "individual",
  "company",
  "builder",
  "architect",
  "interior_designer",
  "contractor",
  "government",
  "other",
] as const;
type CustomerType = (typeof VALID_CUSTOMER_TYPES)[number];

registerVieAction("create_customer", async (params): Promise<VieActionResult> => {
  const name = params.name as string | undefined;
  const mobile = params.mobile as string | undefined;

  if (!name || !mobile) {
    // Should be unreachable: the Planner only reaches "auto" or "confirm"
    // execution once both a name and a valid, non-duplicate mobile number
    // were resolved — anything else is downgraded to "draft" and must
    // arrive here with these fields supplied via completeDraftAction's
    // patch. This guards against a future Planner bug silently invoking
    // createCustomer() with missing required fields.
    throw new Error("create_customer handler invoked without a resolved name/mobile");
  }

  const rawCustomerType = params.customer_type as string | undefined;
  const customerType: CustomerType = VALID_CUSTOMER_TYPES.includes(rawCustomerType as CustomerType)
    ? (rawCustomerType as CustomerType)
    : "individual";

  const customer = await createCustomer({
    name,
    mobile,
    email: undefined,
    city: (params.city as string | undefined) ?? undefined,
    customer_type: customerType,
    whatsapp: undefined,
    state: undefined,
    pincode: undefined,
    billing_address: undefined,
    gst_number: undefined,
    notes: (params.notes as string | undefined) ?? undefined,
  });

  return { linkedRecordType: "customer", linkedRecordId: customer.id };
});

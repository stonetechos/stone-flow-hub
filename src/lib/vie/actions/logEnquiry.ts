/**
 * Workflow Engine handler for "log_enquiry".
 *
 * Calls createEnquiry() from lib/enquiries/api.ts — the EXACT SAME function
 * the existing manual "New Enquiry" form already calls. No parallel write
 * path, no duplicated business logic (ADR-0001 requirement 2).
 */
import { createEnquiry } from "@/lib/enquiries/api";
import { registerVieAction, type VieActionResult } from "./registry";

registerVieAction("log_enquiry", async (params): Promise<VieActionResult> => {
  const customerId = params.customer_id as string | null;

  if (!customerId) {
    // Should be unreachable: the Planner only reaches "auto" or "confirm"
    // execution once resolveCustomer() found an unambiguous match — anything
    // else is downgraded to "draft" and must arrive here with a customer_id
    // supplied via completeDraftAction's patch. This guards against a future
    // Planner bug silently writing an enquiry with no linked customer.
    throw new Error("log_enquiry handler invoked without a resolved customer_id");
  }

  const enquiry = await createEnquiry({
    customer_id: customerId,
    customer_name: "",
    mobile: "",
    email: undefined,
    source: "AI Assistant",
    requirement: String(params.requirement ?? ""),
    budget_inr: (params.budget_inr as number | undefined) ?? null,
    notes: (params.notes as string | undefined) ?? undefined,
    priority: "normal",
    required_delivery_date: undefined,
  });

  return { linkedRecordType: "enquiry", linkedRecordId: enquiry.id };
});

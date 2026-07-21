/**
 * Registration entrypoint — importing this file (for its side effects) is
 * what populates the Action Registry. workflowEngine.ts imports this before
 * ever calling getVieAction(), so all handlers are always registered
 * before use regardless of import order elsewhere.
 */
import "./logEnquiry";
import "./noteFollowup";
import "./createCustomer";
import "./createQuotation";

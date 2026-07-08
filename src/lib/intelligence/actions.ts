/**
 * Stone Tech Intelligence — Next Best Action (NBA) recommender.
 *
 * Pure rule engine. Given an enquiry + its signals + milestones + invoices,
 * emit ordered action recommendations. The engine NEVER mutates anything —
 * it only surfaces suggested actions with priority, reason, days-overdue
 * and expected outcome. UI is responsible for executing the action.
 */
import type { LeadStage } from "@/lib/types";
import { STAGE_TO_UMBRELLA, type LeadUmbrellaId } from "@/lib/constants";
import { STAGE_AGE_WARNING_DAYS, daysSince } from "@/lib/lead-stage/health";

export type ActionKey =
  | "call_customer"
  | "schedule_site_visit"
  | "send_samples"
  | "prepare_quotation"
  | "follow_up"
  | "collect_advance"
  | "approve_vendor"
  | "start_production"
  | "schedule_dispatch"
  | "schedule_installation"
  | "collect_final_payment"
  | "request_google_review"
  | "assign_salesperson"
  | "capture_measurements";

export type ActionPriority = "urgent" | "high" | "medium" | "low";

export interface NextBestAction {
  key: ActionKey;
  label: string;
  reason: string;
  priority: ActionPriority;
  daysOverdue: number;
  expectedOutcome: string;
  /** Optional deep-link the UI can navigate to for the recommended action. */
  href?: string;
}

export interface ActionInputs {
  enquiryId: string;
  stage: LeadStage;
  projectId: string | null;
  assignedTo: string | null;
  hasPendingQuote: boolean;
  hasSalesOrder: boolean;
  hasInvoice: boolean;
  hasAdvancePayment: boolean;
  hasFullPayment: boolean;
  hasSiteVisitCompleted: boolean;
  hasSampleSent: boolean;
  hasRfq: boolean;
  hasApprovedVendor: boolean;
  hasProductionStarted: boolean;
  hasDispatchScheduled: boolean;
  hasInstallationScheduled: boolean;
  hasInstallationCompleted: boolean;
  hasReview: boolean;
  daysInStage: number;
  daysSinceLastFollowup: number | null;
  followupOverdue: boolean;
  invoiceDaysOverdue: number;
}

const PRIORITY_RANK: Record<ActionPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/** Ordered rules — first matches produce highest-priority actions. */
export function computeNextBestActions(input: ActionInputs): NextBestAction[] {
  const out: NextBestAction[] = [];
  const umb: LeadUmbrellaId = STAGE_TO_UMBRELLA[input.stage];
  const stageWarn = STAGE_AGE_WARNING_DAYS[umb];
  const stageOverdue = Math.max(0, input.daysInStage - stageWarn);

  const push = (a: NextBestAction) => out.push(a);
  const enqHref = `/enquiries/${input.enquiryId}`;

  if (!input.assignedTo && !["completed", "after_sales", "lost", "cancelled"].includes(umb)) {
    push({
      key: "assign_salesperson",
      label: "Assign salesperson",
      reason: "This lead has no salesperson yet.",
      priority: "urgent",
      daysOverdue: input.daysInStage,
      expectedOutcome: "Accountability and follow-up ownership",
      href: enqHref,
    });
  }

  if (input.followupOverdue) {
    push({
      key: "follow_up",
      label: "Follow up now",
      reason: "Scheduled follow-up is past due.",
      priority: "urgent",
      daysOverdue: 1,
      expectedOutcome: "Re-engage the customer before they cool off",
      href: enqHref,
    });
  }

  if (input.invoiceDaysOverdue > 0) {
    push({
      key: input.hasSalesOrder && input.hasInvoice && !input.hasFullPayment ? "collect_final_payment" : "collect_advance",
      label: "Collect overdue payment",
      reason: `Invoice is ${input.invoiceDaysOverdue} day(s) past due.`,
      priority: input.invoiceDaysOverdue > 7 ? "urgent" : "high",
      daysOverdue: input.invoiceDaysOverdue,
      expectedOutcome: "Clear outstanding cash",
      href: `/invoices`,
    });
  }

  switch (umb) {
    case "new_enquiry":
      push({
        key: "call_customer",
        label: "Call customer",
        reason: "New enquiry hasn't been contacted yet.",
        priority: stageOverdue > 0 ? "urgent" : "high",
        daysOverdue: stageOverdue,
        expectedOutcome: "Qualify intent and move to Exploration",
        href: enqHref,
      });
      break;
    case "exploration":
      if (!input.hasSiteVisitCompleted) {
        push({
          key: "schedule_site_visit",
          label: "Schedule site visit",
          reason: "Customer is engaged; capture on-site requirements.",
          priority: stageOverdue > 0 ? "high" : "medium",
          daysOverdue: stageOverdue,
          expectedOutcome: "Accurate measurements and requirement clarity",
          href: enqHref,
        });
      }
      break;
    case "requirement_gathering":
      if (!input.hasSiteVisitCompleted) {
        push({
          key: "capture_measurements",
          label: "Capture measurements",
          reason: "Requirement gathering still open — need measurements to quote.",
          priority: "high",
          daysOverdue: stageOverdue,
          expectedOutcome: "Enables accurate quotation",
          href: enqHref,
        });
      }
      if (!input.hasSampleSent) {
        push({
          key: "send_samples",
          label: "Send samples",
          reason: "Customer typically decides after seeing physical samples.",
          priority: "medium",
          daysOverdue: stageOverdue,
          expectedOutcome: "Reduces price objection at quotation stage",
          href: enqHref,
        });
      }
      push({
        key: "prepare_quotation",
        label: "Prepare quotation",
        reason: "Requirements captured — draft the quotation.",
        priority: stageOverdue > 0 ? "high" : "medium",
        daysOverdue: stageOverdue,
        expectedOutcome: "Move lead to Quotation Sent",
        href: `/quotes?enquiry=${input.enquiryId}`,
      });
      break;
    case "quotation_sent":
      push({
        key: "follow_up",
        label: "Follow up on quotation",
        reason: "Quotation sent — chase response.",
        priority: stageOverdue > 0 ? "high" : "medium",
        daysOverdue: stageOverdue,
        expectedOutcome: "Move to Negotiation or close",
        href: enqHref,
      });
      break;
    case "negotiation":
      push({
        key: "follow_up",
        label: "Close negotiation",
        reason: "Sitting in negotiation — push to decision.",
        priority: stageOverdue > 0 ? "high" : "medium",
        daysOverdue: stageOverdue,
        expectedOutcome: "Order confirmation or cleanly-marked loss",
        href: enqHref,
      });
      break;
    case "qualified":
    case "order_confirmed":
      if (!input.hasAdvancePayment) {
        push({
          key: "collect_advance",
          label: "Collect advance",
          reason: "Order confirmed — collect advance to lock production slot.",
          priority: "high",
          daysOverdue: stageOverdue,
          expectedOutcome: "Cash-in and procurement kickoff",
          href: `/payments`,
        });
      }
      break;
    case "procurement":
      if (!input.hasApprovedVendor) {
        push({
          key: "approve_vendor",
          label: "Approve vendor quote",
          reason: "Procurement waiting on vendor approval.",
          priority: stageOverdue > 0 ? "high" : "medium",
          daysOverdue: stageOverdue,
          expectedOutcome: "Purchase orders can go out",
          href: `/rfqs`,
        });
      }
      break;
    case "execution":
      if (!input.hasProductionStarted) {
        push({
          key: "start_production",
          label: "Start production",
          reason: "Order in execution but production not started.",
          priority: stageOverdue > 0 ? "urgent" : "high",
          daysOverdue: stageOverdue,
          expectedOutcome: "Meet promised delivery",
          href: `/manufacturing`,
        });
      } else if (!input.hasDispatchScheduled) {
        push({
          key: "schedule_dispatch",
          label: "Schedule dispatch",
          reason: "Production complete — schedule dispatch.",
          priority: "high",
          daysOverdue: stageOverdue,
          expectedOutcome: "On-time delivery",
          href: `/dispatch`,
        });
      } else if (!input.hasInstallationScheduled) {
        push({
          key: "schedule_installation",
          label: "Schedule installation",
          reason: "Dispatch ready — align installation team.",
          priority: "high",
          daysOverdue: stageOverdue,
          expectedOutcome: "Complete customer handover",
          href: `/installations`,
        });
      }
      break;
    case "completed":
      if (!input.hasFullPayment) {
        push({
          key: "collect_final_payment",
          label: "Collect final payment",
          reason: "Project completed but balance outstanding.",
          priority: "high",
          daysOverdue: input.invoiceDaysOverdue,
          expectedOutcome: "Close the project financially",
          href: `/invoices`,
        });
      }
      if (input.hasFullPayment && !input.hasReview) {
        push({
          key: "request_google_review",
          label: "Request Google review",
          reason: "Happy paid customer — ideal moment for a review.",
          priority: "medium",
          daysOverdue: 0,
          expectedOutcome: "Referrals and lead source",
          href: enqHref,
        });
      }
      break;
    case "after_sales":
      push({
        key: "follow_up",
        label: "After-sales check-in",
        reason: "Nurture customer for repeat/referrals.",
        priority: "low",
        daysOverdue: 0,
        expectedOutcome: "Repeat business",
        href: enqHref,
      });
      break;
    default:
      break;
  }

  if (input.daysSinceLastFollowup != null && input.daysSinceLastFollowup > 14 && !out.some((a) => a.key === "follow_up")) {
    push({
      key: "follow_up",
      label: "Log a follow-up",
      reason: `No follow-up recorded for ${input.daysSinceLastFollowup} days.`,
      priority: "medium",
      daysOverdue: input.daysSinceLastFollowup - 14,
      expectedOutcome: "Keep the lead alive",
      href: enqHref,
    });
  }

  out.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || b.daysOverdue - a.daysOverdue);
  return out;
}

/** Convenience helper to derive `daysInStage`. */
export function stageAgeDays(stageEnteredAt: string | null, fallback: string | null): number {
  return daysSince(stageEnteredAt ?? fallback);
}

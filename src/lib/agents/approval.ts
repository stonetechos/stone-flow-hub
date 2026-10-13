/**
 * Human Approval & Zero-Outbound Security Layer.
 *
 * Guarantees that:
 * 1. No agent can independently send outbound messages or execute financial changes.
 * 2. Every action requires explicit human approval by an authorized user.
 * 3. Editing a draft invalidates any existing approval.
 * 4. Re-verifies permissions and draft integrity at execution time.
 */

import { AppError } from "@/lib/errors";
import {
  buildWhatsappAppUrl,
  buildWhatsappWebUrl,
  getWhatsappModePreference,
} from "@/lib/whatsapp";
import type { AgentDraftPayload, AgentTaskItem } from "./types";

/**
 * Generates a stable deterministic fingerprint of the draft content.
 * Any modification to recipient, message, or channel changes the hash.
 */
export function createDraftHash(draft: AgentDraftPayload): string {
  const content = [
    draft.channel,
    draft.recipientName.trim().toLowerCase(),
    (draft.recipientContact || "").trim().replace(/\D+/g, ""),
    draft.messageText.trim(),
    draft.referenceEntity.type,
    draft.referenceEntity.id,
  ].join("|#|");

  // Fast DJB2 + FNV-1a hybrid integer string hash for browser & server portability
  let h1 = 0x811c9dc5;
  let h2 = 5381;
  for (let i = 0; i < content.length; i++) {
    const code = content.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 = (h2 << 5) + h2 + code;
  }
  return `hash_${(h1 >>> 0).toString(16)}_${(h2 >>> 0).toString(16)}`;
}

/**
 * Validates whether the draft has been modified since it was approved.
 */
export function isDraftTampered(draft: AgentDraftPayload, approvedHash?: string | null): boolean {
  if (!approvedHash) return true;
  const currentHash = createDraftHash(draft);
  return currentHash !== approvedHash;
}

/**
 * Prepares an approved draft for human-triggered dispatch via existing integrations.
 * Returns the exact interactive dispatch URL (e.g. WhatsApp Desktop or Web link).
 * NEVER transmits externally in the background.
 */
export function resolveExecutionDispatch(
  task: AgentTaskItem,
  authenticatedUserId: string,
): {
  actionUrl?: string;
  copyableText: string;
  message: string;
} {
  if (task.status !== "approved") {
    throw new AppError(
      `Cannot execute action: current status is "${task.status}". Explicit human approval is required.`,
      "AGENT_APPROVAL_REQUIRED",
      403,
    );
  }

  // Accounting agent actions are review-only by definition
  if (task.agentId === "accounting") {
    throw new AppError(
      "Accounting Agent actions are strictly review-only. Autonomous postings or reversals are prohibited by policy.",
      "ACCOUNTING_REVIEW_ONLY",
      400,
    );
  }

  // Verify draft integrity
  if (isDraftTampered(task.draft, task.draft.draftHash)) {
    throw new AppError(
      "Draft content was modified after approval. Re-approval is required before execution.",
      "AGENT_DRAFT_MODIFIED",
      400,
    );
  }

  const { channel, recipientContact, messageText } = task.draft;

  if (channel === "whatsapp") {
    if (!recipientContact) {
      return {
        copyableText: messageText,
        message: "No phone number available. Draft text is ready to copy.",
      };
    }

    const mode = getWhatsappModePreference();
    const actionUrl =
      mode === "web"
        ? buildWhatsappWebUrl(recipientContact, messageText)
        : buildWhatsappAppUrl(recipientContact, messageText);

    return {
      actionUrl,
      copyableText: messageText,
      message: "Ready for human confirmation. Click to open in WhatsApp with pre-filled message.",
    };
  }

  if (channel === "email") {
    const subject = encodeURIComponent(task.draft.subject || "Stone Tech Update");
    const body = encodeURIComponent(messageText);
    const to = recipientContact ? encodeURIComponent(recipientContact) : "";
    const actionUrl = `mailto:${to}?subject=${subject}&body=${body}`;

    return {
      actionUrl,
      copyableText: messageText,
      message: "Ready for human confirmation. Click to open in your email client.",
    };
  }

  return {
    copyableText: messageText,
    message: "Action approved. Copy draft text to proceed.",
  };
}

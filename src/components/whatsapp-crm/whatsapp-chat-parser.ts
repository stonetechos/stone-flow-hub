import type { WhatsappMessage } from "./types";

export interface ParsedWhatsappImport {
  contactName: string;
  phone: string;
  messages: WhatsappMessage[];
  messageCount: number;
}

/**
 * Extracts contact name or phone from standard WhatsApp export filename:
 * e.g. "WhatsApp Chat with Ar. Mehul Panchal.txt"
 * e.g. "WhatsApp Chat - +91 98250 12345.txt"
 */
export function extractContactFromFilename(filename: string): { name?: string; phone?: string } {
  const clean = filename.replace(/\.(txt|zip)$/i, "").trim();
  const match = clean.match(/WhatsApp Chat (?:with|-)\s*(.+)/i);
  if (!match) return {};

  const raw = match[1].trim();
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 10 && raw.match(/^[\d\s+-]+$/)) {
    return { phone: digits.length === 10 ? `91${digits}` : digits, name: raw };
  }
  return { name: raw };
}

/**
 * Parses raw WhatsApp chat export (.txt) into structured conversations and messages.
 * Handles iOS bracket format: `[22/11/26, 10:30:15 AM] Name: Message`
 * Handles Android dash format: `22/11/2026, 10:30 am - Name: Message`
 * Handles 12-hour (AM/PM) and 24-hour time notations.
 * Preserves multi-line message bodies.
 */
export function parseWhatsappChatExport(
  rawText: string,
  conversationId: string,
  fallbackName = "WhatsApp Contact",
  fallbackPhone = "",
): ParsedWhatsappImport {
  const lines = rawText.split(/\r?\n/);
  const messages: WhatsappMessage[] = [];
  const participantCounts = new Map<string, number>();

  // Regular expressions for standard WhatsApp export line headers
  // iOS: [22/11/26, 10:30:15 AM] Contact: Message
  // Android: 22/11/2026, 10:30 - Contact: Message OR 22/11/2026, 10:30 am - Contact: Message
  const iOSRegex =
    /^\[(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)\]\s+([^:]+):\s+(.*)$/;
  const androidRegex =
    /^(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)\s+-\s+([^:]+):\s+(.*)$/;

  let currentMsg: {
    senderRaw: string;
    timestamp: string;
    textLines: string[];
  } | null = null;

  for (const line of lines) {
    if (!line.trim()) continue;

    // Check if line is a system notice (e.g. End-to-end encryption notices)
    if (
      line.includes("Messages and calls are end-to-end encrypted") ||
      line.includes("changed the group description") ||
      line.includes("created group")
    ) {
      continue;
    }

    const iosMatch = line.match(iOSRegex);
    const androidMatch = line.match(androidRegex);
    const match = iosMatch || androidMatch;

    if (match) {
      // Flush previous message
      if (currentMsg) {
        commitMessage(currentMsg);
      }

      const [, datePart, timePart, senderRaw, body] = match;
      const cleanSender = senderRaw.trim();
      participantCounts.set(cleanSender, (participantCounts.get(cleanSender) || 0) + 1);

      currentMsg = {
        senderRaw: cleanSender,
        timestamp: `${datePart}, ${timePart.trim()}`,
        textLines: [body],
      };
    } else if (currentMsg) {
      // Continuation line for multi-line messages
      currentMsg.textLines.push(line);
    }
  }

  // Flush final message
  if (currentMsg) {
    commitMessage(currentMsg);
  }

  function commitMessage(m: { senderRaw: string; timestamp: string; textLines: string[] }) {
    const text = m.textLines.join("\n").trim();
    if (!text) return;

    // Detect if sender is Stone Tech / team
    const isStoneTech =
      m.senderRaw.toLowerCase().includes("stone tech") ||
      m.senderRaw.toLowerCase() === "you" ||
      m.senderRaw.includes("7742090866") ||
      m.senderRaw.includes("77420 90866");

    messages.push({
      id: `wa-msg-${conversationId}-${messages.length + 1}-${Math.random().toString(36).slice(2, 6)}`,
      conversationId,
      sender: isStoneTech ? "team" : "customer",
      text,
      timestamp: m.timestamp,
      status: "read",
    });
  }

  // Determine the primary customer contact name:
  // The participant who is NOT Stone Tech and sent the most messages
  let contactName = fallbackName;
  let maxCount = 0;
  for (const [participant, count] of participantCounts.entries()) {
    const isTeam =
      participant.toLowerCase().includes("stone tech") ||
      participant.toLowerCase() === "you" ||
      participant.includes("7742090866");

    if (!isTeam && count > maxCount) {
      maxCount = count;
      contactName = participant;
    }
  }

  // Determine phone number if contact name looks like a phone number
  let phone = fallbackPhone;
  const digits = contactName.replace(/\D/g, "");
  if (!phone && digits.length >= 10) {
    phone = digits.length === 10 ? `91${digits}` : digits;
  }

  return {
    contactName,
    phone: phone || "919800000000",
    messages,
    messageCount: messages.length,
  };
}

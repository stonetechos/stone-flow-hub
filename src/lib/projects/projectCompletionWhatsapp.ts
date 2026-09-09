import { formatInr } from "@/lib/format";
import { normalizeMobile } from "@/lib/zod";
import { toast } from "sonner";

export interface ProjectCompletionWhatsappInput {
  customerName: string;
  customerPhone?: string | null;
  customerWhatsapp?: string | null;
  projectName: string;
  projectCode?: string | null;
  totalInvoiced?: number;
  totalReceived?: number;
  balanceDue?: number;
}

export function buildProjectCompletionWhatsappMessage(
  input: ProjectCompletionWhatsappInput,
): string {
  const invoiced = input.totalInvoiced != null ? formatInr(input.totalInvoiced) : null;
  const received = input.totalReceived != null ? formatInr(input.totalReceived) : null;
  const balance = input.balanceDue != null ? formatInr(input.balanceDue) : null;

  const lines = [
    `Dear ${input.customerName || "Customer"},`,
    ``,
    `We are delighted to inform you that your project *${input.projectName}* has been successfully completed by Stone Tech!`,
    ``,
    `*Project Ledger Summary:*`,
  ];

  if (invoiced) lines.push(`• Total Invoiced: ${invoiced}`);
  if (received) lines.push(`• Amount Received: ${received}`);
  if (balance) lines.push(`• Balance Due: ${balance}`);

  lines.push(
    ``,
    `Please review your updated sales ledger on your account or let us know if you need an official statement copy.`,
    ``,
    `Thank you for placing your trust in Stone Tech. We look forward to working with you again!`,
    ``,
    `Warm regards,`,
    `*Stone Tech Operations*`,
  );

  return lines.join("\n");
}

export function openProjectCompletionWhatsapp(input: ProjectCompletionWhatsappInput): boolean {
  const rawNumber = input.customerWhatsapp || input.customerPhone;
  if (!rawNumber) {
    toast.error("No phone number or WhatsApp available for this customer.");
    return false;
  }

  const normalized = normalizeMobile(rawNumber);
  const digits = (normalized || rawNumber).replace(/\D/g, "");
  const targetNumber = digits.length === 10 ? `91${digits}` : digits;

  const text = buildProjectCompletionWhatsappMessage(input);
  const url = `https://wa.me/${targetNumber}?text=${encodeURIComponent(text)}`;

  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
    toast.success(`Opening WhatsApp for ${input.customerName}...`);
  }

  return true;
}

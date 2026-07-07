/** Completion certificate — reuses branded PDF generator via print dialog. */
import { renderDocHtml, printHtml, type PdfDoc } from "@/lib/pdf/generator";

export function printCompletionCertificate(input: {
  installation_no: string;
  customer_name: string;
  project_name: string | null;
  site_address: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  rating: number | null;
  remarks: string | null;
}): void {
  const doc: PdfDoc = {
    kind: "qc_report",
    title: "Installation Completion Certificate",
    number: input.installation_no,
    date: input.actual_end_date ?? new Date().toISOString().slice(0, 10),
    from: { name: "Stone Tech OS" },
    to: { name: input.customer_name, address: input.site_address ?? undefined },
    meta: [
      { label: "Project", value: input.project_name ?? "—" },
      { label: "Site", value: input.site_address ?? "—" },
      { label: "Start", value: input.actual_start_date ?? "—" },
      { label: "Completion", value: input.actual_end_date ?? "—" },
      { label: "Customer rating", value: input.rating != null ? `${input.rating}/5` : "—" },
    ],
    notes:
      (input.remarks ? `Customer remarks: ${input.remarks}\n\n` : "") +
      "This is to certify that the above installation has been completed and inspected by the customer, and all works are accepted as per specification.",
    footer: "Customer signature captured electronically on file.",
  };
  printHtml(renderDocHtml(doc));
}

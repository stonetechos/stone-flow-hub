/** Customer requirement attachments — pulls photos/PDFs/drawings from the
 *  linked enquiry and project so RFQ recipients see them without duplication.
 */
import { useQuery } from "@tanstack/react-query";
import { FileText, Image as ImageIcon, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listAttachments, signedUrl, type FileRow } from "@/lib/attachments/api";

export function CustomerRequirementAttachments({
  enquiryId, projectId,
}: {
  enquiryId: string | null;
  projectId: string | null;
}) {
  const q = useQuery({
    queryKey: ["req-attachments", enquiryId, projectId],
    queryFn: async () => {
      const results: FileRow[] = [];
      if (enquiryId) results.push(...(await listAttachments("enquiry", enquiryId)));
      if (projectId) results.push(...(await listAttachments("project", projectId)));
      // De-dupe by id (a file re-used across entity_type/entity_id keeps its id).
      const seen = new Set<string>();
      return results.filter((f) => (seen.has(f.id) ? false : seen.add(f.id)));
    },
    enabled: !!enquiryId || !!projectId,
  });

  if (!q.data?.length) return null;
  return (
    <Card className="shadow-1">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Customer requirement — {q.data.length} attachment{q.data.length === 1 ? "" : "s"}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {q.data.map((f) => <AttachmentTile key={f.id} file={f} />)}
        </div>
      </CardContent>
    </Card>
  );
}

function AttachmentTile({ file }: { file: FileRow }) {
  const isImage = (file.mime_type ?? "").startsWith("image/");
  return (
    <div className="flex items-center gap-2 rounded-md border border-border p-2">
      {isImage ? <ImageIcon className="h-4 w-4 shrink-0 text-primary" /> : <FileText className="h-4 w-4 shrink-0 text-primary" />}
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium">{file.file_name}</div>
        <Badge variant="outline" className="mt-0.5 text-[10px]">{file.folder}</Badge>
      </div>
      <Button size="icon" variant="ghost" onClick={async () => {
        const url = await signedUrl(file);
        window.open(url, "_blank", "noopener,noreferrer");
      }}>
        <ExternalLink className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

/** Inline preview for images & PDFs; downloads for the rest. */
import { useQuery } from "@tanstack/react-query";
import { FileText, Download, Image as ImageIcon, Loader2 } from "lucide-react";
import { signedUrl, type FileRow } from "@/lib/attachments/api";
import { Button } from "@/components/ui/button";

export function FilePreview({ file }: { file: FileRow }) {
  const isImage = (file.mime_type ?? "").startsWith("image/");
  const isPdf = (file.mime_type ?? "") === "application/pdf";

  const q = useQuery({
    queryKey: ["signed-url", file.id],
    queryFn: () => signedUrl(file, 600),
    staleTime: 5 * 60_000,
  });

  if (q.isLoading) {
    return (
      <div className="flex h-32 items-center justify-center rounded-md border border-border bg-muted/30">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }
  const url = q.data;
  if (!url) return null;

  if (isImage) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block overflow-hidden rounded-md border border-border bg-muted/30"
      >
        <img
          src={url}
          alt={file.file_name}
          loading="lazy"
          className="max-h-72 w-full object-contain"
        />
        <div className="flex items-center gap-2 border-t border-border bg-card px-3 py-2 text-xs text-muted-foreground">
          <ImageIcon className="h-3.5 w-3.5" />
          <span className="truncate">{file.file_name}</span>
        </div>
      </a>
    );
  }

  if (isPdf) {
    return (
      <div className="overflow-hidden rounded-md border border-border">
        <iframe
          src={url}
          title={file.file_name}
          className="h-80 w-full bg-muted/20"
          loading="lazy"
        />
        <div className="flex items-center justify-between border-t border-border bg-card px-3 py-2 text-xs">
          <span className="flex items-center gap-2 truncate text-muted-foreground">
            <FileText className="h-3.5 w-3.5" /> {file.file_name}
          </span>
          <a href={url} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs">
              Open <Download className="h-3 w-3" />
            </Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-muted/40"
    >
      <span className="flex items-center gap-2 truncate">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="truncate">{file.file_name}</span>
      </span>
      <Download className="h-4 w-4 text-muted-foreground" />
    </a>
  );
}

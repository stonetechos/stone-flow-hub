/** Global RFQ browser — every RFQ across every enquiry, filterable + navigable. */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Send, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toUserMessage } from "@/lib/errors";
import { listRfqs, type RfqStatus } from "@/lib/rfqs/api";

const STATUSES: RfqStatus[] = [
  "draft",
  "sent",
  "partially_received",
  "fully_received",
  "closed",
  "cancelled",
];

export const Route = createFileRoute("/_authenticated/rfqs/")({
  ssr: false,
  component: RfqsPage,
  validateSearch: (s: Record<string, unknown>): { status?: string; q?: string } => ({
    status: typeof s.status === "string" ? s.status : undefined,
    q: typeof s.q === "string" ? s.q : undefined,
  }),
});

function RfqsPage() {
  const nav = useNavigate();
  const search = Route.useSearch();
  const [q, setQ] = useState(search.q ?? "");
  const dq = useDebouncedValue(q, 250);
  const status = search.status ?? "";

  const query = useQuery({
    queryKey: ["rfqs", "list", dq, status],
    queryFn: () => listRfqs(dq, status),
  });

  function setStatus(v: string) {
    nav({ to: "/rfqs", search: { status: v || undefined, q: dq || undefined } });
  }
  function commitSearch(v: string) {
    setQ(v);
    nav({ to: "/rfqs", search: { status: status || undefined, q: v || undefined } });
  }

  return (
    <div>
      <PageHeader
        title="RFQs"
        subtitle="Every request-for-quote sent to vendors, across all enquiries."
      />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input
          value={q}
          onChange={(e) => commitSearch(e.target.value)}
          placeholder="Search RFQ no…"
          className="max-w-md"
        />
        <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {query.isLoading ? (
        <SkeletonTable rows={6} columns={6} />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : (query.data ?? []).length === 0 ? (
        <EmptyState
          icon={<Send className="h-6 w-6" />}
          title="No RFQs match"
          message="RFQs are created from an enquiry. Open an enquiry and click Send RFQ."
        />
      ) : (
        <div className="rounded-md border border-border bg-card shadow-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>RFQ No.</TableHead>
                <TableHead>Enquiry</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Responses</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data!.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">
                    <Link
                      to="/rfqs/$rfqId"
                      params={{ rfqId: r.id }}
                      className="text-primary hover:underline"
                    >
                      {r.rfq_no}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {r.enquiry ? (
                      <Link
                        to="/enquiries/$enquiryId"
                        params={{ enquiryId: r.enquiry.id }}
                        className="text-primary hover:underline"
                      >
                        {r.enquiry.enquiry_no}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{r.project?.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {r.status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {r.response_count} / {r.vendor_count}
                  </TableCell>
                  <TableCell>{r.due_date ?? "—"}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => nav({ to: "/rfqs/$rfqId", params: { rfqId: r.id } })}
                      aria-label="Open RFQ"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

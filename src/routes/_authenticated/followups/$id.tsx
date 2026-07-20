/** Follow-up detail — read-only summary with edit/complete/delete + timeline link. */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Pencil, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import { toUserMessage } from "@/lib/errors";
import { completeFollowup, deleteFollowup, getFollowup } from "@/lib/followups/api";
import { invalidateFollowup } from "@/lib/query-invalidation";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/followups/$id")({
  ssr: false,
  component: FollowupDetailPage,
});

function FollowupDetailPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [confirmDel, setConfirmDel] = useState(false);
  const q = useQuery({ queryKey: ["followups", "byId", id], queryFn: () => getFollowup(id) });

  const invalidate = () => {
    if (q.data) {
      invalidateFollowup(qc, {
        enquiryId: q.data.enquiry_id,
        entityType: q.data.entity_type,
        entityId: q.data.entity_id,
      });
    } else {
      invalidateFollowup(qc);
    }
    qc.invalidateQueries({ queryKey: ["followups", "byId", id] });
  };

  const completeMut = useMutation({
    mutationFn: () => completeFollowup({ id }),
    onSuccess: () => {
      toast.success("Follow-up marked done");
      invalidate();
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });
  const delMut = useMutation({
    mutationFn: () => deleteFollowup(id),
    onSuccess: () => {
      toast.success("Follow-up deleted");
      invalidate();
      nav({ to: "/followups" });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  if (q.isLoading) return <LoadingBlock />;
  if (q.error) return <ErrorBlock message={toUserMessage(q.error)} onRetry={() => q.refetch()} />;
  if (!q.data) return <ErrorBlock message="Follow-up not found." />;
  const f = q.data;

  const relatedLink = renderRelatedLink(f);

  return (
    <div>
      <div className="mb-2">
        <Button variant="ghost" size="sm" onClick={() => nav({ to: "/followups" })}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to follow-ups
        </Button>
      </div>
      <PageHeader
        title="Follow-up"
        subtitle={new Date(f.scheduled_at).toLocaleString("en-IN", {
          dateStyle: "full",
          timeStyle: "short",
        })}
        actions={
          <div className="flex items-center gap-2">
            {f.status === "pending" && (
              <Button
                size="sm"
                onClick={() => completeMut.mutate()}
                disabled={completeMut.isPending}
              >
                <Check className="mr-2 h-4 w-4" /> Mark done
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => nav({ to: "/followups", search: { scope: "pending" } })}
            >
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              onClick={() => setConfirmDel(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Status">
              <Badge variant={f.status === "done" ? "secondary" : "outline"} className="capitalize">
                {f.status}
              </Badge>
            </Row>
            <Row label="Channel">
              <span className="capitalize">{f.channel.replace("_", " ")}</span>
            </Row>
            <Row label="Attached to">
              <span className="capitalize">{f.entity_type ?? "enquiry"}</span>
            </Row>
            {relatedLink && <Row label="Related">{relatedLink}</Row>}
            {f.completed_at && (
              <Row label="Completed">{new Date(f.completed_at).toLocaleString("en-IN")}</Row>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground whitespace-pre-wrap">
            {f.notes ?? "—"}
            {f.outcome_notes && (
              <div className="mt-3 border-t border-border pt-3">
                <div className="text-xs font-medium text-foreground mb-1">Outcome</div>
                {f.outcome_notes}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmDel}
        onOpenChange={setConfirmDel}
        title="Delete follow-up?"
        description="This can't be undone."
        busy={delMut.isPending}
        onConfirm={() => delMut.mutate()}
      />
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 shrink-0 text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span>{children}</span>
    </div>
  );
}

function renderRelatedLink(f: {
  entity_type: string | null;
  entity_id: string | null;
  enquiry: { id: string; enquiry_no: string } | null;
  project: { id: string; name: string } | null;
}) {
  if (f.entity_type === "enquiry" && f.enquiry) {
    return (
      <Link
        to="/enquiries/$enquiryId"
        params={{ enquiryId: f.enquiry.id }}
        className="inline-flex items-center gap-1 text-primary hover:underline"
      >
        {f.enquiry.enquiry_no} <ExternalLink className="h-3 w-3" />
      </Link>
    );
  }
  if (f.entity_type === "project" && f.project) {
    return (
      <Link
        to="/projects/$projectId"
        params={{ projectId: f.project.id }}
        className="inline-flex items-center gap-1 text-primary hover:underline"
      >
        {f.project.name} <ExternalLink className="h-3 w-3" />
      </Link>
    );
  }
  if (f.entity_type === "customer" && f.entity_id) {
    return (
      <Link
        to="/customers/$customerId"
        params={{ customerId: f.entity_id }}
        className="inline-flex items-center gap-1 text-primary hover:underline"
      >
        Customer <ExternalLink className="h-3 w-3" />
      </Link>
    );
  }
  if (f.entity_type === "vendor" && f.entity_id) {
    return (
      <Link
        to="/vendors/$vendorId"
        params={{ vendorId: f.entity_id }}
        className="inline-flex items-center gap-1 text-primary hover:underline"
      >
        Vendor <ExternalLink className="h-3 w-3" />
      </Link>
    );
  }
  return null;
}

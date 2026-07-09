import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil, FolderOpen, History, Printer } from "lucide-react";
import { DetailActionBar } from "@/components/entity/DetailActionBar";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorBlock, LoadingBlock } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/entity/StatusPill";
import { AttachmentsPanel, NotesPanel, TimelinePanel } from "@/components/entity/DetailPanels";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { getDispatch } from "@/lib/dispatch/api";
import { GuidedNextStep } from "@/components/guided-workflow/GuidedNextStep";


export const Route = createFileRoute("/_authenticated/dispatch/$id")({
  ssr: false,
  component: DispatchDetailPage,
});

function DispatchDetailPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const query = useQuery({ queryKey: qk.dispatch.byId(id), queryFn: () => getDispatch(id) });

  if (query.isLoading) return <LoadingBlock />;
  if (query.error)
    return <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />;
  if (!query.data) return <ErrorBlock message="Dispatch not found." />;
  const r = query.data;

  return (
    <div>
      <div className="mb-2">
        <Button variant="ghost" size="sm" onClick={() => nav({ to: "/dispatch" })}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>
      <PageHeader
        title={r.dispatch_no}
        subtitle={`Dispatch date ${r.dispatch_date}`}
        actions={
          <DetailActionBar
            pin={{ entityType: "dispatch", entityId: id, label: r.dispatch_no }}
            primary={
              <Button size="sm" onClick={() => nav({ to: "/dispatch/$id/edit", params: { id } })}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Button>
            }
            overflow={[
              {
                label: "Print",
                icon: <Printer className="h-4 w-4" />,
                onSelect: () => window.print(),
              },
              {
                label: "Documents",
                icon: <FolderOpen className="h-4 w-4" />,
                onSelect: () =>
                  document
                    .getElementById("dispatch-documents")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" }),
              },
              {
                label: "Timeline",
                icon: <History className="h-4 w-4" />,
                onSelect: () =>
                  document
                    .getElementById("dispatch-timeline")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" }),
              },
            ]}
          />
        }
      />
      <GuidedNextStep entity="dispatch" entityId={id} />
      <div className="grid gap-4 lg:grid-cols-3">

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Overview</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm md:grid-cols-2">
              <Row label="Status">
                <StatusPill status={r.status} />
              </Row>
              <Row label="Sales order">{r.sales_order?.so_no ?? "—"}</Row>
              <Row label="Carrier">{r.carrier ?? "—"}</Row>
              <Row label="Tracking #">{r.tracking_no ?? "—"}</Row>
            </CardContent>
          </Card>
          <NotesPanel
            table="dispatches"
            id={r.id}
            value={r.notes}
            invalidateKey={qk.dispatch.byId(r.id)}
          />
          <div id="dispatch-documents">
            <AttachmentsPanel entityType="dispatch" entityId={r.id} />
          </div>
        </div>
        <div className="space-y-4" id="dispatch-timeline">
          <TimelinePanel entityType="dispatch" entityId={r.id} />
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

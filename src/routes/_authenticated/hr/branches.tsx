/**
 * Offices & geofences — each branch defines the coordinates and radius used
 * by the attendance engine to decide whether a punch is inside the office.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import { listBranches, upsertBranch, deleteBranch } from "@/lib/hr/api";
import { toUserMessage } from "@/lib/errors";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/hr/branches")({
  head: () => ({
    meta: [
      { title: "Offices & Geofences — Human Resources" },
      { name: "description", content: "Office locations and attendance geofence radius." },
    ],
  }),
  component: BranchesPage,
});

interface Draft {
  name: string;
  code: string;
  city: string;
  latitude: string;
  longitude: string;
  radius: string;
}

const EMPTY: Draft = { name: "", code: "", city: "", latitude: "", longitude: "", radius: "200" };

function BranchesPage() {
  const qc = useQueryClient();
  const roles = useRoles();
  const canWrite = roles.hasAnyRole(["admin", "hr"]);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const branches = useQuery({ queryKey: ["hr", "branches"], queryFn: listBranches });

  const add = useMutation({
    mutationFn: () =>
      upsertBranch({
        name: draft.name,
        code: draft.code || null,
        city: draft.city || null,
        latitude: draft.latitude === "" ? null : Number(draft.latitude),
        longitude: draft.longitude === "" ? null : Number(draft.longitude),
        geofence_radius_m: Number(draft.radius || 200),
        is_active: true,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr", "branches"] });
      setDraft(EMPTY);
      toast.success("Office saved");
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteBranch(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr", "branches"] });
      setPendingDelete(null);
      toast.success("Office removed");
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  function useMyLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("This device can't provide a location.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) =>
        setDraft((d) => ({
          ...d,
          latitude: p.coords.latitude.toFixed(6),
          longitude: p.coords.longitude.toFixed(6),
        })),
      () => toast.error("Location permission denied."),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  return (
    <>
      <PageHeader
        title="Offices & geofences"
        subtitle="Locations employees can clock in from."
        eyebrow="Human Resources"
      />

      <div className="min-w-0 overflow-x-auto">
        {branches.isLoading ? (
          <SkeletonTable />
        ) : branches.isError ? (
          <ErrorBlock message={toUserMessage(branches.error)} />
        ) : (branches.data ?? []).length === 0 ? (
          <EmptyState
            title="No offices yet"
            message="Add an office with coordinates to enable geofenced attendance."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Office</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Coordinates</TableHead>
                <TableHead>Radius</TableHead>
                <TableHead>Status</TableHead>
                {canWrite && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(branches.data ?? []).map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <div className="font-medium">{b.name}</div>
                    {b.code && (
                      <div className="font-mono text-xs text-muted-foreground">{b.code}</div>
                    )}
                  </TableCell>
                  <TableCell>{b.city ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {b.latitude === null || b.longitude === null
                      ? "Not set"
                      : `${Number(b.latitude).toFixed(5)}, ${Number(b.longitude).toFixed(5)}`}
                  </TableCell>
                  <TableCell>{b.geofence_radius_m} m</TableCell>
                  <TableCell>
                    <Badge variant={b.is_active ? "default" : "outline"}>
                      {b.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  {canWrite && (
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setPendingDelete(b.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {canWrite && (
        <div className="mt-6 rounded-md border p-4">
          <h4 className="mb-3 text-sm font-semibold">Add office</h4>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-6">
            <Input
              placeholder="Name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
            <Input
              placeholder="Code"
              value={draft.code}
              onChange={(e) => setDraft({ ...draft, code: e.target.value })}
            />
            <Input
              placeholder="City"
              value={draft.city}
              onChange={(e) => setDraft({ ...draft, city: e.target.value })}
            />
            <Input
              placeholder="Latitude"
              value={draft.latitude}
              onChange={(e) => setDraft({ ...draft, latitude: e.target.value })}
            />
            <Input
              placeholder="Longitude"
              value={draft.longitude}
              onChange={(e) => setDraft({ ...draft, longitude: e.target.value })}
            />
            <Input
              placeholder="Radius (m)"
              value={draft.radius}
              onChange={(e) => setDraft({ ...draft, radius: e.target.value })}
            />
          </div>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <Button size="sm" variant="outline" onClick={useMyLocation}>
              Use my current location
            </Button>
            <Button size="sm" onClick={() => add.mutate()} disabled={!draft.name || add.isPending}>
              <Plus className="mr-1 h-4 w-4" /> Save office
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title="Remove this office?"
        description="Attendance already recorded against it is kept, but employees can no longer select it."
        confirmLabel="Remove"
        busy={del.isPending}
        onConfirm={() => pendingDelete && del.mutate(pendingDelete)}
      />
    </>
  );
}

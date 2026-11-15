import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { autoTranslate } from "@/lib/i18n/auto-translator";
import { transliterateName } from "@/lib/i18n/transliterate";
import {
  Plus,
  Users,
  HardHat,
  Phone,
  MessageCircle,
  Pencil,
  Trash2,
  ExternalLink,
  Sparkles,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
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
import { RowActions } from "@/components/data/RowActions";
import { DataToolbar } from "@/components/data/DataToolbar";
import { DataTableShell } from "@/components/data/DataTableShell";
import { TablePagination } from "@/components/data/Pagination";
import { ColumnsMenu, type ColumnDef } from "@/components/data/ColumnsMenu";
import { DensityMenu } from "@/components/data/DensityMenu";
import { useListPageState } from "@/hooks/use-list-page-state";
import { Can } from "@/hooks/use-roles";
import { toUserMessage } from "@/lib/errors";
import { qk } from "@/lib/query-keys";
import {
  listApplicationPartners,
  deleteAssociatedPartner,
  type AssociatedPerson,
} from "@/lib/partners/directory";
import { PartnerEditDialog } from "@/components/partners/PartnerEditDialog";

export const Route = createFileRoute("/_authenticated/installation-teams/")({
  ssr: false,
  component: ApplicationPartnersPage,
});

type FilterType = "all" | "contractors" | "teams";

function ApplicationPartnersPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const nav = useNavigate();
  const list = useListPageState("application-partners");
  const dq = list.debouncedQuery;

  const [filter, setFilter] = useState<FilterType>("all");
  const [editing, setEditing] = useState<AssociatedPerson | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<AssociatedPerson | null>(null);
  const { prefs, setDensity, toggleColumn, isHidden } = list;

  const columnDefs: ColumnDef[] = useMemo(
    () => [
      { key: "code", label: t("common.code", "Code"), required: true },
      {
        key: "name",
        label: t("installationTeams.columns.partner", "Application Partner / Firm"),
        required: true,
      },
      { key: "contact", label: t("installationTeams.columns.supervisor", "Master / Supervisor") },
      { key: "phone", label: t("installationTeams.columns.contact", "Contact Number") },
      { key: "city", label: t("installationTeams.columns.city", "City / Base") },
      { key: "type", label: t("common.type", "Type") },
      { key: "skills", label: t("installationTeams.columns.specializations", "Specializations") },
      { key: "capacity", label: t("installationTeams.columns.dailyOutput", "Daily Output") },
      { key: "status", label: t("common.status", "Status") },
    ],
    [t],
  );

  const query = useQuery({
    queryKey: ["application-partners", dq],
    queryFn: () => listApplicationPartners(dq),
  });

  const del = useMutation({
    mutationFn: (person: AssociatedPerson) => deleteAssociatedPartner(person),
    onSuccess: () => {
      toast.success("Application partner removed");
      qc.invalidateQueries({ queryKey: ["application-partners"] });
      qc.invalidateQueries({ queryKey: ["work-and-supply-directory"] });
      qc.invalidateQueries({ queryKey: qk.installationTeams.all });
      qc.invalidateQueries({ queryKey: qk.installationAgencies.list() });
      qc.invalidateQueries({ queryKey: qk.vendors.all });
      setToDelete(null);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const rawRows = query.data ?? [];

  const filteredRows = useMemo(() => {
    if (filter === "all") return rawRows;
    if (filter === "contractors") {
      return rawRows.filter(
        (r) => r.sourceType === "vendor" || r.sourceType === "installation_agency",
      );
    }
    if (filter === "teams") {
      return rawRows.filter((r) => r.sourceType === "installation_team");
    }
    return rawRows;
  }, [rawRows, filter]);

  const pageRows = list.paginate(filteredRows);

  const teamCount = rawRows.filter((r) => r.sourceType === "installation_team").length;
  const agencyCount = rawRows.length - teamCount;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Application Partners"
        subtitle="Registered installation masters, dry cladding contractors, supervisors, and site execution teams."
      />

      {/* Segmented Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
            filter === "all"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <HardHat className="h-3.5 w-3.5" /> {autoTranslate(`All Partners (${rawRows.length})`)}
        </button>

        <button
          type="button"
          onClick={() => setFilter("contractors")}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
            filter === "contractors"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />{" "}
          {autoTranslate(`Contractors & Agencies (${agencyCount})`)}
        </button>

        <button
          type="button"
          onClick={() => setFilter("teams")}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
            filter === "teams"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Users className="h-3.5 w-3.5" /> {autoTranslate(`Site Execution Teams (${teamCount})`)}
        </button>
      </div>

      <DataToolbar
        count={filteredRows.length}
        search={list.query}
        onSearchChange={list.setQuery}
        searchPlaceholder="Search by firm name, supervisor, phone, skill, or city…"
        columns={<ColumnsMenu columns={columnDefs} isHidden={isHidden} onToggle={toggleColumn} />}
        density={<DensityMenu density={prefs.density} onChange={setDensity} />}
        extra={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => nav({ to: "/installations" })}
            >
              <Layers className="h-3.5 w-3.5 mr-1" /> Installations
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => nav({ to: "/installation-ledger" })}
            >
              Partner Ledgers
            </Button>
          </div>
        }
        action={
          <Can anyRole={["admin", "sales_manager"]}>
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setEditDialogOpen(true);
              }}
            >
              <Plus className="mr-1 h-4 w-4" /> Add Application Partner
            </Button>
          </Can>
        }
      />

      {query.isLoading ? (
        <SkeletonTable rows={6} columns={8} />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : !filteredRows.length ? (
        <EmptyState
          icon={<HardHat className="h-7 w-7 text-muted-foreground" />}
          title="No application partners found"
          message={
            list.query
              ? `No application partners matching "${list.query}".`
              : "Add your stone fixing contractors, dry cladding agencies, and installation teams."
          }
          action={
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setEditDialogOpen(true);
              }}
            >
              <Plus className="mr-1 h-4 w-4" /> Add Application Partner
            </Button>
          }
        />
      ) : (
        <DataTableShell
          density={prefs.density}
          footer={<TablePagination {...list.paginationProps(filteredRows.length)} />}
        >
          <Table>
            <TableHeader>
              <TableRow>
                {!isHidden("code") && (
                  <TableHead className="w-24">{t("common.code", "Code")}</TableHead>
                )}
                {!isHidden("name") && (
                  <TableHead>
                    {t("installationTeams.columns.partner", "Application Partner / Firm")}
                  </TableHead>
                )}
                {!isHidden("contact") && (
                  <TableHead>
                    {t("installationTeams.columns.supervisor", "Master / Supervisor")}
                  </TableHead>
                )}
                {!isHidden("phone") && (
                  <TableHead>{t("installationTeams.columns.contact", "Contact Number")}</TableHead>
                )}
                {!isHidden("city") && (
                  <TableHead>{t("installationTeams.columns.city", "City / Base")}</TableHead>
                )}
                {!isHidden("type") && <TableHead>{t("common.type", "Type")}</TableHead>}
                {!isHidden("skills") && (
                  <TableHead>
                    {t("installationTeams.columns.specializations", "Specializations")}
                  </TableHead>
                )}
                {!isHidden("capacity") && (
                  <TableHead>
                    {t("installationTeams.columns.dailyOutput", "Daily Output")}
                  </TableHead>
                )}
                {!isHidden("status") && (
                  <TableHead className="w-20">{t("common.status", "Status")}</TableHead>
                )}
                <TableHead className="w-16 text-right">{t("common.actions", "Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((p) => {
                const phoneDigits = p.phone ? p.phone.replace(/\D/g, "") : "";
                const cleanPhone = phoneDigits.length >= 10 ? phoneDigits.slice(-10) : "";

                return (
                  <TableRow key={`${p.sourceType}-${p.id}`}>
                    {!isHidden("code") && (
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {p.code}
                      </TableCell>
                    )}

                    {!isHidden("name") && (
                      <TableCell>
                        <div className="font-medium text-foreground">
                          {transliterateName(p.name, i18n.language)}
                        </div>
                        {p.notes && (
                          <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                            {autoTranslate(p.notes, i18n.language)}
                          </div>
                        )}
                      </TableCell>
                    )}

                    {!isHidden("contact") && (
                      <TableCell>
                        <span className="text-sm font-medium">
                          {p.contactPerson
                            ? transliterateName(p.contactPerson, i18n.language)
                            : "—"}
                        </span>
                      </TableCell>
                    )}

                    {!isHidden("phone") && (
                      <TableCell>
                        {cleanPhone ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs">{cleanPhone}</span>
                            <a
                              href={`tel:+91${cleanPhone}`}
                              className="text-muted-foreground hover:text-primary transition-colors p-1"
                              title="Call"
                            >
                              <Phone className="h-3 w-3" />
                            </a>
                            <a
                              href={`https://wa.me/91${cleanPhone}?text=Hello%20${encodeURIComponent(
                                p.contactPerson || p.name,
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-600 hover:text-emerald-700 transition-colors p-1"
                              title="WhatsApp"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No phone</span>
                        )}
                      </TableCell>
                    )}

                    {!isHidden("city") && (
                      <TableCell className="text-xs text-muted-foreground">
                        {autoTranslate(p.city, i18n.language)}
                      </TableCell>
                    )}

                    {!isHidden("type") && (
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            p.sourceType === "installation_team"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : p.sourceType === "vendor"
                                ? "bg-purple-50 text-purple-800 border-purple-200"
                                : "bg-blue-50 text-blue-800 border-blue-200"
                          }
                        >
                          {p.sourceType === "installation_team"
                            ? autoTranslate("Site Team", i18n.language)
                            : p.sourceType === "vendor"
                              ? autoTranslate("Vendor Partner", i18n.language)
                              : autoTranslate("Contract Agency", i18n.language)}
                        </Badge>
                      </TableCell>
                    )}

                    {!isHidden("skills") && (
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[240px]">
                          {p.skills.slice(0, 3).map((sk) => (
                            <span
                              key={sk}
                              className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                            >
                              {autoTranslate(sk, i18n.language)}
                            </span>
                          ))}
                          {p.skills.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{p.skills.length - 3}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    )}

                    {!isHidden("capacity") && (
                      <TableCell className="text-xs text-muted-foreground">
                        {p.capacity ? `${p.capacity} sqft/day` : p.vehicle ? p.vehicle : "—"}
                      </TableCell>
                    )}

                    {!isHidden("status") && (
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            p.isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {p.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    )}

                    <TableCell className="text-right">
                      <RowActions
                        onEdit={() => {
                          setEditing(p);
                          setEditDialogOpen(true);
                        }}
                        onDelete={() => setToDelete(p)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DataTableShell>
      )}

      {/* Reusable Customer-Style Partner Edit & Create Dialog */}
      <PartnerEditDialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setEditing(null);
        }}
        editing={editing}
        partnerType="application_partner"
      />

      {/* Delete / Remove Confirmation */}
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Remove Application Partner "${toDelete?.name ?? ""}"?`}
        description="Are you sure you want to remove this partner from application records?"
        onConfirm={() => toDelete && del.mutate(toDelete)}
        confirmLabel="Remove Partner"
      />
    </div>
  );
}

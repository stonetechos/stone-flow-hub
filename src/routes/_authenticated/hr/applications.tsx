import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase,
  Search,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Banknote,
  Send,
  FileText,
  CheckCircle2,
  XCircle,
  Eye,
  Star,
  ExternalLink,
  Trash2,
  UserCheck,
  Building2,
  Filter,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  listJobApplications,
  updateJobApplication,
  deleteJobApplication,
  type JobApplicationRow,
} from "@/lib/careers/api";
import {
  APPLICATION_STATUS_CONFIG,
  type JobApplicationStatus,
  ACTIVE_JOB_POSTINGS,
} from "@/lib/careers/types";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/hr/applications")({
  head: () => ({
    meta: [
      { title: "Job Applications & Recruitment — STOS" },
      {
        name: "description",
        content: "Review and manage candidate applications for active job postings.",
      },
    ],
  }),
  component: JobApplicationsPage,
});

function JobApplicationsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedApp, setSelectedApp] = useState<JobApplicationRow | null>(null);

  // Queries
  const {
    data: applications = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["hr", "job-applications", statusFilter, roleFilter, search],
    queryFn: () =>
      listJobApplications({
        status: statusFilter,
        job_id: roleFilter,
        search,
      }),
  });

  // Mutations
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: {
        status?: JobApplicationStatus;
        interview_date?: string | null;
        interview_notes?: string | null;
        rating?: number | null;
      };
    }) => updateJobApplication(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr", "job-applications"] });
      toast.success("Candidate record updated");
      refetch();
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to update record");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteJobApplication(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr", "job-applications"] });
      toast.success("Application deleted");
      setSelectedApp(null);
      refetch();
    },
  });

  // Metrics
  const totalCount = applications.length;
  const newCount = applications.filter((a) => a.status === "new").length;
  const interviewingCount = applications.filter(
    (a) => a.status === "interview_scheduled" || a.status === "shortlisted",
  ).length;
  const hiredCount = applications.filter((a) => a.status === "hired").length;

  const openWhatsApp = (app: JobApplicationRow) => {
    const rawDigits = app.phone.replace(/\D/g, "");
    const phoneNo = rawDigits.startsWith("91") ? rawDigits : `91${rawDigits}`;
    const text = encodeURIComponent(
      `Hi ${app.full_name}, this is the HR team from Stone Tech (Gota, Ahmedabad). We received your application for the "${app.job_title}" role (Ref: ${app.application_no}). We would like to schedule a brief interaction. Are you available for a quick discussion today?`,
    );
    window.open(`https://api.whatsapp.com/send?phone=${phoneNo}&text=${text}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recruitment & Job Applications"
        subtitle="Review incoming candidate applications from the careers page, Facebook, Instagram, and WhatsApp."
        eyebrow="Human Resources"
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <a href="/careers" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1 h-3.5 w-3.5" /> View Public Careers Page
              </a>
            </Button>
          </div>
        }
      />

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 border-border/80 bg-card">
          <div className="text-xs font-semibold text-muted-foreground">Total Applicants</div>
          <div className="text-2xl font-bold text-foreground mt-1">{totalCount}</div>
        </Card>
        <Card className="p-4 border-border/80 bg-blue-500/5 border-blue-500/20">
          <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
            New / Unreviewed
          </div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{newCount}</div>
        </Card>
        <Card className="p-4 border-border/80 bg-purple-500/5 border-purple-500/20">
          <div className="text-xs font-semibold text-purple-600 dark:text-purple-400">
            Shortlisted / Interviewing
          </div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
            {interviewingCount}
          </div>
        </Card>
        <Card className="p-4 border-border/80 bg-emerald-500/5 border-emerald-500/20">
          <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Hired</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {hiredCount}
          </div>
        </Card>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidate by name, phone, area, role..."
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="h-9 text-xs w-[180px]">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All Positions
              </SelectItem>
              {ACTIVE_JOB_POSTINGS.map((j) => (
                <SelectItem key={j.id} value={j.id} className="text-xs">
                  {j.shortTitle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 text-xs w-[160px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All Statuses
              </SelectItem>
              {Object.entries(APPLICATION_STATUS_CONFIG).map(([k, cfg]) => (
                <SelectItem key={k} value={k} className="text-xs">
                  {cfg.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Applications List */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-muted-foreground">
          Loading applications...
        </div>
      ) : applications.length === 0 ? (
        <Card className="p-12 text-center space-y-3 border-dashed border-border">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted/40 text-muted-foreground">
            <Briefcase className="h-6 w-6" />
          </div>
          <div className="text-sm font-semibold text-foreground">No Applications Found</div>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {search || statusFilter !== "all" || roleFilter !== "all"
              ? "No candidate applications match the selected filter criteria."
              : "No candidates have applied yet. Share the job posting links on WhatsApp, Facebook, or Instagram to attract applicants."}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => {
            const statusCfg =
              APPLICATION_STATUS_CONFIG[app.status as JobApplicationStatus] ||
              APPLICATION_STATUS_CONFIG.new;

            return (
              <div
                key={app.id}
                onClick={() => setSelectedApp(app)}
                className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer group space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm sm:text-base font-bold text-foreground group-hover:text-primary transition-colors">
                        {app.full_name}
                      </h4>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold ${statusCfg.badgeClass}`}
                      >
                        {statusCfg.label}
                      </Badge>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {app.application_no}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-primary">{app.job_title}</div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        openWhatsApp(app);
                      }}
                      className="h-8 text-xs gap-1 border-border text-[#25D366] hover:text-[#1EBE5D]"
                      title="Send WhatsApp message"
                    >
                      <Send className="h-3.5 w-3.5" /> WhatsApp
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                      onClick={(e) => e.stopPropagation()}
                      className="h-8 text-xs gap-1 border-border"
                    >
                      <a href={`tel:${app.phone}`}>
                        <Phone className="h-3.5 w-3.5 text-primary" /> Call
                      </a>
                    </Button>
                  </div>
                </div>

                {/* Candidate Summary Chips */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3 text-emerald-500" /> {app.phone}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-rose-500" />
                    {app.current_area || "Ahmedabad"} ({app.current_city})
                  </span>
                  <span>
                    Exp:{" "}
                    <strong className="text-foreground">{app.total_experience || "Fresher"}</strong>
                  </span>
                  <span>
                    Expected: <strong className="text-foreground">₹{app.expected_salary}/mo</strong>
                  </span>
                  <span>
                    Notice:{" "}
                    <strong className="text-foreground">{app.notice_period || "Immediate"}</strong>
                  </span>

                  {app.has_two_wheeler && (
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                    >
                      Own 2-Wheeler
                    </Badge>
                  )}

                  {app.resume_url && (
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20 flex items-center gap-1"
                    >
                      <FileText className="h-2.5 w-2.5" /> Resume Attached
                    </Badge>
                  )}

                  <span className="ml-auto text-[11px] text-muted-foreground/70">
                    Applied: {new Date(app.created_at).toLocaleDateString()}
                  </span>
                </div>

                {app.interview_notes && (
                  <div className="p-2 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground">
                    <strong className="text-foreground">Interview Notes:</strong>{" "}
                    {app.interview_notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Candidate Application Detail Dialog */}
      {selectedApp && (
        <Dialog open={Boolean(selectedApp)} onOpenChange={(o) => !o && setSelectedApp(null)}>
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto space-y-4">
            <DialogHeader className="border-b border-border/70 pb-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <DialogTitle className="text-lg font-bold text-foreground">
                    {selectedApp.full_name}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Applied for {selectedApp.job_title} · Ref: {selectedApp.application_no}
                  </DialogDescription>
                </div>
                <Badge
                  variant="outline"
                  className={`text-xs font-bold ${
                    APPLICATION_STATUS_CONFIG[selectedApp.status as JobApplicationStatus]
                      ?.badgeClass || ""
                  }`}
                >
                  {APPLICATION_STATUS_CONFIG[selectedApp.status as JobApplicationStatus]?.label ||
                    selectedApp.status}
                </Badge>
              </div>
            </DialogHeader>

            <div className="space-y-4 text-xs text-muted-foreground">
              {/* Contact & Location Strip */}
              <div className="p-3.5 rounded-xl border border-border bg-muted/20 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[11px] text-muted-foreground">Mobile:</span>
                  <div className="font-bold text-foreground">{selectedApp.phone}</div>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground">WhatsApp:</span>
                  <div className="font-bold text-foreground">
                    {selectedApp.whatsapp || selectedApp.phone}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground">Locality:</span>
                  <div className="font-bold text-foreground">
                    {selectedApp.current_area || "—"}, {selectedApp.current_city}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground">Email:</span>
                  <div className="font-bold text-foreground">
                    {selectedApp.email || "Not provided"}
                  </div>
                </div>
              </div>

              {/* Professional Profile */}
              <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl border border-border bg-card">
                <div>
                  <div className="text-[11px]">Experience:</div>
                  <div className="font-bold text-foreground">
                    {selectedApp.total_experience || "Fresher"}
                  </div>
                </div>
                <div>
                  <div className="text-[11px]">Expected Salary:</div>
                  <div className="font-bold text-foreground">
                    ₹{selectedApp.expected_salary || "—"}/mo
                  </div>
                </div>
                <div>
                  <div className="text-[11px]">Joining / Notice:</div>
                  <div className="font-bold text-foreground">
                    {selectedApp.notice_period || "Immediate"}
                  </div>
                </div>
                <div>
                  <div className="text-[11px]">Qualification:</div>
                  <div className="font-bold text-foreground">
                    {selectedApp.highest_qualification || "Graduate"}
                  </div>
                </div>
                <div>
                  <div className="text-[11px]">2-Wheeler:</div>
                  <div className="font-bold text-foreground">
                    {selectedApp.has_two_wheeler ? "Yes (Available)" : "No"}
                  </div>
                </div>
                <div>
                  <div className="text-[11px]">Driving License:</div>
                  <div className="font-bold text-foreground">
                    {selectedApp.has_driving_license ? "Yes (Valid)" : "No"}
                  </div>
                </div>
              </div>

              {/* AI & Computer Tools */}
              {selectedApp.ai_tools_experience && (
                <div className="p-3 rounded-xl border border-border bg-background space-y-1">
                  <div className="font-bold text-foreground text-xs">
                    AI Tools &amp; Computer Proficiency:
                  </div>
                  <p className="text-foreground/90">{selectedApp.ai_tools_experience}</p>
                </div>
              )}

              {/* Cover Note */}
              {selectedApp.cover_note && (
                <div className="p-3 rounded-xl border border-border bg-background space-y-1">
                  <div className="font-bold text-foreground text-xs">
                    Candidate Self-Introduction:
                  </div>
                  <p className="text-foreground/90 whitespace-pre-line">{selectedApp.cover_note}</p>
                </div>
              )}

              {/* Resume / CV Link */}
              {selectedApp.resume_url ? (
                <div className="p-3 rounded-xl border border-border bg-blue-500/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-foreground text-xs">
                      {selectedApp.resume_file_name || "Candidate_Resume"}
                    </span>
                  </div>
                  <Button asChild size="sm" variant="outline" className="text-xs h-8">
                    <a href={selectedApp.resume_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5 mr-1" /> View Resume
                    </a>
                  </Button>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground italic">
                  No resume file was attached.
                </div>
              )}

              {/* Status & HR Review Section */}
              <div className="space-y-3 pt-2 border-t border-border/80">
                <div className="font-bold text-foreground text-xs uppercase tracking-wider">
                  HR Review &amp; Interview Management
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Update Hiring Stage</Label>
                    <Select
                      value={selectedApp.status}
                      onValueChange={(val) => {
                        updateMutation.mutate({
                          id: selectedApp.id,
                          patch: { status: val as JobApplicationStatus },
                        });
                        setSelectedApp((prev) => (prev ? { ...prev, status: val } : null));
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(APPLICATION_STATUS_CONFIG).map(([k, cfg]) => (
                          <SelectItem key={k} value={k} className="text-xs">
                            {cfg.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Candidate Rating</Label>
                    <Select
                      value={String(selectedApp.rating || "0")}
                      onValueChange={(val) => {
                        const num = Number(val);
                        updateMutation.mutate({
                          id: selectedApp.id,
                          patch: { rating: num > 0 ? num : null },
                        });
                        setSelectedApp((prev) =>
                          prev ? { ...prev, rating: num > 0 ? num : null } : null,
                        );
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Rating" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0" className="text-xs">
                          No rating
                        </SelectItem>
                        <SelectItem value="5" className="text-xs">
                          ★★★★★ Exceptional (5/5)
                        </SelectItem>
                        <SelectItem value="4" className="text-xs">
                          ★★★★☆ Strong Fit (4/5)
                        </SelectItem>
                        <SelectItem value="3" className="text-xs">
                          ★★★☆☆ Average Fit (3/5)
                        </SelectItem>
                        <SelectItem value="2" className="text-xs">
                          ★★☆☆☆ Below Expectation (2/5)
                        </SelectItem>
                        <SelectItem value="1" className="text-xs">
                          ★☆☆☆☆ Not Qualified (1/5)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Interview Notes / Evaluation</Label>
                  <Textarea
                    defaultValue={selectedApp.interview_notes || ""}
                    placeholder="Add interview feedback, test task evaluation, or reasons for hiring..."
                    rows={2}
                    className="text-xs resize-none"
                    onBlur={(e) => {
                      if (e.target.value !== (selectedApp.interview_notes || "")) {
                        updateMutation.mutate({
                          id: selectedApp.id,
                          patch: { interview_notes: e.target.value },
                        });
                        setSelectedApp((prev) =>
                          prev ? { ...prev, interview_notes: e.target.value } : null,
                        );
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border/80">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this application?")) {
                    deleteMutation.mutate(selectedApp.id);
                  }
                }}
                className="text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openWhatsApp(selectedApp)}
                  className="h-8 text-xs gap-1 border-border text-[#25D366]"
                >
                  <Send className="h-3.5 w-3.5" /> WhatsApp Candidate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="h-8 text-xs gap-1 border-border"
                >
                  <a href={`tel:${selectedApp.phone}`}>
                    <Phone className="h-3.5 w-3.5 text-primary" /> Call
                  </a>
                </Button>
                <Button size="sm" onClick={() => setSelectedApp(null)} className="h-8 text-xs">
                  Done
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

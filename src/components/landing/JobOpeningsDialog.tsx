import { useState } from "react";
import {
  Briefcase,
  MapPin,
  Clock,
  Send,
  Sparkles,
  ChevronRight,
  GraduationCap,
  Banknote,
  Share2,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ACTIVE_JOB_POSTINGS, type JobPosting } from "@/lib/careers/types";
import { JobApplicationForm } from "@/components/careers/JobApplicationForm";
import { Link } from "@tanstack/react-router";

interface JobOpeningsDialogProps {
  trigger?: React.ReactNode;
}

export function JobOpeningsDialog({ trigger }: JobOpeningsDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<JobPosting | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const applyViaWhatsApp = (job: JobPosting) => {
    const text = encodeURIComponent(
      `Hi Stone Tech HR, I am interested in applying for the "${job.shortTitle}" position in Gota, Ahmedabad. Here is my profile/resume:`,
    );
    window.open(`https://api.whatsapp.com/send?phone=917742090866&text=${text}`, "_blank");
  };

  const shareJob = (job: JobPosting) => {
    if (navigator.share) {
      navigator
        .share({
          title: job.title,
          text: job.whatsappShareText,
          url: `https://stonetech.in/careers?role=${job.slug}&source=share`,
        })
        .catch(() => {});
    } else {
      window.open(
        `https://api.whatsapp.com/send?text=${encodeURIComponent(job.whatsappShareText)}`,
        "_blank",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <button className="hover:text-primary transition-colors cursor-pointer flex items-center gap-1.5 text-sm font-semibold text-foreground/80 py-1 whitespace-nowrap">
            <Briefcase className="h-4 w-4 text-primary" />
            <span>Job Openings</span>
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader className="space-y-1.5 border-b border-border/70 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  Careers &amp; Job Openings
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Stone Tech Architectural Stone Atelier — Gota, Ahmedabad
                </DialogDescription>
              </div>
            </div>

            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex text-xs gap-1"
            >
              <Link to="/careers" onClick={() => setOpen(false)}>
                Full Careers Page <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isApplying ? (
            <div className="space-y-4 animate-in fade-in-50 duration-200">
              <button
                type="button"
                onClick={() => setIsApplying(false)}
                className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to job overview
              </button>

              <div className="p-4 rounded-xl border border-border bg-card">
                <h3 className="text-sm font-bold text-foreground mb-3">
                  Direct Application for {selectedRole?.shortTitle || "Position"}
                </h3>
                <JobApplicationForm
                  initialJob={selectedRole}
                  onSuccess={() => {}}
                  onCancel={() => setIsApplying(false)}
                  source="homepage_dialog"
                />
              </div>
            </div>
          ) : selectedRole ? (
            <div className="space-y-4 animate-in fade-in-50 duration-200">
              <button
                type="button"
                onClick={() => setSelectedRole(null)}
                className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to all openings
              </button>

              <div className="p-4 rounded-xl border border-border bg-card space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-foreground">{selectedRole.title}</h3>
                  <Badge
                    variant="outline"
                    className="text-xs font-semibold bg-primary/10 text-primary border-primary/20"
                  >
                    {selectedRole.department}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg border border-border/80">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-rose-500" />
                    {selectedRole.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-blue-500" />
                    {selectedRole.timing} ({selectedRole.days})
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-foreground">
                    <Banknote className="h-3.5 w-3.5 text-emerald-500" />
                    {selectedRole.salaryText}
                  </span>
                  <span className="flex items-center gap-1">
                    <GraduationCap className="h-3.5 w-3.5 text-amber-500" />
                    Exp: {selectedRole.experience}
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="font-bold text-foreground uppercase tracking-wider text-[11px]">
                    Primary Objective / KRA:
                  </div>
                  <p className="text-muted-foreground leading-relaxed p-2.5 rounded-lg border border-primary/10 bg-primary/5">
                    {selectedRole.primaryKra}
                  </p>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="text-xs font-bold text-foreground uppercase tracking-wider text-[11px]">
                    Key Responsibilities:
                  </div>
                  <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
                    {selectedRole.kras.map((kra, i) => (
                      <li key={i} className="leading-relaxed">
                        <strong className="text-foreground">{kra.title}:</strong> {kra.description}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-1.5 pt-1 border-t border-border/60">
                  <div className="text-xs font-bold text-foreground uppercase tracking-wider text-[11px]">
                    Required Skills &amp; Qualifications:
                  </div>
                  <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
                    {selectedRole.requiredSkills.map((skill, i) => (
                      <li key={i} className="leading-relaxed">
                        {skill}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                <Button
                  onClick={() => setIsApplying(true)}
                  className="w-full sm:flex-1 h-10 text-xs font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Send className="h-3.5 w-3.5" /> Apply Directly Online
                </Button>
                <Button
                  onClick={() => applyViaWhatsApp(selectedRole)}
                  className="w-full sm:w-auto h-10 text-xs font-bold gap-1.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white px-4"
                >
                  <Send className="h-3.5 w-3.5" /> WhatsApp HR
                </Button>
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => shareJob(selectedRole)}
                  className="w-full sm:w-auto h-10 text-xs font-semibold gap-1.5 border-border"
                >
                  <Share2 className="h-3.5 w-3.5" /> Share
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground px-0.5">
                <span>Active Positions ({ACTIVE_JOB_POSTINGS.length})</span>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  Actively Hiring in Gota, Ahmedabad
                </span>
              </div>

              <div className="space-y-3">
                {ACTIVE_JOB_POSTINGS.map((role) => (
                  <div
                    key={role.id}
                    onClick={() => setSelectedRole(role)}
                    className="p-4 rounded-xl border border-border/90 bg-card hover:border-primary/60 hover:bg-muted/30 transition-all cursor-pointer group space-y-2.5 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge className="text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                            Urgent Hiring
                          </Badge>
                          <span className="text-xs text-muted-foreground">{role.department}</span>
                        </div>
                        <h4 className="text-sm sm:text-base font-bold text-foreground group-hover:text-primary transition-colors mt-1">
                          {role.title}
                        </h4>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-rose-500" />
                        {role.location}
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-foreground">
                        <Banknote className="h-3 w-3 text-emerald-500" />
                        {role.salaryText}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-blue-500" />
                        {role.timing}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {role.summary}
                    </p>

                    <div className="pt-1 flex items-center justify-between text-xs border-t border-border/50">
                      <span className="font-semibold text-primary">
                        View KRAs, KPAs &amp; Apply
                      </span>
                      <span className="text-muted-foreground text-[11px] group-hover:text-foreground">
                        Click to view →
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Share & Direct Links Banner */}
              <div className="p-3.5 rounded-xl border border-dashed border-border bg-muted/20 space-y-2 mt-4 text-center">
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>Looking for other opportunities or sharing with friends?</span>
                </div>
                <p className="text-[11px] text-muted-foreground max-w-md mx-auto">
                  You can share these openings directly on WhatsApp, Facebook, or Instagram. All
                  links lead directly to the application form.
                </p>
                <div className="pt-1 flex items-center justify-center gap-3">
                  <Link
                    to="/careers"
                    onClick={() => setOpen(false)}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    Open Shareable Careers Page <ExternalLink className="h-3 w-3" />
                  </Link>
                  <span className="text-muted-foreground/40">|</span>
                  <a
                    href="https://api.whatsapp.com/send?phone=917742090866&text=Hi%20Stone%20Tech%20HR,%20I%20am%20sharing%20my%20resume%20for%20future%20openings."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <Send className="h-3 w-3" /> WhatsApp HR
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

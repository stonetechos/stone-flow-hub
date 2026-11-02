import { useState } from "react";
import {
  Briefcase,
  MapPin,
  Clock,
  Banknote,
  CheckCircle2,
  Send,
  Share2,
  ExternalLink,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ACTIVE_JOB_POSTINGS, type JobPosting } from "@/lib/careers/types";
import { JobApplicationForm } from "@/components/careers/JobApplicationForm";
import { Link } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export function CareersLandingSection() {
  const [selectedJobForModal, setSelectedJobForModal] = useState<JobPosting | null>(null);
  const [showPosterPreview, setShowPosterPreview] = useState(false);

  const applyViaWhatsApp = (job: JobPosting) => {
    const text = encodeURIComponent(
      `Hi Stone Tech HR, I would like to apply for the "${job.shortTitle}" position in Gota, Ahmedabad. Here is my profile:`,
    );
    window.open(`https://api.whatsapp.com/send?phone=917742090866&text=${text}`, "_blank");
  };

  const shareJob = (job: JobPosting) => {
    const shareUrl = `https://stonetech.in/careers?role=${job.slug}&source=share`;
    if (navigator.share) {
      navigator
        .share({
          title: job.title,
          text: job.whatsappShareText,
          url: shareUrl,
        })
        .catch(() => {});
    } else {
      navigator.clipboard?.writeText(shareUrl);
      toast.success("Job link copied to clipboard!");
    }
  };

  return (
    <section
      id="careers"
      className="scroll-mt-20 py-16 sm:py-20 bg-gradient-to-b from-muted/30 via-background to-muted/20 border-t border-border/80"
    >
      {/* Hidden anchor for #job-openings compatibility */}
      <span id="job-openings" className="scroll-mt-24 block -mt-24 pt-24" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="flex justify-center mb-1">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-card border border-border/80 shadow-sm">
              <img
                src="/branding/stone-tech-logo.png"
                alt="Stone Tech Logo"
                className="h-8 w-8 object-contain"
              />
              <div className="text-left">
                <div className="font-extrabold text-xs tracking-wider text-foreground">
                  STONE TECH
                </div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none">
                  Architectural Stone Atelier
                </div>
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Briefcase className="h-3.5 w-3.5" />
            <span>We Are Actively Hiring in Ahmedabad</span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
            Join Our Team at <span className="text-primary">Stone Tech</span>
          </h2>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Be part of Gujarat's premier architectural stone atelier. We are looking for dependable,
            enthusiastic talent to join our Gota studio and field operations with rewarding growth
            and performance incentives.
          </p>

          {/* Quick Flyer & Share Actions Bar */}
          <div className="pt-2 flex items-center justify-center gap-2.5 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              className="text-xs font-semibold gap-1.5 shadow-sm border-primary/30 text-primary hover:bg-primary/5"
              onClick={() => setShowPosterPreview(true)}
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>View Hiring Story Flyer</span>
            </Button>

            <a
              href="/branding/hiring-story-flyer.png"
              download="Stone-Tech-Hiring-Flyer.png"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md border border-border bg-card hover:bg-muted/40 transition-colors text-foreground"
            >
              <span>Download Flyer Image</span>
            </a>
          </div>
        </div>

        {/* 2 Active Job Cards Grid */}
        <div className="mt-10 sm:mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {ACTIVE_JOB_POSTINGS.map((job) => (
            <Card
              key={job.id}
              className="border-border/90 bg-card hover:border-primary/50 shadow-md hover:shadow-xl transition-all duration-200 flex flex-col justify-between overflow-hidden group"
            >
              <div>
                {/* Card Top Pill & Title */}
                <CardHeader className="p-5 sm:p-6 pb-4 border-b border-border/60 bg-muted/10 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <Badge variant="outline" className="bg-background text-xs font-medium">
                      {job.department}
                    </Badge>
                    <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold">
                      Immediate Opening
                    </Badge>
                  </div>

                  <div>
                    <CardTitle className="text-lg sm:text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                      {job.title}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {job.summary}
                    </p>
                  </div>

                  {/* Highlights Strip: Location, Salary, Timing */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-border/50 text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                      <span className="truncate">{job.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400">
                      <Banknote className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{job.salaryText}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span className="truncate">{job.timing} (Mon–Sat)</span>
                    </div>
                  </div>
                </CardHeader>

                {/* Key Result Areas & Requirements */}
                <CardContent className="p-5 sm:p-6 space-y-4">
                  {/* Primary KRAs */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Key Responsibilities (KRA):
                    </h4>
                    <ul className="space-y-1.5 text-xs text-foreground/90">
                      {job.kras.slice(0, 3).map((kra, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                          <span>
                            <strong>{kra.title}:</strong> {kra.description}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Mandatory Skills */}
                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Skills &amp; Requirements:
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {job.requiredSkills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-muted/60 text-foreground border border-border/70"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </div>

              {/* Card Footer Actions */}
              <div className="p-5 sm:p-6 pt-3 bg-muted/20 border-t border-border/60 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="font-bold text-xs gap-1.5 shadow-sm"
                    onClick={() => setSelectedJobForModal(job)}
                  >
                    <span>Apply Online</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 border-emerald-200 dark:border-emerald-800 gap-1.5"
                    onClick={() => applyViaWhatsApp(job)}
                  >
                    <Send className="h-3 w-3" />
                    <span>WhatsApp HR</span>
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-muted-foreground hover:text-foreground gap-1"
                    onClick={() => shareJob(job)}
                    title="Share job opening"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Share</span>
                  </Button>

                  <Link
                    to="/careers"
                    search={{ role: job.slug }}
                    className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Details <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Bottom Banner: Quick Links & Location Info */}
        <div className="mt-10 p-5 rounded-2xl border border-border/80 bg-card shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Know someone looking for a great job in Ahmedabad?
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Share our job openings directly on WhatsApp, Facebook, or Instagram stories.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-center">
            <Link
              to="/careers"
              className="text-xs font-bold px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5"
            >
              <span>View Full Careers Portal</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>

            <a
              href="https://api.whatsapp.com/send?phone=917742090866&text=Hi%20Stone%20Tech%20HR,%20I%20have%20an%20inquiry%20regarding%20job%20openings"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold px-3 py-2 rounded-lg border border-border hover:bg-muted/40 transition-colors inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <Send className="h-3 w-3 text-emerald-500" />
              <span>Contact HR Desk</span>
            </a>
          </div>
        </div>
      </div>

      {/* Online Application Modal Triggered from Apply Button */}
      <Dialog
        open={!!selectedJobForModal}
        onOpenChange={(isOpen) => !isOpen && setSelectedJobForModal(null)}
      >
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-border/70 pb-3">
            <DialogTitle className="text-lg font-bold">
              Apply for {selectedJobForModal?.shortTitle}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Stone Tech Architectural Stone Atelier — {selectedJobForModal?.location}
            </DialogDescription>
          </DialogHeader>

          {selectedJobForModal && (
            <JobApplicationForm
              initialJob={selectedJobForModal}
              source="landing-page"
              onSuccess={() => setSelectedJobForModal(null)}
              onCancel={() => setSelectedJobForModal(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Official Hiring Flyer / Poster Modal */}
      <Dialog open={showPosterPreview} onOpenChange={setShowPosterPreview}>
        <DialogContent className="sm:max-w-md max-h-[92vh] overflow-y-auto">
          <DialogHeader className="border-b border-border/70 pb-3">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span>Official Stone Tech Hiring Flyer</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Ready to post on WhatsApp Status, Instagram Stories, and Facebook.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3">
            <div className="rounded-xl overflow-hidden border border-border shadow-md bg-black">
              <img
                src="/branding/hiring-story-flyer.png"
                alt="Stone Tech Hiring Flyer"
                className="w-full h-auto object-contain max-h-[55vh] mx-auto"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button asChild className="flex-1 font-bold text-xs gap-1.5">
                <a href="/branding/hiring-story-flyer.png" download="Stone-Tech-Hiring-Flyer.png">
                  Download Image Flyer
                </a>
              </Button>
              <Button
                variant="outline"
                className="text-xs text-emerald-600 gap-1"
                onClick={() => {
                  const text = encodeURIComponent(
                    `*We are hiring at Stone Tech (Gota, Ahmedabad)!* 🏛️\n\n1️⃣ Data Entry Executive (₹12k-15k/mo)\n2️⃣ Field Sales Executive (₹15k-18k/mo + Fuel + Incentives)\n\nApply directly online here:\nhttps://stonetech.in/careers`,
                  );
                  window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
                }}
              >
                <Send className="h-3 w-3" />
                <span>Share WhatsApp</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

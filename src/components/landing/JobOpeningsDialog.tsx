import { useState } from "react";
import {
  Briefcase,
  MapPin,
  Clock,
  Mail,
  Send,
  Sparkles,
  ChevronRight,
  GraduationCap,
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

interface JobOpening {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  experience: string;
  description: string;
  responsibilities: string[];
}

const OPEN_ROLES: JobOpening[] = [
  {
    id: "site-engineer",
    title: "Site Project Engineer / Cladding Supervisor",
    department: "Project Execution",
    location: "Ahmedabad & Gujarat Sites",
    type: "Full-time",
    experience: "2–5 Years",
    description:
      "Supervise on-site mechanical dry-cladding, facade elevation fixing, and quality compliance for luxury residential villas and commercial projects.",
    responsibilities: [
      "Oversee stone tile alignment and sub-millimeter joint tolerances.",
      "Coordinate with client architects, site PMCs, and master masons.",
      "Conduct quality checks on stone calibration, leveling, and anchoring hardware.",
    ],
  },
  {
    id: "cad-draftsman",
    title: "Architectural CAD Draftsman & 3D Modeler",
    department: "Design & Engineering",
    location: "Gota, Ahmedabad (Showroom / Studio)",
    type: "Full-time",
    experience: "1–4 Years",
    description:
      "Translate architectural sketches into CNC cutting files, stone layout patterns, elevation shop drawings, and 3D architectural mockups.",
    responsibilities: [
      "Generate detailed CAD shop drawings and cutting tickets for fabrication.",
      "Optimize nesting layouts to minimize stone wastage.",
      "Prepare 3D visualizations and texture mockups for architect presentations.",
    ],
  },
  {
    id: "sales-consultant",
    title: "Architect & Designer Specification Consultant",
    department: "Sales & Client Relations",
    location: "Ahmedabad Experience Centre",
    type: "Full-time",
    experience: "2+ Years",
    description:
      "Build relationships with Gujarat's leading architects and luxury interior designers, consulting on bespoke stone finishes and turnkey solutions.",
    responsibilities: [
      "Present natural stone collections, veneers, and CNC murals to architects.",
      "Understand project drawings, measure stone quantities, and coordinate estimates.",
      "Guide homeowners through material selection at our Gota experience studio.",
    ],
  },
  {
    id: "cnc-operator",
    title: "CNC Machine Operator & Master Craftsman",
    department: "Manufacturing & Fabrication",
    location: "Processing Facility, Gujarat",
    type: "Full-time",
    experience: "3+ Years",
    description:
      "Operate bridge saws, 5-axis CNC waterjet machines, and profile routers for high-precision architectural stone fabrication.",
    responsibilities: [
      "Calibrate tooling for fluted, bush-hammered, and honed surface textures.",
      "Inspect stone slabs for fissures, color matching, and dimensional accuracy.",
      "Maintain tooling and uphold strict fabrication safety standards.",
    ],
  },
];

interface JobOpeningsDialogProps {
  trigger?: React.ReactNode;
}

export function JobOpeningsDialog({ trigger }: JobOpeningsDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<JobOpening | null>(null);

  const applyViaWhatsApp = (roleTitle: string) => {
    const text = encodeURIComponent(
      `Hi Stone Tech Team, I am interested in applying for the "${roleTitle}" position. Here is my profile/portfolio:`,
    );
    window.open(`https://api.whatsapp.com/send?phone=917742090866&text=${text}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <button className="hover:text-primary transition-colors cursor-pointer flex items-center gap-1">
            <Briefcase className="h-3.5 w-3.5" />
            <span>Job Openings</span>
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="space-y-1.5 border-b border-border/70 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Careers &amp; Job Openings
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Join Gujarat's leading architectural stone atelier and craftsmanship studio.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {selectedRole ? (
            <div className="space-y-4 animate-in fade-in-50 duration-200">
              <button
                type="button"
                onClick={() => setSelectedRole(null)}
                className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                ← Back to all openings
              </button>

              <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-foreground">{selectedRole.title}</h3>
                  <Badge
                    variant="outline"
                    className="text-xs font-semibold bg-primary/10 text-primary border-primary/20"
                  >
                    {selectedRole.department}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-rose-500" />
                    {selectedRole.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-blue-500" />
                    {selectedRole.type}
                  </span>
                  <span className="flex items-center gap-1">
                    <GraduationCap className="h-3.5 w-3.5 text-amber-500" />
                    Exp: {selectedRole.experience}
                  </span>
                </div>

                <p className="text-xs text-foreground/90 leading-relaxed pt-1">
                  {selectedRole.description}
                </p>

                <div className="space-y-1.5 pt-2 border-t border-border/60">
                  <div className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Key Responsibilities:
                  </div>
                  <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
                    {selectedRole.responsibilities.map((resp, i) => (
                      <li key={i} className="leading-relaxed">
                        {resp}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                <Button
                  onClick={() => applyViaWhatsApp(selectedRole.title)}
                  className="w-full sm:flex-1 h-10 text-xs font-bold gap-2 bg-[#25D366] hover:bg-[#1EBE5D] text-white"
                >
                  <Send className="h-3.5 w-3.5" />
                  Apply via WhatsApp
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full sm:flex-1 h-10 text-xs font-bold gap-2 border-border"
                >
                  <a
                    href={`mailto:info@stonetech.in?subject=${encodeURIComponent(
                      `Application for ${selectedRole.title}`,
                    )}&body=${encodeURIComponent(
                      `Hi Stone Tech HR,\n\nI am writing to express my interest in the ${selectedRole.title} position at Stone Tech.\n\nPlease find attached my CV/portfolio.\n\nBest regards,`,
                    )}`}
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Email CV to info@stonetech.in
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground px-0.5">
                <span>Current Open Positions ({OPEN_ROLES.length})</span>
                <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                  Actively Hiring in Gujarat
                </span>
              </div>

              <div className="space-y-2.5">
                {OPEN_ROLES.map((role) => (
                  <div
                    key={role.id}
                    onClick={() => setSelectedRole(role)}
                    className="p-3.5 rounded-xl border border-border/80 bg-card hover:border-primary/50 hover:bg-muted/40 transition-all cursor-pointer group space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                          {role.title}
                        </h4>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {role.department}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-rose-500" />
                        {role.location}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-blue-500" />
                        {role.type}
                      </span>
                      <span>•</span>
                      <span>Exp: {role.experience}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3.5 rounded-xl border border-dashed border-border bg-muted/20 space-y-2 mt-4 text-center">
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>Don't see a role matching your exact skills?</span>
                </div>
                <p className="text-[11px] text-muted-foreground max-w-md mx-auto">
                  We are always on the lookout for skilled stone masons, project managers, and sales
                  specialists. Send your resume directly to our hiring team.
                </p>
                <div className="pt-1 flex items-center justify-center gap-3">
                  <a
                    href="mailto:info@stonetech.in?subject=General%20Job%20Application%20-%20Stone%20Tech"
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    <Mail className="h-3 w-3" />
                    info@stonetech.in
                  </a>
                  <span className="text-muted-foreground/40">|</span>
                  <a
                    href="https://api.whatsapp.com/send?phone=917742090866&text=Hi%20Stone%20Tech%20Team,%20I%20am%20sharing%20my%20resume%20for%20future%20opportunities"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <Send className="h-3 w-3" />
                    WhatsApp Hiring Team
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

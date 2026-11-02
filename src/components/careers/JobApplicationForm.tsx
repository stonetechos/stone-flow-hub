import { useState, type FormEvent } from "react";
import {
  Send,
  Loader2,
  CheckCircle2,
  FileText,
  Upload,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Building2,
  Calendar,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitJobApplicationServerFn } from "@/lib/careers/api";
import { ACTIVE_JOB_POSTINGS, type JobPosting } from "@/lib/careers/types";
import { supabase } from "@/integrations/supabase/client";
import { FILES_BUCKET } from "@/lib/constants";
import { toast } from "sonner";

interface JobApplicationFormProps {
  initialJob?: JobPosting | null;
  onSuccess?: (appNo: string) => void;
  onCancel?: () => void;
  source?: string;
}

export function JobApplicationForm({
  initialJob,
  onSuccess,
  onCancel,
  source = "website",
}: JobApplicationFormProps) {
  const [selectedJobId, setSelectedJobId] = useState<string>(
    initialJob?.id || ACTIVE_JOB_POSTINGS[0]?.id || "",
  );
  const currentJob =
    ACTIVE_JOB_POSTINGS.find((j) => j.id === selectedJobId) || ACTIVE_JOB_POSTINGS[0];

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [sameAsPhone, setSameAsPhone] = useState(true);
  const [email, setEmail] = useState("");
  const [currentCity, setCurrentCity] = useState("Ahmedabad");
  const [currentArea, setCurrentArea] = useState("");
  const [totalExperience, setTotalExperience] = useState("Fresher");
  const [currentSalary, setCurrentSalary] = useState("");
  const [expectedSalary, setExpectedSalary] = useState(
    currentJob?.id === "data-entry-executive" ? "12000" : "15000",
  );
  const [highestQualification, setHighestQualification] = useState("Graduate");
  const [noticePeriod, setNoticePeriod] = useState("Immediate");
  const [hasTwoWheeler, setHasTwoWheeler] = useState(false);
  const [hasDrivingLicense, setHasDrivingLicense] = useState(false);
  const [aiToolsExperience, setAiToolsExperience] = useState("");
  const [coverNote, setCoverNote] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedAppNo, setSubmittedAppNo] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Please enter your full name");
      return;
    }
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }
    if (!currentArea.trim()) {
      toast.error("Please enter your current area / locality in Ahmedabad");
      return;
    }

    if (currentJob.id === "field-sales-executive" && (!hasTwoWheeler || !hasDrivingLicense)) {
      toast.warning(
        "Note: A personal 2-wheeler and driving license are required for this field role.",
      );
    }

    setIsSubmitting(true);

    try {
      let uploadedResumeUrl: string | null = null;
      let uploadedFileName: string | null = null;

      if (resumeFile) {
        uploadedFileName = resumeFile.name;
        try {
          const safeName = resumeFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
          const path = `resumes/${Date.now()}_${safeName}`;
          const { data: upData, error: upErr } = await supabase.storage
            .from(FILES_BUCKET)
            .upload(path, resumeFile, { upsert: true });

          if (!upErr && upData?.path) {
            const { data: pubData } = supabase.storage.from(FILES_BUCKET).getPublicUrl(upData.path);
            uploadedResumeUrl = pubData?.publicUrl || null;
          }
        } catch (uploadErr) {
          console.warn("[resume-upload] Non-fatal resume storage upload error:", uploadErr);
        }
      }

      const res = await submitJobApplicationServerFn({
        data: {
          job_id: currentJob.id,
          job_title: currentJob.shortTitle,
          full_name: fullName.trim(),
          phone: cleanPhone,
          whatsapp: sameAsPhone ? cleanPhone : whatsapp.replace(/\D/g, "") || cleanPhone,
          email: email.trim() || undefined,
          current_city: currentCity.trim() || "Ahmedabad",
          current_area: currentArea.trim(),
          total_experience: totalExperience,
          current_salary: currentSalary.trim() || undefined,
          expected_salary: expectedSalary.trim(),
          highest_qualification: highestQualification,
          notice_period: noticePeriod,
          has_two_wheeler: hasTwoWheeler,
          has_driving_license: hasDrivingLicense,
          key_skills: currentJob.requiredSkills.slice(0, 4),
          ai_tools_experience: aiToolsExperience.trim() || undefined,
          languages_known: ["Gujarati", "Hindi", "English"],
          resume_url: uploadedResumeUrl,
          resume_file_name: uploadedFileName,
          cover_note: coverNote.trim() || undefined,
          source,
        },
      });

      setSubmittedAppNo(res.application_no);
      toast.success("Application submitted successfully!");
      if (onSuccess) onSuccess(res.application_no);
    } catch (err: unknown) {
      console.error("Application submission failed:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to submit application. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedAppNo) {
    return (
      <div className="p-6 text-center space-y-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 animate-in fade-in-50 duration-300">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-foreground">Application Received!</h3>
          <p className="text-xs text-muted-foreground">
            Thank you, <span className="font-semibold text-foreground">{fullName}</span>. Your
            application for{" "}
            <span className="font-semibold text-foreground">{currentJob.title}</span> has been
            registered in our system.
          </p>
        </div>

        <div className="inline-block px-4 py-2 rounded-lg bg-card border border-border shadow-2xs font-mono text-sm font-bold text-primary">
          Application Ref: {submittedAppNo}
        </div>

        <div className="p-3 rounded-lg bg-background/80 border border-border text-xs text-muted-foreground space-y-1.5 max-w-md mx-auto text-left">
          <div className="font-semibold text-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Next Steps:
          </div>
          <p>
            Our hiring coordinator will review your profile and reach out via WhatsApp/Call for a
            quick initial screening.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
          <Button
            asChild
            className="w-full sm:w-auto h-9 text-xs font-bold gap-1.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white"
          >
            <a
              href={`https://api.whatsapp.com/send?phone=917742090866&text=${encodeURIComponent(
                `Hi Stone Tech HR, I just submitted my application for the "${currentJob.shortTitle}" position (Ref: ${submittedAppNo}). Here is my name: ${fullName}.`,
              )}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Send className="h-3.5 w-3.5" /> Connect with HR on WhatsApp
            </a>
          </Button>
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="text-xs"
            >
              Close
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      {/* 1. Job Selection */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-foreground">
          Position You Are Applying For *
        </Label>
        <Select
          value={selectedJobId}
          onValueChange={(val) => {
            setSelectedJobId(val);
            if (val === "data-entry-executive") {
              setExpectedSalary("12000");
            } else if (val === "field-sales-executive") {
              setExpectedSalary("15000");
            }
          }}
        >
          <SelectTrigger className="h-10 text-xs font-medium">
            <SelectValue placeholder="Select position" />
          </SelectTrigger>
          <SelectContent>
            {ACTIVE_JOB_POSTINGS.map((job) => (
              <SelectItem key={job.id} value={job.id} className="text-xs">
                {job.title} — ({job.salaryText})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="p-2.5 rounded-lg bg-muted/40 border border-border text-[11px] text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
          <span>
            📍 <strong>Location:</strong> {currentJob.location}
          </span>
          <span>
            ⏰ <strong>Timing:</strong> {currentJob.timing} ({currentJob.days})
          </span>
          <span>
            💰 <strong>Salary:</strong> {currentJob.salaryText}
          </span>
        </div>
      </div>

      {/* 2. Personal Contact Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Full Name *</Label>
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Ramesh Patel"
            required
            className="h-9 text-xs"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold">Mobile Number *</Label>
          <Input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 9876543210"
            required
            className="h-9 text-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs font-semibold">WhatsApp Number</Label>
          <Input
            type="tel"
            disabled={sameAsPhone}
            value={sameAsPhone ? phone : whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="WhatsApp number"
            className="h-9 text-xs disabled:opacity-75"
          />
          <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer pt-0.5">
            <input
              type="checkbox"
              checked={sameAsPhone}
              onChange={(e) => setSameAsPhone(e.target.checked)}
              className="rounded border-border text-primary"
            />
            <span>Same as mobile number</span>
          </label>
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold">Email Address (Optional)</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. name@gmail.com"
            className="h-9 text-xs"
          />
        </div>
      </div>

      {/* 3. Location & Area in Ahmedabad */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Current Area / Locality in Ahmedabad *</Label>
          <Input
            value={currentArea}
            onChange={(e) => setCurrentArea(e.target.value)}
            placeholder="e.g. Gota, Chandlodiya, Sola, Bopal, etc."
            required
            className="h-9 text-xs"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold">City</Label>
          <Input
            value={currentCity}
            onChange={(e) => setCurrentCity(e.target.value)}
            className="h-9 text-xs"
          />
        </div>
      </div>

      {/* 4. Experience, Education & Salary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Total Experience *</Label>
          <Select value={totalExperience} onValueChange={setTotalExperience}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Fresher" className="text-xs">
                Fresher (0 Years)
              </SelectItem>
              <SelectItem value="Less than 1 Year" className="text-xs">
                Less than 1 Year
              </SelectItem>
              <SelectItem value="1–2 Years" className="text-xs">
                1–2 Years
              </SelectItem>
              <SelectItem value="3–5 Years" className="text-xs">
                3–5 Years
              </SelectItem>
              <SelectItem value="5+ Years" className="text-xs">
                5+ Years
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold">Expected Salary (₹/month) *</Label>
          <Input
            value={expectedSalary}
            onChange={(e) => setExpectedSalary(e.target.value)}
            placeholder="e.g. 15000"
            required
            className="h-9 text-xs"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold">Notice Period / Joining *</Label>
          <Select value={noticePeriod} onValueChange={setNoticePeriod}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Immediate" className="text-xs">
                Immediate (Within 2-3 days)
              </SelectItem>
              <SelectItem value="7 Days" className="text-xs">
                7 Days
              </SelectItem>
              <SelectItem value="15 Days" className="text-xs">
                15 Days
              </SelectItem>
              <SelectItem value="1 Month" className="text-xs">
                1 Month
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Highest Qualification *</Label>
          <Select value={highestQualification} onValueChange={setHighestQualification}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="12th Pass / HSC" className="text-xs">
                12th Pass / HSC
              </SelectItem>
              <SelectItem value="Diploma" className="text-xs">
                Diploma
              </SelectItem>
              <SelectItem value="Graduate (B.Com / B.A / B.Sc / BBA / BCA)" className="text-xs">
                Graduate (B.Com / B.A / BBA / etc.)
              </SelectItem>
              <SelectItem value="Post Graduate (M.Com / MBA / MCA)" className="text-xs">
                Post Graduate (MBA / M.Com / etc.)
              </SelectItem>
              <SelectItem value="Other" className="text-xs">
                Other
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold">Current / Last Salary (Optional)</Label>
          <Input
            value={currentSalary}
            onChange={(e) => setCurrentSalary(e.target.value)}
            placeholder="e.g. 12000 or Fresher"
            className="h-9 text-xs"
          />
        </div>
      </div>

      {/* 5. Role-Specific Checkboxes */}
      {currentJob.id === "field-sales-executive" && (
        <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-2">
          <div className="text-xs font-bold text-foreground">Field Requirements Confirmation:</div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
              <Checkbox
                checked={hasTwoWheeler}
                onCheckedChange={(checked) => setHasTwoWheeler(Boolean(checked))}
              />
              <span>I have my own two-wheeler (bike/scooter) for field site visits</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
              <Checkbox
                checked={hasDrivingLicense}
                onCheckedChange={(checked) => setHasDrivingLicense(Boolean(checked))}
              />
              <span>I have a valid driving license</span>
            </label>
          </div>
        </div>
      )}

      {currentJob.id === "data-entry-executive" && (
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">
            AI Tools &amp; Computer Skills Experience (ChatGPT, Excel, PDF editing, etc.)
          </Label>
          <Input
            value={aiToolsExperience}
            onChange={(e) => setAiToolsExperience(e.target.value)}
            placeholder="e.g. Regular user of ChatGPT for writing, comfortable in MS Excel & PDF editing"
            className="h-9 text-xs"
          />
        </div>
      )}

      {/* 6. Resume / CV Upload */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">Upload Resume / CV (PDF, DOCX, or Image)</Label>
        <div className="flex items-center gap-2">
          <label className="flex-1 flex items-center justify-center gap-2 h-10 px-3 rounded-lg border border-dashed border-border hover:border-primary/50 bg-background/50 cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Upload className="h-4 w-4 text-primary" />
            <span className="truncate">
              {resumeFile ? resumeFile.name : "Click to select resume file (PDF / Word / Image)"}
            </span>
            <input
              type="file"
              accept=".pdf,.doc,.docx,image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setResumeFile(e.target.files[0]);
                }
              }}
            />
          </label>
          {resumeFile && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setResumeFile(null)}
              className="h-10 w-10 text-muted-foreground hover:text-destructive"
              title="Remove file"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* 7. Brief Note */}
      <div className="space-y-1">
        <Label className="text-xs font-semibold">Brief Note / About Yourself (Optional)</Label>
        <Textarea
          value={coverNote}
          onChange={(e) => setCoverNote(e.target.value)}
          placeholder="Tell us a bit about yourself, why you want to join Stone Tech, and when you can start."
          rows={2}
          className="text-xs resize-none"
        />
      </div>

      {/* 8. Action Buttons */}
      <div className="pt-2 flex items-center justify-end gap-2 border-t border-border/60">
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel} className="text-xs">
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-10 px-6 text-xs font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Submitting Application...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" /> Submit Application Directly
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

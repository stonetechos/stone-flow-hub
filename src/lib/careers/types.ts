import { z } from "zod";

export interface JobPosting {
  id: string;
  slug: string;
  title: string;
  shortTitle: string;
  department: string;
  location: string;
  officeAddress: string;
  type: string;
  timing: string;
  days: string;
  salaryText: string;
  salaryMin: number;
  salaryMax: number;
  perks: string[];
  experience: string;
  isUrgent?: boolean;
  summary: string;
  primaryKra: string;
  kras: {
    title: string;
    description: string;
  }[];
  kpas: {
    metric: string;
    target: string;
  }[];
  requiredSkills: string[];
  preferredSkills?: string[];
  whatsappShareText: string;
}

export const ACTIVE_JOB_POSTINGS: JobPosting[] = [
  {
    id: "data-entry-executive",
    slug: "data-entry-executive",
    title: "Data Entry Executive (ERP / CRM & Business Operations)",
    shortTitle: "Data Entry Executive",
    department: "Operations & Administration",
    location: "Gota, Ahmedabad",
    officeAddress:
      "Stone Tech, Ground Floor, SG Business Hub, Vasant Nagar, Gota, Ahmedabad, Gujarat 380060",
    type: "Full-time (In-Office)",
    timing: "10:00 AM – 7:30 PM",
    days: "Monday – Saturday (Sunday Off)",
    salaryText: "₹12,000 – ₹15,000 / month",
    salaryMin: 12000,
    salaryMax: 15000,
    perks: [
      "Competitive fixed monthly salary",
      "Hands-on training in enterprise cloud ERP (Stone Tech OS)",
      "AI productivity toolkit (ChatGPT, Claude workflows)",
      "Annual appraisal and performance bonuses",
      "Dynamic architectural stone craftsmanship studio environment",
    ],
    experience: "0–2 Years (Freshers with strong computer & AI skills welcome)",
    isUrgent: true,
    summary:
      "Maintain, organize, and enter real-time data of all business activities into Stone Tech OS ERP, CRM, and Payroll software through seamless coordination with vendors, stone processing agencies, site engineers, and customers.",
    primaryKra:
      "To maintain and enter data of everything that's happening in the business through coordination with different teams of vendors, agencies, and customers in our ERP / CRM / Payroll Software.",
    kras: [
      {
        title: "ERP & CRM Real-time Data Entry",
        description:
          "Accurately input incoming customer inquiries, estimates, stone quotations, sales orders, vendor RFQs, purchase orders, and payment receipts in Stone Tech OS.",
      },
      {
        title: "Inter-Departmental Operations Coordination",
        description:
          "Coordinate with quarry vendors, fabrication agencies, transport tempos, and site supervisors to record dispatches, stock deliveries, and daily job sheets.",
      },
      {
        title: "Document Formatting & PDF Generation",
        description:
          "Generate and edit professional customer quotes, bills, delivery challans, Excel spreadsheets, and Word documents ensuring 100% brand typography compliance.",
      },
      {
        title: "AI-Assisted Business Communication",
        description:
          "Leverage modern AI tools like ChatGPT to compose polite customer emails, WhatsApp updates, inquiry summaries, and executive status briefs.",
      },
      {
        title: "Attendance & Wage Record Keeping",
        description:
          "Verify daily staff biometric punches, overtime, and vendor/contractor wage entries within the HR module of the software.",
      },
    ],
    kpas: [
      {
        metric: "Daily Transaction Entry Timeliness",
        target: "100% of day's dispatches, payments, and quotes entered on the same date",
      },
      {
        metric: "Data Entry Accuracy",
        target: "> 99% accuracy across stone dimensions, rates, and GSTIN numbers",
      },
      {
        metric: "Document Turnaround Time",
        target: "Quotation & RFQ PDFs generated within 30 minutes of request",
      },
      {
        metric: "Vendor & Agency Status Tracking",
        target: "Zero missing delivery challans or unverified invoices at month end",
      },
    ],
    requiredSkills: [
      "English understanding and written communication (ability to compose clear, professional messages)",
      "Active proficiency with AI tools such as ChatGPT, Claude, etc. for writing and problem solving",
      "Aware, well-mannered, and soft-spoken telephone and messaging etiquette",
      "Competency in editing PDFs, Microsoft Excel, Word, and Google Sheets",
      "Comfortable working on web applications and typing with good accuracy",
    ],
    preferredSkills: [
      "Basic understanding of invoices, billing terms, and GST numbers",
      "Prior experience with any CRM, ERP, or billing software (Tally / Zoho / custom ERP)",
    ],
    whatsappShareText:
      "*Hiring: Data Entry Executive at Stone Tech (Gota, Ahmedabad)* 🏛️\n\n• *Role:* Data Entry & Business Operations in ERP/CRM\n• *Location:* Gota, Ahmedabad\n• *Timing:* (Mon-Sat) 10:00 AM - 7:30 PM\n• *Salary:* ₹12,000 - ₹15,000 / month\n• *Skills:* English writing, ChatGPT/AI tools, Excel/PDF editing, soft-spoken.\n\nApply directly online here:\nhttps://stonetech.in/careers?role=data-entry-executive",
  },
  {
    id: "field-sales-executive",
    slug: "field-sales-executive",
    title: "Field Sales Executive (Architecture & Construction Site Relations)",
    shortTitle: "Field Sales Executive",
    department: "Sales & Business Development",
    location: "Gota, Ahmedabad (Field & Office)",
    officeAddress:
      "Stone Tech, Ground Floor, SG Business Hub, Vasant Nagar, Gota, Ahmedabad, Gujarat 380060",
    type: "Full-time (Field)",
    timing: "10:00 AM – 7:30 PM",
    days: "Monday – Saturday (Sunday Off)",
    salaryText: "₹15,000 – ₹18,000 / month + Fuel Allowance + Sales Incentives",
    salaryMin: 15000,
    salaryMax: 18000,
    perks: [
      "Fixed monthly salary (₹15k – ₹18k)",
      "Daily fuel / travel expense reimbursement",
      "Attractive project sales commission & milestone bonuses",
      "Direct exposure to Gujarat's top luxury architects & developers",
      "Rapid growth path to Area Sales Manager",
    ],
    experience: "0–3 Years (Energetic candidates with two-wheeler preferred)",
    isUrgent: true,
    summary:
      "Drive field relationship-building by visiting active construction sites, architecture studios, and luxury interior designers across Ahmedabad & Gandhinagar, presenting Stone Tech natural stone collections, wall cladding, and turnkey fabrication solutions.",
    primaryKra:
      "Connecting with property owners, contractors, PMCs, Interior Designers, and Architects by visiting their offices and construction sites and making them aware of our products and services.",
    kras: [
      {
        title: "Construction Site Scouting & Outreach",
        description:
          "Visit ongoing residential villas, bungalows, commercial buildings, and mandir sites across Ahmedabad/Gandhinagar to identify stone requirement stages.",
      },
      {
        title: "Architect & Interior Designer Networking",
        description:
          "Meet practicing architects and interior design consultants in their studios, presenting stone veneer sample folders, 3D CNC carving catalogues, and material relief samples.",
      },
      {
        title: "Specification Capture & Requirement Briefing",
        description:
          "Take accurate preliminary site measurements, collect architectural elevation drawings, and log customer space requirements directly into the CRM.",
      },
      {
        title: "Studio Experience Visits & Deal Closing",
        description:
          "Invite decision-makers and architects to the Stone Tech Gota Studio for live sample viewings, coordinating with internal estimators to deliver winning quotations.",
      },
      {
        title: "Sample Deliveries & Relationship Maintenance",
        description:
          "Promptly deliver physical stone tiles and finish swatches to client sites, maintaining cordial follow-up until order booking.",
      },
    ],
    kpas: [
      {
        metric: "Daily Field Activity",
        target: "6–8 quality site visits / architect meetings completed per working day",
      },
      {
        metric: "Weekly Qualified Leads",
        target: "15+ new verified project enquiries logged in CRM weekly",
      },
      {
        metric: "Studio Walk-ins Driven",
        target: "3–5 client / architect visits guided to Gota experience centre weekly",
      },
      {
        metric: "Order Conversion Contribution",
        target: "Achieve monthly order booking targets to unlock full commission tiers",
      },
    ],
    requiredSkills: [
      "Must have personal two-wheeler (bike / scooter) and a valid driving license",
      "Strong spoken fluency in Gujarati and Hindi, with good conversational English",
      "Aware, confident, respectful, energetic, and soft-spoken personality",
      "Enthusiasm for fieldwork, meeting new people, and exploring construction sites",
      "Basic smartphone literacy to share photos, GPS locations, and updates via CRM/WhatsApp",
    ],
    preferredSkills: [
      "Prior field experience in tiles, marble, granite, sanitaryware, paints, or building materials",
      "Ability to understand basic floor plans or wall dimensions",
    ],
    whatsappShareText:
      "*Hiring: Field Sales Executive at Stone Tech (Ahmedabad)* 🏛️\n\n• *Role:* Architecture & Construction Site Field Relations\n• *Location:* Gota, Ahmedabad\n• *Timing:* (Mon-Sat) 10:00 AM - 7:30 PM\n• *Salary:* ₹15,000 - ₹18,000 / mo + Fuel Allowance + Sales Incentives\n• *Requirements:* Own 2-wheeler + license, Gujarati/Hindi speaking, soft-spoken.\n\nApply directly online here:\nhttps://stonetech.in/careers?role=field-sales-executive",
  },
];

export const jobApplicationInputSchema = z.object({
  job_id: z.string().min(1, "Please select the job position"),
  job_title: z.string().min(1, "Job title is required"),
  full_name: z.string().trim().min(2, "Full name is required"),
  phone: z
    .string()
    .trim()
    .min(10, "Please enter a valid 10-digit mobile number")
    .max(15, "Mobile number too long"),
  whatsapp: z.string().trim().optional().nullable(),
  email: z.string().trim().email("Please enter a valid email address").optional().or(z.literal("")),
  current_city: z.string().trim().min(2, "City is required").default("Ahmedabad"),
  current_area: z.string().trim().min(2, "Your current area / locality in Ahmedabad is required"),
  total_experience: z.string().trim().min(1, "Experience is required"),
  current_salary: z.string().trim().optional().nullable(),
  expected_salary: z.string().trim().min(1, "Expected salary is required"),
  highest_qualification: z.string().trim().min(1, "Highest qualification is required"),
  notice_period: z.string().trim().default("Immediate"),
  has_two_wheeler: z.boolean().default(false),
  has_driving_license: z.boolean().default(false),
  key_skills: z.array(z.string()).default([]),
  ai_tools_experience: z.string().trim().optional().nullable(),
  languages_known: z.array(z.string()).default([]),
  resume_url: z.string().trim().optional().nullable(),
  resume_file_name: z.string().trim().optional().nullable(),
  cover_note: z.string().trim().optional().nullable(),
  source: z.string().trim().default("website"),
});

export type JobApplicationInput = z.infer<typeof jobApplicationInputSchema>;

export type JobApplicationStatus =
  | "new"
  | "reviewing"
  | "shortlisted"
  | "interview_scheduled"
  | "offered"
  | "hired"
  | "rejected";

export const APPLICATION_STATUS_CONFIG: Record<
  JobApplicationStatus,
  { label: string; badgeClass: string }
> = {
  new: {
    label: "New Application",
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  reviewing: {
    label: "Under Review",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  shortlisted: {
    label: "Shortlisted",
    badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
  interview_scheduled: {
    label: "Interview Scheduled",
    badgeClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  },
  offered: {
    label: "Job Offered",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  hired: {
    label: "Hired",
    badgeClass: "bg-green-600 text-white border-green-600",
  },
  rejected: {
    label: "Archived / Rejected",
    badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
};

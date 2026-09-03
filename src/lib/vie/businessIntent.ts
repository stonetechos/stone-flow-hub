/**
 * Business Intent Model — foundation sprint (2026-07-28).
 *
 * A single, reusable structure representing "what a piece of business
 * communication was about," independent of where it came from. Today VIE's
 * `understand.ts` only ever sees typed text and produces one of four
 * narrow, per-intent entity shapes (`logEnquiryEntitiesSchema` etc., in
 * `types.ts`). As more capture sources arrive — voice, WhatsApp, email,
 * future OCR — each needs to converge on ONE shape VIE's Planner can
 * consume, rather than each source inventing its own. `BusinessIntent`
 * below is that shape. It mirrors, and is intentionally close to, the
 * `CaptureEvent`/`ExtractedEntity` sketches in the (design-only, nothing
 * implemented) `docs/ai-copilot-v2-blueprint.md` §3.4/§6 — this sprint is
 * the first real implementation of that idea, scoped down to exactly what
 * was asked for this sprint: the model and its plumbing, not extraction.
 *
 * ## What this file does NOT do
 *
 * - **No speech recognition, no WhatsApp/email parsing, no OCR.** Every
 *   `BusinessIntentSourceAdapter` below except `text` is a deliberate stub
 *   that throws `BusinessIntentSourceNotImplementedError` — see §"Source
 *   adapters" below. Building a normalizer that actually turns audio, a
 *   WhatsApp message, or a scanned document into a `BusinessIntent` is
 *   explicitly out of scope for this sprint.
 * - **No new LLM call.** Populating a `BusinessIntent`'s fields from free
 *   text is still `understand.ts`'s job (or, for a future source, a
 *   normalizer's own LLM call before this model is even built) — this file
 *   only defines the shape the result should be validated against and
 *   pure, structural adapters to and from VIE's existing per-intent entity
 *   schemas. Nothing here inspects `rawText` or calls any AI provider.
 * - **VIE's own Understand/Planner/Workflow Engine core is unchanged.**
 *   `understand.ts` still produces `VieUnderstanding` with its narrower,
 *   per-intent `entities: Record<string, unknown>` shape; the mapping
 *   functions at the bottom of this file (`toLogEnquiryEntities()` etc.)
 *   are the plumbing that lets a `BusinessIntent` — however it was
 *   eventually populated — feed into that existing shape without VIE core
 *   needing to know a `BusinessIntent` exists.
 */
import { z } from "zod";
import type {
  CreateCustomerEntities,
  CreateQuotationEntities,
  LogEnquiryEntities,
  NoteFollowupEntities,
  VieLanguage,
} from "./types";

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

export const BUSINESS_INTENT_SOURCES = ["text", "voice", "whatsapp", "email", "ocr"] as const;
export type BusinessIntentSource = (typeof BUSINESS_INTENT_SOURCES)[number];

// ---------------------------------------------------------------------------
// Section schemas — one per category the sprint's brief named explicitly.
// Every field is optional: a `BusinessIntent` is a partial, best-effort
// capture, the same "never fabricate a missing value" discipline every
// existing VIE entities schema in types.ts already follows.
// ---------------------------------------------------------------------------

export const businessIntentCustomerSchema = z.object({
  name: z.string().trim().min(1).optional(),
  mobile: z.string().trim().min(1).optional(),
  email: z.string().trim().min(1).optional(),
  address: z.string().trim().min(1).optional(),
  city: z.string().trim().min(1).optional(),
  customerType: z
    .enum([
      "individual",
      "company",
      "builder",
      "architect",
      "interior_designer",
      "contractor",
      "government",
      "other",
    ])
    .optional(),
});
export type BusinessIntentCustomer = z.infer<typeof businessIntentCustomerSchema>;

export const businessIntentProjectSchema = z.object({
  name: z.string().trim().min(1).optional(),
  location: z.string().trim().min(1).optional(),
  siteAddress: z.string().trim().min(1).optional(),
});
export type BusinessIntentProject = z.infer<typeof businessIntentProjectSchema>;

export const businessIntentRequirementsSchema = z.object({
  /** Free-text summary of what's wanted — folded into notes fields downstream, never dropped. */
  summary: z.string().trim().min(1).optional(),
  /** Additional discrete notes/preferences (including negatives — "thick strips won't work" is a requirement, not noise). */
  notes: z.array(z.string().trim().min(1)).optional(),
});
export type BusinessIntentRequirements = z.infer<typeof businessIntentRequirementsSchema>;

export const businessIntentProductSchema = z.object({
  name: z.string().trim().min(1),
  quantity: z.number().positive().optional(),
  unit: z.string().trim().min(1).optional(),
  /** Per-unit rate, if stated — maps to the existing `rate` field on VIE's own line-item entity shape. */
  unitPrice: z.number().positive().optional(),
  notes: z.string().trim().min(1).optional(),
});
export type BusinessIntentProduct = z.infer<typeof businessIntentProductSchema>;

export const businessIntentMeasurementSchema = z.object({
  label: z.string().trim().min(1).optional(),
  value: z.number().optional(),
  unit: z.string().trim().min(1).optional(),
  /** The as-said phrase (e.g. "350 sq ft") when it wasn't cleanly split into value+unit — never dropped just because it didn't parse. */
  raw: z.string().trim().min(1).optional(),
});
export type BusinessIntentMeasurement = z.infer<typeof businessIntentMeasurementSchema>;

export const businessIntentBudgetSchema = z.object({
  amountInr: z.number().positive().optional(),
  isApprox: z.boolean().optional(),
});
export type BusinessIntentBudget = z.infer<typeof businessIntentBudgetSchema>;

export const businessIntentTimelineSchema = z.object({
  /** A day count from capture time — converted to a real date deterministically by application code, never by the LLM (same rule VIE's existing `timelineRelativeDays`/`relativeDays` fields already enforce). */
  relativeDays: z.number().int().min(0).optional(),
  /** An explicit date, when one was actually stated (e.g. "by Diwali" resolved elsewhere to an ISO date) rather than derived. */
  dueDate: z.string().trim().min(1).optional(),
  notes: z.string().trim().min(1).optional(),
});
export type BusinessIntentTimeline = z.infer<typeof businessIntentTimelineSchema>;

export const businessIntentTaskSchema = z.object({
  title: z.string().trim().min(1),
  dueDate: z.string().trim().min(1).optional(),
});
export type BusinessIntentTask = z.infer<typeof businessIntentTaskSchema>;

export const businessIntentFollowupSchema = z.object({
  note: z.string().trim().min(1),
  relativeDays: z.number().int().min(0).optional(),
  channel: z.enum(["call", "whatsapp", "email", "meeting", "site_visit"]).optional(),
});
export type BusinessIntentFollowup = z.infer<typeof businessIntentFollowupSchema>;

/** A reference to a file, never the file's content — mirrors `file_objects`'
 *  own row shape (id + a display name), and the blueprint's `CaptureEvent.sourceRef`
 *  concept. No OCR/attachment ingestion happens here; this only carries the
 *  pointer forward once some future normalizer has one. */
export const businessIntentDocumentRefSchema = z.object({
  fileId: z.string().trim().min(1).optional(),
  fileName: z.string().trim().min(1).optional(),
  kind: z.string().trim().min(1).optional(),
});
export type BusinessIntentDocumentRef = z.infer<typeof businessIntentDocumentRefSchema>;

/** A soft link to VIE's own intent vocabulary — soft (plain string, not the
 *  `VieIntent` union) so a `BusinessIntent` can name an action VIE doesn't
 *  have a handler for yet without this schema needing to change every time
 *  a new intent is added elsewhere. `toXEntities()` below is what actually
 *  connects a `BusinessIntent` to a real, typed `VieIntent`. */
export const businessIntentActionSchema = z.object({
  type: z.string().trim().min(1),
  confidence: z.number().min(0).max(1).optional(),
});
export type BusinessIntentAction = z.infer<typeof businessIntentActionSchema>;

// ---------------------------------------------------------------------------
// The top-level model
// ---------------------------------------------------------------------------

export const businessIntentSchema = z.object({
  source: z.enum(BUSINESS_INTENT_SOURCES),
  /** The canonical text form — even a voice/WhatsApp/OCR capture converges
   *  to text before this model is populated, same "one engine that
   *  understands text, fed by normalizers that each know how to become
   *  text" principle the blueprint's Capture Layer describes. */
  rawText: z.string(),
  language: z.enum(["en", "hi", "gu", "mixed", "unknown"]).optional(),
  /** ISO timestamp of capture — always supplied by the caller (voice
   *  session end, WhatsApp webhook receipt, ...), never generated inside
   *  this file, matching eventBus.ts's own "no system clock dependency"
   *  discipline. */
  capturedAt: z.string(),
  sourceRef: z
    .object({
      fileId: z.string().optional(),
      conversationId: z.string().optional(),
      messageId: z.string().optional(),
    })
    .optional(),
  /** Overall confidence, when the source can produce one (an STT provider's
   *  transcription confidence, a classifier's intent confidence, ...). Per-field
   *  confidence is intentionally not modeled yet — the blueprint (§5.2) flags
   *  per-entity confidence as a real future need, not something to guess the
   *  shape of before a real second source exists to validate it against. */
  confidence: z.number().min(0).max(1).optional(),

  customer: businessIntentCustomerSchema.optional(),
  project: businessIntentProjectSchema.optional(),
  requirements: businessIntentRequirementsSchema.optional(),
  products: z.array(businessIntentProductSchema).optional(),
  measurements: z.array(businessIntentMeasurementSchema).optional(),
  budget: businessIntentBudgetSchema.optional(),
  timeline: businessIntentTimelineSchema.optional(),
  tasks: z.array(businessIntentTaskSchema).optional(),
  followups: z.array(businessIntentFollowupSchema).optional(),
  documents: z.array(businessIntentDocumentRefSchema).optional(),
  actions: z.array(businessIntentActionSchema).optional(),
});
export type BusinessIntent = z.infer<typeof businessIntentSchema>;

// ---------------------------------------------------------------------------
// Source adapters — plumbing only. A "normalizer" is anything that can turn
// a source's raw input into a partial BusinessIntent (or, for `text`, into
// nothing more than the identity mapping — see below). This mirrors the
// Action Registry's own Map-based, additive-registration shape
// (`actions/registry.ts`) deliberately, so a future adapter slots in the
// same familiar way a future VIE intent handler does.
// ---------------------------------------------------------------------------

export class BusinessIntentSourceNotImplementedError extends Error {
  constructor(public readonly source: BusinessIntentSource) {
    super(
      `No BusinessIntent normalizer is implemented for source "${source}" yet — this sprint ` +
        `is foundation only (the model + this registry), not extraction. See businessIntent.ts's header comment.`,
    );
    this.name = "BusinessIntentSourceNotImplementedError";
  }
}

export interface BusinessIntentSourceAdapter<TRawInput = unknown> {
  readonly source: BusinessIntentSource;
  /** True for a source with a real normalizer today; false for a registered-but-stubbed future source. */
  readonly implemented: boolean;
  /** Turn this source's raw input into a partial BusinessIntent. Stub adapters throw `BusinessIntentSourceNotImplementedError`. */
  normalize(raw: TRawInput): Promise<Partial<BusinessIntent>>;
}

const sourceAdapters = new Map<BusinessIntentSource, BusinessIntentSourceAdapter<never>>();

export function registerBusinessIntentSourceAdapter<TRawInput>(
  adapter: BusinessIntentSourceAdapter<TRawInput>,
): void {
  sourceAdapters.set(adapter.source, adapter as BusinessIntentSourceAdapter<never>);
}

export function getBusinessIntentSourceAdapter(
  source: BusinessIntentSource,
): BusinessIntentSourceAdapter<never> | undefined {
  return sourceAdapters.get(source);
}

/**
 * The only source with a genuine, non-stub normalizer today: typed text
 * needs no transcription, no message parsing, no OCR — it already IS text.
 * This is intentionally trivial (matches the blueprint's own per-modality
 * table: "Text (typed) | None needed — already text | Raw text | Exists
 * today").
 */
registerBusinessIntentSourceAdapter<{ text: string; capturedAt: string; language?: VieLanguage }>({
  source: "text",
  implemented: true,
  async normalize(raw) {
    return {
      source: "text",
      rawText: raw.text,
      capturedAt: raw.capturedAt,
      language: raw.language,
    };
  },
});

function registerStubAdapter(source: Exclude<BusinessIntentSource, "text">): void {
  registerBusinessIntentSourceAdapter({
    source,
    implemented: false,
    async normalize(): Promise<Partial<BusinessIntent>> {
      throw new BusinessIntentSourceNotImplementedError(source);
    },
  });
}
registerStubAdapter("voice");
registerStubAdapter("whatsapp");
registerStubAdapter("email");
registerStubAdapter("ocr");

// ---------------------------------------------------------------------------
// Plumbing to VIE's existing per-intent entity schemas (types.ts). Pure,
// deterministic field mapping — no extraction, no AI call. This is what
// makes the model actually reusable by the pipeline that exists today,
// rather than a shape nothing reads.
// ---------------------------------------------------------------------------

/** customer.name/mobile/email/address/city/customerType -> CreateCustomerEntities. */
export function toCreateCustomerEntities(intent: BusinessIntent): Partial<CreateCustomerEntities> {
  const c = intent.customer;
  if (!c) return {};
  return {
    customerName: c.name,
    mobile: c.mobile,
    email: c.email,
    address: c.address,
    city: c.city,
    customerType: c.customerType,
  };
}

/**
 * customer.name -> customerName; first product -> productText/quantity/unit/rate
 * (log_enquiry's entity schema models a single material mention, same as
 * today's typed-text VIE flow — a multi-product enquiry still resolves to
 * the first product here; create_quotation's `items[]` mapping below is
 * the multi-line-item path); budget/timeline/requirements map straight
 * across since logEnquiryEntitiesSchema already carries the identically-named
 * `budgetInr`/`timelineRelativeDays`/`requirements` fields the Voice-capture
 * foundation sprint added for exactly this purpose.
 */
export function toLogEnquiryEntities(intent: BusinessIntent): Partial<LogEnquiryEntities> {
  const firstProduct = intent.products?.[0];
  return {
    customerName: intent.customer?.name,
    productText: firstProduct?.name,
    quantity: firstProduct?.quantity,
    unit: firstProduct?.unit,
    rate: firstProduct?.unitPrice,
    budgetInr: intent.budget?.amountInr,
    timelineRelativeDays: intent.timeline?.relativeDays,
    requirements: intent.requirements?.summary,
  };
}

/** customer.name -> customerName; project.name -> projectText; products[] -> items[]; requirements -> requirements. */
export function toCreateQuotationEntities(
  intent: BusinessIntent,
): Partial<CreateQuotationEntities> {
  const items = intent.products?.map((p) => ({
    productText: p.name,
    quantity: p.quantity,
    unit: p.unit,
    rate: p.unitPrice,
  }));
  return {
    customerName: intent.customer?.name,
    projectText: intent.project?.name,
    items: items && items.length > 0 ? items : undefined,
    requirements: intent.requirements?.summary,
  };
}

/** customer.name -> targetName; first follow-up -> note/relativeDays/channel. */
export function toNoteFollowupEntities(intent: BusinessIntent): Partial<NoteFollowupEntities> {
  const firstFollowup = intent.followups?.[0];
  if (!firstFollowup) return { targetName: intent.customer?.name };
  return {
    targetName: intent.customer?.name,
    note: firstFollowup.note,
    relativeDays: firstFollowup.relativeDays,
    channel: firstFollowup.channel,
  };
}

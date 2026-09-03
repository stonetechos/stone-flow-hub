# AI Copilot v2 — The Vedora Intelligence Platform Blueprint

**Status: architecture and product design only. Nothing in this document has been implemented.**
No code was written, no schema was changed, no migration was created, and none should be inferred
from anything below — every code sketch, table shape, and file path in this document is a proposal
for a future implementation sprint to execute against, not a description of what exists today.
This is the official AI Copilot v2 blueprint for Stone Tech OS, written the way a platform's CTO
would write it: designed once, for reuse across every future Vedora Vision product, with Stone
Tech OS as the first tenant to actually run on it.

## 0. Framing: this is an extension, not a rewrite

Before any design decision in this document, one fact has to be stated plainly, because it changes
almost everything below: **Stone Tech OS already has a working, tested, three-layer AI action
pipeline.** It is called the Vedora Intelligence Engine (VIE — `src/lib/vie/`), it was designed in
`docs/ADR-0001-vedora-intelligence-engine-phase1.md` and audited in
`docs/VIE-Phase2-Architecture-Review.md`, and its architecture — **Understand → Plan → Execute**,
with the LLM confined to the Understand layer and every write going through the exact same
`api.ts` function the manual UI already calls — is sound and explicitly should not be redesigned
(the Phase 2 review's own words: *"Do not redesign or rewrite... the three-layer separation, the
Action Registry pattern, the policy-as-data execution model, or the single-table audit trail"*).

What VIE does **not** have today, confirmed by direct code inspection rather than assumption:

- **No user interface.** `understandAndStage`/`confirmVieAction`/`completeDraftAction` are callable
  server functions with zero call sites in any `.tsx` file. VIE is fully headless right now —
  reachable only from tests and direct server-function calls.
- **No non-interactive execution context.** Every entry point requires a live, authenticated staff
  session (`requireSupabaseAuth` + `requireStaff`), and `vie_actions.created_by` is a `NOT NULL`
  foreign key to a real human user. There is no way, today, for VIE to act on an inbound WhatsApp
  message, a scheduled job, or an unattended trigger.
- **Two working intents, a third partially built.** `log_enquiry` and `note_followup` are fully
  wired. `create_customer` exists. `create_quotation` exists but — per its own code comments —
  does not yet extract line items or prices, so it resolves customer/project only and routinely
  lands in a blocked state.
- **No multilingual UI, no voice, no document/image ingestion.** All three are correctly scoped out
  of VIE Phase 1 and are genuinely greenfield — nothing to build on for these specifically.

Separately, Stone Tech OS also has a **Copilot chat panel** (`src/components/copilot/Copilot.tsx`)
— a floating chat sheet, already shipped, already in every user's hands. It does natural-language
search-to-navigate (`nl-search.functions.ts`, deterministic results, never LLM-generated data) and
free-form Q&A (`askCopilot`, a hard-coded "STRICT DATA RULE" system prompt that refuses to name
specific records and explicitly cannot execute tools). **It is a completely separate feature from
VIE today — it does not call into VIE, and VIE does not surface through it.**

**AI Copilot v2 is, at its core, the project of closing that gap**: give VIE a real interface —
the Copilot panel the user already knows — add the input modalities the vision calls for (voice,
mixed language, documents, images, WhatsApp), and do it as a reusable platform layer so the next
Vedora Vision product doesn't repeat this design from scratch. It is not a new AI system built
next to VIE; it is VIE's front door, finally built, plus the capture and understanding upgrades
that make that front door useful in the way this business actually talks.

### Coverage map

| Sprint part | Where it's addressed |
|---|---|
| Part 1 — Vision | § 1 |
| Part 2 — Multilingual strategy | § 3.1, § 5.1 |
| Part 3 — Mixed-language understanding | § 5.2 |
| Part 4 — Voice ERP | § 3.2, § 4.2 |
| Part 5 — Entity extraction | § 5.3, § 6 |
| Part 6 — Business intelligence | § 3.3 |
| Part 7 — Universal business capture | § 3.4 |
| Part 8 — User experience | § 4 |
| Part 9 — Database impact | § 7 |
| Part 10 — Security | § 9 |
| Part 11 — Performance | § 10 |
| Part 12 — Roadmap | § 11 |
| Deliverables 1–13 | §§ 1–13, one section each |

---

## 1. Product Vision

### 1.1 What the Copilot becomes

Today, using Stone Tech OS means navigating to the right module, finding the right form, and
filling fields. The vision for AI Copilot v2 is that **the Copilot becomes a valid alternative
path through every one of those workflows** — not a replacement for the forms (they stay; not
every user or every action wants a conversation), but a first-class second way in. A sales
executive standing at a customer's site, typing half in Gujarati and half in English, should be
able to produce the same enquiry record their desk-bound colleague produces by filling six form
fields. The gap this closes is not "the ERP is missing a chatbot" — it's "the ERP requires a
specific literacy (which module, which field, which dropdown) that a conversational interface
does not require."

### 1.2 Scope of coverage

The instruction is "everything" — CRM, Sales, Purchase, Inventory, Manufacturing, Installation,
Accounting, Vendor Management, Customer Management, Reports, Analytics. The honest long-term
answer is: yes, eventually, but not simultaneously, and not uniformly. Two structural reasons
this has to be sequenced rather than declared all-at-once:

- **VIE's Action Registry already generalizes to any module** — nothing about the pipeline is
  Sales-specific. Reaching "everything" is a matter of writing more handlers against the pattern
  already proven at two-and-a-half intents, not building new infrastructure per module.
- **Not every module benefits equally from natural language.** A follow-up note or an enquiry is a
  sentence. A multi-line purchase order with fifty SKUs, tax splits, and vendor payment terms is
  not naturally a sentence — it's a table, and the Copilot's job there is closer to a
  read/summarize/flag-anomalies assistant than a write-everything-by-voice one. Part 12's roadmap
  (§ 11) sequences modules by how well the action actually maps to a short, confident utterance,
  starting with the ones VIE's own Phase 2 review already validated (enquiries, follow-ups,
  quotations) and moving toward the ones that benefit more from structured review than free text
  (accounting, manufacturing scheduling).

### 1.3 What "primary interaction method" means, precisely

It does not mean every screen is deleted in favor of a chat box. It means: for the workflows where
a sentence is a faster, lower-friction path than a form, the Copilot is built to be genuinely
faster — not a novelty that's slower than typing into fields once you count the confirmation
dialog and the corrections. That's a design bar, not a slogan, and it's why § 4 (UX Flows) and
§ 5 (AI Pipeline) spend real effort on confidence-driven auto-execution, not just "always ask."

### 1.4 The platform framing

Per the brief's closing instruction — design like the CTO of Vedora Vision, not just for Stone
Tech. The architectural move that makes this possible without a second build later: **separate
"VIE Core" (understanding, planning, execution, audit) from "Stone Tech OS domain package" (the
stone-industry vocabulary, the ERP module handlers, the master-data grounding)**. ADR-0001 already
states this intent in one sentence — *"VIE generalizes that pattern from one read-only use case
into a reusable core any module can use"* — this blueprint extends the same idea one level up:
any **product**, not just any module within one product. § 2.3 makes this split concrete.

---

## 2. System Architecture

### 2.1 The shape that already exists (do not redesign)

```
Employee input (text today)
        │
        ▼
┌───────────────────┐        the ONLY place any LLM is called
│  VIE — Understand  │───────►  gateway.server.ts → Lovable AI Gateway (Gemini 2.5 Flash)
│  (understand.ts)   │
└─────────┬──────────┘
          │ VieUnderstanding (intent, entities, confidence, language)
          ▼
┌───────────────────┐        read-only DB lookups, policy-as-data,
│      Planner       │        NEVER writes, NEVER calls the LLM
│  (planner/index.ts) │
└─────────┬──────────┘
          │ ExecutionPlan (resolved IDs, mode: auto/confirm/draft)
          ▼
┌───────────────────┐        the ONLY layer that writes to business
│  Workflow Engine    │        tables — by calling the SAME api.ts
│ (workflowEngine.ts)│        function the manual form already calls
└─────────┬──────────┘
          │
          ▼
   Existing ERP modules (enquiries, followups, customers, quotations, ...)
          │
          ▼
     Supabase business tables
```

Every stage writes its state to `vie_actions` — the single audit spine. This shape is correct and
is the foundation for everything below. AI Copilot v2 does not touch this core; it builds three
things around it: **more input modalities feeding into Understand** (§ 3), **a real UI consuming
it** (§ 4), and **a non-interactive execution context** (already identified as VIE Phase 2's
Milestone 6 — this blueprint treats it as a hard prerequisite for Part 7's WhatsApp/email capture,
not optional).

### 2.2 What Copilot v2 adds, layer by layer

```
                    ┌─────────────────────────────────────────────┐
                    │              CAPTURE LAYER (new)              │
                    │  text · voice · documents · images · WhatsApp  │
                    │     — normalizes every input to text + intent  │
                    │        context before it ever reaches VIE       │
                    └───────────────────┬─────────────────────────┘
                                        │  plain text (+ optional structured hints:
                                        │   source modality, language hint, attachment refs)
                                        ▼
                    ┌─────────────────────────────────────────────┐
                    │        VIE UNDERSTAND (extended, not rebuilt)  │
                    │   + mixed-language NLU (§5.2) + confidence UX   │
                    │   + domain knowledge grounding (§3.3)            │
                    └───────────────────┬─────────────────────────┘
                                        ▼
                              Planner (unchanged core, more resolvers)
                                        ▼
                              Workflow Engine (unchanged core, more handlers)
                                        ▼
                    ┌─────────────────────────────────────────────┐
                    │         COPILOT UI (rebuilt on the existing     │
                    │      chat panel — now writes, not just answers)  │
                    │   confirmation cards · draft review · corrections│
                    └─────────────────────────────────────────────┘
```

The Capture Layer is the one genuinely new architectural component. Its entire job is: take
whatever arrives — a typed sentence, a voice clip, a WhatsApp message, a scanned delivery challan
— and produce the same shape VIE's Understand layer already accepts (raw text, plus optional
context). This is what makes "one engine that can process voice, text, WhatsApp, email, PDF, OCR,
images" (Part 7) tractable: it's not one engine that understands five modalities, it's **one
engine that understands text**, fed by five different normalizers that each know how to become
text (or a text-plus-attachment-reference pair, for cases like OCR where the extracted text needs
to stay linked to the source image for audit and correction). Detailed per-modality design in
§ 3.4.

### 2.3 The platform split — Vedora Intelligence Platform vs. Stone Tech OS

| Layer | Lives in | Product-agnostic? |
|---|---|---|
| Gateway (LLM provider abstraction) | `gateway.server.ts` | Yes — already is |
| Understand (NLU: intent, entities, confidence, language) | `vie/understand.ts` + prompts | Mostly — the classifier prompt structure is generic; the *intent vocabulary* and *domain vocabulary injected into the prompt* (§ 3.3) are product-specific |
| Planner | `vie/planner/` | Yes — resolution *pattern* is generic; individual resolvers (resolve a customer, resolve a stone type) are product-specific |
| Action Registry / Workflow Engine | `vie/actions/`, `vie/workflowEngine.ts` | Yes — the registry and executor are generic; each handler is product-specific by definition (it calls a specific product's `api.ts`) |
| Capture Layer normalizers (voice, OCR, WhatsApp, email) | new, § 3.4 | Yes — a speech-to-text call or an inbound-WhatsApp webhook doesn't know or care what product it feeds |
| Copilot UI shell (chat panel, confirmation cards, voice button) | `components/copilot/` | Mostly — the shell is generic; the domain-specific card renderers (a quotation line-item preview looks different from a CRM contact preview) are per-product |
| Domain knowledge (stone-industry vocabulary, synonyms) | new, § 3.3 | No — this is Stone Tech OS's own domain package |
| Master-data grounding (which tables the AI treats as ground truth) | existing master tables (`stone_types`, `stone_colours`, ...) | No — but the *mechanism* (ground the AI in whatever master-config tables the product declares) is generic |

The practical implication: nothing in this blueprint asks Stone Tech OS to wait for a "platform"
to be built first. Every piece is built *for* Stone Tech OS, in Stone Tech OS's repo, using Stone
Tech OS's real data. The platform-reuse property falls out of *where the line is drawn* — provider
calls, NLU mechanics, planning/execution mechanics, and the capture normalizers live in
product-agnostic modules from day one, so that the second Vedora Vision product reuses code
instead of re-deriving this architecture. This is the same discipline Sprint 1.7.1 already applied
to branding (`platform.ts` vs `application.ts`) — apply it here to the AI layer.

---

## 3. Technical Architecture

### 3.1 Multilingual strategy (Part 2)

This is two genuinely different problems wearing one name, and conflating them is the single
biggest risk to this part of the plan:

**Problem A — the AI understands Hindi/Gujarati/English/mixed input.** This already exists, in
part: VIE's `understand.ts` already returns a `language` field (`en`/`hi`/`gu`/`mixed`/`unknown`)
as NLU output. § 5.1/5.2 extend this from "detect and label" to "extract entities correctly
regardless of which language or mix they arrived in."

**Problem B — the *application UI itself* renders in Hindi/Gujarati.** This does not exist at all
today — confirmed by code search: no i18n library in `package.json`, no locale files, no message
catalog. Every button, label, toast, and page title is a hardcoded English string. This is a
separate, large, mostly-mechanical project independent of the AI work, and conflating "the AI
understands Gujarati" with "the app is available in Gujarati" would misrepresent the effort
involved in each.

**Recommended architecture for Problem B**, scoped as its own workstream (§ 11 roadmap):

- **Library**: `i18next` + `react-i18next` (industry-standard, works cleanly with the existing
  Vite/React/TanStack Start stack, no framework conflict).
- **Message catalogs**: `src/locales/{en,hi,gu}/*.json`, namespaced by feature area (matching the
  existing route structure — `common`, `crm`, `sales`, `masters`, ...) rather than one giant file,
  so a translator can be handed one namespace without touching the rest.
  - **Script note**: Gujarati and Hindi should be stored and rendered in their native scripts
    (ગુજરાતી, हिन्दी), not romanized — romanization is a *speech/typed-input* tolerance (§ 5.2), not
    a UI rendering choice. Conflating the two would make the UI look unprofessional and would not
    match how staff actually read.
- **Validation messages**: Zod's `.refine()`/`.superRefine()` custom messages already exist
  throughout the codebase's form validation — route them through the same `t()` function as UI
  strings rather than a separate validation-message catalog, so a field's label and its "required"
  error are always translated together.
- **Notifications (WhatsApp/Email)**: `message_templates` (Sprint 1.8 standardized this exact
  screen — see `docs/master-list-standardization.md`) already models one template per
  code/channel/category. Add a `locale` column (default `'en'`) so the same logical template
  (`estimate.email.v2`) can have an `en`, `hi`, and `gu` variant; `dispatch.server.ts` resolves the
  variant by the recipient's stored language preference, falling back to `en` if a variant is
  missing — never blocking a send because a translation doesn't exist yet.
- **PDFs/Reports/Exports**: the PDF generator (`lib/pdf/generator.ts`, currently a client-side,
  browser-print-triggered flow — flagged as a gap in the VIE Phase 2 review for unrelated reasons
  too) should accept a `locale` parameter and pull labels from the same catalog. Numeric/currency/
  date formatting already goes through `src/lib/format.ts` — extend it to take a locale parameter
  (JS `Intl` APIs already support `hi-IN`/`gu-IN` natively, so this is a low-risk extension, not
  new infrastructure).
- **Settings & language switching**: a `preferred_language` column on the user profile (or a new
  `user_preferences` row, matching the existing `useNavPreferences` pattern already in
  `lib/nav/preferences.ts`), a switcher in Settings, `i18next`'s language persisted client-side and
  read on load. No server-side rendering language negotiation needed — this app is an authenticated
  SPA, not a public marketing site.
- **Future language expansion**: because everything above keys off `i18next`'s namespace/locale
  file convention, adding a fourth language is "add a `src/locales/<code>/*.json` tree and register
  the code in one config array" — not a re-architecture.

### 3.2 Voice ERP (Part 4)

Voice is a **capture-layer normalizer** (§ 2.2), not a new understanding system — its entire job
is to produce the text that VIE's existing `understand.ts` already knows how to consume.

- **Speech-to-text provider**: no existing STT integration in the codebase — this is genuinely
  greenfield. Given the existing pattern of routing every LLM call through one gateway
  (`gateway.server.ts`), the same discipline applies: one STT provider, one server-side chokepoint
  (e.g. `src/lib/ai/speech-gateway.server.ts`), swappable without touching call sites. A provider
  supporting Hindi/Gujarati/English/code-switched audio directly (rather than three separate
  language-locked models) should be the selection bar — evaluate at implementation time, don't
  hardcode a vendor in an architecture document.
- **Streaming vs. batch**: two distinct UX modes, not a single choice — **streaming transcription**
  (partial results shown live, like a live captions view) for the "user is dictating a sentence"
  case, where seeing your own words appear builds trust and lets you notice a mis-transcription
  immediately; **batch** (record, then transcribe) for noisy environments (a stone yard, a factory
  floor) where a clean single-pass transcription of a complete utterance beats a jittery live one.
  The composer should default to streaming with a manual "hold to record, batch" fallback, not make
  the user choose up front.
- **Noise handling**: push-to-talk (not always-listening — matches the existing chat panel's
  explicit-trigger pattern, and avoids the privacy/battery/false-activation problems of hot-word
  detection) plus client-side noise suppression (standard `getUserMedia` audio constraints —
  `echoCancellation`, `noiseSuppression`, `autoGainControl` — before the audio ever leaves the
  device) as the first line of defense; provider-side noise-robust models as the second.
- **Corrections**: the transcript is never silently trusted. It becomes an editable text field
  populated with the transcription — the same composer box a typed message would go into — so a
  mis-heard word is fixed exactly the way a typo is fixed, before it ever reaches `understand()`.
  This also means voice input requires **zero new confirmation UX** — it reuses the exact same
  "review before send" pattern already in the chat composer.
- **Conversation history**: voice turns are stored identically to typed turns (§ 7's conversation
  history table) — the modality is metadata on a turn, not a parallel history system.
- **Confirmation & error recovery**: identical to text (§ 4) — VIE's existing `auto`/`confirm`/
  `draft` policy model doesn't care what modality produced the text. If transcription confidence
  from the STT provider itself is low, that's a *second* confidence signal (separate from VIE's own
  NLU confidence) that should independently be able to force a downgrade to `confirm` — a
  low-confidence transcription of a high-confidence intent is still something a human should glance
  at before it writes anything.
- **Offline possibilities**: genuinely limited by the architecture (every LLM/STT call is
  server-side by design, matching the existing "server is the only place a provider is called"
  discipline — mirroring it for STT is the safer default, not a gap to fix). A real offline mode
  would mean an on-device STT model, which is a substantial platform capability, not a Copilot
  feature — noted in § 13 as a future opportunity, not part of this roadmap.
- **Latency expectations**: streaming transcription should target sub-second perceived latency for
  partial results (standard for streaming STT APIs); the full understand→plan pipeline after the
  user finishes speaking is bounded by the same LLM round-trip VIE already has today (one
  `chatJson` call) — no new latency category is introduced by voice itself, only by STT sitting in
  front of it.

### 3.3 Business intelligence / domain knowledge (Part 6)

The central design decision here: **do not build a separate stone-industry knowledge base.** Stone
Tech OS already has one, and Sprint 1.8 just finished auditing and standardizing it: the 13
`MasterListPage`-driven master tables (`stone_types`, `stone_colours`, `surface_finishes`,
`edge_finishes`, `stone_origins`, `applications`, `thicknesses`, `product_families`,
`manufacturing_stages`, `quality_grades`, `packaging_types`, `uoms`, `qc_templates` — see
`docs/master-list-standardization.md`) *are* the domain knowledge: "Mint" and "Kandla Grey" are
rows in `stone_colours`; "Cladding" is a row in `applications`; "Rockface" and "Sawn" are rows in
`surface_finishes`; standard thicknesses are rows in `thicknesses`. This data is already
admin-editable, already has `code`/`name`/`is_active`, and is already exactly the shape the
Planner's existing resolvers (`resolveProduct.ts`) partially use.

The domain-knowledge layer this sprint should design is therefore a **grounding and fuzzy-matching
service**, not a knowledge base:

1. **A cached vocabulary index**, built from the active rows of every relevant master table
   (name, code, and any synonym field — see next point), refreshed on a short TTL or on
   mutation (the master tables already invalidate query caches on write via
   `invalidateAll()`/`query-invalidation.ts` — hook the vocabulary cache into the same
   invalidation call).
2. **A `synonyms` extension**: master tables don't currently have a place to record that "Kadappa"
   and "Cuddapah" are the same stone, or that a customer might say "Vampire" for a colour whose
   canonical `name` is something slightly different. Recommend a new, optional `synonyms text[]`
   column addable to the relevant master tables (non-breaking — nullable, defaults to `{}`) rather
   than a separate synonym table, keeping "what does this term mean" a one-hop lookup from the
   master row itself. This is a schema change and is explicitly **not** being made now — it's
   documented here as a Part 9 future-database item (§ 7) for whichever sprint implements this.
3. **Injected into the Understand prompt, not fine-tuned**: the classifier prompt
   (`vie/prompts.ts`) already carries few-shot examples. Extend it with a compact, cached
   vocabulary excerpt (not the entire table — the entities actually mentioned in the input, via a
   cheap pre-filter/fuzzy match pass before the LLM call) so the model is grounded in this
   business's real vocabulary rather than generic stone-industry knowledge it might hallucinate
   plausible-sounding but wrong terms from. This is the same "the LLM understands, the ERP decides"
   discipline ADR-0001 already established, applied to vocabulary instead of to write decisions.
4. **Confidence and fallback**: an extracted term that doesn't fuzzy-match any known vocabulary
   entry is not silently dropped or guessed — it's kept as raw text (exactly how `resolveProduct`
   already behaves today: "falls back to raw text, never a blocker") and surfaced to the user as
   "I didn't recognize this material — here's what you said" rather than mapped to a wrong nearby
   entry.
5. **Ownership boundary**: the *mechanism* (vocabulary index + fuzzy match + prompt injection) is
   product-agnostic platform code (§ 2.3); the *data* (which tables count as domain vocabulary,
   what "Mint" means) is 100% Stone Tech OS's own master data, edited through the same admin UI
   Sprint 1.8 just standardized — no separate "AI knowledge admin" screen needed.

### 3.4 Universal business capture (Part 7)

One engine, five normalizers, as introduced in § 2.2. Per-modality design:

| Modality | Normalizer's job | Feeds Understand as | Status |
|---|---|---|---|
| **Text** (typed) | None needed — already text | Raw text | Exists today |
| **Voice** | STT → editable transcript (§ 3.2) | Raw text (post-correction) | Greenfield |
| **WhatsApp** | Inbound webhook → message body as text; media attachments (image/PDF) routed to the OCR/Image normalizer, referenced by `file_objects` id | Raw text + optional attachment ref | Outbound infra exists (`message_queue`/`dispatch.server.ts`); **inbound does not exist** — needs a new webhook receiver, and critically needs VIE's Milestone 6 non-interactive execution context (§ 9.5) since an inbound WhatsApp message has no live staff session behind it |
| **Email** | Inbound parsing (subject + body as text, attachments to the OCR normalizer) | Raw text + optional attachment ref | Same gap as WhatsApp — needs inbound receiving infra (doesn't exist) and the same non-interactive execution context |
| **PDF / OCR** | Extract text from a scanned document (delivery challan, a competitor's quote, a vendor invoice) via an OCR pass, kept linked to the source file (`file_objects`, which already exists) for audit | Raw text + `source_file_id` | Greenfield (extraction); storage infra exists |
| **Images** (future, e.g. `recognizeStoneImage` already exists as a helper) | Vision-model description → text description of what's in the image, or direct classification against the master-data vocabulary (§ 3.3) | Raw text (description) + `source_file_id` | Partially exists as an isolated helper (`copilot.functions.ts`'s `recognizeStoneImage`) — not yet wired into the capture pipeline |

The unifying contract every normalizer must produce is intentionally small:

```ts
// Illustrative shape only — not an implementation.
interface CaptureEvent {
  text: string;                    // what VIE's understand() actually consumes
  sourceModality: "text" | "voice" | "whatsapp" | "email" | "document" | "image";
  sourceRef?: { fileId: string } | { conversationId: string; messageId: string };
  actor: { type: "interactive"; userId: string } | { type: "system"; serviceActor: string };
  languageHint?: string;           // e.g. STT provider's own language guess, if available
}
```

`actor` is the field that matters most architecturally: an interactive capture event (someone
typing or speaking into the Copilot panel right now) has a real user behind it and can use today's
`requireSupabaseAuth` path unchanged. A WhatsApp/email/scheduled capture event has no live session
— it must carry a `system` actor and route through the non-interactive execution context that VIE
Phase 2 already identified as its single largest structural gap (§ 9.5). **This blueprint treats
that gap as the load-bearing prerequisite for all of Part 7's inbound channels** — building a
WhatsApp inbound receiver before that context exists would mean either bending the auth model
under pressure (the Phase 2 review's own explicit warning) or silently attributing system actions
to a real human's account, which is worse.

---

## 4. UX Flows (Part 8)

### 4.1 The canonical flow

The brief's own example is the right one, and it maps directly onto the existing pipeline with one
addition (a "clarify" branch VIE's Planner already partially supports via `plan_blockers`, but
which currently has no UI to act on it):

```
User speaks or types
        │
        ▼
Capture Layer normalizes to text  (§3.4 — no-op for typed input)
        │
        ▼
VIE Understand: language + intent + entities + confidence  (existing, extended per §5)
        │
        ▼
Planner: resolve entities against real records, compute blockers, decide mode
        │
        ├── blockers present ──────► AI asks a targeted follow-up question
        │                             (§4.2), user answers, re-plan
        │
        ├── mode = auto, no blockers ──────► executes immediately,
        │                                    shown as "Done: <summary>. Undo?"
        │
        ├── mode = confirm ──────► confirmation card (§4.3): structured
        │                          preview of exactly what will be written,
        │                          user taps Confirm or edits first
        │
        └── mode = draft ──────► saved as a draft the user (or a colleague
                                  with the right role) finishes later — the
                                  same "draft" concept VIE already has, now
                                  with a UI to actually complete one
```

### 4.2 Missing-information follow-ups

When the Planner reports a blocker (today: unstructured strings; § 7 recommends structuring this
as VIE Phase 2's own Milestone 5), the Copilot should ask exactly the question that resolves it —
not "please provide more information," but "Which Ramesh — Ramesh Patel (Naroda, 2 open enquiries)
or Ramesh Shah (Vastrapur)?" when the blocker is an ambiguous customer match, because the Planner's
`resolveCustomer` already has the candidate list that produced the ambiguity; the UI's job is to
surface it as tappable choices, not free text the user has to re-type. This turns "AI asks
follow-up questions" from a generic chat capability into a structured disambiguation UI backed by
real data the Planner already computed — cheaper to build and far less error-prone than a second
open-ended LLM turn.

### 4.3 Confirmation cards

For `confirm`-mode actions, the card shown must be a genuine preview of the write, not a
restatement of the sentence — e.g. for `create_quotation`, a real line-item table (product,
quantity, rate, computed subtotal) the user can edit inline before confirming, matching exactly
what the VIE Phase 2 review flagged as the reason `create_quotation` is the right validation case
for the Planner's richer entity handling (§ 11's roadmap sequences this first for the same reason).
Editing a confirmation card writes back into the same `plan.params` shape the Workflow Engine
already expects — no separate "edited plan" data model.

### 4.4 Corrections and undo

Two distinct mechanisms, not one: **pre-write correction** (editing a transcript or a confirmation
card before Confirm — free, no data was written yet) and **post-write undo** (for `auto`-mode
actions that already executed). The latter does not exist in VIE today and needs real design
attention: because the Workflow Engine writes through the *same* `api.ts` functions the manual UI
uses, "undo" cannot be a generic reverse-the-last-action button — it has to be handler-specific
(deleting a just-created enquiry is safe; "undoing" a quotation that's already been viewed by a
customer is a business decision, not a technical one). Recommendation: `auto`-mode undo is scoped,
in this first release, to the same two low-risk intents already configured `AUTO` in VIE's own
policy table (`note_followup`; `log_enquiry` is actually `CONFIRM` today per ADR-0001 §6) — a
"soft delete within N minutes, no downstream side effects yet" pattern — rather than promising
universal undo before it's actually safe for every future intent.

### 4.5 Conversation history

Displayed as a scrollable thread (the existing Copilot panel already has this UI shape for
read-only chat) but now each turn optionally carries a linked `vie_actions` row, so a past turn
that created an enquiry shows its outcome ("Created ENQ-000123") and stays clickable through to
the real record — turning the chat log into a genuine activity feed, not just a transcript.

---

## 5. AI Pipeline (Parts 2, 3, 5)

### 5.1 Multilingual NLU (extends existing language detection)

VIE's `understand()` already returns a `language` field. What Part 2/3 add is **using** that
signal, not just recording it: the classifier prompt should be able to respond in-kind (a
Gujarati-typed sentence should be interpretable without first silently translating and losing
nuance), and any clarifying question generated (§ 4.2) should be phrased in the language the user
is actually using — a genuinely mixed-language UX depends on this, not just data extraction.

### 5.2 Mixed-language understanding (Part 3)

The example given —

```
Ek customer hai
Shantilal Patel
Naroda
350 sq ft
Mint panels
Random teakwood strip mukvani
Jadi strips nathi chalti
```

— is Hinglish/Gujarati-in-Roman-script, multi-line, telegraphic (no full sentences), and mixes a
clear entity list with a domain-specific negative preference ("thick strips won't work" — a
*requirement*, not noise). This is harder than VIE Phase 1's single-sentence classification and
needs three specific extensions, not a rewrite of the Understand layer:

1. **Multi-turn/multi-line entity accumulation.** Today's `understand()` is single-shot: one
   utterance in, one classification out. This input is a burst of short lines that together
   describe one enquiry. The Understand layer needs a mode where several consecutive capture
   events (or one multi-line paste/voice session) are treated as **one accumulating entity set**
   until the user signals they're done (an explicit "that's it" / a Send action / a pause past a
   threshold) — not seven separate low-confidence classifications. This is additive to
   `VieUnderstanding`'s shape (an optional `accumulate: true` / session id), not a redesign.
2. **Romanized script normalization.** "Mukvani," "nathi chalti," "sq ft" are Gujarati/English
   written in Roman characters, not English words. A transliteration-aware pre-pass (or simply
   leaning on the LLM's own multilingual capability with explicit few-shot examples covering
   Romanized Gujarati/Hindi, which `prompts.ts` already does for full sentences per the Phase 2
   review) needs deliberate few-shot coverage of exactly this *fragment-and-negation* style, not
   just full grammatical sentences.
3. **Domain-vocabulary grounding at extraction time** (§ 3.3) — "Mint," "teakwood" need to resolve
   against real master data during extraction, not as a separate post-pass, so the confidence score
   the Planner sees already reflects "did this match something real" rather than "did the LLM
   produce plausible-looking JSON."

**Confidence scores**: VIE already has a single scalar confidence per understanding. For
mixed/fragmentary input like this, a **per-entity** confidence (not just one number for the whole
utterance) is worth the added complexity — "customer name: high confidence, quantity: high
confidence, the negative requirement about strip thickness: medium confidence, correctly extracted
as a requirement rather than dropped as noise" is far more actionable for the Planner's blocker
logic than one aggregate score. This is a genuine extension to `VieUnderstanding`'s shape, flagged
here as a design decision for whoever implements it, not decided down to the exact JSON shape in
this document.

**Ambiguity handling**: when an entity is extracted with low confidence or maps to more than one
plausible master-data row (e.g., a colour name close to two different `stone_colours` entries),
the correct behavior — already the pattern VIE's resolvers use for ambiguous customers — is a
**blocker with candidates**, not a guess. Never let the LLM pick when the ERP's own data can
present a structured choice instead (§ 4.2).

**User confirmation**: unchanged from § 4.3 — the confirmation card for a multi-line accumulated
enquiry like the example above should show every extracted field, laid out exactly like the manual
enquiry form would, so the user is reviewing structured data, not the AI's paraphrase of what they
said.

### 5.3 Entity extraction engine (Part 5)

The entity list in the brief is best read as three tiers, because they have genuinely different
extraction strategies:

| Tier | Entities | Extraction approach |
|---|---|---|
| **Structured, master-data-backed** | Stone, Finish, Thickness | Fuzzy-match against real master tables (§ 3.3) — extraction *is* resolution here |
| **Structured, other-table-backed** | Customer, Vendor, Site/Project, Sales Executive | Resolved by the Planner against real records (customer/vendor/project tables, `user_roles` for sales executives) — same pattern as today's `resolveCustomer` |
| **Free-form / derived** | Phone, Email, Address, Location, Quantity, Budget, Requirement, Delivery Date, Follow-up, Reminder, Task, Special Instructions | Extracted by the LLM as typed values (regex-validated where it makes sense — phone/email formats — but not database-resolved; these are values, not references) |
| **Cross-module / meta** | Project, Estimate, Quotation, Purchase, Installation | These are the *outputs* of specific intents (a quotation is what `create_quotation` produces), not standalone entities to extract in isolation — listed here to be explicit that they're intent-level concerns, covered in § 11's roadmap, not part of the base entity extractor |

**Extensibility**: new entity types should be addable the same way VIE's own intents are — as
data/schema additions (a new Zod entity schema, a new resolver if it's master-data-backed), never
as a change to the Understand layer's core logic. This mirrors ADR-0001's own design principle for
intents (§ 5's schema table) applied one level down, to entities.

---

## 6. Entity Model

A concrete (illustrative, not final) shape for how the tiers in § 5.3 map onto data:

```ts
// Illustrative — the actual Zod schemas belong in vie/entities/*.ts at implementation time.
interface ExtractedEntity {
  type: EntityType;               // "customer" | "stone" | "quantity" | "budget" | ...
  rawText: string;                // exactly what the user said/wrote/wrote-in-roman-script
  resolvedId?: string;            // set only for master-data/record-backed types, once resolved
  resolvedTable?: string;         // e.g. "stone_colours" — which table it resolved against
  confidence: number;             // 0–1, per-entity (§5.2)
  candidates?: { id: string; label: string }[]; // populated only when ambiguous — feeds §4.2
  sourceSpan?: { start: number; end: number };  // for highlighting in the confirmation card
}
```

This is deliberately close to what `plan_blockers` and `entities` already store in `vie_actions`
today — the entity model is an evolution of the existing `jsonb` shape, not a parallel structure.
Future extensibility (images producing entities, WhatsApp producing entities) all funnel into this
same shape via the Capture Layer's `CaptureEvent` (§ 3.4) → Understand → this entity list — one
model, regardless of source modality.

---

## 7. Future Database Plan (Part 9)

**No schema changes are being made by this document.** Everything below is a catalog of what a
future implementation sprint will need to design and migrate, organized by the same discipline
VIE Phase 1 already used (one new table when genuinely needed, reuse `app_settings` for
config-as-data, extend existing tables when additive).

| Future need | Likely shape | Notes |
|---|---|---|
| **Conversation history** | New `copilot_conversations` / `copilot_messages` tables, or an extension of `vie_actions` with a `conversation_id` grouping column | Today, Copilot chat history is client-side React state only (confirmed by code search — nothing persisted). Needed for cross-device continuity and for § 4.5's "activity feed" view. |
| **Domain vocabulary / synonyms** | `synonyms text[]` column on existing master tables (§ 3.3), not a new table | Additive, nullable, defaults to `{}` — no breaking change to Sprint 1.8's just-standardized `MasterConfig` shape. |
| **Embeddings** | Postgres `pgvector` extension (not currently installed — confirmed via `package.json`/migration search, no vector extension in use anywhere today) + an `embedding vector(n)` column on whichever table needs semantic search (e.g. a future "search past enquiries by meaning" feature) | Not needed for the core VIE pipeline (which is intent-classification, not semantic search) — only needed if/when a future feature genuinely requires nearest-neighbor search rather than exact/fuzzy match. Don't add `pgvector` speculatively. |
| **Knowledge base** | Not a new table — per § 3.3, "knowledge" is the existing master-data tables plus the new `synonyms` column. If a genuinely unstructured knowledge need emerges later (policy documents, SOPs the AI should reference), that's a document-store problem (`file_objects` + OCR/embeddings), not an ERP-entity problem — worth deferring until a real use case exists. |
| **Prompt storage** | `app_settings` (existing generic KV store, already used for `vie.execution_policies`) for versioned prompt *configuration* (thresholds, feature flags); the prompt *text* itself stays in versioned source (`prompts.ts`), matching how `VIE_SYSTEM_PROMPT` already works — prompts are code, not data, so they get code review and rollback via git, not a database row. |
| **AI memory** (user-level preferences the Copilot recalls, e.g. "this user always means the Ahmedabad warehouse when they say 'the site'") | A `copilot_user_context` table, keyed by `user_id`, small structured key/value shape | Genuinely new capability, not in VIE today. Should be scoped carefully (§ 9's PII discussion) — "memory" that silently changes AI behavior needs to be visible and editable by the user, not a black box. |
| **Versioning** | `vie_actions.plan` already stores a point-in-time snapshot; extending `VieExecutionPlan` to a versioned/multi-step shape is VIE Phase 2's own Milestone 7 (already scoped in `docs/VIE-Phase2-Architecture-Review.md`) | This blueprint doesn't re-scope M7 — it inherits it. |
| **Non-interactive actor attribution** | `vie_actions.created_by` needs to become nullable, paired with a new `actor_type` (`interactive` \| `system`) column, or a dedicated system-user row | This is VIE Phase 2's Milestone 6, called out repeatedly above (§ 3.4, § 9.5) as the load-bearing prerequisite for WhatsApp/email capture. Flagged again here because it is, structurally, a database-impact item as much as an auth one. |
| **Capture source tracking** | `sourceModality`/`sourceRef` (§ 3.4's `CaptureEvent`) needs to land somewhere durable — likely new columns on `vie_actions` (`source_modality`, `source_file_id`, `source_conversation_ref`) rather than a separate table, keeping one row per action as the single audit unit | Additive columns, nullable, defaulting to `'text'`/`null` for all existing rows. |

---

## 8. API Strategy

### 8.1 Provider abstraction

Keep the existing discipline: **one server-side chokepoint per capability class**, matching
`gateway.server.ts`'s existing role for chat/completion calls.

| Capability | Chokepoint (existing or proposed) | Provider strategy |
|---|---|---|
| LLM chat/completion (intent, entities, chat) | `gateway.server.ts` (exists) | Already abstracted — no change needed |
| Speech-to-text | proposed `speech-gateway.server.ts` | One provider behind one interface; swappable |
| OCR / document extraction | proposed `ocr-gateway.server.ts`, or reuse the vision-capable LLM already behind `gateway.server.ts` if quality suffices — decide at implementation time, not here | Avoid a third dependency if the existing gateway's model can do it well enough |
| Vision / image classification | `recognizeStoneImage` already exists as an isolated helper in `copilot.functions.ts` — fold into the Capture Layer rather than leaving it a one-off | Reuses existing gateway |
| Inbound WhatsApp | New webhook endpoint (`routes/api/public/hooks/whatsapp-inbound.ts`, matching the existing `dispatch-queue.ts` webhook convention) | Requires the non-interactive execution context (§ 9.5) before it can safely call into VIE |
| Inbound Email | New inbound-email receiver (provider-dependent — e.g. a forwarding/parsing webhook) | Same prerequisite as WhatsApp |

### 8.2 Internal API surface

VIE's existing three server functions (`understandAndStage`, `confirmVieAction`,
`completeDraftAction`) are the right shape and should not multiply per modality — the Capture
Layer's entire purpose (§ 2.2) is to make every modality converge on the same
`understandAndStage(text, context)` call. The only new server-side surface needed is the
**receivers** (webhooks, upload handlers) that turn modality-specific input into that one call —
not new understand/plan/execute endpoints per channel.

### 8.3 Future external API strategy

If Stone Tech OS (or a future Vedora product) ever needs to expose Copilot capability to an
external system (e.g. a customer-facing WhatsApp bot that's a *different* surface from the
internal staff Copilot), that's a distinct, lower-trust API surface — separate rate limiting,
separate auth model (not staff credentials), and almost certainly a much more constrained intent
set (read-only status lookups, not "create a quotation"). Flagged in § 13 as a future opportunity,
explicitly not designed in this document since no such requirement exists yet.

---

## 9. Security Review (Part 10)

### 9.1 Permission model

VIE already has one, and it's sound: `requireSupabaseAuth` + `requireStaff` gate every entry
point; `vie_actions` RLS is staff-read/write (matching every other business table's staff-access
model, deliberately *not* scoped to `created_by = auth.uid()` since a manager reviewing a
teammate's pending AI action is a legitimate use case — this was a deliberate ADR-0001 decision,
not an oversight). **Extend, don't replace**: per-intent write-role gating should mirror what
Sprint 1.8 just built for master pages (`writeRoles`, § "Master Config Review" in
`docs/master-list-standardization.md`) — e.g., if a future intent creates a Purchase Order, the
Action Registry handler should be gated by whatever role already governs manual PO creation, not a
separate "can use AI" permission. **The AI should never have a capability a human without the
matching role doesn't already have** — it's a faster way to exercise existing permissions, not a
privilege escalation path.

### 9.2 PII handling

Voice recordings, WhatsApp message content, and OCR'd documents will routinely contain customer
PII (phone numbers, addresses, sometimes payment details mentioned in passing). Concrete
recommendations: raw voice audio should not be retained longer than needed to produce and confirm
a transcript (a short TTL, not indefinite storage) unless the user explicitly opts to keep it
attached to a record; `file_objects` already has the storage/access-control infrastructure — reuse
its existing RLS pattern rather than inventing a separate one for AI-sourced files; § 7's proposed
"AI memory" table is the highest-PII-risk new surface in this whole blueprint and should be scoped
minimally (operational preferences, not free-text personal details) and made visible/editable by
the user it's about, not silently accumulated.

### 9.3 Prompt injection protection

Two distinct attack surfaces: **content the user types** (already reasonably contained — VIE's
existing `unsupported` escape hatch and the Copilot's "STRICT DATA RULE" no-fabrication system
prompt are exactly the right shape of defense, and should be preserved, not relaxed, as write
capability increases) and **content arriving from outside the user's own typed input** — a
WhatsApp message, an OCR'd document, an email body — which is a materially higher-risk surface
because it's attacker-reachable without needing the attacker to be a logged-in staff member at
all. Recommendation: content from inbound channels should never be treated as instructions to the
system prompt, only as *data to be classified* — the existing architecture already enforces this
distinction structurally (the LLM call in `understand()` only ever produces a classification, never
executes anything itself), which is a real, non-trivial defense already built in; it should be
explicitly preserved as a design invariant as more input sources are added, not weakened for
convenience.

### 9.4 Hallucination prevention

The existing "the LLM understands, the ERP decides" principle already is the hallucination
defense: entities are extracted, then **resolved against real data** (§ 3.3, § 5.3) — a
hallucinated stone name simply fails to resolve and becomes a blocker, not a written value. This
principle needs to hold for every new entity/intent added, not just the two VIE has today — worth
stating as an explicit, checked design invariant (§ 9.6) for whoever reviews future Action Registry
additions.

### 9.5 Confirmation before writes

Already the core of VIE's execution-policy model (`auto`/`confirm`/`draft`). The one structural
gap, called out repeatedly in this document because it is genuinely the load-bearing piece: **any
non-interactive capture source (WhatsApp, email, scheduled jobs) needs its own, more conservative
default policy** — an inbound WhatsApp message that VIE classifies as `log_enquiry` should very
plausibly default to `draft`, not `auto` or even `confirm`-with-no-reviewer, because there's no
guarantee a staff member sees it promptly. This is exactly the shape of VIE Phase 2's own Milestone
8 ("First Autonomous Trigger... DRAFT-only... nothing auto-executes without a human") — this
blueprint adopts that same conservatism as the default posture for every future inbound channel,
not just the one milestone it was originally scoped for.

### 9.6 Audit logging

`vie_actions` already is a full-lifecycle audit trail. Extensions this blueprint implies: capture
source (§ 7's proposed `source_modality`/`source_file_id` columns) so an auditor can trace a
written record back to the original voice clip or WhatsApp message, not just the transcribed text;
and — matching Sprint 1.7.1's own genuine-audit-data principle ("never fabricated... `null` when
unavailable") — any confidence or provider-latency metadata logged should be real values from the
actual call, never a placeholder.

---

## 10. Performance & Cost (Part 11)

### 10.1 Latency

The existing pipeline's latency floor is one `chatJson` round-trip (already true today for
`log_enquiry`/`note_followup`). Each new modality adds its own latency stage in front of that
floor, not on top of it multiplicatively: STT (voice), OCR (documents), a vision call (images) —
each is a separate, sequential stage the Capture Layer runs *before* handing text to `understand()`,
so total latency is additive per stage, and each stage should be able to show its own progress
(the streaming-transcription UX in § 3.2 exists specifically to make the STT stage not feel like
dead air).

### 10.2 Caching

Two clear caching opportunities, both cheap: the domain-vocabulary index (§ 3.3) should be cached
with a short TTL/invalidate-on-write rather than queried per request; and repeated/near-identical
utterances (unlikely at individual-user scale, but worth noting) are not currently cached anywhere
in the LLM call path — not a priority for v1, noted for completeness.

### 10.3 Streaming

Already covered per-modality (§ 3.2 voice; § 4.1's UI could show partial entity extraction as it
arrives for long multi-line inputs like § 5.2's example, though this is a UX enhancement, not a
correctness requirement — ship non-streaming entity extraction first, add streaming display later
if latency on long inputs proves it's needed).

### 10.4 Background processing

Anything not on the "user is actively watching this response" critical path — OCR of a batch of
uploaded documents, re-indexing the vocabulary cache, a scheduled draft-generation job (VIE Phase 2
Milestone 8) — should run through the existing `message_queue`-style async pattern
(`dispatch.server.ts` already proves this pattern works in this codebase for outbound messages)
rather than inline in a request handler, especially given the Cloudflare Workers request-CPU-time
ceiling the VIE Phase 2 review already flagged as a real risk for any modality slower than a single
chat completion.

### 10.5 Cost optimization & model selection

The existing single-gateway, single-default-model (`google/gemini-2.5-flash`) setup is
already cost-conscious — a fast, cheap model for classification-shaped work, which is what
Understand fundamentally is. Recommendation: keep this as the default for all classification/
extraction calls, and treat any future need for a stronger model (e.g. a genuinely open-ended
multi-step reasoning task, once VIE Phase 2's Milestone 7 multi-step plans exist) as an explicit,
per-intent override — configured as data (extending the existing `app_settings`-backed policy
model, § 2.1) rather than a blanket upgrade that raises cost for every simple classification too.

### 10.6 Fallback models

Not currently implemented (the VIE Phase 2 review already flagged "no retry/backoff on the LLM call
path" as a High-severity gap, independent of this blueprint). Recommendation: mirror the existing,
already-proven `message_queue` retry/backoff pattern for the gateway call path — this closes a gap
VIE already has, and Copilot v2 inherits the benefit rather than needing a separate design.

---

## 11. Development Roadmap (Part 12)

This roadmap **starts from and extends** VIE Phase 2's own roadmap
(`docs/VIE-Phase2-Architecture-Review.md` § 10, milestones M1–M8) rather than replacing it — that
roadmap's M1 (hardening/CI), M6 (non-interactive execution context), and M7 (multi-step plans) are
hard prerequisites for several releases below and are referenced by name, not re-specified.

| Release | Scope | Dependencies | Complexity | Est. effort | Business value | Risk |
|---|---|---|---|---|---|---|
| **R1 — AI Foundation: wire the UI to VIE** | Connect the existing Copilot panel to `understandAndStage`/`confirmVieAction`/`completeDraftAction`; build the confirmation-card UI (§4.3), the missing-info follow-up UI (§4.2), and undo for the two existing `AUTO`-eligible intents (§4.4). No new intents, no new modalities. | VIE Phase 2 M1 (hardening) should land first — building a UI on top of an unhardened critical safety function (`resolveEffectiveMode`) is exactly the wrong order. | Medium — mostly UI work against an already-solid backend | 2–3 weeks | High — this alone makes the entire existing VIE investment usable for the first time | Low — additive UI, no core pipeline changes |
| **R2 — Entity Extraction & Domain Grounding** | Build the vocabulary index + fuzzy-match service (§3.3), the `synonyms` schema addition, per-entity confidence (§5.2), structured blockers-with-candidates (this is VIE Phase 2's own M5, adopted here) | R1 (needs the confirmation-card UI to actually show the richer entities) | Medium-High | 3–4 weeks | High — this is what makes extraction accurate enough for the brief's mixed-language example to actually work well | Medium — fuzzy-matching quality needs real iteration against real historical enquiry text, not just design |
| **R3 — create_quotation, done properly** | Finish line-item/price extraction for `create_quotation` (currently partial per VIE's own code comments) — the VIE Phase 2 review's own recommended next production action | R2 (line items need entity/domain grounding to resolve products/rates) | Medium-High | 3 weeks | High — quotations are a core, frequent workflow | Medium — richer entity shape than any existing intent; needs the multi-item Zod schema work the Phase 2 review already scoped |
| **R4 — Multilingual UI** | `i18next` integration, English/Hindi/Gujarati catalogs for UI/validation/PDFs/notifications/settings (§3.1) | None on the AI work — can run in parallel with R1–R3 | Medium (mechanical but large surface area — every screen) | 4–6 weeks (largely translation-content-bound, not engineering-bound) | High — genuinely opens the product to non-English-first staff, independent of AI progress | Low technically; translation quality/completeness is the real risk, not the architecture |
| **R5 — Voice ERP** | STT gateway (§3.2), streaming transcription UI, correction flow reusing the R1 confirmation UX | R1 (needs the composer/confirmation UI to attach to); benefits from R4 (voice + non-English UI together is the strongest version of the vision) | Medium-High | 4 weeks | High — the most differentiating modality in the brief | Medium — provider selection, real-world noise conditions need field testing beyond design |
| **R6 — Non-Interactive Execution Context** | VIE Phase 2's M6, adopted verbatim as its own release given how many later releases depend on it | VIE Phase 2 M1, M2, M3 | High — real RLS/security-model change, deserves dedicated review per the Phase 2 audit's own words | 2–3 weeks, but should not be rushed | Foundational — unlocks R7 and R8; zero standalone user-facing value on its own | High if rushed, low if given the dedicated review the Phase 2 audit recommends |
| **R7 — Document & Image Capture** | OCR normalizer, image/vision capture wired into the Capture Layer (folding in the existing standalone `recognizeStoneImage` helper), `source_file_id` audit linkage (§7) | R2 (extracted text still needs domain grounding), R6 only if documents can arrive without a live session (e.g. a shared inbox) — if capture stays "staff uploads a file while logged in," R6 is not required for this release specifically | Medium | 3–4 weeks | Medium-High — real operational pain point (vendor invoices, delivery challans) | Medium — OCR quality on real-world scanned documents needs field validation |
| **R8 — WhatsApp/Email Inbound Capture** | Inbound webhook receivers (§8.1), conservative default policy for non-interactive capture (§9.5), wired into R6's execution context | R6 (hard prerequisite — this is precisely the capability R6 exists to unlock), R2, R7 | High | 4–5 weeks | High — closes the loop on genuinely how this business already communicates (WhatsApp-first) | High — first genuinely unattended capability; needs the conservative-default-policy discipline (§9.5) enforced, not assumed |
| **R9 — Knowledge Engine** | Multi-step execution plans (VIE Phase 2's M7, adopted here), richer domain knowledge (synonym coverage expansion, usage-driven vocabulary tuning) | R2, R3, R6 | High | Multi-sprint, sequenced after the above | Medium-High — enables cross-module orchestration the long-term vision calls for | Medium — M7's own partial-failure/sequencing design work needs to happen deliberately, per the Phase 2 review |
| **R10 — Predictive ERP** | Proactive suggestions (e.g. "these 3 follow-ups look overdue, draft notes for all?" — VIE Phase 2's M8 "first autonomous trigger" is the seed of this), analytics-driven prompts | R6, R9, and real usage data from R1–R8 to know what's actually worth predicting | High | Not estimated — genuinely depends on what R1–R8 reveal about real usage patterns | Speculative until R1–R8 data exists | Medium — the main risk here is designing predictions nobody wants; sequence this last on purpose |

**Sequencing note**: R1 and R4 (multilingual UI) have no dependency on each other and can run in
parallel tracks. R2/R3 should not start before R1 ships, since there'd be no UI to validate richer
extraction against. R6 is the single highest-leverage release to not delay, since R8 (and any real
version of R9/R10) is structurally blocked without it — but per the Phase 2 review's own explicit
warning, it should not be built "as a side effect of the first feature that needs it."

---

## 12. Risks (cross-cutting register)

| Risk | Where it's detailed | Severity |
|---|---|---|
| Building inbound (WhatsApp/email) capture before the non-interactive execution context exists | §3.4, §9.5, R8 | High if attempted out of sequence |
| Rushing R6's RLS/security-model change under feature-delivery pressure | §11 (R6), quoting VIE Phase 2's own warning | High if rushed |
| Conflating "AI understands multiple languages" with "the UI is translated" and under-scoping either | §3.1 | Medium — mostly a planning/estimation risk, not a technical one |
| Fuzzy-matching/domain-grounding quality not validated against real historical data before shipping | §11 (R2) | Medium |
| OCR/STT quality assumptions not validated against real field conditions (noisy stone yards, handwritten/low-quality scanned documents) | §3.2, §11 (R5, R7) | Medium |
| "AI memory" (§7) becoming an opaque, unreviewable accumulation of inferred user preferences | §9.2 | Medium — mitigated by making it visible/editable by design, not an afterthought |
| Undo semantics promised more broadly than they're actually safe to implement | §4.4 | Medium |
| Cost creep from defaulting new, more complex intents to a stronger/more expensive model without an explicit per-intent decision | §10.5 | Low-Medium, easy to prevent by policy |
| Cloudflare Workers' request-CPU-time ceiling hit by a slow modality (long OCR/transcription) run inline in a `createServerFn` | §3.2, §10.4, inherited from the VIE Phase 2 review | Medium — needs background-processing discipline (§10.4) applied consistently as new modalities land |
| VIE Phase 1's own still-open Critical/High debt items (no CI-enforced tests, no automated single-write-path guard for new Action Registry handlers) not being closed before Copilot v2 adds many more handlers | Inherited directly from `docs/VIE-Phase2-Architecture-Review.md` §7, §11 | High — the more handlers this blueprint's roadmap adds, the more this un-enforced discipline matters |

---

## 13. Future Opportunities

Beyond the roadmap in § 11 — ideas worth having on record, deliberately not scoped into any
release above because they either depend on real usage data that doesn't exist yet or are
platform-level bets beyond Stone Tech OS's own near-term needs:

- **On-device/offline STT** for genuinely offline voice capture (§3.2's noted limitation) — a
  platform-level capability, not a Copilot feature, if it's ever pursued.
- **A customer-facing (not just staff-facing) conversational surface** — e.g. a WhatsApp bot
  customers themselves can message for order status — deliberately excluded from § 8.3's internal
  API strategy as a distinct, lower-trust surface needing its own design pass.
- **Second Vedora Vision product reuse** — once a second product exists, the platform/product split
  in § 2.3 should be revisited with a real second consumer in hand, likely graduating the
  product-agnostic pieces (gateway, Understand mechanics, Planner/Workflow Engine core, Capture
  Layer normalizers) into a genuinely shared package/repo structure rather than duplicated-by-copy
  across two product repos.
- **Proactive/predictive suggestions at real scale** (§ 11's R10) — genuinely worth waiting on until
  R1–R8 produce real usage data on what staff actually ask for, rather than designing predictions
  speculatively now.
- **Semantic search over historical business data** (past enquiries, quotations, customer
  interactions) via the `pgvector` path noted in § 7 — a real opportunity, explicitly deferred
  until a concrete "find similar past X" use case justifies the new infrastructure.
- **A dedicated AI-usage analytics view** — confidence distributions, auto-execution accuracy over
  time, per-intent cost — the natural evolution of § 9.6's audit logging once there's enough volume
  for it to be more than a curiosity; VIE Phase 2's own Milestone 2 (Observability Baseline) is the
  seed of this and should graduate into a real dashboard once R1–R3 are producing meaningful
  volume.

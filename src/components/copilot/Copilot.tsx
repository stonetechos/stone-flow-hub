/**
 * Floating AI Copilot — right-side sheet with context-aware chat.
 *
 * Mounted once in AppShell so it is available on every authenticated page.
 * Context is derived from the current router path; the server function adds
 * a compact system prompt tailored to the page.
 */
import { useEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import {
  Sparkles,
  Send,
  Loader2,
  X,
  Bookmark,
  Trash2,
  ChevronDown,
  ArrowRight,
  SearchX,
  Mic,
  MicOff,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { toast } from "sonner";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { askCopilot } from "@/lib/ai/copilot.functions";
import { nlSearch } from "@/lib/ai/nl-search.functions";
import type { NlResultItem } from "@/lib/ai/nl-search/types";
import { understandAndStage, confirmVieAction, completeDraftAction } from "@/lib/vie/vie.functions";
import type { VieActionStatus } from "@/lib/vie/types";
import { toUserMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { useExecutiveInsights } from "@/hooks/useExecutiveInsights";
import { useInsightLifecycle } from "@/lib/insights/state/hooks";
import { InsightCard } from "@/components/dashboard/InsightCard";
import { VieActionMessage, type VieActionRow } from "@/components/copilot/VieActionCard";
import { useSpeechCapture } from "@/lib/voice/useSpeechCapture";
import { StonemanMascot } from "@/components/mascot/StonemanMascot";

type ChatMsg = { role: "user" | "assistant"; kind?: "text"; content: string };
/** Phase G.9B.1 — a data-lookup answer. Rendered as one-click result
 *  cards instead of AI prose, since the results come from real API
 *  calls (see nl-search/resolve.ts), never from the LLM. */
type NlResultsMsg = {
  role: "assistant";
  kind: "nl-results";
  interpretation: string;
  results: NlResultItem[];
};
/** Sprint AI-1 — one `vie_actions` row, staged via understandAndStage() and
 *  advanced via confirmVieAction()/completeDraftAction() as the user acts on
 *  it. Rendering lives entirely in VieActionCard.tsx; this file only owns
 *  the mutations that call the three VIE server functions and keeps the
 *  row's local copy in sync with what they return. */
type VieActionMsg = { role: "assistant"; kind: "vie-action"; row: VieActionRow };
type Msg = ChatMsg | NlResultsMsg | VieActionMsg;

/** "Do" mode prompt starters — illustrative examples of the four intents
 *  VIE currently supports (log_enquiry, note_followup, create_customer,
 *  create_quotation), not tied to the current route the way "Ask" mode's
 *  CONTEXT_HINTS suggestions are. */
const DO_MODE_SUGGESTIONS = [
  "Log an enquiry for Ramesh Patel, 200 sqft Mint marble at Rs 85/sqft",
  "Remind me to follow up with this customer in 3 days",
  "Add a new customer: Shantilal Patel, 9876543210, Naroda",
];

// Suggestion prompts are how-to / explanation questions only. They must NEVER
// invite the assistant to list, rank, or invent specific business records —
// the assistant has no database access from the chat and would otherwise
// hallucinate customer, project, quote, PO, or vendor identifiers.
const CONTEXT_HINTS: Array<{ match: RegExp; entity: string; suggestions: string[] }> = [
  {
    match: /^\/customers\/[^/]+/,
    entity: "customer",
    suggestions: [
      "How do I log a follow-up on this customer?",
      "What does the credit-limit warning mean?",
    ],
  },
  {
    match: /^\/customers/,
    entity: "customers",
    suggestions: ["How is customer health scored?", "How do I import customers in bulk?"],
  },
  {
    match: /^\/projects\/[^/]+/,
    entity: "project",
    suggestions: ["Explain the project lifecycle stages", "How do I record a project milestone?"],
  },
  {
    match: /^\/projects/,
    entity: "projects",
    suggestions: [
      "How is pipeline value calculated?",
      "How do I move a project to the next stage?",
    ],
  },
  {
    match: /^\/rfqs\/[^/]+/,
    entity: "rfq",
    suggestions: [
      "How does vendor scoring work?",
      "How do I convert an RFQ into a purchase order?",
    ],
  },
  {
    match: /^\/rfqs/,
    entity: "rfqs",
    suggestions: [
      "What is the difference between an enquiry and an RFQ?",
      "How do I invite a vendor to quote?",
    ],
  },
  {
    match: /^\/enquiries\/[^/]+/,
    entity: "enquiry",
    suggestions: ["How do I create a quotation from an enquiry?", "How is enquiry health scored?"],
  },
  {
    match: /^\/enquiries/,
    entity: "enquiries",
    suggestions: ["What signals indicate a cold enquiry?", "How do I set the next best action?"],
  },
  {
    match: /^\/quotes\/[^/]+/,
    entity: "quotation",
    suggestions: ["How is quote margin computed?", "How do I record customer approval on a quote?"],
  },
  {
    match: /^\/manufacturing\/[^/]+/,
    entity: "production_order",
    suggestions: ["How do I update production stage progress?", "How does the QC checklist work?"],
  },
  {
    match: /^\/manufacturing/,
    entity: "manufacturing",
    suggestions: [
      "Explain the manufacturing stage flow",
      "How do I release a sales order to production?",
    ],
  },
  {
    match: /^\/vendors\/[^/]+/,
    entity: "vendor",
    suggestions: [
      "How is the vendor health score calculated?",
      "How do I record a vendor payment?",
    ],
  },
  {
    match: /^\/inventory/,
    entity: "inventory",
    suggestions: ["How is reorder level determined?", "How do I record a stock movement?"],
  },
  {
    match: /^\/dashboard/,
    entity: "dashboard",
    suggestions: [
      "How is the business health score calculated?",
      "What does the Cash Today figure include?",
    ],
  },
  {
    match: /^\/dashboards\/management/,
    entity: "management",
    suggestions: ["How is pipeline value defined?", "How is estimated margin computed?"],
  },
];

/** Insight.entity.type values differ slightly from Copilot's own context
 *  vocabulary in one place — quotes are "quotation" here, "quote" on the
 *  Insight itself. Only entries that actually differ need listing. */
const ENTITY_TYPE_MAP: Record<string, string> = { quotation: "quote" };

function deriveContext(path: string) {
  for (const hint of CONTEXT_HINTS) {
    const m = path.match(hint.match);
    if (m) {
      // Only "detail" hints (whose pattern captures a trailing `/[^/]+`
      // segment, e.g. `/^\/customers\/[^/]+/`) actually point at a real
      // entity id. "List"/section hints like `/^\/dashboard/` have no id
      // segment at all - treating their second path part (e.g. "command-center"
      // in `/dashboards/command-center`) as an entityId was scoping Copilot's
      // insight filter to a bogus entity.type/entity.id pair that no real
      // Insight ever matches, which forced the empty-state even though
      // processedInsights was non-empty.
      const expectsId = hint.match.source.includes("[^/]+");
      const parts = path.split("/").filter(Boolean);
      const idPart = expectsId && parts[1] && parts[1].length >= 6 ? parts[1] : undefined;
      return { entity: hint.entity, entityId: idPart, suggestions: hint.suggestions };
    }
  }
  return {
    entity: "app",
    entityId: undefined,
    suggestions: ["How do I navigate STOS?", "Where do I find real-time business priorities?"],
  };
}

export function Copilot() {
  const [open, setOpen] = useState(false);
  const [isWideScreen, setIsWideScreen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [bookmarks, setBookmarks] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  // Explicit mode toggle rather than an auto-router: "Ask" is
  // the existing nl-search/askCopilot path, completely unchanged below;
  // "Do" sends the message to understandAndStage() instead. Keeping the
  // choice explicit (rather than guessing intent with a third classifier)
  // avoids adding a new routing layer on top of two LLM systems that don't
  // share a decision boundary today.
  const [mode, setMode] = useState<"ask" | "do">("ask");
  // Insights layout only (Phase G.7 data untouched): expanded by default,
  // independently scrollable, and collapsible so it can never grow large
  // enough to push the chat composer off-screen.
  const [insightsOpen, setInsightsOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Voice-capture foundation (Goal 5) — see useSpeechCapture.ts's header
  // for exactly what this does and does not handle. Transcript is synced
  // live into the same `input` state the textarea already uses below, so
  // it flows through the unmodified understandAndStage()/askCopilot path —
  // no new parsing added, per the brief's "do not hardcode parsing rules."
  const speech = useSpeechCapture();
  useEffect(() => {
    if (speech.isListening) setInput(speech.transcript);
  }, [speech.transcript, speech.isListening]);
  useEffect(() => {
    if (speech.error) toast.error(speech.error);
  }, [speech.error]);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const ctx = deriveContext(path);
  const { processedInsights } = useExecutiveInsights();
  const scopedInsights = ctx.entityId
    ? processedInsights.filter(
        (i) =>
          i.entity.type === (ENTITY_TYPE_MAP[ctx.entity] ?? ctx.entity) &&
          i.entity.id === ctx.entityId,
      )
    : processedInsights;
  // Phase G.8.6 Task 3: same shared lifecycle EntityInsightPanel and
  // DangerNotifications read/write, so dismissing here also stops the
  // insight from resurfacing on a customer page or as a toast.
  const { active: activeInsights, setStatus: setInsightStatus } =
    useInsightLifecycle(scopedInsights);
  const topInsights = [...activeInsights]
    .sort((a, b) => b.normalizedPriority - a.normalizedPriority)
    .slice(0, 5);

  // Phase G.9B.1: Natural Language Search. This mutation is the ONLY
  // caller of the NL Search server function — it runs one LLM
  // classification call, then either renders real, deterministically
  // fetched results (data question) or falls through to the existing,
  // unmodified `askCopilot` chat mutation below (general/how-to
  // question, or if classification itself failed). askCopilot's own
  // STRICT DATA RULE and behavior are untouched.
  const nlSearchMutation = useMutation({
    // Phase G.10: page context is passed through so "this customer"/
    // "this project"-style timeline questions resolve to the record the
    // user is actually looking at (see resolveTimelineIntent()).
    mutationFn: (query: string) =>
      nlSearch({ data: { query, context: { entity: ctx.entity, entityId: ctx.entityId } } }),
    onSuccess: (res, query) => {
      if (res.intent.intent === "chat") {
        send.mutate(query);
        return;
      }
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          kind: "nl-results",
          interpretation: res.interpretation,
          results: res.results,
        },
      ]);
    },
    onError: (_e, query) => {
      // Classification call failed - don't block the user, fall back to
      // the existing chat path exactly as if this phase didn't exist.
      send.mutate(query);
    },
  });

  const send = useMutation({
    mutationFn: async (prompt: string) => {
      const history = messages
        .filter((m): m is ChatMsg => m.kind !== "nl-results" && m.kind !== "vie-action")
        .slice(-8)
        .map(({ role, content }) => ({ role, content }));
      return askCopilot({
        data: {
          prompt,
          context: { route: path, entity: ctx.entity, entityId: ctx.entityId },
          history,
        },
      });
    },
    onSuccess: (r) => setMessages((m) => [...m, { role: "assistant", content: r.reply }]),
    onError: (e) => {
      const msg = toUserMessage(e);
      toast.error(msg);
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${msg}` }]);
    },
  });

  // "Do" mode's only entry point. Calls understandAndStage()
  // exactly as vie.functions.ts defines it: a fresh client-generated
  // requestId per submission (its idempotency key), the raw text, and the
  // same page-context passthrough nl-search already sends. The returned row
  // is rendered by VieActionMessage based purely on its `status` — this
  // mutation's only job is staging it and appending it to the thread.
  const stageAction = useMutation({
    mutationFn: (text: string) =>
      understandAndStage({
        data: {
          requestId: crypto.randomUUID(),
          text,
          context: { entityType: ctx.entity, entityId: ctx.entityId },
        },
      }),
    onSuccess: (row) => setMessages((m) => [...m, { role: "assistant", kind: "vie-action", row }]),
    onError: (e) => {
      const msg = toUserMessage(e);
      toast.error(msg);
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${msg}` }]);
    },
  });

  /** Both confirmVieAction() and completeDraftAction() return an
   *  ExecuteActionResult (status/linkedRecordType/linkedRecordId/message),
   *  not a full row — merge it into the matching message's stored row
   *  rather than re-fetching, mirroring how the rest of this panel keeps
   *  state client-side. */
  function applyActionResult(
    actionId: string,
    result: {
      status: VieActionStatus;
      linkedRecordType: string | null;
      linkedRecordId: string | null;
      message?: string;
    },
  ) {
    setMessages((msgs) =>
      msgs.map((m) =>
        m.kind === "vie-action" && m.row.id === actionId
          ? {
              ...m,
              row: {
                ...m.row,
                status: result.status,
                linked_record_type: result.linkedRecordType,
                linked_record_id: result.linkedRecordId,
                error_message:
                  result.status === "failed"
                    ? (result.message ?? m.row.error_message)
                    : m.row.error_message,
              },
            }
          : m,
      ),
    );
  }

  const confirmAction = useMutation({
    mutationFn: (actionId: string) => confirmVieAction({ data: { actionId } }),
    onSuccess: (result, actionId) => applyActionResult(actionId, result),
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const completeDraft = useMutation({
    mutationFn: ({ actionId, patch }: { actionId: string; patch: Record<string, unknown> }) =>
      completeDraftAction({ data: { actionId, patch } }),
    onSuccess: (result, { actionId }) => applyActionResult(actionId, result),
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const isPending = send.isPending || nlSearchMutation.isPending || stageAction.isPending;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isPending]);

  // ⌘/Ctrl + J toggles the copilot
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  function submit(prompt?: string) {
    const text = (prompt ?? input).trim();
    if (!text || isPending) return;
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    if (mode === "do") {
      stageAction.mutate(text);
    } else {
      nlSearchMutation.mutate(text);
    }
  }

  function bookmarkLast() {
    const last = [...messages]
      .reverse()
      .find(
        (m): m is ChatMsg =>
          m.role === "assistant" && m.kind !== "nl-results" && m.kind !== "vie-action",
      );
    if (!last) return;
    setBookmarks((b) => [last, ...b].slice(0, 20));
    toast.success("Bookmarked");
  }

  return (
    <>
      <StonemanMascot
        onClick={() => setOpen(true)}
        className={open ? "pointer-events-none opacity-0 transition-opacity duration-200" : ""}
      />
      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity duration-300 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            className={cn(
              "fixed z-50 flex flex-col items-center justify-end overflow-visible focus:outline-none transition-all duration-300",
              isWideScreen
                ? "inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 bottom-3 sm:bottom-4 w-full sm:w-[760px] md:w-[840px] max-w-[calc(100vw-24px)] h-[min(90dvh,820px)]"
                : "right-2 sm:right-6 md:right-8 bottom-3 sm:bottom-4 w-full sm:w-[480px] md:w-[520px] max-w-[calc(100vw-16px)] h-[min(90dvh,780px)]",
            )}
          >
            <DialogPrimitive.Title className="sr-only">
              Stoneman AI Cognitive Screen
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Intelligent big screen held by StoneMan Mascot
            </DialogPrimitive.Description>

            {/* StoneMan Mascot Sitting on Top & Holding the Screen */}
            <div className="relative z-20 flex w-full justify-center select-none pointer-events-none -mb-5 sm:-mb-6 shrink-0">
              {/* Stone Energy Aura Glow */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-48 h-20 rounded-full bg-teal-500/25 blur-2xl -z-10 animate-pulse" />
              <img
                src="/stoneman-peeking-top.png"
                alt="StoneMan AI Mascot"
                className="h-24 sm:h-32 md:h-36 w-auto max-w-full object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.65)] select-none pointer-events-none"
                draggable={false}
              />
            </div>

            {/* Stone Body Hugging the Window from the Back */}
            <div className="pointer-events-none absolute -inset-1.5 sm:-inset-2.5 top-14 bottom-2 -z-10 rounded-[28px] sm:rounded-[36px] bg-gradient-to-b from-slate-700/50 via-slate-850/40 to-slate-900/60 border border-slate-700/50 shadow-2xl backdrop-blur-xs" />
            <div className="pointer-events-none absolute -inset-3 sm:-inset-5 top-12 bottom-0 -z-20 rounded-[36px] bg-teal-500/10 blur-2xl" />

            {/* The Big Screen Console Frame */}
            <div className="relative z-10 flex flex-1 min-h-0 w-full flex-col overflow-hidden rounded-2xl sm:rounded-3xl border-2 sm:border-[3px] border-slate-700/80 bg-slate-950/95 shadow-[0_25px_80px_rgba(0,0,0,0.7)] backdrop-blur-2xl ring-1 ring-teal-500/30 text-slate-100">
              {/* Screen Top Bezel Grip Notch (held by StoneMan's hands) */}
              <div className="flex h-7 w-full items-center justify-center bg-slate-900/90 border-b border-slate-800/80 px-4 select-none shrink-0">
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-[9px] font-mono tracking-widest text-teal-400">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-teal-500" />
                  </span>
                  STONEMAN SCREEN
                </div>
              </div>

              {/* Console Header */}
              <div className="flex flex-col border-b border-slate-800/90 bg-slate-900/70 px-3.5 sm:px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#083b43] to-teal-500 p-0.5 shadow-md">
                    <img
                      src="/stoneman-avatar.png"
                      alt="Stoneman AI"
                      className="h-full w-full rounded-[10px] object-cover"
                    />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="font-display text-sm font-bold tracking-tight text-white">
                        Stoneman AI
                      </span>
                      <span className="text-[10px] font-semibold text-teal-400 uppercase tracking-wide">
                        • LIVE
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Intelligent Mascot & Operations Screen
                    </span>
                  </div>

                  {/* Entity context chip */}
                  <Badge
                    variant="outline"
                    className="ml-auto text-[10px] uppercase font-mono tracking-wider border-teal-500/30 bg-teal-950/40 text-teal-300"
                  >
                    {ctx.entity}
                  </Badge>

                  {/* Expand / Minimize toggle button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-800 hidden sm:inline-flex"
                    onClick={() => setIsWideScreen((v) => !v)}
                    title={isWideScreen ? "Dock to Side" : "Expand Big Screen"}
                  >
                    {isWideScreen ? (
                      <Minimize2 className="h-3.5 w-3.5" />
                    ) : (
                      <Maximize2 className="h-3.5 w-3.5" />
                    )}
                  </Button>

                  {/* Close button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-800"
                    onClick={() => setOpen(false)}
                    title="Close Screen"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Ask / Do Mode Tabs */}
                <div className="mt-2 flex items-center justify-between gap-2">
                  <Tabs
                    value={mode}
                    onValueChange={(v) => setMode(v as "ask" | "do")}
                    className="w-auto"
                  >
                    <TabsList className="h-7 bg-slate-950/80 border border-slate-800 p-0.5">
                      <TabsTrigger
                        value="ask"
                        className="h-6 px-3 text-xs data-[state=active]:bg-teal-600 data-[state=active]:text-white text-slate-400"
                      >
                        Ask Guidance
                      </TabsTrigger>
                      <TabsTrigger
                        value="do"
                        className="h-6 px-3 text-xs data-[state=active]:bg-teal-600 data-[state=active]:text-white text-slate-400"
                      >
                        Do Actions
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <p className="text-[11px] text-slate-400 truncate max-w-[240px] hidden md:block">
                    {mode === "do"
                      ? "Describe what to create or update"
                      : "How-to guidance for this page"}
                  </p>
                </div>
              </div>

              {/* Insights Accordion */}
              <div className="flex-shrink-0 border-b border-slate-800 bg-slate-900/40">
                <button
                  type="button"
                  onClick={() => setInsightsOpen((v) => !v)}
                  aria-expanded={insightsOpen}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-left text-slate-300 hover:text-white transition-colors"
                >
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Insights
                  </h3>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-slate-400 transition-transform",
                      insightsOpen && "rotate-180",
                    )}
                  />
                </button>
                {insightsOpen && (
                  <div className="max-h-[26dvh] overflow-y-auto px-4 pb-3">
                    {topInsights.length === 0 ? (
                      <p className="text-xs text-slate-400">Everything looks healthy.</p>
                    ) : (
                      <div className="space-y-2">
                        {topInsights.map((i) => (
                          <InsightCard
                            key={i.id}
                            kind={i.kind}
                            tone={i.tone}
                            title={i.title}
                            detail={i.why}
                            to={i.action.href}
                            onDismiss={() => setInsightStatus(i, "dismissed")}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Chat Message Scroll Area */}
              <ScrollArea className="min-h-0 flex-1 bg-slate-950/60">
                <div ref={scrollRef} className="space-y-3 p-4">
                  {messages.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/40 p-3.5 text-sm">
                      <p className="mb-2 font-medium text-slate-200">Try one of these:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(mode === "do" ? DO_MODE_SUGGESTIONS : ctx.suggestions).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => submit(s)}
                            className="rounded-full border border-slate-800 bg-slate-900/90 px-3 py-1 text-xs text-slate-300 hover:border-teal-500/50 hover:bg-slate-800 hover:text-white transition-colors"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {messages.map((m, i) =>
                    m.kind === "nl-results" ? (
                      <NlResultsBubble
                        key={i}
                        interpretation={m.interpretation}
                        results={m.results}
                        onNavigate={() => setOpen(false)}
                      />
                    ) : m.kind === "vie-action" ? (
                      <VieActionMessage
                        key={i}
                        row={m.row}
                        onConfirm={(actionId) => confirmAction.mutate(actionId)}
                        onCompleteDraft={(actionId, patch) =>
                          completeDraft.mutate({ actionId, patch })
                        }
                        confirmPending={
                          confirmAction.isPending && confirmAction.variables === m.row.id
                        }
                        completePending={
                          completeDraft.isPending && completeDraft.variables?.actionId === m.row.id
                        }
                      />
                    ) : (
                      <Bubble key={i} role={m.role} content={m.content} />
                    ),
                  )}
                  {isPending && (
                    <div className="flex items-center gap-2 text-sm text-teal-400">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
                    </div>
                  )}

                  {bookmarks.length > 0 && (
                    <details className="mt-4 rounded-xl border border-slate-800 bg-slate-900/40 p-2.5 text-sm">
                      <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-slate-400">
                        Bookmarks ({bookmarks.length})
                      </summary>
                      <div className="mt-2 space-y-2">
                        {bookmarks.map((b, i) => (
                          <div
                            key={i}
                            className="rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs text-slate-300"
                          >
                            {b.content.slice(0, 240)}
                            {b.content.length > 240 ? "…" : ""}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </ScrollArea>

              {/* Bottom Pinned Composer */}
              <div className="flex-shrink-0 border-t border-slate-800/90 bg-slate-900/80 p-3">
                <div className="mb-2 flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={bookmarkLast}
                    disabled={messages.length === 0}
                    className="h-6 px-2 text-xs text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <Bookmark className="mr-1 h-3 w-3" /> Bookmark
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMessages([])}
                    disabled={messages.length === 0}
                    className="h-6 px-2 text-xs text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <Trash2 className="mr-1 h-3 w-3" /> Clear
                  </Button>
                  <span className="ml-auto text-[10px] text-slate-500 hidden sm:inline font-mono">
                    Press ⌘J to toggle
                  </span>
                </div>
                <div className="flex items-end gap-2">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        submit();
                      }
                    }}
                    placeholder={
                      mode === "do"
                        ? "Describe what you want to do… (Enter to send, Shift+Enter for newline)"
                        : "Ask about this page… (Enter to send, Shift+Enter for newline)"
                    }
                    rows={2}
                    className="min-h-[56px] resize-none bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-teal-500/60 rounded-xl"
                  />
                  {speech.isSupported && (
                    <Button
                      type="button"
                      variant={speech.isListening ? "destructive" : "outline"}
                      size="icon"
                      className={cn(
                        "h-10 w-10 shrink-0 rounded-xl",
                        !speech.isListening &&
                          "border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800",
                      )}
                      onClick={() => (speech.isListening ? speech.stop() : speech.start())}
                      aria-label={speech.isListening ? "Stop voice input" : "Start voice input"}
                      aria-pressed={speech.isListening}
                      title={
                        speech.isListening ? "Listening… tap to stop" : "Speak instead of typing"
                      }
                    >
                      {speech.isListening ? (
                        <MicOff className="h-4 w-4 animate-pulse" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  <Button
                    size="icon"
                    onClick={() => submit()}
                    disabled={isPending || !input.trim()}
                    aria-label="Send"
                    className="h-10 w-10 shrink-0 bg-teal-600 hover:bg-teal-500 text-white rounded-xl shadow-md disabled:opacity-40"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}

function Bubble({ role, content }: ChatMsg) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-xs bg-teal-600 px-3.5 py-2 text-sm text-white shadow-sm leading-relaxed">
          {content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2.5 max-w-[90%]">
      <img
        src="/stoneman-avatar.png"
        alt="Stoneman"
        className="h-7 w-7 shrink-0 mt-0.5 rounded-full object-cover ring-1 ring-teal-500/50 drop-shadow-xs"
      />
      <div className="min-w-0 whitespace-pre-wrap rounded-2xl rounded-tl-xs bg-slate-900 border border-slate-800 px-3.5 py-2 text-sm text-slate-100 shadow-sm leading-relaxed">
        {content}
      </div>
    </div>
  );
}

/** Phase G.9B.1, Task 5: renders NL Search results as a concise,
 *  one-click-navigation card list — no AI prose. `interpretation` is a
 *  deterministic restatement built in nl-search.functions.ts, never a
 *  second LLM call. Every row's href comes straight from resolve.ts's
 *  real API calls, so clicking just navigates like any other app link. */
function NlResultsBubble({
  interpretation,
  results,
  onNavigate,
}: {
  interpretation: string;
  results: NlResultItem[];
  onNavigate: () => void;
}) {
  return (
    <div className="max-w-full rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-200">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-teal-400">
        {interpretation}
      </p>
      {results.length === 0 ? (
        <div className="flex items-center gap-2 py-1 text-sm text-slate-400">
          <SearchX className="h-3.5 w-3.5 shrink-0" />
          No matching records found.
        </div>
      ) : (
        <div className="space-y-1.5">
          {results.map((r) => (
            <Link
              key={`${r.entityType}:${r.id}`}
              to={r.href as never}
              onClick={onNavigate}
              className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 hover:border-teal-500/50 hover:bg-slate-900 text-slate-100 transition-colors"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-slate-100">{r.title}</span>
                {r.subtitle && (
                  <span className="block truncate text-xs text-slate-400">{r.subtitle}</span>
                )}
              </span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-teal-400" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

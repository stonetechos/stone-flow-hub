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
} from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { askCopilot } from "@/lib/ai/copilot.functions";
import { nlSearch } from "@/lib/ai/nl-search.functions";
import type { NlResultItem } from "@/lib/ai/nl-search/types";
import { toUserMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { useExecutiveInsights } from "@/hooks/useExecutiveInsights";
import { useInsightLifecycle } from "@/lib/insights/state/hooks";
import { InsightCard } from "@/components/dashboard/InsightCard";

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
type Msg = ChatMsg | NlResultsMsg;

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
    suggestions: [
      "How do I navigate STOS?",
      "Where do I find real-time business priorities?",
    ],
  };
}

export function Copilot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [bookmarks, setBookmarks] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  // Insights layout only (Phase G.7 data untouched): expanded by default,
  // independently scrollable, and collapsible so it can never grow large
  // enough to push the chat composer off-screen.
  const [insightsOpen, setInsightsOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
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
        .filter((m): m is ChatMsg => m.kind !== "nl-results")
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

  const isPending = send.isPending || nlSearchMutation.isPending;

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
    nlSearchMutation.mutate(text);
  }

  function bookmarkLast() {
    const last = [...messages]
      .reverse()
      .find((m): m is ChatMsg => m.role === "assistant" && m.kind !== "nl-results");
    if (!last) return;
    setBookmarks((b) => [last, ...b].slice(0, 20));
    toast.success("Bookmarked");
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Open AI Copilot (⌘J)"
          className={cn(
            "fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full",
            "bg-primary text-primary-foreground shadow-3 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          <Sparkles className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <SheetTitle className="text-base">Stone Tech Copilot</SheetTitle>
            <Badge variant="secondary" className="ml-auto text-[10px] uppercase">
              {ctx.entity}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            How-to guidance for the current page. The assistant does not read your database — for
            real customer, project, invoice or vendor data, open the relevant page or the Business
            Priorities card on the dashboard.
          </p>
        </SheetHeader>

        <div className="flex-shrink-0 border-b border-border">
          <button
            type="button"
            onClick={() => setInsightsOpen((v) => !v)}
            aria-expanded={insightsOpen}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Insights
            </h3>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                insightsOpen && "rotate-180",
              )}
            />
          </button>
          {insightsOpen && (
            <div className="max-h-[28dvh] overflow-y-auto px-4 pb-4">
              {topInsights.length === 0 ? (
                <p className="text-sm text-muted-foreground">Everything looks healthy.</p>
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

        <ScrollArea className="min-h-0 flex-1">
          <div ref={scrollRef} className="space-y-3 p-4">
            {messages.length === 0 && (
              <div className="rounded-md border border-dashed border-border bg-muted/30 p-3 text-sm">
                <p className="mb-2 font-medium">Try one of these:</p>
                <div className="flex flex-wrap gap-1.5">
                  {ctx.suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => submit(s)}
                      className="rounded-full border border-border bg-background px-2.5 py-1 text-xs hover:bg-accent"
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
              ) : (
                <Bubble key={i} role={m.role} content={m.content} />
              ),
            )}
            {isPending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
              </div>
            )}

            {bookmarks.length > 0 && (
              <details className="mt-4 rounded-md border border-border bg-muted/30 p-2 text-sm">
                <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Bookmarks ({bookmarks.length})
                </summary>
                <div className="mt-2 space-y-2">
                  {bookmarks.map((b, i) => (
                    <div key={i} className="rounded border border-border bg-background p-2 text-xs">
                      {b.content.slice(0, 240)}
                      {b.content.length > 240 ? "…" : ""}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        </ScrollArea>

        {/* Permanently pinned composer - flex-shrink-0 keeps it the fixed
         * last child of the drawer's flex column, always visible regardless
         * of how long the conversation or Insights section grows. */}
        <div className="flex-shrink-0 border-t border-border p-3">
          <div className="mb-2 flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={bookmarkLast}
              disabled={messages.length === 0}
            >
              <Bookmark className="mr-1 h-3.5 w-3.5" /> Bookmark
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMessages([])}
              disabled={messages.length === 0}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" /> Clear
            </Button>
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
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
              placeholder="Ask about this page… (Enter to send, Shift+Enter for newline)"
              rows={2}
              className="min-h-[56px] resize-none"
            />
            <Button
              size="icon"
              onClick={() => submit()}
              disabled={isPending || !input.trim()}
              aria-label="Send"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Bubble({ role, content }: ChatMsg) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
          {content}
        </div>
      </div>
    );
  }
  return (
    <div className="max-w-full whitespace-pre-wrap rounded-lg bg-muted px-3 py-2 text-sm">
      {content}
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
    <div className="max-w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {interpretation}
      </p>
      {results.length === 0 ? (
        <div className="flex items-center gap-2 py-1 text-sm text-muted-foreground">
          <SearchX className="h-3.5 w-3.5 shrink-0" />
          No matching records found.
        </div>
      ) : (
        <div className="space-y-1">
          {results.map((r) => (
            <Link
              key={`${r.entityType}:${r.id}`}
              to={r.href as never}
              onClick={onNavigate}
              className="flex items-center justify-between gap-2 rounded-md border border-transparent bg-background px-2.5 py-1.5 hover:border-border hover:bg-accent"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{r.title}</span>
                {r.subtitle && (
                  <span className="block truncate text-xs text-muted-foreground">{r.subtitle}</span>
                )}
              </span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

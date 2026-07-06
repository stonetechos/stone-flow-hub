/**
 * Floating AI Copilot — right-side sheet with context-aware chat.
 *
 * Mounted once in AppShell so it is available on every authenticated page.
 * Context is derived from the current router path; the server function adds
 * a compact system prompt tailored to the page.
 */
import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Sparkles, Send, Loader2, X, Bookmark, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { askCopilot } from "@/lib/ai/copilot.functions";
import { toUserMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

const CONTEXT_HINTS: Array<{ match: RegExp; entity: string; suggestions: string[] }> = [
  { match: /^\/customers\/[^/]+/, entity: "customer", suggestions: ["Summarize this customer's history", "Suggest the next follow-up", "Draft a warm-up email"] },
  { match: /^\/customers/, entity: "customers", suggestions: ["Which customers are inactive 30+ days?", "Suggest priority customers this week"] },
  { match: /^\/projects\/[^/]+/, entity: "project", suggestions: ["Summarize project health", "Highlight delays and bottlenecks", "What is my next action here?"] },
  { match: /^\/projects/, entity: "projects", suggestions: ["Which projects are at risk of slipping?", "Top 5 projects by pipeline value"] },
  { match: /^\/rfqs\/[^/]+/, entity: "rfq", suggestions: ["Compare the incoming quotations", "Explain why the top vendor ranks highest", "Draft a negotiation message"] },
  { match: /^\/rfqs/, entity: "rfqs", suggestions: ["Which RFQs are pending vendor response?"] },
  { match: /^\/enquiries\/[^/]+/, entity: "enquiry", suggestions: ["Summarize this enquiry", "Draft a first response", "Recommend products to quote"] },
  { match: /^\/enquiries/, entity: "enquiries", suggestions: ["Which enquiries need urgent follow-up?", "Rank enquiries by likely conversion"] },
  { match: /^\/quotes\/[^/]+/, entity: "quotation", suggestions: ["Review this quotation for margin risk", "Suggest an upsell", "Explain the pricing rationale"] },
  { match: /^\/manufacturing\/[^/]+/, entity: "production_order", suggestions: ["Which stage is delayed?", "Suggest corrective action", "Estimate finish date"] },
  { match: /^\/manufacturing/, entity: "manufacturing", suggestions: ["List today's production priorities", "Which orders are behind schedule?"] },
  { match: /^\/vendors\/[^/]+/, entity: "vendor", suggestions: ["Summarize vendor performance", "Compare against alternates", "Suggest RFQs to send"] },
  { match: /^\/inventory/, entity: "inventory", suggestions: ["Which slabs are aging over 90 days?", "Suggest stock to promote"] },
  { match: /^\/dashboard/, entity: "dashboard", suggestions: ["Summarize today's priorities", "What needs my attention now?"] },
  { match: /^\/dashboards\/management/, entity: "management", suggestions: ["Top-performing products this quarter", "Where is the biggest revenue leak?"] },
];

function deriveContext(path: string) {
  for (const hint of CONTEXT_HINTS) {
    const m = path.match(hint.match);
    if (m) {
      const parts = path.split("/").filter(Boolean);
      const idPart = parts[1] && parts[1].length >= 6 ? parts[1] : undefined;
      return { entity: hint.entity, entityId: idPart, suggestions: hint.suggestions };
    }
  }
  return { entity: "app", entityId: undefined, suggestions: ["What can Stone Tech OS help me do here?", "Summarize this page"] };
}

export function Copilot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [bookmarks, setBookmarks] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const ctx = deriveContext(path);

  const send = useMutation({
    mutationFn: async (prompt: string) => {
      const history = messages.slice(-8);
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

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, send.isPending]);

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
    if (!text || send.isPending) return;
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    send.mutate(text);
  }

  function bookmarkLast() {
    const last = [...messages].reverse().find((m) => m.role === "assistant");
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
            "fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full",
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
            Context-aware assistant. Suggestions and drafts are editable — you stay in control.
          </p>
        </SheetHeader>

        <ScrollArea className="flex-1" viewportRef={scrollRef}>
          <div className="space-y-3 p-4">
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
            {messages.map((m, i) => (
              <Bubble key={i} role={m.role} content={m.content} />
            ))}
            {send.isPending && (
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

        <ScrollArea className="max-h-none">
          <div className="border-t border-border p-3">
            <div className="mb-2 flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={bookmarkLast} disabled={messages.length === 0}>
                <Bookmark className="mr-1 h-3.5 w-3.5" /> Bookmark
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setMessages([])} disabled={messages.length === 0}>
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
                disabled={send.isPending || !input.trim()}
                aria-label="Send"
              >
                {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function Bubble({ role, content }: Msg) {
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

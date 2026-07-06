import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorBlock, LoadingBlock } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { QuickForm } from "@/components/forms/QuickForm";
import { Field } from "@/components/forms/Field";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { getQuote, updateQuote } from "@/lib/quotes/api";
import type { QuoteUpdateInput } from "@/lib/quotes/schema";

export const Route = createFileRoute("/_authenticated/quotes/$quoteId/edit")({
  ssr: false,
  component: EditQuotePage,
});

function EditQuotePage() {
  const { quoteId } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const query = useQuery({ queryKey: qk.quotes.byId(quoteId), queryFn: () => getQuote(quoteId) });
  const [form, setForm] = useState<QuoteUpdateInput>({
    valid_until: null,
    notes: null,
    terms: null,
  });

  useEffect(() => {
    if (query.data) {
      setForm({
        valid_until: query.data.valid_until ?? null,
        notes: query.data.notes ?? null,
        terms: query.data.terms ?? null,
      });
    }
  }, [query.data]);

  const set = <K extends keyof QuoteUpdateInput>(k: K, v: QuoteUpdateInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const mut = useMutation({
    mutationFn: () => updateQuote(quoteId, form),
    onSuccess: () => {
      toast.success("Quote updated");
      invalidateQuote(qc, quoteId);
      nav({ to: "/quotes/$quoteId", params: { quoteId } });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  if (query.isLoading) return <LoadingBlock />;
  if (query.error)
    return <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />;
  if (!query.data) return <ErrorBlock message="Quote not found." />;

  return (
    <div>
      <PageHeader
        title={`Edit ${query.data.quote_no}`}
        subtitle="Update quote metadata."
        actions={
          <Button
            variant="ghost"
            onClick={() => nav({ to: "/quotes/$quoteId", params: { quoteId } })}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        }
      />
      <QuickForm
        onSubmit={(e) => {
          e.preventDefault();
          mut.mutate();
        }}
        busy={mut.isPending}
      >
        <QuickForm.QuickFill>
          <Field label="Valid until">
            <Input
              type="date"
              value={form.valid_until ?? ""}
              onChange={(e) => set("valid_until", e.target.value || null)}
            />
          </Field>
        </QuickForm.QuickFill>
        <QuickForm.MoreDetails>
          <Field label="Notes" className="md:col-span-2">
            <Textarea
              rows={3}
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value || null)}
            />
          </Field>
          <Field label="Terms" className="md:col-span-2">
            <Textarea
              rows={3}
              value={form.terms ?? ""}
              onChange={(e) => set("terms", e.target.value || null)}
            />
          </Field>
        </QuickForm.MoreDetails>
        <QuickForm.Actions>
          <Button
            type="button"
            variant="ghost"
            onClick={() => nav({ to: "/quotes/$quoteId", params: { quoteId } })}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={mut.isPending}>
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
          </Button>
        </QuickForm.Actions>
      </QuickForm>
    </div>
  );
}

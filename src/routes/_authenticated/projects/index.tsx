import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, LoadingBlock } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QuickForm } from "@/components/forms/QuickForm";
import { Field } from "@/components/forms/Field";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { createProject, listProjects } from "@/lib/projects/api";
import { listCustomers } from "@/lib/customers/api";
import { PROJECT_TYPES, projectCreateSchema, type ProjectCreateInput } from "@/lib/projects/schema";
import { LEAD_STAGE_LABEL } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/projects/")({
  ssr: false,
  component: ProjectsPage,
});

function ProjectsPage() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const query = useQuery({ queryKey: qk.projects.list(q), queryFn: () => listProjects(q) });

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle="Every enquiry lives inside a project."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New project
          </Button>
        }
      />

      <div className="mb-3 flex items-center gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, code, city…" className="max-w-md" />
      </div>

      {query.isLoading ? (
        <LoadingBlock />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : (query.data ?? []).length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-6 w-6" />}
          title="No projects yet"
          message="Create a project against a customer to start tracking enquiries."
          action={<Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> New project</Button>}
        />
      ) : (
        <div className="rounded-md border border-border bg-card shadow-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Stage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data!.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.project_code}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.customer?.name ?? "—"}</TableCell>
                  <TableCell><Badge variant="secondary" className="capitalize">{p.project_type}</Badge></TableCell>
                  <TableCell>{p.city ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline">{LEAD_STAGE_LABEL[p.stage]}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateProjectDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function CreateProjectDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const customers = useQuery({ queryKey: qk.customers.list(""), queryFn: () => listCustomers("") });
  const [form, setForm] = useState<ProjectCreateInput>({
    customer_id: "",
    name: "",
    city: "",
    project_type: "residential",
    site_address: null,
    state: null,
    pincode: null,
    expected_value_inr: null,
    expected_start_date: null,
    expected_completion_date: null,
    notes: null,
  });

  const mutation = useMutation({
    mutationFn: createProject,
    onSuccess: (row) => {
      toast.success(`Project ${row.project_code} created`);
      qc.invalidateQueries({ queryKey: qk.projects.all });
      onOpenChange(false);
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = projectCreateSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues.map((i) => i.message).join(" • "));
      return;
    }
    mutation.mutate(parsed.data);
  }

  const set = <K extends keyof ProjectCreateInput>(k: K, v: ProjectCreateInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>New project</DialogTitle></DialogHeader>
        <QuickForm onSubmit={onSubmit} busy={mutation.isPending}>
          <QuickForm.QuickFill>
            <Field label="Customer" required className="md:col-span-2">
              <Select value={form.customer_id} onValueChange={(v) => set("customer_id", v)}>
                <SelectTrigger><SelectValue placeholder={customers.isLoading ? "Loading…" : "Select customer"} /></SelectTrigger>
                <SelectContent>
                  {(customers.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} <span className="ml-2 font-mono text-xs text-muted-foreground">{c.customer_code}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Project name" required>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </Field>
            <Field label="City" required>
              <Input value={form.city} onChange={(e) => set("city", e.target.value)} required />
            </Field>
          </QuickForm.QuickFill>

          <QuickForm.MoreDetails>
            <Field label="Type">
              <Select value={form.project_type} onValueChange={(v) => set("project_type", v as ProjectCreateInput["project_type"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="State"><Input value={form.state ?? ""} onChange={(e) => set("state", e.target.value)} /></Field>
            <Field label="Site address" className="md:col-span-2">
              <Textarea rows={2} value={form.site_address ?? ""} onChange={(e) => set("site_address", e.target.value)} />
            </Field>
            <Field label="Pincode"><Input value={form.pincode ?? ""} onChange={(e) => set("pincode", e.target.value)} /></Field>
          </QuickForm.MoreDetails>

          <QuickForm.Advanced>
            <Field label="Expected value (INR)">
              <Input type="number" value={form.expected_value_inr ?? ""} onChange={(e) => set("expected_value_inr", e.target.value === "" ? null : Number(e.target.value))} />
            </Field>
            <Field label="Expected start"><Input type="date" value={form.expected_start_date ?? ""} onChange={(e) => set("expected_start_date", e.target.value || null)} /></Field>
            <Field label="Expected completion"><Input type="date" value={form.expected_completion_date ?? ""} onChange={(e) => set("expected_completion_date", e.target.value || null)} /></Field>
            <Field label="Notes" className="md:col-span-2">
              <Textarea rows={2} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
            </Field>
          </QuickForm.Advanced>

          <QuickForm.Actions>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create
            </Button>
          </QuickForm.Actions>
        </QuickForm>
      </DialogContent>
    </Dialog>
  );
}
